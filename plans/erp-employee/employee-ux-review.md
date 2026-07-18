# PRISM Employee/HR/Job Tracking — Frontend UX Review

**Reviewer Role:** Frontend UX Engineer
**Date:** 2026-03-31
**Plan Under Review:** [serene-meandering-prism.md](serene-meandering-prism.md)
**Existing Context:** React 19 + Vite + Tailwind, 45 pages, WorkspacePrimitives pattern library

---

## Executive Summary

The implementation plan is architecturally sound and phases correctly (backend → auth → job clock UI), but has **7 CRITICAL UX gaps** and **9 HIGH-severity interaction design issues** that will cause shop floor usability problems. The plan **lacks real-time synchronization strategy**, **offline resilience**, **touch target sizing for gloved hands**, and **explicit accessibility compliance for noisy shop floor environments**.

Key recommendation: **Insert new Phase 2.5 (Mobile-First UX Hardening)** before proceeding to job clock implementation. Current design will fail in-situ without it.

---

## CRITICAL FINDINGS

### CRIT-1: No Real-Time Synchronization Strategy Defined

**Location:** Plan Section 4B (ActiveJobsDashboard)
**Text:** "Polls backend every 5s OR uses WebSocket for real-time updates"
**Problem:**
- "OR" is a decision deferred to implementation, not a strategy. Choosing wrong will either:
  - **Poll every 5s:** 5-second stale data means a stopped job won't show as paused for up to 5 seconds. Operator may click pause again thinking it didn't work.
  - **WebSocket:** Requires persistent connection in spotty shop floor WiFi. Dropped connection = frozen UI with no fallback.
- No mention of: connection status indicator, auto-reconnect, offline queue, conflict resolution when resuming after network outage.
- **Impact:** Multi-job state desynchronization. Operator pauses Job A, starts Job B. 3-second WiFi hiccup. Backend sees Job A still running, Job B starting overlaps. Cost and time tracking corrupted.

**Recommendation:**
- **Use hybrid: WebSocket + 10s fallback poll + offline queue.**
  - WebSocket for rapid updates (latency <500ms for pause/resume).
  - Fallback to 10s poll if WS drops (more forgiving than 5s for WiFi).
  - Queue pause/resume actions client-side when offline, sync when reconnected.
  - Show persistent "⚠ Offline Mode" banner when disconnected.
- Document in Phase 4B exactly when each mode engages.

---

### CRIT-2: No Offline Resilience Plan (Shop Floor WiFi is Spotty)

**Location:** Entire plan, missing section
**Problem:**
- Factory WiFi drops during shift changes, near metal machines, or in dead zones.
- Current API client (`requestCore.ts`) detects offline state but has **no recovery strategy for in-flight operations.**
- Example scenario:
  1. Operator taps "Pause Job A" while WiFi drops mid-request.
  2. `jobTimePause()` fails with `ApiError(0, 'offline')`.
  3. No indication whether backend got the request or not.
  4. Operator taps pause again → duplicate pause? Or succeeds the first time?
  5. Cost data now out of sync.
- **Impact:** Data corruption, doubled labor costs, operator confusion.

**Recommendation:**
- **Add IndexedDB cache layer** in ActiveJobsDashboard:
  - Cache latest job state (id, status, elapsed_seconds, paused_at).
  - When API call fails with "offline" error, store pause/resume in local queue with timestamp.
  - On reconnect, sync queue in order. If backend already processed, skip. If not, replay.
- **Show explicit queue status:**
  - When offline: "3 actions pending sync"
  - When syncing: "Syncing 3 actions..."
  - When synced: "All actions synced ✓"
- **Add conflict resolution:**
  - If operator pauses a job offline, reconnects, backend shows it already paused → silently accept backend state.
  - If operator pauses a job offline, but backend shows it completed → show warning modal before accepting.

---

### CRIT-3: Multi-Job Pause/Resume UX Completely Undefined

**Location:** Plan Section 4B (ActiveJobsDashboard)
**Text:** "Each job card shows: Play/Pause button — toggles individual job. Auto-pauses previous running job when starting new one (matches engine behavior)"
**Problem:**
- **No UI feedback for auto-pause.** Operator starts Job B. Job A silently pauses. Operator doesn't see it pause. Later checks timecard and is confused why Job A shows 15 minutes of dead time.
- **No pause reason capture.** If Job A is paused because Job B started, vs. paused because operator hit a button, there's no distinction. Cost analysis has no context.
- **No pause explanation to operator.** "You started Job B. Job A was automatically paused. Elapsed: 47m 22s. Cost so far: $18.75." ← This toast/modal is missing from the plan.
- **No resume behavior clarity.** Can operator resume Job A while Job B is running (dual running jobs)? Plan says "auto-pauses previous" but doesn't define "previous." Is it LIFO? Or just the one you click?
- **Gloved hand interaction gap:** If operator is wearing gloves, the pause/resume button area is tiny (ActionButton is 12px text, ~48px tall). Gloves need 60-72px touch targets. Plan doesn't account for this.

