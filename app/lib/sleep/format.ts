/**
 * sleep/format.ts — Display formatting helpers (pure, no side effects)
 * Converts dates, durations, and times into human-readable strings.
 */

import type { SleepSession } from './types'

const MINUTE_MS = 60 * 1000

// ─── Duration & Time ────────────────────────────────────────────────────────

export function formatDurationFromMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  if (!hours) return `${minutes}m`
  if (!minutes) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function formatDateLabel(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

export function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatDateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatTimeLabel(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

/** Format minutes-from-midnight → "10:30 PM" */
export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`
}

// ─── Date Keys ──────────────────────────────────────────────────────────────

export function getDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: string, offset: number): string {
  const next = new Date(`${date}T00:00:00`)
  next.setDate(next.getDate() + offset)
  return getDateKey(next)
}

export function shiftMonth(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

export function toDateTimeLocalValue(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const mins = `${date.getMinutes()}`.padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${mins}`
}

// ─── Quality Labels ──────────────────────────────────────────────────────────

export function getQualityEmoji(quality?: number): string {
  if (!quality) return '○'
  const emojis = ['😫', '😕', '😐', '😊', '😴']
  return emojis[quality - 1] ?? '○'
}

export function getQualityLabel(quality?: number): string {
  if (!quality) return 'Not rated'
  const labels = ['Poor', 'Fair', 'Average', 'Good', 'Excellent']
  return labels[quality - 1] ?? 'Not rated'
}

// ─── Session Helpers ─────────────────────────────────────────────────────────

export function getSessionDurationMinutes(session: SleepSession): number {
  const start = new Date(session.start).getTime()
  const end = new Date(session.end).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0

  return Math.round((end - start) / MINUTE_MS)
}

export function isSessionValid(session: SleepSession): boolean {
  return getSessionDurationMinutes(session) > 0
}
