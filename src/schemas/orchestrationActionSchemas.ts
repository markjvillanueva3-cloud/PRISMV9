/**
 * Orchestration Dispatcher Action Schemas
 * ========================================
 * Per-action Zod schemas for all 28 prism_orchestrate actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * Design decisions:
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine actually reads
 * - agent_id/task are string unions where both are accepted
 *
 * @module schemas/orchestrationActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optBool = z.boolean().optional();
const optNum = z.number().optional();
const optPosNum = z.number().positive().optional();
const milestoneId = z.string().min(1);
const optMilestoneId = z.string().min(1).optional();

// Common agent task entry: { agentId, input, ... }
const agentTask = z.object({
  agentId: optStr,
  agent_id: optStr,
  input: z.record(z.string(), z.unknown()).optional(),
  name: optStr,
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  dependencies: z.array(z.string()).optional(),
}).passthrough();

// Completed unit entry for roadmap_advance
const completedUnit = z.object({
  unitId: z.string().min(1),
  buildPassed: z.boolean(),
}).passthrough();

// ============================================================================
// AGENT ACTIONS (8 actions)
// ============================================================================

const agent_execute = z.object({
  agent_id: optStr,
  task: optStr,
  input: z.record(z.string(), z.unknown()).optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  timeout_ms: z.number().int().positive().optional(),
  retries: z.number().int().min(0).optional(),
}).passthrough();

const agent_parallel = z.object({
  agents: z.array(agentTask).min(1),
}).passthrough();

const agent_pipeline = z.object({
  agents: z.array(agentTask).min(1),
}).passthrough();

const plan_create = z.object({
  name: optStr,
  mode: z.enum(["sequential", "parallel", "adaptive"]).optional(),
  tasks: z.array(z.object({
    agent_id: z.string().min(1),
    input: z.record(z.string(), z.unknown()).optional(),
    name: optStr,
    priority: z.enum(["low", "normal", "high", "critical"]).optional(),
    dependencies: z.array(z.string()).optional(),
  }).passthrough()).min(1),
}).passthrough();

const plan_execute = z.object({
  plan_id: z.string().min(1),
}).passthrough();

const plan_status = z.object({
  plan_id: z.string().min(1),
}).passthrough();

const queue_stats = z.object({}).passthrough();

const session_list = z.object({}).passthrough();

// ============================================================================
// SWARM ACTIONS (7 actions)
// ============================================================================

const swarmPatterns = z.enum([
  "parallel", "pipeline", "map_reduce", "consensus",
  "hierarchical", "ensemble", "competition", "collaboration",
]);

const swarm_execute = z.object({
  name: optStr,
  pattern: swarmPatterns,
  agents: z.array(z.string()).min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  timeout_ms: z.number().int().positive().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

const swarm_parallel = z.object({
  name: optStr,
  agents: z.array(z.string()).min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  timeout_ms: z.number().int().positive().optional(),
}).passthrough();

const swarm_consensus = z.object({
  name: optStr,
  agents: z.array(z.string()).min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  timeout_ms: z.number().int().positive().optional(),
  threshold: z.number().min(0).max(1).optional(),
  consensus_field: optStr,
}).passthrough();

const swarm_pipeline = z.object({
  name: optStr,
  agents: z.array(z.string()).min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  timeout_ms: z.number().int().positive().optional(),
}).passthrough();

const swarm_status = z.object({
  swarm_id: z.string().min(1),
}).passthrough();

const swarm_patterns = z.object({}).passthrough();

const swarm_quick = z.object({
  task: optStr,
  description: optStr,
  domain: optStr,
  max_agents: z.number().int().min(2).max(8).optional(),
  min_agents: z.number().int().min(2).optional(),
  timeout_ms: z.number().int().positive().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// ============================================================================
// ROADMAP EXECUTION ACTIONS (11 actions)
// ============================================================================

const roadmapSource = {
  milestone_id: optMilestoneId,
  roadmap: z.record(z.string(), z.unknown()).optional(),
};

const roadmap_plan = z.object({
  ...roadmapSource,
  completed_ids: z.array(z.string()).optional(),
}).passthrough();

const roadmap_next_batch = z.object({
  ...roadmapSource,
  position: z.record(z.string(), z.unknown()).optional(),
  auto_execute: optBool,
}).passthrough();

const roadmap_advance = z.object({
  ...roadmapSource,
  position: z.record(z.string(), z.unknown()).optional(),
  completed: z.array(completedUnit).min(1),
}).passthrough();

const roadmap_gate = z.object({
  ...roadmapSource,
  phase_id: z.string().min(1),
  completed_ids: z.array(z.string()).optional(),
  build_passed: optBool,
  tests_passed: optBool,
  test_count: z.number().int().nonnegative().optional(),
  baseline_test_count: z.number().int().nonnegative().optional(),
  omega_score: z.number().min(0).max(1).optional(),
}).passthrough();

const roadmap_list = z.object({}).passthrough();

const roadmap_load = z.object({
  milestone_id: milestoneId,
}).passthrough();

const roadmap_claim = z.object({
  milestone_id: milestoneId,
  unit_id: z.string().min(1),
  instance_id: z.string().min(1),
  worktree: optStr,
}).passthrough();

const roadmap_release = z.object({
  milestone_id: milestoneId,
  unit_id: z.string().min(1),
  instance_id: z.string().min(1),
}).passthrough();

const roadmap_heartbeat = z.object({
  milestone_id: milestoneId,
  unit_id: z.string().min(1),
  instance_id: z.string().min(1),
}).passthrough();

const roadmap_discover = z.object({
  category: z.enum(["main", "secondary", "archived"]).optional(),
  reap_stale: optBool,
}).passthrough();

const roadmap_populate_context = z.object({
  milestone_id: milestoneId,
  save: optBool,
}).passthrough();

const roadmap_register = z.object({
  milestone_id: optMilestoneId,
  milestone_ids: z.array(z.string().min(1)).optional(),
  roadmap_title: optStr,
  category: z.enum(["main", "secondary", "archived"]).optional(),
  priority: optNum,
}).passthrough();

// ============================================================================
// EXPORT: ACTION_ORCHESTRATION_SCHEMAS
// ============================================================================

export const ACTION_ORCHESTRATION_SCHEMAS: ActionSchemaMap = {
  // Agent actions
  agent_execute,
  agent_parallel,
  agent_pipeline,
  plan_create,
  plan_execute,
  plan_status,
  queue_stats,
  session_list,

  // Swarm actions
  swarm_execute,
  swarm_parallel,
  swarm_consensus,
  swarm_pipeline,
  swarm_status,
  swarm_patterns,
  swarm_quick,

  // Roadmap execution actions
  roadmap_plan,
  roadmap_next_batch,
  roadmap_advance,
  roadmap_gate,
  roadmap_list,
  roadmap_load,
  roadmap_claim,
  roadmap_release,
  roadmap_heartbeat,
  roadmap_discover,
  roadmap_populate_context,
  roadmap_register,
};
