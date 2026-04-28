---
id: "mc-054"
title: "Scallop toolpath produces uniform cusp height across varying surface curvature"
source: "web:mastercam-docs"
confidence: 87
category: "cam_strategy"
tags: ["mastercam", "scallop", "3d-finishing", "cusp-height", "stepover", "freeform"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.149Z
---

# Scallop toolpath produces uniform cusp height across varying surface curvature

Mastercam's Scallop finishing toolpath adjusts stepover dynamically based on local surface curvature to maintain a constant scallop height. On flat areas the stepover is wide; on steep or tightly curved regions it narrows automatically. This gives a visually uniform finish across the entire part. Set the target scallop height to your surface finish tolerance (typically 0.005-0.01 mm for mold finishes). Scallop is the default choice for general 3D finishing on freeform surfaces.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:mastercam-docs
**Operations:** finishing, 3d_finishing

## Related
- [[edgecam-cam-tips-ec-019|3D Finish with Raster and Scallop Control]]
- [[mastercam-cam-tips-mc-042|Dynamic Mill slot width controls minimum feature size for engagement]]
- [[mastercam-cam-tips-mc-056|Parallel finishing with 45-degree cut angle hides machining marks on flat surfaces]]
- [[mastercam-cam-tips-mc-058|Hybrid finishing combines Scallop and Waterline for steep/shallow surface transitions]]
- [[mastercam-cam-tips-mc-128|Barrel cutters achieve 5–10× larger step-over than ball end mills for equivalent scallop height]]
