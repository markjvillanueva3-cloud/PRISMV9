---
id: "cim-040"
title: "Statistical Tolerance Stack-Up for Mold Assemblies"
source: "web:cimatron-forum"
confidence: 0.84
category: "cam_strategy"
tags: ["tolerance", "stack-up", "rss", "mold-assembly"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.013Z
---

# Statistical Tolerance Stack-Up for Mold Assemblies

Mold assembly tolerance stack-up across core, cavity, slides, and inserts follows RSS (Root Sum Square) statistics. Each machined component contributes its own tolerance band. For a 4-component stack: total tolerance = √(t1² + t2² + t3² + t4²). Machine critical mating surfaces to IT6 or better (±0.008mm for 50mm features). Cimatron's PMI display shows GD&T callouts — use these to prioritize which surfaces need tightest tolerances.

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:cimatron-forum
**Operations:** setup

## Related
- [[catia-cam-tips-cat-211|Statistical Tolerance Stack-Up Impact on Machining Sequence]]
- [[bobcad-cam-tips-bc-203|BobCAD Dimensional Uncertainty Budget for Critical Features]]
- [[cimatron-cam-tips-cim-112|Uncertainty Budget for Mold Cavity Machining]]
- [[mastercam-cam-tips-mc-278|Statistical tolerance stack-up analysis validates multi-setup part accuracy before programming]]
- [[sprutcam-cam-tips-spr-093|Uncertainty Propagation Through Multi-Operation Sequences]]
