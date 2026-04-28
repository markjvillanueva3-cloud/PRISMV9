---
id: "ts-109"
title: "Setup Probing Automates Part Alignment"
source: "web:topsolid-probing"
confidence: 92
category: "cam_strategy"
tags: ["probing", "alignment", "setup", "work-offset"]
_source: "topsolid-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.469Z
---

# Setup Probing Automates Part Alignment

TopSolid programs on-machine probing cycles for automated part alignment, eliminating manual edge finding. Define probing points on reference surfaces (datum faces, bores, boss) and TopSolid generates the probe routine that measures the part position and updates work offsets (G54-G59). Use a minimum of 3 points for plane alignment, 3 points for bore center, or 2 points for edge detection. The probe simulation runs in the same machine model as cutting operations.

**Category:** cam_strategy
**Confidence:** 92
**Source:** web:topsolid-probing
**Operations:** probing

## Related
- [[worknc-cam-tips-wnc-117|Setup Probing Automates Part Alignment]]
- [[edgecam-cam-tips-ec-109|Setup Probing for Automatic Work Offset]]
- [[esprit-cam-tips-esp-115|On-Machine Probing for Work Offset Setup]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-118|Part Alignment Probing — Compensate for Misaligned Raw Stock]]
