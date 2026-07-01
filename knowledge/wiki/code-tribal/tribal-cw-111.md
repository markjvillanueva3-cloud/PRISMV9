---
name: tribal-cw-111
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["camworks", "surface-quality", "scallop", "step-over", "ra"]
confidence: 92
source: "web:camworks-docs"
promoted_from: knowledge/tribal/camworks-cam-tips-cw-111.md
promoted_at: 2026-05-26T16:07:19.950Z
---

# Scallop Height Control — Calculate Step-Over for Target Ra

Scallop height directly determines surface roughness (Ra ≈ scallop_height / 4 for ball end mills). Calculate required step-over: step = 2 × sqrt(R² - (R-h)²) where R = ball radius, h = scallop height. For a 10mm ball (R=5) targeting 2μm scallop: step = 0.28mm. On curved surfaces, the effective scallop varies — convex surfaces produce taller scallops at the same step-over. Use CAMWorks' constant-scallop option to automatically adapt step-over to local curvature.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:camworks-docs
**Operations:** 3d_finishing

## Related
- [[gibbscam-cam-tips-gc-104|Scallop height calculation drives stepover selection for target Ra]]
- [[camworks-cam-tips-cw-038|Flowline Finishing — Follow Natural Surface Curvature for Smooth Results]]
- [[camworks-cam-tips-cw-039|Scallop Finishing — Constant Cusp Height Across Variable Curvature]]
- [[camworks-cam-tips-cw-044|Constant Cusp Machining — Adaptive Step-Over for Uniform Ra]]
- [[camworks-cam-tips-cw-045|Simultaneous 5-Axis — Continuous Tool Orientation for Complex Surfaces]]
