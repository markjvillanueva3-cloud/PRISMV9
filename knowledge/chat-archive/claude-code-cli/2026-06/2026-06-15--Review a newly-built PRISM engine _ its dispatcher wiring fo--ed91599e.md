---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Review a newly-built PRISM engine + its dispatcher wiring for correctness, edge "
date: "2026-06-15"
first_ts: "2026-06-15T14:54:50.657Z"
last_ts: "2026-06-15T14:57:55.804Z"
cwd: "H:\\prism-slot-sierra"
messages: 31
user_msgs: 12
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a8958a6f5b26767a7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Review a newly-built PRISM engine + its dispatcher wiring for correctness, edge 

> **claude-code-cli** | 2026-06-15 | 31 msgs (12 user / 19 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a8958a6f5b26767a7.jsonl`

## Transcript

### User | 2026-06-15T14:54:50.657Z

Review a newly-built PRISM engine + its dispatcher wiring for correctness, edge cases, and silent-failure risk. Read each file END-TO-END.

FILES:
1. H:/prism/mcp-server/src/engines/GraphContextLensEngine.ts (new engine)
2. H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts -- ONLY the graph_context_lens_extract wiring: the action in VICTOR_AI_DIRECT_ACTIONS (~line 212), the schema in VICTOR_AI_DIRECT_SCHEMAS (~line 222), and the handler `case "graph_context_lens_extract"` (~line 4409).
3. H:/prism/mcp-server/src/__tests__/GraphContextLensEngine.test.ts (engine tests)
4. H:/prism/mcp-server/src/__tests__/AIReasoningDispatcher.graphContextLens-wire.test.ts (round-trip test)

CONTRACT (unit GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC01): extractEgoGraph(nodeId,hops) BFS ego-graph slice over the precomputed adjacency sidecar (state/shared/system-viz/node-adjacency.json, shape {adjacency:{id:{in:[{id,type}],out:[{id,type}]}}}), cycle-safe, node-capped; extractByDomain(domain); summarizeCommunity(nodes); render(ego, json|markdown|mermaid). Deliberately reads the bounded adjacency sidecar + seekCard (CHEAP-NODE-ACCESS) instead of the 644MB system-graph.json (justified anti-OOM deviation from the literal spec).

CHECK SPECIFICALLY (flag P0=correctness/crash/security, P1=real bug/edge-case, P2=minor):
- BFS correctness: cycle-safety (visited set), hop-distance accuracy, node-cap/truncation, induced-edge pass (every edge with both endpoints in the set, once, no dupes).
- Failure modes: missing sidecar (fail-loud + recovery hint?), corrupt JSON (fail-loud?), unknown/empty nodeId, adversarial nodeId with shell chars (is it ever shelled out? path-traversal?), hops>diameter, negative hops, maxNodes cap.
- The dispatcher handler: does `result =` assign BARE data (so executeAIReasoningAction's `slimResponse(result)` + `return {success,data:slimmed}` yields r.data = the ego)? The schema `.refine()` rejecting when neither nodeId nor domain -- correct?
- Test integrity (R9): do 
... [+458 chars truncated]

### Assistant | 2026-06-15T14:54:57.408Z

I'll read all four files end-to-end before forming any verdict.

### Assistant | 2026-06-15T14:54:57.788Z

[tool_use: Read]

### Assistant | 2026-06-15T14:54:57.933Z

[tool_use: Read]

### User | 2026-06-15T14:54:59.467Z

[tool_result] 1	/**
2	 * GraphContextLensEngine.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC01
3	 * =================================================================
4	 * Make the live PRISM /system-viz graph (~345K nodes / 11 layers) directly
5	 * addressable as scoped LLM context. Agents need a small slice around a target
6	 * node -- an EGO-GRAPH -- not the whole 644MB graph.
7	 *
8	 * Capabilities:
9	 *   - extra
... [+17482 chars truncated]

### User | 2026-06-15T14:54:59.914Z

[tool_result] 1	/**
2	 * GraphContextLensEngine.test.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC01
3	 * Real reference-value tests over a hand-built adjacency fixture (no toBeDefined
4	 * stubs). Covers happy 1/2/3-hop, unknown node, empty graph, oversized hops,
5	 * malformed sidecar, cycle-safety, domain extraction, community summary, render
6	 * formats, and adversarial node ids.
7	 */
8	import { describe, it, ex
... [+10860 chars truncated]

### Assistant | 2026-06-15T14:55:03.789Z

Now read the dispatcher file sections that were specified:

### Assistant | 2026-06-15T14:55:05.043Z

[tool_use: Read]

### Assistant | 2026-06-15T14:55:05.340Z

[tool_use: Read]

### User | 2026-06-15T14:55:11.290Z

[tool_result] 205	// PPR ranking + approval-chain status all become MCP-callable as a unified
206	// AI surface, instead of being dead engines on disk.
207	// ──────────────────────────────────────────────────────────────────────
208	const VICTOR_AI_DIRECT_ACTIONS = [
209	  "tribal_outcome_bridge_status",
210	  "knowledge_graph_project",
211	  "graph_importance_rank_global",
212	  "graph_context_lens_extract",

... [+2705 chars truncated]

### User | 2026-06-15T14:55:11.349Z

[tool_result] 1	/**
2	 * Round-trip wiring test for prism_ai:graph_context_lens_extract
3	 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC01). Invokes THROUGH executeAIReasoningAction
4	 * (schema validation + dispatch), not the engine singleton directly. Hermetic via
5	 * a fixture adjacency sidecar pointed at by PRISM_VIZ_ADJ_PATH.
6	 */
7	import { describe, it, expect, beforeAll, afterAll } from "vitest";
8	import { mkd
... [+2703 chars truncated]

### Assistant | 2026-06-15T14:55:17.326Z

Now I need to read the actual dispatcher handler around line 4409 to verify the `case` block and how `result` flows through `slimResponse`:

### Assistant | 2026-06-15T14:55:18.275Z

[tool_use: Grep]

### User | 2026-06-15T14:55:20.645Z

[tool_result] 182-  "cross_process_ai_classify",
183-  "cross_process_ai_orchestrate",
184-  "consensus_neural_feedback_record",
185-  "consensus_neural_feedback_recent",
186-  // Knowledge injection / tribal / coordinator / cross-domain
187-  "knowledge_injection_plan",
188-  "knowledge_injection_execute",
189-  "knowledge_injection_record_outcome",
190-  "tribal_applicator_apply",
191-  "full_system_coordinat
... [+9032 chars truncated]

### Assistant | 2026-06-15T14:55:23.553Z

I have the handler. Now let me find the `slimResponse` and the outer wrapper for `executeAIReasoningAction` to verify how `result` is returned:

### Assistant | 2026-06-15T14:55:25.158Z

[tool_use: Grep]

### User | 2026-06-15T14:55:26.911Z

[tool_result] 20:import { slimResponse } from "../../utils/responseSlimmer.js";
1140:export async function executeAIReasoningAction(
4736:    const slimmed = slimResponse(result);
4738:    return { success: true, data: slimmed };
4750:  return executeAIReasoningAction(args.action, args.params ?? {});
4763:      const result = await executeAIReasoningAction(action, params);

### Assistant | 2026-06-15T14:55:30.458Z

Now I need to read the full outer wrapper of `executeAIReasoningAction` to see exactly how `result` is wrapped and returned — specifically confirming whether `graph_context_lens_extract` sets `result` as bare data (no `{success,data}` envelope) and how that flows through `slimResponse`:

### Assistant | 2026-06-15T14:55:31.227Z

[tool_use: Read]

### Assistant | 2026-06-15T14:55:31.645Z

[tool_use: Read]

### User | 2026-06-15T14:55:35.416Z

[tool_result] 1140	export async function executeAIReasoningAction(
1141	  action: AIAction,
1142	  params: Record<string, unknown>
1143	): Promise<{ success: boolean; data?: unknown; error?: string }> {
1144	  const startTime = Date.now();
1145	  log.info(`[prism_ai] Executing action: ${action}`);
1146	
1147	  // Validate params against schema (U-WIRE03: pass the schema MAP, not the per-action schema —
1148	  /
... [+2418 chars truncated]

### User | 2026-06-15T14:55:35.417Z

[tool_result] 4720	        const { tpeHyperparameterSearchEngine } = await import("../../engines/TPEHyperparameterSearchEngine.js");
4721	        tpeHyperparameterSearchEngine.clearAll();
4722	        result = { cleared: true };
4723	        break;
4724	      }
4725	
4726	      default: {
4727	        const _exhaustive: never = action;
4728	        return dispatcherError(`Unknown action: ${_exhaustive}`, action
... [+1210 chars truncated]

### Assistant | 2026-06-15T14:55:38.907Z

Now I have everything I need. Let me also verify the `ALL_AI_SCHEMAS` merge to confirm the `VICTOR_AI_DIRECT_SCHEMAS` is actually included in the schema map used by `validateActionParams`:

### Assistant | 2026-06-15T14:55:40.199Z

[tool_use: Grep]

### User | 2026-06-15T14:55:56.777Z

[tool_result] 40:// ALL_AI_ACTIONS is the wire-level tuple used by z.enum(...); ALL_AI_SCHEMAS
216:const VICTOR_AI_DIRECT_SCHEMAS = {
495:const ALL_AI_SCHEMAS = {
502:  ...VICTOR_AI_DIRECT_SCHEMAS,
1150:  const validation = validateActionParams(action, params, ALL_AI_SCHEMAS);

### Assistant | 2026-06-15T14:55:58.878Z

[tool_use: Read]

### User | 2026-06-15T14:56:03.649Z

[tool_result] 490	  ...INDIA_AI_ORPHAN_ACTIONS,
491	  ...XFER_LEARN_ACTIONS,
492	  ...ATTR_DETECT_ACTIONS,
493	  ...TPE_SEARCH_ACTIONS,
494	] as const;
495	const ALL_AI_SCHEMAS = {
496	  ...ACTION_AI_REASONING_SCHEMAS,
497	  ...ACTION_AI_CAPABILITY_SCHEMAS,
498	  ...OUTCOME_CROSSWIRE_SCHEMAS,
499	  ...RAG_CROSSWIRE_SCHEMAS,
500	  ...BLUEPRINT_LORA_SCHEMAS,
501	  ...ITER4_AI_SCHEMAS,
502	  ...VICTOR_AI_DIRECT_SC
... [+195 chars truncated]

### Assistant | 2026-06-15T14:56:11.411Z

Good. Now I have a complete picture. Let me do one final check — the `result` assignment in the `graph_context_lens_extract` case, then verify the shape the test expects versus what `slimResponse(result)` actually produces:

### Assistant | 2026-06-15T14:56:11.658Z

[tool_use: Read]

### User | 2026-06-15T14:56:14.199Z

[tool_result] 4420	      case "graph_context_lens_extract": {
4421	        const { graphContextLensEngine } = await import("../../engines/GraphContextLensEngine.js");
4422	        const p = params as any;
4423	        const lensOpts = { maxNodes: p?.maxNodes, enrich: p?.enrich };
4424	        const ego = p?.domain
4425	          ? await graphContextLensEngine.extractByDomain(String(p.domain), lensOpts)
4426	   
... [+499 chars truncated]

### Assistant | 2026-06-15T14:57:55.804Z

I now have everything I need to produce the verdict. Let me compile all findings:

---

VERDICT: FAIL

summary: One P0 silent-failure: when `p.domain` is truthy the dispatcher calls `extractByDomain` but passes `String(p.nodeId ?? "")` as a dead branch — this is fine — HOWEVER when `p.domain` is falsy AND `p.nodeId` is undefined (which the schema allows, since both fields are `.optional()`), the dispatcher calls `extractEgoGraph(String(undefined ?? ""), ...)` which resolves to `extractEgoGraph("", ...)` and throws an engine-level validation error that is caught by the outer `try/catch` and returned as a dispatcher error. The schema `.refine()` gate should catch this before the engine but the refine fires on the parsed object — if `nodeId` is absent entirely (key missing, not `""`) AND `domain` is absent, `Boolean(undefined) || Boolean(undefined)` is `false` and the refine rejects correctly. That path is fine. The real P0 is a result-shape mismatch: the dispatcher sets `result = ego` (bare `EgoGraph`) or `result = {...ego, rendered}` — NOT `{ success: true, data: ego }` — and then the outer wrapper does `slimResponse(result)` → `return { success: true, data: slimmed }`. The round-trip test correctly reads `r.data.center`, `r.data.nodeCount`, etc., so the shape IS correct. That path is actually fine. The genuine bugs are described below.

findings:

- [P0] `H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:4426` -- **`nodeId` passed as `String(p?.nodeId ?? "")` when `p.nodeId` is `undefined` bypasses the schema refine and crashes the engine.** The schema refine at line 230 correctly rejects `{}` (no nodeId, no domain), but the refine condition is `Boolean(d.nodeId) || Boolean(d.domain)`. If a caller passes `{ nodeId: "" }` (empty string, which `.min(1)` on the schema already rejects) that's caught. However if `p.domain` is a non-empty string but `p.nodeId` is `undefined`, the ternary at line 4424 takes the `domain` branch — fine. The actual P0: when `
... [+12608 chars truncated]
