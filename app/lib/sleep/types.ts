/**
 * sleep/types.ts — Core domain interfaces and type definitions
 * All other sleep modules import from here.
 */

export interface SleepSession {
  id: string
  start: string
  end: string
  createdAt: string
  quality?: 1 | 2 | 3 | 4 | 5
  tags?: string[]
  notes?: string
}

export interface SessionTemplate {
  id: string
  name: string
  durationMinutes: number
  defaultQuality?: 1 | 2 | 3 | 4 | 5
  defaultTags?: string[]
  icon?: string
}

export interface SleepSettings {
  dailyGoalHours: number
  weekdayGoalHours?: number
  weekendGoalHours?: number
  useSplitGoals?: boolean
  anchorTime: string
}

export type AlarmType = 'sound' | 'notification' | 'smart'

export interface AlarmConfig {
  enabled: boolean
  time: string // HH:mm format
  type: AlarmType
  soundEnabled: boolean
  smartWindowMinutes: number
  snoozeMinutes: number
  snoozeCount: number
  lastTriggeredDate: string
  lastSnoozedAt: string | null
}

export interface DailySleepSummary {
  date: string
  minutes: number
  goalMinutes: number
  remainingMinutes: number
  percentage: number
  sessions: SleepSession[]
}

export interface MonthlySleepCell extends DailySleepSummary {
  inCurrentMonth: boolean
  isToday: boolean
}

export interface OptimalWakeTime {
  cycles: number
  wakeTime: string
  totalMinutes: number
  label: string
}

export interface SleepDebtSummary {
  totalDebtMinutes: number
  averageDebtMinutes: number
  daysWithDebt: number
  daysTracked: number
  largestDebtDay: { date: string; debtMinutes: number } | null
  recentTrend: 'improving' | 'worsening' | 'stable'
}

export interface SocialJetlagSummary {
  weekdayAvgMinutes: number
  weekendAvgMinutes: number
  differenceMinutes: number
  weekdayCount: number
  weekendCount: number
  socialJetlagHours: number
  severity: 'none' | 'mild' | 'moderate' | 'severe'
}

export interface SleepRecommendation {
  id: string
  type: 'optimal_time' | 'consistency' | 'goal' | 'debt' | 'jetlag' | 'quality'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  action?: string
  actionPath?: string
}

export interface SleepEfficiencyData {
  date: string
  timeInBedMinutes: number
  actualSleepMinutes: number
  efficiency: number
  sleepLatencyMinutes: number
  awakeTimeMinutes: number
}

export interface SleepPattern {
  averageBedtime: string
  averageWakeTime: string
  stdDevMinutes: number
  consistency: 'high' | 'medium' | 'low'
  typicalDurationMinutes: number
}

export interface GoalForecast {
  canReachGoalToday: boolean
  requiredSleepMinutes: number
  suggestedBedtime: string | null
  message: string
}

export interface PeriodComparison {
  period1: { label: string; avgMinutes: number; goalMetDays: number; totalDays: number }
  period2: { label: string; avgMinutes: number; goalMetDays: number; totalDays: number }
  difference: number
  trend: 'improved' | 'declined' | 'stable'
}

export interface BedtimeTrend {
  trend: 'earlier' | 'later' | 'stable'
  avgChangeMinutes: number
  message: string
}

export interface TagEffectiveness {
  tag: string
  avgQuality: number
  sessionCount: number
  vsOverallAvg: number
  recommendation: string
}

export interface SleepScore {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  label: string
  breakdown: {
    duration: number
    consistency: number
    quality: number
    debtFree: number
  }
}

// Built-in tag presets
export const SLEEP_TAGS = [
  'Nap',
  'Deep Sleep',
  'Light Sleep',
  'Interrupted',
  'Good Dreams',
  'Restless',
  'Recovery',
  'Sick',
  'Travel',
] as const

export type SleepTag = typeof SLEEP_TAGS[number]
