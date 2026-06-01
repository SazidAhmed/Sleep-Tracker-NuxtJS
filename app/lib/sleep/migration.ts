import type { SleepSession, SleepSettings } from './types'

export const CURRENT_DATA_VERSION = 2

export interface MigratedData {
  settings: SleepSettings
  sessions: SleepSession[]
  version: number
}

/**
 * Migration pipeline for sleep data.
 * Transforms data from older versions to the current schema.
 */
export function migrateSleepData(
  rawSettings: any,
  rawSessions: any[],
  dataVersion = 0
): MigratedData {
  let settings = { ...rawSettings }
  let sessions = [...rawSessions]
  let version = dataVersion

  // Version 0 or 1 -> 2: Add efficiency defaults
  if (version < 2) {
    if (settings.defaultLatencyMinutes === undefined) {
      settings.defaultLatencyMinutes = 15
    }
    if (settings.defaultAwakeMinutes === undefined) {
      settings.defaultAwakeMinutes = 30
    }
    
    // Ensure all sessions have a createdAt (baseline for v1)
    sessions = sessions.map(s => ({
      ...s,
      createdAt: s.createdAt || s.start || new Date().toISOString()
    }))
    
    version = 2
  }

  // Add future migrations here:
  // if (version < 3) { ... }

  return { settings, sessions, version }
}
