<script setup lang="ts">
import { ChevronLeft, ChevronRight, MoonStar, Pencil, Plus, Target, Trash2 } from 'lucide-vue-next'
import { useLocalStorage } from '@vueuse/core'
import {
  buildMonthGrid,
  buildGuidance,
  buildRecentHistory,
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

useSeoMeta({
  title: 'Sleep Tracker',
  description: 'Track split sleep sessions, daily goals, and recovery progress in a local-first Nuxt app.',
})

const settings = useLocalStorage<SleepSettings>('sleep-tracker-settings', {
  dailyGoalHours: 8,
  anchorTime: '05:00',
})

const sessions = useLocalStorage<SleepSession[]>('sleep-tracker-sessions', [])
const reminderEnabled = useLocalStorage<boolean>('sleep-tracker-reminder-enabled', false)
const reminderTime = useLocalStorage<string>('sleep-tracker-reminder-time', '21:00')
const lastReminderDate = useLocalStorage<string>('sleep-tracker-last-reminder-date', '')

const now = ref(new Date())
const interval = ref<ReturnType<typeof setInterval> | null>(null)
const editorId = ref<string | null>(null)
const errorMessage = ref('')
const backupMessage = ref('')
const backupError = ref('')
const selectedMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const importInput = ref<HTMLInputElement | null>(null)
const activeSessionStart = useLocalStorage<string | null>('sleep-tracker-active-session-start', null)
const notificationPermission = ref<NotificationPermission>('default')

const makeDefaultForm = () => {
  const end = new Date()
  const start = new Date(end.getTime() - 90 * 60 * 1000)

  return {
    start: toDateTimeLocalValue(start),
    end: toDateTimeLocalValue(end),
  }
}

const sessionForm = reactive(makeDefaultForm())

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
  if (!weekHistory.value.length)
    return 0

  const total = weekHistory.value.reduce((sum, day) => sum + day.minutes, 0)
  return Math.round(total / weekHistory.value.length)
})

const completionDays = computed(() =>
  weekHistory.value.filter(day => day.remainingMinutes === 0 && day.goalMinutes > 0).length,
)

const latestSession = computed(() => normalizedSessions.value[0] ?? null)
const progressWidth = computed(() => `${Math.min(todaySummary.value.percentage, 100)}%`)
const guidance = computed(() => buildGuidance(todaySummary.value, settings.value.anchorTime, now.value))
const notificationSupported = computed(() => import.meta.client && 'Notification' in window)
const activeSessionMinutes = computed(() => {
  if (!activeSessionStart.value)
    return 0

  const start = new Date(activeSessionStart.value).getTime()
  const end = now.value.getTime()

  if (!Number.isFinite(start) || end <= start)
    return 0

  return Math.round((end - start) / (60 * 1000))
})
const monthCalendar = computed(() =>
  buildMonthGrid(selectedMonth.value, normalizedSessions.value, settings.value.dailyGoalHours, todayKey.value),
)
const weeklyChart = computed(() => {
  const maxMinutes = Math.max(...weekHistory.value.map(day => day.minutes), settings.value.dailyGoalHours * 60, 60)

  return weekHistory.value.map(day => ({
    ...day,
    label: formatDateLabel(day.date).split(',')[0],
    height: `${Math.max((day.minutes / maxMinutes) * 100, day.minutes ? 8 : 4)}%`,
  }))
})
const insights = computed(() => {
  const trackedWeek = weekHistory.value.filter(day => day.minutes > 0)
  const bestDay = trackedWeek.reduce((best, day) => !best || day.minutes > best.minutes ? day : best, trackedWeek[0])
  const lowestDay = trackedWeek.reduce((lowest, day) => !lowest || day.minutes < lowest.minutes ? day : lowest, trackedWeek[0])
  const splitSleepDays = trackedWeek.filter(day => day.sessions.length >= 2).length
  const averageSessionsPerTrackedDay = trackedWeek.length
    ? trackedWeek.reduce((sum, day) => sum + day.sessions.length, 0) / trackedWeek.length
    : 0

  const startHourCounts = normalizedSessions.value.reduce<Record<string, number>>((accumulator, session) => {
    const start = new Date(session.start)
    const label = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true,
    })
    accumulator[label] = (accumulator[label] ?? 0) + 1
    return accumulator
  }, {})

  const mostCommonStart = Object.entries(startHourCounts).sort((a, b) => b[1] - a[1])[0]
  const consistencyScore = weekHistory.value.length
    ? Math.round(weekHistory.value.reduce((sum, day) => sum + day.percentage, 0) / weekHistory.value.length)
    : 0

  return {
    bestDay,
    lowestDay,
    splitSleepDays,
    averageSessionsPerTrackedDay,
    mostCommonStart,
    consistencyScore,
  }
})
const monthAverageMinutes = computed(() => {
  const trackedDays = monthCalendar.value.trackedDays
  if (!trackedDays)
    return 0

  return Math.round(monthCalendar.value.totalMinutes / trackedDays)
})
const monthlyTrend = computed(() => {
  const monthDays = monthCalendar.value.days.filter(day => day.inCurrentMonth)
  const maxMinutes = Math.max(...monthDays.map(day => day.minutes), settings.value.dailyGoalHours * 60, 60)

  return monthDays.map(day => ({
    ...day,
    shortDay: new Date(`${day.date}T00:00:00`).getDate(),
    width: `${Math.max((day.minutes / maxMinutes) * 100, day.minutes ? 6 : 0)}%`,
  }))
})

