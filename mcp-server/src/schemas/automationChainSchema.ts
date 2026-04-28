/**
 * Automation Chain Schemas — ACP-MS0A
 * ====================================
 * Zod schemas for automation chains, context bundles, telemetry events,
 * and budget enforcement contracts.
 *
 * @module schemas/automationChainSchema
 * @version 1.0.0
 * @milestone ACP-MS0A
 */

import { z } from "zod";

// ============================================================================
// TASK CLASS & TIERS
// ============================================================================

export const TaskClassSchema = z.enum([
  "backend",      // MCP server TypeScript code changes
  "web",          // React/Vite frontend work
  "cad_python",   // CadQuery/Fusion Python CAD engine
  "roadmap",      // Roadmap execution, milestone work
  "audit",        // Quality audits, reviews, scrutiny
  "speed_feed",   // Speed/feed calculations, physics
  "post_process", // Post processor, G-code optimization
  "erp",          // Business, quoting, scheduling, ERP
  "general",      // Catch-all for unclassified tasks
]).describe("Task classification for automation routing");

export const ChainTierSchema = z.enum([
  "critical",     // Fail-closed, no degradation allowed
  "standard",     // Degrade with warning on failure
  "background",   // Silent degradation acceptable
]).describe("Chain execution tier affecting fail behavior");

export const FailBehaviorSchema = z.enum([
  "fail_closed",   // Hard stop, no fallback
  "degrade_silent",// Continue silently without this step
  "degrade_warn",  // Continue with user warning
  "ask_user",      // Prompt user for decision
]).describe("Behavior when chain step fails");

// ============================================================================
// TRIGGER DEFINITIONS (P0-U01: triggers field)
// ============================================================================

export const TriggerTypeSchema = z.enum([
  "hook_event",    // Claude hook event (PreToolUse, PostToolUse, etc.)
  "slash_command", // User slash command (/foo)
  "keyword",       // Keyword match in user prompt
  "session_event", // Session lifecycle (start, compact, stop)
  "schedule",      // Time-based trigger (cadence)
]).describe("Type of trigger that activates this chain");

export const ChainTriggerSchema = z.object({
  type: TriggerTypeSchema,
  pattern: z.string().describe("Trigger pattern (hook name, command name, keyword regex, etc.)"),
  priority: z.number().int().min(1).max(100).default(50).describe("Priority when multiple triggers match (lower = higher priority)"),
  enabled: z.boolean().default(true).describe("Whether this trigger is active"),
}).describe("Trigger that activates an automation chain");

// ============================================================================
// CONTEXT BUNDLE
// ============================================================================

export const ContextBundleSchema = z.object({
  id: z.string().min(1).describe("Unique bundle identifier"),
  files: z.array(z.string()).describe("File paths to load"),
  purpose: z.string().describe("Why this bundle is needed"),
  token_cost_estimate: z.number().int().nonnegative().describe("Estimated token cost to load"),
  optional: z.boolean().default(false).describe("Whether bundle can be skipped if missing"),
}).describe("Context files to load for a chain");

// ============================================================================
// CHAIN STEP
// ============================================================================

export const ChainStepSchema = z.object({
  id: z.string().min(1).describe("Step identifier"),
  action: z.string().describe("Action to execute"),
  description: z.string().describe("Human-readable description"),
  required: z.boolean().describe("Whether failure blocks the chain"),
  timeout_ms: z.number().int().positive().describe("Maximum execution time in ms"),
  retry_count: z.number().int().nonnegative().default(0).describe("Number of retries on failure"),
  fallback_action: z.string().optional().describe("Action to run if this step fails"),
}).describe("Single step in an automation chain");

// ============================================================================
// TOKEN BUDGET ENFORCEMENT (P0-U05)
// ============================================================================

export const BudgetEnforcementSchema = z.object({
  max_tokens: z.number().int().positive().describe("Maximum token budget for this chain"),
  soft_limit_pct: z.number().min(0).max(100).default(80).describe("Percentage at which to warn"),
  hard_limit_pct: z.number().min(0).max(100).default(100).describe("Percentage at which to enforce"),
  on_soft_limit: z.enum(["warn", "throttle", "ignore"]).default("warn").describe("Action at soft limit"),
  on_hard_limit: z.enum(["fail", "truncate", "ask_user"]).default("fail").describe("Action at hard limit"),
  rollover: z.boolean().default(false).describe("Whether unused budget rolls over"),
}).describe("Token budget enforcement contract");

// ============================================================================
// AUTOMATION CHAIN (complete schema)
// ============================================================================

export const AutomationChainSchema = z.object({
  id: z.string().min(1).describe("Unique chain identifier"),
  task_class: TaskClassSchema,
  tier: ChainTierSchema,
  version: z.string().default("1.0.0").describe("Chain version"),

  // Triggers (P0-U01, P0-U02)
  triggers: z.array(ChainTriggerSchema).default([]).describe("Events that activate this chain"),

  // Token budget (P0-U05)
  token_budget: z.number().int().positive().describe("Maximum tokens for entire chain"),
  budget_enforcement: BudgetEnforcementSchema.optional().describe("Budget enforcement rules"),

  // Context and steps
  context_bundles: z.array(ContextBundleSchema).describe("Context to load before execution"),
  steps: z.array(ChainStepSchema).describe("Ordered steps to execute"),

  // Fail behavior (P0-U03)
  fail_behavior: FailBehaviorSchema,
  fail_message: z.string().optional().describe("Message to show user on failure"),

  // Downstream
  downstream_hooks: z.array(z.string()).describe("Hooks to trigger after chain completion"),

  // Metadata
  enabled: z.boolean().default(true).describe("Whether chain is active"),
  description: z.string().optional().describe("Chain description"),
  owner: z.string().optional().describe("Team/person responsible"),
}).describe("Complete automation chain definition");

