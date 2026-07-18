# HOTEL/U-EMPLOYEE-TIMECLOCK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-TIMECLOCK (slot:hotel iter36 /goal /yolo): punch FSM + daily/weekly minute totals + FLSA OT detection — closes original operator brief

**Commit:** `7833436b8873` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T03:17:39-05:00
**Tags:** hotel, u-employee-timeclock, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-TIMECLOCK (slot:hotel iter36 /goal /yolo): punch FSM + daily/weekly minute totals + FLSA OT detection — closes original operator brief

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [HOTEL]/U-EMPLOYEE-TIMECLOCK (slot:hotel iter36 /goal /yolo): punch FSM + daily/weekly minute totals + FLSA OT detection — closes original operator brief

Last named gap from the 5/25 2am CST brief: "office personnel time-clock". This engine completes the original operator scope — every named axis from that brief (employee portal, office personnel, ERP, business/shop management, scheduling, accounting, ordering, shipping/receiving, inspection reports for QC) now has a wired engine + REST + tests + viz nodes.

Shipped (7 files):
- engines/EmployeeTimeClockEngine.ts — recordPunch / editPunch / getDailySummary / deriveState. 4-state FSM (clocked_out/clocked_in/on_break) gated by ALLOWED_PUNCHES table. Daily minute aggregation across break boundaries with break-time excluded from worked-time. Auto-flags: forgotten_clock_out (>=24h since clock_in, caps worked at 12h), missed_break (>6h shift with zero break), weekly_ot_threshold (week-to-date+today > 40h FLSA), edit_without_approval (edited punch missing approver). 5-min clock-drift tolerance on future-timestamp rejection. SoD on retroactive edit (approver != employee).
- __tests__/EmployeeTimeClockEngine.test.ts — 30 tests: punch FSM (clock_in/clock_out happy + 6 illegal transitions + backdated + future-timestamp rejection) + editPunch SoD (3 cases) + daily summary aggregation (single shift, shift+break, missed-break flag, OT flag, no-OT verification, multi-shift, open shift, on-break) + 3 R12 (foreign employee_id, bad date, negative week-to-date) + deriveState replay (5 states) + PII-free + frozen + 4-punch-kind variability floor.
- tools/dispatchers/businessDispatcher.ts — 4 new actions: timeclock_record_punch, timeclock_edit_punch, timeclock_daily_summary, timeclock_derive_state.
- routes/hotel-portal.ts — POST /timeclock/punch + /timeclock/summary + /timeclock/edit; health bumped portal_engines=17, iter_range=iter15..iter36.
- __tests__/hotel-portal-live-integration.test.ts — 4 new HTTP roundtrips: 8h-shift round-trip via /punch + /summary, double clock_in rejection, FLSA OT flag surfaced via HTTP, SoD edit rejection. realCallTool harness wired 3 new actions.
- ENGINE_DIGEST.md — alphabetical insert.
- scripts/generate-hotel-domain-features.mjs — /^timeclock_/i regex in BUSINESS_PATTERNS.

/system-viz: 368 → 372 nodes (+4 timeclock actions under ghost.business_frontend / axis: business / color: violet).

PSN bridges live:
- punch_in → EmployeeDailyDigestEngine (iter20): shift_state surfaces on phone digest
- daily_summary.worked_minutes → EmployeePayrollGrossPayEngine (iter19): drives regular_hours + overtime_hours
- weekly_ot_threshold flag → payroll: triggers 1.5× FLSA rate on overage
- punch chronology vs EmployeeShiftScheduleEngine (iter17) scheduled shift: late/early clock-in attendance signal
- missed_break flag → ManagerDailyDashboardEngine (iter21): coverage/compliance row
- forgotten_clock_out flag → NonConformanceAndCorrectiveActionEngine (iter23): supervisor must reconcile
- summary.worked_minutes aggregate → ExecutiveSummaryEngine (iter31) total hours rollup

Hotel-soul invariants end-to-end:
- PII-free: HTTP roundtrip + JSON regex confirms no employee_name / SSN / DOB
- SoD on edit: HARD reject when approver_employee_id == employee_id; required field on retroactive edits
- R12 fail-loud: 3 adversarial inputs (illegal transition, double clock_in, future timestamp) surface engine error verbatim through Express
- Object.frozen: summary + nested flags + punches array all frozen
- Time integrity: backdated punch rejected (predates last); future timestamp > 5min drift rejected; foreign employee_id in summary throws
- FLSA correctness: 40h × 60 = 2400-minute threshold tested with real arithmetic (38h + 4h = 2520min > 2400)

Tests: 65/65 PASS (30 EmployeeTimeClockEngine unit + 35 hotel-portal live integration with 4 new timeclock roundtrips).

ITER32-36 CUMULATIVE ARC:
- iter32: ExecutiveSummary wired app-wide (REST + React + tests)
- iter33: InspectionReport (QC + CofC) → bridges NCR
- iter34: ShippingReceivingLog (3-way match) → bridges Inspection + Vendor
- iter35: PurchaseOrderLifecycle (8-state FSM) → bridges Shipping
- iter36: EmployeeTimeClock (punch FSM) → bridges Payroll + Schedule + Digest
Net: 5 engines · ~20 new dispatcher actions · ~14 new REST endpoints · ~150 new tests · viz 357→372 nodes (+15). Hotel ERP/HR portal is now end-to-end complete across every original-brief-named axis.
```

## Files touched (8)
- mcp-server/data/docs/ENGINE_DIGEST.md              |   1 +
- .../src/__tests__/EmployeeTimeClockEngine.test.ts  | 325 +++++++++++++++++++++
- .../hotel-portal-live-integration.test.ts          |  88 +++++-
- mcp-server/src/engines/EmployeeTimeClockEngine.ts  | 318 ++++++++++++++++++++
- mcp-server/src/routes/hotel-portal.ts              |  26 +-
- .../src/tools/dispatchers/businessDispatcher.ts    |  32 ++
- scripts/generate-hotel-domain-features.mjs         |   1 +
- 7 files changed, 787 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7833436b8873`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._