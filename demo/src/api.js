import {
  chatHistory, currentTask, currentPhase, steps, stepOutputs, currentStepIdx,
  timePreference, outputMode, protocolStrength, isChatting, saveSnapshot
} from './state.js'
import { showPage } from './ui.js'
import { startStepTimer } from './timer.js'
import { goToStep } from './steps.js'
import { apiAttachments } from './attachments.js'
import { showToast } from './notify.js'

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
  if (currentPhase === 'contract') {
    document.getElementById('contractAiMsg').textContent = reply;
  } else if (currentPhase === 'roadmap') {
    document.getElementById('roadmapAiMsg').textContent = reply;
  } else if (currentPhase === 'done') {
    document.getElementById('doneAiMsg').textContent = reply;
  } else if (currentPhase === 'step') {
    document.getElementById('stepWarning').textContent = reply;
  }
}

export function applyAIResponse(data) {
  const reply = data.reply || '';
  if (data.task) currentTask = data.task;
  if (Array.isArray(data.steps) && data.steps.length) {
    const incomingSteps = data.steps.map(normalizeStep);
    if (data.screen === 'roadmap' || steps.length === 0) {
      steps = incomingSteps;
      stepOutputs = new Array(steps.length).fill('');
    } else {
      steps = incomingSteps;
    }
  }

  if (data.screen === 'contract') {
    currentPhase = 'contract';
    document.getElementById('contractAiMsg').textContent = '[Protocol] 先锁定约束，然后开始第 1 步。';
    showPage('pageContract');
    saveSnapshot();
    return;
  }

  if (data.screen === 'roadmap') {
    currentPhase = 'roadmap';
    document.getElementById('roadmapAiMsg').textContent = reply;
    showRoadmap(currentTask, steps);
    saveSnapshot();
    return;
  }

  if (data.screen === 'step') {
    currentPhase = 'step';
    const idx = Math.max(0, Number(data.current_step || 0));
    goToStep(idx);
    return;
  }

  if (data.screen === 'thinking_budget') {
    currentPhase = 'step';
    document.getElementById('stepWarning').textContent = reply;
    if (data.thinking_budget_seconds) {
      startStepTimer(data.thinking_budget_seconds);
    }
    saveSnapshot();
    return;
  }

  if (data.screen === 'done') {
    currentPhase = 'done';
    document.getElementById('doneAiMsg').textContent = reply;
    showDone();
    return;
  }

  showInlineMessage(reply);
  saveSnapshot();
}

export async function sendToAI(message) {
  chatHistory.push({ role: 'user', content: message });

  isChatting = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000); // 30s 超时

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        history: chatHistory.slice(0, -1),
        phase: currentPhase,
        task: currentTask,
        steps,
        current_step: currentStepIdx,
        outputs: stepOutputs,
        attachments: apiAttachments(),
        time_preference: timePreference,
        output_mode: outputMode,
        protocol_strength: protocolStrength
      }),
      signal: controller.signal
    });

    if (!response.ok) throw new Error('请求失败');
    const data = await response.json();

    chatHistory.push({ role: 'assistant', content: data.reply || '' });
    saveSnapshot();
    applyAIResponse(data);

  } catch (err) {
    chatHistory.pop();
    saveSnapshot();
    if (err.name === 'AbortError') {
      showToast('请求超时，请检查网络后重试。', 'error', 5000);
    } else {
      showToast('出错了：' + err.message, 'error', 5000);
    }
  } finally {
    clearTimeout(timer);
    isChatting = false;
  }
}

// Legacy bridge
window.normalizeStep = normalizeStep;
window.showInlineMessage = showInlineMessage;
window.applyAIResponse = applyAIResponse;
window.sendToAI = sendToAI;
