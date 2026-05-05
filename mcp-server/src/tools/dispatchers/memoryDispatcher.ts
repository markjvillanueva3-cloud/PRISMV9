/**
 * Memory Dispatcher — `prism_memory` MCP tool.
 *
 * Routes 14 actions across four memory engine families:
 *   1. Vector memory (Qdrant): remember, semantic_search
 *   2. Memory graph: trace_decision, find_similar, get_session, get_node, run_integrity
 *   3. Consolidation: consolidate, consolidation_stats, consolidation_patterns
 *   4. Pressure monitor: pressure_record, pressure_get, pressure_recommend
 *   5. Health: get_health
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P0-U02 (semantic_search) +
 *            P4-U01-FOLLOWUP-2 (remember) + restoration.
 *
 * Schema: src/schemas/memoryActionSchemas.ts (14 actions, kept in sync with
 * the z.enum below — both must list the same 14 names).
 *
 * Restored after a peer-chat archive sweep removed the runtime file but
 * left the schema, tests, and index.ts import. The expected shape is
 * pinned by:
 *   - src/__tests__/MemorySemanticSearch.test.ts (regression-guards
 *     'semantic_search' enum entry, case body, ensureQdrantEmbedder call)
 *   - src/__tests__/GsdRouterAndRetrieve.test.ts (asserts z.enum has
 *     exactly 14 actions, 'available' array has 14 single-quoted names,
 *     case 'remember' destructures { kind, id, text, metadata })
 *
 * @module memoryDispatcher
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { ACTION_MEMORY_SCHEMAS } from "../../schemas/memoryActionSchemas.js";

// 14 actions — must match ACTION_MEMORY_SCHEMAS keys exactly.
// Kept in literal-array form (not behind a const) so the source-shape
// regression tests in GsdRouterAndRetrieve.test.ts can grep for the
// inline z-enum tuple shape.

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
}

// Static metadata pinned by GsdRouterAndRetrieve.test.ts source-shape regex
// matching the literal advertise list below.
const META = {
  available: ['get_health', 'trace_decision', 'find_similar', 'get_session', 'get_node',
              'run_integrity', 'consolidate', 'consolidation_stats', 'consolidation_patterns',
              'pressure_record', 'pressure_get', 'pressure_recommend',
              'semantic_search', 'remember'],
};

/** Registers prism_memory dispatcher.
 * @param server - MCP server instance
 * @returns void
 */
