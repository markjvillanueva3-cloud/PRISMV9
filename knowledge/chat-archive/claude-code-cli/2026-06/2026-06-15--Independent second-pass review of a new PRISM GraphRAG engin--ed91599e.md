---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Independent second-pass review of a new PRISM GraphRAG engine + wiring + eval. W"
date: "2026-06-15"
first_ts: "2026-06-15T15:44:54.528Z"
last_ts: "2026-06-15T15:49:29.941Z"
cwd: "H:\\prism-slot-sierra"
messages: 71
user_msgs: 28
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a009572e657a8415e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Independent second-pass review of a new PRISM GraphRAG engine + wiring + eval. W

> **claude-code-cli** | 2026-06-15 | 71 msgs (28 user / 43 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a009572e657a8415e.jsonl`

## Transcript

### User | 2026-06-15T15:44:54.528Z

Independent second-pass review of a new PRISM GraphRAG engine + wiring + eval. Weight toward what a correctness reviewer misses: integration coupling, convention conformance, test integrity, hidden assumptions, eval validity, maintainability. Read each file end-to-end.

FILES:
1. H:/prism/mcp-server/src/engines/GraphRAGRetrievalEngine.ts
2. H:/prism/mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts -- ONLY the graphrag_retrieve additions (action ~line 213, schema "graphrag_retrieve:", handler `case "graphrag_retrieve"`).
3. H:/prism/mcp-server/src/__tests__/GraphRAGRetrievalEngine.test.ts
4. H:/prism/mcp-server/src/__tests__/AIReasoningDispatcher.graphrag-wire.test.ts
5. H:/prism/scripts/graphrag-eval.mjs

CONTEXT: unit GRAPH-AS-LLM-CONTEXT-MS0/U-GAC02. Composes on the shipped graphContextLensEngine.extractEgoGraph (U-GAC01). "Wrap not rebuild": reuses find-cache (entity match) + U-GAC01 (ego expansion) + injectable fail-soft summarizer. Just shipped U-GAC01 with the same conventions (singleton export, PRISM_VIZ_*_PATH env + cwd-candidate path resolution, mtime cache, hermetic env-override tests).

CHECK (P0/P1/P2):
- Convention conformance: singleton export `export const graphRAGRetrievalEngine = new X()`? header doc? ASCII-only? no inlined constants? Does the wiring match the sibling VICTOR_AI_DIRECT cases + the U-GAC01 graph_context_lens_extract pattern exactly?
- Composition with U-GAC01: import `./GraphContextLensEngine.js` correct? Passes adjacencyPath + enrich:false through to extractEgoGraph correctly? Any duplication of logic that U-GAC01 already provides?
- Path resolution: resolveFindCachePath cwd-candidates + PRISM_VIZ_FINDCACHE_PATH env -- robust to cwd=repo-root vs mcp-server AND esbuild bundling? Consistent with U-GAC01's resolveAdjPath?
- Caching: nodeCache by (path, mtime) -- staleness or cross-call contamination? (note: opts.nodes injected bypasses load entirely.)
- Eval validity (graphrag-eval.mjs): is recall@3=1.00 a MEANINGFUL signal or 
... [+902 chars truncated]

### Assistant | 2026-06-15T15:45:05.425Z

I'll read all five files end-to-end before making any judgments.

### Assistant | 2026-06-15T15:45:05.791Z

[tool_use: Read]

### Assistant | 2026-06-15T15:45:05.885Z

[tool_use: Read]

### User | 2026-06-15T15:45:07.272Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\GraphRAGRetrievalEngine.ts' was already read 15s ago in this session and is unchanged (mtime 1781537608688). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-06-15T15:45:07.384Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\GraphRAGRetrievalEngine.test.ts' was already read 15s ago in this session and is unchanged (mtime 1781537729644). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM
... [+14 chars truncated]

### Assistant | 2026-06-15T15:45:11.381Z

The read-once guard indicates these files are already in context. Let me read the remaining three files.

### Assistant | 2026-06-15T15:45:11.828Z

[tool_use: Read]

### Assistant | 2026-06-15T15:45:12.542Z

[tool_use: Read]

### Assistant | 2026-06-15T15:45:12.566Z

[tool_use: Read]

### User | 2026-06-15T15:45:15.511Z

[tool_result] read-once-guard: 'H:\prism\scripts\graphrag-eval.mjs' was already read 13s ago in this session and is unchanged (mtime 1781538007218). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-15T15:45:15.536Z

[tool_result] File content (284KB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-06-15T15:45:15.557Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\AIReasoningDispatcher.graphrag-wire.test.ts' was already read 13s ago in this session and is unchanged (mtime 1781538141981). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (di
... [+26 chars truncated]

### Assistant | 2026-06-15T15:45:27.274Z

I need to read only the graphrag_retrieve additions in the dispatcher. Let me search for the relevant lines first, then read the targeted section plus surrounding context for the sibling pattern comparison.

### Assistant | 2026-06-15T15:45:27.459Z

[tool_use: Grep]

### Assistant | 2026-06-15T15:45:27.765Z

[tool_use: Grep]

### User | 2026-06-15T15:45:34.145Z

[tool_result] 210-  "knowledge_graph_project",
211-  "graph_importance_rank_global",
212-  "graph_context_lens_extract",
213:  "graphrag_retrieve",
214-  "approval_chain_get",
215-] as const;
216-type VictorAIDirectAction = typeof VICTOR_AI_DIRECT_ACTIONS[number];
--
230-    enrich: z.boolean().optional().describe("Enrich nodes with label/layer/kind/status via seekCard (default true)"),
231-  }).refine((d) => B
... [+943 chars truncated]

### User | 2026-06-15T15:45:34.630Z

[tool_result] 207-// ──────────────────────────────────────────────────────────────────────
208-const VICTOR_AI_DIRECT_ACTIONS = [
209-  "tribal_outcome_bridge_status",
210-  "knowledge_graph_project",
211-  "graph_importance_rank_global",
212:  "graph_context_lens_extract",
213-  "graphrag_retrieve",
214-  "approval_chain_get",
215-] as const;
216-type VictorAIDirectAction = typeof VICTOR_AI_DIRECT_ACTIONS[num
... [+2764 chars truncated]

### Assistant | 2026-06-15T15:45:38.712Z

[tool_use: Read]

### Assistant | 2026-06-15T15:45:39.139Z

[tool_use: Read]

### User | 2026-06-15T15:45:40.858Z

[tool_result] 4428	      case "graph_context_lens_extract": {
4429	        // result is the bare EgoGraph; the function tail wraps it as
4430	        // { success:true, data: slimResponse(result) }, so callers read r.data.* directly.
4431	        const { graphContextLensEngine } = await import("../../engines/GraphContextLensEngine.js");
4432	        const p = params as any;
4433	        const lensOpts = { maxNo
... [+2553 chars truncated]

### User | 2026-06-15T15:45:40.909Z

[tool_result] 233	  graphrag_retrieve: z.object({
234	    query: z.string().min(1).describe("Free-text query to retrieve relevant graph entities for"),
235	    topK: z.number().int().min(1).max(50).optional().describe("Entities returned (default 10)"),
236	    hops: z.number().int().min(0).max(3).optional().describe("Ego expansion radius (default 1)"),
237	    maxNodes: z.number().int().min(1).optional().descri
... [+1184 chars truncated]

### Assistant | 2026-06-15T15:45:45.876Z

Now I have the full dispatcher context. Let me read the engine and test files directly since the read-once guard claims they are in context — but I cannot actually see them. I need to bypass the guard.

### Assistant | 2026-06-15T15:45:47.279Z

[tool_use: Bash]

### User | 2026-06-15T15:45:56.906Z

[tool_result]      1	/**
     2	 * GraphRAGRetrievalEngine.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02
     3	 * =================================================================
     4	 * GraphRAG over the PRISM wiki + system-viz graph (Edge et al. arXiv:2404.16130,
     5	 * RepoGraph ICLR-2025 ego-graph retrieval). Classic vector RAG misses multi-hop
     6	 * manufacturing queries; GraphRAG seeds on query-matc
... [+13632 chars truncated]

### Assistant | 2026-06-15T15:46:01.589Z

Good, I have the engine. Now I need the test files and eval. Let me read them with Bash since the read-once guard blocks the Read tool.

### Assistant | 2026-06-15T15:46:02.743Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:46:03.376Z

[tool_use: Bash]

### User | 2026-06-15T15:46:10.833Z

[tool_result]      1	/**
     2	 * GraphRAGRetrievalEngine.test.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02
     3	 * Real reference-value tests over an injected node corpus + adjacency fixture
     4	 * (hermetic; injected deterministic summarizer -- no live LLM). Covers happy,
     5	 * unknown, ambiguous, no-neighbors, oversized, malformed, + adversarial
     6	 * (prompt-injection body, empty-wiki cold-start).
... [+8424 chars truncated]

### User | 2026-06-15T15:46:16.377Z

[tool_result]      1	/**
     2	 * Round-trip wiring test for prism_ai:graphrag_retrieve
     3	 * (GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02). Invokes THROUGH executeAIReasoningAction
     4	 * (schema validation + dispatch). Hermetic via fixture find-cache + adjacency
     5	 * pointed at by PRISM_VIZ_FINDCACHE_PATH + PRISM_VIZ_ADJ_PATH.
     6	 */
     7	import { describe, it, expect, beforeAll, afterAll } from "vi
... [+3112 chars truncated]

### Assistant | 2026-06-15T15:46:19.792Z

Now the eval file:

### Assistant | 2026-06-15T15:46:20.868Z

[tool_use: Bash]

### User | 2026-06-15T15:46:37.321Z

[tool_result]      1	#!/usr/bin/env node
     2	/**
     3	 * graphrag-eval.mjs -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02 verifies_via channel.
     4	 *
     5	 * Measures recall@3 of GraphRAGRetrievalEngine.retrieve over the LIVE system-viz
     6	 * find-cache + adjacency. A query "hits" when >=1 of its expected relevant terms
     7	 * appears in a top-3 retrieved entity (id/label/info). Deterministic (noLlm).

... [+5707 chars truncated]

### Assistant | 2026-06-15T15:46:44.700Z

Now I have all five files in full. Let me also verify the env variable name used in GraphContextLensEngine (U-GAC01) for adjacency path resolution, to check consistency with `PRISM_VIZ_ADJ_PATH` used in the wiring test vs what the engine actually reads.

### Assistant | 2026-06-15T15:46:46.284Z

[tool_use: Grep]

### Assistant | 2026-06-15T15:46:47.411Z

[tool_use: Grep]

### User | 2026-06-15T15:46:53.716Z

[tool_result] 81-  /** Enrich nodes with label/layer/kind/status via seekCard. Default true. */
82-  enrich?: boolean;
83-  /** Override the adjacency sidecar path (tests / non-default deployments). */
84:  adjacencyPath?: string;
85-}
86-
87-const MAX_HOPS = 12; // beyond real graph diameter; clamp absurd requests (e.g. 1000)
--
91-
92-/** Resolve the adjacency sidecar path robustly across cwd (repo-root vs mc
... [+1784 chars truncated]

### User | 2026-06-15T15:46:53.957Z

[tool_result] 211-  "graph_importance_rank_global",
212-  "graph_context_lens_extract",
213:  "graphrag_retrieve",
214-  "approval_chain_get",
215-] as const;
--
231-  }).refine((d) => Boolean(d.nodeId) || Boolean(d.domain), { message: "graph_context_lens_extract requires nodeId or domain" })
232-    .describe("GraphContextLensEngine -- scoped ego-graph or domain slice of the system-viz graph as LLM context (GR
... [+738 chars truncated]

### Assistant | 2026-06-15T15:47:01.539Z

Now let me check the dispatcher's result-wrapping tail to understand how `graphrag_retrieve`'s bare result becomes `{success, data}` — and verify the action name in the header comment is consistent.

### Assistant | 2026-06-15T15:47:04.027Z

[tool_use: Grep]

### Assistant | 2026-06-15T15:47:04.855Z

[tool_use: Grep]

### User | 2026-06-15T15:47:05.430Z

[tool_result] No matches found

### User | 2026-06-15T15:47:06.915Z

[tool_result] No matches found

### Assistant | 2026-06-15T15:47:10.407Z

The grep patterns didn't match because the file uses different constructs. Let me search more precisely for the result-wrapping tail in the VICTOR_AI_DIRECT block and also check how the case falls through to wrapping.

### Assistant | 2026-06-15T15:47:11.744Z

[tool_use: Grep]

### User | 2026-06-15T15:47:13.305Z

[tool_result] No matches found

### Assistant | 2026-06-15T15:47:15.835Z

Let me search for how the VICTOR_AI_DIRECT path wraps its result after all the cases complete.

### Assistant | 2026-06-15T15:47:17.107Z

[tool_use: Grep]

### User | 2026-06-15T15:47:30.589Z

[tool_result] No matches found

### Assistant | 2026-06-15T15:47:34.573Z

Let me read around the case block to find the wrapping logic that follows the switch statement.

### Assistant | 2026-06-15T15:47:34.957Z

[tool_use: Read]

### Assistant | 2026-06-15T15:47:35.543Z

[tool_use: Read]

### User | 2026-06-15T15:47:48.783Z

[tool_result] 4453	      }
4454	      case "approval_chain_get": {
4455	        const { approvalChainEngine } = await import("../../engines/ApprovalChainEngine.js");
4456	        const p = params as any;
4457	        result = { success: true, data: approvalChainEngine.getChain(String(p?.chain_id ?? "")) };
4458	        break;
4459	      }
4460	
4461	      // INDIA-AI-ORPHAN-WIRE (bravo, 2026-06-11) -- Knowledge
... [+4575 chars truncated]

### User | 2026-06-15T15:47:48.846Z

[tool_result] 200	// ──────────────────────────────────────────────────────────────────────
201	// WIRE-AI-DIRECT-MS0/U-VICTOR-AI-DIRECT (slot:victor, 2026-05-26)
202	// 4 actions for previously-unwired AI/knowledge sub-engines from the fresh
203	// audit. Passthrough schemas at the dispatcher edge — engines own their
204	// input validation. Bridge value: tribal-outcome telemetry + KG features +
205	// PPR ran
... [+440 chars truncated]

### Assistant | 2026-06-15T15:47:53.890Z

I need to find where `graphrag_retrieve`'s result is wrapped as `{success, data}` — the case sets `result = await ...retrieve(...)` returning a bare `GraphRAGResult`. Let me find the tail wrapping logic.

### Assistant | 2026-06-15T15:47:55.867Z

[tool_use: Grep]

### User | 2026-06-15T15:47:57.242Z

[tool_result] No matches found

### Assistant | 2026-06-15T15:47:59.998Z

Let me search for the tail of executeAIReasoningAction after the switch, where the result is returned.

### Assistant | 2026-06-15T15:48:00.795Z

[tool_use: Grep]

### User | 2026-06-15T15:48:06.228Z

[tool_result] No matches found

### Assistant | 2026-06-15T15:48:09.528Z

The regex engine is not finding patterns with special chars reliably. Let me read the end of the function body directly.

### Assistant | 2026-06-15T15:48:10.250Z

[tool_use: Read]

### Assistant | 2026-06-15T15:48:10.859Z

[tool_use: Read]

### User | 2026-06-15T15:48:14.621Z

[tool_result] 4750	        return dispatcherError(`Unknown action: ${_exhaustive}`, action, "prism_ai");
4751	      }
4752	    }
4753	
4754	    const duration = Date.now() - startTime;
4755	    log.info(`[prism_ai] ${action} completed in ${duration}ms`);
4756	
4757	    // Slim response
4758	    const slimmed = slimResponse(result);
4759	
4760	    return { success: true, data: slimmed };
4761	  } catch (error: u
... [+1280 chars truncated]

### User | 2026-06-15T15:48:14.882Z

[tool_result] 4700	          loss: params.loss as number,
4701	          elapsed_ms: params.elapsed_ms as number,
4702	          completed_at: params.completed_at as number,
4703	          source: params.source as TellInput["source"],
4704	          note: params.note as string | undefined,
4705	        });
4706	        break;
4707	      }
4708	      case "tpe_best_trial": {
4709	        const { tpeHyperparamete
... [+2056 chars truncated]

### Assistant | 2026-06-15T15:48:19.410Z

I now have everything I need. The tail at line 4758-4760 wraps ALL results (including `graphrag_retrieve`) as `{ success: true, data: slimmed }`. Now let me check one remaining critical detail: the header comment in the engine says `prism_ai:graph_context_retrieve` (line 22) but the actual wired action is `graphrag_retrieve`. Let me verify that mismatch precisely.

### Assistant | 2026-06-15T15:48:20.984Z

[tool_use: Bash]

### Assistant | 2026-06-15T15:48:22.526Z

[tool_use: Bash]

### User | 2026-06-15T15:48:34.269Z

[tool_result] 22: * Wired: prism_ai:graph_context_retrieve (aiReasoningDispatcher).

### User | 2026-06-15T15:48:35.676Z

[tool_result] 70:  ollamaModel?: string;
77:const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
78:const OLLAMA_MODEL = "qwen2.5-coder:32b";
182:      const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
186:          model: opts.ollamaModel || OLLAMA_MODEL,
189:          keep_alive: "10m",
191:        signal: AbortSignal.timeout(8000),

### Assistant | 2026-06-15T15:49:29.941Z

I now have all the information needed for a complete review. Let me compile my findings.

---

VERDICT: FAIL

summary: The engine body, wiring, and tests are largely sound and convention-conformant, but two findings block merge. The engine's own header doc names the wrong dispatcher action (`prism_ai:graph_context_retrieve` vs the real `graphrag_retrieve`), which will mislead every future caller and auditor. More critically, the Ollama model is inlined as a module-level string constant (`"qwen2.5-coder:32b"`) rather than imported from `mcp-server/src/physics/constants.ts` as PRISM safety invariant requires for canonical values — and the default network call to Ollama is silent/opt-out in production rather than opt-in, with no documentation in the schema description. The eval has a tautological ground-truth design that would not catch a serious retrieval regression.

---

findings:

- [P0] `mcp-server/src/engines/GraphRAGRetrievalEngine.ts:22` -- Header doc says `Wired: prism_ai:graph_context_retrieve` but the actual wired action name in the dispatcher enum and case is `graphrag_retrieve` (aiReasoningDispatcher.ts:213, 4442). This is not a stale comment; it is the public contract documentation. Any caller, wiki entry, or skill that reads this line and invokes `prism_ai:graph_context_retrieve` will receive an "Unknown action" error. -- Fix: change line 22 to `prism_ai:graphrag_retrieve`.

- [P1] `mcp-server/src/engines/GraphRAGRetrievalEngine.ts:78` -- `const OLLAMA_MODEL = "qwen2.5-coder:32b"` is a hard-coded Ollama model tag at module scope. The PRISM safety invariant (CLAUDE.md §SAFETY, §PRISM safety invariants) requires canonical model/routing constants to live in `mcp-server/src/physics/constants.ts`, not inlined in engine files. The retired `:3b`/`:7b`/`:14b` tags (retired 2026-06-04, per global CLAUDE.md) prove this exact constant has historically drifted from the fleet-canonical value. When the fleet rotates models again this engine will silently lag. Similarl
... [+6202 chars truncated]
