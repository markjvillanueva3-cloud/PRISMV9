---
id: "sc-155"
title: "Swiss-Type Cross-Drilling — Manage Tool Clearance on B-Axis"
source: "web:solidcam-forum"
confidence: 81
category: "cam_strategy"
tags: ["solidcam", "swiss-type", "cross-drilling", "b-axis", "live-tooling"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.783Z
---

# Swiss-Type Cross-Drilling — Manage Tool Clearance on B-Axis

Cross-drilling on Swiss-type lathes uses the B-axis (live tooling cross-slide). In SolidCAM, define cross-drill operations with the tool oriented perpendicular to the spindle axis and set the clearance plane relative to the workpiece OD plus 1-2mm. For off-center cross holes, use C-axis indexing with the spindle locked. When drilling cross holes deeper than 1.5x diameter, enable peck drilling with 0.5D peck depth to ensure chip evacuation in the confined space. Always verify the B-axis tool holder does not collide with the guide bushing housing during approach.

**Category:** cam_strategy
**Confidence:** 81
**Source:** web:solidcam-forum
**Operations:** drilling, swiss

## Related
- [[solidcam-cam-tips-sc-177-2|Surface Extension for Clean Exit]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
