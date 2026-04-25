import { ref } from 'vue'

export function useHaptics() {
  const isSupported = ref(typeof navigator !== 'undefined' && 'vibrate' in navigator)

  function vibrate(pattern: number | number[] = 50) {
    if (!isSupported.value) return
    try {
      navigator.vibrate(pattern)
    } catch {
      // Ignore errors
    }
  }

  // Predefined patterns
  function light() {
    vibrate(10)
  }

  function medium() {
    vibrate(50)
  }

  function heavy() {
    vibrate([50, 50, 50])
  }

  function success() {
    vibrate([30, 50, 30])
  }

  function error() {
    vibrate([100, 50, 100])
  }

  function start() {
    vibrate([20, 30, 20])
  }

  function stop() {
    vibrate([40, 20, 40])
  }

  return {
    isSupported,
    vibrate,
    light,
    medium,
    heavy,
    success,
    error,
    start,
    stop,
  }
}