function resetForm() {
  Object.assign(sessionForm, makeDefaultForm())
  editorId.value = null
  errorMessage.value = ''
}

function saveSession() {
  errorMessage.value = ''

  if (!sessionForm.start || !sessionForm.end) {
    errorMessage.value = 'Start and end time are required.'
    return
  }

  const nextSession: SleepSession = {
    id: editorId.value ?? crypto.randomUUID(),
    start: sessionForm.start,
    end: sessionForm.end,
    createdAt: editorId.value
      ? normalizedSessions.value.find(item => item.id === editorId.value)?.createdAt ?? new Date().toISOString()
      : new Date().toISOString(),
  }

  if (!isSessionValid(nextSession)) {
    errorMessage.value = 'End time must be later than start time.'
    return
  }

  const nextSessions = editorId.value
    ? sessions.value.map(item => item.id === editorId.value ? nextSession : item)
    : [nextSession, ...sessions.value]

  sessions.value = nextSessions
  resetForm()
}

function editSession(session: SleepSession) {
  editorId.value = session.id
  sessionForm.start = session.start.slice(0, 16)
  sessionForm.end = session.end.slice(0, 16)
  errorMessage.value = ''
}

function removeSession(id: string) {
  sessions.value = sessions.value.filter(item => item.id !== id)

  if (editorId.value === id)
    resetForm()
}

function goToPreviousMonth() {
  selectedMonth.value = shiftMonth(selectedMonth.value, -1)
}

function goToNextMonth() {
  selectedMonth.value = shiftMonth(selectedMonth.value, 1)
}

function startSleepNow() {
  errorMessage.value = ''
  activeSessionStart.value = new Date().toISOString()
}

function stopSleepNow() {
  errorMessage.value = ''

  if (!activeSessionStart.value)
    return

  const nextSession: SleepSession = {
    id: crypto.randomUUID(),
    start: activeSessionStart.value,
    end: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }

  if (!isSessionValid(nextSession)) {
    errorMessage.value = 'Active session is too short to save yet.'
    return
  }

  sessions.value = [nextSession, ...sessions.value]
  activeSessionStart.value = null
}

function cancelActiveSleep() {
  activeSessionStart.value = null
}

async function requestNotificationPermission() {
  if (!notificationSupported.value)
    return

  notificationPermission.value = await Notification.requestPermission()

  if (notificationPermission.value !== 'granted')
    reminderEnabled.value = false
}

