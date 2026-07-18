---
name: tribal-sc2-114
category: code-tribal
subdomain: probing
domain: tribal-knowledge
tags: ["setup-probing", "wcs", "touch-probe", "work-offset", "alignment"]
confidence: 87
source: "web:surfcam-probing"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-114.md
promoted_at: 2026-06-09T22:31:16.684Z
---

# Setup Probing for Automatic WCS Alignment

SURFCAM setup probing programs the machine's touch probe to automatically find the part position and set work offsets. Program a 3-point plane probe for Z-datum, a 2-point edge probe for X-datum, and a single-point probe for Y-datum. The probe results are stored in the work offset register (G54-G59). For production parts, probe at the start of each part cycle to compensate for fixture wear and loading variation.

**Category:** probing
**Confidence:** 87
**Source:** web:surfcam-probing
**Operations:** probing

## Related
- [[bobcad-cam-tips-bc-119|Setup Probing for Automatic WCS Alignment]]
- [[camworks-cam-tips-cw-199|Fixture Probing — Work Coordinate System Alignment from Part Features]]
- [[fusion360-cam-tips-ext-f360-062|3+2 Indexed Machining with WCS Per Orientation]]
- [[surfcam-cam-tips-sc2-111|WCS (Work Coordinate System) Setup for Multi-Fixture Parts]]
- [[gibbscam-cam-tips-gc-115|Part setup probing establishes datum positions automatically on the machine]]
