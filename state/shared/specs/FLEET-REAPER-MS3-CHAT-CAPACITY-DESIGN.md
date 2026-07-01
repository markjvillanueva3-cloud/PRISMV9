# FLEET-REAPER-MS3 — Chat-Capacity Upgrades (Units A–D)

**Date**: 2026-05-19
**Author**: claude-9dc5dad7 (slot charlie)
**Status**: Spec — buildable
**Track**: INFRA-FLEET-HYGIENE
**Predecessors**: FLEET-REAPER-MS0/MS1/MS2 (shipped)
**Successors**: none yet
**Reference doctrine**: [`knowledge/wiki/architecture/fleet-reaper.md`](../../../knowledge/wiki/architecture/fleet-reaper.md), [[reference_fleet_reaper_ms1]], [[reference_fleet_memory_monitor_2026_05_16]], [[reference_fleet_reaper_ms2_2026_05_18]]

## Problem statement

The fleet-reaper today kills *orphans of crashed chats* and applies *soft relief on stale-slot processes*. It does nothing for the case where the user has **13 live, non-orphaned chats** all fighting for the same CPU / RAM / disk — which is the actual everyday failure mode on this host (96% commit pressure with zero orphans). The reaper has nothing to reap, yet every chat is slow.

**Goal**: keep live chats operating as close to full capacity as possible by (a) elevating the *active* chat's CPU share, (b) recovering RAM/CPU from non-Claude apps under pressure before any kill, (c) telling the *largest* chat to self-compact proactively, and (d) keeping the reaper's own sweep cost off Claude's critical path.

All four units are **strictly additive** over MS2. Each has a kill switch (`PRISM_FLEET_REAPER_*_DISABLE=1`) and degrades cleanly to current behavior when off.

---

## Unit catalogue

### U-FR-MS3-A — Live-chat priority boost on prompt

**File targets** (4 new + 1 settings.json edit):
- `.claude/hooks/active-chat-priority-boost.mjs` — UserPromptSubmit hook
- `.claude/helpers/claude-tree-priority.mjs` — pure helper: walk PID tree, set PriorityClass
- `.claude/hooks/active-chat-priority-decay.mjs` — Stop hook: revert chats whose boost expired
- `scripts/__tests__/claude-tree-priority.test.mjs` — node:test suite (≥15 cases)
- `.claude/settings.json` — wire both hooks (auto-mirror to H: via c-to-h-mirror)

**What it does**:
1. On every `UserPromptSubmit`, find this chat's `claude.exe` ancestor via `process.ppid` walk → reach the stable `claude.exe` per FLEET-REAPER-MS0 ancestry logic
2. Walk its descendant tree (claude.exe + every node.exe child) and set `PriorityClass=AboveNormal` via `wmic process where ProcessId=<pid> CALL setpriority 32768`
3. Stamp `state/shared/.active-chat-boost/<chatId>.json` with `{boostedAt, expiresAt, pids[]}` (5-min TTL, knob `PRISM_FR_BOOST_TTL_SEC`)
4. Stop hook scans the stamp dir on every Stop; for each entry past `expiresAt`, revert PIDs to `Normal`

**Why this matters**: 13 live chats × `Normal` priority means the Windows scheduler round-robins them with equal weight against Chrome/Discord/Steam/etc. Bumping ONLY the chat you typed in to `AboveNormal` for 5 min gives that chat a measurable interactive responsiveness lift without starving the others (they're idle when you're not typing in them).

**Anti-regression rules**:
- NEVER set above `AboveNormal` (above that affects system stability)
- NEVER set on a non-Claude descendant — walk MUST verify ancestor is `claude.exe`
- TTL is hard-capped at 30 min (knob clamp)
- If `claude.exe` PID can't be resolved (resolver miss, ETW unavailable), no-op silently
- Failure to set priority on any PID logs but doesn't abort

**Acceptance**:
- Hook returns within 200 ms on a 13-chat fleet (measure via `--bench`)
- ≥15 unit tests: ancestor walk, TTL expiry, double-boost dedup, missing PID, non-Claude rejection, multi-chat isolation, hard-cap TTL, env-disable, race on simultaneous Stop+Submit, malformed stamp, missing stamp dir, Windows-only guard, dry-run mode, audit log append, idempotent revert
- E2E: spawn a fake claude.exe + node child, fire prompt event, assert priority on both; fire Stop with expired stamp, assert reverted

**Knobs**: `PRISM_FR_BOOST_DISABLE=1` · `PRISM_FR_BOOST_TTL_SEC=N` (default 300, clamp 60..1800) · `PRISM_FR_BOOST_PRIORITY=AboveNormal` (allow only AboveNormal|Normal — High explicitly forbidden)

