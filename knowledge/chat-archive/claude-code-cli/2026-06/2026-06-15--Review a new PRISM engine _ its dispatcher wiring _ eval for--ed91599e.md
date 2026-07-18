---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Review a new PRISM engine + its dispatcher wiring + eval for correctness, edge c"
date: "2026-06-15"
first_ts: "2026-06-15T15:44:41.345Z"
last_ts: "2026-06-15T15:46:45.862Z"
cwd: "H:\\prism-slot-sierra"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a15cf14ad6e02591e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Review a new PRISM engine + its dispatcher wiring + eval for correctness, edge c

> **claude-code-cli** | 2026-06-15 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a15cf14ad6e02591e.jsonl`

## Transcript

### User | 2026-06-15T15:44:41.345Z

Review a new PRISM engine + its dispatcher wiring + eval for correctness, edge cases, and silent-failure risk. Read each file END-TO-END.

FILES:
1. H:/prism/mcp-server/src/engines/GraphRAGRetrievalEngine.ts (new engine)
2. H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts -- ONLY the graphrag_retrieve wiring: action in VICTOR_AI_DIRECT_ACTIONS (~line 213), schema in VICTOR_AI_DIRECT_SCHEMAS (search "graphrag_retrieve:"), handler `case "graphrag_retrieve"` (search it).
3. H:/prism/mcp-server/src/__tests__/GraphRAGRetrievalEngine.test.ts
4. H:/prism/mcp-server/src/__tests__/AIReasoningDispatcher.graphrag-wire.test.ts
5. H:/prism/scripts/graphrag-eval.mjs (recall@3 eval; self-re-execs with 8GB heap, esbuild-bundles the engine, runs 10 live queries)

CONTRACT (unit GRAPH-AS-LLM-CONTEXT-MS0/U-GAC02): GraphRAG retrieval. retrieve(query,opts): tokenize query -> score find-cache nodes by token overlap (id 3 / label 2 / info 1) -> top seeds -> ego-graph 1-hop expand each seed via graphContextLensEngine.extractEgoGraph (U-GAC01) -> aggregate+rank (seed bonus + proximity) -> summarize (injectable fn; default fail-soft Ollama -> deterministic extractive). Fail-loud on missing/corrupt find-cache. Composes on U-GAC01; never loads the 644MB graph.

CHECK (P0 crash/correctness/security, P1 real bug/edge, P2 minor):
- Ranking correctness: seed bonus + proximity (neighbor score = seedScore/(distance+1)); upsert dedup keeps max score / min distance -- any double-count or wrong ordering? topK cap correct?
- Token scoring: stopword removal, short-token drop, id/label/info precedence (else-if -- is that intended, i.e. a node scores ONLY its highest-tier hit per token, not cumulative)? Is that a bug or fine?
- Failure modes: missing find-cache (fail-loud + hint?), corrupt JSON (fail-loud?), empty query (throws?), no-match (graceful empty?), empty corpus (graceful?), ego-expansion throw (caught + warned, doesn't abort retrieve?).
- Summarizer: injectable for tests, noLlm 
... [+1058 chars truncated]

### Assistant | 2026-06-15T15:44:48.933Z

I'll read all five files end-to-end before forming any judgment.

### Assistant | 2026-06-15T15:44:49.327Z

[tool_use: Read]

### Assistant | 2026-06-15T15:44:49.470Z

[tool_use: Read]

### User | 2026-06-15T15:44:53.949Z

[tool_result] 1	/**
2	 * GraphRAGRetrievalEngine.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02
3	 * =================================================================
4	 * GraphRAG over the PRISM wiki + system-viz graph (Edge et al. arXiv:2404.16130,
5	 * RepoGraph ICLR-2025 ego-graph retrieval). Classic vector RAG misses multi-hop
6	 * manufacturing queries; GraphRAG seeds on query-matched entities then expands
7	 *
... [+12587 chars truncated]

### User | 2026-06-15T15:44:54.022Z

[tool_result] 1	/**
2	 * GraphRAGRetrievalEngine.test.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02
3	 * Real reference-value tests over an injected node corpus + adjacency fixture
4	 * (hermetic; injected deterministic summarizer -- no live LLM). Covers happy,
5	 * unknown, ambiguous, no-neighbors, oversized, malformed, + adversarial
6	 * (prompt-injection body, empty-wiki cold-start).
7	 */
8	import { describe, it
... [+7802 chars truncated]

### Assistant | 2026-06-15T15:45:00.973Z

[tool_use: Read]

### Assistant | 2026-06-15T15:45:01.114Z

[tool_use: Read]

### User | 2026-06-15T15:45:03.362Z

[tool_result] 1	/**
2	 * Round-trip wiring test for prism_ai:graphrag_retrieve
3	 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02). Invokes THROUGH executeAIReasoningAction
4	 * (schema validation + dispatch). Hermetic via fixture find-cache + adjacency
5	 * pointed at by PRISM_VIZ_FINDCACHE_PATH + PRISM_VIZ_ADJ_PATH.
6	 */
7	import { describe, it, expect, beforeAll, afterAll } from "vitest";
8	import { mkdtempSync, writ
... [+2823 chars truncated]

### User | 2026-06-15T15:45:03.364Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * graphrag-eval.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02 verifies_via channel.
4	 *
5	 * Measures recall@3 of GraphRAGRetrievalEngine.retrieve over the LIVE system-viz
6	 * find-cache + adjacency. A query "hits" when >=1 of its expected relevant terms
7	 * appears in a top-3 retrieved entity (id/label/info). Deterministic (noLlm).
8	 *
9	 * Runs the REAL TS engine b
... [+5205 chars truncated]

### Assistant | 2026-06-15T15:45:08.455Z

Now I need to read the dispatcher wiring sections.

### Assistant | 2026-06-15T15:45:09.614Z

[tool_use: Grep]

### User | 2026-06-15T15:45:11.118Z

[tool_result] 205-// PPR ranking + approval-chain status all become MCP-callable as a unified
206-// AI surface, instead of being dead engines on disk.
207-// ──────────────────────────────────────────────────────────────────────
208-const VICTOR_AI_DIRECT_ACTIONS = [
209-  "tribal_outcome_bridge_status",
210-  "knowledge_graph_project",
211-  "graph_importance_rank_global",
212-  "graph_context_lens_extract",

... [+3421 chars truncated]

### Assistant | 2026-06-15T15:45:18.407Z

[tool_use: Read]

### User | 2026-06-15T15:45:24.484Z

[tool_result] 4450	          noLlm: p?.noLlm,
4451	        });
4452	        break;
4453	      }
4454	      case "approval_chain_get": {
4455	        const { approvalChainEngine } = await import("../../engines/ApprovalChainEngine.js");
4456	        const p = params as any;
4457	        result = { success: true, data: approvalChainEngine.getChain(String(p?.chain_id ?? "")) };
4458	        break;
4459	      }
4460
... [+1029 chars truncated]

### Assistant | 2026-06-15T15:45:30.400Z

Now let me check how `result` flows to the caller — specifically how VICTOR_AI_DIRECT actions are wrapped versus other actions.

### Assistant | 2026-06-15T15:45:31.646Z

[tool_use: Grep]

### User | 2026-06-15T15:45:35.298Z

[tool_result] 15- * @milestone MILL-MASTER/P1-U05-PRISM-AI-ROUTE
16- */
17-
18-import { z } from "zod";
19-import { log } from "../../utils/Logger.js";
20:import { slimResponse } from "../../utils/responseSlimmer.js";
21-import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
22-import {
23-  AI_REASONING_ACTIONS,
24-  ACTION_AI_REASONING_SCHEMAS,
25-  type AIReasoningAction
... [+3716 chars truncated]

### Assistant | 2026-06-15T15:45:39.816Z

Now I have everything I need. Let me verify one edge I want to be certain about — the `topSeeds` schema gap and the `PRISM_VIZ_ADJ_PATH` env pickup.

### Assistant | 2026-06-15T15:45:41.330Z

[tool_use: Grep]

### Assistant | 2026-06-15T15:45:41.818Z

[tool_use: Grep]

### User | 2026-06-15T15:45:42.423Z

[tool_result] 69:  adjacencyPath?: string; // forwarded to extractEgoGraph
272:            adjacencyPath: opts.adjacencyPath,

### User | 2026-06-15T15:45:42.800Z

[tool_result] 81-  /** Enrich nodes with label/layer/kind/status via seekCard. Default true. */
82-  enrich?: boolean;
83-  /** Override the adjacency sidecar path (tests / non-default deployments). */
84:  adjacencyPath?: string;
85-}
86-
87-const MAX_HOPS = 12; // beyond real graph diameter; clamp absurd requests (e.g. 1000)
--
93- * and esbuild bundling (import.meta.url is unreliable post-bundle). */
94-func
... [+1325 chars truncated]

### Assistant | 2026-06-15T15:45:50.235Z

I have everything I need to render a complete verdict. Let me compile all findings.

### Assistant | 2026-06-15T15:45:50.947Z

[tool_use: Grep]

### User | 2026-06-15T15:45:53.615Z

[tool_result] No matches found

### Assistant | 2026-06-15T15:46:45.862Z

That confirms the gap I suspected. Now I have full evidence to render the verdict.

---

VERDICT: FAIL

summary: One P1 contract drift (the dispatcher schema exposes no `topSeeds` parameter while the engine accepts and respects it, so callers can never tune the seed count via MCP), one P1 test blind-spot (the "no-neighbors" test asserts a condition that would pass even if ego-expansion silently broke for isolated seeds), and one P2 scoring semantics issue (per-token else-if means a node that matches a query token in both its id and its label earns only 3 points, not 5, which can silently mis-rank nodes). No P0 crash paths found.

---

findings:

- [P1] `H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts:233-239` vs `H:/prism/mcp-server/src/engines/GraphRAGRetrievalEngine.ts:211-212` -- **`topSeeds` is a first-class engine parameter (controls how many query-matched seeds are ego-expanded, default 5) but is entirely absent from the `graphrag_retrieve` Zod schema and from the dispatcher `case "graphrag_retrieve"` handler (lines 4446-4451). A caller that passes `topSeeds` via MCP will have it silently dropped before the engine ever sees it.** The parameter is load-bearing: raising it from 5 to 10 on a broad query like "mill" changes the result set materially. The wiring test (`AIReasoningDispatcher.graphrag-wire.test.ts`) never passes `topSeeds`, so the gap is invisible to that test. Fix: add `topSeeds: z.number().int().min(1).max(20).optional()` to the schema and thread `topSeeds: p?.topSeeds` into the `retrieve()` call in the handler, mirroring how `topK`/`hops`/`maxNodes` are passed.

- [P1] `H:/prism/mcp-server/src/__tests__/GraphRAGRetrievalEngine.test.ts:94-101` -- **The "no-neighbors seed → center only, no expansion" test asserts `r.entities.every((e) => e.id === "eng.wedm.wire" || e.distance === 0)` (line 100). This assertion is trivially true if `eng.wedm.wire` is the ONLY entity in the result set (distance 0), which it would be whether ego-expa
... [+5065 chars truncated]
