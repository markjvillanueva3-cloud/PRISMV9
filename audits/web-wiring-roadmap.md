# PRISM Web App Wiring Fix Roadmap

**Date:** 2026-03-30
**Baseline:** 50 routes audited, 47 load (94%), 0 fully live, 3 broken

---

## TIER 0: CRITICAL FIXES (3 broken pages)
**Effort:** Small — likely data shape mismatches in fixture providers
**Impact:** Unblocks 6% of the app that currently crashes

| # | Page | Error | Likely Fix |
|---|------|-------|------------|
| 1 | `/secondary-ops` | `ops.find is not a function` | SecondaryOpsPage expects array, fixture returns object — fix fixture shape or add array guard |
| 2 | `/quote-analytics` | `Cannot read properties` | QuoteAnalyticsPage reads a nested property that fixtures don't provide — add missing fixture fields |
| 3 | `/parts-library` | `Cannot read properties` | PartsLibraryPage same pattern — check parts API response shape vs fixture |

---

## TIER 1: GLOBAL INFRASTRUCTURE (unblocks all pages)
**Effort:** Medium — auth + WebSocket wiring
**Impact:** Enables live data for every page simultaneously

| # | Task | Details |
|---|------|---------|
| 4 | **Fix billing API 401** | Every page hits `/api/v1/billing/status` and gets 401. Either: (a) make billing route not require auth for status check, (b) configure a default API key, or (c) wire auth token from shell login |
| 5 | **Wire WebSocket server** | Dashboard tries ws://localhost:3000/ws but gets connection refused. `webSocketEngine.attach(httpServer)` needs to run in HTTP mode. Check if `runHTTP()` actually calls it |
| 6 | **Wire `/api/viewer/scenes` endpoint** | 3D Viewer calls this but gets 404. Route exists in spec but may not be registered in routes/index.ts |
| 7 | **Add CORS for port 3100** | Verify Vite proxy handles all routes including WebSocket upgrade |

---

## TIER 2: CORE MACHINING — LIVE WIRING (14 pages, highest business value)
**Effort:** Large per page — wire each page's API calls to real MCP dispatchers
**Impact:** Core CNC intelligence features working with real data

### Priority Order (by user value):

| # | Page | Backend APIs | MCP Dispatcher | Wiring Task |
|---|------|-------------|----------------|-------------|
| 8 | `/calculator` | `/speed-feed/orchestrate` | `prism_calc.sf_orchestrate` | Wire form submit → API call → display results. Engine already works. |
| 9 | `/dashboard` | `/machine-live/list`, `/erp/job-dashboard`, `/erp/tool-usage` | `prism_machine_live`, `prism_business` | Replace demo machine data with live machine registry. Replace demo jobs with real job records. |
| 10 | `/alarms` | `/alarm-decode` | `prism_data.alarm_decode` | Wire alarm input → API → results. Backend already has 11,288 alarms loaded. |
| 11 | `/toolpath` | CAM strategy endpoints | `prism_cam` | Wire feature/material/machine form → strategy recommendations |
| 12 | `/thread-calculator` | `/threads/*` | `prism_thread`, `prism_threading_pipeline` | Wire thread parameters → calculation results |
| 13 | `/ppg` | `/ppg/*` | `prism_generator` | Wire controller selection → post-processor generation |
| 14 | `/what-if` | Delta analysis endpoints | `prism_calc` | Wire sliders → what-if computation → results |
| 15 | `/job-planner` | `/erp/job-create`, `/job-plan` | `prism_intelligence.job_plan` | Wire job form → plan generation |
| 16 | `/print-to-cnc` | `/operating-system/program-release/*` | `prism_operating_system` | Wire program catalog → release workspace |
| 17 | `/pipeline` | Pipeline orchestration | `prism_orchestrate` | Wire pipeline config → execution |
| 18 | `/safety` | Dashboard + Traveler (computed) | Derived from prism_machine_live | Wire safety score computation from live machine data |
| 19 | `/viewer` | `/viewer/scenes`, `/viewer/scene/{id}` | New route needed | Wire 3D scene loading from job/toolpath data |
| 20 | `/reports` | `/erp/reporting-*` | `prism_business` | Wire report templates → generation → display |
| 21 | `/secondary-ops` | Secondary ops endpoints | `prism_secondary_ops` | Fix broken page first, then wire pricing/specs |

---

## TIER 3: QUOTES & PLANNING — LIVE WIRING (13 pages)
**Effort:** Large — requires business engine integration
**Impact:** Revenue-generating quoting features

