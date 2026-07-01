---
name: tribal-f360-137
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "multi-axis-contour", "undercut", "5-axis", "lollipop-cutter"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-137.md
promoted_at: 2026-06-09T22:31:16.285Z
---

# Multi-Axis Contour for Undercut Access

The Multi-Axis Contour strategy tilts the tool to reach undercut areas that 3-axis cannot access. Define the tool axis by selecting a guide surface or curve that controls the tilt direction. Set the lead angle to 3-5 degrees (tool tilted forward in the cutting direction) and the tilt angle to follow the surface normal. The maximum axis change per step should be limited to 5-8 degrees to prevent jerky motion. For lollipop or T-slot cutters accessing undercuts, set the collision checking to include the full tool assembly — the shank above the undercut cutter can collide with the part entry wall.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:fusion360-docs
**Operations:** 5_axis_contour

## Related
- [[fusion360-cam-tips-ext-f360-058|Multi-Axis Contour Tilt and Side-Tilt Control]]
- [[fusion360-cam-tips-ext-f360-063|Tool Axis Limits to Prevent Machine Over-Travel]]
- [[fusion360-cam-tips-ext-f360-064|Lead and Lag Angles for 5-Axis Surface Quality]]
- [[fusion360-cam-tips-ext-f360-065|Collision Avoidance Tilting Strategy Selection]]
- [[fusion360-cam-tips-ext-f360-066|Multi-Channel Synchronization for Mill-Turn 5-Axis]]
