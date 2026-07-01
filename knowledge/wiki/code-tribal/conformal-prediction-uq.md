---
name: conformal-prediction-uq
category: code-tribal
domain: backend-dev
tags: [conformal-prediction, uncertainty-quantification, calibration, deep-learning, ai-development]
last_updated: 2026-05-18
---

# Conformal Prediction — distribution-free UQ for ML outputs

PRISM wraps every safety-critical ML output (LoRA inference, conformal recast prediction, surface-finish prediction) with conformal prediction to produce **calibrated prediction sets** instead of point predictions. The wrapping layer is the difference between "the model says 12 μm" and "the model says 12 μm ± 3 μm, 95% confidence."

## What conformal prediction is

A distribution-free post-hoc calibration that converts any model's score function into a prediction set with guaranteed marginal coverage. Two operational properties:

1. **Coverage guarantee:** for a chosen α (e.g. 0.05), the prediction set contains the true label with probability ≥ 1−α, regardless of the underlying model.
2. **Distribution-free:** no assumption on the data distribution or model structure. Works for trees, deep nets, LoRA outputs, anything.

## The split-conformal recipe (PRISM's default)

1. **Train** the base model on `D_train`.
2. **Calibrate** on a held-out `D_cal`: for each (x, y) compute a nonconformity score `s(x, y) = nonconformity_of_model_prediction_to_y`.
3. **Find quantile:** `q_hat = ⌈(n_cal + 1)(1−α)⌉ / n_cal` empirical quantile of `s` over `D_cal`.
4. **Predict on new x:** the prediction set is `{y : s(x, y) ≤ q_hat}`.

For regression: `s(x, y) = |y − ŷ(x)|`. Set is `[ŷ(x) − q_hat, ŷ(x) + q_hat]`.
For classification: `s(x, y) = 1 − softmax_y(x)`. Set is `{y : softmax_y(x) ≥ 1 − q_hat}`.

## Why PRISM uses it

Three reasons:

1. **R12 fail-loud** — a model that returns "12 μm" doesn't surface its uncertainty. A model that returns "[9, 15] μm at 95% confidence" surfaces it explicitly. Operators can decide whether to widen tolerance or re-measure.
2. **Calibrated decision thresholds** — a safety gate that triggers on "predicted surface finish > spec" produces false positives when the model is uncalibrated. With conformal sets, the gate triggers on "upper bound of set > spec" — calibrated false-positive rate.
3. **Distribution drift detection** — when conformal sets widen over time (q_hat grows on new calibration data), the model's nonconformity distribution is shifting; this is an early drift signal.

## Adaptive Prediction Sets (APS) — PRISM's classification surface

For multi-class classification, plain split-conformal produces sets of variable size — easy examples get singleton sets, hard ones get larger sets. APS extends this with the conditional-coverage property: the set size scales with the actual prediction difficulty.

PRISM's `xproc_aps_*` dispatcher action set:
- `xproc_aps_calibrate` — fit on calibration data
- `xproc_aps_set` — produce prediction set for new input
- `xproc_aps_stats` — coverage rate, average set size, drift indicators

## Regularized APS (RAPS) — for ambiguous classes

RAPS adds a regularization term penalizing large sets. Useful when classes are inherently ambiguous (e.g. chatter classification: "stable" vs "marginally stable" boundary is fuzzy). Slightly worse marginal coverage in exchange for tighter sets where the model is genuinely uncertain.

## Mondrian conformal — per-stratum calibration

When the model performs differently on different sub-populations (e.g. lathe vs mill chatter), plain conformal lumps them together and over/under-covers each. **Mondrian conformal** stratifies the calibration set by sub-population and computes per-stratum q_hat. Better local coverage at the cost of needing more calibration data.

PRISM uses Mondrian for cross-machine LoRA inference: each machine family has its own q_hat.

## The U-CLEANUP-B9 drift gate (2026-05-18)

PRISM's `xproc_aps` classification surface had a deferred drift gate that was closed this session — a split-conformal mirror replaces the older slope-based gate, with a floor that's always on. The lesson:

> A drift gate that depends on `accuracy=0` as a sentinel false-DRIFTED every unseeded week. Conformal coverage drift is a more robust signal than accuracy alone.

See CLAUDE.md `[[reference_u_cleanup_b9_2026_05_18]]`.

## When NOT to use conformal

- **Tiny sample sizes** — conformal needs ~50+ calibration examples to produce reliable q_hat. Below that, parametric UQ (Bayesian posterior) is better.
- **Severe distribution shift** — coverage guarantee assumes calibration distribution matches inference distribution. Shift breaks the guarantee; you need adaptive conformal (online updates).
- **Per-instance uncertainty needed** — conformal gives marginal coverage. For per-instance "is THIS prediction trustworthy?", you need Bayesian or ensemble-disagreement methods.

## Composition with other UQ methods

PRISM stacks conformal on top of ensemble disagreement (`xproc_ensemble_disagreement` returns variance across N predictors; conformal calibrates that variance into a coverage-guaranteed interval). Composition rule: the base UQ method provides the nonconformity score, conformal provides the coverage guarantee.

## R12 corollary

A conformal prediction set IS a fail-loud statement. The set says "the truth is in here with prob ≥ 1−α". Point predictions hide uncertainty; sets surface it. **Default all safety-critical ML outputs to conformal-wrapped.**

## Related

- [[gradient-descent-and-optimizers]] — sibling: how the base model gets trained
- [[fail-loud-r12-patterns]] — UQ is fail-loud applied to prediction
- [[deep-reasoning-doctrine]] — when LLM can substitute for trained model
- CLAUDE.md §"[[reference_u_cleanup_b9_2026_05_18]]" — recent conformal drift-gate fix
- `prism_ai:xproc_aps_*` / `xproc_raps_*` / `xproc_mondrian_*` — dispatcher actions
