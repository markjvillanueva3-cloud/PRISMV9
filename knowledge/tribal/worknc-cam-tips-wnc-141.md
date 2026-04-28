---
id: "wnc-141"
title: "WorkNC Designer Surface Extension — Cutter Runoff for Edge Quality"
source: "web:worknc-docs"
confidence: 91
category: "cam_strategy"
tags: ["worknc-designer", "extension", "runoff", "edge-quality"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.730Z
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
