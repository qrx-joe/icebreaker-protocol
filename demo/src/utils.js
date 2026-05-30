import { formatAttachmentSize } from './attachments.js'

// ==================== 共享工具函数 ====================

export function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

export function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDateTime(d) {
  const date = d instanceof Date ? d : new Date(d);
  return `${formatDate(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDuration(seconds) {
  const m = Math.floor((seconds || 0) / 60);
  const s = (seconds || 0) % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

export function buildMarkdownContent({ task, steps, stepOutputs, doneAiMsg, attachments }) {
  const lines = [];
  lines.push(`# ${task || '破冰协议产出'}`);
  lines.push('');
  lines.push(`> 完成时间：${formatDate(new Date())}`);
  lines.push('');

  (steps || []).forEach((s, i) => {
    const output = (stepOutputs?.[i] || '').trim();
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

  if (doneAiMsg) {
    lines.push('---');
    lines.push('');
    lines.push('## AI 改进建议');
    lines.push('');
    lines.push(doneAiMsg);
    lines.push('');
  }

  if (attachments?.length) {
    lines.push('---');
    lines.push('');
    lines.push('## 附件');
    lines.push('');
    attachments.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.name} (${formatAttachmentSize(item.size)})`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

// Legacy bridge
window.escapeHtml = escapeHtml;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatDuration = formatDuration;
window.buildMarkdownContent = buildMarkdownContent;
