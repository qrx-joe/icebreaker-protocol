import {
  currentTask, steps, currentStepIdx, stepOutputs, helpHistory, isChatting, saveSnapshot
} from './state.js'
import { attachmentContextText, apiAttachments } from './attachments.js'

// ==================== Help Side Drawer ====================
export function appendBubble(container, role, text, showApply) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;';

  const div = document.createElement('div');
  div.className = `bubble ${role}`;
  div.textContent = text;
  wrapper.appendChild(div);

  // 一键采纳按钮（仅 AI 回复且有实质内容时显示）
  if (showApply && role === 'assistant' && text.length > 15) {
    const actions = document.createElement('div');
    actions.className = 'bubble-actions';
    const btn = document.createElement('button');
    btn.className = 'btn-apply';
    btn.textContent = '采纳到左侧';
    btn.onclick = () => applyToEditor(text);
    actions.appendChild(btn);
    wrapper.appendChild(actions);
  }

  container.appendChild(wrapper);
  return div;
}

// 构建全局上下文摘要
function buildContextSummary() {
  const parts = [];
  parts.push(`用户的任务：${currentTask || '未确定'}`);

  // 已完成步骤的产出
  const completedOutputs = [];
  for (let i = 0; i < currentStepIdx; i++) {
    const out = (stepOutputs[i] || '').trim();
    if (out) {
      completedOutputs.push(`步骤${i + 1}「${steps[i]?.title || ''}」的产出：${out}`);
    }
  }
  if (completedOutputs.length) {
    parts.push('已完成的步骤和产出：\n' + completedOutputs.join('\n'));
  }

  // 当前步骤
  const step = steps[currentStepIdx];
  if (step) {
    parts.push(`当前正在执行步骤 ${currentStepIdx + 1}/${steps.length}：${step.title}`);
    parts.push(`步骤说明：${step.instruction}`);
    parts.push(`要求产出：${step.output}`);
    // 当前已写内容
    const currentText = (document.getElementById('stepTextarea')?.value || '').trim();
    if (currentText) {
      parts.push(`用户当前已写的内容：${currentText}`);
    }
  }

  const attached = attachmentContextText();
  if (attached) {
    parts.push(`附件上下文：\n${attached}`);
  }

  return parts.join('\n');
}

// 生成提示词起搏器
export function renderPromptChips() {
  const container = document.getElementById('promptChips');
  container.replaceChildren();

  const step = steps[currentStepIdx];
  if (!step) return;

  // 通用 chips
  const chips = [];

  // 基于当前步骤的智能 chips
  const title = step.title || '';
  const instruction = step.instruction || '';

  // 从步骤说明中提取关键词生成 chips
  if (instruction.includes('标题') || title.includes('标题')) {
    chips.push('帮我想 3 个包含数字的标题');
    chips.push('针对年轻人，语气夸张一点');
  }
  if (instruction.includes('观点') || title.includes('观点')) {
    chips.push('帮我提炼一个有争议的观点');
    chips.push('用一句话概括核心主张');
  }
  if (instruction.includes('消息') || title.includes('消息') || title.includes('联系')) {
    chips.push('帮我写一条不尴尬的开场白');
    chips.push('语气自然一点，不要太正式');
  }
  if (instruction.includes('简历') || title.includes('简历') || title.includes('岗位')) {
    chips.push('帮我把经历改成 STAR 格式');
    chips.push('突出技术关键词');
  }
  if (instruction.includes('代码') || title.includes('demo') || title.includes('骨架')) {
    chips.push('给我一个最简代码模板');
    chips.push('用 Python 实现');
  }

  // 始终可用的 chips
  chips.push('给我一个具体示例');
  if (currentStepIdx > 0) {
    chips.push('结合我上一步的产出，给点建议');
  }

  // 渲染
  chips.forEach(text => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = text;
    chip.onclick = (e) => {
      e.stopPropagation();
      if (isChatting) return;
      document.getElementById('helpInput').value = text;
      sendHelp();
    };
    container.appendChild(chip);
  });
}

// 一键采纳到左侧编辑器
export function applyToEditor(text) {
  const ta = document.getElementById('stepTextarea');
  if (!ta) return;
  // 如果编辑器已有内容，追加换行；否则直接替换
  const existing = ta.value.trim();
  ta.value = existing ? existing + '\n\n' + text : text;
  stepOutputs[currentStepIdx] = ta.value;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.dispatchEvent(new Event('change', { bubbles: true }));
  if (typeof updateStepSubmitState === 'function') updateStepSubmitState();
  ta.focus();
  // 短暂高亮反馈
  ta.style.borderColor = 'rgba(52,211,153,0.6)';
  ta.style.boxShadow = '0 0 0 3px rgba(52,211,153,0.1)';
  setTimeout(() => {
    ta.style.borderColor = '';
    ta.style.boxShadow = '';
  }, 1200);
}

