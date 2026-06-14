/**
 * Domain AGI Contract — INFRA-AGI-ROUTER-MS2/P0-U01
 * ==================================================
 *
 * Unified `orchestrate(intent)` contract every domain AGI must implement.
 * Replaces the opaque-per-domain `Record<string, unknown>` bodies in
 * `CrossProcessAIBridge.AIOrchestrateRequest` with a structured intent/result
 * pair the router (`ProcessIntelligenceRouterEngine` — U05) dispatches
 * uniformly across mill/lathe/wedm without per-domain branching.
 *
 * Consumers (U02-U04 will adapt to this contract):
 *   - MillingAGIMasterEngine.orchestrate(intent: DomainAGIIntent): DomainAGIResult
 *   - LatheAGIKnowledgeUnificationEngine.orchestrate(...)
 *   - WireEDMAGIOrchestrator.orchestrate(...)
 *
 * Router (U05):
 *   - ProcessIntelligenceRouterEngine classifies `intent.domain` and dispatches.
 *   - Pipeline-level `confidence` is rolled up from per-decision confidences
 *     by the router (rollup algorithm — joint-probability for serial,
 *     max-of-parallel — is router-internal; see ProcessIntelligenceRouterEngine
 *     for the canonical implementation. This contract only requires the rolled-
 *     up scalar in [0,1]; it does not carry the per-decision dependency
 *     graph the router needs to compute it).
 *
 * @see CrossProcessAIBridge — the prior unified-bridge with opaque-per-domain
 *      bodies (`AIOrchestrateRequest.{mill,lathe,wedm}_request: Record<string,
 *      unknown>`). U05 will explicitly supersede or wrap that bridge; until
 *      that work lands the two contracts CO-EXIST and downstream consumers
 *      may see both surfaces.
 *
 * Outcome events flow through the canonical OutcomeCaptureBus (re-uses
 * OutcomeEventSchema 1.1.0 — `cross_process_decision` + `consensus_audit_id`
 * fields were added in INFRA-NEURAL-LEDGER-MS1/P0-U01 specifically to support
 * this contract).
 *
 * @module schemas/domainAGIContract
 * @milestone INFRA-AGI-ROUTER-MS2/P0-U01
 * @version 1.0.0
 *
 * ─── DESIGN NOTES ──────────────────────────────────────────────────────────
 *
 * Why `domain` is explicit (extends the literal spec):
 *   The milestone spec lists action names as bare verbs (roughing, finishing,
 *   turning, ...). Several action names appear in multiple domains (e.g., a
 *   "drilling" action is valid for both mill and lathe). Adding an explicit
 *   `domain` field lets the router classify without parsing action enums and
 *   prevents misroute when action names overlap across domains. Domain ∈
 *   {mill, lathe, wedm} matches the three domains the router dispatches to.
 *
 * Why `constraints` is required (even when empty):
 *   Forces every intent to acknowledge the constraint axis. A job with no
 *   special constraints passes `{}`; a job with cycle/cost/safety floors
 *   populates the matching keys. This catches "I forgot to think about
 *   constraints" before the router dispatches.
 *
 * Why `outcomes[]` reuses OutcomeEventSchema:
 *   Single source of truth. The OutcomeCaptureBus (U-LEARN-01) already owns
 *   the event envelope; re-defining it here would fork the schema and break
 *   downstream consumers (PhysicsOutcomeCalibrator, PolicyExperienceLedger,
 *   CrossProcessNeuralLearningEngine). Anti-drift per the millActionSchemas
 *   "re-use engine's exported schema as the single source of truth" pattern.
 *
 * Why `confidence` is a single roll-up (not per-decision):
 *   Per-decision confidences live in `decisions[].confidence`. The top-level
 *   `confidence` is the router's joint-probability rollup so consumers can
 *   gate at the pipeline level (e.g., "reject if pipeline confidence < 0.85").
 * ───────────────────────────────────────────────────────────────────────────
 */

import { z } from "zod";

