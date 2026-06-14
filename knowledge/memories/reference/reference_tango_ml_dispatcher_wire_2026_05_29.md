---
name: reference-tango-ml-dispatcher-wire-2026-05-29
description: tango wired 5 built-but-unwired ML Algorithm classes into prism_algorithm ml_* group
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.969Z
aliases: reference_tango_ml_dispatcher_wire_2026_05_29
---


Commit `8c750a2aca` (slot:tango, 2026-05-29, U-ALGO-ML-WIRE) — algorithm-gen /goal iteration 2, the highest-ROI coverage win (no new algorithm code).

**Gap found (discovery):** `prism_algorithm`'s `ml_*` group had only 2 RL actions (ml_policy_gradient, ml_rl_optimize), but 5 `Algorithm<I,O>` ML classes existed on disk UNREACHABLE via any dispatcher: NeuralInference, RegressionEngine, DecisionTreeClassifier, ClusteringEngine, EnsemblePredictorModel. (4 more ML algos — DBSCAN, KMedoids, ActivationFunctions, TSNE — use static-method shapes, not Algorithm<I,O>; deferred — they need bespoke param mapping.)

**Wired:** ml_{neural_infer, regression, decision_tree, clustering, ensemble_predict} → ML_ACTIONS enum + 5 uniform lazy-import case blocks. Pattern: `const raw = params.input; if (!raw||typeof raw!=="object") return err(...); const algo = new X(); const input = raw as Parameters<typeof algo.calculate>[0]; const v = algo.validate(input); if (!v.valid) return err(...); return ok(algo.calculate(input));` — no extra type imports, no double-asserts, each class's own validate() gates (R12 err-not-crash).

**Tested:** 9/9 in algorithmDispatcher.synergy.test.ts incl. z.enum(ACTIONS) membership for all 5 (closes the MS1 mock-bypass false-green class) + import/instantiate/contract reachability.

**Reusable pattern** for wiring any `Algorithm<I,O>` class to prism_algorithm. Continuation queue: `state/shared/specs/ALGO-GEN-PRIORITY-PLAN-2026-05-29.md`. Related: [[reference_tango_heterophily_aggregator_2026_05_29]] · [[feedback_tango_orphan_needs_decision]] (this closed 5 algorithm-orphans via WIRE verdict).
