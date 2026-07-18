---
name: reference_cad_gt_feature_priors_2026_06_11
description: "Wired delta's 11 CAD class-prototype ground-truth catalogs into fleet CAD-gen training (71 positive class->feature-prior pairs) - 2026-06-11 slot:india"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.494Z
aliases: reference_cad_gt_feature_priors_2026_06_11
---


# CAD ground-truth feature-priors -> fleet CAD-gen training (2026-06-11, slot:india)

**Goal context:** Phase C delta-domain yolo loop -- "max out training for cad drawing ... complete closed
loop training to draw any cad file from print with 100% accuracy." This iteration grew the CAD-gen
training corpus with the POSITIVE class->feature prior across ALL 11 part classes.

**Gap closed.** `scripts/derive-ground-truth-from-cad.mjs` had already mined
`cad-corpus-step-geometry-report.json` (662 JM-Die STEP files) into 11 per-class ground-truth catalogs
at `state/shared/ocr-ground-truth/cad-prototype-<class>-*.json` (each ranks the features that class
reliably exhibits, by `evidence_ratio`). But only 5 of 11 classes ever reached CAD-gen training signal
(via the fix-ledger's NEGATIVE corrections, see [[reference_delta_cad_fix_ledger_train_shipped_2026_06_11]]);
the 6 others (blisk/bushing/general/impeller/shaft/valve_body) + the full positive prior were dormant.

**Shipped (commit `39401140c2`, [MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-GT-FEATURE-PRIORS):**
- `scripts/lib/cad-ground-truth-to-training.mjs` -- pure: GT catalog -> Alpaca pairs. One graded
  class-level prior ("a <class> part includes [features, core/common/occasional + evidence]") + one
  per-feature pair for each feature with `evidence_ratio >= 0.5` (R9: sub-0.5 features stay in the class
  list graded "occasional" but get NO standalone "required" pair -- don't teach false certainty).
- `scripts/build-cad-ground-truth-dataset.mjs` -- scans all 11 catalogs -> dedup ->
  `state/shared/lora/cad-ground-truth-dataset.jsonl`.
- Registered `cad-ground-truth-feature-priors` (advisory, w=0.5) in `build-fleet-training-corpus-inventory.mjs`.

**Validated LIVE (R15):** 71 unique pairs from 11 classes (0 invalid); fleet assembler folds
`cad-ground-truth-feature-priors: 71 added (w=0.5, advisory, 0 dup, 0 invalid)` -> `training_ready: true`,
34 galaxies. CAD-gen corpus now covers ALL 11 part classes (71 positive priors + 27 fix corrections = 98
pairs). 19 tests (15 lib + 4 builder incl a live 11-class assertion).

**[MAIN-FORCE] rationale:** integrates the fleet training-corpus manifest + assembler (all 34 galaxies)
-- genuine cross-cutting training infra, not slot-local. (This commit ALSO dogfooded the new
slot-commit enforcement from [[reference_slot_commit_enforce_marker_bypass_2026_06_11]]: a plain commit
was correctly blocked; [MAIN-FORCE] was the legitimate escape.)

**Closed-loop state + NEXT lever.** The corpus GROWS (positive priors + negative corrections) but only
COMPOUNDS if new print->CAD comparison discrepancies auto-append to `cad-fix-training-ledger.jsonl`.
Today NO script writes that ledger (80 rows are a one-time 2026-05-19 batch). The next highest-ROI unit
is the CAPTURE writer: delta's live correction loop (`cad-fusion-correction-loop-live.mjs` /
`cad-correction-loop-live-ledger.json`) -> append fix-ledger rows -> corpus self-grows per print.
Also pending: presence-only -> DIMENSIONAL ground truth (the "100% accuracy" goal needs values+tolerances,
not just feature presence). See [[reference_delta_cad_learn_loop_persistence_gap]].
