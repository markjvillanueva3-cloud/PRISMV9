---
name: tribal-esp-019
category: code-tribal
subdomain: surface_finish
domain: tribal-knowledge
tags: ["waterline", "z-level", "wall-quality", "scallop"]
confidence: 89
source: "web:esprit-3d-machining"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-019.md
promoted_at: 2026-06-09T22:31:16.217Z
---

# Waterline Finishing Controls Wall Quality

ESPRIT's waterline (constant-Z) finishing excels on steep walls where raster strategies produce excessive scallop heights. Set the Z-step based on the maximum allowed scallop height: for a ball-nose cutter of radius R and scallop height h, the Z-step ≈ 2×√(2Rh). For a 10mm ball nose with 0.005mm scallop, Z-step ≈ 0.63mm. Enable 'extend to floor' to continue waterline passes slightly past the steep/shallow boundary for clean transitions.

**Category:** surface_finish
**Confidence:** 89
**Source:** web:esprit-3d-machining
**Operations:** 3d_finishing, z_level

## Related
- [[edgecam-cam-tips-ec-024|Z-Level Finishing for Steep Walls]]
- [[bobcad-cam-tips-bc-021|Z-Level Finishing for Steep Walls Over 30 Degrees]]
- [[bobcad-cam-tips-bc-029|Waterline Roughing for Cavity and Core Work]]
- [[camworks-cam-tips-cw-033|Z-Level Roughing — Waterline Strategy for 3D Cavity Stock Removal]]
- [[mastercam-cam-tips-mc-058|Hybrid finishing combines Scallop and Waterline for steep/shallow surface transitions]]
