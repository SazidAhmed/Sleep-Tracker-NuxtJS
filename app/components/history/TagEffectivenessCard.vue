<script setup lang="ts">
import { Tag } from 'lucide-vue-next'
import { useSleepAnalytics } from '@/composables/useSleepAnalytics'
const { tagEffectiveness } = useSleepAnalytics()
</script>

<template>
  <div v-if="tagEffectiveness.length > 0" class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
    <div class="mb-3 flex items-center gap-2">
      <Tag class="size-5 text-teal-500" />
      <h2 class="text-sm font-medium text-muted-foreground">Tag Effectiveness</h2>
    </div>
    <div class="space-y-2">
      <div v-for="tag in tagEffectiveness.slice(0, 5)" :key="tag.tag" class="flex items-center justify-between rounded-xl bg-muted/30 p-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{{ tag.tag }}</span>
            <span class="text-xs text-muted-foreground">{{ tag.sessionCount }} sessions</span>
          </div>
          <p class="mt-1 text-xs text-muted-foreground">{{ tag.recommendation }}</p>
        </div>
        <div class="text-right">
          <div class="flex items-center gap-1"><span class="text-sm font-semibold">{{ tag.avgQuality }}</span><span class="text-xs">/5</span></div>
          <span class="text-xs" :class="tag.vsOverallAvg > 0 ? 'text-green-500' : 'text-red-500'">{{ tag.vsOverallAvg > 0 ? '+' : '' }}{{ tag.vsOverallAvg }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>
