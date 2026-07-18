# LATHE-LIVE-TOOLING/U-LATHELT-CYCLETIME-FIXTURE — [MAIN-FORCE] [LATHE-LIVE-TOOLING]/U-LATHELT-CYCLETIME-FIXTURE (slot:india): fix breaching test fixture + land orphaned LatheLiveToolingPlanner test

**Commit:** `1d2147bf852b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T19:02:40-05:00
**Tags:** lathe-live-tooling, u-lathelt-cycletime-fixture, auto-distilled

## Subject
[MAIN-FORCE] [LATHE-LIVE-TOOLING]/U-LATHELT-CYCLETIME-FIXTURE (slot:india): fix breaching test fixture + land orphaned LatheLiveToolingPlanner test

## Body
```
[MAIN-FORCE] [LATHE-LIVE-TOOLING]/U-LATHELT-CYCLETIME-FIXTURE (slot:india): fix breaching test fixture + land orphaned LatheLiveToolingPlanner test

The untracked LatheLiveToolingPlannerEngine test (19 cases) failed 1/19: "cycle time
strictly increases with depth". NOT an engine bug -- the "deep" pocket fixture used
depth:25 against stock {diameter:50} (radius 25). assertRadialDepth CORRECTLY throws:
a c-axis pocket depth >= stock radius drives the X target (R-depth)*2 to <=0 (the tool
crossing the spindle centerline) -- a real safety breach the engine must reject.

The fixture was wrong, not the guard. Lowered the deep pocket to depth:20 (< radius 25,
still 4x the shallow 5 -> more axial passes -> strictly greater cycle time), preserving
the invariant's intent without tripping the (correct) centerline-breach guard. Title
de-claims the exact "5x". Engine UNCHANGED -- the safety guard stays.

19/19 green (was 18/19); engine + safety behavior untouched. Lands a previously-untracked
test in a correct, green state so it guards the cycle-time invariant going forward.
Next-batch item from [[reference_orphaned_dispatcher_wire_backlog_2026_06_22]].
```

## Files touched (2)
- mcp-server/src/__tests__/LatheLiveToolingPlannerEngine.test.ts | 364 +++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 364 insertions(+)

## Lessons surfaced in commit body
- wrong, not the guard. Lowered the deep pocket to depth:20 (< radius 25,
- till 4x the shallow 5 -> more axial passes -> strictly greater cycle time), preserving

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1d2147bf852b`
- Milestone envelope: `mcp-server/data/milestones/LATHE-LIVE-TOOLING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._