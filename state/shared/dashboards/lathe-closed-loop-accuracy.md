# JM Die Lathe — CLOSED-LOOP self-learning accuracy (held-out)

_Generated 2026-06-03T20:28:18.665Z · 16 train / 8 held-out test · ±35% band · 88200 ms_

> Multipliers = median(JM master) / median(PRISM baseline-regen) per op-category, learned on TRAIN ONLY. Held-out TEST accuracy is the real generalization number; teaching-to-the-test is avoided by the split. A positive held-out lift = PRISM genuinely getting closer to JM-realistic output. NOT a 100% claim (R12).

## Held-out test accuracy — the honest generalization number

| metric | BASELINE (PRISM only) | CALIBRATED (+ JM shop profile) | lift |
|----|----|----|----|
| mean | 45.2% | **76%** | **+30.8** |
| op-coverage | 100% | 100% | — |
| SFM in-band | 13.3% | 60% | +46.7 |
| IPR in-band | 10% | 65% | +55 |

Overfit check: train calibrated 77.5% vs test calibrated 76% → gap 1.5 (**ok**)

## Learned JM shop profile (per-op-category multipliers, TRAIN-only)

| op category | SFM × | IPR × | train n (sfm/ipr) |
|----|----|----|----|
| rough | 0.35 | 0.59 | 15/15 |
| finish | 0.19 | 0.64 | 16/16 |
| drill | — | 0.42 | 1/12 |
| thread | — | — | 0/0 |
| groove | — | — | 0/0 |
| part_off | — | — | 0/0 |

_Learned profile JSON: `state/shared/dashboards/lathe-shop-profile-calibration.json`. Baseline (no learning): `lathe-roundtrip-accuracy.md`._
