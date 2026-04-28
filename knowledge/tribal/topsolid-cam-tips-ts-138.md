---
id: "ts-138"
title: "TopSolid'Design Assembly Context — Machine Parts in Assembly Position"
source: "web:topsolid-docs"
confidence: 90
category: "cam_strategy"
tags: ["topsolid", "design", "assembly", "context", "collision"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.491Z
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
