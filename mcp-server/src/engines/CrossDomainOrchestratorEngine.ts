/**
 * CrossDomainOrchestratorEngine — ORCH-MULTIDOMAIN-MS11
 *
 * Routes a single manufacturing job spec across multiple PRISM domain
 * pipelines (mill / lathe / wedm / sinker / grinder / laser / waterjet) when
 * the part needs features that no single domain can produce alone. Examples:
 *
 *   - Shaft with turned OD + milled flats → lathe ▸ mill (split-setup handoff)
 *   - Die plate with milled pocket + EDM corner detail → mill ▸ wedm
 *   - Tool insert with ground OD + EDM contour → grinder ▸ wedm
 *
 * The engine does NOT execute the per-domain pipelines — those live in
 * LathePrintToProgramEngine, MillingAGIMasterEngine, WireEDMAGIOrchestrator
 * etc. This engine produces the cross-domain PLAN: which features go to
 * which domain, in what order, with what handoff (re-chuck / fixture
 * change / coordinate transform / inspection gate).
 *
 * Deliberately pure (no I/O, no MCP imports) — engines call other engines
 * via static methods only per project rules. Consensus on routing is an
 * optional caller seam (matches the LATHE-P2P-CONSENSUS-MS4 pattern).
 *
 * @milestone ORCH-MULTIDOMAIN-MS11
 * @version 1.0.0
 */

import { randomUUID } from "node:crypto";
import { z } from "zod";

// ============================================================================
// DOMAIN INVENTORY
// ============================================================================

export const DomainKindSchema = z.enum([
  "mill",
  "lathe",
  "wedm",
  "sinker_edm",
  "grinder",
  "laser",
  "waterjet",
  "five_axis",
  "mill_turn",
]);
export type DomainKind = z.infer<typeof DomainKindSchema>;

/**
 * Feature-type → domain capability map. A feature can list >1 domain when it
 * could be made on either (chamfer_od on a lathe OR a mill); the ordering
 * within the array IS the preference (first = cheapest / most-natural).
 *
 * Source-of-truth coverage: derived from the per-domain capability registries
 * (LatheFeatureRecognition + MillFeatureRecognition + WireEDMFeatureCatalog).
 * Stays surface-level here so the orchestrator doesn't drift from the per-
 * domain authoritative engines.
 */
export const FEATURE_DOMAIN_MAP: Record<string, DomainKind[]> = {
  // Lathe-canonical features (rotational)
  od_turn: ["lathe", "mill_turn"],
  face: ["lathe", "mill_turn", "mill"],
  id_bore: ["lathe", "mill_turn"],
  thread_external: ["lathe", "mill_turn"],
  thread_internal: ["lathe", "mill_turn"],
  groove_od: ["lathe", "mill_turn"],
  groove_id: ["lathe", "mill_turn"],
  groove_face: ["lathe", "mill_turn"],
  center_drill: ["lathe", "mill"],
  taper_od: ["lathe", "mill_turn"],
  taper_id: ["lathe", "mill_turn"],
  chamfer_od: ["lathe", "mill_turn", "mill"],
  knurl: ["lathe", "mill_turn"],
  // Drilling — almost any domain
  drill: ["mill", "lathe", "mill_turn", "five_axis"],
  ream: ["mill", "lathe", "mill_turn", "five_axis"],
  tap: ["mill", "lathe", "mill_turn", "five_axis"],
  // Mill-canonical features (prismatic)
  pocket: ["mill", "five_axis", "mill_turn"],
  slot: ["mill", "five_axis", "mill_turn"],
  contour: ["mill", "five_axis", "mill_turn"],
  flat: ["mill", "five_axis", "mill_turn"],
  step: ["mill", "five_axis", "mill_turn"],
  // EDM-canonical (sharp internal corners, deep narrow, exotic materials)
  edm_contour: ["wedm"],
  edm_corner: ["wedm"],
  edm_punch: ["wedm"],
  sinker_cavity: ["sinker_edm"],
  rib_thin: ["sinker_edm", "wedm"],
  // Grinder-canonical (precision finishing)
  cylindrical_grind: ["grinder"],
  surface_grind: ["grinder"],
  // Laser / waterjet (sheet cuts)
  laser_cut: ["laser"],
  waterjet_cut: ["waterjet"],
};

/**
 * Domain handoff costs (seconds). Domain pair (A → B) carries a switching
 * cost that captures the average shop-floor reality (load/unload time +
 * fixture change + inspection gate). Symmetric — A→B and B→A are equal here;
 * future MS could make them asymmetric (mill→wedm cheaper than wedm→mill
 * because the EDM operator typically inspects first).
 */
