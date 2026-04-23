<script setup lang="ts">
import { Timer, Sun, BarChart3, Calendar, MoreHorizontal, Moon, SunMedium } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const colorMode = useColorMode()

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

const isDark = computed(() => colorMode.value === 'dark')

function toggleDark() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

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
      <div class="mx-auto flex h-16 w-full max-w-md items-center justify-around px-1">
        <button
          v-for="tab in tabs"
          :key="tab.path"
          class="flex flex-col items-center justify-center gap-0.5 px-2 py-2 transition-all duration-200"
          :class="activeTab === tab.name
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'"
          @click="navigateTo(tab.path)"
        >
          <div
            class="flex size-8 items-center justify-center rounded-xl transition-all duration-200"
            :class="activeTab === tab.name ? 'bg-primary/12' : ''"
          >
            <component :is="tab.icon" class="size-5" />
          </div>
          <span
            class="text-[10px] font-medium transition-all duration-200"
            :class="activeTab === tab.name ? 'font-semibold' : ''"
          >
            {{ tab.name }}
          </span>
        </button>

        <!-- Dark Mode Toggle -->
        <button
          class="flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-muted-foreground transition-all duration-200 hover:text-foreground"
          @click="toggleDark"
        >
          <div class="flex size-8 items-center justify-center rounded-xl">
            <Moon v-if="!isDark" class="size-5" />
            <SunMedium v-else class="size-5" />
          </div>
          <span class="text-[10px] font-medium">{{ isDark ? 'Light' : 'Dark' }}</span>
        </button>
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
