---
id: "ec-128"
title: "AFR Hole Recognition Diameter Banding"
source: "web:edgecam-docs"
confidence: 0.85
category: "automation"
tags: ["afr", "hole-recognition", "drill-cycles", "diameter-bands"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.366Z
---

# AFR Hole Recognition Diameter Banding

Configure AFR hole recognition with diameter bands to automatically assign drill cycles. Define bands such as: <3mm = spot-drill + carbide drill, 3-12mm = spot-drill + HSS drill, 12-25mm = pilot drill + step drill, >25mm = pilot + interpolated milling. Set tolerance on diameter matching to ±0.05mm for precision holes and ±0.5mm for clearance holes. AFR applies the correct cycle type and tool automatically based on detected diameter.

**Category:** automation
**Confidence:** 0.85
**Source:** web:edgecam-docs
**Operations:** drilling, boring

## Related
- [[edgecam-cam-tips-ec-129|AFR Thread Detection and Automatic Tapping Assignment]]
- [[bobcad-cam-tips-bc-131|BobCAD V37 Automatic Feature Recognition for Hole Patterns]]
- [[camworks-cam-tips-cw-001|AFR Machinable Feature Detection — Let CAMWorks Analyze the Solid Model]]
- [[camworks-cam-tips-cw-002|Custom Feature Templates — Teach AFR to Recognize Shop-Specific Geometry]]
- [[camworks-cam-tips-cw-004|Multi-Axis Feature Recognition — Detect Features Across Index Angles]]
