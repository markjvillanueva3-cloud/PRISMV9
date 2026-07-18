---
name: tribal-ts-138
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "design", "assembly", "context", "collision"]
confidence: 90
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-138.md
promoted_at: 2026-05-26T16:07:21.146Z
---

# TopSolid'Design Assembly Context — Machine Parts in Assembly Position

TopSolid allows machining parts within their assembly context. The assembly provides collision bodies (adjacent parts, housing walls, fasteners) that the toolpath must avoid. This is critical for assembly-level machining operations: match-drilling bolt holes through mated parts, face milling assembly interfaces, and machining features that reference mating part geometry. The assembly context also enables programming of multi-part fixture setups where several parts are machined in one clamping.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-docs
**Operations:** milling, drilling

## Related
- [[topsolid-cam-tips-ts-003|Assembly Machining Respects Full Machine Context]]
- [[topsolid-cam-tips-ts-126|TopSolid'Cam 7 Tool Assembly Builder — 3D Tool and Holder Stacks]]
- [[topsolid-cam-tips-ts-134|TopSolid'Design Seamless CAD-to-CAM — No File Translation Required]]
- [[topsolid-cam-tips-ts-135|TopSolid'Design Fixture Design — CAD and CAM in One Environment]]
- [[topsolid-cam-tips-ts-136|TopSolid'Design Sheet Metal — Flat Pattern to CNC Laser/Punch]]
