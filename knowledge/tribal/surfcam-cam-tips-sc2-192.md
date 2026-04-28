---
id: "sc2-192"
title: "SURFCAM Dimensional Uncertainty Budget for Tolerance Stacking"
source: "web:surfcam-docs"
confidence: 0.84
category: "quality"
tags: ["uncertainty-budget", "tolerance-stacking", "rss", "tool-deflection", "thermal"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.199Z
---

# SURFCAM Dimensional Uncertainty Budget for Tolerance Stacking

Build a dimensional uncertainty budget for SURFCAM-programmed features by combining: machine positioning error (±0.005mm), tool deflection (±0.002-0.020mm depending on L/D), thermal growth (±0.010mm/°C), fixturing repeatability (±0.005mm), and tool wear (±0.010mm per tool life). RSS (root sum square) combination gives the expected total uncertainty. If RSS uncertainty exceeds 25% of the tolerance band, the process is at risk. Mitigations in SURFCAM: add spring passes, use tool deflection compensation, or program probe-and-adjust cycles.

**Category:** quality
**Confidence:** 0.84
**Source:** web:surfcam-docs
**Operations:** finishing

## Related
- [[bobcad-cam-tips-bc-203|BobCAD Dimensional Uncertainty Budget for Critical Features]]
- [[catia-cam-tips-cat-211|Statistical Tolerance Stack-Up Impact on Machining Sequence]]
- [[cimatron-cam-tips-cim-040|Statistical Tolerance Stack-Up for Mold Assemblies]]
- [[cimatron-cam-tips-cim-105|Cpk Prediction from Error Budget]]
- [[cimatron-cam-tips-cim-112|Uncertainty Budget for Mold Cavity Machining]]
