import { useSleepData } from '@/composables/useSleepData'

export function useSleepTimer() {
  const sleepData = useSleepData()

  return {
    activeSessionStart: sleepData.activeSessionStart,
    activeSessionMinutes: sleepData.activeSessionMinutes,
    startSleepNow: sleepData.startSleepNow,
    stopSleepNow: sleepData.stopSleepNow,
    cancelActiveSleep: sleepData.cancelActiveSleep,
    recoverSession: sleepData.recoverSession,
    interruptedSession: sleepData.interruptedSession,
    refreshNow: sleepData.refreshNow,
  }
}
