# FUSION-TRAIN-GEOM-EVIDENCE/U-FGE01 — [MAIN] [FUSION-TRAIN-GEOM-EVIDENCE]/U-FGE01: wire STEP geometry corpus into build-sequence inference

**Commit:** `62b5794101ff` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T10:03:05-05:00
**Tags:** fusion-train-geom-evidence, u-fge01, auto-distilled

## Subject
[MAIN] [FUSION-TRAIN-GEOM-EVIDENCE]/U-FGE01: wire STEP geometry corpus into build-sequence inference

## Body
```
[MAIN] [FUSION-TRAIN-GEOM-EVIDENCE]/U-FGE01: wire STEP geometry corpus into build-sequence inference

Closes the named gap from reference_cad_fusion_training_2026_05_18:
"geometry model not auto-wired into build-sequence inference".

Adds CADClassFeatureLibraryEngine.buildSequenceForEvidence(partClass, opts)
that ranks template features by LIVE corpus evidence (count/files_examined)
instead of static template prevalence. Falls back loudly when corpus missing.

Hardening (per per-file scrutiny round 1):
- 16MB byte cap on corpus file (matches ask-ollama/regen-viz V8 string-cap class)
- fs.stat pre-check + shape validation; success=false when read fails (R12)
- CWD-independent path resolution via import.meta.url
- Number.isFinite guard on count values (NaN-poison defense for drift surface)
- DRIFT_TEMPLATE_PREVALENCE_THRESHOLD constant (no inline magic)

Dispatcher: new action cad_class_build_sequence_evidence wires to engine.
Existing cad_class_build_sequence behavior unchanged (additive).

35/35 tests PASS (12 new + 1 NaN-poison regression). 0 new tsc errors.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/CADClassFeatureLibraryEngine.test.ts | 183 +++++++++++++++++++++
- .../src/engines/CADClassFeatureLibraryEngine.ts    | 168 +++++++++++++++++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  |  91 +++++++++-
- 3 files changed, 441 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 62b5794101ff`
- Milestone envelope: `mcp-server/data/milestones/FUSION-TRAIN-GEOM-EVIDENCE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._