**Recommendation:**
- **Redesign job card:**
  ```
  Job 2401 (Milling) — Status: Running
  ┌─────────────────────────────────────┐
  │ Elapsed: 00:47:22                    │  Large, 16px text, high contrast
  │ Paused by: Job 2402 start (10s ago)  │  Context for why it paused
  │                                       │
  │ ┌────────────┐  ┌────────────┐      │
  │ │  [RESUME]  │  │ [COMPLETE] │      │  60px min height, 16px text
  │ └────────────┘  └────────────┘      │  Glove-friendly
  │ Cost so far: $18.75 (47m × $24/hr)  │  Transparent calculation
  └─────────────────────────────────────┘
  ```
- **Show auto-pause toast:** "Job 2401 paused. Started Job 2402." (2.5s toast at top of page)
- **Add pause reason enum:** `paused_by: 'user' | 'auto_new_job' | 'break' | 'machine_down'`
  - Capture reason when pausing (required dropdown).
  - Show in history: "Paused for machine maintenance (12m)"
- **Clarify multi-running behavior:**
  - Per engine: only ONE job can be "running" at a time.
  - Other jobs are paused or completed.
  - Button states: "PAUSE" (if running), "RESUME" (if paused), "COMPLETE" (stop and lock).
  - Trying to resume while another job is running → show inline message: "This will pause Job 2402. OK?"

---

### CRIT-4: No Confirmation Dialog for Clock-Out with Running Jobs

**Location:** Plan Section 4A (ShiftClockWidget)
**Text:** "Clock In / Clock Out button"
**Problem:**
- Operator is at end of shift, taps "Clock Out."
- Unfinished job is still running (5 minutes of elapsed time).
- API processes clock-out successfully.
- All active jobs snap to "completed" with no warning.
- Operator left at 4:55 PM but system shows they clocked out at 5:05 PM (10 minutes of unrecorded time on that job).
- **Impact:** Timecard inaccuracy, false cost attribution.

**Recommendation:**
- **Before clock-out, check for active/paused jobs:**
  ```javascript
  async function handleClockOut() {
    const activeOrPausedJobs = shiftStatus.jobs.filter(j =>
      j.status === 'running' || j.status === 'paused'
    );

    if (activeOrPausedJobs.length > 0) {
      showConfirmDialog({
        title: 'Incomplete Jobs',
        message: `You have ${activeOrPausedJobs.length} active job(s):
          ${activeOrPausedJobs.map(j => `• ${j.job_id}: ${formatElapsed(j.elapsed_seconds)}`).join('\n')}

          Complete or pause these before clocking out?`,
        buttons: [
          { label: 'Complete All', action: 'completeAll' },
          { label: 'Pause All & Clock Out', action: 'pauseAll' },
          { label: 'Cancel', action: 'cancel' },
        ]
      });
      return;
    }
    // proceed with clock-out
  }
  ```

---

### CRIT-5: No Accessibility Plan for Shop Floor (Noisy, Bright, Gloved Hands)

**Location:** Entire plan, missing section
**Problem:**
- WorkspacePrimitives use Tailwind's default color palette (e.g., `text-slate-300` on `bg-slate-950`).
- In bright factory lighting (500-2000 lux), white on dark gray becomes unreadable.
- ActionButton is 48px tall, fine for fingers. Gloved hands need 60-72px (ISO 9355-1).
- No mention of: WCAG 2.1 AA compliance, high-contrast mode, large touch targets, audio/haptic feedback for gloved operation.
- Status colors (emerald for running, amber for paused) rely on color alone. Color-blind operators (8% male, 0.4% female) can't distinguish.

**Recommendation:**
- **Create ShopFloorPrimitives component set** (inherits from WorkspacePrimitives):
  ```
  ShopFloorButton — 72px tall, 18px text, contrast ratio ≥ 7:1 (AAA)
  ShopFloorStatusBadge — uses icons + text, not color alone (✓ for running, ⏸ for paused)
  ShopFloorInput — 16px text, 8px padding, focus ring ≥ 3px
  ShopFloorAlert — 20px text, toast at top (not bottom), auto-dismiss 5s
  ```
- **WCAG 2.1 AA minimum:**
  - Foreground / background contrast ≥ 4.5:1 for text.
  - ≥ 7:1 for UI controls in factory lighting.
  - All interactive elements: min 60px height, min 44px width.
  - Don't rely on color alone (use icons, text, patterns).
- **Add dark mode with factory lighting preset:**
  - Option 1 (Default): white on dark, 4.5:1 contrast (office lighting).
  - Option 2 (Factory): pure white on dark charcoal, 7:1+, less glare.
  - System detects time of day, suggests Factory mode at 6 AM.
