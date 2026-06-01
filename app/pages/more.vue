<script setup lang="ts">
import { MoreHorizontal, Search, Settings, Bell, Download, Upload, Pencil, Trash2, ChevronLeft, Clock, Copy, Undo2, Tag, Plus, X, BookOpen, FileText, HeartPulse, Cloud, RefreshCw, Flame, Sparkles, Moon, SunMedium } from 'lucide-vue-next'
import { useLocalStorage, useVirtualList, useDebounceFn } from '@vueuse/core'
import { ref, computed, reactive, watch, nextTick, onBeforeUnmount, shallowRef } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useSleepData } from '@/composables/useSleepData'
import { useCloudSync } from '@/composables/useCloudSync'
import { toDateTimeLocalValue, type SleepSession, getQualityEmoji, getQualityLabel } from '@/lib/sleep'

definePageMeta({
  layout: 'mobile',
})

const {
  settings,
  sessions,
  lastDeletedSession,
  reminderEnabled,
  reminderTime,
  bedtimeReminderEnabled,
  bedtimeReminderTime,
  windDownReminderEnabled,
  windDownMinutes,
  goalNudgeReminderEnabled,
  goalNudgeTime,
  missedGoalReminderEnabled,
  notificationSupported,
  notificationPermission,
  removeSession,
  undoDelete,
  saveSession,
  requestNotificationPermission,
  exportBackup,
  importBackup,
  exportCSV,
  formatDurationFromMinutes,
  formatDateTimeLabel,
  formatTimeLabel,
  getSessionDurationMinutes,
  customTags,
  addCustomTag,
  removeCustomTag,
} = useSleepData()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
function toggleDark() { colorMode.preference = isDark.value ? 'light' : 'dark' }

const router = useRouter()
const healthIntegrationEnabled = useLocalStorage<boolean>('sleep-tracker-health-integration-enabled', false)
const healthExportPreference = useLocalStorage<'csv' | 'json'>('sleep-tracker-health-export-preference', 'csv')
const {
  config: cloudSync,
  status: cloudSyncStatus,
  error: cloudSyncError,
  isConfigured: isCloudSyncConfigured,
  syncAgeLabel,
  syncNow,
} = useCloudSync()

// Undo functionality
function handleUndoDelete() {
  const result = undoDelete()
  if (result.success) {
    duplicateMessage.value = 'Session restored'
    setTimeout(() => duplicateMessage.value = '', 2000)
  }
}

const duplicateMessage = ref('')

