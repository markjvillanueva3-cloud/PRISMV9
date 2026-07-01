# PRISM Employee/HR/Job Tracking — Implementation Plan

## Executive Summary

This plan delivers a 5-phase implementation for employee management, job clock tracking,
role-based access, and cost analysis features. The system already has substantial backend
infrastructure (EmployeeEngine, TimeClockEngine, PayrollEngine, HRComplianceEngine,
AuthEngine) and partial frontend pages. The work is primarily about wiring gaps, adding
missing dispatcher actions, adding PersistenceBridge to EmployeeEngine, introducing a
clearance_level concept, building an AuthContext on the frontend, and upgrading existing
stub pages to use real data with proper multi-job timer support.

---

## Phase 1: Backend Gaps (Wire Missing Pieces)

### 1A. Add job_time_pause and job_time_resume to businessDispatcher

**File to modify:** `H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts`

The TimeClockEngine already has `jobPause()` and `jobResume()` methods (lines 224-249).
The dispatcher's z.enum at ~line 345 is missing these two actions. The ERP route at
`H:/prism/mcp-server/src/routes/erp.ts` line 107 currently maps `/job-time-pause` to
`job_time_start` which is **wrong** — it should map to `job_time_pause`.

Changes needed:
1. Add `"job_time_pause"` and `"job_time_resume"` to the z.enum array after `"job_time_stop"` (line 355)
2. Add two new case blocks after the `job_time_stop` case (after line 999):

```typescript
case "job_time_pause": {
  const engine = await getEngine("timeClock");
  result = engine.jobPause({
    employee_id: params.employee_id ?? params.employeeId,
    job_id: params.job_id ?? params.jobId,
    reason: params.reason ?? "Manual pause",
    timestamp: params.timestamp,
  });
  break;
}
case "job_time_resume": {
  const engine = await getEngine("timeClock");
  result = engine.jobResume(
    params.employee_id ?? params.employeeId,
    params.job_id ?? params.jobId,
    params.timestamp,
  );
  break;
}
```

3. Fix ERP route: In `H:/prism/mcp-server/src/routes/erp.ts` line 107, change:
   - `router.post("/job-time-pause", bizRoute(callTool, "job_time_start"))` to
   - `router.post("/job-time-pause", bizRoute(callTool, "job_time_pause"))`
4. Add new ERP route for resume:
   - `router.post("/job-time-resume", bizRoute(callTool, "job_time_resume"))`

5. Add Zod schemas in `H:/prism/mcp-server/src/schemas/businessActionSchemas.ts` for
   both new actions.

### 1B. Wire EmployeeEngine to PersistenceBridge

**File to modify:** `H:/prism/mcp-server/src/engines/EmployeeEngine.ts`

Currently EmployeeEngine is pure in-memory with no persistence (unlike TimeClockEngine
which already calls `persistenceBridge.persist()` and registers its Maps). Follow the
exact pattern from TimeClockEngine (lines 528-537).

Changes:
1. Add import: `import { persistenceBridge } from "../db/PersistenceBridge.js";`
2. After every mutation in `create()`, `update()`, `addSkill()`, `addCertification()`:
   Add `persistenceBridge.persist("employees", id, emp as any);`
3. At bottom of file, register the Map:
```typescript
persistenceBridge.registerMap({
  entity: "employees",
  getMap: () => (employeeEngine as any).employees as Map<string, any>,
  keyField: "id",
});
```

### 1C. Add clearance_level to Employee model

**File to modify:** `H:/prism/mcp-server/src/engines/EmployeeEngine.ts`

Add a new field to the Employee interface and EmployeeCreateInput:

```typescript
// In Employee interface (after line 23):
clearance_level: ClearanceLevel;

// New type (after line 45):
export type ClearanceLevel = "shop_floor" | "hr_manager" | "admin";
```

Default in `create()`: `clearance_level: input.clearance_level ?? "shop_floor"`

