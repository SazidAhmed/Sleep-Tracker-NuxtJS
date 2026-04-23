<script setup lang="ts">
import { MoonStar, Clock, Zap, Flame, ArrowRight } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'

definePageMeta({
  layout: 'mobile',
})

const {
  todaySummary,
  guidance,
  latestSession,
  averageSleepMinutes,
  completionDays,
  currentStreak,
  formatDurationFromMinutes,
  formatDateLabel,
  formatTimeLabel,
  getSessionDurationMinutes,
} = useSleepData()

const progressWidth = computed(() => `${Math.min(todaySummary.value.percentage, 100)}%`)
const isGoalCompleted = computed(() => todaySummary.value.remainingMinutes === 0)
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <MoonStar class="size-5" />
        </div>
        <span class="text-lg font-semibold">Sleep Tracker</span>
      </div>
      <div class="text-xs text-muted-foreground">
        {{ formatDateLabel(todaySummary.date).split(',')[0] }}
      </div>
    </header>

    <!-- Daily Progress Card -->
    <div class="mb-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today's Sleep</p>
          <p class="text-3xl font-bold">
            {{ Math.round(todaySummary.percentage) }}%
          </p>
        </div>
        <div class="text-right">
          <p class="text-xs text-muted-foreground">Goal</p>
          <p class="text-lg font-semibold">{{ formatDurationFromMinutes(todaySummary.goalMinutes) }}</p>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="mb-4 h-3 overflow-hidden rounded-full bg-secondary">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="isGoalCompleted ? 'bg-primary' : 'bg-accent'"
          :style="{ width: progressWidth }"
        />
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-muted/50 p-3">
          <p class="text-xs text-muted-foreground">Completed</p>
          <p class="text-xl font-semibold">{{ formatDurationFromMinutes(todaySummary.minutes) }}</p>
        </div>
        <div class="rounded-2xl bg-muted/50 p-3">
          <p class="text-xs text-muted-foreground">Remaining</p>
          <p class="text-xl font-semibold" :class="isGoalCompleted ? 'text-primary' : ''">
            {{ isGoalCompleted ? 'Done!' : formatDurationFromMinutes(todaySummary.remainingMinutes) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Guidance Banner -->
    <div v-if="guidance" class="mb-4 rounded-2xl bg-primary/10 p-4">
      <p class="text-sm text-primary">
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
        {{ formatTimeLabel(latestSession.start) }} - {{ formatTimeLabel(latestSession.end) }}
      </p>
    </div>

    <!-- Quick Stats -->
    <div class="mb-4 grid grid-cols-2 gap-3">
      <div class="rounded-3xl bg-muted/50 p-4">
        <div class="mb-1 flex items-center gap-2">
          <Zap class="size-4 text-yellow-500" />
          <p class="text-xs text-muted-foreground">7-Day Avg</p>
        </div>
        <p class="text-xl font-semibold">{{ formatDurationFromMinutes(averageSleepMinutes) }}</p>
      </div>
      <div class="rounded-3xl bg-muted/50 p-4">
        <div class="mb-1 flex items-center gap-2">
          <Flame class="size-4" :class="currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'" />
          <p class="text-xs text-muted-foreground">Streak</p>
        </div>
        <p class="text-xl font-semibold">{{ currentStreak }} <span class="text-sm font-normal text-muted-foreground">days</span></p>
      </div>
    </div>

    <!-- CTA to Timer -->
    <NuxtLink to="/timer" class="block">
      <Button class="w-full rounded-2xl py-6 text-base font-semibold" size="lg">
        <Clock class="mr-2 size-5" />
        Start Sleep Timer
        <ArrowRight class="ml-2 size-5" />
      </Button>
    </NuxtLink>
  </div>
</template>