- **Haptic feedback for gloved operation:**
  - Vibrate phone 200ms when pause/resume succeeds (feels like button press through gloves).
  - Use `navigator.vibrate([100])` for confirmation.

---

### CRIT-6: No Error Recovery Strategy for API Failures During Job State Changes

**Location:** Plan Section 4E (API client additions), Section 4B (dashboard handlers)
**Problem:**
- `jobTimePauseReal()` fails mid-request (network dies, server error).
- UI sets loading spinner, shows error toast.
- Operator taps "Retry Pause."
- If backend processed the first request but response was lost, second request could:
  - Fail with "job already paused" → operator sees error, thinks it didn't work.
  - Succeed idempotently → correct, but no feedback to operator.
  - Fail with different error → operator confused.
- **No explicit idempotency keys or saga pattern.**
- **Impact:** Operator retry loops, stale UI state, trust erosion.

**Recommendation:**
- **Add idempotency to API layer:**
  ```typescript
  // client.ts
  async function jobTimePauseReal(params: {
    employee_id: string;
    job_id: string;
    reason?: string;
  }, idempotencyKey: string) {
    const headers = {
      'Idempotency-Key': idempotencyKey, // UUID for this pause action
    };
    return request('POST', '/erp/job-time-pause', params, { headers });
  }

  // Usage in component:
  const pauseKey = useRef(crypto.randomUUID());
  async function handleJobPause() {
    try {
      await jobTimePauseReal({...}, pauseKey.current); // same key for retries
    } catch (e) {
      // Retry uses same key → backend deduplicates
    }
  }
  ```
- **Add retry logic with exponential backoff** (3 retries, 500ms → 1s → 2s):
  ```typescript
  async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (e) {
        if (i === maxRetries - 1 || !isRetryableError(e)) throw e;
        await sleep(500 * Math.pow(2, i));
      }
    }
    throw new Error('Exhausted retries');
  }
  ```
- **Show persistent retry UI:**
  - Error toast: "Pause failed. [Retry] [View Details]"
  - Retry button remains until successful or user dismisses.

---

### CRIT-7: Auth Context Missing, But Plan Assumes It

**Location:** Plan Section 2A-2D (Auth & RBAC)
**Problem:**
- Plan defines clearance_level (shop_floor, lead, hr_manager, admin) and routes to filter by it.
- Existing codebase has **no AuthContext** (grep returned 0 results for "AuthContext").
- Current API client uses Bearer token but **no login endpoint** in plan or existing code.
- Layout.tsx uses OperatingSystemProvider but **doesn't check clearance levels in sidebar rendering** (no minClearance field in NAV_SECTIONS).
- **If Phase 2 is skipped,** all routes are open (everyone sees /employees, /payroll, /hr-compliance).
- **If implemented naively,** AuthContext becomes async boundary → all child components must handle loading/error.

**Recommendation:**
- **Create AuthContext immediately (Phase 1, not Phase 2):**
  ```typescript
  // contexts/AuthContext.tsx
  interface AuthContextType {
    user: Employee | null;
    clearanceLevel: 'shop_floor' | 'lead' | 'hr_manager' | 'admin' | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login(username: string, password: string): Promise<void>;
    logout(): void;
    error: string | null;
  }

  export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Employee | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // On mount, check localStorage token
      const token = localStorage.getItem('prism_token');
      if (token) {
        setApiKey(token);
        // Fetch user profile to get clearance_level
        listEmployees().then(...); // or dedicated /me endpoint
      }
      setIsLoading(false);
    }, []);

    return <AuthContext.Provider value={{...}}>{children}</AuthContext.Provider>;
  }
  ```
- **Wire into Layout immediately:**
  ```typescript
  // Layout.tsx
  const auth = useAuth();
  const visibleSections = NAV_SECTIONS.filter(section =>
    !section.minClearance ||
    isClearanceAllowed(auth.clearanceLevel, section.minClearance)
  );
  ```
- **Add ProtectedRoute wrapper:**
  ```typescript
  export function ProtectedRoute({
    children,
    minClearance
  }: { children: ReactNode; minClearance: string }) {
    const auth = useAuth();
    if (!auth.isAuthenticated) return <Navigate to="/login" />;
    if (!isClearanceAllowed(auth.clearanceLevel, minClearance)) {
      return <AccessDeniedPage clearance={auth.clearanceLevel} />;
    }
    return children;
  }
  ```
- **Create LoginPage in Phase 1 (not Phase 2):** Shop floor employees can't access clock page without login.

---

## HIGH-SEVERITY FINDINGS

### HIGH-1: Touch Target Sizing Not Addressed for Gloved Hands

**Location:** Plan, entire UI section
**Problem:** WorkspacePrimitives ActionButton defaults to:
```
className="rounded-2xl px-5 py-3 text-sm font-semibold"
```
This is ~48px tall. With a gloved hand (typical work glove adds 5-10mm of padding), effective touch area shrinks. ISO 9355-1 recommends **minimum 60-72px for gloved operation.**

