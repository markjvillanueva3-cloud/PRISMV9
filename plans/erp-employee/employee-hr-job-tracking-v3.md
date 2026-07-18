# Employee / HR / Job Tracking — Implementation Plan v3 (40-Agent Scrutinized)

## Context
Build a fully operational employee/HR/job tracking system for PRISM's CNC manufacturing app. Operators clock in/out of shifts, track multiple jobs simultaneously with pause/resume, select process types, and record production results. Time data auto-feeds cost analysis. HR managers assign roles and clearance levels controlling app access. Backend engines are ~90% built (EmployeeEngine, TimeClockEngine, PayrollEngine, AuthEngine). Frontend pages exist but use fixture data. **40 agents across 20 specialized roles** scrutinized this plan over 2 passes, producing 320+ findings. This v3 incorporates all critical/high findings.

### Pre-Implementation Fixes (DONE)
- **Safety gate fixed:** Added ~60 non-machining operation patterns to EnforcementHooks.ts bypass list (session/orchestrate/validate/business/auth)
- **Roadmap index repaired:** 41 corrupted milestones fixed (missing envelope_path, track, total_units)
- **EMP-MS0 envelope created:** Full 6-phase, 28-unit RGS-compliant envelope at `data/milestones/EMP-MS0.json`
- **RoadmapLoader path bug:** `src/services/RoadmapLoader.ts` line 25 hardcoded `C:\PRISM` — must change to `process.cwd()` + rebuild

### Critical Findings Driving This Plan (60-agent, 420+ findings)
- **SECURITY EMERGENCY:** Zero auth on ALL `/api/v1/erp` routes (pen tester confirmed)
- **Data Loss:** EmployeeEngine + PayrollEngine not wired to PersistenceBridge
- **Route Bug:** `/job-time-pause` (erp.ts:107) routes to `job_time_start` instead of pause
- **Missing Actions:** `job_time_pause` and `job_time_resume` not in dispatcher z.enum
- **Shop Floor UX:** Barcode > QR for primary input (oily cameras), 72px touch targets, auto-select process type from routing
- **Compliance:** FLSA daily OT, shift differentials, timecard approval workflow, audit trail
- **Cost Model:** Setup vs production time split, scrap-adjusted labor, burden rates

---

## Phase 1: Security + Backend Wiring (BLOCKING — do first)

### 1A. Add auth middleware to ALL ERP routes
**File:** `H:/prism/mcp-server/src/routes/erp.ts`
**Why:** Pen tester proved ALL 50+ ERP routes are unauthenticated. Anyone can clock any employee, run payroll, create invoices.
```
import { verifyToken, requireRole } from "../middleware/auth.js";

// TimeClock — minimum operator role
router.post("/shift-clock-in", verifyToken, bizRoute(callTool, "clock_in"));
router.post("/shift-clock-out", verifyToken, bizRoute(callTool, "clock_out"));
router.post("/job-time-start", verifyToken, bizRoute(callTool, "job_time_start"));
router.post("/job-time-pause", verifyToken, bizRoute(callTool, "job_time_pause"));  // FIX: was routing to job_time_start
router.post("/job-time-resume", verifyToken, bizRoute(callTool, "job_time_resume"));  // NEW
router.post("/job-time-stop", verifyToken, bizRoute(callTool, "job_time_stop"));

// HR — requireRole("hr_manager") or higher
router.post("/employee-create", verifyToken, requireRole("hr_manager"), bizRoute(callTool, "employee_create"));
router.post("/payroll-run", verifyToken, requireRole("hr_manager"), bizRoute(callTool, "payroll_run"));

// Read routes — any authenticated user for own data
router.get("/who-clocked-in", verifyToken, bizRoute(callTool, "who_clocked_in"));  // NEW
router.get("/active-jobs/:employeeId", verifyToken, activeJobsHandler);  // NEW
router.get("/shift-handoff/:employeeId", verifyToken, shiftHandoffHandler);  // NEW
router.post("/job-labor-cost", verifyToken, bizRoute(callTool, "job_labor_cost"));  // NEW
```
Add **ownership check**: operator can only clock themselves (unless hr_manager+).
Add **timestamp validation**: reject timestamps >5 min from server time.

