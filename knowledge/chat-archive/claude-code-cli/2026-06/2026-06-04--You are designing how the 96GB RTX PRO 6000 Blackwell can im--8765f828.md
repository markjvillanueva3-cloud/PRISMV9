---
type: "chat-session"
source: "claude-code-cli"
session_id: "8765f828-890b-45ba-8af4-4bbf24e81b0b"
title: "You are designing how the 96GB RTX PRO 6000 Blackwell can improve the MCP server"
date: "2026-06-04"
first_ts: "2026-06-04T03:30:23.032Z"
last_ts: "2026-06-04T03:35:19.179Z"
cwd: "H:\\PRISM"
messages: 56
user_msgs: 23
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a45a50142eb4d51bd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# You are designing how the 96GB RTX PRO 6000 Blackwell can improve the MCP server

> **claude-code-cli** | 2026-06-04 | 56 msgs (23 user / 33 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/8765f828-890b-45ba-8af4-4bbf24e81b0b/subagents/workflows/wf_6250d030-cc4/agent-a45a50142eb4d51bd.jsonl`

## Transcript

### User | 2026-06-04T03:30:23.032Z

You are designing how the 96GB RTX PRO 6000 Blackwell can improve the MCP server's performance + functionality. 
== LIVE GROUND TRUTH (DESKTOP-N7MI1VB, slot golf, 2026-06-03) ==
- The recurring symptom: chats periodically show "MCP DISCONNECTED" then a watchdog restart. Operator: "permanently fix the mcp server drop we constantly experience."
- MCP HTTP bridge listens on :3100, owner node pid 36276 (756MB RSS, just boosted to AboveNormal).
- THREE node processes at ~2.9GB RSS each — right at the documented 3GB watchdog OOM-restart threshold (a restart = a drop).
- CPU was at 100% (16 logical cores, Ryzen 7 7800X3D). No single runaway — AGGREGATE saturation from 201 active fleet /loop sessions + Obsidian + Defender (MsMpEng) + ollama. CPU starvation of the MCP event loop = request timeouts = "MCP DISCONNECTED".
- PRIORITY INVERSION found: ollama 'llama-server' runner processes were at AboveNormal priority, PREEMPTING the Normal-priority MCP server. Golf normalized runners->Normal + boosted MCP->AboveNormal as immediate relief (CPU 100%->93%). But ollama RESPAWNS runners at AboveNormal on each model load, so a one-shot fix is NOT durable.
- RAM is healthy: 40% used, 76GB free of 127GB. GPU: 96GB RTX PRO 6000 Blackwell, just optimized (4-model roster, 54GB resident, 42GB free, 1% util — lots of idle GPU compute).

== PRIOR MCP-DROP FIXES ALREADY SHIPPED (do NOT rebuild; verify they're deployed) ==
- commit 1297b0a8f5 (2026-05-31, golf): "MCP :3100 Already connected to a transport" — buildRequestServer() makes a FRESH McpServer per /mcp request (SDK allows only 1 transport/server; overlapping multi-chat requests threw -> client timeout -> DISCONNECTED). Split registerTools -> bootstrapServices(once)+bindDispatchers(per-server).
- MCP-OOM-FIX (2026-05-23): watchdog preemptive restart on RSS pressure (3GB threshold), supervisor spawnChild injects NODE_OPTIONS heap bump.
- Ollama serve is now a scheduled task (PRISM Ollama Serve, Normal priority, logon trigger), CPU thrott
... [+2413 chars truncated]

### Assistant | 2026-06-04T03:30:34.084Z

I'll investigate the MCP server's inline CPU/RAM-heavy work to find GPU-offload opportunities and identify all remaining MCP-drop causes. Let me scope my searches tightly to `mcp-server/src`.

### Assistant | 2026-06-04T03:30:35.494Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:30:36.905Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:30:37.877Z

[tool_use: Grep]

### User | 2026-06-04T03:30:48.687Z

[tool_result] Found 40 files limit: 40
mcp-server\src\tools\dispatchers\knowledgeDispatcher.ts
mcp-server\src\tools\dispatchers\memoryDispatcher.ts
mcp-server\src\__tests__\memoryDispatcher.lsh-dedup-wire.test.ts
mcp-server\src\__tests__\QueueProcessorEngine.test.ts
mcp-server\src\engines\system-viz\GSD.md
mcp-server\src\schemas\memoryActionSchemas.ts
mcp-server\src\__tests__\businessDispatcher.bridge-wire-busi
... [+1915 chars truncated]

### User | 2026-06-04T03:30:53.054Z

[tool_result] Found 32 files
mcp-server\src\__tests__\OllamaCapabilityProbeEngine.test.ts
mcp-server\src\engines\ModelRoutingEngine.ts
mcp-server\src\__tests__\ModelRoutingEngine.test.ts
mcp-server\src\tools\dispatchers\memoryDispatcher.ts
mcp-server\src\__tests__\memoryDispatcher.embedding-filter-wire.test.ts
mcp-server\src\engines\tribal-knowledge\MEMORY.md
mcp-server\src\engines\database-expansion\MEMORY.md

... [+1374 chars truncated]

### User | 2026-06-04T03:30:53.056Z

[tool_result] Found 10 files
mcp-server\src\algorithms\KNearestNeighbors.ts
mcp-server\src\engines\WikiIndexMaintainerEngine.ts
mcp-server\src\engines\CADFeatureMemoryEngine.ts
mcp-server\src\engines\CAMTribalRAGEngine.ts
mcp-server\src\engines\WEDMNeighborQueryEngine.ts
mcp-server\src\engines\KnowledgeGraphNeuralBridgeEngine.ts
mcp-server\src\__tests__\qdrant-capacity-planner-engine.test.ts
mcp-server\src\engi
... [+132 chars truncated]

### Assistant | 2026-06-04T03:30:55.858Z

Let me read the core embedding engine to determine if it's CPU in-process ONNX or already offloaded to Ollama.

### Assistant | 2026-06-04T03:30:56.296Z

[tool_use: Read]

### Assistant | 2026-06-04T03:30:56.834Z

[tool_use: Read]

### User | 2026-06-04T03:31:07.823Z

[tool_result] 1	/**
2	 * LocalEmbeddingEngine — In-process embeddings via @xenova/transformers
3	 *
4	 * Phase external-infra. Runs Xenova's ONNX-backed MiniLM (or any feature-
5	 * extraction model) entirely in the Node process so PRISM's awareness and
6	 * semantic-similarity stack has a zero-service embeddings backend. The
7	 * Ollama/Qdrant path is still the production option for bigger models; this
8	 * en
... [+5435 chars truncated]

### User | 2026-06-04T03:31:08.957Z

[tool_result] 1	/**
2	 * OllamaEmbedderEngine
3	 * ====================
4	 *
5	 * OBSIDIAN-AUTOMATE-MS3/U-EMBEDDING-CONNECTIONS
6	 *
7	 * Lightweight wrapper around Ollama's `/api/embeddings` endpoint specialized
8	 * for the daily-brief use case: embed many short documents, then compute
9	 * pairwise cosine similarities and return them keyed by canonical pairKey
10	 * (alphabetical join of two paths).
11	 *
12
... [+7205 chars truncated]

### Assistant | 2026-06-04T03:31:13.206Z

Now I have the two key embedding engines. Let me determine which one is actually called by the hot dispatcher paths (memory/session search) and whether the in-process ONNX path is on the request hot path. Let me also find the bridge server, watchdog, and supervisor, and check how memoryDispatcher does its search.

### Assistant | 2026-06-04T03:31:15.072Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:31:16.961Z

[tool_use: Grep]

### User | 2026-06-04T03:31:23.497Z

[tool_result] mcp-server\src\tools\dispatchers\cadAutomationDispatcher.ts:2972:              signature: "embed(tokens: number[], backend: EmbeddingBackend, config?: EmbedConfig)",
mcp-server\src\tools\dispatchers\memoryDispatcher.ts:1231:            const { ollamaEmbedderEngine } = await import("../../engines/OllamaEmbedderEngine.js");
mcp-server\src\tools\dispatchers\memoryDispatcher.ts:1237:            const 
... [+1650 chars truncated]

### User | 2026-06-04T03:31:26.140Z

[tool_result] Found 30 files limit: 30
mcp-server\src\engines\hermes-zulu\MEMORY.md
mcp-server\src\tools\dispatchers\devDispatcher.ts
mcp-server\src\engines\system-viz\MEMORY.md
mcp-server\src\__tests__\Fusion360LiveBridgeEngine.sweepLoft.test.ts
mcp-server\src\__tests__\contextDispatcher.slot-brief.test.ts
mcp-server\src\index.ts
mcp-server\src\tools\dispatchers\memoryDispatcher.ts
mcp-server\src\engines\fleet
... [+1007 chars truncated]

### Assistant | 2026-06-04T03:31:30.644Z

The memory dispatcher uses `ollamaEmbedderEngine` (already GPU-offloadable via Ollama). Let me check the index.ts bridge server for the HTTP listener, event-loop blocking work, and how memory search does vector ops. Let me also check where LocalEmbeddingEngine (in-process ONNX) is actually invoked on hot paths.

### Assistant | 2026-06-04T03:31:32.419Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:31:32.849Z

[tool_use: Read]

### User | 2026-06-04T03:31:37.166Z

[tool_result] mcp-server\src\engines\business\PRISM-NETWORKING-PLATFORM-PLAN.md:134:| **Engines REUSED** | `CapacityPlanningEngine`+`SchedulingEngine`+`BottleneckAnalysisEngine` (TOC/DBR, wired) · `MTConnectLiveStatusEngine` (decoder, Phase-3 input) · `QdrantVectorStoreEngine`+`SemanticAssetIndexEngine`+`LocalEmbeddingEngine` · `PartSimilarityEngine` · `VendorEngine` scorecards (now wired) · quality galaxy (Cpk
... [+886 chars truncated]

### User | 2026-06-04T03:31:37.636Z

[tool_result] 1	/**
2	 * PSN-ENHANCE-MS0/U-PSN-HYBRID-MCP-VERIFY (sierra iter27 2026-05-26):
3	 * Extract the prism_session:hybrid_search dispatcher case body into a
4	 * standalone, dependency-injected helper so it can be unit-tested without
5	 * spinning up Qdrant, Ollama, or the full MCP harness.
6	 *
7	 * iter26 (commit d38959daca) shipped the dispatcher case with cross-tree
8	 * dynamic imports (`file:///H
... [+6434 chars truncated]

### Assistant | 2026-06-04T03:31:42.450Z

Key finding: hybrid search already routes embeddings to Ollama (`nomic-embed-text`), and uses `curl` subprocess (off event-loop). The memory dispatcher also uses `ollamaEmbedderEngine`. The in-process ONNX path (`LocalEmbeddingEngine` via `@xenova/transformers`) is the CPU-heavy fallback. Let me examine the index.ts bridge for the HTTP server and event-loop work, plus the watchdog/supervisor for the OOM threshold, and check how SemanticAssetIndexEngine picks its embedder.

### Assistant | 2026-06-04T03:31:44.817Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:31:45.314Z

[tool_use: Read]

### Assistant | 2026-06-04T03:31:46.321Z

[tool_use: Glob]

### User | 2026-06-04T03:31:56.614Z

[tool_result] 18:import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
21:import express from "express";
37:} from "./mcp/index.js";
41:} from "./mcp/authHttp.js";
413:// The HTTP /mcp handler used to call server.connect(transport) on this MODULE-LEVEL
416:// FRESH McpServer per /mcp request (SDK stateless pattern). bootstrapServices() runs the
439:async function bootstrapServices(): Promise<void
... [+1660 chars truncated]

