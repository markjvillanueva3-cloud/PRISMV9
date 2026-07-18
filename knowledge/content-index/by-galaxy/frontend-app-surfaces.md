---
name: frontend-app-surfaces
description: Strategic surfaces digest for the frontend-app galaxy -- the live PRISM web/desktop/mobile SPA. Routes, key pages, api-bridge wrappers, and the F7/3100 HTTP seam. This galaxy is a pure CONSUMER of prism_* dispatchers, not an engine galaxy.
type: reference
galaxy: frontend-app
node_type: memory
---

# frontend-app galaxy -- surfaces digest

## Overview

The frontend-app galaxy is the single user-facing surface layer for PRISM: one
**Vite + React 18 SPA** (React Router v6, lazy-loaded routes, code-split per page)
that ships to THREE form factors from ONE build -- browser (web), Electron (desktop),
and Capacitor 6 (iOS/Android phone). There is NO second mobile codebase; every page
is already a mobile page.

- **Location (ground truth):** `mcp-server/web/src/` -- NOT `mcp-server/web/app/`
  (that path does not exist). `mcp-server/src/engines/frontend-app/` is doctrine-only
  (0 local `.ts` engines; this is a pure HTTP consumer per its CLAUDE.md).
- **STALE-FRAMING CORRECTION (R12):** prior doctrine described this galaxy as
  "Next.js 15 App Router / React 19 / TanStack Query / Zustand / Recharts / Tailwind,
  ~18 routes." Verified against the live tree that framing is WRONG on stack + count:
  the running app is **Vite+React (react-router-dom), NOT Next.js App Router**; state is
  **Zustand** (`src/stores/`) with per-store slices, NOT TanStack Query; charts ARE
  **Recharts** (verified in `DashboardPage.tsx`); styling IS **Tailwind** (`tailwind.config.js`)
  under an **iOS design language** (`web/CLAUDE.md` FLEET DESIGN LANGUAGE = iOS, 2026-06-09).
  Route count is **~190 `<Route>` registrations over 167 page files**, NOT ~18.
  The `web/CLAUDE.md` "Existing Pages (102 total)" line is itself stale-low vs the
  current 167 page files on disk.
- **Backend seam:** the SPA never imports engines. It calls REST endpoints under
  `/api/v1/<domain>` (e.g. `/api/v1/erp`, `/api/v1/cam`, `/api/v1/sfc`, `/api/v1/realtime`,
  `/api/v1/portal`) which the **F7 / 127.0.0.1:3100 HTTP bridge** routes to the
  `prism_*` dispatchers. Per-shell base is resolved by `src/lib/apiBase.ts`
  (`WEB_API_BASE = '/api/v1'`; desktop -> `http://127.0.0.1:3100`; mobile requires a
  build-time `VITE_API_BASE_URL`). Standard response envelope is
  `{ result, safety: { score, warnings }, meta: { formula_used, uncertainty } }`
  (`src/api/client.ts` header).
- **Resilience layer:** `src/lib/resilientFetch.ts` (retry + exponential backoff +
  timeout + offline detection), `OfflineQueueManager.ts` + `OptimisticSyncManager.ts`
  (idempotency-keyed offline writes), `sw.ts` (service worker cache).
- **Localization:** Polish + Spanish operator strings are P0 (JM Die shop floor is
  majority Polish/Spanish-primary). Safety strings (alarm decode, e-stop, fault) translate first.

## Strategic categories

Grouping the 167 pages / ~190 routes by function:

1. **Dashboards / executive / analytics** -- Dashboard, Executive, Department, OEE,
   ShopFloorTV, DailyFlashReport, FinancialAnalysis, QuoteAnalytics, ValueStream,
   AILearning/FleetLearning dashboards.
2. **Quoting + estimating UI** -- QuoteBuilder, BlueprintQuote, SheetMetalQuote,
   AdditiveQuote, InjectionMold, MobileCameraQuote, CostEstimator, QuotingWorkbench,
   QuoteFollowUp, QuotingCalibrationHealth, MaterialPricing, MarketPricingIntelligence.
