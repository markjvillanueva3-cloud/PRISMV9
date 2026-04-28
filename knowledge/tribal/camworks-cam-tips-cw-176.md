---
id: "cw-176"
title: "Statistical Process Control — Xbar-R Charts for CNC Dimensions"
source: "web:camworks-docs"
confidence: 88
category: "cam_strategy"
tags: ["camworks", "spc", "xbar-r", "control-charts", "quality"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.782Z
---

# Statistical Process Control — Xbar-R Charts for CNC Dimensions

Implement SPC on critical dimensions using Xbar-R control charts. Sample 3-5 parts per subgroup at regular intervals (every 25-50 parts or hourly). Calculate control limits from the first 25 subgroups of stable production. React to out-of-control signals: (1) point beyond control limits → stop and investigate, (2) 7 consecutive points on one side → trend (likely tool wear or thermal drift), (3) 2 of 3 points near control limit → process shifting. Feed SPC data back to CAMWorks TechDB to refine expected process capability for each operation type.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** general

## Related
- [[topsolid-cam-tips-ts-185|SPC Implementation for TopSolid-Programmed Parts — Xbar-R Control Charts]]
- [[cimatron-cam-tips-cim-047|SPC Integration for Mold Shop Quality]]
- [[powermill-cam-tips-pm-085|SPC Control Charts for Critical Dimensions]]
- [[camworks-cam-tips-cw-082|Stock Comparison — Quantitative Analysis of Remaining Material]]
- [[camworks-cam-tips-cw-083|Gouge Checking — Detect Overcutting Before Shop Floor]]
