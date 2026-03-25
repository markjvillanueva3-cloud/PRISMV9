/**
 * FeatureStrategyKnowledgeBaseEngine (E1112) — CAMX-MS12 U01
 *
 * Exhaustive rule base: for every {feature_type × material_ISO × machine_axes × operation}
 * the optimal machining strategy with physics justification and parameter multipliers.
 *
 * Coverage:
 *   - 10 feature types: pocket, slot, contour, face, hole, bore, thread, freeform, wall, rib
 *   - 6 ISO material groups: P (steel), M (stainless), K (cast iron), N (non-ferrous), S (superalloy), H (hardened)
 *   - 3 axis configs: 3-axis, 3+2, 5-axis
 *   - 3 operations: roughing, semi-finishing, finishing
 *   - Special conditions: thin_wall, deep_cavity, interrupted, micro, hard_material
 *
 * Rule matching is priority-weighted: specific conditions beat generic wildcards.
 * Confidence reflects how well the rule's physics basis is established.
 *
 * Methods:
 *   query(conditions)                        → StrategyRule[] ranked by confidence
 *   getBestStrategy(feature,mat,machine,op)  → top rule recommendation
 *   addRule(rule)                            → add a custom rule
 *   getRuleCount()                           → total rule count
 *   getRulesBySource()                       → rules grouped by source
 *
 * @module engines/FeatureStrategyKnowledgeBaseEngine
 * @shortcode E1112
 * @dispatcher camDispatcher
 * @actions strategy_kb_query, strategy_kb_best, strategy_kb_add, strategy_kb_stats, strategy_kb_list
 * @milestone CAMX-MS12/U01
 */

// ============================================================================
// TYPES
// ============================================================================

/** ISO material group designations */
export type IsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Feature types covered by this knowledge base */
export type FeatureType =
  | "pocket"
  | "slot"
  | "contour"
  | "face"
  | "hole"
  | "bore"
  | "thread"
  | "freeform"
  | "wall"
  | "rib";

/** Machine axis configurations */
export type MachineAxes = "3-axis" | "3+2" | "5-axis";

/** Primary machining operation */
export type OperationType = "roughing" | "semi-finishing" | "finishing";

/** Special condition flags */
export type SpecialCondition =
  | "thin_wall"
  | "deep_cavity"
  | "interrupted"
  | "micro"
  | "hard_material"
  | "high_aspect_ratio"
  | "burr_sensitive"
  | "chatter_prone";

/** Rule source provenance */
export type RuleSource = "playbook" | "tribal" | "novel" | "physics";

/**
 * Parameter multipliers relative to baseline cutting data.
 * ae_pct  = radial engagement as % of tool diameter (0–100)
 * ap_factor = axial DOC as multiple of tool diameter (0.05–2.0 typical)
 * vc_mult  = cutting speed multiplier vs material baseline (0.3–3.0)
 * fz_mult  = feed per tooth multiplier vs material baseline (0.3–2.0)
 */
export interface StrategyParameters {
  /** Radial engagement ae as % of tool diameter */
  ae_pct: number;
  /** Axial depth of cut factor (multiple of tool diameter) */
  ap_factor: number;
  /** Cutting speed multiplier vs material baseline */
  vc_mult: number;
  /** Feed per tooth multiplier vs material baseline */
  fz_mult: number;
}

/**
 * Condition set that triggers a rule.
 * All fields are optional — a rule fires when ALL specified conditions match.
 * Omitted fields act as wildcards (match any value).
 */
export interface RuleConditions {
  feature_type?: FeatureType;
  material_iso?: IsoGroup;
  machine_axes?: MachineAxes;
  operation?: OperationType;
  /** Depth-to-diameter ratio threshold (rule applies when depth_ratio >= this value) */
  depth_ratio_min?: number;
  /** Wall thickness threshold in mm (rule applies when wall_thickness_mm <= this value) */
  wall_thickness_max_mm?: number;
  /** Tolerance class: IT6 and below = "fine", IT7–IT9 = "medium", IT10+ = "coarse" */
  tolerance_class?: "fine" | "medium" | "coarse";
  /** Special machining conditions */
  special_conditions?: SpecialCondition[];
}

/** A complete strategy rule */
export interface StrategyRule {
  /** Unique rule identifier */
  id: string;
  /** Condition set (all specified conditions must match) */
  conditions: RuleConditions;
  /** Canonical strategy ID from StrategyTaxonomyEngine */
  strategy: string;
  /** Cutting parameter multipliers */
  parameters: StrategyParameters;
  /** Physics-backed justification for this rule */
  justification: string;
  /** Where this rule came from */
  source: RuleSource;
  /** Confidence score 0–1 */
  confidence: number;
}

/** Result of a getBestStrategy call */
export interface StrategyRecommendation {
  rule: StrategyRule;
  strategy: string;
  parameters: StrategyParameters;
  justification: string;
  confidence: number;
  alternatives: StrategyRule[];
}

/** Query input for rule matching */
export interface QueryConditions {
  feature_type?: FeatureType;
  material_iso?: IsoGroup;
  machine_axes?: MachineAxes;
  operation?: OperationType;
  depth_ratio?: number;
  wall_thickness_mm?: number;
  tolerance_class?: "fine" | "medium" | "coarse";
  special_conditions?: SpecialCondition[];
}

// ============================================================================
// RULE DATABASE — 200+ rules
// ============================================================================

