import { beginNewSession, state, saveSnapshot, clearSnapshot, appendHistory } from './state.js'
import { applyLandingCopy, showPage } from './ui.js'
import { buildMarkdownContent, formatDuration } from './utils.js'
import { apiAttachments, renderAttachments } from './attachments.js'
import { showRoadmap } from './roadmap.js'
import { goToStep } from './steps.js'
import { stopInactivityMonitor } from './inactivity.js'
import { showReview } from './review.js'
import { renderBattleReport } from './ui.js'

// ==================== Done ====================
export function showDone() {
  state.currentPhase = 'done';
  // 更新进度条到 100%
  document.getElementById('stepProgressFill').style.width = '100%';

  // 渲染破冰战报
  document.querySelector('.done-title').textContent = '雏形已生成';
  document.getElementById('doneAiMsg').textContent =
    `你完成了 ${state.sessionLog.length || state.steps.length || 0} 个可见块。结案归档,或先评价,或只改一处。`;
  renderBattleReport();

  // 改进按钮:第 3 轮起需要二次确认才能解锁
  applyImprovementGuard();

  // 保存到历史记录(默认 in_progress,结案时再翻新为 archived)
  const totalTime = state.sessionLog.reduce((s, r) => s + r.time_spent_seconds, 0);
  const entryId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  state.currentHistoryId = entryId;
  appendHistory({
    id: entryId,
    ts: Date.now(),
    task: state.currentTask,
    status: 'in_progress',
    totalSteps: state.steps.length,
    completedSteps: state.sessionLog.length,
    totalTimeSeconds: totalTime,
    sessionLog: state.sessionLog.map(r => ({ step_title: r.step_title, step_index: r.step_index, summary: r.summary, time_spent_seconds: r.time_spent_seconds })),
    steps: state.steps.map(s => ({ title: s.title, instruction: s.instruction, output: s.output, minutes: s.minutes })),
    stepOutputs: state.stepOutputs.slice(),
    doneAiMsg: document.getElementById('doneAiMsg')?.textContent || ''
  });

  clearSnapshot();
  showPage('pageDone');
}

// ==================== 结案归档 ====================
// 把当前任务标记为已发布,自动下载备份,然后回到 landing。
// 一旦结案,这个任务在 history 里就是"完成"状态,想改进请发起新任务。
export function archiveAndReset() {
  const btn = document.getElementById('btnArchive');
  if (!btn || btn.disabled) return;

  // 第一次点击:进入二次确认态(防误操作)
  if (btn.dataset.confirm !== 'yes') {
    btn.dataset.confirm = 'yes';
    btn.textContent = '确认结案?(再按一次)';
    btn.classList.add('btn-warn');
    // 5 秒内不确认就回到初始态
    setTimeout(() => {
      if (btn.dataset.confirm === 'yes') {
        btn.dataset.confirm = '';
        btn.textContent = '结案归档';
        btn.classList.remove('btn-warn');
      }
    }, 5000);
    return;
  }

  // 第二次点击:真的结案
  markHistoryArchived(state.currentHistoryId);
  downloadMarkdown();
  resetAll();
}

// 把改进按钮在第 3 轮起置灰,显示提示
function applyImprovementGuard() {
  const btn = document.getElementById('btnImprove');
  const hint = document.getElementById('doneImproveHint');
  if (!btn || !hint) return;

  if (state.improvementRound >= 3) {
    btn.disabled = true;
    btn.classList.add('btn-locked');
    btn.textContent = '已达 3 轮(点击下方解锁)';
    hint.innerHTML = `
      <span class="hint-text">[Protocol]: 你已经改了 ${state.improvementRound} 轮。完美主义正在让你把"继续改"伪装成"在进步"。
      建议现在结案——可以改的版本永远比理论上更好的版本更值钱。</span>
      <button class="btn-unlock" id="btnUnlockImprove" type="button">我知道,我还是要再改一轮</button>
    `;
    hint.style.display = 'block';

    // 解锁按钮的一次性绑定
    document.getElementById('btnUnlockImprove')?.addEventListener('click', () => {
      btn.disabled = false;
      btn.classList.remove('btn-locked');
      btn.textContent = '只改一处';
      hint.style.display = 'none';
    }, { once: true });
  } else if (state.improvementRound >= 2) {
    btn.disabled = false;
    btn.classList.remove('btn-locked');
    btn.textContent = '只改一处';
    hint.innerHTML = `<span class="hint-text">[Protocol]: 这是第 ${state.improvementRound} 轮改进。再改一轮就触发结案保护。</span>`;
    hint.style.display = 'block';
  } else {
    btn.disabled = false;
    btn.classList.remove('btn-locked');
    btn.textContent = '只改一处';
    hint.style.display = 'none';
    hint.textContent = '';
  }
}

// 把 history 中指定 id 的条目标记为 archived
function markHistoryArchived(id) {
  if (!id) return;
  try {
    const KEY = 'ib_session_history';
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const list = Array.isArray(data) ? data : (data.list || []);
    const entry = list.find(h => h.id === id);
    if (entry) {
      entry.status = 'archived';
      entry.archivedAt = Date.now();
      entry.improvementRounds = state.improvementRound;
      localStorage.setItem(KEY, JSON.stringify(Array.isArray(data) ? list : { ...data, list }));
    }
  } catch (e) { /* 静默失败 */ }
}

// ==================== 评价入口 ====================
export function goToReview() {
  showReview();
}

