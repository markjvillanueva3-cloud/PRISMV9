---
name: mfg-formulas-statistics
description: Statistical process control formulas including Cpk, control charts, and normal distribution
---

# Statistical Process Control Formulas

## When To Use
- Need process capability calculations (Cp, Cpk, Pp, Ppk)
- Control chart construction (X-bar/R, X-bar/S, individual/moving range)
- Control limit determination and out-of-control detection rules
- ANOVA and hypothesis testing for process comparisons
- NOT for quality prediction from parameters — use mfg-quality-predict
- NOT for measurement system analysis — use mfg-measurement-summary

## How To Use
```
prism_intelligence action=quality_predict params={
  measurements: [50.02, 49.98, 50.01, 49.99, 50.03],
  usl: 50.05,
  lsl: 49.95,
  subgroup_size: 5
}
prism_omega action=compute params={
  context: "process_capability",
  data: { cpk: 1.45, sample_size: 30 }
}
```

## What It Returns
- `formulas`: ~20 formulas covering Cpk, control charts, ANOVA, normality tests
- `cpk`: Cpk = min((USL - mu), (mu - LSL)) / (3 * sigma)
- `control_limits`: UCL/LCL for X-bar = X-double-bar +/- A2*R-bar
- `capability_index`: Cp = (USL - LSL) / (6 * sigma)
- `anova_result`: F-statistic and p-value for multi-group comparison

## Examples
- **Cpk from 30 samples**: mean=50.01, sigma=0.012, USL=50.05, LSL=49.95 gives Cpk=1.11
- **X-bar/R chart (n=5)**: A2=0.577, D3=0, D4=2.114, UCL_R = D4*R-bar
- **Minimum Cpk**: Automotive typically requires Cpk >= 1.33, aerospace >= 1.67
- **Process shift**: Western Electric rules detect 1.5-sigma shift with ~97% power