This maps to frontend route visibility:
- `shop_floor`: calculator, post processor, machining tools, clock in/out, job tracking
- `hr_manager`: all shop_floor + employee management, payroll, HR compliance, timecards
- `admin`: everything

### 1D. Add missing ERP routes for employee actions

**File to modify:** `H:/prism/mcp-server/src/routes/erp.ts`

Add these routes that are needed by the frontend but don't exist yet:
```typescript
// Employee update (for editing employee records)
router.post("/employee-update", bizRoute(callTool, "employee_update"));
// Employee get (single by ID)
router.get("/employee/:id", async (req, res) => {
  try {
    const result = await callTool("prism_business", "employee_get", { employee_id: req.params.id });
    res.json({ ok: true, data: result });
  } catch (e: any) { res.status(500).json({ ok: false, error: e.message }); }
});
// Who is clocked in
router.get("/who-clocked-in", bizGet(callTool, "who_clocked_in"));
// Job labor cost
router.post("/job-labor-cost", bizRoute(callTool, "job_labor_cost"));
// Get active jobs for employee
router.post("/active-jobs", bizRoute(callTool, "employee_active_jobs"));
```

Also need to add corresponding dispatcher actions:
- `employee_get` — calls `engine.get(params.employee_id)`
- `employee_update` — calls `engine.update(params.employee_id, params)`
- `job_labor_cost` — calls `timeClockEngine.jobLaborCost(params.job_id)`
- `employee_active_jobs` — new method to return all active/paused JobTimeEntries for an employee

### 1E. Add employee_active_jobs to TimeClockEngine

**File to modify:** `H:/prism/mcp-server/src/engines/TimeClockEngine.ts`

Add new method:
```typescript
/** Get all active and paused job entries for an employee. */
getEmployeeActiveJobs(employeeId: string): JobTimeEntry[] {
  const entries: JobTimeEntry[] = [];
  for (const jt of this.jobTimes.values()) {
    if (jt.employee_id === employeeId && (jt.status === "active" || jt.status === "paused")) {
      entries.push(jt);
    }
  }
  return entries;
}
```

### 1F. Integrate TimeClockEngine.jobLaborCost() with ActualCostEngine

**Already done.** ActualCostEngine.calculate() at line 111 already calls
`timeClockEngine.jobLaborCost(jobId)` directly. No additional wiring needed.
The integration is complete — when an employee clocks time to a job, the
ActualCostEngine automatically picks it up through the jobLaborCost() call.

---

## Phase 2: Auth and RBAC Frontend

### 2A. Create AuthContext and AuthProvider

**New file:** `H:/prism/mcp-server/web/src/contexts/AuthContext.tsx`

Currently no AuthContext exists (only LearningContext at
`H:/prism/mcp-server/web/src/contexts/LearningContext.tsx`). Follow that pattern.

```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  clearanceLevel: ClearanceLevel;
  loading: boolean;
}

interface AuthUser {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
  employee_id?: string;
  clearance_level: ClearanceLevel;
}

type ClearanceLevel = "shop_floor" | "hr_manager" | "admin";

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  canAccessRoute: (path: string) => boolean;
}
```

Implementation:
- On mount, check localStorage for stored token, call `/api/v1/auth/me` to validate
- On login, call `/api/v1/auth/login`, store token, set apiKey via `setApiKey()`
- On logout, clear token, redirect to login
- `canAccessRoute()` maps clearance_level to allowed routes using the route map below

### 2B. Route Access Map

Define in a separate utility file:
**New file:** `H:/prism/mcp-server/web/src/utils/routeAccess.ts`

```typescript
const ROUTE_ACCESS: Record<ClearanceLevel, string[]> = {
  shop_floor: [
    "/calculator", "/ppg", "/post-processor", "/toolpath", "/thread-calculator",
    "/what-if", "/alarms", "/shop-clock", "/jobs", "/employee/*",
  ],
  hr_manager: [
    // All shop_floor routes plus:
    "/employees", "/timecards", "/payroll", "/hr", "/reports",
  ],
  admin: ["*"], // Everything
};
```

