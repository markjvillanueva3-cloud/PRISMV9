# CAD-DRAWING-PIPELINE-MS0/U-CADDRAW-SKETCH-DIM-GATE — [MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-SKETCH-DIM-GATE (slot:delta): sketch-first first-line-of-defense (stage S1, composes the ledger)

**Commit:** `aa11b794dbc8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T15:04:11-05:00
**Tags:** cad-drawing-pipeline-ms0, u-caddraw-sketch-dim-gate, auto-distilled

## Subject
[MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-SKETCH-DIM-GATE (slot:delta): sketch-first first-line-of-defense (stage S1, composes the ledger)

## Body
```
[MAIN-FORCE] [CAD-DRAWING-PIPELINE-MS0]/U-CADDRAW-SKETCH-DIM-GATE (slot:delta): sketch-first first-line-of-defense (stage S1, composes the ledger)

WHY: a print is dimensioned 2D views, so the model is authored sketch-first; the cheapest place to catch a missed feature is at the SKETCH stage, before any 3D. Stage S1 of CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md.

WHAT:
- CADSketchDimensionGateEngine.ts (pure, COMPOSES CADFeatureCompletenessLedgerEngine): evaluate(ledger, sketchDimensions) reconciles the dims captured in the sketches against the print-feature ledger, advances every captured feature extracted->sketched, emits PASS/FAIL. PASS only when every SKETCHABLE print dim is captured within tolerance; GD&T/threads DEFERRED (annotations, not sketch geometry) so never block; extra sketch dims advisory (notOnPrint); an invalid ledger entry blocks.
- WIRED to cadDispatcher: cad_sketch_dim_gate (enum + getEngine cadSketchGate + case + z.unknown schema).
- TESTED: 10 tests incl dispatcher round-trip + keystone (stepped bore, only near bore sketched -> pass=false, 2 uncaptured = far bore + lead-in chamfer) + out-of-tol + non-sketchable-deferred + extra-advisory + invalid-blocks + non-mutation + idempotent re-eval. tsc clean for changed files.

NOTE: stale .git/sequencer (June 12, no CHERRY_PICK_HEAD, 0 unmerged) prints a cosmetic cherry-pick banner; benign (unit-1 committed through it). Next: U-CADDRAW-TRIBAL-INJECT. Loop iter4.
```

## Files touched (5)
- mcp-server/src/__tests__/CADSketchDimensionGateEngine.test.ts | 150 ++++++++++++++++++++++++++++++++
- mcp-server/src/engines/CADSketchDimensionGateEngine.ts        | 130 +++++++++++++++++++++++++++
- mcp-server/src/schemas/cadActionSchemas.ts                    |   5 ++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts             |  18 ++++
- 4 files changed, 303 insertions(+)

## Lessons surfaced in commit body
- NOTE: stale .git/sequencer (June 12, no CHERRY_PICK_HEAD, 0 unmerged) prints a cosmetic cherry-pick banner; benign (unit-1 committed through it). Next: U-CADDRAW-TRIBAL-INJECT. Loop iter4.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show aa11b794dbc8`
- Milestone envelope: `mcp-server/data/milestones/CAD-DRAWING-PIPELINE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._