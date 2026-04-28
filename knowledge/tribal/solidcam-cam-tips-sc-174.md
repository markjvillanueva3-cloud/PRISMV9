---
id: "sc-174"
title: "iMachining Rest — Use Stock Model from Previous iMachining Pass"
source: "web:solidcam-docs"
confidence: 87
category: "cam_strategy"
tags: ["solidcam", "imachining", "rest", "stock-model", "toolpath-efficiency"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.797Z
---

# iMachining Rest — Use Stock Model from Previous iMachining Pass

When following an iMachining 2D roughing pass with an iMachining rest pass using a smaller tool, enable 'Use Stock Model' rather than reference tool mode. The stock model carries exact material removal geometry from the previous operation, including all spiral patterns and moat walls. This produces more efficient rest toolpaths than the cylindrical approximation of reference-tool mode. In the iMachining wizard, select the previous operation as the stock source. The Technology Wizard then adapts feeds/speeds for the rest material geometry, often allowing more aggressive parameters since the remaining stock islands are predictable thin walls rather than full-width cuts.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** roughing, rest_machining, 2d_pocket

## Related
- [[solidcam-cam-tips-sc-173-2|Steep-Shallow Automatic Assignment]]
- [[solidcam-cam-tips-sc-042|iMachining 2D Stepping — Control Radial Engagement in Corners]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
