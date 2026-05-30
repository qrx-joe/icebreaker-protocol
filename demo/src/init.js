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
  state.chatHistory = s.state.chatHistory || [];
  state.currentTask = s.state.currentTask || '';
  state.currentPhase = s.state.currentPhase || 'step';
  state.steps = s.state.steps || [];
  state.stepOutputs = s.state.stepOutputs || [];
  state.currentStepIdx = s.state.currentStepIdx || 0;
  state.helpHistory = s.state.helpHistory || [];
  state.attachments = (s.state.attachments || []).map(a => ({ name: a.name, size: a.size, type: a.type, data: a.data }));
  state.sessionLog = s.state.sessionLog || [];
  state.improvementRound = s.state.improvementRound || 0;
  state.timePreference = s.state.timePreference || 'standard';
  state.outputMode = s.state.outputMode || 'deliverable';
  state.protocolStrength = s.state.protocolStrength || 'standard';
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
      state.timePreference = settings.state.timePreference;
      state.outputMode = settings.state.outputMode;
      state.protocolStrength = settings.state.protocolStrength;
    }

    // 检查是否有未完成的会话快照
    const snap = loadSnapshot();
    if (snap && snap.state.currentPhase !== 'landing' && snap.state.currentPhase !== 'done') {
      const resume = await showModal({
        title: '恢复进度',
        body: `检测到未完成的协议「${snap.state.currentTask || '未命名任务'}」（步骤 ${snap.state.currentStepIdx + 1} / ${snap.state.steps.length}）。\n\n是否恢复上次进度？`,
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
