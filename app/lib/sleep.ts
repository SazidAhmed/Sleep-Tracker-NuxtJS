export interface SleepSession {
  id: string
  start: string
  end: string
  createdAt: string
}

export interface SleepSettings {
  dailyGoalHours: number
  anchorTime: string
}

export interface DailySleepSummary {
  date: string
  minutes: number
  goalMinutes: number
  remainingMinutes: number
  percentage: number
  sessions: SleepSession[]
}

export interface MonthlySleepCell extends DailySleepSummary {
  inCurrentMonth: boolean
  isToday: boolean
}

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS

export function formatDurationFromMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  if (!hours)
    return `${minutes}m`

  if (!minutes)
    return `${hours}h`

  return `${hours}h ${minutes}m`
}

export function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatTimeLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function getDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: string, offset: number) {
  const next = new Date(`${date}T00:00:00`)
  next.setDate(next.getDate() + offset)
  return getDateKey(next)
}

export function shiftMonth(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

export function toDateTimeLocalValue(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function getSessionDurationMinutes(session: SleepSession) {
  const start = new Date(session.start).getTime()
  const end = new Date(session.end).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return 0

  return Math.round((end - start) / MINUTE_MS)
}

export function summarizeSleepDay(date: string, sessions: SleepSession[], goalHours: number): DailySleepSummary {
  const dayStart = new Date(`${date}T00:00:00`).getTime()
  const dayEnd = dayStart + DAY_MS
  const goalMinutes = Math.max(0, Math.round(goalHours * 60))

  const relatedSessions = sessions.filter((session) => {
    const start = new Date(session.start).getTime()
    const end = new Date(session.end).getTime()
    return Number.isFinite(start) && Number.isFinite(end) && end > dayStart && start < dayEnd
  })

  const minutes = relatedSessions.reduce((total, session) => {
    const start = new Date(session.start).getTime()
    const end = new Date(session.end).getTime()
    const overlapStart = Math.max(start, dayStart)
    const overlapEnd = Math.min(end, dayEnd)
    return total + Math.max(0, Math.round((overlapEnd - overlapStart) / MINUTE_MS))
  }, 0)

  const remainingMinutes = Math.max(goalMinutes - minutes, 0)
  const percentage = goalMinutes ? Math.min((minutes / goalMinutes) * 100, 100) : 0

  return {
    date,
    minutes,
    goalMinutes,
    remainingMinutes,
    percentage,
    sessions: relatedSessions.sort((a, b) => a.start.localeCompare(b.start)),
  }
}

export function buildRecentHistory(today: string, sessions: SleepSession[], goalHours: number, days = 7) {
  return Array.from({ length: days }, (_, index) => addDays(today, index - (days - 1)))
    .map((date) => summarizeSleepDay(date, sessions, goalHours))
}

export function buildMonthGrid(referenceDate: Date, sessions: SleepSession[], goalHours: number, today: string) {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0)
  const startOffset = monthStart.getDay()
  const gridStart = new Date(year, month, 1 - startOffset)
  const totalDays = 42

  const days = Array.from({ length: totalDays }, (_, index) => {
    const cellDate = new Date(gridStart)
    cellDate.setDate(gridStart.getDate() + index)
    const dateKey = getDateKey(cellDate)
    const summary = summarizeSleepDay(dateKey, sessions, goalHours)

    return {
      ...summary,
      inCurrentMonth: cellDate.getMonth() === month,
      isToday: dateKey === today,
    } satisfies MonthlySleepCell
  })

  const monthDays = days.filter(day => day.inCurrentMonth)
  const totalMinutes = monthDays.reduce((sum, day) => sum + day.minutes, 0)
  const completedDays = monthDays.filter(day => day.remainingMinutes === 0 && day.goalMinutes > 0).length

  return {
    days,
    monthStart,
    monthEnd,
    totalMinutes,
    completedDays,
    trackedDays: monthDays.filter(day => day.minutes > 0).length,
  }
}

export function buildGuidance(summary: DailySleepSummary, anchorTime: string, now: Date) {
  if (summary.goalMinutes === 0)
    return 'Set a daily sleep goal to start tracking progress.'

  if (summary.remainingMinutes === 0)
    return '\uD83C\uDF89 Goal completed for today! Extra rest still helps your recovery.'

  const remaining = formatDurationFromMinutes(summary.remainingMinutes)
  const sessionCount = summary.sessions.length

  if (!anchorTime) {
    if (sessionCount === 0)
      return `You haven't logged any sleep today. You need ${remaining} to hit your goal.`
    return `You still need ${remaining} today. Log another sleep block when you rest again.`
  }

  const [anchorHours, anchorMins] = anchorTime.split(':').map(Number)
  const anchor = new Date(now)
  anchor.setHours(anchorHours || 0, anchorMins || 0, 0, 0)
  const passedAnchor = now.getTime() >= anchor.getTime()
  const anchorLabel = anchor.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  if (sessionCount === 0) {
    if (passedAnchor)
      return `You haven't slept yet today and it's past ${anchorLabel}. Try to get ${remaining} of rest as soon as possible.`
    return `No sleep logged yet. You need ${remaining}. A full block before ${anchorLabel} would complete your goal.`
  }

  if (passedAnchor)
    return `You still need ${remaining} today. A second sleep block after ${anchorLabel} would complete your goal.`

  return `You've started tracking. ${remaining} more to go. Plan your next block before ${anchorLabel} if you expect an early wake-up.`
}

export function isSessionValid(session: SleepSession) {
  return getSessionDurationMinutes(session) > 0
}

export function calculateStreak(today: string, sessions: SleepSession[], goalHours: number): number {
  let streak = 0
  let date = today

  for (let i = 0; i < 365; i++) {
    const summary = summarizeSleepDay(date, sessions, goalHours)
    if (summary.remainingMinutes === 0 && summary.goalMinutes > 0) {
      streak++
    }
    else {
      // Skip today if it's still in progress
      if (i === 0) {
        date = addDays(date, -1)
        continue
      }
      break
    }
    date = addDays(date, -1)
  }

  return streak
}
