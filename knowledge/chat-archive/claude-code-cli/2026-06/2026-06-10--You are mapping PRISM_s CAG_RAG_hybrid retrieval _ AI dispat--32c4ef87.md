---
type: "chat-session"
source: "claude-code-cli"
session_id: "32c4ef87-567e-4db1-aef8-17e4186ddcf6"
title: "You are mapping PRISM's CAG/RAG/hybrid retrieval + AI dispatcher surface for a s"
date: "2026-06-10"
first_ts: "2026-06-10T21:38:34.442Z"
last_ts: "2026-06-10T21:40:43.489Z"
cwd: "H:\\PRISM"
messages: 72
user_msgs: 31
assistant_msgs: 41
raw_file: "H:/.claude/projects/H--prism/32c4ef87-567e-4db1-aef8-17e4186ddcf6/subagents/agent-ab84d26b290baed5e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:10"
---

# You are mapping PRISM's CAG/RAG/hybrid retrieval + AI dispatcher surface for a s

> **claude-code-cli** | 2026-06-10 | 72 msgs (31 user / 41 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/32c4ef87-567e-4db1-aef8-17e4186ddcf6/subagents/agent-ab84d26b290baed5e.jsonl`

## Transcript

### User | 2026-06-10T21:38:34.442Z

You are mapping PRISM's CAG/RAG/hybrid retrieval + AI dispatcher surface for a synergy audit. Repo root: H:\PRISM. Search breadth: medium.

YOUR TASK — answer concretely with file:line citations:

1. **CAG (Cache-Augmented Generation)**: There's a live CAG router hook (it injected "CAG-route: HYBRID" this session). Find it: search `.claude/hooks/*cag*` and `scripts/**/*cag*` and `mcp-server/src/engines/**/*Cag*` / `*CAG*` / `*CacheAugment*`. What does the CAG router do? Is it fleet-global or per-galaxy? Read the router engine/hook enough to summarize its routing decision (HYBRID/CAG/RAG).

2. **RAG**: Find RAG engines/pipelines. Search `mcp-server/src/engines/**/*Rag*.ts`, `*Retrieval*`, `*HybridSearch*`. Is there a RAG-HYBRID system? Read enough of one to report dense+sparse arms. Per-galaxy or global corpus?

3. **AI dispatchers**: What MCP dispatcher actions expose AI? Look at `mcp-server/src/tools/dispatchers/` for files like `aiDispatcher.ts`, `intelligenceDispatcher.ts`, or grep dispatcher files for actions named `*deep_learning*`, `*deep_reasoning*`, `*neural*`, `*lora*`, `*rag*`, `*cag*`, `*ai_capability*`. List the relevant dispatchers + a sample of their AI action names. Cite the file. Which dispatcher would a new "ai_synergy_audit" action best belong to?

4. **Existing AI capability reporting**: Grep for `ai_capability`, `aiCapability`, `AICapability` across `mcp-server/src/`. Is there an existing engine that computes/reports AI capability metrics? Read its public methods. Does it operate per-galaxy or globally?

5. **xproc / cross-process neural learning**: There's a wiki note "xproc-neural-learning-layer". Search `mcp-server/src/engines/**/*Xproc*` / `*CrossProcess*` and scripts. Briefly: what is it and is it galaxy-aware?

Return a tight structured report: CAG router summary, RAG/hybrid summary, the AI dispatcher map (with the best dispatcher to wire a new audit action into), any existing AI-capability reporting engine (so we don't duplicate), and xpro
... [+106 chars truncated]

### Assistant | 2026-06-10T21:38:35.858Z

I'll systematically search the PRISM codebase to map the CAG/RAG/hybrid retrieval and AI dispatcher surface. Let me start with multiple parallel searches.

### Assistant | 2026-06-10T21:38:36.072Z

[tool_use: Glob]

### Assistant | 2026-06-10T21:38:36.263Z

[tool_use: Glob]

### Assistant | 2026-06-10T21:38:36.770Z

[tool_use: Glob]

### Assistant | 2026-06-10T21:38:36.778Z

[tool_use: Glob]

### User | 2026-06-10T21:38:47.795Z

[tool_result] .claude\hooks\cag-soul-cache-block.mjs
.claude\hooks\cag-injectors-consume.test.mjs
.claude\hooks\cag-cold-cache-anchor.mjs
.claude\hooks\cag-cold-cache-anchor.test.mjs
.claude\hooks\cag-router-inject.test.mjs
.claude\hooks\cag-router-inject.mjs

### User | 2026-06-10T21:38:47.881Z

[tool_result] No files found

### User | 2026-06-10T21:38:47.990Z

[tool_result] scripts\cag-stats-aggregator.mjs
scripts\cag-stats-aggregator.test.mjs
scripts\generate-cag-router-features.mjs
scripts\generate-cag-router-features.test.mjs
scripts\lib\cag-router.test.mjs
scripts\lib\cag-router.mjs

### User | 2026-06-10T21:38:48.035Z

[tool_result] No files found

### Assistant | 2026-06-10T21:38:50.236Z

Let me search more broadly for engine files:

### Assistant | 2026-06-10T21:38:50.442Z

[tool_use: Glob]

### Assistant | 2026-06-10T21:38:50.892Z

[tool_use: Grep]

### Assistant | 2026-06-10T21:38:51.289Z

[tool_use: Grep]

### User | 2026-06-10T21:38:52.995Z

[tool_result] Found 100 files
mcp-server\src\engines\HyperMillToolExportEngine.ts
mcp-server\src\engines\IdeaBlockGovernanceEngine.ts
mcp-server\src\engines\PolicyExperienceLedgerEngine.ts
mcp-server\src\engines\ToolCatalogEngine.ts
mcp-server\src\engines\OllamaCapabilityProbeEngine.ts
mcp-server\src\engines\AISystemRouterEngine.ts
mcp-server\src\engines\IdeaBlockExtractorEngine.ts
mcp-server\src\engines\Machin
... [+4876 chars truncated]

### User | 2026-06-10T21:38:53.186Z

[tool_result] Found 74 files
web\playwright\a11y.spec.ts
mcp-server\src\engines\SoulHtmlRenderEngine.ts
mcp-server\src\__tests__\HaversineDistanceAlgorithm.test.ts
.claude\plugins\cache\nyldn-plugins\octo\9.38.0\scripts\token-extraction\pipeline.ts
.claude\plugins\cache\nyldn-plugins\octo\9.38.0\scripts\token-extraction\outputs\markdown.ts
.claude\plugins\cache\nyldn-plugins\octo\9.38.0\scripts\token-extraction
... [+4633 chars truncated]

### User | 2026-06-10T21:38:58.004Z

[tool_result] mcp-server\src\engines\BatchProcessor.ts
mcp-server\src\engines\DfMRulesEngine.ts
mcp-server\src\engines\DiffEngine.ts
mcp-server\src\engines\FinancialAnalysisEngine.ts
mcp-server\src\engines\GCodeTemplateEngine.ts
mcp-server\src\engines\IntentDecompositionEngine.ts
mcp-server\src\engines\PurchasingDirectoryEngine.ts
mcp-server\src\engines\SpindleProtectionEngine.ts
mcp-server\src\engines\Sustaina
... [+4306 chars truncated]

### Assistant | 2026-06-10T21:39:00.931Z

Good. I found CAG hooks and RAG engines. Let me read the CAG router hook and the RAG engines now:

### Assistant | 2026-06-10T21:39:00.995Z

[tool_use: Read]

### Assistant | 2026-06-10T21:39:01.360Z

[tool_use: Read]

### Assistant | 2026-06-10T21:39:02.052Z

[tool_use: Grep]

### User | 2026-06-10T21:39:02.150Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// .claude/hooks/cag-router-inject.mjs
4	//
5	// TOKEN-SAVINGS-PIVOT/U-CAG-HOOK-INJECT (sierra iter28 2026-05-26):
6	// UserPromptSubmit hook that classifies the operator's prompt as
7	// COLD / HOT / HYBRID via scripts/lib/cag-router.mjs and writes a route
8	// decision sidecar that downstream static-doctrine injectors
9	// (master-index-precheck-inject, memo
... [+7832 chars truncated]

### User | 2026-06-10T21:39:02.763Z

[tool_result] 1	// scripts/lib/cag-router.mjs
2	//
3	// CAG-Router — Classify a query as COLD (cache-augmented), HOT (retrieval-augmented),
4	// or HYBRID (both layers). Implements the Cache-Augmented Generation pattern
5	// (akshay_pachaar X tweet 2056714042455343160, 2026-05-19; foundational paper
6	// Chan et al. 2024 "Don't Do RAG: When Cache-Augmented Generation is All You Need").
7	//
8	// PURPOSE
9	// PR
... [+24660 chars truncated]

### User | 2026-06-10T21:39:03.812Z

[tool_result] Found 4 files
mcp-server\src\engines\IdeaBlockRagEngine.ts
mcp-server\src\engines\BlueprintExtractionRAGEngine.ts
mcp-server\src\engines\TribalRAGEngine.ts
mcp-server\src\engines\CAMTribalRAGEngine.ts

### Assistant | 2026-06-10T21:39:05.588Z

Now let me read the RAG engines and search for AI dispatchers:

### Assistant | 2026-06-10T21:39:06.043Z

[tool_use: Read]

### Assistant | 2026-06-10T21:39:06.463Z

[tool_use: Read]

### Assistant | 2026-06-10T21:39:06.679Z

[tool_use: Glob]

### User | 2026-06-10T21:39:07.107Z

[tool_result] 1	/**
2	 * IdeaBlockRagEngine
3	 * ==================
4	 *
5	 * OBSIDIAN-INTELLIGENCE-MS3/E3/U-IDEABLOCK-RAG-ENGINE
6	 *
7	 * IdeaBlock-level retrieval: rank a corpus of IdeaBlocks (the atomic
8	 * question/answer units E1 extracts and E2 deduplicates) against a free-
9	 * text query by cosine similarity over embeddings, returning the top-K
10	 * blocks each with its answer and a source back-link.
... [+16649 chars truncated]

### User | 2026-06-10T21:39:07.672Z

[tool_result] 1	/**
2	 * BlueprintExtractionRAGEngine — BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U7
3	 *
4	 * The composition layer (centerpiece). Wraps the base vision call
5	 * (BlueprintVisionOCREngine) with RAG augmentation. For each extraction:
6	 *   1. Pre-classify the print (blueprint-infer-class + family + customer prior)
7	 *   2. Retrieve corpus context (top-k via embed-search, filtered by domain)
8	 *   3. 
... [+3808 chars truncated]

### User | 2026-06-10T21:39:14.352Z

[tool_result] mcp-server\src\tools\dispatchers\resourceHarvestingDispatcher.ts
mcp-server\src\tools\dispatchers\resourceExtractionDispatcher.ts
mcp-server\src\tools\dispatchers\securityDispatcher.ts
mcp-server\src\tools\dispatchers\atcsDispatcher.ts
mcp-server\src\tools\dispatchers\autoPilotDispatcher.ts
mcp-server\src\tools\dispatchers\automationDispatcher.ts
mcp-server\src\tools\dispatchers\autonomousDispatch
... [+5353 chars truncated]

### Assistant | 2026-06-10T21:39:16.036Z

Good. Now let me search for AI dispatchers and AI capability engines:

### Assistant | 2026-06-10T21:39:16.873Z

[tool_use: Grep]

### Assistant | 2026-06-10T21:39:17.125Z

[tool_use: Read]

### Assistant | 2026-06-10T21:39:17.542Z

[tool_use: Read]

### Assistant | 2026-06-10T21:39:17.858Z

[tool_use: Grep]

### User | 2026-06-10T21:39:18.576Z

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
... [+15479 chars truncated]

### User | 2026-06-10T21:39:18.882Z

[tool_result] No files found

### User | 2026-06-10T21:39:18.975Z

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
... [+7070 chars truncated]

### User | 2026-06-10T21:39:19.693Z

[tool_result] Found 15 files
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
mcp-server\src\tools\dispatchers\turningDispatcher.ts
mcp-server\src\tools\dispatchers\devDispatcher.ts
mcp-server\src\engines\ConsensusAIBridgeEngine.ts
mcp-server\src\schemas\aiCapabilityActionSchemas.ts
mcp-server\src\__tests__\aiReasoningDispatcher.uaimax10.test.ts
mcp-server\src\__tests__\aiReasoningDispatcher.uwire11.te
... [+467 chars truncated]

### Assistant | 2026-06-10T21:39:21.562Z

Excellent. Now let me search for CrossProcessNeuralLearningEngine and xproc infrastructure:

### Assistant | 2026-06-10T21:39:22.021Z

[tool_use: Read]

### Assistant | 2026-06-10T21:39:22.657Z

[tool_use: Grep]

### Assistant | 2026-06-10T21:39:22.944Z

[tool_use: Read]

### User | 2026-06-10T21:39:23.108Z

[tool_result] 1	/**
2	 * CrossProcessNeuralLearningEngine — pure-JS multi-layer perceptron that
3	 * predicts {success, failure, operator_override} from a CrossProcess
4	 * OutcomeRecord. Trained online from CrossProcessOutcomeStore events.
5	 *
6	 * Milestone: INFRA-NEURAL-LEDGER-MS1 / U-XPROC-NEURAL-T1-02.
7	 *
8	 * Why this exists
9	 * ---------------
10	 * T1-01 (CrossProcessOutcomeStore) gives the system a
... [+6494 chars truncated]

### User | 2026-06-10T21:39:24.636Z

[tool_result] 1	/**
2	 * AISystemRouterEngine
3	 *
4	 * Routes incoming AI work to the most appropriate execution system based on
5	 * task class. Spec from /forge Phase 0 Self-Awareness Protocol:
6	 *
7	 *   | Task                | System                       |
8	 *   |---------------------|------------------------------|
9	 *   | Physics validation  | Docker: physics-agent        |
10	 *   | Engine building 
... [+5840 chars truncated]

### User | 2026-06-10T21:39:24.919Z

[tool_result] Found 7 files
mcp-server\src\engines\AISystemRouterEngine.ts
mcp-server\src\engines\ConsensusAIBridgeEngine.ts
mcp-server\src\engines\lib\zuluAwarenessReader.ts
mcp-server\src\engines\MultiAgentCostTelemetryEngine.ts
mcp-server\src\engines\BlueprintLoRABridgeEngine.ts
mcp-server\src\engines\SystemUtilizationAuditEngine.ts
mcp-server\src\engines\AICapabilityMaximizerEngine.ts

### Assistant | 2026-06-10T21:39:27.236Z

Perfect. Let me read the AICapabilityMaximizerEngine:

### Assistant | 2026-06-10T21:39:27.672Z

[tool_use: Read]

### Assistant | 2026-06-10T21:39:28.503Z

[tool_use: Grep]

### User | 2026-06-10T21:39:28.784Z

[tool_result] 1	/**
2	 * AICapabilityMaximizerEngine — Ultimate AI System Capability Enhancement
3	 * =========================================================================
4	 * The master orchestrator for maximizing AI coding, reasoning, and knowledge
5	 * synthesis capabilities beyond baseline LLM abilities.
6	 *
7	 * Capability Domains:
8	 *   1. Code Generation Quality (physics-grounded, pattern-validate
... [+8785 chars truncated]

### Assistant | 2026-06-10T21:39:29.061Z

[tool_use: Read]

### User | 2026-06-10T21:39:29.917Z

[tool_result] 1	/**
2	 * RankedHybridGraphSearchEngine — N1 orchestration (slot:sierra, system-viz, 2026-05-29).
3	 *
4	 * Composes two already-built engines into one capability the opportunity map
5	 * (SIERRA-HIGH-LEVERAGE-OPPORTUNITIES-2026-05-29 §N1) called the highest-leverage
6	 * orchestration sierra is positioned to make:
7	 *
8	 *   MasterIndexEngine.query()  → hits carrying BOTH `confidence` (lexical 
... [+7119 chars truncated]

### User | 2026-06-10T21:39:30.073Z

[tool_result] Found 1 file
mcp-server\src\engines\RankedHybridGraphSearchEngine.ts

### Assistant | 2026-06-10T21:39:31.750Z

Excellent. Now let me search for xproc and check if there's existing fleet-wide AI synergy reporting:

### Assistant | 2026-06-10T21:39:32.160Z

[tool_use: Bash]

### Assistant | 2026-06-10T21:39:33.239Z

[tool_use: Grep]

### Assistant | 2026-06-10T21:39:33.411Z

[tool_use: Bash]

### User | 2026-06-10T21:39:34.856Z

[tool_result] No files found

### User | 2026-06-10T21:39:36.604Z

[tool_result] (Bash completed with no output)

### User | 2026-06-10T21:39:37.828Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-10T21:39:40.047Z

Let me check the cag-injectors-consume hook and look for xproc documentation:

### Assistant | 2026-06-10T21:39:40.170Z

[tool_use: Read]

### Assistant | 2026-06-10T21:39:40.628Z

[tool_use: Bash]

### Assistant | 2026-06-10T21:39:40.831Z

[tool_use: Grep]

### User | 2026-06-10T21:39:41.349Z

[tool_result] 1	// tier: T2
2	// .claude/hooks/cag-injectors-consume.test.mjs
3	//
4	// TOKEN-SAVINGS-PIVOT/U-CAG-INJECTORS-CONSUME (sierra 2026-05-27).
5	// Hook-level integration tests proving the three doctrine injectors
6	// (master-index-precheck, memory-relevance, tribal-by-domain) honor a
7	// COLD-tier CAG-route sidecar by short-circuiting their expensive paths
8	// AND fall through to the regular injec
... [+3823 chars truncated]

### User | 2026-06-10T21:39:45.827Z

[tool_result] (Bash completed with no output)

### User | 2026-06-10T21:39:51.671Z

[tool_result] Found 2 files
state\shared\.untracked-files-list.txt
knowledge\claude-md\project-xproc-neural-learning-layer-cross-process-learning-across-mi.md

### Assistant | 2026-06-10T21:39:53.167Z

Perfect. Let me read the xproc wiki note:

### Assistant | 2026-06-10T21:39:53.365Z

[tool_use: Read]

### User | 2026-06-10T21:39:55.157Z

[tool_result] 1	---
2	source: project
3	section: XPROC NEURAL LEARNING LAYER (cross-process learning across mill / lathe / WEDM — added 2026-05)
4	slug: xproc-neural-learning-layer-cross-process-learning-across-mi
5	indexed_at: 2026-05-04T19:19:12.334Z
6	---
7	
8	## XPROC NEURAL LEARNING LAYER (cross-process learning across mill / lathe / WEDM — added 2026-05)
9	
10	Five cross-process bridges + five Tier-1 neur
... [+1392 chars truncated]

### Assistant | 2026-06-10T21:40:43.489Z

Perfect. Now I have comprehensive mapping. Let me compile the structured report:

## PRISM CAG/RAG/Hybrid Retrieval + AI Dispatcher Surface Audit

---

### 1. **CAG (Cache-Augmented Generation) Router — FLEET-GLOBAL, LIVE**

**Router Hook:** `.claude/hooks/cag-router-inject.mjs` (H:\PRISM, line 1–195)

**What it does:**
- **UserPromptSubmit hook** (tier T2) that classifies every operator prompt as `COLD` / `HOT` / `HYBRID` via pure keyword classification (no I/O).
- Writes a **sidecar JSON file** `state/shared/cag-route/route-{sessionId}-{promptHash}.json` + `latest-{sessionId}.json` with the decision.
- Downstream injectors (`master-index-precheck`, `memory-relevance`, `tribal-by-domain`) read the sidecar and **skip their expensive paths** on high-confidence COLD hits (≥0.4 confidence).

**Routing Decision Logic** (scripts/lib/cag-router.mjs, lines 295–434):
- **COLD**: Answer from KV-cached static doctrine (CLAUDE.md 67KB, MEMORY.md 25KB, ENGINE_DIGEST.md 380KB, DISPATCHER_DIGEST.md 220KB, wiki 200KB, tribal 1.5MB, galaxy-cards 35KB, galaxy-digest 7.4KB). Keywords: `doctrine`, `claude.md`, `scrutiny gate`, `karpathy`, `handoff naming`, `r1–r12` rules, physics constants, wiki entries, etc.
- **HOT**: Skip doctrine, hit live state (BUILD_STATE, chat-slots, git log, Qdrant semantic search). Keywords: `latest`, `current`, `now`, `what's new`, `recent`, `current-slot-names` (NATO NATO phonetic alphabet α-ζ), `qdrant`, `semantic search`.
- **HYBRID**: Both layers (forced by `applied to`, `per the doctrine`, `given doctrine`, or when both cold+hot keywords present).

**Scope:** **FLEET-GLOBAL** (all 26 NATO slots + main repo). Confidence floor default 15%; token-savings estimate: 12k tokens on COLD ≥0.4 confidence, 4k on HYBRID ≥0.5 confidence.

**Consuming hooks:**
- `.claude/hooks/master-index-precheck-inject.mjs` — skips master-index scan
- `.claude/hooks/memory-relevance-inject.mjs` — skips 24h memory dedup
- `.claude/hooks/tribal-by-domain-inject.mjs` — skips Ollama
... [+11604 chars truncated]
