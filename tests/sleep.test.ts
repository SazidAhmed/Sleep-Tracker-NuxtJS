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
  formatDurationFromMinutes,
  getDateKey,
  addDays,
  getSessionDurationMinutes,
  calculateSmartAlarmTime,
  getRecommendedWakeTime,
  validateAndRepairData,
  type SleepSession,
} from '../app/lib/sleep'

function session(id: string, start: string, end: string, quality?: 1 | 2 | 3 | 4 | 5, tags?: string[]): SleepSession {
  return {
    id,
    start,
    end,
    createdAt: start,
    quality,
    tags,
  }
}

describe('sleep utilities', () => {
  describe('summarizeSleepDay', () => {
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

    it('handles multiple sessions in one day', () => {
      const sessions = [
        session('nap', '2026-05-30T14:00:00', '2026-05-30T15:00:00'),
        session('night', '2026-05-30T23:00:00', '2026-05-31T07:00:00'),
      ]
      const summary = summarizeSleepDay('2026-05-30', sessions, 8)
      expect(summary.minutes).toBe(120) // 60m nap + 60m of night session (23:00-00:00)
    })
  })

  describe('calculateStreak', () => {
    it('counts consecutive goal-met days and skips an incomplete current day', () => {
      const sessions = [
        session('today-partial', '2026-05-30T01:00:00', '2026-05-30T02:00:00'),
        session('yesterday-full', '2026-05-29T00:00:00', '2026-05-29T08:00:00'),
        session('two-days-full', '2026-05-28T00:00:00', '2026-05-28T08:00:00'),
        session('three-days-partial', '2026-05-27T00:00:00', '2026-05-27T07:00:00'),
      ]

      expect(calculateStreak('2026-05-30', sessions, 8)).toBe(2)
    })

    it('returns 0 if yesterday goal was not met', () => {
      const sessions = [
        session('yesterday-short', '2026-05-29T00:00:00', '2026-05-29T04:00:00'),
      ]
      expect(calculateStreak('2026-05-30', sessions, 8)).toBe(0)
    })
  })

  describe('calculateSleepDebt', () => {
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
  })

  describe('calculateSocialJetlag', () => {
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
  })

  describe('isSessionValid', () => {
    it('rejects zero or negative duration sessions', () => {
      expect(isSessionValid(session('valid', '2026-05-30T00:00:00', '2026-05-30T00:01:00'))).toBe(true)
      expect(isSessionValid(session('same', '2026-05-30T00:00:00', '2026-05-30T00:00:00'))).toBe(false)
      expect(isSessionValid(session('negative', '2026-05-30T01:00:00', '2026-05-30T00:00:00'))).toBe(false)
    })
  })

  describe('getQualityEmoji & getQualityLabel', () => {
    it('formats quality emoji and labels for rated and unrated values', () => {
      expect(getQualityEmoji(4)).toBe('😊')
      expect(getQualityLabel(4)).toBe('Good')
      expect(getQualityEmoji()).toBe('○')
      expect(getQualityLabel()).toBe('Not rated')
    })
  })

  describe('calculateOptimalWakeTimes', () => {
    it('generates wake time suggestions for 90-minute cycles', () => {
      const start = new Date('2026-05-30T22:00:00')
      const options = calculateOptimalWakeTimes(start, 3, 5)
      expect(options).toHaveLength(3)
      expect(options[0].cycles).toBe(3)
      expect(options[options.length - 1].cycles).toBe(5)
      expect(new Date(options[0].wakeTime).getTime()).toBeGreaterThan(start.getTime())
    })
  })

  describe('forecastGoalAchievement', () => {
    it('forecasts goal completion when the daily target is already met', () => {
      const sessions = [session('sufficient', '2026-05-30T00:00:00', '2026-05-30T08:00:00')]
      const forecast = forecastGoalAchievement('2026-05-30', sessions, 8)
      expect(forecast.canReachGoalToday).toBe(true)
      expect(forecast.message).toContain('Goal completed')
    })
  })

  describe('Formatting Utilities', () => {
    it('formatDurationFromMinutes formats correctly', () => {
      expect(formatDurationFromMinutes(0)).toBe('0m')
      expect(formatDurationFromMinutes(45)).toBe('45m')
      expect(formatDurationFromMinutes(60)).toBe('1h')
      expect(formatDurationFromMinutes(75)).toBe('1h 15m')
    })

    it('getDateKey returns YYYY-MM-DD', () => {
      const date = new Date(2026, 4, 30) // May 30
      expect(getDateKey(date)).toBe('2026-05-30')
    })

    it('addDays shifts dates correctly', () => {
      expect(addDays('2026-05-30', 1)).toBe('2026-05-31')
      expect(addDays('2026-05-31', 1)).toBe('2026-06-01')
      expect(addDays('2026-05-30', -1)).toBe('2026-05-29')
    })
  })

  describe('Smart Alarm & Recommendations', () => {
    it('calculateSmartAlarmTime finds optimal time in window', () => {
      const start = new Date('2026-05-30T22:00:00')
      // Alarm at 07:15, 30 min window (06:45 - 07:15)
      // Cycles: 22:00 + 6*90m = 22:00 + 9h = 07:00
      const smartTime = calculateSmartAlarmTime(start, '07:15', 30)
      expect(smartTime).not.toBeNull()
      const wakeDate = new Date(smartTime!.wakeTime)
      expect(wakeDate.getHours()).toBe(7)
      expect(wakeDate.getMinutes()).toBe(0)
    })

    it('getRecommendedWakeTime picks closest to goal', () => {
      const start = new Date('2026-05-30T22:00:00')
      const recommended = getRecommendedWakeTime(start, 7.5) // 450 min = 5 cycles
      expect(recommended?.cycles).toBe(5)
    })
  })

  describe('Data Validation & Repair', () => {
    it('detects and repairs invalid sessions', () => {
      const sessions = [
        { id: '', start: '2026-05-30T01:00:00', end: '2026-05-30T02:00:00', createdAt: '' } as any,
        session('invalid', '2026-05-30T02:00:00', '2026-05-30T01:00:00'),
      ]
      const result = validateAndRepairData(sessions)
      expect(result.isValid).toBe(false)
      expect(result.repaired).toHaveLength(1)
      expect(result.repaired[0].id).toBeTruthy()
      expect(result.repaired[0].createdAt).toBeTruthy()
      expect(result.errors).toContain('Session 1: Missing ID, Missing createdAt')
      expect(result.errors).toContain('Session 2: End before start')
    })
  })
})