3. **CAM / CAD / print-to-program studios** -- MillStudio, LatheStudio, WireEdmStudio,
   MillingWizard/LatheWizard/WireEdmWizard, CamStrategy, ToolpathAdvisor, cam-ai-dashboard,
   CADAIState, CADRegeneration/CADRegression dashboards, MechanicalDesign, Viewer, Swiss, MillTurn.
4. **Speed/feed + physics calculators** -- Calculator (the 12.9K-LOC monolith),
   SfcCalculator, SpeedFeed, ThreadCalc, CycleTime, Thermal, Vibration, ToolOptimization,
   ToolingCost, WhatIf, StockOptimizer.
5. **Post-processor + program release** -- PostProcessor, PostProcessorGenerator,
   PostProcessorStore, ProgramRelease, ProveOutWorkflow, SetupSheet, Ppg.
6. **Shop-floor / real-time ops** -- ShopFloorLive, ShopFloorClock, ShopFloorTV,
   MachineLive, CncOps, Telemetry, SafetyMonitor, SafetyDashboard, Alarm, Diagnosis,
   Maintenance/PreventiveMaintenance, EquipmentAsset.
7. **Business / ERP / accounting** -- BusinessSuite, ErpDashboard, LatheERPDashboard,
   GeneralLedger, Invoices, Payroll, PurchaseOrders, Purchasing, JobProfitability,
   CommissionTracker, CreditManagement, MachineRates.
8. **HR / employee / kiosk / mobile portals** -- EmployeePortal, EmployeePhonePortal,
   HotelEmployeeHub, HotelPortal, EmployeeDirectory, EmployeeProfile, Timecard,
   HRCompliance, OSHACompliance.
9. **Customer portal + sales** -- CustomerPortal, Customers, SalesPipeline, OrderTracking,
   RFQInbox, ShippingPacking, Subscription, Pricing, Billing.
10. **Quality / compliance** -- QualityManagement, Quality, SPCDashboard, Compliance,
    ReceivingInspection, A3Report, RootCause, KaizenBoard, AuditManager.
11. **Knowledge / learning / academy** -- KnowledgeBrowser, KnowledgeExt, KnowledgeIngestion,
    DocumentInbox, DocumentLearning, CourseViewer, LearningDashboard.
12. **Admin / settings / data / integrations** -- Admin, Settings, DataManagement,
    FeatureToggle, Integrations, Exports, VendorCatalog/Compare/Scorecard, ToolCrib,
    PartsLibrary, MachineDataAudit, Calibration, ShopProfile.
13. **Gateways / auth / shell** -- Landing, Login, Signin, Signup, IndexGateway,
    ShellGateway, ShopDashboard, Messages (the shell + entry surfaces).

## Key surfaces (detailed)

### App.tsx (route registry)
`src/App.tsx` -- the single route table (react-router-dom `<Routes>`), ~190 `<Route>`
entries wrapping lazy-loaded pages in `<Suspense>` + `WorkspaceErrorBoundary`. Uses
`ProtectedRoute` (clearance-gated: shop_floor / lead / hr_manager / admin) and
`FeatureGate` (entitlement). Providers: `AuthProvider`, `LearningProvider`,
`OperatingSystemProvider`. Every page is `lazyNamed(() => import(...))` code-split.

### src/lib/apiBase.ts + resilientFetch.ts (the bridge seam)
`apiBase.ts` is the single per-shell backend-base resolver (web `/api/v1` same-origin;
Electron -> `127.0.0.1:3100`; Capacitor requires `VITE_API_BASE_URL`, fails loud otherwise).
`resilientFetch.ts` wraps every call with retry/backoff/timeout/offline-normalization
(`FetchError` with `isOffline`/`isTimeout` flags). This is the mandated call path --
raw `fetch()` to the bridge is the #1 silent-zero regression class.

### src/api/*.ts (~98 dispatcher wrappers)
Per-domain REST wrappers, each POSTing to `/api/v1/<domain>` with an AbortController +
per-domain timeout. Verified: `business.ts` -> `/api/v1/erp` (15s), `cam.ts` -> `/api/v1/cam`
(30s), `calc.ts` -> `/api/v1/sfc` (10s), `realtime.ts` -> `/api/v1/realtime`, `portal.ts`
-> `/api/v1/portal`, `client.ts` = the shared F7-bridge client (blueprint, instant-quote,
shop-floor, dashboard). These wrappers ARE the prism_* consumption layer.

