---
name: tribal-bc-025
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["spiral", "axisymmetric", "continuous", "chip-evacuation"]
confidence: 88
source: "web:bobcad-spiral"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-025.md
promoted_at: 2026-06-09T22:31:15.938Z
---

# Spiral Finishing for Axisymmetric Features

BobCAD spiral machining generates continuous spiral toolpaths for round, dish-shaped, and axisymmetric features. The continuous path eliminates retract/reposition moves of raster patterns, reducing cycle time by 15-25%. Use 'Inside-out' for blind features (better chip evacuation) and 'Outside-in' for open features (better center finish). Set spiral stepover based on cusp height. For large circular pockets, combine spiral roughing with spiral finishing for maximum efficiency.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:bobcad-spiral
**Operations:** finishing, 3d_milling

## Related
- [[surfcam-cam-tips-sc2-027|Spiral Finishing for Round and Axisymmetric Features]]
- [[camworks-cam-tips-cw-042|Spiral Finishing — Continuous Single-Path Motion Eliminates Step Marks]]
- [[cimatron-cam-tips-cim-098|Spiral Finishing for Flat Pocket Floors]]
- [[gibbscam-cam-tips-gc-016|Spiral machining eliminates retract moves for continuous engagement]]
- [[mastercam-cam-tips-mc-259|Equal Scallop spiral pattern eliminates step-marks by using continuous spiral motion instead of offset rows]]
