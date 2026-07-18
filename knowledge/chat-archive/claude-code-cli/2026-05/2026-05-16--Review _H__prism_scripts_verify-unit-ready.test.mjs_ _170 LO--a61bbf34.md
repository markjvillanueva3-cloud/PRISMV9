---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Review `H:/prism/scripts/verify-unit-ready.test.mjs` (170 LOC, 15 tests, current"
date: "2026-05-16"
first_ts: "2026-05-16T00:33:32.650Z"
last_ts: "2026-05-16T00:34:18.248Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-add34246dda39fdfb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review `H:/prism/scripts/verify-unit-ready.test.mjs` (170 LOC, 15 tests, current

> **claude-code-cli** | 2026-05-16 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-add34246dda39fdfb.jsonl`

## Transcript

### User | 2026-05-16T00:33:32.650Z

Review `H:/prism/scripts/verify-unit-ready.test.mjs` (170 LOC, 15 tests, currently all passing in 270ms via `node --test`).

Tests cover `parseDep`, `lookupUnitStatus`, and `verifyUnitReady` exported from `verify-unit-ready.mjs`. Run them mentally — for each test, ask: **does this test fail when the business logic changes?** (Karpathy R9: tests verify intent, not behavior — no `toBeDefined()` stubs allowed.)

Specifically check:
- Are real expected values asserted (e.g. `assert.equal(r.unit_id, "U-FOO")`) instead of presence-only checks?
- Is the distinction between `deps_not_declared` (no `depends_on` field) and `deps_empty` (field present but `[]`) actually load-bearing in the assertions?
- The "ONLY the pending dep should be flagged" test — does it actually verify the complete dep is NOT in `missingDeps`, or just count the array length?
- The malformed-input tests — do they pass for the RIGHT reason? (e.g. `null` envelopes → `envelopes_not_provided`, not silently passing.)
- The real-envelope integration test — does it lock the actual current behavior so a future regression breaks it?
- Any test that relies on object iteration order (would break under different node versions)?

Report only P0 / P1 findings (genuinely broken or insufficient assertions). Grade PASS or FAIL. Under 250 words.

### Assistant | 2026-05-16T00:33:37.419Z

I'll review the test file against Karpathy R9 (tests verify intent, not behavior — no stub asserts).

### Assistant | 2026-05-16T00:33:37.551Z

[tool_use: Read]

### User | 2026-05-16T00:33:38.689Z

[tool_result] 1	// SYSTEM-VIZ-BRAIN-MS0/U-P3-VERIFY-UNIT-READY tests.
2	//
3	// Uses node:test (the repo's vitest harness is currently broken — see
4	// [[reference_fleet_reaper_ms1]]). Run:
5	//   node --test H:/prism/scripts/verify-unit-ready.test.mjs
6	
7	import { test } from "node:test";
8	import assert from "node:assert/strict";
9	import fs from "node:fs";
10	import {
11	  parseDep,
12	  lookupUnitStatus,

... [+7977 chars truncated]

### Assistant | 2026-05-16T00:33:40.292Z

Now let me check the actual implementation to verify the tests are truly load-bearing:

### Assistant | 2026-05-16T00:33:40.400Z

[tool_use: Read]

### User | 2026-05-16T00:33:41.391Z

[tool_result] read-once-guard: 'H:\prism\scripts\verify-unit-ready.mjs' was already read 13s ago in this session and is unchanged (mtime 1778891419033). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T00:33:42.787Z

I don't have the implementation file in current context. Let me search for it to understand the logic:

### Assistant | 2026-05-16T00:33:42.968Z

[tool_use: Glob]

### User | 2026-05-16T00:34:04.698Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-16T00:34:05.876Z

Let me search directly for the source file:

### Assistant | 2026-05-16T00:34:06.041Z

[tool_use: Read]

### User | 2026-05-16T00:34:11.620Z

[tool_result] 1	#!/usr/bin/env node
2	// SYSTEM-VIZ-BRAIN-MS0/U-P3-VERIFY-UNIT-READY
3	//
4	// Pre-claim dependency check for /pick-unit.
5	//
6	// Reads a unit's `depends_on` array and verifies each dep is `status: "complete"`
7	// in its envelope before allowing the picker to surface it. If any dep is missing
8	// or not complete, the pick is BLOCKED with a punch list of unsatisfied prereqs.
9	//
10	// Schema
... [+8271 chars truncated]

### Assistant | 2026-05-16T00:34:18.248Z

## Verdict: FAIL

**P1 finding — Line 190-191 integration test (real envelope load) uses overly permissive assertion:**

Line 189-193 in the test file:
```javascript
assert.ok(
  r.reason === "deps_not_declared" || r.reason === "deps_empty" || r.reason === "all_deps_complete",
  `expected one of {deps_not_declared, deps_empty, all_deps_complete} but got reason=${r.reason}`
);
```

This test reads the actual SYSTEM-VIZ-BRAIN-MS0.json file and verifies the unit can be picked. However, **it doesn't lock the actual *observed* reason to a specific value**. A future change to envelope schema that *silently changes the meaning* (e.g., envelope gets populated with `depends_on: []` explicitly) would shift `deps_not_declared` → `deps_empty`, and **this test would still pass without flagging the semantic change**. 

The test should assert ONE specific expected reason based on the envelope's actual content (either read and assert the field presence, or hardcode the envelope fixture). Karpathy R9 violation: the assertion documents "one of three" instead of "the specific behavior *today*".

**All other tests (lines 18–166, 176–187) PASS R9:** They assert specific values (`r.unit_id === "U-PREREQ"`, `r.missingDeps.length === 1`, `r.reason === "deps_empty"`), make the loaded-behavior-changing tests (deps_not_declared vs deps_empty distinction, mixed deps filtering), and catch malformed inputs with the *right* reason-codes.

**Grade: FAIL** (1 P1, 14 P0).
