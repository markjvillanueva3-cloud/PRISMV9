# Plan — `[FLEET-REAPER-MS1]` Phase 2 — close leftover bash tasks + RAM/CPU/GPU coordinator for the 6-chat fleet

## Context

The user is running 6 concurrent Claude chats on a 32 GB Windows box with an RTX 3080. Live host state at planning time:

- **Memory**: 97 % commit / 89 % physical — overcommitted, the fork-storm-prone harness's chronic state.
- **Process census**: 6 `claude.exe` (3.5 GB), 12 `node.exe` (4.0 GB), 9 `bash.exe` (82 MB). 3 of 6 claudes are pinned in `chat-slots.json` (alpha/bravo/charlie); 3 are unpinned.
- **GPU**: RTX 3080, **8.5 GB free of 10 GB, 3 % utilization** — sitting idle while commit pressure is critical.
- **Ollama**: daemon up (PID 32392) but only 88 MB resident — no model loaded.

The user asked two things, then directed me to pull this work from the paired roadmaps and weave in `/system-viz`, Obsidian, tribal knowledge, and forge slash commands:

1. **"Fix `/fleet-reaper` so it also closes leftover bash tasks."** Diagnostic: bash.exe processes running a `while true; do node fleet-reaper-sweep.mjs --once; sleep 300; done` Monitor loop have been alive 2.5 hours after the chat that spawned them ended. They have parent PID 19796 — a *still-alive* `claude.exe` that isn't pinned to any chat slot. The current classifier sees a live ancestor → `owned-by-alive` → never reaps. So the existing rule ("dead ancestor = orphan") misses every orphan whose harness lingered.

2. **"Upgrade fleet-reaper to better utilize ram, cpu and gpu together to improve claude cli performance when running 6 chats."** The right framing is not "kill more"; it's: under commit pressure, *use the GPU we already have* to shift work off Claude — combined with soft (reversible) RAM/CPU pressure response on idle-slot processes.

## Roadmap pairing (backend ↔ revenue)

- **Backend (canonical):** `H:/prism/PRISM-UNIFIED-ROADMAP-v2.md` (530 milestones, 133 complete).
- **Revenue (canonical):** `H:/prism/state/shared/specs/REVENUE-ROADMAP-v7.5.md` (current ship version; §R7 Master Post + Pay-tier, §R8 Wiring-Everything + SFC + Doc-Backflow, §R9 MS-CAM-MASTERY).
- **Pairing manifest:** `mcp-server/data/roadmap-index.json` v9.8.0 + `state/shared/MILESTONE_PROGRESS.{md,json}` (git-grounded delta) + `state/shared/BUILD_STATE.{md,json}` (wiring snapshot) + `state/shared/system-viz/system-graph.json` (visual binding, 154 k nodes).

**Where this work lands:**

- `FLEET-REAPER-MS0` is **shipped** (commit `307de0713`, 2026-05-14): U-FLEET-REAPER01 plus 9 artifacts. Phase 2/3 were *deferred*, no envelope opened yet.
- This plan opens **`FLEET-REAPER-MS1`** ("Resource-Coordinator Phase 2") — strictly additive over MS0; no MS0 surface is rewritten.
- **Revenue dependency** (§R7 + §R8 of v7.5): SFC + Master Post ship Week 9-10. Their schedule is bounded by 6-chat backend throughput — fork-storm + commit pressure stalls each chat ~5-15 minutes per /compact storm, multiplied by the 6 chats running concurrent unit-builds. The coordinator's job is to convert idle GPU + idle stale-slot RAM into throughput for *those* revenue units. Specifically, MS-WIRE-BACKEND (756 new actions in §R8) is hook-heavy and offloadable: more Ollama absorption directly compresses MS-WIRE-BACKEND wall-time.
- **Sibling milestones** (in_progress_real):
  - `CLEANUP-MS0` (59/73) — hygiene/process janitor; FLEET-REAPER-MS1 *uses* its memory-pressure cron (`scripts/system-health/03-memory-pressure-auto-relief.ps1`) as the outer escalation tier — does not duplicate it.
  - `COORD-MS0` (9/12) — coordination layer; FLEET-REAPER-MS1 hint file lives alongside `state/shared/coordination.db` semantics.
  - `INTEL-OLLAMA-OBSIDIAN-MS0` (80/92) — Ollama integration; FLEET-REAPER-MS1's Layer 3 is the *consumer* of `OllamaHookBridgeEngine` + `AISystemRouterEngine`, the missing routing-preference hint they didn't yet have.
