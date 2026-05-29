# Sleep Tracker — Completed Improvements

## Batch 1 — Bug Fixes & Quick Wins
**Date:** 2026-05-29

### ✅ #24 — Fix Reminder Deduplication Bug
**File:** `app/composables/useSleepData.ts`

Previously all 5 reminder types (Goal Check, Bedtime, Wind-Down, Evening Nudge, Recovery) shared a single `lastReminderDate` localStorage key. Firing any one reminder could silently prevent all others from firing on the same day.

**Fix:** Each reminder type now has its own dedicated localStorage key:
- `sleep-tracker-last-reminder-date` (Goal Check)
- `sleep-tracker-last-bedtime-reminder-date` (Bedtime)
- `sleep-tracker-last-winddown-reminder-date` (Wind-Down)
- `sleep-tracker-last-goal-nudge-date` (Evening Nudge)
- `sleep-tracker-last-missed-goal-date` (Recovery — was already separate)

---

### ✅ #25 — Fix `/sw.js` Vue Router Warning
**File:** `nuxt.config.ts`

Added `router.options.strict: false` to stop the repeated "No match found for location with path '/sw.js'" warnings in dev tools.

---

### ✅ #17 — Replace Missing `alarm.mp3` with Web Audio API
**File:** `app/pages/timer.vue`

The alarm previously tried to load `/alarm.mp3` (which doesn't exist) and fell back to a low-quality single-tone Web Audio beep on failure. Removed the external file dependency entirely.

**New alarm:** Fully self-contained Web Audio API implementation with:
- Alternating 880Hz / 660Hz beep pattern (more attention-grabbing)
- Smooth fade-in/sustain/fade-out envelopes per beep (no harsh clicks)
- Guard against duplicate intervals (`if (webAudioLoop) return`)
- Safari/webkit compatibility via `window.webkitAudioContext` fallback

---

### ✅ #1 — Page Transition Animations
**File:** `app/layouts/mobile.vue`

Added directional slide transitions when switching between bottom nav tabs:
- Navigating to a tab to the **right** → page slides **left** (new page enters from right)
- Navigating to a tab to the **left** → page slides **right** (new page enters from left)
- Uses `mode="out-in"` so the leaving page animates out before the entering page animates in
- Duration: 180ms opacity + 220ms transform with cubic-bezier easing — fast enough to feel native, smooth enough to feel premium

---

### ✅ #12 — Dismiss Recommendations (Persistent)
**File:** `app/pages/recommendations.vue`

Previously `dismissRecommendation()` was a placeholder comment. Implemented full persistence:
- Dismissed IDs stored in `sleep-tracker-dismissed-recommendations` localStorage key
- `visibleRecommendations` computed filters out dismissed entries
- **X dismiss button** visible on each recommendation card with `aria-label`
- **"Restore N"** button appears in the header when there are dismissed items
- **"All Dismissed"** empty state with Restore All button when all are dismissed
- `TransitionGroup` animation: cards slide out to the right when dismissed, remaining cards animate into place

---

### ✅ #16 — PWA Shortcuts
**File:** `nuxt.config.ts`

Added 3 shortcuts to the PWA manifest so users can long-press the app icon on Android/iOS for quick access:
1. **Start Sleep Timer** → `/timer`
2. **View History** → `/history`
3. **Today's Summary** → `/`

---

### ✅ #5 — Goal Completion Celebration Animation
**Files:** `app/pages/index.vue`, `app/assets/css/tailwind.css`

When daily sleep goal reaches 100% for the first time (not on page load if already complete):
- 18 emoji particles (🌙 ⭐ ✨ 💫 🎉 🌟 😴 🏆) rain down across the full screen width
- Each particle has randomized delay (0–0.4s), duration (1.2–2s), and position
- Rendered via `<Teleport to="body">` so it overlays everything including the nav bar
- Auto-clears after 2.5 seconds
- CSS `confetti-fall` keyframe animation with rotation and fade-out

---

## Batch 2 — Advanced Analytics & UX Improvements
**Date:** 2026-05-29

### ✅ #15 — Sleep Score / Grade
**Files:** `app/lib/sleep.ts`, `app/composables/useSleepData.ts`, `app/pages/index.vue`

Implemented a composite, science-backed **Sleep Health Score (0–100)** to give users a single at-a-glance health indicator on the home page.

**Details:**
1. **Weighted Algorithm** (`app/lib/sleep.ts`):
   - **Duration (50%):** Proportional score based on daily sleep goal progress.
   - **Consistency (20%):** Calculated based on standard deviation of bedtimes over the last 7 tracked days.
   - **Quality (20%):** Calculated based on average sleep quality rating over the last 7 days.
   - **Debt-free (10%):** Rewards having low accumulated sleep debt relative to weekly goals.
2. **Grade System:**
   - **A (Excellent):** Score $\ge 90$ (Emerald theme)
   - **B (Good):** Score $\ge 75$ (Teal theme)
   - **C (Fair):** Score $\ge 55$ (Amber theme)
   - **D (Poor):** Score $\ge 35$ (Orange theme)
   - **F (Critical):** Score $< 35$ (Red theme)
3. **Hero Dashboard Widget (`app/pages/index.vue`):**
   - Prominently displays the score as the hero metric with a dynamic letter-grade badge.
   - Beautiful grid layout showcasing the breakdown for each category (Duration, Consistency, Quality, Debt-Free).
   - Designed to perfectly blend with the existing dark/light UI aesthetic.

---

### ✅ #4 — Bottom Sheet for Session Details
**Files:** `app/components/DayDetailBottomSheet.vue`, `app/pages/calendar.vue`, `app/pages/heatmap.vue`

Tapping any day in the Calendar or Heatmap now opens a high-end custom bottom sheet/drawer, detailing all sleep sessions, ratings, tags, and dream/sleep notes for that specific day.

**Details:**
1. **Reusable Drawer Component (`app/components/DayDetailBottomSheet.vue`):**
   - Implements native-app-like slide-up animations using Vue `<Transition>` and spring easing curves.
   - Designed with custom glassmorphism styles, dark backdrop blur (`bg-black/60 backdrop-blur-sm`), and a pull-to-dismiss visual bar handle.
   - Provides a comprehensive breakdown for the selected day:
     - **Performance Summary Stats:** Total sleep logged, goal completion progress bar, average rating emoji + status label, and goal-met checkmark or missing-duration alert.
     - **Detailed Sessions Timeline:** Lists start/end times, calculated session duration, quality score, tags (rendered as micro-capsules), and notes (styled as a blockquote with a document icon).
     - **Polished Empty State:** Shows a friendly moon illustration if no sleep sessions were tracked on that day.
2. **Interactive Calendar Cells (`app/pages/calendar.vue`):**
   - Added hover effects, hand cursor triggers (`cursor-pointer`), and active scale-down press micro-interactions (`active:scale-95 transition-all`) to all calendar day blocks.
   - Handled `@click` triggers to open the detail drawer.
3. **Interactive Heatmap Blocks (`app/pages/heatmap.vue`):**
   - Transformed static heatmap day squares into fully clickable buttons with zoom/lift transitions (`hover:scale-110 active:scale-90 transition-all`).
   - Bound click handlers to open the details modal with a single tap.
