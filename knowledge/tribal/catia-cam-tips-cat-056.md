---
id: "cat-056"
title: "Gouge Detection Sensitivity Settings for Different Operations"
source: "web:catia-docs"
confidence: 89
category: "cam_strategy"
tags: ["catia", "gouge", "detection", "tolerance", "simulation"]
_source: "catia-cam-tips.ts"
indexed_at: 2026-04-28T01:00:41.845Z
---

# Gouge Detection Sensitivity Settings for Different Operations

CATIA gouge detection sensitivity should be matched to the operation type. For roughing (stock allowance > 0.5mm), set gouge tolerance to 0.1mm — only flag gouges that penetrate below the stock allowance. For finishing (stock allowance = 0), set gouge tolerance to 0.01-0.02mm to catch even minor overshoots. Enable 'Gouge on Check Elements' to also verify that fixtures and clamps are not being cut. Gouge results are color-coded: red for gouges, yellow for near-misses, green for clean areas.

**Category:** cam_strategy
**Confidence:** 89
**Source:** web:catia-docs
**Operations:** simulation

## Related
- [[catia-cam-tips-cat-009|Closed Pocket Island Detection and Machining Strategy]]
- [[catia-cam-tips-cat-011|Wall Finishing With Spring Pass for Tolerance Control]]
- [[catia-cam-tips-cat-051|NC Machine Simulation Requires Complete Machine Model]]
- [[catia-cam-tips-cat-052|Material Removal Simulation Video Mode vs Photo Mode]]
- [[catia-cam-tips-cat-053|Collision Detection Clearance Margins for Safety]]