// SINGLE SOURCE OF TRUTH for outcome events. Re-using the canonical
// OutcomeEventSchema means new outcome kinds + context fields shipped by
// OutcomeCaptureBus 1.1.0 (cross_process_decision, consensus_audit_id, etc.)
// flow through this contract automatically without a schema bump here.
import { OutcomeEventSchema } from "./outcomeEventSchema.js";

// ─── Version + domain enums ──────────────────────────────────────────────────

/**
 * Schema version. Producers MUST emit this exact literal. Bumps follow the
 * additive-only protocol (1.0.0 → 1.1.0 for additive, 2.0.0 for breaking).
 */
export const DOMAIN_AGI_CONTRACT_VERSION = "1.0.0" as const;

/** Canonical domain set the router dispatches to. */
export const DomainKind = z
  .enum(["mill", "lathe", "wedm"])
  .describe("Which domain AGI handles this intent. Router uses this to classify without parsing action enums.");

export type DomainKindT = z.infer<typeof DomainKind>;

// ─── Per-domain action enums ─────────────────────────────────────────────────

/**
 * Mill domain actions. Covers the 3 intent types named in U02 acceptance
 * (roughing, finishing, drilling) plus reasonable headroom for adjacent
 * operations the U02 adapter will surface.
 */
export const MillAction = z
  .enum([
    "roughing",
    "finishing",
    "drilling",
    "boring",
    "tapping",
    "thread_milling",
    "facing",
    "contouring",
    "pocketing",
    "engraving",
  ])
  .describe("Mill domain action verb. roughing/finishing/drilling are the U02 acceptance trio.");

/**
 * Lathe domain actions. Covers the 3 intent types named in U03 acceptance
 * (turning, threading, parting) plus adjacent turn-center operations.
 */
export const LatheAction = z
  .enum([
    "turning",
    "threading",
    "parting",
    "facing",
    "grooving",
    "boring",
    "drilling",
    "knurling",
    "chamfering",
  ])
  .describe("Lathe domain action verb. turning/threading/parting are the U03 acceptance trio.");

/**
 * WEDM domain actions. Covers the 3 intent types named in U04 acceptance
 * (rough_cut, skim_pass, taper_cut). WEDM actions are tightly bounded — the
 * domain's operation taxonomy is small by physical constraint.
 */
export const WedmAction = z
  .enum(["rough_cut", "skim_pass", "taper_cut", "start_hole", "no_core_cut", "corner_strategy"])
  .describe("WEDM domain action verb. rough_cut/skim_pass/taper_cut are the U04 acceptance trio.");

export type MillActionT = z.infer<typeof MillAction>;
export type LatheActionT = z.infer<typeof LatheAction>;
export type WedmActionT = z.infer<typeof WedmAction>;

/**
 * Union of all domain action verbs. The intent's `domain` field disambiguates
 * cross-domain overlaps (e.g., "drilling" is valid for mill AND lathe).
 */
export const DomainAction = z
  .union([MillAction, LatheAction, WedmAction])
  .describe("Action verb — domain-disambiguated by the intent's `domain` field.");

export type DomainActionT = z.infer<typeof DomainAction>;

// ─── Shared sub-schemas ──────────────────────────────────────────────────────

/**
 * Optional blueprint reference. Either a file path (relative to repo root) or
 * a content hash. Producers SHOULD set both when known so the router can use
 * the hash for caching and the path for human-readable audit trails.
 */
export const BlueprintRefSchema = z
  .object({
    path: z.string().min(1).optional().describe("Filesystem path to blueprint artifact (PDF, DXF, STEP, etc.)."),
    sha256: z.string().regex(/^[0-9a-f]{64}$/).optional().describe("SHA-256 hex digest of blueprint contents for caching/audit."),
    notes: z.string().optional().describe("Free-form annotation (e.g., revision letter, customer ID)."),
  })
  .refine((b) => Boolean(b.path) || Boolean(b.sha256), {
    message: "BlueprintRef requires at least one of: path, sha256",
  })
  .describe("Pointer to the source blueprint. Producers set path OR sha256 (both preferred).");