### BusinessSuitePage.tsx
Consolidated business/quoting/orders/accounting/customer-portal surface (5 tabs:
Quotes / Orders / Customer Portal / Accounting / Reports). Consumes `prism_business`
(50+ actions across quoting, costing, orders, financial, portal_*, job_*, employee_*)
via `src/api/business.ts` -> `/api/v1/erp` -> `prism_business` dispatcher.
File: `mcp-server/web/src/pages/BusinessSuitePage.tsx`.

### QuoteBuilderPage.tsx
Instant-quote + DFM workbench. Renders quote estimates, qty breaks, lead time,
material comparison, 3-view, location/vendor pricing, DFM analysis + tolerance checks.
Consumes the quoting/DFM actions via `src/api/client.ts` (F7 bridge) and `useWebSocket`
for live updates. File: `mcp-server/web/src/pages/QuoteBuilderPage.tsx`.

### ShopFloorLivePage.tsx
Live job + labor tracking board (default export). Renders shop-floor jobs + snapshot
via `getShopFloorJobs` / `getShopFloorSnapshot` (`src/api/client.ts`), with a workspace
recovery scaffold for degraded/offline states. File: `mcp-server/web/src/pages/ShopFloorLivePage.tsx`.

### CalculatorPage.tsx
The 12.9K-LOC speed/feed "Calculator Studio" monolith (canonical dark-HUD aesthetic
reference + the flagged fixed-width refactor target). Lazy-loads sub-calculators
(WireEdmPassChart, WireEdmContourPicker, AppwCalculatorCopilot). Consumes `prism_calc`/
`prism_cam` feed-speed data via `src/api/calc.ts` -> `/api/v1/sfc`.
File: `mcp-server/web/src/pages/CalculatorPage.tsx`.

### MillStudioPage.tsx (+ LatheStudio / WireEdmStudio)
6-step print-to-program wizard (Import -> Material -> Strategy -> Tooling -> Parameters ->
Program) at route `/mill-studio`, backed by `MillStudioContext` (React context state).
Parity siblings LatheStudioPage / WireEdmStudioPage. Consumes cam/cad/calc/post-processor
dispatchers. File: `mcp-server/web/src/pages/MillStudioPage.tsx`.

### CustomerPortalPage.tsx
Token-gated customer portal: quote view/respond, order status, milestone timeline,
quality docs, service cases, order messages. Consumes `prism_business` `portal_*` actions
via `src/api/portal.ts` -> `/api/v1/portal` (create/revoke/validate token, quote view,
order status, quality-doc + message flows). File: `mcp-server/web/src/pages/CustomerPortalPage.tsx`.

### DashboardPage.tsx
Home operational dashboard: OEE, machine status, job progress, tool life, hot jobs.
Uses **Recharts** (BarChart) + `useWebSocket` live feeds + `loadDashboardSnapshotWithFallback`
(`src/api/dashboard.ts`) with offline fallback, plus the OperatingSystem surface-status
notice. File: `mcp-server/web/src/pages/DashboardPage.tsx`.

## Full route/component index

