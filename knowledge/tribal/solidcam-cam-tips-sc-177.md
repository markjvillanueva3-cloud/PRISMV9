---
id: "sc-177"
title: "Rest Detection Sensitivity — Balance Between Missed Stock and False Positives"
source: "web:solidcam-forum"
confidence: 85
category: "cam_strategy"
tags: ["solidcam", "rest-detection", "sensitivity", "false-positives", "optimization"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.800Z
---

# Rest Detection Sensitivity — Balance Between Missed Stock and False Positives

SolidCAM's rest detection sensitivity parameter controls the minimum stock thickness that triggers a rest toolpath. Setting it too low (< 0.005mm) creates toolpath segments over surfaces with negligible remaining stock (false positives), wasting cycle time with air cuts. Setting it too high (> 0.1mm) misses legitimate rest material in tight corners. Recommended values: 0.01mm for finishing operations (where 0.01mm of stock affects surface quality), 0.05mm for semi-finishing (where minor stock variations are acceptable), 0.1mm for rest roughing (where only substantial material volumes justify additional tool engagement).

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:solidcam-forum
**Operations:** rest_machining, finishing

## Related
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-147-2|Taguchi Robust Design for Stable Machining]]