**Current:** Plan doesn't mention touch target sizing.
**Impact:** Operators misclick buttons, pause wrong job, lose focus mid-shift.

**Recommendation:**
- Create `ShopFloorButton` variant:
  ```typescript
  export function ShopFloorButton(props: ...) {
    return (
      <button className="rounded-2xl px-6 py-4 text-base font-semibold min-h-[72px] min-w-[72px]">
        {props.children}
      </button>
    );
  }
  ```
- Use in all job card controls: pause, resume, complete.
- Document in component library: "All shop floor controls must be ≥72px to accommodate gloved hands."

---

### HIGH-2: No Loading States or Skeleton UI During Multi-Job Fetch

**Location:** Plan Section 4B (ActiveJobsDashboard)
**Text:** "Polls backend every 5s OR uses WebSocket for real-time updates"
**Problem:**
- Initial load: "loading" state, but no skeleton.
- Operator sees blank card area for 2-5 seconds.
- Operator thinks app froze.
- No indication that data is coming.

**Recommendation:**
- **Add Skeleton loader for job cards:**
  ```tsx
  {isLoading ? (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <SkeletonJobCard key={i} />
      ))}
    </div>
  ) : (
    <div className="space-y-4">
      {activeJobs.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  )}
  ```
- **Persist last known state during refetch:**
  - Don't blank out job cards on 5s poll refresh.
  - Show cached data with "updating..." indicator.
  - Merge new data in place, animate changes.

---

### HIGH-3: Pause Reason Dropdown UX Not Designed

**Location:** Plan Section 4B (ActiveJobsDashboard)
**Text:** "Play/Pause button — toggles individual job"
**Problem:**
- Plan says add `pause_reason` to Employee model (CRIT-3 rec).
- But **no UI designed for capturing reason.**
- If pause button opens dropdown, it's 3 taps (button → dropdown → option).
- At shift end with 5 running jobs, operator clicks pause on each → 15 taps.
- **With gloves, takes 2+ minutes for 5 jobs.**

**Recommendation:**
- **Two-tier UX:**
  1. **Tap pause button** → confirms pause (1 tap), stores as `reason: 'user'` (default).
  2. **Long-press pause button** → opens reason selector (for machine downtime, break, etc.).
  - Long-press UX: Show tooltip "Hold for reason" on first hover.
- **Reason selector modal:**
  ```
  Why pause Job 2401?
  ○ Operator choice
  ◉ Machine maintenance (auto-selected if past 60m runtime)
  ○ Shortage of material
  ○ Employee break
  ○ Other

  [Continue] [Cancel]
  ```

---

### HIGH-4: Cost Calculation Transparency Missing from Job Cards

**Location:** Plan Section 4B (ActiveJobsDashboard)
**Text:** "Cost-so-far (hours × employee rate)"
**Problem:**
- Card shows "Cost so far: $18.75" but operator doesn't know:
  - Is this their hourly rate or shop rate?
  - Is it locked in or changing if they're re-classified?
  - What if job was paused for 10 minutes (does cost keep accruing)?
- **No tooltip or "why" explanation.**
- **Different on timecard review:** "Actual cost: $16.50 (after adjustment for downtime)." Operator confused why card said $18.75 but timecard says $16.50.

**Recommendation:**
- **Add info icon + tooltip:**
  ```
  Cost so far: $18.75
  (47 minutes × your rate $24.00/hr)
  (paused time not included)
  ```
- **Show rate source:**
  ```
  Labor rate: $24.00/hr (from your profile)
  [Update Rate in Settings]
  ```
- **Clarify pause behavior:**
  - "Paused jobs don't accrue cost" (bold in UI).
- **Add cost breakdown modal** (tap total):
  ```
  Job 2401 Cost Breakdown

  Operating:  45m 30s @ $24.00/hr = $18.20
  Paused:     1m 52s (not included)

  Total:      $18.20
  ```

---

### HIGH-5: No Visual Indication of Shift Status in ShiftClockWidget

**Location:** Plan Section 4A (ShiftClockWidget)
**Text:** "Compact bar at top of employee pages showing: Current shift status (clocked in/out)"
**Problem:**
- Operator is 3 pages deep in the app (e.g., on Messages page).
- They forget if they're clocked in.
- ShiftClockWidget is at the top but:
  - No visual prominence (not sticky, not high-contrast).
  - Status is text-only ("Clocked in" vs. "Clocked out").
  - No indicator color or icon.

**Recommendation:**
- **Make sticky at top of viewport:**
  ```tsx
  <div className="sticky top-0 z-40 bg-gradient-to-b from-slate-900 to-transparent">
    <ShiftClockWidget ... />
  </div>
  ```
