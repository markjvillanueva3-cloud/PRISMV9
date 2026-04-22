/**
 * Context Action Schemas — Zod validation for contextDispatcher actions
 */

import { z } from "zod";

export const ACTION_CONTEXT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  // Identity Model — U-SAV2-01
  identity_register: z.object({
    sessionId: z.string().min(1),
    role: z.enum(["builder", "reviewer", "planner", "researcher", "operator", "orchestrator", "specialist", "general"]).optional(),
    family: z.enum(["claude-code", "mcp-client", "hook-agent", "scheduled", "external"]).optional(),
    currentMilestone: z.string().optional(),
    currentUnit: z.string().optional(),
    specializations: z.array(z.string()).optional(),
    customBoundaries: z.array(z.object({
      name: z.string(),
      type: z.enum(["must_not", "must", "prefer", "avoid"]),
      description: z.string(),
      enforcedBy: z.string().optional(),
    })).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),

  identity_get: z.object({
    sessionId: z.string().min(1),
  }),

  identity_heartbeat: z.object({
    sessionId: z.string().min(1),
  }),

  identity_check_boundary: z.object({
    sessionId: z.string().min(1),
    boundaryName: z.string().min(1),
  }),

  identity_capabilities: z.object({
    sessionId: z.string().min(1),
  }),

  identity_list: z.object({}).optional(),

  identity_siblings: z.object({
    sessionId: z.string().min(1),
  }),

  identity_deregister: z.object({
    sessionId: z.string().min(1),
  }),

  identity_stats: z.object({}).optional(),

  // KV operations
  kv_sort_json: z.object({
    content: z.string(),
  }).optional(),

  kv_check_stability: z.object({
    content: z.string(),
  }).optional(),

  // Tool masking
  tool_mask_state: z.object({}).optional(),

  // Memory operations
  memory_externalize: z.object({
    key: z.string().optional(),
  }).optional(),

  memory_restore: z.object({
    key: z.string().optional(),
  }).optional(),

  // TODO management
  todo_update: z.object({
    content: z.string().optional(),
    action: z.enum(["add", "complete", "clear"]).optional(),
    item: z.string().optional(),
  }).optional(),

  todo_read: z.object({}).optional(),

  // Error handling
  error_preserve: z.object({
    error: z.string(),
    context: z.string().optional(),
  }).optional(),

  error_patterns: z.object({}).optional(),

  // Response variation
  vary_response: z.object({
    base: z.string(),
    style: z.string().optional(),
  }).optional(),

  // Team coordination
  team_spawn: z.object({
    teamId: z.string(),
    config: z.record(z.unknown()).optional(),
  }).optional(),

  team_broadcast: z.object({
    message: z.string(),
    teamId: z.string().optional(),
  }).optional(),

  team_create_task: z.object({
    taskId: z.string(),
    description: z.string(),
    assignee: z.string().optional(),
  }).optional(),

  team_heartbeat: z.object({
    agentId: z.string(),
  }).optional(),

  // Budget management
  budget_get: z.object({}).optional(),
  budget_track: z.object({
    tokens: z.number(),
    category: z.string().optional(),
  }).optional(),
  budget_report: z.object({}).optional(),
  budget_reset: z.object({}).optional(),

  // Context intelligence
  attention_score: z.object({
    content: z.string(),
  }).optional(),

  focus_optimize: z.object({
    targets: z.array(z.string()).optional(),
  }).optional(),

  relevance_filter: z.object({
    items: z.array(z.string()),
    query: z.string(),
  }).optional(),

  context_monitor_check: z.object({}).optional(),

  // Catalog operations
  catalog_overview: z.object({}).optional(),
  catalog_search: z.object({
    query: z.string(),
    limit: z.number().optional(),
  }).optional(),
  catalog_engine: z.object({
    name: z.string(),
  }).optional(),
  catalog_stats: z.object({}).optional(),
};
