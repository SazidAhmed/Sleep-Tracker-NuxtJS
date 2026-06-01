<script setup lang="ts">
import { Timer, Sun, BarChart3, Calendar, MoreHorizontal } from 'lucide-vue-next'

const route = useRoute()

// 5 core tabs — Heat Map, Tips, and Dark Mode moved to the More page (MD3: max 5 tabs)
const tabs = [
  { name: 'Timer', path: '/timer', icon: Timer },
  { name: 'Today', path: '/today', aliases: ['/'], icon: Sun },
  { name: 'History', path: '/history', icon: BarChart3 },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'More', path: '/more', icon: MoreHorizontal },
]

// Track tab index for directional slide transitions
const tabPaths = tabs.map(t => t.path)

const activeTab = computed(() => {
  const currentPath = route.path
  return tabs.find(tab => tab.path === currentPath || tab.aliases?.includes(currentPath))?.name ?? 'Today'
})

useSeoMeta({
  title: 'Sleep Tracker',
  description: 'Track split sleep sessions, daily goals, and recovery progress.',
})
</script>

<template>
  <div class="min-h-screen bg-background pb-20">
    <!-- Main Content (Instant) -->
    <main class="mx-auto w-full max-w-md">
      <div :key="route.fullPath">
        <slot />
      </div>
    </main>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-md">
      <div class="mx-auto flex h-16 w-full max-w-md items-center justify-around px-1">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.path"
          :to="tab.path"
          class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2"
          :class="activeTab === tab.name ? 'text-primary' : 'text-muted-foreground hover:text-foreground'"
        >
          <div 
            class="flex size-8 items-center justify-center rounded-xl"
            :class="activeTab === tab.name ? 'bg-primary/10' : ''"
          >
            <component :is="tab.icon" class="size-5" />
          </div>
          <span
            class="text-[10px] font-medium"
            :class="activeTab === tab.name ? 'font-semibold tracking-tight' : ''"
          >
            {{ tab.name }}
          </span>
        </NuxtLink>
      </div>
      <!-- Safe area padding for notched devices -->
      <div class="h-safe-area-inset-bottom bg-background" />
    </nav>
  </div>
</template>

<style>
.h-safe-area-inset-bottom {
  height: 16px;
}

@supports (height: env(safe-area-inset-bottom)) {
  .h-safe-area-inset-bottom {
    height: env(safe-area-inset-bottom, 16px);
  }
}
</style>
