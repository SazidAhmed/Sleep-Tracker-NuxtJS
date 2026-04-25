import { ref, onMounted, onUnmounted, type Ref } from 'vue'

interface SwipeOptions {
  threshold?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export function useSwipe(elementRef: Ref<HTMLElement | null>, options: SwipeOptions) {
  const threshold = options.threshold ?? 50
  const startX = ref(0)
  const startY = ref(0)
  const isDragging = ref(false)

  function handleTouchStart(e: TouchEvent) {
    startX.value = e.touches[0]!.clientX
    startY.value = e.touches[0]!.clientY
    isDragging.value = true
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging.value) return
    e.preventDefault()
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!isDragging.value) return
    isDragging.value = false

    const endX = e.changedTouches[0]!.clientX
    const endY = e.changedTouches[0]!.clientY

    const diffX = endX - startX.value
    const diffY = endY - startY.value

    // Determine if horizontal or vertical swipe
    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          options.onSwipeRight?.()
        } else {
          options.onSwipeLeft?.()
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(diffY) > threshold) {
        if (diffY > 0) {
          options.onSwipeDown?.()
        } else {
          options.onSwipeUp?.()
        }
      }
    }
  }

  // Mouse events for desktop testing
  function handleMouseDown(e: MouseEvent) {
    startX.value = e.clientX
    startY.value = e.clientY
    isDragging.value = true
  }

  function handleMouseUp(e: MouseEvent) {
    if (!isDragging.value) return
    isDragging.value = false

    const diffX = e.clientX - startX.value
    const diffY = e.clientY - startY.value

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > threshold) {
        if (diffX > 0) {
          options.onSwipeRight?.()
        } else {
          options.onSwipeLeft?.()
        }
      }
    } else {
      if (Math.abs(diffY) > threshold) {
        if (diffY > 0) {
          options.onSwipeDown?.()
        } else {
          options.onSwipeUp?.()
        }
      }
    }
  }

  onMounted(() => {
    const el = elementRef.value
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
  })

  onUnmounted(() => {
    const el = elementRef.value
    if (!el) return

    el.removeEventListener('touchstart', handleTouchStart)
    el.removeEventListener('touchmove', handleTouchMove)
    el.removeEventListener('touchend', handleTouchEnd)
    el.removeEventListener('mousedown', handleMouseDown)
    window.removeEventListener('mouseup', handleMouseUp)
  })
}

// Composable for swipe-to-delete on individual items
export function useSwipeToDelete(
  elementRef: Ref<HTMLElement | null>,
  onDelete: () => void,
  threshold = 100,
) {
  const translateX = ref(0)
  const isSwiping = ref(false)
  const startX = ref(0)
  const currentX = ref(0)

  function handleTouchStart(e: TouchEvent) {
    startX.value = e.touches[0]!.clientX
    currentX.value = startX.value
    isSwiping.value = true
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isSwiping.value) return
    currentX.value = e.touches[0]!.clientX
    const diff = currentX.value - startX.value
    // Only allow left swipe (negative diff)
    if (diff < 0) {
      translateX.value = Math.max(diff, -200)
    }
  }

  function handleTouchEnd() {
    if (!isSwiping.value) return
    isSwiping.value = false
    const diff = currentX.value - startX.value

    if (diff < -threshold) {
      // Swiped far enough - trigger delete
      translateX.value = -100
      setTimeout(() => {
        onDelete()
        translateX.value = 0
      }, 200)
    } else {
      // Snap back
      translateX.value = 0
    }
  }

  onMounted(() => {
    const el = elementRef.value
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd)
  })

  onUnmounted(() => {
    const el = elementRef.value
    if (!el) return

    el.removeEventListener('touchstart', handleTouchStart)
    el.removeEventListener('touchmove', handleTouchMove)
    el.removeEventListener('touchend', handleTouchEnd)
  })

  return { translateX, isSwiping }
}
