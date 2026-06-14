# U-FH03 — PRISM MCP Server scheduled-task LastTaskResult triage (2026-05-25)

> Unit: U-FH03 (FLEET-HEALTH-FIX, cost=S). Triggered by stale `LastTaskResult=2147946720` observed pre-iter-1 in MCP-CAPACITY-MS0 §5. Closed in /loop iter5, slot:golf, claude-9e91d800.

## TL;DR

The scheduled-task error code `2147946720` (= `0x80070420` = `ERROR_SERVICE_NOT_ACTIVE`) was a **transient side-effect of two prior events**, not a wrapper bug:

1. The U-FH01 heartbeat-keepalive `timeout: 8` (8ms typo) bug that broke chat-slot heartbeat fleet-wide, causing PC sleep / restart cascades during the 2026-05-25 02:00 CST crash.
2. The iter-1 PRISM MCP Server restart cycle (`schtasks /End` followed by `/Run`) which momentarily put the task in `SERVICE_NOT_ACTIVE` state.

After iter-1, current state is **HEALTHY**:

| Metric | Value |
|---|---|
| Task state | Running |
| LastTaskResult (hex) | `0x00041301` |
| LastTaskResult (decoded) | `SCHED_S_TASK_RUNNING` (success class) |
| LastRunTime | 2026-05-25 16:35:35 |
| NumberOfMissedRuns | 0 |
| /health probe | HTTP 200 |
| /mcp tools/list | 90 tools, HTTP 200 |

No wrapper-config fix needed. Unit closes as **resolved-by-context** + diagnosis captured for future reference.

## Wrapper config audit (`Export-ScheduledTask`)

The task wrapper is clean and behaves as the supervisor expects:

| Element | Value | Verdict |
|---|---|---|
| Action | `"H:\PRISM\scripts\mcp-server-supervisor.mjs"` | ✓ Correct supervisor entrypoint |
| AllowHardTerminate | `true` | ✓ Required for U-WATCHDOG-MEM-PROBE preemptive restart |
| StartWhenAvailable | `true` | ✓ Catches missed runs after PC sleep |
| ExecutionTimeLimit | `PT0S` (no limit) | ✓ MCP server runs forever |
| Hidden | `false` | ✓ Visible in Task Scheduler UI |
| RestartOnFailure | empty | (minor) Could specify interval/count, but supervisor handles restart internally — not load-bearing |

The supervisor itself injects `NODE_OPTIONS=--max-old-space-size=8192` (U-SUPERVISOR-HEAP-BUMP 2026-05-23) and the watchdog handles preemptive restart at RSS > 3GB (U-WATCHDOG-MEM-PROBE 2026-05-23).

## Decoding the historical `2147946720`

`0x80070420` decomposes as a standard `HRESULT`:
- Severity: `0x8` (Error)
- Facility: `0x007` (`FACILITY_WIN32`)
- Code: `0x420` (`ERROR_SERVICE_NOT_ACTIVE`)

`ERROR_SERVICE_NOT_ACTIVE` is the system's response when scheduled-task control APIs query a task that exited cleanly between checks. In Task Scheduler semantics, this is the result code the framework records when:
- A task was running, then was explicitly stopped (`schtasks /End`)
- A task crashed/exited and the framework hadn't seen the new instance yet
- A task was queried in the brief window between `/Run` invocation and process startup

**None of these are fatal.** They're event-recording artifacts. The CRITICAL signal is `NumberOfMissedRuns > 0` (we see 0) or RSS approaching the U-WATCHDOG-MEM-PROBE 3GB ceiling (well under today).

## Why this matters going forward

The pre-flight rationale in MCP-CAPACITY-MS0 §5 was: *"If U-FH03 surfaces a §2 cascade pattern, that VALIDATES the §3 approach. If U-FH03 is a config typo (likely), it's a 1-line fix."*

The answer is **neither** — it's a transient artifact recorded across two unrelated events. The wrapper is clean, current state is healthy, the §2 cascade pattern is not running today. The remaining drift pathology (the user-reported "disconnect after a few minutes mid turn") is correctly attributed to per-request `server.connect()` leakage in `mcp-server/src/index.ts:973-983` per [`MCP-DISCONNECT-ROOT-CAUSE-2026-05-25.md`](./MCP-DISCONNECT-ROOT-CAUSE-2026-05-25.md). U-MCP-FACTORY-REFACTOR (golf queue) is the structural fix.

## Operator-action note

Going forward, set up periodic LastTaskResult monitoring via the existing fleet-task-health-watch.mjs Stop hook (already wired, watches all `PRISM *` scheduled tasks). It only treats HRESULT failure codes (severity `0x8`) as failing AND filters benign codes like `0x00041301` and `0x80070420` per the `fleet-task-health-watch.mjs` hardening from 2026-05-17 ([[reference_fleet_task_health_ms0_2026_05_17]]). Today's healthy state will be the steady-state baseline.

## Resolution

Unit closes as **resolved-by-context**. No wrapper change. Diagnostic doc captured. fleet-task-health-watch.mjs continues monitoring with its existing benign-code filter; no new alarm needed for `0x80070420` since that filter already exists.

— Triaged 2026-05-25 by claude-9e91d800 (slot:golf, /loop iter5).
