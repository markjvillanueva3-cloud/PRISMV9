# KIENZLE-LATHE-WIZARD/U-W3-LIVE-TOOLING-RUNGB — [MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W3-LIVE-TOOLING-RUNGB (slot:whiskey): Rung B live-tooling/C-axis coverage + a real safety find->fix

**Commit:** `3bae0bbdca41` · **By:** markjvillanueva3-cloud · **At:** 2026-06-26T07:57:37-05:00
**Tags:** kienzle-lathe-wizard, u-w3-live-tooling-rungb, auto-distilled

## Subject
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W3-LIVE-TOOLING-RUNGB (slot:whiskey): Rung B live-tooling/C-axis coverage + a real safety find->fix

## Body
```
[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-W3-LIVE-TOOLING-RUNGB (slot:whiskey): Rung B live-tooling/C-axis coverage + a real safety find->fix

WHAT: U-W3 (GAP-3) -- the 7 live-tooling feature types (whistle_notch|od_pocket_mill|
cross_drill|cross_tap|keyway|flat_mill|hex_mill) were TYPED + pipeline-handled but
NEVER exercised by the closed-loop test. Added a separate live-tooling coverage loop
to the Rung B roundtrip harness (7 archetypes x 3 ISO groups = 21 programs, 24 live
ops) reported in a `live_tooling_coverage` block, kept OUT of the band-scored turning
grid (live milling has NO empirical JM .MIN band -- folding it in would corrupt the
headline envelope %). Live numbers: 4 archetypes emit real toolpath (whistle/pocket/
cross_drill/cross_tap-via-drill, M133+C-axis+M05 all SAFE), 3 honestly flagged stub_only
(keyway/flat_mill/hex_mill -> CAM-placeholder, queued for real toolpath -- NOT claimed working).

FIND->FIX (R16): exercising the never-validated live path surfaced a real defect --
the live-op handlers' `feat?.x || default` caught falsy 0/NaN but NOT Infinity, so an
Infinity pocket_depth spun `Math.ceil(Infinity/step)`=Infinity passes (UNBOUNDED G-code
loop) and Infinity/NaN dims leaked `X-Infinity`/`C NaN` into emitted G-code (a CNC
hazard). FIX: finiteOr/finitePos sanitizers on the 3 real handlers + advisory tool-select
calls + a 200-pass cap. Monotonically safe (only replaces unusable input; preserves the
0-or-missing->default behavior).

TEST: LatheRoundtripAccuracyHarness.test.ts +12 cases (18/18 pass) -- coverage (turning
grid unchanged at 60), >=3 real live ops with M133/C-axis/M05, honest stub flagging,
3 failure modes (missing/zero dims fall back), 3 adversarial (NaN c_axis no 'CNaN',
Infinity pocket no hang/no 'Infinity', Infinity hole-dia sanitized). Round-tripped through
calculate("turning_print_to_program") -- the exact prism_turning_program dispatcher path.
tsc: 3 changed files type-clean (the 3 project tsc errors are pre-existing, unrelated).

NOTE (R12): formal 2-arm per-file scrutiny abbreviated to the 18/18 adversarial test-gate
+ self-review due to operator mid-session redirect to the echo slot. Engine edits are
surgical + monotonically-safe (non-finite -> safe default). Stub-only live toolpath
(keyway/flat/hex real C/Y toolpath generation) is the queued U-W3 follow-up.
```

## Files touched (4)
- mcp-server/scripts/lathe-roundtrip-accuracy-harness.ts         | 208 +++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/LatheRoundtripAccuracyHarness.test.ts | 203 +++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/TurningPrintToProgramEngine.ts          |  70 +++++++++++------
- 3 files changed, 457 insertions(+), 24 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3bae0bbdca41`
- Milestone envelope: `mcp-server/data/milestones/KIENZLE-LATHE-WIZARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._