# PRISM App Full-Stack Wiring Roadmap

## Context

The BizTrack backend roadmap is complete: **415+ business actions across 42 engines** are built and functional via MCP dispatchers. The web app has **48+ pages** with routes in App.tsx, including recent BizTrack additions (daily-flash, sales-pipeline, commissions, credit-management, vendor-scorecard, receiving, shipping, maintenance, assets, calibration, OSHA, audit-manager). However:

1. **Navigation gaps** — 14+ newer pages have routes but NO sidebar nav entries in `shellCatalog.ts`
2. **Shallow API wiring** — Many pages scaffold UI but don't call all available backend actions (e.g., PayrollPage only wires `runPayroll`, missing `createPeriod` and `payStub`)
3. **No role-based dashboards** — Operators, HR managers, accountants, and executives all see the same dashboard
4. **No workflow/approval integration** — 10 workflow actions exist but no UI
5. **Notifications not wired** — NotificationCenter component exists but doesn't call backend
6. **Missing pages** — Travelers, dispatch board, savings/ROI, workflows need dedicated pages

## Critical Files

| File | Purpose |
|------|---------|
| `web/src/App.tsx` | Route definitions (299 LOC) |
| `web/src/components/shell/shellCatalog.ts` | Sidebar nav structure (370 LOC) |
| `web/src/api/client.ts` | Central API wrapper — needs ~40 new action wrappers |
| `web/src/contexts/AuthContext.tsx` | Auth + clearance levels |
| `web/src/api/types.ts` | Response type definitions |
| `src/routes/erp.ts` | Backend Express routes — needs ~30 new routes |

---

## Phase 1: Navigation & API Foundation
**Goal:** Make all built pages discoverable and wire missing API wrappers

### MS1: Sidebar Navigation Completion (S)
Add missing pages to `shellCatalog.ts` NAV_SECTIONS:

**Shop and ERP section — add:**
- `/daily-flash` — Daily Flash (keywords: daily report, summary)
- `/rfq-inbox` — RFQ Inbox (keywords: rfq, request for quote)
- `/sales-pipeline` — Sales Pipeline (keywords: deals, forecast, pipeline)
- `/commissions` — Commissions (keywords: sales commission, rep)
- `/credit-management` — Credit Management (keywords: credit hold, limit)
- `/vendor-scorecard` — Vendor Scorecard (keywords: supplier, performance)
- `/receiving` — Receiving (keywords: inspection, dock, receipt)
- `/shipping` — Shipping (keywords: packing, bol, tracking)
- `/maintenance` — Maintenance (keywords: pm, preventive, work order)
- `/assets` — Equipment Assets (keywords: depreciation, register)
- `/work-orders` — Work Orders (keywords: maintenance wo, assign)
- `/calibration` — Calibration (keywords: gage, grr, lockout)
- `/osha` — OSHA Compliance (keywords: incident, near miss, ppe, 300 log)
- `/audit-manager` — Audit Manager (keywords: finding, capa, review)

**Add minClearance tags:**
- `/commissions` → lead
- `/credit-management` → lead
- `/maintenance`, `/assets`, `/calibration` → lead
- `/osha`, `/audit-manager` → hr_manager
- `/daily-flash` → lead

### MS2: API Wrapper Completion (M)
Add missing wrappers to `web/src/api/client.ts`:

**Payroll (missing 2):** `payrollCreatePeriod`, `payrollPayStub`
**Invoicing (missing 3):** `invoiceFromJob`, `invoicePayment`, `invoiceAging`
**GL (missing 1):** `glRecordWipToCogs`
**Workflow (all 10):** `workflowConfigure`, `workflowSubmit`, `workflowDecide`, `workflowPending`, `approvalWorkflowStatus`, `workflowCancel`, `approvalWorkflowList`, `workflowStats`, `workflowRequiresApproval`, `workflowEntityHistory`
**Milestones (all 8):** `milestoneCreateTimeline`, `milestoneGetTimeline`, `milestoneAdvance`, `milestoneSkip`, `milestoneEvents`, `milestoneListJobs`, `milestoneOnJobStatus`, `milestoneDelete`
**Profitability (all 3):** `profitabilityAnalyze`, `profitabilityCompare`, `profitabilitySensitivity`
**Notifications (all 3):** `notifySend`, `notifyPreferencesGet`, `notifyPreferencesSet`
**Savings/ROI (all 12):** `savingsDashboard`, `savingsRecord`, `savingsRoi`, `savingsTrend`, `roiLog`, `roiLogOutcome`, `roiSummary`, `roiReport`, `roiReset`, `roiConfigureCosts`, `roiEvents`, `roiTrend`

