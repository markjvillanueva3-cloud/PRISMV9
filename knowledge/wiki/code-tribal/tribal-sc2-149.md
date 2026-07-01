---
name: tribal-sc2-149
category: code-tribal
subdomain: tooling
domain: tribal-knowledge
tags: ["barrel-cutter", "lens-cutter", "tool-definition", "scallop-height", "step-over"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-149.md
promoted_at: 2026-06-09T22:31:16.692Z
---

# Barrel Cutter Definition in SURFCAM Tool Library

SURFCAM supports barrel (lens/taper/tangent) cutters defined by the barrel radius, tip radius, and taper angle. In the tool library, select 'Barrel' tool type and specify: barrel radius (typically 50-200mm), tip radius (0.5-3mm), and the barrel profile angle. The large barrel radius produces minimal scallop height at wide step-overs — a 100mm barrel radius with 3mm step-over achieves the same scallop height as a 10mm ball nose at 0.3mm step-over. This enables 5-10x cycle time reduction on large freeform surfaces.

**Category:** tooling
**Confidence:** 0.9
**Source:** web:surfcam-docs
**Operations:** finishing, 5_axis

## Related
- [[surfcam-cam-tips-sc2-153|SURFCAM Barrel Cutter Step-Over Optimization by Curvature]]
- [[bobcad-cam-tips-bc-161|BobCAD Barrel Cutter Support for Large-Step-Over Finishing]]
- [[catia-cam-tips-cat-148|Multi-Axis Barrel Cutter Support for Efficient Finishing]]
- [[cimatron-cam-tips-cim-055|Barrel Cutter Strategies for Large Step-Over Finishing]]
- [[esprit-cam-tips-esp-185|FreeForm 5-Axis Barrel Cutter Strategies for Large Surface Areas]]
