// ==================== 全局状态 ====================
let chatHistory = [];
let currentTask = '';
let currentPhase = 'landing';
let isChatting = false;

// 步骤数据
let steps = [];          // [{title, instruction, output, minutes}]
let stepOutputs = [];    // 每步的用户产出
let currentStepIdx = 0;
let stepTimerInterval = null;
let stepTimeRemaining = 0;
let stepTotalSeconds = 0;
let stepTimerPhase = 'draft';
let stepStartTime = 0;

// 帮助面板
let helpHistory = [];

// 时间偏好：compact=紧凑, standard=标准, loose=宽松
let timePreference = 'standard';

// 产出模式：draft=草稿, deliverable=可交付, portfolio=作品集
let outputMode = 'deliverable';

// 协议强度：gentle=温和, standard=标准, strict=严厉
let protocolStrength = 'standard';

// 会话附件：文本类附件会被读取并带入 AI 上下文。
let attachments = [];

// 破冰日志
let sessionLog = [];

// 无活动监控（方案 C）
let inactivityTimer = null;
let inactivityTriggered = false; // 每步只触发一次
let isFinishing = false; // finishStep 防重入锁

// 改进循环
let improvementRound = 0;
let improvementTargetIdx = 0;

// 语音识别
let recognition = null;
let isRecording = false;
let voiceTranscript = '';

// 首页语音输入
let landingRecognition = null;
let isLandingRecording = false;
let landingVoiceTranscript = '';

// 主工作区语音输入
let mainRecognition = null;
let isMainRecording = false;
let mainVoiceTranscript = '';

// 合约页面独立的加载锁
let contractBusy = false;

// ==================== localStorage 持久化 ====================
const LS_KEY_SNAPSHOT = 'ib_session_snapshot';
const LS_KEY_HISTORY  = 'ib_session_history';
const LS_KEY_SETTINGS = 'ib_protocol_settings';
const LS_HISTORY_MAX  = 50;
const LS_HISTORY_DAYS = 30;

function saveSettings() {
  try {
    localStorage.setItem(LS_KEY_SETTINGS, JSON.stringify({
      timePreference,
      outputMode,
      protocolStrength
    }));
  } catch (e) { /* 静默失败 */ }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_KEY_SETTINGS);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return {
      timePreference: s.timePreference || 'standard',
      outputMode: s.outputMode || 'deliverable',
      protocolStrength: s.protocolStrength || 'standard'
    };
  } catch (e) {
    return null;
  }
}

function saveSnapshot() {
  if (currentPhase === 'landing' || currentPhase === 'done') {
    localStorage.removeItem(LS_KEY_SNAPSHOT);
    return;
  }
  const snapshot = {
    v: 1,
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

function loadSnapshot() {
  try {
    const raw = localStorage.getItem(LS_KEY_SNAPSHOT);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1) return null;
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

function clearSnapshot() {
  localStorage.removeItem(LS_KEY_SNAPSHOT);
}

function appendHistory(entry) {
  try {
    let list = JSON.parse(localStorage.getItem(LS_KEY_HISTORY) || '[]');
    if (!Array.isArray(list)) list = [];
    list.unshift(entry);
    // 按数量限制
    if (list.length > LS_HISTORY_MAX) list = list.slice(0, LS_HISTORY_MAX);
    // 按时间限制
    const cutoff = Date.now() - LS_HISTORY_DAYS * 24 * 60 * 60 * 1000;
    list = list.filter(h => h.ts > cutoff);
    localStorage.setItem(LS_KEY_HISTORY, JSON.stringify(list));
  } catch (e) {
    // 静默失败
  }
}

function loadHistory() {
  try {
    const list = JSON.parse(localStorage.getItem(LS_KEY_HISTORY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function clearHistory() {
  localStorage.removeItem(LS_KEY_HISTORY);
}