- **Use status color + icon:**
  ```
  ✓ Clocked In (Emerald)    vs.    ○ Clocked Out (Slate)
  ```
- **Show elapsed shift time prominently:**
  ```
  Shift: 08:00 AM - now (6h 32m elapsed)
  3 active jobs
  [Clock Out]
  ```
- **Add visual alarm at 8h (end of typical shift):**
  - Background turns amber at 8h.
  - Shows "Overtime: +32 minutes" at 8.5h.

---

### HIGH-6: No Handling of Shift State Sync Across Multiple Devices

**Location:** Plan Section 4, entire implementation
**Problem:**
- Operator clocks in on kiosk at 6 AM.
- Goes to break, uses tablet to check schedule.
- Tablet shows "Clocked out" (stale data).
- Operator confused about actual shift status.
- Clocks in again from tablet → double clock-in error.

**Recommendation:**
- **Broadcast shift events via WebSocket:**
  - When clock-in/out succeeds, server sends event to all active sessions for that employee.
  - All tabs/devices get realtime update.
- **Sync on tab focus:**
  ```typescript
  useEffect(() => {
    const handleFocus = () => {
      // Re-fetch shift status from backend
      shiftClockIn(currentEmployee); // or dedicated /shift-status endpoint
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);
  ```
- **Warn on duplicate clock-in:**
  ```
  You already clocked in at 06:00 AM today.
  Clock in again? [Confirm] [Cancel]
  ```

---

### HIGH-7: Confirmation Modal UX Needs Pattern

**Location:** Plan Section 4B, 4E (no explicit modal design)
**Problem:**
- Plan mentions modals (JobSelector, clock-out confirmation) but **no consistent pattern defined.**
- Each modal could have different layout, button order, backdrop handling.
- On touch devices, accidental modal dismissal is common.

**Recommendation:**
- **Create ConfirmDialog primitive:**
  ```typescript
  interface ConfirmDialogProps {
    title: string;
    message: string;
    primaryAction: { label: string; onClick: () => void; tone?: 'cyan' | 'rose' };
    secondaryAction?: { label: string; onClick: () => void };
    isDangerous?: boolean; // for clock-out, job completion
    isLoading?: boolean;
  }

  // Renders:
  // - Large title (24px)
  // - Message (16px, high contrast)
  // - Primary button (72px tall, shop floor size)
  // - Secondary button
  // - Backdrop: clicks outside do NOT dismiss (no accidental closes)
  ```
- **Use for clock-out warning, job completion, clearance access denied.**

---

### HIGH-8: Mobile Responsiveness Strategy Missing for Tablets

**Location:** Plan, entire UI section
**Problem:**
- Operators use tablets at the machine (typical: 10-inch iPad in landscape).
- Plan mentions "tablets at the machine" but **no responsive breakpoints defined.**
- ActionButton is 48px on desktop, still 48px on 1280px wide tablet screen.
- Job card layout: 3 columns on desktop, becomes unreadable on tablet (cards squeeze).

**Recommendation:**
- **Define three breakpoints for shop floor:**
  ```
  Mobile (< 600px):      1 column, big buttons, stacked layout
  Tablet (600-1200px):   2 columns, balanced spacing
  Desktop (> 1200px):    3 columns, sidebar navigation
  ```
- **Tablet-specific CSS:**
  ```tsx
  // Tailwind: md:grid-cols-2 lg:grid-cols-3
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {activeJobs.map(job => <JobCard key={job.id} job={job} />)}
  </div>
  ```
- **Test with iPad in landscape (1024 × 768).**

---

### HIGH-9: No Visual Hierarchy Between Running, Paused, Completed Jobs

**Location:** Plan Section 4B (ActiveJobsDashboard)
**Text:** "Each job card shows: Live elapsed timer (green when running, amber when paused)"
**Problem:**
- Plan uses color tone (emerald, amber, slate) to indicate status.
- But **no hierarchy by job position or prominence.**
- Operator has 5 jobs: 2 running, 2 paused, 1 completed.
- All cards are same size, same visual weight.
- Operator can't quickly identify "which job is running NOW?"
- **Takes 3-5 seconds to find, operator loses time.**

**Recommendation:**
- **Reorder by status:**
  ```
  ┌─ RUNNING JOBS ────────────────────┐
  │ Job 2401 [PAUSE] [COMPLETE]       │  Prominent border, larger
  │ Job 2405 [PAUSE] [COMPLETE]       │
  ├─ PAUSED JOBS ─────────────────────┤
  │ Job 2403 [RESUME]                 │  Medium opacity, smaller
  │ Job 2404 [RESUME]                 │
  ├─ COMPLETED JOBS ──────────────────┤
  │ Job 2402 (completed 2h 13m ago)   │  Grayed out, small
  └───────────────────────────────────┘
  ```
