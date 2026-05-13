/**
 * Zod action schemas for skillScriptDispatcher.
 *
 * Each key matches a dispatcher action case. All schemas use .passthrough()
 * per project convention.
 *
 * @module skillScriptActionSchemas
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── skill_list ──────────────────────────────────────────────────────────────
const skill_list = z.object({
  category: z.string().optional(),
  enabled_only: z.boolean().optional(),
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
}).passthrough();

// ── skill_get ───────────────────────────────────────────────────────────────
const skill_get = z.object({
  skill_id: z.string(),
  include_content: z.boolean().optional(),
}).passthrough();

// ── skill_search ────────────────────────────────────────────────────────────
const skill_search = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  enabled: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
}).passthrough();

// ── skill_find_for_task ─────────────────────────────────────────────────────
const skill_find_for_task = z.object({
  task_description: z.string().optional(),
  task: z.string().optional(),
  query: z.string().optional(),
  max_results: z.number().int().positive().optional(),
}).passthrough();

// ── skill_content ───────────────────────────────────────────────────────────
const skill_content = z.object({
  skill_id: z.string(),
}).passthrough();

// ── skill_stats ─────────────────────────────────────────────────────────────
const skill_stats = z.object({}).passthrough();

// ── script_list ─────────────────────────────────────────────────────────────
const script_list = z.object({
  category: z.string().optional(),
  language: z.string().optional(),
  enabled_only: z.boolean().optional(),
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().optional(),
}).passthrough();

// ── script_get ──────────────────────────────────────────────────────────────
const script_get = z.object({
  script_id: z.string(),
}).passthrough();

// ── script_search ───────────────────────────────────────────────────────────
const script_search = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  language: z.string().optional(),
  tag: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
}).passthrough();

// ── script_command ──────────────────────────────────────────────────────────
const script_command = z.object({
  script_id: z.string(),
  args: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// ── script_execute ──────────────────────────────────────────────────────────
const script_execute = z.object({
  script_id: z.string(),
  args: z.record(z.string(), z.unknown()).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  simulate_only: z.boolean().optional(),
  timeout_ms: z.number().int().positive().optional(),
  working_dir: z.string().optional(),
}).passthrough();

// ── script_stats ────────────────────────────────────────────────────────────
const script_stats = z.object({}).passthrough();

// ── skill_load ──────────────────────────────────────────────────────────────
const skill_load = z.object({
  skill_id: z.string(),
  include_content: z.boolean().optional(),
}).passthrough();

// ── skill_recommend ─────────────────────────────────────────────────────────
const skill_recommend = z.object({
  task: z.string(),
  min_relevance: z.number().min(0).max(1).optional(),
  max_results: z.number().int().positive().optional(),
}).passthrough();

// ── skill_analyze ───────────────────────────────────────────────────────────
const skill_analyze = z.object({
  task: z.string(),
}).passthrough();

// ── skill_chain ─────────────────────────────────────────────────────────────
const skill_chain = z.object({
  skill_ids: z.array(z.string()).optional(),
  purpose: z.string().optional(),
  chain_name: z.string().optional(),
  execute: z.boolean().optional(),
}).passthrough();

// ── skill_search_v2 ─────────────────────────────────────────────────────────
const skill_search_v2 = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  tag: z.string().optional(),
  enabled_only: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
}).passthrough();

// ── skill_stats_v2 ──────────────────────────────────────────────────────────
const skill_stats_v2 = z.object({
  include_cache: z.boolean().optional(),
  include_usage: z.boolean().optional(),
  top_n: z.number().int().positive().optional(),
}).passthrough();

// ── script_execute_v2 ───────────────────────────────────────────────────────
const script_execute_v2 = z.object({
  script_id: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
  bypass_safe_mode: z.boolean().optional(),
  timeout_ms: z.number().int().positive().optional(),
  working_dir: z.string().optional(),
}).passthrough();

// ── script_queue ────────────────────────────────────────────────────────────
const script_queue = z.object({
  scripts: z.array(z.object({
    script_id: z.string(),
    params: z.record(z.string(), z.unknown()).optional(),
    priority: z.number().int().min(1).max(10).optional(),
  })).optional(),
  process_immediately: z.boolean().optional(),
}).passthrough();

// ── script_recommend ────────────────────────────────────────────────────────
const script_recommend = z.object({
  task: z.string(),
  max_results: z.number().int().positive().optional(),
}).passthrough();

// ── script_search_v2 ────────────────────────────────────────────────────────
const script_search_v2 = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  language: z.string().optional(),
  tag: z.string().optional(),
  enabled_only: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
}).passthrough();

// ── script_history ──────────────────────────────────────────────────────────
const script_history = z.object({
  script_id: z.string().optional(),
  success_only: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  include_stats: z.boolean().optional(),
}).passthrough();

// ── bundle_list ─────────────────────────────────────────────────────────────
const bundle_list = z.object({}).passthrough();

// ── bundle_get ──────────────────────────────────────────────────────────────
const bundle_get = z.object({
  id: z.string().optional(),
  bundle_id: z.string().optional(),
}).passthrough();

// ── bundle_for_action ───────────────────────────────────────────────────────
const bundle_for_action = z.object({
  action: z.string().optional(),
  name: z.string().optional(),
}).passthrough();

// ── bundle_for_domain ───────────────────────────────────────────────────────
const bundle_for_domain = z.object({
  domain: z.string(),
}).passthrough();

// ── skill_tier_register ─────────────────────────────────────────────────────
// Register a single skill into the SkillTierRegistryEngine for tier classification.
const skill_tier_register = z.object({
  command: z.string().describe("Slash command (with or without leading '/')"),
  description: z.string().describe("Skill description"),
  triggers: z.array(z.string()).describe("Keywords that trigger this skill"),
  tags: z.array(z.string()).optional().describe("Optional tags"),
  explicit_tier: z.enum(["essential", "intermediate", "advanced"]).optional()
    .describe("Force a tier, bypassing keyword-based classification"),
  invocation_count: z.number().int().nonnegative().optional()
    .describe("How many times the skill has been invoked"),
}).passthrough();

// ── skill_tier_assign ───────────────────────────────────────────────────────
// Compute tier for one previously-registered skill.
const skill_tier_assign = z.object({
  command: z.string().describe("Slash command of a previously-registered skill"),
}).passthrough();

// ── skill_tier_classify_all ─────────────────────────────────────────────────
// Classify every registered skill — returns per-tier counts + sorted assignments.
const skill_tier_classify_all = z.object({}).passthrough();

// ── skill_tier_list ─────────────────────────────────────────────────────────
// List skills currently assigned to one tier.
const skill_tier_list = z.object({
  tier: z.enum(["essential", "intermediate", "advanced"]).describe("Tier to list"),
}).passthrough();

// ── skill_tier_size ─────────────────────────────────────────────────────────
// Return total registered-skill count (for monitoring registry growth).
const skill_tier_size = z.object({}).passthrough();

// ── Export ───────────────────────────────────────────────────────────────────
export const ACTION_SKILL_SCRIPT_SCHEMAS: ActionSchemaMap = {
  skill_list,
  skill_get,
  skill_search,
  skill_find_for_task,
  skill_content,
  skill_stats,
  script_list,
  script_get,
  script_search,
  script_command,
  script_execute,
  script_stats,
  skill_load,
  skill_recommend,
  skill_analyze,
  skill_chain,
  skill_search_v2,
  skill_stats_v2,
  script_execute_v2,
  script_queue,
  script_recommend,
  script_search_v2,
  script_history,
  bundle_list,
  bundle_get,
  bundle_for_action,
  bundle_for_domain,
  skill_tier_register,
  skill_tier_assign,
  skill_tier_classify_all,
  skill_tier_list,
  skill_tier_size,
};
