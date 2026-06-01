/**
 * sleep/analytics.ts — Advanced sleep analytics computations
 * Sleep debt, social jetlag, period comparison, bedtime trends, tag effectiveness,
 * sleep score, and sleep regularity index (SRI).
 */

import type {
  SleepSession,
  SleepDebtSummary,
  SocialJetlagSummary,
  SleepRecommendation,
  SleepEfficiencyData,
  SleepPattern,
  GoalForecast,
  PeriodComparison,
  BedtimeTrend,
  TagEffectiveness,
  SleepScore,
} from './types'
import { addDays, formatDurationFromMinutes, formatMinutesToTime, getSessionDurationMinutes } from './format'
import { buildRecentHistory, summarizeSleepDay } from './summary'

// ─── Sleep Debt ───────────────────────────────────────────────────────────────

export function calculateSleepDebt(
  today: string,
  sessions: SleepSession[],
  goalHours: number | ((date: string) => number),
  days = 30,
): SleepDebtSummary {
  const history = buildRecentHistory(today, sessions, goalHours, days)
  const trackedDays = history.filter(day => day.minutes > 0 || day.sessions.length > 0)

  if (trackedDays.length === 0) {
    return { totalDebtMinutes: 0, averageDebtMinutes: 0, daysWithDebt: 0, daysTracked: 0, largestDebtDay: null, recentTrend: 'stable' }
  }

  const debts = trackedDays.map(day => ({
    date: day.date,
    debtMinutes: Math.max(0, day.goalMinutes - day.minutes),
  }))

  const totalDebtMinutes = debts.reduce((sum, d) => sum + d.debtMinutes, 0)
  const daysWithDebt = debts.filter(d => d.debtMinutes > 0).length
  const largestDebtDay = debts.reduce(
    (max, d) => !max || d.debtMinutes > max.debtMinutes ? d : max,
    null as { date: string; debtMinutes: number } | null,
  )

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

// ─── Social Jetlag ────────────────────────────────────────────────────────────

export function calculateSocialJetlag(
  today: string,
  sessions: SleepSession[],
  goalHours: number | ((date: string) => number),
  days = 28,
): SocialJetlagSummary {
  const history = buildRecentHistory(today, sessions, goalHours, days)

  const weekdayDays = history.filter((day) => {
    const dayOfWeek = new Date(`${day.date}T00:00:00`).getDay()
    return dayOfWeek >= 1 && dayOfWeek <= 5 && day.minutes > 0
  })

  const weekendDays = history.filter((day) => {
    const dayOfWeek = new Date(`${day.date}T00:00:00`).getDay()
    return (dayOfWeek === 0 || dayOfWeek === 6) && day.minutes > 0
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

// ─── Recommendations ─────────────────────────────────────────────────────────

export function generateRecommendations(
  today: string,
  sessions: SleepSession[],
  goalHours: number | ((date: string) => number),
): SleepRecommendation[] {
  const recommendations: SleepRecommendation[] = []
  const history = buildRecentHistory(today, sessions, goalHours, 30)
  const trackedDays = history.filter(day => day.minutes > 0)

  if (trackedDays.length === 0) {
    return [{
      id: 'first_session', type: 'goal', priority: 'high',
      title: 'Start Tracking',
      description: 'You haven\'t logged any sleep yet. Start by recording your first sleep session.',
      action: 'Log Sleep', actionPath: '/timer',
    }]
  }

  const debt = calculateSleepDebt(today, sessions, goalHours, 14)
  if (debt.totalDebtMinutes > 120) {
    recommendations.push({ id: 'high_debt', type: 'debt', priority: 'high', title: 'Prioritize Recovery Sleep', description: `You have ${formatDurationFromMinutes(debt.totalDebtMinutes)} of sleep debt. Consider adding extra sleep time or naps to recover.`, action: 'View Debt', actionPath: '/history' })
  }
  else if (debt.recentTrend === 'worsening') {
    recommendations.push({ id: 'debt_trend', type: 'debt', priority: 'medium', title: 'Sleep Debt Increasing', description: 'Your sleep debt is trending upward. Focus on hitting your daily goals this week.' })
  }

  const jetlag = calculateSocialJetlag(today, sessions, goalHours, 21)
  if (jetlag.severity === 'severe' || jetlag.severity === 'moderate') {
    recommendations.push({ id: 'social_jetlag', type: 'jetlag', priority: jetlag.severity === 'severe' ? 'high' : 'medium', title: 'Reduce Social Jetlag', description: `Your weekday vs weekend sleep differs by ${jetlag.socialJetlagHours}h. Try to keep a more consistent schedule.`, action: 'View Analysis', actionPath: '/history' })
  }

  if (sessions.length >= 5) {
    const sessionsWithQuality = sessions.filter(s => s.quality && s.quality >= 4)
    if (sessionsWithQuality.length >= 3) {
      const startHours = sessionsWithQuality.map(s => new Date(s.start).getHours())
      const avgStartHour = Math.round(startHours.reduce((a, b) => a + b, 0) / startHours.length)
      const bestStartTime = `${avgStartHour === 0 ? 12 : avgStartHour > 12 ? avgStartHour - 12 : avgStartHour}:00 ${avgStartHour >= 12 ? 'PM' : 'AM'}`
      recommendations.push({ id: 'optimal_time', type: 'optimal_time', priority: 'medium', title: 'Optimal Bedtime Found', description: `Your best-rated sleep starts around ${bestStartTime}. Try to maintain this schedule.` })
    }
  }

  if (trackedDays.length >= 7) {
    const dayOfWeekCounts = trackedDays.reduce((acc, day) => {
      const dow = new Date(`${day.date}T00:00:00`).getDay()
      acc[dow] = (acc[dow] || 0) + 1
      return acc
    }, {} as Record<number, number>)
    const missingDays = [1, 2, 3, 4, 5].filter(d => !dayOfWeekCounts[d] || dayOfWeekCounts[d]! < 2)
    if (missingDays.length > 2) {
      recommendations.push({ id: 'consistency', type: 'consistency', priority: 'low', title: 'Build Weekday Consistency', description: 'Track sleep on more weekdays to build a consistent routine.' })
    }
  }

  const goalMetDays = trackedDays.filter(day => day.remainingMinutes === 0).length
  const goalRate = goalMetDays / trackedDays.length
  const resolvedGoalHours = typeof goalHours === 'function' ? goalHours(today) : goalHours

  if (goalRate < 0.3 && trackedDays.length >= 14) {
    recommendations.push({ id: 'adjust_goal', type: 'goal', priority: 'medium', title: 'Consider Adjusting Goal', description: `You've only met your ${resolvedGoalHours}h goal ${Math.round(goalRate * 100)}% of the time. Consider a more achievable target.`, action: 'Adjust Goal', actionPath: '/more' })
  }
  else if (goalRate > 0.9 && trackedDays.length >= 14) {
    recommendations.push({ id: 'increase_goal', type: 'goal', priority: 'low', title: 'Ready for More?', description: `You're crushing your ${resolvedGoalHours}h goal! Consider increasing it for better health.`, action: 'Settings', actionPath: '/more' })
  }

  const tagQuality: Record<string, number[]> = {}
  sessions.filter(s => s.tags && s.tags.length > 0).forEach((s) => {
    s.tags?.forEach((tag) => {
      if (!tagQuality[tag]) tagQuality[tag] = []
      if (s.quality) tagQuality[tag]!.push(s.quality)
    })
  })

  const bestTag = Object.entries(tagQuality)
    .filter(([, qualities]) => qualities.length >= 2)
    .sort((a, b) => {
      const avgA = a[1].reduce((s, q) => s + q, 0) / a[1].length
      const avgB = b[1].reduce((s, q) => s + q, 0) / b[1].length
      return avgB - avgA
    })[0]

  if (bestTag && bestTag[1].reduce((s, q) => s + q, 0) / bestTag[1].length >= 4) {
    recommendations.push({ id: 'quality_tag', type: 'quality', priority: 'low', title: 'Sleep Pattern Insight', description: `Sessions tagged "${bestTag[0]}" have your highest quality ratings.` })
  }

  return recommendations.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  })
}

// ─── Sleep Efficiency ────────────────────────────────────────────────────────

export function calculateSleepEfficiency(
  sessions: SleepSession[],
  latencyMinutes = 15,
  awakeMinutes = 30,
): SleepEfficiencyData[] {
  return sessions.map((session) => {
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

// ─── Pattern Detection ────────────────────────────────────────────────────────

export function detectSleepPattern(
  today: string,
  sessions: SleepSession[],
  days = 14,
): SleepPattern | null {
  const history = buildRecentHistory(today, sessions, 8, days)
  const trackedDays = history.filter(day => day.minutes > 0)

  if (trackedDays.length < 5) return null

  const bedtimes = trackedDays.map((day) => {
    if (day.sessions.length === 0) return null
    const first = day.sessions.sort((a, b) => a.start.localeCompare(b.start))[0]
    if (!first) return null
    const start = new Date(first.start)
    return start.getHours() * 60 + start.getMinutes()
  }).filter((bt): bt is number => bt !== null)

  const wakeTimes = trackedDays.map((day) => {
    if (day.sessions.length === 0) return null
    const last = day.sessions.sort((a, b) => a.end.localeCompare(b.end))[day.sessions.length - 1]
    if (!last) return null
    const end = new Date(last.end)
    return end.getHours() * 60 + end.getMinutes()
  }).filter((wt): wt is number => wt !== null)

  if (bedtimes.length === 0 || wakeTimes.length === 0) return null

  const avgBedtime = Math.round(bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length)
  const avgWakeTime = Math.round(wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length)
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

// ─── Goal Forecast ────────────────────────────────────────────────────────────

export function forecastGoalAchievement(
  today: string,
  sessions: SleepSession[],
  goalHours: number | ((date: string) => number),
): GoalForecast {
  const hours = typeof goalHours === 'function' ? goalHours(today) : goalHours
  const summary = summarizeSleepDay(today, sessions, hours)

  if (summary.remainingMinutes === 0) {
    return { canReachGoalToday: true, requiredSleepMinutes: 0, suggestedBedtime: null, message: 'Goal completed! Great job.' }
  }

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinutes = currentHour * 60 + now.getMinutes()
  const hoursRemaining = 24 - currentHour
  const canReach = summary.remainingMinutes <= hoursRemaining * 60

  if (!canReach) {
    return { canReachGoalToday: false, requiredSleepMinutes: summary.remainingMinutes, suggestedBedtime: null, message: `Goal unlikely today. You need ${formatDurationFromMinutes(summary.remainingMinutes)} more.` }
  }

  const wakeTimeMinutes = currentMinutes + summary.remainingMinutes + 30
  const wakeHour = Math.floor(wakeTimeMinutes / 60) % 24
  const wakeMin = Math.round(wakeTimeMinutes % 60)
  const ampm = wakeHour >= 12 ? 'PM' : 'AM'
  const h12 = wakeHour === 0 ? 12 : wakeHour > 12 ? wakeHour - 12 : wakeHour
  const suggestedBedtime = `${h12}:${wakeMin.toString().padStart(2, '0')} ${ampm}`

  return { canReachGoalToday: true, requiredSleepMinutes: summary.remainingMinutes, suggestedBedtime, message: `Sleep now to wake by ${suggestedBedtime} and hit your goal.` }
}

// ─── Period Comparison ────────────────────────────────────────────────────────

export function comparePeriods(
  today: string,
  sessions: SleepSession[],
  goalHours: number | ((date: string) => number),
  period1Days = 7,
  period2Days = 7,
): PeriodComparison {
  const period1End = today
  const period1Start = addDays(today, -(period1Days - 1))
  const period2End = addDays(period1Start, -1)

  const period1History = buildRecentHistory(period1End, sessions, goalHours, period1Days)
  const period2History = buildRecentHistory(period2End, sessions, goalHours, period2Days)

  const p1Tracked = period1History.filter(d => d.minutes > 0)
  const p2Tracked = period2History.filter(d => d.minutes > 0)

  const p1Avg = p1Tracked.length > 0 ? p1Tracked.reduce((sum, d) => sum + d.minutes, 0) / p1Tracked.length : 0
  const p2Avg = p2Tracked.length > 0 ? p2Tracked.reduce((sum, d) => sum + d.minutes, 0) / p2Tracked.length : 0

  const p1GoalsMet = p1Tracked.filter(d => d.remainingMinutes === 0).length
  const p2GoalsMet = p2Tracked.filter(d => d.remainingMinutes === 0).length
  const difference = p2Avg > 0 ? ((p1Avg - p2Avg) / p2Avg) * 100 : 0

  return {
    period1: { label: 'This Period', avgMinutes: Math.round(p1Avg), goalMetDays: p1GoalsMet, totalDays: p1Tracked.length },
    period2: { label: 'Last Period', avgMinutes: Math.round(p2Avg), goalMetDays: p2GoalsMet, totalDays: p2Tracked.length },
    difference: Math.round(difference * 10) / 10,
    trend: difference > 5 ? 'improved' : difference < -5 ? 'declined' : 'stable',
  }
}

// ─── Bedtime Trend ────────────────────────────────────────────────────────────

export function analyzeBedtimeTrend(
  today: string,
  sessions: SleepSession[],
  weeks = 4,
): BedtimeTrend {
  const history = buildRecentHistory(today, sessions, 8, weeks * 7)

  const bedtimes: number[] = []
  history.forEach((day) => {
    if (day.sessions.length > 0) {
      const first = day.sessions.sort((a, b) => a.start.localeCompare(b.start))[0]
      if (first) {
        const start = new Date(first.start)
        let minutes = start.getHours() * 60 + start.getMinutes()
        if (minutes < 360) minutes += 1440
        bedtimes.push(minutes)
      }
    }
  })

  if (bedtimes.length < 10) return { trend: 'stable', avgChangeMinutes: 0, message: 'Not enough data to detect trend' }

  const half = Math.floor(bedtimes.length / 2)
  const recentAvg = bedtimes.slice(0, half).reduce((a, b) => a + b, 0) / half
  const olderAvg = bedtimes.slice(half).reduce((a, b) => a + b, 0) / (bedtimes.length - half)
  const diff = recentAvg - olderAvg

  if (Math.abs(diff) < 15) return { trend: 'stable', avgChangeMinutes: 0, message: 'Your bedtime is consistent' }

  const trend: 'earlier' | 'later' = diff < 0 ? 'earlier' : 'later'
  const minutes = Math.round(Math.abs(diff))
  return { trend, avgChangeMinutes: minutes, message: `You're going to bed ${minutes} minutes ${trend} than before` }
}

// ─── Tag Effectiveness ────────────────────────────────────────────────────────

export function analyzeTagEffectiveness(sessions: SleepSession[]): TagEffectiveness[] {
  const sessionsWithQuality = sessions.filter(s => s.quality !== undefined)
  if (sessionsWithQuality.length === 0) return []

  const overallAvg = sessionsWithQuality.reduce((sum, s) => sum + (s.quality || 0), 0) / sessionsWithQuality.length
  const tagData: Record<string, number[]> = {}

  sessionsWithQuality.forEach((session) => {
    session.tags?.forEach((tag) => {
      if (!tagData[tag]) tagData[tag] = []
      tagData[tag].push(session.quality || 0)
    })
  })

  return Object.entries(tagData)
    .filter(([, qualities]) => qualities.length >= 2)
    .map(([tag, qualities]) => {
      const avg = qualities.reduce((a, b) => a + b, 0) / qualities.length
      const vsOverall = ((avg - overallAvg) / overallAvg) * 100
      const recommendation = avg >= 4.5 ? 'Excellent for quality sleep' : avg >= 4 ? 'Good for quality sleep' : avg >= 3 ? 'Average quality impact' : 'May hurt sleep quality'
      return { tag, avgQuality: Math.round(avg * 10) / 10, sessionCount: qualities.length, vsOverallAvg: Math.round(vsOverall), recommendation }
    })
    .sort((a, b) => b.avgQuality - a.avgQuality)
}

// ─── Sleep Score ──────────────────────────────────────────────────────────────

export function calculateSleepScore(
  today: string,
  sessions: SleepSession[],
  goalHours: number | ((date: string) => number),
): SleepScore {
  const todayGoal = typeof goalHours === 'function' ? goalHours(today) : goalHours
  const todaySummary = summarizeSleepDay(today, sessions, todayGoal)
  const durationScore = Math.round((todaySummary.percentage / 100) * 50)

  const last7 = buildRecentHistory(today, sessions, goalHours, 7)
  const trackedLast7 = last7.filter(d => d.minutes > 0 && d.sessions.length > 0)

  let consistencyScore = 0
  if (trackedLast7.length >= 2) {
    const bedtimeMinutes = trackedLast7.map((day) => {
      const first = day.sessions.sort((a, b) => a.start.localeCompare(b.start))[0]
      if (!first) return null
      const d = new Date(first.start)
      return d.getHours() * 60 + d.getMinutes()
    }).filter((v): v is number => v !== null)

    const avg = bedtimeMinutes.reduce((a, b) => a + b, 0) / bedtimeMinutes.length
    const variance = bedtimeMinutes.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / bedtimeMinutes.length
    const stdDev = Math.sqrt(variance)
    consistencyScore = Math.round(Math.max(0, Math.min(20, 20 * (1 - stdDev / 120))))
  }

  const recentQuality = sessions
    .filter(s => s.start.slice(0, 10) >= addDays(today, -7) && s.quality)
    .map(s => s.quality as number)

  const qualityScore = recentQuality.length > 0
    ? Math.round(((recentQuality.reduce((a, b) => a + b, 0) / recentQuality.length) / 5) * 20)
    : 0

  const debt = calculateSleepDebt(today, sessions, goalHours, 7)
  const maxDebt = todayGoal * 60 * 7
  const debtFreeScore = Math.round(Math.max(0, 10 * (1 - debt.totalDebtMinutes / maxDebt)))

  const total = Math.min(100, durationScore + consistencyScore + qualityScore + debtFreeScore)

  let grade: SleepScore['grade'] = 'F'
  let label = 'Critical'
  if (total >= 90) { grade = 'A'; label = 'Excellent' }
  else if (total >= 75) { grade = 'B'; label = 'Good' }
  else if (total >= 55) { grade = 'C'; label = 'Fair' }
  else if (total >= 35) { grade = 'D'; label = 'Poor' }

  return { score: total, grade, label, breakdown: { duration: durationScore, consistency: consistencyScore, quality: qualityScore, debtFree: debtFreeScore } }
}

// ─── Sleep Regularity Index (SRI) ────────────────────────────────────────────

export function calculateSleepRegularityIndex(
  sessions: SleepSession[],
  todayKey: string,
  days = 7,
): number {
  const dates: string[] = []
  for (let i = 0; i < days; i++) dates.push(addDays(todayKey, -i))
  dates.reverse()

  const dailyStates: number[][] = dates.map((dateStr) => {
    const dayStart = new Date(`${dateStr}T00:00:00`).getTime()
    const bins = new Array(96).fill(0)

    const relatedSessions = sessions.filter((session) => {
      const s = new Date(session.start).getTime()
      const e = new Date(session.end).getTime()
      return s < dayStart + 24 * 60 * 60 * 1000 && e > dayStart
    })

    for (let binIndex = 0; binIndex < 96; binIndex++) {
      const binStart = dayStart + binIndex * 15 * 60 * 1000
      const binEnd = binStart + 15 * 60 * 1000
      bins[binIndex] = relatedSessions.some(s => new Date(s.start).getTime() < binEnd && new Date(s.end).getTime() > binStart) ? 1 : 0
    }
    return bins
  })

  let totalBins = 0
  let matches = 0
  for (let d = 0; d < dailyStates.length - 1; d++) {
    const dayA = dailyStates[d]!
    const dayB = dailyStates[d + 1]!
    for (let b = 0; b < 96; b++) {
      if (dayA[b] === dayB[b]) matches++
      totalBins++
    }
  }

  return totalBins === 0 ? 0 : Math.round((matches / totalBins) * 100)
}
