<script setup lang="ts">
import { BarChart3, TrendingUp, TrendingDown, Clock, CalendarDays, Flame, AlertCircle, ArrowUpRight, ArrowDownRight, Minus, Briefcase, Coffee, Target, Activity, Moon, Sparkles, Tag } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { buildRecentHistory } from '@/lib/sleep'

definePageMeta({
  layout: 'mobile',
})

const {
  weekHistory,
  currentStreak,
  completionDays,
  insights,
  sessions,
  settings,
  todayKey,
  sleepDebt,
  socialJetlag,
  goalForecast,
  periodComparison,
  bedtimeTrend,
  tagEffectiveness,
  formatDurationFromMinutes,
  formatDateLabel,
  averageSleepMinutes,
} = useSleepData()

// 7-day bar chart
const weeklyChart = computed(() => {
  const maxMinutes = Math.max(...weekHistory.value.map(day => day.minutes), 8 * 60, 60)
  return weekHistory.value.map((day) => {
    const dateLabel = formatDateLabel(day.date)
    const shortLabel = dateLabel.split(',')[0] ?? dateLabel
    return {
      ...day,
      label: shortLabel.slice(0, 3),
      height: `${Math.max((day.minutes / maxMinutes) * 100, day.minutes ? 20 : 8)}%`,
    }
  })
})

// 30-day line/area trend chart (SVG)
const thirtyDayHistory = computed(() =>
  buildRecentHistory(todayKey.value, sessions.value, settings.value.dailyGoalHours, 30),
)

const trendChart = computed(() => {
  const data = thirtyDayHistory.value
  const goalMinutes = settings.value.dailyGoalHours * 60
  const maxMinutes = Math.max(...data.map(d => d.minutes), goalMinutes, 60)
  const W = 320
  const H = 100
  const pad = 4

  const points = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: H - pad - ((d.minutes / maxMinutes) * (H - pad * 2)),
    minutes: d.minutes,
    date: d.date,
    met: d.remainingMinutes === 0 && d.goalMinutes > 0,
  }))

  // SVG polyline points string
  const linePoints = points.map(p => `${p.x},${p.y}`).join(' ')

  // Area polygon (close bottom)
  const areaPoints = [
    `${points[0]!.x},${H - pad}`,
    ...points.map(p => `${p.x},${p.y}`),
    `${points[points.length - 1]!.x},${H - pad}`,
  ].join(' ')

  // Goal line Y
  const goalY = H - pad - ((goalMinutes / maxMinutes) * (H - pad * 2))

  return { points, linePoints, areaPoints, goalY, W, H }
})

const hasAnyData = computed(() => thirtyDayHistory.value.some(d => d.minutes > 0))
const hasWeekData = computed(() => weekHistory.value.some(d => d.minutes > 0))

