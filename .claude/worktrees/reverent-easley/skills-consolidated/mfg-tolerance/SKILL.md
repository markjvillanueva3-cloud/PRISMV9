---
name: Tolerance Stack-Up Analyzer
description: ISO 286 tolerance stack-up analysis for assembled dimensions
---

## When To Use
- When analyzing tolerance accumulation in multi-part assemblies
- When verifying that individual part tolerances produce acceptable assembly fit
- When optimizing tolerance allocation to minimize cost while meeting function
- When converting between ISO 286 tolerance grades and actual dimensions
- NOT for shaft/hole fit analysis — use mfg-fit-analysis for that

## How To Use
```
prism_calc action=tolerance_analysis params={
  assembly: [
    { dimension: 50.000, tolerance: "H7", role: "hole" },
    { dimension: 25.000, tolerance: "±0.02", role: "spacer" },
    { dimension: 25.000, tolerance: "±0.02", role: "spacer" }
  ],
  target_gap: 0.000,
  method: "worst_case"
}
```

Methods: worst_case, rss (root sum square), monte_carlo

## What It Returns
- Total stack-up range (min/max assembly dimension)
- Statistical distribution of assembly dimension (RSS/Monte Carlo)
- Pass/fail against target gap or clearance requirement
- Individual contribution of each component to total variation
- Recommended tolerance tightening if stack-up fails

## Examples
- Input: `tolerance_analysis params={assembly: [{dimension: 100, tolerance: "H7"}, {dimension: 100, tolerance: "h6"}], method: "worst_case"}`
- Output: Stack-up range 0.000 to +0.056mm, worst-case clearance always positive, assembly fits

- Input: `tolerance_analysis params={assembly: [{dimension: 50, tolerance: "±0.05"}, {dimension: 30, tolerance: "±0.03"}, {dimension: 20, tolerance: "±0.04"}], target_gap: 0.10}`
- Output: RSS stack: ±0.071mm, 99.7% within ±0.10 target, worst-case ±0.12mm exceeds target
