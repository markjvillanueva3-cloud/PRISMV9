---
id: "f360-111"
title: "Lead-In/Lead-Out Optimization for Finishing Passes"
source: "web:fusion360-docs"
confidence: 88
category: "cam_strategy"
tags: ["fusion360", "lead-in", "lead-out", "finishing", "witness-marks"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.715Z
---

# Lead-In/Lead-Out Optimization for Finishing Passes

For finishing passes, set the lead-out to mirror the lead-in (tangential arc, same radius) to create a smooth exit that matches the entry. An abrupt exit at the end of a contour pass leaves a witness mark where the tool decelerates and lifts. Set the lead-out sweep angle to 45-90 degrees and overlap the lead-out with the lead-in by 0.5-1.0mm so the cut passes through the entry point, eliminating the start/stop mark entirely. This technique is essential for visible surfaces and mold parting lines.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:fusion360-docs
**Operations:** 2d_contour, 3d_finishing

## Related
- [[edgecam-cam-tips-ec-011|Profiling with Lead-In/Lead-Out Arcs]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[fusion360-cam-tips-ext-f360-068|2D Contour Linking with Lead-In Arc for Clean Entry]]
- [[fusion360-cam-tips-ext-f360-118|Steep and Shallow Automatic Detection]]
- [[fusion360-cam-tips-ext-f360-141|Tangent Barrel Finishing on Steep Walls]]
