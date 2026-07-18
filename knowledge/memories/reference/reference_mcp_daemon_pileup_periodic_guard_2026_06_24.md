---
name: reference_mcp_daemon_pileup_periodic_guard_2026_06_24
description: "Recurring 'MCP server drops' (2026-06-24) root-caused to daemon PILEUP that nothing periodically reaped (the PT5M watchdog is pileup-blind) -- NOT an active OOM leak. Fix: new PRISM MCP Singleton Guard task (S4U/hidden, PT10M, runs singleton-service-guard --fix). (slot:golf)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.651Z
aliases: reference_mcp_daemon_pileup_periodic_guard_2026_06_24
---


Operator (2026-06-24): "fix whatever is causing the mcp server to drop again."

**Live diagnosis (corrects the stale ~10MB/min-leak framing):** at the time, `:3100` was actually UP
(curl -> HTTP 200) but there were **3 MCP daemons** (1 serving pid 54160 + 2 non-serving duplicates ~2.7h old).
The serving daemon was at **845MB WS after 3.25h** = HEALTHY, NOT the ~10MB/min closure leak the
[[reference_mcp_supervisor_persistence_fix_2026_05_31]] / [[reference_mcp_fleet_scale_fix_2026_05_29]] memories
describe (that would be ~2GB by now). Commit 46% / RAM 38% -- no OOM pressure. So the recurring "drop" was
daemon PILEUP + transient under-load `/health` probe timeouts that LOOK like a disconnect (false-positive class,
sibling of [[reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17]]), NOT a crash.

**Root cause of the pileup:** the supervision layer had a GAP. `mcp-server-watchdog.mjs` (PT5M) handles
/health-wedge (kill+respawn after 2 fails), RSS-preempt (orderly restart at RSS_THRESHOLD_MB=18432 = 18GB,
BLACKWELL-TUNE 2026-06-09, inflight-deferred), and boot-guard -- but it is **completely blind to daemon pileup**:
as long as ONE daemon answers /health it is satisfied and never reaps duplicates. The `PRISM MCP Server` supervisor
(PT3M, O_EXCL PID lock) only ensures a daemon EXISTS; it backs off when one is running (last result 0x80070420 =
ERROR_SERVICE_ALREADY_RUNNING). And `singleton-service-guard.mjs --fix` (which DOES reap non-serving duplicates,
keep the serving one) only ran ON-DEMAND (chat `--fix` / guardian). So duplicates from racing per-chat bridge
self-heal spawns (`supervisor --once`) accumulated unreaped until a port-race surfaced as a "drop."

**Fix (golf, in-domain, low-risk):** registered scheduled task **`PRISM MCP Singleton Guard`** -- S4U/hidden
(session 0, no console window per the 2026-06-24 hook-window work), `PT10M` repeat (CIM `MSFT_TaskRepetitionPattern`
Interval=PT10M, no Duration = indefinite -- note: `$trigger.Repetition.Interval='PT10M'` assignment AND
`-RepetitionDuration ([TimeSpan]::MaxValue)` both FAIL in PS; the CIM-instance method is the reliable one),
ExecutionTimeLimit 5min, MultipleInstances=IgnoreNew, runs `node singleton-service-guard.mjs --fix`. This
continuously enforces the singleton -> no pileup accumulation. Immediate: reaped the 2 dupes (3->1), :3100 stayed 200.

**Supervision triad now complete:** supervisor PT3M (ensure-exists) + watchdog PT5M (health/RSS/wedge) +
singleton-guard PT10M (reap duplicates).

**Deeper root cause NOT golf-fixed (flag for papa/backend):** the per-request `server.connect(transport)` closure
leak at `mcp-server/src/index.ts:973-983` -- the structural fix is `U-MCP-FACTORY-REFACTOR` (per-session McpServer
factory), a deferred MCP-CAPACITY-MS0 milestone (server-core rewrite + rebuild, risky). It was NOT manifesting live
(daemon healthy), and if RSS ever climbs the watchdog's 18GB preempt-restart catches it -- but the true elimination
is the factory refactor. **Follow-up:** add `install-mcp-singleton-guard-task.ps1` (mirror install-conhost-janitor.ps1)
so a re-provision/other-PC keeps the task. Related: [[reference_conhost_orphan_window_storm_2026_06_22]].