### 1B. Add missing dispatcher actions
**File:** `H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts`
Add to z.enum (line ~346): `"job_time_pause"`, `"job_time_resume"`, `"employee_update"`, `"who_clocked_in_live"`
Add case handlers:
- `job_time_pause` → `timeClockEngine.jobPause({ employee_id, job_id, reason, reason_category, timestamp })`
- `job_time_resume` → `timeClockEngine.jobResume(employee_id, job_id, timestamp)`
- `employee_update` → `employeeEngine.update(employee_id, changes)`
- Remove `.passthrough()` from all action schemas (mass assignment vulnerability)

### 1C. Wire EmployeeEngine + PayrollEngine to PersistenceBridge
**File:** `H:/prism/mcp-server/src/engines/EmployeeEngine.ts`
- Import PersistenceBridge, register `"employees"` Map at construction
- Call `persistenceBridge.persist("employees", id, emp)` in `create()`, `update()`, `addSkill()`, `addCertification()`
**File:** `H:/prism/mcp-server/src/engines/PayrollEngine.ts`
- Register `"payroll_periods"` and `"pay_stubs"` Maps
**File:** `H:/prism/mcp-server/src/db/BusinessStore.ts`
- Update ENTITY_CONFIGS.employees to include: `clearance_level`, `auth_user_id`, `overtime_policy` columns
- Update ENTITY_CONFIGS.job_time_entries to include: `process_type`, `pause_periods`, `good_parts`, `scrap_reason`

### 1D. Employee model enhancements
**File:** `H:/prism/mcp-server/src/engines/EmployeeEngine.ts`
Add to Employee interface:
- `clearance_level: "shop_floor" | "lead" | "hr_manager" | "admin"` (default: `"shop_floor"`)
- `auth_user_id: string | null` — links auth user → employee record (critical for login flow)
- `overtime_policy: { rule: "daily"|"weekly"; daily_threshold_hrs: number; weekly_threshold_hrs: number; ot_multiplier: number; dt_multiplier: number }`
- `shift_differential: { second_shift_premium: number; third_shift_premium: number } | null`

**Migration:** `H:/prism/mcp-server/src/db/migrations/011-employee-enhancements.sql`
```sql
ALTER TABLE employees ADD COLUMN IF NOT EXISTS clearance_level TEXT DEFAULT 'shop_floor'
  CHECK (clearance_level IN ('shop_floor', 'lead', 'hr_manager', 'admin'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS auth_user_id TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS overtime_policy JSONB DEFAULT '{"rule":"weekly","daily_threshold_hrs":8,"weekly_threshold_hrs":40,"ot_multiplier":1.5,"dt_multiplier":2.0}';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_differential JSONB;
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_clearance ON employees(clearance_level);
```

### 1E. Job time tracking model enhancements
**File:** `H:/prism/mcp-server/src/engines/TimeClockEngine.ts`
Add to JobTimeEntry interface:
- `process_type: "setup" | "production_run" | "first_article" | "rework" | "inspection" | "deburring" | "secondary_ops" | "programming" | "material_handling"`
- `good_parts: number; scrap_count: number; scrap_reason: string | null`
- `improvement_note: string | null` — Kaizen suggestion box: operator flags "this could be faster if..." on job stop
- `takt_time_sec: number | null` — from job routing, enables takt vs actual comparison
- `quality_project_id: string | null` — links to Six Sigma/Kaizen improvement project
Enhance `jobPause()`:
- Accept `reason: string`, `reason_category: "machine_down" | "material_shortage" | "setup_changeover" | "tool_change" | "break" | "preventive_maintenance" | "waiting_inspection" | "idle" | "shift_end" | "other"`
Enhance `jobStop()`:
- Accept `good_parts`, `scrap_count`, `scrap_reason` — store on JobTimeEntry
Add methods:
- `getActiveAndPausedJobs(employeeId)` — all non-completed jobs for an employee
- `getShiftHandoff(employeeId)` — last shift's handoff_notes + active/paused jobs from previous shift
Add to ShiftEntry: `handoff_notes: string | null`
Enhance `clockOut()`: accept optional `handoff_notes: string`