function duplicateSession(session: SleepSession) {
  // Create a new session with same times but new ID and current timestamp
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

// Search and filter
const searchQuery = ref('')
const dateFilter = ref<'all' | '7days' | '30days' | 'thisMonth'>('all')

const filteredSessions = computed(() => {
  let result = [...sessions.value]

  // Date filter
  if (dateFilter.value !== 'all') {
    const now = new Date()
    const cutoff = new Date()
    switch (dateFilter.value) {
      case '7days':
        cutoff.setDate(now.getDate() - 7)
        break
      case '30days':
        cutoff.setDate(now.getDate() - 30)
        break
      case 'thisMonth':
        cutoff.setDate(1)
        break
    }
    result = result.filter(s => {
      const startDate = new Date(s.start)
      return !isNaN(startDate.getTime()) && startDate >= cutoff
    })
  }

  // Text search
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
  
  sessionRowHeights.value = {
    ...sessionRowHeights.value,
    [sessionId]: nextHeight,
  }
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
  
  // Initial measurement
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
  shouldVirtualizeSessions.value
    ? virtualSessionRows.value.map(row => row.data)
    : filteredSessions.value,
)

// Clean up stored heights only when sessions are truly removed from data
const sessionIds = computed(() => sessions.value.map(s => s.id))
watch(sessionIds, (newIds) => {
  const idSet = new Set(newIds)
  let changed = false
  const nextHeights = { ...sessionRowHeights.value }
  
  for (const sessionId of Object.keys(nextHeights)) {
    if (!idSet.has(sessionId)) {
      delete nextHeights[sessionId]
      changed = true
    }
  }
  
  if (changed) {
    sessionRowHeights.value = nextHeights
    sessionHeightVersion.value++
  }
})

onBeforeUnmount(() => {
  sessionResizeObserver?.disconnect()
  sessionRowElements.clear()
})

// Editing
const editingSession = ref<SleepSession | null>(null)
const editForm = reactive({ start: '', end: '', quality: undefined as 1 | 2 | 3 | 4 | 5 | undefined, tags: [] as string[], notes: '' })
const editError = ref('')

function startEdit(session: SleepSession) {
  editingSession.value = session
  editForm.start = session.start.slice(0, 16)
  editForm.end = session.end.slice(0, 16)
  editForm.quality = session.quality
  editForm.tags = session.tags ?? []
  editForm.notes = session.notes ?? ''
  editError.value = ''
}

function cancelEdit() {
  editingSession.value = null
  editError.value = ''
}

function saveEdit() {
  editError.value = ''
  if (!editingSession.value) return

  const result = saveSession(
    { start: editForm.start, end: editForm.end, quality: editForm.quality, tags: editForm.tags, notes: editForm.notes },
    editingSession.value.id,
  )

  if (result.error) {
    editError.value = result.error
    return
  }

  editingSession.value = null
}

// Backup
const backupMessage = ref('')
const backupError = ref('')
const importInput = ref<HTMLInputElement | null>(null)
const importMode = ref<'merge' | 'replace'>('merge')

function handleExport() {
  backupMessage.value = ''
  backupError.value = ''
  exportBackup()
  backupMessage.value = 'Backup exported successfully.'
}

function handleCSVExport() {
  backupMessage.value = ''
  backupError.value = ''
  exportCSV()
  backupMessage.value = 'CSV exported successfully.'
}

async function handleImport(event: Event) {
  backupMessage.value = ''
  backupError.value = ''

  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const content = await file.text()
    const parsed = JSON.parse(content)
    const result = importBackup(parsed, importMode.value)

    if (result.error) {
      backupError.value = result.error
    } else {
      const skipped = result.skippedCount ? ` Skipped ${result.skippedCount} duplicate or invalid session${result.skippedCount === 1 ? '' : 's'}.` : ''
      backupMessage.value = importMode.value === 'replace'
        ? `Replaced data with ${result.importedCount} session${result.importedCount === 1 ? '' : 's'}.${skipped}`
        : `Merged ${result.importedCount} new session${result.importedCount === 1 ? '' : 's'}.${skipped}`
    }
  }
  catch {
    backupError.value = 'Could not read this backup file.'
  }
  finally {
    input.value = ''
  }
}

const cloudSyncMessage = ref('')

async function handleCloudPush() {
  cloudSyncMessage.value = ''
  const result = await syncNow('push', settings.value, sessions.value)
  if (result.success) {
    cloudSyncMessage.value = 'Local sleep data pushed to sync storage.'
  }
}

async function handleCloudPull() {
  cloudSyncMessage.value = ''
  const result = await syncNow('pull', settings.value, sessions.value)
  if (result.success && result.snapshot) {
    const importResult = importBackup(result.snapshot, 'merge')
    if (importResult.error) {
      cloudSyncMessage.value = ''
      cloudSyncError.value = importResult.error
      return
    }
    cloudSyncMessage.value = `Pulled ${importResult.importedCount} new session${importResult.importedCount === 1 ? '' : 's'} from sync storage.`
  }
}

// Active section
const activeSection = ref<'sessions' | 'settings' | null>(null)

// Tag settings state
const newTagInput = ref('')
const tagError = ref('')

function handleAddTag() {
  tagError.value = ''
  if (!newTagInput.value.trim()) return
  const result = addCustomTag(newTagInput.value)
  if (result.error) {
    tagError.value = result.error
  } else {
    newTagInput.value = ''
  }
}

function handleRemoveTag(tag: string) {
  removeCustomTag(tag)
}

// Swipe-to-delete list state
const swipeSessionId = ref<string | null>(null)
const swipeStartX = ref(0)
const swipeCurrentX = ref(0)
const swipeTranslateX = ref(0)
const swipeThreshold = 65

function handleTouchStart(e: TouchEvent, sessionId: string) {
  if (editingSession.value) return
  swipeSessionId.value = sessionId
  swipeStartX.value = e.touches[0]!.clientX
  swipeCurrentX.value = swipeStartX.value
  swipeTranslateX.value = 0
}

function handleTouchMove(e: TouchEvent, sessionId: string) {
  if (swipeSessionId.value !== sessionId) return
  swipeCurrentX.value = e.touches[0]!.clientX
  const diff = swipeCurrentX.value - swipeStartX.value
  if (diff < 0) {
    swipeTranslateX.value = Math.max(diff, -100)
  } else {
    swipeTranslateX.value = 0
  }
}

function handleTouchEnd(e: TouchEvent, sessionId: string) {
  if (swipeSessionId.value !== sessionId) return
  const diff = swipeCurrentX.value - swipeStartX.value
  if (diff < -swipeThreshold) {
    swipeTranslateX.value = -80
  } else {
    swipeTranslateX.value = 0
    swipeSessionId.value = null
  }
}

function resetSwipe() {
  swipeSessionId.value = null
  swipeTranslateX.value = 0
}

// Delete confirmation dialog state
const showDeleteConfirm = ref(false)
const sessionToDelete = ref<SleepSession | null>(null)

function confirmDelete(session: SleepSession) {
  sessionToDelete.value = session
  showDeleteConfirm.value = true
}

function handleDeleteConfirm() {
  if (sessionToDelete.value) {
    removeSession(sessionToDelete.value.id)
    sessionToDelete.value = null
    showDeleteConfirm.value = false
    resetSwipe()
  }
}

function cancelDelete() {
  sessionToDelete.value = null
  showDeleteConfirm.value = false
  resetSwipe()
}

// Confirmation for Replace-mode import (replaces ALL data)
const showReplaceConfirm = ref(false)
function handleImportClick() {
  if (importMode.value === 'replace') {
    showReplaceConfirm.value = true
  } else {
    importInput.value?.click()
  }
}
function confirmReplaceImport() {
  showReplaceConfirm.value = false
  importInput.value?.click()
}

// Confirmation for Clear All Data
const showClearDataConfirm = ref(false)

// Keyboard rating selector handler
function handleQualityKeydown(e: KeyboardEvent) {
  const current = editForm.quality
  let next: number | undefined = undefined

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    next = current === undefined ? 1 : Math.min(current + 1, 5)
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    next = current === undefined ? 5 : Math.max(current - 1, 1)
  } else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    return
  }

  if (next !== undefined) {
    e.preventDefault()
    editForm.quality = next as 1 | 2 | 3 | 4 | 5
    nextTick(() => {
      const buttons = document.querySelectorAll<HTMLButtonElement>('.edit-quality-btn')
      buttons[next! - 1]?.focus()
    })
  }
}

