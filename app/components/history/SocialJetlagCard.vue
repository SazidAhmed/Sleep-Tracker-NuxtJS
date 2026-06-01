<script setup lang="ts">
import { Briefcase, Coffee } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { useSleepAnalytics } from '@/composables/useSleepAnalytics'

const { formatDurationFromMinutes } = useSleepData()
const { socialJetlag } = useSleepAnalytics()
</script>

<template>
  <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
    <div class="mb-3 flex items-center gap-2">
      <div class="flex size-8 items-center justify-center rounded-lg" :class="socialJetlag.severity === 'none' ? 'bg-green-100' : 'bg-orange-100'">
        <Briefcase class="size-4" :class="socialJetlag.severity === 'none' ? 'text-green-600' : 'text-orange-600'" />
      </div>
      <h2 class="text-sm font-medium text-muted-foreground">Social Jetlag</h2>
    </div>

    <div v-if="socialJetlag.weekdayCount === 0 || socialJetlag.weekendCount === 0" class="py-4 text-center">
      <p class="text-sm text-muted-foreground">Need more data to calculate</p>
    </div>

    <template v-else>
      <div class="mb-3 flex items-baseline gap-2">
        <p class="text-3xl font-bold" :class="socialJetlag.severity === 'none' ? 'text-green-500' : 'text-orange-500'">{{ socialJetlag.socialJetlagHours }}h</p>
        <span class="text-sm text-muted-foreground">difference</span>
      </div>

      <div class="mb-3 grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-muted/50 p-3">
          <p class="text-[10px] text-muted-foreground">Weekday Avg</p>
          <p class="text-lg font-semibold">{{ formatDurationFromMinutes(socialJetlag.weekdayAvgMinutes) }}</p>
        </div>
        <div class="rounded-xl bg-muted/50 p-3">
          <p class="text-[10px] text-muted-foreground">Weekend Avg</p>
          <p class="text-lg font-semibold">{{ formatDurationFromMinutes(socialJetlag.weekendAvgMinutes) }}</p>
        </div>
      </div>
      <p class="text-xs">{{ socialJetlag.severity === 'none' ? '✓ Great consistency!' : '⚠ Try to keep closer schedules.' }}</p>
    </template>
  </div>
</template>
