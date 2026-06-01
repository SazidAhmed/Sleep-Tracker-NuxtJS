<script setup lang="ts">
import { MoonStar, Clock, Zap, Flame, ArrowRight, Lightbulb, Play, Plus, History, BarChart3, X, Sparkles, Download, BookOpen } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { useSleepAnalytics } from '@/composables/useSleepAnalytics'
import { getQualityEmoji, getQualityLabel } from '@/lib/sleep'
import { useLongPress } from '@/composables/useLongPress'
import { useHaptics } from '@/composables/useHaptics'
import { usePwaInstall } from '@/composables/usePwaInstall'

definePageMeta({
  layout: 'mobile',
  alias: ['/today'],
})

const {
  todaySummary,
  guidance,
  latestSession,
  averageSleepMinutes,
  currentStreak,
  formatDurationFromMinutes,
  formatDateLabel,
  formatTimeLabel,
  getSessionDurationMinutes,
  refreshNow,
} = useSleepData()

const {
  recommendations,
  sleepScore,
} = useSleepAnalytics()

function getGradeBadgeClass(grade: string) {
  switch (grade) {
    case 'A': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
    case 'B': return 'bg-teal-500/10 text-teal-500 border-teal-500/20'
    case 'C': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    case 'D': return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    default: return 'bg-red-500/10 text-red-500 border-red-500/20'
  }
}

const progressWidth = computed(() => `${Math.min(todaySummary.value.percentage, 100)}%`)
const isGoalCompleted = computed(() => todaySummary.value.remainingMinutes === 0)
const progressColor = computed(() => {
  const pct = todaySummary.value.percentage
  if (pct >= 100) return 'bg-primary'
  if (pct >= 60) return 'bg-primary/80'
  if (pct >= 30) return 'bg-primary/60'
  return 'bg-primary/40'
})

// ── Goal Celebration Confetti ────────────────────────────────
const showCelebration = ref(false)
const confettiParticles = ref<Array<{ id: number, emoji: string, x: number, delay: number, duration: number }>>([])
const CONFETTI_EMOJIS = ['🌙', '⭐', '✨', '💫', '🎉', '🌟', '😴', '🏆']

let celebrationTimeout: ReturnType<typeof setTimeout> | null = null
let wasGoalCompleted = false

watch(isGoalCompleted, (completed) => {
  if (completed && !wasGoalCompleted) {
    triggerCelebration()
  }
  wasGoalCompleted = completed
})

function triggerCelebration() {
  if (celebrationTimeout) clearTimeout(celebrationTimeout)
  confettiParticles.value = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)]!,
    x: 5 + (i / 17) * 90, // spread across 5-95% width
    delay: Math.random() * 0.4,
    duration: 1.2 + Math.random() * 0.8,
  }))
  showCelebration.value = true
  celebrationTimeout = setTimeout(() => {
    showCelebration.value = false
    confettiParticles.value = []
  }, 2500)
}

onBeforeUnmount(() => {
  if (celebrationTimeout) clearTimeout(celebrationTimeout)
})

// Quick Actions
const showQuickActions = ref(false)
const quickActionArea = ref<HTMLElement | null>(null)
const haptics = useHaptics()
const router = useRouter()
const { canInstall, promptInstall, dismiss } = usePwaInstall()

// Onboarding
const showOnboarding = ref(false)

onMounted(() => {
  wasGoalCompleted = isGoalCompleted.value
  // Check if user has completed onboarding
  const onboardingComplete = localStorage.getItem('sleep-tracker-onboarding-complete')
  if (!onboardingComplete) {
    showOnboarding.value = true
  }
})

useLongPress(quickActionArea, {
  onLongPress: () => {
    haptics.medium()
    showQuickActions.value = true
  },
})

function closeQuickActions() {
  showQuickActions.value = false
}

function quickNavigate(path: string) {
  closeQuickActions()
  router.push(path)
}

function quickStartTimer() {
  closeQuickActions()
  router.push('/timer')
}
// Pull-to-refresh gesture handling
const isRefreshing = ref(false)
const pullDistance = ref(0)
const maxPull = 120 // maximum pull-down in px
const triggerThreshold = 70 // pull distance to trigger refresh in px
const pullIndicatorScale = computed(() => Math.min(pullDistance.value / triggerThreshold, 1.2))
const pullIndicatorRotate = computed(() => (pullDistance.value / maxPull) * 360)

let touchStartY = 0
let touchStartX = 0
let isPulling = false

function handleTouchStart(e: TouchEvent) {
  if (window.scrollY > 5 || isRefreshing.value) return
  touchStartY = e.touches[0]!.clientY
  touchStartX = e.touches[0]!.clientX
  isPulling = false
}

