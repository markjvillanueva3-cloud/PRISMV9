---
name: tribal-ts-189
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["topsolid", "multivariate", "hotelling", "t-squared", "correlated"]
confidence: 83
source: "web:topsolid-docs"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-189.md
promoted_at: 2026-06-09T22:31:16.779Z
---

# Multi-Variate Process Monitoring — Hotelling T² for Correlated Dimensions

When multiple dimensions are correlated (e.g., bore diameter and position are linked through tool deflection), use multivariate SPC (Hotelling T² chart) instead of individual Xbar charts. The T² statistic detects shifts in the mean vector that individual charts miss. Calculate the T² control limit from the chi-square distribution with p degrees of freedom (p = number of monitored dimensions). A T² signal means the process has shifted, but doesn't indicate which dimension — use T² decomposition or individual charts to identify the specific dimension.

**Category:** cam_strategy
**Confidence:** 83
**Source:** web:topsolid-docs
**Operations:** general

## Related
- [[cimatron-cam-tips-cim-140|Hotelling T² for Multivariate Mold SPC]]
- [[powermill-cam-tips-pm-108|Hotelling T² for Multivariate SPC]]
- [[sprutcam-cam-tips-spr-112|Hotelling T² for Multivariate SPC]]
- [[tebis-cam-tips-teb-158|Hotelling T² for Multivariate SPC]]
- [[topsolid-cam-tips-ts-122|TopSolid'Cam 7 Unified Architecture — Single Environment for All Operations]]
