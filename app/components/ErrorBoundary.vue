<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { AlertCircle, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const error = ref<any>(null)

onErrorCaptured((err, instance, info) => {
  error.value = err
  console.error('ErrorBoundary captured error:', err, info)
  // Returning false prevents the error from propagating further up
  return false
})

function handleReset() {
  error.value = null
  // Optionally reload the page or navigate home
}
</script>

<template>
  <div v-if="error" class="flex flex-col items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 p-8 text-center">
    <div class="mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <AlertCircle class="size-8" />
    </div>
    <h3 class="mb-2 text-lg font-bold">Something went wrong</h3>
    <p class="mb-6 text-sm text-muted-foreground leading-relaxed">
      This component failed to load correctly. We've logged the error.
    </p>
    <Button variant="outline" class="rounded-xl" @click="handleReset">
      <RefreshCw class="mr-2 size-4" /> Try Again
    </Button>
  </div>
  <slot v-else />
</template>
