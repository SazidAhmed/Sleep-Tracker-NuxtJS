import { useLocalStorage } from '@vueuse/core'
import {
  buildMonthGrid,
  buildGuidance,
  buildRecentHistory,
  calculateStreak,
  formatDateLabel,
  formatDateTimeLabel,
  formatDurationFromMinutes,
  formatMonthLabel,
  formatTimeLabel,
  getDateKey,
  getSessionDurationMinutes,
  isSessionValid,
  shiftMonth,
  summarizeSleepDay,
  toDateTimeLocalValue,
  type SleepSession,
  type SleepSettings,
} from '@/lib/sleep'

export function useSleepData() {
  const settings = useLocalStorage<SleepSettings>('sleep-tracker-settings', {
    dailyGoalHours: 8,
    anchorTime: '05:00',
  })

  const sessions = useLocalStorage<SleepSession[]>('sleep-tracker-sessions', [])
  const reminderEnabled = useLocalStorage<boolean>('sleep-tracker-reminder-enabled', false)
  const reminderTime = useLocalStorage<string>('sleep-tracker-reminder-time', '21:00')
  const lastReminderDate = useLocalStorage<string>('sleep-tracker-last-reminder-date', '')
  const activeSessionStart = useLocalStorage<string | null>('sleep-tracker-active-session-start', null)

  const now = ref(new Date())
  const interval = ref<ReturnType<typeof setInterval> | null>(null)
  const notificationPermission = ref<NotificationPermission>('default')

  const normalizedSessions = computed(() =>
    [...sessions.value]
      .filter(isSessionValid)
      .sort((a, b) => b.start.localeCompare(a.start)),
  )

  const todayKey = computed(() => getDateKey(now.value))
  const todaySummary = computed(() =>
    summarizeSleepDay(todayKey.value, normalizedSessions.value, settings.value.dailyGoalHours),
  )

  const weekHistory = computed(() =>
    buildRecentHistory(todayKey.value, normalizedSessions.value, settings.value.dailyGoalHours),
  )

  const averageSleepMinutes = computed(() => {
    if (!weekHistory.value.length) return 0
    const total = weekHistory.value.reduce((sum, day) => sum + day.minutes, 0)
    return Math.round(total / weekHistory.value.length)
  })

  const completionDays = computed(() =>
    weekHistory.value.filter(day => day.remainingMinutes === 0 && day.goalMinutes > 0).length,
  )

  const currentStreak = computed(() =>
    calculateStreak(todayKey.value, normalizedSessions.value, settings.value.dailyGoalHours),
  )

  const latestSession = computed(() => normalizedSessions.value[0] ?? null)
  const guidance = computed(() => buildGuidance(todaySummary.value, settings.value.anchorTime, now.value))
  const notificationSupported = computed(() => import.meta.client && 'Notification' in window)

  const activeSessionMinutes = computed(() => {
    if (!activeSessionStart.value) return 0
    const start = new Date(activeSessionStart.value).getTime()
    const end = now.value.getTime()
    if (!Number.isFinite(start) || end <= start) return 0
    return Math.round((end - start) / (60 * 1000))
  })

  const insights = computed(() => {
    const trackedWeek = weekHistory.value.filter(day => day.minutes > 0)
    const bestDay = trackedWeek.reduce((best, day) => !best || day.minutes > best.minutes ? day : best, trackedWeek[0])
    const lowestDay = trackedWeek.reduce((lowest, day) => !lowest || day.minutes < lowest.minutes ? day : lowest, trackedWeek[0])
    const splitSleepDays = trackedWeek.filter(day => day.sessions.length >= 2).length
    const averageSessionsPerTrackedDay = trackedWeek.length
      ? trackedWeek.reduce((sum, day) => sum + day.sessions.length, 0) / trackedWeek.length
      : 0

    const startHourCounts = normalizedSessions.value.reduce<Record<string, number>>((acc, session) => {
      const start = new Date(session.start)
      const label = start.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
      acc[label] = (acc[label] ?? 0) + 1
      return acc
    }, {})

    const mostCommonStart = Object.entries(startHourCounts).sort((a, b) => b[1] - a[1])[0]
    const consistencyScore = weekHistory.value.length
      ? Math.round(weekHistory.value.reduce((sum, day) => sum + day.percentage, 0) / weekHistory.value.length)
      : 0

    return { bestDay, lowestDay, splitSleepDays, averageSessionsPerTrackedDay, mostCommonStart, consistencyScore }
  })

  // Timer functions
  function startSleepNow() {
    activeSessionStart.value = new Date().toISOString()
  }

  function stopSleepNow() {
    if (!activeSessionStart.value) return null

    const nextSession: SleepSession = {
      id: crypto.randomUUID(),
      start: activeSessionStart.value,
      end: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    if (!isSessionValid(nextSession)) {
      return { error: 'Active session is too short to save yet.' }
    }

    sessions.value = [nextSession, ...sessions.value]
    activeSessionStart.value = null
    return { success: true }
  }

  function cancelActiveSleep() {
    activeSessionStart.value = null
  }

  // Session CRUD
  function saveSession(session: Omit<SleepSession, 'id' | 'createdAt'>, id?: string) {
    const nextSession: SleepSession = {
      ...session,
      id: id ?? crypto.randomUUID(),
      createdAt: id
        ? normalizedSessions.value.find(item => item.id === id)?.createdAt ?? new Date().toISOString()
        : new Date().toISOString(),
    }

    if (!isSessionValid(nextSession)) {
      return { error: 'End time must be later than start time.' }
    }

    sessions.value = id
      ? sessions.value.map(item => item.id === id ? nextSession : item)
      : [nextSession, ...sessions.value]

    return { success: true }
  }

  function removeSession(id: string) {
    sessions.value = sessions.value.filter(item => item.id !== id)
  }

  // Notification
  async function requestNotificationPermission() {
    if (!notificationSupported.value) return
    notificationPermission.value = await Notification.requestPermission()
    if (notificationPermission.value !== 'granted') reminderEnabled.value = false
  }

  function maybeSendReminder() {
    if (!notificationSupported.value) return
    notificationPermission.value = Notification.permission

    if (!reminderEnabled.value || notificationPermission.value !== 'granted') return
    if (todaySummary.value.remainingMinutes === 0) return

    const [hours, minutes] = reminderTime.value.split(':').map(Number)
    const reminderAt = new Date(now.value)
    reminderAt.setHours(hours || 0, minutes || 0, 0, 0)

    if (now.value.getTime() < reminderAt.getTime()) return
    if (lastReminderDate.value === todayKey.value) return

    const remaining = formatDurationFromMinutes(todaySummary.value.remainingMinutes)
    new Notification('Sleep goal reminder', {
      body: `You still need ${remaining} today to hit your sleep target.`,
    })
    lastReminderDate.value = todayKey.value
  }

  // Backup
  function exportBackup() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
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

  function importBackup(data: { settings?: Partial<SleepSettings>, sessions?: SleepSession[] }) {
    if (!data.settings || !Array.isArray(data.sessions)) {
      return { error: 'Backup file format is invalid.' }
    }

    const dailyGoalHours = Number(data.settings.dailyGoalHours)
    const anchorTime = typeof data.settings.anchorTime === 'string' ? data.settings.anchorTime : '05:00'
    const validSessions = data.sessions.filter(isSessionValid)

    if (!Number.isFinite(dailyGoalHours) || dailyGoalHours <= 0) {
      return { error: 'Backup file does not contain a valid sleep goal.' }
    }

    settings.value = { dailyGoalHours, anchorTime }
    sessions.value = validSessions
    return { success: true, count: validSessions.length }
  }

  // Lifecycle
  onMounted(() => {
    if (notificationSupported.value) notificationPermission.value = Notification.permission
    interval.value = setInterval(() => {
      now.value = new Date()
      maybeSendReminder()
    }, 60 * 1000)
    maybeSendReminder()
  })

  onBeforeUnmount(() => {
    if (interval.value) clearInterval(interval.value)
  })

  return {
    settings,
    sessions: normalizedSessions,
    reminderEnabled,
    reminderTime,
    lastReminderDate,
    activeSessionStart,
    now,
    todayKey,
    todaySummary,
    weekHistory,
    averageSleepMinutes,
    completionDays,
    currentStreak,
    latestSession,
    guidance,
    notificationSupported,
    notificationPermission,
    activeSessionMinutes,
    insights,
    startSleepNow,
    stopSleepNow,
    cancelActiveSleep,
    saveSession,
    removeSession,
    requestNotificationPermission,
    exportBackup,
    importBackup,
    formatDurationFromMinutes,
    formatDateLabel,
    formatDateTimeLabel,
    formatTimeLabel,
    formatMonthLabel,
    getSessionDurationMinutes,
    getDateKey,
    shiftMonth,
    buildMonthGrid,
    toDateTimeLocalValue,
  }
}
