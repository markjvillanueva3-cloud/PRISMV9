---
id: "wnc-117"
title: "Setup Probing Automates Part Alignment"
source: "web:worknc-probing"
confidence: 91
category: "cam_strategy"
tags: ["probing", "alignment", "setup", "work-offset"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.711Z
---

# Setup Probing Automates Part Alignment

WorkNC programs on-machine probing for automated part alignment. Define probing points on reference surfaces and WorkNC generates probe routines that measure part position and update work offsets (G54-G59). Use minimum 3 points for plane alignment, 3 for bore center, 2 for edge detection. The probe simulation runs in the same machine model as cutting operations for full verification.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-probing
**Operations:** probing

## Related
- [[topsolid-cam-tips-ts-109|Setup Probing Automates Part Alignment]]
- [[edgecam-cam-tips-ec-109|Setup Probing for Automatic Work Offset]]
- [[esprit-cam-tips-esp-115|On-Machine Probing for Work Offset Setup]]
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-118|Part Alignment Probing — Compensate for Misaligned Raw Stock]]
