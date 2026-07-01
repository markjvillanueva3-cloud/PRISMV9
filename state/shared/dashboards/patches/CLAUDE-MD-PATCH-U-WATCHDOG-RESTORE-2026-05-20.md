# CLAUDE.md patch sibling — Watchdog stack restore regression line

> Patch-sibling for `H:/prism/CLAUDE.md` per the §PATCH-SIBLING convention.
> CLAUDE.md is golf-only per OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF doctrine
> (hard-blocked by `claude-md-write-guard` hook on non-golf slots, verified
> this session). Golf drains these patch siblings twice daily.
>
> Author: claude-30dbe35a (slot=alpha), 2026-05-20.
> Triggered by: chat-bus `PRISM scheduled-task safety net CRITICAL` alerts
> recurring every ~30 min since 01:10 (slot=alpha sweep saw the 7-hour
> stretch of WARN → CRITICAL escalation).

## Proposed CLAUDE.md `## Recent regressions` append (newest-first)

```markdown
- 2026-05-20 | **12 of 13 PRISM scheduled tasks were Disabled on this host** — only Fleet Reaper was Ready. Fleet Memory Monitor + Cleanup Orchestrator + Memory Pressure Auto-Relief + Zombie Reaper + Hook Janitor + Node Orphan Cleaner + Synergy Regression Watch all silently stopped firing. The chat-bus auto-emitted memory-pressure WARNs every ~10 min for 6+ hours (sustained 78 ticks), but no chat had re-enabled the watchdogs — the cron *responsible for fixing memory pressure* was itself disabled (turtle-stack failure). Pattern: a host-wide kill switch or operator session disabled them en-masse, then no recovery hook re-armed them. | fix: ran `powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/ensure-all-watchdogs.ps1` — 7 of 7 disabled tasks ENABLED (Enable-ScheduledTask works for current-user without elevation). 2 absent installs (MCP Server + MCP Server Watchdog) need elevation. State: 1/13 → 8/13 Ready/Running. The 5 still-disabled (Blueprint Join Refresh, NN-Graph Retrain, Orphan Process Reaper (PS), RGS Tool Planner, Source Monitor Sweep) are NOT in the canonical-10 watchdog set — peripheral or pre-deprecated, intentionally off. | follow-up: a fleet-task-health Stop-hook auto-recovery arm should `Enable-ScheduledTask` the canonical-10 if it sees them Disabled (currently the watchdog only WARNs in chat-bus — toothless on its own). | observed-by: claude-30dbe35a slot alpha, "work on system synergy tasks that other chats were working on" /goal. | verify: `powershell -Command "Get-ScheduledTask -TaskName 'PRISM *' | Where-Object State -ne Disabled | Measure-Object | Select Count"` → ≥ 7 (was 1).
```

## Why patch-sibling instead of direct CLAUDE.md edit

- CLAUDE.md is hard-blocked for write by all non-golf slots per the
  `claude-md-write-guard` hook (OBSIDIAN-BRAIN-FIX-MS0/U-OBF-GOLF doctrine).
  Verified this session: Edit attempt returned the canonical block message
  naming the bypass flag.
- This is the canonical surface; precedent siblings present in
  `state/shared/dashboards/patches/` at session time:
  `CLAUDE-MD-PATCH-cad-pipeline-audit.md`,
  `CLAUDE-MD-PATCH-U-BUILD-BRIEF-KNOWLEDGE-PACK.md`,
  `CLAUDE-MD-PATCH-U-CK15.md` (all peer-authored, pending golf drain).

## Merge instructions (golf chat)

1. Read `H:/prism/CLAUDE.md` `## Recent regressions` section.
2. Append the regression line above at the TOP of the section (newest-first ordering).
3. Delete this patch sibling.
4. Commit with `[GOLF] [SYNERGY-WATCHDOG-RESTORE]/U-WATCHDOG-RESTORE-REGRESSION: merge patch sibling`.

## Companion: synergy delivery

- 7 scheduled tasks re-enabled this session (no git artifact — pure OS state).
- The watchdog stack is the load-bearing memory-pressure-relief safety net
  for the 17 chat trees observed in chat-bus. Restoring it should reduce
  the 78-tick-sustained memory-pressure WARN cycle to baseline.
- This patch sibling is the only durable record of WHY the change was
  made — CLAUDE.md is the canonical regression log; until golf merges this,
  the regression line lives here.

## See also

- `state/shared/specs/LEFTOVER-TASKS-2026-05-18-19.md` (this session's fleet inventory)
- `state/shared/CLOSE-OUT-DEFERRED.md` (3 close-out entries added this session: U-VIZ-F11-CROSS-LOCK, U-CLEAR-AUTO-RESUME, U-ACTIVATE-BEFORE-BUILD-PRECHECK — all 3 already-shipped despite "pending" spec status)
- `H:/prism/.claude/helpers/ensure-all-watchdogs.ps1` (canonical 10-watchdog orchestrator — invoked this session)
- `feedback_golf_owns_reaper.md` (doctrine: golf owns fleet hygiene)
