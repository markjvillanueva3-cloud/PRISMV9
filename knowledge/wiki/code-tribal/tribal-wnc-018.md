---
name: tribal-wnc-018
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["stock-aware", "casting", "near-net-shape", "cycle-time"]
confidence: 91
source: "web:worknc-stockaware"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-018.md
promoted_at: 2026-05-26T16:07:21.387Z
---

# Stock-Aware Roughing Uses Near-Net-Shape Input

WorkNC's stock-aware roughing imports the actual stock geometry (casting, forging, or pre-machined state) and generates toolpaths only where material exists. Import the stock model as STL or native CAD format. The system compares the stock to the part model at each Z-level and eliminates passes over already-clear areas. For castings with 3-8 mm allowance, this typically saves 30-50% of roughing time.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-stockaware
**Operations:** roughing

## Related
- [[topsolid-cam-tips-ts-018|Stock-Aware Roughing Uses Actual Stock Shape]]
- [[bobcad-cam-tips-bc-008|Air Cut Avoidance in Adaptive Roughing]]
- [[bobcad-cam-tips-bc-136|BobCAD V37 Stock-Aware Toolpath Linking and Rapid Moves]]
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
- [[mastercam-cam-tips-mc-298|Mastercam OptiRough morphing between roughing levels maximizes material removal on near-net-shape stock]]
