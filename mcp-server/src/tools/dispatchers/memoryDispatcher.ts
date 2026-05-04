/**
 * PRISM Memory Graph Dispatcher (#27)
 * =====================================
 *
 * prism_memory — 14 actions across MemoryGraph + MemoryConsolidation +
 * MemoryPressureMonitor + Qdrant vector recall/write.
 *
 * Graph (F2):
 *   get_health       — Graph stats, memory, integrity
 *   trace_decision   — Follow decision chain (forward/backward/both)
 *   find_similar     — Find similar nodes by dispatcher/action/error
 *   get_session      — All nodes from a specific session
 *   get_node         — Single node by ID
 *   run_integrity    — Force integrity check
 *
 * Consolidation:
 *   consolidate, consolidation_stats, consolidation_patterns
 *
 * Pressure (CPP-MS2 U-CPP15):
 *   pressure_record, pressure_get, pressure_recommend
 *
 * Vector recall (INTEL-OLLAMA-OBSIDIAN-MS0/P0-U02):
 *   semantic_search  — Embed query via Ollama nomic-embed-text and pull
 *                      cosine-nearest hits from QdrantMemoryEngine.recall().
 *                      Optional threshold filters out low-similarity hits
 *                      after the engine call.
 *
 * Vector write (INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01-FOLLOWUP-2):
 *   remember         — Embed text via Ollama nomic-embed-text and write it
 *                      to QdrantMemoryEngine under the requested kind. Validation
 *                      mirrors ACTION_MEMORY_SCHEMAS.remember (max 32KB text,
 *                      kind ∈ MEMORY_KINDS, id is string|number). Used by the
 *                      P4-U01 chunker and P4-U02 directive summarizer.
 *
 * @version 1.1.0
 * @feature F2 + INTEL-MS0
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { memoryGraphEngine } from "../../engines/MemoryGraphEngine.js";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_MEMORY_SCHEMAS } from "../../schemas/memoryActionSchemas.js";
// INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01-FOLLOWUP-2: type-only import widens the
// `kind` cast in case "remember" to all 14 registered MEMORY_KINDS instead
// of duplicating the union literal here (drift-prevention).
import type { MemoryKind } from "../../engines/QdrantMemoryEngine.js";

/** MCP server with dynamic tool registration — avoids bare `as any` on server calls */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidatedServer = any;

