<script setup lang="ts">
import { MoonStar, AlarmClock } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { useSleepAlarm } from '@/composables/useSleepAlarm'
import AlarmOverlay from '@/components/AlarmOverlay.vue'
import SleepTimerCircle from '@/components/timer/SleepTimerCircle.vue'
import AlarmSettingsCard from '@/components/timer/AlarmSettingsCard.vue'
import TemplateManager from '@/components/timer/TemplateManager.vue'
import ManualEntryForm from '@/components/timer/ManualEntryForm.vue'

definePageMeta({
  layout: 'mobile',
})

const { todaySummary, formatDurationFromMinutes } = useSleepData()
const {
  alarmConfig,
  isAlarmFiring,
  alarmFiringType,
  smartAlarmWakeTime,
  dismissAlarm,
  snoozeAlarm,
} = useSleepAlarm()
</script>

<template>
  <AlarmOverlay
    :is-alarm-firing="isAlarmFiring"
    :alarm-firing-type="alarmFiringType"
    :smart-alarm-wake-time="smartAlarmWakeTime"
    :alarm-config="alarmConfig"
    @dismiss="dismissAlarm"
    @snooze="snoozeAlarm"
  />

  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <MoonStar class="size-5" />
        </div>
        <h1 class="text-lg font-semibold">Sleep Timer</h1>
      </div>
      <div v-if="alarmConfig.enabled" class="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
        <AlarmClock class="size-3.5 text-primary" />
        <span class="text-xs font-medium text-primary">{{ alarmConfig.time }}</span>
      </div>
    </header>

    <SleepTimerCircle />

    <AlarmSettingsCard />

    <!-- Today's Progress -->
    <div class="mb-6 rounded-2xl border border-border/60 bg-card p-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium">Today's Progress</span>
        <span class="text-sm font-semibold text-primary">{{ Math.round(todaySummary.percentage) }}%</span>
      </div>
      <div class="mb-3 h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          class="h-full rounded-full transition-all duration-700 bg-primary"
          :style="{ width: `${Math.min(todaySummary.percentage, 100)}%` }"
        />
      </div>
      <div class="flex justify-between text-xs text-muted-foreground">
        <span>{{ formatDurationFromMinutes(todaySummary.minutes) }} done</span>
        <span>{{ formatDurationFromMinutes(todaySummary.remainingMinutes) }} left</span>
      </div>
    </div>

    <TemplateManager />

    <ManualEntryForm />
  </div>
</template>
