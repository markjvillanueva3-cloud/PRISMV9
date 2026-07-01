---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "[SCOPED] Hunt PRISM for DEAD-ON-ARRIVAL engines: an engine/singleton that needs "
date: "2026-06-15"
first_ts: "2026-06-15T05:18:58.729Z"
last_ts: "2026-06-15T05:24:22.603Z"
cwd: "H:\\prism-slot-sierra"
messages: 63
user_msgs: 30
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-ab658daa7cf68f89c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# [SCOPED] Hunt PRISM for DEAD-ON-ARRIVAL engines: an engine/singleton that needs 

> **claude-code-cli** | 2026-06-15 | 63 msgs (30 user / 33 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-ab658daa7cf68f89c.jsonl`

## Transcript

### User | 2026-06-15T05:18:58.729Z

[SCOPED] Hunt PRISM for DEAD-ON-ARRIVAL engines: an engine/singleton that needs an init/connect/setup call which PRODUCTION BOOTSTRAP never makes, so the feature is silently dead. The reference case (already FIXED): QdrantMemoryEngineSingleton built the engine + injected the embedder but never called store.connect(), so every MCP vault recall returned "qdrant not connected".

Repo root H:/prism. Check these 21 candidate engines in mcp-server/src/engines/ (each carries an isConnected/isReady/ensure/connected pattern): MultiModelConsensusEngine, OllamaClientEngine, SpeedFeedOrchestratorEngine, IdeaBlockExtractorEngine, Fusion360LiveBridgeEngine, TesseractOCRBridgeEngine, PPGDialectRankerEngine, SFCMultiHypothesisRankerEngine, OnshapeLiveCollabAdapter, MastercamAutomationBridge, MemorySyncEngine, QdrantVectorStoreEngine, OllamaIntegrationEngine, LocalModelOrchestratorEngine, WireEDMSelfAwarenessIntegrationEngine, IntegrationAdapterEngine, FusionCloudConnectorEngine, ProductionToolpathEngine, AutoProgramOrchestratorEngine, MqttBridgeEngine. (QdrantMemoryEngine itself is already fixed.)

For EACH candidate: (1) identify the init/connect/setup method that must run before the engine is usable; (2) grep its dispatcher case, index.ts, and any *Singleton accessor that wraps it -- is that init ACTUALLY called in the production path before first use? 

Report ONLY CONFIRMED dead-on-arrival instances (an init exists but the production path never calls it before use) with: engine file:line of the init, the caller/wrapper file:line proving it's not called, the dead-feature symptom, and a one-line fix. SKIP engines where init is called, or that are pure/stateless, or where the "connected" check is for an optional external service that's intentionally lazy. Verify by reading actual code; cite file:line; NO speculation. Be concise -- a short ranked list of confirmed-dead with evidence (or "none confirmed" if all 21 are fine).

### Assistant | 2026-06-15T05:19:02.438Z

I'll systematically check each of the 21 candidate engines. Let me start by locating the repo structure and then examine each engine in parallel.

### Assistant | 2026-06-15T05:19:03.793Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:19:03.837Z

[tool_use: Bash]

### User | 2026-06-15T05:19:11.137Z

[tool_result] KnowledgeApplicabilityEngine.ts.tmp
__tests__/
algorithms/
architecture/
bot/
cache/
cli/
config/
constants.ts
contracts/
cps/
data/
db/
engines/
errors/
generators/
hooks/
index.ts
interfaces/
knowledge/
manus_integration.py
mcp/
mcp-server/
middleware/
migrations/
observability/
orchestration/
physics/
prompts/
queue/
registries/
routes/
schemas/
schemas.ts
scripts/
services/
shared/
state/
stor
... [+70 chars truncated]

### User | 2026-06-15T05:19:11.170Z

[tool_result] A2AProtocolEngine.ts
AGISafetyContainmentEngine.ts
AHPEngine.ts
AIAutoUtilizationEngine.ts
AICapabilityMaximizerEngine.ts
AIDecisionExplanationEngine.ts
AIDeepKnowledgeIntegrationEngine.ts
AIExtractionReasonerEngine.ts
AIFeatureAutoRegistryEngine.ts
AIGeneratedCodeApprovalGateEngine.ts
AIIntelligenceMaximizerEngine.ts
AIMLEngine.ts
AIMLFormulasEngine.ts
AIPhysicsOptimizationEngine.ts
AIProposalApp
... [+1335 chars truncated]

### Assistant | 2026-06-15T05:19:13.322Z

Let me find the specific engine files for all 21 candidates in parallel.

### Assistant | 2026-06-15T05:19:18.655Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:19:19.212Z

[tool_use: Bash]

### User | 2026-06-15T05:19:32.828Z

[tool_result] AutoProgramOrchestratorEngine.ts
Fusion360LiveBridgeEngine.ts
FusionCloudConnectorEngine.ts
IdeaBlockExtractorEngine.ts
IntegrationAdapterEngine.ts
LocalModelOrchestratorEngine.ts
MastercamAutomationBridge.ts
MemorySyncEngine.ts
MqttBridgeEngine.ts
MultiModelConsensusEngine.ts
OllamaClientEngine.ts
OllamaIntegrationEngine.ts
OnshapeLiveCollabAdapter.ts
PPGDialectRankerEngine.ts
ProductionToolpathE
... [+215 chars truncated]

### User | 2026-06-15T05:19:32.842Z

[tool_result] index.ts

### Assistant | 2026-06-15T05:19:34.960Z

Good, all 21 files confirmed. Now let me read them all in parallel.

### Assistant | 2026-06-15T05:19:35.352Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:35.735Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:36.111Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:36.520Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:36.874Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:37.693Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:37.717Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:38.022Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:38.400Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:38.782Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:39.169Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:39.542Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:39.925Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:40.390Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:40.786Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:41.136Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:41.690Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:42.129Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:42.262Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:42.642Z

[tool_use: Read]

### Assistant | 2026-06-15T05:19:42.697Z

[tool_use: Read]

### User | 2026-06-15T05:20:04.392Z

[tool_result] 1	/**
2	 * OllamaClientEngine — Thin client around the `ollama` npm package
3	 *
4	 * Phase external-infra. Wraps Ollama's local LLM runtime so PRISM callers
5	 * can request chat completions, plain-text generation, and embeddings
6	 * without importing the Ollama SDK directly. The real daemon must be
7	 * running (either via `docker compose up -d ollama` or a host install);
8	 * this engine is a 
... [+7630 chars truncated]

### User | 2026-06-15T05:20:04.454Z

[tool_result] 1	/**
2	 * MultiModelConsensusEngine — fan a prompt out to Claude + Codex + a local
3	 * Ollama voice in parallel, score agreement, recommend an answer.
4	 *
5	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS.
6	 *
7	 * Goal (per user): "more eyes on a task to hopefully cover all possible gaps
8	 * more efficiently". Three independent reasoners — Claude (deep, Anthropic),
9	 * gpt-5.5 x
... [+59838 chars truncated]

### User | 2026-06-15T05:20:04.984Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-691 of 3926 total (84365 tokens, cap 25000). Call Read with offset=692 limit=691 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * SpeedFeedOrchestratorEngine — the hub wiring 67 integration points into
3	 * a unified speed/fee
... [+27416 chars truncated]

### User | 2026-06-15T05:20:05.398Z

[tool_result] 1	// WIRE-EXEMPT: downstream-deferred — composed by E3 IdeaBlockRagEngine (charlie queue) which IS dispatcher-wired via prism_knowledge. E1 is the leaf producer; E2 (dedup) + E3 (retrieval) + E4 (governance) form the upstream wiring path. Tracked in OBSIDIAN-INTELLIGENCE-MS3 envelope phase E.
2	/**
3	 * IdeaBlockExtractorEngine — OBSIDIAN-INTELLIGENCE-MS3 / E1
4	 * ================================
... [+20550 chars truncated]

### User | 2026-06-15T05:20:05.442Z

[tool_result] 1	/**
2	 * Fusion360LiveBridgeEngine — PRISM-side client for the Fusion 360 API Server Add-In.
3	 * Communicates with the add-in's HTTP server running inside Fusion 360 on localhost:18360.
4	 *
5	 * Provides typed methods for all CAD operations: sketch, extrude, fillet, chamfer,
6	 * revolve, hole, pattern, combine, shell, export, undo, parameters, and raw code execution.
7	 *
8	 * Also supports e
... [+64815 chars truncated]

### User | 2026-06-15T05:20:10.352Z

[tool_result] 1	// WIRE-EXEMPT: Middleware engine called by SFC engines internally, not exposed via dispatcher
2	/**
3	 * SFCMultiHypothesisRankerEngine â€” U-PPG-SFC-09
4	 * ==============================================
5	 *
6	 * Bayesian update over candidate sources: {Kienzle prior, Taylor prior, formula,
7	 * learned_residual via gate, RAG_prior via U-07, IRL_reward via iqlEngine}.
8	 * Emits ranked sfm/fp
... [+29358 chars truncated]

### User | 2026-06-15T05:20:10.361Z

[tool_result] 1	/**
2	 * TesseractOCRBridgeEngine — U-QP-TESS-OCR (Axis J)
3	 *
4	 * Operator-stated (verbatim): "make sure the entire quoting feature is phone
5	 * friendly so salesmen can take pictures of prints and physical parts for
6	 * instant accurate quoting."
7	 *
8	 * Provider-agnostic OCR bridge. Browser side: tesseract.js worker. Node
9	 * server side: tesseract.js (Node bindings) OR pluggable Azure
... [+8039 chars truncated]

### User | 2026-06-15T05:20:10.362Z

[tool_result] 1	// WIRE-EXEMPT: Middleware engine called by PPG engines internally, not exposed via dispatcher
2	/**
3	 * PPGDialectRankerEngine — U-PPG-SFC-10
4	 * =====================================
5	 *
6	 * Ranks candidate dialect translations by predicted alarm-rate, override-rate,
7	 * and first-article-pass-rate. Combines RAG retrieval (U-08), provenance source
8	 * weights, and base-vs-adapted contest
... [+22250 chars truncated]

### User | 2026-06-15T05:20:10.368Z

[tool_result] 1	/**
2	 * MastercamAutomationBridge — Process-level spawn + named-pipe IPC bridge for Mastercam.
3	 *
4	 * Spawns Mastercam.exe with -runchook pointing at MastercamNetHook.dll, establishes
5	 * a named-pipe channel (\\.\pipe\prism-mcam-{pid}), and dispatches JSON commands.
6	 * Composes existing Mastercam* engines — does NOT re-implement strategy/code/cycle logic.
7	 *
8	 * Supported file formats
... [+16947 chars truncated]

### User | 2026-06-15T05:20:10.428Z

[tool_result] 1	/**
2	 * OnshapeLiveCollabAdapter — U-CAD-APP-10 (PHASE-48)
3	 *
4	 * Bridges real-time Onshape document events to PRISM's internal event bus.
5	 * Converts Onshape webhook payloads into normalized collaboration events
6	 * that downstream PRISM AI sessions and engines can consume.
7	 *
8	 * Features:
9	 *   - Webhook event ingestion (model changed, revision, comment, translation)
10	 *   - Sess
... [+14617 chars truncated]

### User | 2026-06-15T05:20:10.531Z

[tool_result] 1	/**
2	 * MemorySyncEngine — Phase 0.19 U-LLM8 + CPP-MS3-U-CPP22 (CRDT merge)
3	 *
4	 * Export Qdrant-backed memory to a JSON bundle on the H: drive so the
5	 * home (RTX 4080) and work (RTX 3080) PCs share tribal tips, program
6	 * embeddings, outcome vectors, and formula memories. Pair with
7	 * `claude_sync.py`'s drive-swap workflow: before eject at site A, dump
8	 * a bundle; after `setup-new
... [+16167 chars truncated]

### User | 2026-06-15T05:20:10.610Z

[tool_result] 1	/**
2	 * QdrantVectorStoreEngine — Thin client around @qdrant/js-client-rest
3	 *
4	 * Phase external-infra. Provides a PRISM-styled surface over the Qdrant REST
5	 * client so higher-level engines (SemanticSimilarityGuard, Tool DB vector
6	 * search, MIT course index) don't have to deal with the raw client's many
7	 * options. Methods are minimal + named after the action, not the endpoint.
8	 *
... [+10033 chars truncated]

### User | 2026-06-15T05:20:10.619Z

[tool_result] 1	/**
2	 * OllamaIntegrationEngine — Phase 0.19 U-LLM2
3	 *
4	 * Operational layer on top of the raw `OllamaClientEngine` RPC client.
5	 * Tracks connection health, caches the installed-model roster, stores
6	 * per-task default model selection, and offers a `warmUp()` path that
7	 * pre-loads a model into VRAM so the first shop query isn't cold.
8	 *
9	 * The raw client does one thing (RPC). This
... [+7880 chars truncated]

### User | 2026-06-15T05:20:22.747Z

[tool_result] 1	/**
2	 * LocalModelOrchestratorEngine — Phase 0.19 U-LLM1
3	 *
4	 * Take a user request (chat prompt or embedding input), ask
5	 * `ModelRoutingEngine` which backend+model should service it, then
6	 * dispatch the actual call to the right client:
7	 *
8	 *   - ollama     → OllamaClientEngine (local, free)
9	 *   - anthropic  → LLMEngine (Claude API)
10	 *   - openai     → not yet wired; returns 
... [+10279 chars truncated]

### User | 2026-06-15T05:20:22.790Z

[tool_result] 1	/**
2	 * IntegrationAdapterEngine — Export adapters for external systems.
3	 * QuickBooks IIF/CSV, bank reconciliation BAI2, tax summary, generic CSV.
4	 */
5	
6	export interface ExportResult {
7	  format: string;
8	  filename: string;
9	  content: string;
10	  record_count: number;
11	  total_amount: number;
12	}
13	
14	export interface BankReconciliation {
15	  statement_date: string;
16	  ban
... [+13369 chars truncated]

### User | 2026-06-15T05:20:22.804Z

[tool_result] 1	/**
2	 * FusionCloudConnectorEngine — U-BOX53
3	 *
4	 * Connection layer for Fusion 360 data extraction. Two modes:
5	 *   1. Live Bridge: Fusion 360 add-in running on localhost:18360
6	 *   2. Offline Mock: structured mock data for testing
7	 *
8	 * Handles connection health checks, retry logic, and provides
9	 * a unified interface for downstream extraction engines.
10	 *
11	 * @module engines
... [+12221 chars truncated]

### User | 2026-06-15T05:20:22.851Z

[tool_result] 1	/**
2	 * WireEDMSelfAwarenessIntegrationEngine
3	 *
4	 * Claude Opus-level integration that connects all Wire EDM AI components
5	 * with the PRISM Self-Awareness system for unified intelligent operations.
6	 *
7	 * Integrations:
8	 * - PRISMSelfAwarenessEngine: capability discovery, tribal knowledge, playbook
9	 * - WireEDMMasterAIEngine: strategic decisions
10	 * - WireEDMDeepReasoningEngine: 
... [+25624 chars truncated]

### User | 2026-06-15T05:20:23.441Z

[tool_result] 1	/**
2	 * MqttBridgeEngine
3	 *
4	 * MQTT IoT bridge for shop-floor sensor integration.
5	 * Subscribes to MQTT topics for vibration, temperature, coolant flow,
6	 * and other sensor data. Aggregates and feeds into PRISM adaptive control.
7	 *
8	 * Capabilities:
9	 * 1. connect()        — Connect to MQTT broker
10	 * 2. subscribe()      — Subscribe to sensor topics
11	 * 3. getLatest()      — Get
... [+16409 chars truncated]

### User | 2026-06-15T05:20:23.605Z

[tool_result] 1	/**
2	 * ProductionToolpathEngine — CK-MS2
3	 * Upgrades raw toolpath segments to production-grade G-code by wiring
4	 * 8 existing engines that were built but not connected:
5	 *
6	 * 1. Real pocket offsets (arbitrary polygon, not rectangles)
7	 * 2. Helical/ramp entry per material (CAMKernelEngine strategies)
8	 * 3. Arc generation at corners (G02/G03 instead of all-G01)
9	 * 4. Engagement-ada
... [+32703 chars truncated]

### User | 2026-06-15T05:20:23.639Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1014 of 1537 total (32181 tokens, cap 25000). Call Read with offset=1015 limit=1014 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * PRISM MCP Server - Main Entry Point
3	 * Manufacturing Intelligence MCP Server
4	 * 
5	 * Pro
... [+54569 chars truncated]

### User | 2026-06-15T05:20:23.677Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1183 of 3985 total (71532 tokens, cap 25000). Call Read with offset=1184 limit=1183 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	/**
2	 * AutoProgramOrchestratorEngine — Fusion 360 One-Button CNC Programming
3	 *
4	 * 10-stage pipe
... [+51154 chars truncated]

### Assistant | 2026-06-15T05:20:35.401Z

Now I have all the engine files. Let me now check the bootstrap/production path for the engines that have actual init requirements. Let me search for how each is used in dispatchers.

### Assistant | 2026-06-15T05:20:37.309Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:20:38.070Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:20:38.729Z

[tool_use: Bash]

### User | 2026-06-15T05:20:49.364Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/memoryDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/orchestrationDispatcher.ts
H:/prism/mcp-server/src/tools/dispatchers/sessionDispatcher.ts

### User | 2026-06-15T05:20:50.010Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/machineLiveDispatcher.ts

### User | 2026-06-15T05:20:54.811Z

[tool_result] H:/prism/mcp-server/src/engines/MemorySyncEngine.ts:490:export const memorySyncEngine = new MemorySyncEngine();
H:/prism/mcp-server/src/tools/dispatchers/memoryDispatcher.ts:1338:            const { memorySyncEngine } = await import("../../engines/MemorySyncEngine.js");
H:/prism/mcp-server/src/tools/dispatchers/memoryDispatcher.ts:1341:            const bundles = await memorySyncEngine.listBundles
... [+309 chars truncated]

### User | 2026-06-15T05:23:43.536Z

This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

Summary:
1. Primary Request and Intent:
The user (via a scoped file-search agent task) requested a systematic hunt across exactly 21 candidate engines in `H:/prism/mcp-server/src/engines/` for "dead-on-arrival" engines — specifically engines that have an `init`/`connect`/`setup` method that MUST be called before the engine is usable, but where the production bootstrap (`index.ts` `bootstrapServices()`) or any *Singleton accessor never calls that method before first use. The reference pattern (already fixed) was `QdrantMemoryEngineSingleton` which built the engine and injected the embedder but never called `store.connect()`, so every MCP vault recall returned "qdrant not connected."

The 21 candidates were: MultiModelConsensusEngine, OllamaClientEngine, SpeedFeedOrchestratorEngine, IdeaBlockExtractorEngine, Fusion360LiveBridgeEngine, TesseractOCRBridgeEngine, PPGDialectRankerEngine, SFCMultiHypothesisRankerEngine, OnshapeLiveCollabAdapter, MastercamAutomationBridge, MemorySyncEngine, QdrantVectorStoreEngine, OllamaIntegrationEngine, LocalModelOrchestratorEngine, WireEDMSelfAwarenessIntegrationEngine, IntegrationAdapterEngine, FusionCloudConnectorEngine, ProductionToolpathEngine, AutoProgramOrchestratorEngine, MqttBridgeEngine.

Required output: for each confirmed DOA: engine file:line of the init, caller/wrapper file:line proving it's not called, dead-feature symptom, one-line fix. Skip engines where init is called, or that are pure/stateless, or where the "connected" check is for an optional external service intentionally lazy.

2. Key Technical Concepts:
- Dead-on-arrival (DOA) engine pattern: engine has `connect()`/`init()` pre-condition but production bootstrap never calls it before first use
- Lazy vs. required initialization: engines that self-connect on demand (checking `isConnected()` then calling `connect()`
... [+12647 chars truncated]

### Assistant | 2026-06-15T05:24:22.603Z

Here is the complete dead-on-arrival audit for all 21 candidate engines.

---

## Dead-on-Arrival Engine Audit — PRISM MCP Server

### CONFIRMED DOA: 1 engine

**MemorySyncEngine**

- Init that must run: `H:/prism/mcp-server/src/engines/MemorySyncEngine.ts:74` — `QdrantVectorStoreEngine.connect()` on the private `this.store` instance
- How the store is created: line 163 — `this.store = deps.store ?? new QdrantVectorStoreEngine()` — creates a fresh, independent instance; NOT the shared singleton
- Module singleton: line 490 — `export const memorySyncEngine = new MemorySyncEngine()` — zero-arg call, so `deps.store` is always undefined, the private store is always unconnected
- Guards that always fire: line 179 (`exportBundle`) and line 255 (`importBundle`) — both immediately return `{ ok: false, error: "qdrant not connected" }` when `!this.store.isConnected()`
- Production bootstrap proof: `H:/prism/mcp-server/src/index.ts` `bootstrapServices()` — calls `telemetryEngine.init()`, `pfpEngine.init()`, `memoryGraphEngine.init()`, `certificateEngine.init()` — no connect call for `memorySyncEngine`'s internal store anywhere
- Dispatcher call site: `H:/prism/mcp-server/src/tools/dispatchers/memoryDispatcher.ts:1338` and `1346` — lazy-imports `memorySyncEngine` then calls `listBundles()` and `bundleMetadata()` with no preceding connect
- Dead feature: the entire H:-drive bundle export/import workflow (drive-swap between home RTX 4080 and work RTX 3080) — every call returns `qdrant not connected` silently
- One-line fix: change line 490 to `export const memorySyncEngine = new MemorySyncEngine({ store: qdrantVectorStoreEngine })` (importing the shared singleton from `QdrantVectorStoreEngine.ts` which is connected by the existing Qdrant fix)

---

### All 20 others — cleared with reason

| Engine | Verdict | Reason |
|---|---|---|
| MultiModelConsensusEngine | NOT DOA | `callOllama()` checks `isConnected()` and calls `connect()` inline — self-healing |
| OllamaClientEngine | NOT
... [+2795 chars truncated]
