---
id: "bc-208"
title: "BobCAD Dynamic Roughing Depth Strategy for Deep Pockets"
source: "web:bobcad-docs"
confidence: 0.87
category: "cam_strategy"
tags: ["dynamic-roughing", "deep-pockets", "depth-strategy", "deflection", "progressive"]
_source: "bobcad-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.619Z
---

# BobCAD Dynamic Roughing Depth Strategy for Deep Pockets

For deep pockets (>3xD), BobCAD's Dynamic Roughing adjusts the depth strategy automatically. Set the maximum axial depth to 1.0-1.5xD for the first pass, then enable automatic depth reduction on subsequent levels. The system reduces axial depth by 10-20% per level to account for increasing tool deflection and chip evacuation difficulty. For pockets deeper than 5xD, switch to a progressive tool strategy: rough with a stubby tool at full depth for the first 3xD, then switch to a longer tool for deeper levels. BobCAD's stock model tracking ensures the longer tool only cuts the remaining material.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:bobcad-docs
**Operations:** roughing, pocketing

## Related
- [[cimatron-cam-tips-cim-068|Rib Machining for Deep Thin Features]]
- [[hypermill-cam-tips-ext-hm-138|Rib Machining for Deep Thin Features]]
- [[powermill-cam-tips-pm-046|Rib Machining Module for Deep Thin Ribs]]
- [[tebis-cam-tips-teb-066|Rib Machining for Deep Thin Ribs in Mold Cavities]]
- [[bobcad-cam-tips-bc-207|BobCAD Dynamic Roughing Corner Transition Strategies]]