function maybeSendReminder() {
  if (!notificationSupported.value)
    return

  notificationPermission.value = Notification.permission

  if (!reminderEnabled.value || notificationPermission.value !== 'granted')
    return

  if (todaySummary.value.remainingMinutes === 0)
    return

  const [hours, minutes] = reminderTime.value.split(':').map(Number)
  const reminderAt = new Date(now.value)
  reminderAt.setHours(hours || 0, minutes || 0, 0, 0)

  if (now.value.getTime() < reminderAt.getTime())
    return

  if (lastReminderDate.value === todayKey.value)
    return

  const remaining = formatDurationFromMinutes(todaySummary.value.remainingMinutes)

  new Notification('Sleep goal reminder', {
    body: `You still need ${remaining} today to hit your sleep target.`,
  })

  lastReminderDate.value = todayKey.value
}

function exportBackup() {
  backupMessage.value = ''
  backupError.value = ''

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
  backupMessage.value = 'Backup exported successfully.'
}

async function importBackup(event: Event) {
  backupMessage.value = ''
  backupError.value = ''

  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file)
    return

  try {
    const content = await file.text()
    const parsed = JSON.parse(content) as {
      settings?: Partial<SleepSettings>
      sessions?: SleepSession[]
    }

    if (!parsed.settings || !Array.isArray(parsed.sessions)) {
      backupError.value = 'Backup file format is invalid.'
      return
    }

    const dailyGoalHours = Number(parsed.settings.dailyGoalHours)
    const anchorTime = typeof parsed.settings.anchorTime === 'string'
      ? parsed.settings.anchorTime
      : '05:00'
    const validSessions = parsed.sessions.filter(isSessionValid)

    if (!Number.isFinite(dailyGoalHours) || dailyGoalHours <= 0) {
      backupError.value = 'Backup file does not contain a valid sleep goal.'
      return
    }

    settings.value = {
      dailyGoalHours,
      anchorTime,
    }

    sessions.value = validSessions
    resetForm()
    backupMessage.value = `Imported ${validSessions.length} sleep ${validSessions.length === 1 ? 'session' : 'sessions'}.`
  }
  catch {
    backupError.value = 'Could not read this backup file.'
  }
  finally {
    input.value = ''
  }
}

onMounted(() => {
  if (notificationSupported.value)
    notificationPermission.value = Notification.permission

  interval.value = setInterval(() => {
    now.value = new Date()
    maybeSendReminder()
  }, 60 * 1000)

  maybeSendReminder()
})

onBeforeUnmount(() => {
  if (interval.value)
    clearInterval(interval.value)
})
</script>

