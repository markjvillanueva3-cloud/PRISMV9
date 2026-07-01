---
type: "chat-session"
source: "claude-code-cli"
session_id: "bf45be54-4309-4d36-b13d-385ef2eddd6d"
title: "Independent review of `H:/PRISM/scripts/declared-vs-actual.test.mjs` — the herme"
date: "2026-05-20"
first_ts: "2026-05-20T02:34:25.154Z"
last_ts: "2026-05-20T02:35:38.004Z"
cwd: "H:\\PRISM"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/bf45be54-4309-4d36-b13d-385ef2eddd6d/subagents/agent-add1493f7bfbc74f7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Independent review of `H:/PRISM/scripts/declared-vs-actual.test.mjs` — the herme

> **claude-code-cli** | 2026-05-20 | 8 msgs (3 user / 5 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/bf45be54-4309-4d36-b13d-385ef2eddd6d/subagents/agent-add1493f7bfbc74f7.jsonl`

## Transcript

### User | 2026-05-20T02:34:25.154Z

Independent review of `H:/PRISM/scripts/declared-vs-actual.test.mjs` — the hermetic test suite for a substrate-health measurement script.

The script is consumed by forge7's BLOCK gate. False-pass tests here = drift gets through. False-fail tests = forge7 BLOCKS clean repos.

VERIFY (weighted on what test-review-agent might miss):
1. **Test names match what they actually assert** — a test called "REGRESSION GUARD — catches today's actual bug class" must specifically pin the `prism-mcp-server` → dormant_declared_not_configured path. Trace it.
2. **Mock fakery doesn't paper over real-world behavior** — the hermetic mocks (`readImpl`, `readdirImpl`) — do they match real `node:fs/promises` semantics exactly? (e.g., does the real `readFile` throw with `e.code === "ENOENT"` or `"ENOENT"` somewhere else?)
3. **Assertion strength** — `assert.ok(x.length > 0)` is weaker than `assert.equal(x.length, 3)`. Look for weak assertions in the regression-guard tests specifically.
4. **Cross-file coupling** — does any test silently depend on the order of imports or hoisted execution?
5. **The transposition Levenshtein test** — verify the math. `prims` ↔ `prism` swap (m↔s) — classical Levenshtein scores 2 (sub-sub OR del-ins). Damerau would score 1. The test pins 2 (classical) — is that consistent with the implementation?
6. **Test for unknown CLI flag handling** — was that fix tested? (Probably not — it's CLI-shell behavior, harder to test hermetically. If absent, flag as gap.)
7. **Test for exitAfterDrain** — same — was the P0 fix tested? If absent, flag as gap.

REPORT FORMAT:
- One line per finding: `Pn | <line/test> | <finding>`
- End: `VERDICT: PASS` or `FAIL — <reason>`
- Propose 1 stronger test the suite leaves on the table even if PASS
- ≤300 words

### Assistant | 2026-05-20T02:34:39.979Z

I'll review the test suite independently.

### Assistant | 2026-05-20T02:34:40.068Z

[tool_use: Read]

### User | 2026-05-20T02:35:04.283Z

[tool_result] 1	/**
2	 * scripts/declared-vs-actual.test.mjs
3	 *
4	 * Hermetic node:test suite. No real filesystem reads — every I/O function
5	 * gets injected via readImpl / readdirImpl so the suite can run anywhere.
6	 *
7	 * Includes a "regression guard" integration test that pins today's actual
8	 * 2026-05-19 bug class: enabledMcpjsonServers listed "prism-mcp-server"
9	 * (typo'd name) while .mcp.json de
... [+21504 chars truncated]

### Assistant | 2026-05-20T02:35:09.515Z

Now let me verify the implementation to check the test assertions against actual behavior.

### Assistant | 2026-05-20T02:35:09.756Z

[tool_use: Read]

### User | 2026-05-20T02:35:12.444Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * scripts/declared-vs-actual.mjs
4	 *
5	 * Substrate-health measurement — surfaces drift between what PRISM settings
6	 * DECLARE (enabled MCP servers, env vars, user-vs-project keys, hook wiring)
7	 * and what is ACTUALLY configured on disk.
8	 *
9	 * Designed against the 2026-05-19 bug class: `enabledMcpjsonServers` listed
10	 * `prism-mcp-server` (typo'd name), `p
... [+20609 chars truncated]

### Assistant | 2026-05-20T02:35:38.004Z

## Review of `declared-vs-actual.test.mjs`

P1 | test:462 (REGRESSION GUARD) | Does pin `prism-mcp-server` → `dormant_declared_not_configured` (line 506-509) with `assert.ok(...includes(...))`. Asserts blocking_count >= 1, not == 1. A revert that double-flags or adds noise still passes — should pin exact array equality: `assert.deepEqual(r.mcp.dormant_declared_not_configured, ["prism-mcp-server"])`.

P2 | test:207 (transposition) | Math verified — classical Levenshtein(`prims`,`prism`) = 2 (sub m→s at idx 2, sub s→m at idx 3, or del-ins). Implementation uses classical 2-row DP (line 187-207), no transposition op. Test correctly pins 2. Consistent.

P2 | test:379-417 (readJsonFile/listHookFiles) | Mock fakery matches real `node:fs/promises` semantics: real `readFile` throws Error with `e.code === "ENOENT"` (verified — Node always attaches on path-resolution failure). Mocks correctly attach `e.code` on the Error object. Sound.

P2 | NO TEST for `--strick` unknown-flag rejection | The implementation lines 488-496 reject unknown flags with exit code 2. Reviewer P1 mentioned in source comment. Untested. Gap (CLI-shell behavior — testable via `child_process.spawnSync` against `cli()` as subprocess).

P2 | NO TEST for `exitAfterDrain` Windows-pipe drain | Implementation lines 474-482 reviewer-P0 fix. Untested. Gap (testable by mocking `process.stdout.write` and asserting callback fires before `process.exitCode` resolves).

P3 | test:174-185 (diffSettings same-length REGRESSION) | Uses weak `assert.ok(A || B || C)` — passes if ANY of 3 branches true. Implementation guarantees the `keys_only_in_user.includes("c")` branch specifically (line 131 sort). Should pin: `assert.ok(r.keys_only_in_user.includes("c") && r.keys_only_in_project.includes("b"))`.

P3 | test:317 (buildReport blocking) | `assert.equal(r.summary.drift_count, 3)` — strong. Good.

P3 | test:462 line 514 (Supabase) | Only asserts 2 of 3 scaffolded keys (`SUPABASE_PROJECT_URL`, `FIGMA_FILE_KEY`). `SUPABASE_ANON_K
... [+584 chars truncated]
