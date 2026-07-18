---
name: feedback_dimension_and_constrain_sketches
description: "When drawing a model, dimension EVERY sketch feature (diameters, lengths, depths, AND chamfers/radii/angles) with driving sketch dimensions that match the print values, plus geometric constraints, so the sketch is FULLY CONSTRAINED (0 DOF) and every value reads off the sketch for real-time comparison to the print. Operator rule 2026-06-18."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.422Z
aliases: feedback_dimension_and_constrain_sketches
---


**Rule (operator 2026-06-18, slot:delta):** Don't just place geometry at exact coordinates — **dimension and constrain the sketch**. Every feature gets a driving sketch dimension whose value matches the print, plus geometric constraints, so (1) the sketch is **fully constrained** and (2) the operator can eyeball each dimension against the print **in real time**.

**Method (Fusion live bridge :18362, `/execute`):**
0. **ALWAYS draw the part CENTERED on the origin point (operator rule 2026-06-18, caps-emphasis).** The part's bounding-box center sits on the origin — never corner-at-origin or base-at-origin. Blocks: `sketchLines.addCenterPointRectangle(origin, corner)` (or a rectangle spanning ±L/2,±W/2 with `addSymmetry` of opposite edges about the projected X/Y axes) + **symmetric extrude** (`extrudeInput.setSymmetricExtent(IN(H), True)`); features placed symmetric about the origin. Revolves: axis ON the origin (x=0) AND the profile spanning −H/2…+H/2 so mid-length is at the origin. WHY: symmetry about the origin planes makes mirror/pattern/assembly trivial and gives every part a shared center datum — essential for a die set whose parts must align on the pins.
1. Build the geometry (lines/arcs/circles) at the print values.
2. **Geometric constraints:** `geometricConstraints.addHorizontal/addVertical` on H/V segments; chained lines share endpoints (auto-coincident). Anchor position with a SAFE reference (see pitfall).
3. **Driving dimensions — one per print callout:** `sketchDimensions.addDistanceDimension(ptA, ptB, orientation, textPt)` for diameters/lengths/depths (radii measured from the on-axis origin on a revolve half-profile), `addAngularDimension(lineA, lineB, textPt)` for angles, `addRadialDimension` for radii.
4. **Dimension EVERY feature — chamfers and radii too.** A chamfer needs size **and** angle (`.06` leg + `45°`) — or both legs. An undimensioned chamfer/radius leaves the sketch OPEN (this was the live miss: a fully-dimensioned center-post body still read `isFullyConstrained == False` until BOTH .06×45° chamfers were dimensioned, then 0 DOF).
5. **Verify every build:** assert `sketch.isFullyConstrained == True` and round-trip a bbox measurement (`od_in`, `height_in`) back against the print. Report both (R12). "Looks dimensioned" ≠ constrained.

**PITFALL — never anchor a profile point that sits at a RADIUS onto the sketch origin (R12, live regression 2026-06-18):** `addCoincident(borePoint@x=.256, originPoint)` snapped the whole revolve profile onto the axis → OD collapsed **1.5005 → 0.988** and the bad geometry overwrote the good export. A revolve half-profile lives at x = radius, not at x=0. Correct anchor: project the X construction axis and make the **bottom face collinear** to it (it's already at y=0 → no geometry move), and pin radii via **distance dimensions from the on-axis origin**. Always re-measure OD after constraining.

**Techniques that actually reach 0 DOF (learned live 2026-06-18, all 4 C-033626 parts → fully constrained):**
- **Fillet/round arcs: pin by CENTER-position + RADIUS, not by tangent constraints.** Tangent-to-both-lines + radial *under-determines* (the pin's R.030 read `False` until the arc center got ORH+ORV distance dims from the origin + a radial — then 0 DOF).
- **Repeated identical features (twin holes): use `addEqual` + `addHorizontalPoints`/`addVerticalPoints` on the centers, then dimension the size + position ONCE.** Dimensioning each hole's y independently makes the 2nd one a redundant dim that *silently fails* (try/except returns 0) AND still leaves a DOF. Capture the design intent (same Ø, same centerline) with constraints; dimension one.
- **Always instrument dim/constraint calls** (count successes per call) so a silently-dropped dimension is visible — a sketch that's "dimensioned" but reports `isFullyConstrained == False` has a specific failing call; find it, don't guess.

**Why it compounds:** a fully-constrained, print-dimensioned sketch is parametric (change a value, the model updates), self-documents the print intent, and is the substrate for the render-back/overlay self-check ([[feedback_blueprint_bind_every_callout_to_feature]] #6). → [[feedback_draw_set_cad_units_to_print]] · [[reference_delta_cad_drawing_port_18362]]
