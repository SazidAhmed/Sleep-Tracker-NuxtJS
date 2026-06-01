/**
 * Unit tests for sleep/format.ts
 * Pure formatting functions — no side effects, fully deterministic.
 */
import { describe, it, expect } from 'vitest'
import {
  formatDurationFromMinutes,
  formatDateLabel,
  formatTimeLabel,
  formatDateTimeLabel,
  formatMonthLabel,
  formatMinutesToTime,
  getDateKey,
  addDays,
  toDateTimeLocalValue,
  getQualityEmoji,
  getQualityLabel,
  getSessionDurationMinutes,
  isSessionValid,
} from '../sleep/format'
import type { SleepSession } from '../sleep/types'

// ─── formatDurationFromMinutes ───────────────────────────────────────────────

describe('formatDurationFromMinutes', () => {
  it('returns only minutes when under an hour', () => {
    expect(formatDurationFromMinutes(45)).toBe('45m')
  })

  it('returns only hours when no remainder', () => {
    expect(formatDurationFromMinutes(120)).toBe('2h')
  })

  it('returns hours and minutes when both exist', () => {
    expect(formatDurationFromMinutes(90)).toBe('1h 30m')
    expect(formatDurationFromMinutes(485)).toBe('8h 5m')
  })

  it('returns 0m for zero input', () => {
    expect(formatDurationFromMinutes(0)).toBe('0m')
  })

  it('rounds fractional minutes', () => {
    expect(formatDurationFromMinutes(90.4)).toBe('1h 30m')
    expect(formatDurationFromMinutes(90.9)).toBe('1h 31m')
  })

  it('handles negative values as 0', () => {
    expect(formatDurationFromMinutes(-10)).toBe('0m')
  })
})

// ─── getDateKey ──────────────────────────────────────────────────────────────

describe('getDateKey', () => {
  it('formats date as YYYY-MM-DD', () => {
    expect(getDateKey(new Date(2024, 0, 5))).toBe('2024-01-05')
    expect(getDateKey(new Date(2024, 11, 31))).toBe('2024-12-31')
  })

  it('pads single-digit months and days', () => {
    expect(getDateKey(new Date(2024, 2, 9))).toBe('2024-03-09')
  })
})

// ─── addDays ─────────────────────────────────────────────────────────────────

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2024-01-28', 5)).toBe('2024-02-02')
  })

  it('subtracts days with negative offset', () => {
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29') // 2024 is leap year
  })

  it('handles year boundaries', () => {
    expect(addDays('2023-12-30', 3)).toBe('2024-01-02')
  })

  it('returns same date with offset 0', () => {
    expect(addDays('2024-06-15', 0)).toBe('2024-06-15')
  })
})

// ─── toDateTimeLocalValue ────────────────────────────────────────────────────

describe('toDateTimeLocalValue', () => {
  it('formats as datetime-local input value', () => {
    const d = new Date(2024, 4, 15, 9, 5) // May 15 2024 09:05
    expect(toDateTimeLocalValue(d)).toBe('2024-05-15T09:05')
  })

  it('pads hours and minutes', () => {
    const d = new Date(2024, 0, 1, 1, 1)
    expect(toDateTimeLocalValue(d)).toBe('2024-01-01T01:01')
  })
})

// ─── getQualityEmoji ─────────────────────────────────────────────────────────

describe('getQualityEmoji', () => {
  it('returns correct emoji for each quality', () => {
    expect(getQualityEmoji(1)).toBe('😫')
    expect(getQualityEmoji(2)).toBe('😕')
    expect(getQualityEmoji(3)).toBe('😐')
    expect(getQualityEmoji(4)).toBe('😊')
    expect(getQualityEmoji(5)).toBe('😴')
  })

  it('returns ○ for undefined', () => {
    expect(getQualityEmoji(undefined)).toBe('○')
  })

  it('returns ○ for 0', () => {
    expect(getQualityEmoji(0)).toBe('○')
  })
})

// ─── getQualityLabel ─────────────────────────────────────────────────────────

describe('getQualityLabel', () => {
  it('returns correct label for each quality', () => {
    expect(getQualityLabel(1)).toBe('Poor')
    expect(getQualityLabel(2)).toBe('Fair')
    expect(getQualityLabel(3)).toBe('Average')
    expect(getQualityLabel(4)).toBe('Good')
    expect(getQualityLabel(5)).toBe('Excellent')
  })

  it('returns Not rated for undefined', () => {
    expect(getQualityLabel(undefined)).toBe('Not rated')
  })
})

// ─── getSessionDurationMinutes ───────────────────────────────────────────────

describe('getSessionDurationMinutes', () => {
  function makeSession(startIso: string, endIso: string): SleepSession {
    return { id: '1', createdAt: startIso, start: startIso, end: endIso }
  }

  it('returns duration in minutes', () => {
    const s = makeSession('2024-01-15T22:00:00', '2024-01-16T06:00:00')
    expect(getSessionDurationMinutes(s)).toBe(480)
  })

  it('returns 0 when end <= start', () => {
    const s = makeSession('2024-01-15T06:00:00', '2024-01-15T05:00:00')
    expect(getSessionDurationMinutes(s)).toBe(0)
  })

  it('returns 0 for equal times', () => {
    const s = makeSession('2024-01-15T06:00:00', '2024-01-15T06:00:00')
    expect(getSessionDurationMinutes(s)).toBe(0)
  })

  it('rounds to nearest minute', () => {
    // 90.5 minutes = 90 minutes rounded
    const start = '2024-01-15T22:00:00.000Z'
    const end = new Date(new Date(start).getTime() + 90.5 * 60 * 1000).toISOString()
    const s = makeSession(start, end)
    expect(getSessionDurationMinutes(s)).toBe(91) // rounds up
  })
})

// ─── isSessionValid ───────────────────────────────────────────────────────────

describe('isSessionValid', () => {
  it('returns true for valid session with positive duration', () => {
    const s: SleepSession = { id: '1', createdAt: '', start: '2024-01-15T22:00:00', end: '2024-01-16T06:00:00' }
    expect(isSessionValid(s)).toBe(true)
  })

  it('returns false when end <= start', () => {
    const s: SleepSession = { id: '1', createdAt: '', start: '2024-01-15T06:00:00', end: '2024-01-15T05:00:00' }
    expect(isSessionValid(s)).toBe(false)
  })
})

// ─── formatMinutesToTime ──────────────────────────────────────────────────────

describe('formatMinutesToTime', () => {
  it('formats midnight correctly', () => {
    expect(formatMinutesToTime(0)).toBe('12:00 AM')
  })

  it('formats noon correctly', () => {
    expect(formatMinutesToTime(720)).toBe('12:00 PM')
  })

  it('formats afternoon', () => {
    expect(formatMinutesToTime(870)).toBe('2:30 PM') // 14:30
  })

  it('formats 11 PM correctly', () => {
    expect(formatMinutesToTime(1380)).toBe('11:00 PM')
  })
})
