import { useSleepData } from '@/composables/useSleepData'

export function useSleepAlarm() {
  const sleepData = useSleepData()

  return {
    alarmConfig: sleepData.alarmConfig,
    isAlarmFiring: sleepData.isAlarmFiring,
    alarmFiringType: sleepData.alarmFiringType,
    smartAlarmWakeTime: sleepData.smartAlarmWakeTime,
    dismissAlarm: sleepData.dismissAlarm,
    snoozeAlarm: sleepData.snoozeAlarm,
    setAlarmEnabled: sleepData.setAlarmEnabled,
    setAlarmTime: sleepData.setAlarmTime,
    setAlarmType: sleepData.setAlarmType,
  }
}
