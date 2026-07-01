---
type: "chat-session"
source: "claude-code-cli"
session_id: "b6c4b196-15eb-4d95-9474-abf1c8fbcb8c"
title: "**Plan-scrutiny arm E — dispatcher wiring + round-trip integration + action enum"
date: "2026-05-16"
first_ts: "2026-05-16T02:18:23.541Z"
last_ts: "2026-05-16T02:20:39.529Z"
cwd: "H:\\prism"
messages: 64
user_msgs: 28
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-adec533a097309e2a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# **Plan-scrutiny arm E — dispatcher wiring + round-trip integration + action enum

> **claude-code-cli** | 2026-05-16 | 64 msgs (28 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b6c4b196-15eb-4d95-9474-abf1c8fbcb8c/subagents/agent-adec533a097309e2a.jsonl`

## Transcript

### User | 2026-05-16T02:18:23.541Z

**Plan-scrutiny arm E — dispatcher wiring + round-trip integration + action enum + schema compliance.** Read `H:\.claude\plans\steady-kindling-tide.md` end-to-end first.

**Your scoped focus** (NOT architecture-composition, training-rigor, data-integrity, or risk-adversary — peer agents own those):

1. **Proposed dispatcher wirings**:
   - U3 wires `Node2VecGraphEmbedderEngine` → `intelligenceDispatcher.compute_node2vec`
   - U4 wires `GraphSAGELinkPredictorEngine` → `aiReasoningDispatcher.predict_link` + `aiReasoningDispatcher.train_link_predictor`
   - U3+U4 add schema entries in `intelligenceSchemas.ts` + `aiReasoningSchemas.ts`
   
   Read `H:/prism/mcp-server/src/tools/dispatchers/intelligenceDispatcher.ts` and `aiReasoningDispatcher.ts` to verify:
   - The dispatchers exist and have the expected action-enum pattern (`z.enum([...])`).
   - Action naming conventions (snake_case? `verb_noun` order?) match the existing actions in each dispatcher.
   - Does `intelligenceDispatcher` actually host graph-algorithm / structural-embedding actions today, or is `aiReasoningDispatcher` or `mlDispatcher` a better semantic fit? Check `DISPATCHER_DIGEST.md` at `H:/prism/mcp-server/data/docs/DISPATCHER_DIGEST.md`.

2. **"Wire to all sources" rule from CLAUDE.md §ENGINE WIRING.** When a new engine ships, plan should wire it to EVERY dispatcher that would naturally consume it. The plan wires Node2VecGraphEmbedderEngine to ONE dispatcher (intelligenceDispatcher). Is that complete, or should it also be exposed via `mlDispatcher`, `prism_calc`, or `prism_session.master_index_query`? Same question for GraphSAGELinkPredictorEngine. Per the WIRE-EXEMPT rule, what's the honest answer?

3. **Round-trip E2E assertion.** Per CLAUDE.md "every new engine ships with … a round-trip E2E assertion through every wired dispatcher (not only the singleton)." The plan's tests target the engine singletons. Are there explicit round-trip-through-dispatcher tests proposed? Flag if missing.

4. **Action-
... [+2259 chars truncated]

### Assistant | 2026-05-16T02:18:37.181Z

I'll systematically read the plan and then check all dispatcher wiring concerns.

### Assistant | 2026-05-16T02:18:37.643Z

[tool_use: Read]

### Assistant | 2026-05-16T02:18:38.061Z

[tool_use: Read]

### User | 2026-05-16T02:18:38.195Z

[tool_result] read-once-guard: 'H:\.claude\plans\steady-kindling-tide.md' was already read 2m ago in this session and is unchanged (mtime 1778897280548). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T02:18:38.963Z

[tool_result] 1	# PRISM Dispatcher Digest
2	
3	**97 dispatchers** route MCP actions to engines.
4	Each dispatcher handles a specific manufacturing/system domain.
5	Auto-generated: 2026-05-16 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
6	Total actions across all dispatchers: **10230**.
7	
8	## Dispatcher Map
9	
10	| Dispatcher | Domain | Actions |
11	|-----------|--------|-----
... [+10641 chars truncated]

### Assistant | 2026-05-16T02:18:43.196Z

Good. The plan content is in context (read-once guard confirms it was already loaded). Now let me read the actual dispatcher files.

### Assistant | 2026-05-16T02:18:44.507Z

[tool_use: Read]

### Assistant | 2026-05-16T02:18:44.916Z

[tool_use: Read]

### User | 2026-05-16T02:18:45.367Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Intelligence Dispatcher (Dispatcher #32)
3	 *
4	 * Core intelligence: ~50 actions for compound manufacturing intelligence.
5	 * 200+ actions deprecated — forwarded to focused sub-dispatchers (SYS-MS1):
6	 *   prism_product (40), prism_machine_live (40), prism_integration (42),
7	 *   prism_knowledge_ext (40), prism_diagnosis (38)
8	 *
9	 * @milestone SYS-MS1-U05
10	 *
... [+7323 chars truncated]

### User | 2026-05-16T02:18:45.768Z

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
... [+5652 chars truncated]

### Assistant | 2026-05-16T02:18:49.908Z

Let me read more of both dispatchers to understand their enum patterns and existing actions.

### Assistant | 2026-05-16T02:18:51.159Z

[tool_use: Read]

### Assistant | 2026-05-16T02:18:51.617Z

[tool_use: Read]

### User | 2026-05-16T02:18:52.013Z

[tool_result] 80	    case "xprocEpisodicMemory": return _xprocEpisodicMemory ??= (await import("../../engines/CrossProcessEpisodicMemoryEngine.js")).crossProcessEpisodicMemory;
81	    case "xprocPrioritizedReplay": return _xprocPrioritizedReplay ??= (await import("../../engines/CrossProcessPrioritizedReplayEngine.js")).crossProcessPrioritizedReplay;
82	    case "xprocReplaySampler": return _xprocReplaySampler ?
... [+10072 chars truncated]

### User | 2026-05-16T02:18:52.485Z

[tool_result] 80	  xproc_novelty_score: () => import("../../engines/CrossProcessNoveltyDetectorEngine.js").then(m => m.crossProcessNoveltyDetector),
81	  xproc_novelty_alert: () => import("../../engines/CrossProcessNoveltyDetectorEngine.js").then(m => m.crossProcessNoveltyDetector),
82	  xproc_curiosity_propose: () => import("../../engines/CrossProcessCuriosityDrivenExplorationEngine.js").then(m => m.crossProce
... [+15537 chars truncated]

### Assistant | 2026-05-16T02:18:55.749Z

Let me now find the z.enum patterns in both dispatchers and check for the action names, then scan for collisions and schema files in parallel.

### Assistant | 2026-05-16T02:18:57.039Z

[tool_use: Grep]

### User | 2026-05-16T02:18:57.619Z

[tool_result] 858:      action: z.enum(ALL_ACTIONS),

### Assistant | 2026-05-16T02:18:57.764Z

[tool_use: Grep]

### User | 2026-05-16T02:18:58.740Z

[tool_result] 36:// ALL_AI_ACTIONS is the wire-level tuple used by z.enum(...); ALL_AI_SCHEMAS
665:    action: z.enum(ALL_AI_ACTIONS).describe("AI reasoning action to execute"),

### Assistant | 2026-05-16T02:18:59.378Z

[tool_use: Grep]

### Assistant | 2026-05-16T02:18:59.470Z

[tool_use: Glob]

### User | 2026-05-16T02:18:59.791Z

[tool_result] mcp-server\src\schemas\grindingActionSchemas.ts
mcp-server\src\schemas\autoPilotActionSchemas.ts
mcp-server\src\schemas\guardActionSchemas.ts
mcp-server\src\schemas\validationActionSchemas.ts
mcp-server\src\schemas\telemetryActionSchemas.ts
mcp-server\src\schemas\documentActionSchemas.ts
mcp-server\src\schemas\pfpActionSchemas.ts
mcp-server\src\schemas\omegaActionSchemas.ts
mcp-server\src\schemas\
... [+5114 chars truncated]

### User | 2026-05-16T02:18:59.976Z

[tool_result] No matches found

### Assistant | 2026-05-16T02:19:02.931Z

[tool_use: Grep]

### User | 2026-05-16T02:19:03.572Z

[tool_result] 571:const ALL_ACTIONS = [
858:      action: z.enum(ALL_ACTIONS),

### Assistant | 2026-05-16T02:19:04.139Z

[tool_use: Grep]

### User | 2026-05-16T02:19:04.780Z

[tool_result] Found 1 file
mcp-server\src\schemas\intelligenceActionSchemas.ts

### Assistant | 2026-05-16T02:19:04.905Z

[tool_use: Grep]

### Assistant | 2026-05-16T02:19:05.145Z

[tool_use: Glob]

### User | 2026-05-16T02:19:05.455Z

[tool_result] mcp-server\src\schemas\mlActionSchemas.ts

### User | 2026-05-16T02:19:05.521Z

[tool_result] Found 2 files
mcp-server\src\schemas\aiCapabilityActionSchemas.ts
mcp-server\src\schemas\aiReasoningActionSchemas.ts

### Assistant | 2026-05-16T02:19:10.157Z

Now let me read the ALL_ACTIONS construction in intelligenceDispatcher and the schema files to understand the enum pattern, plus check mlDispatcher's enum pattern.

### Assistant | 2026-05-16T02:19:10.962Z

[tool_use: Read]

### User | 2026-05-16T02:19:11.770Z

[tool_result] 565	  "genplan_tools", "genplan_cycle", "genplan_cost", "genplan_risk", "genplan_get",
566	  "sustain_optimize", "sustain_compare", "sustain_energy", "sustain_carbon", "sustain_coolant",
567	  "sustain_nearnet", "sustain_report", "sustain_materials", "sustain_history", "sustain_get",
568	] as const;
569	
570	// Combined: core + all forwarded for z.enum (backward compatibility)
571	const ALL_ACTION
... [+2183 chars truncated]

### Assistant | 2026-05-16T02:19:11.820Z

[tool_use: Read]

### User | 2026-05-16T02:19:12.643Z

[tool_result] 1	/**
2	 * Intelligence Dispatcher Action Schemas
3	 * =======================================
4	 * Per-action Zod schemas for all 49 core prism_intelligence actions.
5	 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
6	 *
7	 * @module schemas/intelligenceActionSchemas
8	 * @version 1.0.0
9	 */
10	
11	import { z } from "zod";
12	import type { ActionSchemaMap } from "./actionSchemaType
... [+1070 chars truncated]

### Assistant | 2026-05-16T02:19:12.926Z

[tool_use: Grep]

### Assistant | 2026-05-16T02:19:13.173Z

[tool_use: Read]

### User | 2026-05-16T02:19:13.536Z

[tool_result] 26:import { ML_ACTIONS, ACTION_ML_SCHEMAS } from "../../schemas/mlActionSchemas.js";
176:    `ML training data pipeline. Actions: ${ML_ACTIONS.join(", ")}`,
178:      action: z.enum(ML_ACTIONS).describe("ML pipeline action"),

### User | 2026-05-16T02:19:13.941Z

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
... [+473 chars truncated]

### Assistant | 2026-05-16T02:19:16.438Z

Now let me read the rest of aiReasoningActionSchemas to see the full action list, check the mlActionSchemas pattern, and look at the dataActionSchemas central map.

### Assistant | 2026-05-16T02:19:17.294Z

[tool_use: Read]

### User | 2026-05-16T02:19:18.030Z

[tool_result] 30	  "sfc_fewshot_predict",
31	  "ppg_sfc_closed_loop",
32	  "iterate_retrieve",
33	  // ENGINE-WIRE-MS0/U-WIRE03: 5 leaf AI/deep-reasoning engines
34	  "ai_explain_decision",
35	  "ai_extract_classify",
36	  "ai_physics_optimize",
37	  "ai_knowledge_query",
38	  "ai_material_lookup",
39	  // ENGINE-WIRE-MS0/U-WIRE04: 5 deep-learning/deep-reasoning engines
40	  "ai_milling_deep_reason",
41	  "ai_w
... [+2730 chars truncated]

### Assistant | 2026-05-16T02:19:18.996Z

[tool_use: Grep]

### Assistant | 2026-05-16T02:19:19.184Z

[tool_use: Read]

### User | 2026-05-16T02:19:19.664Z

[tool_result] mcp-server\src\tools\dispatchers\dataDispatcher.ts:17:import { ACTION_DATA_SCHEMAS } from "../../schemas/dataActionSchemas.js";
mcp-server\src\tools\dispatchers\dataDispatcher.ts:225:      const validation = validateActionParams(action, params, ACTION_DATA_SCHEMAS);
mcp-server\src\tools\dispatchers\dataDispatcher.ts:2563:          //      `ACTION_DATA_SCHEMAS[action].safeParse(params)` BEFORE this
... [+137 chars truncated]

### User | 2026-05-16T02:19:19.998Z

[tool_result] 1	/**
2	 * ML Pipeline Action Schemas — U-LEARN-03 + U-LEARN-04 + U-LEARN-05
3	 * ===================================================================
4	 *
5	 * Zod schemas for prism_ml dispatcher actions covering:
6	 * - corpus_crawl: Scan and parse JM Die program archive
7	 * - corpus_stats: Quick file counts without parsing
8	 * - program_parse_min: Parse Okuma .MIN program
9	 * - program_parse_
... [+1073 chars truncated]

### Assistant | 2026-05-16T02:19:24.197Z

Now let me check the dataActionSchemas for the central map pattern, the aiCapabilityActionSchemas to understand the spread-enum issue, and look at the INTELLIGENCE_CORE_ACTIONS for graph-related existing actions.

### Assistant | 2026-05-16T02:19:25.943Z

[tool_use: Grep]

### User | 2026-05-16T02:19:26.514Z

[tool_result] 155:      : action.startsWith("graph_") ? (await import("../../engines/KnowledgeGraphEngine.js")).knowledgeGraph
552:  "graph_query", "graph_infer", "graph_discover", "graph_predict", "graph_traverse",
553:  "graph_add", "graph_search", "graph_stats", "graph_history", "graph_get",

### Assistant | 2026-05-16T02:19:29.356Z

[tool_use: Grep]

### Assistant | 2026-05-16T02:19:29.458Z

[tool_use: Read]

### Assistant | 2026-05-16T02:19:29.516Z

[tool_use: Read]

### User | 2026-05-16T02:19:30.110Z

[tool_result] 975:              graph_id: params.graph_id as string,
986:              graph_id: params.graph_id as string,
1000:            const stats = engine.getStats(params.graph_id as string);
1007:            const pending = engine.getPendingOutcomes(params.graph_id as string, params.node_id as string);

### User | 2026-05-16T02:19:30.564Z

[tool_result] 1	/**
2	 * Data Dispatcher Action Schemas
3	 * ===============================
4	 * Per-action Zod schemas for prism_data actions.
5	 * Minimal required-field validation for lower-traffic registry lookups.
6	 *
7	 * Design: Only enforce fields the dispatcher explicitly checks or the registry
8	 * method requires. Search/filter params are optional (registries handle defaults).
9	 *
10	 * @module sc
... [+796 chars truncated]

### User | 2026-05-16T02:19:30.653Z

[tool_result] 1	/**
2	 * AI Capability / Resource / Training Action Schemas — prism_ai dispatcher
3	 * =========================================================================
4	 * Zod schemas for U-AIMAX10 (AI-MAX-MS0). Wires 5 AI engines that previously
5	 * had only partial dispatcher coverage:
6	 *
7	 *   - AICapabilityMaximizerEngine   → 9 actions (ai_capability_*)
8	 *   - AIResourceLearningEngine      →
... [+987 chars truncated]

### Assistant | 2026-05-16T02:19:33.601Z

I have enough information now. Let me do the final collision check across all dispatchers and verify the INTELLIGENCE_CORE_ACTIONS list for context on naming conventions.

### Assistant | 2026-05-16T02:19:35.317Z

[tool_use: Grep]

### User | 2026-05-16T02:19:36.050Z

[tool_result] No matches found

### Assistant | 2026-05-16T02:19:36.125Z

[tool_use: Read]

### User | 2026-05-16T02:19:37.008Z

[tool_result] 170	// Exported for cross-dispatcher symmetry tests (U-XPROC-DISPATCHER-SYMMETRY-TEST):
171	// xproc_* actions in this list MUST stay in lock-step with prism_ai's
172	// AI_REASONING_ACTIONS per CLAUDE.md "wire to all consumers" rule.
173	export const INTELLIGENCE_CORE_ACTIONS = [
174	  // OBSIDIAN-AUTOMATE-MS3/U-DIGITAL-TWIN-EXPOSE: ProcessDigitalTwinEngine surface
175	  "digital_twin_compute",
1
... [+1427 chars truncated]

### Assistant | 2026-05-16T02:20:39.529Z

I now have all the information needed to deliver the full verdict. Here is the complete wiring review:

---

## Verdict: WIRING-FAIL

---

### P0 — Critical: `aiReasoningDispatcher` uses spread-array enum — new actions will be invisible to DISPATCHER_DIGEST parser

The existing regression documented in CLAUDE.md (2026-05-14) is directly load-bearing here. `aiReasoningDispatcher` constructs its wire-level enum as:

```
H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts line 39:
const ALL_AI_ACTIONS = [...AI_REASONING_ACTIONS, ...AI_CAPABILITY_ACTIONS] as const;
```

and then `z.enum(ALL_AI_ACTIONS)` at line 665. The DISPATCHER_DIGEST regen parser (`scripts/generate-dispatcher-wiki.mjs`) does NOT recognize spread-array enum literals — it already shows `aiReasoningDispatcher` at 426 actions (digest line 14) while the TS source has far more. Adding `predict_link` and `train_link_predictor` to `AI_REASONING_ACTIONS` will land them silently in the dispatcher but they will remain invisible to the digest, to `master_index_query` action-discovery, and to every downstream audit that reads the digest rather than grepping `.ts` files directly. The plan must acknowledge this parser gap and either (a) target the fix unit `U-HVA-DIGEST-PARSER-FIX` as a prerequisite, or (b) add an explicit note that these actions require direct-grep discovery until that fix ships.

---

### P0 — Critical: `intelligenceDispatcher` ALL_ACTIONS is also a spread-array composite

`H:/prism/mcp-server/src/tools/dispatchers/intelligenceDispatcher.ts` lines 571–574:

```
const ALL_ACTIONS = [
  ...INTELLIGENCE_CORE_ACTIONS, ...PRODUCT_FWD, ...MACHINE_LIVE_FWD,
  ...INTEGRATION_FWD, ...KNOWLEDGE_EXT_FWD, ...DIAGNOSIS_FWD,
] as const;
```

`z.enum(ALL_ACTIONS)` at line 858. Same parser-blind problem. `compute_node2vec` added to `INTELLIGENCE_CORE_ACTIONS` will not appear in the digest, making the action undiscoverable to any audit tooling that reads the digest. This is the same class of issue
... [+6821 chars truncated]
