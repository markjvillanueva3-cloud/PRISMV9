---
id: "spr-123"
title: "Constant Scallop Height Finishing"
source: "web:sprutcam-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["constant-scallop", "variable-step-over", "curvature", "quality"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.973Z
---

# Constant Scallop Height Finishing

Varies step-over by surface curvature for uniform scallop. Set target (0.005mm for polish-ready). 20-30% shorter cycle than fixed step-over. Essential for mold surfaces needing consistent polish across varying curvature. SprutCAM computes the local effective ball radius at each point for precise scallop control.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:sprutcam-docs
**Operations:** finishing

## Related
- [[cimatron-cam-tips-cim-072|Constant Scallop Height Finishing]]
- [[tebis-cam-tips-teb-071|Constant Scallop Height Finishing]]
- [[hypermill-cam-tips-ext-hm-137|Constant Scallop Height Finishing]]
- [[tebis-cam-tips-teb-044|Constant Scallop Adapts Step-Over to Local Surface Curvature]]
- [[nx-cam-tips-ext-nx-072|Hub Finishing with Constant-Scallop Step-Over]]
