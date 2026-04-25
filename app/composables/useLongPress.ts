import { ref, onMounted, onUnmounted, type Ref } from 'vue'

interface LongPressOptions {
  duration?: number
  onLongPress: () => void
  onClick?: () => void
}

export function useLongPress(elementRef: Ref<HTMLElement | null>, options: LongPressOptions) {
  const duration = options.duration ?? 500
  const isPressing = ref(false)
  const timer = ref<ReturnType<typeof setTimeout> | null>(null)
  const hasTriggered = ref(false)

  function startPress(e: TouchEvent | MouseEvent) {
    isPressing.value = true
    hasTriggered.value = false

    timer.value = setTimeout(() => {
      hasTriggered.value = true
      isPressing.value = false
      options.onLongPress()
    }, duration)
  }

  function endPress(e: TouchEvent | MouseEvent) {
    if (timer.value) {
      clearTimeout(timer.value)
      timer.value = null
    }

    if (isPressing.value && !hasTriggered.value) {
      // It was a short press (click)
      options.onClick?.()
    }

    isPressing.value = false
  }

  function cancelPress() {
    if (timer.value) {
      clearTimeout(timer.value)
      timer.value = null
    }
    isPressing.value = false
    hasTriggered.value = false
  }

  onMounted(() => {
    const el = elementRef.value
    if (!el) return

    el.addEventListener('touchstart', startPress, { passive: true })
    el.addEventListener('touchend', endPress)
    el.addEventListener('touchcancel', cancelPress)
    el.addEventListener('mousedown', startPress)
    el.addEventListener('mouseup', endPress)
    el.addEventListener('mouseleave', cancelPress)
  })

  onUnmounted(() => {
    const el = elementRef.value
    if (!el) return

    el.removeEventListener('touchstart', startPress)
    el.removeEventListener('touchend', endPress)
    el.removeEventListener('touchcancel', cancelPress)
    el.removeEventListener('mousedown', startPress)
    el.removeEventListener('mouseup', endPress)
    el.removeEventListener('mouseleave', cancelPress)
  })

  return { isPressing }
}
