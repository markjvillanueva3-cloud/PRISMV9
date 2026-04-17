# Backend Architectural Review: Employee/HR/Job Tracking Plan
**Status:** PLAN MODE — Review findings only (no execution)
**Date:** 2026-03-31
**Reviewer:** Backend Architect

---

## EXECUTIVE SUMMARY
The plan is well-structured and identifies critical gaps. However, **9 HIGH/CRITICAL issues** must be addressed before implementation starts. Most issues cluster around:
1. **Data model gaps** — Employee auth linking, clearance_level field missing, schema migration gap
2. **Concurrency/safety** — Race conditions in pause/resume, no optimistic locking, no transaction boundaries
3. **Persistence** — PayrollEngine not persisted, no schema for clearance_level, no checkpoint for crash recovery
4. **API security** — New routes lack auth middleware, no per-clearance API access control
5. **Error recovery** — No graceful shutdown for pending writes, server crash loses active clock state

---

## FINDINGS BY SEVERITY

### CRITICAL

**CR-1: Employee-to-Auth User Linking Missing**
- **Issue**: The plan adds `clearance_level` to EmployeeEngine.Employee, but EmployeeEngine and AuthEngine are **completely decoupled**. No data structure links an Employee record (EMP-0001) to an AuthUser (USR-abc123).
- **Impact**:
  - A user logs in via AuthEngine → gets JWT with roles
  - But the system has no way to know which Employee record to associate with them
  - Payroll, time clock, and cost analysis will fail because they need to fetch `employeeEngine.get(employeeId)` but have no way to map from AuthUser
- **Root cause**: AuthEngine operates on username/password. EmployeeEngine operates on independent employee IDs. No bridge.
- **Recommendation**:
  - Add to AuthUser interface: `employee_id?: string` (optional until employee is created)
  - Add to schema.sql employees table: `auth_user_id UUID UNIQUE REFERENCES users(id)`
  - In LoginPage, after successful login fetch employee record via: `GET /employee/{auth_user_id}`
  - In AuthContext, store both `user.id` AND `employee_id` for downstream engine calls
  - Consider adding a bidirectional hook in AuthEngine.login() that auto-links to Employee if email matches

**CR-2: Clearance_level Field Not in Schema**
- **Issue**: The plan says "Add clearance_level to Employee model" but the database schema (schema.sql lines 143-162 and 001-erp-persistence.sql) has **no clearance_level column** in the employees table.
- **Impact**: Data persisted to DB will have no clearance_level. PersistenceBridge will lose the field on server restart.
- **Missing migration**: Need `011-add-clearance-to-employees.sql`:
  ```sql
  ALTER TABLE employees ADD COLUMN clearance_level VARCHAR(20) NOT NULL DEFAULT 'shop_floor'
    CHECK (clearance_level IN ('shop_floor', 'lead', 'hr_manager', 'admin'));
  CREATE INDEX idx_employees_clearance ON employees(clearance_level);
  ```
- **Recommendation**:
  - Create migration 011 (or append to schema.sql if not yet deployed)
  - Update PersistenceBridge registration for employees table to include the new column
  - Add DEFAULT 'shop_floor' in the migration to match EmployeeEngine line 36

**CR-3: PayrollEngine Not Persisted**
- **Issue**: TimeClockEngine registers both shifts and jobTimes with PersistenceBridge (lines 528-537). PayrollEngine has **NO persistence** — periods, deductions, ytdEarnings, and pay stubs are all in-memory Maps with no backing store.
- **Impact**:
  - Run payroll for a period → calculates all pay stubs in memory
  - Server crashes → **all payroll calculations lost** (regulatory nightmare)
  - Cannot implement "run payroll, review, then finalize" workflow
  - No audit trail of payroll changes
