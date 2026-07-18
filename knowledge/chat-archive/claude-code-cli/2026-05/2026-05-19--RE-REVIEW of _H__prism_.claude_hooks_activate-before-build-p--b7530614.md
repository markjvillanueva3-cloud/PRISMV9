---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "RE-REVIEW of `H:/prism/.claude/hooks/activate-before-build-precheck.test.mjs` af"
date: "2026-05-19"
first_ts: "2026-05-19T04:48:30.488Z"
last_ts: "2026-05-19T04:49:58.881Z"
cwd: "H:\\prism"
messages: 11
user_msgs: 4
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a4cca07c22acb7859.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# RE-REVIEW of `H:/prism/.claude/hooks/activate-before-build-precheck.test.mjs` af

> **claude-code-cli** | 2026-05-19 | 11 msgs (4 user / 7 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-a4cca07c22acb7859.jsonl`

## Transcript

### User | 2026-05-19T04:48:30.488Z

RE-REVIEW of `H:/prism/.claude/hooks/activate-before-build-precheck.test.mjs` after P0/P1 fixes. You were arm-B previously and returned FAIL with:
- P0-1: env-leak — PRISM_ACTIVATE_PRECHECK_DISABLE not snapshot+restored around decide+CLI suites
- P1-1: zero coverage of lib-load failure catch (production:293-297)
- P1-2: "already exists" test uses HOOK_PATH self-reference, silent-breakage risk
- P1-3: searchWithTimeout timeout firing untested
- P1-4: no real-data fail-on-revert oracle

Fixes applied this round (read the file):
- **P0-1 FIX**: Added `snapshotEnv()` / `restoreEnv()` helper + per-suite `before/after` hooks for both `describe("decide", ...)` and `describe("CLI subprocess", ...)`. CLI subprocesses now spawn with `cleanEnv()` that strips PRECHECK_* knobs from inherited env.
- **P1-1 FIX**: Added a NEW CLI subprocess test `"lib-load failure → suppressed (PRISM_ACTIVATE_PRECHECK_LIB_PATH=/nonexistent)"` that sets the override env to a definitely-missing path and asserts `suppressOutput: true`. This required adding a new production env var `PRISM_ACTIVATE_PRECHECK_LIB_PATH` to the hook (the only code-side change — see hook lines ~24, 290-303). The lazy lib import now reads this env first, falling back to the hardcoded H: path.
- **P1-2 FIX**: Added a real `tmpdir` + `mkdtempSync` fixture (`abp-fixture-` prefix) with a real on-disk file at `<tmp>/.claude/hooks/existing-fixture-hook.mjs`. The "already-exists" test now uses this fixture (which classifies AS hook AND exists on disk), with a pre-assertion `assert.ok(existsSync(fixtureHookPath))` to fail-loud if the fixture vanishes. Cleanup in `after()` removes the tmp tree.
- **P1-3 FIX**: Added 3 new searchWithTimeout tests covering the async path:
  1. async runSearch resolving under timeout
  2. async runSearch timing out (slow=500ms, timeout=50ms, asserts result=[] AND elapsed<200ms)
  3. async runSearch rejecting → []
  Plus the production code was refactored: the `setImmediate` callback now uses `Promise.re
... [+2258 chars truncated]

### Assistant | 2026-05-19T04:48:40.378Z

I'll re-review the test file and verify all P0/P1 fixes are correctly applied.

### Assistant | 2026-05-19T04:48:40.905Z

[tool_use: Read]

### User | 2026-05-19T04:48:46.701Z

[tool_result] 1	// activate-before-build-precheck.test.mjs — node:test suite
2	//
3	// U-ACTIVATE-BEFORE-BUILD-PRECHECK (JULIETT-12CHAT-ALLOCATION-MS0)
4	//
5	// Covers the pure-core (classifyPath, buildQuery, renderBlock, clampedTopK,
6	// searchWithTimeout, decide) PLUS a real-subprocess CLI smoke that proves the
7	// stdin→stdout wiring + script-guard work in the published artifact (per the
8	// "pure core +
... [+24509 chars truncated]

### Assistant | 2026-05-19T04:48:54.171Z

Now let me verify the production hook to confirm the env knob and `searchWithTimeout` refactor are correctly applied.

### Assistant | 2026-05-19T04:48:54.435Z

[tool_use: Read]

### User | 2026-05-19T04:48:59.218Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * activate-before-build-precheck.mjs — PreToolUse:Write/MultiEdit advisory hook
5	 *
6	 * U-ACTIVATE-BEFORE-BUILD-PRECHECK (JULIETT-12CHAT-ALLOCATION-MS0)
7	 *
8	 * Surfaces top-K master-index hits BEFORE a chat writes a NEW engine / hook /
9	 * skill file. Advisory only — does NOT block (sibling `duplication-hard-block.mjs`
10	 * handles exact-name mat
... [+13741 chars truncated]

### Assistant | 2026-05-19T04:49:05.078Z

Let me run the test to verify the fixes hold under live execution.

### Assistant | 2026-05-19T04:49:06.383Z

[tool_use: Bash]

### User | 2026-05-19T04:49:18.748Z

[tool_result]     # Subtest: existing file path → suppressed (edit not create)
    ok 6 - existing file path → suppressed (edit not create)
      ---
      duration_ms: 50.1845
      ...
    # Subtest: lib-load failure → suppressed (PRISM_ACTIVATE_PRECHECK_LIB_PATH=/nonexistent)
    ok 7 - lib-load failure → suppressed (PRISM_ACTIVATE_PRECHECK_LIB_PATH=/nonexistent)
      ---
      duration_ms: 52.0814
      ..
... [+414 chars truncated]

### Assistant | 2026-05-19T04:49:58.881Z

53/53 pass in 2.17s. Now I'll verify each P0/P1 fix against the specific concerns raised.

## Verification

### 1. P0-1 env snapshot/restore — VERIFIED CORRECT
Test file lines 42-58 define `snapshotEnv()` / `restoreEnv()` over the 3 knobs (`PRISM_ACTIVATE_PRECHECK_DISABLE`, `_K`, `_LIB_PATH`). Both `describe("decide", ...)` (lines 313-318) and `describe("CLI subprocess", ...)` (lines 428-433) wrap `before()` snapshot + `delete` and `after()` restore. The CLI suite additionally uses `cleanEnv()` (lines 437-441) to spawn subprocesses with stripped env — child processes can't inherit a parent-shell `PRISM_ACTIVATE_PRECHECK_DISABLE=1` that would silently green-light everything. **The `clampedTopK` describe block (lines 215-246) does NOT use the new helper** — it still uses its old pattern with `const orig = process.env.PRISM_ACTIVATE_PRECHECK_K` captured at module-load time. This is **functionally correct** (each test restores at the end) but stylistically inconsistent. Not a P0/P1 — it's a P3.

### 2. P1-1 lib-load failure — VERIFIED CORRECT
Production hook lines 298-311: the lazy import branch reads `process.env.PRISM_ACTIVATE_PRECHECK_LIB_PATH` first, falling back to the hardcoded path. The catch block returns silent-approve JSON. Test line 498-510 spawns with `PRISM_ACTIVATE_PRECHECK_LIB_PATH: "H:/prism/this/path/definitely/does/not/exist.mjs"` and asserts `suppressOutput: true` + `continue: true`. The path is deep enough that no future refactor will accidentally make it real. `pathToFileURL(libPath).href` is computed on a non-existent path (works — it's a pure URL construction), then `await import()` throws ENOENT, hitting the catch on line 306. Production path executed. The new env knob is documented in the docstring at line 26-27.

### 3. P1-2 tmpdir fixture — VERIFIED CORRECT
Lines 327-336: `mkdtempSync(join(tmpdir(), "abp-fixture-"))` creates a real isolated tmp tree, `mkdirSync({recursive: true})` builds `.claude/hooks/` inside it, `writeFileSync` creates `exi
... [+4429 chars truncated]
