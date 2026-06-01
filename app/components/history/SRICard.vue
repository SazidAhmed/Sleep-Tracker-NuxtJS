<script setup lang="ts">
import { computed } from 'vue'
import { Activity } from 'lucide-vue-next'
import { useSleepAnalytics } from '@/composables/useSleepAnalytics'

const { regularityIndex } = useSleepAnalytics()

const sriInfo = computed(() => {
  const score = regularityIndex.value
  if (score >= 85) return { label: 'Excellent', colorClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', description: 'Outstanding circadian alignment!' }
  if (score >= 70) return { label: 'Good', colorClass: 'text-primary bg-primary/10 border-primary/20', description: 'Good regularity. Your body rhythm is healthy.' }
  if (score >= 50) return { label: 'Fair', colorClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20', description: 'Fair consistency. Try more consistent anchors.' }
  return { label: 'Low', colorClass: 'text-red-500 bg-red-500/10 border-red-500/20', description: 'Highly irregular schedule.' }
})
</script>

<template>
  <div class="mb-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
    <div class="mb-3 flex items-center gap-2">
      <Activity class="size-5 text-indigo-500" />
      <h2 class="text-sm font-medium text-muted-foreground">Sleep Regularity (SRI)</h2>
    </div>

    <div class="flex items-center justify-between gap-4">
      <div class="flex-1">
        <div class="mb-1 flex items-baseline gap-2">
          <p class="text-3xl font-bold text-indigo-500">{{ regularityIndex }}</p>
          <span class="text-sm text-muted-foreground">/ 100</span>
        </div>
        <div class="mt-2">
          <span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold" :class="sriInfo.colorClass">
            {{ sriInfo.label }}
          </span>
        </div>
      </div>
      
      <div class="relative flex size-16 items-center justify-center rounded-full bg-indigo-500/5">
        <svg class="size-full -rotate-90">
          <circle cx="32" cy="32" r="28" class="stroke-muted/30" stroke-width="4" fill="none" />
          <circle cx="32" cy="32" r="28" class="stroke-indigo-500 transition-all duration-500" stroke-width="4" fill="none" :stroke-dasharray="175.9" :stroke-dashoffset="175.9 - (175.9 * regularityIndex) / 100" />
        </svg>
        <span class="absolute text-xs font-bold text-indigo-500">{{ regularityIndex }}%</span>
      </div>
    </div>
    <p class="mt-3 text-xs text-muted-foreground leading-relaxed">{{ sriInfo.description }}</p>
  </div>
</template>