const HANDOFF_COST_SEC: Record<string, number> = {
  // Same-machine — cheapest (just tool change)
  "mill:mill_turn": 60,
  "lathe:mill_turn": 60,
  "mill_turn:mill": 60,
  "mill_turn:lathe": 60,
  // Lathe ↔ mill — re-chuck on the mill
  "lathe:mill": 600,
  "mill:lathe": 600,
  // EDM handoffs — slow (separate machine, fixture)
  "mill:wedm": 1200,
  "wedm:mill": 1200,
  "lathe:wedm": 1500,
  "wedm:lathe": 1500,
  // Grinder handoffs — slow + inspection gate
  "mill:grinder": 1800,
  "grinder:mill": 1800,
  "lathe:grinder": 1800,
  "grinder:lathe": 1800,
  // Default
  default: 900,
};

function handoffCost(a: DomainKind, b: DomainKind): number {
  if (a === b) return 0;
  return HANDOFF_COST_SEC[`${a}:${b}`] ?? HANDOFF_COST_SEC.default;
}

// ============================================================================
// SCHEMAS
// ============================================================================

export const FeatureRefSchema = z.object({
  id: z.string(),
  type: z.string(),
  /** Optional per-feature domain override (operator pin). */
  domain_pin: DomainKindSchema.optional(),
});
export type FeatureRef = z.infer<typeof FeatureRefSchema>;

export const DomainSegmentSchema = z.object({
  segment_index: z.number().int().min(0),
  domain: DomainKindSchema,
  features: z.array(FeatureRefSchema).min(1),
  setup_id: z.string(),
  estimated_time_sec: z.number().min(0),
  handoff_from_prior_sec: z.number().min(0),
});
export type DomainSegment = z.infer<typeof DomainSegmentSchema>;

export const OrchestrationPlanSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  plan_id: z.string(),
  job_id: z.string(),
  segments: z.array(DomainSegmentSchema).min(1),
  total_domains: z.number().int().min(1),
  total_segments: z.number().int().min(1),
  total_handoff_cost_sec: z.number().min(0),
  estimated_total_time_sec: z.number().min(0),
  unresolved_features: z.array(z.object({
    feature_id: z.string(),
    reason: z.string(),
  })),
  warnings: z.array(z.string()),
  timestamp: z.string(),
});
export type OrchestrationPlan = z.infer<typeof OrchestrationPlanSchema>;

export const OrchestrationInputSchema = z.object({
  features: z.array(FeatureRefSchema).min(1),
  /** Optional preferred-domain ordering when ≥1 domain is feasible. */
  preferred_domains: z.array(DomainSegmentSchema.shape.domain).optional(),
  /** Per-feature time estimate (seconds). Falls back to a 30-second default when omitted. */
  feature_time_estimates_sec: z.record(z.string(), z.number().min(0)).optional(),
  /** Caller-supplied job id for cross-stage linkage. */
  job_id: z.string().optional(),
});
export type OrchestrationInput = z.infer<typeof OrchestrationInputSchema>;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Plan a multi-domain manufacturing job.
 *
 * Algorithm (deterministic, no consensus by default):
 *   1. For each feature, pick the lowest-priority domain (operator pin >
 *      `preferred_domains[]` order > FEATURE_DOMAIN_MAP first entry).
 *   2. Group consecutive features in the input order that share a domain
 *      into one segment. Compute handoff cost from the prior segment.
 *   3. Sum the segment times + handoff costs for the total.
 *   4. Flag any feature with no domain match in `unresolved_features[]`.
 *
 * Pure function — no I/O, no consensus, no side effects.
 *
 * @param input feature set + optional preferences
 * @returns orchestration plan with per-segment breakdown
 */
