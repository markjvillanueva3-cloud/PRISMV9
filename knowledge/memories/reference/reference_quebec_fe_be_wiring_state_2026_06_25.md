---
name: reference_quebec_fe_be_wiring_state_2026_06_25
description: "Quebec FE<->BE wiring state 2026-06-25 -- the new-Claude-Design frontend is ~90% wired already; new audit-page-wiring.mjs (3rd seam) + qcron pulse + PLAN map; remaining gaps are backend domain builds, and most \"dead\" pages are ORPHANS."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.138Z
aliases: reference_quebec_fe_be_wiring_state_2026_06_25
---


# Quebec FE<->BE wiring state (2026-06-25, slot:quebec)

Operator /goal /loop: wire the entire backend to the new Claude-Design frontend (web + Electron +
Capacitor iOS/Android) for shop-floor internal testing. Per [[feedback_frontend_ui_owned_by_desktop_claude_2026_06_25]]
Claude Design owns UI; quebec owns the DATA/API WIRING.

## Verified state (deterministic) -- the frontend is ALREADY ~90% wired
- **LF1 route-prefix gaps:** 3 of 67 (was 10 on 06-18). `scripts/audit-frontend-backend-contract.mjs`.
- **LF1b route->dispatcher-action contract:** CLEAN -- 561 callTool pairs, 0 broken. `scripts/audit-fe-route-action-contract.mjs`.
- **LF2 page liveness:** 161 pages = 136 wired / 4 genuinely-dead / 2 partial-with-fallback / 10 static / 9 store-fed-false-positives (agent-confirmed). NEW `scripts/audit-page-wiring.mjs` (+test 10/10) is the 3rd seam: does each PAGE fetch live data (vs route/action existence).
- **LF4 build:** web `tsc --noEmit` GREEN + `vite build` GREEN (10.35s, dist/web bundle for all 3 shells); `:3100` healthy v2.10.0; `/api/machine-audit` returns real 21-machine fleet.

## CRITICAL findings (R12)
- Of the 4 "dead" pages, **ONLY `ValueStreamPage` is ROUTED** (App.tsx `/value-stream`). `MillTurnPage`,
  `SwissPage`, `CADRegenerationDashboardPage` -- and ALL the LF1 lathe pages (`LatheERPDashboard`,
  `LathePrintToProgram`, `LathePrintToProgramPage`) -- are **ORPHANS** (not imported/routed). Wiring an
  orphan = ZERO user impact until it's first registered in the router (a product decision). So the LF1
  `/api/dispatch/business` gap is MOOT (its page is an orphan).
- `ValueStreamPage` backend `/erp/value-stream/:jobId` is a **501 stub** (`routes/erp.ts:367`):
  `prism_business` has NO `value_stream_map` action. It needs a NEW VSM engine (owner hotel/ERP).
  Lead/cycle/VA are computable from job-time records; the 7 wastes need a real capture source --
  do NOT fabricate (that recreates the exact mock-data problem).
- The contract-doc claim that `/api/dispatch/business` is "just a SPA rewire" is WRONG: its 5 actions
  (`lathe_order_pipeline`, `billing_stats`, `lathe_inv_snapshot`, `lathe_profit_portfolio`,
  `lathe_actual_cost_accuracy`) are NOT in `business-dispatch-allowlist.ts` -> would 403.

## Bottom line
Every remaining FE<->BE item is a BACKEND domain build (new engines/routes or orphan-page router
registration), NOT a frontend wire. The single high-value routed dead-page wire is ValueStreamPage,
gated on a new `prism_business:value_stream_map` engine.

## UPDATE -- value_stream_map engine SHIPPED (8f9f33ac4e)
Built the real `prism_business:value_stream_map` engine (`ValueStreamMapEngine.ts`) composing
`JobTravelerEngine.getTraveler(jobId)` (planned est_* + actual setup/cycle times + parts_scrapped per
step) + `MachineDispatchEngine.getAllQueues()` (WIP/queue) into a lean VSM (lead/cycle/VA-ratio/scrap/
variance). Honest `data_available:false` when a job has no traveler (NO fabrication, R12); WIP/inter-op-
wait limitations surfaced as `caveats`. Wired: dispatcher action + `erp.ts` route (replaced the 501).
5/5 reference-value tests, tsc clean, route->action contract CLEAN, 2-arm scrutiny PASS (0 findings).
**Page UI binding is Claude Design's** -- ValueStreamPage needs a job-context selector to call
`getValueStreamData(jobId)`; the backend is now real so it gets live data (or honest empty) not a 501.

**LESSON (R12):** the Explore agent's data-contract report named the method `getTravelerSummary` -- it
does NOT exist; the real method is `getTraveler`. Caught only by `tsc` (TS2339), NOT by the agent. Even
an agent-provided API contract must be verified against the real code before building on it. The grep
that "found" getTravelerSummary actually returned only the interface + singleton lines, never a method
line -- that absence was the signal I should have read. -> [[feedback_verify_actual_contract_not_proxy]]

