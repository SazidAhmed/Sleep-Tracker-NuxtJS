import { useLocalStorage, createGlobalState } from '@vueuse/core'
import { ref, computed } from 'vue'
import type { SleepSettings } from '@/lib/sleep'

const DEFAULT_SETTINGS: SleepSettings = {
  dailyGoalHours: 8,
  weekdayGoalHours: 7.5,
  weekendGoalHours: 8.5,
  useSplitGoals: false,
  anchorTime: '05:00',
  defaultLatencyMinutes: 15,
  defaultAwakeMinutes: 30,
}

function _useSleepSettings() {
  const settings = useLocalStorage<SleepSettings>('sleep-tracker-settings', DEFAULT_SETTINGS)

  function getGoalHoursForDate(dateStr: string): number {
    if (settings.value.useSplitGoals && settings.value.weekdayGoalHours !== undefined && settings.value.weekendGoalHours !== undefined) {
      const d = new Date(`${dateStr}T00:00:00`)
      const day = d.getDay()
      const isWeekend = day === 0 || day === 6
      return isWeekend ? settings.value.weekendGoalHours : settings.value.weekdayGoalHours
    }
    return settings.value.dailyGoalHours
  }

  return {
    settings,
    getGoalHoursForDate,
  }
}

export const useSleepSettings = createGlobalState(_useSleepSettings)