import { state } from './state.js'
import { sendToAI } from './api.js'

// ==================== Contract ====================
export function setContractButtonsDisabled(disabled) {
  const btns = document.querySelectorAll('.contract-actions .btn');
  btns.forEach(b => {
    b.disabled = disabled;
    b.style.opacity = disabled ? '0.5' : '';
    b.style.pointerEvents = disabled ? 'none' : '';
  });
}

export function showContractLoading() {
  const el = document.getElementById('contractAiMsg');
  el.textContent = '正在思考...';
  el.style.opacity = '0.6';
}

export function clearContractLoading() {
  const el = document.getElementById('contractAiMsg');
  el.style.opacity = '';
}

// Contract v2 copy override: keep the lock screen terse.
export function applyContractCopy() {
  const msg = document.getElementById('contractAiMsg');
  if (msg && !state.contractBusy) {
    msg.textContent = '[Protocol] 第一版只要求存在。';
  }

  const title = document.querySelector('.contract-box h3');
  if (title) title.textContent = '破冰契约';

  const list = document.querySelector('.contract-box ul');
  if (list) {
    list.replaceChildren();
    [
      '只做可修改的雏形',
      '每一步必须留下可见产出',
      '单步限时，不无限准备',
      '不满意也提交',
    ].forEach(text => {
      const item = document.createElement('li');
      item.textContent = text;
      list.appendChild(item);
    });

    const forbidden = document.createElement('li');
    forbidden.className = 'c-forbidden';
    forbidden.textContent = '禁止：空白提交';
    list.appendChild(forbidden);
  }

  const primary = document.querySelector('.contract-actions .btn-primary');
  if (primary) primary.textContent = '启动第 1 步';

  const secondary = document.querySelector('.contract-actions .btn-secondary');
  if (secondary) secondary.textContent = '说出阻力';
}

export function acceptContract() {
  if (state.contractBusy) return;
  state.contractBusy = true;
  setContractButtonsDisabled(true);
  showContractLoading();
  sendToAI('我同意契约，请帮我拆解任务')
    .catch(() => {})
    .finally(() => { state.contractBusy = false; setContractButtonsDisabled(false); clearContractLoading(); });
}

export function questionContract() {
  if (state.contractBusy) return;
  state.contractBusy = true;
  setContractButtonsDisabled(true);
  showContractLoading();
  sendToAI('我怕做不好，不想做一份随便应付的东西')
    .catch(() => {})
    .finally(() => { state.contractBusy = false; setContractButtonsDisabled(false); clearContractLoading(); });
}

// Legacy bridge
window.setContractButtonsDisabled = setContractButtonsDisabled;
window.showContractLoading = showContractLoading;
window.clearContractLoading = clearContractLoading;
window.applyContractCopy = applyContractCopy;
window.acceptContract = acceptContract;
window.questionContract = questionContract;
