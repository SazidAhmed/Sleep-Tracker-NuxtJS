/**
 * sleep/index.ts — Barrel re-export for the sleep library
 *
 * All existing imports of '@/lib/sleep' continue to work unchanged.
 * The actual implementations now live in focused sub-modules:
 *
 *   sleep/types.ts     — Interfaces and type definitions
 *   sleep/format.ts    — Date/time/duration formatting helpers
 *   sleep/summary.ts   — Day, week, month aggregation logic
 *   sleep/analytics.ts — Advanced sleep analytics (debt, jetlag, score, SRI…)
 *   sleep/alarm.ts     — Smart alarm, optimal wake times, CSV export
 */

// Types
export type {
  SleepSession,
  SessionTemplate,
  SleepSettings,
  AlarmType,
  AlarmConfig,
  DailySleepSummary,
  MonthlySleepCell,
  OptimalWakeTime,
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
  SleepTag,
} from './types'

export { SLEEP_TAGS } from './types'

// Formatting
export {
  formatDurationFromMinutes,
  formatDateLabel,
  formatMonthLabel,
  formatDateTimeLabel,
  formatTimeLabel,
  formatMinutesToTime,
  getDateKey,
  addDays,
  shiftMonth,
  toDateTimeLocalValue,
  getQualityEmoji,
  getQualityLabel,
  getSessionDurationMinutes,
  isSessionValid,
} from './format'

// Summary / aggregation
export {
  summarizeSleepDay,
  buildRecentHistory,
  buildMonthGrid,
  buildGuidance,
  calculateStreak,
} from './summary'

// Analytics
export {
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
} from './analytics'

// Alarm / utilities
export {
  calculateOptimalWakeTimes,
  getRecommendedWakeTime,
  calculateSmartAlarmTime,
  generateAutoBackup,
  checkInterruptedSession,
  validateAndRepairData,
  exportSessionsToCSV,
} from './alarm'

export {
  migrateSleepData,
  CURRENT_DATA_VERSION,
} from './migration'