| # | Page | Key Task |
|---|------|----------|
| 22 | `/quote-builder` | Wire instant-quote form → prism_business quote estimator |
| 23 | `/quote-analytics` | Fix crash first, then wire analytics data |
| 24 | `/blueprint-quote` | Wire file upload → blueprint analysis → quote pipeline |
| 25 | `/sheet-metal` | Wire sheet metal quoting engine |
| 26 | `/additive` | Wire additive manufacturing costing |
| 27 | `/injection-mold` | Wire injection mold quoting engine |
| 28 | `/batch-planning` | Wire batch grouping/sequencing APIs |
| 29 | `/stock-optimizer` | Wire stock selection optimization |
| 30 | `/material-pricing` | Wire material registry pricing data (2,957 materials available) |
| 31 | `/machine-rates` | Wire machine rate lookup (910 machines available) |
| 32 | `/capacity` | Wire capacity planning APIs |
| 33 | `/integrations` | Wire external system connector status |
| 34 | `/scheduling` | Wire scheduling study generation |

---

## TIER 4: SHOP & ERP — LIVE WIRING (22 pages)
**Effort:** Large — full ERP suite needs database layer
**Impact:** Operational management features

| # | Page | Key Task |
|---|------|----------|
| 35 | `/jobs` | Wire job lifecycle APIs (create, update, dispatch) |
| 36 | `/parts-library` | Fix crash first, then wire parts CRUD + file upload |
| 37 | `/messages` | Wire message/email threading system |
| 38 | `/customer-portal` | Wire portal token management + sharing |
| 39 | `/capture` | Wire shop floor capture → knowledge persistence |
| 40 | `/orders` | Wire order lifecycle management |
| 41 | `/inventory` | Wire inventory tracking + EOQ/ABC analysis |
| 42 | `/exports` | Wire PDF/CSV/Excel/DXF export generation |
| 43 | `/purchasing` | Wire vendor search/recommendation |
| 44 | `/purchase-orders` | Wire PO lifecycle (create, approve, receive) |
| 45 | `/invoices` | Wire invoice management |
| 46 | `/profitability` | Wire job profitability analysis |
| 47 | `/tooling-cost` | Wire tool cost tracking from tool registry |
| 48 | `/general-ledger` | Wire GL account/journal management |
| 49 | `/quality` | Wire SPC, calibration, NCR management |
| 50 | `/customers` | Wire CRM (customer CRUD, credit check, pipeline) |
| 51 | `/employees` | Wire employee directory |
| 52 | `/shop-clock` | Wire shift clock-in/out APIs |
| 53 | `/timecards` | Wire timecard retrieval |
| 54 | `/payroll` | Wire payroll processing |
| 55 | `/hr` | Wire HR compliance (benefits, PTO, training) |
| 56 | `/financial-analysis` | Wire financial analysis (NPV, IRR, breakeven) |

---

## TIER 5: KNOWLEDGE & LEARNING (2 pages + 12 sub-routes)
**Effort:** Medium — learning API already exists
**Impact:** Training and knowledge management

| # | Page | Key Task |
|---|------|----------|
| 57 | `/learning` | Wire course catalog from backend learning API (already has routes) |
| 58 | `/documents` | Wire document upload → learning pipeline |
| 59 | `/learning/assessment` | Wire skill assessment API |
| 60 | `/learning/academy` | Wire course enrollment + progression |
| 61 | `/learning/knowledge` | Wire tribal knowledge search (3,700+ tips available) |
| 62 | `/learning/*-wizard` | Wire material/tool/machine selection wizards |

---

## TIER 6: EMPLOYEE PORTAL (8 routes)
**Effort:** Small — shares components with main app
**Impact:** Shop floor employee experience

| # | Page | Key Task |
|---|------|----------|
| 63 | `/employee` | Wire employee shell with role-filtered views |
| 64 | `/employee/jobs` | Same as main /jobs, scoped by role |
| 65 | `/employee/learning/*` | Same as main /learning, employee context |

---

## TIER 7: POLISH & CHARTS
**Effort:** Medium
**Impact:** Visual quality and data presentation

| # | Task | Details |
|---|------|---------|
| 66 | **Add Recharts visualizations** | 0 pages have charts despite Recharts being in package.json. Add: OEE donut, capacity bar, SPC X-bar/R, quote pipeline funnel, profitability waterfall |
| 67 | **Add data tables** | 0 pages use tables despite tabular data (jobs, parts, POs, invoices). Add sortable/filterable tables |
| 68 | **Real-time indicators** | Dashboard should show live updating machine states via WebSocket once wired |

---

## Estimated Execution Order

**Sprint 1 (Quick wins):** Tier 0 (3 broken pages) + Tier 1 (global infra) = 7 tasks
**Sprint 2 (Core value):** Tier 2 items 8-13 (calculator, dashboard, alarms, toolpath, threads, PPG) = 6 tasks
**Sprint 3 (Machining complete):** Tier 2 items 14-21 = 8 tasks
**Sprint 4 (Quoting):** Tier 3 = 13 tasks
**Sprint 5-7 (ERP):** Tier 4 = 22 tasks
**Sprint 8 (Learning):** Tier 5 = 6 tasks
**Sprint 9 (Polish):** Tier 6 + 7 = 6 tasks

**Total: 68 wiring tasks across 9 sprints**
