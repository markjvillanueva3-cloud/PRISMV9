---
name: tribal-ts-141
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "design", "import", "healing", "geometry-repair"]
confidence: 90
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-141.md
promoted_at: 2026-05-26T16:07:21.150Z
---

# TopSolid'Design Import Healing — Automatic Repair of Imported Geometry

TopSolid'Design includes automatic geometry healing for imported STEP/IGES/Parasolid files. The healer fixes: gaps between adjacent surfaces (< 0.01mm), overlapping face boundaries, degenerate edges, and missing faces. After healing, the model is a valid solid suitable for CAM operations. For stubborn imports that resist automatic healing, use the 'Repair Assistant' which highlights problem areas and offers interactive repair options. Always verify the healed model volume against the source — a volume difference > 0.1% indicates a significant repair error.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-docs
**Operations:** general

## Related
- [[topsolid-cam-tips-ts-134|TopSolid'Design Seamless CAD-to-CAM — No File Translation Required]]
- [[topsolid-cam-tips-ts-135|TopSolid'Design Fixture Design — CAD and CAM in One Environment]]
- [[topsolid-cam-tips-ts-136|TopSolid'Design Sheet Metal — Flat Pattern to CNC Laser/Punch]]
- [[topsolid-cam-tips-ts-138|TopSolid'Design Assembly Context — Machine Parts in Assembly Position]]
- [[topsolid-cam-tips-ts-139|TopSolid'Design Surface Modeling — Complex Shapes for Mold and Die]]
