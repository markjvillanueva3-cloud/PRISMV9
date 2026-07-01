---
name: tribal-wnc-141
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["worknc-designer", "extension", "runoff", "edge-quality"]
confidence: 91
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-141.md
promoted_at: 2026-05-26T16:07:21.620Z
---

# WorkNC Designer Surface Extension — Cutter Runoff for Edge Quality

Extend part surfaces 5-10mm beyond the trim boundary so the cutter can run off the edge smoothly rather than stopping at the boundary. Without extension, the tool decelerates at the edge, leaving dwell marks. WorkNC Designer's 'Extend Surface' command continues the surface curvature naturally beyond the boundary. For mold parting surfaces, extend both core and cavity surfaces beyond the split line. The extension is used only for toolpath computation — the actual part boundary is maintained by the trim operation.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-docs
**Operations:** finishing

## Related
- [[worknc-cam-tips-wnc-140|WorkNC Designer — Surface Preparation for CAM]]
- [[worknc-cam-tips-wnc-142|WorkNC Designer Gap Filling — Repairing Imported Model Defects]]
- [[worknc-cam-tips-wnc-143|WorkNC Designer Check Surfaces — Controlling Tool Approach Boundaries]]
- [[worknc-cam-tips-wnc-144|WorkNC Designer Parting Line Creation — Core and Cavity Split]]
- [[worknc-cam-tips-wnc-145|WorkNC Designer Electrode Geometry — Extracting Burn Shapes]]
