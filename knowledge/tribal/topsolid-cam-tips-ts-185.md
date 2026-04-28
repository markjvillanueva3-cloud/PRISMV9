---
id: "ts-185"
title: "SPC Implementation for TopSolid-Programmed Parts — Xbar-R Control Charts"
source: "web:topsolid-docs"
confidence: 88
category: "cam_strategy"
tags: ["topsolid", "spc", "xbar-r", "control-charts", "quality"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.527Z
---

# SPC Implementation for TopSolid-Programmed Parts — Xbar-R Control Charts

Implement Statistical Process Control on dimensions machined by TopSolid-generated programs. Sample 5 consecutive parts every hour, measure critical dimensions, and plot Xbar-R charts. Establish control limits from 25 subgroups of stable production. Action rules: 1 point beyond 3σ → stop, 7 points on one side → trend, 2 of 3 beyond 2σ → shift. Common assignable causes in CNC: tool wear (gradual upward trend on bore diameters), thermal drift (systematic shift after machine warm-up), and loose fixture (increased subgroup range). Feed SPC findings back to TopSolid templates to adjust stock allowances and tool change intervals.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:topsolid-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-176|Statistical Process Control — Xbar-R Charts for CNC Dimensions]]
- [[cimatron-cam-tips-cim-047|SPC Integration for Mold Shop Quality]]
- [[powermill-cam-tips-pm-085|SPC Control Charts for Critical Dimensions]]
- [[bobcad-cam-tips-bc-122|Verification Probing with SPC Data Output]]
- [[nx-cam-tips-ext-nx-145|SPC Integration for Aerospace Production]]
