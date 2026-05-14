---
title: Fleet Reaper — slot-aware orphan-process reaper
type: architecture
status: shipped
shipped: 2026-05-14
milestone: FLEET-REAPER-MS0
---

# Fleet Reaper — slot-aware orphan-process reaper for the 7-chat fleet

## What it solves

PRISM runs up to 7 concurrent Claude chats (alpha..foxtrot + golf). Each spawns
`node.exe` (hooks/MCP), `bash.exe` (the Bash tool), `git.exe` children. When a
chat crashes or is closed without firing its Stop chain those children are
orphaned — they pin RAM and, in aggregate across dead chats, cause the
commit-memory pressure that destabilizes the *surviving* chats.

PRISM already had generic reapers (`node-process-janitor`, `cleanup-orchestrator`
+ 5 sub-cleaners, `03-memory-pressure-auto-relief.ps1`). All of them use
*generic* heuristics — age thresholds, dead-parent checks, cmdline patterns.
**None of them cross-reference `chat-slots.json`.** None can say "this `node.exe`
belongs to slot `delta`, and `delta` is *crashed* → reap it" or "belongs to
`alpha`, which is *alive* → leave it alone." This pipeline adds that missing
**slot-aware** layer. It is purely additive — it does not modify any existing
reaper, and it explicitly does NOT re-run the generic cleaners.

## Safety invariant (load-bearing)

> **A process is a reap CANDIDATE only when its ancestry provably leads to a
> GENUINELY DEAD PID (`unowned`) OR to a crashed chat slot whose RECORDED
> HARNESS PID IS ITSELF DEAD (`owned-by-crashed`). Any uncertainty — a live
> ancestor we can't pin, a crashed-slot record that contradicts a still-alive
> PID, missing ancestry, anything desktop/system-rooted — is NEVER a candidate.
> Uncertainty always resolves toward "do not kill."**

The invariant is tested directly in `fleet-reaper.test.mjs` against a synthetic
process table that includes every classification branch. The two load-bearing
P1 cases:

- **PID reuse:** a crashed slot's recorded PID gets reused by an unrelated live
  process. `classifyProcess` checks `byPid.has(apid)` before treating a
  crashed-slot attribution as a candidate — if the PID is alive in the current
  process table, the slot record contradicts reality → `indeterminate`, never
  a candidate.
- **Wedged harness:** a slot is classified `crashed` (heartbeat stale) but the
  harness process is still running (just not heartbeating). Same `byPid.has`
  guard → `indeterminate`, never a candidate. The wedged harness's children
  aren't orphans — the harness is still there.

## Kill gate (all clauses must hold)

| # | Condition | Source |
|---|-----------|--------|
| 1 | `classifyProcess` returned `owned-by-crashed` or `unowned` (`isCandidate: true`) | `process-slot-map.mjs` |
| 2 | Process age ≥ `AGE_FLOOR_SEC` (default 45s) | `shouldReap` in `fleet-reaper-sweep.mjs` |
| 3 | Continuously a candidate for ≥ `KILL_AFTER × INTERVAL` of wall-clock — tracked by `firstSeenAt` (timestamp, NOT a counter) in the candidate ledger | `shouldReap` + `updateLedger` |
| 4 | Not in status / disabled / dry-run mode | `runSweep` mode branches |

Default: `KILL_AFTER = 2`, `INTERVAL = 300s` → 10-min continuous-candidacy
confirmation window (mid-cycle first-sighting yields ~10-15 min in practice).
Under memory pressure (≥ `MEM_PRESSURE_PCT`, default 90%), `KILL_AFTER` drops
to 1 for that sweep — the confirm window halves.

`firstSeenAt` is a TIMESTAMP, not a counter, so the gate is correct even when
the Monitor + scheduled task + Stop hook all sweep independently. A race only
ever DELAYS a reap (a candidate's confirm clock restarts, or a fresh entry is
dropped and re-added next sweep) — it can never cause an erroneous kill.

## Artifact map

