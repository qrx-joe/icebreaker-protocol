export function bindEvents() {
  // ==================== Header ====================
  const headerBtns = document.querySelectorAll('.protocol-actions button')
  if (headerBtns[0]) headerBtns[0].addEventListener('click', window.openHistoryPanel)
  if (headerBtns[1]) headerBtns[1].addEventListener('click', window.openSettingsPanel)

  // ==================== Landing ====================
  document.getElementById('landingMic')?.addEventListener('click', window.toggleLandingVoice)
  document.querySelector('.landing-start')?.addEventListener('click', window.startProtocol)
  document.getElementById('landingInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.startProtocol()
  })

  // ==================== Contract ====================
  document.querySelector('.contract-actions .btn-primary')?.addEventListener('click', window.acceptContract)
  document.querySelector('.contract-actions .btn-secondary')?.addEventListener('click', window.questionContract)

  // ==================== Roadmap ====================
  document.querySelector('#roadmapActions .btn-primary')?.addEventListener('click', () => window.goToStep(0))
  document.getElementById('btnConfirmImprove')?.addEventListener('click', window.confirmImprovement)
  document.querySelector('#roadmapImproveActions .btn-secondary')?.addEventListener('click', window.skipImprovement)

  // ==================== Step ====================
  document.getElementById('attachmentInput')?.addEventListener('change', (e) => {
    window.handleAttachmentUpload(e.target.files)
    e.target.value = ''
  })
  document.getElementById('attachmentBtn')?.addEventListener('click', () => {
    document.getElementById('attachmentInput').click()
  })
  document.getElementById('pillMic')?.addEventListener('click', window.toggleMainVoice)
  document.getElementById('pillHelp')?.addEventListener('click', window.openHelp)
  document.getElementById('btnPrev')?.addEventListener('click', window.prevStep)
  document.querySelector('.step-footer-right .btn-primary')?.addEventListener('click', window.finishStep)

  // ==================== Done ====================
  document.getElementById('btnArchive')?.addEventListener('click', window.archiveAndReset)
  document.getElementById('btnExportMain')?.addEventListener('click', window.goToReview)
  document.getElementById('btnImprove')?.addEventListener('click', window.startImprovement)
  const doneExportBtns = document.querySelectorAll('.done-export .btn-export')
  if (doneExportBtns[0]) doneExportBtns[0].addEventListener('click', window.copyMarkdown)
  if (doneExportBtns[1]) doneExportBtns[1].addEventListener('click', window.resetAll)

  // ==================== Help ====================
  document.querySelector('.help-close')?.addEventListener('click', window.closeHelp)
  document.getElementById('btnMic')?.addEventListener('click', window.toggleVoice)
  document.getElementById('btnRun')?.addEventListener('click', window.sendHelp)
  document.getElementById('helpInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.sendHelp()
  })
  document.getElementById('helpInput')?.addEventListener('input', window.updateRunBtn)

  // ==================== Modals ====================
  document.querySelector('#historyPanel .modal-close')?.addEventListener('click', () => window.closeProtocolPanel('historyPanel'))
  document.querySelector('#settingsPanel .modal-close')?.addEventListener('click', () => window.closeProtocolPanel('settingsPanel'))

  // ==================== Settings Segmented ====================
  document.querySelectorAll('#protocolStrengthSeg button').forEach(btn => {
    const strength = btn.dataset.strength
    if (strength) btn.addEventListener('click', () => window.setProtocolStrength(strength))
  })
  document.querySelectorAll('#timePreferenceSeg button').forEach(btn => {
    const time = btn.dataset.time
    if (time) btn.addEventListener('click', () => window.setTimePreference(time))
  })
  document.querySelectorAll('#outputModeSeg button').forEach(btn => {
    const output = btn.dataset.output
    if (output) btn.addEventListener('click', () => window.setOutputMode(output))
  })
  document.getElementById('btnResetLocalCache')?.addEventListener('click', window.resetLocalCache)

  // ==================== History ====================
  document.querySelector('#historyPanel .btn-export')?.addEventListener('click', window.clearHistory)
}
