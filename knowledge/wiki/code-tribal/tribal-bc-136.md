---
name: tribal-bc-136
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["v37", "stock-aware", "linking", "rapid-optimization", "cycle-time"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-136.md
promoted_at: 2026-06-09T22:31:15.965Z
---

# BobCAD V37 Stock-Aware Toolpath Linking and Rapid Moves

V37's stock-aware linking optimizes rapid traverse moves between cutting passes by detecting the current stock boundary. Instead of retracting to a fixed clearance plane, the tool rapids at the minimum safe height above the actual stock surface. For deep pockets, this reduces rapid travel by 50-70%, saving 2-5 minutes per pocket. Enable stock-aware linking in Linking Parameters > Retract Mode > Stock Clearance. Set the clearance offset to 2-5mm above stock. The system uses the in-process stock model from the previous operation for accurate clearance.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** roughing, finishing

## Related
- [[bobcad-cam-tips-bc-008|Air Cut Avoidance in Adaptive Roughing]]
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
- [[mastercam-cam-tips-mc-210|Air cut minimization uses stock-aware linking to skip regions with no material]]
- [[topsolid-cam-tips-ts-018|Stock-Aware Roughing Uses Actual Stock Shape]]
- [[worknc-cam-tips-wnc-018|Stock-Aware Roughing Uses Near-Net-Shape Input]]
