# SYNERGY-WATCHDOG-RESTORE/U-WATCHDOG-RESTORE — [MAIN] [SYNERGY-WATCHDOG-RESTORE]/U-WATCHDOG-RESTORE: re-enable 7 of 7 disabled crash-critical PRISM scheduled tasks (slot:alpha)

**Commit:** `2bc54961bcdc` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T23:16:54-05:00
**Tags:** synergy-watchdog-restore, u-watchdog-restore, auto-distilled

## Subject
[MAIN] [SYNERGY-WATCHDOG-RESTORE]/U-WATCHDOG-RESTORE: re-enable 7 of 7 disabled crash-critical PRISM scheduled tasks (slot:alpha)

## Body
```
[MAIN] [SYNERGY-WATCHDOG-RESTORE]/U-WATCHDOG-RESTORE: re-enable 7 of 7 disabled crash-critical PRISM scheduled tasks (slot:alpha)

User pivoted alpha to "work on system synergy tasks that other chats were
working on". Chat-bus showed sustained CRITICAL since 01:10 today: load-
bearing tasks down (Fleet Memory Monitor) + 4 crash-critical tasks
degraded — recurring every ~30 min for 7+ hours, no peer had re-enabled.

Investigation: 12 of 13 PRISM scheduled tasks were Disabled on this host
(only Fleet Reaper was Ready). The chat-bus was emitting memory-pressure
WARNs every ~10 min for 6+ hours (78 ticks sustained), but the watchdog
responsible for FIXING memory pressure (PRISM Memory Pressure Auto-Relief)
was itself disabled — turtle-stack failure.

Fix: ran `powershell -File .claude/helpers/ensure-all-watchdogs.ps1` —
7 of 7 disabled tasks ENABLED via Enable-ScheduledTask (no elevation
needed for an already-registered task). State: 1/13 → 8/13 Ready/Running.

Tasks re-enabled (all in the canonical-10 watchdog set):
- PRISM Fleet Memory Monitor
- PRISM Cleanup Orchestrator
- PRISM Memory Pressure Auto-Relief
- PRISM Zombie Reaper v2
- PRISM Hook Janitor
- PRISM Node Orphan Cleaner
- PRISM Synergy Regression Watch

Still disabled (NOT in canonical-10; peripheral or pre-deprecated):
- PRISM Blueprint Join Refresh
- PRISM NN-Graph Retrain
- PRISM Orphan Process Reaper (PS)
- PRISM RGS Tool Planner
- PRISM Source Monitor Sweep

Still absent (need elevation to install):
- PRISM MCP Server
- PRISM MCP Server Watchdog

DELIVERABLES IN THIS COMMIT:
- state/shared/dashboards/patches/CLAUDE-MD-PATCH-U-WATCHDOG-RESTORE-2026-05-20.md
  (patch sibling — CLAUDE.md is golf-only per OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF
  doctrine; verified this session via blocked Edit attempt. Golf drains these
  twice daily.)

NO CLAUDE.md edit was attempted in this commit (correctly blocked by the
claude-md-write-guard hook). The patch sibling carries the regression line
proposal until golf merges it.

NO OTHER GIT ARTIFACTS — the watchdog re-enable is OS state, captured only
in `Get-ScheduledTask` output.

Synergy outcome for the 17 chat trees on this host: working memory-pressure-
relief safety net restored. Peer chats should see fewer chat-bus WARNs
going forward (the auto-relief cron is back online).

Companion to this session's earlier commit b34941b47e (3 stale alpha queue
units verified shipped — close-out batch) and the U-BRIDGE-WIRE-MILLING
milestone (8 engines, 40 actions, 211 tests).

[NOTE: a peer also has a pending patch sibling
state/shared/dashboards/patches/CLAUDE-MD-PATCH-cad-pipeline-audit.md
authored 2026-05-20 by claude-3db3fb3d slot echo — its merge is golf's
responsibility per the patch-sibling convention; this commit does not
touch it (preserves peer attribution).]
```

## Files touched (2)
- ...LAUDE-MD-PATCH-U-WATCHDOG-RESTORE-2026-05-20.md | 53 ++++++++++++++++++++++
- 1 file changed, 53 insertions(+)

## Lessons surfaced in commit body
- till disabled (NOT in canonical-10; peripheral or pre-deprecated):
- till absent (need elevation to install):
- til golf merges it.
- NOTE: a peer also has a pending patch sibling

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2bc54961bcdc`
- Milestone envelope: `mcp-server/data/milestones/SYNERGY-WATCHDOG-RESTORE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._