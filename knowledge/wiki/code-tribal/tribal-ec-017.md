---
name: tribal-ec-017
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["engraving", "v-cutter", "text", "depth-control"]
confidence: 85
source: "web:edgecam-milling"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-017.md
promoted_at: 2026-06-09T22:31:16.164Z
---

# Engraving with V-Cutter Depth Control

For text and logo engraving in Edgecam, use a V-cutter (typically 30, 60, or 90 degree) with precise Z-depth control. The line width is determined by the V-angle and depth: for a 90-degree cutter, line width equals 2x depth. Set feed rate to 50-70% of normal milling feed to prevent tool deflection on small features. Enable smoothing for curved lettering to avoid faceted corners. For filled fonts, use a pocket cycle within each character boundary.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:edgecam-milling
**Operations:** engraving

## Related
- [[bobcad-cam-tips-bc-017|Engraving with V-Carve and Text Operations]]
- [[mastercam-cam-tips-mc-145|Fine engraving toolpaths in mold work require spring-pass compensation and sharp V-tools]]
- [[surfcam-cam-tips-sc2-017|Engraving with V-Bit and Drag Knife Support]]
- [[cimatron-cam-tips-cim-024|Micro Machining for Fine Mold Details]]
- [[worknc-cam-tips-wnc-042|Micro Feature Machining for Ribs and Text]]
