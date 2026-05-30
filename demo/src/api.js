import { state, saveSnapshot } from './state.js'
import { showPage } from './ui.js'
import { startStepTimer } from './timer.js'
import { goToStep } from './steps.js'
import { apiAttachments } from './attachments.js'
import { showToast } from './notify.js'
import { showRoadmap } from './roadmap.js'
import { showDone } from './done.js'

// ==================== AI 对话核心 ====================
export function normalizeStep(raw) {
  return {
    title: raw.title || '未命名步骤',
    instruction: raw.instruction || raw.text || '',
    output: raw.output || '一个可见产出',
    minutes: Number(raw.minutes || raw.time || 15)
  };
}

export function showInlineMessage(reply) {
  if (!reply) return;
  if (state.currentPhase === 'contract') {
    document.getElementById('contractAiMsg').textContent = reply;
  } else if (state.currentPhase === 'roadmap') {
    document.getElementById('roadmapAiMsg').textContent = reply;
  } else if (state.currentPhase === 'done') {
    document.getElementById('doneAiMsg').textContent = reply;
  } else if (state.currentPhase === 'step') {
    document.getElementById('stepWarning').textContent = reply;
  }
}

export function applyAIResponse(data) {
  const reply = data.reply || '';
  if (data.mode === 'local') {
    showToast('当前为本地演示模式：未配置 AI API Key，回复由预设模板生成。', 'warn', 6000);
  }
  if (data.task) state.currentTask = data.task;
  if (Array.isArray(data.steps) && data.steps.length) {
    const incomingSteps = data.steps.map(normalizeStep);
    if (data.screen === 'roadmap' || state.steps.length === 0) {
      state.steps = incomingSteps;
      state.stepOutputs = new Array(state.steps.length).fill('');
    } else {
      state.steps = incomingSteps;
      state.stepOutputs = state.steps.map((_, index) => state.stepOutputs[index] || '');
    }
  }

  if (data.screen === 'contract') {
    state.currentPhase = 'contract';
    document.getElementById('contractAiMsg').textContent = '[Protocol] 先锁定约束，然后开始第 1 步。';
    showPage('pageContract');
    saveSnapshot();
    return;
  }

  if (data.screen === 'roadmap') {
    state.currentPhase = 'roadmap';
    document.getElementById('roadmapAiMsg').textContent = reply;
    showRoadmap(state.currentTask, state.steps);
    saveSnapshot();
    return;
  }

  if (data.screen === 'step') {
    state.currentPhase = 'step';
    const idx = Math.max(0, Number(data.current_step || 0));
    goToStep(idx);
    return;
  }

  if (data.screen === 'thinking_budget') {
    state.currentPhase = 'step';
    document.getElementById('stepWarning').textContent = reply;
    if (data.thinking_budget_seconds) {
      startStepTimer(data.thinking_budget_seconds);
    }
    saveSnapshot();
    return;
  }

  if (data.screen === 'done') {
    state.currentPhase = 'done';
    document.getElementById('doneAiMsg').textContent = reply;
    showDone();
    return;
  }

  showInlineMessage(reply);
  saveSnapshot();
}

export async function sendToAI(message) {
  state.chatHistory.push({ role: 'user', content: message });

  state.isChatting = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000); // 30s 超时

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        history: state.chatHistory.slice(0, -1),
        phase: state.currentPhase,
        task: state.currentTask,
        steps: state.steps,
        current_step: state.currentStepIdx,
        outputs: state.stepOutputs,
        attachments: apiAttachments(),
        time_preference: state.timePreference,
        output_mode: state.outputMode,
        protocol_strength: state.protocolStrength
      }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error('请求失败');
    const data = await response.json();

    state.chatHistory.push({ role: 'assistant', content: data.reply || '' });
    saveSnapshot();
    applyAIResponse(data);

  } catch (err) {
    state.chatHistory.pop();
    saveSnapshot();
    if (err.name === 'AbortError') {
      showToast('请求超时，请检查网络后重试。', 'error', 5000);
    } else {
      showToast('出错了：' + err.message, 'error', 5000);
    }
  } finally {
    clearTimeout(timer);
    state.isChatting = false;
  }
}

// Legacy bridge
window.normalizeStep = normalizeStep;
window.showInlineMessage = showInlineMessage;
window.applyAIResponse = applyAIResponse;
window.sendToAI = sendToAI;
