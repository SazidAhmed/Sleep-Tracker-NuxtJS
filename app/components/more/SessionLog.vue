<script setup lang="ts">
import { Search, Trash2, Undo2, ChevronLeft } from 'lucide-vue-next'
import { ref, computed, shallowRef, watch, onBeforeUnmount } from 'vue'
import { useVirtualList, useDebounceFn } from '@vueuse/core'
import type { ComponentPublicInstance } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSleepData } from '@/composables/useSleepData'
import SessionListItem from './SessionListItem.vue'
import ConfirmationModal from '../ConfirmationModal.vue'
import { type SleepSession } from '@/lib/sleep'

const emit = defineEmits<{
  (e: 'back'): void
}>()

const {
  sessions,
  removeSession,
  undoDelete,
  lastDeletedSession,
  saveSession,
  formatDurationFromMinutes,
  formatDateTimeLabel,
  getSessionDurationMinutes,
} = useSleepData()

// Search and filter
const searchQuery = ref('')
const dateFilter = ref<'all' | '7days' | '30days' | 'thisMonth'>('all')

const filteredSessions = computed(() => {
  let result = [...sessions.value]

  if (dateFilter.value !== 'all') {
    const now = new Date()
    const cutoff = new Date()
    switch (dateFilter.value) {
      case '7days': cutoff.setDate(now.getDate() - 7); break
      case '30days': cutoff.setDate(now.getDate() - 30); break
      case 'thisMonth': cutoff.setDate(1); break
    }
    result = result.filter(s => {
      const startDate = new Date(s.start)
      return !isNaN(startDate.getTime()) && startDate >= cutoff
    })
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      formatDateTimeLabel(s.start).toLowerCase().includes(query) ||
      formatDateTimeLabel(s.end).toLowerCase().includes(query) ||
      formatDurationFromMinutes(getSessionDurationMinutes(s)).includes(query),
    )
  }

  return result
})

// Virtualization
const shouldVirtualizeSessions = computed(() => filteredSessions.value.length > 40)
const sessionRowHeights = shallowRef<Record<string, number>>({})
const sessionHeightVersion = ref(0)
const sessionRowElements = new Map<string, HTMLElement>()
let sessionResizeObserver: ResizeObserver | null = null

const estimatedSessionRowHeight = computed(() => {
  sessionHeightVersion.value
  const heights = Object.values(sessionRowHeights.value).filter(height => height > 0)
  if (!heights.length) return 180
  return Math.ceil(heights.reduce((sum, height) => sum + height, 0) / heights.length)
})

function getVirtualSessionHeight(index: number) {
  sessionHeightVersion.value
  const session = filteredSessions.value[index]
  if (!session) return estimatedSessionRowHeight.value
  return sessionRowHeights.value[session.id] ?? estimatedSessionRowHeight.value
}

const updateHeightVersion = useDebounceFn(() => {
  sessionHeightVersion.value++
}, 50)

function rememberSessionRowHeight(sessionId: string, height: number) {
  const nextHeight = Math.ceil(height)
  if (!nextHeight || sessionRowHeights.value[sessionId] === nextHeight) return
  sessionRowHeights.value = { ...sessionRowHeights.value, [sessionId]: nextHeight }
  updateHeightVersion()
}

function setSessionRowRef(element: Element | ComponentPublicInstance | null, sessionId: string) {
  if (!import.meta.client) return
  if (!sessionResizeObserver) {
    sessionResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.sessionId
        if (!id) continue
        const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.target.getBoundingClientRect().height
        rememberSessionRowHeight(id, height)
      }
    })
  }

  const prevElement = sessionRowElements.get(sessionId)
  if (element === null) {
    if (prevElement) sessionResizeObserver.unobserve(prevElement)
    sessionRowElements.delete(sessionId)
    return
  }
  if (!(element instanceof HTMLElement)) return
  if (prevElement === element) return
  if (prevElement) sessionResizeObserver.unobserve(prevElement)
  element.dataset.sessionId = sessionId
  sessionRowElements.set(sessionId, element)
  sessionResizeObserver.observe(element, { box: 'border-box' })
  rememberSessionRowHeight(sessionId, element.offsetHeight)
}

const {
  list: virtualSessionRows,
  containerProps: virtualContainerProps,
  wrapperProps: virtualWrapperProps,
} = useVirtualList(filteredSessions, {
  itemHeight: getVirtualSessionHeight,
  overscan: 8,
})

const visibleSessions = computed(() =>
  shouldVirtualizeSessions.value ? virtualSessionRows.value.map(row => row.data) : filteredSessions.value,
)

onBeforeUnmount(() => {
  sessionResizeObserver?.disconnect()
  sessionRowElements.clear()
})