**Migration:** `H:/prism/mcp-server/src/db/migrations/012-job-time-enhancements.sql`
```sql
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS process_type TEXT DEFAULT 'production_run';
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS pause_periods JSONB DEFAULT '[]';
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS good_parts INTEGER;
ALTER TABLE job_time_entries ADD COLUMN IF NOT EXISTS scrap_reason TEXT;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS handoff_notes TEXT;
CREATE INDEX IF NOT EXISTS idx_job_time_employee_date ON job_time_entries(employee_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON time_entries(employee_id, shift_date DESC);
```

### 1F. Input sanitization (XSS prevention)
**File:** `H:/prism/mcp-server/src/engines/TimeClockEngine.ts`
All user-generated text fields (handoff_notes, scrap_reason, pause reason notes) must be sanitized:
- Strip HTML tags
- Max length 500 chars
- Reject script/onerror patterns

---

## Phase 2: Auth & Role-Based Access Control

### 2A. AuthContext for frontend
**File:** `H:/prism/mcp-server/web/src/contexts/AuthContext.tsx` (NEW)
- State: `{ user, token, employee, clearance_level, isAuthenticated, isLoading }`
- On login: AuthEngine.login() → fetch employee by `auth_user_id` → set clearance
- Token in localStorage with auto-refresh on mount
- **Session timeout:** 15 min inactivity → auto-logout (shared tablet security)
- Display large operator name badge on all pages (prevent session confusion)

### 2B. Login Page
**File:** `H:/prism/mcp-server/web/src/pages/LoginPage.tsx` (NEW)
- Touch-friendly: 72px input fields, 60px+ buttons
- Username + password (PIN mode in v2, barcode badge in v3)
- Redirect on success: shop_floor → /shop-floor-clock, hr_manager → /employees
- Lockout messaging, forgot-password flow
- **Barcode scanner input:** hidden `<input autoFocus>` captures USB keyboard emulation from existing Honeywell 1200g scanners

### 2C. ProtectedRoute wrapper
**File:** `H:/prism/mcp-server/web/src/components/ProtectedRoute.tsx` (NEW)
Route access map by clearance:
- `shop_floor`: /calculator, /post-processor, /toolpath, /threads, /alarms, /shop-floor-clock, /jobs, /viewer, /troubleshoot
- `lead`: + /reports, /scheduling, /capacity, /orders
- `hr_manager`: + /employees, /payroll, /timecards, /hr-compliance
- `admin`: all pages

### 2D. Sidebar filtering by clearance
**File:** `H:/prism/mcp-server/web/src/components/shell/shellCatalog.ts` + `Layout.tsx`
- Add `minClearance` field to NAV_SECTIONS items
- Filter in sidebar render based on AuthContext.clearance_level

---

## Phase 3: Employee Management UI

### 3A. Enhance EmployeeDirectoryPage
**File:** `H:/prism/mcp-server/web/src/pages/EmployeeDirectoryPage.tsx` (MODIFY)
- Edit modal: role, dept, rate, clearance_level, OT policy, shift differential
- Status toggle: active/inactive/terminated
- Cert expiry warnings (red badge if <30 days)
- Manager override: close forgotten shifts, edit time entries (with `change_reason` field + audit trail)
- Quick links: "View Timecard", "Clock In For" (HR only)

### 3B. Employee Profile Page
**File:** `H:/prism/mcp-server/web/src/pages/EmployeeProfilePage.tsx` (NEW)
- Tabs: Overview | Skills & Certs | Time History | Cost Analysis | **Learning**
- Time history: setup vs production split, scrap rate trend
- **Timecard approval workflow:** Employee submits → Supervisor reviews → Approves/Rejects
- All edits logged with who/when/why (audit trail for SOX/ISO)

### 3C. Employee Learning Academy Integration
**Existing engines to wire:** CurriculumEngine, AssessmentEngine, LearningPathEngine, ApprenticeEngine, OnboardingEngine
**Existing data:** 15 courses (L0-L3), 500+ lessons, 4 certification levels, 5 specialization tracks

