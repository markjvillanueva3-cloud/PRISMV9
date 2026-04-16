# APPW-MS8 Frontend Product Sweep

Updated: 2026-04-10
Author: Codex
Scope: Canonical frontend `H:/PRISM/mcp-server/web`

## Summary

The canonical frontend exposes a large portion of PRISM's product surface, but the commercial, machine-workspace, employee/mobile, and browser-test layers still underuse backend truth in ways that increase manual validation effort. The main pattern is consistent:

- the calculator is materially ahead of the rest of the app on catalog wiring, provenance, and source-state disclosure
- purchasing, sourcing, ROI, and cost pages still expose backend calls without calculator-grade source stamps, freshness labels, unavailable reasons, or registry-backed selectors
- machine-page CAD workspace capability exists in pieces but is not promoted into the routed machine pages as a shared workspace
- commerce packaging, add-ons, sourcing posture, and buy recommendations are still largely staged in frontend seams
- critical employee/mobile routes still allow live-fallback and kiosk-first posture where phone-first labor flows should fail closed and open directly into active work
- browser-backed release gates do not exist yet, so route, role, responsive, button, and machine-workspace confidence still depends too much on manual browsing

## High-Signal Findings

### 1. Commerce and buy-recommendation surfaces are still frontend-staged

Evidence:

- [providerSurfaceStatus.ts](H:/PRISM/mcp-server/web/src/features/operating-system/providerSurfaceStatus.ts) marks `commerce` as `live-fallback` and explicitly says tier packaging, add-on catalogs, sourcing, and buy recommendations remain staged seams.
- [fixtureProvider.ts](H:/PRISM/mcp-server/web/src/features/operating-system/fixtureProvider.ts) provides `getProgramPurchaseRecommendations()` and `getAlarmCommerceWorkspace()` from commerce fixtures.
- [commerceFixtures.ts](H:/PRISM/mcp-server/web/src/features/operating-system/commerceFixtures.ts) contains static tiers, add-ons, regions, and distributor recommendation logic.
- [shellCommerceState.ts](H:/PRISM/mcp-server/web/src/features/operating-system/shellCommerceState.ts) persists shell commerce posture in local storage only.

Impact:

- program release, calculator, and alarm purchase recommendations are not yet contract-honest live commerce outputs
- pricing, regional sourcing, and entitlement posture can drift from backend truth
- manual validation remains necessary for high-value purchase decisions

Required change:

- land a shared live `purchase_context_compare` contract and typed client
- move tier/add-on/source-of-truth posture behind live entitlements plus explicit fallback labeling

### 2. Commercial pages call backend APIs but do not disclose data provenance well enough

Evidence:

- [PurchasingPage.tsx](H:/PRISM/mcp-server/web/src/pages/PurchasingPage.tsx) calls `purchasingSearch`, `purchasingRecommend`, and `purchasingSummary` but shows no source stamp, freshness, or unavailable reason contract
- [MaterialPricingPage.tsx](H:/PRISM/mcp-server/web/src/pages/MaterialPricingPage.tsx) calls `materialPriceLookup`, `materialPriceCompare`, and `materialSurcharge` but has no source-state disclosure
- [MachineRatesPage.tsx](H:/PRISM/mcp-server/web/src/pages/MachineRatesPage.tsx) calls live APIs, but compare/effective outputs still render as raw JSON and machine selection is free-text
- [VendorScorecardPage.tsx](H:/PRISM/mcp-server/web/src/pages/VendorScorecardPage.tsx) loads vendor rankings but has no freshness, sample-size, or unavailable-state communication

Impact:

- users cannot tell whether outputs are live, sampled, fallback, stale, or partially unavailable
- finance and purchasing decisions still require side-channel verification

Required change:

- every purchasing/material/machine/vendor/finance surface needs a standard source bar:
  - source
  - last refresh
  - confidence/provenance
  - unavailable reason when a metric is suppressed

### 3. Inventory and receiving still rely on staged seams for the parts that matter most operationally

Evidence:

