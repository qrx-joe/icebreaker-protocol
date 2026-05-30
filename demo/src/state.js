// ==================== 全局状态 ====================
export let chatHistory = [];
export let currentTask = '';
export let currentPhase = 'landing';
export let isChatting = false;

// 步骤数据
export let steps = [];          // [{title, instruction, output, minutes}]
export let stepOutputs = [];    // 每步的用户产出
export let currentStepIdx = 0;
export let stepTimerInterval = null;
export let stepTimeRemaining = 0;
export let stepTotalSeconds = 0;
export let stepTimerPhase = 'draft';
export let stepStartTime = 0;

// 帮助面板
export let helpHistory = [];

// 时间偏好：compact=紧凑, standard=标准, loose=宽松
export let timePreference = 'standard';

// 产出模式：draft=草稿, deliverable=可交付, portfolio=作品集
export let outputMode = 'deliverable';

// 协议强度：gentle=温和, standard=标准, strict=严厉
export let protocolStrength = 'standard';

// 会话附件：文本类附件会被读取并带入 AI 上下文。
export let attachments = [];

// 破冰日志
export let sessionLog = [];

// 无活动监控（方案 C）
export let inactivityTimer = null;
export let inactivityTriggered = false; // 每步只触发一次
export let isFinishing = false; // finishStep 防重入锁

// 改进循环
export let improvementRound = 0;
export let improvementTargetIdx = 0;

// 语音识别
export let recognition = null;
export let isRecording = false;
export let voiceTranscript = '';

// 首页语音输入
export let landingRecognition = null;
export let isLandingRecording = false;
export let landingVoiceTranscript = '';

// 主工作区语音输入
export let mainRecognition = null;
export let isMainRecording = false;
export let mainVoiceTranscript = '';

// 合约页面独立的加载锁
export let contractBusy = false;

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
      timePreference,
      outputMode,
      protocolStrength
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
  if (currentPhase === 'landing' || currentPhase === 'done') {
    localStorage.removeItem(LS_KEY_SNAPSHOT);
    return;
  }
  const snapshot = {
    v: DATA_VERSION.snapshot,
    ts: Date.now(),
    chatHistory,
    currentTask,
    currentPhase,
    steps,
    stepOutputs,
    currentStepIdx,
    helpHistory,
    attachments: attachments.map(a => ({ name: a.name, size: a.size, type: a.type, data: a.data })),
    sessionLog,
    improvementRound,
    timePreference,
    outputMode,
    protocolStrength,
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

// Setter functions for module-bound variables (avoid illegal reassignment in Rollup)
export function setIsChatting(value) {
  isChatting = value;
}

export function clearHelpHistory() {
  helpHistory.length = 0;
}

// Legacy bridge: expose to window for HTML inline onclick and inter-module compatibility
window.chatHistory = chatHistory;
window.currentTask = currentTask;
window.currentPhase = currentPhase;
window.isChatting = isChatting;
window.steps = steps;
window.stepOutputs = stepOutputs;
window.currentStepIdx = currentStepIdx;
window.stepTimerInterval = stepTimerInterval;
window.stepTimeRemaining = stepTimeRemaining;
window.stepTotalSeconds = stepTotalSeconds;
window.stepTimerPhase = stepTimerPhase;
window.stepStartTime = stepStartTime;
window.helpHistory = helpHistory;
window.timePreference = timePreference;
window.outputMode = outputMode;
window.protocolStrength = protocolStrength;
window.attachments = attachments;
window.sessionLog = sessionLog;
window.inactivityTimer = inactivityTimer;
window.inactivityTriggered = inactivityTriggered;
window.isFinishing = isFinishing;
window.improvementRound = improvementRound;
window.improvementTargetIdx = improvementTargetIdx;
window.recognition = recognition;
window.isRecording = isRecording;
window.voiceTranscript = voiceTranscript;
window.landingRecognition = landingRecognition;
window.isLandingRecording = isLandingRecording;
window.landingVoiceTranscript = landingVoiceTranscript;
window.mainRecognition = mainRecognition;
window.isMainRecording = isMainRecording;
window.mainVoiceTranscript = mainVoiceTranscript;
window.contractBusy = contractBusy;
window.saveSettings = saveSettings;
window.loadSettings = loadSettings;
window.saveSnapshot = saveSnapshot;
window.loadSnapshot = loadSnapshot;
window.clearSnapshot = clearSnapshot;
window.appendHistory = appendHistory;
window.loadHistory = loadHistory;
window.clearHistoryData = clearHistoryData;
