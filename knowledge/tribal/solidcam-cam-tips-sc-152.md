---
id: "sc-152"
title: "Swiss-Type Guide Bushing Offset — Compensate Z-Origin for Sliding Headstock"
source: "web:solidcam-docs"
confidence: 82
category: "cam_strategy"
tags: ["solidcam", "swiss-type", "guide-bushing", "z-origin", "sliding-headstock"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.781Z
---

# Swiss-Type Guide Bushing Offset — Compensate Z-Origin for Sliding Headstock

In SolidCAM Swiss-type lathe programming, the Z-origin must account for the guide bushing position rather than the chuck face. Set the Machine Coordinate System (MCS) Z-zero at the guide bushing face and define the bar stock protrusion length as the working envelope. When the bar feeds forward through the guide bushing, SolidCAM's bar feeder cycle automatically adjusts the Z-offset. For parts longer than 20mm, program the Z-axis motion as headstock movement (not tool movement) to maintain workpiece rigidity at the cutting point near the guide bushing.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:solidcam-docs
**Operations:** turning, swiss

## Related
- [[solidcam-cam-tips-sc-159-2|AMSAA Reliability Growth for Program Maturity]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
