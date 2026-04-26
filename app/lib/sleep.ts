export interface SleepSession {
  id: string
  start: string
  end: string
  createdAt: string
  quality?: 1 | 2 | 3 | 4 | 5
  tags?: string[]
  notes?: string
}

export interface SessionTemplate {
  id: string
  name: string
  durationMinutes: number
  defaultQuality?: 1 | 2 | 3 | 4 | 5
  defaultTags?: string[]
  icon?: string
}

export interface SleepSettings {
  dailyGoalHours: number
  anchorTime: string
}

export type AlarmType = 'sound' | 'notification' | 'smart'

export interface AlarmConfig {
  enabled: boolean
  time: string // HH:mm format
  type: AlarmType
  soundEnabled: boolean
  smartWindowMinutes: number // window before alarm to find optimal wake
  snoozeMinutes: number
  snoozeCount: number // how many times snoozed
  lastTriggeredDate: string // prevent re-triggering same alarm
  lastSnoozedAt: string | null // ISO timestamp of last snooze
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

export const SLEEP_TAGS = [
  'Nap',
  'Deep Sleep',
  'Light Sleep',
  'Interrupted',
  'Good Dreams',
  'Restless',
  'Recovery',
  'Sick',
  'Travel',
] as const

export function getQualityEmoji(quality?: number): string {
  if (!quality) return '○'
  const emojis = ['😫', '😕', '😐', '😊', '😴']
  return emojis[quality - 1] ?? '○'
}

export function getQualityLabel(quality?: number): string {
  if (!quality) return 'Not rated'
  const labels = ['Poor', 'Fair', 'Average', 'Good', 'Excellent']
  return labels[quality - 1] ?? 'Not rated'
}

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

export interface OptimalWakeTime {
  cycles: number
  wakeTime: string
  totalMinutes: number
  label: string
}

// 90-minute sleep cycles - suggest wake times that complete full cycles
export function calculateOptimalWakeTimes(
  sleepStartTime: Date,
  minCycles = 3,
  maxCycles = 6,
): OptimalWakeTime[] {
  const CYCLE_MINUTES = 90
  const results: OptimalWakeTime[] = []

  for (let cycles = minCycles; cycles <= maxCycles; cycles++) {
    const totalMinutes = cycles * CYCLE_MINUTES
    const wakeTime = new Date(sleepStartTime.getTime() + totalMinutes * 60 * 1000)

    // Format time label (e.g., "5:30 AM")
    const timeLabel = wakeTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    // Duration label (e.g., "4.5 hours")
    const hours = totalMinutes / 60
    const durationLabel = hours % 1 === 0 ? `${hours}h` : `${Math.floor(hours)}h ${(totalMinutes % 60)}m`

    results.push({
      cycles,
      wakeTime: wakeTime.toISOString(),
      totalMinutes,
      label: `${timeLabel} · ${durationLabel} · ${cycles} cycles`,
    })
  }

  return results
}

// Get the most recommended wake time based on user's goal
export function getRecommendedWakeTime(
  sleepStartTime: Date,
  goalHours: number,
): OptimalWakeTime | null {
  const optimalTimes = calculateOptimalWakeTimes(sleepStartTime)
  if (optimalTimes.length === 0) return null

  const goalMinutes = goalHours * 60

  // Find the wake time closest to the goal (prefer slightly under over way over)
  let best = optimalTimes[0]!
  let bestDiff = Math.abs(best.totalMinutes - goalMinutes)

  for (const time of optimalTimes) {
    const diff = Math.abs(time.totalMinutes - goalMinutes)
    // Prefer times that are slightly under goal vs way over
    const adjustedDiff = time.totalMinutes > goalMinutes ? diff * 1.5 : diff

    if (adjustedDiff < bestDiff) {
      best = time
      bestDiff = adjustedDiff
    }
  }

  return best
}

export function exportSessionsToCSV(sessions: SleepSession[]): string {
  const headers = ['Date', 'Start Time', 'End Time', 'Duration (minutes)', 'Duration (formatted)', 'Quality', 'Tags', 'Notes']
  const rows = sessions.map((session) => {
    const durationMinutes = getSessionDurationMinutes(session)
    const startDate = new Date(session.start)
    const date = startDate.toLocaleDateString('en-US')
    const startTime = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const endTime = new Date(session.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const durationFormatted = formatDurationFromMinutes(durationMinutes)
    const quality = session.quality ? getQualityLabel(session.quality) : ''
    const tags = session.tags?.join('; ') ?? ''
    const notes = session.notes?.replace(/"/g, '""') ?? ''

    return [
      date,
      startTime,
      endTime,
      durationMinutes.toString(),
      durationFormatted,
      quality,
      tags,
      `"${notes}"`,
    ]
  })

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
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

export interface SleepDebtSummary {
  totalDebtMinutes: number
  averageDebtMinutes: number
  daysWithDebt: number
  daysTracked: number
  largestDebtDay: { date: string, debtMinutes: number } | null
  recentTrend: 'improving' | 'worsening' | 'stable'
}

export function calculateSleepDebt(
  today: string,
  sessions: SleepSession[],
  goalHours: number,
  days = 30,
): SleepDebtSummary {
  const history = buildRecentHistory(today, sessions, goalHours, days)
  const trackedDays = history.filter(day => day.minutes > 0 || day.sessions.length > 0)

  if (trackedDays.length === 0) {
    return {
      totalDebtMinutes: 0,
      averageDebtMinutes: 0,
      daysWithDebt: 0,
      daysTracked: 0,
      largestDebtDay: null,
      recentTrend: 'stable',
    }
  }

  const debts = trackedDays.map(day => ({
    date: day.date,
    debtMinutes: Math.max(0, day.goalMinutes - day.minutes),
  }))

  const totalDebtMinutes = debts.reduce((sum, d) => sum + d.debtMinutes, 0)
  const daysWithDebt = debts.filter(d => d.debtMinutes > 0).length
  const largestDebtDay = debts.reduce((max, d) =>
    !max || d.debtMinutes > max.debtMinutes ? d : max,
    null as { date: string, debtMinutes: number } | null,
  )

  // Calculate trend by comparing first half vs second half
  const halfPoint = Math.floor(debts.length / 2)
  const firstHalfAvg = debts.slice(0, halfPoint).reduce((sum, d) => sum + d.debtMinutes, 0) / Math.max(halfPoint, 1)
  const secondHalfAvg = debts.slice(halfPoint).reduce((sum, d) => sum + d.debtMinutes, 0) / Math.max(debts.length - halfPoint, 1)

  let recentTrend: SleepDebtSummary['recentTrend'] = 'stable'
  if (secondHalfAvg < firstHalfAvg * 0.8) recentTrend = 'improving'
  else if (secondHalfAvg > firstHalfAvg * 1.2) recentTrend = 'worsening'

  return {
    totalDebtMinutes,
    averageDebtMinutes: Math.round(totalDebtMinutes / trackedDays.length),
    daysWithDebt,
    daysTracked: trackedDays.length,
    largestDebtDay,
    recentTrend,
  }
}

export interface SocialJetlagSummary {
  weekdayAvgMinutes: number
  weekendAvgMinutes: number
  differenceMinutes: number
  weekdayCount: number
  weekendCount: number
  socialJetlagHours: number
  severity: 'none' | 'mild' | 'moderate' | 'severe'
}

export function calculateSocialJetlag(
  today: string,
  sessions: SleepSession[],
  goalHours: number,
  days = 28,
): SocialJetlagSummary {
  const history = buildRecentHistory(today, sessions, goalHours, days)

  const weekdayDays = history.filter(day => {
    const date = new Date(`${day.date}T00:00:00`)
    const dayOfWeek = date.getDay()
    return dayOfWeek >= 1 && dayOfWeek <= 5 && day.minutes > 0 // Mon-Fri with sleep
  })

  const weekendDays = history.filter(day => {
    const date = new Date(`${day.date}T00:00:00`)
    const dayOfWeek = date.getDay()
    return (dayOfWeek === 0 || dayOfWeek === 6) && day.minutes > 0 // Sat-Sun with sleep
  })

  const weekdayAvgMinutes = weekdayDays.length
    ? weekdayDays.reduce((sum, d) => sum + d.minutes, 0) / weekdayDays.length
    : 0

  const weekendAvgMinutes = weekendDays.length
    ? weekendDays.reduce((sum, d) => sum + d.minutes, 0) / weekendDays.length
    : 0

  const differenceMinutes = Math.abs(weekendAvgMinutes - weekdayAvgMinutes)
  const socialJetlagHours = differenceMinutes / 60

  let severity: SocialJetlagSummary['severity'] = 'none'
  if (socialJetlagHours >= 2) severity = 'severe'
  else if (socialJetlagHours >= 1) severity = 'moderate'
  else if (socialJetlagHours >= 0.5) severity = 'mild'

  return {
    weekdayAvgMinutes: Math.round(weekdayAvgMinutes),
    weekendAvgMinutes: Math.round(weekendAvgMinutes),
    differenceMinutes: Math.round(differenceMinutes),
    weekdayCount: weekdayDays.length,
    weekendCount: weekendDays.length,
    socialJetlagHours: Math.round(socialJetlagHours * 10) / 10,
    severity,
  }
}

export interface SleepRecommendation {
  id: string
  type: 'optimal_time' | 'consistency' | 'goal' | 'debt' | 'jetlag' | 'quality'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action?: string
  actionPath?: string
}

export function generateRecommendations(
  today: string,
  sessions: SleepSession[],
  goalHours: number,
): SleepRecommendation[] {
  const recommendations: SleepRecommendation[] = []
  const history = buildRecentHistory(today, sessions, goalHours, 30)
  const trackedDays = history.filter(day => day.minutes > 0)

  if (trackedDays.length === 0) {
    recommendations.push({
      id: 'first_session',
      type: 'goal',
      priority: 'high',
      title: 'Start Tracking',
      description: 'You haven\'t logged any sleep yet. Start by recording your first sleep session.',
      action: 'Log Sleep',
      actionPath: '/timer',
    })
    return recommendations
  }

  // Check sleep debt
  const debt = calculateSleepDebt(today, sessions, goalHours, 14)
  if (debt.totalDebtMinutes > 120) {
    recommendations.push({
      id: 'high_debt',
      type: 'debt',
      priority: 'high',
      title: 'Prioritize Recovery Sleep',
      description: `You have ${formatDurationFromMinutes(debt.totalDebtMinutes)} of sleep debt. Consider adding extra sleep time or naps to recover.`,
      action: 'View Debt',
      actionPath: '/history',
    })
  } else if (debt.recentTrend === 'worsening') {
    recommendations.push({
      id: 'debt_trend',
      type: 'debt',
      priority: 'medium',
      title: 'Sleep Debt Increasing',
      description: 'Your sleep debt is trending upward. Focus on hitting your daily goals this week.',
    })
  }

  // Check social jetlag
  const jetlag = calculateSocialJetlag(today, sessions, goalHours, 21)
  if (jetlag.severity === 'severe' || jetlag.severity === 'moderate') {
    recommendations.push({
      id: 'social_jetlag',
      type: 'jetlag',
      priority: jetlag.severity === 'severe' ? 'high' : 'medium',
      title: 'Reduce Social Jetlag',
      description: `Your weekday vs weekend sleep differs by ${jetlag.socialJetlagHours}h. Try to keep a more consistent schedule.`,
      action: 'View Analysis',
      actionPath: '/history',
    })
  }

  // Analyze best sleep times
  if (sessions.length >= 5) {
    const sessionsWithQuality = sessions.filter(s => s.quality && s.quality >= 4)
    if (sessionsWithQuality.length >= 3) {
      const startHours = sessionsWithQuality.map(s => new Date(s.start).getHours())
      const avgStartHour = Math.round(startHours.reduce((a, b) => a + b, 0) / startHours.length)
      const bestStartTime = `${avgStartHour === 0 ? 12 : avgStartHour > 12 ? avgStartHour - 12 : avgStartHour}:00 ${avgStartHour >= 12 ? 'PM' : 'AM'}`

      recommendations.push({
        id: 'optimal_time',
        type: 'optimal_time',
        priority: 'medium',
        title: 'Optimal Bedtime Found',
        description: `Your best-rated sleep starts around ${bestStartTime}. Try to maintain this schedule.`,
      })
    }
  }

  // Check consistency
  if (trackedDays.length >= 7) {
    const dayOfWeekCounts = trackedDays.reduce((acc, day) => {
      const dow = new Date(`${day.date}T00:00:00`).getDay()
      acc[dow] = (acc[dow] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const missingDays = [1, 2, 3, 4, 5].filter(d => !dayOfWeekCounts[d] || dayOfWeekCounts[d]! < 2)
    if (missingDays.length > 2) {
      recommendations.push({
        id: 'consistency',
        type: 'consistency',
        priority: 'low',
        title: 'Build Weekday Consistency',
        description: 'Track sleep on more weekdays to build a consistent routine.',
      })
    }
  }

  // Check goal achievability
  const goalMetDays = trackedDays.filter(day => day.remainingMinutes === 0).length
  const goalRate = goalMetDays / trackedDays.length

  if (goalRate < 0.3 && trackedDays.length >= 14) {
    recommendations.push({
      id: 'adjust_goal',
      type: 'goal',
      priority: 'medium',
      title: 'Consider Adjusting Goal',
      description: `You've only met your ${goalHours}h goal ${Math.round(goalRate * 100)}% of the time. Consider a more achievable target.`,
      action: 'Adjust Goal',
      actionPath: '/more',
    })
  } else if (goalRate > 0.9 && trackedDays.length >= 14) {
    recommendations.push({
      id: 'increase_goal',
      type: 'goal',
      priority: 'low',
      title: 'Ready for More?',
      description: `You're crushing your ${goalHours}h goal! Consider increasing it for better health.`,
      action: 'Settings',
      actionPath: '/more',
    })
  }

  // Quality-based recommendations
  const sessionsWithTags = sessions.filter(s => s.tags && s.tags.length > 0)
  const tagQuality: Record<string, number[]> = {}
  sessionsWithTags.forEach(s => {
    s.tags?.forEach(tag => {
      if (!tagQuality[tag]) tagQuality[tag] = []
      if (s.quality) tagQuality[tag]!.push(s.quality)
    })
  })

  const bestTag = Object.entries(tagQuality)
    .filter(([_, qualities]) => qualities.length >= 2)
    .sort((a, b) => {
      const avgA = a[1].reduce((s, q) => s + q, 0) / a[1].length
      const avgB = b[1].reduce((s, q) => s + q, 0) / b[1].length
      return avgB - avgA
    })[0]

  if (bestTag && bestTag[1].reduce((s, q) => s + q, 0) / bestTag[1].length >= 4) {
    recommendations.push({
      id: 'quality_tag',
      type: 'quality',
      priority: 'low',
      title: 'Sleep Pattern Insight',
      description: `Sessions tagged "${bestTag[0]}" have your highest quality ratings.`,
    })
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// ============================================================================
// ADVANCED ANALYTICS - Phase 2 Implementation
// ============================================================================

// Sleep Efficiency: Compare time in bed vs actual sleep time
export interface SleepEfficiencyData {
  date: string
  timeInBedMinutes: number
  actualSleepMinutes: number
  efficiency: number // percentage
  sleepLatencyMinutes: number // time to fall asleep
  awakeTimeMinutes: number // time awake during night
}

export function calculateSleepEfficiency(
  sessions: SleepSession[],
  timeInBedMinutes: number,
  latencyMinutes = 15,
  awakeMinutes = 30,
): SleepEfficiencyData[] {
  return sessions.map(session => {
    const actualSleep = getSessionDurationMinutes(session)
    const totalTime = actualSleep + latencyMinutes + awakeMinutes
    const efficiency = Math.round((actualSleep / Math.max(totalTime, 1)) * 100)

    return {
      date: session.start.slice(0, 10),
      timeInBedMinutes: totalTime,
      actualSleepMinutes: actualSleep,
      efficiency: Math.min(efficiency, 100),
      sleepLatencyMinutes: latencyMinutes,
      awakeTimeMinutes: awakeMinutes,
    }
  })
}

// Pattern Detection: Identify deviations from established schedule
export interface SleepPattern {
  averageBedtime: string
  averageWakeTime: string
  stdDevMinutes: number
  consistency: 'high' | 'medium' | 'low'
  typicalDurationMinutes: number
}

export function detectSleepPattern(
  today: string,
  sessions: SleepSession[],
  days = 14,
): SleepPattern | null {
  const history = buildRecentHistory(today, sessions, 8, days)
  const trackedDays = history.filter(day => day.minutes > 0)

  if (trackedDays.length < 5) return null

  const bedtimes = trackedDays.map(day => {
    if (day.sessions.length === 0) return null
    const firstSession = day.sessions.sort((a, b) => a.start.localeCompare(b.start))[0]
    if (!firstSession) return null
    const start = new Date(firstSession.start)
    return start.getHours() * 60 + start.getMinutes()
  }).filter((bt): bt is number => bt !== null)

  const wakeTimes = trackedDays.map(day => {
    if (day.sessions.length === 0) return null
    const lastSession = day.sessions.sort((a, b) => a.end.localeCompare(b.end))[day.sessions.length - 1]
    if (!lastSession) return null
    const end = new Date(lastSession.end)
    return end.getHours() * 60 + end.getMinutes()
  }).filter((wt): wt is number => wt !== null)

  if (bedtimes.length === 0 || wakeTimes.length === 0) return null

  const avgBedtime = Math.round(bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length)
  const avgWakeTime = Math.round(wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length)

  // Calculate standard deviation
  const bedtimeVariance = bedtimes.reduce((sum, bt) => sum + Math.pow(bt - avgBedtime, 2), 0) / bedtimes.length
  const stdDev = Math.round(Math.sqrt(bedtimeVariance))

  const typicalDuration = trackedDays.reduce((sum, day) => sum + day.minutes, 0) / trackedDays.length

  return {
    averageBedtime: formatMinutesToTime(avgBedtime),
    averageWakeTime: formatMinutesToTime(avgWakeTime),
    stdDevMinutes: stdDev,
    consistency: stdDev < 30 ? 'high' : stdDev < 60 ? 'medium' : 'low',
    typicalDurationMinutes: Math.round(typicalDuration),
  }
}

function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

// Goal Achievement Forecast
export interface GoalForecast {
  canReachGoalToday: boolean
  requiredSleepMinutes: number
  suggestedBedtime: string | null
  message: string
}

export function forecastGoalAchievement(
  today: string,
  sessions: SleepSession[],
  goalHours: number,
): GoalForecast {
  const summary = summarizeSleepDay(today, sessions, goalHours)

  if (summary.remainingMinutes === 0) {
    return {
      canReachGoalToday: true,
      requiredSleepMinutes: 0,
      suggestedBedtime: null,
      message: 'Goal completed! Great job.',
    }
  }

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinutes = currentHour * 60 + now.getMinutes()

  // Check if there's still time to reach goal
  const hoursRemaining = 24 - currentHour
  const canReach = summary.remainingMinutes <= hoursRemaining * 60

  if (!canReach) {
    return {
      canReachGoalToday: false,
      requiredSleepMinutes: summary.remainingMinutes,
      suggestedBedtime: null,
      message: `Goal unlikely today. You need ${formatDurationFromMinutes(summary.remainingMinutes)} more.`,
    }
  }

  // Calculate suggested bedtime
  const wakeTimeMinutes = currentMinutes + summary.remainingMinutes + 30 // buffer
  const wakeHour = Math.floor(wakeTimeMinutes / 60) % 24
  const wakeMin = Math.round(wakeTimeMinutes % 60)
  const ampm = wakeHour >= 12 ? 'PM' : 'AM'
  const h12 = wakeHour === 0 ? 12 : wakeHour > 12 ? wakeHour - 12 : wakeHour
  const suggestedBedtime = `${h12}:${wakeMin.toString().padStart(2, '0')} ${ampm}`

  return {
    canReachGoalToday: true,
    requiredSleepMinutes: summary.remainingMinutes,
    suggestedBedtime,
    message: `Sleep now to wake by ${suggestedBedtime} and hit your goal.`,
  }
}

// Compare Periods: Week-over-week or month-over-month
export interface PeriodComparison {
  period1: { label: string; avgMinutes: number; goalMetDays: number; totalDays: number }
  period2: { label: string; avgMinutes: number; goalMetDays: number; totalDays: number }
  difference: number // percentage change
  trend: 'improved' | 'declined' | 'stable'
}

export function comparePeriods(
  today: string,
  sessions: SleepSession[],
  goalHours: number,
  period1Days = 7,
  period2Days = 7,
): PeriodComparison {
  const period1End = today
  const period1Start = addDays(today, -(period1Days - 1))
  const period2End = addDays(period1Start, -1)
  const period2Start = addDays(period2End, -(period2Days - 1))

  const period1History = buildRecentHistory(period1End, sessions, goalHours, period1Days)
  const period2History = buildRecentHistory(period2End, sessions, goalHours, period2Days)

  const p1Tracked = period1History.filter(d => d.minutes > 0)
  const p2Tracked = period2History.filter(d => d.minutes > 0)

  const p1Avg = p1Tracked.length > 0
    ? p1Tracked.reduce((sum, d) => sum + d.minutes, 0) / p1Tracked.length
    : 0
  const p2Avg = p2Tracked.length > 0
    ? p2Tracked.reduce((sum, d) => sum + d.minutes, 0) / p2Tracked.length
    : 0

  const p1GoalsMet = p1Tracked.filter(d => d.remainingMinutes === 0).length
  const p2GoalsMet = p2Tracked.filter(d => d.remainingMinutes === 0).length

  const difference = p2Avg > 0 ? ((p1Avg - p2Avg) / p2Avg) * 100 : 0

  return {
    period1: {
      label: 'This Period',
      avgMinutes: Math.round(p1Avg),
      goalMetDays: p1GoalsMet,
      totalDays: p1Tracked.length,
    },
    period2: {
      label: 'Last Period',
      avgMinutes: Math.round(p2Avg),
      goalMetDays: p2GoalsMet,
      totalDays: p2Tracked.length,
    },
    difference: Math.round(difference * 10) / 10,
    trend: difference > 5 ? 'improved' : difference < -5 ? 'declined' : 'stable',
  }
}

// Sleep Start Time Trends
export interface BedtimeTrend {
  trend: 'earlier' | 'later' | 'stable'
  avgChangeMinutes: number
  message: string
}

export function analyzeBedtimeTrend(
  today: string,
  sessions: SleepSession[],
  weeks = 4,
): BedtimeTrend {
  const daysToAnalyze = weeks * 7
  const history = buildRecentHistory(today, sessions, 8, daysToAnalyze)

  const bedtimes: number[] = []
  history.forEach(day => {
    if (day.sessions.length > 0) {
      const first = day.sessions.sort((a, b) => a.start.localeCompare(b.start))[0]
      if (first) {
        const start = new Date(first.start)
        // Convert to minutes from midnight, handling cross-midnight
        let minutes = start.getHours() * 60 + start.getMinutes()
        if (minutes < 360) minutes += 1440 // Treat early morning as late night
        bedtimes.push(minutes)
      }
    }
  })

  if (bedtimes.length < 10) {
    return { trend: 'stable', avgChangeMinutes: 0, message: 'Not enough data to detect trend' }
  }

  const half = Math.floor(bedtimes.length / 2)
  const recent = bedtimes.slice(0, half)
  const older = bedtimes.slice(half)

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

  const diff = recentAvg - olderAvg

  if (Math.abs(diff) < 15) {
    return { trend: 'stable', avgChangeMinutes: 0, message: 'Your bedtime is consistent' }
  }

  const trend: 'earlier' | 'later' = diff < 0 ? 'earlier' : 'later'
  const minutes = Math.round(Math.abs(diff))

  return {
    trend,
    avgChangeMinutes: minutes,
    message: `You're going to bed ${minutes} minutes ${trend} than before`,
  }
}

// Tag Effectiveness Analysis
export interface TagEffectiveness {
  tag: string
  avgQuality: number
  sessionCount: number
  vsOverallAvg: number // percentage difference
  recommendation: string
}

export function analyzeTagEffectiveness(sessions: SleepSession[]): TagEffectiveness[] {
  const sessionsWithQuality = sessions.filter(s => s.quality !== undefined)
  if (sessionsWithQuality.length === 0) return []

  const overallAvg = sessionsWithQuality.reduce((sum, s) => sum + (s.quality || 0), 0) / sessionsWithQuality.length

  const tagData: Record<string, number[]> = {}

  sessionsWithQuality.forEach(session => {
    session.tags?.forEach(tag => {
      if (!tagData[tag]) tagData[tag] = []
      tagData[tag].push(session.quality || 0)
    })
  })

  return Object.entries(tagData)
    .filter(([_, qualities]) => qualities.length >= 2)
    .map(([tag, qualities]) => {
      const avg = qualities.reduce((a, b) => a + b, 0) / qualities.length
      const vsOverall = ((avg - overallAvg) / overallAvg) * 100

      let recommendation = ''
      if (avg >= 4.5) recommendation = 'Excellent for quality sleep'
      else if (avg >= 4) recommendation = 'Good for quality sleep'
      else if (avg >= 3) recommendation = 'Average quality impact'
      else recommendation = 'May hurt sleep quality'

      return {
        tag,
        avgQuality: Math.round(avg * 10) / 10,
        sessionCount: qualities.length,
        vsOverallAvg: Math.round(vsOverall),
        recommendation,
      }
    })
    .sort((a, b) => b.avgQuality - a.avgQuality)
}

// Smart Alarm: Find optimal wake time within a window before the set alarm
export function calculateSmartAlarmTime(
  sleepStartTime: Date,
  alarmTime: string, // HH:mm
  windowMinutes: number,
): OptimalWakeTime | null {
  const [alarmHours, alarmMins] = alarmTime.split(':').map(Number)
  const alarmDate = new Date(sleepStartTime)
  alarmDate.setHours(alarmHours || 0, alarmMins || 0, 0, 0)

  // If alarm time is before sleep start, it must be the next day
  if (alarmDate.getTime() <= sleepStartTime.getTime()) {
    alarmDate.setDate(alarmDate.getDate() + 1)
  }

  const windowStart = new Date(alarmDate.getTime() - windowMinutes * 60 * 1000)
  const optimalTimes = calculateOptimalWakeTimes(sleepStartTime)

  // Find the optimal wake time that falls within the smart window
  const withinWindow = optimalTimes.filter(wt => {
    const wakeDate = new Date(wt.wakeTime)
    return wakeDate.getTime() >= windowStart.getTime() && wakeDate.getTime() <= alarmDate.getTime()
  })

  if (withinWindow.length === 0) return null

  // Prefer the one closest to the alarm time (latest within window)
  return withinWindow[withinWindow.length - 1] ?? null
}

// Auto Backup Function
export function generateAutoBackup(sessions: SleepSession[], settings: SleepSettings) {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    settings,
    sessions,
    autoBackup: true,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `sleep-tracker-auto-backup-${getDateKey(new Date())}.json`
  link.click()
  URL.revokeObjectURL(url)
}

// Session Recovery: Check for interrupted timer
export function checkInterruptedSession(): { hasInterrupted: boolean; startTime: string | null; durationMinutes: number } {
  if (typeof localStorage === 'undefined') {
    return { hasInterrupted: false, startTime: null, durationMinutes: 0 }
  }

  const activeStart = localStorage.getItem('sleep-tracker-active-session-start')
  if (!activeStart) {
    return { hasInterrupted: false, startTime: null, durationMinutes: 0 }
  }

  const start = new Date(activeStart).getTime()
  const now = Date.now()
  const duration = Math.round((now - start) / (60 * 1000))

  // Consider it interrupted if it's been more than 12 hours
  const isInterrupted = duration > 12 * 60

  return {
    hasInterrupted: isInterrupted,
    startTime: activeStart,
    durationMinutes: isInterrupted ? 0 : duration,
  }
}

// Data Validation: Check and repair corrupted data
export function validateAndRepairData(
  sessions: SleepSession[],
): { isValid: boolean; repaired: SleepSession[]; errors: string[] } {
  const errors: string[] = []
  const repaired: SleepSession[] = []

  sessions.forEach((session, index) => {
    const issues: string[] = []

    // Check required fields
    if (!session.id) issues.push('Missing ID')
    if (!session.start) issues.push('Missing start time')
    if (!session.end) issues.push('Missing end time')
    if (!session.createdAt) issues.push('Missing createdAt')

    // Check validity
    const start = new Date(session.start).getTime()
    const end = new Date(session.end).getTime()

    if (Number.isNaN(start)) issues.push('Invalid start date')
    if (Number.isNaN(end)) issues.push('Invalid end date')
    if (end <= start) issues.push('End before start')

    if (issues.length > 0) {
      errors.push(`Session ${index + 1}: ${issues.join(', ')}`)

      // Try to repair
      const repairedSession: SleepSession = {
        ...session,
        id: session.id || crypto.randomUUID(),
        createdAt: session.createdAt || new Date().toISOString(),
      }

      // If dates are invalid, skip this session
      if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
        repaired.push(repairedSession)
      }
    } else {
      repaired.push(session)
    }
  })

  return {
    isValid: errors.length === 0,
    repaired,
    errors,
  }
}
