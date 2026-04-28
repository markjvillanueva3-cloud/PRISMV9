---
id: "bc-182"
title: "BobART Vector Engraving with V-Bit Depth Control"
source: "web:bobcad-docs"
confidence: 0.88
category: "cam_strategy"
tags: ["bobart", "v-bit", "engraving", "vector", "text-engraving"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.599Z
---

# BobART Vector Engraving with V-Bit Depth Control

BobART's V-bit engraving follows vector paths (lines, arcs, text) with a V-shaped cutter, producing varying-width grooves based on depth. Deeper cuts create wider lines. Set the flat depth for uniform-width engraving or enable variable-depth for artistic calligraphy effects. For text engraving, use TrueType fonts and set the engraving depth to 0.2-0.5mm for stainless steel, 0.5-1.0mm for aluminum, 1-3mm for wood. BobCAD calculates the visible line width from the V-bit angle and cut depth: width = 2 × depth × tan(angle/2). A 60° V-bit at 0.5mm depth produces a 0.58mm wide groove.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:bobcad-docs
**Operations:** engraving

## Related
- [[bobcad-cam-tips-bc-124|BobART V-Carving for Signs and Decorative Parts]]
- [[bobcad-cam-tips-bc-186|BobART 4-Axis Rotary Engraving for Cylindrical Objects]]
- [[sprutcam-cam-tips-spr-017|Engraving and Artistic Machining]]
- [[surfcam-cam-tips-sc2-017|Engraving with V-Bit and Drag Knife Support]]
- [[bobcad-cam-tips-bc-125|3D Engraving from Image to CNC Toolpath]]
