import { useSleepData } from '@/composables/useSleepData'

export function useSleepReminders() {
  const sleepData = useSleepData()

  return {
    reminderEnabled: sleepData.reminderEnabled,
    reminderTime: sleepData.reminderTime,
    bedtimeReminderEnabled: sleepData.bedtimeReminderEnabled,
    bedtimeReminderTime: sleepData.bedtimeReminderTime,
    windDownReminderEnabled: sleepData.windDownReminderEnabled,
    windDownMinutes: sleepData.windDownMinutes,
    goalNudgeReminderEnabled: sleepData.goalNudgeReminderEnabled,
    goalNudgeTime: sleepData.goalNudgeTime,
    missedGoalReminderEnabled: sleepData.missedGoalReminderEnabled,
    lastMissedGoalDate: sleepData.lastMissedGoalDate,
    notificationSupported: sleepData.notificationSupported,
    notificationPermission: sleepData.notificationPermission,
    requestNotificationPermission: sleepData.requestNotificationPermission,
  }
}
