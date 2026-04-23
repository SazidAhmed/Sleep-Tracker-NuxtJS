<script setup lang="ts">
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'

definePageMeta({
  layout: 'mobile',
})

const {
  settings,
  formatDurationFromMinutes,
  formatMonthLabel,
  shiftMonth,
  buildMonthGrid,
  todayKey,
} = useSleepData()

const selectedMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const monthCalendar = computed(() =>
  buildMonthGrid(selectedMonth.value, [], settings.value.dailyGoalHours, todayKey.value),
)

const monthAverageMinutes = computed(() => {
  const trackedDays = monthCalendar.value.trackedDays
  if (!trackedDays) return 0
  return Math.round(monthCalendar.value.totalMinutes / trackedDays)
})

function goToPreviousMonth() {
  selectedMonth.value = shiftMonth(selectedMonth.value, -1)
}

function goToNextMonth() {
  selectedMonth.value = shiftMonth(selectedMonth.value, 1)
}
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Calendar class="size-5" />
        </div>
        <span class="text-lg font-semibold">Calendar</span>
      </div>
    </header>

    <!-- Month Navigation -->
    <div class="mb-4 flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm">
      <Button variant="ghost" size="icon" @click="goToPreviousMonth">
        <ChevronLeft class="size-5" />
      </Button>
      <h2 class="text-lg font-semibold">
        {{ formatMonthLabel(selectedMonth) }}
      </h2>
      <Button variant="ghost" size="icon" @click="goToNextMonth">
        <ChevronRight class="size-5" />
      </Button>
    </div>

    <!-- Month Stats -->
    <div class="mb-4 grid grid-cols-3 gap-3">
      <div class="rounded-2xl bg-muted/50 p-3 text-center">
        <p class="text-xs text-muted-foreground">Total</p>
        <p class="text-lg font-semibold">{{ formatDurationFromMinutes(monthCalendar.totalMinutes) }}</p>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3 text-center">
        <p class="text-xs text-muted-foreground">Goals Met</p>
        <p class="text-lg font-semibold">{{ monthCalendar.completedDays }}</p>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3 text-center">
        <p class="text-xs text-muted-foreground">Average</p>
        <p class="text-lg font-semibold">{{ formatDurationFromMinutes(monthAverageMinutes) }}</p>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <!-- Weekday Headers -->
      <div class="mb-2 grid grid-cols-7 gap-1 text-center">
        <div
          v-for="label in weekdayLabels"
          :key="label"
          class="py-2 text-xs font-medium text-muted-foreground"
        >
          {{ label }}
        </div>
      </div>

      <!-- Days Grid -->
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="day in monthCalendar.days"
          :key="day.date"
          class="aspect-square rounded-xl p-1"
          :class="[
            day.inCurrentMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground',
            day.isToday ? 'ring-2 ring-primary' : '',
            day.remainingMinutes === 0 && day.minutes > 0 ? 'bg-primary/10' : '',
          ]"
        >
          <div class="flex h-full flex-col items-center justify-center gap-1">
            <span class="text-xs font-medium">{{ new Date(`${day.date}T00:00:00`).getDate() }}</span>
            <span
              v-if="day.minutes > 0"
              class="text-[9px] font-semibold"
              :class="day.remainingMinutes === 0 ? 'text-primary' : 'text-muted-foreground'"
            >
              {{ formatDurationFromMinutes(day.minutes) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
      <div class="flex items-center gap-1">
        <div class="size-3 rounded-full bg-primary" />
        <span>Goal Met</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="size-3 rounded-full bg-accent" />
        <span>Partial</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="size-3 rounded-full border border-primary" />
        <span>Today</span>
      </div>
    </div>
  </div>
</template>
