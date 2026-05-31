import { useLocalStorage, useTimestamp } from '@vueuse/core'
import type { SleepSession, SleepSettings } from '@/lib/sleep'

type CloudSyncProvider = 'local-vault' | 'custom-endpoint'
type CloudSyncStatus = 'idle' | 'syncing' | 'success' | 'error'
type CloudSyncDirection = 'push' | 'pull'

interface CloudSyncConfig {
  enabled: boolean
  provider: CloudSyncProvider
  endpoint: string
  accessToken: string
  autoSync: boolean
  lastSyncAt: string
  lastPulledAt: string
  lastPushedAt: string
}

interface CloudSyncSnapshot {
  version: 1
  exportedAt: string
  settings: SleepSettings
  sessions: SleepSession[]
}

const defaultConfig: CloudSyncConfig = {
  enabled: false,
  provider: 'local-vault',
  endpoint: '',
  accessToken: '',
  autoSync: false,
  lastSyncAt: '',
  lastPulledAt: '',
  lastPushedAt: '',
}

export function useCloudSync() {
  const config = useLocalStorage<CloudSyncConfig>('sleep-tracker-cloud-sync-config', defaultConfig)
  const localVaultSnapshot = useLocalStorage<CloudSyncSnapshot | null>('sleep-tracker-cloud-sync-local-vault', null)
  const status = ref<CloudSyncStatus>('idle')
  const error = ref('')
  const now = useTimestamp({ interval: 60_000 })

  const isConfigured = computed(() =>
    config.value.provider === 'local-vault'
      ? true
      : config.value.endpoint.trim().length > 0,
  )

  const syncAgeLabel = computed(() => {
    if (!config.value.lastSyncAt) return 'Never synced'
    const lastSync = new Date(config.value.lastSyncAt).getTime()
    if (!Number.isFinite(lastSync)) return 'Never synced'
    const diffMinutes = Math.max(0, Math.round((now.value - lastSync) / 60_000))
    if (diffMinutes < 1) return 'Synced just now'
    if (diffMinutes < 60) return `Synced ${diffMinutes}m ago`
    const diffHours = Math.round(diffMinutes / 60)
    if (diffHours < 24) return `Synced ${diffHours}h ago`
    return `Synced ${Math.round(diffHours / 24)}d ago`
  })

  function createSnapshot(settings: SleepSettings, sessions: SleepSession[]): CloudSyncSnapshot {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      sessions,
    }
  }

  async function pushSnapshot(snapshot: CloudSyncSnapshot) {
    if (config.value.provider === 'local-vault') {
      localVaultSnapshot.value = snapshot
      return
    }

    const response = await fetch(config.value.endpoint, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        ...(config.value.accessToken ? { authorization: `Bearer ${config.value.accessToken}` } : {}),
      },
      body: JSON.stringify(snapshot),
    })

    if (!response.ok) throw new Error(`Sync push failed (${response.status})`)
  }

  async function pullSnapshot() {
    if (config.value.provider === 'local-vault') {
      return localVaultSnapshot.value
    }

    const response = await fetch(config.value.endpoint, {
      headers: {
        accept: 'application/json',
        ...(config.value.accessToken ? { authorization: `Bearer ${config.value.accessToken}` } : {}),
      },
    })

    if (!response.ok) throw new Error(`Sync pull failed (${response.status})`)
    return await response.json() as CloudSyncSnapshot
  }

  async function syncNow(
    direction: CloudSyncDirection,
    settings: SleepSettings,
    sessions: SleepSession[],
  ) {
    error.value = ''
    if (!config.value.enabled) {
      error.value = 'Cloud sync is turned off.'
      return { error: error.value }
    }
    if (!isConfigured.value) {
      error.value = 'Add a sync endpoint before syncing.'
      return { error: error.value }
    }

    status.value = 'syncing'

    try {
      if (direction === 'push') {
        await pushSnapshot(createSnapshot(settings, sessions))
        config.value.lastPushedAt = new Date().toISOString()
      } else {
        const snapshot = await pullSnapshot()
        if (!snapshot || !Array.isArray(snapshot.sessions) || !snapshot.settings) {
          throw new Error('No valid cloud snapshot found.')
        }
        config.value.lastPulledAt = new Date().toISOString()
        config.value.lastSyncAt = new Date().toISOString()
        status.value = 'success'
        return { success: true, snapshot }
      }

      config.value.lastSyncAt = new Date().toISOString()
      status.value = 'success'
      return { success: true }
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Cloud sync failed.'
      return { error: error.value }
    }
  }

  return {
    config,
    status,
    error,
    isConfigured,
    syncAgeLabel,
    localVaultSnapshot,
    syncNow,
  }
}
