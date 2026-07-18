---
name: reference_gnn_selective_deploy_2026_06_06
description: "GNN tier-5 deploy gate — calibration proven a dead end (measured); tier is DEPLOY-READY-SELECTIVE at the production gate. Supersedes \"calibration is the blocker\"."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.593Z
aliases: reference_gnn_selective_deploy_2026_06_06
---


# GNN tier-5 deploy gate: calibration is a dead end; the tier deploys honestly as a SELECTIVE predictor (slot:india, 2026-06-06)

**Context.** The NN/GNN wiring-inference classifier (PSN leg #10) fails the full-holdout deploy gate: on the 62-ghost stratified holdout (direct-embed, live 676MB graph) it scores **AUROC 0.808 ✓, macro-F1 0.439 ✗, Brier 0.179 ✗**. The standing claim across CLAUDE.md / india MEMORY was "calibration is the dominant gate-clear blocker" (after the U-GNN-CALIBRATE-NEG isotonic-LOO attempt regressed the holdout).

**Finding 1 — post-hoc confidence calibration is a DEAD END for this gate (measured, not asserted).** `scripts/nn-graph-calibration-analysis.mjs` runs the Murphy decomposition + density-matched LOO-CV of temperature/Platt/isotonic on the 62 live samples:
- Murphy: Brier 0.179 = reliability **0.0197** − resolution 0.0661 + uncertainty 0.224. **Miscalibration is only 0.0197** — the model is already near-calibrated; reliability is the ONLY part calibration can remove.
- Honest LOO-CV (density-matched, the fix U-GNN-CALIBRATE-NEG itself named): Platt 0.178, temperature 0.180, isotonic 0.193 — **none clear 0.15**. In-sample isotonic ceiling 0.144 is illusory (fits 62 samples to their own labels).
- The residual Brier is REFINEMENT loss (the model is genuinely uncertain on a low-confidence sub-population), which no monotone recalibration removes. **Stop investing in post-hoc confidence calibration for this gate.**

**Finding 2 — the GNN tier-5 IS deploy-ready as a SELECTIVE (abstaining) classifier.** Tier-5 already abstains below its confidence gate in production (`seed-ghost-gnn-classify.mjs:575` `if reportedConf < minConf continue`) and defers to the LLM tier (`seed-ghost-llm-classify.mjs` filters out GNN-resolved engines). So the deploy-relevant metric is risk@coverage on the EMITTED set, not the full holdout (textbook selective prediction, El-Yaniv & Wiener 2010). At the **production gate `GNN_DEFAULTS.minConf = 0.7`**: coverage 32% (20/62 emitted), **Brier 0.041, macro-F1 1.0, accuracy 1.0**, global AUROC 0.808 → **DEPLOY-READY-SELECTIVE, robust** (every τ ≥ 0.7 clears, not a lone spike). The full-holdout 0.179/0.439 "failure" was scoring the tier on the abstention band it never emits.

**What shipped.** `scripts/lib/nn-graph-eval.mjs` gains `riskCoverageCurve` / `selectiveDeployPoint` / `gradeSelectiveDeploy` (reusing its own computeBrier/computeMacroF1 — one metric source), wired into assessHoldout/runAssessment/renderReport; `NN-EVAL.json` now carries an additive `selective` section (all existing readers consume named fields — inert). The deploy verdict is anchored on the PRODUCTION gate (not the most-favorable τ — that would exploit small-holdout noise); τ=0.5 (47% coverage) is reported only as a labeled tradeoff. 86 tests, 3 adversarial reviewers PASS, live-validated.

**Lever for FULL-coverage deploy (the remaining open work):** reference-pool growth (more labeled ghosts/class — several classes at zero) + sharper features (H2GCN heterophily aggregator, GPU retrain). NOT calibration.

Files: `scripts/lib/nn-graph-eval.mjs`, `scripts/nn-graph-calibration-analysis.mjs` (+tests). Eval artifact: `state/shared/nn-graph/NN-EVAL.{json,md}`. Supersedes [[feedback_india_deploy_gate_hard]]'s "AUROC 0.096" state and the calibration-blocker framing. Related: [[reference_nn_graded_schema_read_fix_2026_06_03]], [[feedback_india_eval_before_assert]].
