import { state, saveSettings, saveSnapshot } from './state.js'
// ==================== 设置面板 ====================
export function openSettingsPanel() {
  updateProtocolStrengthUI();
  updateTimePreferenceUI();
  updateOutputModeUI();
  document.getElementById('settingsPanel').classList.add('active');
}

export function setTimePreference(value) {
  state.timePreference = value;
  updateTimePreferenceUI();
  saveSettings();
  saveSnapshot();
}

export function updateTimePreferenceUI() {
  const seg = document.getElementById('timePreferenceSeg');
  if (!seg) return;
  seg.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.textContent === {
      compact: '紧凑',
      standard: '标准',
      loose: '宽松'
    }[state.timePreference]);
  });
}

export function setOutputMode(value) {
  state.outputMode = value;
  updateOutputModeUI();
  saveSettings();
  saveSnapshot();
}

export function updateOutputModeUI() {
  const seg = document.getElementById('outputModeSeg');
  if (!seg) return;
  seg.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.textContent === {
      draft: '草稿',
      deliverable: '可交付',
      portfolio: '作品集'
    }[state.outputMode]);
  });
}

export function setProtocolStrength(value) {
  state.protocolStrength = value;
  updateProtocolStrengthUI();
  saveSettings();
  saveSnapshot();
}

export function updateProtocolStrengthUI() {
  const seg = document.getElementById('protocolStrengthSeg');
  if (!seg) return;
  seg.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.textContent === {
      gentle: '温和',
      standard: '标准',
      strict: '严厉'
    }[state.protocolStrength]);
  });
}

export function closeProtocolPanel(id) {
  document.getElementById(id).classList.remove('active');
}

// Legacy bridge
window.openSettingsPanel = openSettingsPanel;
window.setTimePreference = setTimePreference;
window.updateTimePreferenceUI = updateTimePreferenceUI;
window.setOutputMode = setOutputMode;
window.updateOutputModeUI = updateOutputModeUI;
window.setProtocolStrength = setProtocolStrength;
window.updateProtocolStrengthUI = updateProtocolStrengthUI;
window.closeProtocolPanel = closeProtocolPanel;
