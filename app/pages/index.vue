<script setup lang="ts">
import { MoonStar, Clock, Zap, Flame, ArrowRight, Lightbulb } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'

definePageMeta({
  layout: 'mobile',
})

const {
  todaySummary,
  guidance,
  latestSession,
  averageSleepMinutes,
  currentStreak,
  formatDurationFromMinutes,
  formatDateLabel,
  formatTimeLabel,
  getSessionDurationMinutes,
} = useSleepData()

const progressWidth = computed(() => `${Math.min(todaySummary.value.percentage, 100)}%`)
const isGoalCompleted = computed(() => todaySummary.value.remainingMinutes === 0)
const progressColor = computed(() => {
  const pct = todaySummary.value.percentage
  if (pct >= 100) return 'bg-primary'
  if (pct >= 60) return 'bg-primary/80'
  if (pct >= 30) return 'bg-primary/60'
  return 'bg-primary/40'
})
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
          <MoonStar class="size-5" />
        </div>
        <span class="text-lg font-semibold">Sleep Tracker</span>
      </div>
      <div class="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        {{ formatDateLabel(todaySummary.date).split(',')[0] }}
      </div>
    </header>

    <!-- Daily Progress Card -->
    <div class="mb-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today's Sleep</p>
          <p class="text-3xl font-bold" :class="isGoalCompleted ? 'text-primary' : ''">
            {{ Math.round(todaySummary.percentage) }}%
          </p>
        </div>
        <div class="text-right">
          <p class="text-xs text-muted-foreground">Goal</p>
          <p class="text-lg font-semibold">{{ formatDurationFromMinutes(todaySummary.goalMinutes) }}</p>
        </div>
      </div>

      <!-- Progress Bar — visible colored fill -->
      <div class="mb-1.5 h-3 overflow-hidden rounded-full bg-secondary">
        <div
          class="h-full rounded-full transition-all duration-700"
          :class="progressColor"
          :style="{ width: progressWidth }"
        />
      </div>
      <div class="mb-4 flex justify-between text-xs text-muted-foreground">
        <span>{{ formatDurationFromMinutes(todaySummary.minutes) }} slept</span>
        <span v-if="!isGoalCompleted">{{ formatDurationFromMinutes(todaySummary.remainingMinutes) }} to go</span>
        <span v-else class="font-semibold text-primary">Goal reached! 🎉</span>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-secondary/60 p-3">
          <p class="text-xs text-muted-foreground">Completed</p>
          <p class="text-xl font-semibold">{{ formatDurationFromMinutes(todaySummary.minutes) }}</p>
        </div>
        <div class="rounded-2xl bg-secondary/60 p-3">
          <p class="text-xs text-muted-foreground">Remaining</p>
          <p class="text-xl font-semibold" :class="isGoalCompleted ? 'text-primary' : ''">
            {{ isGoalCompleted ? 'Done!' : formatDurationFromMinutes(todaySummary.remainingMinutes) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Guidance Banner — with icon -->
    <div v-if="guidance" class="mb-4 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/8 p-4">
      <Lightbulb class="mt-0.5 size-4 shrink-0 text-primary" />
      <p class="text-sm leading-relaxed text-primary/90">
        {{ guidance }}
      </p>
    </div>

    <!-- Last Session Card -->
    <div v-if="latestSession" class="mb-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-3 flex items-center gap-2">
        <Clock class="size-4 text-muted-foreground" />
        <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Session</p>
      </div>
      <p class="text-2xl font-bold">
        {{ formatDurationFromMinutes(getSessionDurationMinutes(latestSession)) }}
      </p>
      <p class="text-sm text-muted-foreground">
        {{ formatTimeLabel(latestSession.start) }} → {{ formatTimeLabel(latestSession.end) }}
      </p>
    </div>

    <!-- Quick Stats -->
    <div class="mb-4 grid grid-cols-2 gap-3">
      <div class="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
        <div class="mb-1 flex items-center gap-1.5">
          <Zap class="size-4 text-yellow-500" />
          <p class="text-xs text-muted-foreground">7-Day Avg</p>
        </div>
        <p class="text-xl font-semibold">{{ formatDurationFromMinutes(averageSleepMinutes) }}</p>
      </div>
      <div
        class="rounded-3xl border p-4 shadow-sm transition-colors"
        :class="currentStreak > 0
          ? 'border-orange-400/30 bg-orange-500/8'
          : 'border-border/60 bg-card'"
      >
        <div class="mb-1 flex items-center gap-1.5">
          <Flame
            class="size-4 transition-colors"
            :class="currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'"
          />
          <p class="text-xs text-muted-foreground">Streak</p>
        </div>
        <p class="text-xl font-semibold" :class="currentStreak > 0 ? 'text-orange-500' : ''">
          {{ currentStreak }}
          <span class="text-sm font-normal text-muted-foreground">days</span>
        </p>
      </div>
    </div>

    <!-- CTA to Timer -->
    <NuxtLink to="/timer" class="block">
      <Button class="w-full rounded-2xl py-6 text-base font-semibold shadow-lg shadow-primary/20" size="lg">
        <Clock class="mr-2 size-5" />
        Start Sleep Timer
        <ArrowRight class="ml-2 size-5" />
      </Button>
    </NuxtLink>
  </div>
</template>
