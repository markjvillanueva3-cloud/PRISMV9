---
type: "chat-session"
source: "claude-code-cli"
session_id: "b7530614-3417-4245-bc20-f90161b872c9"
title: "Independent second-pass review of `H:/prism/.claude/hooks/activate-before-build-"
date: "2026-05-19"
first_ts: "2026-05-19T04:36:37.374Z"
last_ts: "2026-05-19T04:39:26.023Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-acdf313bb29fdd703.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Independent second-pass review of `H:/prism/.claude/hooks/activate-before-build-

> **claude-code-cli** | 2026-05-19 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b7530614-3417-4245-bc20-f90161b872c9/subagents/agent-acdf313bb29fdd703.jsonl`

## Transcript

### User | 2026-05-19T04:36:37.374Z

Independent second-pass review of `H:/prism/.claude/hooks/activate-before-build-precheck.test.mjs`.

44/44 tests pass. DO NOT assume arm A caught everything. You weight differently — focus on:
- **Test integrity / silent breakage** — does every test ACTUALLY assert what the description says, or does some `assert.equal(out.X, undefined)` pass by accident because the test fixture path doesn't match the regex?
- **Stale-test risk** — if the production code's path filter changes, will the tests catch it? If `decide()` returns a different output shape, will the tests catch it?
- **R7 weighting** — does the test suite quietly skip / weaken anything to make it green? Any `.skip`, `xfail`, comment-out, or hidden conditional?
- **Real-data fail-on-revert oracle** — is there at LEAST ONE test that uses production-shape inputs and asserts the production-shape output, NOT a hermetic stub?
- **Cross-platform path correctness** — Windows fixtures use forward-slash everywhere; does that cover the real production scenario where Claude Code passes Windows backslash paths? (See [[feedback_misc_tasks_extraction_2026_05_16]] §case-insensitive path compare for the precedent class.)
- **Subprocess oracle thoroughness** — does the CLI subprocess test cover the FAILURE paths (lib load failure, malformed sidecar, etc) or only the no-op fast paths?
- **Convention conformance with PRISM test style** — does it match the sibling test patterns (hermetic, fast, deterministic, no real-fs dependency unless explicitly testing real-fs)?
- **Magic numbers** — any hardcoded numbers (timeouts, K values) that should be derived from constants the production code exports?

Return PASS or FAIL with P0/P1/P2/P3 findings. Cite test:line. If FAIL, list every P0/P1 with concrete fix. Be strict.

Read the test file end-to-end PLUS the production code at `H:/prism/.claude/hooks/activate-before-build-precheck.mjs` so you can verify the contract is right. Spec is at `H:/prism/state/shared/specs/UNITS/U-ACTIVATE-BEF
... [+23 chars truncated]

### Assistant | 2026-05-19T04:36:53.620Z

I'll perform an independent second-pass review of the test file, focusing on the angles you specified.

### Assistant | 2026-05-19T04:36:54.488Z

[tool_use: Read]

### User | 2026-05-19T04:36:59.195Z

[tool_result] 1	// activate-before-build-precheck.test.mjs — node:test suite
2	//
3	// U-ACTIVATE-BEFORE-BUILD-PRECHECK (JULIETT-12CHAT-ALLOCATION-MS0)
4	//
5	// Covers the pure-core (classifyPath, buildQuery, renderBlock, clampedTopK,
6	// searchWithTimeout, decide) PLUS a real-subprocess CLI smoke that proves the
7	// stdin→stdout wiring + script-guard work in the published artifact (per the
8	// "pure core +
... [+15537 chars truncated]

### Assistant | 2026-05-19T04:37:03.216Z

Now let me read the production code and spec to verify the contract.

### Assistant | 2026-05-19T04:37:03.892Z

[tool_use: Read]

### User | 2026-05-19T04:37:05.970Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\activate-before-build-precheck.mjs' was already read 54s ago in this session and is unchanged (mtime 1779164653409). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-05-19T04:37:09.586Z

[tool_use: Read]

### User | 2026-05-19T04:37:14.917Z

