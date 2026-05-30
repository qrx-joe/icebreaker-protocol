export function bindEvents() {
  // ==================== Header ====================
  const headerBtns = document.querySelectorAll('.protocol-actions button')
  if (headerBtns[0]) headerBtns[0].addEventListener('click', openHistoryPanel)
  if (headerBtns[1]) headerBtns[1].addEventListener('click', openSettingsPanel)

  // ==================== Landing ====================
  document.getElementById('landingMic')?.addEventListener('click', toggleLandingVoice)
  document.querySelector('.landing-start')?.addEventListener('click', startProtocol)
  document.getElementById('landingInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startProtocol()
  })

  // ==================== Contract ====================
  document.querySelector('.contract-actions .btn-primary')?.addEventListener('click', acceptContract)
  document.querySelector('.contract-actions .btn-secondary')?.addEventListener('click', questionContract)

  // ==================== Roadmap ====================
  document.querySelector('#roadmapActions .btn-primary')?.addEventListener('click', () => goToStep(0))
  document.getElementById('btnConfirmImprove')?.addEventListener('click', confirmImprovement)
  document.querySelector('#roadmapImproveActions .btn-secondary')?.addEventListener('click', skipImprovement)

  // ==================== Step ====================
  document.getElementById('attachmentInput')?.addEventListener('change', (e) => {
    handleAttachmentUpload(e.target.files)
    e.target.value = ''
  })
  document.getElementById('attachmentBtn')?.addEventListener('click', () => {
    document.getElementById('attachmentInput').click()
  })
  document.getElementById('pillMic')?.addEventListener('click', toggleMainVoice)
  document.getElementById('pillHelp')?.addEventListener('click', openHelp)
  document.getElementById('btnPrev')?.addEventListener('click', prevStep)
  document.querySelector('.step-footer-right .btn-primary')?.addEventListener('click', finishStep)

  // ==================== Done ====================
  document.getElementById('btnArchive')?.addEventListener('click', archiveAndReset)
  document.getElementById('btnExportMain')?.addEventListener('click', goToReview)
  document.getElementById('btnImprove')?.addEventListener('click', startImprovement)
  const doneExportBtns = document.querySelectorAll('.done-export .btn-export')
  if (doneExportBtns[0]) doneExportBtns[0].addEventListener('click', copyMarkdown)
  if (doneExportBtns[1]) doneExportBtns[1].addEventListener('click', resetAll)

  // ==================== Help ====================
  document.querySelector('.help-close')?.addEventListener('click', closeHelp)
  document.getElementById('btnMic')?.addEventListener('click', toggleVoice)
  document.getElementById('btnRun')?.addEventListener('click', sendHelp)
  document.getElementById('helpInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendHelp()
  })
  document.getElementById('helpInput')?.addEventListener('input', updateRunBtn)

  // ==================== Modals ====================
  document.querySelector('#historyPanel .modal-close')?.addEventListener('click', () => closeProtocolPanel('historyPanel'))
  document.querySelector('#settingsPanel .modal-close')?.addEventListener('click', () => closeProtocolPanel('settingsPanel'))

  // ==================== Settings Segmented ====================
  document.querySelectorAll('#protocolStrengthSeg button').forEach(btn => {
    const strength = btn.dataset.strength
    if (strength) btn.addEventListener('click', () => setProtocolStrength(strength))
  })
  document.querySelectorAll('#timePreferenceSeg button').forEach(btn => {
    const time = btn.dataset.time
    if (time) btn.addEventListener('click', () => setTimePreference(time))
  })
  document.querySelectorAll('#outputModeSeg button').forEach(btn => {
    const output = btn.dataset.output
    if (output) btn.addEventListener('click', () => setOutputMode(output))
  })

  // ==================== History ====================
  document.querySelector('#historyPanel .btn-export')?.addEventListener('click', clearHistory)
}
