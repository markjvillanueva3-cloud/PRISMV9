---
name: tribal-teb-096
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["scallop-height", "step-over", "formula", "ball-end"]
confidence: 89
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-096.md
promoted_at: 2026-06-09T22:31:16.727Z
---

# Step-Over vs Scallop Height Formula for Ball-End Mills

Scallop height h = R - √(R² - (s/2)²) where R=ball radius, s=step-over. For 6mm ball (R=3mm) and 0.005mm target scallop: s ≈ 0.35mm. Tebis constant scallop mode applies this formula adaptively at each point considering local surface curvature. On convex surfaces the effective radius decreases, requiring finer step-over; on concave surfaces it increases, allowing coarser.

**Category:** optimization
**Confidence:** 89
**Source:** web:tebis-docs
**Operations:** finishing

## Related
- [[powermill-cam-tips-pm-066|Step-Over vs Scallop Height Trade-Off]]
- [[cimatron-cam-tips-cim-101|Scallop Height Formula h = R - √(R² - (s/2)²)]]
- [[sprutcam-cam-tips-spr-121|Scallop Height Formula for Ball-End Finishing]]
- [[surfcam-cam-tips-sc2-149|Barrel Cutter Definition in SURFCAM Tool Library]]
- [[surfcam-cam-tips-sc2-153|SURFCAM Barrel Cutter Step-Over Optimization by Curvature]]
