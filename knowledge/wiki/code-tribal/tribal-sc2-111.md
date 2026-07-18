---
name: tribal-sc2-111
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["wcs", "work-offset", "g54-g59", "multi-fixture", "origin"]
confidence: 89
source: "web:surfcam-wcs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-111.md
promoted_at: 2026-06-09T22:31:16.684Z
---

# WCS (Work Coordinate System) Setup for Multi-Fixture Parts

SURFCAM supports multiple work coordinate systems (G54-G59, G54.1 P1-P99) for multi-fixture and multi-setup operations. Define each WCS with its origin, orientation, and associated fixtures. The post processor outputs the correct G-code work offset call at each tool change. For tombstone/pallet fixtures with 4+ setups, use G54.1 extended offsets. Always verify WCS origins match the physical setup sheet coordinates.

**Category:** setup
**Confidence:** 89
**Source:** web:surfcam-wcs
**Operations:** setup

## Related
- [[fusion360-cam-tips-ext-f360-062|3+2 Indexed Machining with WCS Per Orientation]]
- [[surfcam-cam-tips-sc2-114|Setup Probing for Automatic WCS Alignment]]
- [[bobcad-cam-tips-bc-119|Setup Probing for Automatic WCS Alignment]]
- [[camworks-cam-tips-cw-199|Fixture Probing — Work Coordinate System Alignment from Part Features]]
- [[cimatron-cam-tips-cim-094|Probing Integration for In-Process Verification]]
