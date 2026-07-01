---
name: feedback_model_validate_against_print_loop
description: "ORDER OF OPERATIONS for print→CAD — enumerate EVERY feature first, model dimensioned+constrained, then GENERATE a print from the model and COMPARE it to the original print, fix gaps, loop until they match. Never declare a part done from the model alone — the regenerated print must match the real print. Operator rule 2026-06-18."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.435Z
aliases: feedback_model_validate_against_print_loop
---


**Rule (operator 2026-06-18, slot:delta) — change the order of operations so modeling can't silently drop features:**

1. **READ the print → enumerate EVERY feature into a checklist FIRST.** Not just the envelope — every hole, bore, tap, dowel slot, counterbore, pocket, forming cavity, face blend, chamfer, radius, with its size + position + qty. A block is NOT "envelope + 2 holes."
2. **Model each feature**, dimensioned + constrained + centered (per [[feedback_dimension_and_constrain_sketches]]).
3. **GENERATE a print/views FROM the model** (Fusion Drawing API, or `viewport.saveAsImageFile` orthographic captures TOP/FRONT/RIGHT/ISO).
4. **COMPARE the generated print to the ORIGINAL print, feature-by-feature**, against the step-1 checklist.
5. **Any missing or wrong feature → fix → loop to step 3.** The part is done ONLY when the regenerated print matches the original — never from the model alone.

**Autonomy + dimension-sourcing (operator 2026-06-18, do NOT stop to ask):** make the model FULL in one pass following the whole pipeline — do not pause mid-build to ask which feature/position to use. **Read EVERY note + callout on the print** (drill/tap depths, "FROM OTHER SIDE", T.S.C. datums, qty, REF dims, title-block scale) — the print almost always carries enough to place every feature. For anything NOT explicitly dimensioned, **derive it**: the part views are to a known scale (title-block SCALE, e.g. 1:1 / assembly 1:2 / DETAIL 2:1), so use the dimension chain + ratios + pixel-measure-against-a-known-dimension to compute the most accurate position/size you can — never leave a feature out and never stop to ask. Place it, then let the generate→compare loop (step 3-4) confirm/correct.

**Failure this prevents (live 2026-06-18):** the C-033626 BASE + TOP BLOCK shipped with only the envelope + 2 thru-holes + a *representative* cavity — **MISSING** the 4× 1/4-20 taps (drill 1.00 deep / tap .83 from other side), 2× Ø.250×.50 dowel slots, the alignment-pin press holes, and the real 3°-draft forming cavity (R1.25/R.065 blends, DETAIL A). Operator caught it by eye; the generate-print→compare step would have caught every one automatically. Dropping features silently violates the delta soul (`silent-feature-recognition-fallback` / `dropping-pmi-data-on-import`).

**Mechanism / wiring:** ties into delta's existing **print→CAD→print dim-diff round-trip engine** (`CAD-DRAW-MAX-MS1/U-VALIDATION-ROUNDTRIP`, 28/28 tests) — the regenerated-print-vs-real-print comparison is exactly that round-trip; wire the live-Fusion draws through it. Pairs with [[feedback_blueprint_bind_every_callout_to_feature]] (#6 render-back) + [[feedback_dimension_and_constrain_sketches]] + [[feedback_draw_set_cad_units_to_print]].
