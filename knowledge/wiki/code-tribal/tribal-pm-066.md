---
name: tribal-pm-066
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["step-over", "scallop-height", "ball-end", "formula"]
confidence: 0
source: "web:powermill-docs"
promoted_from: knowledge/tribal/powermill-cam-tips-pm-066.md
promoted_at: 2026-06-09T22:31:16.549Z
---

# Step-Over vs Scallop Height Trade-Off

For ball-end mill finishing, scallop height h = R - √(R² - (s/2)²) where R=ball radius, s=step-over. For 6mm ball (R=3mm) and 0.005mm target scallop: s ≈ 0.35mm. Use PowerMill's 'Constant Scallop' mode to automatically vary step-over by surface curvature. This produces 20-30% shorter cycle times than fixed step-over while maintaining uniform surface quality.

**Category:** cam_strategy
**Confidence:** 0.89
**Source:** web:powermill-docs
**Operations:** finishing

## Related
- [[tebis-cam-tips-teb-096|Step-Over vs Scallop Height Formula for Ball-End Mills]]
- [[cimatron-cam-tips-cim-101|Scallop Height Formula h = R - √(R² - (s/2)²)]]
- [[sprutcam-cam-tips-spr-121|Scallop Height Formula for Ball-End Finishing]]
- [[surfcam-cam-tips-sc2-149|Barrel Cutter Definition in SURFCAM Tool Library]]
- [[surfcam-cam-tips-sc2-153|SURFCAM Barrel Cutter Step-Over Optimization by Curvature]]