**Employee → Learning Path mapping by role:**
| Employee Role | Academic Program | Specialization Track | Certification Target |
|---------------|-----------------|---------------------|---------------------|
| operator | Foundations → Operator-Core | (by machine type) | PRISM Certified Operator |
| setup_tech | Operator-Core | 3-Axis or Turning | PRISM Certified Operator |
| lead | Operator-Core → Programming | Process Engineer | PRISM Certified Programmer |
| programmer | Programming-Master | 5-Axis or Mill-Turn | PRISM Certified Programmer |
| supervisor | Leadership | Process Engineer | PRISM Certified Master |
| inspector | Operator-Core (quality focus) | — | PRISM Certified Operator |
| engineer | All programs | All tracks | PRISM Certified Master |

**Implementation:**
- **On employee create:** Auto-generate LearningPlan from `learningPathEngine.plan(empId, role)` based on employee role
- **On clearance_level change:** Update available courses (shop_floor sees L0-L1, lead sees L0-L2, hr_manager+ sees all)
- **Employee Profile "Learning" tab:** Show assigned courses, progress %, quiz scores, certification status, next recommended module
- **Machine certification gate:** Before operator can clock into a specific machine type, check if they've completed the required course modules (e.g., 5-axis machine requires Course 8 completion). Display: "Complete '5-Axis Programming' before operating this machine."
- **Kaizen integration:** When employee submits `improvement_note` on job stop, route to supervisor AND link to relevant apprentice lesson if the improvement relates to a skill gap
- **Scrap → training trigger:** If employee scrap_rate > 5% for 2 weeks, auto-recommend remedial lessons from ApprenticeEngine based on scrap_reason patterns (e.g., "chatter" → recommend Lesson 14: Stability Lobes)
- **Shift handoff training:** New hires see guided onboarding tour (OnboardingEngine Level 0-1) on first 3 clock-ins, with persistent tooltips on process type, pause reasons, and parts entry

**API routes to add:**
- `GET /employee-learning-path/:employeeId` → LearningPlan with courses, progress, certifications
- `POST /employee-learning-complete/:employeeId` → Mark lesson/module complete, update progress
- `GET /employee-certifications/:employeeId` → Current certifications + expiry dates

**Frontend components to wire:**
- `H:/prism/mcp-server/web/src/components/learning/CourseCatalog.tsx` — filter by employee role/clearance
- `H:/prism/mcp-server/web/src/components/learning/LearningPath.tsx` — show personalized path
- `H:/prism/mcp-server/web/src/components/learning/Assessment.tsx` — skill assessment per role
- `H:/prism/mcp-server/web/src/components/learning/ProgressTracker.tsx` — embed in Employee Profile

---

## Phase 4: Multi-Job Clock & Time Tracking (Core Feature)

### 4A. ShiftClockWidget (always-visible top bar)
**File:** `H:/prism/mcp-server/web/src/components/jobs/ShiftClockWidget.tsx` (NEW)
- Large "IN" / "OUT" status badge (40px+ green/gray)
- Shift elapsed timer, active job count
- Clock In/Out buttons (72px touch targets)
- **Clock-out confirmation:** "You have 2 active jobs. Clock out will auto-stop them. Continue?"
- **Handoff prompt** on clock-out: structured checklist (not freeform text):
  - Per active/paused job: status, next steps needed, tool condition
  - "Safety notes" checkbox
- **Previous shift data** on clock-in: show last operator's handoff + paused jobs with reasons
- **Fatigue gate:** Red banner at 12+ hours: "FATIGUE ALERT — recommend clock out"
- **Barcode input:** hidden input captures scanner for quick job start

### 4B. ActiveJobsDashboard (multi-job with pause reasons)
**File:** `H:/prism/mcp-server/web/src/components/jobs/ActiveJobsDashboard.tsx` (NEW)
- Cards for ALL active + paused jobs, grouped by machine
- Each card: Job ID, operation, process type, machine, **live timer** (large font, 48px+)
- **Play button** = resume (one tap, no modal) — 72px minimum
- **Pause button** = 5 quick-reason buttons (machine_down, tool_change, material_shortage, break, waiting_inspection) + "Other" text — each 60px+
- **Stop button** = completion modal: good parts (number pad, not text), scrap count (number pad), scrap reason (5 buttons + Other)
- **Cost-so-far** = hours × rate, prominent (18px), split by setup vs production
- **Undo:** 10-second toast after stop: "Job A stopped. [Undo]"
- Real-time: WebSocket primary + 10s polling fallback
- **Color-blind safe:** Blue/yellow/gray instead of green/red. Icons (▶ ⏸ ⏹) + text labels
- **Auto-select process type:** If job has routing, auto-select next operation (operator confirms, not selects)

