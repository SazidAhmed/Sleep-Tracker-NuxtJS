# Sleep Tracker — Improvement Analysis

A comprehensive audit of the codebase (66 files, 1296 symbols, 57 execution flows) revealing actionable improvements across 7 categories.

---

## 1. Architecture & Code Quality

### 🔴 Critical: God Composable — [useSleepData.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepData.ts)

The `_useSleepData()` function is **811 lines** and returns **74 properties**. It mixes concerns: CRUD, timers, alarms, notifications, backups, analytics, templates, tags, and undo — all in a single composable wrapped in `createGlobalState`.

**Problems:**
- Impossible to tree-shake — every page pulls in alarm logic, backup logic, analytics, etc. even when unused
- Hard to test — the composable requires `onMounted` lifecycle hooks, making unit testing fragile
- Memory waste — every computed (sleep debt, social jetlag, regularity index, 30-day analytics) is always active, even on pages that don't use them

**Recommendation — Split into focused composables:**

| New Composable | Responsibility | Current Lines |
|---|---|---|
| `useSleepSessions` | Session CRUD, undo, templates | ~120 |
| `useSleepTimer` | Active timer, start/stop/cancel | ~60 |
| `useSleepGoals` | Settings, goal calculation | ~40 |
| `useSleepNotifications` | All reminder types, permissions | ~100 |
| `useSleepAlarmSystem` | Alarm config, firing, snooze, Web Audio | ~100 |
| `useSleepAnalytics` | Sleep debt, jetlag, patterns, score | ~80 |
| `useSleepBackupRestore` | Export/import, CSV, auto-backup | ~80 |

> **Effort:** Medium-High &nbsp;|&nbsp; **Impact:** High

---

### 🔴 Critical: God Library — [sleep.ts](file:///h:/Vue/Sleep-Tracker/app/lib/sleep.ts) (1260 lines)

Single file exporting 30+ functions + 20+ types. No separation between:
- Pure utility functions (`formatDurationFromMinutes`, `getDateKey`)
- Domain calculations (`calculateSleepDebt`, `calculateSocialJetlag`)
- Type definitions (`SleepSession`, `AlarmConfig`)

**Recommendation — Split into modules:**
```
lib/
├── types.ts              # All interfaces and type aliases
├── format.ts             # Date/time/duration formatters
├── session.ts            # Session validation, duration, summarize
├── analytics.ts          # Debt, jetlag, patterns, efficiency, score
├── recommendations.ts    # Smart recommendations engine
├── calendar.ts           # Month grid, date navigation
└── export.ts             # CSV, backup generation
```

> **Effort:** Medium &nbsp;|&nbsp; **Impact:** High

---

### 🟡 Warning: Massive Page Components

