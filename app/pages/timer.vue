<script setup lang="ts">
import { MoonStar, Play, Square, X, Plus, Clock, ChevronRight } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { toDateTimeLocalValue, type SleepSession } from '@/lib/sleep'

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
  formatDateTimeLabel,
  toDateTimeLocalValue: formatToDateTimeLocal,
} = useSleepData()

// Manual session form
const end = new Date()
const start = new Date(end.getTime() - 90 * 60 * 1000)
const sessionForm = reactive({
  start: toDateTimeLocalValue(start),
  end: toDateTimeLocalValue(end),
})

const errorMessage = ref('')
const editorId = ref<string | null>(null)

const progressWidth = computed(() => `${Math.min(todaySummary.value.percentage, 100)}%`)

function handleSaveSession() {
  errorMessage.value = ''

  if (!sessionForm.start || !sessionForm.end) {
    errorMessage.value = 'Start and end time are required.'
    return
  }

  const result = saveSession(
    { start: sessionForm.start, end: sessionForm.end },
    editorId.value ?? undefined,
  )

  if (result.error) {
    errorMessage.value = result.error
    return
  }

  // Reset form
  const newEnd = new Date()
  const newStart = new Date(newEnd.getTime() - 90 * 60 * 1000)
  sessionForm.start = toDateTimeLocalValue(newStart)
  sessionForm.end = toDateTimeLocalValue(newEnd)
  editorId.value = null
}

function handleStopTimer() {
  errorMessage.value = ''
  const result = stopSleepNow()
  if (result?.error) {
    errorMessage.value = result.error
  }
}

// Format timer display as HH:MM
const timerDisplay = computed(() => {
  const hours = Math.floor(activeSessionMinutes.value / 60)
  const minutes = activeSessionMinutes.value % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
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
      <NuxtLink to="/" class="text-sm text-muted-foreground">
        Done
      </NuxtLink>
    </header>

    <!-- Timer Display -->
    <div class="mb-6 flex flex-col items-center">
      <div
        class="relative mb-4 flex size-48 items-center justify-center rounded-full border-4"
        :class="activeSessionStart ? 'border-primary animate-pulse' : 'border-muted-foreground/20'"
      >
        <div class="text-center">
          <p class="text-5xl font-bold tracking-tight">
            {{ timerDisplay }}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {{ activeSessionStart ? 'Sleeping...' : 'Ready' }}
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
          Stop
        </Button>
      </div>
      <Button
        v-else
        class="w-full max-w-xs rounded-2xl py-6 text-base font-semibold"
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
        <span class="text-sm font-semibold">{{ Math.round(todaySummary.percentage) }}%</span>
      </div>
      <div class="mb-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          class="h-full rounded-full bg-primary transition-all duration-500"
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
        <Plus class="size-5 text-primary" />
        <h2 class="text-lg font-semibold">Log Sleep Manually</h2>
      </div>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="start" class="text-sm">Sleep Start</Label>
          <Input id="start" v-model="sessionForm.start" type="datetime-local" class="rounded-xl" />
        </div>

        <div class="space-y-2">
          <Label for="end" class="text-sm">Wake Time</Label>
          <Input id="end" v-model="sessionForm.end" type="datetime-local" class="rounded-xl" />
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
