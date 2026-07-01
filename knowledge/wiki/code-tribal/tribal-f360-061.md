---
name: tribal-f360-061
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "4-axis", "rotary", "wrapping", "cylindrical"]
confidence: 85
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-061.md
promoted_at: 2026-06-09T22:31:16.267Z
---

# Rotary 4-Axis Wrapping for Cylindrical Parts

For 4-axis rotary machining, use the Wrap option in 3D strategies (Parallel, Contour, Scallop) to project flat toolpaths onto a cylindrical surface. Set the wrapping axis to match your machine's rotary axis (typically A or B). The key parameter is the Wrap Radius — it must exactly match the part's outer radius at the machining surface. A mismatch of even 0.5mm causes non-uniform depth of cut around the circumference.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:fusion360-docs
**Operations:** rotary_4axis

## Related
- [[cimatron-cam-tips-cim-065|Rotary Axis Wrapping for Cylindrical Features]]
- [[cimatron-cam-tips-cim-163|Rotary Axis Wrapping for Round Mold Components]]
- [[hypermill-cam-tips-ext-hm-171|Rotary Axis Wrapping for 4-Axis Parts]]
- [[mastercam-cam-tips-mc-073|Rotary Advanced toolpath wraps 2D geometry around cylindrical surfaces]]
- [[nx-cam-tips-nx-033|Rotary Roughing for Cylindrical Turn-Mill Parts]]
