<script setup lang="ts">
import { Timer, Sun, BarChart3, Calendar, MoreHorizontal } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'Timer', path: '/timer', icon: Timer },
  { name: 'Today', path: '/', icon: Sun },
  { name: 'History', path: '/history', icon: BarChart3 },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'More', path: '/more', icon: MoreHorizontal },
]

const activeTab = computed(() => {
  const currentPath = route.path
  return tabs.find(tab => tab.path === currentPath)?.name ?? 'Today'
})

function navigateTo(path: string) {
  router.push(path)
}

useSeoMeta({
  title: 'Sleep Tracker',
  description: 'Track split sleep sessions, daily goals, and recovery progress.',
})
</script>

<template>
  <div class="min-h-screen bg-background pb-20">
    <!-- Main Content -->
    <main class="mx-auto w-full max-w-md">
      <slot />
    </main>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-md">
      <div class="mx-auto flex h-16 w-full max-w-md items-center justify-around px-2">
        <button
          v-for="tab in tabs"
          :key="tab.path"
          class="flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors"
          :class="activeTab === tab.name ? 'text-primary' : 'text-muted-foreground'"
          @click="navigateTo(tab.path)"
        >
          <component :is="tab.icon" class="size-5" />
          <span class="text-[10px] font-medium">
            {{ tab.name }}
          </span>
        </button>
      </div>
      <!-- Safe area padding for notched devices -->
      <div class="h-safe-area-inset-bottom bg-background" />
    </nav>
  </div>
</template>

<style>
.h-safe-area-inset-bottom {
  height: env(safe-area-inset-bottom, 0px);
}
</style>
