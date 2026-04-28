---
id: "bc-127"
title: "Relief Cutting with Roughing and Finishing Strategies"
source: "web:bobcad-relief-cutting"
confidence: 87
category: "cam_strategy"
tags: ["relief-cutting", "roughing-finishing", "detail-size", "stepover"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.556Z
---

# Relief Cutting with Roughing and Finishing Strategies

BobART relief cutting uses the same proven 3D toolpath strategies as BobCAD's milling module: Z-level roughing, raster finishing, scallop finishing, and pencil cleanup. For relief cutting, start with a flat-bottom end mill for roughing (clears large volumes quickly), then switch to a ball-nose for finishing (captures fine detail). Set finishing stepover based on the smallest detail size in the relief — typically 0.1-0.2mm for fine art work, 0.3-0.5mm for sign work.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:bobcad-relief-cutting
**Operations:** engraving, roughing, finishing

## Related
- [[mastercam-cam-tips-mc-260|Hybrid toolpath combines roughing and finishing in a single operation for shallow open-face parts]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[catia-cam-tips-cat-013|Sweeping Operation Stepover Linked to Scallop Height]]
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
- [[edgecam-cam-tips-ec-007|Waveform Adaptive Step for Varying Geometry]]
