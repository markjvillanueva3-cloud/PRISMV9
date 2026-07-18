---
name: tribal-cat-032
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "simultaneous", "inverse-time", "G93", "5-axis"]
confidence: 92
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-032.md
promoted_at: 2026-05-26T16:07:20.037Z
---

# Simultaneous 5-Axis Requires Inverse Time Feed Mode

For simultaneous 5-axis operations in CATIA, ensure your post-processor outputs Inverse Time Feed (G93) rather than standard feed-per-minute (G94). In G93 mode, the controller computes the required feed based on the time per block, correctly accounting for the combined linear and rotary axis motion. Without G93, the programmed feedrate applies only to the linear axes, causing the actual tool-tip velocity to vary wildly as rotary axes move, producing inconsistent surface finish.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:catia-docs
**Operations:** multi_axis_sweeping, multi_axis_curve

## Related
- [[catia-cam-tips-cat-025|Multi-Axis Sweeping Lead/Lag Angle for Surface Quality]]
- [[catia-cam-tips-cat-026|Multi-Axis Curve Machining for Edge Trimming and Deburring]]
- [[catia-cam-tips-cat-027|Multi-Axis Helical for Through-Bore and Port Finishing]]
- [[catia-cam-tips-cat-028|Auto Tool Axis Smoothing Prevents Abrupt Rotary Motion]]
- [[catia-cam-tips-cat-029|Impeller Blade Machining Requires Split Roughing and Finishing]]