- **Worktree:** per [[feedback_conflict_fork_rule]] the build forks to `H:/prism-fleet-reaper-ms1` to keep `cad-fusion-live-ms0` non-busy. Final merge: `git merge --ff-only` from the worktree into `cad-fusion-live-ms0`.

## Proposed milestone — `FLEET-REAPER-MS1` Phase 2 (5 units, 5 files modified, 0 created)

Each unit is a self-contained ship boundary. Per CLAUDE.md §PER-FILE SCRUTINY GATE every file dispatches 2 parallel reviewers immediately before the next file is written.

| Unit | Title | File(s) | Ships when |
|---|---|---|---|
| **U-PHASE2-BASH-CLASSIFIER** | leftover-bash-task classifier (closes the orig ask) | `.claude/helpers/process-slot-map.mjs` | classifier passes new tests + 3-of-3 scrutiny |
| **U-PHASE2-SOFT-RELIEF** | soft RAM/CPU pressure response | `scripts/fleet-reaper-sweep.mjs` (Layer 1 of 3) | relief functions ship + tests + audit JSONL extension |
| **U-PHASE2-GPU-PROBE** | nvidia-smi + Ollama state probes | `scripts/fleet-reaper-sweep.mjs` (Layer 2 of 3) | probes ship, fail-soft on missing tools |
| **U-PHASE2-OLLAMA-COORD** | coordinator decision + pre-warm + hint write | `scripts/fleet-reaper-sweep.mjs` (Layer 3 of 3) | hint file round-trip green |
| **U-PHASE2-HINT-CONSUMER** | `ollama-task-offloader.mjs` reads + applies hint | `.claude/hooks/ollama-task-offloader.mjs` | threshold delta verifiable via injected stat recorder |

Plus close-out: test extension (`fleet-reaper.test.mjs` → 66 → ≥100 cases), skill update (`fleet-reaper.md`), wiki extension (`knowledge/wiki/architecture/fleet-reaper.md` Phase 2 section + new `ollama-routing-hint.md`), 2-4 tribal tips, and the 4-surface close-out per [[feedback_roadmap_close_out]].

### What's reused — no new modules

| Existing surface | What we reuse |
|---|---|
| `scripts/fleet-reaper-sweep.mjs` — `readHostMemory()`, `resolvePowershell()`, `windowsKill()` pattern (temp `.ps1` + `execFileSync` + `SIGKILL` on timeout), `runSweep()`, `summarize()`, candidate ledger | Pressure gate, PowerShell discipline, sweep skeleton — extended in place |
| `.claude/helpers/process-slot-map.mjs` — `snapshotFleet()`, `classifyProcess()`, `slotPidMap`, ancestry walker | Slot attribution — extended with one new candidate class |
| `.claude/helpers/fleet-reaper.test.mjs` — injectable `enumerator` / `slotsFile` / `killer` / `readMemory` seams (816 lines, 66 vitest cases) | Test harness — extended; no new test file |
| `.claude/hooks/ollama-task-offloader.mjs` — `OFFLOADABLE_PATTERNS`, `CONFIDENCE_THRESHOLD = 0.80`, `INJECT_THRESHOLD = 0.90`, `loadRateLimits()`, `recordOllamaEvent()` | One-line read of new hint file + threshold delta application |
| `OllamaHookBridgeEngine` (singleton at `mcp-server/src/engines/OllamaHookBridgeEngine.ts`) — `query`, `status`, `isAvailable`, `getModelForHook` | Layer 3 status probe goes through the engine, not raw fetch, so a future config change picks us up |
| `AISystemRouterEngine.healthReport()` / `probe("ollama-codellama")` | Reuse the existing health surface — we don't double-probe |
| `mcp-server/data/state/ollama-offload-stats.json` v2.0.0 + `lib/ollama-stats.mjs` `recordOllamaEvent()` | Telemetry for hint applications + pre-warm fires (so `/ollama-offload-dashboard` already captures FLEET-REAPER-MS1 actions for free) |
| `state/shared/.janitor-kills.jsonl` | Audit trail — append soft-relief actions with new `reason` values (`soft-priority-demoted`, `soft-workingset-trimmed`, `ollama-prewarm-fired`, `ollama-hint-written`) |
| `chat-slots.json` slot-status semantics: alive (<2 min) · stale (2-10 min) · crashed (>10 min) | Reuse classification untouched; soft relief targets `stale`, full reap remains gated to `crashed` + dead-PID |
| `scripts/system-health/03-memory-pressure-auto-relief.ps1` 3-tier ladder (85/92/97) | FLEET-REAPER-MS1 sits *between* the 85 tier and the 92 tier — soft-first, kill-last |

