<script setup lang="ts">
import { MoonStar, Play, Square, X, Plus, ChevronRight, Save, Trash2, Clock, Sparkles, Zap, Moon, Sunrise, AlarmClock, Bell, Volume2, Brain } from 'lucide-vue-next'
import { getQualityLabel, type SessionTemplate, calculateOptimalWakeTimes, getRecommendedWakeTime, type OptimalWakeTime, type AlarmType } from '@/lib/sleep'
import { useSleepData } from '@/composables/useSleepData'
import { toDateTimeLocalValue, SLEEP_TAGS, getQualityEmoji } from '@/lib/sleep'
import { useHaptics } from '@/composables/useHaptics'

definePageMeta({
  layout: 'mobile',
})

const {
  todaySummary,
  activeSessionStart,
  activeSessionMinutes,
  templates,
  alarmConfig,
  isAlarmFiring,
  alarmFiringType,
  smartAlarmWakeTime,
  dismissAlarm,
  snoozeAlarm,
  setAlarmEnabled,
  setAlarmTime,
  setAlarmType,
  notificationSupported,
  notificationPermission,
  requestNotificationPermission,
  startSleepNow,
  stopSleepNow,
  cancelActiveSleep,
  saveSession,
  saveTemplate,
  deleteTemplate,
  useTemplate,
  formatDurationFromMinutes,
} = useSleepData()

const haptics = useHaptics()

// Template management
const showTemplateForm = ref(false)
const templateForm = reactive({
  name: '',
  durationMinutes: 480, // default 8 hours
  defaultQuality: undefined as 1 | 2 | 3 | 4 | 5 | undefined,
  defaultTags: [] as string[],
})
const templateError = ref('')

function handleUseTemplate(templateId: string) {
  const result = useTemplate(templateId)
  if (result.error) {
    templateError.value = result.error
    haptics.error()
  } else {
    templateError.value = ''
    haptics.success()
  }
}

function handleSaveTemplate() {
  templateError.value = ''
  if (!templateForm.name.trim()) {
    templateError.value = 'Template name is required'
    haptics.error()
    return
  }
  if (templateForm.durationMinutes <= 0) {
    templateError.value = 'Duration must be greater than 0'
    haptics.error()
    return
  }

  saveTemplate({
    name: templateForm.name.trim(),
    durationMinutes: templateForm.durationMinutes,
    defaultQuality: templateForm.defaultQuality,
    defaultTags: [...templateForm.defaultTags],
  })

  haptics.success()
  templateForm.name = ''
  templateForm.durationMinutes = 480
  templateForm.defaultQuality = undefined
  templateForm.defaultTags = []
  showTemplateForm.value = false
}

function handleDeleteTemplate(id: string) {
  deleteTemplate(id)
  haptics.light()
}

function createTemplateFromCurrent() {
  const duration = Math.round((new Date(sessionForm.end).getTime() - new Date(sessionForm.start).getTime()) / (60 * 1000))
  if (duration > 0) {
    templateForm.durationMinutes = duration
    templateForm.defaultQuality = sessionForm.quality
    templateForm.defaultTags = [...sessionForm.tags]
    showTemplateForm.value = true
  }
}


// Manual session form
const end = new Date()
const start = new Date(end.getTime() - 90 * 60 * 1000)
const sessionForm = reactive({
  start: toDateTimeLocalValue(start),
  end: toDateTimeLocalValue(end),
  quality: undefined as 1 | 2 | 3 | 4 | 5 | undefined,
  tags: [] as string[],
  notes: '',
})

const errorMessage = ref('')

const progressWidth = computed(() => `${Math.min(todaySummary.value.percentage, 100)}%`)

