---
id: "f360-065"
title: "Collision Avoidance Tilting Strategy Selection"
source: "web:fusion360-docs"
confidence: 89
category: "safety"
tags: ["fusion360", "5-axis", "collision-avoidance", "tilting", "holder-clearance"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.675Z
---

# Collision Avoidance Tilting Strategy Selection

Fusion offers three collision avoidance modes for 5-axis: Off, Tool Shaft, and Tool and Holder. Always use Tool and Holder for production programs — it checks the full assembly against the in-process stock model. Set the collision clearance to 1-3mm to prevent near-misses that vibration or thermal growth could turn into actual contacts. When collision tilting activates, verify the resulting tool axis change is smooth — abrupt avoidance tilts leave surface marks.

**Category:** safety
**Confidence:** 89
**Source:** web:fusion360-docs
**Operations:** multi_axis_contour, multi_axis_flow, swarf

## Related
- [[fusion360-cam-tips-ext-f360-119|Automatic Collision Avoidance with Tool Axis Tilting]]
- [[fusion360-cam-tips-ext-f360-058|Multi-Axis Contour Tilt and Side-Tilt Control]]
- [[fusion360-cam-tips-ext-f360-063|Tool Axis Limits to Prevent Machine Over-Travel]]
- [[fusion360-cam-tips-ext-f360-064|Lead and Lag Angles for 5-Axis Surface Quality]]
- [[fusion360-cam-tips-ext-f360-066|Multi-Channel Synchronization for Mill-Turn 5-Axis]]