- **Or use floating action for running jobs:**
  ```
  Running: Job 2401 [47m 22s] [PAUSE] [COMPLETE]

  Paused Jobs (2)
  - Job 2403
  - Job 2404
  ```

---

## MEDIUM-SEVERITY FINDINGS

### MED-1: No Offline-First Strategy for JobSelector Modal

**Location:** Plan Section 4C (JobSelector modal)
**Text:** "Search/select from active jobs in the system"
**Problem:**
- Modal fetches list of active jobs from backend on open.
- If network is down, modal shows empty (or error) → operator can't start a job.
- **In factory, this is a blocker.**

**Recommendation:**
- Cache active jobs list locally (refresh every 1 min when clocked in).
- If offline, show cached list with label: "Last updated 2 minutes ago"
- If no cache, show message: "No jobs loaded. Check connection and refresh."

---

### MED-2: No Undo for Job Completion

**Location:** Plan Section 4B (ActiveJobsDashboard)
**Text:** "Stop button — completes the job time entry"
**Problem:**
- Operator clicks "Complete" to end Job 2401 (took 1h 12m, cost $28.80).
- Realizes immediately they clicked the wrong job.
- No undo. Job is locked as completed.
- Must escalate to HR to adjust timecard.

**Recommendation:**
- **Add 5-second undo toast:**
  ```
  Job 2401 completed (1h 12m, $28.80) [Undo] [View]
  ```
- **Implement soft delete:** Job isn't locked until 30 seconds have passed.
- **Add "reopen" action in timecard:** If operator realizes mistake later, show "Reopen job" (only if within same shift).

---

### MED-3: No Capacity Planning Feedback for Starting New Jobs

**Location:** Plan Section 4C (JobSelector modal)
**Text:** "On submit: calls `job_time_start` API"
**Problem:**
- Operator starts Job 2410 on machine M5.
- Backend accepts it, but machine M5 is already 150% loaded.
- No feedback to operator that they've created a bottleneck.
- Manufacturing manager later discovers shift is over-scheduled.

**Recommendation:**
- **Show capacity warning** when selecting machine:
  ```
  Machine M5 (Milling)
  Current load: 120%  ⚠ Over capacity

  Starting this job will push load to 145%.

  Alternative machines:
  ○ M7 (Milling) - 45% load
  ○ M9 (Milling) - 60% load

  [Confirm Anyway] [Choose Alternative] [Cancel]
  ```
- **Wire to CapacityPlanningEngine** (exists in backend).

---

### MED-4: No Department/Machine Change Without Manager Approval

**Location:** Plan Section 4C (JobSelector modal)
**Text:** "Machine selection dropdown (from machine registry)"
**Problem:**
- Operator selects Machine M5 for Job 2401.
- Later decides to use M7 instead.
- No audit trail, no manager notification.
- Scheduling becomes inaccurate.

**Recommendation:**
- **If job is already in progress** and operator tries to change machine:
  ```
  Machine changed: M5 → M7
  This requires supervisor approval.

  Supervisor contacted. They'll approve/deny in ⏱ 2 minutes.

  [Waiting...] [Proceed Without Change] [Cancel]
  ```
- **Log machine changes with timestamp, user, reason.**

---

### MED-5: No Export of Daily Timecard for Payroll

**Location:** Plan Section 5B (Enhance TimecardPage)
**Text:** "Export to CSV for payroll processing"
**Problem:**
- Plan mentions CSV export but **no export button or design.**
- HR manager needs to export at end of shift to payroll system.
- No format specified.

**Recommendation:**
- **Add export button to TimecardPage:**
  ```
  [Export to CSV] [Email to Payroll] [Print]
  ```
- **CSV format:**
  ```
  Employee,Date,JobID,Operation,StartTime,EndTime,ElapsedHours,HourlyRate,TotalCost,PauseReason
  John Doe,2026-03-31,2401,Milling,08:00,09:45,1.75,24.00,42.00,None
  ```

---

### MED-6: Polling Interval (5s) Causes Visible Stutter on Slow Networks

**Location:** Plan Section 4B, 4E
**Text:** "Polls backend every 5s"
**Problem:**
- 5-second polling interval means 1 request every 5 seconds.
- On a 2 Mbps factory WiFi with latency >500ms, request takes 1.5s.
- Every 5 seconds, UI briefly stalls while fetching.
- Operator notices "hiccup" and loses trust in real-time feel.

**Recommendation:**
- **Use 10-second polling interval (default) + WebSocket fallback.**
- **Show loading indicator discretely (not spinner):** subtle opacity change on cards.
- **Cache aggressively:** don't refetch if data is <1 minute old.

---

### MED-7: No Haptic Feedback for Confirmation on Tablets

**Location:** Plan Section 4, entire implementation
**Problem:**
- Operator using tablet (no physical home button) to pause job.
- No tactile feedback.
- Operator taps button, unsure if it registered.
- Taps again → duplicate pause.