<template>
  <main class="min-h-screen overflow-x-hidden bg-background text-foreground">
    <div class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_top,_rgba(47,109,95,0.24),_transparent_38%),radial-gradient(circle_at_20%_20%,_rgba(214,174,87,0.18),_transparent_22%),linear-gradient(180deg,_rgba(247,244,236,1)_0%,_rgba(255,255,255,1)_55%)]" />

    <section class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-6 sm:px-8 lg:px-10">
      <header class="flex flex-col gap-6 rounded-[2rem] border border-border/60 bg-white/70 p-6 shadow-[0_24px_80px_rgba(67,64,46,0.08)] backdrop-blur md:flex-row md:items-end md:justify-between">
        <div class="max-w-2xl">
          <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            <MoonStar class="size-3.5" />
            Sleep Tracker
          </div>
          <h1 class="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl">
            Track flexible sleep around your real routine.
          </h1>
          <p class="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            Log every sleep block, keep the day anchored to the calendar, and see how close you are to your recovery goal.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-3xl border border-border/70 bg-background/80 px-4 py-3">
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Today
            </p>
            <p class="mt-2 text-2xl font-semibold">
              {{ formatDurationFromMinutes(todaySummary.minutes) }}
            </p>
          </div>
          <div class="rounded-3xl border border-border/70 bg-background/80 px-4 py-3">
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Goal
            </p>
            <p class="mt-2 text-2xl font-semibold">
              {{ settings.dailyGoalHours }}h
            </p>
          </div>
          <div class="rounded-3xl border border-border/70 bg-background/80 px-4 py-3">
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Streak Window
            </p>
            <p class="mt-2 text-2xl font-semibold">
              {{ completionDays }}/7
            </p>
          </div>
        </div>
      </header>

      <div class="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <section class="space-y-6">
          <div class="overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-[0_22px_60px_rgba(46,54,49,0.08)]">
            <div class="border-b border-border/60 px-6 py-5">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Daily Progress
                  </p>
                  <h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    {{ formatDateLabel(todaySummary.date) }}
                  </h2>
                </div>
                <div class="rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
                  {{ guidance }}
                </div>
              </div>
            </div>

            <div class="space-y-6 px-6 py-6">
              <div>
                <div class="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p class="text-sm text-muted-foreground">
                      Completed
                    </p>
                    <p class="text-4xl font-semibold tracking-[-0.04em]">
                      {{ Math.round(todaySummary.percentage) }}%
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-muted-foreground">
                      Remaining
                    </p>
                    <p class="text-lg font-semibold">
                      {{ formatDurationFromMinutes(todaySummary.remainingMinutes) }}
                    </p>
                  </div>
                </div>
                <div class="h-3 overflow-hidden rounded-full bg-secondary">
                  <div class="h-full rounded-full bg-primary transition-all duration-500" :style="{ width: progressWidth }" />
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-3">
                <div class="rounded-3xl bg-muted/55 p-4">
                  <p class="text-sm text-muted-foreground">
                    Average last 7 days
                  </p>
                  <p class="mt-2 text-2xl font-semibold">
                    {{ formatDurationFromMinutes(averageSleepMinutes) }}
                  </p>
                </div>
                <div class="rounded-3xl bg-muted/55 p-4">
                  <p class="text-sm text-muted-foreground">
                    Last session
                  </p>
                  <p class="mt-2 text-base font-semibold">
                    {{ latestSession ? formatDurationFromMinutes(getSessionDurationMinutes(latestSession)) : 'No sessions yet' }}
                  </p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    {{ latestSession ? `${formatTimeLabel(latestSession.start)} to ${formatTimeLabel(latestSession.end)}` : 'Add your first sleep block below.' }}
                  </p>
                </div>
                <div class="rounded-3xl bg-muted/55 p-4">
                  <p class="text-sm text-muted-foreground">
                    Calendar rule
                  </p>
                  <p class="mt-2 text-base font-semibold">
                    Midnight split
                  </p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    Sessions are divided across dates automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="overflow-hidden rounded-[2rem] border border-border/60 bg-card">
            <div class="border-b border-border/60 px-6 py-5">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Recent Days
              </p>
              <h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                Last 7 calendar days
              </h2>
            </div>

            <div class="divide-y divide-border/60">
              <div
                v-for="day in weekHistory.slice().reverse()"
                :key="day.date"
                class="grid gap-4 px-6 py-4 sm:grid-cols-[1fr_auto_auto]"
              >
                <div>
                  <p class="font-medium">
                    {{ formatDateLabel(day.date) }}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    {{ day.sessions.length }} {{ day.sessions.length === 1 ? 'session' : 'sessions' }}
                  </p>
                </div>
                <div class="text-left sm:text-right">
                  <p class="font-semibold">
                    {{ formatDurationFromMinutes(day.minutes) }}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    Goal {{ formatDurationFromMinutes(day.goalMinutes) }}
                  </p>
                </div>
                <div class="text-left sm:text-right">
                  <p class="font-medium" :class="day.remainingMinutes === 0 ? 'text-primary' : 'text-foreground'">
                    {{ day.remainingMinutes === 0 ? 'Completed' : `${formatDurationFromMinutes(day.remainingMinutes)} left` }}
                  </p>
                  <p class="text-sm text-muted-foreground">
                    {{ Math.round(day.percentage) }}% complete
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="overflow-hidden rounded-[2rem] border border-border/60 bg-card">
            <div class="border-b border-border/60 px-6 py-5">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Weekly Chart
              </p>
              <h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                Sleep volume over the last 7 days
              </h2>
            </div>

            <div class="px-6 py-6">
              <div class="grid min-h-64 grid-cols-7 gap-3">
                <div
                  v-for="day in weeklyChart"
                  :key="day.date"
                  class="flex flex-col items-center justify-end gap-3"
                >
                  <div class="flex h-44 w-full items-end justify-center rounded-[1.75rem] bg-muted/40 p-2">
                    <div
                      class="w-full rounded-[1.25rem] transition-all duration-500"
                      :class="day.remainingMinutes === 0 && day.minutes > 0 ? 'bg-primary' : 'bg-accent'"
                      :style="{ height: day.height }"
                    />
                  </div>
                  <div class="text-center">
                    <p class="text-sm font-semibold">
                      {{ formatDurationFromMinutes(day.minutes) }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      {{ day.label }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="overflow-hidden rounded-[2rem] border border-border/60 bg-card">
            <div class="border-b border-border/60 px-6 py-5">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Sleep Insights
              </p>
              <h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                Pattern signals from your recent logs
              </h2>
            </div>

            <div class="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-3xl bg-muted/55 p-4">
                <p class="text-sm text-muted-foreground">
                  Best day this week
                </p>
                <p class="mt-2 text-xl font-semibold">
                  {{ insights.bestDay ? formatDurationFromMinutes(insights.bestDay.minutes) : 'No data yet' }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ insights.bestDay ? formatDateLabel(insights.bestDay.date) : 'Log a few sessions to unlock this view.' }}
                </p>
              </div>

              <div class="rounded-3xl bg-muted/55 p-4">
                <p class="text-sm text-muted-foreground">
                  Lowest day this week
                </p>
                <p class="mt-2 text-xl font-semibold">
                  {{ insights.lowestDay ? formatDurationFromMinutes(insights.lowestDay.minutes) : 'No data yet' }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ insights.lowestDay ? formatDateLabel(insights.lowestDay.date) : 'Sleep totals will appear here.' }}
                </p>
              </div>

              <div class="rounded-3xl bg-muted/55 p-4">
                <p class="text-sm text-muted-foreground">
                  Most common start time
                </p>
                <p class="mt-2 text-xl font-semibold">
                  {{ insights.mostCommonStart ? insights.mostCommonStart[0] : 'No data yet' }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ insights.mostCommonStart ? `${insights.mostCommonStart[1]} logged session starts` : 'Start-time patterns will appear here.' }}
                </p>
              </div>

              <div class="rounded-3xl bg-muted/55 p-4">
                <p class="text-sm text-muted-foreground">
                  Weekly consistency
                </p>
                <p class="mt-2 text-xl font-semibold">
                  {{ insights.consistencyScore }}%
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  Average progress against your goal over the last 7 days.
                </p>
              </div>
            </div>

            <div class="grid gap-4 border-t border-border/60 px-6 py-6 md:grid-cols-2">
              <div class="rounded-3xl border border-border/60 p-4">
                <p class="text-sm font-semibold">
                  Split-sleep frequency
                </p>
                <p class="mt-2 text-2xl font-semibold">
                  {{ insights.splitSleepDays }}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  days in the last 7 with 2 or more sleep blocks.
                </p>
              </div>

              <div class="rounded-3xl border border-border/60 p-4">
                <p class="text-sm font-semibold">
                  Average blocks per tracked day
                </p>
                <p class="mt-2 text-2xl font-semibold">
                  {{ insights.averageSessionsPerTrackedDay.toFixed(1) }}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  Helps show whether your routine is consolidated or split.
                </p>
              </div>
            </div>
          </div>

          <div class="overflow-hidden rounded-[2rem] border border-border/60 bg-card">
            <div class="border-b border-border/60 px-6 py-5">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Monthly View
                  </p>
                  <h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                    {{ formatMonthLabel(selectedMonth) }}
                  </h2>
                </div>
                <div class="flex items-center gap-2">
                  <Button variant="outline" size="icon" @click="goToPreviousMonth">
                    <ChevronLeft class="size-4" />
                  </Button>
                  <Button variant="outline" size="icon" @click="goToNextMonth">
                    <ChevronRight class="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div class="space-y-5 px-6 py-6">
              <div class="grid gap-4 md:grid-cols-3">
                <div class="rounded-3xl bg-muted/55 p-4">
                  <p class="text-sm text-muted-foreground">
                    Total sleep this month
                  </p>
                  <p class="mt-2 text-2xl font-semibold">
                    {{ formatDurationFromMinutes(monthCalendar.totalMinutes) }}
                  </p>
                </div>
                <div class="rounded-3xl bg-muted/55 p-4">
                  <p class="text-sm text-muted-foreground">
                    Goal days completed
                  </p>
                  <p class="mt-2 text-2xl font-semibold">
                    {{ monthCalendar.completedDays }}
                  </p>
                </div>
                <div class="rounded-3xl bg-muted/55 p-4">
                  <p class="text-sm text-muted-foreground">
                    Average tracked day
                  </p>
                  <p class="mt-2 text-2xl font-semibold">
                    {{ formatDurationFromMinutes(monthAverageMinutes) }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <div v-for="label in weekdayLabels" :key="label" class="py-2">
                  {{ label }}
                </div>
              </div>

              <div class="grid grid-cols-7 gap-2">
                <div
                  v-for="day in monthCalendar.days"
                  :key="day.date"
                  class="min-h-24 rounded-3xl border p-3 transition-colors"
                  :class="[
                    day.inCurrentMonth ? 'border-border/60 bg-background' : 'border-border/30 bg-muted/35 text-muted-foreground',
                    day.isToday ? 'ring-2 ring-primary/40' : '',
                    day.remainingMinutes === 0 && day.minutes > 0 ? 'border-primary/40 bg-primary/6' : '',
                  ]"
                >
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-sm font-semibold">
                      {{ new Date(`${day.date}T00:00:00`).getDate() }}
                    </span>
                    <span v-if="day.goalMinutes > 0" class="text-[11px] text-muted-foreground">
                      {{ Math.round(day.percentage) }}%
                    </span>
                  </div>

                  <div class="mt-4 space-y-1">
                    <p class="text-sm font-semibold leading-none">
                      {{ day.minutes ? formatDurationFromMinutes(day.minutes) : '0m' }}
                    </p>
                    <p class="text-[11px] leading-4 text-muted-foreground">
                      {{ day.sessions.length }} {{ day.sessions.length === 1 ? 'block' : 'blocks' }}
                    </p>
                  </div>
                </div>
              </div>

              <div class="rounded-[1.75rem] bg-muted/35 p-4">
                <div class="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p class="text-sm font-semibold">
                      Monthly trend
                    </p>
                    <p class="text-xs text-muted-foreground">
                      Compare each day in {{ formatMonthLabel(selectedMonth) }} at a glance.
                    </p>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    Goal: {{ settings.dailyGoalHours }}h
                  </p>
                </div>

                <div class="space-y-2">
                  <div
                    v-for="day in monthlyTrend"
                    :key="`${day.date}-trend`"
                    class="grid grid-cols-[2rem_1fr_auto] items-center gap-3"
                  >
                    <span class="text-xs font-medium text-muted-foreground">
                      {{ day.shortDay }}
                    </span>
                    <div class="h-2 overflow-hidden rounded-full bg-background">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :class="day.remainingMinutes === 0 && day.minutes > 0 ? 'bg-primary' : 'bg-accent'"
                        :style="{ width: day.width }"
                      />
                    </div>
                    <span class="text-xs font-medium text-foreground">
                      {{ formatDurationFromMinutes(day.minutes) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside class="space-y-6">
          <div class="rounded-[2rem] border border-border/60 bg-card p-6 shadow-[0_18px_48px_rgba(46,54,49,0.07)]">
            <div class="flex items-center gap-3">
              <div class="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <MoonStar class="size-5" />
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Timer Mode
                </p>
                <h2 class="text-2xl font-semibold tracking-[-0.03em]">
                  Live sleep session
                </h2>
              </div>
            </div>

            <div class="mt-6 space-y-4">
              <div class="rounded-3xl bg-muted/55 p-4">
                <p class="text-sm text-muted-foreground">
                  Current duration
                </p>
                <p class="mt-2 text-3xl font-semibold">
                  {{ activeSessionStart ? formatDurationFromMinutes(activeSessionMinutes) : 'Not running' }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ activeSessionStart ? `Started at ${formatDateTimeLabel(activeSessionStart)}` : 'Start a live timer when you go to sleep.' }}
                </p>
              </div>

              <div v-if="activeSessionStart" class="flex flex-col gap-3">
                <Button size="lg" @click="stopSleepNow">
                  Stop and save
                </Button>
                <Button variant="outline" size="lg" @click="cancelActiveSleep">
                  Cancel active timer
                </Button>
              </div>
              <Button v-else size="lg" @click="startSleepNow">
                Start sleep now
              </Button>
            </div>
          </div>

          <div class="rounded-[2rem] border border-border/60 bg-card p-6 shadow-[0_18px_48px_rgba(46,54,49,0.07)]">
            <div class="flex items-center gap-3">
              <div class="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Plus class="size-5" />
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Log Sleep
                </p>
                <h2 class="text-2xl font-semibold tracking-[-0.03em]">
                  {{ editorId ? 'Edit session' : 'Add a session' }}
                </h2>
              </div>
            </div>

            <div class="mt-6 space-y-4">
              <div class="space-y-2">
                <Label for="start">Sleep start</Label>
                <Input id="start" v-model="sessionForm.start" type="datetime-local" />
              </div>
              <div class="space-y-2">
                <Label for="end">Wake time</Label>
                <Input id="end" v-model="sessionForm.end" type="datetime-local" />
              </div>

              <p v-if="errorMessage" class="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {{ errorMessage }}
              </p>

              <div class="flex flex-col gap-3 sm:flex-row">
                <Button class="flex-1" size="lg" @click="saveSession">
                  {{ editorId ? 'Update session' : 'Save session' }}
                </Button>
                <Button v-if="editorId" variant="outline" size="lg" @click="resetForm">
                  Cancel
                </Button>
              </div>
            </div>
          </div>

          <div class="rounded-[2rem] border border-border/60 bg-card p-6">
            <div class="flex items-center gap-3">
              <div class="flex size-11 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <Target class="size-5" />
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Settings
                </p>
                <h2 class="text-2xl font-semibold tracking-[-0.03em]">
                  Daily target
                </h2>
              </div>
            </div>

            <div class="mt-6 space-y-4">
              <div class="space-y-2">
                <Label for="goal">Goal hours</Label>
                <Input
                  id="goal"
                  v-model.number="settings.dailyGoalHours"
                  type="number"
                  min="1"
                  max="14"
                  step="0.5"
                />
              </div>
              <div class="space-y-2">
                <Label for="anchor">Prayer or wake anchor</Label>
                <Input id="anchor" v-model="settings.anchorTime" type="time" />
              </div>
              <p class="text-sm leading-6 text-muted-foreground">
                The anchor is optional guidance only. Sleep totals still follow the calendar date and split across midnight automatically.
              </p>
            </div>
          </div>

          <div class="rounded-[2rem] border border-border/60 bg-card p-6">
            <div class="flex items-center gap-3">
              <div class="flex size-11 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <Target class="size-5" />
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Reminders
                </p>
                <h2 class="text-2xl font-semibold tracking-[-0.03em]">
                  Browser notifications
                </h2>
              </div>
            </div>

            <div class="mt-6 space-y-4">
              <p class="text-sm leading-6 text-muted-foreground">
                Get one reminder per day if your sleep goal is still incomplete after your chosen reminder time.
              </p>

              <div class="space-y-2">
                <Label for="reminder-time">Reminder time</Label>
                <Input id="reminder-time" v-model="reminderTime" type="time" />
              </div>

              <div class="rounded-3xl bg-muted/55 p-4">
                <p class="text-sm text-muted-foreground">
                  Permission status
                </p>
                <p class="mt-2 text-base font-semibold capitalize">
                  {{ notificationSupported ? notificationPermission : 'unsupported' }}
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ notificationSupported ? (reminderEnabled ? 'Reminders are enabled.' : 'Reminders are currently disabled.') : 'This browser does not support notifications.' }}
                </p>
              </div>

              <div class="flex flex-col gap-3">
                <Button
                  v-if="notificationSupported && notificationPermission !== 'granted'"
                  size="lg"
                  @click="requestNotificationPermission"
                >
                  Allow notifications
                </Button>
                <Button
                  v-if="notificationSupported && notificationPermission === 'granted' && !reminderEnabled"
                  size="lg"
                  @click="reminderEnabled = true"
                >
                  Enable daily reminder
                </Button>
                <Button
                  v-if="notificationSupported && notificationPermission === 'granted' && reminderEnabled"
                  variant="outline"
                  size="lg"
                  @click="reminderEnabled = false"
                >
                  Disable daily reminder
                </Button>
              </div>
            </div>
          </div>

          <div class="rounded-[2rem] border border-border/60 bg-card p-6">
            <div class="flex items-center gap-3">
              <div class="flex size-11 items-center justify-center rounded-2xl bg-secondary text-foreground">
                <Target class="size-5" />
              </div>
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Backup
                </p>
                <h2 class="text-2xl font-semibold tracking-[-0.03em]">
                  Export or import data
                </h2>
              </div>
            </div>

            <div class="mt-6 space-y-4">
              <p class="text-sm leading-6 text-muted-foreground">
                Save your current settings and sessions as a JSON backup, or restore them later on this device.
              </p>

              <div class="flex flex-col gap-3">
                <Button size="lg" @click="exportBackup">
                  Export backup
                </Button>
                <Button variant="outline" size="lg" @click="importInput?.click()">
                  Import backup
                </Button>
                <input
                  ref="importInput"
                  class="hidden"
                  type="file"
                  accept="application/json"
                  @change="importBackup"
                >
              </div>

              <p v-if="backupMessage" class="rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary">
                {{ backupMessage }}
              </p>
              <p v-if="backupError" class="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {{ backupError }}
              </p>
            </div>
          </div>

          <div class="rounded-[2rem] border border-border/60 bg-card">
            <div class="border-b border-border/60 px-6 py-5">
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                Session Log
              </p>
              <h2 class="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                All sleep blocks
              </h2>
            </div>

            <div v-if="normalizedSessions.length" class="divide-y divide-border/60">
              <div
                v-for="session in normalizedSessions"
                :key="session.id"
                class="px-6 py-4"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="font-semibold">
                      {{ formatDurationFromMinutes(getSessionDurationMinutes(session)) }}
                    </p>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {{ formatDateTimeLabel(session.start) }} to {{ formatDateTimeLabel(session.end) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button variant="outline" size="icon" @click="editSession(session)">
                      <Pencil class="size-4" />
                    </Button>
                    <Button variant="outline" size="icon" @click="removeSession(session.id)">
                      <Trash2 class="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="px-6 py-8 text-sm leading-6 text-muted-foreground">
              No sleep sessions logged yet. Add one block to start tracking daily totals.
            </div>
          </div>
        </aside>
      </div>
    </section>
  </main>
</template>
