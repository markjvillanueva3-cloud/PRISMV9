---
name: reference_delta_cad_gen_worklist_expand_wave2_2026_06_26
description: CAD-gen worklist grown 75->108 with 10 proven-feature archetypes; block-pocket contradictory-spec bug fixed (pocket depth >= block thickness)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.541Z
aliases: reference_delta_cad_gen_worklist_expand_wave2_2026_06_26
---


CAD-gen overnight corpus loop (slot:delta, 2026-06-26). `scripts/cad-gen-worklist-expand.mjs` is the
deterministic archetype x dimension-sweep generator feeding the text->CadQuery->STEP training loop
(`cad-gen-overnight-loop.mjs` + `cad-gen-validate.mjs`, output `state/shared/cad-text-gen/<slug>/model.step`,
scheduled task "PRISM CAD Gen Loop" every 30m, cursor-resumable). The loop had DRAINED its 75-spec
worklist (62/62 valid STEP pairs) -- worklist SIZE was the corpus-growth bottleneck, not the loop.

**Shipped (commits aaad682198, 2091a01882):**
- +10 wave-2 archetypes built ONLY from features proven valid in the live corpus (v-block/v-groove,
  chamfered-block, slotted-plate, counterbore-plate, stepped-shaft, frustum, grooved-shaft,
  counterbored-boss, square-tube, shouldered-disc). Strictly NO union/boolean of two free bodies (the
  one UNPROVEN geometry class) -> protects the 100% valid-rate. generateSpecs 51->81; worklist 75->108.
- Eval-gated on LIVE data: square-tube (most novel = hollow extrude) -> VALID via the canonical cadquery
  re-import validator (1 solid, 11 faces); whole corpus 63/63 valid (rate 1.0).

**Bug found (scrutiny arm B, pre-existing):** the `block-pocket` archetype hardcoded a 0.75 inch block
thickness while its swept pocket depth reached 1.0 (tuple [4,3,1.0,1.5]) and 0.75 -> 2 of 3 tuples asked
for a pocket >= stock thickness (through-cut / zero floor) = geometrically contradictory training data
(degrades T2 dim-fidelity). Fix: block thickness `h` is now an EXPLICIT swept dim always > pocket depth;
regression test pins pd < h per tuple.

**Reusable lesson:** a parametric spec/training-data generator MUST enforce per-tuple geometric-ordering
invariants (counterbore dia > hole dia, frustum top < base, tube wall < half-outside, pocket/bore depth
< stock thickness, monotone step diameters) -- a contradictory prompt still yields a "valid" STEP (the
validator only checks solid/face validity, NOT prompt fidelity), so the defect is silent and only hurts
downstream dim-accuracy training. Sibling of [[feedback_loop_until_gaps_filled]].

**Dedup note (R8):** did NOT build a CADSheetMetalEngine -- BendAllowanceEngine + FlatPatternEngine
already exist and are wired to calcDispatcher + formingCastingDispatcher. Three queued CAD "capability
units" (sheet-metal, boolean->GeometryEngine.boolean, 2D-drawing->CADDrawingKnowledgeEngine) are all
dup-flagged; corpus growth, not new engines, is the live lever. The deep unlock (real training +
dim-accuracy validation) stays OPERATOR-GATED on U-MERGE-SLOT-DELTA. Prior: [[reference_delta_cad_gen_loop_fixes_2026_06_26]].
