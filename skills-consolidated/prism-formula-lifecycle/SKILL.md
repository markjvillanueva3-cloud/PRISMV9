---
name: prism-formula-lifecycle
description: 7-stage formula management procedure — invent through deprecation with calibration triggers, performance thresholds, and automatic degradation detection
---
# Formula Lifecycle Management

## When To Use
- Creating a new physics formula for PRISM (Kienzle, Taylor, Johnson-Cook variants, etc.)
- A formula's predictions are drifting from actual results and need recalibration
- "When should I recalibrate this formula?" / "How do I register a new formula?"
- During R2+ when building calculation engines that use material physics
- When SYS-CALIBRATION-MONITOR hook fires a staleness or degradation alert
- NOT for: selecting which agent to run a calculation (use prism-agent-selection)
- NOT for: error handling in calculations (use prism-error-taxonomy)

## How To Use
**7-STAGE LIFECYCLE (each formula progresses through all stages):**

**1. INVENT** — Define the mathematical form, variables, and initial coefficients.
  Entry: theory or empirical basis exists. Exit: formula form defined with candidate coefficients.
  Validation: theory review. Does the form match known physics? Units dimensionally consistent?

**2. REGISTER** — Assign ID (format F-DOMAIN-NNN), add to FORMULA_REGISTRY.json.
  Required fields: id, name, symbol, domain, definition, coefficients[], status="REGISTERED"
  File: C:\PRISM\data\FORMULA_REGISTRY.json
  Hook: formula:registered fires. Version set to 0.1.0-alpha.

**3. CALIBRATE** — Fit coefficients to real data. Minimum 10 data points required.
  Compute: MAE, MAPE, R-squared, Bias for the fitted coefficients.
  Store calibration in COEFFICIENT_DATABASE.json with uncertainty bounds (95% CI).
  File: C:\PRISM\data\COEFFICIENT_DATABASE.json
  Exit criteria: MAPE < 20%, R-squared > 0.7, |Bias| < 10%. If not met, iterate or revise form.

**4. DEPLOY** — Promote to v1.0. Integration test with 3+ material classes. Wire to consumers. Status="DEPLOYED".

**5. MONITOR** — Track predicted vs actual via PREDICTION_LOG.json.
  SYS-PREDICTION-LOG auto-captures every prediction. SYS-CALIBRATION-MONITOR checks periodically.

**6. EVOLVE** — Recalibrate when triggers fire. A/B test old vs new. Promote if improved. Archive old version.

**7. DEPRECATE** — Mark superseded when replaced by better formula.
  Check: zero active consumers before deprecating. Redirect consumers to successor.
  Status changes to "DEPRECATED". Formula remains in registry for historical reference.

**CALIBRATION TRIGGERS (recalibrate when ANY condition met):**
  DATA_THRESHOLD: 10+ new data points since last calibration → Normal priority
  ACCURACY_DEGRADATION: MAPE > 20% → High priority, recalibrate soon
  BIAS_DETECTED: |Bias| > 10% → High priority, systematic error present
  STALENESS: 30+ days since last calibration → Low priority
  CRITICAL: MAPE > 50% OR |Bias| > 25% → Immediate action, formula unreliable

**PERFORMANCE THRESHOLDS:**
  MAPE: <20% acceptable, 20-50% recalibrate, >50% CRITICAL stop using
  R-squared: >0.7 good, 0.4-0.7 marginal, <0.4 revise form
  |Bias|: <10% ok, 10-25% recalibrate, >25% CRITICAL

## What It Returns
- Stage 2: formula ID and registry entry in FORMULA_REGISTRY.json
- Stage 3: calibrated coefficients with uncertainty bounds in COEFFICIENT_DATABASE.json
- Stage 5: continuous prediction log for tracking accuracy over time
- Stage 6: version comparison showing whether recalibration improved accuracy
- Triggers: list of active calibration triggers for any formula, driving automatic recalibration
- Hooks: formula:registered, formula:calibrationCheck, formula:coefficientUpdate fire at each stage

## Examples
- Input: "Registering a new Kienzle cutting force formula for titanium alloys"
  Stage 1: Fc = kc1.1 * b * h^(1-mc). Form matches established Kienzle model. Units: N.
  Stage 2: Register as F-CUTTING-042, domain="cutting_force", status="REGISTERED"
  Stage 3: Calibrate with 15 titanium cutting test data points. MAPE=12.3%, R²=0.87, Bias=+3.1%. PASS.
  Stage 4: Deploy v1.0. Wire to SpeedFeedCalculator and SafetyValidator consumers.

- Input: "SYS-CALIBRATION-MONITOR fires: F-TOOLLIFE-008 MAPE has risen to 34%"
  Trigger: ACCURACY_DEGRADATION (MAPE 34% > 20% threshold). High priority.
  Action: collect recent prediction vs actual pairs from PREDICTION_LOG. Recalibrate coefficients.
  Compare: old MAPE 34% → new MAPE 15%. New R² improved. Promote to v1.2.
  If recalibration doesn't help: the mathematical form may be wrong. Escalate to INVENT stage.

- Edge case: "Formula has only 6 data points but user wants to deploy"
  Block: minimum 10 data points for calibration. 6 is insufficient for reliable coefficient fitting.
  Action: collect 4+ more data points before calibrating. Do not deploy uncalibrated formulas.
  Risk: under-calibrated formula could produce unsafe cutting parameters. Lives depend on this.
SOURCE: Split from prism-formula-evolution (19KB)
RELATED: prism-error-taxonomy, prism-hook-enforcement
