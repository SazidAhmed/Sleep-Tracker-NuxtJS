<script setup lang="ts">
import { ChevronLeft, ChevronRight, Calendar, Flame } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { summarizeSleepDay, getDateKey, addDays } from '@/lib/sleep'

definePageMeta({
  layout: 'mobile',
})

const {
  sessions,
  settings,
  todayKey,
  formatDurationFromMinutes,
} = useSleepData()

const selectedYear = ref(new Date().getFullYear())

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

// Generate year heatmap data
const yearData = computed(() => {
  const year = selectedYear.value
  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31)

  // Adjust start to Sunday
  const startOffset = startDate.getDay()
  const gridStart = new Date(startDate)
  gridStart.setDate(gridStart.getDate() - startOffset)

  const days: Array<{
    date: string
    minutes: number
    goalMinutes: number
    percentage: number
    isCurrentYear: boolean
    isToday: boolean
    month: number
  }> = []

  const totalDays = 371 // 53 weeks to cover any year config

  for (let i = 0; i < totalDays; i++) {
    const cellDate = new Date(gridStart)
    cellDate.setDate(gridStart.getDate() + i)
    const dateKey = getDateKey(cellDate)
    const summary = summarizeSleepDay(dateKey, sessions.value, settings.value.dailyGoalHours)

    days.push({
      date: dateKey,
      minutes: summary.minutes,
      goalMinutes: summary.goalMinutes,
      percentage: summary.percentage,
      isCurrentYear: cellDate.getFullYear() === year,
      isToday: dateKey === todayKey.value,
      month: cellDate.getMonth(),
    })
  }

  return days
})

// Calculate color intensity based on sleep percentage
function getHeatColor(day: typeof yearData.value[0] | undefined): string {
  if (!day || !day.isCurrentYear) return 'bg-muted/20'
  if (day.minutes === 0) return 'bg-muted/30'

  const pct = day.percentage
  if (pct >= 100) return 'bg-emerald-500'
  if (pct >= 80) return 'bg-emerald-400'
  if (pct >= 60) return 'bg-emerald-300'
  if (pct >= 40) return 'bg-emerald-200'
  if (pct >= 20) return 'bg-emerald-100'
  return 'bg-emerald-50'
}

function getTooltipText(day: typeof yearData.value[0]): string {
  const date = new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  if (day.minutes === 0) return `${date}: No sleep logged`
  return `${date}: ${formatDurationFromMinutes(day.minutes)} (${Math.round(day.percentage)}%)`
}

const yearStats = computed(() => {
  const yearDays = yearData.value.filter(d => d.isCurrentYear && d.minutes > 0)
  const totalMinutes = yearDays.reduce((sum, d) => sum + d.minutes, 0)
  const goalDays = yearDays.filter(d => d.percentage >= 100).length

  return {
    trackedDays: yearDays.length,
    totalSleep: formatDurationFromMinutes(totalMinutes),
    goalDays,
    averageMinutes: yearDays.length ? Math.round(totalMinutes / yearDays.length) : 0,
  }
})

function previousYear() {
  selectedYear.value--
}

function nextYear() {
  if (selectedYear.value < new Date().getFullYear()) {
    selectedYear.value++
  }
}
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Flame class="size-5" />
        </div>
        <span class="text-lg font-semibold">Sleep Heat Map</span>
      </div>
    </header>

    <!-- Year Navigation -->
    <div class="mb-4 flex items-center justify-between rounded-2xl bg-card p-4 shadow-sm">
      <Button variant="ghost" size="icon" @click="previousYear">
        <ChevronLeft class="size-5" />
      </Button>
      <h2 class="text-lg font-semibold">
        {{ selectedYear }}
      </h2>
      <Button variant="ghost" size="icon" @click="nextYear">
        <ChevronRight class="size-5" />
      </Button>
    </div>

    <!-- Year Stats -->
    <div class="mb-4 grid grid-cols-3 gap-3">
      <div class="rounded-2xl bg-muted/50 p-3 text-center">
        <p class="text-xs text-muted-foreground">Days Tracked</p>
        <p class="text-lg font-semibold">{{ yearStats.trackedDays }}</p>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3 text-center">
        <p class="text-xs text-muted-foreground">Goals Met</p>
        <p class="text-lg font-semibold">{{ yearStats.goalDays }}</p>
      </div>
      <div class="rounded-2xl bg-muted/50 p-3 text-center">
        <p class="text-xs text-muted-foreground">Avg Sleep</p>
        <p class="text-lg font-semibold">{{ formatDurationFromMinutes(yearStats.averageMinutes) }}</p>
      </div>
    </div>

    <!-- Month Labels -->
    <div class="mb-1 ml-8 flex">
      <div
        v-for="(month, i) in months"
        :key="month"
        class="flex-1 text-center text-[10px] text-muted-foreground"
      >
        {{ month }}
      </div>
    </div>

    <!-- Heat Map Grid -->
    <div class="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <div class="flex">
        <!-- Weekday Labels -->
        <div class="mr-2 flex flex-col gap-1">
          <div
            v-for="label in weekdayLabels"
            :key="label"
            class="flex h-3 items-center justify-center text-[10px] text-muted-foreground"
          >
            {{ label }}
          </div>
        </div>

        <!-- Days Grid - 53 columns (weeks) x 7 rows (days) -->
        <div class="grid flex-1 gap-1" style="grid-template-columns: repeat(53, minmax(0, 1fr)); grid-template-rows: repeat(7, minmax(0, 1fr)); grid-auto-flow: column;">
          <div
            v-for="(day, index) in yearData"
            :key="day.date"
            class="group relative aspect-square rounded-sm"
            :class="getHeatColor(day)"
          >
            <div
              v-if="day.isToday"
              class="absolute inset-0 rounded-sm ring-2 ring-primary"
            />
            <!-- Tooltip -->
            <div
              v-if="day.isCurrentYear"
              class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block"
            >
              {{ getTooltipText(day) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
      <span>Less</span>
      <div class="flex gap-1">
        <div class="size-3 rounded-sm bg-emerald-50" />
        <div class="size-3 rounded-sm bg-emerald-100" />
        <div class="size-3 rounded-sm bg-emerald-200" />
        <div class="size-3 rounded-sm bg-emerald-300" />
        <div class="size-3 rounded-sm bg-emerald-400" />
        <div class="size-3 rounded-sm bg-emerald-500" />
      </div>
      <span>More</span>
    </div>

    <div class="mt-2 text-center text-xs text-muted-foreground">
      <span class="mr-4 inline-flex items-center gap-1">
        <div class="size-3 rounded-sm ring-2 ring-primary" />
        Today
      </span>
    </div>
  </div>
</template>
