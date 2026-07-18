---
title: FLEET-REAPER-MS3 — chat-capacity upgrades
date: 2026-05-19
slot: charlie
chatId: claude-9dc5dad7
status: shipped
predecessor: fleet-reaper-ms2
---

# FLEET-REAPER-MS3 — chat-capacity upgrades (Units A–D)

Shipped 2026-05-19, slot charlie. Reframes the reaper from "kill more orphans" → "keep live chats at full capacity." Solves the failure mode where **13 live, non-orphaned chats** fight for the same CPU/RAM/disk (96% commit pressure with zero orphans → reaper has nothing to reap → every chat slow).

All 4 units **strictly additive** over MS0/MS1/MS2 + each carries its own kill switch + the fleet-wide `PRISM_FLEET_REAPER_DISABLE=1` master.

## Unit catalogue

### U-FR-MS3-D — reaper-self CPU priority guard (commit `97d60775ec`)

`os.setPriority(0, BELOW_NORMAL)` wraps `runSweep` entry → try/finally restores Normal on exit; `beforeExit`/`exit` listeners catch the `process.exit()` escape path. Honest scope (R12): Win32 `PROCESS_MODE_BACKGROUND_BEGIN` (which drops CPU + memory + I/O priority in one call) can only be set from within the process on its own handle via `SetPriorityClass(GetCurrentProcess(), 0x100000)` — Node has no native binding. v1 ships the closest portable equivalent (CPU-only drop). Future native ffi could close the I/O gap.

- Helper: `scripts/lib/reaper-self-io-priority.mjs` (~190 LOC, pure-injected)
- Tests: 14 cases incl. real-process oracle spawning child node + asserting `os.getPriority(0) === 10` mid-sweep + `=== 0` after end
- Knob: `PRISM_FR_SELF_BG_IO_DISABLE=1`

### U-FR-MS3-C — per-chat-tree compact advisory (commit `51b2d04a10`)

`evaluateChatTreeAdvisories(perTree, opts)` in `scripts/fleet-memory-monitor.mjs` — fires per-chat when a SINGLE tree exceeds threshold (default 2 GB) BEFORE system-wide critical, naming WHICH slot to `/compact`. Complementary to existing `critical-memory-compact-nudge` (which requires system-wide critical first).

**CLEAR-ON-DROP semantic**: chat emits advisory → drops below → re-bloats → fires fresh advisory immediately (reason `"drop-clear"`). Cooldown encoded in JSONL audit log at `state/shared/.fleet-memory-chat-advisories.jsonl`, 1 MB rotation.

- Tests: 16 cases + 45 regression PASS, incl. REAL-DATA E2E (4-sweep emit→cooldown-suppress→drop→re-emit on real tmpdir)
- Knobs: `PRISM_FM_CHAT_ADVISORY_DISABLE`, `PRISM_FM_CHAT_THRESHOLD_MB` (256..16384, default 2048), `PRISM_FM_CHAT_ADVISORY_COOLDOWN_SEC` (60..86400, default 1800)

### U-FR-MS3-A — live-chat priority boost on prompt (peer-absorbed in `aad2152f7f` + `0b4d868820`)