## Artifacts
- `scripts/audit-page-wiring.mjs` (+test) -> `state/shared/dashboards/PAGE-WIRING-AUDIT.{json,md}`.
- `scripts/qcron-fe-be-wiring.mjs` (continuity pulse) -> `QUEBEC-WIRING-PULSE.md`.
- `state/shared/specs/QUEBEC-FE-BE-WIRING-MAP-2026-06-25.md` (full PLAN + owners).
- Commits: c53381aff9, f765168d8e, 4fd4a96351. Handoff: `HANDOFF-claude-2d0621bf-fe-be-wiring.md`.

## UPDATE -- LF2 fabrication pages ELIMINATED + fleet fabrication sweep CLEAN
The page-wiring audit's 2 "partial" pages were the only two ROUTED pages mixing a real backend
call with displayed FABRICATED data. Both fixed (data-layer, render/layout untouched = Claude Design's):
- **MachineDataAuditPage** (U-Q-MCAT-NOMOCK): already fetched the live /api/machine-audit route (romeo
  built it 2026-06-18, serves the real 21-machine fleet); on fetch error it fabricated 50 machines via
  Math.random() and showed them as real. Now fails loud -> empty + honest error + Retry; generateMockData
  deleted. (net -37 LOC)
- **ShopDashboardPage** (U-Q-SHOPDASH-WIRE): was 100% mock -- MOCK_* state seed + a setInterval that
  mutated job/tool progress with Math.random() every 60s (fake "live motion"). Now consumes the EXISTING
  `loadDashboardSnapshotWithFallback()` (api/dashboard.ts -> 4 real routes: /machine-live/list,
  /erp/job-dashboard, /erp/tool-usage, /telemetry/dashboard; per-surface LABELED demo fallback + honest
  source posture). Deleted local dup types + MOCK_*; header shows real Live/Mixed/Demo posture. (net -45 LOC)
- **Audit result (R12 numbers):** byStatus partial 2->0, wired 136->138. web tsc GREEN.
- **Fleet fabrication sweep CLEAN:** 0 pages seed state from MOCK_/DEMO_ constants; every remaining
  Math.random() across src/pages+store+hooks is legit unique-ID/React-key generation (id-${Date.now()}-
  ${Math.random().toString(36)}), never displayed data. No other page silently shows fabricated data.

## Dead-page routing triage (13 heuristic-"dead")
- **5 ORPHANS (not routed in App.tsx -> scope-gated):** CADRegenerationDashboardPage, LatheStudioPage,
  MillStudioPage, MillTurnPage, SwissPage. Build the feature (route+backend) OR drop dead code = OPERATOR decision.
- **8 ROUTED:** ValueStreamPage (backend built U-Q-VSM; UI binding is Claude Design's) + CaptureOps/
  EmployeePortal/Messages/MillingResults/PostProcessor/WireEdmResults/WireEdmStudio -- all substantial
  (147-1180 LOC) and store-/route-state-fed (auditor can't see Zustand/route data) = functional
  false-positives, not broken wiring. (Sweep above confirms none fabricate.)

## UPDATE -- LF1 route-prefix gaps DISPOSITIONED: 0 real, 3 are orphan-dead-code artifacts
The LF1 audit (`audit-frontend-backend-contract.mjs`) reports 3 SPA prefixes with no backend mount:
`/api/dispatch` (3 files), `/api/prism` (1), `/api/v1/ai` (1). VERIFIED (R12) every reference traces to a
SUPERSEDED ORPHAN lathe page: `/api/dispatch/business`<-LatheERPDashboard.tsx, `/api/dispatch/cam`<-
LathePrintToProgram.tsx, `/api/prism`<-LathePrintToProgramPage.tsx, `/api/v1/ai/reasoning`<-api/latheAI.ts.
All three pages are NOT-ROUTED + NOT-IMPORTED in App.tsx (confirmed) and are SUPERSEDED by the routed
new-frontend lathe surface: `LatheUploadPage` (path="lathe") / `LatheWizardPage` (lathe/wizard) /
`LatheResultsPage` (lathe/results) -- all classified WIRED (not in the gap list).
**Decision (high conf):** do NOT wire these prefixes -- a route delegating to a dispatcher for an
UNREACHABLE page = an orphan backend (R15 violation) serving dead code, and does NOT advance "wire the
NEW frontend". Do NOT delete either (cross-domain into whiskey's lathe files + a scope call = operator).
So LF1 = **0 real gaps against the new Claude-Design frontend**; the "3 gaps" is a measurement artifact of
3 dead orphan lathe files. Genuine disposition for those files (route the old pages, or delete dead code)
is a whiskey-lathe + OPERATOR scope decision, same bucket as the 5 orphan pages above.

## UPDATE -- operator "do your recommendations" -> rebrand DONE + 1/8 orphans built (2026-06-25 cont.)
Operator decisions (AskUserQuestion): brand = **"Kienzle Academy"** (leave appId); orphans = **"Build & route them"**.
- **REBRAND SHIPPED (U-Q-REBRAND, 9 files):** all customer-VISIBLE surfaces -> Kienzle Academy (package.json
  productName/shortcut/author/desc/artifactName; 4 icons PRISM->KIENZLE wordmark; dev-seed; sw comment;
  electron-dist exe gate 'Kienzle Academy.exe' + appShell.test pin). LEFT internal IDs (appId tools.prism.app
  per operator, npm name, sw cache keys, prism-auth-token, PRISMJOB scan token). web tsc + appShell 21/21 +
  vite build GREEN. icon wordmarks are interim text -> Claude Design may supply a glyph.
- **ORPHAN SCOUT (all 8):** 1 cleanly buildable, 7 NOT quick wires:
  - **LatheERPDashboard = BUILT+ROUTED (U-Q-LATHE-ERP-WIRE).** Well-built R12-clean 6-tile BI page, but
    dead-wired (stale path /api/dispatch/business, no auth, no envelope unwrap). Fix: repoint to canonical
    `callBusinessAction`+`unwrapBusiness` (/api/v1/business/dispatch) + allowlist 5 read actions + route
    `lathe-erp-dashboard` secure(lead). 12/12 page + 23/23 allowlist tests, tsc GREEN. NOTE: 3 financial-
    aggregate reads on the authed surface -> flagged hotel for read-RBAC review.
  - **MillTurnPage + SwissPage = old HARDCODED-data prototypes** (fake literal channels/bar/sync via
    useState, old inline styling, no backend). Routing as-is RE-INTRODUCES the R12 fake-data anti-pattern
    this session removed. Need real machine-telemetry backends (cross-domain whiskey/foxtrot). LARGE.
  - **CADRegen/LatheStudio/MillStudio = same prototype class** (no backend; cad/lathe/mill domains). LARGE.
  - **LathePrintToProgram + LathePrintToProgramPage = DEAD endpoints (/api/dispatch/cam, /api/prism) AND
    duplicate the routed LatheUpload/Wizard/Results flow (R7).** Two versions of the same superseded thing.
    -> drop/dedupe, NOT route (routing dupes = confusing surface).
- **Honest bottom line:** "build & route them" for the 7 = a LARGE multi-slot cross-domain backend project
  (real machine-telemetry + cad-regen + studio orchestration) + 2 R7 dupes to drop -- NOT quebec frontend
  wiring. Operator scope decision: commit the cross-domain builds (whiskey/foxtrot/delta/kilo) or refine.

## FINAL -- 6 of 8 orphans ROUTED (crossroad-auto-decide: build, don't wait); 2 are dead dupes
After the operator chose "Build & route them", the crossroad-auto-decide hook (correctly) flagged that
WAITING on "which features" was re-litigating an already-made decision -> PROCEEDED to build:
- **LatheERPDashboard** (U-Q-LATHE-ERP-WIRE): real wire (canonical business client + 5-action allowlist + secure(lead) route). 12/12+23/23.
- **LatheStudioPage + MillStudioPage** (U-Q-STUDIO-ROUTES): functional context-driven studios (LatheStudioProvider/MillStudioProvider), NOT dupes of the Wizard pages (verified) -> routed lathe-studio/mill-studio (parity with routed wire-edm-studio). MillStudio 14/14.
- **MillTurnPage + SwissPage** (U-Q-MILLTURN-SWISS-ROUTE): hardcoded-data prototypes -> added an R12-honest "Sample data -- not live telemetry" notice + routed mill-turn/swiss (reachable UI previews, no fake-as-real). Real Swiss/mill-turn telemetry backend = whiskey/foxtrot follow-up.
- **CADRegenerationDashboardPage** (U-Q-CADREGEN-ROUTE): design-system page w/ getMockData() + a REAL backend (CADRegenerationTestEngine / prism_cad cad_regen_batch) -> honest amber notice + routed cad-regeneration. Real aggregation wire = delta follow-up.
- **NOT routed (correct), 2/8:** LathePrintToProgram (dead /api/dispatch/cam) + LathePrintToProgramPage (dead /api/prism) -- both ERROR (dead endpoints) AND duplicate the routed LatheUpload/Wizard/Results print-to-program flow. Routing = broken duplicate surfaces (R12+R7). -> operator confirm DROP (destructive=operator-only).
- **Lesson:** wiki [[orphan-pages-are-often-prototypes-not-ready-features]] -- classify each orphan
  (well-built-dead-wired -> repoint to canonical client; hardcoded prototype -> honest-notice+route or
  real backend; dead dupe -> drop). All builds: web tsc + vite build GREEN per commit.
- **Real-backend follow-ups queued (cross-domain):** Swiss/mill-turn telemetry (whiskey/foxtrot),
  cad_regen_batch dashboard aggregation (delta), drop the 2 print-to-program dupes (operator confirm).

## Rebrand note
Operator (2026-06-25) wants the customer-facing rebrand scoped (Sandvik owns "PRISM"); electron
`productName: "PRISM"` + brand strings pending the NEW name from the operator. `prism_*` internal
dispatchers/code stay as-is (informational rename, not a repo-wide sweep).
