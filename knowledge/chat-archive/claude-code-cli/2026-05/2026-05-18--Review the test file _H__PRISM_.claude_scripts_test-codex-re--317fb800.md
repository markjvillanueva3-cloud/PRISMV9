---
type: "chat-session"
source: "claude-code-cli"
session_id: "317fb800-51f2-4e41-97fe-f7f3ae4f9b21"
title: "Review the test file `H:\\PRISM\\.claude\\scripts\\test-codex-review.mjs` end-to-end"
date: "2026-05-18"
first_ts: "2026-05-18T03:07:58.528Z"
last_ts: "2026-05-18T03:08:52.369Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 5
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/317fb800-51f2-4e41-97fe-f7f3ae4f9b21/subagents/agent-a0b4abe79c1bfe652.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review the test file `H:\PRISM\.claude\scripts\test-codex-review.mjs` end-to-end

> **claude-code-cli** | 2026-05-18 | 14 msgs (5 user / 9 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/317fb800-51f2-4e41-97fe-f7f3ae4f9b21/subagents/agent-a0b4abe79c1bfe652.jsonl`

## Transcript

### User | 2026-05-18T03:07:58.528Z

Review the test file `H:\PRISM\.claude\scripts\test-codex-review.mjs` end-to-end. Grade PASS or FAIL with P0/P1 issues.

## Context
This is the hermetic test suite for `runCodexReview()` — a new advisory Codex-CLI review arm in `H:\PRISM\.claude\scripts\scrutiny-3way.mjs`. `runCodexReview(target, opts)` spawns `codex exec review`, parses a `VERDICT:` line, and returns `{provider,verdict,blockers,notes,durationMs,skipped,rawOutputPeek?}`. It is ADVISORY — every failure (spawn throw, child error, non-zero exit, empty output, timeout, quota/auth/network/EPIPE in stderr, bad target) must resolve to `verdict:"skipped"`, never `"fail"`. It is tested through its `opts.spawnImpl` injection seam with a fake child process. The suite mirrors the sibling `H:\PRISM\.claude\scripts\test-ollama-preflight.mjs` (custom node `.mjs` harness, exit 0/1). All 19 cases currently pass.

## Verify (this is the test-integrity pass — R9: tests must fail when the logic breaks)
1. **Real intent, not tautology.** For each test — would it actually FAIL if `runCodexReview` regressed? E.g. the "spawn throws -> skipped" test: does it assert `verdict==="skipped"` (real) or just that a result exists (worthless)? Flag any assertion that would still pass against broken code.
2. **Mock fidelity.** `makeChild()` fakes a Node `ChildProcess` (stdout/stderr EventEmitters, an stdin sink, `kill()`). Is the fake faithful enough that a test passing here implies the real code path works? Specifically: does the async-emit-via-setTimeout correctly model that `runCodexReview` attaches its listeners synchronously *before* the child emits? Could a test pass against the mock but fail against a real `codex` child?
3. **Coverage adequacy.** The injected harness covers happy pass/fail, ~9 failure modes, disabled arm, malformed verdict, target rejection, a stderr-only-classification regression guard, and argv-shape. Is anything load-bearing UNtested? Notably: is the timeout path genuinely exercised (timer fires, child kill
... [+725 chars truncated]

### Assistant | 2026-05-18T03:08:04.783Z

I'll review `H:\PRISM\.claude\scripts\test-codex-review.mjs` end-to-end for test integrity, mock fidelity, and regression-catching ability.

### Assistant | 2026-05-18T03:08:05.014Z

[tool_use: Read]

### User | 2026-05-18T03:08:05.990Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * test-codex-review.mjs
4	 *
5	 * Standalone node test runner for runCodexReview() — the advisory Codex CLI
6	 * review arm in scrutiny-3way.mjs (added 2026-05-18).
7	 *
8	 * Mirrors test-ollama-preflight.mjs: lives in .claude/scripts/ alongside the
9	 * unit-under-test, imports the .mjs directly (vitest's transform pipeline
10	 * rejects .ts→.mjs cross-extension imp
... [+13961 chars truncated]

### Assistant | 2026-05-18T03:08:07.663Z

I'll now review the implementation file to verify the tests are actually testing the real logic.

### Assistant | 2026-05-18T03:08:07.867Z

[tool_use: Read]

### User | 2026-05-18T03:08:08.884Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * scrutiny-3way — multi-reviewer parallel scrutiny orchestrator.
4	 *
5	 * Three independent Claude PRISM agents, all required PASS to release the
6	 * Stop hook (NO external CLI dependency — Codex CLI was retired 2026-05-13
7	 * after persistent diff-size truncation on PRISM-scale commits exceeded its
8	 * 80 KB context budget):
9	 *   1. Claude reviewer agent A  — 
... [+11458 chars truncated]

### Assistant | 2026-05-18T03:08:10.449Z

Now let me view the `runCodexReview` function itself:

### Assistant | 2026-05-18T03:08:11.150Z

[tool_use: Grep]

### User | 2026-05-18T03:08:13.111Z

[tool_result] 484-  try {
485-    const res = await fetchImpl(url, {
486-      method: "POST",
487-      headers: { "Content-Type": "application/json" },
488-      body: JSON.stringify({
489-        model,
490-        prompt: safePrompt,
491-        stream: false,
492-        options: { temperature: 0.2, num_predict: 600 },
493-      }),
494-      signal: ctrl.signal,
495-    });
496-    clearTimeout(timer);
49
... [+6499 chars truncated]

### Assistant | 2026-05-18T03:08:14.541Z

Let me get the rest of the function:

### Assistant | 2026-05-18T03:08:15.235Z

[tool_use: Grep]

### User | 2026-05-18T03:08:16.340Z

[tool_result] 339-    const msg = err instanceof Error ? err.message : String(err);
340-    return { text: `[scrutiny-3way: git diff capture failed: ${msg}]`, truncated: false, totalBytes: 0, error: msg };
341-  }
342-}
343-
344-function spawnReview(provider, bin, args, stdinPayload) {
345-  return new Promise((resolve) => {
346-    const start = Date.now();
347-    let stdout = "";
348-    let stderr = "";
349
... [+9327 chars truncated]

### Assistant | 2026-05-18T03:08:52.369Z

Perfect. Now I have both the implementation and the test. Let me perform the comprehensive review:

---

## REVIEW: `test-codex-review.mjs`

**GRADE: PASS with 1 MEDIUM issue + 1 LOW issue**

### Summary
The test suite correctly exercises `runCodexReview()` through mock injection, covers all major code paths, catches real regressions, and the mock fidelity is adequate for its scope. However, there are two findings:

---

### 1. REAL INTENT VERIFICATION ✓ PASS

**All critical assertions would FAIL on regression:**

- **Lines 110-119** (happy PASS): Asserts `verdict==="pass"` — would fail if the verdict-parse logic broke.
- **Lines 121-136** (BLOCKER extraction): Asserts exact blocker text AND count — would fail if extraction regex broke or blocker filtering was added/removed.
- **Lines 138-146** (rawOutputPeek + durationMs): Asserts finite duration AND peek contains the verdict — would fail if output capture broke.
- **Line 156-159** (spawn-throw → skipped): Asserts **both** `verdict` AND `skipped` AND notes-contains — tight contract.
- **Lines 188-196** (timeout): Asserts timeout-tagged notes AND must-have "timeout" substring — would fail if timer was removed or resolve path changed.
- **Lines 198-232** (env-fail signatures): Each asserts notes-contains "ENV_FAIL" — would fail if the env-fail classification regex broke.
- **Lines 264-273** (target validation before spawn): Asserts spawn never called via `spawnCalled` flag — critical security assertion.
- **Lines 278-292** (regression guard): Asserts verdict stays `"pass"` when env-fail signature appears in STDOUT — would fail if env-fail regex was changed to scan stdout.

No tautologies or `toBeDefined()` stubs.

---

### 2. MOCK FIDELITY — PASS with caveat

The fake `makeChild()` is **faithful enough for test coverage** but has one **model gap**:

**Good:**
- EventEmitter shapes for stdout/stderr are correct (Node `Stream` is a subclass).
- Async emit via `setTimeout` correctly ensures listeners are attached before
... [+8455 chars truncated]
