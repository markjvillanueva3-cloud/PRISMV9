# DELTA-CAD-COMPLETION/U-CAD-GEN-OVERNIGHT-TASK — [MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-GEN-OVERNIGHT-TASK (slot:delta): reaper-immune scheduled-task drainer for the CAD-gen loop

**Commit:** `721f695758e6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T23:02:51-05:00
**Tags:** delta-cad-completion, u-cad-gen-overnight-task, auto-distilled

## Subject
[MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-GEN-OVERNIGHT-TASK (slot:delta): reaper-immune scheduled-task drainer for the CAD-gen loop

## Body
```
[MAIN-FORCE] [DELTA-CAD-COMPLETION]/U-CAD-GEN-OVERNIGHT-TASK (slot:delta): reaper-immune scheduled-task drainer for the CAD-gen loop

A bare 'run_in_background' node drain (bud3zl5eq) FAILED exit 255 = fleet-reaper kill (transient-shell
ancestry -> classified orphan). Fix: run-cad-gen-loop-overnight.ps1 (clone of the proven
run-ocr-training-loop-overnight.ps1 reaper-immunity pattern: Start-Process -Wait keeps PS as node's
live parent; Task Scheduler ancestry -> never reaped). Registered scheduled task 'PRISM CAD Gen Loop'
(every 30m x 11h, IgnoreNew, 2h ExecutionTimeLimit, keep_alive 15m). Replaces the redundant gen-drain
Claude cron f5c06b63 (deleted) -> $0, reaper-immune, resumable. Lesson: overnight $0 loops must run
via Task Scheduler, NOT a bare detached/background process (the reaper kills the latter).
```

## Files touched (2)
- scripts/run-cad-gen-loop-overnight.ps1 | 23 +++++++++++++++++++++++
- 1 file changed, 23 insertions(+)

## Lessons surfaced in commit body
- Lesson: overnight $0 loops must run

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 721f695758e6`
- Milestone envelope: `mcp-server/data/milestones/DELTA-CAD-COMPLETION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._