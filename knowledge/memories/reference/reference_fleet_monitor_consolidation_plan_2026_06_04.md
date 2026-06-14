---
name: reference_fleet_monitor_consolidation_plan_2026_06_04
description: "Fleet-hygiene monitor consolidation + fleet-reaper blind-spot plan. Merge 4 overlapping orphan reapers into the canonical Fleet Reaper after adding 3 reap tiers (transient-tool, dead-parent-node, fsmonitor-dedup). 99 procs/~8.5GB reaped this session proved the gaps."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.114Z
aliases: reference_fleet_monitor_consolidation_plan_2026_06_04
---


# Fleet monitor consolidation + reaper blind-spots (golf, 2026-06-04)

Operator directive: *"make sure [[reference_fleet_reaper|fleet reaper]] is running, clear all zombie nodes/bash/git/grep/head/find tasks, update [[reference_fleet_reaper|fleet reaper]] and other monitors, merge them into one if multiple."*

## Hygiene done this session (the proof the gaps are real)
**99 processes reaped, ~8.5 GB freed.** [[reference_fleet_reaper|Fleet reaper]] running (`PRISM Fleet Reaper` task = Running); MCP :3100 = HTTP 200 healthy after.
- **45 transient-tool orphans** (grep/find/head, age>30min): incl a `find / -name backplotsimulationreport.htm` over the WHOLE C: drive at 2.8 HR CPU, and three greps stuck 5-6 HRS on tiny single files (git-bash pipe hang). 3 had dead parents, 2 wedged-on-trivial-input.
- **8 node orphans** (`build-node-embeddings`, parent-dead, 70-140min, ~6GB): a single-instance-lock bug spawned 6+ concurrent copies of the GNN 768d embedding build that outlived their parents.
- **46 idle `git fsmonitor--daemon`** (~381MB): proliferated from **84 git worktrees** (vs ~26 slots — abandoned slot-worktree sprawl). git 48→3 after; respawns one per ACTIVE worktree on demand (safe — read-only FS watcher).
- Counts settled: bash 202→54 (was tool-call churn, NOT a leak), node 109→76, git 48→3.

## The reapers that overlap (the "multiple" to merge)
| Task | Runs | Scope | Verdict |
|---|---|---|---|
| **PRISM [[reference_fleet_reaper|Fleet Reaper]]** | `fleet-reaper-sweep.mjs --once` | slot-mapped node/git/bash, confirm-gated, soft-relief, GPU/Ollama coord | **CANONICAL — keep + extend** |
| PRISM Node Orphan Cleaner | `node-orphan-cleaner.mjs` | node-only, dead-parent aware, MIN_AGE 8m, KEEP_PATTERNS | REDUNDANT → fold + disable |
| PRISM Orphan Process Reaper (PS) | `scripts/reap-orphan-procs.ps1` | PS process reap | REDUNDANT → fold + disable |
| PRISM Zombie Reaper v2 | (node) | — | already DISABLED, leave |
| PRISM [[reference_fleet_memory_monitor_2026_05_16|Fleet Memory Monitor]] | `fleet-memory-monitor.mjs --once` | RAM advisor, names chat to /compact | DISTINCT (advisory) — keep, or fold cadence |
| PRISM Memory Pressure Auto-Relief | system-health.ps1 | RAM relief | overlaps memory-monitor |
| PRISM Tmp Sweep | `tmp-orphan-janitor.mjs --apply` | tmp FILES (not procs) | DISTINCT — keep separate |

## THE 3 BLIND SPOTS — add as reap tiers to [[reference_fleet_reaper|fleet-reaper]]-sweep.mjs (golf-owned canonical)
The reaper maps only node/git/bash to slots + reaps by slot-death. It MISSES:
1. **Transient-tool tier** — `grep`/`find`/`head` (git's usr/bin) age>N (default 30min). 100%-confident orphan class: these finish in seconds, never run long; they have NO slot so they need NO confirm-tick gate — strict age rule. (Would've caught the 2.8hr `find /`.)
2. **Dead-parent unmapped-node tier** — node whose `parentPid` is dead AND cmdline ∉ infra KEEP set (`mcp-server-supervisor|mcp-server-watchdog|mcp-server-daemon|index\.js|mcp-http-bridge|fleet-reaper|chat-slots`) AND age>MIN_AGE. (Would've caught the 8 build-node-embeddings.) NOTE: `node-orphan-cleaner.mjs` ALREADY has this logic + parent-pid reads — folding it in subsumes the redundant task.
3. **fsmonitor-dedup tier** — idle `git fsmonitor--daemon` (CPU<2, age>180s) → reap; respawn-on-demand keeps live worktrees fast. Bounds the 84-worktree daemon explosion.

Reuse existing helpers: `shouldReap()` (line 497), `reapProcesses()` (668), `windowsKill()` (570), `classifyKillError()` (532), `getProtectedPids()` (646). Add tiers in the classify/candidate stage; gate transient + fsmonitor by strict age (no slot-tick), gate node by dead-parent+age. Tests: per-file 2-arm + 3-of-3. Keep `--dry-run` default for new tiers until proven on live counts.

## Root-cause units (separate, each its own commit)
- **84-worktree prune** (FLEET-GIT-CONTENTION-MS0 / U-FGC-3 territory): abandoned `H:/prism-slot-*` worktrees → fsmonitor + disk + contention. DELICATE — check each for unmerged commits BEFORE `git worktree remove` (foreign-absorption hazard). Slot-worktree adoption is the structural end-state.
- **build-node-embeddings single-instance lock**: the embedding build (`scripts/build-node-embeddings*` via `graph-node-embedding-bridge` / `nn-graph-retrain-lifecycle`) spawned 6+ concurrent copies. Add an O_EXCL lock so only one runs.
- **node-orphan-cleaner not firing**: task is Ready but 70-140min node orphans survived → its trigger interval is too long OR throttle/state stuck OR a KEEP_PATTERN false-matched `node -e "import(...)"`. Investigate before disabling (don't lose coverage).

## ELEVATION-GATED (operator must run from elevated PowerShell — golf cannot, UAC)
After the [[reference_fleet_reaper|fleet-reaper]] is extended to cover their scope (so no coverage is lost):
```powershell
schtasks /Change /TN "PRISM Node Orphan Cleaner" /DISABLE
schtasks /Change /TN "PRISM Orphan Process Reaper (PS)" /DISABLE
# re-register the extended fleet-reaper if its cadence should tighten:
# powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-fleet-reaper-task.ps1 -RunNow
```

Related: [[reference_fleet_reaper]] · [[reference_fleet_reaper_ms2_2026_05_18]] · [[feedback_golf_owns_reaper]] · [[reference_fleet_git_contention_golf_pickup_2026_06_04]]
