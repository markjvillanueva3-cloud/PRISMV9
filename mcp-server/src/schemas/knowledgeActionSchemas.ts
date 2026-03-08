/**
 * Knowledge Dispatcher Action Schemas
 * =====================================
 * Per-action Zod schemas for all 9 prism_knowledge actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/knowledgeActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();

// ============================================================================
// search
// ============================================================================

const search = z.object({
  query: z.string().describe("Search query string"),
  registries: z.array(z.string()).optional().describe("Registries to search (all if omitted)"),
  limit: z.number().int().positive().optional().describe("Max results (default: 20)"),
  min_score: z.number().min(0).max(1).optional().describe("Minimum relevance score (default: 0.2)"),
}).passthrough();

// ============================================================================
// cross_query
// ============================================================================

const cross_query = z.object({
  task: z.string().describe("Task description for cross-registry query"),
  context: optStr.describe("Additional context"),
  required_registries: z.array(z.string()).optional().describe("Registries that must be included"),
}).passthrough();

// ============================================================================
// formula
// ============================================================================

const formula = z.object({
  need: z.string().describe("Formula need description"),
  category: optStr.describe("Formula category filter"),
  material_id: optStr.describe("Material ID filter"),
  include_related: z.boolean().optional().describe("Include related formulas (default: true)"),
}).passthrough();

// ============================================================================
// relations
// ============================================================================

const relations = z.object({
  source_id: optStr.describe("Source node ID (alternative to node_id)"),
  node_id: optStr.describe("Node ID (alternative to source_id)"),
  edge_types: z.array(z.string()).optional().describe("Edge type filters"),
  depth: z.number().int().positive().optional().describe("Traversal depth (default: 2)"),
}).passthrough();

// ============================================================================
// stats — no params required
// ============================================================================

const stats = z.object({}).passthrough();

// ============================================================================
// tribal_capture
// ============================================================================

const tribal_capture = z.object({
  title: optStr.describe("Tip title (default: 'Untitled Tip')"),
  body: optStr.describe("Tip body text"),
  content: optStr.describe("Alternative to body"),
  category: optStr.describe("Category (default: 'general')"),
  source: optStr.describe("Source (default: 'operator')"),
  material_groups: z.array(z.string()).optional().describe("Material ISO groups"),
  material_iso: optStr.describe("Single material ISO (converted to material_groups)"),
  operation_types: z.array(z.string()).optional().describe("Operation types"),
  operation_type: optStr.describe("Single operation type (converted to operation_types)"),
  confidence: z.number().min(0).max(100).optional().describe("Confidence score (default: 70)"),
  tags: z.array(z.string()).optional().describe("Tags for the tip"),
}).passthrough();

// ============================================================================
// tribal_search
// ============================================================================

const tribal_search = z.object({
  query: z.string().describe("Search query"),
  category: optStr.describe("Filter by category"),
  material_iso_group: optStr.describe("Filter by material ISO group"),
  material_iso: optStr.describe("Alternative to material_iso_group"),
  operation_type: optStr.describe("Filter by operation type"),
  min_confidence: optNum.describe("Minimum confidence score"),
  limit: z.number().int().positive().optional().describe("Max results (default: 10)"),
}).passthrough();

// ============================================================================
// tribal_suggest
// ============================================================================

const tribal_suggest = z.object({
  material_iso_group: optStr.describe("Material ISO group (default: 'P')"),
  material_iso: optStr.describe("Alternative to material_iso_group"),
  operation_type: optStr.describe("Operation type (default: 'milling')"),
}).passthrough();

// ============================================================================
// tribal_stats — no params required
// ============================================================================

const tribal_stats = z.object({}).passthrough();

// ============================================================================
// EXPORTED SCHEMA MAP
// ============================================================================

export const ACTION_KNOWLEDGE_SCHEMAS: ActionSchemaMap = {
  search,
  cross_query,
  formula,
  relations,
  stats,
  tribal_capture,
  tribal_search,
  tribal_suggest,
  tribal_stats,
};
