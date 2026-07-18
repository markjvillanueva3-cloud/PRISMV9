---
name: tribal-spr-048
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["facing", "optimization", "wiper-insert", "cycle-time"]
confidence: 0
source: "web:sprutcam-tutorials"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-048.md
promoted_at: 2026-06-09T22:31:16.630Z
---

# Facing Cycle Optimization for Cycle Time

Optimize facing cycles: use constant surface speed (G96) for consistent finish, set depth of cut to 80% of insert CNMG/WNMG capacity, and use wiper inserts for mirror finish in a single pass. In SprutCAM, set 'Face' operation with 'Step-Over' equal to 70% of insert width for wiper, 50% for standard. Program the facing pass to overshoot the centerline by 1mm to prevent a nub.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:sprutcam-tutorials
**Operations:** turning

## Related
- [[bobcad-cam-tips-bc-013|Facing with Minimize Retracts for Continuous Cutting]]
- [[tebis-cam-tips-teb-139|Facing Operations with Large Diameter Tools]]
- [[camworks-cam-tips-cw-091|Feed Optimization — Post-Process Feed Rate Adjustment by Engagement]]
- [[catia-cam-tips-cat-166|Machine Process Simulation Cycle Time Analysis]]
- [[cimatron-cam-tips-cim-090|Rapid Move Optimization]]
