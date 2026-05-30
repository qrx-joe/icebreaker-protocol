// ==================== 产出质量评价 ====================
import { state } from './state.js'
import { showPage } from './ui.js'

const REVIEW_DIMENSIONS = [
  {
    key: 'functionality',
    name: '功能完整性',
    desc: '核心流程是否走通、边界情况是否处理',
  },
  {
    key: 'quality',
    name: '代码/产出质量',
    desc: '结构是否清晰、是否有明显坏味道',
  },
  {
    key: 'presentability',
    name: '可展示性',
    desc: '是否愿意主动分享给别人看',
  },
  {
    key: 'documentation',
    name: '文档/注释',
    desc: '别人能否独立理解和运行',
  },
  {
    key: 'audience_fit',
    name: '受众匹配度',
    desc: '是否精确命中目标受众预期',
  },
]

const SCORE_LABELS = {
  1: '灾难',
  2: '较差',
  3: '勉强',
  4: '良好',
  5: '骄傲',
}

const LS_KEY_REVIEW = 'ib_review_history'

// ==================== 核心逻辑 ====================

function calculateVerdict(total) {
  if (total >= 22) {
    return {
      title: '可投递/发布',
      desc: '这个产出达到了对外展示的标准。你可以自信地发布、提交或分享。',
      class: 'verdict-pass',
    }
  }
  if (total >= 16) {
    return {
      title: '能用但有限制',
      desc: '核心可用，但投递前需要明确说明限制条件。',
      class: 'verdict-warn',
    }
  }
  if (total >= 11) {
    return {
      title: '需继续修改',
      desc: '当前状态只能给自己看。至少还有 2-3 个明显问题需要解决。',
      class: 'verdict-warn',
    }
  }
  return {
    title: '回炉重造',
    desc: '产出质量严重不足。建议重新审视核心思路，而非在细节上修补。',
    class: 'verdict-fail',
  }
}

function buildMarkdownReport(reviewData) {
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const lines = [
    `# 产出质量评价报告：${reviewData.task}`,
    '',
    `- **评价时间**：${dateStr}`,
    `- **总分**：${reviewData.total} / 25`,
    `- **评级**：${reviewData.verdict.title}`,
    '',
    '## 维度评分',
    '',
  ]

  REVIEW_DIMENSIONS.forEach((dim, i) => {
    const score = reviewData.scores[i]
    const label = SCORE_LABELS[score]
    lines.push(`### ${i + 1}. ${dim.name} — ${score}/5 (${label})`)
    lines.push(`> ${dim.desc}`)
    if (reviewData.comments[i]) {
      lines.push('')
      lines.push(reviewData.comments[i])
    }
    lines.push('')
  })

  lines.push('## 总评')
  lines.push('')
  lines.push(`**${reviewData.verdict.title}**`)
  lines.push('')
  lines.push(reviewData.verdict.desc)
  lines.push('')
  lines.push('## 改进建议')
  lines.push('')
  lines.push(reviewData.overall || '（未填写）')
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('*本报告由破冰协议 · 产出质量评价器生成*')

  return lines.join('\n')
}

function saveReviewHistory(entry) {
  try {
    const raw = localStorage.getItem(LS_KEY_REVIEW)
    let data = raw ? JSON.parse(raw) : { v: 1, list: [] }
    if (Array.isArray(data)) {
      data = { v: 1, list: data }
    }
    if (!data.list || !Array.isArray(data.list)) data.list = []
    data.list.unshift(entry)
    if (data.list.length > 50) data.list = data.list.slice(0, 50)
    localStorage.setItem(LS_KEY_REVIEW, JSON.stringify(data))
  } catch (e) {
    // 静默失败
  }
}

// ==================== 渲染 ====================

export function showReview() {
  state.currentPhase = 'review'
  renderReviewForm()
  updateReviewResult()
  showPage('pageReview')

  // 绑定按钮
  document.getElementById('btnSubmitReview').onclick = submitReview
  document.getElementById('btnSkipReview').onclick = skipReview
}

