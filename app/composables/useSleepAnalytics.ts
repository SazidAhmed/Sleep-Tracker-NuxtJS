import { useLocalStorage, createGlobalState } from '@vueuse/core'
import { ref, computed } from 'vue'
import {
  calculateSleepDebt,
  calculateSocialJetlag,
  generateRecommendations,
  calculateSleepEfficiency,
  detectSleepPattern,
  forecastGoalAchievement,
  comparePeriods,
  analyzeBedtimeTrend,
  analyzeTagEffectiveness,
  calculateSleepScore,
  calculateSleepRegularityIndex,
  type SleepSession,
  type SleepSettings,
} from '@/lib/sleep'
import { useSleepData } from './useSleepData'

function _useSleepAnalytics() {
  const sleepData = useSleepData()
  const { normalizedSessions, debouncedSessions, todayKey, getGoalHoursForDate, sessions } = sleepData

  const insights = computed(() => {
    const weekHistory = sleepData.weekHistory.value
    const trackedWeek = weekHistory.filter(day => day.minutes > 0)
    const bestDay = trackedWeek.reduce((best, day) => !best || day.minutes > best.minutes ? day : best, trackedWeek[0])
    const lowestDay = trackedWeek.reduce((lowest, day) => !lowest || day.minutes < lowest.minutes ? day : lowest, trackedWeek[0])
    const splitSleepDays = trackedWeek.filter(day => day.sessions.length >= 2).length
    const averageSessionsPerTrackedDay = trackedWeek.length
      ? trackedWeek.reduce((sum, day) => sum + day.sessions.length, 0) / trackedWeek.length
      : 0

    const startHourCounts = normalizedSessions.value.reduce<Record<string, number>>((acc, session) => {
      const start = new Date(session.start)
      const label = start.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
      acc[label] = (acc[label] ?? 0) + 1
      return acc
    }, {})

    const mostCommonStart = Object.entries(startHourCounts).sort((a, b) => b[1] - a[1])[0]
    const consistencyScore = weekHistory.length
      ? Math.round(weekHistory.reduce((sum, day) => sum + day.percentage, 0) / weekHistory.length)
      : 0

    return { bestDay, lowestDay, splitSleepDays, averageSessionsPerTrackedDay, mostCommonStart, consistencyScore }
  })

  const sleepDebt = computed(() =>
    calculateSleepDebt(todayKey.value, debouncedSessions.value, getGoalHoursForDate, 30),
  )

  const socialJetlag = computed(() =>
    calculateSocialJetlag(todayKey.value, debouncedSessions.value, getGoalHoursForDate, 28),
  )

  const recommendations = computed(() =>
    generateRecommendations(todayKey.value, debouncedSessions.value, getGoalHoursForDate),
  )

  const sleepEfficiency = computed(() =>
    calculateSleepEfficiency(
      sessions.value,
      settings.value.defaultLatencyMinutes ?? 15,
      settings.value.defaultAwakeMinutes ?? 30,
    ),
  )

  const sleepPattern = computed(() =>
    detectSleepPattern(todayKey.value, normalizedSessions.value),
  )

  const goalForecast = computed(() =>
    forecastGoalAchievement(todayKey.value, normalizedSessions.value, getGoalHoursForDate),
  )

  const periodComparison = computed(() =>
    comparePeriods(todayKey.value, normalizedSessions.value, getGoalHoursForDate),
  )

  const bedtimeTrend = computed(() =>
    analyzeBedtimeTrend(todayKey.value, normalizedSessions.value),
  )

  const tagEffectiveness = computed(() =>
    analyzeTagEffectiveness(normalizedSessions.value),
  )

  const sleepScore = computed(() =>
    calculateSleepScore(todayKey.value, normalizedSessions.value, getGoalHoursForDate),
  )

  const regularityIndex = computed(() =>
    calculateSleepRegularityIndex(sessions.value, todayKey.value, 7),
  )

  return {
    insights,
    sleepDebt,
    socialJetlag,
    recommendations,
    sleepEfficiency,
    sleepPattern,
    goalForecast,
    periodComparison,
    bedtimeTrend,
    tagEffectiveness,
    sleepScore,
    regularityIndex,
  }
}

export const useSleepAnalytics = createGlobalState(_useSleepAnalytics)