### MS3: Backend Route Completion (M)
Add Express routes in `src/routes/erp.ts` for actions that lack routes:
- Workflow/approval routes (10)
- Milestone routes (8)
- Profitability routes (3)
- Savings/ROI routes (12)
- Notification routes (3)
- Daily flash routes (2)

### MS4: Type Definitions (S)
Add TypeScript interfaces to `web/src/api/types.ts`:
- WorkflowRecord, ApprovalDecision, WorkflowStats
- MilestoneTimeline, MilestoneEvent
- ProfitabilityResult, SensitivityScenario
- SavingsRecord, ROIEntry, ROIReport
- NotificationPreference
- DailyFlashReport

---

## Phase 2: Employee & Shop Floor Deep Wiring
**Goal:** Complete the shop floor operator experience

### MS5: ShopFloorClockPage Enhancement (S)
Page exists (1057 LOC). Add:
- `who_clocked_in_live` with WebSocket real-time feed
- Shift handoff summary display
- Job labor cost running total

### MS6: Traveler Page (M)
Create `web/src/pages/TravelerPage.tsx` + route `/travelers`:
- Wire: traveler_create, traveler_start_setup, traveler_start_cycle, traveler_complete_step, traveler_scan, traveler_get_active, traveler_get
- Step-by-step routing view with setup/cycle timing
- QR scan input for mobile step transitions
- Add to shellCatalog under Shop and ERP

### MS7: Dispatch Board Page (M)
Create `web/src/pages/DispatchBoardPage.tsx` + route `/dispatch`:
- Wire: dispatch_queue_job, dispatch_get_queue, dispatch_reorder, dispatch_get_all_queues, dispatch_what_if, dispatch_remove
- Drag-and-drop queue reordering (use @dnd-kit already installed)
- Machine-centric view with queued jobs per machine
- Add to shellCatalog under Quotes and Planning

### MS8: Milestone Integration (S)
Add milestone timeline to JobsPage and OrderTrackingPage:
- Visual progress bar per job using milestone_get_timeline
- Milestone advance/skip controls for leads
- Event history panel

---

## Phase 3: HR & People Deep Wiring
**Goal:** Complete HR manager workflows end-to-end

### MS9: HR Page Completion (S)
HRCompliancePage (576 LOC) is mostly wired. Add:
- `hr_pto_init` — Initialize PTO balance for new hires
- `hr_training_add` — Record training from HR side
- Compensation history timeline view

### MS10: OSHA Page Deep Wire (M)
OSHACompliancePage exists but verify API wiring:
- Incident form with severity classification
- OSHA 300 log generation and annual summary view
- Near-miss trending chart
- PPE assignment tracker with compliance %

### MS11: Audit Manager Deep Wire (M)
AuditManagerPage exists but verify API wiring:
- Audit schedule calendar
- Finding → CAPA workflow with status tracking
- Management review dashboard with compliance KPIs

### MS12: Workflow & Approvals Page (M)
Create `web/src/pages/WorkflowPage.tsx` + route `/workflows`:
- Pending approval inbox with approve/reject/info actions
- Workflow configuration for admins
- Approval history per entity
- Badge counts on sidebar items that trigger workflows (PO, PTO, etc.)
- Add to shellCatalog under Shop and ERP (minClearance: lead)

### MS13: Employee Profile Enhancement (S)
EmployeeProfilePage exists at `/employees/:employeeId`. Add tabs:
- Training & certifications timeline
- PTO calendar
- Performance review history
- Compensation history
- Skill matrix radar chart

---

## Phase 4: Financial & Accounting Deep Wiring
**Goal:** Complete accounting lifecycle end-to-end

### MS14: Payroll Completion (M)
PayrollPage (351 LOC) only wires `runPayroll`. Add:
- Period creation form (pay period dates, type)
- Pay stub viewer with breakdown per employee
- GL posting integration (link to journal entry)
- Period status tracking (draft → processed → posted)

