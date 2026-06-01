<script setup lang="ts">
import { 
  Settings, Bell, Tag, HeartPulse, Cloud, Download, Upload, 
  ChevronLeft, Plus, X, RefreshCw, Trash2 
} from 'lucide-vue-next'
import { ref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSleepData } from '@/composables/useSleepData'
import { useSleepReminders } from '@/composables/useSleepReminders'
import { useSleepBackup } from '@/composables/useSleepBackup'
import { useCloudSync } from '@/composables/useCloudSync'
import ConfirmationModal from '../ConfirmationModal.vue'
import { SLEEP_TAGS } from '@/lib/sleep'

const emit = defineEmits<{
  (e: 'back'): void
}>()

const {
  settings,
  sessions,
  templates,
  customTags,
  addCustomTag,
  removeCustomTag,
  exportCSV,
  activeSessionStart,
} = useSleepData()

const {
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
  requestNotificationPermission,
} = useSleepReminders()

const {
  exportBackup,
  importBackup,
} = useSleepBackup()

const {
  config: cloudSync,
  status: cloudSyncStatus,
  error: cloudSyncError,
  isConfigured: isCloudSyncConfigured,
  syncAgeLabel,
  syncNow,
} = useCloudSync()

// Health integration
const healthIntegrationEnabled = useLocalStorage<boolean>('sleep-tracker-health-integration-enabled', false)
const healthExportPreference = useLocalStorage<'csv' | 'json'>('sleep-tracker-health-export-preference', 'csv')

// Tag settings
const newTagInput = ref('')
const tagError = ref('')

function handleAddTag() {
  tagError.value = ''
  if (!newTagInput.value.trim()) return
  const result = addCustomTag(newTagInput.value)
  if (result.error) tagError.value = result.error
  else newTagInput.value = ''
}

// Backup actions
const backupMessage = ref('')
const backupError = ref('')
const importInput = ref<HTMLInputElement | null>(null)
const importMode = ref<'merge' | 'replace'>('merge')
const showReplaceConfirm = ref(false)

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
    if (result.error) backupError.value = result.error
    else {
      const skipped = result.skippedCount ? ` Skipped ${result.skippedCount} duplicate.` : ''
      backupMessage.value = `${importMode.value === 'replace' ? 'Replaced' : 'Merged'} ${result.importedCount} sessions.${skipped}`
    }
  } catch { backupError.value = 'Could not read backup file.' }
  finally { input.value = '' }
}

// Cloud actions
const cloudSyncMessage = ref('')
async function handleCloudPush() {
  cloudSyncMessage.value = ''
  const result = await syncNow('push', settings.value, sessions.value)
  if (result.success) cloudSyncMessage.value = 'Data pushed to cloud.'
}

async function handleCloudPull() {
  cloudSyncMessage.value = ''
  const result = await syncNow('pull', settings.value, sessions.value)
  if (result.success && result.snapshot) {
    const importResult = importBackup(result.snapshot, 'merge')
    cloudSyncMessage.value = importResult.error ? '' : `Pulled ${importResult.importedCount} sessions.`
    if (importResult.error) cloudSyncError.value = importResult.error
  }
}

// Destructive Clear All Data
const showClearDataConfirm = ref(false)
const statusMessage = ref('')

function handleClearAllData() {
  sessions.value = []
  templates.value = []
  customTags.value = [...SLEEP_TAGS]
  activeSessionStart.value = null
  showClearDataConfirm.value = false
  statusMessage.value = 'All data cleared'
  setTimeout(() => statusMessage.value = '', 2000)
}
</script>

