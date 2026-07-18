# FORCE-LOOP-FIX/U-FORCE-LOOP-STUCK-PICKER-WIKI — [MAIN-FORCE] [FORCE-LOOP-FIX]/U-FORCE-LOOP-STUCK-PICKER-WIKI (slot:alpha): wiki lesson — a wedge/progress detector must key on a monotonic signal

**Commit:** `662df285b40c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:46:24-05:00
**Tags:** force-loop-fix, u-force-loop-stuck-picker-wiki, auto-distilled

## Subject
[MAIN-FORCE] [FORCE-LOOP-FIX]/U-FORCE-LOOP-STUCK-PICKER-WIKI (slot:alpha): wiki lesson — a wedge/progress detector must key on a monotonic signal

## Body
```
[MAIN-FORCE] [FORCE-LOOP-FIX]/U-FORCE-LOOP-STUCK-PICKER-WIKI (slot:alpha): wiki lesson — a wedge/progress detector must key on a monotonic signal

R16 fit-the-whole close on the force-loop-continue stuck-picker fix (46d33ef8de). Promotes
the reusable engineering lesson: a no-progress/wedge detector must measure against a MONOTONIC
signal; a counter that resets during normal operation (per-roll iter) gives phantom progress
and yields an unbreakable livelock. Fleet-applicable to any stall/stuck detector. Promotion of
[[reference_force_loop_continue_stuck_picker_livelock_2026_06_21]] (knowledge-vault path: memory->wiki).
```

## Files touched (2)
- knowledge/wiki/lessons/wedge-detector-must-key-on-monotonic-signal.md | 55 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 55 insertions(+)

## Lessons surfaced in commit body
- lesson — a wedge/progress detector must key on a monotonic signal
- lesson: a no-progress/wedge detector must measure against a MONOTONIC

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 662df285b40c`
- Milestone envelope: `mcp-server/data/milestones/FORCE-LOOP-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._