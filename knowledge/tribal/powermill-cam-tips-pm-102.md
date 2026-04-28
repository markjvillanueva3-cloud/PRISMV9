---
id: "pm-102"
title: "Cholesky Decomposition for Correlated Uncertainties"
source: "web:powermill-forum"
confidence: 0.76
category: "cam_strategy"
tags: ["cholesky", "correlated", "monte-carlo", "cpk"]
_source: "powermill-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.605Z
---

# Cholesky Decomposition for Correlated Uncertainties

Speed-feed correlation r≈0.6 (operator adjusts together), hardness-tensile r≈0.85. Independent Monte Carlo underestimates uncertainty 10-20%. Use Cholesky decomposition of correlation matrix for properly correlated samples. For PowerMill process analysis, ignoring correlations leads to overly optimistic Cpk predictions — the real process has wider variation than independent models suggest.

**Category:** cam_strategy
**Confidence:** 0.76
**Source:** web:powermill-forum
**Operations:** optimization

## Related
- [[cimatron-cam-tips-cim-122|Cholesky Decomposition for Correlated Inputs]]
- [[sprutcam-cam-tips-spr-098|Correlated Input Uncertainty with Cholesky Decomposition]]
- [[tebis-cam-tips-teb-114|Correlated Input Uncertainty via Cholesky Decomposition]]
- [[camworks-cam-tips-cw-174|Monte Carlo Simulation for Tolerance Stack Analysis]]
- [[catia-cam-tips-cat-213|Monte Carlo Process Capability Estimation for CATIA Machining]]