### 4C. JobSelector modal
**File:** `H:/prism/mcp-server/web/src/components/jobs/JobSelector.tsx` (NEW)
- **Barcode scan input** (primary): scan job ticket barcode → auto-populate job + routing
- Search fallback for manual selection
- Process type auto-selected from routing (can override)
- Machine selection dropdown
- Multi-machine: allow concurrent jobs on different machines
- Notes field (max 200 chars, sanitized)

### 4D. Refactor ShopFloorClockPage
**File:** `H:/prism/mcp-server/web/src/pages/ShopFloorClockPage.tsx` (MODIFY)
- Compose: ShiftClockWidget + ActiveJobsDashboard + JobSelector
- Wire to real backend (replace ALL fixture data)
- **Offline banner:** "Offline — X actions queued" when disconnected
- Auto-sync on reconnect with optimistic UI + server confirmation

### 4E. API client additions
**File:** `H:/prism/mcp-server/web/src/api/client.ts` (MODIFY)
```typescript
jobTimePause(employeeId, jobId, reason, reasonCategory) → POST /job-time-pause
jobTimeResume(employeeId, jobId) → POST /job-time-resume
getActiveJobs(employeeId) → GET /active-jobs/:employeeId
whoClockedIn() → GET /who-clocked-in
getJobLaborCost(jobId) → POST /job-labor-cost
getShiftHandoff(employeeId) → GET /shift-handoff/:employeeId
```

---

## Phase 5: Cost Analysis & ERP Integration

### 5A. Job profitability with setup/production split
**File:** `H:/prism/mcp-server/web/src/pages/JobProfitabilityPage.tsx` (MODIFY)
- Labor cost: setup hours × burden rate vs production hours × direct rate
- Scrap-adjusted: labor ÷ good parts only (not total)
- Quoted vs actual comparison
- Machine burden rate from MachineRegistry (not hardcoded $85/hr)

### 5B. Enhanced TimecardPage
**File:** `H:/prism/mcp-server/web/src/pages/TimecardPage.tsx` (MODIFY)
- Weekly/biweekly selector
- Per-day: shift hours, job hours by process type, idle time, break deductions
- OT highlighting per employee's overtime_policy (daily AND weekly rules)
- Shift differential display
- **Timecard status:** draft → submitted → approved → locked
- Export to CSV (ADP/Paychex compatible fields)

### 5C. Department Dashboard
**File:** `H:/prism/mcp-server/web/src/pages/DepartmentDashboardPage.tsx` (NEW)
- Who's clocked in (live), active jobs per machine
- Utilization % per employee/dept
- Downtime reasons aggregated (Pareto chart from pause reasons)
- Cost per department (week/month)
- Foreman view: reassign operators, approve OT, close forgotten shifts

---

## Phase 6: Lean / Kaizen / Six Sigma Dashboards

### 6A. OEE Dashboard (Overall Equipment Effectiveness)
**File:** `H:/prism/mcp-server/web/src/pages/OEEDashboardPage.tsx` (NEW)
**Data source:** Pause reasons → Availability, cycle time vs takt → Performance, good_parts/(good+scrap) → Quality
- **OEE = Availability × Performance × Quality** per machine, per shift, per department
- Availability: (shift_time - downtime) / shift_time (downtime from pause_periods by reason)
- Performance: actual_output / theoretical_output (theoretical = shift_time / takt_time_sec)
- Quality: good_parts / (good_parts + scrap_count) = First Pass Yield
- **Six Big Losses breakdown:** Breakdowns, Setup/Adjustment, Minor Stops, Reduced Speed, Startup Rejects, Production Rejects
- Trend chart: 30-day rolling OEE per machine (Recharts line chart)
- Target lines: World-class = 85%, typical CNC = 60%, your shop = calculated
- **Color coding:** Green >85%, Yellow 60-85%, Red <60%
- Drill-down: click machine → see OEE components + top 5 downtime causes (Pareto)