**LOC estimate**: ~120 total (~60 helper + ~30 boost hook + ~20 decay hook + tests separate)

---

### U-FR-MS3-B — Tier-1.5 background-app throttling before reap

**File targets** (1 edit + 1 new test):
- `scripts/fleet-reaper-sweep.mjs` — new `applyBackgroundAppThrottle()` between soft-relief (Tier-1) and `serviceRestartAction` (Tier-2)
- `scripts/__tests__/fleet-reaper-bg-throttle.test.mjs` — node:test (≥18 cases)

**What it does**:
1. When `usedPct ≥ memPressurePct` (90% — the warn band), but BEFORE any kill candidate decision:
2. Enumerate non-Claude trees (exclude `claude.exe` + descendants of any `claude.exe`)
3. Sort by RSS descending; pick top 3 (or all over 500 MB, whichever fewer)
4. For each: drop to `BelowNormal` priority, trim working set (same call pattern as MS1 soft-relief)
5. Stamp `state/shared/.fleet-reaper-bg-throttle.json` recording which PIDs we touched
6. When pressure drops back below `memPressurePct - 5` (hysteresis): walk the stamp, revert each PID to `Normal`, clear stamp

**Excluded process names** (never touch):
- `claude.exe`, `node.exe`, `git.exe`, `bash.exe`, `pwsh.exe`, `powershell.exe`, `python.exe`
- `csrss.exe`, `winlogon.exe`, `services.exe`, `lsass.exe`, `svchost.exe`, `dwm.exe`, `explorer.exe`, `wininit.exe`, `system`, `idle`
- Anything under `C:\Windows\System32\` (defensive)
- Anything currently set to `Realtime` priority (audio/RT-critical)

**Why this matters**: under memory squeeze, today the reaper either has nothing to do (no orphans) or kills (irreversible). Throttling Chrome/Discord/Steam to `BelowNormal` for the duration of the squeeze is **reversible, advisory-shaped, and immediately effective** — those apps don't notice (UI-thread starvation on idle apps is invisible) and Claude gets the cycles.

**Anti-regression rules**:
- The exclusion list is exhaustive — any non-listed system process gets throttled (preferred over false-positive exclusion)
- Hysteresis is asymmetric (drop at 90, restore at 85) — prevents flap
- Stamp file size capped at 1 MB; if exceeded, restore all + reset
- `PRISM_FR_BG_THROTTLE_DISABLE=1` reverts to no-op
- Never apply to a PID more than once without restoring first

**Acceptance**:
- ≥18 unit tests: exclusion list completeness, RSS sort correctness, top-N cap, hysteresis up/down, claude-descendant rejection, system-process rejection, stamp file rotation, restore-on-disable, idempotent throttle, multi-sweep stability, Win32 priority-class mapping, fail-soft on `wmic` failure, dry-run mode, age floor (don't throttle a 5-second-old process), already-throttled detection, restore-orphan-PIDs (process died mid-throttle), pressure-drop-restores-all path, knob clamping
- Real-data E2E: spawn 3 fake "heavy" processes, simulate pressure, assert throttled; simulate pressure drop, assert restored

**Knobs**: `PRISM_FR_BG_THROTTLE_DISABLE=1` · `PRISM_FR_BG_THROTTLE_TOP_N=N` (default 3, clamp 1..10) · `PRISM_FR_BG_THROTTLE_MIN_RSS_MB=N` (default 500) · `PRISM_FR_BG_THROTTLE_RESTORE_PCT=N` (default `mem_pressure - 5`, computed)

**LOC estimate**: ~180 (~120 in sweep + ~60 helper if extracted)

---

### U-FR-MS3-C — Per-chat-tree proactive compact advisory

**File targets** (1 edit + 1 new test):
- `scripts/fleet-memory-monitor.mjs` — new `evaluateChatTreeAdvisories()` after existing `attributeProcesses` step
- `scripts/__tests__/fleet-memory-monitor-chat-advisory.test.mjs` — node:test (≥12 cases)

**What it does**:
1. After fleet-memory-monitor has attributed processes to claude.exe trees (already done)
2. For each tree where `RSS_MB > PER_CHAT_THRESHOLD` (default 2048):
3. Resolve the tree's chat slot via `chat-slots.json` reverse-lookup (matches MS1 fleet-memory-monitor's existing slot-label overlay logic)
4. Post a one-line advisory to `state/shared/AGENT_CHAT.jsonl`:
   ```json
   {"ts":"...","from":"fleet-memory-monitor","to":"<slot>","kind":"advisory","subject":"per-chat memory threshold","body":"This chat's claude.exe tree is at <RSS_GB> GB (threshold 2 GB). Consider /compact to reclaim RAM before fleet-wide critical."}
   ```
5. Throttle: at most one advisory per `(slot, condition)` per `PRISM_FM_CHAT_ADVISORY_COOLDOWN_SEC` (default 1800 = 30 min)
6. Track in `state/shared/.fleet-memory-chat-advisories.jsonl` for cooldown enforcement

**Difference from existing `critical-memory-compact-nudge.mjs`**: that hook only fires when fleet-memory-monitor has *already* declared system-wide critical. This unit fires per-chat *before* system-wide critical, naming WHICH chat. The two are complementary, not redundant.

**Anti-regression rules**:
- Never advise the slot whose chat is currently running the prompt (resolved via UserPromptSubmit context if available — gated, not load-bearing)
- Tree-with-no-slot-label gets advised as `tree-<PID>` (mirrors MS1 graceful degradation)
- Cooldown stamps are JSONL, append-only, capped at 1 MB → archive-and-rotate
- A chat that JUST received an advisory and then drops below threshold gets the cooldown cleared on next sweep (so re-bloating fires again)

**Acceptance**:
- ≥12 unit tests: threshold computation, cooldown enforcement, cooldown clear on threshold drop, multi-tree iteration, slot-label resolution, tree-with-no-slot fallback, advisory JSONL append, rotation at 1 MB, knob disable, advisory body format (deterministic), per-(slot,condition) dedup, env-clamp
- Real-data E2E: feed a synthetic tree map with one tree over threshold; assert advisory appended; advance cooldown; assert second advisory NOT appended; drop tree under threshold; advance back over; assert third advisory appended

**Knobs**: `PRISM_FM_CHAT_ADVISORY_DISABLE=1` · `PRISM_FM_CHAT_THRESHOLD_MB=N` (default 2048, clamp 256..16384) · `PRISM_FM_CHAT_ADVISORY_COOLDOWN_SEC=N` (default 1800, clamp 60..86400)

**LOC estimate**: ~80 (~50 evaluator + ~30 cooldown helper)

---

### U-FR-MS3-D — Reaper-self background-IO during sweep

**File targets** (1 edit + 1 new test):
- `scripts/fleet-reaper-sweep.mjs` — wrap the enum PowerShell subprocess spawn in `process-slot-map.mjs` AND the runSweep entry with `PROCESS_MODE_BACKGROUND_BEGIN`
- `scripts/__tests__/fleet-reaper-self-bg-io.test.mjs` — node:test (≥10 cases)

**What it does**:
1. At `runSweep` entry: spawn a child Node call to `wmic process where ProcessId=<own pid> CALL setpriority` setting `PROCESS_MODE_BACKGROUND_BEGIN` (0x100000). This drops the reaper process AND its file-I/O priority to `LowMemoryAndIO` for the duration of the sweep.
2. At `runSweep` exit (try/finally): revert via `PROCESS_MODE_BACKGROUND_END` (0x200000)
3. Additionally: any `child_process.spawnSync('powershell', ...)` calls (the enum forks) use `priority: 'belownormal'` and `stdio: ['ignore','pipe','pipe']` (already done in MS2 enum cache, verify still present)
4. If `wmic` fails or this isn't Windows, fail-soft no-op (Linux/macOS use `ioprio_set` syscall — out of scope for v1)

**Why this matters**: a 30-second sweep currently competes equally with claude.exe for the disk-queue. On the user's memory-pressured host (`H:` drive carrying both PRISM AND user data), this is observable as a brief stall every 5 min. Background-IO drops the reaper to ~0 disk-queue impact for the same throughput (slightly slower wall-clock for the reaper, invisible to Claude).

**Anti-regression rules**:
- `PROCESS_MODE_BACKGROUND_END` MUST always fire (try/finally), even on sweep throw
- A sweep that exits via `process.exit()` (Tier-1 ballast release exit) still triggers the END via `process.on('beforeExit')`
- The wrapper is a no-op on non-Windows (Mac/Linux dev contributors run tests but never run the reaper for real)
- A failed BEGIN doesn't abort the sweep — log + continue

**Acceptance**:
- ≥10 unit tests: BEGIN/END wmic command composition, try/finally invariant, exit hook coverage, Win32-only guard, no-op on `wmic` missing, idempotent BEGIN, idempotent END, dry-run mode skips entirely, knob disable, env-platform skip-on-non-Win
- Real-process oracle: run an actual sweep with `--bench`, assert the process's `IO Priority` reads as `Low` mid-sweep (via `Get-WmiObject Win32_Process | Select IOPriority`)

**Knobs**: `PRISM_FR_SELF_BG_IO_DISABLE=1` (default off — feature on)

**LOC estimate**: ~30 (mostly the wrapper + tests)

---

## Cross-unit invariants

1. **Reversibility-first** — every priority change has a paired revert path; every stamp file is consulted before any state mutation
2. **Kill-switch parity** — every unit honors `PRISM_FR_DISABLE=1` (the existing master kill switch) as well as its own per-unit knob
3. **No-Claude-kill** — none of these units ever kills a Claude process (A boosts, B excludes, C advises, D self-throttles)
4. **Read-only outside Windows** — all PowerShell / wmic calls fail-soft on non-Windows; the reaper is single-platform
5. **Audit logs** — A and B append to `state/shared/.fleet-reaper-actions.jsonl` (existing MS1 file); C appends to its own dedicated cooldown ledger; D is silent (no state change)

## Build order recommendation

Smallest first (build confidence + earliest payoff):

1. **D** (~30 LOC, ~10 tests) — pure improvement, no cross-unit dependency, easy 3-of-3 pass
2. **C** (~80 LOC, ~12 tests) — standalone, touches only fleet-memory-monitor, independent of reaper
3. **A** (~120 LOC, ~15 tests) — net-new hooks, settings.json wire, no reaper changes
4. **B** (~180 LOC, ~18 tests) — biggest impact + biggest blast radius (touches sweep core); land last after the small wins build the test harness

## Test infrastructure

All new tests use `node:test` (NOT vitest) — matches MS2 pattern, avoids the vitest harness pre-existing issues documented in MS1.

Each test file MUST include:
- A real-process E2E oracle (per "pure-core + injected readers MUST ship one real-data E2E" lesson from MS1 / U-INTEG-FIX-P0)
- A regression-guard test pinning the legacy (knob-disabled) path to byte-identical pre-MS3 behavior

## Doctrine references

- Reversibility → [[feedback_never_delete_only_disable]]
- Multi-file per-file scrutiny → `CLAUDE.md §PER-FILE SCRUTINY GATE` (2 reviewers per file, before next)
- 3-of-3 Stop gate → `CLAUDE.md §SCRUTINY GATE`
- Honest fail-soft → R12 (CLAUDE.md §CLAUDE.md RULES 5–12)
- "Hermetic fakes don't prove production wiring" → MS1 / U-INTEG-FIX-P0 lesson
- Slot-bound execution → `/checkin-charlie /loop FLEET-REAPER-MS3` (slot reserved by claude-9dc5dad7)

## Knob summary (one place)

| Knob | Default | Range | Purpose |
|---|---|---|---|
| `PRISM_FR_BOOST_DISABLE` | unset | 0/1 | Unit A kill switch |
| `PRISM_FR_BOOST_TTL_SEC` | 300 | 60..1800 | Unit A boost expiry |
| `PRISM_FR_BOOST_PRIORITY` | AboveNormal | AboveNormal\|Normal | Unit A target priority |
| `PRISM_FR_BG_THROTTLE_DISABLE` | unset | 0/1 | Unit B kill switch |
| `PRISM_FR_BG_THROTTLE_TOP_N` | 3 | 1..10 | Unit B candidates per sweep |
| `PRISM_FR_BG_THROTTLE_MIN_RSS_MB` | 500 | 64..32768 | Unit B floor |
| `PRISM_FM_CHAT_ADVISORY_DISABLE` | unset | 0/1 | Unit C kill switch |
| `PRISM_FM_CHAT_THRESHOLD_MB` | 2048 | 256..16384 | Unit C per-chat threshold |
| `PRISM_FM_CHAT_ADVISORY_COOLDOWN_SEC` | 1800 | 60..86400 | Unit C advisory throttle |
| `PRISM_FR_SELF_BG_IO_DISABLE` | unset | 0/1 | Unit D kill switch |

---

## How to execute this milestone

A fresh slot-pinned session picks it up via:

```
/checkin-charlie /loop work FLEET-REAPER-MS3 units D, C, A, B in that order per the spec at state/shared/specs/FLEET-REAPER-MS3-CHAT-CAPACITY-DESIGN.md
```

The autonomous loop will: pick each unit → build → per-file 2-reviewer scrutiny → commit `[FLEET-REAPER-MS3]/U-FR-MS3-<X>: <title>` → next unit → 3-of-3 Stop gate at end.

Expected total: 4 commits, ~410 LOC of code + ~600 LOC of tests, ~55 test cases added, ~6 reviewer agent spawns per unit × 4 units = ~24 agent spawns, 3 final 3-of-3 reviewers. Realistic single-session execution if context is fresh; otherwise split D+C in session 1, A+B in session 2.