function handleTouchMove(e: TouchEvent) {
  if (window.scrollY > 5 || isRefreshing.value) return
  const currentY = e.touches[0]!.clientY
  const currentX = e.touches[0]!.clientX
  const deltaY = currentY - touchStartY
  const deltaX = currentX - touchStartX

  if (!isPulling && Math.abs(deltaX) > Math.abs(deltaY)) return

  if (deltaY > 0) {
    isPulling = true
    const resistance = 0.4
    pullDistance.value = Math.min(deltaY * resistance, maxPull)
    
    if (pullDistance.value > 10) {
      if (e.cancelable) e.preventDefault()
    }
  }
}

async function handleTouchEnd() {
  if (!isPulling) return
  isPulling = false

  if (pullDistance.value >= triggerThreshold) {
    isRefreshing.value = true
    pullDistance.value = triggerThreshold
    haptics.medium()

    refreshNow()

    setTimeout(() => {
      isRefreshing.value = false
      pullDistance.value = 0
    }, 1000)
  } else {
    pullDistance.value = 0
  }
}
</script>

<template>
  <div
    ref="quickActionArea"
    class="relative min-h-screen p-4 pb-24 transition-transform duration-150 ease-out"
    :style="{ transform: pullDistance > 0 ? `translateY(${pullDistance * 0.4}px)` : 'translateY(0px)' }"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Pull-to-refresh loading indicator -->
    <div
      class="pointer-events-none absolute left-0 right-0 z-40 flex justify-center transition-all duration-200"
      :style="{
        top: '12px',
        transform: `translateY(${pullDistance - 40}px)`,
        opacity: pullDistance > 10 ? 1 : 0
      }"
    >
      <div class="flex size-10 items-center justify-center rounded-full bg-card border border-border/80 shadow-md text-primary">
        <svg
          class="size-5 transition-transform"
          :class="isRefreshing ? 'animate-spin text-primary' : 'text-primary/70'"
          :style="!isRefreshing ? { transform: `rotate(${pullIndicatorRotate}deg) scale(${pullIndicatorScale})` } : {}"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </div>
    </div>
    <!-- Goal Celebration Confetti Overlay -->
    <Teleport to="body">
      <div
        v-if="showCelebration"
        class="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        <span class="sr-only">Daily sleep goal reached!</span>
        <span
          v-for="p in confettiParticles"
          :key="p.id"
          class="confetti-particle absolute top-0 select-none text-2xl"
          aria-hidden="true"
          :style="{
            left: `${p.x}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }"
        >{{ p.emoji }}</span>
      </div>
    </Teleport>

    <!-- Onboarding Modal -->
    <OnboardingModal v-model="showOnboarding" />


    <!-- PWA Install Banner -->
    <div
      v-if="canInstall"
      class="mb-4 flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
    >
      <div class="flex items-center gap-3">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10">
          <Download class="size-5 text-primary" />
        </div>
        <div>
          <p class="text-sm font-medium">Install Sleep Tracker</p>
          <p class="text-xs text-muted-foreground">Add to home screen for quick access</p>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="sm" class="rounded-lg text-xs" @click="dismiss">
          Later
        </Button>
        <Button size="sm" class="rounded-lg text-xs" @click="promptInstall">
          Install
        </Button>
      </div>
    </div>

    <!-- Quick Actions Modal -->
    <div
      v-if="showQuickActions"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      @click="closeQuickActions"
    >
      <div class="w-full max-w-xs rounded-3xl bg-card p-6 shadow-2xl" @click.stop>
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold">Quick Actions</h3>
          <Button variant="ghost" size="icon" class="size-8" @click="closeQuickActions">
            <X class="size-4" />
          </Button>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button
            class="flex flex-col items-center gap-2 rounded-2xl bg-primary/10 p-4 transition-colors hover:bg-primary/20"
            @click="quickStartTimer"
          >
            <div class="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Play class="size-6" />
            </div>
            <span class="text-sm font-medium">Start Timer</span>
          </button>
          <button
            class="flex flex-col items-center gap-2 rounded-2xl bg-secondary/50 p-4 transition-colors hover:bg-secondary"
            @click="quickNavigate('/timer')"
          >
            <div class="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Plus class="size-6" />
            </div>
            <span class="text-sm font-medium">Log Sleep</span>
          </button>
          <button
            class="flex flex-col items-center gap-2 rounded-2xl bg-secondary/50 p-4 transition-colors hover:bg-secondary"
            @click="quickNavigate('/history')"
          >
            <div class="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <BarChart3 class="size-6" />
            </div>
            <span class="text-sm font-medium">History</span>
          </button>
          <button
            class="flex flex-col items-center gap-2 rounded-2xl bg-secondary/50 p-4 transition-colors hover:bg-secondary"
            @click="quickNavigate('/calendar')"
          >
            <div class="flex size-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <History class="size-6" />
            </div>
            <span class="text-sm font-medium">Calendar</span>
          </button>
          <button
            class="col-span-2 flex items-center justify-center gap-3 rounded-2xl bg-secondary/50 p-3 transition-colors hover:bg-secondary"
            @click="quickNavigate('/journal')"
          >
            <div class="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <BookOpen class="size-5" />
            </div>
            <span class="text-sm font-medium">Dream Journal</span>
          </button>
        </div>
        <p class="mt-4 text-center text-xs text-muted-foreground">
          Long-press anywhere to show this menu
        </p>
      </div>
    </div>

    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
          <MoonStar class="size-5" />
        </div>
        <h1 class="text-lg font-semibold">Sleep Tracker</h1>
      </div>
      <div class="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        {{ formatDateLabel(todaySummary.date).split(',')[0] }}
      </div>
    </header>

    <!-- Sleep Score Hero Card -->
    <div class="mb-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <!-- Circular / Badge style grade and score -->
          <div class="relative flex size-14 items-center justify-center rounded-2xl bg-secondary/80 font-bold text-xl shadow-inner border border-border/50">
            <span>{{ sleepScore.score }}</span>
            <div class="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-lg border-2 border-card font-bold text-xs" :class="getGradeBadgeClass(sleepScore.grade)">
              {{ sleepScore.grade }}
            </div>
          </div>
          <div>
            <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sleep Health Score</p>
            <h3 class="text-base font-bold text-foreground flex items-center gap-1.5">
              {{ sleepScore.label }}
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="getGradeBadgeClass(sleepScore.grade)">
                Grade {{ sleepScore.grade }}
              </span>
            </h3>
            <p class="text-xs text-muted-foreground">Weighted sleep quality, quantity & routine</p>
          </div>
        </div>
      </div>

      <!-- Score Breakdown Accordion / Expansion -->
      <div class="mt-4 grid grid-cols-4 gap-2 border-t border-border/40 pt-4 text-center">
        <div class="rounded-xl bg-secondary/20 py-2 border border-border/30">
          <p class="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Duration</p>
          <p class="text-xs font-bold mt-0.5">{{ sleepScore.breakdown.duration }}<span class="text-[10px] font-normal text-muted-foreground">/50</span></p>
        </div>
        <div class="rounded-xl bg-secondary/20 py-2 border border-border/30">
          <p class="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Consistency</p>
          <p class="text-xs font-bold mt-0.5">{{ sleepScore.breakdown.consistency }}<span class="text-[10px] font-normal text-muted-foreground">/20</span></p>
        </div>
        <div class="rounded-xl bg-secondary/20 py-2 border border-border/30">
          <p class="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Quality</p>
          <p class="text-xs font-bold mt-0.5">{{ sleepScore.breakdown.quality }}<span class="text-[10px] font-normal text-muted-foreground">/20</span></p>
        </div>
        <div class="rounded-xl bg-secondary/20 py-2 border border-border/30">
          <p class="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Debt-Free</p>
          <p class="text-xs font-bold mt-0.5">{{ sleepScore.breakdown.debtFree }}<span class="text-[10px] font-normal text-muted-foreground">/10</span></p>
        </div>
      </div>
    </div>

    <!-- Daily Progress Card -->
    <div class="mb-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today's Sleep</p>
          <p class="text-3xl font-bold" :class="isGoalCompleted ? 'text-primary' : ''">
            {{ Math.round(todaySummary.percentage) }}%
          </p>
        </div>
        <div class="text-right">
          <p class="text-xs text-muted-foreground">Goal</p>
          <p class="text-lg font-semibold">{{ formatDurationFromMinutes(todaySummary.goalMinutes) }}</p>
        </div>
      </div>

      <!-- Progress Bar — visible colored fill -->
      <div class="mb-1.5 h-3 overflow-hidden rounded-full bg-secondary">
        <div
          class="h-full rounded-full transition-all duration-700"
          :class="progressColor"
          :style="{ width: progressWidth }"
        />
      </div>
      <div class="mb-4 flex justify-between text-xs text-muted-foreground">
        <span>{{ formatDurationFromMinutes(todaySummary.minutes) }} slept</span>
        <span v-if="!isGoalCompleted">{{ formatDurationFromMinutes(todaySummary.remainingMinutes) }} to go</span>
        <span v-else class="font-semibold text-primary">Goal reached! 🎉</span>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-secondary/60 p-3">
          <p class="text-xs text-muted-foreground">Completed</p>
          <p class="text-xl font-semibold">{{ formatDurationFromMinutes(todaySummary.minutes) }}</p>
        </div>
        <div class="rounded-2xl bg-secondary/60 p-3">
          <p class="text-xs text-muted-foreground">Remaining</p>
          <p class="text-xl font-semibold" :class="isGoalCompleted ? 'text-primary' : ''">
            {{ isGoalCompleted ? 'Done!' : formatDurationFromMinutes(todaySummary.remainingMinutes) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Guidance Banner — with icon -->
    <div v-if="guidance" class="mb-4 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/8 p-4">
      <Lightbulb class="mt-0.5 size-4 shrink-0 text-primary" />
      <p class="text-sm leading-relaxed text-primary/90">
        {{ guidance }}
      </p>
    </div>

    <!-- Recommendations Preview -->
    <NuxtLink
      v-if="recommendations.length > 0"
      to="/recommendations"
      class="mb-4 block"
    >
      <div class="rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:shadow-md">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles class="size-5 text-primary" />
            </div>
            <div>
              <p class="font-medium">Smart Recommendations</p>
              <p class="text-xs text-muted-foreground">
                {{ recommendations.length }} insight{{ recommendations.length === 1 ? '' : 's' }} waiting
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1 text-sm text-primary">
            <span class="hidden text-xs sm:inline">View</span>
            <ArrowRight class="size-4" />
          </div>
        </div>
        <div v-if="recommendations[0]" class="mt-3 rounded-xl bg-muted/50 p-3">
          <p class="text-xs font-medium text-muted-foreground">
            Top Priority: {{ recommendations[0].title }}
          </p>
          <p class="mt-0.5 text-xs text-muted-foreground/80 line-clamp-1">
            {{ recommendations[0].description }}
          </p>
        </div>
      </div>
    </NuxtLink>

    <!-- Last Session Card -->
    <div v-if="latestSession" class="mb-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-3 flex items-center gap-2">
        <Clock class="size-4 text-muted-foreground" />
        <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Session</p>
      </div>
      <div class="flex items-center gap-2">
        <p class="text-2xl font-bold">
          {{ formatDurationFromMinutes(getSessionDurationMinutes(latestSession)) }}
        </p>
        <span v-if="latestSession.quality" class="text-2xl" :title="getQualityLabel(latestSession.quality)">
          {{ getQualityEmoji(latestSession.quality) }}
        </span>
      </div>
      <p class="text-sm text-muted-foreground">
        {{ formatTimeLabel(latestSession.start) }} → {{ formatTimeLabel(latestSession.end) }}
      </p>
      <div v-if="latestSession.tags?.length" class="mt-2 flex flex-wrap gap-1">
        <span
          v-for="tag in latestSession.tags"
          :key="tag"
          class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- Empty State: No Sessions Yet -->
    <EmptyState
      v-else
      icon="moon"
      title="No Sleep Logged Yet"
      description="Start tracking your sleep to see your progress and build healthy habits."
      action-label="Log First Session"
      action-path="/timer"
      class="mb-4"
    />

    <!-- Quick Stats -->
    <div class="mb-4 grid grid-cols-2 gap-3">
      <div class="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
        <div class="mb-1 flex items-center gap-1.5">
          <Zap class="size-4 text-yellow-500" />
          <p class="text-xs text-muted-foreground">7-Day Avg</p>
        </div>
        <p class="text-xl font-semibold">{{ formatDurationFromMinutes(averageSleepMinutes) }}</p>
      </div>
      <div
        class="rounded-3xl border p-4 shadow-sm transition-colors"
        :class="currentStreak > 0
          ? 'border-orange-400/30 bg-orange-500/8'
          : 'border-border/60 bg-card'"
      >
        <div class="mb-1 flex items-center gap-1.5">
          <Flame
            class="size-4 transition-colors"
            :class="currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'"
          />
          <p class="text-xs text-muted-foreground">Streak</p>
        </div>
        <p class="text-xl font-semibold" :class="currentStreak > 0 ? 'text-orange-500' : ''">
          {{ currentStreak }}
          <span class="text-sm font-normal text-muted-foreground">days</span>
        </p>
      </div>
    </div>

    <!-- CTA to Timer -->
    <NuxtLink to="/timer" class="block">
      <Button class="w-full rounded-2xl py-6 text-base font-semibold shadow-lg shadow-primary/20" size="lg">
        <Clock class="mr-2 size-5" />
        Start Sleep Timer
        <ArrowRight class="ml-2 size-5" />
      </Button>
    </NuxtLink>
  </div>
</template>
