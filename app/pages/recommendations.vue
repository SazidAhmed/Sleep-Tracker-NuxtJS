<script setup lang="ts">
import { Sparkles, AlertCircle, Clock, Target, Briefcase, Zap, ChevronRight, X } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'

definePageMeta({
  layout: 'mobile',
})

const {
  recommendations,
} = useSleepData()

const router = useRouter()

const typeIcons: Record<string, any> = {
  optimal_time: Clock,
  consistency: Zap,
  goal: Target,
  debt: AlertCircle,
  jetlag: Briefcase,
  quality: Sparkles,
}

const typeColors: Record<string, string> = {
  optimal_time: 'text-blue-500 bg-blue-500/10',
  consistency: 'text-yellow-500 bg-yellow-500/10',
  goal: 'text-purple-500 bg-purple-500/10',
  debt: 'text-red-500 bg-red-500/10',
  jetlag: 'text-orange-500 bg-orange-500/10',
  quality: 'text-green-500 bg-green-500/10',
}

const priorityColors: Record<string, string> = {
  high: 'border-l-4 border-l-red-500',
  medium: 'border-l-4 border-l-yellow-500',
  low: 'border-l-4 border-l-blue-400',
}

function handleAction(path?: string) {
  if (path) {
    router.push(path)
  }
}

function dismissRecommendation(id: string) {
  // Could implement local storage to track dismissed recommendations
  // For now, just a placeholder
}
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles class="size-5" />
        </div>
        <div>
          <span class="text-lg font-semibold">Recommendations</span>
          <p class="text-xs text-muted-foreground">AI-powered sleep insights</p>
        </div>
      </div>
    </header>

    <!-- Empty State -->
    <div v-if="recommendations.length === 0" class="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">
      <div class="mb-3 flex justify-center">
        <div class="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Sparkles class="size-8 text-primary" />
        </div>
      </div>
      <h3 class="mb-1 text-lg font-semibold">All Caught Up!</h3>
      <p class="text-sm text-muted-foreground">
        No recommendations at the moment. Keep tracking your sleep!
      </p>
    </div>

    <!-- Recommendations List -->
    <div v-else class="space-y-3">
      <p class="text-xs text-muted-foreground">
        {{ recommendations.length }} recommendation{{ recommendations.length === 1 ? '' : 's' }} based on your sleep data
      </p>

      <div
        v-for="rec in recommendations"
        :key="rec.id"
        class="group relative rounded-2xl bg-card p-4 shadow-sm transition-all"
        :class="priorityColors[rec.priority]"
      >
        <div class="flex items-start gap-3">
          <!-- Icon -->
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-xl"
            :class="typeColors[rec.type]"
          >
            <component :is="typeIcons[rec.type]" class="size-5" />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="mb-1 flex items-center gap-2">
              <h3 class="font-semibold">{{ rec.title }}</h3>
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                :class="rec.priority === 'high' ? 'bg-red-100 text-red-600' : rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'"
              >
                {{ rec.priority }}
              </span>
            </div>
            <p class="text-sm text-muted-foreground">
              {{ rec.description }}
            </p>

            <!-- Action Button -->
            <button
              v-if="rec.action && rec.actionPath"
              class="mt-3 flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              @click="handleAction(rec.actionPath)"
            >
              {{ rec.action }}
              <ChevronRight class="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Info Card -->
    <div class="mt-6 rounded-2xl border border-border/40 bg-muted/30 p-4">
      <h4 class="mb-2 text-sm font-medium">How recommendations work</h4>
      <ul class="space-y-1 text-xs text-muted-foreground">
        <li class="flex items-start gap-2">
          <span class="text-primary">•</span>
          Analyzes your sleep patterns over the last 30 days
        </li>
        <li class="flex items-start gap-2">
          <span class="text-primary">•</span>
          Identifies debt, jetlag, and quality correlations
        </li>
        <li class="flex items-start gap-2">
          <span class="text-primary">•</span>
          Suggests actionable improvements
        </li>
      </ul>
    </div>
  </div>
</template>
