import { sessionLog } from './state.js'
import { formatDuration, escapeHtml } from './utils.js'
import { applyContractCopy } from './contract.js'

// ==================== 页面导航 ====================
export function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'pageContract') applyContractCopy();
}

export function applyLandingCopy() {
  document.querySelector('#pageLanding .tag').textContent = 'Protocol Mode';
  document.querySelector('.landing-title').innerHTML = '<span class="ice">破冰</span>协议';
  document.querySelector('.landing-sub').innerHTML = '别解释。写下你要启动的事�?br>协议会把它拆成下一步，并逼它变成可修改的雏形�?;
  document.getElementById('landingInput').setAttribute('placeholder', '输入一个你迟迟没开始的任务');
  document.querySelector('.landing-hint').innerHTML = '<kbd>Enter</kbd> = 启动协议';
}

export function ensureLandingConsoleV2() {
  if (document.querySelector('.landing-console')) return;
  const oldWrap = document.querySelector('.landing-input-wrap');
  if (!oldWrap) return;
  const consoleWrap = document.createElement('div');
  consoleWrap.className = 'landing-console';
  consoleWrap.innerHTML = `
    <div class="landing-input-wrap">
      <textarea id="landingInput" maxlength="500" placeholder="输入一个你迟迟没开始的任务"
        oninput="updateLandingCountV2()"
        onkeydown="if(event.key==='Enter' && !event.shiftKey){ event.preventDefault(); startProtocol(); }" autofocus></textarea>
      <div class="landing-count" id="landingCount">0 / 500</div>
    </div>
    <div class="landing-toolbar">
      <div class="landing-tools">
        <button class="landing-tool" type="button">📎 附件</button>
        <span class="tool-divider"></span>
        <button class="landing-tool" id="landingMic" type="button" onclick="toggleLandingVoice()">🎙�?语音</button>
      </div>
      <button class="landing-start" onclick="startProtocol()">�?启动协议</button>
    </div>`;
  oldWrap.replaceWith(consoleWrap);
}

export function updateLandingCountV2() {
  const input = document.getElementById('landingInput');
  const count = document.getElementById('landingCount');
  if (input && count) count.textContent = `${input.value.length} / 500`;
}

// ==================== 破冰战报 ====================
export function renderBattleReport() {
  const container = document.getElementById('doneSummary');
  if (!sessionLog.length) {
    container.textContent = '';
    return;
  }

  const totalTime = sessionLog.reduce((sum, record) => sum + record.time_spent_seconds, 0);
  const totalText = formatDuration(totalTime);

  let html = '<div class="battle-report">';
  html += '<div class="report-header">━━━━ 破冰日志 ━━━━</div>';
  sessionLog.forEach((record) => {
    const timeText = formatDuration(record.time_spent_seconds);
    html += '<div class="report-step">';
    html += '<span class="report-check">�?/span> ';
    html += `<span class="report-title">步骤 ${record.step_index + 1} · ${escapeHtml(record.step_title)}</span> `;
    html += `<span class="report-time">· ${timeText}</span>`;
    html += '</div>';
    html += `<div class="report-summary">${escapeHtml(record.summary)}</div>`;
  });
  html += '<div class="report-divider"></div>';
  html += `<div class="report-total">总耗时�?{totalText} | 产出�?{sessionLog.length}�?/div>`;
  html += '</div>';

  container.innerHTML = html;
}

