---
name: tribal-ts-018
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["stock-aware", "casting", "forging", "cycle-time"]
confidence: 92
source: "web:topsolid-stock"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-018.md
promoted_at: 2026-05-26T16:07:20.690Z
---

# Stock-Aware Roughing Uses Actual Stock Shape

TopSolid's stock-aware roughing reads the actual stock model (casting, forging, or pre-machined state) rather than assuming a rectangular billet. This eliminates massive air-cutting passes on near-net-shape stock. Import the stock model as STEP or define it from the casting drawing, then enable 'Use stock model' in the roughing operation. For castings with 2-5 mm stock allowance, this typically saves 30-60% of roughing cycle time.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:topsolid-stock
**Operations:** roughing

## Related
- [[worknc-cam-tips-wnc-018|Stock-Aware Roughing Uses Near-Net-Shape Input]]
- [[bobcad-cam-tips-bc-008|Air Cut Avoidance in Adaptive Roughing]]
- [[bobcad-cam-tips-bc-136|BobCAD V37 Stock-Aware Toolpath Linking and Rapid Moves]]
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
- [[catia-cam-tips-cat-097|Stock Definition Accuracy Prevents Air Cutting and Crashes]]
