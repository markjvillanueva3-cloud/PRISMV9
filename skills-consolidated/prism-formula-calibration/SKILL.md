---
name: prism-formula-calibration
description: Calibration trigger detection and recalibration procedure — 5 trigger conditions, priority levels, and the actual recalibration execution steps
---
# Formula Calibration

## When To Use
- SYS-CALIBRATION-MONITOR hook fires an alert for a formula
- "Should this formula be recalibrated?" / "Accuracy is degrading"
- When MAPE > 20%, bias > 10%, or data is stale > 30 days
- After collecting 10+ new prediction-vs-actual data points
- NOT for: creating or registering new formulas (use prism-formula-lifecycle)
- NOT for: understanding what MAE/MAPE/R2/Bias mean (use prism-formula-performance-metrics)

## How To Use
**STEP 1 — CHECK TRIGGERS (run all 5, any match = recalibrate):**

| Trigger | Condition | Priority |
|---------|-----------|----------|
| DATA_THRESHOLD | 10+ new data points since last calibration | Normal |
| ACCURACY_DEGRADATION | MAPE > 20% | High |
| BIAS_DETECTED | absolute bias > 10% | High |
| STALENESS | 30+ days since last calibration | Low |
| CRITICAL | MAPE > 50% OR absolute bias > 25% | CRITICAL — immediate action |

Check in this order: CRITICAL first (stops everything), then High, then Normal, then Low.
If CRITICAL triggers: halt formula usage, flag all recent outputs as suspect, recalibrate immediately.
If no triggers: formula is healthy, no action needed.

**STEP 2 — GATHER CALIBRATION DATA:**
  Source: PREDICTION_LOG.json — pairs of (predicted_value, actual_value, timestamp, inputs)
  Minimum: 10 data points. Ideal: 30+.
  Filter: only data points since last calibration date.
  Outlier check: flag any point where error > 3 standard deviations from mean error.
  Decision: include outliers only if they represent real operating conditions (not measurement errors).

**STEP 3 — FIT COEFFICIENTS:**
  Method depends on formula complexity:
  - Linear models: ordinary least squares (numpy.linalg.lstsq)
  - Nonlinear models: scipy.optimize.curve_fit with initial guesses from current coefficients
  - Multi-parameter: bounded optimization (L-BFGS-B) with physically reasonable bounds
  Always provide bounds — unbounded fitting can produce nonsensical coefficients.
  Compute 95% confidence intervals for each coefficient.

**STEP 4 — VALIDATE NEW CALIBRATION:**
  Split data: 80% train, 20% holdout validation.
  Compute metrics on holdout: MAE, MAPE, R-squared, Bias.
  Compare to previous calibration metrics:
  - If new MAPE < old MAPE: improvement confirmed
  - If new MAPE >= old MAPE: recalibration did not help, keep old coefficients
  - If new R² < 0.7: formula form may be wrong, flag for lifecycle EVOLVE review

**STEP 5 — DEPLOY OR REJECT:**
  If improved: update COEFFICIENT_DATABASE.json with new values + confidence intervals.
  Bump formula version: 1.0.0 → 1.1.0 (minor version = recalibration).
  Update CALIBRATION_STATE.json: lastCalibrated, dataPoints=0 (reset counter), method used.
  If not improved: log comparison result, keep old coefficients, set review flag.

## What It Returns
- Trigger check: list of active triggers with their priority levels
- If no triggers: "Formula healthy, no recalibration needed"
- If recalibrated: new coefficients with 95% CI, before/after metrics comparison
- If recalibration rejected: comparison showing old was better, flag for review
- If CRITICAL trigger: immediate halt + suspect flag on recent outputs

## Examples
- Input: Formula F-CUT-003 (Taylor tool life), MAPE=24%, 15 new data points
  Triggers: ACCURACY_DEGRADATION (MAPE 24% > 20%), DATA_THRESHOLD (15 >= 10)
  Step 2: gather 15 points from PREDICTION_LOG, no outliers
  Step 3: fit Taylor exponents via curve_fit, bounds n=[0.1, 0.5], C=[50, 500]
  Step 4: holdout MAPE drops from 24% to 11%. R²=0.87. Improvement confirmed.
  Step 5: deploy new coefficients, version 1.2.0 → 1.3.0

- Input: Formula F-SAFE-001, last calibrated 45 days ago, MAPE=12%, 8 data points
  Triggers: STALENESS (45 > 30 days). But DATA_THRESHOLD not met (8 < 10).
  Decision: wait for 2 more data points before recalibrating. Log staleness warning.
  Staleness alone with insufficient data = defer, don't force-fit with too few points.

- Edge case: Formula F-SURF-002, MAPE=55%, bias=+30%
  Triggers: CRITICAL (MAPE 55% > 50%, bias 30% > 25%)
  Immediate action: halt formula from active use. Flag last 20 outputs as suspect.
  Recalibrate with all available data. If MAPE still > 30% after recalibration:
  formula form is likely wrong — escalate to EVOLVE stage in lifecycle.
SOURCE: Split from prism-formula-evolution (19.0KB)
RELATED: prism-formula-lifecycle, prism-formula-performance-metrics
