<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { AlarmClock, Volume2, Bell, Brain } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSleepAlarm } from '@/composables/useSleepAlarm'
import { useSleepTimer } from '@/composables/useSleepTimer'
import { useSleepReminders } from '@/composables/useSleepReminders'
import { useHaptics } from '@/composables/useHaptics'
import { type AlarmType } from '@/lib/sleep'

const {
  alarmConfig,
  isAlarmFiring,
  smartAlarmWakeTime,
  setAlarmEnabled,
  setAlarmTime,
  setAlarmType,
} = useSleepAlarm()

const { activeSessionStart } = useSleepTimer()
const { notificationSupported, notificationPermission, requestNotificationPermission } = useSleepReminders()
const haptics = useHaptics()

const showAlarmSettings = ref(false)
const alarmTypeOptions: { value: AlarmType, label: string, icon: any, description: string }[] = [
  { value: 'sound', label: 'Sound', icon: Volume2, description: 'Audio + Notify' },
  { value: 'notification', label: 'Notify', icon: Bell, description: 'Notification only' },
  { value: 'smart', label: 'Smart', icon: Brain, description: 'Optimal cycle' },
]

// Web Audio Alarm logic moved here or kept in useSleepAlarm?
// Let's keep the audio context logic here as it's UI-driven audio
let audioCtx: AudioContext | null = null
let webAudioLoop: ReturnType<typeof setInterval> | null = null
let beepPhase = 0

function playWebAudioAlarm() {
  if (webAudioLoop) return
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const scheduleBeep = () => {
    if (!audioCtx) return
    const freq = beepPhase % 2 === 0 ? 880 : 660
    beepPhase++
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain); gain.connect(audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime)
    gain.gain.setValueAtTime(0, audioCtx.currentTime)
    gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.02)
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime + 0.25)
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.32)
    osc.start(); osc.stop(audioCtx.currentTime + 0.35)
  }
  scheduleBeep()
  webAudioLoop = setInterval(scheduleBeep, 450)
}

function stopWebAudioAlarm() {
  if (webAudioLoop) { clearInterval(webAudioLoop); webAudioLoop = null }
  beepPhase = 0
}

watch(isAlarmFiring, (firing) => {
  if (firing && (alarmConfig.value.type === 'sound' || alarmConfig.value.type === 'smart') && alarmConfig.value.soundEnabled) {
    playWebAudioAlarm()
  } else {
    stopWebAudioAlarm()
  }
})

onBeforeUnmount(() => stopWebAudioAlarm())
</script>

<template>
  <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <AlarmClock class="size-4 text-primary" />
        </div>
        <h2 class="text-base font-semibold">Wake-up Alarm</h2>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="sm" class="rounded-lg text-xs" @click="showAlarmSettings = !showAlarmSettings">
          {{ showAlarmSettings ? 'Done' : 'Settings' }}
        </Button>
        <button
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
          :class="alarmConfig.enabled ? 'bg-primary' : 'bg-secondary'"
          role="switch"
          :aria-checked="alarmConfig.enabled"
          @click="setAlarmEnabled(!alarmConfig.enabled); haptics.light()"
        >
          <span class="inline-block size-4 rounded-full bg-white shadow-sm transition-transform" :class="alarmConfig.enabled ? 'translate-x-6' : 'translate-x-1'" />
        </button>
      </div>
    </div>

    <div v-if="alarmConfig.enabled && !showAlarmSettings" class="flex items-center gap-3">
      <div class="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2">
        <component :is="alarmTypeOptions.find(o => o.value === alarmConfig.type)?.icon" class="size-4 text-primary" />
        <span class="text-sm font-semibold text-primary">{{ alarmConfig.time }}</span>
      </div>
      <span class="text-xs text-muted-foreground">{{ alarmTypeOptions.find(o => o.value === alarmConfig.type)?.description }}</span>
    </div>

    <div v-if="showAlarmSettings" class="mt-4 space-y-4">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground uppercase">Alarm Time</label>
        <Input type="time" :model-value="alarmConfig.time" class="rounded-xl bg-secondary/40" @update:model-value="setAlarmTime(String($event))" />
      </div>

      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground uppercase">Alarm Type</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="option in alarmTypeOptions" :key="option.value"
            class="flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all"
            :class="alarmConfig.type === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 bg-muted/20 text-muted-foreground'"
            @click="setAlarmType(option.value); haptics.light()"
          >
            <component :is="option.icon" class="size-5" />
            <span class="text-xs font-medium">{{ option.label }}</span>
          </button>
        </div>
      </div>

      <div v-if="alarmConfig.type === 'smart'" class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground uppercase">Smart Window (min)</label>
        <Input :model-value="alarmConfig.smartWindowMinutes" type="number" class="rounded-xl bg-secondary/40" @update:model-value="alarmConfig.smartWindowMinutes = Number($event) || 30" />
      </div>

      <div class="rounded-xl border border-border/30 bg-muted/20 p-3">
        <p class="text-[10px] text-muted-foreground leading-relaxed">
          Keep the app open for reliable alarms. Web Audio beeps will fire at the set time.
        </p>
      </div>
    </div>
  </div>
</template>
