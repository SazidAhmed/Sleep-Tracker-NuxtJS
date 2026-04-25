<script setup lang="ts">
import { Moon, Clock, Calendar, Target, ChevronRight, ChevronLeft, X } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const currentStep = ref(0)

const steps = [
  {
    icon: Moon,
    title: 'Welcome to Sleep Tracker',
    description: 'Track your sleep flexibly, whether you sleep in one block or split across the day. Perfect for night shift workers, parents, and anyone with dynamic schedules.',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    icon: Clock,
    title: 'Split Sleep Support',
    description: 'Sleep from 1 AM to 5 AM, then again from 8 AM to 12 PM? No problem! We automatically handle sleep sessions that cross midnight and calculate your daily totals correctly.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    icon: Target,
    title: 'Set Your Goal',
    description: 'Set a daily sleep goal (like 7 or 8 hours). We\'ll track your progress and show you how much more sleep you need each day to hit your target.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: Calendar,
    title: 'Track & Analyze',
    description: 'Use the timer for live tracking or log sleep manually. View your history, trends, sleep debt, and get smart recommendations to improve your sleep habits.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
]

const currentStepData = computed(() => steps[currentStep.value]!)

function nextStep() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  } else {
    completeOnboarding()
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

function completeOnboarding() {
  localStorage.setItem('sleep-tracker-onboarding-complete', 'true')
  emit('update:modelValue', false)
  currentStep.value = 0
}

function skipOnboarding() {
  completeOnboarding()
}
</script>

<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
  >
    <div class="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl">
      <!-- Header with skip button -->
      <div class="mb-6 flex items-center justify-between">
        <div class="flex gap-1">
          <div
            v-for="(_, index) in steps"
            :key="index"
            class="h-1.5 w-6 rounded-full transition-colors"
            :class="index === currentStep ? 'bg-primary' : 'bg-muted'"
          />
        </div>
        <button
          class="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
          @click="skipOnboarding"
        >
          <X class="size-4" />
        </button>
      </div>

      <!-- Content -->
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl"
          :class="currentStepData.bgColor"
        >
          <component
            :is="currentStepData.icon"
            class="size-10"
            :class="currentStepData.color"
          />
        </div>
        <h2 class="mb-3 text-xl font-bold">
          {{ currentStepData.title }}
        </h2>
        <p class="text-sm leading-relaxed text-muted-foreground">
          {{ currentStepData.description }}
        </p>
      </div>

      <!-- Navigation -->
      <div class="flex items-center gap-3">
        <button
          v-if="currentStep > 0"
          class="flex size-12 items-center justify-center rounded-xl border border-border bg-background transition-colors hover:bg-muted"
          @click="prevStep"
        >
          <ChevronLeft class="size-5" />
        </button>
        <button
          class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          @click="nextStep"
        >
          {{ currentStep === steps.length - 1 ? 'Get Started' : 'Next' }}
          <ChevronRight v-if="currentStep < steps.length - 1" class="size-4" />
        </button>
      </div>

      <!-- Skip text -->
      <button
        v-if="currentStep < steps.length - 1"
        class="mt-4 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        @click="skipOnboarding"
      >
        Skip tutorial
      </button>
    </div>
  </div>
</template>
