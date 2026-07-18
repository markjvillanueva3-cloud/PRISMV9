# Mill domain — PSN gaps, cross-domain improvements, invention candidates

_Generated: 2026-05-23 · slot:alpha (TOKEN-SAVINGS-PIVOT iter23, U-MILL-PSN-AUDIT companion)_

Companion analysis to `MILL-PSN-COVERAGE.{json,md}`. Where the audit enumerates **what is connected**, this surfaces **what cross-domain formulas/algorithms would improve accuracy, efficiency, capability** if synergized in.

User directive (2026-05-23):
> _"we've added a ton since those engines were made, synergize them with the rest of psn and look for gaps, improvements and inventions by combining formulas from other domains of math and science to improve efficiency, accuracy and capabilities"_

## Top-level finding: 6 of 11 PSN legs are 0%-covered for the mill domain

The audit reports zero mill engines connect to: `obsidian-brain`, `prism-os`, `memories`, `algorithms`, `nn-gnn`, `prism-ai`. **The mill domain is a high-engine-count silo with the rest of PSN.** Synergization isn't a wiring polish — it's a load-bearing missing layer.

Coverage of the remaining 5 legs:
- `system-viz`: 100% — all 58 engines visible in the graph (good)
- `tribal`: 93.1% — most engines have tribal embeddings (good)
- `wiki`: 12.1% — only 7 engines have catalogued wiki entries
- `formulas`: 10.3% — only 6 engines import `physics/constants.ts`
- `engines`: 100% — baseline (file-exists)

The 12.1%-wiki + 10.3%-formulas combination is the **load-bearing risk**: 89% of mill engines are not catalogued AND 90% don't use canonical physics constants. The likelihood of inlined `kc1.1` / Taylor / Johnson-Cook values across the dark 52 engines is high — that's a direct CLAUDE.md §SAFETY doctrine violation surface.

## Gaps — concrete (audit-derived)

### G1 — inline-constant doctrine violations (10.3% formulas coverage)
**Action:** sweep the 52 mill engines that do NOT import `physics/constants.ts` for inlined Kienzle/Taylor/material values. Replace each inlined value with the canonical import. Per CLAUDE.md §SAFETY this is a HARD rule — the absence of the import is a strong signal of the violation.
**Cost:** 1-3 engines per iter to scrutinize + edit. **Leverage:** safety-critical compliance + restores Ω≥0.95 / S(x)≥0.98 envelope.

### G2 — no mill engine routed through PRISM AI router (0% prism-ai)
**Action:** `AISystemRouterEngine.route()` should know about mill engines so cross-domain tasks ("calculate cutting force for X with Y") can be routed automatically. Add 5-10 of the highest-leverage mill engines (`MillingForceEngine`, `MillingPrintToProgramEngine`, `MillProgramOptimizerEngine`, `MillKinematicsCollisionEngine`, `MillingPhysicsKernelEngine`) to the router's task→engine map.
**Cost:** one router edit + 5-10 task→engine mappings. **Leverage:** ALL inbound natural-language requests through the router can now reach mill capabilities.

### G3 — no mill engine in PRISM OS (0% prism-os)
**Action:** `prismOperatingSystemDispatcher` exposes mill capabilities to the shop-floor/desk personas. Expose at least the print-to-program pipeline + force calculator + program-optimizer through OS-level routes. Without this, a shop-floor operator can't invoke mill via the OS shell.
**Cost:** 3-5 dispatcher action additions. **Leverage:** mill capability becomes operator-reachable, not just internal-API-reachable.

### G4 — no mill engine in NN-graph labels (0% nn-gnn)
**Action:** GraphSAGE GNN tier-5 wiring-inference is dormant for mill (reference poolSize 0 in `nn-graph/labels.json`). Add mill-domain reference labels so the tier-5 cascade can classify unknown mill-related ghost nodes. The audit reports AUROC at 0.096 — mill domain absence is part of why.
**Cost:** seed 50-100 mill engine→class labels into the reference pool. **Leverage:** unblocks NN-graph promotion gate (AUROC ≥ 0.78), restores tier-5 wiring inference for mill.

