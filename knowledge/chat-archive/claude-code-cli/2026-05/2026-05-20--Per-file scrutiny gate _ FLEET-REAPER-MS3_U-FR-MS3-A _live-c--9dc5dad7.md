---
type: "chat-session"
source: "claude-code-cli"
session_id: "9dc5dad7-e869-411c-85c2-6ec48aff4a2c"
title: "Per-file scrutiny gate — FLEET-REAPER-MS3/U-FR-MS3-A (live-chat priority boost o"
date: "2026-05-20"
first_ts: "2026-05-20T02:47:23.187Z"
last_ts: "2026-05-20T02:49:08.424Z"
cwd: "H:\\PRISM"
messages: 15
user_msgs: 7
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/9dc5dad7-e869-411c-85c2-6ec48aff4a2c/subagents/agent-a81148889a5e2ab0b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Per-file scrutiny gate — FLEET-REAPER-MS3/U-FR-MS3-A (live-chat priority boost o

> **claude-code-cli** | 2026-05-20 | 15 msgs (7 user / 8 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/9dc5dad7-e869-411c-85c2-6ec48aff4a2c/subagents/agent-a81148889a5e2ab0b.jsonl`

## Transcript

### User | 2026-05-20T02:47:23.187Z

Per-file scrutiny gate — FLEET-REAPER-MS3/U-FR-MS3-A (live-chat priority boost on prompt).

Five files (under H:/PRISM):
1. .claude/helpers/claude-tree-priority.mjs (NEW, ~270 LOC) — pure-injected helper: parsePriorityName/winPriorityValue/clampTtlSec/findClaudeAncestor/walkClaudeTree/setPriorityForPids/enumerateProcessIndex
2. .claude/hooks/active-chat-priority-boost.mjs (NEW, ~135 LOC) — UserPromptSubmit hook, tier T3
3. .claude/hooks/active-chat-priority-decay.mjs (NEW, ~125 LOC) — Stop hook, tier T3
4. scripts/__tests__/claude-tree-priority.test.mjs (NEW, 17 cases)
5. .claude/hooks/__tests__/active-chat-priority.test.mjs (NEW, 12 cases — boost+decay orchestration)
6. scripts/wire-active-chat-priority-hooks.mjs (NEW one-shot wire-up; already ran — 28→29 UserPromptSubmit, 46→47 Stop wired in C:/Users/wompu/.claude/settings.json and mirrored to H:)

Test results: 59 tests PASS across all U-FR-MS3 helper+hook+integration suites.

Hard requirements per spec at state/shared/specs/FLEET-REAPER-MS3-CHAT-CAPACITY-DESIGN.md §U-FR-MS3-A:
- On UserPromptSubmit: find this chat's claude.exe ancestor → walk descendants → set AboveNormal via wmic
- Stamp file under state/shared/.active-chat-boost/<chatId>.json (5-min TTL via PRISM_FR_BOOST_TTL_SEC, clamp 60..1800)
- Stop hook scans stamp dir, reverts expired boosts to Normal
- NEVER above AboveNormal (anti-regression #1) — parsePriorityName rejects High/Realtime/Idle
- NEVER on non-Claude descendant (anti-regression #2) — walkClaudeTree REJECTS non-Claude anchor (returns empty Set)
- TTL hard-capped 60..1800 sec via clampTtlSec
- Missing claude.exe ancestor → silent no-op
- Per-pid setPriority failure logged but doesn't abort

Knobs: PRISM_FR_BOOST_DISABLE=1 · PRISM_FR_BOOST_TTL_SEC (60..1800, default 300) · PRISM_FR_BOOST_PRIORITY (AboveNormal|Normal)

Verify:
- claude-tree-priority.mjs is genuinely pure-injected (env/platform/execFile/timeoutMs)
- Both anti-regressions enforced — read the test cases that pin them
- Boost hook
... [+396 chars truncated]

### Assistant | 2026-05-20T02:47:38.780Z

I'll review the five files for U-FR-MS3-A.

### Assistant | 2026-05-20T02:47:39.492Z

[tool_use: Read]

### User | 2026-05-20T02:47:44.498Z

[tool_result] 1	/**
2	 * claude-tree-priority.mjs — pure-injected helper for FLEET-REAPER-MS3/U-FR-MS3-A.
3	 *
4	 * Walk a process tree rooted at a claude.exe and set its priority class so the
5	 * "active" chat (the one the user just typed in) gets a brief CPU lift over
6	 * the idle siblings. Strictly capped at AboveNormal (Above-Normal is the
7	 * highest safe class — High and Realtime affect scheduler stabi
... [+11214 chars truncated]

### Assistant | 2026-05-20T02:47:49.257Z

[tool_use: Read]

### User | 2026-05-20T02:47:51.618Z

[tool_result] read-once-guard: 'H:\PRISM\.claude\hooks\active-chat-priority-boost.mjs' was already read 8s ago in this session and is unchanged (mtime 1779244763537). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0
... [+1 chars truncated]

### Assistant | 2026-05-20T02:47:55.509Z

[tool_use: Bash]

### User | 2026-05-20T02:48:01.768Z

[tool_result] #!/usr/bin/env node
// tier: T3 (observer — never blocks the prompt; only advisory + side-effect on host process priority)
/**
 * active-chat-priority-boost.mjs — UserPromptSubmit hook for FLEET-REAPER-MS3/U-FR-MS3-A.
 *
 * On every prompt submission, lift the active chat's claude.exe tree to
 * AboveNormal priority for 5 minutes (knob PRISM_FR_BOOST_TTL_SEC, clamp
 * 60..1800). Stamp file lets th
... [+5365 chars truncated]

### Assistant | 2026-05-20T02:48:05.943Z

[tool_use: Bash]

### User | 2026-05-20T02:48:13.066Z

[tool_result] #!/usr/bin/env node
// tier: T3 (observer — never blocks Stop; scans expired stamps + reverts priority)
/**
 * active-chat-priority-decay.mjs — Stop hook for FLEET-REAPER-MS3/U-FR-MS3-A.
 *
 * Scans `state/shared/.active-chat-boost/*.json` for stamps past their
 * `expiresAt` and reverts those PIDs to Normal priority. Idempotent —
 * missing PIDs are a no-op, and the stamp is removed after a succe
... [+4563 chars truncated]

### Assistant | 2026-05-20T02:48:16.965Z

[tool_use: Bash]

### User | 2026-05-20T02:48:23.975Z

[tool_result] /**
 * FLEET-REAPER-MS3/U-FR-MS3-A — claude-tree-priority helper tests.
 *
 * 17 cases (spec floor: 15):
 *   1   parsePriorityName: accepted values
 *   2   parsePriorityName: rejected values (High/Realtime/Idle/junk/null)
 *   3   winPriorityValue: returns Win32 PROCESS_*_PRIORITY_CLASS for valid input
 *   4   clampTtlSec: clamps [MIN, MAX], default on garbage
 *   5   isWindows: branches on pl
... [+9570 chars truncated]

### Assistant | 2026-05-20T02:48:28.479Z

[tool_use: Bash]

### User | 2026-05-20T02:48:33.294Z

[tool_result] /**
 * FLEET-REAPER-MS3/U-FR-MS3-A — boost + decay hook orchestration tests.
 *
 * Hook helper logic only (no spawnSync to wmic — that's covered by the
 * underlying claude-tree-priority.test.mjs suite). 12 cases here PLUS the 17
 * helper cases = 29 total for U-FR-MS3-A (spec floor: 15).
 *
 *   1   pickExpiredStamps: drops stamps with expiresAt in the future
 *   2   pickExpiredStamps: keeps sta
... [+6963 chars truncated]

### Assistant | 2026-05-20T02:49:08.424Z

Acknowledged. Now I have enough context for the review.

## SCRUTINY REPORT — FLEET-REAPER-MS3/U-FR-MS3-A

**Grade: PASS** (1 P2, 2 P3; no P0/P1)

### Spec compliance verified
- **AR#1 (≤ AboveNormal):** `WIN_PRIORITY_VALUES` table (helper:44-48) omits High/Realtime; `parsePriorityName` (helper:75-79) uses `hasOwnProperty` → only BelowNormal/Normal/AboveNormal accepted. Test #2 pins rejection of High/Realtime/Idle/ABOVENORMAL/null/{}/32. Boost hook (boost:80-83) defensively re-validates to {AboveNormal, Normal}.
- **AR#2 (Claude-only anchor):** `walkClaudeTree` (helper:132-141) returns empty Set when anchor's `name` not in `CLAUDE_PROCESS_NAMES`. Test #11 pins it. `findClaudeAncestor` only returns anchor whose name matches (helper:118).
- **TTL clamp:** `clampTtlSec` (helper:89-97) clamps [60,1800], handles `null`/`undefined`→default (the `Number(null)===0` gotcha is explicitly addressed). Test #4 pins it.
- **Fail-soft:** Missing claude.exe ancestor (boost:91), enum failure (boost:88), missing session_id (boost:75), non-Windows (boost:69, decay:84), all return clean `{continue:true}`. CLI wrappers catch+swallow (boost:131-138, decay:130-137).
- **Pure-injected:** All injection points present — `execFile`, `platform`, `timeoutMs` (helper); `listStampDir`, `loadStamps`, `setPriorityForPids`, `unlink`, `nowMs`, `readFile` (decay).
- **Cycle-safety:** `findClaudeAncestor` uses `seen` Set + `maxHops` cap (helper:112-114). `walkClaudeTree` uses `result.has(k)` dedup in BFS (helper:157).
- **Stamp safety:** `safeSessionId` regex `/^[A-Za-z0-9_-]+$/` + 128-char trim (boost:53-58). Atomic-ish via `mkdirSync recursive`+`writeFileSync`.
- **Idempotent decay:** Stamps unlinked after revert; `existsSync` guard + try/catch around stat/readdir (boost:152-162). Empty-pids stamps unlinked without setter call (test #12).

### Findings

**P2 — Decay revert not atomic w.r.t. stamp unlink (decay:108-113).**
If `setPriorityForPids` partially succeeds (e.g., AccessDenied on one PID) but 
... [+1864 chars truncated]
