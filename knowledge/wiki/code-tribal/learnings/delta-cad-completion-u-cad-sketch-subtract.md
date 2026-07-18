# DELTA-CAD-COMPLETION/U-CAD-SKETCH-SUBTRACT — [MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-SKETCH-SUBTRACT (slot:delta): first-class sketch-subtractive feature engine + dispatcher wire

**Commit:** `37a510986357` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T23:44:17-05:00
**Tags:** delta-cad-completion, u-cad-sketch-subtract, auto-distilled

## Subject
[MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-SKETCH-SUBTRACT (slot:delta): first-class sketch-subtractive feature engine + dispatcher wire

## Body
```
[MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-SKETCH-SUBTRACT (slot:delta): first-class sketch-subtractive feature engine + dispatcher wire

Closes the coverage-meter 'sketch-subtractive: absent' gap. CADSubtractiveFeatureEngine: cut_hole/
pocket/groove with EXACT analytical removed-volume (pi*r^2*h, w*l*d, w*d*l -- NOT GeometryEngine.
boolean's volume-arithmetic estimate; genuinely complementary per both reviewers) + real-geometry
CadQuery op emission (the cad-text-to-cadquery lane executes -> true CSG). Wired to cadDispatcher
action cad_feature_subtract (z.enum + case + lazy import + .apply). 10/10 tests (3 happy reference-
value + 3 failure + 2 adversarial NaN/Infinity + dispatcher-entrypoint round-trip). tsc type-clean;
2-arm scrutiny BOTH PASS (no P0/P1). Trunk-direct (not slot worktree) to avoid deepening the 432-
commit merge debt (R13). DEFERRED P2s: (1) add Zod schema for cad_feature_subtract in ACTION_CAD_
SCHEMAS; (2) a true registerCadDispatcher-handler E2E test (engine self-validates, so non-blocking).
```

## Files touched (4)
- mcp-server/src/__tests__/CADSubtractiveFeatureEngine.test.ts | 76 ++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/CADSubtractiveFeatureEngine.ts        | 85 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts            | 10 +++++--
- 3 files changed, 168 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 37a510986357`
- Milestone envelope: `mcp-server/data/milestones/DELTA-CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._