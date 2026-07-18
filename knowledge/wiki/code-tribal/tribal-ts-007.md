---
name: tribal-ts-007
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["hybrid-modeling", "stock", "casting", "forging"]
confidence: 90
source: "web:topsolid-hybrid"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-007.md
promoted_at: 2026-05-26T16:07:20.673Z
---

# Hybrid Solid-Surface Modeling for Complex Stock Definitions

TopSolid supports hybrid solid/surface modeling within the CAM environment, allowing you to define complex stock shapes that combine solid geometry with trimmed surface boundaries. Use this when machining castings or forgings where the stock shape is irregular. Define the stock as a hybrid body referencing the casting model, and all roughing operations will automatically respect the actual stock contour rather than assuming a rectangular billet.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-hybrid
**Operations:** roughing

## Related
- [[catia-cam-tips-cat-097|Stock Definition Accuracy Prevents Air Cutting and Crashes]]
- [[tebis-cam-tips-teb-027|Blank Geometry Definition Matches Raw Material Shape]]
- [[esprit-cam-tips-esp-116|Alignment Probing for Castings and Forgings]]
- [[gibbscam-cam-tips-gc-029|VoluMill air-cut elimination uses stock model to skip empty regions]]
- [[mastercam-cam-tips-mc-298|Mastercam OptiRough morphing between roughing levels maximizes material removal on near-net-shape stock]]
