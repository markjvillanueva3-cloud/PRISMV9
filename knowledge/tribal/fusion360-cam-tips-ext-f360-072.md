---
id: "f360-072"
title: "Engrave with Trace Strategy and V-Bit Depth Control"
source: "web:fusion360-docs"
confidence: 85
category: "cam_strategy"
tags: ["fusion360", "engrave", "trace", "v-bit", "text"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.684Z
---

# Engrave with Trace Strategy and V-Bit Depth Control

For engraving text and logos, use the Trace strategy with a V-bit (60 or 90 degree) rather than 2D Contour. Trace follows the centerline of the sketch geometry, and the V-bit depth determines the width of the engraved line. Set the Maximum Stepdown to 0.1-0.3mm per pass to avoid burying the V-bit in a single plunge. For variable-width engraving, adjust the depth per character — deeper cuts produce wider strokes. A 60-degree V-bit creates narrower, more refined text than a 90-degree.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:fusion360-docs
**Operations:** trace, engrave

## Related
- [[surfcam-cam-tips-sc2-017|Engraving with V-Bit and Drag Knife Support]]
- [[fusion360-cam-tips-ext-f360-040|Fine-Tune Optimal Load by Material Hardness]]
- [[fusion360-cam-tips-ext-f360-041|Multi-Depth Adaptive with Progressive Stepdown]]
- [[fusion360-cam-tips-ext-f360-042|Rest Machining Adaptive with Tight Tolerance Overlap]]
- [[fusion360-cam-tips-ext-f360-043|Separate Radial and Axial Stock-to-Leave for Adaptive]]
