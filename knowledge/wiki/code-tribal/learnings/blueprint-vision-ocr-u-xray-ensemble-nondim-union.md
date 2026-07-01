# BLUEPRINT-VISION-OCR/U-XRAY-ENSEMBLE-NONDIM-UNION — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENSEMBLE-NONDIM-UNION (slot:xray): fuseEnsemble unions gdt/notes/profiles/surface_finishes (was silently dropped at fuse); trainset row + report record non-dim coverage

**Commit:** `a783df2419d5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T03:05:09-05:00
**Tags:** blueprint-vision-ocr, u-xray-ensemble-nondim-union, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENSEMBLE-NONDIM-UNION (slot:xray): fuseEnsemble unions gdt/notes/profiles/surface_finishes (was silently dropped at fuse); trainset row + report record non-dim coverage

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-ENSEMBLE-NONDIM-UNION (slot:xray): fuseEnsemble unions gdt/notes/profiles/surface_finishes (was silently dropped at fuse); trainset row + report record non-dim coverage

Producer (vision-ensemble-fuse.mjs): fuseEnsemble fused dimensions ONLY and silently
dropped each models extracted gdt/notes/profiles/surface_finishes -- so the ensemble
discarded every GD&T frame/note/profile/finish it read (R12 data loss; buildRegionRoutedFused
already ASSUMED the fused carried them). Adds a recall-first cross-model UNION of those four
fields, de-duped by per-field identity (FCF identity for gdt; category+text for notes;
name+type+dims for profiles; ra/raw+location for finishes), each entry tagged
corroboration/n_models/models/hallucination_candidate (mirrors the dimension trust metadata).
New summary counts n_gdt/n_notes/n_profiles/n_surface_finishes. Order is corroboration-desc
then identity-key-asc (content-deterministic, input-order-independent). Additive: existing
consumers read dimensions/summary and are byte-unaffected.

Consumer (ocr-training-loop-lib.mjs + blueprint-ocr-training-loop.mjs): buildTrainsetRow
records gdt_count/note_count/profile_count/surface_finish_count; aggregateTrainingLoop rolls
up non_dim_coverage. The runner now writes those counts into the trainset JSONL row AND a
this_run_non_dim_coverage block in the report -- so the closed-loop corpus is observably no
longer dimension-only (counts only; GD&T is not a trained label yet -- a future unit tiers it).

Tests: vision-ensemble-fuse 43/43 (10 new union tests: happy + >=3 failure + >=2 adversarial,
incl order-insensitive datums, recall-first singleton-kept, single-model no-false-flag,
determinism, rep-by-confidence); ocr-training-loop-lib 29/29 (3 new). Per-file 2-arm scrutiny
each file; arm B caught a real orphan P1 (runner discarded the counts) -> fixed by wiring both
write sites. LIVE-VALIDATED: a clean synthetic print through the runner produced report
this_run_non_dim_coverage {gdt:1,notes:1,profiles:0,surface_finishes:1} -- non-zero, proving
the path reaches the report destination. Consumer regression sweep green (region-glue 22,
region-classify 17, tiling-extract 14, tiling-lib 24).
```

## Files touched (6)
- scripts/blueprint-ocr-training-loop.mjs    |  15 ++++++-
- scripts/lib/ocr-training-loop-lib.mjs      |  14 +++++++
- scripts/lib/ocr-training-loop-lib.test.mjs |  37 +++++++++++++++++
- scripts/lib/vision-ensemble-fuse.mjs       | 113 ++++++++++++++++++++++++++++++++++++++++++++++++++--
- scripts/lib/vision-ensemble-fuse.test.mjs  | 149 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 5 files changed, 324 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- tiling-extract 14, tiling-lib 24).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a783df2419d5`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._