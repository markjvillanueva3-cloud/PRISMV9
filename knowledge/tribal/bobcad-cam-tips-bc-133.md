---
id: "bc-133"
title: "BobCAD V36 Multiaxis Deburring Toolpath Strategy"
source: "web:bobcad-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["v36", "deburring", "5-axis", "edge-following", "chamfer"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.561Z
---

# BobCAD V36 Multiaxis Deburring Toolpath Strategy

V36 introduces a dedicated deburring toolpath that follows part edges with a chamfer or deburring tool using 5-axis motion. The toolpath traces the intersection curve between two surfaces and maintains a constant depth of engagement along the edge. Set the deburring depth (typically 0.1-0.3mm) and the tool approach angle. The 5-axis motion keeps the tool perpendicular to the edge regardless of edge orientation. For parts with 50+ edges, the automated edge detection saves hours of manual edge selection and individual chamfer programming.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:bobcad-docs
**Operations:** finishing, 5_axis

## Related
- [[nx-cam-tips-nx-016|Multi-Axis Deburring Operation]]
- [[powermill-cam-tips-pm-051|Multi-Axis Deburring Operations]]
- [[tebis-cam-tips-teb-061|Multi-Axis Deburring and Edge Breaking]]
- [[catia-cam-tips-cat-026|Multi-Axis Curve Machining for Edge Trimming and Deburring]]
- [[cimatron-cam-tips-cim-062|Multi-Axis Deburring and Edge Breaking]]
