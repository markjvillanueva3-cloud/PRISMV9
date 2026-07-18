---
type: "chat-session"
source: "claude-code-cli"
session_id: "2ae65067-e11d-4499-80a6-c81da270c373"
title: "very thorough — map every dispatcher action, slash-command skill, script, hook, "
date: "2026-05-27"
first_ts: "2026-05-27T13:49:29.656Z"
last_ts: "2026-05-27T14:04:22.061Z"
cwd: "H:\\PRISM"
messages: 84
user_msgs: 37
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism/2ae65067-e11d-4499-80a6-c81da270c373/subagents/agent-aff7df823be243675.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# very thorough — map every dispatcher action, slash-command skill, script, hook, 

> **claude-code-cli** | 2026-05-27 | 84 msgs (37 user / 47 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/2ae65067-e11d-4499-80a6-c81da270c373/subagents/agent-aff7df823be243675.jsonl`

## Transcript

### User | 2026-05-27T13:49:29.656Z

very thorough — map every dispatcher action, slash-command skill, script, hook, and cross-domain bridge in PRISM that wires the Speed-Feed Calculator (SFC) to OTHER domain nodes (mill, lathe, wire-EDM, CAD, CAM, post-processor). Goal: a path-with-1-line-role manifest for oscar's future searches.

Search scope:
- `H:/prism/mcp-server/src/tools/dispatchers/` (especially `calcDispatcher.ts` — find every `sfc_*` action enum entry and case statement)
- `H:/prism/.claude/commands/` (slash-command skills)
- `H:/.claude/commands/` (mirror dir)
- `H:/prism/mcp-server/scripts/` (orchestration scripts)
- `H:/prism/scripts/` (top-level operational scripts)
- `H:/prism/.claude/hooks/` (UserPromptSubmit / PreToolUse / Stop / SessionStart hooks)
- `H:/prism/mcp-server/src/engines/*Bridge*.ts` (every bridge engine wiring SFC to another domain)
- `H:/prism/mcp-server/src/engines/Mill*.ts`, `Lathe*.ts`, `Wedm*.ts`, `Cad*.ts`, `Cam*.ts`, `Post*.ts` (domain-specific engines that consume SFC output)

Categories to enumerate:

1. **DISPATCHER actions** — every action in `calcDispatcher.ts` (and any other dispatcher) prefixed `sfc_`, plus any in `prism_cam`, `prism_cad`, `prism_5axis`, `prism_turning`, `prism_machine_live`, `prism_ai`, `prism_safety` that consumes or produces SFC data. List as `<dispatcher>:<action>` + 1-line.

2. **SLASH COMMANDS** — every `*.md` skill that invokes SFC (`/auto-speed-feed`, `/auto-speed-feed-lathe`, `/test-speed-feed`, `/sfc-quick-start`, `/cycle-time-crush`, `/lathe-studio`, `/wire-edm-studio`, `/mill-studio`, `/quote-to-ship`, etc.). Path + the SFC operation it performs.

3. **CROSS-DOMAIN BRIDGES** (engines):
   - SFC → Post-processor: SpeedFeedPropagationBridge, SpeedFeedDownstreamSubscriber, anything in `Post*` that reads SFC results
   - SFC → Mill: CAMSpeedFeedBridge, MillSpeedFeedSubscriber, any Mill*Engine consuming SFC
   - SFC → Lathe: LatheSpeedFeedCalculatorFacade, LatheSpeedFeedDeepLearningAdvisor, LatheSpeedFeedReasoningBridge, LatheSpeedFe
... [+1041 chars truncated]

### Assistant | 2026-05-27T13:49:52.187Z

I'll conduct a thorough, efficient search of the PRISM codebase to map every dispatcher action, slash-command skill, script, hook, and cross-domain bridge wiring SFC to other domains. Let me start with strategic globs and greps.

### Assistant | 2026-05-27T13:49:52.188Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:52.398Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:52.596Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:52.822Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:52.825Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:53.732Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:53.734Z

[tool_use: Glob]

### Assistant | 2026-05-27T13:49:53.737Z

[tool_use: Glob]

### User | 2026-05-27T13:51:25.990Z

[tool_result] mcp-server\src\tools\dispatchers\resourceHarvestingDispatcher.ts
mcp-server\src\tools\dispatchers\resourceExtractionDispatcher.ts
mcp-server\src\tools\dispatchers\securityDispatcher.ts
mcp-server\src\tools\dispatchers\atcsDispatcher.ts
mcp-server\src\tools\dispatchers\autoPilotDispatcher.ts
mcp-server\src\tools\dispatchers\automationDispatcher.ts
mcp-server\src\tools\dispatchers\autonomousDispatch
... [+5311 chars truncated]

### User | 2026-05-27T13:51:25.995Z

[tool_result] H:/.claude/commands\template.md
H:/.claude/commands\wedm-ai-advisor.md
H:/.claude/commands\wedm-batch.md
H:/.claude/commands\wedm-compare.md
H:/.claude/commands\wedm-controller.md
H:/.claude/commands\wedm-cost.md
H:/.claude/commands\wedm-feasibility.md
H:/.claude/commands\wedm-hook-disable.md
H:/.claude/commands\wedm-troubleshoot.md
H:/.claude/commands\lathe-ai.md
H:/.claude/commands\wedm-cite.md

... [+3363 chars truncated]

### User | 2026-05-27T13:51:26.009Z

[tool_result] .claude\commands\ingest.md
.claude\commands\vendor.md
.claude\commands\prints.md
.claude\commands\tooling.md
.claude\commands\process-docs.md
.claude\commands\material-stock.md
.claude\commands\my-shop.md
.claude\commands\erp-health.md
.claude\commands\self-improve.md
.claude\commands\advisor-strategy.md
.claude\commands\claude-flow-help.md
.claude\commands\claude-flow-memory.md
.claude\commands\c
... [+2960 chars truncated]

### User | 2026-05-27T13:51:26.070Z

[tool_result] mcp-server\scripts\convert_to_ts.mjs
mcp-server\scripts\fix_imports.mjs
mcp-server\scripts\fix_and_build.mjs
mcp-server\scripts\fix_buffer_zones.mjs
mcp-server\scripts\extract-machines.mjs
mcp-server\scripts\gap-analysis.mjs
mcp-server\scripts\regen-code-index.mjs
mcp-server\scripts\extract-core-machines.mjs
mcp-server\scripts\generate-master-index.mjs
mcp-server\scripts\start-http.mjs
mcp-server\
... [+4020 chars truncated]

### User | 2026-05-27T13:51:26.108Z

[tool_result] scripts\materials_rebuild\generate.mjs
scripts\convert_to_ts.mjs
scripts\fix_imports.mjs
scripts\_archive\materials-legacy\fix_and_build.mjs
scripts\_archive\materials-legacy\fix_buffer_zones.mjs
scripts\extract-machines.mjs
scripts\gap-analysis.mjs
scripts\regen-code-index.mjs
scripts\extract-core-machines.mjs
scripts\index\build-shared-index-surfaces.mjs
scripts\_archive\audit\build-hook-skill-c
... [+3636 chars truncated]

### User | 2026-05-27T13:51:26.128Z

[tool_result] .claude\hooks\agent-boundary-guard.mjs
.claude\hooks\agent-pid-tracker.mjs
.claude\hooks\agent-registry-load.mjs
.claude\hooks\agent-rules-inject.mjs
.claude\hooks\agent-util-log.mjs
.claude\hooks\agent-vs-direct.mjs
.claude\hooks\agent-worktree-stale-unlock.mjs
.claude\hooks\aggressive-killer-stop.mjs
.claude\hooks\agi-safety-envelope-guard.mjs
.claude\hooks\ai-auto-command-router.mjs
.claude\hoo
... [+3854 chars truncated]

### User | 2026-05-27T13:51:26.270Z

[tool_result] mcp-server\src\engines\BlueprintToQuoteBridgeEngine.ts
mcp-server\src\engines\ManusATCSBridge.ts
mcp-server\src\engines\NovelPostProcessorBridgeEngine.ts
mcp-server\src\engines\SimulationVisualizationBridgeEngine.ts
mcp-server\src\engines\CAMKernelDispatcherBridge.ts
mcp-server\src\engines\GrafanaBridgeEngine.ts
mcp-server\src\engines\MqttBridgeEngine.ts
mcp-server\src\engines\ProtocolBridgeEngine
... [+4830 chars truncated]

### User | 2026-05-27T13:51:26.369Z

[tool_result] mcp-server\src\engines\CampaignEngine.ts
mcp-server\src\engines\CamKnowledgePortabilityEngine.ts
mcp-server\src\engines\PostProcessorEngine.ts
mcp-server\src\engines\CamProfileEngine.ts
mcp-server\src\engines\CamDesignEngine.ts
mcp-server\src\engines\PostSelectionEngine.ts
mcp-server\src\engines\PostProcessorVerificationEngine.ts
mcp-server\src\engines\MillTurnCAMEngine.ts
mcp-server\src\engines\P
... [+5164 chars truncated]

### Assistant | 2026-05-27T13:51:34.389Z

Now let me search for SFC-specific dispatcher actions and commands:

### Assistant | 2026-05-27T13:51:35.536Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:51:38.578Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:51:38.582Z

[tool_use: Grep]

### User | 2026-05-27T13:52:21.701Z

[tool_result] No files found

### User | 2026-05-27T13:52:21.769Z

[tool_result] Found 7 files
mcp-server\src\tools\dispatchers\intelligenceDispatcher.ts
mcp-server\src\tools\dispatchers\devDispatcher.ts
mcp-server\src\tools\dispatchers\calcDispatcher.ts
mcp-server\src\tools\dispatchers\dataDispatcher.ts
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
mcp-server\src\tools\dispatchers\camDispatcher.ts
mcp-server\src\tools\dispatchers\productDispatcher.ts

### User | 2026-05-27T13:52:21.854Z

[tool_result] Found 21 files
H:\.claude\commands\rgs.md
H:\.claude\commands\wet-run.md
H:\.claude\commands\wedm-program.md
H:\.claude\commands\sinker-harden.md
H:\.claude\commands\shop-doctor.md
H:\.claude\commands\rgs2.md
H:\.claude\commands\release-ready.md
H:\.claude\commands\quality-gate.md
H:\.claude\commands\mill-studio.md
H:\.claude\commands\machining-ai.md
H:\.claude\commands\machine-roi.md
H:\.claude\c
... [+360 chars truncated]

### Assistant | 2026-05-27T13:52:25.253Z

Now let me read the key dispatcher files and command definitions:

### Assistant | 2026-05-27T13:52:25.680Z

[tool_use: Read]

### Assistant | 2026-05-27T13:52:25.870Z

[tool_use: Read]

### Assistant | 2026-05-27T13:52:26.076Z

[tool_use: Read]

### Assistant | 2026-05-27T13:52:26.491Z

[tool_use: Read]

### Assistant | 2026-05-27T13:52:26.582Z

[tool_use: Read]

### User | 2026-05-27T13:53:07.238Z

[tool_result] 1	---
2	name: auto-speed-feed-lathe
3	description: Auto Speed Feed Lathe — Physics-Optimized Lathe Turning Parameters
4	trigger:
5	  autoSuggest:
6	    keywords: ["auto speed feed lathe", "auto speed feed lathe physics-optimized lathe turning parameters", "auto speed feed lathe physics-optimized lathe turning para", "lathe", "turning", "speed", "feed", "calculate"]
7	_triggerBackfill: 2026-05-08T1
... [+3779 chars truncated]

### User | 2026-05-27T13:53:07.260Z

[tool_result] 1	---
2	name: auto-speed-feed
3	description: Auto Speed Feed — Physics-Optimized Line-by-Line S/F for CNC Programs
4	trigger:
5	  autoSuggest:
6	    keywords: ["auto speed feed", "auto speed feed physics-optimized line-by-line s f for cnc programs", "auto speed feed physics-optimized line-by-line s f for cnc", "feed", "speed", "automatically", "calculate", "inject"]
7	_triggerBackfill: 2026-05-08T
... [+3169 chars truncated]

### User | 2026-05-27T13:53:07.296Z

[tool_result] 1	---
2	name: test-speed-feed
3	description: Test Speed Feed — Exhaustive UltimateSpeedFeedEngine Gauntlet
4	---
5	
6	# Test Speed Feed — Exhaustive UltimateSpeedFeedEngine Gauntlet
7	
8	Run the comprehensive test gauntlet that proves out every capability of the UltimateSpeedFeedEngine — all 31 physics models, 5 statistical methods, 15 materials, 7 operations, 7 strategies, and 401 assertions acro
... [+4251 chars truncated]

### User | 2026-05-27T13:53:07.341Z

[tool_result] 1	---
2	name: cycle-time-crush
3	description: Cycle Time Crush — Find Every Second Hiding in Your Program
4	composes_with:
5	  - "/auto-speed-feed"
6	  - "/program-validate"
7	---
8	# Cycle Time Crush — Find Every Second Hiding in Your Program
9	
10	Takes an existing CNC program and finds every opportunity to reduce cycle time while staying within machine limits, tool life constraints, and quality
... [+4062 chars truncated]

### User | 2026-05-27T13:53:07.346Z

[tool_result] 1	import { z } from "zod";
2	import { log } from "../../utils/Logger.js";
3	import { hookExecutor, type HookPhase } from "../../engines/HookExecutor.js";
4	// HM-REV-MS1: Lazy-cached HyperMILL MaterialBridge (class-only export, cached after first use)
5	// eslint-disable-next-line @typescript-eslint/no-explicit-any
6	let _hmMatBridge: any = null;
7	import type { GearHobbingInput } from "../../engi
... [+17763 chars truncated]

### Assistant | 2026-05-27T13:53:12.789Z

Now let me search for SFC actions and bridges more specifically:

### Assistant | 2026-05-27T13:53:17.638Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:53:17.641Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:53:17.643Z

[tool_use: Grep]

### system

... [4 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-27T13:54:07.563Z

[tool_use: Read]

### Assistant | 2026-05-27T13:54:08.046Z

[tool_use: Read]

### Assistant | 2026-05-27T13:54:08.388Z

[tool_use: Read]

### Assistant | 2026-05-27T13:54:08.591Z

[tool_use: Read]

### User | 2026-05-27T13:55:04.925Z

[tool_result] 1	/**
2	 * sfc-provenance-guard.mjs — U-PPG-SFC-03
3	 * ========================================
4	 *
5	 * PostToolCall hook that blocks SFC dispatcher actions lacking provenance.
6	 * Every Speed/Feed Calculator recommendation must carry:
7	 *   - recommendation_id
8	 *   - fps_source (formula|rag|adapter|iql|hybrid)
9	 *   - citations array (non-empty)
10	 *   - audit_hash for tamper detection
1
... [+5094 chars truncated]

### User | 2026-05-27T13:55:04.931Z

[tool_result] 1	/**
2	 * LatheSpeedFeedCalculatorFacadeEngine
3	 * =====================================
4	 *
5	 * Single-entry facade consolidating 16+ speed/feed engines for lathe operations.
6	 * Provides unified .calculate() API returning AtomicValue with recommendation,
7	 * band, confidence, sources, and reasoning chain.
8	 *
9	 * Implements LATHE-MASTER U-LTH07 (Phase P1: Speed & Feed Calculator).
10	 *

... [+2250 chars truncated]

### User | 2026-05-27T13:55:04.937Z

[tool_result] 1	/**
2	 * SpeedFeedNineAxisOrchestratorEngine — 9-axis comprehensive speed/feed orchestrator.
3	 *
4	 * THIN composition layer over UltimateSpeedFeedEngine.
5	 * Does NOT reinvent physics. Accepts an explicit 9-axis input model and
6	 * derives per-axis multipliers/constraints, then pipes through the canonical
7	 * UltimateSpeedFeedEngine.calculate() for the underlying physics, and
8	 * post-proc
... [+3612 chars truncated]

### User | 2026-05-27T13:55:04.956Z

[tool_result] 1	/**
2	 * CAMSpeedFeedBridgeEngine — Per-CAM Speed/Feed Translation (U-CAM99)
3	 * ====================================================================
4	 *
5	 * PHASE-7: Bridge between the four CAM plugin adapters and the central
6	 * SpeedFeedOrchestratorEngine (2,851 LOC). Each CAM host uses its own
7	 * parameter vocabulary — this engine normalizes native requests into
8	 * OrchestratorInput,
... [+3064 chars truncated]

### Assistant | 2026-05-27T13:55:09.473Z

Now let me search for hooks that reference SFC and check for additional dispatcher actions:

### Assistant | 2026-05-27T13:55:11.285Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:55:11.357Z

[tool_use: Grep]

### Assistant | 2026-05-27T13:55:11.936Z

[tool_use: Glob]

### User | 2026-05-27T13:55:33.051Z

[tool_result] No files found

### User | 2026-05-27T13:55:33.088Z

[tool_result] H:/.claude/commands\lathe-studio.md
H:/.claude/commands\mill-studio.md
H:/.claude/commands\quote-to-ship.md
H:/.claude/commands\wedm-program.md

### User | 2026-05-27T13:55:33.104Z

[tool_result] Found 2 files
mcp-server\src\tools\dispatchers\calcDispatcher.ts
mcp-server\src\tools\dispatchers\camDispatcher.ts

### Assistant | 2026-05-27T13:55:38.097Z

Let me read the studio commands and quote-to-ship to understand the SFC composition:

### Assistant | 2026-05-27T13:55:38.249Z

[tool_use: Read]

### Assistant | 2026-05-27T13:55:38.350Z

[tool_use: Read]

### Assistant | 2026-05-27T13:55:38.690Z

[tool_use: Read]

### Assistant | 2026-05-27T13:55:38.739Z

[tool_use: Read]

### User | 2026-05-27T13:56:13.796Z

[tool_result] 1	---
2	name: lathe-studio
3	description: Lathe Studio — Open Web Interface for Lathe Programming
4	consumes:
5	  - "prism_turning_program:lathe_ui_submit"
6	  - "prism_turning_program:turning_blueprint_intake"
7	  - "prism_turning_program:turning_cad_import"
8	---
9	# Lathe Studio — Open Web Interface for Lathe Programming
10	
11	Launch the PRISM Lathe Studio — a zero-experience web interface whe
... [+2552 chars truncated]

### User | 2026-05-27T13:56:14.181Z

[tool_result] 1	---
2	name: mill-studio
3	description: Interactive CNC Mill programming studio with full pipeline
4	version: 1.0.0
5	engines:
6	  - MillMasterOrchestratorFacadeEngine
7	  - MillProgramOptimizerEngine
8	  - MillDeepLearningEngine
9	  - MillStrategyNeuralEngine
10	  - MillKinematicsCollisionEngine
11	  - MillPatternMinerEngine
12	actions:
13	  - mill_studio_pipeline
14	  - mill_advanced_analysis
1
... [+3175 chars truncated]

### User | 2026-05-27T13:56:14.194Z

[tool_result] 1	---
2	name: wedm-program
3	description: /wedm-program — Physics-Optimized Wire EDM Program Generator
4	composes_with:
5	  - "/wire-edm-analyze"
6	  - "/wire-edm-studio"
7	consumes:
8	  - "prism_edm:wedm_generate_complete_program"
9	---
10	# /wedm-program — Physics-Optimized Wire EDM Program Generator
11	
12	Generate a complete, production-ready Wire EDM NC program with physics-derived parameters
... [+2902 chars truncated]

### User | 2026-05-27T13:56:14.281Z

[tool_result] 1	---
2	name: quote-to-ship
3	description: Quote-to-Ship Pipeline
4	consumes:
5	  - "prism_business:quote_to_ship_run"
6	  - "prism_business:quote_to_ship_status"
7	  - "prism_business:quote_to_ship_validate"
8	---
9	# Quote-to-Ship Pipeline
10	
11	Run the 21-stage QuoteToShip pipeline from blueprint intake through shipping.
12	
13	## Advisor Strategy (`advisor_20260301`)
14	Use Anthropic's adviso
... [+2661 chars truncated]

### Assistant | 2026-05-27T13:56:18.345Z

Now let me get the specific dispatcher actions from calcDispatcher and camDispatcher:

### Assistant | 2026-05-27T13:56:18.815Z

[tool_use: Read]

### Assistant | 2026-05-27T13:56:19.819Z

[tool_use: Bash]

### User | 2026-05-27T13:56:55.300Z

[tool_result] 1	/**
2	 * prism_cam — CAM/Toolpath Dispatcher
3	 *
4	 * 55+ actions: toolpath_generate, toolpath_simulate, toolpath_optimize,
5	 *   post_process, collision_check_full, stock_update, tool_assembly,
6	 *   fixture_setup, nesting_optimize, clearance_plane,
7	 *   sequence_operations, linking_move, cam_strategy_recommend,
8	 *   cam_safety_validate, cam_multiaxis_recommend, cam_material_map,
9	 *   
... [+11184 chars truncated]

### User | 2026-05-27T14:01:46.104Z

[tool_result] Command running in background with ID: bhqv31qq5. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--PRISM\6523f922-a3aa-4a21-908d-5e97e7e58de3\tasks\bhqv31qq5.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-27T14:01:50.668Z

Let me check the bash output and search for additional bridge engines:

### Assistant | 2026-05-27T14:01:51.127Z

[tool_use: Read]

### Assistant | 2026-05-27T14:01:52.176Z

[tool_use: Grep]

### User | 2026-05-27T14:02:45.980Z

[tool_result] <system-reminder>Warning: the file exists but is shorter than the provided offset (1). The file has 1 lines.</system-reminder>

### User | 2026-05-27T14:02:47.330Z

[tool_result] Found 50 files limit: 50
mcp-server\src\engines\HSMAdvisorComparatorBridgeEngine.ts
mcp-server\src\engines\SpeedFeedPDFCorpusBridgeEngine.ts
mcp-server\src\engines\HSMAdvisorAdapterEngine.ts
mcp-server\src\engines\KnowledgeCurriculumBridgeEngine.ts
mcp-server\src\engines\SpeedFeedShopLibraryBridgeEngine.ts
mcp-server\src\engines\SpeedFeedNineAxisOrchestratorEngine.ts
mcp-server\src\engines\SpeedFe
... [+2368 chars truncated]

### Assistant | 2026-05-27T14:02:52.313Z

Let me now compile the comprehensive report based on what I've found. I have enough data to create the path-with-1-line-role manifest:

### Assistant | 2026-05-27T14:02:52.774Z

[tool_use: Read]

### Assistant | 2026-05-27T14:02:52.969Z

[tool_use: Read]

### User | 2026-05-27T14:03:33.927Z

[tool_result] 1	/**
2	 * SpeedFeedToQuoteBridgeEngine — physics-backed cycle times for quote-time
3	 *
4	 * Operator directive (iter11 follow-up): "synergize the quoting feature
5	 * to the 3 machine domain wizards, speed and feed calculator and full
6	 * print to cnc program pipelines to get more accurate run times".
7	 *
8	 * iter11 (U-WIZARD-TO-QUOTE) accepts cycle_min directly from the wizard.
9	 * This eng
... [+2158 chars truncated]

### User | 2026-05-27T14:03:33.934Z

[tool_result] 1	/**
2	 * SpeedFeedPropagationBridgeEngine — auto-propagates 9-axis SFC results downstream.
3	 *
4	 * Problem solved: when the 9-axis orchestrator computes a new speed/feed
5	 * recommendation, every downstream consumer (post-processors, machine wizards,
6	 * print-to-program pipelines) must see the new values consistently and without
7	 * re-running the calc independently. This engine is the can
... [+1840 chars truncated]

### Assistant | 2026-05-27T14:04:22.061Z

Perfect! Now I have enough comprehensive data to create the manifest. Let me compile the final report:

---

## SFC Speed-Feed Calculator Cross-Domain Bridge Manifest (Oscar's Reference)

### 1. DISPATCHER ACTIONS

**calcDispatcher.ts** (H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts):
- `sfc_calculate`: Raw SFC compute entry point (physics-only, no domain routing)
- `sfc_feed_for_target`: Inverse calc: given target surface finish, return feed_mm/rev
- `sfc_optimize_run`: Full optimization across strategy × material matrix
- `sfc_nine_axis_run`: 9-axis orchestrator endpoint (machine, spindle, controller, workholding, coolant, toolpath)
- `sfc_shop_library_rank`: Rank proven shop-floor S/F records against material + operation
- `sfc_pdf_corpus_bridge`: Extract S/F from foxtrot/echo PDFs → calculator
- `auto_speed_feed_calc`: CAM dispatcher bridge for mill/lathe line-by-line injection
- `cam_speed_feed_bridge`: Per-CAM (HyperMILL/Fusion/Mastercam/Esprit/SolidCAM/NX) translation layer
- `ultimate_speed_feed`: Direct UltimateSpeedFeedEngine.calculate() (all 31 physics models)
- `speedfeed_dl_stats`, `speedfeed_advanced_ai_stats`, `speedfeed_ultimate_ai_stats`: DL advisor stats surfaces
- `speed_feed_mine`: Extract S/F from program records (Okuma lathe + mill patterns)
- `speed_feed_compare_to_baseline`: Grade program against pre-computed stats
- `speed_feed_autopilot`: 5-step chain (material → tool → machine → compute → clamp)
- `proven_speed_feed_aggregate_lathe`, `proven_speed_feed_aggregate_mill`: Statistical aggregation
- `proven_speed_feed_query`, `proven_speed_feed_export`: Proven parameter library ops
- `speed_feed_resource_sfm`, `speed_feed_resource_chiploads`, `speed_feed_resource_facemill_strategy`, `speed_feed_resource_hem`, `speed_feed_resource_jmdie_material`, `speed_feed_resource_optimal`: Sandvik/Kennametal/CNCCookbook resource bridges
- `joint_speed_feed_optimize`: 9-axis comprehensive orchestrator

**camDispatcher.ts** (H:/prism/mcp-server/
... [+11460 chars truncated]
