<script setup lang="ts">
import { Moon, TrendingDown, TrendingUp } from 'lucide-vue-next'
import { useSleepAnalytics } from '@/composables/useSleepAnalytics'
const { bedtimeTrend } = useSleepAnalytics()
</script>

<template>
  <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
    <div class="mb-3 flex items-center gap-2">
      <Moon class="size-5 text-indigo-500" />
      <h2 class="text-sm font-medium text-muted-foreground">Bedtime Trend</h2>
    </div>
    <div class="rounded-xl bg-muted/30 p-4">
      <p class="text-sm">{{ bedtimeTrend.message }}</p>
      <div v-if="bedtimeTrend.avgChangeMinutes > 0" class="mt-2 flex items-center gap-2">
        <component :is="bedtimeTrend.trend === 'earlier' ? TrendingDown : TrendingUp" class="size-4" :class="bedtimeTrend.trend === 'earlier' ? 'text-green-500' : 'text-amber-500'" />
        <span class="text-xs text-muted-foreground">{{ bedtimeTrend.avgChangeMinutes }} min {{ bedtimeTrend.trend }}</span>
      </div>
    </div>
  </div>
</template>
