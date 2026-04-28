---
id: "cim-010"
title: "Tool Assembly Collision Checking"
source: "web:cimatron-docs"
confidence: 0.92
category: "cam_strategy"
tags: ["tool-assembly", "collision", "holder", "gouge-check"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.990Z
---

# Tool Assembly Collision Checking

Define complete tool assemblies (cutter + holder + extension + collet) in Cimatron's Tool Manager. Enable 'Holder Collision Check' in every operation — this uses the full assembly geometry for gouge detection. Set 'Holder Clearance' to 0.5mm minimum. For deep cavities, use shrink-fit holders (smallest profile) and define the exact holder taper dimensions.

**Category:** cam_strategy
**Confidence:** 0.92
**Source:** web:cimatron-docs
**Operations:** roughing, finishing

## Related
- [[topsolid-cam-tips-ts-062|Collision Detection Covers Full Tool Assembly]]
- [[topsolid-cam-tips-ts-126|TopSolid'Cam 7 Tool Assembly Builder — 3D Tool and Holder Stacks]]
- [[cimatron-cam-tips-cim-093|Collision Checking with Complete Tool Assembly]]
- [[powermill-cam-tips-pm-073|Collision Checking Strategies for Deep Cavities]]
- [[sprutcam-cam-tips-spr-139|Collision Checking with Full Assembly]]
