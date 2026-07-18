---
name: tribal-cw-034
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "3d-machining", "z-level", "finishing", "steep-walls"]
confidence: 91
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-034.md
promoted_at: 2026-05-26T16:07:19.852Z
---

# Z-Level Finish — Constant-Z Contouring for Steep Walls

Z-level finishing produces the best surface quality on steep walls (> 30° from horizontal). Set the step-down based on target scallop height: step = 2 × sqrt(2Rh - h²) where R is tool radius and h is scallop height. For a 10mm ball end mill targeting 5μm scallop: step ≈ 0.45mm. Limit Z-level finishing to surfaces steeper than 45° and use a different strategy (scallop, flowline) for shallow regions to avoid visible banding.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:camworks-docs
**Operations:** 3d_finishing

## Related
- [[camworks-cam-tips-cw-033|Z-Level Roughing — Waterline Strategy for 3D Cavity Stock Removal]]
- [[camworks-cam-tips-cw-036|Steep Area vs. Shallow Area — Split Finishing by Surface Inclination]]
- [[camworks-cam-tips-cw-038|Flowline Finishing — Follow Natural Surface Curvature for Smooth Results]]
- [[camworks-cam-tips-cw-039|Scallop Finishing — Constant Cusp Height Across Variable Curvature]]
- [[camworks-cam-tips-cw-042|Spiral Finishing — Continuous Single-Path Motion Eliminates Step Marks]]
