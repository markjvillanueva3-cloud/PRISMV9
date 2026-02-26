---
name: mfg-formulas-tolerance
description: Tolerance analysis formulas including ISO 286 fits, stack-up, and statistical tolerancing
---

# Tolerance Analysis Formulas

## When To Use
- Need tolerance stack-up calculations (worst-case or statistical)
- ISO 286 fit determination (H7/g6, H7/p6, etc.)
- IT grade selection for manufacturing process capability
- Clearance/interference fit calculations for assemblies
- NOT for surface finish tolerances — use mfg-formulas-surface
- NOT for GD&T interpretation — use engineering references

## How To Use
```
prism_calc action=tolerance_analysis params={
  method: "rss",
  dimensions: [50.0, 25.0, 12.5],
  tolerances: [0.05, 0.03, 0.02]
}
prism_calc action=fit_analysis params={
  nominal_size: 50,
  hole_tolerance: "H7",
  shaft_tolerance: "g6"
}
```

## What It Returns
- `formulas`: ~20 formulas covering worst-case, RSS, Monte Carlo, ISO 286
- `stack_result`: Total tolerance by worst-case (sum) and RSS (root-sum-square)
- `fit_type`: Clearance, transition, or interference classification
- `clearance_range`: Min/max clearance or interference values
- `it_grade`: ISO tolerance grade with numeric value in microns

## Examples
- **H7/g6 at 50mm**: Clearance fit, min clearance 0.009mm, max 0.050mm
- **RSS vs worst-case**: 5-feature stack with +/-0.05 each: WC=+/-0.25, RSS=+/-0.112
- **IT7 at 50mm**: Tolerance = 25 um (0.025mm)
- **H7/p6 at 30mm**: Interference fit, max interference 0.042mm
