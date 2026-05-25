// ==================== 设置面板 ====================
function openSettingsPanel() {
  updateProtocolStrengthUI();
  updateTimePreferenceUI();
  updateOutputModeUI();
  document.getElementById('settingsPanel').classList.add('active');
}

function setTimePreference(value) {
  timePreference = value;
  updateTimePreferenceUI();
  saveSettings();
  saveSnapshot();
}

function updateTimePreferenceUI() {
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

function setOutputMode(value) {
  outputMode = value;
  updateOutputModeUI();
  saveSettings();
  saveSnapshot();
}

function updateOutputModeUI() {
  const seg = document.getElementById('outputModeSeg');
  if (!seg) return;
  seg.querySelectorAll('button').forEach((btn) => {
    btn.classList.toggle('active', btn.textContent === {
      draft: '草稿',
      deliverable: '可交付',
      portfolio: '作品集'
    }[outputMode]);
  });
}

function setProtocolStrength(value) {
  protocolStrength = value;
  updateProtocolStrengthUI();
  saveSettings();
  saveSnapshot();
}

function updateProtocolStrengthUI() {
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

function closeProtocolPanel(id) {
  document.getElementById(id).classList.remove('active');
}
