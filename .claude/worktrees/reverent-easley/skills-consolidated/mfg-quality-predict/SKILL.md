---
name: mfg-quality-predict
description: Predict part quality outcomes from process parameters using statistical and physics-based models
---

# Quality Prediction

## When To Use
- Predicting whether a part will meet quality specs before machining
- Estimating Cpk/Ppk from planned process parameters
- Assessing risk of scrap or rework for a given setup
- NOT for post-machining inspection — use mfg-cmm-import instead

## How To Use
```
prism_intelligence action=quality_predict params={
  material: "Ti-6Al-4V",
  operation: "finish_milling",
  tool_type: "ball_nose_carbide",
  parameters: { Vc: 60, fz: 0.08, ap: 0.3, ae: 0.5 },
  targets: { Ra: 0.8, dimensional_tolerance: 0.02 }
}
```

## What It Returns
- `predicted_Ra`: Expected surface roughness with confidence interval
- `predicted_dimensional`: Expected dimensional accuracy
- `cpk_estimate`: Estimated process capability index
- `risk_score`: Probability of exceeding tolerance (0-1)
- `risk_factors`: Ranked list of contributing risk factors
- `recommendations`: Parameter adjustments to improve quality

## Examples
- **Finish milling titanium**: Ra target 0.8 um → predicted 0.65 um, Cpk 1.45, risk 0.03
- **Deep pocket aluminum**: Dimensional target 0.02mm → predicted 0.018mm, risk 0.12 (deflection dominant)
- **High risk case**: Thin wall stainless → risk 0.45, recommends reducing ap and adding spring passes
