---
id: "teb-110"
title: "Sobol Sensitivity Indices for Parameter Importance"
source: "web:tebis-forum"
confidence: 77
category: "optimization"
tags: ["sobol", "sensitivity-indices", "interactions", "global"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.304Z
---

# Sobol Sensitivity Indices for Parameter Importance

Compute Sobol first-order (Si) and total-order (STi) indices. For Tebis finishing: step-over (Si=0.35, STi=0.42), feed (Si=0.25, STi=0.33), speed (Si=0.18, STi=0.25). The gap between Si and STi reveals interaction strength. Parameters with high STi but low Si are important primarily through interactions — they need factorial DOE investigation, not one-at-a-time optimization.

**Category:** optimization
**Confidence:** 77
**Source:** web:tebis-forum
**Operations:** optimization

## Related
- [[sprutcam-cam-tips-spr-092|Sobol Sensitivity Indices for Parameter Importance]]
- [[cimatron-cam-tips-cim-117|Sobol Sensitivity Indices for Parameter Importance]]
- [[hypermill-cam-tips-ext-hm-158|Sobol Sensitivity for MAXX Parameter Ranking]]
- [[powermill-cam-tips-pm-101|Sobol Sensitivity Indices for Parameter Ranking]]
- [[solidcam-cam-tips-sc-155-2|Sobol Sensitivity for Parameter Importance]]
