---
id: "sc2-047"
title: "Grooving with Plunge and Side-Turn Strategies"
source: "web:surfcam-lathe-grooving"
confidence: 89
category: "cam_strategy"
tags: ["grooving", "plunge", "oscillating", "side-turn", "peck"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.068Z
---

# Grooving with Plunge and Side-Turn Strategies

SURFCAM grooving supports straight plunge, oscillating plunge, and side-turn strategies for OD, ID, and face grooves. For grooves wider than the insert, use the oscillating plunge method — alternating left/right plunges with a 50-70% overlap. For deep grooves (depth > 4x insert width), reduce feed rate by 20% per additional depth increment and enable peck grooving with chip-break retraction. Always program a 0.05mm cleanup pass on groove walls.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:surfcam-lathe-grooving
**Operations:** grooving

## Related
- [[bobcad-cam-tips-bc-045|Grooving with Plunge, Oscillating, and Side-Turn Modes]]
- [[catia-cam-tips-cat-152|CATIA Lathe Grooving with Multi-Pass Plunge Strategy]]
- [[edgecam-cam-tips-ec-038|Grooving Cycles with Peck and Chip Management]]
- [[esprit-cam-tips-esp-029|ProfitTurning Groove Entry with Peck Strategy]]
- [[sprutcam-cam-tips-spr-009|Turning Groove Cycle with Chip Breaking]]
