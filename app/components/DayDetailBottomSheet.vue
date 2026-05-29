<script setup lang="ts">
import { X, Moon, Clock, Sparkles, Tag, FileText, ChevronRight, AlertCircle } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { getQualityEmoji, getQualityLabel, summarizeSleepDay, getSessionDurationMinutes } from '@/lib/sleep'

const props = defineProps<{
  modelValue: boolean
  date: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const {
  sessions,
  settings,
  formatDurationFromMinutes,
  formatTimeLabel,
} = useSleepData()

const daySummary = computed(() => {
  if (!props.date) return null
  return summarizeSleepDay(props.date, sessions.value, settings.value.dailyGoalHours)
})

const formattedDate = computed(() => {
  if (!props.date) return ''
  const d = new Date(`${props.date}T00:00:00`)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const relatedSessions = computed(() => {
  if (!props.date) return []
  const dayStart = new Date(`${props.date}T00:00:00`).getTime()
  const DAY_MS = 24 * 60 * 60 * 1000
  const dayEnd = dayStart + DAY_MS

  return sessions.value.filter((session) => {
    const start = new Date(session.start).getTime()
    const end = new Date(session.end).getTime()
    return Number.isFinite(start) && Number.isFinite(end) && end > dayStart && start < dayEnd
  })
})

const averageQuality = computed(() => {
  const rated = relatedSessions.value.filter(s => s.quality)
  if (rated.length === 0) return null
  const avg = rated.reduce((sum, s) => sum + (s.quality || 0), 0) / rated.length
  const rounded = Math.round(avg)
  return {
    value: avg,
    emoji: getQualityEmoji(rounded),
    label: getQualityLabel(rounded),
  }
})

function close() {
  emit('update:modelValue', false)
}

function getQualityColor(quality: number) {
  if (quality >= 4) return 'text-emerald-500'
  if (quality >= 3) return 'text-primary'
  if (quality >= 2) return 'text-amber-500'
  return 'text-red-500'
}
</script>

<template>
  <Transition name="sheet">
    <div
      v-if="modelValue && date"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      @click="close"
    >
      <!-- Bottom Sheet Container -->
      <div
        class="w-full max-w-md rounded-t-[32px] bg-card p-6 pb-8 shadow-2xl border-t border-border/40 touch-pan-y max-h-[85vh] overflow-y-auto"
        @click.stop
      >
        <!-- Drag Handle Indicator -->
        <div class="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/20" />

        <!-- Header -->
        <div class="mb-5 flex items-start justify-between">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-primary">Sleep Details</p>
            <h2 class="text-lg font-bold text-foreground mt-0.5">
              {{ formattedDate }}
            </h2>
          </div>
          <button
            class="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary"
            aria-label="Close details"
            @click="close"
          >
            <X class="size-4" />
          </button>
        </div>

        <div v-if="daySummary">
          <!-- Daily Performance Stats -->
          <div class="mb-6 grid grid-cols-2 gap-3">
            <div class="rounded-2xl border border-border/60 bg-muted/30 p-4">
              <p class="text-xs text-muted-foreground mb-1">Total Sleep</p>
              <div class="flex items-baseline gap-1.5">
                <span class="text-2xl font-bold">{{ formatDurationFromMinutes(daySummary.minutes) }}</span>
              </div>
              <div class="mt-2 flex items-center gap-1.5">
                <div class="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                  <div
                    class="h-full rounded-full bg-primary"
                    :style="{ width: `${Math.min(daySummary.percentage, 100)}%` }"
                  />
                </div>
                <span class="text-[10px] font-semibold text-muted-foreground">{{ Math.round(daySummary.percentage) }}%</span>
              </div>
            </div>

            <div class="rounded-2xl border border-border/60 bg-muted/30 p-4 flex flex-col justify-between">
              <div>
                <p class="text-xs text-muted-foreground mb-1">Sleep Quality</p>
                <div v-if="averageQuality" class="flex items-center gap-2">
                  <span class="text-2xl">{{ averageQuality.emoji }}</span>
                  <span class="text-sm font-semibold">{{ averageQuality.label }}</span>
                </div>
                <div v-else class="text-sm font-medium text-muted-foreground italic flex items-center gap-1">
                  <AlertCircle class="size-3.5 text-muted-foreground/65" />
                  Not rated
                </div>
              </div>
              <div class="mt-2 text-[10px] font-medium text-muted-foreground">
                <span v-if="daySummary.remainingMinutes === 0" class="text-primary font-bold">✓ Goal Met</span>
                <span v-else-if="daySummary.minutes > 0" class="text-orange-500 font-bold">
                  {{ formatDurationFromMinutes(daySummary.remainingMinutes) }} under goal
                </span>
                <span v-else>No data for this day</span>
              </div>
            </div>
          </div>

          <!-- Sessions Title -->
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Moon class="size-4 text-primary" />
              Sleep Sessions ({{ relatedSessions.length }})
            </h3>
          </div>

          <!-- Sessions List -->
          <div v-if="relatedSessions.length > 0" class="space-y-3">
            <div
              v-for="(session, index) in relatedSessions"
              :key="session.id"
              class="rounded-2xl border border-border/60 bg-card p-4 hover:border-primary/20 transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex items-start gap-3">
                  <div class="mt-1 flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Clock class="size-4" />
                  </div>
                  <div>
                    <p class="text-sm font-bold text-foreground">
                      Session {{ relatedSessions.length > 1 ? index + 1 : '' }}
                    </p>
                    <p class="text-xs text-muted-foreground mt-0.5">
                      {{ formatTimeLabel(session.start) }} → {{ formatTimeLabel(session.end) }}
                    </p>
                  </div>
                </div>
                <div class="text-right">
                  <p class="text-sm font-bold">
                    {{ formatDurationFromMinutes(getSessionDurationMinutes(session)) }}
                  </p>
                  <div v-if="session.quality" class="mt-1 inline-flex items-center gap-1 text-xs font-semibold" :class="getQualityColor(session.quality)">
                    <span>{{ getQualityEmoji(session.quality) }}</span>
                    <span>{{ getQualityLabel(session.quality) }}</span>
                  </div>
                </div>
              </div>

              <!-- Tags -->
              <div v-if="session.tags && session.tags.length > 0" class="mt-3 flex flex-wrap gap-1">
                <span
                  v-for="tag in session.tags"
                  :key="tag"
                  class="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/40"
                >
                  <Tag class="size-2.5 text-muted-foreground/60" />
                  {{ tag }}
                </span>
              </div>

              <!-- Notes -->
              <div v-if="session.notes" class="mt-3 rounded-xl bg-secondary/30 p-3 border-l-2 border-primary/40 flex items-start gap-2">
                <FileText class="size-3.5 mt-0.5 text-primary shrink-0" />
                <p class="text-xs text-muted-foreground leading-relaxed italic">
                  "{{ session.notes }}"
                </p>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else
            class="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-8 text-center flex flex-col items-center justify-center"
          >
            <div class="mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary/60">
              <Moon class="size-6 text-muted-foreground" />
            </div>
            <p class="text-sm font-bold text-foreground">No sleep recorded</p>
            <p class="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto leading-relaxed">
              There are no sleep sessions logged for this day.
            </p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-active > div,
.sheet-leave-active > div {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.sheet-enter-from > div,
.sheet-leave-to > div {
  transform: translateY(100%);
}
</style>
