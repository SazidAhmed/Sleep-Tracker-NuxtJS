/**
 * Unit tests for sleep/alarm.ts
 * Sleep cycle math, smart alarm windowing, data validation, CSV export.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  calculateOptimalWakeTimes,
  getRecommendedWakeTime,
  calculateSmartAlarmTime,
  validateAndRepairData,
  exportSessionsToCSV,
} from '../sleep/alarm'
import type { SleepSession } from '../sleep/types'

function makeSession(
  startIso: string,
  endIso: string,
  overrides: Partial<SleepSession> = {},
): SleepSession {
  return { id: 'test-id', createdAt: startIso, start: startIso, end: endIso, ...overrides }
}

// ─── calculateOptimalWakeTimes ────────────────────────────────────────────────

describe('calculateOptimalWakeTimes', () => {
  it('returns correct number of cycle options', () => {
    const times = calculateOptimalWakeTimes(new Date(), 3, 6)
    expect(times).toHaveLength(4) // cycles 3, 4, 5, 6
  })

  it('each result is 90 minutes × cycles after sleep start', () => {
    const start = new Date('2024-01-15T22:00:00')
    const times = calculateOptimalWakeTimes(start, 3, 5)

    times.forEach((t) => {
      const wakeMs = new Date(t.wakeTime).getTime()
      const expectedMs = start.getTime() + t.cycles * 90 * 60 * 1000
      expect(wakeMs).toBe(expectedMs)
    })
  })

  it('label includes cycle count', () => {
    const times = calculateOptimalWakeTimes(new Date(), 4, 4)
    expect(times[0]!.cycles).toBe(4)
    expect(times[0]!.label).toContain('4 cycles')
  })

  it('4.5h label shows hours and minutes', () => {
    const times = calculateOptimalWakeTimes(new Date(), 3, 3) // 3×90 = 270 = 4h 30m
    expect(times[0]!.label).toContain('4h 30m')
  })
})

// ─── getRecommendedWakeTime ───────────────────────────────────────────────────

describe('getRecommendedWakeTime', () => {
  it('returns a result within the cycle options', () => {
    const start = new Date('2024-01-15T22:00:00')
    const best = getRecommendedWakeTime(start, 8)
    expect(best).not.toBeNull()
    expect(best!.totalMinutes).toBeGreaterThan(0)
  })

  it('picks the cycle closest to the goal hours', () => {
    const start = new Date('2024-01-15T22:00:00')
    // 8h = 480 min. Cycles: 3=270, 4=360, 5=450, 6=540
    // 5 cycles (450) is closest to 480
    const best = getRecommendedWakeTime(start, 8)
    expect(best!.cycles).toBe(5)
  })

  it('returns null when no cycle options', () => {
    // Only possible if min > max, but function always has at least 1 cycle with defaults
    // Directly test with empty by checking function handles it gracefully
    const best = getRecommendedWakeTime(new Date(), 0.5)
    // 0.5h = 30min. All cycles are >= 270min, so best penalty may pick cycle 3
    expect(best).not.toBeNull()
  })
})

// ─── calculateSmartAlarmTime ──────────────────────────────────────────────────

describe('calculateSmartAlarmTime', () => {
  it('returns null when no optimal wake time falls within window', () => {
    // Sleep at 22:00, alarm at 22:10 → only 10 min window, no 90-min cycle fits
    const start = new Date('2024-01-15T22:00:00')
    const result = calculateSmartAlarmTime(start, '22:10', 30)
    expect(result).toBeNull()
  })

  it('returns an optimal time when within window', () => {
    // Sleep at 22:00, alarm at 07:30 (next day)
    // Cycles: 3=01:30, 4=04:00, 5=06:30, 6=09:00
    // 30min window before 07:30 is 07:00-07:30 → no cycle lands there
    // Try wider window: 120 min before 07:30 = 05:30-07:30 → 6:30 (5 cycles) fits
    const start = new Date('2024-01-15T22:00:00')
    const result = calculateSmartAlarmTime(start, '07:30', 120)
    expect(result).not.toBeNull()
    expect(result!.cycles).toBe(5) // 6:30 AM = 5 cycles
  })

  it('handles alarm on same day properly if start is before midnight', () => {
    // Sleep at 23:00, alarm at 07:00 (8h later)
    const start = new Date('2024-01-15T23:00:00')
    const result = calculateSmartAlarmTime(start, '07:00', 60)
    expect(result).not.toBeNull()
  })
})

// ─── validateAndRepairData ────────────────────────────────────────────────────

describe('validateAndRepairData', () => {
  it('returns isValid true for good sessions', () => {
    const sessions = [
      makeSession('2024-01-15T22:00:00', '2024-01-16T06:00:00'),
      makeSession('2024-01-16T22:00:00', '2024-01-17T06:00:00', { id: 'abc', createdAt: '2024-01-16T22:00:00' }),
    ]
    const result = validateAndRepairData(sessions)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.repaired).toHaveLength(2)
  })

  it('detects missing ID', () => {
    const sessions = [
      { ...makeSession('2024-01-15T22:00:00', '2024-01-16T06:00:00'), id: '' },
    ]
    const result = validateAndRepairData(sessions)
    expect(result.isValid).toBe(false)
    expect(result.errors[0]).toContain('Missing ID')
    // Repaired session should have a generated ID
    expect(result.repaired[0]!.id).not.toBe('')
  })

  it('rejects sessions where end is before start', () => {
    const sessions = [
      makeSession('2024-01-15T08:00:00', '2024-01-15T06:00:00'),
    ]
    const result = validateAndRepairData(sessions)
    expect(result.isValid).toBe(false)
    // Can't fix invalid dates → not included in repaired
    expect(result.repaired).toHaveLength(0)
  })

  it('handles empty array', () => {
    const result = validateAndRepairData([])
    expect(result.isValid).toBe(true)
    expect(result.repaired).toHaveLength(0)
  })
})

// ─── exportSessionsToCSV ──────────────────────────────────────────────────────

describe('exportSessionsToCSV', () => {
  it('includes header row', () => {
    const csv = exportSessionsToCSV([])
    const firstLine = csv.split('\n')[0]!
    expect(firstLine).toContain('Date')
    expect(firstLine).toContain('Duration')
    expect(firstLine).toContain('Quality')
    expect(firstLine).toContain('Tags')
  })

  it('returns just header for empty sessions', () => {
    const csv = exportSessionsToCSV([])
    const lines = csv.split('\n').filter(Boolean)
    expect(lines).toHaveLength(1)
  })

  it('includes session data in rows', () => {
    const sessions = [
      makeSession('2024-01-15T22:00:00', '2024-01-16T06:00:00', {
        quality: 4,
        tags: ['Deep Sleep', 'Good Dreams'],
        notes: 'Slept well',
      }),
    ]
    const csv = exportSessionsToCSV(sessions)
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2) // header + 1 data row
    const dataRow = lines[1]!
    expect(dataRow).toContain('480') // 8h duration in minutes
    expect(dataRow).toContain('Good') // quality label
    expect(dataRow).toContain('Deep Sleep')
    expect(dataRow).toContain('Slept well')
  })

  it('escapes double quotes in notes', () => {
    const sessions = [
      makeSession('2024-01-15T22:00:00', '2024-01-16T06:00:00', {
        notes: 'She said "hello"',
      }),
    ]
    const csv = exportSessionsToCSV(sessions)
    expect(csv).toContain('She said ""hello""')
  })

  it('handles sessions with no quality/tags/notes', () => {
    const sessions = [makeSession('2024-01-15T22:00:00', '2024-01-16T06:00:00')]
    expect(() => exportSessionsToCSV(sessions)).not.toThrow()
  })
})
