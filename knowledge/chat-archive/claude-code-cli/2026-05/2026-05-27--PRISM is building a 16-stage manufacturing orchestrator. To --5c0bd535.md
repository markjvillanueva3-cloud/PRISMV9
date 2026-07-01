---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c0bd535-0ecb-4744-9e62-ac1ea40fbe71"
title: "PRISM is building a 16-stage manufacturing orchestrator. To make the pipeline AD"
date: "2026-05-27"
first_ts: "2026-05-27T01:03:17.009Z"
last_ts: "2026-05-27T01:05:51.566Z"
cwd: "H:\\PRISM"
messages: 69
user_msgs: 30
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-aa62e26085a4d1da9.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# PRISM is building a 16-stage manufacturing orchestrator. To make the pipeline AD

> **claude-code-cli** | 2026-05-27 | 69 msgs (30 user / 39 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-aa62e26085a4d1da9.jsonl`

## Transcript

### User | 2026-05-27T01:03:17.009Z

PRISM is building a 16-stage manufacturing orchestrator. To make the pipeline ADAPTIVE, each stage needs an OBSERVABLE SIGNAL the system can use to update its policy.

Your job: for each pipeline stage, identify (a) what's observable in production, (b) the timescale of the signal (immediate / per-part / per-batch / per-shift / per-quarter), (c) what model update the signal can drive.

Stages:
1. INPUT (RFQ)
2. MATERIAL-RESOLVE
3. FEASIBILITY-GATE
4. CAD
5. SETUP-PLAN
6. METHOD-ROUTER (CAM/macro/conversational/on-machine)
7. CAM-STRATEGY (200+ toolpaths)
8. SSF (speed/feed/chatter)
9. TOOL-CRIB
10. POST
11. SETUP-VALIDATION
12. SIM/QA
13. FAI-GATE
14. SECONDARY-OPS
15. EXECUTE (MACHINE_RUN)
16. ERP/COST + QUOTE

READ-ONLY search:
- H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md (find *Sensor*, *Observ*, *Probe*, *CMM*, *Acoustic*, *Spindle*, *MTConnect*, *FirstPart*, *Outcome*, *Telemetry*)
- H:/prism/mcp-server/src/engines/ (sensor/probe/observation engines)
- H:/prism/knowledge/wiki/code-tribal/canonical/ (operator-observable rules)
- H:/prism/mcp-server/data/state/ (any telemetry state files)

Under 500 words, organize as a table per stage:

| Stage | Observable signal(s) | Capture mechanism (engine/skill/manual) | Signal latency | Model update target |
|---|---|---|---|---|

Examples to seed your thinking (verify before using):
- SSF: spindle-load curve + acoustic + first-cut surface Ra → updates Kienzle kc1.1 + chatter envelope (Bayesian per material/spindle/tool combo). Latency: 30sec post-first-cut. Engine: MTConnectIngester (○ ghost per system-viz audit).
- METHOD-ROUTER: operator-actual-completion-time per method choice vs predicted → updates method-preference posterior. Latency: per-part. Engine: ATCS outcome capture.
- TOOLPATH: cycle-time-actual vs predicted (delta) → updates toolpath selector weights (contextual bandit). Latency: per-part.
- FAI-GATE: CMM-measured-vs-spec → updates per-feature tolerance achievability. Latency: per-part. Engine: CMMParser
... [+719 chars truncated]

### Assistant | 2026-05-27T01:03:22.624Z

I'll search the PRISM codebase systematically to identify what observables are currently instrumented, what the teams know about signal capture, and what adaptive mechanisms exist.

### Assistant | 2026-05-27T01:03:22.937Z

[tool_use: Read]

### Assistant | 2026-05-27T01:03:23.086Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:03:23.407Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:03:23.450Z

[tool_use: Glob]

### User | 2026-05-27T01:03:24.347Z

[tool_result] knowledge\wiki\code-tribal\canonical\hypermill-contour-milling-milling-open-and-closed-contours-w.md
knowledge\wiki\code-tribal\canonical\hypermill-horizontal-fixed-step-the-value-defined-under-late.md
knowledge\wiki\code-tribal\canonical\hypermill-horizontal-horizontal-stepover-infeed-in-the-xy-pl.md
knowledge\wiki\code-tribal\canonical\hypermill-pencil-pencil-milling-page-997-automatic-detection
... [+8852 chars truncated]

### User | 2026-05-27T01:03:24.886Z

[tool_result] mcp-server\data\state\S1-MS1\scrutiny-log.json
mcp-server\data\state\AUTOMATION_CENSUS.json
mcp-server\data\state\WIRE-MS0\frontend-coverage-audit.json
mcp-server\data\state\WEDM_BATCH_ANALYSIS.json
mcp-server\data\state\POST_PROCESSOR_KNOWLEDGE_EXTRACT.json
mcp-server\data\state\JM_DIE_POST_PROCESSOR_TRIBAL_KNOWLEDGE.json
mcp-server\data\state\ONLINE_POST_PROCESSOR_KNOWLEDGE.json
mcp-server\data\
... [+4821 chars truncated]

### User | 2026-05-27T01:03:24.891Z

[tool_result] mcp-server\src\engines\BatchProcessor.ts
mcp-server\src\engines\DfMRulesEngine.ts
mcp-server\src\engines\DiffEngine.ts
mcp-server\src\engines\FinancialAnalysisEngine.ts
mcp-server\src\engines\GCodeTemplateEngine.ts
mcp-server\src\engines\IntentDecompositionEngine.ts
mcp-server\src\engines\PurchasingDirectoryEngine.ts
mcp-server\src\engines\SpindleProtectionEngine.ts
mcp-server\src\engines\Sustaina
... [+4307 chars truncated]

### User | 2026-05-27T01:03:26.762Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\data\docs\ENGINE_DIGEST.md' was already read 26m ago in this session and is unchanged (mtime 1779784243803). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-27T01:03:28.760Z

I'll refocus on the specific engines and documents related to observable signals in the pipeline.

### Assistant | 2026-05-27T01:03:29.973Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:03:30.320Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:03:30.549Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:03:31.119Z

[tool_use: Grep]

### User | 2026-05-27T01:03:35.561Z

[tool_result] Found 90 files
mcp-server\data\docs\DISPATCHER_DIGEST.md
mcp-server\data\docs\ENGINE_DIGEST.md
mcp-server\data\docs\HYPERMILL_SDK_REFERENCE.md
mcp-server\data\docs\CODE_SYSTEM_INDEX.json
mcp-server\data\docs\DIRECTORY_DIGEST.md
mcp-server\data\docs\ppg\MIGRATION-sidecar-bridge.md
mcp-server\data\docs\PRISM-UNIFIED-ROADMAP-v2.md
mcp-server\data\docs\gsd\GSD_MICRO.md
mcp-server\data\docs\gsd\DEV_PRO
... [+4807 chars truncated]

### User | 2026-05-27T01:03:35.996Z

[tool_result] Found 15 files limit: 15
knowledge\wiki\code-tribal\learnings\dream-receipt-ms0-u-dr08-psn-synergy.md
knowledge\wiki\code-tribal\learnings\domain-galaxy-doctrine-ms1-u-galaxy-ms1-e2-counter-domain-dim.md
knowledge\wiki\code-tribal\learnings\speed-feed-ms0-u-sfm81-joint-optimize.md
knowledge\wiki\code-tribal\learnings\dream-receipt-ms0-u-dr08.md
knowledge\wiki\code-tribal\learnings\token-context-fo
... [+953 chars truncated]

### User | 2026-05-27T01:03:36.904Z

[tool_result] AutomationChainTelemetryEngine.ts  16.0K
CADExecutionOutcomeBusEngine.ts  9.1K
CADInstallationProbeEngine.ts  13.4K
CrossProcessOutcomeStore.ts  32.3K
HookTelemetryEngine.ts  20.8K
HyperCADSOutcomePublisherEngine.ts  7.0K
LatheOnMachineProbeCycleEngine.ts  5.6K
MTConnectAdapterEngine.ts  25.0K
MTConnectLiveStatusEngine.ts  5.9K
MTConnectRoundTripLatencyBenchEngine.ts  12.8K
MTConnectToOutcomeBridg
... [+1239 chars truncated]

### User | 2026-05-27T01:03:43.875Z

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

### Assistant | 2026-05-27T01:03:45.945Z

Let me search more strategically in the key engines for observable signal handling.

### Assistant | 2026-05-27T01:03:46.655Z

[tool_use: Read]

### Assistant | 2026-05-27T01:03:46.777Z

[tool_use: Read]

### Assistant | 2026-05-27T01:03:47.218Z

[tool_use: Read]

### Assistant | 2026-05-27T01:03:48.022Z

[tool_use: Grep]

### User | 2026-05-27T01:03:52.501Z

[tool_result] 1	/**
2	 * OutcomeRLBridgeEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN12
3	 *
4	 * The reinforcement-learning fan-out bridge. Closes the gap where the three
5	 * cross-process RL kernels — `CrossProcessRewardShaperEngine` (T4-01),
6	 * `CrossProcessQLearningTabularEngine` (T4-02), `CrossProcessPolicyGradientEngine`
7	 * (T4-03) and `CrossProcessMultiArmedBanditEngine` (T4-04) — were dispatcher-wired
8
... [+5351 chars truncated]

### User | 2026-05-27T01:03:52.584Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Probe Routine Engine
3	 *
4	 * Auto-generates Renishaw-style touch probe macros for CNC machines.
5	 * NOVEL: No CAM post-processor generates probe routines from part geometry.
6	 *
7	 * Supported controllers (6):
8	 *   Fanuc, Haas      — G65 P98xx macro calls, DPRNT output
9	 *   Siemens 840D     — CYCLE977/978/982, MSG output
10	 *   Heidenhain TNC   — TCH PROBE xx
... [+2492 chars truncated]

### User | 2026-05-27T01:03:56.236Z

[tool_result] 1	/**
2	 * MTConnectAdapterEngine
3	 *
4	 * HTTP/XML adapter for MTConnect-enabled CNC machines.
5	 * MTConnect is the dominant US CNC data standard — most Haas, Mazak,
6	 * Okuma, and Doosan machines ship with MTConnect agents.
7	 *
8	 * Capabilities:
9	 * 1. probe()     — Discover machine's MTConnect device model (axes, components, data items)
10	 * 2. current()   — Get current snapshot of all d
... [+2937 chars truncated]

### User | 2026-05-27T01:03:56.636Z

[tool_result] 63:- [S1] Collision detection gate added to ALL G-code pipelines (Lane 0, PP-H0)
88:- [E18] Spark gap unification: use ElectrodeDesignEngine stage-based values (Lane 7)
89:- [E19] Electrode inspection stage added BETWEEN milling and sinker burn (Lane 7)
105:- [K31] Safety gate between extraction pipelines and live registries (Lanes 3-5)
110:- [SC34] Electrode pipeline increased from 6 to 9 session
... [+6593 chars truncated]

### Assistant | 2026-05-27T01:03:59.391Z

I need to look at specific stage-related documents and understand the current observables architecture.

### Assistant | 2026-05-27T01:04:00.259Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:04:00.772Z

[tool_use: Read]

### Assistant | 2026-05-27T01:04:01.114Z

[tool_use: Bash]

### User | 2026-05-27T01:04:06.166Z

[tool_result] 1	# PRISM App Pipeline Schema
2	> Full wiring diagram: Engine → Dispatcher → Route → API Client → Hook → Page
3	> Generated: 2026-03-14 | 15 features | 941 engines | 66 dispatchers | 2069 actions
4	
5	## Architecture Layers
6	
7	```
8	┌─────────────────────────────────────────────────────────────────┐
9	│  LAYER 7: WEB UI (React 19 + Vite + TailwindCSS)               │
10	│  15 pages, 15 hooks, 16
... [+7939 chars truncated]

### User | 2026-05-27T01:04:07.257Z

[tool_result] Found 30 files limit: 30
mcp-server\src\engines\business\CLAUDE.md
mcp-server\src\engines\lathe\CLAUDE.md
mcp-server\src\engines\mill\CLAUDE.md
mcp-server\src\engines\DepartmentEngine.ts
mcp-server\src\engines\MonolithMachineSpecStandardEngine.ts
mcp-server\src\engines\MonolithFixtureDatabaseEngine.ts
mcp-server\src\engines\MonolithToolTypesDatabaseEngine.ts
mcp-server\src\engines\DreamMarkerScann
... [+1269 chars truncated]

### User | 2026-05-27T01:04:11.277Z

[tool_result] FINDSTR: Cannot open stage

### Assistant | 2026-05-27T01:04:14.016Z

Let me read ENGINE_DIGEST to get a comprehensive overview of what observables are already in place.

### Assistant | 2026-05-27T01:04:14.174Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:04:15.475Z

[tool_use: Read]

### User | 2026-05-27T01:04:20.398Z

[tool_result] 1	# ENGINE DIGEST
2	## 3217 engines indexed
3	## Auto-generated: 2026-05-12 (manually appended 4 entries for TRAINING-LEARNING-MS0/U-TL-U5..U6)
4	
5	- **AbrasiveJetMachiningEngine**: Physics-Based Abrasive Waterjet Prediction
6	- **AbsorptionChillerEngine**: Absorption refrigeration cycle analysis
7	- **AbstractionHierarchyEngine**: Multi-level tip→principle→law generalization
8	- **AccessControlL
... [+17887 chars truncated]

### User | 2026-05-27T01:04:23.235Z

[tool_result] 3227

### Assistant | 2026-05-27T01:04:25.468Z

Let me now strategically search for what stage-specific observable mechanisms exist in PRISM today.

### Assistant | 2026-05-27T01:04:26.794Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:04:27.271Z

[tool_use: Read]

### Assistant | 2026-05-27T01:04:27.892Z

[tool_use: Read]

### User | 2026-05-27T01:04:33.274Z

[tool_result] 1	/**
2	 * SpeedFeedOutcomeFeedbackBridgeEngine — closes the dangling outcome-feedback
3	 * wire identified by audit F9 from SF-PSN-VALUE-NODE-AUDIT-2026-05-22.
4	 *
5	 * Background: `sfcOutcomeWire.captureSFC()` is imported by 5 SF engines but
6	 * NOT by `SpeedFeedDeepLearningEngine` (SF-AI-L1), which holds the
7	 * `calibrationFactors` self-learning state. Outcomes are captured at the
8	 * calc
... [+2141 chars truncated]

### User | 2026-05-27T01:04:33.276Z

[tool_result] 1	/**
2	 * OutcomeCaptureBusEngine — U-LEARN-01
3	 * =====================================
4	 *
5	 * Universal cross-domain event bus for every outcome PRISM observes.
6	 * This is the spine of the learning loop: every physics/CAM/CAD/PP/SFC/
7	 * shop-floor signal that matters to future improvements is appended
8	 * here as a typed, versioned, provenance-tagged event.
9	 *
10	 * Consumers (built 
... [+3210 chars truncated]

### User | 2026-05-27T01:04:34.973Z

[tool_result] Found 25 files limit: 25
mcp-server\src\engines\quoting\CLAUDE.md
mcp-server\src\engines\EmployeeMachineDomainAcademyEngine.ts
mcp-server\src\engines\MasterPostProcessorUnifiedAGIEngine.ts
mcp-server\src\engines\InstantQuoteEngine.ts
mcp-server\src\engines\UltimateSpeedFeedEngine.ts
mcp-server\src\engines\SpeedFeedChatterStabilityAdapterEngine.ts
mcp-server\src\engines\JMDieErpSimulationEngine.ts

... [+965 chars truncated]

### Assistant | 2026-05-27T01:04:37.073Z

Now let me search for cross-stage signal flow and what the current pipelines capture.

### Assistant | 2026-05-27T01:04:38.164Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:04:38.612Z

[tool_use: Read]

### Assistant | 2026-05-27T01:04:39.023Z

[tool_use: Bash]

### User | 2026-05-27T01:04:44.011Z

[tool_result] 1	# PRISM Dispatcher Digest
2	
3	**104 dispatchers** route MCP actions to engines.
4	Each dispatcher handles a specific manufacturing/system domain.
5	Auto-generated: 2026-05-27 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
6	Total actions across all dispatchers: **13455**.
7	
8	## Dispatcher Map
9	
10	| Dispatcher | Domain | Actions |
11	|-----------|--------|----
... [+11093 chars truncated]

### User | 2026-05-27T01:04:44.525Z

[tool_result] Found 9 files
mcp-server\src\engines\LatheThermodynamicsEngine.ts
mcp-server\src\engines\ModelRoutingEngine.ts
mcp-server\src\engines\FeedbackBusEngine.ts
mcp-server\src\engines\LatheActiveLearningEngine.ts
mcp-server\src\engines\DisasterRecoveryEngine.ts
mcp-server\src\engines\InventorCAMStrategyEngine.ts
mcp-server\src\engines\EnsembleModelSelectorEngine.ts
mcp-server\src\engines\AlgorithmGatewa
... [+58 chars truncated]

### User | 2026-05-27T01:04:48.865Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-05-27T01:04:52.514Z

Let me now synthesize findings by searching for specific cross-domain outcome patterns and compile my analysis.

### Assistant | 2026-05-27T01:04:53.829Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:04:54.081Z

[tool_use: Read]

### Assistant | 2026-05-27T01:04:54.343Z

[tool_use: Read]

### User | 2026-05-27T01:04:57.964Z

[tool_result] 1	/**
2	 * CADExecutionOutcomeBusEngine — U-CADC-LP01 / CAD-COMPLETE-MS0
3	 *
4	 * CAD-specific outcome bus. Dual-channel emitter:
5	 *   1. Durable channel — every published outcome is also forwarded to the
6	 *      universal OutcomeCaptureBus (cad shard, kind=cad_execution_outcome)
7	 *      so downstream offline learners (LP03/LP04 + neural-ledger pipelines)
8	 *      can re-read history.
9	 *
... [+2621 chars truncated]

### User | 2026-05-27T01:04:57.985Z

[tool_result] 1	/**
2	 * MeasurementReconciliationEngine — apply real-world measurements (caliper,
3	 * CMM, mic, gage block) to a parametric CAD template, overwriting the named
4	 * params and re-emitting CADOperation[] with overrides applied. Flags
5	 * geometric contradictions.
6	 *
7	 * Companion to PartMediaToCADEngine — closes the (e) clause from the dedup
8	 * scout: operator photographs part → gets star
... [+2256 chars truncated]

### User | 2026-05-27T01:04:59.567Z

[tool_result] Found 10 files
mcp-server\src\engines\PartMediaToCADEngine.ts
mcp-server\src\engines\MeasurementReconciliationEngine.ts
mcp-server\src\engines\CADDrawAnyPartOrchestratorEngine.ts
mcp-server\src\engines\CADRegenFeedbackAdapterEngine.ts
mcp-server\src\engines\HyperCADSOutcomePublisherEngine.ts
mcp-server\src\engines\CADPerAdapterFeedbackCollectorEngine.ts
mcp-server\src\engines\CADExecutionOutcomeBu
... [+175 chars truncated]

### Assistant | 2026-05-27T01:05:02.288Z

Let me now do a final comprehensive search to identify what observables are captured at each stage and compile the findings.

### Assistant | 2026-05-27T01:05:03.606Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:05:04.056Z

[tool_use: Read]

### Assistant | 2026-05-27T01:05:04.650Z

[tool_use: Bash]

### User | 2026-05-27T01:05:12.352Z

[tool_result] 1	/**
2	 * PRISM MCP Server — Chatter Prediction Engine
3	 *
4	 * Stability analysis for machine tool chatter:
5	 * - Stability lobe diagram generation (Altintas/Tlusty)
6	 * - Chatter detection from vibration signal (DFT spectral analysis)
7	 * - Critical speed analysis for rotating shafts
8	 *
9	 * Ported from PRISM_CHATTER_PREDICTION_ENGINE.js (monolith R2.3.1).
10	 *
11	 * @module ChatterPredi
... [+1923 chars truncated]

### User | 2026-05-27T01:05:13.214Z

[tool_result] Found 20 files limit: 20
mcp-server\src\engines\CatalogUnifiedQueryEngine.ts
mcp-server\src\engines\MonolithSurfaceFinishDatabaseEngine.ts
mcp-server\src\engines\SpeedFeedShopLibraryBridgeEngine.ts
mcp-server\src\engines\MasterPostProcessorUnifiedAGIEngine.ts
mcp-server\src\engines\FeatureInteractionEngine.ts
mcp-server\src\engines\ShippingReceivingLogEngine.ts
mcp-server\src\engines\InspectionRep
... [+749 chars truncated]

### User | 2026-05-27T01:05:15.299Z

[tool_result] H:\prism\mcp-server\src\engines/CADExecutionOutcomeBusEngine.ts
H:\prism\mcp-server\src\engines/CADPerAdapterFeedbackCollectorEngine.ts
H:\prism\mcp-server\src\engines/CADRegenFeedbackAdapterEngine.ts
H:\prism\mcp-server\src\engines/CADToleranceSignalEncoderEngine.ts
H:\prism\mcp-server\src\engines/CAMFeedbackLoopEngine.ts
H:\prism\mcp-server\src\engines/ConsensusNeuralFeedbackEngine.ts
H:\prism\m
... [+528 chars truncated]

### Assistant | 2026-05-27T01:05:51.566Z

Now I have enough evidence. Let me compile the comprehensive observable signals table for the 16-stage pipeline.

Based on my READ-ONLY search of the PRISM codebase, here are the **observable signals per pipeline stage** that enable adaptive model updates:

| Stage | Observable signal(s) | Capture mechanism (engine/skill/manual) | Signal latency | Model update target | Priority |
|---|---|---|---|---|---|
| **1. INPUT (RFQ)** | RFQ completeness (fields filled), material family, geometry complexity, quote accuracy delta | IntakeDispatcher + BusinessDocumentExtractorEngine (OCR) | per-RFQ | Quote prediction posterior (feature → difficulty classifier); material-selector priors | P1 |
| **2. MATERIAL-RESOLVE** | Actual material grade confirmed (vs predicted), hardness/machinability validation, supplier catalog accuracy | MaterialEquivalenceEngine, HardnessConversionEngine | per-part | Material-family classifier; hardness-to-machinability curve confidence | P1 |
| **3. FEASIBILITY-GATE** | Feasibility verdict (passable/redesign), workholding retry count, geometric constraint violations | FeasibilityDispatcher + WorkholdingIntelligenceEngine | per-part | Workholding-selector policy; CAD-geometry-to-difficulty mapper | P1 |
| **4. CAD** | CAD regeneration success rate, collision detection outcomes, feature recognition confidence, design-time fidelity (blueprint→CAD delta) | CADExecutionOutcomeBusEngine, CADRegenFeedbackAdapterEngine, CollisionDetectionEngine, MeasurementReconciliationEngine | per-execution / post-design | CAD-generation model weights (feature-to-operation); fixture design confidence | P0 |
| **5. SETUP-PLAN** | Setup-time predicted vs actual (from operator logs), workholding-change count, WCS-probe success, tool-pre-staging misses | SetupSheetEngine, ProbeRoutineEngine (WCS probe macro results) | per-setup | Setup-duration regression; workholding-selector MAB arms; probe-routine parameter optimizer | P1 |
| **6. METHOD-ROUTER** | Operator-selected method v
... [+7585 chars truncated]
