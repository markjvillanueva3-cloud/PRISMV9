---
name: reference_cad_geom_composition_2026_06_11
description: "Added the surface-topology (geometric composition) CAD-gen training signal - the 3rd complementary CAD training signal (2026-06-11 slot:india, commit 22be177ec3)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.494Z
aliases: reference_cad_geom_composition_2026_06_11
---


# CAD surface-topology training signal (2026-06-11, slot:india)

**What + why.** Third complementary CAD-gen training signal for the delta closed-loop training goal.
The STEP geometry report (`mcp-server/data/state/cad-corpus-step-geometry-report.json`) carries, per
class (mined from 665 JM-Die STEP files), the surface-primitive composition
(`total_cylindrical/toroidal/conical/b_spline`) + a `geometry_complexity` simple/medium/complex
histogram -- a quantitative topology prior that training never used. Now converted to pairs: "a die
averages ~22.8 cylindrical, ~4.7 toroidal, ~10.1 conical, ~39.6 B-spline surfaces per part; 51%
simple / 32% medium / 17% complex." Teaches the generator the surface-primitive MIX per class
(steers modelling approach), complementing WHICH features (priors) + corrections.

**Shipped (commit `22be177ec3`, [MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-GEOM-COMPOSITION):**
`scripts/lib/cad-geometry-composition-to-training.mjs` (pure: per_class -> per-part averages;
R12 skips 0-file classes) + `scripts/build-cad-geometry-composition-dataset.mjs` ->
`state/shared/lora/cad-geometry-composition-dataset.jsonl`. Registered advisory source
`cad-geometry-composition`. 11 tests. VALIDATED: 11 pairs/11 classes, assembler folds
`cad-geometry-composition: 11 added`.

**CAD-gen corpus now = 111 pairs / 11 classes / 3 complementary signals** (this session, slot:india):
- 29 fix corrections (what was missing + the fix op) -- [[reference_cad_capture_loop_2026_06_11]]
- 71 feature-presence priors (which features a class has) -- [[reference_cad_gt_feature_priors_2026_06_11]]
- 11 surface-topology composition (this unit)
Up from 27 pairs / 5 classes / 1 signal at session start.

**In-lane tractable signals from existing corpus data are now EXHAUSTED.** The remaining levers toward
"100% accuracy 100% everytime" require bigger / other-slot work, NOT another converter:
1. **Dimensional GT** (values + tolerances) -- needs a STEP re-mine with a dimensional parser
   (the current `mine-step-geometry-evidence` is presence/count-only). A separate milestone; arguably
   blueprint-vision/delta territory. THIS is the accuracy ceiling.
2. **Live-loop coverage** -- only `die` has a correction-loop ledger; the capture writer auto-adds rows
   as delta runs the `:18365` Fusion loop for the other 10 classes (delta's job; india built the harvest).
3. **Autonomous capture** -- a scheduled task running `append-cad-corrections-to-fix-ledger.mjs --apply`
   (operator-infra decision; the writer is idempotent + dry-run-safe).