### MS15: Invoice Completion (M)
InvoicesPage (389 LOC) missing 3 actions. Add:
- "Invoice from Job" button on job detail
- Payment recording form with amount/method
- AR aging report tab with 30/60/90/120 buckets
- Invoice detail view with line items

### MS16: GL Completion (S)
GeneralLedgerPage (724 LOC) mostly complete. Add:
- WIP-to-COGS transfer for completed jobs
- Period close checklist
- Accounting audit integration

### MS17: Profitability Page Enhancement (M)
JobProfitabilityPage exists. Enhance with:
- Waterfall chart (quoted vs actual cost breakdown)
- Customer-level profitability ranking
- Sensitivity analysis (material cost, labor rate sliders)
- Margin trend over configurable time periods

### MS18: Savings/ROI Dashboard (M)
Create `web/src/pages/SavingsROIPage.tsx` + route `/savings`:
- Savings dashboard with category pie chart
- ROI initiative log with outcome tracking
- Trend charts over configurable periods
- Cost configuration settings panel
- Add to shellCatalog under Shop and ERP (minClearance: lead)

---

## Phase 5: Operations Deep Wiring
**Goal:** Complete maintenance, assets, calibration, receiving/shipping

### MS19: Preventive Maintenance Deep Wire (M)
PreventiveMaintenancePage exists. Verify/complete wiring:
- PM schedule calendar with due/overdue highlights
- Auto-generate work orders from schedule
- Completion form with technician sign-off
- Overdue alert banner

### MS20: Equipment Assets Deep Wire (M)
EquipmentAssetPage exists. Verify/complete wiring:
- Asset registry with search/filter
- Depreciation schedule display (straight-line, MACRS)
- Transfer history log
- Due calibration alert badges

### MS21: Calibration Deep Wire (S)
CalibrationPage exists. Verify/complete wiring:
- GR&R study recording and reporting
- Lockout/unlock controls for out-of-cal equipment
- Calibration due schedule with email alerts

### MS22: Receiving & Shipping Deep Wire (M)
ReceivingInspectionPage + ShippingPackingPage exist. Verify/complete:
- Receiving inspection form with accept/reject/NCR flow
- PO 3-way match integration on receipt
- Bill of lading creation
- Tracking number entry with carrier selection
- Shipment completion workflow

### MS23: NCR 8D Enhancement (S)
Add to QualityManagementPage:
- 8D wizard (8 sequential steps)
- NCR → 8D → CAPA workflow
- Root cause linkage to RootCausePage
- 8D report PDF generation

---

## Phase 6: Sales & Customer Deep Wiring
**Goal:** Complete CRM, pipeline, vendor, commission, portal

### MS24: Sales Pipeline Deep Wire (M)
SalesPipelinePage exists. Verify/complete:
- Pipeline Kanban board (drag opportunities between stages)
- Forecast chart with weighted pipeline value
- Stage conversion analytics
- Pipeline_forecast, pipeline_stages, pipeline_move wiring

### MS25: Commission Tracker Deep Wire (S)
CommissionTrackerPage exists. Verify/complete:
- Commission calculation per deal/rep
- Period summary report
- Threshold/tier configuration

### MS26: Vendor Scorecard Deep Wire (S)
VendorScorecardPage exists. Verify/complete:
- Quality/delivery/price scoring matrix
- Vendor directory with search
- PO history per vendor linkage

### MS27: Credit Management Deep Wire (S)
CreditManagementPage exists. Verify/complete:
- Credit review dashboard per customer
- Hold/release controls on orders
- Warning badges on customer cards and order creation

### MS28: Customer Portal Enhancement (S)
CustomerPortalPage (1116 LOC) is extensively wired. Enhance:
- Milestone timeline in order status view
- Quality document upload workflow
- Real-time status via WebSocket

---

## Phase 7: Role-Based Dashboards
**Goal:** Each role sees a tailored home dashboard

### MS29: Shop Floor Lead Dashboard (M)
Create tabbed view on DashboardPage or `/dashboard/lead`:
- Active jobs count + machine utilization gauges
- Hot jobs list (from operating system)
- Today's attendance (who_clocked_in)
- Active travelers with bottleneck flags
- Quality alerts (open NCRs, FAI due)
- Dispatch queue summary