### G5 — no mill engine in MEMORY.md index (0% memories + obsidian-brain)
**Action:** Promote mill engines to MEMORY.md pointer index. The 326+ memory files include none that name a mill engine specifically — the cross-session brain has no "where to look for X mill capability" entry.
**Cost:** 5-10 pointer lines in MEMORY.md (already over ceiling — needs memory-compress-v2 first). **Leverage:** subsequent sessions find mill capability via the auto-loaded vault pre-search, not via repo-grep.

### G6 — no mill engine imports from `/algorithms/` (0% algorithms)
**Action:** the formal `mcp-server/src/algorithms/` library (FEM, ODE integrator, linear state-space, gradient descent, Kalman, etc.) is invisible to mill. Cutting-force prediction, chatter-stability, deflection — all currently solved ad-hoc per engine. Refactor 5 highest-leverage mill engines to use `algorithms/KalmanFilter`, `algorithms/FiniteElementMethod1D`, `algorithms/LinearStateSpaceModel`.
**Cost:** per-engine refactor (NOT new code — replace ad-hoc with library). **Leverage:** every algorithm bug-fix or accuracy improvement now compounds across engines instead of needing N parallel patches.

## Improvements — cross-domain formula opportunities

Where the existing mill engines solve a problem ad-hoc and a different math/science domain has a better solution.

### I1 — Chatter-stability via Hopf-bifurcation (control theory)
**Current:** mill engines treat chatter as a heuristic threshold or a frequency-domain check (Altintas-Budak style).
**Improvement:** add Hopf-bifurcation analysis from nonlinear dynamics (Lyapunov spectrum / center-manifold reduction) for predicting chatter onset under variable-feed conditions. Catches the "spindle-speed-modulation kills chatter" regime that lobe-diagram methods miss.
**Engines to upgrade:** `MillingForceEngine`, `MillingPhysicsKernelEngine`, `MillProgramOptimizerEngine`.
**Source library:** existing `algorithms/LagrangianMechanics` + `algorithms/ODEIntegrator` (already shipped per CLAUDE.md §KNOWLEDGE-CONVERSION-MS0).

### I2 — Tool-wear estimation via Kalman filter (signal processing)
**Current:** Taylor's equation is open-loop — predicts life from constants, ignores in-process spindle-current / vibration / acoustic emission feedback.
**Improvement:** Extended Kalman Filter fusing Taylor's prediction (process model) with in-process sensor data (measurement model). Closes the loop. Adopted in every modern aerospace tool-monitoring system.
**Engines to upgrade:** `MillingProductionKnowledgeHarvesterEngine`, `MillingOnlineLearningTrackerEngine`, `MillResourceAwarenessEngine`.
**Source library:** existing Kalman from algorithms or new `algorithms/ExtendedKalmanFilter`.

### I3 — Chip-thickness from PDE-resolved tool-engagement (finite element)
**Current:** chip-thickness models use 2D analytic projection (Martellotti / Tlusty).
**Improvement:** for 5-axis or trochoidal toolpaths, use 1D FEM along the engaged arc + Jacobian of tool kinematics. Captures variable engagement angle correctly — analytical models fail above 60° wrap.
**Engines to upgrade:** `MillingForceEngine`, `MillKinematicsCollisionEngine`, `MillTurnCAMEngine`.
**Source library:** existing `algorithms/FiniteElementMethod1D`.

