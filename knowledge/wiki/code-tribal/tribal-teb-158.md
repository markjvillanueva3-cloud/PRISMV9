---
name: tribal-teb-158
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["hotelling", "multivariate-spc", "t-squared", "correlated"]
confidence: 77
source: "web:tebis-forum"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-158.md
promoted_at: 2026-06-09T22:31:16.741Z
---

# Hotelling T² for Multivariate SPC

When multiple dimensions are correlated (common in mold machining), univariate SPC gives false alarms. Hotelling T² monitors all dimensions simultaneously: T² = (x-μ)ᵀ × S⁻¹ × (x-μ). Control limit: T²_α from F-distribution. Decompose out-of-control signals using MYT decomposition to identify which dimension(s) caused the alarm. Requires n > 5p (p = number of dimensions).

**Category:** optimization
**Confidence:** 77
**Source:** web:tebis-forum
**Operations:** optimization

## Related
- [[topsolid-cam-tips-ts-189|Multi-Variate Process Monitoring — Hotelling T² for Correlated Dimensions]]
- [[cimatron-cam-tips-cim-140|Hotelling T² for Multivariate Mold SPC]]
- [[powermill-cam-tips-pm-108|Hotelling T² for Multivariate SPC]]
- [[sprutcam-cam-tips-spr-112|Hotelling T² for Multivariate SPC]]
- [[cimatron-cam-tips-cim-122|Cholesky Decomposition for Correlated Inputs]]
