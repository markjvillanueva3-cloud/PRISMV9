---
name: tribal-f360-139
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "rotary-limits", "singularity", "5-axis", "axis-wrapping"]
confidence: 0
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-139.md
promoted_at: 2026-06-09T22:31:16.286Z
---

# Rotary Axis Limits and Singularity Avoidance

Define your machine's rotary axis limits in the Machine Configuration (A-axis: typically -120 to +30 degrees for trunnion, C-axis: typically -360 to +360 degrees). Fusion uses these limits to plan tool axis orientations that avoid axis wrapping (the C-axis spinning 350 degrees when a -10 degree move would reach the same orientation). Near singularities (tool axis parallel to a rotary axis), the rotary axis velocity approaches infinity for small positional changes — Fusion handles this by inserting retract-reorient-approach sequences. Set the singularity avoidance zone to 5-10 degrees around the pole to prevent erratic motion.

**Category:** cam_strategy
**Confidence:** 0.88
**Source:** web:fusion360-docs
**Operations:** 5_axis_finishing, 5_axis_contour

## Related
- [[edgecam-cam-tips-ec-034|5-Axis Smooth Rotary Motion Limits]]
- [[fusion360-cam-tips-ext-f360-058|Multi-Axis Contour Tilt and Side-Tilt Control]]
- [[fusion360-cam-tips-ext-f360-063|Tool Axis Limits to Prevent Machine Over-Travel]]
- [[fusion360-cam-tips-ext-f360-064|Lead and Lag Angles for 5-Axis Surface Quality]]
- [[fusion360-cam-tips-ext-f360-065|Collision Avoidance Tilting Strategy Selection]]
