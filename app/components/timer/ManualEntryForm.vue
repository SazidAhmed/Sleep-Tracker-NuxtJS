<script setup lang="ts">
import { Plus, ChevronRight, Check, Loader2 } from 'lucide-vue-next'
import { reactive, ref, onBeforeUnmount } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSleepData } from '@/composables/useSleepData'
import { useHaptics } from '@/composables/useHaptics'
import { useKeyboardNav } from '@/composables/useKeyboardNav'
import { toDateTimeLocalValue, getQualityEmoji, getQualityLabel } from '@/lib/sleep'

const { saveSession, customTags } = useSleepData()
const haptics = useHaptics()
const { handleGroupKeydown } = useKeyboardNav()

const now = new Date()
const sessionForm = reactive({
  start: toDateTimeLocalValue(new Date(now.getTime() - 90 * 60 * 1000)),
  end: toDateTimeLocalValue(now),
  quality: undefined as 1 | 2 | 3 | 4 | 5 | undefined,
  tags: [] as string[],
  notes: '',
})

const errorMessage = ref('')
const isSaving = ref(false)
const showToast = ref(false)
let toastTimeout: ReturnType<typeof setTimeout> | null = null

function handleSaveSession() {
  if (isSaving.value) return
  errorMessage.value = ''

  // Validate session start and end times first
  const startMs = new Date(sessionForm.start).getTime()
  const endMs = new Date(sessionForm.end).getTime()
  if (endMs <= startMs) {
    errorMessage.value = 'End time must be later than start time.'
    haptics.error()
    return
  }

  isSaving.value = true

  // Simulate save delay to prevent double clicks and show loading feedback
  setTimeout(() => {
    const result = saveSession({ ...sessionForm })
    if (result.error) {
      errorMessage.value = result.error
      haptics.error()
      isSaving.value = false
      return
    }

    haptics.success()

    // Reset Form
    const nextEnd = new Date()
    sessionForm.start = toDateTimeLocalValue(new Date(nextEnd.getTime() - 90 * 60 * 1000))
    sessionForm.end = toDateTimeLocalValue(nextEnd)
    sessionForm.quality = undefined
    sessionForm.tags = []
    sessionForm.notes = ''

    isSaving.value = false

    // Show Success Toast
    showToast.value = true
    if (toastTimeout) clearTimeout(toastTimeout)
    toastTimeout = setTimeout(() => {
      showToast.value = false
    }, 3000)
  }, 800)
}

onBeforeUnmount(() => {
  if (toastTimeout) clearTimeout(toastTimeout)
})

function handleQualityKeydown(e: KeyboardEvent) {
  handleGroupKeydown(
    e,
    sessionForm.quality,
    { selector: '.manual-quality-btn', loop: true },
    (val) => { sessionForm.quality = val }
  )
}

function handleTagsKeydown(e: KeyboardEvent) {
  handleGroupKeydown(
    e,
    null, // Not a radio group, just focus navigation
    { selector: '.manual-tag-btn', loop: true },
    () => {} // No selection on arrow keys for tags (usually multi-select)
  )
}
</script>

<template>
  <div class="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
    <div class="mb-4 flex items-center gap-2">
      <div class="flex size-8 items-center justify-center rounded-lg bg-primary/10">
        <Plus class="size-4 text-primary" />
      </div>
      <h2 class="text-base font-semibold">Log Sleep Manually</h2>
    </div>

    <div class="space-y-4">
      <div class="space-y-1.5">
        <Label class="text-xs uppercase font-medium text-muted-foreground">Sleep Start</Label>
        <Input v-model="sessionForm.start" type="datetime-local" class="rounded-xl bg-secondary/40" />
      </div>
      <div class="space-y-1.5">
        <Label class="text-xs uppercase font-medium text-muted-foreground">Wake Time</Label>
        <Input v-model="sessionForm.end" type="datetime-local" class="rounded-xl bg-secondary/40" />
      </div>

      <div class="space-y-1.5">
        <Label class="text-xs uppercase font-medium text-muted-foreground">Sleep Quality</Label>
        <div
          class="flex gap-2"
          role="radiogroup"
          aria-label="Select sleep quality"
          @keydown="handleQualityKeydown"
        >
          <button
            v-for="n in 5"
            :key="n"
            class="flex-1 rounded-xl py-3 text-2xl transition-all manual-quality-btn"
            :class="sessionForm.quality === n ? 'bg-primary text-primary-foreground' : 'bg-secondary/40'"
            role="radio"
            :aria-checked="sessionForm.quality === n"
            :aria-label="getQualityLabel(n)"
            :data-value="n"
            @click="sessionForm.quality = n as any"
          >
            {{ getQualityEmoji(n) }}
          </button>
        </div>
      </div>

      <div class="space-y-1.5">
        <Label class="text-xs uppercase font-medium text-muted-foreground">Tags</Label>
        <div
          class="flex flex-wrap gap-2"
          role="group"
          aria-label="Select sleep tags"
          @keydown="handleTagsKeydown"
        >
          <button
            v-for="tag in customTags"
            :key="tag"
            class="rounded-full px-3 py-1.5 text-xs font-medium manual-tag-btn"
            :class="sessionForm.tags.includes(tag) ? 'bg-primary text-primary-foreground' : 'bg-secondary/40'"
            :aria-pressed="sessionForm.tags.includes(tag)"
            @click="sessionForm.tags.includes(tag) ? sessionForm.tags.splice(sessionForm.tags.indexOf(tag), 1) : sessionForm.tags.push(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>

      <p v-if="errorMessage" class="text-sm text-destructive">{{ errorMessage }}</p>
      <Button :disabled="isSaving" class="w-full rounded-2xl py-5" size="lg" @click="handleSaveSession">
        <template v-if="isSaving">
          <Loader2 class="mr-2 size-4 animate-spin" />
          Saving...
        </template>
        <template v-else>
          Save Session <ChevronRight class="ml-2 size-4" />
        </template>
      </Button>
    </div>

    <!-- Toast Notification -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-y-10 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-10 opacity-0"
      >
        <div
          v-if="showToast"
          class="fixed bottom-24 left-4 right-4 z-[9999] mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-foreground p-4 text-background shadow-xl"
        >
          <div class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Check class="size-4" />
          </div>
          <span class="text-sm font-medium">Sleep session logged successfully!</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
