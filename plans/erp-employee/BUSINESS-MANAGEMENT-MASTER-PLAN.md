# PRISM Business Management — Unified Master Plan
## All Features, All Roadmaps, One Execution Track

**Created:** 2026-04-08
**Scope:** Complete business management suite for CNC manufacturing job shop
**Source:** Combined from employee-hr-job-tracking-v3.md, MCP_ENHANCEMENT_ROADMAP_v2.md, UNIFIED_ROADMAP_v8.md, PRISM-UNIFIED-MASTER-ROADMAP.md, plus new features

---

## CURRENT STATE AUDIT

### Backend (58 engines, 350 dispatcher actions) — MOSTLY BUILT
| Domain | Engine Count | Status |
|--------|-------------|--------|
| Quoting & Pricing | 12 engines | Built, wired |
| Job Management | 4 engines | Built, wired |
| Financial/GL/AP/AR | 5 engines | Built, wired |
| Employee/HR/Payroll | 4 engines | Built, **NOT persisted** |
| Scheduling/Capacity | 3 engines | Built, wired |
| Quality/SPC | 3 engines | Built, wired |
| Customer/Portal | 3 engines | Built, wired |
| Tool Inventory | 2 engines | Built, wired |
| Reporting | 3 engines | Built, wired |
| Approval/Workflow | 3 engines | Built, wired |
| Integrations | 2 engines | Built, partially wired |

### Frontend (80 pages routed) — PAGES EXIST, MANY USE FIXTURE DATA
| Page | Backend Wired? | Fixture Data? | Blocker |
|------|---------------|---------------|---------|
| ShopFloorClockPage | Partial | Yes (shift/job) | Missing pause/resume actions |
| EmployeeDirectoryPage | Partial | Yes (employees) | No persistence |
| EmployeeProfilePage | Partial | Yes | No persistence |
| TimecardPage | Partial | Some | Missing OT calc wiring |
| PayrollPage | Partial | Yes | Not persisted, no auth |
| InvoicesPage | Yes | Minimal | |
| PurchaseOrdersPage | Yes | Minimal | |
| GeneralLedgerPage | Yes | Some | |
| HRCompliancePage | Partial | Yes | Not persisted |
| DepartmentDashboardPage | No | Full mock | Needs real data feed |
| OEEDashboardPage | Partial | Some | Needs time tracking data |
| KaizenBoardPage | Partial | Some | Needs improvement_note wiring |
| SPCDashboardPage | Partial | Some | Needs CMM data feed |
| ValueStreamPage | No | Full mock | Needs job lifecycle data |
| KanbanBoardPage | Partial | Some | Needs dispatch queue data |
| RootCausePage | Partial | Some | Needs scrap data feed |
| A3ReportPage | No | Full mock | Needs all dashboard data |
| CustomersPage | Yes | Some | |
| CustomerPortalPage | Yes | Some | |
| SchedulingPage | Yes | Minimal | |
| CapacityPlanningPage | Yes | Some | |
| JobsPage | Yes | Some | |
| JobProfitabilityPage | Partial | Yes | Needs actual cost wiring |

### CRITICAL BLOCKERS (from 40-agent scrutiny)
1. **SECURITY EMERGENCY:** Zero auth on ALL `/api/v1/erp` routes
2. **Data Loss:** EmployeeEngine + PayrollEngine not wired to PersistenceBridge
3. **Route Bug:** `/job-time-pause` routes to `job_time_start` instead of pause
4. **Missing Actions:** `job_time_pause` and `job_time_resume` not in dispatcher z.enum
5. **No Auth-to-Employee Link:** AuthEngine and EmployeeEngine completely decoupled

---

## EXECUTION PLAN — 12 PHASES

### PHASE 0: SECURITY & PERSISTENCE (BLOCKING — Do First)
**Priority: CRITICAL | Estimated: 4 units**

| Unit | Description | Files |
|------|-------------|-------|
| BIZ-001 | Add auth middleware to ALL 50+ ERP routes | erp.ts |
| BIZ-002 | Link AuthUser ↔ Employee (add auth_user_id, bidirectional lookup) | EmployeeEngine.ts, AuthEngine.ts, schema.sql |
| BIZ-003 | Wire EmployeeEngine + PayrollEngine + HRComplianceEngine to PersistenceBridge | EmployeeEngine.ts, PayrollEngine.ts, HRComplianceEngine.ts, BusinessStore.ts |
| BIZ-004 | Fix route bug (/job-time-pause → job_time_start), add missing z.enum actions (job_time_pause, job_time_resume, employee_update, who_clocked_in_live) | erp.ts, businessDispatcher.ts |

