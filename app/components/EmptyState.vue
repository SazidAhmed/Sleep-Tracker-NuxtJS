<script setup lang="ts">
import { Moon, Clock, Calendar, BarChart3, Sparkles } from 'lucide-vue-next'

interface Props {
  icon: 'moon' | 'clock' | 'calendar' | 'chart' | 'sparkles'
  title: string
  description: string
  actionLabel?: string
  actionPath?: string
}

const props = defineProps<Props>()

const iconMap = {
  moon: Moon,
  clock: Clock,
  calendar: Calendar,
  chart: BarChart3,
  sparkles: Sparkles,
}

const iconComponent = computed(() => iconMap[props.icon])
</script>

<template>
  <div class="flex flex-col items-center justify-center rounded-3xl border border-border/60 bg-card p-8 text-center shadow-sm">
    <div class="mb-4 flex size-20 items-center justify-center rounded-full bg-primary/10">
      <component :is="iconComponent" class="size-10 text-primary/60" />
    </div>
    <h3 class="mb-2 text-lg font-semibold">
      {{ title }}
    </h3>
    <p class="mb-6 max-w-xs text-sm text-muted-foreground leading-relaxed">
      {{ description }}
    </p>
    <NuxtLink v-if="actionLabel && actionPath" :to="actionPath">
      <Button class="rounded-xl">
        {{ actionLabel }}
      </Button>
    </NuxtLink>
  </div>
</template>
