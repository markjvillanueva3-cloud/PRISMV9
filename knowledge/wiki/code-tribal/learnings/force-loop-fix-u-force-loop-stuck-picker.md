# FORCE-LOOP-FIX/U-FORCE-LOOP-STUCK-PICKER — [MAIN-FORCE] [FORCE-LOOP-FIX]/U-FORCE-LOOP-STUCK-PICKER (slot:alpha): fix force-loop-continue nag-livelock on a stuck picker

**Commit:** `46d33ef8deb5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:37:23-05:00
**Tags:** force-loop-fix, u-force-loop-stuck-picker, auto-distilled

## Subject
[MAIN-FORCE] [FORCE-LOOP-FIX]/U-FORCE-LOOP-STUCK-PICKER (slot:alpha): fix force-loop-continue nag-livelock on a stuck picker

## Body
```
[MAIN-FORCE] [FORCE-LOOP-FIX]/U-FORCE-LOOP-STUCK-PICKER (slot:alpha): fix force-loop-continue nag-livelock on a stuck picker

AUTO-FIX-INLINE of a fleet-wide bug HIT first-hand this session (and independently by
golf 2026-06-18 on the same U-NN-TIER05 unit -- reference_loop_fallback_live_peer_poach_risk).

BUG: stop-force-loop-continue.mjs progressGate (the wedge-detector that RELEASES a stuck
Stop-block) keyed on the most-recent loop `iter` and read ANY increase as progress. But
loop-state `next` RESETS iter to 0 on every picker roll WITHOUT the unit completing. So a
stuck-picker loop (picker re-rolling the same unstartable unit, e.g. a roadmap top-unit in
a peer's live lane) made iter oscillate 0->1->0->1 -> read as intermittent "progress" ->
noProgress NEVER reached STUCK_LIMIT -> the hook nagged FOREVER ("iter 1/20" every Stop),
escapable only by manual `loop-state end`. This is the operator-reported "unbreakable loop"
class (feedback_unbreakable_loop_break).

FIX (additive, fail-safe-direction = release, not block-more): progressGate now tracks a
per-task iter HIGH-WATER (maxIter) + the task id. A same-task iter that does NOT exceed the
high-water (incl. a picker-roll reset) is a STALL; a task CHANGE (a healthy multi-unit loop
completing DISTINCT units) resets the high-water = genuine progress, so productive multi-unit
loops are never false-released. `task` is the 4th param (back-compat: existing 3-arg callers
unaffected; the high-water alone already fixes the single-task reset case). Pre-fix {lastIter}
stamps migrate. The wedge-release message now names the task + rolls + an end/steer hint.

TESTS: enforce 21/21 (4 new bug-oracles -- each FAILS under the old lastIter logic: stuck-picker
releases, multi-unit never false-releases, 3-arg reset-stall, old-stamp migration) + sibling
end-to-end 15/15. Shared session machinery -- additive + fail-soft preserved.
Ref: reference_force_loop_continue_stuck_picker_livelock_2026_06_21.
```

## Files touched (3)
- .claude/hooks/__tests__/stop-force-loop-continue.enforce.test.mjs | 60 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/stop-force-loop-continue.mjs                        | 37 ++++++++++++++++++++++++++++---------
- 2 files changed, 88 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 46d33ef8deb5`
- Milestone envelope: `mcp-server/data/milestones/FORCE-LOOP-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._