### 2C. Login Page

**New file:** `H:/prism/mcp-server/web/src/pages/LoginPage.tsx`

Currently the ShellGatewayPage at path `/signin` exists but is just the shell entry.
Create a proper LoginPage component:
- Username/password fields using the existing Tailwind design system (rounded-[22px],
  border-white/10, bg-white/[0.04] pattern from EmployeePortalPage)
- Call AuthContext.login()
- On success, redirect based on clearance_level:
  - shop_floor -> /employee (EmployeeShellLayout)
  - hr_manager -> /dashboard
  - admin -> /dashboard

### 2D. Wire AuthProvider into App.tsx

**File to modify:** `H:/prism/mcp-server/web/src/App.tsx`

Wrap the entire Routes tree with AuthProvider:
```tsx
<AuthProvider>
  <OperatingSystemProvider>
    <LearningProvider>
      <Routes>
        <Route path="login" element={lazyElement(<LoginPage />)} />
        ...existing routes...
      </Routes>
    </LearningProvider>
  </OperatingSystemProvider>
</AuthProvider>
```

### 2E. ProtectedRoute Component

**New file:** `H:/prism/mcp-server/web/src/components/ProtectedRoute.tsx`

```tsx
function ProtectedRoute({ children, requiredClearance }: {
  children: ReactNode;
  requiredClearance?: ClearanceLevel;
}) {
  const { isAuthenticated, canAccessRoute } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} />;
  if (requiredClearance && !canAccessRoute(location.pathname)) return <Navigate to="/employee" />;
  return children;
}
```

### 2F. Update Layout sidebar to respect clearance

**File to modify:** `H:/prism/mcp-server/web/src/components/shell/shellCatalog.ts`

Add a `requiredClearance` field to NavItem:
```typescript
export type NavItem = {
  to: string;
  label: string;
  keywords?: string[];
  requiredClearance?: ClearanceLevel;
};
```

Then in Layout.tsx, filter nav items based on the user's clearance from AuthContext.

---

## Phase 3: Employee Management UI

### 3A. Upgrade EmployeeDirectoryPage

**File to modify:** `H:/prism/mcp-server/web/src/pages/EmployeeDirectoryPage.tsx`

The page already exists and is partially wired (imports employeeCreate, employeeSearch,
employeeDeptSummary, employeeAddSkill, etc. from api/client). It loads employees and has
tabs for directory/departments/onboard/utilization. However it needs:

1. **Edit employee**: Add an edit modal/slide-over that calls a new `employeeUpdate()` API
2. **Clearance level assignment**: Add a clearance level dropdown in the edit form (visible
   only to hr_manager/admin clearance users)
3. **Role assignment**: The `role` field exists but needs UI in the edit form
4. **Certification management**: Add a "Certifications" tab showing cert status with
   add/renew actions
5. **Filter by status/department/role**: The search input exists but add dropdowns for
   department, role, and status filters using the existing Select component

### 3B. Add API client functions for new endpoints

**File to modify:** `H:/prism/mcp-server/web/src/api/client.ts`

```typescript
export async function employeeGet(id: string): Promise<PrismResponse> {
  return request('GET', `/erp/employee/${encodeURIComponent(id)}`);
}
export async function employeeUpdate(params: {
  employee_id: string;
  [key: string]: unknown;
}): Promise<PrismResponse> {
  return request('POST', '/erp/employee-update', params);
}
export async function jobTimeResume(params: {
  employee_id: string;
  job_id: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/job-time-resume', params);
}
export async function getEmployeeActiveJobs(params: {
  employee_id: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/active-jobs', params);
}
export async function whoClockedIn(): Promise<PrismResponse> {
  return request('GET', '/erp/who-clocked-in');
}
export async function getJobLaborCost(params: {
  job_id: string;
}): Promise<PrismResponse> {
  return request('POST', '/erp/job-labor-cost', params);
}
```

