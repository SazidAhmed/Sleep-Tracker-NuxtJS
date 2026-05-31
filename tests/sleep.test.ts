import { describe, expect, it } from 'vitest'
import {
  calculateOptimalWakeTimes,
  calculateSleepDebt,
  calculateSocialJetlag,
  calculateStreak,
  forecastGoalAchievement,
  getQualityEmoji,
  getQualityLabel,
  isSessionValid,
  summarizeSleepDay,
  type SleepSession,
} from '../app/lib/sleep'

function session(id: string, start: string, end: string): SleepSession {
  return {
    id,
    start,
    end,
    createdAt: start,
  }
}

describe('sleep utilities', () => {
  it('splits sessions across midnight by calendar day', () => {
    const sessions = [
      session('cross-midnight', '2026-05-29T22:30:00', '2026-05-30T01:30:00'),
    ]

    const may29 = summarizeSleepDay('2026-05-29', sessions, 8)
    const may30 = summarizeSleepDay('2026-05-30', sessions, 8)

    expect(may29.minutes).toBe(90)
    expect(may30.minutes).toBe(90)
    expect(may29.remainingMinutes).toBe(390)
    expect(may30.remainingMinutes).toBe(390)
  })

  it('counts consecutive goal-met days and skips an incomplete current day', () => {
    const sessions = [
      session('today-partial', '2026-05-30T01:00:00', '2026-05-30T02:00:00'),
      session('yesterday-full', '2026-05-29T00:00:00', '2026-05-29T08:00:00'),
      session('two-days-full', '2026-05-28T00:00:00', '2026-05-28T08:00:00'),
      session('three-days-partial', '2026-05-27T00:00:00', '2026-05-27T07:00:00'),
    ]

    expect(calculateStreak('2026-05-30', sessions, 8)).toBe(2)
  })

  it('summarizes sleep debt from tracked days only', () => {
    const sessions = [
      session('full', '2026-05-30T00:00:00', '2026-05-30T08:00:00'),
      session('short', '2026-05-29T00:00:00', '2026-05-29T06:00:00'),
    ]

    const debt = calculateSleepDebt('2026-05-30', sessions, 8, 2)

    expect(debt.daysTracked).toBe(2)
    expect(debt.daysWithDebt).toBe(1)
    expect(debt.totalDebtMinutes).toBe(120)
    expect(debt.averageDebtMinutes).toBe(60)
  })

  it('classifies social jetlag from weekday and weekend average differences', () => {
    const sessions = [
      session('monday', '2026-05-25T00:00:00', '2026-05-25T07:00:00'),
      session('tuesday', '2026-05-26T00:00:00', '2026-05-26T07:00:00'),
      session('saturday', '2026-05-30T00:00:00', '2026-05-30T10:00:00'),
      session('sunday', '2026-05-31T00:00:00', '2026-05-31T10:00:00'),
    ]

    const jetlag = calculateSocialJetlag('2026-05-31', sessions, 8, 7)

    expect(jetlag.weekdayAvgMinutes).toBe(420)
    expect(jetlag.weekendAvgMinutes).toBe(600)
    expect(jetlag.differenceMinutes).toBe(180)
    expect(jetlag.severity).toBe('severe')
  })

  it('rejects zero or negative duration sessions', () => {
    expect(isSessionValid(session('valid', '2026-05-30T00:00:00', '2026-05-30T00:01:00'))).toBe(true)
    expect(isSessionValid(session('same', '2026-05-30T00:00:00', '2026-05-30T00:00:00'))).toBe(false)
    expect(isSessionValid(session('negative', '2026-05-30T01:00:00', '2026-05-30T00:00:00'))).toBe(false)
  })

  it('formats quality emoji and labels for rated and unrated values', () => {
    expect(getQualityEmoji(4)).toBe('😊')
    expect(getQualityLabel(4)).toBe('Good')
    expect(getQualityEmoji()).toBe('○')
    expect(getQualityLabel()).toBe('Not rated')
  })

  it('generates wake time suggestions for 90-minute cycles', () => {
    const start = new Date('2026-05-30T22:00:00')
    const options = calculateOptimalWakeTimes(start, 3, 5)
    expect(options).toHaveLength(3)
    expect(options[0].cycles).toBe(3)
    expect(options[options.length - 1].cycles).toBe(5)
    expect(new Date(options[0].wakeTime).getTime()).toBeGreaterThan(start.getTime())
  })

  it('forecasts goal completion when the daily target is already met', () => {
    const sessions = [session('sufficient', '2026-05-30T00:00:00', '2026-05-30T08:00:00')]
    const forecast = forecastGoalAchievement('2026-05-30', sessions, 8)
    expect(forecast.canReachGoalToday).toBe(true)
    expect(forecast.message).toContain('Goal completed')
  })
})