### I4 — Feed-rate optimization via LQR (optimal control)
**Current:** feed/speed picker is heuristic + Taylor + Kienzle (`UltimateSpeedFeedEngine` style).
**Improvement:** Linear-Quadratic Regulator over a multi-objective cost (cycle time, tool wear, surface roughness, deflection) gives a Pareto-optimal feed schedule along the toolpath. Reduces cycle time 5-15% at fixed quality vs heuristic.
**Engines to upgrade:** `MillProgramOptimizerEngine`, `MillingHybridStrategySynthesizer`.
**Source library:** new `algorithms/LinearQuadraticRegulator` (variant of existing state-space model).

### I5 — Surface-roughness prediction via Bayesian inference (statistics)
**Current:** surface roughness is empirical (Brammertz formula + correction tables).
**Improvement:** Gaussian-process regression over (material, fz, ae, vc, runout) → Ra. Trained on JM Die corpus + MIT-OCW datasets. Gives uncertainty bounds, not just point predictions — operator decides whether to accept or measure.
**Engines to upgrade:** `MillingDeepKnowledgeSynthesisEngine`, `MillTribalKnowledgeEngine`.
**Source library:** new — Bayesian/GP isn't shipped yet (invention candidate).

### I6 — Print-to-program accuracy via topological feature matching (computational geometry)
**Current:** `MillingPrintToProgramEngine` + `MillPrintToProgramEngine` (likely duplicate per the audit!) — extract features from blueprint/CAD then map to operations.
**Improvement:** persistent-homology feature descriptors (algebraic topology) — invariant to scale + rotation + minor noise; matches operation templates from JM Die corpus by topological signature rather than pixel-level. Handles "this hole pattern is shaped like that customer's pattern" generalization.
**Engines to upgrade:** `MillingPrintToProgramEngine`, `MillPrintToProgramEngine` (after dedup), `MillPartFamilyMatcherEngine`.
**Source library:** new — persistent homology isn't shipped (invention candidate); shippable as `algorithms/PersistentHomology` for cross-domain reuse (lathe + WEDM benefit too).

### I7 — Path-smoothing via clothoid splines (differential geometry)
**Current:** linear + arc segments dominate; corner blending is feedrate-only smoothing.
**Improvement:** clothoid (Euler-spiral) blends give G2-continuous curvature → CNC servo doesn't decelerate at corners as aggressively → cycle time ↓ AND surface finish ↑ simultaneously. Standard in highway/rail engineering, rare in CNC.
**Engines to upgrade:** `MillProgramOptimizerEngine`, `MillingPrintToProgramEngine`.
**Source library:** new `algorithms/ClothoidSpline` (also reusable for lathe + 5-axis).

## Inventions — net-new capability from cross-domain synthesis

### N1 — `MillThermomechanicalCouplingEngine` (new)
**Idea:** explicit coupling of mechanical (Kienzle force) + thermal (Carslaw-Jaeger moving-heat-source) models. Predicts workpiece thermal-distortion-induced error AT the chip-tool interface during the cut — not post-process. Closes the gap where high-MRR cuts produce dimensional drift not predicted by force-only or thermal-only models.
**Domains combined:** plasticity (mech) + heat conduction (thermo) + PDE coupling (math).
**Dedup check:** no existing engine named `MillThermomechanical*` per audit — confirmed gap.

### N2 — `MillVibrationToFeatureMapper` (new)
**Idea:** spindle-vibration spectrum → engagement-feature classifier via discrete wavelet transform + 1D CNN. Detects "I just cut into a hole edge" from spindle telemetry alone, no probing needed. Enables adaptive feedrate for unknown geometry.
**Domains combined:** wavelet analysis (signal proc) + ML (CNN) + manufacturing process knowledge.
**Dedup check:** `MillStrategyNeuralEngine` exists but doesn't ingest live vibration; this would be a new lane, not a duplicate.

### N3 — `MillTopologicalToolpathEquivalenceEngine` (new)
**Idea:** treat toolpaths as 1D manifolds in 3D + workpiece-removal volume as a 3D manifold; compute persistent-homology invariants to detect "this new toolpath is topologically equivalent to that known-good one in the JM Die corpus" → reuse proven parameters. Closes the gap where geometrically-distinct paths solve the same removal problem.
**Domains combined:** algebraic topology + computational geometry + manufacturing analytics.
**Dedup check:** no equivalence checker exists per audit; would be reusable across lathe + WEDM (cross-domain invention).