**EXIT GATE:** All ERP routes require auth. Employee data survives restart. Pause/resume routes work.

---

### PHASE 1: EMPLOYEE DATA MODEL HARDENING
**Priority: HIGH | Estimated: 3 units**

| Unit | Description |
|------|-------------|
| BIZ-005 | Add clearance_level, overtime_policy, shift_differential to Employee model + migration |
| BIZ-006 | Add process_type, pause_periods, good_parts, scrap_count, improvement_note, takt_time to JobTimeEntry + migration |
| BIZ-007 | Add handoff_notes to ShiftEntry, enhance clockOut/clockIn for shift handoff, input sanitization (XSS) |

**EXIT GATE:** Schema migrated. Employee has clearance. JobTimeEntry tracks setup vs production.

---

### PHASE 2: AUTH & ROLE-BASED ACCESS CONTROL
**Priority: HIGH | Estimated: 4 units**

| Unit | Description |
|------|-------------|
| BIZ-008 | Wire AuthContext.tsx to real backend — login → fetch employee → set clearance → store token |
| BIZ-009 | Wire LoginPage.tsx — touch-friendly, barcode scanner input, lockout, redirect by role |
| BIZ-010 | Wire ProtectedRoute.tsx — route map by clearance (shop_floor/lead/hr_manager/admin) |
| BIZ-011 | Wire sidebar filtering by clearance in Layout.tsx + shellCatalog.ts |

**EXIT GATE:** Login works. shop_floor sees only their pages. hr_manager sees all.

---

### PHASE 3: SHOP FLOOR CLOCK & MULTI-JOB TRACKING (Core Feature)
**Priority: HIGH | Estimated: 5 units**

| Unit | Description |
|------|-------------|
| BIZ-012 | Wire ShiftClockWidget to real backend — clock in/out, shift timer, handoff notes, fatigue alert at 12+ hrs |
| BIZ-013 | Wire ActiveJobsDashboard — multi-job cards, live timers, play/pause/stop with reason capture, cost-so-far |
| BIZ-014 | Wire JobSelector — barcode scan input, process type auto-select from routing, machine selection |
| BIZ-015 | Wire ShopFloorClockPage — compose widgets, replace ALL fixture data, WebSocket + 10s poll fallback |
| BIZ-016 | Add offline resilience — IndexedDB queue for actions during WiFi drops, sync on reconnect, conflict resolution |

**EXIT GATE:** Full shift flow works: clock in → see handoff → start Job A (setup) → pause (tool_change) → start Job B → resume Job A → stop with parts count → clock out with handoff.

---

### PHASE 4: EMPLOYEE MANAGEMENT & HR
**Priority: HIGH | Estimated: 5 units**

| Unit | Description |
|------|-------------|
| BIZ-017 | Wire EmployeeDirectoryPage — real data, edit modal (role, dept, rate, clearance, OT policy), status toggle, cert expiry warnings |
| BIZ-018 | Wire EmployeeProfilePage — tabs (Overview, Skills/Certs, Time History, Cost Analysis, Learning), timecard approval workflow |
| BIZ-019 | Wire HRCompliancePage — benefits enrollment, PTO request/approve, training records, performance reviews, compensation history, compliance alerts |
| BIZ-020 | Wire Employee Learning Academy — auto-generate LearningPlan by role, machine certification gates, scrap→training triggers |
| BIZ-021 | Add Employee Lifecycle Management — onboarding checklist, status transitions (active/leave/terminated), offboarding workflow, equipment return tracking |

**EXIT GATE:** Full employee lifecycle from hire to termination. Learning path auto-assigned. Certs enforced.

---

### PHASE 5: TIMECARDS, PAYROLL & LABOR COST
**Priority: HIGH | Estimated: 4 units**

