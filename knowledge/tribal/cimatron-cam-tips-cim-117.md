---
id: "cim-117"
title: "Sobol Sensitivity Indices for Parameter Importance"
source: "web:cimatron-forum"
confidence: 0.77
category: "cam_strategy"
tags: ["sobol", "sensitivity", "first-order", "total-order"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.073Z
---

# Sobol Sensitivity Indices for Parameter Importance

Compute Sobol first-order (Si) and total-order (STi). For finishing: step-over (Si=0.35, STi=0.42), feed (Si=0.25, STi=0.33), speed (Si=0.18, STi=0.25). Gap between Si and STi reveals interaction strength. Parameters with high STi but low Si are important through interactions — need factorial DOE, not one-at-a-time optimization. Focus on top 2-3 STi parameters.

**Category:** cam_strategy
**Confidence:** 0.77
**Source:** web:cimatron-forum
**Operations:** optimization

## Related
- [[powermill-cam-tips-pm-101|Sobol Sensitivity Indices for Parameter Ranking]]
- [[solidcam-cam-tips-sc-155-2|Sobol Sensitivity for Parameter Importance]]
- [[sprutcam-cam-tips-spr-092|Sobol Sensitivity Indices for Parameter Importance]]
- [[hypermill-cam-tips-ext-hm-158|Sobol Sensitivity for MAXX Parameter Ranking]]
- [[tebis-cam-tips-teb-110|Sobol Sensitivity Indices for Parameter Importance]]
