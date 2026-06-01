<script setup lang="ts">
import { AlertCircle, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { useSleepAnalytics } from '@/composables/useSleepAnalytics'

const { formatDurationFromMinutes, formatDateLabel } = useSleepData()
const { sleepDebt } = useSleepAnalytics()
</script>

<template>
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
        <span :class="sleepDebt.recentTrend === 'improving' ? 'text-green-500' : sleepDebt.recentTrend === 'worsening' ? 'text-red-500' : 'text-muted-foreground'">
          {{ sleepDebt.recentTrend === 'improving' ? 'Debt decreasing - great progress!' : sleepDebt.recentTrend === 'worsening' ? 'Debt increasing - prioritize rest' : 'Debt stable' }}
        </span>
      </div>
    </template>
  </div>
</template>
