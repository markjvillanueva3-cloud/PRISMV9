---
name: tribal-cw-044
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "3d-machining", "constant-cusp", "adaptive", "surface-quality"]
confidence: 89
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-044.md
promoted_at: 2026-06-09T22:31:15.996Z
---

# Constant Cusp Machining — Adaptive Step-Over for Uniform Ra

Constant cusp machining automatically adjusts the step-over distance based on local surface curvature to maintain a uniform scallop height (and thus uniform Ra). On convex regions where the effective cutting radius increases, step-over widens. On concave regions, step-over tightens. This produces the most uniform surface quality across complex 3D shapes. Specify the target cusp height in microns — typical values: 5μm for mold polish surfaces, 10μm for general machining, 20μm for non-cosmetic.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:camworks-docs
**Operations:** 3d_finishing

## Related
- [[camworks-cam-tips-cw-038|Flowline Finishing — Follow Natural Surface Curvature for Smooth Results]]
- [[camworks-cam-tips-cw-039|Scallop Finishing — Constant Cusp Height Across Variable Curvature]]
- [[camworks-cam-tips-cw-033|Z-Level Roughing — Waterline Strategy for 3D Cavity Stock Removal]]
- [[camworks-cam-tips-cw-034|Z-Level Finish — Constant-Z Contouring for Steep Walls]]
- [[camworks-cam-tips-cw-035|Flat Area Detection — Automatic Identification of Horizontal Surfaces]]
