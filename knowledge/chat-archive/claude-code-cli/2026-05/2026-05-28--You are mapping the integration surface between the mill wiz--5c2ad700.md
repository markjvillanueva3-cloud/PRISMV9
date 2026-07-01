---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c2ad700-fec6-4068-9805-290031b62e61"
title: "You are mapping the integration surface between the mill wizard (under construct"
date: "2026-05-28"
first_ts: "2026-05-28T03:03:34.530Z"
last_ts: "2026-05-28T03:06:47.975Z"
cwd: "H:\\prism-slot-golf"
messages: 77
user_msgs: 33
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism-slot-golf/5c2ad700-fec6-4068-9805-290031b62e61/subagents/agent-ae3afdbe291481545.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# You are mapping the integration surface between the mill wizard (under construct

> **claude-code-cli** | 2026-05-28 | 77 msgs (33 user / 44 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/5c2ad700-fec6-4068-9805-290031b62e61/subagents/agent-ae3afdbe291481545.jsonl`

## Transcript

### User | 2026-05-28T03:03:34.530Z

You are mapping the integration surface between the mill wizard (under construction by foxtrot) and PRISM's Speed-Feed Calculator (SFC) + database subsystems. Goal: enumerate integration touchpoints and identify high-ROI synergy engines.

CONTEXT — mill wizard plan:
19-engine plan being assembled. SFC owned by oscar slot. Database surfaces in PRISM include: Qdrant vector memory, SQLite (`tribal-embed-index.json`, `system-graph.json`, `BUILD_STATE.json`, `MILESTONE_PROGRESS.json`), per-engine registry JSONs (`MachineRegistry`, `MaterialRegistry`, `ToolRegistry`, `LoRAAdapterRegistry`), and the closed-loop persistence layer (override history, outcome events, cut-outcome oracle data).

ANCHOR READS:
1. `C:\Users\wompu\.claude\projects\H--PRISM\memory\reference_oscar_sfc_domain_map_2026_05_27.md` — every SFC engine/algorithm/data/wiki/tribal/dispatcher/skill/bridge file. Start here; don't re-enumerate.
2. `H:/prism/mcp-server/src/engines/AutoSpeedFeedEngine.ts` — the main SFC orchestrator
3. `H:/prism/mcp-server/src/engines/ChipThinningCompensationEngine.ts` — wired to SFC per Agent 2's prior finding
4. `H:/prism/mcp-server/src/engines/MillingForceEngine.ts` — Kienzle-based force calc, feeds SFC
5. `H:/prism/mcp-server/src/engines/MachineAwareSpeedFeedEngine.ts` — machine-specific SFC layer
6. Database engines: Glob for `*Registry*.ts`, `*Persistence*.ts`, `*Qdrant*.ts`, `*MemoryEngine*.ts`
7. `H:/prism/mcp-server/data/state/` — list registry JSON files, count entries
8. Oscar slot recent SFC work: `git log --grep "SFC\|SPEED-FEED\|sfc" --since=2026-05-20 --pretty=oneline | head -20`

QUESTIONS TO ANSWER:
1. **SFC inputs the mill wizard must supply** — material_id, tool_id, holder_id, machine_id, RDoC, ADoC, axial_engagement, radial_engagement, operation_type, coolant_strategy. What's the complete schema?
2. **SFC outputs the mill wizard consumes** — SFM/RPM/feed_per_tooth/feed_rate/Kc/Fc/MRR/spindle_load/chatter_risk. What's the response schema?
3. **Is the SFC machine
... [+1975 chars truncated]

### Assistant | 2026-05-28T03:03:41.814Z

I'll map the mill wizard integration surface with the SFC and PRISM database subsystems. Let me start by reading the reference document and then systematically explore the codebase.

### Assistant | 2026-05-28T03:03:42.114Z

[tool_use: Read]

### User | 2026-05-28T03:03:48.319Z

[tool_result] 1	---
2	name: reference-oscar-sfc-domain-map-2026-05-27
3	description: Speed-Feed Calculator (SFC) domain map for oscar — every engine/algorithm/data/wiki/tribal/dispatcher/skill/bridge file related to SFC, with 1-line roles. Use BEFORE Grep/Glob/Agent for SFC file lookup.
4	metadata:
5	  node_type: memory
6	  type: reference
7	  originSessionId: 2ae65067-e11d-4499-80a6-c81da270c373
8	  surveyed_b
... [+16618 chars truncated]

### Assistant | 2026-05-28T03:03:50.083Z

Excellent. Now let me pull the anchor engines and database surfaces:

### Assistant | 2026-05-28T03:03:50.290Z

[tool_use: Read]

### Assistant | 2026-05-28T03:03:50.722Z

[tool_use: Read]

### Assistant | 2026-05-28T03:03:50.954Z

[tool_use: Read]

### Assistant | 2026-05-28T03:03:51.478Z

[tool_use: Bash]

### User | 2026-05-28T03:03:54.474Z

[tool_result] 1	/**
2	 * MCAT-MS0 U-MCAT12: Machine-Aware Speed/Feed Pipeline
3	 *
4	 * Wraps speed/feed calculations with real machine constraints from
5	 * CanonicalMachinePackage. Ensures calculated parameters never exceed:
6	 * - Spindle max RPM
7	 * - Spindle power/torque capacity
8	 * - Machine feed rate limits
9	 * - Work envelope constraints
10	 *
11	 * Uses the 5 machine validation hooks (U-MCAT08) for
... [+18915 chars truncated]

### User | 2026-05-28T03:03:54.572Z

[tool_result] 1	/**
2	 * MillingForceEngine — canonical mill-domain physics: Kienzle cutting force,
3	 * cantilever deflection, stability-lobe chatter prediction, spindle-power
4	 * verification, quick speed/feed lookup.
5	 *
6	 * STUB-RESCUE (slot:bravo 2026-05-26, U-STUB-HUNT-03). The original was a
7	 * placeholder returning {ok:false, stub:true, input}; the dispatcher already
8	 * routes 5 actions to this e
... [+17353 chars truncated]

### User | 2026-05-28T03:03:54.878Z

[tool_result] 1	/**
2	 * AutoSpeedFeedEngine — Automated Line-by-Line Speed & Feed Optimization
3	 *
4	 * The missing link in CNC programming: takes raw G-code from any CAM system
5	 * and automatically calculates physics-optimized S (spindle speed) and F (feed rate)
6	 * for EVERY cutting line using PRISM's full speed/feed engine stack.
7	 *
8	 * Pipeline:
9	 *   1. Parse G-code → extract tool changes, modal s
... [+38372 chars truncated]

### User | 2026-05-28T03:03:59.150Z

[tool_result] 5180f15af4cda7732ed85690feb326256cbf038c [MAIN] [SPEED-FEED-MS0]/U-BATCH-678 ...
16cb66abafa45b9e39626f05a885f16612778087 [MAIN] [SPEED-FEED-MS0]/U-BATCH-45 (...
ec9a2f53091de604a756b94b2f0cd7c5b89d657f [TRIBAL-WIKI-AUDIT-MS0]/U-VICTOR-A1+...
c8e8a290493fb267a6072b1995ff17d6ddb38622 [MAIN] [SPEED-FEED-MS0]/U-MILL-POST-...
5ed0a618685cc20f4d2158bef48f55c7a2457410 [MAIN] [SPEED-FEED-MS0]/U-SFM-84-85
... [+1219 chars truncated]

### Assistant | 2026-05-28T03:04:01.483Z

Let me continue systematically exploring the database surfaces and mill wizard integration points.

### Assistant | 2026-05-28T03:04:01.946Z

[tool_use: Glob]

### Assistant | 2026-05-28T03:04:02.170Z

[tool_use: Glob]

### Assistant | 2026-05-28T03:04:02.462Z

[tool_use: Glob]

### Assistant | 2026-05-28T03:04:02.464Z

[tool_use: Bash]

### User | 2026-05-28T03:04:04.916Z

[tool_result] H:/prism/mcp-server/src/engines\MachineOptionRegistryEngine.ts
H:/prism/mcp-server/src/engines\PhysicsPluginRegistry.ts
H:/prism/mcp-server/src/engines\MachineHandbookRegistryEngine.ts
H:/prism/mcp-server/src/engines\EngineRegistryEngine.ts
H:/prism/mcp-server/src/engines\HyperMillSkillRegistryMap.ts
H:/prism/mcp-server/src/engines\ModelRegistryEngine.ts
H:/prism/mcp-server/src/engines\PDFSourceRe
... [+1863 chars truncated]

### User | 2026-05-28T03:04:05.004Z

[tool_result] H:/prism/mcp-server/src/engines\UserToolLibraryPersistence.ts
H:/prism/mcp-server/src/engines\FeedbackPersistenceEngine.ts
H:/prism/mcp-server/src/engines\NeuralWeightPersistenceEngine.ts
H:/prism/mcp-server/src/engines\WEDMRLPolicyPersistence.ts
H:/prism/mcp-server/src/engines\CNCToolOffsetPersistenceEngine.ts
H:/prism/mcp-server/src/engines\ConsensusObsidianPersistenceEngine.ts

### User | 2026-05-28T03:04:05.069Z

[tool_result] H:/prism/mcp-server/src/engines\QdrantCapacityPlannerEngine.ts
H:/prism/mcp-server/src/engines\QdrantVectorStoreEngine.ts
H:/prism/mcp-server/src/engines\QdrantMemoryEngineSingleton.ts
H:/prism/mcp-server/src/engines\QdrantMemoryEngine.ts
H:/prism/mcp-server/src/engines\QdrantSurfaceEngine.ts
H:/prism/mcp-server/src/engines\QdrantMemoryVectorBridgeEngine.ts

### User | 2026-05-28T03:04:07.856Z

[tool_result] APPW-MS0/
APPW-MS1/
APPW-MS2/
APPW-MS3/
APPW-MS4/
APPW-MS5/
APPW-MS6/
APPW-MS7/
APPW-MS8/
CAMK-MS2/
CAMK-MS3/
CK-MS0/
CK-MS1/
CPL-MS2/
L0-NEW-MS0/
L0-P0-MS1/
L0-P0-MS2/
L2-P1-MS1/
L2-P2-MS1/
L2-P3-MS1/
MCAT-MS0/
MF-MS0/
PB-MS0/
PP-MOAT-MS1/
PROD-MS0/
QA-MS1/
QA-MS11/
QA-MS12/
QA-MS13/
QA-MS14/

### Assistant | 2026-05-28T03:04:09.934Z

Let me continue exploring the database registries and mill wizard dispatcher integration.

### Assistant | 2026-05-28T03:04:10.377Z

[tool_use: Read]

### Assistant | 2026-05-28T03:04:10.611Z

[tool_use: Read]

### Assistant | 2026-05-28T03:04:10.777Z

[tool_use: Read]

### Assistant | 2026-05-28T03:04:11.204Z

[tool_use: Bash]

### User | 2026-05-28T03:04:17.166Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Machine Registry
3	 * Complete access to 824 machines × 4 data layers
4	 * Implements BASIC → CORE → ENHANCED → LEVEL5 hierarchy
5	 */
6	
7	import * as fs from "fs/promises";
8	import * as path from "path";
9	import { BaseRegistry } from "./base.js";
10	import { PATHS, DATA_LAYERS } from "../constants.js";
11	import { log } from "../utils/Logger.js";
12	import { readJ
... [+3434 chars truncated]

### User | 2026-05-28T03:04:17.345Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Material Registry
3	 * Complete access to 1,047 materials × 127 parameters
4	 * 4-Layer Hierarchy: LEARNED → USER → ENHANCED → CORE
5	 */
6	
7	import * as fs from "fs/promises";
8	import * as path from "path";
9	import { BaseRegistry, type RegistryEntry } from "./base.js";
10	import { PATHS, DATA_LAYERS, ISO_GROUPS, MATERIAL_CATEGORIES, type IsoMaterialGroup } from ".
... [+3403 chars truncated]

### User | 2026-05-28T03:04:17.388Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Tool Registry
3	 * Complete access to 500+ cutting tools × 85 parameters
4	 */
5	
6	import * as fs from "fs/promises";
7	import * as path from "path";
8	import { BaseRegistry } from "./base.js";
9	import { PATHS, DATA_LAYERS } from "../constants.js";
10	import { log } from "../utils/Logger.js";
11	import { readJsonFile, writeJsonFile, fileExists, listDirectory } from 
... [+2879 chars truncated]

### User | 2026-05-28T03:04:21.430Z

[tool_result] H:/prism/mcp-server/data/state/ABSTRACTION_HIERARCHY.json  344B
H:/prism/mcp-server/data/state/ACTIONS_INDEX.json  1.5M
H:/prism/mcp-server/data/state/ACTION_RESOLUTION_INDEX.json  1.4M
H:/prism/mcp-server/data/state/AGENT_REGISTRY.json  30.1K
H:/prism/mcp-server/data/state/AI_SYSTEM_UTILIZATION.json  3.8K
H:/prism/mcp-server/data/state/ALIAS_TABLE_INDEX.json  586.7K
H:/prism/mcp-server/data/state
... [+839 chars truncated]

### Assistant | 2026-05-28T03:04:23.547Z

Let me search for mill wizard and database integration files directly.

### Assistant | 2026-05-28T03:04:24.212Z

[tool_use: Grep]

### Assistant | 2026-05-28T03:04:24.865Z

[tool_use: Grep]

### Assistant | 2026-05-28T03:04:25.035Z

[tool_use: Read]

### User | 2026-05-28T03:04:30.538Z

[tool_result] 1	/**
2	 * ChipThinningCompensationEngine — MIO-MS0/U-MIO09
3	 *
4	 * Automatic feedrate compensation for chip thinning in radial engagement < 50%.
5	 * When radial depth of cut is less than half the tool diameter, the actual chip
6	 * thickness becomes thinner than the programmed feed per tooth, requiring
7	 * feedrate increase to maintain effective chip load.
8	 *
9	 * Physics Model:
10	 *   hex
... [+5377 chars truncated]

### User | 2026-05-28T03:04:31.396Z

[tool_result] Found 2 files
H:\prism\mcp-server\src\engines\MachiningIntelligenceOrchestratorEngine.ts
H:\prism\mcp-server\src\engines\ChipThinningCompensationEngine.ts

### User | 2026-05-28T03:04:32.455Z

[tool_result] Found 9 files
H:\prism\mcp-server\src\engines\TribalTipOutcomeBridgeEngine.ts
H:\prism\mcp-server\src\schemas\intelligenceActionSchemas.ts
H:\prism\mcp-server\src\__tests__\SpeedFeedDownstreamSubscriberEngine.test.ts
H:\prism\mcp-server\src\engines\SpeedFeedDownstreamSubscriberEngine.ts
H:\prism\mcp-server\src\__tests__\QuotingSynergyBridges.test.ts
H:\prism\mcp-server\src\__tests__\catalogConsume
... [+229 chars truncated]

### Assistant | 2026-05-28T03:04:37.209Z

Let me search for mill wizard dispatcher and database integration more directly.

### Assistant | 2026-05-28T03:04:38.101Z

[tool_use: Grep]

### Assistant | 2026-05-28T03:04:38.425Z

[tool_use: Bash]

### Assistant | 2026-05-28T03:04:38.805Z

[tool_use: Read]

### User | 2026-05-28T03:04:40.567Z

[tool_result] File does not exist. Note: your current working directory is H:\prism-slot-golf.

### User | 2026-05-28T03:04:46.373Z

[tool_result] rtk: rtk find does not support compound predicates or actions (e.g. -not, -exec). Use `find` directly.

### User | 2026-05-28T03:04:46.375Z

[tool_result] Found 30 files limit: 30
H:\prism\mcp-server\src\tools\dispatchers\millDispatcher.ts
H:\prism\mcp-server\src\engines\MillPrintToProgramEngine.ts
H:\prism\mcp-server\src\engines\ToolpathStrategyEngine.ts
H:\prism\mcp-server\src\engines\ToolSelectionRecommenderEngine.ts
H:\prism\mcp-server\src\engines\MillScientificPipelineEngine.ts
H:\prism\mcp-server\src\engines\MillProgramAnalyzerEngine.ts
H:\pri
... [+1694 chars truncated]

### Assistant | 2026-05-28T03:04:48.784Z

Let me read the mill dispatcher correctly.

### Assistant | 2026-05-28T03:04:49.109Z

[tool_use: Read]

### Assistant | 2026-05-28T03:04:49.382Z

[tool_use: Glob]

### Assistant | 2026-05-28T03:04:49.921Z

[tool_use: Bash]

### User | 2026-05-28T03:04:52.198Z

[tool_result] 1	/**
2	 * prism_mill — Mill-Specific Dispatcher
3	 * MILL-MASTER/P1-U01-MILL-DISP, P1-U04-SA-INTEG
4	 *
5	 * First-class MCP surface for milling operations. Consolidates mill actions
6	 * previously scattered across camDispatcher, fiveAxisDispatcher, multiAxisDispatcher.
7	 *
8	 * Routes through MillMasterOrchestratorFacadeEngine as primary entry (P1-U02).
9	 *
10	 * 49 actions covering: print_to
... [+10142 chars truncated]

### User | 2026-05-28T03:04:52.423Z

[tool_result] H:/prism/mcp-server/src/engines\HyperMillSafetyHooks.ts
H:/prism/mcp-server/src/engines\SplineMillingEngine.ts
H:/prism/mcp-server/src/engines\ThreadMillingEngine.ts
H:/prism/mcp-server/src/engines\HyperMillThreadStandardEngine.ts
H:/prism/mcp-server/src/engines\HyperMillCycleDefaultsEngine.ts
H:/prism/mcp-server/src/engines\ChamferMillingEngine.ts
H:/prism/mcp-server/src/engines\TrochoidalMilling
... [+6167 chars truncated]

### User | 2026-05-28T03:04:56.225Z

[tool_result] /usr/bin/grep: H:/prism/mcp-server/src/__tests__/skillOrchBenchmark.test.ts: Permission denied
H:/prism/mcp-server/src/engines/InferenceLoRAGateEngine.ts:import { loraAdapterRegistryEngine, LoRAAdapterRegistryEngine } from "./LoRAAdapterRegistryEngine.js";
H:/prism/mcp-server/src/engines/InferenceLoRAGateEngine.ts:  constructor(private readonly registry: LoRAAdapterRegistryEngine = loraAdapterRegi
... [+2379 chars truncated]

### Assistant | 2026-05-28T03:04:58.550Z

Now let me search for the SFC closed-loop feedback path and database integration patterns more directly.

### Assistant | 2026-05-28T03:04:58.769Z

[tool_use: Read]

### Assistant | 2026-05-28T03:04:59.192Z

[tool_use: Read]

### Assistant | 2026-05-28T03:04:59.645Z

[tool_use: Bash]

### User | 2026-05-28T03:05:03.331Z

[tool_result] 1	/**
2	 * LoRAAdapterRegistryEngine — U-LEARN-07
3	 * =======================================
4	 *
5	 * Cross-domain registry of every trained LoRA adapter PRISM knows about.
6	 * One active adapter per (domain, context-key); older versions stay archived
7	 * for instant rollback. Persists to state/adapters/registry.jsonl (append-only)
8	 * with atomic writes.
9	 *
10	 * Lifecycle: staged → shado
... [+6072 chars truncated]

### User | 2026-05-28T03:05:04.827Z

[tool_result] 1	/**
2	 * ToolHolderRegistryEngine
3	 *
4	 * Aggregates 7 tool holder catalogs (BT30, BT40, CAT40, HSK63A, HSK100A, ER collet,
5	 * shrink fit) into unified registry queryable by machine taper, tool shank diameter,
6	 * gauge length, runout tolerance, and balance grade.
7	 *
8	 * Part of MILL-INTEG-MS0 (Resource Awareness Foundation).
9	 */
10	
11	export type TaperType = "BT30" | "BT40" | "CAT40"
... [+2247 chars truncated]

### User | 2026-05-28T03:05:18.916Z

[tool_result] /usr/bin/grep: H:/prism/mcp-server/src/__tests__/skillOrchBenchmark.test.ts: Permission denied

### Assistant | 2026-05-28T03:05:21.229Z

Let me search for the closed-loop SFC path and outcome oracle structures.

### Assistant | 2026-05-28T03:05:22.201Z

[tool_use: Grep]

### Assistant | 2026-05-28T03:05:22.396Z

[tool_use: Read]

### User | 2026-05-28T03:05:24.853Z

[tool_result] 1	/**
2	 * sfcOutcomeWire — U-PPG-SFC-01 inline helpers
3	 * =============================================
4	 *
5	 * Tiny wrappers around `sfcOutcomeCaptureWireEngine.recordEmission` so each
6	 * SFC engine adds 1–2 lines instead of inlining the full payload. Errors
7	 * inside the wire are swallowed — speed/feed recommendations must never
8	 * fail because telemetry failed.
9	 *
10	 * Used by:
11
... [+1588 chars truncated]

### User | 2026-05-28T03:05:27.091Z

[tool_result] Found 20 files limit: 20
H:\prism\mcp-server\src\engines\MillingPrintToProgramEngine.ts
H:\prism\mcp-server\src\tools\dispatchers\calcDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\devDispatcher.ts
H:\prism\mcp-server\src\engines\SpeedFeedOutcomeFeedbackBridgeEngine.ts
H:\prism\mcp-server\src\engines\UltimateSpeedFeedEngine.ts
H:\prism\mcp-server\src\engines\SpeedFeedPropagationBridgeEngi
... [+889 chars truncated]

### Assistant | 2026-05-28T03:05:29.401Z

Excellent. Now let me get the outcome capture wire engine and search for database registries the mill wizard needs to touch.

### Assistant | 2026-05-28T03:05:29.856Z

[tool_use: Read]

### Assistant | 2026-05-28T03:05:30.086Z

[tool_use: Glob]

### Assistant | 2026-05-28T03:05:30.448Z

[tool_use: Bash]

### User | 2026-05-28T03:05:31.878Z

[tool_result] H:/prism/mcp-server/data/state\S1-MS1\scrutiny-log.json
H:/prism/mcp-server/data/state\AUTOMATION_CENSUS.json
H:/prism/mcp-server/data/state\WIRE-MS0\frontend-coverage-audit.json
H:/prism/mcp-server/data/state\WEDM_BATCH_ANALYSIS.json
H:/prism/mcp-server/data/state\POST_PROCESSOR_KNOWLEDGE_EXTRACT.json
H:/prism/mcp-server/data/state\JM_DIE_POST_PROCESSOR_TRIBAL_KNOWLEDGE.json
H:/prism/mcp-server/d
... [+5721 chars truncated]

### User | 2026-05-28T03:05:32.245Z

[tool_result] 1	// WIRE-EXEMPT: Middleware engine — routes SFC events to OutcomeCaptureBus, not intended for dispatcher exposure
2	/**
3	 * SFCOutcomeCaptureWireEngine — U-PPG-SFC-01
4	 * ===========================================
5	 *
6	 * @WIRE-EXEMPT Middleware engine — routes SFC events to OutcomeCaptureBus,
7	 * not intended for direct dispatcher exposure.
8	 *
9	 * Thin instrumentation layer that routes 
... [+6992 chars truncated]

### User | 2026-05-28T03:05:33.316Z

[tool_result] -rw-r--r-- 1 wompu 197611 4262820 May 24 15:59 H:/prism/mcp-server/data/state/MILLING_REASONING_TRACE_LEDGER.jsonl
-rw-r--r-- 1 wompu 197611    4884 May  8 11:41 H:/prism/mcp-server/data/state/MILL_AI_COMPLETE_REPORT.json
-rw-r--r-- 1 wompu 197611     642 May  8 11:41 H:/prism/mcp-server/data/state/MILL_AI_TRAINING_REPORT.json
-rw-r--r-- 1 wompu 197611   26185 Apr 17 21:24 H:/prism/mcp-server/data
... [+251 chars truncated]

### Assistant | 2026-05-28T03:05:35.444Z

Let me now create a comprehensive mapping report based on all the data I've collected.

### Assistant | 2026-05-28T03:05:35.936Z

[tool_use: Bash]

### Assistant | 2026-05-28T03:05:36.952Z

[tool_use: Grep]

### User | 2026-05-28T03:05:42.642Z

[tool_result] (Bash completed with no output)

### User | 2026-05-28T03:05:43.584Z

[tool_result] No files found

### Assistant | 2026-05-28T03:06:47.975Z

Based on my comprehensive exploration of the PRISM codebase, here is the integration surface mapping between the mill wizard (under construction by foxtrot) and the SFC + database subsystems:

## SFC Surface Today (Mill-Relevant Engines + Actions)

**Primary Orchestrators:**
- `UltimateSpeedFeedEngine.ts` (401 LOC) — physics anchor: Kienzle/Taylor/Merchant/Brammertz; 31 models, 15 materials, 7 ops, 7 strategies
- `SpeedFeedOrchestratorEngine.ts` (2,851 LOC) — central hub; routes all domains → physics, post-processing
- `SpeedFeedNineAxisOrchestratorEngine.ts` — 9-axis composition (machine/spindle/controller/material/workholding/holder/tooling/coolant/toolpath); 3 modes
- `AutoSpeedFeedEngine.ts` (954 LOC) — mill-specific: G-code line-by-line S/F optimization with chip thinning, corner decel, plunge limits, power budgets
- `MachineAwareSpeedFeedEngine.ts` (546 LOC) — machine constraint enforcement: RPM clamp, feed clamp, power/torque verification

**Feedback & Closed-Loop:**
- `SpeedFeedOutcomeFeedbackBridgeEngine.ts` — outcome→DL calibration (audit F9)
- `SFCOutcomeCaptureWireEngine.ts` — middleware; routes every SFC recommendation → OutcomeCaptureBus for operator override tracking
- `LoRAAdapterRegistryEngine.ts` (150+ LOC) — persistence for trained override-event adapters; state/adapters/registry.jsonl (append-only)
- `ChipThinningCompensationEngine.ts` (150+ LOC) — chip thinning compensation (hex = fz × sqrt(ae/D)); wired to SFC

**Dispatcher Actions (calcDispatcher.ts):**
- `sfc_calculate` — single cell calculation
- `sfc_nine_axis_run` — 9-axis orchestrator
- `sfc_baseline_compare` — PRISM vs Sandvik/Kennametal/G-Wizard/etc.
- `sfc_optimize_run` — cost/aggressive/prism-optimized modes
- `sfc_tri_vendor_batch_compare` — 10K cell batch (U-OSC9-14)
- `auto_speed_feed_calc` — G-code post-optimization
- `ultimate_speed_feed` — canonical physics engine call
- `sfc_bridge_to_post_processor`, `sfc_bridge_to_print_to_program` — domain propagation
- `sfc_outcome_feedback
... [+15898 chars truncated]
