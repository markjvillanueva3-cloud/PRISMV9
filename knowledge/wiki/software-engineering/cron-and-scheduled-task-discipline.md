---
name: cron-and-scheduled-task-discipline
category: software-engineering
domain: backend-dev
tags: [cron, scheduled-tasks, scheduling, durability, fleet-hygiene, prism-development, ai-development]
last_updated: 2026-05-18
---

# Cron & Scheduled-Task Discipline — pick the right primitive

PRISM has three different scheduling primitives in active use. They are NOT interchangeable. Picking the wrong one is how a "durable" task dies on session close, or how a "session-only" task accidentally runs across reboots. This wiki names them, the picking rules, and the operational knobs (principal, offsets, kill switches) that determine whether a scheduled job actually fires when needed.

## The three primitives — one table

| Primitive | Lives in | Survives session close? | Survives reboot? | Granularity | Best for |
|---|---|---|---|---|---|
| **CronCreate** (Claude in-session) | Claude harness process | ❌ No (session-only by default) | ❌ No | 1 minute | `/loop` recurrence within a chat session |
| **Windows Scheduled Task** | OS Task Scheduler | ✅ Yes | ✅ Yes | 1 minute | Fleet hygiene (reaper, memory monitor, task health) — must run regardless of any chat being alive |
| **ScheduleWakeup** | Claude session | ❌ No (session-only) | ❌ No | Seconds | Self-paced /loop with event-driven wake (Monitor + fallback heartbeat) |

The Claude-Code skill description for `CronCreate` is explicit: *"Jobs live only in this Claude session — nothing is written to disk, and the job is gone when Claude exits."* Don't use it for anything that must outlive the chat.

## Picking — by the question you're answering

- **"Run this every 5 min until I close this chat":** CronCreate. Example: the `/loop [5m] continue high value wiki` cron `ae7b42d1`.
- **"Run this every 5 min forever, regardless of any chat":** Windows Scheduled Task. Example: `PRISM Fleet Reaper`, `PRISM Fleet Memory Monitor`, fleet-task-health, NN-Graph Retrain.
- **"Run this once at 3pm":** CronCreate with `recurring:false` (in-session) OR `ScheduleCreate`'s `routine` (Anthropic remote scheduler — durable across sessions). For PRISM dev work the in-session one-shot is usually right.
- **"Run this when X happens, with a 20-min safety fallback":** ScheduleWakeup (dynamic /loop mode) + an armed Monitor.

## Anti-pattern: CronCreate for fleet hygiene

The dead-task class. A fleet-hygiene tool (reaper, memory monitor, regen, drift watch) MUST run regardless of any specific chat being alive — that's the entire point of fleet hygiene. CronCreate dies on chat close. Wire fleet hygiene through `install-<task>-task.ps1` PowerShell installers that register a Windows Scheduled Task (e.g. `H:/prism/.claude/helpers/install-fleet-reaper-task.ps1`). The PRISM convention is one installer per task, mirroring the `install-fleet-reaper-task.ps1` template.

## Windows Scheduled Task — the four knobs that matter

`install-<task>-task.ps1` installers register tasks via `Register-ScheduledTask`. Four flags determine whether the task actually fires when needed:

### 1. Principal — SYSTEM vs S4U vs Interactive

| Principal | Can kill | Needs UAC | Window | Use |
|---|---|---|---|---|
| **`NT AUTHORITY\SYSTEM`** (default for fleet-reaper since 2026-05-18) | Anything (any owner, any integrity) | No | None (session 0) | Anything that may need to terminate elevated/cross-context processes |
| **S4U** (current user, no stored password) | Same-or-lower-integrity processes only | No | None | Conservative — when SYSTEM is overkill |
| **Interactive** | Same as logged-in user | Yes for elevation | Visible flashing | DON'T — task fails on missed user logon |

