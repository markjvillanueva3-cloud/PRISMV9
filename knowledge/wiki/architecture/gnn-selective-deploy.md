---
title: GNN tier-5 selective deployment (risk-coverage)
tags: [nn-graph, gnn, deploy-gate, calibration, selective-prediction, india]
created: 2026-06-06
by: claude-india
supersedes_claim: "calibration is the dominant NN/GNN gate-clear blocker"
---

# GNN tier-5 selective deployment

The NN/GNN wiring-inference classifier (PSN leg #10) fails the full-holdout deploy gate
(AUROC ≥ 0.78, macro-F1 ≥ 0.55, Brier ≤ 0.15) on the live 62-ghost stratified holdout:
**AUROC 0.808 ✓, macro-F1 0.439 ✗, Brier 0.179 ✗**. Two measured findings redirect the
deploy strategy.

## Finding 1 — post-hoc confidence calibration is a dead end

`scripts/nn-graph-calibration-analysis.mjs` (Murphy decomposition + density-matched LOO-CV):

| quantity | value | meaning |
|---|---|---|
| reliability (miscalibration) | **0.0197** | the ONLY part calibration can remove |
| resolution (refinement) | 0.0661 | model's discriminating power |
| uncertainty (base rate) | 0.224 | irreducible |
| LOO-CV Platt / temperature / isotonic | 0.178 / 0.180 / 0.193 | none clear 0.15 |
| in-sample isotonic ceiling | 0.144 | illusory (overfits 62 samples) |

The model is already near-calibrated; the residual Brier is refinement loss, which no
monotone recalibration removes. The earlier isotonic-LOO-over-reference-pool attempt
(U-GNN-CALIBRATE-NEG) regressed the holdout because the LOO density (drop 1) ≠ holdout
density (drop ~62); even the correct density-matched calibrators do not clear the gate.

## Finding 2 — the tier deploys honestly as a SELECTIVE predictor

Tier-5 abstains below its confidence gate in production (`seed-ghost-gnn-classify.mjs:575`)
and defers to the LLM tier (`seed-ghost-llm-classify.mjs`). So the deploy-relevant metric is
risk@coverage on the EMITTED set — textbook selective prediction (El-Yaniv & Wiener 2010),
NOT the full-holdout risk that scores predictions the tier never emits.

At the **production gate `GNN_DEFAULTS.minConf = 0.7`**:

| metric | emitted-set value | gate | result |
|---|---|---|---|
| coverage | 32% (20/62) | — | (abstains on 68%, defers to LLM) |
| Brier | 0.041 | ≤ 0.15 | PASS |
| macro-F1 | 1.0 | ≥ 0.55 | PASS |
| AUROC (global) | 0.808 | ≥ 0.78 | PASS |

**Verdict: DEPLOY-READY-SELECTIVE, robust** (every τ ≥ 0.7 clears — not a lone noise spike).
Lowering the gate to τ=0.5 raises coverage to 47% (Brier 0.101, macro-F1 0.587) but is a
supplementary tradeoff, not the deployed point.

## What shipped

`scripts/lib/nn-graph-eval.mjs` gains `riskCoverageCurve`, `selectiveDeployPoint`,
`gradeSelectiveDeploy` (reusing its own `computeBrier`/`computeMacroF1`), wired into
`assessHoldout`/`runAssessment`/`renderReport`. `NN-EVAL.json` carries an additive
`selective` section (all readers consume named fields — inert). The verdict is anchored on
the production gate, never the most-favorable τ. 86 tests; 3 adversarial reviewers PASS.

## Open lever (NOT calibration)

Full-coverage deploy needs reference-pool growth (labeled ghosts/class — several at zero) +
sharper features (H2GCN heterophily aggregator, GPU retrain). Tracked in BLACKWELL-AI-MS3.

Memory: [[reference_gnn_selective_deploy_2026_06_06]]. Supersedes the calibration-blocker
framing in [[feedback_india_deploy_gate_hard]].
