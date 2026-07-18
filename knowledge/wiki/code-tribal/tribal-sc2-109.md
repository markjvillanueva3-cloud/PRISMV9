---
name: tribal-sc2-109
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["stock-definition", "casting", "stl", "near-net-shape", "material"]
confidence: 88
source: "web:surfcam-stock"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-109.md
promoted_at: 2026-06-09T22:31:16.683Z
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
