---
name: tribal-sc2-050
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["boring", "bore-bar", "deep-bore", "damped-bar", "pecking"]
confidence: 88
source: "web:surfcam-lathe-boring"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-050.md
promoted_at: 2026-06-09T22:31:16.671Z
---

# Boring Operations with Minimum Bore Diameter Control

SURFCAM boring uses specialized bore bar toolpath strategies with automatic clearance for the bar shank. Set the minimum bore diameter to the bar shank diameter plus 2mm clearance. For deep bores (L/D > 4), reduce feed rate by 15% per additional L/D ratio and use a damped boring bar. Program the approach as a smooth arc entry rather than a sharp corner to prevent chatter initiation. Enable pecking for through-bores to prevent chip wrapping.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:surfcam-lathe-boring
**Operations:** boring

## Related
- [[bobcad-cam-tips-bc-048|Boring Operations with Minimum Bore Control]]
- [[catia-cam-tips-cat-040|Bore Turning Requires Minimum Bore Diameter for Tool Clearance]]
- [[gibbscam-cam-tips-gc-058|Boring operations benefit from fine boring bar with damping for deep holes]]
- [[topsolid-cam-tips-ts-047|Boring Operations with Vibration Damping Settings]]
- [[bobcad-cam-tips-bc-111|Boring with Fine Bore and Back-Bore Cycles]]
