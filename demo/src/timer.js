import { stepTimerInterval, stepTimeRemaining, stepTotalSeconds, stepTimerPhase } from './state.js'
import { finishStep } from './steps.js'

// ==================== 计时器 ====================
export function startStepTimer(seconds) {
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
      showOvertimeActions();
    }
  }, 1000);
}

export function applyTimerPhase(phase) {
  const el = document.getElementById('stepTimer');
  el.classList.remove('draft', 'refine', 'panic');
  el.classList.add(phase);
}

export function showPhaseMessage(phase) {
  const el = document.getElementById('stepWarning');
  const remaining = stepTimeRemaining;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  if (phase === 'draft') {
    el.style.color = '#4ade80';
    el.textContent = '[Protocol]: 碎纸机模式。这些内容不会被评判，写完即焚——不对，写完归档。';
    document.getElementById('pageStep')?.classList.add('shredder-mode');
    const badge = document.querySelector('.shredder-badge');
    if (badge) badge.style.display = 'inline-flex';
  } else if (phase === 'refine') {
    el.style.color = '#38bdf8';
    el.textContent = `[Protocol]: 雏形已现。你有 ${mins} 分 ${secs > 0 ? secs + ' 秒' : ''}将其修整到"可以被阅读"的程度。`;
    document.getElementById('pageStep')?.classList.remove('shredder-mode');
    const badge = document.querySelector('.shredder-badge');
    if (badge) badge.style.display = 'none';
  } else if (phase === 'panic') {
    el.style.color = '#f87171';
    el.textContent = '[DELIVER NOW]: 时间即将耗尽。立即交付，白纸是协议唯一的禁忌！';
    document.getElementById('pageStep')?.classList.remove('shredder-mode');
    const badge = document.querySelector('.shredder-badge');
    if (badge) badge.style.display = 'none';
  } else if (phase === 'overtime') {
    el.style.color = '#f87171';
    el.textContent = '[Protocol]: 超时。你写下的东西就是你的产出，不要重来。';
    document.getElementById('pageStep')?.classList.remove('shredder-mode');
    const badge = document.querySelector('.shredder-badge');
    if (badge) badge.style.display = 'none';
  }
}

export function updateTimerDisplay() {
  const m = Math.floor(stepTimeRemaining / 60);
  const s = stepTimeRemaining % 60;
  const display = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  document.getElementById('stepTimer').textContent = display;
}

// ==================== 超时内联确认（替代 confirm 弹窗） ====================
export function showOvertimeActions() {
  const warning = document.getElementById('stepWarning');
  warning.style.color = '#f87171';
  warning.innerHTML = `
    [Protocol]: 时间到了。你写下的东西就是你的产出，不要重来。
    <div style="margin-top:0.5rem;display:flex;gap:0.6rem;flex-wrap:wrap;">
      <button onclick="finishStepFromOvertime()" style="padding:0.45rem 1rem;border:none;border-radius:8px;background:linear-gradient(135deg,#38bdf8,#6366f1);color:#fff;font-family:inherit;font-size:0.85rem;font-weight:600;cursor:pointer;">进入下一步 →</button>
      <button onclick="extendTimerFromOvertime()" style="padding:0.45rem 1rem;border:1px solid rgba(255,255,255,0.1);border-radius:8px;background:rgba(255,255,255,0.04);color:#888;font-family:inherit;font-size:0.85rem;font-weight:600;cursor:pointer;">续 2 分钟</button>
    </div>
  `;
}

export function finishStepFromOvertime() {
  document.getElementById('stepWarning').innerHTML = '';
  finishStep();
}

export function extendTimerFromOvertime() {
  document.getElementById('stepWarning').innerHTML = '';
  startStepTimer(120);
}

// Legacy bridge
window.startStepTimer = startStepTimer;
window.applyTimerPhase = applyTimerPhase;
window.showPhaseMessage = showPhaseMessage;
window.updateTimerDisplay = updateTimerDisplay;
window.showOvertimeActions = showOvertimeActions;
window.finishStepFromOvertime = finishStepFromOvertime;
window.extendTimerFromOvertime = extendTimerFromOvertime;
