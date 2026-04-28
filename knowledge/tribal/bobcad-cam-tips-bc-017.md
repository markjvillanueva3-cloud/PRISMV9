---
id: "bc-017"
title: "Engraving with V-Carve and Text Operations"
source: "web:bobcad-engraving"
confidence: 87
category: "cam_strategy"
tags: ["engraving", "v-carve", "text", "truetype", "depth-control"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.457Z
---

# Engraving with V-Carve and Text Operations

BobCAD engraving supports V-bit tools (30°, 60°, 90°) with depth-controlled paths for text and logos. The cut depth determines character line width — deeper cuts produce wider lines. For TrueType font text, use the built-in text creation tool then apply the engrave operation. Set plunge rate to 50% of feed rate. Retract between characters to prevent drag marks. For curved surfaces, use the 3D projection option to conform text to the surface model.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:bobcad-engraving
**Operations:** engraving

## Related
- [[edgecam-cam-tips-ec-017|Engraving with V-Cutter Depth Control]]
- [[surfcam-cam-tips-sc2-017|Engraving with V-Bit and Drag Knife Support]]
- [[cimatron-cam-tips-cim-024|Micro Machining for Fine Mold Details]]
- [[mastercam-cam-tips-mc-145|Fine engraving toolpaths in mold work require spring-pass compensation and sharp V-tools]]
- [[worknc-cam-tips-wnc-042|Micro Feature Machining for Ribs and Text]]
