# Convert Sleep Tracker to Mobile App UI

Transform the current single-page dashboard into a mobile app-like interface with bottom navigation tabs, matching the Fit-Z reference design.

## Proposed Tab Structure

Based on the Fit-Z screenshots (Timer/Plans/History) and your current features:

| Tab | Icon | Content |
|-----|------|---------|
| **Timer** | `Timer` icon | Sleep timer (start/stop), manual entry form, quick today stats |
| **Today** | `Sun` icon | Daily progress card, guidance text, last session, recent 7-day summary |
| **History** | `BarChart` icon | Weekly chart, 7-day detailed history, sleep insights |
| **Calendar** | `Calendar` icon | Monthly calendar grid, month summary stats, monthly trend |
| **More** | `Settings` icon | Session log (with search), settings, reminders, backup |

## Implementation Plan

### Phase 1: Create Tab Layout Infrastructure
1. **Create `layouts/mobile.vue`**
   - Fixed bottom navigation bar with 5 tabs
   - Active tab state management
   - Mobile-optimized container (max-width centered)

2. **Create `pages/index.vue` (new entry)**
   - Redirect to `/timer` or set default tab
   - Or use as the layout wrapper with tab routing

### Phase 2: Create Tab Pages
1. **`pages/timer.vue`**
   - Sleep timer mode (circular timer display like Fit-Z)
   - Start/Stop/Cancel buttons
   - Manual session entry form below timer
   - Quick today stats card (completed %, remaining)

2. **`pages/today.vue`**
   - Large daily progress card with percentage
   - Guidance text banner
   - Last session info
   - Compact 7-day summary list

3. **`pages/history.vue`**
   - Weekly bar chart (7 days)
   - 7-day history list
   - Sleep insights cards (best/worst day, consistency, etc.)

4. **`pages/calendar.vue`**
   - Month navigation header
   - Calendar grid
   - Month summary stats
   - Monthly trend mini-chart

5. **`pages/more.vue`**
   - Session log with search/filter
   - Settings (goal, anchor time)
   - Reminders section
   - Backup import/export

### Phase 3: Refactor & Extract Components
1. **Extract computed properties and state**
   - Move `useLocalStorage` state and computed properties to a composable `composables/useSleepData.ts`
   - Keep logic DRY across tab pages

2. **Extract reusable UI components**
   - `TodayStatsCard.vue` - Quick stats display
   - `ProgressBar.vue` - Reusable progress indicator
   - `SleepSessionItem.vue` - Session list item with edit/delete
   - `InsightCard.vue` - Stats insight display

### Phase 4: Mobile UI Polish
1. **Add mobile-optimized styles**
   - Larger touch targets (buttons min 44px)
   - Bottom-safe padding for notched devices
   - Smooth tab transitions
   - Pull-to-refresh where appropriate

2. **Header styling**
   - App logo + title in top header
   - Clean, minimal top bar

## Key Design Decisions

1. **Keep it local-first**: All data stays in localStorage, no backend needed
2. **Bottom nav always visible**: Users can quickly switch between tabs
3. **Timer as primary tab**: First thing users see when opening (most common action)
4. **Session log has search**: As suggested in handoff, useful when session count grows
5. **Responsive fallback**: On desktop, show tabs on left side or keep bottom nav centered

## File Changes Summary

| Action | File |
|--------|------|
| Create | `layouts/mobile.vue` |
| Create | `composables/useSleepData.ts` |
| Create | `pages/timer.vue` |
| Create | `pages/today.vue` |
| Create | `pages/history.vue` |
| Create | `pages/calendar.vue` |
| Create | `pages/more.vue` |
| Create | `components/TodayStatsCard.vue` |
| Create | `components/SleepSessionItem.vue` |
| Move | `pages/index.vue` → `pages/index.vue` (backup) or refactor as landing |

## Questions for You

1. **Default landing tab**: Should the app open to Timer or Today view?
2. **Tab labels**: Are you happy with Timer/Today/History/Calendar/More, or prefer different names?
3. **Desktop view**: On desktop browsers, should we keep the bottom nav or switch to side tabs?
4. **Session search**: Should the session log have date filtering or just text search?
5. **Animations**: Do you want tab transition animations (slide/fade)?
