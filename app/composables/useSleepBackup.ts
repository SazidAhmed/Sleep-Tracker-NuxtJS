import { useSleepData } from '@/composables/useSleepData'

export function useSleepBackup() {
  const sleepData = useSleepData()

  return {
    exportBackup: sleepData.exportBackup,
    importBackup: sleepData.importBackup,
    exportCSV: sleepData.exportCSV,
    generateAutoBackup: sleepData.generateAutoBackup,
    validateData: sleepData.validateData,
  }
}