- **Recommendation**:
  - Add PersistenceBridge registration for `payroll_periods`, `deduction_configs`, `ytd_earnings`
  - Create migration 012 for payroll tables (copy pattern from job_time_entries)
  - Add columns: `payroll_id UUID PRIMARY KEY`, `period_id VARCHAR`, `employee_id VARCHAR`, `status VARCHAR`
  - Update PayrollEngine constructor to call `persistenceBridge.persist()` in createPeriod(), configureDeductions(), calculatePayStub()
  - Call persistenceBridge.loadAll() at startup to restore payroll state

**CR-4: No Transaction Boundaries for Multi-Step Operations**
- **Issue**: The plan's Phase 4 allows employees to "Clock in → Start Job A → Pause Job A → Start Job B → Resume Job A → Stop both → Clock out". Each operation is independent. If a server crashes mid-sequence:
  - Shift is clocked in ✓ (persisted)
  - Job A start is persisted ✓
  - Job A pause ✓
  - Job B start ✓
  - But the in-memory state linking these together may be lost
  - Edge case: `jobPause()` updates `entry.pause_periods` array (line 228-231). If DB persists but in-memory Map rolls back, arrays become inconsistent.
- **Impact**: Data corruption, incorrect labor cost calculations, audit trail gaps
- **Root cause**: Synchronous write-through cache (PersistenceBridge) doesn't enforce atomicity across multiple tables
- **Recommendation**:
  - Add optional `transactionId` to ShiftEntry and JobTimeEntry to group related operations
  - On server startup, detect incomplete transactions and roll them forward or back based on shift status
  - Document the recovery strategy in a new ENGINE_RECOVERY.md
  - For Phase 1, accept the risk with documented warning. For Phase 2, implement transaction log.

**CR-5: API Routes Lack Auth Middleware**
- **Issue**: The plan adds routes like POST `/job-time-pause`, POST `/job-time-resume`, GET `/active-jobs/:employeeId` but **none of the existing ERP routes have auth middleware**. See erp.ts lines 104-150: all routes just call `bizRoute()` or `bizGet()` with no permission checks.
- **Impact**:
  - Any user can call POST `/shift-clock-in` for any employee
  - Any user can pause/resume any job
  - Unauthenticated requests are not blocked
  - Clearance_level checks happen in frontend, not backend (security flaw: client-side auth is bypassable)
- **Recommendation**:
  - Create auth middleware: `authMiddleware(req, res, next)` that validates JWT token from `Authorization: Bearer <token>` header
  - Create role-check middleware: `requireClearance(minimumLevel)` that checks `req.user.clearance_level`
  - Apply to all new routes: `router.post('/job-time-pause', authMiddleware, requireClearance('shop_floor'), bizRoute(...))`
  - Update plan Phase 2 to explicitly wire these middlewares to all endpoints
  - Consider: does the dispatcher itself need auth, or just the route? Answer: Both. Dispatcher should log which user called it.

**CR-6: Race Condition in jobPause/jobResume When Two Terminals Same Employee**
- **Issue**: TimeClockEngine.getActiveJobTime() (line 285-296) returns the first active job for an employee. If two concurrent HTTP requests hit pause/resume for different jobs:
  ```
  T1: GET /active-job-time (emp1) → returns JobA (active)
  T2: GET /active-job-time (emp1) → returns JobA (active) [concurrent, same result]
  T1: POST /job-time-pause with JobA → succeeds, JobA.status = "paused"
  T2: POST /job-time-resume with JobA → succeeds? But JobA is paused, not active
  Result: JobA is now in "active" state after resume, but was supposed to stay paused
  ```
- **Impact**: Incorrect pause history, corrupt productive_minutes calculation, labor cost overstatement
- **Root cause**: No pessimistic locking or optimistic concurrency control on JobTimeEntry
- **Recommendation**:
  - Add `version` field to JobTimeEntry (increment on each update)
  - jobPause() and jobResume() check version before updating; reject if stale
  - Return conflict 409 to client with current version, let client retry
  - Document in plan: "Active job tracking is per-employee singleton; concurrent clients must coordinate"
  - For MVP: accept single-terminal assumption. For Phase 2: implement optimistic locking

