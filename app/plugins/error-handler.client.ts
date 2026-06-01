/**
 * Global Vue error handler — catches silent failures from Web Audio API,
 * Notification API, localStorage quota limits, and unhandled component errors.
 *
 * Errors are logged to the console. In development, they are surfaced visually.
 * This plugin runs client-side only.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    // Always log to console for debugging
    console.error('[Sleep Tracker] Vue error:', error, '\nComponent info:', info)

    // Identify error categories for better messaging
    const message = error instanceof Error ? error.message : String(error)
    const isQuotaError = message.toLowerCase().includes('quota')
    const isNotificationError = message.toLowerCase().includes('notification')
    const isAudioError = message.toLowerCase().includes('audio') || message.toLowerCase().includes('audiocontext')

    // Show a non-blocking toast for quota errors (user-actionable)
    if (isQuotaError) {
      showToast('Storage is full. Please export a backup and clear some data.', 'warning')
    } else if (isNotificationError) {
      // Notification failures are usually permission-related — not critical to surface
      console.warn('[Sleep Tracker] Notification error (likely permission denied):', message)
    } else if (isAudioError) {
      console.warn('[Sleep Tracker] Web Audio error:', message)
    } else if (import.meta.dev) {
      // In dev, surface all unexpected errors as a toast
      showToast(`Error: ${message.slice(0, 80)}`, 'error')
    }
  }

  // Handle unhandled promise rejections from async ops (Web Audio, fetch, etc.)
  if (import.meta.client) {
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason instanceof Error ? event.reason.message : String(event.reason)
      console.error('[Sleep Tracker] Unhandled rejection:', event.reason)

      if (message.toLowerCase().includes('quota')) {
        showToast('Storage is full. Export a backup to free space.', 'warning')
        event.preventDefault()
      }
    })
  }
})

/**
 * Lightweight toast utility — injects a self-removing DOM element.
 * No dependency on any UI library.
 */
function showToast(message: string, type: 'error' | 'warning' = 'error') {
  if (!import.meta.client) return

  const toast = document.createElement('div')
  const bgColor = type === 'warning' ? '#d97706' : '#dc2626'
  toast.style.cssText = `
    position: fixed; bottom: 5.5rem; left: 50%; transform: translateX(-50%);
    background: ${bgColor}; color: white;
    padding: 0.65rem 1.1rem; border-radius: 1rem;
    font-size: 0.8rem; font-family: inherit; line-height: 1.4;
    max-width: calc(100vw - 2rem); text-align: center;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25); z-index: 9999;
    animation: sleepToastIn 0.2s ease;
  `

  // Add keyframes if not already present
  if (!document.getElementById('sleep-toast-style')) {
    const style = document.createElement('style')
    style.id = 'sleep-toast-style'
    style.textContent = `
      @keyframes sleepToastIn { from { opacity:0; transform:translateX(-50%) translateY(8px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
    `
    document.head.appendChild(style)
  }

  toast.textContent = message
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 4000)
}
