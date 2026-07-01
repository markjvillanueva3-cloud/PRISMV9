# FLEET-REAPER-FIX/U-FR-MONITOR-SELFREAP — [GOLF] [FLEET-REAPER-FIX]/U-FR-MONITOR-SELFREAP: protect reaper procs from sibling reap

**Commit:** `de70cddf8a55` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T15:25:40-05:00
**Tags:** fleet-reaper-fix, u-fr-monitor-selfreap, auto-distilled

## Subject
[GOLF] [FLEET-REAPER-FIX]/U-FR-MONITOR-SELFREAP: protect reaper procs from sibling reap

## Body
```
[GOLF] [FLEET-REAPER-FIX]/U-FR-MONITOR-SELFREAP: protect reaper procs from sibling reap

The in-session `--monitor-loop` fleet-reaper Monitor kept dying every ~5-10
min. Root cause: PROTECTED_PATTERNS protected the MCP server / tsserver /
dashboard / test workers, but NOT the reaper's own processes. A reaper sweep
only excludes its OWN pid — so the scheduled-task sweep classified the
in-session Monitor as owned-by-crashed (once the owning slot heartbeat looked
stale) and killed it.

Fix: add fleet-reaper-sweep.mjs / fleet-memory-monitor.mjs /
fleet-task-health-watch.mjs to PROTECTED_PATTERNS. A sibling reaper/monitor
process is infrastructure, never an orphan. Verified: isProtectedCmd() returns
true for the monitor-loop cmdline, false for unrelated node procs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .claude/helpers/process-slot-map.mjs | 10 ++++++++++
- 1 file changed, 10 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show de70cddf8a55`
- Milestone envelope: `mcp-server/data/milestones/FLEET-REAPER-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._