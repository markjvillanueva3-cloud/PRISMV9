---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "PRISM repo H:/prism (shared tree, branch cad-fusion-live-ms0). You are fixing ON"
date: "2026-06-21"
first_ts: "2026-06-21T03:36:20.806Z"
last_ts: "2026-06-21T03:43:05.401Z"
cwd: "H:\\prism\\mcp-server"
messages: 142
user_msgs: 55
assistant_msgs: 87
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a4b3bb7e36137edac.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# PRISM repo H:/prism (shared tree, branch cad-fusion-live-ms0). You are fixing ON

> **claude-code-cli** | 2026-06-21 | 142 msgs (55 user / 87 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a4b3bb7e36137edac.jsonl`

## Transcript

### User | 2026-06-21T03:36:20.806Z

PRISM repo H:/prism (shared tree, branch cad-fusion-live-ms0). You are fixing ONE RED test file. Work from `cd H:/prism/mcp-server`. Do NOT git commit (the lead commits). Do NOT git add. Use `npx vitest run <file>` to verify.

# CONTEXT (already diagnosed — do not re-diagnose)
The file `src/__tests__/aiReasoningDispatcher.uwire11.test.ts` has 16 failing tests. A 2026 clobber commit (c642606778) deleted 7 COMPOSITE prism_ai actions (ai_capability_metrics, ai_system_sync, ai_deep_knowledge_query, ai_resource_recommend, ai_neural_route, ai_active_learning_rank, ai_peer_learning). 6 of the 7 underlying engines were later RE-WIRED under canonical GRANULAR action names (one action per mode). The 7th engine (AISystemSynchronizerEngine status/summary/synergize) was NOT re-wired anywhere — only its `recommend` method moved to prism_dev. Every failing test currently fails at `expect(r.success).toBe(true)` because the composite action name no longer exists (falls to default→success:false).

The dispatcher entry point under test: `executeAIReasoningAction(action, params)` from `../tools/dispatchers/aiReasoningDispatcher.js`.

# HARD RULES (violating any = failure)
1. NEVER re-add the 7 composite action names (ai_capability_metrics, ai_system_sync, ai_deep_knowledge_query, ai_resource_recommend, ai_neural_route, ai_active_learning_rank, ai_peer_learning). They are forbidden duplicates of canonical granular actions.
2. NEVER weaken an assertion to force green. Preserve each test's INTENT (it must still fail if the engine returns garbage). Adapt assertions to the engine's REAL return shape — which you discover by READING the engine method. If unsure of a shape, READ the engine .ts file; do not guess.
3. Match existing conventions exactly (look at the canonical case bodies + schema style already in the files).

# PART A — WIRE 3 GENUINELY-UNWIRED ACTIONS (AISystemSynchronizerEngine)
Engine: `src/engines/AISystemSynchronizerEngine.ts`, singleton `aiSystemSynchronizerEngine`.
Methods
... [+9613 chars truncated]

### Assistant | 2026-06-21T03:36:25.881Z

I'll start by reading CLAUDE.md and the relevant source files to understand the current state before making any changes.

### Assistant | 2026-06-21T03:36:26.673Z

[tool_use: Read]

### Assistant | 2026-06-21T03:36:26.900Z

[tool_use: Read]

### User | 2026-06-21T03:36:27.113Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\aiReasoningDispatcher.uwire11.test.ts' was already read 8m ago in this session and is unchanged (mtime 1777419376020). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: 
... [+19 chars truncated]

### User | 2026-06-21T03:36:27.739Z

[tool_result] 1	/**
2	 * prism_ai — AI Reasoning Dispatcher
3	 * ====================================
4	 * Routes AI reasoning requests through MillMasterOrchestratorFacadeEngine.
5	 *
6	 * Actions (6):
7	 *   ai_route_mill_pipeline     — Full P2P pipeline orchestration
8	 *   ai_mill_agi_reason         — Multi-mode AGI reasoning
9	 *   ai_mill_awareness_query    — Query mill engine capabilities
10	 *   ai_mill
... [+5002 chars truncated]

### Assistant | 2026-06-21T03:36:30.678Z

The uwire11 test file was already read earlier in this session. Let me read the remaining necessary files in parallel.

### Assistant | 2026-06-21T03:36:31.456Z

[tool_use: Read]

### Assistant | 2026-06-21T03:36:32.209Z

[tool_use: Read]

### User | 2026-06-21T03:36:32.307Z

[tool_result] 100	  blueprint_lora_register_endpoint: z.record(z.string(), z.unknown()),
101	  blueprint_lora_history: z.record(z.string(), z.unknown()),
102	};
103	
104	// ============================================================================
105	// CAD-FUSION-LIVE-MS0/iter4 — wire 38 unwired AI/ML/reasoning engines into
106	// prism_ai so they are reachable through the MCP interface.
107	// Skipped (3):
... [+11033 chars truncated]

### Assistant | 2026-06-21T03:36:32.583Z

[tool_use: Read]

### User | 2026-06-21T03:36:33.093Z

[tool_result] 1	/**
2	 * AISystemSynchronizerEngine — Central AI System Orchestration
3	 *
4	 * Synchronizes and synergizes ALL AI capabilities across PRISM:
5	 * - Duplication Guard (blocks duplicates before creation)
6	 * - Deep Reasoning (8 modes via DeepAIIntelligenceEngine)
7	 * - Cross-Disciplinary Learning (15 domains, 120+ formulas)
8	 * - Creative Reasoning (6 exploration modes)
9	 * - Self-Awareness (
... [+15127 chars truncated]

### User | 2026-06-21T03:36:33.482Z

[tool_result] 1	/**
2	 * AI Reasoning Action Schemas — prism_ai dispatcher
3	 * ==================================================
4	 * Zod schemas for 6 mill-targeted AI reasoning actions.
5	 *
6	 * @module schemas/aiReasoningActionSchemas
7	 * @milestone MILL-MASTER/P1-U05-PRISM-AI-ROUTE
8	 */
9	
10	import { z } from "zod";
11	import {
12	  TaskCategory,
13	  ConfidenceLevel,
14	} from "./successPatternSchema
... [+3494 chars truncated]

### Assistant | 2026-06-21T03:36:37.344Z

Now let me read more of the schemas file and the dispatcher to understand the existing patterns, plus the engines I need for the tests.

### Assistant | 2026-06-21T03:36:38.114Z

[tool_use: Read]

### Assistant | 2026-06-21T03:36:38.711Z

[tool_use: Read]

### User | 2026-06-21T03:36:38.936Z

[tool_result] 100	  // INTEL-OLLAMA-OBSIDIAN-MS0/P5: 4 orphan reasoning engines wired
101	  "creative_solve",       // P5-U01 → PRISMCreativeReasoningEngine.explore
102	  "causal_analyze",       // P5-U02 → CausalReasoningEngine.{addEdges,traceImpact,rootCauses}
103	  "counterfactual_predict", // P5-U03 → CounterfactualReasoningEngine.{createCausalGraph,generateCounterfactual}
104	  "scientific_reason",    // P
... [+11523 chars truncated]

### User | 2026-06-21T03:36:39.579Z

[tool_result] 300	  // (it lazy-loads a ~90MB ONNX model -- heavyweight for an MCP call; memory/index pipelines call it
301	  // in-process). Both wired actions are deterministic DATA -- no NN inference/prediction.
302	  "local_embedding_status",
303	  "local_embedding_similarity",
304	  // Unit 3 -- IntentClassifierEngine (PUOA tier-routing classifier; pure regex/keyword over
305	  // CATEGORY_PATTERNS/ENTITY_
... [+10777 chars truncated]

### Assistant | 2026-06-21T03:36:44.215Z

[tool_use: Read]

### Assistant | 2026-06-21T03:36:44.636Z

[tool_use: Read]

### User | 2026-06-21T03:36:45.103Z

[tool_result] 499	  "moonshot_invoke",                // MoonshotClientEngine.exec
500	  // OCTOPUS-NEURAL-MS0/U-OCN02: MoA-Layer-2 aggregator over N proposer outputs
501	  "moa_aggregate",                  // MoaLayer2Engine.aggregate
502	  // OCTOPUS-NEURAL-MS0/U-OCN03: GraphRouter on scrutiny ledger — learned quorum routing
503	  "neural_route_decision",          // NeuralRoutingEngine.route
504	  // OCTOPUS
... [+6271 chars truncated]

### User | 2026-06-21T03:36:45.579Z

[tool_result] 500	// WIRE-UNWIRED-PAPA / U-WIRE-TPE (slot:papa, 2026-06-15) -- surfaces the
501	// TPEHyperparameterSearchEngine (Tree-structured Parzen Estimator, Optuna-style
502	// LoRA hyperparameter search; built + in-process but dispatcher-DARK). Full
503	// suggest/tell ask-tell loop + persistence (snapshot/load) + lifecycle (clear).
504	// Seeded PRNG (mulberry32) -> deterministic given a fixed seed + c
... [+15732 chars truncated]

### Assistant | 2026-06-21T03:36:48.595Z

Now let me look at the switch statement in the dispatcher to find where neural_route, neural_synthesize etc. are wired, and read the relevant engines for test shapes:

### Assistant | 2026-06-21T03:36:50.910Z

[tool_use: Grep]

### User | 2026-06-21T03:36:51.818Z

[tool_result] 2403-        break;
2404-      }
2405-      // ─────────────────────────────────────────────────────────────────────
2406-      // ENGINE-WIRE-MS0/U-WIRE24: ActiveLearningStrategyEngine — info-gain ranking
2407-      // ─────────────────────────────────────────────────────────────────────
2408:      case "learning_rank": {
2409-        const { activeLearningStrategyEngine } = await import("../../e
... [+3926 chars truncated]

### Assistant | 2026-06-21T03:36:52.137Z

[tool_use: Grep]

### User | 2026-06-21T03:36:53.097Z

[tool_result] 1839-        result = await aiPhysicsOptimizationEngine.optimize(
1840-          params as unknown as Parameters<typeof aiPhysicsOptimizationEngine.optimize>[0],
1841-        );
1842-        break;
1843-      }
1844:      case "ai_knowledge_query": {
1845-        const { aiDeepKnowledgeIntegration } = await import("../../engines/AIDeepKnowledgeIntegrationEngine.js");
1846-        result = await ai
... [+1916 chars truncated]

### Assistant | 2026-06-21T03:36:59.370Z

Good. Now let me read the engines needed for the test shapes I don't yet know:

### Assistant | 2026-06-21T03:36:59.683Z

[tool_use: Read]

### Assistant | 2026-06-21T03:36:59.793Z

[tool_use: Read]

### Assistant | 2026-06-21T03:37:00.048Z

[tool_use: Read]

### User | 2026-06-21T03:37:00.769Z

[tool_result] 1	/**
2	 * NeuralIntegrationEngine — Deep Neural Integration Across PRISM
3	 *
4	 * Provides near-AGI level intelligence by:
5	 * - Neural routing of queries to appropriate engines
6	 * - Deep pattern recognition across all knowledge bases
7	 * - Automatic skill/command invocation when appropriate
8	 * - Cross-system learning and adaptation
9	 * - Intelligent context synthesis from multiple source
... [+4156 chars truncated]

### User | 2026-06-21T03:37:00.858Z

[tool_result] 1	/**
2	 * PeerLearningCoordinatorEngine — Cross-session insight sharing
3	 *
4	 * Phase 0.18 U-AGI14 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Session A ends
5	 * and broadcasts what it learned; session B boots later and incorporates
6	 * those insights (deduped). This engine is an in-memory broker that accepts
7	 * broadcasts and serves them to joining sessions.
8	 *
9	 * Dedup is content-based 
... [+3945 chars truncated]

### User | 2026-06-21T03:37:01.097Z

[tool_result] 1	/**
2	 * ActiveLearningStrategyEngine — Rank learning targets by expected info gain
3	 *
4	 * Phase 0.18 U-AGI7 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Given a set of
5	 * candidate learning targets (pages to read, registry entries to verify,
6	 * experiments to run), rank them by expected information gain weighted by
7	 * their Ψ impact and cost.
8	 *
9	 * Info gain is modeled as `entropy_bef
... [+3476 chars truncated]

### Assistant | 2026-06-21T03:37:05.151Z

[tool_use: Read]

### Assistant | 2026-06-21T03:37:05.437Z

[tool_use: Read]

### User | 2026-06-21T03:37:06.205Z

[tool_result] 120	    patterns: [/quote|cost|estimate|schedule|capacity|job|order/i],
121	    engines: ["QuoteEstimatorEngine", "SchedulingEngine", "CapacityPlanningEngine", "JobCostingEngine"],
122	    commands: ["/quote-to-ship", "/job-cost", "/shop-schedule"],
123	    actions: ["prism_business:quote", "prism_scheduling:optimize"],
124	  },
125	
126	  // Deep reasoning patterns
127	  reasoning: {
128	    patt
... [+3792 chars truncated]

### User | 2026-06-21T03:37:06.500Z

[tool_result] 1	/**
2	 * AIResourceLearningEngine — Deep Resource Learning for AI Capability Maximization
3	 * ===================================================================================
4	 * Extracts patterns and knowledge from ALL available resources to maximize AI coding,
5	 * software development, and neural network capabilities.
6	 *
7	 * Resource Sources:
8	 *   - 306 hyperMILL Python scripts (CAM
... [+2386 chars truncated]

### Assistant | 2026-06-21T03:37:10.466Z

[tool_use: Grep]

### User | 2026-06-21T03:37:11.357Z

[tool_result] 874-    }
875-
876-    return { cycles, toolCalls, speedFeedModes, patternBlocks };
877-  }
878-
879-  /**
880-   * Get all Okuma G-code patterns (comprehensive).
881-   */
882-  getAllOkumaPatterns(): GCodePattern[] {
883-    return [...OKUMA_GCODE_PATTERNS];
884-  }
885-
886-  /**
887-   * Get recommended speed/feed for a material based on JM DIE production data.
888-   */
889:  getRecommendedSp
... [+2877 chars truncated]

### system

... [62 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-21T03:40:24.361Z

[tool_use: Grep]

### User | 2026-06-21T03:40:25.260Z

[tool_result] 34-  /** Total knowledge items indexed */
35:  knowledge_coverage: number;
36-  /** Validation confidence (0-1) */
37:  validation_confidence: number;
38-  /** Cross-domain synthesis breadth */
39:  synthesis_breadth: number;
40-  /** Historical error rate (0-1) */
41:  error_rate: number;
42-  /** Overall capability score */
43:  capability_score: number;
44-  /** Breakdown by domain */
45:  doma
... [+513 chars truncated]

### Assistant | 2026-06-21T03:40:27.765Z

[tool_use: Grep]

### User | 2026-06-21T03:40:28.675Z

[tool_result] 253-    integration_status: "pending",
254-    last_updated: "2026-04-15",
255-  },
256-  {
257-    source: "MachineRegistry",
258-    item_count: 910,
259-    coverage_percentage: 100,
260-    integration_status: "full",
261-    last_updated: "2026-04-10",
262-  },
263-  {
264-    source: "ToolCatalogEngine",
265-    item_count: 95608,
266-    coverage_percentage: 100,
267-    integration_status:
... [+1661 chars truncated]

### Assistant | 2026-06-21T03:40:31.441Z

I can see `ENHANCEMENT_STRATEGIES` has `code_generation` and `knowledge_synthesis` — not `deepReasoning`. Let me check all the keys:

### Assistant | 2026-06-21T03:40:31.827Z

[tool_use: Read]

### User | 2026-06-21T03:40:32.708Z

[tool_result] 283	const ENHANCEMENT_STRATEGIES = {
284	  code_generation: {
285	    current_capabilities: [
286	      "AtomicValue return pattern enforcement",
287	      "Physics constant import validation",
288	      "Zod schema generation",
289	      "JSDoc auto-generation",
290	      "Lazy import patterns for dispatchers",
291	    ],
292	    enhancement_targets: [
293	      "Pattern library expansion (500+ c
... [+2474 chars truncated]

### Assistant | 2026-06-21T03:40:36.484Z

The keys are `code_generation`, `knowledge_synthesis`, `reasoning_depth`, `context_retention` — no `deepReasoning`. The test must use a real key. `reasoning_depth` is the closest match to "deepReasoning". Fix the test to use a real key:

### Assistant | 2026-06-21T03:40:40.007Z

[tool_use: Edit]

### User | 2026-06-21T03:40:42.461Z

[tool_result] The file H:/prism/mcp-server/src/__tests__/aiReasoningDispatcher.uwire11.test.ts has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-21T03:40:44.614Z

Now run both test files to verify:

### Assistant | 2026-06-21T03:40:45.775Z

[tool_use: Bash]

### User | 2026-06-21T03:40:51.349Z

[tool_result]        ✓ should generate trochoidal strategy 0ms
       ✓ should generate prism_forces strategy 0ms
       ✓ should generate hsm strategy with machine limits 1ms
       ✓ should route through dispatcher wrapper 0ms
       ✓ should handle missing params gracefully 0ms
       ✓ should handle all ISO groups 1ms
       ✓ should handle all reasoning modes 1ms
       ✓ should handle all adaptive operati
... [+1561 chars truncated]

### Assistant | 2026-06-21T03:40:55.819Z

The uwire11 file is 25/25 PASS. The one failure (`ai_route_mill_pipeline`) is in `aiReasoningDispatcher.test.ts` — this is the **pre-existing failure** that the task spec explicitly said must remain RED and must not be touched. Let me verify by checking that this test was already failing before my changes:

### Assistant | 2026-06-21T03:40:56.503Z

[tool_use: Bash]

### User | 2026-06-21T03:40:59.642Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
e35ceca1c2 [MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-OFFLOAD-DRIFT-GUARD (slot:alpha): self-detect a new untracked execut...
2622e5ac2a [MAIN-FORCE] [BOOTSTRAP-SLOT-ENFORCE] [BACKEND-GOVERNANCE]/U-DRIFT-WORKLIST (slot:bravo): persist engine-e...
2b18723470 [MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-COOLANT-THERMAL (slot:oscar): wire 
... [+280 chars truncated]

### Assistant | 2026-06-21T03:41:02.543Z

Good. The `ai_route_mill_pipeline` test was already failing before my changes (it's the pre-existing baseline failure the spec explicitly calls out). Now run the tsc check:

### Assistant | 2026-06-21T03:41:03.190Z

[tool_use: Bash]

### User | 2026-06-21T03:41:22.029Z

[tool_result] src/engines/InventorCADCodeGeneratorEngine.ts(148,3): error TS2353: Object literal may only specify known properties, and 'maxOpsPerScript' does not exist in type 'CADCapabilityMatrix'.
src/tools/dispatchers/aiReasoningDispatcher.ts(2454,15): error TS2783: 'scenario' is specified more than once, so this usage will be overwritten.
src/tools/dispatchers/aiReasoningDispatcher.ts(5272,59): error TS2
... [+300 chars truncated]

### Assistant | 2026-06-21T03:41:25.601Z

Good — only 3 tsc errors, all pre-existing (none in files I touched). Let me verify none are in my changed files:

### Assistant | 2026-06-21T03:41:26.370Z

[tool_use: Bash]

### User | 2026-06-21T03:41:47.452Z

[tool_result] src/tools/dispatchers/aiReasoningDispatcher.ts(2454,15): error TS2783: 'scenario' is specified more than once, so this usage will be overwritten.
src/tools/dispatchers/aiReasoningDispatcher.ts(5272,59): error TS2345: Argument of type '{ experienceLevel: "novice" | "intermediate" | "expert"; } | undefined' is not assignable to parameter of type 'Partial<UserContext> | undefined'.

### Assistant | 2026-06-21T03:41:51.324Z

Both errors in `aiReasoningDispatcher.ts` are at lines 2454 and 5272 — far from my added cases (which are around line 2536–2562). Let me verify these errors pre-existed by checking their line content:

### Assistant | 2026-06-21T03:41:51.783Z

[tool_use: Read]

### User | 2026-06-21T03:41:52.675Z

[tool_result] 2450	        // Return flat fields when a recommendation exists so callers can read
2451	        // strategy/wilsonLowerBound/rationale directly; include scenario always
2452	        // so null-result callers can identify which scenario had no candidates.
2453	        result = recommendation !== null
2454	          ? { scenario: p.scenario, recommendation, ...recommendation }
2455	          : { sc
... [+76 chars truncated]

### Assistant | 2026-06-21T03:41:56.974Z

Confirmed pre-existing (line 2454 is the `meta_learning_recommend` case, untouched by me). All tsc errors are pre-existing. Now do the final grep confirmation that no composite names remain in the uwire11 file:

### Assistant | 2026-06-21T03:41:58.731Z

[tool_use: Bash]

### User | 2026-06-21T03:42:02.380Z

[tool_result] 22

### Assistant | 2026-06-21T03:42:05.778Z

Those are in comments only. Let me verify they're only in comments and not in actual `executeAIReasoningAction` calls:

### Assistant | 2026-06-21T03:42:06.848Z

[tool_use: Bash]

### User | 2026-06-21T03:42:10.591Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-21T03:42:13.614Z

Zero matches — no composite names in any actual call. Also confirm no `.toBeDefined()` stub assertions were introduced:

### Assistant | 2026-06-21T03:42:14.064Z

[tool_use: Bash]

### User | 2026-06-21T03:42:18.763Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-21T03:42:21.198Z

Clean. Final confirmation run of both test files together:

### Assistant | 2026-06-21T03:42:22.703Z

[tool_use: Bash]

### User | 2026-06-21T03:42:28.855Z

[tool_result]  ✓ src/__tests__/aiReasoningDispatcher.uwire11.test.ts (25 tests) 88ms
       ✓ should have 424 actions defined 2ms
       ✓ should have schemas for all actions 4ms
       ✓ should validate ai_route_mill_pipeline params 1ms
       ✓ should validate ai_mill_agi_reason params 0ms
       ✓ should validate ai_mill_awareness_query params 0ms
       ✓ should reject invalid ISO group 0ms
       ✓ should 
... [+644 chars truncated]

### Assistant | 2026-06-21T03:42:31.975Z

[tool_use: Bash]

### User | 2026-06-21T03:42:38.448Z

[tool_result] ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 73 passed (74)

### Assistant | 2026-06-21T03:43:05.401Z

All criteria verified. Here is the complete report:

---

## Report

### Return shapes discovered (verified by reading engine source)

**`generateHyperMillTemplate(task)`** (`AIResourceLearningEngine.ts:915`) — returns a raw `string` directly (the Python script template). The dispatcher assigns it directly to `result`, so `r.data` is a `string`, NOT `{template, code}`.

**`route(query: NeuralQuery)`** (`NeuralIntegrationEngine.ts:179`) — takes `{ input: string, context?, domain?, urgency? }` (field is `input`, NOT `query`). Returns `NeuralRoute`: `{ engine, action, confidence, reasoning, alternatives[] }`.

**`synthesize(query: string)`** (`NeuralIntegrationEngine.ts`) — returns `NeuralSynthesis`: `{ query, sources, synthesis, confidence, suggestedCommands, relatedEngines, tribalWisdom }`.

**`recommendCommands(query: string)`** — returns `SkillRecommendation[]` where each item has `{ command, purpose, confidence, autoInvoke, reasoning }`. Wrapped by dispatcher as `{ recommendations, count }`. `command` starts with `/`.

**`summary(ranked)`** (`ActiveLearningStrategyEngine.ts:60`) — returns `{ total: number, totalInfoGain: number, topTopic: string | null }` directly. Dispatcher assigns it directly so `r.data` IS the summary object.

**`broadcast(insight)`** (`PeerLearningCoordinatorEngine.ts:55`) — takes flat `PeerInsight` fields at top level (NOT nested under `.insight`): `{ fromSession, summary, tags, confidence, id?, at?, detail?, sensitivity? }`. Returns `{ accepted: boolean, insightId?: string }` (field is `insightId` not `id`).

**`query(opts: QueryOptions)`** — takes flat `{ excludeSessionIds?, includeAnyTag?, minConfidence?, limit? }` (NOT nested under `.query`). `tag` is NOT a valid field; the correct field is `includeAnyTag: string[]`.

**`getEnhancementStrategy(area)`** — `ENHANCEMENT_STRATEGIES` keys are: `code_generation`, `knowledge_synthesis`, `reasoning_depth`, `context_retention`. `deepReasoning` does NOT exist; test uses `reasoning_depth`.

**`getR
... [+1918 chars truncated]
