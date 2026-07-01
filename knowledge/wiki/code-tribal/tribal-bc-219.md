---
name: tribal-bc-219
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["sensitivity-analysis", "sobol-index", "process-optimization", "parameter-study"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-219.md
promoted_at: 2026-06-09T22:31:15.986Z
---

# BobCAD Sensitivity Analysis for Process Optimization

Perform sensitivity analysis on BobCAD process parameters to identify which inputs most affect output quality. Vary each parameter (speed ±10%, feed ±10%, depth ±20%, stepover ±20%) one at a time while holding others constant. Measure the effect on surface finish, dimensional accuracy, and tool life. Typically, spindle speed dominates surface finish (Sobol index Si=0.35-0.45), feed dominates tool life (Si=0.30-0.40), and depth dominates dimensional accuracy (Si=0.25-0.35). Focus optimization efforts on the parameter with the highest Sobol index for the quality metric that needs improvement.

**Category:** quality
**Confidence:** 0.82
**Source:** web:bobcad-docs
**Operations:** roughing, finishing

## Related
- [[sprutcam-cam-tips-spr-031|Digital Twin Feedback Loop for Process Optimization]]
