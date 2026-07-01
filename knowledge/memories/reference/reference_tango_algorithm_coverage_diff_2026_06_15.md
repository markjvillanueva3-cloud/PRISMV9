---
name: reference_tango_algorithm_coverage_diff_2026_06_15
description: tango BUILT scripts/algorithm-dispatcher-coverage.mjs (13/13) and REFUTED the work order's "~20 dormant algorithms" with evidence — only 6 genuinely orphaned (+7 wire-exempt +3 barrel-only). Surfaced to romeo. slot tango 2026-06-15.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.217Z
aliases: reference_tango_algorithm_coverage_diff_2026_06_15
---


**TANGO ALGORITHM-COVERAGE-DIFF (slot tango, 2026-06-15, ULTRACODE /loop — tool BUILT+13/13, commit `U-ALGORITHM-COVERAGE-DIFF` PENDING a STALE git lock)** — closes the build I queued in [[reference_tango_algorithm_coverage_gap_2026_06_15]]. Supersedes that memo's "needs build" status.

**COMMITTED `2e86620392`** (2 files, 358 insertions). The commit was briefly BLOCKED: 5 attempts over ~6 min hit `.git/index.lock` frozen at `18:53:40` (a crashed-git-proc STALE-LOCK orphan, NOT active contention -- git procs dropped 8->4 meanwhile). I did NOT force-remove (standing rule + this repo's git-corruption history); waited it out and the lock cleared on an opportunistic retry a few minutes later (sweeper or peers settled). **Lesson: a 6-min frozen index.lock the git-lock-sweeper won't clear (live-git-proc conservatism) is a golf fleet-hygiene gap worth a sweeper-heuristic look -- but the patient wait-and-retry path WORKS; never force-remove.** The mid-build `/checkin` re-fire did NOT lose the build (R10 -- finished the in-progress unit before checkpointing).

**TOOL:** `scripts/algorithm-dispatcher-coverage.mjs` + `.test.mjs` (pure core + thin CLI, mirrors hub-blast-radius-rank.mjs). `listAlgorithmModules` / `walkTsFiles` / `computeReferenced` (IMPORT-CONTEXT regex `(?:from|import)\s*\(?\s*["'][^"']*algorithms/(\w+)` -- a bare comment mention is NOT a wiring, R12 no-overclaim) / `computeBarrelReexports` / `hasWireExemptMarker` / `computeCoverage` (classifies wired|orphaned|wire-exempt|barrel-only). CLI `--src --strict --via <substr> --json`. 13/13 node:test incl. a real-PRISM-tree regression oracle (orphaned never intersects wire-exempt).

**VERIFIED RESULT (live tree, 121 algorithm modules) -- REFUTES "~20 dormant":** 108/121 wired (89%), 13 dormant decompose as:
- **7 WIRE-EXEMPT** (literal `// WIRE-EXEMPT` marker; course-forge closure/expression inputs that can't cross a JSON dispatcher boundary -- INTENTIONAL, NOT romeo's problem): FiniteDifferenceMethod, FiniteElementMethod1D, GradientDescent, LagrangianMechanics, LinearStateSpaceModel, ODEIntegrator, OperatorSplittingMethod.
- **6 ORPHANED** (no import anywhere in src/, no marker -- the ACTIONABLE set for romeo): FuzzyController, InterpolationEngine, KalmanFilter, MonteCarlo, SafeExpressionEvaluator, SimulatedAnnealing. Adversarially verified each has ZERO references anywhere (not even the class identifier). Context: MonteCarlo = 9 AlgorithmRegistry mentions (cataloged-but-not-statically-wired, softer); SafeExpressionEvaluator = the Option-A keystone awaiting `U-COURSE-FORGE-P1-DISPATCHER`; the other 4 are fully invisible.
- **3 barrel-only** (soft-wired via algorithms/index.ts only): ChipThinningCompensation, PowerTorqueCalc, ThermalPartitionModel.

**Also:** `--via "tools/dispatchers/algorithmDispatcher"` -> 25/121 exposed via prism_algorithm (96 not -- most algorithms are consumed by domain engines, NOT the generic algorithm surface; that's by-design, not a gap). **KalmanFilter dup finding:** the gateway exposes a `kalmanFilter()` method but does NOT import `KalmanFilter.ts` -- it reimplements inline, so the standalone module is dead (romeo: wire or retire).

**-> SURFACE TO ROMEO (wiring owner):** the 6-orphan actionable set above. NOT 20. NOT the 7 wire-exempt (documented). The recurring work-order "~20 dormant" was an unverified conflation of wire-exempt + barrel-only + cataloged.

**PROCESS LESSONS (ULTRACODE):** (1) the Workflow I launched STALLED (~25min, host memory pressure -- same as the prior session's stall) on a fundamentally DETERMINISTIC computation; TaskStop'd it (R14) + did it directly (the fanout-gate had warned "mechanical -> script not N agents" -- it was right). (2) a shell `grep` via node fails SILENTLY on Windows (PATH) and returned a false all-121-dormant -- pure-node fs walk is the robust path; R12 caught the fabrication before it shipped. (3) classify dormant before reporting -- 7 of 13 were intentional WIRE-EXEMPT; a naive "13 dormant -> romeo" would have sent the wiring owner chasing documented-exempt course-forge algorithms. Sister: [[reference_tango_algorithm_coverage_gap_2026_06_15]] (the queued-build memo this closes), [[reference_tango_register_algorithm_dispatcher_2026_06_15]].
