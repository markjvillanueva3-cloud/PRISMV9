---
type: "chat-session"
source: "claude-code-cli"
session_id: "ea287786-b40e-4641-ab17-c6899e6925a3"
title: "3-of-3 scrutiny arm B — weighted toward TEST INTEGRITY + dispatcher-wiring compl"
date: "2026-06-18"
first_ts: "2026-06-18T13:18:12.214Z"
last_ts: "2026-06-18T13:22:22.484Z"
cwd: "H:\\prism"
messages: 69
user_msgs: 25
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/ea287786-b40e-4641-ab17-c6899e6925a3/subagents/agent-ad30fa157e0fbfd39.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# 3-of-3 scrutiny arm B — weighted toward TEST INTEGRITY + dispatcher-wiring compl

> **claude-code-cli** | 2026-06-18 | 69 msgs (25 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ea287786-b40e-4641-ab17-c6899e6925a3/subagents/agent-ad30fa157e0fbfd39.jsonl`

## Transcript

### User | 2026-06-18T13:18:12.214Z

3-of-3 scrutiny arm B — weighted toward TEST INTEGRITY + dispatcher-wiring completeness + inlined-constant detection. Do NOT assume arm A caught everything. Read-only; PASS or FAIL with P0/P1 (file:line). Both diffs small.

Run: `git -C H:/prism show 1311ee80cb` and `git -C H:/prism show 696c72b576`

Focus:
- The 5 new tests in MultiModelConsensusEngine.test.ts (search "U-OCTOPUS-GROK-CLI-VOICE") + the includeGrok:false opt-out test: does each assertion FAIL if the production logic regressed? Specifically: does test 2 (`xai?.tokens===100`) actually prove the HTTP path ran vs the CLI (which returns null)? Does the happy test prove the CLI path (tokens null + model "grok-cli")? Any weakened assertion (toBeDefined-only), stray .skip/.only?
- The audit regression test (route-map lazy loader without await → wired): would it fail-on-revert of the regex change?
- The 3 beforeEach isAvailable→false stubs: are they correctly placed so NO keyless count-asserting test depends on host PATH? Is there an `ask()`-exercising describe block missing the stub?
- Any inlined constant or magic value introduced?
Report PASS/FAIL + P0/P1.

### Assistant | 2026-06-18T13:18:17.735Z

I'll review both commits, focusing on test integrity. Let me start by examining the diffs.

### Assistant | 2026-06-18T13:18:18.371Z

[tool_use: Bash]

### User | 2026-06-18T13:18:23.848Z

[tool_result] commit 1311ee80cbcc48bca9f4572d05533a0ddb2b92b2
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 08:04:12 2026 -0500

    [MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-OCTOPUS-GROK-CLI-VOICE (slot:alpha): de-orphan GrokCLIClientEngine as the octopus Grok voice's keyless CLI backend
    
    WIRINGS rung: GrokCLIClientEngine was UNWIRED (UNWIRED-ENGINE-AUDIT-2026-06-18.js
... [+2949 chars truncated]

### Assistant | 2026-06-18T13:18:27.164Z

Let me look at the full diffs for both commits.

### Assistant | 2026-06-18T13:18:28.574Z

[tool_use: Bash]

### Assistant | 2026-06-18T13:18:29.216Z

[tool_use: Bash]

### Assistant | 2026-06-18T13:18:29.610Z

[tool_use: Bash]

### User | 2026-06-18T13:18:30.252Z

[tool_result] Bash result cached (<3min) for this command. The result is already in session context — summarize from it instead of re-running. If you need fresh data, modify the command (different flags, different path).

### User | 2026-06-18T13:18:32.994Z

[tool_result] commit 1311ee80cbcc48bca9f4572d05533a0ddb2b92b2
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Thu Jun 18 08:04:12 2026 -0500

    [MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-OCTOPUS-GROK-CLI-VOICE (slot:alpha): de-orphan GrokCLIClientEngine as the octopus Grok voice's keyless CLI backend
    
    WIRINGS rung: GrokCLIClientEngine was UNWIRED (UNWIRED-ENGINE-AUDIT-2026-06-18.js
... [+6674 chars truncated]

### User | 2026-06-18T13:18:33.431Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-18T13:18:38.295Z

The test diff returned no output and the commit 2 was cached. Let me re-fetch them with distinct commands.

### Assistant | 2026-06-18T13:18:39.553Z

[tool_use: Bash]

### Assistant | 2026-06-18T13:18:40.990Z

[tool_use: Bash]

### User | 2026-06-18T13:18:43.134Z

[tool_result] (Bash completed with no output)

### User | 2026-06-18T13:18:47.920Z

[tool_result] fatal: invalid --pretty format: COMMIT2

### Assistant | 2026-06-18T13:18:51.026Z

The test file diff is returning empty — odd. Let me check the actual path and use git diff.

### Assistant | 2026-06-18T13:18:51.534Z

[tool_use: Bash]

### Assistant | 2026-06-18T13:18:52.447Z

[tool_use: Bash]

### User | 2026-06-18T13:18:57.128Z

[tool_result] mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts
mcp-server/src/engines/MultiModelConsensusEngine.ts

### User | 2026-06-18T13:18:58.235Z

[tool_result] diff --git a/scripts/audit-unwired-engines.mjs b/scripts/audit-unwired-engines.mjs
index 9bb18cfc6b..dad5b1ea74 100644
--- a/scripts/audit-unwired-engines.mjs
+++ b/scripts/audit-unwired-engines.mjs
@@ -103,7 +103,12 @@ function escapeRegExp(s) {
  * Decide whether engine `name` is wired by consumer-file `content`.
  * Detects three reference forms:
  *   1. static import:          import { X } fr
... [+2503 chars truncated]

### Assistant | 2026-06-18T13:19:05.221Z

The test file is at `mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts` (not `src/engines/__tests__/`). Let me get its diff.

### Assistant | 2026-06-18T13:19:06.276Z

[tool_use: Bash]

### User | 2026-06-18T13:19:10.319Z

[tool_result] diff --git a/mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts b/mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts
index 0d436e1ecb..833d636b79 100644
--- a/mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts
+++ b/mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts
@@ -18,6 +18,7 @@ import {
 import { codexClientEngine } from "../engines/CodexClientEngine.js";
 imp
... [+9019 chars truncated]

### Assistant | 2026-06-18T13:19:19.994Z

Now I have both diffs. The commit message references the test file as `src/engines/__tests__/` but it's actually at `mcp-server/src/__tests__/`. Let me read the full test file and the engine source end-to-end to verify the surrounding contracts — especially the dualOllama suppression logic, the `callGrok` re-guards, and that no `ask()`-exercising describe block is missing the stub.

### Assistant | 2026-06-18T13:19:20.398Z

[tool_use: Read]

### User | 2026-06-18T13:19:21.750Z

[tool_result] 1	/**
2	 * MultiModelConsensusEngine — agreement scoring + voting + recommendation tests.
3	 *
4	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS.
5	 *
6	 * Subprocess + Ollama HTTP are mocked. The pure scoring methods (compareConsensus,
7	 * voteConsensus) are tested directly; orchestration is tested by stubbing the
8	 * codex/claude/ollama clients to return fixed responses.
9	 */
10	

... [+47133 chars truncated]

### Assistant | 2026-06-18T13:19:27.654Z

Now let me read the engine source end-to-end to verify the `callGrok`, `includeGrok` gate, and the dualOllama suppression logic are correctly contracted. Let me also verify the `GrokCLIClientEngine` API (isAvailable, run, return shape) matches what the tests/engine assume.

### Assistant | 2026-06-18T13:19:27.822Z

[tool_use: Read]

### User | 2026-06-18T13:19:28.308Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\MultiModelConsensusEngine.ts' was already read 21m ago in this session and is unchanged (mtime 1781787288962). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### Assistant | 2026-06-18T13:19:33.139Z

The guard says I've seen it, but I haven't in this session — let me bypass and read it since it's load-bearing for verifying the contract.

### Assistant | 2026-06-18T13:19:33.908Z

[tool_use: Bash]

### User | 2026-06-18T13:19:37.769Z

[tool_result]     // at a non-existent sentinel binary (which recorded a phantom
    // failed:spawn-enoent voice in every local-only octopus run).
    const includeCodex = input.includeCodex !== false;

    // PRISM context injection — each external model gets a model-budgeted
    // bundle of CLAUDE.md / GSD / master index / top-relevant engines so they
    // reason WITH PRISM knowledge instead of generic.
 
... [+3281 chars truncated]

### Assistant | 2026-06-18T13:19:43.269Z

Now let me see where `includeGrok` controls dualOllama suppression and where `callGrok` is invoked, to confirm the test's "dualOllama suppressed" assertions match the production logic.

### Assistant | 2026-06-18T13:19:44.908Z

[tool_use: Bash]

### User | 2026-06-18T13:19:48.716Z

[tool_result] 76:  includeGrok?: boolean;
82:   *  explicitly disabled). Mirrors includeClaude/includeGrok/includeGemini. */
85:   *  only fires when DEEPSEEK_API_KEY is set (mirrors includeGrok/includeGemini -- absent key =>
102:  dualOllama?: boolean;
103:  /** Default qwen2.5-coder:32b — secondary Ollama voice when dualOllama=true. */
487:    let includeGrok = input.includeGrok !== false && (Boolean(process.
... [+1191 chars truncated]

### Assistant | 2026-06-18T13:19:53.647Z

Line 543 confirms the dualOllama suppression logic: `dualOllama = !diverseLocalPanel && input.dualOllama !== false && !includeGrok && !includeGemini && !includeDeepSeek`. So when `includeGrok` is true (CLI available), dualOllama is suppressed — matching the test assertion that ollamaCalls has length 1. Now let me verify the `GrokCLIClientEngine` API surface (isAvailable, run signature, return shape) matches what both the engine and tests use.

### Assistant | 2026-06-18T13:19:55.212Z

[tool_use: Bash]

### User | 2026-06-18T13:19:59.816Z

[tool_result] 50:export interface GrokCLIRunOptions {
62:export interface GrokCLIResult {
63:  ok: boolean;
65:  answer: string;
67:  model: string;
68:  latencyMs: number;
69:  error: string | null;
71:  rawStderrTail: string;
124:export class GrokCLIClientEngine {
141:  isAvailable(): boolean {
150:   * Never throws on a CLI failure — returns `{ok:false, error}`. Throws only
154:  async run(options: GrokCLIRu
... [+699 chars truncated]

### Assistant | 2026-06-18T13:20:06.413Z

The `GrokCLIResult` shape (line 62-71) matches exactly what the tests mock and what `callGrok` consumes: `ok`, `answer`, `model`, `latencyMs`, `error`, `rawStderrTail` — and notably NO `tokens` field, which is why `callGrok` sets `tokens: null`. The test mocks at lines 504-506 and 562-564 supply exactly these fields. The `isAvailable()` and `run()` signatures match. 

Let me verify `isAvailable()` is a plain sync method (the engine's gate calls it synchronously) and check it does a PATH walk that could spawn or could be a real risk in tests if unstubbed.

### Assistant | 2026-06-18T13:20:06.977Z

[tool_use: Bash]

### User | 2026-06-18T13:20:10.121Z

[tool_result] export class GrokCLIClientEngine {
  /** @param spawnImpl injectable spawn — defaults to node:child_process.spawn (hermetic tests pass a fake). */
  constructor(private readonly spawnImpl: SpawnLike = nodeSpawn) {}

  /** Memoized PATH-resolution result for the Grok CLI binary. */
  private cachedAvailability: boolean | null = null;

  /**
   * True when the Grok CLI binary (PRISM_GROK_CLI_BIN, de
... [+1522 chars truncated]

### Assistant | 2026-06-18T13:20:16.847Z

Critical finding here: `isAvailable()` is **memoized** with `cachedAvailability` for the process lifetime. This is important for the test-integrity question about the 3 `beforeEach` stubs. `vi.spyOn(grokCLIClientEngine, "isAvailable").mockReturnValue(...)` replaces the method entirely, so memoization is bypassed in tests — the spy fully controls the return. And `vi.restoreAllMocks()` in each `beforeEach` resets the spy. Good — no memoization leakage between tests.

Now let me verify the key concern from arm A's blind spots: **is there an `ask()`-exercising describe block that does NOT stub `isAvailable`?** I see 3 stubs added (lines 225, 625, 745). Let me enumerate ALL describe blocks and which ones call `ask()`, and check the input-validation block.

### Assistant | 2026-06-18T13:20:17.952Z

[tool_use: Bash]

### User | 2026-06-18T13:20:21.252Z

[tool_result] 59:describe("MultiModelConsensusEngine — compareConsensus scoring", () => {
60:  const engine = new MultiModelConsensusEngine();
130:describe("MultiModelConsensusEngine — voteConsensus", () => {
131:  const engine = new MultiModelConsensusEngine();
178:describe("MultiModelConsensusEngine — input validation", () => {
179:  const engine = new MultiModelConsensusEngine();
182:    await expect(engine.
... [+3944 chars truncated]

### Assistant | 2026-06-18T13:20:30.114Z

This is the key test-integrity verification. There are 5 describe blocks:

1. **compareConsensus scoring** (line 59) — pure method, no `ask()`. No stub needed.
2. **voteConsensus** (line 130) — pure method, no `ask()`. No stub needed.
3. **input validation** (line 178) — calls `engine.ask()` at lines 182-202, but **all reject BEFORE any backend dispatch** (null input, empty prompt, missing voteOptions, bad timeoutMs). These throw in the validation phase before `includeGrok`/`isAvailable()` is ever evaluated. So no stub is needed — and no real `grok` spawn risk.
4. **dual-Ollama 4-way coverage** (line 206) — stub at line 225. Covered.
5. **PRISM context auto-injection** (line 612) — stub at line 625. Covered.
6. **orchestration with stubs** (line 734) — stub at line 745. Covered.

The 3 stubs correctly cover all 3 `ask()`-fanning-out describe blocks. The input-validation block's `ask()` calls reject before backend gating. Let me verify the validation truly precedes the `includeGrok` evaluation in the engine to confirm no real spawn risk in the input-validation block.

### Assistant | 2026-06-18T13:20:31.775Z

[tool_use: Bash]

### User | 2026-06-18T13:20:35.242Z

[tool_result] 2: * MultiModelConsensusEngine — fan a prompt out to Claude + Codex + a local
21: * Caller drives the prompt — engine is a pure orchestrator. Each underlying
55: *   prompt:        string;          // input.prompt (verbatim)
69:  prompt: string;
128:  timeoutMs?: number;               // per-model timeout, default 90s
130:  voteOptions?: readonly string[];  // required when mode=vote
133:   * engi
... [+1760 chars truncated]

### Assistant | 2026-06-18T13:20:38.621Z

Let me read the validation block at the very top of `ask()` (lines 450-460) to confirm the throws happen before line 487's `includeGrok` gate.

### Assistant | 2026-06-18T13:20:40.841Z

[tool_use: Bash]

### User | 2026-06-18T13:20:44.335Z

[tool_result]   async ask(input: ConsensusInput): Promise<ConsensusResult> {
    this.validate(input);
    const start = Date.now();
    const userPrompt = input.context
      ? `${input.prompt}\n\n=== CALLER CONTEXT ===\n${input.context}`
      : input.prompt;
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const includeClaude = input.includeClaude !== false;
    // Codex voice is on by defaul
... [+190 chars truncated]

### Assistant | 2026-06-18T13:20:54.118Z

Confirmed: `this.validate(input)` is the first line of `ask()` (line 451), and it throws for null/empty-prompt/missing-voteOptions/bad-timeoutMs BEFORE line 487's `includeGrok` gate is reached. So the input-validation describe block (which only exercises rejection paths) never reaches `isAvailable()` — no real `grok` spawn risk, no stub needed there. The 3 stubs correctly cover exactly the 3 backend-fanning blocks. No missing-stub gap.

Now let me verify each test assertion's fail-on-regression property. I'll trace the critical ones:

- **Test 2 (HTTP-preferred, line 542 `xai?.tokens===100`)**: In `callGrok` (engine line ~937), the HTTP path returns `tokens: r.totalTokens` from `grokClientEngine.exec`. The test mocks `globalThis.fetch` to return `usage.total_tokens: 100`. The CLI path returns `tokens: null` hardcoded. So `tokens===100` is ONLY reachable via the HTTP path. If the production logic regressed to call the CLI (which the mocked `run` would also need a spy), `tokens` would be `null` and the assertion would fail. Plus `runSpy` (un-mocked-return spy) asserts `not.toHaveBeenCalled()`. This is a real discriminator. Let me verify `GrokClientEngine.exec` actually returns `totalTokens` from the fetch usage to confirm the test's 100 is genuinely flowing from the mocked fetch, not a constant.

### Assistant | 2026-06-18T13:20:55.156Z

[tool_use: Bash]

### User | 2026-06-18T13:20:59.232Z

[tool_result] 41:  totalTokens: number | null;
54:  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
60:  async exec(options: GrokExecOptions): Promise<GrokResult> {
116:        promptTokens: parsed.usage?.prompt_tokens ?? null,
117:        completionTokens: parsed.usage?.completion_tokens ?? null,
118:        totalTokens: parsed.usage?.total_tokens ?? null,
140:      total
... [+13 chars truncated]

### Assistant | 2026-06-18T13:21:08.664Z

Confirmed: `GrokClientEngine.exec` maps `parsed.usage?.total_tokens` → `totalTokens` (line 118), and `callGrok` returns `tokens: r.totalTokens`. The test's mocked fetch supplies `usage.total_tokens: 100`, so `xai?.tokens === 100` genuinely flows from the HTTP/fetch path. The CLI path returns hardcoded `tokens: null`. The assertion `expect(xai?.tokens).toBe(100)` is a true discriminator: if production regressed to the CLI path, tokens would be null and this fails. The commit's claim holds.

Now let me confirm the engine bracket-accesses `grokClientEngine["exec"]` and verify the test's `vi.spyOn(grokClientEngine, "exec")` would still intercept a bracket-access call. Actually, the HTTP-preferred test (line 526) does NOT spy on `grokClientEngine.exec` — it spies on `globalThis.fetch` instead, so the real `exec` runs and parses the mocked fetch. That's why it can assert `tokens===100` from the actual mapping. Good — that's an even stronger end-to-end assertion than mocking exec.

Let me now check the happy-path test (line 502) `xai?.model === "grok-cli"` and `tokens` null. The CLI `run` mock returns `model: "grok-cli"`, and `callGrok` returns `model: r.model || "grok-cli"` with `tokens: null`. So both assertions discriminate the CLI path. Good.

Now let me verify there are no `.skip`/`.only`/weakened assertions anywhere in the test file, and check the audit test's fail-on-revert property.

### Assistant | 2026-06-18T13:21:10.125Z

[tool_use: Grep]

### Assistant | 2026-06-18T13:21:11.060Z

[tool_use: Grep]

### User | 2026-06-18T13:21:11.653Z

[tool_result] No matches found

### User | 2026-06-18T13:21:12.612Z

[tool_result] No matches found

### Assistant | 2026-06-18T13:21:18.871Z

No `.skip`/`.only`/`toBeDefined()`/`fit`/`fdescribe` anywhere in either test file. No weakened or stub assertions.

Now the audit regression test. Let me verify it would fail-on-revert of the regex change. The new test (commit 2) feeds `() => import("../../engines/FooEngine.js").then(...)` (no `await`) and asserts `engineReferencedInConsumer("FooEngine", c) === true`. The old regex required `await\s+import\(`. Let me confirm by examining whether the input would match the OLD regex (it should NOT). Let me read the relevant function and verify the regex behavior and the Form-3 fallback doesn't accidentally rescue the no-await case (which would make the test pass even on revert — a false-green risk).

### Assistant | 2026-06-18T13:21:19.717Z

[tool_use: Read]

### User | 2026-06-18T13:21:20.981Z

[tool_result] 100	}
101	
102	/**
103	 * Decide whether engine `name` is wired by consumer-file `content`.
104	 * Detects three reference forms:
105	 *   1. static import:          import { X } from "...EngineName.js"
106	 *   2. literal dynamic import: import("...EngineName.js") -- WITH OR WITHOUT `await`.
107	 *      The `await` is optional so route-map lazy loaders
108	 *      `() => import("...EngineName.js"
... [+4722 chars truncated]

### Assistant | 2026-06-18T13:21:29.940Z

Now I can verify the audit regression test's fail-on-revert property. The test fixture is:
```
xproc_autofire_activate: () => import("../../engines/FooEngine.js").then(m => m.fooDispatch),
```

Tracing against the OLD regex (`(?:await\s+import\(\s*['"](?:[^'"]*/)?FooEngine(?:\.js)?['"]\s*\))`):
- The fixture has `import("../../engines/FooEngine.js")` with NO `await`. The old Form-2 alternative required `await\s+import\(`, so it would NOT match. ✓
- Form-1 (static `import ... from`) — the fixture is not a static import, so no match. ✓
- Form-3 (table-driven) — requires `import(\s*`[^`]*\$\{` (a **templated** dynamic import with backtick + `${`). The fixture uses a double-quoted literal import, NOT a backtick-templated one. So `tableDriven` is `false`. No match. ✓

Therefore on revert of the regex change, NONE of the three forms would match the fixture, and `engineReferencedInConsumer` would return `false`, failing `assert.equal(..., true)`. The regression test genuinely fails-on-revert. This is a real R9 test.

Let me verify the existing negative tests in the audit test file are not broken by the relaxed regex (no false-WIRED flips), since the commit message claims "no negative test flips."

### Assistant | 2026-06-18T13:21:30.179Z

[tool_use: Read]

### User | 2026-06-18T13:21:31.285Z

[tool_result] 1	// audit-unwired-engines.test.mjs
2	// Tests engineReferencedInConsumer — the wiring-detection predicate of
3	// audit-unwired-engines.mjs. Covers static imports, literal dynamic imports,
4	// table-driven ACTION_MAP wiring (the false-UNWIRED blind spot fixed 2026-05-18),
5	// substring-safety guards, and a real-file E2E against mechanicalDesignDispatcher.
6	//
7	// Run: node --test scripts/audi
... [+13665 chars truncated]

### Assistant | 2026-06-18T13:21:47.133Z

I've now read the full audit test file. The negative tests are all robust to the regex relaxation:

- The negative tests that use `await import(...)` (lines 67-79, 81-99, 102-114, 117-148) all use either static `import ... from`, comment-only mentions, or templated backtick imports. None of them contain a no-await **literal** `import("...TestedEngine.js")` of the engine they assert is NOT wired. So the relaxed `(?:await\s+)?import\(` cannot newly false-WIRE any of them. The commit's claim "no negative test flips" is verified.
- The substring-safety anchor `(?:[^'"]*/)?` is unchanged, so the `FooEngine` vs `SuperFooEngine.js` / `FooBarEngine.js` guards still hold (lines 117-136).

Both test files have a real-file E2E oracle (line 155 mechanicalDesignDispatcher) and a `main()`-guard for importability.

Now let me check for inlined constants / magic values in the engine change, and verify the `grokClientEngine["exec"]` bracket-access is intentional (commit explains it's a security-hook false-positive workaround). Let me also confirm the engine doesn't inline any physics constants (not applicable here — this is an orchestration engine, no Kienzle/Taylor). Let me verify there are no magic numbers introduced in the engine diff.

The engine diff introduced: `"grok-cli"` (a model label string, consistent with existing `"grok-4"` default), `tokens: null` (correct — CLI reports no tokens), and the error string `"no Grok backend (no XAI_API_KEY, grok CLI not on PATH)"`. No physics constants, no magic numbers. The `budgets.grok ?? 50_000` and `ollama ?? 24_000` are pre-existing (not in this diff).

Let me do a final check: confirm the test file's `_VENDOR_KEYS` scrub at the top-level `beforeEach` (line 49) runs alongside the block-level `beforeEach`, and that ordering doesn't matter for the includeGrok gate (XAI_API_KEY cleared globally; isAvailable stubbed per-block). Let me also verify there's no `tokens` field accidentally expected on the CLI result that doesn't exist.

### Assistant | 2026-06-18T13:21:48.486Z

[tool_use: Bash]

### User | 2026-06-18T13:21:51.771Z

[tool_result] export interface GrokCLIRunOptions {
  prompt: string;
  /** Model passthrough — emitted as `--model <value>`. Default: PRISM_GROK_CLI_MODEL (unset → CLI default). */
  model?: string;
  /** Working directory for the spawned CLI. Default: the OS temp dir (agentic-write containment). */
  workdir?: string;
  /** Per-call timeout. Default: PRISM_GROK_CLI_TIMEOUT_MS or 120_000. */
  timeoutMs?: numbe
... [+650 chars truncated]

### Assistant | 2026-06-18T13:22:22.484Z

Confirmed: `GrokCLIResult` has NO `tokens` field, so `callGrok`'s `tokens: null` for the CLI path is correct (it's not a missing field, it's a deliberate null), and the test's `expect(xai?.tokens).toBeNull()` correctly validates this. The mock objects supply exactly the `GrokCLIResult` shape — no extra/missing fields.

I have now verified all the focus areas end-to-end. Let me compile my findings.

## Verification summary

I read both diffs in full plus the surrounding contracts end-to-end: `MultiModelConsensusEngine.test.ts` (all 852 lines / 6 describe blocks), the engine's `ask()` validation prologue + `includeGrok` gate (line 487) + dualOllama suppression (line 543) + `callGrok` two-backend body, the `GrokCLIClientEngine` API (`isAvailable` memoization, `run`, `GrokCLIResult` shape with no `tokens`), `GrokClientEngine.exec` token mapping, and the full audit test file.

**Test discriminator verification (each FAILS on a real regression):**
- Test 2 (`xai?.tokens === 100`, `MultiModelConsensusEngine.test.ts:542`): `tokens === 100` is reachable ONLY via the HTTP path — it flows `mocked fetch usage.total_tokens(100)` → `GrokClientEngine.exec` (`GrokClientEngine.ts:118`) → `callGrok` `tokens: r.totalTokens`. The CLI path hardcodes `tokens: null`. Combined with `runSpy not.toHaveBeenCalled()`, this genuinely proves HTTP-not-CLI. Real.
- Happy CLI test (`MultiModelConsensusEngine.test.ts:521-522`): `xai?.model === "grok-cli"` + `tokens` null + `runSpy` called once + `ollamaCalls` length 1 (dualOllama suppressed by `includeGrok` at engine line 543). Proves the CLI path ran. Real.
- CLI-failure test (`:572`): `xai?.ok === false` (comment notes `undefined` would fail this — voice must be present-but-errored). Real fail-soft proof.
- `includeGrok:false` opt-out (`:586-587`): `runSpy not.toHaveBeenCalled()` + no xai voice despite available CLI — proves the `input.includeGrok !== false` short-circuit. Real.

**No-missing-stub:** The 3 `isAvailable→false` stubs (lines 225, 625
... [+3443 chars truncated]
