import { useLocalStorage } from '@vueuse/core'

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const canInstall = ref(false)
  const isInstalled = ref(false)
  const dismissedAt = useLocalStorage<number>('pwa-install-dismissed', 0)
  const installDismissed = computed(() => {
    // Dismiss for 7 days
    const weekMs = 7 * 24 * 60 * 60 * 1000
    return Date.now() - dismissedAt.value < weekMs
  })

  onMounted(() => {
    // Check if already installed (standalone mode)
    if (import.meta.client) {
      isInstalled.value = window.matchMedia('(display-mode: standalone)').matches
        || (navigator as any).standalone === true

      // Listen for beforeinstallprompt
      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault()
        deferredPrompt.value = e as BeforeInstallPromptEvent
        canInstall.value = true
      })

      // Listen for appinstalled
      window.addEventListener('appinstalled', () => {
        deferredPrompt.value = null
        canInstall.value = false
        isInstalled.value = true
        dismissedAt.value = 0 // Reset dismissal
      })
    }
  })

  async function promptInstall() {
    if (!deferredPrompt.value) return

    deferredPrompt.value.prompt()

    const { outcome } = await deferredPrompt.value.userChoice

    if (outcome === 'accepted') {
      deferredPrompt.value = null
      canInstall.value = false
    }
  }

  function dismiss() {
    dismissedAt.value = Date.now()
  }

  return {
    canInstall: computed(() => canInstall.value && !isInstalled.value && !installDismissed.value),
    isInstalled,
    promptInstall,
    dismiss,
  }
}
