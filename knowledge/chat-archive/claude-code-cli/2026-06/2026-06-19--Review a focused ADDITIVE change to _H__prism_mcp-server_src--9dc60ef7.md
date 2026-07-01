---
type: "chat-session"
source: "claude-code-cli"
session_id: "9dc60ef7-7881-491c-b1ee-fda1e99bc5bf"
title: "Review a focused ADDITIVE change to `H:/prism/mcp-server/src/engines/LLMEngine.t"
date: "2026-06-19"
first_ts: "2026-06-19T14:58:45.833Z"
last_ts: "2026-06-19T15:00:42.282Z"
cwd: "H:\\prism\\mcp-server"
messages: 32
user_msgs: 13
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-a776333f6c3085e9f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Review a focused ADDITIVE change to `H:/prism/mcp-server/src/engines/LLMEngine.t

> **claude-code-cli** | 2026-06-19 | 32 msgs (13 user / 19 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/9dc60ef7-7881-491c-b1ee-fda1e99bc5bf/subagents/agent-a776333f6c3085e9f.jsonl`

## Transcript

### User | 2026-06-19T14:58:45.833Z

Review a focused ADDITIVE change to `H:/prism/mcp-server/src/engines/LLMEngine.ts` (read the file) + its tests `H:/prism/mcp-server/src/__tests__/LLMEngine.provider-routing.test.ts`.

CONTEXT: LLMEngine is Ollama-first (free) with Claude fallback. The operator added a requirement: "Claude must be the backup if Ollama can't handle it or a task is too complex for local models." The change adds CAPABILITY/COMPLEXITY escalation on top of the existing AVAILABILITY fallback:
- New `LLMQuery.complexity?` ("low"|"high") + `min_answer_chars?`; new `LLMDeps.adequate?` predicate.
- New `_ollamaAnswerAdequate(answer, input)`: caller predicate wins; else heuristic = length floor (40 for complexity:high, else 0) + a refusal/incapacity regex.
- In the Ollama-success block: if the answer is adequate OR no Claude backup exists (strict-free / no key) -> return the free answer; else (inadequate + backup exists) -> escalate to Claude WITHOUT opening the availability cooldown.

VERIFY:
1. The escalation control flow is correct: inadequate+backup -> Claude; adequate -> free; inadequate+no-backup -> free (best-effort, NOT offline). Trace each branch.
2. The cooldown distinction: capability-escalation must NOT set ollamaDownUntil (Ollama is up); only availability-failure does. Confirm.
3. The refusal regex `_ollamaAnswerAdequate` -- any catastrophic-backtracking / false-positive risk (e.g. does it wrongly flag a legit answer containing "i cannot" mid-sentence)? Is that acceptable (escalating a borderline answer to Claude is safe-but-costs)?
4. Does the change preserve the contract for the 6 consumers + all prior tests? Any path that now returns differently for a default (no complexity) query?
5. Tests: do the 6 new escalation tests cover the branches with real reference values? Any gap (e.g. complexity:high + adequate, strict-free no-backup, injected predicate, no-cooldown-on-escalation)?

Report P0/P1/P2 with file:line. Grade PASS or FAIL.

### Assistant | 2026-06-19T14:58:51.893Z

I'll analyze this change to LLMEngine.ts and its tests. Let me start by reading both files.

### Assistant | 2026-06-19T14:58:52.362Z

[tool_use: Read]

### Assistant | 2026-06-19T14:58:52.692Z

[tool_use: Read]

### User | 2026-06-19T14:58:53.590Z

