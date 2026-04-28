---
id: "cw-167"
title: "Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off"
source: "web:camworks-docs"
confidence: 90
category: "cam_strategy"
tags: ["camworks", "swiss-type", "sub-spindle", "back-working", "part-off"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.775Z
---

# Swiss-Type Sub-Spindle Operations — Back-Working and Part-Off

After main spindle operations complete, the sub-spindle picks up the part for back-working (machining the part-off end). In CAMWorks, program the sub-spindle as a separate setup with reversed Z-axis. Coordinate the part-off and pickup sequence: (1) sub-spindle advances to grip the part, (2) part-off tool separates the part, (3) sub-spindle retracts with the part, (4) back-working operations execute. Set sub-spindle grip length to minimum 2x diameter for secure holding during back-work operations.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** turning

## Related
- [[topsolid-cam-tips-ts-166|TopSolid Swiss-Type Sub-Spindle Back-Working — Second-Op Programming]]
- [[bobcad-cam-tips-bc-170|BobCAD Swiss-Type Sub-Spindle Back-Working Operations]]
- [[surfcam-cam-tips-sc2-160|SURFCAM Swiss-Type Part-Off Optimization with Overlap]]
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
- [[camworks-cam-tips-cw-166|Swiss-Type Simultaneous Operations — Overlapped Milling and Turning]]
