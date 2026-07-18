# Shop+HR+Payroll Audit — Agent 5: Frontend

## Pages by Domain (shop / hr / payroll)

### SHOP FLOOR PAGES
- **ShopFloorLivePage** (1,128 LOC) - Mounted APPW operator surface. Displays live floor snapshot + active jobs queue. WebSocket-ready architecture for real-time data.
- **ShopDashboardPage** (335 LOC) - Manufacturing dashboard with KPI cards (machines running, active alarms, jobs, safety score, OEE). Machine status grid, job progress tracking, tool life monitor. Live WebSocket subscription for machine/job/tool/safety events.
- **CncOpsPage** (250 LOC) - CNC operations hub: program assembly, motion profiling, tool magazine layout, setup sheet generation via tab-based interface.
- **MachineLivePage** - Machine monitoring and live telemetry.
- **OEEDashboardPage** - Overall Equipment Effectiveness tracking.

### HR PAGES
- **EmployeeDirectoryPage** (760 LOC) - Full workforce desk. Roster search, department posture, onboarding (create employee, assign skills), utilization tracking. Four-tab layout (directory, departments, onboard, utilization). Workforce context preservation for handoff to timecards/payroll/shop-floor.
- **EmployeeProfilePage** - Individual employee detail, certifications, skills, history.
- **EmployeePortalPage** - Self-service employee interface for personal data, benefits, PTO.
- **HRCompliancePage** (27.7 KB, 8+ tabs) - Enterprise HR hub: dashboard, benefits, training (expiring alerts), compliance alerts, performance reviews, PTO requests, enrollment, employee history. Full HRIS integration.

### PAYROLL PAGES
- **PayrollPage** (497 LOC) - Pay period execution. Payroll register with stub detail (gross, deductions, net, YTD). Deduction mix breakdown. Period lifecycle stepper (open→processing→finalized). Handoff to GL/exports/timecards/directory.
- **TimecardPage** (739 LOC) - Weekly labor allocation. Job-by-job hour splits, operation breakdowns with machine/process type, status workflow (draft→submitted→approved→locked). CSV export. Audit trail with immutable edit log (actor, timestamp, reason).

## Kiosk Mode vs Desktop

**Kiosk Mode Assessment: MINIMAL/MISSING**
- No badge-scan login UI found in codebase
- No kiosk-optimized pages (large buttons, minimal keyboard use)
- No full-screen shop station layouts
- CncOpsPage and ShopFloorLivePage are desktop-first, multi-tab complexity
- Badge references exist only in calculator data (not shop floor entry)

**Desktop Features: COMPREHENSIVE**
- Workflow context preservation across page handoffs (source, origin, focus)
- Deep linking with URL state (employeeId, periodStart, etc.)
- Multi-tab layouts with state isolation
- Right-side brief panels for decision support
- Audit trails (timecards, payroll)

## Strengths

1. **Unified Workforce Context** - Pages pass origin/focus through URL to maintain employee selection across shop→timecards→payroll→directory flows.
2. **Real-time Architecture** - ShopDashboard and ShopFloorLive ready for WebSocket machine/job/tool events.
3. **HR Completeness** - HRCompliancePage covers 8+ domains (benefits, training, alerts, reviews, PTO, enrollment).
4. **Labor Audit Trail** - Timecards include immutable edit log (actor, timestamp, change reason, old/new values).
5. **Deduction Transparency** - Payroll register shows per-employee deduction breakdown by type.

## Gaps

1. **No Kiosk/Mobile Shop Stations** - 0 pages optimized for badge-scan login, limited keyboard, full-screen job display.
2. **Missing Pages from Spec**: OperatorDashboardPage, WorkOrderQueuePage, MachineUtilizationPage (not focused), AndonBoardPage, SchedulePage, CertificationManagerPage, TrainingPage, PerformanceReviewPage, OnboardingWizardPage, HiringPipelinePage, PaystubViewer, TaxFormsPage, BenefitsEnrollmentPage, DirectDepositSetupPage.
3. **No Mobile Responsiveness** - All pages assume desktop viewport (1400px+ layouts).
4. **Limited Integration Documentation** - No visible API error handling for payroll/HR sync failures.
5. **Kiosk Architecture Not Designed** - No badge-reader integration, session timeout, quick-clock patterns.

## Score

**72/100**

Breakdown: Shop pages (18/30) - present but lacking operator kiosk stations. HR pages (28/35) - comprehensive but missing isolation. Payroll pages (23/25) - register with audit strong. Kiosk/Mobile (1/10) - minimal support.

Recommendation: Build dedicated OperatorKioskPage with badge login, mobile-responsive wrapper, dedicated CertificationManager and TaxForms pages, and direct-deposit setup flow.
