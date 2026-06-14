# NN-GRAPH-MS0 GNN Tier-5 Assessment — NN-EVAL

**Assessed:** 2026-06-06T05:59:03.419Z  ·  **Holdout:** 62 reference ghosts

> Internal-consistency metric — measures whether the GNN agrees with the
> keyword/sibling tiers' high-confidence labels. NOT verified ground truth.

## Mandatory gates

| Metric | Value | Gate | Result |
|---|---|---|---|
| AUROC | 0.8084 | >= 0.78 | PASS |
| macro-F1 | 0.4389 | >= 0.55 | FAIL |
| Brier | 0.179 | <= 0.15 | FAIL |
| accuracy | 0.6613 | (informational) | — |

**Verdict: SHIPPED-RESEARCH-ONLY**

Gate failures: macro-F1 0.4389 < 0.55; Brier 0.1790 > 0.15


## Per-bucket calibration

| Confidence | Count | Mean prob | Accuracy | Brier |
|---|---|---|---|---|
| [0.00, 0.20) | 0 | — | — | — |
| [0.20, 0.40) | 19 | 0.3354 | 0.3684 | 0.2297 |
| [0.40, 0.60) | 18 | 0.4681 | 0.6111 | 0.2631 |
| [0.60, 0.80) | 6 | 0.6508 | 0.6667 | 0.2068 |
| [0.80, 1.00) | 19 | 0.8 | 1 | 0.04 |

## Selective deployment (risk-coverage)

> Tier-5 ABSTAINS below its confidence gate and defers to the LLM tier, so the
> deploy-relevant quality is the EMITTED set's risk at each operating τ — not the
> full-holdout risk (which scores predictions the tier never emits). The full-holdout
> grade above is retained; this is reported WITH its coverage, never instead of it.

| τ (gate) | Coverage | Emitted | Brier | macro-F1 | Accuracy | Brier≤gate | macroF1≥gate |
|---|---|---|---|---|---|---|---|
| 0.4 | 69.3% | 43 | 0.1567 | 0.5459 | 0.7907 | ✗ | ✗ |
| 0.45 | 54.8% | 34 | 0.1223 | 0.4645 | 0.8235 | ✓ | ✗ |
| 0.5 | 46.8% | 29 | 0.1013 | 0.5867 | 0.8966 | ✓ | ✓ |
| 0.55 | 43.5% | 27 | 0.0923 | 0.4833 | 0.8889 | ✓ | ✗ |
| 0.6 | 40.3% | 25 | 0.08 | 0.4881 | 0.92 | ✓ | ✗ |
| 0.65 | 33.9% | 21 | 0.0444 | 1 | 1 | ✓ | ✓ |
| 0.7 | 32.3% | 20 | 0.0406 | 1 | 1 | ✓ | ✓ |
| 0.75 | 32.3% | 20 | 0.0406 | 1 | 1 | ✓ | ✓ |
| 0.8 | 30.6% | 19 | 0.04 | 1 | 1 | ✓ | ✓ |

**Production deploy gate: τ=0.7** (GNN_DEFAULTS.minConf) → coverage 32.3% (20/62 emitted), Brier 0.0406 (≤ 0.15), macro-F1 1 (≥ 0.55), accuracy 1; global AUROC 0.8084 (≥ 0.78). Emitted set spans **2/6** dispatcher classes (concentrated — macro-F1 is over that subset, NOT all classes).

_Tradeoff: lowering the gate to τ=0.5 would raise coverage to 46.8% (Brier 0.1013, macro-F1 0.5867) — supplementary, not the deployed point._

**Selective verdict: DEPLOY-READY-SELECTIVE** — at the production gate, tier-5 deploys on the 32% it is confident about; the remaining 68% defers to the LLM tier. Operating regime is **robust** (every τ at/above the gate clears).

_Small-holdout caveat: this verdict is fit on 62 holdout samples; the operating point is the fixed production gate (not tuned to the holdout), but re-confirm as the reference pool grows._