| Surface | Type (route/lib/component) | Consumes | One-line |
|---------|----------------------------|----------|----------|
| App.tsx | route registry | react-router-dom | ~190 `<Route>` entries, lazy + clearance/entitlement gated (READ) |
| main.tsx | app entry | React root mount | Vite SPA bootstrap (name-derived) |
| lib/apiBase.ts | lib | -- | per-shell backend base resolver: web `/api/v1`, desktop 3100, mobile env (READ) |
| lib/resilientFetch.ts | lib | F7/3100 bridge | mandated fetch path: retry/backoff/timeout/offline (READ) |
| lib/OfflineQueueManager.ts | lib | -- | offline write queue, replay on reconnect (name-derived) |
| lib/OptimisticSyncManager.ts | lib | -- | idempotency-keyed optimistic offline writes (name-derived) |
| sw.ts | service worker | -- | offline cache backing (name-derived) |
| api/client.ts | lib | F7 bridge (blueprint/quote/shop) | shared client; envelope `{result,safety,meta}` (READ) |
| api/business.ts | lib | prism_business | `/api/v1/erp`, 15s timeout (READ) |
| api/cam.ts | lib | prism_cam | `/api/v1/cam`, 30s timeout (READ) |
| api/calc.ts | lib | prism_calc/sfc | `/api/v1/sfc`, 10s timeout (READ) |
| api/realtime.ts | lib | prism_realtime | `/api/v1/realtime` WebSocket/push (READ) |
| api/portal.ts | lib | prism_business portal_* | `/api/v1/portal` token + quote/order/quality flows (READ) |
| api/*.ts (~98 total) | lib | prism_* per domain | one wrapper per dispatcher domain (edm/thread/quality/sfc/...) (name-derived) |
| BusinessSuitePage | route | prism_business (50+ actions) | consolidated quoting/orders/accounting/portal (READ) |
| ErpDashboard / LatheERPDashboard | route | prism_business | ERP operational dashboards (name-derived) |
| QuoteBuilderPage | route | quoting + DFM actions | instant-quote + DFM workbench (READ) |
| BlueprintQuotePage | route | blueprintToQuote (client.ts) | blueprint-image -> quote + redaction (READ) |
| SheetMetalQuote/AdditiveQuote/InjectionMold | route | quoting actions | process-specific quote UIs (name-derived) |
| MobileCameraQuotePage | route | quoting actions | phone-camera print capture -> quote (name-derived) |
| CostEstimator/QuotingWorkbench/QuoteAnalytics | route | quoting/cost actions | cost + analytics surfaces (name-derived) |
| MillStudioPage | route | cam/cad/calc/post | 6-step mill print-to-program wizard (READ) |
| LatheStudioPage / WireEdmStudioPage | route | cam/cad/post | parity studio wizards (name-derived) |
| CalculatorPage | route | prism_calc/sfc | 12.9K-LOC speed/feed studio monolith (READ) |
| SfcCalculator/SpeedFeed/ThreadCalc/CycleTime | route | prism_calc | physics calculators (name-derived) |
| PostProcessorPage/Generator/Store | route | prism post-processor | G-code emission + .cps store (name-derived) |
| ProgramReleasePage/ProveOutWorkflow/SetupSheet | route | cam/post actions | release + prove-out + setup docs (name-derived) |
| ToolpathAdvisorPage/CamStrategyPage | route | prism_cam | toolpath strategy advisor (name-derived) |
| CADAIStatePage/CADRegeneration/CADRegression | route | prism_cad | CAD AI-state + regression dashboards (name-derived) |
| ViewerPage/MechanicalDesignPage/SwissPage/MillTurnPage | route | cad/cam | 3D viewer + design + multi-process (name-derived) |
| ShopFloorLivePage | route | client.ts shop-floor | live job/labor board (READ) |
| ShopFloorClock/ShopFloorTV/ShopDashboard | route | client.ts/realtime | clock + TV wallboard + shop dash (name-derived) |
| MachineLivePage/CncOpsPage/TelemetryPage | route | prism_realtime | live machine + CNC ops + telemetry (name-derived) |
| SafetyMonitor/SafetyDashboard/AlarmPage | route | prism_safety/realtime | S(x) monitor + alarm decode (name-derived) |
| DiagnosisPage/RootCausePage/A3ReportPage | route | quality/diagnosis | diagnosis + RCA + A3 (name-derived) |
| Maintenance/PreventiveMaintenance/EquipmentAsset | route | business/erp | maintenance work orders + assets (name-derived) |
| DashboardPage | route | dashboard.ts + WS | OEE/machine/job/tool-life home (Recharts) (READ) |
| ExecutiveDashboard/DepartmentDashboard/OEEDashboard | route | business/erp | executive + dept + OEE dashboards (name-derived) |
| DailyFlashReport/FinancialAnalysis/ValueStream | route | business/erp | financial + value-stream reports (name-derived) |
| GeneralLedger/Invoices/Payroll/PurchaseOrders | route | prism_business | accounting surfaces (name-derived) |
| JobProfitability/CommissionTracker/CreditManagement | route | prism_business | profitability + sales-finance (name-derived) |
| CustomerPortalPage | route | prism_business portal_* | token-gated customer portal (READ) |
| CustomersPage/SalesPipeline/OrderTracking/RFQInbox | route | prism_business | CRM + sales + order tracking (name-derived) |
| Subscription/Pricing/Billing pages | route | billing.ts | subscription + billing flows (name-derived) |
| EmployeePortal/EmployeePhonePortal/HotelEmployeeHub | route | employeePortal.ts | employee mobile-first portals (name-derived) |
| EmployeeDirectory/EmployeeProfile/Timecard/Payroll | route | prism_business HR | HR + time-clock surfaces (name-derived) |
| HRCompliance/OSHACompliance | route | compliance actions | HR + OSHA compliance (name-derived) |
| QualityManagement/SPCDashboard/ReceivingInspection | route | prism quality | SPC + inspection surfaces (name-derived) |
| KaizenBoard/AuditManager/KanbanBoard | route | quality/business | kaizen + audit + kanban boards (name-derived) |
| KnowledgeBrowser/KnowledgeExt/KnowledgeIngestion | route | knowledge actions | knowledge browse + ingest (name-derived) |
| DocumentInbox/DocumentLearning/CourseViewer | route | docLearn/learning | doc inbox + academy learning (name-derived) |
| Admin/Settings/DataManagement/FeatureToggle | route | admin/settings | admin + config surfaces (name-derived) |
| Integrations/Exports/VendorCatalog/VendorCompare | route | integrations/vendor | integrations + vendor network (name-derived) |
| ToolCrib/PartsLibrary/MachineDataAudit/Calibration | route | toolCrib/parts | tooling + parts + calibration (name-derived) |
| Landing/Login/Signup/IndexGateway/ShellGateway | route | auth.ts/session | auth + shell entry gateways (name-derived) |
| contexts/*.tsx | component | -- | Auth/Erp/Learning + Mill/Lathe/Wedm/Ppg studio state (name-derived) |
| stores/*.ts | lib (Zustand) | -- | calculator store + feature flags + rollout metrics (name-derived) |
| features/machine-workspace, features/operating-system | component | prism_operating_system | OS shell + machine workspace surfaces (name-derived) |

## Notable / uncertain

- **"~18 routes" and "Next.js 15 App Router" are FALSE** on the live tree -- the running
  app is Vite+React (react-router-dom) with 167 page files / ~190 route registrations.
  Digested here against ground truth, not the stale doctrine string.
- **`cqask/ui` (Next.js + Ant Design) and `mcp-cadquery/frontend` (Three.js)** are cited
  as "pending merge since 2026-05-28" in CLAUDE.md -- NOT part of the live shipping SPA;
  status unverified, excluded from this digest as active surfaces.
- **api/*.ts wrappers use raw `fetch()` with AbortController**, not `resilientFetch.ts`,
  in the domain files I read (business/cam/calc/realtime). `resilientFetch.ts` + `client.ts`
  are the resilient path; the per-domain wrappers are lighter. This is a real split worth
  flagging to the owning slot (quebec) -- CLAUDE.md mandates resilientFetch as THE path.
- **Pages marked "(name-derived)"** were enumerated from `ls src/pages/` but not read
  end-to-end; their dispatcher mapping is inferred from name + the api-wrapper naming
  convention, not verified line-by-line (R12).
- **`src/pages/` also contains non-page helpers** (`postExportSafety.ts`, `formulas.ts`,
  `README.md`, and `mcp-server`/`recovery` subdirs) -- the 167 count includes these;
  true renderable pages are slightly fewer.
- **Design language is iOS** (`web/CLAUDE.md`, 2026-06-09) over Tailwind + `src/index.css`
  tokens; the older "Calculator Studio" HUD is now a scoped per-page accent, not the fleet identity.
