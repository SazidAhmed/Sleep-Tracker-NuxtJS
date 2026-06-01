<script setup lang="ts">
import { computed } from 'vue'
import { useSleepData } from '@/composables/useSleepData'
const { weekHistory, formatDurationFromMinutes, formatDateLabel } = useSleepData()
const reversedHistory = computed(() => [...weekHistory.value].reverse())
</script>

<template>
  <div class="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
    <h2 class="mb-4 text-sm font-medium text-muted-foreground">Daily Breakdown</h2>
    <div class="space-y-3">
      <div v-for="day in reversedHistory" :key="day.date" class="flex items-center justify-between rounded-2xl bg-muted/30 p-3">
        <div>
          <p class="text-sm font-medium">{{ formatDateLabel(day.date).split(',')[0] }}</p>
          <p class="text-xs text-muted-foreground">{{ day.sessions.length }} {{ day.sessions.length === 1 ? 'session' : 'sessions' }}</p>
        </div>
        <div class="text-right">
          <p class="text-sm font-semibold">{{ formatDurationFromMinutes(day.minutes) }}</p>
          <p class="text-xs" :class="day.remainingMinutes === 0 ? 'text-primary' : 'text-muted-foreground'">{{ day.remainingMinutes === 0 ? 'Completed ✓' : `${Math.round(day.percentage)}%` }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
