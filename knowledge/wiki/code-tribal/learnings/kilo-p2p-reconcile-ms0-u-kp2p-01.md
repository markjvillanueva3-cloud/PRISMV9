# KILO-P2P-RECONCILE-MS0/U-KP2P-01 — [MAIN] [KILO-P2P-RECONCILE-MS0]/U-KP2P-01: rewire mill print-to-program dispatcher off the stub

**Commit:** `fef972036f32` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T12:46:48-05:00
**Tags:** kilo-p2p-reconcile-ms0, u-kp2p-01, auto-distilled

## Subject
[MAIN] [KILO-P2P-RECONCILE-MS0]/U-KP2P-01: rewire mill print-to-program dispatcher off the stub

## Body
```
[MAIN] [KILO-P2P-RECONCILE-MS0]/U-KP2P-01: rewire mill print-to-program dispatcher off the stub

RGS-generated KILO-P2P-RECONCILE-MS0 milestone (4 units) + shipped U-KP2P-01.

millDispatcher's "program" bucket lazy-imported the MillPrintToProgramEngine
stub (returns {ok:false,stub:true}); mill_print_to_program + mill_generate_gcode
were non-functional. Re-pointed the bucket to the real MillingPrintToProgramEngine
(runFullPipeline, 81K). Added toMillingInput adapter (dispatcher schema types
material as a string; engine needs a {material_name,iso_group} object). Fixed
mill_generate_gcode's schema (stub-era operations[] requirement -> features-based,
mirrors mill_print_to_program). Stub kept + annotated SUPERSEDED (still imported
by MillMasterOrchestratorFacadeEngine -> flagged for U-KP2P-02).

12-case dispatcher round-trip test, all green; tsc clean; per-file scrutiny 2/2 PASS.
```

## Files touched (7)
- .../data/milestones/KILO-P2P-RECONCILE-MS0.json    | 197 +++++++++++++++++++++
- mcp-server/data/roadmap-index.json                 |  20 ++-
- .../millDispatcher.printToProgram.test.ts          | 196 ++++++++++++++++++++
- mcp-server/src/engines/MillPrintToProgramEngine.ts |  12 +-
- mcp-server/src/schemas/millActionSchemas.ts        |  65 ++++++-
- mcp-server/src/tools/dispatchers/millDispatcher.ts |  86 ++++++++-
- 6 files changed, 560 insertions(+), 16 deletions(-)

## Lessons surfaced in commit body
- till imported

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fef972036f32`
- Milestone envelope: `mcp-server/data/milestones/KILO-P2P-RECONCILE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._