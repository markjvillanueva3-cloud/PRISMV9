---
type: "chat-session"
source: "claude-code-cli"
session_id: "90e8db66-2b71-4e38-af9e-8576aa89fc41"
title: "Read-only INDEPENDENT adversarial review of a free-AI migration unit (FREE-AI-MI"
date: "2026-06-20"
first_ts: "2026-06-20T04:16:41.574Z"
last_ts: "2026-06-20T04:19:29.407Z"
cwd: "H:\\prism\\mcp-server"
messages: 52
user_msgs: 20
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/90e8db66-2b71-4e38-af9e-8576aa89fc41/subagents/agent-ad7327a831908ecbc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Read-only INDEPENDENT adversarial review of a free-AI migration unit (FREE-AI-MI

> **claude-code-cli** | 2026-06-20 | 52 msgs (20 user / 32 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/90e8db66-2b71-4e38-af9e-8576aa89fc41/subagents/agent-ad7327a831908ecbc.jsonl`

## Transcript

### User | 2026-06-20T04:16:41.574Z

Read-only INDEPENDENT adversarial review of a free-AI migration unit (FREE-AI-MIGRATION/U-PARALLELAPI-LLM-ROUTE + U-INFERENCECHAIN-LLM-WIRE, slot:india). Grade PASS or FAIL with P0/P1/P2 + file:line. Do NOT assume the other reviewer caught everything.

CONTEXT: parallelAPICalls (api-config.ts) was migrated from a paid Anthropic call to the free Ollama-first llmEngine.query (offline -> {text:'',error}). To make it non-orphan, InferenceChainEngine.runInferenceChain's `if(!hasValidApiKey()) return buildNoKeyResult` pre-gate was REMOVED so it reaches the free chokepoint; buildNoKeyResult was deleted.

FILES (read end-to-end):
- H:/prism/mcp-server/src/engines/InferenceChainEngine.ts (focus: runInferenceChain ~462-640, the removed gate, the deleted buildNoKeyResult, the wave/step loop)
- H:/prism/mcp-server/src/config/api-config.ts (parallelAPICalls)
- H:/prism/mcp-server/src/__tests__/inference-chain-llm-wire.test.ts
- H:/prism/mcp-server/src/__tests__/api-config-parallel-llm-route.test.ts

Weighted toward what a correctness reviewer MISSES:
1. CRASH/REGRESSION ON THE NEWLY-REACHABLE PATH -- removing the no-key gate means runInferenceChain now EXECUTES its full wave/step loop when offline (previously short-circuited). Trace that loop carefully: when parallelAPICalls returns {text:'', error, model:'offline'}, does ANY downstream step (template substitution with empty prior output, stepOutputMap reads, final_output assembly, writeChainLog, response_level filtering) crash, infinite-loop, or produce a misleading "successful-looking" result? The old gate HID this path -- the migration exposes it. Cite file:line for any real risk.
2. CONSUMERS OF runInferenceChain -- the result shape on offline changed from buildNoKeyResult (status:"failed", final_output:"ANTHROPIC_API_KEY not configured...", step_results:[]) to a real-attempt result (status:"partial", populated step_results with errors). Do callers of runInferenceChain (incl analyzeAndRecommend/deepDiagnose which build a con
... [+1290 chars truncated]

### Assistant | 2026-06-20T04:16:44.845Z

I'll review this free-AI migration unit adversarially, focusing on the newly-reachable offline path. Let me read all four files end-to-end plus trace the consumers.

### Assistant | 2026-06-20T04:16:45.278Z

[tool_use: Read]

### Assistant | 2026-06-20T04:16:45.776Z

[tool_use: Read]

### Assistant | 2026-06-20T04:16:46.260Z

[tool_use: Read]

### Assistant | 2026-06-20T04:16:46.577Z

[tool_use: Read]

### User | 2026-06-20T04:16:47.374Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\InferenceChainEngine.ts' was already read 13s ago in this session and is unchanged (mtime 1781928856625). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-20T04:16:47.695Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\config\api-config.ts' was already read 12m ago in this session and is unchanged (mtime 1781928200232). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-20T04:16:48.356Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\inference-chain-llm-wire.test.ts' was already read 13s ago in this session and is unchanged (mtime 1781928936246). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRIS
... [+15 chars truncated]

### User | 2026-06-20T04:16:48.551Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\api-config-parallel-llm-route.test.ts' was already read 12m ago in this session and is unchanged (mtime 1781928123071). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable:
... [+20 chars truncated]

### Assistant | 2026-06-20T04:16:50.861Z

The read-once guard says these are in context, but as a fresh agent thread I don't actually have them. Let me disable the cache to read them.

### Assistant | 2026-06-20T04:16:51.911Z

[tool_use: Bash]

### User | 2026-06-20T04:16:56.674Z

[tool_result]      1	/**
     2	 * PRISM MCP Server - API Configuration
     3	 * Loads API keys and provides Anthropic SDK client
     4	 * 
     5	 * FIXED: getAnthropicClient() now returns actual Anthropic SDK instance
     6	 * with proper TypeScript types (was previously typed as plain object)
     7	 */
     8	
     9	import { config } from 'dotenv';
    10	import { join } from 'path';
    11	import Anthr
... [+8750 chars truncated]

### Assistant | 2026-06-20T04:16:58.974Z

Now the InferenceChainEngine. Let me read the focus area and trace the wave/step loop carefully.

### Assistant | 2026-06-20T04:17:00.097Z

[tool_use: Bash]

### User | 2026-06-20T04:17:06.582Z

[tool_result]    440	 *   - If an individual step fails, it records the error and continues with an
   441	 *     empty string output, setting status to "partial".
   442	 *
   443	 * @param config - Chain configuration including steps, input variables, and options
   444	 * @returns InferenceChainResult (filtered by response_level if specified)
   445	 */
   446	export async function runInferenceChain(
   447	
... [+10940 chars truncated]

### Assistant | 2026-06-20T04:17:08.872Z

Now let me read the helper functions (substituteTemplate, buildExecutionWaves, applyResponseLevel, writeChainLog) and deepDiagnose, plus the top of the file for the deleted gate context.

### Assistant | 2026-06-20T04:17:10.622Z

[tool_use: Bash]

### User | 2026-06-20T04:17:14.978Z

[tool_result]      1	/**
     2	 * PRISM MCP Server - Inference Chain Engine (R3-MS4.5-T2)
     3	 *
     4	 * Server-side multi-step reasoning engine that reduces client context consumption
     5	 * by chaining multiple reasoning steps internally. Each chain runs 2-3 API calls,
     6	 * feeds each step's output as context to the next, and returns a summarized result.
     7	 *
     8	 * Architecture:
     9	
... [+19064 chars truncated]

### Assistant | 2026-06-20T04:17:17.153Z

Now let me read deepDiagnose and the rest of the file, then check the test files and grep for consumers.

### Assistant | 2026-06-20T04:17:18.392Z

[tool_use: Bash]

### User | 2026-06-20T04:17:24.650Z

[tool_result]    720	1. PROBLEM TYPE: (one of: cutting_parameters, tool_selection, workholding, process_planning, quality_issue, machine_selection)
   721	2. MATERIAL GROUP: (ISO group P/M/K/N/S/H or unknown)
   722	3. KEY PARAMETERS: (list 3-5 critical numerical or categorical parameters from the scenario)
   723	4. COMPLEXITY: (simple/moderate/complex)
   724	5. CLASSIFICATION SUMMARY: (1 sentence)`,
   725	 
... [+11429 chars truncated]

### Assistant | 2026-06-20T04:17:27.271Z

Now the test files and the consumer grep. Let me run these in parallel.

### Assistant | 2026-06-20T04:17:28.727Z

[tool_use: Bash]

### Assistant | 2026-06-20T04:17:29.230Z

[tool_use: Bash]

### User | 2026-06-20T04:17:36.502Z

[tool_result]      1	/**
     2	 * InferenceChainEngine free-AI wiring test
     3	 * (FREE-AI-MIGRATION/U-INFERENCECHAIN-LLM-WIRE, slot:india).
     4	 *
     5	 * Verifies runInferenceChain's no-ANTHROPIC_API_KEY pre-gate was removed so it REACHES the now-free
     6	 * Ollama-first parallelAPICalls substrate (the chokepoint freed in U-PARALLELAPI-LLM-ROUTE). This is
     7	 * the consumer-level proof the cho
... [+3710 chars truncated]

### User | 2026-06-20T04:17:41.971Z

[tool_result]      1	/**
     2	 * parallelAPICalls LLM-route migration test
     3	 * (FREE-AI-MIGRATION/U-PARALLELAPI-LLM-ROUTE, slot:india).
     4	 *
     5	 * Verifies the shared paid-call chokepoint `parallelAPICalls` (api-config.ts) was migrated from a
     6	 * direct PAID Anthropic call (getAnthropicClient().messages.create, gated by a hasValidApiKey()
     7	 * throw) to the free Ollama-first llmEngin
... [+4880 chars truncated]

### Assistant | 2026-06-20T04:17:44.839Z

Now let me grep for consumers of `runInferenceChain`, `parallelAPICalls`, `buildNoKeyResult`, and check the LLMEngine offline contract. Let me also verify the git diff to confirm exactly what changed.

### Assistant | 2026-06-20T04:17:46.254Z

[tool_use: Grep]

### Assistant | 2026-06-20T04:17:47.217Z

[tool_use: Grep]

### Assistant | 2026-06-20T04:17:47.908Z

[tool_use: Grep]

### User | 2026-06-20T04:17:48.559Z

[tool_result] src\engines\InferenceChainEngine.ts:18: *   runInferenceChain    - Orchestrates a multi-step reasoning chain
src\engines\InferenceChainEngine.ts:110: * Complete result from a runInferenceChain() call.
src\engines\InferenceChainEngine.ts:446:export async function runInferenceChain(
src\engines\InferenceChainEngine.ts:455:  // runInferenceChain reasons through the now-free Ollama-first parallelAPICa
... [+986 chars truncated]

### User | 2026-06-20T04:17:49.562Z

[tool_result] src\config\api-config.ts:57:    throw new Error('ANTHROPIC_API_KEY not configured. Add your key to .env file.');
src\__tests__\atcs-dispatcher-llm-route.test.ts:16: *     proving the `if(!hasValidApiKey()) return err("ANTHROPIC_API_KEY not configured")` gate was
src\__tests__\atcs-dispatcher-llm-route.test.ts:26:// the process env, a REVERTED key-gate would return "ANTHROPIC_API_KEY not configured
... [+1702 chars truncated]

### User | 2026-06-20T04:17:49.735Z

[tool_result] src\config\api-config.ts:107:export async function parallelAPICalls(
src\orchestration\AutoPilotV2.ts:4: * FIXED: Execution phase now uses REAL parallelAPICalls() 
src\orchestration\AutoPilotV2.ts:13:import { hasValidApiKey, parallelAPICalls, getModelForTier } from "../config/api-config.js";
src\orchestration\AutoPilotV2.ts:260:        const responses = await parallelAPICalls(executionPrompts);
sr
... [+3689 chars truncated]

### Assistant | 2026-06-20T04:17:54.134Z

`buildNoKeyResult` has zero remaining references (only mentioned in the test docstring as deleted) — confirming the deletion is clean. Now let me check the two direct callers inside the engine (`analyzeAndRecommend`, `deepDiagnose`) still have their own `hasValidApiKey` gate — confirmed at lines 686 and 916. Let me verify the LLMEngine offline contract returns `model:"offline"` and check the git diff for exactly what was removed.

### Assistant | 2026-06-20T04:17:55.506Z

[tool_use: Bash]

### Assistant | 2026-06-20T04:17:57.111Z

[tool_use: Bash]

### User | 2026-06-20T04:18:01.498Z

[tool_result] 8: * offline response. Policy via `config.prefer` / env `PRISM_LLM_PREFER`
31:  model: string;
33:  ollama_model: string;
35:   *  "ollama" = strict-free (Ollama only, then offline, never pays);
36:   *  "claude" = Claude only (then offline) -- for any consumer that needs frontier. */
42:  ollama_vision_model: string;
51:    model: string; prompt: string; system?: string; temperature?: number; max
... [+2690 chars truncated]

### User | 2026-06-20T04:18:09.056Z

[tool_result] 247bbf0cd8 [MAIN] FORGE-AUDIT/U-FIX01: cluster-1 type drift recovery
98c9f585d7 [MAIN]/U-EFF23: restore 2020 src files from Box canonical
---DIFF---
diff --git a/mcp-server/src/engines/InferenceChainEngine.ts b/mcp-server/src/engines/InferenceChainEngine.ts
index 4d1c5325b9..260e78348d 100644
--- a/mcp-server/src/engines/InferenceChainEngine.ts
+++ b/mcp-server/src/engines/InferenceChainEngine.ts

... [+2363 chars truncated]

### Assistant | 2026-06-20T04:18:13.650Z

The git diff confirms exactly what the task described: `buildNoKeyResult` deleted, the pre-gate removed. Now I need to verify the critical R12/regression concern: when offline, the final `status`. Let me trace it precisely.

For a single-step offline chain: `resp.error` is set → `stepError = resp.error`, `overallStatus = "partial"`, `stepOutput = ""`. Then `completedSteps.push(...)` with the error. So `completedSteps.length === 1` (not 0), meaning the `if (completedSteps.length === 0) overallStatus = "failed"` branch does NOT fire. The status stays `"partial"`, NOT `"failed"`.

This contradicts the code comments and the test name. Let me verify the test assertion handles this and check the empty-steps edge case.

### Assistant | 2026-06-20T04:18:15.160Z

[tool_use: Bash]

### User | 2026-06-20T04:18:20.270Z

[tool_result] Reference data from the PRISM knowledge base when available.${contextText}`;

    // Provider selection -- Ollama-first by default (free at launch), adaptive
    // fallback to Claude (paid), then a deterministic offline response. Graceful
    // degradation = zero regression: with Ollama down + a key set, this behaves
    // exactly like the prior Claude-only path.
    const temperature = input.t
... [+3438 chars truncated]

### Assistant | 2026-06-20T04:18:22.535Z

Critical finding confirmed. Let me read the final offline return block to confirm `model: "offline"` exactly, and the `_generateOfflineResponse` content.

### Assistant | 2026-06-20T04:18:24.737Z

[tool_use: Bash]

### User | 2026-06-20T04:18:29.483Z

[tool_result]       context_used: ctxTitles,
      model: "offline",
      tokens_used: { input: 0, output: 0 },
      duration_ms: Date.now() - start,
      cached: false,
    };
  }

  /**
   * Multimodal (vision) query -- the FREE print-to-CNC / CAD-drawing path. Mirrors
   * query()'s provider ladder: the Ollama VISION model first (free) -> Claude vision
   * backup (paid; only when a key is set AND the loc
... [+1220 chars truncated]

### Assistant | 2026-06-20T04:18:36.899Z

Confirmed: `model: "offline"` exactly. So `parallelAPICalls` correctly maps offline → `{text:'', error, model:'offline'}`. The api-config side is solid.

Now the key trace for `runInferenceChain` offline status. Let me verify my analysis with precision by checking the test's actual assertion (`not.toBe("completed")`) and whether a multi-step offline chain could produce a misleading result. Let me also confirm there is no crash in the per-step path with empty output templated into a later step.

I have enough to render the verdict. Let me do one final check: confirm the dispatcher consumers of `runInferenceChain` (via the engine's own `inference_chain` action) and whether any consumer keys off `status === "failed"` specifically.

### Assistant | 2026-06-20T04:18:38.382Z

[tool_use: Grep]

### User | 2026-06-20T04:18:39.910Z

[tool_result] src\tools\dispatchers\aiReasoningDispatcher.ts:137:  "inference_chain_run",
src\tools\dispatchers\aiReasoningDispatcher.ts:4214:      case "inference_chain_run": {
src\tools\dispatchers\aiReasoningDispatcher.ts:4215:        const mod = await import("../../engines/InferenceChainEngine.js");
src\tools\dispatchers\aiReasoningDispatcher.ts:4217:        // InferenceChainEngine exports CHAIN_ACTIONS + l
... [+4381 chars truncated]

### Assistant | 2026-06-20T04:18:47.300Z

Let me look at the `calcDispatcher.ts:200` `inference_chain` case — this is a real consumer that calls `runInferenceChain` and is reachable via `prism_calc`. This is the live consumer whose offline behavior matters.

### Assistant | 2026-06-20T04:18:48.257Z

[tool_use: Bash]

### User | 2026-06-20T04:18:53.403Z

[tool_result]     case "render_report":
      return { type: result.type, line_count: result.line_count, sections: result.sections?.length || 0 };
    case "campaign_create":
      return { material_count: result.material_count, pass: result.summary?.total_pass, fail: result.summary?.total_fail, quarantine: result.summary?.total_quarantine, avg_safety: result.summary?.avg_safety_score };
    case "campaign_vali
... [+4718 chars truncated]

### Assistant | 2026-06-20T04:19:29.407Z

This is the live consumer surfacing. The `inference_chain` dispatcher case surfaces `status` directly to the caller. This is exactly where the offline status value matters for honesty. The consumer passes through whatever `runInferenceChain` returns — it does not depend on the old `"failed"`/key-message shape, so it won't crash. But the value it surfaces is now `"partial"` on offline, not `"failed"`.

I have everything I need. Let me confirm the precise offline status outcome once more by tracing the single-step path:

- Offline single step: `resp.error` truthy → `stepError` set, `overallStatus = "partial"`, `stepOutput = ""`.
- `completedSteps.push(...)` → length 1.
- `finalOutput = completedSteps[0].output = ""`.
- `completedSteps.length === 0` is FALSE → status stays `"partial"`.
- Result: `status: "partial"`, `final_output: ""`, `steps_completed: 0` (filtered by `!s.error`).

The test asserts `result.status).not.toBe("completed")` — `"partial"` passes that. But the code comments and test docstring repeatedly claim offline degrades to `status:"failed"`, which is FALSE for any chain with ≥1 step (i.e., every real chain). The only path to `"failed"` is `completedSteps.length === 0`, which requires an empty `steps` array — never the case for analyzeAndRecommend/deepDiagnose or any real chain.

This is a documentation/honesty (R12) accuracy defect, not a crash. Let me finalize.

---

VERDICT: PASS

summary: The migration is correctly implemented and genuinely non-orphan: `parallelAPICalls` (api-config.ts:107-170) routes through the free `llmEngine.query` with a byte-identical return shape and a correct R12 offline mapping (`model:"offline"` → `{text:'', error}`), and `runInferenceChain` (InferenceChainEngine.ts:446) reaches it after the no-key gate + `buildNoKeyResult` were cleanly removed (verified zero remaining refs). The newly-reachable offline path does NOT crash, infinite-loop, or fabricate a "completed" success — empty step outputs flow safely through template
... [+4777 chars truncated]
