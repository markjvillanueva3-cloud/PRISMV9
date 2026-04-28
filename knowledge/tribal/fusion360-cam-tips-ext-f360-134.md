---
id: "f360-134"
title: "3+2 Positional vs Simultaneous 5-Axis Selection Criteria"
source: "web:fusion360-docs"
confidence: 0.9
category: "cam_strategy"
tags: ["fusion360", "3-plus-2", "5-axis", "simultaneous", "decision-framework"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.733Z
---

# 3+2 Positional vs Simultaneous 5-Axis Selection Criteria

Choose 3+2 positional machining when: surfaces can be accessed from discrete fixed orientations, tolerances are above 0.02mm, the machine has average rotary axis accuracy (>5 arc-seconds), or the post processor is not validated for simultaneous motion. Choose simultaneous 5-axis when: surfaces have continuously varying normals (blades, impellers), undercuts require the tool to follow a curved path, or you need to maintain constant tool-surface contact angle for uniform finish. 3+2 is inherently more rigid (locked rotary axes) and produces more predictable results on machines with rotary axis backlash.

**Category:** cam_strategy
**Confidence:** 0.9
**Source:** web:fusion360-docs
**Operations:** 5_axis_finishing, 3d_finishing

## Related
- [[fusion360-cam-tips-ext-f360-058|Multi-Axis Contour Tilt and Side-Tilt Control]]
- [[fusion360-cam-tips-ext-f360-063|Tool Axis Limits to Prevent Machine Over-Travel]]
- [[fusion360-cam-tips-ext-f360-064|Lead and Lag Angles for 5-Axis Surface Quality]]
- [[fusion360-cam-tips-ext-f360-065|Collision Avoidance Tilting Strategy Selection]]
- [[fusion360-cam-tips-ext-f360-066|Multi-Channel Synchronization for Mill-Turn 5-Axis]]
