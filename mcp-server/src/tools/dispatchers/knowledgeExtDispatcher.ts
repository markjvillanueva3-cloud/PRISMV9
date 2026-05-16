/**
 * PRISM MCP Server - Knowledge Extension Dispatcher
 *
 * Routes 40 knowledge management, learning, and graph actions.
 * Extracted from intelligenceDispatcher (SYS-MS1-U03).
 *
 * Sub-engines:
 *   apprenticeEngine      (10 actions) — Apprentice training & knowledge capture
 *   manufacturingGenome   (10 actions) — Manufacturing genome fingerprinting
 *   knowledgeGraph        (10 actions) — Knowledge graph queries & inference
 *   federatedLearning     (10 actions) — Federated learning network
 *
 * @milestone SYS-MS1-U03
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_KNOWLEDGE_EXT_SCHEMAS } from "../../schemas/knowledgeExtActionSchemas.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

/** Hook context shape varies by dispatcher — named alias avoids bare `as any` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HookContext = any;

/** Action string is validated by Zod enum but `.includes()` needs wider type */
type ActionString = string;

// Lazy engine cache
let _apprenticeEngine: any, _manufacturingGenome: any,
    _knowledgeGraph: any, _federatedLearning: any;

async function getKnowledgeEngine(name: string): Promise<any> {
  switch (name) {
    case "apprenticeEngine":    return _apprenticeEngine ??= (await import("../../engines/ApprenticeEngine.js")).apprenticeEngine;
    case "manufacturingGenome": return _manufacturingGenome ??= (await import("../../engines/ManufacturingGenomeEngine.js")).manufacturingGenome;
    case "knowledgeGraph":      return _knowledgeGraph ??= (await import("../../engines/KnowledgeGraphEngine.js")).knowledgeGraph;
    case "federatedLearning":   return _federatedLearning ??= (await import("../../engines/FederatedLearningEngine.js")).federatedLearning;
    default: throw new Error(`Unknown knowledge engine: ${name}`);
  }
}

// ============================================================================
// ACTION ARRAYS
// ============================================================================

const APPRENTICE_ACTIONS = [
  "apprentice_explain", "apprentice_lesson", "apprentice_lessons",
  "apprentice_assess", "apprentice_capture", "apprentice_knowledge",
  "apprentice_challenge", "apprentice_materials", "apprentice_history",
  "apprentice_get",
] as const;

const GENOME_ACTIONS = [
  "genome_lookup", "genome_predict", "genome_similar", "genome_compare",
  "genome_list", "genome_fingerprint", "genome_behavioral", "genome_search",
  "genome_history", "genome_get",
] as const;

const GRAPH_ACTIONS = [
  "graph_query", "graph_infer", "graph_discover", "graph_predict",
  "graph_traverse", "graph_add", "graph_search", "graph_stats",
  "graph_history", "graph_get",
] as const;

const LEARN_ACTIONS = [
  "learn_contribute", "learn_query", "learn_aggregate", "learn_anonymize",
  "learn_network_stats", "learn_opt_control", "learn_correction",
  "learn_transparency", "learn_history", "learn_get",
] as const;

const ACTIONS = [
  ...APPRENTICE_ACTIONS,
  ...GENOME_ACTIONS,
  ...GRAPH_ACTIONS,
  ...LEARN_ACTIONS,
] as const;

// ============================================================================
// KEY VALUE EXTRACTOR (for slim responses)
// ============================================================================

function knowledgeExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== "object") return { value: result };
  switch (action) {
    // Apprentice
    case "apprentice_explain":
      return { parameter: result.parameter, value: result.value, depth: result.depth, factors: result.factors?.length };
    case "apprentice_lesson":
      return { id: result.id ?? result.total, title: result.title, track: result.track };
    case "apprentice_lessons":
      return { total: result.total };
    case "apprentice_assess":
      return { id: result.assessment_id, level: result.level, score: result.total_score, gaps: result.gaps?.length };
    case "apprentice_capture":
      return { id: result.knowledge_id, confidence: result.confidence, material: result.material };
    case "apprentice_knowledge":
      return { total: result.total, by_confidence: result.by_confidence };
    case "apprentice_challenge":
      return { id: result.challenge_id, total: result.total, difficulty: result.difficulty };
    case "apprentice_materials":
      return { name: result.name, total: result.total };
    case "apprentice_history":
      return { total: result.total, knowledge: result.knowledge_entries };
    case "apprentice_get":
      return { id: result.assessment_id, level: result.level, score: result.total_score };
    // Genome
    case "genome_lookup":
      return { id: result.genome_id, material: result.material_name, iso_group: result.iso_group, family: result.family };
    case "genome_predict":
      return { id: result.prediction_id, material: result.material, vc: result.recommended_vc, fz: result.recommended_fz, confidence: result.confidence_pct };
    case "genome_similar":
      return { query: result.query_material, total: result.total };
    case "genome_compare":
      return { a: result.a?.material, b: result.b?.material, easier: result.easier_to_machine };
    case "genome_list":
      return { total: result.total };
    case "genome_fingerprint":
      return { id: result.genome_id, material: result.material };
    case "genome_behavioral":
      return { id: result.genome_id, material: result.material, jobs: result.jobs_recorded };
    case "genome_search":
      return { total: result.total };
    case "genome_history":
      return { total: result.total };
    case "genome_get":
      return { id: result.prediction_id, material: result.material };
    // Knowledge Graph
    case "graph_query":
      return { node: result.center_node?.name, connections: result.total_connections };
    case "graph_infer":
      return { entity: result.entity, confidence: result.confidence, strategies: result.recommended_strategies?.length };
    case "graph_discover":
      return { entity: result.entity, discoveries: result.discoveries?.length };
    case "graph_predict":
      return { material: result.combination?.material, success: result.success_rate_pct, confidence: result.confidence };
    case "graph_traverse":
      return { start: result.start, nodes: result.nodes_visited };
    case "graph_add":
      return { added: result.added, id: result.id ?? result.source };
    case "graph_search":
      return { query: result.query, total: result.total };
    case "graph_stats":
      return { nodes: result.total_nodes, edges: result.total_edges, jobs: result.total_job_evidence };
    case "graph_history":
      return { total: result.total };
    case "graph_get":
      return { id: result.query_id };
    // Federated Learning
    case "learn_contribute":
      return { contribution_id: result.contribution_id, status: result.status };
    case "learn_query":
      return { total: result.total, top_correction: result.corrections?.[0]?.vc_correction };
    case "learn_aggregate":
      return { updated: result.correction_factors_updated, created: result.new_factors_created };
    case "learn_anonymize":
      return { privacy_score: result.report?.privacy_score, safe: result.report?.safe_to_share };
    case "learn_network_stats":
      return { nodes: result.total_nodes, factors: result.correction_factors, confidence: result.avg_confidence };
    case "learn_opt_control":
      return { shop_id: result.shop_id, status: result.status ?? (result.opted_in ? "opted_in" : "opted_out") };
    case "learn_correction":
      return { id: result.id, vc: result.vc_correction, confidence: result.confidence };
    case "learn_transparency":
      return { total: result.total };
    case "learn_history":
      return { queries: result.total_queries, contributions: result.total_contributions };
    case "learn_get":
      return { id: result.query_id ?? result.id };
    default:
      return result;
  }
}

// ============================================================================
// REGISTRATION
// ============================================================================

/** Registers knowledge ext dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerKnowledgeExtDispatcher(server: any): void {
  server.tool(
    "prism_knowledge_ext",
    "Knowledge management: apprentice training, manufacturing genome fingerprinting, knowledge graph queries/inference, federated learning network. Use 'action' param.",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_knowledge_ext] Action: ${action}`);

      const params: Record<string, any> = { ...rawParams };

      try {
        // Normalize params
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          Object.assign(params, normalizeParams(rawParams));
        } catch { /* normalizer not available */ }

        // Pre-hooks
        const hookCtx = {
          operation: action,
          target: { type: "knowledge" as const, id: action, data: params },
          metadata: { dispatcher: "knowledgeExtDispatcher", action, params },
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx as HookContext);
        if (preResult.blocked) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action,
            }) }],
          };
        }

        // SYS-MS6: Validate params against per-action Zod schema
        const validation = validateActionParams(action, params, ACTION_KNOWLEDGE_EXT_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_knowledge_ext"
          );
        }

        // Route to engine
        const result = APPRENTICE_ACTIONS.includes(action as ActionString as typeof APPRENTICE_ACTIONS[number])
          ? await (await getKnowledgeEngine("apprenticeEngine"))(action, params)
          : GENOME_ACTIONS.includes(action as ActionString as typeof GENOME_ACTIONS[number])
          ? await (await getKnowledgeEngine("manufacturingGenome"))(action, params)
          : GRAPH_ACTIONS.includes(action as ActionString as typeof GRAPH_ACTIONS[number])
          ? await (await getKnowledgeEngine("knowledgeGraph"))(action, params)
          : await (await getKnowledgeEngine("federatedLearning"))(action, params);

        // Post-hooks
        await hookExecutor.execute("post-calculation", {
          ...hookCtx,
          target: { ...hookCtx.target, data: { ...params, result } },
        } as HookContext);

        // Response formatting
        if (params.response_level) {
          const formatted = formatByLevel(
            result,
            params.response_level as ResponseLevel,
            (r: any) => knowledgeExtractKeyValues(action, r)
          );
          return { content: [{ type: "text" as const, text: JSON.stringify(formatted) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ action, ...result }) }] };
      } catch (err: any) {
        log.error(`[prism_knowledge_ext] ${action} failed: ${err.message}`);
        return dispatcherError(err, action, "prism_knowledge_ext");
      }
    }
  );
}
