<script setup lang="ts">
interface Props {
  height?: string
}
const props = withDefaults(defineProps<Props>(), {
  height: '160px'
})
</script>

<template>
  <div 
    class="w-full animate-pulse rounded-3xl bg-card border border-border/40 p-5 shadow-sm"
    :style="{ height: props.height }"
  >
    <div class="mb-4 flex items-center gap-3">
      <div class="size-8 rounded-lg bg-muted" />
      <div class="h-4 w-32 rounded bg-muted" />
    </div>
    <div class="space-y-3">
      <div class="h-8 w-24 rounded bg-muted" />
      <div class="grid grid-cols-2 gap-3">
        <div class="h-12 rounded-xl bg-muted/50" />
        <div class="h-12 rounded-xl bg-muted/50" />
      </div>
    </div>
  </div>
</template>
