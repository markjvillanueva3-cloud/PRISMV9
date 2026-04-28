---
id: "cat-030"
title: "Blade Root Fillet Machining With Tapered Ball Nose"
source: "web:catia-docs"
confidence: 86
category: "cam_strategy"
tags: ["catia", "blade", "root-fillet", "tapered-ball-nose", "5-axis"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.824Z
---

# Blade Root Fillet Machining With Tapered Ball Nose

Impeller blade root fillets require a dedicated 5-axis operation in CATIA using a tapered ball-nose tool sized to match the fillet radius. Use Multi-Axis Curve machining along the blade root curve with the tool axis tilted 10-15 degrees away from the blade wall. Run two passes — one on each side of the fillet — with overlap at the center. This prevents the undercut that occurs when attempting to machine both sides of the fillet in a single pass.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:catia-docs
**Operations:** multi_axis_curve

## Related
- [[catia-cam-tips-cat-029|Impeller Blade Machining Requires Split Roughing and Finishing]]
- [[catia-cam-tips-cat-025|Multi-Axis Sweeping Lead/Lag Angle for Surface Quality]]
- [[catia-cam-tips-cat-026|Multi-Axis Curve Machining for Edge Trimming and Deburring]]
- [[catia-cam-tips-cat-027|Multi-Axis Helical for Through-Bore and Port Finishing]]
- [[catia-cam-tips-cat-028|Auto Tool Axis Smoothing Prevents Abrupt Rotary Motion]]
