---
id: "sc2-124"
title: "Lead-In/Out Arcs for Clean Entry and Exit Marks"
source: "web:surfcam-leadin-leadout"
confidence: 90
category: "cam_strategy"
tags: ["lead-in", "lead-out", "tangential-arc", "entry-marks", "finish"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.140Z
---

# Lead-In/Out Arcs for Clean Entry and Exit Marks

SURFCAM lead-in/out uses tangential arcs to smoothly enter and exit the cut, preventing the dwell mark that occurs when the tool starts cutting from a stationary position. Set the lead-in arc radius to 1-2x the tool radius and the arc sweep to 90°. For finish profiling, use a 180° arc for maximum smoothness. Position the lead-in/out on the least critical surface (scrap side for profile cuts, boss top for pocket cuts). Never lead in at corners — always on straight sections.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:surfcam-leadin-leadout
**Operations:** profiling, finishing

## Related
- [[mastercam-cam-tips-mc-114|Toolpath linking parameters control retract height, lead-in, and lead-out strategy]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[edgecam-cam-tips-ec-011|Profiling with Lead-In/Lead-Out Arcs]]
- [[fusion360-cam-tips-ext-f360-111|Lead-In/Lead-Out Optimization for Finishing Passes]]
- [[gibbscam-cam-tips-gc-006|Contour operations require lead-in/lead-out arcs to avoid witness marks]]