/**
 * Feature reference. Describes one geometric feature the domain AGI must
 * process (hole, pocket, slot, profile, etc.). `kind` is intentionally a
 * free-form string — feature taxonomy lives in domain-specific feature
 * registries (MillFeatureTaxonomy, LatheFeatureTaxonomy, WEDMFeatureTaxonomy)
 * and forcing a closed enum here would create a 3-way coupling the router
 * doesn't need.
 */
export const FeatureRefSchema = z
  .object({
    id: z.string().min(1).describe("Stable feature identifier within this intent (e.g., 'F-001')."),
    kind: z.string().min(1).describe("Feature type token — domain-specific (e.g., 'pocket', 'bore_groove', 'taper_profile')."),
    dimensions: z.record(z.string(), z.number()).optional().describe("Numeric feature dimensions, units in the value names (e.g., {diameter_mm: 12.5, depth_mm: 30})."),
    tolerance_um: z.number().nonnegative().optional().describe("Critical tolerance in micrometers (if applicable)."),
    surface_finish_ra_um: z.number().nonnegative().optional().describe("Surface finish target Ra in micrometers (if applicable)."),
  })
  .passthrough()
  .describe("One geometric feature the domain AGI must process. passthrough() allows domain-specific extras.");

/** Machine reference — minimal identifier the domain AGI can resolve. */
export const MachineRefSchema = z
  .object({
    id: z.string().min(1).describe("Machine identifier (e.g., 'JM-DIE-OKUMA-2SP', 'HAAS-VF2-001')."),
    rigidity_tier: z.enum(["light", "medium", "heavy", "ultra"]).optional().describe("Rigidity tier classification."),
    controller: z.string().optional().describe("Controller dialect (e.g., 'Fanuc 30i', 'Okuma OSP-P300', 'Sodick LN').") ,
  })
  .passthrough()
  .describe("Pointer to a specific machine. passthrough() allows AGI-specific extras (fixture state, last-known thermal offset, etc.).");

/** Job-level constraints the domain AGI must honor. */
export const ConstraintsSchema = z
  .object({
    cycle_time_max_min: z.number().positive().optional().describe("Maximum allowed cycle time in minutes."),
    cost_max_usd: z.number().nonnegative().optional().describe("Maximum allowed job cost in USD."),
    safety_floor: z.number().min(0).max(1).optional().describe("Minimum required Omega safety score S(x) ∈ [0, 1]."),
    surface_finish_max_ra_um: z.number().nonnegative().optional().describe("Maximum allowed surface finish Ra in micrometers."),
    tolerance_class: z.enum(["fine", "medium", "coarse", "very_coarse"]).optional().describe("ISO 2768 tolerance class."),
    tool_life_min_min: z.number().positive().optional().describe("Minimum acceptable tool life in minutes."),
  })
  .passthrough()
  .describe("Job-level constraints (caps, floors, classes). Empty {} = no special constraints.");

// ─── Result sub-schemas ──────────────────────────────────────────────────────

/** Kinds of decision a domain AGI may emit. */
export const DecisionKind = z
  .enum(["tool", "strategy", "feed", "route", "param", "safety", "fixture", "coolant"])
  .describe("Decision category. tool/strategy/feed are the three consensus-gated picks per U02 acceptance.");

export type DecisionKindT = z.infer<typeof DecisionKind>;

/** One decision emitted by the domain AGI. */
export const DecisionSchema = z
  .object({
    kind: DecisionKind,
    value: z.unknown().describe("Decision payload — shape depends on `kind` (e.g., tool name, strategy enum, feedrate number)."),
    confidence: z.number().min(0).max(1).describe("Per-decision confidence in [0, 1]. Used by router for pipeline-level rollup."),
    source: z.string().min(1).describe("Engine or model that produced this decision (e.g., 'KienzleForceModel', 'consensus_decide:gpt+ollama+gemini')."),
    rationale: z.string().optional().describe("Short human-readable explanation."),
    alternatives: z
      .array(
        z.object({
          value: z.unknown(),
          confidence: z.number().min(0).max(1),
          rejected_reason: z.string().optional(),
        }),
      )
      .optional()
      .describe("Alternative choices the AGI considered but did not select."),
    consensus_audit_id: z.string().optional().describe("Pointer into consensus-decisions.jsonl when consensusRequired=true triggered prism_ai:consensus_decide."),
  })
  .describe("One decision emitted by a domain AGI for a single pick (tool selection, strategy choice, feed override, etc.).");

