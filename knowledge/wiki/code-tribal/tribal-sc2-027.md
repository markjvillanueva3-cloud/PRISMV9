---
name: tribal-sc2-027
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["spiral", "axisymmetric", "continuous-path", "chip-evacuation"]
confidence: 88
source: "web:surfcam-3axis-spiral"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-027.md
promoted_at: 2026-06-09T22:31:16.667Z
---

# Spiral Finishing for Round and Axisymmetric Features

SURFCAM spiral machining generates a continuous spiral toolpath from the center outward (or perimeter inward) for round, dish-shaped, or axisymmetric features. The continuous spiral eliminates the retract/reposition moves of raster patterns, reducing cycle time by 15-25% on suitable geometry. Set the spiral stepover based on cusp height. Use 'Inside-out' spiral for blind features (better chip evacuation) and 'Outside-in' for open features (better surface finish at center).

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-3axis-spiral
**Operations:** finishing, 3d_milling

## Related
- [[bobcad-cam-tips-bc-025|Spiral Finishing for Axisymmetric Features]]
- [[camworks-cam-tips-cw-041|Offset Finishing — Outward-Spiral Toolpath for Contoured Surfaces]]
- [[camworks-cam-tips-cw-042|Spiral Finishing — Continuous Single-Path Motion Eliminates Step Marks]]
- [[catia-cam-tips-cat-001|Pocketing Spiral vs Zigzag Tool Path Style Selection]]
- [[catia-cam-tips-cat-017|Spiral Machining for Circular Cavity and Dome Features]]
