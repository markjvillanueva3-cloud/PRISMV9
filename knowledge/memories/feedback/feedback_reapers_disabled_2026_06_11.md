---
name: feedback_reapers_disabled_2026_06_11
description: 2026-06-11 — fleet reapers were DISABLED for false-positive reaping of legit fleet nodes; RESOLVED later same day (both node-reaper paths hardened with a shared cmdline-allowlist + knobs re-enabled). History + the fix record.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.441Z
aliases: feedback_reapers_disabled_2026_06_11
---


# REAPERS DISABLED → RESOLVED (2026-06-11, slot:golf)

> ## ✅ RESOLVED later 2026-06-11 — reaper RE-ENABLED with the fix in place
> Operator follow-up directive: *"make sure fleet reapers are running, adjust so they dont kill active chat fleet nodes and tools."* Both node-reaper paths were hardened with the documented cmdline-allowlist fix and the knobs cleared to `0`:
> - **`fleet-reaper-sweep.findStaleOrphanedNodes`** (`de66545dbe` + `1b49790a70`): new shared `DEFAULT_PRISM_WORKER_PROTECT_REGEX` cmdline-allowlist + conservative no-cmdline skip + `hasLiveClaudeAncestor` deep-ancestry walk; `dist/index.js` anchored to `mcp-server/dist/index.js`. 44/44 tests, 3-of-3 scrutiny PASS, live `--dry-run` = 0 legit nodes flagged.
> - **`node-orphan-cleaner.isProtected`** (`8ee957e6ee`): same shared regex (single source of truth). 10/10 tests, live `--dry-run --force` aggressive = **50/53 protected** (was 31 pre-fix), only 1 genuine foreign zombie (`npx chrome-devtools-mcp`) would be reaped.
> - Knobs `PRISM_FLEET_REAPER_DISABLE` + `PRISM_GOLF_GUARDIAN_DISABLE` set to `0`; the 6 reaper tasks are State:Ready.
> **Remaining follow-up:** audit the OTHER reapers for the same allowlist — `Zombie Reaper v2` (`stop_close_prism_nodes_v2.mjs`), `Orphan Process Reaper (PS)`, `Cleanup Orchestrator`, `bash-orphan-cleaner` — and elevated-register the durable `PRISM Fleet Reaper` task if it drops. Record: [[reference_golf_inventory_of_record_2026_06_11]].

**Original incident (operator):** "don't launch reapers for now, all fleets keep getting their nodes reaped." The reaper was killing **legitimate** fleet node processes (work loss), not just orphans.

## Actions taken (golf, this session)
1. **6 reaper-family scheduled tasks DISABLED** (`Disable-ScheduledTask`, no elevation needed): `PRISM Fleet Reaper`, `PRISM Node Orphan Cleaner`, `PRISM Zombie Reaper v2`, `PRISM Orphan Process Reaper (PS)`, `PRISM Memory Pressure Auto-Relief`, `PRISM Cleanup Orchestrator`. Verified State=Disabled.
2. **Env kill-switches set** in `C:/Users/wompu/.claude/settings.json` (mirrored C→H): `PRISM_FLEET_REAPER_DISABLE=1` (disables ALL reaping fleet-wide — the sweep self-checks at start) + `PRISM_GOLF_GUARDIAN_DISABLE=1` (stops the per-prompt golf guardian from kicking detached sweeps). This is the real backstop: even if a chat runs `/checkin-golf` (which auto-runs the reaper), the sweep now no-ops.
3. **In-flight sweeps killed** (targeted to `fleet-reaper`/reaper command lines only) — none were running (clean).

## Likely root cause (for the fix BEFORE re-enabling)
The **stale-node-hunter** `findStaleOrphanedNodes` (commit `01220f8a5f`, `fleet-reaper-sweep.mjs`) reaps `node.exe` with RSS=0 / sub-5MB, age≥30min, non-owned parent. **Idle legitimate fleet node helpers** (MCP daemons, idle hook nodes, Workflow/Agent subagent nodes between turns, the per-chat node processes) can match RSS=0/sub-5MB when idle — and if their parent isn't in the whitelist (`claude/code/wt/cmd/powershell/pwsh/bash/sh/node`), they get reaped. Knob `PRISM_FR_HUNT_STALE_NODE_DISABLE=1` disables just that hunter.

## Re-enable ONLY after fixing the false-positive
1. **Fix first:** tighten `findStaleOrphanedNodes` — add a command-line ALLOWLIST (never reap nodes whose cmdline contains `mcp-server`, `.claude/hooks`, `claude`, a known PRISM script, or an active chat-slot pid-tree); raise the age floor; require deeper ancestry-orphan confirmation (not just RSS+parent-name). Test against live idle fleet nodes (prove 0 legitimate reaps).
2. Then: remove the 2 env vars from settings.json + `Enable-ScheduledTask` the 6 tasks.

**Why:** golf OWNS the reaper and `/checkin-golf` auto-launches it — without this directive recorded, the next golf session would re-launch the node-killing reaper and resume the work loss.
**How to apply:** golf (and any chat) must NOT re-enable reapers until the hunter false-positive is fixed + proven on live idle nodes. The env kill-switch is the safety net; do not remove it casually. Supersedes the "overnight reapers active" guidance from earlier 2026-06-11. Related: [[feedback_golf_owns_reaper]], [[reference_golf_inventory_of_record_2026_06_11]].
