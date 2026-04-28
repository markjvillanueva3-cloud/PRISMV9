---
id: "sc-153"
title: "Swiss-Type Gang Slide Programming — Coordinate Multiple Tool Stations"
source: "web:solidcam-forum"
confidence: 80
category: "cam_strategy"
tags: ["solidcam", "swiss-type", "gang-slide", "multi-station", "citizen"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.782Z
---

# Swiss-Type Gang Slide Programming — Coordinate Multiple Tool Stations

SolidCAM supports gang-slide tool configurations common on Swiss-type lathes (Citizen, Star, Tsugami). Define each tool station in the Tool Crib with its physical X/Z offset from the turret reference point. When programming gang-slide operations, use the Simultaneous Machining feature to overlap operations on the main spindle and sub-spindle. Critical: verify that tool-to-tool clearance in the gang slide is at least 2mm greater than the workpiece diameter to prevent interference during adjacent station cuts.

**Category:** cam_strategy
**Confidence:** 80
**Source:** web:solidcam-forum
**Operations:** turning, swiss

## Related
- [[solidcam-cam-tips-sc-156-2|Pareto Front for Quality-Throughput Trade-Off]]
- [[solidcam-cam-tips-sc-164-2|BMA for Multi-Material Tool Life]]
- [[solidcam-cam-tips-sc-170-2|iMachining Material Level Calibration]]
- [[solidcam-cam-tips-sc-143-2|Monte Carlo Cycle Time Estimation]]
- [[solidcam-cam-tips-sc-144-2|Weibull Tool Life for iMachining Replace-Before-Fail]]