### Forge / RGS / awareness tooling used during the build

Per the user's directive, the build sequence weaves in:

- `/forge-audit` — run **once** before opening the milestone envelope to baseline orphan-process count + memory-pressure log + Ollama offload stats. Run **once** after close-out to quantify delta (units of reclaimed MB, % offload rate change, leftover-bash-task reap count).
- `/system-viz` — open the live 3D map after each unit ships, confirm new sweep functions appear as nodes under L5 (`fleet-reaper-sweep`, `process-slot-map`) and the hint file appears as an L11 artifact node. Use `node scripts/system-viz-query.mjs roadmap-candidates` to check for ghost-node coverage.
- `/wiki-query fleet-reaper` — confirm the Phase 2 section lands in the wiki entry on close-out.
- `/master-index "leftover bash"` + `/master-index "ollama routing"` — establish that the master-index hit shape carries the new artifacts.
- `/dispatch-coverage` — verify no new dispatcher action is needed (Phase 2 ships only as scripts + a hook update, no dispatcher surface).
- `/rgs-sync --note "FLEET-REAPER-MS1 opening — see plan"` — post to chat-bus so peer chats don't open conflicting work.
- `/envelope-drift-fix` — on close-out, verify the new MS1 envelope's `status: complete` matches git reality.
- `/close-out-audit` — on close-out, verify no silent debt was left for sibling MS0 units (the audit is what produced the discovery that this work was needed; closing the loop is part of the doctrine).
- `/build-state` — before + after, to surface the wiring + frontend-merge delta.

### Tribal knowledge captures (added on close-out per CLAUDE.md WIKI PROTOCOL)

Tribal `.md` entries to add under `knowledge/wiki/code-tribal/`:

1. **`leftover-monitor-bash-pattern.md`** — the `while true; do …; sleep N; done` signature of a Bash-tool persistent Monitor that survives chat exit when the harness `claude.exe` lingers unpinned. Why the pre-MS1 classifier missed it.
2. **`gpu-absorb-threshold.md`** — empirical: when commit > 90 % and GPU free ≥ 2 GB, an Ollama pre-warm and routing-hint relieves more pressure faster than additional kills. Measured on the test box (97 % commit / 8.5 GB GPU free / 3 chats) — quantify on close-out.
3. **`soft-relief-age-floor.md`** — why 180 s is the right age floor for priority/trim: shorter than the 10-min crashed-slot threshold (so we relieve before reap), longer than the 45 s alive-floor (so we never demote a fresh helper).
4. **`routing-hint-ttl.md`** — why 5 min is the hint TTL: equal to the sweep interval, so each sweep is the canonical statement; a crashed sweep can't leave the fleet stuck in aggressive mode beyond one cycle.

