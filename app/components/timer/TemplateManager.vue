<script setup lang="ts">
import { Zap, Plus, Clock, Save, Trash2 } from 'lucide-vue-next'
import { ref, reactive } from 'vue'
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

function handleUseTemplate(id: string) {
  const result = useTemplate(id)
  if (result.error) { templateError.value = result.error; haptics.error() }
  else { templateError.value = ''; haptics.success() }
}

function handleSaveTemplate() {
  if (!templateForm.name.trim()) { templateError.value = 'Name required'; haptics.error(); return }
  saveTemplate({ ...templateForm, name: templateForm.name.trim() })
  haptics.success()
  showTemplateForm.value = false
  templateForm.name = ''; templateForm.durationMinutes = 480; templateForm.defaultQuality = undefined; templateForm.defaultTags = []
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
      <Button variant="ghost" size="sm" class="rounded-lg text-xs" @click="showTemplateForm = !showTemplateForm">
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
        <Button variant="outline" class="flex-1 rounded-xl" @click="showTemplateForm = false">Cancel</Button>
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
        <button class="absolute right-1.5 top-1.5 rounded-full p-1 opacity-0 group-hover:opacity-100 hover:text-destructive" @click.stop="handleDeleteTemplate(template.id)">
          <Trash2 class="size-3" />
        </button>
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
  </div>
</template>
