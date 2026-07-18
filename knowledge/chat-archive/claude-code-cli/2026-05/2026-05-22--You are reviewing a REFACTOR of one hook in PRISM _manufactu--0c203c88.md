---
type: "chat-session"
source: "claude-code-cli"
session_id: "0c203c88-6d98-44df-931a-5945093269a2"
title: "You are reviewing a REFACTOR of one hook in PRISM (manufacturing-intelligence pl"
date: "2026-05-22"
first_ts: "2026-05-22T22:06:39.104Z"
last_ts: "2026-05-22T22:07:04.045Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/0c203c88-6d98-44df-931a-5945093269a2/subagents/agent-abdc3be9a6cabb8ef.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# You are reviewing a REFACTOR of one hook in PRISM (manufacturing-intelligence pl

> **claude-code-cli** | 2026-05-22 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0c203c88-6d98-44df-931a-5945093269a2/subagents/agent-abdc3be9a6cabb8ef.jsonl`

## Transcript

### User | 2026-05-22T22:06:39.104Z

You are reviewing a REFACTOR of one hook in PRISM (manufacturing-intelligence platform). Per-file scrutiny gate — read the whole file end-to-end and grade PASS or FAIL.

FILE TO REVIEW: H:/prism/.claude/hooks/pre-read-graph-inject.mjs

CONTEXT: This is unit U-GO-A5 of the GRAPH-OCTOPUS-AUTOWIRE-MS0 milestone. The unit spec:
- description: "Point pre-read-graph-inject.mjs key derivation at the shared graph-key-derive lib — single source of truth."
- steps: "Replace deriveQueryKey internals with deriveGraphKeys({tool:'read'}); Keep behavior identical; preserve existing tests; Run pre-read-graph-inject.test.mjs"
- exit criteria: "Existing tests still pass; Key derivation unified"

WHAT CHANGED (vs the pre-refactor version):
- The bespoke `deriveQueryKey(filePath)` (string|null, with extension-strip + MIN_LEN=4 + index/main/dotfile skip) is REMOVED.
- `main()` now calls `deriveGraphKeys({input: filePath, tool: "read"})` from the shared lib at H:/prism/scripts/lib/graph-key-derive.mjs — returning a string[] array, like the 3 sibling hooks (pre-grep / pre-write / pre-bash, already shipped + scrutiny-passed).
- `renderInject` signature changed: was `renderInject(query, hits)` (string), now `renderInject(keys, hits)` (array), header uses `keys.join(", ")`.
- The `PRISM_PRE_READ_GRAPH_MIN_LEN` env knob is GONE (no longer applies — the shared lib's tokenize MIN_TOKEN_LEN=3 + the search lib's >=2-token floor naturally cover all the noisy-file cases the old gate handled).

DELIBERATE DEVIATION FROM THE UNIT SPEC TO SURFACE: the spec said "Keep behavior identical; preserve existing tests" but the shared lib is array-returning + lowercasing, structurally incompatible with deriveQueryKey's case-preserving string contract. True single-source-of-truth (the deeper intent) required replacing the deriveQueryKey contract with the shared lib's contract, which means the 16 deriveQueryKey unit tests in the old test file are gone — key-derivation behavior is now tested ONCE in graph-key-der
... [+1308 chars truncated]

### Assistant | 2026-05-22T22:06:58.479Z

I'll review the refactored hook file end-to-end against the unit spec, sibling conventions, and the specific concerns flagged.

### Assistant | 2026-05-22T22:06:58.798Z

[tool_use: Read]

### User | 2026-05-22T22:07:02.467Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * pre-read-graph-inject.mjs — PreToolUse:Read graph-context injector.
5	 *
6	 * PRISM-SEARCH-MS0 / U-PSM01 (2026-05-18, slot golf).
7	 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-A5 (2026-05-22, slot echo) — key
8	 *   derivation refactored onto the shared scripts/lib/graph-key-derive.mjs
9	 *   so all four PreToolUse graph hooks (read / grep / write / bash) sh
... [+5846 chars truncated]

### Assistant | 2026-05-22T22:07:04.045Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
