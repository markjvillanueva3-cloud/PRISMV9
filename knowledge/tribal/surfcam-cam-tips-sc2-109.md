---
id: "sc2-109"
title: "Stock Definition from Solid Model or Raw Material Shape"
source: "web:surfcam-stock"
confidence: 88
category: "setup"
tags: ["stock-definition", "casting", "stl", "near-net-shape", "material"]
_source: "surfcam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.129Z
---

# Stock Definition from Solid Model or Raw Material Shape

SURFCAM stock definition supports rectangular block, cylinder, STL model (for castings/forgings), and 'From solid model with offset' (adds uniform stock to the finished part). For near-net-shape stock (castings), import the casting model as an STL and assign it as the stock boundary — this dramatically improves rest machining accuracy and reduces air cutting. Set the stock material type to auto-populate default cutting speeds from the material database.

**Category:** setup
**Confidence:** 88
**Source:** web:surfcam-stock
**Operations:** setup

## Related
- [[mastercam-cam-tips-mc-298|Mastercam OptiRough morphing between roughing levels maximizes material removal on near-net-shape stock]]
- [[tebis-cam-tips-teb-027|Blank Geometry Definition Matches Raw Material Shape]]
- [[worknc-cam-tips-wnc-018|Stock-Aware Roughing Uses Near-Net-Shape Input]]
- [[camworks-cam-tips-cw-009|Boss Recognition — Ensure Proper Stock Definition for Protruding Features]]
- [[bobcad-cam-tips-bc-209|BobCAD Adaptive Feed in Dynamic Machining for Variable Stock]]
