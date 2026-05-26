// ==================== Step ====================
function buildStepPlaceholder(step) {
  const output = step?.output || '';
  const title = step?.title || '';

  // 标题/选题类步骤
  if (output.includes('标题') || output.includes('选题') || output.includes('主题') || title.includes('标题')) {
    return '先写一句垃圾话当标题，比如：\n"这个话题我觉得..."\n\n备选标题 2：\n备选标题 3：';
  }

  // 提纲/框架类步骤
  if (output.includes('提纲') || output.includes('框架') || title.includes('大纲')) {
    return '不用想结构，先把脑子里闪过的三个词写下来：\n\n词 1：\n词 2：\n词 3：\n\n然后再串起来。';
  }

  // 开头/Hook类
  if (output.includes('开头') || output.includes('hook') || title.includes('开头') || title.includes('引言')) {
    return '先写一句废话当开头，比如：\n"今天想聊聊..."\n\n写完再改，现在只负责把字打出来。';
  }

  // 代码/开发类
  if (output.includes('代码') || output.includes('demo') || output.includes('骨架') || title.includes('代码') || title.includes('实现')) {
    return '先写一行能跑通的代码，哪怕只打印 hello：\n\nconsole.log("hello");\n\n能跑就行，优雅留给第二轮。';
  }

  // 邮件/消息类
  if (output.includes('邮件') || output.includes('消息') || output.includes('联系') || title.includes('邮件') || title.includes('消息')) {
    return '先写一句不尴尬的开场白，比如：\n"hi，想跟你说件事..."\n\n语气自然就行，不用正式。';
  }

  // 默认引导
  return '先写一个粗糙版本，多烂都行：\n\n"关于这个，我觉得..."\n\n写完第一句，后面自然就来了。';
}

function renderStepInstruction(step) {
  const instruction = escapeHtml(step.instruction || '');
  const output = escapeHtml(step.output || '一个可见产出');
  return `
    <div class="step-instruction-block">
      <div class="step-instruction-row">
        <span class="step-instruction-label">要求</span>
        <span>${instruction}</span>
      </div>
      <div class="step-instruction-row">
        <span class="step-instruction-label">交付</span>
        <span>${output}</span>
      </div>
    </div>
  `;
}

function updateStepSubmitState() {
  const ta = document.getElementById('stepTextarea');
  const btn = document.querySelector('.step-footer-right .btn-primary');
  if (!ta || !btn) return;
  const ready = ta.value.trim().length >= 5;
  btn.disabled = !ready;
  btn.textContent = ready ? '做完了，下一步' : '写 5 个字后提交';
}

// Step v2: make the execution screen feel like a small output slot.
function goToStep(idx) {
  if (idx < 0 || idx >= steps.length) return;
  currentPhase = 'step';

  if (currentStepIdx >= 0 && currentStepIdx < steps.length) {
    const existingTa = document.getElementById('stepTextarea');
    if (existingTa) stepOutputs[currentStepIdx] = existingTa.value;
  }

  currentStepIdx = idx;
  stepStartTime = Date.now();
  const step = steps[idx];

  document.getElementById('stepBadge').textContent = `${idx + 1} / ${steps.length}`;
  document.getElementById('stepTitle').textContent = step.title || `第 ${idx + 1} 步`;
  document.getElementById('stepInstruction').innerHTML = renderStepInstruction(step);

  const ta = document.getElementById('stepTextarea');
  ta.value = stepOutputs[idx] || '';
  ta.placeholder = buildStepPlaceholder(step);
  if (ta._submitStateHandler) ta.removeEventListener('input', ta._submitStateHandler);
  ta._submitStateHandler = updateStepSubmitState;
  ta.addEventListener('input', ta._submitStateHandler);

  const help = document.getElementById('pillHelp');
  if (help) help.textContent = '⚡ 给我起头';
  renderAttachments();

  const warning = document.getElementById('stepWarning');
  warning.style.color = '#4ade80';
  warning.textContent = '[Protocol]: 碎纸机模式启动。这些内容不会被评判，只管填满。';

  // 碎纸机模式：乱写期视觉提示
  const stepPage = document.getElementById('pageStep');
  if (stepPage) stepPage.classList.add('shredder-mode');

  // 添加碎纸机徽章到步骤标题旁
  let shredderBadge = document.querySelector('.shredder-badge');
  if (!shredderBadge) {
    shredderBadge = document.createElement('span');
    shredderBadge.className = 'shredder-badge';
    shredderBadge.textContent = '🗑️ 碎纸机';
    const titleDisplay = document.querySelector('.step-title-display');
    if (titleDisplay) titleDisplay.parentNode.appendChild(shredderBadge);
  } else {
    shredderBadge.style.display = 'inline-flex';
  }

  const pct = (idx / steps.length) * 100;
  document.getElementById('stepProgressFill').style.width = pct + '%';
  document.getElementById('btnPrev').disabled = idx === 0;
  updateStepSubmitState();

  document.querySelectorAll('.roadmap-step').forEach((el, i) => {
    el.style.opacity = i === idx ? '1' : '0.42';
  });

  showPage('pageStep');
  startStepTimer((step.minutes || 15) * 60);
  startInactivityMonitor();
  setTimeout(() => ta.focus(), 300);

  if (idx > 0) {
    fetchProactiveSuggestion(idx);
  }
}

