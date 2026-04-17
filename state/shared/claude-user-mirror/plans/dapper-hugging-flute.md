# PRISM Post Processor Maximization Roadmap

## Context
PRISM has a 45-stage, 7-phase post processor pipeline (PostProcessorPipelineEngine), 20 controller dialects, 232+ machine profiles, and a physical library of **180 Fusion 360 .cps post processor files** at `C:\PRISM\BOX\FUSION BASIC POSTS\` covering 40+ machine brands. The PostProcessorGeneratorPage (/ppg) already exists at 2112 lines with generate/validate/compare/library lanes. A new product landing page (/post-processor) was built this session.

**The goal:** Build a user-driven post processor system where a machinist selects their machine make, model, year, and controller, checks off optional features (probing, TSC, DWO, etc.), and PRISM generates a physics-optimized, controller-native post processor customized for that exact machine.

## What Already Exists
- PostProcessorPipelineEngine (45 stages, 7 phases) — H:\prism\mcp-server\src\engines\PostProcessorPipelineEngine.ts
- ControllerDialectEngine (20 dialects) — H:\prism\mcp-server\src\engines\ControllerDialectEngine.ts
- MasterPostProcessorEngine (orchestrator) — H:\prism\mcp-server\src\engines\MasterPostProcessorEngine.ts
- LathePostProcessorEngine, FiveAxisPostProcessorEngine, SwissPostProcessorEngine, MillTurnPostProcessorEngine
- PostProcessorRegistry (4 built-in posts)
- MachineProfileCatalog (232+ machines) — H:\prism\mcp-server\src\data\machine-profiles-catalog.ts
- Controller Knowledge DB (17+ entries) — H:\prism\mcp-server\src\data\controller-knowledge.json
- 180 CPS files — C:\PRISM\BOX\FUSION BASIC POSTS\
- PostProcessorGeneratorPage (/ppg) — H:\prism\mcp-server\web\src\pages\PostProcessorGeneratorPage.tsx
- PostProcessorPage (/post-processor) — H:\prism\mcp-server\web\src\pages\PostProcessorPage.tsx

## Known Gaps
1. PostProcessorPipelineEngine uses inlined DEFAULT_KC1_1 (P=2000) disagreeing with canonical constants.ts (P=1800)
2. No CPS file parser → PRISM dialect conversion
3. No machine-to-post routing table (make/model/year → post + settings)
4. No firmware-version → feature-availability matrix
5. Citizen/Star Swiss dialects not implemented
6. No per-machine coolant control configuration
7. No unified probing dialect across controllers
8. Frontend PPG page not wired to machine-specific customization

---

## Phase 1: Shell & Authentication (2 pages)
**Goal:** Verify the gateway/login flow works and the shell bootstraps properly.

| # | Route | Page | Check |
|---|-------|------|-------|
| 1 | `/` | ShellGatewayPage | Loads, OS bootstrap call fires, redirects to dashboard |
| 2 | `/signin` | ShellGatewayPage | Sign-in form renders, auth API endpoint responds |

**API endpoints to verify:**
- `POST /api/v1/operating-system/shell/bootstrap`
- `POST /api/v1/operating-system/shell/profiles`
- Auth token flow

---

## Phase 2: Core Machining Pages (14 pages)
**Goal:** These are the heart of PRISM — verify physics engines are actually wired.

| # | Route | Page | Key API Wiring |
|---|-------|------|----------------|
| 3 | `/dashboard` | DashboardPage | `/machine-live/list`, `/erp/job-dashboard`, `/erp/tool-usage`, WebSocket |
| 4 | `/calculator` | CalculatorPage | `/speed-feed/orchestrate`, `/speed-feed/quick`, `/speed-feed/stochastic` |
| 5 | `/toolpath` | ToolpathAdvisorPage | CAM toolpath strategy endpoints |
| 6 | `/what-if` | WhatIfPage | Delta analysis / what-if simulation |
| 7 | `/thread-calculator` | ThreadCalcPage | `/threads/*` pipeline |
| 8 | `/ppg` | PostProcessorGeneratorPage | `/ppg/*` post-processor endpoints |
| 9 | `/print-to-cnc` | ProgramReleasePage | `/operating-system/program-release/*` |
| 10 | `/pipeline` | PipelinePage | Pipeline orchestration endpoints |
| 11 | `/job-planner` | JobPlannerPage | `/erp/job-create`, `/job-plan` |
| 12 | `/safety` | SafetyMonitorPage | Computed from dashboard + traveler data |
| 13 | `/alarms` | AlarmPage | `/alarm-decode` |
| 14 | `/viewer` | ViewerPage | `/viewer/scenes`, `/viewer/scene/{id}` (3D viewer) |
| 15 | `/reports` | ReportsPage | `/erp/reporting-*` endpoints (6+) |
| 16 | `/secondary-ops` | SecondaryOpsPage | Secondary operations pricing/specs |

**Per-page verification protocol:**
1. Navigate with Playwright
2. Take screenshot (visual state)
3. Take accessibility snapshot (DOM content)
4. Check: Does it show real data or placeholder/demo text?
5. Check: Do form submissions hit real API endpoints?
6. Check: Are error states handled (not blank white page)?

---

## Phase 3: Quotes & Planning Pages (13 pages)
**Goal:** Verify quoting engines and business logic are wired.

| # | Route | Page | Key API Wiring |
|---|-------|------|----------------|
| 17 | `/quote-builder` | QuoteBuilderPage | `/erp/instant-quote*`, customer search |
| 18 | `/quote-analytics` | QuoteAnalyticsPage | Quote win/loss analytics |
| 19 | `/blueprint-quote` | BlueprintQuotePage | Blueprint → quote pipeline |
| 20 | `/sheet-metal` | SheetMetalQuotePage | Sheet metal quoting |
| 21 | `/additive` | AdditiveQuotePage | Additive/3D printing quotes |
| 22 | `/injection-mold` | InjectionMoldPage | Injection mold cost estimation |
| 23 | `/batch-planning` | BatchPlanningPage | `/erp/batch-*` endpoints |
| 24 | `/stock-optimizer` | StockOptimizerPage | Stock/material optimization |
| 25 | `/material-pricing` | MaterialPricingPage | Material cost lookups |
| 26 | `/machine-rates` | MachineRatesPage | `/erp/machine-rate-*` endpoints |
| 27 | `/capacity` | CapacityPlanningPage | `/erp/capacity-*` endpoints |
| 28 | `/integrations` | IntegrationsPage | External system connections |
| 29 | `/scheduling` | SchedulingPage | `/erp/scheduling-*` endpoints |

---

## Phase 4: Shop & ERP Pages (22 pages)
**Goal:** Verify the full ERP suite — jobs, orders, inventory, payroll, HR, finance.

| # | Route | Page | Key API Wiring |
|---|-------|------|----------------|
| 30 | `/jobs` | JobsPage | `/erp/job-dashboard`, `/dispatch/board`, traveler |
| 31 | `/parts-library` | PartsLibraryPage | `/parts`, `/parts/{id}`, file upload |
| 32 | `/messages` | MessagesPage | Messages/email integration |
| 33 | `/customer-portal` | CustomerPortalPage | Portal tokens, shared quotes/orders |
| 34 | `/capture` | CaptureOpsPage | Knowledge capture operations |
| 35 | `/orders` | OrderTrackingPage | `/erp/order-*` endpoints |
| 36 | `/inventory` | InventoryPage | `/erp/inventory-*`, `/erp/tool-reorder-alerts` |
| 37 | `/exports` | ExportsPage | `/export/*` PDF/CSV/Excel/DXF generation |
| 38 | `/purchasing` | PurchasingPage | `/erp/purchasing-*` vendor search/recommend |
| 39 | `/purchase-orders` | PurchaseOrdersPage | `/erp/po-*` full PO lifecycle |
| 40 | `/invoices` | InvoicesPage | `/erp/invoice-*` endpoints |
| 41 | `/profitability` | JobProfitabilityPage | `/erp/job-profitability`, actual cost |
| 42 | `/tooling-cost` | ToolingCostPage | Tool cost tracking |
| 43 | `/general-ledger` | GeneralLedgerPage | `/erp/gl-*` (accounts, journal, trial balance, P&L, balance sheet) |
| 44 | `/quality` | QualityManagementPage | `/erp/quality-*` (SPC, calibration, NCR, KPIs) |
| 45 | `/customers` | CustomersPage | `/erp/customer-*` CRM endpoints |
| 46 | `/employees` | EmployeeDirectoryPage | `/erp/employees`, search |
| 47 | `/shop-clock` | ShopFloorClockPage | `/erp/shift-clock-*`, time tracking |
| 48 | `/timecards` | TimecardPage | `/erp/timecard`, attendance |
| 49 | `/payroll` | PayrollPage | `/erp/payroll-run`, pay stubs |
| 50 | `/hr` | HRCompliancePage | `/erp/hr-*` (benefits, PTO, training, compliance) |
| 51 | `/financial-analysis` | FinancialAnalysisPage | `/erp/financial-*` (NPV, IRR, breakeven, ROI) |

---

## Phase 5: Knowledge & Learning Pages (14 pages)
**Goal:** Verify the learning/academy system is wired to backend.

| # | Route | Page | Key API Wiring |
|---|-------|------|----------------|
| 52 | `/documents` | DocumentLearningPage | Document management |
| 53 | `/learning` | LearningDashboard | `/learning/courses`, WebSocket progress |
| 54 | `/learning/assessment` | Assessment | `/learning/assess` |
| 55 | `/learning/path` | LearningPath | `/learning/plan` |
| 56 | `/learning/progress` | ProgressTracker | `/learning/progress` |
| 57 | `/learning/knowledge` | KnowledgeSearch | `/learning/knowledge/search` |
| 58 | `/learning/material-wizard` | MaterialWizard | `/learning/select/material` |
| 59 | `/learning/tool-wizard` | ToolWizard | `/learning/select/tool` |
| 60 | `/learning/machine-wizard` | MachineWizard | `/learning/select/machine` |
| 61 | `/learning/twin` | DigitalTwin | `/learning/twin` |
| 62 | `/learning/academy` | CourseCatalog | `/learning/courses` |
| 63 | `/learning/academy/:id` | CourseDetail | `/learning/courses/{id}` |
| 64 | `/learning/academy/:id/:lesson` | LessonView | Lesson content + media |

---

## Phase 6: Employee Portal Pages (8 pages)
**Goal:** Verify the employee-facing portal works independently.

| # | Route | Page | Notes |
|---|-------|------|-------|
| 65 | `/employee` | EmployeePortalPage | Portal home |
| 66 | `/employee/jobs` | JobsPage (employee) | Scoped job view |
| 67 | `/employee/messages` | MessagesPage (employee) | Employee messages |
| 68 | `/employee/capture` | CaptureOpsPage (employee) | Knowledge capture |
| 69 | `/employee/quality` | QualityManagementPage (employee) | Quality from employee view |
| 70 | `/employee/scheduling` | SchedulingPage (employee) | Employee schedule |
| 71 | `/employee/orders` | OrderTrackingPage (employee) | Order tracking |
| 72 | `/employee/learning/*` | Learning (employee) | Same 12 learning routes |

---

## Phase 7: Cross-Cutting Verification

### 7A: WebSocket Real-Time
- Connect to `ws://localhost:3000/ws`
- Verify events fire: `machine:status`, `job:progress`, `tool:wear`
- Check dashboard updates in real-time

### 7B: Navigation & Search
- Test global search (command palette) from `shellCatalog.ts`
- Verify all 51 nav items are clickable and route correctly
- Test mobile navigation (7 featured items)

### 7C: Error Handling
- Test with backend stopped (graceful degradation)
- Verify fixture fallback mode works for dashboard, viewer, learning
- Check 404 behavior for invalid routes

### 7D: File Operations
- Test file upload in parts library
- Test PDF/CSV export functionality
- Test blueprint upload in quote flow

---

## Execution Strategy

### Per-Page Protocol (for each of the 72 routes):
```
1. Playwright: navigate to route
2. Playwright: take screenshot → save to H:/prism/audits/screenshots/{route-name}.png
3. Playwright: take accessibility snapshot → check for error states
4. Classify wiring status:
   - FULLY WIRED: Page loads, API calls succeed, real data displayed
   - PARTIALLY WIRED: Page loads, some APIs work, some use fixtures
   - FIXTURE ONLY: Page loads but uses only hardcoded demo data
   - BROKEN: Page errors, blank, or fails to load
   - NOT IMPLEMENTED: Route exists but component is a stub
5. Document findings in audit matrix
```

### Batching Strategy (to keep sessions manageable):
- **Batch 1:** Phase 0 + Phase 1 + Phase 2 (Shell + Machining) — 16 pages
- **Batch 2:** Phase 3 + Phase 4a (Quotes + Shop pages 30-40) — 24 pages
- **Batch 3:** Phase 4b + Phase 5 (Remaining Shop + Learning) — 25 pages
- **Batch 4:** Phase 6 + Phase 7 (Employee Portal + Cross-cutting) — 15 pages + integration tests

### Output Artifacts:
1. **`H:/prism/audits/web-wiring-matrix.md`** — Master status table (all 72 routes)
2. **`H:/prism/audits/screenshots/`** — Visual evidence for each page
3. **`H:/prism/audits/web-wiring-roadmap.md`** — Prioritized fix list
4. **`H:/prism/audits/api-endpoint-coverage.md`** — Which of the 280+ endpoints are actually called

### Wiring Fix Priority Order:
1. **BROKEN** pages (can't load at all) — fix first
2. **Core Machining** pages using fixtures instead of live APIs — highest business value
3. **ERP/Shop** pages with incomplete wiring — operational features
4. **Quotes/Planning** pages — revenue-generating features
5. **Learning/Knowledge** pages — nice-to-have
6. **Employee Portal** duplicates — lowest priority (shares components with main)

---

## Verification
- Every page gets a Playwright screenshot as proof
- API calls verified by checking network responses (not just "page loads")
- Final matrix reviewed against the 40 route modules in `routes/index.ts`
- Cross-reference with `shellCatalog.ts` to ensure nav menu matches actual routes
- Build the audit directory: `H:/prism/audits/` with all artifacts

---

## Critical Files
- `H:/prism/mcp-server/web/src/App.tsx` — All route definitions
- `H:/prism/mcp-server/web/src/components/shell/shellCatalog.ts` — Navigation menu
- `H:/prism/mcp-server/web/src/api/client.ts` — API client (280+ endpoints)
- `H:/prism/mcp-server/web/src/api/*.ts` — Domain-specific API modules
- `H:/prism/mcp-server/web/src/features/operating-system/` — Fixture providers
- `H:/prism/mcp-server/src/routes/index.ts` — Backend route registration
- `H:/prism/mcp-server/src/index.ts` — Server entry point + callTool bridge
- `H:/prism/mcp-server/web/vite.config.ts` — Proxy config (3100 → 3000)
