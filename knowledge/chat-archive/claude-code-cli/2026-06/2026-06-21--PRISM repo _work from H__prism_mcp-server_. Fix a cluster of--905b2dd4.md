---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "PRISM repo (work from H:/prism/mcp-server). Fix a cluster of STALE failing tests"
date: "2026-06-21"
first_ts: "2026-06-21T02:04:06.318Z"
last_ts: "2026-06-21T02:11:25.345Z"
cwd: "H:\\prism"
messages: 191
user_msgs: 83
assistant_msgs: 108
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a079d7b48e476807a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# PRISM repo (work from H:/prism/mcp-server). Fix a cluster of STALE failing tests

> **claude-code-cli** | 2026-06-21 | 191 msgs (83 user / 108 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a079d7b48e476807a.jsonl`

## Transcript

### User | 2026-06-21T02:04:06.318Z

PRISM repo (work from H:/prism/mcp-server). Fix a cluster of STALE failing tests left by a clobber commit. This follows a PROVEN method from a prior unit — apply it faithfully; do NOT improvise a different approach.

## CONTEXT (verified, trust it)
Commit `c642606778` ("FEAT-TERMINAL-TITLE") mass-reverted the prism_ai dispatcher, dropping ~34 `ai_*` reasoning action names. Later milestones RE-WIRED the same engines under CANONICAL names (examples confirmed: `ai_belief_*`→`belief_set`/`belief_update`/`belief_query`; `ai_pac_sample_complexity`/`ai_vc_bound`/`ai_rademacher_bound`/`ai_pac_bayes_bound`→`bounds_pac_complexity`/`bounds_vc`/`bounds_rademacher`/`bounds_pac_bayes`; `ai_explain`→`reasoning_explain`). So the ENGINES are LIVE — only the OLD `ai_*` action NAMES are dead. Several test files still call the dead `ai_*` names → currently RED.

## THE CLUSTER (≈6 files / ≈74 failing tests)
Identify ALL of them: `cd H:/prism/mcp-server && npx vitest run src/__tests__/aiReasoningDispatcher 2>&1 | grep -iE "FAIL|failed"`. Known members: `aiReasoningDispatcher.uwire11.test.ts`, `aiReasoningDispatcher.uaimax10.test.ts`. Dead actions seen in uwire11: `ai_active_learning_rank`, `ai_capability_metrics`, `ai_deep_knowledge_query`, `ai_neural_route`, `ai_peer_learning`, `ai_resource_recommend`, `ai_system_sync` (note: `ai_intelligence_maximize` IS still live — verify each).

## METHOD (per dead `ai_*` action — apply exactly)
1. Read the failing test to see WHICH engine + method + expected output shape it exercises.
2. Find the CANONICAL replacement: `grep -n` the dispatcher (`src/tools/dispatchers/aiReasoningDispatcher.ts`) for the engine singleton / method the test targets, and inspect `AI_REASONING_ACTIONS` in `src/schemas/aiReasoningActionSchemas.ts`. The canonical action calls the SAME engine method under a new name.
3. RETARGET the test's action string (and params/assertions) to the canonical name + its real return shape. Keep all reference values + rejection assertions; o
... [+1843 chars truncated]

### Assistant | 2026-06-21T02:04:10.890Z

I'll start by reading CLAUDE.md, then systematically identify and fix the failing tests.

### Assistant | 2026-06-21T02:04:11.215Z

[tool_use: Read]

### User | 2026-06-21T02:04:12.016Z

[tool_result] 1	# PRISM — Manufacturing Intelligence Platform
2	
3	## EXPERT ROLE (ALWAYS ACTIVE)
4	<!-- DUPLICATE-CANDIDATE 2026-05-17 OBSOLESCENCE-CLEANUP-MS0/U-OBS-C2: parallel section in C:/Users/wompu/.claude/CLAUDE.md §EXPERT ROLE. Proposed canonical owner: GLOBAL. Collapse this body to pointer after 2026-05-24. Advisory: state/shared/specs/CLAUDE-MD-DUPLICATION-CANDIDATES-2026-05-17.md -->
5	You are the 
... [+9931 chars truncated]

### Assistant | 2026-06-21T02:04:14.850Z

Good, I have the CLAUDE.md context. Now let me identify the failing tests and read the key source files in parallel.

### Assistant | 2026-06-21T02:04:16.370Z

[tool_use: Bash]

### Assistant | 2026-06-21T02:04:16.898Z

[tool_use: Bash]

### User | 2026-06-21T02:04:24.781Z

[tool_result] [ERROR] [prism_ai] tpe_tell failed: expected trial_id=0, got 5
[ERROR] [prism_ai] xfer_create_task failed: Domain not found: XF-ONLY-SRC or XF-DOES-NOT-EXIST
[ERROR] [prism_ai] xfer_adapt failed: Task not found: NO-SUCH-TASK
[ERROR] [prism_ai] tpe_tell failed: alpha must be rank or 2·rank
[ERROR] [prism_ai] tpe_load_snapshot failed: unsupported schemaVersion 2
 ❯ src/__tests__/aiReasoningDispatche
... [+7869 chars truncated]

### User | 2026-06-21T02:04:28.440Z

[tool_result] AIReasoningDispatcher.graphContextLens-wire.test.ts
AIReasoningDispatcher.graphrag-wire.test.ts
AIReasoningDispatcher.tier10-wire.test.ts
LatheAIReasoningEngine.test.ts
aiReasoning.autoResearchDispatch.test.ts
aiReasoning.noveltyDetect.test.ts
aiReasoning.roadmapAutoAppend.test.ts
aiReasoning.sourcePoisoningSanitize.test.ts
aiReasoning.synergyClassify.test.ts
aiReasoning.twoPass.test.ts
aiReasonin
... [+1247 chars truncated]

### Assistant | 2026-06-21T02:04:31.413Z

Good. Now let me get the full failure list and read the key source files in parallel.

### Assistant | 2026-06-21T02:04:32.688Z

[tool_use: Bash]

### Assistant | 2026-06-21T02:04:33.450Z

[tool_use: Read]

### Assistant | 2026-06-21T02:04:33.632Z

[tool_use: Read]

### User | 2026-06-21T02:04:41.670Z

[tool_result]  FAIL  src/__tests__/AIReasoningDispatcher.tier10-wire.test.ts > prism_ai — XPROC-NEURAL fleet (Tiers 2-9, 11-12, U-XPROC-T2-T12) > T2 xproc_episodic_stats returns structured stats with hot/warm/cold tier counts
 FAIL  src/__tests__/AIReasoningDispatcher.tier10-wire.test.ts > prism_ai — XPROC-NEURAL fleet (Tiers 2-9, 11-12, U-XPROC-T2-T12) > T3 xproc_drift_constants → MIN_SAMPLES_FOR_DETECTION=30 
... [+13386 chars truncated]

### User | 2026-06-21T02:04:42.715Z

[tool_result] 1	/**
2	 * aiReasoningDispatcher.devProcess.test.ts — dev-process reasoning + learning
3	 * orphans, wired through prism_ai (U-WIRE07).
4	 *
5	 * Covers 8 actions across 3 engines:
6	 *   - CausalReasoningEngine        → ai_causal_add_edge / trace_impact / root_causes
7	 *   - ExceptionLearningEngine      → ai_exception_handle / record_outcome / stats
8	 *   - MetaLearningOptimizerEngine  → ai_met
... [+17390 chars truncated]

### User | 2026-06-21T02:04:42.757Z

[tool_result] 1	/**
2	 * U-WIRE11 — prism_ai dispatcher smoke tests
3	 * Verifies 8 newly-wired AI/ML deep-learning + capability orchestration actions
4	 * route to their engines, return real values, and validate parameters.
5	 *
6	 * @milestone WIRE-MS0/U-WIRE11
7	 */
8	
9	import { describe, expect, it } from "vitest";
10	import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";
... [+14291 chars truncated]

### Assistant | 2026-06-21T02:04:45.813Z

Now let me read the dispatcher and schema files to understand canonical action names:

### Assistant | 2026-06-21T02:04:47.729Z

[tool_use: Bash]

### Assistant | 2026-06-21T02:04:48.882Z

[tool_use: Bash]

### Assistant | 2026-06-21T02:04:49.859Z

[tool_use: Bash]

### User | 2026-06-21T02:04:51.334Z

[tool_result] 625:  xproc_causal_learn_dag: () => import("../../engines/CrossProcessCausalGraphLearnerEngine.js").then(m => m.crossProcessCausalGraphLearner),
626:  xproc_causal_test_independence: () => import("../../engines/CrossProcessCausalGraphLearnerEngine.js").then(m => m.crossProcessCausalGraphLearner),
627:  xproc_causal_export_graph: () => import("../../engines/CrossProcessCausalGraphLearnerEngine.js")
... [+2354 chars truncated]

### User | 2026-06-21T02:04:52.761Z

[tool_result] 102:  "causal_analyze",       // P5-U02 → CausalReasoningEngine.{addEdges,traceImpact,rootCauses}
119:  // ENGINE-WIRE-MS0/U-WIRE25: MetaLearningOptimizerEngine — learn-to-learn
138:  // AI-WIRE-MS0/U-AIW09: 3 learning engines (MetaLearningOptimizer already wired via meta_learning_*)
164:  // ENGINE-WIRE-MS0/U-WIRE31: ExceptionLearningEngine — turn exceptions into knowledge
165:  "exception_handle
... [+1550 chars truncated]

### User | 2026-06-21T02:04:53.929Z

[tool_result] 316:  // Unit 5 -- TemporalReasoningEngine (in-memory timeline ledger; deterministic OLS linear-regression).
320:  "temporal_snapshots",
321:  "temporal_project",
322:  "temporal_forecast",
350:  temporal_snapshots: z.record(z.string(), z.unknown()),
351:  temporal_project: z.record(z.string(), z.unknown()),
352:  temporal_forecast: z.record(z.string(), z.unknown()),
3105:      case "cognitive_bud
... [+1093 chars truncated]

### Assistant | 2026-06-21T02:04:58.496Z

Now I can see the pattern. The `devProcess.test.ts` uses `ai_causal_add_edge`, `ai_causal_trace_impact`, `ai_causal_root_causes` but canonical names are `causal_analyze` (for a different CausalReasoningEngine path). Let me check what canonical causal actions exist and what the temporal/cognitive tests use:

### Assistant | 2026-06-21T02:04:59.630Z

[tool_use: Read]

### User | 2026-06-21T02:05:00.444Z

[tool_result] 1	/**
2	 * aiReasoningDispatcher.temporalCognitive.test.ts — temporal projection +
3	 * cognitive budget allocation, wired through prism_ai (U-WIRE09).
4	 *
5	 * Covers 5 actions across 2 engines:
6	 *   - TemporalReasoningEngine
7	 *       ai_temporal_record / ai_temporal_project / ai_temporal_forecast
8	 *   - CognitiveBudgetAllocatorEngine
9	 *       ai_cognitive_allocate / ai_cognitive_classif
... [+13555 chars truncated]

### Assistant | 2026-06-21T02:05:00.778Z

[tool_use: Bash]

### Assistant | 2026-06-21T02:05:01.765Z

[tool_use: Bash]

### User | 2026-06-21T02:05:05.372Z

[tool_result] (Bash completed with no output)

### User | 2026-06-21T02:05:06.196Z

[tool_result] 7: *       ai_temporal_record / ai_temporal_project / ai_temporal_forecast
9: *       ai_cognitive_allocate / ai_cognitive_classify
43:describe("aiReasoningDispatcher — ai_temporal_* (TemporalReasoningEngine)", () => {
61:        invoke("ai_temporal_record", {
68:    const out = await invoke("ai_temporal_project", {
92:      dates.map((at) => invoke("ai_temporal_record", { series: "U09_flat", valu
... [+1761 chars truncated]

### Assistant | 2026-06-21T02:05:10.745Z

Now I understand the problem clearly. The tests use `ai_temporal_record`, `ai_temporal_project`, `ai_temporal_forecast`, `ai_cognitive_allocate`, `ai_cognitive_classify`, `ai_causal_add_edge`, `ai_causal_trace_impact`, `ai_causal_root_causes`, etc. — but canonical names are `temporal_record`, `temporal_project`, `temporal_forecast`, `cognitive_budget_allocate`, `exception_handle`, etc. Let me check what's canonical for each:

### Assistant | 2026-06-21T02:05:12.518Z

[tool_use: Bash]

### Assistant | 2026-06-21T02:05:13.280Z

[tool_use: Bash]

### Assistant | 2026-06-21T02:05:13.929Z

[tool_use: Bash]

### User | 2026-06-21T02:05:17.375Z

[tool_result] 484:  "cognitive_budget_allocate",      // CognitiveBudgetAllocatorEngine.allocate
2292:  cognitive_budget_allocate: z.object({

### User | 2026-06-21T02:05:18.368Z

[tool_result] (Bash completed with no output)

### User | 2026-06-21T02:05:19.016Z

[tool_result] 484:  "cognitive_budget_allocate",      // CognitiveBudgetAllocatorEngine.allocate
2292:  cognitive_budget_allocate: z.object({

### Assistant | 2026-06-21T02:05:21.652Z

[tool_use: Bash]

### Assistant | 2026-06-21T02:05:22.396Z

[tool_use: Bash]

### User | 2026-06-21T02:05:26.761Z

[tool_result] (Bash completed with no output)

### system

... [111 middle messages omitted -- see raw_file] ...

### User | 2026-06-21T02:09:28.175Z

[tool_result] 1186	async function routeXprocAction(action: string, params: Record<string, unknown>): Promise<unknown> {
1187	  // Tier 1: per-action handler (singleton-based engines, no uniform wrapper).
1188	  const tier1 = XPROC_TIER1_HANDLERS[action];
1189	  if (tier1) return tier1(params);
1190	
1191	  // Tier 2-12: uniform wrapper-function engines, lazy-loaded + cached.
1192	  let wrapper = _xprocCache.get
... [+3342 chars truncated]

### Assistant | 2026-06-21T02:09:33.278Z

The `routeXprocAction` calls the engine's wrapper function `wrapper(action, params)`. The engine's wrapper function returns the result. The failing tests assert fields that must exist in the result. The issue is: the wrapper returns `{ success: true, data: ... }` but the test casts `r.data` expecting the constants directly — meaning the engine wraps inside a `data` field but the test looks for fields at `r.data.FIELD`, while the engine might return `{ FIELD: value }` directly inside `data`. Let me check the actual engine constants method return shape:

### Assistant | 2026-06-21T02:09:36.481Z

[tool_use: Bash]

### User | 2026-06-21T02:09:43.019Z

[tool_result] src/engines/CrossProcessOnlineMLPUpdaterEngine.ts:299:  static constants(): {
src/engines/CrossProcessOnlineMLPUpdaterEngine.ts:330:    case "xproc_online_constants":
src/engines/CrossProcessOnlineMLPUpdaterEngine.ts:331:      return CrossProcessOnlineMLPUpdaterEngine.constants();
src/engines/CrossProcessDriftDetectorEngine.ts:403:  static constants(): {
src/engines/CrossProcessDriftDetectorEngine
... [+534 chars truncated]

### Assistant | 2026-06-21T02:09:45.677Z

[tool_use: Bash]

### User | 2026-06-21T02:09:48.712Z

[tool_result]       return CrossProcessEpisodicMemoryEngine.store(params);
    case "xproc_episodic_recall":
      return CrossProcessEpisodicMemoryEngine.recall(params);
    case "xproc_episodic_stats":
      return CrossProcessEpisodicMemoryEngine.stats();
    default:
      throw new Error(`crossProcessEpisodicMemory: unknown action '${action}'`);
  }
}

### Assistant | 2026-06-21T02:09:52.965Z

[tool_use: Bash]

### Assistant | 2026-06-21T02:09:53.439Z

[tool_use: Bash]

### User | 2026-06-21T02:09:57.199Z

[tool_result] 420:  static stats(): MemoryStats {

### User | 2026-06-21T02:09:58.238Z

[tool_result] src/engines/CrossProcessSymbolicConstraintEnforcerEngine.ts:290:    case "xproc_symbolic_violations":

### Assistant | 2026-06-21T02:10:00.739Z

[tool_use: Bash]

### Assistant | 2026-06-21T02:10:01.113Z

[tool_use: Bash]

### User | 2026-06-21T02:10:04.476Z

[tool_result]    * its sumtree and by drift detectors to know how much history is available.
   */
  static stats(): MemoryStats {
    let oldestTs: number | null = null;
    let newestTs: number | null = null;
    const all = [...state.hot, ...state.warm, ...state.cold];
    for (const ep of all) {
      if (oldestTs === null || ep.ts < oldestTs) oldestTs = ep.ts;
      if (newestTs === null || ep.ts > newestT
... [+617 chars truncated]

### User | 2026-06-21T02:10:05.895Z

[tool_result]   params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_symbolic_project":
      return CrossProcessSymbolicConstraintEnforcerEngine.project(params as ProjectionInput);
    case "xproc_symbolic_violations":
      return { violations: CrossProcessSymbolicConstraintEnforcerEngine.violations(params as ProjectionInput) };
    default:
      throw new Error(`crossProcessSymb
... [+49 chars truncated]

### Assistant | 2026-06-21T02:10:11.602Z

Now I understand all 5 tier10 failures. The engines return the right data but the dispatcher wraps via `routeXprocAction` which calls `wrapper(action, params)` and then the outer `executeAIReasoningAction` puts it in `result`. The issue is that `executeAIReasoningAction` wraps the result in `{ success: true, data: result }`, but the xproc fallthrough path does `result = await routeXprocAction(action, params)` and if it returns `{ hot: N, warm: N, ... }` that becomes `r.data = { hot: N, ... }` — which IS what the test expects.

Let me check how the xproc fallthrough applies the result wrapper vs. the `success: true` wrapping:

### Assistant | 2026-06-21T02:10:12.235Z

[tool_use: Read]

### User | 2026-06-21T02:10:13.078Z

[tool_result] 3040	      case "xproc_attention_baseline_get":
3041	      case "xproc_attention_baseline_reset":
3042	      case "xproc_agi_compose":
3043	      case "xproc_physics_features":
3044	      case "xproc_physics_features_batch":
3045	      case "xproc_rag_features":
3046	      case "xproc_rag_clear_cache":
3047	      case "xproc_feedbackbus_publish":
3048	      case "xproc_feedbackbus_stats":
3049	   
... [+1752 chars truncated]

### Assistant | 2026-06-21T02:10:16.159Z

[tool_use: Bash]

### User | 2026-06-21T02:10:19.922Z

[tool_result] 4470:        result = { success: true, data: (errorExplainerEngine as any).explain?.(params as any) ?? { engine: "ErrorExplainerEngine", note: "method not callable" } };
4475:        result = { success: true, data: { categories: (errorExplainerEngine as any).categories?.() ?? [] } };
4480:        result = { success: true, data: await (consensusAIBridgeEngine as any).reason?.(params as any) ?? { en
... [+2881 chars truncated]

### Assistant | 2026-06-21T02:10:22.801Z

[tool_use: Read]

### User | 2026-06-21T02:10:23.692Z

[tool_result] 5140	      }
5141	    }
5142	
5143	    const duration = Date.now() - startTime;
5144	    log.info(`[prism_ai] ${action} completed in ${duration}ms`);
5145	
5146	    // Slim response
5147	    const slimmed = slimResponse(result);
5148	
5149	    return { success: true, data: slimmed };
5150	  } catch (error: unknown) {
5151	    const message = error instanceof Error ? error.message : String(error);

... [+755 chars truncated]

### Assistant | 2026-06-21T02:10:29.507Z

Now I understand the full picture. All results go through `slimResponse(result)` then `{ success: true, data: slimmed }`. So `r.data` IS the engine return value after slimming. The 5 tier10 tests expect `r.data.DEFAULT_BETA_1`, `r.data.MIN_SAMPLES_FOR_DETECTION`, `r.data.DEFAULT_LAMBDA`, `r.data.hot/warm/cold/total`, and `r.success === false` for `xproc_symbolic_violations`.

The engines return the right shapes. The issue is `slimResponse` stripping keys. Let me check:

### Assistant | 2026-06-21T02:10:30.285Z

[tool_use: Bash]

### User | 2026-06-21T02:10:36.596Z

[tool_result] 20:import { slimResponse } from "../../utils/responseSlimmer.js";
4254:          // Named-field convention (this dispatcher wraps to { success, data: slimResponse(result) },
4559:        // { success:true, data: slimResponse(result) }, so callers read r.data.* directly.
5147:    const slimmed = slimResponse(result);

### Assistant | 2026-06-21T02:10:39.790Z

[tool_use: Bash]

### User | 2026-06-21T02:10:43.384Z

[tool_result] 8: * Slim a response object by removing null/undefined values and empty arrays.
18:export function slimResponse<T>(response: T, maxDepth: number | SlimLevel = 32, depth = 0): T {
19:  if (response === null || response === undefined) {
42:    if (value === null || value === undefined) continue;
50:// Prior context-pressure plumbing was removed; callers expect a numeric

### Assistant | 2026-06-21T02:10:46.717Z

`slimResponse` strips nulls/undefined/empty arrays. That's fine — `hot`, `warm`, `cold` are integers and would survive. Let me actually run one of the failing tests with debug output to see what's actually in `r.data`:

### Assistant | 2026-06-21T02:10:47.991Z

[tool_use: Bash]

### User | 2026-06-21T02:10:53.073Z

[tool_result] Exit code 1
node:internal/modules/esm/resolve:275
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.js' imported from H:\prism\mcp-server\[eval1]
    at finalizeResolution (node:internal/modules/esm/resolve:275:11)
    at moduleResolve (node:internal/modules/esm/resolve:932:10)
 
... [+667 chars truncated]

### Assistant | 2026-06-21T02:10:58.085Z

I need to build first or use vitest. Let me check what's happening by reading the big fallthrough: the xproc actions at line 2749 (`xproc_episodic_stats` etc.) are listed in a massive case fallthrough that eventually hits `case "xproc_feedbackbus_reset":` at line 3051 where `result = await routeXprocAction(action, params)`. Let me verify `xproc_episodic_stats` is actually in that fallthrough:

### Assistant | 2026-06-21T02:10:58.820Z

[tool_use: Read]

### User | 2026-06-21T02:10:59.647Z

[tool_result] 2714	      // All xproc_* actions flow through the unified routeXprocAction helper above.
2715	      // CORE_ROUTING table mirrors intelligenceDispatcher.ts so both surfaces stay in lock-step.
2716	      // Engines validate their own params via internal Zod schemas; the wrapper functions
2717	      // dispatch by action name with no extra normalization.
2718	      // ──────────────────────────────
... [+1499 chars truncated]

### Assistant | 2026-06-21T02:11:11.583Z

Good — `xproc_episodic_stats` IS in the fallthrough to `routeXprocAction`. The engine returns `{ hot, warm, cold, total, oldestTs, newestTs, totalEverStored, coldSampledFromTotal }`. `slimResponse` strips nulls but these are numbers so they'd survive.

Wait — the test says `expected 'undefined' to be 'number'` for `d.hot`. That means `r.data.hot` is undefined. So `r.data` is NOT the stats object. Either `routeXprocAction` returns a different shape, or the slimResponse strips it differently. Let me check: the `crossProcessEpisodicMemory` wrapper dispatch returns `CrossProcessEpisodicMemoryEngine.stats()` = `{ hot, warm, cold, total, oldestTs, newestTs, ... }`. That becomes `result`, then `slimResponse(result)` = same object, then `data = slimmed`. So `r.data.hot` should exist.

Unless — `slimResponse` wraps arrays but for top-level objects strips `null` values like `oldestTs: null`... but `hot` is 0 (a number). Does `slimResponse` strip `0`?

### Assistant | 2026-06-21T02:11:11.740Z

[tool_use: Read]

### User | 2026-06-21T02:11:12.600Z

[tool_result] 1	/**
2	 * Response Slimmer Utility
3	 * Reduces verbose response objects for MCP transport efficiency.
4	 * @module utils/responseSlimmer
5	 */
6	
7	/**
8	 * Slim a response object by removing null/undefined values and empty arrays.
9	 *
10	 * @param response - the value to slim
11	 * @param maxDepth - recursion ceiling (default 32). A circular reference or a
12	 *   pathologically deep payload w
... [+2516 chars truncated]

### Assistant | 2026-06-21T02:11:17.417Z

`slimResponse` strips `null` and empty arrays but NOT `0`. So `hot: 0` survives. The failure for `xproc_episodic_stats` showing `undefined` for `d.hot` means `r.data` itself doesn't have those fields. 

The most likely cause: `routeXprocAction` is NOT reaching the engine — instead it's hitting the `XPROC_TIER1_HANDLERS` table first. Let me check what `XPROC_TIER1_HANDLERS` has for these actions:

### Assistant | 2026-06-21T02:11:18.821Z

[tool_use: Bash]

### User | 2026-06-21T02:11:22.312Z

[tool_result] 892:const XPROC_TIER1_HANDLERS: Record<string, XprocTier1Handler> = {
1188:  const tier1 = XPROC_TIER1_HANDLERS[action];

### Assistant | 2026-06-21T02:11:24.505Z

[tool_use: Read]

### User | 2026-06-21T02:11:25.345Z

[tool_result] 892	const XPROC_TIER1_HANDLERS: Record<string, XprocTier1Handler> = {
893	  // T1-01 OutcomeStore
894	  xproc_outcome_record: async (params) => {
895	    const { ensureXprocLedgerDurable } = await import("../../engines/XprocOutcomeLedgerDurability.js");
896	    await ensureXprocLedgerDurable();
897	    const { crossProcessOutcomeStore } = await import("../../engines/CrossProcessOutcomeStore.js");

... [+2880 chars truncated]
