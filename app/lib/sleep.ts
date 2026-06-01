/**
 * @deprecated This file now acts as a compatibility shim.
 * The implementation has been split into focused modules under `./sleep/`:
 *
 *   ./sleep/types.ts     — Interfaces and type definitions
 *   ./sleep/format.ts    — Date/time/duration formatting helpers
 *   ./sleep/summary.ts   — Day, week, month aggregation logic
 *   ./sleep/analytics.ts — Advanced sleep analytics
 *   ./sleep/alarm.ts     — Smart alarm, wake times, CSV export
 *
 * All existing imports of '@/lib/sleep' continue to work unchanged via this shim.
 * Prefer importing from the specific sub-module in new code.
 */
export * from './sleep/index'
