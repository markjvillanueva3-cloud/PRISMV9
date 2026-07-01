# BUILD-FIX/U-INVENTOR-STALE-TEST-FIXTURES — [MAIN-FORCE] [BUILD-FIX]/U-INVENTOR-STALE-TEST-FIXTURES (slot:india): fix 6 stale Inventor buildScript test fixtures -> 73/73 (was 67/73)

**Commit:** `5ede6153330b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T05:12:12-05:00
**Tags:** build-fix, u-inventor-stale-test-fixtures, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-FIX]/U-INVENTOR-STALE-TEST-FIXTURES (slot:india): fix 6 stale Inventor buildScript test fixtures -> 73/73 (was 67/73)

## Body
```
[MAIN-FORCE] [BUILD-FIX]/U-INVENTOR-STALE-TEST-FIXTURES (slot:india): fix 6 stale Inventor buildScript test fixtures -> 73/73 (was 67/73)

WHAT: 6 of 73 InventorCADCodeGeneratorEngine tests were RED -- pre-existing, surfaced
when verifying U-INVENTORCAP-LOCAL-IFACE. Root cause = STALE TEST FIXTURES, not engine
bugs (R9: a test must exercise a VALID op; the engine is correctly fail-loud).

ROOT CAUSE + FIX (each verified against the engine's actual emit/validation):
- feature_loft: fixture passed `args:{}` -> emitFeatureLoft throws "requires 'sections'
  array of >=2 sketch indices" (a loft genuinely needs >=2 cross-sections; cites
  LoftFeatures.CreateLoftDefinition). Fix: `{ sections: [1, 2] }` -> emits LoftFeatures.Add.
- feature_sweep: `args:{}` -> requireArg profile_sketch + path_sketch (distinct; cites
  SweepFeatures.AddUsingPath). Fix: `{ profile_sketch: 1, path_sketch: 2 }`.
- assembly_constrain: `{type:"mate"}` -> requireArg occurrence_a + occurrence_b (a
  constraint needs two occurrences). Fix: add `occurrence_a: 1, occurrence_b: 2`.
- export_step/stl/dxf: asserted body contains "SaveAs", but the engine emits the REAL
  Inventor `TranslatorAddIn.SaveCopyAs(oDoc, ...)` API (the documented translator-export
  method; Document.SaveAs is the wrong path for translator export). Fix: assert "SaveCopyAs".

Each fix STRENGTHENS/CORRECTS (R12/R9): the loft/sweep/assembly tests now exercise a
genuine valid op end-to-end (was a no-op that threw); the export tests now assert the
correct API. No assertion removed/weakened; no .skip/.only.

VERIFY: InventorCADCodeGeneratorEngine.test.ts 67/73 -> 73/73. Test-only change (zero
production/runtime impact; engine unchanged). Per-file 2-arm scrutiny (test-review-agent
+ code-analyzer) PASS, 0 P0/P1 -- both confirmed it is a correction, not green-washing
(SaveCopyAs verified as the canonical Inventor API; script.body verified a joined string
so toContain is real substring matching). Closes the delta-flagged Inventor reds from
the prior U-INVENTORCAP commit.
```

## Files touched (2)
- mcp-server/src/__tests__/InventorCADCodeGeneratorEngine.test.ts | 12 ++++++------
- 1 file changed, 6 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- wrong path for translator export). Fix: assert "SaveCopyAs".

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 5ede6153330b`
- Milestone envelope: `mcp-server/data/milestones/BUILD-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._