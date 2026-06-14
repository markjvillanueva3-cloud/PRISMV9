---
name: bash-congestion-fleet-scope-2026-05-23
description: "16-chat fleet at ~500 concurrent bash/node/git procs is at baseline, NOT leaking. Bash congestion is a fleet-size problem requiring per-chat budget caps + MCP-route migration, not more reapers."
aliases: reference_bash_congestion_fleet_scope_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.027Z
---


# Bash subsystem congestion — diagnosis + 7 systemic fixes (2026-05-23, slot golf)

## Diagnosis

Operator report: "bash subsystem is congested in the 16-chat fleet."

Measured this session (PowerShell `Get-Process | where ProcessName in bash,node,git`):
- **446 → 636 procs** across the snapshot window (during/after firing 7 reapers)
- Last 2 reaper sweeps: `reaped=0, freedMb=0`

**This is NOT a leak.** 16 active chats × ~30 procs each (claude.exe + node MCP + bash hook wrappers + git fsmonitor + scheduled task workers) ≈ 480 baseline. The reaper agrees — no candidates flagged as reapable.

**The bottleneck is bash-tool concurrency caps, not memory.** Claude Code's bash subsystem serializes some invocations and pre-warms others; when 16 chats all spawn bash + node chains concurrently, the queue saturates. Symptom: bash commands hang or time out; my own bash calls this session repeatedly got auto-rerouted to background and several timed out.

## 7 systemic fixes (candidate follow-up units)

| # | Unit | What | Why | Effort |
|---|---|---|---|---|
| 1 | `U-MCP-ROUTE-MIGRATION` | Audit `prism_*` dispatcher actions that cover what bash calls are doing; build a "bash → dispatcher" cheat-sheet for each common pattern (`node scripts/X.mjs` → `prism_dev:X` etc.). Wire the existing `route-suggest` hook to surface the equivalent action when a bash command matches a known dispatcher. | Every `node scripts/X.mjs` invocation costs a bash + node process; the same logic via MCP action costs **zero shell**. The session's route-nudge banner has fired 400+ times with 0% take rate — the data is there, the routing just needs to be activated. Single biggest token+process saver. | Medium |
| 2 | `U-BASH-PER-CHAT-BUDGET` | Hook-side enforcement: cap concurrent bash spawns per chat (`PRISM_MAX_CONCURRENT_BASH=4` default). Queue beyond the cap. Skip-with-warn when the queue exceeds 8. | Currently any chat can fan out 10+ bash calls; in a 16-chat fleet that's 160 concurrent. The bash subsystem doesn't degrade gracefully past a hard ceiling — better to soft-queue at 4 than to hang at 12. | Medium |
| 3 | `U-LONG-BATCH-AS-SCHEDULED-TASK` | Convert recurring batches (embed-all-wiki, system-graph regen, fleet-doctrine sweep) to Windows scheduled tasks instead of Claude background tasks. | Claude background tasks time out at ~5-10 min; long batches leak child procs when killed. Scheduled tasks run detached with proper lifecycle. Already done for the reaper; expand the pattern. | Small per-batch |
| 4 | `U-HOOK-TIMEOUT-HARDEN` | Audit `.claude/hooks/*` for missing/loose timeouts; enforce `continueOnError:false` + tight `timeout` per hook. Forced kill at timeout+50%. | Hooks that wait 5-15s sometimes hang AND don't release their bash slot; the slot leak compounds. Several hooks have `timeout:30000` (30 s) which is too long for a UserPromptSubmit injector. | Small |
| 5 | `U-PROCESS-TREE-REAP-ON-CHAT-EXIT` | When a chat process (claude.exe) exits, reap its entire descendant tree (currently the reaper picks up grandchildren but only after the watchdog window). Use `wmic process where ParentProcessId=X delete` recursively. | Currently when a chat /clears or crashes, its hook procs + bash wrappers + spawned node helpers can linger 5-15 min until the reaper's `stuck-bash` heuristic fires. Recursive reap on exit = zero linger. | Small |
| 6 | `U-MCP-SERVER-CHILD-QUOTA` | The MCP server itself spawns helper Node procs (for dispatcher actions that fork). Cap per-server child count at N (default 50); reject-with-fallback when over. | An out-of-control dispatcher (loop bug, infinite retry) can fork 100+ procs and starve the rest of the system. Quota = explicit ceiling. | Small |
| 7 | `U-BASH-OUTPUT-IDLE-KILL` | Wrap bash invocations through a `kill-on-idle` proxy: if the child has produced no stdout for >N seconds, kill it. | Hung bash chains (typically waiting on a downed MCP server or an Ollama timeout) currently sit idle until the Claude-side timeout fires. Idle-kill is faster + frees the slot for the queue. | Small |

## ROI ranking

1. **#1 MCP route migration** — biggest token + process saver, addresses the root cause (bash overuse) rather than the symptom (process count)
2. **#3 Long batches as scheduled tasks** — eliminates the longest-running bash-side processes
3. **#2 Per-chat bash budget** — caps the worst-case spike
4. **#5 Process-tree reap on chat exit** — eliminates the linger window
5. **#4, #6, #7** — incremental hardening

## Decision rule

When the next "bash subsystem congested" report comes in, **measure with `Get-Process` first**. If process count = ~30 × active_chats, the system is at baseline — fire reapers as routine hygiene but don't expect them to find leaks. If process count is significantly higher, then look for actual leaks (zombies, stuck-bashes).

## Linked

- [[reference_fleet_reaper]] — current reaper architecture
- [[feedback_no_parallel_agents_high_pressure]] — operator already knows to throttle under pressure
- [[reference_load_bearing_scheduled_tasks]] — pattern for #3
- [[reference_high_roi_ai_psn_scope_2026_05_23]] — these 7 belong in a future E* track of that scope
