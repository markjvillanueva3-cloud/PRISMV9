# FUSION-TRAIN-GEOM-EVIDENCE/U-FGE02 — [MAIN] [FUSION-TRAIN-GEOM-EVIDENCE]/U-FGE02: wire evidence-ranked build order into cad_class_drive_build (Fusion360 path)

**Commit:** `c60f6c9396b7` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T11:13:49-05:00
**Tags:** fusion-train-geom-evidence, u-fge02, auto-distilled

## Subject
[MAIN] [FUSION-TRAIN-GEOM-EVIDENCE]/U-FGE02: wire evidence-ranked build order into cad_class_drive_build (Fusion360 path)

## Body
```
[MAIN] [FUSION-TRAIN-GEOM-EVIDENCE]/U-FGE02: wire evidence-ranked build order into cad_class_drive_build (Fusion360 path)

U-FGE01 shipped buildSequenceForEvidence + cad_class_build_sequence_evidence
action but the live Fusion360 build orchestrator (cad_class_drive_build) was
still iterating baseline.missing_features in its natural order — the new
evidence ranking wasn't consumed by the build path.

This wires it. Adds two opt-in params:
- use_corpus_evidence (default false — preserves pre-2026-05-18 behavior byte-identical)
- min_evidence_ratio (passed to buildSequenceForEvidence)

When use_corpus_evidence=true, the orchestrator:
1. Loads cad-corpus-step-geometry-report.json (same 16MB cap + import.meta.url
   anchoring + shape validation as U-FGE01)
2. Calls buildSequenceForEvidence to get the evidence-ranked feature sequence
3. Builds a rank-by-kind map and re-orders missing_features (kinds present in
   evidence sequence first, in ratio order; kinds absent preserve original tail
   order via stable secondary sort on baseline.missing_features.indexOf)
4. Iterates the re-ordered list through the existing build-hint switch

Per-feature prevalence + presence checks UNCHANGED — only the ORDER changes.
This means features the corpus shows as class-typical get built first (e.g.
central_oil_hole 71/75=0.947 ranks above bevel_face_chamfer 38/75=0.507),
matching the canonical build order the corpus learned.

Result shape extended additively: use_corpus_evidence flag echoed back,
evidence_ordered_missing, evidence_caveats, corpus_class_found, corpus_report_path,
corpus_read_error. When use_corpus_evidence=false (default), every new field is
the zero-state — existing callers unaffected.

0 new tsc errors (the cadDispatcher.ts L3054 TS2344 is the pre-existing
LoRATrainingPair generic-type issue, unrelated). Underlying primitive
buildSequenceForEvidence is already covered by 13 tests in U-FGE01.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- mcp-server/src/tools/dispatchers/cadDispatcher.ts | 82 ++++++++++++++++++++++-
- 1 file changed, 81 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till iterating baseline.missing_features in its natural order — the new

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c60f6c9396b7`
- Milestone envelope: `mcp-server/data/milestones/FUSION-TRAIN-GEOM-EVIDENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._