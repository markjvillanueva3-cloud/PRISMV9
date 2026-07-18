---
name: tribal-teb-114
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["cholesky", "correlated", "uncertainty", "monte-carlo"]
confidence: 76
source: "web:tebis-forum"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-114.md
promoted_at: 2026-06-09T22:31:16.731Z
---

# Correlated Input Uncertainty via Cholesky Decomposition

Machining parameters have correlated uncertainties: speed and feed are often adjusted together (operator habits), material hardness correlates with tensile strength. When running Monte Carlo, use Cholesky decomposition of the correlation matrix for properly correlated random samples. Ignoring correlations underestimates total uncertainty by 10-20% for highly correlated inputs.

**Category:** optimization
**Confidence:** 76
**Source:** web:tebis-forum
**Operations:** optimization

## Related
- [[cimatron-cam-tips-cim-122|Cholesky Decomposition for Correlated Inputs]]
- [[sprutcam-cam-tips-spr-098|Correlated Input Uncertainty with Cholesky Decomposition]]
- [[powermill-cam-tips-pm-102|Cholesky Decomposition for Correlated Uncertainties]]
- [[sprutcam-cam-tips-spr-030|Monte Carlo Simulation for Cycle Time Uncertainty]]
- [[tebis-cam-tips-teb-158|Hotelling T² for Multivariate SPC]]
