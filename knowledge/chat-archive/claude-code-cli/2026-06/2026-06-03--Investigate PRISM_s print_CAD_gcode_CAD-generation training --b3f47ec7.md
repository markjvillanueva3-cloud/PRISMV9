---
type: "chat-session"
source: "claude-code-cli"
session_id: "b3f47ec7-5613-49ad-a7a9-19371bba1ac7"
title: "Investigate PRISM's print→CAD→gcode→CAD-generation training pipeline. The operat"
date: "2026-06-03"
first_ts: "2026-06-03T18:08:50.616Z"
last_ts: "2026-06-03T18:13:20.304Z"
cwd: "H:\\prism"
messages: 74
user_msgs: 32
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a6799b3e86a12f9af.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:22"
---

# Investigate PRISM's print→CAD→gcode→CAD-generation training pipeline. The operat

> **claude-code-cli** | 2026-06-03 | 74 msgs (32 user / 42 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b3f47ec7-5613-49ad-a7a9-19371bba1ac7/subagents/agent-a6799b3e86a12f9af.jsonl`

## Transcript

### User | 2026-06-03T18:08:50.616Z

Investigate PRISM's print→CAD→gcode→CAD-generation training pipeline. The operator wants to "finish training utilizing the pipeline of print → CAD → gcode → CAD generation when delta gets it working." Search H:/prism (engines, scripts, state/shared). I need concrete answers, cite file:line:

1. What training harness/engines exist for this end-to-end pipeline? Look at PrintToProgramPipelineEngine, PrintToCADOrchestratorEngine, BlueprintToCADGenerationEngine, CADToSTEPPipelineEngine, India/AI-training engines, any LoRA trainers, and the cad-fusion-live galaxy (mcp-server/src/engines/cad-fusion-live/).
2. What is the current status — what works end-to-end, what is stubbed, and what is EXPLICITLY blocked on the delta/CAD slot getting Fusion CAD generation working? Find the actual blocker (grep for "when delta", "blocked", "pending delta", cad-fusion-live status).
3. Where is the training data/corpus for this pipeline, and what is the training loop (closed-loop outcome backbone, outcome-bus)? What format are the training pairs?
4. What can be PREPPED/BUILT NOW (corpus prep, training harness scaffolding, eval gates, data schema, dry-run validation) so training is ready to run the moment delta's CAD generation lands — without being blocked?

Give a realistic readiness assessment: percent-complete of the training pipeline, the critical path, and a punch-list of buildable-now units. Be concrete with file paths. Search breadth: very thorough.

### Assistant | 2026-06-03T18:09:02.591Z

I'll conduct a thorough investigation of PRISM's print→CAD→gcode→CAD-generation training pipeline. Let me start by exploring the codebase systematically.

### Assistant | 2026-06-03T18:09:02.834Z

[tool_use: Glob]

### Assistant | 2026-06-03T18:09:03.111Z

[tool_use: Glob]

### Assistant | 2026-06-03T18:09:03.116Z

[tool_use: Glob]

### Assistant | 2026-06-03T18:09:03.267Z

[tool_use: Glob]

### Assistant | 2026-06-03T18:09:03.322Z

[tool_use: Glob]

### User | 2026-06-03T18:09:25.051Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-03T18:09:25.852Z

[tool_result] mcp-server\src\__tests__\PrintToCADBridges.test.ts
mcp-server\src\engines\PrintToCADTranslator.ts
mcp-server\src\__tests__\PrintToCADBridgesPhase2.test.ts
mcp-server\src\engines\PrintToCADOrchestratorEngine.ts
mcp-server\src\__tests__\PrintToCADOrchestratorEngine.test.ts
mcp-server\src\__tests__\PrintToCADTranslator.test.ts
.claude\worktrees\rgs6-audit-v2\mcp-server\src\__tests__\PrintToCADBridges
... [+985 chars truncated]

### User | 2026-06-03T18:09:25.954Z

[tool_result] mcp-server\src\engines\BlueprintToCADGenerationEngine.ts
mcp-server\src\__tests__\engines\BlueprintToCADGenerationEngine.test.ts
mcp-server\dist.bak-20260504-143257\engines\BlueprintToCADGenerationEngine.d.ts
mcp-server\src\__tests__\BlueprintToCADGenerationEngine.test.ts
.claude\worktrees\rgs6-audit-v2\mcp-server\src\__tests__\BlueprintToCADGenerationEngine.test.ts
.claude\worktrees\rgs6-audit-v2
... [+4302 chars truncated]

### User | 2026-06-03T18:09:26.056Z

[tool_result] mcp-server\src\engines\cad-fusion-live\CLAUDE.md
mcp-server\src\engines\cad-fusion-live\TOOLBELT.md
mcp-server\src\engines\cad-fusion-live\PATHS.md
mcp-server\src\engines\cad-fusion-live\MEMORY.md

### User | 2026-06-03T18:09:26.133Z

[tool_result] mcp-server\src\engines\CADToSTEPPipelineEngine.ts
mcp-server\dist.bak-20260504-143257\engines\CADToSTEPPipelineEngine.d.ts
.claude\worktrees\rgs6-audit-v2\mcp-server\src\engines\CADToSTEPPipelineEngine.ts
prism-test-6d0595\mcp-server\src\engines\CADToSTEPPipelineEngine.ts
mcp-server\dist\engines\CADToSTEPPipelineEngine.d.ts

### Assistant | 2026-06-03T18:09:28.436Z

Let me refine my search to focus on the main source directory and check for training-related engines and state files.

### Assistant | 2026-06-03T18:09:28.933Z

[tool_use: Bash]

### User | 2026-06-03T18:09:36.248Z

[tool_result] mcp-server/src/engines/AdaLoRARankAllocatorEngine.ts
mcp-server/src/engines/AdaptivePipelineGeneratorEngine.ts
mcp-server/src/engines/AdditiveManufacturingTribalCorpusEngine.ts
mcp-server/src/engines/AutoFixPipelineEngine.ts
mcp-server/src/engines/AutomatedResourceHarvestingPipeline.ts
mcp-server/src/engines/AutomaticPipelineComposerEngine.ts
mcp-server/src/engines/BlueprintCorpusHarvestEngine.ts

... [+711 chars truncated]

### Assistant | 2026-06-03T18:09:38.450Z

Now let me search for training-related engines more specifically and look for the print→CAD→gcode pipeline orchestration:

### Assistant | 2026-06-03T18:09:39.010Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:09:39.682Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:09:39.740Z

[tool_use: Bash]

### User | 2026-06-03T18:09:48.221Z

[tool_result] mcp-server/src/engines/AdaLoRARankAllocatorEngine.ts
mcp-server/src/engines/AutoAdjustCascadeEngine.ts
mcp-server/src/engines/AutoCADAddinPluginEngine.ts
mcp-server/src/engines/AutoCADDotNetBridgeEngine.ts
mcp-server/src/engines/AutoPrintToProgramBridgeEngine.ts
mcp-server/src/engines/BliskCADEngine.ts
mcp-server/src/engines/BlueprintCorpusHarvestEngine.ts
mcp-server/src/engines/BlueprintCoverageA
... [+18009 chars truncated]

### User | 2026-06-03T18:09:51.495Z

[tool_result] state/shared/agent-coordination/cursors/0bd45e0c-7208-4dfc-bc31-1c4c0402e5d0.json
state/shared/agent-coordination/cursors/0d38abc4-ca1f-4115-8d66-0ee05c3826c4.json
state/shared/agent-coordination/cursors/0ea87a11-8f3e-4542-96b3-33b190a6e4e3.json
state/shared/agent-coordination/cursors/0fd50b2a-77a6-4338-9102-c7e5c58f86a9.json
state/shared/agent-coordination/cursors/1c26793a-2645-45ec-80a5-15f5f540
... [+2059 chars truncated]

### User | 2026-06-03T18:09:52.890Z

[tool_result] mcp-server/src/engines/cad-fusion-live/CLAUDE.md
mcp-server/src/engines/cad-fusion-live/MEMORY.md
mcp-server/src/engines/cad-fusion-live/PATHS.md
mcp-server/src/engines/cad-fusion-live/TOOLBELT.md

### Assistant | 2026-06-03T18:09:57.264Z

Now let me read the key engine files and the cad-fusion-live status docs:

### Assistant | 2026-06-03T18:09:57.708Z

[tool_use: Read]

### Assistant | 2026-06-03T18:09:58.115Z

[tool_use: Read]

### Assistant | 2026-06-03T18:09:58.320Z

[tool_use: Read]

### Assistant | 2026-06-03T18:09:58.587Z

[tool_use: Read]

### User | 2026-06-03T18:10:01.544Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1283 of 3528 total (58432 tokens, cap 25000). Call Read with offset=1284 limit=1283 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * PrintToProgramPipelineEngine — Upload Print → Get CNC Program
3	 *
4	 * The ultimate user-fac
... [+54530 chars truncated]

### User | 2026-06-03T18:10:02.908Z

[tool_result] 1	/**
2	 * PrintToCADOrchestratorEngine — print → CAD draw pipeline composer (PHASE20).
3	 *
4	 * Composes the existing PRISM pieces into one diagnostic pipeline so that
5	 * print-to-CAD failures surface AT THE FAILING STAGE rather than as a
6	 * generic "couldn't draw the part" error. Stages:
7	 *
8	 *   1. Geometry      — STEPGeometryParserEngine.parseFile (PHASE8)
9	 *   2. Features      — STE
... [+10354 chars truncated]

### User | 2026-06-03T18:10:03.049Z

[tool_result] 1	/**
2	 * BlueprintToCADGenerationEngine — CADCAM-DAGI-MS0/U-DAGI08
3	 *
4	 * Print-to-Model pipeline. Converts engineering blueprint images to 3D CAD models.
5	 * Bridges BlueprintVisionOCREngine (vision extraction) with NeuralCADGenerationEngine
6	 * (CAD synthesis) to achieve end-to-end print-to-program capability.
7	 *
8	 * Pipeline:
9	 *   1. Input blueprint image (file, base64, or URL)
10	 
... [+22837 chars truncated]

### User | 2026-06-03T18:10:03.090Z

[tool_result] 1	# CAD-Fusion-Live Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, 2026-05-27 — HONEST STUB)
2	
3	> Auto-loads when editing under `engines/cad-fusion-live/`. **⚠ HONEST STUB.** This galaxy is BRANCH-scoped (cad-fusion-live-ms0 branch active this session — multi-slot work area).
4	
5	## 1. Domain scope
6	
7	CAD-Fusion-Live covers: live Fusion 360 integration (model state polling, parameter bi
... [+1038 chars truncated]

### Assistant | 2026-06-03T18:10:08.513Z

Now let me search for training-related engines and data structures:

### Assistant | 2026-06-03T18:10:09.361Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:10:10.371Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:10:10.431Z

[tool_use: Bash]

### User | 2026-06-03T18:10:21.663Z

[tool_result] Found 41 files
mcp-server\src\engines\QuotingTrainingLoopEngine.ts
mcp-server\src\engines\QuotingTrainingOrchestratorEngine.ts
mcp-server\src\engines\QuotingClosedLoopRunnerEngine.ts
mcp-server\src\engines\QuotingClosedLoopEngine.ts
mcp-server\src\engines\DocustrataHistoricalPricingTrainerEngine.ts
mcp-server\src\engines\QuoteEstimatorEngine.ts
mcp-server\src\engines\MillLoRAPipelineCoordinatorEng
... [+1893 chars truncated]

### User | 2026-06-03T18:10:21.700Z

[tool_result] Found 6 files
mcp-server\src\__tests__\MachiningVisionDiagnostic.test.ts
mcp-server\src\hooks\WEDMSVIHooks.ts
mcp-server\src\__tests__\CAMX-MS0.3-U01-PipelineDecisionOrchestrator.test.ts
mcp-server\src\__tests__\wedm\wedm_whatif_simulator.test.ts
mcp-server\src\__tests__\VIRTUAL-MACHINING.test.ts
mcp-server\src\__tests__\AdaptiveFeedControlEngine.test.ts

### User | 2026-06-03T18:10:23.686Z

[tool_result] mcp-server/src/engines/AdaLoRARankAllocatorEngine.ts
mcp-server/src/engines/AdditiveManufacturingTribalCorpusEngine.ts
mcp-server/src/engines/BlueprintCorpusHarvestEngine.ts
mcp-server/src/engines/BlueprintLoRABridgeEngine.ts
mcp-server/src/engines/CADCorpusFeaturePrevalenceLearnerEngine.ts
mcp-server/src/engines/CADCorpusIngesterEngine.ts
mcp-server/src/engines/CADCorpusIngestionEngine.ts
mcp-ser
... [+6957 chars truncated]

### Assistant | 2026-06-03T18:10:27.148Z

Let me read the key training pipeline orchestrators and examine state files for delta/Fusion status:

### Assistant | 2026-06-03T18:10:27.590Z

[tool_use: Read]

### Assistant | 2026-06-03T18:10:28.051Z

[tool_use: Read]

### Assistant | 2026-06-03T18:10:28.530Z

[tool_use: Bash]

### User | 2026-06-03T18:10:32.162Z

[tool_result] 1	/**
2	 * CADTrainingPipelineOrchestratorEngine — CAD-COMPLETE-MS0/U-CADC19
3	 *
4	 * End-to-end orchestration for CAD ML training pipeline.
5	 * Single entry point: scan → ingest → tokenize → embed → index → validate.
6	 *
7	 * Composes:
8	 *   - CADTrainingCorpusOrchestratorEngine (U-CADC17) for scanning
9	 *   - CADEmbeddingIndexOrchestratorEngine (U-CADC18) for embedding/indexing
10	 *   - Pr
... [+10417 chars truncated]

### User | 2026-06-03T18:10:32.183Z

[tool_result] 1	/**
2	 * PPTrainingDataPipelineEngine — PP-DL-MS0
3	 *
4	 * Extracts machine-readable features from G-code programs for ML training.
5	 * Processes raw G-code text into labeled training records that link to
6	 * the Phase 0 embedding vectors (controller, machine, material, toolpath).
7	 *
8	 * Pipeline stages:
9	 *   1. Parse → tokenize G-code lines into structured blocks
10	 *   2. Classify → i
... [+11203 chars truncated]

### User | 2026-06-03T18:10:39.489Z

[tool_result] mcp-server/src/engines/CrossProcessHierarchicalNeuralOrchestratorEngine.ts: * Graceful degradation: tiers blocked on prerequisites are surfaced in
mcp-server/src/engines/CrossProcessHierarchicalNeuralOrchestratorEngine.ts:          reason: `Engine ${tier.engine_id} not yet built; routed by intent='${route.intent}' but blocked on roadmap prerequisites.`,
mcp-server/src/engines/CrossProcessHierarchi
... [+1879 chars truncated]

### Assistant | 2026-06-03T18:10:46.142Z

Let me search for Fusion CAD generation status and the explicit blocker, then examine training data structures:

### Assistant | 2026-06-03T18:10:48.486Z

[tool_use: Grep]

### Assistant | 2026-06-03T18:10:48.487Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:10:48.493Z

[tool_use: Read]

### User | 2026-06-03T18:10:55.194Z

[tool_result] 1	/**
2	 * Fusion360CADGeneratorAdapter — U-CADC75 (PHASE-6 Fusion 360 Integration)
3	 *
4	 * Typed-CADOperation adapter for Autodesk Fusion 360. Extends
5	 * UnifiedCADCodeGeneratorBase so we get free buildScript pipeline (lineage,
6	 * warnings, parameter tracking) and validateOutput acceptance rules.
7	 *
8	 * Native units: cm + rad. mm/in inputs are converted at emit-time via the
9	 * caller's
... [+6897 chars truncated]

### User | 2026-06-03T18:10:56.551Z

[tool_result] Found 14 files
mcp-server\src\engines\CADSystemNeuralArchAdapterEngine.ts
mcp-server\src\engines\CadCamHandoffEngine.ts
mcp-server\src\engines\CADReasoningChainEngine.ts
mcp-server\src\engines\CADAccuracyValidatorEngine.ts
mcp-server\src\engines\CADRegenerationTestEngine.ts
mcp-server\src\engines\Fusion360CodeGeneratorEngine.ts
mcp-server\src\engines\Fusion360CADGeneratorAdapter.ts
mcp-server\src\
... [+348 chars truncated]

### User | 2026-06-03T18:11:04.964Z

[tool_result] state/shared/handoffs/archive/HANDOFF-claude-23c10eea-delta-cad-fusion-liv.md
state/shared/handoffs/archive/HANDOFF-claude-339c8ff7-delta-docu-print-o.md
state/shared/handoffs/archive/HANDOFF-claude-339c8ff7-delta-docu-print-org.md
state/shared/handoffs/archive/HANDOFF-claude-3ddf0577-delta-command-kernel.md
state/shared/handoffs/archive/HANDOFF-claude-40bfc582-alpha-training-learn.md
state/shared
... [+1906 chars truncated]

### Assistant | 2026-06-03T18:11:08.605Z

Let me check the handoff for CAD+CAM training corpus status and look at key milestone files:

### Assistant | 2026-06-03T18:11:09.045Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:11:09.669Z

[tool_use: Read]

### Assistant | 2026-06-03T18:11:09.553Z

[tool_use: Bash]

### User | 2026-06-03T18:11:11.763Z

[tool_result] EISDIR: illegal operation on a directory, read 'H:\prism\state\shared\specs'

### User | 2026-06-03T18:11:24.575Z

[tool_result] mcp-server/data/data/milestones
mcp-server/data/docs/roadmap
mcp-server/data/docs/roadmap/.roadmap-index-baseline.json
mcp-server/data/docs/roadmap/MCAT-MS0-RGS-roadmap.md
mcp-server/data/docs/roadmap/ULTIMATE-SHOP-OS-roadmap.md
mcp-server/data/ingestion_cache/audit-findings/revenue-roadmap
mcp-server/data/ingestion_cache/revenue-roadmap
mcp-server/data/lathe-agi-roadmap.md
mcp-server/data/milesto
... [+505 chars truncated]

### User | 2026-06-03T18:11:27.330Z

[tool_result] state/shared/handoffs/archive/HANDOFF-claude-40bfc582-alpha-training-learn.md
state/shared/handoffs/archive/HANDOFF-claude-48e5d403-alpha-training-learn.md
state/shared/handoffs/archive/HANDOFF-claude-a614edfb-hotel-ai-training-fi.md
state/shared/handoffs/CONTINUE-CAD.md
state/shared/handoffs/HANDOFF-Agent@DESKTOP-N7MI1VB_886b29dd-130b-4699-b2ca-f458a48094f8-cam-ai-training-ms0.md
state/shared/han
... [+4589 chars truncated]

### Assistant | 2026-06-03T18:11:30.660Z

Let me read the key handoff and milestone files to understand the training pipeline status:

### Assistant | 2026-06-03T18:11:31.608Z

[tool_use: Bash]

### Assistant | 2026-06-03T18:11:31.086Z

[tool_use: Read]

### Assistant | 2026-06-03T18:11:31.335Z

[tool_use: Bash]

### User | 2026-06-03T18:11:38.708Z

[tool_result] 1	# CONTINUE CAD — Session Trigger Handoff
2	
3	> **Trigger:** When user types `continue cad work` (or `continue cad`) in any new Claude Code chat, read this file and execute the RESUME directive below verbatim. This is the canonical CAD-track resume point.
4	
5	**Last updated:** 2026-05-05 by claude-647e5dea — XPROC bridges complete (5/5), XPROC-NEURAL Tier-1 nearly complete (T1-01..T1-03 committ
... [+18681 chars truncated]

### User | 2026-06-03T18:12:07.220Z

[tool_result] -rw-r--r-- 1 wompu 197611  4096 Jun  3 09:18 state/shared/handoffs/HANDOFF-claude-fd2dc2f2-india-psn-synergy-co.md
-rw-r--r-- 1 wompu 197611  1803 Jun  3 09:20 state/shared/handoffs/HANDOFF-claude-ee6ed961-db-coverage-gapfill-.md
-rw-r--r-- 1 wompu 197611  4096 Jun  3 09:23 state/shared/handoffs/HANDOFF-claude-d5f2ac5e-alpha-psn-synergy-co.md
-rw-r--r-- 1 wompu 197611  1404 Jun  3 09:30 state/shar
... [+1925 chars truncated]

### User | 2026-06-03T18:12:07.226Z

[tool_result] mcp-server/data/milestones/AHMAD-LLM-CURRICULUM-ACADEMY-MS0.json
mcp-server/data/milestones/CAD-AI-DEEP.json
mcp-server/data/milestones/CAD-AI-ULTRA.json
mcp-server/data/milestones/CAD-AUTOMATION-MS0.json
mcp-server/data/milestones/CAD-CAM-MASTER.json
mcp-server/data/milestones/CAD-CAM-UNIFIED-ROADMAP.md
mcp-server/data/milestones/CAD-COMPLETE-MS0-PLAN.md
mcp-server/data/milestones/CAD-COMPLETE-MS
... [+118 chars truncated]

### Assistant | 2026-06-03T18:12:17.896Z

Excellent. Now let me read the CAD-FUSION-LIVE handoffs and the CAD-COMPLETE-MS0 milestone to understand the explicit blockers:

### Assistant | 2026-06-03T18:12:18.939Z

[tool_use: Read]

### Assistant | 2026-06-03T18:12:18.943Z

[tool_use: Read]

### Assistant | 2026-06-03T18:12:19.073Z

[tool_use: Bash]

### User | 2026-06-03T18:12:23.660Z

[tool_result] 1	---
2	session: claude-b502aa8d
3	topic: charlie-cad-fusion-live-ms0
4	slot: charlie
5	written_at: 2026-06-03T17:39:28.159Z
6	machine: DESKTOP-N7MI1VB
7	family: Claude
8	session_key: claude-b502aa8d
9	status: active
10	---
11	
12	# HANDOFF: claude-b502aa8d
13	Updated: 2026-06-03T17:39:28.160Z
14	Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-b502aa8d
15	
16	## STATE
17	(precompact au
... [+3766 chars truncated]

### User | 2026-06-03T18:12:23.962Z

[tool_result] 1	{
2	  "schemaVersion": 2,
3	  "id": "CAD-COMPLETE-MS0",
4	  "title": "Complete CAD Capability — Universal Index + Multi-System Generation + Regeneration Test",
5	  "track": "CAD-COMPLETE",
6	  "status": "in_progress",
7	  "created_at": "2026-04-19",
8	  "updated_at": "2026-05-24",
9	  "target_omega": 1,
10	  "scrutiny_score": 1,
11	  "scrutiny_rounds": 17,
12	  "enhancements_applied": [
13	    "
... [+11629 chars truncated]

### User | 2026-06-03T18:12:31.836Z

[tool_result] mcp-server/src/engines/BlueprintLoRABridgeEngine.ts: * LoRA export bundle producer. Selects ground-truth training pairs from the
mcp-server/src/engines/BlueprintLoRABridgeEngine.ts:   * Select training pairs from the registry at the given confidence tier and
mcp-server/src/engines/CADCorpusIngesterEngine.ts: * training corpus. Each corpus entry pairs a tokenized CAD program
mcp-server/src/engines/
... [+2077 chars truncated]

### Assistant | 2026-06-03T18:13:20.304Z

Perfect. Now I have enough context. Let me compile the comprehensive investigation report based on all the findings:

## PRISM Print→CAD→Gcode→CAD-Generation Training Pipeline: Status Investigation

Based on thorough investigation of engines, state files, and handoffs, here is the complete readiness assessment:

---

### 1. TRAINING HARNESSES & ENGINES (WHAT EXISTS)

**Print→CAD→Gcode Pipeline Orchestrators:**
- **PrintToProgramPipelineEngine** (mcp-server/src/engines/PrintToProgramPipelineEngine.ts:1-1283+) — **COMPLETE & PRODUCTION-READY** (58K lines). Full print→program pipeline with 5 stages: intake validation → feature classification → process planning → G-code generation → validation+output. Integrates physics (Kienzle, Taylor), tool selection (SmartToolSelectorEngine), speed/feed, workholding, chatter analysis, setup sheets.
- **PrintToCADOrchestratorEngine** (mcp-server/src/engines/PrintToCADOrchestratorEngine.ts:1-229) — **PHASE-20 PIPELINE-ONLY, NO EXECUTION**. 5-stage pre-flight diagnosis: geometry parsing → feature evidence → part class → build plan → CAD system routing. Returns per-stage pass/fail WITHOUT driving live CAD generation. No live execution (U-CAD-PHASE-16 `cad_class_drive_build` does that for Fusion only).
- **BlueprintToCADGenerationEngine** (mcp-server/src/engines/BlueprintToCADGenerationEngine.ts:1-675) — **PARTIALLY STUBBED**. Bridges vision OCR + NeuralCADGenerationEngine for print→3D model. Wraps NeuralCADGenerationEngine (which is NOT wired for Fusion 360 yet — see blocker below).
- **Fusion360CADGeneratorAdapter** (mcp-server/src/engines/Fusion360CADGeneratorAdapter.ts:1-200+) — **PURE CODE-EMIT ONLY** (U-CADC75). Generates Python scripts for Fusion 360 API from typed CADOperation[] — does NOT run live generation, only produces script text.

**CAD Training Corpus & LoRA Engines (115+ total):**
- **CADTrainingPipelineOrchestratorEngine** (mcp-server/src/engines/CADTrainingPipelineOrchestratorEngine.ts:1-300+) — **CORPUS→INDEX PIPELINE
... [+12889 chars truncated]
