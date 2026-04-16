# PRISM Backend ↔ Frontend Convergence Plan
Generated: 2026-03-28T03:00:00Z
Status: ACTIVE — coordinate via /rgs-sync

## Gap Summary

| Gap Type | Count | Impact |
|----------|-------|--------|
| Operating-system provider interfaces with NO backend | 9 interfaces, 18 methods | HIGH — all use fixtures |
| Frontend pages with NO backend wiring | 13 pages | HIGH — no real data |
| Frontend pages using FIXTURE/mock data | 11 pages | MEDIUM — works but fake |
| Backend routes with NO frontend consumer | 15 route modules | LOW — features hidden |

## CLAUDE (Backend) — Build in This Order

### Sprint C1: Operating-System Backend Routes (~1,200 LOC, ~3 sessions)
Create `/api/v1/operating-system/*` route module + aggregator engines.
These replace Codex's fixture providers with real data.

```
NEW FILE: src/routes/operating-system.ts
NEW FILE: src/engines/ShellBootstrapEngine.ts (~200 LOC)
  - getShellBootstrap(): navigation groups, home modules, desk counts
  - getEmployeeShellBootstrap(role): role-filtered bootstrap
  - getEmployeeShellProfiles(): available employee roles

NEW FILE: src/engines/JobDeskAggregatorEngine.ts (~300 LOC)
  - buildJobDeskRecords(jobs): traveler steps + shortages + approvals + timeline
  - buildJobApprovals(job): approval status chain
  - buildJobPacket(job): full tracking packet

NEW FILE: src/engines/ProgramReleaseCatalogEngine.ts (~250 LOC)
  - getCatalog(): machine profiles, tooling, fixtures, stock, CAD sources
  - buildWorkspace(input): quote + DFM + operation plan + checklists

WIRE: src/engines/SchedulingStudyAggregatorEngine.ts (~200 LOC)
  - aggregate job-shop + single-machine + Johnson's + CPM results

WIRE: src/engines/ShopFloorCheckInEngine.ts (~200 LOC)
  - department registration + task assignment + ROI signals

ROUTES (9 endpoints):
  POST /api/v1/operating-system/shell/bootstrap
  POST /api/v1/operating-system/shell/employee-profiles
  POST /api/v1/operating-system/shell/employee/:profileId
  POST /api/v1/operating-system/desk/counts
  POST /api/v1/operating-system/jobs/:jobId/desk
  POST /api/v1/operating-system/program-release/catalog
  POST /api/v1/operating-system/program-release/workspace
  POST /api/v1/operating-system/scheduling/studies
  POST /api/v1/operating-system/shop-floor/check-in
```

### Sprint C2: Wire 13 Unwired Pages (~800 LOC, ~2 sessions)
Add backend endpoints for pages that currently have no API calls.

```
PAGES → BACKEND ENDPOINTS:
  CustomersPage       → GET/POST /api/v1/erp/customers (use ERPIntegrationEngine)
  EmployeeDirectory   → GET /api/v1/erp/employees (use HRComplianceEngine)
  EmployeePortal      → Uses operating-system routes from Sprint C1
  Exports             → GET /api/v1/export/* (routes exist, wire page)
  FinancialAnalysis   → GET /api/v1/erp/financial/* (use FinancialAnalysisEngine)
  GeneralLedger       → GET /api/v1/erp/gl/* (use GeneralLedgerEngine)
  HRCompliance        → GET /api/v1/compliance/* (routes exist, wire page)
  OrderTracking       → GET /api/v1/orchestration/orders (use JobLifecycleEngine)
  Purchasing          → GET /api/v1/erp/purchasing (use PurchaseOrderEngine)
  QualityManagement   → GET /api/v1/quality/* (routes exist, wire page)
  ShellGateway        → Uses operating-system routes from Sprint C1
  ShopFloorClock      → Uses operating-system routes from Sprint C1
  ViewerPage          → GET /api/v1/cad/viewer (use CAD bridge)
```

### Sprint C3: Replace Fixture Data with Real APIs (~600 LOC, ~2 sessions)
Backend endpoints for pages currently using hardcoded/mock data.