---

### HIGH

**H-1: No Error Recovery for Server Crash During Active Shift**
- **Issue**: Employee clocks in → receives shiftId from API → app stores in localStorage. If server crashes before shift is persisted...
  - Actually, looking at TimeClockEngine.clockIn() (line 113-115), it DOES call persistenceBridge.persist() immediately. So this is covered.
  - BUT: There's a gap when shiftId is generated (line 105) but persistent write fails. Edge case: persist() call hangs or times out, employee app is left with an ID that's not in the DB.
- **Impact**: Employee can't clock out (jobStop references shift_entry_id which doesn't exist)
- **Recommendation**:
  - Add retry logic to persistenceBridge.persist() — currently fires-and-forgets
  - Log failures to stderr so operator can manually recover
  - Document the manual recovery procedure in OPERATIONS.md (not in plan, but must do in Phase 1)

**H-2: Pause Periods Array Not Bounded**
- **Issue**: JobTimeEntry.pause_periods is an unbounded array (line 34). If an employee pauses/resumes a job 1000 times in a shift, the array grows without limit. No cleanup.
- **Impact**: Memory leak, slow serialization, DB bloat
- **Recommendation**:
  - Cap pause_periods at 100 entries (warn on 50)
  - On jobStop(), if > 100, aggregate consecutive pauses
  - Document in plan: "Pause tracking is for debugging; excessive pauses (>50) indicate tooling issues"

**H-3: ActualCostEngine Not Explicitly Wired to TimeClockEngine**
- **Issue**: Plan Phase 5 says "ActualCostEngine already integrates with TimeClockEngine" (line 169). Checked the codebase:
  - ActualCostEngine does NOT import or call TimeClockEngine
  - ActualCostEngine exists in ENGINE_DIGEST but is NOT in src/engines/ directory (orphaned or not yet created)
  - The dispatcher call at erp.ts line 134 calls `actual_cost_calculate` but there's no dispatcher action handler
- **Impact**: Job profitability pages will show "data not available" or crash
- **Recommendation**:
  - Verify ActualCostEngine exists in codebase. If not, create stub that calls timeClockEngine.jobLaborCost()
  - Wire dispatcher: add to businessDispatcher actions: `"actual_cost_calculate": async (params) => { return actualCostEngine.calculateJobCost(params); }`
  - Plan Phase 5A should explicitly state: "Requires wiring ActualCostEngine.jobLaborCost() ↔ TimeClockEngine.jobLaborCost()"

