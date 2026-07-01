---
name: tribal-sc2-154
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["barrel-cutter", "effective-diameter", "rpm", "g93", "inverse-time"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-154.md
promoted_at: 2026-06-09T22:31:16.693Z
---

# Barrel Cutter Speed and Feed Adjustment for Effective Diameter

With barrel cutters, the effective cutting diameter at the contact point varies with tilt angle and surface inclination. In SURFCAM, calculate RPM based on the effective diameter at the contact point, not the nominal tool diameter. For a barrel cutter with 16mm nominal diameter but 100mm barrel radius, the effective cutting diameter at the contact point may be 14-18mm depending on tilt. Program speeds 10-20% higher than nominal calculations suggest, and monitor surface finish to fine-tune. Use inverse-time feed mode (G93) for consistent chip load across varying effective diameters.

**Category:** speeds_feeds
**Confidence:** 0.85
**Source:** web:surfcam-docs
**Operations:** finishing, 5_axis

## Related
- [[bobcad-cam-tips-bc-163|BobCAD Barrel Cutter Speed Calculation at Contact Point]]
- [[catia-cam-tips-cat-032|Simultaneous 5-Axis Requires Inverse Time Feed Mode]]
- [[bobcad-cam-tips-bc-161|BobCAD Barrel Cutter Support for Large-Step-Over Finishing]]
- [[bobcad-cam-tips-bc-162|BobCAD Barrel Cutter 5-Axis Tilt Control for Wall Surfaces]]
- [[bobcad-cam-tips-bc-165|BobCAD Barrel Cutter Interference Checking for Deep Pockets]]
