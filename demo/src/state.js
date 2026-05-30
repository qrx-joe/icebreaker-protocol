// ==================== 全局状态 ====================
export const state = {
  chatHistory: [],
  currentTask: '',
  currentPhase: 'landing',
  isChatting: false,

  // 步骤数据
  steps: [],          // [{title, instruction, output, minutes}]
  stepOutputs: [],    // 每步的用户产出
  currentStepIdx: 0,
  stepTimerInterval: null,
  stepTimeRemaining: 0,
  stepTotalSeconds: 0,
  stepTimerPhase: 'draft',
  stepStartTime: 0,

  // 帮助面板
  helpHistory: [],

  // 时间偏好：compact=紧凑, standard=标准, loose=宽松
  timePreference: 'standard',

  // 产出模式：draft=草稿, deliverable=可交付, portfolio=作品集
  outputMode: 'deliverable',

  // 协议强度：gentle=温和, standard=标准, strict=严厉
  protocolStrength: 'standard',

  // 会话附件：文本类附件会被读取并带入 AI 上下文。
  attachments: [],

  // 破冰日志
  sessionLog: [],

  // 无活动监控（方案 C）
  inactivityTimer: null,
  inactivityTriggered: false, // 每步只触发一次
  isFinishing: false, // finishStep 防重入锁

  // 改进循环
  improvementRound: 0,
  improvementTargetIdx: 0,

  // 语音识别
  recognition: null,
  isRecording: false,
  voiceTranscript: '',

  // 首页语音输入
  landingRecognition: null,
  isLandingRecording: false,
  landingVoiceTranscript: '',

  // 主工作区语音输入
  mainRecognition: null,
  isMainRecording: false,
  mainVoiceTranscript: '',

  // 合约页面独立的加载锁
  contractBusy: false,
};

// ==================== localStorage 持久化 ====================
const LS_KEY_SNAPSHOT = 'ib_session_snapshot';
export const LS_KEY_HISTORY  = 'ib_session_history';
const LS_KEY_SETTINGS = 'ib_protocol_settings';
const LS_HISTORY_MAX  = 50;
const LS_HISTORY_DAYS = 30;

// 数据版本号（数据结构变更时递增）
const DATA_VERSION = {
  snapshot: 1,
  history:  1,
  settings: 1
};

// ---------- Settings ----------
export function saveSettings() {
  try {
    localStorage.setItem(LS_KEY_SETTINGS, JSON.stringify({
      v: DATA_VERSION.settings,
      timePreference: state.timePreference,
      outputMode: state.outputMode,
      protocolStrength: state.protocolStrength
    }));
  } catch (e) { /* 静默失败 */ }
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY_SETTINGS);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // 版本迁移
    if (!s.v) {
      // v0 → v1：无字段变更，只需补版本号
      return {
        timePreference: s.timePreference || 'standard',
        outputMode: s.outputMode || 'deliverable',
        protocolStrength: s.protocolStrength || 'standard'
      };
    }
    if (s.v !== DATA_VERSION.settings) {
      // 未来版本：迁移逻辑写在这里
      // 若迁移失败，返回默认值
      return {
        timePreference: s.timePreference || 'standard',
        outputMode: s.outputMode || 'deliverable',
        protocolStrength: s.protocolStrength || 'standard'
      };
    }
    return {
      timePreference: s.timePreference || 'standard',
      outputMode: s.outputMode || 'deliverable',
      protocolStrength: s.protocolStrength || 'standard'
    };
  } catch (e) {
    return null;
  }
}

export function saveSnapshot() {
  if (state.currentPhase === 'landing' || state.currentPhase === 'done') {
    localStorage.removeItem(LS_KEY_SNAPSHOT);
    return;
  }
  const snapshot = {
    v: DATA_VERSION.snapshot,
    ts: Date.now(),
    chatHistory: state.chatHistory,
    currentTask: state.currentTask,
    currentPhase: state.currentPhase,
    steps: state.steps,
    stepOutputs: state.stepOutputs,
    currentStepIdx: state.currentStepIdx,
    helpHistory: state.helpHistory,
    attachments: state.attachments.map(a => ({ name: a.name, size: a.size, type: a.type, data: a.data })),
    sessionLog: state.sessionLog,
    improvementRound: state.improvementRound,
    timePreference: state.timePreference,
    outputMode: state.outputMode,
    protocolStrength: state.protocolStrength,
    stepTextareaValue: document.getElementById('stepTextarea')?.value || ''
  };
  try {
    localStorage.setItem(LS_KEY_SNAPSHOT, JSON.stringify(snapshot));
  } catch (e) {
    // 存储溢出（附件过大）时静默失败，不影响用户体验
  }
}

export function loadSnapshot() {
  try {
    const raw = localStorage.getItem(LS_KEY_SNAPSHOT);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s) return null;
    // 版本检查与迁移
    if (!s.v) {
      // v0 → v1：旧数据无版本号，字段兼容，补版本号后返回
      s.v = DATA_VERSION.snapshot;
    } else if (s.v !== DATA_VERSION.snapshot) {
      // 未来版本迁移入口
      // 当前无迁移逻辑，直接丢弃（防止旧版本读新版本数据结构出错）
      localStorage.removeItem(LS_KEY_SNAPSHOT);
      return null;
    }
    // 超过 7 天的快照视为过期
    if (Date.now() - s.ts > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(LS_KEY_SNAPSHOT);
      return null;
    }
    return s;
  } catch (e) {
    return null;
  }
}

export function clearSnapshot() {
  localStorage.removeItem(LS_KEY_SNAPSHOT);
}

export function appendHistory(entry) {
  try {
    const raw = localStorage.getItem(LS_KEY_HISTORY);
    let data = raw ? JSON.parse(raw) : { v: DATA_VERSION.history, list: [] };
    // 版本迁移：旧数据是纯数组
    if (Array.isArray(data)) {
      data = { v: DATA_VERSION.history, list: data };
    }
    if (!data.list || !Array.isArray(data.list)) data.list = [];
    data.list.unshift(entry);
    // 按数量限制
    if (data.list.length > LS_HISTORY_MAX) data.list = data.list.slice(0, LS_HISTORY_MAX);
    // 按时间限制
    const cutoff = Date.now() - LS_HISTORY_DAYS * 24 * 60 * 60 * 1000;
    data.list = data.list.filter(h => h.ts > cutoff);
    localStorage.setItem(LS_KEY_HISTORY, JSON.stringify(data));
  } catch (e) {
    // 静默失败
  }
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(LS_KEY_HISTORY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    // 版本迁移：旧数据是纯数组
    if (Array.isArray(data)) return data;
    if (!data || !data.list || !Array.isArray(data.list)) return [];
    return data.list;
  } catch (e) {
    return [];
  }
}

export function clearHistoryData() {
  localStorage.removeItem(LS_KEY_HISTORY);
}

// Legacy bridge: expose to window for HTML inline onclick and inter-module compatibility
window.state = state;
window.saveSettings = saveSettings;
window.loadSettings = loadSettings;
window.saveSnapshot = saveSnapshot;
window.loadSnapshot = loadSnapshot;
window.clearSnapshot = clearSnapshot;
window.appendHistory = appendHistory;
window.loadHistory = loadHistory;
window.clearHistoryData = clearHistoryData;
