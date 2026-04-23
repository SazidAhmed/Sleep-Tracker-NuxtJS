<script setup lang="ts">
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'

definePageMeta({
  layout: 'mobile',
})

const {
  settings,
  sessions,
  formatDurationFromMinutes,
  formatMonthLabel,
  shiftMonth,
  buildMonthGrid,
  todayKey,
} = useSleepData()

const selectedMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const monthCalendar = computed(() =>
  buildMonthGrid(selectedMonth.value, sessions.value, settings.value.dailyGoalHours, todayKey.value),
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
          class="py-2 text-xs font-semibold text-muted-foreground"
        >
          {{ label }}
        </div>
      </div>

      <!-- Days Grid -->
      <div class="grid grid-cols-7 gap-1">
        <div
          v-for="day in monthCalendar.days"
          :key="day.date"
          class="relative overflow-hidden rounded-xl pb-1 pt-2"
          :class="[
            day.inCurrentMonth ? 'bg-background' : 'bg-muted/20',
            day.isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : '',
          ]"
        >
          <!-- Day number -->
          <div class="flex flex-col items-center">
            <span
              class="text-xs font-semibold leading-tight"
              :class="[
                !day.inCurrentMonth ? 'text-muted-foreground/40' : '',
                day.isToday ? 'text-primary' : '',
              ]"
            >
              {{ new Date(`${day.date}T00:00:00`).getDate() }}
            </span>
            <!-- Sleep time label -->
            <span
              v-if="day.minutes > 0 && day.inCurrentMonth"
              class="mt-0.5 text-[8px] font-bold leading-none"
              :class="day.remainingMinutes === 0 ? 'text-primary' : 'text-orange-500'"
            >
              {{ formatDurationFromMinutes(day.minutes) }}
            </span>
          </div>

          <!-- Color bar at bottom of cell -->
          <div
            v-if="day.minutes > 0 && day.inCurrentMonth"
            class="absolute bottom-0 left-0 right-0 h-1 rounded-full"
            :class="day.remainingMinutes === 0 ? 'bg-primary' : 'bg-orange-400'"
          />
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
      <div class="flex items-center gap-1.5">
        <div class="h-1.5 w-4 rounded-full bg-primary" />
        <span>Goal Met</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="h-1.5 w-4 rounded-full bg-orange-400" />
        <span>Partial</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="size-3 rounded-sm ring-2 ring-primary" />
        <span>Today</span>
      </div>
    </div>
  </div>
</template>