| Unit | Description |
|------|-------------|
| BIZ-022 | Wire TimecardPage — weekly/biweekly, setup vs production split, OT highlighting (daily + weekly FLSA rules), shift differential, timecard approval workflow (draft→submitted→approved→locked) |
| BIZ-023 | Wire PayrollPage — run payroll for period, review stubs, deductions, YTD, export CSV (ADP/Paychex compatible) |
| BIZ-024 | Wire JobProfitabilityPage — labor cost with setup/production split, scrap-adjusted, quoted vs actual, machine burden from registry |
| BIZ-025 | Add Timecard Audit Trail — all edits logged (who/when/why), SOX/ISO compliance, manager override with change_reason |

**EXIT GATE:** Timecards calculate OT correctly. Payroll runs and persists. Job profitability shows real data.

---

### PHASE 6: LEAN / KAIZEN / SIX SIGMA DASHBOARDS
**Priority: MEDIUM | Estimated: 7 units**

| Unit | Description |
|------|-------------|
| BIZ-026 | Wire OEEDashboardPage — Availability × Performance × Quality per machine/shift/dept, Six Big Losses, 30-day trend, drill-down to top 5 downtime causes |
| BIZ-027 | Wire KaizenBoardPage — improvement_note inbox from job stops, impact scoring, before/after tracker, top contributors, monthly events |
| BIZ-028 | Wire SPCDashboardPage — X-bar/R charts from scrap data, Cpk/Ppk calculation, Nelson Rules violations, DMAIC project tracker |
| BIZ-029 | Wire ValueStreamPage — process boxes with actual vs estimated time, WIP triangles, lead time calc, value-added ratio, takt time overlay |
| BIZ-030 | Wire KanbanBoardPage — columns (Queued→Setup→Running→Inspection→Complete→Shipped), WIP limits, drag-to-assign, priority colors, Heijunka toggle |
| BIZ-031 | Wire RootCausePage — 5 Whys guided drill-down, Fishbone (Ishikawa) auto-generation, corrective action items, link to TroubleshootingEngine |
| BIZ-032 | Wire A3ReportPage — Toyota A3 template auto-populated from OEE + scrap + Kaizen, PDF export |

**EXIT GATE:** All 7 Lean pages show real data from time tracking + scrap + downtime. A3 generates PDF.

---

### PHASE 7: DEPARTMENT & MANAGEMENT DASHBOARDS
**Priority: MEDIUM | Estimated: 4 units**

| Unit | Description |
|------|-------------|
| BIZ-033 | Wire DepartmentDashboardPage — who's clocked in (live), active jobs per machine, utilization % per employee/dept, downtime Pareto, cost per dept |
| BIZ-034 | Add Executive Dashboard Page — P&L summary, revenue forecast, cash flow, AR aging, top 10 customers by revenue, margin trends, headcount |
| BIZ-035 | Add Shop Floor TV Display Mode — large-font read-only dashboard for wall-mounted monitors showing live machine status, OEE, job queue, shift countdown |
| BIZ-036 | Add Daily Flash Report — auto-generated end-of-day summary: jobs completed, scrap rate, OEE, labor utilization, on-time delivery %, emailed to management |

**EXIT GATE:** Department heads see their team live. Execs see financial summary. Shop floor TVs show status.

---

### PHASE 8: ADVANCED QUOTING & SALES
**Priority: MEDIUM | Estimated: 5 units**

| Unit | Description |
|------|-------------|
| BIZ-037 | Add RFQ Inbox Page — receive inbound RFQ emails/uploads, parse requirements, auto-route to estimator, track response deadline |
| BIZ-038 | Add Quote Follow-Up Workflow — auto-reminders at 3/7/14 days, win/loss tracking with reason codes, competitive intelligence capture |
| BIZ-039 | Add Sales Pipeline Dashboard — funnel view (RFQ→Quoted→Negotiation→Won→Lost), weighted forecast, conversion rates by customer/material/process |
| BIZ-040 | Add Commission/Bonus Tracker — sales rep commission rules (% of margin, tiered), bonus calculations, payout tracking |
| BIZ-041 | Add Customer Credit Management — credit limits, payment terms, aging alerts, credit hold enforcement (block new orders when overdue) |

**EXIT GATE:** Full quote lifecycle from RFQ receipt to win/loss. Sales pipeline with forecast. Commissions calculated.

---

### PHASE 9: PROCUREMENT & VENDOR MANAGEMENT
**Priority: MEDIUM | Estimated: 5 units**