### User | 2026-06-04T03:31:57.253Z

[tool_result] 1	/**
2	 * SemanticAssetIndexEngine — Qdrant-backed semantic index for PRISM assets
3	 *
4	 * Bridges LocalEmbeddingEngine (or Ollama server-side embeddings) and
5	 * QdrantVectorStoreEngine into a single "search PRISM by meaning" surface.
6	 * Hooks and skills call `indexAsset()` at asset-write time and `search()`
7	 * at UserPromptSubmit to surface relevant engines/formulas/tips.
8	 *
9	 * This 
... [+4008 chars truncated]

### User | 2026-06-04T03:32:09.615Z

[tool_result] mcp-server\web\node_modules\playwright-core\lib\tools\mcp\watchdog.js
mcp-server\node_modules\node-opcua-utils\dist\watchdog.js
mcp-server\node_modules\node-opcua-utils\dist\watchdog.d.ts
mcp-server\node_modules\node-opcua-utils\source\watchdog.ts
mcp-server\node_modules\playwright-core\lib\tools\mcp\watchdog.js

### Assistant | 2026-06-04T03:32:14.039Z

The watchdog/supervisor live outside `mcp-server/src`. Let me find them in `.claude/helpers` and `scripts`, and read the key `/mcp` handler section + bootstrapServices in index.ts to confirm what loads per-request vs once, and the request concurrency model.

### Assistant | 2026-06-04T03:32:14.530Z

[tool_use: Glob]

### Assistant | 2026-06-04T03:32:15.474Z

[tool_use: Glob]

### Assistant | 2026-06-04T03:32:16.148Z

[tool_use: Read]

### User | 2026-06-04T03:32:34.678Z

[tool_result] 1137	  app.post("/mcp", async (req, res) => {
1138	    // OBSERVABILITY-MS0 (slot:bravo 2026-05-30): instrument every MCP request at the
1139	    // single choke point — per-tool count/latency + live/peak concurrency. Wrapped so
1140	    // a telemetry bug can never alter dispatch behavior (collector never throws).
1141	    const _m0 = Date.now();
1142	    const _method = (req.body && typeof req.b
... [+5096 chars truncated]

### User | 2026-06-04T03:32:37.565Z

[tool_result] .claude\helpers\mcp-action-router.mjs
.claude\helpers\mcp-health-recovery.mjs
.claude\helpers\mcp-posttool-tracker.mjs
.claude\helpers\mcp-server-daemon.mjs
.claude\helpers\mcp-pretool-injector.mjs
.claude\helpers\mcp-http-bridge.mjs
.claude\helpers\mcp-tool-domains.test.mjs
.claude\helpers\mcp-tool-domains.mjs

### User | 2026-06-04T03:32:40.387Z

[tool_result] scripts\daemon-supervisor.mjs
scripts\golf-watchdog-wiring-bridge.mjs
scripts\wiki-propagation-watchdog.mjs
scripts\wiki-propagation-watchdog.test.mjs
scripts\fleet-services-watchdog.mjs
scripts\mcp-server-supervisor.mjs
scripts\mcp-server-watchdog.mjs

### Assistant | 2026-06-04T03:32:44.256Z

Critical insight: `buildRequestServer()` runs per `/mcp` request. If that does anything heavy (re-binding 7,244 dispatcher actions per request), that's a per-request CPU cost. Let me read `buildRequestServer` and `bootstrapServices` to see exactly what runs per-request, plus the watchdog OOM threshold.

### Assistant | 2026-06-04T03:32:45.180Z

[tool_use: Read]

### Assistant | 2026-06-04T03:32:45.476Z

[tool_use: Read]

### User | 2026-06-04T03:32:54.102Z

[tool_result] 888	
889	/**
890	 * Build a FRESH McpServer for a single HTTP /mcp request (MCP SDK stateless pattern).
891	 * bindDispatchers() registers all tools onto it; the once-only post-bind tail is skipped
892	 * via the _postBindDone guard (already run on the shared server). A fresh server per request
893	 * is what eliminates the "Already connected to a transport" collision under concurrency —
894	 * ea
... [+2398 chars truncated]

### User | 2026-06-04T03:32:54.767Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * mcp-server-watchdog.mjs — periodic /health probe + escalate on persistent wedge.
4	 *
5	 * Closes the gap surfaced 2026-05-19: the MCP server can be "listening but
6	 * unresponsive" (port bound, CLOSE_WAIT accumulating, /health timing out)
7	 * mid-life. The supervisor scheduled task only fires AtStartup + AtLogon so
8	 * it never noticed. This watchdog runs every
... [+16363 chars truncated]

### Assistant | 2026-06-04T03:32:59.599Z

Now I understand the full picture. The critical issue is `buildRequestServer()` calls `bindDispatchers(s)` on **every single `/mcp` request** — that re-registers all ~7,244 actions per request, which is significant CPU per request (this is the per-request CPU multiplier under 201 concurrent loops). Let me confirm what `bindDispatchers` does (its cost), and check the model routing engine to confirm the qualityTier<85 cloud invariant for the safety constraint.

### Assistant | 2026-06-04T03:33:00.437Z

[tool_use: Read]

### Assistant | 2026-06-04T03:33:02.148Z

[tool_use: Grep]

### User | 2026-06-04T03:33:10.803Z

[tool_result] 523	 * on fresh per-request servers built by buildRequestServer(). The temporary
524	 * server.tool proxy is installed and restored within this function, scoped to the
525	 * passed `server`, so concurrent calls on distinct server instances never interfere.
526	 */
527	async function bindDispatchers(server: McpServer): Promise<void> {
528	  // ======================================================
... [+3428 chars truncated]

### User | 2026-06-04T03:33:11.763Z

[tool_result] 14: *      collision safety, workholding adequacy) always route to the highest-
15: *      capability backend. Never let a 3B local model decide whether a cut
37:  | "safety_critical"
47:  | "cloud_only"; // no local GPU — cloud backends only
58:  qualityTier: number;
59:  /** 0-100 quality tier for code-focused tasks; falls back to qualityTier when omitted. */
69:  /** Optional suitability tags (
... [+1988 chars truncated]

### Assistant | 2026-06-04T03:33:16.599Z

Excellent — the `ModelRoutingEngine` already has the BLACKWELL-GPU-SWAP (2026-06-03) and a hard safety invariant (qualityTier < 85 for all local models → safety_critical always routes cloud). This is the key existing infrastructure. The per-request `bindDispatchers` is the big CPU finding. Let me verify the `canServe`/safety floor logic and quickly check how big the dispatcher binding is (action count), then I have enough.

### Assistant | 2026-06-04T03:33:18.912Z

[tool_use: Grep]

### Assistant | 2026-06-04T03:33:19.500Z

[tool_use: Read]

### User | 2026-06-04T03:33:43.504Z

[tool_result] 37:  | "safety_critical"
132:  // < 85 so the `safety_critical` tier floor (canServe) always routes
200:  // qualityTier < 85 so the safety_critical floor always routes to cloud.
433: *     `safety_critical` task even if its `qualityTier ≥ 85`. Set when
515:   * Return the latency the scorer + canServe gates should use for a given
545:      if (!this.canServe(pinned, req, ctx, rationale, /*hardFai
... [+611 chars truncated]

### User | 2026-06-04T03:33:48.166Z

[tool_result] 810	  // built by buildRequestServer(). Guarded by _postBindDone (the first call = shared server).
811	  if (!_postBindDone) {
812	    _postBindDone = true;
813	  // F1-F8 SYNERGY: Wire cross-feature integrations
814	  try {
815	    const synResult = initSynergies();
816	    log.info(`[SYNERGY] ${synResult.integrations.length} integrations active`);
817	  } catch (e) { log.warn(`[SYNERGY] Init ski
... [+1966 chars truncated]

### Assistant | 2026-06-04T03:33:52.994Z

I now have a complete picture. The safety invariant is verified (line 640: `safety_critical && qualityTier < 85` → cannot serve, hard fail). The per-request `bindDispatchers` (registering all dispatchers + wrapping every prism_* tool with hook proxies on every `/mcp` request) is the major per-request CPU cost under 201 concurrent loops. Let me update tasks and deliver the analysis.

### Assistant | 2026-06-04T03:33:53.117Z

[tool_use: TaskUpdate]

### User | 2026-06-04T03:34:07.486Z

[tool_result] Updated task #4 status

### Assistant | 2026-06-04T03:35:19.179Z

Now I have everything needed to deliver. Here is the analysis.

---

# 96GB Blackwell → MCP Server: Drop-Fix + GPU-Offload Design

## Part 0 — The drop has TWO classes of cause; only one is patched

The shipped fixes (`1297b0a8f5` fresh-server-per-request, MCP-OOM-FIX 3GB watchdog, Ollama-serve scheduled task) are real and **verified deployed in code**. But they address the *transport collision* and *crash-on-OOM* classes. The live ground truth (CPU 100%, three 2.9GB nodes, priority inversion) points at **two unpatched causes that are CPU/event-loop-starvation, not transport or OOM**:

### Cause A (NEW, highest-impact) — per-request `bindDispatchers()` re-registration
`mcp-server/src/index.ts:1205` calls `buildRequestServer()` on **every** `/mcp` POST. `buildRequestServer()` (line 896) calls `bindDispatchers(s)` (line 527), which:
- installs a `proxiedTool` wrapper, then
- calls ~40 `register*Dispatcher(server)` functions registering all **~7,244 actions**, and
- wraps every `prism_*` tool with `wrapWithUniversalHooks` + (for calc tools) `wrapToolWithAutoHooks` (Λ(x)/Φ(x)).

This was the correct fix for the "Already connected to a transport" collision (each request needs its own `McpServer`), but it moved a **one-time ~7,244-action registration onto the per-request hot path**. With 201 concurrent `/loop` sessions hammering :3100, that is thousands of full re-registrations/sec — pure CPU on the single event loop. This is almost certainly the dominant contributor to the CPU-100% → event-loop-starvation → `/health` timeout → watchdog kill → "MCP DISCONNECTED" loop. **The transport fix and the OOM fix do not touch this.** This is GPU-irrelevant — it's a Node-side fix (memoize the registered tool table / object-pool reusable `McpServer` instances, or register once and only swap the transport).

### Cause B (NEW) — Ollama respawns `llama-server` runners at AboveNormal, re-inverting priority
Golf's one-shot renice is not durable: every model load respawns runners at AboveN
... [+8629 chars truncated]
