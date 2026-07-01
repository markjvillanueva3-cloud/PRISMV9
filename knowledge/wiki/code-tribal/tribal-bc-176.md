---
name: tribal-bc-176
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["nesting", "true-shape", "rectangular", "material-savings", "scrap-reduction"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-176.md
promoted_at: 2026-06-09T22:31:15.975Z
---

# BobCAD True-Shape Nesting vs Rectangular Nesting

BobCAD offers true-shape nesting (parts fit together based on actual contour) and rectangular bounding-box nesting. True-shape nesting achieves 10-25% better material utilization for irregular parts by fitting concavities into convexities. However, it requires longer computation time (30 seconds to 5 minutes for 100+ parts). Rectangular nesting computes instantly and works well for parts that are roughly rectangular. For production shops cutting 50+ sheets per day, the material savings from true-shape nesting (5-15% less scrap) more than justify the computational overhead. Use rectangular nesting for quick estimates.

**Category:** setup
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** contouring, cutting

## Related
- [[bobcad-cam-tips-bc-075|True-Shape Nesting for Maximum Sheet Yield]]
- [[bobcad-cam-tips-bc-175|BobCAD Nesting Module for Sheet Metal Cutting Optimization]]
- [[bobcad-cam-tips-bc-177|BobCAD Nesting with Common-Line Cutting]]
- [[bobcad-cam-tips-bc-178|BobCAD Nesting Tab and Micro-Joint Placement for Sheet Parts]]
- [[bobcad-cam-tips-bc-179|BobCAD Nesting Cutting Sequence Optimization]]
