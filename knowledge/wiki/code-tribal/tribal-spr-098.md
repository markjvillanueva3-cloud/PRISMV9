---
name: tribal-spr-098
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["cholesky", "correlated", "uncertainty", "monte-carlo"]
confidence: 0
source: "web:sprutcam-forum"
promoted_from: knowledge/tribal/sprutcam-cam-tips-spr-098.md
promoted_at: 2026-06-09T22:31:16.640Z
---

# Correlated Input Uncertainty with Cholesky Decomposition

Machining parameters have correlated uncertainties: speed and feed are often adjusted together (operator habits), material hardness correlates with tensile strength. When running Monte Carlo simulations, use Cholesky decomposition of the correlation matrix to generate properly correlated random samples. Ignoring correlations underestimates total uncertainty by 10-20% for highly correlated inputs.

**Category:** cam_strategy
**Confidence:** 0.76
**Source:** web:sprutcam-forum
**Operations:** optimization

## Related
- [[cimatron-cam-tips-cim-122|Cholesky Decomposition for Correlated Inputs]]
- [[tebis-cam-tips-teb-114|Correlated Input Uncertainty via Cholesky Decomposition]]
- [[powermill-cam-tips-pm-102|Cholesky Decomposition for Correlated Uncertainties]]
- [[sprutcam-cam-tips-spr-030|Monte Carlo Simulation for Cycle Time Uncertainty]]
- [[tebis-cam-tips-teb-158|Hotelling T² for Multivariate SPC]]
