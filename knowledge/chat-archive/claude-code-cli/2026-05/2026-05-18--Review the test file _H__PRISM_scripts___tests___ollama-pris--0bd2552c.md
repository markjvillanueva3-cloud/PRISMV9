---
type: "chat-session"
source: "claude-code-cli"
session_id: "0bd2552c-f488-4919-a1de-61b8dee1f055"
title: "Review the test file `H:\\PRISM\\scripts\\__tests__\\ollama-prism-bridge.test.mjs` e"
date: "2026-05-18"
first_ts: "2026-05-18T03:17:14.130Z"
last_ts: "2026-05-18T03:18:48.819Z"
cwd: "H:\\prism"
messages: 42
user_msgs: 17
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-a65e980fc79abbe16.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# Review the test file `H:\PRISM\scripts\__tests__\ollama-prism-bridge.test.mjs` e

> **claude-code-cli** | 2026-05-18 | 42 msgs (17 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0bd2552c-f488-4919-a1de-61b8dee1f055/subagents/agent-a65e980fc79abbe16.jsonl`

## Transcript

### User | 2026-05-18T03:17:14.130Z

Review the test file `H:\PRISM\scripts\__tests__\ollama-prism-bridge.test.mjs` end-to-end (read the WHOLE file). It tests `H:\PRISM\scripts\ollama-prism-bridge.mjs` (read that too) — U-OE-BRIDGE-L2, an Ollama agentic harness that lets a local Ollama model chain 3 read-only PRISM knowledge tools.

The suite ran: 71 tests, 70 pass, 1 skip (live Ollama E2E skipped because the 3B model cold-loaded past the 8s test timeout — that is documented expected behavior on this memory-pressured host).

VERIFY these properties (PRISM doctrine R9 — "tests verify intent, not behavior"; a test that still passes when the business logic is broken is worthless):

1. Do the assertions check REAL values / real behavior, or are any of them `toBeDefined()`-style stubs that would pass against a broken implementation?
2. The P0 regression oracle: there is a test "a chatImpl that THROWS is caught and fails loud (P0 regression oracle)". Confirm it genuinely fails if the try/catch around `chatImpl` in `runAgentLoop` were removed (i.e. it asserts `run.ok === false` and the error message — would an uncaught throw make this test fail rather than pass?).
3. The real-data E2E tests (67-70): confirm they exercise the REAL `buildToolImpls()` against real on-disk files, NOT hermetic fakes. Specifically the "WIKI_INDEX_REL regression oracle" test — would it actually FAIL if `WIKI_INDEX_REL` were reverted to the wrong `architecture/index.md` path? (The wiki index `knowledge/wiki/index.md` exists; `architecture/index.md` does not.)
4. Are the skip conditions "skip-loud" (printing WHY they skip), and are they correctly gated on file existence?
5. Coverage gaps: is every exported function of ollama-prism-bridge.mjs exercised? Are the agent-loop branches (direct answer / single+multi tool call / unknown tool / throwing tool / missing impl / malformed call / cap+forced-finalization / chat error / chat throw / content+tool_calls / empty tool_calls array) all covered? Is `confinePath`'s symlink-hardening path te
... [+247 chars truncated]

### Assistant | 2026-05-18T03:17:26.513Z

I'll read both files end-to-end to verify the test properties per R9 doctrine.

### Assistant | 2026-05-18T03:17:26.710Z

[tool_use: Read]

### Assistant | 2026-05-18T03:17:26.788Z

[tool_use: Read]

### User | 2026-05-18T03:17:28.639Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ollama-prism-bridge.mjs — Ollama → PRISM agentic harness (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2)
4	 *
5	 * Layer 2 of the OLLAMA→PRISM-MCP bridge ladder (Layer 1 = ask-ollama.mjs).
6	 *
7	 * Ollama is a model server, NOT an MCP client — it cannot "connect to MCP".
8	 * This script is the missing harness: it acts as the agent loop. It advertises
9	 * a curated, READ-ONLY
... [+32588 chars truncated]

### User | 2026-05-18T03:17:28.807Z

[tool_result] 1	/**
2	 * ollama-prism-bridge.test.mjs — tests for the Ollama→PRISM agentic harness
3	 * (OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2).
4	 *
5	 * Coverage:
6	 *  - pure helpers: parseArgs, pickModel, toolSpecs, buildSystemPrompt,
7	 *    normalizeToolCall, validateToolCall, clampToolArgs, confinePath,
8	 *    capToolResult, toolResultMessage, renderTranscript, bridgeSavingsFooter
9	 *  - runAgentLoop orches
... [+29643 chars truncated]

### Assistant | 2026-05-18T03:17:30.227Z

I'll analyze the test file against the R9 doctrine criteria. Let me verify critical properties.

### Assistant | 2026-05-18T03:17:30.937Z

[tool_use: Grep]

### Assistant | 2026-05-18T03:17:31.239Z

[tool_use: Grep]

### User | 2026-05-18T03:17:32.493Z

[tool_result] No matches found

### User | 2026-05-18T03:17:32.581Z

[tool_result] No matches found

### Assistant | 2026-05-18T03:17:33.936Z

Now let me verify the wiki index path and examine coverage gaps.

### Assistant | 2026-05-18T03:17:34.173Z

[tool_use: Read]

### Assistant | 2026-05-18T03:17:34.386Z

[tool_use: Grep]

### User | 2026-05-18T03:17:35.659Z

[tool_result] 1	---
2	title: PRISM Wiki Index
3	category: meta
4	last_verified: 2026-05-08
5	author: hybrid

### User | 2026-05-18T03:17:56.465Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-18T03:17:57.912Z

Let me check the exact wiki path assertion in the source code and verify the test coverage.

### Assistant | 2026-05-18T03:17:58.364Z

[tool_use: Read]

### Assistant | 2026-05-18T03:17:58.724Z

[tool_use: Grep]

### User | 2026-05-18T03:18:00.796Z

[tool_result] 644:test("E2E: real viz_search returns ranked graph hits", { skip: GRAPH_PRESENT ? false : "no system-viz graph on disk" }, () => {
651:test("E2E: real wiki_lookup reads the real wiki index (WIKI_INDEX_REL regression oracle)", { skip: WIKI_PRESENT ? false : "knowledge/wiki/index.md not on disk" }, () => {
677:test("E2E: runAgentLoop default-dep seam — real buildToolImpls() drives a scripted chat",
... [+79 chars truncated]

### User | 2026-05-18T03:18:00.844Z

[tool_result] 100	const WIKI_MIN_TOKEN_LEN = 3;
101	/** Wiki catalog index, relative to the repo root. NOTE: the catalog index is
102	 *  knowledge/wiki/index.md — knowledge/wiki/architecture/ holds per-entry leaf
103	 *  files but no index.md. Verified on disk 2026-05-18. */
104	const WIKI_INDEX_REL = join("knowledge", "wiki", "index.md");
105	/** Back-of-envelope characters-per-token ratio, for the savings fo
... [+165 chars truncated]

### Assistant | 2026-05-18T03:18:02.338Z

Excellent. Now let me verify the P0 regression oracle test and check for state leakage and ordering issues.

### Assistant | 2026-05-18T03:18:02.765Z

[tool_use: Read]

### Assistant | 2026-05-18T03:18:02.937Z

[tool_use: Read]

### User | 2026-05-18T03:18:04.621Z

[tool_result] 542	test("runAgentLoop: a chatImpl that THROWS is caught and fails loud (P0 regression oracle)", async () => {
543	  // Regression guard for the P0 found in per-file scrutiny: a thrown chatImpl
544	  // must NOT escape runAgentLoop as an uncaught exception — it must become a
545	  // fail-loud { ok:false, error }.
546	  const run = await runAgentLoop({
547	    question: "q",
548	    model: "m",
54
... [+254 chars truncated]

### User | 2026-05-18T03:18:04.830Z

[tool_result] 560	    let res;
561	    try {
562	      res = await chatImpl(model, messages, specs, { timeoutMs });
563	    } catch (e) {
564	      return {
565	        ok: false,
566	        error: `chat call threw: ${e && e.message ? e.message : e}`,
567	        iterations,
568	        toolCalls,
569	        capped: false,
570	      };
571	    }
572	    if (!res || !res.ok) {
573	      return { ok: false, err
... [+107 chars truncated]

### Assistant | 2026-05-18T03:18:06.830Z

Perfect. Now let me examine the confinePath symlink test and look for any state-leaking patterns.

### Assistant | 2026-05-18T03:18:07.257Z

[tool_use: Read]

### Assistant | 2026-05-18T03:18:07.519Z

[tool_use: Read]

### User | 2026-05-18T03:18:09.373Z

[tool_result] 276	test("confinePath: a symlink resolving OUTSIDE the repo is rejected", () => {
277	  const r = confinePath("scripts/innocent.mjs", REPO_ROOT, {
278	    existsImpl: () => true,
279	    realpathImpl: (p) => (p === REPO_ROOT ? REPO_ROOT : "C:\\evil\\stolen.txt"),
280	  });
281	  assert.equal(r, null);
282	});
283	
284	test("confinePath: a symlink resolving INSIDE the repo is allowed", () => {
285	
... [+553 chars truncated]

### User | 2026-05-18T03:18:09.375Z

[tool_result] <tool_use_error>InputValidationError: Read failed due to the following issue:
The parameter `offset` type is expected as `number` but provided as `string`</tool_use_error>

### Assistant | 2026-05-18T03:18:11.627Z

[tool_use: Read]

### User | 2026-05-18T03:18:13.091Z

[tool_result] 427	  assert.equal(run.toolCalls.length, 2);
428	  assert.equal(run.answer, "synthesized");
429	});
430	
431	test("runAgentLoop: an unknown tool is reported back and the model recovers", async () => {

### Assistant | 2026-05-18T03:18:14.665Z

Now let me check for any issues with the real-data E2E tests and the graphCache side effect.

### Assistant | 2026-05-18T03:18:14.894Z

[tool_use: Read]

### Assistant | 2026-05-18T03:18:15.184Z

[tool_use: Read]

### User | 2026-05-18T03:18:18.733Z

[tool_result] 427	export function buildToolImpls({ root = REPO_ROOT } = {}) {
428	  let graphCache = null; // { ok, graph, file } once loaded
429	  return {
430	    viz_search(args) {
431	      const { query, maxHits } = clampToolArgs("viz_search", args);
432	      if (!graphCache) graphCache = loadGraph({ root });
433	      if (!graphCache.ok) return `ERROR: ${graphCache.error}`;
434	      const hits = searchG
... [+395 chars truncated]

### User | 2026-05-18T03:18:18.931Z

[tool_result] 639	const GRAPH_PRESENT =
640	  existsSync(join(REPO_ROOT, "state", "shared", "system-viz", "architecture-graph.json")) ||
641	  existsSync(join(REPO_ROOT, "state", "shared", "system-viz", "system-graph.json"));
642	const WIKI_PRESENT = existsSync(join(REPO_ROOT, WIKI_INDEX_REL));
643	
644	test("E2E: real viz_search returns ranked graph hits", { skip: GRAPH_PRESENT ? false : "no system-viz graph o
... [+2900 chars truncated]

### Assistant | 2026-05-18T03:18:20.184Z

Perfect. Now let me check for any uncovered branches by reviewing the agent loop paths.

### Assistant | 2026-05-18T03:18:20.789Z

[tool_use: Read]

### User | 2026-05-18T03:18:21.984Z

[tool_result] 558	test("runAgentLoop: content alongside tool_calls treats the tool calls as authoritative", async () => {
559	  const run = await runAgentLoop({
560	    question: "q",
561	    model: "m",
562	    deps: {
563	      chatImpl: scriptedChat([
564	        { ok: true, message: { role: "assistant", content: "thinking out loud", tool_calls: [{ function: { name: "viz_search", arguments: { query: "x" } } 
... [+760 chars truncated]

### Assistant | 2026-05-18T03:18:48.819Z

Excellent. Let me now assess comprehensively against all R9 criteria.

## GRADE: **FAIL**

### Summary
71 tests, 70 pass, 1 skip. **Real-value assertions throughout — excellent adherence to R9.** However, **one CRITICAL P0 regression oracle is weak** and **at least one uncovered agent-loop branch** exists. Per R9 doctrine: "a test that still passes when the business logic is broken is worthless."

---

### P0/P1 FINDINGS

#### **P0 — Line 651-657: WIKI_INDEX_REL regression oracle is WEAK**

**Test code:**
```javascript
test("E2E: real wiki_lookup reads the real wiki index (WIKI_INDEX_REL regression oracle)", { skip: WIKI_PRESENT ? false : "knowledge/wiki/index.md not on disk" }, () => {
  const impls = buildToolImpls();
  const out = impls.wiki_lookup({ name: "engine" });
  // The bug found in scrutiny: WIKI_INDEX_REL pointed at a non-existent
  // architecture/index.md so EVERY call returned "ERROR: file not found".
  assert.ok(!/ERROR: file not found/.test(out), `wiki_lookup must not fail to find the index, got: ${out.slice(0, 160)}`);
});
```

**Issue:** The assertion checks for the absence of `"ERROR: file not found"`, but the real regression oracle should ACTIVELY VERIFY that the wiki lookup **succeeds and returns real content**. A changed WIKI_INDEX_REL to a wrong path (e.g. back to `knowledge/wiki/architecture/index.md`) would:
- Still skip-pass on a system where the wrong path exists (because the skip is broad: "knowledge/wiki/index.md not on disk")
- Return a non-error string even if it's from the wrong file (the assertion only checks absence of "file not found")

**Why this fails R9:** The test passes when WIKI_INDEX_REL is correct AND when it's wrong but the file exists. It does NOT verify the RIGHT file is being read.

**Strengthen:** Add a positive assertion that the real `knowledge/wiki/index.md` (verified on line 104's comment: "knowledge/wiki/index.md — knowledge/wiki/architecture/ holds per-entry leaf files but no index.md") contains a specific expe
... [+6093 chars truncated]