| Unit | Description |
|------|-------------|
| BIZ-042 | Add Vendor Portal Page — mirror of CustomerPortalPage for suppliers, PO status, delivery confirmations, quality scorecards |
| BIZ-043 | Add Vendor Scorecard Engine + Page — on-time delivery %, quality rejection rate, price competitiveness, lead time reliability, weighted ranking |
| BIZ-044 | Add Receiving & Inspection Page — dock scheduling, receiving against PO, incoming inspection with accept/reject/NCR, lot tracking |
| BIZ-045 | Add Material Requirements Planning (MRP) — BOM explosion, net requirements, planned orders, safety stock, lead time offset scheduling |
| BIZ-046 | Add Shipping & Packing Page — packing list generation, Bill of Lading, carrier selection, tracking number capture, proof of delivery |

**EXIT GATE:** Full procure-to-pay cycle. Vendors scored. Material planned. Shipping tracked.

---

### PHASE 10: MAINTENANCE & ASSET MANAGEMENT
**Priority: MEDIUM | Estimated: 4 units**

| Unit | Description |
|------|-------------|
| BIZ-047 | Add Preventive Maintenance Engine + Page — PM schedule by machine (hours/calendar), work order generation, parts list, downtime tracking |
| BIZ-048 | Add Equipment Asset Registry Page — all machines/fixtures/gages with purchase date, depreciation, location, calibration due dates |
| BIZ-049 | Add Maintenance Work Order Page — create/assign/complete maintenance tasks, parts used, labor hours, cost tracking, priority escalation |
| BIZ-050 | Add Calibration Management Page — gage R&R tracking, calibration certificates, due date alerts, out-of-cal lockout for inspection equipment |

**EXIT GATE:** PM schedules auto-generate work orders. Equipment tracked. Calibrations managed.

---

### PHASE 11: COMPLIANCE, SAFETY & ENVIRONMENTAL
**Priority: MEDIUM | Estimated: 4 units**

| Unit | Description |
|------|-------------|
| BIZ-051 | Add OSHA Compliance Page — incident reporting (OSHA 300/300A/301 logs), near-miss tracking, safety training records, PPE assignment |
| BIZ-052 | Add ISO/AS9100 Audit Manager — internal audit scheduling, finding tracking, CAPA (Corrective Action / Preventive Action), management review data package |
| BIZ-053 | Add Environmental Compliance Page — coolant disposal tracking, chip recycling logs, hazardous material inventory (SDS management), EPA reporting |
| BIZ-054 | Add Non-Conformance/CAPA Workflow — NCR creation from any source (receiving, in-process, final, customer), 8D report template, containment → root cause → corrective action → verification |

**EXIT GATE:** OSHA logs generated. Audit findings tracked to closure. NCRs follow 8D methodology.

---

### PHASE 12: INTEGRATIONS & AUTOMATION
**Priority: LOW | Estimated: 5 units**

| Unit | Description |
|------|-------------|
| BIZ-055 | Wire E2 Shop System connector — bidirectional sync (jobs, employees, time entries, invoices) |
| BIZ-056 | Wire QuickBooks Online deep sync — auto-create invoices from completed jobs, sync payments, reconcile GL |
| BIZ-057 | Add Payroll Export (ADP/Paychex/Gusto) — format timecards per provider spec, include OT/shift diff/deductions |
| BIZ-058 | Add Email/Notification System — transactional emails (quote sent, order confirmed, invoice due), in-app notifications, SMS for machine alarms |
| BIZ-059 | Add Webhook/API for external systems — inbound webhooks for machine monitoring (MTConnect/OPC-UA → auto-pause jobs), outbound webhooks for ERP events |

**EXIT GATE:** Data flows between PRISM and external systems. No double-entry.

---

## NEW FEATURES NOT IN ANY PRIOR ROADMAP

These are features I'm adding based on what a real CNC job shop needs beyond what was previously planned:

### PHASE 7 additions:
- **BIZ-034: Executive Dashboard** — No prior roadmap had a C-suite financial overview
- **BIZ-035: Shop Floor TV Mode** — Shops mount TVs for real-time visibility; no roadmap addressed this
- **BIZ-036: Daily Flash Report** — Every shop owner wants an end-of-day email summary

