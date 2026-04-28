---
id: "esp-097"
title: "Scallop Height Control for Predictable Surface Finish"
source: "web:esprit-surface-quality"
confidence: 90
category: "surface_finish"
tags: ["scallop", "surface-finish", "ball-nose", "stepover"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.517Z
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
