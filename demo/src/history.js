// ==================== 历史面板渲染 ====================
function openHistoryPanel() {
  renderHistoryPanel();
  document.getElementById('historyPanel').classList.add('active');
}

function renderHistoryPanel() {
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
    const date = new Date(h.ts);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const m = Math.floor((h.totalTimeSeconds || 0) / 60);
    const s = (h.totalTimeSeconds || 0) % 60;
    const timeStr = m > 0 ? `${m}分${s}秒` : `${s}秒`;
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

function copyHistoryMarkdown(id) {
  const history = loadHistory();
  const h = history.find(x => x.id === id);
  if (!h) return;

  const lines = [];
  const now = new Date(h.ts);
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  lines.push(`# ${h.task || '破冰协议产出'}`);
  lines.push('');
  lines.push(`> 完成时间：${dateStr}`);
  lines.push('');

  (h.steps || []).forEach((s, i) => {
    const output = (h.stepOutputs?.[i] || '').trim();
    lines.push(`## ${i + 1}. ${s.title || '步骤 ' + (i + 1)}`);
    lines.push('');
    if (s.instruction) {
      lines.push(`> ${s.instruction}`);
      lines.push('');
    }
    if (output) {
      lines.push(output);
    } else {
      lines.push('*（未产出）*');
    }
    lines.push('');
  });

  if (h.doneAiMsg) {
    lines.push('---');
    lines.push('');
    lines.push('## AI 改进建议');
    lines.push('');
    lines.push(h.doneAiMsg);
    lines.push('');
  }

  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    showToast('已复制到剪贴板', 'success', 3000);
  });
}

async function clearHistory() {
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

document.addEventListener('click', (event) => {
  const modal = event.target.closest('.protocol-modal');
  if (modal && event.target === modal) modal.classList.remove('active');
});