### 6B. Kaizen Board (Continuous Improvement)
**File:** `H:/prism/mcp-server/web/src/pages/KaizenBoardPage.tsx` (NEW)
**Data source:** `improvement_note` from JobTimeEntry stop modal + scrap trends + downtime Pareto
- **Suggestion inbox:** All operator improvement_notes, sorted by recency, filterable by machine/dept
- **Impact scoring:** HR/lead can tag suggestions as "implemented", "reviewing", "deferred" + estimated savings
- **Before/After tracker:** When a Kaizen event completes, record: before_metric → after_metric → ROI
- **Top contributors:** Operators ranked by suggestions submitted + implemented (recognition, not punishment)
- **Monthly Kaizen events:** Track formal improvement projects with start/end dates, team, scope, results
- **Integration:** Link to quality_project_id on JobTimeEntry — tie time data to specific Kaizen projects

### 6C. Six Sigma / SPC Control Charts
**File:** `H:/prism/mcp-server/web/src/pages/SPCDashboardPage.tsx` (NEW)
**Existing engines:** SPCProcessCapabilityEngine, NelsonSPCRulesEngine (already built, 10 engines)
- **X-bar/R charts** from scrap data per job/operator/machine — wire to existing SPC engine
- **Process Capability (Cpk/Ppk)** calculated from good_parts dimensional data (when CMM data available)
- **Nelson Rules violations** highlighted automatically (8 rules for out-of-control detection)
- **DMAIC project tracker:** Define → Measure → Analyze → Improve → Control stages per quality_project_id
- **Pareto charts:** Top scrap reasons, top downtime causes, top cost drivers (from pause_periods + scrap_reason)
- **Drill-down:** Click a control chart point → see which operator, shift, machine, job produced it

### 6D. Value Stream Map View
**File:** `H:/prism/mcp-server/web/src/pages/ValueStreamPage.tsx` (NEW)
**Data source:** Aggregate from time tracking: setup time, cycle time, wait time, transport time per job
- **Process boxes:** Each operation in job routing shows actual vs estimated time
- **Inventory triangles:** WIP between operations (from active/paused job counts)
- **Lead time calculation:** Order received → first part shipped (from job lifecycle timestamps)
- **Value-added ratio:** Cycle time ÷ total lead time (target: >25% for CNC job shops)
- **Waste identification:** Highlight non-value-added time (setup, waiting, rework) in red
- **Takt time line:** Customer demand rate overlaid on cycle times — shows bottleneck operations

### 6E. Kanban / Job Queue Board
**File:** `H:/prism/mcp-server/web/src/pages/KanbanBoardPage.tsx` (NEW)
**Data source:** Job lifecycle + machine assignments + operator time tracking
- **Columns:** Queued → Setup → Running → Inspection → Complete → Shipped
- **Cards:** Job ID, part name, operator, machine, time remaining, priority
- **WIP limits:** Configurable per column (Kanban core rule — limit work in progress)
- **Drag-to-assign:** Manager drags job card to machine column (updates job assignment)
- **Color by priority:** Rush (red), Normal (blue), Low (gray)
- **Heijunka view:** Toggle to show level-loaded schedule across machines (spread work evenly)

### 6F. 5 Whys Root Cause Analyzer
**File:** `H:/prism/mcp-server/web/src/pages/RootCausePage.tsx` (NEW)
**Existing engines:** TroubleshootingEngine (troubleshoot_diagnose, troubleshoot_by_symptom, troubleshoot_tree)
- **Auto-trigger:** When scrap_count exceeds threshold on a job, offer "Investigate Root Cause"
- **Guided drill-down:** "Why was this part scrapped?" → "Why did chatter occur?" → "Why was the tool worn?" → "Why wasn't it replaced?" → "Why is there no replacement schedule?"
- **Fishbone (Ishikawa) diagram:** Auto-generate from scrap categories: Man, Machine, Material, Method, Measurement, Environment
- **Action items:** Each root cause generates a corrective action assigned to a person with due date
- **Link to Kaizen:** Root cause findings feed into Kaizen board suggestions automatically
- **Wire to TroubleshootingEngine:** `troubleshoot_diagnose` and `troubleshoot_by_symptom` for guided analysis

