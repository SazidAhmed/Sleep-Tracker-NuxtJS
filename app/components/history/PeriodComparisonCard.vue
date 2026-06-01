<script setup lang="ts">
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { useSleepAnalytics } from '@/composables/useSleepAnalytics'
const { formatDurationFromMinutes } = useSleepData()
const { periodComparison } = useSleepAnalytics()
</script>

<template>
  <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
    <div class="mb-3 flex items-center gap-2">
      <Activity class="size-5 text-blue-500" />
      <h2 class="text-sm font-medium text-muted-foreground">Week vs Week</h2>
    </div>
    <div class="mb-3 grid grid-cols-2 gap-3">
      <div class="rounded-xl bg-muted/30 p-3">
        <p class="text-xs text-muted-foreground">This Week</p>
        <p class="text-lg font-semibold">{{ formatDurationFromMinutes(periodComparison.period1.avgMinutes) }}</p>
      </div>
      <div class="rounded-xl bg-muted/30 p-3">
        <p class="text-xs text-muted-foreground">Last Week</p>
        <p class="text-lg font-semibold">{{ formatDurationFromMinutes(periodComparison.period2.avgMinutes) }}</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <component :is="periodComparison.trend === 'improved' ? TrendingUp : periodComparison.trend === 'declined' ? TrendingDown : Minus" class="size-4" :class="periodComparison.trend === 'improved' ? 'text-green-500' : 'text-red-500'" />
      <span class="text-sm" :class="periodComparison.trend === 'improved' ? 'text-green-500' : 'text-red-500'">{{ periodComparison.difference }}% {{ periodComparison.trend }}</span>
    </div>
  </div>
</template>
