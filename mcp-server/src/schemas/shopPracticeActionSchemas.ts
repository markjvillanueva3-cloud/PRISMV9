/**
 * Shop Practice Dispatcher Action Schemas
 * ========================================
 * Per-action Zod schemas for all 12 prism_shop_practice actions.
 *
 * @module schemas/shopPracticeActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optStr = z.string().optional();
const optNum = z.number().optional();
const optPosNum = z.number().positive().optional();
const optBool = z.boolean().optional();

// ============================================================================
// PRACTICE KB (6 actions)
// ============================================================================

const practice_ingest = z.object({
  practices: z.array(z.object({
    practice_type: optStr,
    title: optStr,
    description: optStr,
    material: optStr,
    operation: optStr,
  }).passthrough()).min(1),
  video_id: optStr,
  channel: optStr,
  channel_subscribers: optNum,
  views: optNum,
  likes: optNum,
  confidence: z.number().min(0).max(1).optional(),
}).passthrough();

const practice_search = z.object({
  query: optStr,
  category: optStr,
  material: optStr,
  operation: optStr,
  min_confidence: z.number().min(0).max(1).optional(),
  limit: z.number().int().positive().optional(),
}).passthrough();

const practice_get = z.object({
  practice_id: z.string().min(1),
}).passthrough();

const practice_list = z.object({
  category: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

const practice_audit = z.object({
  fix: optBool,
}).passthrough();

const practice_recommend = z.object({
  operation: optStr,
  material: optStr,
  machine: optStr,
  limit: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// TROUBLE TREES (3 actions)
// ============================================================================

const tree_build = z.object({
  symptom: z.string().min(1),
  category: optStr,
  max_depth: z.number().int().positive().optional(),
}).passthrough();

const tree_navigate = z.object({
  tree_id: z.string().min(1),
  path: z.array(z.number().int().min(0)).optional(),
  child_index: z.number().int().min(0).optional(),
}).passthrough();

const tree_search = z.object({
  symptom: z.string().min(1),
  limit: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// MATERIAL TIPS (3 actions)
// ============================================================================

const tips_add = z.object({
  material: z.string().min(1),
  tip: z.string().min(1),
  source: optStr,
  confidence: z.number().min(0).max(1).optional(),
  category: optStr,
}).passthrough();

const tips_get = z.object({
  material: z.string().min(1),
  limit: z.number().int().positive().optional(),
}).passthrough();

const tips_conflicts = z.object({
  material: z.string().min(1),
}).passthrough();

// ============================================================================
// EXPORT
// ============================================================================

// ============================================================================
// PLAYBOOK (6 actions)
// ============================================================================

const playbook_advise = z.object({
  material_iso: optStr,
  features: z.array(z.string()).optional(),
  tolerance_mm: optNum,
  wall_thickness_mm: optNum,
  surface_finish_Ra: optNum,
  batch_size: optNum,
  machine_axes: optNum,
  categories: z.array(z.string()).optional(),
  severity_min: z.enum(["critical", "important", "recommended", "tip"]).optional(),
}).passthrough();

const playbook_sequence = z.object({
  features: z.array(z.string()).min(1),
  material_iso: optStr,
}).passthrough();

const playbook_setup = z.object({
  features: z.array(z.string()).min(1),
  material_iso: optStr,
  tolerance_mm: optNum,
}).passthrough();

const playbook_antipatterns = z.object({
  material_iso: optStr,
  features: z.array(z.string()).optional(),
  wall_thickness_mm: optNum,
}).passthrough();

const playbook_lookup = z.object({
  category: z.string(),
}).passthrough();

const playbook_add_rule = z.object({
  id: z.string(),
  category: z.string(),
  severity: z.enum(["critical", "important", "recommended", "tip"]),
  title: z.string(),
  rule: z.string(),
  reasoning: z.string(),
  conditions: z.array(z.object({ type: z.string() }).passthrough()),
  exceptions: z.array(z.string()),
  source: z.string(),
  examples: z.array(z.string()).optional(),
  related_rules: z.array(z.string()).optional(),
}).passthrough();

// ============================================================================
// TRIBAL KNOWLEDGE (5 actions)
// ============================================================================

const tribal_search = z.object({
  query: z.string().optional().describe("Free-text search across tip titles, bodies, and tags"),
  category: z.string().optional().describe("Filter by knowledge category (e.g. setup, tooling, speeds_feeds)"),
  material_iso_group: z.string().optional().describe("ISO material group code (P, M, K, N, S, H)"),
  operation_type: z.string().optional().describe("Operation type filter (e.g. pocket, profile, thread)"),
  min_confidence: z.number().min(0).max(100).optional().describe("Minimum confidence threshold (0-100)"),
  limit: z.number().int().positive().optional().describe("Max results to return (default 5)"),
}).passthrough();

const tribal_add = z.object({
  title: z.string().min(1).describe("Short descriptive title for the tip"),
  body: z.string().min(1).describe("Full tip text with machinist-level detail"),
  category: z.string().min(1).describe("Knowledge category (setup, tooling, speeds_feeds, fixturing, surface_finish, thread, safety, maintenance, material_handling, quality, troubleshooting)"),
  tags: z.array(z.string()).min(1).describe("Searchable tags (e.g. ['stainless', 'work-hardening'])"),
  source: z.string().min(1).describe("Provenance (e.g. 'operator:John', 'video:abc123')"),
  confidence: z.number().min(0).max(100).describe("Expert confidence rating 0-100"),
  material_groups: z.array(z.string()).optional().describe("ISO material groups this tip applies to"),
  operation_types: z.array(z.string()).optional().describe("Operation types this tip applies to"),
}).passthrough();

const tribal_get = z.object({
  tip_id: z.string().min(1).describe("Unique tip ID (e.g. 'tk-001')"),
}).passthrough();

const tribal_list = z.object({
  category: z.string().optional().describe("Filter by category"),
  offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
  limit: z.number().int().positive().optional().describe("Page size (default 20)"),
}).passthrough();

const tribal_categories = z.object({}).passthrough();

// ============================================================================
// TRIBAL ENRICHMENT COORDINATOR (5 actions)
// ============================================================================
// Wires TribalEnrichmentCoordinatorEngine — a unified coordinator that fetches
// tribal tips + playbook rules + controller-specific tips in one call for any
// P2P process pipeline. Enum values mirror the engine's ProcessType /
// ControllerType unions exactly so an out-of-range string is rejected at the
// Zod boundary rather than silently returning empty results.

const _processTypeEnum = z.enum([
  "wire_edm", "sinker_edm", "milling", "turning", "grinding", "multi_axis",
]);
const _controllerEnum = z.enum([
  "fanuc", "sodick", "makino", "mitsubishi", "agiecharmilles",
  "siemens", "haas", "okuma", "mazak",
]);

// Shared enrichment input — process_type required, everything else optional.
// Physical quantities are constrained positive (a negative thickness/tolerance/
// hardness is nonsense and would only ever come from a caller bug).
const _enrichmentInputShape = {
  process_type: _processTypeEnum.describe("Manufacturing process: wire_edm, sinker_edm, milling, turning, grinding, or multi_axis"),
  material: optStr.describe("Workpiece material name (e.g. 'D2 tool steel', 'Inconel 718')"),
  controller: _controllerEnum.optional().describe("CNC/EDM controller family for controller-specific programming tips"),
  thickness_mm: optPosNum.describe("Stock or wall thickness in mm"),
  tolerance_mm: optPosNum.describe("Required tolerance in mm"),
  surface_finish_Ra_um: optPosNum.describe("Target surface finish Ra in micrometres"),
  is_thin_wall: optBool.describe("True if the part has thin-wall features"),
  hardness_hrc: optPosNum.describe("Material hardness in HRC"),
};

const tribal_enrich = z.object(_enrichmentInputShape).passthrough();
const tribal_enrich_check = z.object(_enrichmentInputShape).passthrough();
const tribal_enrich_tips_only = z.object(_enrichmentInputShape).passthrough();
const tribal_enrich_playbook_only = z.object(_enrichmentInputShape).passthrough();
const tribal_enrich_controller_only = z.object({
  controller: _controllerEnum.describe("CNC/EDM controller family to fetch programming tips for"),
}).passthrough();

export const ACTION_SHOP_PRACTICE_SCHEMAS: ActionSchemaMap = {
  practice_ingest,
  practice_search,
  practice_get,
  practice_list,
  practice_audit,
  practice_recommend,
  tree_build,
  tree_navigate,
  tree_search,
  tips_add,
  tips_get,
  tips_conflicts,
  playbook_advise,
  playbook_sequence,
  playbook_setup,
  playbook_antipatterns,
  playbook_lookup,
  playbook_add_rule,
  tribal_search,
  tribal_add,
  tribal_get,
  tribal_list,
  tribal_categories,
  tribal_enrich,
  tribal_enrich_check,
  tribal_enrich_tips_only,
  tribal_enrich_playbook_only,
  tribal_enrich_controller_only,
};