```
PAGES → REAL DATA:
  DashboardPage       → GET /api/v1/telemetry/summary (machines, OEE, tools, jobs)
  ToolpathAdvisor     → GET /api/v1/cam/strategy-advisor (strategy ranking)
  SafetyMonitor       → GET /api/v1/safety/monitor (live safety scores)
  CalculatorPage      → GET /api/v1/speed-feed/strategies (strategy options from registry)
  JobPlannerPage      → GET /api/v1/data/materials, /data/machines (dropdown data from registries)
  LearningDashboard   → Already has hooks — verify they hit real endpoints
  WhatIfPage          → POST /api/v1/orchestration/what-if (delta analysis)
  AlarmPage           → POST /api/v1/diagnosis/decode-alarm (ensure endpoint exists)
  PostProcessorGen    → Verify /api/v1/ppg/* endpoints work
  ProgramRelease      → Uses operating-system routes from Sprint C1
  ReportsPage         → GET /api/v1/export/reports (report generation)
```

### Sprint C4: Surface Orphaned Backend Routes (~400 LOC, ~1 session)
These routes exist but have no frontend — Codex creates pages or integrates.

```
BACKEND ROUTES → SUGGESTED FRONTEND:
  /api/v1/validate      → Integrate into DFM/quality pages
  /api/v1/threads       → Integrate into CalculatorPage or new ThreadCalcPage
  /api/v1/machineLive   → Integrate into DashboardPage (real-time panel)
  /api/v1/pipeline      → Integrate into ToolpathAdvisor or new PipelinePage
  /api/v1/gsd           → Integrate into secondary ops or new GrindingPage
  /api/v1/manus         → Integrate into secondary ops
  /api/v1/integrations  → New IntegrationsPage (CAM bridges)
  /api/v1/knowledgeExt  → Integrate into DocumentLearning or new KnowledgePage
```

## CODEX (Frontend) — Build in This Order

### Sprint F1: Swap Operating-System Fixtures for Real API
After Claude lands Sprint C1, swap fixtureProvider.ts:
- Replace fixture implementations with fetch() calls to /api/v1/operating-system/*
- Keep fixture fallback for offline/development mode
- Update tests to use MSW mocks instead of inline fixtures

### Sprint F2: Implement 13 Stubbed Pages
For each page listed in Sprint C2:
- Add API client calls to appropriate endpoints
- Wire state management (useState/useEffect or provider)
- Add loading/error states

### Sprint F3: Replace Hardcoded Data in 11 Pages
For each page listed in Sprint C3:
- Remove MOCK_* constants
- Add API fetch on mount
- Wire WebSocket for real-time where appropriate

### Sprint F4: Create Pages for Orphaned Routes
For routes listed in Sprint C4 that need new pages:
- ThreadCalcPage, IntegrationsPage, PipelinePage
- Or integrate into existing pages where natural

## CONVERGENCE TIMELINE

```
WEEK 1: Claude Sprint C1 (operating-system backend)
         Codex: continue product work, prepare fixture swap
WEEK 2: Claude Sprint C2 + C3 (wire unwired + replace fixtures)
         Codex Sprint F1 (swap fixtures after C1 lands)
WEEK 3: Claude Sprint C4 (orphaned routes)
         Codex Sprint F2 + F3 (implement stubs + replace hardcoded)
WEEK 4: CONVERGENCE AUDIT
         Claude audits frontend, Codex audits backend
         Generate final gap-fill roadmap
```

## ENGINES TO CREATE

| Engine | LOC | Purpose | Depends On |
|--------|-----|---------|-----------|
| ShellBootstrapEngine | ~200 | Shell navigation + role profiles | ERPIntegrationEngine |
| JobDeskAggregatorEngine | ~300 | Job desk records + approvals | JobLifecycleEngine |
| ProgramReleaseCatalogEngine | ~250 | Machine/tool/fixture catalog | ToolRegistry, MachineRegistry |
| SchedulingStudyAggregatorEngine | ~200 | Multi-algorithm study runner | SchedulingEngine |
| ShopFloorCheckInEngine | ~200 | Department check-in + tasks | TimeclockEngine |
| TelemetrySummaryEngine | ~150 | Dashboard aggregate data | TelemetryEngine, OEEEngine |
| StrategyAdvisorEngine | ~200 | Toolpath strategy ranking | ToolpathStrategyRegistry |

Total: ~1,500 LOC across 7 new engines
