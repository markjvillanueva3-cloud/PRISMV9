---
name: tribal-cat-028
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "auto-tool-axis", "smoothing", "rotary", "5-axis"]
confidence: 89
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-028.md
promoted_at: 2026-06-09T22:31:16.036Z
---

# Auto Tool Axis Smoothing Prevents Abrupt Rotary Motion

When CATIA automatically computes the tool axis orientation (Auto Tool Axis mode), apply axis smoothing with a minimum angular change threshold of 0.5-2 degrees. Without smoothing, the computed axis can oscillate rapidly on surfaces with local curvature variations, causing excessive rotary axis motion and poor surface finish. In the Tool Axis tab, set the Smoothing factor to Medium or High and check the resulting axis variation in the tool path replay.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** multi_axis_sweeping, multi_axis_curve

## Related
- [[topsolid-cam-tips-ts-160|5-Axis Rotary Axis Smoothing — Eliminating Machine Jerk]]
- [[catia-cam-tips-cat-025|Multi-Axis Sweeping Lead/Lag Angle for Surface Quality]]
- [[catia-cam-tips-cat-026|Multi-Axis Curve Machining for Edge Trimming and Deburring]]
- [[catia-cam-tips-cat-027|Multi-Axis Helical for Through-Bore and Port Finishing]]
- [[catia-cam-tips-cat-029|Impeller Blade Machining Requires Split Roughing and Finishing]]