### 6G. A3 Problem Report Generator
**File:** `H:/prism/mcp-server/web/src/pages/A3ReportPage.tsx` (NEW)
- **Template:** Standard Toyota A3 format (1 page, 8 sections)
  1. Background (auto-fill from job + scrap data)
  2. Current Condition (OEE, scrap rate, cycle time from dashboard)
  3. Goal (target OEE, target scrap rate)
  4. Root Cause Analysis (from 5 Whys / Fishbone)
  5. Countermeasures (action items from Kaizen board)
  6. Implementation Plan (timeline, owner, budget)
  7. Follow-up (verification date, metric to check)
  8. Results (before/after comparison)
- **Auto-populate:** Pull data from OEE dashboard + scrap trends + Kaizen suggestions
- **PDF export:** Generate printable A3 report (PRISM already has PDF export engine)

---

## Implementation Order
```
Phase 1 (Security + Backend)  →  Phase 2 (Auth/RBAC)  →  Phase 4 (Job Clock UI)
                                                       ↘  Phase 3 (Employee Mgmt + Learning Academy)
                                                                    ↘  Phase 5 (Cost/ERP)
                                                                                 ↘  Phase 6 (Lean/Kaizen/SPC)
```

Phase 6 depends on Phases 4+5 (needs 3-6 months of accumulated time/scrap/downtime data to be meaningful).

## Files Summary
**Backend (modify):** erp.ts, businessDispatcher.ts, EmployeeEngine.ts, TimeClockEngine.ts, PayrollEngine.ts, BusinessStore.ts
**Backend (new):** 011-employee-enhancements.sql, 012-job-time-enhancements.sql, employee-learning-routes
**Frontend (modify):** client.ts, ShopFloorClockPage.tsx, EmployeeDirectoryPage.tsx, TimecardPage.tsx, JobProfitabilityPage.tsx, Layout.tsx, shellCatalog.ts, App.tsx, CourseCatalog.tsx, LearningPath.tsx
**Frontend (new):** AuthContext.tsx, LoginPage.tsx, ProtectedRoute.tsx, ShiftClockWidget.tsx, ActiveJobsDashboard.tsx, JobSelector.tsx, EmployeeProfilePage.tsx, DepartmentDashboardPage.tsx, OEEDashboardPage.tsx, KaizenBoardPage.tsx, SPCDashboardPage.tsx, ValueStreamPage.tsx, KanbanBoardPage.tsx, RootCausePage.tsx, A3ReportPage.tsx

**Estimated:** ~25 files modified, ~17 new files, ~6500 LOC across 6 phases

---

## Verification
1. **Security:** All ERP routes require auth token. shop_floor user blocked from /payroll-run, /employee-create. Ownership check prevents clocking other employees.
2. **Persistence:** Create employee → restart server → employee still exists. Same for payroll periods.
3. **Core flow:** Clock in → see handoff → start Job A (Setup) → pause (tool_change) → start Job B (Production, different machine) → resume Job A → stop Job A (8 good, 1 scrap, "chatter") → stop Job B → clock out with handoff
4. **RBAC:** shop_floor sees only machining pages. hr_manager sees everything.
5. **Timecard:** Setup vs production split visible. OT highlighted. Export works.
6. **Cost:** Job profitability shows labor adjusted for scrap. Machine rates from registry.
7. **Build:** `npx tsc --noEmit` clean, `npx vitest run` passes all tests.

## Deferred to v2
- NFC badge login ($2500 hardware, defer until MVP proves value)
- IndexedDB offline queue (v1: show offline banner, v2: full queue + sync)
- Lights-out manufacturing support (requires architectural changes)
- LOTO tracking, noise dosage, heat stress (OSHA Phase 7)
- Multi-level BOM / work order nesting
- Material lot traceability in time entries
- Scheduling feedback loop (actual → estimate adjustment)
- Machine alarm → auto-pause integration (requires MTConnect/OPC-UA wiring)
- Payroll ADP/Paychex API integration (v1: CSV export only)
- Notification system (v1: in-app toasts; v2: WebSocket push + email/SMS)
