---
slot: golf
topic: fleet-reaper-followups
chatId: claude-b23a56ef
host: MARKV
writtenAt: 2026-05-18
written_by: claude-b23a56ef (golf)
source: emergency-close
context_at_close: 1.56M tokens (over 1M hard cap)
loop_state: closed-by-context-pressure
---

## RESUME

Pick up FLEET-REAPER + PRISM-WIDE efficiency brainstorm. MS2 shipped (4 commits, 152/152 tests). 8 system perf fixes applied. Next session: ship S-tier items below; do NOT auto-ship — operator-gate each unit.

## What shipped this session

- **MS2/U-FR-S2** (`b8b4a5ea78`) — enumeration cache sidecar, 60s TTL, per-host suffix, atomic write, ~70% Get-CimInstance cost cut. 56 node:test.
- **MS2/U-FR-S3** (`7be1f77fab`) — cross-PC host filter on `mapPidsToSlots()`. Prevents PID-reuse-across-hosts false attribution. 12 tests.
- **MS2 doc** (`d9211972fa`) — wiki + memory + CLAUDE.md pointer.
- **MS2/U-FR-T1+T2** (`f5906d3fa8`) — phantom-advise filter (`existingContainers` opt-in API at runSweep boundary) + crash-caveat rollup (0/1/2+ formats). 18 tests.
- **8 system tunings**: page-file=AutomaticManaged, DisableLastAccess, PageCombining, VisualFX=Performance, NVIDIA PowerMizer=P0, ~/.wslconfig 6GB cap, Docker AutoStart=True, prism-ollama recreated with FA2+24h+parallel=4+q8 KV.
- **Reaper task** re-registered as SYSTEM principal (was S4U/Limited).
- **6 reaper env vars** set Machine-scope.

## QUEUED — ship next session (operator-gated)

### S-tier (cheap, high-leverage)
1. **`audit-hook-fire-rank.mjs` + unwire dead hooks** — 500/510 hooks never fire ([[reference_dev_tools_audit_meta_scripts_2026_05_17]]). Preserve-disabled not delete.
2. **regen-viz fingerprint extension** — include 5 new aug sources (docustrata, priority-queue, misc-tasks, feature-gap, bridge-synergy) so more commits skip the ~8min chain.
3. **master-index BM25 200MB cap fix** (juliett F1) — streaming reader OR fall back to 20K-node architecture-only graph.
4. **Wiki embedding refresh cooldown** — pin to git pre-push + 1h stamp.

### A-tier (next session)
5. **Reaper T3 — telemetry aggregator + `/fleet-reaper-status` skill.** Reads `.fleet-reaper-actions.jsonl` + cache sidecars; renders sweep duration, reap by class, cache hit-rate, ballast/soft-relief counts. ~150 LOC.
6. **Reaper T4 — NIM-aware GPU coordinator.** Layer 2 reads nvidia-smi; add NIM `/v1/models` probe; gate `prewarmOllama` on `nim_loaded===0`. Stops VRAM thrash on RTX 3080 10GB.
7. **Reaper T5 — ballast replenishment.** Currently one-shot per process; add cooldown re-arm via setTimeout 5min, bounded by `--monitor-loop` lifetime.
8. **Engine-orphan auto-wire** — top-30 unwired engines by inbound graph degree, parallel wiring-review-agent pass.

### B-tier (plan first)
9. MCP dispatcher P95 latency probe (wrap-once `dispatch` shim → JSONL).
10. Reaper T6 — cross-PC pressure broadcast via `.fleet-pressure-<host>.jsonl`.
11. CLAUDE.md collapse live-apply (U-OBF-F2 tool shipped, deferred — peer-locked).

### Reaper-specific further
- Adaptive sweep interval (90s under critical, 600s under clean).
- Slot auto-reclaim on terminal-window-id miss.
- Sweep-ID traceability (UUID linking kills.jsonl ↔ actions.jsonl).
- Per-chat-tree EmptyWorkingSet targeting (only the named biggest tree).

### Reversed (R12)
- ~~U-FR-S1 per-chat Stop-hook throttle~~ — global 45s stamp already optimal.
- ~~U-FR-A4 per-host WMI Filter~~ — ROI marginal post-S2 cache.

## Operator follow-ups (NOT done this session)

- **Reboot** — unlocks page-file scaling, applies VisualFX fully, exercises Docker auto-start chain. Highest single perf lever.
- **Windows Search index exclusion** for `H:/PRISM` — GUI via `control srchadmin.dll`.
- **Git-tree pack/prune** — peer chat `5d30cbb7` ended at iter 5/8 awaiting consent on 41 GiB loose-objects sweep. Destructive — needs explicit OK.

## Why loop closed here (R12 honesty)

- Context at 1.56M tokens, >1M hard cap. PowerShell tool already OOM'd (exit 82).
- Continuing the loop at this pressure = guaranteed crash mid-write = corrupted partial commits.
- Closing deliberately + dumping the punch list to handoff is the safe play.
- Reaper Monitor (task `bnz5dz80o`) is running — fleet safety net intact.
- 12-chat fleet should keep running; the ms2 ship is durable.

## Verify-before-trust

- `git -C H:/prism log --oneline -6 | grep FLEET-REAPER` → 4 MS2 commits present.
- `Get-ScheduledTask 'PRISM Fleet Reaper'` → Principal.UserId = `SYSTEM`.
- `node --test H:/prism/scripts/__tests__/fleet-reaper-{cache,host-filter,phantom-advise,service-restart,hunt,tier,ballast}.test.mjs` → 152/152.
- Memory: `[[reference_fleet_reaper_ms2_2026_05_18]]` is the canonical narrative.
