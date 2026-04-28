---
id: "ec-161"
title: "High-Pressure Coolant Deep Drilling Without Pecking"
source: "web:edgecam-forum"
confidence: 0.85
category: "cam_strategy"
tags: ["deep-drilling", "high-pressure-coolant", "no-peck", "cycle-time"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.392Z
---

# High-Pressure Coolant Deep Drilling Without Pecking

With high-pressure through-tool coolant (70+ bar), program continuous feed drilling without pecking for holes up to 8x diameter depth in steel. This eliminates retract-and-replunge cycles, reducing cycle time by 40-60% vs. peck drilling. In Edgecam, select 'No Peck' drilling cycle and ensure the through-tool coolant M-code is output before the cycle. Monitor chip form — continuous spiral chips confirm proper coolant evacuation; broken or balled chips indicate insufficient pressure.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:edgecam-forum
**Operations:** drilling

## Related
- [[edgecam-cam-tips-ec-162|Cross-Hole Drilling Strategy to Prevent Drill Wander]]
- [[fusion360-cam-tips-ext-f360-151|Pilot Hole Strategy for Deep Holes]]
- [[fusion360-cam-tips-ext-f360-152|Through-Spindle Coolant for Deep Hole Drilling]]
- [[esprit-cam-tips-esp-113|Inconel and Nickel Superalloy Machining]]
- [[fusion360-cam-tips-ext-f360-155|Gun Drill Programming in Fusion 360]]
