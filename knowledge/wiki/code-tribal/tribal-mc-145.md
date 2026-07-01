---
name: tribal-mc-145
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "engraving", "mold", "v-cutter", "spring-pass", "text"]
confidence: 83
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-145.md
promoted_at: 2026-06-09T22:31:16.431Z
---

# Fine engraving toolpaths in mold work require spring-pass compensation and sharp V-tools

Engraving text, logos, and date stamps into mold surfaces requires special treatment in Mastercam. Use the Engrave toolpath with a sharp V-cutter (30–60° included angle, carbide or diamond-coated). Set the engraving depth to 0.05–0.15 mm for text and 0.2–0.5 mm for logos. Program a spring pass (a second pass at the same depth with zero additional stock) to clean up any material spring-back, which is significant in hardened steels. The feed rate should be very low (50–150 mm/min) to maintain sharp corners in small text. For curved surfaces, use 3D engraving that projects the text onto the surface and adjusts Z-depth to follow curvature. Minimum text height for reliable machining is approximately 3 mm at 0.1 mm depth with a 30° V-cutter.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:community
**Operations:** finishing, mold_die

## Related
- [[edgecam-cam-tips-ec-017|Engraving with V-Cutter Depth Control]]
- [[mastercam-cam-tips-mc-043|OptiRough Critical Depths in 2026 flatten stepped floors automatically]]
- [[mastercam-cam-tips-mc-073|Rotary Advanced toolpath wraps 2D geometry around cylindrical surfaces]]
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
- [[mastercam-cam-tips-mc-142|Electrode creation from solid bodies automates EDM electrode design and machining]]
