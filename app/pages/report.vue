<script setup lang="ts">
import { ArrowLeft, CalendarRange, Download, FileText, Flame, Printer, Star, Target, TrendingUp } from 'lucide-vue-next'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { addDays, getQualityEmoji, getQualityLabel, summarizeSleepDay } from '@/lib/sleep'
import { useSleepData } from '@/composables/useSleepData'

definePageMeta({
  layout: 'mobile',
})

const router = useRouter()
const period = ref<'week' | 'month'>('week')

const {
  sessions,
  todayKey,
  currentStreak,
  sleepScore,
  regularityIndex,
  sleepDebt,
  socialJetlag,
  getGoalHoursForDate,
  formatDurationFromMinutes,
  formatDateLabel,
} = useSleepData()

const periodDays = computed(() => period.value === 'week' ? 7 : 30)
const periodLabel = computed(() => period.value === 'week' ? '7-Day Report' : '30-Day Report')

const reportDays = computed(() =>
  Array.from({ length: periodDays.value }, (_, index) => {
    const date = addDays(todayKey.value, index - periodDays.value + 1)
    return summarizeSleepDay(date, sessions.value, getGoalHoursForDate(date))
  }),
)

const reportSessions = computed(() => {
  const startDate = reportDays.value[0]?.date ?? todayKey.value
  return sessions.value.filter((session) => {
    const date = session.start.slice(0, 10)
    return date >= startDate && date <= todayKey.value
  })
})

const averageQuality = computed(() => {
  const rated = reportSessions.value.filter(session => session.quality)
  if (!rated.length) return null
  const average = rated.reduce((sum, session) => sum + (session.quality ?? 0), 0) / rated.length
  const rounded = Math.round(average)
  return {
    score: average.toFixed(1),
    emoji: getQualityEmoji(rounded),
    label: getQualityLabel(rounded),
  }
})

const report = computed(() => {
  const days = reportDays.value
  const trackedDays = days.filter(day => day.minutes > 0)
  const goalsMet = days.filter(day => day.remainingMinutes === 0 && day.goalMinutes > 0)
  const totalMinutes = days.reduce((sum, day) => sum + day.minutes, 0)
  const totalGoalMinutes = days.reduce((sum, day) => sum + day.goalMinutes, 0)
  const bestDay = trackedDays.reduce((best, day) => !best || day.minutes > best.minutes ? day : best, trackedDays[0])
  const averageMinutes = Math.round(totalMinutes / days.length)
  const completionRate = totalGoalMinutes ? Math.round((totalMinutes / totalGoalMinutes) * 100) : 0

  return {
    days,
    totalMinutes,
    averageMinutes,
    goalsMet: goalsMet.length,
    trackedDays: trackedDays.length,
    completionRate: Math.min(completionRate, 999),
    bestDay,
  }
})

const reportRef = ref<HTMLDivElement | null>(null)

const reportRange = computed(() => {
  const first = reportDays.value[0]?.date
  const last = reportDays.value[reportDays.value.length - 1]?.date
  if (!first || !last) return ''
  return `${formatDateLabel(first)} - ${formatDateLabel(last)}`
})