// ============================================================================
// TELEMETRY EVENT (P0-U04)
// ============================================================================

export const TelemetryEventStatusSchema = z.enum([
  "started",
  "completed",
  "failed",
  "skipped",
  "timeout",
  "budget_exceeded",
]).describe("Step execution outcome");

export const TelemetryEventSchema = z.object({
  timestamp: z.string().datetime().describe("ISO timestamp of event"),
  chain_id: z.string().describe("Chain that generated this event"),
  step_id: z.string().describe("Step within the chain"),
  status: TelemetryEventStatusSchema,
  token_cost: z.number().int().nonnegative().describe("Tokens consumed by this step"),
  latency_ms: z.number().int().nonnegative().describe("Execution time in milliseconds"),
  budget_remaining: z.number().int().optional().describe("Tokens remaining in budget"),
  error: z.string().optional().describe("Error message if failed"),
  metadata: z.record(z.string(), z.unknown()).optional().describe("Additional telemetry data"),
}).describe("Telemetry event for chain execution tracking");

// ============================================================================
// COMMAND-TO-CHAIN MAPPING (P0-U02)
// ============================================================================

export const CommandMappingSchema = z.object({
  command: z.string().describe("Slash command (without /)"),
  chain_id: z.string().describe("Chain to execute"),
  priority: z.number().int().default(50).describe("Mapping priority"),
  params_transform: z.record(z.string(), z.string()).optional().describe("Parameter name transformations"),
}).describe("Slash command to chain mapping");

export const EventMappingSchema = z.object({
  event: z.string().describe("Hook event name"),
  chain_id: z.string().describe("Chain to execute"),
  condition: z.string().optional().describe("Additional condition expression"),
  priority: z.number().int().default(50).describe("Mapping priority"),
}).describe("Hook event to chain mapping");

// ============================================================================
// FAIL-CLOSED RULES BY TIER (P0-U03)
// ============================================================================

export const TierFailRulesSchema = z.object({
  tier: ChainTierSchema,
  default_fail_behavior: FailBehaviorSchema,
  retry_allowed: z.boolean().describe("Whether retries are permitted"),
  max_retries: z.number().int().nonnegative().describe("Maximum retry attempts"),
  escalation_path: z.enum(["user", "log", "abort", "fallback"]).describe("Where to escalate failures"),
  telemetry_required: z.boolean().describe("Whether telemetry must be recorded"),
  description: z.string().describe("Human description of this tier's rules"),
}).describe("Fail-closed rules for a chain tier");

export const TIER_FAIL_RULES: z.infer<typeof TierFailRulesSchema>[] = [
  {
    tier: "critical",
    default_fail_behavior: "fail_closed",
    retry_allowed: false,
    max_retries: 0,
    escalation_path: "abort",
    telemetry_required: true,
    description: "Critical chains abort on any failure. No retries, no degradation. User sees error immediately.",
  },
  {
    tier: "standard",
    default_fail_behavior: "degrade_warn",
    retry_allowed: true,
    max_retries: 1,
    escalation_path: "user",
    telemetry_required: true,
    description: "Standard chains try once more on failure, then warn user and continue with degraded functionality.",
  },
  {
    tier: "background",
    default_fail_behavior: "degrade_silent",
    retry_allowed: true,
    max_retries: 2,
    escalation_path: "log",
    telemetry_required: false,
    description: "Background chains retry silently up to 2 times, then fail silently with log entry.",
  },
];

// ============================================================================
// TOKEN BUDGET GUIDELINES (P0-U05)
// ============================================================================

export const TOKEN_BUDGET_GUIDELINES = {
  entry_router: { max: 500, description: "Entry classification + routing, minimal context" },
  coding_chain: { max: 2000, description: "Code changes with engine/dispatcher digest context" },
  product_autopilot: { max: 5000, description: "Full product workflow with extensive context" },
  audit_chain: { max: 2000, description: "Multi-agent review with focused context" },
  physics_chain: { max: 1000, description: "Physics calculations with constants only" },
  roadmap_chain: { max: 500, description: "Position + handoff context, minimal processing" },
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type TaskClass = z.infer<typeof TaskClassSchema>;
export type ChainTier = z.infer<typeof ChainTierSchema>;
export type FailBehavior = z.infer<typeof FailBehaviorSchema>;
export type TriggerType = z.infer<typeof TriggerTypeSchema>;
export type ChainTrigger = z.infer<typeof ChainTriggerSchema>;
export type ContextBundle = z.infer<typeof ContextBundleSchema>;
export type ChainStep = z.infer<typeof ChainStepSchema>;
export type BudgetEnforcement = z.infer<typeof BudgetEnforcementSchema>;
export type AutomationChain = z.infer<typeof AutomationChainSchema>;
export type TelemetryEventStatus = z.infer<typeof TelemetryEventStatusSchema>;
export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;
export type CommandMapping = z.infer<typeof CommandMappingSchema>;
export type EventMapping = z.infer<typeof EventMappingSchema>;
export type TierFailRules = z.infer<typeof TierFailRulesSchema>;
