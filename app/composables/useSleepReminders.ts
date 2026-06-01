import { useLocalStorage, createGlobalState } from '@vueuse/core'
import { ref, computed } from 'vue'
import {
  summarizeSleepDay,
  addDays,
  formatDurationFromMinutes,
  type SleepSession,
  type SleepSettings,
} from '@/lib/sleep'
import { useSleepData } from './useSleepData'

function _useSleepReminders() {
  const sleepData = useSleepData()
  const { settings, sessions, todaySummary, todayKey } = sleepData

  const reminderEnabled = useLocalStorage<boolean>('sleep-tracker-reminder-enabled', false)
  const reminderTime = useLocalStorage<string>('sleep-tracker-reminder-time', '21:00')
  const lastReminderDate = useLocalStorage<string>('sleep-tracker-last-reminder-date', '')
  const lastBedtimeReminderDate = useLocalStorage<string>('sleep-tracker-last-bedtime-reminder-date', '')
  const lastWindDownReminderDate = useLocalStorage<string>('sleep-tracker-last-winddown-reminder-date', '')
  const lastGoalNudgeDate = useLocalStorage<string>('sleep-tracker-last-goal-nudge-date', '')
  const bedtimeReminderEnabled = useLocalStorage<boolean>('sleep-tracker-bedtime-reminder-enabled', false)
  const bedtimeReminderTime = useLocalStorage<string>('sleep-tracker-bedtime-reminder-time', '22:00')
  const windDownReminderEnabled = useLocalStorage<boolean>('sleep-tracker-winddown-reminder-enabled', false)
  const windDownMinutes = useLocalStorage<number>('sleep-tracker-winddown-minutes', 30)
  const goalNudgeReminderEnabled = useLocalStorage<boolean>('sleep-tracker-goal-nudge-enabled', false)
  const goalNudgeTime = useLocalStorage<string>('sleep-tracker-goal-nudge-time', '20:00')
  const missedGoalReminderEnabled = useLocalStorage<boolean>('sleep-tracker-missed-goal-enabled', false)
  const lastMissedGoalDate = useLocalStorage<string>('sleep-tracker-last-missed-goal-date', '')

  const notificationSupported = computed(() => import.meta.client && 'Notification' in window)
  const notificationPermission = ref<NotificationPermission>('default')

  async function requestNotificationPermission() {
    if (!notificationSupported.value) return
    notificationPermission.value = await Notification.requestPermission()
    if (notificationPermission.value !== 'granted') reminderEnabled.value = false
  }

  function maybeSendReminder(now: Date) {
    if (!notificationSupported.value) return
    notificationPermission.value = Notification.permission
    if (notificationPermission.value !== 'granted') return

    const currentTime = now.getTime()
    const currentKey = todayKey.value

    // Basic reminder - sleep goal check
    if (reminderEnabled.value && todaySummary.value.remainingMinutes > 0) {
      const [hours, minutes] = reminderTime.value.split(':').map(Number)
      const reminderAt = new Date(now)
      reminderAt.setHours(hours || 0, minutes || 0, 0, 0)

      if (currentTime >= reminderAt.getTime() && lastReminderDate.value !== currentKey) {
        const remaining = formatDurationFromMinutes(todaySummary.value.remainingMinutes)
        new Notification('Sleep goal reminder', {
          body: `You still need ${remaining} today to hit your sleep target.`,
        })
        lastReminderDate.value = currentKey
      }
    }

    // Bedtime reminder
    if (bedtimeReminderEnabled.value) {
      const [hours, minutes] = bedtimeReminderTime.value.split(':').map(Number)
      const bedtimeAt = new Date(now)
      bedtimeAt.setHours(hours || 0, minutes || 0, 0, 0)

      if (currentTime >= bedtimeAt.getTime() && lastBedtimeReminderDate.value !== currentKey) {
        new Notification('Bedtime reminder', {
          body: `It's ${bedtimeReminderTime.value}. Time to start winding down for sleep.`,
        })
        lastBedtimeReminderDate.value = currentKey
      }
    }

    // Wind-down reminder
    if (windDownReminderEnabled.value && bedtimeReminderEnabled.value) {
      const [hours, minutes] = bedtimeReminderTime.value.split(':').map(Number)
      const bedtimeAt = new Date(now)
      bedtimeAt.setHours(hours || 0, minutes || 0, 0, 0)
      const windDownAt = new Date(bedtimeAt.getTime() - windDownMinutes.value * 60 * 1000)

      if (currentTime >= windDownAt.getTime() && currentTime < bedtimeAt.getTime() && lastWindDownReminderDate.value !== currentKey) {
        new Notification('Wind-down time', {
          body: `${windDownMinutes.value} minutes until bedtime. Start your evening routine.`,
        })
        lastWindDownReminderDate.value = currentKey
      }
    }

    // Goal nudge
    if (goalNudgeReminderEnabled.value && todaySummary.value.remainingMinutes > 0) {
      const [hours, minutes] = goalNudgeTime.value.split(':').map(Number)
      const nudgeAt = new Date(now)
      nudgeAt.setHours(hours || 0, minutes || 0, 0, 0)

      if (currentTime >= nudgeAt.getTime() && lastGoalNudgeDate.value !== currentKey) {
        const remaining = formatDurationFromMinutes(todaySummary.value.remainingMinutes)
        new Notification('Evening sleep check', {
          body: `You need ${remaining} more sleep today. Plan your bedtime accordingly.`,
        })
        lastGoalNudgeDate.value = currentKey
      }
    }

    // Missed goal follow-up
    if (missedGoalReminderEnabled.value) {
      const yesterday = addDays(currentKey, -1)
      const yesterdaySummary = summarizeSleepDay(yesterday, sessions.value, settings.value.dailyGoalHours)

      if (yesterdaySummary.remainingMinutes > 0 && lastMissedGoalDate.value !== yesterday) {
        const missedMinutes = yesterdaySummary.remainingMinutes
        const goalHours = settings.value.dailyGoalHours
        new Notification('Sleep recovery', {
          body: `Yesterday you missed your goal by ${formatDurationFromMinutes(missedMinutes)}. Aim for ${goalHours}h today to stay on track!`,
        })
        lastMissedGoalDate.value = yesterday
      }
    }
  }

  return {
    reminderEnabled,
    reminderTime,
    lastReminderDate,
    bedtimeReminderEnabled,
    bedtimeReminderTime,
    windDownReminderEnabled,
    windDownMinutes,
    goalNudgeReminderEnabled,
    goalNudgeTime,
    missedGoalReminderEnabled,
    lastMissedGoalDate,
    notificationSupported,
    notificationPermission,
    requestNotificationPermission,
    maybeSendReminder,
  }
}

export const useSleepReminders = createGlobalState(_useSleepReminders)
