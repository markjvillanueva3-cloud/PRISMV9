---
name: tribal-bc-181
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["bobart", "image-to-relief", "grayscale", "artistic", "decorative"]
confidence: 0
source: "web:bobcad-docs"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-181.md
promoted_at: 2026-06-09T22:31:15.976Z
---

# BobART Image-to-Relief Conversion for Artistic Machining

BobART converts grayscale images (JPG, PNG, BMP) into 3D relief models for CNC machining. White pixels become the highest points, black pixels the lowest. Set the relief depth (typically 3-15mm for decorative panels) and the XY dimensions. The conversion resolution depends on image resolution — minimum 300 DPI for features >0.5mm. For photographic images, apply BobART's smoothing filter (radius 3-5 pixels) to eliminate machining artifacts from image noise. For line art and logos, use no smoothing to maintain sharp edges. Export the relief as an STL for machining with BobCAD's standard 3D strategies.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** engraving, finishing

## Related
- [[bobcad-cam-tips-bc-125|3D Engraving from Image to CNC Toolpath]]
- [[bobcad-cam-tips-bc-126|Artistic Machining with Relief Model Compositing]]
- [[bobcad-cam-tips-bc-184|BobART Texture Mapping for Surface Finishing Effects]]
- [[bobcad-cam-tips-bc-124|BobART V-Carving for Signs and Decorative Parts]]
- [[bobcad-cam-tips-bc-182|BobART Vector Engraving with V-Bit Depth Control]]
