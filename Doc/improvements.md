# Sleep Tracker — Improvement Roadmap

After a full audit of every page, composable, and utility in the codebase, here's a prioritized list of improvements grouped by category.

---

## 🎨 UX / UI Polish

### 1. Page Transition Animations
Currently navigating between tabs causes a hard cut. Add `<NuxtPage>` transition animations (slide or fade) to make tab switching feel native and smooth.
- **Effort:** Low
- **Files:** [mobile.vue](file:///h:/Vue/Sleep-Tracker/app/layouts/mobile.vue), [app.vue](file:///h:/Vue/Sleep-Tracker/app/app.vue)

### 2. Pull-to-Refresh Gesture
Add a pull-to-refresh gesture on the Today page to refresh the `now` ref and recalculate all derived data, mimicking native app behavior.
- **Effort:** Medium
- **Files:** [index.vue](file:///h:/Vue/Sleep-Tracker/app/pages/index.vue)

### 3. Skeleton Loaders for Charts
The 30-day trend SVG and 7-day bar chart render empty until data loads. Add shimmer/skeleton placeholders to prevent layout shift on initial paint.
- **Effort:** Low
- **Files:** [history.vue](file:///h:/Vue/Sleep-Tracker/app/pages/history.vue)

### 4. Bottom Sheet for Session Details
Tapping a day in the Calendar or Heatmap currently does nothing. Open a bottom sheet/drawer showing that day's sessions, quality, tags, and notes.
- **Effort:** Medium
- **Files:** [calendar.vue](file:///h:/Vue/Sleep-Tracker/app/pages/calendar.vue), [heatmap.vue](file:///h:/Vue/Sleep-Tracker/app/pages/heatmap.vue)

### 5. Confetti / Celebration Animation on Goal Completion
When daily goal reaches 100%, trigger a subtle confetti or particle animation to reward the user. Currently it just shows "Goal reached! 🎉" text.
- **Effort:** Low
- **Files:** [index.vue](file:///h:/Vue/Sleep-Tracker/app/pages/index.vue)

### 6. Animated Timer Ring
The SVG arc progress on the timer page updates every 60 seconds. Add a smooth CSS animation or requestAnimationFrame loop so the ring fills continuously in real time.
- **Effort:** Low
- **Files:** [timer.vue](file:///h:/Vue/Sleep-Tracker/app/pages/timer.vue)

### 7. Swipe-to-Delete on Session List
The session list in "More" uses small icon buttons for delete. Add swipe-to-reveal-actions (edit/delete) for a more natural mobile interaction.
- **Effort:** Medium
- **Files:** [more.vue](file:///h:/Vue/Sleep-Tracker/app/pages/more.vue), [useSwipe.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSwipe.ts)

### 8. Delete Confirmation Dialog
Currently `removeSession` deletes immediately with only an undo toast. Add a brief confirmation dialog for destructive actions to prevent accidental data loss.
- **Effort:** Low
- **Files:** [more.vue](file:///h:/Vue/Sleep-Tracker/app/pages/more.vue)

---

## ✨ New Features

### 9. Sleep Notes & Dream Journal
The notes field exists but is underutilized. Add a dedicated "Journal" tab or expandable section where users can write longer entries, tag dreams, and search past entries.
- **Effort:** Medium–High
- **Files:** New page + [useSleepData.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepData.ts)

### 10. Weekly / Monthly Report Page
Generate a printable or shareable weekly/monthly summary card (total sleep, avg quality, best/worst days, streak) that users can screenshot or export as an image.
- **Effort:** Medium
- **Files:** New page

### 11. Apple Health / Google Fit Integration Stub
Even if not immediately functional, add a settings toggle + UI for future health kit integration. This signals the app's direction and can use the Web Health API when available.
- **Effort:** Low (stub) / High (full integration)
- **Files:** [more.vue](file:///h:/Vue/Sleep-Tracker/app/pages/more.vue)

### 12. Dismiss / Snooze Recommendations
The `dismissRecommendation()` function in [recommendations.vue](file:///h:/Vue/Sleep-Tracker/app/pages/recommendations.vue#L45-L48) is a placeholder. Implement actual dismissal persistence using localStorage so dismissed recommendations don't reappear.
- **Effort:** Low
- **Files:** [recommendations.vue](file:///h:/Vue/Sleep-Tracker/app/pages/recommendations.vue)

### 13. Custom Tags
Users are limited to the hardcoded `SLEEP_TAGS` array. Allow users to create and manage their own custom tags from Settings.
- **Effort:** Medium
- **Files:** [sleep.ts](file:///h:/Vue/Sleep-Tracker/app/lib/sleep.ts), [useSleepData.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepData.ts), [more.vue](file:///h:/Vue/Sleep-Tracker/app/pages/more.vue)

### 14. Multiple Sleep Goal Profiles
Support different daily goals for weekdays vs. weekends (e.g., 7h on workdays, 9h on weekends) since the Social Jetlag feature already tracks weekday/weekend patterns.
- **Effort:** Medium
- **Files:** [useSleepData.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepData.ts), [sleep.ts](file:///h:/Vue/Sleep-Tracker/app/lib/sleep.ts), [more.vue](file:///h:/Vue/Sleep-Tracker/app/pages/more.vue)

### 15. Sleep Score / Grade
Calculate a single composite "Sleep Score" (0–100) combining duration, consistency, quality, and debt. Display it prominently on the Today page as the hero metric.
- **Effort:** Medium
- **Files:** [sleep.ts](file:///h:/Vue/Sleep-Tracker/app/lib/sleep.ts), [index.vue](file:///h:/Vue/Sleep-Tracker/app/pages/index.vue)

### 16. Widgets / Shortcuts for PWA
Add PWA shortcuts in the manifest for "Start Timer" and "Log Sleep" so users can long-press the app icon and jump directly to an action.
- **Effort:** Low
- **Files:** [nuxt.config.ts](file:///h:/Vue/Sleep-Tracker/nuxt.config.ts)

### 17. Alarm Sound Selection
The alarm currently attempts to load `/alarm.mp3` (which doesn't exist in `/public`) and falls back to Web Audio API beeps. Add actual alarm sound file(s) and let users pick from presets.
- **Effort:** Medium
- **Files:** [timer.vue](file:///h:/Vue/Sleep-Tracker/app/pages/timer.vue), public folder

### 18. Cloud Sync (Optional Account)
While the app is local-first by design, offering an optional cloud sync via Supabase or Firebase would let users keep data across devices. Keep it opt-in.
- **Effort:** High
- **Files:** Architecture-wide

---

## 🏗️ Architecture & Code Quality

### 19. Extract Timer Page into Smaller Components
[timer.vue](file:///h:/Vue/Sleep-Tracker/app/pages/timer.vue) is 931 lines — the largest file in the project. Extract the alarm overlay, template grid, manual entry form, and optimal wake times into dedicated components.
- **Effort:** Medium
- **Files:** [timer.vue](file:///h:/Vue/Sleep-Tracker/app/pages/timer.vue) → 4–5 new components

### 20. Extract History Page into Components
[history.vue](file:///h:/Vue/Sleep-Tracker/app/pages/history.vue) is 521 lines with many independent chart/card sections. Each analytics card (Sleep Debt, Social Jetlag, Tag Effectiveness, etc.) should be its own component.
- **Effort:** Medium
- **Files:** [history.vue](file:///h:/Vue/Sleep-Tracker/app/pages/history.vue)

### 21. Extract More Page into Components
[more.vue](file:///h:/Vue/Sleep-Tracker/app/pages/more.vue) at 619 lines mixes session management, settings, reminders, and backup logic. Split into `SessionLog.vue`, `SettingsPanel.vue`, `BackupPanel.vue`.
- **Effort:** Medium
- **Files:** [more.vue](file:///h:/Vue/Sleep-Tracker/app/pages/more.vue)

### 22. Refactor `useSleepData` Composable
[useSleepData.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepData.ts) at 695 lines is a monolith. Split it into focused composables: `useTimer`, `useAlarm`, `useReminders`, `useAnalytics`, `useBackup`.
- **Effort:** Medium–High
- **Files:** [useSleepData.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepData.ts) → 5 new composables

### 23. Add Unit Tests
There are zero tests. The pure utility functions in [sleep.ts](file:///h:/Vue/Sleep-Tracker/app/lib/sleep.ts) (36KB of logic) are highly testable. Add Vitest with tests for streak calculation, sleep debt, social jetlag, session validation, etc.
- **Effort:** Medium
- **Files:** New `tests/` directory

### 24. Fix Reminder Deduplication Bug
In [useSleepData.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepData.ts#L296-L378), `lastReminderDate` is a single string shared across ALL reminder types. This means triggering one reminder (e.g., Goal Check) can prevent another (Bedtime) from firing on the same day. Each reminder type needs its own `last-fired` key.
- **Effort:** Low
- **Files:** [useSleepData.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepData.ts)

> [!WARNING]
> This is an active bug — reminders may silently fail to fire.

### 25. Fix `/sw.js` Vue Router Warning
The terminal output shows repeated `No match found for location with path "/sw.js"` warnings. Add a route exclusion or handle the service worker path in the Nuxt PWA config.
- **Effort:** Low
- **Files:** [nuxt.config.ts](file:///h:/Vue/Sleep-Tracker/nuxt.config.ts)

---

## ⚡ Performance

### 26. Debounce Expensive Computed Properties
Several computed properties (e.g., `sleepDebt`, `socialJetlag`, `tagEffectiveness`, `periodComparison`) recalculate on every session change. Use `computedEager` or debounce/throttle for expensive analytics that don't need instant reactivity.
- **Effort:** Low
- **Files:** [useSleepData.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepData.ts)

### 27. Virtualize Long Session Lists
The session log in More page renders all sessions at once. With months of data, this will cause jank. Use virtual scrolling (e.g., `@vueuse/components` `useVirtualList`) for the session list.
- **Effort:** Medium
- **Files:** [more.vue](file:///h:/Vue/Sleep-Tracker/app/pages/more.vue)

### 28. Lazy-Load Non-Critical Pages
The heatmap and recommendations pages don't need to load eagerly. Add `defineAsyncComponent` or Nuxt's built-in lazy loading for less-visited tabs.
- **Effort:** Low
- **Files:** Already handled by Nuxt file-based routing (code-split by default), but could improve preloading strategy.

---

## ♿ Accessibility

### 29. Add ARIA Labels to Interactive Elements
Most buttons (quality emoji selectors, tag toggles, alarm toggles, theme toggle) lack `aria-label` attributes. Screen readers will announce them as generic "button" elements.
- **Effort:** Low
- **Files:** All pages

### 30. Keyboard Navigation for Quality & Tag Selectors
The quality rating (emoji buttons) and tag selectors aren't keyboard-navigable with arrow keys. Add proper `role="radiogroup"` / `role="radio"` semantics and keyboard handlers.
- **Effort:** Medium
- **Files:** [timer.vue](file:///h:/Vue/Sleep-Tracker/app/pages/timer.vue), [more.vue](file:///h:/Vue/Sleep-Tracker/app/pages/more.vue)

### 31. Color Contrast in Light Mode Heatmap
The emerald-50 through emerald-200 heatmap cells have very low contrast against the white card background in light mode. Use a darker baseline or add borders.
- **Effort:** Low
- **Files:** [heatmap.vue](file:///h:/Vue/Sleep-Tracker/app/pages/heatmap.vue)

---

## 📊 Data & Analytics

### 32. Sleep Quality Trend Chart
Quality ratings are collected but never visualized over time. Add a quality trend line to the History page alongside the duration trend.
- **Effort:** Medium
- **Files:** [history.vue](file:///h:/Vue/Sleep-Tracker/app/pages/history.vue), [sleep.ts](file:///h:/Vue/Sleep-Tracker/app/lib/sleep.ts)

### 33. Sleep Regularity Index (SRI)
Beyond consistency score (which is just average completion %), calculate a true Sleep Regularity Index based on sleep/wake time variance. This is a well-established sleep science metric.
- **Effort:** Medium
- **Files:** [sleep.ts](file:///h:/Vue/Sleep-Tracker/app/lib/sleep.ts), [history.vue](file:///h:/Vue/Sleep-Tracker/app/pages/history.vue)

### 34. Export Report as PDF
Add a "Download Report" button that generates a styled PDF summary using client-side HTML-to-PDF (e.g., html2canvas + jsPDF), useful for sharing with doctors or coaches.
- **Effort:** Medium–High
- **Files:** New utility + [history.vue](file:///h:/Vue/Sleep-Tracker/app/pages/history.vue)

---

## 🔒 Data Integrity & Safety

### 35. Data Migration / Versioning
The backup format has a `version: 1` field but no migration logic. As the schema evolves (e.g., adding new fields), implement a migration pipeline on import.
- **Effort:** Medium
- **Files:** [useSleepData.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepData.ts)

### 36. Conflict-Free Import (Merge Strategy)
Currently, `importBackup` replaces ALL sessions. Implement a merge strategy that detects duplicates (by ID or time overlap) and lets users choose: replace, skip, or merge.
- **Effort:** Medium
- **Files:** [useSleepData.ts](file:///h:/Vue/Sleep-Tracker/app/composables/useSleepData.ts)

---

## Summary Priority Matrix

| Priority | Items | Impact |
|----------|-------|--------|
| 🔴 **Now** (bugs) | #24 Reminder bug, #25 sw.js warning, #17 Missing alarm.mp3 | Fix active bugs |
| 🟠 **Next** (quick wins) | #1 Page transitions, #5 Goal celebration, #6 Animated ring, #12 Dismiss recommendations, #16 PWA shortcuts, #29 ARIA labels | High UX impact, low effort |
| 🟡 **Soon** (features) | #4 Bottom sheet, #13 Custom tags, #15 Sleep score, #32 Quality trend | User-requested features |
| 🟢 **Plan** (architecture) | #19–#23 Component extraction + tests | Long-term maintainability |
| 🔵 **Later** (ambitious) | #10 Reports, #18 Cloud sync, #34 PDF export | Nice-to-have |
