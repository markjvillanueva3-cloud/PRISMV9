---
title: Fleet Reaper — slot-aware orphan-process reaper
type: architecture
status: shipped
shipped: 2026-05-14
milestone: [FLEET-REAPER-MS0, FLEET-REAPER-MS1]
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

## Phase 2 (FLEET-REAPER-MS1)

Shipped 2026-05-14 — strictly additive over MS0, 6 units. The reframe: MS0 was
"kill more orphans"; MS1 is "**use what's idle**" — the box runs near the
commit-memory ceiling while the GPU sits at single-digit utilization. MS1 (a)
catches the one orphan class MS0's dead-ancestor rule missed, and (b) converts
idle stale-slot RAM + idle GPU VRAM into throughput for the surviving chats —
soft-first (reversible), kill-last.

### U-PHASE2-BASH-CLASSIFIER — the `leftover-bash-task` class

MS0's `unowned` class catches an orphan whose ancestry leads to a **dead** PID.
But a Bash-tool Monitor loop (`while true; do …; sleep N; done`) often outlives
its chat while the chat's `claude.exe` **lingers alive but unpinned** — MS0 sees
a live ancestor → `owned-by-alive` → never reaps it. `process-slot-map.mjs` adds
`leftover-bash-task`: a reap candidate when ALL hold — the process is `bash`/`sh`,
its cmdline matches a `LEFTOVER_TASK_PATTERNS` signature (AND-of-simple-regexes,
haystack truncated to `LEFTOVER_CMD_SCAN_MAX` = 4096 → ReDoS-safe), its age ≥
`LEFTOVER_AGE_MS_MIN` (15 min), **every** `claude.exe` in its ancestry is
*unpinned* (not in `slotPidMap`), and the slots file resolved cleanly
(`__slotsResolved` — a degraded/corrupt slots file must never WIDEN the
candidate set). See [[leftover-monitor-bash-pattern]].

### Layer 1 — soft RAM/CPU relief (`fleet-reaper-sweep.mjs`)

Reversible pressure response on **stale-slot** processes only (heartbeat 2-10 min
stale — not alive, not crashed-with-dead-PID): `selectSoftReliefTargets` picks
PIDs older than `SOFT_RELIEF_AGE_SEC` (180 s — see [[soft-relief-age-floor]]),
`applyPriorityRelief` drops them to `BelowNormal`, `applyWorkingSetTrim` trims
the working set (.NET `EmptyWorkingSet` — no P/Invoke). Both reversible: Windows
re-pages on demand, priority resets on the process's own scheduling. Gated to
`mem.usedPct ≥ SOFT_RELIEF_PRESSURE_PCT` (90 %). Audit → a **dedicated**
`state/shared/.fleet-reaper-actions.jsonl` (deliberately NOT the kills log).

### Layers 2-3 — GPU/Ollama probe + coordinator

`readGpuState` (nvidia-smi CSV, 3 s timeout, fail-soft → degrades, never throws)
and `readOllamaState` (`/api/tags` + `/api/ps`, honors `OLLAMA_URL`) feed
`decideOllamaCoordination` — a **pure** truth table. When commit pressure is
high AND the GPU has headroom (`GPU_FREE_MIN_MB`, 2048) AND ≥ 1 alive slot:
`prewarmOllama` fire-and-forgets a model load into VRAM, and `writeRoutingHint`
atomically writes `state/shared/.ollama-routing-hint.json` — a TTL'd hint the
`ollama-task-offloader.mjs` hook consumes to lower its offload bar so more
hook-eligible work goes to the local model instead of competing for the commit
budget. Contract: [[ollama-routing-hint]]. Empirical rationale:
[[gpu-absorb-threshold]]; TTL rationale: [[routing-hint-ttl]]. **Advisory** — a
coordinator error surfaces as a caveat but NEVER flips the reap-mission `ok`.

### U-PHASE2-HINT-CONSUMER — `ollama-task-offloader.mjs`

`loadRoutingHint` reads the hint file (a FIXED absolute literal path —
cross-process contract, both sides hardcode it), fail-soft on
missing/corrupt/expired/wrong-schema, and applies `thresholdDelta` (clamped to
±0.30) to its confidence + inject thresholds. Rides a `routingHint:true`
annotation on the existing offload telemetry so `/ollama-offload-dashboard`
attributes the extra volume to the coordinator.

### U-PHASE2-ALPHA-GUARDIAN — the alpha chat owns the reaper

`alpha-slot-reaper-guardian.mjs` (SessionStart + UserPromptSubmit hook): the chat
holding the `alpha` slot is responsible for keeping the reaper live — the
guardian verifies the durable scheduled task is registered + enabled, kicks a
throttled detached `--once` sweep, and emits a LOUD advisory if the task is
missing/disabled. Every other chat is a silent no-op. Full entry:
[[alpha-slot-reaper-guardian]].

### New flags + knobs

