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
};
