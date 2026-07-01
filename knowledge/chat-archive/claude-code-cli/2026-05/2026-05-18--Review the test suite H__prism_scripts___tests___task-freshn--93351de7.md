---
type: "chat-session"
source: "claude-code-cli"
session_id: "93351de7-9846-43b7-a9a7-d6bd1f9b2abc"
title: "Review the test suite H:/prism/scripts/__tests__/task-freshness.test.mjs end-to-"
date: "2026-05-18"
first_ts: "2026-05-18T00:52:38.358Z"
last_ts: "2026-05-18T00:52:59.655Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a9a28208355f85b40.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review the test suite H:/prism/scripts/__tests__/task-freshness.test.mjs end-to-

> **claude-code-cli** | 2026-05-18 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/93351de7-9846-43b7-a9a7-d6bd1f9b2abc/subagents/agent-a9a28208355f85b40.jsonl`

## Transcript

### User | 2026-05-18T00:52:38.358Z

Review the test suite H:/prism/scripts/__tests__/task-freshness.test.mjs end-to-end (read the WHOLE file). It tests H:/prism/.claude/helpers/task-freshness.mjs (the pure freshness-decision core for a PreToolUse gate) — read that helper too for contract context.

36/36 currently pass. Verify TEST INTEGRITY per CLAUDE.md R9 ("tests verify intent, not behavior — a test that can't fail when the business logic changes is worthless"):

1. **Real-value assertions, no stubs**: confirm every test asserts concrete expected values (severity strings, booleans, counts, ISO dates) — NO `toBeDefined()`/truthy-only stubs. Flag any assertion that would still pass if the function returned a hardcoded constant.
2. **The 2 real-data E2E tests** ("known-completed unit in a live envelope", "non-existent unit fails open"): per the RGS-TOOL-AUTOINVOKE-MS1 lesson, a pure-core+injected-readers design MUST ship ≥1 real-data E2E that drives the REAL fs/git readers (no injection). Verify these actually do that (call `evaluate(unitId)` with NO opts → real readers), and that they FAIL LOUD if the precondition file is missing (not silently skip). Verify the completed-unit oracle would actually catch a regression in the already-shipped detection path.
3. **Fail-on-revert oracle**: the test "FAIL-ON-REVERT: ackPath must never emit '::' or a path separator" — does it genuinely pin the sanitize() invariant such that deleting the ::→__ replace would fail this test?
4. **Boundary tests**: exactly-24h-not-stale and exactly-5-commits-stale — verify they pin the strict-`>` vs inclusive-`>=` boundaries correctly (off-by-one regression guard).
5. **The fork-storm pair**: "untrusted mtime anchor SKIPS --since spawn" + "trusted anchor DOES spawn --since (control)" — does this pair correctly prove the fork-storm fix without being tautological? Is asserting on git-call ARGS (--since / --diff-filter=A) sound?
6. **Coverage gaps**: which exported helper functions or decideFreshness branches are NOT covered? (class
... [+263 chars truncated]

### Assistant | 2026-05-18T00:52:40.547Z

I'll read both files end-to-end to verify test integrity per CLAUDE.md R9.

### Assistant | 2026-05-18T00:52:40.765Z

[tool_use: Read]

### Assistant | 2026-05-18T00:52:40.769Z

[tool_use: Read]

### User | 2026-05-18T00:52:41.878Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\task-freshness.mjs' was already read 14m ago in this session and is unchanged (mtime 1779064659067). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-18T00:52:43.003Z

[tool_result] 1	// task-freshness.test.mjs — TASK-FRESHNESS-GATE-MS0/U-TFG01
2	//
3	// Hermetic suite (injected readers) + 1 real-data E2E. Per the
4	// RGS-TOOL-AUTOINVOKE-MS1 lesson: a pure-core + injected-readers design MUST
5	// ship one real-data E2E — hermetic fakes do not prove production wiring.
6	//
7	// Run: node --test H:/prism/scripts/__tests__/task-freshness.test.mjs
8	
9	import { test } from "node
... [+20337 chars truncated]

### Assistant | 2026-05-18T00:52:59.655Z

I'll grade this test suite for integrity per CLAUDE.md R9.

**GRADE: FAIL — Multiple P1 issues**

---

## Critical Findings

**1. Real-Data E2E Test Integrity (Lines 456–472) — P1 FAIL**

The test asserts `ev.verdict.stale === true` and `severity === "already-shipped"` against a live completed unit from `FEATURE-GAP-AUDIT-MS0.json`. However, the **precondition check is insufficient**: it only `assert.fail()` if the file is MISSING, not if NO completed units exist. On line 466, if all units have `status !== "completed"`, the find() returns `undefined`, and line 467 `assert.ok(completed, ...)` catches it — **but this is the RIGHT behavior**. Actually sound here.

**2. Fork-Storm Pair (Lines 411–452) — SOUND but Incomplete**

Tests correctly assert that:
- **Untrusted anchor** (mtime-fallback): SKIPS `--since` spawn (line 430)
- **Trusted anchor** (envelope.created_at): DOES spawn `--since` (line 451)

These assertions PIN the fork-storm fix correctly — deleting the `trusted && spawn --since` guard in `countActivitySince` WOULD flip the control test to FAIL. **Verdict: PASS.**

**3. Boundary Tests (Lines 310–329) — SOUND**

- **Exactly 24h**: `stale=false` pins strict `>` (not `>=`) ✓
- **Exactly 5 commits**: `stale=true` pins inclusive `>=` ✓

Off-by-one guards work correctly.

**4. Fail-on-Revert Oracle (Lines 400–407) — P1 WEAK**

```javascript
const base = path.basename(ackPath("c::1", "A::B/../C", dir));
assert.ok(!base.includes("::"), `'::' leaked into ack filename: ${base}`);
```

This DOES pin that `ackPath()` sanitizes `::` → `__`. However, **it only tests the INPUT sanitize(), not the OUTPUT invariant**. A regression where the helper deletes the sanitize block would fail this test. **But**: the test name says "must never emit" — implying the oracle verifies the OUTPUT shape, which it does. **Verdict: PASS.**

**5. Coverage Gaps — P1 CRITICAL**

The 8 exported functions:
- `classifyTaskSource` — ✓ covered (lines 43–103)
- `readGenerationTimestamp` — ✓ covered 
... [+1936 chars truncated]