function planJob(input: OrchestrationInput): OrchestrationPlan {
  const validated = OrchestrationInputSchema.parse(input);
  const features = validated.features;
  const timeMap = validated.feature_time_estimates_sec ?? {};
  const jobId = validated.job_id ?? randomUUID();
  const planId = randomUUID();

  const unresolved: Array<{ feature_id: string; reason: string }> = [];
  const warnings: string[] = [];

  // Step 1 — resolve a domain per feature.
  const featureDomains: Array<{ feature: FeatureRef; domain: DomainKind | null }> = [];
  for (const f of features) {
    if (f.domain_pin) {
      featureDomains.push({ feature: f, domain: f.domain_pin });
      continue;
    }
    const candidates = FEATURE_DOMAIN_MAP[f.type] ?? [];
    if (candidates.length === 0) {
      featureDomains.push({ feature: f, domain: null });
      unresolved.push({
        feature_id: f.id,
        reason: `Unknown feature type '${f.type}' — no domain in FEATURE_DOMAIN_MAP`,
      });
      continue;
    }
    // Honor caller's preferred_domains[] ORDER (first preferred-AND-feasible wins),
    // else fall back to catalog's first entry.
    const prefList = validated.preferred_domains ?? [];
    const preferredHit = prefList.find(p => candidates.includes(p));
    const pick = preferredHit ?? candidates[0];
    featureDomains.push({ feature: f, domain: pick });
  }

  if (featureDomains.every(fd => fd.domain === null)) {
    warnings.push("All features unresolved — no orchestration plan producible.");
  }

  // Step 2 — group consecutive same-domain features into segments.
  const resolved = featureDomains.filter(fd => fd.domain !== null) as Array<{
    feature: FeatureRef;
    domain: DomainKind;
  }>;

  const segments: DomainSegment[] = [];
  let segIdx = 0;
  let i = 0;
  let priorDomain: DomainKind | null = null;
  let totalHandoff = 0;

  while (i < resolved.length) {
    const currentDomain = resolved[i].domain;
    const segFeatures: FeatureRef[] = [];
    while (i < resolved.length && resolved[i].domain === currentDomain) {
      segFeatures.push(resolved[i].feature);
      i++;
    }
    const handoff = priorDomain === null ? 0 : handoffCost(priorDomain, currentDomain);
    const segTime = segFeatures.reduce((s, f) => s + (timeMap[f.id] ?? 30), 0);
    segments.push({
      segment_index: segIdx,
      domain: currentDomain,
      features: segFeatures,
      setup_id: `OP${(segIdx + 1) * 10}`,
      estimated_time_sec: segTime,
      handoff_from_prior_sec: handoff,
    });
    totalHandoff += handoff;
    priorDomain = currentDomain;
    segIdx++;
  }

  if (segments.length === 0) {
    // All features unresolved — produce a single placeholder segment so
    // OrchestrationPlanSchema's `.min(1)` doesn't reject empty plans (we still
    // surface the failure via unresolved_features + warnings).
    segments.push({
      segment_index: 0,
      domain: "mill",
      features: [{ id: "PLACEHOLDER", type: "unresolved" }],
      setup_id: "OP10",
      estimated_time_sec: 0,
      handoff_from_prior_sec: 0,
    });
    warnings.push("Placeholder segment inserted — input produced no resolvable features.");
  }

  const totalTime = segments.reduce((s, seg) => s + seg.estimated_time_sec + seg.handoff_from_prior_sec, 0);
  const uniqueDomains = new Set(segments.map(s => s.domain)).size;

  if (uniqueDomains > 3) {
    warnings.push(
      `Job spans ${uniqueDomains} domains — consider if any features can be consolidated to reduce handoffs.`,
    );
  }

  return {
    schemaVersion: "1.0.0",
    plan_id: planId,
    job_id: jobId,
    segments,
    total_domains: uniqueDomains,
    total_segments: segments.length,
    total_handoff_cost_sec: totalHandoff,
    estimated_total_time_sec: totalTime,
    unresolved_features: unresolved,
    warnings,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Summarize an orchestration plan to a compact human/CLI form.
 */
function summarize(plan: OrchestrationPlan): {
  segments: number;
  domains: number;
  unresolved: number;
  total_time_min: number;
  handoff_minutes: number;
} {
  return {
    segments: plan.total_segments,
    domains: plan.total_domains,
    unresolved: plan.unresolved_features.length,
    total_time_min: plan.estimated_total_time_sec / 60,
    handoff_minutes: plan.total_handoff_cost_sec / 60,
  };
}

/**
 * Inspect the feature → domain map (read-only) for the dispatcher surface.
 */
function getFeatureDomainMap(): Record<string, DomainKind[]> {
  // Return a structural clone so callers cannot mutate the canonical map.
  const clone: Record<string, DomainKind[]> = {};
  for (const [k, v] of Object.entries(FEATURE_DOMAIN_MAP)) clone[k] = [...v];
  return clone;
}

// Static-method engine pattern (project rule: engines as classes with static methods).
class CrossDomainOrchestratorEngine {
  static planJob = planJob;
  static summarize = summarize;
  static getFeatureDomainMap = getFeatureDomainMap;
  static handoffCost = handoffCost;
}

export const crossDomainOrchestratorEngine = CrossDomainOrchestratorEngine;
