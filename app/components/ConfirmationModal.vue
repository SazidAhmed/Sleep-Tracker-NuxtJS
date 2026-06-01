<script setup lang="ts">
import { Trash2, AlertTriangle, Info, CheckCircle2 } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

interface Props {
  show: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  type?: 'destructive' | 'warning' | 'info' | 'success'
}

const props = withDefaults(defineProps<Props>(), {
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  type: 'destructive',
})

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const iconMap = {
  destructive: Trash2,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
}

const colorMap = {
  destructive: 'bg-destructive/10 text-destructive',
  warning: 'bg-amber-500/10 text-amber-600',
  info: 'bg-primary/10 text-primary',
  success: 'bg-green-500/10 text-green-600',
}

const buttonMap = {
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  warning: 'bg-amber-600 text-white hover:bg-amber-700',
  info: 'bg-primary text-primary-foreground hover:bg-primary/90',
  success: 'bg-green-600 text-white hover:bg-green-700',
}
</script>

<template>
  <Transition name="dialog-fade">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 pb-10"
      @click="emit('cancel')"
    >
      <div
        class="w-full max-w-sm rounded-3xl bg-card border border-border/80 p-6 shadow-2xl transition-all"
        @click.stop
      >
        <div class="mb-5 text-center">
          <div 
            class="mx-auto mb-3 flex size-12 items-center justify-center rounded-full"
            :class="colorMap[type]"
          >
            <component :is="iconMap[type]" class="size-6" />
          </div>
          <h3 class="text-lg font-bold text-foreground">{{ title }}</h3>
          <p class="mt-2 text-xs text-muted-foreground leading-relaxed" v-html="description" />
        </div>
        <div class="flex gap-3">
          <Button
            variant="outline"
            class="flex-1 rounded-xl py-3 text-sm font-medium"
            @click="emit('cancel')"
          >
            {{ cancelText }}
          </Button>
          <Button
            class="flex-1 rounded-xl py-3 text-sm font-medium"
            :class="buttonMap[type]"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </Button>
        </div>
      </div>
    </div>
  </Transition>
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
