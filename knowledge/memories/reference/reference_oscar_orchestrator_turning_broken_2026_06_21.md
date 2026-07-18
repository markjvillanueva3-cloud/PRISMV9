---
name: reference_oscar_orchestrator_turning_broken_2026_06_21
description: "MAJOR FINDING (slot:oscar 2026-06-21): SpeedFeedOrchestratorEngine (the PRODUCTION SFC web-UI engine via prism_calc:sf_orchestrate) does NOT properly support TURNING -- JM Die's PRIMARY domain (35K lathe programs). Its core-physics step (L2573+) is milling-centric: rpm/Vc computed from tool_diameter (L2574/2667) NOT workpiece_diameter (which the dispatcher passes through, L8651, but the engine ignores). Live: turning Vc=1.8 m/min (garbage) vs UltimateSpeedFeedEngine's correct 185. Strong reinforcement of the convergence -- the engine handles turning; the orchestrator doesn't."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.692Z
aliases: reference_oscar_orchestrator_turning_broken_2026_06_21
---


**SpeedFeedOrchestratorEngine does NOT properly support TURNING (slot:oscar, 2026-06-21).** Found while extending the convergence-diff harness to turning. Builds on [[reference_oscar_sfc_engine_divergence_magnitude_2026_06_21]].

## What is VERIFIED (R12)
1. `SpeedFeedOrchestratorEngine.ts:2574` -- the "Core Speed/Feed Physics" step starts `const D = tool.diameter_mm.value; const z = tool.flutes.value;` and uses that `D` for the rpm/Vc relationship (`L2667 rpm = 1000*Vc/(PI*D)`). There is NO operation branch to use `workpiece_diameter_mm` for turning. For turning, Vc is set by the WORKPIECE OD, not the tool -- so the rpm/Vc is physically wrong.
2. The dispatcher `calcDispatcher.ts:8651` DOES pass `workpiece_diameter_mm` through to the orchestrator as a distinct field -- but the core-physics step IGNORES it (reads it only for output/display at L1820/1858, not for the rpm calc).
3. LIVE PROBE (both engines, same turning input -- steel P OD turning rough, workpiece 50mm): ORCHESTRATOR Vc=1.8 m/min (garbage -- = PI*0.8mm-tool*723rpm/1000, i.e. it used the 0.8mm tool nose for the surface-speed calc); UltimateSpeedFeedEngine Vc=185 m/min (correct -- matches its P_turning_roughing table [120,185,245], rpm self-consistent with the 50mm workpiece). Stainless: orch 1.9 vs engine 145 (correct).

## What is INFERRED (reasonably, not exhaustively traced)
The whole core-physics step (L2573+) is MILLING-CENTRIC -- `D=tool dia`, `z=flutes`, per-tooth `fz`, radial engagement -- none of which model single-point turning (feed/rev, workpiece-OD Vc, no flutes). So turning is likely wrong across MULTIPLE metrics (rpm, chip load, MRR), not just the diameter. The Vc-table lookup may still produce a plausible material Vc (via the od_roughing/od_finishing proven-op mapping L2463), but the rpm/feed/MRR built on top use milling geometry.

## Why this is NOT a one-line orchestrator patch
You cannot fix this by swapping the diameter at L2574 -- the entire step assumes milling. Properly supporting turning in the orchestrator would mean a parallel turning-physics path. The RIGHT fix is the operator-approved CONVERGENCE: delegate core physics to UltimateSpeedFeedEngine, which ALREADY handles turning correctly (dedicated *_turning_roughing/_finishing tables, workpiece-diameter Vc, feed_per_rev output). So this finding is a STRONG reinforcement of converge-onto-engine: it is not just "better numbers", it is "the production engine is broken for the primary domain and the engine fixes it".

