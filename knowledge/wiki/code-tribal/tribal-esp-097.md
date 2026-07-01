---
name: tribal-esp-097
category: code-tribal
subdomain: surface_finish
domain: tribal-knowledge
tags: ["scallop", "surface-finish", "ball-nose", "stepover"]
confidence: 90
source: "web:esprit-surface-quality"
promoted_from: knowledge/tribal/esprit-cam-tips-esp-097.md
promoted_at: 2026-05-26T16:07:20.262Z
---

# Scallop Height Control for Predictable Surface Finish

ESPRIT calculates the theoretical scallop height from the tool geometry, stepover, and surface curvature. For a ball-nose cutter of radius R with stepover S on a flat surface, scallop height h ≈ S²/(8R). For a 10mm ball nose at 0.3mm stepover, h ≈ 0.0011mm. On curved surfaces the effective radius changes — ESPRIT adjusts stepover automatically when 'constant scallop' mode is enabled. Target scallop heights: 0.01mm for semi-finish, 0.002-0.005mm for finish, <0.001mm for mirror.

**Category:** surface_finish
**Confidence:** 90
**Source:** web:esprit-surface-quality
**Operations:** 3d_finishing

## Related
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
- [[gibbscam-cam-tips-gc-104|Scallop height calculation drives stepover selection for target Ra]]
- [[surfcam-cam-tips-sc2-081|Scallop Height Control for Predictable Surface Finish]]
- [[catia-cam-tips-cat-013|Sweeping Operation Stepover Linked to Scallop Height]]
- [[edgecam-cam-tips-ec-175|Barrel Cutter Selection for Large Surface Stepovers]]