async function fetchProactiveSuggestion(idx) {
  const prevOutputs = [];
  for (let i = 0; i < idx; i++) {
    const out = (stepOutputs[i] || '').trim();
    if (out) prevOutputs.push(`步骤${i + 1}「${steps[i]?.title}」：${out}`);
  }
  if (prevOutputs.length === 0) return;

  const step = steps[idx];
  const context = prevOutputs.join('\n');
  const warning = document.getElementById('stepWarning');
  warning.style.color = '#666';
  warning.textContent = '[Protocol]: 正在分析你的前序产出...';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `基于用户前序产出，为当前步骤给出一句具体的开场建议（不超过30字）。不要复读步骤说明。\n\n前序产出：\n${context}\n\n当前步骤：${step.title}\n要求产出：${step.output}`,
        phase: 'step',
        task: currentTask,
        steps,
        current_step: idx,
        outputs: stepOutputs,
        attachments: apiAttachments()
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.reply) {
        warning.style.color = '#38bdf8';
        warning.textContent = `[Protocol]: ${data.reply}`;
      }
    }
  } catch (e) {
    // 静默失败，不影响用户体验
    warning.textContent = '';
  }
}

function prevStep() {
  goToStep(currentStepIdx - 1);
}

async function finishStep() {
  if (isFinishing) return;
  isFinishing = true;

  try {
    const ta = document.getElementById('stepTextarea');
    const output = ta.value.trim();
    if (output.length < 5) {
      document.getElementById('stepWarning').style.color = '#f87171';
      document.getElementById('stepWarning').textContent = '产出物不足。协议不接受空操作。至少写 5 个字。';
      ta.focus();
      return;
    }
    stepOutputs[currentStepIdx] = output;

    // 归档到破冰日志
    const step = steps[currentStepIdx];
    const timeSpent = Math.round((Date.now() - stepStartTime) / 1000);

    if (stepTimerInterval) {
      clearInterval(stepTimerInterval);
      stepTimerInterval = null;
    }

    stopInactivityMonitor();

    document.getElementById('stepTimer').classList.remove('draft', 'refine', 'panic');

    // 等待归档完成再跳转，确保 sessionLog 写入是事务性的
    await archiveStep(step, currentStepIdx, output, timeSpent);
    saveSnapshot();

    if (currentStepIdx < steps.length - 1) {
      goToStep(currentStepIdx + 1);
    } else {
      currentPhase = 'done';
      sendToAI('所有步骤都完成了，请帮我拼装成型');
    }
  } finally {
    isFinishing = false;
  }
}

// ==================== 破冰日志归档 ====================
async function archiveStep(step, index, output, timeSpent) {
  // 先用截断作为默认摘要
  let summary = output.slice(0, 20);
  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step_title: step.title || `步骤 ${index + 1}`,
        user_content: output
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.summary) summary = data.summary;
    }
  } catch (e) { /* fallback to truncated text */ }

  const record = {
    step_title: step.title || `步骤 ${index + 1}`,
    step_index: index,
    user_output: output,
    summary: summary,
    time_spent_seconds: timeSpent
  };

  // 改进循环可能重新完成同一步，更新而非重复追加
  const existingIdx = sessionLog.findIndex(r => r.step_index === index);
  if (existingIdx >= 0) {
    // 累计耗时
    record.time_spent_seconds += sessionLog[existingIdx].time_spent_seconds;
    sessionLog[existingIdx] = record;
  } else {
    sessionLog.push(record);
  }
}
