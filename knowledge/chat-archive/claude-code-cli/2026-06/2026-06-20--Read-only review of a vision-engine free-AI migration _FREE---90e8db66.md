---
type: "chat-session"
source: "claude-code-cli"
session_id: "90e8db66-2b71-4e38-af9e-8576aa89fc41"
title: "Read-only review of a vision-engine free-AI migration (FREE-AI-MIGRATION/U-BLUEP"
date: "2026-06-20"
first_ts: "2026-06-20T02:54:26.939Z"
last_ts: "2026-06-20T02:55:36.654Z"
cwd: "H:\\prism\\mcp-server"
messages: 28
user_msgs: 11
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/90e8db66-2b71-4e38-af9e-8576aa89fc41/subagents/agent-af3692edf91eca9cc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Read-only review of a vision-engine free-AI migration (FREE-AI-MIGRATION/U-BLUEP

> **claude-code-cli** | 2026-06-20 | 28 msgs (11 user / 17 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/90e8db66-2b71-4e38-af9e-8576aa89fc41/subagents/agent-af3692edf91eca9cc.jsonl`

## Transcript

### User | 2026-06-20T02:54:26.939Z

Read-only review of a vision-engine free-AI migration (FREE-AI-MIGRATION/U-BLUEPRINT-VISION-OCR-LLM-ROUTE, slot:india). Grade PASS or FAIL with P0/P1/P2 findings, each with file:line citations.

FILES (read both end-to-end):
- H:/prism/mcp-server/src/engines/BlueprintVisionOCREngine.ts (migrated engine)
- H:/prism/mcp-server/src/__tests__/blueprint-vision-ocr-llm-route.test.ts (new test)

CONTRACT being verified:
The engine's private `callVision` was migrated from a DIRECT paid Claude Vision call (`new Anthropic().messages.create`) to the FREE Ollama-first `llmEngine.queryVision` substrate. The provider ladder (Ollama vision -> Claude vision backup -> offline) lives in LLMEngine, NOT this engine. On `res.model === "offline"`, callVision MUST THROW (R12: never parse an empty response into bogus dimensions). The Anthropic SDK import + `client` field + `defaultModel` + `getClient()` seam (the old `ANTHROPIC_API_KEY not set` gate) must be FULLY removed. Public method signatures (analyzeBlueprint / quickExtract / inferPartClass / flagExpectedFeatures) must be UNCHANGED (13 importers depend on them).

REFERENCE EXEMPLAR (already shipped — the migration must mirror it):
- H:/prism/mcp-server/src/engines/VisionActionAnalyzerEngine.ts  (its `callVisionAPI`)
- H:/prism/mcp-server/src/__tests__/vision-action-analyzer-llm-route.test.ts

queryVision API contract (in H:/prism/mcp-server/src/engines/LLMEngine.ts):
`LLMVisionQuery { prompt, images: VisionImage[] (VisionImage = {data:string, media_type?:string}), complexity?, max_tokens? }` -> `LLMResponse { answer: string; model: string; tokens_used: { input: number; output: number } }`.

VERIFY (cite file:line for each):
1. callVision routes through llmEngine.queryVision with the image as {data, media_type}; maps the result back as text=res.answer and tokens_used = res.tokens_used.input + res.tokens_used.output (NOT res.tokens_used as a bare number — that would be a bug).
2. Offline-throw present; message contains "No vision AI pr
... [+751 chars truncated]

### Assistant | 2026-06-20T02:54:29.707Z

I'll review the migrated engine and its test against the reference exemplar. Let me read all the relevant files in parallel.

### Assistant | 2026-06-20T02:54:30.156Z

[tool_use: Read]

### Assistant | 2026-06-20T02:54:30.625Z

[tool_use: Read]

### User | 2026-06-20T02:54:31.236Z

[tool_result] 1	// WIRE-EXEMPT: dispatcher import was removed by an unrelated peer revert mid-session
2	// (CAD-FUSION-LIVE-MS0 / 2026-05-06). Engine is consumed via direct import by
3	// PrintToFusion360Bridge + downstream OCR pipelines and does not need its own
4	// dispatcher action surface; restoring the previous prism_cad lazy import is
5	// scheduled in the same milestone's restoration commit alongside th
... [+40849 chars truncated]

### Assistant | 2026-06-20T02:54:31.584Z

[tool_use: Read]

### Assistant | 2026-06-20T02:54:31.767Z

[tool_use: Read]

### User | 2026-06-20T02:54:31.799Z

[tool_result] 1	/**
2	 * BlueprintVisionOCREngine LLM-route migration test
3	 * (FREE-AI-MIGRATION/U-BLUEPRINT-VISION-OCR-LLM-ROUTE, slot:india).
4	 *
5	 * Verifies the engine's vision chokepoint `callVision` was migrated from a DIRECT paid
6	 * Claude Vision call (new Anthropic().messages.create) to the free Ollama-first
7	 * llmEngine.queryVision substrate. Under VITEST, queryVision's default provider paths a
... [+4810 chars truncated]

### User | 2026-06-20T02:54:32.053Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\VisionActionAnalyzerEngine.ts' was already read 5m ago in this session and is unchanged (mtime 1781899530113). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### User | 2026-06-20T02:54:32.593Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\vision-action-analyzer-llm-route.test.ts' was already read 14m ago in this session and is unchanged (mtime 1781899580475). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disab
... [+23 chars truncated]

### Assistant | 2026-06-20T02:54:36.488Z

I have the migrated engine and test in context. The reference exemplar files were already read this session. Let me verify the specifics against the reference exemplar by grepping for the key patterns, and confirm there are no surviving Anthropic seams.

### Assistant | 2026-06-20T02:54:38.372Z

[tool_use: Grep]

### User | 2026-06-20T02:54:39.338Z

[tool_result] 310:  // (FREE-AI-MIGRATION). No Anthropic client / API key is held here anymore -- the
339:   * Was a direct PAID Claude Vision call (new Anthropic().messages.create); now routes

### Assistant | 2026-06-20T02:54:39.773Z

[tool_use: Grep]

### User | 2026-06-20T02:54:40.770Z

[tool_result] 127-   * Run a vision prompt through the shared FREE Ollama-first llmEngine substrate
128-   * (FREE-AI-MIGRATION/U-VISION-ACTION-ANALYZER-LLM-ROUTE). Was a direct PAID Claude
129-   * Vision call (new Anthropic().messages.create); now routes through
130:   * `llmEngine.queryVision` -- Ollama vision model first (free), Claude vision backup
131-   * (on an inadequate local read or ollama down + key
... [+1685 chars truncated]

### Assistant | 2026-06-20T02:54:44.364Z

The grep confirms zero surviving live Anthropic seams in BlueprintVisionOCREngine.ts — the only two matches are in comments documenting what was removed (lines 310, 339). Now let me verify the queryVision API contract by checking the actual signature in LLMEngine, and confirm the VITEST net-disable behavior that the test relies on.

### Assistant | 2026-06-20T02:54:46.236Z

[tool_use: Grep]

### User | 2026-06-20T02:54:48.021Z

[tool_result] 38-  /** Per-instance Ollama attempt timeout (ms); defaults to PRISM_LLM_OLLAMA_TIMEOUT_MS. */
39-  ollama_timeout_ms?: number;
40:  /** Local Ollama VISION model for the free queryVision() path (e.g. qwen2.5vl).
41-   *  Env: PRISM_LLM_OLLAMA_VISION_MODEL. Distinct from the text ollama_model. */
42-  ollama_vision_model: string;
--
238-   *  paths must NOT make a real network call -- tests that e
... [+2122 chars truncated]

### Assistant | 2026-06-20T02:54:51.158Z

The LLMEngine contract is verified. Let me confirm one remaining detail relevant to the offline-determinism claim: whether `queryVision` requires `ANTHROPIC_API_KEY` to be unset for the Claude rung to be skipped under VITEST (the test deletes the key as a belt-and-suspenders), and check the exact `LLMResponse.tokens_used` shape.

### Assistant | 2026-06-20T02:54:52.148Z

[tool_use: Read]

### User | 2026-06-20T02:54:53.632Z

[tool_result] 458	  async queryVision(input: LLMVisionQuery): Promise<LLMResponse> {
459	    const start = Date.now();
460	    this.queryCount++;
461	
462	    const systemPrompt = input.system
463	      ? input.system
464	      : `You are PRISM, an AI manufacturing-vision assistant. Read engineering
465	drawings, blueprints, part photos, and screenshots precisely. Extract dimensions,
466	tolerances, GD&T, featu
... [+3753 chars truncated]

### Assistant | 2026-06-20T02:54:56.711Z

I have everything needed. Let me verify the offline-determinism more carefully — the test deletes `ANTHROPIC_API_KEY`, but `queryVision` reads `this.config.api_key` (set at LLMEngine construction), not `process.env` at call time. Let me check how `config.api_key` is populated and whether the VITEST net-disable alone guarantees offline regardless of the key.

### Assistant | 2026-06-20T02:54:58.020Z

[tool_use: Read]

### User | 2026-06-20T02:54:58.959Z

[tool_result] 560	    return true;
561	  }
562	
563	  /** Default Ollama VISION path -> live OllamaClientEngine.generate with base64 images.
564	   *  Net-disabled under VITEST (returns !ok -> offline) unless PRISM_LLM_ALLOW_NET_IN_TEST=1. */
565	  private async _defaultOllamaVisionGenerate(o: {
566	    model: string; prompt: string; system?: string; images: string[]; temperature?: number; maxTokens?: number;
5
... [+1889 chars truncated]

### Assistant | 2026-06-20T02:55:05.273Z

I now have full verification of the offline path. The VITEST net-disable is the load-bearing guarantee: under VITEST, both `_defaultOllamaVisionGenerate` (returns `!ok` -> Ollama rung falls through to cooldown) AND `_callClaudeVision` (throws -> caught -> falls to offline) degrade deterministically, regardless of `api_key`. So `queryVision` returns `model:"offline"` -> `callVision` throws "No vision AI provider available". The test's `delete ANTHROPIC_API_KEY` is belt-and-suspenders (it would only matter if net were enabled). Determinism is real.

Let me do the final consumer-impact check: confirm the public method signatures are unchanged by checking the 13 importers don't break on any signature drift, and verify `inferPartClass`/`flagExpectedFeatures` are still public (they are pure, no Vision calls — unaffected by migration).

### Assistant | 2026-06-20T02:55:07.460Z

[tool_use: Grep]

### User | 2026-06-20T02:55:08.720Z

[tool_result] src\routes\edm.ts:326:        const { blueprintVisionOCREngine } = await import("../engines/BlueprintVisionOCREngine.js");
src\routes\edm.ts:327:        const result = await blueprintVisionOCREngine.analyzeBlueprint(req.body);
src\routes\edm.ts:344:        const { blueprintVisionOCREngine } = await import("../engines/BlueprintVisionOCREngine.js");
src\routes\edm.ts:345:        const result = await
... [+7327 chars truncated]

### Assistant | 2026-06-20T02:55:36.654Z

The consumer trace is complete. All consumers call the four public methods with their unchanged signatures:
- `edm.ts:327,345,392` — `analyzeBlueprint(input)` / `quickExtract(input)` taking a `BlueprintVisionInput` object (unchanged).
- `cadDispatcher.ts:2746,2752` — `inferPartClass(result)` / `flagExpectedFeatures(result)` — pure functions, unaffected by the migration.
- `CADLiveBlueprintOcrAdapter.ts:184`, `BlueprintToAllCADsOrchestratorEngine.ts:183` — `analyzeBlueprint({...})` object input (unchanged). Note `BlueprintToAllCADsOrchestratorEngine` uses `Pick<BlueprintVisionOCREngine, "analyzeBlueprint">` — proves the public surface name must persist, which it does.

The `qualityDispatcher.ts:201,208,216` matches are a *different* engine (`BlueprintOCREngine.analyzeBlueprint(text, {unit})` — text-based, 2-arg), not this engine — not a consumer of the migrated one.

One important note for auditability: `business/PHASE0-FOUNDATION-READINESS.md:62` is a stale doc still asserting `BlueprintVisionOCREngine.getClient()` requires `ANTHROPIC_API_KEY` — that precondition is now false post-migration, but it's a doc, not code, so it's a P2 doc-rot item, not a break.

I have everything needed for the verdict.

---

VERDICT: PASS

summary: The `callVision` migration to the free `llmEngine.queryVision` substrate is correct and complete — image mapped as `{data, media_type}`, tokens summed as `input + output` (not the bare object), offline-throw present with the exact contract message, and every Anthropic/getClient/API-key seam fully removed (the only two `Anthropic` matches are descriptive comments). The test is genuinely hermetic and intent-proving: under VITEST both default provider paths degrade to `offline` deterministically, so a reverted migration (old SDK call) would surface a network/SDK error, not "No vision AI provider available", failing the assertion. All four public signatures are unchanged and all 13 live consumers traced clean.

findings:
- [P2] H:/prism/mcp-serve
... [+3031 chars truncated]