export function openHelp() {
  const drawer = document.getElementById('helpDrawer');
  drawer.classList.add('active');
  helpHistory = [];
  const container = document.getElementById('helpMessages');
  container.replaceChildren();

  // 构建主动式欢迎语
  const step = steps[currentStepIdx];
  let greeting;

  if (step) {
    // 收集已有上下文
    const prevOutputs = [];
    for (let i = 0; i < currentStepIdx; i++) {
      const out = (stepOutputs[i] || '').trim();
      if (out) prevOutputs.push(`步骤${i + 1}「${steps[i]?.title}」：${out}`);
    }

    const currentText = (document.getElementById('stepTextarea')?.value || '').trim();

    if (prevOutputs.length > 0) {
      // 有历史上下文 → 主动提议
      greeting = `你正在做「${currentTask}」的第 ${currentStepIdx + 1} 步：${step.title}。\n\n`;
      greeting += `你前面已经完成了 ${prevOutputs.length} 步：\n`;
      prevOutputs.forEach(p => { greeting += `  · ${p}\n`; });
      greeting += `\n`;
      if (currentText) {
        greeting += `你当前已经写了：「${currentText.slice(0, 80)}${currentText.length > 80 ? '...' : ''}」\n\n`;
      }
      greeting += `需要我基于这些内容帮你推进吗？比如直接帮你起草、优化、或者给你几个方向参考。`;
    } else {
      // 第一步，无历史
      greeting = `你正在做第 1 步：${step.title}。\n\n`;
      greeting += `要求产出：${step.output}\n\n`;
      if (currentText) {
        greeting += `你已经写了一些内容，需要我帮你继续完善吗？`;
      } else {
        greeting += `还没开始写？我可以先帮你起个头，或者给你一个具体示例参考。`;
      }
    }
  } else {
    greeting = '有什么我能帮你的？';
  }

  appendBubble(container, 'assistant', greeting, false);
  renderPromptChips();
  setTimeout(() => {
    document.getElementById('helpInput').focus();
    updateRunBtn();
  }, 300);
}

export function closeHelp() {
  document.getElementById('helpDrawer').classList.remove('active');
}

export function initHelp() {
  // 点击抽屉外部关闭
  document.addEventListener('click', (e) => {
    const drawer = document.getElementById('helpDrawer');
    if (!drawer.classList.contains('active')) return;
    if (drawer.contains(e.target)) return;
    if (e.target.closest('[onclick*="openHelp"]')) return;
    closeHelp();
  });

  // Escape 关闭抽屉
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeHelp();
  });
}

export function updateRunBtn() {
  const input = document.getElementById('helpInput');
  const btn = document.getElementById('btnRun');
  if (!input || !btn) return;
  const ready = input.value.trim().length > 0;
  btn.className = ready ? 'btn-run ready' : 'btn-run idle';
  btn.querySelector('.label').textContent = ready ? 'RUN' : 'IDLE';
}

export async function sendHelp() {
  const input = document.getElementById('helpInput');
  const message = input.value.trim();
  if (!message || isChatting) return;
  input.value = '';
  updateRunBtn();

  // 隐藏 chips（用户已开始自由对话）
  document.getElementById('promptChips').replaceChildren();

  const container = document.getElementById('helpMessages');
  appendBubble(container, 'user', message, false);
  helpHistory.push({ role: 'user', content: message });

  // 创建 AI 气泡，先显示加载态
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;';
  const bubble = document.createElement('div');
  bubble.className = 'bubble assistant';
  bubble.textContent = '正在思考...';
  bubble.style.cssText = 'opacity:0.5; animation:pulse 1.5s ease-in-out infinite;';
  wrapper.appendChild(bubble);
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;

  isChatting = true;
  try {
    const contextSummary = buildContextSummary();
    const contextualMessage = `[系统上下文]\n${contextSummary}\n\n[用户问题]\n${message}`;

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: contextualMessage,
        history: helpHistory.slice(0, -1),
        phase: 'step',
        task: currentTask,
        steps,
        current_step: currentStepIdx,
        outputs: stepOutputs,
        attachments: apiAttachments()
      })
    });

    if (!response.ok) throw new Error('请求失败');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    let firstChunk = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 保留未完成的行

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);

        if (payload === '[DONE]') break;

        try {
          const parsed = JSON.parse(payload);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.text) {
            if (firstChunk) {
              firstChunk = false;
              bubble.textContent = '';
              bubble.style.cssText = '';
            }
            fullText += parsed.text;
            bubble.textContent = fullText;
            container.scrollTop = container.scrollHeight;
          }
        } catch (e) {
          if (e.message && !e.message.includes('JSON')) throw e;
        }
      }
    }

    if (fullText) {
      // 添加「采纳到左侧」按钮
      const actions = document.createElement('div');
      actions.className = 'bubble-actions';
      const btn = document.createElement('button');
      btn.className = 'btn-apply';
      btn.textContent = '采纳到左侧';
      btn.onclick = () => applyToEditor(fullText);
      actions.appendChild(btn);
      wrapper.appendChild(actions);

      helpHistory.push({ role: 'assistant', content: fullText });
      saveSnapshot();
    }
  } catch (err) {
    bubble.style.cssText = '';
    bubble.textContent = '出错了，请重试。';
  } finally {
    isChatting = false;
    input.focus();
  }
}

// Legacy bridge
window.appendBubble = appendBubble;
window.renderPromptChips = renderPromptChips;
window.applyToEditor = applyToEditor;
window.openHelp = openHelp;
window.closeHelp = closeHelp;
window.updateRunBtn = updateRunBtn;
window.sendHelp = sendHelp;
