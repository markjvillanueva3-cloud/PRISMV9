# AUTO-COMPACTION-MODEL-HANDOFF-MS0/U-CIC-KNOB — [MAIN] [AUTO-COMPACTION-MODEL-HANDOFF-MS0]/U-CIC-KNOB (slot:alpha): compact-interval-warning honors compact-disable knobs + R6-aligns message -- kill the live "pushback to compact" Stop nudge

**Commit:** `6a394d47cefa` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T18:18:30-05:00
**Tags:** auto-compaction-model-handoff-ms0, u-cic-knob, auto-distilled

## Subject
[MAIN] [AUTO-COMPACTION-MODEL-HANDOFF-MS0]/U-CIC-KNOB (slot:alpha): compact-interval-warning honors compact-disable knobs + R6-aligns message -- kill the live "pushback to compact" Stop nudge

## Body
```
[MAIN] [AUTO-COMPACTION-MODEL-HANDOFF-MS0]/U-CIC-KNOB (slot:alpha): compact-interval-warning honors compact-disable knobs + R6-aligns message -- kill the live "pushback to compact" Stop nudge

The operator set PRISM_TASK_BOUNDARY_COMPACT_DISABLE=1 in settings.json env to suppress task-boundary compaction nudges, but compact-interval-warning.mjs never checked it -- so it kept emitting "Run /compact before the next non-trivial task" at Stop after >=3 unit commits. With the precompact-auto-trigger disabled fleet-wide (the 99M bug, now fixed in 1e25893b31), THIS hook was the live source of the "chats push back saying to compact" anti-pattern the operator wants gone.

Fix: (a) honor PRISM_TASK_BOUNDARY_COMPACT_DISABLE + new PRISM_COMPACT_INTERVAL_WARN_DISABLE (short-circuit to silent ok() before any git/handoff read); (b) reword the message from the imperative "Run /compact before the next non-trivial task" to an R6-aligned "KEEP WORKING -- native autocompact fires at 95% and auto-writes your handoff; only /compact on a SPIRAL, never a clean unit boundary". 3/3 node:test (both knobs + source regression guard). Advisory hook (never blocks).
```

## Files touched (3)
- .claude/hooks/__tests__/compact-interval-warning.test.mjs | 41 +++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/compact-interval-warning.mjs                | 13 +++++++++++--
- 2 files changed, 52 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6a394d47cefa`
- Milestone envelope: `mcp-server/data/milestones/AUTO-COMPACTION-MODEL-HANDOFF-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._