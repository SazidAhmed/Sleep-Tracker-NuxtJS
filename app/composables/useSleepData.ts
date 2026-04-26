import { useLocalStorage } from '@vueuse/core'
import {
  buildMonthGrid,
  buildGuidance,
  buildRecentHistory,
  calculateStreak,
  calculateSleepDebt,
  calculateSocialJetlag,
  exportSessionsToCSV,
  generateRecommendations,
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
  addDays,
  calculateSleepEfficiency,
  detectSleepPattern,
  forecastGoalAchievement,
  comparePeriods,
  analyzeBedtimeTrend,
  analyzeTagEffectiveness,
  generateAutoBackup,
  checkInterruptedSession,
  validateAndRepairData,
  calculateSmartAlarmTime,
  type SleepSession,
  type SleepSettings,
  type SessionTemplate,
  type SleepEfficiencyData,
  type SleepPattern,
  type GoalForecast,
  type PeriodComparison,
  type BedtimeTrend,
  type TagEffectiveness,
  type AlarmConfig,
  type AlarmType,
} from '@/lib/sleep'

export function useSleepData() {
  const settings = useLocalStorage<SleepSettings>('sleep-tracker-settings', {
    dailyGoalHours: 8,
    anchorTime: '05:00',
  })

  const sessions = useLocalStorage<SleepSession[]>('sleep-tracker-sessions', [])
  const templates = useLocalStorage<SessionTemplate[]>('sleep-tracker-templates', [])
  const reminderEnabled = useLocalStorage<boolean>('sleep-tracker-reminder-enabled', false)
  const reminderTime = useLocalStorage<string>('sleep-tracker-reminder-time', '21:00')
  const lastReminderDate = useLocalStorage<string>('sleep-tracker-last-reminder-date', '')
  const bedtimeReminderEnabled = useLocalStorage<boolean>('sleep-tracker-bedtime-reminder-enabled', false)
  const bedtimeReminderTime = useLocalStorage<string>('sleep-tracker-bedtime-reminder-time', '22:00')
  const windDownReminderEnabled = useLocalStorage<boolean>('sleep-tracker-winddown-reminder-enabled', false)
  const windDownMinutes = useLocalStorage<number>('sleep-tracker-winddown-minutes', 30)
  const goalNudgeReminderEnabled = useLocalStorage<boolean>('sleep-tracker-goal-nudge-enabled', false)
  const goalNudgeTime = useLocalStorage<string>('sleep-tracker-goal-nudge-time', '20:00')
  const missedGoalReminderEnabled = useLocalStorage<boolean>('sleep-tracker-missed-goal-enabled', false)
  const lastMissedGoalDate = useLocalStorage<string>('sleep-tracker-last-missed-goal-date', '')
  const activeSessionStart = useLocalStorage<string | null>('sleep-tracker-active-session-start', null)

  // Alarm state
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

  const sleepDebt = computed(() =>
    calculateSleepDebt(todayKey.value, normalizedSessions.value, settings.value.dailyGoalHours, 30),
  )

  const socialJetlag = computed(() =>
    calculateSocialJetlag(todayKey.value, normalizedSessions.value, settings.value.dailyGoalHours, 28),
  )

  const recommendations = computed(() =>
    generateRecommendations(todayKey.value, normalizedSessions.value, settings.value.dailyGoalHours),
  )

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
  function saveSession(session: Omit<SleepSession, 'id' | 'createdAt'> & { quality?: 1 | 2 | 3 | 4 | 5, tags?: string[], notes?: string }, id?: string) {
    const nextSession: SleepSession = {
      start: session.start,
      end: session.end,
      quality: session.quality,
      tags: session.tags,
      notes: session.notes,
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

  // Undo delete functionality
  const lastDeletedSession = ref<SleepSession | null>(null)
  const undoTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

  function removeSession(id: string) {
    const session = sessions.value.find(item => item.id === id)
    if (session) {
      lastDeletedSession.value = { ...session }
      sessions.value = sessions.value.filter(item => item.id !== id)

      // Clear any existing timeout
      if (undoTimeout.value) {
        clearTimeout(undoTimeout.value)
      }

      // Auto-clear after 5 seconds
      undoTimeout.value = setTimeout(() => {
        lastDeletedSession.value = null
      }, 5000)
    }
  }

  function undoDelete() {
    if (lastDeletedSession.value) {
      sessions.value = [lastDeletedSession.value, ...sessions.value]
      lastDeletedSession.value = null
      if (undoTimeout.value) {
        clearTimeout(undoTimeout.value)
        undoTimeout.value = null
      }
      return { success: true }
    }
    return { error: 'No session to restore' }
  }

  // Template CRUD
  function saveTemplate(template: Omit<SessionTemplate, 'id' | 'createdAt'>) {
    const newTemplate: SessionTemplate = {
      ...template,
      id: crypto.randomUUID(),
    }
    templates.value = [newTemplate, ...templates.value]
    return { success: true, template: newTemplate }
  }

  function deleteTemplate(id: string) {
    templates.value = templates.value.filter(t => t.id !== id)
  }

  function useTemplate(templateId: string, startTime?: Date) {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) return { error: 'Template not found' }

    const start = startTime ?? new Date()
    const end = new Date(start.getTime() + template.durationMinutes * 60 * 1000)

    const session: SleepSession = {
      id: crypto.randomUUID(),
      start: start.toISOString(),
      end: end.toISOString(),
      createdAt: new Date().toISOString(),
      quality: template.defaultQuality,
      tags: template.defaultTags,
    }

    if (!isSessionValid(session)) {
      return { error: 'Template would create an invalid session' }
    }

    sessions.value = [session, ...sessions.value]
    return { success: true, session }
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
    if (notificationPermission.value !== 'granted') return

    const currentTime = now.value.getTime()
    const currentKey = todayKey.value

    // Basic reminder - sleep goal check
    if (reminderEnabled.value && todaySummary.value.remainingMinutes > 0) {
      const [hours, minutes] = reminderTime.value.split(':').map(Number)
      const reminderAt = new Date(now.value)
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
      const bedtimeAt = new Date(now.value)
      bedtimeAt.setHours(hours || 0, minutes || 0, 0, 0)
      const bedtimeKey = `bedtime-${currentKey}`

      if (currentTime >= bedtimeAt.getTime() && lastReminderDate.value !== bedtimeKey) {
        new Notification('Bedtime reminder', {
          body: `It's ${bedtimeReminderTime.value}. Time to start winding down for sleep.`,
        })
        // Don't mark as reminded - we'll let other reminders work separately
      }
    }

    // Wind-down reminder (before bedtime)
    if (windDownReminderEnabled.value && bedtimeReminderEnabled.value) {
      const [hours, minutes] = bedtimeReminderTime.value.split(':').map(Number)
      const bedtimeAt = new Date(now.value)
      bedtimeAt.setHours(hours || 0, minutes || 0, 0, 0)
      const windDownAt = new Date(bedtimeAt.getTime() - windDownMinutes.value * 60 * 1000)
      const windDownKey = `winddown-${currentKey}`

      if (currentTime >= windDownAt.getTime() && currentTime < bedtimeAt.getTime() && lastReminderDate.value !== windDownKey) {
        new Notification('Wind-down time', {
          body: `${windDownMinutes.value} minutes until bedtime. Start your evening routine.`,
        })
      }
    }

    // Goal nudge (evening reminder about remaining sleep)
    if (goalNudgeReminderEnabled.value && todaySummary.value.remainingMinutes > 0) {
      const [hours, minutes] = goalNudgeTime.value.split(':').map(Number)
      const nudgeAt = new Date(now.value)
      nudgeAt.setHours(hours || 0, minutes || 0, 0, 0)
      const nudgeKey = `nudge-${currentKey}`

      if (currentTime >= nudgeAt.getTime() && lastReminderDate.value !== nudgeKey) {
        const remaining = formatDurationFromMinutes(todaySummary.value.remainingMinutes)
        new Notification('Evening sleep check', {
          body: `You need ${remaining} more sleep today. Plan your bedtime accordingly.`,
        })
      }
    }

    // Missed goal follow-up (next morning)
    if (missedGoalReminderEnabled.value) {
      const yesterday = addDays(currentKey, -1)
      const yesterdaySummary = summarizeSleepDay(yesterday, normalizedSessions.value, settings.value.dailyGoalHours)

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

  // CSV Export
  function exportCSV() {
    const csv = exportSessionsToCSV(normalizedSessions.value)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `sleep-sessions-${todayKey.value}.csv`
    link.click()
    URL.revokeObjectURL(url)
    return { success: true }
  }

  // Auto backup (weekly)
  const lastBackupDate = useLocalStorage<string>('sleep-tracker-last-backup', '')

  function maybeAutoBackup() {
    const today = todayKey.value
    if (lastBackupDate.value !== today && sessions.value.length > 0) {
      // Only backup once per day
      const dayOfWeek = new Date().getDay()
      if (dayOfWeek === 0) { // Sunday
        generateAutoBackup(sessions.value, settings.value)
        lastBackupDate.value = today
      }
    }
  }

  // Session recovery check
  const interruptedSession = ref(checkInterruptedSession())

  function recoverSession() {
    if (interruptedSession.value.hasInterrupted && interruptedSession.value.startTime) {
      activeSessionStart.value = interruptedSession.value.startTime
      interruptedSession.value = { hasInterrupted: false, startTime: null, durationMinutes: 0 }
      return { success: true }
    }
    return { error: 'No session to recover' }
  }

  // Data validation
  function validateData() {
    return validateAndRepairData(sessions.value)
  }

  // Analytics computed properties
  const sleepEfficiency = computed(() =>
    calculateSleepEfficiency(sessions.value, 480),
  )

  const sleepPattern = computed(() =>
    detectSleepPattern(todayKey.value, normalizedSessions.value, settings.value.dailyGoalHours),
  )

  const goalForecast = computed(() =>
    forecastGoalAchievement(todayKey.value, normalizedSessions.value, settings.value.dailyGoalHours),
  )

  const periodComparison = computed(() =>
    comparePeriods(todayKey.value, normalizedSessions.value, settings.value.dailyGoalHours),
  )

  const bedtimeTrend = computed(() =>
    analyzeBedtimeTrend(todayKey.value, normalizedSessions.value),
  )

  const tagEffectiveness = computed(() =>
    analyzeTagEffectiveness(normalizedSessions.value),
  )

  // Alarm logic
  const smartAlarmWakeTime = computed(() => {
    if (!activeSessionStart.value || alarmConfig.value.type !== 'smart') return null
    return calculateSmartAlarmTime(
      new Date(activeSessionStart.value),
      alarmConfig.value.time,
      alarmConfig.value.smartWindowMinutes,
    )
  })

  function checkAlarm() {
    if (!alarmConfig.value.enabled) return

    const currentTime = now.value
    const currentKey = todayKey.value

    // Don't re-trigger if already fired today (unless snoozed)
    if (alarmConfig.value.lastTriggeredDate === currentKey && !alarmConfig.value.lastSnoozedAt) return

    // Check if snooze period is still active
    if (alarmConfig.value.lastSnoozedAt) {
      const snoozeEnd = new Date(alarmConfig.value.lastSnoozedAt).getTime() + alarmConfig.value.snoozeMinutes * 60 * 1000
      if (currentTime.getTime() < snoozeEnd) return // still in snooze
      // Snooze period ended, re-trigger
    }

    const [alarmHours, alarmMins] = alarmConfig.value.time.split(':').map(Number)
    const alarmAt = new Date(currentTime)
    alarmAt.setHours(alarmHours || 0, alarmMins || 0, 0, 0)

    let shouldFire = false
    let firingType: AlarmType = alarmConfig.value.type

    if (alarmConfig.value.type === 'smart' && activeSessionStart.value) {
      // Smart alarm: check if we've reached the optimal wake time within the window
      const smartWake = smartAlarmWakeTime.value
      if (smartWake) {
        const smartWakeTime = new Date(smartWake.wakeTime).getTime()
        const windowEnd = alarmAt.getTime()
        const nowMs = currentTime.getTime()
        if (nowMs >= smartWakeTime && nowMs <= windowEnd) {
          shouldFire = true
          firingType = 'smart'
        }
      }
      // Also fire at the exact alarm time as fallback
      if (!shouldFire && currentTime.getTime() >= alarmAt.getTime() && currentTime.getTime() < alarmAt.getTime() + 60 * 1000) {
        shouldFire = true
        firingType = 'smart'
      }
    } else {
      // Sound or notification alarm: fire at the set time
      if (currentTime.getTime() >= alarmAt.getTime() && currentTime.getTime() < alarmAt.getTime() + 60 * 1000) {
        shouldFire = true
      }
    }

    if (!shouldFire) return

    // Fire the alarm
    alarmConfig.value.lastTriggeredDate = currentKey
    alarmConfig.value.lastSnoozedAt = null
    isAlarmFiring.value = true
    alarmFiringType.value = firingType

    // Send notification for all types
    if (notificationSupported.value && Notification.permission === 'granted') {
      const label = firingType === 'smart' ? 'Smart Alarm' : 'Wake-up Alarm'
      const body = firingType === 'smart' && smartAlarmWakeTime.value
        ? `Optimal wake time reached! ${smartAlarmWakeTime.value.label}`
        : `It's ${alarmConfig.value.time}. Time to wake up!`
      new Notification(label, { body })
    }
  }

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
    alarmConfig.value.lastTriggeredDate = '' // reset so new time can trigger
    alarmConfig.value.lastSnoozedAt = null
  }

  function setAlarmType(type: AlarmType) {
    alarmConfig.value.type = type
    alarmConfig.value.lastTriggeredDate = ''
    alarmConfig.value.lastSnoozedAt = null
  }

  // Lifecycle
  onMounted(() => {
    if (notificationSupported.value) notificationPermission.value = Notification.permission
    interval.value = setInterval(() => {
      now.value = new Date()
      maybeSendReminder()
      checkAlarm()
    }, 60 * 1000)
    maybeSendReminder()
    checkAlarm()
    maybeAutoBackup()

    // Check for interrupted session on mount
    interruptedSession.value = checkInterruptedSession()
  })

  onBeforeUnmount(() => {
    if (interval.value) clearInterval(interval.value)
  })

  return {
    settings,
    sessions: normalizedSessions,
    templates,
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
    activeSessionStart,
    alarmConfig,
    isAlarmFiring,
    alarmFiringType,
    smartAlarmWakeTime,
    dismissAlarm,
    snoozeAlarm,
    setAlarmEnabled,
    setAlarmTime,
    setAlarmType,
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
    sleepDebt,
    socialJetlag,
    recommendations,
    startSleepNow,
    stopSleepNow,
    cancelActiveSleep,
    saveSession,
    removeSession,
    undoDelete,
    lastDeletedSession,
    saveTemplate,
    deleteTemplate,
    useTemplate,
    requestNotificationPermission,
    exportBackup,
    importBackup,
    exportCSV,
    generateAutoBackup,
    checkInterruptedSession,
    recoverSession,
    validateData,
    sleepEfficiency,
    sleepPattern,
    goalForecast,
    periodComparison,
    bedtimeTrend,
    tagEffectiveness,
    interruptedSession,
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
