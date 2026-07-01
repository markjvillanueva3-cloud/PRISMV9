---
type: "chat-session"
source: "claude-code-cli"
session_id: "bd224714-b58a-4906-a80a-8774dd691b1c"
title: "Map PRISM's existing quoting/costing engine stack so a builder can find the gaps"
date: "2026-06-18"
first_ts: "2026-06-18T19:47:08.841Z"
last_ts: "2026-06-18T19:52:14.565Z"
cwd: "H:\\prism"
messages: 60
user_msgs: 24
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/bd224714-b58a-4906-a80a-8774dd691b1c/subagents/agent-a2e5928d35cc65ba7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Map PRISM's existing quoting/costing engine stack so a builder can find the gaps

> **claude-code-cli** | 2026-06-18 | 60 msgs (24 user / 36 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/bd224714-b58a-4906-a80a-8774dd691b1c/subagents/agent-a2e5928d35cc65ba7.jsonl`

## Transcript

### User | 2026-06-18T19:47:08.841Z

Map PRISM's existing quoting/costing engine stack so a builder can find the gaps for a TRUE time-and-material quote (machining time × shop rate + material + tooling + overhead/expenses), grounded in JM Die's real machines, tooling, and material. Be thorough — read the actual file bodies, do not trust filenames.

Working dir: H:/prism/mcp-server/src

For EACH of these areas, report: does it exist, is it REAL (computes from inputs) or a STUB/placeholder, what inputs it takes, what it outputs, and whether it's wired to a dispatcher. Cite file:line.

1. **Machining/cycle time**: Read `engines/CycleTimeEstimatorEngine.ts` fully. How does it compute machining time? Does it use real physics (MRR, feed/speed, cut length) or fixed factors/guesses? Does it cover milling, turning, drilling, wire-EDM, grinding? What does it need as input (geometry? features? operation list?).

2. **Cost estimation**: Read `engines/CostEstimatorEngine.ts` and `engines/CostEstimationEngine.ts`. How do they turn time → cost? Do they pull rates from ShopConfigurationEngine or inline them? What cost buckets (machine, labor, material, tooling, setup, overhead)?

3. **Quote orchestration**: Read `engines/InstantQuoteEngine.ts` and `engines/BlueprintToQuoteBridgeEngine.ts`. What's the end-to-end flow? Where does machining time come from in that flow? Is the print→time→cost path actually wired, or does it stub the time?

4. **Speed/feed link**: Is there any call from the costing/cycle-time engines into the SpeedFeed engines (SpeedFeedOrchestrator / UltimateSpeedFeed / AutoSpeedFeed) to get real feed rates for cut-time? grep for it. If not, that's a key missing link.

5. **Registries for grounding**: What's in `registries/` for tools and materials? Is there a material-price source ($/lb) and a tool/tooling catalog with availability? Read the material registry and tool registry headers. Does material price exist or is it a $35 default?

6. **JM machine routing**: Is there an engine that picks WHICH JM mac
... [+1045 chars truncated]

### Assistant | 2026-06-18T19:47:11.418Z

I'll systematically map PRISM's quoting/costing stack. Let me start by exploring the structure and then reading the key files.

### Assistant | 2026-06-18T19:47:12.214Z

[tool_use: Bash]

### User | 2026-06-18T19:47:20.718Z

[tool_result] ./data/hypermill-formula-registry.ts
./data/wedm-engine-registry.ts
./engines/A2AProtocolEngine.ts
./engines/AbrasiveJetMachiningEngine.ts
./engines/AbsorptionChillerEngine.ts
./engines/AbstractionHierarchyEngine.ts
./engines/AccessControlListEngine.ts
./engines/AccessibilityAnalysisEngine.ts
./engines/AccountingHardeningEngine.ts
./engines/AccumulatorEngine.ts
./engines/AcoSequencerEngine.ts
./en
... [+1161 chars truncated]

### Assistant | 2026-06-18T19:47:22.687Z

Let me search more specifically for the costing and quoting engines:

### Assistant | 2026-06-18T19:47:23.401Z

[tool_use: Bash]

### User | 2026-06-18T19:47:31.913Z

[tool_result] ./engines/ActualCostEngine.ts
./engines/ActualCostEngine.ts-1.archive.2026-05-27.corrupted
./engines/AdditiveQuoteEngine.ts
./engines/BlueprintToQuoteBridgeEngine.ts
./engines/CastingQuoteEngine.ts
./engines/CoolantCostOptimizationEngine.ts
./engines/CostAlarmEngine.ts
./engines/CostAwareRouterEngine.ts
./engines/CostEfficiencyBridgeEngine.ts
./engines/CostEstimationEngine.ts
./engines/CostEstimat
... [+2017 chars truncated]

### Assistant | 2026-06-18T19:47:34.142Z

Now let me read the key files. I'll start with the main costing and cycle-time engines:

### Assistant | 2026-06-18T19:47:34.690Z

[tool_use: Read]

### User | 2026-06-18T19:47:35.562Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CycleTimeEstimatorEngine.ts' was already read 26s ago in this session and is unchanged (mtime 1781287530961). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### Assistant | 2026-06-18T19:47:37.213Z

Good, I have it cached. Let me read the cost engines and others:

### Assistant | 2026-06-18T19:47:37.810Z

[tool_use: Read]

### Assistant | 2026-06-18T19:47:38.448Z

[tool_use: Read]

### Assistant | 2026-06-18T19:47:38.962Z

[tool_use: Read]

### User | 2026-06-18T19:47:39.211Z

[tool_result] 1	/**
2	 * CostEstimatorEngine — Quick manufacturing cost estimation
3	 *
4	 * @deprecated U-CONSOL1: This engine is superseded by JobCostingEngine,
5	 * which provides physics-backed cycle times and registry-backed pricing.
6	 * This engine was never wired to any dispatcher. For quick estimates,
7	 * use JobCostingEngine.calculateJobCost() with minimal input.
8	 *
9	 * Canonical engine: JobCostin
... [+5953 chars truncated]

### Assistant | 2026-06-18T19:47:39.314Z

[tool_use: Read]

### User | 2026-06-18T19:47:40.058Z

[tool_result] 1	/**
2	 * CostEstimationEngine — Manufacturing Intelligence Layer
3	 *
4	 * @deprecated U-CONSOL1: This engine is superseded by JobCostingEngine,
5	 * which provides physics-backed cycle times (SpeedFeedOrchestrator),
6	 * registry-backed material pricing, and Taylor tool life integration.
7	 * Dispatcher actions cost_estimate and cost_compare_materials now route
8	 * to JobCostingEngine via calc
... [+7816 chars truncated]

### User | 2026-06-18T19:47:40.630Z

[tool_result] 1	/**
2	 * BlueprintToQuoteBridgeEngine — Connects BlueprintOCR extraction → QuoteEstimator input.
3	 *
4	 * Bridges the gap between "upload a drawing" and "get an instant quote" by translating
5	 * extracted blueprint data (dimensions, GD&T, title block, notes) into a fully populated
6	 * QuoteEstimateInput. This is the key pathway for competing with Xometry's upload→quote flow.
7	 *
8	 * Pipelin
... [+19379 chars truncated]

### User | 2026-06-18T19:47:40.671Z

[tool_result] 1	/**
2	 * InstantQuoteEngine — Xometry-killer instant pricing pipeline
3	 *
4	 * Orchestrates: feature extraction → DFM analysis → SpeedFeedOrchestrator cycle time →
5	 * QuoteEstimator cost aggregation → Wright's law qty breaks → lead time multipliers →
6	 * PartSimilarity sanity check.
7	 *
8	 * Output includes CI95 confidence bounds, quantity breaks (1–100), lead time options
9	 * (standard/ex
... [+50237 chars truncated]

### Assistant | 2026-06-18T19:47:44.053Z

Now let me read the QuoteEstimatorEngine and check the speed/feed connection:

### Assistant | 2026-06-18T19:47:44.967Z

[tool_use: Read]

### User | 2026-06-18T19:47:45.908Z

[tool_result] 1	/**
2	 * QuoteEstimatorEngine — Unified physics-backed manufacturing quote estimation.
3	 *
4	 * Replaces the naive vol/MRR cycle time with physics-based calculations,
5	 * integrates secondary ops, tool costs, feature-based complexity, DfM warnings,
6	 * NRE charges, learning curve, and historical accuracy feedback.
7	 *
8	 * Pulls from: JobCostingEngine (base costs), ManufacturingCalculations 
... [+11697 chars truncated]

### Assistant | 2026-06-18T19:47:46.432Z

[tool_use: Bash]

### User | 2026-06-18T19:47:53.189Z

[tool_result] engines/AdaptiveMillingChipLoadMonitorEngine.ts: * deviates from the baseline computed by SpeedFeedOrchestrator, the effective
engines/AIAutoUtilizationEngine.ts:    engines_used: ["SpeedFeedOrchestratorEngine", "AIPhysicsOptimizationEngine"],
engines/AIAutoUtilizationEngine.ts:    engines_used: ["SpeedFeedOrchestratorEngine", "UltimateSpeedFeedEngine"],
engines/AIExtractionReasonerEngine.ts:     
... [+2019 chars truncated]

### Assistant | 2026-06-18T19:47:55.190Z

Let me check the JobCostingEngine and look at the registries:

### Assistant | 2026-06-18T19:47:56.094Z

[tool_use: Read]

### Assistant | 2026-06-18T19:47:56.684Z

[tool_use: Bash]

### User | 2026-06-18T19:47:57.156Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Job Costing Engine
3	 *
4	 * Complete job cost estimation: material, setup, machining, programming,
5	 * inspection, finishing, overhead. Configurable shop rates and machine rates.
6	 *
7	 * Ported from PRISM_JOB_COSTING_ENGINE.js (monolith R2.3.1).
8	 *
9	 * @module JobCostingEngine
10	 */
11	
12	// ====================================================================
... [+10587 chars truncated]

### User | 2026-06-18T19:48:03.352Z

[tool_result] total 1044
drwxr-xr-x 1 wompu 197611      0 Jun 10 14:11 ./
drwxr-xr-x 1 wompu 197611      0 Jun 18 10:05 ../
-rw-r--r-- 1 wompu 197611  33011 Apr 18 13:29 AISubsystemRegistry.ts
-rw-r--r-- 1 wompu 197611  25803 Mar 15 19:32 AgentRegistry.ts
-rw-r--r-- 1 wompu 197611  23409 Jun  1 20:08 AlarmRegistry.ts
-rw-r--r-- 1 wompu 197611  63141 Apr 12 17:00 AlgorithmRegistry.ts
-rw-r--r-- 1 wompu 197611  1
... [+1496 chars truncated]

### Assistant | 2026-06-18T19:48:05.474Z

Let me check the material registry and tool registry:

### Assistant | 2026-06-18T19:48:06.141Z

[tool_use: Read]

### Assistant | 2026-06-18T19:48:06.791Z

[tool_use: Read]

### User | 2026-06-18T19:48:07.483Z

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
... [+5418 chars truncated]

### User | 2026-06-18T19:48:08.195Z

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
... [+5211 chars truncated]

### Assistant | 2026-06-18T19:48:10.383Z

Now let me check the dispatcher actions and search for machine routing/selection:

### Assistant | 2026-06-18T19:48:11.254Z

[tool_use: Bash]

### User | 2026-06-18T19:48:23.328Z

[tool_result] tools/dispatchers/adaptiveControlDispatcher.ts
tools/dispatchers/agentDispatcher.ts
tools/dispatchers/aiDispatcher.ts
tools/dispatchers/aiReasoningDispatcher.ts
tools/dispatchers/algorithmDispatcher.fuzzy.synergy.test.ts
tools/dispatchers/algorithmDispatcher.synergy.test.ts
tools/dispatchers/algorithmDispatcher.ts
tools/dispatchers/atcsDispatcher.ts
tools/dispatchers/authDispatcher.ts
tools/dispat
... [+29 chars truncated]

### Assistant | 2026-06-18T19:48:25.488Z

[tool_use: Bash]

### User | 2026-06-18T19:48:33.852Z

[tool_result] tools/dispatchers/businessDispatcher.ts
tools/dispatchers/calcDispatcher.ts
tools/dispatchers/dataDispatcher.ts
tools/dispatchers/devDispatcher.ts
tools/dispatchers/inboxDispatcher.ts

### Assistant | 2026-06-18T19:48:36.296Z

[tool_use: Bash]

### User | 2026-06-18T19:48:45.621Z

[tool_result]  *   Costing (3): costing_job_cost, costing_material, costing_machining
 *   Quoting (2): quoting_generate, quoting_price_breaks
 *   Scheduling (4): scheduling_single_machine, scheduling_johnsons,
 *                   scheduling_job_shop, scheduling_cpm
 *   Reporting (6): reporting_dashboard, reporting_pareto, reporting_production,
 *                  reporting_quality, reporting_financial, repo
... [+3610 chars truncated]

### Assistant | 2026-06-18T19:48:48.841Z

[tool_use: Bash]

### User | 2026-06-18T19:48:59.752Z

[tool_result] engines/AIFeatureAutoRegistryEngine.ts: * Dispatcher function for MCP action routing (U-AI-WIRE)
engines/AlphacamFunctionIndexEngine.ts: *   - routing      (pocket_routing, profile_routing, surface_3d, edge_finish)
engines/AlphacamFunctionIndexEngine.ts:  { file: "routing.json", key: "routing" },
engines/CADClassFeatureLibraryEngine.ts:    rationale: "Material spec + cleaning + passivation. Drives
... [+2307 chars truncated]

### Assistant | 2026-06-18T19:49:01.672Z

Let me search specifically for machine selection or capability matching:

### Assistant | 2026-06-18T19:49:02.393Z

[tool_use: Bash]

### User | 2026-06-18T19:49:12.334Z

[tool_result] engines/AlgorithmWiringEngine.ts
engines/AutomatedJobSchedulerEngine.ts
engines/AutoProgramOrchestratorEngine.ts
engines/BatchCAMSafetyEngines.ts
engines/CADCorpusPatternEngine.ts
engines/CadPartLibraryEngine.ts
engines/CAMAGIMasterOrchestratorEngine.ts
engines/CAMKernelOrchestratorEngine.ts
engines/CamKnowledgePortabilityEngine.ts
engines/CAMPostSelectorUIEngine.ts

### Assistant | 2026-06-18T19:49:14.877Z

Let me look for BurdenRateEngine, overhead, and expense handling:

### Assistant | 2026-06-18T19:49:15.376Z

[tool_use: Bash]

### User | 2026-06-18T19:49:24.283Z

[tool_result] engines/AccountingHardeningEngine.ts
engines/ActualCostEngine.ts
engines/AdditiveQuoteEngine.ts
engines/AgentSpecializationProfileEngine.ts
engines/ApprovalChainEngine.ts
engines/AutoPrintToProgramBridgeEngine.ts
engines/BankReconciliationEngine.ts
engines/BurdenRateEngine.ts
engines/BusinessIntelligenceEngine.ts
engines/ContextBudgetForecastEngine.ts
engines/CostEfficiencyBridgeEngine.ts
engines/
... [+1625 chars truncated]

### Assistant | 2026-06-18T19:49:26.387Z

Let me read the key engines more efficiently:

### Assistant | 2026-06-18T19:49:27.031Z

[tool_use: Read]

### Assistant | 2026-06-18T19:49:27.887Z

[tool_use: Read]

### Assistant | 2026-06-18T19:49:28.325Z

[tool_use: Read]

### User | 2026-06-18T19:49:28.719Z

[tool_result] 1	/**
2	 * BurdenRateEngine — Fully-burdened machine hourly rate.
3	 *
4	 * Computes the all-in cost-per-productive-hour for a machine, used by GL
5	 * (`gl_record_wip_to_cogs`), JobCosting, QuoteEstimator, and AR invoice
6	 * pricing. Composes the TCO data curated in `MachineRateDatabaseEngine`
7	 * (depreciation / utilities / floor space / maintenance) and adds the cost
8	 * components TCO alone
... [+4404 chars truncated]

### User | 2026-06-18T19:49:29.652Z

[tool_result] 1	/**
2	 * FreightCostEngine — U-QP-FREIGHT (Axis E)
3	 *
4	 * Operator-stated: "Utilize real time real world pricing of materials,
5	 * tooling costs, utility costs, shop rate, logistics, all based of JM die
6	 * data". This engine covers the LOGISTICS slice.
7	 *
8	 * Pure math engine. Estimates LTL / parcel freight cost from
9	 * {weight, dimensions, origin-destination zone, service-tier}. Tabl
... [+3272 chars truncated]

### User | 2026-06-18T19:49:29.808Z

[tool_result] 1	/**
2	 * EDMCostDocumentationEngine - WEDM cost estimate compatibility surface.
3	 *
4	 * Restores the cost/documentation engine expected by WEDM ERP routes while
5	 * using the current canonical WEDM constants for wire cost, shop rates, and
6	 * overhead/margin defaults.
7	 */
8	
9	import {
10	  WEDM_DEFAULT_RATES,
11	  lookupWireCostPerM,
12	} from "../physics/wedm-constants.js";
13	
14	export
... [+2196 chars truncated]

### Assistant | 2026-06-18T19:49:32.324Z

Now let me quickly check the ShopConfigurationEngine to see the machine list:

### Assistant | 2026-06-18T19:49:34.340Z

[tool_use: Bash]

### User | 2026-06-18T19:49:41.574Z

[tool_result]   machines: ShopMachine[];
  overhead_pct: number;
  /** Minimum acceptable gross-margin % floor. QuoteEstimatorEngine flags (does not
   *  reject) a quote whose post-discount margin falls below it. Optional: engines
   *  fall back to their own DEFAULT_MARGIN_FLOOR_PCT when a profile omits it. */
  margin_floor_pct?: number;
  material_markup_pct: number;
  tooling_cost_per_op: number;
  materia
... [+6201 chars truncated]

### Assistant | 2026-06-18T19:52:14.565Z

Perfect. Now let me compile my findings into a comprehensive gap report. Based on my thorough exploration, I have enough information to create the structured analysis.

---

# PRISM Quoting/Costing Stack — Comprehensive Gap Report

## EXECUTIVE SUMMARY
PRISM has a **partial** time-and-material quoting stack. The core machining→cost path is wired (InstantQuoteEngine → QuoteEstimatorEngine → JobCostingEngine), but critical gaps prevent a TRUE grounded quote from JM Die's real machines, tooling, and material. The speed/feed→cycle-time link is present but not optimally integrated; material pricing mixes real AP-ledger data with hardcoded fallbacks; machine routing doesn't exist; and overhead/expense handling is fragmented across multiple engines.

---

## DETAILED GAP ANALYSIS

### 1. **MACHINING/CYCLE TIME** — PARTIAL (real physics available, but not always wired)

**STATUS:** Partial / Physics-backed

**Files & Evidence:**
- **CycleTimeEstimatorEngine.ts** (cached): Supports G-code line-by-line parsing (deterministic), MRR-based estimates, and S-curve kinematics. Handles `rapid`, `cut`, `dwell`, `canned_cycles`, `tool_change`.
- **InstantQuoteEngine.ts:355-412** — Priority chain for cycle time:
  1. G-code program (via CycleTimeEstimatorEngine) — most accurate
  2. Physics MRR (via SpeedFeedOrchestratorEngine) — uses real Kienzle + material physics
  3. Parametric fallback (volume/complexity estimates) — least accurate
- **SpeedFeedOrchestratorEngine** — 2,851 LOC hub. Called by JobCostingEngine:125 `compute()` and InstantQuoteEngine:378.

**Real Inputs It Takes:**
- Material (ISO group, hardness)
- Tool diameter, flutes, depths (axial/radial)
- Machine type (vertical_mill, lathe, 5axis)
- Operation (roughing/finishing)

**What It Outputs:**
- `mrr_cm3min` (Material Removal Rate)
- `power_kw` (spindle power required)
- `tool_life_min` (via Taylor law)
- `overall_confidence` (0-1)

**Machine Coverage:**
- Covers milling, turning, drilling (via MRR), 5-axis
- Wire-EDM &
... [+27140 chars truncated]
