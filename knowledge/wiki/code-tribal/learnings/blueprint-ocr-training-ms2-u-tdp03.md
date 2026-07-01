# BLUEPRINT-OCR-TRAINING-MS2/U-TDP03 — [MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP03: extraction aggregator — events JSONL to per-class learned templates

**Commit:** `99288aec442e` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T11:51:50-05:00
**Tags:** blueprint-ocr-training-ms2, u-tdp03, auto-distilled

## Subject
[MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP03: extraction aggregator — events JSONL to per-class learned templates

## Body
```
[MAIN] [BLUEPRINT-OCR-TRAINING-MS2]/U-TDP03: extraction aggregator — events JSONL to per-class learned templates

User: "start training print reading first, we need to start generating templates for
dimensions and features extracted plus tolerancing".

Closes the gap: U-TDP01/U-TDP02 produce extraction events; nothing aggregated them
into learned per-part_class templates. This is the training-output unit.

Ships 3 new files + bug-fixes 3 prior ones.

- scripts/lib/extraction-aggregator-lib.mjs (PURE, 273 LOC, 9 exports)
  - Welford's algorithm for numerically-stable online mean+stddev (verified
    against reference values [1,2,3,4,5] → mean=3, stddev=sqrt(2.5); 10K sample
    stable; NaN/Infinity-resistant).
  - extractFeatureSamples: dimensions[] + features[] tolerant parser. Computes
    tolerance_band = upper - lower (canonical, distinguishes bilateral from
    unilateral). Fallback kind 'unspecified_dim'.
  - aggregateExtractions: stratified-by-part_class aggregation. Each feature
    kind tracks (evidence_count, prevalence, dimension Welford, tolerance
    Welford). Same kind appearing twice in ONE print counts once toward
    prevalence (but every measurement contributes to the dim distribution).
    Configurable minSamplesPerFeature (default 3) — anti-spurious-stat guard.
  - templateDivergence: operator-review surface comparing learned vs hand-tuned
    template (ranks matched features by |learned_prev - baseline_prev|; surfaces
    only_in_learned + only_in_baseline lists).
  - R12: skip counts surfaced (type / no_payload / no_class / no_extraction)
    so silent drops are impossible.

- scripts/lib/extraction-aggregator-lib.test.mjs (31 tests, 31/31 PASS)
  Welford correctness against reference values + 10K-sample stability.
  Prevalence semantics: same-kind-twice-in-one-extraction counts once.
  Tolerance band: upper-lower bilateral/unilateral distinction verified.
  Min-samples guard: rare features filtered out (anti-spurious-stat).
  NaN-poison: corrupt nominals don't poison the mean (n excludes NaN, prev
  still counts the kind).
  1000-event batch: classes sorted by n_samples desc, features by prevalence desc.
  templateDivergence: matched-by-divergence-desc + only-in-each-side.

- scripts/aggregate-extractions-to-template.mjs (CLI, 121 LOC)
  Reads blueprint-accuracy-events.jsonl, emits per-class learned-template
  JSON files to state/shared/learned-templates/template-<class>-<date>.json
  + index file. Atomic writes. --min-samples / --json / --help.
  Exit 0 success, 2 events file missing, 3 args/fs error.

- BUG-FIX scripts/lib/training-driver-lib.mjs: event.payload.extraction was
  dropped (only confidence summary survived). Aggregator saw 0 extractions.
  Fix: include full extraction object in event payload. Pinned by two new
  test cases (extraction object preserved on success, extraction=null on fail).
  34/34 tests PASS.

- ALIGN training-driver-print-to-cam.mjs + harvest-prints-to-training.mjs
  stub adapters: emit canonical BlueprintExtraction shape ({kind, nominal,
  tolerance: {upper, lower}}) instead of legacy {id, value, unit}. Per-class
  recipes with small jitter so the aggregator's distribution stats produce
  non-degenerate baselines even in stub mode (sanity-check vs real extractions).

End-to-end smoke-tested live (8 synthetic prints across die/extrude_punch/shaft):
  [aggregator] die: n=3
    - ejector_pin_hole: prev=1.000 dim_mean=4.761 ± 0.005 mm
    - stepped_revolved_axis: prev=1.000 dim_mean=12.601 ± 0.108 mm
  [aggregator] extrude_punch: n=3
    - central_oil_hole: prev=1.000 dim_mean=1.272 ± 0.012 mm
    - stepped_revolved_axis: prev=1.000 dim_mean=6.241 ± 0.134 mm
  [aggregator] shaft: n=2
    - stepped_revolved_axis: prev=1.000 dim_mean=25.192 ± 0.222 mm

This is the training-output unit. Operators now run:
  harvest-prints-to-training --dir "H:/prism/JM DIE" --stub-mode
  aggregate-extractions-to-template --min-samples 5
to get per-class learned templates with prevalence + dimension distribution +
tolerance distribution. Real extractions (live vision LLM) plug into the same
pipeline once operator-gated credentials are wired in U-TDP04.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (8)
- scripts/aggregate-extractions-to-template.mjs  | 134 +++++++++
- scripts/harvest-prints-to-training.mjs         |  31 ++-
- scripts/lib/extraction-aggregator-lib.mjs      | 300 ++++++++++++++++++++
- scripts/lib/extraction-aggregator-lib.test.mjs | 371 +++++++++++++++++++++++++
- scripts/lib/training-driver-lib.mjs            |   5 +
- scripts/lib/training-driver-lib.test.mjs       |  27 ++
- scripts/training-driver-print-to-cam.mjs       |  49 +++-
- 7 files changed, 902 insertions(+), 15 deletions(-)

## Lessons surfaced in commit body
- till counts the kind).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 99288aec442e`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._