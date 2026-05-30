import { escapeHtml } from './utils.js'

// ==================== Toast & Modal ====================
// 替换原生 alert/confirm，提供统一的 UI 反馈

// ---------- Toast ----------
export function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    container.style.cssText = `
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    `
    document.body.appendChild(container)
  }

  const toast = document.createElement('div')
  const colors = {
    info:    { bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.35)', text: '#e0f2fe', icon: 'ℹ️' },
    success: { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.35)', text: '#d1fae5', icon: '✓' },
    warning: { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.35)', text: '#fef3c7', icon: '⚠️' },
    error:   { bg: 'rgba(251,113,133,0.15)', border: 'rgba(251,113,133,0.35)', text: '#ffe4e6', icon: '✕' },
  }
  const c = colors[type] || colors.info

  toast.style.cssText = `
    padding: 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid ${c.border};
    background: ${c.bg};
    color: ${c.text};
    font-size: 0.9rem;
    font-weight: 500;
    backdrop-filter: blur(8px);
    transform: translateX(120%);
    transition: transform 0.3s ease;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 320px;
    word-break: break-word;
  `
  toast.innerHTML = `<span>${c.icon}</span><span>${escapeHtml(message)}</span>`

  container.appendChild(toast)

  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)'
  })

  setTimeout(() => {
    toast.style.transform = 'translateX(120%)'
    setTimeout(() => toast.remove(), 300)
  }, duration)
}

// ---------- Modal ----------
let modalResolve = null
let modalReject = null

function createModal() {
  let el = document.getElementById('protocol-modal')
  if (el) return el

  el = document.createElement('div')
  el.id = 'protocol-modal'
  el.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9998;
    display: none;
    align-items: center;
    justify-content: center;
    background: rgba(10,10,15,0.72);
    backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 0.2s ease;
  `
  el.innerHTML = `
    <div class="modal-box" style="
      width: min(420px, calc(100vw - 2rem));
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid rgba(148,163,184,0.12);
      background: rgba(13,18,29,0.92);
      box-shadow: 0 24px 80px rgba(0,0,0,0.5);
      transform: scale(0.96);
      transition: transform 0.2s ease;
    ">
      <div id="modal-title" style="font-size: 1.1rem; font-weight: 700; color: #f1f5f9; margin-bottom: 0.75rem;"></div>
      <div id="modal-body" style="font-size: 0.95rem; color: rgba(199,210,224,0.85); line-height: 1.6; margin-bottom: 1.25rem; white-space: pre-wrap;"></div>
      <div id="modal-actions" style="display: flex; gap: 0.6rem; justify-content: flex-end;"></div>
    </div>
  `
  document.body.appendChild(el)

  el.addEventListener('click', (e) => {
    if (e.target === el) closeModal(false)
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.style.display === 'flex') {
      closeModal(false)
    }
  })

  return el
}

export function showModal({ title, body, confirmText = '确认', cancelText = '取消', showCancel = true }) {
  return new Promise((resolve) => {
    modalResolve = resolve
    const el = createModal()
    const box = el.querySelector('.modal-box')

    el.querySelector('#modal-title').textContent = title
    el.querySelector('#modal-body').textContent = body

    const actions = el.querySelector('#modal-actions')
    actions.innerHTML = ''

    if (showCancel) {
      const cancelBtn = document.createElement('button')
      cancelBtn.textContent = cancelText
      cancelBtn.style.cssText = btnStyle('secondary')
      cancelBtn.onclick = () => closeModal(false)
      actions.appendChild(cancelBtn)
    }

    const confirmBtn = document.createElement('button')
    confirmBtn.textContent = confirmText
    confirmBtn.style.cssText = btnStyle('primary')
    confirmBtn.onclick = () => closeModal(true)
    actions.appendChild(confirmBtn)

    el.style.display = 'flex'
    requestAnimationFrame(() => {
      el.style.opacity = '1'
      box.style.transform = 'scale(1)'
    })
  })
}

export function closeModal(result) {
  const el = document.getElementById('protocol-modal')
  if (!el) return
  const box = el.querySelector('.modal-box')
  el.style.opacity = '0'
  box.style.transform = 'scale(0.96)'
  setTimeout(() => {
    el.style.display = 'none'
    if (modalResolve) {
      modalResolve(result)
      modalResolve = null
    }
  }, 200)
}

function btnStyle(variant) {
  const base = `
    padding: 0.55rem 1.1rem;
    border-radius: 8px;
    font: inherit;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid;
    transition: all 0.15s ease;
  `
  if (variant === 'primary') {
    return base + `
      background: linear-gradient(135deg, #38bdf8, #5b6df5);
      border-color: transparent;
      color: white;
    `
  }
  return base + `
    background: rgba(255,255,255,0.05);
    border-color: rgba(148,163,184,0.15);
    color: rgba(226,232,240,0.8);
  `
}

// ---------- Global Error Handler ----------
export function setupGlobalErrorHandler() {
  window.addEventListener('error', (e) => {
    console.error('[Global Error]', e.error)
    showToast('发生了一个意外错误，请刷新页面重试。', 'error', 5000)
  })

  window.addEventListener('unhandledrejection', (e) => {
    console.error('[Unhandled Rejection]', e.reason)
    showToast('请求处理失败，请检查网络后重试。', 'error', 5000)
  })

  // 网络状态监听
  let wasOffline = false
  window.addEventListener('online', () => {
    if (wasOffline) {
      showToast('网络已恢复', 'success', 3000)
      wasOffline = false
    }
  })
  window.addEventListener('offline', () => {
    showToast('网络已断开，部分功能可能不可用', 'warning', 5000)
    wasOffline = true
  })
}

// Legacy bridge
window.showToast = showToast;
window.showModal = showModal;
window.closeModal = closeModal;
window.setupGlobalErrorHandler = setupGlobalErrorHandler;
