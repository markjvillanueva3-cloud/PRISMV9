---
name: tribal-f360-065
category: code-tribal
subdomain: safety
domain: tribal-knowledge
tags: ["fusion360", "5-axis", "collision-avoidance", "tilting", "holder-clearance"]
confidence: 89
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-065.md
promoted_at: 2026-06-09T22:31:16.268Z
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
