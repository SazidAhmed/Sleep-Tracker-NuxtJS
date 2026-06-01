import { useLocalStorage, createGlobalState } from '@vueuse/core'
import {
  generateAutoBackup,
  CURRENT_DATA_VERSION,
  type SleepSession,
  type SleepSettings,
} from '@/lib/sleep'
import { useSleepData } from './useSleepData'

function _useSleepBackup() {
  const sleepData = useSleepData()
  const { settings, sessions, todayKey, importBackup: originalImportBackup } = sleepData

  function exportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: CURRENT_DATA_VERSION,
      settings: settings.value,
      sessions: sessions.value,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sleep-tracker-backup-${todayKey.value}.json`
    link.click()
    URL.revokeObjectURL(url)
    return { success: true }
  }

  function importBackup(data: any, mode: 'merge' | 'replace' = 'merge') {
    return originalImportBackup(data, mode)
  }

  const lastBackupDate = useLocalStorage<string>('sleep-tracker-last-backup', '')

  function maybeAutoBackup() {
    const today = todayKey.value
    if (lastBackupDate.value !== today && sessions.value.length > 0) {
      const dayOfWeek = new Date().getDay()
      if (dayOfWeek === 0) {
        generateAutoBackup(sessions.value, settings.value)
        lastBackupDate.value = today
      }
    }
  }

  return {
    exportBackup,
    importBackup,
    maybeAutoBackup,
  }
}

export const useSleepBackup = createGlobalState(_useSleepBackup)
