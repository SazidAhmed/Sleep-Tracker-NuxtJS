<script setup lang="ts">
import { Target } from 'lucide-vue-next'
import { useSleepAnalytics } from '@/composables/useSleepAnalytics'
const { goalForecast } = useSleepAnalytics()
</script>

<template>
  <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
    <div class="mb-3 flex items-center gap-2">
      <Target class="size-5 text-primary" />
      <h2 class="text-sm font-medium text-muted-foreground">Goal Forecast</h2>
    </div>
    <div class="rounded-xl bg-muted/30 p-4">
      <p class="text-sm">{{ goalForecast.message }}</p>
      <p v-if="goalForecast.suggestedBedtime" class="mt-2 text-xs text-muted-foreground">Suggested wake: {{ goalForecast.suggestedBedtime }}</p>
    </div>
  </div>
</template>
