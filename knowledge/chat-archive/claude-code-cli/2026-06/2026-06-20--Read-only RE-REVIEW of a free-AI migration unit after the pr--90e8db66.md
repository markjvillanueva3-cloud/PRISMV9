---
type: "chat-session"
source: "claude-code-cli"
session_id: "90e8db66-2b71-4e38-af9e-8576aa89fc41"
title: "Read-only RE-REVIEW of a free-AI migration unit after the prior arm-A FAIL was a"
date: "2026-06-20"
first_ts: "2026-06-20T04:16:29.115Z"
last_ts: "2026-06-20T04:20:28.021Z"
cwd: "H:\\prism\\mcp-server"
messages: 66
user_msgs: 26
assistant_msgs: 40
raw_file: "H:/.claude/projects/H--prism/90e8db66-2b71-4e38-af9e-8576aa89fc41/subagents/agent-ae5b86014bf65e328.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Read-only RE-REVIEW of a free-AI migration unit after the prior arm-A FAIL was a

> **claude-code-cli** | 2026-06-20 | 66 msgs (26 user / 40 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/90e8db66-2b71-4e38-af9e-8576aa89fc41/subagents/agent-ae5b86014bf65e328.jsonl`

## Transcript

### User | 2026-06-20T04:16:29.115Z

Read-only RE-REVIEW of a free-AI migration unit after the prior arm-A FAIL was addressed (FREE-AI-MIGRATION/U-PARALLELAPI-LLM-ROUTE + U-INFERENCECHAIN-LLM-WIRE, slot:india). Grade PASS or FAIL with P0/P1/P2 + file:line.

PRIOR FAIL (now claimed fixed): the parallelAPICalls chokepoint was migrated to free llmEngine.query but reached NO consumer (all 5 gate on hasValidApiKey first -> inert in a no-key deployment = orphan delivery). FIX: wired InferenceChainEngine.runInferenceChain (india's AI-reasoning engine) by removing its no-ANTHROPIC_API_KEY pre-gate so it reaches the now-free chokepoint.

FILES (read end-to-end):
- H:/prism/mcp-server/src/config/api-config.ts (parallelAPICalls -> llmEngine.query; offline -> {text:'',error})
- H:/prism/mcp-server/src/engines/InferenceChainEngine.ts (runInferenceChain gate removed; buildNoKeyResult removed)
- H:/prism/mcp-server/src/__tests__/api-config-parallel-llm-route.test.ts
- H:/prism/mcp-server/src/__tests__/inference-chain-llm-wire.test.ts

VERIFY (cite file:line):
1. ORPHAN RESOLVED: runInferenceChain no longer has the `if(!hasValidApiKey()) return buildNoKeyResult` pre-gate; it now proceeds to call parallelAPICalls (the now-free chokepoint). The wiring test proves it via a spy on llmEngine.query + asserting the old "ANTHROPIC_API_KEY not configured" message is gone.
2. buildNoKeyResult fully removed with NO dangling references (grep) -- was it used ONLY by the removed gate?
3. hasValidApiKey import is STILL valid (it remains used by analyzeAndRecommend ~705 + deepDiagnose ~935, which are NOT wired in this unit -- a documented follow-up). Confirm no unused-import.
4. runInferenceChain's per-step response handling is DEFENSIVE: an offline parallelAPICalls result ({text:'', error}) degrades to a non-crash status ("partial"/"failed"), not an unhandled exception. Trace the wave/step loop (~490-640) reading .error / empty text.
5. The chokepoint (parallelAPICalls) is unchanged from the prior PASS except the offline branch now 
... [+609 chars truncated]

### Assistant | 2026-06-20T04:16:32.153Z

I'll trace this re-review systematically. Let me start by reading all four files end-to-end in parallel.

### Assistant | 2026-06-20T04:16:32.626Z

[tool_use: Read]

### Assistant | 2026-06-20T04:16:33.130Z

[tool_use: Read]

### User | 2026-06-20T04:16:33.250Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\config\api-config.ts' was already read 12m ago in this session and is unchanged (mtime 1781928200232). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-20T04:16:33.572Z

[tool_use: Read]

### Assistant | 2026-06-20T04:16:34.029Z

[tool_use: Read]

### User | 2026-06-20T04:16:34.773Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Inference Chain Engine (R3-MS4.5-T2)
3	 *
4	 * Server-side multi-step reasoning engine that reduces client context consumption
5	 * by chaining multiple reasoning steps internally. Each chain runs 2-3 API calls,
6	 * feeds each step's output as context to the next, and returns a summarized result.
7	 *
8	 * Architecture:
9	 *   action receives query → engine calls API
... [+41943 chars truncated]

### User | 2026-06-20T04:16:35.601Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\api-config-parallel-llm-route.test.ts' was already read 12m ago in this session and is unchanged (mtime 1781928123071). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### User | 2026-06-20T04:16:36.398Z

[tool_result] 1	/**
2	 * InferenceChainEngine free-AI wiring test
3	 * (FREE-AI-MIGRATION/U-INFERENCECHAIN-LLM-WIRE, slot:india).
4	 *
5	 * Verifies runInferenceChain's no-ANTHROPIC_API_KEY pre-gate was removed so it REACHES the now-free
6	 * Ollama-first parallelAPICalls substrate (the chokepoint freed in U-PARALLELAPI-LLM-ROUTE). This is
7	 * the consumer-level proof the chokepoint migration is delivered, not
... [+3421 chars truncated]

### Assistant | 2026-06-20T04:16:44.576Z

I have InferenceChainEngine.ts and the wiring test in context. The other two files (api-config.ts and the api-config test) were read 12m ago in this session. Let me retrieve them via Grep since the read-once guard is blocking re-read, and verify the chokepoint + grep for dangling references.

### Assistant | 2026-06-20T04:16:45.063Z

[tool_use: Read]

### Assistant | 2026-06-20T04:16:46.544Z

[tool_use: Grep]

### Assistant | 2026-06-20T04:16:47.041Z

[tool_use: Grep]

### User | 2026-06-20T04:16:47.858Z

[tool_result] 1	/**

### User | 2026-06-20T04:16:48.981Z

[tool_result] 35:import { parallelAPICalls, hasValidApiKey, getModelForTier } from "../config/api-config.js";
686:  if (!hasValidApiKey()) {
916:  if (!hasValidApiKey()) {

### User | 2026-06-20T04:16:49.024Z

[tool_result] src\__tests__\inference-chain-llm-wire.test.ts:8: * no-key run returned buildNoKeyResult ("ANTHROPIC_API_KEY not configured...") WITHOUT calling any

### Assistant | 2026-06-20T04:16:53.398Z

Good. `buildNoKeyResult` has zero references except the test's prose comment (a historical description, not code) — fully removed. `hasValidApiKey` is still used at lines 686 and 935 (analyzeAndRecommend / deepDiagnose), so the import is valid. Let me verify the chokepoint in api-config.ts and the api-config test. The read-once guard blocks full re-read, so I'll grep the relevant sections.

### Assistant | 2026-06-20T04:16:55.315Z

[tool_use: Grep]

### User | 2026-06-20T04:16:56.316Z

[tool_result] 48-                        process.env.ANTHROPIC_API_KEY !== 'your-api-key-here'
49-};
50-
51:export function hasValidApiKey(): boolean {
52-  return apiConfig.enableRealExecution;
53-}
54-
--
104- * @param prompts Array of { system, user, model?, maxTokens? }
105- * @returns Array of responses in same order
106- */
107:export async function parallelAPICalls(
108-  prompts: Array<{
109-    system:
... [+2405 chars truncated]

### Assistant | 2026-06-20T04:16:56.333Z

[tool_use: Grep]

### User | 2026-06-20T04:16:57.432Z

[tool_result] 8: * llmEngine singleton, so vi.spyOn(llmEngine, "query") intercepts. Return shape is byte-identical
9: * ({text, tokens, duration_ms, model, error?}) so the 5 consumers are unaffected.
15: *     and a populated `error` field (never a silent empty success), text:"".
16: *  3. SUCCESS MAPPING -- a real answer maps to {text:res.answer, tokens:res.tokens_used, model:res.model}
17: *     with no error
... [+2250 chars truncated]

### Assistant | 2026-06-20T04:17:01.002Z

Chokepoint confirmed. Now let me verify the LLMEngine.query return contract — specifically the `model === "offline"` branch and that `res.tokens_used` is always present (the InferenceChainEngine reads `resp.tokens.input/output` unconditionally even on the catch path). And confirm tsc cleanliness on these files.

### Assistant | 2026-06-20T04:17:02.893Z

[tool_use: Grep]

### User | 2026-06-20T04:17:03.974Z

[tool_result] 57-   *  escalate to Claude (e.g. "must be valid JSON", "must contain G-code"). When
58-   *  omitted, the default heuristic (refusal markers + length floor) is used. */
59:  adequate?: (answer: string, input: LLMQuery) => boolean;
60-  /** Default-overridable FREE vision generation path (Ollama vision model). */
61-  ollamaVisionGenerate?: (o: {
--
99-
100-export interface LLMResponse {
101:  ans
... [+2065 chars truncated]

### Assistant | 2026-06-20T04:17:04.218Z

[tool_use: Grep]

### User | 2026-06-20T04:17:05.862Z

[tool_result] 9: * (auto|ollama|claude). See `query()` for the provider loop.
120: *  like the text query() ladder. */
213:      // The caller predicate is untrusted code; a throw must NOT crash query().
333:  async query(input: LLMQuery): Promise<LLMResponse> {
450:   * query()'s provider ladder: the Ollama VISION model first (free) -> Claude vision
458:  async queryVision(input: LLMVisionQuery): Promise<LLMRe
... [+181 chars truncated]

### Assistant | 2026-06-20T04:17:11.233Z

`LLMResponse` always carries `tokens_used: { input, output }` (line 104), so the InferenceChainEngine's unconditional `resp.tokens.input/output` reads are safe on every branch including offline. Let me verify the `model:"offline"` return shape in LLMEngine (does the offline path actually set `model:"offline"` and include `tokens_used`), and confirm tsc on these files.

### Assistant | 2026-06-20T04:17:12.396Z

[tool_use: Grep]

### User | 2026-06-20T04:17:13.859Z

[tool_result] 4- * Ollama-first LLM client for natural language queries about manufacturing,
5- * quote explanations, process advice, and G-code annotation. Routes to a FREE
6- * local Ollama model by default (so product features cost $0 at launch), with
7- * an adaptive fallback ladder to the paid Claude API and then a deterministic
8: * offline response. Policy via `config.prefer` / env `PRISM_LLM_PREFER`
9- 
... [+7711 chars truncated]

### Assistant | 2026-06-20T04:17:18.534Z

The offline path is fully confirmed: `query()` returns `model:"offline"` + `tokens_used:{input:0,output:0}` (lines 438-445), and under VITEST the default Ollama+Claude paths both degrade deterministically to offline (`_netDisabledInTest`). This means the wiring test's "no key -> reaches free substrate -> offline -> status not completed" assertion is genuinely exercised, not mocked.

Now let me confirm tsc cleanliness for the two changed source files and run the tests to confirm they're hermetic and pass.

### Assistant | 2026-06-20T04:17:20.331Z

[tool_use: Bash]

### User | 2026-06-20T04:17:27.915Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
 RUN  v4.1.5 H:/PRISM/mcp-server
 ✓ src/__tests__/inference-chain-llm-wire.test.ts (2 tests) 8ms
 ✓ src/__tests__/api-config-parallel-llm-route.test.ts (3 tests) 9ms
 Test Files  2 passed (2)
      Tests  5 passed (5)
   Start at  23:17:26
   Duration  430ms (transform 458ms, setup 0ms, import 291ms, tests 17ms, environmen
... [+6 chars truncated]

### Assistant | 2026-06-20T04:17:31.116Z

All 5 tests pass and run fast (8ms/9ms — hermetic, no real network). Now let me verify tsc cleanliness on the diff's files — confirming the only project error is the pre-existing InventorCADCodeGenerator peer issue (not this diff).

### Assistant | 2026-06-20T04:17:33.120Z

[tool_use: Bash]

### User | 2026-06-20T04:18:19.806Z

[tool_result] ---TOTAL-ERRORS---
1

### Assistant | 2026-06-20T04:18:23.373Z

tsc reports exactly 1 error project-wide, and none of it touches the diff files (InferenceChainEngine / api-config / LLMEngine / either test). Let me confirm that single error is the acknowledged pre-existing InventorCADCodeGenerator issue, not a hidden consequence of this diff.

### Assistant | 2026-06-20T04:18:24.294Z

[tool_use: Bash]

### User | 2026-06-20T04:18:46.489Z

[tool_result] src/engines/InventorCADCodeGeneratorEngine.ts(139,3): error TS2322: Type 'Set<string>' is not assignable to type 'ReadonlySet<"custom" | "sketch_create" | "sketch_line" | "sketch_arc" | "sketch_circle" | "sketch_rectangle" | "sketch_spline" | "sketch_dimension" | "sketch_constraint" | "sketch_trim" | ... 89 more ... | "parameter_table">'.

### Assistant | 2026-06-20T04:18:51.289Z

Confirmed. The single tsc error is `InventorCADCodeGeneratorEngine.ts(139,3)` — a peer CAD engine entirely unrelated to this diff (a `Set<string>` vs typed `ReadonlySet` narrowing issue). It is a pre-existing issue, exactly as the unit claims.

Now let me trace one final blast-radius concern: who else calls `parallelAPICalls` directly (the chokepoint), and whether the `runInferenceChain` consumer is genuinely reachable through a dispatcher (so the chokepoint is truly non-orphan, not just non-orphan in theory).

### Assistant | 2026-06-20T04:18:52.249Z

[tool_use: Grep]

### Assistant | 2026-06-20T04:18:53.357Z

[tool_use: Grep]

### User | 2026-06-20T04:18:54.399Z

[tool_result] Found 8 files
src\__tests__\inference-chain-llm-wire.test.ts
src\engines\InferenceChainEngine.ts
src\config\api-config.ts
src\__tests__\api-config-parallel-llm-route.test.ts
src\tools\dispatchers\spDispatcher.ts
src\tools\dispatchers\autonomousDispatcher.ts
src\orchestration\AutoPilotV2.ts
src\orchestration\AutoPilot.ts

### User | 2026-06-20T04:18:54.896Z

[tool_result] src\tools\dispatchers\aiReasoningDispatcher.ts:137:  "inference_chain_run",
src\tools\dispatchers\aiReasoningDispatcher.ts:4214:      case "inference_chain_run": {
src\tools\dispatchers\aiReasoningDispatcher.ts:4215:        const mod = await import("../../engines/InferenceChainEngine.js");
src\tools\dispatchers\aiReasoningDispatcher.ts:4217:        // InferenceChainEngine exports CHAIN_ACTIONS + l
... [+440 chars truncated]

### Assistant | 2026-06-20T04:18:58.889Z

This is the critical blast-radius finding. Let me trace the actual dispatcher reachability of `runInferenceChain` — the wiring claim depends on it. `aiReasoningDispatcher.ts:4214` (`inference_chain_run`) only calls `listChainTypes`/`CHAIN_ACTIONS`, NOT `runInferenceChain`. And `calcDispatcher.ts:200` has an `inference_chain` case. Let me read both to confirm whether `runInferenceChain` is genuinely invoked through any dispatcher.

### Assistant | 2026-06-20T04:18:59.831Z

[tool_use: Read]

### Assistant | 2026-06-20T04:19:00.535Z

[tool_use: Read]

### User | 2026-06-20T04:19:01.188Z

[tool_result] 190	    case "render_report":
191	      return { type: result.type, line_count: result.line_count, sections: result.sections?.length || 0 };
192	    case "campaign_create":
193	      return { material_count: result.material_count, pass: result.summary?.total_pass, fail: result.summary?.total_fail, quarantine: result.summary?.total_quarantine, avg_safety: result.summary?.avg_safety_score };
194	   
... [+6395 chars truncated]

### User | 2026-06-20T04:19:01.925Z

[tool_result] 4205	        const { videoELearningAIEngine } = await import("../../engines/VideoELearningAIEngine.js");
4206	        result = { success: true, data: await (videoELearningAIEngine as any).processELearningCourse?.((params as any).course_path ?? "") ?? { engine: "VideoELearningAIEngine", note: "method not callable" } };
4207	        break;
4208	      }
4209	      case "chain_executor_execute": {
421
... [+1374 chars truncated]

### Assistant | 2026-06-20T04:19:06.203Z

The two grep hits I just read are response-shaping (`compactResult` at calcDispatcher:200-201) and a non-invoking introspection case (aiReasoningDispatcher:4214 only lists chain types). Neither actually *calls* `runInferenceChain`. I need to find where `inference_chain` is dispatched to the engine in calcDispatcher (the case at line 200 is just the result-compactor). Let me find the real dispatch site.

### Assistant | 2026-06-20T04:19:08.084Z

[tool_use: Grep]

### Assistant | 2026-06-20T04:19:09.020Z

[tool_use: Grep]

### User | 2026-06-20T04:19:09.175Z

[tool_result] No matches found

### User | 2026-06-20T04:19:10.773Z

[tool_result] src\engines\InferenceChainEngine.ts:18: *   runInferenceChain    - Orchestrates a multi-step reasoning chain
src\engines\InferenceChainEngine.ts:19: *   analyzeAndRecommend  - 3-step manufacturing scenario analysis
src\engines\InferenceChainEngine.ts:20: *   deepDiagnose         - 2-step failure scenario diagnosis
src\engines\InferenceChainEngine.ts:26: *   analyzeAndRecommend and deepDiagnose pro
... [+1171 chars truncated]

### Assistant | 2026-06-20T04:19:17.250Z

This is the load-bearing finding. `runInferenceChain` is called by NO production code outside its own module — only `analyzeAndRecommend` (line 773) and `deepDiagnose` (line 983) call it internally, and BOTH of those still have the `if(!hasValidApiKey()) return {...API_KEY_MISSING...}` pre-gate (lines 686, 916). So in a no-key deployment:

- `analyzeAndRecommend` → returns `API_KEY_MISSING` stub BEFORE reaching `runInferenceChain` → never reaches the chokepoint.
- `deepDiagnose` → same.
- `runInferenceChain` itself → has no external production caller.

Let me confirm the `inference_chain` calc dispatcher case (line 200 was only the result-compactor) — find the actual `case "inference_chain":` that dispatches to an engine, and check whether any dispatcher reaches `runInferenceChain`.

### Assistant | 2026-06-20T04:19:18.505Z

[tool_use: Grep]

### Assistant | 2026-06-20T04:19:18.980Z

[tool_use: Grep]

### User | 2026-06-20T04:19:19.916Z

[tool_result] 200:    case "inference_chain":
577:  "campaign_cycle_time", "inference_chain",

### User | 2026-06-20T04:19:20.482Z

[tool_result] Found 10 files
src\__tests__\inference-chain-llm-wire.test.ts
src\engines\InferenceChainEngine.ts
src\tools\dispatchers\aiReasoningDispatcher.ts
src\engines\ai-training\PATHS.md
src\engines\agent-orchestration\PATHS.md
src\engines\ReasoningWiringEngine.ts
src\__tests__\WireEDMDeepLogicEngine.test.ts
src\engines\WireEDMDeepLogicEngine.ts
src\__tests__\forge-debug-p3-regression.test.ts
src\__tests__
... [+34 chars truncated]

### Assistant | 2026-06-20T04:19:31.080Z

The system-viz graph confirms the picture: `inferencechainengine` appears in `engines-unwired` (it's a known-unwired engine). The `calcDispatcher.ts` references at lines 200/577 are only the result-compactor switch and the action-enum list — there is NO `case "inference_chain":` in the *executor* switch that calls `runInferenceChain`. Let me definitively confirm: find where `calcDispatcher` actually invokes an engine for `inference_chain` (the executor, distinct from the compactor at line 200).

### Assistant | 2026-06-20T04:19:32.381Z

[tool_use: Bash]

### User | 2026-06-20T04:19:36.878Z

[tool_result] 200:    case "inference_chain":
577:  "campaign_cycle_time", "inference_chain",
===CONTEXT-AROUND-EACH===
198-    case "campaign_cycle_time":
199-      return { total_min: result.estimated_total_time_min, per_material_min: result.time_per_material_min, materials: result.materials_count };
200:    case "inference_chain":
201-      return { chain_id: result.chain_id, status: result.status, steps_com
... [+488 chars truncated]

### Assistant | 2026-06-20T04:19:47.281Z

Confirmed definitively. In `calcDispatcher.ts`, `inference_chain` exists only as:
- Line 200-201: a `compactResult` switch case (shapes a result that was already computed elsewhere — pure response formatting).
- Line 577: a member of the action-name list array.

There is **no executor case** that imports `InferenceChainEngine` and calls `runInferenceChain`. The compactor at 200 is dead for this action unless an executor produces the `result`. Let me make one final confirmation — search the entire dispatchers/routes/engines tree for any executor that imports and calls into the InferenceChain engine's functions (not the type-only references).

### Assistant | 2026-06-20T04:19:50.549Z

[tool_use: Bash]

### User | 2026-06-20T04:19:55.960Z

[tool_result] === import sites of InferenceChainEngine (non-test) ===
src/tools/dispatchers/aiReasoningDispatcher.ts:4215:        const mod = await import("../../engines/InferenceChainEngine.js");
=== any call to the 4 chain fns anywhere non-test ===
src/tools/dispatchers/aiReasoningDispatcher.ts:4217:        // InferenceChainEngine exports CHAIN_ACTIONS + listChainTypes — no singleton.
src/tools/dispatchers/ai
... [+226 chars truncated]

### Assistant | 2026-06-20T04:20:28.021Z

The blast-radius trace is complete and conclusive. Across the entire non-test codebase:

- The ONLY production import of `InferenceChainEngine` is `aiReasoningDispatcher.ts:4215`, and it invokes ONLY `listChainTypes()`/`CHAIN_ACTIONS` (introspection — returns the list of chain-type strings). It does **NOT** call `runInferenceChain`, `analyzeAndRecommend`, or `deepDiagnose`.
- `runInferenceChain` has NO production caller other than the two internal wrappers `analyzeAndRecommend`/`deepDiagnose`.
- Those two wrappers BOTH retain the `if(!hasValidApiKey()) return {...API_KEY_MISSING...}` pre-gate (lines 686, 916), so in a no-key deployment they short-circuit BEFORE reaching `runInferenceChain`.

So the chokepoint (`parallelAPICalls` → free `llmEngine.query`) is reachable through `runInferenceChain` in code, but `runInferenceChain` itself is reached by **no production consumer** in a no-key deployment. This is the SAME orphan class the prior FAIL flagged, just moved one layer inward: the gate was removed from `runInferenceChain`, but every path that would *call* `runInferenceChain` is either (a) the two still-gated wrappers, or (b) absent entirely (no dispatcher executor wires `inference_chain` to the engine).

Let me give a final, honest verdict.

---

VERDICT: FAIL

summary: The chokepoint migration (`parallelAPICalls` -> free `llmEngine.query`, offline -> `{text:'', error}`) is correct, R12-honest, and the per-step error handling in `runInferenceChain` is genuinely defensive (offline degrades to status "partial"/"failed", never a throw). `buildNoKeyResult` is fully removed with zero dangling refs, `hasValidApiKey` remains validly imported, tsc has exactly 1 pre-existing unrelated error (InventorCADCodeGeneratorEngine), and all 5 tests pass hermetically and prove intent. HOWEVER, the wiring claim does not hold: removing the gate from `runInferenceChain` does NOT make the chokepoint non-orphan, because `runInferenceChain` has no production consumer that reaches it in a 
... [+4149 chars truncated]
