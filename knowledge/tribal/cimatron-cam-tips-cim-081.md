---
id: "cim-081"
title: "Cavity and Insert Matching for Multi-Cavity Molds"
source: "web:cimatron-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["multi-cavity", "copy", "replication", "efficiency"]
_source: "cimatron-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.045Z
---

# Cavity and Insert Matching for Multi-Cavity Molds

For multi-cavity molds, program one cavity completely, then use Cimatron's 'Copy to Position' to replicate toolpaths to all cavity locations. The system adjusts WCS and rapid moves for each instance. Verify each copy in simulation — different cavity orientations may require modified approach/retract moves. For identical cavities, this reduces programming to 1/N of single-cavity effort.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:cimatron-docs
**Operations:** setup

## Related
- [[cimatron-cam-tips-cim-185|Multi-Cavity Copy with Verification]]
- [[powermill-cam-tips-pm-172|Multi-Cavity Copy with Simulation Verify]]
- [[nx-cam-tips-ext-nx-175|Multi-Cavity Copy with ISV Verification]]
- [[sprutcam-cam-tips-spr-172|Multi-Cavity Copy and Verify]]
- [[bobcad-cam-tips-bc-158|BobCAD Wire EDM Multi-Cavity Optimization with Common Start Holes]]
