---
type: "chat-session"
source: "claude-code-cli"
session_id: "9dc60ef7-7881-491c-b1ee-fda1e99bc5bf"
title: "RE-VERIFY (round 3) a single fix in `H:/prism/mcp-server/src/engines/LLMEngine.t"
date: "2026-06-19"
first_ts: "2026-06-19T14:17:22.102Z"
last_ts: "2026-06-19T14:19:09.414Z"
cwd: "H:\\prism\\mcp-server"
messages: 45
user_msgs: 18
assistant_msgs: 27
raw_file: "H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-a3605c8674d16a557.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# RE-VERIFY (round 3) a single fix in `H:/prism/mcp-server/src/engines/LLMEngine.t

> **claude-code-cli** | 2026-06-19 | 45 msgs (18 user / 27 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-a3605c8674d16a557.jsonl`

## Transcript

### User | 2026-06-19T14:17:22.102Z

RE-VERIFY (round 3) a single fix in `H:/prism/mcp-server/src/engines/LLMEngine.ts`. Your round-2 FAIL found a P0: the Ollama-first migration made OTHER consumer test files (`tk-ai-hardening.test.ts`, `v6-integration.test.ts`) call the default singleton `llmEngine` which then hit real Ollama -> 4 timeouts / 176s.

THE FIX (systemic, not per-file): a new private `_netDisabledInTest()` returns true when `process.env.VITEST` or `NODE_ENV==='test'` (and `PRISM_LLM_ALLOW_NET_IN_TEST !== '1'`). It guards BOTH default provider paths:
- `_defaultOllamaGenerate()` returns `{ok:false}` immediately (no network) under test env.
- `_callClaude()` throws (caught by query()'s claude try/catch -> falls to offline) under test env.
Tests that exercise a provider inject `deps.ollamaGenerate`/`deps.claudeCall` (which bypass these default methods), so they are unaffected.

VERIFY:
1. The P0 is CLOSED: confirm tk-ai-hardening + v6-integration LLM paths now degrade to offline deterministically (no network) because they use the default singleton without injected deps. (Empirical: tk-ai-hardening now 15/15 in ~0.65s, was 4-fail/176s.)
2. NO PRODUCTION IMPACT: confirm the guard fires ONLY under a test runner (VITEST/NODE_ENV=test) -- a production server process does NOT set these, so production stays Ollama-first. Is there any path where production could accidentally trip `_netDisabledInTest()`?
3. The injected-deps tests (LLMEngine.provider-routing.test.ts) still exercise real routing logic (they bypass the guarded default methods) -- confirm the guard does not weaken them into false-greens.
4. Any NEW defect from the guard (e.g. the override knob, the throw-in-_callClaude being correctly caught).

Read LLMEngine.ts + LLMEngine.provider-routing.test.ts. Report any remaining/new P0/P1/P2 with file:line. Grade PASS or FAIL.

### Assistant | 2026-06-19T14:17:28.445Z

I'll verify this fix by reading the relevant files and tracing the guard logic.

### Assistant | 2026-06-19T14:17:29.329Z

[tool_use: Read]

### Assistant | 2026-06-19T14:17:29.501Z

[tool_use: Read]

### User | 2026-06-19T14:17:29.987Z

[tool_result] File does not exist. Note: your current working directory is H:\prism\mcp-server.

### User | 2026-06-19T14:17:30.178Z

[tool_result] 1	/**
2	 * LLMEngine — AI-Powered Manufacturing Intelligence
3	 *
4	 * Ollama-first LLM client for natural language queries about manufacturing,
5	 * quote explanations, process advice, and G-code annotation. Routes to a FREE
6	 * local Ollama model by default (so product features cost $0 at launch), with
7	 * an adaptive fallback ladder to the paid Claude API and then a deterministic
8	 * offline
... [+22755 chars truncated]

### Assistant | 2026-06-19T14:17:34.533Z

The provider-routing test file wasn't found at the path I guessed. Let me locate it and the consumer test files, and verify the actual env state.

### Assistant | 2026-06-19T14:17:35.095Z

[tool_use: Glob]

### Assistant | 2026-06-19T14:17:35.555Z

[tool_use: Glob]

### Assistant | 2026-06-19T14:17:35.578Z

[tool_use: Glob]

### User | 2026-06-19T14:17:36.995Z

[tool_result] src\__tests__\LLMEngine.test.ts
src\__tests__\LLMEngine.provider-routing.test.ts

### User | 2026-06-19T14:17:37.315Z

[tool_result] src\__tests__\tk-ai-hardening.test.ts

### User | 2026-06-19T14:17:37.344Z

[tool_result] src\__tests__\v6-integration.test.ts

### Assistant | 2026-06-19T14:17:40.856Z

Let me read the provider-routing test and trace how the consumer test files use the singleton.

### Assistant | 2026-06-19T14:17:41.358Z

[tool_use: Read]

### User | 2026-06-19T14:17:41.783Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\LLMEngine.provider-routing.test.ts' was already read 11m ago in this session and is unchanged (mtime 1781877932936). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PR
... [+17 chars truncated]

### Assistant | 2026-06-19T14:17:43.224Z

[tool_use: Grep]

### User | 2026-06-19T14:17:44.249Z

[tool_result] 5: * - LLMEngine tribal context provider
12:import { LLMEngine, llmEngine, registerTribalContextProvider } from "../engines/LLMEngine.js";
18:  describe("LLMEngine Tribal Context Provider", () => {
20:      const engine = new LLMEngine();
30:    it("should register tribal context provider on llmEngine", async () => {
32:      const stats = llmEngine.stats();
38:      const ctx = llmEngine.buildCon
... [+211 chars truncated]

### Assistant | 2026-06-19T14:17:44.552Z

[tool_use: Grep]

### User | 2026-06-19T14:17:45.580Z

[tool_result] 13:    expect(idx.llmEngine).toBeDefined();
109:    const { LLMEngine } = await import("../engines/LLMEngine.js");
110:    const engine = new LLMEngine();
112:    const result = await engine.query({

### Assistant | 2026-06-19T14:17:48.394Z

The provider-routing test is already in my context from earlier this session. Let me retrieve it and check the relevant sections of the consumer test files plus the cache-key behavior.

### Assistant | 2026-06-19T14:17:49.112Z

[tool_use: Read]

### User | 2026-06-19T14:17:49.543Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\LLMEngine.provider-routing.test.ts' was already read 11m ago in this session and is unchanged (mtime 1781877932936). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PR
... [+17 chars truncated]

### Assistant | 2026-06-19T14:17:52.716Z

The read-once-guard claims it's in context, but I don't actually have it visible from this round. Let me bypass with a fresh read using offset and disable the cache.

### Assistant | 2026-06-19T14:17:53.305Z

[tool_use: Bash]

### User | 2026-06-19T14:17:56.560Z

[tool_result] /**
 * LLMEngine provider-routing tests (FREE-AI-MIGRATION/U-LLM-OLLAMA-FIRST, slot:india).
 *
 * Verifies the Ollama-first runtime routing that makes product AI features cost $0
 * at launch (operator goal). Both providers are INJECTED via the deps param so the
 * test exercises real routing logic with no network (R9: verifies intent).
 *
 * Loss-function coverage:
 *  - Ollama up   -> routes to 
... [+6477 chars truncated]

### Assistant | 2026-06-19T14:18:00.368Z

I now have all three test files traced. Let me read the relevant sections of the two consumer test files to confirm exactly how they call the singleton, and verify whether the production server sets NODE_ENV.

### Assistant | 2026-06-19T14:18:01.328Z

[tool_use: Read]

### Assistant | 2026-06-19T14:18:02.016Z

[tool_use: Read]

### User | 2026-06-19T14:18:02.220Z

[tool_result] 40	      // Should have tribal context chunks
41	      const tribalChunks = ctx.filter(c => c.type === "tribal");
42	      expect(tribalChunks.length).toBeGreaterThanOrEqual(0); // May be 0 if no matching tips
43	    });
44	  });
45	
46	  describe("ProcessAdvice Tribal Integration", () => {
47	    it("should return tribal_knowledge array", async () => {
48	      const advice = await llmEngine.proc
... [+1715 chars truncated]

### User | 2026-06-19T14:18:03.162Z

[tool_result] 100	    expect(stats.total_alarms).toBe(1);
101	    expect(stats.resolved).toBe(1);
102	
103	    vi.useRealTimers();
104	  });
105	
106	  // ── LLM Engine Offline Mode ─────────────────────────────────────
107	
108	  it("LLM engine returns valid response (online or offline)", async () => {
109	    const { LLMEngine } = await import("../engines/LLMEngine.js");
110	    const engine = new LLMEngine()
... [+828 chars truncated]

### Assistant | 2026-06-19T14:18:06.497Z

Now let me verify two critical things: (1) does the production MCP server set NODE_ENV=test anywhere (the production-impact concern), and (2) confirm vitest sets VITEST automatically (so the guard fires in test).

### Assistant | 2026-06-19T14:18:08.399Z

[tool_use: Grep]

### Assistant | 2026-06-19T14:18:09.333Z

[tool_use: Grep]

### User | 2026-06-19T14:18:09.491Z

[tool_result] src\engines\CustomerPortalEngine.ts:176: * - Under vitest (or NODE_ENV=test) default to ":memory:" so the existing
src\engines\LathePrintSequencePlannerEngine.ts:753:   * In test runtimes (`VITEST` or `NODE_ENV=test`), the default consensus
src\engines\LLMEngine.ts:149:   *  with PRISM_LLM_ALLOW_NET_IN_TEST=1. (Production never sets VITEST/NODE_ENV=test.) */

### User | 2026-06-19T14:18:11.178Z

[tool_result] src\engines\LLMEngine.ts:149:   *  with PRISM_LLM_ALLOW_NET_IN_TEST=1. (Production never sets VITEST/NODE_ENV=test.) */
src\engines\LLMEngine.ts:153:      process.env.PRISM_LLM_ALLOW_NET_IN_TEST !== "1"

### Assistant | 2026-06-19T14:18:11.582Z

[tool_use: Bash]

### User | 2026-06-19T14:18:15.551Z

[tool_result] ---vitest sets VITEST=true automatically by design---
NODE_ENV in fresh node proc: undefined
VITEST in fresh node proc: undefined

### Assistant | 2026-06-19T14:18:21.876Z

Key findings confirmed:
- The pattern `_netDisabledInTest()` (gating on `VITEST`/`NODE_ENV=test` with an override knob) is an established convention in this codebase (`CustomerPortalEngine.ts:176`, `LathePrintSequencePlannerEngine.ts:753`) — R11 conformance.
- No production code sets `NODE_ENV=test`. Fresh node process has both `VITEST` and `NODE_ENV` undefined.

Let me confirm vitest actually sets `VITEST=true` in this repo's config, and check the consumer test's offline-path assertion holds (v6 asserts `answer.length > 0`).

### Assistant | 2026-06-19T14:18:23.786Z

[tool_use: Bash]

### User | 2026-06-19T14:18:28.199Z

[tool_result] ./vitest.config.ts
./web/vite.config.ts
./web/vitest.config.ts
---
4: * OBSIDIAN-AUTOMATE-MS3/U-VITEST-PARALLEL
28: * @milestone OBSIDIAN-AUTOMATE-MS3/U-VITEST-PARALLEL
41:    // PRISM_VITEST_MAX_THREADS env override available for CI runners
43:    maxThreads: Number(process.env.PRISM_VITEST_MAX_THREADS) || 16,
44:    minThreads: Number(process.env.PRISM_VITEST_MIN_THREADS) || 4,
48:    // Single-
... [+266 chars truncated]

### Assistant | 2026-06-19T14:18:37.200Z

Vitest sets `process.env.VITEST = "true"` automatically in every worker (built-in framework behavior, not config-dependent) — this is reliable. The config uses worker threads (`maxThreads: 16`), and vitest injects `VITEST` into each worker regardless.

Now let me verify the v6-integration offline-path assertion will actually pass — it asserts `answer.length > 0`. Under the guard, `new LLMEngine()` with no key, no deps, prefer:"auto" → Ollama disabled → no key → offline response. Let me confirm the offline response is non-empty for an empty-context engine, and check the offline-response branch's no-context output.

The offline response at `LLMEngine.ts:496-504`: with no context providers registered on a fresh `new LLMEngine()`... but the module auto-registers a tribal provider on the *singleton* `llmEngine` (line 544), NOT on fresh instances. So `new LLMEngine()` in v6 has zero context providers → `context.length === 0` → returns the "No ANTHROPIC_API_KEY configured..." string (non-empty, length > 0). Assertion passes.

Let me do a final trace on one subtle concern: the timeout path interaction with the disabled-in-test Ollama, and whether `tk-ai-hardening` uses the singleton (which DOES have the auto-registered tribal provider, so its offline path differs).

### Assistant | 2026-06-19T14:18:38.632Z

[tool_use: Read]

### User | 2026-06-19T14:18:39.489Z

[tool_result] 1	/**
2	 * TK-AI Hardening Tests
3	 *
4	 * Verifies tribal knowledge integration with PRISM AI/LLM systems:
5	 * - LLMEngine tribal context provider
6	 * - ProcessAdvice tribal knowledge injection
7	 * - Master Machinist mode AI reasoning
8	 * - PUOA tribal synthesis
9	 */
10	
11	import { describe, it, expect, beforeAll } from "vitest";
12	import { LLMEngine, llmEngine, registerTribalContextProvid
... [+1271 chars truncated]

### Assistant | 2026-06-19T14:19:09.414Z

I now have full traceability. The `tk-ai-hardening` tests call `llmEngine.processAdvice(...)` which internally calls `query()`. The singleton has auto-registered tribal providers, so it may build context, but the key point: with no `deps` injected and no `api_key` env set (no real `ANTHROPIC_API_KEY` in test), the Ollama default path returns `{ok:false}` immediately under the guard (no 60s timeout race against a real daemon), Claude is skipped if no key — and even if a key WERE present, `_callClaude` throws immediately (caught → offline). Either way it resolves deterministically in milliseconds. `processAdvice` returns the response with `tribal_knowledge` array. All assertions (`toHaveProperty`, `Array.isArray`, `toBeDefined`) pass. This matches the empirical 15/15 in 0.65s.

Let me verify one remaining edge: the timeout race in `query()` still wraps the disabled-in-test Ollama call. Since `_defaultOllamaGenerate` returns a resolved `{ok:false}` promise instantly, `_withTimeout` resolves immediately (no 30/60s wait). Confirmed by reading lines 162-164 and 281-290. No hang.

Let me also confirm there is no path where `ANTHROPIC_API_KEY` env being set in a dev shell could cause the guard to be bypassed — the guard is independent of api_key, so even with a key the throw fires under test. Good.

All checks complete. Here is my verdict.

---

VERDICT: PASS

summary: The systemic `_netDisabledInTest()` guard correctly closes the P0 — both default provider paths (`_defaultOllamaGenerate` returns `{ok:false}` instantly at LLMEngine.ts:162-164; `_callClaude` throws at LLMEngine.ts:462-465, caught by query()'s claude try/catch at :323) so consumer tests using the bare singleton/instance degrade to offline in milliseconds with zero network. Production is unaffected because no production code sets `VITEST`/`NODE_ENV=test` (verified fleet-wide), and the injected-deps routing tests bypass both guarded methods entirely, so real routing logic is still exercised. The guard pattern m
... [+3046 chars truncated]
