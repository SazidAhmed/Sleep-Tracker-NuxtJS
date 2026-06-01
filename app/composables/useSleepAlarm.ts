import { useLocalStorage, createGlobalState } from '@vueuse/core'
import { ref, computed } from 'vue'
import {
  calculateSmartAlarmTime,
  type AlarmConfig,
  type AlarmType,
} from '@/lib/sleep'

function _useSleepAlarm() {
  const activeSessionStart = useLocalStorage<string | null>('sleep-tracker-active-session-start', null)
  const alarmConfig = useLocalStorage<AlarmConfig>('sleep-tracker-alarm-config', {
    enabled: false,
    time: '06:00',
    type: 'sound',
    soundEnabled: true,
    smartWindowMinutes: 30,
    snoozeMinutes: 5,
    snoozeCount: 0,
    lastTriggeredDate: '',
    lastSnoozedAt: null,
  })

  const isAlarmFiring = ref(false)
  const alarmFiringType = ref<AlarmType | null>(null)

  const smartAlarmWakeTime = computed(() => {
    if (!activeSessionStart.value || alarmConfig.value.type !== 'smart') return null
    return calculateSmartAlarmTime(
      new Date(activeSessionStart.value),
      alarmConfig.value.time,
      alarmConfig.value.smartWindowMinutes,
    )
  })

  function dismissAlarm() {
    isAlarmFiring.value = false
    alarmFiringType.value = null
    alarmConfig.value.lastSnoozedAt = null
    alarmConfig.value.snoozeCount = 0
  }

  function snoozeAlarm() {
    alarmConfig.value.lastSnoozedAt = new Date().toISOString()
    alarmConfig.value.snoozeCount++
    isAlarmFiring.value = false
    alarmFiringType.value = null
  }

  function setAlarmEnabled(enabled: boolean) {
    alarmConfig.value.enabled = enabled
    if (!enabled) {
      isAlarmFiring.value = false
      alarmFiringType.value = null
      alarmConfig.value.lastSnoozedAt = null
      alarmConfig.value.snoozeCount = 0
    }
  }

  function setAlarmTime(time: string) {
    alarmConfig.value.time = time
    alarmConfig.value.lastTriggeredDate = ''
    alarmConfig.value.lastSnoozedAt = null
  }

  function setAlarmType(type: AlarmType) {
    alarmConfig.value.type = type
    alarmConfig.value.lastTriggeredDate = ''
    alarmConfig.value.lastSnoozedAt = null
  }

  return {
    alarmConfig,
    isAlarmFiring,
    alarmFiringType,
    smartAlarmWakeTime,
    dismissAlarm,
    snoozeAlarm,
    setAlarmEnabled,
    setAlarmTime,
    setAlarmType,
  }
}

export const useSleepAlarm = createGlobalState(_useSleepAlarm)
