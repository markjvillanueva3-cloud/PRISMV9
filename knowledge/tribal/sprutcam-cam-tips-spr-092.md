---
id: "spr-092"
title: "Sobol Sensitivity Indices for Parameter Importance"
source: "web:sprutcam-forum"
confidence: 0.77
category: "cam_strategy"
tags: ["sobol", "sensitivity", "variance", "interactions"]
_source: "sprutcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.949Z
---

# Sobol Sensitivity Indices for Parameter Importance

Compute Sobol sensitivity indices to quantify each parameter's contribution to output variance. First-order Si measures individual parameter effects, total-order STi includes interactions. For a typical SprutCAM finishing operation: step-over (Si=0.35, STi=0.42), feed (Si=0.25, STi=0.33), speed (Si=0.18, STi=0.25). The gap between Si and STi reveals interaction strength. Focus optimization on parameters with highest STi.

**Category:** cam_strategy
**Confidence:** 0.77
**Source:** web:sprutcam-forum
**Operations:** optimization

## Related
- [[cimatron-cam-tips-cim-117|Sobol Sensitivity Indices for Parameter Importance]]
- [[powermill-cam-tips-pm-101|Sobol Sensitivity Indices for Parameter Ranking]]
- [[solidcam-cam-tips-sc-155-2|Sobol Sensitivity for Parameter Importance]]
- [[tebis-cam-tips-teb-110|Sobol Sensitivity Indices for Parameter Importance]]
- [[hypermill-cam-tips-ext-hm-158|Sobol Sensitivity for MAXX Parameter Ranking]]
