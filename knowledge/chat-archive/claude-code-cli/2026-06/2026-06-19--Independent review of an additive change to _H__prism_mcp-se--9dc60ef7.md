---
type: "chat-session"
source: "claude-code-cli"
session_id: "9dc60ef7-7881-491c-b1ee-fda1e99bc5bf"
title: "Independent review of an additive change to `H:/prism/mcp-server/src/engines/LLM"
date: "2026-06-19"
first_ts: "2026-06-19T15:40:50.382Z"
last_ts: "2026-06-19T15:44:14.261Z"
cwd: "H:\\prism\\mcp-server"
messages: 59
user_msgs: 23
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-adf31dee8548203b7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Independent review of an additive change to `H:/prism/mcp-server/src/engines/LLM

> **claude-code-cli** | 2026-06-19 | 59 msgs (23 user / 36 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-adf31dee8548203b7.jsonl`

## Transcript

### User | 2026-06-19T15:40:50.382Z

Independent review of an additive change to `H:/prism/mcp-server/src/engines/LLMEngine.ts` (read the file + the test `H:/prism/mcp-server/src/__tests__/LLMEngine.provider-routing.test.ts`).

CHANGE: added optional `LLMQuery.system?` that overrides the default PRISM system prompt in `query()` (context still appended), plus a system-slice in `_cacheKey`. Lets callers with their own system prompt use the free Ollama-first substrate.

