/**
 * Knowledge Extension Dispatcher Action Schemas
 * ===============================================
 * Per-action Zod schemas for all 40 prism_knowledge_ext actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/knowledgeExtActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();
const optPosNum = z.number().positive().optional();
const optBool = z.boolean().optional();
const optStrArr = z.array(z.string()).optional();

// ============================================================================
// Apprentice Engine (10)
// ============================================================================

const apprentice_explain = z.object({
  parameter: z.string().min(1),
  value: z.union([z.string(), z.number()]).optional(),
  depth: z.enum(["basic", "intermediate", "advanced"]).optional(),
  material: optStr,
  operation: optStr,
}).passthrough();

const apprentice_lesson = z.object({
  topic: z.string().min(1),
  track: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  lesson_id: optStr,
}).passthrough();

const apprentice_lessons = z.object({
  track: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  topic: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const apprentice_assess = z.object({
  topic: optStr,
  level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  answers: z.array(z.record(z.string(), z.unknown())).optional(),
  assessment_id: optStr,
}).passthrough();

const apprentice_capture = z.object({
  knowledge: z.string().min(1),
  material: optStr,
  operation: optStr,
  confidence: optNum,
  source: optStr,
}).passthrough();

const apprentice_knowledge = z.object({
  material: optStr,
  operation: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const apprentice_challenge = z.object({
  topic: optStr,
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  count: z.number().int().positive().optional(),
}).passthrough();

const apprentice_materials = z.object({
  topic: optStr,
  track: z.enum(["beginner", "intermediate", "advanced"]).optional(),
}).passthrough();

const apprentice_history = z.object({
  limit: z.number().int().positive().optional(),
}).passthrough();

const apprentice_get = z.object({
  assessment_id: z.string().min(1),
}).passthrough();

// ============================================================================
// Manufacturing Genome Engine (10)
// ============================================================================

const genome_lookup = z.object({
  material: z.string().min(1),
  iso_group: optStr,
}).passthrough();

const genome_predict = z.object({
  material: z.string().min(1),
  operation: optStr,
  tool_type: optStr,
}).passthrough();

const genome_similar = z.object({
  material: z.string().min(1),
  limit: z.number().int().positive().optional(),
}).passthrough();

const genome_compare = z.object({
  material_a: z.string().min(1),
  material_b: z.string().min(1),
}).passthrough();

const genome_list = z.object({
  iso_group: optStr,
  family: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const genome_fingerprint = z.object({
  material: z.string().min(1),
  parameters: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const genome_behavioral = z.object({
  material: z.string().min(1),
  operation: optStr,
}).passthrough();

const genome_search = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().optional(),
}).passthrough();

const genome_history = z.object({
  material: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const genome_get = z.object({
  prediction_id: z.string().min(1),
}).passthrough();

// ============================================================================
// Knowledge Graph Engine (10)
// ============================================================================

const graph_query = z.object({
  node: z.string().min(1),
  node_type: optStr,
  depth: z.number().int().min(1).max(5).optional(),
}).passthrough();

const graph_infer = z.object({
  entity: z.string().min(1),
  entity_type: optStr,
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const graph_discover = z.object({
  entity: z.string().min(1),
  entity_type: optStr,
}).passthrough();

const graph_predict = z.object({
  material: optStr,
  tool: optStr,
  operation: optStr,
  combination: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const graph_traverse = z.object({
  start: z.string().min(1),
  relationship: optStr,
  max_depth: z.number().int().min(1).max(10).optional(),
}).passthrough();

const graph_add = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  relationship: z.string().min(1),
  properties: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const graph_search = z.object({
  query: z.string().min(1),
  node_type: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const graph_stats = z.object({}).passthrough();

const graph_history = z.object({
  limit: z.number().int().positive().optional(),
}).passthrough();

const graph_get = z.object({
  query_id: z.string().min(1),
}).passthrough();

// ============================================================================
// Federated Learning Engine (10)
// ============================================================================

const learn_contribute = z.object({
  shop_id: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
  material: optStr,
  operation: optStr,
}).passthrough();

const learn_query = z.object({
  material: optStr,
  operation: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const learn_aggregate = z.object({
  force: optBool,
}).passthrough();

const learn_anonymize = z.object({
  data: z.record(z.string(), z.unknown()),
  shop_id: optStr,
}).passthrough();

const learn_network_stats = z.object({}).passthrough();

const learn_opt_control = z.object({
  shop_id: z.string().min(1),
  opt_in: z.boolean(),
}).passthrough();

const learn_correction = z.object({
  material: z.string().min(1),
  operation: optStr,
  id: optStr,
}).passthrough();

const learn_transparency = z.object({
  shop_id: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const learn_history = z.object({
  shop_id: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const learn_get = z.object({
  query_id: optStr,
  id: optStr,
}).passthrough();

// ============================================================================
// EXPORT MAP — 40 actions
// ============================================================================

export const ACTION_KNOWLEDGE_EXT_SCHEMAS: ActionSchemaMap = {
  // Apprentice (10)
  apprentice_explain,
  apprentice_lesson,
  apprentice_lessons,
  apprentice_assess,
  apprentice_capture,
  apprentice_knowledge,
  apprentice_challenge,
  apprentice_materials,
  apprentice_history,
  apprentice_get,
  // Genome (10)
  genome_lookup,
  genome_predict,
  genome_similar,
  genome_compare,
  genome_list,
  genome_fingerprint,
  genome_behavioral,
  genome_search,
  genome_history,
  genome_get,
  // Knowledge Graph (10)
  graph_query,
  graph_infer,
  graph_discover,
  graph_predict,
  graph_traverse,
  graph_add,
  graph_search,
  graph_stats,
  graph_history,
  graph_get,
  // Federated Learning (10)
  learn_contribute,
  learn_query,
  learn_aggregate,
  learn_anonymize,
  learn_network_stats,
  learn_opt_control,
  learn_correction,
  learn_transparency,
  learn_history,
  learn_get,
};