/** Optional structured simulation summary. */
export const SimResultSchema = z
  .object({
    cycle_time_min: z.number().nonnegative().describe("Predicted cycle time in minutes."),
    mrr_cm3_per_min: z.number().nonnegative().optional().describe("Material removal rate in cm³/min."),
    peak_power_kw: z.number().nonnegative().optional().describe("Peak spindle power demand in kW."),
    peak_force_n: z.number().nonnegative().optional().describe("Peak cutting force in Newtons."),
    tool_life_used_pct: z.number().min(0).max(100).optional().describe("Percent of tool life consumed by this job."),
    warnings: z.array(z.string()).default([]).describe("Sim-level warnings (e.g., near-chatter RPM, marginal coolant flow)."),
  })
  .passthrough()
  .describe("Structured simulation summary. passthrough() allows domain-specific metrics (WEDM wire-break risk, lathe surface texture, etc.).");

// ─── Main schemas ────────────────────────────────────────────────────────────

/**
 * The single contract every domain AGI's orchestrate(intent) accepts.
 *
 * @example
 * const intent: DomainAGIIntent = {
 *   schemaVersion: "1.0.0",
 *   domain: "mill",
 *   action: "roughing",
 *   features: [{ id: "F-001", kind: "pocket", dimensions: { length_mm: 100, width_mm: 50, depth_mm: 20 } }],
 *   material: "1018-steel",
 *   constraints: {},
 *   consensusRequired: false,
 * };
 */
export const DomainAGIIntentSchema = z
  .object({
    schemaVersion: z.literal(DOMAIN_AGI_CONTRACT_VERSION).describe("Schema version — must be exactly '1.0.0' for this contract revision."),
    domain: DomainKind,
    action: DomainAction,
    blueprint: BlueprintRefSchema.optional(),
    features: z.array(FeatureRefSchema).default([]).describe("Geometric features the domain AGI must process."),
    material: z.string().min(1).describe("Workpiece material designation (e.g., '1018-steel', 'Ti-6Al-4V', 'AISI-316L')."),
    machine: MachineRefSchema.optional(),
    constraints: ConstraintsSchema.describe("Job-level constraints — pass {} for no special constraints."),
    consensusRequired: z.boolean().default(false).describe("When true, domain AGI MUST route tool/strategy/feed picks through prism_ai:consensus_decide and surface the consensus_audit_id on each decision. Defaults to false so the common non-consensus path doesn't require boilerplate."),
  })
  .superRefine((intent, ctx) => {
    // Cross-field: action must belong to the named domain.
    // (No explicit Record<...> type — Zod v4 enum types are object-shape, not
    // readonly tuple. Letting TS infer keeps this aligned with whatever Zod
    // version is installed.)
    const validators = {
      mill: MillAction,
      lathe: LatheAction,
      wedm: WedmAction,
    } as const;
    const validator = validators[intent.domain];
    // Defensive guard (per-file scrutiny arm B P0#2): if the base parse is ever
    // refactored to .passthrough() and `domain` skips enum validation, this
    // lookup could return undefined. Fail soft — domain enum already emits its
    // own issue at parse time so we don't need a duplicate here.
    if (!validator) return;
    const parsed = validator.safeParse(intent.action);
    if (!parsed.success) {
      const validActions = actionsForDomain(intent.domain).join(", ");
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["action"],
        message: `Action '${intent.action}' is not valid for domain '${intent.domain}'. Valid actions: ${validActions}.`,
      });
    }
  })
  .describe("Unified intent contract dispatched by ProcessIntelligenceRouterEngine.orchestrate to the named domain AGI.");

