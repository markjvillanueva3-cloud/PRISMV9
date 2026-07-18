---
name: tribal-bc-175
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["nesting", "sheet-metal", "material-utilization", "placement", "optimization"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-175.md
promoted_at: 2026-06-09T22:31:15.975Z
---

# BobCAD Nesting Module for Sheet Metal Cutting Optimization

BobCAD's nesting module optimizes part placement on sheet stock to minimize material waste. Import multiple part profiles, specify quantities, and define sheet dimensions. The nesting algorithm uses a combination of bottom-left placement and genetic optimization to achieve 75-92% material utilization depending on part geometry. Set the part-to-part gap based on the cutting process: 3-5mm for plasma, 1-2mm for laser, 0.5mm for waterjet. Enable part rotation (0°, 90°, 180°, 270° or free rotation) to improve nesting density. Rectangular parts with aligned edges nest more efficiently than organic shapes.

**Category:** setup
**Confidence:** 0.88
**Source:** web:bobcad-docs
**Operations:** contouring, cutting

## Related
- [[bobcad-cam-tips-bc-075|True-Shape Nesting for Maximum Sheet Yield]]
- [[bobcad-cam-tips-bc-178|BobCAD Nesting Tab and Micro-Joint Placement for Sheet Parts]]
- [[mastercam-cam-tips-mc-237|Remnant management system tracks partial sheets for maximum material utilization across jobs]]
- [[bobcad-cam-tips-bc-176|BobCAD True-Shape Nesting vs Rectangular Nesting]]
- [[bobcad-cam-tips-bc-177|BobCAD Nesting with Common-Line Cutting]]
