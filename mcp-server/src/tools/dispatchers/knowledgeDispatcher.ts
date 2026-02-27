/**
 * Knowledge Dispatcher - Consolidates 5 knowledge tools → 1
 * Actions: search, cross_query, formula, relations, stats
 * Uses KnowledgeQueryEngine for cross-registry search
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

const ACTIONS = ["search", "cross_query", "formula", "relations", "stats"] as const;
const REGISTRIES = ["materials", "machines", "tools", "alarms", "formulas", "skills", "scripts", "agents", "hooks"] as const;

let knowledgeEngine: any = null;

function getEngine() {
  if (!knowledgeEngine) {
    try {
      const mod = require("../../engines/KnowledgeQueryEngine.js");
      knowledgeEngine = mod.knowledgeEngine || new mod.KnowledgeQueryEngine();
    } catch (e) {
      log.warn("[knowledgeDispatcher] KnowledgeQueryEngine not available, using fallback");
    }
  }
  return knowledgeEngine;
}

export function registerKnowledgeDispatcher(server: any): void {
  server.tool(
    "prism_knowledge",
    `Unified knowledge query across 9 PRISM registries. Actions: ${ACTIONS.join(", ")}`,
    {
      action: z.enum(ACTIONS).describe("Knowledge action"),
      params: z.record(z.any()).optional().describe("Action parameters")
    },
    async ({ action, params: rawParams = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_knowledge] Action: ${action}`);
      const engine = getEngine();
      let result: any;

      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
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
            if (!engine) { result = { error: "KnowledgeQueryEngine not loaded" }; break; }
            // Relations not yet implemented in engine — return stub
            result = { error: "relations action not yet implemented in KnowledgeQueryEngine", source_id: params.source_id };
            break;
          }
          case "stats": {
            if (!engine) { result = { error: "KnowledgeQueryEngine not loaded" }; break; }
            result = await engine.getStats();
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
