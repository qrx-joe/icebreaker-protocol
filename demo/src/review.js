// ==================== AI Output Review ====================
import { state } from './state.js'
import { showPage } from './ui.js'
import { showToast } from './notify.js'

const LS_KEY_REVIEW = 'ib_review_history'

const REVIEW_DIMENSIONS = [
  { key: 'completion', name: '完成度', desc: '是否交付了每一步要求的可见产出' },
  { key: 'clarity', name: '清晰度', desc: '别人能否快速理解产出在说什么、要做什么' },
  { key: 'usefulness', name: '可用性', desc: '当前版本是否已经能被继续使用、修改或展示' },
  { key: 'audience_fit', name: '受众匹配', desc: '是否命中目标受众或使用场景' },
  { key: 'next_action', name: '下一步明确度', desc: '是否清楚下一刀应该改哪里' },
]

function fallbackReview() {
  const filled = state.stepOutputs.filter(v => (v || '').trim().length >= 5).length
  const totalSteps = Math.max(state.steps.length, 1)
  const base = Math.max(2, Math.min(4, Math.round((filled / totalSteps) * 5)))
  const dimensions = REVIEW_DIMENSIONS.map(dim => ({
    ...dim,
    score: base,
    comment: filled === totalSteps
      ? '已有可见产出，但还需要更具体的验收标准和表达打磨。'
      : '部分步骤缺少足够清晰的产出，先补齐空白再谈优化。',
  }))
  return {
    total: dimensions.reduce((sum, item) => sum + item.score, 0),
    max: dimensions.length * 5,
    verdict: filled === totalSteps ? '能继续打磨' : '需要补齐产出',
    summary: 'AI评价暂时不可用，已根据完成步骤做本地兜底判断。',
    strengths: ['已经完成了破冰流程，至少留下了可修改的版本。'],
    issues: ['需要补充更明确的边界、验收标准和面向受众的表达。'],
    priority_fix: '先补齐最薄弱的一步：让它有一个别人能看懂的具体产出。',
    dimensions,
  }
}

function normalizeReview(data) {
  const fallback = fallbackReview()
  const dimensions = REVIEW_DIMENSIONS.map((dim, idx) => {
    const incoming = (data.dimensions || []).find(item => item.key === dim.key) || (data.dimensions || [])[idx] || {}
    const score = Number(incoming.score)
    return {
      ...dim,
      score: Number.isFinite(score) ? Math.max(1, Math.min(5, Math.round(score))) : fallback.dimensions[idx].score,
      comment: String(incoming.comment || fallback.dimensions[idx].comment || '').trim(),
    }
  })

  return {
    total: dimensions.reduce((sum, item) => sum + item.score, 0),
    max: dimensions.length * 5,
    verdict: String(data.verdict || fallback.verdict).trim(),
    summary: String(data.summary || fallback.summary).trim(),
    strengths: Array.isArray(data.strengths) && data.strengths.length ? data.strengths.slice(0, 3) : fallback.strengths,
    issues: Array.isArray(data.issues) && data.issues.length ? data.issues.slice(0, 4) : fallback.issues,
    priority_fix: String(data.priority_fix || fallback.priority_fix).trim(),
    dimensions,
  }
}

function collectReviewPayload() {
  return {
    task: state.currentTask || '未命名任务',
    steps: state.steps.map((step, index) => ({
      index,
      title: step.title || `步骤 ${index + 1}`,
      instruction: step.instruction || '',
      expected_output: step.output || '',
      user_output: state.stepOutputs[index] || '',
    })),
    session_log: state.sessionLog,
    output_mode: state.outputMode,
    protocol_strength: state.protocolStrength,
  }
}

async function requestAIReview() {
  const response = await fetch('/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(collectReviewPayload()),
  })
  if (!response.ok) throw new Error('review request failed')
  return response.json()
}

function saveReviewHistory(entry) {
  try {
    const raw = localStorage.getItem(LS_KEY_REVIEW)
    const data = raw ? JSON.parse(raw) : { v: 1, list: [] }
    const list = Array.isArray(data) ? data : (data.list || [])
    list.unshift(entry)
    localStorage.setItem(LS_KEY_REVIEW, JSON.stringify({ v: 1, list: list.slice(0, 50) }))
  } catch (e) {
    // local history is nice to have, not critical
  }
}

