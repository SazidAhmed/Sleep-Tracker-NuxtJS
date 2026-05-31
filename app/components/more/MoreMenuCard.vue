<script setup lang="ts">
import type { Component } from 'vue'
import { ChevronRight } from 'lucide-vue-next'

defineProps<{
  icon: Component
  title: string
  description: string
  iconClass?: string
}>()

defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    class="group flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    @click="$emit('select')"
  >
    <div
      class="flex size-12 items-center justify-center rounded-xl bg-secondary transition-colors group-hover:bg-primary/10"
      :class="iconClass"
    >
      <component :is="icon" class="size-6" />
    </div>
    <div class="flex-1">
      <p class="font-semibold">{{ title }}</p>
      <p class="text-sm text-muted-foreground">{{ description }}</p>
    </div>
    <ChevronRight class="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
  </button>
</template>
