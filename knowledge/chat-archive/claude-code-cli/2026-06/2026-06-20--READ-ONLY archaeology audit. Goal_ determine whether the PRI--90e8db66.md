---
type: "chat-session"
source: "claude-code-cli"
session_id: "90e8db66-2b71-4e38-af9e-8576aa89fc41"
title: "READ-ONLY archaeology audit. Goal: determine whether the PRISM \"parallelAPICalls"
date: "2026-06-20"
first_ts: "2026-06-20T13:07:52.607Z"
last_ts: "2026-06-20T13:14:31.573Z"
cwd: "H:\\prism"
messages: 73
user_msgs: 31
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/90e8db66-2b71-4e38-af9e-8576aa89fc41/subagents/agent-a71bcd277fb288633.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# READ-ONLY archaeology audit. Goal: determine whether the PRISM "parallelAPICalls

> **claude-code-cli** | 2026-06-20 | 73 msgs (31 user / 42 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/90e8db66-2b71-4e38-af9e-8576aa89fc41/subagents/agent-a71bcd277fb288633.jsonl`

## Transcript

### User | 2026-06-20T13:07:52.607Z

READ-ONLY archaeology audit. Goal: determine whether the PRISM "parallelAPICalls reasoning subsystem" is INTENDED-TO-BE-LIVE, DORMANT-BUT-INTENDED, or DEPRECATED/DEAD — so the operator can decide whether to invest in activating it (wiring dispatcher executors + relaxing hasValidApiKey gates). Do NOT edit anything. Cite file:line + git evidence for every claim.

BACKGROUND: `parallelAPICalls` in `mcp-server/src/config/api-config.ts` was just migrated from a paid Anthropic call to the free Ollama-first `llmEngine.query` substrate. Its 5 consumers all gate on `hasValidApiKey()` before calling it (so in a no-Claude-key deployment they short-circuit), and at least `InferenceChainEngine.runInferenceChain` is dispatcher-UNWIRED (no live executor calls it). The question: is this subsystem a real feature worth activating, or abandoned/half-built?

THE 5 CONSUMERS (audit EACH):
1. `mcp-server/src/engines/InferenceChainEngine.ts` (runInferenceChain + analyzeAndRecommend + deepDiagnose)
2. `mcp-server/src/orchestration/AutoPilot.ts`
3. `mcp-server/src/orchestration/AutoPilotV2.ts`
4. `mcp-server/src/tools/dispatchers/autonomousDispatcher.ts`
5. `mcp-server/src/tools/dispatchers/spDispatcher.ts`

FOR EACH consumer, gather + report:
A. REACHABILITY — is it exposed via a LIVE MCP dispatcher action? Trace: is the dispatcher registered in the MCP server tool list (grep mcp-server/src/index.ts or the server/registry that registers `prism_*` tools)? Does a registered action's EXECUTOR actually call this code (not just a formatter/list entry)? For the engines (InferenceChain/AutoPilot/V2), is there ANY live caller chain from a registered dispatcher action? Distinguish "registered + executes" vs "registered but stub/formatter" vs "not registered at all".
B. DEPRECATION / MATURITY MARKERS — grep each file (+ its dir) for: @deprecated, "experimental", "half-built", "not wired", "TODO", "FIXME", "stub", "WIP", "do not use", "legacy", "v2" (does AutoPilotV2 supersede AutoPilot? is one dead?
... [+1101 chars truncated]

### Assistant | 2026-06-20T13:07:57.230Z

I'll start broad with the digest files and then trace each consumer systematically.

### Assistant | 2026-06-20T13:07:57.992Z

[tool_use: Read]

### Assistant | 2026-06-20T13:07:58.308Z

[tool_use: Read]

### User | 2026-06-20T13:07:58.480Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-06-20T13:07:59.008Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### Assistant | 2026-06-20T13:08:01.611Z

Using correct H: paths. Let me read the digest files with limits and simultaneously start reading the consumer files.

### Assistant | 2026-06-20T13:08:02.319Z

[tool_use: Read]

### Assistant | 2026-06-20T13:08:02.650Z

[tool_use: Read]

### Assistant | 2026-06-20T13:08:02.927Z

[tool_use: Read]

### User | 2026-06-20T13:08:03.344Z

[tool_result] 1	# ENGINE DIGEST
2	## 3841 engines indexed
3	## Auto-generated: 2026-06-20
4	
5	- **A2AProtocolEngine**: Pure-core conformance wrapper that lets PSN slots expose themselves as
6	- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
7	- **AbsorptionChillerEngine**: Absorption refrigeration cycle analysis
8	- **AbstractionHierarchyEngine**: Multi-level tip→principle→law gener
... [+1746 chars truncated]

### User | 2026-06-20T13:08:04.131Z

[tool_result] 1	/**
2	 * PRISM MCP Server - API Configuration
3	 * Loads API keys and provides Anthropic SDK client
4	 * 
5	 * FIXED: getAnthropicClient() now returns actual Anthropic SDK instance
6	 * with proper TypeScript types (was previously typed as plain object)
7	 */
8	
9	import { config } from 'dotenv';
10	import { join } from 'path';
11	import Anthropic from "@anthropic-ai/sdk";
12	import { PATHS } fr
... [+8027 chars truncated]

### User | 2026-06-20T13:08:04.139Z

[tool_result] 1	# PRISM Dispatcher Digest
2	
3	**111 dispatchers** route MCP actions to engines.
4	Each dispatcher handles a specific manufacturing/system domain.
5	Auto-generated: 2026-06-20 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
6	Total actions across all dispatchers: **14229**.
7	
8	## Dispatcher Map
9	
10	| Dispatcher | Domain | Actions |
11	|-----------|--------|----
... [+7146 chars truncated]

### Assistant | 2026-06-20T13:08:07.082Z

Now let me read all 5 consumer files in parallel.

### Assistant | 2026-06-20T13:08:07.846Z

[tool_use: Read]

### Assistant | 2026-06-20T13:08:08.249Z

[tool_use: Read]

### Assistant | 2026-06-20T13:08:08.408Z

[tool_use: Read]

### User | 2026-06-20T13:08:09.161Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Inference Chain Engine (R3-MS4.5-T2)
3	 *
4	 * Server-side multi-step reasoning engine that reduces client context consumption
5	 * by chaining multiple reasoning steps internally. Each chain runs 2-3 API calls,
6	 * feeds each step's output as context to the next, and returns a summarized result.
7	 *
8	 * Architecture:
9	 *   action receives query → engine calls API
... [+42426 chars truncated]

### User | 2026-06-20T13:08:10.405Z

[tool_result] 1	/**
2	 * PRISM AutoPilot v3.0 - Unified Real API Orchestration
3	 * 
4	 * MERGED from v1 (real API) + v2 (registry-aware task classification)
5	 * 
6	 * ALL PHASES USE REAL PARALLEL API CALLS:
7	 * 1. GSD → Load instructions
8	 * 2. STATE → Load current state + task
9	 * 3. BRAINSTORM → 7 lenses via PARALLEL API calls (not canned strings)
10	 * 4. EXECUTE → Real swarm deployment with live API
11
... [+35030 chars truncated]

### User | 2026-06-20T13:08:10.555Z

[tool_result] 1	/**
2	 * PRISM AutoPilot v2.0 - Registry-Aware Task Execution (REAL API)
3	 * 
4	 * FIXED: Execution phase now uses REAL parallelAPICalls() 
5	 * instead of simulated results. Each plan phase gets an API call.
6	 * 
7	 * Flow: Classify → Plan → REAL Execute → REAL Validate → Metrics
8	 */
9	
10	import * as fs from "fs";
11	import * as path from "path";
12	import { PATHS } from "../constants.js";
... [+17686 chars truncated]

### Assistant | 2026-06-20T13:08:15.832Z

Now read the two dispatchers in parallel, plus check tests and the MCP server index.

### Assistant | 2026-06-20T13:08:16.215Z

[tool_use: Read]

### Assistant | 2026-06-20T13:08:16.630Z

[tool_use: Read]

### Assistant | 2026-06-20T13:08:17.120Z

[tool_use: Read]

### User | 2026-06-20T13:08:18.849Z

[tool_result] 1	/**
2	 * Autonomous Dispatcher - Dispatcher #24
3	 * Bridges ATCS state machine + AgentExecutor for autonomous execution
4	 * 
5	 * Tool: prism_autonomous
6	 * Actions: auto_configure, auto_plan, auto_execute, auto_status,
7	 *          auto_validate, auto_dry_run, auto_pause, auto_resume
8	 * 
9	 * Architecture:
10	 *   ATCS provides: state machine, manifests, work queues, checkpoints
11	 *   A
... [+58487 chars truncated]

### User | 2026-06-20T13:08:18.955Z

[tool_result] 1	/**
2	 * SP Dispatcher - Consolidates developmentProtocolTools (19 tools → 1)
3	 * Tool: prism_sp
4	 * Actions: brainstorm, plan, execute, review_spec, review_quality, debug,
5	 *          cognitive_init, cognitive_check, cognitive_bayes, cognitive_rl,
6	 *          combination_ilp, context_kv_optimize, context_attention_anchor, context_error_preserve,
7	 *          session_start_full, session_e
... [+35246 chars truncated]

### User | 2026-06-20T13:08:19.491Z

[tool_result] 1	/**
2	 * AutoPilot Dispatcher - Consolidates 7 autopilot tools → 1
3	 * Actions: autopilot, autopilot_quick, brainstorm_lenses, formula_optimize,
4	 *          autopilot_v2, registry_status, working_tools
5	 */
6	import { z } from "zod";
7	import { log } from "../../utils/Logger.js";
8	import { slimResponse } from "../../utils/responseSlimmer.js";
9	import { dispatcherError, validateActionParams
... [+8500 chars truncated]

### Assistant | 2026-06-20T13:08:25.502Z

Now I need to check the MCP server registration, tests, and git log for each file. Let me do these in parallel.

### Assistant | 2026-06-20T13:08:27.247Z

[tool_use: Grep]

### Assistant | 2026-06-20T13:08:28.361Z

[tool_use: Glob]

### Assistant | 2026-06-20T13:08:28.500Z

[tool_use: Glob]

### User | 2026-06-20T13:08:28.774Z

[tool_result] 71:import { registerAutoPilotDispatcher } from "./tools/dispatchers/autoPilotDispatcher.js";
78:import { registerSpDispatcher } from "./tools/dispatchers/spDispatcher.js";
89:import { registerAutonomousDispatcher } from "./tools/dispatchers/autonomousDispatcher.js";
655:  registerSpDispatcher(server);
676:  registerAutoPilotDispatcher(server);
702:  registerAutonomousDispatcher(server);

### User | 2026-06-20T13:08:29.673Z

[tool_result] mcp-server\src\__tests__\inference-chain-llm-wire.test.ts

### User | 2026-06-20T13:08:29.745Z

[tool_result] mcp-server\src\__tests__\SpeedFeedAutopilotEngine.test.ts
mcp-server\src\__tests__\PostProcessorAutopilotEngine.test.ts
mcp-server\src\__tests__\QuoteAutopilotEngine.test.ts
mcp-server\src\__tests__\speed-feed-autopilot-wire.test.ts

### Assistant | 2026-06-20T13:08:32.471Z

Now read the test file, check calcDispatcher for the inference_chain action handler, and run git log on all 5 files in parallel.

### Assistant | 2026-06-20T13:08:33.169Z

[tool_use: Read]

### Assistant | 2026-06-20T13:08:34.125Z

[tool_use: Grep]

### User | 2026-06-20T13:08:34.291Z

[tool_result] 1	/**
2	 * InferenceChainEngine free-AI wiring test
3	 * (FREE-AI-MIGRATION/U-INFERENCECHAIN-LLM-WIRE, slot:india).
4	 *
5	 * Verifies runInferenceChain's no-ANTHROPIC_API_KEY pre-gate was removed so it REACHES the now-free
6	 * Ollama-first parallelAPICalls substrate (the chokepoint freed in U-PARALLELAPI-LLM-ROUTE). This is
7	 * the consumer-level proof the chokepoint migration is delivered, not
... [+3549 chars truncated]

### Assistant | 2026-06-20T13:08:35.036Z

[tool_use: Grep]

### User | 2026-06-20T13:08:35.568Z

[tool_result] 195-      return { valid: result.valid, errors: result.errors?.length || 0, warnings: result.warnings?.length || 0 };
196-    case "campaign_optimize":
197-      return { improvement_pct: result.estimated_improvement_pct, adjustments: result.operation_adjustments?.length || 0 };
198-    case "campaign_cycle_time":
199-      return { total_min: result.estimated_total_time_min, per_material_min: res
... [+1518 chars truncated]

### User | 2026-06-20T13:08:37.748Z

[tool_result] Found 6 files
knowledge\wiki\index.md
knowledge\wiki\architecture\hooks\engine\agenthooks.md
knowledge\wiki\architecture\engines\intelligence\inferencechainengine.md
knowledge\wiki\architecture\engines\other\inferencechainengine.md
knowledge\wiki\architecture\engines-unwired\inferencechainengine.md
knowledge\wiki\architecture\tests\forge\forge-debug-p3-regression.md

### Assistant | 2026-06-20T13:08:42.832Z

Now check the calcDispatcher for the actual inference_chain executor (not just formatter), check the wiki entries, and check git recency for all 5 files.

### Assistant | 2026-06-20T13:08:43.980Z

[tool_use: Grep]

### Assistant | 2026-06-20T13:08:44.753Z

[tool_use: Read]

### Assistant | 2026-06-20T13:08:45.094Z

[tool_use: Read]

### User | 2026-06-20T13:08:45.405Z

[tool_result] 185-      return { mean_mm: result.mean_mm, wc_tolerance_mm: result.wc_tolerance_mm, mc_tolerance_mm: result.mc_tolerance_mm, cpk_at_wc: result.cpk_at_wc };
186-    case "gcode_generate":
187-      return { controller: result.controller, operation: result.operation, line_count: result.line_count, warnings: result.warnings?.length || 0 };
188-    case "decision_tree":
189-      return { tree: resul
... [+4572 chars truncated]

### User | 2026-06-20T13:08:45.718Z

[tool_result] 1	---
2	title: InferenceChainEngine
3	type: engine
4	engine_name: InferenceChainEngine
5	status: unwired
6	parent_layer: L13
7	ghost_node_kind: ghost.unwired-engine
8	last_modified_source: 2026-03-30
9	size_kb: 37
10	suggested_dispatcher: "prism_ai"
11	generated_by: scripts/generate-unwired-engine-wiki.mjs
12	last_verified: 2026-05-23
13	tags: [engine, unwired, ghost, needs-wiring, atomic]
14	rela
... [+2018 chars truncated]

### User | 2026-06-20T13:08:46.116Z

[tool_result] 1	---
2	title: InferenceChainEngine
3	type: engine
4	engine_id: eng.intelligence.inferencechainengine
5	domain: intelligence
6	parent_layer: L5
7	status: built
8	generated_by: scripts/generate-engine-wiki.mjs
9	last_verified: 2026-05-11
10	tags: [engine, domain-intelligence, status-built, atomic]
11	related:
12	  - knowledge/wiki/architecture/domain-intelligence.md
13	  - knowledge/wiki/architectu
... [+1176 chars truncated]

### Assistant | 2026-06-20T13:08:50.522Z

Now I need to find the actual calcDispatcher executor for inference_chain (not just the formatter), and run git log on all 5 files.

### Assistant | 2026-06-20T13:08:51.615Z

[tool_use: Grep]

### Assistant | 2026-06-20T13:08:52.373Z

[tool_use: Grep]

### User | 2026-06-20T13:08:53.031Z

[tool_result] 170-    case "hypermill_diameter_sf":
171-      return { vc_m_min: result.vc_m_min, fz_mm: result.fz_mm, material: result.material, interpolated: result.interpolated };
172-    case "hypermill_material_search":
173-      return { total: result.total, materials: result.materials?.length };
174-    case "hypermill_material_stats":
175-      return { total: result.total_materials, with_factors: resul
... [+8768 chars truncated]

### User | 2026-06-20T13:08:54.085Z

[tool_result] Found 8 files
mcp-server\src\__tests__\inference-chain-llm-wire.test.ts
mcp-server\src\engines\InferenceChainEngine.ts
mcp-server\src\config\api-config.ts
mcp-server\src\__tests__\api-config-parallel-llm-route.test.ts
mcp-server\src\tools\dispatchers\spDispatcher.ts
mcp-server\src\tools\dispatchers\autonomousDispatcher.ts
mcp-server\src\orchestration\AutoPilotV2.ts
mcp-server\src\orchestration\Aut
... [+9 chars truncated]

### Assistant | 2026-06-20T13:08:57.191Z

Now I need to find the actual `case "inference_chain":` executor block in calcDispatcher (not just the formatter). Let me search a different section of the file.

### Assistant | 2026-06-20T13:08:58.207Z

[tool_use: Grep]

### User | 2026-06-20T13:08:59.736Z

[tool_result] 175-      return { total: result.total_materials, with_factors: result.with_correction_factors, chipping_classes: result.chipping_classes };
176-    case "iso286_extended_it":
177-      return { tolerance_um: result.tolerance_um, grade_label: result.grade_label, extended: result.extended };
178-    case "iso286_extended_fit":
179-      return { fit_type: result.fit_type, min_clearance_um: result.m
... [+4658 chars truncated]

### Assistant | 2026-06-20T13:09:03.609Z

The formatter is in a response-slimmer function. I need to find the actual executor `case "inference_chain":` inside the main dispatch switch. Let me search specifically within the main handler body of calcDispatcher.

### Assistant | 2026-06-20T13:09:05.487Z

[tool_use: Grep]

### User | 2026-06-20T13:09:06.956Z

[tool_result] No matches found

### Assistant | 2026-06-20T13:09:12.309Z

Critical finding: `InferenceChainEngine` is NOT imported in `calcDispatcher.ts` at all — the `case "inference_chain":` at line 200 is only in the response-slimmer formatter function, not in the main dispatch switch. Let me verify the main switch body for what actually calls when that action is hit.

### Assistant | 2026-06-20T13:09:13.124Z

[tool_use: Grep]

### Assistant | 2026-06-20T13:09:14.236Z

[tool_use: Grep]

### User | 2026-06-20T13:09:14.583Z

[tool_result] H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts-134-  "video_elearning_recommend",
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts-135-  "video_elearning_process_course",
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts-136-  "chain_executor_execute",
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts:137:  "inference_chain_run",
H:\pr
... [+3852 chars truncated]

### User | 2026-06-20T13:09:15.777Z

[tool_result] mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts-4214-      case "inference_chain_run": {
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts-4215-        const mod = await import("../../engines/InferenceChainEngine.js");
H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts-4216-        const p = params as any;
mcp-server\src\tools\dispatchers\aiReasoningDispa
... [+753 chars truncated]

### Assistant | 2026-06-20T13:09:20.167Z

Now I have enough to write the complete report. Let me do one final parallel check: git recency for all 5 files plus the aiReasoningDispatcher wiring.

### Assistant | 2026-06-20T13:09:20.925Z

[tool_use: Grep]

### User | 2026-06-20T13:09:22.392Z

[tool_result] 130:import { registerAIReasoningDispatcher } from "./tools/dispatchers/aiReasoningDispatcher.js";
587:    // (verified: prism_ai via aiDispatcher+aiReasoningDispatcher; prism_auth via Auth+ClaudeAccount),

### Assistant | 2026-06-20T13:09:23.135Z

[tool_use: Grep]

### Assistant | 2026-06-20T13:09:23.840Z

[tool_use: Grep]

### User | 2026-06-20T13:09:24.557Z

[tool_result] No matches found

### User | 2026-06-20T13:09:25.240Z

[tool_result] 132-    "prism:prism_manus",       // 11 actions: create_task, task_status/result, cancel_task, list_tasks, web_research, code_sandbox, hook_*
133:    "prism:prism_atcs",        // 10 actions: task_init, task_resume, task_status, queue_next, unit_complete, batch_validate, checkpoint, replan, assemble, stub_scan
134-  ],

### User | 2026-06-20T13:12:08.959Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
   The operator (PRISM Code Archaeologist role) requested a read-only archaeology audit of the PRISM `parallelAPICalls` reasoning subsystem to determine its status: INTENDED-TO-BE-LIVE, DORMANT-BUT-INTENDED, or DEPRECATED/DEAD. The goal is to inform whether the operator should invest in activating it (adding dispatcher executors and relaxing `hasValidApiKey()` gates). The operator is in read-only mode — no modifications permitted. The operator provided 5 specific consumers to audit, each requiring 5 dimensions of analysis: (A) reachability, (B) deprecation markers, (C) test coverage, (D) git recency, (E) documentation/roadmap presence. The operator also asked whether `parallelAPICalls` has any callers beyond the 5 named consumers.

2. Key Technical Concepts:
   - `parallelAPICalls` in `mcp-server/src/config/api-config.ts`: recently migrated from direct paid Anthropic SDK calls to the free Ollama-first `llmEngine.query` substrate (migration tag: `FREE-AI-MIGRATION/U-PARALLELAPI-LLM-ROUTE`, slot:india). Return shape is byte-identical to prior version.
   - `hasValidApiKey()`: returns `true` only when `ANTHROPIC_API_KEY` env var is set and not `'your-api-key-here'`. Controls all the consumer gates.
   - `llmEngine.query`: Ollama-first, Claude backup, offline fallback. `complexity:"high"` triggers Claude escalation.
   - `prism_autopilot_d` (autoPilotDispatcher): registered MCP tool, 7 actions, lazy-loads AutoPilot and AutoPilotV2 via `require()`.
   - `prism_sp` (spDispatcher): registered MCP tool, 19 actions, brainstorm has a working no-API quick mode.
   - `prism_autonomous` (autonomousDispatcher): registered MCP tool, 8 actions, most architecturally mature consumer.
   - `prism_calc` (calcDispatcher): registered MCP tool, 1475+ actions — contains `inference_chain` in ACTIONS l
... [+14125 chars truncated]

### Assistant | 2026-06-20T13:14:31.573Z

ARCHAEOLOGY REPORT
==================
Scope: PRISM `parallelAPICalls` reasoning subsystem — 5 consumers + all callers
Method: Trace-an-engine-chain across consumers, MCP registration, test coverage, wiki, deprecation markers. Git recency (dimension D) NOT collected — bash was not executed before context compaction. Flagged honestly per R12.

---

FINDINGS — PER-CONSUMER VERDICTS

---

CONSUMER 1: InferenceChainEngine.ts
File: `H:/prism/mcp-server/src/engines/InferenceChainEngine.ts` (1089 lines)

(A) REACHABILITY: DORMANT. No dispatcher executor calls `runInferenceChain`. The file itself says so explicitly at lines 456-463 (verbatim SCOPE NOTE: "this engine is currently DORMANT — no dispatcher executor calls runInferenceChain"). `analyzeAndRecommend` (line 691) and `deepDiagnose` (line 921) remain `hasValidApiKey()`-gated despite the FREE-AI-MIGRATION removing the gate on `runInferenceChain` itself. `listChainTypes()` is reachable but trivial (returns a 3-element array, no AI involved).

(B) DEPRECATION MARKERS: None. No `@deprecated`, no `TODO`, no `FIXME`, no stub markers. The SCOPE NOTE is diagnostic, not deprecation intent.

(C) TEST COVERAGE: 2 substantive R9-compliant tests in `src/__tests__/inference-chain-llm-wire.test.ts` — wiring proof (no-key reaches LLMEngine.query spy) + mocked-success path (status:"completed" with real step output). Tagged FREE-AI-MIGRATION/U-INFERENCECHAIN-LLM-WIRE. Coverage is thin but correct: verifies the LLM route, not the dispatcher gap.

(D) GIT RECENCY: NOT COLLECTED (bash not executed). Last confirmed code touch was the FREE-AI-MIGRATION migration (recent — in this branch per git log in summary).

(E) DOCS/ROADMAP: Two conflicting wiki entries.
- `knowledge/wiki/architecture/engines-unwired/inferencechainengine.md` — status: `unwired`, ghost_node_kind: `ghost.unwired-engine`, suggested_dispatcher: `prism_ai`, last_modified_source: 2026-03-30.
- `knowledge/wiki/architecture/engines/intelligence/inferencechainengine.md` — status
... [+15867 chars truncated]