**Recommendation:**
- **Add haptic feedback on success:**
  ```typescript
  async function handleJobPause() {
    try {
      await jobTimePause(...);
      // Haptic confirmation
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]); // 50ms vibration, 50ms pause, repeat
      }
      showToast('Job paused');
    } catch (e) {
      // Different haptic for error
      navigator.vibrate([200]); // long vibration = error
    }
  }
  ```

---

### MED-8: No Accessibility Testing Plan

**Location:** Entire plan, missing section
**Problem:**
- Plan doesn't mention WCAG 2.1 compliance testing.
- No mention of keyboard navigation, screen reader support, high-contrast mode.
- Deployed without audit = inaccessible for employees with disabilities.

**Recommendation:**
- **Add to Verification section:**
  ```
  4. **Accessibility:**
     - Run axe DevTools on all new pages (zero violations).
     - Test keyboard navigation: Tab through all controls, Enter to activate.
     - Test with screen reader (NVDA on Windows): all labels readable.
     - Test with Windows high-contrast mode: text readable.
     - Test with 200% zoom: layout doesn't break.
  ```

---

### MED-9: Sidebar Filtering by Clearance Not Wired in Layout

**Location:** Plan Section 2D (Filter sidebar navigation by clearance)
**Text:** "In Layout.tsx sidebar rendering, filter by user's clearance_level"
**Problem:**
- Plan says to add `minClearance` field to NAV_SECTIONS.
- But Layout.tsx **already renders** all 53 pages unconditionally (see line 10 import).
- If AuthContext is built but Layout isn't updated, all routes remain public.
- Shop floor employee can still navigate to /employees page (no enforcement).

**Recommendation:**
- **In Layout.tsx, immediately after getting clearance:**
  ```typescript
  const auth = useAuth();
  const visibleSections = useMemo(
    () => NAV_SECTIONS.filter(section =>
      !section.minClearance || canAccess(auth.clearanceLevel, section.minClearance)
    ),
    [auth.clearanceLevel]
  );
  ```
- **Test:** Log in as shop_floor user, verify /employees is not in sidebar.

---

## ARCHITECTURE & WIRING NOTES

### Current Auth State (Problematic)

**API client (H:\prism\mcp-server\web\src\api\client.ts):**
- Has `setApiKey()` and Bearer token support ✓
- **No login endpoint** ✗
- **No token refresh logic** ✗
- API key is set but never cleared (no logout)

**Layout.tsx:**
- Uses OperatingSystemProvider ✓
- **No clearance check in sidebar** ✗
- **No auth state visible** ✗

**Existing pages:**
- ShopFloorClockPage uses `listEmployees()` with fixture data fallback ✓
- EmployeeDirectoryPage uses real API calls ✓
- **No auth guards on routes** ✗

**Recommendation:**
- Phase 1: Add login endpoint to backend + AuthContext frontend.
- Phase 2: Wire clearance into Layout + routes.
- Phase 3: Build employee/HR features.

---

### Multi-Job Pause/Resume Sequencing

**Per plan (Section 4B):**
- "Auto-pauses previous running job when starting new one"
- But which job is "previous"?
- If Job A running, Job B paused:
  - Start Job C → does it pause A or B?
  - Current engine code likely just sets all to paused, one to running.
  - Frontend needs clarity: **only ONE job can be running at a time.**

**Recommendation:**
- Document in ActiveJobsDashboard component:
  ```
  /**
   * Multi-Job Rules (per TimeClockEngine):
   * - Only ONE job can have status='running' at a time.
   * - Starting a new job auto-pauses the currently running job.
   * - Pause reason defaults to 'user' (or 'auto_new_job' if auto).
   * - Resuming a paused job auto-pauses others.
   * - Completing a job locks it (no resume).
   */
  ```

---

## COMPONENT LIBRARY GAPS

**WorkspacePrimitives** (existing):
- ✓ ActionButton, StatusPill, PanelCard, Field, Input, Select
- ✓ Designed for office/desktop use
- ✗ No glove-friendly variants (60+ px)
- ✗ No high-contrast factory mode
- ✗ No shop floor specific components

**Need to add:**
```typescript
// ShopFloorPrimitives.tsx (NEW)
export function ShopFloorButton(props) { /* 72px tall */ }
export function ShopFloorStatusBadge(props) { /* icon + text, not just color */ }
export function ShopFloorAlert(props) { /* toast at top, 5s auto-dismiss */ }
export function ShopFloorConfirmDialog(props) { /* no outside click dismiss */ }
export function ShopFloorSkeleton(props) { /* for loading states */ }
```

---

## TESTING REQUIREMENTS (ADDED)

**Manual Testing Flow (from plan, enhanced):**

1. **Auth & Navigation:**
   - [ ] Login as shop_floor user → see only shop floor pages in sidebar.
   - [ ] Login as hr_manager → see /employees, /payroll, /hr-compliance.
   - [ ] Logout → redirected to /login, token cleared.

