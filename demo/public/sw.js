const CACHE_NAME = 'icebreaker-protocol-v3'
const STATIC_ASSETS = [
  './',
  './index.html',
  './bundle.js',
  './protocol-ui.css',
  './icon.svg',
  './manifest.json'
]

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch: navigation network-first, static stale-while-revalidate, API network-first
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // API requests: network first, fallback to offline response
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'offline', message: '当前处于离线状态，请连接网络后重试。' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      })
    )
    return
  }

  // Navigation requests: network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update cache with fresh HTML
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone)
          })
          return response
        })
        .catch(() => {
          return caches.match('./index.html').then((cached) => {
            if (cached) return cached
            return new Response('Offline', { status: 503 })
          })
        })
    )
    return
  }

  // Static assets: stale-while-revalidate (return cached immediately, update in background)
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone)
            })
          }
          return response
        })
        .catch(() => cached)

      return cached || fetchPromise
    })
  )
})
