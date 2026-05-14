/**
 * AI Interface Schemas — AI-INTEG-MS0
 * ====================================
 * Type-safe Zod schemas for multi-agent AI communication.
 * Enables 5 concurrent agents (4 Claude, 1 Codex) to share
 * PUOA access, reasoning chains, and token budgets.
 *
 * @module schemas/aiInterfaceSchemas
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// AGENT SESSION SCHEMAS
// ============================================================================

/** External agent family (Claude or Codex) */
export const agentFamilySchema = z.enum(["claude", "codex"]).describe("Agent family (Claude or Codex)");

/** Agent lane assignment */
export const agentLaneSchema = z.enum([
  "ai-integ",    // AI Integration + Knowledge Learning
  "kar",         // Knowledge-Augmented Reasoning
  "backend",     // Engine wiring, physics, MCP
  "qa",          // Test coverage, TypeScript fixes
  "rem",         // TypeScript remediation
  "data",        // Program extraction, pipelines
  "pipe",        // Data pipelines
  "appw",        // Web app pages
  "frontend",    // UX, browser integration
]).describe("Agent lane assignment");

/** Agent session state */
export const agentSessionStateSchema = z.enum([
  "active",      // Currently working
  "idle",        // Connected but not working
  "reasoning",   // Executing PUOA chain
  "blocked",     // Waiting for another agent
  "disconnected",// Session ended
]).describe("Agent session state");

/** External agent session */
export const agentSessionSchema = z.object({
  session_id: z.string().min(1).describe("Unique session identifier"),
  agent_id: z.string().min(1).describe("Agent instance identifier (e.g., claude-1, codex-1)"),
  family: agentFamilySchema,
  lane: agentLaneSchema.optional().describe("Assigned lane"),
  machine: z.string().optional().describe("Machine name"),
  state: agentSessionStateSchema,
  connected_at: z.string().datetime().describe("When session started"),
  last_activity: z.string().datetime().describe("Last activity timestamp"),
  current_task: z.string().optional().describe("Current task description"),
  token_budget: z.number().int().min(0).describe("Remaining token budget"),
  token_used: z.number().int().min(0).describe("Tokens used this session"),
  reasoning_chains_executed: z.number().int().min(0).describe("Number of PUOA chains executed"),
}).passthrough();

export type AgentFamily = z.infer<typeof agentFamilySchema>;
export type AgentLane = z.infer<typeof agentLaneSchema>;
export type AgentSessionState = z.infer<typeof agentSessionStateSchema>;
export type AgentSession = z.infer<typeof agentSessionSchema>;

// ============================================================================
// REASONING CHAIN SCHEMAS
// ============================================================================

/** Reasoning chain source */
export const chainSourceSchema = z.enum([
  "puoa",        // PRISM Unified Orchestration Algorithm
  "tribal",      // Tribal Knowledge system
  "physics",     // Physics engine chain
  "optimization",// Optimization chain
  "planning",    // Long-horizon planning
]).describe("Source of the reasoning chain");

/** Reasoning chain status */
export const chainStatusSchema = z.enum([
  "pending",     // Not yet started
  "executing",   // Currently running
  "completed",   // Successfully completed
  "failed",      // Execution failed
  "cached",      // Retrieved from cache
]).describe("Reasoning chain status");

/** Reasoning chain metadata */
export const reasoningChainSchema = z.object({
  chain_id: z.string().min(1).describe("Unique chain identifier"),
  source: chainSourceSchema,
  status: chainStatusSchema,
  intent: z.string().describe("Original intent/query"),
  intent_hash: z.string().describe("Hash of intent for deduplication"),
  created_by: z.string().describe("Agent that created this chain"),
  created_at: z.string().datetime().describe("Creation timestamp"),
  completed_at: z.string().datetime().optional().describe("Completion timestamp"),
  duration_ms: z.number().int().min(0).optional().describe("Execution duration"),
  token_cost: z.number().int().min(0).optional().describe("Token cost of chain"),
  result_summary: z.string().optional().describe("Brief summary of result"),
  confidence: z.number().min(0).max(1).optional().describe("Confidence in result"),
  steps_completed: z.number().int().min(0).default(0).describe("Number of steps completed"),
  steps_total: z.number().int().min(0).optional().describe("Total steps in chain"),
  cache_hits: z.number().int().min(0).default(0).describe("How many times this was retrieved from cache"),
  shared_with: z.array(z.string()).default([]).describe("Agents this chain was shared with"),
}).passthrough();

export type ChainSource = z.infer<typeof chainSourceSchema>;
export type ChainStatus = z.infer<typeof chainStatusSchema>;
export type ReasoningChain = z.infer<typeof reasoningChainSchema>;

// ============================================================================
// AI INTERFACE ACTIONS
// ============================================================================

/** Register a new agent session */
export const registerSessionSchema = z.object({
  agent_id: z.string().min(1).describe("Agent instance identifier"),
  family: agentFamilySchema,
  lane: agentLaneSchema.optional().describe("Requested lane assignment"),
  machine: z.string().optional().describe("Machine name"),
  token_budget: z.number().int().positive().optional().default(100000).describe("Initial token budget"),
}).passthrough();

