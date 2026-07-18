---
type: "chat-session"
source: "claude-code-cli"
session_id: "9dc60ef7-7881-491c-b1ee-fda1e99bc5bf"
title: "RE-REVIEW (round 2) of `H:/prism/mcp-server/src/engines/LLMEngine.ts` after fixe"
date: "2026-06-19"
first_ts: "2026-06-19T14:06:53.182Z"
last_ts: "2026-06-19T14:13:22.744Z"
cwd: "H:\\prism\\mcp-server"
messages: 55
user_msgs: 21
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-a3ff16b35a9b1289c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# RE-REVIEW (round 2) of `H:/prism/mcp-server/src/engines/LLMEngine.ts` after fixe

> **claude-code-cli** | 2026-06-19 | 55 msgs (21 user / 34 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-a3ff16b35a9b1289c.jsonl`

## Transcript

### User | 2026-06-19T14:06:53.182Z

RE-REVIEW (round 2) of `H:/prism/mcp-server/src/engines/LLMEngine.ts` after fixes for prior FAIL findings. Read the file + `H:/prism/mcp-server/src/__tests__/LLMEngine.provider-routing.test.ts` + `H:/prism/mcp-server/src/__tests__/llm-engine.test.ts`.

The change makes `LLMEngine.query()` Ollama-first (free) with adaptive Claude->offline fallback. Round-1 FAIL findings that were FIXED -- VERIFY each is actually resolved:
1. [P0] pre-existing `llm-engine.test.ts` made real Ollama calls -> NOW the 3 offline tests pass `prefer:"claude"` so with no api_key they hit offline deterministically (no network). Confirm no remaining real-network/hang path in that suite.
2. [P1] no Ollama timeout -> NOW `_withTimeout()` races the Ollama attempt against `config.ollama_timeout_ms ?? OLLAMA_TIMEOUT_MS` (default 60s, env PRISM_LLM_OLLAMA_TIMEOUT_MS); on timeout returns {ok:false} -> opens cooldown -> falls through. Confirm: no hang possible, timer is cleared (no leaked handle), a rejecting provider is caught (`safe = p.catch(...)`).
3. [P2] cache key now includes `this.config.prefer`.
4. [P2] offline fallback is NO LONGER cached (transient failures re-probe).

ALSO check for any NEW defect introduced by these fixes: the timeout race correctness, the cooldown interaction with the timeout, cache-key change not breaking the cache-hit test, the 18 tests genuinely covering the new timeout path.

Report any remaining or new P0/P1/P2 with file:line. Grade PASS or FAIL.

### Assistant | 2026-06-19T14:07:05.834Z

I'll re-review the LLMEngine changes. Let me read the three files in parallel.

### Assistant | 2026-06-19T14:07:06.323Z

[tool_use: Read]

### Assistant | 2026-06-19T14:07:06.852Z

[tool_use: Read]

### Assistant | 2026-06-19T14:07:07.036Z

[tool_use: Read]

### User | 2026-06-19T14:07:07.200Z

[tool_result] 1	/**
2	 * LLMEngine — AI-Powered Manufacturing Intelligence
3	 *
4	 * Ollama-first LLM client for natural language queries about manufacturing,
5	 * quote explanations, process advice, and G-code annotation. Routes to a FREE
6	 * local Ollama model by default (so product features cost $0 at launch), with
7	 * an adaptive fallback ladder to the paid Claude API and then a deterministic
8	 * offline
... [+21829 chars truncated]

### User | 2026-06-19T14:07:08.542Z

[tool_result] 1	/**
2	 * LLMEngine provider-routing tests (FREE-AI-MIGRATION/U-LLM-OLLAMA-FIRST, slot:india).
3	 *
4	 * Verifies the Ollama-first runtime routing that makes product AI features cost $0
5	 * at launch (operator goal). Both providers are INJECTED via the deps param so the
6	 * test exercises real routing logic with no network (R9: verifies intent).
7	 *
8	 * Loss-function coverage:
9	 *  - Ollama 
... [+6982 chars truncated]

### User | 2026-06-19T14:07:08.648Z

[tool_result] 1	/**
2	 * Tests for LLMEngine — AI-MS0
3	 */
4	import { describe, it, expect } from "vitest";
5	import { LLMEngine } from "../engines/LLMEngine.js";
6	
7	describe("LLMEngine", () => {
8	  it("creates instance", () => {
9	    const engine = new LLMEngine();
10	    expect(engine).toBeDefined();
11	  });
12	
13	  it("stats returns initial state", () => {
14	    const engine = new LLMEngine();
15	   
... [+3553 chars truncated]

### Assistant | 2026-06-19T14:07:15.231Z

Now let me verify each of the round-1 fixes and hunt for new defects. First, let me confirm the round-1 P0: do the offline tests in `llm-engine.test.ts` actually avoid the network with `prefer:"claude"` and no key?

Let me trace the provider loop for `prefer:"claude"` + no key. The three tests at lines 56-97 of `llm-engine.test.ts` use `{ api_key: undefined, prefer: "claude" }` with NO injected deps. Let me confirm the path can't hit the network or hang.

### Assistant | 2026-06-19T14:07:16.176Z

[tool_use: Read]

### User | 2026-06-19T14:07:17.022Z

[tool_result] 1	/**
2	 * OllamaClientEngine — Thin client around the `ollama` npm package
3	 *
4	 * Phase external-infra. Wraps Ollama's local LLM runtime so PRISM callers
5	 * can request chat completions, plain-text generation, and embeddings
6	 * without importing the Ollama SDK directly. The real daemon must be
7	 * running (either via `docker compose up -d ollama` or a host install);
8	 * this engine is a 
... [+2233 chars truncated]

### Assistant | 2026-06-19T14:07:17.282Z

[tool_use: Grep]

### User | 2026-06-19T14:07:18.794Z

[tool_result] Found 44 files
src\__tests__\LLMEngine.provider-routing.test.ts
src\engines\LLMEngine.ts
src\tools\dispatchers\claudeAccountDispatcher.ts
data\state\TEST_COVERAGE_INDEX.json
src\engines\business\PHASE0-FOUNDATION-READINESS.md
src\engines\PartMediaToCADEngine.ts
data\state\QA-MS11\executor-audit.json
src\engines\BlueprintVisionOCREngine.ts
src\__tests__\BlueprintToAllCADs.integration.test.ts
src\to
... [+1247 chars truncated]

### Assistant | 2026-06-19T14:07:28.447Z

The grep confirms `PRISM_LLM_PREFER` and the env knobs are read only inside `LLMEngine.ts` itself, which matters for the constructor env-default path. Let me verify the round-1 P0 concern is fully closed: that the offline tests with `prefer:"claude"` + no key genuinely cannot trigger any network/hang, and check whether the env-default `prefer` could change behavior under a non-clean env.

Let me trace carefully. In `llm-engine.test.ts`, tests at lines 56, 70, 88 construct with `prefer: "claude"` explicitly. That's `config?.prefer ?? ...`, so it's honored regardless of env. With `prefer:"claude"`, `_providerOrder()` returns `["claude"]` — Ollama is never reached. With `api_key: undefined`, the claude branch hits `if (!this.config.api_key) continue;` at line 295. But wait — line 125: `api_key: config?.api_key ?? process.env.ANTHROPIC_API_KEY`. Let me check whether the test environment could have `ANTHROPIC_API_KEY` set, which would defeat the "no key" assumption and trigger a real `_callClaude` fetch.

### Assistant | 2026-06-19T14:07:30.790Z

[tool_use: Bash]

### Assistant | 2026-06-19T14:07:31.898Z

[tool_use: Grep]

### User | 2026-06-19T14:07:33.769Z

[tool_result] Exit code 2
ANTHROPIC_API_KEY set in current env: NO
PRISM_LLM_PREFER: unset
---vitest config / setup files---
-rw-r--r-- 1 wompu 197611 3268 Jun  8 10:12 vitest.config.ts
-rw-r--r-- 1 wompu 197611 2906 Mar  7 14:09 src/__tests__/setup-reduction-engine.test.ts

### User | 2026-06-19T14:07:35.227Z

[tool_result] web\vitest.config.ts:11:    setupFiles: ['./src/__tests__/setup.ts'],

### Assistant | 2026-06-19T14:07:39.253Z

The root `vitest.config.ts` has no `setupFiles` and no `env` block (the only match was `web/vitest.config.ts`). So no global env injects `ANTHROPIC_API_KEY`. Let me read the root vitest config to confirm there's no hidden env/setup, and verify the cache-hit test interaction with the new cache-key change.

### Assistant | 2026-06-19T14:07:39.587Z

[tool_use: Read]

### User | 2026-06-19T14:07:40.424Z

[tool_result] 1	/**
2	 * Vitest configuration for mcp-server.
3	 *
4	 * OBSIDIAN-AUTOMATE-MS3/U-VITEST-PARALLEL
5	 *
6	 * Why this exists: mcp-server's test suite is ~3400 cases. Default Vitest
7	 * concurrency runs file-level workers fine but PRISM had no top-level
8	 * vitest.config so isolate/pool behaviour was implicit. Pinning the pool
9	 * and worker counts to the host gives deterministic timing and unloc
... [+2982 chars truncated]

### Assistant | 2026-06-19T14:07:56.803Z

Confirmed: no `setupFiles`, no `env` block, no `globalSetup` in the root vitest config. So the offline tests run with whatever the host env has. There's a residual environmental fragility here but it's not introduced by this diff and the host env is clean.

Now let me verify the critical concurrency/correctness details of the timeout race and the cooldown interaction. Let me trace the key scenarios precisely.

**Round-1 fix #1 (P0 — no real network in offline tests):** Confirmed resolved. The three offline tests (lines 56, 70, 88) all use `prefer:"claude"` → `_providerOrder()` returns `["claude"]` → Ollama default path (`_defaultOllamaGenerate` → real `OllamaClientEngine`) is NEVER reached. With `api_key: undefined` and no `ANTHROPIC_API_KEY` in env, line 295 `if (!this.config.api_key) continue;` skips the claude fetch → falls through to offline. No network, no hang. The `explainQuote`/`processAdvice` tests (lines 69, 87) also use `prefer:"claude"` + no key → same offline path. Note `processAdvice` does a lazy `import("./TribalKnowledgeEngine.js")` but that's local, not network.

**Round-1 fix #2 (P1 — Ollama timeout):** Let me scrutinize `_withTimeout` (lines 166-179) closely for the leaked-handle and rejecting-provider concerns.

The timer is created inside the `timeout` promise. `timer.unref?.()` is called. `safe = p.catch(...)` wraps rejections into `{ok:false}`. `Promise.race([safe, timeout]).finally(() => clearTimeout(timer))`. Let me verify a subtle ordering issue: `timer` is assigned inside the `setTimeout` Promise executor which runs synchronously during `new Promise(...)`, so `timer` is defined before `.finally()` runs. Good. The `.finally(clearTimeout)` clears the timer whether the provider wins or the timeout wins. No leaked handle.

One subtle point worth checking: when the provider `p` never resolves (the hung-ollama test, line 125), `safe` also never resolves, `timeout` wins after `ms`, race resolves `{ok:false}`, `.finally` clears the timer. The neve
... [+245 chars truncated]

### Assistant | 2026-06-19T14:07:58.260Z

[tool_use: Bash]

### User | 2026-06-19T14:08:03.697Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/LLMEngine.provider-routing.test.ts (9 tests) 46ms
stderr | src/__tests__/llm-engine.test.ts > LLMEngine > processAdvice returns structured advice
[INFO] [TribalKnowledge] Categorizing static tips (lazy init)...
[INFO] [TribalKnowledge] Loaded 4234 raw static tips
[INFO] [TribalKnowledge] Categorized 4234 static tips
[INFO] [TribalKnowledge] Loaded
... [+377 chars truncated]

### Assistant | 2026-06-19T14:08:17.460Z

All 18 tests pass with no network/hang (1.23s total). The hung-ollama timeout test (timeout 30ms) and the cooldown test both pass. Now let me hunt for new defects in the trace logic that the tests might NOT cover.

**Critical trace — the timeout path does NOT open the cooldown.** Look at lines 264-291. When `_withTimeout` returns `{ok:false}` due to timeout, the flow goes to line 277 `if (r.ok && ...)` → false → line 290 `this.ollamaDownUntil = Date.now() + OLLAMA_RETRY_COOLDOWN_MS;`. So a timeout DOES open the cooldown. Good — the review claim holds.

But let me check a **subtle new defect**: the cooldown uses `OLLAMA_RETRY_COOLDOWN_MS` (the module-level const, env `PRISM_LLM_OLLAMA_RETRY_MS`), while the timeout uses `this.config.ollama_timeout_ms`. These are independent — fine. Let me verify there's no defect where `r.value !== ""` but `r.value` is whitespace, or where `ok:true, value:null` slips through.

Line 277: `if (r.ok && r.value !== null && r.value !== "")`. If a provider returns `{ok:true, value:null}`, it correctly falls through. If `{ok:true, value:"  "}` (whitespace), it's treated as a valid answer — minor, not a regression. 

Now let me check the **most important potential new defect**: the `prefer:"ollama"` strict-free path interaction with cooldown, and whether the timeout test's `claudeCall` count assertion could be flaky. Let me also verify there's no issue with the cache being written on the Ollama-down path. Let me re-read lines 263-326 once more and check the `prefer:"ollama"` + cooldown + offline scenario for a regression.

For `prefer:"ollama"` (strict-free): `_providerOrder()` returns `["ollama"]`. If Ollama is down → cooldown opens, `continue`, loop ends → offline. Never pays Claude. Test at line 76 confirms. Good.

Let me check one more potential issue — whether the singleton `llmEngine` (line 495) constructed at module load with default `prefer:"auto"` could cause real Ollama probes in OTHER test files that import it.

### Assistant | 2026-06-19T14:08:17.704Z

[tool_use: Grep]

### Assistant | 2026-06-19T14:08:18.566Z

[tool_use: Grep]

### User | 2026-06-19T14:08:18.864Z

[tool_result] Found 4 files
src\__tests__\LLMEngine.provider-routing.test.ts
src\__tests__\llm-engine.test.ts
src\__tests__\tk-ai-hardening.test.ts
src\__tests__\v6-integration.test.ts

### User | 2026-06-19T14:08:19.650Z

[tool_result] src\engines\AIExtractionReasonerEngine.ts:18:import { llmEngine, type ContextChunk } from "./LLMEngine.js";
src\engines\ColdHeadingToolConfiguratorEngine.ts:34:import { llmEngine, type ContextChunk } from "./LLMEngine.js";
src\engines\ElectrodeAIReasoningEngine.ts:44:import { llmEngine, type ContextChunk, type LLMResponse } from "./LLMEngine.js";
src\engines\LocalModelOrchestratorEngine.ts:36:impo
... [+750 chars truncated]

### Assistant | 2026-06-19T14:08:30.213Z

Two other test files use `LLMEngine`/`llmEngine`: `tk-ai-hardening.test.ts` and `v6-integration.test.ts`. These could exercise the live Ollama-first path on the singleton (`prefer:"auto"`). Let me check whether the diff introduced a regression there — i.e., do those tests now make real Ollama calls or hang because the default `prefer` is now `"auto"` (Ollama-first) instead of the prior Claude-only behavior?

### Assistant | 2026-06-19T14:08:30.895Z

[tool_use: Read]

### User | 2026-06-19T14:08:31.712Z

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
... [+9241 chars truncated]

### Assistant | 2026-06-19T14:08:40.798Z

This is the key blast-radius concern. `tk-ai-hardening.test.ts` calls `llmEngine.processAdvice(...)` (lines 48, 58, 78) on the **singleton** `llmEngine` (line 495 of LLMEngine.ts), constructed with default `prefer:"auto"`. Previously (Claude-only, no key) these would deterministically go offline with no network. Now with `prefer:"auto"`, `processAdvice` → `query` → tries Ollama-first via `_defaultOllamaGenerate` → **real `OllamaClientEngine.connect()` + `.generate()`** against `http://127.0.0.1:11434`.

This is a **real-network path that the diff introduced** into a pre-existing test suite. It does NOT hang (the new `_withTimeout` bounds it to the default 60s, and a connect failure returns fast ~64ms), but it IS a real network call in a unit test, and if Ollama IS up on the dev box it becomes a slow, non-deterministic call. This is the exact class of problem round-1 fix #1 was meant to eliminate, but it was only fixed in `llm-engine.test.ts`, NOT in `tk-ai-hardening.test.ts`. Let me also check `v6-integration.test.ts`, then run `tk-ai-hardening` to measure real behavior.

### Assistant | 2026-06-19T14:08:42.686Z

[tool_use: Grep]

### Assistant | 2026-06-19T14:08:43.789Z

[tool_use: Bash]

### User | 2026-06-19T14:08:43.904Z

[tool_result] 13:    expect(idx.llmEngine).toBeDefined();
109:    const { LLMEngine } = await import("../engines/LLMEngine.js");
110:    const engine = new LLMEngine();
112:    const result = await engine.query({

### User | 2026-06-19T14:08:48.122Z

[tool_result] Ollama up? probe :11434
OLLAMA UP

### Assistant | 2026-06-19T14:08:51.421Z

Ollama IS up on this box. And `v6-integration.test.ts:109-112` constructs `new LLMEngine()` (default `prefer:"auto"`) and calls `.query(...)` — let me read that block to see if it asserts the model is "offline" (which would now FAIL because it routes to live Ollama).

### Assistant | 2026-06-19T14:08:52.708Z

[tool_use: Read]

### User | 2026-06-19T14:08:53.617Z

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
... [+1262 chars truncated]

### Assistant | 2026-06-19T14:09:01.263Z

`v6-integration.test.ts` was already tolerant ("online or offline", only checks `answer.length > 0`), so it won't fail — but it now makes a **real, slow Ollama generation call** (cold model load of `qwen2.5-coder:32b` could take many seconds, up to the 60s timeout). The test title even says "Offline Mode" but it now hits live Ollama.

The more serious one is `tk-ai-hardening.test.ts` — let me measure its real-world behavior now that Ollama is up. This is the verification that matters.

### Assistant | 2026-06-19T14:09:03.139Z

[tool_use: Bash]

### User | 2026-06-19T14:09:07.098Z

[tool_result] === tk-ai-hardening (real Ollama up) ===
/usr/bin/bash: line 1: /usr/bin/time: No such file or directory

### Assistant | 2026-06-19T14:09:10.698Z

[tool_use: Bash]

### User | 2026-06-19T14:12:09.569Z

[tool_result] If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ src/__tests__/tk-ai-hardening.test.ts:209:5
    207|     });
    208|
    209|     it("should provide reasoning with tribal context for tool selectio…
       |     ^
    210|       const result = await prismIntelligence.reason({
    211|         domain: "tool_selection",

⎯⎯⎯⎯⎯
... [+855 chars truncated]

### Assistant | 2026-06-19T14:12:17.685Z

Confirmed — this is a real, reproducible regression introduced by the diff. With Ollama up, `tk-ai-hardening.test.ts` now **FAILS: 4 tests time out at 30s each**, total wall time **176s** (was a fast unit suite before). The diff made the singleton `llmEngine` Ollama-first, so `processAdvice`/`prismIntelligence.reason` now issue real `qwen2.5-coder:32b` generations that exceed the 30s per-test vitest budget.

This is exactly the round-1 P0 defect class ("pre-existing test made real Ollama calls") — fix #1 patched it ONLY in `llm-engine.test.ts`, but the same change broke `tk-ai-hardening.test.ts` (and slowed `v6-integration.test.ts`), which round-1 did not survey. The 60s engine timeout doesn't help because vitest's per-test budget is 30s.

Let me confirm the baseline: did this suite pass before the diff? Let me check git to see if the diff is what flipped `llmEngine` to Ollama-first (i.e., that this failure is attributable to this change, not pre-existing).

### Assistant | 2026-06-19T14:12:20.800Z

[tool_use: Bash]

### User | 2026-06-19T14:12:24.708Z

[tool_result] === is LLMEngine.ts modified in this session? ===
?? src/__tests__/llm-engine.test.ts
?? src/engines/LLMEngine.ts
=== prefer default at HEAD (committed) vs working tree ===

### Assistant | 2026-06-19T14:12:29.559Z

Important finding: `LLMEngine.ts` and `llm-engine.test.ts` are **untracked (`??`)** — they do NOT exist at HEAD. The provider-routing test and `tk-ai-hardening.test.ts` are already tracked. Let me verify what HEAD looked like for LLMEngine — there may be a different on-disk history. Let me check whether the engine was previously committed under git and confirm the "before" behavior, and confirm `tk-ai-hardening.test.ts`/`v6-integration.test.ts` are unmodified by this session.

### Assistant | 2026-06-19T14:12:33.724Z

[tool_use: Bash]

### User | 2026-06-19T14:12:41.674Z

[tool_result] === git log touching LLMEngine.ts ===
33532ea59f [MAIN] [CHORE]/lint: LLMEngine._generateOfflineResponse — rename unused `prompt` param to `_prompt`
ca43a5fdc3 [MAIN] [HARNESS-AUDIT]/U-TIER3c: keep-pattern hardening for node-orphan-cleaner
14b17f2e11 [CAD-FUSION-LIVE-MS0]/U-LLM-TRIBAL-WIRE: register tribal context provider + wire Master Machinist into processAdvice
=== status of the two consumer t
... [+422 chars truncated]

### Assistant | 2026-06-19T14:12:48.105Z

This nails it. At the last committed version (`33532ea59f`), `LLMEngine.ts` had **no `prefer`, no `ollama` path** — `query()` checked `if (!this.config.api_key)` and went straight to offline (line 163). So previously, `tk-ai-hardening.test.ts` ran the singleton `llmEngine` with **no key → instant offline, no network**. The current diff (the Ollama-first rewrite) is what introduced the live Ollama calls that now time out.

The two consumer tests (`tk-ai-hardening.test.ts`, `v6-integration.test.ts`) are **tracked-clean / unmodified** — they were NOT updated to account for the new Ollama-first default. This is the classic un-updated-consumer silent break (here, loud: 4 timeouts + 176s suite).

Let me confirm the full pre/post contrast by checking the committed query() body and confirm there's no `prefer` injection point the consumer tests could have used.

### Assistant | 2026-06-19T14:12:49.817Z

[tool_use: Bash]

### User | 2026-06-19T14:12:53.322Z

[tool_result] === committed query() body (33532ea59f) lines ~140-200 ===
      input.max_context_chunks ?? 10
    );

    const contextText = context.length > 0
      ? `\n\nRelevant PRISM manufacturing data:\n${context.map(c => `[${c.type}] ${c.title}: ${c.content}`).join("\n")}`
      : "";

    const systemPrompt = `You are PRISM, an AI manufacturing intelligence assistant.
You help machinists and engineers 
... [+1827 chars truncated]

### Assistant | 2026-06-19T14:13:22.744Z

Confirmed beyond doubt. The committed `query()` went **straight to offline when no api_key** — zero network. The diff's Ollama-first rewrite routes the keyless singleton to live Ollama first, which is what breaks `tk-ai-hardening.test.ts` (4 timeouts, 176s) on any box where Ollama is running. The fix correctly hardened `llm-engine.test.ts` (pass `prefer:"claude"`) but **missed the two other consumers** that call the singleton.

I have enough to render a verdict. Let me note the secondary observation about the offline-cache claim for completeness — round-1 fix #4 says offline is no longer cached; the new code (lines 314-325) indeed does not cache offline. That's resolved. And fix #3 (cache key includes `prefer`, line 491) is resolved. Both verified.

Let me give the final report.

---

VERDICT: FAIL

summary: Round-1 fixes #2/#3/#4 are genuinely resolved (timeout race is leak-free and catches rejections, cache key includes `prefer`, offline is no longer cached) and the 18 targeted tests pass in 1.2s. But fix #1 was applied only to `llm-engine.test.ts`; the same Ollama-first rewrite silently broke two *other, unmodified* consumers of the default-`auto` singleton `llmEngine`. With Ollama running (it is, on this box), `tk-ai-hardening.test.ts` now FAILS with 4 per-test 30s timeouts and a 176s wall (verified live), and `v6-integration.test.ts` now makes a real model-generation call where it previously went instantly offline. This is the classic un-updated-consumer break the gate exists to catch.

findings:
- [P0] `H:/prism/mcp-server/src/__tests__/tk-ai-hardening.test.ts:48,58,78,191,210,225` -- The singleton `llmEngine` (LLMEngine.ts:495) now defaults to `prefer:"auto"` (Ollama-first). These tests call `llmEngine.processAdvice(...)` / `prismIntelligence.reason(...)` with no api_key, which previously hit the instant offline path (committed `33532ea59f` LLMEngine.ts:163 `if (!this.config.api_key)` -> offline, zero network). The diff reroutes them to a live `qwen2.5-coder:
... [+2730 chars truncated]
