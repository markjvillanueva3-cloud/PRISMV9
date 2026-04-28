---
id: "bc-180"
title: "BobCAD Nesting Remnant Tracking and Sheet Inventory"
source: "web:bobcad-docs"
confidence: 0.84
category: "setup"
tags: ["nesting", "remnant-tracking", "sheet-inventory", "material-cost", "erp"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.598Z
---

# BobCAD Nesting Remnant Tracking and Sheet Inventory

BobCAD's nesting module tracks remnant (drop) sheets after cutting and stores them in a sheet inventory database. When nesting new jobs, the system checks the remnant inventory before using full sheets, maximizing utilization of partial sheets. Define minimum remnant size worth saving (typically >200x200mm). The system assigns unique IDs to remnants and records their dimensions and material. For shops processing 100+ sheets monthly, remnant tracking reduces material cost by 5-15% by consuming partial sheets that would otherwise become scrap. Export remnant reports to ERP systems for inventory management.

**Category:** setup
**Confidence:** 0.84
**Source:** web:bobcad-docs
**Operations:** contouring, cutting

## Related
- [[bobcad-cam-tips-bc-075|True-Shape Nesting for Maximum Sheet Yield]]
- [[bobcad-cam-tips-bc-175|BobCAD Nesting Module for Sheet Metal Cutting Optimization]]
- [[bobcad-cam-tips-bc-176|BobCAD True-Shape Nesting vs Rectangular Nesting]]
- [[bobcad-cam-tips-bc-177|BobCAD Nesting with Common-Line Cutting]]
- [[bobcad-cam-tips-bc-178|BobCAD Nesting Tab and Micro-Joint Placement for Sheet Parts]]
