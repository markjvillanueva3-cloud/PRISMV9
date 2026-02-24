/**
 * PRISM RGS — Canonical Roadmap Schema
 * Zod schemas for the Roadmap Generation System.
 * Validates roadmap structure at runtime to ensure every unit, phase,
 * and gate follows the canonical format before generation or execution.
 *
 * Types exported:
 *   RoadmapStep, RoadmapDeliverable, RoadmapUnit, RoadmapPhase,
 *   RoadmapGate, RoadmapEnvelope, ScrutinyConfig, ScrutinyPass,
 *   ScrutinyLog, Gap, RoleSpec, ToolMapEntry, LeverageEntry
 *
 * Factories: createEmptyUnit(), createEmptyPhase()
 * Helpers:   parseRoadmap(), validateRoadmap()
 *
 * @module schemas/roadmapSchema
 */

import { z } from "zod";

// ─── Enums ─────────────────────────────────────────────────────────

/** Role codes from the RGS role matrix (R1-R8). */
export const RoleCode = z.enum([
  "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8",
]);
export type RoleCode = z.infer<typeof RoleCode>;

/** Model spec — single model or escalation chain. */
export const ModelSpec = z.string().describe(
  'Model identifier or escalation chain, e.g. "opus-4.6", "sonnet-4.6", "haiku->sonnet->opus"'
);
export type ModelSpec = z.infer<typeof ModelSpec>;

/** Deliverable type classification. */
export const DeliverableType = z.enum([
  "skill", "script", "hook", "command", "schema",
  "config", "state", "doc", "test", "source", "template", "data",
]);
export type DeliverableType = z.infer<typeof DeliverableType>;

/** Gap severity levels used by the scrutinizer. */
export const GapSeverity = z.enum(["CRITICAL", "MAJOR", "MINOR", "INFO"]);
export type GapSeverity = z.infer<typeof GapSeverity>;

/** Gap categories the scrutinizer checks for. */
export const GapCategory = z.enum([
  "missing_tools", "missing_deps", "missing_exit_conditions",
  "missing_rollback", "sequence_errors", "role_mismatch",
  "effort_mismatch", "missing_indexing", "missing_skills",
  "orphaned_deliverables", "underspecified_steps", "missing_tests",
]);
export type GapCategory = z.infer<typeof GapCategory>;

// ─── Step ──────────────────────────────────────────────────────────

/** A single concrete action within a unit. */
export const RoadmapStep = z.object({
  /** Step order within the unit. */
  number: z.number().int().positive(),
  /** What to do (imperative, concrete). */
  instruction: z.string().min(1),
  /** Specific tool calls to make (optional). */
  tool_calls: z.array(z.string()).default([]),
  /** How to verify this step succeeded (optional). */
  validation: z.string().optional(),
  /** Tips, warnings, edge cases (optional). */
  notes: z.string().optional(),
});
export type RoadmapStep = z.infer<typeof RoadmapStep>;

// ─── Deliverable ───────────────────────────────────────────────────

/** A file or artifact produced by a unit. */
export const RoadmapDeliverable = z.object({
  /** Relative file path from project root. */
  path: z.string().min(1),
  /** Classification of the deliverable. */
  type: DeliverableType,
  /** What this file does. */
  description: z.string().min(1),
  /** Estimated lines of code. */
  line_count_est: z.number().int().nonnegative().optional(),
  /** How it appears in MASTER.md (optional). */
  index_entry: z.string().optional(),
});
export type RoadmapDeliverable = z.infer<typeof RoadmapDeliverable>;

// ─── Tool Reference ────────────────────────────────────────────────

/** A reference to a PRISM tool call with action hint. */
export const ToolRef = z.object({
  /** Tool name, e.g. "prism_calc". */
  tool: z.string().min(1),
  /** Action name, e.g. "speed_feed". */
  action: z.string().optional(),
  /** Parameter hints. */
  params_hint: z.string().optional(),
});
export type ToolRef = z.infer<typeof ToolRef>;

// ─── Unit ──────────────────────────────────────────────────────────

