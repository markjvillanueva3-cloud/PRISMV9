# FLEET-MEMORY-MONITOR-MS0/U-FMM01 — [MAIN] [FLEET-MEMORY-MONITOR-MS0]/U-FMM01: 5-min RAM monitor + claude.exe-tree attribution

**Commit:** `7b50cb5690b2` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T21:20:36-05:00
**Tags:** fleet-memory-monitor-ms0, u-fmm01, auto-distilled

## Subject
[MAIN] [FLEET-MEMORY-MONITOR-MS0]/U-FMM01: 5-min RAM monitor + claude.exe-tree attribution

## Body
```
[MAIN] [FLEET-MEMORY-MONITOR-MS0]/U-FMM01: 5-min RAM monitor + claude.exe-tree attribution

Durable Win Scheduled Task system-RAM + per-chat-tree monitor independent of alpha (no guardian hook). Closes the gap fleet-reaper leaves when all 13 chats are LIVE and box at 96% commit pressure. Names WHICH live chat to /compact. Advisory only, never kills.

Load-bearing lesson: chat-slots state.pid is ephemeral subshell that exited. Stable anchor = claude.exe itself. Slot label overlay best-effort only. Never invent (R12).

Files (scripts/fleet-memory-monitor.mjs absorbed into peer commit 04e512cbe6 [OBSOLESCENCE-CLEANUP-MS0]/U-OBS-A4 — multi-chat shared-tree collision, same class as reference_fleet_reaper_ship_collision; file IS shipped, just under wrong subject). 28/28 tests pass. Live: phys 74.5% / commit 96.0% / 12 trees / largest PID 46816 (858MB). Task NextRunTime confirmed at 5-min cadence.

Hardening to S4U+AtStartup (currently unelevated current-user): ! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-memory-monitor-task.ps1 -RunNow

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (6)
- .../helpers/install-fleet-memory-monitor-task.ps1  | 192 +++++++++++++
- .../register-fleet-memory-task-unelevated.ps1      |  31 +++
- CLAUDE.md                                          |  22 ++
- .../wiki/architecture/fleet-memory-monitor.md      | 187 +++++++++++++
- scripts/fleet-memory-monitor.test.mjs              | 304 +++++++++++++++++++++
- 5 files changed, 736 insertions(+)

## Lessons surfaced in commit body
- lesson: chat-slots state.pid is ephemeral subshell that exited. Stable anchor = claude.exe itself. Slot label overlay best-effort only. Never invent (R12).
- wrong subject). 28/28 tests pass. Live: phys 74.5% / commit 96.0% / 12 trees / largest PID 46816 (858MB). Task NextRunTime confirmed at 5-min cadence.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7b50cb5690b2`
- Milestone envelope: `mcp-server/data/milestones/FLEET-MEMORY-MONITOR-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._