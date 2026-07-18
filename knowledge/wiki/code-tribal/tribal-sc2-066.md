---
name: tribal-sc2-066
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["gouge-check", "tolerance-band", "surface-deviation", "quality"]
confidence: 88
source: "web:surfcam-gouge-check"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-066.md
promoted_at: 2026-06-09T22:31:16.675Z
---

# Gouge Check with Tolerance Band for Surface Quality

SURFCAM gouge checking compares the toolpath-generated surface against the design surface within a tolerance band. Set the tolerance to ±0.005mm for precision mold work and ±0.02mm for general machining. Points where the tool cuts deeper than the negative tolerance are gouges (too deep). Points where the tool leaves material beyond the positive tolerance indicate insufficient cleanup (too shallow). Both conditions are flagged with distinct colors in the verification display.

**Category:** setup
**Confidence:** 88
**Source:** web:surfcam-gouge-check
**Operations:** verification, finishing

## Related
- [[bobcad-cam-tips-bc-084|Gouge Check with Deviation Color Map]]
- [[bobcad-cam-tips-bc-012|Pocket Milling with Gouge Check for Neighboring Walls]]
- [[bobcad-cam-tips-bc-162|BobCAD Barrel Cutter 5-Axis Tilt Control for Wall Surfaces]]
- [[cimatron-cam-tips-cim-010|Tool Assembly Collision Checking]]
- [[cimatron-cam-tips-cim-093|Collision Checking with Complete Tool Assembly]]
