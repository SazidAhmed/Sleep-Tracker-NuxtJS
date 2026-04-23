<script setup lang="ts">
import { BarChart3, TrendingUp, TrendingDown, Clock, CalendarDays } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'

definePageMeta({
  layout: 'mobile',
})

const {
  weekHistory,
  insights,
  formatDurationFromMinutes,
  formatDateLabel,
} = useSleepData()

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

    <!-- Weekly Chart -->
    <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 text-sm font-medium text-muted-foreground">Last 7 Days</h2>
      <div class="flex h-40 items-end justify-between gap-2">
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
              {{ day.remainingMinutes === 0 ? 'Completed' : `${Math.round(day.percentage)}%` }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
