---
name: tribal-teb-017
category: code-tribal
subdomain: roughing
domain: tribal-knowledge
tags: ["level", "z-step", "contour-parallel", "zigzag"]
confidence: 91
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-017.md
promoted_at: 2026-05-26T16:07:20.612Z
---

# Level-Based Roughing Machines Flat Layers at Fixed Z Heights

Tebis level roughing cuts material in horizontal layers at fixed Z increments. Set the Z step based on axial depth of cut (typically 1.0-1.5xD for carbide endmills in steel). Each layer follows a 2D contour-parallel or zigzag pattern. Use contour-parallel for curved pockets and zigzag for open areas. Enable spiral entry (helical ramp) to avoid plunging. Overlap between layers should be 5-10% of the Z step to avoid material ridges.

**Category:** roughing
**Confidence:** 91
**Source:** web:tebis-docs
**Operations:** roughing

## Related
- [[bobcad-cam-tips-bc-162|BobCAD Barrel Cutter 5-Axis Tilt Control for Wall Surfaces]]
- [[gibbscam-cam-tips-gc-014|Waterline roughing with constant Z-step provides predictable load per level]]
- [[mastercam-cam-tips-mc-060|Waterline finishing is mandatory for steep walls above 60 degrees]]
- [[surfcam-cam-tips-sc2-031|Waterline Roughing with Multi-Level Z-Step Control]]
- [[surfcam-cam-tips-sc2-150|SURFCAM Barrel Cutter Tilt Strategy for Wall Finishing]]
