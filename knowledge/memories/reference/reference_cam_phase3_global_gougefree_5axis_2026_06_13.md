---
name: reference_cam_phase3_global_gougefree_5axis_2026_06_13
description: "CAM (kilo) Phase-3 deeper anchor — Hermes-planned. Unified model of GLOBAL gouge-free 5-axis toolpath: local gouge (tool vs contact surface) vs global collision (tool/holder/shank vs rest-of-part+fixture); configuration-space (C-space) collision-free tool-axis; accessibility/visibility cones; smooth tool-axis fields (lead/tilt, no rotary reversals). Sources: B.K. Choi gouge-free algorithms + Choi-Jerard Sculptured Surface Machining (1998) + CIRP Annals/IJMTM 5-axis global collision avoidance (2005-24) + hyperMILL/NX(Parasolid) kernel synthesis. Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.504Z
aliases: reference_cam_phase3_global_gougefree_5axis_2026_06_13
---


**Context:** Phase-3 CAM anchor — planned by the **Hermes bridge** in the per-galaxy harnessed loop. Deepens
[[reference_cam_adaptive_collision_vendorapi_2026_06_13]] (Phase-2). Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §kilo.

## The next layer: a unified GLOBAL gouge-free 5-axis model
- **Local vs global gouge (the core distinction world-leading CAM gets right):** LOCAL gouge = the cutting tool
  cuts into the design surface at/near the contact point (curvature mismatch — tool radius > concave surface
  radius). GLOBAL collision = the tool body / holder / shank / arbor hits ANOTHER part of the workpiece or
  fixture, away from the contact point. They need different math; conflating them is the classic CAM failure.
- **Configuration-space (C-space) tool-axis:** for each cutter-contact point, the set of (lead, tilt) tool-axis
  orientations is a 2-D space; collision-free orientations form a feasible region (intersect accessibility +
  gouge-free cones). Global gouge-free 5-axis = find a SMOOTH path through these per-point feasible regions
  (avoid sudden rotary reversals that wreck finish + overload rotaries). Visibility/accessibility cones (which
  directions "see" the point unobstructed) bound the region.
- **Smooth tool-axis fields:** optimize lead/tilt continuity along the path (minimize angular acceleration) for
  surface finish + machine dynamics — beyond just "is it collision-free" to "is it a good motion."
- **Kernel synthesis:** hyperMILL (OPEN MIND) + NX CAM (Parasolid) kernel approaches to global collision +
  tool-axis smoothing → map to the vendor APIs (Phase-2) so PRISM's strategy layer drives each vendor's native
  global-collision avoidance rather than reinventing it.

## Wiring / consumers (R15)
- GALAXY: `engines/cam/` (kilo). CONSUMERS: collision_check_full (the triad endpoint), post-processor/echo
  (5-axis RTCP output — pairs with the kinematics anchor), delta (the part+fixture geometry to check against).
  DOMAIN: CAM-specific, but the C-space feasible-region method is reusable for any tool-orientation problem.
- AUTO-INVOCATION: none (knowledge anchor); the C-space collision engine is a kilo build unit, queued.

## Next (Phase-4, per Hermes)
Formalize the C-space feasible-region computation + smooth-tool-axis objective; validate on a real 5-axis part
(impeller/blisk from resources/CAD FILES) with holder-collision ground truth. Pairs with cad Phase-3 (the
geometry graph) + post-processor (RTCP kinematics).

Sources (Hermes-planned): B.K. Choi gouge-free toolpath algorithms (thesis + papers); Choi & Jerard *Sculptured
Surface Machining* (1998); CIRP Annals + Int. J. Machine Tools & Manufacture 5-axis global-collision-avoidance
reviews (2005-2024); hyperMILL (OPEN MIND) + NX CAM / Parasolid kernel docs. Planner: Hermes (xAI Grok, :8645).
