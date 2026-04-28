---
id: "sc-158"
title: "Multi-Blade Machining — Configure Blade and Splitter Geometry for Impellers"
source: "web:solidcam-docs"
confidence: 85
category: "cam_strategy"
tags: ["solidcam", "multi-blade", "impeller", "splitter", "5-axis"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.785Z
---

# Multi-Blade Machining — Configure Blade and Splitter Geometry for Impellers

SolidCAM's Multi-Blade module requires precise geometry definition: select the hub surface, blade surfaces (pressure and suction sides), and fillet radii. For impellers with splitter blades, define splitters as secondary blade sets with independent offset parameters. Set the number of blade passages and SolidCAM auto-rotates the toolpath. Critical parameter: the Blade Extension value (typically 0.5-1mm beyond blade edges) prevents gouging at blade tips. For semi-open impellers, disable the shroud surface reference and use the hub-only machining mode.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:solidcam-docs
**Operations:** 5axis, impeller

## Related
- [[solidcam-cam-tips-sc-170-2|iMachining Material Level Calibration]]
- [[hypermill-cam-tips-ext-hm-157|Digital Twin Feedback for Process Improvement]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
