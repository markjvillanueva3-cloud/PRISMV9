---
name: reference_oscar_sfc_two_engine_divergence_2026_06_21
description: "CRITICAL (slot:oscar, 2026-06-21): the SFC has TWO parallel physics engines. The WEB UI consumes SpeedFeedOrchestratorEngine.compute() (via prism_calc:sf_orchestrate), NOT UltimateSpeedFeedEngine.calculate() (prism_calc:ultimate_speed_feed) which all SFC-WIRING-MS0 work targets. So engine-level SFC improvements do NOT reach the production web UI without convergence/port/repoint. Ultimate-destination-check finding."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.713Z
aliases: reference_oscar_sfc_two_engine_divergence_2026_06_21
---


**CRITICAL SFC ARCHITECTURE FINDING (slot:oscar, 2026-06-21, traced during frontend phase-1).**

The Speed-Feed Calculator has **TWO parallel physics engines**, and the production web UI uses the one that SFC-WIRING-MS0 work does NOT target:

## The two engines + their dispatcher actions
- `UltimateSpeedFeedEngine.calculate()` <- `prism_calc:ultimate_speed_feed` (calcDispatcher.ts:5362). **This is what ALL SFC-WIRING-MS0 work targets** (my 6 session-2 units + gap #6 etc.). Result shape: `forces.*`, `uncertainty.tool_life.{ci_95_low,ci_95_high,cv_pct}`, `ball_end_effective`, `surface_integrity`, `thermal.interface_temp_C`. Also consumed by `shopDispatcher.ts:1405`.
- `SpeedFeedOrchestratorEngine.compute()` <- `prism_calc:sf_orchestrate` (+ sf_quick/sf_resolve_*) (calcDispatcher.ts:6796). **This is what the WEB UI consumes.** Result shape `OrchestratorResult` (SpeedFeedOrchestratorEngine.ts:250): `force_ci95`, `life_ci95`, `weibull`, `sobol_contributions`, `stability_assessment`, `limiting_factors`, `safety_checks`, `playbook_warnings`, `alternatives`.

## Production frontend data-flow (traced definitively)
Web UI (`web/src/pages/SpeedFeedPage.tsx`, route /speed-feed) -> `useSpeedFeedOrchestrate` -> `speedFeedApi.orchestrate()` -> `POST /api/v1/speed-feed/orchestrate` -> `routes/speedfeed.ts:14` `callTool("prism_calc","sf_orchestrate",...)` -> `speedFeedOrchestratorEngine.compute()`.
(`/api/v1/speed-feed` is mounted by `createSpeedFeedRouter` at `routes/index.ts:147`.)

## The divergence
`SpeedFeedOrchestratorEngine.compute()` has **ZERO references** to UltimateSpeedFeedEngine (grep: only the stale doc-comment at SpeedFeedOrchestratorEngine.ts:13 "uses UltimateSpeedFeedEngine (core speed/feed physics)" -- NOT true in code; compute() is self-contained physics). So **engine-level UltimateSpeedFeedEngine improvements (ball_end_effective, surface_integrity, FOSM tool_life uncertainty, the kc-effectiveIso force routing) do NOT reach the production web UI.** (CONSTANTS-level changes in `physics/constants.ts` -- CANONICAL_COOLANT_TEMP_FACTOR, CANONICAL_TAYLOR_LIFE_CV, CANONICAL_KIENZLE -- MIGHT partially reach SpeedFeedOrchestratorEngine IF it imports+uses them; needs per-constant verification.)

## The operator decision (R7 -- surface, don't average)
To deliver SFC-WIRING-MS0 improvements to the WEB UI, ONE of:
- **(A) Converge**: make `SpeedFeedOrchestratorEngine.compute()` delegate to `UltimateSpeedFeedEngine.calculate()` (single physics source -- the correct long-term fix; major refactor, re-baselines the OrchestratorResult shape mapping).
- **(B) Port**: clone the 6 units' logic into SpeedFeedOrchestratorEngine.compute() (duplicate physics -- violates dedup; fast but drift-prone).
- **(C) Repoint**: change the frontend `sf_orchestrate` route to a path that wraps UltimateSpeedFeedEngine + maps to OrchestratorResult.
- **(D) Verify first**: is SpeedFeedOrchestratorEngine the INTENDED canonical UI engine, or legacy? Which engine is the product's source of truth? This determines (A)/(B)/(C). Coordinate quebec (frontend-app) + the orchestrator owner.

## Why this matters
This is the CLAUDE.md "ultimate destination check" (generating != delivering; building != wiring). The ENTIRE SFC-WIRING-MS0 milestone targets UltimateSpeedFeedEngine; if the product UI is permanently on SpeedFeedOrchestratorEngine, that milestone's improvements never reach the user without convergence. NO frontend edits were made -- the trace prevented wiring UI display for data the frontend's engine doesn't produce. Builds on [[reference_oscar_sfc_wiring_session2_2026_06_20]].
