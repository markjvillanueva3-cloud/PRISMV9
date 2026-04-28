---
id: "ec-101"
title: "Deep Hole Drilling with Gun Drill Support"
source: "web:edgecam-drilling"
confidence: 87
category: "cam_strategy"
tags: ["deep-hole", "gun-drill", "through-coolant", "pilot"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.330Z
---

# Deep Hole Drilling with Gun Drill Support

For holes deeper than 10x diameter, program gun drilling in Edgecam with through-coolant at 50-100 bar. Gun drills maintain straightness via self-piloting pad action against the bore wall. Program a twist-drill pilot hole (3-5x diameter) first, then switch to gun drill. Set gun drill feed to 0.005-0.02mm/rev for steel. Enable flow/pressure monitoring in posted code to detect chip packing that could break the drill.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:edgecam-drilling
**Operations:** deep_hole_drilling

## Related
- [[catia-cam-tips-cat-117|Deep Hole Drilling Beyond 10xD Requires Gun Drill Strategy]]
- [[esprit-cam-tips-esp-084|Deep Hole Drilling with Gun Drill Strategy]]
- [[worknc-cam-tips-wnc-086|Deep Hole Drilling with Gun Drill Strategies]]
- [[bobcad-cam-tips-bc-113|Deep Hole Drilling and Pattern Optimization]]
- [[fusion360-cam-tips-ext-f360-155|Gun Drill Programming in Fusion 360]]
