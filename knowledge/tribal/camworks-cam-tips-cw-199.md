---
id: "cw-199"
title: "Fixture Probing — Work Coordinate System Alignment from Part Features"
source: "web:camworks-docs"
confidence: 90
category: "cam_strategy"
tags: ["camworks", "probing", "wcs", "fixture", "alignment"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.799Z
---

# Fixture Probing — Work Coordinate System Alignment from Part Features

Use probing to establish the Work Coordinate System (WCS) from part features rather than fixture references. Probe a machined bore, two perpendicular faces, and a top surface to define X, Y, Z origins and angular alignment. This compensates for fixture variation, part placement error, and thermal drift of the fixture. In CAMWorks, program the probing sequence as the first operation and use macro variables to store the calculated WCS values in G54-G59 offsets. This approach achieves ±0.005mm WCS accuracy compared to ±0.02-0.05mm for manual edge finding.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** probing

## Related
- [[camworks-cam-tips-cw-118|Part Alignment Probing — Compensate for Misaligned Raw Stock]]
- [[camworks-cam-tips-cw-062|Multi-Body Part Machining — Separate Operations per Solid Body]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