/** Memory graph nodes have dynamic fields depending on node type — use instead of bare `as any` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GraphNodeRecord = Record<string, any>;

/** Registers memory dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerMemoryDispatcher(server: McpServer): void {
  (server as ValidatedServer).tool(
    "prism_memory",
    "Cross-session memory graph + Qdrant vector recall. Actions: get_health, trace_decision, find_similar, get_session, get_node, run_integrity, consolidate, consolidation_stats, consolidation_patterns, pressure_record, pressure_get, pressure_recommend, semantic_search, remember",
    {
      action: z.enum([
        "get_health",
        "trace_decision",
        "find_similar",
        "get_session",
        "get_node",
        "run_integrity",
        "consolidate",
        "consolidation_stats",
        "consolidation_patterns",
        // CPP-MS2 U-CPP15: MemoryPressureMonitorEngine
        "pressure_record",
        "pressure_get",
        "pressure_recommend",
        // INTEL-OLLAMA-OBSIDIAN-MS0/P0-U02: Qdrant vector-similarity recall
        "semantic_search",
        // INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01-FOLLOWUP-2: write to a Qdrant kind/collection
        "remember",
        // INTEL-OLLAMA-OBSIDIAN-MS0/LAYER-3-OBSIDIAN-PERSIST: consensus second-brain
        "consensus_persist",
        "consensus_recall",
        "consensus_recent",
      ]).describe("Memory graph + pressure monitor + Qdrant semantic search/write + consensus second-brain actions"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters"),
    },
    async (args: { action: string; params?: Record<string, any> }) => {
      const { action, params: rawParams = {} } = args;
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      const start = performance.now();

      const validation = validateActionParams(action, params, ACTION_MEMORY_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_memory"
        );
      }
      try {
        let result: any;

        switch (action) {
          case "get_health": {
            const health = memoryGraphEngine.getHealth();
            const stats = memoryGraphEngine.getStats();
            result = {
              ...health,
              sessions: stats.sessions,
              dispatchers: stats.dispatchers,
              memory_kb: (health.memoryUsageBytes / 1024).toFixed(0),
            };
            break;
          }

          case "trace_decision": {
            const nodeId = params.node_id || params.nodeId;
            if (!nodeId) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing 'node_id' parameter" }) }] };
            }
            const trace = memoryGraphEngine.traceDecision({
              nodeId,
              depth: params.depth ?? 3,
              direction: params.direction ?? 'both',
            });
            result = {
              nodes: trace.nodes.length,
              edges: trace.edges.length,
              trace: {
                nodes: trace.nodes.slice(0, 50).map(n => ({
                  id: n.id,
                  type: n.type,
                  timestamp: new Date(n.timestamp).toISOString(),
                  ...('dispatcher' in n ? { dispatcher: n.dispatcher, action: (n as GraphNodeRecord).action } : {}),
                  ...('success' in n ? { success: (n as GraphNodeRecord).success } : {}),
                  ...('errorClass' in n ? { errorClass: (n as GraphNodeRecord).errorClass } : {}),
                  tags: n.tags,
                })),
                edges: trace.edges.slice(0, 100).map(e => ({
                  id: e.id,
                  type: e.type,
                  source: e.sourceId,
                  target: e.targetId,
                  weight: e.weight,
                })),
              },
            };
            break;
          }

          case "find_similar": {
            const nodes = memoryGraphEngine.findSimilar({
              dispatcher: params.dispatcher,
              action: params.action,
              errorClass: params.error_class || params.errorClass,
              nodeType: params.node_type || params.nodeType,
              limit: params.limit ?? 10,
              minConfidence: params.min_confidence,
            });
            result = {
              count: nodes.length,
              nodes: nodes.map(n => ({
                id: n.id,
                type: n.type,
                timestamp: new Date(n.timestamp).toISOString(),
                ...('dispatcher' in n ? { dispatcher: n.dispatcher, action: (n as GraphNodeRecord).action } : {}),
                ...('success' in n ? { success: (n as GraphNodeRecord).success } : {}),
                ...('confidence' in n ? { confidence: (n as GraphNodeRecord).confidence } : {}),
                tags: n.tags,
              })),
            };
            break;
          }

          case "get_session": {
            const sessionId = params.session_id || params.sessionId;
            if (!sessionId) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing 'session_id' parameter" }) }] };
            }
            const nodes = memoryGraphEngine.getNodesBySession(sessionId);
            result = {
              session: sessionId,
              node_count: nodes.length,
              nodes: nodes.slice(0, 50).map(n => ({
                id: n.id,
                type: n.type,
                timestamp: new Date(n.timestamp).toISOString(),
                ...('dispatcher' in n ? { dispatcher: n.dispatcher, action: (n as GraphNodeRecord).action } : {}),
                tags: n.tags,
              })),
            };
            break;
          }

          case "get_node": {
            const nodeId = params.node_id || params.nodeId || params.id;
            if (!nodeId) {
              return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Missing 'node_id' parameter" }) }] };
            }
            const node = memoryGraphEngine.getNode(nodeId);
            result = node || { error: `Node not found: ${nodeId}` };
            break;
          }

          case "run_integrity": {
            const check = memoryGraphEngine.runIntegrityCheck();
            result = {
              ...check,
              health: memoryGraphEngine.getHealth(),
            };
            break;
          }

          case "consolidate": {
            const { memoryConsolidationEngine } = await import("../../engines/MemoryConsolidationEngine.js");
            const report = await memoryConsolidationEngine.consolidate();
            result = report || { message: "Consolidation not needed yet", stats: memoryConsolidationEngine.getStats() };
            break;
          }

          case "consolidation_stats": {
            const { memoryConsolidationEngine: mce } = await import("../../engines/MemoryConsolidationEngine.js");
            result = mce.getStats();
            break;
          }

          case "consolidation_patterns": {
            const { memoryConsolidationEngine: mce2 } = await import("../../engines/MemoryConsolidationEngine.js");
            const patterns = mce2.getPatterns();
            result = { count: patterns.length, patterns: patterns.slice(0, params.limit ?? 50) };
            break;
          }

          // ============================================================
          // CPP-MS2 U-CPP15: MEMORY PRESSURE MONITOR
          // ============================================================
          case "pressure_record": {
            const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
            const reading = memoryPressureMonitorEngine.sampleNow(params.nowIso);
            result = { success: true, data: reading };
            break;
          }
          case "pressure_get": {
            const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
            const n = Number.isInteger(params.n) && params.n > 0 ? params.n : 10;
            const samples = memoryPressureMonitorEngine.lastN(n);
            const trend = memoryPressureMonitorEngine.trend();
            result = { success: true, data: { samples, trend } };
            break;
          }
          case "pressure_recommend": {
            const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
            const reading = memoryPressureMonitorEngine.sampleNow();
            const trend = memoryPressureMonitorEngine.trend();
            let recommendation = "continue";
            if (reading.band === "critical") {
              recommendation = "compact_now";
            } else if (reading.band === "warn" && trend.rising) {
              recommendation = "compact_soon";
            } else if (reading.band === "warn") {
              recommendation = "monitor";
            } else if (trend.rising && reading.heapUtilization >= 0.8) {
              recommendation = "watch_trend";
            }
            result = { success: true, data: { reading, trend, recommendation } };
            break;
          }

          // ============================================================
          // INTEL-OLLAMA-OBSIDIAN-MS0/P0-U02: Qdrant semantic vector search
          // ============================================================
          case "semantic_search": {
            const query = typeof params.query === "string" ? params.query : "";
            if (query.length === 0) {
              result = { success: false, error: "semantic_search requires non-empty 'query' string" };
              break;
            }
            const kind = (params.kind ?? "tip") as
              | "program"
              | "outcome"
              | "tip"
              | "formula"
              | "rule"
              | "playbook"
              | "note"
              | "wiki";
            const requestedLimit = Number.isFinite(params.limit) ? Number(params.limit) : 5;
            const limit = Math.max(1, Math.min(100, requestedLimit));
            const threshold = Number.isFinite(params.threshold) ? Number(params.threshold) : 0;
            const filter = (params.filter && typeof params.filter === "object")
              ? (params.filter as Record<string, unknown>)
              : undefined;

            // ── INTEL-OLLAMA-OBSIDIAN-MS0/P4-U04: wiki kind routes to TF-IDF backstop ──
            // Wiki queries do not need an embedder service. We bypass Qdrant entirely
            // and return TF-IDF cosine matches over knowledge/wiki/index.md (722 entries).
            // Save: ~600 tokens/query vs the caller having to read raw wiki files.
            if (kind === "wiki") {
              const { wikiIndexQueryEngine } = await import("../../engines/WikiIndexQueryEngine.js");
              const wikiResults = wikiIndexQueryEngine.query(query, { limit, minScore: threshold });
              const items = wikiResults.map((r) => ({
                slug: r.entry.slug,
                title: r.entry.title,
                description: r.entry.description,
                category: r.entry.category,
                source_path: r.entry.source_path,
                score: r.score,
                matched_tokens: r.matched_tokens,
              }));
              result = {
                success: true,
                data: {
                  kind,
                  query,
                  limit,
                  threshold,
                  hits: items.length,
                  items,
                  backend: "wiki_tfidf",
                },
              };
              break;
            }

            const { qdrantMemoryEngine } = await import("../../engines/QdrantMemoryEngine.js");
            const { ensureQdrantEmbedder } = await import("../../engines/OllamaEmbedderFactory.js");
            try {
              ensureQdrantEmbedder();
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              result = { success: false, error: `embedder install failed: ${msg}`, kind, query };
              break;
            }
            const recalled = await qdrantMemoryEngine.recall({ kind, query, limit, filter });
            if (!recalled.ok) {
              result = { success: false, error: recalled.error ?? "recall failed", kind, query };
              break;
            }
            const items = recalled.value;
            const passing = threshold > 0
              ? items.filter((it) => typeof (it as { score?: number }).score !== "number" || (it as { score: number }).score >= threshold)
              : items;
            result = {
              success: true,
              data: {
                kind,
                query,
                limit,
                threshold,
                hits: passing.length,
                items: passing,
              },
            };
            break;
          }

          // INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01-FOLLOWUP-2: write a chunk into a Qdrant
          // kind/collection. Mirrors the Zod validation in
          // memoryActionSchemas.ts.ACTION_MEMORY_SCHEMAS.remember (text length,
          // kind enum, id type) — keep the two in sync if either changes.
          // P4-U01's chunk-gsd-vault.mjs is the primary writer (kind="gsd"); the
          // P4-U02 directive summarizer + P4-U04 wiki bridge will use this for
          // their own kinds (directive, wiki).
          case "remember": {
            const kind = (typeof params.kind === "string" ? params.kind : "note") as MemoryKind;
            const id = params.id ?? "";
            const text = typeof params.text === "string" ? params.text : "";
            if (!text || (typeof id !== "string" && typeof id !== "number") || id === "") {
              result = { success: false, error: "remember requires non-empty 'kind', 'id', and 'text' parameters" };
              break;
            }
            const metadata = (params.metadata && typeof params.metadata === "object")
              ? (params.metadata as Record<string, unknown>)
              : undefined;
            const { qdrantMemoryEngine } = await import("../../engines/QdrantMemoryEngine.js");
            const { ensureQdrantEmbedder } = await import("../../engines/OllamaEmbedderFactory.js");
            try {
              ensureQdrantEmbedder();
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              result = { success: false, error: `embedder install failed: ${msg}`, kind, id };
              break;
            }
            const r = await qdrantMemoryEngine.remember({ kind, id, text, metadata });
            result = r.ok
              ? { success: true, data: { kind, id, indexed: true, textBytes: text.length } }
              : { success: false, error: r.error ?? "remember failed", kind, id };
            break;
          }

          // INTEL-OLLAMA-OBSIDIAN-MS0/LAYER-3-OBSIDIAN-PERSIST: persist a
          // ConsensusResult into the wiki second-brain. Caller passes the
          // raw result + prompt; engine handles atomic write, log, index,
          // and optional Obsidian vault mirror.
          case "consensus_persist": {
            const prompt = typeof params.prompt === "string" ? params.prompt : "";
            const consensusResult = params.result;
            if (!prompt || !consensusResult || typeof consensusResult !== "object") {
              result = { success: false, error: "consensus_persist requires non-empty 'prompt' and 'result' params" };
              break;
            }
            const { consensusObsidianPersistenceEngine } = await import("../../engines/ConsensusObsidianPersistenceEngine.js");
            const r = consensusObsidianPersistenceEngine.persist({
              prompt,
              taskType: typeof params.task_type === "string" ? params.task_type : params.taskType,
              sourceSession: typeof params.source_session === "string" ? params.source_session : params.sourceSession,
              result: consensusResult as Parameters<typeof consensusObsidianPersistenceEngine.persist>[0]["result"],
              wikiRoot: typeof params.wiki_root === "string" ? params.wiki_root : params.wikiRoot,
              obsidianVaultRoot: params.obsidian_vault_root ?? params.obsidianVaultRoot ?? undefined,
            });
            result = r.ok
              ? { success: true, data: r }
              : { success: false, error: r.error ?? "persist failed", data: r };
            break;
          }

          // Recall the canonical consensus artifact for an exact prompt.
          // Returns the markdown body so callers can re-use the previous
          // consensus answer instead of paying for a fresh fan-out.
          case "consensus_recall": {
            const prompt = typeof params.prompt === "string" ? params.prompt : "";
            if (!prompt) {
              result = { success: false, error: "consensus_recall requires 'prompt' param" };
              break;
            }
            const { consensusObsidianPersistenceEngine } = await import("../../engines/ConsensusObsidianPersistenceEngine.js");
            const fs = await import("node:fs");
            const path = await import("node:path");
            const wikiRoot = (typeof params.wiki_root === "string" ? params.wiki_root : params.wikiRoot) ?? process.env.PRISM_WIKI_ROOT ?? "H:/prism/knowledge/wiki";
            const promptHash = consensusObsidianPersistenceEngine.hashPrompt(prompt);
            const sha8 = promptHash.slice(0, 8);
            const wikiPath = path.join(wikiRoot, "consensus", `${sha8}.md`);
            if (!fs.existsSync(wikiPath)) {
              result = { success: false, error: "no consensus artifact for this prompt", promptHash, sha8, wikiPath };
              break;
            }
            const body = fs.readFileSync(wikiPath, "utf-8");
            result = { success: true, data: { promptHash, sha8, wikiPath, body, sizeBytes: body.length } };
            break;
          }

          // List the most recent consensus runs from the consensus index.
          // Default limit 20. Each entry is one parsed line from index.md.
          case "consensus_recent": {
            const fs = await import("node:fs");
            const path = await import("node:path");
            const wikiRoot = (typeof params.wiki_root === "string" ? params.wiki_root : params.wikiRoot) ?? process.env.PRISM_WIKI_ROOT ?? "H:/prism/knowledge/wiki";
            const limit = typeof params.limit === "number" && params.limit > 0 ? Math.min(params.limit, 200) : 20;
            const indexPath = path.join(wikiRoot, "consensus", "index.md");
            if (!fs.existsSync(indexPath)) {
              result = { success: true, data: { entries: [], indexPath, count: 0 } };
              break;
            }
            const raw = fs.readFileSync(indexPath, "utf-8");
            const lines = raw.split("\n").filter((l) => l.startsWith("- [["));
            const recent = lines.slice(-limit).reverse();
            const entries = recent.map((line) => {
              const sha8Match = line.match(/\[\[([0-9a-f]{8})\]\]/);
              const tsMatch = line.match(/· (\d{4}-\d{2}-\d{2}T[\d:.]+Z) ·/);
              const taskMatch = line.match(/task:(\S+)/);
              const recMatch = line.match(/rec:(\S+)/);
              const agreementMatch = line.match(/agreement:(\S+)/);
              const votersMatch = line.match(/voters:(\d+)/);
              return {
                sha8: sha8Match?.[1] ?? null,
                ts: tsMatch?.[1] ?? null,
                task_type: taskMatch?.[1] ?? null,
                recommendation: recMatch?.[1] ?? null,
                agreement_score: agreementMatch ? Number(agreementMatch[1]) : null,
                voter_count: votersMatch ? Number(votersMatch[1]) : null,
              };
            });
            result = { success: true, data: { entries, indexPath, count: entries.length } };
            break;
          }

          default:
            result = { error: `Unknown action: ${action}`, available: ['get_health', 'trace_decision', 'find_similar', 'get_session', 'get_node', 'run_integrity', 'consolidate', 'consolidation_stats', 'consolidation_patterns', 'pressure_record', 'pressure_get', 'pressure_recommend', 'semantic_search', 'remember', 'consensus_persist', 'consensus_recall', 'consensus_recent'] };
        }

        const elapsed = (performance.now() - start).toFixed(1);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(slimResponse({ ...result, _action: action, _elapsed_ms: elapsed })),
          }],
        };
      } catch (error) {
        return dispatcherError(error, action, "prism_memory");
      }
    }
  );

  log.info("[MEMORY_DISPATCH] prism_memory registered (17 actions)");
}
