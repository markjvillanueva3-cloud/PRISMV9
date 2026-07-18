# CAD-COMPLETION/U-CAD-GEOMCOMPARE-TESTS — [MAIN-FORCE] [CAD-COMPLETION]/U-CAD-GEOMCOMPARE-TESTS (slot:delta): first test suite for the untested CADGeometryComparisonEngine + fix AgentSpec->Record tsc error

**Commit:** `202ce9969bfe` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T13:42:31-05:00
**Tags:** cad-completion, u-cad-geomcompare-tests, auto-distilled

## Subject
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-GEOMCOMPARE-TESTS (slot:delta): first test suite for the untested CADGeometryComparisonEngine + fix AgentSpec->Record tsc error

## Body
```
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-GEOMCOMPARE-TESTS (slot:delta): first test suite for the untested CADGeometryComparisonEngine + fix AgentSpec->Record tsc error

The core CAD comparison engine (consumed by cad_geometry_compare + the regen-fidelity runner, used
across 10+ dispatchers) had ZERO tests. Added 10 vitest cases over hermetic temp-STEP fixtures:
extractMetrics (cube bbox + bbox-proxy volume + inch->mm normalization + empty), compare (determinism,
size-delta gate, per-call thresholds never mutate the singleton), detectFormat, setThresholds round-trip,
and a REGRESSION GUARD documenting the point-cloud-bbox curved-geometry limitation (the invariant the
regen-fidelity runner's bboxMeasurable gate relies on). This is the safety net that unblocks the future
CIRCLE-radius-aware extractMetrics fix.

Also fixed a real tsc error in my hermes_cad_build_plan case: AgentSpec (interface) -> Record<string,unknown>
param via a spread literal (surfaced by a peer change to the shared dispatcher during the session). My files
tsc-clean; 29 tests green. (5 unrelated pre-existing peer tsc errors remain: PP*PostEngine/RL-CAM/cost.ts.)
```

## Files touched (3)
- mcp-server/src/__tests__/CADGeometryComparisonEngine.test.ts | 131 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/hermesDispatcher.ts         |   4 +++-
- 2 files changed, 134 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 202ce9969bfe`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._