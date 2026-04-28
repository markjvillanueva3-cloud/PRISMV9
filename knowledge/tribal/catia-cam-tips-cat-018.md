---
id: "cat-018"
title: "Pencil Tracing Targets Fillet and Corner Residual Stock"
source: "web:catia-docs"
confidence: 89
category: "cam_strategy"
tags: ["catia", "pencil", "fillet", "residual", "surface-machining"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.815Z
---

# Pencil Tracing Targets Fillet and Corner Residual Stock

CATIA Pencil Tracing automatically detects concave fillets and internal corners where larger tools leave residual stock. It traces along the fillet centerline with a smaller ball-nose tool. Set the Pencil Detection Radius slightly larger than the finishing tool radius to capture all residual areas. Use 2-3 spring passes (re-trace without depth increment) to clean up deflection artifacts. Pencil operations typically run at 60-70% of normal finishing feedrate due to full radial engagement.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** pencil

## Related
- [[catia-cam-tips-cat-013|Sweeping Operation Stepover Linked to Scallop Height]]
- [[catia-cam-tips-cat-014|ZLevel Machining Optimal for Steep Walls Over 60 Degrees]]
- [[catia-cam-tips-cat-015|Contour-Driven Parallel Mode for Ruled Surface Finishing]]
- [[catia-cam-tips-cat-016|Isoparametric Machining Aligns Tool Path to UV Flow]]
- [[catia-cam-tips-cat-017|Spiral Machining for Circular Cavity and Dome Features]]