const reversedHistory = computed(() => [...weekHistory.value].reverse())
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BarChart3 class="size-5" />
        </div>
        <span class="text-lg font-semibold">History</span>
      </div>
    </header>

    <!-- Streak + 7-Day Summary row -->
    <div class="mb-4 grid grid-cols-3 gap-3">
      <div class="rounded-2xl border border-border/60 bg-card p-3 text-center">
        <Flame
          class="mx-auto mb-1 size-5"
          :class="currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'"
        />
        <p class="text-xl font-bold">{{ currentStreak }}</p>
        <p class="text-[10px] text-muted-foreground">Day Streak</p>
      </div>
      <div class="rounded-2xl border border-border/60 bg-card p-3 text-center">
        <p class="text-xl font-bold">{{ completionDays }}/7</p>
        <p class="text-[10px] text-muted-foreground">Goals This Week</p>
      </div>
      <div class="rounded-2xl border border-border/60 bg-card p-3 text-center">
        <p class="text-xl font-bold">{{ formatDurationFromMinutes(averageSleepMinutes) }}</p>
        <p class="text-[10px] text-muted-foreground">7-Day Avg</p>
      </div>
    </div>

    <!-- Sleep Debt Card -->
    <div class="mb-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-3 flex items-center gap-2">
        <AlertCircle
          class="size-5"
          :class="sleepDebt.totalDebtMinutes > 0 ? 'text-amber-500' : 'text-green-500'"
        />
        <h2 class="text-sm font-medium text-muted-foreground">30-Day Sleep Debt</h2>
      </div>

      <div v-if="sleepDebt.daysTracked === 0" class="py-4 text-center">
        <p class="text-sm text-muted-foreground">No sleep data recorded yet</p>
      </div>

      <template v-else>
        <div class="mb-3 flex items-baseline gap-2">
          <p class="text-3xl font-bold" :class="sleepDebt.totalDebtMinutes > 0 ? 'text-amber-500' : 'text-green-500'">
            {{ formatDurationFromMinutes(sleepDebt.totalDebtMinutes) }}
          </p>
          <span class="text-sm text-muted-foreground">total debt</span>
        </div>

        <div class="mb-3 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-muted/50 p-3">
            <p class="text-xs text-muted-foreground">Avg per day</p>
            <p class="text-lg font-semibold">{{ formatDurationFromMinutes(sleepDebt.averageDebtMinutes) }}</p>
          </div>
          <div class="rounded-xl bg-muted/50 p-3">
            <p class="text-xs text-muted-foreground">Days with debt</p>
            <p class="text-lg font-semibold">{{ sleepDebt.daysWithDebt }}/{{ sleepDebt.daysTracked }}</p>
          </div>
        </div>

        <div v-if="sleepDebt.largestDebtDay" class="mb-3 rounded-xl bg-muted/30 p-3">
          <p class="text-xs text-muted-foreground">Largest deficit</p>
          <p class="text-sm font-medium">
            {{ formatDurationFromMinutes(sleepDebt.largestDebtDay.debtMinutes) }}
            <span class="text-muted-foreground">on {{ formatDateLabel(sleepDebt.largestDebtDay.date).split(',')[0] }}</span>
          </p>
        </div>

        <div class="flex items-center gap-2 text-xs">
          <component
            :is="sleepDebt.recentTrend === 'improving' ? ArrowDownRight : sleepDebt.recentTrend === 'worsening' ? ArrowUpRight : Minus"
            class="size-4"
            :class="sleepDebt.recentTrend === 'improving' ? 'text-green-500' : sleepDebt.recentTrend === 'worsening' ? 'text-red-500' : 'text-muted-foreground'"
          />
          <span
            :class="sleepDebt.recentTrend === 'improving' ? 'text-green-500' : sleepDebt.recentTrend === 'worsening' ? 'text-red-500' : 'text-muted-foreground'"
          >
            {{ sleepDebt.recentTrend === 'improving' ? 'Debt decreasing - great progress!' : sleepDebt.recentTrend === 'worsening' ? 'Debt increasing - prioritize rest' : 'Debt stable' }}
          </span>
        </div>
      </template>
    </div>

    <!-- 30-Day Trend Chart -->
    <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-1 text-sm font-medium text-muted-foreground">30-Day Trend</h2>
      <p class="mb-3 text-xs text-muted-foreground/60">Dashed line = daily goal</p>

      <!-- Empty state -->
      <div v-if="!hasAnyData" class="flex flex-col items-center justify-center py-8 text-center">
        <div class="mb-2 text-3xl">📊</div>
        <p class="text-sm font-medium text-muted-foreground">No sleep data yet</p>
        <p class="text-xs text-muted-foreground/70">Start logging sleep sessions to see your trend here</p>
      </div>

      <template v-else>
      <svg
        :viewBox="`0 0 ${trendChart.W} ${trendChart.H}`"
        class="w-full"
        preserveAspectRatio="none"
        style="height: 100px;"
      >
        <!-- Gradient fill -->
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="hsl(var(--primary))" stop-opacity="0.25" />
            <stop offset="100%" stop-color="hsl(var(--primary))" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- Area fill -->
        <polygon
          :points="trendChart.areaPoints"
          fill="url(#trendGradient)"
        />

        <!-- Trend line -->
        <polyline
          :points="trendChart.linePoints"
          fill="none"
          stroke="hsl(var(--primary))"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <!-- Goal dashed line -->
        <line
          :x1="4"
          :y1="trendChart.goalY"
          :x2="trendChart.W - 4"
          :y2="trendChart.goalY"
          stroke="hsl(var(--muted-foreground))"
          stroke-width="1"
          stroke-dasharray="4 3"
          opacity="0.5"
        />

        <!-- Data point dots for goal-met days -->
        <circle
          v-for="(pt, i) in trendChart.points"
          :key="i"
          :cx="pt.x"
          :cy="pt.y"
          r="2.5"
          :fill="pt.met ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'"
          opacity="0.7"
        />
      </svg>
      <div class="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
      </template>
    </div>

    <!-- 7-Day Bar Chart -->
    <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 text-sm font-medium text-muted-foreground">Last 7 Days</h2>

      <!-- Empty state -->
      <div v-if="!hasWeekData" class="flex flex-col items-center justify-center py-8 text-center">
        <div class="mb-2 text-3xl">🌙</div>
        <p class="text-sm font-medium text-muted-foreground">No sessions this week</p>
        <p class="text-xs text-muted-foreground/70">Log your first sleep block to track weekly progress</p>
      </div>
      <div v-else class="flex h-40 items-end justify-between gap-2">
        <div
          v-for="day in weeklyChart"
          :key="day.date"
          class="flex flex-1 flex-col items-center gap-2"
        >
          <div class="relative w-full flex-1 rounded-xl bg-muted/50">
            <div
              class="absolute bottom-0 w-full rounded-xl transition-all duration-500"
              :class="day.remainingMinutes === 0 && day.minutes > 0 ? 'bg-primary' : 'bg-accent'"
              :style="{ height: day.height }"
            />
          </div>
          <div class="text-center">
            <p class="text-[10px] font-medium text-muted-foreground">{{ day.label }}</p>
            <p class="text-xs font-semibold">{{ formatDurationFromMinutes(day.minutes) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Insights Cards -->
    <div class="mb-6 grid grid-cols-2 gap-3">
      <div class="rounded-2xl border border-border/60 bg-card p-4">
        <div class="mb-2 flex items-center gap-2">
          <TrendingUp class="size-4 text-green-500" />
          <p class="text-xs text-muted-foreground">Best Day</p>
        </div>
        <p class="text-xl font-semibold">
          {{ insights.bestDay ? formatDurationFromMinutes(insights.bestDay.minutes) : '-' }}
        </p>
        <p v-if="insights.bestDay" class="text-xs text-muted-foreground">
          {{ formatDateLabel(insights.bestDay.date).split(',')[0] }}
        </p>
      </div>
      <div class="rounded-2xl border border-border/60 bg-card p-4">
        <div class="mb-2 flex items-center gap-2">
          <TrendingDown class="size-4 text-orange-500" />
          <p class="text-xs text-muted-foreground">Lowest Day</p>
        </div>
        <p class="text-xl font-semibold">
          {{ insights.lowestDay ? formatDurationFromMinutes(insights.lowestDay.minutes) : '-' }}
        </p>
        <p v-if="insights.lowestDay" class="text-xs text-muted-foreground">
          {{ formatDateLabel(insights.lowestDay.date).split(',')[0] }}
        </p>
      </div>
    </div>

    <!-- Social Jetlag Card -->
    <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-3 flex items-center gap-2">
        <div
          class="flex size-8 items-center justify-center rounded-lg"
          :class="socialJetlag.severity === 'none' ? 'bg-green-100' : socialJetlag.severity === 'mild' ? 'bg-yellow-100' : socialJetlag.severity === 'moderate' ? 'bg-orange-100' : 'bg-red-100'"
        >
          <Briefcase
            class="size-4"
            :class="socialJetlag.severity === 'none' ? 'text-green-600' : socialJetlag.severity === 'mild' ? 'text-yellow-600' : socialJetlag.severity === 'moderate' ? 'text-orange-600' : 'text-red-600'"
          />
        </div>
        <h2 class="text-sm font-medium text-muted-foreground">Social Jetlag</h2>
      </div>

      <div v-if="socialJetlag.weekdayCount === 0 || socialJetlag.weekendCount === 0" class="py-4 text-center">
        <p class="text-sm text-muted-foreground">Need more data to calculate</p>
        <p class="text-xs text-muted-foreground/70">Track both weekday and weekend sleep</p>
      </div>

      <template v-else>
        <div class="mb-3 flex items-baseline gap-2">
          <p class="text-3xl font-bold" :class="socialJetlag.severity === 'none' ? 'text-green-500' : socialJetlag.severity === 'mild' ? 'text-yellow-500' : socialJetlag.severity === 'moderate' ? 'text-orange-500' : 'text-red-500'">
            {{ socialJetlag.socialJetlagHours }}h
          </p>
          <span class="text-sm text-muted-foreground">difference</span>
        </div>

        <div class="mb-3 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-muted/50 p-3">
            <div class="mb-1 flex items-center gap-1">
              <Briefcase class="size-3 text-muted-foreground" />
              <p class="text-[10px] text-muted-foreground">Weekday Avg</p>
            </div>
            <p class="text-lg font-semibold">{{ formatDurationFromMinutes(socialJetlag.weekdayAvgMinutes) }}</p>
          </div>
          <div class="rounded-xl bg-muted/50 p-3">
            <div class="mb-1 flex items-center gap-1">
              <Coffee class="size-3 text-muted-foreground" />
              <p class="text-[10px] text-muted-foreground">Weekend Avg</p>
            </div>
            <p class="text-lg font-semibold">{{ formatDurationFromMinutes(socialJetlag.weekendAvgMinutes) }}</p>
          </div>
        </div>

        <div class="rounded-xl p-3" :class="socialJetlag.severity === 'none' ? 'bg-green-500/10' : socialJetlag.severity === 'mild' ? 'bg-yellow-500/10' : socialJetlag.severity === 'moderate' ? 'bg-orange-500/10' : 'bg-red-500/10'">
          <p class="text-xs" :class="socialJetlag.severity === 'none' ? 'text-green-600' : socialJetlag.severity === 'mild' ? 'text-yellow-600' : socialJetlag.severity === 'moderate' ? 'text-orange-600' : 'text-red-600'">
            {{ socialJetlag.severity === 'none' ? '✓ Great consistency! Your sleep schedule is consistent.' : socialJetlag.severity === 'mild' ? '⚠ Mild jetlag. Try to keep closer schedules.' : socialJetlag.severity === 'moderate' ? '⚠ Moderate jetlag. This can affect your health.' : '⚠ Severe jetlag. Consider adjusting your routine.' }}
          </p>
        </div>
      </template>
    </div>

    <!-- More Insights -->
    <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 text-sm font-medium text-muted-foreground">Sleep Insights</h2>
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Clock class="size-4 text-muted-foreground" />
            <span class="text-sm">Most Common Start</span>
          </div>
          <span class="text-sm font-medium">
            {{ insights.mostCommonStart ? insights.mostCommonStart[0] : '-' }}
          </span>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <CalendarDays class="size-4 text-muted-foreground" />
            <span class="text-sm">Split Sleep Days</span>
          </div>
          <span class="text-sm font-medium">{{ insights.splitSleepDays }}</span>
        </div>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="size-4 rounded-full bg-primary/20" />
            <span class="text-sm">Consistency</span>
          </div>
          <span class="text-sm font-medium">{{ insights.consistencyScore }}%</span>
        </div>
      </div>
    </div>

    <!-- Daily Breakdown -->
    <div class="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 text-sm font-medium text-muted-foreground">Daily Breakdown</h2>
      <div class="space-y-3">
        <div
          v-for="day in reversedHistory"
          :key="day.date"
          class="flex items-center justify-between rounded-2xl bg-muted/30 p-3"
        >
          <div>
            <p class="text-sm font-medium">{{ formatDateLabel(day.date).split(',')[0] }}</p>
            <p class="text-xs text-muted-foreground">
              {{ day.sessions.length }} {{ day.sessions.length === 1 ? 'session' : 'sessions' }}
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold">{{ formatDurationFromMinutes(day.minutes) }}</p>
            <p
              class="text-xs"
              :class="day.remainingMinutes === 0 ? 'text-primary' : 'text-muted-foreground'"
            >
              {{ day.remainingMinutes === 0 ? 'Completed ✓' : `${Math.round(day.percentage)}%` }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Goal Forecast -->
    <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-3 flex items-center gap-2">
        <Target class="size-5 text-primary" />
        <h2 class="text-sm font-medium text-muted-foreground">Goal Forecast</h2>
      </div>
      <div class="rounded-xl bg-muted/30 p-4">
        <p class="text-sm">{{ goalForecast.message }}</p>
        <p v-if="goalForecast.suggestedBedtime" class="mt-2 text-xs text-muted-foreground">
          Suggested wake time: {{ goalForecast.suggestedBedtime }}
        </p>
      </div>
    </div>

    <!-- Period Comparison -->
    <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-3 flex items-center gap-2">
        <Activity class="size-5 text-blue-500" />
        <h2 class="text-sm font-medium text-muted-foreground">Week vs Week</h2>
      </div>
      <div class="mb-3 grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-muted/30 p-3">
          <p class="text-xs text-muted-foreground">This Week</p>
          <p class="text-lg font-semibold">{{ formatDurationFromMinutes(periodComparison.period1.avgMinutes) }}</p>
          <p class="text-xs text-muted-foreground">{{ periodComparison.period1.goalMetDays }}/{{ periodComparison.period1.totalDays }} goals met</p>
        </div>
        <div class="rounded-xl bg-muted/30 p-3">
          <p class="text-xs text-muted-foreground">Last Week</p>
          <p class="text-lg font-semibold">{{ formatDurationFromMinutes(periodComparison.period2.avgMinutes) }}</p>
          <p class="text-xs text-muted-foreground">{{ periodComparison.period2.goalMetDays }}/{{ periodComparison.period2.totalDays }} goals met</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <component
          :is="periodComparison.trend === 'improved' ? TrendingUp : periodComparison.trend === 'declined' ? TrendingDown : Minus"
          class="size-4"
          :class="periodComparison.trend === 'improved' ? 'text-green-500' : periodComparison.trend === 'declined' ? 'text-red-500' : 'text-muted-foreground'"
        />
        <span
          class="text-sm"
          :class="periodComparison.trend === 'improved' ? 'text-green-500' : periodComparison.trend === 'declined' ? 'text-red-500' : 'text-muted-foreground'"
        >
          {{ periodComparison.difference > 0 ? '+' : '' }}{{ periodComparison.difference }}% {{ periodComparison.trend }}
        </span>
      </div>
    </div>

    <!-- Bedtime Trend -->
    <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-3 flex items-center gap-2">
        <Moon class="size-5 text-indigo-500" />
        <h2 class="text-sm font-medium text-muted-foreground">Bedtime Trend</h2>
      </div>
      <div class="rounded-xl bg-muted/30 p-4">
        <p class="text-sm">{{ bedtimeTrend.message }}</p>
        <div v-if="bedtimeTrend.avgChangeMinutes > 0" class="mt-2 flex items-center gap-2">
          <component
            :is="bedtimeTrend.trend === 'earlier' ? TrendingDown : TrendingUp"
            class="size-4"
            :class="bedtimeTrend.trend === 'earlier' ? 'text-green-500' : 'text-amber-500'"
          />
          <span class="text-xs text-muted-foreground">
            {{ bedtimeTrend.avgChangeMinutes }} min {{ bedtimeTrend.trend }}
          </span>
        </div>
      </div>
    </div>

    <!-- Tag Effectiveness -->
    <div v-if="tagEffectiveness.length > 0" class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-3 flex items-center gap-2">
        <Tag class="size-5 text-teal-500" />
        <h2 class="text-sm font-medium text-muted-foreground">Tag Effectiveness</h2>
      </div>
      <div class="space-y-2">
        <div
          v-for="tag in tagEffectiveness.slice(0, 5)"
          :key="tag.tag"
          class="flex items-center justify-between rounded-xl bg-muted/30 p-3"
        >
          <div>
            <div class="flex items-center gap-2">
              <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{{ tag.tag }}</span>
              <span class="text-xs text-muted-foreground">{{ tag.sessionCount }} sessions</span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">{{ tag.recommendation }}</p>
          </div>
          <div class="text-right">
            <div class="flex items-center gap-1">
              <span class="text-sm font-semibold">{{ tag.avgQuality }}</span>
              <span class="text-xs">/5</span>
            </div>
            <span
              class="text-xs"
              :class="tag.vsOverallAvg > 0 ? 'text-green-500' : tag.vsOverallAvg < 0 ? 'text-red-500' : 'text-muted-foreground'"
            >
              {{ tag.vsOverallAvg > 0 ? '+' : '' }}{{ tag.vsOverallAvg }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