- [InventoryPage.tsx](H:/PRISM/mcp-server/web/src/pages/InventoryPage.tsx) uses live inventory workspace for some cues, but still runs ABC analysis on hard-coded sample items and relies on staged department-route/checkout patterns
- [providerSurfaceStatus.ts](H:/PRISM/mcp-server/web/src/features/operating-system/providerSurfaceStatus.ts) says inventory intake still lacks deeper department routes, checkout choreography, and insert-edge custody

Impact:

- receiving, tooling issue/return, and usage-cost flows are not yet reliable enough to remove manual validation on the floor

Required change:

- replace sample ABC inputs with real inventory/product/tooling datasets
- expose live custody/source gaps explicitly instead of falling back silently

### 4. Machine pages still do not have the shared CAD workspace they need

Evidence:

- [CalculatorPage.tsx](H:/PRISM/mcp-server/web/src/pages/CalculatorPage.tsx) already contains the most complete CAD/geometry interaction surface
- [ProgramReleasePage.tsx](H:/PRISM/mcp-server/web/src/pages/ProgramReleasePage.tsx) supports file intake and source comparison, but not a shared editable CAD window
- routed machine pages such as [LatheUploadPage.tsx](H:/PRISM/mcp-server/web/src/pages/LatheUploadPage.tsx), [LatheWizardPage.tsx](H:/PRISM/mcp-server/web/src/pages/LatheWizardPage.tsx), [WireEdmUploadPage.tsx](H:/PRISM/mcp-server/web/src/pages/WireEdmUploadPage.tsx), and [WireEdmWizardPage.tsx](H:/PRISM/mcp-server/web/src/pages/WireEdmWizardPage.tsx) do not expose the calculator-grade shared CAD workspace

Impact:

- print-to-program and machine-specific flows still force too much context switching
- users cannot do avoid/fill, feature edits, offset tuning, or draw-from-scratch in the machine workflows that actually need them

Required change:

- promote a shared machine CAD workspace into all machine pages with:
  - upload/import
  - 2D/3D toggle
  - feature select/edit
  - avoid/fill controls
  - offset inputs
  - draw-from-scratch path

### 5. Several product surfaces still expose demo or partial-product posture without enough routing honesty

Evidence:

- [ViewerPage.tsx](H:/PRISM/mcp-server/web/src/pages/ViewerPage.tsx) still uses a local demo fallback
- [PostProcessorPage.tsx](H:/PRISM/mcp-server/web/src/pages/PostProcessorPage.tsx) still shows Swiss controller entries as `Coming Soon`
- [DashboardPage.tsx](H:/PRISM/mcp-server/web/src/pages/DashboardPage.tsx) and [SafetyMonitorPage.tsx](H:/PRISM/mcp-server/web/src/pages/SafetyMonitorPage.tsx) still distinguish `demo`/`mixed` source state

Impact:

- product readiness is overstated if these pages are treated as fully live surfaces

Required change:

- route manifest must explicitly mark partial-live routes and prevent silent promotion to production-ready status

### 6. Database-backed selectors are missing on the pages that should benefit most from them

Evidence:

- [MachineRatesPage.tsx](H:/PRISM/mcp-server/web/src/pages/MachineRatesPage.tsx) uses manual machine ID entry for compare/effective flows
- [PurchasingPage.tsx](H:/PRISM/mcp-server/web/src/pages/PurchasingPage.tsx) uses free-text material and supplier query inputs only
- [MaterialPricingPage.tsx](H:/PRISM/mcp-server/web/src/pages/MaterialPricingPage.tsx) uses free-text material entry instead of the material registry
- [FinancialAnalysisPage.tsx](H:/PRISM/mcp-server/web/src/pages/FinancialAnalysisPage.tsx) is calculator-driven but not yet wired into machine/tool/fixture/product selections

Impact:

- the frontend is underusing the machine, material, tooling, fixture, and product databases already present in PRISM
- operator error and manual validation burden remain too high

Required change:

