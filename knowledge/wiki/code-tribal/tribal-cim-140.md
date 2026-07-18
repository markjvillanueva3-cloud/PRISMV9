---
name: tribal-cim-140
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["hotelling", "multivariate", "t-squared", "mold"]
confidence: 0
source: "web:cimatron-forum"
promoted_from: knowledge/tribal/cimatron-cam-tips-cim-140.md
promoted_at: 2026-06-09T22:31:16.117Z
---

# Hotelling T² for Multivariate Mold SPC

Mold dimensions are correlated. Univariate SPC gives false alarms. Hotelling T² monitors all dimensions simultaneously: T² = (x-μ)ᵀ × S⁻¹ × (x-μ). Decompose out-of-control signals to identify which dimension(s) caused alarm. Requires n > 5p. For 8-cavity mold with 4 critical dims each: monitor 32 dimensions via T² control chart with MYT decomposition.

**Category:** cam_strategy
**Confidence:** 0.77
**Source:** web:cimatron-forum
**Operations:** optimization

## Related
- [[powermill-cam-tips-pm-108|Hotelling T² for Multivariate SPC]]
- [[sprutcam-cam-tips-spr-112|Hotelling T² for Multivariate SPC]]
- [[topsolid-cam-tips-ts-189|Multi-Variate Process Monitoring — Hotelling T² for Correlated Dimensions]]
- [[tebis-cam-tips-teb-158|Hotelling T² for Multivariate SPC]]
- [[camworks-cam-tips-cw-123|Hardened Steel Machining — CBN/Ceramic Tooling with Light Cuts]]
