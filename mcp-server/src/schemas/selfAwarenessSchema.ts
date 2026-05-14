/**
 * SelfAwarenessSchema — Agent Identity Model
 * ===========================================
 *
 * AGENT-MS1 U-AGT03 — Zod schema defining the agent's self-model.
 * The "I know what I am" foundation — serializable to <2KB JSON for
 * context injection at session start / compaction.
 *
 * Consumes:
 *   - CapabilityIndexEngine output (dispatcher + action counts)
 *   - EngineDigestEngine output (engine + category counts)
 *   - Memory pointers (MEMORY.md, COMPACTION_SURVIVAL.json)
 *
 * @module schemas/selfAwarenessSchema
 * @milestone AGENT-MS1 (U-AGT03)
 * @version 1.0.0
 */

import { z } from "zod";

// ── Identity ──────────────────────────────────────────────────────────────

export const agentIdentitySchema = z.object({
  /** Canonical name of this agent instance (e.g. "Claude-Opus-4.7") */
  name: z.string().min(1).max(64),
  /** Role the agent plays in the system */
  role: z.enum([
    "executor",
    "advisor",
    "reviewer",
    "coordinator",
    "specialist",
    "unknown",
  ]),
  /** Model family (e.g. "claude-opus-4-7", "claude-sonnet-4-6") */
  model_id: z.string().min(1).max(64),
  /** Session identifier for correlation */
  session_id: z.string().min(1).max(128),
  /** Machine/host identifier */
  machine_id: z.string().min(1).max(128).optional(),
  /** When this identity record was created */
  created_at: z.string().datetime(),
});

export type AgentIdentity = z.infer<typeof agentIdentitySchema>;

// ── Capabilities (from CapabilityIndexEngine + EngineDigestEngine) ────────

export const agentCapabilitiesSchema = z.object({
  /** Total dispatchers the agent can call */
  dispatcher_count: z.number().int().nonnegative(),
  /** Total actions across all dispatchers */
  action_count: z.number().int().nonnegative(),
  /** Engines available in the codebase */
  engine_count: z.number().int().nonnegative(),
  /** Action categories the agent can operate in */
  categories: z.array(z.string()).max(64),
  /** Preferred tracks this agent owns (e.g. "LATHE", "AGENT") */
  owned_tracks: z.array(z.string()).max(32).default([]),
  /** Known skills available via the Skill tool */
  skill_count: z.number().int().nonnegative().default(0),
});

export type AgentCapabilities = z.infer<typeof agentCapabilitiesSchema>;

// ── Constraints (guardrails + boundaries) ──────────────────────────────────

export const agentConstraintsSchema = z.object({
  /** Tracks this agent is BLOCKED from touching (boundary rules) */
  blocked_tracks: z.array(z.string()).max(32).default([]),
  /** Hard limits the agent must respect */
  hard_limits: z
    .object({
      max_bash_timeout_ms: z.number().int().positive().default(600_000),
      max_read_lines_per_call: z.number().int().positive().default(2000),
      max_concurrent_bash: z.number().int().positive().default(4),
      require_user_confirmation: z.array(z.string()).default([]),
    })
    .default({
      max_bash_timeout_ms: 600_000,
      max_read_lines_per_call: 2000,
      max_concurrent_bash: 4,
      require_user_confirmation: [],
    }),
  /** Safety protocols the agent must invoke (e.g. "duplication_guard") */
  safety_protocols: z.array(z.string()).max(16).default([]),
  /** Omega floor (quality gate minimum) */
  omega_floor: z.number().min(0).max(1).default(0.85),
  /** Omega target (quality aspiration) */
  omega_target: z.number().min(0).max(1).default(1.0),
});

export type AgentConstraints = z.infer<typeof agentConstraintsSchema>;

// ── State (current working context) ────────────────────────────────────────

export const agentStateSchema = z.object({
  /** Working phase — "exploring" | "implementing" | "testing" | "reviewing" | "idle" */
  phase: z.enum([
    "exploring",
    "implementing",
    "testing",
    "reviewing",
    "committing",
    "idle",
  ]),
  /** Current roadmap milestone (e.g. "LATHE-AWARE-HARDEN-MS9") */
  current_milestone: z.string().max(128).optional(),
  /** Current unit of work (e.g. "U-LAT66") */
  current_unit: z.string().max(64).optional(),
  /** Active task IDs */
  active_tasks: z.array(z.union([z.string(), z.number()])).max(32).default([]),
  /** In-progress work description */
  in_progress_description: z.string().max(512).optional(),
  /** Current working directory */
  cwd: z.string().max(256).optional(),
  /** Current git branch */
  git_branch: z.string().max(128).optional(),
});

export type AgentState = z.infer<typeof agentStateSchema>;

// ── Memory pointers ────────────────────────────────────────────────────────

export const agentMemorySchema = z.object({
  /** Path to user-level MEMORY.md */
  memory_md_path: z.string().max(512).optional(),
  /** Path to project-level compaction survival file */
  compaction_survival_path: z.string().max(512).optional(),
  /** Path to agent's per-session handoff file */
  handoff_path: z.string().max(512).optional(),
  /** Cross-session asset registry path */
  asset_registry_path: z.string().max(512).optional(),
  /** Last compaction timestamp (ISO) */
  last_compaction_at: z.string().datetime().optional(),
  /** Last checkpoint commit hash */
  last_checkpoint_commit: z.string().max(64).optional(),
});

export type AgentMemory = z.infer<typeof agentMemorySchema>;

// ── Active context (recent activity summary) ──────────────────────────────

