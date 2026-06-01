<script setup lang="ts">
import { BookOpen, FileText, HeartPulse, Cloud, Settings, Moon, SunMedium, Flame, Sparkles } from 'lucide-vue-next'
import { ref, computed } from 'vue'
import MoreMenuCard from '@/components/more/MoreMenuCard.vue'
import SessionLog from '@/components/more/SessionLog.vue'
import SettingsView from '@/components/more/SettingsView.vue'

definePageMeta({
  layout: 'mobile',
})

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
function toggleDark() { colorMode.preference = isDark.value ? 'light' : 'dark' }

const activeSection = ref<'sessions' | 'settings' | null>(null)
</script>

<template>
  <div class="p-4 pb-24">
    <div v-if="!activeSection" class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold tracking-tight">More</h1>
        <button
          class="flex size-10 items-center justify-center rounded-xl bg-card border border-border/60 text-muted-foreground shadow-sm transition-all hover:bg-accent"
          @click="toggleDark"
        >
          <component :is="isDark ? Moon : SunMedium" class="size-5" />
        </button>
      </div>

      <!-- Quick Actions Grid -->
      <div class="grid grid-cols-2 gap-3">
        <MoreMenuCard
          title="Session Log"
          description="View and edit history"
          :icon="FileText"
          class="bg-blue-500/5 border-blue-500/20"
          @click="activeSection = 'sessions'"
        />
        <MoreMenuCard
          title="Settings"
          description="App preferences"
          :icon="Settings"
          class="bg-purple-500/5 border-purple-500/20"
          @click="activeSection = 'settings'"
        />
      </div>

      <!-- Features Section -->
      <div class="space-y-3">
        <h2 class="text-sm font-semibold text-muted-foreground px-1 uppercase tracking-wider">Features</h2>
        <div class="grid grid-cols-1 gap-3">
          <MoreMenuCard
            title="Insights & Tips"
            description="Personalized sleep advice"
            :icon="Sparkles"
            @click="$router.push('/recommendations')"
          />
          <MoreMenuCard
            title="Sleep Quality Report"
            description="Weekly performance analysis"
            :icon="Flame"
            @click="$router.push('/report')"
          />
          <MoreMenuCard
            title="Health Integration"
            description="Sync with Apple/Google"
            :icon="HeartPulse"
            @click="activeSection = 'settings'"
          />
        </div>
      </div>

      <!-- Resources Section -->
      <div class="space-y-3">
        <h2 class="text-sm font-semibold text-muted-foreground px-1 uppercase tracking-wider">Resources</h2>
        <div class="grid grid-cols-2 gap-3">
          <MoreMenuCard
            title="Sleep Guide"
            description="Learn the science"
            :icon="BookOpen"
            @click="$router.push('/guide')"
          />
          <MoreMenuCard
            title="Cloud Sync"
            description="Backup your data"
            :icon="Cloud"
            @click="activeSection = 'settings'"
          />
        </div>
      </div>
    </div>

    <!-- Sub-sections -->
    <div v-else class="space-y-4">
      <SessionLog v-if="activeSection === 'sessions'" @back="activeSection = null" />
      <SettingsView v-if="activeSection === 'settings'" @back="activeSection = null" />
    </div>
  </div>
</template>
