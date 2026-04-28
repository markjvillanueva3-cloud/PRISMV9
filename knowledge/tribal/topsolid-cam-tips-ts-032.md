---
id: "ts-032"
title: "Cleanup Finishing Removes Residual Cusps Between Strategies"
source: "web:topsolid-cleanup"
confidence: 89
category: "cam_strategy"
tags: ["cleanup", "transition", "blending", "cusps"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.411Z
---

# Cleanup Finishing Removes Residual Cusps Between Strategies

After combining steep/shallow finishing, use TopSolid's cleanup finishing to remove any residual cusps or ridges at strategy transition boundaries. The cleanup operation detects boundary regions where two finishing strategies meet and generates additional passes with tight stepover (50% of normal) to blend the surfaces. Set the detection width to 2-3x the finishing stepover to ensure complete coverage of transition zones.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:topsolid-cleanup
**Operations:** finishing, 3d_finishing

## Related
- [[worknc-cam-tips-wnc-034|Cleanup Finishing Blends Strategy Transitions]]
- [[bobcad-cam-tips-bc-032|Cleanup Operations with Small Tools for Residual Material]]
- [[camworks-cam-tips-cw-037|Pencil Trace — Clean Internal Fillets and Blend Regions]]
- [[catia-cam-tips-cat-138|Surface Machining Pencil Tracing for Fillet Cleanup]]
- [[cimatron-cam-tips-cim-005|Pencil Milling for Corner Cleanup]]
