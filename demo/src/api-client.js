// API client wrapper with loading state and retry logic

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const REQUEST_TIMEOUT_MS = 15000

// Capture original fetch BEFORE setupApiWrapper() mutates window.fetch.
// fetchWithTimeout MUST use the real fetch, not the wrapped one, to avoid infinite recursion.
const _originalFetch = window.fetch

function showLoading() {
  let el = document.getElementById('api-loading-overlay')
  if (!el) {
    el = document.createElement('div')
    el.id = 'api-loading-overlay'
    el.innerHTML = `
      <div class="api-loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-text">协议处理中...</div>
      </div>
    `
    document.body.appendChild(el)
  }
  el.classList.add('active')
}

export function clearApiLoading() {
  const el = document.getElementById('api-loading-overlay')
  if (el) el.classList.remove('active')
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await _originalFetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
  let lastError

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options, REQUEST_TIMEOUT_MS)

      // If response is not ok but it's a server error (5xx), retry
      if (!response.ok && response.status >= 500 && i < retries - 1) {
        await delay(RETRY_DELAY_MS * Math.pow(2, i)) // exponential backoff
        continue
      }

      return response
    } catch (err) {
      lastError = err
      // Don't retry on abort (timeout) or if it's the last attempt
      if (err.name === 'AbortError' || i >= retries - 1) {
        break
      }
      await delay(RETRY_DELAY_MS * Math.pow(2, i))
    }
  }

  throw lastError
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function setupApiWrapper() {
  const originalFetch = window.fetch

  window.fetch = async function (url, options) {
    const isApiCall = typeof url === 'string' && url.startsWith('/api/')

    if (!isApiCall) {
      return originalFetch(url, options)
    }

    showLoading()
    try {
      const response = await fetchWithRetry(url, options)
      return response
    } catch (err) {
      // Show user-friendly error
      const warningEl = document.getElementById('stepWarning') || document.getElementById('doneAiMsg')
      if (warningEl) {
        warningEl.style.color = '#f87171'
        if (err.name === 'AbortError') {
          warningEl.textContent = '[Protocol]: 请求超时。服务器响应过慢，请稍后重试。'
        } else {
          warningEl.textContent = '[Protocol]: 网络请求失败。请检查网络连接后重试。'
        }
      }
      throw err
    } finally {
      clearApiLoading()
    }
  }

  window.addEventListener('pageshow', clearApiLoading)
}

window.clearApiLoading = clearApiLoading
