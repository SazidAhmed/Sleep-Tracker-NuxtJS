import { useLocalStorage, useDebounceFn, createGlobalState } from '@vueuse/core'
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
  calculateSleepScore,
  calculateSleepRegularityIndex,
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
  type SleepScore,
  SLEEP_TAGS,
} from '@/lib/sleep'

type BackupImportMode = 'merge' | 'replace'

interface SleepBackupPayload {
  version?: number
  settings?: Partial<SleepSettings>
  sessions?: Partial<SleepSession>[]
}

function _useSleepData() {
  const settings = useLocalStorage<SleepSettings>('sleep-tracker-settings', {
    dailyGoalHours: 8,
    weekdayGoalHours: 7.5,
    weekendGoalHours: 8.5,
    useSplitGoals: false,
    anchorTime: '05:00',
  })

  function getGoalHoursForDate(dateStr: string): number {
    if (settings.value.useSplitGoals && settings.value.weekdayGoalHours !== undefined && settings.value.weekendGoalHours !== undefined) {
      const d = new Date(`${dateStr}T00:00:00`)
      const day = d.getDay()
      const isWeekend = day === 0 || day === 6 // Saturday and Sunday
      return isWeekend ? settings.value.weekendGoalHours : settings.value.weekdayGoalHours
    }
    return settings.value.dailyGoalHours
  }

  const customTags = useLocalStorage<string[]>('sleep-tracker-custom-tags', [...SLEEP_TAGS])

  function addCustomTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed) return { error: 'Tag cannot be empty.' }
    if (customTags.value.includes(trimmed)) return { error: 'Tag already exists.' }
    customTags.value.push(trimmed)
    return { success: true }
  }

  function removeCustomTag(tag: string) {
    customTags.value = customTags.value.filter(t => t !== tag)
    return { success: true }
  }

  const sessions = useLocalStorage<SleepSession[]>('sleep-tracker-sessions', [])
  const templates = useLocalStorage<SessionTemplate[]>('sleep-tracker-templates', [])
  const reminderEnabled = useLocalStorage<boolean>('sleep-tracker-reminder-enabled', false)
  const reminderTime = useLocalStorage<string>('sleep-tracker-reminder-time', '21:00')
  // Each reminder type has its own last-fired key to prevent one from blocking others
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

  const debouncedSessions = ref(normalizedSessions.value)
  const updateDebouncedSessions = useDebounceFn((value: SleepSession[]) => {
    debouncedSessions.value = value
  }, 150)

  watch(normalizedSessions, (value) => updateDebouncedSessions(value), { immediate: true })

  const todayKey = computed(() => getDateKey(now.value))
  const todaySummary = computed(() =>
    summarizeSleepDay(todayKey.value, normalizedSessions.value, getGoalHoursForDate(todayKey.value)),
  )

  const weekHistory = computed(() =>
    buildRecentHistory(todayKey.value, debouncedSessions.value, getGoalHoursForDate),
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
    calculateStreak(todayKey.value, normalizedSessions.value, getGoalHoursForDate),
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
    calculateSleepDebt(todayKey.value, debouncedSessions.value, getGoalHoursForDate, 30),
  )

  const socialJetlag = computed(() =>
    calculateSocialJetlag(todayKey.value, debouncedSessions.value, getGoalHoursForDate, 28),
  )

  const recommendations = computed(() =>
    generateRecommendations(todayKey.value, debouncedSessions.value, getGoalHoursForDate),
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

    // Basic reminder - sleep goal check (own key: lastReminderDate)
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

    // Bedtime reminder (own key: lastBedtimeReminderDate)
    if (bedtimeReminderEnabled.value) {
      const [hours, minutes] = bedtimeReminderTime.value.split(':').map(Number)
      const bedtimeAt = new Date(now.value)
      bedtimeAt.setHours(hours || 0, minutes || 0, 0, 0)

      if (currentTime >= bedtimeAt.getTime() && lastBedtimeReminderDate.value !== currentKey) {
        new Notification('Bedtime reminder', {
          body: `It's ${bedtimeReminderTime.value}. Time to start winding down for sleep.`,
        })
        lastBedtimeReminderDate.value = currentKey
      }
    }

    // Wind-down reminder (own key: lastWindDownReminderDate)
    if (windDownReminderEnabled.value && bedtimeReminderEnabled.value) {
      const [hours, minutes] = bedtimeReminderTime.value.split(':').map(Number)
      const bedtimeAt = new Date(now.value)
      bedtimeAt.setHours(hours || 0, minutes || 0, 0, 0)
      const windDownAt = new Date(bedtimeAt.getTime() - windDownMinutes.value * 60 * 1000)

      if (currentTime >= windDownAt.getTime() && currentTime < bedtimeAt.getTime() && lastWindDownReminderDate.value !== currentKey) {
        new Notification('Wind-down time', {
          body: `${windDownMinutes.value} minutes until bedtime. Start your evening routine.`,
        })
        lastWindDownReminderDate.value = currentKey
      }
    }

    // Goal nudge — evening reminder about remaining sleep (own key: lastGoalNudgeDate)
    if (goalNudgeReminderEnabled.value && todaySummary.value.remainingMinutes > 0) {
      const [hours, minutes] = goalNudgeTime.value.split(':').map(Number)
      const nudgeAt = new Date(now.value)
      nudgeAt.setHours(hours || 0, minutes || 0, 0, 0)

      if (currentTime >= nudgeAt.getTime() && lastGoalNudgeDate.value !== currentKey) {
        const remaining = formatDurationFromMinutes(todaySummary.value.remainingMinutes)
        new Notification('Evening sleep check', {
          body: `You need ${remaining} more sleep today. Plan your bedtime accordingly.`,
        })
        lastGoalNudgeDate.value = currentKey
      }
    }

    // Missed goal follow-up — next morning (own key: lastMissedGoalDate)
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

  function importBackup(data: SleepBackupPayload, mode: BackupImportMode = 'merge') {
    if (!data.settings || !Array.isArray(data.sessions)) {
      return { error: 'Backup file format is invalid.' }
    }

    const dailyGoalHours = Number(data.settings.dailyGoalHours)
    const anchorTime = typeof data.settings.anchorTime === 'string' ? data.settings.anchorTime : '05:00'
    const weekdayGoalHours = Number(data.settings.weekdayGoalHours)
    const weekendGoalHours = Number(data.settings.weekendGoalHours)
    const backupSettings: SleepSettings = {
      dailyGoalHours,
      anchorTime,
      useSplitGoals: data.settings.useSplitGoals === true,
      weekdayGoalHours: Number.isFinite(weekdayGoalHours) && weekdayGoalHours > 0 ? weekdayGoalHours : settings.value.weekdayGoalHours,
      weekendGoalHours: Number.isFinite(weekendGoalHours) && weekendGoalHours > 0 ? weekendGoalHours : settings.value.weekendGoalHours,
    }

    const validSessions = data.sessions
      .map((session): SleepSession => ({
        id: typeof session.id === 'string' && session.id ? session.id : crypto.randomUUID(),
        start: typeof session.start === 'string' ? session.start : '',
        end: typeof session.end === 'string' ? session.end : '',
        createdAt: typeof session.createdAt === 'string' ? session.createdAt : new Date().toISOString(),
        quality: session.quality,
        tags: Array.isArray(session.tags) ? session.tags.filter(tag => typeof tag === 'string') : undefined,
        notes: typeof session.notes === 'string' ? session.notes : undefined,
      }))
      .filter(isSessionValid)

    if (!Number.isFinite(dailyGoalHours) || dailyGoalHours <= 0) {
      return { error: 'Backup file does not contain a valid sleep goal.' }
    }

    settings.value = backupSettings

    if (mode === 'replace') {
      sessions.value = validSessions
      return {
        success: true,
        count: validSessions.length,
        importedCount: validSessions.length,
        skippedCount: data.sessions.length - validSessions.length,
        mode,
      }
    }

    const existingKeys = new Set(sessions.value.flatMap(session => [session.id, `${session.start}|${session.end}`]))
    const newSessions = validSessions.filter((session) => {
      const timeKey = `${session.start}|${session.end}`
      return !existingKeys.has(session.id) && !existingKeys.has(timeKey)
    })

    sessions.value = [...newSessions, ...sessions.value]
    return {
      success: true,
      count: newSessions.length,
      importedCount: newSessions.length,
      skippedCount: data.sessions.length - newSessions.length,
      mode,
    }
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

  function refreshNow() {
    now.value = new Date()
    interruptedSession.value = checkInterruptedSession()
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
    detectSleepPattern(todayKey.value, normalizedSessions.value),
  )

  const goalForecast = computed(() =>
    forecastGoalAchievement(todayKey.value, normalizedSessions.value, getGoalHoursForDate),
  )

  const periodComparison = computed(() =>
    comparePeriods(todayKey.value, normalizedSessions.value, getGoalHoursForDate),
  )

  const bedtimeTrend = computed(() =>
    analyzeBedtimeTrend(todayKey.value, normalizedSessions.value),
  )

  const tagEffectiveness = computed(() =>
    analyzeTagEffectiveness(normalizedSessions.value),
  )

  const sleepScore = computed(() =>
    calculateSleepScore(todayKey.value, normalizedSessions.value, getGoalHoursForDate),
  )

  const regularityIndex = computed(() =>
    calculateSleepRegularityIndex(sessions.value, todayKey.value, 7),
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
    refreshNow,
    customTags,
    addCustomTag,
    removeCustomTag,
    validateData,
    sleepEfficiency,
    sleepPattern,
    goalForecast,
    periodComparison,
    bedtimeTrend,
    tagEffectiveness,
    sleepScore,
    regularityIndex,
    getGoalHoursForDate,
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

export const useSleepData = createGlobalState(_useSleepData)
