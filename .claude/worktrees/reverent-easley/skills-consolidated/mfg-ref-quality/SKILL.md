---
name: mfg-ref-quality
description: Quality control and lean manufacturing reference from MIT 2.830 and 16.660J
---

# MIT Quality Control & Lean Manufacturing Reference

## When To Use
- Need statistical process control theory for manufacturing quality
- Applying Cpk/Ppk capability analysis to tolerance validation
- Designing FMEA or DMAIC workflows for process improvement
- Understanding Taguchi methods and robust parameter design

## How To Use
```
prism_knowledge action=search params={
  query: "SPC control charts Cpk FMEA DMAIC Taguchi robust design",
  registries: ["formulas", "courses"]
}
```

## What It Returns
- SPC control chart theory mapped to prism_intelligence quality_predict
- Capability indices (Cpk/Ppk) for prism_omega compute quality scoring
- FMEA risk priority framework for prism_intelligence genplan_risk
- Taguchi loss function concepts for prism_calc multi_optimize robustness

## Key Course Mappings
- **MIT 2.830** (Control of Mfg): SPC, capability, DOE, Taguchi -> quality_predict, omega compute
- **MIT 16.660J** (Lean/Six Sigma): DMAIC, value stream, waste -> shop_schedule, process_cost

## Examples
- **Process capability**: Use 2.830 Cpk theory via prism_omega compute to validate tolerance capability
- **Control charts**: Apply 2.830 X-bar/R chart rules via prism_intelligence quality_predict for drift
- **FMEA scoring**: Use 2.830 RPN framework via prism_intelligence genplan_risk for failure modes
- **Lean scheduling**: Apply 16.660J value stream mapping via prism_intelligence shop_schedule for flow
- **Robust design**: Use 2.830 Taguchi L9/L18 arrays via prism_calc multi_optimize for parameter selection
