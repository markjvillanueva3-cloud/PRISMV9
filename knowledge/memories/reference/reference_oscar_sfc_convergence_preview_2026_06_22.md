---
name: reference_oscar_sfc_convergence_preview_2026_06_22
description: "BUILT (slot:oscar 2026-06-22, 3dbdad0462): prism_calc:sfc_convergence_preview -- READ-ONLY action that runs SpeedFeedOrchestratorEngine.compute() vs UltimateSpeedFeedEngine.calculate(orchestratorToUltimateInput()) for one SFC input and returns {production, converged, delta, recommendation, safety_flags, readonly_mode:true}. NEVER mutates PRISM_SFC_CONVERGE. De-risks the operator convergence-enable decision by surfacing the per-input impact in-product. SFCConvergencePreviewEngine.ts + 25-test file + calcDispatcher wiring. R9 LESSON: an agent guessed the engine result-shape field names; flat mocks MASKED the wrong-field bug -- mock the REAL result contract, not a convenient flat shape."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.699Z
aliases: reference_oscar_sfc_convergence_preview_2026_06_22
---


**prism_calc:sfc_convergence_preview shipped (slot:oscar 2026-06-22, `3dbdad0462`).** The R15 WIRE step for the convergence work [[reference_oscar_sfc_converge_flagged_built_2026_06_22]] -- exposes the convergence impact via MCP so the operator can review per-input BEFORE flipping `PRISM_SFC_CONVERGE=1`.

## What it does
`SFCConvergencePreviewEngine.previewWith(rawInput, orchestrator, ultimate)` (dispatcher lazy-imports both real singletons):
- **production** snapshot = `orchestrator.compute(input).value` (the orchestrator's own physics, current prod path).
- **converged** snapshot = `ultimate.calculate(orchestratorToUltimateInput(input))` (engine-delegated -- what flipping the flag would produce).
- **delta** = per-quantity {abs, pct} for the 8 core quantities (Vc/rpm/feed/Fc/power/torque/life/Ra).
- **safety_flags** = over-speed FIX (prod life < 15min floor, engine >= floor), hotter-runs-review (engine < floor & < prod), power>200% + force>150% jumps.
- **recommendation** = human-readable per-case note.
- **readonly_mode: true** -- the SAFETY CONTRACT: process.env is NEVER read or mutated; production is unchanged.

Wired: `calcDispatcher.ts` enum (~L1300) + case (~L10947, lazy-imports SFCConvergencePreviewEngine + speedFeedOrchestratorEngine + ultimateSpeedFeedEngine). Engine self-validates input via its own Zod `SFCConvergencePreviewInputSchema` (strict). 25/25 tests (H1-H2 happy incl real-engine round-trip, F1-F7 failure, A1-A3 adversarial, S1-S4 spanning P/M/K/N, SF1-SF4 safety flags, SC1-SC3 schema). Full project tsc EXIT 0.

## R9/R8 LESSON (generalizable) -- verify a mock against the REAL result contract
The build agent GUESSED the engine result shapes and got two wrong; its own flat mocks MASKED both (green tests, broken reality):
1. `SpeedFeedOrchestratorEngine.compute()` returns `AtomicValue<OrchestratorResult>` (wrapper, `.value` holds the flat result) -- agent read flat fields straight off the wrapper. (`SpeedFeedOrchestratorEngine.ts:2528`.)
2. `UltimateSpeedFeedResult` core params are TOP-LEVEL `OptimizedValue` fields `cutting_speed`/`spindle_rpm`/`feed_per_tooth`/`feed_rate` (read via `.value`) -- agent invented flat `vc_m_min`/`fz_mm` that do not exist. (`UltimateSpeedFeedEngine.ts:276-285`.)
The mock factories returned the SAME wrong shapes, so all mock-based tests passed while the real-engine path silently yielded vc=0. Only the H2 real-singleton round-trip would have caught it. **Rule:** when a subagent builds against an engine result type, READ the real interface + the actual return signature (`compute()` return wrapper too) and mock the REAL contract; a flat convenience-mock that mirrors the engine's wrong read is a false-green (R9: tests verify intent; R8: read before write). Fix = unwrap `.value` + real OptimizedValue field names in BOTH engine snapshot fns AND the test mocks.

## Remaining SFC product work (gated -- NOT autonomously buildable)
- **Surface the preview on the web SFC page** (show "enabling convergence: Vc X->Y" via this action) -- web = quebec domain + visual-verify gated (web/CLAUDE.md Playwright cannot run headless here).
- **Enable convergence** -- operator sets `PRISM_SFC_CONVERGE=1` after reviewing `state/shared/SFC-CONVERGENCE-DIFF.md` + physics-review; needs MCP rebuild+restart.
- **Mobile shells** (Electron/iOS/Android) -- quebec whole-app infra, gated on web SFC proving 100%.
