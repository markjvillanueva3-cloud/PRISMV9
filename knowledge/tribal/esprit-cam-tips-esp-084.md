---
id: "esp-084"
title: "Deep Hole Drilling with Gun Drill Strategy"
source: "web:esprit-drilling"
confidence: 87
category: "cam_strategy"
tags: ["deep-hole", "gun-drill", "through-coolant", "straightness"]
_source: "esprit-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.506Z
---

# Deep Hole Drilling with Gun Drill Strategy

For holes deeper than 10x diameter, program gun drilling in ESPRIT with through-coolant at 50-100 bar pressure. Gun drilling maintains straightness by the self-piloting action of the drill's pad bearing against the bore wall. Program a pilot hole first (3-5x diameter deep) with a twist drill, then switch to the gun drill. Set the gun drill feed to 0.005-0.02mm/rev for steel and enable flow/pressure monitoring in the posted code to detect chip packing.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:esprit-drilling
**Operations:** deep_hole_drilling

## Related
- [[catia-cam-tips-cat-117|Deep Hole Drilling Beyond 10xD Requires Gun Drill Strategy]]
- [[edgecam-cam-tips-ec-101|Deep Hole Drilling with Gun Drill Support]]
- [[bobcad-cam-tips-bc-113|Deep Hole Drilling and Pattern Optimization]]
- [[fusion360-cam-tips-ext-f360-155|Gun Drill Programming in Fusion 360]]
- [[mastercam-cam-tips-mc-159|Deep hole BTA drilling requires through-tool coolant programming and guide pad alignment]]
