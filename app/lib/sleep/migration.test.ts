import { describe, expect, it } from 'vitest'
import { migrateSleepData, CURRENT_DATA_VERSION } from './migration'

describe('Data Migration', () => {
  it('migrates from version 0 (baseline) to current version', () => {
    const rawSettings = { dailyGoalHours: 8, anchorTime: '05:00' }
    const rawSessions = [{ id: '1', start: '2024-01-01T22:00:00', end: '2024-01-02T06:00:00' }]
    
    const { settings, sessions, version } = migrateSleepData(rawSettings, rawSessions, 0)
    
    expect(version).toBe(CURRENT_DATA_VERSION)
    expect(settings.defaultLatencyMinutes).toBe(15)
    expect(settings.defaultAwakeMinutes).toBe(30)
    expect(sessions[0].createdAt).toBeDefined()
  })

  it('preserves existing settings during migration', () => {
    const rawSettings = { 
      dailyGoalHours: 7, 
      anchorTime: '06:00', 
      defaultLatencyMinutes: 20 
    }
    const { settings } = migrateSleepData(rawSettings, [], 1)
    
    expect(settings.dailyGoalHours).toBe(7)
    expect(settings.defaultLatencyMinutes).toBe(20)
    expect(settings.defaultAwakeMinutes).toBe(30) // Fills in missing
  })

  it('does nothing if data is already at current version', () => {
    const rawSettings = { version: 2, defaultLatencyMinutes: 10 }
    const { settings, version } = migrateSleepData(rawSettings, [], 2)
    
    expect(version).toBe(2)
    expect(settings.defaultLatencyMinutes).toBe(10)
  })
})