[tool_result] 1	---
2	unit_id: U-ACTIVATE-BEFORE-BUILD-PRECHECK
3	milestone: JULIETT-12CHAT-ALLOCATION-MS0
4	owner_slot: alpha
5	wave: W1
6	cost: S
7	status: pending
8	peer_claims_check_at: 2026-05-17T00:00:00Z
9	tool_plan_ref: pending-rgs-build
10	depends_on: []
11	unblocks: [12-chat-parallel-W2-W4-without-duplicate-builds]
12	roi_score: 8.0
13	generated_at: 2026-05-17
14	generator_version: hand-written-v1
15	
... [+5168 chars truncated]

### Assistant | 2026-05-19T04:37:18.652Z

I have the production code, test file, and spec in context. Let me also grep to verify the production code's exported surface matches what the test imports.

### Assistant | 2026-05-19T04:37:20.162Z

[tool_use: Grep]

### Assistant | 2026-05-19T04:37:21.554Z

[tool_use: Grep]

### User | 2026-05-19T04:37:22.521Z

[tool_result] 59:export function classifyPath(filePath) {
87:export function buildQuery(name) {
108:export function renderBlock(assetKind, assetName, hits) {
145:export function clampedTopK() {
172:export async function searchWithTimeout(runSearch, query, opts, timeoutMs) {
210:export async function decide(payload, runSearchAsync) {

### User | 2026-05-19T04:37:23.444Z

[tool_result] 59:export function classifyPath(filePath) {
87:export function buildQuery(name) {
108:export function renderBlock(assetKind, assetName, hits) {
145:export function clampedTopK() {
172:export async function searchWithTimeout(runSearch, query, opts, timeoutMs) {
210:export async function decide(payload, runSearchAsync) {
227:  const classified = classifyPath(filePath);
231:  const query = buildQuery
... [+263 chars truncated]

### Assistant | 2026-05-19T04:37:27.282Z

[tool_use: Read]

### User | 2026-05-19T04:37:33.574Z

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
... [+12727 chars truncated]

### Assistant | 2026-05-19T04:39:26.023Z

I have everything in context. Let me now perform the independent second-pass review.

---

# Independent Second-Pass Review — `activate-before-build-precheck.test.mjs`

## Verdict: **FAIL** — 1 P0, 4 P1, 3 P2, 2 P3

The 44/44 green count is real but partly load-bearing on accident: at least one assertion passes for the wrong reason, the subprocess oracle has a critical environment leak that makes a passing test green by accident on a fresh CI box and red on a developer machine, and the suite has zero coverage of the most safety-critical code path in the production CLI — the lazy lib-load failure branch (`activate-before-build-precheck.mjs:293-297`).

---

## P0 — must fix before ship

### **P0-1** — `decide()` env-leak: `PRISM_ACTIVATE_PRECHECK_DISABLE` is not snapshot+restored around the whole `decide` suite (test:228-302)

The `clampedTopK` suite is meticulous about saving `orig = process.env.PRISM_ACTIVATE_PRECHECK_K` and restoring it (test:166, 169-171, 175-177, 182-184, 192-194). The `decide` suite is NOT — it touches `PRISM_ACTIVATE_PRECHECK_DISABLE` exactly once (test:251-258) with a local `try/finally delete`, which is correct IN ISOLATION but creates two leak hazards:

1. **Pre-existing env leak into the suite**: if the test runner is invoked from a shell where `PRISM_ACTIVATE_PRECHECK_DISABLE=1` is already set (a developer who is debugging the hook by disabling it), EVERY test in the `decide` suite that expects `suppressOutput=true` will pass for the wrong reason — the disabled-knob early-return at production:212-214 short-circuits before any of the actual logic under test. **Tests 1, 2, 3, 6, 8, 10, 11, 12 (8 of 12 decide-tests) pass without exercising any of their actual stated assertions when this env is pre-set.** The test at line 272 ("non-empty hits → injects context block") is the only one that would FAIL loudly and tell you something is wrong, because it expects an `additionalContext` block. The same applies to the entire CLI subprocess suite tests
... [+15919 chars truncated]
