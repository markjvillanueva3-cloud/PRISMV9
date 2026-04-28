---
id: "sc-145"
title: "Multi-Depth Drilling Technology — Adaptive Peck Depths per Material Zone"
source: "web:solidcam-docs"
confidence: 86
category: "cam_strategy"
tags: ["solidcam", "multi-depth", "adaptive-peck", "cross-drilling", "variable-feed"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.775Z
---

# Multi-Depth Drilling Technology — Adaptive Peck Depths per Material Zone

SolidCAM's Multi-Depth Technology page allows programming variable peck depths within a single drilling operation. This is essential for cross-drilled holes that pass through different features (e.g., entering through a thin wall, passing through a cavity, then into solid material). Define depth zones with individual peck depths, feed rates, and spindle speeds. For interrupted cuts (where the drill enters/exits a cross-hole), reduce feed to 50% for 2mm before and after the interruption to prevent drill deflection. Multi-depth also handles stack drilling through dissimilar materials (e.g., aluminum plate bolted to steel) by changing parameters at the material interface depth.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:solidcam-docs
**Operations:** drilling

## Related
- [[solidcam-cam-tips-sc-046|iMachining 2D Chip Thinning Compensation — Let the Wizard Handle It]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
- [[solidcam-cam-tips-sc-147-2|Taguchi Robust Design for Stable Machining]]