function handleSaveSession() {
  errorMessage.value = ''
  if (!sessionForm.start || !sessionForm.end) {
    errorMessage.value = 'Start and end time are required.'
    haptics.error()
    return
  }
  const result = saveSession({
    start: sessionForm.start,
    end: sessionForm.end,
    quality: sessionForm.quality,
    tags: sessionForm.tags,
    notes: sessionForm.notes,
  })
  if (result.error) {
    errorMessage.value = result.error
    haptics.error()
    return
  }
  haptics.success()
  const newEnd = new Date()
  const newStart = new Date(newEnd.getTime() - 90 * 60 * 1000)
  sessionForm.start = toDateTimeLocalValue(newStart)
  sessionForm.end = toDateTimeLocalValue(newEnd)
  sessionForm.quality = undefined
  sessionForm.tags = []
  sessionForm.notes = ''
}

function handleStopTimer() {
  errorMessage.value = ''
  const result = stopSleepNow()
  if (result?.error) {
    errorMessage.value = result.error
    haptics.error()
    return
  }
  haptics.stop()
}

function handleStartSleep() {
  startSleepNow()
  haptics.start()
}

function handleCancelSleep() {
  cancelActiveSleep()
  haptics.light()
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

// Optimal wake time suggestions
const showOptimalWakeTimes = ref(false)
const optimalWakeTimes = computed(() => {
  if (!activeSessionStart.value) return []
  const start = new Date(activeSessionStart.value)
  return calculateOptimalWakeTimes(start)
})
const recommendedWakeTime = computed(() => {
  if (!activeSessionStart.value) return null
  const start = new Date(activeSessionStart.value)
  return getRecommendedWakeTime(start, todaySummary.value.goalMinutes / 60)
})

function stopAtOptimalWakeTime(wakeTime: OptimalWakeTime) {
  // Set the end time to the optimal wake time and stop
  const start = new Date(activeSessionStart.value!)
  const end = new Date(wakeTime.wakeTime)

  // Calculate current duration vs optimal duration
  const currentMinutes = activeSessionMinutes.value
  const optimalMinutes = wakeTime.totalMinutes

  if (currentMinutes >= optimalMinutes) {
    // If we've already passed the optimal time, stop now
    stopSleepNow()
    haptics.stop()
  } else {
    // Show a message that they need to wait longer
    templateError.value = `Sleep for ${formatDurationFromMinutes(optimalMinutes - currentMinutes)} more to complete ${wakeTime.cycles} cycles`
    haptics.light()
  }
}

// Alarm audio playback
const alarmAudio = ref<HTMLAudioElement | null>(null)
const alarmIntervalId = ref<ReturnType<typeof setInterval> | null>(null)

function playAlarmSound() {
  if (!alarmAudio.value) {
    // Generate alarm sound using Web Audio API as fallback
    alarmAudio.value = new Audio('/alarm.mp3')
    alarmAudio.value.loop = true
    alarmAudio.value.volume = 0.8
  }
  alarmAudio.value.play().catch(() => {
    // If audio file not available, use Web Audio API
    playWebAudioAlarm()
  })
}

function stopAlarmSound() {
  if (alarmAudio.value) {
    alarmAudio.value.pause()
    alarmAudio.value.currentTime = 0
  }
  if (alarmIntervalId.value) {
    clearInterval(alarmIntervalId.value)
    alarmIntervalId.value = null
  }
  stopWebAudioAlarm()
}

// Web Audio API fallback for alarm sound
let audioCtx: AudioContext | null = null
let webAudioOscillator: OscillatorNode | null = null
let webAudioLoop: ReturnType<typeof setInterval> | null = null

function playWebAudioAlarm() {
  if (!audioCtx) audioCtx = new AudioContext()
  let isOn = true
  webAudioLoop = setInterval(() => {
    if (!isOn) return
    const osc = audioCtx!.createOscillator()
    const gain = audioCtx!.createGain()
    osc.connect(gain)
    gain.connect(audioCtx!.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.value = 0.3
    osc.start()
    osc.stop(audioCtx!.currentTime + 0.3)
  }, 500)
}

function stopWebAudioAlarm() {
  if (webAudioLoop) {
    clearInterval(webAudioLoop)
    webAudioLoop = null
  }
  if (webAudioOscillator) {
    webAudioOscillator.stop()
    webAudioOscillator = null
  }
}

// Watch alarm firing state to play/stop sound
watch(isAlarmFiring, (firing) => {
  if (firing && (alarmConfig.value.type === 'sound' || alarmConfig.value.type === 'smart') && alarmConfig.value.soundEnabled) {
    playAlarmSound()
  } else {
    stopAlarmSound()
  }
})

function handleDismissAlarm() {
  stopAlarmSound()
  dismissAlarm()
  haptics.light()
}

function handleSnoozeAlarm() {
  stopAlarmSound()
  snoozeAlarm()
  haptics.light()
}

// Alarm type labels
const alarmTypeOptions: { value: AlarmType, label: string, icon: any, description: string }[] = [
  { value: 'sound', label: 'Sound', icon: Volume2, description: 'Plays audio + notification' },
  { value: 'notification', label: 'Notify', icon: Bell, description: 'Browser notification only' },
  { value: 'smart', label: 'Smart', icon: Brain, description: 'Wakes at optimal cycle time' },
]

const showAlarmSettings = ref(false)
</script>

<template>
  <!-- Alarm Firing Overlay -->
  <Transition name="alarm-overlay">
    <div
      v-if="isAlarmFiring"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
    >
      <div class="flex flex-col items-center gap-6 px-6">
        <!-- Animated alarm icon -->
        <div class="relative">
          <div class="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div class="relative flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <AlarmClock class="size-12" />
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
            @click="handleSnoozeAlarm"
          >
            <Moon class="mr-2 size-5" />
            Snooze
          </Button>
          <Button
            class="flex-1 rounded-2xl py-5"
            size="lg"
            @click="handleDismissAlarm"
          >
            <Sunrise class="mr-2 size-5" />
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  </Transition>

  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <MoonStar class="size-5" />
        </div>
        <span class="text-lg font-semibold">Sleep Timer</span>
      </div>
      <!-- Alarm indicator in header -->
      <div v-if="alarmConfig.enabled" class="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1">
        <AlarmClock class="size-3.5 text-primary" />
        <span class="text-xs font-medium text-primary">{{ alarmConfig.time }}</span>
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
          <ChevronRight
            class="size-4 text-muted-foreground transition-transform"
            :class="showOptimalWakeTimes ? 'rotate-90' : ''"
          />
        </button>

        <div v-if="showOptimalWakeTimes" class="mt-2 space-y-2">
          <!-- Recommended -->
          <div
            v-if="recommendedWakeTime"
            class="rounded-xl border-2 border-primary/30 bg-primary/5 p-3"
          >
            <div class="mb-1 flex items-center gap-1.5">
              <Sparkles class="size-3.5 text-primary" />
              <span class="text-xs font-medium text-primary">Recommended for your goal</span>
            </div>
            <button
              class="w-full text-left"
              @click="stopAtOptimalWakeTime(recommendedWakeTime)"
            >
              <p class="text-sm font-semibold">{{ recommendedWakeTime.label }}</p>
            </button>
          </div>

          <!-- All options -->
          <div class="space-y-1.5">
            <button
              v-for="wakeTime in optimalWakeTimes.filter(w => w.cycles !== recommendedWakeTime?.cycles)"
              :key="wakeTime.cycles"
              class="w-full rounded-lg border border-border/30 bg-muted/20 p-2.5 text-left text-sm transition-colors hover:bg-muted/40"
              @click="stopAtOptimalWakeTime(wakeTime)"
            >
              {{ wakeTime.label }}
            </button>
          </div>

          <p class="text-center text-[10px] text-muted-foreground">
            Based on 90-minute sleep cycles
          </p>
        </div>
      </div>

      <!-- Start/Stop Buttons -->
      <div v-if="activeSessionStart" class="flex w-full max-w-xs gap-3">
        <Button variant="outline" class="flex-1 rounded-2xl py-5" size="lg" @click="handleCancelSleep">
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
        @click="handleStartSleep"
      >
        <Play class="mr-2 size-5" />
        Start Sleep
      </Button>

      <p v-if="errorMessage" class="mt-3 text-sm text-destructive">
        {{ errorMessage }}
      </p>
    </div>

    <!-- Alarm Settings -->
    <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <AlarmClock class="size-4 text-primary" />
          </div>
          <h2 class="text-base font-semibold">Wake-up Alarm</h2>
        </div>
        <div class="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            class="rounded-lg text-xs"
            @click="showAlarmSettings = !showAlarmSettings"
          >
            {{ showAlarmSettings ? 'Done' : 'Settings' }}
          </Button>
          <!-- Toggle switch -->
          <button
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors"
            :class="alarmConfig.enabled ? 'bg-primary' : 'bg-secondary'"
            @click="setAlarmEnabled(!alarmConfig.enabled)"
          >
            <span
              class="inline-block size-4 rounded-full bg-white shadow-sm transition-transform"
              :class="alarmConfig.enabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>
      </div>

      <!-- Alarm enabled status -->
      <div v-if="alarmConfig.enabled && !showAlarmSettings" class="flex items-center gap-3">
        <div class="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2">
          <component :is="alarmTypeOptions.find(o => o.value === alarmConfig.type)?.icon" class="size-4 text-primary" />
          <span class="text-sm font-semibold text-primary">{{ alarmConfig.time }}</span>
        </div>
        <span class="text-xs text-muted-foreground">
          {{ alarmTypeOptions.find(o => o.value === alarmConfig.type)?.description }}
        </span>
      </div>

      <!-- Smart alarm info when sleeping -->
      <div
        v-if="alarmConfig.enabled && alarmConfig.type === 'smart' && activeSessionStart && smartAlarmWakeTime && !showAlarmSettings"
        class="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3"
      >
        <div class="flex items-center gap-1.5">
          <Brain class="size-3.5 text-primary" />
          <span class="text-xs font-medium text-primary">Smart wake at {{ smartAlarmWakeTime.label }}</span>
        </div>
        <p class="mt-1 text-[10px] text-muted-foreground">
          Within {{ alarmConfig.smartWindowMinutes }}min window before {{ alarmConfig.time }}
        </p>
      </div>

      <!-- Notification permission prompt -->
      <div
        v-if="alarmConfig.enabled && notificationSupported && notificationPermission !== 'granted' && showAlarmSettings"
        class="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
      >
        <p class="text-xs text-amber-600 dark:text-amber-400">
          Notifications are not allowed. Grant permission for alarm notifications.
        </p>
        <Button variant="outline" size="sm" class="mt-2 rounded-lg text-xs" @click="requestNotificationPermission">
          <Bell class="mr-1 size-3" />
          Allow Notifications
        </Button>
      </div>

      <!-- Expanded alarm settings -->
      <div v-if="showAlarmSettings" class="space-y-4">
        <!-- Alarm time -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alarm Time</label>
          <Input
            type="time"
            :model-value="alarmConfig.time"
            class="rounded-xl bg-secondary/40"
            @update:model-value="setAlarmTime(String($event))"
          />
        </div>

        <!-- Alarm type -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Alarm Type</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="option in alarmTypeOptions"
              :key="option.value"
              class="flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all"
              :class="alarmConfig.type === option.value ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40'"
              @click="setAlarmType(option.value)"
            >
              <component :is="option.icon" class="size-5" />
              <span class="text-xs font-medium">{{ option.label }}</span>
              <span class="text-[9px] text-center leading-tight opacity-70">{{ option.description }}</span>
            </button>
          </div>
        </div>

        <!-- Sound toggle (for sound and smart types) -->
        <div v-if="alarmConfig.type !== 'notification'" class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">Sound</p>
            <p class="text-xs text-muted-foreground">Play audio when alarm fires</p>
          </div>
          <button
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors"
            :class="alarmConfig.soundEnabled ? 'bg-primary' : 'bg-secondary'"
            @click="alarmConfig.soundEnabled = !alarmConfig.soundEnabled"
          >
            <span
              class="inline-block size-4 rounded-full bg-white shadow-sm transition-transform"
              :class="alarmConfig.soundEnabled ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <!-- Smart alarm window -->
        <div v-if="alarmConfig.type === 'smart'" class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Smart Window</label>
          <div class="flex items-center gap-2">
            <Input
              :model-value="alarmConfig.smartWindowMinutes"
              type="number"
              min="10"
              max="120"
              class="rounded-xl bg-secondary/40"
              @update:model-value="alarmConfig.smartWindowMinutes = Number($event) || 30"
            />
            <span class="text-xs text-muted-foreground whitespace-nowrap">minutes before alarm</span>
          </div>
          <p class="text-[10px] text-muted-foreground">
            Alarm will find the optimal sleep cycle wake time within this window before your set alarm time.
          </p>
        </div>

        <!-- Snooze duration -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Snooze Duration</label>
          <div class="flex items-center gap-2">
            <Input
              :model-value="alarmConfig.snoozeMinutes"
              type="number"
              min="1"
              max="30"
              class="rounded-xl bg-secondary/40"
              @update:model-value="alarmConfig.snoozeMinutes = Number($event) || 5"
            />
            <span class="text-xs text-muted-foreground whitespace-nowrap">minutes</span>
          </div>
        </div>

        <!-- Limitations notice -->
        <div class="rounded-xl border border-border/30 bg-muted/20 p-3">
          <p class="text-[10px] text-muted-foreground leading-relaxed">
            <strong>Note:</strong> This is a web-based alarm. It works while the app is open in your browser. For reliable background alarms, keep the tab active. Sound may not play when the browser is minimized or the screen is locked.
          </p>
        </div>
      </div>
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

    <!-- Quick Templates Section -->
    <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Zap class="size-4 text-primary" />
          </div>
          <h2 class="text-base font-semibold">Quick Templates</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          class="rounded-lg text-xs"
          @click="showTemplateForm = !showTemplateForm"
        >
          <Plus class="mr-1 size-3" />
          {{ showTemplateForm ? 'Cancel' : 'New' }}
        </Button>
      </div>

      <p v-if="templateError" class="mb-3 text-sm text-destructive">
        {{ templateError }}
      </p>

      <!-- Template Form -->
      <div v-if="showTemplateForm" class="mb-4 rounded-2xl border border-border/40 bg-muted/30 p-4">
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-muted-foreground">Template Name</label>
            <Input
              v-model="templateForm.name"
              placeholder="e.g., Night Sleep, Power Nap"
              class="rounded-xl bg-background"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted-foreground">Duration</label>
            <div class="flex items-center gap-2">
              <Input
                v-model.number="templateForm.durationMinutes"
                type="number"
                min="1"
                class="rounded-xl bg-background"
              />
              <span class="text-xs text-muted-foreground whitespace-nowrap">minutes</span>
            </div>
            <p class="mt-1 text-xs text-muted-foreground">
              ≈ {{ formatDurationFromMinutes(templateForm.durationMinutes) }}
            </p>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted-foreground">Default Quality (optional)</label>
            <div class="flex gap-1">
              <button
                v-for="n in 5"
                :key="n"
                class="flex-1 rounded-lg py-2 text-lg transition-all"
                :class="templateForm.defaultQuality === n ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-secondary'"
                @click="templateForm.defaultQuality = templateForm.defaultQuality === n ? undefined : n as 1 | 2 | 3 | 4 | 5"
              >
                {{ getQualityEmoji(n) }}
              </button>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted-foreground">Default Tags (optional)</label>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="tag in SLEEP_TAGS"
                :key="tag"
                class="rounded-full px-2 py-1 text-xs transition-all"
                :class="templateForm.defaultTags.includes(tag) ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-secondary'"
                @click="templateForm.defaultTags.includes(tag) ? templateForm.defaultTags.splice(templateForm.defaultTags.indexOf(tag), 1) : templateForm.defaultTags.push(tag)"
              >
                {{ tag }}
              </button>
            </div>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" class="flex-1 rounded-xl" size="sm" @click="showTemplateForm = false">
              Cancel
            </Button>
            <Button class="flex-1 rounded-xl" size="sm" @click="handleSaveTemplate">
              <Save class="mr-1 size-4" />
              Save Template
            </Button>
          </div>
        </div>
      </div>

      <!-- Templates Grid -->
      <div v-if="templates.length > 0" class="grid grid-cols-2 gap-2">
        <div
          v-for="template in templates"
          :key="template.id"
          class="group relative rounded-2xl border border-border/40 bg-muted/20 p-3 transition-all hover:bg-muted/40"
        >
          <button
            class="w-full text-left"
            @click="handleUseTemplate(template.id)"
          >
            <div class="mb-1 flex items-center gap-1.5">
              <Clock class="size-3.5 text-muted-foreground" />
              <span class="text-sm font-medium truncate">{{ template.name }}</span>
            </div>
            <p class="text-xs text-muted-foreground">
              {{ formatDurationFromMinutes(template.durationMinutes) }}
            </p>
            <div v-if="template.defaultTags?.length" class="mt-1.5 flex flex-wrap gap-0.5">
              <span
                v-for="tag in template.defaultTags.slice(0, 2)"
                :key="tag"
                class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary"
              >
                {{ tag }}
              </span>
              <span v-if="template.defaultTags.length > 2" class="text-[9px] text-muted-foreground">
                +{{ template.defaultTags.length - 2 }}
              </span>
            </div>
          </button>
          <button
            class="absolute right-1.5 top-1.5 rounded-full p-1 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            @click.stop="handleDeleteTemplate(template.id)"
          >
            <Trash2 class="size-3" />
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="rounded-2xl border border-dashed border-border/40 bg-muted/20 p-4 text-center">
        <p class="text-sm text-muted-foreground">No templates yet</p>
        <p class="text-xs text-muted-foreground/70">Create quick-log templates for common sleep patterns</p>
      </div>

      <!-- Create from Current Session -->
      <button
        v-if="!showTemplateForm && sessionForm.start && sessionForm.end && new Date(sessionForm.end) > new Date(sessionForm.start)"
        class="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border/60 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/20"
        @click="createTemplateFromCurrent"
      >
        <Save class="size-3.5" />
        Save current times as template
      </button>
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

        <!-- Quality Rating -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sleep Quality</label>
          <div class="flex gap-2">
            <button
              v-for="n in 5"
              :key="n"
              class="flex-1 rounded-xl py-3 text-2xl transition-all"
              :class="sessionForm.quality === n ? 'bg-primary text-primary-foreground' : 'bg-secondary/40 hover:bg-secondary'"
              @click="sessionForm.quality = sessionForm.quality === n ? undefined : n as 1 | 2 | 3 | 4 | 5"
            >
              {{ getQualityEmoji(n) }}
            </button>
          </div>
          <p v-if="sessionForm.quality" class="text-xs text-muted-foreground">
            {{ getQualityEmoji(sessionForm.quality) }} {{ getQualityLabel(sessionForm.quality) }}
          </p>
        </div>

        <!-- Tags -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in SLEEP_TAGS"
              :key="tag"
              class="rounded-full px-3 py-1.5 text-xs font-medium transition-all"
              :class="sessionForm.tags.includes(tag) ? 'bg-primary text-primary-foreground' : 'bg-secondary/40 text-muted-foreground hover:bg-secondary'"
              @click="sessionForm.tags.includes(tag) ? sessionForm.tags.splice(sessionForm.tags.indexOf(tag), 1) : sessionForm.tags.push(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>

        <!-- Notes -->
        <div class="space-y-1.5">
          <label for="notes" class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
          <textarea
            id="notes"
            v-model="sessionForm.notes"
            rows="2"
            class="w-full rounded-xl bg-secondary/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="How did you sleep?"
          />
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
