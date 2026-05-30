import {
  recognition, isRecording, voiceTranscript,
  landingRecognition, isLandingRecording, landingVoiceTranscript,
  mainRecognition, isMainRecording, mainVoiceTranscript,
  currentStepIdx, stepOutputs
} from './state.js'
import { showToast } from './notify.js'
import { updateRunBtn } from './help.js'

// ==================== 语音识别（帮助面板） ====================
export function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const rec = new SpeechRecognition();
  rec.lang = 'zh-CN';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    let interim = '';
    let final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    if (final) voiceTranscript += final;
    // 实时更新输入框预览
    const input = document.getElementById('helpInput');
    const display = voiceTranscript + interim;
    input.value = display;
    updateRunBtn();
  };

  rec.onerror = (event) => {
    console.warn('Speech error:', event.error);
    if (event.error === 'not-allowed') {
      showVoiceHint('麦克风权限被拒绝。请在浏览器设置中允许。');
    }
    stopRecording();
  };

  rec.onend = () => {
    // 如果还在录音状态但识别自动结束了，重启（连续模式）
    if (isRecording) {
      try { rec.start(); } catch (e) { stopRecording(); }
    }
  };

  return rec;
}

export function toggleVoice() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

export function startRecording() {
  if (!recognition) recognition = initSpeechRecognition();
  if (!recognition) {
    showVoiceHint('当前浏览器不支持语音输入，请使用 Chrome 或 Edge。');
    return;
  }

  isRecording = true;
  voiceTranscript = '';

  const btn = document.getElementById('btnMic');
  const row = document.getElementById('helpInputRow');
  const input = document.getElementById('helpInput');

  btn.classList.add('recording');
  row.classList.add('voice-active');
  input.placeholder = '正在聆听...说出来，不要想。';
  input.value = '';

  showVoiceHint('🎙️ 意识流捕捉中。说出来，不管多乱，[Protocol] 帮你提纯。');

  try {
    recognition.start();
  } catch (e) {
    stopRecording();
  }
}

export function stopRecording() {
  isRecording = false;

  const btn = document.getElementById('btnMic');
  const row = document.getElementById('helpInputRow');
  const input = document.getElementById('helpInput');

  btn.classList.remove('recording');
  row.classList.remove('voice-active');
  input.placeholder = '输入指令...';

  if (recognition) {
    try { recognition.stop(); } catch (e) {}
  }

  const raw = voiceTranscript.trim();
  if (!raw) {
    clearVoiceHint();
    return;
  }

  // 把转录文本放入输入框
  input.value = raw;
  updateRunBtn();

  // 显示提纯提示
  showVoiceHint('转录完成。点击 RUN 执行，或编辑后发送。');
}

export function showVoiceHint(text) {
  const hint = document.getElementById('inputHint');
  hint.innerHTML = `<span class="dot"></span> ${text}`;
  hint.style.color = '#ef4444';
}

export function clearVoiceHint() {
  const hint = document.getElementById('inputHint');
  hint.innerHTML = 'Press Enter to Run Protocol';
  hint.style.color = '';
}

// ==================== 首页语音输入 ====================
export function toggleLandingVoice() {
  if (isLandingRecording) {
    stopLandingRecording();
  } else {
    startLandingRecording();
  }
}

export function startLandingRecording() {
  if (!landingRecognition) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('当前浏览器不支持语音输入，请使用 Chrome 或 Edge。', 'warning', 5000);
      return;
    }
    landingRecognition = new SpeechRecognition();
    landingRecognition.lang = 'zh-CN';
    landingRecognition.continuous = true;
    landingRecognition.interimResults = true;

    landingRecognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) landingVoiceTranscript += final;
      const input = document.getElementById('landingInput');
      input.value = landingVoiceTranscript + interim;
    };

    landingRecognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        showToast('麦克风权限被拒绝。请在浏览器设置中允许。', 'warning', 5000);
      }
      stopLandingRecording();
    };

    landingRecognition.onend = () => {
      if (isLandingRecording) {
        try { landingRecognition.start(); } catch (e) { stopLandingRecording(); }
      }
    };
  }

  isLandingRecording = true;
  landingVoiceTranscript = '';

  const btn = document.getElementById('landingMic');
  const input = document.getElementById('landingInput');
  btn.classList.add('recording');
  btn.textContent = '🔴';
  input.placeholder = '正在聆听...说出来，不要想。';
  input.value = '';

  try { landingRecognition.start(); } catch (e) { stopLandingRecording(); }
}

