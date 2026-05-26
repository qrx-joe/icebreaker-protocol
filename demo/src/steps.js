// ==================== Step ====================
function buildStepPlaceholder(step) {
  const output = step?.output || '';
  if (output.includes('标题') || output.includes('选题') || output.includes('主题')) {
    return '核心主题：\n\n备选标题 1：\n备选标题 2：\n备选标题 3：';
  }
  if (output.includes('提纲') || output.includes('框架')) {
    return '开头：\n\n要点 1：\n要点 2：\n要点 3：\n\n结尾：';
  }
  return '先写一个粗糙版本：\n\n';
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
  warning.textContent = '[Protocol]: 乱写模式启动。不准查资料，不准删除，先把框填满。';

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
