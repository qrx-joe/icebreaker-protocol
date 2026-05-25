// ==================== Landing ====================
function startProtocol() {
  const input = document.getElementById('landingInput');
  const message = input.value.trim();
  if (!message) {
    input.style.borderColor = 'rgba(248,113,113,0.6)';
    input.setAttribute('placeholder', '随便写点什么，不许空白');
    return;
  }
  input.value = '';
  currentPhase = 'contract';
  showPage('pageContract');
  // 立即显示加载状态，不用等 sendToAI
  contractBusy = true;
  showContractLoading();
  setContractButtonsDisabled(true);
  sendToAI(message)
    .catch(() => {})
    .finally(() => { contractBusy = false; setContractButtonsDisabled(false); clearContractLoading(); });
}
