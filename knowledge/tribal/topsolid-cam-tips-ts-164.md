---
id: "ts-164"
title: "TopSolid Swiss-Type Lathe Programming — Complete Multi-Axis Workflow"
source: "web:topsolid-docs"
confidence: 90
category: "cam_strategy"
tags: ["topsolid", "swiss-type", "sliding-headstock", "multi-axis", "guide-bushing"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.511Z
---

# TopSolid Swiss-Type Lathe Programming — Complete Multi-Axis Workflow

TopSolid'Cam supports Swiss-type (sliding headstock) lathes with full multi-axis synchronization. Program the main spindle, sub-spindle, guide bushing operations, and all turret positions in a single project. The system manages Z-axis coordinate transformations between headstock feed (W-axis) and tool positioning (Z-axis). Key: define the guide bushing position in the machine definition — all Z-depth references are relative to the guide bushing face. TopSolid handles the coordinate math that makes Swiss-type programming uniquely complex.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:topsolid-docs
**Operations:** turning

## Related
- [[camworks-cam-tips-cw-165|Swiss-Type Lathe Programming — Guide Bushing and Bar Feeder Control]]
- [[solidcam-cam-tips-sc-152-2|Uncertainty Budget for iMachining vs Conventional]]
- [[topsolid-cam-tips-ts-052|Swiss-Type Machining with Sliding Headstock Control]]
- [[topsolid-cam-tips-ts-165|TopSolid Swiss-Type Synchronization — Gang Tool Overlapping]]
- [[topsolid-cam-tips-ts-166|TopSolid Swiss-Type Sub-Spindle Back-Working — Second-Op Programming]]
