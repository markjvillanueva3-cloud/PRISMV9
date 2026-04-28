---
id: "esp-014"
title: "Scallop-Based Finishing Maintains Constant Cusp Height"
source: "web:esprit-3d-machining"
confidence: 90
category: "surface_finish"
tags: ["scallop", "cusp-height", "finishing", "surface-quality"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.450Z
---

# Scallop-Based Finishing Maintains Constant Cusp Height

ESPRIT's scallop machining adjusts the stepover dynamically to maintain a constant scallop (cusp) height across the entire surface, regardless of surface curvature. On flat areas the stepover increases; on steep areas it decreases. Set the target scallop height to 0.005-0.01mm for semi-finish and 0.001-0.003mm for finish. This eliminates the visible banding that occurs with constant-stepover strategies on surfaces with varying curvature.

**Category:** surface_finish
**Confidence:** 90
**Source:** web:esprit-3d-machining
**Operations:** 3d_finishing, scallop

## Related
- [[surfcam-cam-tips-sc2-026|Scallop-Based Stepover for Constant Cusp Height]]
- [[bobcad-cam-tips-bc-024|Scallop Machining with Constant Cusp Height]]
- [[camworks-cam-tips-cw-039|Scallop Finishing — Constant Cusp Height Across Variable Curvature]]
- [[camworks-cam-tips-cw-111|Scallop Height Control — Calculate Step-Over for Target Ra]]
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
