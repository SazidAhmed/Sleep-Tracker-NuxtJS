<script setup lang="ts">
import { BarChart3, Flame } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import { useSleepData } from '@/composables/useSleepData'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import SkeletonCard from '@/components/history/SkeletonCard.vue'
import SleepDebtCard from '@/components/history/SleepDebtCard.vue'
import SRICard from '@/components/history/SRICard.vue'
import TrendCharts from '@/components/history/TrendCharts.vue'
import SocialJetlagCard from '@/components/history/SocialJetlagCard.vue'
import InsightsGrid from '@/components/history/InsightsGrid.vue'
import DailyBreakdown from '@/components/history/DailyBreakdown.vue'
import GoalForecastCard from '@/components/history/GoalForecastCard.vue'
import PeriodComparisonCard from '@/components/history/PeriodComparisonCard.vue'
import BedtimeTrendCard from '@/components/history/BedtimeTrendCard.vue'
import TagEffectivenessCard from '@/components/history/TagEffectivenessCard.vue'

definePageMeta({
  layout: 'mobile',
})

const {
  currentStreak,
  completionDays,
  formatDurationFromMinutes,
  averageSleepMinutes,
} = useSleepData()

const isMounted = ref(false)
onMounted(() => {
  isMounted.value = true
})
</script>

<template>
  <div class="min-h-screen p-4 pb-24 space-y-6">
    <!-- Header -->
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <BarChart3 class="size-5" />
        </div>
        <h1 class="text-lg font-semibold">History</h1>
      </div>
    </header>

    <!-- Streak + 7-Day Summary row -->
    <div class="grid grid-cols-3 gap-3">
      <div class="rounded-2xl border border-border/60 bg-card p-3 text-center">
        <Flame class="mx-auto mb-1 size-5" :class="isMounted && currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'" />
        <p class="text-xl font-bold">{{ isMounted ? currentStreak : '-' }}</p>
        <p class="text-[10px] text-muted-foreground">Streak</p>
      </div>
      <div class="rounded-2xl border border-border/60 bg-card p-3 text-center">
        <p class="text-xl font-bold mt-6">{{ isMounted ? completionDays : '-' }}/7</p>
        <p class="text-[10px] text-muted-foreground">Goals</p>
      </div>
      <div class="rounded-2xl border border-border/60 bg-card p-3 text-center">
        <p class="text-xl font-bold mt-6">{{ isMounted ? formatDurationFromMinutes(averageSleepMinutes) : '-' }}</p>
        <p class="text-[10px] text-muted-foreground">Avg</p>
      </div>
    </div>

    <template v-if="!isMounted">
      <SkeletonCard v-for="i in 5" :key="i" />
    </template>

    <template v-else>
      <ErrorBoundary>
        <SleepDebtCard />
      </ErrorBoundary>

      <ErrorBoundary>
        <SRICard />
      </ErrorBoundary>

      <ErrorBoundary>
        <TrendCharts />
      </ErrorBoundary>

      <ErrorBoundary>
        <GoalForecastCard />
      </ErrorBoundary>

      <ErrorBoundary>
        <PeriodComparisonCard />
      </ErrorBoundary>

      <ErrorBoundary>
        <BedtimeTrendCard />
      </ErrorBoundary>

      <ErrorBoundary>
        <SocialJetlagCard />
      </ErrorBoundary>

      <ErrorBoundary>
        <TagEffectivenessCard />
      </ErrorBoundary>

      <ErrorBoundary>
        <InsightsGrid />
      </ErrorBoundary>

      <ErrorBoundary>
        <DailyBreakdown />
      </ErrorBoundary>
    </template>
  </div>
</template>
