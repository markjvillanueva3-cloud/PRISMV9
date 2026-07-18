# BLUEPRINT-VISION-OCR/U-XRAY-PROGRAM-GT-CALIB — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PROGRAM-GT-CALIB (slot:xray): harvest REAL program-GT calibration samples from the validation harness -> closed loop grounded in real machined dims (not only synthetic)

**Commit:** `815567da84c0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T08:56:37-05:00
**Tags:** blueprint-vision-ocr, u-xray-program-gt-calib, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PROGRAM-GT-CALIB (slot:xray): harvest REAL program-GT calibration samples from the validation harness -> closed loop grounded in real machined dims (not only synthetic)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PROGRAM-GT-CALIB (slot:xray): harvest REAL program-GT calibration samples from the validation harness -> closed loop grounded in real machined dims (not only synthetic)

Unit A (5ab3c49002) made the OCR calibration ACCUMULATE across runs, but the only
sample source was SYNTHETIC perfect-GT prints. This grounds the calibration in REAL
programs -- the operator's "closed loop training utilizing our prints and programs".

New pure `programGtAgreementSamples(fusedDims, programGT, opts)` (cnc-program-gt-lib.mjs):
the program-GT analog of the synthetic perDimCorrectness. For each fused OCR dim:
f = corroboration / n_models (same nm resolution as buildTrainsetRow), correct = the dim
matches a callout-class machined diameter within relTol (the SAME dimMatchesProgram contract
the recall scorer uses; gtDistinct is INCH, value_mm is mm, the matcher converts internally
-> no 25.4x error). >=minModels gate (a single-model dim has no real agreement signal).

WIRED into validate-perfect-parts.mjs behind opt-in --emit-calibration (default OFF ->
byte-identical: no collection, no I/O, recall measurement untouched). It piggybacks on the
OCR the validation ALREADY runs -- no extra GPU, no new GT source. Emission is gated to
gtReliable scored parts only (the program is already the trusted answer key there) and to
the plain full-page branch (which reliably carries per-dim agreement metadata; --tile/
--region-route merged dims map to value_mm only, so they collect nothing -> no false
samples). Samples are tagged source:"program-gt" and land in the SAME store as Unit A's
synthetic-gt samples (additive; the store is provenance-tagged for a future weight/filter unit).

DIAMETER-CLASS SCOPING (the calibration-quality fix both scrutiny arms flagged): the program
GT carries only callout-class DIAMETERS, but the OCR reads all dim types. A correctly-read
LINEAR/chamfer/angle dim would be labeled correct=false against a diameter-only GT -- a false
negative biasing the calibrator toward under-trusting high-agreement dims. So emission
adjudicates ONLY the diameter class (diameterOnly default true): a KNOWN non-diameter type is
EXCLUDED (not mislabeled); an UNKNOWN type is kept (value-only fallback, mirroring
typesCompatible(null,*)=true). Also gated the report counter on the persisted count (wrote>0)
so a failed append never inflates calibration_samples_emitted (arm A P2).

TEST: 11/11 (scripts/lib/cnc-program-gt-calibration.test.mjs) incl. agreement-with-the-recall-
scorer, store-validity of every emitted sample, and the diameter-scoping (known-linear excluded,
unknown-type kept, --diameterOnly:false escape hatch). No-regression: cnc-program-gt-lib 29/29,
dimension-set-score 25/25 (the new dimType import is acyclic). Per-file 2-arm scrutiny PASS
(analyst + reviewer, 0 P0/P1; both P2s -- diameter contamination + emit over-count -- fixed inline).

R12 HONESTY: this does NOT broaden the GT-limited corpus (~39 posted-program parts per
reference_xray_perfect_parts_gt_source_2026_06_22 -- the CAD-model GT leg stays DROPPED, only
~6 readable STEP parts). It extracts MORE signal (calibration samples) from the SAME trusted
parts. Real-GT emission only happens on a --emit-calibration GPU validation run; combined with
Unit A's accumulation the real-GT share of the calibration corpus grows over repeated runs.
```

## Files touched (4)
- scripts/lib/cnc-program-gt-calibration.test.mjs | 116 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/cnc-program-gt-lib.mjs              |  55 ++++++++++++++++++++++++++++++
- scripts/validate-perfect-parts.mjs              |  40 +++++++++++++++++++++-
- 3 files changed, 210 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- tilizing our prints and programs".
- tile/

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 815567da84c0`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._