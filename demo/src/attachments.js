import { state, saveSnapshot } from './state.js'
// ==================== 附件处理 ====================
export function isReadableAttachment(file) {
  const name = file.name.toLowerCase();
  return file.type.startsWith('text/')
    || ['.txt', '.md', '.csv', '.json', '.yaml', '.yml', '.log', '.html', '.htm'].some(ext => name.endsWith(ext));
}

export function isBackendParsableAttachment(file) {
  const name = file.name.toLowerCase();
  return ['.pdf', '.docx', '.xlsx', '.pptx'].some(ext => name.endsWith(ext));
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.includes(',') ? value.split(',').pop() : value);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function parseAttachmentOnServer(file) {
  const dataBase64 = await fileToBase64(file);
  const response = await fetch('/api/state.attachments/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: file.name,
      type: file.type || 'unknown',
      data_base64: dataBase64
    })
  });
  if (!response.ok) throw new Error('parse_failed');
  return response.json();
}

export function formatAttachmentSize(bytes) {
  if (!bytes) return '0B';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function renderAttachments() {
  const list = document.getElementById('attachmentList');
  if (!list) return;
  list.replaceChildren();
  state.attachments.forEach((item, index) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.title = item.text ? `${item.name}\n${item.text.slice(0, 500)}` : `${item.name}\n${item.error || '未解析内容，仅记录文件名'}`;
    const label = document.createElement('span');
    label.textContent = `📎 ${item.name} · ${item.text ? '已解析' : '未解析'} · ${formatAttachmentSize(item.size)}`;
    const remove = document.createElement('button');
    remove.className = 'attachment-remove';
    remove.type = 'button';
    remove.textContent = '×';
    remove.onclick = () => {
      state.attachments.splice(index, 1);
      renderAttachments();
    };
    chip.append(label, remove);
    list.appendChild(chip);
  });
  saveSnapshot();
}

export function attachmentContextText() {
  if (!state.attachments.length) return '';
  return state.attachments.map((item, index) => {
    const text = item.text ? `\n${item.text.slice(0, 1500)}` : '\n（未解析正文，仅可参考文件名）';
    return `附件 ${index + 1}: ${item.name} (${item.type || 'unknown'}, ${formatAttachmentSize(item.size)})${text}`;
  }).join('\n\n');
}

export function apiAttachments() {
  return state.attachments.map(item => ({
    name: item.name,
    type: item.type,
    size: item.size,
    text: item.text ? item.text.slice(0, 5000) : ''
  }));
}

export async function handleAttachmentUpload(fileList) {
  const files = Array.from(fileList || []);
  const warning = document.getElementById('stepWarning');
  if (warning && files.length) {
    warning.style.color = '#38bdf8';
    warning.textContent = `[Protocol]: 正在解析 ${files.length} 个附件...`;
  }

  for (const file of files) {
    const base = {
      name: file.name,
      type: file.type || 'unknown',
      size: file.size,
      text: '',
      error: ''
    };

    if (isBackendParsableAttachment(file)) {
      try {
        const parsed = await parseAttachmentOnServer(file);
        state.attachments.push({
          ...base,
          size: parsed.size || file.size,
          text: parsed.text || '',
          error: parsed.error || (parsed.parsed ? '' : '未提取到文本')
        });
      } catch (err) {
        state.attachments.push({ ...base, error: '后端解析失败' });
      }
      renderAttachments();
      continue;
    }

    if (!isReadableAttachment(file)) {
      state.attachments.push(base);
      renderAttachments();
      continue;
    }

    try {
      const text = await file.text();
      state.attachments.push({ ...base, text: text.slice(0, 60000) });
    } catch (err) {
      state.attachments.push({ ...base, error: '前端读取失败' });
    }
    renderAttachments();
  }

  if (warning && files.length) {
    warning.style.color = '#38bdf8';
    const parsedCount = state.attachments.filter(item => item.text).length;
    warning.textContent = `[Protocol]: 已挂载 ${files.length} 个附件，${parsedCount} 个可进入 AI 上下文。`;
  }
}

// Legacy bridge
window.isReadableAttachment = isReadableAttachment;
window.isBackendParsableAttachment = isBackendParsableAttachment;
window.fileToBase64 = fileToBase64;
window.parseAttachmentOnServer = parseAttachmentOnServer;
window.formatAttachmentSize = formatAttachmentSize;
window.renderAttachments = renderAttachments;
window.attachmentContextText = attachmentContextText;
window.apiAttachments = apiAttachments;
window.handleAttachmentUpload = handleAttachmentUpload;