function renderReviewForm() {
  const container = document.getElementById('reviewForm')
  if (!container) return

  container.innerHTML = REVIEW_DIMENSIONS.map((dim, idx) => {
    return `
      <div class="review-dimension" data-idx="${idx}">
        <div class="review-dim-header">
          <span class="review-dim-name">${dim.name}</span>
          <span class="review-dim-score" id="dimScore${idx}">3</span>
        </div>
        <div class="review-dim-desc">${dim.desc}</div>
        <div class="review-slider-wrap">
          <span class="review-slider-label">1</span>
          <input type="range" class="review-slider" id="dimSlider${idx}"
            min="1" max="5" value="3" step="1"
            oninput="window.updateDimScore(${idx}, this.value)"
          >
          <span class="review-slider-label">5</span>
        </div>
        <div class="review-dim-labels">
          <span>灾难</span>
          <span>较差</span>
          <span>勉强</span>
          <span>良好</span>
          <span>骄傲</span>
        </div>
        <textarea class="review-comment" id="dimComment${idx}"
          placeholder="这个维度的具体评语（可选）..." rows="2"
        ></textarea>
      </div>
    `
  }).join('')

  // 添加整体建议输入
  container.innerHTML += `
    <div class="review-overall">
      <label class="review-overall-label">改进建议（一句话）</label>
      <textarea class="review-comment" id="reviewOverall"
        placeholder="如果只能改一件事，你会改什么？" rows="2"
      ></textarea>
    </div>
  `
}

window.updateDimScore = function (idx, value) {
  const scoreEl = document.getElementById(`dimScore${idx}`)
  if (scoreEl) {
    scoreEl.textContent = value
    scoreEl.className = `review-dim-score score-${value}`
  }
  updateReviewResult()
}

function updateReviewResult() {
  const scores = REVIEW_DIMENSIONS.map((_, i) => {
    const slider = document.getElementById(`dimSlider${i}`)
    return slider ? parseInt(slider.value, 10) : 3
  })

  const total = scores.reduce((a, b) => a + b, 0)
  const verdict = calculateVerdict(total)

  const resultEl = document.getElementById('reviewResult')
  if (!resultEl) return

  resultEl.innerHTML = `
    <div class="review-score-board">
      <div class="review-total-score">${total}<span class="review-total-max">/25</span></div>
      <div class="review-verdict ${verdict.class}">
        <div class="review-verdict-title">${verdict.title}</div>
        <div class="review-verdict-desc">${verdict.desc}</div>
      </div>
    </div>
  `
}

// ==================== 提交与跳过 ====================

function submitReview() {
  const scores = REVIEW_DIMENSIONS.map((_, i) => {
    const slider = document.getElementById(`dimSlider${i}`)
    return slider ? parseInt(slider.value, 10) : 3
  })

  const comments = REVIEW_DIMENSIONS.map((_, i) => {
    const ta = document.getElementById(`dimComment${i}`)
    return ta ? ta.value.trim() : ''
  })

  const overallEl = document.getElementById('reviewOverall')
  const overall = overallEl ? overallEl.value.trim() : ''

  const total = scores.reduce((a, b) => a + b, 0)
  const verdict = calculateVerdict(total)

  const reviewData = {
    task: state.currentTask || '未命名任务',
    ts: Date.now(),
    total,
    max: 25,
    verdict,
    scores,
    comments,
    overall,
    sessionInfo: {
      stepCount: state.steps.length,
      completedSteps: state.sessionLog.length,
      totalTimeSeconds: state.sessionLog.reduce((s, r) => s + r.time_spent_seconds, 0),
    },
  }

  // 生成并下载 Markdown
  const markdown = buildMarkdownReport(reviewData)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(reviewData.task).replace(/[/\\:*?"<>|]/g, '_')}_评价.md`
  a.click()
  URL.revokeObjectURL(url)

  // 保存到 localStorage
  saveReviewHistory(reviewData)

  // 返回首页
  if (window.resetAll) {
    window.resetAll()
  } else {
    showPage('pageLanding')
  }
}

function skipReview() {
  if (window.resetAll) {
    window.resetAll()
  } else {
    showPage('pageLanding')
  }
}

// Legacy bridge
window.showReview = showReview
window.submitReview = submitReview
window.skipReview = skipReview
