---
name: tribal-ts-109
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["probing", "alignment", "setup", "work-offset"]
confidence: 92
source: "web:topsolid-probing"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-109.md
promoted_at: 2026-05-26T16:07:21.071Z
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
