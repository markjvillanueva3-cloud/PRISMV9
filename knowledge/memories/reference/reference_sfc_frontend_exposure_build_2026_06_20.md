---
name: reference_sfc_frontend_exposure_build_2026_06_20
description: SFC frontend-exposure build (quebec) — verified current state + exact next units. The standalone SFC page exposes only 4 of ~15 backend endpoints and the charts inline Taylor constants (safety+doctrine violation). Staged for execution.
type: reference
slot: quebec
galaxy: frontend-app
source: prism-memory
synced: 2026-06-27T20:30:47.186Z
aliases: reference_sfc_frontend_exposure_build_2026_06_20
---


Operator greenlit (2026-06-20) building SFC frontend exposure NOW (launch wave 1A; all-four-parallel).

**SHIPPED 2026-06-20 (commit 82cabc91e4) -- U-Q-SFC-SILENT-ZERO-GUARD:** new shared `mcp-server/web/src/api/envelopeGuard.ts` (`assertNoEnvelopeError`+`envelopeErrorMessage`) applied to the LIVE `sfcApi` (`src/api/sfc.ts:post`, consumed by `hooks/useSfc.ts`), guarding the 200-OK-`{error}` silent-zero. 15/15 tests, tsc clean, 2-arm scrutiny PASS. **LESSON (R8):** my first pass edited `calcApi` (`src/api/calc.ts`) which has ZERO production consumers -- a DEAD duplicate of the live `sfcApi`. Per-file scrutiny caught it; reverted + redirected. Always grep for the LIVE client (the one a hook imports) before hardening an api module.

**ROUTE BUG FOR OSCAR (pre-existing, backend lane -- NOT fixed here):** `mcp-server/src/routes/sfc.ts:19-20` `/calculate` does `res.json({ result, safety: result?.safety, meta: result?.meta })` unconditionally. If `ProductEngine.sfcCalculate` returns its `{ error: string }` branch, the route hoists `result:undefined` -> emits `{}` -> silent empty-success. The FE guard CANNOT catch this (the route strips the error key). Fix = route detects the `{error}` branch -> `res.status(422).json(result)` or `next(new Error(result.error))`. Oscar's SFC lane.

R8 reads done; remaining units staged below.

**VERIFIED FINDING (bug — feeds wiki per bug-finding gate):** `mcp-server/web/src/components/sfc/AdvancedCharts.tsx:26-33` **inlines Taylor constants** (`const TAYLOR: Record<string,{n,C}>` = P n0.25/C300 · M n0.22/C200 · K n0.28/C250 · N n0.35/C500 · S n0.18/C120 · H n0.15/C100) **and recomputes tool-life physics client-side** (`generateToolLifeData` line 35: `Math.pow(C/v, 1/n)`; also `currentLife` at line 173-178). Violates BOTH the global SAFETY rule ("NEVER inline Kienzle/Taylor/material constants") AND quebec doctrine ("never inline physics in the UI — render what the dispatcher returns"). `generateSurfaceFinishData` (line 53) similarly recomputes Ra=f²/(32r) client-side. Correct fix = backend-computed curves.

**Current SFC frontend surface (verified file:line):**
- `web/src/api/calc.ts` (46 LOC): `BASE_URL=/api/v1/sfc`, exposes ONLY 4 endpoints — `speedFeed`(/calculate), `kienzle`, `taylor`, `mrr`. The 7 `/sfc` routes + 8 `/speed-feed` routes (orchestrate/9-axis/stochastic/tri-compare/calibration/resolve/optimize/inventory-select) are UNREACHABLE from this client.
- `web/src/api/speedfeed.ts` (9075 bytes, EXISTS — May 8) — the richer client; verify what it already exposes before adding to calc.ts (avoid dup).
- `web/src/pages/SfcCalculatorPage.tsx` (390 LOC): the standalone sellable page. Imports SmartMaterial/Tool/MachineSelector, ParameterPanel, ResultsDisplay, CompatibilityValidator, ComparisonView, PresetManager, AdvancedCharts. Uses `calc.ts` thin surface.
- The rich studio `CalculatorPage.tsx` (~12909 LOC) already uses the full `speedfeed.ts` API (sfOrchestrate/sfResolveMachine/sfInventoryToolSelect/sfToolRoiAnalysis) — reference for how to wire the standalone page.

**Next units (exact, dependency-ordered):**
1. **U-SFC-L3** (Taylor fix, P1, ~1d): route tool-life curve + currentLife through the backend `/sfc/tool-life` route (canonical CANONICAL_TAYLOR) instead of inlined TAYLOR; remove the `TAYLOR` Record + `Math.pow(C/v,1/n)` from AdvancedCharts.tsx. CHECK FIRST: read `mcp-server/src/routes/sfc.ts` `/tool-life` response shape + `web/src/types/sfc.ts SfcCalculateResult` — does `result` already carry tool_life curve/scalar? If `/tool-life` returns a scalar only, a curve endpoint is needed (oscar lane) — coordinate. Keep an offline fallback (resilientFetch) but NOT via inlined constants.
2. **U-SFC-L1** (API exposure, P1, ~2d): extend `calc.ts` (or reuse `speedfeed.ts`) so the standalone page reaches 9-axis (`sfc_nine_axis_run`), stochastic, vendor tri-compare (`speed_feed_tri_compare`), calibration (`speed_feed_calibration_persist`). Route ALL through `src/lib/resilientFetch.ts` (NOT raw fetch — calc.ts currently uses raw `fetch`, a silent-zero risk; migrate it).
3. **U-SFC-L2** (~3-4d): add SLD/chatter chart + vendor-parity compare panel + calibration panel to the standalone page (components exist in CalculatorPage studio — port, don't rebuild).

**Lane reality:** slot/quebec worktree is 4,121 commits BEHIND cad-fusion-live-ms0 (stale — do NOT build there). Current SFC code is on cad-fusion-live-ms0 in H:/prism. Fleet norm this phase = commit to cad-fusion-live-ms0 with `[MAIN-FORCE]` (oscar/echo/bravo all do). Per-file 2-agent scrutiny + real reference-value tests required (R15).

Plan context: [[reference_product_launch_plan_2026_06_20]] · oscar's [[reference_oscar_sfc_validation_honest_2026_06_19]] (SFC vs G-Wizard/HSMAdvisor).
