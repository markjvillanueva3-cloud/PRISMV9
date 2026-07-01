---
name: tribal-bc-119
category: code-tribal
subdomain: probing
domain: tribal-knowledge
tags: ["setup-probing", "wcs", "touch-probe", "renishaw", "blum"]
confidence: 87
source: "web:bobcad-probing"
promoted_from: knowledge/tribal/bobcad-cam-tips-bc-119.md
promoted_at: 2026-06-09T22:31:15.961Z
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
