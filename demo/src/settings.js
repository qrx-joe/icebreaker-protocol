import { state, saveSettings, saveSnapshot } from './state.js'
import { showModal, showToast } from './notify.js'
// ==================== 设置面板 ====================
export function openSettingsPanel() {
  updateProtocolStrengthUI();
  updateTimePreferenceUI();
  updateOutputModeUI();
  updateApiKeyStatus();
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

export async function updateApiKeyStatus() {
  const el = document.getElementById('apiKeyStatus')
  if (!el) return
  try {
    const res = await fetch('/api/key-status')
    const data = await res.json()
    if (data.configured && data.valid) {
      el.textContent = 'AI 接口已连接 ✓'
      el.className = 'api-key-status success'
    } else if (data.configured) {
      el.textContent = 'API Key 已配置但无效，请检查 .env'
      el.className = 'api-key-status error'
    } else {
      el.textContent = '未配置 API Key（可在 .env 中设置 DEEPSEEK_API_KEY）'
      el.className = 'api-key-status warning'
    }
  } catch (e) {
    el.textContent = '无法检查 AI 接口状态'
    el.className = 'api-key-status error'
  }
}

export async function resetLocalCache() {
  const confirmed = await showModal({
    title: '刷新本地缓存',
    body: '这会清理浏览器里的旧 Service Worker 和缓存，然后重新加载页面。当前未结案的输入可能会丢失。',
    confirmText: '清理并刷新',
    cancelText: '取消',
  })
  if (!confirmed) return

  try {
    if ('caches' in window) {
      const names = await caches.keys()
      await Promise.all(names.map((name) => caches.delete(name)))
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
    window.location.reload()
  } catch (e) {
    showToast('缓存清理失败，请手动刷新页面后重试。', 'error', 6000)
  }
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
window.resetLocalCache = resetLocalCache;
