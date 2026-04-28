---
id: "cw-039"
title: "Scallop Finishing — Constant Cusp Height Across Variable Curvature"
source: "web:camworks-docs"
confidence: 90
category: "cam_strategy"
tags: ["camworks", "3d-machining", "scallop", "constant-cusp", "finishing"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.661Z
---

# Scallop Finishing — Constant Cusp Height Across Variable Curvature

Scallop finishing maintains a constant scallop (cusp) height across the entire surface regardless of local curvature. On flat regions, step-over increases; on curved regions, step-over decreases to maintain uniform surface quality. This is the preferred strategy for mold cavities where inconsistent surface finish causes visible lines on molded parts. Set scallop height to 50-70% of the allowable surface roughness specification.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** 3d_finishing

## Related
- [[camworks-cam-tips-cw-034|Z-Level Finish — Constant-Z Contouring for Steep Walls]]
- [[camworks-cam-tips-cw-036|Steep Area vs. Shallow Area — Split Finishing by Surface Inclination]]
- [[camworks-cam-tips-cw-038|Flowline Finishing — Follow Natural Surface Curvature for Smooth Results]]
- [[camworks-cam-tips-cw-042|Spiral Finishing — Continuous Single-Path Motion Eliminates Step Marks]]
- [[camworks-cam-tips-cw-044|Constant Cusp Machining — Adaptive Step-Over for Uniform Ra]]
