---
id: "sc-100"
title: "Sheet Metal Unfolding — Machine Flat Pattern Directly"
source: "web:solidcam-docs"
confidence: 84
category: "cam_strategy"
tags: ["solidcam", "solidworks", "sheet-metal", "flat-pattern", "unfolding"]
_source: "solidcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.740Z
---

# Sheet Metal Unfolding — Machine Flat Pattern Directly

For sheet metal parts that require CNC operations on the flat blank (laser-cut pilot holes, engraving, countersinks before bending), use SolidWorks Flat Pattern configuration as the CAM target geometry. SolidCAM can directly reference the flat pattern body, and any design changes to bend radius or flange length automatically update the flat pattern and associated toolpaths. This is more reliable than exporting a separate flat pattern DXF and importing it as a new CAM project.

**Category:** cam_strategy
**Confidence:** 84
**Source:** web:solidcam-docs
**Operations:** 2d_milling, drilling, engraving

## Related
- [[camworks-cam-tips-cw-060|Sheet Metal Machining — Program Flat Pattern Features Before Bending]]
- [[solidcam-cam-tips-sc-097|Design Change Propagation — Selective Toolpath Regeneration]]
- [[solidcam-cam-tips-sc-098|Assembly Machining — Reference Fixture Bodies for Collision Avoidance]]
- [[solidcam-cam-tips-sc-099|Configuration Management — Separate CAM Projects per SolidWorks Configuration]]
- [[solidcam-cam-tips-sc-101|SolidWorks Feature Freeze — Lock Geometry Before Complex CAM Setup]]
