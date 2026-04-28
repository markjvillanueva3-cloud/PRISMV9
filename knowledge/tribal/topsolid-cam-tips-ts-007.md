---
id: "ts-007"
title: "Hybrid Solid-Surface Modeling for Complex Stock Definitions"
source: "web:topsolid-hybrid"
confidence: 90
category: "cam_strategy"
tags: ["hybrid-modeling", "stock", "casting", "forging"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.392Z
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
