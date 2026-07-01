---
name: tribal-bc-203
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["uncertainty-budget", "tolerance", "rss", "deflection", "thermal-growth"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-203.md
promoted_at: 2026-06-09T22:31:15.982Z
---

# BobCAD Dimensional Uncertainty Budget for Critical Features

Build a dimensional uncertainty budget for BobCAD-programmed features: machine positioning (±0.005mm), tool deflection (±0.002-0.020mm by L/D ratio), thermal growth (±0.010mm/°C), fixturing repeatability (±0.005mm), and tool wear (±0.010mm per tool life). RSS combination: total = sqrt(Σ component²). If RSS uncertainty exceeds 25% of the tolerance band, the process is at risk. Mitigations in BobCAD: spring passes (reduce deflection by 70%), probing cycles (zero out fixturing and thermal errors), and shorter tool projections. For ±0.01mm tolerance features, the uncertainty budget must total <±0.0025mm (25% rule).

**Category:** quality
**Confidence:** 0.83
**Source:** web:bobcad-docs
**Operations:** finishing

## Related
- [[surfcam-cam-tips-sc2-192|SURFCAM Dimensional Uncertainty Budget for Tolerance Stacking]]
- [[catia-cam-tips-cat-211|Statistical Tolerance Stack-Up Impact on Machining Sequence]]
- [[cimatron-cam-tips-cim-040|Statistical Tolerance Stack-Up for Mold Assemblies]]
- [[cimatron-cam-tips-cim-112|Uncertainty Budget for Mold Cavity Machining]]
- [[gibbscam-cam-tips-gc-054|Finish turning spring pass removes deflection error from the first pass]]
