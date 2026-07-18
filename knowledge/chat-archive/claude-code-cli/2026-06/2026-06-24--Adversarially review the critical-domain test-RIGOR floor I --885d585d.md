---
type: "chat-session"
source: "claude-code-cli"
session_id: "885d585d-959c-404a-8eef-a5542d5006dd"
title: "Adversarially review the critical-domain test-RIGOR floor I just built (operator"
date: "2026-06-24"
first_ts: "2026-06-24T12:44:11.266Z"
last_ts: "2026-06-24T12:52:23.726Z"
cwd: "H:\\prism"
messages: 39
user_msgs: 15
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-ad44aff3816fc13cb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Adversarially review the critical-domain test-RIGOR floor I just built (operator

> **claude-code-cli** | 2026-06-24 | 39 msgs (15 user / 24 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-ad44aff3816fc13cb.jsonl`

## Transcript

### User | 2026-06-24T12:44:11.266Z

Adversarially review the critical-domain test-RIGOR floor I just built (operator directive: harden the anti-fake / anti-shallow-test enforcement). Read these files END-TO-END:
- H:/prism/.claude/helpers/lib/test-legitimacy-core.mjs  (the ADDED section at EOF: RIGOR_* regex consts, scoreTestRigor(), detectShallowCriticalTest())
- H:/prism/.claude/hooks/test-legitimacy.mjs  (the advisory wiring: the default export `testLegitimacy` near the metadata export, and the `main()` CLI path before the `invokedPath` block)
- H:/prism/.claude/hooks/__tests__/test-rigor-floor.test.mjs  (the tests, 14/14 passing)
- H:/prism/scripts/measure-test-rigor-corpus.mjs  (calibration harness)

INTENT/SPEC: This is the ORTHOGONAL axis to FAKE-test detection (placeholder/synthetic/mocked, already blocked by test-legitimacy). It catches SHALLOW = real-but-thin tests for the 7 CRITICAL DOMAINS. It is **ADVISORY ONLY (never hard-blocks)** — corpus calibration MEASURED that a hard block on "no failure-mode AND no adversarial" false-positives 42.6% of critical-domain tests (positive reference-value tests are the R9 gold standard, not shallow); restricting to the thin band (cases<=3 AND asserts<=6) drops the advisory to 1.5% (25/1656 files).

VERIFY RIGOROUSLY and grade PASS/FAIL with P0/P1 findings + file:line:
1. scoreTestRigor regex correctness: case counting (it/test/it.each), strong-assertion counting (incl Testing-Library DOM matchers), failure-mode detection (toThrow/rejects/toBeNaN/expect(()=>)), adversarial detection. ANY catastrophic backtracking risk? ANY mis-count that would flip advise wrongly?
2. INVARIANT: detectShallowCriticalTest must NEVER return block:true (advisory-only). Prove it from the code.
3. The advisory wiring must NOT weaken the existing fake-test BLOCK path — a tautology/.skip/.only/mocked-critical must STILL block. Confirm the block path runs first and is unchanged.
4. Fail-safety: the advisory cannot crash a PreToolUse hook on bad/empty/undefined input (a thrown hoo
... [+328 chars truncated]

### Assistant | 2026-06-24T12:44:16.321Z

I'll review the critical-domain test-RIGOR floor adversarially. Let me read all four files end-to-end first.

### Assistant | 2026-06-24T12:44:16.822Z

[tool_use: Read]

### Assistant | 2026-06-24T12:44:17.279Z

[tool_use: Read]

### Assistant | 2026-06-24T12:44:17.887Z

[tool_use: Read]

### Assistant | 2026-06-24T12:44:17.978Z

[tool_use: Read]

### User | 2026-06-24T12:44:21.035Z

[tool_result] 1	import path from "node:path";
2	import fs from "node:fs";
3	
4	const TEST_FILE_RE = /\.(test|spec)\.[cm]?[jt]sx?$/i;
5	
6	// ─── Goal / task-intent sources ────────────────────────────────────────────
7	const GOAL_STACK_PATH = "H:/PRISM/mcp-server/data/state/GOAL_STACK.json";
8	const CURRENT_POSITION_PATH = "H:/PRISM/state/CURRENT_POSITION.md";
9	
10	/**
11	 * LIVE_INTENT_KEYWORDS — when present
... [+34452 chars truncated]

### User | 2026-06-24T12:44:21.596Z

[tool_result] 1	// tier: T0
2	import fs from "node:fs";
3	/**
4	 * test-legitimacy.mjs — Phase 1 Tier 5D Workflow Hook
5	 * Blocks placeholder tests with no real assertions.
6	 */
7	
8	import * as path from "path";
9	import { fileURLToPath } from "node:url";
10	
11	function readStdinSafe() {
12	  try {
13	    if (process.stdin.isTTY) return "";
14	    return fs.readFileSync(0, "utf-8");
15	  } catch {
16	    re
... [+9153 chars truncated]

### User | 2026-06-24T12:44:22.164Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * measure-test-rigor-corpus.mjs -- calibration harness for the critical-domain
5	 * test-RIGOR floor (detectShallowCriticalTest in test-legitimacy-core.mjs).
6	 *
7	 * WHY: a Stop/PreToolUse gate that false-positives the live corpus gets
8	 * bypassed and erodes trust (the exact failure mode the presence-only dominance
9	 * rule was calibrated to avoid)
... [+5346 chars truncated]

### User | 2026-06-24T12:44:22.755Z

[tool_result] 1	// Tests for the critical-domain test-RIGOR floor (scoreTestRigor +
2	// detectShallowCriticalTest) in test-legitimacy-core.mjs, plus the live hook
3	// advisory path. Run directly: `node test-rigor-floor.test.mjs` (node:test
4	// auto-runs on exit; `node --test` reports 0 in this harness -- see
5	// reference_outcome_refpool_durable_2026_06_17).
6	//
7	// NOTE: the fake-test fixture is assemble
... [+8404 chars truncated]

### Assistant | 2026-06-24T12:44:28.823Z

I have all four files read end-to-end. Now let me verify the load-bearing claims adversarially. First, let me confirm the regex behaviors and the corpus calibration numbers, and check whether the advisory wiring touches the block path.

Let me verify the regex behaviors empirically with a quick harness, and confirm the corpus calibration claims.

### Assistant | 2026-06-24T12:44:42.542Z

[tool_use: Bash]

### Assistant | 2026-06-24T12:44:43.250Z

[tool_use: Bash]

### User | 2026-06-24T12:44:48.327Z

[tool_result] it.each chained .each: {"caseCount":2,"strongAssertions":0,"hasFailureMode":false,"hasAdversarialInput":false}
describe.it nesting: {"caseCount":2,"strongAssertions":0,"hasFailureMode":false,"hasAdversarialInput":false}
it. (method that is not each): {"caseCount":0,"strongAssertions":0,"hasFailureMode":false,"hasAdversarialInput":false}
it. concurrent: {"caseCount":0,"strongAssertions":1,"hasFailu
... [+1406 chars truncated]

### User | 2026-06-24T12:44:53.884Z

[tool_result] {
  "totalTests": 5525,
  "criticalDomainTests": 1657,
  "wouldBlock": 25,
  "pctOfCriticalBlocked": 1.5,
  "histogram": {
    "noFailNoAdv": 709,
    "hasFail": 127,
    "hasAdv": 528,
    "hasBoth": 293
  },
  "samples": [
    {
      "file": "H:/prism/mcp-server/src/__tests__/cam-dispatcher-schema-collision.test.ts",
      "domains": "cam-programming",
      "cases": 2,
      "asserts": 2
    }
... [+698 chars truncated]

### Assistant | 2026-06-24T12:45:00.027Z

The corpus numbers confirm the claim (25/1657 = 1.5%). Now let me probe deeper on the failure-mode false-positive I spotted (`not.toThrow` counts as failure-mode) and the catastrophic-backtracking risk on the `expect\s*\(\s*(?:\(\s*\)\s*=>|async\b)` pattern, plus the `[^.\w](?:invalid|negative)\b` adversarial regex which could mis-fire on benign imports/comments.

### Assistant | 2026-06-24T12:45:17.127Z

[tool_use: Bash]

### User | 2026-06-24T12:45:23.272Z

[tool_result] --- failure-mode FP surface ---
expect(()=>x).toEqual(5): true
expect(async()=>{...}).resolves: true
--- adversarial FP surface ---
describe('invalidates cache'): false
setInvalid (camel): false
'is invalid' string: true
(invalid): true
Negative in comment: true
--- exemption via benign 'invalid' string in happy test ---
happy test w/ 'invalid' in title -> advise: false hasAdv: true
--- ReDoS prob
... [+102 chars truncated]

### Assistant | 2026-06-24T12:45:28.450Z

Confirmed. No ReDoS (all linear-time — the regexes are non-backtracking by construction). Now the key finding: `expect(()=>x).toEqual(5)` and `expect(async()=>...).resolves` both register `hasFailureMode:true` even though they are NOT failure-mode tests. But I need to verify the DIRECTION of impact — this over-detection of failure-mode EXEMPTS a test from the advisory (false negative = under-advise), which is the safe direction for an advisory. Let me confirm that, and verify the block-path-first ordering and fail-safety on undefined input through the actual hook entrypoint.

### Assistant | 2026-06-24T12:45:34.646Z

[tool_use: Bash]

### Assistant | 2026-06-24T12:45:40.951Z

[tool_use: Bash]

### User | 2026-06-24T12:45:42.261Z

[tool_result] --- default export fail-safety ---
no input -> {"allow":true}
null input -> THREW: Cannot read properties of null (reading 'file_path')
undefined input -> THREW: Cannot read properties of undefined (reading 'file_path')
Write empty content -> {"allow":true}
Edit no new_string -> {"allow":true}
MultiEdit no edits -> {"allow":true}
non-test path -> {"allow":true}
non Write/Edit tool -> {"allow":true
... [+1 chars truncated]

### User | 2026-06-24T12:45:49.977Z

[tool_result] --- CLI fail-safety (continueOnError:false would block on a crash) ---
1. empty stdin:
{"continue":true}

2. garbage stdin:
{"continue":true}

3. null tool_input:
{"continue":true}

4. missing fields:
{"continue":true}

5. Write critical thin (advisory expected):
{"continue":true}

6. Write critical with .skip (BLOCK expected, advisory must NOT replace block):
{"continue":true}

### Assistant | 2026-06-24T12:45:56.135Z

Two important findings surfaced. Let me investigate both carefully.

**Finding A:** The default export `testLegitimacy` THREW on `{tool:"Write", input:null}`. But I need to check whether the harness ever calls it with a null `input` — the CLI `main()` path defaults `input` to `{}`, so the throw may be unreachable in production. Let me check how the default export is invoked by the harness vs the CLI.

**Finding B (CRITICAL):** CLI probe #6 with `it.skip` returned `{"continue":true}` — NOT a block. That contradicts the test `E2E: hook still BLOCKS a fake tautological test`. I need to determine whether `it.skip` is genuinely not blocked, or whether my shell-escaped payload failed to deliver the content. Let me verify with a clean JSON payload via a file.

### Assistant | 2026-06-24T12:46:04.213Z

[tool_use: Bash]

### User | 2026-06-24T12:46:09.992Z

[tool_result] === .skip ===
{"decision":"block","reason":"TEST LEGITIMACY GATE — BLOCKED\n\nSpeedFeedX.test.ts is not valid coverage:\n- placeholder test pattern: skipped test\n\nWrite real assertions against real behavior. Synthetic loops, placeholder assertions, and mocked critical-domain SUTs do not count."}

=== .only ===
{"decision":"block","reason":"TEST LEGITIMACY GATE — BLOCKED\n\nSpeedFeedX.test.ts is 
... [+1719 chars truncated]

### Assistant | 2026-06-24T12:46:15.945Z

The block path is fully intact — Finding B was a false alarm from my own `printf` shell-escaping corruption (the earlier `\"` escapes mangled the JSON content). With clean JSON: `.skip`, `.only`, tautology, and 2× `vi.mock` critical-domain SUT all correctly return `{"decision":"block"}`, and the block runs FIRST (the advisory only emits when `reasons.length === 0`). 

Now let me resolve Finding A — is the default export `testLegitimacy` reachable with a `null` input in production, and how is it actually wired into settings.json?

### Assistant | 2026-06-24T12:46:19.724Z

[tool_use: Bash]

### User | 2026-06-24T12:50:39.825Z

[tool_result] === how is test-legitimacy wired in settings.json? (CLI via node, or default-export via harness?) ===
H:/prism/.claude/settings.json:532:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/test-legitimacy.mjs",

=== does anything IMPORT the default export testLegitimacy (vs CLI spawn)? ===
H:/prism/.claude/hooks/__tests__/test-legitimacy.test.mjs:23:  pathToFileURL(path
... [+3268 chars truncated]

### Assistant | 2026-06-24T12:50:45.801Z

Production wiring is confirmed: settings.json line 532 invokes the **CLI path** (`node test-legitimacy.mjs` reading stdin → `main()`), not the default export. The CLI `main()` defaults `input` to `{}` (line 158), so the `null`-input throw in the default export is unreachable via the wired hook. The CLI path is robust (all garbage-input probes returned `{"continue":true}`). The only importer of the default export is its own test file. Let me confirm the default export's own test file doesn't pass null, and check the `effectiveFullContent` on-disk read for a fail-safety gap (it does a real `fs.readFileSync` during a PreToolUse).

### Assistant | 2026-06-24T12:50:52.494Z

[tool_use: Bash]

### User | 2026-06-24T12:50:57.173Z

[tool_result] === effectiveFullContent reads disk during Edit/MultiEdit -- can a bad file_path crash it? ===
Edit missing-file critical -> {"allow":true,"advisory":"TEST RIGOR ADVISORY -- NoSuchSpeedFeed.test.ts: THIN CRITICAL-DOMAIN TEST (advisory): file covers cutting-parameter calculator + variability with only 1 case(s) and 1 assertion(s), exercising the happy path only -- no failure-mode assertion (toThrow
... [+643 chars truncated]

### Assistant | 2026-06-24T12:51:02.788Z

Another fail-safety edge: non-string `content` (number/object) throws `content.match is not a function` in the default export. But I must check whether this is reachable via the **wired CLI path**. In `main()`, `contentFromInput` returns `input.content || ""` for a Write — if `content` is the number `12345`, that's truthy and passes through as a number to `analyzeTestContent` → `detectSyntheticGeneration` → `.match()` throws. Let me verify whether the CLI path crashes (which WOULD matter, since the CLI is wired) and confirm the `main().catch()` safety net handles it.

### Assistant | 2026-06-24T12:51:08.185Z

[tool_use: Bash]

### User | 2026-06-24T12:51:21.265Z

[tool_result] === CLI path with non-string content (number) -- does main() crash or fail-safe? ===
{"continue":true}
  exit=0

=== CLI with content object ===
{"continue":true}
  exit=0

=== CLI with content array of edits (MultiEdit) where edit is non-object ===
{"continue":true}
  exit=0

=== sanity: is main() wrapped so a throw still emits continue:true? (line 203 .catch) ===
1:async function main() {
7:  } 
... [+393 chars truncated]

### Assistant | 2026-06-24T12:51:29.775Z

Decisive on Finding 4 (fail-safety): the wired CLI path is bulletproof. The number-content case returns `{"continue":true}` exit 0 because:
- For `content:12345`, `contentFromInput` returns `12345` (truthy) → but wait, it returned `{continue:true}` cleanly. The `main().catch()` net at line 203-205 catches any throw and emits `{"continue":true}`. So even a `content.match` throw inside `analyzeTestContent` is caught and fails open. The hook can NEVER block a tool call by crashing.

Let me do the final adversarial checks: (1) confirm the `RIGOR_MIN_CASES` floor prevents a non-test fixture (0 cases) from being advised, (2) verify the `effectiveFullContent` Edit-fragment splicing doesn't let a thin Edit fragment mis-trigger when the full on-disk file is already rigorous, and (3) confirm the histogram `noFailNoAdv=709` vs `wouldBlock=25` proves the thin-band restriction is doing the FP-suppression work claimed.

### Assistant | 2026-06-24T12:51:39.776Z

[tool_use: Bash]

### User | 2026-06-24T12:51:45.129Z

[tool_result] zero-case crit file advise: false
3 cases / 6 asserts (at boundary) advise: true {
  caseCount: 3,
  strongAssertions: 6,
  hasFailureMode: false,
  hasAdversarialInput: false
}
4 cases (just over) advise: false 4
thin+toBeNaN exempt: false
spliced-full-has-throw advise: false

### Assistant | 2026-06-24T12:52:23.726Z

All boundary behaviors confirmed correct: zero-case → no advise; thin-band edges (≤3/≤6) advise, just-over (4 cases) exempt; failure-mode/adversarial smoke exempts; the `effectiveFullContent` splice means a rigorous full file with one throw exempts even a thin Edit fragment. I have everything I need to render a verdict.

---

VERDICT: PASS

summary: The critical-domain test-RIGOR floor is correctly built as an ORTHOGONAL, ADVISORY-ONLY layer. I verified end-to-end that `detectShallowCriticalTest` can never return `block:true`, that the advisory wiring runs strictly AFTER and does not weaken the existing fake-test BLOCK path (`.skip`/`.only`/tautology/2×mock all still block via the wired CLI), that the wired CLI entrypoint cannot crash a `continueOnError:false` PreToolUse hook on any malformed input, and that the corpus calibration reproduces (25/1657 = 1.5% thin-band advisory). The regexes are non-backtracking (all ReDoS probes linear-time, sub-5ms on 50-100k pathological inputs). The two minor over-detections I found (`not.toThrow`/`.resolves` count as failure-mode; benign `"invalid"` strings count as adversarial) both push in the SAFE direction (they EXEMPT from an advisory = under-advise, never over-block), correct for an advisory.

findings:

- [P2] `H:/prism/.claude/helpers/lib/test-legitimacy-core.mjs:633` -- `RIGOR_FAILURE_MODE_RE` matches `expect\s*\(\s*(?:\(\s*\)\s*=>|async\b)` unconditionally, so `expect(() => obj.x).toEqual(5)` (a lazy-getter positive assert) and `expect(async () => f()).resolves.toBe(1)` (a happy-path resolve) both register `hasFailureMode:true` (verified: probe2 returned `true` for both). This is an over-detection that EXEMPTS such a test from the advisory. Direction is SAFE for an advisory (under-advise, never over-block), so P2 not P1. -- Fix (optional): tighten to require a throwing matcher / rejection in the same expression, e.g. anchor on `\.toThrow`/`\.rejects` rather than the arrow alone; acceptable to defer given advisory-only s
... [+4266 chars truncated]
