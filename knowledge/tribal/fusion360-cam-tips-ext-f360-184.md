---
id: "f360-184"
title: "Composite Edge Finishing with Burr Tool"
source: "web:autodesk-forum"
confidence: 0.82
category: "cam_strategy"
tags: ["fusion360", "composite", "edge-finishing", "diamond-burr", "dust-extraction"]
_source: "fusion360-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:42.774Z
---

# Composite Edge Finishing with Burr Tool

After trimming CFRP parts, edge quality often requires a finishing pass with a fine-grit diamond burr or router. In Fusion, program a 2D Contour at the trimmed edge with 0mm stock allowance and a diamond-coated burr tool (80-120 grit). Set the feed rate to 2000-3000mm/min at 15000-20000 RPM. The high speed and fine abrasive action trims any remaining fiber whiskers without pulling fibers from the matrix. For cosmetic edges visible in the final assembly, follow with a light hand-sanding operation (note this in the setup sheet). Dust extraction is mandatory during composite machining — carbon fiber dust is conductive and damages electronics, and is a respiratory hazard.

**Category:** cam_strategy
**Confidence:** 0.82
**Source:** web:autodesk-forum
**Operations:** 2d_contour

## Related
- [[fusion360-cam-tips-ext-f360-121|Multi-Axis Deburring Toolpath]]
- [[fusion360-cam-tips-ext-f360-181|CFRP Trimming with Compression Router]]
- [[fusion360-cam-tips-ext-f360-182|Diamond-Coated Tools for Composite Drilling]]
- [[fusion360-cam-tips-ext-f360-185|Honeycomb Core Machining Strategy]]
- [[catia-cam-tips-cat-208|Composite Edge Trimming with Dust Extraction Path Planning]]
