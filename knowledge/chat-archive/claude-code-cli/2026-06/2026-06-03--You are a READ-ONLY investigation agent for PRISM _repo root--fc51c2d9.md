---
type: "chat-session"
source: "claude-code-cli"
session_id: "fc51c2d9-4fcf-4e38-82b0-3a6b100a553c"
title: "You are a READ-ONLY investigation agent for PRISM (repo root H:/prism, Windows; "
date: "2026-06-03"
first_ts: "2026-06-03T19:49:50.096Z"
last_ts: "2026-06-03T19:58:35.241Z"
cwd: "H:\\prism"
messages: 60
user_msgs: 25
assistant_msgs: 35
raw_file: "H:/.claude/projects/H--prism/fc51c2d9-4fcf-4e38-82b0-3a6b100a553c/subagents/workflows/wf_ba53bcc8-f49/agent-ac3669e349d58d1bb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:33"
---

# You are a READ-ONLY investigation agent for PRISM (repo root H:/prism, Windows; 

> **claude-code-cli** | 2026-06-03 | 60 msgs (25 user / 35 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/fc51c2d9-4fcf-4e38-82b0-3a6b100a553c/subagents/workflows/wf_ba53bcc8-f49/agent-ac3669e349d58d1bb.jsonl`

## Transcript

### User | 2026-06-03T19:49:50.096Z


You are a READ-ONLY investigation agent for PRISM (repo root H:/prism, Windows; PowerShell AND bash available; node at H:/Tools/nodejs/node.exe and C:/Program Files/nodejs/node.exe; ollama CLI at %LOCALAPPDATA%/Programs/Ollama/ollama.exe).
CONTEXT: An RTX PRO 6000 Blackwell (96GB, sm_120) replaced an RTX 4080. Ollama runs GPU-accelerated on the HOST (port 11434, store H:/Tools/ollama/models, 11 models resident). A detached driver is pulling the qwen3 stack (qwen3-embedding:8b, qwen3-coder:30b-a3b, dengcao/Qwen3-Reranker-4B:Q5_K_M, qwen3-vl:30b, qwen3-next:80b-a3b-instruct) into that store, currently ~100KB/s (slow; earlier this session the same registry gave ~28MB/s). Docker daemon is UP (29.4.3) with nim-llama32-3b + prism-qdrant/postgres/grafana/prometheus. A catalog change shipped as commit f737e23661 (5 qwen3 FLOOR ModelSpec entries in mcp-server/src/engines/ModelRoutingEngine.ts). Blueprint: H:/prism/state/shared/specs/LOCAL-LLM-FOUNDATION-BLUEPRINT-2026-06-03.md. Handoff: H:/prism/state/shared/handoffs/HANDOFF-golf-blackwell-gpu-sync.md.
RULES: Do NOT edit or write ANY file — investigation only. Use Read/Grep/Glob/Bash(curl,git,node,ollama,docker). Line numbers in the handoff/blueprint MAY BE STALE — re-locate every symbol in the live code. Report concise markdown with concrete file:line refs, the exact commands you ran + their key output, and clearly distinguish VERIFIED (you read/ran it) from INFERRED.

TASK B — PRE-STAGE THE GATED CONSUMER WIRING (highest value). For EACH item produce a DIFF-READY spec verified against LIVE code (re-locate exact lines): current snippet, exact change, and the model-presence guard so it degrades safely when the model is absent.
1) H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs — find DEFAULT_MODEL, the model-selection logic, and isAvailable(). Goal: DEFAULT_MODEL (reasoning hooks) -> 'qwen3-coder:30b-a3b' ONLY when present. Does isAvailable() check per-model or just server-up? Specify the per-model /api/tags guard so it f
... [+1603 chars truncated]

### Assistant | 2026-06-03T19:50:10.134Z

I'll investigate each item, re-locating symbols in the live code. Let me start with parallel reads and greps across all the target files.

### Assistant | 2026-06-03T19:50:10.134Z

[tool_use: Read]

### Assistant | 2026-06-03T19:50:10.138Z

[tool_use: Read]

### Assistant | 2026-06-03T19:50:10.267Z

[tool_use: Read]

### User | 2026-06-03T19:50:33.700Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graph-node-embedding-bridge.mjs — RAG-UPGRADE-MS0 / U-GNN-NODE-EMBED-BRIDGE
4	 *                                   (2026-05-23, slot golf).
5	 *
6	 * Closes the missing mapping layer that the empirical NN-GRAPH retrain
7	 * (commit-cluster 2026-05-22, `graphsage-checkpoint-768d-rag-upgrade.json`)
8	 * exposed: `embeddingHitCount=0`. The trainer's `loadEmbeddingFeat
... [+27148 chars truncated]

### User | 2026-06-03T19:50:35.018Z

[tool_result] 1	// tribal-graph-embedding.mjs
2	// Pure-ish Ollama nomic-embed-text 768d embedding helper for the tribal-graph
3	// system. Lateral wires across the L0-L8 hierarchy are computed by cosine
4	// similarity over these embeddings. Companion to tribal-graph-clusters.mjs.
5	//
6	// Karpathy R12 (fail-loud): every failure mode is surfaced. Partial-batch
7	// failures return { ok: false, error, partial:
... [+35222 chars truncated]

### User | 2026-06-03T19:50:35.033Z

[tool_result] 1	// tier: T4
2	/**
3	 * ollama-hook-bridge.mjs
4	 * Shared helper for hooks to call local Ollama with fast timeout and graceful fallback.
5	 *
6	 * Usage:
7	 *   import { queryOllama, isOllamaAvailable } from './lib/ollama-hook-bridge.mjs';
8	 *   const result = await queryOllama(prompt, { hookType: 'grep_index', timeoutMs: 300 });
9	 *   if (result.success) { use result.response } else { use reg
... [+6877 chars truncated]

### Assistant | 2026-06-03T19:50:41.002Z

Now let me read the MultiModelConsensusEngine, the ModelRoutingEngine catalog change, and grep for existing rerank helpers.

### Assistant | 2026-06-03T19:50:42.012Z

[tool_use: Read]

### Assistant | 2026-06-03T19:50:42.913Z

[tool_use: Grep]

### Assistant | 2026-06-03T19:50:43.504Z

[tool_use: Grep]

### User | 2026-06-03T19:51:24.133Z

[tool_result] 1	/**
2	 * MultiModelConsensusEngine — fan a prompt out to Claude + Codex + Ollama-deepseek-r1
3	 * in parallel, score agreement, recommend an answer.
4	 *
5	 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / OCTOPUS-CONSENSUS.
6	 *
7	 * Goal (per user): "more eyes on a task to hopefully cover all possible gaps
8	 * more efficiently". Three independent reasoners — Claude (deep, Anthropic),
9	 * gpt-5.5 xhi
... [+32043 chars truncated]

### User | 2026-06-03T19:51:36.488Z

[tool_result] Found 30 files
scripts\lib\master-index-search-lib.mjs
scripts\lib\memory-index-search-lib.mjs
scripts\lib\octopus-corpus-loader.test.mjs
scripts\lib\octopus-corpus-loader.mjs
scripts\lib\galaxy-salience.test.mjs
scripts\lib\galaxy-salience.mjs
scripts\lib\galaxy-context-card.mjs
scripts\lib\galaxy-context-card.test.mjs
scripts\lib\path-embed.mjs
scripts\lib\tribal-index-lock.mjs
scripts\lib\zulu-
... [+708 chars truncated]

### User | 2026-06-03T19:51:47.633Z

[tool_result] Found 11 files
mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts
mcp-server\src\engines\ModelRoutingEngine.ts
mcp-server\src\engines\tribal-knowledge\MEMORY.md
mcp-server\src\engines\tribal-knowledge\CLAUDE.md
mcp-server\src\__tests__\aiReasoningDispatcher.uRagPsnAiWire.test.ts
mcp-server\src\engines\RetrievalEvalEngine.ts
mcp-server\src\tools\dispatchers\mlDispatcher.ts
mcp-server\src\sch
... [+191 chars truncated]

### Assistant | 2026-06-03T19:51:56.112Z

[tool_use: Read]

### Assistant | 2026-06-03T19:51:55.218Z

The pre-grep hook flagged existing rerank assets. There IS an existing reranker. Let me read the most relevant ones plus the ModelRoutingEngine catalog change.

### Assistant | 2026-06-03T19:51:56.348Z

[tool_use: Read]

### User | 2026-06-03T19:52:08.005Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * rag-llm-rerank.mjs — HIGH-ROI-AI-PSN-SCOPE/U-RAG-RERANK-LLM (A7, 2026-05-23, slot golf).
4	 *
5	 * Stage-3 LLM reranker. Two-stage retrieval (cosine recall → lexical rerank)
6	 * leaves a top-N candidate set whose relative ordering still has noise. This
7	 * lib adds an optional Stage-3 LLM scoring pass that re-orders the top-N
8	 * using a small reasoning model (d
... [+7519 chars truncated]

### User | 2026-06-03T19:52:08.174Z

[tool_result] 1	// WIRE-EXEMPT: tests in __tests__/engines/ragStackU-LEARN-04.test.ts
2	/**
3	 * ReRankerEngine — U-LEARN-04
4	 * =============================
5	 *
6	 * Cross-encoder reranking for RAG results. Takes top-N candidates from
7	 * initial retrieval and refines to top-K using deeper semantic matching.
8	 *
9	 * Scoring Strategy
10	 * ----------------
11	 * Since we don't have a neural cross-encoder 
... [+11484 chars truncated]

### Assistant | 2026-06-03T19:52:17.033Z

Now let me read the ModelRoutingEngine and check the live Ollama state. Let me look at the qwen3 FLOOR entries and the routing tiers, plus run live probes.

### Assistant | 2026-06-03T19:52:18.666Z

[tool_use: Grep]

### Assistant | 2026-06-03T19:52:20.438Z

[tool_use: Bash]

### User | 2026-06-03T19:52:31.353Z

[tool_result] 6: * only queries that genuinely need frontier reasoning fall back to the paid
18: *      for this and paying frontier rates for vectors is wasteful.
20: *      we only consider free-tier backends.
44:  | "home_blackwell" // RTX PRO 6000 Blackwell 96GB — runs the 32B GPU tier (superset of home_4080)
49:export interface ModelSpec {
57:  /** 0-100 quality tier for general reasoning. */
59:  /** 0-10
... [+1773 chars truncated]

### User | 2026-06-03T19:52:59.925Z

[tool_result] deepseek-r1:14b 9.0GB
llama3.2-vision:11b 7.8GB
moondream:1.8b 1.7GB
nomic-embed-text:latest 0.3GB
qwen2.5-coder:14b 9.0GB
qwen2.5-coder:32b 19.9GB
qwen2.5-coder:3b 1.9GB
qwen2.5-coder:7b 4.7GB
qwen2.5vl:7b 6.0GB
qwen3-vl:8b 6.1GB
qwen3-vl:8b-instruct 6.1GB

### Assistant | 2026-06-03T19:53:09.787Z

VERIFIED live: the 5 qwen3 FLOOR models are NOT yet present in the Ollama store (only `qwen3-vl:8b` and `qwen3-vl:8b-instruct` exist; the 5 catalog entries `qwen3-coder:30b-a3b`, `qwen3-next:80b-a3b-instruct`, `qwen3-embedding:8b`, `qwen3-vl:30b`, plus `dengcao/Qwen3-Reranker-4B:Q5_K_M` are absent). This confirms every consumer wiring MUST be presence-gated. Let me read the full catalog block and the canServe/routing logic, plus check the reranker consumers and the tribal index.

### Assistant | 2026-06-03T19:53:10.250Z

[tool_use: Read]

### Assistant | 2026-06-03T19:53:11.079Z

[tool_use: Read]

### User | 2026-06-03T19:53:18.804Z

[tool_result] 600	      expectedCostUSD: winner.costUSD,
601	      fallbacks,
602	      error: null,
603	    };
604	  }
605	
606	  // ── internals ────────────────────────────────────────────────────────
607	
608	  private canServe(
609	    m: ModelSpec,
610	    req: RoutingRequest,
611	    ctx: RoutingContext,
612	    rationale: string[],
613	    hardFail: boolean,
614	  ): boolean {
615	    // Hardware must a
... [+5294 chars truncated]

### User | 2026-06-03T19:53:23.176Z

[tool_result] 125	export const DEFAULT_MODEL_CATALOG: ModelSpec[] = [
126	  // ── Local Ollama — Blackwell GPU tier (RTX PRO 6000 96GB) ───────────
127	  // The 2026-06-03 BLACKWELL-GPU-SWAP made these large local models free
128	  // and fast (warm ~220 tok/s, full GPU residency). They are the token-
129	  // saving payoff: a free 32B coder beats paid cloud on `code` and on
130	  // substantial `reasoning`/`ch
... [+6005 chars truncated]

### Assistant | 2026-06-03T19:53:31.718Z

[tool_use: Grep]

### Assistant | 2026-06-03T19:53:29.244Z

Now let me check the ModelRoutingEngine's `route()` entry and whether there's any `/api/tags` presence check (backendUp is the only liveness gate — it's per-backend, not per-model). Let me check the routing context construction and look for any existing presence-detection, plus check consumers of the tribal-embed-index.

### Assistant | 2026-06-03T19:53:30.474Z

[tool_use: Grep]

### User | 2026-06-03T19:53:46.592Z

[tool_result] 89:export interface RoutingContext {
96:  backendUp?: Partial<Record<Backend, boolean>>;
135:  // footprint from `ollama /api/tags`, not FP16.
191:  // `/api/tags` store). Tiers below are conservative FLOORS (well under the
196:  // + real vramGB happens via U-BW-CATALOG-REALIGN once `/api/tags` confirms
197:  // presence. The EMBEDDER stays below nomic(60) until the corpus is
206:    vramGB: 20, 
... [+464 chars truncated]

### User | 2026-06-03T19:53:47.009Z

[tool_result] Found 40 files limit: 40
scripts\embed-knowledge-store-into-tribal-index.mjs
scripts\embed-wiki-into-tribal-index.mjs
scripts\lib\embed-pool.mjs
scripts\regen-viz.mjs
scripts\build-wiki-embeddings.mjs
scripts\lib\tribal-graph-embedding.test.mjs
scripts\lib\tribal-graph-embedding.mjs
scripts\psn-synergy-collect.mjs
scripts\lib\nn-graph-eval.test.mjs
scripts\lib\master-index-search-lib.mjs
scripts\l
... [+1131 chars truncated]

### Assistant | 2026-06-03T19:53:58.126Z

Confirmed: `ModelRoutingEngine` has NO per-model presence gate — `canServe` only checks `backendUp?.[m.backend]` (per-backend boolean) and `runsOn` (hardware class). An unpulled model with a high tier WOULD be routed to. Now let me check the embed model refs in the key consumers (build-wiki-embeddings, embed scripts, hybrid-retrieval) for the dimension/model and the tribal index blast radius, plus check the blueprint and handoff to anchor the spec.

### Assistant | 2026-06-03T19:54:00.692Z

[tool_use: Grep]

### Assistant | 2026-06-03T19:54:01.485Z

[tool_use: Grep]

### Assistant | 2026-06-03T19:54:02.692Z

[tool_use: Grep]

### User | 2026-06-03T19:54:15.755Z

[tool_result] 3:// embedding index `state/shared/tribal-embed-index.json` (BRAIN-UPGRADE rank 12,
7:// `tribal-embed-index.json` (~200 MB: 768-d nomic vectors × ~14.7K entries) is

### User | 2026-06-03T19:54:15.757Z

[tool_result] 29:const DEFAULT_EMBED_MODEL = "nomic-embed-text";
130:// Embed query text via Ollama (default model: nomic-embed-text 768d, the

### User | 2026-06-03T19:54:15.775Z

[tool_result] 13: *     int8-quantized 768-d nomic-embed-text vectors → ~3.5 MB for ~4.5K entries.
20: * Embedding backend: Ollama `nomic-embed-text` at $OLLAMA_HOST (default
27: *   --model NAME   override embedding model (default nomic-embed-text)
47:  model: val("--model", "nomic-embed-text"),
194:  // Throughput: nomic-embed-text (137M) is GPU-idle when fed one request at a

### Assistant | 2026-06-03T19:54:21.660Z

Now let me check the broader blast radius for the embed-model swap — how many places hardcode `nomic-embed-text` and the tribal-embed-index path — plus verify the reranker model name format via ollama and grep consumers of rag-llm-rerank.

### Assistant | 2026-06-03T19:54:22.603Z

[tool_use: Grep]

### Assistant | 2026-06-03T19:54:23.530Z

[tool_use: Grep]

### Assistant | 2026-06-03T19:54:24.940Z

[tool_use: Grep]

### User | 2026-06-03T19:54:50.826Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-03T19:54:55.792Z

[tool_result] Found 5 files
.claude\hooks\lib\nim-hook-bridge.mjs
.claude\hooks\lib\ollama-hook-bridge.mjs
.claude\hooks\lib\vllm-hook-bridge.mjs
.claude\hooks\lib\nim-embed-bridge.mjs
.claude\hooks\lib\local-llm-bridge.mjs

### User | 2026-06-03T19:55:00.517Z

[tool_result] .claude\scripts\tribal-rerank.mjs:2
.claude\scripts\tribal-embed-index.mjs:2
.claude\scripts\roadmap-pass-retrieve.mjs:1
.claude\scripts\roadmap-pass-record.mjs:2
.claude\hooks\embedder-inject-qdrant.mjs:2
.claude\hooks\embed-vault-on-save.mjs:1
.claude\hooks\docker-intel-autostart.mjs:3
.claude\hooks\ollama-pipeline-injector.mjs:5
.claude\hooks\ollama-prewarm-on-pipeline.mjs:1
.claude\hooks\optim
... [+68 chars truncated]

### Assistant | 2026-06-03T19:55:08.117Z

There are sibling local-LLM bridges (nim/vllm/local-llm) that also reference DEFAULT_MODEL — relevant for understanding the per-model pattern. Let me check the local-llm-bridge for an existing per-model presence pattern (it may already have one I should reuse), verify the reranker model's exact tag via ollama, and check the consumer of node-embeddings (the retrain lifecycle) for the india-coordination blast radius.

### Assistant | 2026-06-03T19:55:10.756Z

[tool_use: Grep]

### Assistant | 2026-06-03T19:55:15.033Z

[tool_use: Bash]

### User | 2026-06-03T19:55:20.991Z

[tool_result] No matches found

### User | 2026-06-03T19:55:57.165Z

[tool_result] FINDSTR: Cannot open qwen3 rerank embedding
NO_QWEN3_PULLED_YET
---TAGS-PROBE---
qwen3/rerank/embed present: ["qwen3-vl:8b-instruct","qwen3-vl:8b"]

### Assistant | 2026-06-03T19:56:02.829Z

The findstr quoting failed but the node probe is authoritative: only `qwen3-vl:8b` and `qwen3-vl:8b-instruct` are present; none of the 5 gated models are pulled yet. The `local-llm-bridge.mjs` has no per-model presence helper. Let me do final targeted reads: the local-llm-bridge DEFAULT_MODEL context, the nn-graph-retrain-lifecycle consumer of node-embeddings, and confirm the embed-pool model ref for the swap blast radius.

### Assistant | 2026-06-03T19:56:05.526Z

[tool_use: Bash]

### Assistant | 2026-06-03T19:56:07.754Z

[tool_use: Bash]

### User | 2026-06-03T19:56:25.173Z

[tool_result] === H:/prism/.claude/hooks/lib/local-llm-bridge.mjs ===
8: *   vLLM       -> http://127.0.0.1:8020  (any HF model; deepseek-r1-distill, qwen-coder)
18: *   reasoning, code, errortriage  -> prefer vLLM (deepseek-r1, qwen-coder)
32: // Hook types where vLLM (deepseek-r1, qwen-coder) gives meaningfully better
=== H:/prism/scripts/lib/embed-pool.mjs ===
8: *   `nomic-embed-text` (137M params) leaves a
... [+34 chars truncated]

### User | 2026-06-03T19:56:39.012Z

[tool_result] === H:/prism/scripts/nn-graph-retrain-lifecycle.mjs (812 lines) ===
62: import { buildEmbeddingSource as buildNodeEmbeddingSource } from "./lib/graph-node-embedding-bridge.mjs";
70: const NODE_EMBED_PATH = path.join(NN_DIR, "node-embeddings-768d.jsonl");
251: * the trainer's embedding-source loader had nothing to load — the wiki tribal-
257: * lifecycle still runs the trainer WITHOUT --embedding-s
... [+1037 chars truncated]

### Assistant | 2026-06-03T19:58:35.241Z

I have everything I need. All symbols are re-located against live code. Here is the diff-ready spec.

---

# TASK B — Gated Consumer Wiring: Diff-Ready Spec

**Live GPU/model state (VERIFIED via `curl http://127.0.0.1:11434/api/tags`):** Only `qwen3-vl:8b` + `qwen3-vl:8b-instruct` are resident. The 5 gated targets (`qwen3-coder:30b-a3b`, `qwen3-next:80b-a3b-instruct`, `qwen3-embedding:8b`, `dengcao/Qwen3-Reranker-4B:Q5_K_M`, `qwen3-vl:30b`) are **NOT pulled** (driver still pulling at ~100KB/s). Every edit below MUST presence-gate or it will route to an absent model and fail. Resident models that ARE safe fallbacks: `qwen2.5-coder:7b` (4.7GB), `qwen2.5-coder:14b`, `qwen2.5-coder:32b` (19.9GB), `deepseek-r1:14b`, `nomic-embed-text:latest`.

---

## 1) `.claude/hooks/lib/ollama-hook-bridge.mjs` — DEFAULT_MODEL + per-model gate

**VERIFIED current state:**
- `DEFAULT_MODEL = 'qwen2.5-coder:7b'` at **line 16**.
- `HOOK_MODELS` map (reasoning-ish hooks `ai_feature`/`code_explain` already → `qwen2.5-coder:14b`) at **lines 19-27**.
- `isOllamaAvailable()` at **lines 46-77** — checks **server-up + non-empty model list ONLY** (`data.models.length > 0`). It does **NOT** check per-model presence. It fetches `/api/tags` and already has `data.models` in hand (line 68) but discards the names.
- Model selection in `queryOllama` at **line 121**: `const model = HOOK_MODELS[hookType] || DEFAULT_MODEL;` — no presence check before use.

**Exact change (presence-gated, NOT regex):** Add a per-model presence check that reuses the `/api/tags` fetch, and only promote reasoning hooks to `qwen3-coder:30b-a3b` when it is actually in the tag list, else fall back to `qwen2.5-coder:7b`.

Add a presence cache + helper after line 40 (`const CACHE_TTL_MS = 60000;`):
```js
// Per-model presence cache (reuses the /api/tags response, 60s TTL).
let cachedModelSet = null;
let modelSetTime = 0;

/** Returns a Set of installed model names from /api/tags (cached 60s). Empty set on any failure. */
export asy
... [+18341 chars truncated]