// Actions
const duplicateMessage = ref('')
function handleDuplicate(session: SleepSession) {
  const result = saveSession({
    start: session.start,
    end: session.end,
    quality: session.quality,
    tags: session.tags,
    notes: session.notes ? `Copied: ${session.notes}` : 'Duplicated session',
  })
  if (result.success) {
    duplicateMessage.value = 'Session duplicated'
    setTimeout(() => duplicateMessage.value = '', 2000)
  }
}

const showDeleteConfirm = ref(false)
const sessionToDelete = ref<SleepSession | null>(null)
const itemRefs = new Map<string, any>()

function confirmDelete(session: SleepSession) {
  sessionToDelete.value = session
  showDeleteConfirm.value = true
}

function handleDeleteConfirm() {
  if (sessionToDelete.value) {
    removeSession(sessionToDelete.value.id)
    const itemRef = itemRefs.get(sessionToDelete.value.id)
    if (itemRef) itemRef.resetSwipe()
    sessionToDelete.value = null
    showDeleteConfirm.value = false
  }
}

function handleUndoDelete() {
  const result = undoDelete()
  if (result.success) {
    duplicateMessage.value = 'Session restored'
    setTimeout(() => duplicateMessage.value = '', 2000)
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="mb-4 flex items-center gap-2">
      <Button variant="ghost" size="icon" class="rounded-xl" @click="emit('back')">
        <ChevronLeft class="size-5" />
      </Button>
      <span class="text-lg font-semibold">Session Log</span>
    </div>

    <!-- Search & Filter Bar -->
    <div class="sticky top-0 z-20 space-y-3 bg-background/95 pb-4 backdrop-blur-sm">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          v-model="searchQuery"
          placeholder="Search sessions..."
          class="rounded-xl border-border/60 bg-card pl-9 pr-4"
        />
      </div>

      <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <Button
          v-for="option in [
            { value: 'all', label: 'All' },
            { value: '7days', label: '7 Days' },
            { value: '30days', label: '30 Days' },
            { value: 'thisMonth', label: 'This Month' },
          ]"
          :key="option.value"
          variant="outline"
          size="sm"
          class="h-8 rounded-full px-4 text-xs font-medium transition-all"
          :class="dateFilter === option.value ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card border-border/60 text-muted-foreground'"
          @click="dateFilter = option.value as any"
        >
          {{ option.label }}
        </Button>
      </div>
    </div>

    <!-- Session List -->
    <div class="space-y-3">
      <div v-if="filteredSessions.length === 0 && sessions.length > 0" class="flex justify-center">
        <Button variant="outline" size="sm" @click="dateFilter = 'all'; searchQuery = ''">
          Reset Filters
        </Button>
      </div>

      <div
        v-bind="shouldVirtualizeSessions ? virtualContainerProps : {}"
        :class="shouldVirtualizeSessions ? 'h-[70vh] overflow-y-auto pr-1 no-scrollbar' : ''"
      >
        <div
          v-bind="shouldVirtualizeSessions ? virtualWrapperProps : {}"
          class="space-y-3"
        >
          <SessionListItem
            v-for="session in visibleSessions"
            :key="session.id"
            :ref="(el) => {
              setSessionRowRef(el?.$el, session.id)
              if (el) itemRefs.set(session.id, el)
              else itemRefs.delete(session.id)
            }"
            :session="session"
            @duplicate="handleDuplicate"
            @delete="confirmDelete"
          />
        </div>
      </div>

      <p v-if="duplicateMessage" class="py-2 text-center text-sm text-primary">
        {{ duplicateMessage }}
      </p>

      <p v-if="filteredSessions.length === 0" class="py-8 text-center text-sm text-muted-foreground">
        No sessions found.
      </p>
    </div>

    <!-- Undo Delete Toast -->
    <div
      v-if="lastDeletedSession"
      class="fixed bottom-20 left-4 right-4 z-50 flex items-center justify-between rounded-2xl bg-foreground p-4 text-background shadow-lg"
    >
      <div class="flex items-center gap-3">
        <Trash2 class="size-4 text-destructive" />
        <span class="text-sm font-medium">Session deleted</span>
      </div>
      <button
        class="flex items-center gap-1 rounded-lg bg-background/20 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-background/30"
        @click="handleUndoDelete"
      >
        <Undo2 class="size-4" />
        Undo
      </button>
    </div>

    <ConfirmationModal
      :show="showDeleteConfirm"
      title="Delete Session?"
      description="Are you sure you want to delete this sleep session? You can undo this action within 5 seconds."
      @confirm="handleDeleteConfirm"
      @cancel="showDeleteConfirm = false; itemRefs.get(sessionToDelete?.id ?? '')?.resetSwipe()"
    />
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