function handleSelectableGroupKeydown(e: KeyboardEvent) {
  const arrowKeys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
  if (!arrowKeys.includes(e.key)) return
  const target = e.target as HTMLElement
  const group = target.closest('[role="group"], [role="radiogroup"]') as HTMLElement | null
  if (!group) return
  const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>('button'))
  const index = buttons.indexOf(target as HTMLButtonElement)
  if (index === -1) return

  e.preventDefault()
  const nextIndex = e.key === 'ArrowRight' || e.key === 'ArrowDown'
    ? (index + 1) % buttons.length
    : (index - 1 + buttons.length) % buttons.length

  buttons[nextIndex]?.focus()
}
</script>
<template>
  <div class="min-h-screen p-4 pb-24">
    <header class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
          <MoreHorizontal class="size-5" />
        </div>
        <div>
          <span class="text-lg font-semibold">More</span>
          <p class="text-xs text-muted-foreground">Manage sessions & settings</p>
        </div>
      </div>
    </header>

    <!-- Menu Cards -->
    <div v-if="!activeSection" class="space-y-3">
      <MoreMenuCard
        :icon="Clock"
        title="Session Log"
        :description="`${sessions.length} session${sessions.length === 1 ? '' : 's'} logged`"
        icon-class="bg-primary/10 text-primary group-hover:bg-primary/20"
        @select="activeSection = 'sessions'"
      />

      <MoreMenuCard
        :icon="Settings"
        title="Settings"
        description="Goal, reminders, backup"
        icon-class="group-hover:text-primary"
        @select="activeSection = 'settings'"
      />

      <MoreMenuCard
        :icon="BookOpen"
        title="Dream Journal"
        description="Search logs, track dreams & write entries"
        icon-class="bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500/20"
        @select="router.push('/journal')"
      />

      <MoreMenuCard
        :icon="FileText"
        title="Sleep Report"
        description="Weekly and monthly summary"
        icon-class="bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20"
        @select="router.push('/report')"
      />

      <!-- Quick Links: pages moved out of nav bar -->
      <div class="rounded-2xl border border-border/60 bg-card p-4">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Links</p>
        <div class="grid grid-cols-2 gap-2">
          <NuxtLink
            to="/heatmap"
            class="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50"
          >
            <Flame class="size-4 text-orange-500" />
            <span class="text-sm font-medium">Heat Map</span>
          </NuxtLink>
          <NuxtLink
            to="/recommendations"
            class="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-3 py-2.5 transition-colors hover:bg-muted/50"
          >
            <Sparkles class="size-4 text-violet-500" />
            <span class="text-sm font-medium">Sleep Tips</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Dark Mode Toggle -->
      <div class="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3">
        <div class="flex items-center gap-2">
          <ClientOnly>
            <component :is="isDark ? SunMedium : Moon" class="size-4 text-muted-foreground" />
            <template #fallback><Moon class="size-4 text-muted-foreground" /></template>
          </ClientOnly>
          <span class="text-sm font-medium">
            <ClientOnly>{{ isDark ? 'Light Mode' : 'Dark Mode' }}<template #fallback>Dark Mode</template></ClientOnly>
          </span>
        </div>
        <button
          class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors"
          :class="isDark ? 'bg-primary' : 'bg-secondary'"
          aria-label="Toggle dark mode"
          role="switch"
          :aria-checked="isDark"
          @click="toggleDark"
        >
          <span
            class="inline-block size-4 rounded-full bg-white shadow-sm transition-transform"
            :class="isDark ? 'translate-x-6' : 'translate-x-1'"
          />
        </button>
      </div>

      <div class="mt-6 rounded-2xl border border-border/40 bg-muted/30 p-4">
        <p class="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</p>
        <p class="text-sm font-medium">Sleep Tracker</p>
        <p class="text-xs text-muted-foreground">Track split sleep sessions, daily goals, and recovery progress. All data is stored locally — no account required.</p>
        <div class="mt-3 flex items-center gap-2">
          <div class="size-2 rounded-full bg-green-500" />
          <span class="text-xs text-muted-foreground">Local-first · Offline ready · PWA installable</span>
        </div>
      </div>
    </div>


    <!-- Session Log Section -->
    <div v-if="activeSection === 'sessions'" class="space-y-4">
      <div class="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" @click="activeSection = null">
          <ChevronLeft class="size-5" />
        </Button>
        <span class="text-lg font-semibold">Session Log</span>
      </div>

      <!-- Search & Filter -->
      <div class="space-y-3">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="Search sessions..."
            class="rounded-xl pl-10"
          />
        </div>
        <div class="flex gap-2 overflow-x-auto pb-1">
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
            class="shrink-0 rounded-full"
            :class="dateFilter === option.value ? '!bg-primary !text-primary-foreground border-primary' : ''"
            @click="dateFilter = option.value as any"
          >
            {{ option.label }}
          </Button>
        </div>
      </div>

      <!-- Session List -->
      <div class="space-y-3">
        <!-- Reset filters button -->
        <div v-if="filteredSessions.length === 0 && sessions.length > 0" class="flex justify-center">
          <Button variant="outline" size="sm" @click="dateFilter = 'all'; searchQuery = ''">
            Reset Filters
          </Button>
        </div>

        <div
          v-if="shouldVirtualizeSessions"
          class="rounded-xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
        >
          Virtualized list enabled for {{ filteredSessions.length }} sessions. Average row {{ estimatedSessionRowHeight }}px.
        </div>

        <div
          v-bind="shouldVirtualizeSessions ? virtualContainerProps : {}"
          :class="shouldVirtualizeSessions ? 'h-[70vh] overflow-y-auto pr-1' : ''"
        >
          <div
            v-bind="shouldVirtualizeSessions ? virtualWrapperProps : {}"
            class="space-y-3"
          >

        <div
          v-for="session in visibleSessions"
          :key="session.id"
          :ref="(element) => setSessionRowRef(element, session.id)"
          class="relative overflow-hidden rounded-2xl border border-border/60 bg-card"
          @touchstart="handleTouchStart($event, session.id)"
          @touchmove="handleTouchMove($event, session.id)"
          @touchend="handleTouchEnd($event, session.id)"
        >
          <!-- Swiped Delete Button behind foreground -->
          <div
            v-if="!editingSession || editingSession.id !== session.id"
            class="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-destructive text-destructive-foreground transition-opacity"
            :class="swipeSessionId === session.id ? 'opacity-100' : 'opacity-0'"
          >
            <button
              class="flex size-full items-center justify-center text-white"
              aria-label="Confirm swipe delete"
              @click.stop="confirmDelete(session)"
            >
              <Trash2 class="size-5 animate-pulse" />
            </button>
          </div>

          <!-- Foreground card content that translates -->
          <div
            class="bg-card p-4 transition-transform duration-200"
            :style="{
              transform: swipeSessionId === session.id ? `translateX(${swipeTranslateX}px)` : 'translateX(0px)'
            }"
          >
            <div v-if="editingSession?.id === session.id" class="space-y-3">
              <div class="space-y-2">
                <Label class="text-xs">Start</Label>
                <Input v-model="editForm.start" type="datetime-local" class="rounded-xl" />
              </div>
              <div class="space-y-2">
                <Label class="text-xs">End</Label>
                <Input v-model="editForm.end" type="datetime-local" class="rounded-xl" />
              </div>
              <div class="space-y-2">
                <Label class="text-xs">Quality</Label>
                <div
                  class="flex gap-1"
                  role="radiogroup"
                  aria-label="Edit sleep quality"
                  @keydown="handleQualityKeydown"
                >
                  <button
                    v-for="n in 5"
                    :key="n"
                    class="flex-1 rounded-lg py-2 text-lg transition-all edit-quality-btn"
                    :class="editForm.quality === n ? 'bg-primary text-primary-foreground' : 'bg-secondary/40 hover:bg-secondary'"
                    role="radio"
                    :aria-checked="editForm.quality === n"
                    :aria-label="getQualityLabel(n)"
                    :tabindex="editForm.quality === n || (!editForm.quality && n === 1) ? 0 : -1"
                    @click="editForm.quality = editForm.quality === n ? undefined : n as 1 | 2 | 3 | 4 | 5"
                  >
                    {{ getQualityEmoji(n) }}
                  </button>
                </div>
              </div>
              <div class="space-y-2">
                <Label class="text-xs">Tags</Label>
                <div class="flex flex-wrap gap-1" role="group" aria-label="Edit tags" @keydown="handleSelectableGroupKeydown">
                  <button
                    v-for="tag in customTags"
                    :key="tag"
                    class="rounded-full px-2 py-1 text-[10px] font-medium transition-all"
                    :class="editForm.tags.includes(tag) ? 'bg-primary text-primary-foreground' : 'bg-secondary/40 text-muted-foreground hover:bg-secondary'"
                    :aria-label="`Toggle tag ${tag}`"
                    @click="editForm.tags.includes(tag) ? editForm.tags.splice(editForm.tags.indexOf(tag), 1) : editForm.tags.push(tag)"
                  >
                    {{ tag }}
                  </button>
                </div>
              </div>
              <div class="space-y-2">
                <Label class="text-xs">Notes</Label>
                <textarea v-model="editForm.notes" rows="2" class="w-full rounded-xl bg-secondary/40 px-3 py-2 text-sm outline-none" placeholder="How did you sleep?" />
              </div>
              <p v-if="editError" class="text-xs text-destructive">{{ editError }}</p>
              <div class="flex gap-2">
                <Button variant="outline" size="sm" class="flex-1" @click="cancelEdit">Cancel</Button>
                <Button size="sm" class="flex-1" @click="saveEdit">Save</Button>
              </div>
            </div>
            <div v-else class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <p class="font-semibold">
                    {{ formatDurationFromMinutes(getSessionDurationMinutes(session)) }}
                  </p>
                  <span v-if="session.quality" class="text-lg" :title="getQualityLabel(session.quality)">
                    {{ getQualityEmoji(session.quality) }}
                  </span>
                </div>
                <p class="text-xs text-muted-foreground">
                  {{ formatDateTimeLabel(session.start) }} - {{ formatTimeLabel(session.end) }}
                </p>
                <div v-if="session.tags?.length" class="mt-1 flex flex-wrap gap-1">
                  <span
                    v-for="tag in session.tags"
                    :key="tag"
                    class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary"
                  >
                    {{ tag }}
                  </span>
                </div>
                <p v-if="session.notes" class="mt-1 text-xs text-muted-foreground">
                  {{ session.notes }}
                </p>
              </div>
              <div class="flex gap-1">
                <Button variant="ghost" size="icon" class="size-8" aria-label="Duplicate session" @click="duplicateSession(session)">
                  <Copy class="size-4" />
                </Button>
                <Button variant="ghost" size="icon" class="size-8" aria-label="Edit session" @click="startEdit(session)">
                  <Pencil class="size-4" />
                </Button>
                <Button variant="ghost" size="icon" class="size-8 text-destructive/80 hover:text-destructive" aria-label="Delete session" @click="confirmDelete(session)">
                  <Trash2 class="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

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
    </div>

    <!-- Settings Section -->
    <div v-if="activeSection === 'settings'" class="space-y-4">
      <div class="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" @click="activeSection = null">
          <ChevronLeft class="size-5" />
        </Button>
        <span class="text-lg font-semibold">Settings</span>
      </div>

      <!-- Daily Goal -->
      <div class="rounded-2xl border border-border/60 bg-card p-4">
        <div class="mb-4 flex items-center gap-2">
          <Settings class="size-5 text-muted-foreground" />
          <h3 class="font-semibold">Daily Goal</h3>
        </div>
        <div class="space-y-4">
          <!-- Split Goals Toggle -->
          <div class="flex items-center justify-between rounded-xl bg-secondary/20 p-3">
            <div>
              <p class="text-sm font-medium">Split Work/Weekend Goals</p>
              <p class="text-xs text-muted-foreground">Set different targets for workdays vs weekends</p>
            </div>
            <button
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors"
              :class="settings.useSplitGoals ? 'bg-primary' : 'bg-secondary'"
              aria-label="Toggle Split Goals"
              role="switch"
              :aria-checked="settings.useSplitGoals"
              @click="settings.useSplitGoals = !settings.useSplitGoals"
            >
              <span
                class="inline-block size-4 rounded-full bg-white shadow-sm transition-transform"
                :class="settings.useSplitGoals ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>

          <!-- Split goals inputs -->
          <template v-if="settings.useSplitGoals">
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-2">
                <Label class="text-xs">Weekday Goal (hours)</Label>
                <Input
                  v-model.number="settings.weekdayGoalHours"
                  type="number"
                  min="1"
                  max="14"
                  step="0.5"
                  class="rounded-xl"
                  aria-label="Weekday goal hours"
                />
              </div>
              <div class="space-y-2">
                <Label class="text-xs">Weekend Goal (hours)</Label>
                <Input
                  v-model.number="settings.weekendGoalHours"
                  type="number"
                  min="1"
                  max="14"
                  step="0.5"
                  class="rounded-xl"
                  aria-label="Weekend goal hours"
                />
              </div>
            </div>
          </template>
          
          <div v-else class="space-y-2">
            <Label class="text-sm">Goal Hours</Label>
            <Input
              v-model.number="settings.dailyGoalHours"
              type="number"
              min="1"
              max="14"
              step="0.5"
              class="rounded-xl"
              aria-label="Daily sleep goal in hours"
            />
          </div>

          <div class="space-y-2">
            <Label class="text-sm">Prayer/Wake Anchor</Label>
            <Input v-model="settings.anchorTime" type="time" class="rounded-xl" aria-label="Wake up time anchor" />
          </div>
          <p class="text-xs text-muted-foreground">
            Anchor is for guidance only. Sleep totals follow calendar dates.
          </p>
        </div>
      </div>

      <!-- Reminders -->
      <div class="rounded-2xl border border-border/60 bg-card p-4">
        <div class="mb-4 flex items-center gap-2">
          <Bell class="size-5 text-muted-foreground" />
          <h3 class="font-semibold">Smart Reminders</h3>
        </div>

        <div class="space-y-4">
          <div class="rounded-xl bg-muted/50 p-3">
            <p class="text-xs text-muted-foreground">Permission</p>
            <p class="text-sm font-medium capitalize">
              {{ notificationSupported ? notificationPermission : 'unsupported' }}
            </p>
          </div>

          <div class="flex flex-col gap-2">
            <Button
              v-if="notificationSupported && notificationPermission !== 'granted'"
              variant="outline"
              class="rounded-xl"
              @click="requestNotificationPermission"
            >
              Allow Notifications
            </Button>
          </div>

          <div v-if="notificationSupported && notificationPermission === 'granted'" class="space-y-3">
            <!-- Basic Goal Reminder -->
            <div class="flex items-center justify-between rounded-xl bg-muted/30 p-3">
              <div>
                <p class="text-sm font-medium">Goal Check</p>
                <p class="text-xs text-muted-foreground">Remind about remaining sleep</p>
              </div>
              <div class="flex items-center gap-2">
                <input
                  v-model="reminderTime"
                  type="time"
                  class="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                />
                <button
                  class="rounded-lg px-3 py-1 text-sm font-medium transition-colors"
                  :class="reminderEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                  @click="reminderEnabled = !reminderEnabled"
                >
                  {{ reminderEnabled ? 'On' : 'Off' }}
                </button>
              </div>
            </div>

            <!-- Bedtime Reminder -->
            <div class="flex items-center justify-between rounded-xl bg-muted/30 p-3">
              <div>
                <p class="text-sm font-medium">Bedtime</p>
                <p class="text-xs text-muted-foreground">Alert at your target bedtime</p>
              </div>
              <div class="flex items-center gap-2">
                <input
                  v-model="bedtimeReminderTime"
                  type="time"
                  class="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                />
                <button
                  class="rounded-lg px-3 py-1 text-sm font-medium transition-colors"
                  :class="bedtimeReminderEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                  @click="bedtimeReminderEnabled = !bedtimeReminderEnabled"
                >
                  {{ bedtimeReminderEnabled ? 'On' : 'Off' }}
                </button>
              </div>
            </div>

            <!-- Wind-down Reminder -->
            <div class="flex items-center justify-between rounded-xl bg-muted/30 p-3">
              <div>
                <p class="text-sm font-medium">Wind-down</p>
                <p class="text-xs text-muted-foreground">
                  {{ windDownMinutes }} min before bedtime
                </p>
              </div>
              <button
                class="rounded-lg px-3 py-1 text-sm font-medium transition-colors"
                :class="windDownReminderEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                @click="windDownReminderEnabled = !windDownReminderEnabled"
              >
                {{ windDownReminderEnabled ? 'On' : 'Off' }}
              </button>
            </div>

            <!-- Goal Nudge -->
            <div class="flex items-center justify-between rounded-xl bg-muted/30 p-3">
              <div>
                <p class="text-sm font-medium">Evening Nudge</p>
                <p class="text-xs text-muted-foreground">Plan bedtime for remaining sleep</p>
              </div>
              <div class="flex items-center gap-2">
                <input
                  v-model="goalNudgeTime"
                  type="time"
                  class="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                />
                <button
                  class="rounded-lg px-3 py-1 text-sm font-medium transition-colors"
                  :class="goalNudgeReminderEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                  @click="goalNudgeReminderEnabled = !goalNudgeReminderEnabled"
                >
                  {{ goalNudgeReminderEnabled ? 'On' : 'Off' }}
                </button>
              </div>
            </div>

            <!-- Missed Goal Follow-up -->
            <div class="flex items-center justify-between rounded-xl bg-muted/30 p-3">
              <div>
                <p class="text-sm font-medium">Recovery Reminder</p>
                <p class="text-xs text-muted-foreground">Morning alert after missed goal</p>
              </div>
              <button
                class="rounded-lg px-3 py-1 text-sm font-medium transition-colors"
                :class="missedGoalReminderEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
                @click="missedGoalReminderEnabled = !missedGoalReminderEnabled"
              >
                {{ missedGoalReminderEnabled ? 'On' : 'Off' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Tags settings -->
      <div class="rounded-2xl border border-border/60 bg-card p-4">
        <div class="mb-4 flex items-center gap-2">
          <Tag class="size-5 text-muted-foreground" />
          <h3 class="font-semibold">Manage Tags</h3>
        </div>
        
        <div class="space-y-4">
          <!-- Add Tag Form -->
          <div class="flex gap-2">
            <Input
              v-model="newTagInput"
              placeholder="Add new tag..."
              class="rounded-xl flex-1 bg-secondary/20"
              aria-label="Add custom sleep tag"
              @keydown.enter="handleAddTag"
            />
            <Button
              size="sm"
              class="rounded-xl px-3"
              aria-label="Save custom tag"
              @click="handleAddTag"
            >
              <Plus class="size-4" />
            </Button>
          </div>
          <p v-if="tagError" class="text-xs text-destructive">{{ tagError }}</p>

          <!-- List of tags -->
          <div class="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
            <div
              v-for="tag in customTags"
              :key="tag"
              class="flex items-center gap-1.5 rounded-full bg-secondary/40 border border-border/30 px-3 py-1.5 text-xs text-foreground font-medium"
            >
              <span>{{ tag }}</span>
              <button
                class="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                :aria-label="`Delete custom tag ${tag}`"
                @click="handleRemoveTag(tag)"
              >
                <X class="size-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Health integration stub -->
      <div class="rounded-2xl border border-border/60 bg-card p-4">
        <div class="mb-4 flex items-center gap-2">
          <HeartPulse class="size-5 text-muted-foreground" />
          <h3 class="font-semibold">Health Integrations</h3>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between rounded-xl bg-secondary/20 p-3">
            <div>
              <p class="text-sm font-medium">Apple Health / Google Fit</p>
              <p class="text-xs text-muted-foreground">
                {{ healthIntegrationEnabled ? 'Export preference saved' : 'Prepared for manual export' }}
              </p>
            </div>
            <button
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors"
              :class="healthIntegrationEnabled ? 'bg-primary' : 'bg-secondary'"
              aria-label="Toggle health integration preference"
              role="switch"
              :aria-checked="healthIntegrationEnabled"
              @click="healthIntegrationEnabled = !healthIntegrationEnabled"
            >
              <span
                class="inline-block size-4 rounded-full bg-white shadow-sm transition-transform"
                :class="healthIntegrationEnabled ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <Button
              v-for="option in [
                { value: 'csv', label: 'CSV' },
                { value: 'json', label: 'JSON' },
              ]"
              :key="option.value"
              variant="outline"
              size="sm"
              class="rounded-xl"
              :class="healthExportPreference === option.value ? '!bg-primary !text-primary-foreground border-primary' : ''"
              @click="healthExportPreference = option.value as 'csv' | 'json'"
            >
              {{ option.label }}
            </Button>
          </div>

          <Button
            variant="outline"
            class="w-full rounded-xl"
            @click="healthExportPreference === 'csv' ? handleCSVExport() : handleExport()"
          >
            <Download class="mr-2 size-4" />
            Export Health File
          </Button>
        </div>
      </div>

      <!-- Cloud sync -->
      <div class="rounded-2xl border border-border/60 bg-card p-4">
        <div class="mb-4 flex items-center gap-2">
          <Cloud class="size-5 text-muted-foreground" />
          <h3 class="font-semibold">Cloud Sync</h3>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between rounded-xl bg-secondary/20 p-3">
            <div>
              <p class="text-sm font-medium">Optional Sync</p>
              <p class="text-xs text-muted-foreground">
                {{ cloudSync.enabled ? syncAgeLabel : 'Local-only mode' }}
              </p>
            </div>
            <button
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors"
              :class="cloudSync.enabled ? 'bg-primary' : 'bg-secondary'"
              aria-label="Toggle optional cloud sync"
              role="switch"
              :aria-checked="cloudSync.enabled"
              @click="cloudSync.enabled = !cloudSync.enabled"
            >
              <span
                class="inline-block size-4 rounded-full bg-white shadow-sm transition-transform"
                :class="cloudSync.enabled ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <Button
              v-for="option in [
                { value: 'local-vault', label: 'Local Vault' },
                { value: 'custom-endpoint', label: 'Endpoint' },
              ]"
              :key="option.value"
              variant="outline"
              size="sm"
              class="rounded-xl"
              :class="cloudSync.provider === option.value ? '!bg-primary !text-primary-foreground border-primary' : ''"
              @click="cloudSync.provider = option.value as 'local-vault' | 'custom-endpoint'"
            >
              {{ option.label }}
            </Button>
          </div>

          <div v-if="cloudSync.provider === 'custom-endpoint'" class="space-y-3">
            <Input
              v-model="cloudSync.endpoint"
              type="url"
              class="rounded-xl"
              placeholder="https://example.com/sleep-sync.json"
              aria-label="Cloud sync endpoint URL"
            />
            <Input
              v-model="cloudSync.accessToken"
              type="password"
              class="rounded-xl"
              placeholder="Access token"
              aria-label="Cloud sync access token"
            />
          </div>

          <div class="flex items-center justify-between rounded-xl bg-muted/30 p-3">
            <div>
              <p class="text-sm font-medium">Auto Sync</p>
              <p class="text-xs text-muted-foreground">Preference saved for future background sync</p>
            </div>
            <button
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors"
              :class="cloudSync.autoSync ? 'bg-primary' : 'bg-secondary'"
              aria-label="Toggle auto sync preference"
              role="switch"
              :aria-checked="cloudSync.autoSync"
              @click="cloudSync.autoSync = !cloudSync.autoSync"
            >
              <span
                class="inline-block size-4 rounded-full bg-white shadow-sm transition-transform"
                :class="cloudSync.autoSync ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              class="rounded-xl"
              :disabled="!cloudSync.enabled || !isCloudSyncConfigured || cloudSyncStatus === 'syncing'"
              @click="handleCloudPush"
            >
              <Upload class="mr-2 size-4" />
              Push
            </Button>
            <Button
              variant="outline"
              class="rounded-xl"
              :disabled="!cloudSync.enabled || !isCloudSyncConfigured || cloudSyncStatus === 'syncing'"
              @click="handleCloudPull"
            >
              <Download class="mr-2 size-4" />
              Pull
            </Button>
          </div>

          <p v-if="cloudSyncStatus === 'syncing'" class="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
            <RefreshCw class="size-3 animate-spin" />
            Syncing sleep data...
          </p>
          <p v-if="cloudSyncMessage" class="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
            {{ cloudSyncMessage }}
          </p>
          <p v-if="cloudSyncError" class="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {{ cloudSyncError }}
          </p>
        </div>
      </div>

      <!-- Backup -->
      <div class="rounded-2xl border border-border/60 bg-card p-4">
        <div class="mb-4 flex items-center gap-2">
          <Download class="size-5 text-muted-foreground" />
          <h3 class="font-semibold">Backup & Export</h3>
        </div>
        <div class="space-y-3">
          <Button variant="outline" class="w-full rounded-xl" @click="handleExport">
            <Upload class="mr-2 size-4" />
            Export JSON Backup
          </Button>

          <div class="rounded-xl bg-secondary/20 p-3">
            <p class="mb-2 text-xs font-medium text-muted-foreground">Import Mode</p>
            <div class="grid grid-cols-2 gap-2">
              <Button
                v-for="option in [
                  { value: 'merge', label: 'Merge' },
                  { value: 'replace', label: 'Replace' },
                ]"
                :key="option.value"
                variant="outline"
                size="sm"
                class="rounded-xl"
                :class="importMode === option.value ? '!bg-primary !text-primary-foreground border-primary' : ''"
                @click="importMode = option.value as 'merge' | 'replace'"
              >
                {{ option.label }}
              </Button>
            </div>
            <p class="mt-2 text-[11px] text-muted-foreground">
              {{ importMode === 'merge' ? 'Adds new sessions and skips duplicates.' : 'Replaces local sessions with the backup.' }}
            </p>
          </div>

          <!-- Replace mode warning banner -->
          <div
            v-if="importMode === 'replace'"
            class="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3"
          >
            <span class="mt-0.5 text-amber-600 dark:text-amber-400 shrink-0">⚠️</span>
            <p class="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              <strong>Replace mode</strong> will permanently delete all your current sessions and replace them with the backup file. This cannot be undone.
            </p>
          </div>

          <Button
            variant="outline"
            class="w-full rounded-xl"
            :class="importMode === 'replace' ? 'border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10' : ''"
            @click="handleImportClick"
          >
            <Download class="mr-2 size-4" />
            Import JSON Backup
          </Button>
          <input ref="importInput" type="file" accept="application/json" class="hidden" @change="handleImport">

          <div class="my-3 border-t border-border/40" />

          <Button variant="outline" class="w-full rounded-xl" @click="handleCSVExport">
            <Download class="mr-2 size-4" />
            Export CSV
          </Button>

          <p v-if="backupMessage" class="rounded-xl bg-primary/10 px-3 py-2 text-xs text-primary">
            {{ backupMessage }}
          </p>
          <p v-if="backupError" class="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {{ backupError }}
          </p>
        </div>
      </div>
    </div>

    <!-- Destructive Delete Confirmation Modal -->
    <Transition name="dialog-fade">
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 pb-10"
        @click="cancelDelete"
      >
        <div
          class="w-full max-w-sm rounded-3xl bg-card border border-border/80 p-6 shadow-2xl transition-all"
          @click.stop
        >
          <div class="mb-5 text-center">
            <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 class="size-6 animate-bounce" />
            </div>
            <h3 class="text-lg font-bold text-foreground">Delete Session?</h3>
            <p class="mt-2 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this sleep session? You can undo this action within 5 seconds.
            </p>
          </div>
          <div class="flex gap-3">
            <Button
              variant="outline"
              class="flex-1 rounded-xl py-3 text-sm font-medium"
              @click="cancelDelete"
            >
              Cancel
            </Button>
            <Button
              class="flex-1 rounded-xl py-3 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90"
              @click="handleDeleteConfirm"
            >
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Replace Import Confirmation Modal -->
    <Transition name="dialog-fade">
      <div
        v-if="showReplaceConfirm"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 pb-10"
        @click="showReplaceConfirm = false"
      >
        <div
          class="w-full max-w-sm rounded-3xl bg-card border border-border/80 p-6 shadow-2xl"
          @click.stop
        >
          <div class="mb-5 text-center">
            <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <Upload class="size-6" />
            </div>
            <h3 class="text-lg font-bold">Replace All Data?</h3>
            <p class="mt-2 text-xs text-muted-foreground leading-relaxed">
              This will permanently delete <strong>all</strong> your current sleep sessions and replace them with the backup file. There is no undo for this action.
            </p>
          </div>
          <div class="flex gap-3">
            <Button variant="outline" class="flex-1 rounded-xl" @click="showReplaceConfirm = false">
              Cancel
            </Button>
            <Button
              class="flex-1 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
              @click="confirmReplaceImport"
            >
              Replace All
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
.dialog-fade-enter-from .w-full,
.dialog-fade-leave-to .w-full {
  transform: translateY(40px) scale(0.95);
}
</style>