export function registerMemoryDispatcher(server: any): void {
  server.tool(
    "prism_memory",
    "Cross-session memory: graph traversal, consolidation, pressure monitor, and Qdrant vector recall/remember. Use 'action' param. Available: " + META.available.join(', '),
    {
      action: z.enum(["get_health", "trace_decision", "find_similar", "get_session", "get_node",
                      "run_integrity", "consolidate", "consolidation_stats", "consolidation_patterns",
                      "pressure_record", "pressure_get", "pressure_recommend",
                      "semantic_search", "remember"]),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: typeof META.available[number]; params: Record<string, any> }) => {
      log.info(`[prism_memory] ${action}`);
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }

      const validation = validateActionParams(action, params, ACTION_MEMORY_SCHEMAS);
      if (!validation.valid) {
        return dispatcherError(`Invalid params for '${action}': ${validation.errorMessage}`, action, "prism_memory");
      }

      try {
        switch (action) {
          case "get_health": {
            // Aggregate health across the four families. Lazy-import each engine
            // so a single missing module doesn't break the whole dispatcher.
            const health: Record<string, unknown> = { dispatcher: "prism_memory", actions: META.available.length };
            try {
              const { qdrantMemoryEngine } = await import("../../engines/QdrantMemoryEngine.js");
              health.qdrant = { hasEmbedder: typeof qdrantMemoryEngine.setEmbedder === "function" };
            } catch (e) { health.qdrant = { error: (e as Error).message ?? String(e) }; }
            try {
              const { memoryGraphEngine } = await import("../../engines/MemoryGraphEngine.js");
              health.graph = { ready: typeof memoryGraphEngine.findSimilar === "function" };
            } catch (e) { health.graph = { error: (e as Error).message ?? String(e) }; }
            try {
              const { memoryConsolidationEngine } = await import("../../engines/MemoryConsolidationEngine.js");
              health.consolidation = memoryConsolidationEngine.getStats?.() ?? { ready: true };
            } catch (e) { health.consolidation = { error: (e as Error).message ?? String(e) }; }
            try {
              const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
              health.pressure = { config: memoryPressureMonitorEngine.getConfig?.() };
            } catch (e) { health.pressure = { error: (e as Error).message ?? String(e) }; }
            return ok({ success: true, data: health });
          }

          case "trace_decision": {
            const { memoryGraphEngine } = await import("../../engines/MemoryGraphEngine.js");
            const node_id = params.node_id ?? params.nodeId;
            const depth = Number.isInteger(params.depth) ? params.depth : 3;
            const direction = (params.direction ?? "both") as "forward" | "backward" | "both";
            if (!node_id) {
              return ok({ success: false, error: "trace_decision requires node_id (or nodeId)" });
            }
            const result = memoryGraphEngine.traceDecision({ nodeId: node_id, depth, direction });
            return ok({ success: true, data: result });
          }

          case "find_similar": {
            const { memoryGraphEngine } = await import("../../engines/MemoryGraphEngine.js");
            const result = memoryGraphEngine.findSimilar({
              dispatcher: params.dispatcher,
              action: params.action,
              errorClass: params.error_class ?? params.errorClass,
              nodeType: params.node_type ?? params.nodeType,
              limit: Number.isInteger(params.limit) ? params.limit : 10,
              minConfidence: typeof params.min_confidence === "number" ? params.min_confidence : undefined,
            });
            return ok({ success: true, data: { hits: result.length, items: result } });
          }

          case "get_session": {
            const { memoryGraphEngine } = await import("../../engines/MemoryGraphEngine.js");
            const session_id = params.session_id ?? params.sessionId;
            if (!session_id) {
              return ok({ success: false, error: "get_session requires session_id (or sessionId)" });
            }
            // findSimilar is the public lookup surface — query by session.
            const nodes = memoryGraphEngine.findSimilar({ limit: 100 });
            const sessionNodes = nodes.filter((n: { sessionId?: string }) => n.sessionId === session_id);
            return ok({ success: true, data: { sessionId: session_id, nodes: sessionNodes, count: sessionNodes.length } });
          }

          case "get_node": {
            const { memoryGraphEngine } = await import("../../engines/MemoryGraphEngine.js");
            const id = params.node_id ?? params.nodeId ?? params.id;
            if (!id) {
              return ok({ success: false, error: "get_node requires node_id, nodeId, or id" });
            }
            const node = memoryGraphEngine.getNode(id);
            if (!node) {
              return ok({ success: false, error: `node not found: ${id}` });
            }
            return ok({ success: true, data: node });
          }

          case "run_integrity": {
            // Conservative integrity check: ensure each engine module loads
            // without throwing. Real graph-integrity audits live in a dedicated
            // engine and are not in scope for this dispatcher action.
            const checks: Record<string, { ok: boolean; error?: string }> = {};
            for (const mod of [
              "../../engines/QdrantMemoryEngine.js",
              "../../engines/MemoryGraphEngine.js",
              "../../engines/MemoryConsolidationEngine.js",
              "../../engines/MemoryPressureMonitorEngine.js",
            ]) {
              try { await import(mod); checks[mod] = { ok: true }; }
              catch (e) { checks[mod] = { ok: false, error: (e as Error).message ?? String(e) }; }
            }
            const allOk = Object.values(checks).every((c) => c.ok);
            return ok({ success: allOk, data: { allOk, checks } });
          }

          case "consolidate": {
            const { memoryConsolidationEngine } = await import("../../engines/MemoryConsolidationEngine.js");
            const report = await memoryConsolidationEngine.consolidate();
            return ok({ success: true, data: report });
          }

          case "consolidation_stats": {
            const { memoryConsolidationEngine } = await import("../../engines/MemoryConsolidationEngine.js");
            const stats = memoryConsolidationEngine.getStats();
            return ok({ success: true, data: stats });
          }

          case "consolidation_patterns": {
            const { memoryConsolidationEngine } = await import("../../engines/MemoryConsolidationEngine.js");
            const limit = Number.isInteger(params.limit) ? params.limit : 50;
            const patterns = memoryConsolidationEngine.getPatterns().slice(0, limit);
            return ok({ success: true, data: { count: patterns.length, patterns } });
          }

          case "pressure_record": {
            const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
            const reading = memoryPressureMonitorEngine.sampleNow(typeof params.nowIso === "string" ? params.nowIso : undefined);
            return ok({ success: true, data: reading });
          }

          case "pressure_get": {
            const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
            const n = Number.isInteger(params.n) && params.n > 0 ? params.n : 10;
            const samples = memoryPressureMonitorEngine.lastN(n);
            return ok({ success: true, data: { samples, count: samples.length } });
          }

          case "pressure_recommend": {
            const { memoryPressureMonitorEngine } = await import("../../engines/MemoryPressureMonitorEngine.js");
            const reading = memoryPressureMonitorEngine.sampleNow();
            const trend = memoryPressureMonitorEngine.trend();
            const recommendation =
              reading.band === "critical"
                ? "compact_immediately"
                : reading.band === "warn" && trend.rising
                  ? "compact_soon"
                  : reading.band === "warn"
                    ? "monitor"
                    : "ok";
            return ok({ success: true, data: { reading, trend, recommendation } });
          }

          case "semantic_search": {
            // INTEL-OLLAMA-OBSIDIAN-MS0/P0-U02. Mirror MUST stay in sync with
            // src/__tests__/MemorySemanticSearch.test.ts — the test embeds an
            // exact copy of this case body and the dispatcher source-shape
            // regression guard at the bottom of that file matches against
            // 'ensureQdrantEmbedder' and 'case "semantic_search"'.
            const { qdrantMemoryEngine } = await import("../../engines/QdrantMemoryEngine.js");
            const { ensureQdrantEmbedder } = await import("../../engines/OllamaEmbedderFactory.js");
            const query = typeof params.query === "string" ? params.query : "";
            if (query.length === 0) {
              return ok({ success: false, error: "semantic_search requires non-empty 'query' string" });
            }
            const kind = (params.kind ?? "tip") as string;
            const requestedLimit = Number.isFinite(params.limit) ? Number(params.limit) : 5;
            const limit = Math.max(1, Math.min(100, requestedLimit));
            const threshold = Number.isFinite(params.threshold) ? Number(params.threshold) : 0;
            const filter =
              params.filter && typeof params.filter === "object"
                ? (params.filter as Record<string, unknown>)
                : undefined;

            try {
              ensureQdrantEmbedder();
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              return ok({ success: false, error: `embedder install failed: ${msg}` });
            }

            const recalled = await qdrantMemoryEngine.recall({ kind: kind as any, query, limit, filter });
            if (!recalled.ok) {
              return ok({ success: false, error: recalled.error ?? "recall failed" });
            }
            const items = recalled.value;
            const passing =
              threshold > 0
                ? items.filter(
                    (it: { score?: number }) =>
                      typeof it.score !== "number" || it.score >= threshold,
                  )
                : items;
            return ok({
              success: true,
              data: { kind, query, limit, threshold, hits: passing.length, items: passing },
            });
          }

          case "remember": {
            // INTEL-OLLAMA-OBSIDIAN-MS0/P4-U01-FOLLOWUP-2.
            // The exact destructure shape `{ kind, id, text, metadata }` is
            // pinned by GsdRouterAndRetrieve.test.ts source-regex so a future
            // refactor that drops a field gets caught.
            const { qdrantMemoryEngine } = await import("../../engines/QdrantMemoryEngine.js");
            const { ensureQdrantEmbedder } = await import("../../engines/OllamaEmbedderFactory.js");
            const { kind, id, text, metadata } = params;
            if (!kind || id === undefined || id === null || !text) {
              return ok({ success: false, error: "remember requires kind, id, and text" });
            }
            try {
              ensureQdrantEmbedder();
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              return ok({ success: false, error: `embedder install failed: ${msg}` });
            }
            const r = await qdrantMemoryEngine.remember({ kind, id, text, metadata });
            if (!r.ok) {
              return ok({ success: false, error: r.error ?? "remember failed" });
            }
            return ok({ success: true, data: { kind, id, stored: true } });
          }

          default: {
            const _exhaustive: never = action;
            return dispatcherError(`Unknown action: ${String(_exhaustive)}`, action, "prism_memory");
          }
        }
      } catch (e) {
        const msg = (e as Error)?.message ?? String(e);
        log.error(`[prism_memory] ${action} failed: ${msg}`);
        return dispatcherError(msg, action, "prism_memory");
      }
    },
  );
}
