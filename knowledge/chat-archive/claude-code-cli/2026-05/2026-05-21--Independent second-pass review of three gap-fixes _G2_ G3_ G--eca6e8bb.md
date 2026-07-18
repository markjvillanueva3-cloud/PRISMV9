---
type: "chat-session"
source: "claude-code-cli"
session_id: "eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf"
title: "Independent second-pass review of three gap-fixes (G2, G3, G9) to PRISM's \"zebra"
date: "2026-05-21"
first_ts: "2026-05-21T00:29:32.710Z"
last_ts: "2026-05-21T00:31:36.760Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-add7ef3a04db42e59.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Independent second-pass review of three gap-fixes (G2, G3, G9) to PRISM's "zebra

> **claude-code-cli** | 2026-05-21 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-add7ef3a04db42e59.jsonl`

## Transcript

### User | 2026-05-21T00:29:32.710Z

Independent second-pass review of three gap-fixes (G2, G3, G9) to PRISM's "zebra orchestrator" — an external automation that types `/compact` or `/checkin` keystrokes into chat-slot terminal windows every 5 minutes. Files:
- `H:\prism\scripts\lib\zebra-orchestrator-lib.mjs` (pure decision lib)
- `H:\prism\scripts\zebra-orchestrator-sweep.mjs` (I/O shell)
- `H:\prism\scripts\lib\zebra-orchestrator-lib.test.mjs` (tests)

The three changes (all in the regions commented `G2`, `G3`, `G9`):
- **G3**: new pure `staggerAfterLine(line, opts)` — returns a 90s wait after a `/compact` line, normal ~5s stagger otherwise. The sweep's `sendLines` uses it between consecutive lines. New const `DEFAULT_COMPACT_WAIT_MS`.
- **G2**: `planSlotAction` no longer hard-codes `hasUncommittedCriticalWork: true` — it accepts it via opts (`!== false` so the default stays conservative `true`). The sweep computes it via `readGitDirty()` (a `git status --porcelain` spawn).
- **G9**: the sweep replaces a hard-coded `hasHandoff: false` with `readHandoffFresh(slot)` (scans `state/shared/handoffs/` for fresh `HANDOFF-*-<slot>-*.md`).

Do NOT assume the content-specialist reviewer caught everything. Weight your review toward:
- **Integration / second-order effects**: `sendLines` now blocks ~90s on a `/compact` line. The sweep's per-slot loop is sequential. The scheduled task runs every 5 min. Could the 90s wait cause the sweep to overrun, overlap the next scheduled run, or starve other slots? Is the `sendLines` PS spawn timeout (45000ms) still adequate — does the 90s wait happen BETWEEN spawns (fine) or could it interact badly?
- **Error budget / fail-loud (R12)**: `readGitDirty` and `readHandoffFresh` — every failure path classified and fail-soft? `readGitDirty` writes to stderr on failure — good or noisy?
- **The conservative-default reasoning**: G2's `hasUncommittedCriticalWork !== false` — is `undefined !== false` correct (=> true)? Is `null !== false` => true? Confirm omitting the opt can NEVER sil
... [+725 chars truncated]

### Assistant | 2026-05-21T00:29:43.180Z

I'll review the three files for the G2, G3, G9 changes.

### Assistant | 2026-05-21T00:29:43.437Z

[tool_use: Read]

### Assistant | 2026-05-21T00:29:43.674Z

[tool_use: Read]

### Assistant | 2026-05-21T00:29:43.843Z

[tool_use: Read]

### User | 2026-05-21T00:29:50.916Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\zebra-orchestrator-lib.mjs' was already read 2s ago in this session and is unchanged (mtime 1779322971829). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-21T00:29:54.699Z

[tool_result] 1	#!/usr/bin/env node
2	// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA02 — sweep CLI (the body).
3	//
4	// One pass over every opt-in chat slot: read pressure (CHO02), make decision
5	// (CHO01), resolve target HWND from PID (U-ZEBRA01), and — for executable
6	// plans — SendKeys the slash + follow-up /checkin-<slot> backend-dev-priority
7	// directive (U-CHO04 + U-ZEBRA05) into the target PowerShell window 
... [+16435 chars truncated]

### User | 2026-05-21T00:29:56.186Z

[tool_result] 1	// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA02 — pure-core orchestrator lib tests.
2	// Hermetic: no I/O, no PS spawn. Injects a fake `decideClearOrCompact`.
3	
4	import { describe, it } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  DEFAULT_STAGGER_MS,
8	  DEFAULT_COMPACT_WAIT_MS,
9	  DEFAULT_DRY_RUN_GRACE_HOURS,
10	  DEFAULT_ACTION_COOLDOWN_MS,
11	  SELF_EXEMPT_SLOTS,
12	  
... [+18538 chars truncated]

### Assistant | 2026-05-21T00:30:00.796Z

Now let me read the lib file (it was read recently in this session, but I need it for review):

### Assistant | 2026-05-21T00:30:01.115Z

[tool_use: Read]

### User | 2026-05-21T00:30:07.238Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\zebra-orchestrator-lib.mjs' was already read 18s ago in this session and is unchanged (mtime 1779322971829). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-21T00:30:14.072Z

The cache claims the lib is in context but it isn't visible to me. Let me grep the relevant regions.

### Assistant | 2026-05-21T00:30:14.836Z

[tool_use: Grep]

### User | 2026-05-21T00:30:19.523Z

[tool_result] 23-
24-import {
25-  buildCheckinPayload,
26-} from "./zebra-bd-priority.mjs";
27-
28-export const DEFAULT_STAGGER_MS = 5000;
29:// G3 — /compact on a large chat runs 20-60s+; the normal inter-line stagger
30-// would land the follow-up /checkin keystrokes mid-compaction and corrupt
31-// them. After a /compact line we wait this much longer, generous-flat window.
32-// Waiting too long only delays
... [+3229 chars truncated]

### Assistant | 2026-05-21T00:30:22.903Z

I have all three regions. Let me verify two things: the `staggerMs()` env clamp interaction with `compactWaitMs()`, and whether the lib has a pre-existing escaped-char issue at line 99.

### Assistant | 2026-05-21T00:30:23.858Z

[tool_use: Grep]

### Assistant | 2026-05-21T00:30:25.140Z

[tool_use: Bash]

### User | 2026-05-21T00:30:31.662Z

[tool_result] No matches found

### User | 2026-05-21T00:31:20.154Z

[tool_result] compact: 90000
clear: 5000
COMPACT_WAIT: 90000
clearLine: {"ok":true,"lines":["/clear","/checkin-hotel priority filter U-WIRE*|U-BRIDGE*|U-HOOK*|U-INFRA*|U-DEVTOOL*|U-CK*|backend-dev FIRST"]}

### Assistant | 2026-05-21T00:31:36.760Z

The lib's `\clear` at line 99 renders as a literal `/clear` (correct — escape verified by runtime output). My grep noise was the Read-tool stripping control chars. The runtime smoke test confirms `staggerAfterLine` and the clear line are correct.

# Independent Second-Pass Review — Zebra Orchestrator G2/G3/G9

**Grade: PASS**

The three fixes are correct and well-tested. Findings below; none block.

## P1 — Sweep overrun vs. 5-min schedule (integration / second-order)
`sendLines` now blocks **90s** per `/compact` line (sweep.mjs:211-215). The per-slot loop is sequential (sweep.mjs:246). Worst case: N slots all `execute`/`compact` → `N × (90s compact + ~5s inter-slot)`. With ≥4 compacting slots the sweep exceeds the 5-min scheduler interval and **overlaps the next scheduled run** — two zebra processes typing into the same windows concurrently. The 90s wait is *between* spawns so the 45000ms per-spawn timeout (sweep.mjs:196) is unaffected — that part is fine. But there is **no run-lock / mutex** guarding `sweepOnce` against re-entry. Recommend a PID/lockfile guard (sweep is single-`--once`, so a `.cron-locks`-style flock is cheap) or a sweep-wide wall-clock budget that stops picking new slots past ~4min. This is the one real risk; flag it for the operator even if deferred.

## P2 — `readGitDirty` is effectively a no-op on the shared tree (hidden coupling)
The PRISM `H:/prism` tree carries ~11,800 uncommitted changes permanently. `git status --porcelain` will **always** return non-empty → G2's `gitDirty` is `true` on every sweep → `hasUncommittedCriticalWork` is always `true` → the `/clear` path is **never reachable in production**. The G2 fix is therefore *cosmetic for the shared-tree case* — it only changes behavior in a slot-worktree (clean) tree. The comments (sweep.mjs:115-118, lib:184-188) honestly describe the conservative-default *intent* but **do not acknowledge that the signal is saturated on the main tree**. For a P2 gap this is acceptable (the conservative 
... [+2111 chars truncated]
