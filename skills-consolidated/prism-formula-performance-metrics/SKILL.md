---
name: prism-formula-performance-metrics
description: Compute and interpret 4 formula health metrics — MAE, MAPE, R-squared, Bias — with alert thresholds and corrective action triggers
---
# Formula Performance Metrics

## When To Use
- Evaluating how well a formula's predictions match actual observed values
- "Is this formula accurate?" / "How much error should I expect?"
- When SYS-CALIBRATION-MONITOR needs to assess formula health
- After collecting prediction-vs-actual pairs to compute quality scores
- NOT for: the full calibration procedure (use prism-formula-calibration)
- NOT for: formula registration or versioning (use prism-formula-lifecycle)

## How To Use
**INPUT: Two equal-length arrays: predictions[] and actuals[] (minimum 5 pairs)**

**COMPUTE 4 METRICS:**

1. **MAE** (Mean Absolute Error) = mean(|predicted - actual|)
   Units: same as the formula output (mm, minutes, N, etc.)
   Interpretation: average magnitude of prediction error
   Use for: understanding error in physical units — "off by X mm on average"
   Alert: context-dependent (0.1mm is great for surface finish, terrible for position)

2. **MAPE** (Mean Absolute Percentage Error) = mean(|error| / |actual|) x 100
   Units: percentage (dimensionless)
   Interpretation: average error as percentage of actual value
   Thresholds: < 10% EXCELLENT, 10-20% GOOD, 20-50% POOR, > 50% CRITICAL
   Use for: comparing accuracy across different formulas regardless of scale
   Caution: undefined when actual = 0. Filter out zero actuals before computing.

3. **R-squared** = 1 - (sum_of_squared_residuals / sum_of_squared_total)
   Where: residuals = predicted - actual, total = actual - mean(actual)
   Range: 0 to 1 (can be negative if predictions worse than mean)
   Thresholds: > 0.9 EXCELLENT, 0.7-0.9 GOOD, 0.5-0.7 FAIR, < 0.5 POOR
   Interpretation: fraction of variance in actuals explained by the formula
   Use for: assessing whether the formula captures the underlying relationship

4. **Bias** = mean(predicted - actual)
   Units: same as formula output
   Interpretation: systematic over/under-prediction
   Thresholds: |Bias| < 5% of mean(actual) GOOD, 5-10% WARNING, > 10% RECALIBRATE
   Positive bias = formula over-predicts. Negative = under-predicts.
   Use for: detecting drift — a formula that was accurate but shifted over time

**INTERPRET COMBINED RESULTS:**
  All 4 green: formula healthy, continue monitoring
  MAPE > 20% OR |Bias| > 10%: trigger recalibration (HIGH priority)
  MAPE > 50% OR |Bias| > 25%: CRITICAL — halt formula, flag recent outputs
  R² < 0.5: formula form may be wrong — recalibration won't help, need new model
  Low MAE but high Bias: formula is precise but systematically shifted — easy fix via offset

**UPDATE FORMULA REGISTRY:**
  Write computed metrics to formula.performance in FORMULA_REGISTRY.json:
  { mae: X, mape: Y, r2: Z, bias: W, lastComputed: ISO_timestamp, dataPoints: N }
  These metrics feed SYS-CALIBRATION-MONITOR hook for automatic alerting.

## What It Returns
- Four numeric metrics: MAE, MAPE, R², Bias
- Health assessment: EXCELLENT / GOOD / POOR / CRITICAL per metric
- Combined verdict: healthy / needs recalibration / needs new model / critical halt
- If unhealthy: specific corrective action (recalibrate, check for bias, rebuild formula)
- Updated performance record in formula registry for continuous monitoring

## Examples
- Input: Tool life predictions [42, 38, 45, 41, 39] vs actuals [40, 35, 44, 43, 38]
  MAE = mean(|2, 3, 1, 2, 1|) = 1.8 minutes
  MAPE = mean(|2/40, 3/35, 1/44, 2/43, 1/38|) x 100 = 4.6%
  R² = 1 - (19/50) = 0.62
  Bias = mean(2, 3, 1, -2, 1) = 1.0 minutes (slight over-prediction)
  Verdict: MAPE excellent (4.6%), R² fair (0.62), Bias acceptable (2.5% of mean)
  Action: formula is adequate but R² suggests moderate unexplained variance. Monitor.

- Input: Cutting force predictions [1200, 1350, 1100] vs actuals [900, 950, 850]
  MAE = 316.7 N, MAPE = 36.8%, R² = 0.75, Bias = +316.7 N (massive over-prediction)
  Verdict: MAPE POOR (36.8%), Bias CRITICAL (35% of mean actual)
  Action: formula systematically over-predicts by ~35%. Likely wrong coefficients.
  Trigger: prism-formula-calibration with HIGH priority.

- Edge case: Surface finish predictions [0.8, 0.9, 0.7, 0.85] vs actuals [0.82, 0.78, 0.73, 0.80]
  MAE = 0.055 um, MAPE = 5.4%, R² = 0.41, Bias = +0.025 um
  MAPE looks great (5.4%) but R² is poor (0.41). The formula predicts close to the
  mean but doesn't track variation. Recalibration won't fix this — formula form needs
  improvement. Escalate to lifecycle EVOLVE stage with recommendation for new model.
SOURCE: Split from prism-formula-evolution (19.0KB)
RELATED: prism-formula-lifecycle, prism-formula-calibration