export const agentActiveContextSchema = z.object({
  /** Files recently read in this session */
  recent_files: z.array(z.string()).max(20).default([]),
  /** Commands recently executed */
  recent_commands: z.array(z.string()).max(20).default([]),
  /** Recent commit hashes (short, last 10) */
  recent_commits: z.array(z.string()).max(10).default([]),
  /** Tokens spent this session (approximate) */
  tokens_spent: z.number().int().nonnegative().default(0),
  /** Session started at (ISO) */
  session_started_at: z.string().datetime().optional(),
});

export type AgentActiveContext = z.infer<typeof agentActiveContextSchema>;

// ── Full Self-Awareness Schema ────────────────────────────────────────────

export const selfAwarenessSchema = z.object({
  schema_version: z.literal("1.0.0"),
  identity: agentIdentitySchema,
  capabilities: agentCapabilitiesSchema,
  constraints: agentConstraintsSchema,
  state: agentStateSchema,
  memory: agentMemorySchema,
  active_context: agentActiveContextSchema,
  /** When this self-model was last refreshed */
  refreshed_at: z.string().datetime(),
});

export type SelfAwareness = z.infer<typeof selfAwarenessSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a minimal self-awareness record from partial input. Fills in defaults
 * and a fresh timestamp. Validates the result against the schema.
 */
export function buildSelfAwareness(input: {
  identity: Partial<AgentIdentity> & Pick<AgentIdentity, "name" | "model_id" | "session_id">;
  capabilities: Partial<AgentCapabilities>;
  state?: Partial<AgentState>;
  memory?: Partial<AgentMemory>;
  constraints?: Partial<AgentConstraints>;
  active_context?: Partial<AgentActiveContext>;
}): SelfAwareness {
  const now = new Date().toISOString();

  const draft: SelfAwareness = {
    schema_version: "1.0.0",
    identity: {
      name: input.identity.name,
      role: input.identity.role ?? "executor",
      model_id: input.identity.model_id,
      session_id: input.identity.session_id,
      machine_id: input.identity.machine_id,
      created_at: input.identity.created_at ?? now,
    },
    capabilities: {
      dispatcher_count: input.capabilities.dispatcher_count ?? 0,
      action_count: input.capabilities.action_count ?? 0,
      engine_count: input.capabilities.engine_count ?? 0,
      categories: input.capabilities.categories ?? [],
      owned_tracks: input.capabilities.owned_tracks ?? [],
      skill_count: input.capabilities.skill_count ?? 0,
    },
    constraints: {
      blocked_tracks: input.constraints?.blocked_tracks ?? [],
      hard_limits: input.constraints?.hard_limits ?? {
        max_bash_timeout_ms: 600_000,
        max_read_lines_per_call: 2000,
        max_concurrent_bash: 4,
        require_user_confirmation: [],
      },
      safety_protocols: input.constraints?.safety_protocols ?? [],
      omega_floor: input.constraints?.omega_floor ?? 0.85,
      omega_target: input.constraints?.omega_target ?? 1.0,
    },
    state: {
      phase: input.state?.phase ?? "idle",
      current_milestone: input.state?.current_milestone,
      current_unit: input.state?.current_unit,
      active_tasks: input.state?.active_tasks ?? [],
      in_progress_description: input.state?.in_progress_description,
      cwd: input.state?.cwd,
      git_branch: input.state?.git_branch,
    },
    memory: {
      memory_md_path: input.memory?.memory_md_path,
      compaction_survival_path: input.memory?.compaction_survival_path,
      handoff_path: input.memory?.handoff_path,
      asset_registry_path: input.memory?.asset_registry_path,
      last_compaction_at: input.memory?.last_compaction_at,
      last_checkpoint_commit: input.memory?.last_checkpoint_commit,
    },
    active_context: {
      recent_files: input.active_context?.recent_files ?? [],
      recent_commands: input.active_context?.recent_commands ?? [],
      recent_commits: input.active_context?.recent_commits ?? [],
      tokens_spent: input.active_context?.tokens_spent ?? 0,
      session_started_at: input.active_context?.session_started_at,
    },
    refreshed_at: now,
  };

  return selfAwarenessSchema.parse(draft);
}

/**
 * Serialize a self-awareness record to compact JSON (<2KB target).
 * Omits empty arrays and undefined fields.
 */
export function serializeCompact(model: SelfAwareness): string {
  const compact: any = {
    v: model.schema_version,
    id: {
      name: model.identity.name,
      role: model.identity.role,
      model: model.identity.model_id,
      session: model.identity.session_id,
    },
    caps: {
      d: model.capabilities.dispatcher_count,
      a: model.capabilities.action_count,
      e: model.capabilities.engine_count,
    },
    phase: model.state.phase,
    ref_at: model.refreshed_at,
  };
  if (model.identity.machine_id) compact.id.machine = model.identity.machine_id;
  if (model.capabilities.owned_tracks.length > 0) compact.caps.tracks = model.capabilities.owned_tracks;
  if (model.constraints.blocked_tracks.length > 0) compact.blocked = model.constraints.blocked_tracks;
  if (model.state.current_milestone) compact.ms = model.state.current_milestone;
  if (model.state.current_unit) compact.unit = model.state.current_unit;
  if (model.state.git_branch) compact.branch = model.state.git_branch;
  if (model.active_context.recent_commits.length > 0) {
    compact.commits = model.active_context.recent_commits.slice(0, 5);
  }
  return JSON.stringify(compact);
}

/**
 * Validate an unknown input against the schema without throwing.
 */
export function validateSelfAwareness(
  input: unknown
): { valid: true; data: SelfAwareness } | { valid: false; errors: z.ZodIssue[] } {
  const parsed = selfAwarenessSchema.safeParse(input);
  if (parsed.success) return { valid: true, data: parsed.data };
  return { valid: false, errors: parsed.error.issues };
}