WEIGHT TOWARD silent breakage / regression:
1. Does adding the override change ANY behavior for the existing 6 consumers (AIExtractionReasoner, ColdHeadingToolConfigurator, ElectrodeAIReasoning, LocalModelOrchestrator, PRISMIntelligenceLayer, TrilobeElectrodeGeometry) which do NOT pass `system`? Confirm byte-identical default path.
2. Interaction with the prior features: does the system override interact correctly with the adequacy/capability-escalation (the overridden system goes to BOTH Ollama and the Claude escalation), the offline path (does offline ignore system, acceptable?), and the test-hermeticity guard?
3. Cache-key correctness: prefer + complexity + min_answer_chars + system-slice + prompt-slice + context_types — any ordering/delimiter collision risk?
4. tsc: any type issue from the new optional field?
5. Is `system` an injection vector (it's caller-supplied and goes into the LLM system role) — acceptable since callers are internal, but note if any of the 11 sites would pass untrusted user input as system.

Report P0/P1/P2 with file:line. Grade PASS or FAIL.

### Assistant | 2026-06-19T15:40:58.562Z

I'll review this change. Let me start by reading the engine file and the test, then trace all consumers.

### Assistant | 2026-06-19T15:40:59.090Z

[tool_use: Read]

### Assistant | 2026-06-19T15:40:59.432Z

[tool_use: Read]

### User | 2026-06-19T15:40:59.848Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\LLMEngine.ts' was already read 10s ago in this session and is unchanged (mtime 1781883501972). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-19T15:41:00.050Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\LLMEngine.provider-routing.test.ts' was already read 10s ago in this session and is unchanged (mtime 1781883528575). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PR
... [+17 chars truncated]

### Assistant | 2026-06-19T15:41:02.947Z

The guard says these were already read, but I don't have the content in my context (fresh task). Let me bypass the cache.

### Assistant | 2026-06-19T15:41:03.656Z

[tool_use: Bash]

### User | 2026-06-19T15:41:06.992Z

[tool_result] /**
 * LLMEngine — AI-Powered Manufacturing Intelligence
 *
 * Ollama-first LLM client for natural language queries about manufacturing,
 * quote explanations, process advice, and G-code annotation. Routes to a FREE
 * local Ollama model by default (so product features cost $0 at launch), with
 * an adaptive fallback ladder to the paid Claude API and then a deterministic
 * offline response
... [+17688 chars truncated]

### Assistant | 2026-06-19T15:41:09.401Z

Let me read the rest of the file (the offline path) and the cache-key method.

### Assistant | 2026-06-19T15:41:10.517Z

[tool_use: Bash]

### User | 2026-06-19T15:41:15.342Z

[tool_result]     return {
      answer: this._generateOfflineResponse(input.prompt, context),
      context_used: ctxTitles,
      model: "offline",
      tokens_used: { input: 0, output: 0 },
      duration_ms: Date.now() - start,
      cached: false,
    };
  }

  /**
   * Explain why a quote costs what it does.
   */
  async explainQuote(quoteData: {
    part_name: string;
    material: string;
    quantity
... [+3649 chars truncated]

### Assistant | 2026-06-19T15:41:19.228Z

[tool_use: Bash]

### User | 2026-06-19T15:41:23.080Z

[tool_result]       has_api_key: !!this.config.api_key,
    };
  }

  // ── Private Methods ─────────────────────────────────────────────

  private async _callClaude(
    system: string, user: string,
    temperature: number, maxTokens: number
  ): Promise<{ text: string; usage: { input: number; output: number } }> {
    if (this._netDisabledInTest()) {
      // Caught by the claude try/catch in query() -> fal
... [+3225 chars truncated]

### Assistant | 2026-06-19T15:41:25.416Z

Now I have the full engine. Let me read the test file and trace the 6 consumers.

### Assistant | 2026-06-19T15:41:26.456Z

[tool_use: Bash]

### User | 2026-06-19T15:41:30.938Z

[tool_result] /**
 * LLMEngine provider-routing tests (FREE-AI-MIGRATION/U-LLM-OLLAMA-FIRST, slot:india).
 *
 * Verifies the Ollama-first runtime routing that makes product AI features cost $0
 * at launch (operator goal). Both providers are INJECTED via the deps param so the
 * test exercises real routing logic with no network (R9: verifies intent).
 *
 * Loss-function coverage:
 *  - Ollama up   -> routes to 
... [+14185 chars truncated]

### Assistant | 2026-06-19T15:41:34.377Z

Now let me trace the consumers. Let me find all call sites of `.query(` on the LLM engine and confirm none of the 6 consumers pass `system`, plus check the broader blast radius of `LLMQuery`.

### Assistant | 2026-06-19T15:41:35.334Z

[tool_use: Grep]

### Assistant | 2026-06-19T15:41:36.355Z

[tool_use: Grep]

### User | 2026-06-19T15:41:36.587Z

[tool_result] Found 17 files
src\__tests__\LLMEngine.provider-routing.test.ts
src\engines\LLMEngine.ts
src\engines\ElectrodeAIReasoningEngine.ts
src\__tests__\llm-engine.test.ts
src\engines\PRISMIntelligenceLayer.ts
src\engines\ElectrodeAdvancedAIEngine.ts
src\__tests__\aiReasoningDispatcher.test.ts
src\routes\agent.ts
src\__tests__\LocalModelOrchestratorEngine.test.ts
src\engines\LocalModelOrchestratorEngine.t
... [+293 chars truncated]

### User | 2026-06-19T15:41:37.410Z

[tool_result] src\__tests__\LLMEngine.provider-routing.test.ts:274:    const res = await eng.query({ prompt: "do unit X", system: "You are an autonomous build agent. Complete the unit." });
src\__tests__\LLMEngine.provider-routing.test.ts:287:    const res = await eng.query({ prompt: "hard unit", system: "You are an autonomous build agent." });
src\__tests__\LLMEngine.provider-routing.test.ts:298:    const a = 
... [+313 chars truncated]

### Assistant | 2026-06-19T15:41:41.434Z

The only non-test `system:` passed to `.query()` is the `MultiCamKnowledgeEngine` which is a different engine (its `query` takes `{system: "mastercam"}` — a CAM vendor name, unrelated). Good — no LLMEngine consumer passes `system`. Let me verify the 6 named consumers' actual `.query()` calls to confirm the byte-identical default path, and check how each calls into the engine.

### Assistant | 2026-06-19T15:41:42.833Z

[tool_use: Grep]

### User | 2026-06-19T15:41:43.783Z

[tool_result] 241-
242-    // Register consumer context with LLM engine
243:    llmEngine.registerContextProvider(getConsumerContextChunks);
244-
245-    this.loadFeedback();
--
300-
301-    try {
302:      const response = await llmEngine.query({
303-        prompt,
304-        context_types: ["custom"],
--
381-
382-    try {
383:      const response = await llmEngine.query({
384-        prompt,
385-        co
... [+167 chars truncated]

### Assistant | 2026-06-19T15:41:44.731Z

[tool_use: Grep]

### User | 2026-06-19T15:41:45.688Z

[tool_result] 210- */
211-function registerContextProvider(): void {
212:  llmEngine.registerContextProvider(() => {
213-    const chunks: ContextChunk[] = [];
214-
--
340-Recommend electrode material (EDM-200/EDM-3/AF-5/CuW70) and number of electrode stages (1-4).`;
341-
342:    const response = await llmEngine.query({
343-      prompt,
344-      context_types: ["material", "tribal", "custom"],

### Assistant | 2026-06-19T15:41:45.713Z

[tool_use: Grep]

### User | 2026-06-19T15:41:46.722Z

[tool_result] 401-Think step-by-step. What are the critical considerations?`;
402-
403:  const step1Response = await llmEngine.query({
404-    prompt: step1Prompt,
405-    context_types: ["material", "formula", "safety", "tribal"],
--
425-Consider safety constraints and PRISM physics constants.`;
426-
427:  const step2Response = await llmEngine.query({
428-    prompt: step2Prompt,
429-    context_types: ["formu
... [+311 chars truncated]

### Assistant | 2026-06-19T15:41:50.243Z

Confirmed: the 3 consumers checked pass only `prompt` + `context_types` (no `system`). Let me verify the remaining 3 named consumers and check the second test file (`llm-engine.test.ts`) plus the `LLMQuery` type usage in `agent.ts`/`PromptCachingEngine.ts` which appeared in the grep.

### Assistant | 2026-06-19T15:41:52.144Z

[tool_use: Grep]

### User | 2026-06-19T15:41:53.076Z

[tool_result] 34-} from "./ModelRoutingEngine.js";
35-import type { OllamaClientEngine, OllamaMessage } from "./OllamaClientEngine.js";
36:import type { LLMEngine, LLMQuery, LLMResponse } from "./LLMEngine.js";
37-
38-export interface OrchestrateRequest {
--
234-      const prompt = req.prompt ?? "";
235-      if (!prompt) throw new Error("empty prompt for anthropic call");
236:      const query: LLMQuery = {
2
... [+194 chars truncated]

### Assistant | 2026-06-19T15:41:53.560Z

[tool_use: Grep]

### Assistant | 2026-06-19T15:41:54.781Z

[tool_use: Grep]

### User | 2026-06-19T15:41:54.911Z

[tool_result] 290-
291-      // Call LLM
292:      const response = await llmEngine.query({
293-        prompt: userPrompt,
294-        temperature: options.temperature ?? 0.3,

### User | 2026-06-19T15:41:55.982Z

[tool_result] 495- */
496-function registerContextProvider(): void {
497:  llmEngine.registerContextProvider(() => {
498-    const chunks: ContextChunk[] = [];
499-
--
535-Consider milling strategy (3D contour vs adaptive) and any special requirements.`;
536-
537:  const response = await llmEngine.query({
538-    prompt,
539-    context_types: ["custom", "material", "tribal"],

### Assistant | 2026-06-19T15:42:02.268Z

All 6 consumers confirmed: none constructs an `LLMQuery` with a `system` field. `LocalModelOrchestratorEngine` builds an explicit `const query: LLMQuery = { prompt, max_tokens }` — TypeScript-checked, and since `system` is optional it stays valid. The other 5 pass object literals with only `prompt`/`context_types`/`temperature`/`max_tokens`.

Now let me check the other test file and the `agent.ts` route (which appeared with a `system:` grep hit earlier in the multiline search — actually that was MultiCamKnowledgeEngine; let me verify agent.ts and PromptCachingEngine don't use LLMQuery in a way the new field breaks).

### Assistant | 2026-06-19T15:42:03.679Z

[tool_use: Grep]

### User | 2026-06-19T15:42:04.798Z

[tool_result] No matches found

### Assistant | 2026-06-19T15:42:05.106Z

[tool_use: Grep]

### User | 2026-06-19T15:42:06.221Z

[tool_result] No matches found

### Assistant | 2026-06-19T15:42:06.316Z

[tool_use: Grep]

### User | 2026-06-19T15:42:08.132Z

[tool_result] 61-
62:    const resp = await engine.query({ prompt: "What speed for steel?" });
63-    expect(resp.model).toBe("offline");

### Assistant | 2026-06-19T15:42:12.484Z

`agent.ts` and `PromptCachingEngine.ts` don't reference LLMQuery/llmEngine.query (the earlier file-match was from `LLMEngine` mentions in comments/imports, not query construction). The `llm-engine.test.ts` only passes `prompt`. 

Now let me verify the diff itself to confirm exactly what changed (byte-identical default path) and run the targeted test + tsc check.

### Assistant | 2026-06-19T15:42:12.972Z

[tool_use: Bash]

### User | 2026-06-19T15:42:17.082Z

[tool_result] warning: in the working copy of 'mcp-server/src/engines/LLMEngine.ts', CRLF will be replaced by LF the next time Git touches it
diff --git a/mcp-server/src/engines/LLMEngine.ts b/mcp-server/src/engines/LLMEngine.ts
index 0f3980f0c2..146fe5d188 100644
--- a/mcp-server/src/engines/LLMEngine.ts
+++ b/mcp-server/src/engines/LLMEngine.ts
@@ -76,6 +76,12 @@ export interface LLMQuery {
   /** Minimum acc
... [+2025 chars truncated]

### Assistant | 2026-06-19T15:42:20.851Z

The diff is exactly as described: a ternary in `query()` and a `sysKey` inserted into `_cacheKey`. The default branch (when `input.system` is undefined) is **byte-identical** to the original template literal. 

Let me verify the cache-key delimiter-collision concern and run the targeted test + a tsc typecheck.

### Assistant | 2026-06-19T15:42:21.892Z

[tool_use: Bash]

### User | 2026-06-19T15:42:26.487Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
 RUN  v4.1.5 H:/PRISM/mcp-server
 ✓ src/__tests__/LLMEngine.provider-routing.test.ts (21 tests) 41ms
 Test Files  1 passed (1)
      Tests  21 passed (21)
   Start at  10:42:25
   Duration  217ms (transform 114ms, setup 0ms, import 46ms, tests 41ms, environment 0ms)

### Assistant | 2026-06-19T15:42:29.778Z

All 21 tests pass. Now the tsc typecheck for the two changed files' surface and the LocalModelOrchestrator explicit-typed usage.

### Assistant | 2026-06-19T15:42:31.739Z

[tool_use: Bash]

### User | 2026-06-19T15:42:59.322Z

[tool_result] ---exit done---

### Assistant | 2026-06-19T15:43:03.226Z

No tsc errors involving LLMEngine, LLMQuery, or any of the 6 consumers. Let me confirm the full tsc run completed cleanly (not just that grep found nothing because it errored early) by checking the overall error count delta — the new field is the only change so any new error would surface.

### Assistant | 2026-06-19T15:43:04.169Z

[tool_use: Bash]

### User | 2026-06-19T15:43:31.547Z

[tool_result] 0
exit=1

### Assistant | 2026-06-19T15:43:48.653Z

Total tsc errors: 0 (grep's exit=1 just means zero matches). The project typechecks clean. 

Now let me reason through the remaining lenses analytically.

**Cache-key collision analysis.** The new key is:
`${prefer}:${complexity}:${min_answer_chars}:${sysKey}:${prompt.slice(0,100)}:${context_types}`

- The `system` slice is truncated to 40 chars and placed between `min_answer_chars` and `prompt`. Since the prompt is also truncated (100 chars) and `context_types` is joined with `,`, there is a pre-existing theoretical collision class (any `:` inside a system prompt or prompt shifts field boundaries). But this is a **pre-existing property** of the key construction (prompt already could contain `:`), not introduced by this change. The 40-char system truncation means two callers with systems differing only after char 40 collide on cache — but that is an accepted truncation tradeoff identical to the existing `prompt.slice(0,100)` behavior, and it only affects cache hit/miss (a stale-answer risk), not correctness of a fresh computation. For an LLM cache it's a P2-grade theoretical concern, consistent with the existing design. The empty-string default (`""` when no system) means existing consumers' keys change shape: previously `prefer:complexity:minchars:prompt:ctx`, now `prefer:complexity:minchars::prompt:ctx` (an extra empty segment). This **invalidates any in-memory cache entries** from a prior key shape — but the cache is per-process in-memory with a 5-min TTL and is rebuilt on restart, so there is no cross-version persistence to break. No P-level finding.

**Adequacy / escalation interaction.** The overridden `systemPrompt` is computed once and passed to both the Ollama call and the Claude escalation call (`claudeCall(systemPrompt, ...)`). Verified at the `claude` branch — it uses the same `systemPrompt` variable. The test `passes the caller system prompt to Claude on capability escalation` confirms this. Correct.

**Offline path.** `_generateOfflineResponse(input.pr
... [+958 chars truncated]

### Assistant | 2026-06-19T15:43:50.477Z

[tool_use: Grep]

### User | 2026-06-19T15:43:51.481Z

[tool_result] src\tools\dispatchers\ralphDispatcher.ts:33:    body: JSON.stringify({ model, max_tokens: 4096, system: systemPrompt, messages: [{ role: "user", content: userPrompt }] })
src\tools\dispatchers\integrationDispatcher.ts:268:    system: params.system ?? params.erp_system,
src\tools\dispatchers\atcsDispatcher.ts:96:    body: JSON.stringify({ model, max_tokens: maxTokens, system: systemPrompt, messages
... [+771 chars truncated]

### Assistant | 2026-06-19T15:44:14.261Z

None of these are `llmEngine.query({ system: <user input> })` — they're other engines/dispatchers with their own `system` params (integrationDispatcher uses `erp_system` which is a vendor name, the others call a different `client.summarise`/`generate` API). The current change has **zero** live injection surface on `LLMEngine`. The injection consideration is correctly noted as a future concern for the queued migration but not a defect in this diff.

I have everything I need. Let me compile the verdict.

## Review complete

I traced all 6 named consumers, the broader `LLMQuery`/`llmEngine.query` blast radius, the diff, the test suite (21/21 pass), and a clean full tsc (0 errors).

VERDICT: PASS

summary: This is a cleanly additive optional field. The default code path (when `input.system` is undefined) is byte-identical to the original — the ternary's else-branch is the verbatim prior template literal, and all 6 consumers (`AIExtractionReasoner`, `ColdHeadingToolConfigurator`, `ElectrodeAIReasoning`, `LocalModelOrchestrator`, `PRISMIntelligenceLayer`, `TrilobeElectrodeGeometry`) pass only `prompt`/`context_types`/`temperature`/`max_tokens`, never `system`, so their behavior is unchanged. The override correctly reaches both the Ollama path and the Claude escalation path (same `systemPrompt` variable), cache-key isolation works, tsc is clean, and there is zero live injection surface because no consumer passes user input as `system`.

findings:
- [P2] `H:/prism/mcp-server/src/engines/LLMEngine.ts:578` — `_cacheKey` truncates the system override to 40 chars (`input.system.slice(0,40)`); two callers whose system prompts differ only after char 40 would share a cache entry (stale-answer risk for distinct delegated tasks). This mirrors the pre-existing `prompt.slice(0,100)` truncation and only affects in-memory 5-min-TTL cache hit/miss, not fresh-computation correctness — but the agentic-delegation use case the field is built for is more likely to have near-identical long sys
... [+2044 chars truncated]