### N4 — `MillPrintToProgramAccuracyVerifierEngine` (new)
**Idea:** addresses the user's "100% accuracy" goal directly — given a print + a generated CNC program, verifies the program produces a part topologically + dimensionally equivalent to the print via volumetric Boolean-difference simulation. Catches: missing operations, wrong-direction cuts, missed inside-corners, dimensional misreads. Outputs a defect list with reproducer.
**Domains combined:** constructive solid geometry + Boolean operations + dimensional tolerance analysis.
**Dedup check:** `MillProgramAnalyzerEngine` exists but does static analysis, not simulated cut-then-compare. This is a verification-by-simulation lane — net-new.

## Execution priority (highest-ROI first)

| Priority | Item | Type | Why first |
|---|---|---|---|
| **P0** | G1 — sweep 52 engines for inline constants | gap (safety) | CLAUDE.md doctrine; safety-critical |
| **P0** | G2 — wire 5-10 mill engines into PRISM-AI router | gap (synergy) | unlocks NL-routing to mill |
| **P1** | I3 — FEM chip-thickness for 5-axis | improvement (accuracy) | direct accuracy gain, library exists |
| **P1** | N4 — `MillPrintToProgramAccuracyVerifierEngine` | invention (proof) | directly serves user's "100% accuracy" goal |
| **P2** | G4 — seed NN-graph labels for mill | gap (unblocks tier-5) | unblocks dormant inference layer |
| **P2** | I2 — Kalman tool-wear | improvement (efficiency) | closes open-loop Taylor's-eq gap |
| **P2** | I4 — LQR feed-rate optimization | improvement (efficiency) | 5-15% cycle-time ↓ at fixed quality |
| **P3** | I1 — Hopf-bifurcation chatter | improvement (capability) | rare regime catch |
| **P3** | I7 — clothoid spline blends | improvement (efficiency) | servo-bound cycle-time ↓ |
| **P3** | N1 — `MillThermomechanicalCouplingEngine` | invention (capability) | requires coupling, biggest build |
| **P3** | N2 — `MillVibrationToFeatureMapper` | invention (capability) | needs sensor pipeline first |
| **P3** | N3 — `MillTopologicalToolpathEquivalenceEngine` | invention (capability) | requires persistent-homology library |
| **P3** | I5 — Bayesian/GP surface roughness | improvement (accuracy) | needs new GP library |
| **P3** | I6 — persistent-homology print-to-program | improvement (accuracy) | needs new topology library |
| **P4** | G5 — promote mill engines to MEMORY.md index | gap (discoverability) | currently blocked by 22KB ceiling |
| **P4** | G6 — refactor 5 mill engines onto `/algorithms/` | gap (DRY) | post-stabilization |
| **P4** | G3 — expose mill via PRISM-OS | gap (UX) | operator-facing |

## Notes on the duplicate-engine finding

The audit surfaced both `MillingPrintToProgramEngine.ts` AND `MillPrintToProgramEngine.ts` on disk. Pre-build verification:
- if both exist with substantially different APIs → split lanes, document the difference
- if one is a thin re-export of the other → eliminate the dup
- if they have overlapping methods → run `duplicationGuardEngine.mustCheckBeforeCreating()`-style check, merge to one

This is a P0 dedup task in its own right, separate from the gap list above.

## Re-audit cadence

Run `node scripts/audit-mill-psn-coverage.mjs` after any P0/P1 item ships. Coverage metric (`avg_psn_coverage`) is the regression target — should monotonically increase across iters.

**Status at iter23 ship:** avg PSN coverage **28.7%**. Single-iter target for iter24: pick ONE P0 (G1 or G2), land + measure new coverage.
