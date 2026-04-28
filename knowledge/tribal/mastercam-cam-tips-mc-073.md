---
id: "mc-073"
title: "Rotary Advanced toolpath wraps 2D geometry around cylindrical surfaces"
source: "web:mastercam-docs"
confidence: 84
category: "cam_strategy"
tags: ["mastercam", "rotary-advanced", "wrap", "cylindrical", "engraving", "4-axis"]
_source: "mastercam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.165Z
---

# Rotary Advanced toolpath wraps 2D geometry around cylindrical surfaces

Mastercam Rotary Advanced unwraps cylindrical geometry into a flat plane, applies standard 2D/3D toolpaths, then re-wraps the result for rotary axis output. This is ideal for engraving, pocketing, or contouring on round parts like shafts, drums, and rolls. Set the wrap axis (A or B) and cylinder diameter precisely — even 0.1 mm diameter error causes depth-of-cut variation around the circumference. For tapered cylinders, use the average diameter and verify with Machine Simulation.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:mastercam-docs
**Operations:** multiaxis, 4_axis, engraving

## Related
- [[cimatron-cam-tips-cim-065|Rotary Axis Wrapping for Cylindrical Features]]
- [[cimatron-cam-tips-cim-163|Rotary Axis Wrapping for Round Mold Components]]
- [[hypermill-cam-tips-ext-hm-171|Rotary Axis Wrapping for 4-Axis Parts]]
- [[powermill-cam-tips-pm-150|Rotary Axis Wrapping for 4-Axis Parts]]
- [[sprutcam-cam-tips-spr-076|Rotary Axis Wrapping for Cylindrical Parts]]
