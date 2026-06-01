<script setup lang="ts">
/**
 * AlarmOverlay.vue — Full-screen alarm firing overlay component
 * Emits: dismiss, snooze
 * Props: isAlarmFiring, alarmFiringType, smartAlarmWakeTime, alarmConfig
 */
import { Moon, Sunrise, AlarmClock } from 'lucide-vue-next'
import type { AlarmConfig, OptimalWakeTime } from '@/lib/sleep'

const props = defineProps<{
  isAlarmFiring: boolean
  alarmFiringType: string | null
  smartAlarmWakeTime: OptimalWakeTime | null
  alarmConfig: AlarmConfig
}>()

const emit = defineEmits<{
  dismiss: []
  snooze: []
}>()
</script>

<template>
  <Transition name="alarm-overlay">
    <div
      v-if="isAlarmFiring"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-label="Alarm firing"
      aria-live="assertive"
    >
      <div class="flex flex-col items-center gap-6 px-6">
        <!-- Animated alarm icon -->
        <div class="relative">
          <div class="absolute inset-0 animate-ping rounded-full bg-primary/20" aria-hidden="true" />
          <div class="relative flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <AlarmClock class="size-12" aria-hidden="true" />
          </div>
        </div>

        <div class="text-center">
          <h2 class="text-2xl font-bold">
            {{ alarmFiringType === 'smart' ? 'Smart Alarm' : 'Wake Up!' }}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ alarmFiringType === 'smart' && smartAlarmWakeTime ? smartAlarmWakeTime.label : `It's ${alarmConfig.time}` }}
          </p>
          <p v-if="alarmConfig.snoozeCount > 0" class="mt-0.5 text-xs text-muted-foreground/70">
            Snoozed {{ alarmConfig.snoozeCount }} time{{ alarmConfig.snoozeCount > 1 ? 's' : '' }}
          </p>
        </div>

        <div class="flex w-full max-w-xs gap-3">
          <Button
            variant="outline"
            class="flex-1 rounded-2xl py-5"
            size="lg"
            @click="emit('snooze')"
          >
            <Moon class="mr-2 size-5" aria-hidden="true" />
            Snooze
          </Button>
          <Button
            class="flex-1 rounded-2xl py-5"
            size="lg"
            @click="emit('dismiss')"
          >
            <Sunrise class="mr-2 size-5" aria-hidden="true" />
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.alarm-overlay-enter-active {
  transition: all 0.3s ease-out;
}
.alarm-overlay-leave-active {
  transition: all 0.2s ease-in;
}
.alarm-overlay-enter-from,
.alarm-overlay-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
