---
name: tribal-sc2-145
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["4-axis", "rotary-wrapping", "cylindrical", "c-axis", "wrap-diameter"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-145.md
promoted_at: 2026-06-09T22:31:16.691Z
---

# SURFCAM 4-Axis Rotary Wrapping for Cylindrical Parts

SURFCAM's 4-axis rotary wrapping converts a flat 2D/3D toolpath into rotary axis motion around a cylindrical workpiece. The XY toolpath is mapped to C-axis rotation and Z-axis translation, with Y-axis providing radial depth. Set the wrap diameter to match the part OD precisely — even 0.1mm error causes depth-of-cut variation around the circumference. For parts with varying diameters (tapers, steps), use multiple wrapping operations with different diameters for each section.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:surfcam-docs
**Operations:** 4_axis, contouring

## Related
- [[cimatron-cam-tips-cim-065|Rotary Axis Wrapping for Cylindrical Features]]
- [[cimatron-cam-tips-cim-163|Rotary Axis Wrapping for Round Mold Components]]
- [[fusion360-cam-tips-ext-f360-061|Rotary 4-Axis Wrapping for Cylindrical Parts]]
- [[hypermill-cam-tips-ext-hm-171|Rotary Axis Wrapping for 4-Axis Parts]]
- [[mastercam-cam-tips-mc-073|Rotary Advanced toolpath wraps 2D geometry around cylindrical surfaces]]
