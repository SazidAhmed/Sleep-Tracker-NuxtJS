/**
 * Unit tests for sleep/summary.ts
 * Day/week/month aggregation logic.
 */
import { describe, it, expect } from 'vitest'
import { summarizeSleepDay, buildRecentHistory, calculateStreak, buildGuidance } from '../sleep/summary'
import type { SleepSession, DailySleepSummary } from '../sleep/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSession(
  startIso: string,
  endIso: string,
  overrides: Partial<SleepSession> = {},
): SleepSession {
  return {
    id: crypto.randomUUID(),
    createdAt: startIso,
    start: startIso,
    end: endIso,
    ...overrides,
  }
}

// ─── summarizeSleepDay ───────────────────────────────────────────────────────

describe('summarizeSleepDay', () => {
  it('returns zero summary when no sessions', () => {
    const summary = summarizeSleepDay('2024-01-15', [], 8)
    expect(summary.minutes).toBe(0)
    expect(summary.remainingMinutes).toBe(480)
    expect(summary.percentage).toBe(0)
    expect(summary.sessions).toHaveLength(0)
  })

  it('counts only sessions overlapping the target day', () => {
    const sessions = [
      makeSession('2024-01-15T02:00:00', '2024-01-15T04:00:00'), // 120 min
      makeSession('2024-01-14T22:00:00', '2024-01-14T23:59:00'), // previous day only
    ]
    const summary = summarizeSleepDay('2024-01-15', sessions, 8)
    expect(summary.minutes).toBe(120)
    expect(summary.sessions).toHaveLength(1)
  })

  it('marks goal as complete when remainingMinutes is 0', () => {
    const sessions = [makeSession('2024-01-15T00:00:00', '2024-01-15T08:30:00')]
    const summary = summarizeSleepDay('2024-01-15', sessions, 8)
    expect(summary.remainingMinutes).toBe(0)
    expect(summary.percentage).toBe(100)
  })

  it('handles goal of 0 correctly', () => {
    const sessions = [makeSession('2024-01-15T01:00:00', '2024-01-15T03:00:00')]
    const summary = summarizeSleepDay('2024-01-15', sessions, 0)
    expect(summary.goalMinutes).toBe(0)
    expect(summary.percentage).toBe(0) // no goal means no percentage
  })

  it('caps percentage at 100 even when over goal', () => {
    const sessions = [makeSession('2024-01-15T00:00:00', '2024-01-15T12:00:00')]
    const summary = summarizeSleepDay('2024-01-15', sessions, 8)
    expect(summary.percentage).toBe(100)
  })

  it('sorts sessions by start time', () => {
    const sessions = [
      makeSession('2024-01-15T08:00:00', '2024-01-15T09:00:00'),
      makeSession('2024-01-15T02:00:00', '2024-01-15T04:00:00'),
    ]
    const summary = summarizeSleepDay('2024-01-15', sessions, 8)
    expect(summary.sessions[0]!.start).toBe('2024-01-15T02:00:00')
    expect(summary.sessions[1]!.start).toBe('2024-01-15T08:00:00')
  })
})

// ─── buildRecentHistory ───────────────────────────────────────────────────────

describe('buildRecentHistory', () => {
  it('returns exactly N days', () => {
    const history = buildRecentHistory('2024-01-15', [], 8, 7)
    expect(history).toHaveLength(7)
  })

  it('ends on today', () => {
    const history = buildRecentHistory('2024-01-15', [], 8, 7)
    expect(history[6]!.date).toBe('2024-01-15')
  })

  it('starts N-1 days before today', () => {
    const history = buildRecentHistory('2024-01-15', [], 8, 7)
    expect(history[0]!.date).toBe('2024-01-09')
  })

  it('accepts a function for goalHours', () => {
    const goalFn = (date: string) => date.startsWith('2024-01-14') ? 9 : 8
    const history = buildRecentHistory('2024-01-15', [], goalFn, 2)
    expect(history[0]!.goalMinutes).toBe(9 * 60)
    expect(history[1]!.goalMinutes).toBe(8 * 60)
  })
})

// ─── calculateStreak ─────────────────────────────────────────────────────────

describe('calculateStreak', () => {
  it('returns 0 when no sessions logged', () => {
    expect(calculateStreak('2024-01-15', [], 8)).toBe(0)
  })

  it('counts consecutive days meeting goal', () => {
    const sessions = [
      // 3 consecutive days with 8h each
      makeSession('2024-01-13T00:00:00', '2024-01-13T08:00:00'),
      makeSession('2024-01-14T00:00:00', '2024-01-14T08:00:00'),
      makeSession('2024-01-15T00:00:00', '2024-01-15T08:00:00'),
    ]
    expect(calculateStreak('2024-01-15', sessions, 8)).toBe(3)
  })

  it('skips today if goal not yet met and counts yesterday', () => {
    // Goal not met today, met yesterday
    const sessions = [
      makeSession('2024-01-14T00:00:00', '2024-01-14T08:00:00'),
    ]
    // Today has no sessions → skip today, check yesterday (met) → streak = 1
    expect(calculateStreak('2024-01-15', sessions, 8)).toBe(1)
  })

  it('breaks at first missed day', () => {
    const sessions = [
      makeSession('2024-01-11T00:00:00', '2024-01-11T08:00:00'),
      // 2024-01-12: missed
      makeSession('2024-01-13T00:00:00', '2024-01-13T08:00:00'),
      makeSession('2024-01-14T00:00:00', '2024-01-14T08:00:00'),
    ]
    // Starting from 2024-01-15 (no session today), check backwards
    // 2024-01-14: met, 2024-01-13: met, 2024-01-12: missed → streak = 2
    expect(calculateStreak('2024-01-15', sessions, 8)).toBe(2)
  })
})

// ─── buildGuidance ───────────────────────────────────────────────────────────

describe('buildGuidance', () => {
  function makeSummary(overrides: Partial<DailySleepSummary>): DailySleepSummary {
    return {
      date: '2024-01-15',
      minutes: 0,
      goalMinutes: 480,
      remainingMinutes: 480,
      percentage: 0,
      sessions: [],
      ...overrides,
    }
  }

  it('prompts to set a goal when goalMinutes is 0', () => {
    const summary = makeSummary({ goalMinutes: 0, remainingMinutes: 0 })
    const guidance = buildGuidance(summary, '', new Date())
    expect(guidance).toContain('Set a daily sleep goal')
  })

  it('celebrates when goal is complete', () => {
    const summary = makeSummary({ remainingMinutes: 0 })
    const guidance = buildGuidance(summary, '', new Date())
    expect(guidance).toContain('Goal completed')
  })

  it('gives basic remaining guidance when no anchorTime', () => {
    const summary = makeSummary({ remainingMinutes: 180, minutes: 300, sessions: [{} as any] })
    const guidance = buildGuidance(summary, '', new Date())
    expect(guidance).toContain('3h')
  })

  it('uses anchor time in guidance message', () => {
    const summary = makeSummary({ remainingMinutes: 180, sessions: [] })
    const now = new Date()
    now.setHours(10, 0, 0, 0)
    const guidance = buildGuidance(summary, '10:00', now)
    // Since now === anchorTime, passedAnchor is true (>=), so uses "past" message
    expect(guidance).toContain('past')
  })
})
