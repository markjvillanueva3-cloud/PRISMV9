---
name: tribal-cim-101
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["scallop-height", "formula", "step-over", "curvature"]
confidence: 0
source: "web:cimatron-docs"
promoted_from: knowledge/tribal/cimatron-cam-tips-cim-101.md
promoted_at: 2026-06-09T22:31:16.107Z
---

# Scallop Height Formula h = R - √(R² - (s/2)²)

For ball-end finishing: scallop height h = R - √(R² - (s/2)²) where R=ball radius, s=step-over. For 6mm ball (R=3mm) and 0.005mm target: s ≈ 0.35mm. Cimatron constant scallop mode applies this adaptively considering local curvature. Convex surfaces need finer step-over (effective radius decreases), concave allow coarser (effective radius increases).

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:cimatron-docs
**Operations:** finishing

## Related
- [[powermill-cam-tips-pm-066|Step-Over vs Scallop Height Trade-Off]]
- [[sprutcam-cam-tips-spr-121|Scallop Height Formula for Ball-End Finishing]]
- [[surfcam-cam-tips-sc2-153|SURFCAM Barrel Cutter Step-Over Optimization by Curvature]]
- [[tebis-cam-tips-teb-096|Step-Over vs Scallop Height Formula for Ball-End Mills]]
- [[catia-cam-tips-cat-141|Surface Machining Scallop Height Control with Variable Stepover]]
