---
type: "chat-session"
source: "claude-code-cli"
session_id: "eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf"
title: "Independent second-pass review of `H:/prism/scripts/lib/zebra-context-bundle.tes"
date: "2026-05-21"
first_ts: "2026-05-21T16:38:06.622Z"
last_ts: "2026-05-21T16:39:57.489Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a6b06acda3769b464.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Independent second-pass review of `H:/prism/scripts/lib/zebra-context-bundle.tes

> **claude-code-cli** | 2026-05-21 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a6b06acda3769b464.jsonl`

## Transcript

### User | 2026-05-21T16:38:06.622Z

Independent second-pass review of `H:/prism/scripts/lib/zebra-context-bundle.test.mjs` (just created, 26 tests, 26/26 PASS). Companion lib at `H:/prism/scripts/lib/zebra-context-bundle.mjs`. Unit U-ZO-MS0-01 of ZEBRA-OMNISCIENT-MS0 (spec `H:/prism/state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md`).

You are arm B — assume arm A (test-review-agent) checks coverage + acceptance criteria. Your weighting: gaps arm A might miss.

Read the whole test file. Focus on:
1. **Silent-failure class** — any assertion that would silently pass under a regression? E.g. asserting only "ok:true" without checking the actual content/mtime returned?
2. **Wrong assertions** — does `assert.equal(reader.calls.get(p), 2)` actually prove the reader was called twice, or could the Map default-undefined trip it (the answer should be: assert.equal(reader.calls.get(p), 2) DOES fail if undefined !== 2). Verify each `reader.calls.*` assertion is correct.
3. **Test-mock-vs-real divergence** — the injected reader returns `{ok:true, content, mtime}`; the defaultReader uses the same shape. If the shape diverges in the future, do the tests catch it? Suggestion needed?
4. **Path normalization test** — the test uses `/tmp/zct-norm-test.md` and `/tmp/./zct-norm-test.md`. On Windows, `path.resolve("/tmp/zct-norm-test.md")` and `path.resolve("/tmp/./zct-norm-test.md")` should both produce the same string. Does this test actually probe the normalization on Windows?
5. **Real-data E2E robustness** — does `loadBrief({})` actually exercise `defaultReader` (the production code path) or could a leaked env var route it elsewhere? Is `beforeEach` cleanup sufficient?
6. **Naming conformance** — matches `zebra-awareness-pipeline.test.mjs` style (describe/it/node:test/node:assert)?
7. **Anti-regression coverage** — does the test suite pin all 4 design invariants from the lib's header docstring (fail-soft / pure-core+injected-reader / mtime-keyed cache / stale-mark)?
8. **Operator surprise** — env knob tests (`PRISM_ZEBRA
... [+171 chars truncated]

### Assistant | 2026-05-21T16:38:37.583Z

I'll read both files and analyze the test suite.

### Assistant | 2026-05-21T16:38:37.761Z

[tool_use: Read]

### User | 2026-05-21T16:38:42.191Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\zebra-context-bundle.test.mjs' was already read 7s ago in this session and is unchanged (mtime 1779381231590). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-21T16:38:46.068Z

[tool_use: Bash]

### User | 2026-05-21T16:39:15.832Z

[tool_result] // ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — tests for the CLAUDE-BRIEF + BUILD-VISION
// reader. Hermetic via injected synthetic reader + node:test + node:assert/strict.
//
// Acceptance criteria from `state/shared/specs/ZEBRA-OMNISCIENT-MS0-PLAN.md` §7:
//   - tests pin fail-soft + cache-hit + ttl-expiry + stale-mark behavior
//   - one real-data E2E per the MS1 P0 lesson
//     ("pure-core+injected-re
... [+12588 chars truncated]

### Assistant | 2026-05-21T16:39:19.538Z

[tool_use: Read]

### User | 2026-05-21T16:39:28.701Z

[tool_result] 1	// ZEBRA-OMNISCIENT-MS0/U-ZO-MS0-01 — CLAUDE-BRIEF + PRISM-BUILD-VISION reader
2	// with mtime-keyed cache layer for the Zebra orchestrator sweep.
3	//
4	// Purpose: ONE place that reads the 2 highest-leverage goal-anchor files
5	// (CLAUDE-BRIEF.md — what we have, PRISM-BUILD-VISION.md — what we're trying
6	// to build) so the Zebra orchestrator's `planSlotAction` can make
7	// goal-aware decis
... [+10181 chars truncated]

### Assistant | 2026-05-21T16:39:57.489Z

## Independent second-pass review — `zebra-context-bundle.test.mjs`

**P1 — path-normalization test is tautological on Windows.** Test at L194-207 passes both `abs` and `dotForm` keys to the synthetic reader, so the second call resolves to a cache key that maps to either-or; the assertion only checks `second.source === "cache"`. On Windows, `path.resolve("/tmp/zct-norm-test.md")` produces `H:\tmp\zct-norm-test.md` (drive-relative), and `path.resolve("/tmp", "./zct-norm-test.md")` produces the same — but the test would also pass if normalization were broken because the reader has both keys registered. Fix: register ONLY `[abs]` in the reader; if normalization fails, the second call routes to `dotForm` (un-registered) → falls through to `reason:"missing"`, surfacing the break.

**P1 — env-knob TTL test relies on synthetic-reader-no-stat branch (L150-156).** `env-ttl` test sets `TTL_MS=1`, calls at `FAKE_NOW`, then `FAKE_NOW+1000`. The injected-reader branch trusts TTL alone — correct here — but the test never proves TTL is read from env vs. defaulted. With `DEFAULT_TTL_MS=60_000`, a 1000ms gap would cache-hit. The test passes because env is honored. Suggestion: add inverse test — `TTL_MS=999999`, 1000ms gap, expect `source:"cache"` to lock in env-read behavior.

**P2 — reader-shape divergence not pinned.** Tests use `{ok, content, mtime}` but `defaultReader` also returns `errno` on read-error. No test asserts `errno` propagation through `buildEnvelope` (where it's silently dropped). If a future maintainer adds errno to the envelope, no test catches it. Add: `errno` is preserved or explicitly dropped — pick one and pin.

**P2 — real-data E2E branches on `fs.existsSync`.** L324, L336 — if the brief is missing on a fresh checkout, test passes the `reason:"missing"` branch and never exercises the happy path. The MS1 P0 lesson is "real-data E2E"; an existence-conditional test isn't real-data when the file isn't there. Suggestion: skip via `test.skip(!fs.existsSync(...))` s
... [+1497 chars truncated]
