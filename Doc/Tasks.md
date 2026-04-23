# Sleep Tracker — Gap Analysis

Comparing `Plan.md` + `Requirements.md` against current implementation.

---

## ✅ MVP Features — Fully Implemented

| Feature                                                                                  | Where                             |
| ---------------------------------------------------------------------------------------- | --------------------------------- |
| Daily sleep goal setting (hours, 0.5 step)                                               | `more.vue` → Settings section     |
| Prayer/Wake anchor time field                                                            | `more.vue` → Settings section     |
| Local Storage persistence (`@vueuse/core`)                                               | `useSleepData.ts`                 |
| Add sleep session (manual start + end datetime)                                          | `timer.vue` → Log Sleep Manually  |
| Start/Stop live sleep timer                                                              | `timer.vue` → timer controls      |
| Cancel active session                                                                    | `timer.vue`                       |
| Edit existing session                                                                    | `more.vue` → Session Log          |
| Delete existing session                                                                  | `more.vue` → Session Log          |
| Today's progress (total slept, remaining, % complete)                                    | `index.vue` + `timer.vue`         |
| Goal-completed flag                                                                      | `index.vue`                       |
| Last 7-day history (bar chart + daily breakdown)                                         | `history.vue`                     |
| Split-sleep across midnight (prorated by calendar date)                                  | `lib/sleep.ts` logic              |
| Dynamic guidance message ("You still need X today")                                      | `index.vue` guidance banner       |
| Monthly calendar view (goal-met coloring, nav)                                           | `calendar.vue`                    |
| Monthly stats (total, goals met, average)                                                | `calendar.vue`                    |
| Insights (best day, lowest day, consistency %, split sleep days, most common start hour) | `history.vue`                     |
| Export backup (JSON download)                                                            | `more.vue` → Settings → Backup    |
| Import backup (JSON upload with validation)                                              | `more.vue` → Settings → Backup    |
| Reminders / notifications (permission request, toggle, time picker)                      | `more.vue` → Settings → Reminders |
| Search + date-filter session log                                                         | `more.vue` → Session Log          |

---

## ⚠️ Partially Implemented

| Feature              | Gap                                                                                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dynamic guidance** | Currently only shows one generic message ("You still need X today"). The plan mentions richer suggestions like _"A second sleep block after prayer would complete your goal"_ — the anchor time is stored but barely used in `buildGuidance()`. |
| **Reminders**        | The browser `Notification` API fires once per day at reminder time. But there is **no Service Worker / background scheduling**, so reminders only work while the tab is open.                                                                   |
| **Calendar view**    | The grid renders but `buildMonthGrid` is called with an **empty `sessions` array** (`[]`) in `calendar.vue` line 22 — so it always shows zero sleep for every day. This is a **bug**.                                                           |

---

## ❌ Missing / Not Implemented

### From MVP list in Plan.md

| Feature                                        | Status                                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Streak counter** (consecutive goal-met days) | The `completionDays` computed only counts out of 7 days; there is no all-time streak tracker. |

### From Second Phase list in Plan.md

| Feature                                           | Status                                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Charts** (line/area trend beyond the bar chart) | Not implemented                                                                                          |
| **All-time streak**                               | Not implemented                                                                                          |
| **Export/import**                                 | ✅ Done (moved up from Phase 2)                                                                          |
| **Cloud sync**                                    | Not implemented (out of scope for now)                                                                   |
| **PWA / installable**                             | The `/sw.js` 404 warn in the dev console suggests a Service Worker was configured but isn't being served |

---

## 🐛 Confirmed Bug

### Calendar page shows 0 sleep for all days

**File:** `app/pages/calendar.vue` — line 22

```ts
// Current (broken)
const monthCalendar = computed(
  () =>
    buildMonthGrid(
      selectedMonth.value,
      [],
      settings.value.dailyGoalHours,
      todayKey.value,
    ),
  //                                    ^^
  //                              hardcoded empty array — sessions never passed!
);
```

**Fix:** Pass `normalizedSessions` from the composable:

```ts
// Fixed
const { sessions, ... } = useSleepData()

const monthCalendar = computed(() =>
  buildMonthGrid(selectedMonth.value, sessions.value, settings.value.dailyGoalHours, todayKey.value),
)
```

---

## 📋 Recommended Next Steps (Priority Order)

1. **Fix the calendar bug** (sessions not passed) — quick 2-line fix, high impact.
2. **Improve guidance messages** — use `anchorTime` to give smarter suggestions.
3. **Add a streak tracker** — all-time consecutive days goal was met.
4. **Richer history charts** — a 30-day line/area trend would look great.
5. **PWA / installable** — register a service worker so it works offline + can be added to home screen.
