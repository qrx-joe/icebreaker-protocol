import {
  chatHistory, currentTask, currentPhase, steps, stepOutputs, currentStepIdx,
  helpHistory, attachments, sessionLog, improvementRound,
  timePreference, outputMode, protocolStrength,
  loadSettings, loadSnapshot, clearSnapshot, saveSnapshot
} from './state.js'
import { ensureLandingConsoleV2, applyLandingCopy, updateLandingCountV2, renderBattleReport } from './ui.js'
import { renderAttachments } from './attachments.js'
import { updateTimePreferenceUI } from './settings.js'
import { showModal } from './notify.js'
import { goToStep } from './steps.js'
import { showRoadmap } from './roadmap.js'
import { showPage } from './ui.js'

// ==================== 初始化 ====================
function restoreFromSnapshot(s) {
  chatHistory = s.chatHistory || [];
  currentTask = s.currentTask || '';
  currentPhase = s.currentPhase || 'step';
  steps = s.steps || [];
  stepOutputs = s.stepOutputs || [];
  currentStepIdx = s.currentStepIdx || 0;
  helpHistory = s.helpHistory || [];
  attachments = (s.attachments || []).map(a => ({ name: a.name, size: a.size, type: a.type, data: a.data }));
  sessionLog = s.sessionLog || [];
  improvementRound = s.improvementRound || 0;
  timePreference = s.timePreference || 'standard';
  outputMode = s.outputMode || 'deliverable';
  protocolStrength = s.protocolStrength || 'standard';
  renderAttachments();
  updateTimePreferenceUI();

  if (currentPhase === 'step') {
    goToStep(currentStepIdx);
    // 恢复 textarea 内容（goToStep 会从 stepOutputs 恢复，但如果用户最后修改了没保存，用快照值覆盖）
    const ta = document.getElementById('stepTextarea');
    if (ta && s.stepTextareaValue) ta.value = s.stepTextareaValue;
  } else if (currentPhase === 'roadmap') {
    showRoadmap(currentTask, steps, currentStepIdx);
  } else if (currentPhase === 'done') {
    // 恢复 done 页面时不重复保存历史
    document.getElementById('stepProgressFill').style.width = '100%';
    document.querySelector('.done-title').textContent = '雏形已生成';
    if (!document.getElementById('doneAiMsg').textContent) {
      document.getElementById('doneAiMsg').textContent =
        `你完成了 ${sessionLog.length || steps.length || 0} 个可见块。现在先导出，或只改一处。`;
    }
    renderBattleReport();
    showPage('pageDone');
  }
}

export function initApp() {
  window.addEventListener('DOMContentLoaded', async () => {
    ensureLandingConsoleV2();
    applyLandingCopy();
    updateLandingCountV2();
    document.getElementById('landingInput').focus();

    // 加载全局设置偏好
    const settings = loadSettings();
    if (settings) {
      timePreference = settings.timePreference;
      outputMode = settings.outputMode;
      protocolStrength = settings.protocolStrength;
    }

    // 检查是否有未完成的会话快照
    const snap = loadSnapshot();
    if (snap && snap.currentPhase !== 'landing' && snap.currentPhase !== 'done') {
      const resume = await showModal({
        title: '恢复进度',
        body: `检测到未完成的协议「${snap.currentTask || '未命名任务'}」（步骤 ${snap.currentStepIdx + 1} / ${snap.steps.length}）。\n\n是否恢复上次进度？`,
        confirmText: '恢复',
        cancelText: '放弃'
      });
      if (resume) {
        restoreFromSnapshot(snap);
      } else {
        clearSnapshot();
      }
    }

    // stepTextarea 输入防抖保存快照
    const stepTa = document.getElementById('stepTextarea');
    if (stepTa) {
      let snapshotDebounce;
      stepTa.addEventListener('input', () => {
        clearTimeout(snapshotDebounce);
        snapshotDebounce = setTimeout(saveSnapshot, 500);
      });
    }
  });
}

// Legacy bridge
window.initApp = initApp;