Wiki entries under `knowledge/wiki/architecture/`:

- Extend `fleet-reaper.md` with a "## Phase 2 (FLEET-REAPER-MS1)" section documenting the 3 layers + the hint file contract + every new env knob.
- New `ollama-routing-hint.md` — single-page contract for `state/shared/.ollama-routing-hint.json` (shape, TTL semantics, producers, consumers, neutralization rule).

## Implementation — 5 files modified, 0 created

### File 1: `.claude/helpers/process-slot-map.mjs` — new candidate class `leftover-bash-task` (U-PHASE2-BASH-CLASSIFIER)

- Add `LEFTOVER_TASK_PATTERNS` regex array, scoped tight:
  - `/--monitor-loop\b/` (fleet-reaper's own Monitor signature)
  - `/while\s+(true|:)\s*;?\s*do\b[\s\S]{0,200}\bsleep\s+\d+/` (Bash-tool persistent loop, structural form — not substring)
  - `/\btail\s+-f\b[\s\S]{0,200}\bgrep\s+--line-buffered\b/` (Monitor-tool tail pattern from the Claude Code docs)
  - `/\binotifywait\s+-m\b/` (the only docs-recommended infinite watch)
- Add `LEFTOVER_AGE_MS_MIN = 15 * 60 * 1000` (15 min — over the existing `kill-after × interval` = 10 min default, so this is *additive* not racing).
- Extend `classifyProcess()`: BEFORE the existing "(2) Alive ancestor" `isHarnessName` branch, check: *is this bash/sh, does its cmdline match a `LEFTOVER_TASK_PATTERNS` entry, is its age ≥ `LEFTOVER_AGE_MS_MIN`, AND is every `claude.exe` in its ancestry chain unpinned (not in `slotPidMap` keys)?* If yes → return new class `leftover-bash-task` with `isCandidate: true`.
- "Unpinned" gate: a `claude.exe` ancestor whose PID is in `slotPidMap` keys is a *real* chat — leave it alone. Only the *orphan* claude.exe (alive but no slot record) class qualifies. This is the key insight from the live diagnostic.
- Update `isCandidate` predicate to include `leftover-bash-task` alongside `owned-by-crashed` and `unowned`.
- Export `LEFTOVER_TASK_PATTERNS` and `LEFTOVER_AGE_MS_MIN` for tests.

### File 2: `scripts/fleet-reaper-sweep.mjs` — three new layers + verdict (U-PHASE2-SOFT-RELIEF, U-PHASE2-GPU-PROBE, U-PHASE2-OLLAMA-COORD)

**Layer 1: soft RAM/CPU relief** (pure functions, injectable)

- `readSlotProcesses(snap)` — pure: index `snap.classified` by `ownerSlot` + `ownerStatus`. Returns `Map<slot, { pids, statuses, totalRssMb }>`.
- `selectSoftReliefTargets(snap, opts)` — pure: PIDs owned by **stale** slots (not alive, not crashed-with-dead-pid, not protected). Age ≥ `softReliefAgeSec`. Returns `{ priorityPids: number[], trimPids: number[] }`.
- `applyPriorityRelief(pids, { dryRun, ps = defaultPs })` — uses canonical PS pattern from `windowsKill()`. PowerShell body: `foreach ($id in @(…)) { try { (Get-Process -Id $id -ErrorAction Stop).PriorityClass = 'BelowNormal'; "ok $id" } catch { "err $id …" } }`. Returns `[{ pid, demoted, error }]`.
- `applyWorkingSetTrim(pids, { dryRun, ps = defaultPs })` — same pattern; body uses `[System.Diagnostics.Process]::GetProcessById($id).MinWorkingSet = -1; .MaxWorkingSet = -1` (.NET equivalent of `EmptyWorkingSet` — no P/Invoke). Returns `[{ pid, trimmed, error, rssReclaimedMb? }]` (re-stat after 200 ms PS sleep).
- Wired into `runSweep()`: if `underPressure && !isStatus && !disabled`, call selectors + appliers. Surface `result.softRelief = { priorityDemoted: N, workingSetTrimmed: N, freedMb: M, dryRun }`.
- POSIX fallback: `renice +5` only; skip trim (Linux equivalent is `madvise(MADV_DONTNEED)` and not worth the surface for a Windows-primary repo).
- Knobs: `PRISM_FLEET_REAPER_SOFT_RELIEF_DISABLE=1`, `PRISM_FLEET_REAPER_SOFT_RELIEF_AGE_SEC=N` (default 180), `PRISM_FLEET_REAPER_SOFT_RELIEF_PRESSURE_PCT=N` (default 90).
- Audit: append-only line to `state/shared/.janitor-kills.jsonl` with `reason: "soft-priority-demoted" | "soft-workingset-trimmed"` (mirrors `node-process-janitor.mjs:123`).

**Layer 2: GPU + Ollama probe** (pure-ish, injectable)

- `readGpuState({ runNvidiaSmi = defaultNvidiaSmi } = {})` — runs `nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu --format=csv,noheader,nounits` with 2 s timeout, parses one CSV line. Never throws — degrades to `{ available: false, reason }`. Returns `{ available, name, totalMb, usedMb, freeMb, utilizationPct }`.
- `readOllamaState({ fetchImpl = globalThis.fetch } = {})` — Promise. GET `${OLLAMA_URL}/api/tags` (model list) + `/api/ps` (loaded models). 2 s timeout via `AbortController`. Returns `{ reachable, models: string[], loaded: [{ model, sizeMb }] }`. Honors `OLLAMA_URL` env (matches `OllamaHookBridgeEngine` config knob) so a future Ollama port change picks us up without code edits.
- Knobs: `PRISM_FLEET_REAPER_GPU_DISABLE=1`, `OLLAMA_URL` (reused; default `http://127.0.0.1:11434`).

**Layer 3: Ollama coordinator decision + actions** (pure decision, side-effects injectable)

- `decideOllamaCoordination({ mem, gpu, ollama, slotCounts, cfg })` — pure. Returns `{ shouldPrewarm, prewarmModel, shouldHintOffload, thresholdDelta, reason, skipped }`. Conditions for `shouldPrewarm`: GPU free ≥ `gpuFreeMinMb` AND Ollama reachable AND preferred model NOT loaded AND `mem.usedPct ≥ prewarmPct`. Conditions for `shouldHintOffload`: same minus the not-loaded clause, plus ≥ 1 alive slot.
- `prewarmOllama(model, { fetchImpl, keepAlive })` — fire-and-forget POST `/api/generate` with `{ model, prompt: " ", keep_alive: "10m", stream: false }`. Promise rejection swallowed + logged to caveats. Never blocks the sweep loop.
- `writeRoutingHint(decision, { now, path })` — atomic temp+rename write to `state/shared/.ollama-routing-hint.json`:
  ```
  {
    "schemaVersion": 1,
    "mode": "aggressive-offload" | "auto" | "disabled",
    "thresholdDelta": -0.15,
    "validUntil": "<ISO-8601, now + hintTtlSec>",
    "writtenAt": "<ISO-8601>",
    "writtenBy": "fleet-reaper-sweep",
    "reason": "commit 97% · gpuFree 8549MB · ollama reachable · 3 alive slots",
    "snapshot": { "memUsedPct": 97, "gpuFreeMb": 8549, "loaded": ["qwen2.5-coder:7b"] }
  }
  ```
  TTL default 300 s. When `!shouldHintOffload`, write `{ mode: "auto", thresholdDelta: 0, … }` so a stale aggressive hint is *neutralized* rather than left lying.
- Knobs: `PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL` (default `qwen2.5-coder:7b`), `PRISM_FLEET_REAPER_OLLAMA_KEEP_ALIVE` (default `10m`), `PRISM_FLEET_REAPER_HINT_TTL_SEC` (300), `PRISM_FLEET_REAPER_GPU_FREE_MIN_MB` (2048), `PRISM_FLEET_REAPER_HINT_THRESHOLD_DELTA` (0.15), `PRISM_FLEET_REAPER_OLLAMA_COORD_DISABLE=1`.
- Telemetry: call `recordOllamaEvent` from `lib/ollama-stats.mjs` with `hook: "fleet-reaper-coordinator"`, `decision: "prewarm" | "hint" | "skip"`, so `/ollama-offload-dashboard` captures it for free.

**Verdict block + summary extensions**

- Extend `summarize()` and `monitorEvent()` with lines for:
  ```
  per-slot: alpha 1.1G · bravo 0.9G · charlie 1.0G · delta=stale 0.4G[trimmed]
  gpu:      RTX 3080  8.5G free / 10G  · 3% util
  ollama:   reachable · loaded: qwen2.5-coder:7b (4.1G)
  hint:     aggressive-offload Δ=-0.15 · TTL 5m · → ollama-task-offloader will absorb more
  prewarm:  fired qwen2.5-coder:7b (keep_alive=10m)
  ```
- `--json` output adds top-level keys `softRelief`, `gpu`, `ollama`, `coordinator` mirroring the same shape.

### File 3: `.claude/hooks/ollama-task-offloader.mjs` — read hint, adjust thresholds (U-PHASE2-HINT-CONSUMER)

- At the top of the hook (right after `loadRateLimits()`), call new `loadRoutingHint(now)`:
  - Read `state/shared/.ollama-routing-hint.json` if it exists; if `Date.now() > Date.parse(validUntil)` → ignore.
  - If `mode === "disabled"` → return defaults (no change).
  - If `mode === "aggressive-offload"` → apply `thresholdDelta` (clamp to `[-0.30, +0.30]`) to local `confidenceThreshold` + `injectThreshold` for this invocation.
- Existing pattern detection / rate limit unchanged.
- One additional `recordOllamaEvent` call when the hint flipped a decision (category `routing-hint-applied`).
- Fail-loud guard: corrupt JSON → ignore + emit one caveat line to stderr (mirrors `loadRateLimits()` style). Never throw.

### File 4: `.claude/helpers/fleet-reaper.test.mjs` — extend, hermetic

Add three new `describe()` blocks. All injection seams already exist; add new ones for the new appliers.

- **`describe("leftover-bash-task classifier")`** (≥ 10 cases): match + age + unpinned-claude → flagged; alive-pinned-claude → not flagged; stale-pinned-claude → `owned-by-stale` wins; regex false-positive guard for `echo "while true"`; cycle-safe ancestry; `tail -f` pattern; `--monitor-loop` direct match; drift guard on exported pattern array length.
- **`describe("soft RAM/CPU relief")`** (≥ 12 cases): selector returns only stale-slot pids; age floor honored; PS parser handles `ok PID` / `err PID msg`; PS timeout → all `demoted: false`; `dryRun` short-circuits; trim re-stat returns `rssReclaimedMb`; `runSweep` round-trip when under-pressure; protected processes never targeted; alive-slot processes never targeted at 99 % pressure; audit appender called; knob disables cleanly; shape stable when not under pressure (no `undefined`).
- **`describe("Ollama + GPU coordinator")`** (≥ 14 cases): `readGpuState` CSV parse; degraded when nvidia-smi missing; `readOllamaState` reachable + unreachable paths; `decideOllamaCoordination` truth table across mem/gpu/ollama/slot conditions; `prewarmOllama` POST shape; rejection swallowed; `writeRoutingHint` atomic write; neutralization when `!shouldHintOffload`; knob disables; `loadRoutingHint` round-trip with `writeRoutingHint`; expired-by-validUntil honored; corrupt-JSON tolerated; threshold-delta clamp; telemetry fires exactly once per decision.

Targeted run: `npx vitest run .claude/helpers/fleet-reaper.test.mjs` — must stay green and grow from 66 → ≥ 102 cases.

### File 5: `.claude/commands/fleet-reaper.md` — skill doc update

- Add `--no-coord` flag — skip Layer 3 (GPU/Ollama coord), keep bash reap + soft relief.
- Add `--no-relief` flag — skip Layer 1 (soft RAM/CPU).
- Update **Knobs** table with the 9 new env vars (4 soft-relief, 5 coordinator) alphabetically.
- Update the **Verdict block** sample to include the new lines.
- Update **When to use** with "Commit memory > 90 % and GPU is idle — fleet-reaper will route eligible work to Ollama via a 5-min hint."
- Update **When NOT to use** with the working-set-trim caveat.
- Companion surfaces list grows by one line: `state/shared/.ollama-routing-hint.json` — TTL'd hint read by `ollama-task-offloader.mjs`.

## Per-file scrutiny gate

After each of the 5 files, dispatch 2 parallel reviewer agents *in one message*:

| File | Agent A | Agent B |
|---|---|---|
| `process-slot-map.mjs` | `code-analyzer` — classifier correctness + regex safety + ancestry edge cases | `reviewer` — integration with `snapshotFleet` callers, naming, inline-constant check |
| `fleet-reaper-sweep.mjs` | `code-analyzer` — PS injection surface, never-throw discipline, never-block-monitor | `reviewer` — test coverage of new code paths, knob completeness, audit JSONL schema |
| `ollama-task-offloader.mjs` | `code-analyzer` — corrupt-hint guard, threshold-delta clamping, no extra IO on hot path | `reviewer` — round-trip wiring with hint file, telemetry shape |
| `fleet-reaper.test.mjs` | `test-review-agent` — real-value assertions, no stubs, hermetic injection | `reviewer` — coverage of failure modes (PS timeout, fetch reject, file corrupt) |
| `fleet-reaper.md` | `reviewer` — operator clarity, knob table accuracy, verdict-block honesty | `reviewer` — no orphaned references, companion list updated, all new flags documented |

Fix every P0+P1 finding before the next file. End-of-task 3-of-3 (Codex CLI + Claude A + Claude B) still runs at Stop on the full diff.

## Verification — end-to-end

1. **Static**: `npm run build:fast` from `mcp-server/` — no .ts changes, ensures no inadvertent breakage.
2. **Unit tests**: `npx vitest run .claude/helpers/fleet-reaper.test.mjs` — green, ≥ 36 new cases.
3. **Dry-run smoke**: `node scripts/fleet-reaper-sweep.mjs --dry-run --json` — verify new JSON keys (`softRelief`, `gpu`, `ollama`, `coordinator`).
4. **Status smoke**: `node scripts/fleet-reaper-sweep.mjs --status --json` — verify GPU + Ollama state surfaced in read-only mode.
5. **Hint round-trip**: under simulated pressure (set `PRISM_FLEET_REAPER_MEM_PRESSURE_PCT=10`), confirm `state/shared/.ollama-routing-hint.json` is written, then trigger `ollama-task-offloader.mjs` and observe threshold delta applied via injected stat recorder.
6. **Live bash reap**: after the build, restart the Monitor and let it sweep — the long-running bash from PID 34232's family should appear as `leftover-bash-task` with `willReap` flipping to true after the 15-min confirm window.
7. **Pre-warm verification**: `curl -s http://127.0.0.1:11434/api/ps` should show `qwen2.5-coder:7b` loaded after the coordinator fires under simulated pressure.
8. **Audit trail**: `tail state/shared/.janitor-kills.jsonl` shows the new reasons.
9. **Telemetry**: `node scripts/ollama-offload-dashboard.mjs --window=1h` shows `fleet-reaper-coordinator` hook with non-zero fire count.
10. **Forge audit delta**: rerun `/forge-audit` post-close-out — leftover-process count + Ollama offload rate must move in the right direction (down, up respectively).
11. **System-viz delta**: rerun `/system-viz` — new nodes for `decideOllamaCoordination`, `readGpuState`, `readOllamaState`, hint file appear; in-edges from `ollama-task-offloader.mjs` to the hint file appear.
12. **Roadmap surfaces (4-surface close-out per [[feedback_roadmap_close_out]]):** envelope `FLEET-REAPER-MS1.json` → `status: complete`; `mcp-server/data/roadmap-index.json` → milestone added + units recorded; regenerate `MILESTONE_PROGRESS.{md,json}` and `BUILD_STATE.{md,json}`; post chat-bus. One-command orchestrator: `node H:/prism/scripts/close-out-milestone.mjs --milestone FLEET-REAPER-MS1`.
13. **Tribal knowledge**: 4 new `.md` entries under `knowledge/wiki/code-tribal/` + `MEMORY.md` index lines added.
14. **Wiki**: `fleet-reaper.md` gains Phase 2 section; `ollama-routing-hint.md` opens new entry.

## Risk register

- **Pre-warming 4 GB of GPU model when GPU has 8.5 GB free is safe**; concurrent GPU consumer (game, video editor) can make pre-warm fail. Fire-and-forget swallows rejection; next sweep retries. No kill, no crash.
- **Working-set trim is reversible**: Windows re-pages on demand. Targeting only stale-slot processes (no heartbeat in 2-10 min) + protected-pattern exclusion bounds the surface.
- **Threshold delta on `ollama-task-offloader`**: clamped to `[-0.30, +0.30]` so a bad hint file can't push thresholds to 0 or 2. TTL'd at 300 s so a crashed sweep can't leave the fleet stuck in aggressive mode beyond one cycle.
- **Bash classifier false-positive**: regex requires *structural* form (`while true; do … sleep N`) not substring. A legitimate operator's terminal-rooted `while`-loop has `cmd.exe` ancestor → `owned-by-other-live`, NOT `leftover-bash-task`. The classifier specifically requires *unpinned* `claude.exe` in the chain.
- **Multi-host coexistence**: hint file at `state/shared/.ollama-routing-hint.json` is per-repo, not per-host. Different machines reading the same repo each get the hint — correct, since each has its own Ollama; nvidia-smi probes each host's own GPU.
- **System-viz binding currently stabilizing** (`MS-VIZ-ROADMAP-BIND` in flight on the backend-devtools-rgs6 roadmap, 103 binding checks failing). The new Phase 2 nodes will be marked `ghost` until that work lands — not a blocker; documented in close-out.
- **Shared-tree commit collision** (memory has 7 documented cases). Forking to `H:/prism-fleet-reaper-ms1` before the first commit prevents this.

## Files touched

- `H:/prism/.claude/helpers/process-slot-map.mjs` (extend)
- `H:/prism/scripts/fleet-reaper-sweep.mjs` (extend)
- `H:/prism/.claude/hooks/ollama-task-offloader.mjs` (extend — small)
- `H:/prism/.claude/helpers/fleet-reaper.test.mjs` (extend — 3 new describe blocks)
- `H:/prism/.claude/commands/fleet-reaper.md` (extend — args, knobs, verdict)

Plus, on close-out only (additive, not new code):

- `H:/prism/knowledge/wiki/architecture/fleet-reaper.md` (extend — Phase 2 section)
- `H:/prism/knowledge/wiki/architecture/ollama-routing-hint.md` (new — hint contract)
- `H:/prism/knowledge/wiki/code-tribal/{leftover-monitor-bash-pattern,gpu-absorb-threshold,soft-relief-age-floor,routing-hint-ttl}.md` (4 new tribal tips)
- `H:/prism/mcp-server/data/roadmap-index.json` (add FLEET-REAPER-MS1 + 5 units)
- `H:/prism/state/shared/MILESTONE_PROGRESS.{md,json}` (regenerate via close-out orchestrator)
- `H:/prism/state/shared/BUILD_STATE.{md,json}` (regenerate via close-out orchestrator)
- `H:/prism/MEMORY.md` (4 new index lines for the tribal tips)

No deletions. No commits in plan-mode scope.
