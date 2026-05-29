<script setup lang="ts">
import { Timer, Sun, BarChart3, Calendar, MoreHorizontal, Moon, SunMedium, Flame, Sparkles } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const colorMode = useColorMode()

const tabs = [
  { name: 'Timer', path: '/timer', icon: Timer },
  { name: 'Today', path: '/', icon: Sun },
  { name: 'History', path: '/history', icon: BarChart3 },
  { name: 'Heat', path: '/heatmap', icon: Flame },
  { name: 'Tips', path: '/recommendations', icon: Sparkles },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'More', path: '/more', icon: MoreHorizontal },
]

// Track tab index for directional slide transitions
const tabPaths = tabs.map(t => t.path)
const previousTabIndex = ref(tabPaths.indexOf(route.path))
const transitionName = ref('page-slide-left')

const activeTab = computed(() => {
  const currentPath = route.path
  return tabs.find(tab => tab.path === currentPath)?.name ?? 'Today'
})

const isDark = computed(() => colorMode.value === 'dark')

function toggleDark() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

function navigateTo(path: string) {
  const nextIndex = tabPaths.indexOf(path)
  const currentIndex = tabPaths.indexOf(route.path)
  // Determine slide direction based on tab position
  transitionName.value = nextIndex >= currentIndex ? 'page-slide-left' : 'page-slide-right'
  previousTabIndex.value = nextIndex
  router.push(path)
}

useSeoMeta({
  title: 'Sleep Tracker',
  description: 'Track split sleep sessions, daily goals, and recovery progress.',
})
</script>

<template>
  <div class="min-h-screen bg-background pb-20">
    <!-- Main Content with page transition -->
    <main class="mx-auto w-full max-w-md">
      <Transition :name="transitionName" mode="out-in">
        <slot :key="route.path" />
      </Transition>
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
          <ClientOnly>
            <div class="flex size-8 items-center justify-center rounded-xl">
              <Moon v-if="!isDark" class="size-5" />
              <SunMedium v-else class="size-5" />
            </div>
            <span class="text-[10px] font-medium">{{ isDark ? 'Light' : 'Dark' }}</span>
            <template #fallback>
              <div class="flex size-8 items-center justify-center rounded-xl">
                <Moon class="size-5" />
              </div>
              <span class="text-[10px] font-medium">Dark</span>
            </template>
          </ClientOnly>
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

/* ── Page Slide Transitions ─────────────────────────────── */
.page-slide-left-enter-active,
.page-slide-left-leave-active,
.page-slide-right-enter-active,
.page-slide-right-leave-active {
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Slide left: next tab is to the right */
.page-slide-left-enter-from {
  opacity: 0;
  transform: translateX(24px);
}
.page-slide-left-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

/* Slide right: next tab is to the left */
.page-slide-right-enter-from {
  opacity: 0;
  transform: translateX(-24px);
}
.page-slide-right-leave-to {
  opacity: 0;
  transform: translateX(24px);
}
</style>
