---
type: "chat-session"
source: "claude-code-cli"
session_id: "9dc60ef7-7881-491c-b1ee-fda1e99bc5bf"
title: "Review a small ADDITIVE change to `H:/prism/mcp-server/src/engines/LLMEngine.ts`"
date: "2026-06-19"
first_ts: "2026-06-19T15:40:41.326Z"
last_ts: "2026-06-19T15:43:03.342Z"
cwd: "H:\\prism\\mcp-server"
messages: 37
user_msgs: 13
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-abff1f00ca547f115.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review a small ADDITIVE change to `H:/prism/mcp-server/src/engines/LLMEngine.ts`

> **claude-code-cli** | 2026-06-19 | 37 msgs (13 user / 24 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-abff1f00ca547f115.jsonl`

## Transcript

### User | 2026-06-19T15:40:41.326Z

Review a small ADDITIVE change to `H:/prism/mcp-server/src/engines/LLMEngine.ts` + its tests `H:/prism/mcp-server/src/__tests__/LLMEngine.provider-routing.test.ts` (read both).

THE CHANGE (3 parts): (1) new optional `LLMQuery.system?: string`; (2) in `query()`, the systemPrompt is now `input.system ? \`${input.system}${contextText}\` : <default PRISM manufacturing prompt>${contextText}`; (3) `_cacheKey` now includes a 40-char slice of `input.system`.

PURPOSE: let any caller with its own system prompt (agentic task-delegation / orchestration engines among the 11 paid-Claude call sites) route through the now-free Ollama-first llmEngine.query WITHOUT losing its system prompt (the contract-divergence risk). Operator goal: free-at-launch AI with Claude as smart backup.

VERIFY:
1. The override correctly REPLACES the default system prompt (not appends to it) while still appending registered context (`contextText`); confirm both the Ollama and Claude paths receive the overridden system (trace systemPrompt usage in query()).
2. The cache-key addition prevents a cross-system collision (two callers, same prompt, different system -> must not share a cache entry). Is a 40-char slice enough, or could two distinct long system prompts collide on their first 40 chars (P2)?
3. Backward compat: callers that DON'T pass `system` get the exact prior default prompt + behavior. Confirm the 6 existing consumers are unaffected.
4. TEST INTEGRITY R9: the 3 new tests assert real values (system reaches Ollama; reaches Claude on escalation; cache isolates system). Real reference values, no .skip/.only? Any gap?

Report P0/P1/P2 with file:line. Grade PASS or FAIL.

### Assistant | 2026-06-19T15:40:48.868Z

I'll review this change. Let me start by reading both files end to end.

### Assistant | 2026-06-19T15:40:49.756Z

[tool_use: Read]

### Assistant | 2026-06-19T15:40:49.850Z

[tool_use: Read]

### User | 2026-06-19T15:40:50.949Z

[tool_result] 1	/**
2	 * LLMEngine — AI-Powered Manufacturing Intelligence
3	 *
4	 * Ollama-first LLM client for natural language queries about manufacturing,
5	 * quote explanations, process advice, and G-code annotation. Routes to a FREE
6	 * local Ollama model by default (so product features cost $0 at launch), with
7	 * an adaptive fallback ladder to the paid Claude API and then a deterministic
8	 * offline
... [+27259 chars truncated]

### User | 2026-06-19T15:40:50.965Z

[tool_result] 1	/**
2	 * LLMEngine provider-routing tests (FREE-AI-MIGRATION/U-LLM-OLLAMA-FIRST, slot:india).
3	 *
4	 * Verifies the Ollama-first runtime routing that makes product AI features cost $0
5	 * at launch (operator goal). Both providers are INJECTED via the deps param so the
6	 * test exercises real routing logic with no network (R9: verifies intent).
7	 *
8	 * Loss-function coverage:
9	 *  - Ollama 
... [+15298 chars truncated]

### Assistant | 2026-06-19T15:40:57.939Z

I've read both files end to end. Let me verify a few specific claims in the task prompt before judging. First, let me confirm the diff actually matches what's described, and check the test for the `slice(0,12)` assertion behavior.

### Assistant | 2026-06-19T15:40:59.048Z

[tool_use: Bash]

### User | 2026-06-19T15:41:02.754Z

[tool_result] diff --git a/mcp-server/src/__tests__/LLMEngine.provider-routing.test.ts b/mcp-server/src/__tests__/LLMEngine.provider-routing.test.ts
new file mode 100644
index 0000000000..49f33cddea
--- /dev/null
+++ b/mcp-server/src/__tests__/LLMEngine.provider-routing.test.ts
@@ -0,0 +1,304 @@
+/**
+ * LLMEngine provider-routing tests (FREE-AI-MIGRATION/U-LLM-OLLAMA-FIRST, slot:india).
+ *
+ * Verifies the Ol
... [+9139 chars truncated]

### Assistant | 2026-06-19T15:41:09.321Z

The diff confirms the test file is new. The hook message is a generic false-positive (no test was run). Let me see the LLMEngine.ts diff specifically to confirm the 3-part change against `main`.

### Assistant | 2026-06-19T15:41:10.255Z

[tool_use: Bash]

### User | 2026-06-19T15:41:14.790Z

[tool_result] <persisted-output>
Output too large (35.9KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\9dc60ef7-7881-491c-b1ee-fda1e99bc5bf\tool-results\by69vdzot.txt

Preview (first 2KB):
diff --git a/mcp-server/src/engines/LLMEngine.ts b/mcp-server/src/engines/LLMEngine.ts
index 3b3ad5bed6..146fe5d188 100644
--- a/mcp-server/src/engines/LLMEngine.ts
+++ b/mcp-server/src/engines/LLMEngine.t
... [+1813 chars truncated]

### Assistant | 2026-06-19T15:41:18.058Z

The diff is large because this is a broader Ollama-first migration, but my task is specifically the 3-part system-prompt change. Let me grep the diff for the exact additions concerning `system` to confirm they are present and isolate them.

### Assistant | 2026-06-19T15:41:19.774Z

[tool_use: Bash]

### User | 2026-06-19T15:41:23.792Z

[tool_result] 88:+    model: string; prompt: string; system?: string; temperature?: number; maxTokens?: number;
91:+    system: string, user: string, temperature: number, maxTokens: number,
132:+  /** Override the system prompt. When set, this REPLACES the default PRISM
133:+   *  manufacturing-assistant system prompt (registered context is still appended),
134:+   *  so a caller with its own system prompt -- e
... [+760 chars truncated]

### Assistant | 2026-06-19T15:41:26.960Z

All three parts of the change are confirmed in the diff. Now let me verify the 6 existing consumers mentioned in the WIRE-EXEMPT comment to confirm backward compatibility (none pass `system`, so they get the default prompt + prior behavior).

### Assistant | 2026-06-19T15:41:29.827Z

[tool_use: Bash]

### User | 2026-06-19T15:41:33.677Z

[tool_result] mcp-server/src/engines/AIExtractionReasonerEngine.ts:302:      const response = await llmEngine.query({
mcp-server/src/engines/AIExtractionReasonerEngine.ts:383:      const response = await llmEngine.query({
mcp-server/src/engines/AIExtractionReasonerEngine.ts:466:      const response = await llmEngine.query({
mcp-server/src/engines/ColdHeadingToolConfiguratorEngine.ts:342:    const response = awa
... [+552 chars truncated]

### Assistant | 2026-06-19T15:41:37.649Z

Let me check whether any existing consumer already passes a `system` key in their query objects (which would mean their behavior changes), and broaden the grep across all llmEngine.query call sites in the codebase to confirm none pre-existingly use `system`.

### Assistant | 2026-06-19T15:41:40.841Z

[tool_use: Bash]

### User | 2026-06-19T15:41:44.656Z

[tool_result] === All llmEngine.query call sites ===
mcp-server/src/engines/AIExtractionReasonerEngine.ts
mcp-server/src/engines/ColdHeadingToolConfiguratorEngine.ts
mcp-server/src/engines/ElectrodeAIReasoningEngine.ts
mcp-server/src/engines/PRISMIntelligenceLayer.ts
mcp-server/src/engines/TrilobeElectrodeGeometryEngine.ts
=== Any consumer passing a 'system:' key to .query ===
---EXIT 1---

### Assistant | 2026-06-19T15:41:49.445Z

No existing consumer passes `system`, so they all hit the `input.system ? ... : <default>` else-branch and receive the exact prior default prompt. Backward compat confirmed. Note: `LocalModelOrchestratorEngine` does not actually call `llmEngine.query` (it's named in the WIRE-EXEMPT comment as a consumer of the engine, but not via `.query`) — not load-bearing for this review.

Now let me verify one subtle behavioral point: in the default (no-`system`) branch, the prior code's default prompt. Let me check what the default prompt looked like on `main` to confirm part (2) preserves it byte-for-byte in the else branch.

### Assistant | 2026-06-19T15:41:50.745Z

[tool_use: Bash]

### User | 2026-06-19T15:41:54.683Z

[tool_result] === main version of systemPrompt construction ===
223:    const systemPrompt = `You are PRISM, an AI manufacturing intelligence assistant.
224-You help machinists and engineers with CNC machining questions, quoting,
225-material selection, and process optimization. Be specific and practical.
226-Reference data from the PRISM knowledge base when available.${contextText}`;
227-
228-    // Call a liv
... [+89 chars truncated]

### Assistant | 2026-06-19T15:42:05.486Z

Confirmed: the else-branch default prompt in the new code (lines 319-322) is byte-for-byte identical to `main`'s default prompt (including the `${contextText}` append). Backward compat for the default-prompt text is exact.

Now let me trace the two systemPrompt usage paths one more time precisely to confirm both Ollama and Claude receive the overridden system, and analyze the cache-key isolation and the 40-char collision question. Let me also double-check the `okOllama` helper used in the system-override Claude test returns a refusal that actually triggers escalation given the default adequacy heuristic.

The key facts I've verified from the code:
- Line 317-322: `systemPrompt` = override-or-default, with `contextText` appended in BOTH branches.
- Line 340 (Ollama path): `system: systemPrompt` passed to `ollamaGenerate`. ✓
- Line 380 (Claude path): `claudeCall(systemPrompt, ...)`. ✓
- Line 546: `_callClaude` passes `system` into the real Anthropic request body. ✓
- Line 577-578: `_cacheKey` includes `sysKey = input.system.slice(0,40)`.

Let me verify the escalation test (line 282-292) logic — `okOllama("I cannot help.")` must be classified inadequate by the leading-refusal regex so Claude is reached with the system prompt.

### Assistant | 2026-06-19T15:42:08.256Z

[tool_use: Bash]

### User | 2026-06-19T15:42:11.628Z

[tool_result] I cannot help. -> true
delegated-task answer -> false
---EXIT 0---

### Assistant | 2026-06-19T15:42:16.893Z

Confirmed: `"I cannot help."` is classified as a leading refusal → inadequate → escalates to Claude (with `api_key=KEY` set, a backup is available), so the Claude-path test (line 282) correctly reaches `claudeCall` and the assertion `sentSystem.toContain("autonomous build agent")` is meaningful. And `"delegated-task answer"` is adequate → stays on Ollama, so the Ollama-path test (line 270) correctly verifies the override reaches Ollama without escalation.

Now let me run the actual test file to confirm all tests pass (R9 — a green suite that actually exercises the logic), since the prompt asks me to verify test integrity.

### Assistant | 2026-06-19T15:42:18.063Z

[tool_use: Bash]

### User | 2026-06-19T15:42:21.956Z

[tool_result] ⎯⎯⎯⎯⎯⎯⎯ Startup Error ⎯⎯⎯⎯⎯⎯⎯⎯
Error: Failed to load custom Reporter from basic
    at loadCustomReporterModule (file:///H:/prism/mcp-server/node_modules/vitest/dist/chunks/cli-api.Cjt90eJu.js:11346:9)
    at file:///H:/prism/mcp-server/node_modules/vitest/dist/chunks/cli-api.Cjt90eJu.js:11362:23
    ... 3 lines matching cause stack trace ...
    at _createServer (file:///H:/prism/mcp-server/node_
... [+2848 chars truncated]

### Assistant | 2026-06-19T15:42:26.066Z

The `basic` reporter isn't available in this vitest version. Let me run with the default reporter and from the mcp-server directory.

### Assistant | 2026-06-19T15:42:27.652Z

[tool_use: Bash]

### User | 2026-06-19T15:42:31.808Z

[tool_result]  RUN  v4.1.5 H:/prism/mcp-server

 ✓ src/__tests__/LLMEngine.provider-routing.test.ts (21 tests) 39ms

 Test Files  1 passed (1)
      Tests  21 passed (21)
   Start at  10:42:30
   Duration  231ms (transform 108ms, setup 0ms, import 41ms, tests 39ms, environment 0ms)

---EXIT 0---

### Assistant | 2026-06-19T15:42:35.350Z

All 21 tests pass (including the 3 new system-override tests). Now let me confirm there are no `.skip`/`.only`/`toBeDefined()` stub-asserts in the test file, and confirm the 40-char cache-key collision analysis with a quick check of how the cache key is composed (it also includes `prompt.slice(0,100)`, which matters for the collision question).

### Assistant | 2026-06-19T15:42:36.823Z

[tool_use: Grep]

### User | 2026-06-19T15:42:37.827Z

[tool_result] No matches found

### Assistant | 2026-06-19T15:43:03.342Z

No `.skip`/`.only`/`.todo`/`fit`/`xit`/`toBeDefined()` stubs in the test file. The graph context is unrelated (matched node names elsewhere). 

I have everything I need. Let me finalize my analysis on the 40-char collision question (P2 per the prompt). The cache key is:
`${prefer}:${complexity}:${min_answer_chars}:${sysKey=system.slice(0,40)}:${prompt.slice(0,100)}:${context_types}`

Two callers with the same prompt but different systems that share the first 40 chars AND have identical prefer/complexity/min_answer_chars/context_types would collide. The first-40 question is mitigated by the prompt also being keyed, but two orchestration callers issuing the same user prompt under boilerplate-prefixed system prompts (e.g. "You are an autonomous PRISM build agent operating in slot ...") is a realistic scenario where the first 40 chars are shared boilerplate. This is a genuine P2, exactly as the prompt anticipated.

I've completed all verification. Here is my report.

---

VERDICT: PASS

summary: The 3-part additive change (`LLMQuery.system?`, override-vs-default systemPrompt construction, and `_cacheKey` system slice) is correct, backward-compatible, and well-tested. The override correctly REPLACES the default prompt while still appending `contextText`, and reaches both the Ollama and Claude paths via the single shared `systemPrompt` variable. All 21 tests pass and exercise real routing logic. One genuine P2 (the 40-char slice can collide on boilerplate-prefixed system prompts) — deferrable, not merge-blocking.

findings:
- [P2] `H:/prism/mcp-server/src/engines/LLMEngine.ts:577-578` — `_cacheKey` keys the system override on `input.system.slice(0,40)`. Two callers issuing the SAME user prompt (the prompt is also only `slice(0,100)`) with DIFFERENT system prompts that share their first 40 chars AND identical `prefer`/`complexity`/`min_answer_chars`/`context_types` would collide and the second caller would be served the first caller's cached answer. This is realistic for o
... [+2724 chars truncated]