### 3C. Update frontend types

**File to modify:** `H:/prism/mcp-server/web/src/api/types.ts`

Update the Employee interface to include clearance_level:
```typescript
export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  department: string;
  role: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  clearance_level: 'shop_floor' | 'hr_manager' | 'admin';
  // ...existing fields...
}
```

Update JobTimeEntry to include pause_periods:
```typescript
export interface JobTimeEntry {
  id: string;
  employee_id: string;
  job_id: string;
  operation?: string;
  machine_id?: string;
  start_time: string;
  end_time?: string;
  pause_periods: { start: string; end?: string; reason: string }[];
  status: 'active' | 'paused' | 'completed';
  total_minutes?: number;
  productive_minutes?: number;
  notes: string;
}
```

---

## Phase 4: Job Clock and Time Tracking UI (Core Feature)

This is the most complex phase. The ShopFloorClockPage already exists at
`H:/prism/mcp-server/web/src/pages/ShopFloorClockPage.tsx` and is already ~800 lines.
It already has: employee selection, shift clock in/out, single job start/stop,
wall clock display, elapsed timer, department check-in. But it needs major upgrades
for multi-job support.

### 4A. Multi-Job Timer Dashboard Component

**New file:** `H:/prism/mcp-server/web/src/components/shop-floor/ActiveJobsDashboard.tsx`

This is the centerpiece UI showing all active/paused jobs for the logged-in employee:

```
+------------------------------------------------------+
|  ACTIVE JOBS (3)                                      |
+------------------------------------------------------+
| [RUNNING]  JOB-4821  Op 20 - Roughing  02:34:17  [||]|
| [PAUSED]   JOB-4819  Op 10 - Drilling  00:45:02  [>] |
| [PAUSED]   JOB-4823  Op 30 - Finishing  01:12:30  [>] |
+------------------------------------------------------+
|  + Start New Job                                      |
+------------------------------------------------------+
```

Props:
```typescript
interface ActiveJobsDashboardProps {
  employeeId: string;
  onJobStart: (jobId: string, operation?: string) => void;
  onJobPause: (jobId: string) => void;
  onJobResume: (jobId: string) => void;
  onJobStop: (jobId: string) => void;
}
```

Implementation:
- Polls `getEmployeeActiveJobs()` every 10 seconds
- Each job card has a real-time timer using `setInterval` (like existing elapsed timer)
- Pause button on the running job, Play button on paused jobs
- When starting a new job, auto-pauses the currently running job (the backend already
  handles this in TimeClockEngine.jobStart() lines 188-198)
- Stop button to complete a job (removed from active list)
- Color coding: running = emerald, paused = amber, using existing `taskTone()` pattern

### 4B. Job Selection Component

**New file:** `H:/prism/mcp-server/web/src/components/shop-floor/JobSelector.tsx`

A search/select dropdown for picking a job to start:
- Fetches available jobs from `/erp/job/track` or jobs endpoint
- Includes operation/process dropdown
- Optional machine_id selection
- "Quick scan" support (barcode/QR) using the existing scan infrastructure in
  ShopFloorClockPage (lines 86, 93-94)

### 4C. Shift Clock Widget

**New file:** `H:/prism/mcp-server/web/src/components/shop-floor/ShiftClockWidget.tsx`

Extract the shift clock in/out logic from ShopFloorClockPage into a reusable widget:
- Shows current shift status (clocked in/out)
- Wall clock display
- Total shift elapsed time
- Can be embedded in the employee shell header so it is always visible

### 4D. Upgrade ShopFloorClockPage

**File to modify:** `H:/prism/mcp-server/web/src/pages/ShopFloorClockPage.tsx`

