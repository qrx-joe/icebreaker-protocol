// ==================== 计时器 ====================
function startStepTimer(seconds) {
  if (stepTimerInterval) clearInterval(stepTimerInterval);
  stepTimeRemaining = seconds;
  stepTotalSeconds = seconds;
  stepTimerPhase = 'draft'; // draft → refine → panic
  updateTimerDisplay();
  applyTimerPhase('draft');

  // 显示乱写期指令
  showPhaseMessage('draft');

  stepTimerInterval = setInterval(() => {
    stepTimeRemaining--;
    updateTimerDisplay();

    const elapsed = stepTotalSeconds - stepTimeRemaining;
    const draftEnd = Math.floor(stepTotalSeconds * 0.3);
    const panicStart = 60;

    // 阶段切换：乱写期 → 修整期
    if (stepTimerPhase === 'draft' && elapsed >= draftEnd) {
      stepTimerPhase = 'refine';
      applyTimerPhase('refine');
      showPhaseMessage('refine');
    }

    // 阶段切换：修整期 → 紧急状态
    if (stepTimerPhase === 'refine' && stepTimeRemaining <= panicStart) {
      stepTimerPhase = 'panic';
      applyTimerPhase('panic');
      showPhaseMessage('panic');
    }

    if (stepTimeRemaining <= 0) {
      clearInterval(stepTimerInterval);
      stepTimerInterval = null;
      showPhaseMessage('overtime');
      if (confirm('时间到了。要进入下一步吗？\n点"取消"可以继续当前步骤。')) {
        finishStep();
      } else {
        startStepTimer(120); // 续 2 分钟，不是 5 分钟
      }
    }
  }, 1000);
}

function applyTimerPhase(phase) {
  const el = document.getElementById('stepTimer');
  el.classList.remove('draft', 'refine', 'panic');
  el.classList.add(phase);
}

function showPhaseMessage(phase) {
  const el = document.getElementById('stepWarning');
  const remaining = stepTimeRemaining;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  if (phase === 'draft') {
    el.style.color = '#4ade80';
    el.textContent = '[Protocol]: 乱写模式启动。不准查资料，不准删除，哪怕全是垃圾话也先把框填满。开始！';
  } else if (phase === 'refine') {
    el.style.color = '#38bdf8';
    el.textContent = `[Protocol]: 雏形已现。你有 ${mins} 分 ${secs > 0 ? secs + ' 秒' : ''}将其修整到"可以被阅读"的程度。`;
  } else if (phase === 'panic') {
    el.style.color = '#f87171';
    el.textContent = '[Warning]: 时间即将耗尽。立即交付，白纸是协议唯一的禁忌！';
  } else if (phase === 'overtime') {
    el.style.color = '#f87171';
    el.textContent = '[Protocol]: 超时。你写下的东西就是你的产出，不要重来。';
  }
}

function updateTimerDisplay() {
  const m = Math.floor(stepTimeRemaining / 60);
  const s = stepTimeRemaining % 60;
  const display = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  document.getElementById('stepTimer').textContent = display;
}
