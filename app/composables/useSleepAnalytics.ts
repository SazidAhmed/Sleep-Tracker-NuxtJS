import { useSleepData } from '@/composables/useSleepData'

export function useSleepAnalytics() {
  const sleepData = useSleepData()

  return {
    todayKey: sleepData.todayKey,
    todaySummary: sleepData.todaySummary,
    weekHistory: sleepData.weekHistory,
    averageSleepMinutes: sleepData.averageSleepMinutes,
    completionDays: sleepData.completionDays,
    currentStreak: sleepData.currentStreak,
    latestSession: sleepData.latestSession,
    guidance: sleepData.guidance,
    insights: sleepData.insights,
    sleepDebt: sleepData.sleepDebt,
    socialJetlag: sleepData.socialJetlag,
    recommendations: sleepData.recommendations,
    sleepEfficiency: sleepData.sleepEfficiency,
    sleepPattern: sleepData.sleepPattern,
    goalForecast: sleepData.goalForecast,
    periodComparison: sleepData.periodComparison,
    bedtimeTrend: sleepData.bedtimeTrend,
    tagEffectiveness: sleepData.tagEffectiveness,
    sleepScore: sleepData.sleepScore,
    regularityIndex: sleepData.regularityIndex,
    getGoalHoursForDate: sleepData.getGoalHoursForDate,
  }
}
