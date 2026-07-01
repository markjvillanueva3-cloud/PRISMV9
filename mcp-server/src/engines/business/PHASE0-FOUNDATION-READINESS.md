# Phase-0 Foundation Readiness Report — PRISM Networking Platform

> **Scope.** Adversarial verification of the Phase-0 plan's load-bearing "reuse" claims, run against the MAIN tree (`H:/prism`, git toplevel `H:/PRISM`, branch `cad-fusion-live-ms0`) — NOT the slot worktree. Six claims were red-team verified at file:line granularity. This report converts those verdicts into per-capability GO/NO-GO readiness calls, a corrected unit list with verified preconditions, the single surviving foundation risk, and an overall start verdict.
>
> **Bottom line up front: GO-WITH-CONDITIONS.** 4 of 6 claims are verified-real-and-wired and reusable today; 2 are `partial` and require a focused wire/fix session before the capability is live. Crucially, two of the "just reuse it" assets are NOT actually working at runtime despite real, tested code existing — those are the findings that matter, and they are called out loudly below.

---

## 1. Verdict Table

| # | Claim | Verdict | Key Evidence (file:line) | Phase-0 Implication |
|---|-------|---------|--------------------------|---------------------|
| 1 | **api-v1-bridge-handler** — HTTP bridge exposes `/api/v1` routes reaching `prism_*` dispatchers; a frontend can drive the backend | ✅ **verified-real-and-wired** | `index.ts:888` real `express()` app; `:1077-1091` `callTool()` resolves `server._registeredTools[tool].handler({action,params,_http_api:true})`; `routes/index.ts:94-215` mounts ~41 `/api/v1/*` modules; `routes/cad.ts:17-22` route→`callTool('prism_cad','mesh_import')`→JSON; SPA clients `web/src/api/client.ts:34` + `speedfeed.ts:7` target `API_BASE='/api/v1'` | **Reuse as-is.** Genuine route→callTool→dispatcher→JSON chain, ~41 modules, typed SPA clients already pointed at v1. No net-new plumbing. **Caveat:** server binds `process.env.PORT \|\| 3000` (`index.ts:1119`) but MCP bridge expects `127.0.0.1:3100` (`mcp-http-bridge.mjs:49`) — must launch with `PORT=3100` and serve SPA same-origin. |
| 2 | **instant-quote-engine-wired-physics** — InstantQuoteEngine runs a real physics quoting pipeline, wired into `prism_business` | ✅ **verified-real-and-wired** | `InstantQuoteEngine.ts:276` real physics orchestration; `:322-347` SpeedFeed MRR→cycle time (`cycle_time_source='physics_calculated'`); `:398` QuoteEstimator (fail-loud); `:807-842` RSS CI95; `:880-881` Wright's-law qty breaks; `businessDispatcher.ts:508-510` ACTIONS enum + `:1946-1949` case `instant_quote`→`instantQuoteEngine.quote(params)`; tests = 47 real-value asserts vs 5 `toBeDefined` | **Reuse as-is.** Call `prism_business:instant_quote` / `_qty_breaks` / `_lead_time` directly — no build/wire work. Only cosmetic debt: the "879-action" figure is stale (actual 807). |
| 3 | **vendor-engine-real-tested-unwired** — VendorEngine is a real, tested supply-side engine | ⚠️ **partial** | `VendorEngine.ts:108-321` real CRUD/scorecard/spend + singleton; `VendorEngine.test.ts:12-163` 17 real asserts; **BUT** `businessDispatcher.ts:5105-5109` the existing `vendor_manage` case is a **FALSE-WIRE**: `vendorEngine.run?.() ?? .manage?.() ?? .get?.() ?? {note:'method not callable'}` — no `run`/`manage` method exists, `get(id:string)` rejects a params object → always falls to the placeholder. Zero real capability exposed | **Wire-first — and the plan's framing is wrong twice:** it is NOT zero-ref (enum + case exist) and the existing wire is cosmetic. Phase-0 must **REPLACE** the false-wire with real per-action cases, not add a fresh wire alongside it. |
| 4 | **capability-matching-spine** — 5-engine physics spine answers "can machine X hold tolerance T in material M" | ✅ **verified-real-and-wired** (single-tenant) | `MachineMatcherEngine.ts:146-196` real match over 19-machine catalog, wired `camDispatcher.ts:6459-6466`; `TOPSISEngine.ts:39-137` wired `calcDispatcher.ts:5684`; `ProcessCapabilityPredictionEngine.ts:122-282` wired `processDispatcher.ts:194` + `calcDispatcher.ts:10202`; `ForceCapabilityEngine.ts:117-307` (Kienzle/power/deflection) wired `calcDispatcher.ts:7470`; `MachineCapabilityIntelligenceEngine.ts:1-160` wired `machineSetupDispatcher.ts:307+`. **No `SupplierCapabilityProfile`/`supplier_match` exists** (grep = no matches) | **Reuse as-is for single-tenant (JM Die).** Spine is real, physics-backed, fully wired. **But** MachineMatcher scores its OWN hard-coded 19-machine generic catalog, decoupled from `ShopConfigurationEngine`'s actual JM Die fleet — wire `ShopConfig.getActiveShop().machines` in. Multi-tenant supplier matching is **confirmed net-new**. |
| 5 | **quote-to-ship-erp-loop** — QuoteToShipOrchestrator runs atomic quote→…→GL with double-entry; ERPCostFeedback reconciles | ⚠️ **partial** | `QuoteToShipOrchestratorEngine.ts:4790-4898` real 26-stage executor, wired `businessDispatcher.ts:3509-3512`; `GeneralLedgerEngine.ts:528-570` real double-entry (`throw 'journal entry unbalanced'`). **BUT** `:4046-4062` orchestrator calls `glEngine.recordJobCost(...)` — **method does NOT exist** (grep: no matches), call is guarded so it silently no-ops; `:4662+4682` invoice + WIP→COGS releases are gated on `ctx.gl_journal` which only `recordJobCost` sets → **entire GL posting chain is skipped in the happy path.** `ERPCostFeedbackEngine.ts:1` is `// WIRE-EXEMPT` and NOT invoked; live variance path uses ActualCost + JobProfitabilityWaterfall | **Wire-first.** Orchestrator + dispatcher + GL engine are real, but **the loop does NOT post journal entries at runtime** because of the missing `recordJobCost`. ERPCostFeedback is not the live reconciler. Fix the gap; don't rely on ERPCostFeedback. |
| 6 | **drawing-ingest-dfm-frontdoor** — STEP parser + Vision OCR + DFM pipeline ingest a real drawing → feature+DFM for the quote | ✅ **verified-real-and-wired** | `STEPGeometryParserEngine.ts:112-278` real ISO 10303-21 parser, wired `cadDispatcher.ts:2535-2547` (header's WIRE-EXEMPT is STALE); `BlueprintVisionOCREngine.ts:350-398` real Claude Vision ingest + part-class priors, wired `cadDispatcher.ts:2552-2559` + `qualityDispatcher.ts:201-216`; `DFMPipelineEngine.ts:250-485` real 8-stage DFM, wired `cadDispatcher.ts:743-774` (5 actions); `CADFeatureRecognitionEngine` U-EFF25 stub **already rescued** 2026-05-27 (`:1-12,62-131`); `BlueprintToQuoteBridgeEngine.ts:105-286` closes ingest→quote, wired `businessDispatcher.ts:2549-2551` | **Reuse as-is.** End-to-end and wired. The flagged CADFeatureRecognition stub is NOT a gap (rescued). **Caveats:** stale WIRE-EXEMPT header on STEP parser (cosmetic); OCR leg needs `ANTHROPIC_API_KEY` at runtime; no DXF-native vector reader in these 3 engines (Vision-of-rasterized-PDF only). |

---

## 2. Per-MVP-Capability Readiness Call

GREEN = reuse as-is · YELLOW = wire-first / extend · RED = build net-new

| Capability | Readiness | Why | What Phase-0 must do |
|------------|-----------|-----|----------------------|
| **drawing-ingest** | 🟢 **GREEN** | STEP parser + Vision OCR + DFM pipeline + BlueprintToQuote bridge all real and dispatcher-wired; the previously-flagged CADFeatureRecognition stub was rescued. | Provision `ANTHROPIC_API_KEY` for the OCR leg. Optional 5-min hygiene: correct stale WIRE-EXEMPT header on `STEPGeometryParserEngine.ts:1-4`. No DXF-native reader — route DXF via the separate CAD reader if needed. |
| **instant-quote** | 🟢 **GREEN** | Real physics pipeline (SpeedFeed cycle time + QuoteEstimator cost + Wright's-law + RSS CI95), fully wired into `prism_business`. Strong test coverage (47 real asserts). | Nothing. Call `prism_business:instant_quote` directly. (Refresh stale 807-vs-879 action count if relied on elsewhere.) |
| **capability-match** | 🟡 **YELLOW** | 5-engine physics spine is real and wired — but **single-tenant**: MachineMatcher scores its own hard-coded 19-machine catalog, decoupled from the real JM Die fleet. Multi-tenant supplier matching does not exist. | (a) Wire `ShopConfigurationEngine.getActiveShop().machines` into MachineMatcher so it scores the real fleet. (b) Multi-supplier marketplace = net-new (see Unit list). |
| **ERP-loop** | 🟡 **YELLOW** | Orchestrator + dispatcher + double-entry GL engine are real, **but the GL chain never fires at runtime** — `recordJobCost` is called but does not exist, so `ctx.gl_journal` stays null and both invoice + WIP→COGS postings are silently skipped. ERPCostFeedback is WIRE-EXEMPT and not the live reconciler. | Add real `GeneralLedgerEngine.recordJobCost()` (~30 LOC + zod). Add anti-regression test asserting `getTrialBalance().balanced===true` after a full run. Treat ActualCost + JobProfitabilityWaterfall as the canonical reconciler. |
| **api-bridge** | 🟢 **GREEN** | Real Express app, `callTool` bridge, ~41 `/api/v1` modules, typed SPA clients already targeting v1. | Launch server with `PORT=3100` (or point bridge/frontend at the actual bound port) and serve the SPA same-origin (or configure dev proxy). Deployment detail, not code. |
| **vendor-directory** | 🟡 **YELLOW** | VendorEngine is real and tested, but its only dispatcher wire is a **cosmetic false-wire** (`method not callable` fallback) — zero real capability is exposed today. | Replace `vendor_manage` (`businessDispatcher.ts:5105-5109`) with ~9 real per-action cases (create/get/update/search/list/scorecard/spend_analysis/record_spend/stats), add zod schemas, add a dispatcher round-trip E2E test. Avoid name collision with the different `VendorPerformanceTrackerEngine` actions (`vendor_compute_scorecard`/`vendor_list_all`/`vendor_rank`). |

**Tally:** 3 GREEN (drawing-ingest, instant-quote, api-bridge) · 3 YELLOW (capability-match, ERP-loop, vendor-directory) · 0 RED capability *blocking* the MVP. (The marketplace-supplier extension is net-new, but it is an extension of a GREEN single-tenant spine, not a missing foundation.)

---

## 3. Corrected Phase-0 Unit List (with VERIFIED preconditions)

Each unit below carries a precondition that has been **verified against evidence**, not assumed. Units are ordered by dependency / risk.

### U-P0-01 — Fix the ERP GL posting gap (`recordJobCost`)  ·  YELLOW → GREEN
- **Verified precondition:** The quote→…→GL loop does NOT post journal entries at runtime — `QuoteToShipOrchestratorEngine.ts:4046-4062` calls `glEngine.recordJobCost(...)` which **does not exist on GeneralLedgerEngine** (grep: no matches), so the guarded call no-ops, `ctx.gl_journal` stays null, and both `:4662` invoice + `:4682` WIP→COGS releases short-circuit. This is a silent runtime failure behind real, tested code.
- **Work:** Add `GeneralLedgerEngine.recordJobCost(input)` posting DR 1300 WIP / CR (2000 AP or 1320 Raw + 2200 Accrued Payroll) via `postEntry()` so the entry balances (~30 LOC + zod). Add anti-regression test: `runFullPipeline()` → balanced GL journal (DR WIP at JOB_LIFECYCLE, CR WIP + DR COGS at SHIPPING) and `getTrialBalance().balanced === true`.
- **Do NOT:** rely on `ERPCostFeedbackEngine` — it is `// WIRE-EXEMPT` (`ERPCostFeedbackEngine.ts:1`) and is not the live reconciler. Live variance path is ActualCost + JobProfitabilityWaterfall.

### U-P0-02 — Replace the VendorEngine false-wire with real action cases  ·  YELLOW → GREEN
- **Verified precondition:** VendorEngine is genuine and tested, but its only dispatcher wire (`businessDispatcher.ts:5105-5109` `vendor_manage`) is an auto-generated `method not callable` fallback exposing **zero** real capability — the engine has no `run`/`manage` method and `get(id:string)` rejects a params object.
- **Work:** Replace `vendor_manage` with explicit actions (`vendor_create`, `vendor_get`, `vendor_update`, `vendor_search`, `vendor_list`, `vendor_scorecard`, `vendor_spend_analysis`, `vendor_record_spend`, `vendor_stats` — or `supplier_*`/`vendor_master_*` to avoid collision with the different `VendorPerformanceTrackerEngine` actions at `:6556-6569`). One case per method, lazy import already correct pattern. Add zod schemas (input shapes exported `VendorEngine.ts:60-81`). Add dispatcher round-trip E2E (create→search→scorecard via `prism_business`) since `VendorEngine.test.ts` exercises the engine but NOT the dispatcher path.
- **Est:** ~1 focused session (9 cases + schemas + 1 round-trip test).

### U-P0-03 — Wire ShopConfiguration fleet into MachineMatcher  ·  YELLOW → GREEN
- **Verified precondition:** MachineMatcherEngine scores its OWN hard-coded 19-machine generic catalog (`MachineMatcherEngine.ts:108-135`), with **no reference to** `ShopConfigurationEngine`/`DEFAULT_MACHINES` (grep: no matches). So today it does not score against JM Die's actual fleet (VMC-01 Hurco VM30i … VMC-05 Roku-Roku, `ShopConfigurationEngine.ts:320-347`).
- **Work:** Inject `ShopConfigurationEngine.getActiveShop().machines` into the matcher's candidate set (small wire-first task). Keeps the physics scoring intact; just feeds it the real fleet.

### U-P0-04 — Confirm/launch api-bridge on the correct port  ·  GREEN (deployment)
- **Verified precondition:** Bridge chain is real and wired, but server binds `process.env.PORT || 3000` (`index.ts:1119`) while the MCP bridge expects `127.0.0.1:3100` (`mcp-http-bridge.mjs:49`). SPA uses relative `/api/v1` paths so must be same-origin.
- **Work:** Launch with `PORT=3100`; serve built SPA from the same Express app (`index.ts:1103-1114` does this when `dist/web` exists) or configure a dev proxy. No code change.

### U-P0-05 — Provision ANTHROPIC_API_KEY for the OCR ingest leg  ·  GREEN (config)
- **Verified precondition:** `BlueprintVisionOCREngine.getClient()` (`:315-321`) requires `ANTHROPIC_API_KEY`; the PDF/image leg throws without it. STEP leg (text parser) and DFM compute have no such dependency.
- **Work:** Set the env var in the Phase-0 launch environment. (Optional 5-min: correct stale WIRE-EXEMPT header on `STEPGeometryParserEngine.ts:1-4`.)

### U-P0-06 — Build SupplierCapabilityProfileEngine (marketplace extension)  ·  RED / NET-NEW
- **Verified precondition:** **CONFIRMED net-new** — case-insensitive grep for `SupplierCapabilityProfile`/`SupplierProfile`/`supplier_match` across `mcp-server/src` returns **no matches**. The capability spine is single-tenant (JM Die only). `MultiTenantEngine` is tenant data-isolation, not supplier-capability scoring; `Cross*Process*` hits are federated ML, not cross-supplier matching.
- **Work (deferrable past MVP if MVP is single-tenant):** (1) net-new `SupplierCapabilityProfile` type/store keyed by tenant/supplier id, populated per-supplier from fleet + materials + tolerance history (reuse `MultiTenantEngine` for isolation + `ShopConfigurationEngine` shape per supplier); (2) net-new supplier-match scorer running the existing single-tenant spine per candidate and aggregating cross-supplier via **TOPSISEngine (reusable as-is)**; (3) the U-P0-03 ShopConfig→Matcher wire is a prerequisite. **Est:** ~2-3 engines + 1 dispatcher action + per-supplier store; the physics underneath is fully reusable.

> **Units intentionally NOT on this list:** rebuilding the quoting pipeline (instant-quote is GREEN), building a drawing front-door (GREEN), building an api bridge (GREEN), building the capability physics (GREEN single-tenant). Any plan unit proposing to *build* these from scratch should be struck — they exist and are wired.

---

## 4. The Single Biggest Foundation Risk That Survived Verification

**Risk: "Real, tested code" silently does nothing at runtime — the false-confidence class.**

Two of the six "reuse it" assets (vendor-directory and the ERP GL loop) contain genuine, well-tested engine code that an inventory scan, a unit-test run, and even a casual `grep` for the dispatcher action **all report as present and passing** — yet at runtime they expose zero capability:

- **ERP-loop:** `runFullPipeline()` succeeds, the GL engine's double-entry tests pass, the dispatcher action resolves — but no journal entry is ever posted because the orchestrator calls a non-existent `recordJobCost` behind a truthy-guard, so the failure is *swallowed as a warning*. A demo would "complete a job" and show an empty ledger.
- **vendor-directory:** `VendorEngine.test.ts` is green (it tests the engine directly), the `vendor_manage` action exists in the enum, the case resolves — but every real payload falls through to `{ note: 'method not callable' }`.

This is exactly the failure mode CLAUDE.md R12 ("fail loud") and the §ENGINE WIRING round-trip-E2E criterion exist to catch: **engine-level green ≠ dispatcher-path green.** A Phase-0 plan that trusts the inventory/test signals without round-trip verification would ship a foundation that looks complete and is hollow at exactly the two supply-side seams a networking/marketplace platform leans on hardest.

**Mitigation (mandatory, cheap):**
1. **Round-trip E2E gate on every reused dispatcher action** before declaring a capability GREEN — call it through `prism_business`/`prism_cad`/etc. with a real payload and assert a real result (not just "no throw"). This converts the two silent failures into loud test failures.
2. **Fix the two specific gaps** (U-P0-01 `recordJobCost`, U-P0-02 vendor action cases) in the first Phase-0 session — both are <1 session each.
3. **Promote a "no truthy-guarded no-op" lint** into the bug-finding→wiki gate: any `fn?.() ?? fallback` pattern routed from a dispatcher case is a false-wire smell.

---

## 5. Overall Verdict

> ## ✅ GO-WITH-CONDITIONS — start Phase-0 now; the first session MUST close U-P0-01 (ERP `recordJobCost`) and U-P0-02 (VendorEngine action cases), and every reused dispatcher action gets a round-trip E2E before its capability is called GREEN. 4 of 6 foundations reuse as-is; the 2 partials are wire/fix, not build; the only net-new (SupplierCapabilityProfile) is a clean extension of a verified single-tenant spine.

---

*Generated for the PRISM networking platform Phase-0 foundation review. Evidence is from the MAIN tree `H:/prism` (branch `cad-fusion-live-ms0`). All file:line citations are reproduced from the adversarial verification verdicts and should be re-confirmed against HEAD before any unit is closed.*
