<script setup lang="ts">
import { Pencil, Trash2, Copy, Trash } from 'lucide-vue-next'
import { ref, reactive, nextTick } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSleepData } from '@/composables/useSleepData'
import { useKeyboardNav } from '@/composables/useKeyboardNav'
import { type SleepSession, getQualityEmoji, getQualityLabel } from '@/lib/sleep'

interface Props {
  session: SleepSession
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'duplicate', session: SleepSession): void
  (e: 'delete', session: SleepSession): void
}>()

const {
  saveSession,
  formatDurationFromMinutes,
  formatDateTimeLabel,
  formatTimeLabel,
  getSessionDurationMinutes,
  customTags,
} = useSleepData()

const { handleGroupKeydown } = useKeyboardNav()

// Editing State
const isEditing = ref(false)
const editForm = reactive({
  start: '',
  end: '',
  quality: undefined as 1 | 2 | 3 | 4 | 5 | undefined,
  tags: [] as string[],
  notes: ''
})
const editError = ref('')

function startEdit() {
  editForm.start = props.session.start.slice(0, 16)
  editForm.end = props.session.end.slice(0, 16)
  editForm.quality = props.session.quality
  editForm.tags = [...(props.session.tags ?? [])]
  editForm.notes = props.session.notes ?? ''
  editError.value = ''
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  editError.value = ''
}

function handleSaveEdit() {
  editError.value = ''
  const result = saveSession(
    {
      start: editForm.start,
      end: editForm.end,
      quality: editForm.quality,
      tags: editForm.tags,
      notes: editForm.notes
    },
    props.session.id
  )

  if (result.error) {
    editError.value = result.error
    return
  }

  isEditing.value = false
}

// Swipe Logic
const isSwiping = ref(false)
const swipeTranslateX = ref(0)
const swipeStartX = ref(0)
const swipeCurrentX = ref(0)
const swipeThreshold = 65

function handleTouchStart(e: TouchEvent) {
  if (isEditing.value) return
  swipeStartX.value = e.touches[0]!.clientX
  swipeCurrentX.value = swipeStartX.value
  isSwiping.value = true
}

function handleTouchMove(e: TouchEvent) {
  if (!isSwiping.value) return
  swipeCurrentX.value = e.touches[0]!.clientX
  const diff = swipeCurrentX.value - swipeStartX.value
  if (diff < 0) {
    swipeTranslateX.value = Math.max(diff, -100)
  } else {
    swipeTranslateX.value = 0
  }
}

function handleTouchEnd() {
  if (!isSwiping.value) return
  const diff = swipeCurrentX.value - swipeStartX.value
  if (diff < -swipeThreshold) {
    swipeTranslateX.value = -80
  } else {
    swipeTranslateX.value = 0
  }
  isSwiping.value = false
}

function resetSwipe() {
  swipeTranslateX.value = 0
  isSwiping.value = false
}

defineExpose({ resetSwipe })

// Keyboard handlers
function handleQualityKeydown(e: KeyboardEvent) {
  handleGroupKeydown(
    e,
    editForm.quality,
    { selector: '.edit-quality-btn', loop: true },
    (val) => { editForm.quality = val }
  )
}
</script>

<template>
  <div
    class="relative overflow-hidden rounded-2xl border border-border/60 bg-card"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
  >
    <!-- Swiped Delete Button -->
    <div
      v-if="!isEditing"
      class="absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-destructive text-destructive-foreground transition-opacity"
      :class="swipeTranslateX < 0 ? 'opacity-100' : 'opacity-0'"
    >
      <button
        class="flex size-full items-center justify-center text-white"
        aria-label="Confirm swipe delete"
        @click.stop="emit('delete', session)"
      >
        <Trash2 class="size-5 animate-pulse" />
      </button>
    </div>

    <!-- Main Card Content -->
    <div
      class="bg-card p-4 transition-transform duration-200"
      :style="{ transform: `translateX(${swipeTranslateX}px)` }"
    >
      <!-- Edit Mode -->
      <div v-if="isEditing" class="space-y-3">
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
              :data-value="n"
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
              v-for="tag in customTags"
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
          <textarea 
            v-model="editForm.notes" 
            rows="2" 
            class="w-full rounded-xl bg-secondary/40 px-3 py-2 text-sm outline-none" 
            placeholder="How did you sleep?" 
          />
        </div>
        <p v-if="editError" class="text-xs text-destructive">{{ editError }}</p>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" class="flex-1" @click="cancelEdit">Cancel</Button>
          <Button size="sm" class="flex-1" @click="handleSaveEdit">Save</Button>
        </div>
      </div>

      <!-- View Mode -->
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
          <Button variant="ghost" size="icon" class="size-8" aria-label="Duplicate session" @click="emit('duplicate', session)">
            <Copy class="size-4" />
          </Button>
          <Button variant="ghost" size="icon" class="size-8" aria-label="Edit session" @click="startEdit">
            <Pencil class="size-4" />
          </Button>
          <Button variant="ghost" size="icon" class="size-8 text-destructive/80 hover:text-destructive" aria-label="Delete session" @click="emit('delete', session)">
            <Trash2 class="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
