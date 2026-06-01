<script setup lang="ts">
import { computed } from 'vue'
import { TrendingUp, TrendingDown, Clock, CalendarDays } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { useSleepAnalytics } from '@/composables/useSleepAnalytics'

const { weekHistory, formatDurationFromMinutes, formatDateLabel } = useSleepData()
const { insights } = useSleepAnalytics()

const weeklyChart = computed(() => {
  const max = Math.max(...weekHistory.value.map(day => day.minutes), 480)
  return weekHistory.value.map(day => ({
    ...day,
    label: formatDateLabel(day.date).split(',')[0]?.slice(0, 3),
    height: `${Math.max((day.minutes / max) * 100, day.minutes ? 20 : 8)}%`,
  }))
})
</script>

<template>
  <div class="space-y-6">
    <!-- 7-Day Bar Chart -->
    <div class="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 text-sm font-medium text-muted-foreground">Last 7 Days</h2>
      <div class="flex h-40 items-end justify-between gap-2">
        <div v-for="day in weeklyChart" :key="day.date" class="flex flex-1 flex-col items-center gap-2 h-full">
          <div class="relative w-full flex-1 rounded-xl bg-muted/50">
            <div class="absolute bottom-0 w-full rounded-xl transition-all duration-500" :class="day.remainingMinutes === 0 && day.minutes > 0 ? 'bg-primary' : 'bg-accent'" :style="{ height: day.height }" />
          </div>
          <p class="text-[10px] font-medium text-muted-foreground">{{ day.label }}</p>
        </div>
      </div>
    </div>

    <!-- Quick Insights -->
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-2xl border border-border/60 bg-card p-4">
        <div class="mb-2 flex items-center gap-2"><TrendingUp class="size-4 text-green-500" /><p class="text-xs text-muted-foreground">Best Day</p></div>
        <p class="text-xl font-semibold">{{ insights.bestDay ? formatDurationFromMinutes(insights.bestDay.minutes) : '-' }}</p>
      </div>
      <div class="rounded-2xl border border-border/60 bg-card p-4">
        <div class="mb-2 flex items-center gap-2"><TrendingDown class="size-4 text-orange-500" /><p class="text-xs text-muted-foreground">Lowest Day</p></div>
        <p class="text-xl font-semibold">{{ insights.lowestDay ? formatDurationFromMinutes(insights.lowestDay.minutes) : '-' }}</p>
      </div>
    </div>

    <div class="rounded-3xl border border-border/60 bg-card p-5 shadow-sm space-y-4">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2"><Clock class="size-4 text-muted-foreground" /><span class="text-sm">Common Start</span></div>
        <span class="text-sm font-medium">{{ insights.mostCommonStart ? insights.mostCommonStart[0] : '-' }}</span>
      </div>
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2"><CalendarDays class="size-4 text-muted-foreground" /><span class="text-sm">Split Days</span></div>
        <span class="text-sm font-medium">{{ insights.splitSleepDays }}</span>
      </div>
    </div>
  </div>
</template>
