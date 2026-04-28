---
id: "cw-200"
title: "Tool Length and Diameter Measurement — Laser and Touch Probes"
source: "web:camworks-docs"
confidence: 90
category: "cam_strategy"
tags: ["camworks", "probing", "tool-measurement", "laser", "touch-probe"]
_source: "camworks-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.800Z
---

# Tool Length and Diameter Measurement — Laser and Touch Probes

Program automatic tool length and diameter measurement using the machine's tool probe (laser or touch). Execute tool measurement after every tool change and before critical operations. For tools < 3mm diameter, use non-contact laser probes to avoid deflection errors. Store measured values in the tool offset table and compare against expected values — a deviation > 0.1mm from expected length indicates a broken or wrong tool. CAMWorks post processors support macro-based tool measurement cycles for Fanuc, Siemens, Heidenhain, and other major controllers.

**Category:** cam_strategy
**Confidence:** 90
**Source:** web:camworks-docs
**Operations:** probing

## Related
- [[camworks-cam-tips-cw-116|Tool Measurement Probing — Verify Tool Length and Diameter On-Machine]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-117|In-Process Inspection — Verify Critical Dimensions Mid-Program]]
- [[camworks-cam-tips-cw-118|Part Alignment Probing — Compensate for Misaligned Raw Stock]]
- [[camworks-cam-tips-cw-119|Verification Probing — Final Part Inspection On-Machine]]