| Page | Lines | Size | Concern |
|---|---|---|---|
| [more.vue](file:///h:/Vue/Sleep-Tracker/app/pages/more.vue) | 1295 | 49KB | Settings + Session Log + Edit + Cloud Sync + Tags + Swipe-to-delete all in one page |
| [timer.vue](file:///h:/Vue/Sleep-Tracker/app/pages/timer.vue) | 1040 | 39KB | Timer + Manual entry + Templates + Alarm settings + Quality selectors + Audio engine |
| [history.vue](file:///h:/Vue/Sleep-Tracker/app/pages/history.vue) | 795 | 32KB | 8+ separate chart/card components inlined |

**Recommendation:** Extract into component files:
- `SessionEditDialog.vue`, `SessionListItem.vue`, `SwipeableRow.vue`
- `AlarmSettingsCard.vue`, `TemplateManager.vue`, `ManualSessionForm.vue`
- `SleepDebtCard.vue`, `SocialJetlagCard.vue`, `WeeklyBarChart.vue`, `TrendChart.vue`

> **Effort:** Medium &nbsp;|&nbsp; **Impact:** Medium

---

### 🟡 Warning: Duplicated Keyboard Navigation Logic

[`handleQualityKeydown`](file:///h:/Vue/Sleep-Tracker/app/pages/timer.vue#L233-L259) and [`handleSelectableGroupKeydown`](file:///h:/Vue/Sleep-Tracker/app/pages/timer.vue#L261-L277) are duplicated between [timer.vue](file:///h:/Vue/Sleep-Tracker/app/pages/timer.vue) and [more.vue](file:///h:/Vue/Sleep-Tracker/app/pages/more.vue#L414-L453).

**Recommendation:** Extract into a `useKeyboardNavigation` composable or a shared utility.

> **Effort:** Low &nbsp;|&nbsp; **Impact:** Low

---

## 2. Performance

### 🔴 Eager Computation Waste

All analytics are computed on **every page mount** via the global state composable, even though:
- `sleepDebt` is only shown on `/history`
- `socialJetlag` is only shown on `/history`
- `recommendations` is only shown on `/` and `/recommendations`
- `sleepScore` is only shown on `/`
- `regularityIndex` is only shown on `/history`
- `bedtimeTrend`, `tagEffectiveness`, `periodComparison` are only on `/history`

**Recommendation:** Use lazy computed or move analytics to page-level composables that are only active when the page is mounted.

> **Effort:** Medium &nbsp;|&nbsp; **Impact:** High (especially on low-end mobile)

---

### 🟡 requestAnimationFrame Loop in Timer

In [timer.vue L176-L181](file:///h:/Vue/Sleep-Tracker/app/pages/timer.vue#L176-L181), `updateLocalTime` uses `requestAnimationFrame` to update `localNow` — this fires **~60 times per second** but the display only shows **hours:minutes:seconds** (updates once/second). Use `setInterval(1000)` instead.

> **Effort:** Low &nbsp;|&nbsp; **Impact:** Low-Medium (battery drain on mobile)

---

### 🟡 No Pagination on Session List

The `more.vue` session list renders **all sessions at once** (with virtualization kicking in at 40+ items). The initial `filteredSessions` computation re-runs on every session change, calling `formatDateTimeLabel` and `formatDurationFromMinutes` for every session during search.

**Recommendation:** Add memoized formatting or limit search to debounced input.

> **Effort:** Low &nbsp;|&nbsp; **Impact:** Medium (for users with hundreds of sessions)

---

## 3. Testing

### 🔴 Critical: Minimal Test Coverage

Only **1 test file** ([sleep.test.ts](file:///h:/Vue/Sleep-Tracker/tests/sleep.test.ts)) with **7 test cases** covering a 1260-line library. No tests for:

| Missing Coverage | Risk |
|---|---|
| Composable logic (`useSleepData`) | Timer start/stop, session save, notification scheduling |
| Backup import/export | Data corruption, merge conflicts, edge cases |
| Cloud sync | Push/pull failures, snapshot creation |
| Sleep score calculation | Weighted scoring accuracy |
| Tag effectiveness | Statistical calculations |
| Alarm logic | Snooze, smart alarm windows, re-triggering |
| Edge cases | Timezone changes, DST, cross-midnight sessions, leap years |

**Recommendation:**
- Add unit tests for all `lib/sleep.ts` exported functions (~40+ test cases)
- Add composable tests using `@vue/test-utils` for CRUD operations
- Add snapshot tests for backup/restore
- Target: **80%+ code coverage** on `lib/sleep.ts`

> **Effort:** High &nbsp;|&nbsp; **Impact:** Critical for reliability

---

## 4. UX / UI Improvements

### 🟡 Bottom Navigation Bar — Too Many Tabs

The [mobile layout](file:///h:/Vue/Sleep-Tracker/app/layouts/mobile.vue#L7-L15) has **8 items** (7 tabs + dark mode toggle). This is overcrowded on smaller screens, especially with the text labels.

```
Timer | Today | History | Heat | Tips | Calendar | More | 🌙
```

**Recommendation:**
- Keep 5 core tabs: **Today, Timer, History, Calendar, More**
- Move Heat Map, Tips, and Dark Mode into the More page or sub-navigation
- Use Material Design 3 guidelines: max 5 bottom nav items

> **Effort:** Low &nbsp;|&nbsp; **Impact:** High (mobile UX)

---

### 🟡 No Loading States on Data-Heavy Pages

The [history.vue](file:///h:/Vue/Sleep-Tracker/app/pages/history.vue) page has skeleton loaders for some cards but the **Goal Forecast, Period Comparison, Bedtime Trend, and Tag Effectiveness** sections render instantly with potentially stale or empty data — no skeleton states.

**Recommendation:** Add consistent skeleton loaders for all analytic cards.

> **Effort:** Low &nbsp;|&nbsp; **Impact:** Medium

---

### 🟡 No Confirmation for Destructive Actions

- `clearAllData` is mentioned in settings but no confirmation dialog
- Template deletion (`handleDeleteTemplate`) happens instantly with no undo
- Backup replace mode (`importMode = 'replace'`) replaces **all data** with no second confirmation

**Recommendation:** Add confirmation dialogs for all destructive operations, similar to the existing `showDeleteConfirm` pattern for sessions.

> **Effort:** Low &nbsp;|&nbsp; **Impact:** Medium

---

### 🟡 Pull-to-Refresh Only on Index Page

The pull-to-refresh gesture is only implemented on [index.vue](file:///h:/Vue/Sleep-Tracker/app/pages/index.vue#L123-L180) but would be useful on History and Calendar pages too.

**Recommendation:** Extract into a `usePullToRefresh` composable and add to data-heavy pages.

> **Effort:** Low &nbsp;|&nbsp; **Impact:** Low

---

## 5. Accessibility (a11y)

### 🔴 Missing ARIA and Semantic HTML

| Issue | Location |
|---|---|
| Charts (SVG bar chart, trend chart) have **no `aria-label` or `role`** | [history.vue](file:///h:/Vue/Sleep-Tracker/app/pages/history.vue#L362-L414) |
| Color-only status indicators (debt: amber/green, jetlag: red/green) have **no text alternative** | [history.vue](file:///h:/Vue/Sleep-Tracker/app/pages/history.vue#L228-L281) |
| Custom toggle switches use `role="switch"` but **no visible focus ring** | [timer.vue](file:///h:/Vue/Sleep-Tracker/app/pages/timer.vue#L609-L621) |
| Confetti celebration overlay blocks screen readers from reading the page | [index.vue](file:///h:/Vue/Sleep-Tracker/app/pages/index.vue#L217-L230) |
| No `<h1>` on most pages — [history.vue](file:///h:/Vue/Sleep-Tracker/app/pages/history.vue) uses "History" in a `<span>`, not a heading | Multiple pages |

**Recommendation:**
- Add `aria-label` to all SVG charts
- Add screen-reader-only text for color-coded indicators
- Ensure all interactive elements have visible focus indicators
- Use proper heading hierarchy (`<h1>` for page titles)
- Add `aria-live="polite"` to the confetti overlay

> **Effort:** Medium &nbsp;|&nbsp; **Impact:** High

---

## 6. Feature Gaps

### 🟡 Cloud Sync is Half-Implemented

[useCloudSync.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useCloudSync.ts) supports `local-vault` and `custom-endpoint` but:
- `local-vault` just saves to another localStorage key (not really "cloud")
- No conflict resolution for merge operations
- No auto-sync on session change (only manual push/pull)
- Pull doesn't merge settings intelligently — it overwrites

**Recommendation:** Either remove the "cloud" branding (rename to "Backup Vault") or implement a proper sync mechanism with conflict resolution.

> **Effort:** High &nbsp;|&nbsp; **Impact:** Medium

---

### 🟡 Stub Composables

Several composables are thin wrappers with minimal logic:

| Composable | Lines | Status |
|---|---|---|
| [useSleepTimer.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepTimer.ts) | 15 | Returns empty functions |
| [useSleepBackup.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepBackup.ts) | 10 | Returns empty functions |
| [useSleepReminders.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepReminders.ts) | 25 | Returns empty functions |
| [useSleepAnalytics.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepAnalytics.ts) | 30 | Returns empty functions |
| [useSleepAlarm.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepAlarm.ts) | 15 | Returns empty functions |

These were likely planned as part of the composable split but never completed. All actual logic lives in `useSleepData.ts`.

**Recommendation:** Either complete the split or remove the stubs to reduce confusion.

> **Effort:** Low (to delete) / High (to complete split) &nbsp;|&nbsp; **Impact:** Medium

---

### 🟡 Sleep Efficiency Uses Hard-Coded Values

[calculateSleepEfficiency](file:///h:/Vue/Sleep-Tracker/app/lib/sleep.ts#L698-L718) takes fixed `latencyMinutes = 15` and `awakeMinutes = 30`. It doesn't actually measure real sleep latency or awakenings — it's a rough estimate.

**Recommendation:** Either make these user-configurable or clearly label the metric as "estimated efficiency" in the UI.

> **Effort:** Low &nbsp;|&nbsp; **Impact:** Low

---

### 🟡 No Data Migration / Versioning

The backup format has a `version: 1` field but there's **no migration logic** for future schema changes. If `SleepSession` gains new required fields, old backups will silently produce incomplete data.

**Recommendation:** Add a versioned migration pipeline in `importBackup`.

> **Effort:** Medium &nbsp;|&nbsp; **Impact:** Medium (future-proofing)

---

## 7. DevOps & Infrastructure

### 🟡 No Error Tracking

No error boundary, no Sentry/Bugsnag integration. Errors in notification APIs, Web Audio, or localStorage quota limits silently fail.

**Recommendation:** Add a Vue error handler and consider lightweight error tracking.

> **Effort:** Low &nbsp;|&nbsp; **Impact:** Medium

---

### 🟡 PWA Icon Set is Minimal

Only **one icon** ([icon-512x512.png](file:///h:/Vue/Sleep-Tracker/public/icon-512x512.png)) with `purpose: "any maskable"`. Best practice is to have:
- Separate `any` and `maskable` icons (combined purpose has rendering issues)
- Multiple sizes: 48, 72, 96, 128, 144, 192, 384, 512
- An Apple Touch icon

> **Effort:** Low &nbsp;|&nbsp; **Impact:** Low-Medium

---

### 🟡 No Linting / Formatting Config

No `.eslintrc`, `.prettierrc`, or `@nuxt/eslint-config` detected. Code style is consistent but not enforced.

**Recommendation:** Add `@nuxt/eslint` module with TypeScript rules.

> **Effort:** Low &nbsp;|&nbsp; **Impact:** Low

---

## Priority Matrix

| Priority | Item | Category |
|---|---|---|
| 🔴 P0 | Split `useSleepData.ts` (811-line god composable) | Architecture |
| 🔴 P0 | Add unit tests (7 tests for 1260-line library) | Testing |
| 🔴 P0 | Fix accessibility (missing ARIA, heading hierarchy) | a11y |
| 🟡 P1 | Split `sleep.ts` into modules | Architecture |
| 🟡 P1 | Lazy-load analytics computations | Performance |
| 🟡 P1 | Reduce bottom nav to 5 tabs | UX |
| 🟡 P1 | Add confirmation dialogs for destructive actions | UX |
| 🟡 P1 | Clean up stub composables | Code Quality |
| 🟡 P1 | Add error tracking | DevOps |
| 🟢 P2 | Extract page components | Architecture |
| 🟢 P2 | Fix `requestAnimationFrame` timer | Performance |
| 🟢 P2 | Improve cloud sync or rebrand | Features |
| 🟢 P2 | Add data migration pipeline | Features |
| 🟢 P2 | Generate full PWA icon set | DevOps |
| 🟢 P2 | Add ESLint config | DevOps |

---

> **Let me know which improvements you'd like to tackle first**, and I'll create a detailed implementation plan with step-by-step instructions. You can also use `/grill-me` to discuss priorities interactively, or `/goal` to kick off a deep implementation session.
