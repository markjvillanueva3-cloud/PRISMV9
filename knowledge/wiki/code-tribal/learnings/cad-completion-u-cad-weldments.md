# CAD-COMPLETION/U-CAD-WELDMENTS — [MAIN-FORCE] [CAD-COMPLETION]/U-CAD-WELDMENTS (slot:delta): cad_weldment dispatcher action -- closes the coverage-meter weldments gap

**Commit:** `8606569c8fb4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T04:43:24-05:00
**Tags:** cad-completion, u-cad-weldments, auto-distilled

## Subject
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-WELDMENTS (slot:delta): cad_weldment dispatcher action -- closes the coverage-meter weldments gap

## Body
```
[MAIN-FORCE] [CAD-COMPLETION]/U-CAD-WELDMENTS (slot:delta): cad_weldment dispatcher action -- closes the coverage-meter weldments gap

Genuinely net-new (R8): no CADWeldmentEngine existed, no cad_weldment action. CADWeldmentEngine computes
real AWS/structural weldment geometry: member (volume = section_area * length, swept profile), gusset
(0.5 * leg_a * leg_b * thickness, right-triangle plate), weld_bead (equal-leg fillet: volume =
0.5 * leg^2 * length, throat = leg/sqrt(2)). Each emits the CadQuery op the codegen lane writes.

WIRED: cad_weldment in ACTIONS z.enum + case (lazy-import .apply) + cadWeldmentSchema in
ACTION_CAD_SCHEMAS (zero-regression: optional + z.enum on op + z.coerce.number + .passthrough).
TESTED: 12 engine reference-value tests (member/gusset/weld_bead exact volumes + throat + 3 failure
modes (non-positive member/gusset/weld) + 2 adversarial NaN/Infinity + apply() alias round-trip +
missing-dim->NaN->fail) + schema cases. 22/22 pass; tsc-clean. Engine convention:
pure-calc/typed/structured-fail-never-throw/.js imports.
```

## Files touched (6)
- mcp-server/src/__tests__/CADWeldmentEngine.test.ts               | 72 +++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/cadActionSchemas.coverage-meter.test.ts |  9 ++++-
- mcp-server/src/engines/CADWeldmentEngine.ts                      | 88 ++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/cadActionSchemas.ts                       | 12 +++++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts                |  8 +++++
- 5 files changed, 188 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8606569c8fb4`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._