<script setup lang="ts">
import { MoonStar, Play, Square, X, Plus, ChevronRight } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { toDateTimeLocalValue } from '@/lib/sleep'

definePageMeta({
  layout: 'mobile',
})

const {
  todaySummary,
  activeSessionStart,
  activeSessionMinutes,
  startSleepNow,
  stopSleepNow,
  cancelActiveSleep,
  saveSession,
  formatDurationFromMinutes,
} = useSleepData()

// Manual session form
const end = new Date()
const start = new Date(end.getTime() - 90 * 60 * 1000)
const sessionForm = reactive({
  start: toDateTimeLocalValue(start),
  end: toDateTimeLocalValue(end),
})

const errorMessage = ref('')

const progressWidth = computed(() => `${Math.min(todaySummary.value.percentage, 100)}%`)

function handleSaveSession() {
  errorMessage.value = ''
  if (!sessionForm.start || !sessionForm.end) {
    errorMessage.value = 'Start and end time are required.'
    return
  }
  const result = saveSession({ start: sessionForm.start, end: sessionForm.end })
  if (result.error) {
    errorMessage.value = result.error
    return
  }
  const newEnd = new Date()
  const newStart = new Date(newEnd.getTime() - 90 * 60 * 1000)
  sessionForm.start = toDateTimeLocalValue(newStart)
  sessionForm.end = toDateTimeLocalValue(newEnd)
}

function handleStopTimer() {
  errorMessage.value = ''
  const result = stopSleepNow()
  if (result?.error) {
    errorMessage.value = result.error
  }
}

// Format timer display
const timerDisplay = computed(() => {
  const hours = Math.floor(activeSessionMinutes.value / 60)
  const minutes = activeSessionMinutes.value % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
})

// SVG arc for the timer ring
// Arc fills based on hours elapsed (8h = full circle as goal reference)
const ARC_R = 88
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_R

const arcProgress = computed(() => {
  const goalMinutes = todaySummary.value.goalMinutes || 480
  const fraction = Math.min(activeSessionMinutes.value / goalMinutes, 1)
  return fraction
})

const arcDashOffset = computed(() => {
  return ARC_CIRCUMFERENCE * (1 - arcProgress.value)
})
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <MoonStar class="size-5" />
        </div>
        <span class="text-lg font-semibold">Sleep Timer</span>
      </div>
    </header>

    <!-- Timer Display -->
    <div class="mb-6 flex flex-col items-center">
      <!-- SVG Arc Circle -->
      <div class="relative mb-5 flex size-52 items-center justify-center">
        <svg class="absolute inset-0 size-full -rotate-90" viewBox="0 0 200 200">
          <!-- Background track -->
          <circle
            cx="100" cy="100" :r="ARC_R"
            fill="none"
            stroke="currentColor"
            stroke-width="10"
            class="text-border"
          />
          <!-- Progress arc -->
          <circle
            v-if="activeSessionStart"
            cx="100" cy="100" :r="ARC_R"
            fill="none"
            stroke="currentColor"
            stroke-width="10"
            stroke-linecap="round"
            class="text-primary transition-all duration-1000"
            :stroke-dasharray="ARC_CIRCUMFERENCE"
            :stroke-dashoffset="arcDashOffset"
          />
        </svg>

        <!-- Inner content -->
        <div class="relative z-10 text-center">
          <p
            class="text-5xl font-bold tracking-tight transition-colors duration-300"
            :class="activeSessionStart ? 'text-primary' : 'text-foreground'"
          >
            {{ timerDisplay }}
          </p>
          <p class="mt-1 text-xs font-medium text-muted-foreground">
            {{ activeSessionStart ? 'Sleeping...' : 'Ready to track' }}
          </p>
          <p v-if="activeSessionStart" class="mt-0.5 text-[10px] text-muted-foreground/70">
            {{ Math.round(arcProgress * 100) }}% of goal
          </p>
        </div>
      </div>

      <!-- Start/Stop Buttons -->
      <div v-if="activeSessionStart" class="flex w-full max-w-xs gap-3">
        <Button variant="outline" class="flex-1 rounded-2xl py-5" size="lg" @click="cancelActiveSleep">
          <X class="mr-2 size-5" />
          Cancel
        </Button>
        <Button class="flex-1 rounded-2xl py-5" size="lg" @click="handleStopTimer">
          <Square class="mr-2 size-5" />
          Stop & Save
        </Button>
      </div>
      <Button
        v-else
        class="w-full max-w-xs rounded-2xl py-6 text-base font-semibold shadow-lg shadow-primary/20"
        size="lg"
        @click="startSleepNow"
      >
        <Play class="mr-2 size-5" />
        Start Sleep
      </Button>

      <p v-if="errorMessage" class="mt-3 text-sm text-destructive">
        {{ errorMessage }}
      </p>
    </div>

    <!-- Today's Progress -->
    <div class="mb-6 rounded-2xl border border-border/60 bg-card p-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium">Today's Progress</span>
        <span class="text-sm font-semibold text-primary">{{ Math.round(todaySummary.percentage) }}%</span>
      </div>
      <div class="mb-3 h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          class="h-full rounded-full transition-all duration-700"
          :class="todaySummary.remainingMinutes === 0 ? 'bg-primary' : 'bg-primary/70'"
          :style="{ width: progressWidth }"
        />
      </div>
      <div class="flex justify-between text-xs text-muted-foreground">
        <span>{{ formatDurationFromMinutes(todaySummary.minutes) }} done</span>
        <span>{{ formatDurationFromMinutes(todaySummary.remainingMinutes) }} left</span>
      </div>
    </div>

    <!-- Manual Entry Section -->
    <div class="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-4 flex items-center gap-2">
        <div class="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Plus class="size-4 text-primary" />
        </div>
        <h2 class="text-base font-semibold">Log Sleep Manually</h2>
      </div>

      <div class="space-y-4">
        <div class="space-y-1.5">
          <label for="start" class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sleep Start</label>
          <Input id="start" v-model="sessionForm.start" type="datetime-local" class="rounded-xl bg-secondary/40" />
        </div>

        <div class="space-y-1.5">
          <label for="end" class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wake Time</label>
          <Input id="end" v-model="sessionForm.end" type="datetime-local" class="rounded-xl bg-secondary/40" />
        </div>

        <p v-if="errorMessage && !activeSessionStart" class="text-sm text-destructive">
          {{ errorMessage }}
        </p>

        <Button class="w-full rounded-2xl py-5" size="lg" @click="handleSaveSession">
          Save Session
          <ChevronRight class="ml-2 size-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
