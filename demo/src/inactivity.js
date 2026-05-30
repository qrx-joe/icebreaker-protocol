import { inactivityTriggered, inactivityTimer } from './state.js'
import { openHelp } from './help.js'

// ==================== 无活动监控 ====================
export function startInactivityMonitor() {
  stopInactivityMonitor();
  inactivityTriggered = false;
  const ta = document.getElementById('stepTextarea');
  if (!ta) return;

  const resetTimer = () => {
    if (inactivityTriggered) return;
    if (inactivityTimer) clearTimeout(inactivityTimer);
    const pill = document.getElementById('pillHelp');
    if (pill) pill.classList.remove('pulse');
    inactivityTimer = setTimeout(onInactivityTimeout, 60000);
  };

  ta.addEventListener('input', resetTimer);
  // 存引用以便清理
  ta._inactivityReset = resetTimer;
  resetTimer();
}

export function stopInactivityMonitor() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
  const ta = document.getElementById('stepTextarea');
  if (ta && ta._inactivityReset) {
    ta.removeEventListener('input', ta._inactivityReset);
    ta._inactivityReset = null;
  }
  const pill = document.getElementById('pillHelp');
  if (pill) pill.classList.remove('pulse');
}

function onInactivityTimeout() {
  if (inactivityTriggered) return;
  inactivityTriggered = true;

  // 药丸按钮变色脉冲
  const pill = document.getElementById('pillHelp');
  if (pill) pill.classList.add('pulse');

  // 自动打开帮助抽屉
  const drawer = document.getElementById('helpDrawer');
  if (drawer.classList.contains('active')) return; // 已经打开就不重复

  // 直接调用 openHelp，但不自动发送消息
  openHelp();

  // 在抽屉里追加一条主动拦截提示
  const container = document.getElementById('helpMessages');
  const intercept = document.createElement('div');
  intercept.className = 'bubble assistant';
  intercept.style.cssText = 'border: 1px solid rgba(251,191,36,0.3); background: rgba(251,191,36,0.05);';
  intercept.textContent = '检测到你在这一步停留过久。[Protocol] 已介入当前会话。\n\n不要思考，直接从下面选一个方向，或者告诉我你卡在哪了。';
  container.appendChild(intercept);
  container.scrollTop = container.scrollHeight;
}

// Legacy bridge
window.startInactivityMonitor = startInactivityMonitor;
window.stopInactivityMonitor = stopInactivityMonitor;
