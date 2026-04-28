---
id: "cw-115"
title: "Setup Probing — Automatic Work Coordinate Establishment"
source: "web:camworks-docs"
confidence: 88
category: "cam_strategy"
tags: ["camworks", "probing", "setup", "work-coordinate", "automation"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.733Z
---

# Setup Probing — Automatic Work Coordinate Establishment

Program setup probing operations at the beginning of each machine setup to establish work coordinates automatically. Touch off on 3 mutually perpendicular surfaces (X face, Y face, Z top) to set G54-G59 work offsets. For cylindrical stock, use a boss probing cycle (4-point diameter measurement + center calculation). CAMWorks probing output depends on the post processor — ensure the post generates the correct probe macro calls for your controller (Renishaw, Blum, Heidenhain formats differ significantly).

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:camworks-docs
**Operations:** probing

## Related
- [[camworks-cam-tips-cw-196|Automated Probing Cycles — First-Part Verification Before Production]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-013|TechDB Knowledge-Based Machining — Capture Best Practices for Reuse]]
- [[camworks-cam-tips-cw-015|Tool Selection Rules in TechDB — Automate Tool Choice by Feature Size]]
- [[camworks-cam-tips-cw-057|Configuration Management — Separate CAM Setups per SOLIDWORKS Config]]
