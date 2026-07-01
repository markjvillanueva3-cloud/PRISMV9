---
name: tribal-sc2-121
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["multi-tool-rest", "progressive", "tool-chain", "threshold"]
confidence: 89
source: "web:surfcam-multi-tool-rest"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-121.md
promoted_at: 2026-06-09T22:31:16.686Z
---

# Multi-Tool Rest Chain for Progressive Refinement

SURFCAM supports multi-tool rest chains where each smaller tool machines only the material left by the previous larger tool. A typical chain: 50mm face mill → 20mm roughing → 12mm semi-finish → 6mm rest finish → 3mm pencil trace. Each operation references the stock model from all previous operations. Order tools from largest to smallest. Set the minimum rest material threshold to 80% of the current tool's stepover to avoid generating tiny fragments.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-multi-tool-rest
**Operations:** rest_machining

## Related
- [[catia-cam-tips-cat-108|Multi-Tool Rest Machining for Progressive Corner Cleanup]]
- [[bobcad-cam-tips-bc-063|Skim Cuts for Progressive Surface Finish Improvement]]
- [[bobcad-cam-tips-bc-208|BobCAD Dynamic Roughing Depth Strategy for Deep Pockets]]
- [[catia-cam-tips-cat-194|Die Machining Draft Angle Strategy for Progressive Dies]]
- [[cimatron-cam-tips-cim-068|Rib Machining for Deep Thin Features]]