| File | Role |
|------|------|
| `scripts/fleet-reaper-sweep.mjs` | The brain. CLI: `--once` / `--monitor-loop` / `--status` / `--dry-run` / `--stop-event` / `--detach`. Exports pure functions (`parseArgs`, `shouldReap`, `updateLedger`, `summarize`, `runSweep`, `reapProcesses`, `readHostMemory`) for tests. |
| `.claude/helpers/process-slot-map.mjs` | PID→slot classifier. `snapshotFleet({...})` is the public entry. Vendored `SLOT_NAMES` / `classifySlot` / `readSlots` (module-private, KEEP-IN-SYNC with chat-slots.mjs — see the block header). |
| `.claude/helpers/fleet-reaper.test.mjs` | 66-case vitest suite — every classification class + the kill gate at boundaries + the multi-sweep confirm-after-N-ticks integration + a drift-guard for the vendored primitives. |
| `.claude/hooks/fleet-reaper-stop.mjs` | Stop-hook arm. Bounded-async stdin drain, stamp-file throttle (45s — collapses a burst of near-simultaneous fleet Stops into one sweep), spawns the sweep detached. Wired in the Stop chain (`H:/.claude/settings.json`). |
| `.claude/helpers/install-fleet-reaper-task.ps1` | Windows Scheduled Task installer (`-DryRun` burn-in, `-StartOffsetSeconds 210` phase-offset, elevation probe, `-RunNow` polling, `-Uninstall`). Registers the `PRISM Fleet Reaper` task. |
| `.claude/commands/fleet-reaper.md` | The `/fleet-reaper` skill — operator-facing entry. |

## Three runners (defense in depth)

1. **In-session Monitor** (`/fleet-reaper` launches it) — `--monitor-loop --interval 300`, persistent. Selective emit (only on reaps / memory pressure / errors). Dies when the chat that armed it closes.
2. **Windows Scheduled Task** — `PRISM Fleet Reaper`, 5-min cadence, +210s phase offset so it doesn't pile onto the same minute as `PRISM Cleanup Orchestrator` + `PRISM Memory Pressure Auto-Relief`. Survives every chat closing.
3. **Stop-hook arm** — fires when ANY chat ends. Throttled (45s stamp file) so 7 simultaneous Stops collapse to one sweep. Advisory only — always emits `{continue:true}`, never blocks Stop.

All three write the same `state/shared/fleet-reaper-candidates.json` ledger.
The merge is `firstSeenAt`-preserving and idempotent. A best-effort lockfile
narrows the race window; lock failure is non-fatal because the worst case is a
delayed reap.

## Knobs

| Env var | Effect | Default |
|---------|--------|---------|
| `PRISM_FLEET_REAPER_DISABLE=1` | **Kill switch** — sweep refuses to kill anything, every runner, fleet-wide | (unset) |
| `PRISM_FLEET_REAPER_DRY_RUN=1` | Classify + decide, never kill | (unset) |
| `PRISM_FLEET_REAPER_KILL_AFTER=N` | Confirm ticks before a kill | `2` |
| `PRISM_FLEET_REAPER_AGE_FLOOR_SEC=N` | Min process age to consider | `45` |
| `PRISM_FLEET_REAPER_INTERVAL_SEC=N` | Confirm-tick length (seconds) | `300` |
| `PRISM_FLEET_REAPER_MEM_PRESSURE_PCT=N` | Commit/phys % above which `kill-after` drops to 1 | `90` |

## Relationship to existing reapers

| Reaper | What it owns | This pipeline's distinction |
|--------|--------------|----------------------------|
| `node-process-janitor.mjs` (scheduled, 2-min) | Stale `.claude/hooks|helpers` node/bash, orphan MCP (parent dead) | Generic age + dead-parent. No slot attribution. |
| `cleanup-orchestrator.mjs` (scheduled, 5-min, "PRISM Cleanup Orchestrator") | Locks/claims/bash-orphans/chat-bus — 5 sub-cleaners | Generic. No slot attribution. |
| `03-memory-pressure-auto-relief.ps1` (scheduled, 5-min) | Escalates to tsserver kills + janitor at thresholds | Memory-pressure trigger, not orphan attribution. |
| **fleet-reaper-sweep.mjs (this pipeline)** | **PID→slot mapped orphan node/git/bash, confirm-after-N-ticks gated** | **Slot-attributed. The 4 above don't see `chat-slots.json`.** |

Run all of them — they cover different classes of cruft.

## Verification

```bash
# Read-only sweep, no kills:
node H:/prism/scripts/fleet-reaper-sweep.mjs --status

# 66-case test suite:
node H:/prism/mcp-server/node_modules/vitest/vitest.mjs run \
  --config H:/prism/.claude/helpers/vitest.config.mjs fleet-reaper.test.mjs

# Scheduled task health:
schtasks /Query /TN "PRISM Fleet Reaper" /V /FO LIST

# Audit trail:
Get-Content H:/prism/state/shared/fleet-reaper.log -Tail 20 -Wait
```

## Doctrine

This pipeline is the answer to user request "look at current tasks in task
manager every 5 mins to determine when to close orphan nodes, git and bash
tasks left open by one of the 7 chats going. if its not being used, please end
process. make sure memory is always stable so 7 chats can work at the same time."
The slot-aware layer is what distinguishes "if it's not being used" from the
existing generic age-only heuristics — "not being used" means "the chat that
spawned it is gone," and only this pipeline can prove that.
