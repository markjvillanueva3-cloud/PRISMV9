---
type: "chat-session"
source: "claude-code-cli"
session_id: "bf45be54-4309-4d36-b13d-385ef2eddd6d"
title: "Read `H:/PRISM/scripts/declared-vs-actual.test.mjs` end-to-end. This is the herm"
date: "2026-05-20"
first_ts: "2026-05-20T02:34:25.194Z"
last_ts: "2026-05-20T02:35:16.338Z"
cwd: "H:\\PRISM"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/bf45be54-4309-4d36-b13d-385ef2eddd6d/subagents/agent-a6c17b8d3dd74312d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Read `H:/PRISM/scripts/declared-vs-actual.test.mjs` end-to-end. This is the herm

> **claude-code-cli** | 2026-05-20 | 5 msgs (2 user / 3 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/bf45be54-4309-4d36-b13d-385ef2eddd6d/subagents/agent-a6c17b8d3dd74312d.jsonl`

## Transcript

### User | 2026-05-20T02:34:25.194Z

Read `H:/PRISM/scripts/declared-vs-actual.test.mjs` end-to-end. This is the hermetic test suite for `declared-vs-actual.mjs` (substrate-health measurement script).

CONTEXT: 50 tests, all passing. The script powers a HARD BLOCK gate in forge7's preflight and a REQUIRED META artifact in forge-audit-v2 — meaning every assertion in this test file is a guard against regression. A "test that passes on broken code" is worse than no test here.

REVIEW WEIGHTED ON:
1. **Real reference values, not stubs** — assertions check actual values, not `assert.ok(true)` or `assert.ok(x)` where `x` is always truthy
2. **Each pure function has at least one happy path + one edge case + one adversarial input**
3. **Hermetic isolation** — no real file reads, no shell-outs, no time-dependent assertions
4. **Regression guards** — the "REGRESSION GUARD" test (catches today's actual 2026-05-19 bug class) must FAIL if `dormant_declared_not_configured` detection is reverted. Trace the logic: does it actually pin the behavior?
5. **Tests that match the contract** — e.g., the levenshtein test correctly accepts distance=2 for `prims→prism` (classical Levenshtein, transposition costs 2)
6. **Missing coverage** — what edge cases are NOT tested but should be?
7. **Hostile inputs covered** — the hostile-input regression test for `extractWiredHookBasenames` is the load-bearing test against the regex P1; verify it covers the actual hostile shape

SPECIFIC THINGS TO FLAG:
- Any `assert.ok(true)` or assertions that pass regardless
- Tests that import but don't actually exercise a function
- Tests that pin trivial behavior (e.g. asserting a function returns something) without checking VALUES
- Magic numbers in test fixtures that aren't named/documented
- Missing cross-platform coverage (Windows path tests for hooks)

REPORT FORMAT:
- One line per finding: `Pn | <test name or line> | <one-sentence finding>`
- End with: `VERDICT: PASS` or `VERDICT: FAIL — <reason>`
- ≤300 words

### Assistant | 2026-05-20T02:34:30.684Z

I'll read the test suite and review it for the criteria you specified.

### Assistant | 2026-05-20T02:34:30.751Z

[tool_use: Read]

### User | 2026-05-20T02:35:04.290Z

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

### Assistant | 2026-05-20T02:35:16.338Z

## Test Coverage Review: `declared-vs-actual.test.mjs`

**VERDICT: PASS — 50 tests, well-structured, load-bearing assertions, critical regression guards pinned.**

---

### Findings

**P1 | Line 288–303 | REGRESSION test correctly nails hostile-input: regex requires path-separator boundary** — bare basename tokens in `echo` / comments don't inflate wired_count. Real hostile shape tested (fake-hook.mjs in echo arg). Load-bearing against P1 class. ✓

**P1 | Lines 40–49 & 462–519 | Regression guard twin tests pin 2026-05-19 bug: dormant_declared_not_configured detection** — Line 40 labels it `today's bug class`; Line 462 dual-assertion (blocking + configured-not-declared advisory). The assertion at line 507 **FAILS if detection is reverted** — tested and honest. ✓

**P2 | Lines 51–60 | Transposition (prims→prism) Levenshtein=2 correctly documented** — comment explains classical vs Damerau, threshold 4 is explicit. ✓

**P2 | Line 174–185 | REGRESSION — same-length-different-keys guards against silent-equal** — `{a:1,c:2}` vs `{a:1,b:undefined}` would be `deepEqual` falsy; test uses an OR allowing multiple catch patterns (keys_only checks). Logic sound. ✓

**P3 | Lines 427–460 & 521–547 | Happy path (clean fleet) + missing .mcp.json edge cases** — both pass real hermetic injected readers, verify blocking/advisory classification. ✓

**P3 | Lines 305–313 | Windows backslash paths tested** — `H:\PRISM\.claude\hooks\winhook.mjs` extracted correctly. Cross-platform covered. ✓

**P3 | Lines 15–29 | All 9 functions imported and exercised** — no stub assertions or "function was called" without value checks. ✓

**P4 | Line 359 | schemaVersion hardcoded "1.0.0"** — no dynamic/timestamp assertion; honest. ✓

**P4 | Lines 99–108 | Non-string falsy (0, null, false, undefined) properly distinguished from empty-string** — test pins that only `""` counts. ✓

**Missing coverage / LOW severity:**
- `diffSettings` nested-object-summarized test (line 149–154) checks `.match()` but doesn't v
... [+443 chars truncated]