<template>
  <div class="space-y-4">
    <div class="mb-4 flex items-center gap-2">
      <Button variant="ghost" size="icon" class="rounded-xl" @click="emit('back')">
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
        <div class="flex items-center justify-between rounded-xl bg-secondary/20 p-3">
          <div>
            <p class="text-sm font-medium">Split Work/Weekend Goals</p>
            <p class="text-xs text-muted-foreground">Set different targets</p>
          </div>
          <button
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            :class="settings.useSplitGoals ? 'bg-primary' : 'bg-secondary'"
            role="switch"
            :aria-checked="settings.useSplitGoals"
            @click="settings.useSplitGoals = !settings.useSplitGoals"
          >
            <span
              class="inline-block size-4 rounded-full bg-white transition-transform"
              :class="settings.useSplitGoals ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <template v-if="settings.useSplitGoals">
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-2">
              <Label class="text-xs">Weekday (h)</Label>
              <Input v-model.number="settings.weekdayGoalHours" type="number" step="0.5" class="rounded-xl" />
            </div>
            <div class="space-y-2">
              <Label class="text-xs">Weekend (h)</Label>
              <Input v-model.number="settings.weekendGoalHours" type="number" step="0.5" class="rounded-xl" />
            </div>
          </div>
        </template>
        <div v-else class="space-y-2">
          <Label class="text-sm">Goal Hours</Label>
          <Input v-model.number="settings.dailyGoalHours" type="number" step="0.5" class="rounded-xl" />
        </div>

        <div class="space-y-2">
          <Label class="text-sm">Prayer/Wake Anchor</Label>
          <Input v-model="settings.anchorTime" type="time" class="rounded-xl" />
        </div>

        <div class="my-2 border-t border-border/20" />
        <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Efficiency Estimates</p>
        
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-2">
            <Label class="text-xs">Latency (min)</Label>
            <Input v-model.number="settings.defaultLatencyMinutes" type="number" class="rounded-xl" />
          </div>
          <div class="space-y-2">
            <Label class="text-xs">Awake Time (min)</Label>
            <Input v-model.number="settings.defaultAwakeMinutes" type="number" class="rounded-xl" />
          </div>
        </div>
      </div>
    </div>

    <!-- Reminders -->
    <div class="rounded-2xl border border-border/60 bg-card p-4">
      <div class="mb-4 flex items-center gap-2">
        <Bell class="size-5 text-muted-foreground" />
        <h3 class="font-semibold">Smart Reminders</h3>
      </div>
      <div class="space-y-4">
        <Button
          v-if="notificationSupported && notificationPermission !== 'granted'"
          variant="outline"
          class="w-full rounded-xl"
          @click="requestNotificationPermission"
        >
          Allow Notifications
        </Button>

        <div v-if="notificationPermission === 'granted'" class="space-y-3">
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
        </div>
      </div>
    </div>

    <!-- Cloud Sync -->
    <div class="rounded-2xl border border-border/60 bg-card p-4">
      <div class="mb-4 flex items-center gap-2">
        <Cloud class="size-5 text-muted-foreground" />
        <h3 class="font-semibold">Cloud Sync</h3>
      </div>
      <div class="space-y-4">
        <div class="flex items-center justify-between rounded-xl bg-secondary/20 p-3">
          <span class="text-sm font-medium">Optional Sync</span>
          <button
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
            :class="cloudSync.enabled ? 'bg-primary' : 'bg-secondary'"
            @click="cloudSync.enabled = !cloudSync.enabled"
          >
            <span class="inline-block size-4 rounded-full bg-white transition-transform" :class="cloudSync.enabled ? 'translate-x-6' : 'translate-x-1'" />
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <Button variant="outline" class="rounded-xl" :disabled="!isCloudSyncConfigured" @click="handleCloudPush"><Upload class="mr-2 size-4" /> Push</Button>
          <Button variant="outline" class="rounded-xl" :disabled="!isCloudSyncConfigured" @click="handleCloudPull"><Download class="mr-2 size-4" /> Pull</Button>
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
        <Button variant="outline" class="w-full rounded-xl" @click="handleExport"><Upload class="mr-2 size-4" /> Export JSON</Button>
        <Button variant="outline" class="w-full rounded-xl" @click="handleCSVExport"><Download class="mr-2 size-4" /> Export CSV</Button>
        <div class="my-3 border-t border-border/40" />
        <Button variant="ghost" class="w-full rounded-xl text-destructive hover:bg-destructive/10" @click="showClearDataConfirm = true">
          <Trash2 class="mr-2 size-4" /> Clear All App Data
        </Button>
      </div>
    </div>

    <p v-if="statusMessage" class="text-center text-sm text-primary">{{ statusMessage }}</p>

    <ConfirmationModal
      :show="showClearDataConfirm"
      title="Clear All Data?"
      description="This will permanently delete all your sessions, templates, and custom tags. History will be lost."
      @confirm="handleClearAllData"
      @cancel="showClearDataConfirm = false"
    />
  </div>
</template>
