# Session Handoff

## Project

Sleep Tracker web app built with **Nuxt 4 + Vue 3 + Tailwind v4 + shadcn-nuxt**.

This is a local-first app for tracking flexible sleep patterns, including split sleep across one calendar day.

## Current Product Direction

- The app uses **calendar date** as the source of truth for daily totals.
- Sleep sessions that cross midnight are **split automatically** between the two dates.
- The optional **anchor time** is only used for guidance text. It does **not** change daily calculation boundaries.
- Data persistence is currently **browser local storage only**.
- No backend, authentication, or cloud sync has been added yet.

## Main Files

- `app/pages/index.vue`
  Main dashboard UI and most client-side state handling.
- `app/lib/sleep.ts`
  Shared sleep utilities, formatting helpers, day summaries, month grid generation, and guidance logic.
- `app/assets/css/tailwind.css`
  Theme tokens, typography, and base styling.
- `Doc/Completed_Features.md`
  Feature checklist of what is already implemented.

## What Has Been Implemented

See `Doc/Completed_Features.md` for the full list.

High-level implemented areas:

- daily goal setting
- optional anchor time
- add, edit, delete sleep sessions
- session validation
- midnight split logic
- today progress dashboard
- 7-day history and averages
- monthly calendar view and month summaries
- weekly and monthly charts
- JSON export/import backup
- live timer mode
- sleep insights section
- browser reminder notifications

## Important Local Storage Keys

Used directly in `app/pages/index.vue`:

- `sleep-tracker-settings`
  Stores:
  - `dailyGoalHours`
  - `anchorTime`
- `sleep-tracker-sessions`
  Array of sleep sessions
- `sleep-tracker-active-session-start`
  ISO datetime string for live timer mode
- `sleep-tracker-reminder-enabled`
  Boolean
- `sleep-tracker-reminder-time`
  Time string like `21:00`
- `sleep-tracker-last-reminder-date`
  Last date a reminder was sent

## Core Data Shapes

From `app/lib/sleep.ts`:

- `SleepSession`
  - `id`
  - `start`
  - `end`
  - `createdAt`
- `SleepSettings`
  - `dailyGoalHours`
  - `anchorTime`
- `DailySleepSummary`
  - `date`
  - `minutes`
  - `goalMinutes`
  - `remainingMinutes`
  - `percentage`
  - `sessions`

## Current UI Sections In Dashboard

Main content:

- today progress
- recent 7 days
- weekly chart
- sleep insights
- monthly calendar
- monthly trend

Right sidebar:

- timer mode
- manual sleep entry form
- settings
- reminders
- backup import/export
- session log

## Recently Added

The last features added in this session were:

1. timer mode
2. sleep insights
3. browser reminders
4. completed features documentation updates

## Verification Status

- `npm run build` passes

Known recurring warnings during build:

- Nuxt/Tailwind sourcemap warnings
- package deprecation warnings from current toolchain dependencies

These are not from app logic changes and were left as-is.

## Known Gaps / Good Next Steps

Best next implementation options:

1. Session history filters/search
   Useful once session count grows.
2. Refactor `app/pages/index.vue`
   It is becoming large and should likely be split into smaller components/composables.
3. Better reminder system
   Add multiple reminders, smarter reminder wording, or missed-goal nudges based on patterns.
4. More analytics
   Monthly insights, streak trends, or recovery-focused summaries.
5. Cloud sync / account system
   Only after the local-first flow feels stable.

## Suggested Refactor Plan

If continuing tomorrow, a strong engineering move would be:

1. extract dashboard sections into components
2. move local-storage state and actions into a composable
3. keep `sleep.ts` as the calculation layer
4. add small unit tests for sleep summary logic if test setup is introduced

## Resume Prompt For Tomorrow

Use something like:

> Read `Doc/Session_Handoff.md` and `Doc/Completed_Features.md`, inspect `app/pages/index.vue` and `app/lib/sleep.ts`, then continue implementation from the next recommended step.
