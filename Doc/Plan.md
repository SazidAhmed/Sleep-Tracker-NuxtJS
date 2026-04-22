I’d build this as a simple local-first web app with 4 core parts:

1. **Settings**
   * Set a daily sleep goal like **7h** or **8h**.
   * Set an optional prayer/wake anchor time, since your routine changes across months.
   * Store everything in local storage first so the app works without signup.
2. **Sleep Sessions**
   * Add each sleep block with **start** and **end** datetime.
   * Support both patterns:
     * one full night sleep like **9:00 PM -> 5:00 AM**
     * split sleep like **1:00 AM -> 5:00 AM** and **8:00 AM -> 12:00 PM**
   * Allow editing/deleting sessions because sleep logs often need correction.
3. **Daily Tracking Logic**
   * For each calendar date, total all sleep that belongs to that date.
   * Correctly split sessions across midnight.
     Example:
     * **9:00 PM -> 5:00 AM**
     * count **3h** for day 1 and **5h** for day 2
   * Show:
     * total slept today
     * remaining sleep to hit goal
     * whether goal is completed
     * recent daily history
4. **Dynamic Guidance**
   * Don’t assume sleep happens only at night.
   * Use your logged pattern plus optional prayer/wake time to generate suggestions like:
     * “You still need 2h 15m today”
     * “A second sleep block after prayer would complete your goal”
   * This keeps the app flexible when prayer time changes seasonally.

**Recommended MVP**
I’d start with this first version:

* Daily goal setting
* Add/edit/delete sleep sessions
* Today progress card
* Last 7 days summary
* Local persistence
* Split-sleep handling across midnight
* Optional prayer/wake time field for guidance

**Second Phase**
After MVP works well, we can add:

* monthly calendar view
* charts
* streaks
* reminders
* automatic “start sleep / stop sleep” timer mode
* export/import backup
* cloud sync

**Tech Choice**
Since your workspace is **Vue**, I’d recommend:

* **Vue 3 + Vite**
* local storage for data
* clean single-page dashboard UI

**Important Product Decision**
We should define one rule clearly before building:

* Should the app count sleep by **calendar date** (**12:00 AM -> 11:59 PM**)?
* Or by a **custom sleep day boundary** like after Fajr/prayer?

This matters because for your routine, a session like **1 AM -> 5 AM** may logically belong to the “previous night,” even though technically it is on the new calendar date.

If you want, next I can turn this into:

1. a feature list with exact screens, or
2. a database/data model and UI flow for the Vue app.