/** An atomic work unit — the core building block of every roadmap. */
export const RoadmapUnit = z.object({
  /** Unique within roadmap, e.g. "P1-U01". */
  id: z.string().min(1),
  /** Global reference ID, e.g. "§RGS.P1.01". */
  rid: z.string().optional(),
  /** Human-readable title. */
  title: z.string().min(1),
  /** Parent phase ID. */
  phase: z.string().min(1),
  /** Execution order within phase. */
  sequence: z.number().int().nonnegative(),

  // ── Assignment ───
  /** Role code from role matrix (R1-R8). */
  role: RoleCode,
  /** Human-readable role name. */
  role_name: z.string().min(1),
  /** Model identifier or escalation chain. */
  model: ModelSpec,
  /** Effort level 0-100. */
  effort: z.number().int().min(0).max(100),
  /** Why this role/model/effort was chosen. */
  rationale: z.string().optional(),

  // ── Tools & Resources ───
  /** PRISM tools to call, with action + params hint. */
  tools: z.array(ToolRef).default([]),
  /** Skill IDs to load/reference. */
  skills: z.array(z.string()).default([]),
  /** Script paths to execute. */
  scripts: z.array(z.string()).default([]),
  /** Hooks that fire during this unit. */
  hooks: z.array(z.string()).default([]),
  /** PRISM features used (e.g. "Desktop Commander", "web_search"). */
  features: z.array(z.string()).default([]),
  /** Unit IDs that must complete before this one. */
  dependencies: z.array(z.string()).default([]),

  // ── Conditions ───
  /** Checklist items that must be true before starting. */
  entry_conditions: z.array(z.string()).default([]),
  /** Checklist items that must be true after completing. */
  exit_conditions: z.array(z.string()).default([]),
  /** What to do if the unit fails. */
  rollback: z.string().default("git checkout -- [files modified by this unit]"),

  // ── Execution ───
  /** Ordered list of concrete actions. */
  steps: z.array(RoadmapStep).default([]),
  /** Files/artifacts this unit produces. */
  deliverables: z.array(RoadmapDeliverable).default([]),
  /** Approximate token cost. */
  estimated_tokens: z.number().int().nonnegative().optional(),
  /** Approximate wall-clock time in minutes. */
  estimated_minutes: z.number().nonnegative().optional(),

  // ── Indexing Flags ───
  /** Whether deliverables go in MASTER.md. */
  index_in_master: z.boolean().default(false),
  /** Whether this unit produces a new skill. */
  creates_skill: z.boolean().default(false),
  /** Whether this unit produces a new script. */
  creates_script: z.boolean().default(false),
  /** Whether this unit produces a new hook. */
  creates_hook: z.boolean().default(false),
  /** Whether this unit produces a new slash command. */
  creates_command: z.boolean().default(false),
});
export type RoadmapUnit = z.infer<typeof RoadmapUnit>;

// ─── Gate ──────────────────────────────────────────────────────────

/** Phase-end quality gate specification. */
export const RoadmapGate = z.object({
  /** Minimum Omega score to pass (default 0.75, target 1.0). */
  omega_floor: z.number().min(0).max(1).default(0.75),
  /** Minimum safety score (default 0.70). */
  safety_floor: z.number().min(0).max(1).default(0.70),
  /** Whether Ralph loop validation is mandatory. */
  ralph_required: z.boolean().default(false),
  /** Minimum Ralph grade. */
  ralph_grade_floor: z.string().default("B"),
  /** Whether snapshot diff (anti-regression) is required. */
  anti_regression: z.boolean().default(true),
  /** Whether tests must pass. */
  test_required: z.boolean().default(true),
  /** Whether build must pass. */
  build_required: z.boolean().default(true),
  /** Whether to create a session checkpoint. */
  checkpoint: z.boolean().default(true),
  /** Whether to persist learnings. */
  learning_save: z.boolean().default(true),
  /** Additional validation steps. */
  custom_checks: z.array(z.string()).default([]),
});
export type RoadmapGate = z.infer<typeof RoadmapGate>;

// ─── Phase ─────────────────────────────────────────────────────────

/** A collection of units with a quality gate. */
export const RoadmapPhase = z.object({
  /** Phase identifier, e.g. "P1". */
  id: z.string().min(1),
  /** Human-readable title. */
  title: z.string().min(1),
  /** 1-2 sentence summary. */
  description: z.string().min(1),
  /** Estimated session range, e.g. "1-2". */
  sessions: z.string().default("1"),
  /** Dominant role for this phase. */
  primary_role: RoleCode,
  /** Dominant model for this phase. */
  primary_model: ModelSpec,
  /** Ordered list of atomic units. */
  units: z.array(RoadmapUnit).min(1),
  /** Phase-end quality gate. */
  gate: RoadmapGate,
  /** Whether to pause for scrutiny before execution. */
  scrutiny_checkpoint: z.boolean().default(false),
  /** What the scrutinizer should focus on in this phase. */
  scrutiny_focus: z.array(z.string()).default([]),
});
export type RoadmapPhase = z.infer<typeof RoadmapPhase>;

