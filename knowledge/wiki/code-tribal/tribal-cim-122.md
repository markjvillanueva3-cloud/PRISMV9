---
name: tribal-cim-122
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["cholesky", "correlated", "uncertainty", "monte-carlo"]
confidence: 0
source: "web:cimatron-forum"
promoted_from: knowledge/tribal/cimatron-cam-tips-cim-122.md
promoted_at: 2026-06-09T22:31:16.113Z
---

# Cholesky Decomposition for Correlated Inputs

Machining inputs have correlations: speed-feed (operator adjusts together), hardness-tensile (material property). Monte Carlo with independent sampling underestimates uncertainty 10-20%. Use Cholesky decomposition of correlation matrix for properly correlated random samples. For mold machining: hardness-tensile correlation r≈0.85, speed-feed r≈0.6.

**Category:** cam_strategy
**Confidence:** 0.76
**Source:** web:cimatron-forum
**Operations:** optimization

## Related
- [[sprutcam-cam-tips-spr-098|Correlated Input Uncertainty with Cholesky Decomposition]]
- [[tebis-cam-tips-teb-114|Correlated Input Uncertainty via Cholesky Decomposition]]
- [[powermill-cam-tips-pm-102|Cholesky Decomposition for Correlated Uncertainties]]
- [[sprutcam-cam-tips-spr-030|Monte Carlo Simulation for Cycle Time Uncertainty]]
- [[tebis-cam-tips-teb-158|Hotelling T² for Multivariate SPC]]
