import { useLocalStorage, useDebounceFn, createGlobalState } from '@vueuse/core'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import {
  buildMonthGrid,
  buildGuidance,
  buildRecentHistory,
  calculateStreak,
  exportSessionsToCSV,
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
  checkInterruptedSession,
  validateAndRepairData,
  migrateSleepData,
  CURRENT_DATA_VERSION,
  type SleepSession,
  type SleepSettings,
  type SessionTemplate,
  SLEEP_TAGS,
} from '@/lib/sleep'

type BackupImportMode = 'merge' | 'replace'

interface SleepBackupPayload {
  version?: number
  settings?: Partial<SleepSettings>
  sessions?: Partial<SleepSession>[]
}

function _useSleepData() {
  // Core Data & Settings
  const settings = useLocalStorage<SleepSettings>('sleep-tracker-settings', {
    dailyGoalHours: 8,
    weekdayGoalHours: 7.5,
    weekendGoalHours: 8.5,
    useSplitGoals: false,
    anchorTime: '05:00',
    defaultLatencyMinutes: 15,
    defaultAwakeMinutes: 30,
  })

  function getGoalHoursForDate(dateStr: string): number {
    if (settings.value.useSplitGoals && settings.value.weekdayGoalHours !== undefined && settings.value.weekendGoalHours !== undefined) {
      const d = new Date(`${dateStr}T00:00:00`)
      const day = d.getDay()
      const isWeekend = day === 0 || day === 6
      return isWeekend ? settings.value.weekendGoalHours : settings.value.weekdayGoalHours
    }
    return settings.value.dailyGoalHours
  }

  const sessions = useLocalStorage<SleepSession[]>('sleep-tracker-sessions', [])
  const templates = useLocalStorage<SessionTemplate[]>('sleep-tracker-templates', [])
  const customTags = useLocalStorage<string[]>('sleep-tracker-custom-tags', [...SLEEP_TAGS])
  const activeSessionStart = useLocalStorage<string | null>('sleep-tracker-active-session-start', null)

  const now = ref(new Date())
  const interval = ref<ReturnType<typeof setInterval> | null>(null)

  // Normalized Data
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

  const activeSessionMinutes = computed(() => {
    if (!activeSessionStart.value) return 0
    const start = new Date(activeSessionStart.value).getTime()
    const end = now.value.getTime()
    if (!Number.isFinite(start) || end <= start) return 0
    return Math.round((end - start) / (60 * 1000))
  })

  // CRUD Operations
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
    if (!isSessionValid(nextSession)) return { error: 'Active session is too short to save yet.' }
    sessions.value = [nextSession, ...sessions.value]
    activeSessionStart.value = null
    return { success: true }
  }

  function cancelActiveSleep() {
    activeSessionStart.value = null
  }

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
    if (!isSessionValid(nextSession)) return { error: 'End time must be later than start time.' }
    sessions.value = id
      ? sessions.value.map(item => item.id === id ? nextSession : item)
      : [nextSession, ...sessions.value]
    return { success: true }
  }

  const lastDeletedSession = ref<SleepSession | null>(null)
  const undoTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

  function removeSession(id: string) {
    const session = sessions.value.find(item => item.id === id)
    if (session) {
      lastDeletedSession.value = { ...session }
      sessions.value = sessions.value.filter(item => item.id !== id)
      if (undoTimeout.value) clearTimeout(undoTimeout.value)
      undoTimeout.value = setTimeout(() => { lastDeletedSession.value = null }, 5000)
    }
  }

  function undoDelete() {
    if (lastDeletedSession.value) {
      sessions.value = [lastDeletedSession.value, ...sessions.value]
      lastDeletedSession.value = null
      if (undoTimeout.value) { clearTimeout(undoTimeout.value); undoTimeout.value = null; }
      return { success: true }
    }
    return { error: 'No session to restore' }
  }

  function saveTemplate(template: Omit<SessionTemplate, 'id' | 'createdAt'>) {
    const newTemplate: SessionTemplate = { ...template, id: crypto.randomUUID() }
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
    if (!isSessionValid(session)) return { error: 'Template would create an invalid session' }
    sessions.value = [session, ...sessions.value]
    return { success: true, session }
  }

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

  // Backup/Export
  function importBackup(data: SleepBackupPayload & { version?: number }, mode: BackupImportMode = 'merge') {
    if (!data.settings || !Array.isArray(data.sessions)) return { error: 'Backup file format is invalid.' }
    
    // Run migration on imported data first
    const { settings: migratedSettings, sessions: migratedSessions, version } = migrateSleepData(
      data.settings,
      data.sessions,
      data.version || 0
    )

    const dailyGoalHours = Number(migratedSettings.dailyGoalHours)
    const anchorTime = typeof migratedSettings.anchorTime === 'string' ? migratedSettings.anchorTime : '05:00'
    const weekdayGoalHours = Number(migratedSettings.weekdayGoalHours)
    const weekendGoalHours = Number(migratedSettings.weekendGoalHours)
    
    const backupSettings: SleepSettings = {
      dailyGoalHours,
      anchorTime,
      useSplitGoals: migratedSettings.useSplitGoals === true,
      weekdayGoalHours: Number.isFinite(weekdayGoalHours) && weekdayGoalHours > 0 ? weekdayGoalHours : settings.value.weekdayGoalHours,
      weekendGoalHours: Number.isFinite(weekendGoalHours) && weekendGoalHours > 0 ? weekendGoalHours : settings.value.weekendGoalHours,
      defaultLatencyMinutes: Number(migratedSettings.defaultLatencyMinutes) || 15,
      defaultAwakeMinutes: Number(migratedSettings.defaultAwakeMinutes) || 30,
      version
    }
    
    const validSessions = migratedSessions
      .map((session: any): SleepSession => ({
        id: typeof session.id === 'string' && session.id ? session.id : crypto.randomUUID(),
        start: typeof session.start === 'string' ? session.start : '',
        end: typeof session.end === 'string' ? session.end : '',
        createdAt: typeof session.createdAt === 'string' ? session.createdAt : new Date().toISOString(),
        quality: session.quality,
        tags: Array.isArray(session.tags) ? session.tags.filter((tag: any) => typeof tag === 'string') : undefined,
        notes: typeof session.notes === 'string' ? session.notes : undefined,
      }))
      .filter(isSessionValid)

    if (!Number.isFinite(dailyGoalHours) || dailyGoalHours <= 0) return { error: 'Backup file does not contain a valid sleep goal.' }
    
    settings.value = backupSettings
    if (mode === 'replace') {
      sessions.value = validSessions
      return { success: true, count: validSessions.length, importedCount: validSessions.length, skippedCount: data.sessions.length - validSessions.length, mode }
    }
    const existingKeys = new Set(sessions.value.flatMap(session => [session.id, `${session.start}|${session.end}`]))
    const newSessions = validSessions.filter((session) => {
      const timeKey = `${session.start}|${session.end}`
      return !existingKeys.has(session.id) && !existingKeys.has(timeKey)
    })
    sessions.value = [...newSessions, ...sessions.value]
    return { success: true, count: newSessions.length, importedCount: newSessions.length, skippedCount: data.sessions.length - newSessions.length, mode }
  }

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

  // Lifecycle & Helpers
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

  function validateData() {
    return validateAndRepairData(sessions.value)
  }

  onMounted(() => {
    // Run data migration
    const { settings: migratedSettings, sessions: migratedSessions, version } = migrateSleepData(
      settings.value,
      sessions.value,
      settings.value.version || 0
    )
    
    if (version > (settings.value.version || 0)) {
      settings.value = { ...migratedSettings, version }
      sessions.value = migratedSessions
    }

    interval.value = setInterval(() => { now.value = new Date() }, 60 * 1000)
    interruptedSession.value = checkInterruptedSession()
  })

  onBeforeUnmount(() => {
    if (interval.value) clearInterval(interval.value)
  })

  return {
    settings,
    sessions,
    normalizedSessions,
    debouncedSessions,
    templates,
    customTags,
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
    activeSessionMinutes,
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
    addCustomTag,
    removeCustomTag,
    importBackup,
    exportCSV,
    recoverSession,
    refreshNow,
    validateData,
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