Refactor to compose the new components:
1. Replace single-job tracking with ActiveJobsDashboard
2. Add JobSelector for starting new jobs
3. Use ShiftClockWidget at the top
4. Wire pause/resume buttons to the new `jobTimePause()` / `jobTimeResume()` API calls
   (jobTimePause already exists in client.ts line 134, jobTimeResume needs to be added)
5. Keep existing department check-in, hot jobs, and capture features

The page already imports `jobTimePause` from the API client (line 5), but the backend
route was incorrectly mapped. After Phase 1A fixes, this will work correctly.

### 4E. Upgrade Employee Shell Layout

**File to modify:** `H:/prism/mcp-server/web/src/components/employee/EmployeeShellLayout.tsx`

Add ShiftClockWidget to the employee shell header so shift status is always visible
when navigating between employee portal pages. The employee shell already has a
header area (lines 39-98) where this can be inserted.

---

## Phase 5: Cost Analysis and ERP Integration

### 5A. Auto-Calculate Labor Cost

The integration already exists: ActualCostEngine.calculate() at line 111 calls
`timeClockEngine.jobLaborCost(jobId)`. When time is tracked via the clock,
ActualCostEngine automatically picks up the labor data. No new code needed
for the calculation itself.

What IS needed:
- **New ERP route**: `/erp/actual-cost` calling `actual_cost_calculate`
- **Frontend API function**: `getActualCost(params: { job_id: string })`

### 5B. Job Cost Summary View

**File to modify:** `H:/prism/mcp-server/web/src/pages/JobProfitabilityPage.tsx`

This page exists but needs to be upgraded to show the full cost breakdown:
- Labor cost (from TimeClockEngine via ActualCostEngine)
- Material cost (from ActualCostEngine)
- Tooling cost (from ToolUsageEngine via ActualCostEngine)
- Machine cost (from ActualCostEngine)
- Overhead (calculated)
- Total actual vs estimated (variance analysis)

The backend already supports all of this through `actual_cost_calculate`,
`actual_cost_variance`, and `actual_cost_profitability` dispatcher actions.

### 5C. Enhanced Timecard View

**File to modify:** `H:/prism/mcp-server/web/src/pages/TimecardPage.tsx`

The page exists and is partially wired (imports `getTimecard`, `listEmployees`).
Needs upgrades:
1. Weekly/biweekly toggle (currently hardcoded to week)
2. Job breakdown showing hours per job with cost
3. Regular/overtime/double-time hour splits
4. Approval workflow status display
5. Export button for payroll integration

### 5D. Department Utilization Dashboard

**New file:** `H:/prism/mcp-server/web/src/components/dashboard/UtilizationDashboard.tsx`

Or integrated into the existing DashboardPage:
- Shows utilization % per department
- Uses `employee_dept_summary` and `employee_utilization` dispatcher actions
- Bar chart or table showing: department, headcount, average utilization, overtime hours
- Calls EmployeeEngine.departmentSummary() via the dispatcher

### 5E. Who's Clocked In Widget

**New file:** `H:/prism/mcp-server/web/src/components/dashboard/WhoClockedInWidget.tsx`

For the dashboard, showing real-time who is on shift:
- Calls `who_clocked_in` endpoint
- Shows employee name, shift start time, active job
- Auto-refreshes every 30 seconds
- Can be embedded in DashboardPage

---

## File Summary

### Files to CREATE (new):
1. `web/src/contexts/AuthContext.tsx` — Auth state management
2. `web/src/utils/routeAccess.ts` — Route-to-clearance mapping
3. `web/src/pages/LoginPage.tsx` — Login form
4. `web/src/components/ProtectedRoute.tsx` — Route guard
5. `web/src/components/shop-floor/ActiveJobsDashboard.tsx` — Multi-job timer grid
6. `web/src/components/shop-floor/JobSelector.tsx` — Job/operation picker
7. `web/src/components/shop-floor/ShiftClockWidget.tsx` — Always-visible shift status
8. `web/src/components/dashboard/UtilizationDashboard.tsx` — Dept utilization view
9. `web/src/components/dashboard/WhoClockedInWidget.tsx` — Active shift roster