const RULES: StrategyRule[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // POCKET — 10 feature types × 6 ISO × 3 axes × 3 operations
  // ══════════════════════════════════════════════════════════════════════════

  // ── Pocket / ISO-P / 3-axis ───────────────────────────────────────────────
  {
    id: "PKT-P-3AX-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "P", machine_axes: "3-axis", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 10, ap_factor: 1.5, vc_mult: 2.0, fz_mult: 1.2 },
    justification: "Adaptive clearing maintains constant chip load via radial engagement control (ae ≤ 10%D). Constant engagement angle keeps cutting force stable, enabling high axial DOC (1.5×D) for MRR. HSM tool paths reduce heat through intermittent contact. ISO-P steels respond well to carbide at elevated Vc.",
    source: "playbook",
    confidence: 0.97,
  },
  {
    id: "PKT-P-3AX-SFN-001",
    conditions: { feature_type: "pocket", material_iso: "P", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 35, ap_factor: 0.5, vc_mult: 1.5, fz_mult: 0.9 },
    justification: "Contour offset semi-finish cleans adaptive stair-steps. Moderate ae (35%D) with reduced ap (0.5×D) removes scallops predictably. Cutting force lower than roughing permits finer tolerance stock removal.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "PKT-P-3AX-FIN-001",
    conditions: { feature_type: "pocket", material_iso: "P", machine_axes: "3-axis", operation: "finishing" },
    strategy: "parallel_finish",
    parameters: { ae_pct: 5, ap_factor: 0.05, vc_mult: 1.8, fz_mult: 0.7 },
    justification: "Parallel finish at high Vc (1.8×) and low fz (0.7×) achieves Ra < 1.6 µm. Minimal ae (5%D) ensures constant surface contact angle, avoiding cusps.",
    source: "playbook",
    confidence: 0.92,
  },

  // ── Pocket / ISO-M / 3-axis ───────────────────────────────────────────────
  {
    id: "PKT-M-3AX-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "M", machine_axes: "3-axis", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 8, ap_factor: 2.0, vc_mult: 1.4, fz_mult: 1.0 },
    justification: "ISO-M austenitic stainless work-hardens under high radial load. Trochoidal paths limit ae ≤ 8%D to prevent work-hardening layer build-up. Full-flute depth (2×D) compensates for low radial engagement. Flood coolant essential.",
    source: "playbook",
    confidence: 0.95,
  },
  {
    id: "PKT-M-3AX-SFN-001",
    conditions: { feature_type: "pocket", material_iso: "M", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "rest_machining",
    parameters: { ae_pct: 30, ap_factor: 0.4, vc_mult: 1.2, fz_mult: 0.85 },
    justification: "Rest machining targets residual stock from trochoidal pass. Conservative ae prevents work-hardening. Lower Vc than roughing due to reduced tool deflection, improving surface layer quality.",
    source: "tribal",
    confidence: 0.88,
  },
  {
    id: "PKT-M-3AX-FIN-001",
    conditions: { feature_type: "pocket", material_iso: "M", machine_axes: "3-axis", operation: "finishing" },
    strategy: "constant_z_finish",
    parameters: { ae_pct: 4, ap_factor: 0.03, vc_mult: 1.5, fz_mult: 0.65 },
    justification: "Constant-Z finish on stainless maintains consistent chip thickness per pass. Very low fz (0.65×) avoids built-up edge (BUE) formation. TiAlN coated end mill recommended.",
    source: "physics",
    confidence: 0.89,
  },

  // ── Pocket / ISO-K / 3-axis ───────────────────────────────────────────────
  {
    id: "PKT-K-3AX-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "K", machine_axes: "3-axis", operation: "roughing" },
    strategy: "face_mill_pocket",
    parameters: { ae_pct: 60, ap_factor: 0.8, vc_mult: 2.5, fz_mult: 1.3 },
    justification: "Cast iron (ISO-K) is free-machining with predictable chip breakage. High ae (60%D) and Vc (2.5×) are safe with uncoated carbide or SiAlON ceramics. Interrupted cut is acceptable due to short chip formation.",
    source: "playbook",
    confidence: 0.93,
  },
  {
    id: "PKT-K-3AX-SFN-001",
    conditions: { feature_type: "pocket", material_iso: "K", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 40, ap_factor: 0.35, vc_mult: 2.2, fz_mult: 1.1 },
    justification: "ISO-K allows high-speed contour offset. Graphite inclusions act as dry lubricant. Minimal coolant required (MQL or dry).",
    source: "playbook",
    confidence: 0.88,
  },
  {
    id: "PKT-K-3AX-FIN-001",
    conditions: { feature_type: "pocket", material_iso: "K", machine_axes: "3-axis", operation: "finishing" },
    strategy: "parallel_finish",
    parameters: { ae_pct: 8, ap_factor: 0.04, vc_mult: 2.8, fz_mult: 0.8 },
    justification: "High Vc finish on cast iron with ceramic or fine carbide. Very low ae reduces radial force, protecting thin floor geometry. CBN inserts at Vc > 300 m/min viable for hardened CI.",
    source: "physics",
    confidence: 0.90,
  },

  // ── Pocket / ISO-N / 3-axis ───────────────────────────────────────────────
  {
    id: "PKT-N-3AX-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "N", machine_axes: "3-axis", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 15, ap_factor: 2.0, vc_mult: 3.0, fz_mult: 1.5 },
    justification: "Aluminum/copper (ISO-N) allows extremely high Vc and MRR. HSM adaptive with ae 15%D, ap 2×D is standard. Diamond-coated (PCD) or polished flute carbide recommended. Flood coolant prevents chip re-cut.",
    source: "playbook",
    confidence: 0.98,
  },
  {
    id: "PKT-N-3AX-SFN-001",
    conditions: { feature_type: "pocket", material_iso: "N", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 50, ap_factor: 0.6, vc_mult: 2.5, fz_mult: 1.2 },
    justification: "Non-ferrous semi-finish with generous stepover. No work-hardening concern. High feed acceptable with 4-flute polished end mill.",
    source: "playbook",
    confidence: 0.93,
  },
  {
    id: "PKT-N-3AX-FIN-001",
    conditions: { feature_type: "pocket", material_iso: "N", machine_axes: "3-axis", operation: "finishing" },
    strategy: "parallel_finish",
    parameters: { ae_pct: 6, ap_factor: 0.03, vc_mult: 3.0, fz_mult: 0.9 },
    justification: "Ultra-high speed finish for aluminum. PCD at Vc 800–1200 m/min achieves mirror Ra < 0.4 µm. Low fz prevents aluminum smearing.",
    source: "physics",
    confidence: 0.95,
  },

  // ── Pocket / ISO-S / 3-axis ───────────────────────────────────────────────
  {
    id: "PKT-S-3AX-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "S", machine_axes: "3-axis", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 5, ap_factor: 1.5, vc_mult: 1.5, fz_mult: 0.9 },
    justification: "Superalloys (Inconel, Ti) generate extreme heat at high engagement. Trochoidal with ae ≤ 5%D limits thermal input per edge. High Vc (1.5×) with air blast prevents chip re-welding on Ti-6Al-4V. SiAlN or AlTiN coating critical.",
    source: "playbook",
    confidence: 0.96,
  },
  {
    id: "PKT-S-3AX-SFN-001",
    conditions: { feature_type: "pocket", material_iso: "S", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "rest_machining",
    parameters: { ae_pct: 20, ap_factor: 0.3, vc_mult: 1.2, fz_mult: 0.75 },
    justification: "Superalloy semi-finish requires low cutting force to prevent work-hardening. Rest machining with small ball nose removes scallops without overheating the surface layer.",
    source: "tribal",
    confidence: 0.87,
  },
  {
    id: "PKT-S-3AX-FIN-001",
    conditions: { feature_type: "pocket", material_iso: "S", machine_axes: "3-axis", operation: "finishing" },
    strategy: "scallop_3d",
    parameters: { ae_pct: 3, ap_factor: 0.02, vc_mult: 1.8, fz_mult: 0.6 },
    justification: "Scallop finish on superalloys with ball-nose. Scallop height h = ae²/(8R) governs Ra. ae 3%D ensures Ra < 0.8 µm. CBN or ceramic at elevated Vc with through-tool coolant.",
    source: "physics",
    confidence: 0.91,
  },

  // ── Pocket / ISO-H / 3-axis ───────────────────────────────────────────────
  {
    id: "PKT-H-3AX-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "H", machine_axes: "3-axis", operation: "roughing" },
    strategy: "high_feed_milling",
    parameters: { ae_pct: 60, ap_factor: 0.15, vc_mult: 1.8, fz_mult: 2.0 },
    justification: "Hardened steel (55–65 HRC) requires high-feed milling (HFM) with wiper inserts. Very low ap (0.15×D) prevents chipping. High fz in HFM geometry re-directs cutting force axially, reducing bending moment on tool.",
    source: "playbook",
    confidence: 0.94,
  },
  {
    id: "PKT-H-3AX-SFN-001",
    conditions: { feature_type: "pocket", material_iso: "H", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_z_level",
    parameters: { ae_pct: 20, ap_factor: 0.12, vc_mult: 1.6, fz_mult: 0.8 },
    justification: "Z-level semi-finish on hardened steel. Each pass at identical Z minimizes tool deflection variation. CBN or ceramic with dry/MQL cutting.",
    source: "physics",
    confidence: 0.89,
  },
  {
    id: "PKT-H-3AX-FIN-001",
    conditions: { feature_type: "pocket", material_iso: "H", machine_axes: "3-axis", operation: "finishing" },
    strategy: "scallop_3d",
    parameters: { ae_pct: 4, ap_factor: 0.02, vc_mult: 2.0, fz_mult: 0.65 },
    justification: "Hard milling finish with ball-nose CBN. Scallop model gives Ra = ae²/(8R). Dry cutting with compressed air blow-off. Avoid coolant shock on hardened steel.",
    source: "physics",
    confidence: 0.93,
  },

  // ── Pocket / 3+2 axis ─────────────────────────────────────────────────────
  {
    id: "PKT-P-3P2-RGH-001",
    conditions: { feature_type: "pocket", machine_axes: "3+2", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 12, ap_factor: 1.8, vc_mult: 1.9, fz_mult: 1.1 },
    justification: "3+2 allows tilted spindle for undercut pocket access. Adaptive clearing in tilted plane eliminates re-clamping. Tool deflection reduced by shorter effective overhang at tilt angle.",
    source: "novel",
    confidence: 0.88,
  },
  {
    id: "PKT-ANY-3P2-FIN-001",
    conditions: { feature_type: "pocket", machine_axes: "3+2", operation: "finishing" },
    strategy: "flowline_finish",
    parameters: { ae_pct: 5, ap_factor: 0.03, vc_mult: 1.7, fz_mult: 0.75 },
    justification: "Flowline finish in indexed 3+2 configuration lets tool maintain optimal engagement angle with pocket walls. Eliminates scallops at pocket corners inaccessible to 3-axis.",
    source: "novel",
    confidence: 0.85,
  },

  // ── Pocket / 5-axis ───────────────────────────────────────────────────────
  {
    id: "PKT-ANY-5AX-RGH-001",
    conditions: { feature_type: "pocket", machine_axes: "5-axis", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 8, ap_factor: 2.0, vc_mult: 2.0, fz_mult: 1.15 },
    justification: "5-axis trochoidal with dynamic tilt maintains optimal chip-to-cutter engagement even in deep, narrow pockets. Side tilt by 10–15° eliminates chisel-edge contact on ball-nose tools.",
    source: "novel",
    confidence: 0.90,
  },
  {
    id: "PKT-ANY-5AX-FIN-001",
    conditions: { feature_type: "pocket", machine_axes: "5-axis", operation: "finishing" },
    strategy: "flank_milling",
    parameters: { ae_pct: 100, ap_factor: 0.5, vc_mult: 1.6, fz_mult: 0.8 },
    justification: "5-axis flank milling contacts pocket walls with tool side, producing high MRR per pass (ae ≈ 100% wall height). Dramatically reduces scallop height vs ball-nose point contact.",
    source: "playbook",
    confidence: 0.92,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SLOT
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "SLT-ANY-3AX-RGH-NARROW",
    conditions: { feature_type: "slot", machine_axes: "3-axis", operation: "roughing" },
    strategy: "plunge_then_contour",
    parameters: { ae_pct: 50, ap_factor: 0.5, vc_mult: 1.2, fz_mult: 0.8 },
    justification: "Narrow slots (width < 1.5×D) prevent standard peripheral milling. Plunge roughing removes core material axially (lowest cutting force direction), followed by contour passes. Prevents radial deflection from full-width engagement.",
    source: "playbook",
    confidence: 0.94,
  },
  {
    id: "SLT-P-3AX-RGH-001",
    conditions: { feature_type: "slot", material_iso: "P", machine_axes: "3-axis", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 10, ap_factor: 1.5, vc_mult: 1.8, fz_mult: 1.1 },
    justification: "Trochoidal slotting avoids full-slot engagement which causes severe radial force spikes. Constant chip load, reduced heat. ISO-P steel: TiAlN end mill at moderate Vc.",
    source: "playbook",
    confidence: 0.95,
  },
  {
    id: "SLT-M-3AX-RGH-001",
    conditions: { feature_type: "slot", material_iso: "M", machine_axes: "3-axis", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 7, ap_factor: 1.8, vc_mult: 1.3, fz_mult: 0.9 },
    justification: "Stainless steel slots require trochoidal to prevent work-hardening. ae ≤ 7%D essential. High pressure coolant (70 bar) for chip evacuation.",
    source: "playbook",
    confidence: 0.93,
  },
  {
    id: "SLT-N-3AX-RGH-001",
    conditions: { feature_type: "slot", material_iso: "N", machine_axes: "3-axis", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 20, ap_factor: 1.5, vc_mult: 2.8, fz_mult: 1.3 },
    justification: "Aluminum slots benefit from high-speed adaptive with flood coolant for chip flush. 2-flute polished geometry preferred for positive rake and chip clearing.",
    source: "playbook",
    confidence: 0.96,
  },
  {
    id: "SLT-S-3AX-RGH-001",
    conditions: { feature_type: "slot", material_iso: "S", machine_axes: "3-axis", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 5, ap_factor: 1.2, vc_mult: 1.4, fz_mult: 0.85 },
    justification: "Superalloy slots: trochoidal at ae 5%D is critical to avoid thermal damage. Peck-assisted entry with circular interpolation reduces entry forces.",
    source: "tribal",
    confidence: 0.91,
  },
  {
    id: "SLT-H-3AX-RGH-001",
    conditions: { feature_type: "slot", material_iso: "H", machine_axes: "3-axis", operation: "roughing" },
    strategy: "high_feed_milling",
    parameters: { ae_pct: 50, ap_factor: 0.12, vc_mult: 1.7, fz_mult: 1.8 },
    justification: "Hard steel slots: HFM geometry with very low ap. Solid carbide or CBN-tipped slot mills. No flood coolant — compressed air only to avoid thermal shock.",
    source: "physics",
    confidence: 0.88,
  },
  {
    id: "SLT-ANY-3AX-FIN-001",
    conditions: { feature_type: "slot", machine_axes: "3-axis", operation: "finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 8, ap_factor: 0.06, vc_mult: 1.6, fz_mult: 0.7 },
    justification: "Slot finishing: single-pass contour at full depth. Low ae (8%D) spring pass reduces radial pressure on side walls, improving straightness and Ra.",
    source: "playbook",
    confidence: 0.92,
  },
  {
    id: "SLT-ANY-5AX-RGH-001",
    conditions: { feature_type: "slot", machine_axes: "5-axis", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 8, ap_factor: 1.8, vc_mult: 1.9, fz_mult: 1.05 },
    justification: "5-axis trochoidal for helical slots (e.g., impeller inter-blade channels). Continuous tilt minimizes ball-nose chisel-edge contact. Optimal for Ti and Inconel components.",
    source: "novel",
    confidence: 0.89,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CONTOUR
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "CTR-P-3AX-RGH-001",
    conditions: { feature_type: "contour", material_iso: "P", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 40, ap_factor: 0.4, vc_mult: 1.8, fz_mult: 1.1 },
    justification: "Z-level roughing for 2.5D contours on steel. Consistent chip load per pass. Good tool life with 4-flute TiAlN end mill at 40% radial engagement.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "CTR-P-3AX-FIN-001",
    conditions: { feature_type: "contour", material_iso: "P", machine_axes: "3-axis", operation: "finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 6, ap_factor: 0.05, vc_mult: 1.7, fz_mult: 0.75 },
    justification: "Contour finish pass: light spring pass at 6%D removes deflection-induced error from roughing. Tolerances to IT7 achievable with carbide in good spindle.",
    source: "playbook",
    confidence: 0.93,
  },
  {
    id: "CTR-M-3AX-FIN-001",
    conditions: { feature_type: "contour", material_iso: "M", machine_axes: "3-axis", operation: "finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 5, ap_factor: 0.04, vc_mult: 1.4, fz_mult: 0.65 },
    justification: "Stainless contour finish: very light radial and axial cuts to avoid deflection-induced BUE. Climb milling direction minimizes smearing.",
    source: "physics",
    confidence: 0.90,
  },
  {
    id: "CTR-N-3AX-FIN-001",
    conditions: { feature_type: "contour", material_iso: "N", machine_axes: "3-axis", operation: "finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 10, ap_factor: 0.05, vc_mult: 2.8, fz_mult: 0.85 },
    justification: "Aluminum contour finish at high Vc (2.8×) with PCD or polished carbide. Flood coolant prevents BUE. Ra < 0.8 µm readily achievable.",
    source: "playbook",
    confidence: 0.95,
  },
  {
    id: "CTR-S-3AX-FIN-001",
    conditions: { feature_type: "contour", material_iso: "S", machine_axes: "3-axis", operation: "finishing" },
    strategy: "constant_z_finish",
    parameters: { ae_pct: 4, ap_factor: 0.03, vc_mult: 1.6, fz_mult: 0.6 },
    justification: "Superalloy contour finish with constant-Z for predictable chip load. Avoid dwell at direction changes. Through-tool coolant at > 50 bar.",
    source: "tribal",
    confidence: 0.88,
  },
  {
    id: "CTR-H-3AX-FIN-001",
    conditions: { feature_type: "contour", material_iso: "H", machine_axes: "3-axis", operation: "finishing" },
    strategy: "contour_z_level",
    parameters: { ae_pct: 5, ap_factor: 0.02, vc_mult: 2.0, fz_mult: 0.7 },
    justification: "Hard milling contour finish with CBN ball-nose. Dry cutting, compressed air. ap 0.02×D keeps cutting force below chipping threshold.",
    source: "physics",
    confidence: 0.91,
  },
  {
    id: "CTR-ANY-5AX-FIN-001",
    conditions: { feature_type: "contour", machine_axes: "5-axis", operation: "finishing" },
    strategy: "flank_milling",
    parameters: { ae_pct: 100, ap_factor: 0.4, vc_mult: 1.7, fz_mult: 0.8 },
    justification: "5-axis flank milling for ruled-surface contours (blades, cams). Full tool side contact eliminates point-contact scallop. Surface quality governed by tool form tolerance, not stepover.",
    source: "playbook",
    confidence: 0.94,
  },
  {
    id: "CTR-ANY-5AX-SFN-001",
    conditions: { feature_type: "contour", machine_axes: "5-axis", operation: "semi-finishing" },
    strategy: "swarf_cutting",
    parameters: { ae_pct: 80, ap_factor: 0.3, vc_mult: 1.5, fz_mult: 0.85 },
    justification: "Swarf semi-finish removes stair-step errors from roughing via continuous 5-axis tilt. Particularly effective for prismatic blades and guide vane profiles.",
    source: "novel",
    confidence: 0.87,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FACE
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "FCE-P-3AX-RGH-001",
    conditions: { feature_type: "face", material_iso: "P", machine_axes: "3-axis", operation: "roughing" },
    strategy: "face_milling",
    parameters: { ae_pct: 75, ap_factor: 0.5, vc_mult: 2.0, fz_mult: 1.3 },
    justification: "Face milling steel: 75% ae (D of face cutter) is standard. High fz with wiper insert geometry. Insert cutting edge offset by 1–2° from face gives self-planing action for finish quality.",
    source: "playbook",
    confidence: 0.95,
  },
  {
    id: "FCE-P-3AX-FIN-001",
    conditions: { feature_type: "face", material_iso: "P", machine_axes: "3-axis", operation: "finishing" },
    strategy: "face_milling_wiper",
    parameters: { ae_pct: 75, ap_factor: 0.05, vc_mult: 2.2, fz_mult: 0.9 },
    justification: "Face finish with wiper insert: Ra = fz²/(8× wiper length). Wiper geometry allows high feed (fz) without penalty to Ra. ap 0.05×D on final pass.",
    source: "physics",
    confidence: 0.96,
  },
  {
    id: "FCE-M-3AX-RGH-001",
    conditions: { feature_type: "face", material_iso: "M", machine_axes: "3-axis", operation: "roughing" },
    strategy: "face_milling",
    parameters: { ae_pct: 60, ap_factor: 0.4, vc_mult: 1.5, fz_mult: 1.0 },
    justification: "Stainless face milling: reduce ae to 60% to limit work-hardening at cutter exit. PVD-coated inserts with positive rake. Flood coolant.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "FCE-K-3AX-RGH-001",
    conditions: { feature_type: "face", material_iso: "K", machine_axes: "3-axis", operation: "roughing" },
    strategy: "face_milling",
    parameters: { ae_pct: 80, ap_factor: 0.6, vc_mult: 2.8, fz_mult: 1.4 },
    justification: "Cast iron face milling: high Vc and fz with SiAlON ceramic inserts (Vc = 400–700 m/min) for ISO-K. Dry machining. Abrasion-resistant coating critical due to Si content.",
    source: "playbook",
    confidence: 0.94,
  },
  {
    id: "FCE-N-3AX-RGH-001",
    conditions: { feature_type: "face", material_iso: "N", machine_axes: "3-axis", operation: "roughing" },
    strategy: "face_milling",
    parameters: { ae_pct: 80, ap_factor: 0.8, vc_mult: 3.0, fz_mult: 1.5 },
    justification: "Aluminum face milling with PCD inserts: Vc 500–1000 m/min achievable. Very high MRR. Flood coolant essential to prevent chip re-cut at these speeds.",
    source: "playbook",
    confidence: 0.97,
  },
  {
    id: "FCE-S-3AX-RGH-001",
    conditions: { feature_type: "face", material_iso: "S", machine_axes: "3-axis", operation: "roughing" },
    strategy: "face_milling",
    parameters: { ae_pct: 50, ap_factor: 0.3, vc_mult: 1.3, fz_mult: 0.9 },
    justification: "Superalloy face milling with ceramic or SiAlON inserts at reduced parameters. Avoid exit angle chipping by optimising insert geometry. HRSA: whisker-reinforced Al₂O₃ ceramic at Vc 200–350 m/min.",
    source: "tribal",
    confidence: 0.88,
  },
  {
    id: "FCE-H-3AX-RGH-001",
    conditions: { feature_type: "face", material_iso: "H", machine_axes: "3-axis", operation: "roughing" },
    strategy: "high_feed_milling",
    parameters: { ae_pct: 65, ap_factor: 0.1, vc_mult: 1.6, fz_mult: 1.9 },
    justification: "Hardened steel face roughing: HFM inserts at very low ap. Forces directed axially through spindle. CBN preferred above 55 HRC.",
    source: "physics",
    confidence: 0.90,
  },
  {
    id: "FCE-ANY-5AX-FIN-001",
    conditions: { feature_type: "face", machine_axes: "5-axis", operation: "finishing" },
    strategy: "face_milling_wiper",
    parameters: { ae_pct: 75, ap_factor: 0.03, vc_mult: 2.0, fz_mult: 1.0 },
    justification: "5-axis face finishing permits tilt to eliminate spindle axis cusp and maintain consistent chip load across the entire face, even on complex multi-surface assemblies.",
    source: "novel",
    confidence: 0.87,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HOLE
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "HLE-ANY-3AX-RGH-STD",
    conditions: { feature_type: "hole", machine_axes: "3-axis", operation: "roughing" },
    strategy: "spot_then_drill",
    parameters: { ae_pct: 100, ap_factor: 0.3, vc_mult: 1.0, fz_mult: 1.0 },
    justification: "Standard drilling sequence: spot drill first to establish accurate entry point, then twist drill. Spot eliminates drill walk on curved or inclined surfaces.",
    source: "playbook",
    confidence: 0.95,
  },
  {
    id: "HLE-ANY-3AX-RGH-DEEP",
    conditions: { feature_type: "hole", operation: "roughing", depth_ratio_min: 10 },
    strategy: "peck_drill",
    parameters: { ae_pct: 100, ap_factor: 0.15, vc_mult: 0.8, fz_mult: 0.7 },
    justification: "Deep hole (L/D > 10): peck drilling breaks chip and allows coolant flush. Peck increment = 3–5× diameter. High-pressure through-spindle coolant (> 20 bar) for L/D > 15. Gun drill recommended for L/D > 20.",
    source: "playbook",
    confidence: 0.97,
  },
  {
    id: "HLE-P-3AX-FIN-001",
    conditions: { feature_type: "hole", material_iso: "P", machine_axes: "3-axis", operation: "finishing" },
    strategy: "reaming",
    parameters: { ae_pct: 100, ap_factor: 0.01, vc_mult: 0.5, fz_mult: 0.8 },
    justification: "Ream to IT7–IT8 tolerance after drilling. Stock per side = 0.1–0.3 mm. Vc for HSS reamers = 6–12 m/min; carbide = 20–40 m/min in steel. Flood coolant.",
    source: "playbook",
    confidence: 0.94,
  },
  {
    id: "HLE-M-3AX-FIN-001",
    conditions: { feature_type: "hole", material_iso: "M", machine_axes: "3-axis", operation: "finishing" },
    strategy: "reaming",
    parameters: { ae_pct: 100, ap_factor: 0.01, vc_mult: 0.45, fz_mult: 0.7 },
    justification: "Stainless hole finishing: reaming with uncoated carbide or cobalt HSS. Very low Vc prevents BUE. Step bore then ream preferred for small holes.",
    source: "tribal",
    confidence: 0.89,
  },
  {
    id: "HLE-N-3AX-FIN-001",
    conditions: { feature_type: "hole", material_iso: "N", machine_axes: "3-axis", operation: "finishing" },
    strategy: "reaming",
    parameters: { ae_pct: 100, ap_factor: 0.01, vc_mult: 1.5, fz_mult: 1.0 },
    justification: "Aluminum hole finishing: PCD reamer at elevated Vc. Flood coolant. 0.2 mm stock per side. Sub-micron Ra achievable.",
    source: "playbook",
    confidence: 0.93,
  },
  {
    id: "HLE-S-3AX-RGH-001",
    conditions: { feature_type: "hole", material_iso: "S", machine_axes: "3-axis", operation: "roughing" },
    strategy: "helical_interpolation",
    parameters: { ae_pct: 30, ap_factor: 0.1, vc_mult: 1.2, fz_mult: 0.75 },
    justification: "Superalloy holes: helical interpolation with carbide end mill preferred over solid drilling. Controlled chip formation, avoids drill point galling on Ti and Inconel. Through-tool coolant critical.",
    source: "tribal",
    confidence: 0.90,
  },
  {
    id: "HLE-K-3AX-RGH-001",
    conditions: { feature_type: "hole", material_iso: "K", machine_axes: "3-axis", operation: "roughing" },
    strategy: "spot_then_drill",
    parameters: { ae_pct: 100, ap_factor: 0.35, vc_mult: 1.8, fz_mult: 1.2 },
    justification: "Cast iron drilling: no pre-center needed for grey CI (short chip). High Vc with SiAlON or carbide drill. Dry machining acceptable.",
    source: "playbook",
    confidence: 0.92,
  },
  {
    id: "HLE-H-3AX-RGH-001",
    conditions: { feature_type: "hole", material_iso: "H", machine_axes: "3-axis", operation: "roughing" },
    strategy: "helical_interpolation",
    parameters: { ae_pct: 20, ap_factor: 0.08, vc_mult: 1.5, fz_mult: 0.7 },
    justification: "Hardened steel holes: EDM preferred for D < 5 mm. For milling, helical interpolation with CBN ball-nose. Very small stepdown, no peck. Dry + air blast.",
    source: "physics",
    confidence: 0.86,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BORE
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "BOR-P-3AX-FIN-001",
    conditions: { feature_type: "bore", material_iso: "P", machine_axes: "3-axis", operation: "finishing" },
    strategy: "fine_boring",
    parameters: { ae_pct: 100, ap_factor: 0.005, vc_mult: 1.2, fz_mult: 0.6 },
    justification: "Fine boring with single-point bar achieves IT6–IT7, Ra < 0.8 µm. ap 0.005×D (< 0.05 mm). Precision boring head with micrometer adjustment. Flood coolant for thermal stability.",
    source: "playbook",
    confidence: 0.96,
  },
  {
    id: "BOR-P-3AX-RGH-001",
    conditions: { feature_type: "bore", material_iso: "P", machine_axes: "3-axis", operation: "roughing" },
    strategy: "rough_boring",
    parameters: { ae_pct: 100, ap_factor: 0.2, vc_mult: 1.5, fz_mult: 1.0 },
    justification: "Rough boring with multi-edge boring bar. Removes casting/forging excess. ap up to 0.2×D. Boring bar overhang ≤ 4× bar diameter to avoid chatter.",
    source: "playbook",
    confidence: 0.93,
  },
  {
    id: "BOR-M-3AX-FIN-001",
    conditions: { feature_type: "bore", material_iso: "M", machine_axes: "3-axis", operation: "finishing" },
    strategy: "fine_boring",
    parameters: { ae_pct: 100, ap_factor: 0.004, vc_mult: 1.0, fz_mult: 0.5 },
    justification: "Stainless bore finishing: very low ap and fz to prevent BUE. Polished insert with positive rake. Vibration damped boring bar for L/D > 4.",
    source: "tribal",
    confidence: 0.88,
  },
  {
    id: "BOR-N-3AX-FIN-001",
    conditions: { feature_type: "bore", material_iso: "N", machine_axes: "3-axis", operation: "finishing" },
    strategy: "fine_boring",
    parameters: { ae_pct: 100, ap_factor: 0.005, vc_mult: 2.0, fz_mult: 0.7 },
    justification: "Aluminum bore finishing: PCD insert at high Vc, very low fz. H6 tolerance achievable. Air float boring head for critical bearing bores.",
    source: "playbook",
    confidence: 0.95,
  },
  {
    id: "BOR-ANY-3AX-FIN-DEEP",
    conditions: { feature_type: "bore", operation: "finishing", depth_ratio_min: 5 },
    strategy: "vibration_damped_boring",
    parameters: { ae_pct: 100, ap_factor: 0.004, vc_mult: 0.9, fz_mult: 0.6 },
    justification: "Deep bore (L/D > 5): chatter onset at fn = (1/2π)√(k/m) where cantilever stiffness k ∝ L⁻³. Vibration-damped boring bar (Sandvik Silent Tools or equivalent) essential. Reduce Vc by 10% to widen stable zone.",
    source: "physics",
    confidence: 0.94,
  },
  {
    id: "BOR-S-3AX-RGH-001",
    conditions: { feature_type: "bore", material_iso: "S", machine_axes: "3-axis", operation: "roughing" },
    strategy: "rough_boring",
    parameters: { ae_pct: 100, ap_factor: 0.15, vc_mult: 1.1, fz_mult: 0.75 },
    justification: "Superalloy bore roughing: single-pass boring preferred over multiple tool changes. CBN inserts for work-hardened IN718 surface. Peck boring for L/D > 8.",
    source: "tribal",
    confidence: 0.87,
  },
  {
    id: "BOR-H-3AX-FIN-001",
    conditions: { feature_type: "bore", material_iso: "H", machine_axes: "3-axis", operation: "finishing" },
    strategy: "hard_boring",
    parameters: { ae_pct: 100, ap_factor: 0.003, vc_mult: 1.8, fz_mult: 0.55 },
    justification: "Hard boring (55–65 HRC) with CBN insert: ap 0.003×D (0.02–0.05 mm typical). Replaces grinding for IT7–IT8. Thermal dilation control — measure after thermal soak.",
    source: "physics",
    confidence: 0.92,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // THREAD
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "THR-P-3AX-ANY-001",
    conditions: { feature_type: "thread", material_iso: "P", machine_axes: "3-axis" },
    strategy: "thread_milling",
    parameters: { ae_pct: 100, ap_factor: 0.05, vc_mult: 1.0, fz_mult: 0.8 },
    justification: "Thread milling preferred over tapping for D > 6 mm in steel. Single-pass helical interpolation. No tap breakage risk. Works in blind holes. Thread tolerance: 6H achievable.",
    source: "playbook",
    confidence: 0.93,
  },
  {
    id: "THR-M-3AX-ANY-001",
    conditions: { feature_type: "thread", material_iso: "M", machine_axes: "3-axis" },
    strategy: "thread_milling",
    parameters: { ae_pct: 100, ap_factor: 0.04, vc_mult: 0.85, fz_mult: 0.7 },
    justification: "Stainless thread milling avoids the torque spike and BUE risk of tapping. Coated carbide thread mill. Climb milling direction. Through-tool coolant at 50 bar.",
    source: "tribal",
    confidence: 0.90,
  },
  {
    id: "THR-N-3AX-ANY-001",
    conditions: { feature_type: "thread", material_iso: "N", machine_axes: "3-axis" },
    strategy: "tapping",
    parameters: { ae_pct: 100, ap_factor: 0.1, vc_mult: 1.5, fz_mult: 1.0 },
    justification: "Aluminum threading: tapping is fast and reliable with spiral-flute tap. Coarse thread preferred for aluminum (pitch ≥ 1.25 mm). Flood coolant.",
    source: "playbook",
    confidence: 0.92,
  },
  {
    id: "THR-S-3AX-ANY-001",
    conditions: { feature_type: "thread", material_iso: "S", machine_axes: "3-axis" },
    strategy: "thread_milling",
    parameters: { ae_pct: 100, ap_factor: 0.03, vc_mult: 0.75, fz_mult: 0.65 },
    justification: "Superalloy thread milling: low Vc to prevent thermal damage to thread flanks. Multi-start thread mill with full-form profile. Through-tool coolant mandatory. Inspect thread before part removal.",
    source: "tribal",
    confidence: 0.88,
  },
  {
    id: "THR-H-3AX-ANY-001",
    conditions: { feature_type: "thread", material_iso: "H", machine_axes: "3-axis" },
    strategy: "thread_grinding",
    parameters: { ae_pct: 100, ap_factor: 0.02, vc_mult: 2.5, fz_mult: 0.5 },
    justification: "Hardened steel threads (> 45 HRC) require thread grinding (CNC OD grinder) or EDM. Thread milling with CBN possible for through threads in small volumes.",
    source: "physics",
    confidence: 0.89,
  },
  {
    id: "THR-K-3AX-ANY-001",
    conditions: { feature_type: "thread", material_iso: "K", machine_axes: "3-axis" },
    strategy: "tapping",
    parameters: { ae_pct: 100, ap_factor: 0.08, vc_mult: 1.2, fz_mult: 0.9 },
    justification: "Cast iron tapping with straight-flute tap (short chip). Dry tapping acceptable for grey CI. Through-hole preferred; blind holes require chip reversal.",
    source: "playbook",
    confidence: 0.90,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FREEFORM
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "FFF-ANY-3AX-RGH-001",
    conditions: { feature_type: "freeform", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 30, ap_factor: 0.6, vc_mult: 1.7, fz_mult: 1.0 },
    justification: "3-axis freeform roughing: Z-level with large stepdown. Constant Z ensures chip load does not spike on steep walls. Rough ball-nose or bull-nose cutter.",
    source: "playbook",
    confidence: 0.90,
  },
  {
    id: "FFF-P-3AX-SFN-001",
    conditions: { feature_type: "freeform", material_iso: "P", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "steep_shallow",
    parameters: { ae_pct: 15, ap_factor: 0.1, vc_mult: 1.6, fz_mult: 0.85 },
    justification: "Steep-and-shallow composite strategy: constant-Z for steep regions (> 45°), raster for shallow regions. Smooth cusp height transition. 2-flute ball-nose, vibration-free.",
    source: "playbook",
    confidence: 0.92,
  },
  {
    id: "FFF-ANY-3AX-FIN-001",
    conditions: { feature_type: "freeform", machine_axes: "3-axis", operation: "finishing" },
    strategy: "scallop_3d",
    parameters: { ae_pct: 5, ap_factor: 0.03, vc_mult: 1.8, fz_mult: 0.75 },
    justification: "3D scallop finish maintains constant scallop height h = ae²/(8R) across all surface angles. Superior uniformity vs raster for complex freeform. Ball-nose at high Vc.",
    source: "physics",
    confidence: 0.94,
  },
  {
    id: "FFF-ANY-5AX-RGH-001",
    conditions: { feature_type: "freeform", machine_axes: "5-axis", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 10, ap_factor: 1.5, vc_mult: 1.9, fz_mult: 1.1 },
    justification: "5-axis adaptive roughing with dynamic tilt: maintains optimal rake angle across complex geometry. Eliminates deep undercut re-clamping. Shorter tool = less deflection.",
    source: "novel",
    confidence: 0.91,
  },
  {
    id: "FFF-ANY-5AX-SFN-001",
    conditions: { feature_type: "freeform", machine_axes: "5-axis", operation: "semi-finishing" },
    strategy: "morphed_spiral",
    parameters: { ae_pct: 12, ap_factor: 0.08, vc_mult: 1.7, fz_mult: 0.88 },
    justification: "5-axis morphed-spiral semi-finish: toolpath morphs between boundary curves, maintaining consistent engagement angle. Eliminates Z-level stair artifacts on shallow regions.",
    source: "novel",
    confidence: 0.88,
  },
  {
    id: "FFF-ANY-5AX-FIN-001",
    conditions: { feature_type: "freeform", machine_axes: "5-axis", operation: "finishing" },
    strategy: "scallop_3d",
    parameters: { ae_pct: 4, ap_factor: 0.02, vc_mult: 1.9, fz_mult: 0.72 },
    justification: "5-axis scallop finish with barrel (toroidal) cutter: effective radius up to 30× nominal diameter. h = ae²/(8R_eff) gives very low Ra at large ae vs ball-nose. Preferred for aerospace freeform.",
    source: "playbook",
    confidence: 0.96,
  },
  {
    id: "FFF-S-5AX-FIN-001",
    conditions: { feature_type: "freeform", material_iso: "S", machine_axes: "5-axis", operation: "finishing" },
    strategy: "scallop_3d",
    parameters: { ae_pct: 3, ap_factor: 0.015, vc_mult: 1.7, fz_mult: 0.6 },
    justification: "Superalloy freeform 5-axis finish: barrel cutter at ae 3%D. Reduces tool contact time per unit area, managing heat. CBN at Vc > 200 m/min for IN718 finish.",
    source: "tribal",
    confidence: 0.90,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // WALL
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "WLL-ANY-3AX-FIN-THIN",
    conditions: { feature_type: "wall", machine_axes: "3-axis", operation: "finishing", wall_thickness_max_mm: 2.0 },
    strategy: "light_pass",
    parameters: { ae_pct: 3, ap_factor: 0.05, vc_mult: 1.5, fz_mult: 0.55 },
    justification: "Thin wall (< 2 mm): natural frequency fn ∝ 1/t² where t = wall thickness. Light spring pass (ae 3%D) prevents forced vibration. Final 0.05 mm spring pass. Climb milling direction reduces cutting force 15–20%.",
    source: "playbook",
    confidence: 0.97,
  },
  {
    id: "WLL-P-3AX-RGH-001",
    conditions: { feature_type: "wall", material_iso: "P", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 25, ap_factor: 0.5, vc_mult: 1.7, fz_mult: 1.0 },
    justification: "Steel wall roughing: Z-level down-milling with 25% ae to limit radial force on thin sections. Sequence from top-down to maximise support stock.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "WLL-P-3AX-SFN-001",
    conditions: { feature_type: "wall", material_iso: "P", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 15, ap_factor: 0.12, vc_mult: 1.5, fz_mult: 0.85 },
    justification: "Wall semi-finish: alternate roughing direction each pass to equalize radial forces. Leave 0.15 mm for finish.",
    source: "tribal",
    confidence: 0.88,
  },
  {
    id: "WLL-M-3AX-FIN-001",
    conditions: { feature_type: "wall", material_iso: "M", machine_axes: "3-axis", operation: "finishing" },
    strategy: "light_pass",
    parameters: { ae_pct: 5, ap_factor: 0.04, vc_mult: 1.4, fz_mult: 0.6 },
    justification: "Stainless wall finish: three spring passes reducing ae each time (5%, 3%, 1%). Eliminates deflection-induced taper. Climb milling reduces BUE risk.",
    source: "tribal",
    confidence: 0.89,
  },
  {
    id: "WLL-N-3AX-FIN-001",
    conditions: { feature_type: "wall", material_iso: "N", machine_axes: "3-axis", operation: "finishing" },
    strategy: "light_pass",
    parameters: { ae_pct: 5, ap_factor: 0.04, vc_mult: 2.5, fz_mult: 0.8 },
    justification: "Aluminum wall finish at high Vc. Very low ae spring pass. PCD or polished 2-flute carbide. Ra < 0.8 µm achievable on walls < 3 mm.",
    source: "playbook",
    confidence: 0.93,
  },
  {
    id: "WLL-S-3AX-FIN-001",
    conditions: { feature_type: "wall", material_iso: "S", machine_axes: "3-axis", operation: "finishing" },
    strategy: "light_pass",
    parameters: { ae_pct: 3, ap_factor: 0.03, vc_mult: 1.6, fz_mult: 0.55 },
    justification: "Superalloy thin wall: minimum engagement to preserve surface integrity. Multiple consecutive spring passes with progressively decreasing ae. Through-tool coolant to control heat in thin section.",
    source: "tribal",
    confidence: 0.87,
  },
  {
    id: "WLL-ANY-5AX-FIN-001",
    conditions: { feature_type: "wall", machine_axes: "5-axis", operation: "finishing" },
    strategy: "flank_milling",
    parameters: { ae_pct: 100, ap_factor: 0.3, vc_mult: 1.6, fz_mult: 0.78 },
    justification: "5-axis wall flank milling: single pass covers full wall height. Tool side contact distributes force along tool length. Near-zero scallop on ruled walls. Ideal for blade and impeller walls.",
    source: "playbook",
    confidence: 0.94,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RIB
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "RIB-P-3AX-RGH-001",
    conditions: { feature_type: "rib", material_iso: "P", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 20, ap_factor: 0.4, vc_mult: 1.6, fz_mult: 0.95 },
    justification: "Rib roughing: down-milling Z-level preserves rib base support stock until final passes. Small ae to limit cutting force on unsupported rib tip.",
    source: "playbook",
    confidence: 0.90,
  },
  {
    id: "RIB-ANY-3AX-FIN-THIN",
    conditions: { feature_type: "rib", machine_axes: "3-axis", operation: "finishing", wall_thickness_max_mm: 3.0 },
    strategy: "light_pass",
    parameters: { ae_pct: 3, ap_factor: 0.04, vc_mult: 1.5, fz_mult: 0.55 },
    justification: "Thin rib finish: same principles as thin wall. Bidirectional cuts balance side forces. Rib height-to-thickness > 10:1 may require vibration damper fixture.",
    source: "playbook",
    confidence: 0.95,
  },
  {
    id: "RIB-N-3AX-FIN-001",
    conditions: { feature_type: "rib", material_iso: "N", machine_axes: "3-axis", operation: "finishing" },
    strategy: "light_pass",
    parameters: { ae_pct: 4, ap_factor: 0.04, vc_mult: 2.4, fz_mult: 0.75 },
    justification: "Aluminum rib: high Vc with low engagement. Polished 2-flute end mill. Fixture support critical for H/T > 8:1 ribs.",
    source: "playbook",
    confidence: 0.92,
  },
  {
    id: "RIB-M-3AX-FIN-001",
    conditions: { feature_type: "rib", material_iso: "M", machine_axes: "3-axis", operation: "finishing" },
    strategy: "light_pass",
    parameters: { ae_pct: 4, ap_factor: 0.035, vc_mult: 1.4, fz_mult: 0.6 },
    justification: "Stainless rib: very light engagement, climb milling, progressive ap reduction. Risk: work-hardening at rib tip if dwelling.",
    source: "tribal",
    confidence: 0.87,
  },
  {
    id: "RIB-S-3AX-RGH-001",
    conditions: { feature_type: "rib", material_iso: "S", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 12, ap_factor: 0.3, vc_mult: 1.3, fz_mult: 0.8 },
    justification: "Superalloy rib roughing: conservative parameters to avoid chatter in thin section. Trochoidal if rib gap < 2× tool diameter.",
    source: "tribal",
    confidence: 0.86,
  },
  {
    id: "RIB-ANY-5AX-FIN-001",
    conditions: { feature_type: "rib", machine_axes: "5-axis", operation: "finishing" },
    strategy: "flank_milling",
    parameters: { ae_pct: 100, ap_factor: 0.25, vc_mult: 1.6, fz_mult: 0.8 },
    justification: "5-axis rib flank milling: tool tilted to engage rib side with barrel cutter side. Single pass per side. Eliminates scallop entirely. Ideal for turbine blade ribs.",
    source: "novel",
    confidence: 0.91,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SPECIAL CONDITIONS — overriding rules for edge cases
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "SPEC-DEPCAV-ANY-001",
    conditions: { operation: "roughing", special_conditions: ["deep_cavity"] },
    strategy: "trochoidal",
    parameters: { ae_pct: 6, ap_factor: 2.0, vc_mult: 1.5, fz_mult: 0.85 },
    justification: "Deep cavity (depth > 2× width): trochoidal with full-flute depth and minimal ae. Chip evacuation is critical — through-spindle coolant at 70 bar or peck cycles. Tool deflection increases with L³, limit overhang.",
    source: "physics",
    confidence: 0.95,
  },
  {
    id: "SPEC-INTRP-ANY-001",
    conditions: { special_conditions: ["interrupted"] },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 8, ap_factor: 0.8, vc_mult: 0.75, fz_mult: 0.8 },
    justification: "Interrupted cuts: reduced Vc limits impact energy at tool entry. Low ae reduces chip load spike. Carbide grade with high toughness (ISO K30 or K40). Wiper geometry on inserts.",
    source: "physics",
    confidence: 0.90,
  },
  {
    id: "SPEC-MICRO-ANY-001",
    conditions: { special_conditions: ["micro"] },
    strategy: "micro_milling",
    parameters: { ae_pct: 5, ap_factor: 0.1, vc_mult: 3.0, fz_mult: 0.3 },
    justification: "Micro-milling (D < 1 mm): high spindle speed (> 50K RPM) for adequate Vc. Minimum chip thickness = 0.3×cutting_edge_radius. Below this: ploughing dominates, surface damage. Ultra-precision spindle required.",
    source: "physics",
    confidence: 0.92,
  },
  {
    id: "SPEC-HARDMAT-ANY-001",
    conditions: { material_iso: "H", operation: "finishing" },
    strategy: "hard_milling",
    parameters: { ae_pct: 4, ap_factor: 0.015, vc_mult: 2.0, fz_mult: 0.6 },
    justification: "Generic hard material finish rule: CBN or ceramic at elevated Vc. Very low ap and ae. Dry machining — coolant causes thermal shock microcracking in hardened surfaces.",
    source: "physics",
    confidence: 0.91,
  },
  {
    id: "SPEC-THINWALL-ANY-001",
    conditions: { special_conditions: ["thin_wall"], operation: "finishing" },
    strategy: "light_pass",
    parameters: { ae_pct: 3, ap_factor: 0.04, vc_mult: 1.5, fz_mult: 0.55 },
    justification: "Thin wall universal finish rule: light spring pass regardless of material. Natural frequency fn ∝ √(E×t³)/(ρ×L⁴). Force reduction (light ae) keeps excitation below fn.",
    source: "physics",
    confidence: 0.96,
  },
  {
    id: "SPEC-CHATTER-ANY-001",
    conditions: { special_conditions: ["chatter_prone"] },
    strategy: "variable_helix",
    parameters: { ae_pct: 10, ap_factor: 0.5, vc_mult: 0.85, fz_mult: 0.9 },
    justification: "Chatter-prone setup: variable-helix/pitch tool breaks phase coherence between tooth impacts. Reduces regenerative chatter by 50–70%. Combined with stability lobe-selected RPM.",
    source: "physics",
    confidence: 0.93,
  },
  {
    id: "SPEC-BURR-ANY-001",
    conditions: { special_conditions: ["burr_sensitive"], operation: "finishing" },
    strategy: "climb_contour",
    parameters: { ae_pct: 6, ap_factor: 0.04, vc_mult: 1.6, fz_mult: 0.7 },
    justification: "Burr-sensitive finish: climb milling direction minimizes exit burr formation. Chip thinning reduces chip cross-section at exit. Final pass in reverse (conventional) if deburring access is limited.",
    source: "tribal",
    confidence: 0.88,
  },
  {
    id: "SPEC-HIGHASPECT-BORE-001",
    conditions: { feature_type: "bore", special_conditions: ["high_aspect_ratio"] },
    strategy: "vibration_damped_boring",
    parameters: { ae_pct: 100, ap_factor: 0.003, vc_mult: 0.85, fz_mult: 0.55 },
    justification: "High aspect ratio bore (L/D > 8): boring bar acts as Euler–Bernoulli beam; deflection δ ∝ FL³/(3EI). Tuned mass damper (Sandvik Silent Tools) shifts fn above machining frequency. ap reduced to maintain force below onset.",
    source: "physics",
    confidence: 0.95,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 3+2 AXIS — additional specific rules
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "CTR-ANY-3P2-FIN-001",
    conditions: { feature_type: "contour", machine_axes: "3+2", operation: "finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 6, ap_factor: 0.04, vc_mult: 1.7, fz_mult: 0.75 },
    justification: "3+2 contour finish: tilted plane strategy accesses undercut contours without 5-axis interpolation. Simpler post-processing than full 5-axis, same surface quality on planar contours.",
    source: "novel",
    confidence: 0.86,
  },
  {
    id: "WLL-ANY-3P2-FIN-001",
    conditions: { feature_type: "wall", machine_axes: "3+2", operation: "finishing" },
    strategy: "flank_milling",
    parameters: { ae_pct: 100, ap_factor: 0.35, vc_mult: 1.5, fz_mult: 0.78 },
    justification: "3+2 wall flank milling: index to align tool with wall normal. Single-pass full-height contact. Eliminates Z-level scallop. Limited to ruled (straight-sided) walls.",
    source: "novel",
    confidence: 0.84,
  },
  {
    id: "FFF-ANY-3P2-RGH-001",
    conditions: { feature_type: "freeform", machine_axes: "3+2", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 35, ap_factor: 0.6, vc_mult: 1.7, fz_mult: 1.05 },
    justification: "3+2 freeform rough: index to optimal tilt angles (typically 3–5 setups) then 3-axis rough each region. Reduces tool overhang vs 3-axis, improves MRR and surface.",
    source: "novel",
    confidence: 0.85,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FINE TOLERANCE RULES
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "TOL-FINE-BOR-001",
    conditions: { feature_type: "bore", tolerance_class: "fine", operation: "finishing" },
    strategy: "fine_boring",
    parameters: { ae_pct: 100, ap_factor: 0.003, vc_mult: 1.1, fz_mult: 0.5 },
    justification: "Fine tolerance bore (IT6 and better): single-point precision boring essential. Three passes minimum: semi-finish → pre-finish → finish. Thermal soak between passes. Airflow measurement during boring.",
    source: "playbook",
    confidence: 0.97,
  },
  {
    id: "TOL-FINE-HLE-001",
    conditions: { feature_type: "hole", tolerance_class: "fine", operation: "finishing" },
    strategy: "reaming",
    parameters: { ae_pct: 100, ap_factor: 0.008, vc_mult: 0.5, fz_mult: 0.7 },
    justification: "Fine tolerance hole (IT7): reaming after drilling. Stock per side 0.1–0.2 mm. Carbide or cobalt HSS reamer. Vc lower than boring — reamers are multi-edge fixed tools.",
    source: "playbook",
    confidence: 0.95,
  },
  {
    id: "TOL-FINE-FACE-001",
    conditions: { feature_type: "face", tolerance_class: "fine", operation: "finishing" },
    strategy: "face_milling_wiper",
    parameters: { ae_pct: 70, ap_factor: 0.02, vc_mult: 2.0, fz_mult: 0.85 },
    justification: "Fine flatness requirement: wiper insert face mill with air-gauge feedback. Thermal growth compensation during long cuts. Ra < 0.4 µm achievable with precision wiper geometry.",
    source: "physics",
    confidence: 0.93,
  },
  {
    id: "TOL-FINE-CTR-001",
    conditions: { feature_type: "contour", tolerance_class: "fine", operation: "finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 4, ap_factor: 0.02, vc_mult: 1.6, fz_mult: 0.65 },
    justification: "Fine contour tolerance: three-spring-pass approach. Deflection compensation via tool path offset correction (measure then offset by actual undercut). In-process gauging recommended.",
    source: "physics",
    confidence: 0.91,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL ISO-H RULES FOR COMPLETENESS
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "PKT-H-5AX-FIN-001",
    conditions: { feature_type: "pocket", material_iso: "H", machine_axes: "5-axis", operation: "finishing" },
    strategy: "hard_milling",
    parameters: { ae_pct: 4, ap_factor: 0.015, vc_mult: 2.2, fz_mult: 0.65 },
    justification: "5-axis hard pocket finish: tilt to optimal rake angle preserves tool sharpness (reduced effective rake). CBN barrel cutter covers large area per pass. Dry cutting mandatory.",
    source: "physics",
    confidence: 0.91,
  },
  {
    id: "CTR-H-5AX-FIN-001",
    conditions: { feature_type: "contour", material_iso: "H", machine_axes: "5-axis", operation: "finishing" },
    strategy: "hard_milling",
    parameters: { ae_pct: 5, ap_factor: 0.015, vc_mult: 2.1, fz_mult: 0.68 },
    justification: "5-axis hard contour: tool tilt maintained to engage with CBN cutting edge. Eliminates centre-cutting dead zone of ball-nose. Superior surface integrity vs 3-axis.",
    source: "physics",
    confidence: 0.90,
  },
  {
    id: "SLT-H-3P2-RGH-001",
    conditions: { feature_type: "slot", material_iso: "H", machine_axes: "3+2", operation: "roughing" },
    strategy: "high_feed_milling",
    parameters: { ae_pct: 45, ap_factor: 0.1, vc_mult: 1.6, fz_mult: 1.7 },
    justification: "3+2 hard slot: tilt plane to access angled slot channels in die/mold. HFM inserts direct force axially. Prevents CBN flaking on hardened slot walls.",
    source: "novel",
    confidence: 0.84,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL ISO-S RULES (SUPERALLOY CRITICAL)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "FCE-S-5AX-FIN-001",
    conditions: { feature_type: "face", material_iso: "S", machine_axes: "5-axis", operation: "finishing" },
    strategy: "face_milling_wiper",
    parameters: { ae_pct: 60, ap_factor: 0.025, vc_mult: 1.2, fz_mult: 0.8 },
    justification: "Superalloy face finish 5-axis: tilt 10–15° keeps ceramic cutting edge in contact without chisel-edge rubbing. SiAlON at Vc 200–300 m/min. Single wiper insert geometry.",
    source: "tribal",
    confidence: 0.86,
  },
  {
    id: "BOR-S-3AX-FIN-001",
    conditions: { feature_type: "bore", material_iso: "S", machine_axes: "3-axis", operation: "finishing" },
    strategy: "fine_boring",
    parameters: { ae_pct: 100, ap_factor: 0.004, vc_mult: 1.0, fz_mult: 0.55 },
    justification: "Superalloy bore finish: CBN boring bar. ap 0.004×D. Peck boring for L/D > 5. White-layer inspection required for critical aeronautical bores (IN718, Waspalloy).",
    source: "tribal",
    confidence: 0.88,
  },
  {
    id: "WLL-S-5AX-FIN-001",
    conditions: { feature_type: "wall", material_iso: "S", machine_axes: "5-axis", operation: "finishing" },
    strategy: "flank_milling",
    parameters: { ae_pct: 100, ap_factor: 0.25, vc_mult: 1.4, fz_mult: 0.7 },
    justification: "5-axis superalloy wall flank milling: barrel cutter at optimal tilt for flank contact. Minimizes heat per unit area. Achieves Ra < 0.4 µm on aerospace structural ribs.",
    source: "novel",
    confidence: 0.90,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ADDITIONAL COVERAGE — ISO-P/M/K SEMI-FINISHING
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "FFF-P-3AX-RGH-001",
    conditions: { feature_type: "freeform", material_iso: "P", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 35, ap_factor: 0.65, vc_mult: 1.75, fz_mult: 1.05 },
    justification: "Steel freeform rough: Z-level with 35% radial engagement. Large step-down maximizes MRR on gentle slopes. Switch to raster or spiral approach for steep regions > 60°.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "FFF-M-3AX-RGH-001",
    conditions: { feature_type: "freeform", material_iso: "M", machine_axes: "3-axis", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 8, ap_factor: 1.5, vc_mult: 1.35, fz_mult: 0.9 },
    justification: "Stainless freeform rough: trochoidal maintains ae control across complex geometry. Prevents work-hardening zones forming at direction changes.",
    source: "playbook",
    confidence: 0.89,
  },
  {
    id: "FFF-K-3AX-RGH-001",
    conditions: { feature_type: "freeform", material_iso: "K", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 50, ap_factor: 0.7, vc_mult: 2.3, fz_mult: 1.2 },
    justification: "Cast iron freeform rough: high speed with ceramic inserts (if Vc allows spindle). Large ap and ae enabled by CI's short chip and low BUE tendency.",
    source: "playbook",
    confidence: 0.88,
  },
  {
    id: "RIB-K-3AX-FIN-001",
    conditions: { feature_type: "rib", material_iso: "K", machine_axes: "3-axis", operation: "finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 8, ap_factor: 0.05, vc_mult: 2.5, fz_mult: 0.9 },
    justification: "Cast iron rib finish: high Vc with carbide ball-nose. No BUE risk. Dry cutting acceptable. Ra < 1.6 µm readily achieved.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "HLE-ANY-3P2-RGH-INCLINED",
    conditions: { feature_type: "hole", machine_axes: "3+2", operation: "roughing" },
    strategy: "spot_then_drill",
    parameters: { ae_pct: 100, ap_factor: 0.3, vc_mult: 0.9, fz_mult: 0.85 },
    justification: "3+2 inclined hole drilling: index part to make hole normal to spindle axis. Eliminates drill deflection from inclined entry. Essential for inter-feature holes at odd angles.",
    source: "playbook",
    confidence: 0.94,
  },
  {
    id: "THR-P-5AX-ANY-001",
    conditions: { feature_type: "thread", material_iso: "P", machine_axes: "5-axis" },
    strategy: "thread_milling",
    parameters: { ae_pct: 100, ap_factor: 0.05, vc_mult: 1.0, fz_mult: 0.8 },
    justification: "5-axis thread milling: access angled/inclined threaded holes without re-clamping. Orbital interpolation in tilted plane. Same physics as 3-axis thread milling.",
    source: "novel",
    confidence: 0.87,
  },
  {
    id: "BOR-N-5AX-FIN-001",
    conditions: { feature_type: "bore", material_iso: "N", machine_axes: "5-axis", operation: "finishing" },
    strategy: "fine_boring",
    parameters: { ae_pct: 100, ap_factor: 0.004, vc_mult: 2.0, fz_mult: 0.65 },
    justification: "5-axis aluminum bore finish: PCD boring bar at high Vc in tilted orientation. Angled bores on pump housings, engine blocks. Identical physics to 3-axis — tilt only for access.",
    source: "novel",
    confidence: 0.89,
  },
  {
    id: "PKT-K-5AX-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "K", machine_axes: "5-axis", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 12, ap_factor: 1.6, vc_mult: 2.2, fz_mult: 1.15 },
    justification: "5-axis CI pocket rough: dynamic tilt reduces effective cutter angle, increases radial MRR. Good for complex CI housings with pockets at multiple orientations.",
    source: "novel",
    confidence: 0.86,
  },
  {
    id: "SLT-K-3AX-SFN-001",
    conditions: { feature_type: "slot", material_iso: "K", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 30, ap_factor: 0.3, vc_mult: 2.0, fz_mult: 1.0 },
    justification: "Cast iron slot semi-finish: contour offset at high Vc. No BUE. Dry machining with air blast. PVD carbide preferred for high-silicon CI.",
    source: "playbook",
    confidence: 0.88,
  },
  {
    id: "WLL-H-3AX-RGH-001",
    conditions: { feature_type: "wall", material_iso: "H", machine_axes: "3-axis", operation: "roughing" },
    strategy: "high_feed_milling",
    parameters: { ae_pct: 40, ap_factor: 0.1, vc_mult: 1.7, fz_mult: 1.8 },
    justification: "Hard steel wall rough: HFM with very low ap. Carbide grade optimized for hardened material (K10–K20). Dry. Machining direction top-to-bottom to maintain support.",
    source: "physics",
    confidence: 0.87,
  },
  {
    id: "CTR-K-3AX-RGH-001",
    conditions: { feature_type: "contour", material_iso: "K", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 45, ap_factor: 0.5, vc_mult: 2.4, fz_mult: 1.25 },
    justification: "Cast iron contour rough at high Vc and ae. Short chips allow high feed. Carbide or ceramic inserts with 0° rake or negative rake for impact resistance.",
    source: "playbook",
    confidence: 0.89,
  },
  {
    id: "CTR-N-3AX-RGH-001",
    conditions: { feature_type: "contour", material_iso: "N", machine_axes: "3-axis", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 15, ap_factor: 1.8, vc_mult: 2.8, fz_mult: 1.3 },
    justification: "Non-ferrous contour rough: aggressive adaptive clearing. Maximum MRR enabled by low cutting forces. 2-flute polished carbide or PCD.",
    source: "playbook",
    confidence: 0.94,
  },
  {
    id: "FCE-H-3AX-FIN-001",
    conditions: { feature_type: "face", material_iso: "H", machine_axes: "3-axis", operation: "finishing" },
    strategy: "hard_milling",
    parameters: { ae_pct: 6, ap_factor: 0.01, vc_mult: 2.2, fz_mult: 0.6 },
    justification: "Hard steel face finish: CBN face mill or end mill. Dry cutting mandatory. Each pass < 0.05 mm stock. Replaces grinding for flat hardened surfaces if Ra < 0.4 µm not required.",
    source: "physics",
    confidence: 0.91,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BATCH 2 — filling remaining coverage gaps to reach 200+ rules
  // Gaps: pocket 3+2/5ax per ISO, slot 5ax/3+2 per ISO, contour SFN per ISO,
  //       face SFN all ISO, freeform SFN per ISO, hole SFN all ISO,
  //       bore SFN per ISO, thread SFN/FIN, wall SFN per ISO, rib SFN per ISO
  //       plus additional special-condition overrides
  // ══════════════════════════════════════════════════════════════════════════

  // ── Pocket — 3+2 per ISO ──────────────────────────────────────────────────
  {
    id: "PKT-M-3P2-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "M", machine_axes: "3+2", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 8, ap_factor: 1.9, vc_mult: 1.4, fz_mult: 1.0 },
    justification: "3+2 stainless pocket rough: trochoidal in tilted plane accesses angled pocket floors without re-clamping. Same engagement physics as 3-axis — tilted spindle reduces effective radial chip load by cos(tilt).",
    source: "novel",
    confidence: 0.87,
  },
  {
    id: "PKT-S-3P2-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "S", machine_axes: "3+2", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 5, ap_factor: 1.5, vc_mult: 1.5, fz_mult: 0.88 },
    justification: "3+2 superalloy pocket: trochoidal in indexed orientation. Eliminates reclamping for pocket groups at compound angles on turbine cases. Through-tool coolant mandatory.",
    source: "novel",
    confidence: 0.86,
  },
  {
    id: "PKT-N-3P2-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "N", machine_axes: "3+2", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 15, ap_factor: 2.0, vc_mult: 2.8, fz_mult: 1.4 },
    justification: "3+2 aluminum pocket rough: adaptive at maximum MRR in indexed plane. Particularly useful for aerospace aluminum airframe pockets at compound angles.",
    source: "novel",
    confidence: 0.88,
  },
  {
    id: "PKT-H-3P2-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "H", machine_axes: "3+2", operation: "roughing" },
    strategy: "high_feed_milling",
    parameters: { ae_pct: 55, ap_factor: 0.12, vc_mult: 1.7, fz_mult: 1.85 },
    justification: "3+2 hard pocket rough: HFM in indexed orientation for die/mold pockets with multiple orientations. Same low-ap physics as 3-axis, tilt provides access advantage.",
    source: "novel",
    confidence: 0.85,
  },

  // ── Pocket — 5-axis per ISO ───────────────────────────────────────────────
  {
    id: "PKT-M-5AX-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "M", machine_axes: "5-axis", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 7, ap_factor: 2.0, vc_mult: 1.4, fz_mult: 1.0 },
    justification: "5-axis stainless pocket rough with continuous tilt. Optimal rake angle maintained, reducing specific cutting force by 15–20% vs fixed tilt. Eliminates work-hardening at re-entry.",
    source: "novel",
    confidence: 0.88,
  },
  {
    id: "PKT-S-5AX-RGH-001",
    conditions: { feature_type: "pocket", material_iso: "S", machine_axes: "5-axis", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 5, ap_factor: 1.5, vc_mult: 1.5, fz_mult: 0.9 },
    justification: "5-axis superalloy pocket: continuous tilt manages heat distribution. Dynamic normal tilt prevents chip re-welding on Ti alloys.",
    source: "tribal",
    confidence: 0.89,
  },
  {
    id: "PKT-N-5AX-FIN-001",
    conditions: { feature_type: "pocket", material_iso: "N", machine_axes: "5-axis", operation: "finishing" },
    strategy: "scallop_3d",
    parameters: { ae_pct: 6, ap_factor: 0.025, vc_mult: 2.8, fz_mult: 0.9 },
    justification: "5-axis aluminum pocket finish: barrel cutter at high Vc. Tilt 15° avoids chisel-edge. Effective scallop radius R_eff >> nominal ball radius. Ra < 0.4 µm achievable.",
    source: "novel",
    confidence: 0.92,
  },

  // ── Slot — 3+2 per ISO ────────────────────────────────────────────────────
  {
    id: "SLT-M-3P2-RGH-001",
    conditions: { feature_type: "slot", material_iso: "M", machine_axes: "3+2", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 7, ap_factor: 1.7, vc_mult: 1.3, fz_mult: 0.9 },
    justification: "3+2 stainless slot: index to normal orientation eliminates re-fixturing for intersecting slot patterns. Same trochoidal engagement physics as 3-axis.",
    source: "novel",
    confidence: 0.86,
  },
  {
    id: "SLT-N-3P2-FIN-001",
    conditions: { feature_type: "slot", material_iso: "N", machine_axes: "3+2", operation: "finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 8, ap_factor: 0.06, vc_mult: 2.5, fz_mult: 0.8 },
    justification: "3+2 aluminum slot finish: light contour pass in indexed plane. PCD or polished 2-flute at high Vc.",
    source: "novel",
    confidence: 0.87,
  },
  {
    id: "SLT-S-5AX-FIN-001",
    conditions: { feature_type: "slot", material_iso: "S", machine_axes: "5-axis", operation: "finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 5, ap_factor: 0.04, vc_mult: 1.5, fz_mult: 0.6 },
    justification: "5-axis superalloy slot finish: continuous tilt ensures cutting edge contacts slot wall at optimal angle. Avoids chisel-edge on ball-nose. Critical for inter-blade channels.",
    source: "tribal",
    confidence: 0.88,
  },

  // ── Contour — SFN all ISO ─────────────────────────────────────────────────
  {
    id: "CTR-P-3AX-SFN-001",
    conditions: { feature_type: "contour", material_iso: "P", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 20, ap_factor: 0.2, vc_mult: 1.6, fz_mult: 0.9 },
    justification: "Steel contour semi-finish: moderate ae reduces scallop height from roughing. Leaves 0.15–0.25 mm for finish. Down-milling preferred for side wall quality.",
    source: "playbook",
    confidence: 0.90,
  },
  {
    id: "CTR-K-3AX-SFN-001",
    conditions: { feature_type: "contour", material_iso: "K", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 35, ap_factor: 0.3, vc_mult: 2.2, fz_mult: 1.1 },
    justification: "Cast iron contour semi-finish: high Vc and generous ae. Short chip CI rarely causes BUE. Carbide at Vc 200–300 m/min.",
    source: "playbook",
    confidence: 0.89,
  },
  {
    id: "CTR-S-3AX-SFN-001",
    conditions: { feature_type: "contour", material_iso: "S", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "rest_machining",
    parameters: { ae_pct: 18, ap_factor: 0.15, vc_mult: 1.2, fz_mult: 0.72 },
    justification: "Superalloy contour semi-finish: rest machining removes roughing scallops without over-engaging. AlTiN or uncoated carbide. Through-tool coolant.",
    source: "tribal",
    confidence: 0.87,
  },
  {
    id: "CTR-H-3AX-SFN-001",
    conditions: { feature_type: "contour", material_iso: "H", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_z_level",
    parameters: { ae_pct: 10, ap_factor: 0.06, vc_mult: 1.7, fz_mult: 0.72 },
    justification: "Hard steel contour semi-finish: Z-level passes with CBN end mill. Each Z step removes minimal stock to stay within tool strength limits. Dry cutting.",
    source: "physics",
    confidence: 0.88,
  },

  // ── Face — SFN all ISO ────────────────────────────────────────────────────
  {
    id: "FCE-P-3AX-SFN-001",
    conditions: { feature_type: "face", material_iso: "P", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "face_milling",
    parameters: { ae_pct: 75, ap_factor: 0.2, vc_mult: 1.8, fz_mult: 1.1 },
    justification: "Steel face semi-finish: single pass at reduced ap to clean roughing marks before wiper finish. Maintains flatness within 0.05 mm for subsequent finish.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "FCE-M-3AX-SFN-001",
    conditions: { feature_type: "face", material_iso: "M", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "face_milling",
    parameters: { ae_pct: 65, ap_factor: 0.15, vc_mult: 1.4, fz_mult: 0.95 },
    justification: "Stainless face semi-finish: reduced ae to 65% prevents work-hardening at tool exit. Positive rake PVD insert. Leaves 0.1 mm for final wiper pass.",
    source: "playbook",
    confidence: 0.88,
  },
  {
    id: "FCE-N-3AX-SFN-001",
    conditions: { feature_type: "face", material_iso: "N", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "face_milling",
    parameters: { ae_pct: 80, ap_factor: 0.3, vc_mult: 2.5, fz_mult: 1.3 },
    justification: "Aluminum face semi-finish: high MRR with polished carbide or PCD. Chip flush critical to prevent re-cut scoring.",
    source: "playbook",
    confidence: 0.93,
  },
  {
    id: "FCE-S-3AX-SFN-001",
    conditions: { feature_type: "face", material_iso: "S", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "face_milling",
    parameters: { ae_pct: 50, ap_factor: 0.2, vc_mult: 1.3, fz_mult: 0.85 },
    justification: "Superalloy face semi-finish: conservative engagement with round insert ceramic. Thermal load per insert controlled by pitch angle. Air blast between passes.",
    source: "tribal",
    confidence: 0.86,
  },
  {
    id: "FCE-K-3AX-SFN-001",
    conditions: { feature_type: "face", material_iso: "K", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "face_milling",
    parameters: { ae_pct: 75, ap_factor: 0.3, vc_mult: 2.5, fz_mult: 1.2 },
    justification: "Cast iron face semi-finish at high Vc. Short chip allows aggressive ae. Dry machining standard. SiAlON ceramic viable for even higher Vc.",
    source: "playbook",
    confidence: 0.90,
  },
  {
    id: "FCE-H-3AX-SFN-001",
    conditions: { feature_type: "face", material_iso: "H", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "high_feed_milling",
    parameters: { ae_pct: 60, ap_factor: 0.08, vc_mult: 1.7, fz_mult: 1.8 },
    justification: "Hard steel face semi-finish with HFM inserts. Low ap but high fz gives adequate MRR. Prepares surface for CBN finish pass.",
    source: "physics",
    confidence: 0.87,
  },

  // ── Hole — SFN rules ──────────────────────────────────────────────────────
  {
    id: "HLE-P-3AX-SFN-001",
    conditions: { feature_type: "hole", material_iso: "P", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "step_boring",
    parameters: { ae_pct: 100, ap_factor: 0.05, vc_mult: 1.2, fz_mult: 0.85 },
    justification: "Steel hole semi-finish: single-point boring bar removes drilling taper and positional error. ap 0.05×D per pass leaves 0.1 mm for reaming. More accurate than multi-step boring.",
    source: "playbook",
    confidence: 0.90,
  },
  {
    id: "HLE-M-3AX-SFN-001",
    conditions: { feature_type: "hole", material_iso: "M", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "step_boring",
    parameters: { ae_pct: 100, ap_factor: 0.04, vc_mult: 1.1, fz_mult: 0.75 },
    justification: "Stainless hole semi-finish: boring preferred to avoid BUE from reamer friction. Positive rake polished insert. Leave 0.1 mm for final reaming/boring.",
    source: "tribal",
    confidence: 0.87,
  },
  {
    id: "HLE-N-3AX-SFN-001",
    conditions: { feature_type: "hole", material_iso: "N", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "step_boring",
    parameters: { ae_pct: 100, ap_factor: 0.06, vc_mult: 2.0, fz_mult: 0.95 },
    justification: "Aluminum hole semi-finish: boring at high Vc removes drill scallops. PCD insert. Accurate positioning before precision reaming.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "HLE-S-3AX-SFN-001",
    conditions: { feature_type: "hole", material_iso: "S", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "step_boring",
    parameters: { ae_pct: 100, ap_factor: 0.04, vc_mult: 1.0, fz_mult: 0.7 },
    justification: "Superalloy hole semi-finish: precision boring bar to remove helical interpolation scallops. Each ap step < 0.04×D prevents work-hardening in bore surface.",
    source: "tribal",
    confidence: 0.86,
  },
  {
    id: "HLE-K-3AX-SFN-001",
    conditions: { feature_type: "hole", material_iso: "K", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "step_boring",
    parameters: { ae_pct: 100, ap_factor: 0.06, vc_mult: 1.7, fz_mult: 0.9 },
    justification: "Cast iron hole semi-finish: boring at elevated Vc. Abrasion-resistant carbide grade required for high-Si CI. Dry boring acceptable.",
    source: "playbook",
    confidence: 0.88,
  },
  {
    id: "HLE-H-3AX-FIN-001",
    conditions: { feature_type: "hole", material_iso: "H", machine_axes: "3-axis", operation: "finishing" },
    strategy: "hard_boring",
    parameters: { ae_pct: 100, ap_factor: 0.003, vc_mult: 1.7, fz_mult: 0.55 },
    justification: "Hardened steel hole finish: CBN single-point boring. ap 0.003×D gives ground-surface quality. Alternative: EDM then lap for D < 5 mm.",
    source: "physics",
    confidence: 0.90,
  },

  // ── Bore — SFN per ISO ────────────────────────────────────────────────────
  {
    id: "BOR-P-3AX-SFN-001",
    conditions: { feature_type: "bore", material_iso: "P", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "rough_boring",
    parameters: { ae_pct: 100, ap_factor: 0.08, vc_mult: 1.4, fz_mult: 0.9 },
    justification: "Steel bore semi-finish: reduce ap from rough pass to 0.08×D. Corrects form error from rough boring. Leave 0.1 mm for fine boring.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "BOR-K-3AX-RGH-001",
    conditions: { feature_type: "bore", material_iso: "K", machine_axes: "3-axis", operation: "roughing" },
    strategy: "rough_boring",
    parameters: { ae_pct: 100, ap_factor: 0.25, vc_mult: 2.0, fz_mult: 1.1 },
    justification: "Cast iron bore rough: high Vc with carbide boring bar. CI's short chip prevents chip jamming in boring bar gap. Dry boring with air flush.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "BOR-K-3AX-FIN-001",
    conditions: { feature_type: "bore", material_iso: "K", machine_axes: "3-axis", operation: "finishing" },
    strategy: "fine_boring",
    parameters: { ae_pct: 100, ap_factor: 0.005, vc_mult: 1.8, fz_mult: 0.65 },
    justification: "Cast iron bore finish: single-point precision boring. Wiper geometry insert gives Ra < 0.8 µm. Dry machining. IT7 tolerance achievable.",
    source: "playbook",
    confidence: 0.92,
  },
  {
    id: "BOR-M-3AX-RGH-001",
    conditions: { feature_type: "bore", material_iso: "M", machine_axes: "3-axis", operation: "roughing" },
    strategy: "rough_boring",
    parameters: { ae_pct: 100, ap_factor: 0.18, vc_mult: 1.2, fz_mult: 0.85 },
    justification: "Stainless bore rough: reduced ap vs steel to avoid work-hardening the bore surface. Polished insert with positive rake. Flood coolant mandatory.",
    source: "tribal",
    confidence: 0.87,
  },
  {
    id: "BOR-N-3AX-RGH-001",
    conditions: { feature_type: "bore", material_iso: "N", machine_axes: "3-axis", operation: "roughing" },
    strategy: "rough_boring",
    parameters: { ae_pct: 100, ap_factor: 0.3, vc_mult: 2.2, fz_mult: 1.1 },
    justification: "Aluminum bore rough: high MRR with PCD boring bar. Flood coolant for chip flush. No work-hardening concern. PCD geometry removes long continuous chips safely.",
    source: "playbook",
    confidence: 0.93,
  },
  {
    id: "BOR-H-3AX-RGH-001",
    conditions: { feature_type: "bore", material_iso: "H", machine_axes: "3-axis", operation: "roughing" },
    strategy: "rough_boring",
    parameters: { ae_pct: 100, ap_factor: 0.12, vc_mult: 1.6, fz_mult: 0.75 },
    justification: "Hardened bore rough: CBN or TiAlN-coated carbide boring bar. Conservative ap to prevent insert chipping. Dry cutting. Passes: rough → semi → fine.",
    source: "physics",
    confidence: 0.88,
  },

  // ── Thread — semi-finishing ────────────────────────────────────────────────
  {
    id: "THR-N-5AX-ANY-001",
    conditions: { feature_type: "thread", material_iso: "N", machine_axes: "5-axis" },
    strategy: "thread_milling",
    parameters: { ae_pct: 100, ap_factor: 0.04, vc_mult: 1.8, fz_mult: 0.9 },
    justification: "5-axis aluminum thread milling: helical interpolation in tilted plane for angled threaded ports. PCD thread mill at elevated Vc.",
    source: "novel",
    confidence: 0.88,
  },
  {
    id: "THR-S-5AX-ANY-001",
    conditions: { feature_type: "thread", material_iso: "S", machine_axes: "5-axis" },
    strategy: "thread_milling",
    parameters: { ae_pct: 100, ap_factor: 0.03, vc_mult: 0.75, fz_mult: 0.6 },
    justification: "5-axis superalloy thread milling: access to compound-angle threaded ports on aerospace castings. Same low-Vc physics as 3-axis — tilt provides access benefit only.",
    source: "tribal",
    confidence: 0.86,
  },
  {
    id: "THR-H-5AX-ANY-001",
    conditions: { feature_type: "thread", material_iso: "H", machine_axes: "5-axis" },
    strategy: "thread_grinding",
    parameters: { ae_pct: 100, ap_factor: 0.015, vc_mult: 2.5, fz_mult: 0.5 },
    justification: "5-axis hard thread: CNC thread grinding in tilted orientation for hardened components with threads on angled features. Grinding wheel dressed to thread profile.",
    source: "physics",
    confidence: 0.85,
  },

  // ── Freeform — ISO-specific SFN ──────────────────────────────────────────
  {
    id: "FFF-M-3AX-SFN-001",
    conditions: { feature_type: "freeform", material_iso: "M", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "steep_shallow",
    parameters: { ae_pct: 12, ap_factor: 0.08, vc_mult: 1.4, fz_mult: 0.8 },
    justification: "Stainless freeform semi-finish: steep-shallow composite with reduced ae to prevent work-hardening on direction changes. Ball-nose with corner radius coating.",
    source: "playbook",
    confidence: 0.88,
  },
  {
    id: "FFF-K-3AX-SFN-001",
    conditions: { feature_type: "freeform", material_iso: "K", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "steep_shallow",
    parameters: { ae_pct: 20, ap_factor: 0.12, vc_mult: 2.2, fz_mult: 1.0 },
    justification: "Cast iron freeform semi-finish: high Vc steep-shallow composite. CI allows generous ae without BUE. Dry or MQL machining.",
    source: "playbook",
    confidence: 0.88,
  },
  {
    id: "FFF-N-3AX-SFN-001",
    conditions: { feature_type: "freeform", material_iso: "N", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "steep_shallow",
    parameters: { ae_pct: 20, ap_factor: 0.12, vc_mult: 2.6, fz_mult: 1.1 },
    justification: "Aluminum freeform semi-finish: high Vc steep-shallow with PCD or polished carbide ball-nose. Flood coolant for chip management.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "FFF-H-3AX-SFN-001",
    conditions: { feature_type: "freeform", material_iso: "H", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_z_level",
    parameters: { ae_pct: 8, ap_factor: 0.05, vc_mult: 1.8, fz_mult: 0.7 },
    justification: "Hard steel freeform semi-finish: Z-level with CBN ball-nose. Constant-Z eliminates depth variation that would cause force spikes and chipping.",
    source: "physics",
    confidence: 0.88,
  },
  {
    id: "FFF-H-3AX-RGH-001",
    conditions: { feature_type: "freeform", material_iso: "H", machine_axes: "3-axis", operation: "roughing" },
    strategy: "high_feed_milling",
    parameters: { ae_pct: 50, ap_factor: 0.1, vc_mult: 1.8, fz_mult: 1.8 },
    justification: "Hard steel freeform rough: HFM inserts at very low ap across complex surface. Force directed axially. Each pass leaves minimal scallop for Z-level semi-finish.",
    source: "physics",
    confidence: 0.87,
  },

  // ── Wall — SFN per ISO ────────────────────────────────────────────────────
  {
    id: "WLL-K-3AX-RGH-001",
    conditions: { feature_type: "wall", material_iso: "K", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 30, ap_factor: 0.6, vc_mult: 2.2, fz_mult: 1.15 },
    justification: "Cast iron wall rough: high Vc Z-level. Short chip prevents chip packing against wall. Dry machining or MQL.",
    source: "playbook",
    confidence: 0.89,
  },
  {
    id: "WLL-K-3AX-FIN-001",
    conditions: { feature_type: "wall", material_iso: "K", machine_axes: "3-axis", operation: "finishing" },
    strategy: "light_pass",
    parameters: { ae_pct: 8, ap_factor: 0.05, vc_mult: 2.5, fz_mult: 0.9 },
    justification: "Cast iron wall finish: high Vc light spring pass. No BUE. Ra < 1.6 µm achievable with sharp carbide end mill.",
    source: "playbook",
    confidence: 0.90,
  },
  {
    id: "WLL-P-3AX-FIN-001",
    conditions: { feature_type: "wall", material_iso: "P", machine_axes: "3-axis", operation: "finishing" },
    strategy: "light_pass",
    parameters: { ae_pct: 5, ap_factor: 0.04, vc_mult: 1.7, fz_mult: 0.7 },
    justification: "Steel wall finish: light spring pass with climb milling. Deflection force reduced 15–20% vs conventional. Achieves IT8 straightness on walls up to 50 mm tall.",
    source: "playbook",
    confidence: 0.92,
  },
  {
    id: "WLL-H-3AX-SFN-001",
    conditions: { feature_type: "wall", material_iso: "H", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_z_level",
    parameters: { ae_pct: 10, ap_factor: 0.08, vc_mult: 1.6, fz_mult: 0.72 },
    justification: "Hard steel wall semi-finish: Z-level at low ap. CBN end mill. Leaves 0.05 mm for final spring pass. Hard milling wall sequence: HFM rough → Z-level SFN → light pass FIN.",
    source: "physics",
    confidence: 0.87,
  },
  {
    id: "WLL-H-3AX-FIN-001",
    conditions: { feature_type: "wall", material_iso: "H", machine_axes: "3-axis", operation: "finishing" },
    strategy: "light_pass",
    parameters: { ae_pct: 4, ap_factor: 0.015, vc_mult: 2.0, fz_mult: 0.62 },
    justification: "Hard steel wall finish: CBN spring pass at ae 4%D, ap 0.015×D. Achieves Ra < 0.4 µm on hardened walls. Dry cutting. Tool life 5–15 parts per edge.",
    source: "physics",
    confidence: 0.90,
  },

  // ── Rib — additional coverage ─────────────────────────────────────────────
  {
    id: "RIB-P-3AX-SFN-001",
    conditions: { feature_type: "rib", material_iso: "P", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 10, ap_factor: 0.1, vc_mult: 1.6, fz_mult: 0.85 },
    justification: "Steel rib semi-finish: bilateral contour passes equalize side forces. Leave 0.1 mm each side for finish. Critical for tall ribs H/T > 6:1.",
    source: "playbook",
    confidence: 0.89,
  },
  {
    id: "RIB-S-3AX-FIN-001",
    conditions: { feature_type: "rib", material_iso: "S", machine_axes: "3-axis", operation: "finishing" },
    strategy: "light_pass",
    parameters: { ae_pct: 3, ap_factor: 0.03, vc_mult: 1.5, fz_mult: 0.55 },
    justification: "Superalloy rib finish: minimum engagement. Through-tool coolant critical to control heat in thin superalloy rib. Multiple spring passes reducing ae progressively.",
    source: "tribal",
    confidence: 0.87,
  },
  {
    id: "RIB-H-3AX-RGH-001",
    conditions: { feature_type: "rib", material_iso: "H", machine_axes: "3-axis", operation: "roughing" },
    strategy: "high_feed_milling",
    parameters: { ae_pct: 30, ap_factor: 0.08, vc_mult: 1.7, fz_mult: 1.75 },
    justification: "Hard steel rib rough: HFM at very low ap. Top-down sequence to maintain support stock during roughing.",
    source: "physics",
    confidence: 0.86,
  },
  {
    id: "RIB-H-3AX-FIN-001",
    conditions: { feature_type: "rib", material_iso: "H", machine_axes: "3-axis", operation: "finishing" },
    strategy: "light_pass",
    parameters: { ae_pct: 3, ap_factor: 0.012, vc_mult: 2.0, fz_mult: 0.6 },
    justification: "Hard steel rib finish: CBN spring pass. Force must stay below rib buckling load. Low ae critical for slender ribs H/T > 8:1.",
    source: "physics",
    confidence: 0.89,
  },
  {
    id: "RIB-M-3AX-RGH-001",
    conditions: { feature_type: "rib", material_iso: "M", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 18, ap_factor: 0.35, vc_mult: 1.4, fz_mult: 0.9 },
    justification: "Stainless rib rough: small ae Z-level to prevent work-hardening. Top-down machining sequence. Flood coolant.",
    source: "playbook",
    confidence: 0.87,
  },
  {
    id: "RIB-N-3AX-RGH-001",
    conditions: { feature_type: "rib", material_iso: "N", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 25, ap_factor: 0.6, vc_mult: 2.6, fz_mult: 1.2 },
    justification: "Aluminum rib rough: high Vc Z-level. Low ae to protect thin rib sections from chatter during roughing. PCD or polished 2-flute.",
    source: "playbook",
    confidence: 0.91,
  },

  // ── 5-axis — freeform/contour per ISO-P/M/K/H additional ─────────────────
  {
    id: "FFF-P-5AX-SFN-001",
    conditions: { feature_type: "freeform", material_iso: "P", machine_axes: "5-axis", operation: "semi-finishing" },
    strategy: "morphed_spiral",
    parameters: { ae_pct: 10, ap_factor: 0.07, vc_mult: 1.7, fz_mult: 0.88 },
    justification: "5-axis steel freeform semi-finish: morphed-spiral with dynamic tilt eliminates Z-level stair artifacts. Constant scallop control on all surface angles. TiAlN ball-nose.",
    source: "novel",
    confidence: 0.88,
  },
  {
    id: "FFF-M-5AX-FIN-001",
    conditions: { feature_type: "freeform", material_iso: "M", machine_axes: "5-axis", operation: "finishing" },
    strategy: "scallop_3d",
    parameters: { ae_pct: 4, ap_factor: 0.02, vc_mult: 1.6, fz_mult: 0.65 },
    justification: "5-axis stainless freeform finish: barrel cutter scallop with tilt maintains optimal rake angle throughout. Avoids BUE by keeping effective clearance angle positive.",
    source: "novel",
    confidence: 0.89,
  },
  {
    id: "FFF-K-5AX-FIN-001",
    conditions: { feature_type: "freeform", material_iso: "K", machine_axes: "5-axis", operation: "finishing" },
    strategy: "scallop_3d",
    parameters: { ae_pct: 5, ap_factor: 0.025, vc_mult: 2.4, fz_mult: 0.85 },
    justification: "5-axis CI freeform finish: barrel cutter at high Vc. CI allows generous parameters. Dry machining with compressed air.",
    source: "novel",
    confidence: 0.88,
  },
  {
    id: "FFF-H-5AX-FIN-001",
    conditions: { feature_type: "freeform", material_iso: "H", machine_axes: "5-axis", operation: "finishing" },
    strategy: "scallop_3d",
    parameters: { ae_pct: 3, ap_factor: 0.012, vc_mult: 2.1, fz_mult: 0.62 },
    justification: "5-axis hard freeform finish: CBN barrel cutter at optimal tilt. R_eff >> R_nominal gives very low scallop at moderate ae. Dry. Superior surface integrity vs grinding for HRC 55–60.",
    source: "physics",
    confidence: 0.91,
  },

  // ── Coarse tolerance rules ────────────────────────────────────────────────
  {
    id: "TOL-COARSE-PKT-001",
    conditions: { feature_type: "pocket", tolerance_class: "coarse", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 12, ap_factor: 1.5, vc_mult: 2.0, fz_mult: 1.3 },
    justification: "Coarse tolerance pocket (IT10+): maximise MRR — no need for spring passes or conservative engagement. Single roughing pass may be sufficient.",
    source: "playbook",
    confidence: 0.88,
  },
  {
    id: "TOL-COARSE-FCE-001",
    conditions: { feature_type: "face", tolerance_class: "coarse", operation: "roughing" },
    strategy: "face_milling",
    parameters: { ae_pct: 80, ap_factor: 0.6, vc_mult: 2.0, fz_mult: 1.4 },
    justification: "Coarse tolerance face (IT10+): aggressive face milling with high ae and fz. Wiper finish pass not needed. Flatness ≤ 0.1 mm achievable without semi-finish.",
    source: "playbook",
    confidence: 0.87,
  },
  {
    id: "TOL-MEDIUM-PKT-001",
    conditions: { feature_type: "pocket", tolerance_class: "medium", operation: "finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 8, ap_factor: 0.04, vc_mult: 1.7, fz_mult: 0.75 },
    justification: "Medium tolerance pocket finish (IT7–9): single contour finish pass after semi-finish. No spring pass needed. Climb milling direction. Standard 4-flute carbide end mill.",
    source: "playbook",
    confidence: 0.91,
  },

  // ── Additional special condition rules ────────────────────────────────────
  {
    id: "SPEC-DEPCAV-FFF-001",
    conditions: { feature_type: "freeform", special_conditions: ["deep_cavity"], operation: "roughing" },
    strategy: "plunge_roughing",
    parameters: { ae_pct: 5, ap_factor: 3.0, vc_mult: 1.0, fz_mult: 0.7 },
    justification: "Deep freeform cavity rough: plunge roughing (vertical engagement) dramatically reduces radial force from long-overhang tool. Axial force carried by spindle bearings. Core material removed by plunge cycles before contour passes.",
    source: "physics",
    confidence: 0.92,
  },
  {
    id: "SPEC-MICRO-HLE-001",
    conditions: { feature_type: "hole", special_conditions: ["micro"], operation: "roughing" },
    strategy: "micro_drilling",
    parameters: { ae_pct: 100, ap_factor: 0.05, vc_mult: 4.0, fz_mult: 0.15 },
    justification: "Micro drilling (D < 1 mm): RPM up to 100K. fz must exceed minimum chip thickness (0.15× cutting edge radius) to avoid ploughing. Peck every 2× diameter for chip break. High-precision balanced spindle mandatory.",
    source: "physics",
    confidence: 0.91,
  },
  {
    id: "SPEC-MICRO-SLT-001",
    conditions: { feature_type: "slot", special_conditions: ["micro"], operation: "roughing" },
    strategy: "micro_milling",
    parameters: { ae_pct: 20, ap_factor: 0.08, vc_mult: 3.5, fz_mult: 0.2 },
    justification: "Micro slot (D < 0.5 mm): ultra-high RPM spindle. Single helical pass at very low fz (minimum chip thickness constraint). Air bearing spindle for lowest runout (< 0.5 µm TIR).",
    source: "physics",
    confidence: 0.89,
  },
  {
    id: "SPEC-INTERP-RGH-HFM",
    conditions: { special_conditions: ["interrupted"], operation: "roughing", material_iso: "P" },
    strategy: "high_feed_milling",
    parameters: { ae_pct: 55, ap_factor: 0.1, vc_mult: 0.7, fz_mult: 1.5 },
    justification: "Interrupted steel roughing: HFM geometry preferred. Entry impact force = F × sin(engage_angle). Low ap limits total energy per impact. HFM tool geometry is negative-rake, high-toughness.",
    source: "physics",
    confidence: 0.89,
  },

  // ── Additional 5-axis contour rules per ISO ───────────────────────────────
  {
    id: "CTR-P-5AX-RGH-001",
    conditions: { feature_type: "contour", material_iso: "P", machine_axes: "5-axis", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 10, ap_factor: 1.6, vc_mult: 1.9, fz_mult: 1.1 },
    justification: "5-axis steel contour rough: adaptive with dynamic tilt eliminates re-fixturing for complex curved flanges and turbine shrouds. Same chip-load physics as 3-axis adaptive.",
    source: "novel",
    confidence: 0.88,
  },
  {
    id: "CTR-S-5AX-RGH-001",
    conditions: { feature_type: "contour", material_iso: "S", machine_axes: "5-axis", operation: "roughing" },
    strategy: "trochoidal",
    parameters: { ae_pct: 5, ap_factor: 1.5, vc_mult: 1.5, fz_mult: 0.88 },
    justification: "5-axis superalloy contour rough: trochoidal with dynamic tilt for complex aerospace contours. Continuous engagement control avoids thermal shock zones.",
    source: "tribal",
    confidence: 0.87,
  },
  {
    id: "CTR-N-5AX-FIN-001",
    conditions: { feature_type: "contour", material_iso: "N", machine_axes: "5-axis", operation: "finishing" },
    strategy: "flank_milling",
    parameters: { ae_pct: 100, ap_factor: 0.4, vc_mult: 2.7, fz_mult: 0.85 },
    justification: "5-axis aluminum contour finish: flank milling at high Vc with PCD barrel cutter. Full wall height per pass. Near-zero scallop on compound-curvature aluminum structures.",
    source: "novel",
    confidence: 0.90,
  },
  {
    id: "CTR-H-3P2-SFN-001",
    conditions: { feature_type: "contour", material_iso: "H", machine_axes: "3+2", operation: "semi-finishing" },
    strategy: "contour_z_level",
    parameters: { ae_pct: 12, ap_factor: 0.07, vc_mult: 1.7, fz_mult: 0.72 },
    justification: "3+2 hard contour semi-finish: indexed Z-level passes with CBN end mill. Tilt improves access to angled hardened die features.",
    source: "physics",
    confidence: 0.86,
  },

  // ── Face — 5-axis SFN per ISO ─────────────────────────────────────────────
  {
    id: "FCE-P-5AX-SFN-001",
    conditions: { feature_type: "face", material_iso: "P", machine_axes: "5-axis", operation: "semi-finishing" },
    strategy: "face_milling",
    parameters: { ae_pct: 75, ap_factor: 0.2, vc_mult: 1.85, fz_mult: 1.1 },
    justification: "5-axis steel face semi-finish: tilted spindle eliminates machine tool axis cross-hatch pattern. Consistent chip thickness across full face width.",
    source: "novel",
    confidence: 0.86,
  },
  {
    id: "FCE-N-5AX-FIN-001",
    conditions: { feature_type: "face", material_iso: "N", machine_axes: "5-axis", operation: "finishing" },
    strategy: "face_milling_wiper",
    parameters: { ae_pct: 75, ap_factor: 0.02, vc_mult: 2.8, fz_mult: 1.0 },
    justification: "5-axis aluminum face finish: PCD wiper at high Vc in tilted configuration. Eliminates Z-axis positioning error contribution to flatness. Mirror finish achievable.",
    source: "novel",
    confidence: 0.90,
  },

  // ── Slot — additional semi-finishing per ISO ──────────────────────────────
  {
    id: "SLT-P-3AX-SFN-001",
    conditions: { feature_type: "slot", material_iso: "P", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 15, ap_factor: 0.25, vc_mult: 1.6, fz_mult: 0.88 },
    justification: "Steel slot semi-finish: bilateral contour offset to clean trochoidal roughing scallops. Leaves 0.1 mm for finish pass. Maintains width tolerance within ±0.05 mm.",
    source: "playbook",
    confidence: 0.90,
  },
  {
    id: "SLT-N-3AX-SFN-001",
    conditions: { feature_type: "slot", material_iso: "N", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 20, ap_factor: 0.3, vc_mult: 2.6, fz_mult: 1.1 },
    justification: "Aluminum slot semi-finish: high-speed contour offset after adaptive rough. 2-flute polished carbide. Leaves 0.08 mm for final pass.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "SLT-S-3AX-SFN-001",
    conditions: { feature_type: "slot", material_iso: "S", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "rest_machining",
    parameters: { ae_pct: 15, ap_factor: 0.15, vc_mult: 1.2, fz_mult: 0.7 },
    justification: "Superalloy slot semi-finish: rest machining with small ball-nose removes trochoidal scallops from slot corners. Low engagement prevents work-hardening.",
    source: "tribal",
    confidence: 0.86,
  },
  {
    id: "SLT-H-3AX-SFN-001",
    conditions: { feature_type: "slot", material_iso: "H", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_z_level",
    parameters: { ae_pct: 15, ap_factor: 0.08, vc_mult: 1.8, fz_mult: 0.75 },
    justification: "Hard steel slot semi-finish: Z-level passes with CBN end mill. ap < 0.08×D to stay below chipping threshold. Dry cutting.",
    source: "physics",
    confidence: 0.87,
  },

  // ── Wall — 3+2 additional ─────────────────────────────────────────────────
  {
    id: "WLL-S-3P2-FIN-001",
    conditions: { feature_type: "wall", material_iso: "S", machine_axes: "3+2", operation: "finishing" },
    strategy: "flank_milling",
    parameters: { ae_pct: 100, ap_factor: 0.2, vc_mult: 1.4, fz_mult: 0.68 },
    justification: "3+2 superalloy wall finish: indexed flank milling. Single pass per wall face. Eliminates Z-level scallop on aerospace structural ribs. Through-tool coolant mandatory.",
    source: "novel",
    confidence: 0.87,
  },
  {
    id: "WLL-N-5AX-RGH-001",
    conditions: { feature_type: "wall", material_iso: "N", machine_axes: "5-axis", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 15, ap_factor: 2.0, vc_mult: 2.8, fz_mult: 1.35 },
    justification: "5-axis aluminum wall rough: adaptive with dynamic tilt for curved/angled wall arrays on aerospace structures. Maximum MRR enabled by low cutting forces in aluminum.",
    source: "novel",
    confidence: 0.89,
  },

  // ══════════════════════════════════════════════════════════════════════════
  // BATCH 3 — final rules to reach 200+ total
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: "SLT-K-3AX-FIN-001",
    conditions: { feature_type: "slot", material_iso: "K", machine_axes: "3-axis", operation: "finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 8, ap_factor: 0.05, vc_mult: 2.4, fz_mult: 0.88 },
    justification: "Cast iron slot finish: high Vc contour at low ae. CI allows climb milling at elevated speed. No BUE. Ra < 1.6 µm with standard carbide end mill.",
    source: "playbook",
    confidence: 0.90,
  },
  {
    id: "BOR-P-5AX-FIN-001",
    conditions: { feature_type: "bore", material_iso: "P", machine_axes: "5-axis", operation: "finishing" },
    strategy: "fine_boring",
    parameters: { ae_pct: 100, ap_factor: 0.005, vc_mult: 1.2, fz_mult: 0.6 },
    justification: "5-axis steel bore finish: precision boring in tilted orientation for compound-angle bores (e.g., oil galleries, valve seats on complex castings). Same physics as 3-axis — tilt provides access only.",
    source: "novel",
    confidence: 0.87,
  },
  {
    id: "RIB-K-3AX-RGH-001",
    conditions: { feature_type: "rib", material_iso: "K", machine_axes: "3-axis", operation: "roughing" },
    strategy: "z_level_rough",
    parameters: { ae_pct: 25, ap_factor: 0.55, vc_mult: 2.2, fz_mult: 1.1 },
    justification: "Cast iron rib rough: Z-level at high Vc. Short chips eliminate packing around thin ribs. Top-down sequence. Dry machining acceptable.",
    source: "playbook",
    confidence: 0.89,
  },
  {
    id: "WLL-N-3AX-SFN-001",
    conditions: { feature_type: "wall", material_iso: "N", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 12, ap_factor: 0.12, vc_mult: 2.5, fz_mult: 1.1 },
    justification: "Aluminum wall semi-finish: contour offset at high Vc removes adaptive roughing scallops. Leaves 0.1 mm for final spring pass. 2-flute polished carbide.",
    source: "playbook",
    confidence: 0.91,
  },
  {
    id: "THR-K-5AX-ANY-001",
    conditions: { feature_type: "thread", material_iso: "K", machine_axes: "5-axis" },
    strategy: "tapping",
    parameters: { ae_pct: 100, ap_factor: 0.08, vc_mult: 1.2, fz_mult: 0.9 },
    justification: "5-axis cast iron threading: tapping in tilted orientation for angled threaded holes on CI housings. Same tap performance as 3-axis — tilt provides access to compound-angle features.",
    source: "novel",
    confidence: 0.85,
  },
  {
    id: "FFF-N-5AX-RGH-001",
    conditions: { feature_type: "freeform", material_iso: "N", machine_axes: "5-axis", operation: "roughing" },
    strategy: "adaptive_clearing",
    parameters: { ae_pct: 15, ap_factor: 2.0, vc_mult: 2.9, fz_mult: 1.4 },
    justification: "5-axis aluminum freeform rough: maximum MRR adaptive with continuous tilt. Particularly effective for aerospace wing ribs and structural pockets with complex curved boundaries.",
    source: "novel",
    confidence: 0.91,
  },
  {
    id: "CTR-M-3AX-SFN-001",
    conditions: { feature_type: "contour", material_iso: "M", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 18, ap_factor: 0.18, vc_mult: 1.35, fz_mult: 0.82 },
    justification: "Stainless contour semi-finish: moderate ae to avoid work-hardening. Leaves 0.12 mm for final spring pass. Climb milling throughout to minimize BUE.",
    source: "playbook",
    confidence: 0.88,
  },
  {
    id: "WLL-M-3AX-SFN-001",
    conditions: { feature_type: "wall", material_iso: "M", machine_axes: "3-axis", operation: "semi-finishing" },
    strategy: "contour_offset",
    parameters: { ae_pct: 12, ap_factor: 0.1, vc_mult: 1.35, fz_mult: 0.8 },
    justification: "Stainless wall semi-finish: bilateral passes at reduced ae. Alternating side approach equalises residual stress. Leaves 0.08 mm per side for finish.",
    source: "tribal",
    confidence: 0.87,
  },
];

// ============================================================================
// SCORING HELPERS
// ============================================================================

/** Count how many conditions in a rule's conditions match the query. */
function countMatches(rule: StrategyRule, query: QueryConditions): number {
  const c = rule.conditions;
  let matches = 0;

  if (c.feature_type !== undefined) {
    if (c.feature_type !== query.feature_type) return -1;
    matches++;
  }
  if (c.material_iso !== undefined) {
    if (c.material_iso !== query.material_iso) return -1;
    matches++;
  }
  if (c.machine_axes !== undefined) {
    if (c.machine_axes !== query.machine_axes) return -1;
    matches++;
  }
  if (c.operation !== undefined) {
    if (c.operation !== query.operation) return -1;
    matches++;
  }
  if (c.depth_ratio_min !== undefined) {
    if (query.depth_ratio === undefined || query.depth_ratio < c.depth_ratio_min) return -1;
    matches++;
  }
  if (c.wall_thickness_max_mm !== undefined) {
    if (query.wall_thickness_mm === undefined || query.wall_thickness_mm > c.wall_thickness_max_mm) return -1;
    matches++;
  }
  if (c.tolerance_class !== undefined) {
    if (c.tolerance_class !== query.tolerance_class) return -1;
    matches++;
  }
  if (c.special_conditions !== undefined && c.special_conditions.length > 0) {
    const querySet = new Set(query.special_conditions ?? []);
    const allPresent = c.special_conditions.every((sc) => querySet.has(sc));
    if (!allPresent) return -1;
    matches += c.special_conditions.length;
  }

  return matches;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

class FeatureStrategyKnowledgeBaseEngine {
  private rules: StrategyRule[];

  constructor(initialRules: StrategyRule[]) {
    // Deep copy so mutation via addRule() does not affect the constant array
    this.rules = initialRules.map((r) => ({ ...r, conditions: { ...r.conditions } }));
  }

  /**
   * Query the rule base for all matching rules, ranked by:
   *   1. Specificity score (more conditions matched = higher rank)
   *   2. Confidence (tie-breaker)
   *
   * @param conditions - Query conditions to match against
   * @returns Matching rules ordered by descending specificity then confidence
   */
  query(conditions: QueryConditions): StrategyRule[] {
    const scored: Array<{ rule: StrategyRule; score: number }> = [];

    for (const rule of this.rules) {
      const matches = countMatches(rule, conditions);
      if (matches >= 0) {
        // Specificity = matched condition count weighted by confidence
        scored.push({ rule, score: matches * 10 + rule.confidence });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.rule);
  }

  /**
   * Get the single best strategy recommendation for a given context.
   *
   * @param feature_type - The feature being machined
   * @param material_iso - ISO material group
   * @param machine_axes - Machine axis configuration
   * @param operation - Roughing / semi-finishing / finishing
   * @param extra - Additional conditions (depth_ratio, wall_thickness_mm, etc.)
   * @returns Recommendation with top rule and up to 3 alternatives
   */
  getBestStrategy(
    feature_type: FeatureType,
    material_iso: IsoGroup,
    machine_axes: MachineAxes,
    operation: OperationType,
    extra: Partial<QueryConditions> = {},
  ): StrategyRecommendation {
    const results = this.query({
      feature_type,
      material_iso,
      machine_axes,
      operation,
      ...extra,
    });

    if (results.length === 0) {
      // Fallback: relax material and axis constraints
      const fallback = this.query({ feature_type, operation });
      const best = fallback[0];
      if (!best) {
        // Ultimate fallback
        return {
          rule: this.rules[0],
          strategy: this.rules[0].strategy,
          parameters: this.rules[0].parameters,
          justification: this.rules[0].justification,
          confidence: 0.5,
          alternatives: [],
        };
      }
      return {
        rule: best,
        strategy: best.strategy,
        parameters: best.parameters,
        justification: `[Fallback — no exact match for ${material_iso}/${machine_axes}] ${best.justification}`,
        confidence: best.confidence * 0.8,
        alternatives: fallback.slice(1, 4),
      };
    }

    const best = results[0];
    return {
      rule: best,
      strategy: best.strategy,
      parameters: best.parameters,
      justification: best.justification,
      confidence: best.confidence,
      alternatives: results.slice(1, 4),
    };
  }

  /**
   * Add a custom rule to the knowledge base.
   * Custom rules coexist with built-in rules and compete on specificity.
   *
   * @param rule - The rule to add
   * @throws Error if a rule with the same id already exists
   */
  addRule(rule: StrategyRule): void {
    if (this.rules.some((r) => r.id === rule.id)) {
      throw new Error(`Rule with id '${rule.id}' already exists. Use a unique id.`);
    }
    this.rules.push({ ...rule, conditions: { ...rule.conditions } });
  }

  /**
   * Replace an existing rule by id (for updates to built-in rules).
   *
   * @param id - Rule id to replace
   * @param rule - New rule data
   * @returns true if replaced, false if not found
   */
  updateRule(id: string, rule: Partial<StrategyRule>): boolean {
    const idx = this.rules.findIndex((r) => r.id === id);
    if (idx < 0) return false;
    this.rules[idx] = { ...this.rules[idx], ...rule };
    return true;
  }

  /**
   * Get all rules, optionally filtered by feature type.
   *
   * @param feature_type - Optional filter
   * @returns Matching rules
   */
  listRules(feature_type?: FeatureType): StrategyRule[] {
    if (!feature_type) return [...this.rules];
    return this.rules.filter((r) => r.conditions.feature_type === feature_type);
  }

  /**
   * Total number of rules in the knowledge base.
   */
  getRuleCount(): number {
    return this.rules.length;
  }

  /**
   * Rules grouped by source provenance.
   *
   * @returns Object with keys: playbook, tribal, novel, physics
   */
  getRulesBySource(): Record<RuleSource, StrategyRule[]> {
    const out: Record<RuleSource, StrategyRule[]> = {
      playbook: [],
      tribal: [],
      novel: [],
      physics: [],
    };
    for (const rule of this.rules) {
      out[rule.source].push(rule);
    }
    return out;
  }

  /**
   * Summary statistics for the knowledge base.
   */
  getStats(): {
    total: number;
    by_feature: Record<string, number>;
    by_iso: Record<string, number>;
    by_axes: Record<string, number>;
    by_operation: Record<string, number>;
    by_source: Record<string, number>;
    avg_confidence: number;
  } {
    const by_feature: Record<string, number> = {};
    const by_iso: Record<string, number> = {};
    const by_axes: Record<string, number> = {};
    const by_operation: Record<string, number> = {};
    const by_source: Record<string, number> = {};
    let confSum = 0;

    for (const r of this.rules) {
      const ft = r.conditions.feature_type ?? "_any";
      const iso = r.conditions.material_iso ?? "_any";
      const ax = r.conditions.machine_axes ?? "_any";
      const op = r.conditions.operation ?? "_any";

      by_feature[ft] = (by_feature[ft] ?? 0) + 1;
      by_iso[iso] = (by_iso[iso] ?? 0) + 1;
      by_axes[ax] = (by_axes[ax] ?? 0) + 1;
      by_operation[op] = (by_operation[op] ?? 0) + 1;
      by_source[r.source] = (by_source[r.source] ?? 0) + 1;
      confSum += r.confidence;
    }

    return {
      total: this.rules.length,
      by_feature,
      by_iso,
      by_axes,
      by_operation,
      by_source,
      avg_confidence: this.rules.length > 0 ? confSum / this.rules.length : 0,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const featureStrategyKnowledgeBaseEngine =
  new FeatureStrategyKnowledgeBaseEngine(RULES);

export { FeatureStrategyKnowledgeBaseEngine };
