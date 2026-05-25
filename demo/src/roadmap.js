// ==================== Roadmap ====================
// Roadmap v2: override the legacy renderer with a next-step-first layout.
function showRoadmap(taskName, stepList, highlightIdx) {
  currentPhase = 'roadmap';
  const activeIdx = Number.isInteger(highlightIdx) ? highlightIdx : 0;
  const activeStep = stepList[activeIdx] || stepList[0] || {};
  const activeMinutes = activeStep.minutes || 15;

  const aiMsg = document.getElementById('roadmapAiMsg');
  if (aiMsg) {
    aiMsg.textContent = `[Protocol] 只启动第 ${activeIdx + 1} 步。其余步骤先不要管。`;
  }

  const titleEl = document.getElementById('roadmapTitle');
  if (titleEl) titleEl.textContent = '拆解路线图';

  const taskEl = document.getElementById('roadmapTask');
  if (taskEl) {
    taskEl.innerHTML = taskName
      ? `任务：<strong>${taskName}</strong><br>当前只执行：第 ${activeIdx + 1} 步 · ${activeMinutes} 分钟`
      : `当前只执行：第 ${activeIdx + 1} 步 · ${activeMinutes} 分钟`;
  }

  const listEl = document.getElementById('roadmapStepsList');
  listEl.replaceChildren();

  stepList.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'roadmap-step' + (i === activeIdx ? ' highlight' : '');

    const num = document.createElement('div');
    num.className = 'roadmap-step-num';
    num.textContent = String(i + 1);

    const text = document.createElement('div');
    text.className = 'roadmap-step-text';

    const title = document.createElement('div');
    title.className = 'roadmap-step-title';
    title.textContent = s.title || s.instruction || `第 ${i + 1} 步`;

    const output = document.createElement('div');
    output.className = 'roadmap-step-output';
    output.textContent = `产出：${s.output || '一个可见产出'}`;

    text.append(title, output);

    const time = document.createElement('div');
    time.className = 'roadmap-step-time';
    time.textContent = `${s.minutes || 15}分钟`;

    item.append(num, text, time);
    listEl.appendChild(item);
  });

  const startBtn = document.querySelector('#roadmapActions .btn-primary');
  if (startBtn) {
    startBtn.textContent = `启动第 ${activeIdx + 1} 步 · ${activeMinutes} 分钟`;
    startBtn.onclick = () => goToStep(activeIdx);
  }

  showPage('pageRoadmap');
  saveSnapshot();
}
