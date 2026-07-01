---
name: tribal-cat-049
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "waterline", "roughing", "3d-cavity", "constant-z"]
confidence: 87
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-049.md
promoted_at: 2026-06-09T22:31:16.041Z
---

# Waterline Roughing Optimal for Complex 3D Cavity Shapes

CATIA Waterline (constant-Z) roughing is optimal for complex 3D cavities where prismatic multi-slice cannot follow the geometry. Each Z-level is computed as a 2D offset of the part cross-section at that height. Use a bottom-up approach for open cavities (chips fall out) and top-down for closed cavities (preserves rigidity). Set the Z-step uniformly for predictable chip load — variable Z-steps cause inconsistent cutting forces and accelerated tool wear.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:catia-docs
**Operations:** roughing

## Related
- [[catia-cam-tips-cat-035|Lathe Roughing Strategy Selection Based on Material Hardness]]
- [[catia-cam-tips-cat-043|Multi-Slice Roughing Maximizes Material Removal Rate]]
- [[catia-cam-tips-cat-044|Adaptive Roughing Maintains Constant Tool Engagement]]
- [[catia-cam-tips-cat-045|Rest Material Roughing References Previous Tool Size]]
- [[catia-cam-tips-cat-047|Stock-Aware Roughing Uses In-Process Stock Model]]