### PHASE 8 (entirely new):
- **RFQ Inbox** — Currently quotes start manually; real shops receive RFQs via email/portal
- **Quote Follow-Up** — Win/loss tracking exists in QuoteAnalyticsEngine but no workflow for follow-up reminders
- **Sales Pipeline** — CustomerManagementEngine has opportunities but no pipeline visualization
- **Commission Tracker** — No prior roadmap addressed sales compensation
- **Credit Management** — CustomerManagementEngine has credit_check but no enforcement workflow

### PHASE 9 additions:
- **Vendor Portal** — Mirror of customer portal for suppliers (no prior roadmap)
- **Vendor Scorecard** — PurchaseOrderEngine tracks receiving but no scoring dashboard
- **Receiving/Inspection** — PO receiving exists but no incoming inspection workflow
- **MRP/BOM** — No material planning engine exists; shops need net requirements calculation
- **Shipping/Packing** — OrderManagerEngine tracks orders but no shipping workflow

### PHASE 10 (entirely new):
- **Preventive Maintenance** — Machines need scheduled maintenance; no PM engine exists
- **Equipment Asset Registry** — MachineRegistry has specs but no financial/depreciation data
- **Maintenance Work Orders** — Distinct from job work orders; for repair/maintenance tasks
- **Calibration Management** — Quality engines track certs but not gage calibration schedules

### PHASE 11 (entirely new):
- **OSHA Compliance** — No safety compliance logging existed
- **ISO/AS9100 Audit Manager** — Quality engines exist but no audit scheduling/tracking
- **Environmental Compliance** — No coolant/chip/hazmat tracking
- **NCR/CAPA 8D Workflow** — QualityManagementEngine has NCR create/update but no full 8D workflow

### PHASE 12 additions:
- **Payroll Export** — PayrollEngine calculates but can't export to payroll providers
- **Email/Notification System** — No transactional email engine exists
- **Webhook API** — SaaSAPIEngine exists but no inbound webhook processing for machine events

---

## IMPLEMENTATION ORDER

```
PHASE 0 (Security + Persistence)     ← BLOCKING, do first
  ↓
PHASE 1 (Data Model)  →  PHASE 2 (Auth/RBAC)
  ↓                         ↓
PHASE 3 (Shop Clock)     PHASE 4 (Employee/HR)
  ↓                         ↓
PHASE 5 (Timecards/Payroll/Cost)
  ↓
PHASE 6 (Lean/Kaizen)  ←  needs 3-6 months of time/scrap data to be meaningful
  ↓
PHASE 7 (Dashboards)   |  PHASE 8 (Quoting/Sales)   |  PHASE 9 (Procurement)
  ↓                       ↓                             ↓
PHASE 10 (Maintenance)  |  PHASE 11 (Compliance)
  ↓
PHASE 12 (Integrations)
```

Phases 6-11 can be parallelized — they're independent domains.
Phases 0-5 are sequential — each builds on the prior.

---

## TOTAL SCOPE

| Metric | Count |
|--------|-------|
| Phases | 13 (0-12) |
| Units | 59 |
| New Pages | ~15 |
| Modified Pages | ~23 |
| New Engines | ~8 |
| Modified Engines | ~12 |
| New DB Migrations | ~6 |
| Estimated LOC | ~12,000 |

---

## ENGINES TO CREATE (New)

| Engine | Domain | Key Actions |
|--------|--------|-------------|
| PreventiveMaintenanceEngine | Maintenance | pm_schedule_create, pm_work_order_generate, pm_complete, pm_overdue_alerts |
| EquipmentAssetEngine | Asset Mgmt | asset_register, asset_depreciation, asset_location, asset_transfer |
| MaintenanceWorkOrderEngine | Maintenance | mwo_create, mwo_assign, mwo_complete, mwo_parts_used, mwo_cost |
| CalibrationEngine | Quality | cal_schedule, cal_record, cal_certificate, cal_overdue_alerts, cal_gage_rr |
| VendorScorecardEngine | Procurement | vendor_score, vendor_rank, vendor_trend, vendor_compare |
| MRPEngine | Planning | mrp_explode_bom, mrp_net_requirements, mrp_planned_orders, mrp_pegging |
| ShippingEngine | Logistics | ship_packing_list, ship_bol, ship_carrier_select, ship_tracking, ship_pod |
| NotificationEngine | Communication | notify_email, notify_sms, notify_in_app, notify_preferences, notify_templates |

---

## EXISTING ENGINES TO MODIFY

