<script setup lang="ts">
import { Zap, Plus, Clock, Save, Trash2, Pencil, Check } from 'lucide-vue-next'
import { ref, reactive, onBeforeUnmount } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSleepData } from '@/composables/useSleepData'
import { useHaptics } from '@/composables/useHaptics'
import { getQualityEmoji, getQualityLabel, type SessionTemplate } from '@/lib/sleep'
import ConfirmationModal from '../ConfirmationModal.vue'

const {
  templates,
  saveTemplate,
  deleteTemplate,
  useTemplate,
  formatDurationFromMinutes,
  customTags,
} = useSleepData()

const haptics = useHaptics()

const showTemplateForm = ref(false)
const templateForm = reactive({
  name: '',
  durationMinutes: 480,
  defaultQuality: undefined as 1 | 2 | 3 | 4 | 5 | undefined,
  defaultTags: [] as string[],
})
const templateError = ref('')
const editingTemplateId = ref<string | null>(null)
const showToast = ref(false)
let toastTimeout: ReturnType<typeof setTimeout> | null = null

onBeforeUnmount(() => {
  if (toastTimeout) clearTimeout(toastTimeout)
})

function resetForm() {
  templateForm.name = ''
  templateForm.durationMinutes = 480
  templateForm.defaultQuality = undefined
  templateForm.defaultTags = []
  editingTemplateId.value = null
}

function toggleForm() {
  if (showTemplateForm.value) {
    showTemplateForm.value = false
    resetForm()
  } else {
    resetForm()
    showTemplateForm.value = true
  }
}

function handleUseTemplate(id: string) {
  const result = useTemplate(id)
  if (result.error) {
    templateError.value = result.error
    haptics.error()
  } else {
    templateError.value = ''
    haptics.success()
    showToast.value = true
    if (toastTimeout) clearTimeout(toastTimeout)
    toastTimeout = setTimeout(() => {
      showToast.value = false
    }, 3000)
  }
}

function handleSaveTemplate() {
  if (!templateForm.name.trim()) { templateError.value = 'Name required'; haptics.error(); return }
  saveTemplate({ ...templateForm, name: templateForm.name.trim() }, editingTemplateId.value || undefined)
  haptics.success()
  showTemplateForm.value = false
  resetForm()
}

function handleEditTemplate(template: SessionTemplate) {
  templateForm.name = template.name
  templateForm.durationMinutes = template.durationMinutes
  templateForm.defaultQuality = template.defaultQuality
  templateForm.defaultTags = [...(template.defaultTags || [])]
  editingTemplateId.value = template.id
  showTemplateForm.value = true
}

const showDeleteConfirm = ref(false)
const templateToDelete = ref<string | null>(null)

function handleDeleteTemplate(id: string) {
  templateToDelete.value = id
  showDeleteConfirm.value = true
}

function confirmDeleteTemplate() {
  if (templateToDelete.value) {
    deleteTemplate(templateToDelete.value)
    templateToDelete.value = null
    showDeleteConfirm.value = false
    haptics.light()
  }
}
</script>

<template>
  <div class="mb-6 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Zap class="size-4 text-primary" />
        </div>
        <h2 class="text-base font-semibold">Quick Templates</h2>
      </div>
      <Button variant="ghost" size="sm" class="rounded-lg text-xs" @click="toggleForm">
        <Plus class="mr-1 size-3" /> {{ showTemplateForm ? 'Cancel' : 'New' }}
      </Button>
    </div>

    <p v-if="templateError" class="mb-3 text-sm text-destructive">{{ templateError }}</p>

    <div v-if="showTemplateForm" class="mb-4 rounded-2xl border border-border/40 bg-muted/30 p-4 space-y-3">
      <Input v-model="templateForm.name" placeholder="Template Name" class="rounded-xl" />
      <div class="flex items-center gap-2">
        <Input v-model.number="templateForm.durationMinutes" type="number" class="rounded-xl" />
        <span class="text-xs text-muted-foreground">min</span>
      </div>
      <div class="flex gap-1">
        <button v-for="n in 5" :key="n" class="flex-1 rounded-lg py-2 text-lg transition-all" :class="templateForm.defaultQuality === n ? 'bg-primary text-primary-foreground' : 'bg-background'" @click="templateForm.defaultQuality = n as any">
          {{ getQualityEmoji(n) }}
        </button>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" class="flex-1 rounded-xl" @click="toggleForm">Cancel</Button>
        <Button class="flex-1 rounded-xl" @click="handleSaveTemplate"><Save class="mr-1 size-4" /> Save</Button>
      </div>
    </div>

    <div v-if="templates.length > 0" class="grid grid-cols-2 gap-2">
      <div v-for="template in templates" :key="template.id" class="group relative rounded-2xl border border-border/40 bg-muted/20 p-3 hover:bg-muted/40">
        <button class="w-full text-left" @click="handleUseTemplate(template.id)">
          <div class="mb-1 flex items-center gap-1.5">
            <Clock class="size-3.5 text-muted-foreground" />
            <span class="text-sm font-medium truncate">{{ template.name }}</span>
          </div>
          <p class="text-xs text-muted-foreground">{{ formatDurationFromMinutes(template.durationMinutes) }}</p>
        </button>
        <div class="absolute right-1.5 top-1.5 flex opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-muted/60 md:bg-transparent rounded-full md:rounded-none backdrop-blur-sm md:backdrop-blur-none p-0.5 md:p-0">
          <button class="rounded-full p-1 text-muted-foreground/70 hover:text-foreground" @click.stop="handleEditTemplate(template)">
            <Pencil class="size-3" />
          </button>
          <button class="rounded-full p-1 text-muted-foreground/70 hover:text-destructive" @click.stop="handleDeleteTemplate(template.id)">
            <Trash2 class="size-3" />
          </button>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-4 text-xs text-muted-foreground">No templates yet</div>

    <ConfirmationModal
      :show="showDeleteConfirm"
      title="Delete Template?"
      description="Are you sure you want to delete this session template?"
      @confirm="confirmDeleteTemplate"
      @cancel="showDeleteConfirm = false"
    />

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
