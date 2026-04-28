---
id: "cat-055"
title: "Stock Model Accuracy Affects Simulation Fidelity"
source: "web:catia-docs"
confidence: 87
category: "cam_strategy"
tags: ["catia", "stock-model", "resolution", "tessellation", "simulation"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.844Z
---

# Stock Model Accuracy Affects Simulation Fidelity

The stock model resolution in CATIA Material Removal Simulation is controlled by the tessellation parameters. Higher resolution (smaller triangle size) produces more accurate gouge detection but increases computation time exponentially. For roughing verification, use a coarse stock (1-2mm resolution). For finishing verification, use fine stock (0.1-0.2mm resolution). The stock shape can be defined as a box, cylinder, extruded profile, or imported STL — use the closest shape to actual raw material to avoid false collision warnings from oversized stock.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:catia-docs
**Operations:** simulation

## Related
- [[catia-cam-tips-cat-051|NC Machine Simulation Requires Complete Machine Model]]
- [[catia-cam-tips-cat-052|Material Removal Simulation Video Mode vs Photo Mode]]
- [[catia-cam-tips-cat-056|Gouge Detection Sensitivity Settings for Different Operations]]
- [[catia-cam-tips-cat-077|Digital Twin Machining Simulation on 3DEXPERIENCE]]
- [[catia-cam-tips-cat-165|Material Removal Simulation with Stock Tracking Across Operations]]