export type DomainAGIIntent = z.infer<typeof DomainAGIIntentSchema>;

/**
 * The unified result every domain AGI's orchestrate returns.
 *
 * @example
 * const result: DomainAGIResult = {
 *   schemaVersion: "1.0.0",
 *   success: true,
 *   decisions: [{ kind: "tool", value: "endmill-12mm-4flute", confidence: 0.92, source: "KienzleForceModel" }],
 *   confidence: 0.88,
 *   outcomes: [],
 * };
 */
export const DomainAGIResultSchema = z
  .object({
    schemaVersion: z.literal(DOMAIN_AGI_CONTRACT_VERSION).describe("Schema version — must match the producing contract revision."),
    success: z.boolean().describe("Whether the AGI produced a usable result. false → consult `error` and `warnings`."),
    decisions: z.array(DecisionSchema).default([]).describe("All decisions the AGI made during orchestration (tool, strategy, feed, route, etc.)."),
    gcode: z.string().optional().describe("Post-processed G-code program. Optional because some intents are decisions-only (dry-run, consult, classify)."),
    simResult: SimResultSchema.optional(),
    confidence: z.number().min(0).max(1).describe("Pipeline-level confidence rollup (joint probability of serial decisions, max of parallel). Router computes this."),
    outcomes: z.array(OutcomeEventSchema).default([]).describe("Outcome events emitted to the OutcomeCaptureBus during this orchestration."),
    error: z
      .object({
        code: z.string().describe("Machine-readable error code (e.g., 'INFEASIBLE_GEOMETRY', 'NO_TOOL_AVAILABLE', 'SAFETY_FLOOR_VIOLATED')."),
        message: z.string().describe("Human-readable error explanation."),
        stage: z.string().optional().describe("Pipeline stage where the failure occurred."),
      })
      .optional()
      .describe("Populated when success=false."),
    warnings: z.array(z.string()).default([]).describe("Non-fatal warnings the operator should review (e.g., 'tool life marginal', 'chatter risk above 8000 RPM')."),
  })
  .superRefine((result, ctx) => {
    // success=false must populate error
    if (!result.success && !result.error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["error"],
        message: "DomainAGIResult with success=false must populate the `error` field.",
      });
    }
  })
  .describe("Unified result contract returned by every domain AGI's orchestrate(intent) call.");

export type DomainAGIResult = z.infer<typeof DomainAGIResultSchema>;

// ─── Helper utilities ────────────────────────────────────────────────────────

/**
 * Map a domain action to its owning domain. Returns null for unknown actions
 * OR for actions ambiguous across multiple domains (lets callers decide whether
 * to error or fall back to keyword classification on the full intent).
 *
 * Ambiguity surface (mill ↔ lathe only — wedm actions are domain-orthogonal):
 *   - "drilling" — valid in both MillAction + LatheAction
 *   - "boring"   — valid in both
 *   - "facing"   — valid in both
 * Other adapter authors adding new actions to MillAction/LatheAction must
 * audit this overlap set; an ambiguous-action helper that drops to null is
 * the safer default than a guessed dispatch.
 *
 * @param action - Domain action verb to classify
 * @returns The owning DomainKind, or null if the action is unknown OR ambiguous across mill+lathe
 */
export function domainForAction(action: string): DomainKindT | null {
  if (MillAction.safeParse(action).success && !LatheAction.safeParse(action).success) return "mill";
  if (LatheAction.safeParse(action).success && !MillAction.safeParse(action).success) return "lathe";
  if (WedmAction.safeParse(action).success) return "wedm";
  return null;
}

/**
 * List the valid actions for a given domain. Useful for router error messages
 * and for U02-U04 adapters that need to enumerate their accepted action set.
 *
 * @param domain - Domain to query
 * @returns Readonly array of valid action strings for that domain
 */
export function actionsForDomain(domain: DomainKindT): readonly string[] {
  switch (domain) {
    case "mill":
      return MillAction.options;
    case "lathe":
      return LatheAction.options;
    case "wedm":
      return WedmAction.options;
  }
}
