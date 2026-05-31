<script setup lang="ts">
import { ArrowLeft, BookOpen, Search, Sparkles, Clock, Tag, X, Calendar } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { getQualityEmoji, getQualityLabel } from '@/lib/sleep'

definePageMeta({
  layout: 'mobile',
})

const {
  sessions,
  formatDateTimeLabel,
  formatDurationFromMinutes,
  getSessionDurationMinutes,
} = useSleepData()

const router = useRouter()

// Get only sessions that have note entries (the journal)
const journalSessions = computed(() => {
  return sessions.value.filter(s => s.notes && s.notes.trim())
})

const searchQuery = ref('')
const selectedDreamTag = ref<string | null>(null)

// Extract unique tags present in journal entries
const activeJournalTags = computed(() => {
  const tags = new Set<string>()
  journalSessions.value.forEach(s => {
    s.tags?.forEach(t => tags.add(t))
  })
  return Array.from(tags)
})

const filteredJournalSessions = computed(() => {
  let result = [...journalSessions.value]

  if (selectedDreamTag.value) {
    result = result.filter(s => s.tags?.includes(selectedDreamTag.value!))
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.notes?.toLowerCase().includes(q) ||
      s.tags?.some(t => t.toLowerCase().includes(q))
    )
  }

  return result
})

function toggleDreamTag(tag: string) {
  if (selectedDreamTag.value === tag) {
    selectedDreamTag.value = null
  } else {
    selectedDreamTag.value = tag
  }
}

function clearFilters() {
  searchQuery.value = ''
  selectedDreamTag.value = null
}
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6 flex items-center gap-3">
      <Button variant="ghost" size="icon" class="size-9 rounded-xl" aria-label="Go back" @click="router.back()">
        <ArrowLeft class="size-5" />
      </Button>
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
          <BookOpen class="size-5" />
        </div>
        <div>
          <h1 class="text-lg font-semibold text-foreground">Dream Journal</h1>
          <p class="text-xs text-muted-foreground">Search and explore your sleep notes</p>
        </div>
      </div>
    </header>

    <!-- Search & Filter Controls -->
    <div class="mb-5 space-y-3">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search journal entries..."
          class="rounded-2xl pl-10 bg-card border-border/60 focus-visible:ring-indigo-500/20"
          aria-label="Search journal entries"
        />
        <button
          v-if="searchQuery"
          class="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted"
          aria-label="Clear search query"
          @click="searchQuery = ''"
        >
          <X class="size-3.5 text-muted-foreground" />
        </button>
      </div>

      <!-- Tag Filters -->
      <div v-if="activeJournalTags.length > 0" class="space-y-1.5">
        <label class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Filter by Tag</label>
        <div class="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          <button
            v-for="tag in activeJournalTags"
            :key="tag"
            class="flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-all font-medium border"
            :class="selectedDreamTag === tag
              ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm shadow-indigo-500/20'
              : 'bg-card text-muted-foreground border-border/60 hover:bg-muted'"
            @click="toggleDreamTag(tag)"
          >
            <Tag class="size-3" />
            <span>{{ tag }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Active Filter Indicators -->
    <div v-if="selectedDreamTag || searchQuery" class="mb-4 flex items-center justify-between rounded-xl bg-indigo-500/5 border border-indigo-500/10 px-3 py-2 text-xs">
      <div class="flex items-center gap-1.5 text-indigo-500 font-medium">
        <Sparkles class="size-3.5" />
        <span>Filtered results</span>
      </div>
      <button class="text-indigo-500 font-semibold hover:underline" @click="clearFilters">
        Clear All
      </button>
    </div>

    <!-- Journal Entries List -->
    <div class="space-y-4">
      <div
        v-for="session in filteredJournalSessions"
        :key="session.id"
        class="rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:shadow-md border-l-4 border-l-indigo-500"
      >
        <div class="mb-3 flex items-start justify-between">
          <div>
            <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar class="size-3.5" />
              <span>{{ formatDateTimeLabel(session.start).split(',')[0] }}</span>
            </div>
            <p class="text-sm font-semibold text-foreground mt-0.5">
              {{ formatDateTimeLabel(session.start).split(',').slice(1).join(',').trim() }}
            </p>
          </div>
          <!-- Quality and Duration Badge -->
          <div class="text-right">
            <div class="flex items-center justify-end gap-1.5">
              <span class="text-xs font-semibold text-muted-foreground">
                {{ formatDurationFromMinutes(getSessionDurationMinutes(session)) }}
              </span>
              <span v-if="session.quality" class="text-xl" :title="getQualityLabel(session.quality)">
                {{ getQualityEmoji(session.quality) }}
              </span>
            </div>
            <span v-if="session.quality" class="text-[10px] font-medium text-muted-foreground">
              {{ getQualityLabel(session.quality) }} Sleep
            </span>
          </div>
        </div>

        <!-- Notes blockquote -->
        <div class="relative rounded-2xl bg-secondary/20 p-4 border border-border/30">
          <p class="text-sm text-foreground leading-relaxed whitespace-pre-line italic">
            "{{ session.notes }}"
          </p>
        </div>

        <!-- Tags row -->
        <div v-if="session.tags?.length" class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="tag in session.tags"
            :key="tag"
            class="flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-500 border border-indigo-500/10"
          >
            <Tag class="size-2.5" />
            <span>{{ tag }}</span>
          </span>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="filteredJournalSessions.length === 0"
        class="rounded-3xl border border-dashed border-border/60 bg-card p-12 text-center shadow-inner"
      >
        <div class="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
          <BookOpen class="size-8" />
        </div>
        <h3 class="text-lg font-bold text-foreground">
          {{ journalSessions.length === 0 ? 'No journal entries yet' : 'No matches found' }}
        </h3>
        <p class="mt-2 text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          {{ journalSessions.length === 0
            ? 'Write down dreams or sleep notes when manual logging or completing timer sessions to build your dream diary.'
            : 'Try adjusting your search terms or selecting a different dream tag filter.' }}
        </p>
        <Button
          v-if="filteredJournalSessions.length < journalSessions.length"
          variant="outline"
          class="mt-4 rounded-xl text-xs"
          @click="clearFilters"
        >
          Reset Filters
        </Button>
        <NuxtLink v-else to="/timer" class="mt-4 inline-block">
          <Button class="rounded-xl text-xs bg-indigo-500 text-white hover:bg-indigo-500/90 shadow-sm shadow-indigo-500/10">
            Log Sleep Note
          </Button>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Twinkling stars or notebook aesthetic details can go here */
</style>
