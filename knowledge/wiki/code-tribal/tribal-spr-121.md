---
name: tribal-spr-121
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["scallop-height", "formula", "constant-scallop", "step-over"]
confidence: 0
source: "web:sprutcam-docs"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-121.md
promoted_at: 2026-06-09T22:31:16.646Z
---

# Scallop Height Formula for Ball-End Finishing

h = R - √(R²-(s/2)²). For 6mm ball (R=3mm), 0.005mm target: s≈0.35mm. SprutCAM constant scallop adapts step-over by local curvature. Convex: finer (effective R decreases). Concave: coarser (R increases). Saves 20-30% vs fixed step-over with uniform quality.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:sprutcam-docs
**Operations:** finishing

## Related
- [[cimatron-cam-tips-cim-101|Scallop Height Formula h = R - √(R² - (s/2)²)]]
- [[powermill-cam-tips-pm-066|Step-Over vs Scallop Height Trade-Off]]
- [[tebis-cam-tips-teb-096|Step-Over vs Scallop Height Formula for Ball-End Mills]]
- [[surfcam-cam-tips-sc2-149|Barrel Cutter Definition in SURFCAM Tool Library]]
- [[surfcam-cam-tips-sc2-153|SURFCAM Barrel Cutter Step-Over Optimization by Curvature]]