## Severity / operator flag -- HIGH, but the full production data-flow is NOT fully traced (R12-CORRECTED 2026-06-21 by fact-checker)
**VERIFIED (solid):** `SpeedFeedOrchestratorEngine.compute()` computes turning rpm/Vc from the TOOL diameter -- `:2574 const D = tool.diameter_mm.value`, `:2667 rpm = 1000*Vc/(PI*D)`, with NO branch using `workpiece_diameter_mm` (the field is never referenced in the file). The engine `UltimateSpeedFeedEngine` is correct -- explicit turning rpm branch `:2246-2248 else if (isTurning && input.workpiece_diameter_mm) { rpm = Vc*1000/(PI*workpiece_diameter_mm) }` + dedicated `*_turning_*` tables (~L770). LIVE probe (input WITH workpiece_diameter_mm=50): orchestrator Vc=1.8 vs engine Vc=185. So the bug DOES manifest whenever a workpiece_diameter reaches the orchestrator.
**CORRECTED / NOT established (my earlier "CONFIRMED LIVE end-to-end" was OVERSTATED):**
- `calcDispatcher.ts:8651` (`workpiece_diameter_mm: ...`) is in the `turning_force` action (TurningForceEngine), NOT the `sf_orchestrate` path. The orchestrator is dispatched at `calcDispatcher.ts:6795-6797` as a RAW `params` pass-through (`speedFeedOrchestratorEngine.compute(params)`), so workpiece_diameter_mm reaches it only if the caller put it in `params`.
- `web/src/utils/calculatorSpeedFeedContract.ts:781` DERIVES `workpiece_diameter_mm` from STOCK geometry (`Math.max(stockY, stockZ)`) in `deriveWorkpieceGeometry`, NOT directly from the `SpeedFeedPage.tsx:621` "Part dia mm" field. The UI field and the contract value are two separate same-named paths -- I did NOT trace whether the UI "Part dia mm" value (or the stock-derived one) actually reaches the orchestrator call unchanged.
So: the orchestrator turning-Vc bug is REAL + reproduced.

### PRODUCTION DATA-FLOW NOW TRACED (2026-06-21, completes the fact-checker's open item) -> bug is LIVE
The full CalculatorPage lathe path DOES deliver a sensible workpiece_diameter to the orchestrator, which then ignores it:
- `web/src/utils/calculatorSpeedFeedContract.ts:776-783` `deriveWorkpieceGeometry`: for `machineMode==='lathe'`, `workpiece_diameter_mm = Math.max(stockYm, stockZm)` (the round-bar stock diameter -- a correct turning diameter).
- `:904` `...deriveWorkpieceGeometry(input)` is SPREAD into the `SpeedFeedParams` return -> workpiece_diameter_mm is in the request.
- `web/src/api/speedfeed.ts:219` `sfRequest('/orchestrate', params)` sends it to the orchestrate endpoint.
- calcDispatcher dispatches `sf_orchestrate` as a raw `params` pass-through to `speedFeedOrchestratorEngine.compute(params)` (`calcDispatcher.ts:6795-6797`).
- compute() IGNORES `workpiece_diameter_mm`, uses `tool.diameter_mm` (`:2574`/`:2667`).
CONCLUSION: a real user doing a CalculatorPage LATHE turning calc WITH stock dimensions set sends a correct workpiece_diameter that the orchestrator discards -> wrong turning Vc. The bug is LIVE (the SpeedFeedPage 882L page also has a direct `workpiece_diameter_mm` "Part dia mm" field -> same outcome). My earlier "confirmed live" CONCLUSION was correct; my earlier CITATIONS were wrong (8651 is turning_force; 781 is stock-derived not the direct field) -- the fact-checker caught the citations, this trace fixes them AND confirms the live severity. CORRECT citations: contract `:904`+`:781`, api `:219`, dispatcher `:6795`, orchestrator-ignores `:2574`.

### LIVE-BRIDGE PRODUCTION PROOF + FIX SHIPPED (2026-06-21)
POSTed a real steel/50mm OD-turning request to the RUNNING `http://127.0.0.1:3100/api/v1/speed-feed/orchestrate` (the production web path): returned `value.cutting_speed_mpm = 2.7` m/min (garbage) -- the live production bridge serves the turning bug RIGHT NOW. (The route is wired + safety-gated: an incomplete payload is blocked by pre-machine-completeness-gate; a complete one computes.)
**FIX SHIPPED** (U-SFC-ORCH-TURNING-FIX + -OPTIMIZEFN, committed): orchestrator rpm/Vc now uses workpiece_diameter for lathe ops at ALL rpm sites (0 `Math.PI*D` left). In-process: Vc 1.8->54.2 (steel/50mm); physics+safety PASS S(x)=1.00; 5/5 R9 tests; milling unchanged.
**DEPLOY GAP (R12):** the fix is in source + rebuilt dist, but the RUNNING :3100 bridge loaded the PRE-FIX dist at startup -> it still serves Vc 2.7. To deploy, the :3100 MCP bridge must be RESTARTED (a shared-service op -- flagged to operator, NOT done unilaterally since peer chats use :3100). Until the bridge restarts, the live app still shows the garbage turning Vc despite the committed fix.
FIX = the operator-approved convergence (delegate to UltimateSpeedFeedEngine, which handles turning); a standalone orchestrator patch is not viable (the whole core-physics step is milling-shaped). Mandatory physics+safety review on the Vc/rpm change.
(Also corrected: the orchestrator proven-BLEND is at `:2644-2663`, not 2164-2191 -- 2164-2191 is the `queryProvenParameters` helper; the proven-store-empty finding is unaffected.)