// ─── Scrutiny ──────────────────────────────────────────────────────

/** A single gap found during scrutinization. */
export const Gap = z.object({
  /** Gap identifier. */
  id: z.string().min(1),
  /** Which category this gap belongs to. */
  category: GapCategory,
  /** Severity level. */
  severity: GapSeverity,
  /** Which unit or phase is affected. */
  location: z.string().min(1),
  /** Human-readable description of the gap. */
  description: z.string().min(1),
  /** Suggested fix. */
  suggestion: z.string().optional(),
  /** Whether this gap has been resolved. */
  resolved: z.boolean().default(false),
  /** Which pass resolved it. */
  resolved_in_pass: z.number().int().optional(),
});
export type Gap = z.infer<typeof Gap>;

/** A single scrutinization pass result. */
export const ScrutinyPass = z.object({
  /** Pass number (1-based). */
  pass_number: z.number().int().positive(),
  /** ISO timestamp when pass started. */
  started_at: z.string(),
  /** ISO timestamp when pass ended. */
  ended_at: z.string().optional(),
  /** Gaps found in this pass. */
  gaps_found: z.array(Gap),
  /** Computed score: 1.0 - (3*CRITICAL + 2*MAJOR + 1*MINOR) / total_checks. */
  score: z.number().min(0).max(1),
  /** Total checks performed. */
  total_checks: z.number().int().nonnegative(),
  /** Whether convergence was reached after this pass. */
  converged: z.boolean().default(false),
});
export type ScrutinyPass = z.infer<typeof ScrutinyPass>;

/** Configuration for the adaptive scrutiny system. */
export const ScrutinyConfig = z.object({
  /** "adaptive" (default) or "fixed". */
  pass_mode: z.enum(["adaptive", "fixed"]).default("adaptive"),
  /** Minimum passes before convergence check. */
  min_passes: z.number().int().positive().default(3),
  /** Hard safety cap to prevent infinite loops. */
  max_passes: z.number().int().positive().default(7),
  /** Stop condition, e.g. "delta < 2". */
  convergence_rule: z.string().default("delta < 2"),
  /** Escalation rule for persistent critical gaps. */
  escalation_rule: z.string().default("if pass 4+ finds CRITICAL, flag for human review"),
  /** Model for scrutinization. */
  scrutinizer_model: ModelSpec.default("opus-4.6"),
  /** Effort level for scrutinization. */
  scrutinizer_effort: z.number().int().min(0).max(100).default(90),
  /** What categories to check. */
  gap_categories: z.array(GapCategory).default([
    "missing_tools", "missing_deps", "missing_exit_conditions",
    "missing_rollback", "sequence_errors", "role_mismatch",
    "effort_mismatch", "missing_indexing", "missing_skills",
    "orphaned_deliverables", "underspecified_steps", "missing_tests",
  ]),
  /** Stop improving when score exceeds this. */
  improvement_threshold: z.number().min(0).max(1).default(0.92),
});
export type ScrutinyConfig = z.infer<typeof ScrutinyConfig>;

/** Full scrutiny audit trail for a roadmap. */
export const ScrutinyLog = z.object({
  /** Which roadmap was scrutinized. */
  roadmap_id: z.string().min(1),
  /** All passes performed. */
  passes: z.array(ScrutinyPass),
  /** Final composite score. */
  final_score: z.number().min(0).max(1),
  /** Whether the roadmap passed scrutiny. */
  passed: z.boolean(),
  /** All unresolved gaps (if any). */
  unresolved_gaps: z.array(Gap).default([]),
});
export type ScrutinyLog = z.infer<typeof ScrutinyLog>;

// ─── Envelope Metadata ─────────────────────────────────────────────

/** A role used in this roadmap. */
export const RoleSpec = z.object({
  code: RoleCode,
  name: z.string().min(1),
  model: ModelSpec,
  effort: z.number().int().min(0).max(100),
  description: z.string().optional(),
});
export type RoleSpec = z.infer<typeof RoleSpec>;

/** A tool used in this roadmap and which phases use it. */
export const ToolMapEntry = z.object({
  tool: z.string().min(1),
  phases: z.array(z.string()),
  purpose: z.string().optional(),
});
export type ToolMapEntry = z.infer<typeof ToolMapEntry>;

/** An existing asset being leveraged by this roadmap. */
export const LeverageEntry = z.object({
  asset: z.string().min(1),
  type: z.string().min(1),
  count: z.number().int().nonnegative().optional(),
  usage: z.string().optional(),
});
export type LeverageEntry = z.infer<typeof LeverageEntry>;