// ==================== 改进循环 ====================
export async function startImprovement() {
  state.improvementRound++;
  const btn = document.getElementById('btnImprove');
  btn.disabled = true;
  btn.textContent = '分析中...';

  // 构建所有步骤产出摘要
  const outputsSummary = state.steps.map((s, i) => {
    const output = state.stepOutputs[i] || '(无产出)';
    return `步骤${i + 1}「${s.title}」: ${output}`;
  }).join('\n');

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `基于以下所有步骤产出，找出最薄弱的一个点，给出一句具体的改进指令（不超过30字）。只返回JSON：{"step_index":0,"instruction":"具体改进指令"}\n\n${outputsSummary}`,
        phase: 'step',
        task: state.currentTask,
        steps: state.steps,
        current_step: 0,
        outputs: state.stepOutputs,
        attachments: apiAttachments()
      })
    });

    if (!response.ok) throw new Error('请求失败');
    const data = await response.json();
    const reply = data.reply || '';

    // 尝试解析 JSON
    let targetIdx = 0;
    let instruction = '完善这一部分的内容';
    try {
      const match = reply.match(/\{.*\}/s);
      if (match) {
        const parsed = JSON.parse(match[0]);
        targetIdx = Math.min(parsed.step_index || 0, state.steps.length - 1);
        instruction = parsed.instruction || instruction;
      }
    } catch (e) { /* fallback */ }

    state.improvementTargetIdx = targetIdx;
    showImprovementRoadmap(targetIdx, instruction);
  } catch (err) {
    document.getElementById('doneAiMsg').textContent = '分析失败，请重试。';
    btn.disabled = false;
    btn.textContent = '只改一处';
    state.improvementRound--;
  }
}

export function showImprovementRoadmap(targetIdx, instruction) {
  // 设置标题
  document.getElementById('roadmapTitle').textContent = `第 ${state.improvementRound} 轮改进`;

  // 清空常规 AI 消息，显示改进指令
  document.getElementById('roadmapAiMsg').textContent = '';
  document.getElementById('roadmapImproveMsg').textContent =
    `[Protocol]: 下一步改进 → ${instruction}`;

  // 轮次警告
  const warningEl = document.getElementById('roadmapRoundWarning');
  if (state.improvementRound >= 4) {
    warningEl.className = 'roadmap-round-warning danger';
    warningEl.textContent = `[Protocol 警告]: 你已经进行了 ${state.improvementRound} 轮改进。继续修改的边际收益趋近于零。发布一个 80 分的产出，比打磨一个永远发不出去的 100 分更有价值。`;
  } else if (state.improvementRound >= 3) {
    warningEl.className = 'roadmap-round-warning';
    warningEl.textContent = `[Protocol]: 这是第 ${state.improvementRound} 轮改进。协议建议你完成这一轮后发布或提交。你的完美主义正在这里等着你——先把它发出去。`;
  } else {
    warningEl.textContent = '';
  }

  // 显示路线图，高亮目标步骤
  showRoadmap(state.currentTask, state.steps, targetIdx);

  // 切换按钮：隐藏常规操作，显示改进操作
  document.getElementById('roadmapActions').style.display = 'none';
  document.getElementById('roadmapImproveActions').style.display = 'flex';

  // 恢复按钮状态
  const btn = document.getElementById('btnImprove');
  btn.disabled = false;
  btn.textContent = '只改一处';
}

export function confirmImprovement() {
  // 恢复 Roadmap 为常规模式
  resetRoadmapMode();
  goToStep(state.improvementTargetIdx);
}

export function skipImprovement() {
  state.improvementRound--;
  resetRoadmapMode();
  showDone();
}

export function resetRoadmapMode() {
  document.getElementById('roadmapTitle').textContent = '拆解路线图';
  document.getElementById('roadmapImproveMsg').textContent = '';
  document.getElementById('roadmapRoundWarning').textContent = '';
  document.getElementById('roadmapActions').style.display = 'flex';
  document.getElementById('roadmapImproveActions').style.display = 'none';
}

// ==================== 导出 Markdown ====================
export function buildMarkdown() {
  return buildMarkdownContent({
    task: state.currentTask,
    steps: state.steps,
    stepOutputs: state.stepOutputs,
    doneAiMsg: document.getElementById('doneAiMsg')?.textContent?.trim() || '',
    attachments: state.attachments
  });
}

export function copyMarkdown() {
  const md = buildMarkdown();
  navigator.clipboard.writeText(md).then(() => {
    const btn = document.querySelector('.done-export .btn-export:first-child');
    btn.textContent = '已复制';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '复制 Markdown';
      btn.classList.remove('copied');
    }, 2000);
  });
}

export function downloadMarkdown() {
  const md = buildMarkdown();
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(state.currentTask || '破冰协议产出').replace(/[/\\:*?"<>|]/g, '_')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== 重置 ====================
export function resetAll() {
  beginNewSession();
  state.currentPhase = 'landing';
  renderAttachments();
  stopInactivityMonitor();
  clearSnapshot();

  document.getElementById('landingInput').value = '';
  document.getElementById('landingInput').style.borderColor = 'rgba(56,189,248,0.25)';
  document.getElementById('landingInput').setAttribute('placeholder', '比如：我想写一篇博客但不知道怎么开头...');

  showPage('pageLanding');
  applyLandingCopy();
  setTimeout(() => document.getElementById('landingInput').focus(), 300);
}

// Legacy bridge
window.showDone = showDone;
window.archiveAndReset = archiveAndReset;
window.goToReview = goToReview;
window.startImprovement = startImprovement;
window.showImprovementRoadmap = showImprovementRoadmap;
window.confirmImprovement = confirmImprovement;
window.skipImprovement = skipImprovement;
window.resetRoadmapMode = resetRoadmapMode;
window.buildMarkdown = buildMarkdown;
window.copyMarkdown = copyMarkdown;
window.downloadMarkdown = downloadMarkdown;
window.resetAll = resetAll;