export function stopLandingRecording() {
  isLandingRecording = false;

  const btn = document.getElementById('landingMic');
  const input = document.getElementById('landingInput');
  btn.classList.remove('recording');
  btn.textContent = '🎙️';
  input.placeholder = '比如：我想写一篇博客但不知道怎么开头...';

  if (landingRecognition) {
    try { landingRecognition.stop(); } catch (e) {}
  }
}

// ==================== 主工作区语音输入 ====================
export function toggleMainVoice() {
  if (isMainRecording) {
    stopMainRecording();
  } else {
    startMainRecording();
  }
}

export function startMainRecording() {
  if (!mainRecognition) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      document.getElementById('stepWarning').textContent = '当前浏览器不支持语音输入，请使用 Chrome 或 Edge。';
      return;
    }
    mainRecognition = new SpeechRecognition();
    mainRecognition.lang = 'zh-CN';
    mainRecognition.continuous = true;
    mainRecognition.interimResults = true;

    mainRecognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if (final) mainVoiceTranscript += final;
      const ta = document.getElementById('stepTextarea');
      // 追加到已有内容后面
      const existing = stepOutputs[currentStepIdx] || '';
      const separator = existing && mainVoiceTranscript ? '\n' : '';
      ta.value = existing + separator + mainVoiceTranscript + interim;
    };

    mainRecognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        document.getElementById('stepWarning').textContent = '麦克风权限被拒绝。请在浏览器设置中允许。';
      }
      stopMainRecording();
    };

    mainRecognition.onend = () => {
      if (isMainRecording) {
        try { mainRecognition.start(); } catch (e) { stopMainRecording(); }
      }
    };
  }

  isMainRecording = true;
  mainVoiceTranscript = '';

  // 保留已有内容作为基础
  const ta = document.getElementById('stepTextarea');
  const existing = ta.value.trim();
  if (existing) {
    mainVoiceTranscript = existing + '\n';
  }

  const btn = document.getElementById('pillMic');
  btn.classList.add('recording');
  btn.textContent = '🔴 录音中...';
  ta.placeholder = '正在聆听...说出来，不要想。';

  const warning = document.getElementById('stepWarning');
  warning.style.color = '#ef4444';
  warning.textContent = '[Protocol]: 说出来。不管多乱，先吐出来。';

  try { mainRecognition.start(); } catch (e) { stopMainRecording(); }
}

export function stopMainRecording() {
  isMainRecording = false;

  const btn = document.getElementById('pillMic');
  btn.classList.remove('recording');
  btn.textContent = '🎙️ 语音';

  const ta = document.getElementById('stepTextarea');
  ta.placeholder = '在这里写下你的产出...';

  if (mainRecognition) {
    try { mainRecognition.stop(); } catch (e) {}
  }

  // 保存最终内容
  stepOutputs[currentStepIdx] = ta.value;

  const warning = document.getElementById('stepWarning');
  warning.style.color = '#4ade80';
  warning.textContent = '[Protocol]: 语音捕捉完成。你可以继续编辑，或直接提交。';
}

// Legacy bridge
window.initSpeechRecognition = initSpeechRecognition;
window.toggleVoice = toggleVoice;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.showVoiceHint = showVoiceHint;
window.clearVoiceHint = clearVoiceHint;
window.toggleLandingVoice = toggleLandingVoice;
window.startLandingRecording = startLandingRecording;
window.stopLandingRecording = stopLandingRecording;
window.toggleMainVoice = toggleMainVoice;
window.startMainRecording = startMainRecording;
window.stopMainRecording = stopMainRecording;