UserPromptSubmit hook walks `process.pid` → claude.exe ancestor → descendant tree → sets AboveNormal via wmic. Stop hook scans `state/shared/.active-chat-boost/<chatId>.json` and reverts expired boosts to Normal. **13 live chats × Normal priority** = Windows scheduler round-robins them equally with Chrome/Discord/Steam; bumping only the chat you typed in gives that chat an observable lift without starving the others (they're idle when not typed in).

**Anti-regression invariants** (pinned in tests):
- AR#1: NEVER above AboveNormal (`parsePriorityName` rejects High/Realtime/Idle)
- AR#2: NEVER on a non-Claude descendant (`walkClaudeTree` returns empty Set when anchor not in `CLAUDE_PROCESS_NAMES`)
- TTL hard-capped via `clampTtlSec` [60, 1800]; null/undefined → default 300

Files: 5 new (`.claude/helpers/claude-tree-priority.mjs`, `.claude/hooks/active-chat-priority-boost.mjs`, `.claude/hooks/active-chat-priority-decay.mjs`, 2 test suites) + `.claude/settings.json` wire (UserPromptSubmit 28→29, Stop 46→47).

- Tests: 29 cases PASS (17 helper + 12 hook orchestration). Live smoke confirms boost hook emits `{"continue":true}`.
- Knobs: `PRISM_FR_BOOST_DISABLE`, `PRISM_FR_BOOST_TTL_SEC` (60..1800, default 300), `PRISM_FR_BOOST_PRIORITY` (AboveNormal|Normal)

### U-FR-MS3-B — Tier-1.5 bg-app throttle (commits `8486d89344` + `9baacb056e`)

Pure helper `scripts/lib/bg-app-throttle.mjs` (peer-absorbed in `8486d89344`) wired into `runSweep` (commit `9baacb056e`) between Tier-1 soft-relief and Tier-2 serviceRestart. Under warn-band pressure (`usedPct >= memPressurePct`), drop top-N (default 3) non-Claude heavy processes (Chrome/Discord/Steam, sorted by RSS, ≥500MB) to BelowNormal. Hysteresis-restore at `memPressurePct - 5`.

**Exclusion list** (anti-regression #1, exhaustive): claude.exe, node.exe, git.exe, bash.exe, sh.exe, pwsh.exe, powershell.exe, python.exe, csrss.exe, winlogon.exe, services.exe, lsass.exe, svchost.exe, dwm.exe, explorer.exe, wininit.exe, system, idle, smss.exe, registry, memory compression + dynamic Claude-descendant rejection via procIndex walk + Realtime priority rejection + `C:\Windows\System32\` path rejection.

Stamp file at `state/shared/.fleet-reaper-bg-throttle.json` (1 MB cap → `.1` rotation), `alreadyThrottled` set prevents double-throttle without intervening restore.

- Tests: 20 cases PASS (exclusion list, RSS-sort/topN/minRss, hysteresis up/down, kill-switch, claude-descendant rejection, realtime/System32 rejection, NaN fail-safe, LEGACY PARITY)
- Knobs: `PRISM_FR_BG_THROTTLE_DISABLE`, `PRISM_FR_BG_THROTTLE_TOP_N` (1..10, default 3), `PRISM_FR_BG_THROTTLE_MIN_RSS_MB` (64..32768, default 500)

## Cross-unit invariants

1. **Reversibility-first** — every priority change has a paired revert path; every stamp file is consulted before any state mutation
2. **Kill-switch parity** — every unit honors `PRISM_FLEET_REAPER_DISABLE=1` AND its own per-unit knob
3. **No-Claude-kill** — none of these units ever kills a Claude process (A boosts, B excludes Claude, C advises, D self-throttles)
4. **Fail-soft outside Windows** — all PowerShell/wmic calls fail-soft on non-Windows
5. **Audit logs** — A appends to `.active-chat-boost/`, B appends to `.fleet-reaper-bg-throttle.json`, C appends to `.fleet-memory-chat-advisories.jsonl`, D is silent (no state change)

## Test summary

| Unit | Test file | Cases | Status |
|---|---|---|---|
| D | `scripts/__tests__/fleet-reaper-self-bg-io.test.mjs` | 14 | PASS |
| C | `scripts/__tests__/fleet-memory-monitor-chat-advisory.test.mjs` | 16 + 45 regression | PASS |
| A (helper) | `scripts/__tests__/claude-tree-priority.test.mjs` | 17 | PASS |
| A (hook) | `.claude/hooks/__tests__/active-chat-priority.test.mjs` | 12 | PASS |
| B | `scripts/__tests__/fleet-reaper-bg-throttle.test.mjs` | 20 | PASS |
| **Total** | 5 suites | **79 + 45 regression** | **PASS** |

Plus the 6-reaper-suite full-coverage run after wire: **116/116 PASS**.

## Doctrine pointers

- Reversibility → [[feedback_never_delete_only_disable]]
- Per-file scrutiny → CLAUDE.md §PER-FILE SCRUTINY GATE (2 reviewers per file before next; 4 units × ~2 reviewers each = 8 reviews, all PASS, 0 P0/P1)
- Slot-bound execution → [[slot-reclaim]] (charlie slot reserved by claude-9dc5dad7)
- Honest fail-soft (R12) → CLAUDE.md §CLAUDE.md RULES 5–12
- Shared-tree collisions → 3 of 5 file-groups absorbed by peer commits this session ([[reference_iter2_html_adopt_misattribution_2026_05_18]] class)

## Knob summary

| Knob | Default | Range | Purpose |
|---|---|---|---|
| `PRISM_FR_BOOST_DISABLE` | unset | 0/1 | Unit A kill switch |
| `PRISM_FR_BOOST_TTL_SEC` | 300 | 60..1800 | Unit A boost expiry |
| `PRISM_FR_BOOST_PRIORITY` | AboveNormal | AboveNormal\|Normal | Unit A target priority |
| `PRISM_FR_BG_THROTTLE_DISABLE` | unset | 0/1 | Unit B kill switch |
| `PRISM_FR_BG_THROTTLE_TOP_N` | 3 | 1..10 | Unit B candidates per sweep |
| `PRISM_FR_BG_THROTTLE_MIN_RSS_MB` | 500 | 64..32768 | Unit B RSS floor |
| `PRISM_FM_CHAT_ADVISORY_DISABLE` | unset | 0/1 | Unit C kill switch |
| `PRISM_FM_CHAT_THRESHOLD_MB` | 2048 | 256..16384 | Unit C per-chat threshold |
| `PRISM_FM_CHAT_ADVISORY_COOLDOWN_SEC` | 1800 | 60..86400 | Unit C advisory throttle |
| `PRISM_FR_SELF_BG_IO_DISABLE` | unset | 0/1 | Unit D kill switch |

## Commits

| Hash | Subject |
|---|---|
| `c30889550e` | [FLEET-REAPER-MS3]/U-FR-MS3-SPEC: 4-unit chat-capacity design |
| `5d410e09d6` | [FLEET-REAPER-MS3]/U-FR-MS3-SPEC-HTML: render HTML twin |
| `97d60775ec` | [FLEET-REAPER-MS3]/U-FR-MS3-D: reaper-self CPU priority guard |
| `51b2d04a10` | [FLEET-REAPER-MS3]/U-FR-MS3-C: per-chat-tree compact advisory |
| `aad2152f7f` | [DEV-TOOLS]/U-DVA01 (peer-absorbed 5 of Unit A files) |
| `0b4d868820` | [SLOT-COMPACT-SYNERGY-MS0]/U-WAVE5c-AUTO (peer-absorbed helper file) |
| `8486d89344` | [JULIETT-12CHAT-ALLOCATION-MS0]/U-MEMORY-COMPRESS-V2-DOC (peer-absorbed Unit B helper + tests) |
| `9baacb056e` | [FLEET-REAPER-MS3]/U-FR-MS3-B-WIRE: Tier-1.5 bg-throttle in runSweep |