Reaper history: the S4U default until 2026-05-18 hit "Access is denied" on elevated peer processes, leaving orphans uncollected. The `-AsSystem` flag is now the default. The lesson generalizes: any task that needs to act on the FLEET (not just one user's processes) wants SYSTEM.

### 2. AtStartup trigger — survives reboot before login

A task with ONLY a time-trigger does not fire pre-login. Add a second `New-ScheduledTaskTrigger -AtStartup` so the task resumes immediately after reboot regardless of user session state. Pattern (from fleet-reaper installer):

```powershell
$trigger1 = New-ScheduledTaskTrigger -Once -At $StartTime -RepetitionInterval (New-TimeSpan -Minutes 5)
$trigger2 = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -Trigger @($trigger1, $trigger2) ...
```

### 3. RestartOnFailure — self-heal from transient errors

`-RestartCount 3 -RestartInterval 1m` recovers from a one-off failure without operator intervention. A task that silently dies on first failure is worse than no task.

### 4. Phase offset — don't pile every hygiene task at :00

The fleet has 5+ scheduled tasks. If all fire at `*/5 * * * *` they all hit the host at :00 / :05 / :10 simultaneously, multiplying memory pressure. Stagger via `-StartOffsetSeconds`:

| Task | Offset | Wall-clock fire |
|---|---|---|
| Cleanup Orchestrator | +60s | :01, :06, :11 |
| Memory Pressure Auto-Relief | +120s | :02, :07, :12 |
| PRISM Fleet Reaper | +210s | :03:30, :08:30 |
| PRISM Fleet Memory Monitor | +330s | :05:30, :10:30 |

The pattern: pick offsets that distribute the load across the cadence window. Stack collisions are observable in fleet-memory-monitor telemetry as periodic commit-pressure spikes.

## ScheduleWakeup — self-paced /loop mechanics

When `/loop` is invoked without an interval, the model self-paces via ScheduleWakeup. The mechanics that matter:

- **Delay choice is a cache decision, not a clock decision.** The Anthropic prompt cache has a 5-min TTL. Sleeping past 300s pays a cache miss; the natural breakpoints are <270s (cache warm — for active polling) and >1200s (one cache miss buys a long wait — for genuinely idle ticks).
- **Don't pick 300s.** Worst of both — cache miss without amortizing it.
- **For idle ticks with no specific signal:** default 1200–1800s. Loop checks back, doesn't burn cache 12× per hour for nothing.
- **Sentinel `<<autonomous-loop-dynamic>>`** is the prompt for an autonomous /loop (no user prompt). The runtime resolves it to autonomous-loop instructions at fire time.

See the ScheduleWakeup tool description's "Picking delaySeconds" section for the full guidance.

## Kill switches — every scheduled task needs one

PRISM tasks ship with an env-var kill switch (e.g. `PRISM_FLEET_REAPER_DISABLE=1`). Convention: the inner script checks the env var first and refuses to act if set. The Scheduled Task still fires; the script no-ops. This is reversible without uninstalling the task — important per [[feedback_never_delete_only_disable]].

Per-task kill switches in active use:
- `PRISM_FLEET_REAPER_DISABLE=1` — fleet-reaper refuses all kills
- `PRISM_FLEET_MEMMON_DISABLE=1` — memory monitor no-ops
- `PRISM_FLEET_TASKHEALTH_DISABLE=1` — task-health watchdog no-ops
- `PRISM_GOLF_GUARDIAN_DISABLE=1` — golf-owned reaper guardian
- `PRISM_NN_RETRAIN_DISABLE=1` — autonomous NN retrain lifecycle

Hard-uninstalling the task should be the LAST resort, not the first. A disabled task is a recoverable mistake; a missing task is "where did the safety net go?"

## Reversal — `-Uninstall` or `Disable-ScheduledTask`

Every PRISM installer ships a `-Uninstall` flag. Pattern: `! powershell -NoProfile -ExecutionPolicy Bypass -File <installer> -Uninstall`. For temporary disable (preserves registration): `Disable-ScheduledTask -TaskName "PRISM ..."`. For re-enable: `Enable-ScheduledTask`.

This is the [[feedback_never_delete_only_disable]] doctrine applied at the OS-task layer.

## Lockfile + PID coordination — don't multi-fire

Multiple primitives can race. The patterns that prevent corruption:

- **PID lockfile** in the script itself. Pattern: write `<pid>` to `.<task>.lock` at start, `O_EXCL`/EEXIST → exit gracefully; clear on exit (best-effort + cleanup on signal). NN-Graph retrain lifecycle uses this.
- **mtime-throttle stamp** for "fire at most once per N minutes" (e.g. Stop-hook reapers). Pattern: read a stamp file, if `(now - mtime) < threshold`, no-op. Cheaper than lockfile, sufficient for advisory work.
- **Per-host lock suffix** (`.lock-<hostname>`) for tasks that run on multiple machines without coordination — prevents one PC's lock from blocking the other.

Tasks WITHOUT one of these multi-fire if their cadence is shorter than their runtime. Observed: a long-running regen scheduled `*/5 * * * *` that takes 8min races itself, corrupting output.

## How to check a scheduled task is actually firing

```powershell
Get-ScheduledTask -TaskName "PRISM Fleet Reaper" | Get-ScheduledTaskInfo |
  Format-List LastRunTime, NextRunTime, LastTaskResult, NumberOfMissedRuns
```

- `NextRunTime` more than one cadence-interval in the future → trigger broken
- `LastRunTime` more than one cadence-interval old → not firing (disabled, paused, principal failure)
- `LastTaskResult` non-zero — but **a small exit code is a FINDING, not a launch failure**. The watchdog only flags `failing` on a Windows HRESULT launch-failure code (high-bit-set, e.g. `0x80070002`). See [[reference_fleet_task_health_ms0_2026_05_17]].
- `NumberOfMissedRuns > 0` over 24h → the task is registered but not running

The `PRISM Fleet Task Health Watch` task does this audit fleet-wide and surfaces findings via chat-bus advisory.

## Anti-patterns

- **CronCreate for fleet hygiene** — dies on session close, leaves no safety net.
- **`-Principal "S4U"` for tasks that may touch peer processes** — Access is denied. SYSTEM is the right default for fleet-wide work.
- **No `-AtStartup` trigger** — task doesn't survive reboot.
- **No phase offset** — every task fires at :00, multiplying memory spikes.
- **`Stop-ScheduledTask` instead of disable** — loses registration state; reinstall required.
- **No kill switch** — emergency stop requires uninstall, which loses registration.
- **No PID lockfile on >1-minute work scheduled at <1-min cadence** — multi-fires corrupt output.
- **Multiple writers to one path without per-host lock suffix** — cross-PC collisions silently overwrite ([[fleet-coordination-discipline]] cross-tree class generalizes).
- **Trusting `LastTaskResult==0` to mean "task did its work"** — a script that crashes after exiting 0 is invisible to this check. Confirm via the artifact the task produces (mtime advance, log line, etc.).

## Checklist — registering a new scheduled task

- [ ] Right primitive for the durability requirement (Windows Scheduled Task for fleet-hygiene, not CronCreate)?
- [ ] Principal: SYSTEM if it may touch peer/elevated processes; S4U if same-user is sufficient
- [ ] `-AtStartup` trigger added for reboot survival?
- [ ] `-RestartCount 3 -RestartInterval 1m` for self-heal?
- [ ] Phase offset picked to avoid stacking with existing tasks?
- [ ] Env-var kill switch (`PRISM_<TASK>_DISABLE=1`) wired and respected?
- [ ] PID lockfile or mtime stamp if cadence < runtime?
- [ ] Per-host lock suffix if multi-PC?
- [ ] `-Uninstall` flag for clean reversal?
- [ ] Telemetry artifact (JSONL log + AGENT_CHAT advisory) for observability?
- [ ] Added to the fleet-task-health watch list?

## Related

- [[fleet-coordination-discipline]] — the runtime fleet layer this scheduling layer sits underneath
- [[reference_fleet_reaper_ms1]] — the canonical Windows-Scheduled-Task installer pattern
- [[reference_fleet_memory_monitor_2026_05_16]] — durable monitor that runs independent of any chat
- [[reference_fleet_task_health_ms0_2026_05_17]] — watchdog over the scheduled-task layer itself
- [[feedback_never_delete_only_disable]] — disable, don't uninstall, by default
- [[parallel-tool-call-discipline]] — the three concurrency primitives (parallel tools / Bash bg / Monitor / Agent); the scheduling primitives in this wiki are the durability complement
- The `ScheduleWakeup` tool description — full delay-picking guidance
- CLAUDE.md §FLEET-REAPER-MS0 / MS1 / MS2 · §FLEET-MEMORY-MONITOR-MS0 · §FLEET-TASK-HEALTH-MS0 · §NN-GRAPH-MS2
