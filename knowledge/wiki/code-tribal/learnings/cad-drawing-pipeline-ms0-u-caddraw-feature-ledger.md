# CAD-DRAWING-PIPELINE-MS0/U-CADDRAW-FEATURE-LEDGER — [MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-FEATURE-LEDGER (slot:delta): feature-completeness ledger = root-cause fix for "missed features" + comprehensive pipeline spec

**Commit:** `37e5d383f0fd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T13:37:43-05:00
**Tags:** cad-drawing-pipeline-ms0, u-caddraw-feature-ledger, auto-distilled

## Subject
[MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-FEATURE-LEDGER (slot:delta): feature-completeness ledger = root-cause fix for "missed features" + comprehensive pipeline spec

## Body
```
[MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-FEATURE-LEDGER (slot:delta): feature-completeness ledger = root-cause fix for "missed features" + comprehensive pipeline spec

WHY: yesterday's stepped-bore test silently MISSED the far-side bore diameter + the lead-in transition chamfer (root cause = an OCR/VLM prompt omission, fixed narrowly in 84a78522f8). Generalized: features drop silently at every stage (extract/sketch/model/validate) because nothing ENUMERATES the print's full feature set and RECONCILES every downstream artifact against it. This ledger is that backbone.

WHAT:
- CADFeatureCompletenessLedgerEngine.ts (pure): build() enumerates a print extraction into one entry PER feature (a stepped bore = N entries, NEVER collapsed to 1); reconcile() reports MISSING/EXTRA/MISMATCHED vs a drawn model (fail-loud, never silently drops); advance() tracks extracted->sketched->modeled->validated. Canonical mm (inch x25.4 -- the 25.4x gotcha).
- WIRED to cadDispatcher: cad_feature_ledger_{build,reconcile,status} (enum + getEngine + cases + z.unknown schemas).
- TESTED: 22 tests pass incl. dispatcher round-trip + the keystone (stepped bore -> 1-bore model -> exactly 2 MISSING) + inch-normalization + phantom/extra + forward-only status. tsc clean for changed files.
- SPEC: state/shared/specs/CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md -- full assess+design (6-stage pipeline tagged BUILT/PARTIAL/NET-NEW, 7 dependency-ordered build units, R15 mapping for the 5 operator requirements).

ASSESSED via 4 cited Explore agents: Ollama->CAD lane exists (cad-text-to-cadquery.mjs, STEP blocked on missing cadquery), Fusion bridge :18360 unproven-live + geometry-only sketches, print-regen dimension-by-dimension validation is entirely NET-NEW (the biggest build), CAD per-feature tribal-feed absent (CAM has it).

Keystone first (dependency-order): the ledger is the data contract the sketch-first gate (S1) and the print-regen dim-by-dim gate (S5) both reconcile against. Buildable now, no slot/delta merge needed. Loop iter3.
```

## Files touched (6)
- .../src/__tests__/CADFeatureCompletenessLedgerEngine.test.ts     | 277 +++++++++++++++++++++++
- mcp-server/src/engines/CADFeatureCompletenessLedgerEngine.ts     | 349 +++++++++++++++++++++++++++++
- mcp-server/src/schemas/cadActionSchemas.ts                       |  18 ++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts                |  45 ++++
- .../specs/CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md       |  97 ++++++++
- 5 files changed, 786 insertions(+)

## Lessons surfaced in commit body
- gotcha).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 37e5d383f0fd`
- Milestone envelope: `mcp-server/data/milestones/CAD-DRAWING-PIPELINE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._