// ─── Roadmap Envelope ──────────────────────────────────────────────

/** Top-level roadmap container — the root schema. */
export const RoadmapEnvelope = z.object({
  /** Unique roadmap identifier, e.g. "RGS". */
  id: z.string().min(1),
  /** Semver version string. */
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Must be semver"),
  /** Human-readable title. */
  title: z.string().min(1),
  /** The original request/brief that triggered generation. */
  brief: z.string().min(1),
  /** ISO timestamp of creation. */
  created_at: z.string(),
  /** Who created this roadmap. */
  created_by: z.string().default("claude-opus-4.6"),

  // ── Structure ───
  /** Ordered list of phases. */
  phases: z.array(RoadmapPhase).min(1),
  /** Sum of all units across all phases. */
  total_units: z.number().int().positive(),
  /** Estimated session range, e.g. "10-16". */
  total_sessions: z.string(),
  /** ASCII or mermaid dependency visualization. */
  dependency_graph: z.string().optional(),

  // ── Metadata ───
  /** All roles used in this roadmap. */
  role_matrix: z.array(RoleSpec).default([]),
  /** All tools used and where. */
  tool_map: z.array(ToolMapEntry).default([]),
  /** Flat list of all deliverables across all units. */
  deliverables_index: z.array(RoadmapDeliverable).default([]),
  /** Existing assets being reused. */
  existing_leverage: z.array(LeverageEntry).default([]),

  // ── Scrutinization ───
  /** How scrutinization works for this roadmap. */
  scrutiny_config: ScrutinyConfig.default({}),
  /** Path to scrutiny-log.json. */
  scrutiny_log: z.string().optional(),

  // ── Position Tracking ───
  /** Path to position.json. */
  position_file: z.string().optional(),
  /** Path to state/{roadmap-id}/. */
  state_dir: z.string().optional(),
});
export type RoadmapEnvelope = z.infer<typeof RoadmapEnvelope>;

// ─── Factory Functions ─────────────────────────────────────────────

/** Create a minimal valid unit with sensible defaults. */
export function createEmptyUnit(
  id: string,
  title: string,
  phase: string,
  sequence: number = 0,
): RoadmapUnit {
  return {
    id,
    title,
    phase,
    sequence,
    role: "R2",
    role_name: "Implementer",
    model: "sonnet-4.6",
    effort: 80,
    tools: [],
    skills: [],
    scripts: [],
    hooks: [],
    features: [],
    dependencies: [],
    entry_conditions: [],
    exit_conditions: [],
    rollback: "git checkout -- [files modified by this unit]",
    steps: [],
    deliverables: [],
    index_in_master: false,
    creates_skill: false,
    creates_script: false,
    creates_hook: false,
    creates_command: false,
  };
}

/** Create a minimal valid phase with sensible defaults. */
export function createEmptyPhase(id: string, title: string): RoadmapPhase {
  return {
    id,
    title,
    description: title,
    sessions: "1",
    primary_role: "R2",
    primary_model: "sonnet-4.6",
    units: [createEmptyUnit(`${id}-U01`, "Initial unit", id, 0)],
    gate: {
      omega_floor: 1.0,
      safety_floor: 0.70,
      ralph_required: false,
      ralph_grade_floor: "B",
      anti_regression: true,
      test_required: true,
      build_required: true,
      checkpoint: true,
      learning_save: true,
      custom_checks: [],
    },
    scrutiny_checkpoint: false,
    scrutiny_focus: [],
  };
}

// ─── Parse / Validate Helpers ──────────────────────────────────────

/** Parse and validate a roadmap JSON object. Returns the validated envelope or throws. */
export function parseRoadmap(data: unknown): RoadmapEnvelope {
  return RoadmapEnvelope.parse(data);
}

/** Validate a roadmap JSON object. Returns { success, data?, error? }. */
export function validateRoadmap(data: unknown): {
  success: boolean;
  data?: RoadmapEnvelope;
  error?: z.ZodError;
} {
  const result = RoadmapEnvelope.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/** Validate a single unit. Returns { success, data?, error? }. */
export function validateUnit(data: unknown): {
  success: boolean;
  data?: RoadmapUnit;
  error?: z.ZodError;
} {
  const result = RoadmapUnit.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/** Validate a single phase. Returns { success, data?, error? }. */
export function validatePhase(data: unknown): {
  success: boolean;
  data?: RoadmapPhase;
  error?: z.ZodError;
} {
  const result = RoadmapPhase.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