### Files to MODIFY:
1. `src/tools/dispatchers/businessDispatcher.ts` — Add job_time_pause, job_time_resume, employee_get, employee_update, job_labor_cost, employee_active_jobs actions
2. `src/routes/erp.ts` — Fix pause route bug, add resume/get/update/active-jobs routes
3. `src/engines/EmployeeEngine.ts` — Add PersistenceBridge, clearance_level field
4. `src/engines/TimeClockEngine.ts` — Add getEmployeeActiveJobs() method
5. `src/schemas/businessActionSchemas.ts` — Schemas for new actions
6. `web/src/api/client.ts` — Add jobTimeResume, employeeGet, employeeUpdate, getEmployeeActiveJobs, whoClockedIn, getJobLaborCost
7. `web/src/api/types.ts` — Add clearance_level to Employee, update JobTimeEntry
8. `web/src/App.tsx` — Wrap with AuthProvider, add LoginPage route, add ProtectedRoute guards
9. `web/src/components/shell/shellCatalog.ts` — Add requiredClearance to NavItem
10. `web/src/components/Layout.tsx` — Filter nav items by clearance
11. `web/src/components/employee/EmployeeShellLayout.tsx` — Add ShiftClockWidget
12. `web/src/pages/ShopFloorClockPage.tsx` — Refactor for multi-job, compose new components
13. `web/src/pages/EmployeeDirectoryPage.tsx` — Add edit, clearance assignment, certs
14. `web/src/pages/TimecardPage.tsx` — Weekly/biweekly toggle, job breakdown, export
15. `web/src/pages/JobProfitabilityPage.tsx` — Full cost breakdown view

---

## Sequencing and Dependencies

```
Phase 1A (dispatcher fix) ──┐
Phase 1B (persistence)  ────┤
Phase 1C (clearance model) ─┤──> Phase 2 (Auth/RBAC) ──> Phase 3 (Employee UI)
Phase 1D (routes)       ────┤                               │
Phase 1E (active jobs)  ────┘                               v
                                                       Phase 4 (Job Clock UI)
                                                            │
                                                            v
                                                       Phase 5 (Cost/ERP)
```

Phase 1 tasks are independent of each other and can be done in parallel.
Phase 2 depends on clearance_level from Phase 1C.
Phase 3 depends on employee_update route from Phase 1D and auth from Phase 2.
Phase 4 depends on pause/resume fix from Phase 1A and active-jobs from Phase 1E.
Phase 5 depends on working time tracking from Phase 4.

---

## Critical Bug Found

**`H:/prism/mcp-server/src/routes/erp.ts` line 107:**
```typescript
router.post("/job-time-pause", bizRoute(callTool, "job_time_start")); // BUG: routes to start instead of pause
```
This maps the pause endpoint to `job_time_start` instead of a pause action. Even after
adding `job_time_pause` to the dispatcher, this line must be fixed to route to
`"job_time_pause"` instead of `"job_time_start"`.

---

## Risk Assessment

1. **EmployeeEngine persistence migration**: Existing data is in-memory only. First loadAll()
   after adding PersistenceBridge will return empty. Need a migration strategy or accept
   that existing employee records are test data.

2. **Auth token storage**: Using localStorage for JWT tokens is standard but has XSS risk.
   Consider httpOnly cookies for production. For development phase, localStorage is acceptable.

3. **Multi-job timer accuracy**: Client-side timers drift. The source of truth is always the
   server-side timestamps in JobTimeEntry.start_time and pause_periods. Client timers are
   display-only and re-sync on every API call.

4. **Backward compatibility**: Adding clearance_level with a default of "shop_floor" means
   existing employees get restricted access. May want "admin" as default during development.
