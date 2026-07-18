---
name: tribal-sc-100
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["solidcam", "solidworks", "sheet-metal", "flat-pattern", "unfolding"]
confidence: 84
source: "web:solidcam-docs"
promoted_from: knowledge/tribal/solidcam-cam-tips-sc-100.md
promoted_at: 2026-06-09T22:31:16.593Z
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
