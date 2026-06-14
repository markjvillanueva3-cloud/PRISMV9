---
name: reference-fleet-memory-monitor-2026-05-16
description: "Durable 5-min RAM monitor independent of alpha — closes the gap fleet-reaper leaves when all 13 chats are LIVE. claude.exe-tree attribution, not slot.pid. AGENT_CHAT advisory names /compact target."
aliases: reference_fleet_memory_monitor_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.114Z
---


# Fleet Memory Monitor MS0 — 2026-05-16 (slot=golf-work, claude-629a6355)

Built in response to: *"monitor memory and ram usage every 5 minutes to keep 13
chats active. [[reference_fleet_reaper|fleet-reaper]] isn't enough since it drops during alpha's
compaction."*

## Why [[reference_fleet_reaper|fleet-reaper]] alone wasn't enough

`fleet-reaper-sweep.mjs` only kills orphans of **crashed** slots (10-min
confirm window). When all 13 chats are alive but memory pressure climbs,
reaper has nothing to do — `ok 0 candidates`. The reaper is alpha-owned;
when alpha `/compact`s its in-session Monitor pauses (scheduled task survives,
but reaper's job and this monitor's job are different).

## What this adds

Identifies WHICH LIVE chat tree to `/compact` when pressure rises. Advisory
only — never kills.

## Attribution: claude.exe-tree, NOT chat-slots.pid (load-bearing lesson)

First-cut design joined RSS to slots via `chat-slots.json` `state.pid`. Live
verification: **slot.pid is ephemeral** (the subshell that called `claim`,
exits seconds later). `terminalWindowId` shell PID is similarly recycled
across `/compact`. Neither survives 5-min sweep cadence.

What IS stable: **claude.exe processes**. Each open chat IS a claude.exe; the
harness restart on `/compact` spawns a fresh one. So the attribution unit is
"claude.exe PID + all descendants via parent chain". Live: 12 claude.exe trees
detected when "13 chats open" (1 transient between compacts).

Slot label overlay is best-effort only: when slot.pid happens to hit a live
claude.exe we attach the name; otherwise the tree key is `tree-<PID>` and the
operator identifies windows by PID. **Never invent a slot label** (R12 fail-loud).

## Files shipped

- `scripts/fleet-memory-monitor.mjs` — main sweep (~640 LOC, 14 exports)
- `scripts/fleet-memory-monitor.test.mjs` — 28 unit tests via `node:test`
  (vitest harness has pre-existing transform bug under helpers/, same pattern
  as `fleet-reaper.test.mjs`)
- `.claude/helpers/install-fleet-memory-monitor-task.ps1` — elevated installer
  (S4U/AtStartup/Restart3×1m, +330s phase offset)
- `.claude/helpers/register-fleet-memory-task-unelevated.ps1` — unelevated
  fallback (current user, while logged in)
- `state/shared/fleet-memory-history.jsonl` — telemetry, rotated at 512KB
- `state/shared/fleet-memory-monitor-state.json` — warn-tick + cooldown ledger
- `knowledge/wiki/architecture/fleet-memory-monitor.md` — wiki entry

## CLI

```bash
node scripts/fleet-memory-monitor.mjs                # one sample, text
node scripts/fleet-memory-monitor.mjs --status       # read-only summary
node scripts/fleet-memory-monitor.mjs --history 50   # tail
node scripts/fleet-memory-monitor.mjs --dry-run      # full sample, no writes
```

Exit codes: 0 clean · 1 warn · 2 critical · 3 measurement failure.

## Knobs

- `PRISM_FLEET_MEMMON_DISABLE=1` — refuses to write/emit
- `PRISM_FLEET_MEMMON_WARN_PCT` (80) / `_CRIT_PCT` (92) — pressure thresholds
- `PRISM_FLEET_MEMMON_ADVISORY_COOLDOWN_SEC` (600) — between AGENT_CHAT emits
- `PRISM_FLEET_MEMMON_SUSTAINED_TICKS` (2) — warn-advisory hysteresis

## Live verification

- Scheduled task registered unelevated (current user, every 5 min)
- First run: exit code 2 (critical), phys 74.5% / commit 96.0%, 12 chat trees
- Largest tree: PID 46816 (858MB) — `/compact` target emitted to AGENT_CHAT.jsonl
- NextRunTime confirmed at 5-min cadence
- 28/28 unit tests pass

## Independence invariant

No chat-side guardian, no in-session Monitor, no alpha dependency. The Windows
Scheduled Task IS the only firing surface. Phase offset +330s leaves it
clear of "Cleanup Orchestrator" (+60), "Memory Pressure Auto-Relief" (+120),
"PRISM [[reference_fleet_reaper|Fleet Reaper]]" (+210).

## Karpathy lessons earned this session

1. **R8 — Read before write**: `attributeProcesses` first version trusted
   `slot.pid` because chat-slots.mjs called it `pid`. Live test caught it
   (0 attributed processes despite 11 active claude.exe instances). Always
   live-verify the data-model assumption before declaring the pure function
   correct.
2. **R12 — Fail loud**: PowerShell sampler throws on empty stdout / non-JSON /
   non-zero exit → exit code 3 (measurement failure), distinct from
   pressure-level exit codes. Silent failure would have shipped a monitor
   that pretends "all clean" when CIM is wedged.
3. **Hooks chatter ≠ findings**: 4-5 false-positive callouts per Edit (magic
   numbers in test fixtures, JSDoc as "commented-out code", unused-var on
   live identifier). Triage; don't chase.

Related: [[reference_fleet_reaper]] · [[reference_fleet_reaper_ms1]] ·
[[reference_session_continuity_stack_2026_05_15]] ·
[[feedback_alpha_owns_reaper]] (this monitor does NOT take ownership from
alpha — it's a different mechanism, no peer conflict).