- replace raw ID/free-text entry with registry-backed selectors wherever a canonical database already exists
- allow manual override only as an advanced path with explicit provenance downgrade

### 7. Employee and mobile shop-floor flows are not yet fail-closed enough for release confidence

Evidence:

- [OperatingSystemProvider.tsx](H:/PRISM/mcp-server/web/src/features/operating-system/OperatingSystemProvider.tsx) and [providerSurfaceStatus.ts](H:/PRISM/mcp-server/web/src/features/operating-system/providerSurfaceStatus.ts) still preserve live-fallback posture on critical employee-facing routes
- [AuthContext.tsx](H:/PRISM/mcp-server/web/src/contexts/AuthContext.tsx) and [LoginPage.tsx](H:/PRISM/mcp-server/web/src/pages/LoginPage.tsx) still infer role identity through a secondary lookup/fallback path instead of failing closed on authoritative role payloads
- [ShopFloorClockPage.tsx](H:/PRISM/mcp-server/web/src/pages/ShopFloorClockPage.tsx) is still kiosk-first and does not yet present the compact worker-first active-operation loop needed for phone use

Impact:

- employee and shop-floor surfaces still need too much real-world babysitting before they can be trusted for next-week usage
- operator flow, role posture, and live-data posture can drift silently from backend truth

Required change:

- make identity authoritative at login and remove role fallback from the critical labor path
- fail loudly on missing live contracts for employee, messages, jobs, and clock surfaces
- ship the operator-first mobile loop with active jobs, traveler context, pause reasons, and verification feedback

### 8. Canonical product exposure still misses selective donor manufacturing surfaces and dormant backend routes

Evidence:

- [App.tsx](H:/PRISM/mcp-server/web/src/App.tsx) does not yet expose several donor manufacturing/product surfaces already built in [TurningPage.tsx](H:/PRISM/web/src/pages/TurningPage.tsx), [EdmPage.tsx](H:/PRISM/web/src/pages/EdmPage.tsx), [WireEdmStudioPage.tsx](H:/PRISM/web/src/pages/WireEdmStudioPage.tsx), [MachineLivePage.tsx](H:/PRISM/web/src/pages/MachineLivePage.tsx), and [MechanicalDesignPage.tsx](H:/PRISM/web/src/pages/MechanicalDesignPage.tsx)
- backend route modules such as [mechanical.ts](H:/PRISM/mcp-server/src/routes/mechanical.ts), [cncOps.ts](H:/PRISM/mcp-server/src/routes/cncOps.ts), [diagnosis.ts](H:/PRISM/mcp-server/src/routes/diagnosis.ts), [thermal.ts](H:/PRISM/mcp-server/src/routes/thermal.ts), and [vibration.ts](H:/PRISM/mcp-server/src/routes/vibration.ts) still need explicit merge review against the central route registry

Impact:

- some product capabilities already built are still hidden or only partially connected in the canonical app
- route-level readiness can be overstated if dormant backend dependencies remain unmounted

Required change:

- use FMERGE-MS1 to selectively absorb only the donor manufacturing/product surfaces that materially close canonical gaps
- register any surviving backend route modules needed by the merged surfaces without reviving the old donor shell wholesale

### 9. Browser-backed route and interaction gates are still missing

Evidence:

- [package.json](H:/PRISM/mcp-server/web/package.json) and [App.tsx](H:/PRISM/mcp-server/web/src/App.tsx) show a large routed surface, but there is no `playwright.config.ts`, no `tests` directory, and no route/interaction/machine-CAD manifests yet
- current coverage in [core-pages.test.tsx](H:/PRISM/mcp-server/web/src/__tests__/core-pages.test.tsx), [manufacturing-pages.test.tsx](H:/PRISM/mcp-server/web/src/__tests__/manufacturing-pages.test.tsx), [remaining-pages.test.tsx](H:/PRISM/mcp-server/web/src/__tests__/remaining-pages.test.tsx), and [workflowContinuityChain.test.tsx](H:/PRISM/mcp-server/web/src/__tests__/workflowContinuityChain.test.tsx) is mostly jsdom-level

