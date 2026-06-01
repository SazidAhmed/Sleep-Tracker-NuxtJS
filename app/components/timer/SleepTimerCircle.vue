<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Sunrise, Sparkles, ChevronRight, X, Square, Play } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useSleepTimer } from '@/composables/useSleepTimer'
import { useSleepData } from '@/composables/useSleepData'
import { calculateOptimalWakeTimes, getRecommendedWakeTime, type OptimalWakeTime } from '@/lib/sleep'
import { useHaptics } from '@/composables/useHaptics'

const {
  activeSessionStart,
  activeSessionMinutes,
  startSleepNow,
  stopSleepNow,
  cancelActiveSleep,
} = useSleepTimer()

const { todaySummary, formatDurationFromMinutes } = useSleepData()
const haptics = useHaptics()

// Timer Ticker
const localNow = ref(new Date())
let timerIntervalId: ReturnType<typeof setInterval> | null = null

watch(() => activeSessionStart.value, (start) => {
  if (start) {
    if (!timerIntervalId) {
      localNow.value = new Date()
      timerIntervalId = setInterval(() => { localNow.value = new Date() }, 1000)
    }
  } else {
    if (timerIntervalId) {
      clearInterval(timerIntervalId)
      timerIntervalId = null
    }
  }
}, { immediate: true })

onBeforeUnmount(() => {
  if (timerIntervalId) clearInterval(timerIntervalId)
})

const realTimeDurationMs = computed(() => {
  if (!activeSessionStart.value) return 0
  const start = new Date(activeSessionStart.value).getTime()
  return Math.max(0, localNow.value.getTime() - start)
})

const timerDisplay = computed(() => {
  const totalSeconds = Math.floor(realTimeDurationMs.value / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
})

// SVG arc
const ARC_R = 88
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_R
const arcProgress = computed(() => {
  const goalMs = (todaySummary.value.goalMinutes || 480) * 60 * 1000
  return Math.min(realTimeDurationMs.value / goalMs, 1)
})
const arcDashOffset = computed(() => ARC_CIRCUMFERENCE * (1 - arcProgress.value))

// Optimal Wake Times
const showOptimalWakeTimes = ref(false)
const optimalWakeTimes = computed(() => {
  if (!activeSessionStart.value) return []
  return calculateOptimalWakeTimes(new Date(activeSessionStart.value))
})
const recommendedWakeTime = computed(() => {
  if (!activeSessionStart.value) return null
  return getRecommendedWakeTime(new Date(activeSessionStart.value), todaySummary.value.goalMinutes / 60)
})

const errorMessage = ref('')

function stopAtOptimalWakeTime(wakeTime: OptimalWakeTime) {
  const currentMinutes = activeSessionMinutes.value
  const optimalMinutes = wakeTime.totalMinutes
  if (currentMinutes >= optimalMinutes) {
    stopSleepNow()
    haptics.stop()
  } else {
    errorMessage.value = `Sleep for ${formatDurationFromMinutes(optimalMinutes - currentMinutes)} more`
    haptics.light()
    setTimeout(() => errorMessage.value = '', 3000)
  }
}
</script>

<template>
  <div class="mb-6 flex flex-col items-center">
    <div class="relative mb-5 flex size-52 items-center justify-center">
      <svg class="absolute inset-0 size-full -rotate-90" viewBox="0 0 200 200">
        <circle cx="100" cy="100" :r="ARC_R" fill="none" stroke="currentColor" stroke-width="10" class="text-border" />
        <circle
          v-if="activeSessionStart"
          cx="100" cy="100" :r="ARC_R"
          fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"
          class="text-primary transition-all duration-1000"
          :stroke-dasharray="ARC_CIRCUMFERENCE"
          :stroke-dashoffset="arcDashOffset"
        />
      </svg>

      <div class="relative z-10 flex flex-col items-center justify-center text-center">
        <p class="text-4xl font-bold tracking-tighter tabular-nums" :class="activeSessionStart ? 'text-primary' : 'text-foreground'">
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

    <!-- Optimal Wake Times -->
    <div v-if="activeSessionStart" class="mb-4 w-full max-w-xs">
      <button
        class="flex w-full items-center justify-between rounded-xl border border-border/40 bg-muted/30 p-3 transition-colors hover:bg-muted/50"
        @click="showOptimalWakeTimes = !showOptimalWakeTimes"
      >
        <div class="flex items-center gap-2">
          <Sunrise class="size-4 text-amber-500" />
          <span class="text-sm font-medium">Optimal Wake Times</span>
        </div>
        <ChevronRight class="size-4 text-muted-foreground transition-transform" :class="showOptimalWakeTimes ? 'rotate-90' : ''" />
      </button>

      <div v-if="showOptimalWakeTimes" class="mt-2 space-y-2">
        <div v-if="recommendedWakeTime" class="rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
          <div class="mb-1 flex items-center gap-1.5">
            <Sparkles class="size-3.5 text-primary" />
            <span class="text-xs font-medium text-primary">Recommended</span>
          </div>
          <button class="w-full text-left" @click="stopAtOptimalWakeTime(recommendedWakeTime)">
            <p class="text-sm font-semibold">{{ recommendedWakeTime.label }}</p>
          </button>
        </div>
        <div class="space-y-1.5">
          <button
            v-for="wakeTime in optimalWakeTimes.filter(w => w.cycles !== recommendedWakeTime?.cycles)"
            :key="wakeTime.cycles"
            class="w-full rounded-lg border border-border/30 bg-muted/20 p-2.5 text-left text-sm hover:bg-muted/40"
            @click="stopAtOptimalWakeTime(wakeTime)"
          >
            {{ wakeTime.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div v-if="activeSessionStart" class="flex w-full max-w-xs gap-3">
      <Button variant="outline" class="flex-1 rounded-2xl py-5" size="lg" @click="cancelActiveSleep(); haptics.light()">
        <X class="mr-2 size-5" /> Cancel
      </Button>
      <Button class="flex-1 rounded-2xl py-5" size="lg" @click="stopSleepNow(); haptics.stop()">
        <Square class="mr-2 size-5" /> Stop
      </Button>
    </div>
    <Button v-else class="w-full max-w-xs rounded-2xl py-6 text-base font-semibold shadow-lg shadow-primary/20" size="lg" @click="startSleepNow(); haptics.start()">
      <Play class="mr-2 size-5" /> Start Sleep
    </Button>

    <p v-if="errorMessage" class="mt-3 text-sm text-destructive">{{ errorMessage }}</p>
  </div>
</template>
