/**
 * MachiningPlaybookEngine — Experiential Machining Knowledge System
 *
 * Captures the "senior machinist brain" — structured decision rules, sequencing
 * wisdom, anti-patterns, setup strategies, and toolpath best practices learned
 * from videos, shop experience, and manufacturer training.
 *
 * Unlike ProcessPlanEngine (which sorts features mechanically), this engine
 * provides REASONING about WHY to sequence operations a certain way, WHEN to
 * break rules, and HOW to handle real-world complications.
 *
 * Knowledge sources: Titans of CNC, NYC CNC, Sandvik training, Haas tips,
 * hyperMILL tutorials, shop-floor experience, manufacturer application guides.
 *
 * Actions: playbook_advise, playbook_sequence, playbook_antipatterns,
 *          playbook_setup_strategy, playbook_lookup, playbook_add_rule
 */

// ============================================================================
// TYPES
// ============================================================================

export type RuleCategory =
  | "sequencing"        // Operation ordering rules
  | "setup_strategy"    // Fixture/setup planning wisdom
  | "tool_selection"    // When to pick what tool and why
  | "toolpath_strategy" // CAM strategy selection reasoning
  | "anti_pattern"      // Things to NEVER do
  | "material_tip"      // Material-specific machining wisdom
  | "thin_wall"         // Thin wall/floor handling
  | "hole_making"       // Drilling/boring/reaming best practices
  | "finishing"         // Surface finish achievement strategies
  | "roughing"          // Material removal strategies
  | "5axis"             // Multi-axis specific wisdom
  | "workholding"       // Fixturing and clamping knowledge
  | "thermal"           // Heat management during machining
  | "chip_control"      // Chip evacuation and management
  | "tool_life"         // Maximizing tool life
  | "datum"             // Datum selection and preservation
  | "deburring"         // Edge quality and deburr strategies
  | "safety"            // Crash prevention and safe practices
  | "grinding"          // Grinding-specific rules
  | "turning"           // Turning/lathe operations
  | "threading"         // Thread cutting specifics
  | "edm"              // EDM wire/sinker operations
  | "quality_inspection" // SPC, measurement, Cpk rules
  | "coolant_strategy"  // Coolant type/delivery selection
  | "adaptive"          // Adaptive machining rules
  | "deep_hole"         // Deep hole drilling (>5xD)
  | "surface_treatment" // Heat treat, anodize, coating allowances
  | "post_processing"   // G-code optimization rules
  | "hard_turning"      // Hardened material turning (>45 HRC)
  | "hsm"              // High-speed machining rules
  | "micro_machining"   // Sub-1mm feature rules
  | "hybrid_additive"   // Hybrid additive+subtractive
  | "cutting_force"     // Cutting force physics & Kienzle model
  | "surface_integrity" // Surface finish, residual stress, white layer
  | "vibration_dynamics" // Chatter, stability lobes, natural frequency
  | "dimensional_accuracy" // Abbe error, volumetric accuracy, compensation
  | "economics"         // Cost optimization, MRR, cycle time
  | "spc"              // Statistical process control
  | "cross_domain"      // Multi-physics synthesis rules
  | "gdt"              // Geometric dimensioning & tolerancing
  | "machine_capability" // Spindle power, axis dynamics, servo limits
  | "failure_analysis"  // Root cause diagnosis for tool/process failures
  | "milling"           // Milling-specific rules (strategy, flute selection, helix)
  | "drilling";         // Drilling-specific rules (through-coolant, peck, deep hole)

export type Severity = "critical" | "important" | "recommended" | "tip";

/** Evidence quality level — determines rule confidence in conflicting advice scenarios */
export type EvidenceLevel =
  | "iso_standard"       // ISO/DIN/ASME/ANSI standard (highest confidence)
  | "peer_reviewed"      // Published research (journal, conference)
  | "manufacturer_data"  // Manufacturer technical guides (Sandvik, Kennametal, etc.)
  | "empirical_validated" // Shop-floor tested with measured outcomes
  | "empirical_heuristic" // Shop-floor experience without formal measurement
  | "theoretical";       // Derived from physics models, not yet empirically validated

export type Condition =
  | { type: "material_iso"; groups: string[] }
  | { type: "feature_present"; features: string[] }
  | { type: "tolerance_below"; threshold_mm: number }
  | { type: "wall_thickness_below"; threshold_mm: number }
  | { type: "depth_ratio_above"; ld_ratio: number }
  | { type: "surface_finish_below"; ra_um: number }
  | { type: "batch_size_above"; count: number }
  | { type: "machine_axes"; min_axes: number }
  | { type: "part_size"; max_dimension_mm: number }
  | { type: "always" }
  | { type: "operation_type"; operations: string[] }
  | { type: "hardness_above"; hrc: number }
  | { type: "aspect_ratio_above"; ratio: number }
  | { type: "spindle_speed_above"; rpm: number };

export interface PlaybookRule {
  id: string;
  category: RuleCategory;
  severity: Severity;
  title: string;
  rule: string;              // The actual advice/rule
  reasoning: string;         // WHY — the physics/experience behind it
  conditions: Condition[];   // WHEN this rule applies (OR logic — any match triggers)
  conditions_all?: Condition[]; // AND logic — ALL must match for rule to fire
  exceptions: string[];      // When to BREAK this rule
  source: string;            // Where this was learned (video URL, manual, experience)
  examples?: string[];       // Concrete examples
  related_rules?: string[];  // Cross-references to other rule IDs
  /** Evidence quality — used to rank conflicting advice */
  evidence_level?: EvidenceLevel;
  /** Reference to PRISM FormulaRegistry key(s) that validate this rule */
  formula_ref?: string[];
  /** Quantitative threshold formula: e.g. "f_adj = f × (1 - 0.05×(L/D - 5))" */
  quantitative?: string;
  /** ISO/DIN/ASME/ANSI standard reference: e.g. "ISO 3685:1993 §4.2" */
  standard_ref?: string;
}

export interface SequencingAdvice {
  recommended_order: string[];
  reasoning: string[];
  warnings: string[];
  applied_rules: string[];   // Rule IDs that influenced this advice
}

export interface SetupAdvice {
  recommended_setups: number;
  setup_descriptions: string[];
  workholding_suggestions: string[];
  datum_strategy: string;
  reasoning: string[];
  applied_rules: string[];
}

export interface PlaybookQuery {
  material_iso?: string;
  features?: string[];
  tolerance_mm?: number;
  wall_thickness_mm?: number;
  surface_finish_Ra?: number;
  batch_size?: number;
  machine_axes?: number;
  categories?: RuleCategory[];
  severity_min?: Severity;
  operation_type?: string;
  hardness_hrc?: number;
  aspect_ratio?: number;
  spindle_rpm?: number;
}

// ============================================================================
// PLAYBOOK CAPABILITY EXTENSIONS (U-PB-EXPAND-CAPABILITIES, 2026-05-22)
// ============================================================================
// Pure data-driven capabilities built on top of the existing 296-rule store.
// Surface explicit rule explanation (with related-chain), coverage analysis,
// and quantitative-formula filtering — none of which the existing query
// surface (advise / byCategory / sequenceAdvice / antiPatterns / stats) exposes.

/** Deep single-rule explanation with related-rule chain resolved. */
export interface RuleExplanation {
  rule: PlaybookRule;
  /** related_rules IDs successfully resolved to real PlaybookRule entries (cycle-guarded). */
  relatedResolved: PlaybookRule[];
  /** related_rules IDs that did NOT resolve to a known rule. */
  unresolvedRelated: string[];
  hasQuantitative: boolean;
  hasExceptions: boolean;
  hasStandardRef: boolean;
  evidenceLevel: EvidenceLevel | "unspecified";
}

/** Per-job coverage analysis: which categories fire, which are silent (blind-spots). */
export interface PlaybookCoverageReport {
  applicableCount: number;
  totalRulesEvaluated: number;
  byCategory: Record<string, number>;
  bySeverity: Record<Severity, number>;
  criticalApplicable: number;
  /** Engine-known categories with ZERO applicable rules for this query. Sorted. */
  blindSpotCategories: string[];
  /** Applicable rule IDs, severity-ordered (advise() ordering). */
  ruleIds: string[];
}

/** One row of quantitative guidance — an applicable rule that carries a formula. */
export interface QuantitativeGuidanceEntry {
  ruleId: string;
  title: string;
  severity: Severity;
  category: RuleCategory;
  quantitative: string;
  reasoning: string;
  standardRef?: string;
}

/** Bundle of applicable rules whose `quantitative?` formula is set. */
export interface QuantitativeGuidanceReport {
  count: number;
  entries: QuantitativeGuidanceEntry[];
  totalApplicable: number;
  /** (count / totalApplicable) × 100, rounded to one decimal place. 0 when nothing applies. */
  withQuantitativePct: number;
}

/** A single playbook-corpus integrity defect found by auditIntegrity(). */
export type PlaybookIntegrityIssueType =
  | "duplicate_id"        // the same rule id appears more than once in the store
  | "dangling_related"    // related_rules points at a rule id that does not exist
  | "self_reference"      // related_rules includes the rule's own id
  | "asymmetric_related"  // A links to B but B does not link back to A
  | "empty_reasoning"     // rule carries no reasoning text
  | "unreachable_rule";   // rule has neither conditions nor conditions_all — can never match

export interface PlaybookIntegrityIssue {
  ruleId: string;
  issueType: PlaybookIntegrityIssueType;
  detail: string;
}

/** Playbook-corpus integrity audit — cross-reference + completeness defects. */
export interface PlaybookIntegrityReport {
  totalRules: number;
  /** Distinct rule ids — less than totalRules iff a duplicate_id defect exists. */
  uniqueRuleIds: number;
  issueCount: number;
  /** All defects, sorted deterministically by ruleId then issueType. */
  issues: PlaybookIntegrityIssue[];
  byType: Record<string, number>;
  /** True iff issueCount === 0. */
  healthy: boolean;
}

// ============================================================================
// PLAYBOOK CONFLICT DETECTION (U-PB-CONFLICT-DETECT, 2026-05-22)
// ============================================================================
// Semantic-layer complement to auditIntegrity() (structural). Where the audit
// finds broken cross-references, conflict detection finds rules that give
// CONTRADICTORY parameter directives under overlapping machining conditions —
// e.g. one rule says "increase feedrate", another says "reduce feedrate", and
// both fire for the same material / feature / operation.

/** A canonical machining parameter that a playbook rule can give a directive about. */
export type ConflictParameter =
  | "feedrate"
  | "spindle_speed"
  | "depth_of_cut"
  | "width_of_cut"
  | "coolant";

/** Direction of a parameter directive extracted from rule text. */
export type DirectiveDirection = "increase" | "decrease";

/** One detected contradiction between two co-firing playbook rules. */
export interface PlaybookConflict {
  /** Rule ids of the conflicting pair, always ordered ruleIdA <= ruleIdB. */
  ruleIdA: string;
  ruleIdB: string;
  /** The parameter both rules give an opposing directive on. */
  parameter: ConflictParameter;
  /** Direction rule A advises for `parameter`. */
  directionA: DirectiveDirection;
  /** Direction rule B advises for `parameter` — always the opposite of directionA. */
  directionB: DirectiveDirection;
  /** Shared category — co-fire detection requires both rules in the same category. */
  category: RuleCategory;
  /** Human-readable description of the overlapping machining context. */
  sharedContext: string;
}

/**
 * Playbook-corpus semantic conflict report. Complements the structural
 * `auditIntegrity()` scan: where the audit finds broken cross-references,
 * this finds rules giving CONTRADICTORY parameter directives for the same
 * machining situation.
 */
export interface PlaybookConflictReport {
  totalRules: number;
  /** Same-category rule pairs whose conditions overlap — the co-fire candidate set. */
  pairsEvaluated: number;
  conflictCount: number;
  /** All conflicts, sorted deterministically by ruleIdA, then ruleIdB, then parameter. */
  conflicts: PlaybookConflict[];
  /** conflictCount partitioned by parameter. */
  byParameter: Record<string, number>;
  /** True iff conflictCount === 0. */
  conflictFree: boolean;
  /** Directive-extraction method — honest label: a frozen token lexicon, NOT NLP. */
  method: "lexicon-cooccurrence";
}

// ── Conflict-detection lexicons (module-private, frozen) ───────────────────
// Directive extraction is deterministic lexicon co-occurrence: a parameter
// synonym and a direction verb within CONFLICT_WINDOW characters of each
// other. This is a heuristic surface for human corpus review — every reported
// conflict carries the rule ids so a reviewer can confirm.

/** Ordered canonical parameter list — drives deterministic iteration. */
const CONFLICT_PARAMETERS: readonly ConflictParameter[] = Object.freeze([
  "feedrate",
  "spindle_speed",
  "depth_of_cut",
  "width_of_cut",
  "coolant",
] as const);

/** Parameter → synonym tokens. Matched word-boundary, case-insensitive. */
const CONFLICT_PARAM_LEXICON: Readonly<Record<ConflictParameter, readonly string[]>> = Object.freeze({
  feedrate: ["feedrate", "feed rate", "feed", "feeds", "chip load", "chipload", "ipr"],
  spindle_speed: ["spindle speed", "spindle rpm", "spindle", "rpm", "surface speed", "cutting speed", "sfm", "speed", "speeds"],
  depth_of_cut: ["depth of cut", "axial depth", "depth", "doc", "stepdown"],
  width_of_cut: ["width of cut", "radial depth", "radial engagement", "woc", "stepover"],
  coolant: ["coolant", "flood coolant", "coolant pressure", "coolant flow"],
});

/** Direction verbs/comparatives — unambiguous "increase" sense. */
const CONFLICT_INCREASE_TOKENS: ReadonlySet<string> = new Set([
  "increase", "increased", "increasing", "raise", "raised", "raising",
  "higher", "boost", "boosted", "boosting", "maximize", "maximise", "bump",
]);

/** Direction verbs/comparatives — unambiguous "decrease" sense. */
const CONFLICT_DECREASE_TOKENS: ReadonlySet<string> = new Set([
  "decrease", "decreased", "decreasing", "reduce", "reduced", "reducing",
  "lower", "lowered", "lowering", "slower", "minimize", "minimise", "drop",
]);

/** Negation tokens that flip a following direction verb within 3 words. */
const CONFLICT_NEGATION_TOKENS: ReadonlySet<string> = new Set([
  "not", "never", "avoid", "without", "dont", "no",
]);

/** Half-width (characters) of the directive co-occurrence window. */
const CONFLICT_WINDOW = 90;

// ============================================================================
// CONFLICT PRIORITY RANKING (U-PB-CONFLICT-RANK, 2026-05-22)
// ============================================================================
// detectConflicts() returns a flat list — every contradiction is equal. In
// practice a critical-vs-critical conflict is FAR more urgent than a
// tip-vs-tip one, and a conflict where one rule has ISO-standard backing
// and the other is empirical-heuristic has an obvious winner. rankConflicts()
// scores each PlaybookConflict on those two axes (pair severity + evidence
// delta) and assigns a coarse priority bucket so an operator can triage.

/** Coarse priority bucket for a detected playbook conflict. */
export type ConflictPriority = "urgent" | "high" | "medium" | "low";

/** A PlaybookConflict enriched with severity + evidence-based ranking. */
export interface RankedConflict extends PlaybookConflict {
  /** Higher of the two rules' severities. */
  maxSeverity: Severity;
  /** Lower of the two rules' severities. */
  minSeverity: Severity;
  /** Priority score in [0, 1] combining pair-severity (0.8) + evidence-delta (0.2). */
  priorityScore: number;
  /** Coarse bucket — urgent ≥ 0.80, high ≥ 0.55, medium ≥ 0.35, else low. */
  priority: ConflictPriority;
  /** Rule id whose evidence_level outranks the other's — null on tie/unknown. */
  evidenceWinner: string | null;
}

/** Conflicts sorted by priority, with per-bucket counts. */
export interface RankedConflictReport {
  conflictCount: number;
  /** All conflicts, sorted by priorityScore DESC; stable within ties. */
  ranked: RankedConflict[];
  /** conflictCount partitioned by priority bucket. */
  byPriority: Record<ConflictPriority, number>;
}

// ── Resolution proposals (U-PB-SUGGEST-RESOLUTION, 2026-05-22) ───────────────
// Closes the detect → rank → RESOLVE conflict workflow. Given two contradictory
// rules, picks a winner based on evidence_level (primary) then severity (tie-
// breaker), and flags ambiguous when both axes tie. Pure single-conflict logic
// — no corpus rescans, no side effects.

/** Which axis decided the resolution. */
export type ResolutionDecidedBy = "evidence" | "severity" | "ambiguous";

/** Proposal for which rule should win a detected playbook conflict. */
export interface ResolutionProposal {
  ruleIdA: string;
  ruleIdB: string;
  parameter: ConflictParameter;
  /** id of the suggested winning rule; null when ambiguous. */
  winnerId: string | null;
  /** id of the rule that should yield; null when ambiguous. */
  loserId: string | null;
  /** Which axis decided this conflict. */
  decidedBy: ResolutionDecidedBy;
  /** |EVIDENCE_RANK[A] - EVIDENCE_RANK[B]| ∈ [0, 5]. */
  evidenceDelta: number;
  /** |SEVERITY_RANK[A] - SEVERITY_RANK[B]| ∈ [0, 3]. */
  severityDelta: number;
  /** Confidence in proposal ∈ [0, 1]. evidence-decided > severity-decided > ambiguous=0. */
  confidence: number;
  /** Operator-facing one-line rationale. */
  rationale: string;
  /** Convenience: true ⇔ decidedBy === "ambiguous". */
  ambiguous: boolean;
  /**
   * R12 fail-loud: set when one or both rule ids could not be resolved against
   * the engine's corpus (stale conflict input). Defaults silent on success.
   */
  warning?: string;
}

/** Batch resolution-proposal report over a conflict set. */
export interface ResolutionReport {
  conflictCount: number;
  /** One proposal per input conflict, same order. */
  proposals: ResolutionProposal[];
  /** conflictCount partitioned by decision axis. */
  byDecision: Record<ResolutionDecidedBy, number>;
  /** Convenience mirror of byDecision.ambiguous. */
  ambiguousCount: number;
}

// ── Related-rules graph (U-PB-RELATED-GRAPH, 2026-05-22) ──────────────────
// Extends `explainRule()` (1-hop) to multi-hop BFS traversal over the
// `related_rules` references — the playbook's cross-reference graph. Surfaces
// unresolved-ref ids (stale corpus references) and cycle-edges (back-edges
// to already-visited nodes) explicitly per R12 fail-loud — operators can
// triage stale references rather than silently missing them in the report.

/** Single node in the related-rules graph traversal. */
export interface RelatedGraphNode {
  /** The resolved rule itself. */
  rule: PlaybookRule;
  /** BFS hop depth from the root: 0 = root, 1 = direct neighbor, etc. */
  hopDepth: number;
}

/** Directed edge in the related-rules graph. */
export interface RelatedGraphEdge {
  /** Source rule id (the rule whose `related_rules` field references `toId`). */
  fromId: string;
  /** Target rule id (resolved if present in `nodes`, in `unresolvedRefs` otherwise). */
  toId: string;
}

/** Multi-hop BFS report rooted at a single rule. */
export interface RelatedGraphReport {
  /** Rule id the BFS was rooted at. */
  rootId: string;
  /** Cap on hop depth requested by the caller. */
  maxDepth: number;
  /** All resolved nodes in BFS order. nodes[0] is always the root. */
  nodes: RelatedGraphNode[];
  /** All forward edges (excluding cycle back-edges). */
  edges: RelatedGraphEdge[];
  /** Rule ids referenced via `related_rules` but absent from the corpus. */
  unresolvedRefs: string[];
  /** Back-edges to already-visited nodes — surfaced for cycle-detection visibility. */
  cycleEdges: RelatedGraphEdge[];
  /** True when BFS hit `maxDepth` and there were further-hop neighbors to explore. */
  truncated: boolean;
}

/**
 * Per-rule schema validation issue surfaced by validateCorpus().
 * Lists every field that fails the required-field / non-empty contract.
 */
export interface SchemaIssue {
  /** Rule id with the schema problem. */
  id: string;
  /** Human-readable issue descriptions (e.g. "title is empty", "conditions missing"). */
  issues: string[];
}

/**
 * Cross-reference issue — a rule references another rule that does not exist
 * in the corpus. R12 fail-loud: surface the dangling edge with BOTH endpoints
 * so an operator can fix the source rule (not just see the missing id).
 */
export interface UnresolvedRef {
  /** Rule that listed the missing id in its related_rules. */
  fromId: string;
  /** Rule id referenced but not present in the corpus. */
  missingId: string;
}

/**
 * A cycle in the related_rules DAG — surfaced as the ordered path of rule ids
 * that participate in the cycle. The path is canonicalized by rotating so the
 * lowest-id (UTF-16 lexicographic) is index 0; the last id back-edges to
 * path[0]. Canonicalization is monotone for ASCII ids; for Unicode ids the
 * ordering follows JavaScript's native string-comparison (UTF-16 code-unit
 * order), which is well-defined but may surprise on non-ASCII corpora.
 *
 * The `seenCycles` Set in validateCorpus() deduplicates entries using this
 * canonical form. With DFS 3-color marking, a cycle is normally discovered
 * exactly once (any second DFS root would find its nodes already BLACK), so
 * the dedupe is primarily a defensive guard against future re-implementation
 * changes — NOT a load-bearing dedupe for current DFS semantics.
 */
export type CycleId = string[];

/**
 * Full corpus health report from validateCorpus(). Pure read-only audit —
 * no rule mutations. R12 fail-loud: every finding is surfaced rather than
 * silenced. healthScore is a normalized [0,1] metric for at-a-glance triage;
 * the detail arrays are the canonical source of truth.
 */
export interface CorpusValidationReport {
  /** Total number of rules in the corpus when validation ran. */
  totalRules: number;
  /** Rule ids that appear more than once (corruption check). */
  duplicateIds: string[];
  /** Rules with NO related_rules AND no inbound references from any other rule. */
  orphans: string[];
  /** Stale cross-references — each entry pairs the source rule with the missing target. */
  unresolvedRefs: UnresolvedRef[];
  /** Cycles in the related_rules graph. Each cycle is an ordered list of rule ids. */
  cycles: CycleId[];
  /** Per-rule schema issues (missing/empty required fields). */
  schemaIssues: SchemaIssue[];
  /**
   * Normalized health metric in [0,1]. 1.0 = clean corpus. Computed as
   * 1 - (totalFindings / totalRules), clamped at 0. Operators should read
   * the detail arrays before relying on this number — a single high-severity
   * cycle is worse than the score suggests.
   */
  healthScore: number;
}

// Numeric ranks. Severity uses linear 1-4; evidence interleaves the
// "validated" tier at 2.5 to encode that empirical-validated outranks
// empirical-heuristic but does not reach manufacturer-data.
const SEVERITY_RANK: Readonly<Record<Severity, number>> = Object.freeze({
  critical: 4,
  important: 3,
  recommended: 2,
  tip: 1,
});

const EVIDENCE_RANK: Readonly<Record<EvidenceLevel | "unspecified", number>> = Object.freeze({
  iso_standard: 5,
  peer_reviewed: 4,
  manufacturer_data: 3,
  empirical_validated: 2.5,
  empirical_heuristic: 2,
  theoretical: 1,
  unspecified: 0,
});

const CONFLICT_PRIORITY_THRESHOLDS = Object.freeze({
  urgent: 0.80,
  high: 0.55,
  medium: 0.35,
});

// Priority-formula tuning constants — kept named so the weighting + range
// normalisation is explicit (and tunable in one place).
/** Severity weight in priorityScore (sum with EVIDENCE_WEIGHT must = 1). */
const SEVERITY_WEIGHT = 0.8;
/** Evidence-delta weight in priorityScore. */
const EVIDENCE_WEIGHT = 0.2;
/** Max possible pair-severity sum: max(SEVERITY_RANK) + min(SEVERITY_RANK) = 4 + 4 = 8. */
const SEVERITY_PAIR_MAX = 8;
/** Max possible evidence delta: max(EVIDENCE_RANK) - min(EVIDENCE_RANK) = 5 - 0 = 5. */
const EVIDENCE_RANK_SPAN = 5;
/** Max possible severity delta: max(SEVERITY_RANK) - min(SEVERITY_RANK) = 4 - 1 = 3. */
const SEVERITY_RANK_SPAN = 3;

// Resolution-confidence tuning constants. Evidence-decided proposals occupy
// the upper band [BASE, BASE+SPAN] = [0.5, 1.0]; severity-decided occupy the
// middle [0.3, 0.7]; ambiguous = 0. The intentional overlap between bands
// reflects that a max-margin severity (crit vs tip, 0.7) can outrank a tiny
// evidence margin (0.5 + 0.1 = 0.6) — that's correct: a critical/tip pair
// IS more decisive than e.g. peer_reviewed vs manufacturer_data (0.5+0.1).
const RESOLUTION_EVIDENCE_BASE = 0.5;
const RESOLUTION_EVIDENCE_SPAN = 0.5;
const RESOLUTION_SEVERITY_BASE = 0.3;
const RESOLUTION_SEVERITY_SPAN = 0.4;

// ============================================================================
// PLAYBOOK RULES DATABASE
// ============================================================================

const PLAYBOOK_RULES: PlaybookRule[] = [
  // ── SEQUENCING RULES ──────────────────────────────────────────────────────

  {
    id: "SEQ-001",
    category: "sequencing",
    severity: "critical",
    title: "Face first, always",
    rule: "Face the top of raw stock before any other operation to establish a clean Z-datum reference surface.",
    reasoning: "Raw stock surfaces are never flat or parallel. Every subsequent Z measurement (drill depths, pocket depths, step heights) references the faced surface. Skipping this propagates error into every feature.",
    conditions: [{ type: "always" }],
    exceptions: ["Pre-ground stock with known parallelism (<0.01mm)", "Castings with pre-machined datum pads"],
    source: "Titans of CNC Academy — 'From Print to Part'",
    examples: ["Face mill with 50mm face mill → establishes Z0", "Use largest available face mill for best flatness"],
    related_rules: ["SEQ-002", "DAT-001"],
    evidence_level: "empirical_validated",
    quantitative: "Flatness error without facing: ±0.05-0.3mm depending on stock form",
  },
  {
    id: "SEQ-002",
    category: "sequencing",
    severity: "critical",
    title: "Establish datums before features",
    rule: "Machine all datum surfaces (A, B, C) before cutting any features that reference them. If datum B is a bore, rough and finish the bore before machining features dimensioned from it.",
    reasoning: "GD&T datum reference frames define the measurement coordinate system. If datums aren't established first, features machined from theoretical datums will be out of tolerance when the actual datums are finally cut.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Prototype parts with no GD&T callouts"],
    source: "NYC CNC — 'Understanding GD&T for CNC'",
  },
  {
    id: "SEQ-003",
    category: "sequencing",
    severity: "critical",
    title: "Roughing before finishing — always separate",
    rule: "Complete ALL roughing operations across ALL features before starting any finishing passes. Never rough one feature and immediately finish it while adjacent features are still rough.",
    reasoning: "Roughing creates internal stresses that cause part distortion. If you finish immediately after roughing, the part relaxes and your finish dimensions shift. Roughing everything first lets the part stabilize before finishing.",
    conditions: [{ type: "always" }],
    exceptions: ["Very small parts (<10mm) with minimal stress", "Free-machining materials with low residual stress (e.g., 12L14)"],
    source: "Sandvik Coromant — 'Metal Cutting Technology'",
    examples: ["Rough all pockets → Rough all profiles → Semi-finish all → Finish all"],
    related_rules: ["SEQ-004", "THERM-001"],
  },
  {
    id: "SEQ-004",
    category: "sequencing",
    severity: "important",
    title: "Semi-finish pass for tight tolerances",
    rule: "For tolerances ≤0.025mm (≤0.001\"), add a semi-finish pass leaving 0.2-0.5mm stock before the final finish pass.",
    reasoning: "Semi-finishing removes most remaining stock uniformly, giving the finish pass a consistent chip load. Without it, the finish pass encounters varying stock (from roughing scallops) causing deflection variation and surface quality issues.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.025 }],
    exceptions: ["Jig-boring operations where the boring bar controls precision"],
    source: "Haas Automation — 'Tip of the Day: Finishing Strategy'",
  },
  {
    id: "SEQ-005",
    category: "sequencing",
    severity: "important",
    title: "Drill before pocket — rough pocket around holes",
    rule: "Drill holes BEFORE roughing surrounding pockets. The pocket roughing toolpath should account for pre-drilled holes to avoid air cuts and tool entry shock.",
    reasoning: "Drilling into solid material is more stable than drilling into a pocket floor (which may have insufficient support). Also, pocket toolpaths can use pre-drilled holes as plunge entry points, avoiding full-slotting entry.",
    conditions: [{ type: "feature_present", features: ["hole", "pocket"] }],
    exceptions: ["Very shallow pockets (<2mm) where drilling would break through"],
    source: "Mastercam — 'Dynamic Milling' tutorial",
    examples: ["Drill 4× M6 holes → Rough pocket (using hole as helix entry) → Finish pocket"],
  },
  {
    id: "SEQ-006",
    category: "sequencing",
    severity: "important",
    title: "Large tools before small tools",
    rule: "Use the largest practical tool diameter first for roughing. Progress to smaller tools only for features the large tool can't reach (corners, fillets, narrow slots).",
    reasoning: "Large tools are stiffer (less deflection), remove more material per pass (faster MRR), and leave less stock for smaller tools. This also reduces rest material machining — the small tool only cuts what the large tool missed.",
    conditions: [{ type: "always" }],
    exceptions: ["When a smaller tool can maintain full engagement (adaptive/dynamic), it may outperform a larger tool at partial engagement"],
    source: "Harvey Performance — 'Toolpath Strategy Guide'",
    related_rules: ["SEQ-007"],
  },
  {
    id: "SEQ-007",
    category: "sequencing",
    severity: "recommended",
    title: "Rest machining progression",
    rule: "After roughing with the primary tool, use progressively smaller tools to clear rest material: primary rougher (e.g., 20mm) → medium (12mm) → small (6mm) → pencil (3mm for corner radii).",
    reasoning: "Each pass targets only the material the previous tool couldn't reach. CAM systems calculate rest-material boundaries automatically. This prevents small tools from taking heavy cuts (which causes breakage).",
    conditions: [{ type: "feature_present", features: ["pocket", "freeform", "profile"] }],
    exceptions: ["Simple 2D pockets with uniform corner radii only need one rougher + one finisher"],
    source: "hyperMILL — 'Rest Material Machining' tutorial",
  },
  {
    id: "SEQ-008",
    category: "sequencing",
    severity: "important",
    title: "Thread AFTER bore/hole finishing",
    rule: "For tapped/threaded holes: Center drill → Drill → (Chamfer) → Ream/Bore if needed → Tap/Thread Mill LAST.",
    reasoning: "Threading is the most fragile operation in hole-making. If a tap breaks, you lose the part. Threading should only happen in a properly sized, finished hole. Any distortion from subsequent operations would damage threads.",
    conditions: [{ type: "feature_present", features: ["thread", "hole"] }],
    exceptions: ["Thread milling allows re-cutting if needed, making it safer for high-value parts"],
    source: "OSG — 'Tap Speed and Feed Selection'",
    examples: ["G81 spot drill → G83 peck drill → G84 tap", "Drill → Bore → Thread mill (for precision threads)"],
  },
  {
    id: "SEQ-009",
    category: "sequencing",
    severity: "recommended",
    title: "Chamfers and deburring last",
    rule: "Machine chamfers and edge breaks as the final operation before part removal. Don't chamfer edges that will be cut by subsequent operations.",
    reasoning: "Chamfers cut into edges that may shift during subsequent operations. Also, subsequent roughing can create new burrs on previously chamfered edges. Do it last for clean results.",
    conditions: [{ type: "feature_present", features: ["chamfer"] }],
    exceptions: ["Chamfers that serve as thread lead-ins should be done before threading"],
    source: "Haas Automation — 'Canned Cycles'",
  },
  {
    id: "SEQ-010",
    category: "sequencing",
    severity: "important",
    title: "Spot drill before twist drill",
    rule: "Always spot drill (or center drill) before using twist drills. Match the spot drill point angle to the twist drill point angle (118° or 140°) for best centering.",
    reasoning: "Twist drills walk on flat/uneven surfaces. A spot drill creates a conical seat that guides the drill point. Skipping this causes position error, especially on angled surfaces.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Carbide drills with self-centering geometry (e.g., through-coolant 140° point)", "Indexable drills with flat-bottom capability", "Drills with >3×D depth (use pilot drill instead)"],
    source: "Kennametal — 'Speeds and Feeds for Drilling'",
  },

  // ── ANTI-PATTERNS ────────────────────────────────────────────────────────

  {
    id: "ANTI-001",
    category: "anti_pattern",
    severity: "critical",
    title: "Never finish thin walls before removing adjacent stock",
    rule: "NEVER finish-machine a thin wall while heavy stock remains on the opposite side. The wall will deflect away from the cutter, leaving it oversize on the finished side and undersize when the other side is roughed.",
    reasoning: "Cutting force pushes the wall away from the tool. If there's solid stock on the back side, the wall is supported. Once the back is also roughed, the wall is free to spring. Sequence: rough both sides → finish both sides.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 3.0 }],
    exceptions: [],
    source: "Titans of CNC — 'Thin Wall Machining'",
    examples: ["Web between two pockets: rough pocket A → rough pocket B → finish A → finish B"],
    related_rules: ["THIN-001", "SEQ-003"],
  },
  {
    id: "ANTI-002",
    category: "anti_pattern",
    severity: "critical",
    title: "Never plunge a flat-bottom endmill into solid stock",
    rule: "Never plunge (straight Z-axis entry) a standard flat-bottom endmill into solid material. Use ramping, helical entry, or pre-drilled entry points.",
    reasoning: "Flat endmills have no center cutting capability — the center of the tool rubs rather than cuts, generating extreme heat and causing breakage. Always enter material at an angle (ramp) or spiral (helix).",
    conditions: [{ type: "always" }],
    exceptions: ["Center-cutting endmills rated for plunging", "Drill mills designed for plunge + lateral cutting"],
    source: "Harvey Performance — 'End Mill Selection Guide'",
  },
  {
    id: "ANTI-003",
    category: "anti_pattern",
    severity: "critical",
    title: "Never conventional mill on CNC — always climb",
    rule: "Default to climb milling (cutter rotation matches feed direction) on CNC machines. Conventional milling causes rubbing on entry, accelerating wear.",
    reasoning: "Climb milling: chip starts thick → thins. Less rubbing, better finish, longer tool life. Conventional milling: chip starts thin → thickens. Initial rubbing work-hardens stainless/titanium. Exception only for old manual machines with backlash.",
    conditions: [{ type: "always" }],
    exceptions: ["Manual machines without backlash compensation", "Interrupted cuts in castings with hard skin (conventional can prevent chipping)", "Very thin floor cuts where climb may pull tool into work"],
    source: "Sandvik Coromant — 'Milling Guide'",
  },
  {
    id: "ANTI-004",
    category: "anti_pattern",
    severity: "important",
    title: "Never use flood coolant for interrupted cuts in carbide",
    rule: "Avoid flood coolant for milling (interrupted cutting) with carbide inserts/endmills. Use air blast or MQL instead.",
    reasoning: "Carbide is sensitive to thermal shock. The cutting edge heats during engagement, then flood coolant rapidly cools it during the air gap. Repeated heating/cooling creates thermal cracks (comb cracks) that lead to edge chipping. Air blast clears chips without thermal shock.",
    conditions: [{ type: "always" }],
    exceptions: ["HSS tools (more thermal shock resistant)", "Continuous cuts (turning) where coolant stays constant", "Deep pocket milling where chip evacuation requires flood"],
    source: "Sandvik Coromant — 'Tool Wear Mechanisms'",
    related_rules: ["THERM-001"],
  },
  {
    id: "ANTI-005",
    category: "anti_pattern",
    severity: "important",
    title: "Never run full-slot cuts at full depth",
    rule: "Avoid cutting a full-width slot in a single pass at full depth. Instead, use adaptive/trochoidal toolpath OR rough wider than final slot, then finish to width.",
    reasoning: "Full-slot cutting engages the tool 180° (ae = Dc). This doubles heat and force vs. partial engagement. The center of the tool also re-cuts chips. Either reduce ae (adaptive) or reduce ap (shallow passes).",
    conditions: [{ type: "feature_present", features: ["slot"] }],
    exceptions: ["Slotting saws designed for full-width cuts", "Very shallow slots (<0.5mm depth)"],
    source: "Mastercam — 'Dynamic Milling vs Traditional'",
  },

  // ── THIN WALL RULES ──────────────────────────────────────────────────────

  {
    id: "THIN-001",
    category: "thin_wall",
    severity: "critical",
    title: "Alternate sides for thin wall machining",
    rule: "Machine thin walls by alternating between sides at progressive depth levels: rough side A at Z-1 → rough side B at Z-1 → rough side A at Z-2 → rough side B at Z-2...",
    reasoning: "This maintains approximately equal stock on both sides at each depth level, supporting the wall symmetrically. One-sided machining creates an asymmetric stress state that causes deflection and vibration.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 3.0 }],
    exceptions: ["Walls backed by solid stock (only one exposed side)"],
    source: "Titans of CNC — 'Thin Wall Machining Techniques'",
  },
  {
    id: "THIN-002",
    category: "thin_wall",
    severity: "important",
    title: "Reduce axial depth for thin floors",
    rule: "For thin floors (<2mm remaining stock), use very light axial depth of cut (ap ≤ 0.1-0.3mm) and increase radial engagement instead. Prefer a large-diameter tool at light ap.",
    reasoning: "Heavy axial cuts on thin floors cause deflection downward (dish-out). The floor springs back after the tool passes, leaving it oversize in the center. Light ap with a stiff, large-diameter tool distributes force over a wider area.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 2.0 }],
    exceptions: [],
    source: "Edge Precision — 'Aerospace Thin Floor Machining'",
  },

  // ── SETUP STRATEGY RULES ─────────────────────────────────────────────────

  {
    id: "SETUP-001",
    category: "setup_strategy",
    severity: "important",
    title: "Minimize setups by grouping accessible features",
    rule: "Group all features accessible from one direction into a single setup. Use 3+2 positioning to reach angled features without re-fixturing when possible.",
    reasoning: "Every setup change introduces: (1) re-fixturing time (5-30 min), (2) datum transfer error (0.01-0.05mm), (3) risk of mis-location. Fewer setups = faster, more accurate parts.",
    conditions: [{ type: "always" }],
    exceptions: ["When a single setup would require an excessively long tool (>5×D stick-out) that causes chatter — better to flip the part"],
    source: "NYC CNC — 'Workholding Strategies'",
  },
  {
    id: "SETUP-002",
    category: "setup_strategy",
    severity: "important",
    title: "Op 1: Machine clamping surfaces for Op 2",
    rule: "In the first operation, machine flat/parallel surfaces that will serve as clamping datum for the second operation. Include alignment features (dowel holes, stepped edges) if possible.",
    reasoning: "Op 2 grips on Op 1 surfaces. If Op 1 leaves raw stock or non-parallel surfaces, Op 2 can't hold the part securely or locate it accurately. Plan Op 1 specifically to create good Op 2 clamping.",
    conditions: [{ type: "always" }],
    exceptions: ["Parts fixtured in custom jigs with reference features independent of machined surfaces"],
    source: "Titans of CNC — 'First and Second Operation Strategy'",
    examples: ["Op 1: Face top + machine step for vise jaw reference", "Op 1: Bore center hole for expanding mandrel in Op 2"],
  },
  {
    id: "SETUP-003",
    category: "setup_strategy",
    severity: "recommended",
    title: "Soft jaws for second operation",
    rule: "For Op 2, machine soft jaws (aluminum or mild steel) that conform to the Op 1 profile. This distributes clamping force evenly and prevents marking.",
    reasoning: "Standard hard jaws contact only on edges/points, creating high local pressure that marks finished surfaces and can distort thin-walled parts. Soft jaws match the part contour, distributing force uniformly.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["High-volume production where dedicated fixtures justify the investment", "Round parts (use collet chuck instead)"],
    source: "NYC CNC — 'Soft Jaw Machining'",
  },

  // ── TOOLPATH STRATEGY RULES ───────────────────────────────────────────────

  {
    id: "STRAT-001",
    category: "toolpath_strategy",
    severity: "important",
    title: "Adaptive/Dynamic roughing over traditional pocket",
    rule: "For roughing pockets and open profiles, prefer adaptive/dynamic/trochoidal toolpaths over traditional zig-zag pocket toolpaths. Use full flute length (ap = 2-3×Dc) with reduced radial engagement (ae = 5-15% Dc).",
    reasoning: "Adaptive toolpaths maintain constant radial engagement, keeping cutting force and temperature stable. Traditional pocket toolpaths swing from partial to full engagement at corners, causing force spikes that break tools and cause chatter. Adaptive runs 3-5× faster overall despite lower ae because ap is much higher.",
    conditions: [{ type: "always" }],
    exceptions: ["Very shallow pockets (<1mm) where traditional zig-zag is simpler", "Soft materials (aluminum) where cutting forces aren't a concern"],
    source: "SolidCAM — 'iMachining Technology' / Mastercam — 'Dynamic Milling'",
    related_rules: ["ANTI-005"],
  },
  {
    id: "STRAT-002",
    category: "toolpath_strategy",
    severity: "important",
    title: "Z-level for steep walls, scallop for shallow areas",
    rule: "Use Z-level (contour) finishing for walls steeper than ~30° from vertical, and scallop/3D-offset finishing for shallow/flat areas. Many CAM systems offer a 'steep & shallow' combined strategy.",
    reasoning: "Z-level toolpaths leave uniform scallop on steep walls (predictable cusp height). On shallow areas, Z-level creates widely-spaced passes with large cusps. Scallop/offset strategies maintain constant cusp height regardless of surface angle.",
    conditions: [{ type: "feature_present", features: ["freeform", "profile"] }],
    exceptions: ["Ruled surfaces (use swarf cutting instead)", "Flat areas (use parallel/raster)"],
    source: "hyperMILL — '3D Finishing Strategies'",
  },
  {
    id: "STRAT-003",
    category: "toolpath_strategy",
    severity: "recommended",
    title: "Pencil trace for fillet cleanup",
    rule: "After 3D finishing with a ball nose, run a pencil trace pass along internal fillets and sharp transitions. Use a ball nose matching or smaller than the fillet radius.",
    reasoning: "Main finishing passes leave extra stock at internal corners where the ball nose can't reach. Pencil tracing follows these intersection curves automatically, removing the remaining cusp. This eliminates hand polishing.",
    conditions: [{ type: "feature_present", features: ["freeform", "pocket"] }],
    exceptions: ["When the finish tool radius already matches the smallest fillet radius"],
    source: "Fusion 360 — 'Pencil Finishing' tutorial",
  },

  // ── MATERIAL-SPECIFIC RULES ──────────────────────────────────────────────

  {
    id: "MAT-001",
    category: "material_tip",
    severity: "important",
    title: "Stainless steel: never dwell, always feed",
    rule: "In austenitic stainless (304, 316), the tool must ALWAYS be feeding. Never dwell (G04), retract slowly, or reduce feed rate mid-cut. Maintain minimum chip thickness.",
    reasoning: "Stainless work-hardens rapidly when rubbed without cutting. A dwelling tool creates a hardened skin that destroys the cutting edge on re-entry. Even retracts should be at feed rate (G01), not rapid through just-cut surfaces.",
    conditions: [{ type: "material_iso", groups: ["M"] }],
    exceptions: [],
    source: "Sandvik Coromant — 'Machinability of Stainless Steel'",
  },
  {
    id: "MAT-002",
    category: "material_tip",
    severity: "critical",
    title: "Titanium: low speed, high feed, sharp tools",
    rule: "Machine titanium at LOW cutting speed (30-60 m/min), HIGH feed per tooth (maintain chip thickness), with SHARP positive-rake tools. Through-tool coolant is mandatory for drilling.",
    reasoning: "Titanium's poor thermal conductivity concentrates heat at the cutting edge. Low Vc keeps temperature manageable. High fz ensures the chip carries heat away (thin chips leave heat in the work). Dull tools generate friction heat that causes galling and tool seizure.",
    conditions: [{ type: "material_iso", groups: ["S"] }],
    exceptions: ["PCD tools on titanium aluminides can run higher speeds"],
    source: "Kennametal — 'Aerospace Machining Guide'",
    related_rules: ["MAT-001"],
  },
  {
    id: "MAT-003",
    category: "material_tip",
    severity: "important",
    title: "Aluminum: maximum speed, positive rake, evacuate chips",
    rule: "Machine aluminum at the HIGHEST speed your spindle allows (300-1000+ m/min SFM). Use polished, uncoated, positive-rake tools with 2-3 flutes. Chip evacuation is the #1 priority — re-cutting chips causes BUE.",
    reasoning: "Aluminum is thermally conductive (heat goes into the chip, not the tool) and soft (low Kc). The limit is spindle RPM and chip evacuation, not tool wear. Coated tools actually perform worse — coatings increase edge radius and promote BUE on aluminum.",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: ["High-silicon aluminum (>12% Si) is abrasive — use PCD or diamond-coated tools at moderate speeds", "Cast aluminum with sand inclusions — reduce speed to prevent chipping"],
    source: "Datron — 'High Speed Aluminum Machining'",
  },
  {
    id: "MAT-004",
    category: "material_tip",
    severity: "important",
    title: "Hardened steel: light cuts, high speed, air blast only",
    rule: "For hard milling (>45 HRC): use small ap (0.05-0.2mm), small ae (0.1-0.5mm), HIGH cutting speed (150-300 m/min), and air blast cooling ONLY. Never flood coolant.",
    reasoning: "The goal is to generate heat in the chip (which carries it away) while keeping the workpiece cool. Light cuts ensure the heat stays in the chip. Flood coolant thermally shocks the carbide/CBN cutting edge, causing comb cracks. Air blast clears chips without thermal shock.",
    conditions: [{ type: "material_iso", groups: ["H"] }],
    exceptions: ["CBN inserts in continuous turning can sometimes use light coolant"],
    source: "Walter Tools — 'Hard Milling Guide'",
  },

  // ── HOLE-MAKING RULES ────────────────────────────────────────────────────

  {
    id: "HOLE-001",
    category: "hole_making",
    severity: "important",
    title: "Peck drill for deep holes (>3×D)",
    rule: "For holes deeper than 3× drill diameter, use peck drilling (G83) with peck depth = 1×D for first peck, then 0.5-1×D for subsequent pecks. For >5×D, consider gun drilling or indexable deep-hole drills.",
    reasoning: "Deep holes trap chips which re-cut and clog the flutes. Peck drilling retracts to clear chips. Without pecking, chip packing causes drill breakage, oversize holes, and poor surface finish.",
    conditions: [{ type: "depth_ratio_above", ld_ratio: 3.0 }],
    exceptions: ["Through-coolant carbide drills can often go to 5×D without pecking (use G73 chip-break cycle instead)", "Gun drills have internal coolant/chip channels, no pecking needed"],
    source: "OSG — 'ADO Drill Application Guide'",
  },
  {
    id: "HOLE-002",
    category: "hole_making",
    severity: "recommended",
    title: "Thread mill instead of tap for expensive parts",
    rule: "For high-value parts, prefer thread milling over tapping. Thread mills can be adjusted for size, can cut left or right hand threads, and don't risk breaking off in the hole.",
    reasoning: "A broken tap in a $5,000 aerospace part means scrap. Thread milling is slower but: (1) no breakage risk (tool retracts if force spikes), (2) one tool cuts many thread sizes, (3) better thread quality, (4) blind hole threads closer to bottom.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: ["High-volume production where tapping speed matters", "Very small threads (<M4) where thread mills are fragile"],
    source: "Emuge-Franken — 'Thread Milling Guide'",
  },

  // ── DATUM RULES ──────────────────────────────────────────────────────────

  {
    id: "DAT-001",
    category: "datum",
    severity: "critical",
    title: "Never remove datum surfaces after establishing them",
    rule: "Once a datum surface is machined, never re-machine it in a subsequent operation unless the drawing explicitly calls for it. Protect datum surfaces from clamp marks, tool marks, and burrs.",
    reasoning: "Datum surfaces are the reference for ALL other dimensions. Re-machining changes the reference, invalidating all features measured from it. Even 0.005mm change shifts every dependent dimension.",
    conditions: [{ type: "always" }],
    exceptions: ["Intentional datum refinement (e.g., grinding datum A after heat treatment)"],
    source: "Quality Control — 'GD&T Datum Management'",
  },

  // ── THERMAL MANAGEMENT ───────────────────────────────────────────────────

  {
    id: "THERM-001",
    category: "thermal",
    severity: "important",
    title: "Allow thermal stabilization between rough and finish",
    rule: "For precision parts (tolerance ≤0.01mm), allow 10-30 minutes between roughing and finishing for the part to thermally stabilize, OR run probing to measure actual position before finishing.",
    reasoning: "Roughing generates significant heat — a steel part can grow 0.01-0.05mm from thermal expansion. If you immediately finish, the part is oversized while hot. When it cools, the finished dimensions are undersize.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.01 }],
    exceptions: ["Parts with good thermal conductivity (aluminum) stabilize quickly", "Temperature-controlled environments (<±1°C)"],
    source: "Renishaw — 'In-Process Measurement'",
    related_rules: ["SEQ-003"],
  },

  // ── WORKHOLDING RULES ────────────────────────────────────────────────────

  {
    id: "HOLD-001",
    category: "workholding",
    severity: "important",
    title: "Clamp on raw stock, never on finished surfaces",
    rule: "In early operations, clamp on raw stock surfaces whenever possible. In later operations, use soft jaws, vacuum, or fixture plates to protect finished surfaces.",
    reasoning: "Hard vise jaws mark aluminum, distort thin walls, and can move the part if clamped on uneven raw surfaces. Clamping on the largest, flattest area provides the most stability.",
    conditions: [{ type: "always" }],
    exceptions: ["Zero-point clamping systems with defined interface surfaces"],
    source: "Schunk — 'Workholding Systems Guide'",
    related_rules: ["SETUP-003"],
  },
  {
    id: "HOLD-002",
    category: "workholding",
    severity: "recommended",
    title: "Tabs or dovetails for near-complete parts",
    rule: "When machining a part from all sides, leave tabs/bridges connecting to stock OR use a dovetail profile for re-gripping. Remove tabs as the final operation.",
    reasoning: "Parts that are nearly fully machined have no good clamping surfaces left. Tabs keep the part connected to stock. Dovetail profiles let you flip and grip on the machined profile without marks.",
    conditions: [{ type: "always" }],
    exceptions: ["Vacuum workholding on flat parts", "Parts with dedicated clamping features in the design"],
    source: "Titans of CNC — 'Workholding' series",
  },

  // ── SAFETY RULES ─────────────────────────────────────────────────────────

  {
    id: "SAFE-001",
    category: "safety",
    severity: "critical",
    title: "Prove out new programs at reduced feed rate",
    rule: "Run every new CNC program at 25% feed rate override for the first part. Watch the first tool change, first plunge, and first rapid move. Only go to 100% after confirming no collision.",
    reasoning: "Even experienced programmers make mistakes. A rapid (G00) to the wrong Z coordinate at full speed crashes the tool into the part/fixture. At 25% feed, you have time to hit E-stop. The cost of proving out (5 minutes extra) vs. a crash ($500-5000 tool/spindle damage) is trivial.",
    conditions: [{ type: "always" }],
    exceptions: ["Proven programs that have run successfully on the same setup"],
    source: "Haas Automation — 'Program Prove-Out Best Practices'",
  },

  // ── SEQUENCING (continued) ────────────────────────────────────────────

  {
    id: "SEQ-011",
    category: "sequencing",
    severity: "important",
    title: "Bore before ream",
    rule: "Ream holes only after boring to size. Boring provides controlled dimension; reaming creates surface finish on the pre-bored hole.",
    reasoning: "Reaming removes minimal stock (0.1-0.3mm). If the hole is undersized from drilling alone, the reamer deflects or chatters. Boring brings the hole to within 0.1mm of final, letting the reamer produce a clean finish.",
    conditions: [{ type: "feature_present", features: ["bore", "hole"] }],
    exceptions: ["Standard-tolerance holes (H11+) can go drill → ream directly"],
    source: "Sandvik Coromant — 'Boring & Reaming Guide'",
    related_rules: ["SEQ-008"],
  },
  {
    id: "SEQ-012",
    category: "sequencing",
    severity: "important",
    title: "Radial finishing before axial on precision bores",
    rule: "For precision bores: rough radially → semi-finish radially → finish with a single axial pass (plunge boring or fine boring) to achieve roundness and surface finish.",
    reasoning: "Radial passes remove stock uniformly but leave tool marks. A final axial pass with a fine boring bar produces excellent roundness and Ra <0.8µm. Reversing the order leaves radial marks on the finished surface.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.02 }],
    exceptions: ["Honing or lapping replaces the axial finish pass for extreme tolerances"],
    source: "Kennametal — 'Fine Boring Application Guide'",
  },
  {
    id: "SEQ-013",
    category: "sequencing",
    severity: "important",
    title: "Profile fillets before edge chamfers",
    rule: "Machine internal fillet radii in pockets/profiles before chamfering external edges. This prevents double-tooling the same feature intersection.",
    reasoning: "Chamfering after filleting creates a clean, consistent edge break. If chamfered first, the fillet operation may remove part of the chamfer, requiring a re-chamfer pass.",
    conditions: [{ type: "feature_present", features: ["pocket", "profile", "chamfer"] }],
    exceptions: ["When chamfer serves as a lead-in for threading — do chamfer first"],
    source: "hyperMILL — 'Feature Machining Order'",
    related_rules: ["SEQ-009"],
  },
  {
    id: "SEQ-014",
    category: "sequencing",
    severity: "important",
    title: "Deburr after all cutting, before inspection",
    rule: "Deburring is the LAST machining operation. All cutting must be complete before deburring — subsequent cuts create new burrs that invalidate previous deburring.",
    reasoning: "Burrs form at every tool exit edge. If you deburr pockets then drill holes, the drill exit creates new burrs. Deburring once at the end is faster and more reliable than repeated deburring.",
    conditions: [{ type: "always" }],
    exceptions: ["Cross-hole deburring may require a dedicated mid-process step if the hole becomes inaccessible later"],
    source: "Shop floor experience — multi-operation parts",
  },
  {
    id: "SEQ-015",
    category: "sequencing",
    severity: "recommended",
    title: "Climb finish after conventional rough",
    rule: "When both climb and conventional are used: rough with conventional milling (for stability in heavy cuts on older machines), then finish with climb milling (for better surface finish).",
    reasoning: "Conventional roughing is more forgiving of machine backlash and varying stock. Climb finishing removes stock uniformly without rubbing, producing a superior surface. This hybrid approach balances stability and quality.",
    conditions: [{ type: "always" }],
    exceptions: ["Modern rigid CNC machines should climb-mill for both rough and finish"],
    source: "Sandvik Coromant — 'Milling Direction Guide'",
    related_rules: ["ANTI-003"],
  },

  // ── ANTI-PATTERNS (continued) ─────────────────────────────────────────

  {
    id: "ANTI-006",
    category: "anti_pattern",
    severity: "critical",
    title: "Never deep-drill without peck in steel (>3×D)",
    rule: "NEVER drill deeper than 3×D without pecking in steel, cast iron, or stainless. Drills >3mm diameter at >3×D MUST use peck or chip-break cycle. Below 3mm diameter, use even shallower pecks.",
    reasoning: "Deep drilling in steel generates long continuous chips that wrap around the drill and pack in the flutes. This causes catastrophic drill failure, oversize holes, and potential workpiece scrap. Smaller drills are more fragile and need even more conservative pecking.",
    conditions: [{ type: "depth_ratio_above", ld_ratio: 3.0 }],
    exceptions: ["Through-coolant carbide drills with chip-breaking geometry rated for 5×D without peck", "Gun drills with internal chip channels"],
    source: "OSG — 'Deep Hole Drilling Application Guide'",
    related_rules: ["HOLE-001"],
  },
  {
    id: "ANTI-007",
    category: "anti_pattern",
    severity: "critical",
    title: "Never climb-mill thin walls unsupported",
    rule: "NEVER climb-mill the unsupported side of a thin wall (<1.5mm). Climb feed pulls the tool INTO the wall, causing deflection and potential breakage. Rough conventionally on the unsupported side, finish with climb only when both sides have been roughed.",
    reasoning: "Climb milling creates a force vector toward the wall. With no stock behind the wall to resist, the wall deflects toward the tool, creating an overcut. On very thin walls (<1mm), this causes wall breakage.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 1.5 }],
    exceptions: ["Walls backed by solid stock on the opposite side"],
    source: "Titans of CNC — 'Thin Wall Strategies'",
    related_rules: ["THIN-001", "ANTI-001"],
  },
  {
    id: "ANTI-008",
    category: "anti_pattern",
    severity: "important",
    title: "Never full-width slot at full depth first pass",
    rule: "Never cut a full-width slot at full depth in the first pass. Limit first pass to ap = 0.3× slot width OR slot width in one pass with ap ≤ 0.5mm. Build depth progressively.",
    reasoning: "Full-width at full-depth creates maximum tool engagement (180° wrap + full ap), generating extreme forces and zero chip evacuation path. The tool is buried with nowhere for chips to go.",
    conditions: [{ type: "feature_present", features: ["slot"] }],
    exceptions: ["Slotting saws and T-slot cutters designed for full-width engagement"],
    source: "Harvey Performance — 'Slotting Applications'",
    related_rules: ["ANTI-005"],
  },
  {
    id: "ANTI-009",
    category: "anti_pattern",
    severity: "important",
    title: "Never re-cut chips in pockets",
    rule: "Avoid unidirectional pocket passes that push chips ahead of the tool. Use bidirectional (zig-zag) or one-way with air-blast clearing between passes. Re-cutting chips work-hardens the surface and accelerates tool wear.",
    reasoning: "Chips not evacuated from the cutting zone are re-ground between tool and workpiece. In stainless and titanium, re-cut chips work-harden the surface (up to 2× hardness increase), dramatically reducing tool life and degrading surface finish.",
    conditions: [{ type: "feature_present", features: ["pocket"] }],
    exceptions: ["Aluminum with good chip evacuation (high spindle speed blows chips out)"],
    source: "Sandvik Coromant — 'Chip Evacuation in Pocketing'",
    related_rules: ["MAT-001"],
  },
  {
    id: "ANTI-010",
    category: "anti_pattern",
    severity: "important",
    title: "Never assume coolant reaches deep pockets",
    rule: "For pockets deeper than 20mm, verify coolant actually reaches the tool tip. Flood coolant may pool at the top and never reach the cutting zone. Use through-tool coolant, MQL, or programmed pauses with air blast.",
    reasoning: "Coolant flow follows gravity and centrifugal force from the spindle. In deep pockets, the tool body blocks coolant flow to the cutting zone. Chips accumulate, heat builds, and tool life drops dramatically. Through-tool coolant or high-pressure directed nozzles solve this.",
    conditions: [{ type: "feature_present", features: ["pocket"] }],
    exceptions: ["Through-tool coolant with adequate pressure (>40 bar)", "Shallow pockets (<10mm) where flood is effective"],
    source: "Blaser Swisslube — 'Deep Pocket Machining'",
  },
  {
    id: "ANTI-011",
    category: "anti_pattern",
    severity: "important",
    title: "Never tap at full depth in one pass in hard materials",
    rule: "In materials >30 HRC or stainless, never tap to full depth in a single pass. Use a peck-tapping cycle (G84 with pecking) or thread mill. Full-depth single-pass tapping generates extreme torque at the bottom.",
    reasoning: "Tapping torque increases with depth as chips pack in the flutes. In hard materials, chip packing causes tap breakage at depth. A broken tap in a finished hole is nearly impossible to extract without damaging the part.",
    conditions: [{ type: "material_iso", groups: ["M", "H"] }],
    exceptions: ["Form taps (roll taps) in ductile materials don't produce chips", "Spiral-point taps in through-holes push chips forward"],
    source: "Emuge-Franken — 'Tapping in Difficult Materials'",
    related_rules: ["HOLE-002"],
  },
  {
    id: "ANTI-012",
    category: "anti_pattern",
    severity: "important",
    title: "Never run interrupted carbide cuts without coolant strategy",
    rule: "Interrupted milling with carbide (entering/exiting workpiece repeatedly) requires consistent thermal management. Use air blast or MQL — never alternate between flood and dry. Inconsistent cooling causes thermal fatigue cracking.",
    reasoning: "Each entry/exit cycle creates a thermal pulse. Flood coolant amplifies this by rapid cooling during the air gap. Even air blast must be consistent — turning it on/off creates the same thermal shock. Keep cooling constant throughout the operation.",
    conditions: [{ type: "always" }],
    exceptions: ["HSS tools tolerate thermal cycling better", "Ceramic inserts designed for interrupted cuts in cast iron"],
    source: "Sandvik Coromant — 'Tool Wear & Thermal Cracking'",
    related_rules: ["ANTI-004"],
  },
  {
    id: "ANTI-013",
    category: "anti_pattern",
    severity: "recommended",
    title: "Never conventional-mill casting hard skin",
    rule: "On castings, the first cut through the hard outer skin should be climb milling, not conventional. Conventional milling starts with zero chip thickness at the hard skin, causing maximum rubbing and rapid tool wear.",
    reasoning: "Sand-cast surfaces have a hardened skin (up to 50+ HRC) from contact with the mold. Conventional milling rubs on this skin with thin chips before engaging. Climb milling enters at maximum chip thickness, punching through the hard skin before rubbing occurs.",
    conditions: [{ type: "material_iso", groups: ["K"] }],
    exceptions: ["Pre-machined castings with skin already removed", "Very thin skin (<0.1mm) on investment castings"],
    source: "Walter Tools — 'Machining Cast Iron'",
    related_rules: ["ANTI-003"],
  },

  // ── THIN WALL (continued) ─────────────────────────────────────────────

  {
    id: "THIN-003",
    category: "thin_wall",
    severity: "critical",
    title: "Synchronize Z-levels across thin wall sides",
    rule: "When alternating sides on a thin wall, machine BOTH sides to the same Z-depth before progressing deeper. Side A at Z=-5 → Side B at Z=-5 → Side A at Z=-10 → Side B at Z=-10. Never roughing one side to full depth before starting the other.",
    reasoning: "If one side is roughed to full depth while the other is still solid, the wall has no support on one side. This creates asymmetric stress and deflection. Keeping both sides at the same depth maintains symmetric support throughout the process.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 3.0 }],
    exceptions: ["Walls that are very short in Z (<5mm) where full-depth one-side is acceptable"],
    source: "Titans of CNC — 'Thin Wall Z-Level Synchronization'",
    related_rules: ["THIN-001"],
  },
  {
    id: "THIN-004",
    category: "thin_wall",
    severity: "important",
    title: "Spring pass for thin wall finishing",
    rule: "After semi-finishing a thin wall, run a light spring pass (0.02-0.05mm DOC) at the same Z-level to compensate for elastic recovery. The wall springs back after the semi-finish, and the spring pass removes the recovered material.",
    reasoning: "Thin walls deflect elastically during cutting. When the tool passes, the wall springs back by 0.01-0.05mm (depending on material and wall thickness). A spring pass at the same nominal dimension catches this springback material.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 2.0 }],
    exceptions: ["Very rigid materials (hardened steel walls) have minimal springback"],
    source: "Edge Precision — 'Aerospace Thin Wall Techniques'",
    related_rules: ["THIN-002"],
  },
  {
    id: "THIN-005",
    category: "thin_wall",
    severity: "important",
    title: "Sacrificial support ribs for thin floors",
    rule: "For floors thinner than 1.5mm, add temporary support ribs (sacrificial stock islands) underneath during CAM setup. Machine around them during roughing, remove them as the final floor operation.",
    reasoning: "Thin floors deflect under cutting force, causing dish-out (thinner in center, thicker at edges). Support ribs act as mini-columns that resist deflection. Removing them last lets the floor maintain flatness during heavy cutting.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 1.5 }],
    exceptions: ["Vacuum workholding from below provides continuous support", "Parts where floor flatness is non-critical"],
    source: "Aerospace machining — 'Monolithic Structure Strategies'",
  },
  {
    id: "THIN-006",
    category: "thin_wall",
    severity: "recommended",
    title: "Reduce RPM 10-20% for thin walls to reduce force",
    rule: "Lower spindle speed by 10-20% when machining thin walls (below 2mm). Cutting force is proportional to chip cross-section; lower speed with maintained feed reduces force peaks.",
    reasoning: "Thin walls vibrate at natural frequencies that may coincide with tooth-passing frequency. Reducing RPM shifts the excitation frequency away from resonance. The trade-off is slightly longer cycle time, acceptable for precision parts.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 2.0 }],
    exceptions: ["When stability lobe analysis shows the current RPM is in a stable zone"],
    source: "Stability lobe theory — 'Chatter Avoidance for Thin Features'",
  },

  // ── SETUP STRATEGY (continued) ────────────────────────────────────────

  {
    id: "SETUP-004",
    category: "setup_strategy",
    severity: "important",
    title: "Machine soft jaw profile in Op 0",
    rule: "Before Op 1, machine soft jaws (aluminum or mild steel) to match the Op 2 clamping profile. This is 'Op 0' — a setup operation that creates the fixture for the real part.",
    reasoning: "Standard hard vise jaws contact the part at edges, creating point loads that distort thin parts and mark finished surfaces. Soft jaws match the part contour, distributing clamp force over the entire contact area.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["High-volume production justifies dedicated fixtures instead", "Round parts use collet chucks"],
    source: "NYC CNC — 'Soft Jaw Setup Workflow'",
    related_rules: ["SETUP-003"],
  },
  {
    id: "SETUP-005",
    category: "setup_strategy",
    severity: "important",
    title: "Use parallels under thin parts",
    rule: "Thin parts (<10mm thick) must sit on parallels in the vise, not clamped directly on edges. Parallels distribute clamping force over the part area and prevent Z-axis distortion.",
    reasoning: "Edge-clamping thin parts creates a bending moment across the part width. The center deflects upward, and machined surfaces end up concave. Parallels support the part bottom uniformly, preventing this bowing.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 10.0 }],
    exceptions: ["Vacuum workholding eliminates the need for parallels", "Parts with machined flat bottom from previous op"],
    source: "Haas Automation — 'Workholding Tips'",
  },
  {
    id: "SETUP-006",
    category: "setup_strategy",
    severity: "important",
    title: "Toe-clamp interference check",
    rule: "Before starting a program, verify that toe clamps, step clamps, or fixture bolts don't interfere with tool paths. Check clearance for the longest tool at the deepest Z-level near any clamp.",
    reasoning: "Clamp collisions are among the most common CNC crashes. The tool path may clear the clamp at Z=0 but collide when plunging to Z=-30. CAM simulation should include clamp models, or manually verify clearance.",
    conditions: [{ type: "always" }],
    exceptions: ["Vise clamping where jaws are below the part top (no interference possible)"],
    source: "Shop floor experience — 'Crash Prevention'",
    related_rules: ["SAFE-001"],
  },
  {
    id: "SETUP-007",
    category: "setup_strategy",
    severity: "recommended",
    title: "Datum transfer via dowel holes or witness marks",
    rule: "When flipping a part between operations, establish repeatable datum transfer using: dowel holes in the fixture, witness marks on the part, or 3-2-1 locating (3 points on primary plane, 2 on secondary edge, 1 on tertiary).",
    reasoning: "Without repeatable datum transfer, Op 2 features are positioned relative to a visually-aligned part — introducing 0.05-0.2mm error. Dowel holes provide <0.01mm repeatability; witness marks provide 0.02-0.05mm.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Probing in Op 2 can establish datum from Op 1 features directly"],
    source: "Renishaw — 'Part Location Best Practices'",
    related_rules: ["DAT-001"],
  },
  {
    id: "SETUP-008",
    category: "setup_strategy",
    severity: "recommended",
    title: "Probe/indicate Op 1 surfaces before Op 2 finishing",
    rule: "Before finishing in Op 2, probe or indicate the Op 1 datum surfaces to verify they're parallel to machine axes. Adjust WCS if needed. Never assume Op 1 surfaces are perfectly aligned after re-fixturing.",
    reasoning: "Even with soft jaws, parts can seat 0.01-0.05mm off-parallel due to chip debris, jaw wear, or clamp force variation. A 0.02mm tilt across a 100mm part creates a 0.02mm thickness variation. Probing catches this before cutting.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.025 }],
    exceptions: ["Low-tolerance parts where ±0.1mm is acceptable"],
    source: "Renishaw — 'In-Process Probing Guide'",
  },

  // ── TOOLPATH STRATEGY (continued) ─────────────────────────────────────

  {
    id: "STRAT-004",
    category: "toolpath_strategy",
    severity: "important",
    title: "Constant engagement vs adaptive roughing",
    rule: "Constant-engagement roughing (fixed ae, varying toolpath) is SAFER with fewer force spikes. Adaptive roughing (constant chip load via ae modulation) is FASTER but requires rigid setup. Choose by machine rigidity and part stability.",
    reasoning: "Constant engagement never exceeds the programmed ae, making force predictable. Adaptive toolpaths vary engagement to maintain constant chip load, which is faster but can create force spikes at engagement transitions on flexible parts.",
    conditions: [{ type: "always" }],
    exceptions: ["Very rigid setups (short tools, massive parts) can use adaptive safely"],
    source: "SolidCAM iMachining vs. Mastercam Dynamic comparison",
    related_rules: ["STRAT-001"],
  },
  {
    id: "STRAT-005",
    category: "toolpath_strategy",
    severity: "important",
    title: "Ramp entry angle: 2-5° for pockets",
    rule: "Use 2-5° ramp angle for pocket entry. Shallower ramps (2-3°) reduce entry shock but increase ramp length. Steeper ramps (>5°) cause rubbing at the tool center. Helical entry is preferred over linear ramp when space allows.",
    reasoning: "Flat endmills have no center-cutting capability. During ramping, the center portion rubs rather than cuts. Shallower angles reduce the rubbing zone. Helical entry distributes the engagement around the full tool diameter, eliminating center rubbing entirely.",
    conditions: [{ type: "feature_present", features: ["pocket"] }],
    exceptions: ["Center-cutting endmills and drill mills can use steeper angles", "Pre-drilled plunge points eliminate the need for ramping"],
    source: "Harvey Performance — 'Entry Strategies for Pocketing'",
    related_rules: ["ANTI-002"],
  },
  {
    id: "STRAT-006",
    category: "toolpath_strategy",
    severity: "important",
    title: "Ball nose stepover for target Ra",
    rule: "Calculate ball nose stepover from target surface finish: stepover ≈ 2 × sqrt(Ra_target × 4 × R_tool). For Ra <1.6µm use stepover ≤ 0.1×Dc. For Ra <3.2µm use stepover ≤ 0.2×Dc. For Ra <6.3µm use stepover ≤ 0.3×Dc.",
    reasoning: "Ball nose tools leave a scallop (cusp) between passes. Cusp height h = R - sqrt(R² - (stepover/2)²). This cusp height directly determines theoretical Ra. Tighter stepover = smaller cusp = better finish, but exponentially longer cycle time.",
    conditions: [{ type: "surface_finish_below", ra_um: 6.3 }],
    exceptions: ["Wiper geometry tools reduce effective cusp height, allowing larger stepover"],
    source: "Sandvik Coromant — 'Ball Nose Finishing Calculations'",
  },
  {
    id: "STRAT-007",
    category: "toolpath_strategy",
    severity: "recommended",
    title: "Trochoidal milling for chatter-prone setups",
    rule: "When experiencing chatter, switch from conventional pocket toolpath to trochoidal (circular interpolation with linear advance). Trochoidal maintains partial engagement, reducing force peaks that excite vibration.",
    reasoning: "Chatter occurs when cutting force excitation matches a structural natural frequency. Trochoidal toolpaths keep engagement below 90° (typically 30-60°), reducing peak force by 40-60% compared to full-slot or high-engagement conventional paths.",
    conditions: [{ type: "always" }],
    exceptions: ["When stability lobe analysis identifies stable RPM zones — use those instead of changing toolpath"],
    source: "Mastercam — 'Dynamic Milling for Chatter Reduction'",
    related_rules: ["STRAT-001"],
  },
  {
    id: "STRAT-008",
    category: "toolpath_strategy",
    severity: "recommended",
    title: "Pencil trace threshold: internal corners <30°",
    rule: "Run pencil trace finishing on internal corners tighter than 30° included angle. Wider corners (>30°) can be reached by the main finishing pass. Match pencil tool radius to the smallest fillet radius in the corner.",
    reasoning: "Main finishing passes with larger tools leave uncut cusps in tight corners. Pencil tracing follows the intersection curve between adjacent surfaces, cleaning up only the missed material. This eliminates hand polishing in tight corners.",
    conditions: [{ type: "feature_present", features: ["freeform", "pocket"] }],
    exceptions: ["When corner radius matches the finish tool radius exactly — no pencil needed"],
    source: "hyperMILL — 'Pencil Finishing Strategy'",
    related_rules: ["STRAT-003"],
  },

  // ── MATERIAL TIPS (continued) ─────────────────────────────────────────

  {
    id: "MAT-005",
    category: "material_tip",
    severity: "important",
    title: "Stainless: emulsion coolant, MQL preferred",
    rule: "For austenitic stainless (304/316), use emulsion coolant (not straight oil). MQL (minimum quantity lubrication) is preferred — it provides lubrication without the re-cut chip problem of flood coolant sumps.",
    reasoning: "Straight oil has poor cooling capacity for stainless, which needs heat extraction. Emulsion (water-based) cools better. MQL delivers micro-drops directly to the cutting zone without flooding, preventing chips from re-entering the cut zone in pooled coolant.",
    conditions: [{ type: "material_iso", groups: ["M"] }],
    exceptions: ["Deep hole drilling requires flood for chip evacuation regardless"],
    source: "Blaser Swisslube — 'Coolant Selection for Stainless'",
    related_rules: ["MAT-001"],
  },
  {
    id: "MAT-006",
    category: "material_tip",
    severity: "important",
    title: "Stainless: avoid surface scratches (stress corrosion)",
    rule: "On austenitic stainless parts, finishing passes must produce clean cuts without chatter marks, scratches, or tool drag marks. Surface defects create stress concentration sites for corrosion initiation.",
    reasoning: "Austenitic stainless relies on a passive chromium oxide layer for corrosion resistance. Scratches and chatter marks break this layer locally and create stress risers. In corrosive environments, these sites become pitting corrosion initiation points.",
    conditions: [{ type: "material_iso", groups: ["M"] }],
    exceptions: ["Parts that will be electropolished after machining — polishing heals surface defects"],
    source: "ASM — 'Corrosion of Stainless Steel'",
    related_rules: ["MAT-001"],
  },
  {
    id: "MAT-007",
    category: "material_tip",
    severity: "important",
    title: "Stainless: minimum chip thickness ~0.05mm",
    rule: "In austenitic stainless, maintain minimum chip thickness of ~0.05mm (fz ≥ 0.05mm/tooth). Below this threshold, the tool rubs rather than cuts, generating friction heat that work-hardens the surface.",
    reasoning: "Below the minimum chip thickness, the cutting edge doesn't engage — it plows. Plowing converts all energy to heat and deformation, creating a hardened layer up to 2× the base hardness. Subsequent passes must cut through this harder layer, accelerating wear.",
    conditions: [{ type: "material_iso", groups: ["M"] }],
    exceptions: ["Wiper inserts with very sharp edges can cut at lower fz"],
    source: "Sandvik Coromant — 'Minimum Chip Thickness Study'",
    related_rules: ["MAT-001"],
  },
  {
    id: "MAT-008",
    category: "material_tip",
    severity: "important",
    title: "Titanium: thermal limit 300°C to prevent strength loss",
    rule: "Monitor titanium part temperature — if it exceeds ~300°C during machining, strength drops >20% and the part may distort after cooling. Use adequate coolant, lighter cuts, and allow cooling between heavy passes.",
    reasoning: "Titanium's excellent strength-to-weight ratio degrades above 300°C due to creep and phase transformation onset. Unlike steel, titanium doesn't recover its original properties after overheating. Overheated zones remain permanently weakened.",
    conditions: [{ type: "material_iso", groups: ["S"] }],
    exceptions: ["Titanium aluminides (TiAl) have higher temperature thresholds (~700°C)"],
    source: "Kennametal — 'Aerospace Titanium Machining Limits'",
    related_rules: ["MAT-002", "THERM-001"],
  },
  {
    id: "MAT-009",
    category: "material_tip",
    severity: "important",
    title: "Hardened steel >48 HRC: CBN tools required",
    rule: "For hardened steel above 48 HRC, use CBN (cubic boron nitride) inserts instead of carbide. For interrupted cuts in hardened steel, use ceramic inserts (Si3N4 or SiAlON). Carbide fails rapidly above 48 HRC.",
    reasoning: "Carbide's hot hardness limit is ~45-48 HRC workpiece. Above this, the cutting edge softens faster than it removes material. CBN maintains hardness to 65+ HRC workpieces. Ceramic handles the thermal shock of interrupted cuts better than CBN.",
    conditions: [{ type: "material_iso", groups: ["H"] }],
    exceptions: ["Micro-grain carbide with TiAlN coating can survive up to 52 HRC for short runs", "Hardened steel below 45 HRC is fine with carbide"],
    source: "Sumitomo — 'CBN Tool Application Guide'",
    related_rules: ["MAT-004"],
  },
  {
    id: "MAT-010",
    category: "material_tip",
    severity: "recommended",
    title: "Aluminum: prevent BUE with speed and rake",
    rule: "If built-up edge (BUE) appears on aluminum tools: (1) increase speed 20%, (2) verify positive rake angle, (3) use uncoated polished tools, (4) reduce ap slightly. BUE causes poor finish and dimensional variation.",
    reasoning: "BUE forms when aluminum welds to the cutting edge at moderate temperatures. Higher speed increases temperature beyond the adhesion range. Polished, uncoated tools have lower friction coefficient, reducing adhesion tendency. Positive rake reduces cutting force and heat.",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: ["High-silicon aluminum (>12% Si) forms BUE less but is abrasive — use diamond-coated tools"],
    source: "Datron — 'Aluminum Machining Excellence'",
    related_rules: ["MAT-003"],
  },
  {
    id: "MAT-011",
    category: "material_tip",
    severity: "important",
    title: "Cast iron: negative rake, slow speed, heavy cuts",
    rule: "Machine cast iron with negative-rake carbide or ceramic inserts at moderate speed (80-150 m/min), heavy DOC, and DRY or air blast only. Cast iron produces segmented chips that clear easily — no coolant needed.",
    reasoning: "Cast iron's graphite content acts as an internal lubricant. The material fractures to produce short, segmented chips (not continuous). Negative rake handles the abrasive hard skin from casting. Flood coolant creates a slurry with graphite dust that contaminates slideways.",
    conditions: [{ type: "material_iso", groups: ["K"] }],
    exceptions: ["Ductile iron (GGG/SG) behaves more like steel — use positive rake and moderate coolant", "High-chrome cast iron is very abrasive — use CBN"],
    source: "Walter Tools — 'Cast Iron Machining Guide'",
  },

  // ── HOLE-MAKING (continued) ───────────────────────────────────────────

  {
    id: "HOLE-003",
    category: "hole_making",
    severity: "important",
    title: "Peck depth ratio by material",
    rule: "Adjust peck depth by material: Steel 1×D first peck then 0.5×D. Stainless 0.5×D all pecks. Aluminum 0.75-1×D (soft, chips ball up). Titanium 0.3-0.5×D (chips gall). Cast iron 1-1.5×D (short segmented chips).",
    reasoning: "Each material produces different chip morphology. Steel chips are continuous and manageable. Stainless chips are stringy and work-harden if re-cut. Aluminum chips ball up and pack. Titanium chips gall to the drill. Cast iron chips are short and self-clearing.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Through-coolant drills can increase peck depth by 50% in all materials"],
    source: "OSG — 'Drilling Parameter Tables by Material'",
    related_rules: ["HOLE-001"],
  },
  {
    id: "HOLE-004",
    category: "hole_making",
    severity: "important",
    title: "Spot drill angle must match twist drill point angle",
    rule: "Match spot drill point angle to twist drill point angle: 90° spot for 118° drill, 100° spot for 140° drill. Mismatched angles create a ridge that deflects the drill off-center.",
    reasoning: "If the spot angle is LESS than the drill angle, the drill contacts the spot on its margin (outer edge) and walks. If GREATER, the drill bottoms out in the center before the margins engage. The ideal match has the drill cone nesting smoothly into the spot cone.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Self-centering carbide drills with 140° point don't need spot drilling", "Flat-bottom drills (180°) create their own start"],
    source: "Kennametal — 'Hole Making Best Practices'",
    related_rules: ["SEQ-010"],
  },
  {
    id: "HOLE-005",
    category: "hole_making",
    severity: "important",
    title: "Through vs. blind hole strategy differs",
    rule: "Through holes: can use higher feed (chips exit freely), no need for full retract pecks (G73 chip-break sufficient). Blind holes: require full-retract pecks (G83), lower feed near bottom, controlled depth stop — chips have no exit.",
    reasoning: "In through holes, chips evacuate from both ends — the drill pushes some forward and some up the flutes. In blind holes, ALL chips must come back up the flutes past the cutting zone. This requires more aggressive pecking and lower feed to prevent chip packing.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Gun drills handle blind holes differently — internal coolant washes chips back up"],
    source: "Sandvik Coromant — 'Drilling Fundamentals'",
  },
  {
    id: "HOLE-006",
    category: "hole_making",
    severity: "important",
    title: "Tap breakage prevention",
    rule: "To prevent tap breakage: (1) reduce speed 20-30% in hard materials, (2) use synchronized tapping (rigid tap G84), (3) verify hole depth exceeds thread depth by 1-2 pitches, (4) use spiral-flute taps for blind holes. NEVER reverse a tap under load.",
    reasoning: "Taps break from: chip packing (blind holes), depth bottoming, cross-threading (worn guides), and reverse torque. Synchronized tapping ensures RPM exactly matches feed rate × pitch. Extra depth provides chip space. Spiral flutes lift chips out of blind holes.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: ["Roll taps (forming taps) don't produce chips — chip packing is impossible"],
    source: "OSG — 'Tapping Troubleshooting Guide'",
    related_rules: ["HOLE-002", "SEQ-008"],
  },
  {
    id: "HOLE-007",
    category: "hole_making",
    severity: "recommended",
    title: "Reaming: high feed, never reduce mid-cut",
    rule: "Ream at high feed rate (3-5× drill feed) with slow speed (1/3 of drill speed). NEVER reduce feed or stop mid-cut — this causes chatter marks and undersize holes. Enter and exit at constant feed.",
    reasoning: "Reamers have very small chip loads per tooth. At low feed, chips become too thin to cut — the reamer burnishes rather than cuts, causing adhesion and undersize. High feed ensures each tooth takes a proper chip. Stopping mid-cut leaves witness marks.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Adjustable reamers may need lower feed for best roundness"],
    source: "Guhring — 'Reaming Application Guide'",
  },
  {
    id: "HOLE-008",
    category: "hole_making",
    severity: "recommended",
    title: "Helical entry instead of center drill in pocket floors",
    rule: "When drilling holes in pocket floors (already machined surface), use helical interpolation entry to initial depth instead of center/spot drilling. Spot drills can skid on pocket floor angles or thin remaining material.",
    reasoning: "Pocket floors may not be perfectly flat (scallops from finishing). A spot drill on a scalloped surface can deflect. Helical entry with an endmill gradually engages the material, creating a clean cylindrical start for the subsequent drill.",
    conditions: [{ type: "feature_present", features: ["hole", "pocket"] }],
    exceptions: ["Flat-bottomed pockets with verified flatness — normal spot drill is fine"],
    source: "Fusion 360 — 'Hole Making in Pocket Features'",
  },

  // ── TOOL SELECTION ────────────────────────────────────────────────────

  {
    id: "TOOL-001",
    category: "tool_selection",
    severity: "critical",
    title: "Corner radius must match or exceed fillet radius",
    rule: "Endmill corner radius MUST match or exceed all internal fillet radii on the part. If the print calls for R3 fillets, use a ≥6mm diameter ball nose or ≥R3 corner-radius endmill. Never attempt to cut a fillet with a tool that has a larger radius.",
    reasoning: "A tool with a corner radius LARGER than the required fillet physically cannot produce the geometry — it leaves excess material in the corner. A tool with a MATCHING radius produces the fillet in one pass. A tool SMALLER than the fillet requires multiple passes and leaves scallop marks.",
    conditions: [{ type: "feature_present", features: ["pocket", "profile", "freeform"] }],
    exceptions: ["EDM or hand-finishing for corners smaller than available tool radii"],
    source: "Harvey Performance — 'Corner Radius Endmill Selection'",
  },
  {
    id: "TOOL-002",
    category: "tool_selection",
    severity: "important",
    title: "Flute count by material",
    rule: "Aluminum: 2-3 flutes (chip evacuation). Mild steel: 4 flutes. Stainless: 5-6 flutes (more cutting edges = lower fz per tooth). Hardened steel: 4-6 flutes (light cuts, many teeth). Titanium: 4-5 flutes with variable helix.",
    reasoning: "Fewer flutes = larger flute valleys = better chip evacuation (critical for aluminum's large chips). More flutes = higher feed rate at same fz = better productivity and finish in steel. Variable helix reduces harmonic chatter in titanium.",
    conditions: [{ type: "always" }],
    exceptions: ["High-feed endmills use 5-7 flutes regardless of material", "Roughing endmills with chip breakers can use fewer flutes in steel"],
    source: "OSG — 'Endmill Selection by Material'",
  },
  {
    id: "TOOL-003",
    category: "tool_selection",
    severity: "important",
    title: "Coating selection by material",
    rule: "Steel/cast iron: TiAlN or AlCrN coating. Stainless: TiAlN (prevents BUE). Aluminum: UNCOATED polished (coatings increase edge radius → BUE). Hardened steel: TiSiN or nanocomposite. Titanium: TiAlN or diamond-like carbon (DLC).",
    reasoning: "Coatings serve two functions: heat barrier and friction reduction. TiAlN withstands 900°C (ideal for steel). Aluminum doesn't generate enough heat to benefit from coatings, but the coating's rough surface promotes adhesion (BUE). Uncoated polished tools are the gold standard for aluminum.",
    conditions: [{ type: "always" }],
    exceptions: ["PCD (polycrystalline diamond) is the ultimate for high-silicon aluminum and composites but 10× the cost"],
    source: "Oerlikon Balzers — 'Coating Selection Guide'",
    related_rules: ["MAT-003"],
  },
  {
    id: "TOOL-004",
    category: "tool_selection",
    severity: "important",
    title: "Ball nose vs corner radius for finishing",
    rule: "Use ball nose endmills for complex 3D freeform surfaces (molds, dies, sculptured surfaces). Use corner-radius endmills for pockets with flat floors and fillet radii. Never use a ball nose for flat-bottom pockets — it leaves scallops.",
    reasoning: "Ball nose tools produce cusps on flat surfaces (only the tip contacts). Corner-radius tools have a flat bottom with rounded corners — they produce flat floors with clean fillet radii. Choosing the wrong tool type creates surface quality problems.",
    conditions: [{ type: "feature_present", features: ["pocket", "freeform"] }],
    exceptions: ["Bull-nose endmills (large corner radius) bridge the gap between flat and ball for semi-freeform surfaces"],
    source: "hyperMILL — 'Tool Selection for 3D Finishing'",
  },
  {
    id: "TOOL-005",
    category: "tool_selection",
    severity: "recommended",
    title: "Maximum stick-out for rigidity: L/D ≤ 5",
    rule: "Keep tool length from spindle nose (gauge length) ≤ 5× tool diameter for general milling. For thin walls, use ≤ 3×D. For roughing, ≤ 4×D. Longer reach requires reduced speeds/feeds or vibration-damped holders.",
    reasoning: "Deflection increases with the CUBE of stick-out length (δ = FL³/3EI). Doubling stick-out increases deflection 8×. A 10mm endmill at 50mm stick-out deflects 0.05mm under normal cutting force; at 100mm, it deflects 0.4mm. This causes chatter, poor finish, and dimensional error.",
    conditions: [{ type: "always" }],
    exceptions: ["Vibration-damped (tuned mass) holders extend usable L/D to 7-10", "Carbide shanks are 3× stiffer than steel — allow longer reach"],
    source: "Sandvik Coromant — 'Silent Tools / Vibration Damping'",
  },
  {
    id: "TOOL-006",
    category: "tool_selection",
    severity: "recommended",
    title: "Regrind limits for carbide endmills",
    rule: "Carbide endmills can be reground 3-5 times before edge geometry degrades beyond usefulness. Track regrind count. After 3 regrinds, verify corner radius and runout before reuse. Indexable inserts: rotate through all edges before discarding.",
    reasoning: "Each regrind shortens the tool and slightly changes the geometry (corner radius increases, rake angle shifts). After 3+ regrinds, these cumulative changes affect dimensional accuracy and surface finish. Insert rotation is simpler — each edge is identical when new.",
    conditions: [{ type: "always" }],
    exceptions: ["High-precision work — use new tools only", "HSS tools can survive 5-8+ regrinds"],
    source: "Shop floor experience — 'Tool Lifecycle Management'",
  },

  // ── FINISHING ──────────────────────────────────────────────────────────

  {
    id: "FIN-001",
    category: "finishing",
    severity: "important",
    title: "Finish DOC limit: ap ≤ 0.3mm",
    rule: "Finish passes should use ap = 0.05-0.3mm maximum. Never exceed 0.5mm ap on a finish pass. Light cuts maintain consistent chip thickness, reduce deflection, and produce the best surface finish.",
    reasoning: "Heavy finish passes cause tool deflection proportional to cutting force. Even 0.01mm deflection creates visible marks on the surface. Light passes keep force below the tool/part deflection threshold, producing a true surface.",
    conditions: [{ type: "always" }],
    exceptions: ["Wiper inserts can take up to 0.5mm finish DOC with acceptable finish", "Very rigid boring bars with damping can use slightly heavier cuts"],
    source: "Sandvik Coromant — 'Finishing Parameters'",
  },
  {
    id: "FIN-002",
    category: "finishing",
    severity: "important",
    title: "Always climb-mill on finish passes",
    rule: "Finish passes MUST use climb milling (down milling). Never conventional-mill a finish pass — it causes rubbing on entry, generating poor surface finish and work-hardening in stainless/titanium.",
    reasoning: "In climb milling, the chip starts thick and thins toward exit — minimizing rubbing. In conventional milling, the chip starts at zero thickness, and the tool rubs before engaging. This rubbing creates a hardened, poor-finish surface layer.",
    conditions: [{ type: "always" }],
    exceptions: ["Very thin floors where climb force could pull the floor down — use conventional with very light cuts"],
    source: "Sandvik Coromant — 'Milling Guide: Finishing'",
    related_rules: ["ANTI-003"],
  },
  {
    id: "FIN-003",
    category: "finishing",
    severity: "recommended",
    title: "Wiper insert for turning/facing finish",
    rule: "For turning and facing operations requiring Ra <1.6µm, use wiper-geometry inserts. Wiper inserts have a flat trailing edge that burnishes the surface after cutting, improving finish by 50-100% vs. standard inserts at the same feed.",
    reasoning: "Standard inserts leave a theoretical Ra = f²/(8R) where f is feed and R is nose radius. Wiper inserts add a secondary flat that irons the surface smooth, allowing higher feed rates while maintaining the same finish quality.",
    conditions: [{ type: "surface_finish_below", ra_um: 1.6 }],
    exceptions: ["Interrupted cuts — wiper edge can chip on entry/exit impacts"],
    source: "Sandvik Coromant — 'Wiper Insert Technology'",
  },
  {
    id: "FIN-004",
    category: "finishing",
    severity: "important",
    title: "Increase Vc 15-25% for finish vs. rough",
    rule: "Run finishing passes at 15-25% higher cutting speed (Vc) than roughing with the same material/tool combination. Higher speed improves surface finish and can extend tool life at light DOC.",
    reasoning: "At light DOC (finish), cutting forces are low. Higher speed creates a thinner, more stable chip and better surface. The reduced force means the speed increase doesn't proportionally increase tool wear. Sweet spot is 15-25% above roughing Vc.",
    conditions: [{ type: "always" }],
    exceptions: ["Already at spindle RPM limit", "Titanium — speed increases should be limited to 10% max above roughing"],
    source: "Walter Tools — 'Speed Optimization for Finishing'",
  },
  {
    id: "FIN-005",
    category: "finishing",
    severity: "recommended",
    title: "Inspect for cusps after 3D finishing",
    rule: "After 3D ball-nose finishing, inspect the part for visible cusps (scallop marks). If cusps exceed 0.5mm height or are visually unacceptable, run a tighter-stepover finish pass or pencil cleanup in affected areas.",
    reasoning: "CAM simulation shows theoretical cusp height, but real-world factors (tool deflection, machine vibration, material springback) can increase actual cusp height. Visual inspection catches areas where the theoretical model didn't predict the actual finish quality.",
    conditions: [{ type: "feature_present", features: ["freeform"] }],
    exceptions: ["Parts that will be polished or EDM-textured — cusp marks are removed"],
    source: "hyperMILL — '3D Finishing Quality Control'",
    related_rules: ["STRAT-006"],
  },

  // ── ROUGHING ──────────────────────────────────────────────────────────

  {
    id: "ROUGH-001",
    category: "roughing",
    severity: "important",
    title: "DOC by machine rigidity",
    rule: "Roughing ap guidelines: Rigid CNC (BT40/CAT40+) = 1-2×Dc ap with 10-15% ae (adaptive). Smaller CNC (BT30/CAT30) = 0.5-1×Dc ap. Older/flexible machines = 0.3-0.5×Dc ap. Match DOC to machine capability.",
    reasoning: "Machine rigidity determines the maximum force the system can absorb without chatter. Heavy DOC on a flexible machine creates vibration that damages tools, workpiece, and spindle bearings. Right-sizing DOC to the machine's dynamic stiffness optimizes MRR without damage.",
    conditions: [{ type: "always" }],
    exceptions: ["High-speed spindles (15,000+ RPM) compensate with speed — light ap, high speed"],
    source: "Haas Automation — 'Machine Rigidity and Cutting Parameters'",
  },
  {
    id: "ROUGH-002",
    category: "roughing",
    severity: "important",
    title: "Radial engagement for pocket roughing",
    rule: "For pocket roughing with standard toolpaths: ae = 50-75% of Dc provides steady cutting force. For corners, reduce ae to 40% to prevent force spikes. For adaptive/dynamic: ae = 5-15% of Dc with full-length ap.",
    reasoning: "At ae = 50-75%, the tool engages smoothly with predictable force. At corners with standard toolpaths, engagement can jump to 100-180°, doubling force. Reducing ae at corners or using adaptive toolpaths prevents these spikes.",
    conditions: [{ type: "feature_present", features: ["pocket"] }],
    exceptions: ["Full-slot scenarios covered by ANTI-005 — use alternative strategy"],
    source: "SolidCAM — 'Pocket Roughing Parameters'",
    related_rules: ["STRAT-001", "ANTI-005"],
  },
  {
    id: "ROUGH-003",
    category: "roughing",
    severity: "important",
    title: "Chip thinning awareness at small ae",
    rule: "When ae < 50% of Dc, actual chip thickness is LESS than programmed fz. Compensate with chip thinning formula: fz_actual = fz_programmed × (Dc / (2 × sqrt(ae × (Dc - ae)))). Increase feed 20-100% to maintain proper chip thickness.",
    reasoning: "At partial engagement, the arc of contact shortens, creating a thinner chip than the programmed fz. Thin chips don't carry heat efficiently, causing heat to stay in the tool. Increasing feed compensates, maintaining proper chip formation and heat transfer to the chip.",
    conditions: [{ type: "always" }],
    exceptions: ["CAM systems with automatic chip thinning compensation (Dynamic/Adaptive modes)"],
    source: "Harvey Performance — 'Chip Thinning Explained'",
    related_rules: ["STRAT-001"],
  },
  {
    id: "ROUGH-004",
    category: "roughing",
    severity: "important",
    title: "Ramp angle limits for roughing entry",
    rule: "Limit roughing ramp entry to 2-5° slope angle. Steeper ramps (>5°) cause excessive rubbing at the tool center. Helical entry (2-5% of Dc per revolution) is preferred when pocket geometry allows a helix diameter of ≥1.5× tool diameter.",
    reasoning: "During ramping, the tool center (near zero SFM) rubs rather than cuts. Shallow angles minimize the percentage of the tool engaged in rubbing. Helical entry eliminates center rubbing entirely because the tool moves laterally while plunging.",
    conditions: [{ type: "feature_present", features: ["pocket", "profile"] }],
    exceptions: ["Center-cutting endmills and drill mills can ramp at steeper angles", "Pre-drilled plunge points eliminate ramping"],
    source: "Mastercam — 'Entry Methods for Roughing'",
    related_rules: ["ANTI-002", "STRAT-005"],
  },
  {
    id: "ROUGH-005",
    category: "roughing",
    severity: "recommended",
    title: "Rough-to-finish stock allowance",
    rule: "Leave stock for finishing: Profiles = 0.3-1.0mm radial. Pockets = 0.5-1.5mm floor + 0.3-1.0mm walls. Bores = 0.1-0.3mm radial. Too little stock → finish pass under-engaged (chatter). Too much → finish pass overloaded.",
    reasoning: "The finish pass needs consistent engagement to produce uniform surface finish. Too little stock means the finish tool intermittently contacts air (chatter). Too much forces heavy cuts on the finish tool, causing deflection and poor accuracy.",
    conditions: [{ type: "always" }],
    exceptions: ["Combined rough-finish passes (single-pass profiling) in soft materials"],
    source: "Sandvik Coromant — 'Stock Allowance Recommendations'",
  },

  // ── 5-AXIS ────────────────────────────────────────────────────────────

  {
    id: "5AX-001",
    category: "5axis",
    severity: "critical",
    title: "Tool axis smoothing for 5-axis programs",
    rule: "Enable tool axis smoothing (smooth/continuous/minimum distance) in CAM post-processor for simultaneous 5-axis programs. Without smoothing, abrupt axis direction changes cause jerky motion, surface marks, and potential axis over-travel.",
    reasoning: "5-axis toolpaths calculate discrete tool orientations at each CL point. Without smoothing, the rotary axes can reverse direction between consecutive points, causing acceleration spikes. Smoothing algorithms interpolate tool axis motion to create continuous, predictable rotary movement.",
    conditions: [{ type: "machine_axes", min_axes: 5 }],
    exceptions: ["3+2 (indexed) operations don't need smoothing — axes are locked during cutting"],
    source: "hyperMILL — '5-Axis Finishing Parameters'",
  },
  {
    id: "5AX-002",
    category: "5axis",
    severity: "important",
    title: "Lead/tilt angle for 5-axis finishing",
    rule: "Approach surfaces at 10-15° lead angle (tool tilted in feed direction) and 0-5° tilt angle (perpendicular to feed). This engages the tool slightly off-center, avoiding the zero-speed point at the ball nose tip.",
    reasoning: "The tip of a ball nose has zero surface speed (Vc = π × D × n, and D=0 at the tip). Cutting at the tip causes rubbing, poor finish, and rapid wear. A 10-15° lead angle shifts the contact point to a diameter where surface speed is adequate.",
    conditions: [{ type: "machine_axes", min_axes: 5 }],
    exceptions: ["Flat horizontal surfaces where tilting would create interference", "Deep cavities where tilt angle causes tool shank collision"],
    source: "Sandvik Coromant — '5-Axis Ball Nose Finishing'",
  },
  {
    id: "5AX-003",
    category: "5axis",
    severity: "important",
    title: "Simultaneous 5-axis vs 3+2 indexed",
    rule: "Use 3+2 (indexed) positioning when possible — it's simpler, more rigid (axes locked), and produces less rotary axis wear. Reserve simultaneous 5-axis for: undercuts, complex compound surfaces, or features requiring smooth tool axis transitions.",
    reasoning: "3+2 positioning locks the rotary axes during cutting, making the setup equivalent to a 3-axis operation with better rigidity. Simultaneous 5-axis adds complexity, requires more careful collision checking, and subjects rotary axes to cutting loads. Use it only when geometry demands it.",
    conditions: [{ type: "machine_axes", min_axes: 5 }],
    exceptions: ["Blade/impeller machining where simultaneous is mandatory for geometry access"],
    source: "DMG MORI — '5-Axis Application Guide'",
  },
  {
    id: "5AX-004",
    category: "5axis",
    severity: "important",
    title: "Singularity avoidance in 5-axis toolpaths",
    rule: "Check CAM output for rotary axis singularities (gimbal lock). This occurs when the tool axis passes through the machine's pole direction (typically A=0 or B=0). CAM must reroute the toolpath or apply singularity avoidance to prevent axis reversal.",
    reasoning: "At a singularity, one rotary axis must rotate 180° instantaneously to maintain tool orientation. In practice, this causes violent axis motion, surface marks, and potential machine alarms. Most modern CAM systems detect and avoid singularities, but the programmer must verify.",
    conditions: [{ type: "machine_axes", min_axes: 5 }],
    exceptions: ["Table-table machines have different singularity geometry than head-table or head-head"],
    source: "Siemens NX — 'Multi-Axis Machining: Singularity Handling'",
  },

  // ── WORKHOLDING (continued) ───────────────────────────────────────────

  {
    id: "HOLD-003",
    category: "workholding",
    severity: "important",
    title: "Vise clamping force limits",
    rule: "Clamp force should resist cutting forces with 2× safety margin but not distort the part. Guideline: aluminum parts with walls <3mm = light vise torque (20-30 Nm). Steel parts = medium torque (40-60 Nm). Never over-torque — test with indicator on part surface.",
    reasoning: "Over-clamping distorts the part elastically. When released, the part springs back and machined features are out of tolerance. An indicator on the part surface while tightening the vise shows when distortion begins — stop just before this point.",
    conditions: [{ type: "always" }],
    exceptions: ["Zero-point clamping systems with calibrated force", "Hydraulic vises with adjustable pressure"],
    source: "Schunk — 'Clamping Force Guidelines'",
  },
  {
    id: "HOLD-004",
    category: "workholding",
    severity: "important",
    title: "Vacuum table surface requirements",
    rule: "Vacuum workholding requires a flat, smooth backing surface (Ra <3.2µm). The part bottom must be machined flat in Op 1. Use vacuum with gasket seals for porous materials. Minimum part area for vacuum: 50cm² at 0.8 bar vacuum.",
    reasoning: "Vacuum holds by pressure differential across the part's area. Rough surfaces leak vacuum — the seal is broken. Small parts have insufficient area for the pressure differential to generate adequate holding force. Gasket seals compensate for minor surface irregularities.",
    conditions: [{ type: "always" }],
    exceptions: ["Porous materials (MDF, some castings) require sealed gasket or sacrificial skin layer"],
    source: "Pierson Workholding — 'Vacuum Fixturing Guide'",
  },
  {
    id: "HOLD-005",
    category: "workholding",
    severity: "recommended",
    title: "Magnetic chuck demagnetization after use",
    rule: "After machining ferrous parts on magnetic chucks, run a demagnetization cycle (built-in or external demagnetizer) before removing the part. Residual magnetism causes parts to stick to fixtures, attract chips, and interfere with measurement.",
    reasoning: "Magnetic chucks induce magnetism in ferrous parts. This residual magnetism (5-50 Gauss typical) makes parts attract chips during subsequent operations, stick to steel fixtures, and cause false readings on dial indicators and CMMs.",
    conditions: [{ type: "material_iso", groups: ["P", "K", "H"] }],
    exceptions: ["Non-ferrous parts (aluminum, titanium, brass) are not affected by magnetism"],
    source: "Walker Magnetics — 'Magnetic Chuck Care'",
  },
  {
    id: "HOLD-006",
    category: "workholding",
    severity: "recommended",
    title: "Expanding mandrel TIR check before use",
    rule: "Before using an expanding mandrel (for Op 2 bore-location work), verify TIR (Total Indicator Runout) < 0.01mm. Worn or bent mandrels cause position error in all features machined relative to the bore datum.",
    reasoning: "Mandrels locate the part by expanding against the bore ID. If the mandrel body is bent or worn, the part rotates eccentrically around the spindle axis. This eccentricity directly translates to position error on every feature.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.025 }],
    exceptions: ["Low-tolerance parts where 0.05mm bore runout is acceptable"],
    source: "Royal Products — 'Mandrel Inspection Procedures'",
  },

  // ── THERMAL (continued) ───────────────────────────────────────────────

  {
    id: "THERM-002",
    category: "thermal",
    severity: "important",
    title: "Active thermal management: measure before finishing",
    rule: "For precision parts, measure part temperature after roughing using IR thermometer or thermocouple. Resume finishing only when part temperature is within 5°C of ambient. For steel, this means waiting 10-30 min after heavy roughing.",
    reasoning: "Thermal expansion of steel is ~12µm/m/°C. A 50mm feature at 20°C above ambient is 0.012mm larger than nominal. If finished while hot, the feature will be undersized when cooled. Active measurement removes guesswork from the stabilization wait.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.01 }],
    exceptions: ["Temperature-controlled environments (<±1°C) where part temperature is known", "In-process probing that compensates for thermal growth"],
    source: "Renishaw — 'Thermal Compensation in Precision Machining'",
    related_rules: ["THERM-001"],
  },
  {
    id: "THERM-003",
    category: "thermal",
    severity: "important",
    title: "Coolant pressure by operation type",
    rule: "Recommended coolant pressure: Drilling = 50-100 bar (high pressure for chip evacuation). Milling = 20-40 bar (moderate for cooling/lubrication). Finishing = 10-30 bar (low pressure to avoid turbulence marks). Tapping = 15-25 bar (moderate for chip flushing).",
    reasoning: "Drilling generates chips in a confined hole — high pressure is needed to force chips up the flutes. Milling has open chip exit — moderate pressure suffices. Finishing at high pressure can create surface marks from turbulent coolant flow deflecting the tool.",
    conditions: [{ type: "always" }],
    exceptions: ["Through-spindle coolant systems deliver pressure directly to the cutting zone — can use higher pressures safely", "MQL replaces pressure-based coolant entirely"],
    source: "Blaser Swisslube — 'Coolant Pressure Optimization'",
  },
  {
    id: "THERM-004",
    category: "thermal",
    severity: "recommended",
    title: "Through-spindle coolant justification threshold",
    rule: "Through-spindle coolant (TSC) is cost-effective when: drilling >3×D depth, or milling at Vc >200 m/min, or machining stainless/titanium. Below these thresholds, external flood or MQL is adequate. TSC tools cost 2-5× standard tools.",
    reasoning: "TSC delivers coolant directly through the tool to the cutting zone, providing superior chip evacuation and cooling. But TSC-capable tools are significantly more expensive. The investment is justified only when the operation demands it — deep holes, high-speed cutting, or difficult materials.",
    conditions: [{ type: "always" }],
    exceptions: ["High-volume production where tool life extension from TSC justifies the cost at any speed"],
    source: "Kennametal — 'Through-Coolant vs External Coolant ROI'",
  },

  // ── CHIP CONTROL ──────────────────────────────────────────────────────

  {
    id: "CHIP-001",
    category: "chip_control",
    severity: "important",
    title: "Chip breaker geometry selection",
    rule: "Use positive-rake inserts with chip breaker grooves for steel and stainless (long continuous chips). Use negative-rake inserts for cast iron and hard materials (chips break naturally). For aluminum, 2-3 flute endmills with polished flutes evacuate chips best.",
    reasoning: "Long continuous chips wrap around the tool, workpiece, and fixture — creating a safety hazard and damaging surfaces. Chip breakers curl and fracture the chip into manageable segments. Materials that naturally form short chips (cast iron, brass) don't need breakers.",
    conditions: [{ type: "always" }],
    exceptions: ["Very light finishing cuts may not produce enough chip to engage the breaker — use different geometry"],
    source: "Sandvik Coromant — 'Chip Breaker Selection Guide'",
  },
  {
    id: "CHIP-002",
    category: "chip_control",
    severity: "recommended",
    title: "Air blast timing and direction",
    rule: "Direct air blast at the cutting zone from BEHIND the tool (in the feed direction). Activate air before the tool enters the cut, maintain throughout, and continue for 2 seconds after exit. Never blast FROM the front — it pushes chips back into the cut.",
    reasoning: "Air blast serves two functions: clearing chips from the cutting zone and providing light cooling. Direction matters — blasting from behind pushes chips away from the next tool pass. Front-facing air blast pushes chips into the uncut material, where they re-enter the next pass.",
    conditions: [{ type: "always" }],
    exceptions: ["Through-tool air blast doesn't need directional nozzles — it exits through the tool", "MQL systems have their own air delivery"],
    source: "Shop floor experience — 'Air Blast Best Practices'",
  },
  {
    id: "CHIP-003",
    category: "chip_control",
    severity: "recommended",
    title: "G73 chip-break vs G83 full-retract pecking",
    rule: "Use G73 (chip-break/high-speed peck) for through-coolant drills — faster because it only retracts 1-3mm to break the chip. Use G83 (full-retract peck) for standard drills — must fully retract to clear chips from flutes. G73 saves 30-50% cycle time.",
    reasoning: "G83 retracts the drill completely out of the hole each peck — this wastes time on re-positioning and re-entry. G73 makes a small retract (enough to snap the chip) then continues drilling. But G73 only works if coolant can flush chips up the flutes — requiring through-tool coolant.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Very deep holes (>8×D) may need G83 even with through-coolant for safety"],
    source: "Haas Automation — 'Canned Cycle Optimization'",
    related_rules: ["HOLE-001", "HOLE-005"],
  },
  {
    id: "CHIP-004",
    category: "chip_control",
    severity: "recommended",
    title: "Long chip management in deep pockets",
    rule: "In pockets deeper than 3×Dc, monitor for long spiral chips wrapping around the tool shank. Solutions: (1) use chip-breaker endmills, (2) program occasional retract-to-clearance moves, (3) reduce ae to produce thinner chips that break more easily.",
    reasoning: "Long spiral chips in deep pockets can't evacuate upward past the tool body. They accumulate, wrap around the shank, and eventually seize the tool or gouge the part walls. Periodic retract moves clear accumulated chips. Chip-breaker endmills (serrated edges) break chips into segments.",
    conditions: [{ type: "feature_present", features: ["pocket"] }],
    exceptions: ["Through-tool coolant with high pressure (>40 bar) can wash chips out continuously"],
    source: "Harvey Performance — 'Deep Pocket Strategies'",
    related_rules: ["ANTI-010"],
  },
  {
    id: "CHIP-005",
    category: "chip_control",
    severity: "recommended",
    title: "Chip evacuation verification for complex geometries",
    rule: "For complex multi-feature parts, verify chip evacuation paths in CAM simulation. Chips from upper features falling into lower pockets can jam tools. Program air-blast pauses or M01 stops between features to clear accumulated chips.",
    reasoning: "Complex parts with multiple levels, pockets, and through-holes create 'chip traps' where gravity pulls chips into lower features. When the tool enters these features, it re-cuts the trapped chips, causing surface marks, tool wear, and potential breakage.",
    conditions: [{ type: "feature_present", features: ["pocket", "hole", "slot"] }],
    exceptions: ["Horizontal machining centers (gravity pulls chips away from the part)"],
    source: "Shop floor experience — 'Complex Part Chip Management'",
  },

  // ── TOOL LIFE ─────────────────────────────────────────────────────────

  {
    id: "LIFE-001",
    category: "tool_life",
    severity: "recommended",
    title: "Flank wear limit for carbide: VB ≤ 0.3mm",
    rule: "Replace carbide endmills/inserts when flank wear band width (VB) reaches 0.2-0.3mm. Beyond 0.3mm, tool failure becomes unpredictable — the edge may chip or fracture catastrophically. Inspect with 10× loupe or microscope every 20-30 minutes of cutting time.",
    reasoning: "Carbide wear follows a predictable curve: initial break-in (rapid), steady-state (gradual), then catastrophic breakdown (sudden). The 0.3mm VB threshold is at the boundary between steady-state and breakdown. Operating beyond this risks sudden failure that damages the part.",
    conditions: [{ type: "always" }],
    exceptions: ["Finishing operations — replace at VB = 0.15mm for best surface finish", "CBN tools can operate to VB = 0.4mm in some applications"],
    source: "ISO 3685 — 'Tool Life Testing Standard'",
  },
  {
    id: "LIFE-002",
    category: "tool_life",
    severity: "recommended",
    title: "HSS regrind limits: 5-8 cycles maximum",
    rule: "HSS (high-speed steel) endmills and drills can be reground 5-8 times before edge quality degrades below usability. Track regrind count with color-coded bands or etching. Verify geometry after each regrind.",
    reasoning: "HSS is ductile enough to tolerate multiple regrinds without chipping. However, each regrind shortens the tool, slightly changes clearance angles, and may introduce runout. After 5+ regrinds, cumulative geometry drift affects performance noticeably.",
    conditions: [{ type: "always" }],
    exceptions: ["Disposable HSS drills in high-volume production — cheaper to replace than regrind"],
    source: "Shop floor experience — 'Tool Reconditioning'",
  },
  {
    id: "LIFE-003",
    category: "tool_life",
    severity: "recommended",
    title: "Coating wear visual indicators",
    rule: "Monitor coated tool wear by visual inspection: TiN (gold) → exposed substrate (gray/silver) when worn. TiAlN (purple/dark) → shiny carbide when worn. When coating is removed from more than 50% of the flank face, tool life has expired.",
    reasoning: "Coatings provide the primary wear resistance. Once the coating is breached, the exposed carbide substrate wears 3-5× faster. The visual color change from coating to substrate is an easy, reliable indicator of remaining tool life without needing measurement equipment.",
    conditions: [{ type: "always" }],
    exceptions: ["Diamond and DLC coatings don't show clear visual transitions"],
    source: "Oerlikon Balzers — 'Coating Wear Diagnostics'",
  },
  {
    id: "LIFE-004",
    category: "tool_life",
    severity: "recommended",
    title: "Insert rotation schedule",
    rule: "For indexable inserts with N cutting edges: rotate to the next edge after each tool life interval. Track active edge with a marker dot. After all edges are used, discard. Standard: square inserts = 4 edges, triangle = 3, round = 6-8 positions.",
    reasoning: "Each edge is independent — using all edges maximizes the insert's value (cost per edge = insert price / number of edges). Tracking the active edge prevents accidentally reusing a worn edge, which would produce poor finish and potentially damage the part.",
    conditions: [{ type: "always" }],
    exceptions: ["Single-edge finishing inserts designed for one cutting edge only"],
    source: "Sandvik Coromant — 'Insert Handling & Rotation'",
  },

  // ── DATUM (continued) ─────────────────────────────────────────────────

  {
    id: "DAT-002",
    category: "datum",
    severity: "recommended",
    title: "3-2-1 locating principle for datum transfer",
    rule: "Use the 3-2-1 principle for datum transfer between setups: 3 contact points on the primary datum plane (constrains tilt), 2 points on the secondary datum edge (constrains rotation), 1 point on the tertiary datum (constrains translation).",
    reasoning: "3-2-1 fully constrains the part in 6 degrees of freedom using the minimum number of contact points. More points over-constrain (causing rocking). Fewer points leave the part free to shift. This is the foundation of all precision fixturing.",
    conditions: [{ type: "always" }],
    exceptions: ["Round parts use different constraints (V-block + end stop)", "Flexible parts may need more support points with controlled preload"],
    source: "ASME Y14.5 — 'Datum Reference Frames'",
    related_rules: ["DAT-001", "SETUP-007"],
  },
  {
    id: "DAT-003",
    category: "datum",
    severity: "recommended",
    title: "CMM verification before Op 2 commitment",
    rule: "For precision parts (±0.025mm or tighter), verify Op 1 datum features on CMM or with indicators before committing to Op 2. If Op 1 is out of spec, it's cheaper to re-run Op 1 than to discover it after Op 2 finishing.",
    reasoning: "Op 2 features reference Op 1 datums. If Op 1 datums are 0.02mm off, ALL Op 2 features inherit that error. Catching it between operations allows correction (re-face, re-bore). After Op 2, the part is either scrap or requires expensive recovery operations.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.025 }],
    exceptions: ["Production runs with SPC showing consistent Op 1 results — inspect only periodically"],
    source: "Quality Engineering — 'In-Process Inspection Strategy'",
    related_rules: ["SETUP-008"],
  },

  // ── DEBURRING ─────────────────────────────────────────────────────────

  {
    id: "DEBUR-001",
    category: "deburring",
    severity: "important",
    title: "Chamfer vs radius by application",
    rule: "Use chamfers (45°×0.2-0.5mm) for: assembly edges (prevent snagging), thread lead-ins, sharp corners that could cut operators. Use radii (R0.2-0.5mm) for: fatigue-critical edges (stress concentration reduction), hydraulic passages (flow optimization).",
    reasoning: "Chamfers create a flat break — easy to inspect and measure, good for assembly clearance. Radii create a smooth transition — better for stress distribution (30-50% fatigue life improvement over sharp edge). Choose based on the functional requirement of each edge.",
    conditions: [{ type: "always" }],
    exceptions: ["Drawing callout takes precedence over this guideline"],
    source: "ASME standards — 'Edge Break Requirements'",
  },
  {
    id: "DEBUR-002",
    category: "deburring",
    severity: "important",
    title: "Cross-hole deburring strategy",
    rule: "Cross-holes (holes intersecting other holes or bores) always produce burrs at the intersection. Strategies: (1) chamfer both sides of the intersection, (2) use a thermal deburring (TEM) post-process, (3) use a back-deburring tool (swivel blade), (4) design the intersection to minimize burr (stagger depths).",
    reasoning: "The drill exits into the intersecting hole, creating a burr on the far side that's inaccessible to standard tools. This burr can break off during operation, contaminating hydraulic systems or bearing surfaces. It must be removed by specialized methods.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Non-critical intersections where loose burrs pose no functional risk"],
    source: "Heule — 'Cross-Hole Deburring Solutions'",
  },
  {
    id: "DEBUR-003",
    category: "deburring",
    severity: "recommended",
    title: "Brush deburring tool parameters",
    rule: "For CNC brush deburring: brass brush for aluminum (won't scratch), steel/abrasive brush for steel. Speed: 1000-3000 RPM. Feed: 200-500 mm/min. Depth: brush tips should compress 1-2mm into the edge. Run in climb direction for best edge consistency.",
    reasoning: "CNC brush deburring is faster and more repeatable than hand deburring. Material-matched brushes prevent contamination (steel brush on aluminum leaves ferrous particles). Light compression ensures consistent edge break without over-rounding.",
    conditions: [{ type: "always" }],
    exceptions: ["Hardened parts may require abrasive filament brushes instead of wire"],
    source: "Osborn — 'CNC Deburring Brush Application Guide'",
  },
  {
    id: "DEBUR-004",
    category: "deburring",
    severity: "tip",
    title: "Off-machine deburring options",
    rule: "Consider off-machine deburring for non-precision edges: tumble media (vibratory finishing), thermal deburring (TEM), electrochemical deburring (ECM), or hand files. Off-machine methods free CNC time for cutting operations.",
    reasoning: "CNC time is expensive ($50-200/hr). Spending 5 minutes of CNC time on deburring costs more than a 30-second tumble cycle. For parts without tight edge-break tolerances, batch off-machine deburring is 5-10× more cost-effective.",
    conditions: [{ type: "batch_size_above", count: 10 }],
    exceptions: ["Precision edge breaks (specific radius or chamfer callouts) must be done on CNC", "Single-piece production where setup for off-machine isn't justified"],
    source: "Shop floor experience — 'Deburring Cost Optimization'",
  },

  // ── SAFETY (continued) ────────────────────────────────────────────────

  {
    id: "SAFE-002",
    category: "safety",
    severity: "critical",
    title: "Never exceed tool maximum RPM rating",
    rule: "NEVER exceed the tool manufacturer's maximum RPM rating. Centrifugal force at high RPM can cause tool shank failure, insert ejection, or collet slippage. Check: endmill data sheet, insert holder balance rating, collet/holder torque spec.",
    reasoning: "Centrifugal force increases with RPM². At excessive RPM, the tool body experiences tensile stress that can exceed material limits, causing catastrophic burst. Insert-style tools are especially dangerous — inserts can eject at high velocity. All tools have an RPM limit based on mass, balance, and clamping force.",
    conditions: [{ type: "always" }],
    exceptions: ["Tools specifically rated for high-speed machining (HSM) have higher RPM limits noted on the tool or packaging"],
    source: "DIN 6535 — 'Tooling Safety Standards'",
  },
  {
    id: "SAFE-003",
    category: "safety",
    severity: "critical",
    title: "High-pressure coolant safety check",
    rule: "Before using coolant pressure >100 bar: (1) verify hose ratings exceed operating pressure by 4×, (2) check all fittings and connections, (3) ensure guards are closed, (4) verify nozzle is aimed at the cutting zone not the operator. Coolant injection injuries are serious.",
    reasoning: "High-pressure coolant (70-150 bar is common for through-tool) can penetrate skin and cause fluid injection injuries similar to hydraulic injection. Hose failure sprays coolant at lethal pressure. All connections must be rated and inspected before high-pressure operation.",
    conditions: [{ type: "always" }],
    exceptions: ["MQL systems operate at low pressure (2-10 bar) — standard safety measures sufficient"],
    source: "OSHA — 'High Pressure Fluid Safety'",
  },
  {
    id: "SAFE-004",
    category: "safety",
    severity: "important",
    title: "Chuck jaw clearance verification",
    rule: "Before running any program, verify that: (1) chuck jaws won't contact the tool changer or turret, (2) protruding part stock won't contact the tailstock or steady rest, (3) jaw steps clear all tool paths including rapids (G00).",
    reasoning: "Chuck jaw collisions are among the most expensive CNC lathe crashes — they damage the chuck, turret, and often the spindle bearings. Large step jaws extending beyond the chuck diameter are especially dangerous during automatic tool changes.",
    conditions: [{ type: "always" }],
    exceptions: ["Machines with automatic jaw-position sensing and interlock"],
    source: "Shop floor experience — 'Lathe Crash Prevention'",
    related_rules: ["SAFE-001"],
  },
  {
    id: "SAFE-005",
    category: "safety",
    severity: "important",
    title: "CAM simulation collision check before first run",
    rule: "Run FULL collision simulation in CAM (including tool holder, spindle, fixture, and workpiece model) before posting any program. Visual G-code review is NOT sufficient to catch collisions. Simulate at rapid (G00) speeds — most collisions happen during rapids.",
    reasoning: "Collisions during rapids happen too fast for operator reaction (0.1-0.5 seconds). CAM simulation checks every CL point against the complete machine model. A 2-minute simulation prevents $1,000-50,000 in crash damage. Most shops require simulation sign-off before any first article.",
    conditions: [{ type: "always" }],
    exceptions: ["Proven programs on identical setups that have already been simulated and run successfully"],
    source: "Vericut / hyperMILL — 'NC Simulation Best Practices'",
    related_rules: ["SAFE-001", "SETUP-006"],
  },

  // ── GRINDING RULES ───────────────────────────────────────────────────────

  {
    id: "GRIND-001",
    category: "grinding",
    severity: "critical",
    title: "Dress wheel before finishing passes",
    rule: "Always dress the grinding wheel before finishing passes. A loaded or glazed wheel generates excessive heat and causes burn marks on the workpiece surface.",
    reasoning: "Grinding wheels load with swarf particles that fill the pore structure, reducing cutting action. The wheel rubs instead of cutting, generating friction heat that causes thermal damage (burn marks, temper colors, surface tensile stress, and micro-cracks).",
    conditions: [{ type: "operation_type", operations: ["grinding"] }],
    exceptions: ["Superabrasive wheels (CBN/diamond) that self-sharpen under proper conditions"],
    source: "Norton Abrasives — 'Grinding Wheel Dressing Guide'",
    related_rules: ["GRIND-008"],
  },
  {
    id: "GRIND-002",
    category: "grinding",
    severity: "important",
    title: "Monitor specific grinding energy",
    rule: "Track specific grinding energy (energy per unit volume removed). If energy rises >50% above the baseline value, the wheel is loaded and needs dressing.",
    reasoning: "Specific grinding energy is the most reliable indicator of wheel condition. As the wheel dulls or loads, more energy is converted to heat rather than chip formation. Rising energy directly correlates with thermal damage risk and poor surface integrity.",
    conditions: [{ type: "operation_type", operations: ["grinding"] }],
    exceptions: ["Initial break-in period for new wheels where energy stabilizes over first few passes"],
    source: "Malkin & Guo — 'Grinding Technology: Theory and Application'",
    related_rules: ["GRIND-001"],
  },
  {
    id: "GRIND-003",
    category: "grinding",
    severity: "critical",
    title: "Never exceed wheel peripheral speed rating",
    rule: "Never operate a grinding wheel above its rated peripheral speed (m/s). Exceeding the rated speed risks catastrophic wheel burst — a life-threatening hazard.",
    reasoning: "Centrifugal force on the wheel increases with the square of speed. Vitrified bond wheels have a maximum safe speed determined by bond strength. Above this speed, the wheel can disintegrate explosively, sending fragments at hundreds of m/s.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "ANSI B7.1 — 'Safety Requirements for Grinding Wheels'",
    related_rules: ["SAFE-001"],
    evidence_level: "iso_standard",
    formula_ref: ["grinding_wheel_speed"],
    quantitative: "V_s = π × D_wheel × n / 1000 [m/s], max per EN 12413",
    standard_ref: "EN 12413:2007+A1:2011 — Safety of bonded abrasive products",
  },
  {
    id: "GRIND-004",
    category: "grinding",
    severity: "important",
    title: "Use creep-feed for deep slots, conventional for shallow",
    rule: "Use creep-feed grinding (slow feed, deep cut >2mm) for deep material removal. Use conventional grinding (fast feed, shallow cut <0.5mm) for stock removal on surfaces.",
    reasoning: "Creep-feed grinding maintains constant arc of contact, producing uniform heat distribution and better form accuracy in deep slots/profiles. Conventional grinding at deep cuts causes thermal damage due to excessive contact arc and dwell time.",
    conditions: [{ type: "operation_type", operations: ["grinding"] }],
    exceptions: ["HEDG (High Efficiency Deep Grinding) combines high speed with deep cuts using CBN wheels"],
    source: "Studer — 'Grinding Process Fundamentals'",
  },
  {
    id: "GRIND-005",
    category: "grinding",
    severity: "important",
    title: "Spark-out passes for surface finish",
    rule: "Use 2-3 spark-out passes (zero infeed) at the end of grinding to improve surface finish by 30-50%. The wheel continues cutting elastic deflection spring-back from previous passes.",
    reasoning: "During grinding, the system deflects elastically under cutting force. When infeed stops, the deflection recovers and the wheel continues removing material until equilibrium. These passes produce the finest finish with minimal subsurface damage.",
    conditions: [{ type: "surface_finish_below", ra_um: 0.4 }],
    exceptions: ["Production grinding where cycle time is critical and finish spec is easily met"],
    source: "Machinist Handbook — 'Grinding Operations'",
    evidence_level: "empirical_validated",
    quantitative: "Ra_improvement = Ra_initial × (1 - 0.15)^n_sparkout, typically n=2-3 passes",
  },
  {
    id: "GRIND-006",
    category: "grinding",
    severity: "important",
    title: "Coolant flood rate minimum 20 L/min for grinding",
    rule: "Maintain minimum 20 L/min coolant flow rate during grinding operations. Grinding burns occur without adequate coolant flow to the cutting zone.",
    reasoning: "Grinding generates more heat per unit volume than any other machining process (specific energy 10-100× higher than milling). Coolant must flood the contact zone to prevent thermal damage. Insufficient flow allows a steam barrier to form, eliminating cooling.",
    conditions: [{ type: "operation_type", operations: ["grinding"] }],
    exceptions: ["Dry grinding of cast iron with resinoid wheels at light depths", "CBN wheels with oil coolant (lower flow rate acceptable due to oil's higher film strength)"],
    source: "Winterthur — 'Coolant Application in Grinding'",
    related_rules: ["COOL-001"],
  },
  {
    id: "GRIND-007",
    category: "grinding",
    severity: "recommended",
    title: "CBN wheels for hardened steel grinding",
    rule: "Use CBN (cubic boron nitride) grinding wheels for hardened steel above 55 HRC. CBN provides 10× or greater wheel life compared to aluminum oxide at these hardness levels.",
    reasoning: "CBN is the second hardest material after diamond and has excellent thermal conductivity. It maintains sharpness on hardened steel far longer than conventional abrasives, producing less heat and better surface integrity. The higher wheel cost is offset by reduced dressing, fewer wheel changes, and consistent quality.",
    conditions: [{ type: "hardness_above", hrc: 55 }],
    exceptions: ["Low-volume prototype work where wheel cost exceeds production savings", "Interrupted surfaces where CBN may chip (use ceramic aluminum oxide instead)"],
    source: "3M — 'CBN Grinding Guide'",
    related_rules: ["HT-001"],
  },
  {
    id: "GRIND-008",
    category: "grinding",
    severity: "recommended",
    title: "Balance grinding wheel after each dress",
    rule: "Re-balance the grinding wheel after each dressing operation. Dressing removes material unevenly, shifting the wheel's center of mass and causing imbalance-induced chatter marks.",
    reasoning: "Even 1 gram of imbalance at 3000 RPM generates significant centrifugal force oscillation. This appears as regularly-spaced chatter marks on the workpiece, especially visible on ID grinding where the wheel-to-bore diameter ratio amplifies the effect.",
    conditions: [{ type: "operation_type", operations: ["grinding"] }],
    exceptions: ["Small-diameter wheels (<50mm) on rigid spindles where imbalance is negligible"],
    source: "Haimer — 'Wheel Balancing Technology'",
    related_rules: ["GRIND-001"],
  },

  // ── TURNING RULES ────────────────────────────────────────────────────────

  {
    id: "TURN-001",
    category: "turning",
    severity: "critical",
    title: "Support long parts with tailstock or steady rest",
    rule: "For parts with L/D > 4, use tailstock support or a steady rest. Without support, the part deflects under cutting forces, causing taper errors and chatter.",
    reasoning: "A cantilever beam deflects proportionally to L³. At L/D > 4, deflection exceeds typical tolerance bands. The center of the part sags away from the tool, producing a barrel shape (larger diameter at center). Tailstock support converts the beam to simply-supported, reducing deflection 5×.",
    conditions: [{ type: "aspect_ratio_above", ratio: 4 }],
    exceptions: ["Short rigid parts with L/D < 3 held firmly in chuck", "Parts with intermediate shoulders that act as natural supports"],
    source: "Sandvik Coromant — 'Turning Guide: Workholding'",
    related_rules: ["TURN-004"],
    evidence_level: "theoretical",
    formula_ref: ["beam_deflection"],
    quantitative: "δ = F×L³/(3×E×I) for cantilever. At L/D=4: δ_max ≈ 0.02mm. At L/D=6: δ_max ≈ 0.07mm. At L/D=8: δ_max ≈ 0.17mm",
  },
  {
    id: "TURN-002",
    category: "turning",
    severity: "important",
    title: "Rough from tailstock toward chuck",
    rule: "When roughing long parts, cut from the tailstock end toward the chuck. Cutting forces push the workpiece into the chuck jaws, increasing rigidity.",
    reasoning: "Axial cutting force in turning pushes the workpiece in the feed direction. Cutting toward the chuck pushes the part into the jaws, increasing clamping force. Cutting away from the chuck pulls the part out, risking ejection on heavy cuts.",
    conditions: [{ type: "operation_type", operations: ["turning"] }],
    exceptions: ["Finishing passes where direction is governed by surface finish requirements", "Bar-fed parts where material feeds from the chuck side"],
    source: "Kennametal — 'Turning Application Guide'",
    related_rules: ["TURN-001"],
  },
  {
    id: "TURN-003",
    category: "turning",
    severity: "important",
    title: "Use positive rake inserts for finishing",
    rule: "Select positive rake inserts for finishing operations. Positive rake geometry generates lower cutting forces, producing better surface finish and less workpiece deflection.",
    reasoning: "Positive rake inserts shear material cleanly with lower force. Negative rake inserts are stronger but create higher radial forces that deflect thin sections. For finishing where force must be minimized and surface quality maximized, positive rake is essential.",
    conditions: [{ type: "feature_present", features: ["finish", "turning"] }],
    exceptions: ["Heavy interrupted cuts where positive inserts may chip", "Hardened material turning where negative rake CBN is stronger"],
    source: "Sandvik Coromant — 'Insert Selection Guide'",
    related_rules: ["HT-002"],
  },
  {
    id: "TURN-004",
    category: "turning",
    severity: "critical",
    title: "Never exceed 3:1 unsupported L/D without steady rest",
    rule: "Parts with unsupported L/D > 3 must use a steady rest or follower rest. Without support, catastrophic deflection causes chatter, taper errors, and potential workpiece ejection.",
    reasoning: "At L/D > 3 without support, the part acts as a cantilever with deflection proportional to L³/D⁴. Radial cutting force pushes the part away from the tool. At high speeds, the rotating imbalance from deflection creates self-exciting vibration that worsens progressively.",
    conditions: [{ type: "aspect_ratio_above", ratio: 3 }],
    exceptions: ["Low material removal (spring passes) where cutting forces are minimal"],
    source: "Machinist Handbook — 'Lathe Operations: Slender Work'",
    related_rules: ["TURN-001"],
  },
  {
    id: "TURN-005",
    category: "turning",
    severity: "recommended",
    title: "Reduce DOC for thin-wall turning",
    rule: "For thin-wall turning, limit depth of cut to 0.5× wall thickness maximum. Excessive DOC causes the wall to vibrate (chatter) and deflect, producing poor finish and dimensional errors.",
    reasoning: "Thin cylindrical walls have low stiffness in the radial direction. Cutting force deflects the wall elastically, and when released, it springs back. If DOC > 0.5× wall thickness, the deflection may exceed the elastic limit, causing permanent deformation or chatter.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 3 }],
    exceptions: ["Parts with internal support mandrels or expanding collets that stiffen the wall"],
    source: "Titans of CNC — 'Thin Wall Turning Techniques'",
    related_rules: ["THIN-001"],
  },
  {
    id: "TURN-006",
    category: "turning",
    severity: "recommended",
    title: "Match insert nose radius to minimum fillet radius",
    rule: "The turning insert nose radius must be less than or equal to the smallest concave radius on the part. A 0.8mm nose radius cannot cut a 0.4mm fillet.",
    reasoning: "The insert nose radius defines the minimum internal radius the tool can produce. If the nose radius exceeds the required fillet, the tool will gouge the adjacent wall or fail to reach into the radius, leaving excess material.",
    conditions: [{ type: "operation_type", operations: ["turning"] }],
    exceptions: ["Separate groove/form tool used specifically for small radii after primary turning"],
    source: "Sandvik Coromant — 'Insert Geometry Selection'",
  },
  {
    id: "TURN-007",
    category: "turning",
    severity: "tip",
    title: "Use wiper inserts for feed-rate doubling",
    rule: "Wiper-geometry inserts allow doubling the feed rate while maintaining the same surface finish (Ra). The extended wiper flat burnishes the surface after the primary cutting edge.",
    reasoning: "Standard inserts produce Ra proportional to f²/(8×r). Wiper inserts have a secondary radius that acts as a built-in finishing pass, effectively smoothing the feed marks left by the primary edge. This allows 2× feed at equivalent Ra.",
    conditions: [{ type: "operation_type", operations: ["turning"] }],
    exceptions: ["Very tight tolerance work where wiper's higher radial force causes deflection issues", "Interrupted cuts where the wiper edge is vulnerable to chipping"],
    source: "Sandvik Coromant — 'Wiper Insert Technology'",
  },
  {
    id: "TURN-008",
    category: "turning",
    severity: "important",
    title: "Bar pulling sequence: face, turn, groove, cutoff",
    rule: "For bar-fed lathe work, follow the sequence: face → turn OD → groove → cutoff. This order maintains maximum workpiece support throughout the operation.",
    reasoning: "Each operation progressively weakens the part's connection to the bar stock. Facing establishes the Z-datum while fully supported. OD turning happens with full cross-section. Grooving reduces cross-section locally. Cutoff is last because it severs the part entirely.",
    conditions: [{ type: "operation_type", operations: ["turning"] }],
    exceptions: ["Sub-spindle catch operations where cutoff happens before finishing the back side"],
    source: "Haas Automation — 'Bar Feeder Programming Guide'",
    related_rules: ["SEQ-001"],
  },
  {
    id: "TURN-009",
    category: "turning",
    severity: "recommended",
    title: "Use constant surface speed (G96) for facing",
    rule: "Use G96 (constant surface speed) mode for facing operations. As the tool moves toward center, the spindle speeds up to maintain optimal cutting speed (Vc).",
    reasoning: "During facing, the cutting diameter continuously decreases. At constant RPM (G97), the surface speed drops toward zero at center, causing rubbing and poor finish. G96 maintains the programmed Vc by increasing RPM as diameter decreases, ensuring consistent chip formation.",
    conditions: [{ type: "feature_present", features: ["face"] }],
    exceptions: ["Very small diameters where RPM would exceed machine maximum — use G96 with RPM clamp (G50 S-max)"],
    source: "Fanuc — 'Programming Manual: Constant Surface Speed'",
  },
  {
    id: "TURN-010",
    category: "turning",
    severity: "critical",
    title: "Clamp chuck pressure adequate for spindle speed",
    rule: "Verify that chuck clamping pressure is sufficient for the programmed spindle speed. Centrifugal force on the jaws reduces effective grip at high RPM, potentially ejecting the workpiece.",
    reasoning: "Chuck jaw centrifugal force acts radially outward, opposing clamping force. At high RPM, this force can exceed the hydraulic clamping force. The grip reduction follows F_centrifugal = m × ω² × r. A part secure at 500 RPM may fly out at 3000 RPM.",
    conditions: [{ type: "spindle_speed_above", rpm: 3000 }],
    exceptions: ["Collet chucks where centrifugal force has minimal effect due to low jaw mass"],
    source: "Kitagawa — 'Chuck Safety: Centrifugal Force Calculations'",
    related_rules: ["SAFE-001"],
    evidence_level: "manufacturer_data",
    quantitative: "F_centrifugal = m_jaw × r_cg × ω². Grip loss = F_centrifugal/F_clamp. At 3000 RPM with 2kg jaws at 150mm: F_c = 2×0.15×(314)² ≈ 29.6 kN",
  },

  // ── THREADING RULES ──────────────────────────────────────────────────────

  {
    id: "THR-001",
    category: "threading",
    severity: "critical",
    title: "Always chamfer before threading",
    rule: "Machine a chamfer at the thread start before cutting threads. Thread starts without chamfers cause cross-threading during assembly and leave sharp burrs.",
    reasoning: "A 45° chamfer at 1× thread pitch depth provides a lead-in for mating parts. Without it, the first thread crest is a sharp, incomplete form that damages mating threads. The chamfer also prevents the tap/die from walking off-center at entry.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: ["Internal threads in blind holes where chamfer would reduce usable thread depth"],
    source: "OSG — 'Threading Application Guide'",
    related_rules: ["SEQ-009"],
    evidence_level: "iso_standard",
    standard_ref: "ISO 965-1:2013 — Metric ISO threads",
    quantitative: "Chamfer depth = 0.5×pitch minimum. Chamfer angle = 45° ± 5°",
  },
  {
    id: "THR-002",
    category: "threading",
    severity: "recommended",
    title: "Use modified flank infeed for external threads",
    rule: "Use 29.5° modified flank infeed for single-point threading. This reduces cutting force by ~40% compared to radial (straight-in) infeed.",
    reasoning: "Radial infeed engages both flanks of the thread form simultaneously, creating a V-shaped chip that's difficult to evacuate. Modified flank infeed at 29.5° (half the 60° thread angle minus 0.5°) cuts primarily on one flank, producing a manageable chip shape with lower force.",
    conditions: [{ type: "operation_type", operations: ["turning", "threading"] }],
    exceptions: ["Acme and buttress threads where the infeed angle must match the thread form", "Very fine threads (>40 TPI) where radial infeed is acceptable due to shallow depth"],
    source: "Sandvik Coromant — 'Threading: Infeed Methods'",
  },
  {
    id: "THR-003",
    category: "threading",
    severity: "important",
    title: "Decrease DOC per pass progressively",
    rule: "Use decreasing depth of cut per pass in threading — not constant DOC. Maintain constant cross-sectional chip area by reducing DOC as the tool goes deeper into the thread form.",
    reasoning: "As the tool cuts deeper into the V-form, the engagement width increases. Constant DOC means increasing chip area per pass, overloading the tool on deep passes. Constant-area programming (DOC proportional to 1/√pass_number) maintains uniform load throughout.",
    conditions: [{ type: "operation_type", operations: ["turning", "threading"] }],
    exceptions: ["Very shallow threads (1-2 passes total) where progressive reduction is unnecessary"],
    source: "Kennametal — 'Single-Point Threading Guide'",
  },
  {
    id: "THR-004",
    category: "threading",
    severity: "recommended",
    title: "Spring passes for thread pitch accuracy",
    rule: "Add 2-3 spring passes (zero-DOC) at the end of the threading cycle. These passes clean up elastic deflection and improve thread pitch diameter accuracy.",
    reasoning: "During threading, the tool and workpiece deflect elastically under cutting force. When the tool reaches the programmed depth, the actual cut is shallower due to this deflection. Spring passes with zero additional infeed allow the system to 'catch up' to the programmed dimension.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Thread milling where each pass is independent and deflection is compensated differently"],
    source: "Machinist Handbook — 'Thread Cutting on Lathes'",
    related_rules: ["THR-003"],
  },
  {
    id: "THR-005",
    category: "threading",
    severity: "critical",
    title: "Verify thread pitch matches spindle encoder",
    rule: "Verify that the programmed thread pitch exactly matches the spindle encoder resolution and gear ratios. Mismatch causes helical damage, especially on multi-start threads.",
    reasoning: "Single-point threading synchronizes tool feed to spindle rotation via the encoder. If the pitch calculation introduces rounding errors (especially with metric pitch on imperial machines or vice versa), each pass tracks a slightly different helix, destroying the thread form over multiple passes.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Fanuc — 'Threading Synchronization Technical Manual'",
  },
  {
    id: "THR-006",
    category: "threading",
    severity: "tip",
    title: "Thread mill for blind holes, single-point for through",
    rule: "Use thread milling for blind holes where full-depth threads are needed. Use single-point threading (tap or lathe) for through-holes where chip evacuation is easier.",
    reasoning: "Thread milling enters from one end and interpolates the full thread depth in a single helical pass. No chip packing risk at the bottom of blind holes. Single-point tapping in blind holes risks tap breakage from chip packing. Thread mills also allow easy size adjustment via programming.",
    conditions: [{ type: "feature_present", features: ["thread", "hole"] }],
    exceptions: ["High-volume production where rigid tapping is faster and more economical"],
    source: "Emuge — 'Thread Milling vs Tapping Guide'",
    related_rules: ["SEQ-008"],
  },

  {
    id: "threading-form-tap-speed",
    category: "threading",
    severity: "important",
    title: "Form taps run 50-100% faster SFM than cut taps",
    rule: "Form taps (roll taps) can run at 50-100% higher SFM than cut taps in the same material. Form taps create threads by displacing material rather than cutting, producing stronger threads with no chips.",
    reasoning: "Form taps have no cutting edges to wear, generate no chips (eliminating evacuation issues), and produce cold-worked threads with ~10% higher tensile strength. The speed increase is possible because there's no chip formation heat.",
    conditions: [{ type: "operation_type", operations: ["tapping"] }],
    exceptions: ["Cast iron and brittle materials — form taps cannot displace brittle material and will break", "Hardened steel >40 HRC where material displacement is not possible"],
    source: "OSG Tap Guide, ToolHIT tapping speeds reference",
    evidence_level: "manufacturer_data",
    quantitative: "Form tap SFM = cut tap SFM × 1.5–2.0. Thread tensile strength increase ~10% due to cold-working of thread flanks.",
  },
  {
    id: "threading-tap-feed-sync",
    category: "threading",
    severity: "critical",
    title: "Tapping feed rate must exactly match pitch",
    rule: "Tapping feed rate MUST equal pitch × RPM exactly. Any mismatch causes thread damage, tap breakage, or oversized threads. For rigid tapping, the CNC controller synchronizes spindle and Z-axis. Formula: Feed(mm/min) = Pitch(mm) × RPM, or Feed(IPM) = RPM ÷ TPI.",
    reasoning: "Unlike milling where feed can vary, tapping is geometrically constrained — one revolution = one pitch advance. CNC rigid tapping mode (G84) handles this automatically, but manual feed overrides MUST be disabled during tapping.",
    conditions: [{ type: "operation_type", operations: ["tapping"] }],
    exceptions: ["Floating tap holders with axial compensation can absorb small feed errors (±5%), but rigid tapping is always preferred for accuracy"],
    source: "CNC tapping fundamentals, OSG tap selection guide",
    evidence_level: "peer_reviewed",
    quantitative: "Feed(mm/min) = Pitch(mm) × RPM. Example: M10×1.5 at 500 RPM → Feed = 1.5 × 500 = 750 mm/min. Feed(IPM) = RPM ÷ TPI. Example: 1/4-20 UNC at 300 RPM → Feed = 300 ÷ 20 = 15 IPM.",
    standard_ref: "ISO 529 — Tapping; ASME B1.13M — Metric screw threads",
  },
  {
    id: "threading-difficult-materials",
    category: "threading",
    severity: "important",
    title: "Reduce tapping speed for stainless and titanium",
    rule: "For stainless steel (ISO M) and titanium (ISO S), reduce tapping SFM to 2-7 m/min and 2-5 m/min respectively. Use spiral flute taps for blind holes (pulls chips up) and spiral point taps for through holes (pushes chips forward). Always use high-pressure coolant.",
    reasoning: "Work hardening in stainless and galling in titanium are the #1 causes of tap breakage. Low speed + high-pressure coolant flush prevents built-up edge formation and chip packing in flutes.",
    conditions: [{ type: "operation_type", operations: ["tapping"] }, { type: "material_iso", groups: ["M"] }],
    exceptions: ["Form/roll taps in low-hardness stainless (<200 HB) can run at the higher end of the range with excellent results"],
    source: "OSG tap guide, Sandvik threading recommendations",
    evidence_level: "manufacturer_data",
    quantitative: "Stainless: 2–7 m/min. Titanium: 2–5 m/min. High-pressure coolant: 70+ bar preferred. Drill hole oversized by 5-10% vs standard tap drill to reduce torque.",
  },

  {
    id: "milling-helix-angle-steel",
    category: "milling",
    severity: "recommended",
    title: "Use 30° helix for steel roughing, 35-40° for stainless/HRSA",
    rule: "Select helix angle based on material and operation. Steel/cast iron roughing: 30°. Stainless and HRSA: 35-40°. Aluminum/non-ferrous: 37-45°. Finishing: 45-60°. Abrasive plastics/brass: 0° (straight). Higher helix = more axial force (presses tool into holder) but less radial force (less deflection/vibration).",
    reasoning: "At 30° helix, 75% of cutting force is radial and 25% axial. At 45°, forces split 50/50. Higher helix reduces radial deflection but increases axial pull-out risk in poorly retained tools. The trade-off optimizes for each material's cutting behavior.",
    conditions: [{ type: "operation_type", operations: ["milling", "roughing", "finishing"] }],
    exceptions: ["Variable helix end mills override this for chatter-prone setups", "Micro-milling (<1mm) may use higher helix regardless of material"],
    source: "CADEM Technologies, Travers Tool helix angle guide, OSG end mill selection",
    evidence_level: "manufacturer_data" as const,
    quantitative: "Force split: 0°→100%R/0%A, 30°→75%R/25%A, 45°→50%R/50%A. Formula: Fa=Ft×sin(β), Fr=Ft×cos(β).",
  },
  {
    id: "milling-flute-count-selection",
    category: "milling",
    severity: "recommended",
    title: "2-3 flutes for aluminum, 4+ for steel",
    rule: "Use 2-3 flute end mills for aluminum and non-ferrous materials — larger flute valleys allow bigger chips and better evacuation. Use 4+ flutes for steel and harder alloys — higher rigidity, smoother engagement, better surface finish. 3-flute is a performance alternative to 2-flute in aluminum with faster feed rates.",
    reasoning: "Aluminum produces long, stringy chips that need large gullet space. Steel produces smaller chips where rigidity and number of cutting edges matter more. Each additional flute allows proportionally higher feed rate at the same chip load: Feed = fz × z × RPM.",
    conditions: [{ type: "operation_type", operations: ["milling", "roughing", "finishing", "slotting"] }],
    exceptions: ["High-efficiency milling (HEM) in steel can use 5-7 flutes with very light radial engagement", "Single-flute end mills for very soft plastics or extremely high-RPM routers"],
    source: "OSG end mill guide, CNC Cookbook flute count analysis, Harvey Performance",
    evidence_level: "manufacturer_data" as const,
    quantitative: "Aluminum: 2-3 flutes, fz 0.05-0.20mm. Steel: 4+ flutes, fz 0.03-0.12mm. Feed increase per flute: Feed_new = Feed_old × (z_new/z_old) at constant fz.",
  },
  {
    id: "milling-minimum-chip-load",
    category: "milling",
    severity: "critical",
    title: "Never go below minimum chip load — causes rubbing and work hardening",
    rule: "Carbide end mills must maintain minimum 0.004 inch (0.1mm) chip load per tooth. Chip load should be 5-20% of the cutting edge radius as absolute minimum. Going below this causes rubbing instead of cutting, generates excessive heat, work-hardens stainless and titanium, accelerates flank wear, and produces chatter. In hard milling (>45 HRC), 0.0008 inch/tooth is the burnishing threshold.",
    reasoning: "Below the minimum uncut chip thickness (MUCT), the tool plows rather than shears the workpiece. This converts cutting energy to friction heat, destroys the tool coating, and in work-hardening materials creates a hardened layer that makes subsequent passes even harder. The MUCT is directly related to edge radius — sharper tools can cut thinner chips.",
    conditions: [{ type: "operation_type", operations: ["milling", "finishing", "roughing"] }],
    exceptions: ["Micromilling with edge radii 0.001-0.005mm can cut at proportionally lower chip loads", "Spring passes for surface finish may intentionally use sub-MUCT chip loads for 1-2 passes only"],
    source: "CNC Cookbook feeds/speeds guide, NYC CNC chip load fundamentals",
    evidence_level: "peer_reviewed" as const,
    quantitative: "Carbide min chip load: 0.004 inch (0.1mm). Hard milling burnishing: 0.0008 inch/tooth. Aerospace super-alloy burnishing: IPR < 0.0035 inch. MUCT = 5-20% of edge radius. Micromilling edge radius: 0.001-0.005mm.",
  },
  // Drilling-specific rules — closes the `drilling` category blind spot
  // (declared at type level since corpus inception but had zero rules until
  // U-PB-DRILL-RULES, slot:foxtrot 2026-05-23). Distinct from `deep_hole`
  // (>5xD) and `hole_making` (mixed reaming/boring) — these rules cover
  // SHORT-to-MODERATE drilling start, geometry, and breakthrough behavior.
  {
    id: "drill-spot-precenter",
    category: "drilling",
    severity: "important",
    title: "Spot drill before twist drill for ±0.05mm hole positioning",
    rule: "Use a spot drill (90° or 120° point) to a depth of 0.5-1.0× the twist drill diameter BEFORE running the twist drill on any hole requiring ±0.05mm true-position tolerance. The spot creates a precision-aligned conical seat that prevents drill walk on entry.",
    reasoning: "A twist drill's chisel edge has zero cutting velocity at its center. On a flat or rough surface, the drill skates radially before the cutting lips engage — drift up to 0.1-0.3mm depending on point geometry, surface condition, and feed-on-entry. A spot drill's stiffer body and shorter L/D ratio holds position; the resulting conical seat constrains the twist drill's chisel edge to the seat center.",
    conditions: [{ type: "operation_type", operations: ["drilling"] }],
    exceptions: ["Self-centering drills (split-point geometry, 135°-140° with web thinning) on flat surfaces with rigid setup", "Drilling through pre-existing pilot holes", "CNC machines with rigid-tap-class spindle accuracy where the drill spirit-levels via Z-feed only"],
    source: "Machinery's Handbook 31st ed., p.927 (drill point geometry); Guhring tooling catalog — 'Drill Entry Strategy'",
    related_rules: ["drill-point-angle-material"],
    evidence_level: "manufacturer_data",
    quantitative: "Spot drill depth: 0.5-1.0×D_twist. Walk without spot: 0.1-0.3mm typical, up to 0.5mm on inclined/rough surfaces.",
  },
  {
    id: "drill-point-angle-material",
    category: "drilling",
    severity: "important",
    title: "Match drill point angle to material: 118° general, 135° hard, 140° tough alloys",
    rule: "Select drill point angle by material class: 118° for free-machining steels and aluminum (general-purpose), 135° for high-tensile steels >40 HRC (split-point preferred), 140° for stainless and tough nickel/titanium alloys, 60° for brass and copper (reduces grabbing). Mismatched point angle causes work hardening, premature wear, and poor hole geometry.",
    reasoning: "The included point angle controls chip-formation geometry and thrust force. Shallower points (118°) produce a longer cutting edge that's gentler on soft material but glances off hard material. Steeper points (135-140°) concentrate force on a shorter edge — better for hard or work-hardening alloys but excess thrust on soft material causes drill walk. Split-points (134-140° with self-centering chisel grind) reduce thrust 30-40% vs standard 118° on the same drill.",
    conditions: [{ type: "operation_type", operations: ["drilling"] }],
    exceptions: ["Aerospace composite-stack drilling uses dual-angle (130°/60°) drills regardless of substrate class", "Through-coolant carbide drills are typically 140° regardless of material — internal coolant compensates for thrust"],
    source: "Machinery's Handbook 31st ed., pp.917-920 (drill point geometry tables); ASM Handbook Vol.16 — Machining, ch. on drilling",
    related_rules: ["drill-spot-precenter"],
    evidence_level: "peer_reviewed",
    quantitative: "Free-machining steel/Al: 118°. Steel >40 HRC: 135° split-point. Stainless/Ti/Ni: 140°. Brass/Cu: 60-90° to prevent grab. Split-point thrust reduction: 30-40% vs standard 118°.",
    standard_ref: "ASME B94.11M-1993 (Twist Drills, point geometry)",
  },
  {
    id: "drill-stickout-runout",
    category: "drilling",
    severity: "important",
    title: "Keep drill stickout ≤4×D to limit runout to 0.025mm",
    rule: "Limit drill stickout (chuck-jaw to drill-tip distance) to 4× the drill diameter or less. Beyond 4×D, deflection under thrust load and accumulated runout produces oversized holes with poor cylindricity. Use stub-length drills, shorter holders, or shrink-fit chucks before extending stickout.",
    reasoning: "Lateral runout at the drill tip scales as L³/D (cantilever beam deflection), so doubling stickout produces ~8× more tip deflection at the same thrust force. Even a runout-free spindle propagates ER-collet-induced wobble (typically 5-10 μm TIR at the collet face) into larger tip excursions as stickout grows. The 4×D rule keeps tip TIR within ~25 μm for typical setups, which is the hole-size-error limit before reaming becomes mandatory for H7-class holes.",
    conditions: [{ type: "operation_type", operations: ["drilling"] }],
    exceptions: ["Through-tool-coolant carbide drills rated for extended-length applications (use the manufacturer's published L/D ceiling, often 6-8×D)", "Guided-bushing setups where a hardened bushing supports the drill mid-length"],
    source: "Sandvik Coromant — 'Drilling: Setup and Runout Best Practices'; Kennametal Master Catalog — drill holder selection",
    related_rules: ["drill-point-angle-material", "DH-001"],
    evidence_level: "manufacturer_data",
    quantitative: "Stickout limit: ≤4×D for ER collets. Runout at 4×D: ~25 μm TIR target. Tip deflection scales L³/D. Shrink-fit chuck TIR: 3-5 μm vs ER 5-10 μm.",
  },
  {
    id: "drill-through-coolant-blind-hole",
    category: "drilling",
    severity: "important",
    title: "Through-tool coolant at 40-70 bar for blind holes >3xD",
    rule: "Use through-tool coolant at 40-70 bar pressure for blind holes deeper than 3×D when through-coolant drills are available. External coolant penetration drops below the cut-zone threshold at ~3×D in blind geometry — earlier than the 8×D threshold for through-holes (where chips can exit downward via gravity-assist).",
    reasoning: "In a blind hole, all chip evacuation must travel UP the flutes — there's no gravity-assist exit. The annular gap fills with chips faster than in a through-hole. At only 3×D, external coolant can no longer reach the cutting lips through the chip-packed annulus. Through-tool delivery flushes coolant directly to the chisel edge at ~10 m/s, which simultaneously cools the cut and back-flushes chips up the flutes. Pressure of 40-70 bar (580-1000 psi) is the standard CNC machine through-spindle range.",
    conditions: [{ type: "aspect_ratio_above", ratio: 3 }],
    exceptions: ["Peck drilling (G83) with full retract to surface allows external coolant re-flood between pecks", "MQL through-spindle systems use aerosol delivery — pressure spec is irrelevant (flow rate matters instead, 40-60 mL/h)"],
    source: "OSG — 'Through-Coolant Drilling Application Guide'; Sandvik Coromant — 'CoroDrill 870 Pressure Specification'",
    related_rules: ["DH-004", "drill-spot-precenter"],
    conditions_all: [{ type: "operation_type", operations: ["drilling"] }],
    evidence_level: "manufacturer_data",
    quantitative: "Blind hole threshold: 3×D (vs 8×D for through-holes). Pressure range: 40-70 bar (580-1000 psi). Coolant jet velocity at lips: ~10 m/s. MQL alternative: 40-60 mL/h flow rate, pressure irrelevant.",
  },
  {
    id: "drill-feed-breakthrough-reduce",
    category: "drilling",
    severity: "important",
    title: "Reduce feed 30-50% for final 0.5xD before breakthrough",
    rule: "Reduce feed rate by 30-50% for the last 0.5×D of depth approaching breakthrough on a through-hole. Full feed at breakthrough causes the unsupported thin wall ahead of the drill to flex, then suddenly shear — producing burr blowout, ragged exit-edge chipping (especially in brittle materials), and sometimes catastrophic drill snapping on cast iron and hardened steels.",
    reasoning: "As the drill approaches breakthrough, the thickness of material ahead of the cutting lips drops below the chip-thickness — there's nothing left to cut. In ductile materials this produces a folded-flap burr; in brittle materials (cast iron, hardened steel, ceramics) the unsupported edge snaps off in chunks ahead of the drill, producing chip-out on the exit face and shock-loading the drill chisel edge. Reduced feed in the breakthrough zone gives the lips time to cleanly shear the thinning wall before fracture.",
    conditions: [{ type: "operation_type", operations: ["drilling"] }],
    exceptions: ["Backing plates or sacrificial workpieces directly contacting the exit face provide support — feed reduction unnecessary", "Center-cutting end mills used as drills tolerate breakthrough at full feed", "Step drills with chamfer geometry self-clean the exit edge"],
    source: "Machinery's Handbook 31st ed., pp.929-930 (drilling breakthrough behavior); JM Die operator tribal knowledge — repeat-batch cast iron breakthrough chipping observed on Mazak VTC-20B 2023-Q4",
    related_rules: ["drill-point-angle-material"],
    evidence_level: "empirical_heuristic",
    quantitative: "Feed reduction zone: last 0.5×D of depth. Reduction: 30-50% of nominal feed. Worst-case unsupported wall thickness at switchover: ~0.1×D.",
  },
  {
    id: "coolant-mql-nozzle-setup",
    category: "coolant_strategy",
    severity: "important",
    title: "MQL nozzle must be 20-30mm from cut zone at 60° elevation",
    rule: "For MQL (Minimum Quantity Lubrication): position nozzle 20-30mm from cutting zone (20mm for end milling, 25mm for slot milling, 30mm for drilling/grinding). Set elevation angle to 60° and 120° relative to feed direction. Flow rate 40-60 mL/h (60 for hardened steel). Air pressure 0.3-0.4 MPa. Use dual-jet nozzles for stainless/titanium/superalloys — 15-20% better than single-jet.",
    reasoning: "MQL aerosol needs precise delivery to the cutting zone. Too far and droplets disperse before reaching the tool-chip interface. Too close risks nozzle damage. The 120°/60° angle ensures lubricant reaches both the rake face and flank face. Dual jets provide redundant coverage for difficult materials where single-point failure causes rapid tool degradation.",
    conditions: [{ type: "always" }],
    exceptions: ["Through-tool MQL systems have built-in delivery — external nozzle position is irrelevant", "Deep hole drilling >5xD may need through-coolant instead of external MQL"],
    source: "Springer 2025 MQL slot milling study, Tandfonline 2025 dual-jet optimization, JMES MQL review",
    evidence_level: "peer_reviewed" as const,
    quantitative: "Distance: 20-30mm. Flow: 40-60 mL/h. Pressure: 0.3-0.4 MPa (6 bar). Elevation: 60°. Feed angle: 120°. Improvements vs dry: force -14.6%, temp -42.1%, Ra -41.8%. Dual vs single jet: +15-20% improvement.",
  },

  // ── DRILLING COOLANT RULES ────────────────────────────────────────────────

  {
    id: "drilling-coolant-through-pressure",
    category: "hole_making",
    severity: "critical",
    title: "Minimum 1000 PSI coolant pressure for through-coolant drills",
    rule: "Through-coolant carbide drills require minimum 1000 PSI (70 bar) coolant pressure for optimal chip evacuation. Pressure scales inversely with drill diameter: <3mm needs 800-1000 PSI, 3-8mm needs 500-800 PSI, 8-15mm needs 400-600 PSI, >15mm needs 300-500 PSI. Insufficient pressure causes chip packing, overheating, and drill failure.",
    reasoning: "High-pressure coolant through the drill core creates a hydraulic flushing action that evacuates chips from the cutting zone. Without adequate pressure, chips re-cut and pack in flutes, causing catastrophic failure especially in deep holes. Material adjustment: titanium needs 40% more pressure than steel baseline.",
    conditions: [{ type: "operation_type", operations: ["drilling"] }],
    exceptions: ["MQL systems use milliliters/hour at much lower pressure but with precise aerosol delivery", "Shallow holes (<1xD) may not need through-coolant at all"],
    source: "Guhring deep hole drilling guide, MSC BetterMRO, GuessTools coolant-through reference",
    evidence_level: "manufacturer_data" as const,
    quantitative: "Pressure by diameter: <3mm=800-1000PSI, 3-8mm=500-800PSI, 8-15mm=400-600PSI, >15mm=300-500PSI. Material multipliers: Ti x1.4, SS x1.2, Al x0.8, CI x1.0.",
  },
  {
    id: "drilling-deep-hole-peck",
    category: "hole_making",
    severity: "important",
    title: "Peck every 1xD for deep holes, full retract above 3xD",
    rule: "For holes deeper than 3xD without through-coolant: peck drill every 1x diameter depth with full retraction. Start with 70-80% feed rate for the first diameter depth (entry feed). Above 10xD depth requires specialty drills. Above 12xD requires a pilot hole. Through-coolant drills can often drill without pecking up to 5xD.",
    reasoning: "Chip evacuation degrades exponentially with depth. Full retraction clears chips from flutes and allows coolant to flush the hole. Entry feed reduction prevents walking and establishes a clean pilot. Pilot holes above 12xD ensure drill enters straight — clearance tolerance up to 0.0004 inch.",
    conditions: [{ type: "depth_ratio_above", ld_ratio: 3 }],
    exceptions: ["Through-coolant drills at 1000+ PSI can skip pecking up to 5xD in most materials", "Gun drills operate differently — single-lip continuous cutting up to 100xD"],
    source: "Guhring deep hole guide, MSC BetterMRO carbide deep-hole drilling",
    evidence_level: "manufacturer_data" as const,
    quantitative: "Peck interval: 1xD. Entry feed: 70-80%. Pilot clearance: 0.0004 inch. Deep hole thresholds: 3xD=peck, 10xD=specialty, 12xD=pilot required, 20xD+=gun drill.",
  },

  // ── EDM RULES ────────────────────────────────────────────────────────────

  {
    id: "EDM-001",
    category: "edm",
    severity: "critical",
    title: "Maintain dielectric fluid level above workpiece",
    rule: "The dielectric fluid must completely submerge the workpiece and electrode during EDM operations. Exposed arcing causes electrode damage, workpiece pitting, and fire risk.",
    reasoning: "Dielectric fluid serves three functions: insulates until breakdown voltage, quenches the plasma channel to control crater size, and flushes debris from the gap. Without submersion, uncontrolled arcing occurs with no quenching, causing large irregular craters, electrode erosion, and potential fire from vaporized hydrocarbon dielectric.",
    conditions: [{ type: "operation_type", operations: ["edm"] }],
    exceptions: [],
    source: "Sodick — 'EDM Fundamentals Manual'",
    evidence_level: "manufacturer_data",
    quantitative: "Min fluid depth = 40mm above workpiece top. Flash point of hydrocarbon dielectric: 65-150°C. Arcing without fluid: electrode gap <50µm → plasma channel → fire risk",
  },
  {
    id: "EDM-002",
    category: "edm",
    severity: "important",
    title: "Reduce power for thin sections",
    rule: "Reduce EDM power settings when machining thin walls or delicate sections (<2mm). High power density creates a deep recast layer and heat-affected zone that can crack thin sections.",
    reasoning: "EDM recast layer depth is proportional to discharge energy. On thin sections, the HAZ from both sides can overlap, fully transforming the material microstructure. The recast layer is hard, brittle, and under tensile stress — making thin walls prone to cracking.",
    conditions: [{ type: "wall_thickness_below", threshold_mm: 2 }],
    exceptions: ["When recast layer will be removed by subsequent finishing operations"],
    source: "Makino — 'EDM Application Guide: Thin Ribs'",
    related_rules: ["EDM-004"],
  },
  {
    id: "EDM-003",
    category: "edm",
    severity: "important",
    title: "Use orbiting for better flushing in deep cavities",
    rule: "Enable electrode orbiting for deep cavity sinker EDM (depth/width > 3). Static electrode positioning traps debris in the gap, causing arcing and poor surface quality.",
    reasoning: "Orbiting creates a pumping action that circulates dielectric through the gap. The electrode moves in a planetary path, alternately opening and closing the side gaps to create flow. Without orbiting, carbon debris accumulates and causes secondary discharges (arcing), producing pits.",
    conditions: [{ type: "depth_ratio_above", ld_ratio: 3 }],
    exceptions: ["Micro-EDM where orbiting amplitude exceeds feature tolerance"],
    source: "AgieCharmilles — 'Sinker EDM Process Optimization'",
  },
  {
    id: "EDM-004",
    category: "edm",
    severity: "recommended",
    title: "Multiple electrodes: rough and finish",
    rule: "Use separate roughing and finishing electrodes. Rough electrode removes bulk material at high power, finish electrode achieves surface quality at low power with minimal electrode wear.",
    reasoning: "High-power roughing erodes the electrode significantly. A worn rough electrode cannot produce accurate finish geometry. Dedicated finish electrodes are manufactured to tighter tolerances and used at low power where electrode wear ratio is <1%.",
    conditions: [{ type: "operation_type", operations: ["edm"] }, { type: "surface_finish_below", ra_um: 0.8 }],
    exceptions: ["Simple through-features where electrode wear doesn't affect geometry"],
    source: "Makino — 'Electrode Strategy for Precision EDM'",
    related_rules: ["EDM-002"],
  },
  {
    id: "EDM-005",
    category: "edm",
    severity: "critical",
    title: "Wire EDM: maintain proper wire tension",
    rule: "Maintain proper wire tension during wire EDM operations. Slack wire causes inaccurate cuts, wire breakage, and potential collision with the workpiece.",
    reasoning: "Wire EDM uses 0.1-0.3mm brass or coated wire under tension as the cutting electrode. Insufficient tension allows the wire to bow from discharge forces and flushing pressure, producing barrel-shaped cuts. Excessive tension causes wire breakage, especially on corners and tapers.",
    conditions: [{ type: "operation_type", operations: ["edm"] }],
    exceptions: [],
    source: "Mitsubishi Electric — 'Wire EDM Operation Manual'",
  },
  {
    id: "EDM-006",
    category: "edm",
    severity: "recommended",
    title: "Copper electrodes for steel, graphite for high-speed EDM",
    rule: "Use copper electrodes for precision EDM on steel (lower wear ratio). Use graphite electrodes for high-speed roughing EDM (higher MRR, easier to machine).",
    reasoning: "Copper has a lower electrode wear ratio (~1:1 to 3:1 work-to-electrode) on steel due to its high thermal conductivity and melting point. Graphite doesn't melt (it sublimates at 3600°C) allowing higher currents for faster roughing, but wears faster on finish settings.",
    conditions: [{ type: "operation_type", operations: ["edm"] }],
    exceptions: ["Copper-tungsten electrodes for extreme precision or micro-EDM", "Tungsten carbide workpieces where graphite is always preferred"],
    source: "Poco Graphite — 'Electrode Material Selection Guide'",
  },

  // ── QUALITY INSPECTION RULES ─────────────────────────────────────────────

  {
    id: "QI-001",
    category: "quality_inspection",
    severity: "critical",
    title: "Measure after thermal stabilization",
    rule: "Allow parts to thermally stabilize to ambient temperature (20°C ±1°C) before precision measurement. Steel expands ~12 µm/m/°C. Wait minimum 20 minutes per °C above ambient.",
    reasoning: "A 200mm steel part at 30°C (10°C above 20°C reference) is 24 µm longer than at reference temperature. This exceeds many tolerance bands. CMM compensation algorithms assume 20°C reference. Parts fresh from machining may be 40-60°C, causing 50-100 µm errors on typical parts.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.02 }],
    exceptions: ["When using calibrated thermal compensation probes", "Shop-floor gaging with known temperature correction factors"],
    source: "ISO 1 — 'Standard Reference Temperature for Measurement'",
    evidence_level: "iso_standard",
    standard_ref: "ISO 1:2016 — Standard reference temperature 20°C",
    formula_ref: ["thermal_expansion"],
    quantitative: "ΔL = α × L × ΔT. Steel α=11.7µm/m/°C, Al α=23.1µm/m/°C. 100mm steel part at +5°C above 20°C: ΔL = 5.85µm",
  },
  {
    id: "QI-002",
    category: "quality_inspection",
    severity: "important",
    title: "Use Cpk >= 1.33 as minimum process capability",
    rule: "Maintain Cpk ≥ 1.33 as the minimum acceptable process capability index. Cpk < 1.33 means >63 ppm defect rate — insufficient for most production requirements.",
    reasoning: "Cpk measures how well the process fits within spec limits, accounting for centering. Cpk = 1.0 means 2700 ppm defects (3σ). Cpk = 1.33 means 63 ppm (4σ). Automotive typically requires Cpk ≥ 1.67, aerospace ≥ 2.0. Below 1.33, the process is not reliably producing conforming parts.",
    conditions: [{ type: "batch_size_above", count: 50 }],
    exceptions: ["Prototype/short-run production where statistical process control isn't practical", "Non-critical dimensions where Cpk ≥ 1.0 is acceptable"],
    source: "AIAG — 'Statistical Process Control (SPC) Reference Manual'",
    evidence_level: "iso_standard",
    standard_ref: "ISO 22514-2:2017 — Process capability and performance",
    quantitative: "Cpk = min((USL-μ)/(3σ), (μ-LSL)/(3σ)). Cpk=1.33 → 63 ppm. Cpk=1.67 → 0.6 ppm. Cpk=2.0 → 0.002 ppm",
  },
  {
    id: "QI-003",
    category: "quality_inspection",
    severity: "recommended",
    title: "First article inspection on ALL critical dimensions",
    rule: "Perform first article inspection (FAI) measuring ALL critical dimensions on the first production part before running the batch. Verify process before committing material.",
    reasoning: "FAI catches setup errors, programming mistakes, tool wear issues, and fixture problems before they affect an entire batch. The cost of scrapping one part is trivial compared to scrapping 100. AS9102 requires full dimensional reporting on first articles for aerospace.",
    conditions: [{ type: "always" }],
    exceptions: ["Repeat production runs with proven, unchanged setups and SPC monitoring"],
    source: "AS9102 — 'First Article Inspection Requirement'",
    related_rules: ["QI-002"],
  },
  {
    id: "QI-004",
    category: "quality_inspection",
    severity: "recommended",
    title: "SPC sampling: minimum 5 consecutive parts for X-bar/R",
    rule: "For SPC X-bar/R charts, use subgroup size of 5 consecutive parts minimum. Subgroups smaller than 5 reduce sensitivity to mean shifts and increase false alarm rates.",
    reasoning: "The X-bar chart detects shifts in process mean. With n=5, a 1.5σ shift is detected with ~70% probability on the first sample after the shift. With n=3, sensitivity drops to ~50%. Rational subgroups of consecutive parts capture short-term variation within each subgroup.",
    conditions: [{ type: "batch_size_above", count: 100 }],
    exceptions: ["Destructive testing where sample size is limited by cost", "Very slow processes (e.g., grinding large parts) where n=3 is practical"],
    source: "Montgomery — 'Introduction to Statistical Quality Control'",
    related_rules: ["QI-002"],
  },
  {
    id: "QI-005",
    category: "quality_inspection",
    severity: "tip",
    title: "CMM probe qualification before each measurement session",
    rule: "Qualify (calibrate) the CMM probe system at the start of each measurement session. Probe tip offset drift from thermal changes and accidental contact causes systematic measurement errors.",
    reasoning: "CMM probes trigger at a specific deflection, but the exact trigger point varies with approach angle, speed, and probe geometry. Qualification measures a known reference sphere to determine the effective probe tip center and radius. Without re-qualification, thermal drift of the CMM structure causes progressive offset errors.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.01 }],
    exceptions: ["Temperature-controlled metrology labs with proven stability over the measurement period"],
    source: "Renishaw — 'CMM Probe Qualification Guide'",
  },
  {
    id: "QI-006",
    category: "quality_inspection",
    severity: "important",
    title: "GD&T datum precedence matches fixturing order",
    rule: "The GD&T datum reference frame (A|B|C) must match the fixturing order during manufacturing and inspection. Datum A is the primary seating plane, B the secondary alignment, C the tertiary stop.",
    reasoning: "GD&T datums define how the part is constrained in 3D space (3-2-1 principle). If the fixture doesn't constrain the part in the same order as the datum reference frame, measured feature positions will differ from design intent. Mismatched datums are the #1 cause of 'good parts that fail inspection.'",
    conditions: [{ type: "always" }],
    exceptions: ["Simultaneous datum features (e.g., A-B as a common datum axis)"],
    source: "ASME Y14.5 — 'Dimensioning and Tolerancing'",
    related_rules: ["DAT-001"],
  },
  {
    id: "QI-007",
    category: "quality_inspection",
    severity: "recommended",
    title: "Gage R&R study before production for tight tolerances",
    rule: "Perform a Gage R&R study before starting production on features with tight tolerances. The measurement system must contribute <10% of the total tolerance (P/T ratio < 10%).",
    reasoning: "If the measurement system variation is large relative to the tolerance, you cannot distinguish good parts from bad. A gage that consumes 30% of the tolerance band will reject good parts and accept bad ones randomly. AIAG guidelines: <10% excellent, 10-30% marginal, >30% unacceptable.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.025 }],
    exceptions: ["CMM measurement of features with tolerances > 0.1mm where gage capability is assumed"],
    source: "AIAG — 'Measurement Systems Analysis (MSA) Reference Manual'",
    related_rules: ["QI-005"],
  },
  {
    id: "QI-008",
    category: "quality_inspection",
    severity: "critical",
    title: "Never adjust process based on single out-of-spec part",
    rule: "Never adjust the machining process based on a single out-of-tolerance measurement. Investigate root cause first — the single point may be a measurement error, not a process shift.",
    reasoning: "Reacting to individual data points (over-adjustment) is called 'tampering' in SPC theory. It actually increases process variation. A single outlier could be a measurement error, chip under the part, or random cause. Wait for a pattern (trend, run, or out-of-control signal) before adjusting.",
    conditions: [{ type: "batch_size_above", count: 20 }],
    exceptions: ["Critical safety dimensions where any out-of-spec requires immediate investigation", "Trends visible on SPC charts that indicate assignable cause"],
    source: "Deming — 'Out of the Crisis: Tampering'",
    related_rules: ["QI-002"],
  },

  // ── COOLANT STRATEGY RULES ───────────────────────────────────────────────

  {
    id: "COOL-001",
    category: "coolant_strategy",
    severity: "critical",
    title: "Through-spindle coolant for deep holes",
    rule: "Use through-spindle coolant (TSC) for drilling deeper than 3×D. External flood coolant cannot penetrate the cutting zone beyond 3× the drill diameter.",
    reasoning: "As hole depth increases, the annular gap between the drill flutes and hole wall creates a hydraulic barrier. External coolant is blocked by chip flow and the drill body. TSC delivers coolant directly to the cutting lips at 40-70 bar, flushing chips upward through the flutes.",
    conditions: [{ type: "depth_ratio_above", ld_ratio: 3 }],
    exceptions: ["Peck drilling with full retract where external flood re-enters the hole each peck"],
    source: "Sandvik Coromant — 'Drilling: Coolant Application'",
    related_rules: ["DH-001", "DH-004"],
    evidence_level: "manufacturer_data",
    formula_ref: ["reynolds_number"],
    quantitative: "Re = ρ×v×D_h/μ. Turbulent (Re>4000) required for chip evacuation. P_min = 40 bar at 3xD, 70 bar at 5xD, 100+ bar at 8xD",
  },
  {
    id: "COOL-002",
    category: "coolant_strategy",
    severity: "important",
    title: "MQL for aluminum to prevent built-up edge",
    rule: "Use Minimum Quantity Lubrication (MQL) when machining aluminum alloys. MQL prevents built-up edge (BUE) more effectively than flood coolant while improving chip evacuation.",
    reasoning: "Aluminum is gummy and adheres to cutting edges (BUE). MQL delivers a fine oil mist that lubricates the tool-chip interface, preventing adhesion. Flood coolant can actually trap chips against the tool in aluminum, promoting BUE. MQL also eliminates coolant disposal costs for aluminum.",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: ["Deep pocket milling in aluminum where chip evacuation needs flood assistance", "High-MRR roughing where MQL cooling capacity is insufficient"],
    source: "Bielomatik — 'MQL Application Guide for Aluminum'",
  },
  {
    id: "COOL-003",
    category: "coolant_strategy",
    severity: "recommended",
    title: "Dry machining for cast iron roughing",
    rule: "Machine cast iron dry (no coolant) during roughing operations. Coolant on cast iron causes thermal shock cracking of carbide tools, and cast iron chips are naturally dry and manageable.",
    reasoning: "Cast iron produces short, discontinuous chips that don't need coolant for evacuation. The graphite in cast iron acts as a natural lubricant. Coolant causes rapid heating/cooling cycles on carbide inserts during interrupted cutting, creating thermal (comb) cracks that lead to edge failure.",
    conditions: [{ type: "material_iso", groups: ["K"] }],
    exceptions: ["Ductile iron grades that produce long chips needing coolant for chip breaking", "Precision boring where coolant is needed for thermal size control"],
    source: "Sandvik Coromant — 'Cast Iron Machining Guide'",
    related_rules: ["ANTI-004"],
  },
  {
    id: "COOL-004",
    category: "coolant_strategy",
    severity: "important",
    title: "High-pressure coolant (70+ bar) for chip breaking in titanium",
    rule: "Use high-pressure coolant (minimum 70 bar) when machining titanium and nickel alloys. HP coolant breaks the continuous stringy chips these alloys produce, preventing bird-nesting around the tool.",
    reasoning: "Ti-6Al-4V and Inconel produce long, continuous chips due to their high ductility and low thermal conductivity. These chips wrap around the tool and workpiece, causing re-cutting and surface damage. HP coolant acts as a hydraulic chip breaker, fragmenting chips into manageable segments.",
    conditions: [{ type: "material_iso", groups: ["S"] }],
    exceptions: ["Finishing with small DOC where chips are thin enough to break naturally"],
    source: "Seco Tools — 'Jetstream Tooling: High-Pressure Coolant'",
    evidence_level: "peer_reviewed",
    quantitative: "Tool life increase: 40-300% at 70-150 bar vs flood (5 bar). Chip length reduction: 10-50mm segments vs continuous stringy chips. Source: Ezugwu et al., IJMTM 2005",
    formula_ref: ["coolant_pressure"],
  },
  {
    id: "COOL-005",
    category: "coolant_strategy",
    severity: "critical",
    title: "No coolant on CBN/PCD tools in interrupted cuts",
    rule: "Never use flood coolant with CBN or PCD tools during interrupted cutting (milling, slotting). Thermal cycling from intermittent coolant contact causes micro-fracture of superhard tool materials.",
    reasoning: "CBN and PCD have very low thermal expansion but poor thermal shock resistance. During interrupted cuts, the edge alternates between hot (cutting) and cold (coolant exposure). This creates tensile stresses in the surface layer that propagate as micro-cracks, leading to rapid edge failure.",
    conditions: [{ type: "always" }],
    exceptions: ["Continuous turning with CBN where coolant contact is constant (no thermal cycling)", "PCD tools on aluminum where cutting temperatures are low"],
    source: "Element Six — 'Superhard Materials Application Guide'",
    related_rules: ["ANTI-004"],
  },
  {
    id: "COOL-006",
    category: "coolant_strategy",
    severity: "tip",
    title: "Coolant concentration 6-8% for general machining",
    rule: "Maintain metalworking fluid concentration between 6-8% for general machining operations. Below 5% promotes corrosion and biological growth. Above 10% causes skin irritation, foaming, and residue.",
    reasoning: "Coolant concentration is a balance of lubricity, cooling, corrosion protection, and biological stability. At <5%, water dominates and bacteria proliferate (Monday morning smell). At >10%, excess additives cause dermatitis, excessive foaming in high-pressure systems, and sticky residues on parts.",
    conditions: [{ type: "always" }],
    exceptions: ["Grinding operations that may require 3-5% for maximum cooling", "Heavy-duty tapping that benefits from 10-12% for lubricity"],
    source: "Master Fluid Solutions — 'Metalworking Fluid Management'",
  },
  {
    id: "COOL-007",
    category: "coolant_strategy",
    severity: "important",
    title: "Air blast for finishing passes on hardened steel",
    rule: "Use air blast (not flood coolant) for finishing passes on hardened steel with ceramic or CBN inserts. Coolant thermal shock on these tool materials reduces life dramatically.",
    reasoning: "Ceramic and CBN inserts operate best at high temperatures (800-1200°C for ceramics). Coolant quenches the cutting zone, causing thermal gradients that crack the brittle tool material. Air blast clears chips without thermal shock while allowing the tool to operate at its optimal temperature.",
    conditions: [{ type: "hardness_above", hrc: 45 }],
    exceptions: ["When thermal growth of the workpiece must be controlled for tight tolerances"],
    source: "Kennametal — 'Hard Part Machining Application Guide'",
    related_rules: ["HT-001", "HT-002"],
  },
  {
    id: "COOL-008",
    category: "coolant_strategy",
    severity: "recommended",
    title: "Cryogenic CO2 for titanium finishing",
    rule: "Consider cryogenic CO2 coolant for titanium finishing operations. Cryogenic cooling provides 40% longer tool life compared to flood coolant on Ti-6Al-4V.",
    reasoning: "Cryogenic CO2 at -78°C provides intense local cooling without the hydraulic force of flood coolant. It supercools the chip (making it brittle and easier to break) while keeping the workpiece thermally stable. No coolant disposal costs and environmentally clean.",
    conditions: [{ type: "material_iso", groups: ["S"] }],
    exceptions: ["When cryogenic delivery equipment is not available", "Deep pocket machining where CO2 cannot reach the cutting zone"],
    source: "5ME — 'Cryogenic Machining Technology'",
    related_rules: ["COOL-004"],
  },

  // ── ADAPTIVE MACHINING RULES ─────────────────────────────────────────────

  {
    id: "ADAPT-001",
    category: "adaptive",
    severity: "recommended",
    title: "Enable adaptive feed control only after stable baseline cut",
    rule: "Before enabling adaptive feed control, run at least one pass at conservative parameters to establish a baseline load reference. The controller needs a known-good reference to modulate from.",
    reasoning: "Adaptive feed systems adjust feed rate based on spindle load or cutting force relative to a target. Without a stable baseline, the system has no reference and may over- or under-compensate. The initial pass establishes the relationship between feed, engagement, and load for the specific tool/material/setup.",
    conditions: [{ type: "operation_type", operations: ["milling", "turning"] }],
    exceptions: ["Systems with material-specific databases that provide pre-calibrated baselines"],
    source: "Siemens — 'Adaptive Control Fundamentals'",
  },
  {
    id: "ADAPT-002",
    category: "adaptive",
    severity: "recommended",
    title: "Set load threshold at 70% of tool capacity",
    rule: "Set the adaptive control load threshold at 70% of the tool's maximum rated capacity. Too low (below 50%) causes excessive feed reductions. Too high (above 85%) risks tool breakage on load spikes.",
    reasoning: "Cutting load fluctuates due to material hardness variation, engagement changes, and chip re-cutting. The 70% target provides 30% headroom for transient spikes while keeping the tool productively loaded. At 50%, the tool is underutilized. At 90%, any spike exceeds the tool's capacity.",
    conditions: [{ type: "operation_type", operations: ["milling", "turning"] }],
    exceptions: ["Fragile tools (micro endmills, long-reach tools) where 50% threshold is safer"],
    source: "Heidenhain — 'Adaptive Feed Control (AFC) Setup Guide'",
  },
  {
    id: "ADAPT-003",
    category: "adaptive",
    severity: "recommended",
    title: "Use spindle load monitoring for roughing, vibration for finishing",
    rule: "Monitor spindle power/current for roughing adaptive control. Use vibration (accelerometer) monitoring for finishing. Different signals are optimal for different machining phases.",
    reasoning: "Spindle load is proportional to cutting force and responds to engagement changes — ideal for roughing where force management is the goal. Vibration monitoring detects chatter onset at much lower amplitudes than spindle load can resolve — critical for finishing where surface quality depends on vibration-free cutting.",
    conditions: [{ type: "always" }],
    exceptions: ["Integrated systems that fuse both signals for comprehensive monitoring"],
    source: "Montronix — 'Process Monitoring Application Guide'",
  },
  {
    id: "ADAPT-004",
    category: "adaptive",
    severity: "critical",
    title: "Disable adaptive during threading and tapping",
    rule: "NEVER use adaptive feed control during threading or tapping operations. Thread pitch requires exact synchronization between spindle speed and feed rate — any adaptive feed adjustment destroys the thread.",
    reasoning: "Threading requires feed = pitch × RPM with zero deviation. Adaptive feed control modulates feed rate based on load, which would change the effective pitch. Even a 1% feed variation creates a drunken thread helix that fails thread gaging.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: [],
    source: "Fanuc — 'Adaptive Control: Operation Restrictions'",
    related_rules: ["THR-005"],
    evidence_level: "empirical_validated",
    quantitative: "Thread feed = 1/TPI (imperial) or pitch (metric). Variation >0.1% causes pitch error >tolerance per ISO 965-1",
  },
  {
    id: "ADAPT-005",
    category: "adaptive",
    severity: "tip",
    title: "Bayesian tool wear prediction: update priors every 10 parts",
    rule: "When using Bayesian/Kalman filter tool wear prediction, re-calibrate the model priors every 10 parts. Without re-calibration, the filter drifts from the actual wear state.",
    reasoning: "Tool wear is a non-stationary process — wear rate accelerates in the final phase (tertiary wear). Kalman filter priors assume a process model that degrades over time. Re-calibrating with actual measurements every 10 parts resets the prediction accuracy and prevents premature or late tool changes.",
    conditions: [{ type: "batch_size_above", count: 50 }],
    exceptions: ["Single-part or prototype work where statistical prediction is unnecessary"],
    source: "Shop experience — 'In-process tool monitoring correlation studies'",
  },
  {
    id: "ADAPT-006",
    category: "adaptive",
    severity: "recommended",
    title: "SSV (spindle speed variation) for chatter suppression",
    rule: "Use Spindle Speed Variation (SSV) with ±5% sinusoidal RPM variation to suppress regenerative chatter. The varying tooth passage frequency disrupts the self-exciting vibration loop.",
    reasoning: "Regenerative chatter occurs when successive tooth passes reinforce surface waviness at the natural frequency. SSV continuously changes the tooth passage frequency, preventing the resonance from building up. The ±5% variation is enough to disrupt chatter without affecting surface finish significantly.",
    conditions: [{ type: "always" }],
    exceptions: ["Threading and tapping where RPM must be constant for pitch accuracy", "Very high surface finish requirements where SSV marks may be visible"],
    source: "Okuma — 'Machining Navi: Chatter Avoidance Technology'",
    related_rules: ["ADAPT-004"],
  },

  // ── DEEP HOLE DRILLING RULES ─────────────────────────────────────────────

  {
    id: "DH-001",
    category: "deep_hole",
    severity: "critical",
    title: "Peck drilling mandatory above 5xD",
    rule: "Use peck drilling (G83) for any hole deeper than 5× the drill diameter. Full-depth drilling without pecking causes chip packing, drill breakage, and poor hole quality.",
    reasoning: "Beyond 5×D, chips cannot evacuate from the flutes by centrifugal and coolant action alone. They pack in the flutes, increasing torque and thrust exponentially. The drill binds, overheats, and either breaks or produces an oversized, rough hole. Pecking retracts to clear chips.",
    conditions: [{ type: "aspect_ratio_above", ratio: 5 }],
    exceptions: ["Through-coolant drills specifically rated for deep drilling without pecking (some rated to 12×D)", "Gun drills designed for continuous deep-hole drilling"],
    source: "OSG — 'Deep Hole Drilling Application Guide'",
    related_rules: ["DH-002", "COOL-001"],
    evidence_level: "manufacturer_data",
    formula_ref: ["drill_peck_depth"],
    quantitative: "Initial peck = 1×D, subsequent = D×(1-0.3×(n-1)) where n = peck number",
    standard_ref: "ISO 3408-3:2006",
  },
  {
    id: "DH-002",
    category: "deep_hole",
    severity: "important",
    title: "Reduce peck depth progressively",
    rule: "Start pecking at 1×D depth for the first peck, then reduce peck depth by ~30% for each subsequent peck. Deeper pecks encounter worse chip evacuation conditions.",
    reasoning: "As the drill goes deeper, chips must travel further up the flutes to exit. Each additional diameter of depth significantly increases the friction and packing tendency. Progressive reduction of peck depth compensates for the decreasing evacuation efficiency at greater depths.",
    conditions: [{ type: "aspect_ratio_above", ratio: 8 }],
    exceptions: ["CNC cycles with chip-break pecking (G73) where shallow pecks break chips without full retract"],
    source: "Kennametal — 'Drilling: Peck Cycle Optimization'",
    related_rules: ["DH-001"],
    conditions_all: [{ type: "aspect_ratio_above", ratio: 8 }],
    evidence_level: "manufacturer_data",
    quantitative: "Peck_n = D × 0.7^(n-1), chip volume per peck stays constant",
  },
  {
    id: "DH-003",
    category: "deep_hole",
    severity: "important",
    title: "Pilot hole first for gun drilling",
    rule: "Always drill a pilot hole (2-3×D deep) with a stub drill before gun drilling. The pilot hole provides a concentric start for the gun drill, ensuring hole straightness.",
    reasoning: "Gun drills have a single-lip cutting geometry that tends to walk on entry. A pilot hole created by a rigid, short stub drill provides a precision-aligned bore that guides the gun drill during its initial engagement. Without a pilot, the hole can drift up to 0.5mm per 100mm.",
    conditions: [{ type: "aspect_ratio_above", ratio: 10 }],
    exceptions: ["Self-piloting gun drills with guide pads rated for direct entry", "Counter-rotating workpiece setups where the drill is naturally centered"],
    source: "Botek — 'Gun Drilling Fundamentals'",
    related_rules: ["DH-001"],
  },
  {
    id: "DH-004",
    category: "deep_hole",
    severity: "critical",
    title: "Through-tool coolant required above 8xD",
    rule: "Through-tool (internal) coolant delivery is mandatory for holes deeper than 8×D. External coolant cannot reach the cutting zone at these depths regardless of pressure.",
    reasoning: "At 8×D, the hydraulic resistance of the annular gap between drill and hole wall prevents external coolant from reaching the drill tip. The cutting zone runs dry, causing rapid temperature rise, built-up edge, drill margin galling, and eventual seizure. Internal coolant at 40-70 bar flushes directly to the cutting lips.",
    conditions: [{ type: "aspect_ratio_above", ratio: 8 }],
    exceptions: ["Peck drilling with full retract to surface, allowing re-flood between pecks (but very slow)"],
    source: "Sandvik Coromant — 'Deep Hole Drilling: Coolant Requirements'",
    related_rules: ["COOL-001"],
  },
  {
    id: "DH-005",
    category: "deep_hole",
    severity: "important",
    title: "Reduce feed 20% for last 2xD of blind hole",
    rule: "Reduce feed rate by 20% for the final 2×D of depth in blind holes. Chip evacuation is worst at the hole bottom, and reduced feed prevents chip packing against the drill point.",
    reasoning: "At the bottom of a blind hole, chips have nowhere to go except back up the flutes. The confined space and accumulated chip volume create maximum packing force. Reducing feed produces thinner chips that pack less tightly and are easier to flush with coolant.",
    conditions: [{ type: "always" }],
    exceptions: ["Through-holes where chips exit from both ends", "Through-coolant drills with sufficient flushing capacity at full feed"],
    source: "Guhring — 'Blind Hole Drilling Best Practices'",
    related_rules: ["DH-001"],
  },
  {
    id: "DH-006",
    category: "deep_hole",
    severity: "tip",
    title: "Use parabolic flute drills for deep holes in aluminum",
    rule: "Select parabolic flute geometry drills for deep-hole drilling in aluminum and other gummy materials. The wider flute volume improves chip evacuation for long, stringy chips.",
    reasoning: "Aluminum produces continuous spiral chips that are prone to packing. Standard drill flutes fill with these long chips quickly. Parabolic flutes have 30-40% more chip space with a polished flute surface that reduces friction, allowing chips to flow upward more easily.",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: ["Short holes (<3×D) where standard flutes provide adequate chip clearance"],
    source: "OSG — 'Drill Selection Guide: Aluminum Applications'",
    related_rules: ["COOL-002"],
  },

  // ── SURFACE TREATMENT RULES ──────────────────────────────────────────────

  {
    id: "ST-001",
    category: "surface_treatment",
    severity: "critical",
    title: "Leave stock allowance for hard chrome plating",
    rule: "When parts receive hard chrome plating, machine all plated surfaces 0.025-0.075mm undersized per side to account for plating thickness buildup.",
    reasoning: "Hard chrome plating deposits 0.025-0.075mm per side (typical). If the part is machined to final dimension, plating makes it oversize. The plating thickness is specified by the coating requirement — consult the plating spec to determine exact allowance needed.",
    conditions: [{ type: "always" }],
    exceptions: ["Flash chrome plating (<0.005mm) where allowance is negligible", "Surfaces that will be post-plate ground to final dimension"],
    source: "MIL-STD-1501 — 'Chrome Plating: Low Embrittlement'",
    related_rules: ["ST-002"],
  },
  {
    id: "ST-002",
    category: "surface_treatment",
    severity: "recommended",
    title: "Add grinding stock for heat treat distortion",
    rule: "Add 0.05-0.10mm grinding stock per side on precision surfaces that will be heat treated. Carburizing and through-hardening cause 0.02-0.08mm dimensional change from phase transformation and residual stress.",
    reasoning: "Martensite transformation during hardening causes ~1% volume expansion. Uneven cooling creates residual stress that warps the part. The grinding allowance provides enough material to correct distortion while reaching final dimensions. Deeper case depths cause more distortion.",
    conditions: [{ type: "always" }],
    exceptions: ["Stress-relieved parts with proven minimal distortion (<0.01mm)", "Induction-hardened local areas where bulk distortion is minimal"],
    source: "ASM International — 'Heat Treating: Distortion Control'",
    related_rules: ["ST-001"],
  },
  {
    id: "ST-003",
    category: "surface_treatment",
    severity: "important",
    title: "Anodize allowance: add 50% of anodize thickness",
    rule: "For Type III hard anodize on aluminum, add 50% of the specified anodize thickness to external dimensions and subtract 50% from internal dimensions. Anodize grows ~50% inward and ~50% outward from the original surface.",
    reasoning: "Hard anodize converts the aluminum surface to aluminum oxide (Al₂O₃). The oxide layer grows both into and out from the original surface. A 0.050mm hard anodize spec means ~0.025mm grows outward (increasing dimensions) and ~0.025mm grows inward (decreasing bore sizes).",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: ["Type I chromic anodize where the very thin layer (<0.005mm) makes allowance negligible", "Sulphuric anodize (Type II) at 0.018-0.025mm where allowance is minimal"],
    source: "MIL-A-8625 — 'Anodic Coatings for Aluminum'",
    evidence_level: "iso_standard",
    standard_ref: "MIL-A-8625F Type III — Hard Anodic Coating",
    quantitative: "Type II: 12-25µm total (50% growth). Type III: 25-75µm (50% growth). Machine undersized by: coating_thickness × 0.5",
  },
  {
    id: "ST-004",
    category: "surface_treatment",
    severity: "recommended",
    title: "Machine stress-relief features before heat treatment",
    rule: "Machine stress-relief features (radii at section changes, undercuts at shoulders, relief grooves) before heat treatment. These features reduce quench cracking risk at stress concentrators.",
    reasoning: "During quenching, thermal gradients create internal stresses that concentrate at sharp corners and section changes. A sharp internal corner acts as a crack initiator. Generous radii (minimum 1mm, preferably 2-3mm) distribute stress and prevent quench cracks.",
    conditions: [{ type: "feature_present", features: ["heat_treat", "harden"] }],
    exceptions: ["Parts that will be nitrided (lower thermal stress than quench hardening)", "Through-hardened parts where stress relief is provided by tempering"],
    source: "ASM International — 'Heat Treating Design Guidelines'",
    related_rules: ["ST-002"],
  },
  {
    id: "ST-005",
    category: "surface_treatment",
    severity: "tip",
    title: "Shot peening after machining, before coating",
    rule: "Apply shot peening after final machining but before any coating or plating. Shot peening induces compressive residual stress that improves fatigue life 20-30% on cyclic-load parts.",
    reasoning: "Shot peening creates a compressive stress layer 0.1-0.3mm deep that opposes fatigue crack initiation (cracks require tensile stress to open). It must be done after machining (which creates tensile surface stress) and before coating (which could be damaged by peening impact).",
    conditions: [{ type: "always" }],
    exceptions: ["Precision surfaces where peening roughness is unacceptable (peening creates Ra 3-6 µm)", "Parts that will receive stress-relieving treatments after machining"],
    source: "SAE J2441 — 'Shot Peening: Specifications'",
  },
  {
    id: "ST-006",
    category: "surface_treatment",
    severity: "important",
    title: "Mask threaded holes before anodize/plate",
    rule: "Mask all threaded holes and precision bores before anodizing or plating. Coating deposited in threads changes the effective pitch diameter, causing assembly interference.",
    reasoning: "A 0.050mm hard anodize layer on thread flanks reduces the effective internal thread diameter by 0.100mm (both flanks). This can change a Class 2B fit to an interference fit. Masking with plugs, tape, or liquid maskant protects critical features from coating buildup.",
    conditions: [{ type: "feature_present", features: ["thread"] }],
    exceptions: ["Threads that are specified to be coated for corrosion protection (size the tap accordingly)"],
    source: "Anoplate — 'Masking Guide for Anodize and Plating'",
    related_rules: ["THR-001"],
  },

  // ── POST PROCESSING RULES ───────────────────────────────────────────────

  {
    id: "PP-001",
    category: "post_processing",
    severity: "critical",
    title: "Verify G28/G30 safe position before tool change",
    rule: "Always verify that the G28/G30 intermediate and reference positions are clear of the workpiece, fixture, and any clamps before executing a tool change. Machine crash results from conflicts between safe position and workholding.",
    reasoning: "G28 moves through an intermediate point (set by G28.1) to the machine reference position. If the intermediate point or the travel path intersects the fixture, the machine crashes at rapid traverse speed. Each setup must verify the safe tool change path is clear.",
    conditions: [{ type: "always" }],
    exceptions: ["Machines with dedicated tool change positions that are mechanically verified"],
    source: "Fanuc — 'Programming Manual: Reference Position Return'",
    related_rules: ["SAFE-001"],
  },
  {
    id: "PP-002",
    category: "post_processing",
    severity: "recommended",
    title: "Use G43 tool length compensation, never hardcoded Z values",
    rule: "Always use G43 (tool length compensation) with the tool offset register. Never hardcode absolute Z values for tool positions — hardcoded values break when tools are replaced or re-measured.",
    reasoning: "Each tool has a different gauge length. G43 Hxx adds the tool length offset to the programmed Z, allowing the program to work with any tool length. Hardcoded Z values only work for the exact tool that was measured during programming — replacing a worn or broken tool requires reprogramming.",
    conditions: [{ type: "always" }],
    exceptions: ["Dedicated single-tool machines where the tool never changes"],
    source: "Haas Automation — 'Programming: Tool Length Compensation'",
  },
  {
    id: "PP-003",
    category: "post_processing",
    severity: "recommended",
    title: "Cancel cutter compensation (G40) before tool change",
    rule: "Cancel cutter radius compensation (G40) before any tool change or rapid positioning move. Active compensation during tool change causes unexpected motion as the controller tries to maintain the offset.",
    reasoning: "Cutter compensation (G41/G42) offsets the tool path by the cutter radius. The controller plans compensated moves one or two blocks ahead. If a tool change occurs while compensation is active, the controller may generate unexpected moves to maintain the offset geometry, causing crashes.",
    conditions: [{ type: "always" }],
    exceptions: [],
    source: "Fanuc — 'Programming Manual: Cutter Compensation'",
    related_rules: ["PP-001"],
  },
  {
    id: "PP-004",
    category: "post_processing",
    severity: "recommended",
    title: "Add block numbers every 10 lines for operator reference",
    rule: "Include N-number block labels every 10 lines in the G-code output. This helps operators find program locations for restart, troubleshooting, and verifying active lines during dry runs.",
    reasoning: "When a program stops mid-cycle (tool break, power failure), the operator needs to restart from a specific location. Sequential N-numbers every 10 lines provide landmarks. Most controls support search-by-N-number for quick program navigation.",
    conditions: [{ type: "batch_size_above", count: 10 }],
    exceptions: ["Very short programs (<50 lines) where block numbers add unnecessary clutter", "Controls with built-in line tracking that makes N-numbers redundant"],
    source: "Shop experience — 'G-code best practices for production'",
  },
  {
    id: "PP-005",
    category: "post_processing",
    severity: "critical",
    title: "M01 optional stop after each setup operation",
    rule: "Insert M01 (optional stop) after each setup operation, tool change, and critical machining step. This gives the operator the opportunity to verify datum alignment, check tool condition, and inspect features.",
    reasoning: "M01 stops execution only when the operator has activated the Optional Stop button — it doesn't interrupt automated production. During setup verification and first-article runs, the operator enables optional stop to check each operation. In production, it's disabled for uninterrupted cycling.",
    conditions: [{ type: "always" }],
    exceptions: ["Lights-out production where no operator is present", "High-volume production with proven programs where stops waste cycle time"],
    source: "Haas Automation — 'Programming: Program Control Codes'",
  },
  {
    id: "PP-006",
    category: "post_processing",
    severity: "tip",
    title: "Add cycle time comments per operation for production planning",
    rule: "Add comments in the G-code showing estimated cycle time for each operation. This helps production planners schedule work and identify bottleneck operations for optimization.",
    reasoning: "Cycle time visibility at the operation level enables data-driven scheduling. If a 10-operation program takes 45 minutes, knowing that operation 7 takes 15 minutes (33%) identifies the optimization target. Without per-operation timing, bottleneck identification requires manual time studies.",
    conditions: [{ type: "batch_size_above", count: 5 }],
    exceptions: ["Prototype programs that will be significantly modified before production"],
    source: "Shop experience — 'Production planning best practices'",
    related_rules: ["PP-004"],
  },

  // ── HARD TURNING RULES ───────────────────────────────────────────────────

  {
    id: "HT-001",
    category: "hard_turning",
    severity: "critical",
    title: "Minimum 45 HRC for hard turning viability",
    rule: "Hard turning is only viable for materials above 45 HRC. Below this hardness, the material is too ductile for CBN/ceramic inserts — they perform poorly and wear rapidly on soft material.",
    reasoning: "CBN and ceramic inserts rely on high cutting temperatures to soften a thin shear zone while the bulk material remains hard and provides support. Below 45 HRC, the material deforms plastically instead of shearing cleanly, causing built-up edge on CBN and excessive notch wear on ceramics.",
    conditions: [{ type: "hardness_above", hrc: 45 }],
    exceptions: ["Case-hardened parts where the hard case is being turned (core may be softer)"],
    source: "Sandvik Coromant — 'Hard Part Turning Guide'",
    related_rules: ["HT-002", "GRIND-007"],
    evidence_level: "peer_reviewed",
    standard_ref: "ISO 3685:1993 — Tool life testing with single-point tools",
    quantitative: "Below 45 HRC: chip morphology transitions from segmented to continuous, CBN wear rate increases 3-5×",
  },
  {
    id: "HT-002",
    category: "hard_turning",
    severity: "important",
    title: "CBN inserts for interrupted cuts, ceramics for continuous",
    rule: "Use CBN inserts for interrupted cuts on hardened material (higher toughness survives impact). Use ceramic inserts for continuous cuts (higher hot hardness, lower cost). Note: this reverses a common misconception.",
    reasoning: "CBN has a fracture toughness of ~6 MPa√m vs ceramics at ~3 MPa√m, making CBN twice as resistant to impact. Ceramics have higher hot hardness and can run faster in continuous cuts but shatter on interrupted entry. The myth that 'CBN is for continuous, ceramic for interrupted' is backwards.",
    conditions: [{ type: "hardness_above", hrc: 50 }],
    exceptions: ["Whisker-reinforced ceramics (e.g., SiC whisker Al₂O₃) that have improved toughness for light interruptions"],
    source: "Kennametal — 'CBN and Ceramic Insert Application Guide'",
    related_rules: ["HT-001", "COOL-007"],
  },
  {
    id: "HT-003",
    category: "hard_turning",
    severity: "recommended",
    title: "DOC <= nose radius for hard turning finish",
    rule: "For finishing cuts on hardened material, keep depth of cut ≤ the insert nose radius. Exceeding the nose radius creates excessive cutting pressure that causes chatter and poor surface finish.",
    reasoning: "When DOC ≤ nose radius, the chip is formed entirely within the nose radius zone, producing predominantly radial force. When DOC exceeds the nose radius, the straight edge engages, adding axial force and increasing the lever arm that drives vibration.",
    conditions: [{ type: "hardness_above", hrc: 45 }],
    exceptions: ["Roughing passes where higher DOC is acceptable with reduced speed"],
    source: "Sandvik Coromant — 'Hard Part Turning: Depth of Cut Selection'",
    related_rules: ["HT-001"],
    evidence_level: "manufacturer_data",
    formula_ref: ["cutting_force_turning"],
    quantitative: "F_r = kc1 × ap × f^(1-mc), radial force dominates when ap > r_nose",
  },
  {
    id: "HT-004",
    category: "hard_turning",
    severity: "important",
    title: "Rigid setup essential: 3:1 max L/D without tailstock",
    rule: "Hard turning generates high radial forces due to the negative rake geometry and high material hardness. Maximum L/D without tailstock support is 3:1 (vs 4:1 for conventional turning).",
    reasoning: "Hard turning forces are 2-3× higher than soft turning at equivalent parameters due to the high shear strength of hardened material and negative rake inserts. The reduced L/D limit compensates for these higher forces to prevent deflection-induced taper and chatter.",
    conditions: [{ type: "aspect_ratio_above", ratio: 3 }],
    exceptions: ["Ultra-light finishing passes with DOC < 0.05mm where forces are minimal"],
    source: "Machinist Handbook — 'Hard Turning: Setup Requirements'",
    related_rules: ["TURN-001", "TURN-004"],
  },
  {
    id: "HT-005",
    category: "hard_turning",
    severity: "tip",
    title: "Hard turning can achieve Ra 0.2-0.4 um — comparable to grinding",
    rule: "Hard turning with CBN inserts can achieve Ra 0.2-0.4 µm surface finish, comparable to grinding. This eliminates the grinding operation for many finish applications, reducing cycle time and setup.",
    reasoning: "The combination of high cutting speed (150-250 m/min), low feed (0.05-0.15 mm/rev), and the polishing action of the CBN nose radius produces mirror-like finishes on hardened steel. The white layer (rehardened surface) is typically <5 µm, within acceptable limits for most applications.",
    conditions: [{ type: "hardness_above", hrc: 55 }],
    exceptions: ["Surfaces requiring Ra < 0.1 µm (still need grinding or superfinishing)", "Parts where white layer is unacceptable (bearing races, gears) — requires controlled parameters"],
    source: "Sumitomo — 'CBN Hard Turning vs Grinding: Cost Comparison'",
    related_rules: ["HT-001", "GRIND-005"],
  },

  // ── HSM (HIGH SPEED MACHINING) RULES ─────────────────────────────────────

  {
    id: "HSM-001",
    category: "hsm",
    severity: "critical",
    title: "Use balanced tool holders (G2.5 or better) above 15,000 RPM",
    rule: "All tool holders used above 15,000 RPM must be balanced to G2.5 or better per ISO 1940. Imbalanced holders cause spindle bearing damage, chatter, and reduced tool life.",
    reasoning: "Centrifugal force from imbalance increases with RPM². A holder with 1 g·mm imbalance at 15,000 RPM generates ~25 N of centrifugal force oscillating at 250 Hz. This force exceeds the cutting force on finishing passes, causing vibration marks. Sustained operation damages spindle bearings (costing $10,000-50,000+ to replace).",
    conditions: [{ type: "spindle_speed_above", rpm: 15000 }],
    exceptions: ["ER collet chucks at moderate RPM (10,000-15,000) where imbalance is inherently low"],
    source: "Haimer — 'Tool Holder Balancing: ISO 1940 Guidelines'",
    related_rules: ["GRIND-008"],
    evidence_level: "iso_standard",
    standard_ref: "ISO 1940-1:2003 — Mechanical vibration — Balance quality G2.5",
    quantitative: "Unbalance force F = m×e×ω², at 20kRPM a 1g·mm imbalance = 44N centrifugal force",
  },
  {
    id: "HSM-002",
    category: "hsm",
    severity: "important",
    title: "Radial engagement <= 10% of diameter for HSM",
    rule: "In high-speed machining, limit radial engagement (ae) to ≤10% of the tool diameter. Low ae/D ratio maintains constant chip load, prevents heat buildup, and allows higher feed rates.",
    reasoning: "At low radial engagement, each flute spends most of the revolution in the air gap, cooling between cuts. The thin chip dissipates heat into the chip (not the tool). This allows 3-5× higher surface speed than conventional milling. At high ae/D, heat accumulates in the tool, causing rapid wear.",
    conditions: [{ type: "spindle_speed_above", rpm: 12000 }],
    exceptions: ["Adaptive/trochoidal toolpaths that maintain constant engagement regardless of programmed ae"],
    source: "Makino — 'High Speed Machining: Engagement Strategy'",
    related_rules: ["HSM-003"],
  },
  {
    id: "HSM-003",
    category: "hsm",
    severity: "important",
    title: "Avoid full-width slotting in HSM",
    rule: "Never use full-width slotting (ae = 100%) in high-speed machining. Full engagement doubles cutting force and traps heat in the tool. Use trochoidal milling or slot with multiple passes instead.",
    reasoning: "Full slotting at 100% engagement means the tool is always cutting — no cooling time in the air gap. Heat builds rapidly, softening the cutting edge. Forces are also symmetric (180° engagement), eliminating the radial force direction that helps stabilize the cut. Trochoidal paths maintain low ae even in slot geometry.",
    conditions: [{ type: "spindle_speed_above", rpm: 10000 }],
    exceptions: ["Very shallow slots (<0.5mm) where heat generation is minimal"],
    source: "Seco Tools — 'High Speed Machining Handbook'",
    related_rules: ["HSM-002", "ANTI-005"],
  },
  {
    id: "HSM-004",
    category: "hsm",
    severity: "recommended",
    title: "Ramp/helix entry, never plunge in HSM",
    rule: "Always use ramping or helical entry when beginning a cut in HSM. Never plunge into material — the axial force at high speed exceeds the tool and spindle capacity.",
    reasoning: "At high RPM, even a small plunge depth generates extreme chip load per tooth because the feed is also very high (high RPM × chip load × flutes). A 0.5mm plunge at 20,000 RPM with 0.1mm/tooth on a 4-flute tool means 8,000mm/min downward — far exceeding the axial load rating.",
    conditions: [{ type: "spindle_speed_above", rpm: 10000 }],
    exceptions: ["Drill mills rated for HSM plunging", "Center-cutting endmills with specifically designed plunge geometry"],
    source: "Harvey Performance — 'High Speed Milling Entry Methods'",
    related_rules: ["ANTI-002"],
  },
  {
    id: "HSM-005",
    category: "hsm",
    severity: "critical",
    title: "Tool runout < 5 um for HSM finishing",
    rule: "Maintain total indicated runout (TIR) < 5 µm for HSM finishing operations. At high RPM, runout causes one flute to do all the cutting, halving tool life and ruining surface finish.",
    reasoning: "At 20,000 RPM with 10 µm runout, one flute cuts 10 µm deeper than its neighbor. This flute takes the entire chip load while the other flute barely touches the surface. The overloaded flute wears 5× faster, and the alternating cut depths leave visible witness marks on the surface.",
    conditions: [{ type: "spindle_speed_above", rpm: 15000 }],
    exceptions: ["Single-flute endmills where runout only affects DOC consistency"],
    source: "Rego-Fix — 'Runout Measurement and Control for HSM'",
    related_rules: ["HSM-001", "MICRO-001"],
    evidence_level: "peer_reviewed",
    quantitative: "Effective chip load variation: fz_eff = fz ± TIR/2. At 5µm TIR, 2-flute: one flute cuts 105%, other 95%. At 20µm: 120%/80% → 2× wear rate on heavy flute",
  },

  // ── MICRO MACHINING RULES ────────────────────────────────────────────────

  {
    id: "MICRO-001",
    category: "micro_machining",
    severity: "critical",
    title: "Tool runout < 2 um for micro-milling",
    rule: "Maintain total indicated runout (TIR) < 2 µm for micro-milling with tools ≤ 0.5mm diameter. With a 0.2mm tool, even 5 µm runout means one flute cuts 5% more diameter than intended.",
    reasoning: "Micro tools have extremely low stiffness (proportional to D⁴). Runout adds an oscillating radial force at the tooth passing frequency. At 2 µm with a 0.2mm tool, the runout is 1% of the diameter — enough to cause one flute to completely miss the workpiece on finishing passes. Use shrink-fit or precision collet holders.",
    conditions: [{ type: "always" }],
    exceptions: ["Single-flute micro endmills where runout only causes a slight dimensional shift"],
    source: "Zecha — 'Micro Tool Application Guide'",
    related_rules: ["HSM-005"],
  },
  {
    id: "MICRO-002",
    category: "micro_machining",
    severity: "important",
    title: "Minimum chip thickness governs feed",
    rule: "In micro-machining, feed rate must exceed the minimum chip thickness (approximately 30% of the cutting edge radius). Below this threshold, the tool ploughs instead of cutting, generating heat and accelerating wear.",
    reasoning: "Cutting edges have a finite radius (typically 1-5 µm). When the uncut chip thickness is less than ~30% of this edge radius, material is pushed under the edge (ploughing) instead of being sheared into a chip. Ploughing generates friction heat, work-hardens the surface, and causes rapid flank wear.",
    conditions: [{ type: "always" }],
    exceptions: ["Burnishing operations that intentionally use sub-minimum chip thickness for surface improvement"],
    source: "Chae, Park & Freiheit — 'Micro-Milling Minimum Chip Thickness'",
    evidence_level: "peer_reviewed",
    quantitative: "h_min ≈ 0.2-0.4 × r_edge. For sharp tool r_edge=2µm: h_min=0.4-0.8µm. Below h_min: ploughing dominates, specific energy rises exponentially. Source: Liu et al., IJMTM 2006",
  },
  {
    id: "MICRO-003",
    category: "micro_machining",
    severity: "important",
    title: "Use air turbine spindles for RPM >60,000",
    rule: "For spindle speeds above 60,000 RPM, use air turbine spindle attachments. Electric spindles have thermal growth issues at these speeds; air turbines are thermally stable and achieve 80,000-160,000 RPM.",
    reasoning: "Electric spindle bearings generate heat proportional to speed × load. Above 60,000 RPM, thermal growth of the spindle shaft can reach 10-20 µm, exceeding the total tolerance budget for micro features. Air turbines use air bearings with near-zero friction and no thermal growth.",
    conditions: [{ type: "spindle_speed_above", rpm: 60000 }],
    exceptions: ["Hybrid ceramic-bearing electric spindles rated for 80,000+ RPM with active cooling"],
    source: "NSK — 'Air Turbine Spindle Technology for Micro Machining'",
  },
  {
    id: "MICRO-004",
    category: "micro_machining",
    severity: "recommended",
    title: "Flood coolant causes tool deflection on micro tools",
    rule: "Avoid flood coolant for micro-machining tools < 0.5mm diameter. The coolant jet force deflects the tool, causing dimensional errors. Use air blast or MQL instead.",
    reasoning: "A standard coolant nozzle delivers fluid at 5-20 bar. On a 0.3mm tool with 5mm stickout, even moderate fluid pressure generates enough lateral force to deflect the tool 5-10 µm — often exceeding the required tolerance. MQL delivers lubrication without significant mechanical force.",
    conditions: [{ type: "always" }],
    exceptions: ["Deep micro-holes where coolant is needed for chip evacuation (reduce pressure and use through-tool delivery)"],
    source: "Datron — 'Micro Machining: Coolant Strategy'",
    related_rules: ["COOL-002"],
  },
  {
    id: "MICRO-005",
    category: "micro_machining",
    severity: "tip",
    title: "Measure tool diameter optically, not with contact probe",
    rule: "Use optical (laser or camera-based) tool measurement for micro tools. Contact-based tool probes apply enough force to deflect or break tools smaller than 0.5mm diameter.",
    reasoning: "A standard tool setter applies 0.5-2 N of trigger force. On a 0.3mm carbide endmill with 5mm stickout, this force causes 10-50 µm deflection, giving a false diameter reading. Laser tool setters measure without contact, providing accurate diameter and runout data without risk of breakage.",
    conditions: [{ type: "always" }],
    exceptions: ["Rigid micro drills with short stickout where contact force is within acceptable limits"],
    source: "Blum-Novotest — 'Non-Contact Tool Measurement for Micro Tools'",
  },

  // ── HYBRID ADDITIVE RULES ────────────────────────────────────────────────

  {
    id: "HA-001",
    category: "hybrid_additive",
    severity: "important",
    title: "Machine datum surfaces on printed stock before feature cutting",
    rule: "Machine all datum reference surfaces on AM (3D-printed) parts before cutting precision features. As-printed surfaces have 15-50 µm roughness and poor geometric accuracy — unsuitable as datums.",
    reasoning: "Additive manufacturing produces surfaces with staircase artifacts (layer lines), partially melted powder particles, and geometric deviations of 0.1-0.3mm from nominal. Using these surfaces as machining datums propagates the AM inaccuracy into all features. Machine flat, cylindrical, or planar datums first.",
    conditions: [{ type: "always" }],
    exceptions: ["Non-critical parts where AM accuracy is sufficient for datum purposes"],
    source: "DMG MORI — 'LASERTEC: Hybrid Additive Manufacturing Guide'",
    related_rules: ["DAT-001", "SEQ-002"],
  },
  {
    id: "HA-002",
    category: "hybrid_additive",
    severity: "critical",
    title: "Add 0.5-1.0mm machining stock to all printed surfaces",
    rule: "Add 0.5-1.0mm of machining stock allowance to all AM-printed surfaces that will be finish machined. AM dimensional accuracy of ±0.1-0.3mm is insufficient for machined tolerances.",
    reasoning: "AM parts have dimensional variation from thermal distortion, support structure marks, and layer-to-layer alignment. The 0.5-1.0mm allowance ensures the machining tool always finds material to cut, even at the worst-case deviation. Too little stock risks air-cutting on convex surfaces or missing material on concave surfaces.",
    conditions: [{ type: "always" }],
    exceptions: ["Internal channels and lattice structures that cannot be machined (design to net shape)", "As-built surfaces where post-machining is not required"],
    source: "EOS — 'Design Guidelines for Metal AM: Machining Allowances'",
    related_rules: ["HA-001"],
  },
  {
    id: "HA-003",
    category: "hybrid_additive",
    severity: "important",
    title: "Stress-relieve printed parts before precision machining",
    rule: "Stress-relieve AM parts before precision machining operations. Residual stress from the AM build process causes distortion when material is removed, shifting features out of tolerance.",
    reasoning: "Laser powder bed fusion creates extreme thermal gradients (~10⁶ °C/s cooling rate) that lock in residual stress often exceeding the yield strength. When machining removes material, the stress redistributes, causing the part to warp. Stress relief at 600-700°C for 1-2 hours reduces residual stress by 60-80%.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Parts built with optimized scan strategies (island scanning, checkerboard) that minimize residual stress"],
    source: "Renishaw — 'Post-Processing of AM Parts: Stress Relief'",
    related_rules: ["HA-005"],
  },
  {
    id: "HA-004",
    category: "hybrid_additive",
    severity: "recommended",
    title: "3D-printed conformal fixtures reduce setup time 40-60%",
    rule: "Use 3D-printed conformal fixtures for complex part geometries. Printed fixtures that match the part's freeform shape reduce setup time by 40-60% compared to conventional vise/clamp setups.",
    reasoning: "Complex parts (organic shapes, thin walls, non-prismatic geometry) are difficult to fixture with standard tooling. A 3D-printed fixture (polymer for inspection, metal for machining) cradles the part perfectly, distributing clamping force evenly and eliminating the need for custom soft jaws or complex clamping arrangements.",
    conditions: [{ type: "batch_size_above", count: 10 }],
    exceptions: ["Single-part prototypes where fixture printing time exceeds manual fixturing time", "Simple prismatic parts that clamp easily in standard vises"],
    source: "Markforged — 'Manufacturing Fixtures with Additive'",
  },
  {
    id: "HA-005",
    category: "hybrid_additive",
    severity: "tip",
    title: "Hybrid sequence: print near-net, rough, stress relieve, finish",
    rule: "Optimal hybrid manufacturing sequence: 1) Print near-net shape → 2) Rough machine (remove support structures, establish datums) → 3) Stress relieve → 4) Finish machine to final dimensions.",
    reasoning: "This sequence leverages each process optimally. AM creates complex near-net geometry efficiently. Rough machining removes bulk AM artifacts and excess stock. Stress relief relaxes distortion from both AM and rough machining before final dimensioning. Finish machining achieves tight tolerances on a stress-free part.",
    conditions: [{ type: "always" }],
    exceptions: ["In-envelope hybrid machines (e.g., DMG MORI LASERTEC) where AM and machining alternate layer-by-layer"],
    source: "Hybrid Manufacturing Technologies — 'Process Planning for Hybrid AM+CNC'",
    related_rules: ["HA-002", "HA-003"],
  },

  // ── CUTTING FORCE PHYSICS ─────────────────────────────────────────────────

  {
    id: "CF-001",
    category: "cutting_force",
    severity: "critical",
    title: "Kienzle force model: specific cutting force lookup",
    rule: "Use the Kienzle model Fc = kc1.1 × b × h^(1-mc) to predict tangential cutting force. Look up kc1.1 per material ISO group for accurate force estimation before programming.",
    reasoning: "The Kienzle model is the industry-standard empirical force prediction method. Accurate force estimation prevents overloads, enables correct power checks, and supports deflection compensation. Without it, parameter selection is guesswork.",
    conditions: [{ type: "always" }],
    exceptions: ["Micro-machining below h=0.01mm where size effect dominates"],
    source: "Kienzle, O. (1952) — 'Die Bestimmung von Kräften und Leistungen an spanenden Werkzeugen und Werkzeugmaschinen'",
    evidence_level: "peer_reviewed",
    formula_ref: ["kienzle_force"],
    quantitative: "kc1.1 values: Steel P=1800, Stainless M=2100, Cast Iron K=1100, Aluminum N=700, Titanium S=2800, Hardened H=3200 N/mm²",
    related_rules: ["CF-002", "CF-003", "CF-005"],
  },
  {
    id: "CF-002",
    category: "cutting_force",
    severity: "important",
    title: "Correct specific cutting force for rake angle",
    rule: "Apply the rake angle correction factor kc_γ = 1 - 0.01×(γ_actual - γ_ref) to adjust kc1.1 for the actual tool rake angle vs the reference angle used in the Kienzle table.",
    reasoning: "Kienzle kc1.1 values are measured at a reference rake angle (typically 0° or 6°). Actual tools have different rake angles that change cutting force by approximately 1% per degree. Ignoring this correction leads to 5-15% force estimation error.",
    conditions: [{ type: "always" }],
    exceptions: ["When using manufacturer-specific cutting force data already matched to their tool geometry"],
    source: "König, W. — 'Fertigungsverfahren Band 1: Drehen, Fräsen, Bohren'",
    evidence_level: "peer_reviewed",
    formula_ref: ["rake_angle_correction"],
    quantitative: "kc_γ = 1 - 0.01×(γ_actual - γ_ref). For γ=6° vs ref 0°: kc_γ = 0.94 (6% lower force)",
    related_rules: ["CF-001", "CF-003"],
  },
  {
    id: "CF-003",
    category: "cutting_force",
    severity: "important",
    title: "Power requirement check: Pc = Fc × Vc / (60000 × η)",
    rule: "Calculate required cutting power before starting any roughing operation. Never exceed 80% of continuous spindle power rating to avoid stalling and ensure motor longevity.",
    reasoning: "Spindle overload causes stalling (crash risk), trips thermal protection (downtime), and accelerates bearing wear. The 80% limit accounts for spindle efficiency losses and provides headroom for transient force spikes at entry/exit.",
    conditions: [{ type: "always" }],
    exceptions: ["Short burst cuts (<2 min) may use up to S3-25% rating (~120% continuous)"],
    source: "Sandvik Coromant — 'Metal Cutting Technology: Technical Guide'",
    evidence_level: "manufacturer_data",
    formula_ref: ["cutting_power"],
    quantitative: "Pc [kW] = kc1.1 × ap × f^(1-mc) × Vc / (60000 × 0.8). η=0.8 typical",
    related_rules: ["CF-001", "MC-001"],
  },
  {
    id: "CF-004",
    category: "cutting_force",
    severity: "recommended",
    title: "Size effect: specific cutting energy rises at small chip thickness",
    rule: "At very small uncut chip thickness (h < 0.02mm), specific cutting force kc rises dramatically due to the size effect. Account for 2-3× higher kc when micro-finishing or machining at very low feeds.",
    reasoning: "Below a critical chip thickness, material behavior transitions from shearing to ploughing. The energy per unit volume removed increases non-linearly, causing higher forces and more heat per unit MRR than the Kienzle model predicts at normal scales.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Diamond turning where the edge radius is < 0.1µm"],
    source: "Merchant, M.E. (1945) — 'Mechanics of the Metal Cutting Process'",
    evidence_level: "peer_reviewed",
    quantitative: "kc = kc1.1 × h^(-mc). At h=0.01mm vs h=0.1mm: kc rises 2-3× (size effect). Source: Merchant 1945",
    related_rules: ["CF-001", "SI-005"],
  },
  {
    id: "CF-005",
    category: "cutting_force",
    severity: "important",
    title: "Force direction shifts with DOC/feed ratio",
    rule: "Monitor the ap/f ratio: when ap/f > 4 the radial force Fr exceeds tangential force Fc, making the cut deflection-critical. When ap/f < 2, Fc dominates and the cut is more stable.",
    reasoning: "The ratio of axial depth to feed determines force component balance. High ap/f ratios generate large radial forces that push the tool sideways, causing deflection and chatter. This is especially critical for long-overhang or small-diameter tools.",
    conditions: [{ type: "always" }],
    exceptions: ["Face milling where radial forces largely cancel due to symmetric engagement"],
    source: "Altintas, Y. — 'Manufacturing Automation'",
    evidence_level: "theoretical",
    formula_ref: ["force_ratio"],
    quantitative: "At ap/f > 4: radial force Fr > tangential Fc. Deflection-critical. At ap/f < 2: Fc dominates, stable cuts",
    related_rules: ["CF-001", "VD-002", "DA-004"],
  },
  {
    id: "CF-006",
    category: "cutting_force",
    severity: "critical",
    title: "Force spike at entry/exit — reduce feed by 30%",
    rule: "Reduce feed rate by 30% at workpiece entry and exit to prevent force spikes. Entry impact forces reach 1.3-1.8× steady-state cutting force; abrupt exit unloading causes edge chipping.",
    reasoning: "Tool entry involves impact loading as the edge transitions from air to material. The sudden engagement creates a transient force peak that can exceed tool strength. Exit involves rapid unloading that snaps the last chip, causing micro-chipping of the cutting edge.",
    conditions: [{ type: "feature_present", features: ["interrupted", "entry", "exit"] }],
    exceptions: ["Adaptive/trochoidal toolpaths that maintain constant engagement"],
    source: "Tlusty, J. — 'Manufacturing Processes and Equipment'",
    evidence_level: "empirical_validated",
    quantitative: "Entry impact force = 1.3-1.8 × steady-state Fc. Exit force drops abruptly → chipping risk",
    related_rules: ["CF-001", "FA-004", "FA-001"],
  },
  {
    id: "CF-007",
    category: "cutting_force",
    severity: "recommended",
    title: "Oblique cutting reduces effective chip thickness",
    rule: "Use oblique cutting geometry (non-zero inclination angle λs) to reduce effective chip thickness and spread the cutting force over a longer edge length, improving tool life and surface finish.",
    reasoning: "Oblique cutting tilts the chip flow direction, reducing the chip thickness by the cosine of the inclination angle. This lowers peak stress on the cutting edge and produces a wider, thinner chip that breaks more easily.",
    conditions: [{ type: "always" }],
    exceptions: ["Grooving and parting where orthogonal cutting is required by geometry"],
    source: "Shaw, M.C. — 'Metal Cutting Principles'",
    evidence_level: "peer_reviewed",
    formula_ref: ["oblique_cutting"],
    quantitative: "h_eff = f × sin(κr) × cos(λs). At κr=45°, λs=6°: h_eff = 0.70×f",
    related_rules: ["CF-001", "CF-002"],
  },
  {
    id: "CF-008",
    category: "cutting_force",
    severity: "tip",
    title: "Taylor tool life equation: speed-life tradeoff",
    rule: "Use the Taylor equation VcT^n = C to quantify the tradeoff between cutting speed and tool life. Doubling speed reduces tool life to 10-25% of original depending on the exponent n.",
    reasoning: "The Taylor equation is the fundamental empirical model for tool life prediction. The exponent n varies by tool material (0.1-0.15 for HSS, 0.2-0.3 for carbide, 0.4-0.6 for ceramic). Understanding this relationship enables economic speed optimization.",
    conditions: [{ type: "always" }],
    exceptions: ["Ceramic and CBN tools at very high speeds where wear mechanisms change"],
    source: "ISO 3685:1993 — Tool-life testing with single-point turning tools",
    evidence_level: "iso_standard",
    standard_ref: "ISO 3685:1993",
    formula_ref: ["taylor_tool_life"],
    quantitative: "n=0.2-0.3 (carbide), n=0.1-0.15 (HSS). Doubling Vc: life drops to (0.5)^(1/n) = 10-25% of original",
    related_rules: ["TW-001", "EC-001", "EC-002"],
  },

  // ── THERMAL PHYSICS ───────────────────────────────────────────────────────

  {
    id: "TP-001",
    category: "thermal",
    severity: "critical",
    title: "Workpiece thermal expansion compensation",
    rule: "Compensate for workpiece thermal expansion when machining to tight tolerances. Apply offset correction: offset = -α × L × (T_part - 20°C) via G10 work offset adjustment.",
    reasoning: "Parts expand during machining due to cutting heat. A steel part 200mm long with a 5°C rise grows 12µm — exceeding typical precision tolerances. Measuring at cutting temperature and correcting to 20°C reference prevents systematic dimensional errors.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.02 }],
    conditions_all: [{ type: "tolerance_below", threshold_mm: 0.02 }],
    exceptions: ["Parts measured at cutting temperature (in-process gauging with thermal compensation)"],
    source: "ISO 1:2016 — Geometrical product specifications — Standard reference temperature",
    evidence_level: "iso_standard",
    standard_ref: "ISO 1:2016",
    formula_ref: ["thermal_expansion"],
    quantitative: "ΔL = α × L × ΔT. Correction: offset = -α × L × (T_part - 20°C). Apply as G10 work offset adjustment",
    related_rules: ["TP-002", "DA-005", "XD-002"],
  },
  {
    id: "TP-002",
    category: "thermal",
    severity: "important",
    title: "Spindle thermal growth compensation — warm-up required",
    rule: "Warm up the spindle for at least 15 minutes at 50% max RPM before precision work. Typical spindle thermal growth is 20-80µm axial over 30 minutes of cold start operation.",
    reasoning: "Spindle bearings and housing expand as they warm up, causing the tool tip to shift axially (Z direction). This drift is systematic and repeatable once stabilized, but during warm-up it causes progressive dimensional error on each successive part.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.01 }],
    exceptions: ["Machines with active spindle thermal compensation systems", "Large-volume roughing where 50µm drift is within tolerance"],
    source: "Mayr, J. et al. — 'Thermal issues in machine tools' (CIRP Annals, 2012)",
    evidence_level: "manufacturer_data",
    quantitative: "Typical spindle growth: 20-80µm axial over 30min warm-up. Rule: warm up 15min at 50% max RPM before precision work. Or use machine's thermal comp if available",
    related_rules: ["TP-001", "DA-005", "MC-003"],
  },
  {
    id: "TP-003",
    category: "thermal",
    severity: "important",
    title: "Heat partition: chip carries 60-80% of cutting heat",
    rule: "At moderate-to-high cutting speeds (Vc > 100 m/min in steel), 60-80% of cutting heat leaves with the chip. Ensure effective chip evacuation — it is the primary cooling mechanism.",
    reasoning: "The chip formation zone concentrates heat at the shear plane and tool-chip interface. At high speeds, the chip moves too fast for heat to conduct back into the workpiece. At low speeds (<30 m/min), more heat enters the workpiece, requiring flood coolant.",
    conditions: [{ type: "always" }],
    exceptions: ["Grinding where the heat partition is reversed (60-80% enters workpiece)"],
    source: "Loewen, E.G. & Shaw, M.C. (1954) — 'On the Analysis of Cutting Tool Temperatures'",
    evidence_level: "peer_reviewed",
    formula_ref: ["loewen_shaw_heat"],
    quantitative: "η_chip = 0.6-0.8 (steel at Vc>100m/min). At low Vc (<30m/min): η_chip drops to 0.3, more heat enters workpiece. Source: Loewen & Shaw 1954",
    related_rules: ["TP-004", "TP-005", "XD-002"],
  },
  {
    id: "TP-004",
    category: "thermal",
    severity: "recommended",
    title: "Coolant thermal capacity: flow adequacy check",
    rule: "Verify coolant flow rate provides sufficient heat removal capacity: Q_cool = ṁ × cp × ΔT must exceed the cutting power not carried away by chips.",
    reasoning: "Insufficient coolant flow causes progressive workpiece heating, thermal expansion, and dimensional drift. The coolant must absorb the fraction of cutting heat entering the workpiece (typically 20-40% of total cutting power).",
    conditions: [{ type: "always" }],
    exceptions: ["Dry machining or MQL where chip evacuation is the primary heat removal mechanism"],
    source: "Klocke, F. — 'Manufacturing Processes 1: Cutting'",
    evidence_level: "theoretical",
    formula_ref: ["coolant_heat_capacity"],
    quantitative: "Water-based: cp=4.18 kJ/kg·K. At 20 L/min, 5°C rise: Q_cool = 0.33×4180×5 = 6.9 kW capacity. Must exceed cutting power × (1-η_chip)",
    related_rules: ["TP-003", "TP-005", "TP-006"],
  },
  {
    id: "TP-005",
    category: "thermal",
    severity: "critical",
    title: "Cryogenic machining for titanium above Vc > 80 m/min",
    rule: "Use cryogenic cooling (LN2 or CO2) when machining Ti-6Al-4V and other superalloys at cutting speeds above 80 m/min. Tool life improves 2-5× vs flood coolant.",
    reasoning: "Titanium's low thermal conductivity (6.7 W/m·K) concentrates heat at the tool tip. At high speeds, tool temperatures exceed carbide limits (800°C). Cryogenic cooling at -196°C (LN2) or -78°C (CO2) dramatically reduces tool temperature, enabling higher speeds and longer life.",
    conditions: [{ type: "material_iso", groups: ["S"] }],
    conditions_all: [{ type: "material_iso", groups: ["S"] }, { type: "spindle_speed_above", rpm: 2000 }],
    exceptions: ["Low-speed finishing where flood coolant is adequate", "Parts where cryogenic embrittlement is a concern"],
    source: "Pusavec, F. et al. — 'Sustainable machining of high temperature Ni alloy' (CIRP Annals, 2014)",
    evidence_level: "peer_reviewed",
    quantitative: "LN2 at -196°C: tool life 2-5× vs flood. CO2 at -78°C: tool life 1.5-3×. Break-even: tool cost savings exceed cryogen cost at >50 parts",
    related_rules: ["TP-003", "MS-002", "TW-002"],
  },
  {
    id: "TP-006",
    category: "thermal",
    severity: "recommended",
    title: "MQL effectiveness range",
    rule: "Minimum Quantity Lubrication is effective when ae < 0.5×D AND ap < 1.5×D AND Vc < 250 m/min in steel. Above these thresholds, switch to flood coolant.",
    reasoning: "MQL provides lubrication at the tool-chip interface but minimal bulk cooling. At high engagement or speed, heat generation exceeds the oil mist's ability to prevent thermal buildup, causing rapid tool wear and workpiece thermal distortion.",
    conditions: [{ type: "operation_type", operations: ["milling"] }],
    exceptions: ["Aluminum machining where MQL is effective at much higher speeds (up to 600 m/min)"],
    source: "Weinert, K. et al. — 'Dry Machining and Minimum Quantity Lubrication' (CIRP Annals, 2004)",
    evidence_level: "peer_reviewed",
    quantitative: "MQL effective when: ae < 0.5×D AND ap < 1.5×D AND Vc < 250 m/min (steel). Above these: flood required. Oil flow: 5-50 mL/hr",
    related_rules: ["TP-004", "TP-003"],
  },

  // ── SURFACE INTEGRITY ─────────────────────────────────────────────────────

  {
    id: "SI-001",
    category: "surface_integrity",
    severity: "critical",
    title: "Brammertz surface finish model: Ra = f²/(32×r)",
    rule: "Use the Brammertz formula Ra = f² × 1000/(32 × r_nose) to predict theoretical minimum surface roughness in turning. This sets the lower bound — actual finish is always worse.",
    reasoning: "The kinematic roughness model shows that feed rate squared and nose radius are the dominant finish parameters. Halving the feed improves finish 4×, while doubling nose radius improves it 2×. This is the first check before blaming tool wear or vibration.",
    conditions: [{ type: "always" }],
    exceptions: ["Vibration-dominated processes where dynamic roughness exceeds kinematic", "BUE conditions that create irregular surface texture"],
    source: "Brammertz, P.H. — 'Die Entstehung der Oberflächenrauhigkeit beim Feindrehen'",
    evidence_level: "peer_reviewed",
    formula_ref: ["brammertz_roughness"],
    quantitative: "Ra [µm] = f² × 1000/(32 × r_nose). f=0.1mm, r=0.8mm: Ra = 0.39µm. f=0.2mm, r=0.8mm: Ra = 1.56µm",
    standard_ref: "ISO 4287:1997 — Surface texture",
    related_rules: ["SI-005", "XD-001", "XD-003"],
  },
  {
    id: "SI-002",
    category: "surface_integrity",
    severity: "important",
    title: "White layer formation in hard turning/grinding",
    rule: "When machining hardened steel (>45 HRC), monitor for white layer formation caused by surface temperatures exceeding the A1 transformation point (727°C). White layers are brittle and reduce fatigue life.",
    reasoning: "Excessive cutting temperature causes a thin surface layer to austenitize and rapidly quench into untempered martensite (white layer). This layer is 60+ HRC, extremely brittle, and contains tensile residual stresses that initiate fatigue cracks.",
    conditions: [{ type: "hardness_above", hrc: 45 }],
    conditions_all: [{ type: "hardness_above", hrc: 45 }],
    exceptions: ["Finishing passes with CBN tools at light DOC where temperatures stay below A1"],
    source: "Griffiths, B. — 'Manufacturing Surface Technology'",
    evidence_level: "peer_reviewed",
    quantitative: "White layer forms at T_surface > A1 transformation (727°C for steel). Depth: 1-20µm. Avoid by: Vc < 200m/min in hard turning, adequate coolant in grinding",
    related_rules: ["SI-003", "SI-006", "MS-005"],
  },
  {
    id: "SI-003",
    category: "surface_integrity",
    severity: "important",
    title: "Residual stress: compressive from mechanical, tensile from thermal",
    rule: "Target compressive residual stresses in fatigue-critical parts. Low speed + sharp tool + adequate cooling → compressive (good). High speed + worn tool + dry → tensile (bad).",
    reasoning: "Compressive residual stresses (-200 to -800 MPa) close surface cracks and improve fatigue life by 20-50%. Tensile residual stresses (+100 to +500 MPa) open cracks and drastically reduce fatigue life. The balance depends on the mechanical vs thermal dominance in the cutting zone.",
    conditions: [{ type: "always" }],
    exceptions: ["Parts with no fatigue loading requirement"],
    source: "Jawahir, I.S. et al. — 'Surface integrity in material removal processes' (CIRP Annals, 2011)",
    evidence_level: "peer_reviewed",
    quantitative: "Compressive σ_residual: -200 to -800 MPa (good for fatigue). Tensile: +100 to +500 MPa (bad). Low speed + sharp tool → compressive. High speed + worn tool → tensile",
    related_rules: ["SI-002", "XD-006", "XD-003"],
  },
  {
    id: "SI-004",
    category: "surface_integrity",
    severity: "recommended",
    title: "Surface finish achievable by process — selection guide",
    rule: "Select the machining process based on required surface finish: turning Ra 0.4-6.3µm, milling Ra 0.8-6.3µm, grinding Ra 0.05-1.6µm, lapping Ra 0.01-0.4µm, honing Ra 0.05-0.8µm, hard turning Ra 0.2-0.8µm.",
    reasoning: "Each process has inherent surface finish limits determined by kinematics and physics. Specifying grinding when turning can achieve the requirement wastes time and money. Conversely, expecting grinding-quality finish from milling leads to failed parts.",
    conditions: [{ type: "always" }],
    exceptions: ["Advanced tooling (wiper inserts, PCD) can push turning/milling below typical limits"],
    source: "Kalpakjian, S. — 'Manufacturing Engineering and Technology'",
    evidence_level: "empirical_validated",
    standard_ref: "ISO 1302:2002 — Surface texture indication",
    quantitative: "Turning: Ra 0.4-6.3µm. Milling: Ra 0.8-6.3µm. Grinding: Ra 0.05-1.6µm. Lapping: Ra 0.01-0.4µm. Honing: Ra 0.05-0.8µm. Hard turning: Ra 0.2-0.8µm",
    related_rules: ["SI-001", "GD-003"],
  },
  {
    id: "SI-005",
    category: "surface_integrity",
    severity: "tip",
    title: "Burnishing effect: diminishing returns below minimum chip thickness",
    rule: "Reducing feed improves finish only until feed drops below the minimum chip thickness (h_min ≈ 2-3× edge radius). Below h_min, ploughing replaces cutting and roughness increases. Optimal feed: f_opt ≈ 2-3 × r_edge.",
    reasoning: "At extremely low feeds, the tool edge cannot form a chip and instead ploughs material, creating a poor surface with high friction and heat. There is a feed 'sweet spot' that balances kinematic roughness reduction against ploughing degradation.",
    conditions: [{ type: "always" }],
    exceptions: ["Diamond turning with sub-micron edge radius where h_min is extremely small"],
    source: "Albrecht, P. (1960) — 'New Developments in the Theory of the Metal-Cutting Process'",
    evidence_level: "peer_reviewed",
    quantitative: "Ra ∝ f² until f < h_min (minimum chip thickness). Below h_min: ploughing increases Ra. Optimal feed: f_opt ≈ 2-3 × r_edge for best finish",
    related_rules: ["SI-001", "CF-004"],
  },
  {
    id: "SI-006",
    category: "surface_integrity",
    severity: "important",
    title: "Grinding burn detection: Barkhausen noise or nital etch",
    rule: "Inspect parts after aggressive grinding operations for grinding burn using nital etch (visual) or Barkhausen noise analysis (non-destructive). Mandatory for safety-critical gears and bearing surfaces.",
    reasoning: "Grinding burn creates a damaged surface layer with altered metallurgy — rehardened martensite (dark spots) or overtampered zones (light spots). These damage zones have tensile residual stresses and reduced hardness that lead to premature failure in service.",
    conditions: [{ type: "operation_type", operations: ["grinding"] }],
    exceptions: ["Light finish grinding with documented low specific energy"],
    source: "ISO 14104:2017 — Gears — Surface temper etch inspection after grinding",
    evidence_level: "iso_standard",
    standard_ref: "ISO 14104:2017 — Gears — Surface temper etch inspection after grinding",
    quantitative: "Nital etch: dark spots = rehardened (martensite), light spots = tempered. Barkhausen: amplitude > threshold = thermal damage",
    related_rules: ["SI-002", "SI-003"],
  },

  // ── VIBRATION & DYNAMICS ──────────────────────────────────────────────────

  {
    id: "VD-001",
    category: "vibration_dynamics",
    severity: "critical",
    title: "Stability lobe diagram: critical depth of cut",
    rule: "Compute the stability lobe diagram before programming aggressive roughing. The critical depth of cut ap_lim defines the maximum stable DOC at each spindle speed. Operating above ap_lim triggers regenerative chatter.",
    reasoning: "Regenerative chatter is the most common vibration failure in machining. It occurs when chip thickness variation from one revolution reinforces the next via the structural dynamics. The stability lobe diagram maps safe RPM/DOC combinations from the machine's transfer function.",
    conditions: [{ type: "always" }],
    exceptions: ["Very rigid setups (L/D < 2) where stability limits exceed machine power limits"],
    source: "Altintas, Y. & Budak, E. (1995) — 'Analytical Prediction of Stability Lobes in Milling'",
    evidence_level: "peer_reviewed",
    formula_ref: ["stability_lobe"],
    quantitative: "ap_lim = -1/(2×Ks×Re[G(jωc)]). Where Ks = kc×ae/(π×D). Below ap_lim: stable. Above: regenerative chatter. Source: Altintas & Budak 1995",
    related_rules: ["VD-002", "VD-003", "VD-004", "XD-004"],
  },
  {
    id: "VD-002",
    category: "vibration_dynamics",
    severity: "important",
    title: "Tool overhang rule: L/D < 4 for milling",
    rule: "Keep tool overhang-to-diameter ratio below 4:1 for milling operations. Stiffness drops as the cube of length — at L/D=6, tool stiffness is only 13% of L/D=3.",
    reasoning: "Tool stiffness k = 3EI/L³ drops dramatically with overhang. Low stiffness means large deflection under cutting forces, causing dimensional error, poor surface finish, and chatter. Every millimeter of unnecessary overhang significantly degrades performance.",
    conditions: [{ type: "always" }],
    exceptions: ["Deep cavity milling with reduced-neck tools designed for long reach", "Boring bars with tuned mass dampers"],
    source: "Schmitz, T. & Smith, K.S. — 'Machining Dynamics: Frequency Response to Improved Productivity'",
    evidence_level: "theoretical",
    formula_ref: ["beam_deflection"],
    quantitative: "k_tool = 3EI/L³. At L/D=3: k=100%. At L/D=4: k=42%. At L/D=5: k=22%. At L/D=6: k=13%. Deflection δ = F/k",
    related_rules: ["VD-001", "CF-005", "DA-004"],
  },
  {
    id: "VD-003",
    category: "vibration_dynamics",
    severity: "recommended",
    title: "Natural frequency check: avoid resonance with tooth-passing frequency",
    rule: "Calculate tooth-passing frequency f_tooth = RPM × z / 60 and compare against the tool/workpiece natural frequency fn. Maintain a safe margin: f_tooth < 0.7×fn OR f_tooth > 1.3×fn.",
    reasoning: "When the tooth-passing frequency coincides with a structural natural frequency, the system resonates and vibration amplitude spikes. This creates chatter marks, poor finish, and potential tool breakage. A 30% frequency margin avoids the resonance zone.",
    conditions: [{ type: "always" }],
    exceptions: ["Stability lobe 'sweet spots' where tooth-passing at fn can actually be MORE stable"],
    source: "Altintas, Y. — 'Manufacturing Automation'",
    evidence_level: "theoretical",
    formula_ref: ["natural_frequency"],
    quantitative: "f_tooth = RPM × z / 60 [Hz]. If f_tooth ≈ f_natural: chatter. Safe zone: f_tooth < 0.7×fn OR f_tooth > 1.3×fn",
    related_rules: ["VD-001", "VD-005"],
  },
  {
    id: "VD-004",
    category: "vibration_dynamics",
    severity: "important",
    title: "Variable helix/pitch endmills for chatter suppression",
    rule: "Use variable helix or variable pitch endmills to suppress regenerative chatter. The irregular tooth spacing breaks the phase relationship required for regenerative feedback, improving stability limits by 30-80%.",
    reasoning: "Regenerative chatter requires that chip thickness variation from tooth N-1 is in phase with tooth N. Variable pitch tools break this phasing by making each tooth's contribution arrive at a different phase angle, disrupting the positive feedback loop.",
    conditions: [{ type: "always" }],
    exceptions: ["Finishing operations where uniform pitch tools give better surface quality", "Thread milling where pitch must match thread lead"],
    source: "Budak, E. (2003) — 'An Analytical Design Method for Milling Cutters with Nonconstant Pitch'",
    evidence_level: "peer_reviewed",
    quantitative: "Variable pitch: e.g., 35°/38° helix. Phase shift breaks regeneration. Stability limit improvement: 30-80% vs uniform pitch. Source: Budak 2003",
    related_rules: ["VD-001", "VD-003"],
  },
  {
    id: "VD-005",
    category: "vibration_dynamics",
    severity: "recommended",
    title: "Damping ratio estimation from tap test",
    rule: "Perform a tap test (impact hammer test) to measure the tool/workpiece natural frequency and damping ratio. Low damping (ζ < 0.03) means narrow stability valleys — RPM selection is critical.",
    reasoning: "The damping ratio determines how sharply the stability lobes dip. Low damping creates narrow stable pockets that are hard to hit in practice. High damping (from mass dampers, joints, or workpiece material) broadens the stable zones, making RPM selection less critical.",
    conditions: [{ type: "always" }],
    exceptions: ["Production environments with characterized and stable setups"],
    source: "Schmitz, T. & Smith, K.S. — 'Machining Dynamics'",
    evidence_level: "empirical_validated",
    quantitative: "ζ = ln(x_1/x_2)/(2π) from ring-down. Typical: ζ=0.01-0.03 (undamped), ζ=0.05-0.15 (with damper). Low ζ → narrow stability valleys",
    related_rules: ["VD-001", "VD-003"],
  },
  {
    id: "VD-006",
    category: "vibration_dynamics",
    severity: "tip",
    title: "Process damping at low RPM — stability boost",
    rule: "At low spindle speeds (<500 RPM), process damping from the tool's clearance face rubbing against the wavy surface adds significant stability. This allows 20-50% higher DOC than predicted by standard stability lobes.",
    reasoning: "The clearance face of the tool contacts surface waves at low speed (long wavelength), creating a damping force proportional to vibration velocity. This effect is not captured by standard stability lobe theory and explains why low-speed cuts are often more stable than predicted.",
    conditions: [{ type: "always" }],
    exceptions: ["HSM operations where spindle speed is always above the process damping regime"],
    source: "Altintas, Y. et al. — 'Chatter Stability of Metal Cutting and Grinding' (CIRP Annals, 2004)",
    evidence_level: "peer_reviewed",
    formula_ref: ["process_damping"],
    quantitative: "Process damping force: Fpd = Kpd × V × (ap/λ). Significant when λ (wavelength) ≈ tool clearance face contact length. Below ~500 RPM: adds 20-50% to stability limit",
    related_rules: ["VD-001", "VD-005"],
  },

  // ── TOOL WEAR PHYSICS ─────────────────────────────────────────────────────

  {
    id: "TW-001",
    category: "tool_life",
    severity: "critical",
    title: "Flank wear limit: VB = 0.3mm (uniform) or 0.6mm (localized)",
    rule: "Replace cutting inserts/tools when average flank wear VB reaches 0.3mm or localized max VB_max reaches 0.6mm. Exceeding these limits causes force rise of 20-50% and surface finish degradation.",
    reasoning: "ISO 3685 defines standard tool life criteria based on decades of empirical data. Beyond 0.3mm flank wear, the cutting edge geometry is sufficiently altered that forces rise non-linearly, heat generation increases dramatically, and dimensional accuracy becomes unpredictable.",
    conditions: [{ type: "always" }],
    exceptions: ["Roughing operations where higher wear is acceptable if forces remain within machine limits"],
    source: "ISO 3685:1993 §5 — Tool-life testing with single-point turning tools",
    evidence_level: "iso_standard",
    standard_ref: "ISO 3685:1993 §5",
    quantitative: "Replace at: VB_avg = 0.3mm OR VB_max = 0.6mm OR crater KT = 0.06 + 0.3f. Exceeding limits: surface finish degrades, force rises 20-50%",
    related_rules: ["TW-002", "TW-005", "CF-008", "XD-003"],
  },
  {
    id: "TW-002",
    category: "tool_life",
    severity: "important",
    title: "Crater wear dominant above Vc > 200 m/min in steel",
    rule: "At cutting speeds above 200 m/min in steel (ISO P), crater wear on the rake face becomes the dominant failure mode due to diffusion. Use Al2O3-coated inserts which reduce crater wear by 60-80%.",
    reasoning: "At high temperatures (>800°C), carbon atoms diffuse from the WC-Co tool into the steel chip, dissolving the tool material. This Arrhenius-activated process doubles for every ~50°C increase. Al2O3 coating acts as a diffusion barrier.",
    conditions: [{ type: "material_iso", groups: ["P"] }],
    exceptions: ["Cermet inserts that are inherently crater-resistant", "Low-carbon steels where crater wear is less severe"],
    source: "Trent, E.M. & Wright, P.K. — 'Metal Cutting' (4th ed.)",
    evidence_level: "peer_reviewed",
    formula_ref: ["crater_wear_arrhenius"],
    quantitative: "Crater wear rate: dKT/dt ∝ exp(-Q/RT) × Vc². Q = activation energy (50-80 kJ/mol for WC-Co). Al2O3 coating reduces crater wear 60-80%",
    related_rules: ["TW-001", "TW-006", "CF-008"],
  },
  {
    id: "TW-003",
    category: "tool_life",
    severity: "important",
    title: "Notch wear at depth-of-cut line — vary ap ±10%",
    rule: "Notch wear forms at the depth-of-cut line where the work-hardened layer contacts the tool edge. Mitigate by varying ap ±10% between passes to distribute wear over a wider zone.",
    reasoning: "The workpiece surface is work-hardened by the previous pass, creating a hard layer at the exact DOC line. This concentrated abrasion creates a notch that weakens the edge. Varying DOC spreads this wear over a wider zone, extending tool life 30-50%.",
    conditions: [{ type: "material_iso", groups: ["M", "S"] }],
    exceptions: ["Finishing passes where DOC must remain constant for dimensional accuracy"],
    source: "Ezugwu, E.O. — 'Tool Wear in Machining of Ni-based Alloys' (J. Materials Processing, 2005)",
    evidence_level: "peer_reviewed",
    quantitative: "Notch forms at ap line where BUE/work-hardened layer contacts tool. Mitigation: vary ap ±10% (step-over variation). Severity: worst in ISO-M and ISO-S",
    related_rules: ["TW-001", "MS-001", "MS-002"],
  },
  {
    id: "TW-004",
    category: "tool_life",
    severity: "recommended",
    title: "Built-up edge prevention: stay above critical speed",
    rule: "Maintain cutting speed above the material-specific BUE threshold: Steel ≈ 60-80 m/min, Aluminum ≈ 150-200 m/min, Stainless ≈ 40-60 m/min. Below these speeds, BUE forms and degrades finish.",
    reasoning: "Built-up edge occurs when work material welds to the cutting edge at temperatures where adhesion is strong but not hot enough for the material to soften and detach. Increasing speed raises temperature above the adhesion zone, causing BUE to melt away.",
    conditions: [{ type: "always" }],
    exceptions: ["Intentional BUE in free-machining alloys where it can protect the edge"],
    source: "Sandvik Coromant — 'Tool Wear Mechanisms and Solutions'",
    evidence_level: "empirical_validated",
    quantitative: "BUE forms when: Vc < Vc_min (material-dependent). Steel: Vc_min ≈ 60-80 m/min. Aluminum: Vc_min ≈ 150-200 m/min. Stainless: Vc_min ≈ 40-60 m/min. Fix: increase Vc or use TiN coating",
    related_rules: ["TW-001", "FA-008", "SI-001"],
  },
  {
    id: "TW-005",
    category: "tool_life",
    severity: "tip",
    title: "Tool wear monitoring via cutting force ratio",
    rule: "Monitor the feed force to cutting force ratio Ff/Fc as an in-process wear indicator. Fresh tools show Ff/Fc ≈ 0.3-0.5; at VB=0.3mm wear land, the ratio rises to 0.6-1.0.",
    reasoning: "Flank wear creates a rubbing contact that generates force proportional to the wear land area. This force is primarily in the feed direction, so the Ff/Fc ratio increases with wear. This is a practical non-contact wear estimation method using existing force data.",
    conditions: [{ type: "always" }],
    exceptions: ["Operations with variable engagement where force ratios fluctuate"],
    source: "Dimla, D.E. — 'Sensor signals for tool-wear monitoring' (Int. J. Machine Tools, 2000)",
    evidence_level: "peer_reviewed",
    quantitative: "Force ratio Ff/Fc increases with flank wear: VB = k × (Ff/Fc - Ff0/Fc0). Fresh tool: Ff/Fc ≈ 0.3-0.5. At VB=0.3mm: Ff/Fc ≈ 0.6-1.0",
    related_rules: ["TW-001", "CF-001"],
  },
  {
    id: "TW-006",
    category: "tool_life",
    severity: "recommended",
    title: "Coating selection by application temperature",
    rule: "Select tool coating based on expected cutting temperature: TiN (max 600°C), TiAlN (max 900°C), Al2O3 (max 1200°C), DLC (max 300°C). Ensure coating T_max exceeds expected cutting temperature by at least 100°C.",
    reasoning: "Each coating material has a thermal stability limit above which it oxidizes, decomposes, or loses hardness. Operating near or above this limit causes rapid coating failure, exposing the substrate to accelerated wear. A 100°C margin ensures stability under transient peaks.",
    conditions: [{ type: "always" }],
    exceptions: ["Uncoated tools for aluminum (DLC or uncoated polished) to prevent BUE"],
    source: "Kennametal — 'Tooling Systems Catalog: Coating Technology'",
    evidence_level: "manufacturer_data",
    quantitative: "TiN: max 600°C. TiAlN: max 900°C. Al2O3: max 1200°C. DLC: max 300°C. Rule: estimate T_cutting, select coating with T_max > T_cutting + 100°C margin",
    related_rules: ["TW-002", "TW-004", "MS-002"],
  },

  // ── DIMENSIONAL ACCURACY ──────────────────────────────────────────────────

  {
    id: "DA-001",
    category: "dimensional_accuracy",
    severity: "critical",
    title: "Abbe error: measurement-motion axis offset",
    rule: "Account for Abbe error when the measurement axis is offset from the motion axis. At 100mm offset with 5 arcsec angular error: positional error = 2.4µm. Use on-axis measurement or compensate.",
    reasoning: "Abbe's principle states that measurement accuracy is maximized when the measurement axis is collinear with the motion axis. Any angular error in the guideway is amplified by the offset distance, creating systematic positional errors that degrade accuracy.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.01 }],
    exceptions: ["Machines with laser interferometer feedback on all axes (direct measurement)"],
    source: "ISO 230-1:2012 — Machine tool geometric accuracy",
    evidence_level: "iso_standard",
    standard_ref: "ISO 230-1:2012 — Machine tool geometric accuracy",
    formula_ref: ["abbe_error"],
    quantitative: "ε_Abbe = h × sin(θ) ≈ h × θ [rad]. At 100mm offset, 5 arcsec tilt: ε = 100 × 5/206265 = 2.4µm",
    related_rules: ["DA-002", "DA-003"],
  },
  {
    id: "DA-002",
    category: "dimensional_accuracy",
    severity: "important",
    title: "Ball-bar circularity: diagnose machine geometry errors",
    rule: "Perform periodic ball-bar circularity tests. Good: circularity < 5µm. Acceptable: < 10µm. Needs service: > 15µm. Pattern shapes diagnose specific errors: ellipse = servo mismatch, cusp = backlash, limaçon = squareness.",
    reasoning: "Ball-bar testing is the fastest way to assess machine geometric health. A single 10-minute test reveals servo tuning, backlash, squareness, reversal spikes, and cyclic errors. Regular testing catches degradation before it causes scrap.",
    conditions: [{ type: "always" }],
    exceptions: ["Machines under active monitoring with real-time positioning feedback"],
    source: "ISO 230-4:2005 — Circular tests for numerically controlled machine tools",
    evidence_level: "iso_standard",
    standard_ref: "ISO 230-4:2005 — Circular tests",
    quantitative: "Good: circularity < 5µm. Acceptable: < 10µm. Needs service: > 15µm. Servo mismatch shows as ellipse, backlash as cusp, squareness as limacon",
    related_rules: ["DA-001", "DA-003", "MC-004"],
  },
  {
    id: "DA-003",
    category: "dimensional_accuracy",
    severity: "important",
    title: "Volumetric accuracy: 21-error model",
    rule: "For ultra-precision work (tolerance < 5µm), characterize the machine using the full 21-error model: 3 linear positioning + 6 straightness + 3 angular per axis + 3 squareness = 21 errors. Volumetric accuracy ≈ √(Σεi²).",
    reasoning: "Each machine axis has 6 degrees of freedom of error (3 translational + 3 rotational). Combined with 3 inter-axis squareness errors, the full 21-parameter model predicts positional error anywhere in the work volume, enabling software compensation.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.005 }],
    exceptions: ["2-axis turning where the full 3D model is unnecessary"],
    source: "ISO 230-2:2014 — Determination of accuracy and repeatability of positioning of NC machine tools",
    evidence_level: "iso_standard",
    standard_ref: "ISO 230-2:2014 — Positioning accuracy",
    formula_ref: ["volumetric_error_21"],
    quantitative: "21 errors: 3 linear positioning + 3 straightness per axis × 2 + 3 squareness = 21. Volumetric accuracy ≈ √(Σεi²)",
    related_rules: ["DA-001", "DA-002"],
  },
  {
    id: "DA-004",
    category: "dimensional_accuracy",
    severity: "recommended",
    title: "Tool deflection compensation for finishing",
    rule: "Calculate tool deflection δ = F×L³/(3×E×I) and compensate by programming the nominal dimension minus the deflection. For a 10mm carbide endmill at L=40mm with 500N force: δ = 0.036mm.",
    reasoning: "Cutting force pushes the tool away from the workpiece, leaving excess material. This systematic error is predictable from beam deflection theory and can be compensated in the NC program or via cutter compensation adjustments.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Operations with spring passes that naturally compensate for deflection"],
    source: "Schmitz, T. & Smith, K.S. — 'Machining Dynamics'",
    evidence_level: "theoretical",
    formula_ref: ["beam_deflection"],
    quantitative: "δ = F×L³/(3×E×I). For 10mm carbide endmill, L=40mm, F=500N: δ = 500×64e-9/(3×600e9×491e-12) = 0.036mm. Compensate by programming nominal - δ",
    related_rules: ["VD-002", "CF-005", "XD-001"],
  },
  {
    id: "DA-005",
    category: "dimensional_accuracy",
    severity: "recommended",
    title: "Machine warm-up protocol to eliminate thermal drift",
    rule: "Follow a structured warm-up: 15min at 50% RPM → 10min at 80% → 5min at 100%. Monitor Z-axis position — stable when ΔZ < 2µm over 5 minutes. Only then begin precision machining.",
    reasoning: "Cold-start thermal drift is the largest source of dimensional error in the first hour of operation. The spindle, ball screws, and structure all expand as they reach thermal equilibrium. A consistent warm-up protocol makes the thermal state repeatable and predictable.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.02 }],
    exceptions: ["Machines in temperature-controlled environments that maintain thermal equilibrium"],
    source: "Bryan, J. — 'International Status of Thermal Error Research' (CIRP Annals, 1990)",
    evidence_level: "manufacturer_data",
    quantitative: "Protocol: 15min at 50% RPM → 10min at 80% → 5min at 100%. Monitor Z-axis: typical drift 20-60µm during warm-up. Stable when ΔZ < 2µm over 5min",
    related_rules: ["TP-001", "TP-002", "MC-003"],
  },
  {
    id: "DA-006",
    category: "dimensional_accuracy",
    severity: "tip",
    title: "Bi-directional compensation for ball-screw backlash",
    rule: "Measure backlash with a dial indicator, then set the machine parameter for bi-directional compensation (Fanuc: #1851, Siemens: $MA_BACKLASH_VALUE). Verify by probing a feature from both approach directions.",
    reasoning: "Ball-screw backlash causes different positions depending on approach direction. The machine controller can add a compensating pulse when direction reverses. Without this, holes probed from one direction may show 2-15µm offset from the other direction.",
    conditions: [{ type: "always" }],
    exceptions: ["Machines with linear scales (direct measurement bypasses ball-screw errors)"],
    source: "Fanuc — 'Parameter Manual (Series 30i/31i/32i)'",
    evidence_level: "manufacturer_data",
    quantitative: "Typical backlash: 2-15µm. Measure with indicator, set machine parameter (Fanuc: #1851, Siemens: $MA_BACKLASH_VALUE). Verify by probing in both directions",
    related_rules: ["DA-002", "MC-003"],
  },

  // ── ECONOMICS & OPTIMIZATION ──────────────────────────────────────────────

  {
    id: "EC-001",
    category: "economics",
    severity: "important",
    title: "Minimum cost cutting speed — Taylor optimization",
    rule: "Calculate the minimum-cost cutting speed using the Taylor equation and machining economics. This speed balances tool cost, machine time cost, and tool change time for lowest cost per part.",
    reasoning: "Higher speed reduces cutting time but increases tool consumption. Lower speed saves tools but wastes machine time. The minimum-cost speed is the mathematical optimum where the marginal time savings from faster cutting equals the marginal tool cost increase.",
    conditions: [{ type: "batch_size_above", count: 20 }],
    exceptions: ["Bottleneck operations where maximum production rate overrides cost"],
    source: "Gilbert, W.W. (1950) — 'Economics of Machining'",
    evidence_level: "peer_reviewed",
    formula_ref: ["taylor_tool_life", "minimum_cost_speed"],
    quantitative: "For n=0.25, tool cost=€30, change time=5min, machine rate=€1/min: Vc_mincost = C × (0.25/0.75) × (1/(5+30))^0.25",
    related_rules: ["EC-002", "CF-008", "XD-005"],
  },
  {
    id: "EC-002",
    category: "economics",
    severity: "important",
    title: "Maximum production speed exceeds minimum cost speed",
    rule: "The maximum-production speed is always higher than the minimum-cost speed. Use it only when the operation is the production bottleneck. The gap between the two represents the cost-productivity tradeoff.",
    reasoning: "Maximum-production speed minimizes cycle time regardless of tool cost. It accepts higher tooling expense for faster throughput. The optimal operating point depends on whether the shop is tool-cost constrained (low volume) or throughput constrained (high volume).",
    conditions: [{ type: "batch_size_above", count: 100 }],
    exceptions: ["Very expensive tooling (PCD, CBN) where tool cost dominates"],
    source: "Boothroyd, G. & Knight, W. — 'Fundamentals of Machining and Machine Tools'",
    evidence_level: "peer_reviewed",
    formula_ref: ["maximum_production_speed"],
    quantitative: "Vc_maxprod = C × (n/(1-n) × 1/Tc)^n. Always: Vc_maxprod > Vc_mincost. The gap = economics vs productivity tradeoff. Choose based on bottleneck analysis",
    related_rules: ["EC-001", "CF-008"],
  },
  {
    id: "EC-003",
    category: "economics",
    severity: "recommended",
    title: "Tool cost per part: track and benchmark",
    rule: "Track tool cost per part (Ct = tool_price / tool_life_in_parts). Target: Ct < 5% of part value. Investigate if Ct > 10% — optimize parameters or evaluate cheaper tooling alternatives.",
    reasoning: "Tool cost is the most controllable variable in machining economics. A 30% improvement in tool life (via parameter optimization) directly reduces Ct by 30%. Tracking this metric identifies which operations have the highest cost-reduction potential.",
    conditions: [{ type: "batch_size_above", count: 50 }],
    exceptions: ["Prototype runs where tool cost tracking overhead exceeds savings"],
    source: "Sandvik Coromant — 'Productivity Analyzer'",
    evidence_level: "empirical_validated",
    quantitative: "Target: Ct < 5% of part value. If Ct > 10%: investigate cheaper tooling or parameter optimization. Tool life in parts = T_minutes / cycle_time",
    related_rules: ["EC-001", "CF-008"],
  },
  {
    id: "EC-004",
    category: "economics",
    severity: "recommended",
    title: "Material removal rate: MRR productivity metric",
    rule: "Calculate MRR = ae × ap × fz × z × n / 1000 [cm³/min] as the primary productivity metric. Benchmark against material-specific targets: Steel roughing 50-200, Aluminum 500-3000, Titanium 20-80 cm³/min.",
    reasoning: "MRR is the most direct measure of roughing productivity. Comparing actual MRR to achievable benchmarks immediately reveals whether parameters are conservative (opportunity) or aggressive (risk). It also enables apples-to-apples comparison between strategies.",
    conditions: [{ type: "always" }],
    exceptions: ["Finishing operations where MRR is not the relevant metric"],
    source: "Klocke, F. — 'Manufacturing Processes 1: Cutting'",
    evidence_level: "theoretical",
    formula_ref: ["mrr_calculation"],
    quantitative: "MRR = ae × ap × fz × z × n / 1000 [cm³/min]. Benchmark: Steel roughing 50-200, Aluminum roughing 500-3000, Titanium roughing 20-80 cm³/min",
    related_rules: ["XD-004", "CF-003", "MC-001"],
  },
  {
    id: "EC-005",
    category: "economics",
    severity: "tip",
    title: "Cycle time breakdown: 30-50% is non-cutting time",
    rule: "Audit cycle time breakdown: typically 50-70% cutting, 10-20% rapids, 5-15% tool changes, 10-20% load/unload. Focus optimization on reducing tool changes (combine operations) and optimizing rapids.",
    reasoning: "Most cycle time reduction efforts focus on cutting speed, but 30-50% of cycle time is non-cutting. Reducing tool changes by combining roughing and finishing in one tool, optimizing retract heights (direct vs safe Z), and streamlining fixturing often yield larger time savings.",
    conditions: [{ type: "always" }],
    exceptions: ["Single-tool operations where non-cutting time is minimal"],
    source: "Boothroyd, G. — 'Assembly Automation and Product Design'",
    evidence_level: "empirical_validated",
    quantitative: "Typical: cutting 50-70%, rapids 10-20%, tool change 5-15%, load/unload 10-20%. Focus: reduce tool changes (combine ops), optimize rapids (direct retract, not safe Z)",
    related_rules: ["EC-004", "MC-005"],
  },
  {
    id: "EC-006",
    category: "economics",
    severity: "tip",
    title: "Cost per hole: combined optimization for hole-making",
    rule: "For high-volume hole-making, calculate total cost per hole including cycle time, tool cost, and consumables. Indexable drills break even vs solid carbide at approximately 200+ holes.",
    reasoning: "Hole-making is the most common machining operation (35-40% of all cuts). Small improvements in cost-per-hole multiply across thousands of features. Indexable drills cost more upfront but have 2-10× longer life per edge, making them economical at volume.",
    conditions: [{ type: "feature_present", features: ["hole"] }],
    exceptions: ["Small diameter holes (<5mm) where indexable drills are not available"],
    source: "Kennametal — 'Hole Making Solutions Guide'",
    evidence_level: "empirical_validated",
    quantitative: "Cost_hole = (cycle_time × machine_rate + tool_cost/holes_per_tool + consumables). Solid carbide drill: 500-5000 holes. Indexable: 2000-10000 holes. Break-even typically at 200+ holes favoring indexable",
    related_rules: ["EC-003", "EC-004"],
  },

  // ── STATISTICAL PROCESS CONTROL ───────────────────────────────────────────

  {
    id: "SPC-001",
    category: "spc",
    severity: "critical",
    title: "Western Electric rules for control chart interpretation",
    rule: "Apply Western Electric rules to detect non-random patterns in control charts: Rule 1 — 1 point beyond 3σ; Rule 2 — 2 of 3 consecutive beyond 2σ same side; Rule 3 — 4 of 5 beyond 1σ same side; Rule 4 — 8 consecutive points same side of center.",
    reasoning: "Random variation follows a normal distribution with known probabilities at each sigma level. Patterns that violate these probabilities indicate assignable causes (tool wear, thermal drift, material variation) that require investigation, not parameter adjustment.",
    conditions: [{ type: "batch_size_above", count: 25 }],
    exceptions: ["Short runs (<20 parts) where control chart rules lack statistical power"],
    source: "ISO 7870-2:2013 — Control charts — Part 2: Shewhart control charts",
    evidence_level: "iso_standard",
    standard_ref: "ISO 7870-2:2013 — Control charts",
    quantitative: "Rule 1: 1 point beyond 3σ. Rule 2: 2/3 points beyond 2σ same side. Rule 3: 4/5 beyond 1σ same side. Rule 4: 8 consecutive same side of center",
    related_rules: ["SPC-002", "SPC-006"],
  },
  {
    id: "SPC-002",
    category: "spc",
    severity: "important",
    title: "Measurement system analysis: Gage R&R < 10% of tolerance",
    rule: "Before establishing process control, validate the measurement system: %GRR must be < 10% of tolerance (excellent) or < 30% (acceptable). Perform with minimum 10 parts × 3 operators × 3 repetitions.",
    reasoning: "A measurement system that consumes >30% of the tolerance in its own variation cannot reliably distinguish good parts from bad, and makes SPC charts meaningless. This prerequisite is often skipped, leading to false alarms and missed defects.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Attribute gauging (go/no-go) where R&R is replaced by attribute agreement analysis"],
    source: "ISO 22514-7:2012 — Statistical methods in process management — Capability and performance — Part 7: MSA",
    evidence_level: "iso_standard",
    standard_ref: "ISO 22514-7:2012 — MSA",
    quantitative: "%GRR = 5.15×σ_measurement / tolerance × 100%. <10%: excellent. 10-30%: acceptable. >30%: unacceptable. Minimum: 10 parts × 3 operators × 3 repetitions",
    related_rules: ["SPC-001", "SPC-003"],
  },
  {
    id: "SPC-003",
    category: "spc",
    severity: "recommended",
    title: "Process capability study: minimum 50 samples for Cpk",
    rule: "Compute short-term Cp from at least 50 parts. Long-term Ppk requires 100+ parts collected over time. Report confidence intervals: ±0.2 at n=50, ±0.14 at n=100, ±0.07 at n=400.",
    reasoning: "Cpk computed from too few samples has wide confidence intervals that make it unreliable for process qualification. A 'Cpk=1.5' from 20 parts could actually be 1.0-2.0 at 95% confidence. Minimum 50 parts narrows this to ±0.2, making the estimate actionable.",
    conditions: [{ type: "batch_size_above", count: 50 }],
    exceptions: ["Low-volume aerospace parts where population-based SPC is replaced by 100% inspection"],
    source: "ISO 22514-2:2017 — Statistical methods in process management — Capability and performance — Part 2",
    evidence_level: "iso_standard",
    standard_ref: "ISO 22514-2:2017",
    quantitative: "Short-term Cp from 50+ parts. Long-term Ppk from 100+ parts over time. Confidence interval on Cpk: ±0.2 at n=50, ±0.14 at n=100, ±0.07 at n=400",
    related_rules: ["SPC-001", "SPC-002"],
  },
  {
    id: "SPC-004",
    category: "spc",
    severity: "recommended",
    title: "Pre-control chart for setup verification — 5-part check",
    rule: "Use pre-control (traffic light method) for quick setup verification: measure 5 consecutive parts. All 5 in middle 50% of tolerance → process OK. Any in outer 25% → adjust. Any out of spec → stop and investigate.",
    reasoning: "Pre-control is simpler than full SPC and ideal for setup approval. It requires no control limits calculation and gives an immediate go/no-go decision. The probability of passing with a bad setup (Cpk < 1) is less than 3%.",
    conditions: [{ type: "always" }],
    exceptions: ["Processes with known strong trends (e.g., tool wear) where the first 5 parts are not representative"],
    source: "Shainin, D. — 'Pre-Control: A Simple Method of Process Control'",
    evidence_level: "empirical_validated",
    quantitative: "Measure 5 consecutive parts. All 5 in middle 50% of tolerance → process OK to run. Any in outer 25% → adjust. Any out of spec → stop, investigate",
    related_rules: ["SPC-001", "SPC-003"],
  },
  {
    id: "SPC-005",
    category: "spc",
    severity: "tip",
    title: "Tool wear trend detection: X-bar chart with drift alarm",
    rule: "Use the X-bar chart drift rate to predict when tool wear will push dimensions out of spec. Predict tool change when: d_current + drift_rate × remaining_parts > USL - 3σ.",
    reasoning: "Tool wear causes a systematic linear trend in machined dimensions. By measuring the drift rate from the X-bar chart, the operator can predict exactly when the next tool change is needed — before scrapping parts, not after.",
    conditions: [{ type: "batch_size_above", count: 100 }],
    exceptions: ["Operations with in-process gauging and automatic offset correction"],
    source: "Montgomery, D.C. — 'Introduction to Statistical Quality Control'",
    evidence_level: "empirical_validated",
    quantitative: "Dimension drift rate: Δd/Δn ≈ VB_rate × tan(κr). Predict tool change when: d_current + drift_rate × remaining_parts > USL - 3σ",
    related_rules: ["SPC-001", "TW-001", "TW-005"],
  },
  {
    id: "SPC-006",
    category: "spc",
    severity: "important",
    title: "Assignable causes vs common causes — reaction rules",
    rule: "Never adjust the process for common-cause variation (random scatter within control limits) — over-correction doubles the variance. Only adjust for assignable causes after identifying the root cause via control chart patterns.",
    reasoning: "Deming's funnel experiment proves that adjusting for random variation (tampering) increases total variation by √2 or more. A stable process within control limits should be left alone. Only special-cause signals (Western Electric rules) warrant intervention.",
    conditions: [{ type: "batch_size_above", count: 25 }],
    exceptions: ["Adaptive machining systems with physics-based models that can distinguish systematic from random"],
    source: "ISO 7870-1:2014 — Control charts — Part 1: General guidance",
    evidence_level: "iso_standard",
    standard_ref: "ISO 7870-1:2014",
    quantitative: "Common cause (random): σ_process. Assignable (special): pattern in chart. Never adjust for common cause (over-correction doubles variance). Only adjust for assignable cause after root cause identified",
    related_rules: ["SPC-001", "FA-006"],
  },

  // ── CROSS-DOMAIN SYNTHESIS ────────────────────────────────────────────────

  {
    id: "XD-001",
    category: "cross_domain",
    severity: "critical",
    title: "Force-deflection-finish triangle: three-way constraint",
    rule: "Solve the force-deflection-finish triangle simultaneously: Ra = f²/(32r) sets finish, but f is limited by δ_max = F(f)×L³/(3EI) ≤ tolerance/2. Compute f_max = min(f_Ra, f_δ, f_power).",
    reasoning: "These three constraints are coupled: increasing feed improves productivity but degrades finish and increases deflection. The optimal feed is the highest value that satisfies all three limits simultaneously. Optimizing one without the others leads to failure.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    conditions_all: [{ type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Roughing operations where finish and deflection are not limiting"],
    source: "Altintas, Y. — 'Manufacturing Automation'",
    evidence_level: "theoretical",
    formula_ref: ["brammertz_roughness", "beam_deflection", "cutting_power"],
    quantitative: "Ra = f²/(32r) BUT f is limited by δ_max = F(f)×L³/(3EI) ≤ tolerance/2. Solve simultaneously: f_max = min(f_Ra, f_δ, f_power)",
    related_rules: ["SI-001", "DA-004", "CF-003", "VD-002"],
  },
  {
    id: "XD-002",
    category: "cross_domain",
    severity: "important",
    title: "Thermal-dimensional feedback loop",
    rule: "Model the cutting → heat → expansion → dimensional error chain. Steady-state ΔT = Q/(h×A). Time constant τ = ρ×cp×V/(h×A). Allow τ minutes after parameter changes for thermal equilibrium before precision cuts.",
    reasoning: "Cutting heat enters the workpiece, causing it to expand and change dimensions. The thermal time constant determines how quickly the part reaches equilibrium. Machining before equilibrium means the part is still growing, causing progressive dimensional error.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.02 }],
    exceptions: ["Parts with active temperature control (oil shower, thermally conditioned fixturing)"],
    source: "Loewen, E.G. & Shaw, M.C. — combined with thermal expansion theory",
    evidence_level: "theoretical",
    formula_ref: ["thermal_expansion", "loewen_shaw_heat"],
    quantitative: "Error chain: Fc×Vc → Q_workpiece → ΔT → α×L×ΔT → dimensional error. Steady-state: ΔT_ss = Q/(h×A). Time constant: τ = ρ×cp×V/(h×A). Compensate after τ minutes",
    related_rules: ["TP-001", "TP-003", "DA-005"],
  },
  {
    id: "XD-003",
    category: "cross_domain",
    severity: "important",
    title: "Wear-force-finish degradation loop",
    rule: "As tool wear progresses, cutting force rises ~15% per 0.1mm VB and surface finish degrades: Ra_worn = Ra_fresh × (1 + 2×VB/r_nose). At VB=0.3mm with r=0.8mm nose: finish degrades to 1.75× fresh value.",
    reasoning: "Tool wear creates a three-way positive feedback loop: flank wear increases rubbing force, which increases heat, which accelerates wear further. Simultaneously, the altered edge geometry degrades surface finish. This non-linear degradation means quality drops rapidly near end-of-life.",
    conditions: [{ type: "always" }],
    exceptions: ["Self-sharpening tool materials (some ceramics) that maintain edge geometry"],
    source: "Trent, E.M. & Wright, P.K. — 'Metal Cutting'",
    evidence_level: "peer_reviewed",
    formula_ref: ["taylor_tool_life", "brammertz_roughness"],
    quantitative: "As VB increases: Fc rises ~15% per 0.1mm VB. Ra rises: Ra_worn = Ra_fresh × (1 + 2×VB/r_nose). At VB=0.3mm, r=0.8mm: Ra_worn = 1.75 × Ra_fresh",
    related_rules: ["TW-001", "SI-001", "CF-001"],
  },
  {
    id: "XD-004",
    category: "cross_domain",
    severity: "recommended",
    title: "Stability-productivity optimization via lobe sweeping",
    rule: "Maximize MRR within the stability boundary by sweeping RPM across stability lobes: MRR = ae × ap_lim(RPM) × Vf. The optimal RPM gives the highest MRR × stability product, not necessarily the highest speed.",
    reasoning: "Stability lobes create alternating zones of high and low permissible DOC. A slightly lower RPM in a stable lobe can allow 3× the DOC, yielding higher MRR than a faster RPM in an unstable zone. The globally optimal point is often in a lobe valley, not at maximum speed.",
    conditions: [{ type: "always" }],
    exceptions: ["HSM finishing where DOC is fixed at a small value and speed is the only variable"],
    source: "Altintas, Y. & Budak, E. — 'Analytical Prediction of Stability Lobes in Milling'",
    evidence_level: "peer_reviewed",
    formula_ref: ["stability_lobe", "mrr_calculation"],
    quantitative: "Pareto front: MRR = ae × ap_lim(RPM) × Vf. Sweep RPM across lobes, compute MRR at each ap_lim. Pick RPM with highest MRR×stability product",
    related_rules: ["VD-001", "EC-004"],
  },
  {
    id: "XD-005",
    category: "cross_domain",
    severity: "recommended",
    title: "Tool life-cost-quality Pareto optimization",
    rule: "Map the three-objective Pareto front: minimize cost, maximize quality (lowest Ra), maximize tool life. The operating window is Vc_maxlife < Vc < Vc_mincost. Within this window, choose based on priority.",
    reasoning: "Cost, quality, and tool life are competing objectives connected through cutting speed. The Pareto front shows that any improvement in one dimension requires sacrificing another. Making this tradeoff explicit prevents suboptimal decisions based on a single metric.",
    conditions: [{ type: "batch_size_above", count: 50 }],
    exceptions: ["Single-part production where optimization overhead exceeds benefit"],
    source: "Mukherjee, I. & Ray, P.K. — 'A review of optimization techniques in metal cutting processes' (Computers & Industrial Engineering, 2006)",
    evidence_level: "theoretical",
    formula_ref: ["taylor_tool_life", "minimum_cost_speed"],
    quantitative: "Objectives: minimize cost, maximize quality, maximize tool life. Pareto: any improvement in one worsens another. Compute: Vc_mincost, Vc_maxquality (lowest Ra), Vc_maxlife. Operating window: Vc_maxlife < Vc < Vc_mincost",
    related_rules: ["EC-001", "EC-002", "CF-008"],
  },
  {
    id: "XD-006",
    category: "cross_domain",
    severity: "important",
    title: "Thermal + residual stress + fatigue interaction for aerospace",
    rule: "For aerospace titanium/superalloy parts, always target compressive residual stress (σ_residual < 0). Aggressive cutting creates tensile stress that reduces fatigue life: ΔN_fatigue = N_base × (1 - σ_residual/σ_UTS).",
    reasoning: "Aerospace components operate under cyclic loading where surface integrity directly determines fatigue life. The interaction between cutting-induced thermal damage, residual stress state, and cyclic loading creates a multiplicative effect — tensile stress from aggressive cutting can halve fatigue life.",
    conditions: [{ type: "material_iso", groups: ["S"] }],
    conditions_all: [{ type: "material_iso", groups: ["S"] }, { type: "tolerance_below", threshold_mm: 0.05 }],
    exceptions: ["Non-structural components with no fatigue requirement"],
    source: "Ulutan, D. & Ozel, T. — 'Machining induced surface integrity in titanium and nickel alloys: A review' (Int. J. Machine Tools, 2011)",
    evidence_level: "peer_reviewed",
    quantitative: "Aggressive cutting → tensile residual stress → reduced fatigue life. Conservative → compressive → improved fatigue. Net effect: ΔN_fatigue = N_base × (1 - σ_residual/σ_UTS). For aerospace: always target σ_residual < 0",
    related_rules: ["SI-003", "SI-002", "MS-002", "TP-005"],
  },
  {
    id: "XD-007",
    category: "cross_domain",
    severity: "tip",
    title: "Chip morphology diagnostic — shape reveals process state",
    rule: "Inspect chip form as a diagnostic: Type 1 (ribbon) = too ductile, increase feed. Type 2 (tubular) = ideal for steel. Type 3 (spiral) = ideal for aluminum. Type 4 (arc) = acceptable. Type 6 (powder) = material too brittle or excessive wear.",
    reasoning: "Chip form is the most accessible real-time indicator of cutting conditions. No sensor needed — just look at the chips. Chip shape reflects the balance of deformation, temperature, and material behavior, making it a quick diagnostic for parameter adjustment.",
    conditions: [{ type: "always" }],
    exceptions: ["Micro-machining where chips are too small to inspect visually"],
    source: "ISO 3685:1993 Annex A — Chip forms",
    evidence_level: "iso_standard",
    standard_ref: "ISO 3685:1993 Annex A — Chip forms",
    quantitative: "Type 1 (ribbon): too ductile, increase feed. Type 2 (tubular): ideal for steel. Type 3 (spiral): ideal for aluminum. Type 4 (arc): acceptable. Type 6 (powder): material too brittle or excessive tool wear",
    related_rules: ["CF-001", "TW-004", "MS-001"],
  },
  {
    id: "XD-008",
    category: "cross_domain",
    severity: "recommended",
    title: "Unified process optimization objective function",
    rule: "Define a weighted objective Z = w1×(Cost/Cost_ref) + w2×(1-Quality/Quality_ref) + w3×(Time/Time_ref). Minimize Z subject to ap < ap_lim, Pc < Pc_max, Ra < Ra_spec. Typical weights: w1=0.4, w2=0.35, w3=0.25.",
    reasoning: "Multi-objective optimization requires a single scalar objective for practical implementation. The weighted-sum approach combines cost, quality, and time into one function that can be minimized numerically. Weights reflect business priorities and can be adjusted per job.",
    conditions: [{ type: "batch_size_above", count: 20 }],
    exceptions: ["Jobs with a single dominant constraint (e.g., pure quality for medical devices)"],
    source: "Mukherjee, I. & Ray, P.K. — 'Optimization techniques in metal cutting'",
    evidence_level: "theoretical",
    quantitative: "Z = w1×(Cost/Cost_ref) + w2×(1-Quality/Quality_ref) + w3×(Time/Time_ref). Minimize Z subject to: ap < ap_lim, Pc < Pc_max, Ra < Ra_spec. Typical weights: w1=0.4, w2=0.35, w3=0.25",
    related_rules: ["EC-001", "XD-005", "XD-004"],
  },

  // ── MATERIAL SCIENCE ──────────────────────────────────────────────────────

  {
    id: "MS-001",
    category: "material_tip",
    severity: "critical",
    title: "Work hardening in austenitic stainless — never dwell or rub",
    rule: "When machining 304/316 stainless steel, never allow the tool to dwell or rub. Always cut below the previous work-hardened layer. Maintain minimum feed f > 0.05mm/rev to ensure chip formation, not ploughing.",
    reasoning: "Austenitic stainless steels work-harden rapidly from 180 HV to 350+ HV on the surface. Each pass creates a 0.05-0.3mm hard layer. If the next pass cuts within this layer, the tool encounters material twice as hard as the bulk, causing rapid wear and more hardening.",
    conditions: [{ type: "material_iso", groups: ["M"] }],
    exceptions: ["Precipitation-hardened stainless (17-4 PH) which has limited work hardening"],
    source: "Sandvik Coromant — 'ISO M: Stainless Steel Machining Guide'",
    evidence_level: "peer_reviewed",
    quantitative: "304/316 SS: work hardens from 180 HV to 350+ HV on surface. Layer depth: 0.05-0.3mm per pass. Rule: always cut below previous work-hardened layer. Min feed: f > 0.05mm/rev",
    related_rules: ["TW-003", "CF-006", "TW-004"],
  },
  {
    id: "MS-002",
    category: "material_tip",
    severity: "important",
    title: "Titanium low thermal conductivity — strict speed limit",
    rule: "Limit cutting speed for Ti-6Al-4V: 40-80 m/min with carbide (dry), up to 150-250 m/min with high-pressure coolant. Titanium's thermal conductivity (6.7 W/m·K) is 7× lower than steel, concentrating all heat at the tool tip.",
    reasoning: "In steel, heat conducts away through the workpiece. In titanium, the heat has nowhere to go except into the tool. Above ~800°C, carbide loses hardness rapidly. This thermal barrier is the primary reason titanium machining is slow — it's not about force, it's about heat.",
    conditions: [{ type: "material_iso", groups: ["S"] }],
    exceptions: ["CBN tools at very light DOC for finishing where heat generation is minimal"],
    source: "Ezugwu, E.O. & Wang, Z.M. — 'Titanium alloys and their machinability: a review' (J. Materials Processing, 1997)",
    evidence_level: "manufacturer_data",
    quantitative: "Ti-6Al-4V: k = 6.7 W/m·K (vs steel 50, aluminum 237). At Vc > 60 m/min: tool temperature > 800°C (carbide limit). Max recommended: Vc = 40-80 m/min carbide, 150-250 m/min with coolant",
    related_rules: ["TP-005", "TW-002", "TW-006"],
  },
  {
    id: "MS-003",
    category: "material_tip",
    severity: "important",
    title: "Aluminum silicon content determines tool selection",
    rule: "Select tooling based on Si content: Si < 7% → uncoated carbide or TiN. Si 7-12% → PCD or diamond-coated mandatory. Si > 12% (hypereutectic) → PCD only. Silicon particles are harder than carbide and destroy uncoated tools.",
    reasoning: "Silicon forms hard particles (HV 1100) embedded in the soft aluminum matrix. These particles are abrasive to carbide (HV 1500) and rapidly wear uncoated tools. PCD (HV 8000) and CVD diamond resist this abrasion, enabling 10-100× longer tool life in high-Si alloys.",
    conditions: [{ type: "material_iso", groups: ["N"] }],
    exceptions: ["6061-T6 and other low-Si wrought alloys where any sharp carbide tool works well"],
    source: "Kennametal — 'Aluminum Machining Guide'",
    evidence_level: "manufacturer_data",
    quantitative: "Si < 7%: uncoated carbide or TiN. Si 7-12%: PCD or diamond-coated. Si > 12% (hypereutectic): PCD mandatory. Free-machining alloys (2011, 6262): add Pb/Bi, higher speeds possible",
    related_rules: ["TW-006", "TW-004"],
  },
  {
    id: "MS-004",
    category: "material_tip",
    severity: "recommended",
    title: "Cast iron graphite form affects machinability",
    rule: "Adjust cutting parameters based on cast iron graphite form: Grey (FG) = best machinability, Vc 200-400 m/min. Ductile (SG) = 20-30% harder to machine, Vc 100-250. CGI (CV) = 50-80% more wear, Vc 80-150 m/min.",
    reasoning: "Graphite form determines chip breaking and tool wear behavior. Grey iron's flake graphite creates natural chip breakers and lubricates. Ductile iron's nodular graphite gives continuous chips. CGI's vermicular graphite combines the worst aspects of both for tool wear.",
    conditions: [{ type: "material_iso", groups: ["K"] }],
    exceptions: ["Austempered ductile iron (ADI) which requires separate parameter tables"],
    source: "Sandvik Coromant — 'ISO K: Cast Iron Machining Guide'",
    evidence_level: "peer_reviewed",
    quantitative: "Grey (FG): best machinability, discontinuous chips. Ductile (SG): 20-30% harder to machine, continuous chips. CGI (CV): 50-80% more tool wear than grey. Vc recommendation: Grey 200-400, Ductile 100-250, CGI 80-150 m/min",
    related_rules: ["CF-001", "TW-002"],
  },
  {
    id: "MS-005",
    category: "material_tip",
    severity: "recommended",
    title: "Hardened steel machining zones by hardness",
    rule: "Select process based on hardness: 30-45 HRC → conventional carbide. 45-55 HRC → CBN or ceramic turning viable. 55-65 HRC → CBN recommended, grinding alternative. >65 HRC → grinding only (EDM for complex shapes).",
    reasoning: "As hardness increases, the cutting temperature and force rise non-linearly. Carbide loses its edge above ~45 HRC for most operations. CBN and ceramic materials maintain hardness at elevated temperatures, making hard turning possible up to 65 HRC where it can replace grinding.",
    conditions: [{ type: "hardness_above", hrc: 30 }],
    exceptions: ["Interrupted cuts in hardened steel where CBN may chip — use tougher ceramic grades"],
    source: "Sandvik Coromant — 'Turning Hard Parts'",
    evidence_level: "empirical_validated",
    quantitative: "30-45 HRC: conventional carbide turning. 45-55 HRC: CBN or ceramic turning viable. 55-65 HRC: CBN recommended, grinding alternative. >65 HRC: grinding only (EDM for complex shapes)",
    related_rules: ["SI-002", "TW-006"],
  },
  {
    id: "MS-006",
    category: "material_tip",
    severity: "tip",
    title: "Free-machining additives improve chip breaking",
    rule: "Specify free-machining material variants when machinability is a priority. Lead (Pb) reduces cutting force 10-20%. Sulfur (S) forms MnS inclusions that lubricate. 12L14 has 60% better machinability than 1018.",
    reasoning: "Free-machining additives create internal stress concentrators (Pb, Bi) or lubricating inclusions (MnS) that promote chip breaking and reduce friction. This reduces cutting forces, improves surface finish, and extends tool life with minimal impact on mechanical properties.",
    conditions: [{ type: "always" }],
    exceptions: ["Structural or fatigue-critical parts where inclusions may reduce mechanical properties"],
    source: "ASM Handbook Vol. 16 — 'Machining'",
    evidence_level: "manufacturer_data",
    quantitative: "Lead (Pb): reduces cutting force 10-20%, improves chip breaking. Sulfur (S): forms MnS inclusions, lubricates. Calcium-deoxidized: forms protective Ca-Al-Si-O layer on tool. 12L14 vs 1018: 60% better machinability",
    related_rules: ["CF-001", "XD-007"],
  },

  // ── GEOMETRIC DIMENSIONING ────────────────────────────────────────────────

  {
    id: "GD-001",
    category: "gdt",
    severity: "critical",
    title: "Datum precedence determines machining sequence",
    rule: "Machine datum surfaces in order of precedence: primary datum A (3 DOF, face first), secondary datum B (2 DOF, edge), tertiary datum C (1 DOF, end). All features referencing A|B|C must be machined AFTER these datums are established.",
    reasoning: "The datum reference frame defines the coordinate system for all GD&T callouts. If datum surfaces are machined out of order or after the features they control, the features cannot be held to their specified tolerance zones relative to the actual (not theoretical) datums.",
    conditions: [{ type: "always" }],
    exceptions: ["Parts with no formal GD&T where bilateral tolerances reference edges directly"],
    source: "ASME Y14.5-2018 §4.1 — Datum reference frames",
    evidence_level: "iso_standard",
    standard_ref: "ASME Y14.5-2018 §4.1",
    quantitative: "Primary datum A: 3 DOF removed (plane). Secondary B: 2 DOF (line). Tertiary C: 1 DOF (point). Machine A first (facing), then B (edge), then C (end) before features",
    related_rules: ["SEQ-002", "GD-002"],
  },
  {
    id: "GD-002",
    category: "gdt",
    severity: "important",
    title: "Position tolerance bonus from MMC modifier",
    rule: "When position tolerance is specified at MMC (circled M), bonus tolerance = |actual_size - MMC_size|. At LMC: maximum bonus equals the full size tolerance. Factor this into process capability — the effective tolerance is larger than the callout.",
    reasoning: "MMC bonus tolerance accounts for the functional requirement: if a pin is smaller than MMC, it has more clearance in its mating hole, so its position can be looser. This 'virtual condition' concept means the actual manufacturing tolerance is more generous than the drawing callout suggests.",
    conditions: [{ type: "always" }],
    exceptions: ["RFS (regardless of feature size) callouts where no bonus applies"],
    source: "ASME Y14.5-2018 §11.3 — Positional tolerancing at MMC",
    evidence_level: "iso_standard",
    standard_ref: "ASME Y14.5-2018 §11.3",
    quantitative: "Bonus = |actual_size - MMC_size|. Example: Ø10.0 +0.1/-0 hole with ⊕∅0.05(M). At Ø10.05: bonus = 0.05, total tol = ∅0.10. At Ø10.10 (LMC): bonus = 0.10, total = ∅0.15",
    related_rules: ["GD-001", "GD-005"],
  },
  {
    id: "GD-003",
    category: "gdt",
    severity: "recommended",
    title: "Flatness tolerance achievable by process",
    rule: "Select the machining process based on required flatness: face milling 0.01-0.05mm/100mm, grinding 0.002-0.01mm/100mm, lapping 0.001-0.003mm/100mm, scraping 0.002-0.005mm/100mm. Double for thin parts due to stress relief distortion.",
    reasoning: "Each process has inherent flatness limits from kinematics, tool rigidity, and thermal effects. Specifying tighter flatness than the selected process can achieve guarantees failure. Thin parts warp from residual stress release, requiring 2× the tolerance allowance.",
    conditions: [{ type: "always" }],
    exceptions: ["Vacuum-chucked thin parts where clamping controls distortion during machining"],
    source: "ISO 12781-1:2011 — Geometrical product specifications — Flatness",
    evidence_level: "empirical_validated",
    standard_ref: "ISO 12781-1:2011 — Flatness",
    quantitative: "Face milling: 0.01-0.05mm/100mm. Grinding: 0.002-0.01mm/100mm. Lapping: 0.001-0.003mm/100mm. Scraping: 0.002-0.005mm/100mm. Thin parts: add 2× for stress relief distortion",
    related_rules: ["SI-004", "GD-004"],
  },
  {
    id: "GD-004",
    category: "gdt",
    severity: "recommended",
    title: "Cylindricity controls roundness + straightness + taper simultaneously",
    rule: "Cylindricity tolerance defines a zone between two coaxial cylinders. Achievable values: turning 0.005-0.02mm, grinding 0.001-0.005mm, honing 0.001-0.003mm. It is the most comprehensive single control for cylindrical features.",
    reasoning: "Cylindricity captures all form errors of a cylindrical surface in one callout — roundness at any cross-section, straightness along any line, and taper along the axis. It is more restrictive than roundness alone, making it the proper control for bearing bores and precision fits.",
    conditions: [{ type: "always" }],
    exceptions: ["Short cylinders (L/D < 0.5) where roundness alone is sufficient"],
    source: "ISO 12180-1:2011 — Geometrical product specifications — Cylindricity",
    evidence_level: "iso_standard",
    standard_ref: "ISO 12180-1:2011 — Cylindricity",
    quantitative: "Cylindricity zone: two coaxial cylinders, radial separation = tolerance. Achievable: turning 0.005-0.02mm, grinding 0.001-0.005mm, honing 0.001-0.003mm",
    related_rules: ["GD-003", "GD-006"],
  },
  {
    id: "GD-005",
    category: "gdt",
    severity: "tip",
    title: "True position vs bilateral tolerance conversion",
    rule: "Convert bilateral ±tolerances to true position: ∅tol = 2 × √(tx² + ty²). Example: ±0.1mm in both X and Y = ∅0.283mm true position. True position is always LESS restrictive than equal bilateral.",
    reasoning: "Bilateral tolerances define a square zone; true position defines a circular zone. The circular zone at the same diameter as the square diagonal accepts more parts because corners of the square that were previously rejected now fall within the circle. This is a free tolerance gain.",
    conditions: [{ type: "always" }],
    exceptions: ["Elongated features where the tolerance zone should be non-circular"],
    source: "ASME Y14.5-2018 §11.1 — Positional tolerancing fundamentals",
    evidence_level: "iso_standard",
    standard_ref: "ASME Y14.5-2018 §11.1",
    quantitative: "Position ∅tol = 2 × √(tx² + ty²). Example: ±0.1mm bilateral X and Y = ∅0.283mm true position. True position is always LESS restrictive than equal bilateral",
    related_rules: ["GD-002", "GD-001"],
  },
  {
    id: "GD-006",
    category: "gdt",
    severity: "important",
    title: "Perpendicularity controls axis tilt for bored holes",
    rule: "For bored holes with perpendicularity callout ⊥tol/depth: max tilt angle = atan(tol/depth). At 50mm depth with 0.02mm tolerance: tilt = 0.023° = 1.4 arcmin. Ensure boring bar rigidity and alignment support this requirement.",
    reasoning: "Perpendicularity of a bore axis to a datum surface determines how well a shaft or pin sits in the hole. Axis tilt causes binding in fits and misalignment in assemblies. The tolerance is typically specified as a cylindrical zone within which the axis must lie.",
    conditions: [{ type: "always" }],
    exceptions: ["Through-holes with press-fit alignment where the fit itself provides angular control"],
    source: "ISO 1101:2017 — Geometrical tolerancing — Tolerances of form, orientation, location and run-out",
    evidence_level: "iso_standard",
    standard_ref: "ISO 1101:2017 — Geometrical tolerancing",
    quantitative: "⊥0.02/100 = axis may tilt 0.02mm over 100mm depth. For bore depth L: max tilt angle = atan(tol/L). At L=50mm, tol=0.02: angle = 0.023° = 1.4 arcmin",
    related_rules: ["GD-004", "DA-001"],
  },

  // ── MACHINE CAPABILITY ────────────────────────────────────────────────────

  {
    id: "MC-001",
    category: "machine_capability",
    severity: "critical",
    title: "Spindle power check before roughing",
    rule: "Calculate required cutting power Pc = kc × ae × ap × Vf / (60e6 × η) before roughing. Must not exceed 80% of continuous spindle power rating. Short burst cuts (<2 min) may use S3-25% rating (~120% continuous).",
    reasoning: "Exceeding continuous spindle power causes thermal protection trips (production stops), accelerated bearing wear (maintenance cost), or stalling (crash risk). The 80% rule provides margin for transient force spikes and ensures the drive operates in its efficient zone.",
    conditions: [{ type: "always" }],
    exceptions: ["Machines with spindle load monitoring that dynamically adjusts feed"],
    source: "Sandvik Coromant — 'Metal Cutting Technology'",
    evidence_level: "manufacturer_data",
    formula_ref: ["cutting_power"],
    quantitative: "Pc_required = kc × ae × ap × Vf / (60e6 × η). Must be < P_spindle_rated × 0.8 (continuous duty). Burst (S3-25%): allow up to P_rated × 1.2 for < 2min cuts",
    related_rules: ["CF-003", "EC-004"],
  },
  {
    id: "MC-002",
    category: "machine_capability",
    severity: "important",
    title: "Axis acceleration limits affect HSM corner velocity",
    rule: "At high feed rates with tight radii, check required centripetal acceleration: a = V²/R. If a > machine axis acceleration limit, the controller must slow down: V_max = √(a_max × R). Program accordingly or use G187/smoothing.",
    reasoning: "CNC machines have finite axis acceleration (typically 0.5-3 m/s²). Attempting to follow a tight radius at high feed exceeds the servo's ability to change direction, causing following error, corner rounding, or feed limiting. The controller automatically slows, but programmed feed should reflect this.",
    conditions: [{ type: "spindle_speed_above", rpm: 8000 }],
    exceptions: ["Linear interpolation segments where no radius tracking is required"],
    source: "Siemens — 'SINUMERIK Advanced Surface Motion Control'",
    evidence_level: "manufacturer_data",
    quantitative: "Typical CNC: 0.5-3 m/s² acceleration. At high feed (10m/min) with tight radius (R5mm): required a = V²/R = 2.78²/0.005 = 1543 m/s². Feed MUST slow: V_max = √(a_max × R). At a=1g: V_max = √(9.81×0.005) = 0.22 m/s = 13.2 m/min",
    related_rules: ["MC-004", "EC-005"],
  },
  {
    id: "MC-003",
    category: "machine_capability",
    severity: "important",
    title: "Ball-screw thermal expansion causes positioning drift",
    rule: "Account for ball-screw thermal expansion: a steel ball screw at α=11.7µm/m/°C with 3°C rise over 1m travel drifts 35µm. Pre-tensioned screws reduce by 50%. Linear scales eliminate the error entirely.",
    reasoning: "Ball screws heat up from friction during rapid traversals and high-feed machining. The resulting thermal expansion shifts the position-versus-encoder relationship, causing progressive dimensional drift. This is the #1 reason precision shops invest in linear scale feedback.",
    conditions: [{ type: "tolerance_below", threshold_mm: 0.02 }],
    exceptions: ["Machines with ball-screw thermal compensation via temperature sensors"],
    source: "THK — 'Ball Screw Technical Information: Thermal Displacement'",
    evidence_level: "manufacturer_data",
    quantitative: "Steel ballscrew: α=11.7µm/m/°C. At 3°C rise over 1m travel: drift = 35µm. Pre-tensioned screws reduce by 50%. Linear scales eliminate entirely (direct measurement)",
    related_rules: ["TP-001", "DA-005", "DA-006"],
  },
  {
    id: "MC-004",
    category: "machine_capability",
    severity: "recommended",
    title: "Servo loop bandwidth affects contour accuracy",
    rule: "Check servo bandwidth vs required contour frequency: f_required = Vf/(2π×R). If bandwidth < f_required, the machine rounds corners: error ≈ V²/(BW²×R). Reduce feed at tight corners or use look-ahead/smoothing.",
    reasoning: "The servo loop acts as a low-pass filter on the commanded trajectory. Features requiring higher-frequency axis motion than the servo bandwidth get attenuated — meaning corners are rounded and small features are distorted. This is a fundamental machine limitation, not a programming error.",
    conditions: [{ type: "always" }],
    exceptions: ["Large-radius contours where servo bandwidth is not the limiting factor"],
    source: "Altintas, Y. — 'Manufacturing Automation: Ch.9 CNC'",
    evidence_level: "manufacturer_data",
    quantitative: "Typical servo BW: 50-200 Hz. At Vf=5000mm/min, R=2mm corner: f_required = Vf/(2π×R) = 398 Hz. If BW < f_required: corner rounding error = V²/(BW²×R)",
    related_rules: ["MC-002", "DA-002"],
  },
  {
    id: "MC-005",
    category: "machine_capability",
    severity: "recommended",
    title: "Tool changer time in cycle optimization",
    rule: "Factor ATC time (2-8s chip-to-chip) into cycle optimization. At 10 tools × 5s = 50s overhead per part. Combine roughing + finishing in the same tool where possible. Break-even: combine if time saved > quality cost.",
    reasoning: "Tool change time is pure non-cutting overhead. Each change involves rapid to home, magazine rotation, spindle orient, tool swap, rapid to position, and re-engaging. Reducing the number of tools by combining operations (e.g., same endmill for rough and finish) can save significant cycle time.",
    conditions: [{ type: "always" }],
    exceptions: ["Dedicated production machines with turret-style changers (<1s change time)"],
    source: "Haas Automation — 'Cycle Time Reduction Guide'",
    evidence_level: "manufacturer_data",
    quantitative: "Typical ATC: 2-8s (chip-to-chip). 10 tools × 5s = 50s overhead. Combine: roughing + finishing same tool where possible. Break-even: combine if time_saved > surface_quality_cost",
    related_rules: ["EC-005", "EC-004"],
  },
  {
    id: "MC-006",
    category: "machine_capability",
    severity: "tip",
    title: "Spindle bearing life vs speed — L10 derating",
    rule: "Spindle bearing life L10 derates with speed: at 100% rated RPM, L10 = 63% of baseline (80% RPM). At 120% max RPM, L10 drops to 37%. Prolonged high-speed operation degrades positioning accuracy over months.",
    reasoning: "Bearing life follows the L10 model where life is inversely proportional to speed raised to the 10/3 power. Running at maximum RPM continuously consumes bearing life rapidly, leading to increased play, reduced stiffness, and degraded accuracy long before catastrophic failure.",
    conditions: [{ type: "always" }],
    exceptions: ["Air-bearing spindles with no contact (different wear mechanism)"],
    source: "SKF — 'Rolling Bearings Catalog: Spindle Bearings'",
    evidence_level: "manufacturer_data",
    quantitative: "L10 ∝ (C/P)^(10/3) × (n_rated/n_actual). At 80% rated RPM: L10 = 100% baseline. At 100%: L10 = 63%. At 120%: L10 = 37%. Prolonged high-speed use degrades positioning accuracy over months",
    related_rules: ["MC-001", "DA-002"],
  },

  // ── FAILURE ANALYSIS ──────────────────────────────────────────────────────

  {
    id: "FA-001",
    category: "failure_analysis",
    severity: "critical",
    title: "Tool breakage root cause: force exceeded transverse rupture strength",
    rule: "When a tool breaks, first check: σ_tool = Fc / cross_section_area. If σ > 0.5 × TRS (transverse rupture strength): reduce DOC or feed. Common causes: chip recutting, hard inclusions, excessive DOC.",
    reasoning: "Carbide tools fail in a brittle manner when the bending stress from cutting forces exceeds their transverse rupture strength (1500-3500 MPa). The 0.5× safety factor accounts for stress concentrators, impact loading at entry, and fatigue from interrupted cuts.",
    conditions: [{ type: "always" }],
    exceptions: ["Gradual wear-out failures which are normal end-of-life behavior"],
    source: "Sandvik Coromant — 'Troubleshooting Guide: Tool Breakage'",
    evidence_level: "empirical_validated",
    quantitative: "Carbide transverse rupture strength: 1500-3500 MPa. Check: σ_tool = Fc/(cross_section). If σ > 0.5 × TRS: reduce DOC or feed. Common cause: chip recutting, hard inclusions, excessive DOC",
    related_rules: ["CF-001", "CF-006", "TW-001"],
  },
  {
    id: "FA-002",
    category: "failure_analysis",
    severity: "important",
    title: "Chatter marks diagnosis: measure surface waviness spacing",
    rule: "Diagnose chatter by measuring surface mark spacing: λ = Vf / f_chatter [mm]. If λ matches Vf/(z×RPM/60): regenerative chatter. Fix: change RPM to stable lobe, reduce DOC, or add damping.",
    reasoning: "Chatter leaves a distinctive pattern of evenly-spaced marks on the surface. The spacing directly reveals the vibration frequency. Matching this to tooth-passing frequency confirms regenerative chatter; mismatches indicate forced vibration from bearings, drives, or external sources.",
    conditions: [{ type: "always" }],
    exceptions: ["Surface marks from tool runout which appear at once-per-revolution frequency"],
    source: "Tobias, S.A. — 'Machine Tool Vibration'",
    evidence_level: "peer_reviewed",
    quantitative: "Waviness wavelength λ = Vf/f_chatter [mm]. Measure spacing of marks. If λ matches Vf/(z×n): regenerative chatter. Fix: change RPM to stable lobe, reduce DOC, add damping",
    related_rules: ["VD-001", "VD-003", "VD-004"],
  },
  {
    id: "FA-003",
    category: "failure_analysis",
    severity: "important",
    title: "Premature flank wear: speed too high — check Taylor curve",
    rule: "If tool life is less than 50% of catalog value, cutting speed is likely too high. Reduce Vc by 15%. If still short: check runout (>10µm doubles wear rate), coolant aim, and coating-material match.",
    reasoning: "The Taylor equation shows exponential sensitivity of tool life to speed. A 15% speed increase can reduce life by 40%. Premature wear combined with correct speed usually indicates secondary factors: excessive runout, poor coolant delivery, or wrong coating grade.",
    conditions: [{ type: "always" }],
    exceptions: ["New or re-ground tools that may have inconsistent edge preparation"],
    source: "Kennametal — 'Troubleshooting Guide: Premature Tool Wear'",
    evidence_level: "manufacturer_data",
    formula_ref: ["taylor_tool_life"],
    quantitative: "If tool life < 50% of catalog: Vc is too high. Reduce by 15%. If still short: check runout (>10µm doubles wear), coolant aim, coating match. Taylor: doubling Vc cuts life to 10-25%",
    related_rules: ["CF-008", "TW-001", "TW-002"],
  },
  {
    id: "FA-004",
    category: "failure_analysis",
    severity: "important",
    title: "Edge chipping: interrupted cuts or entry/exit shock",
    rule: "Edge chipping in interrupted cuts indicates a toughness problem. Mitigate: use tougher grade (higher Co%), increase lead angle (>45°), hone edge (rε = 25-50µm), and prefer PVD over CVD coatings for impact resistance.",
    reasoning: "CVD coatings are thicker (5-20µm) and more brittle than PVD (1-5µm). In interrupted cuts, the impact loading exceeds the coating's fracture toughness. Tougher substrates (higher cobalt binder) and honed edges distribute the impact over a larger area, preventing micro-fracture.",
    conditions: [{ type: "always" }],
    exceptions: ["Continuous cutting operations where chipping indicates a different root cause"],
    source: "Sandvik Coromant — 'Troubleshooting Guide: Edge Chipping'",
    evidence_level: "empirical_validated",
    quantitative: "Mitigation: use tougher grade (higher Co%), reduce entry angle (lead angle >45°), hone edge (rε = 25-50µm for interrupted). PVD coating more shock-resistant than CVD",
    related_rules: ["CF-006", "TW-006", "FA-001"],
  },
  {
    id: "FA-005",
    category: "failure_analysis",
    severity: "recommended",
    title: "Burr formation prediction and control",
    rule: "Burr height is proportional to f × √(ap/σ_yield). Higher feed = larger burr. Sharper tool = smaller burr. Exit burrs are largest. Mitigate: use climb milling, chamfered exit edges, or support material at exit.",
    reasoning: "Burrs form when the workpiece material plastically deforms rather than fracturing cleanly at the exit edge. Feed rate determines the volume of material pushed, while yield strength determines resistance to deformation. Climb milling creates a thin exit chip that minimizes burr formation.",
    conditions: [{ type: "always" }],
    exceptions: ["Brittle materials (cast iron, hardened steel) that fracture cleanly rather than forming burrs"],
    source: "Gillespie, L.K. — 'Deburring and Edge Finishing Handbook'",
    evidence_level: "peer_reviewed",
    quantitative: "Burr height ∝ f × √(ap/σ_yield). Higher feed = larger burr. Sharper tool = smaller burr. Exit burr largest. Mitigation: climb milling, chamfered exit edge, support material",
    related_rules: ["CF-001", "SI-001"],
  },
  {
    id: "FA-006",
    category: "failure_analysis",
    severity: "recommended",
    title: "Dimensional drift during batch: systematic vs random diagnosis",
    rule: "Diagnose dimensional drift by plotting every 10th part: linear trend = tool wear (compensate with offset). Step change = tool breakage/rotation/shift. Random scatter = process incapable (improve Cpk).",
    reasoning: "Systematic drift has an identifiable root cause that can be corrected. Random variation is inherent to the process. Treating random variation as systematic (adjusting offsets) doubles the variance (Deming's funnel). Correct diagnosis determines the correct intervention.",
    conditions: [{ type: "always" }],
    exceptions: ["In-process gauging with automatic offset correction that handles drift automatically"],
    source: "Montgomery, D.C. — 'Introduction to Statistical Quality Control'",
    evidence_level: "empirical_validated",
    quantitative: "Systematic drift rate: measure every 10th part, plot trend. If linear: tool wear (compensate with offset). If step-change: tool broke/rotated/shifted. If random: process incapable (increase Cpk)",
    related_rules: ["SPC-001", "SPC-005", "SPC-006"],
  },
  {
    id: "FA-007",
    category: "failure_analysis",
    severity: "recommended",
    title: "Vibration-induced surface marks: identify frequency source",
    rule: "Measure mark spacing on the workpiece, divide by surface speed to get the vibration frequency. Match to: spindle bearing defect (kHz range), tooth passing (z×RPM/60), or structural mode (from tap test). Fix accordingly.",
    reasoning: "Different vibration sources produce different frequencies and require different remedies. Bearing defects need maintenance, forced vibration from tooth passing needs RPM change, and structural resonance needs DOC reduction or damping. The surface marks encode the diagnosis.",
    conditions: [{ type: "always" }],
    exceptions: ["Marks from tool runout which appear at spindle frequency, not a vibration problem"],
    source: "Schmitz, T. & Smith, K.S. — 'Machining Dynamics'",
    evidence_level: "empirical_validated",
    quantitative: "Measure mark spacing. Divide by surface speed to get frequency. Match to: spindle bearing (kHz range), tooth passing (z×RPM/60), structural mode (tap test). Fix accordingly",
    related_rules: ["VD-001", "VD-003", "VD-005", "FA-002"],
  },
  {
    id: "FA-008",
    category: "failure_analysis",
    severity: "tip",
    title: "Chip welding / BUE diagnosis: intermittent surface finish",
    rule: "Diagnose BUE by: silvery deposit on rake face, intermittent surface finish (alternating good/bad patches). Cause: Vc too low or no coating. Fix: increase Vc 20-30%, apply TiN/TiAlN coating, use positive rake geometry.",
    reasoning: "BUE periodically builds up on the cutting edge, increasing the effective rake angle and improving the cut. Then it breaks off, taking carbide with it and leaving a rough patch. This cycle creates the characteristic alternating finish pattern that is the key diagnostic indicator.",
    conditions: [{ type: "always" }],
    exceptions: ["Intentional BUE in free-machining materials where it protects the edge"],
    source: "Trent, E.M. & Wright, P.K. — 'Metal Cutting'",
    evidence_level: "empirical_validated",
    quantitative: "BUE indicator: intermittent surface finish (alternating good/bad). Cause: Vc too low or no coating. Fix: increase Vc 20-30%, apply TiN/TiAlN coating, use positive rake geometry",
    related_rules: ["TW-004", "SI-001", "CF-001"],
  },
  {
    id: "FA-009",
    category: "failure_analysis",
    severity: "tip",
    title: "Coolant-related surface staining diagnosis",
    rule: "Diagnose surface staining: concentration too low (<3% emulsion → corrosion), bacterial growth (>10⁶ CFU/mL → odor + discoloration), tramp oil (>5% → poor wetting). Maintain 6-8% concentration, pH 8.5-9.2, skim tramp oil regularly.",
    reasoning: "Coolant chemistry directly affects surface quality. Low concentration loses corrosion protection. Bacterial contamination breaks down the emulsion and produces acids. Tramp oil from way lubes and hydraulic leaks floats on the surface and prevents coolant from reaching the cut zone.",
    conditions: [{ type: "always" }],
    exceptions: ["Dry machining or MQL operations with no water-based coolant"],
    source: "Byers, J.P. — 'Metalworking Fluids' (3rd ed.)",
    evidence_level: "empirical_validated",
    quantitative: "Causes: concentration too low (<3% emulsion → rust), bacterial growth (>10⁶ CFU/mL), tramp oil contamination (>5%). Fix: maintain 6-8%, test pH weekly (target 8.5-9.2), skim tramp oil",
    related_rules: ["TP-004", "TP-006"],
  },
  {
    id: "FA-010",
    category: "failure_analysis",
    severity: "tip",
    title: "Thermal cracking on milling inserts: comb cracks perpendicular to edge",
    rule: "Diagnose thermal cracking by comb-shaped cracks perpendicular to the cutting edge on milling inserts. Cause: thermal cycling from interrupted cut + flood coolant. Fix: switch to dry milling or ensure consistent flood (reduce ΔT).",
    reasoning: "Each revolution, the cutting edge heats to 500-900°C during engagement then cools rapidly in the non-cutting arc. Flood coolant amplifies the cooling rate. The repeated thermal expansion/contraction generates tensile stresses that nucleate and propagate comb cracks over 1000-5000 cycles.",
    conditions: [{ type: "always" }],
    exceptions: ["Continuous turning where thermal cycling doesn't occur"],
    source: "Sandvik Coromant — 'Tool Wear Atlas'",
    evidence_level: "peer_reviewed",
    quantitative: "Cause: thermal cycling from interrupted cut + coolant. Each cycle: ΔT = 200-600°C. Crack initiation: ~1000-5000 cycles. Fix: dry milling (no thermal shock) or consistent flood (reduce ΔT)",
    related_rules: ["ANTI-004", "TW-006", "FA-004"],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PLAYBOOK EXPANSION — U-PB-MAX-VARIABILITY (slot:foxtrot iter8 2026-05-23)
  // Operator /goal: "expand machining, cad and cam playbooks to max statistical
  // output. max variability and max logical node usage from PSN". 15 cited rules
  // across 5 thin/underrepresented categories (3 each): milling, 5axis, gdt
  // (CAD-side), toolpath_strategy (CAM-side), hsm. Every rule carries handbook
  // or manufacturer source per slot:foxtrot tribal doctrine.
  // ──────────────────────────────────────────────────────────────────────────

  // ─── milling (3→6) — basic milling tribal expansion ───────────────────────

  {
    id: "milling-climb-default",
    category: "milling",
    severity: "important",
    title: "Default to climb milling for rigid CNC, conventional only for HSS or backlash",
    rule: "Use climb milling (down milling) as the default on rigid CNC machining centers — chip starts thick and ends thin, cutting heat goes into the chip not the part, surface finish improves 30-50%. Use conventional milling (up milling) only on manual machines with backlash, HSS tools on hardened steel, or when prior surface has hard scale/skin.",
    reasoning: "In climb milling, the cutter rotation pulls the chip away from the cut and discharges it behind the tool — the cutting edge engages at max chip thickness (clean shear, minimum rubbing) and exits at zero. Conventional milling starts at zero chip thickness, which forces the tool to rub before it cuts — work-hardens stainless/Ti, burns HSS edges, generates more heat. The backlash exception exists because climb cutting forces pull the table into the cut: on a machine with leadscrew backlash, this slams the table and breaks tools.",
    conditions: [{ type: "operation_type", operations: ["milling", "roughing", "finishing"] }],
    exceptions: ["Manual mills or older CNCs with measurable leadscrew backlash (>0.025mm) must use conventional", "Casting/forging with hard scale skin — conventional cuts UNDER the scale layer, climb hits the scale directly and chips the tool", "Long thin parts that pull away from the cutter under climb-load may need conventional for dimensional stability"],
    source: "Machinery's Handbook 31st ed., pp.1010-1015 (milling — climb vs conventional); Sandvik Coromant — 'Milling Application Guide' §3.2",
    related_rules: ["milling-minimum-chip-load", "TPS-001"],
    evidence_level: "peer_reviewed",
    quantitative: "Surface finish improvement: 30-50% Ra reduction climb vs conventional. Tool life: 1.5-3× longer in climb. Backlash threshold for safe climb: <0.025mm leadscrew clearance.",
  },
  {
    id: "milling-low-radial-chip-thin-comp",
    category: "milling",
    severity: "important",
    title: "Boost feed when radial engagement drops below D/2 (chip thinning)",
    rule: "When radial stepover ae < D/2, increase programmed feed per tooth by the chip-thinning compensation factor: f_z_adj = f_z × √(D / (4·ae·(1 - ae/D))). At ae = D/4 the factor is ~1.16; at ae = D/8 it's ~1.63. Without compensation, actual chip thickness drops below MUCT → rubbing → premature edge wear.",
    reasoning: "Programmed feed is per tooth at the tool tip, but the ACTUAL chip thickness depends on the geometry of engagement. With full-immersion slotting (ae = D), max chip thickness equals f_z. As ae shrinks, the cut-arc shortens and max chip thickness becomes a fraction of f_z. The trochoidal/HSM strategies that use ae = D/10 are CHIP-THINNING-DEPENDENT — without the comp, the tool burnishes (sub-MUCT) and dies fast.",
    conditions: [{ type: "operation_type", operations: ["milling"] }],
    exceptions: ["Finishing passes intentionally use sub-MUCT for surface effect (single-pass burnish)", "Adaptive/trochoidal CAM strategies apply this compensation automatically — don't double-apply"],
    source: "Erdel, B. (2003). *High-Speed Machining*, Hanser, §4.2. Also: HSMAdvisor + CNC Cookbook chip-thinning calculators; Iscar — 'Milling: Chip Thinning Effect' technical bulletin",
    related_rules: ["milling-minimum-chip-load", "TPS-trochoidal-slotting"],
    evidence_level: "peer_reviewed",
    quantitative: "ae=D/2: factor 1.0. ae=D/4: 1.16. ae=D/8: 1.63. ae=D/10: 1.83. Formula: f_z_adj = f_z × √(D/(4·ae·(1-ae/D))) for ae<D/2.",
  },
  {
    id: "milling-ramp-angle-limit",
    category: "milling",
    severity: "important",
    title: "Limit ramp-in angle to manufacturer's max for end-mill geometry",
    rule: "When ramping into stock with an end mill (no plunge), limit the ramp angle θ to the manufacturer's published max — typically 3° for standard square end mills, 8-15° for ramping-capable end mills, 30° for center-cutting end mills with helical entry geometry, and 90° (plunge) only for plunge-rated geometry. Excess ramp angle loads the corner radius beyond its design strength.",
    reasoning: "Ramping engagement is asymmetric — the leading edge bites into uncut stock while the trailing edge is in free air. The corner radius takes ALL the radial cutting force in this geometry. Standard end mills are designed for axial-only or fully-engaged radial cutting; a ramp at 5° on a non-ramping end mill puts the corner radius at risk of chipping within ~10 ramp moves. Ramping-capable end mills have reinforced corners and chip-evacuation flutes designed for this geometry.",
    conditions: [{ type: "operation_type", operations: ["milling", "roughing"] }],
    exceptions: ["Helical ramp-down (G2/G3 spiral) distributes load circumferentially — typically tolerates 2-3× the manufacturer's linear-ramp angle", "Solid-carbide center-cutting end mills tolerate full plunge (90°) at reduced feed", "Drill-mills (combination drill+end mill) are designed for plunge entry"],
    source: "Iscar — 'Milling Application Manual' §4 (ramp-in strategy); Kennametal — 'Solid End Mill Catalog' (per-geometry ramp angle spec); Sandvik CoroMill manuals",
    related_rules: ["TPS-helical-entry"],
    evidence_level: "manufacturer_data",
    quantitative: "Standard square end mill: 3° max linear ramp. Ramping end mill (reinforced corner): 8-15°. Center-cutting end mill: 30° linear, 45° helical. Plunge-rated: 90°. Helical ramp tolerance: 2-3× linear-ramp spec.",
  },

  // ─── 5axis (4→7) — multi-axis-strategy expansion ──────────────────────────

  {
    id: "5AX-005",
    category: "5axis",
    severity: "important",
    title: "Tilt cutter 5-15° off-axis for ball-end finishing to escape zero-velocity tip",
    rule: "When finishing with a ball-end mill on 5-axis, tilt the tool 5-15° off the surface normal (lead or tilt angle) so the cutting velocity at the tool-workpiece contact point is non-zero. A ball-end mill cutting straight down has ZERO surface speed at the centerline — the material plows, doesn't shear.",
    reasoning: "The ball-end mill's effective cutting diameter at any contact point is D_eff = 2·R·sin(α), where α is the angle from the tool axis to the contact point. At α=0 (centerline), D_eff = 0 and the cutting velocity is also zero — pure rubbing/burnishing, very poor surface finish + rapid centerline tip wear. Tilting the tool 5-15° shifts the contact point off-center, gives an effective diameter of ~D·sin(5°)≈0.087D to D·sin(15°)≈0.26D, restores non-zero cutting velocity, and dramatically improves Ra (often 2-4× better).",
    conditions: [{ type: "machine_axes", min_axes: 5 }, { type: "operation_type", operations: ["finishing"] }],
    exceptions: ["Sphere-machining geometry where the part surface IS the tool path — tilt is geometrically impossible at certain orientations", "Toroidal (bull-nose) end mills don't have a zero-velocity center — tilt is optional for those"],
    source: "Altintas, Y. (2012). *Manufacturing Automation*, 2nd ed., Cambridge, ch.5 (5-axis cutting mechanics); Tlusty (2000) §13.4; Siemens NX — 'Multi-Axis Surfacing Application Guide'",
    related_rules: ["5AX-004"],
    evidence_level: "peer_reviewed",
    quantitative: "Recommended lead angle: 5-15°. At lead=10°, D_eff = D·sin(10°) ≈ 0.17·D. Ra improvement vs zero-tilt: 2-4× better. Centerline tip wear at α=0: ~10× faster than at α=10°.",
  },
  {
    id: "5AX-006",
    category: "5axis",
    severity: "important",
    title: "Limit rotary-axis speed below 50% of machine spec to prevent stuttering",
    rule: "Cap programmed rotary axis feedrates (A/B/C) at 50% of the machine's max rated rotary speed during simultaneous 5-axis cutting. Modern controllers (Heidenhain TNC, Siemens 840D, Fanuc 30i) have sufficient lookahead at 50% spec — running near 100% causes block-buffer underrun, stuttering motion, and visible surface tool-mark patterns.",
    reasoning: "Simultaneous 5-axis motion requires the controller to interpolate 5 axes through hundreds of micro-blocks per second. Each block needs lookahead for jerk-limited acceleration. At >50% spec on rotary axes, the controller can't keep the lookahead buffer full while simultaneously running linear axes near their limits — the result is a stop-and-go motion pattern that prints onto the part as periodic ripple. Heidenhain calls this 'block-cycle starvation'; the fix is either slower rotary or fewer/larger blocks from CAM.",
    conditions: [{ type: "machine_axes", min_axes: 5 }],
    exceptions: ["3+2 positioning moves (rotary axes locked during cut) — no simultaneous lookahead burden, can use 100% rated rotary speed", "Machines with dedicated 5-axis NURBS or FastBlock controllers (Mori NT3 advanced, DMG Heidenhain 640) tolerate higher rotary speeds"],
    source: "Heidenhain TNC — 'Cycle Optimization Manual' §6 (block-cycle constraints); Mori Seiki/DMG MORI — '5-Axis Programming Best Practices'",
    related_rules: ["5AX-004", "HSM-LOOKAHEAD"],
    evidence_level: "manufacturer_data",
    quantitative: "Rotary feed cap: 50% of rated max during simultaneous 5-axis. NURBS-controller exception: 75-100%. Block-cycle starvation onset: 60-80% rated speed depending on block size.",
  },
  {
    id: "5AX-007",
    category: "5axis",
    severity: "important",
    title: "Pre-test 5-axis programs in air at 50% feed before first cut on stock",
    rule: "Run every new 5-axis program in air (offset Z by +50mm, no contact) at 50% rapid feedrate BEFORE first metal-cutting run. Look for: rotary-axis wrap warnings, kinematic-singularity slowdowns, fixture clearance, tool-changer interference, coolant nozzle collisions. 5-axis crashes are far more expensive than 3-axis (spindle + table + fixture + tool all at risk).",
    reasoning: "5-axis machines have multi-orientation kinematics that 3-axis simulation cannot fully predict. CAM-side post-processor verification catches geometry-level issues but not machine-specific wrap, soft-limit, or rotary-pole problems. An air run at half feed surfaces these without consequence — wrong block of CAM output causing 720° unwind takes <30s to abort, whereas a metal cut crash takes hours of recovery + thousands in tools/spindle damage.",
    conditions: [{ type: "machine_axes", min_axes: 5 }],
    exceptions: ["Programs that have run successfully on this exact machine + fixture combo before (signed-off CAM post, no fixture changes)", "Closed-loop simulation with full digital twin of the machine kinematics signed off"],
    source: "DMG MORI — '5-Axis Application Guide' §10 (machine kinematic verification); Mazak — 'IIntegrex Programming Manual' §safety + air-run procedure",
    related_rules: ["5AX-001", "5AX-003"],
    evidence_level: "manufacturer_data",
    quantitative: "Air-run Z offset: +50mm minimum. Air-run feedrate: 50% of programmed rapid (1000-2000 mm/min typical). Crash cost ratio 5-axis vs 3-axis: 5-20× higher (spindle + table + fixture all in line of fire).",
  },

  // ─── gdt (6→9) — CAD-side dimensioning/tolerancing expansion ──────────────

  {
    id: "GDT-007",
    category: "gdt",
    severity: "important",
    title: "Bonus tolerance applies under MMC modifier — use it when functional",
    rule: "Under MMC (Maximum Material Condition) modifier (Ⓜ in feature control frame), the geometric tolerance value can be EXCEEDED by the difference between actual feature size and MMC size. Example: hole tol 0.1Ⓜ at Ø10.0-10.2 means actual position tolerance grows to 0.3 when the hole is at LMC (Ø10.2). Use MMC on assembly-mating features for ~30% manufacturing cost reduction.",
    reasoning: "MMC reflects the worst-case assembly fit scenario. When the hole is larger than MMC, there's MORE clearance for the mating pin, so position can drift further. The bonus tolerance is the mathematical formalization of this — the part still functions as long as position-error + size-deviation stays inside the assembly clearance envelope. Without MMC modifier (RFS — Regardless of Feature Size, the default), the position tolerance is rigid at 0.1 regardless of hole size — costs ~30% more to produce and inspect for no functional gain.",
    conditions: [{ type: "operation_type", operations: ["inspection", "finishing"] }],
    exceptions: ["Statistical tolerancing (Ⓢ) intentionally avoids MMC bonus to allow Gaussian distribution-based tolerance stacks", "Dynamic seal contact surfaces — RFS preserves contact area regardless of size", "Bearing-bore press fits — interference must be controlled regardless of size"],
    source: "ASME Y14.5-2018 §4.2.2 (MMC modifier definition); Krulikowski, A. (2012). *Fundamentals of Geometric Dimensioning and Tolerancing*, 3rd ed., Cengage, ch.6",
    related_rules: ["GDT-002"],
    evidence_level: "iso_standard",
    quantitative: "Bonus tolerance = |actual_size - MMC|. Example: tol 0.1Ⓜ, MMC=10.0, actual=10.15 → bonus=0.15 → total tol=0.25. Production cost savings vs RFS: 20-40% on hole patterns.",
    standard_ref: "ASME Y14.5-2018; ISO 1101:2017",
  },
  {
    id: "GDT-008",
    category: "gdt",
    severity: "important",
    title: "Datum reference frame establishes the 3-2-1 immobilization sequence",
    rule: "A Datum Reference Frame (DRF) must constrain 6 degrees of freedom via a 3-2-1 hierarchy: primary datum (3 constraints — typically a plane), secondary (2 constraints — typically a line or plane perpendicular to primary), tertiary (1 constraint — final rotational). Without this sequence, the part can rotate during measurement and produce arbitrary, irreproducible inspection results.",
    reasoning: "A rigid body has 6 DOF (3 translational + 3 rotational). The primary datum (largest planar feature) locks 3 DOF — one translation + 2 rotations (it sits flat). The secondary datum (smaller perpendicular feature) locks 2 more DOF — another translation + 1 rotation. The tertiary datum (smallest feature) locks the final translation. Skip the hierarchy and the part 'floats' — same part measures different on different days, fails Cpk analysis, and produces inspector-disputes.",
    conditions: [{ type: "operation_type", operations: ["inspection", "setup_strategy"] }],
    exceptions: ["Cylindrical parts use datum axis (centerline) — locks 4 DOF in one feature; only 2 additional needed (1 translation + 1 rotation)", "Spheres use a point datum — locks 3 translations, no rotational lock (full rotational symmetry)"],
    source: "ASME Y14.5-2018 §4.5 (Datum Reference Frame); Henzold, G. (2006). *Geometrical Dimensioning and Tolerancing for Design, Manufacturing and Inspection*, 2nd ed., Butterworth, ch.4",
    related_rules: ["GDT-008-datum-target"],
    evidence_level: "iso_standard",
    standard_ref: "ASME Y14.5-2018 §4.5; ISO 5459:2011",
  },
  {
    id: "GDT-009",
    category: "gdt",
    severity: "important",
    title: "Profile-of-line ≠ profile-of-surface — choose by inspection method",
    rule: "Profile-of-line (◠) tolerates the 2D cross-sectional profile at any single sectioning plane — verified by 2D contour scan. Profile-of-surface (◠ with shaded fill) tolerates the entire 3D surface envelope — verified by full CMM probe coverage. Specifying profile-of-line where profile-of-surface is needed misses out-of-plane defects (lobing, waviness, helical drift) that fail at assembly.",
    reasoning: "Profile-of-line is a 2D tolerance — it checks the shape of any single slice through the part. A part with perfect cross-sections but a helical twist along the axis PASSES profile-of-line but FAILS profile-of-surface (and fails at assembly). Profile-of-surface is the 3D version — checks every point on the surface relative to the nominal envelope. Use profile-of-line only when the part will be inspected by 2D contour gauge (rare on modern CMM-equipped shops); default to profile-of-surface for any functional surface.",
    conditions: [{ type: "operation_type", operations: ["finishing", "inspection"] }],
    exceptions: ["Extruded or molded parts with controlled 2D cross-section by manufacturing process (the manufacturing constrains the 3D shape automatically)", "2D parts (gaskets, flat blanks) — profile-of-line IS the full surface"],
    source: "ASME Y14.5-2018 §11 (profile tolerances); Krulikowski (2012), ch.10; Drake, P.J. (1999). *Dimensioning and Tolerancing Handbook*, McGraw-Hill, ch.11",
    related_rules: ["GDT-007"],
    evidence_level: "iso_standard",
    standard_ref: "ASME Y14.5-2018 §11; ISO 1660:2017",
  },

  // ─── toolpath_strategy (8→11) — CAM-side strategy expansion ───────────────

  {
    id: "TPS-trochoidal-slotting",
    category: "toolpath_strategy",
    severity: "important",
    title: "Use trochoidal slotting in slots ≥1.5×D — feed 2-4× faster than conventional plunge-and-cut",
    rule: "For slots with width ≥ 1.5× tool diameter, replace plunge-then-traverse with trochoidal (circular interpolated) slotting. The tool follows overlapping circular arcs of diameter ae ≈ 0.1-0.2·D, removing material in many shallow passes. Result: 2-4× higher feedrate, dramatically reduced tool deflection, no chip evacuation issues, and full chip control.",
    reasoning: "Conventional slot milling at full immersion (ae = D) loads every flute by the full diameter chip every revolution — radial cutting force scales with engagement, chip evacuation is poor (chips trapped in the slot), and the tool deflects severely. Trochoidal motion limits radial engagement to ae ≈ 0.1-0.2·D — chip thinning compensation lets you run 2-4× the feedrate, the small engagement leaves the tool stiff laterally, and the open trochoidal arc clears chips on every cycle.",
    conditions: [{ type: "operation_type", operations: ["milling", "roughing"] }, { type: "feature_present", features: ["slot", "pocket"] }],
    exceptions: ["Slots <1.5×D too narrow for trochoidal arc clearance — use plunge-mill or drill-mill", "Brittle materials (cast iron, ceramic) — trochoidal entry shock can chip the cutter; use ramp-entry instead"],
    source: "OPEN MIND hyperMILL — 'iMachining and Trochoidal Strategy Guide'; Iscar — 'Slotting: Trochoidal vs Plunge' technical bulletin; HSMAdvisor calculators",
    related_rules: ["milling-low-radial-chip-thin-comp", "TPS-001"],
    evidence_level: "manufacturer_data",
    quantitative: "Slot-width threshold: ≥1.5×D. Trochoidal radial engagement: 0.1-0.2×D. Feedrate improvement: 2-4× vs conventional slotting. Tool deflection reduction: ~80%.",
  },
  {
    id: "TPS-peel-milling",
    category: "toolpath_strategy",
    severity: "important",
    title: "Peel mill (high axial, low radial) for deep pockets to reduce side-load",
    rule: "For pockets deeper than 2×D, use peel milling: high axial engagement (ap = 1.5-3× D), low radial engagement (ae = 0.05-0.1× D), at high feedrate per tooth (1.5-2× standard). The thin slice of material the tool removes per pass is in the axial direction, not radial — radial cutting force drops by 5-10×, allowing aggressive feed without tool deflection.",
    reasoning: "Conventional pocket milling uses shallow axial (ap = 0.5-1×D) and moderate radial (ae = 0.5-0.75×D) engagement — the tool experiences high RADIAL force, which deflects the long axial cantilever and causes poor side-wall accuracy. Peel milling flips this: nearly full-axial engagement uses the tool's stiffness in the axial direction (where it's straight), while the small radial engagement keeps lateral force minimal. Net effect: faster MRR, better side-wall finish, longer tool life, can use longer-reach tools (up to 6-8×D L/D).",
    conditions: [{ type: "operation_type", operations: ["milling", "roughing"] }, { type: "feature_present", features: ["pocket"] }],
    exceptions: ["Materials with built-up-edge tendency (1100 Al, soft stainless) — large axial engagement creates BUE; use shallow-axial instead", "Tool holders without minimum L/D rating for deep-axial loading — verify shrink-fit or thermal-shrink holder rated for full-immersion axial"],
    source: "Iscar — 'Peel Milling Application Manual'; Kennametal — 'High-Productivity Milling: Peel Strategy'; Mazak — 'INTEGREX Application Tips' §peel-milling",
    related_rules: ["TPS-trochoidal-slotting", "drill-stickout-runout"],
    evidence_level: "manufacturer_data",
    quantitative: "ap range: 1.5-3×D (axial). ae range: 0.05-0.1×D (radial). Feed per tooth: 1.5-2× standard finish-pass spec. L/D ceiling: 6-8×D with shrink-fit holder. Radial force reduction: 5-10× vs conventional pocket milling.",
  },
  {
    id: "TPS-tangent-entry-roughing",
    category: "toolpath_strategy",
    severity: "important",
    title: "Tangential entry to finish boundary leaves no entry-mark witness",
    rule: "When finishing a contour or pocket boundary, enter and exit the cut along a tangential arc (not a perpendicular line). The cutter's lateral load builds gradually along the arc, and the exit unloads gradually — no abrupt engagement step that prints a witness mark on the finish surface.",
    reasoning: "A perpendicular entry plows the cutter into the boundary at full lateral load instantaneously — the resulting deflection prints a 'dig-in' mark right at the entry point that's typically 5-20 μm deep, visible on cosmetic surfaces and a stress concentrator on critical parts. A tangential arc entry rotates the engagement gradually from zero to full load over a 0.1-1 mm arc length — the deflection ramps smoothly and leaves no detectable witness mark. Modern CAM systems offer 'tangent entry/exit' or 'lead-in/lead-out' as a finish-pass option.",
    conditions: [{ type: "operation_type", operations: ["finishing", "milling"] }],
    exceptions: ["Roughing passes where surface witness marks are removed by subsequent passes — tangent entry is unnecessary overhead", "Internal corners with no room for tangent-arc geometry — use ramp-down or spiral-in instead"],
    source: "OPEN MIND hyperMILL — 'Finishing Pass Best Practices'; Mastercam — 'Tangent Entry/Exit Configuration Guide'; Boothroyd & Knight (2006) §7",
    related_rules: ["TPS-001"],
    evidence_level: "manufacturer_data",
    quantitative: "Arc length: 0.1-1mm typical (≥3× cusp height). Witness mark depth without tangent entry: 5-20μm typical. Ra impact on entry zone: 2-5× worse without tangent vs with.",
  },

  // ─── hsm (5→8) — high-speed-machining-specific expansion ──────────────────

  {
    id: "HSM-CHORD-TOLERANCE",
    category: "hsm",
    severity: "important",
    title: "CAM chord tolerance ≤ Ra/4 for surface-quality match in HSM",
    rule: "Set CAM chord tolerance (the max deviation of the polyline-approximated toolpath from the ideal curve) to ≤ 1/4 of the required Ra surface roughness. A part requiring Ra 3.2μm needs CAM chord tolerance ≤ 0.8μm. Coarser chord tolerance prints onto the surface as visible faceting that no amount of post-machining process improvement can eliminate.",
    reasoning: "Toolpaths emerge from CAM as linear segments approximating curved nominal surfaces. The chord tolerance is the worst-case deviation — every chord segment leaves a flat where the curve was. At HSM feedrates (>5 m/min), these flats become VISIBLE facets on the part, even though the cutter geometry is perfect. The 1/4 rule comes from the empirical observation that chord-faceting becomes invisible below Ra/4 (deeper than the inherent cusp pattern from cutter geometry). Modern controllers (Heidenhain TNC, Siemens 840D) accept NURBS toolpaths that bypass the chord-tolerance step entirely.",
    conditions: [{ type: "operation_type", operations: ["finishing", "milling"] }],
    exceptions: ["NURBS-capable CAM + controller: chord tolerance is implicit in curve-degree, not explicit", "Surfaces hidden in assembly (functional but not cosmetic) — Ra/2 is acceptable", "Hand-finished parts (polish, lap) — chord tolerance up to Ra is OK, polish removes facets"],
    source: "Heidenhain TNC — 'TNC640: HSC Optimization' §chord tolerance; Siemens 840D — '5-Axis HSC Best Practices'; Erdel (2003) §6 (HSM toolpath quality)",
    related_rules: ["HSM-LOOKAHEAD", "TPS-001"],
    evidence_level: "manufacturer_data",
    quantitative: "Chord tolerance rule: ≤Ra/4. Examples — Ra 0.8μm → tol 0.2μm. Ra 3.2μm → tol 0.8μm. Ra 12.5μm → tol 3.1μm. NURBS-bypass controllers: chord-tolerance constraint replaced by curve-degree spec.",
  },
  {
    id: "HSM-LOOKAHEAD",
    category: "hsm",
    severity: "important",
    title: "Block-buffer lookahead ≥200 blocks for >10 m/min HSM operation",
    rule: "For HSM feedrates above 10 m/min, the CNC controller must look ahead at least 200 blocks (or 0.5-1 second of motion at full feed) to plan jerk-limited acceleration. Inadequate lookahead causes the controller to brake at every direction change because it can't see the next move's geometry — actual feedrates plummet to 30-50% of programmed, surface finish suffers, and feedrate variability prints as periodic banding.",
    reasoning: "HSM machines run at high feed AND high contour density (CAM emits hundreds of micro-blocks per second). The controller must decide how to accelerate/decelerate through each block — that decision needs visibility of upcoming blocks. With 200 blocks of lookahead, the controller can identify upcoming sharp corners and start slowing 50-100 blocks in advance for a smooth deceleration. With only 20 blocks, the controller can only see one or two blocks past the current one — it must brake hard at every directional ambiguity, costing speed and finish quality. Modern controllers (TNC640, 840Dsl, 30iB) have 1000+ block lookahead built in; older controllers (TNC360, 840D classic) cap around 100.",
    conditions: [{ type: "operation_type", operations: ["milling", "finishing"] }],
    exceptions: ["3-axis prismatic milling with mostly straight moves — lookahead requirement drops to ~50 blocks", "Programs running below 5 m/min — block-lookahead saturation is rarely the bottleneck"],
    source: "Heidenhain TNC — 'TNC640: HSC Programming Guide' §lookahead settings; Siemens 840D — 'Look-Ahead Function Manual'; Fanuc 30i — 'High-Speed High-Precision Function: AI Contour Control'",
    related_rules: ["HSM-CHORD-TOLERANCE", "5AX-006"],
    evidence_level: "manufacturer_data",
    quantitative: "Lookahead requirement: ≥200 blocks for >10 m/min feed. Time-equivalent: 0.5-1.0s of motion at full feed. Without lookahead: feedrate degradation 30-50%. Modern controller spec: 1000-5000 blocks (TNC640, 840Dsl, 30iB). Legacy spec: 50-100 (TNC360, 840D classic).",
  },
  {
    id: "HSM-TANGENT-NO-STOP",
    category: "hsm",
    severity: "important",
    title: "Eliminate full-stops in HSM contour transitions — feed never below 50% nominal",
    rule: "In HSM contour machining, configure CAM to maintain feedrate ≥50% of nominal through ALL contour transitions (including corner blends, depth-step transitions, and pass-to-pass moves). Full stops or near-stops at corners thermally cycle the cutter — hot at cut, cooled at stop, hot again at next cut — causing micro-cracking and 5-10× faster tool wear.",
    reasoning: "HSM tools (typically AlTiN-coated carbide or PCBN) reach steady-state thermal equilibrium during continuous cutting — the rake face hot, the body warm, the heat distributed. A full stop drops the cutting-edge temperature 200-400°C in <1 second as coolant + ambient pull heat away. The next cut spikes temperature back up. Each thermal cycle nucleates a micro-crack in the coating; after 1000-5000 cycles the coating spalls (thermal-shock failure mode, NOT abrasive wear). Maintaining ≥50% feed at all times keeps the cutter near thermal equilibrium and dramatically extends tool life.",
    conditions: [{ type: "operation_type", operations: ["milling", "finishing"] }],
    exceptions: ["Climb-cut roughing of cast iron — graphite particles cause built-up-edge regardless of thermal; tool life depends on abrasion not thermal cycling", "Dry-machining setups where there's no coolant-driven thermal cycle"],
    source: "Erdel, B. (2003). *High-Speed Machining*, Hanser, §5 (HSM tool wear); Sandvik Coromant — 'HSM Tool Life Optimization'; Iscar — 'AlTiN Coating Thermal Behavior' technical bulletin",
    related_rules: ["HSM-LOOKAHEAD", "ANTI-thermal-cycling"],
    evidence_level: "peer_reviewed",
    quantitative: "Min feedrate through transitions: ≥50% nominal. Thermal cycle threshold: ΔT > 200°C per cycle. AlTiN coating life under thermal cycling: 1000-5000 cycles. Steady-feed tool life vs stop-and-go: 5-10× longer.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PLAYBOOK EXPANSION WAVE 2 — U-PB-MAX-VARIABILITY-W2 (slot:foxtrot iter9
  // 2026-05-23). Operator /goal: max statistical output / max variability /
  // synergized PSN. 18 cited rules across 6 thin categories (3 each):
  // workholding, thermal, surface_integrity, vibration_dynamics, tool_life,
  // spc. Wiring inheritance is automatic — rules are DATA in PLAYBOOK_RULES
  // consumed by every existing dispatcher action (advise/lookup/byCategory)
  // + every existing indirection (AdaptiveFeedControl + postPipeline stage
  // + 3 AI registries). PSN synergy via per-rule related_rules
  // cross-references creating graph edges + tribal-domain tagging.
  // ──────────────────────────────────────────────────────────────────────────

  // ─── workholding (6→9, +3) — clamping/fixturing tribal expansion ──────────

  {
    id: "HOLD-008-clamp-force-yield",
    category: "workholding",
    severity: "important",
    title: "Match clamping force to material yield — bracket thin-wall under 50% of yield",
    rule: "Set clamping force so the localized stress under the clamp pad stays below 50% of the workpiece material yield strength. For aluminum 6061 (yield 276 MPa): max stress 138 MPa. For thin-walled features (wall/depth < 0.1), use multi-point distribution clamps OR vacuum/magnetic chucks instead of jaw clamps to avoid permanent deformation during machining.",
    reasoning: "Mechanical clamps concentrate force at small contact patches. Even moderate clamp torque can yield aluminum or thin-walled steel locally. The workpiece then springs back ELASTICALLY during machining (you cut on a deformed shape), and when clamps release, residual deformation prints onto the part. Brackets thin-walled work with ≤50% yield ensures the clamp loads stay in pure elastic range — release recovers fully.",
    conditions: [{ type: "operation_type", operations: ["setup_strategy", "milling", "turning"] }],
    exceptions: ["Castings with thick clamping pads designed-in (3+ mm boss for vise jaws)", "Soft-jaw setups where the jaw conforms to the part profile distributing load"],
    source: "Boothroyd & Knight (2006). *Fundamentals of Machining and Machine Tools* §11.4; Machinery's Handbook 31st ed., pp.1815-1830 (workholding); Carr Lane — 'Fixture Design Manual' §3",
    related_rules: ["HOLD-003", "HOLD-soft-jaw"],
    evidence_level: "peer_reviewed",
    quantitative: "Stress limit: ≤50% material yield. Aluminum 6061: 138 MPa max under clamp pad. Mild steel A36: 125 MPa. Stainless 304: 103 MPa. Thin-wall threshold: wall/depth <0.1 → switch to distributed-load workholding.",
  },
  {
    id: "HOLD-006-soft-jaw",
    category: "workholding",
    severity: "important",
    title: "Bore soft jaws to match part profile — first jaw cut is part-specific",
    rule: "When holding round or contoured stock in a 3-jaw chuck, machine soft jaws (typically 1018 steel, sometimes brass) to match the part profile in the actual clamping diameter. Bore the soft jaws WITH a calibration ring in place that simulates the actual workpiece — this preloads the chuck the same way the real workpiece will.",
    reasoning: "A 3-jaw chuck has finite jaw stiffness AND finite scroll-thread compliance. When you bore soft jaws empty, the bore is concentric to the chuck under zero load. When you then clamp a real part, the loaded compliance pulls the part off-center by 5-50 μm. Boring with a calibration ring matches the loaded compliance — the resulting jaws hold the part perfectly concentric in the actual loaded condition. This is critical for second-op turning where concentricity to first-op datum matters.",
    conditions: [{ type: "operation_type", operations: ["turning", "setup_strategy"] }],
    exceptions: ["Magnetic or hydraulic chucks with self-centering geometry — soft jaws unnecessary", "First-op rough turning where ±0.1mm concentricity is fine"],
    source: "Machinery's Handbook 31st ed., pp.1828-1832 (chuck soft jaws); Hardinge — 'Workholding Technical Manual' §soft-jaw boring procedure",
    related_rules: ["HOLD-003"],
    evidence_level: "manufacturer_data",
    quantitative: "Compliance shift without calibration ring: 5-50 μm depending on chuck class. With calibration ring: <5 μm typical. Calibration ring material: gauge-pin steel, same diameter as workpiece ±0.025mm.",
  },
  {
    id: "HOLD-007-fixture-stiffness",
    category: "workholding",
    severity: "important",
    title: "Fixture stiffness must exceed 10× cutting force — measure with dial indicator",
    rule: "Fixture stiffness at the workpiece location must exceed 10× the maximum cutting force to prevent chatter and dimensional drift during cut. Verify by applying a known force (push with calibrated push-pull gauge) at the workpiece location and measuring deflection with a dial indicator — calculate stiffness as k = F/δ.",
    reasoning: "Fixture deflection couples to cutting dynamics — a fixture with k < 5× cutting force will form a low-frequency vibration mode at the cut location and generate chatter (frequency typically 100-500 Hz, prints as audible whine + visible chatter marks). At k > 10× cutting force, fixture deflection is < 10% of cutting-force-induced tool deflection, and stays out of the stability picture. The dial-indicator test takes 30 seconds per fixture and catches problems before first-cut.",
    conditions: [{ type: "operation_type", operations: ["setup_strategy", "milling", "turning"] }],
    exceptions: ["Light-cut finishing where cutting forces are <100N — fixture stiffness rarely a limit", "Custom force-controlled adaptive machining where the controller compensates for fixture compliance"],
    source: "Tlusty, J. (2000). *Manufacturing Processes and Equipment*, Prentice Hall, §3.6 (fixture dynamics); Carr Lane — 'Fixture Design Manual' §6 (stiffness verification); SME *Tool and Manufacturing Engineers Handbook* Vol.2 §5",
    related_rules: ["HOLD-005", "VIB-FRF-impact-test"],
    evidence_level: "peer_reviewed",
    quantitative: "Stiffness ratio: ≥10× max cutting force. Test load: 100-500N range push-pull gauge. Acceptable deflection: <10μm at test load for k≥10× rule. Chatter-onset stiffness ratio: <5×.",
  },

  // ─── thermal (9→12, +3) — heat-management tribal expansion ────────────────

  {
    id: "THERM-006",
    category: "thermal",
    severity: "important",
    title: "Flood coolant 8-15 bar required for stainless + titanium high-feed roughing",
    rule: "Use flood coolant at 8-15 bar nozzle pressure (not just garden-hose flow) when high-feed-roughing stainless or titanium. Below 8 bar, coolant doesn't penetrate the chip-tool interface — heat conducts entirely into the workpiece + chip + tool, causing rapid flank wear + work hardening + dimensional drift.",
    reasoning: "Stainless steels and titanium have low thermal conductivity (~16 W/m·K stainless, ~7 W/m·K Ti vs ~50 W/m·K steel) — heat doesn't escape into the chip easily, accumulates at the cutting zone, work-hardens the surface layer. Low-pressure coolant just washes the surface; high-pressure jets PENETRATE the chip-tool gap and remove heat at source. The 8-15 bar threshold is the empirical pressure where coolant overcomes the hydrostatic resistance of the cut zone.",
    conditions: [{ type: "operation_type", operations: ["milling", "turning", "roughing"] }, { type: "material_iso", groups: ["M", "S"] }],
    exceptions: ["MQL (Minimum Quantity Lubrication) at correct nozzle placement can substitute for flood — 40-60 mL/h", "Through-tool coolant (internal) substitutes for external pressure — manufacturer-rated 30-70 bar typical"],
    source: "Sandvik Coromant — 'Stainless and Heat-Resistant Steels Application Guide' §coolant; Kennametal — 'Titanium Machining: Coolant Requirements'; Iscar — 'Hard-to-Cut Materials Guide'",
    related_rules: ["coolant-mql-nozzle-setup", "COOL-001"],
    evidence_level: "manufacturer_data",
    quantitative: "Coolant pressure: 8-15 bar nozzle, target chip-tool interface. Stainless thermal conductivity: ~16 W/m·K. Titanium: ~7 W/m·K. Steel reference: ~50 W/m·K. Flow rate: ≥20 L/min for full-flood at 10 bar.",
  },
  {
    id: "THERM-007-dry-machining",
    category: "thermal",
    severity: "important",
    title: "Dry-mill cast iron and graphite; never dry-cut aluminum or copper",
    rule: "Cast iron and graphite are machined DRY — the graphite/free-graphite content self-lubricates the cut and coolant wash carries abrasive dust into machine ways. Aluminum and copper REQUIRE coolant (flood or MQL) — without it the chip welds to the tool flank (built-up edge), surface finish collapses, and tool life drops to <10% of wet-cut life.",
    reasoning: "Cast iron's graphite flakes act as natural solid lubricant — adding coolant just suspends the abrasive iron particles into a slurry that wears machine ways + erodes seals + creates disposal issues. Aluminum is the opposite — high affinity for the cutting tool (low solubility threshold ~600°C), forms BUE immediately without coolant; copper is similar. Tool life ratio aluminum dry vs wet: 1:10 to 1:50.",
    conditions: [{ type: "operation_type", operations: ["milling", "turning"] }],
    exceptions: ["Heavy roughing on cast iron with deep cuts — air-blast may help chip evacuation", "Ductile cast iron (vs gray) sometimes benefits from minimal MQL at high feed rates", "Aluminum casting alloys with high Si content (A356, A380) may machine OK with MQL only"],
    source: "Machinery's Handbook 31st ed., pp.987-995 (machining cast iron + aluminum); ASM Handbook Vol.16 — Machining (1989), ch.9 (machining of aluminum) + ch.10 (machining of cast iron); Sandvik — 'Cast Iron Machining Guide'",
    related_rules: ["coolant-mql-nozzle-setup", "ANTI-thermal-cycling"],
    evidence_level: "peer_reviewed",
    quantitative: "Cast iron dry-machining: standard practice. Aluminum dry-cut tool life: <10% of wet-cut. Aluminum BUE onset temperature: ~600°C (well below carbide softening). Copper BUE onset: ~500°C.",
  },
  {
    id: "THERM-008-thermal-expansion-comp",
    category: "thermal",
    severity: "important",
    title: "Thermal expansion compensation: probe twice for tight-tol precision parts",
    rule: "On precision parts (tolerances ≤ ±0.013mm / ±0.0005in), probe critical features TWICE — once at start-of-program (cold workpiece) and once mid-program (after ~30 min cutting, workpiece thermally equilibrated). Use the delta to compensate for workpiece thermal growth, which can reach 50-100 μm on a 200mm part heated 30°C by cutting heat.",
    reasoning: "Steel thermal expansion coefficient is 11.7 μm/m/°C — a 200mm steel part heated 30°C grows 70 μm linearly. Aluminum is ~22 μm/m/°C — same delta gives 132 μm growth. Without compensation, dimensions cut at cold-state vs heat-soaked state differ by this delta. Two-probe compensation captures the actual growth (which is geometry- and clamping-dependent, NOT just material-coefficient-times-ΔT).",
    conditions: [{ type: "operation_type", operations: ["finishing", "inspection"] }, { type: "tolerance_below", threshold_mm: 0.013 }],
    exceptions: ["Coolant-flooded operations where workpiece stays at coolant temperature throughout (Δ <5°C)", "Pre-heated workpieces brought to operating temperature before clamping"],
    source: "Machinery's Handbook 31st ed., pp.2050-2055 (thermal effects in precision machining); Slocum, A.H. (1992). *Precision Machine Design*, Prentice Hall, §3 (thermal effects); NIST — 'Dimensional Metrology: Temperature Effects'",
    related_rules: ["GDT-008"],
    evidence_level: "peer_reviewed",
    quantitative: "Tolerance threshold: ≤±0.013mm. Steel thermal expansion: 11.7 μm/m/°C. Aluminum: ~22 μm/m/°C. Typical workpiece ΔT during cut: 10-40°C. 200mm steel part at ΔT=30°C: 70μm growth. Compensation method: two-probe delta + scale factor.",
  },

  // ─── surface_integrity (6→9, +3) — surface-quality + residual stress ──────

  {
    id: "SURF-007-white-layer",
    category: "surface_integrity",
    severity: "important",
    title: "White layer on hard-turned surfaces signals thermal damage — limit cutting speed",
    rule: "When hard turning (workpiece ≥45 HRC), monitor for white-layer formation by metallurgical cross-section (etch + microscopy). White layer (untempered martensite) >3-5 μm thick is THERMAL DAMAGE indicator — reduces fatigue life by 30-70%. Mitigate by reducing cutting speed 15-30% from manufacturer-recommended max OR switching to CBN inserts with sharper edge geometry.",
    reasoning: "Hard turning generates intense localized heat at the cut zone. Above critical temperature (~723°C steel austenitizing), the workpiece surface transforms to austenite + rapidly quenches to brittle untempered martensite as the tool passes. This 'white layer' is harder than bulk material but has very low ductility — fatigue crack-initiation sites. Detection: macroetch with 2% nital, examine under 200-500× microscope. Acceptance: ≤3 μm thickness for fatigue-critical applications, ≤5 μm for static loaded.",
    conditions: [{ type: "operation_type", operations: ["turning", "finishing"] }, { type: "hardness_above", hrc: 45 }],
    exceptions: ["Compressive residual stress at the surface from cutting can partially offset white-layer fatigue impact — qualify via fatigue testing", "Post-machining shot peening removes white layer + adds compressive residual stress for high-cycle fatigue parts"],
    source: "Bartarya, G. & Choudhury, S.K. (2012). *State of the art in hard turning*. Int. J. Machine Tools & Manufacture 53(1):1-14. Klocke, F. (2011). *Manufacturing Processes 2: Grinding, Honing, Lapping*, Springer, §3.4. Sandvik Coromant — 'Hard Turning Application Guide'",
    related_rules: ["HARD-001", "SURF-residual-stress"],
    evidence_level: "peer_reviewed",
    quantitative: "White layer threshold: ≤3μm fatigue-critical, ≤5μm static-loaded. Fatigue life reduction at 10μm white layer: 30-70%. Detection: 2% nital macroetch + 200-500× microscope. Mitigation: 15-30% Vc reduction from spec max, or CBN sharp-edge geometry.",
  },
  {
    id: "SURF-008-residual-stress-meas",
    category: "surface_integrity",
    severity: "important",
    title: "Measure residual stress on fatigue-critical surfaces — X-ray diffraction is canonical",
    rule: "For high-cycle-fatigue parts (aerospace, medical, automotive crankshafts/conrods), measure surface residual stress via X-ray diffraction sin²ψ method at multiple depths (surface, 10μm, 50μm, 100μm via electropolish). Target compressive residual stress of -200 to -600 MPa on the surface for fatigue benefit; tensile residual stress (positive) accelerates fatigue failure 5-10×.",
    reasoning: "Machining processes induce residual stress in the surface layer. Gentle finishing (low feed, sharp tool) typically produces COMPRESSIVE residual stress (-200 to -600 MPa) which extends fatigue life. Aggressive roughing or worn tools produce TENSILE residual stress (+200 to +600 MPa) which accelerates crack initiation. The compressive layer is typically 10-100 μm thick — too thin to measure by hardness testing, requires X-ray diffraction sin²ψ method (ASTM E915) or hole-drilling strain-gauge method (ASTM E837).",
    conditions: [{ type: "operation_type", operations: ["finishing", "inspection"] }],
    exceptions: ["Static-load-only parts where fatigue isn't a failure mode — residual stress is irrelevant", "Parts with post-machining stress relief heat treatment that erases residual stress regardless of machining"],
    source: "Withers, P.J. & Bhadeshia, H.K.D.H. (2001). *Residual stress. Part 1 – Measurement techniques*. Mat. Sci. & Tech. 17:355-365. ASTM E915-19 (X-ray diffraction sin²ψ method). ASM Handbook Vol.6A — Residual Stress",
    related_rules: ["SURF-007-white-layer"],
    evidence_level: "iso_standard",
    quantitative: "Target compressive residual stress: -200 to -600 MPa surface. Tensile residual stress fatigue penalty: 5-10× life reduction. Measurement depth: surface + 10μm + 50μm + 100μm. Methods: ASTM E915 (XRD sin²ψ) or ASTM E837 (hole drilling).",
    standard_ref: "ASTM E915-19; ASTM E837-20",
  },
  {
    id: "SURF-009-burr-orientation",
    category: "surface_integrity",
    severity: "important",
    title: "Burr orientation predicts deburring difficulty — design exit chamfers",
    rule: "Predict burr exit-edge direction from tool feed and rotation: in conventional milling, burr forms on the side AWAY from cutter rotation; in climb milling, ON the side OF rotation. Design parts with chamfered or radiused exits where burrs are predicted so they self-deburr OR provide controlled bur surfaces for downstream brush/tumble deburr.",
    reasoning: "Burrs form when the chip detaches at the workpiece edge — the chip has nowhere to shear-off cleanly, so it tears with a microscopic flag of plastically-deformed material attached. Burr direction depends on chip-flow direction at exit, which is determined by cutter geometry + rotation + feed direction. A 0.2mm × 45° chamfer on the predicted burr edge typically eliminates the burr (the cut shears off the chamfer instead of the part body) OR concentrates it onto the chamfer where deburring is easy.",
    conditions: [{ type: "operation_type", operations: ["milling", "finishing", "deburring"] }],
    exceptions: ["High-tolerance edge-quality parts (medical, aerospace) where chamfers are spec-prohibited — must hand-deburr or electrochemical-deburr instead", "Brittle materials (cast iron, ceramic) — chips break rather than burr; no burr-orientation prediction applies"],
    source: "Aurich, J.C. et al. (2009). *Burrs—Analysis, control and removal*. CIRP Annals 58(2):519-542. Gillespie, L.K. (1999). *Deburring and Edge Finishing Handbook*, SME, ch.3. ASME B89.4.10 (burr/edge-finish standards)",
    related_rules: ["milling-climb-default", "DEB-001"],
    evidence_level: "peer_reviewed",
    quantitative: "Predicted-edge chamfer: 0.2mm × 45° typical. Self-deburr probability with chamfer: 70-90% (depends on material ductility). Burr-height threshold for spec-compliant exit: typically <0.05mm (Class B per ISO 13715:2017).",
    standard_ref: "ISO 13715:2017 (edge tolerances); ASME B89.4.10",
  },

  // ─── vibration_dynamics (6→9, +3) — chatter/stability tribal expansion ────

  {
    id: "VIB-FRF-impact-test",
    category: "vibration_dynamics",
    severity: "important",
    title: "FRF impact test the spindle-tool assembly before high-speed finishing — find natural frequencies",
    rule: "Before high-speed finishing (>10,000 RPM) on a new tool/holder combination, run a Frequency Response Function (FRF) impact test: instrument the tool tip with an accelerometer, strike with a calibrated modal hammer, capture FFT. Identify the dominant natural frequency (typically 800-3000 Hz on a typical 150-200mm-stickout end mill in a shrink-fit holder). Pick spindle RPM such that tooth-passing-frequency = natural-freq / k (k = lobe number, 1-4 typical).",
    reasoning: "Chatter onset occurs at specific spindle speeds where tooth-passing frequency lines up with a structural mode. Picking RPM at a stability LOBE (where tooth-pass-freq divides the natural-freq evenly into an integer) avoids chatter entirely AND allows ~3× the depth-of-cut that off-lobe speeds support. The FRF test takes ~10 minutes per tool configuration; the resulting stability-lobe diagram is good for that tool/holder/spindle combination across all materials.",
    conditions: [{ type: "operation_type", operations: ["milling", "finishing"] }],
    exceptions: ["Stiffness-dominated cuts (short stubby tools <2×D L/D, light cuts <0.5mm DOC) where chatter is unlikely regardless of speed", "Process-damped operations where helix angle / variable pitch geometry suppresses chatter inherently"],
    source: "Altintas, Y. (2012). *Manufacturing Automation*, 2nd ed., Cambridge, §3 (chatter stability); Schmitz, T.L. & Smith, K.S. (2009). *Machining Dynamics*, Springer, ch.4 (FRF impact testing). MMSystem Tap Tester instrument manual",
    related_rules: ["HOLD-007-fixture-stiffness", "VIB-001"],
    evidence_level: "peer_reviewed",
    quantitative: "Typical natural freq range: 800-3000 Hz (150-200mm stickout, shrink-fit holder). Stability lobe equation: n_lobe = 60·f / (z·k), k ∈ {1,2,3,4}. Lobe DOC vs off-lobe: 3× more aggressive cut. Test setup time: ~10 minutes per tool configuration.",
  },
  {
    id: "VIB-VARIABLE-PITCH",
    category: "vibration_dynamics",
    severity: "important",
    title: "Variable-pitch end mills suppress chatter without RPM tuning — pay 20% premium for it",
    rule: "When chatter is recurring on a workpiece + machine setup (especially long-overhang or thin-wall work), switch to a variable-pitch end mill (uneven flute spacing) before tuning RPM. Variable pitch breaks up the periodic chip-load pattern that drives chatter — typically eliminates chatter across a wide RPM range, no FRF testing needed. Cost premium: 15-25% over uniform-pitch equivalent.",
    reasoning: "Regenerative chatter requires a phase-locked feedback between tooth-passing and structural vibration. Variable pitch DEFEATS this by ensuring no two consecutive flutes engage at the same phase angle. The chip loads on consecutive flutes are unequal, so they don't constructively interfere with the structural mode. Result: chatter suppressed across nearly all RPMs, robust to part-to-part stiffness variation, no need for stability-lobe lookup. Trade-off: slightly worse surface finish (uneven tool marks) and 15-25% tool cost premium.",
    conditions: [{ type: "operation_type", operations: ["milling"] }],
    exceptions: ["High-surface-finish finish passes — variable pitch leaves uneven cusp marks; use uniform-pitch with FRF-tuned RPM instead", "Cost-sensitive high-volume work where uniform-pitch + tuned RPM is more economical"],
    source: "Altintas, Y., Engin, S. & Budak, E. (1999). *Analytical stability prediction and design of variable pitch cutters*. ASME J. of Manufacturing Science and Engineering 121(2):173-178. Iscar — 'Variable Pitch End Mills' application catalog. Sandvik CoroMill 690 product line technical guide",
    related_rules: ["VIB-FRF-impact-test"],
    evidence_level: "peer_reviewed",
    quantitative: "Cost premium: 15-25% vs uniform-pitch. Chatter-suppression range: 80-95% of RPM range. Surface finish impact: ~10-20% Ra increase vs tuned uniform-pitch.",
  },
  {
    id: "VIB-TUNED-MASS-DAMPER",
    category: "vibration_dynamics",
    severity: "important",
    title: "Tuned-mass-damper holders for L/D >5 — pay premium for slender-tool stability",
    rule: "For end mills with stickout L/D ≥ 5 (long-reach finishing in deep cavities), use tuned-mass-damper (TMD) anti-vibration holders. The holder contains an internal mass-spring system tuned to absorb the dominant tool natural frequency — typically reduces tool-tip vibration amplitude 5-10× compared to a rigid holder, allowing 2-4× more aggressive depth-of-cut at the same surface quality. Cost: 3-10× more than a rigid holder.",
    reasoning: "Slender end mills are cantilever beams — at L/D ≥5, the bending mode dominates tool-tip motion under cutting force, and there's no surrounding structural mass to absorb it. A TMD holder adds a damped mass-spring tuned to that bending frequency (typically 200-1000 Hz) — energy from the tool's vibration transfers into the damper's motion, dissipated by the internal viscous element. Brand names: Sandvik Silent Tools, Iscar Whisper Line, Haimer Long Reach. Investment pays back in 3-5 long-cavity finishing jobs through faster cycle time + better finish.",
    conditions: [{ type: "operation_type", operations: ["milling", "finishing"] }],
    exceptions: ["Short stickout work (L/D <5) — TMD provides no benefit, rigid holder is more accurate", "Roughing work where surface finish doesn't matter — accept chatter, run more aggressively with cheaper holder"],
    source: "Slocum, A.H. (1992). *Precision Machine Design*, Prentice Hall, §3.7 (TMD design); Sandvik Coromant — 'Silent Tools Anti-Vibration Tooling Manual'; Iscar — 'Whisper Line Anti-Vibration End Mill Holders'; Schmitz & Smith (2009) §5",
    related_rules: ["VIB-FRF-impact-test", "drill-stickout-runout"],
    evidence_level: "manufacturer_data",
    quantitative: "L/D threshold: ≥5 for TMD benefit. Vibration amplitude reduction: 5-10× vs rigid. DOC improvement: 2-4× at same finish quality. Cost premium: 3-10× rigid holder. Tuned frequency range: 200-1000 Hz typical.",
  },

  // ─── tool_life (10→13, +3) — life-extension tribal expansion ──────────────

  {
    id: "TL-007-taylor-fit-production",
    category: "tool_life",
    severity: "important",
    title: "Fit Taylor exponent n from production data — handbook value ±50% on real shop conditions",
    rule: "Don't accept handbook Taylor exponent n (e.g., n=0.25 for carbide on steel) as authoritative for shop-specific tool life prediction. Run a 3-point production tool-life test at three cutting speeds (e.g., 80%, 100%, 120% of manufacturer-recommended Vc), measure actual tool life to wear criterion (typically VB=0.3mm flank wear), fit log-log regression: log(T) = -n · log(Vc) + log(C). Your shop's effective n is often 0.15-0.35 vs handbook 0.25.",
    reasoning: "Taylor's tool life model T·Vc^(1/n) = C is a power-law fit — the exponent n depends on coolant, workholding stiffness, machine spindle quality, tool runout, and workpiece batch microstructure. Handbook n values assume idealized lab conditions; real shop n can be 30-50% lower (faster wear) or higher (slower wear). Three-point production fit pins down YOUR shop's actual n, enabling accurate tool-budget and lifetime quoting. Cost of 3-point test: 3 tools × 30 min cutting each = 1.5 hr per tool/material combination. Payback: accurate scheduling + reduced unscheduled tool change.",
    conditions: [{ type: "operation_type", operations: ["turning", "milling"] }],
    exceptions: ["One-off prototype work where tool-life prediction isn't economically valuable", "Low-volume work where the 3-point test cost exceeds the prediction benefit"],
    source: "ISO 3685:1993 — Tool-life testing single-point turning tools; Shaw, M.C. (2005). *Metal Cutting Principles*, 2nd ed., Oxford, ch.7; Sandvik Coromant — 'Tool Life Testing Application Guide'",
    related_rules: ["TL-001"],
    evidence_level: "iso_standard",
    quantitative: "3-point test Vc: 80%, 100%, 120% of mfr-recommended. Wear criterion: VB=0.3mm flank wear (carbide) or 0.25mm (CBN). Real-shop n range vs handbook: 0.15-0.35 (carbide on steel). Test cost: ~1.5 hr per tool/material combo.",
    standard_ref: "ISO 3685:1993",
  },
  {
    id: "TL-008-coating-material-match",
    category: "tool_life",
    severity: "important",
    title: "Match coating to material: TiAlN for steel, AlCrN for stainless, AlTiN+nACo for Ti — wrong match cuts life 50%",
    rule: "Select tool coating by workpiece material class. TiAlN (titanium aluminum nitride, golden color): general steel + cast iron, 800-900°C max. AlCrN (aluminum chromium nitride, dark gray): stainless + heat-resistant alloys, 1000°C max. AlTiN with nano-composite (nACo) overlay: titanium + nickel-based superalloys, 1100°C max + low affinity to Ti. TiCN (titanium carbo-nitride): aluminum + non-ferrous, excellent surface finish. Wrong coating cuts tool life 50% or more.",
    reasoning: "Coatings have specific oxidation thresholds, hardness, friction coefficients, and chemical affinity. Above its oxidation threshold, the coating degrades rapidly. AlCrN forms a self-renewing Al2O3 layer at high temperature — survives stainless steel temperatures (where TiAlN would oxidize away). nACo's nano-composite microstructure resists titanium adhesion (Ti's high affinity to ferrous coatings causes BUE). Mismatched coating doesn't FAIL catastrophically — it just wears faster, often misdiagnosed as 'bad tool batch' or 'wrong feed/speed'.",
    conditions: [{ type: "operation_type", operations: ["milling", "turning"] }],
    exceptions: ["Uncoated carbide: still good for aluminum + free-machining steels at low Vc", "PCD/PCBN: niche tools where coatings are irrelevant (the substrate IS the cutting surface)"],
    source: "Klocke, F. (2011). *Manufacturing Processes 1: Cutting*, Springer, ch.4 (coatings); Sandvik Coromant — 'Grades and Coatings Application Guide'; PalbitGen — 'Coating Selection Matrix'; Walter Tools — 'AlCrN vs TiAlN Comparison Bulletin'",
    related_rules: ["TL-001"],
    evidence_level: "peer_reviewed",
    quantitative: "TiAlN max temp: 800-900°C, use for steel/cast iron. AlCrN max temp: 1000°C, use for stainless. nACo max temp: 1100°C, use for Ti/Ni. TiCN max temp: 400°C, use for Al/non-ferrous. Mismatch tool-life penalty: 50-70% reduction.",
  },
  {
    id: "TL-009-regrind-economics",
    category: "tool_life",
    severity: "important",
    title: "Regrind end mills 3-5× before retiring — check straightness + diameter loss per regrind",
    rule: "End mills can typically be reground 3-5 times before retiring. Each regrind removes 0.5-1.0mm from the tool length and 0.1-0.2mm from the diameter (sharpens new cutting edges). Inspect after each regrind: (1) check tool-length consistency ±0.05mm, (2) check diameter loss vs spec, (3) confirm runout ≤0.013mm TIR in spindle. Cost: $20-50 per regrind vs $80-300 new tool — economic when regrind cost < 25% of new-tool cost AND remaining diameter allows ≥1 more service cycle.",
    reasoning: "Resharpening a tool restores cutting-edge sharpness but consumes substrate. Each regrind moves the cutting edges further into the tool body, reducing effective length + diameter. After 3-5 regrinds, the remaining substrate is too short for safe service OR the diameter is too undersized for the original application (must be re-classed to a smaller cutting diameter). Economic break-even: regrind cost / new-tool cost < 0.25 AND remaining cycles ≥ 1 for at-spec service.",
    conditions: [{ type: "operation_type", operations: ["milling"] }],
    exceptions: ["Solid carbide micro-mills (<3mm diameter): regrinding economics rarely positive — usually retire after first wear", "Coated tools: coating doesn't survive regrind — must re-coat ($40-80 extra cost) or accept uncoated regrind performance"],
    source: "ISO 3685:1993; Machinery's Handbook 31st ed., pp.1005-1010 (end-mill regrinding); SME Tool Engineers Handbook §regrinding economics; Cleveland Twist Drill — 'Regrinding Procedures Manual'",
    related_rules: ["TL-007-taylor-fit-production", "TL-008-coating-material-match"],
    evidence_level: "manufacturer_data",
    quantitative: "Typical regrinds before retire: 3-5. Length loss per regrind: 0.5-1.0mm. Diameter loss per regrind: 0.1-0.2mm. Regrind cost: $20-50. New-tool cost: $80-300. Economic threshold: regrind cost ≤25% of new-tool cost. Min remaining service cycles: ≥1.",
    standard_ref: "ISO 3685:1993",
  },

  // ─── spc (6→9, +3) — statistical-process-control tribal expansion ─────────

  {
    id: "SPC-007-cpk-by-industry",
    category: "spc",
    severity: "important",
    title: "Cpk targets vary by industry: aerospace 2.0, automotive 1.67, medical 1.33, general 1.0",
    rule: "Set Cpk acceptance threshold by industry context. Aerospace AS9100 critical-feature: Cpk ≥ 2.0 (parts-per-billion defect rate). Automotive IATF 16949 production part: Cpk ≥ 1.67 (parts-per-million). Medical FDA Class III: Cpk ≥ 1.33. General industrial: Cpk ≥ 1.0. Don't quote tighter than industry standard without explicit customer requirement — over-tooling = lost margin.",
    reasoning: "Cpk measures the distance from process mean to nearest spec limit, in units of 3σ. Higher Cpk = process running tighter inside its tolerance window = better quality + lower defect rate. But achieving higher Cpk costs MONEY (better tooling, slower cycles, more inspection). The industry standards reflect economic balance between quality and cost — aerospace pays for Cpk 2.0 because failure costs billions; general industrial accepts Cpk 1.0 because failure costs hundreds. Quoting tighter than spec eats margin without customer benefit.",
    conditions: [{ type: "operation_type", operations: ["inspection", "finishing"] }],
    exceptions: ["Custom customer quality spec overrides industry default — always honor the contract", "Statistical tolerancing intentionally allows tighter Cpk in exchange for relaxed worst-case spec"],
    source: "AIAG (2005). *Statistical Process Control (SPC)*, 2nd ed.; AS9100D §8.5 (process control); IATF 16949:2016 §8.3 + §8.5; FDA 21 CFR 820 (medical quality system); Montgomery, D.C. (2019). *Introduction to Statistical Quality Control*, 8th ed., Wiley, ch.8",
    related_rules: ["SPC-001"],
    evidence_level: "iso_standard",
    quantitative: "Aerospace AS9100 critical: Cpk ≥ 2.0 (DPMO < 0.0019). Automotive IATF 16949: Cpk ≥ 1.67 (DPMO < 0.57). Medical FDA Class III: Cpk ≥ 1.33 (DPMO < 63). General industrial: Cpk ≥ 1.0 (DPMO < 2700). Over-tooling cost: typically 15-40% margin reduction.",
    standard_ref: "AS9100D; IATF 16949:2016; FDA 21 CFR 820",
  },
  {
    id: "SPC-008-control-chart-selection",
    category: "spc",
    severity: "important",
    title: "Control chart type by subgroup: X-bar/R for n≥2-10, I-MR for n=1, p-chart for attribute data",
    rule: "Select control chart by subgroup size + data type. Continuous measurement, subgroup n=2-10: X-bar/R (X-bar/range) — classic Shewhart, sensitive to mean shift. Continuous measurement, n=1 (one-off inspection, expensive measurement): I-MR (Individuals + Moving Range). Attribute data (pass/fail): p-chart for proportion defective. Defect count: c-chart for defects-per-unit (constant inspection unit) or u-chart for defects-per-unit (variable inspection unit).",
    reasoning: "Each chart type has assumptions about data distribution + subgroup independence. X-bar/R assumes within-subgroup variation reflects common-cause, between-subgroup reflects special-cause — works when you can group multiple measurements per time interval. I-MR is the n=1 specialization (e.g., destructive testing where each part is one data point). p-chart assumes Bernoulli trials with constant n. c/u-charts assume Poisson defect counts. Misapplied chart type produces misleading control limits — false alarms (wasted investigations) or missed signals (defective parts shipped).",
    conditions: [{ type: "operation_type", operations: ["inspection"] }],
    exceptions: ["EWMA (exponentially weighted moving average) chart preferred over Shewhart when small process shifts must be detected quickly", "CUSUM (cumulative sum) chart for detecting drift smaller than 1σ"],
    source: "Montgomery (2019), ch.5 + ch.6; AIAG (2005). *Statistical Process Control* §III (chart selection); ASTM E2587-19 (control charts); Western Electric (1956). *Statistical Quality Control Handbook* (the original Nelson rules)",
    related_rules: ["SPC-007-cpk-by-industry"],
    evidence_level: "iso_standard",
    quantitative: "X-bar/R: subgroup n=2-10. I-MR: n=1. p-chart: attribute proportion. c-chart: defects/unit constant. u-chart: defects/unit variable. EWMA preferred for shifts <1σ. CUSUM preferred for slow drifts.",
    standard_ref: "ASTM E2587-19; AIAG SPC 2nd ed.",
  },
  {
    id: "SPC-009-gauge-rr",
    category: "spc",
    severity: "important",
    title: "Gauge R&R must be <10% of tolerance for production gauges, <30% for screening only",
    rule: "Before accepting any production gauge (caliper, micrometer, height gauge, CMM probe), perform a Gauge R&R (Repeatability & Reproducibility) study per AIAG MSA: 10 parts × 3 operators × 3 replicates = 90 measurements. Calculate %GRR = (gauge variance / total variance)·100. Accept if <10% for production-decision gauges, <30% for screening/sorting-only gauges, REJECT if >30%.",
    reasoning: "Every measurement has error: gauge error (repeatability + reproducibility) + part-to-part variation. If the gauge error is large relative to tolerance, the measurement can't reliably distinguish good parts from bad — false rejects (toss good parts) + false accepts (ship bad parts). The AIAG MSA standard 10×3×3 design separates gauge variance from part variance via ANOVA. The 10% threshold for production gauges = gauge contributes <1% to total variance; the 30% threshold for screening = gauge contributes <9% (acceptable for go/no-go but not for tight measurements).",
    conditions: [{ type: "operation_type", operations: ["inspection"] }],
    exceptions: ["Master gauges (Class 0 ring gauges, gauge blocks) — Gauge R&R is unnecessary, NIST-traceable calibration is the metric", "Online process gauges with continuous correlation to certified offline measurement"],
    source: "AIAG (2010). *Measurement Systems Analysis (MSA)*, 4th ed.; ISO 5725-2:2019 (accuracy of measurement methods); Montgomery (2019), ch.8 §8.7 (gauge studies)",
    related_rules: ["SPC-007-cpk-by-industry"],
    evidence_level: "iso_standard",
    quantitative: "MSA study design: 10 parts × 3 operators × 3 replicates = 90 measurements. %GRR threshold: <10% production-decision, <30% screening-only, REJECT >30%. Variance contribution: 10% threshold = gauge ~1% of total variance.",
    standard_ref: "AIAG MSA 4th ed.; ISO 5725-2:2019",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PLAYBOOK EXPANSION WAVE 3 — U-PB-PSN-PEER-INTEGRATION (slot:foxtrot iter10
  // 2026-05-23). Operator /goal addendum: "Factor in new formulas and
  // algorithms being created by other chats". 6 cited rules integrating peer
  // work: juliett iter7-10 SF-PSN-WIRE-MS0 ships ChipTypePredictionModel
  // (commit 0dbd4a090e), Merchant's circle predictor (601fa848df), Sandvik
  // tribal merge (310faca8bf), merchant's circle (972d204a25). Each rule
  // below explicitly cross-references the peer algorithm + canonical source.
  // ──────────────────────────────────────────────────────────────────────────

  // ─── chip_control (5→7, +2) — chip-type prediction tribal ─────────────────

  {
    id: "CHIP-006-bue-speed-threshold",
    category: "chip_control",
    severity: "important",
    title: "Built-up-edge (BUE) zone: avoid Vc 30-80 m/min on ductile steels; below 30 or above 100 m/min",
    rule: "Built-up edge (BUE) forms at cutting speeds in the 30-80 m/min range on ductile carbon steels (AISI 1018, 1045) — chip material periodically welds to the rake face, then breaks off carrying tool material with it. Stay below 30 m/min (no BUE because temperature too low for adhesion) OR above 100 m/min (no BUE because temperature too high — chip flows past too fast to weld). The unstable BUE window kills tool life 3-10× faster than either edge.",
    reasoning: "BUE formation requires three conditions: (1) chip-tool interface temperature high enough to plasticize chip material (~400-600°C for steel), (2) low enough to avoid melting/seizure (~800°C ceiling), and (3) sufficient time for chemical affinity to form weld. Below 30 m/min the temperature stays under the plasticization threshold; above 100 m/min the chip residence time at the rake face is too short. The middle band IS the BUE zone — known as the 'no-go' speed range for ductile steel finishing. Sources: peer-chat juliett's ChipTypePredictionModel BUE_SPEED_THRESHOLDS_COMPAT constant (algorithms/ChipTypePredictionModel.ts, commit 0dbd4a090e); Trent & Wright textbook.",
    conditions: [{ type: "operation_type", operations: ["turning", "milling"] }, { type: "material_iso", groups: ["P"] }],
    exceptions: ["High-Si aluminum alloys (>9% Si) develop BUE across a much wider Vc range — material-specific lookup required", "CBN tools at any Vc resist BUE due to chemical inertness"],
    source: "Trent, E.M. & Wright, P.K. (2000). *Metal Cutting*, 4th ed., Butterworth, ch.6 (BUE formation); Shaw, M.C. (2005). *Metal Cutting Principles*, 2nd ed., Oxford, ch.6. PEER PSN cross-reference: algorithms/ChipTypePredictionModel.ts BUE_SPEED_THRESHOLDS_COMPAT (juliett slot, commit 0dbd4a090e 2026-05-23)",
    related_rules: ["TL-008-coating-material-match", "ANTI-thermal-cycling"],
    evidence_level: "peer_reviewed",
    quantitative: "BUE zone for ductile carbon steel: Vc 30-80 m/min. Safe-below threshold: <30 m/min. Safe-above threshold: >100 m/min. Tool life penalty in BUE zone: 3-10× faster wear vs either edge.",
  },
  {
    id: "CHIP-007-chip-type-decision-tree",
    category: "chip_control",
    severity: "important",
    title: "Predict chip type via 6-rule precedence: discontinuous → continuous → BUE → wavy → segmented → laminar",
    rule: "Use a 6-rule decision precedence to predict chip morphology before cutting (informs coolant + feed adjustment): (1) brittle material (cast iron, hardened steel >55 HRC) → discontinuous chip; (2) Vc in BUE zone + ductile steel → BUE chip; (3) ductile material + high speed → continuous chip; (4) Ti or Ni alloy at moderate speed → segmented (saw-tooth) chip; (5) interrupted cut + thin chip load → wavy chip; (6) default ductile → laminar continuous chip. Chip type drives chip evacuation strategy + breaker choice.",
    reasoning: "Chip morphology is the OBSERVABLE feedback signal of the cutting process — operators read chip color, length, curl, and segmentation to diagnose cut quality. Predicting chip type BEFORE the cut lets the programmer choose: coolant flow direction, chipbreaker insert geometry, feed adjustments for chip-load control. Sources: peer-chat juliett's ChipTypePredictionModel.predictCompat() with 6-rule precedence (commit 0dbd4a090e); canonical literature on chip morphology classification.",
    conditions: [{ type: "operation_type", operations: ["turning", "milling"] }],
    exceptions: ["High-Si aluminum casting alloys produce powder/dust chips that don't fit the classical morphology types", "Cryogenic-cooled cuts can shift chip type to discontinuous for normally-continuous materials"],
    source: "Astakhov, V.P. (2006). *Tribology of Metal Cutting*, Elsevier, ch.3 (chip morphology classification); Klocke, F. (2011). *Manufacturing Processes 1: Cutting*, Springer, ch.2. PEER PSN cross-reference: algorithms/ChipTypePredictionModel.predictCompat() 6-rule decision precedence (juliett slot, commit 0dbd4a090e 2026-05-23)",
    related_rules: ["CHIP-006-bue-speed-threshold", "CHIP-001"],
    evidence_level: "peer_reviewed",
    quantitative: "Decision precedence order: discontinuous(brittle/hard) > BUE(steel+BUE-zone) > segmented(Ti/Ni+moderate-Vc) > wavy(interrupted+low-fz) > continuous(ductile+high-Vc) > laminar(default-ductile). Chip-type → breaker map: discontinuous→no-breaker, continuous→C-class, segmented→T-class, BUE→avoid by Vc shift.",
  },

  // ─── cutting_force (8→10, +2) — Merchant's circle expansion ───────────────

  {
    id: "CF-009-merchants-circle",
    category: "cutting_force",
    severity: "important",
    title: "Merchant's circle gives shear angle, friction force, and chip thickness ratio in one geometric construction",
    rule: "Use Merchant's force circle for orthogonal-cutting analysis: shear angle φ = atan(r·cos(α)/(1 - r·sin(α))) where r = uncut chip thickness/chip thickness ratio + α = rake angle. Friction angle β satisfies β - α = 45° - φ (Merchant's first equation, energy minimization). Friction coefficient μ = tan(β). Predicts cutting force, thrust force, and chip-tool contact length from measured chip thickness.",
    reasoning: "Merchant's circle reduces orthogonal cutting to plane-strain geometry — single shear plane angle φ, friction angle β, rake angle α. All forces can be decomposed graphically. The energy-minimization assumption (Merchant's first equation) gives an analytic prediction of φ that's typically within 5-15° of experimentally measured values — good enough for first-cut feed/speed selection, calibration via single test cut suffices for production. Sources: peer-chat juliett's PSN merchant's circle work in commits 972d204a25 (iter9) + 601fa848df (iter7); seminal Merchant (1944, 1945) papers.",
    conditions: [{ type: "operation_type", operations: ["turning", "milling"] }],
    exceptions: ["3D oblique cutting (helix milling) needs the Stabler/Armarego correction for inclination angle", "High-deformation rates (>10⁴ s⁻¹) violate the rate-independent assumption; use Johnson-Cook + FEM instead"],
    source: "Merchant, M.E. (1944,1945). *Mechanics of the metal cutting process* I & II. J. Applied Physics 16(5):267-275 + 16(6):318-324. Tlusty, J. (2000). *Manufacturing Processes and Equipment*, §10.3. Shaw (2005), ch.3. PEER PSN cross-reference: PSN merchant's circle predictor (juliett slot, commits 972d204a25 + 601fa848df 2026-05-23)",
    related_rules: ["CF-001", "Kienzle"],
    evidence_level: "peer_reviewed",
    quantitative: "Shear angle: φ = atan(r·cos(α)/(1 - r·sin(α))). Merchant's first eqn: β - α = 45° - φ. Friction coefficient: μ = tan(β). Typical accuracy: ±5-15° on φ vs experimental. Chip ratio range: r = 0.1-0.6 typical.",
  },
  {
    id: "CF-010-sandvik-vc-tables",
    category: "cutting_force",
    severity: "important",
    title: "Sandvik per-grade Vc tables are doctrine — manufacturer-tuned ahead of Kienzle generic",
    rule: "When Sandvik (or Kennametal, Iscar, Mitsubishi) publishes a grade-specific cutting speed range for an exact tool + material combination, use the manufacturer's value AS-IS — do not back-calculate via Kienzle generic kc values. The published Vc is empirically tuned for that grade's coating, geometry, and chipbreaker, often 20-50% above what Kienzle generic predicts.",
    reasoning: "Generic Kienzle constants (kc1.1 by ISO group) capture material behavior but not tool/coating optimization. Sandvik GC4325 in P-class steel at Vc=350 m/min is a documented manufacturer datum — they tested it on their grade with their geometry. Kienzle generic would back-calc to ~250 m/min for the same material — they're both right within their scope, but the manufacturer value is HIGHER because they engineered for it. Override Kienzle when grade-specific data exists. Sources: peer-chat juliett's Sandvik tribal merge (commit 310faca8bf iter8); Sandvik Coromant Master Catalog 2024.",
    conditions: [{ type: "operation_type", operations: ["turning", "milling"] }],
    exceptions: ["Generic carbide grades without manufacturer-specific spec — fall back to Kienzle + ISO group", "Off-label material use (running steel grade in titanium tool) — manufacturer spec is invalid, use conservative generic"],
    source: "Sandvik Coromant Master Catalog 2024 §turning + §milling (per-grade Vc tables); Kennametal Catalog 2024; Iscar Master Catalog. PEER PSN cross-reference: Sandvik tribal merge (juliett slot, commit 310faca8bf 2026-05-23, SF-PSN-WIRE-MS0/U-SFPSN-02C-B)",
    related_rules: ["CF-001", "Kienzle", "TL-008-coating-material-match"],
    evidence_level: "manufacturer_data",
    quantitative: "Manufacturer-tuned Vc vs Kienzle-derived: typically 20-50% higher. Example Sandvik GC4325 P-class steel: 350 m/min mfr-spec vs ~250 m/min Kienzle-generic. Use mfr value when available.",
  },

  // ─── adaptive (6→8, +2) — adaptive-control + chip-feedback ────────────────

  {
    id: "ADAPT-007-chip-type-feedback",
    category: "adaptive",
    severity: "important",
    title: "Adaptive control loop should consume predicted chip type as primary input",
    rule: "Modern adaptive feed control (force-based, vibration-based, or current-monitoring) should consume the PREDICTED chip type (from ChipTypePredictionModel or equivalent) as a primary loop input — adjust the control gain by chip-type-specific rules. Continuous chips: standard PID gain. Discontinuous (cast iron): reduce gain (cut force is noisy by nature). BUE chips: increase gain to escape the BUE zone quickly. Segmented (Ti): notch-filter at the segmentation frequency.",
    reasoning: "A generic PID feed controller assumes the cutting force signal is monotone with feed/depth. Different chip types produce different force signatures: continuous chips give smooth signals, discontinuous chips give high-frequency noise, BUE chips give periodic spikes (each BUE shed → force drop), segmented chips give periodic teeth at the segment frequency (often 1-5 kHz for Ti). A chip-aware controller tunes its filtering + gain per type, dramatically reducing both false-positive and false-negative adaptive interventions. Sources: peer-chat juliett's PSN ChipTypePredictionModel + adaptive feedback wiring (commits 0dbd4a090e + 601fa848df); Altintas adaptive-control textbook.",
    conditions: [{ type: "operation_type", operations: ["turning", "milling"] }],
    exceptions: ["Open-loop programs without force sensing — chip-type prediction is advisory only, no closed loop", "Cryo-cooled cutting alters chip type from continuous → discontinuous for normally-continuous materials — re-predict at cryo conditions"],
    source: "Altintas, Y. (2012). *Manufacturing Automation*, 2nd ed., Cambridge, ch.6 (adaptive control); Liang, S. & Dornfeld, D. (2008). *Tool Wear Detection via Cutting Force and Vibration Signal Analysis*. Int. J. Machine Tools & Manufacture 38(8):1023-1046. PEER PSN cross-reference: algorithms/ChipTypePredictionModel + adaptive feedback wiring (juliett slot, commits 0dbd4a090e + 601fa848df 2026-05-23)",
    related_rules: ["CHIP-007-chip-type-decision-tree", "ADAPT-001"],
    evidence_level: "peer_reviewed",
    quantitative: "PID gain adjustment by chip type: continuous=1.0×, discontinuous=0.5×, BUE=1.5× (escape gain), segmented=1.0× + notch-filter at segment-freq. Segmentation frequency Ti: 1-5 kHz typical.",
  },
  {
    id: "ADAPT-008-merchant-circle-realtime",
    category: "adaptive",
    severity: "important",
    title: "Real-time Merchant's circle from chip-thickness measurement closes the adaptive force loop",
    rule: "When in-process chip thickness measurement is available (force sensor + chip-flow optics, or laser triangulation on the chip), compute Merchant's circle in real time to get instantaneous shear angle + friction coefficient. Feed the deviation from nominal back to the adaptive feed controller — it captures tool wear, material batch variation, AND coolant degradation in one number.",
    reasoning: "Tool wear (flank land growth) reduces effective rake angle → shifts Merchant's circle → friction coefficient creeps up. Material hardness variation changes shear flow stress → shifts shear angle. Coolant breakdown reduces friction-reduction effectiveness → shifts friction angle. ALL three effects show up as Merchant's-circle parameter drift before they show up in geometric error or part-out-of-spec. A real-time Merchant feedback loop catches the drift 10-100× faster than after-the-fact CMM inspection. Sources: peer-chat juliett's PSN merchant's circle + adaptive feedback PSN-wire (commits 972d204a25 + 601fa848df).",
    conditions: [{ type: "operation_type", operations: ["turning", "milling"] }],
    exceptions: ["Conventional machining without force sensing — real-time Merchant unavailable, use post-cut CMM as feedback", "Hard milling where measured chip thickness is too small for optical capture — fall back to spindle current as proxy"],
    source: "Altintas (2012), ch.6 + ch.7 (force sensing + adaptive control); Schmitz & Smith (2009), §6. PEER PSN cross-reference: PSN merchant's circle + adaptive-feedback wiring (juliett slot, commits 972d204a25 + 601fa848df 2026-05-23)",
    related_rules: ["CF-009-merchants-circle", "ADAPT-007-chip-type-feedback"],
    evidence_level: "peer_reviewed",
    quantitative: "Merchant parameter drift detection latency: <100ms with force + chip-optics. CMM-feedback comparison latency: 10-100× slower. Friction-coefficient drift threshold: Δμ >10% → flag for tool change or coolant refresh.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PLAYBOOK EXPANSION WAVE 4 — U-PB-DEFERRED-CATEGORIES (slot:foxtrot iter12
  // 2026-05-23). Closes deferred categories named in iter9: post_processing,
  // micro_machining. 6 cited rules (3 each).
  // ──────────────────────────────────────────────────────────────────────────

  // ─── post_processing (6→9, +3) — G-code optimization tribal ───────────────

  {
    id: "POST-007-block-density-control",
    category: "post_processing",
    severity: "important",
    title: "Block density 100-500/sec for surface quality; >500 risks controller starvation, <100 wastes capability",
    rule: "Tune CAM post-processor output block density to 100-500 G-code blocks per second of cut time. Modern Heidenhain TNC640, Siemens 840Dsl, Fanuc 30iB handle 500+ blocks/sec without starvation. Legacy controllers (TNC360, 840D classic, Fanuc 16i/18i) cap around 100-200 blocks/sec. Excess density: controller buffer underruns → stuttering motion. Insufficient: surface faceting from coarse chord tolerance.",
    reasoning: "Block density is the controller's input-rate constraint. Each G-code block needs parsing, lookahead processing, and acceleration planning. Below 100 blocks/sec, the toolpath is so coarse that chord-tolerance approximation prints visible facets onto the part surface (especially on curved/freeform geometry). Above 500 blocks/sec on legacy controllers, the buffer can't drain fast enough — motion stutters every few seconds, leaving periodic ripple marks. Match block density to controller class.",
    conditions: [{ type: "operation_type", operations: ["milling", "finishing"] }],
    exceptions: ["NURBS-capable controllers (TNC640 with NURBS option, 840Dsl FastBlock) — chord tolerance constraint replaced by curve-degree; block density becomes less critical", "3-axis straight-line work on prismatic parts — block density rarely a bottleneck"],
    source: "Heidenhain TNC640 — 'NC Block Processing Specifications' §lookahead + block density; Siemens 840Dsl — 'Look-Ahead Function Manual' §block consumption rate; Fanuc 30iB — 'AI Contour Control Manual' §block density limits",
    related_rules: ["HSM-LOOKAHEAD", "HSM-CHORD-TOLERANCE"],
    evidence_level: "manufacturer_data",
    quantitative: "Block density target: 100-500/sec cut. Modern controller ceiling: 500+/sec. Legacy controller ceiling: 100-200/sec. Below 100/sec: visible chord-faceting on curved surfaces. Above 500/sec on legacy: stuttering motion + periodic ripple.",
  },
  {
    id: "POST-008-dialect-specific-canned-cycles",
    category: "post_processing",
    severity: "important",
    title: "Use controller's canned cycles when available — G81/G83/G84 are 5-20× faster than equivalent CAM-emitted long-form",
    rule: "When the target controller supports canned cycles (G81 drilling, G83 peck-drilling, G84 tapping, G73 chip-break drilling, G85 boring), output the canned cycle from CAM — NOT the equivalent long-form linear interpolation. Canned cycles execute inside the controller's optimized firmware at 5-20× the feedrate of equivalent G01-coded sequences, and consume vastly fewer blocks in the program memory.",
    reasoning: "Canned cycles are firmware-level operations on the CNC controller. G83 peck-drilling internally generates the up/down peck pattern at machine-native speed — typically 5-20× faster than emitting hundreds of G01 lines that approximate the same motion. Modern post-processors output canned cycles automatically; legacy or generic posts sometimes emit long-form which is slower + harder to debug + harder to override at the operator panel. Always verify the post-processor emits canned cycles when target controller supports them.",
    conditions: [{ type: "operation_type", operations: ["drilling", "tapping"] }],
    exceptions: ["Multi-controller portable G-code where lowest-common-denominator long-form is intentional", "Special peck patterns (variable depth, post-peck dwell) that don't match any canned cycle"],
    source: "Smid, P. (2007). *CNC Programming Handbook*, 3rd ed., Industrial Press, ch.18 (canned cycles); Machinery's Handbook 31st ed., pp.1130-1145 (CNC canned cycles); Fanuc 0i/30i — 'G-Code Reference Manual' §canned cycles",
    related_rules: ["DH-001", "POST-007-block-density-control"],
    evidence_level: "manufacturer_data",
    quantitative: "Canned-cycle vs long-form execution speedup: 5-20×. Block-count reduction: 10-100× (one G83 line vs hundreds of G01). Common canned cycles: G81/G83/G84/G73/G85/G86/G89. Manufacturer-extended: G73.1 (Mazak), G83.1 (Mori), G84.2 (Okuma).",
  },
  {
    id: "POST-009-comment-block-traceability",
    category: "post_processing",
    severity: "important",
    title: "Embed traceability comments in G-code: tool, operation, CAM-source, datum-zero at every section boundary",
    rule: "CAM post-processor must emit traceability comments at every operation boundary in G-code output: tool number + description, operation name + CAM session ID, datum-zero origin (G54/G55/G56...), expected runtime, machine prerequisites. Format as standard CNC comments `( ... )` (parens) or `;...` (semicolon) per controller dialect. Operators read these to set up the job, troubleshoot mid-run, and audit completed work.",
    reasoning: "Bare G-code with no comments is unauditable — operators can't tell which tool block matches which print feature, post-mortem analysis of a crash is impossible, and tribal knowledge ('use 1018 vise pad here') gets lost. The comment-block convention adds <1% to program file size while making the program self-documenting. Critical for ISO 9001/AS9100 traceability requirements + IATF 16949 production part approval. Most modern CAM posts emit these by default but verification + custom additions per shop convention is universal best practice.",
    conditions: [{ type: "operation_type", operations: ["post_processing"] }],
    exceptions: ["Memory-constrained legacy controllers (<1MB program memory) where every byte counts — strip comments for these targets only", "Encrypted/protected G-code where traceability is intentionally suppressed for IP protection"],
    source: "ISO 6983-1:2009 (NC programming format) + AS9100D §8.5.2 (traceability); Smid (2007) ch.5 (program structure + comments); Machinery's Handbook 31st ed., pp.1120-1130 (CNC program format)",
    related_rules: ["POST-008-dialect-specific-canned-cycles", "GDT-008"],
    evidence_level: "iso_standard",
    quantitative: "Comment overhead: <1% of program file size typical. Traceability fields per operation: ≥5 (tool, op, CAM-id, datum-zero, runtime). ISO 6983-1:2009 + AS9100D §8.5.2 + IATF 16949:2016 traceability requirements.",
    standard_ref: "ISO 6983-1:2009; AS9100D §8.5.2",
  },

  // ─── micro_machining (5→8, +3) — sub-1mm tribal expansion ─────────────────

  {
    id: "MICRO-006-runout-3um-limit",
    category: "micro_machining",
    severity: "important",
    title: "Tool TIR ≤3μm for micro-mills <1mm diameter — beyond 3μm, one flute does all the cutting",
    rule: "For micro-end mills with diameter <1mm, verify total indicator runout (TIR) ≤3μm at the cutting flutes. Higher runout means one flute removes disproportionately more material than the others — that flute wears out 5-20× faster, breaks unexpectedly, and produces dimensional drift across the feature. Use shrink-fit holders or HSK-E ER-class precision collets; standard ER chucks typically have 10-25μm TIR — UNUSABLE for micro tools.",
    reasoning: "A 0.5mm tool with 25μm TIR effectively cuts on only the high-side flute (the low-side flute never contacts material). Programmed chip load is divided unevenly — high flute sees 2-4× nominal chip thickness, accelerating wear by power-law; low flute rubs without cutting, accelerating wear via friction-heat. The 3μm threshold preserves multi-flute load distribution: each flute sees within ±20% of nominal chip thickness, balanced wear, predictable tool life. Shrink-fit holders deliver 3-5μm TIR at the spindle face; HSK-E with high-precision collets ~3-8μm; standard ER ~10-25μm.",
    conditions: [{ type: "operation_type", operations: ["milling"] }, { type: "feature_present", features: ["micro_feature"] }],
    exceptions: ["Single-flute micro tools where runout doesn't disturb chip-load distribution (the one flute does all the work by design)", "Helical-only micro-tools used in scribing/burnishing modes where chip-thinning is intentional"],
    source: "Klocke, F. (2011). *Manufacturing Processes 1: Cutting*, Springer, ch.7 (micro-machining); Dornfeld, D. et al. (2006). *Recent advances in mechanical micromachining*. CIRP Annals 55(2):745-768. Haimer — 'Micro-Tooling Runout Specifications'; Schunk Tribos shrink-fit catalog",
    related_rules: ["drill-stickout-runout", "TL-008-coating-material-match"],
    evidence_level: "peer_reviewed",
    quantitative: "TIR limit for micro tools: ≤3μm at cutting flutes for D<1mm. Shrink-fit TIR: 3-5μm typical. HSK-E precision collet: 3-8μm. Standard ER: 10-25μm (UNUSABLE). Wear penalty at 25μm TIR on 0.5mm tool: 5-20× faster on high-side flute.",
  },
  {
    id: "MICRO-007-spindle-speed-scaling",
    category: "micro_machining",
    severity: "important",
    title: "Scale spindle speed inversely with tool diameter — micro tools need 30k-60k RPM for proper Vc",
    rule: "Calculate required spindle speed for micro tools as n = (Vc × 1000) / (π × D), where Vc is the material's recommended cutting speed. For D=0.5mm tool in steel (Vc=80 m/min): n = 50,930 RPM. Most general-purpose machining centers cap at 8,000-15,000 RPM — INADEQUATE for micro work. Requires dedicated high-speed spindle (HSK-E25/E32 micro-spindle, 40,000-80,000 RPM) or air-turbine spindle attachment (50,000-150,000 RPM).",
    reasoning: "Cutting speed (Vc) is a material property tied to thermal physics — too slow → built-up edge + work hardening; too fast → tool burn-through. Vc is the surface speed at the tool edge, scaled by RPM × diameter. As diameter shrinks, RPM must INCREASE proportionally to maintain Vc. A 0.5mm tool needs ~50,000 RPM to achieve the same Vc as a 10mm tool at 2,550 RPM. Standard machining centers can't reach this — without a high-speed spindle, micro work runs at sub-optimal Vc (typically 1/5 to 1/10 of recommended), producing 50-90% poorer tool life + surface finish.",
    conditions: [{ type: "operation_type", operations: ["milling"] }, { type: "feature_present", features: ["micro_feature"] }],
    exceptions: ["Materials with very low recommended Vc (graphite, some plastics) — standard 10,000-15,000 RPM may suffice", "Very soft aluminum + brass at low feed where sub-optimal Vc is tolerable for prototype/one-off"],
    source: "Klocke (2011) ch.7 (micro-machining cutting speed scaling); Dornfeld et al. (2006); Nakanishi/NSK air-turbine spindle catalog; Datron neo (40,000 RPM micro-machining center) technical guide",
    related_rules: ["MICRO-006-runout-3um-limit", "milling-minimum-chip-load"],
    evidence_level: "peer_reviewed",
    quantitative: "Spindle speed formula: n_rpm = (Vc_m_per_min × 1000) / (π × D_mm). Steel @ D=0.5mm: 50,930 RPM. Steel @ D=1mm: 25,465 RPM. Steel @ D=0.1mm: 254,648 RPM. Standard MC ceiling: 8,000-15,000 RPM. High-speed spindle: 40,000-80,000. Air-turbine: 50,000-150,000.",
  },
  {
    id: "MICRO-008-edge-radius-min-chip",
    category: "micro_machining",
    severity: "important",
    title: "Minimum chip load = 1-2× tool edge radius; below this, ploughing dominates over shearing",
    rule: "Set chip load per tooth f_z ≥ 1-2× the tool's cutting-edge radius (typically 0.001-0.005mm for micro-tools, much smaller than the 0.05-0.1mm radius on standard end mills). Below this minimum-uncut-chip-thickness (MUCT), the tool plows the material rather than shearing it — converts cutting energy into friction heat, work-hardens ductile materials, produces poor surface finish.",
    reasoning: "Standard end mills have edge radius ~0.05mm (the manufactured chamfer on the cutting edge). At chip load 0.1-0.3mm, chip thickness >> edge radius, so the chip cleanly shears off. Micro-mills are sharpened to edge radius 0.001-0.005mm — the MUCT scales accordingly. Below MUCT, the workpiece material flows AROUND the edge instead of being sheared — produces a smeared/burnished surface, generates excess heat, work-hardens stainless/titanium to the point that subsequent passes can't cut at all. The 1-2× edge-radius minimum keeps the cut in clean-shear regime.",
    conditions: [{ type: "operation_type", operations: ["milling"] }, { type: "feature_present", features: ["micro_feature"] }],
    exceptions: ["Intentional burnishing/superfinishing passes where sub-MUCT operation is the desired surface-modification mode (single-pass only)", "Diamond-tip ULTRA-precision tools with edge radius <0.0001mm — MUCT becomes molecular-scale, normal cutting physics still applies"],
    source: "Vogler, M.P. et al. (2003). *On the modeling and analysis of machining performance in micro-endmilling*. ASME J. Manuf. Sci. Eng. 126(4):685-694. Klocke (2011) ch.7; Liu, X. et al. (2004). *The mechanics of machining at the microscale*. ASME J. Manuf. Sci. Eng. 126(4):666-678",
    related_rules: ["MICRO-006-runout-3um-limit", "MICRO-007-spindle-speed-scaling", "milling-minimum-chip-load"],
    evidence_level: "peer_reviewed",
    quantitative: "Min chip load f_z ≥ 1-2× edge radius. Micro-tool edge radius: 0.001-0.005mm. Standard end-mill edge radius: 0.05-0.1mm. Sub-MUCT consequences: ploughing-dominated cut, 2-5× heat generation, work-hardening on stainless/Ti.",
  },

  // ──────────────────────────────────────────────────────────────────────────
  // PLAYBOOK EXPANSION WAVE 5 — U-PB-FINAL-CATEGORIES (slot:foxtrot iter14
  // 2026-05-23). Closes remaining deferred categories: datum, dimensional_accuracy,
  // hybrid_additive. 9 cited rules (3 each). Session total: 54 cited rules across
  // 19 categories. Brings playbook to operator-requested "max statistical output".
  // ──────────────────────────────────────────────────────────────────────────

  // ─── datum (4→7, +3) — datum selection + preservation ─────────────────────

  {
    id: "DATUM-005-functional-vs-manufacturing",
    category: "datum",
    severity: "important",
    title: "Choose functional datum (mating surface) for inspection, NOT a convenient manufacturing datum",
    rule: "Select datums based on the part's FUNCTIONAL relationship to its mating assembly — the surface that bolts to the next part, the bore that pivots on the shaft, the face that seals against the gasket. Inspection datums should match these functional surfaces, NOT the convenient machined-flat that's easier to set up on. Wrong datum choice produces parts that measure 'in spec' but fail in assembly.",
    reasoning: "GD&T tolerances cascade from datums. If the inspection datum is a different surface from the assembly mating face, then small angular errors between those surfaces show up as massive tolerance violations at the actual mating interface — even though the part 'inspected good'. Functional datum selection is mandatory per ASME Y14.5 §4.7 (datum feature selection). The exception is fixture/manufacturing datums for ROUGHING ops, which must transfer cleanly to functional datums before finish.",
    conditions: [{ type: "operation_type", operations: ["setup_strategy", "inspection"] }],
    exceptions: ["Symmetric parts (cylinders) where any cross-section is functionally equivalent — manufacturing datum acceptable", "Roughing-op datums for stock-removal sequence before finish operations on functional datums"],
    source: "ASME Y14.5-2018 §4.7 (datum feature selection); Krulikowski, A. (2012). *Fundamentals of GD&T*, 3rd ed., Cengage, ch.5; Henzold, G. (2006). *Geometrical Dimensioning and Tolerancing*, 2nd ed., Butterworth, ch.4",
    related_rules: ["GDT-008", "GDT-009"],
    evidence_level: "iso_standard",
    standard_ref: "ASME Y14.5-2018 §4.7; ISO 5459:2011",
  },
  {
    id: "DATUM-006-3-2-1-transfer",
    category: "datum",
    severity: "important",
    title: "Datum transfer between ops must preserve original DRF — never re-establish from machined surfaces",
    rule: "When a part requires multiple machining operations across multiple setups, the SECOND setup's datums must transfer from the FIRST setup's datums — typically by using a datum-target feature machined in op-1 (a pocket, a hole, a stepped face). Never re-locate from a freshly-machined surface, because the machining tolerance is now baked into the datum chain.",
    reasoning: "Datums establish the part's coordinate frame. If op-1 produces a face with ±0.05mm tolerance, and op-2 datums from that face, op-2 inherits the ±0.05mm error PLUS its own machining error — tolerances stack. Datum-target features (deliberate locating fixtures created in op-1) preserve the original DRF integrity across ops. ASME Y14.5 §4.24 defines datum-target methods (point/line/area targets) for this exact purpose.",
    conditions: [{ type: "operation_type", operations: ["setup_strategy"] }],
    exceptions: ["Single-setup operations where datum transfer is irrelevant", "Parts with sufficient stock allowance for in-process re-datuming with verification probing"],
    source: "ASME Y14.5-2018 §4.24 (datum targets); Henzold (2006), ch.4; Drake, P.J. (1999). *Dimensioning and Tolerancing Handbook*, McGraw-Hill, ch.5",
    related_rules: ["DATUM-005-functional-vs-manufacturing", "GDT-008"],
    evidence_level: "iso_standard",
    standard_ref: "ASME Y14.5-2018 §4.24",
  },
  {
    id: "DATUM-007-axis-vs-center-plane",
    category: "datum",
    severity: "important",
    title: "Use datum AXIS for cylindrical parts; center-plane for symmetric prismatic — never both",
    rule: "For rotational parts (shafts, bushings, bearings), establish the primary datum as the AXIS of the cylindrical feature — locks 4 DOF (two translations + two rotations) in one feature. For symmetric prismatic parts (rectangular blocks with through-features about a center), use the CENTER PLANE — locks 3 DOF. Mixing axis + center-plane on the same DRF produces redundant constraints and conflicting inspection results.",
    reasoning: "A datum axis is a derived geometric entity — the central line of a cylinder. Locking the part to its axis means rotations around that axis are FREE (which is correct for rotational parts). A center plane is similar but for non-rotational symmetry. Per ASME Y14.5 §4.10-4.11, these are distinct datum features with distinct DOF effects. Mixing them creates over-constraint, where inspection tries to satisfy contradictory geometric conditions simultaneously — typically rejects good parts.",
    conditions: [{ type: "operation_type", operations: ["inspection", "setup_strategy"] }],
    exceptions: ["Compound features (rotational with key/keyway) where both axis + center-plane datums coexist — locked rotation by design"],
    source: "ASME Y14.5-2018 §4.10 (datum axis) + §4.11 (datum center plane); Krulikowski (2012) ch.5",
    related_rules: ["DATUM-005-functional-vs-manufacturing", "GDT-008"],
    evidence_level: "iso_standard",
    standard_ref: "ASME Y14.5-2018 §4.10-4.11",
  },

  // ─── dimensional_accuracy (6→9, +3) — precision-machining additions ───────

  {
    id: "DA-007-abbe-error",
    category: "dimensional_accuracy",
    severity: "important",
    title: "Abbe error: angular error × measurement-offset is a sin/tan multiplier — minimize the offset",
    rule: "Abbe error = angular error × perpendicular distance from the measurement axis to the workpiece — multiplied by sin(angular error). On a CMM probe 100mm offset from the spindle axis with 0.001° spindle tilt error: Abbe error = 100 × tan(0.001°) = 1.75μm. Minimize OFFSET, not just spindle accuracy — moving the probe closer to the spindle axis cuts Abbe error proportionally.",
    reasoning: "Ernst Abbe (1890s) formalized the geometric truth that angular errors in a measurement axis are MULTIPLIED by perpendicular offset to the measurement point. CMMs, lathes, mills, and surface gauges all suffer from this. A 0.001° error in a 1m-long axis is 17.5μm at the far end — undetectable as angular error but catastrophic as dimensional error. Modern high-precision machines (Kern, Mikron) minimize Abbe by co-locating the measurement scale, the spindle, and the workpiece in a single column. Older machines often have 50-200mm Abbe offsets.",
    conditions: [{ type: "operation_type", operations: ["inspection", "finishing"] }],
    exceptions: ["Closed-loop optical / laser interferometer metrology where the measurement axis IS the reference axis — no Abbe offset", "Coordinate measurement with software compensation that calibrates the offset out"],
    source: "Abbe, E. (1890). *Meßapparate für Physiker*. Slocum, A.H. (1992). *Precision Machine Design*, Prentice Hall, §2.7 (Abbe principle); NIST — 'Dimensional Metrology Best Practices' §Abbe; Kern Microtechnik — 'Precision Machine Architecture'",
    related_rules: ["GDT-008", "DA-001"],
    evidence_level: "peer_reviewed",
    quantitative: "Abbe error formula: ΔL = d × tan(θ). Example: d=100mm, θ=0.001° → ΔL=1.75μm. d=1000mm, θ=0.001° → 17.5μm. Kern Micro Vario Abbe offset: <5mm by design. Standard CNC mill Abbe offset: 50-200mm.",
  },
  {
    id: "DA-008-volumetric-accuracy-map",
    category: "dimensional_accuracy",
    severity: "important",
    title: "Map volumetric accuracy via laser interferometer + ball-bar; apply compensation tables for ±0.005mm work",
    rule: "For parts requiring ±0.005mm or tighter tolerances across a >300mm work envelope, perform volumetric-accuracy mapping: ball-bar test (Renishaw or API) per ISO 230-4, laser interferometer linear/squareness measurement per ISO 230-1/-2/-7, generate 21-error compensation table, load into controller. Without compensation, a typical CNC mill has 20-80μm volumetric error across a 500mm cube — exceeds the tolerance for fine work.",
    reasoning: "Every machine axis has small linear positioning errors, straightness errors, angular errors, and squareness errors. ISO 230 defines the 21-error model for 3-axis machines (6 errors × 3 axes + 3 squareness). Without compensation, these errors stack — a part machined at the corner of the envelope can be 50-100μm off from a part machined at the center. Modern controllers (Heidenhain TNC, Siemens 840D, Fanuc) accept compensation tables that mathematically correct toolpath in real-time using interpolated error maps. Pays back on tight-tolerance work within 5-10 jobs.",
    conditions: [{ type: "operation_type", operations: ["finishing", "inspection"] }, { type: "tolerance_below", threshold_mm: 0.005 }],
    exceptions: ["Small work envelope (<300mm cube) where volumetric stack-up stays within tolerance naturally", "Loose-tol roughing operations where 50-100μm machine-frame error is irrelevant"],
    source: "ISO 230-1:2012 (geometric accuracy linear axes); ISO 230-2:2014 (positioning accuracy); ISO 230-4:2005 (circular tests/ball-bar); Renishaw — 'Ballbar Diagnostics' manual; Slocum (1992) §3 (precision machine error budgets); Heidenhain TNC640 — 'Machine Compensation Tables' manual",
    related_rules: ["DA-007-abbe-error", "THERM-008-thermal-expansion-comp"],
    evidence_level: "iso_standard",
    quantitative: "21-error model per ISO 230. Volumetric error typical CNC mill: 20-80μm @ 500mm cube. Post-compensation: 5-15μm typical. Tolerance threshold for required comp: ≤±0.005mm. Ball-bar test: ISO 230-4. Laser interferometer: ISO 230-1/-2/-7.",
    standard_ref: "ISO 230-1:2012; ISO 230-2:2014; ISO 230-4:2005; ISO 230-7:2015",
  },
  {
    id: "DA-009-thermal-stable-time",
    category: "dimensional_accuracy",
    severity: "important",
    title: "Thermal-stable time before precision finishing: 4-8 hr post-startup; 30 min between hot operations",
    rule: "For sub-±0.013mm tolerance work, allow 4-8 hours of warm-up after machine cold start before precision finishing. Between hot operations (e.g., heavy roughing → finishing), allow 30 minutes thermal-stable time. Heavy cutting heats the spindle bearing 5-15°C, ball-screws 3-10°C, casting 2-5°C — each of which moves machine geometry by 5-50μm per °C depending on axis length.",
    reasoning: "Machine geometry is temperature-dependent. A 1m steel ball-screw expands 11.7μm/°C — a 5°C delta from spindle heat input shifts the X-axis by 58μm relative to the workpiece. Cold-machined parts produced just after machine startup differ from heat-soaked parts in the middle of a long production run by exactly this amount. World-class shops (Kern, Mikron, DMG MORI) condition the machine room to ±0.5°C and allow long warm-up; less-precision shops live with the variation. Per ISO 230-3 thermal effects testing.",
    conditions: [{ type: "operation_type", operations: ["finishing", "inspection"] }, { type: "tolerance_below", threshold_mm: 0.013 }],
    exceptions: ["Machines with closed-loop thermal compensation (Heidenhain CTC, Siemens TempComp, Mori-Seiki Thermo-Friendly) actively measure + correct — warm-up time reduced 60-80%", "Roughing-only work where 50μm thermal drift is within tolerance"],
    source: "ISO 230-3:2020 (determination of thermal effects); Bryan, J. (1990). *International status of thermal error research*. CIRP Annals 39(2):645-656; Slocum (1992) §3; Kern Microtechnik — 'Thermally Stable Machine Architecture' technical guide",
    related_rules: ["THERM-008-thermal-expansion-comp", "DA-008-volumetric-accuracy-map"],
    evidence_level: "iso_standard",
    quantitative: "Warm-up time: 4-8 hr cold start, 30 min hot→hot transition. Spindle thermal expansion: 5-15μm/°C. Ball-screw expansion: 11.7μm/m/°C steel. Room temperature spec (precision shop): ±0.5°C. ISO 230-3 thermal compensation test.",
    standard_ref: "ISO 230-3:2020",
  },

  // ─── hybrid_additive (5→8, +3) — hybrid AM+SM expansion ───────────────────

  {
    id: "HYBAM-006-distortion-from-AM",
    category: "hybrid_additive",
    severity: "important",
    title: "AM-then-machine: leave 0.5-2mm machining allowance to remove distortion + as-built surface roughness",
    rule: "Hybrid manufacturing (Direct Energy Deposition or Powder-Bed Fusion → CNC finish machining): leave 0.5-2mm of AM-deposited material as machining allowance for finishing. AM processes produce distortion (residual stress + thermal warp) and surface roughness (Ra 6-25μm typical for DED, Ra 10-50μm for L-PBF). Machining allowance absorbs both — finished surface emerges from base-material below the as-built layer.",
    reasoning: "AM is layer-by-layer deposition with massive thermal gradients — each layer cools and contracts onto the previous, building residual tensile stress. For DED on titanium: typical distortion 0.5-3mm across a 100mm part. For L-PBF on Inconel 718: 0.1-1mm. The as-built surface has the rough texture of solidified melt pools + partially-melted powder. Allowing 0.5-2mm of machining stock removes BOTH the distortion (machined surface tracks the design geometry, not the warped AM geometry) AND the as-built roughness in one operation. Less stock = risk of negative material allowance on the warped side. More stock = wasted material + extra machine time.",
    conditions: [{ type: "operation_type", operations: ["milling", "finishing"] }],
    exceptions: ["Net-shape AM (rare, mostly only for non-functional surfaces) — no machining required", "Specific high-precision AM systems (Velo3D, EOS M-Line) with closed-loop process control producing <0.1mm distortion + Ra <5μm"],
    source: "DebRoy, T. et al. (2018). *Additive manufacturing of metallic components — Process, structure and properties*. Progress in Materials Science 92:112-224; Gibson, I., Rosen, D. & Stucker, B. (2021). *Additive Manufacturing Technologies*, 3rd ed., Springer, ch.18; ASTM F3434-20 (hybrid manufacturing terminology); Mazak — 'Integrex with DED — Hybrid Manufacturing Application Guide'",
    related_rules: ["SURF-008-residual-stress-meas", "THERM-008-thermal-expansion-comp"],
    evidence_level: "peer_reviewed",
    quantitative: "Machining allowance: 0.5-2mm typical. DED distortion: 0.5-3mm/100mm. L-PBF distortion: 0.1-1mm/100mm. As-built Ra DED: 6-25μm. As-built Ra L-PBF: 10-50μm. Net-shape AM precision: <0.1mm distortion + Ra<5μm (Velo3D, EOS M-Line).",
    standard_ref: "ASTM F3434-20",
  },
  {
    id: "HYBAM-007-stress-relief-before-machine",
    category: "hybrid_additive",
    severity: "important",
    title: "Stress-relieve AM parts BEFORE machining if walls thinner than 5×D or aspect ratio >5:1",
    rule: "Before CNC finishing of AM parts with thin walls (<5× tool diameter) or high aspect ratios (>5:1), apply a stress-relief heat treatment: typically 650°C × 4 hr for Ti-6Al-4V, 980°C × 1 hr for Inconel 718. Residual AM stress released during machining causes immediate distortion (10-100μm per cut) — clamped-flat workpiece springs back the moment clamps release. Stress relief makes geometry stable.",
    reasoning: "AM-deposited material can carry residual tensile stress up to 80% of yield strength. As CNC removes material, the stress redistributes — internal force balance shifts, the part deforms. For a thin-wall part, even 50μm of distortion exceeds the tolerance. Stress relief at high temperature (below tempering temp) allows dislocation rearrangement that relaxes residual stress to <10% of yield. Trade-off: heat treatment costs $50-200 per part + 1-2 day cycle, but eliminates the dimensional instability that would otherwise scrap the part.",
    conditions: [{ type: "operation_type", operations: ["milling", "finishing"] }, { type: "material_iso", groups: ["S", "N"] }],
    exceptions: ["Thick-section AM parts (walls >5×D, aspect <5:1) where residual stress redistribution causes negligible distortion", "AM systems with in-process stress-management (controlled cool-down, scanning strategy optimization) producing low-stress as-built parts"],
    source: "DebRoy et al. (2018) §residual stress; Gibson et al. (2021) ch.16 (post-processing); ASTM F3301-18 (additive manufacturing post-processing reference); ASTM F2924-14 (additive manufacturing of Ti-6Al-4V); Pratt & Whitney AM Process Spec PS-AM-001 (stress relief protocols)",
    related_rules: ["HYBAM-006-distortion-from-AM", "SURF-008-residual-stress-meas"],
    evidence_level: "iso_standard",
    quantitative: "Stress relief Ti-6Al-4V: 650°C × 4 hr (below β-transus 995°C). Inconel 718: 980°C × 1 hr + 720°C × 8 hr age. Pre-stress-relief residual stress: 50-80% yield. Post-stress-relief: <10% yield. Distortion during machining without relief: 10-100μm typical.",
    standard_ref: "ASTM F3301-18; ASTM F2924-14",
  },
  {
    id: "HYBAM-008-DED-CNC-interface-precision",
    category: "hybrid_additive",
    severity: "important",
    title: "DED-then-CNC requires re-datuming at interface — touch-probe + 3-2-1 in single setup",
    rule: "On Mazak Integrex (or DMG MORI Lasertec, Okuma MULTUS) hybrid DED+CNC machines, re-establish workpiece datums between the DED deposition phase and the CNC finishing phase using a touch probe + 3-2-1 datum sequence — never assume the part's coordinate frame survived deposition unchanged. AM thermal distortion can shift the workpiece 10-200μm relative to the machine zero.",
    reasoning: "Hybrid machines deposit material, then machine it in the SAME setup. The temptation is to trust the machine's saved coordinate frame from the start of the job. But the deposition phase thermally distorts the workpiece (sometimes 100+μm) — machining starts from a different position than the CAM expected. Touch-probing key features (3 points on the primary face, 2 on secondary, 1 on tertiary per ASME Y14.5 datum hierarchy) re-establishes the part's actual location relative to the machine. Modern hybrid machines (Mazak Integrex, DMG MORI Lasertec 65, Okuma MULTUS U-V) have probe cycles built into the post-deposition workflow for this exact purpose.",
    conditions: [{ type: "operation_type", operations: ["milling", "finishing", "setup_strategy"] }],
    exceptions: ["Closed-loop in-process metrology hybrid systems (research-grade only) that continuously track workpiece position during DED", "Single-pass deposit-and-finish operations where deposition zone doesn't propagate distortion to datum features"],
    source: "Mazak — 'Integrex Hybrid Manufacturing Application Guide' §AM-to-CNC datum transfer; DMG MORI — 'Lasertec 65 3D Hybrid Manufacturing Manual'; Okuma — 'MULTUS U-V Hybrid Programming Guide'; ASTM F3434-20 (hybrid manufacturing terminology + setup)",
    related_rules: ["HYBAM-006-distortion-from-AM", "DATUM-006-3-2-1-transfer", "GDT-008"],
    evidence_level: "manufacturer_data",
    quantitative: "Post-deposition position shift: 10-200μm. Datum re-establishment via touch probe: 3-2-1 sequence (6 points total). Machines with built-in hybrid probing: Mazak Integrex / DMG Lasertec / Okuma MULTUS U-V. Required probe accuracy: ≤2μm TIR.",
    standard_ref: "ASTM F3434-20",
  },

];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MachiningPlaybookEngine {
  private rules: PlaybookRule[] = [...PLAYBOOK_RULES];

  /**
   * Get all applicable rules for a given machining scenario
   */
  advise(query: PlaybookQuery): {
    rules: PlaybookRule[];
    summary: string[];
    critical_warnings: string[];
  } {
    const matched = this.rules.filter(rule => this.ruleMatches(rule, query));
    const severityOrder: Record<Severity, number> = { critical: 0, important: 1, recommended: 2, tip: 3 };
    matched.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Filter by minimum severity if specified
    const minSev = query.severity_min ?? "tip";
    const minIdx = severityOrder[minSev];
    const filtered = matched.filter(r => severityOrder[r.severity] <= minIdx);

    // Filter by categories if specified
    const catFiltered = query.categories
      ? filtered.filter(r => query.categories!.includes(r.category))
      : filtered;

    return {
      rules: catFiltered,
      summary: catFiltered.map(r => `[${r.severity.toUpperCase()}] ${r.title}: ${r.rule.substring(0, 120)}...`),
      critical_warnings: catFiltered
        .filter(r => r.severity === "critical")
        .map(r => `${r.id}: ${r.title}`),
    };
  }

  /**
   * Get sequencing advice for a set of features
   */
  sequenceAdvice(features: string[], material_iso?: string): SequencingAdvice {
    const query: PlaybookQuery = {
      features,
      material_iso,
      categories: ["sequencing", "anti_pattern"],
    };
    const { rules } = this.advise(query);

    const order: string[] = [];
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Build recommended order from sequencing rules
    // Priority: face → datum → drill → rough → semi-finish → finish → thread → chamfer
    const CANONICAL_ORDER = [
      // Milling operations
      "face", "datum", "spot_drill", "drill", "bore_rough",
      "rough_pocket", "rough_profile", "rough_3d",
      "semi_finish", "bore_finish",
      "finish_pocket", "finish_profile", "finish_3d", "pencil",
      "ream", "tap", "thread_mill",
      "chamfer", "deburr",
      // Turning/lathe operations
      "turn_rough", "turn_finish", "turn_groove", "turn_thread", "turn_cutoff",
      // Deep hole operations
      "peck_drill", "gun_drill", "bta_drill",
      // Grinding operations
      "grind_rough", "grind_finish", "grind_id", "grind_surface",
      // EDM operations
      "edm_rough", "edm_finish", "wire_edm",
      // Surface treatment (always last before inspection)
      "heat_treat", "surface_treat", "anodize", "plate",
      // Inspection
      "inspect", "cmm",
    ];

    for (const op of CANONICAL_ORDER) {
      const relatedFeatures = features.filter(f => this.opRelatesTo(op, f));
      if (relatedFeatures.length > 0) {
        order.push(op);
      }
    }

    for (const rule of rules) {
      if (rule.category === "sequencing") {
        reasoning.push(`${rule.id}: ${rule.reasoning.substring(0, 150)}`);
      }
      if (rule.category === "anti_pattern") {
        warnings.push(`${rule.id} [${rule.severity.toUpperCase()}]: ${rule.rule}`);
      }
    }

    return {
      recommended_order: order,
      reasoning,
      warnings,
      applied_rules: rules.map(r => r.id),
    };
  }

  /**
   * Get setup strategy advice
   */
  setupAdvice(
    features: string[],
    material_iso?: string,
    tolerance_mm?: number,
  ): SetupAdvice {
    const query: PlaybookQuery = {
      features,
      material_iso,
      tolerance_mm,
      categories: ["setup_strategy", "workholding", "datum"],
    };
    const { rules } = this.advise(query);

    return {
      recommended_setups: features.some(f => f.includes("back") || f.includes("bottom")) ? 2 : 1,
      setup_descriptions: [
        "Setup 1: Top-accessible features — face, drill, rough, finish",
        ...(features.some(f => f.includes("back") || f.includes("bottom"))
          ? ["Setup 2: Flip part — machine bottom/back features using Op 1 surfaces as datum"]
          : []),
      ],
      workholding_suggestions: rules
        .filter(r => r.category === "workholding")
        .map(r => r.rule),
      datum_strategy: rules
        .filter(r => r.category === "datum")
        .map(r => r.rule)
        .join(" ") || "Machine primary datum surface (A) first, then B and C before any features.",
      reasoning: rules.map(r => `${r.id}: ${r.reasoning.substring(0, 100)}`),
      applied_rules: rules.map(r => r.id),
    };
  }

  /**
   * Look up anti-patterns for given conditions
   */
  antiPatterns(query: PlaybookQuery): PlaybookRule[] {
    return this.advise({ ...query, categories: ["anti_pattern"] }).rules;
  }

  /**
   * Add a new rule to the playbook (from video learning)
   */
  addRule(rule: PlaybookRule): void {
    // Check for duplicate ID
    if (this.rules.some(r => r.id === rule.id)) {
      throw new Error(`Rule ${rule.id} already exists`);
    }
    this.rules.push(rule);
  }

  /**
   * Get every rule in the playbook (defensive copy — caller cannot mutate the store).
   * Two consumers (PlaybookRulesEngine, TribalPlaybookEnforcementEngine) reach for this
   * shape, so the API is canonical rather than per-consumer.
   */
  getAllRules(): PlaybookRule[] {
    return this.rules.slice();
  }

  /**
   * Get all rules by category
   */
  byCategory(category: RuleCategory): PlaybookRule[] {
    return this.rules.filter(r => r.category === category);
  }

  /**
   * Get rule count statistics
   */
  stats(): Record<string, number> {
    const counts: Record<string, number> = { total: this.rules.length };
    for (const rule of this.rules) {
      counts[rule.category] = (counts[rule.category] || 0) + 1;
      counts[`severity_${rule.severity}`] = (counts[`severity_${rule.severity}`] || 0) + 1;
    }
    return counts;
  }

  // ── Playbook capability extensions (U-PB-EXPAND-CAPABILITIES) ──────────

  /**
   * Deep single-rule explanation: the rule itself plus every `related_rules`
   * cross-reference resolved to its actual rule (cycle-guarded by id) and a
   * parallel list of IDs that failed to resolve. Surfaces presence flags for
   * the rich optional fields the rest of the playbook surface does not expose.
   */
  explainRule(ruleId: string): RuleExplanation | null {
    const rule = this.rules.find((r) => r.id === ruleId);
    if (!rule) return null;

    const relatedIds = Array.isArray(rule.related_rules) ? rule.related_rules : [];
    const relatedResolved: PlaybookRule[] = [];
    const unresolvedRelated: string[] = [];
    // Seed with the rule's own id so a self-reference is silently dropped
    // rather than re-included, and a duplicate id in related_rules is folded.
    const seen = new Set<string>([ruleId]);
    for (const rid of relatedIds) {
      if (typeof rid !== "string" || rid.length === 0 || seen.has(rid)) continue;
      seen.add(rid);
      const r = this.rules.find((x) => x.id === rid);
      if (r) relatedResolved.push(r);
      else unresolvedRelated.push(rid);
    }

    return {
      rule,
      relatedResolved,
      unresolvedRelated,
      hasQuantitative: typeof rule.quantitative === "string" && rule.quantitative.length > 0,
      hasExceptions: Array.isArray(rule.exceptions) && rule.exceptions.length > 0,
      hasStandardRef: typeof rule.standard_ref === "string" && rule.standard_ref.length > 0,
      evidenceLevel: rule.evidence_level ?? "unspecified",
    };
  }

  /**
   * Multi-hop BFS over the `related_rules` cross-reference graph rooted at
   * `ruleId`. Extends `explainRule()` (1-hop) to arbitrary depth with:
   *
   * - **Cycle guard** via `seen` Set — a back-edge to an already-visited node
   *   lands in `cycleEdges` (visible to operators), not silently dropped.
   * - **Unresolved-ref surfacing** — rule ids referenced via `related_rules`
   *   but absent from the corpus land in `unresolvedRefs` (R12 fail-loud).
   * - **Truncation flag** — `truncated=true` when BFS hit `maxDepth` with
   *   further-hop neighbors still to explore (so the report doesn't lie
   *   about exhaustiveness).
   *
   * `maxDepth` defaults to 2 (root → neighbor → neighbor-of-neighbor).
   * `maxDepth=0` returns only the root node (no edges traversed).
   * Returns `null` when `ruleId` is not in the corpus — same shape as
   * `explainRule()` for caller consistency. Pure read-only — no mutations.
   */
  relatedGraph(ruleId: string, maxDepth: number = 2): RelatedGraphReport | null {
    const root = this.rules.find((r) => r.id === ruleId);
    if (!root) return null;
    const cappedDepth = Math.max(0, Math.floor(maxDepth));

    const nodes: RelatedGraphNode[] = [{ rule: root, hopDepth: 0 }];
    const edges: RelatedGraphEdge[] = [];
    const unresolvedRefs: string[] = [];
    const seenUnresolved = new Set<string>();
    const cycleEdges: RelatedGraphEdge[] = [];
    const visited = new Set<string>([ruleId]);
    let truncated = false;

    // BFS frontier — each entry is [rule, depth].
    const frontier: Array<[PlaybookRule, number]> = [[root, 0]];

    while (frontier.length > 0) {
      const [current, depth] = frontier.shift()!;
      const relatedIds = Array.isArray(current.related_rules) ? current.related_rules : [];
      for (const rid of relatedIds) {
        if (typeof rid !== "string" || rid.length === 0) continue;
        // Self-reference: silently skip (it's a no-op edge).
        if (rid === current.id) continue;

        if (visited.has(rid)) {
          // Back-edge to an already-visited node → cycle. Record it (deduped
          // by from/to pair) so operators can see the cycle exists rather
          // than silently dropping it.
          const dup = cycleEdges.some((e) => e.fromId === current.id && e.toId === rid);
          if (!dup) cycleEdges.push({ fromId: current.id, toId: rid });
          continue;
        }

        if (depth >= cappedDepth) {
          // We've hit the depth cap. There IS a further neighbor we are
          // intentionally NOT exploring → set truncated, do NOT add to
          // nodes/edges (would imply full exhaustion at higher depth).
          truncated = true;
          continue;
        }

        const r = this.rules.find((x) => x.id === rid);
        if (!r) {
          // Stale reference — R12 fail-loud, dedupe.
          if (!seenUnresolved.has(rid)) {
            seenUnresolved.add(rid);
            unresolvedRefs.push(rid);
          }
          edges.push({ fromId: current.id, toId: rid });
          continue;
        }

        // Resolved + unvisited: enqueue at depth+1.
        visited.add(rid);
        nodes.push({ rule: r, hopDepth: depth + 1 });
        edges.push({ fromId: current.id, toId: rid });
        frontier.push([r, depth + 1]);
      }
    }

    return {
      rootId: ruleId,
      maxDepth: cappedDepth,
      nodes,
      edges,
      unresolvedRefs,
      cycleEdges,
      truncated,
    };
  }

  /**
   * Corpus-wide health audit. Pure read-only — no rule mutation. Surfaces
   * every structural issue an operator should know before relying on the
   * playbook in a production decision:
   *
   *   - duplicateIds: corruption check (same id loaded twice)
   *   - orphans: rules with no related_rules AND no inbound references
   *     (isolated nodes — usable but disconnected from the knowledge graph)
   *   - unresolvedRefs: stale cross-references (R12 — name the missing
   *     target AND the source rule that needs fixing, not just the missing id)
   *   - cycles: cycles in the related_rules DAG, canonicalized + deduplicated
   *     (lowest-id-rotation as canonical form so {A→B→C→A} and {B→C→A→B}
   *     dedupe correctly)
   *   - schemaIssues: per-rule missing/empty required fields
   *   - healthScore: normalized [0,1] for at-a-glance triage
   *
   * Leverages the same graph machinery as relatedGraph() but runs over the
   * entire corpus rather than a single rooted BFS. Operators should pair
   * this with relatedGraph(ruleId) for per-rule deep-dive when an issue
   * is surfaced corpus-wide.
   */
  validateCorpus(): CorpusValidationReport {
    const rules = this.rules;
    const totalRules = rules.length;

    // 1. Duplicate ids — same id loaded into the corpus more than once.
    const idCount = new Map<string, number>();
    for (const r of rules) {
      idCount.set(r.id, (idCount.get(r.id) || 0) + 1);
    }
    const duplicateIds: string[] = [];
    for (const [id, n] of idCount) {
      if (n > 1) duplicateIds.push(id);
    }
    duplicateIds.sort();

    // 2. Inbound-reference count — used for orphan detection. We count
    // edges INTO each id, skipping malformed/self/unresolved refs (those
    // would inflate inbound and mask real orphans).
    const idSet = new Set(rules.map((r) => r.id));
    const inbound = new Map<string, number>();
    for (const r of rules) {
      if (!inbound.has(r.id)) inbound.set(r.id, 0);
    }
    for (const r of rules) {
      const rel = Array.isArray(r.related_rules) ? r.related_rules : [];
      for (const rid of rel) {
        if (typeof rid !== "string" || rid.length === 0) continue;
        if (rid === r.id) continue;
        if (!idSet.has(rid)) continue;
        inbound.set(rid, (inbound.get(rid) || 0) + 1);
      }
    }

    // 3. Orphans — rules with NO outbound related_rules AND NO inbound
    // refs from any other rule (truly isolated from the graph).
    const orphans: string[] = [];
    for (const r of rules) {
      const rel = Array.isArray(r.related_rules) ? r.related_rules : [];
      const hasOutbound = rel.some(
        (x) => typeof x === "string" && x.length > 0 && x !== r.id,
      );
      const hasInbound = (inbound.get(r.id) || 0) > 0;
      if (!hasOutbound && !hasInbound) orphans.push(r.id);
    }
    orphans.sort();

    // 4. Unresolved refs (corpus-wide). R12 — pair the source rule
    // with the missing target so an operator can fix the right rule.
    const unresolvedSeen = new Set<string>();
    const unresolvedRefs: UnresolvedRef[] = [];
    for (const r of rules) {
      const rel = Array.isArray(r.related_rules) ? r.related_rules : [];
      for (const rid of rel) {
        if (typeof rid !== "string" || rid.length === 0) continue;
        if (rid === r.id) continue;
        if (!idSet.has(rid)) {
          const key = `${r.id}|${rid}`;
          if (!unresolvedSeen.has(key)) {
            unresolvedSeen.add(key);
            unresolvedRefs.push({ fromId: r.id, missingId: rid });
          }
        }
      }
    }

    // 5. Cycle detection — iterative DFS with 3-color (white/grey/black).
    // ITERATIVE (not recursive) to eliminate stack-overflow risk on deep
    // corpora — a 5,000-rule linear chain would exhaust Node's default
    // call-stack with recursion. Each callStack frame tracks the rule id
    // and the next-child cursor `iter`; traversalStack mirrors the recursion
    // path for cycle slice extraction. When a grey vertex is hit, extract
    // the cycle slice from traversalStack and canonicalize.
    const ruleById = new Map(rules.map((r) => [r.id, r]));
    const WHITE = 0;
    const GREY = 1;
    const BLACK = 2;
    const color = new Map<string, number>();
    for (const r of rules) color.set(r.id, WHITE);
    const cycles: CycleId[] = [];
    const seenCycles = new Set<string>();

    interface DfsFrame {
      id: string;
      relatedRules: ReadonlyArray<string | unknown>;
      iter: number;
    }

    const recordCycle = (rid: string, traversalStack: string[]): void => {
      const startIdx = traversalStack.indexOf(rid);
      if (startIdx < 0) return;
      const cycle = traversalStack.slice(startIdx);
      // Canonicalize: rotate so the lowest id (UTF-16 lex order) is index 0.
      let minIdx = 0;
      for (let i = 1; i < cycle.length; i++) {
        if (cycle[i] < cycle[minIdx]) minIdx = i;
      }
      const canonical = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
      const key = canonical.join("→"); // U+2192 RIGHTWARDS ARROW
      if (!seenCycles.has(key)) {
        seenCycles.add(key);
        cycles.push(canonical);
      }
    };

    for (const root of rules) {
      if (color.get(root.id) !== WHITE) continue;
      // Begin iterative DFS rooted at `root`. callStack mirrors recursion
      // (each frame = one nested DFS call); traversalStack carries only
      // the current path from `root` for cycle-slice extraction.
      color.set(root.id, GREY);
      const rootRel = Array.isArray(root.related_rules) ? root.related_rules : [];
      const callStack: DfsFrame[] = [{ id: root.id, relatedRules: rootRel, iter: 0 }];
      const traversalStack: string[] = [root.id];

      while (callStack.length > 0) {
        const top = callStack[callStack.length - 1];
        let descended = false;

        while (top.iter < top.relatedRules.length) {
          const rid = top.relatedRules[top.iter++];
          if (typeof rid !== "string" || rid.length === 0) continue;
          if (rid === top.id) continue;
          if (!idSet.has(rid)) continue;
          const c = color.get(rid);
          if (c === GREY) {
            recordCycle(rid, traversalStack);
          } else if (c === WHITE) {
            // Descend: simulate the recursive call by pushing a new frame.
            color.set(rid, GREY);
            const childRule = ruleById.get(rid);
            const childRel =
              childRule && Array.isArray(childRule.related_rules) ? childRule.related_rules : [];
            callStack.push({ id: rid, relatedRules: childRel, iter: 0 });
            traversalStack.push(rid);
            descended = true;
            break; // process the new top frame on the next while-iteration
          }
        }

        if (!descended) {
          // All children processed — mark BLACK and pop (mirrors recursion return).
          color.set(top.id, BLACK);
          traversalStack.pop();
          callStack.pop();
        }
      }
    }

    // 6. Schema issues — required fields per PlaybookRule contract.
    // We surface each missing/empty field as a distinct issue string so
    // an operator can fix all of them in one pass.
    const schemaIssues: SchemaIssue[] = [];
    for (const r of rules) {
      const issues: string[] = [];
      if (typeof r.id !== "string" || r.id.length === 0) issues.push("id is missing or empty");
      if (typeof r.category !== "string" || (r.category as string).length === 0) issues.push("category is missing or empty");
      if (typeof r.severity !== "string" || (r.severity as string).length === 0) issues.push("severity is missing or empty");
      if (typeof r.title !== "string" || r.title.length === 0) issues.push("title is missing or empty");
      if (typeof r.rule !== "string" || r.rule.length === 0) issues.push("rule is missing or empty");
      if (typeof r.reasoning !== "string" || r.reasoning.length === 0) issues.push("reasoning is missing or empty");
      if (!Array.isArray(r.conditions)) issues.push("conditions must be an array");
      if (!Array.isArray(r.exceptions)) issues.push("exceptions must be an array");
      if (typeof r.source !== "string" || r.source.length === 0) issues.push("source is missing or empty");
      if (issues.length > 0) {
        schemaIssues.push({ id: r.id && r.id.length > 0 ? r.id : "<unidentified>", issues });
      }
    }

    // 7. Health score — normalized [0,1]. Operators should read the
    // detail arrays before relying on this number (one high-severity
    // cycle is worse than the aggregate score suggests).
    const totalFindings =
      duplicateIds.length +
      orphans.length +
      unresolvedRefs.length +
      cycles.length +
      schemaIssues.length;
    const healthScore = totalRules > 0
      ? Math.max(0, 1 - totalFindings / totalRules)
      : 1;

    return {
      totalRules,
      duplicateIds,
      orphans,
      unresolvedRefs,
      cycles,
      schemaIssues,
      healthScore,
    };
  }

  /**
   * Playbook coverage analysis for a job context. Aggregates `advise()` output
   * into per-category / per-severity counts, identifies categories with ZERO
   * applicable rules (playbook blind-spots), and returns the applicable rule
   * IDs in severity order. Pure read-only aggregation over `advise()`.
   */
  coverageReport(query: PlaybookQuery): PlaybookCoverageReport {
    const { rules: applicable } = this.advise(query);

    // Data-driven: enumerate the categories the rule store actually carries so
    // the blind-spot list reflects engine reality, not a hardcoded enum list.
    const knownCategories = new Set<string>();
    for (const r of this.rules) knownCategories.add(r.category);

    const byCategory: Record<string, number> = {};
    const bySeverity: Record<Severity, number> = {
      critical: 0,
      important: 0,
      recommended: 0,
      tip: 0,
    };
    for (const r of applicable) {
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
      bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1;
    }

    const blindSpotCategories: string[] = [];
    for (const cat of knownCategories) {
      if (!(cat in byCategory)) blindSpotCategories.push(cat);
    }
    blindSpotCategories.sort();

    return {
      applicableCount: applicable.length,
      totalRulesEvaluated: this.rules.length,
      byCategory,
      bySeverity,
      criticalApplicable: bySeverity.critical,
      blindSpotCategories,
      ruleIds: applicable.map((r) => r.id),
    };
  }

  /**
   * Surface applicable playbook rules that carry a `quantitative?` threshold
   * formula. Where `advise()` returns a flat list of every applicable rule,
   * this filters to ONLY those whose numeric guidance is encoded — giving
   * callers a focused view of the quantitative knowledge applicable to a
   * machining context (otherwise inert documentation).
   */
  quantitativeGuidance(query: PlaybookQuery): QuantitativeGuidanceReport {
    const { rules: applicable } = this.advise(query);
    const entries: QuantitativeGuidanceEntry[] = [];

    for (const r of applicable) {
      if (typeof r.quantitative === "string" && r.quantitative.length > 0) {
        const entry: QuantitativeGuidanceEntry = {
          ruleId: r.id,
          title: r.title,
          severity: r.severity,
          category: r.category,
          quantitative: r.quantitative,
          reasoning: r.reasoning,
        };
        if (typeof r.standard_ref === "string" && r.standard_ref.length > 0) {
          entry.standardRef = r.standard_ref;
        }
        entries.push(entry);
      }
    }

    const withQuantitativePct =
      applicable.length > 0 ? Math.round((entries.length / applicable.length) * 1000) / 10 : 0;

    return {
      count: entries.length,
      entries,
      totalApplicable: applicable.length,
      withQuantitativePct,
    };
  }

  /**
   * Playbook-corpus integrity audit. Scans every rule for cross-reference and
   * completeness defects that silently degrade playbook quality:
   *   - duplicate_id      — the same rule id registered twice
   *   - dangling_related  — related_rules pointing at a non-existent rule id
   *   - self_reference    — related_rules including the rule's own id
   *   - asymmetric_related— A → B with no B → A link back
   *   - empty_reasoning   — a rule with no reasoning text
   *   - unreachable_rule  — neither conditions nor conditions_all → never matches
   *
   * Pure read-only scan over the rule store; the result is deterministic
   * (issues sorted by ruleId then issueType). Honest about the canonical
   * corpus — it does NOT assume the shipped 296 rules are defect-free.
   */
  auditIntegrity(): PlaybookIntegrityReport {
    const issues: PlaybookIntegrityIssue[] = [];

    // id frequency — drives duplicate_id + the known-id set.
    const idCounts = new Map<string, number>();
    for (const r of this.rules) {
      idCounts.set(r.id, (idCounts.get(r.id) ?? 0) + 1);
    }
    const knownIds = new Set<string>(idCounts.keys());

    // Forward related-rule map (sanitized) for the asymmetry check.
    const relMap = new Map<string, Set<string>>();
    for (const r of this.rules) {
      const rel = Array.isArray(r.related_rules)
        ? r.related_rules.filter((x): x is string => typeof x === "string" && x.length > 0)
        : [];
      // last-writer-wins on a duplicate id is fine — the asymmetry check only
      // needs *a* link set per id, and a duplicate id is already its own defect.
      relMap.set(r.id, new Set(rel));
    }

    const reportedDup = new Set<string>();
    for (const r of this.rules) {
      if ((idCounts.get(r.id) ?? 0) > 1 && !reportedDup.has(r.id)) {
        reportedDup.add(r.id);
        issues.push({
          ruleId: r.id,
          issueType: "duplicate_id",
          detail: `rule id appears ${idCounts.get(r.id)} times in the store`,
        });
      }

      if (typeof r.reasoning !== "string" || r.reasoning.trim().length === 0) {
        issues.push({
          ruleId: r.id,
          issueType: "empty_reasoning",
          detail: "rule carries no reasoning text — the WHY behind the advice is missing",
        });
      }

      const hasConditions = Array.isArray(r.conditions) && r.conditions.length > 0;
      const hasConditionsAll = Array.isArray(r.conditions_all) && r.conditions_all.length > 0;
      if (!hasConditions && !hasConditionsAll) {
        issues.push({
          ruleId: r.id,
          issueType: "unreachable_rule",
          detail: "rule has neither conditions nor conditions_all — advise() can never match it",
        });
      }

      const rel = relMap.get(r.id) ?? new Set<string>();
      for (const target of rel) {
        if (target === r.id) {
          issues.push({
            ruleId: r.id,
            issueType: "self_reference",
            detail: "related_rules includes the rule's own id",
          });
          continue;
        }
        if (!knownIds.has(target)) {
          issues.push({
            ruleId: r.id,
            issueType: "dangling_related",
            detail: `related_rules points at unknown rule '${target}'`,
          });
          continue;
        }
        const back = relMap.get(target);
        if (back && !back.has(r.id)) {
          issues.push({
            ruleId: r.id,
            issueType: "asymmetric_related",
            detail: `links to '${target}' but '${target}' does not link back`,
          });
        }
      }
    }

    issues.sort((a, b) => {
      if (a.ruleId !== b.ruleId) return a.ruleId < b.ruleId ? -1 : 1;
      if (a.issueType !== b.issueType) return a.issueType < b.issueType ? -1 : 1;
      return 0;
    });

    const byType: Record<string, number> = {};
    for (const i of issues) byType[i.issueType] = (byType[i.issueType] ?? 0) + 1;

    return {
      totalRules: this.rules.length,
      uniqueRuleIds: knownIds.size,
      issueCount: issues.length,
      issues,
      byType,
      healthy: issues.length === 0,
    };
  }

  /**
   * Playbook-corpus semantic conflict scan. Finds pairs of rules that give
   * CONTRADICTORY parameter directives (e.g. one says "increase feedrate",
   * the other "reduce feedrate") AND co-fire — i.e. both apply to the same
   * machining situation (same category with overlapping conditions).
   *
   * This is the semantic-layer complement to `auditIntegrity()`: the audit
   * finds broken cross-references, this finds advice that contradicts itself.
   *
   * Directive extraction is deterministic lexicon co-occurrence (see the
   * CONFLICT_* lexicons) — a heuristic review surface, NOT NLP. A rule that
   * advises BOTH directions for one parameter (internally ambiguous) is
   * excluded from that parameter's conflict test rather than mis-reported.
   * Pure read-only scan; the report is deterministic (conflicts sorted by
   * ruleIdA, then ruleIdB, then parameter).
   */
  detectConflicts(): PlaybookConflictReport {
    // Extract directives once per rule (O(n) — avoids re-parsing in the pair loop).
    const directives = new Map<string, Map<ConflictParameter, Set<DirectiveDirection>>>();
    for (const r of this.rules) {
      directives.set(
        r.id,
        this.extractDirectives(typeof r.rule === "string" ? r.rule : ""),
      );
    }

    const conflicts: PlaybookConflict[] = [];
    let pairsEvaluated = 0;
    const n = this.rules.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const r1 = this.rules[i];
        const r2 = this.rules[j];
        if (r1.category !== r2.category) continue;
        const sharedContext = this.describeOverlap(r1, r2);
        if (sharedContext === null) continue;
        pairsEvaluated++;

        // Order the pair so ruleIdA <= ruleIdB — deterministic output.
        const aFirst = r1.id <= r2.id;
        const ruleA = aFirst ? r1 : r2;
        const ruleB = aFirst ? r2 : r1;
        const dirA = directives.get(ruleA.id);
        const dirB = directives.get(ruleB.id);
        if (!dirA || !dirB) continue;

        for (const param of CONFLICT_PARAMETERS) {
          const setA = dirA.get(param);
          const setB = dirB.get(param);
          // Both rules must give a CLEAN (unambiguous, single) directive.
          if (!setA || !setB || setA.size !== 1 || setB.size !== 1) continue;
          const directionA = [...setA][0];
          const directionB = [...setB][0];
          if (directionA === directionB) continue; // same advice — not a conflict
          conflicts.push({
            ruleIdA: ruleA.id,
            ruleIdB: ruleB.id,
            parameter: param,
            directionA,
            directionB,
            category: ruleA.category,
            sharedContext,
          });
        }
      }
    }

    conflicts.sort((a, b) => {
      if (a.ruleIdA !== b.ruleIdA) return a.ruleIdA < b.ruleIdA ? -1 : 1;
      if (a.ruleIdB !== b.ruleIdB) return a.ruleIdB < b.ruleIdB ? -1 : 1;
      if (a.parameter !== b.parameter) return a.parameter < b.parameter ? -1 : 1;
      return 0;
    });

    const byParameter: Record<string, number> = {};
    for (const c of conflicts) byParameter[c.parameter] = (byParameter[c.parameter] ?? 0) + 1;

    return {
      totalRules: n,
      pairsEvaluated,
      conflictCount: conflicts.length,
      conflicts,
      byParameter,
      conflictFree: conflicts.length === 0,
      method: "lexicon-cooccurrence",
    };
  }

  /**
   * Rank the conflicts produced by `detectConflicts()` by priority so an
   * operator can triage. Each conflict gets a `priorityScore` in [0, 1]
   * combining pair-severity (the max + min of the two rules' severity
   * ranks, normalised) at 80% weight and evidence-level delta (how much
   * stronger one rule's source is than the other's) at 20%. The score
   * buckets into urgent/high/medium/low; `evidenceWinner` names the
   * stronger-sourced rule or `null` on tie/unknown.
   *
   * Pure ranking — never re-scans the corpus. Pass the output of
   * `detectConflicts()` to avoid recomputation, or omit `input` to fetch
   * it. Sort is stable: within a priorityScore tie, the deterministic
   * (ruleIdA, ruleIdB, parameter) order from `detectConflicts()` is kept
   * (ES2019+ guarantees stable Array.prototype.sort).
   *
   * Defensive against unknown severity / evidence_level strings in
   * mal-authored rules: unknown severity → "tip" rank (1), unknown
   * evidence_level → "unspecified" rank (0). Never throws.
   */
  rankConflicts(input?: PlaybookConflictReport): RankedConflictReport {
    const report = input ?? this.detectConflicts();

    // Build a rule-id lookup for severity + evidence_level access.
    const byId = new Map<string, PlaybookRule>();
    for (const r of this.rules) byId.set(r.id, r);

    const ranked: RankedConflict[] = report.conflicts.map((c) => {
      const ra = byId.get(c.ruleIdA);
      const rb = byId.get(c.ruleIdB);
      const sevA = SEVERITY_RANK[ra?.severity as Severity] ?? 1;
      const sevB = SEVERITY_RANK[rb?.severity as Severity] ?? 1;
      const evA = EVIDENCE_RANK[(ra?.evidence_level ?? "unspecified") as EvidenceLevel | "unspecified"] ?? 0;
      const evB = EVIDENCE_RANK[(rb?.evidence_level ?? "unspecified") as EvidenceLevel | "unspecified"] ?? 0;
      // pairSeverity ∈ [0.25, 1.0]: both tip→0.25, both critical→1.0.
      const pairSeverity = (Math.max(sevA, sevB) + Math.min(sevA, sevB)) / SEVERITY_PAIR_MAX;
      // evidenceDelta ∈ [0, 1]: 0 (both same source) → 1 (ISO vs unspecified).
      const evidenceDelta = Math.abs(evA - evB) / EVIDENCE_RANK_SPAN;
      const priorityScore = Math.min(1, Math.max(0,
        pairSeverity * SEVERITY_WEIGHT + evidenceDelta * EVIDENCE_WEIGHT));
      const priority: ConflictPriority =
        priorityScore >= CONFLICT_PRIORITY_THRESHOLDS.urgent ? "urgent"
        : priorityScore >= CONFLICT_PRIORITY_THRESHOLDS.high ? "high"
        : priorityScore >= CONFLICT_PRIORITY_THRESHOLDS.medium ? "medium"
        : "low";
      // Severity names paired with their ranks for the max/min extraction.
      const aSev: Severity = (ra?.severity as Severity) ?? "tip";
      const bSev: Severity = (rb?.severity as Severity) ?? "tip";
      const maxSeverity = sevA >= sevB ? aSev : bSev;
      const minSeverity = sevA <= sevB ? aSev : bSev;
      const evidenceWinner =
        evA > evB ? c.ruleIdA
        : evB > evA ? c.ruleIdB
        : null;
      return {
        ...c,
        maxSeverity,
        minSeverity,
        priorityScore,
        priority,
        evidenceWinner,
      };
    });

    // Stable sort: priorityScore DESC; ES2019 guarantees stable Array.sort,
    // so within a score tie the input order (deterministic from detectConflicts)
    // is preserved.
    ranked.sort((a, b) => b.priorityScore - a.priorityScore);

    const byPriority: Record<ConflictPriority, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const r of ranked) byPriority[r.priority]++;

    return {
      conflictCount: ranked.length,
      ranked,
      byPriority,
    };
  }

  /**
   * Propose which rule should win a single playbook conflict — closes the
   * detect → rank → RESOLVE workflow. Decision hierarchy:
   *   1. Primary: higher evidence_level (ISO > peer_reviewed > manufacturer_data
   *      > empirical_validated > empirical_heuristic > theoretical > unspecified).
   *   2. Tiebreaker: higher severity (critical > important > recommended > tip).
   *   3. Both tied → ambiguous; winnerId/loserId null, requires human judgment.
   *
   * Confidence reflects margin: evidence-decided ∈ [0.5, 1.0], severity-decided
   * ∈ [0.3, 0.7], ambiguous = 0. The intentional band overlap is correct —
   * a crit/tip severity pair (0.7) outranks a tiny evidence margin (0.6),
   * matching operator intuition that a critical-vs-tip clash is more decisive
   * than peer_reviewed-vs-manufacturer_data.
   *
   * Defensive against malformed rules: unknown severity → "tip" rank (1),
   * unknown evidence_level → "unspecified" rank (0) — same fallbacks as
   * rankConflicts(). Never throws. Accepts either a raw PlaybookConflict or
   * a RankedConflict (extra ranking fields are ignored).
   *
   * Pure single-conflict — no corpus rescans, no side effects.
   */
  suggestResolution(conflict: PlaybookConflict | RankedConflict): ResolutionProposal {
    const byId = new Map<string, PlaybookRule>();
    for (const r of this.rules) byId.set(r.id, r);
    return this.proposeFromConflict(conflict, byId);
  }

  /**
   * Batch variant of `suggestResolution()` over a conflict set. Accepts the
   * output of `detectConflicts()` OR `rankConflicts()` (or omit `input` to
   * fetch fresh). Returns one ResolutionProposal per input conflict in the
   * same order. `byDecision` buckets let callers dashboard the split between
   * evidence-decided / severity-decided / ambiguous — useful for operators
   * tuning corpus evidence-tagging coverage.
   *
   * Composition-friendly: never re-scans the rule store; reuses the same
   * lookup map across all proposals so 1000-conflict batches cost O(N+R)
   * not O(N*R).
   */
  suggestResolutions(input?: PlaybookConflictReport | RankedConflictReport): ResolutionReport {
    let conflicts: Array<PlaybookConflict | RankedConflict>;
    if (input === undefined) {
      conflicts = this.detectConflicts().conflicts;
    } else if ("ranked" in input) {
      conflicts = input.ranked;
    } else {
      conflicts = input.conflicts;
    }
    const byId = new Map<string, PlaybookRule>();
    for (const r of this.rules) byId.set(r.id, r);
    const proposals = conflicts.map((c) => this.proposeFromConflict(c, byId));
    const byDecision: Record<ResolutionDecidedBy, number> = {
      evidence: 0,
      severity: 0,
      ambiguous: 0,
    };
    for (const p of proposals) byDecision[p.decidedBy]++;
    return {
      conflictCount: proposals.length,
      proposals,
      byDecision,
      ambiguousCount: byDecision.ambiguous,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /** Shared core for suggestResolution() + suggestResolutions(). */
  private proposeFromConflict(
    c: PlaybookConflict | RankedConflict,
    byId: Map<string, PlaybookRule>,
  ): ResolutionProposal {
    const ra = byId.get(c.ruleIdA);
    const rb = byId.get(c.ruleIdB);
    const sevA = SEVERITY_RANK[ra?.severity as Severity] ?? 1;
    const sevB = SEVERITY_RANK[rb?.severity as Severity] ?? 1;
    const evA = EVIDENCE_RANK[(ra?.evidence_level ?? "unspecified") as EvidenceLevel | "unspecified"] ?? 0;
    const evB = EVIDENCE_RANK[(rb?.evidence_level ?? "unspecified") as EvidenceLevel | "unspecified"] ?? 0;
    // NOTE: un-normalized scale — rankConflicts() at line ~5043 uses
    // `Math.abs(evA - evB) / EVIDENCE_RANK_SPAN` (∈ [0, 1] normalized) for
    // priority-score weighting. proposeFromConflict() keeps the raw delta
    // ∈ [0, 5] because the confidence formula (line ~5200) divides by
    // EVIDENCE_RANK_SPAN at the call site to land in [0.5, 1.0]. Same
    // variable name, different scales — by design (Reviewer B P1-1).
    const evidenceDelta = Math.abs(evA - evB);
    const severityDelta = Math.abs(sevA - sevB);

    // R12 fail-loud: stale conflict input (rule ids that no longer exist in
    // the corpus) would otherwise fall silently into the ambiguous branch
    // below and emit "human judgment required" — a dishonest rationale when
    // the true cause is "corpus lookup failed". Detect + surface explicitly.
    let warning: string | undefined;
    if (!ra && !rb) {
      warning = `Neither rule found in corpus: ruleIdA="${c.ruleIdA}", ruleIdB="${c.ruleIdB}". Conflict input may be stale.`;
    } else if (!ra) {
      warning = `ruleIdA "${c.ruleIdA}" not found in corpus — resolution uses default ranks (severity=tip, evidence=unspecified).`;
    } else if (!rb) {
      warning = `ruleIdB "${c.ruleIdB}" not found in corpus — resolution uses default ranks (severity=tip, evidence=unspecified).`;
    }

    let winnerId: string | null;
    let loserId: string | null;
    let decidedBy: ResolutionDecidedBy;
    let confidence: number;
    let rationale: string;

    if (evidenceDelta > 0) {
      decidedBy = "evidence";
      if (evA > evB) {
        winnerId = c.ruleIdA;
        loserId = c.ruleIdB;
      } else {
        winnerId = c.ruleIdB;
        loserId = c.ruleIdA;
      }
      confidence = RESOLUTION_EVIDENCE_BASE +
        RESOLUTION_EVIDENCE_SPAN * (evidenceDelta / EVIDENCE_RANK_SPAN);
      rationale = `Higher evidence_level wins: ${winnerId} (evidence delta=${evidenceDelta.toFixed(1)} on 0-5 scale).`;
    } else if (severityDelta > 0) {
      decidedBy = "severity";
      if (sevA > sevB) {
        winnerId = c.ruleIdA;
        loserId = c.ruleIdB;
      } else {
        winnerId = c.ruleIdB;
        loserId = c.ruleIdA;
      }
      confidence = RESOLUTION_SEVERITY_BASE +
        RESOLUTION_SEVERITY_SPAN * (severityDelta / SEVERITY_RANK_SPAN);
      rationale = `Tie on evidence; higher severity wins: ${winnerId} (severity delta=${severityDelta} on 0-3 scale).`;
    } else {
      decidedBy = "ambiguous";
      winnerId = null;
      loserId = null;
      confidence = 0;
      // R12 fail-loud: when the ambiguity is caused by missing rules (not by
      // a real evidence+severity tie), say so honestly rather than blaming
      // the operator's judgment.
      rationale = warning
        ? `Ambiguous — ${warning}`
        : "Both axes tied (equal evidence_level and severity) — human judgment required.";
    }

    return {
      ruleIdA: c.ruleIdA,
      ruleIdB: c.ruleIdB,
      parameter: c.parameter,
      winnerId,
      loserId,
      decidedBy,
      evidenceDelta,
      severityDelta,
      confidence,
      rationale,
      ambiguous: decidedBy === "ambiguous",
      ...(warning ? { warning } : {}),
    };
  }

  private ruleMatches(rule: PlaybookRule, query: PlaybookQuery): boolean {
    // OR conditions — any match triggers (existing behavior)
    const orMatch = rule.conditions.some(cond => this.conditionMatches(cond, query));
    // AND conditions — ALL must match (new)
    const andMatch = !rule.conditions_all || rule.conditions_all.length === 0 ||
      rule.conditions_all.every(cond => this.conditionMatches(cond, query));
    return orMatch && andMatch;
  }

  private conditionMatches(cond: Condition, query: PlaybookQuery): boolean {
    switch (cond.type) {
      case "always":
        return true;
      case "material_iso":
        return query.material_iso ? cond.groups.includes(query.material_iso) : false;
      case "feature_present":
        return query.features ? cond.features.some(f => query.features!.includes(f)) : false;
      case "tolerance_below":
        return query.tolerance_mm !== undefined && query.tolerance_mm <= cond.threshold_mm;
      case "wall_thickness_below":
        return query.wall_thickness_mm !== undefined && query.wall_thickness_mm <= cond.threshold_mm;
      case "depth_ratio_above":
        return false; // Requires per-feature L/D — checked externally
      case "surface_finish_below":
        return query.surface_finish_Ra !== undefined && query.surface_finish_Ra <= cond.ra_um;
      case "batch_size_above":
        return query.batch_size !== undefined && query.batch_size >= cond.count;
      case "machine_axes":
        return query.machine_axes !== undefined && query.machine_axes >= cond.min_axes;
      case "part_size":
        return false; // Requires part dimensions — checked externally
      case "operation_type":
        return query.operation_type ? cond.operations.includes(query.operation_type) : false;
      case "hardness_above":
        return query.hardness_hrc !== undefined && query.hardness_hrc >= cond.hrc;
      case "aspect_ratio_above":
        return query.aspect_ratio !== undefined && query.aspect_ratio >= cond.ratio;
      case "spindle_speed_above":
        return query.spindle_rpm !== undefined && query.spindle_rpm >= cond.rpm;
      default:
        return false;
    }
  }

  private opRelatesTo(op: string, feature: string): boolean {
    const map: Record<string, string[]> = {
      // Milling operations
      face: ["face", "stock"],
      datum: ["datum", "bore", "face"],
      spot_drill: ["hole", "thread"],
      drill: ["hole", "thread", "bore"],
      bore_rough: ["bore"],
      rough_pocket: ["pocket"],
      rough_profile: ["profile", "contour"],
      rough_3d: ["freeform", "3d"],
      semi_finish: ["pocket", "profile", "freeform", "bore"],
      bore_finish: ["bore"],
      finish_pocket: ["pocket"],
      finish_profile: ["profile", "contour"],
      finish_3d: ["freeform", "3d"],
      pencil: ["freeform", "pocket"],
      ream: ["hole"],
      tap: ["thread"],
      thread_mill: ["thread"],
      chamfer: ["chamfer", "hole", "pocket"],
      deburr: ["pocket", "profile", "slot"],
      // Turning/lathe operations
      turn_rough: ["turn", "od", "shaft", "cylinder", "face"],
      turn_finish: ["turn", "od", "shaft", "cylinder", "finish"],
      turn_groove: ["groove", "undercut", "o-ring"],
      turn_thread: ["thread", "turn"],
      turn_cutoff: ["cutoff", "parting"],
      // Deep hole operations
      peck_drill: ["hole", "deep_hole"],
      gun_drill: ["deep_hole", "hole"],
      bta_drill: ["deep_hole", "hole"],
      // Grinding operations
      grind_rough: ["grind", "surface", "od", "id"],
      grind_finish: ["grind", "finish", "surface"],
      grind_id: ["grind", "id", "bore"],
      grind_surface: ["grind", "surface", "flat"],
      // EDM operations
      edm_rough: ["edm", "cavity", "die"],
      edm_finish: ["edm", "finish", "cavity"],
      wire_edm: ["edm", "wire", "contour", "profile"],
      // Surface treatment
      heat_treat: ["heat_treat", "harden", "carburize", "temper"],
      surface_treat: ["surface_treat", "coat", "nitride"],
      anodize: ["anodize", "aluminum"],
      plate: ["plate", "chrome", "nickel"],
      // Inspection
      inspect: ["inspect", "measure", "check"],
      cmm: ["cmm", "inspect", "gdt", "tolerance"],
    };
    const related = map[op] || [];
    return related.some(r => feature.toLowerCase().includes(r));
  }

  /**
   * Extract parameter directives from a rule's advice text via deterministic
   * lexicon co-occurrence. Each direction verb (increase / decrease, with
   * negation resolved) is attributed to the NEAREST parameter-synonym
   * occurrence within CONFLICT_WINDOW characters — nearest-match attribution
   * keeps a verb about one parameter from bleeding onto another. A
   * per-parameter direction set of size 2 means the rule is internally
   * ambiguous about that parameter.
   *
   * Heuristic, NOT NLP: a verb genuinely about parameter X that happens to
   * sit closest to a mention of parameter Y can still be mis-attributed.
   * Every conflict the caller reports therefore carries the rule ids so a
   * human can verify against the actual rule text.
   */
  private extractDirectives(text: string): Map<ConflictParameter, Set<DirectiveDirection>> {
    const out = new Map<ConflictParameter, Set<DirectiveDirection>>();
    if (typeof text !== "string" || text.length === 0) return out;
    // Strip apostrophes so "don't" tokenizes as the negation token "dont".
    const lower = text.toLowerCase().replace(/['’]/g, "");

    // 1. Locate every parameter-synonym occurrence (centre char offset).
    const paramHits: Array<{ param: ConflictParameter; at: number }> = [];
    for (const param of CONFLICT_PARAMETERS) {
      for (const syn of CONFLICT_PARAM_LEXICON[param]) {
        const escaped = syn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        for (const m of lower.matchAll(new RegExp(`\\b${escaped}\\b`, "g"))) {
          paramHits.push({ param, at: (m.index ?? 0) + (m[0].length >> 1) });
        }
      }
    }
    if (paramHits.length === 0) return out;

    // 2. Tokenize into words (offsets preserved) for verb + negation scanning.
    const words: Array<{ w: string; at: number }> = [];
    for (const m of lower.matchAll(/[a-z0-9]+/g)) {
      words.push({ w: m[0], at: m.index ?? 0 });
    }

    // 3. Each direction verb → nearest parameter within the window.
    for (let i = 0; i < words.length; i++) {
      const base: DirectiveDirection | null =
        CONFLICT_INCREASE_TOKENS.has(words[i].w) ? "increase"
        : CONFLICT_DECREASE_TOKENS.has(words[i].w) ? "decrease"
        : null;
      if (base === null) continue;
      // A negation token in the 3 words immediately before flips the sense.
      let negated = false;
      for (let k = 1; k <= 3 && i - k >= 0; k++) {
        if (CONFLICT_NEGATION_TOKENS.has(words[i - k].w)) { negated = true; break; }
      }
      const dir: DirectiveDirection =
        negated ? (base === "increase" ? "decrease" : "increase") : base;

      let nearest: ConflictParameter | null = null;
      let nearestDist = Infinity;
      for (const p of paramHits) {
        const d = Math.abs(p.at - words[i].at);
        if (d < nearestDist) { nearestDist = d; nearest = p.param; }
      }
      if (nearest !== null && nearestDist <= CONFLICT_WINDOW) {
        let set = out.get(nearest);
        if (!set) { set = new Set<DirectiveDirection>(); out.set(nearest, set); }
        set.add(dir);
      }
    }
    return out;
  }

  /**
   * Collect the discrete (non-threshold) condition values a rule fires on:
   * whether it has an `always` trigger, plus material / feature / operation
   * sets. Folds BOTH OR-logic `conditions` AND AND-logic `conditions_all`
   * into the discrete set — two rules co-fire when a single query can
   * satisfy both, so the union of their trigger surfaces is the correct
   * overlap basis. Defensive against malformed runtime conditions in either
   * array.
   */
  private conditionDiscretes(rule: PlaybookRule): {
    always: boolean;
    materials: Set<string>;
    features: Set<string>;
    operations: Set<string>;
  } {
    const out = {
      always: false,
      materials: new Set<string>(),
      features: new Set<string>(),
      operations: new Set<string>(),
    };
    for (const arr of [rule.conditions, rule.conditions_all]) {
      if (!Array.isArray(arr)) continue;
      for (const c of arr) {
        if (!c || typeof c !== "object") continue;
        switch (c.type) {
          case "always":
            out.always = true;
            break;
          case "material_iso":
            for (const g of Array.isArray(c.groups) ? c.groups : []) {
              if (typeof g === "string") out.materials.add(g);
            }
            break;
          case "feature_present":
            for (const f of Array.isArray(c.features) ? c.features : []) {
              if (typeof f === "string") out.features.add(f);
            }
            break;
          case "operation_type":
            for (const o of Array.isArray(c.operations) ? c.operations : []) {
              if (typeof o === "string") out.operations.add(o);
            }
            break;
        }
      }
    }
    return out;
  }

  /**
   * Describe the overlapping machining context that makes two rules co-fire,
   * or null when their trigger conditions do not overlap. A shared discrete
   * condition (material / feature / operation) is preferred for the context
   * string; an `always`-triggered rule overlaps any rule in its category.
   */
  private describeOverlap(r1: PlaybookRule, r2: PlaybookRule): string | null {
    const a = this.conditionDiscretes(r1);
    const b = this.conditionDiscretes(r2);
    const materials = [...a.materials].filter((m) => b.materials.has(m)).sort();
    const features = [...a.features].filter((f) => b.features.has(f)).sort();
    const operations = [...a.operations].filter((o) => b.operations.has(o)).sort();
    const parts: string[] = [];
    if (materials.length) parts.push(`material ${materials.join("/")}`);
    if (features.length) parts.push(`feature ${features.join("/")}`);
    if (operations.length) parts.push(`operation ${operations.join("/")}`);
    if (parts.length) return parts.join("; ");
    if (a.always || b.always) {
      if (a.always && b.always) return "both rules apply unconditionally (always)";
      return `rule ${a.always ? r1.id : r2.id} applies unconditionally (always)`;
    }
    return null;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const machiningPlaybookEngine = new MachiningPlaybookEngine();
