<script setup lang="ts">
import { MoreHorizontal, Search, Settings, Bell, Download, Upload, Pencil, Trash2, ChevronLeft, ChevronRight, Clock, Copy, Undo2 } from 'lucide-vue-next'
import { useSleepData } from '@/composables/useSleepData'
import { toDateTimeLocalValue, type SleepSession, SLEEP_TAGS, getQualityEmoji, getQualityLabel } from '@/lib/sleep'

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
} = useSleepData()

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
    const result = importBackup(parsed)

    if (result.error) {
      backupError.value = result.error
    } else {
      backupMessage.value = `Imported ${result.count} session${result.count === 1 ? '' : 's'}.`
    }
  }
  catch {
    backupError.value = 'Could not read this backup file.'
  }
  finally {
    input.value = ''
  }
}

// Active section
const activeSection = ref<'sessions' | 'settings' | null>(null)
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
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
      <button
        class="group flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
        @click="activeSection = 'sessions'"
      >
        <div class="flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
          <Clock class="size-6 text-primary" />
        </div>
        <div class="flex-1">
          <p class="font-semibold">Session Log</p>
          <p class="text-sm text-muted-foreground">{{ sessions.length }} session{{ sessions.length === 1 ? '' : 's' }} logged</p>
        </div>
        <ChevronRight class="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </button>

      <button
        class="group flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
        @click="activeSection = 'settings'"
      >
        <div class="flex size-12 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-primary/10">
          <Settings class="size-6 transition-colors group-hover:text-primary" />
        </div>
        <div class="flex-1">
          <p class="font-semibold">Settings</p>
          <p class="text-sm text-muted-foreground">Goal, reminders, backup</p>
        </div>
        <ChevronRight class="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </button>

      <!-- App info -->
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
          v-for="session in filteredSessions"
          :key="session.id"
          class="rounded-2xl border border-border/60 bg-card p-4"
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
              <div class="flex gap-1">
                <button
                  v-for="n in 5"
                  :key="n"
                  class="flex-1 rounded-lg py-2 text-lg transition-all"
                  :class="editForm.quality === n ? 'bg-primary text-primary-foreground' : 'bg-secondary/40 hover:bg-secondary'"
                  @click="editForm.quality = editForm.quality === n ? undefined : n as 1 | 2 | 3 | 4 | 5"
                >
                  {{ getQualityEmoji(n) }}
                </button>
              </div>
            </div>
            <div class="space-y-2">
              <Label class="text-xs">Tags</Label>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="tag in SLEEP_TAGS"
                  :key="tag"
                  class="rounded-full px-2 py-1 text-[10px] font-medium transition-all"
                  :class="editForm.tags.includes(tag) ? 'bg-primary text-primary-foreground' : 'bg-secondary/40 text-muted-foreground hover:bg-secondary'"
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
              <Button variant="ghost" size="icon" class="size-8" @click="duplicateSession(session)">
                <Copy class="size-4" />
              </Button>
              <Button variant="ghost" size="icon" class="size-8" @click="startEdit(session)">
                <Pencil class="size-4" />
              </Button>
              <Button variant="ghost" size="icon" class="size-8" @click="removeSession(session.id)">
                <Trash2 class="size-4" />
              </Button>
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
          <div class="space-y-2">
            <Label class="text-sm">Goal Hours</Label>
            <Input
              v-model.number="settings.dailyGoalHours"
              type="number"
              min="1"
              max="14"
              step="0.5"
              class="rounded-xl"
            />
          </div>
          <div class="space-y-2">
            <Label class="text-sm">Prayer/Wake Anchor</Label>
            <Input v-model="settings.anchorTime" type="time" class="rounded-xl" />
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
          <Button variant="outline" class="w-full rounded-xl" @click="importInput?.click()">
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
  </div>
</template>
