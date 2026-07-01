---
name: tribal-mc-136
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "scallop-math", "step-over", "barrel-cutter", "ball-end-mill", "cycle-time"]
confidence: 86
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-136.md
promoted_at: 2026-06-09T22:31:16.429Z
---

# Scallop height versus step-over math differs fundamentally between ball and barrel cutters

For a ball end mill, scallop height h ≈ s²/(8R) where s = step-over and R = ball radius. For a barrel cutter, the same formula applies but R is the barrel profile radius (50–500 mm), not the shank radius. This means for equal scallop height, the barrel cutter step-over can be s_barrel = s_ball × sqrt(R_barrel/R_ball). With R_ball=5 mm and R_barrel=200 mm, s_barrel = s_ball × sqrt(40) ≈ 6.3 × s_ball. A 0.3 mm ball step-over becomes ~1.9 mm barrel step-over for identical scallop. Mastercam's Accelerated Finishing handles this calculation automatically, but understanding the math helps you predict cycle time savings during process planning and justify barrel cutter investment ($200–500 per tool vs. $30–80 for ball end mills).

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:community
**Operations:** finishing

## Related
- [[mastercam-cam-tips-mc-128|Barrel cutters achieve 5–10× larger step-over than ball end mills for equivalent scallop height]]
- [[mastercam-cam-tips-mc-132|Large-step finishing with barrel cutters reduces passes by 80% on open surface areas]]
- [[bobcad-cam-tips-bc-161|BobCAD Barrel Cutter Support for Large-Step-Over Finishing]]
- [[mastercam-cam-tips-mc-049|Core Rough targets island walls specifically for reduced cycle time]]
- [[mastercam-cam-tips-mc-113|Reduce air cutting by using stock-aware toolpaths and tight containment boundaries]]
