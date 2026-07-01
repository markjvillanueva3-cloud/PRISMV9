# FUSION-TRAIN-GEOM-EVIDENCE/U-FGE03 — [MAIN] [FUSION-TRAIN-GEOM-EVIDENCE]/U-FGE03: persist learned-prevalence overlay + auto-apply on default build-sequence path

**Commit:** `e7d583b344c0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T19:56:15-05:00
**Tags:** fusion-train-geom-evidence, u-fge03, auto-distilled

## Subject
[MAIN] [FUSION-TRAIN-GEOM-EVIDENCE]/U-FGE03: persist learned-prevalence overlay + auto-apply on default build-sequence path

## Body
```
[MAIN] [FUSION-TRAIN-GEOM-EVIDENCE]/U-FGE03: persist learned-prevalence overlay + auto-apply on default build-sequence path

Closes the R12 gap named in reference_cad_fusion_training_2026_05_18:
"the geometry report is the real model but is NOT auto-blended into the
live build-sequence templates -- cad_corpus_apply_learned does an
in-memory blend with no persistence path. Wire-to-inference is a real
follow-up unit." U-FGE01 (62b5794101) added opt-in buildSequenceForEvidence;
U-FGE02 (c60f6c9396) added a use_corpus_evidence flag (default off). U-FGE03
makes the blend PERSISTENT and auto-applied on the DEFAULT path.

- CADCorpusFeaturePrevalenceLearnerEngine.persistLearned(): atomic
  tmp+rename overlay write; NaN/Infinity skipped+counted (R12, never
  persisted); clamp [0,1]; typed result, ok:false+error on fs failure
  (never throws); honors PRISM_CAD_PREVALENCE_OVERLAY_PATH (writer/reader
  path parity, KEEP-IN-SYNC).
- CADClassFeatureLibraryEngine: lazy fail-soft mtime-cached overlay loader;
  templateFor() auto-applies the blend (default path now consumes trained
  geometry); byte-identical static fallback when no overlay (preserves all
  pre-U-FGE03 callers + FGE01/02 tests); 16MB cap; corrupt/oversized/
  shape-invalid -> static + surfaced error (R12). overlayStatus() R12
  visibility; clearOverlayCache() test seam.
- NEW templateForStatic(): buildSequenceForEvidence drift baseline reads
  STATIC (not overlay-blended) prevalence -- prevents the corpus-vs-corpus
  degeneration that would silently blind FGE01's retrain signal (per-file
  scrutiny arm B P1-1).
- cadDispatcher: cad_corpus_apply_learned gains opt-in params.persist;
  new cad_corpus_overlay_status action (enum+case). Additive -- existing
  behavior unchanged. Schema: cad_corpus_* group has no cadActionSchemas
  entries by group convention (FGE01 precedent, R11).

19 new tests (8 persistLearned + 10 overlay + 1 dispatcher round-trip);
68/68 suites green incl. all pre-existing FGE01/02; 0 new tsc errors.
Per-file scrutiny: 2 arms re-dispatched on full set -> both SHIP, 0 P0/P1/P2.

Deferred P3 (logged): shared overlay-path resolver helper; defensive
afterAll env restore in lib test.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (6)
- .../__tests__/CADClassFeatureLibraryEngine.test.ts | 233 ++++++++++++++++++++-
- ...CADCorpusFeaturePrevalenceLearnerEngine.test.ts | 151 +++++++++++++
- .../src/engines/CADClassFeatureLibraryEngine.ts    | 228 +++++++++++++++++++-
- .../CADCorpusFeaturePrevalenceLearnerEngine.ts     | 168 +++++++++++++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  |  30 ++-
- 5 files changed, 805 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e7d583b344c0`
- Milestone envelope: `mcp-server/data/milestones/FUSION-TRAIN-GEOM-EVIDENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._