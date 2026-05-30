import { state, loadSettings, loadSnapshot, clearSnapshot, saveSnapshot } from './state.js'
import { ensureLandingConsoleV2, applyLandingCopy, updateLandingCountV2, renderBattleReport } from './ui.js'
import { renderAttachments } from './attachments.js'
import { updateTimePreferenceUI } from './settings.js'
import { showModal } from './notify.js'
import { goToStep } from './steps.js'
import { showRoadmap } from './roadmap.js'
import { showPage } from './ui.js'

// ==================== 初始化 ====================
function restoreFromSnapshot(s) {
  state.chatHistory = s.chatHistory || [];
  state.currentTask = s.currentTask || '';
  state.currentPhase = s.currentPhase || 'step';
  state.steps = s.steps || [];
  state.stepOutputs = s.stepOutputs || [];
  state.currentStepIdx = s.currentStepIdx || 0;
  state.helpHistory = s.helpHistory || [];
  state.attachments = (s.attachments || []).map(a => ({ name: a.name, size: a.size, type: a.type, data: a.data }));
  state.sessionLog = s.sessionLog || [];
  state.improvementRound = s.improvementRound || 0;
  state.timePreference = s.timePreference || 'standard';
  state.outputMode = s.outputMode || 'deliverable';
  state.protocolStrength = s.protocolStrength || 'standard';
  renderAttachments();
  updateTimePreferenceUI();

  if (state.currentPhase === 'step') {
    goToStep(state.currentStepIdx);
    // 恢复 textarea 内容（goToStep 会从 state.stepOutputs 恢复，但如果用户最后修改了没保存，用快照值覆盖）
    const ta = document.getElementById('stepTextarea');
    if (ta && s.stepTextareaValue) ta.value = s.stepTextareaValue;
  } else if (state.currentPhase === 'roadmap') {
    showRoadmap(state.currentTask, state.steps, state.currentStepIdx);
  } else if (state.currentPhase === 'done') {
    // 恢复 done 页面时不重复保存历史
    document.getElementById('stepProgressFill').style.width = '100%';
    document.querySelector('.done-title').textContent = '雏形已生成';
    if (!document.getElementById('doneAiMsg').textContent) {
      document.getElementById('doneAiMsg').textContent =
        `你完成了 ${state.sessionLog.length || state.steps.length || 0} 个可见块。现在先导出，或只改一处。`;
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
      state.timePreference = settings.timePreference;
      state.outputMode = settings.outputMode;
      state.protocolStrength = settings.protocolStrength;
    }

    // 检查是否有未完成的会话快照
    const snap = loadSnapshot();
    if (snap && snap.currentPhase !== 'landing' && snap.currentPhase !== 'done') {
      const resume = await showModal({
        title: '恢复进度',
        body: `检测到未完成的协议「${snap.currentTask || '未命名任务'}」（步骤 ${snap.currentStepIdx + 1} / ${(snap.steps || []).length}）。\n\n是否恢复上次进度？`,
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
