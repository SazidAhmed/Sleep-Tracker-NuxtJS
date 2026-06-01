import { nextTick } from 'vue'

export interface KeyboardNavOptions {
  selector: string
  loop?: boolean
}

/**
 * Composable to handle arrow key navigation for button groups (e.g. quality ratings, tags)
 */
export function useKeyboardNav() {
  function handleGroupKeydown(
    e: KeyboardEvent,
    currentValue: any,
    options: KeyboardNavOptions,
    onSelect: (val: any) => void
  ) {
    const buttons = document.querySelectorAll<HTMLButtonElement>(options.selector)
    if (!buttons.length) return

    const currentIndex = Array.from(buttons).findIndex(b => 
      b.getAttribute('aria-checked') === 'true' || b === document.activeElement
    )
    
    let nextIndex = currentIndex

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = currentIndex === -1 ? 0 : currentIndex + 1
      if (options.loop && nextIndex >= buttons.length) nextIndex = 0
      else nextIndex = Math.min(nextIndex, buttons.length - 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = currentIndex === -1 ? buttons.length - 1 : currentIndex - 1
      if (options.loop && nextIndex < 0) nextIndex = buttons.length - 1
      else nextIndex = Math.max(nextIndex, 0)
    } else {
      return // Not an arrow key
    }

    e.preventDefault()
    const targetButton = buttons[nextIndex]
    if (targetButton) {
      targetButton.focus()
      // We don't necessarily select on focus, but we can if the user wants
      // For radio-like behavior, selecting on arrow keys is standard
      const value = targetButton.getAttribute('data-value')
      if (value !== null) {
        onSelect(isNaN(Number(value)) ? value : Number(value))
      }
    }
  }

  return {
    handleGroupKeydown
  }
}
