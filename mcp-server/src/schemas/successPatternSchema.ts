/**
 * Success Pattern Schema — AI Augmentation Learning Loop
 * ========================================================
 *
 * Schema for SuccessPatternBankEngine. Records successful approaches from
 * Claude sessions for pattern retrieval in future similar tasks.
 *
 * @module schemas/successPatternSchema
 * @milestone CAM-EXHAUST-MS0 / AI-AUGMENT
 */

import { z } from "zod";

const IsoTimestamp = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "must be ISO date string" });

/**
 * Task category for pattern matching
 */
export const TaskCategory = z.enum([
  "engine_building",
  "dispatcher_wiring",
  "test_creation",
  "bug_fix",
  "refactoring",
  "physics_calculation",
  "cam_programming",
  "cad_operation",
  "documentation",
  "hook_creation",
  "schema_design",
  "api_integration",
  "performance_optimization",
  "security_fix",
  "other",
]).describe("Category of task for pattern matching");

export type TaskCategoryT = z.infer<typeof TaskCategory>;

/**
 * Confidence level for pattern reliability
 */
export const ConfidenceLevel = z.enum([
  "high",      // Verified success, used multiple times
  "medium",    // Single verified success
  "low",       // Inferred success, not explicitly verified
]).describe("Confidence level based on verification");

export type ConfidenceLevelT = z.infer<typeof ConfidenceLevel>;

/**
 * A success pattern record
 */
export const SuccessPatternSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  pattern_id: z.string().uuid().describe("Unique pattern identifier"),
  lineage_id: z.string().optional().describe("Links to original session/task"),

  // What was the task?
  task_category: TaskCategory,
  task_description: z.string().max(500).describe("Brief task description"),
  task_keywords: z.array(z.string()).min(1).max(10).describe("Keywords for similarity search"),

  // What approach worked?
  approach_summary: z.string().max(1000).describe("Summary of successful approach"),
  mcp_actions_used: z.array(z.string()).max(20).describe("MCP actions that contributed"),
  tools_used: z.array(z.string()).max(20).describe("Tools that contributed"),
  engines_invoked: z.array(z.string()).max(20).describe("Engines that were called"),

  // How well did it work?
  confidence: ConfidenceLevel,
  success_count: z.number().int().min(1).describe("Times this pattern succeeded"),
  failure_count: z.number().int().min(0).describe("Times this pattern failed"),

  // Context
  domain: z.string().max(50).optional().describe("Domain context (mill, lathe, wedm, etc.)"),
  constraints: z.array(z.string()).max(10).optional().describe("Constraints that applied"),

  // Timing
  created_at: IsoTimestamp,
  last_used_at: IsoTimestamp,
  last_verified_at: IsoTimestamp.optional(),
}).describe("A recorded successful approach pattern");

export type SuccessPattern = z.infer<typeof SuccessPatternSchema>;

/**
 * Input for recording a new pattern
 */
export const RecordPatternInputSchema = z.object({
  task_category: TaskCategory,
  task_description: z.string().max(500),
  task_keywords: z.array(z.string()).min(1).max(10),
  approach_summary: z.string().max(1000),
  mcp_actions_used: z.array(z.string()).max(20).optional().default([]),
  tools_used: z.array(z.string()).max(20).optional().default([]),
  engines_invoked: z.array(z.string()).max(20).optional().default([]),
  confidence: ConfidenceLevel.optional().default("medium"),
  domain: z.string().max(50).optional(),
  constraints: z.array(z.string()).max(10).optional(),
  lineage_id: z.string().optional(),
  pattern_id: z.string().uuid().optional(),
}).describe("Input for recording a success pattern");

export type RecordPatternInput = z.input<typeof RecordPatternInputSchema>;

/**
 * Input for querying patterns
 */
export const QueryPatternInputSchema = z.object({
  task_category: TaskCategory.optional(),
  keywords: z.array(z.string()).max(10).optional(),
  domain: z.string().max(50).optional(),
  min_confidence: ConfidenceLevel.optional(),
  min_success_count: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
}).describe("Query parameters for pattern search");

export type QueryPatternInput = z.input<typeof QueryPatternInputSchema>;

/**
 * Input for reinforcing an existing pattern
 */
export const ReinforcePatternInputSchema = z.object({
  pattern_id: z.string().uuid(),
  success: z.boolean().describe("Whether pattern succeeded this time"),
  note: z.string().max(200).optional(),
}).describe("Input for reinforcing pattern success/failure");

export type ReinforcePatternInput = z.infer<typeof ReinforcePatternInputSchema>;
