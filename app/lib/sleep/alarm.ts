/**
 * sleep/alarm.ts — Smart alarm and optimal wake time calculations
 * 90-minute sleep cycle math, smart alarm windowing, and auto-backup helpers.
 */

import type { OptimalWakeTime, SleepSession, SleepSettings } from './types'
import { getDateKey } from './format'

// ─── Optimal Wake Times ───────────────────────────────────────────────────────

/** Calculate wake time suggestions based on 90-minute sleep cycles */
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

    const timeLabel = wakeTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    const hours = totalMinutes / 60
    const durationLabel = hours % 1 === 0 ? `${hours}h` : `${Math.floor(hours)}h ${totalMinutes % 60}m`

    results.push({
      cycles,
      wakeTime: wakeTime.toISOString(),
      totalMinutes,
      label: `${timeLabel} · ${durationLabel} · ${cycles} cycles`,
    })
  }

  return results
}

/** Pick the optimal wake time closest to the user's sleep goal */
export function getRecommendedWakeTime(
  sleepStartTime: Date,
  goalHours: number,
): OptimalWakeTime | null {
  const optimalTimes = calculateOptimalWakeTimes(sleepStartTime)
  if (optimalTimes.length === 0) return null

  const goalMinutes = goalHours * 60
  let best = optimalTimes[0]!
  let bestDiff = Math.abs(best.totalMinutes - goalMinutes)

  for (const time of optimalTimes) {
    const diff = Math.abs(time.totalMinutes - goalMinutes)
    const adjustedDiff = time.totalMinutes > goalMinutes ? diff * 1.5 : diff
    if (adjustedDiff < bestDiff) {
      best = time
      bestDiff = adjustedDiff
    }
  }

  return best
}

/** Find an optimal wake time within the smart alarm window before the alarm fires */
export function calculateSmartAlarmTime(
  sleepStartTime: Date,
  alarmTime: string, // HH:mm
  windowMinutes: number,
): OptimalWakeTime | null {
  const [alarmHours, alarmMins] = alarmTime.split(':').map(Number)
  const alarmDate = new Date(sleepStartTime)
  alarmDate.setHours(alarmHours || 0, alarmMins || 0, 0, 0)

  if (alarmDate.getTime() <= sleepStartTime.getTime()) {
    alarmDate.setDate(alarmDate.getDate() + 1)
  }

  const windowStart = new Date(alarmDate.getTime() - windowMinutes * 60 * 1000)
  const optimalTimes = calculateOptimalWakeTimes(sleepStartTime)

  const withinWindow = optimalTimes.filter((wt) => {
    const wakeDate = new Date(wt.wakeTime)
    return wakeDate.getTime() >= windowStart.getTime() && wakeDate.getTime() <= alarmDate.getTime()
  })

  return withinWindow[withinWindow.length - 1] ?? null
}

// ─── Backup & Recovery ────────────────────────────────────────────────────────

/** Trigger a browser download of an auto-backup JSON file */
export function generateAutoBackup(sessions: SleepSession[], settings: SleepSettings): void {
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

/** Check localStorage for an interrupted active timer session */
export function checkInterruptedSession(): {
  hasInterrupted: boolean
  startTime: string | null
  durationMinutes: number
} {
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
  const isInterrupted = duration > 12 * 60

  return { hasInterrupted: isInterrupted, startTime: activeStart, durationMinutes: isInterrupted ? 0 : duration }
}

// ─── Data Validation ──────────────────────────────────────────────────────────

export function validateAndRepairData(sessions: SleepSession[]): {
  isValid: boolean
  repaired: SleepSession[]
  errors: string[]
} {
  const errors: string[] = []
  const repaired: SleepSession[] = []

  sessions.forEach((session, index) => {
    const issues: string[] = []

    if (!session.id) issues.push('Missing ID')
    if (!session.start) issues.push('Missing start time')
    if (!session.end) issues.push('Missing end time')
    if (!session.createdAt) issues.push('Missing createdAt')

    const start = new Date(session.start).getTime()
    const end = new Date(session.end).getTime()

    if (Number.isNaN(start)) issues.push('Invalid start date')
    if (Number.isNaN(end)) issues.push('Invalid end date')
    if (end <= start) issues.push('End before start')

    if (issues.length > 0) {
      errors.push(`Session ${index + 1}: ${issues.join(', ')}`)
      const repairedSession: SleepSession = {
        ...session,
        id: session.id || crypto.randomUUID(),
        createdAt: session.createdAt || new Date().toISOString(),
      }
      if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
        repaired.push(repairedSession)
      }
    }
    else {
      repaired.push(session)
    }
  })

  return { isValid: errors.length === 0, repaired, errors }
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

import { getSessionDurationMinutes, formatDurationFromMinutes, getQualityLabel } from './format'

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
    return [date, startTime, endTime, durationMinutes.toString(), durationFormatted, quality, tags, `"${notes}"`]
  })

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}
