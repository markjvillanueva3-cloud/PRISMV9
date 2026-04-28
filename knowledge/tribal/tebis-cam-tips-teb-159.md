---
id: "teb-159"
title: "Morris Screening for Factor Importance Ranking"
source: "web:tebis-forum"
confidence: 76
category: "optimization"
tags: ["morris", "screening", "elementary-effects", "factor-ranking"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.354Z
---

# Morris Screening for Factor Importance Ranking

Morris method (elementary effects) efficiently screens many factors to identify the important few. Compute μ* (mean absolute elementary effect) and σ (standard deviation) for each factor. High μ* = important factor. High σ = factor involved in interactions or nonlinear effects. Use Morris screening with 10-12 factors, then do detailed DOE/RSM on the top 3-4 factors identified.

**Category:** optimization
**Confidence:** 76
**Source:** web:tebis-forum
**Operations:** optimization

## Related
- [[cimatron-cam-tips-cim-141|Morris Screening for Many-Factor Problems]]
- [[powermill-cam-tips-pm-110|Morris Screening for Many-Factor Problems]]
- [[sprutcam-cam-tips-spr-114|Morris Screening for Many Factors]]
- [[cimatron-cam-tips-cim-136|Latin Hypercube Sampling for Efficient Screening]]
- [[powermill-cam-tips-pm-104|LHS for Efficient Parameter Space Screening]]
