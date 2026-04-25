# Sleep Tracker - Improvement Plan

## Phase 1: Quick Wins (High Value, Low Effort) ✅ COMPLETE

### UX Polish
- [ ] **Onboarding flow** - First-time tutorial for new users explaining split-sleep concept
- [x] **Empty states** - Better illustrations/messaging when no data exists
- [ ] **Pull-to-refresh** - Swipe down to refresh dashboard data
- [x] **Undo delete** - Snackbar with undo option after swipe-to-delete

### Data Improvements
- [x] **Session templates** - Quick-log common sleep patterns (e.g., "Night Sleep" 10PM-5AM)
- [x] **Duplicate session** - Copy an existing session as starting point for new entry
- [ ] **Bulk edit tags** - Select multiple sessions to add/remove tags
- [ ] **Default tag suggestions** - Auto-suggest tags based on time of day

## Phase 2: Core Features (High Value, Medium Effort) 🚧 PARTIAL

### Smart Enhancements ✅
- [x] **Optimal wake time** - Suggest wake times based on 90-minute sleep cycles from session start
- [ ] **Sleep efficiency** - Optional "time in bed" vs "actual sleep time" tracking
- [ ] **Pattern detection** - Alert when deviating from established sleep schedule
- [ ] **Goal achievement forecast** - "At current rate, you'll hit goal by 10 PM"

### Analytics Expansion
- [ ] **Weekly/Monthly reports** - PDF export with charts and insights
- [ ] **Compare periods** - Side-by-side week vs week, month vs month
- [ ] **Sleep start time trends** - Track if bedtime is getting earlier/later
- [ ] **Tag effectiveness** - Which tags correlate with highest quality sleep

### Data Sync & Backup
- [ ] **Automatic daily backup** - Auto-export JSON to Downloads folder
- [ ] **Session recovery** - Restore interrupted timer after browser crash/close
- [ ] **Data validation** - Repair corrupted localStorage automatically

## Phase 3: Integrations (High Value, Higher Effort) - SKIPPED

Per user request, skipping health platform integrations:
- ❌ Apple Health export
- ❌ Google Fit export  
- ❌ Cloud sync option

### Completed from this phase ✅
- [x] **Bedtime reminders** - Notification when approaching usual sleep time
- [x] **Wind-down alerts** - 30 min before target bedtime
- [x] **Goal completion nudges** - "You need 2 more hours today" at 8 PM
- [x] **Missed goal follow-up** - "Yesterday was tough, aim for 7 hours today"
- [x] **PWA / installable** - Add to home screen prompt with offline support

## Phase 4: Advanced Features (Lower Priority)

### Technical
- [ ] **Unit tests** - Test core sleep calculation functions
- [ ] **E2E tests** - Playwright tests for critical user flows
- [ ] **Virtual scrolling** - For session lists when >100 entries
- [ ] **Data compression** - Compress localStorage when it grows large

### Accessibility
- [ ] **Screen reader support** - ARIA labels on charts and interactive elements
- [ ] **Reduced motion** - Respect prefers-reduced-motion setting
- [ ] **Colorblind-friendly** - Alternative color schemes for heatmap/charts

### Localization
- [ ] **i18n framework** - Multi-language support structure
- [ ] **12h/24h format** - Time format preference in settings
- [ ] **RTL support** - Right-to-left language compatibility

## Recently Implemented (This Session)

- [x] Empty States component with icons and CTAs
- [x] Session Templates - create, use, delete templates with duration/quality/tags
- [x] Duplicate Session - copy button in session log
- [x] Undo Delete - toast with 5-second undo window
- [x] Optimal Wake Time - 90-minute cycle suggestions in timer
- [x] Smart Reminders - bedtime, wind-down, goal nudge, missed goal follow-up
- [x] PWA Install Prompt - banner on dashboard with dismiss

## Notes

Skipped health platform integrations per user request. Remaining work: Onboarding flow, PDF reports, auto-backup, session recovery.