/** Update session state */
export const updateSessionSchema = z.object({
  session_id: z.string().min(1).describe("Session to update"),
  state: agentSessionStateSchema.optional(),
  current_task: z.string().optional(),
  lane: agentLaneSchema.optional(),
}).passthrough();

/** Execute through shared AI interface */
export const executeAISchema = z.object({
  session_id: z.string().min(1).describe("Calling session"),
  intent: z.string().min(1).describe("Task intent"),
  context: z.record(z.string(), z.unknown()).optional().describe("Execution context"),
  check_cache: z.boolean().default(true).describe("Check for existing chain first"),
  share_result: z.boolean().default(true).describe("Share result with other agents"),
  max_tokens: z.number().int().positive().optional().describe("Token limit for this execution"),
}).passthrough();

/** Query shared reasoning chains */
export const queryChainSchema = z.object({
  intent_pattern: z.string().optional().describe("Pattern to match intents"),
  source: chainSourceSchema.optional().describe("Filter by chain source"),
  status: chainStatusSchema.optional().describe("Filter by status"),
  created_by: z.string().optional().describe("Filter by creating agent"),
  since: z.string().datetime().optional().describe("Chains created after this time"),
  limit: z.number().int().positive().max(100).default(20).describe("Max results"),
}).passthrough();

/** Claim a reasoning chain to prevent duplicate work */
export const claimChainSchema = z.object({
  session_id: z.string().min(1).describe("Claiming session"),
  intent: z.string().min(1).describe("Intent to claim"),
  estimated_duration_ms: z.number().int().positive().optional().describe("Expected duration"),
}).passthrough();

/** Share a completed chain with other agents */
export const shareChainSchema = z.object({
  chain_id: z.string().min(1).describe("Chain to share"),
  target_agents: z.array(z.string()).optional().describe("Specific agents (empty = all)"),
  summary: z.string().optional().describe("Override result summary"),
}).passthrough();

/** Get token budget status */
export const tokenStatusSchema = z.object({
  session_id: z.string().min(1).describe("Session to query"),
}).passthrough();

/** Allocate additional tokens */
export const allocateTokensSchema = z.object({
  session_id: z.string().min(1).describe("Session to allocate to"),
  amount: z.number().int().positive().describe("Tokens to allocate"),
  reason: z.string().optional().describe("Reason for allocation"),
}).passthrough();

export type RegisterSessionInput = z.infer<typeof registerSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
export type ExecuteAIInput = z.infer<typeof executeAISchema>;
export type QueryChainInput = z.infer<typeof queryChainSchema>;
export type ClaimChainInput = z.infer<typeof claimChainSchema>;
export type ShareChainInput = z.infer<typeof shareChainSchema>;
export type TokenStatusInput = z.infer<typeof tokenStatusSchema>;
export type AllocateTokensInput = z.infer<typeof allocateTokensSchema>;

// ============================================================================
// COORDINATION SCHEMAS
// ============================================================================

/** Conflict between agents */
export const agentConflictSchema = z.object({
  conflict_id: z.string().min(1),
  agents: z.array(z.string()).min(2),
  resource: z.string().describe("Contested resource"),
  conflict_type: z.enum(["duplicate_work", "resource_lock", "lane_overlap", "token_exhaustion"]),
  detected_at: z.string().datetime(),
  resolved: z.boolean().default(false),
  resolution: z.string().optional(),
}).passthrough();

/** Agent activity for coordination */
export const agentActivitySchema = z.object({
  session_id: z.string(),
  agent_id: z.string(),
  lane: agentLaneSchema.optional(),
  current_intent: z.string().optional(),
  intent_started_at: z.string().datetime().optional(),
  estimated_completion: z.string().datetime().optional(),
  files_touched: z.array(z.string()).default([]),
  chains_in_progress: z.array(z.string()).default([]),
}).passthrough();

export type AgentConflict = z.infer<typeof agentConflictSchema>;
export type AgentActivity = z.infer<typeof agentActivitySchema>;

// ============================================================================
// DISPATCHER ACTION SCHEMAS MAP
// ============================================================================

/** Action schemas for prism_ai dispatcher */
export const aiInterfaceActionSchemas = {
  register_session: registerSessionSchema,
  update_session: updateSessionSchema,
  end_session: z.object({ session_id: z.string().min(1) }).passthrough(),
  list_sessions: z.object({
    family: agentFamilySchema.optional(),
    state: agentSessionStateSchema.optional(),
    lane: agentLaneSchema.optional(),
  }).passthrough(),

  execute: executeAISchema,
  claim_chain: claimChainSchema,
  release_chain: z.object({ chain_id: z.string().min(1) }).passthrough(),
  share_chain: shareChainSchema,
  query_chains: queryChainSchema,
  get_chain: z.object({ chain_id: z.string().min(1) }).passthrough(),

  token_status: tokenStatusSchema,
  allocate_tokens: allocateTokensSchema,

  get_activity: z.object({}).passthrough(),
  detect_conflicts: z.object({}).passthrough(),
  resolve_conflict: z.object({
    conflict_id: z.string().min(1),
    resolution: z.string(),
  }).passthrough(),
} as const;

export type AIInterfaceAction = keyof typeof aiInterfaceActionSchemas;
