---
name: tribal-ts-150
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "electrode", "design", "extraction", "spark-gap"]
confidence: 92
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-150.md
promoted_at: 2026-05-26T16:07:21.163Z
---

# TopSolid Electrode Design — Automatic Electrode Extraction from Cavity

TopSolid automates electrode design: select the cavity region that requires EDM, define the spark gap (typically 0.1-0.3mm for roughing, 0.01-0.05mm for finishing), and TopSolid generates the electrode shape as the inverse of the cavity with spark gap offset. The system handles split electrodes for undercuts, electrode extensions for deep features, and electrode mounting features (EROWA/System 3R compatibility). Each electrode is generated as a separate part file linked to the parent cavity — when the cavity changes, electrodes update automatically.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:topsolid-docs
**Operations:** edm

## Related
- [[worknc-cam-tips-wnc-145|WorkNC Designer Electrode Geometry — Extracting Burn Shapes]]
- [[topsolid-cam-tips-ts-134|TopSolid'Design Seamless CAD-to-CAM — No File Translation Required]]
- [[topsolid-cam-tips-ts-135|TopSolid'Design Fixture Design — CAD and CAM in One Environment]]
- [[topsolid-cam-tips-ts-136|TopSolid'Design Sheet Metal — Flat Pattern to CNC Laser/Punch]]
- [[topsolid-cam-tips-ts-138|TopSolid'Design Assembly Context — Machine Parts in Assembly Position]]
