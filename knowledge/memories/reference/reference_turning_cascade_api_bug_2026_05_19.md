---
name: reference-turning-cascade-api-bug-2026-05-19
description: Latent bug surfaced by U-BRIDGE-WIRE-TURNING — TurningStochasticPlanEngine/TurningSensitivityAnalysisEngine call non-existent TurningInsertLifeEngine methods
aliases: reference_turning_cascade_api_bug_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.980Z
---


2026-05-19 bravo, U-BRIDGE-WIRE-TURNING (wired 6 unwired Turning engines to `prism_turning`).

**Bug:** `TurningStochasticPlanEngine.evaluateCascadeSample` calls
`turningInsertLifeEngine.insertChangeSchedule(...)` and `.wearAccumulation(...)`
— methods that **do not exist**. `TurningInsertLifeEngine` exposes only
`predictLife`, `selectGrade`, `validateChipbreaker`. The MS1+MS2 cascade
therefore always throws → `evaluateCascadeSample` returns `null` →
`TurningStochasticPlanEngine` reports `trials_feasible: 0` and
`TurningSensitivityAnalysisEngine` (which delegates to it) returns
`{ error: "baseline plan infeasible", cpk_baseline: null }` for ALL inputs.

**Why it was invisible:** both engines had 0 dispatcher refs (unwired) — the
broken cascade was never exercised. Wiring them surfaced the rot. Classic
unwired-engine API drift: `TurningInsertLifeEngine` was almost certainly
refactored and these MC wrappers were never updated.

**What shipped:** all 6 wires are mechanically correct (action enum + Zod
schema + dispatcher case + round-trip test). 4 engines work end-to-end
(envelope-distance + 3 thread engines). 2 (stochastic-plan, sensitivity)
route correctly but return degraded output. The wiring test pins the degraded
state with explicit `KNOWN ENGINE BUG` cases so a future cascade fix
fails-loud.

**Follow-up:** `U-FIX-TURNING-CASCADE-API` — rewrite `evaluateCascadeSample`
to use `predictLife` (per-op tool-life → parts-per-edge scheduling + wear
integration). This is physics-bearing — needs the safety-physics reviewer,
NOT an inline /loop fix.

**Lesson:** wiring an orphan engine is the act that reveals whether its
internal API is still valid. Always round-trip-test the wire; a passing
schema gate does not prove the engine still works.
