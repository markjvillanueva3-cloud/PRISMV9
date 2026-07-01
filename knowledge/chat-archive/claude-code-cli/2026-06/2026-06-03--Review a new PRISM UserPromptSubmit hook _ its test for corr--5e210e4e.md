---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Review a new PRISM UserPromptSubmit hook + its test for correctness, edge cases,"
date: "2026-06-03"
first_ts: "2026-06-03T00:28:55.554Z"
last_ts: "2026-06-03T00:31:15.256Z"
cwd: "H:\\prism-slot-bravo"
messages: 13
user_msgs: 5
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a4d2c1ad3bac879c7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:37"
---

# Review a new PRISM UserPromptSubmit hook + its test for correctness, edge cases,

> **claude-code-cli** | 2026-06-03 | 13 msgs (5 user / 8 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a4d2c1ad3bac879c7.jsonl`

## Transcript

### User | 2026-06-03T00:28:55.554Z

Review a new PRISM UserPromptSubmit hook + its test for correctness, edge cases, and failure modes. Read BOTH files end-to-end:

1. H:/prism/.claude/hooks/slot-brief-inject.mjs
2. H:/prism/.claude/hooks/__tests__/slot-brief-inject.test.mjs

CONTEXT / CONTRACT this must satisfy:
- It is the "targeted orchestrator→slot channel": the Hermes app (a separate, slot-LESS ZULU master orchestrator process) writes a markdown work-order to state/shared/slot-briefs/<slot>.md; this hook surfaces it into THAT slot's next prompt, then CONSUMES it (atomic rename to state/shared/slot-briefs/_delivered/<slot>-<intMtimeMs>-<hash>.md) so it shows exactly once.
- It mirrors the sibling .claude/hooks/slot-soul-inject.mjs (slot resolution via chat-slots.json: data.chatId === sid OR sid.includes(data.chatId without "claude-" prefix)).
- UserPromptSubmit HARD CONTRACT: the hook must NEVER throw / never block the prompt. Every failure path must emit {continue:true} and exit 0.
- Delivery is intentionally at-most-once (archive-before-emit). Knob: PRISM_SLOT_BRIEF_INJECT_DISABLE=1. Verbose: PRISM_SLOT_BRIEF_INJECT_VERBOSE=1. The module exports pure helpers (resolveSlot, briefHash, formatStamp, truncateBrief, buildBriefBlock) and guards main() behind invokedAsScript so importing in tests doesn't run it.

SPECIFICALLY VERIFY (flag P0/P1):
- Does any code path throw or hang? (stdin read, JSON.parse, fs ops, the for-await stdin loop). Is the never-throw contract actually airtight?
- Consume-once correctness: is the rename truly before emit? Can a brief be injected twice? Can it be silently lost in a way that matters? Is the archive-fail fallback (return emitEmpty without re-emitting) correct?
- resolveSlot edge cases: empty slots, null entries, substring false-positives (e.g. a short chatId matching unintended sessions).
- truncateBrief / buildBriefBlock: off-by-one, the 4096 cap, null/undefined body.
- formatStamp/briefHash: collisions, non-finite mtime, determinism.
- Test integrity (R9 — tests 
... [+366 chars truncated]

### Assistant | 2026-06-03T00:29:07.002Z

I'll review both files end-to-end. Let me read them.

### Assistant | 2026-06-03T00:29:07.470Z

[tool_use: Read]

### Assistant | 2026-06-03T00:29:07.902Z

[tool_use: Read]

### User | 2026-06-03T00:29:12.138Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// HERMES-MASTER-ORCHESTRATOR / slot-brief-inject — UserPromptSubmit hook.
4	//
5	// THE targeted orchestrator->slot channel. The Hermes app (slot-less ZULU master)
6	// runs as a separate process and CANNOT inject into a Claude slot's context. So it
7	// writes a work-order / pointer-bundle to state/shared/slot-briefs/<slot>.md, and
8	// THIS hook surfaces it
... [+6433 chars truncated]

### User | 2026-06-03T00:29:13.637Z

[tool_result] 1	// HERMES-MASTER-ORCHESTRATOR / slot-brief-inject — tests
2	// Pure-function unit tests + a spawn-based consume-once integration test that
3	// proves the load-bearing behavior: a queued brief injects exactly once, archives
4	// to _delivered/, and is invisible on the next prompt.
5	import { describe, it, before, after } from "node:test";
6	import assert from "node:assert/strict";
7	import fs fr
... [+7067 chars truncated]

### Assistant | 2026-06-03T00:29:19.142Z

Let me verify a few suspected issues before grading. First, the `resolveSlot` substring matching against a session_id that contains the chatId, and the `_delivered` directory listing in the empty-brief / disable tests (since they share a temp root with the consume-once test that creates an archive file).

### Assistant | 2026-06-03T00:29:19.988Z

[tool_use: Bash]

### User | 2026-06-03T00:30:29.356Z

[tool_result]     # Subtest: unresolvable slot -> empty continue, brief untouched
    ok 4 - unresolvable slot -> empty continue, brief untouched
      ---
      duration_ms: 149.6618
      ...
    # Subtest: empty/whitespace brief -> empty continue
    ok 5 - empty/whitespace brief -> empty continue
      ---
      duration_ms: 128.6932
      ...
    # Subtest: missing session_id -> empty continue
    ok 6 - m
... [+295 chars truncated]

### Assistant | 2026-06-03T00:30:33.219Z

All 20 tests pass. Now let me verify the substring false-positive concern in `resolveSlot` — specifically the `sid.includes(...)` path with the exact-match branch, and check the sibling `slot-soul-inject.mjs` to confirm the mirror claim.

### Assistant | 2026-06-03T00:30:33.600Z

[tool_use: Read]

### User | 2026-06-03T00:30:41.017Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// HERMES-MS0 / U-HERMES02 — slot-soul-inject UserPromptSubmit hook.
4	// Reads state/shared/slot-souls/<slot>.md for the current slot, injects the
5	// frontmatter + voice/behavior sections as additionalContext on every prompt.
6	// Keeps each slot's "Hermes personality" consistent across /compact + reload.
7	//
8	// Safety: never throws (UserPromptSubmit mus
... [+2477 chars truncated]

### Assistant | 2026-06-03T00:31:15.256Z

The mirror claim is accurate — `resolveSlot` matches `slot-soul-inject.mjs`'s resolution logic verbatim. Let me confirm the one substantive consume-once concern: the test's second-prompt assertion relies on `hookSpecificOutput === undefined`. Let me verify what the emitEmpty payload actually contains versus the inject payload, to make sure the second-prompt assertion can't false-pass.

The emit paths are clear from the source: `emitEmpty()` emits `{continue:true}` (no `hookSpecificOutput`), inject emits `{continue:true, hookSpecificOutput:{...}}`. So `out2.hookSpecificOutput === undefined` genuinely proves consumption. 

One real concern to check: test isolation across the shared `root` in the integration block. Let me verify the `_delivered` archive from the first `it` doesn't pollute later `it`s — and whether any later test reads the delivered dir.

The later tests (`no brief queued`, `disable knob`, etc.) only assert on `r.stdout` and `briefFile()` existence — none read `_delivered/`, so the lingering archive from test 1 is harmless. The `delivered.length === 1` assert in test 1 runs before any other archive could be created. Ordering is safe.

I have everything I need.

## Code Quality Analysis Report — slot-brief-inject

**Grade: PASS** (both files). No P0. No P1. A few P2/P3 notes only.

### Never-throw contract — AIRTIGHT
- stdin: `for await` loop wrapped in try/catch → `emitEmpty()` (`slot-brief-inject.mjs:92-96`). No timeout, but `process.stdin` async iteration ends on EOF; Claude Code closes the pipe, so no hang in practice (identical to the proven sibling).
- `JSON.parse` of envelope: IIFE try/catch → `{}` (`:97`).
- `readJson`/`readText`: both try/catch → `null` (`:80-81`).
- All fs ops in the consume block (`mkdirSync`/`statSync`/`renameSync`) are inside one try/catch → `emitEmpty()` (`:116-124`).
- Top-level `main().catch(() => emitEmpty())` (`:139`) is the final backstop.
- Every non-inject path funnels through `emitEmpty()` → `{continue:true}`, exit 
... [+4128 chars truncated]