CLI: `--no-coord` (skip Layers 2-3), `--no-relief` (skip Layer 1). Env:
`PRISM_FLEET_REAPER_{GPU_DISABLE,GPU_FREE_MIN_MB,HINT_THRESHOLD_DELTA,HINT_TTL_SEC,OLLAMA_COORD_DISABLE,OLLAMA_KEEP_ALIVE,OLLAMA_PREWARM_MODEL,SOFT_RELIEF_AGE_SEC,SOFT_RELIEF_DISABLE,SOFT_RELIEF_PRESSURE_PCT}`,
`OLLAMA_URL` (reused), `PRISM_ALPHA_GUARDIAN_{DISABLE,NO_SWEEP}`. Full table in
the `/fleet-reaper` skill.

### Test status (honest)

`fleet-reaper.test.mjs` grew 66 → 137 `it()` cases. The vitest harness for
`.claude/helpers/*.test.mjs` is currently **blocked by a pre-existing
vite-transform bug** — vite's `es-module-lexer` pre-scan of the imported
`process-slot-map.mjs` produces output V8 rejects (`SyntaxError`), and it
affects the whole helper suite, not just this file (`_probe.test.mjs`, unrelated,
fails identically). The MS1 code is verified valid four other ways: `node
--check`, direct esbuild transform, a full plain-node import-graph load, AND a
live `--once` production sweep that ran clean — the classifier, soft-relief
selector, GPU probe, Ollama probe and coordinator all executed without throwing
(which *specific* layers take action on any one sweep depends on box state at
sweep time — the coordinator only acts under pressure + GPU headroom + an alive
slot). The sister clue is `chat-slots.mjs:622`, which documents the same
vite-static-analyzer trap class. Tracked as a follow-up.

## Verification

```bash
# Read-only sweep, no kills:
node H:/prism/scripts/fleet-reaper-sweep.mjs --status

# 137-case test suite (see "## Phase 2 → Test status" — the vitest harness for
# .claude/helpers/*.test.mjs is currently blocked by a pre-existing vite-transform bug):
node H:/prism/mcp-server/node_modules/vitest/vitest.mjs run \
  --config H:/prism/.claude/helpers/vitest.config.mjs --pool=forks fleet-reaper.test.mjs

# Scheduled task health:
schtasks /Query /TN "PRISM Fleet Reaper" /V /FO LIST

# Sweep log (all sweeps — reaps, pressure, errors):
Get-Content H:/prism/state/shared/fleet-reaper.log -Tail 20 -Wait

# Soft-relief audit trail (MS1 — Layer 1 priority/working-set actions ONLY,
# a dedicated file, deliberately separate from the kills log):
Get-Content H:/prism/state/shared/.fleet-reaper-actions.jsonl -Tail 20 -Wait
```

## Doctrine

This pipeline is the answer to user request "look at current tasks in task
manager every 5 mins to determine when to close orphan nodes, git and bash
tasks left open by one of the 7 chats going. if its not being used, please end
process. make sure memory is always stable so 7 chats can work at the same time."
The slot-aware layer is what distinguishes "if it's not being used" from the
existing generic age-only heuristics — "not being used" means "the chat that
spawned it is gone," and only this pipeline can prove that.

## Autonomy + enumeration-robustness hardening (2026-05-16b)

Slot alpha, claude-fe461853, commit `2cd22c52`. After a live "reaper not staying open / orphans accumulate / xmalloc fork-storm" report.

**ROOT CAUSE (the reaper was blind, not dead):** `process-slot-map.mjs` `windowsEnumerate()` runs a PS `Get-CimInstance Win32_Process | ConvertTo-Json`. PS 5.1 `ConvertTo-Json` emits **raw C0 control bytes** inside JSON string literals (no `\u`-escaping). One process whose `CommandLine` has a control char (a `node --eval` payload) → invalid JSON → Node `JSON.parse` throws → the **entire** enumeration degrades to empty → 0 candidates while orphans pile up. Fix: strip `[\x00-\x1F]`→space in the PS script *before* `ConvertTo-Json` (lossless for structural cmdline matching; space-not-empty avoids token fusion). Live-verified `0 candidates+caveat → 2 candidates, no caveat`. Pinned by a fail-on-revert test (`matchesLeftoverTaskPattern`: raw→true, space→true, empty→false).

**Installer → true-autonomous:** `install-fleet-reaper-task.ps1` registered with no `-Principal` ⇒ `Logon Mode: Interactive only` (dies when you log off). Now: default **S4U** principal (`-RunLevel Highest`, whether-logged-on-or-not, no stored password); `-AsSystem` (machine account); `-Interactive` (legacy); a second `-AtStartup` trigger (pre-login reboot resume); `-RestartCount 3 -RestartInterval 1m`; `Register-ScheduledTask` splatted so `-Principal` is omitted in legacy mode. `-Uninstall` / `Disable-ScheduledTask` reversibility intact.

**Set-and-forget command (one elevated run):**
```
powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow
```
Add `-AsSystem` for machine-account mode. After this the durable task is the always-on mechanism — no chat-side Monitor needed. Memory: [[reference_fleet_reaper_autonomy_robust_2026_05_16]].