| Engine | Changes |
|--------|---------|
| EmployeeEngine | Add clearance_level, auth_user_id, overtime_policy, shift_differential, lifecycle management |
| TimeClockEngine | Add process_type, pause_periods with reasons, good_parts, scrap, improvement_note, takt_time, shift handoff |
| PayrollEngine | Wire to PersistenceBridge, add shift differential calc, OT rules (daily + weekly) |
| HRComplianceEngine | Wire to PersistenceBridge |
| ActualCostEngine | Wire to TimeClockEngine for real labor data |
| OEECalculatorEngine | Wire to TimeClockEngine pause_periods for availability calc |
| CustomerManagementEngine | Add credit hold enforcement, pipeline visualization data |
| QualityManagementEngine | Add full 8D NCR/CAPA workflow, audit scheduling |
| PurchaseOrderEngine | Add receiving/inspection workflow, vendor scoring data feed |
| OrderManagerEngine | Add shipping/tracking workflow |
| JobLifecycleEngine | Add value stream timing data |
| QuoteAnalyticsEngine | Add win/loss follow-up workflow, RFQ tracking |

---

## FILES SUMMARY

**Backend (modify):**
erp.ts, businessDispatcher.ts, EmployeeEngine.ts, TimeClockEngine.ts, PayrollEngine.ts, HRComplianceEngine.ts, BusinessStore.ts, ActualCostEngine.ts, OEECalculatorEngine.ts, CustomerManagementEngine.ts, QualityManagementEngine.ts, PurchaseOrderEngine.ts, OrderManagerEngine.ts, JobLifecycleEngine.ts, QuoteAnalyticsEngine.ts, AuthEngine.ts

**Backend (new engines):**
PreventiveMaintenanceEngine.ts, EquipmentAssetEngine.ts, MaintenanceWorkOrderEngine.ts, CalibrationEngine.ts, VendorScorecardEngine.ts, MRPEngine.ts, ShippingEngine.ts, NotificationEngine.ts

**Backend (new migrations):**
011-employee-enhancements.sql, 012-job-time-enhancements.sql, 013-maintenance.sql, 014-calibration.sql, 015-shipping.sql, 016-notifications.sql

**Frontend (modify — wire to real backend):**
ShopFloorClockPage.tsx, EmployeeDirectoryPage.tsx, EmployeeProfilePage.tsx, TimecardPage.tsx, PayrollPage.tsx, HRCompliancePage.tsx, DepartmentDashboardPage.tsx, OEEDashboardPage.tsx, KaizenBoardPage.tsx, SPCDashboardPage.tsx, ValueStreamPage.tsx, KanbanBoardPage.tsx, RootCausePage.tsx, A3ReportPage.tsx, JobProfitabilityPage.tsx, CustomersPage.tsx, CustomerPortalPage.tsx, LoginPage.tsx, Layout.tsx, shellCatalog.ts, App.tsx, AuthContext.tsx, ProtectedRoute.tsx

**Frontend (new pages):**
ExecutiveDashboardPage.tsx, ShopFloorTVPage.tsx, RFQInboxPage.tsx, SalesPipelinePage.tsx, CommissionTrackerPage.tsx, VendorPortalPage.tsx, VendorScorecardPage.tsx, ReceivingInspectionPage.tsx, MRPPage.tsx, ShippingPage.tsx, PreventiveMaintenancePage.tsx, EquipmentAssetPage.tsx, MaintenanceWorkOrderPage.tsx, CalibrationPage.tsx, OSHACompliancePage.tsx, AuditManagerPage.tsx, EnvironmentalPage.tsx, NCRCAPAPage.tsx

**Frontend (new components):**
jobs/ShiftClockWidget.tsx (modify), jobs/ActiveJobsDashboard.tsx (modify), jobs/JobSelector.tsx (modify), employee/EmployeeEditModal.tsx (modify), employee/EmployeeShellLayout.tsx (modify), learning/* (wire existing)

---

## VERIFICATION CHECKLIST (per phase)

For EVERY phase:
1. `npx tsc --noEmit` → 0 errors
2. `npx vitest run` → 0 failures
3. All modified pages load without console errors
4. All new routes have auth middleware
5. All new dispatcher actions are in z.enum
6. All engines using persistence survive server restart
7. All user input is sanitized (XSS prevention)
8. No hardcoded rates/costs — pull from registries