Impact:

- route, auth, responsive, modal, and button behavior still need too much real-world verification
- release confidence is weaker than the raw unit/integration count suggests

Required change:

- introduce Playwright-backed route, role, responsive, button, and transactional gates as the release decision surface
- use manifests for route coverage, interaction coverage, and machine-CAD coverage so the sweep is deterministic and multi-seat friendly

### 10. Viewer and simulation still retain demo escape hatches

Evidence:

- [viewer.ts](H:/PRISM/mcp-server/web/src/api/viewer.ts) still falls back to a local demo scene
- [pipeline-stage-validator.ts](H:/PRISM/mcp-server/src/__tests__/helpers/pipeline-stage-validator.ts#L285) still treats simulation as placeholder
- [PostProcessorPage.tsx](H:/PRISM/mcp-server/web/src/pages/PostProcessorPage.tsx) still contains `Coming Soon` controller posture that should not survive the required release scope

Impact:

- preview, backplot, simulation, and post readiness can appear higher than they really are
- manual prove-out remains necessary when these pages silently step off the live path

Required change:

- fail release-mode viewer/simulation flows when live scene data is missing instead of silently substituting demo content
- treat required controller and post surfaces as release blockers if they still present placeholder posture

## Frontend/Data-Contract Changes With The Biggest Payoff

1. Ship one shared `purchase_context_compare` payload for all commerce/ROI entry points.
2. Add a standard source/freshness/unavailable banner to every commercial and finance route.
3. Replace free-text machine/material/vendor inputs with registry selectors and typed search.
4. Promote the calculator CAD workspace into routed machine pages as a shared component.
5. Remove raw JSON result blocks from commercial pages and render structured decision cards instead.
6. Make partial-live routes declare staged seams in-route, not only through shared provider status.
7. Make employee/mobile routes fail closed on missing live contracts and ship the worker-first phone loop.
8. Add browser-backed route manifests and Playwright-driven release gates for the routed app surface.
9. Remove demo fallback from viewer/simulation/backplot release paths.

## APPW/FMErge Implications

- `APPW-MS8-U39` must declare source-state expectations per route, not only route existence
- `APPW-MS8-U41` must cover purchasing, material pricing, machine rates, vendor scorecard, program release, calculator, alarms, and inventory entry points
- `APPW-MS8-U42` must carry the full source/freshness/unavailable contract for pricing, ROI, and sourcing
- `APPW-MS8-U43` must replace free-text catalog inputs with registry-backed selectors, promote shared CAD workspace to machine pages, and harden critical employee/mobile routes onto fail-closed live posture
- `APPW-MS8-U44` must fail if a commercial page still hides staged/demo posture, if viewer/simulation still uses demo fallback, or if the browser-backed route/interaction/machine-workspace sweep is missing
- `FMERGE-MS1-U01` must review donor manufacturing surfaces and dormant backend route modules, then either merge the required ones or publish an unchanged-target waiver with explicit reasoning

## Minimum Automated Release Gate

1. Route/role/responsive E2E in a real browser for every routed page, with desktop plus `768px` coverage and roles `shop_floor`, `lead`, `hr_manager`, and `admin`.
2. Machine workspace E2E for calculator, lathe, wire EDM, and capture/viewer flows covering `STEP`, `DXF`, `PDF`, and photo inputs plus feature edits, avoid/fill, offsets, and draw-from-scratch.
3. Live API contract coverage for auth, ERP, CAD, CAM, turning, EDM, viewer, purchasing, and machine-live routes, including stale/unavailable behavior.
4. Engine-backed manufacturing regression across canonical mill, lathe, mill-turn, swiss, and wire EDM scenarios with machine-limit and output-validity assertions.
5. Viewer/backplot/simulation gates that fail on missing live scene data instead of silently using demo scenes.
6. ERP/employee/purchasing continuity flows that prove clock, punch, pause/resume, release, inventory, quality, invoicing, and messaging in the live app path.
