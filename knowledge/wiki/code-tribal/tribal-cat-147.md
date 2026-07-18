---
name: tribal-cat-147
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "multi-axis", "axis-smoothing", "jerk", "surface-quality"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-147.md
promoted_at: 2026-06-09T22:31:16.064Z
---

# Automatic Tool Axis Smoothing to Prevent Machine Jerking

Abrupt tool axis changes in 5-axis CATIA programs cause machine jerking and surface witness marks. Enable 'Axis Smoothing' in the Multi-Axis operation's Tool Axis tab. Set the smoothing angular tolerance (typically 0.5-2°) — CATIA filters out high-frequency axis oscillations while maintaining the angular deviation within tolerance. For C-axis dominant machines (vertical spindle, rotary table), apply heavier smoothing on the C-axis (rotary) than the A/B-axis (tilt) because rotary axis acceleration limits are usually lower. Check the 'Axis Speed' graph in the tool path analysis to verify smoothing effectiveness.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:catia-docs
**Operations:** 5axis_finishing

## Related
- [[catia-cam-tips-cat-025|Multi-Axis Sweeping Lead/Lag Angle for Surface Quality]]
- [[catia-cam-tips-cat-026|Multi-Axis Curve Machining for Edge Trimming and Deburring]]
- [[catia-cam-tips-cat-027|Multi-Axis Helical for Through-Bore and Port Finishing]]
- [[catia-cam-tips-cat-071|Multi-Axis Post-Processor RTCP and TCP Mode Configuration]]
- [[catia-cam-tips-cat-100|Scallop Height Calculation Drives Stepover Selection]]
