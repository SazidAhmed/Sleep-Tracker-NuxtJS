<script setup lang="ts">
import { computed } from "vue";
import { Sparkles } from "lucide-vue-next";
import { useSleepData } from "@/composables/useSleepData";
import {
  buildRecentHistory,
  getQualityEmoji,
  getQualityLabel,
  addDays,
} from "@/lib/sleep";

const { sessions, settings, todayKey } = useSleepData();

const thirtyDayHistory = computed(() =>
  buildRecentHistory(
    todayKey.value,
    sessions.value,
    settings.value.dailyGoalHours,
    30,
  ),
);

// Duration Trend
const trendChart = computed(() => {
  const data = thirtyDayHistory.value;
  const goalMinutes = settings.value.dailyGoalHours * 60;
  const maxMinutes = Math.max(...data.map((d) => d.minutes), goalMinutes, 60);
  const W = 320,
    H = 100,
    pad = 4;
  const points = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: H - pad - (d.minutes / maxMinutes) * (H - pad * 2),
    met: d.remainingMinutes === 0 && d.goalMinutes > 0,
  }));
  return {
    linePoints: points.map((p) => `${p.x},${p.y}`).join(" "),
    areaPoints: [
      `${points[0]!.x},${H - pad}`,
      ...points.map((p) => `${p.x},${p.y}`),
      `${points[points.length - 1]!.x},${H - pad}`,
    ].join(" "),
    goalY: H - pad - (goalMinutes / maxMinutes) * (H - pad * 2),
    points,
    W,
    H,
  };
});

// Quality Trend
const average30DayQuality = computed(() => {
  const rated = sessions.value.filter(
    (s) => s.start.slice(0, 10) >= addDays(todayKey.value, -30) && s.quality,
  );
  if (!rated.length) return null;
  const avg =
    rated.reduce((sum, s) => sum + (s.quality || 0), 0) / rated.length;
  return {
    score: avg.toFixed(1),
    emoji: getQualityEmoji(Math.round(avg)),
    label: getQualityLabel(Math.round(avg)),
  };
});

const qualityTrendChart = computed(() => {
  const data = thirtyDayHistory.value;
  const W = 320,
    H = 100,
    pad = 8;
  const pts = data
    .map((d, i) => {
      const rated = d.sessions.filter((s) => s.quality);
      const avg = rated.length
        ? rated.reduce((sum, s) => sum + (s.quality || 0), 0) / rated.length
        : null;
      return { x: pad + (i / (data.length - 1)) * (W - pad * 2), quality: avg };
    })
    .filter((p) => p.quality !== null) as any[];

  if (!pts.length) return { hasData: false };
  const mapped = pts.map((p) => ({
    x: p.x,
    y: H - pad - ((p.quality - 1) / 4) * (H - pad * 2),
  }));
  return {
    linePoints: mapped.map((p) => `${p.x},${p.y}`).join(" "),
    areaPoints: [
      `${mapped[0]!.x},${H - pad}`,
      ...mapped.map((p) => `${p.x},${p.y}`),
      `${mapped[mapped.length - 1]!.x},${H - pad}`,
    ].join(" "),
    points: mapped,
    hasData: true,
    W,
    H,
  };
});
</script>

<template>
  <div class="space-y-6">
    <!-- Duration Trend -->
    <div class="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-1 text-sm font-medium text-muted-foreground">
        30-Day Duration Trend
      </h2>
      <p class="mb-3 text-xs text-muted-foreground/60">
        Dashed line = daily goal
      </p>
      <svg
        :viewBox="`0 0 ${trendChart.W} ${trendChart.H}`"
        class="w-full h-[100px]"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.25" />
            <stop
              offset="100%"
              stop-color="var(--primary)"
              stop-opacity="0.02"
            />
          </linearGradient>
        </defs>
        <polygon :points="trendChart.areaPoints" fill="url(#trendGradient)" />
        <polyline
          :points="trendChart.linePoints"
          fill="none"
          stroke="var(--primary)"
          stroke-width="2"
        />
        <line
          :x1="4"
          :y1="trendChart.goalY"
          :x2="trendChart.W - 4"
          :y2="trendChart.goalY"
          stroke="var(--muted-foreground)"
          stroke-dasharray="4 3"
          opacity="0.5"
        />
        <circle
          v-for="(pt, i) in trendChart.points"
          :key="i"
          :cx="pt.x"
          :cy="pt.y"
          r="2.5"
          :fill="pt.met ? 'var(--primary)' : 'var(--muted-foreground)'"
          opacity="0.7"
        />
      </svg>
      <div class="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>30 days ago</span><span>Today</span>
      </div>
    </div>

    <!-- Quality Trend -->
    <div class="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h2
            class="text-sm font-medium text-muted-foreground flex items-center gap-1.5"
          >
            <Sparkles class="size-4 text-violet-500" />30-Day Quality Trend
          </h2>
          <p class="text-xs text-muted-foreground/60">
            Average daily rating (1–5)
          </p>
        </div>
        <div v-if="average30DayQuality" class="text-right">
          <div
            class="flex items-center justify-end gap-1 text-lg font-bold text-violet-500"
          >
            <span>{{ average30DayQuality.score }}</span
            ><span class="text-xs text-muted-foreground">/5</span>
          </div>
          <p class="text-[10px] text-muted-foreground font-medium">
            {{ average30DayQuality.label }}
          </p>
        </div>
      </div>
      <template v-if="qualityTrendChart.hasData">
        <svg
          :viewBox="`0 0 ${qualityTrendChart.W} ${qualityTrendChart.H}`"
          class="w-full h-[100px]"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stop-color="rgb(139, 92, 246)"
                stop-opacity="0.25"
              />
              <stop
                offset="100%"
                stop-color="rgb(139, 92, 246)"
                stop-opacity="0.02"
              />
            </linearGradient>
          </defs>
          <polygon
            :points="qualityTrendChart.areaPoints"
            fill="url(#qualityGradient)"
          />
          <polyline
            :points="qualityTrendChart.linePoints"
            fill="none"
            stroke="rgb(139, 92, 246)"
            stroke-width="2"
          />
          <circle
            v-for="(pt, i) in qualityTrendChart.points"
            :key="i"
            :cx="pt.x"
            :cy="pt.y"
            r="3"
            fill="rgb(139, 92, 246)"
            stroke="var(--card)"
            stroke-width="1.5"
          />
        </svg>
        <div
          class="mt-2 flex justify-between text-[10px] text-muted-foreground"
        >
          <span>30 days ago</span><span>Today</span>
        </div>
      </template>
      <div v-else class="py-8 text-center text-xs text-muted-foreground">
        No quality ratings yet
      </div>
    </div>
  </div>
</template>
