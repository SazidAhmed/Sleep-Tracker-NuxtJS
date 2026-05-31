# Sleep Tracker - Remaining Improvements

Status checked on 2026-05-30.

## Completed Since Original Roadmap

- #10 Weekly / Monthly Report Page: implemented in `app/pages/report.vue`, linked from `app/pages/more.vue`.
- #11 Apple Health / Google Fit Integration Stub: implemented in `app/pages/more.vue` as a stored preference plus CSV/JSON health export action.
- #12 Persistent recommendation dismissal: already implemented in `app/pages/recommendations.vue`.
- #13 Custom tags: already implemented in `app/composables/useSleepData.ts` and `app/pages/more.vue`.
- #14 Split weekday/weekend goals: already implemented in settings and composable goal resolution.
- #15 Sleep score: already implemented in `app/lib/sleep.ts`, `app/composables/useSleepData.ts`, and `app/pages/index.vue`.
- #24 Reminder deduplication: already implemented with per-reminder last-fired keys.
- #32 Quality trend chart: already implemented in `app/pages/history.vue`.
- #33 Sleep Regularity Index: already implemented in `app/lib/sleep.ts` and `app/pages/history.vue`.
- #35 Data migration/versioning: import now normalizes versioned backup settings and preserves newer goal fields when present.
- #36 Conflict-free import merge strategy: import now supports Merge and Replace modes, deduplicating by session ID or matching start/end times.

## Still Open

- #18 Cloud sync: intentionally out of scope until an account/backend architecture is chosen.
- #19-#22 Component/composable extraction: useful, but should be done as a separate refactor with regression checks.
- #27 Virtualize long session lists: useful once real session volume grows.
