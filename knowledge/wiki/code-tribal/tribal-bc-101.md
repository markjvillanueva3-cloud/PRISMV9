---
name: tribal-bc-101
category: code-tribal
subdomain: surface_quality
domain: tribal-knowledge
tags: ["smooth-flow", "arc-fitting", "hsm", "file-size", "v37"]
confidence: 89
source: "web:bobcad-smooth-flow"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-101.md
promoted_at: 2026-06-09T22:31:15.957Z
---

# Smooth Flow and Arc Fitting for HSM Controllers

BobCAD's smooth flow toolpaths with arc fitting replace dense linear segments with G02/G03 arcs where deviation stays within tolerance. This reduces NC file size by 40-80% and allows HSM controllers to maintain higher feed rates (arc blocks process faster than linear). Set arc fitting tolerance to 50% of surface tolerance. Enable for all 3D finishing. V37 adds corner smoothing that inserts small arcs at direction changes to maintain machine speed through tight transitions.

**Category:** surface_quality
**Confidence:** 89
**Source:** web:bobcad-smooth-flow
**Operations:** finishing, 3d_milling

## Related
- [[worknc-cam-tips-wnc-046|Arc Fitting Reduces File Size and Improves Motion]]
- [[camworks-cam-tips-cw-096|Smooth Flow — Arc Fitting and Linear-to-Arc Conversion]]
- [[catia-cam-tips-cat-095|Smooth Flow Tool Path Transitions Eliminate Dwell Marks]]
- [[mastercam-cam-tips-mc-077|Smooth flow toolpaths maintain constant velocity for glass-like finishes]]
- [[surfcam-cam-tips-sc2-091|Smooth Flow Toolpaths for Continuous Machine Motion]]