### MS30: HR Manager Dashboard (M)
Create `/dashboard/hr`:
- HR summary from `hrDashboard()`
- Pending PTO approvals
- Training compliance % by department
- OSHA incident trends (monthly)
- Upcoming reviews
- Headcount by department chart

### MS31: Accounting Dashboard (M)
Create `/dashboard/accounting`:
- Trial balance snapshot
- AR/AP aging summary bars
- Revenue trend chart
- Margin alerts from `actualCostMarginAlerts()`
- Daily flash integration
- Cash flow projection

### MS32: Executive Dashboard Enhancement (M)
ExecutiveDashboardPage exists. Enhance:
- OEE across all machines
- Revenue + profitability trend
- Capacity utilization summary
- Quality KPIs (first-pass yield, scrap rate)
- Savings/ROI summary
- Pipeline forecast value
- Daily flash email trigger

---

## Phase 8: Integration & Polish
**Goal:** Cross-cutting features, notifications, search, mobile

### MS33: Notification Wiring (M)
NotificationCenter.tsx exists. Wire to backend:
- `notifySend`, `notifyPreferencesGet`, `notifyPreferencesSet`
- WebSocket push for real-time alerts
- Categories: quality, maintenance, approvals, milestones, PM overdue
- Preference page for channel/category control
- Unread count badge on notification bell

### MS34: Workflow Integration Across Pages (M)
Add approval triggers to existing pages:
- PO: require approval above configurable threshold
- PTO: route through workflow on request
- Invoice: payment approval for large amounts
- Show pending count badges in sidebar nav

### MS35: Operating System Integration (S)
Wire remaining OS features:
- Saved views (view_create/update/delete/list) per page
- Pinned entities (pin_entity/unpin_entity) on any record card
- Recent tracking (recent_record/recent_list) auto-track
- Global search enhancement via search_global

### MS36: Daily Flash Deep Wire (S)
DailyFlashReportPage exists. Wire:
- `dailyFlashGenerate` — auto-generate daily summary
- `dailyFlashEmail` — distribution list management
- Schedule configuration (auto-send time)

### MS37: Mobile Responsiveness Pass (M)
Review all new pages for tablet viewport (768px):
- TravelerPage: large touch targets, barcode scan
- DispatchBoard: touch-friendly drag-and-drop
- WorkflowPage: swipe approve/reject
- Dashboard pages: responsive grid collapse
- Update MOBILE_NAV_ITEMS if needed

### MS38: Integration Exports Enhancement (S)
ExportsPage exists. Wire remaining:
- `integration_export_qb` — QuickBooks sync
- `integration_export_csv` — universal CSV export
- `integration_export_payroll_tax` — payroll tax export
- `integration_reconcile_bank` — bank reconciliation
- `integration_export_ar_aging` — AR aging export

---

## Summary

| Phase | Milestones | New Pages | Actions Wired | Complexity |
|-------|-----------|-----------|--------------|------------|
| 1: Foundation | MS1-4 | 0 | ~50 API wrappers + routes | M |
| 2: Shop Floor | MS5-8 | 2 (Traveler, Dispatch) | ~25 | M |
| 3: HR & People | MS9-13 | 1 (Workflows) | ~30 | M |
| 4: Financial | MS14-18 | 1 (Savings/ROI) | ~25 | L |
| 5: Operations | MS19-23 | 0 (verify existing) | ~30 | M |
| 6: Sales | MS24-28 | 0 (verify existing) | ~15 | S |
| 7: Dashboards | MS29-32 | 3 (Lead/HR/Acct dashboards) | ~30 | M |
| 8: Polish | MS33-38 | 0 | ~25 | M |
| **Total** | **38 MS** | **7 new pages** | **~230 actions** | |

## Verification

After each phase:
1. `npm run build` — zero TypeScript errors
2. `npx vitest run` — all tests pass
3. Dev server (`npm run dev`) — navigate every new/modified page
4. Verify API calls return data (check Network tab)
5. Test role-based access (login as operator vs admin)
6. Mobile viewport check (768px) for touch pages
