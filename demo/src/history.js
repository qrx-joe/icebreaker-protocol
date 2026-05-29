import { LS_KEY_HISTORY, loadHistory } from './state.js'
import { formatDateTime, formatDuration, escapeHtml, buildMarkdownContent } from './utils.js'
import { showModal, showToast } from './notify.js'

// ==================== 历史面板渲染 ====================
export function openHistoryPanel() {
  renderHistoryPanel();
  document.getElementById('historyPanel').classList.add('active');
}

export function renderHistoryPanel() {
  const listEl = document.getElementById('historyList');
  const emptyEl = document.getElementById('historyEmpty');
  const actionsEl = document.querySelector('.history-actions');
  const history = loadHistory();

  if (!history.length) {
    listEl.innerHTML = '';
    emptyEl.style.display = '';
    if (actionsEl) actionsEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  if (actionsEl) actionsEl.style.display = '';
  let html = '';
  history.forEach((h) => {
    const dateStr = formatDateTime(h.ts);
    const timeStr = formatDuration(h.totalTimeSeconds || 0);
    html += `<div class="history-item" style="border-bottom:1px solid rgba(255,255,255,0.06);padding:12px 0;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(h.task || '未命名任务')}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${dateStr} · ${h.totalSteps || 0}步 · ${timeStr} · ${h.completedSteps || 0}项产出</div>
        </div>
        <button type="button" class="btn-export" onclick="copyHistoryMarkdown('${escapeHtml(h.id)}')" style="white-space:nowrap;">复制 Markdown</button>
      </div>
    </div>`;
  });
  listEl.innerHTML = html;
}

export function copyHistoryMarkdown(id) {
  const history = loadHistory();
  const h = history.find(x => x.id === id);
  if (!h) return;

  const md = buildMarkdownContent({
    task: h.task,
    steps: h.steps,
    stepOutputs: h.stepOutputs,
    doneAiMsg: h.doneAiMsg || ''
  });

  navigator.clipboard.writeText(md).then(() => {
    showToast('已复制到剪贴板', 'success', 3000);
  });
}

export async function clearHistory() {
  const ok = await showModal({
    title: '清空历史',
    body: '确定要清空所有本地历史记录吗？此操作不可恢复。',
    confirmText: '清空',
    cancelText: '取消'
  });
  if (!ok) return;
  localStorage.removeItem(LS_KEY_HISTORY);
  renderHistoryPanel();
  showToast('历史记录已清空', 'info', 3000);
}

export function initHistory() {
  document.addEventListener('click', (event) => {
    const modal = event.target.closest('.protocol-modal');
    if (modal && event.target === modal) modal.classList.remove('active');
  });
}

// Legacy bridge
window.openHistoryPanel = openHistoryPanel;
window.renderHistoryPanel = renderHistoryPanel;
window.copyHistoryMarkdown = copyHistoryMarkdown;
window.clearHistory = clearHistory;
