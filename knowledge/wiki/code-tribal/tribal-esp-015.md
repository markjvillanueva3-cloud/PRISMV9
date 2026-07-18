---
name: tribal-esp-015
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["spiral", "finishing", "retract-marks", "continuous-toolpath"]
confidence: 87
source: "web:esprit-3d-machining"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-015.md
promoted_at: 2026-06-09T22:31:16.217Z
---

# Spiral Finishing Eliminates Retract Marks

ESPRIT's spiral finishing generates a continuous spiral toolpath from the center outward (or outside inward), eliminating the retract/reposition marks that occur with raster strategies. This is particularly effective for dish-shaped and bowl geometries. Set the spiral pitch based on target scallop height and enable 'smooth spiral transitions' to avoid acceleration marks at the spiral center where the radius of curvature approaches zero.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:esprit-3d-machining
**Operations:** 3d_finishing, spiral

## Related
- [[camworks-cam-tips-cw-042|Spiral Finishing — Continuous Single-Path Motion Eliminates Step Marks]]
- [[cimatron-cam-tips-cim-011|Spiral Finishing for Flat and Near-Flat Areas]]
- [[gibbscam-cam-tips-gc-016|Spiral machining eliminates retract moves for continuous engagement]]
- [[nx-cam-tips-ext-nx-051|Z-Level Profile Finishing with Merge Distance Control]]
- [[sprutcam-cam-tips-spr-059|Spiral Finishing for Flat-Bottomed Pockets]]