2. **Multi-Job Clock (CRITICAL):**
   - [ ] Clock in → shift status shows "Clocked In."
   - [ ] Start Job A (Milling) → card shows running timer, status emerald.
   - [ ] Start Job B (Drilling) → Job A auto-pauses (amber), toast shows "Job A paused."
   - [ ] Pause Job A → timer stops, no change in clock-out state.
   - [ ] Resume Job A → Job B auto-pauses.
   - [ ] Complete Job A → locked, can't resume.
   - [ ] Clock out with Job B running → warning modal shows "Complete Job B first?"
   - [ ] Verify timecard shows both jobs with correct elapsed times and costs.

3. **Offline Resilience (CRITICAL):**
   - [ ] Start job on WiFi.
   - [ ] Disable WiFi → "Offline mode" banner appears.
   - [ ] Pause job → action queued locally.
   - [ ] Re-enable WiFi → "Syncing..." then "3 actions synced ✓"
   - [ ] Backend timecard reflects all actions in correct order.

4. **Mobile/Tablet (HIGH):**
   - [ ] Open on iPad (1024 × 768) → 2-column layout, no overflow.
   - [ ] All buttons 60+ px tall, readable text.
   - [ ] Tap pause button with gloved hand simulator (use 20mm x 20mm contact area) → reliable.

5. **Accessibility (HIGH):**
   - [ ] Run axe DevTools → 0 violations.
   - [ ] Tab through controls: all reachable, focus visible.
   - [ ] Windows high-contrast mode → all text readable, contrast ≥ 7:1.
   - [ ] Screen reader (NVDA): job cards announced correctly.

---

## SUMMARY & NEXT STEPS

| Severity | Count | Category |
|----------|-------|----------|
| CRITICAL | 7 | Real-time sync, offline, pause/resume UX, confirmation dialogs, accessibility, error recovery, auth |
| HIGH | 9 | Touch targets, loading states, cost transparency, shift sync, modal patterns, responsiveness, hierarchy |
| MEDIUM | 9 | Offline JobSelector, undo, capacity warnings, machine audit, CSV export, polling stutter, haptics, testing, nav filtering |
| **Total** | **25** | **UX gaps requiring fixes before implementation** |

### Recommended Roadmap Adjustment

**Current plan order:**
```
Phase 1 (Backend)  →  Phase 2 (Auth/RBAC)  →  Phase 4 (Job Clock)
```

**Recommended order (with UX hardening):**
```
Phase 1 (Backend)
  ↓
Phase 1.5 (Auth + ProtectedRoute + LoginPage) ← MOVE UP, CRITICAL
  ↓
Phase 2.5 (Mobile-First & Shop Floor UX) ← NEW PHASE
  • ShopFloorPrimitives component library
  • Real-time sync strategy (WebSocket + 10s poll)
  • Offline queue + IndexedDB cache
  • Touch target sizing (72px min)
  • Accessibility audit (WCAG 2.1 AA)
  ↓
Phase 2 (Auth RBAC refinement) ← SIMPLIFIED
  • Clearance filtering in Layout
  • Route protection
  ↓
Phase 3 (Employee Management UI)
  ↓
Phase 4 (Job Clock — now with solid UX foundation)
```

### Blockers for Implementation Start

- [ ] **CRIT-1:** Decide WebSocket vs. poll → implement in Phase 1.5.
- [ ] **CRIT-2:** Design offline queue + IndexedDB caching → Phase 2.5.
- [ ] **CRIT-3:** Design multi-job pause UX (job cards, toasts, pause reasons) → Phase 2.5 components.
- [ ] **CRIT-4:** Add confirmation modal before clock-out → Phase 4 implementation.
- [ ] **CRIT-5:** Define shop floor accessibility requirements (WCAG 2.1 AA, 72px targets) → Phase 2.5.
- [ ] **CRIT-6:** Add idempotency keys + retry logic to API client → Phase 1 completion.
- [ ] **CRIT-7:** Build AuthContext + LoginPage immediately → Phase 1.5 (blocking Phase 4).

---

## RECOMMENDATION: PROCEED WITH CAUTION

**Do not start Phase 4 (Job Clock) until:**
1. ✓ Phase 1 backend is complete and tested (already 90% done).
2. ✓ Phase 1.5 (Auth) is built and tested with actual login/logout.
3. ✓ Phase 2.5 (Shop Floor UX) component library is complete.
4. ✓ Offline resilience plan (queue + cache) is implemented.
5. ✓ Real-time sync strategy is chosen and tested.

**Otherwise:** Shipping a job clock that stales after 5 seconds, fails silently offline, and has button targets too small for gloves will frustrate operators and erode trust in the system.

---

**This review completes with confidence that the plan is architecturally sound but needs 25+ UX refinements before it will be usable in a real shop floor environment.**
