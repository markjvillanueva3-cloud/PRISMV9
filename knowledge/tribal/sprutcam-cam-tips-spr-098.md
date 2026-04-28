---
id: "spr-098"
title: "Correlated Input Uncertainty with Cholesky Decomposition"
source: "web:sprutcam-forum"
confidence: 0.76
category: "cam_strategy"
tags: ["cholesky", "correlated", "uncertainty", "monte-carlo"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.954Z
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
