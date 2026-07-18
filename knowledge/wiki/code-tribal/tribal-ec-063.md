---
name: tribal-ec-063
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["stock-creation", "simulation", "casting", "material-removal"]
confidence: 88
source: "web:edgecam-part-modeler"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-063.md
promoted_at: 2026-06-09T22:31:16.175Z
---

# Stock Creation for Accurate Simulation

Always define the actual stock shape in Part Modeler rather than using a generic bounding box. For castings, import the casting model as stock; for bar stock, create a cylinder or rectangle matching the raw material. For second operations, use the in-process stock from the first operation. Accurate stock definition prevents air cutting in simulation and ensures the material removal visualization matches reality.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:edgecam-part-modeler
**Operations:** all

## Related
- [[camworks-cam-tips-cw-081|Material Removal Simulation — Visual Stock Verification at Each Operation]]
- [[catia-cam-tips-cat-052|Material Removal Simulation Video Mode vs Photo Mode]]
- [[catia-cam-tips-cat-165|Material Removal Simulation with Stock Tracking Across Operations]]
- [[bobcad-cam-tips-bc-120|Part Alignment Probing for Irregular Stock]]
- [[bobcad-cam-tips-bc-216|BobCAD Stock Model Export for Digital Twin Initialization]]