**H-4: No Audit Trail for Timecard Edits**
- **Issue**: If an HR manager edits a timecard (which the plan doesn't explicitly scope but is implied by Phase 5B), there's no record of who changed what and when. TimeClockEngine has no audit logging.
- **Impact**: Regulatory non-compliance (DoL wage/hour audits), cannot dispute payroll disputes
- **Recommendation**:
  - Add to schema.sql: `timecard_audit_log` table (copy pattern from audit_log lines 193-212)
  - Call persistenceBridge with "action: 'edit_timecard'" on any update to shifts or jobTimes
  - Plan Phase 5B must explicitly state: "All timecard changes logged to audit_log; reviewed by compliance system"

**H-5: Clearance-Level Enum Not Extensible**
- **Issue**: Plan defines clearance as `"shop_floor" | "lead" | "hr_manager" | "admin"` (line 36). But:
  - No dispatcher action to manage roles (add/remove clearance)
  - No way for admin to create new clearance levels
  - Schema hard-coded with CHECK constraint (line 154 of proposed migration 011)
- **Impact**: Business process change (e.g., need "programmer" clearance) requires code + migration
- **Recommendation**:
  - Create `clearance_levels` lookup table instead of enum
  - Add to schema: `CREATE TABLE clearance_levels (id VARCHAR(50) PRIMARY KEY, name VARCHAR(100), permissions JSONB)`
  - Populate with default 4 levels
  - Allow HR manager to create custom levels (for future, not in Phase 1)
  - Plan Phase 2 should state: "Clearance levels are future-extensible via admin panel"

**H-6: WhoClockedIn Response Doesn't Include Pause State**
- **Issue**: TimeClockEngine.whoClockedIn() (line 459-474) returns active_job but doesn't indicate if that job is paused. Frontend can't show "John is clocked in but Job 5 is paused" UI state.
- **Impact**: Shop floor dashboard is incomplete/confusing
- **Recommendation**:
  - Extend whoClockedIn() response to include `active_job_paused: boolean`
  - Adds 1 line to loop (line 464: `active_job_paused: activeJob?.status === "paused",`)
  - Update plan Phase 4B: "ShiftClockWidget shows pause state via whoClockedIn()"

---

### MEDIUM

**M-1: No Offline Mode or Conflict Resolution**
- **Issue**: Employee clocks in on shop floor (no connection → cached). Later syncs. If another terminal already clocked them in, there's a conflict. Plan doesn't address.
- **Impact**: Duplicate shift entries
- **Recommendation**:
  - Plan Phase 4: "Requires reliable network. Offline-first is Future Phase X"
  - Document in ShopFloorClockPage: "Requires internet connection to clock in/out"
  - For MVP: accept as constraint. For Phase 2: implement sync conflict resolution

**M-2: Shift Assignment Complexity Not Reflected in Clock Logic**
- **Issue**: Employee has a ShiftAssignment (line 47-53 in EmployeeEngine) with start_time, end_time, break_minutes, days. Clock in doesn't validate employee is clocking in during their shift.
- **Impact**: Employee can clock in at midnight if they work 6am-2pm. No warning.
- **Recommendation**:
  - In clockIn(), log a warning if clock_in time is >30 min before shift.start_time or after shift.end_time
  - Store warning in ShiftEntry.notes for HR review
  - Plan Phase 4A should state: "Shift time validation is warning-only in MVP; HR reviews via audit log"

**M-3: No Simultaneous Multi-Job Support Documented**
- **Issue**: Plan says employee can "pause Job A → start Job B → resume Job A" (line 126-130) but jobStart() auto-pauses previous active job (line 188-196). So the state is: only ONE job can be active at a time. But the UI might imply multiple concurrent jobs.
- **Impact**: Confusing UX if employee thinks they can run two jobs at once
- **Recommendation**:
  - Plan Phase 4B: explicitly state "Only one job can be active per employee at a time. Starting a new job auto-pauses the previous job."
  - ShiftClockWidget should show "Active job: JobA (paused: 2)" not "Active jobs: [JobA, JobB]"
  - Clarify language in plan to match engine behavior

**M-4: Employee Department Map Field Not Validated**
- **Issue**: Employee.department is a union type (line 26-34 in EmployeeEngine) but no validation in create(). If UI sends `{ department: "xyz" }`, it won't error, just stores bad data.
- **Impact**: Department filter queries will miss these employees; reports are incomplete
- **Recommendation**:
  - Add Zod schema validation to employee_create dispatcher action
  - Pre-validate: `Department | null` with fallback to "admin" if missing
  - Plan Phase 3A should state: "Employee create validates department against allowed list"

**M-5: No Way to Transition Employees Through Lifecycle**
- **Issue**: Employee.status is "active" | "inactive" | "terminated" | "leave" (line 15). Plan doesn't define who can transition states or when.
- **Impact**: HR manager might want to mark employee as "on_leave" but there's no action for it
- **Recommendation**:
  - Add to plan Phase 3A: businessDispatcher action `"employee_update_status"` that checks Auth.checkPermission("hr:manage_employees")
  - Transitions: active → inactive | leave (reversible). inactive/leave → terminated (irreversible).
  - Audit all state changes
  - Not essential for MVP but should be noted as gap

**M-6: Daylight Saving Time Handling Unclear**
- **Issue**: timecard calculations use ISO datetime (line 64 in TimeClockEngine) but US states have DST transitions. Payroll period end at 11:59:59 on DST changeover is ambiguous.
- **Impact**: Payroll calculations could be off by 1 hour on DST days (spring forward/fall back)
- **Recommendation**:
  - Document in plan Phase 5: "Payroll periods are calendar-aligned, not time-aligned. DST transitions processed per FLSA guidelines (not yet implemented; requires review with legal)."
  - For MVP: assume no DST (or test explicitly with DST dates)
  - Note: This is a known issue for any time-tracking system; not PRISM-specific but should be called out

**M-7: No Bulk Employee Import**
- **Issue**: Plan implies one employee is created at a time via UI. No bulk import from HR system.
- **Impact**: Setting up 100 employees takes 100 form fills
- **Recommendation**:
  - Plan Phase 3: add note "Bulk import from CSV deferred to Phase X"
  - For MVP: document manual one-by-one setup procedure

---

## GAPS NOT YET FLAGGED IN PLAN

**G-1: Mobile Device Support**
- Plan assumes employees use computers to clock in. Shop floor typically has phones/tablets.
- Recommendation: Phase 4A should state responsive design requirement or add mobile app scope

**G-2: Certification Expiry Enforcement**
- EmployeeEngine.expiringCertifications() (line 267-287) returns warnings but doesn't prevent employee from working. Should expired cert block clock-in?
- Recommendation: Plan Phase 3 to define: "Expired certs log warnings; blocking is manual (HR decision)"

**G-3: No Tool-Employee Mapping**
- Employee has `machine_types` in Skill (line 58) but this is free-text. No validation against MachineRegistry.
- Recommendation: Link to machine_id instead of string; validate at create time

---

## STRENGTHS OF THE PLAN

1. **Clear phasing** — 5 phases with rational dependencies
2. **Good engine foundation** — EmployeeEngine, TimeClockEngine, PayrollEngine already ~90% built
3. **Persistence architecture** — PersistenceBridge pattern is solid; just needs to be extended
4. **Auth foundation** — AuthEngine has JWT + RBAC; just needs Employee linking
5. **Realistic scope** — MVP is 15 files, 2500 LOC (achievable)
6. **Verification plan** — Explicit test scenarios (section 202-211)

---

## RECOMMENDED EXECUTION SEQUENCE

Before writing code, apply these fixes in order:

1. **Phase 0 (THIS SESSION):**
   - [ ] Create migration 011: add clearance_level to employees table
   - [ ] Link AuthUser ↔ Employee in both schema and engine
   - [ ] Create authMiddleware and requireClearance middleware in routes/
   - [ ] Wire PayrollEngine to PersistenceBridge
   - [ ] Document server crash recovery procedure

2. **Phase 1 (backend wiring):** Proceed as planned (fixes bug, wire actions, add fields)

3. **Phase 2 (auth):** Use updated authMiddleware from Phase 0

4. **Phases 3-5:** Proceed; contingent on Phase 0-1 completion

---

## FINAL RECOMMENDATION

**CONDITIONAL APPROVAL** — Proceed with Phase 1B (route/action wiring) **after** addressing CR-1 through CR-6 above. Do not proceed with Phase 2 (frontend auth) until backend auth middleware is in place. Do not begin Phase 3 (employee management) until clearance_level is persisted.

**Estimated delay:** 4-6 hours for all CRITICAL fixes. Estimated benefit: prevents data corruption, regulatory fines, and post-launch rework.

---

## NEXT STEPS

1. User reviews this report
2. Decide: fix in this session, or schedule later?
3. If fixing now: create a follow-up work plan addressing each CR/H item
4. If deferring: add to roadmap as Phase 0-B pre-work

