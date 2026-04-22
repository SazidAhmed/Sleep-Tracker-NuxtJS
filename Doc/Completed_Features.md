# Completed Features

## Implemented in the current app

1. **Local-first sleep tracking**
   The app stores sleep settings and sleep sessions in browser local storage, so it works without signup or backend setup.
2. **Daily sleep goal setting**
   Users can set a daily sleep target in hours, such as 7h or 8h.
3. **Optional prayer or wake anchor time**
   Users can set an anchor time for guidance, such as prayer time or a planned wake-up time.
4. **Add sleep sessions**
   Users can log each sleep block with a start datetime and end datetime.
5. **Edit existing sleep sessions**
   Logged sessions can be updated if the user entered the wrong time or wants to correct a session later.
6. **Delete sleep sessions**
   Logged sessions can be removed from the app.
7. **Automatic session validation**
   The app prevents invalid sessions where the end time is earlier than or equal to the start time.
8. **Calendar-day based sleep calculation**
   Sleep is calculated by calendar date, not by a fixed night-only assumption.
9. **Automatic midnight split handling**
   If one sleep session crosses midnight, the app automatically splits the sleep duration between the two dates.
10. **Today progress tracking**
    The dashboard shows how much sleep has been completed for the current day, the percentage of the goal reached, and how much sleep is still remaining.
11. **Dynamic sleep guidance**
    The app gives flexible guidance based on the remaining sleep target and the optional anchor time.
12. **Last session summary**
    The app shows the most recent sleep block with its duration and time range.
13. **7-day sleep history**
    The dashboard includes a recent 7-day summary with daily total sleep, goal comparison, completion status, and session count.
14. **7-day average sleep**
    The app calculates and shows the average sleep duration across the recent 7-day window.
15. **Goal completion window**
    The dashboard shows how many of the last 7 days reached the sleep goal.
16. **Monthly calendar view**
    The app includes a navigable monthly calendar that shows each day’s logged sleep total, sleep block count, and goal completion state.
17. **Monthly sleep summary**
    The monthly view shows total sleep for the selected month, number of completed goal days, and the average sleep duration across tracked days in that month.
18. **Month navigation**
    Users can move backward and forward between months to review past or upcoming calendar periods.
19. **Export backup**
    Users can export their current settings and sleep sessions as a JSON backup file.
20. **Import backup**
    Users can import a previously exported JSON backup file to restore settings and sleep sessions.
21. **Backup validation**
    The app validates imported backup data and rejects invalid files or invalid goal values.
22. **Weekly sleep chart**
    The dashboard includes a visual 7-day chart that compares daily sleep totals and highlights completed goal days.
23. **Monthly trend chart**
    The monthly view includes a compact day-by-day trend visualization for the selected month.
24. **Start sleep timer mode**
    Users can start a live sleep timer when they go to sleep without manually entering the start time.
25. **Stop and save active sleep session**
    Users can stop an active timer and save it directly as a normal sleep session in the session log.
26. **Cancel active sleep timer**
    Users can cancel an active timer if they started it by mistake and do not want to save it.
27. **Live running duration**
    The app shows the currently running sleep duration and the active session start time while timer mode is active.
28. **Sleep insights section**
    The dashboard includes a pattern-analysis section based on recent logs and daily summaries.
29. **Best and lowest day insights**
    The app identifies the strongest and weakest tracked sleep days from the recent weekly window.
30. **Most common sleep start time**
    The app analyzes logged sessions to surface the most frequent sleep start hour.
31. **Split-sleep and consistency insights**
    The app reports split-sleep frequency, average blocks per tracked day, and a weekly consistency score against the goal.
32. **Browser notification permission handling**
    The app can request browser notification permission and shows the current notification support and permission status.
33. **Daily sleep reminder settings**
    Users can set a reminder time and enable or disable one daily reminder for incomplete sleep goals.
34. **Automatic goal reminder**
    After the selected reminder time, the app can send a browser notification if the daily sleep goal is still incomplete.
35. **Once-per-day reminder protection**
    The app prevents duplicate reminders on the same calendar day after a notification has already been sent.
36. **Responsive dashboard UI**
    The app has a dashboard interface for desktop and mobile with sections for progress, history, charts, insights, monthly view, timer mode, reminders, settings, backup, and session logging.
37. **Production build verified**
    The current implementation builds successfully with `npm run build`.
