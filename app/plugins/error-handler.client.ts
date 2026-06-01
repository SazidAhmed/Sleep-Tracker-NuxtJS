export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
    // Log to console in development
    if (import.meta.dev) {
      console.error('Global Vue Error:', err)
      console.error('Instance:', instance)
      console.error('Info:', info)
    }

    // In a real production app, we would send this to Sentry/LogRocket/etc.
    // Example: sendToErrorTracking({ error: err, context: info })

    // Optional: Show a toast or notification if it's a critical error
    // Some errors like "ResizeObserver loop limit exceeded" are safe to ignore
    if (err instanceof Error && err.message.includes('ResizeObserver')) {
      return
    }
  }

  // Catch unhandled promise rejections
  if (import.meta.client) {
    window.addEventListener('unhandledrejection', (event) => {
      if (import.meta.dev) {
        console.error('Unhandled Promise Rejection:', event.reason)
      }
    })
  }
})
