---
id: "bc-119"
title: "Setup Probing for Automatic WCS Alignment"
source: "web:bobcad-probing"
confidence: 87
category: "probing"
tags: ["setup-probing", "wcs", "touch-probe", "renishaw", "blum"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.550Z
---

# Setup Probing for Automatic WCS Alignment

BobCAD programs touch probe cycles for automatic WCS alignment: 3-point plane for Z-datum, 2-point edge for X-datum, single-point for Y-datum. Probe results store in work offset registers (G54-G59). Machine Simulation PRO verifies probe movements before running on the machine. For production parts, probe at each cycle start to compensate for fixture wear. BobCAD outputs probing cycles in native controller format — Renishaw, Blum, Heidenhain probing macros are supported.

**Category:** probing
**Confidence:** 87
**Source:** web:bobcad-probing
**Operations:** probing

## Related
- [[surfcam-cam-tips-sc2-114|Setup Probing for Automatic WCS Alignment]]
- [[camworks-cam-tips-cw-199|Fixture Probing — Work Coordinate System Alignment from Part Features]]
- [[cimatron-cam-tips-cim-094|Probing Integration for In-Process Verification]]
- [[fusion360-cam-tips-ext-f360-062|3+2 Indexed Machining with WCS Per Orientation]]
- [[fusion360-cam-tips-ext-f360-091|WCS Probing to Establish Part Zero Automatically]]
