import { timePreference, outputMode, protocolStrength, saveSettings, saveSnapshot } from './state.js'

// ==================== 设置面板 ====================
export function openSettingsPanel() {
  updateProtocolStrengthUI();
  updateTimePreferenceUI();
  updateOutputModeUI();
  document.getElementById('settingsPanel').classList.add('active');
}

export function setTimePreference(value) {
  timePreference = value;
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
    }[timePreference]);
  });
}

export function setOutputMode(value) {
  outputMode = value;
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
      deliverable: '可交�?,
      portfolio: '作品�?
    }[outputMode]);
  });
}

export function setProtocolStrength(value) {
  protocolStrength = value;
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
    }[protocolStrength]);
  });
}

export function closeProtocolPanel(id) {
  document.getElementById(id).classList.remove('active');
}

