# NN-GRAPH-MS0 GNN Tier-5 Assessment — NN-EVAL

**Assessed:** 2026-06-27T06:09:35.662Z  ·  **Holdout:** 200 reference ghosts

> Internal-consistency metric — measures whether the GNN agrees with the
> keyword/sibling tiers' high-confidence labels. NOT verified ground truth.

## Mandatory gates

| Metric | Value | Gate | Result |
|---|---|---|---|
| AUROC | 0.7525 | >= 0.78 | FAIL |
| macro-F1 | 0.2834 | >= 0.55 | FAIL |
| Brier | 0.22 | <= 0.15 | FAIL |
| accuracy | 0.555 | (informational) | — |

**Verdict: SHIPPED-RESEARCH-ONLY**

Gate failures: AUROC 0.7525 < 0.78; macro-F1 0.2834 < 0.55; Brier 0.2200 > 0.15


## Per-bucket calibration

| Confidence | Count | Mean prob | Accuracy | Brier |
|---|---|---|---|---|
| [0.00, 0.20) | 0 | — | — | — |
| [0.20, 0.40) | 12 | 0.3496 | 0.1667 | 0.173 |
| [0.40, 0.60) | 58 | 0.5039 | 0.3448 | 0.2443 |
| [0.60, 0.80) | 59 | 0.7051 | 0.4915 | 0.3105 |
| [0.80, 1.00) | 71 | 0.8 | 0.8451 | 0.133 |

## Selective deployment (risk-coverage)

> Tier-5 ABSTAINS below its confidence gate and defers to the LLM tier, so the
> deploy-relevant quality is the EMITTED set's risk at each operating τ — not the
> full-holdout risk (which scores predictions the tier never emits). The full-holdout
> grade above is retained; this is reported WITH its coverage, never instead of it.

| τ (gate) | Coverage | Emitted | Brier | macro-F1 | Accuracy | Brier≤gate | macroF1≥gate |
|---|---|---|---|---|---|---|---|
| 0.4 | 94.0% | 188 | 0.223 | 0.3065 | 0.5798 | ✗ | ✗ |
| 0.45 | 90.0% | 180 | 0.2232 | 0.3088 | 0.5944 | ✗ | ✗ |
| 0.5 | 82.5% | 165 | 0.2226 | 0.3442 | 0.6303 | ✗ | ✗ |
| 0.55 | 70.0% | 140 | 0.2178 | 0.3975 | 0.6643 | ✗ | ✗ |
| 0.6 | 65.0% | 130 | 0.2136 | 0.3978 | 0.6846 | ✗ | ✗ |
| 0.65 | 58.5% | 117 | 0.2129 | 0.4092 | 0.6838 | ✗ | ✗ |
| 0.7 | 49.5% | 99 | 0.2005 | 0.4117 | 0.7172 | ✗ | ✗ |
| 0.75 | 43.0% | 86 | 0.1771 | 0.4666 | 0.7674 | ✗ | ✗ |
| 0.8 | 35.5% | 71 | 0.133 | 0.6155 | 0.8451 | ✓ | ✓ |

**Selective verdict: NO-DEPLOYABLE-OPERATING-POINT** — AUROC 0.7525 < 0.78 (global ranking); at the production gate τ=0.7 the emitted set fails: Brier 0.2005 > 0.15, macro-F1 0.4117 < 0.55.

_(A lower gate τ=0.8 would clear at 35.5% coverage, but production runs at τ=0.7.)_

_Small-holdout caveat: this verdict is fit on 200 holdout samples; the operating point is the fixed production gate (not tuned to the holdout), but re-confirm as the reference pool grows._