[tool_result] 1	/**
2	 * LLMEngine — AI-Powered Manufacturing Intelligence
3	 *
4	 * Ollama-first LLM client for natural language queries about manufacturing,
5	 * quote explanations, process advice, and G-code annotation. Routes to a FREE
6	 * local Ollama model by default (so product features cost $0 at launch), with
7	 * an adaptive fallback ladder to the paid Claude API and then a deterministic
8	 * offline
... [+25789 chars truncated]

### User | 2026-06-19T14:58:53.841Z

[tool_result] 1	/**
2	 * LLMEngine provider-routing tests (FREE-AI-MIGRATION/U-LLM-OLLAMA-FIRST, slot:india).
3	 *
4	 * Verifies the Ollama-first runtime routing that makes product AI features cost $0
5	 * at launch (operator goal). Both providers are INJECTED via the deps param so the
6	 * test exercises real routing logic with no network (R9: verifies intent).
7	 *
8	 * Loss-function coverage:
9	 *  - Ollama 
... [+11044 chars truncated]

### Assistant | 2026-06-19T14:59:00.306Z

Both files read. Now let me trace the control flow carefully and check the consumers. Let me find the 6 consumers mentioned and verify the contract.

### Assistant | 2026-06-19T14:59:02.200Z

[tool_use: Grep]

### Assistant | 2026-06-19T14:59:03.623Z

[tool_use: Bash]

### User | 2026-06-19T14:59:04.108Z

[tool_result] src\db\BusinessStore.ts:749:    const result = await this.query({ where });
src\engines\AgentMemoryFabricEngine.ts:565:    const memories = await this.query({
src\engines\AIExtractionReasonerEngine.ts:18:import { llmEngine, type ContextChunk } from "./LLMEngine.js";
src\engines\AIExtractionReasonerEngine.ts:302:      const response = await llmEngine.query({
src\engines\AIExtractionReasonerEngine.t
... [+8675 chars truncated]

### User | 2026-06-19T14:59:14.323Z

[tool_result] 38fde7cc48 [MAIN-FORCE] [TOOL-LIBRARIES]/U-INSERTS-WIRED (slot:romeo): wire insert lane into harness+placement+cron (no orphan)
33532ea59f [MAIN] [CHORE]/lint: LLMEngine._generateOfflineResponse — rename unused `prompt` param to `_prompt`
ca43a5fdc3 [MAIN] [HARNESS-AUDIT]/U-TIER3c: keep-pattern hardening for node-orphan-cleaner
14b17f2e11 [CAD-FUSION-LIVE-MS0]/U-LLM-TRIBAL-WIRE: register tribal co
... [+9554 chars truncated]

### Assistant | 2026-06-19T14:59:19.558Z

The diff is now clear. Let me examine the consumers that call `query()` with structured-output expectations, since they're the integration-coupling risk. The injected `adequate` predicate and the new escalation could change behavior for callers expecting specific shapes. Let me look at the consumers that parse the answer.

### Assistant | 2026-06-19T14:59:20.930Z

[tool_use: Read]

### Assistant | 2026-06-19T14:59:21.728Z

[tool_use: Read]

### User | 2026-06-19T14:59:21.887Z

[tool_result] 295	  "reasoning": "<2-3 sentences explaining your classification>",
296	  "secondary_types": ["<other applicable types>"],
297	  "tags": ["<relevant keywords>"],
298	  "semantic_summary": "<one sentence summary of what this knowledge IS>"
299	}`;
300	
301	    try {
302	      const response = await llmEngine.query({
303	        prompt,
304	        context_types: ["custom"],
305	        temperature
... [+3486 chars truncated]

### User | 2026-06-19T14:59:22.613Z

[tool_result] 395	PROBLEM: ${problem}
396	
397	CONTEXT:
398	${contextChunks.map(c => `[${c.title}]\n${c.content}`).join("\n\n")}
399	
400	Step 1: Analyze the problem and identify key factors.
401	Think step-by-step. What are the critical considerations?`;
402	
403	  const step1Response = await llmEngine.query({
404	    prompt: step1Prompt,
405	    context_types: ["material", "formula", "safety", "tribal"],
406	
... [+1998 chars truncated]

### Assistant | 2026-06-19T14:59:26.831Z

These consumers all call `query()` with NO `complexity` and NO injected `adequate`, so the default-query behavior is what matters for them. Let me trace the default-query path precisely and verify the cooldown / behavior-preservation claims. Let me check the remaining consumers briefly and confirm the `_providerOrder().includes("claude")` semantics under each `prefer`.

### Assistant | 2026-06-19T14:59:28.243Z

[tool_use: Read]

### User | 2026-06-19T14:59:29.129Z

[tool_result] 285	
286	    try {
287	      // Build domain-specific prompt
288	      const systemPrompt = DOMAIN_PROMPTS[request.domain] || DOMAIN_PROMPTS.general;
289	      const userPrompt = this.buildUserPrompt(request);
290	
291	      // Call LLM
292	      const response = await llmEngine.query({
293	        prompt: userPrompt,
294	        temperature: options.temperature ?? 0.3,
295	        max_tokens: opt
... [+596 chars truncated]

### Assistant | 2026-06-19T14:59:29.188Z

[tool_use: Read]

### Assistant | 2026-06-19T14:59:30.058Z

[tool_use: Read]

### User | 2026-06-19T14:59:32.519Z

[tool_result] 335	1. Material compatibility (NEVER graphite on carbide — microcracking risk)
336	2. Surface finish requirements
337	3. Electrode wear characteristics
338	4. JM Die shop capabilities (graphite milling on Roku-Roku HC 658-II)
339	
340	Recommend electrode material (EDM-200/EDM-3/AF-5/CuW70) and number of electrode stages (1-4).`;
341	
342	    const response = await llmEngine.query({
343	      promp
... [+695 chars truncated]

### User | 2026-06-19T14:59:34.172Z

[tool_result] 530	  const prompt = `Recommend electrode setup for trilobe electrode:
531	C(1)=${input.stages[0]?.c_dia_in}" E(1)=${input.stages[0]?.e_dia_in}"
532	Workpiece: ${input.workpiece_material}, Target finish: ${input.target_finish_Ra_um}Ra
533	Lead angle: ${input.lead_angle_deg}°
534	
535	Consider milling strategy (3D contour vs adaptive) and any special requirements.`;
536	
537	  const response = awai
... [+519 chars truncated]

### Assistant | 2026-06-19T14:59:42.105Z

All 6 consumers confirmed: they call `query()` with no `complexity`, no `min_answer_chars`, no injected `adequate`. So for them the default heuristic floor is `0` and only the refusal regex applies. This is the critical behavior-change surface. Let me now carefully evaluate the regex for false positives against real consumer outputs, and confirm the no-key default-construction case (the `llmEngine` singleton default uses `process.env.ANTHROPIC_API_KEY`).

Let me run the actual test file plus a quick regex probe to verify the regex behavior with real-world answer strings these consumers produce.

### Assistant | 2026-06-19T14:59:52.531Z

[tool_use: Bash]

### Assistant | 2026-06-19T14:59:53.928Z

[tool_use: Bash]

### User | 2026-06-19T14:59:56.484Z

[tool_result] ok          | carbide advice
INADEQUATE  | electrode (starts with refusal-ish)
ok          | operator should know
INADEQUATE  | i do not know mid-sentence
ok          | doesnt have enough information (3rd person)
ok          | we dont have the details
INADEQUATE  | AI language model preamble
ok          | json output
ok          | short low-complexity
INADEQUATE  | pure refusal
INADEQUATE  | unabl
... [+28 chars truncated]

### User | 2026-06-19T15:00:03.110Z

[tool_result]  RUN  v4.1.5 H:/prism/mcp-server

···············

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  10:00:01
   Duration  371ms (transform 176ms, setup 0ms, import 79ms, tests 47ms, environment 0ms)

### Assistant | 2026-06-19T15:00:09.053Z

All 15 tests pass. The regex probe confirms the false-positive surface. Let me trace the two most important regex false-positives carefully — the "i do not know mid-sentence" and "AI language model preamble" cases are real escalation triggers on legitimate answers. Let me verify whether `\b` after `know` could cause backtracking issues and confirm the regex is linear-time (no nested quantifiers, so no catastrophic backtracking — confirmed by structure: it's a flat alternation with no nested `*`/`+`).

Let me verify one more potential silent-break: the `_cacheKey` does NOT include `complexity`/`min_answer_chars`, which could cause a cross-complexity cache collision. Let me confirm.

### Assistant | 2026-06-19T15:00:10.139Z

[tool_use: Read]

### User | 2026-06-19T15:00:11.305Z

[tool_result] 552	  private _cacheKey(input: LLMQuery): string {
553	    // Include the provider policy so a response produced under one policy is never
554	    // served to a query expecting a different provider (e.g. prefer:"claude").
555	    return `${this.config.prefer}:${input.prompt.slice(0, 100)}:${input.context_types?.join(",") ?? "all"}`;
556	  }
557	}

### Assistant | 2026-06-19T15:00:42.282Z

Confirmed the cache-key gap. Let me reason through whether it's actually exploitable: the cache stores the *resolved* response (whether Ollama or Claude). If a `complexity:high` query escalates and caches Claude's answer, a subsequent `complexity:low` query with same prompt+context gets Claude's (better) answer — harmless. The reverse: a `complexity:low` query caches an Ollama answer that would have been *adequate at low but inadequate at high*; a later `complexity:high` query with the same key gets the cached (potentially too-short) Ollama answer instead of escalating. This is a real but low-severity correctness gap (P2) — the cache short-circuits before `_ollamaAnswerAdequate` is ever consulted.

I have traced every branch, all 6 consumers, the cooldown distinction, the regex, and the tests. Here is my verdict.

---

VERDICT: PASS

summary: This is a clean, genuinely additive escalation layer. The control flow is correct on all four branches (inadequate+backup→Claude, adequate→free, inadequate+no-backup→free best-effort, availability-failure→cooldown), the capability/availability cooldown distinction is honored (escalation path `continue`s without touching `ollamaDownUntil`), and all prior tests plus 6 new ones pass (15/15). The default no-`complexity` query path is preserved for the 6 consumers (floor=0, only an explicit refusal escalates), so prior behavior is intact unless Ollama literally emits a refusal phrase. Two low-severity gaps remain: the refusal regex over-escalates a few legitimate-but-refusal-shaped answers (safe-but-costs, accepted per the prompt), and the cache key omits `complexity`/`min_answer_chars`.

findings:
- [P2] `H:/prism/mcp-server/src/engines/LLMEngine.ts:552-556` -- `_cacheKey` does not include `complexity` or `min_answer_chars`. A `complexity:"low"` query caches an Ollama answer that is adequate at the low bar; a later `complexity:"high"` query with the same prompt+context+prefer hits the cache (line 282) and returns that possibly-too-
... [+3198 chars truncated]
