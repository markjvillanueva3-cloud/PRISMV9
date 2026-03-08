/**
 * Knowledge Dispatcher - Consolidates 5 knowledge tools → 1
 * Actions: search, cross_query, formula, relations, stats
 * Uses KnowledgeQueryEngine for cross-registry search
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_KNOWLEDGE_SCHEMAS } from "../../schemas/knowledgeActionSchemas.js";

const ACTIONS = ["search", "cross_query", "formula", "relations", "stats",
  "tribal_capture", "tribal_search", "tribal_suggest", "tribal_stats"] as const;

let knowledgeEngine: any = null;

async function getEngine(): Promise<any> {
  if (!knowledgeEngine) {
    try {
      const mod = await import("../../engines/KnowledgeQueryEngine.js");
      knowledgeEngine = mod.knowledgeEngine || new mod.KnowledgeQueryEngine();
    } catch (e) {
      log.warn("[knowledgeDispatcher] KnowledgeQueryEngine not available, using fallback");
    }
  }
  return knowledgeEngine;
}

/** Registers knowledge dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerKnowledgeDispatcher(server: any): void {
  server.tool(
    "prism_knowledge",
    `Unified knowledge query across 9 PRISM registries. Actions: ${ACTIONS.join(", ")}`,
    {
      action: z.enum(ACTIONS).describe("Knowledge action"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters")
    },
    async ({ action, params: rawParams = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_knowledge] Action: ${action}`);
      const engine = await getEngine();
      let result: any;

      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        // SYS-MS6: Validate params against per-action Zod schema
        const validation = validateActionParams(action, params, ACTION_KNOWLEDGE_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action, "prism_knowledge"
          );
        }
        switch (action) {
          case "search": {
            if (!engine) { result = { error: "KnowledgeQueryEngine not loaded" }; break; }
            result = await engine.unifiedSearch(params.query || "", {
              registries: params.registries, limit: params.limit || 20, min_score: params.min_score || 0.2
            });
            break;
          }
          case "cross_query": {
            if (!engine) { result = { error: "KnowledgeQueryEngine not loaded" }; break; }
            result = await engine.crossRegistryQuery({
              task: params.task || "", context: params.context, required_registries: params.required_registries
            });
            break;
          }
          case "formula": {
            if (!engine) { result = { error: "KnowledgeQueryEngine not loaded" }; break; }
            result = await engine.findFormulas(params.need || "", {
              category: params.category, materialId: params.material_id, includeRelated: params.include_related !== false
            });
            break;
          }
          case "relations": {
            let kgEngine: any = null;
            try {
              const kgMod = await import("../../engines/KnowledgeGraphEngine.js");
              kgEngine = kgMod.knowledgeGraph;
            } catch { /* KnowledgeGraphEngine not available */ }
            if (!kgEngine) { result = { error: "KnowledgeGraphEngine not loaded" }; break; }
            result = kgEngine("graph_traverse", {
              start_node: params.source_id || params.node_id || "",
              edge_types: params.edge_types,
              depth: params.depth || 2,
            });
            break;
          }
          case "stats": {
            if (!engine) { result = { error: "KnowledgeQueryEngine not loaded" }; break; }
            result = await engine.getStats();
            break;
          }
          // ── Tribal Knowledge ──
          case "tribal_capture": {
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            result = tribalKnowledgeEngine.capture({
              title: params.title ?? "Untitled Tip",
              body: params.body ?? params.content ?? "",
              category: params.category ?? "general",
              source: params.source ?? "operator",
              material_groups: params.material_groups ?? (params.material_iso ? [params.material_iso] : undefined),
              operation_types: params.operation_types ?? (params.operation_type ? [params.operation_type] : undefined),
              confidence: params.confidence ?? 70,
              tags: params.tags ?? [],
            });
            break;
          }
          case "tribal_search": {
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            result = tribalKnowledgeEngine.search({
              query: params.query ?? "",
              category: params.category,
              material_iso_group: params.material_iso_group ?? params.material_iso,
              operation_type: params.operation_type,
              min_confidence: params.min_confidence,
              limit: params.limit ?? 10,
            });
            break;
          }
          case "tribal_suggest": {
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            result = tribalKnowledgeEngine.suggest(
              params.material_iso_group ?? params.material_iso ?? "P",
              params.operation_type ?? "milling",
            );
            break;
          }
          case "tribal_stats": {
            const { tribalKnowledgeEngine } = await import("../../engines/TribalKnowledgeEngine.js");
            result = tribalKnowledgeEngine.stats();
            break;
          }
        }
        return { content: [{ type: "text", text: JSON.stringify(slimResponse(result)) }] };
      } catch (error: any) {
        return dispatcherError(error, action, "prism_knowledge");
      }
    }
  );
}