function scoreClass(score) {
  if (score <= 2) return 'score-low'
  if (score === 3) return 'score-mid'
  return 'score-high'
}

function renderLoading() {
  document.getElementById('reviewForm').innerHTML = `
    <div class="ai-review-loading">
      <div class="spinner-ring"></div>
      <div>
        <strong>AI 正在评价产出</strong>
        <span>它会看完整任务、每一步要求和你的实际产出。</span>
      </div>
    </div>
  `
  document.getElementById('reviewResult').innerHTML = ''
}

function renderAIReview(review) {
  document.getElementById('reviewResult').innerHTML = `
    <div class="ai-review-summary">
      <div class="review-total-score">${review.total}<span class="review-total-max">/${review.max}</span></div>
      <div>
        <div class="review-verdict-title">${review.verdict}</div>
        <div class="review-verdict-desc">${review.summary}</div>
      </div>
    </div>
  `

  document.getElementById('reviewForm').innerHTML = `
    <section class="ai-review-section priority">
      <h3>最优先修改</h3>
      <p>${escapeHtml(review.priority_fix)}</p>
    </section>
    <section class="ai-review-section">
      <h3>主要问题</h3>
      <ul>${review.issues.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </section>
    <section class="ai-review-section">
      <h3>保留优点</h3>
      <ul>${review.strengths.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </section>
    <div class="ai-review-dimensions">
      ${review.dimensions.map(dim => `
        <article class="ai-review-dimension">
          <div>
            <strong>${escapeHtml(dim.name)}</strong>
            <span>${escapeHtml(dim.desc)}</span>
          </div>
          <b class="${scoreClass(dim.score)}">${dim.score}/5</b>
          <p>${escapeHtml(dim.comment)}</p>
        </article>
      `).join('')}
    </div>
  `
}

function buildMarkdownReport(review) {
  const lines = [
    `# AI 产出质量评价：${state.currentTask || '未命名任务'}`,
    '',
    `- 总分：${review.total}/${review.max}`,
    `- 结论：${review.verdict}`,
    '',
    '## 总评',
    review.summary,
    '',
    '## 最优先修改',
    review.priority_fix,
    '',
    '## 主要问题',
    ...review.issues.map(item => `- ${item}`),
    '',
    '## 保留优点',
    ...review.strengths.map(item => `- ${item}`),
    '',
    '## 维度评分',
    ...review.dimensions.flatMap(dim => [`- ${dim.name}: ${dim.score}/5`, `  ${dim.comment}`]),
  ]
  return lines.join('\n')
}

function exportReviewMarkdown() {
  if (!state.latestReview) return
  const markdown = buildMarkdownReport(state.latestReview)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(state.currentTask || 'review').replace(/[/\\:*?"<>|]/g, '_')}_AI评价.md`
  a.click()
  URL.revokeObjectURL(url)
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function showReview() {
  state.currentPhase = 'review'
  showPage('pageReview')
  document.querySelector('.review-title').textContent = 'AI 产出质量评价'
  document.querySelector('.review-sub').textContent = '你负责产出，AI负责挑问题和指出下一刀。'
  document.getElementById('btnSubmitReview').textContent = '导出报告'
  document.getElementById('btnSubmitReview').onclick = exportReviewMarkdown
  document.getElementById('btnSkipReview').textContent = '返回结案页'
  document.getElementById('btnSkipReview').onclick = () => showPage('pageDone')

  renderLoading()

  try {
    const data = await requestAIReview()
    if (data.mode === 'local') {
      showToast('当前为本地演示模式：未配置 AI API Key，评价由预设规则生成。', 'warning', 6000)
    }
    state.latestReview = normalizeReview(data)
  } catch (e) {
    state.latestReview = fallbackReview()
  }

  renderAIReview(state.latestReview)
  saveReviewHistory({
    task: state.currentTask || '未命名任务',
    ts: Date.now(),
    ...state.latestReview,
  })
}

window.showReview = showReview
window.exportReviewMarkdown = exportReviewMarkdown
