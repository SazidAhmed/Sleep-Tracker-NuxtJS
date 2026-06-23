<script setup lang="ts">
import { ArrowLeft, BookOpen, Play, Plus, BarChart3, Calendar, Compass } from 'lucide-vue-next'

definePageMeta({
  layout: 'mobile',
})

const router = useRouter()

function navigateTo(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <!-- Header -->
    <header class="mb-6 flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        class="size-9 rounded-xl transition-all duration-200 hover:bg-muted active:scale-95"
        aria-label="Go back"
        @click="router.back()"
      >
        <ArrowLeft class="size-5" />
      </Button>
      <div class="flex items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm shadow-primary/5">
          <BookOpen class="size-5" />
        </div>
        <div>
          <h1 class="text-lg font-semibold text-foreground">Sleep Guide</h1>
          <p class="text-xs text-muted-foreground">Quick actions and navigation</p>
        </div>
      </div>
    </header>

    <!-- Info Welcome Card -->
    <div class="relative overflow-hidden mb-6 rounded-3xl border border-border/50 bg-gradient-to-br from-card to-card/90 p-5 shadow-sm">
      <div class="absolute -right-6 -top-6 size-24 rounded-full bg-primary/5 blur-xl" />
      <div class="flex items-start gap-4">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
          <Compass class="size-5" />
        </div>
        <div>
          <h2 class="text-sm font-semibold text-foreground">Quick Action Guide</h2>
          <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
            Welcome to the Sleep Guide. This dashboard provides immediate access to all the vital tracking and logging utilities. Tap on any card below to start tracking or view your sleep patterns.
          </p>
        </div>
      </div>
    </div>

    <!-- Quick Actions List -->
    <div class="space-y-4">
      <h3 class="text-xs font-semibold text-muted-foreground px-1 uppercase tracking-wider">Tracking & Logging</h3>
      
      <div class="grid grid-cols-1 gap-3">
        <!-- Start Timer Card -->
        <button
          class="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 hover:scale-[1.01] active:scale-[0.99]"
          @click="navigateTo('/timer')"
        >
          <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 shadow-inner">
            <Play class="size-5 fill-current" />
          </div>
          <div class="text-left">
            <h4 class="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Start Sleep Timer</h4>
            <p class="text-xs text-muted-foreground mt-0.5">Begin tracking a real-time sleep session as you go to bed.</p>
          </div>
        </button>

        <!-- Log Sleep Card -->
        <button
          class="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-all duration-300 hover:border-emerald-500/30 hover:shadow-md hover:shadow-emerald-500/5 hover:scale-[1.01] active:scale-[0.99]"
          @click="navigateTo('/timer')"
        >
          <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 transition-all duration-300 group-hover:scale-110 shadow-inner">
            <Plus class="size-5" />
          </div>
          <div class="text-left">
            <h4 class="text-sm font-semibold text-foreground group-hover:text-emerald-500 transition-colors">Log Sleep Session</h4>
            <p class="text-xs text-muted-foreground mt-0.5">Manually input a past sleep session that was not timed.</p>
          </div>
        </button>
      </div>

      <h3 class="text-xs font-semibold text-muted-foreground px-1 uppercase tracking-wider pt-2">Analysis & Journals</h3>

      <div class="grid grid-cols-1 gap-3">
        <!-- History Card -->
        <button
          class="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-all duration-300 hover:border-amber-500/30 hover:shadow-md hover:shadow-amber-500/5 hover:scale-[1.01] active:scale-[0.99]"
          @click="navigateTo('/history')"
        >
          <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 transition-all duration-300 group-hover:scale-110 shadow-inner">
            <BarChart3 class="size-5" />
          </div>
          <div class="text-left">
            <h4 class="text-sm font-semibold text-foreground group-hover:text-amber-500 transition-colors">Sleep History</h4>
            <p class="text-xs text-muted-foreground mt-0.5">Analyze sleep habits, quality scores, and statistics.</p>
          </div>
        </button>

        <!-- Calendar Card -->
        <button
          class="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-all duration-300 hover:border-purple-500/30 hover:shadow-md hover:shadow-purple-500/5 hover:scale-[1.01] active:scale-[0.99]"
          @click="navigateTo('/calendar')"
        >
          <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 dark:text-purple-400 transition-all duration-300 group-hover:scale-110 shadow-inner">
            <Calendar class="size-5" />
          </div>
          <div class="text-left">
            <h4 class="text-sm font-semibold text-foreground group-hover:text-purple-500 transition-colors">Sleep Calendar</h4>
            <p class="text-xs text-muted-foreground mt-0.5">Explore monthly sleep trends and day-to-day consistency.</p>
          </div>
        </button>

        <!-- Dream Journal Card -->
        <button
          class="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-md hover:shadow-indigo-500/5 hover:scale-[1.01] active:scale-[0.99]"
          @click="navigateTo('/journal')"
        >
          <div class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 transition-all duration-300 group-hover:scale-110 shadow-inner">
            <BookOpen class="size-5" />
          </div>
          <div class="text-left">
            <h4 class="text-sm font-semibold text-foreground group-hover:text-indigo-500 transition-colors">Dream Journal</h4>
            <p class="text-xs text-muted-foreground mt-0.5">Record and search dreams, nightmares, or general sleep logs.</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
