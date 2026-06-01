import DOMPurify from 'dompurify'
import { setupApiWrapper } from './api-client.js'
import './protocol-ui.css'
import './style.css'
import './review.css'
import './state.js'
import './ui.js'
import './utils.js'
import './notify.js'
import './attachments.js'
import './timer.js'
import './inactivity.js'
import './speech.js'
import './api.js'
import './help.js'
import './landing.js'
import './contract.js'
import './roadmap.js'
import './steps.js'
import './done.js'
import './review.js'
import './settings.js'
import './history.js'
import { initApp } from './init.js'
import { bindEvents } from './event-bindings.js'

// 一次性清理旧版 Service Worker 缓存（v2.0.1 修复 SW 缓存死锁）
;(async function purgeStaleSW() {
  if (!('serviceWorker' in navigator) || !('caches' in window)) return
  // 检测是否存在旧版 CSS（index-WbouPhS_.css 已不存在于新构建中）
  const cacheNames = await caches.keys()
  for (const name of cacheNames) {
    const cache = await caches.open(name)
    const keys = await cache.keys()
    const hasStaleAsset = keys.some(r => r.url.includes('index-WbouPhS_') || r.url.includes('index-oQZDxFjr'))
    if (hasStaleAsset) {
      console.log('[icebreaker] 检测到旧版缓存，正在清理...')
      await caches.delete(name)
      // 注销旧 SW，让新 SW 在下次刷新时接管
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const reg of regs) { await reg.unregister() }
      // 强制刷新一次让新 SW 生效
      window.location.reload()
      return
    }
  }
})()

window.DOMPurify = DOMPurify
setupApiWrapper()
initApp()
window.addEventListener('DOMContentLoaded', bindEvents)
