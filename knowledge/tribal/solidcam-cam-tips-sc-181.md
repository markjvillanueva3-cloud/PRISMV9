---
id: "sc-181"
title: "Scallop Height vs. Feed Marks — Address Both Surface Finish Components"
source: "web:solidcam-docs"
confidence: 87
category: "cam_strategy"
tags: ["solidcam", "scallop", "feed-marks", "surface-finish", "arc-fitting"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.802Z
---

# Scallop Height vs. Feed Marks — Address Both Surface Finish Components

Surface finish in milling has two components: scallop height (perpendicular to feed direction, controlled by stepover) and feed marks (along feed direction, controlled by feed-per-tooth and tool geometry). SolidCAM optimizes scallop via stepover but feed marks require separate attention. For critical surfaces, reduce feed per tooth to 0.05-0.08mm/tooth (vs. typical 0.1-0.15mm) in the finishing operation. Enable Arc Fitting in the toolpath output to replace linear G01 segments with G02/G03 arcs — this reduces the number of direction changes that cause feed mark discontinuities. On curved surfaces, request 0.001mm chord tolerance to minimize the faceting that creates additional feed marks.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:solidcam-docs
**Operations:** finishing, 3d_surface

## Related
- [[solidcam-cam-tips-sc-087|GPP Canned Cycle Configuration — Map SolidCAM Drilling to Controller Cycles]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
- [[solidcam-cam-tips-sc-145-2|Bayesian Feed Rate Updating from Production Data]]
- [[solidcam-cam-tips-sc-146-2|Cpk Prediction from Error Budget Analysis]]