function exportReport() {
  const lines = [
    `Sleep Tracker ${periodLabel.value}`,
    reportRange.value,
    '',
    `Total sleep: ${formatDurationFromMinutes(report.value.totalMinutes)}`,
    `Daily average: ${formatDurationFromMinutes(report.value.averageMinutes)}`,
    `Goals met: ${report.value.goalsMet}/${periodDays.value}`,
    `Current streak: ${currentStreak.value} day${currentStreak.value === 1 ? '' : 's'}`,
    `Sleep score: ${sleepScore.value.score}/100 (${sleepScore.value.grade})`,
    `Regularity index: ${regularityIndex.value}/100`,
    averageQuality.value ? `Average quality: ${averageQuality.value.score}/5 (${averageQuality.value.label})` : 'Average quality: Not rated',
    `Sleep debt: ${formatDurationFromMinutes(sleepDebt.value.totalDebtMinutes)}`,
    `Social jetlag: ${formatDurationFromMinutes(socialJetlag.value.differenceMinutes)}`,
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `sleep-report-${period.value}-${todayKey.value}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

async function downloadReportPdf() {
  if (!reportRef.value) return
  await nextTick()
  const canvas = await html2canvas(reportRef.value, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })

  const pdf = new jsPDF('portrait', 'pt', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const imgWidth = pageWidth - margin * 2
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const totalPages = Math.ceil(imgHeight / (pageHeight - margin * 2))

  for (let page = 0; page < totalPages; page += 1) {
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = Math.min(canvas.height - page * (pageHeight - margin * 2) * (canvas.width / imgWidth), canvas.height)
    const ctx = pageCanvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
    ctx.drawImage(
      canvas,
      0,
      page * (pageHeight - margin * 2) * (canvas.width / imgWidth),
      canvas.width,
      pageCanvas.height,
      0,
      0,
      pageCanvas.width,
      pageCanvas.height,
    )

    const pageData = pageCanvas.toDataURL('image/png')
    const pageImgHeight = (pageCanvas.height * imgWidth) / pageCanvas.width

    if (page > 0) pdf.addPage()
    pdf.addImage(pageData, 'PNG', margin, margin, imgWidth, pageImgHeight)
  }

  pdf.save(`sleep-report-${period.value}-${todayKey.value}.pdf`)
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="min-h-screen p-4 pb-24">
    <header class="mb-5 flex items-center gap-3 print:hidden">
      <Button variant="ghost" size="icon" aria-label="Back to more" @click="router.push('/more')">
        <ArrowLeft class="size-5" />
      </Button>
      <div class="flex min-w-0 flex-1 items-center gap-2">
        <div class="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <FileText class="size-5" />
        </div>
        <div class="min-w-0">
          <h1 class="truncate text-lg font-semibold">Sleep Report</h1>
          <p class="truncate text-xs text-muted-foreground">{{ reportRange }}</p>
        </div>
      </div>
    </header>

    <div class="mb-4 grid grid-cols-2 gap-2 print:hidden">
      <Button
        v-for="option in [
          { value: 'week', label: '7 Days' },
          { value: 'month', label: '30 Days' },
        ]"
        :key="option.value"
        variant="outline"
        class="rounded-xl"
        :class="period === option.value ? '!bg-primary !text-primary-foreground border-primary' : ''"
        @click="period = option.value as 'week' | 'month'"
      >
        {{ option.label }}
      </Button>
    </div>

    <div ref="reportRef">
      <section class="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-5 flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase text-muted-foreground">{{ periodLabel }}</p>
          <h2 class="mt-1 text-3xl font-bold">{{ formatDurationFromMinutes(report.totalMinutes) }}</h2>
          <p class="text-sm text-muted-foreground">Total sleep</p>
        </div>
        <div class="rounded-2xl bg-primary/10 px-3 py-2 text-right text-primary">
          <p class="text-2xl font-bold">{{ report.completionRate }}%</p>
          <p class="text-[10px] font-medium uppercase">Goal pace</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl bg-secondary/30 p-3">
          <CalendarRange class="mb-2 size-4 text-primary" />
          <p class="text-lg font-semibold">{{ formatDurationFromMinutes(report.averageMinutes) }}</p>
          <p class="text-xs text-muted-foreground">Daily average</p>
        </div>
        <div class="rounded-2xl bg-secondary/30 p-3">
          <Target class="mb-2 size-4 text-primary" />
          <p class="text-lg font-semibold">{{ report.goalsMet }}/{{ periodDays }}</p>
          <p class="text-xs text-muted-foreground">Goals met</p>
        </div>
        <div class="rounded-2xl bg-secondary/30 p-3">
          <Flame class="mb-2 size-4 text-orange-500" />
          <p class="text-lg font-semibold">{{ currentStreak }}</p>
          <p class="text-xs text-muted-foreground">Current streak</p>
        </div>
        <div class="rounded-2xl bg-secondary/30 p-3">
          <Star class="mb-2 size-4 text-violet-500" />
          <p class="text-lg font-semibold">
            {{ averageQuality ? `${averageQuality.score}/5` : '-' }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ averageQuality ? averageQuality.label : 'No ratings' }}
          </p>
        </div>
      </div>
    </section>

    <section class="mt-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="mb-4 flex items-center gap-2">
        <TrendingUp class="size-5 text-primary" />
        <h2 class="font-semibold">Health Snapshot</h2>
      </div>
      <div class="space-y-3">
        <div class="flex items-center justify-between rounded-2xl bg-secondary/25 p-3">
          <span class="text-sm text-muted-foreground">Sleep score</span>
          <span class="font-semibold">{{ sleepScore.score }}/100 {{ sleepScore.grade }}</span>
        </div>
        <div class="flex items-center justify-between rounded-2xl bg-secondary/25 p-3">
          <span class="text-sm text-muted-foreground">Regularity</span>
          <span class="font-semibold">{{ regularityIndex }}/100</span>
        </div>
        <div class="flex items-center justify-between rounded-2xl bg-secondary/25 p-3">
          <span class="text-sm text-muted-foreground">Sleep debt</span>
          <span class="font-semibold">{{ formatDurationFromMinutes(sleepDebt.totalDebtMinutes) }}</span>
        </div>
        <div class="flex items-center justify-between rounded-2xl bg-secondary/25 p-3">
          <span class="text-sm text-muted-foreground">Social jetlag</span>
          <span class="font-semibold">{{ formatDurationFromMinutes(socialJetlag.differenceMinutes) }}</span>
        </div>
      </div>
    </section>

    <section class="mt-4 rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 font-semibold">Daily Breakdown</h2>
      <div class="space-y-2">
        <div
          v-for="day in report.days"
          :key="day.date"
          class="flex items-center gap-3 rounded-2xl bg-secondary/20 p-3"
        >
          <div class="w-16 shrink-0">
            <p class="text-xs font-medium">{{ formatDateLabel(day.date).split(',')[0] }}</p>
            <p class="text-[10px] text-muted-foreground">{{ day.date.slice(5) }}</p>
          </div>
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full transition-all"
              :class="day.remainingMinutes === 0 && day.goalMinutes > 0 ? 'bg-primary' : 'bg-orange-400'"
              :style="{ width: `${Math.min(day.percentage, 100)}%` }"
            />
          </div>
          <p class="w-16 text-right text-xs font-semibold">{{ formatDurationFromMinutes(day.minutes) }}</p>
        </div>
      </div>
    </section>
    </div>

    <div class="mt-4 grid grid-cols-3 gap-2 print:hidden">
      <Button variant="outline" class="rounded-xl" @click="printReport">
        <Printer class="mr-2 size-4" />
        Print
      </Button>
      <Button variant="outline" class="rounded-xl" @click="downloadReportPdf">
        <Download class="mr-2 size-4" />
        Download PDF
      </Button>
      <Button class="rounded-xl" @click="exportReport">
        <FileText class="mr-2 size-4" />
        Export Text
      </Button>
    </div>
  </div>
</template>
