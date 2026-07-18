---
type: "chat-session"
source: "claude-code-cli"
session_id: "321c1d3f-573b-4b70-b640-f87f9336e18a"
title: "Adversarially verify H:/prism/scripts/lib/nc-normalize.mjs (compareNC/normalizeN"
date: "2026-06-03"
first_ts: "2026-06-03T01:19:13.336Z"
last_ts: "2026-06-03T01:23:11.305Z"
cwd: "H:\\prism"
messages: 24
user_msgs: 9
assistant_msgs: 15
raw_file: "H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/workflows/wf_57c6a296-6f2/agent-a59f3511a09a8608d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Adversarially verify H:/prism/scripts/lib/nc-normalize.mjs (compareNC/normalizeN

> **claude-code-cli** | 2026-06-03 | 24 msgs (9 user / 15 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/321c1d3f-573b-4b70-b640-f87f9336e18a/subagents/workflows/wf_57c6a296-6f2/agent-a59f3511a09a8608d.jsonl`

## Transcript

### User | 2026-06-03T01:19:13.336Z

Adversarially verify H:/prism/scripts/lib/nc-normalize.mjs (compareNC/normalizeNC) — a SAFETY-GATE primitive. PRIMARY question: can compareNC report equal:true for two SEMANTICALLY different NC programs under DEFAULT options? Probe the leading-block-number strip regex, blank-run collapse, trailing-ws strip, and the array vs grouped-object code paths for a fail-OPEN. Read the file + scripts/lib/nc-normalize.test.mjs. Report any fail-open case found (with a concrete input) and end with GRADE: PASS or GRADE: FAIL.

### Assistant | 2026-06-03T01:19:23.377Z

I'll adversarially verify this safety-gate primitive. Let me read both files.

### Assistant | 2026-06-03T01:19:23.850Z

[tool_use: Read]

### Assistant | 2026-06-03T01:19:24.243Z

[tool_use: Read]

### User | 2026-06-03T01:19:27.169Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\nc-normalize.mjs' was already read 4m ago in this session and is unchanged (mtime 1780431220925). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T01:19:31.994Z

[tool_result] 1	// nc-normalize.test.mjs — real-behavior tests for the strict NC normalizer + comparator.
2	// Run: node --test scripts/lib/nc-normalize.test.mjs
3	import { test } from "node:test";
4	import assert from "node:assert/strict";
5	import { existsSync, readFileSync } from "node:fs";
6	import { normalizeNC, compareNC } from "./nc-normalize.mjs";
7	
8	// ─── normalizeNC: per-rule behavior ─────────────
... [+5638 chars truncated]

### Assistant | 2026-06-03T01:19:34.911Z

I have the test file. The main source file was read earlier in this session but I need its content to analyze. Let me read it with a cache bypass since it's load-bearing for this verification.

### Assistant | 2026-06-03T01:19:35.794Z

[tool_use: Bash]

### User | 2026-06-03T01:19:59.984Z

[tool_result] // nc-normalize.mjs — strict NC/G-code normalizer + byte-equivalence comparator.
//
// The shared CORE of the Haas golden round-trip / byte-equivalence harness (echo's
// refuse-clause: "shipping-post-without-byte-equivalence-vs-golden") AND the CIMCO
// File-Compare consumer of SPINE-1 (`prism_cimco`). CIMCO File Compare is too lenient
// (it silently ignores block renumber + spacing); PRISM does
... [+6793 chars truncated]

### Assistant | 2026-06-03T01:20:08.565Z

Now I have the full source. Let me analyze each transformation path adversarially, focusing on the PRIMARY question: can `compareNC` report `equal:true` for two SEMANTICALLY DIFFERENT programs under DEFAULT options?

Let me reason through each rule, then empirically test the candidate fail-open cases I identify.

**Analysis of the per-line pipeline (default opts):**

1. `normalizeEol`: `\r\n?` → `\n`. Safe — EOL is non-semantic.
2. `stripBlockNumbers`: `^[ \t]*[Nn]\d+[ \t]?` → "". This is the highest-risk regex. It strips a leading N-word. Two concerns:
   - Does it strip an N that is NOT a block number but a semantic address? On Fanuc/Haas, leading `N` is the sequence/block number — non-semantic. But what about a line that legitimately starts with something that looks like `N\d+` but means something else?
   - The regex strips exactly ONE leading `N\d+` plus at most ONE trailing space/tab. What's left could collide.
3. `stripTrailingWs`: trailing `[ \t]+` → "". Safe.
4. `collapseBlankRuns`: collapses blank runs + trims. Could this merge two semantically distinct programs? Blank lines are non-semantic in NC.

Let me probe the concrete adversarial cases empirically.

### Assistant | 2026-06-03T01:20:26.438Z

[tool_use: Bash]

### User | 2026-06-03T01:20:41.672Z

[tool_result] Exit code 1
node:internal/modules/run_main:122
    triggerUncaughtException(
    ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\Users\wompu\AppData\Local\Temp\scripts\lib\nc-normalize.mjs' imported from C:\Users\wompu\AppData\Local\Temp\nc-adv.mjs
Did you mean to import "../../../../../../H:/prism/scripts/lib/nc-normalize.mjs"?
    at finalizeResolution (node:internal/modules/esm/re
... [+660 chars truncated]

### Assistant | 2026-06-03T01:20:44.843Z

Path resolution issue — the temp file resolves the relative import against /tmp. Let me use an absolute file URL import and put the probe in the repo dir.

### Assistant | 2026-06-03T01:21:05.547Z

[tool_use: Bash]

### User | 2026-06-03T01:21:22.914Z

[tool_result] ok  [renumber-noop] equal=true (expected true)
ok  [two-vs-one-space-after-N] equal=false (expected false)
ok  [double-N-only-one-stripped] equal=false (expected false)
ok  [comment-differs] equal=false (expected false)
ok  [semicolon-comment-differs] equal=false (expected false)
ok  [case-differs] equal=false (expected false)
ok  [inner-spacing-differs] equal=false (expected false)
ok  [coord-cha
... [+409 chars truncated]

### Assistant | 2026-06-03T01:21:29.969Z

All 15 cases behave as expected. Cases 11 and 12 (`N5ABC`→`ABC`, `N5X10`→`X10`) are theoretically interesting but NOT fail-opens in real NC: leading `N\d+` is unambiguously a block number in Fanuc/Haas/ISO dialects, and there is no legitimate address word that leads with `N`. So those are correct.

Now let me probe the dimension the prompt explicitly named that I haven't yet hit: **the array vs grouped-object code paths**. The source I read has a single code path (per-line array map, then join). The prompt mentions "array vs grouped-object" — this may refer to a different/older signature, or `compareNC` may accept structured input somewhere. Let me check whether there's a grouped-object path, and probe deeper edge cases on the regexes (unicode digits, the `?` quantifier, EOL-off interaction).

### Assistant | 2026-06-03T01:21:32.142Z

[tool_use: Grep]

### User | 2026-06-03T01:21:36.710Z

[tool_result] 22: * @typedef {Object} NormalizeOptions
59:  // 1. line endings → LF, then split.
62:  let lines = src.split("\n");
100: * @typedef {Object} CompareResult
119:  const la = na.split("\n");
120:  const lb = nb.split("\n");

### Assistant | 2026-06-03T01:21:49.942Z

[tool_use: Bash]

### User | 2026-06-03T01:22:18.574Z

[tool_result] ok  [CR-between] equal=true (expected true)
ok  [CRCRLF] equal=true (expected true)
ok  [fullwidth-digit-N] equal=false (expected false)
ok  [N-no-digit] equal=false (expected false)
ok  [tab-after-N] equal=true (expected true)
ok  [decimal-trailing-zero] equal=false (expected false)
ok  [leading-zero] equal=false (expected false)
ok  [plus-sign] equal=false (expected false)
ok  [modal-vs-explicit
... [+282 chars truncated]

### Assistant | 2026-06-03T01:22:24.048Z

All cases correct. The grep confirms there is **only one code path** — a per-line array (`split("\n")` → `map` → `join`). There is no grouped-object code path in the current source; the "array vs grouped-object" framing in the prompt must refer to a historical signature or a sibling. `compareNC` re-normalizes both inputs through the identical single path, so there is no divergent path to fail-open between.

Let me run the existing test suite to confirm the shipped behavior matches, then do a final targeted hunt on the two subtle residual-space and EOL-off interactions that are the most plausible places a real divergence could hide.

### Assistant | 2026-06-03T01:22:41.180Z

[tool_use: Bash]

### User | 2026-06-03T01:22:54.072Z

[tool_result]   ...
# Subtest: integration: a real golden Haas NC normalizes idempotently + self-compares equal
ok 17 - integration: a real golden Haas NC normalizes idempotently + self-compares equal
  ---
  duration_ms: 0.5217
  ...
# Subtest: integration: injecting block numbers into a real golden NC still compares EQUAL (renumber-invariance)
ok 18 - integration: injecting block numbers into a real golden NC
... [+457 chars truncated]

### Assistant | 2026-06-03T01:23:11.305Z

All 18 shipped tests pass, and all my adversarial cases behave correctly. Probe files cleaned up. Verification complete.

GRADE: PASS

## Findings

`compareNC`/`normalizeNC` in `H:/prism/scripts/lib/nc-normalize.mjs` is a **fail-CLOSED** safety primitive under default options. I found **no fail-open case** — no pair of semantically-different NC programs that report `equal:true` by default.

**Architecture:** There is only ONE code path, not an "array vs grouped-object" split. The current source does `split("\n") → map(perLineRules) → join("\n")` (a per-line array pipeline), and `compareNC` re-runs both inputs through that identical path before a strict `===`. Since both sides traverse the same normalization, there is no divergent path between which a fail-open could hide. The "grouped-object" path named in the prompt does not exist in this version (likely a historical signature).

**Probed surfaces — all sound:**

- **Leading-block-number strip** (`/^[ \t]*[Nn]\d+[ \t]?/`): Strips exactly one leading `N\d+` + at most one trailing ws. Non-greedy (`N5 N10 G1`→`N10 G1`, not `G1`). `\d` is ASCII-only so fullwidth digits aren't touched (over-strict, not fail-open). Across all ISO/Fanuc/Haas/Mazak dialects, a leading `N\d+` is unambiguously a sequence number — no real address word leads with `N`, so the strip cannot eat a semantic address. Renumber-invariance is correct (`N100 G1 X5` == `N5 G1 X5`), proven on a real golden Haas NC (integration test 18).
- **Blank-run collapse**: Only removes/collapses BLANK lines and trims leading/trailing blanks; non-blank line content and ORDER are preserved (`reordered-lines` correctly UNEQUAL; `two-lines-vs-one` correctly UNEQUAL — it never merges two non-blank lines).
- **Trailing-ws strip**: `[ \t]+$` only — does NOT eat `\r`, so it can't silently equate CRLF/LF when `normalizeEol:false`. The one asymmetry I found (residual *leading* space when two spaces follow an N) produces a FALSE-NEGATIVE (over-strict), never a fail-open.
- **C
... [+797 chars truncated]
