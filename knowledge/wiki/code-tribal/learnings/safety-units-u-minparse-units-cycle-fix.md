# SAFETY-UNITS/U-MINPARSE-UNITS-CYCLE-FIX — [MAIN-FORCE] [SAFETY-UNITS]/U-MINPARSE-UNITS-CYCLE-FIX (slot:alpha): Okuma MIN parser mapped G70/G71 to inch/mm -> roughing-cycle blocks silently corrupted units to mm (25.4x hazard)

**Commit:** `25f1ee33facf` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T08:07:12-05:00
**Tags:** safety-units, u-minparse-units-cycle-fix, auto-distilled

## Subject
[MAIN-FORCE] [SAFETY-UNITS]/U-MINPARSE-UNITS-CYCLE-FIX (slot:alpha): Okuma MIN parser mapped G70/G71 to inch/mm -> roughing-cycle blocks silently corrupted units to mm (25.4x hazard)

## Body
```
[MAIN-FORCE] [SAFETY-UNITS]/U-MINPARSE-UNITS-CYCLE-FIX (slot:alpha): Okuma MIN parser mapped G70/G71 to inch/mm -> roughing-cycle blocks silently corrupted units to mm (25.4x hazard)

ROOT CAUSE: MINFileParserEngine.ts:170-171 mapped G70->units=inch / G71->units=mm (the
obsolete pre-G20/G21 Fanuc convention). But on Okuma OSP lathes G70/G71/G72 are LAP turning
CYCLES (finish / longitudinal-rough / facing-rough), and line 408 already (correctly) records
them as canned_cycles. So every roughing-cycle block ALSO ran case 71 -> st.units="mm" ->
header.units corrupted to "mm" for an inch program (the exact UNITS-FIRST 25.4x scale hazard).
Surfaced as an esbuild duplicate-case warning (case 70/71 appeared both as units and in the
canned-cycle case).

LIVE-VALIDATED on the JM corpus: ~1500 MIN files had 0x G20/G21 and 72x G71 -- every G71 a
roughing cycle (`G71 X.. Z.. B60 D.003 U.001 H.. F..`), never a standalone units command. So
real JM inch programs containing a G71 were being read as mm.

FIX: remove the G70/G71->units mapping. Units now come only from G20/G21 (unchanged);
G70/G71/G72 are classified ONLY as canned cycles (the case below + the cannedForOp scan at :408);
undeclared units honestly stay "unknown" (defer to the JM inch default downstream, never fabricate
"mm"). Also dissolves the duplicate-case warning (70/71 no longer appear twice).

TESTS 25/25 (+2 regression oracles that FAIL pre-fix: a G71 roughing cycle and a G70 finishing
cycle with no G20/G21 must leave header.units "unknown", not "mm"/"inch"; G71/G70 still detected as
canned cycles). Type-neutral change; full build passed pre-edit. Mem reference_minparse_units_cycle_collision_2026_06_22.
```

## Files touched (3)
- mcp-server/src/__tests__/MINFileParserEngine.test.ts | 23 +++++++++++++++++++++++
- mcp-server/src/engines/MINFileParserEngine.ts        | 13 +++++++++++--
- 2 files changed, 34 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till detected as

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 25f1ee33facf`
- Milestone envelope: `mcp-server/data/milestones/SAFETY-UNITS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._