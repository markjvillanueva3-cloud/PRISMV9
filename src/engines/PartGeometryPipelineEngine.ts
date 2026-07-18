/**
 * PartGeometryPipelineEngine — Part-geometry-driven machining pipeline.
 *
 * Takes part features (pockets, holes, walls, etc.) and a user tool library,
 * then recommends optimal toolpath strategy + S/F for each machining operation.
 * Orchestrates feature analysis, tool-to-feature matching, strategy ranking,
 * operation sequencing, and magazine layout.
 *
 * Lazy-loads OptimalStrategySelectionEngine (E1087) and MachiningPlaybookEngine
 * for enhanced strategy selection and per-operation advisories, with graceful
 * fallback to inline physics if unavailable.
 * Uses inline Kienzle force, Taylor tool-life, and chip-thinning physics.
 *
 * References:
 *   - Kienzle (1952): Fc = kc1.1 × ap × fz^(1−mc)
 *   - Taylor (1907): VT^n = C  →  T = (C/Vc)^(1/n)
 *   - Chip thinning: fz_eff = fz × √(D / (2×ae))  for ae < D/2
 *   - MRR = ap × ae × Vf  (mm³/min)
 *
 * @module engines/PartGeometryPipelineEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// ATOMIC VALUE
// ============================================================================

/** Atomic value with unit, formula provenance, and confidence. */
export interface AtomicValue<T> {
  value: T;
  unit: string;
  formula?: string;
  confidence?: number;
}

// ============================================================================
// TYPES
// ============================================================================

/** Valid feature types for part geometry. */
export type FeatureType =
  | "pocket_open"
  | "pocket_closed"
  | "hole_through"
  | "hole_blind"
  | "wall"
  | "contour"
  | "face"
  | "slot"
  | "thread"
  | "chamfer"
  | "fillet";

/** A single geometric feature on the part. */
export interface PartFeature {
  id: string;
  type: FeatureType;
  width_mm?: number;
  length_mm?: number;
  depth_mm: number;
  diameter_mm?: number;
  corner_radius_mm?: number;
  wall_thickness_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra_um?: number;
  position?: { x: number; y: number; z: number };
}

/** A tool from the user's library. */
export interface UserTool {
  tool_id: string;
  tool_name: string;
  diameter_mm: number;
  flutes: number;
  flute_length_mm: number;
  material: string;
  coating: string;
  corner_radius_mm?: number;
  type?: string;
  thread_pitch_mm?: number;
}

/** A tool candidate scored for a particular feature + operation. */
export interface ToolCandidate {
  tool_id: string;
  tool_name: string;
  diameter_mm: number;
  flutes: number;
  material: string;
  coating: string;
  fit_score: number;
  reason: string;
}

/** Operation types for machining. */
export type OperationType =
  | "roughing"
  | "semi_finishing"
  | "finishing"
  | "drilling"
  | "tapping"
  | "reaming"
  | "chamfering";

/** A single machining operation plan. */
export interface OperationPlan {
  sequence_number: number;
  feature_id: string;
  feature_type: string;
  operation: OperationType;
  tool: ToolCandidate;
  strategy: string;
  cutting_speed_mpm: number;
  feed_per_tooth_mm: number;
  spindle_rpm: number;
  feed_rate_mmmin: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  estimated_time_min: number;
  estimated_mrr_cm3min: number;
  warnings: string[];
  notes: string[];
}

/** Full job plan output. */
export interface JobPlan {
  operations: OperationPlan[];
  total_time_min: number;
  total_tool_changes: number;
  tools_used: string[];
  tools_missing: {
    feature_id: string;
    feature_type: string;
    min_diameter_mm: number;
    min_flute_length_mm: number;
    suggestion: string;
  }[];
  magazine_layout: { position: number; tool_id: string; tool_name: string }[];
  warnings: string[];
}

/** Feature complexity classification. */
export type FeatureComplexity = "simple" | "moderate" | "complex";

/** Enriched feature with complexity and required operations. */
export interface EnrichedFeature extends PartFeature {
  complexity: FeatureComplexity;
  required_ops: OperationType[];
  aspect_ratio: number;
  estimated_volume_mm3: number;
}

/** Feature analysis result. */
export interface FeatureAnalysis {
  features: EnrichedFeature[];
  total_operations: number;
  estimated_complexity: FeatureComplexity;
}

/** Tool match result for a single feature + operation pair. */
export interface ToolMatch {
  feature_id: string;
  operation: OperationType;
  candidates: ToolCandidate[];
}

/** Unmatched feature + operation requiring a tool purchase. */
export interface UnmatchedSpec {
  feature_id: string;
  feature_type: string;
  operation: OperationType;
  min_diameter_mm: number;
  max_diameter_mm: number;
  min_flute_length_mm: number;
}

/** Tool matching result. */
export interface ToolMatchResult {
  matches: ToolMatch[];
  unmatched: UnmatchedSpec[];
}

/** Tool purchase suggestion. */
export interface ToolSuggestion {
  tool_spec: string;
  covers_features: string[];
  estimated_cost_usd: number;
  priority: number;
}

/** Purchase suggestions result. */
export interface PurchaseSuggestions {
  suggestions: ToolSuggestion[];
  total_estimated_cost: number;
}

// ============================================================================
// MATERIAL DATABASE (inline)
// ============================================================================

interface MaterialProps {
  vc_base_mpm: number;
  kc1_1: number;
  mc: number;
  taylor_C_factor: number;
  taylor_n: number;
}

/** Inline material database — base cutting speed, specific cutting force, Taylor constants. */
const MATERIAL_DB: Record<string, MaterialProps> = {
  steel:      { vc_base_mpm: 200, kc1_1: 1800, mc: 0.25, taylor_C_factor: 1.5, taylor_n: 0.25 },
  aluminum:   { vc_base_mpm: 500, kc1_1: 800,  mc: 0.20, taylor_C_factor: 1.5, taylor_n: 0.20 },
  titanium:   { vc_base_mpm: 60,  kc1_1: 2800, mc: 0.28, taylor_C_factor: 1.5, taylor_n: 0.30 },
  stainless:  { vc_base_mpm: 150, kc1_1: 2100, mc: 0.25, taylor_C_factor: 1.5, taylor_n: 0.28 },
  cast_iron:  { vc_base_mpm: 180, kc1_1: 1100, mc: 0.28, taylor_C_factor: 1.5, taylor_n: 0.22 },
  inconel:    { vc_base_mpm: 30,  kc1_1: 2800, mc: 0.28, taylor_C_factor: 1.5, taylor_n: 0.35 },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const VALID_FEATURE_TYPES: ReadonlySet<string> = new Set<string>([
  "pocket_open", "pocket_closed", "hole_through", "hole_blind",
  "wall", "contour", "face", "slot", "thread", "chamfer", "fillet",
]);

/**
 * Resolve material properties from a free-text name.
 * Falls back to steel if unrecognized.
 */
function resolveMaterial(name: string): MaterialProps {
  const key = name.toLowerCase().trim();
  for (const [k, v] of Object.entries(MATERIAL_DB)) {
    if (key.includes(k)) return v;
  }
  return MATERIAL_DB["steel"];
}

/**
 * RPM from cutting speed and tool diameter.
 * Formula: n = 1000 × Vc / (π × D)
 */
function rpmFromVc(vc_mpm: number, d_mm: number): number {
  return Math.round((1000 * vc_mpm) / (Math.PI * d_mm));
}

/**
 * Estimate feature volume in mm³ for cycle-time estimation.
 */
function estimateVolume(f: PartFeature): number {
  if (f.type === "hole_through" || f.type === "hole_blind") {
    const r = (f.diameter_mm ?? 10) / 2;
    return Math.PI * r * r * f.depth_mm;
  }
  if (f.type === "thread") {
    const r = (f.diameter_mm ?? 10) / 2;
    return Math.PI * r * r * f.depth_mm * 0.15; // thread removal ≈ 15% of cylinder
  }
  if (f.type === "chamfer" || f.type === "fillet") {
    const w = f.width_mm ?? 2;
    return 0.5 * w * w * (f.length_mm ?? 20);
  }
  const w = f.width_mm ?? 20;
  const l = f.length_mm ?? w;
  return w * l * f.depth_mm;
}

// ============================================================================
// LAZY-LOADED SUB-ENGINES (graceful fallback if unavailable)
// ============================================================================

const _pgpLazyCache: Record<string, any> = {};

function _pgpLazyEngine<T = any>(name: string, path: string): T | null {
  if (!(name in _pgpLazyCache)) {
    try {
      const m = require(path);
      _pgpLazyCache[name] = m[name] ? new m[name]() : null;
    } catch {
      _pgpLazyCache[name] = null;
    }
  }
  return _pgpLazyCache[name] as T | null;
}

function getOptimalStrategyEngine(): any {
  return _pgpLazyEngine("OptimalStrategySelectionEngine", "./OptimalStrategySelectionEngine.js");
}

function getMachiningPlaybookEngine(): any {
  return _pgpLazyEngine("MachiningPlaybookEngine", "./MachiningPlaybookEngine.js");
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * PartGeometryPipelineEngine — orchestrates feature analysis, tool matching,
 * job planning with S/F physics, and tool purchase suggestions.
 *
 * Usage:
 * ```ts
 * const analysis = partGeometryPipelineEngine.analyzeFeatures({ features, material: "aluminum" });
 * const matches  = partGeometryPipelineEngine.matchTools({ features, tools, material: "aluminum" });
 * const plan     = partGeometryPipelineEngine.generateJobPlan({ features, tools, material: "aluminum" });
 * const buys     = partGeometryPipelineEngine.suggestToolPurchases({ unmatched_features: matches.value.unmatched });
 * ```
 */
class PartGeometryPipelineEngine {
  // ==========================================================================
  // 1. ANALYZE FEATURES
  // ==========================================================================

  /**
   * Extract and classify part features, determining complexity and required
   * machining operations for each.
   *
   * Complexity rules:
   *   - simple: face, chamfer, fillet
   *   - moderate: pocket, hole, slot, thread, contour
   *   - complex: thin wall (≤2 mm), deep pocket (AR > 4), tight tolerance (< 0.01 mm)
   *
   * Operation mapping:
   *   - pocket: roughing + finishing (+ semi-finishing if tol < 0.02)
   *   - hole_through: drilling (+ reaming if tol < 0.02)
   *   - hole_blind: peck drilling
   *   - thread: drilling + tapping
   *   - face: roughing (face milling)
   *   - slot: roughing + finishing
   *   - wall: finishing only
   *   - contour: roughing + finishing
   *   - chamfer: chamfering
   *   - fillet: finishing
   *
   * @param input - features array and workpiece material
   * @returns AtomicValue wrapping the enriched feature analysis
   */
  analyzeFeatures(input: {
    features: PartFeature[];
    material: string;
  }): AtomicValue<FeatureAnalysis> {
    const { features, material } = input;
    if (!features || features.length === 0) {
      return {
        value: { features: [], total_operations: 0, estimated_complexity: "simple" },
        unit: "analysis",
        formula: "feature_classification",
        confidence: 1.0,
      };
    }

    const enriched: EnrichedFeature[] = [];
    let totalOps = 0;
    let maxComplexity: FeatureComplexity = "simple";

    for (const f of features) {
      // Validate
      if (!VALID_FEATURE_TYPES.has(f.type)) {
        log.warn(`[PartGeometryPipeline] Unknown feature type: ${f.type}, skipping`);
        continue;
      }
      if (f.depth_mm <= 0) {
        log.warn(`[PartGeometryPipeline] Feature ${f.id} has non-positive depth, skipping`);
        continue;
      }

      const effectiveWidth = f.width_mm ?? f.diameter_mm ?? 20;
      const ar = effectiveWidth > 0 ? f.depth_mm / effectiveWidth : 0;
      const volume = estimateVolume(f);

      // Classify complexity
      let complexity: FeatureComplexity = "moderate";
      if (f.type === "face" || f.type === "chamfer" || f.type === "fillet") {
        complexity = "simple";
      }
      if (
        (f.wall_thickness_mm !== undefined && f.wall_thickness_mm <= 2) ||
        ar > 4 ||
        (f.tolerance_mm !== undefined && f.tolerance_mm < 0.01)
      ) {
        complexity = "complex";
      }

      // Determine required operations
      const ops = this._opsForFeature(f);
      totalOps += ops.length;

      // Track overall complexity
      if (complexity === "complex") maxComplexity = "complex";
      else if (complexity === "moderate" && maxComplexity === "simple") maxComplexity = "moderate";

      enriched.push({
        ...f,
        complexity,
        required_ops: ops,
        aspect_ratio: Math.round(ar * 100) / 100,
        estimated_volume_mm3: Math.round(volume * 100) / 100,
      });
    }

    return {
      value: {
        features: enriched,
        total_operations: totalOps,
        estimated_complexity: maxComplexity,
      },
      unit: "analysis",
      formula: "feature_classification + operation_mapping",
      confidence: 0.92,
    };
  }

  /**
   * Determine required machining operations for a feature.
   * @internal
   */
  private _opsForFeature(f: PartFeature): OperationType[] {
    const tol = f.tolerance_mm ?? 0.1;
    switch (f.type) {
      case "pocket_open":
      case "pocket_closed": {
        const ops: OperationType[] = ["roughing"];
        if (tol < 0.02) ops.push("semi_finishing");
        ops.push("finishing");
        return ops;
      }
      case "hole_through": {
        const ops: OperationType[] = ["drilling"];
        if (tol < 0.02) ops.push("reaming");
        return ops;
      }
      case "hole_blind":
        return ["drilling"]; // peck drill strategy handled in plan
      case "thread":
        return ["drilling", "tapping"];
      case "face":
        return ["roughing"];
      case "slot": {
        const ops: OperationType[] = ["roughing"];
        if (tol < 0.05) ops.push("finishing");
        return ops;
      }
      case "wall":
        return ["finishing"];
      case "contour":
        return ["roughing", "finishing"];
      case "chamfer":
        return ["chamfering"];
      case "fillet":
        return ["finishing"];
      default:
        return ["roughing"];
    }
  }

  // ==========================================================================
  // 2. MATCH TOOLS
  // ==========================================================================

  /**
   * Match user tools to features for each required operation.
   *
   * Scoring:
   *   - Roughing: prefer largest tool that fits (higher MRR).
   *     fit_score = 0.5 × (tool_dia / feature_width) + 0.3 × flute_coverage + 0.2 × material_bonus
   *   - Finishing: prefer smallest corner radius.
   *     fit_score = 0.5 × (1 − corner_r / feature_corner_r) + 0.3 × precision + 0.2 × material_bonus
   *   - Drilling/reaming: diameter must match ±0.5 mm.
   *   - Tapping: diameter must match thread size.
   *
   * @param input - features, user tools, and material
   * @returns AtomicValue wrapping match results
   */
  matchTools(input: {
    features: PartFeature[];
    tools: UserTool[];
    material: string;
  }): AtomicValue<ToolMatchResult> {
    const { features, tools, material } = input;
    const analysis = this.analyzeFeatures({ features, material });
    const enriched = analysis.value.features;
    const matches: ToolMatch[] = [];
    const unmatched: UnmatchedSpec[] = [];

    for (const feat of enriched) {
      for (const op of feat.required_ops) {
        const { candidates, spec } = this._matchToolsForOp(feat, op, tools);
        if (candidates.length > 0) {
          matches.push({ feature_id: feat.id, operation: op, candidates });
        } else if (spec) {
          unmatched.push(spec);
        }
      }
    }

    return {
      value: { matches, unmatched },
      unit: "match_result",
      formula: "tool_fit_scoring",
      confidence: matches.length > 0 ? 0.88 : 0.5,
    };
  }

  /**
   * Score and rank tools for a specific feature + operation.
   * @internal
   */
  private _matchToolsForOp(
    feat: EnrichedFeature,
    op: OperationType,
    tools: UserTool[]
  ): { candidates: ToolCandidate[]; spec: UnmatchedSpec | null } {
    const candidates: ToolCandidate[] = [];

    const featureWidth = feat.width_mm ?? feat.diameter_mm ?? 1000;
    const featureDepth = feat.depth_mm;

    // Determine dimensional constraints
    let minDia = 0;
    let maxDia = featureWidth;
    let minFluteLen = featureDepth;

    if (op === "drilling" || op === "reaming") {
      // Must match hole diameter
      const holeDia = feat.diameter_mm ?? 10;
      minDia = holeDia - 0.5;
      maxDia = holeDia + 0.5;
    } else if (op === "tapping") {
      // Tap drill = thread diameter × 0.85 (approx)
      const threadDia = feat.diameter_mm ?? 10;
      minDia = threadDia * 0.75;
      maxDia = threadDia * 1.05;
    } else if (op === "chamfering") {
      // Chamfer tools — flexible size
      maxDia = 100;
      minFluteLen = 0;
    } else {
      // Milling: tool must fit inside feature
      if (feat.type === "pocket_closed" || feat.type === "pocket_open" || feat.type === "slot") {
        // Tool diameter must be ≤ feature width (leave clearance)
        maxDia = featureWidth * 0.95;
        // For closed pockets, must also fit corner radius
        if (feat.corner_radius_mm !== undefined) {
          maxDia = Math.min(maxDia, feat.corner_radius_mm * 2);
        }
      }
    }

    for (const t of tools) {
      // Geometric filter
      if (t.diameter_mm < minDia || t.diameter_mm > maxDia) continue;
      if (t.flute_length_mm < minFluteLen && op !== "chamfering") continue;

      // Type filter: drilling/reaming/tapping need appropriate tool types
      if ((op === "drilling" || op === "reaming") && t.type !== undefined) {
        const ttype = t.type.toLowerCase();
        if (op === "drilling" && !ttype.includes("drill") && !ttype.includes("endmill")) continue;
        if (op === "reaming" && !ttype.includes("ream")) continue;
      }
      if (op === "tapping" && t.type !== undefined && !t.type.toLowerCase().includes("tap")) continue;

      // Score
      let score = 0;
      let reason = "";

      if (op === "roughing") {
        // Larger tool = higher MRR = better for roughing
        const sizeRatio = maxDia > 0 ? t.diameter_mm / maxDia : 0.5;
        const fluteRatio = minFluteLen > 0 ? Math.min(t.flute_length_mm / minFluteLen, 1) : 1;
        const matBonus = this._materialCompatibility(t.material, t.coating);
        score = 0.5 * sizeRatio + 0.3 * fluteRatio + 0.2 * matBonus;
        reason = `Roughing: dia=${t.diameter_mm}mm (${(sizeRatio * 100).toFixed(0)}% of max), ` +
                 `flute coverage=${(fluteRatio * 100).toFixed(0)}%`;
      } else if (op === "finishing" || op === "semi_finishing") {
        // Smaller corner radius = better finish
        const crTool = t.corner_radius_mm ?? 0;
        const crFeat = feat.corner_radius_mm ?? 5;
        const precisionScore = crFeat > 0 ? Math.max(0, 1 - crTool / crFeat) : 0.5;
        const fluteScore = t.flutes >= 4 ? 1 : t.flutes / 4;
        const matBonus = this._materialCompatibility(t.material, t.coating);
        score = 0.4 * precisionScore + 0.3 * fluteScore + 0.3 * matBonus;
        reason = `Finishing: corner_r=${crTool}mm, flutes=${t.flutes}, precision=${(precisionScore * 100).toFixed(0)}%`;
      } else if (op === "drilling" || op === "reaming") {
        // Closer diameter match = better
        const holeDia = feat.diameter_mm ?? 10;
        const diaMatch = 1 - Math.abs(t.diameter_mm - holeDia) / holeDia;
        const matBonus = this._materialCompatibility(t.material, t.coating);
        score = 0.7 * diaMatch + 0.3 * matBonus;
        reason = `Drilling: dia match=${(diaMatch * 100).toFixed(0)}%, target=${holeDia}mm`;
      } else if (op === "tapping") {
        const threadDia = feat.diameter_mm ?? 10;
        const diaMatch = 1 - Math.abs(t.diameter_mm - threadDia * 0.85) / threadDia;
        score = 0.8 * Math.max(0, diaMatch) + 0.2;
        reason = `Tapping: thread=${threadDia}mm, tap_drill=${(threadDia * 0.85).toFixed(1)}mm`;
      } else {
        // Chamfering — any chamfer tool works
        score = 0.7;
        reason = "Chamfering pass";
      }

      score = Math.max(0, Math.min(1, score));
      candidates.push({
        tool_id: t.tool_id,
        tool_name: t.tool_name,
        diameter_mm: t.diameter_mm,
        flutes: t.flutes,
        material: t.material,
        coating: t.coating,
        fit_score: Math.round(score * 1000) / 1000,
        reason,
      });
    }

    // Sort descending by fit_score
    candidates.sort((a, b) => b.fit_score - a.fit_score);

    const spec: UnmatchedSpec | null =
      candidates.length === 0
        ? {
            feature_id: feat.id,
            feature_type: feat.type,
            operation: op,
            min_diameter_mm: minDia,
            max_diameter_mm: maxDia,
            min_flute_length_mm: minFluteLen,
          }
        : null;

    return { candidates, spec };
  }

  /**
   * Rate tool material + coating compatibility (0–1).
   * @internal
   */
  private _materialCompatibility(toolMaterial: string, coating: string): number {
    const mat = (toolMaterial ?? "").toLowerCase();
    const coat = (coating ?? "").toLowerCase();
    let score = 0.5;
    if (mat.includes("carbide")) score += 0.3;
    else if (mat.includes("hss")) score += 0.1;
    if (coat.includes("tialn") || coat.includes("altin")) score += 0.2;
    else if (coat.includes("tin") || coat.includes("ticn")) score += 0.1;
    return Math.min(1, score);
  }

  // ==========================================================================
  // 3. GENERATE JOB PLAN
  // ==========================================================================

  /**
   * Generate a complete job plan with sequenced operations, S/F parameters,
   * strategy selection, cycle-time estimates, and magazine layout.
   *
   * Physics (inline):
   *   - RPM = 1000 × Vc / (π × D)
   *   - fz = D × 0.01 (roughing) or D × 0.005 (finishing)
   *   - Fc = kc1.1 × ap × fz^(1−mc)   [Kienzle 1952]
   *   - Power = Fc × Vc / 60000  (kW)
   *   - Taylor: T = (C / Vc)^(1/n)  where C = 1.5 × Vc_base
   *   - MRR = ap × ae × Vf / 1000  (cm³/min)
   *   - Cycle time = volume / MRR + n_rapids × 0.5 s
   *
   * Strategy selection:
   *   - Pocket roughing → adaptive (ae=10%, Vc×2.0)
   *   - Pocket finishing → conventional (ae=5%)
   *   - Hole → drill cycle (peck if depth > 3×dia)
   *   - Slot → trochoidal if width > 1.5×tool_dia
   *   - Face → face mill pattern
   *   - Contour → profile pass
   *
   * Sequencing priority: face → pocket rough → slot rough → contour rough →
   *   pocket finish → slot finish → contour finish → holes → threads → chamfers → fillets
   *
   * @param input - features, tools, material, optional CAM preference
   * @returns AtomicValue wrapping the full JobPlan
   */
  generateJobPlan(input: {
    features: PartFeature[];
    tools: UserTool[];
    material: string;
    cam_software?: string;
    strategy_preference?: string;
  }): AtomicValue<JobPlan> {
    const { features, tools, material, strategy_preference } = input;
    const matProps = resolveMaterial(material);
    const matchResult = this.matchTools({ features, tools, material });
    const analysis = this.analyzeFeatures({ features, material });

    const matchMap = new Map<string, ToolMatch>();
    for (const m of matchResult.value.matches) {
      matchMap.set(`${m.feature_id}::${m.operation}`, m);
    }

    const featureMap = new Map<string, EnrichedFeature>();
    for (const ef of analysis.value.features) {
      featureMap.set(ef.id, ef);
    }

    // Build raw operations
    const rawOps: OperationPlan[] = [];
    const warnings: string[] = [];

    for (const ef of analysis.value.features) {
      for (const op of ef.required_ops) {
        const key = `${ef.id}::${op}`;
        const match = matchMap.get(key);
        if (!match || match.candidates.length === 0) continue;

        const bestTool = match.candidates[0];
        const { strategy, vc, fz, ap, ae, opWarnings, opNotes } =
          this._computeSfStrategy(ef, op, bestTool, matProps, strategy_preference);

        const rpm = rpmFromVc(vc, bestTool.diameter_mm);
        const vf = Math.round(fz * bestTool.flutes * rpm);
        const mrr = (ap * ae * vf) / 1000; // mm³/min → divide by 1000 for cm³/min
        const volume = ef.estimated_volume_mm3;
        // Roughing removes ~70% of volume, finishing ~30%
        const volumeFraction = op === "roughing" ? 0.7 : op === "semi_finishing" ? 0.2 : 0.1;
        const cutVolume = volume * volumeFraction;
        const cutTime = mrr > 0 ? cutVolume / (mrr * 1000) : 0; // convert cm³/min back to mm³/min
        const rapidTime = 0.05; // 3 seconds rapid overhead per operation
        const estTime = Math.max(0.1, cutTime + rapidTime);

        const opPlan: OperationPlan = {
          sequence_number: 0, // assigned after sorting
          feature_id: ef.id,
          feature_type: ef.type,
          operation: op,
          tool: bestTool,
          strategy,
          cutting_speed_mpm: Math.round(vc * 10) / 10,
          feed_per_tooth_mm: Math.round(fz * 10000) / 10000,
          spindle_rpm: rpm,
          feed_rate_mmmin: vf,
          axial_depth_mm: Math.round(ap * 1000) / 1000,
          radial_depth_mm: Math.round(ae * 1000) / 1000,
          estimated_time_min: Math.round(estTime * 100) / 100,
          estimated_mrr_cm3min: Math.round(mrr * 100) / 100,
          warnings: opWarnings,
          notes: opNotes,
        };

        // ── Try MachiningPlaybookEngine for per-operation advisories ──
        try {
          const mpb = getMachiningPlaybookEngine();
          if (mpb && typeof mpb.advise === "function") {
            const advice = mpb.advise({
              features: [ef.type],
              operation_type: op,
              wall_thickness_mm: ef.wall_thickness_mm,
              tolerance_mm: ef.tolerance_mm,
              surface_finish_Ra: ef.surface_finish_Ra_um,
              aspect_ratio: ef.aspect_ratio,
            });
            if (advice?.critical_warnings?.length) {
              opPlan.warnings.push(...advice.critical_warnings);
            }
            if (advice?.summary?.length) {
              opPlan.notes.push(...advice.summary.map((s: string) => `[Playbook] ${s}`));
            }
          }
        } catch {
          // MachiningPlaybookEngine unavailable — skip
        }

        rawOps.push(opPlan);
      }
    }

    // Sort by operation priority, then group by tool to minimize changes
    const sorted = this._sequenceOperations(rawOps);

    // Assign sequence numbers
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].sequence_number = i + 1;
    }

    // Tool change count
    let toolChanges = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].tool.tool_id !== sorted[i - 1].tool.tool_id) toolChanges++;
    }

    // Unique tools used
    const toolIdSet = new Set(sorted.map((o) => o.tool.tool_id));
    const toolsUsed: string[] = [];
    toolIdSet.forEach((id) => toolsUsed.push(id));

    // Magazine layout
    const magazine = toolsUsed.map((tid, i) => {
      const op = sorted.find((o) => o.tool.tool_id === tid);
      return { position: i + 1, tool_id: tid, tool_name: op?.tool.tool_name ?? tid };
    });

    // Missing tools
    const toolsMissing = matchResult.value.unmatched.map((u) => ({
      feature_id: u.feature_id,
      feature_type: u.feature_type,
      min_diameter_mm: u.min_diameter_mm,
      min_flute_length_mm: u.min_flute_length_mm,
      suggestion: `Need ${u.operation} tool: dia ${u.min_diameter_mm.toFixed(1)}–${u.max_diameter_mm.toFixed(1)}mm, ` +
                  `flute_length ≥${u.min_flute_length_mm.toFixed(1)}mm`,
    }));

    if (toolsMissing.length > 0) {
      warnings.push(`${toolsMissing.length} feature(s) have no matching tool — see tools_missing`);
    }

    const totalTime = sorted.reduce((s, o) => s + o.estimated_time_min, 0);

    return {
      value: {
        operations: sorted,
        total_time_min: Math.round(totalTime * 100) / 100,
        total_tool_changes: toolChanges,
        tools_used: toolsUsed,
        tools_missing: toolsMissing,
        magazine_layout: magazine,
        warnings,
      },
      unit: "job_plan",
      formula: "Kienzle_force + Taylor_life + feature_sequencing",
      confidence: sorted.length > 0 ? 0.85 : 0.3,
    };
  }

  /**
   * Compute cutting parameters and strategy for a feature + operation + tool.
   * @internal
   */
  private _computeSfStrategy(
    feat: EnrichedFeature,
    op: OperationType,
    tool: ToolCandidate,
    mat: MaterialProps,
    preference?: string
  ): {
    strategy: string;
    vc: number;
    fz: number;
    ap: number;
    ae: number;
    opWarnings: string[];
    opNotes: string[];
  } {
    const d = tool.diameter_mm;
    const opWarnings: string[] = [];
    const opNotes: string[] = [];

    let vc = mat.vc_base_mpm;
    let fz: number;
    let ap: number;
    let ae: number;
    let strategy: string;

    // ── Try OptimalStrategySelectionEngine (E1087) for milling ops ──
    const isMilling = op === "roughing" || op === "semi_finishing" || op === "finishing";
    if (isMilling) {
      try {
        const ose = getOptimalStrategyEngine();
        if (ose && typeof ose.compute === "function") {
          const oseResult = ose.compute({
            feature: {
              type: feat.type,
              depth: feat.depth_mm,
              width: feat.width_mm,
              corner_radius: feat.corner_radius_mm,
              wall_thickness: feat.wall_thickness_mm,
              tolerance: feat.tolerance_mm,
              surface_finish: feat.surface_finish_Ra_um,
            },
            material: { name: preference },
            tool: {
              diameter: d,
              flutes: tool.flutes,
              material: tool.material,
              coating: tool.coating,
            },
            preference: preference ? { strategy_hint: preference } : undefined,
          });
          if (oseResult?.selected) {
            const sel = oseResult.selected;
            strategy = sel.canonical_id ?? sel.display_name ?? "adaptive";
            const params = sel.parameters;
            if (params) {
              ae = d * (params.ae_pct / 100);
              ap = Math.min(d * params.ap_factor, feat.depth_mm);
              vc = mat.vc_base_mpm * params.Vc_multiplier;
              fz = d * 0.01 * (params.fz_multiplier ?? 1);
            } else {
              ae = d * 0.10;
              ap = Math.min(d * 1.0, feat.depth_mm);
              fz = d * 0.01;
            }
            opNotes.push(`Strategy via OptimalStrategySelectionEngine: ${strategy} (score=${sel.score})`);
            // Add any playbook warnings from the engine
            if (oseResult.playbook_warnings?.length) {
              opWarnings.push(...oseResult.playbook_warnings);
            }

            // Still compute Taylor tool life and Kienzle force
            const taylorC = mat.taylor_C_factor * mat.vc_base_mpm;
            const toolLife = Math.pow(taylorC / vc, 1 / mat.taylor_n);
            if (toolLife < 10) {
              opWarnings.push(`Short tool life estimate: ${toolLife.toFixed(1)} min at Vc=${vc.toFixed(0)} m/min`);
            }
            const fc = mat.kc1_1 * ap * Math.pow(fz, 1 - mat.mc);
            const power_kW = (fc * vc) / 60000;
            opNotes.push(`Fc=${fc.toFixed(0)}N, Power=${power_kW.toFixed(2)}kW (Kienzle)`);

            if (feat.aspect_ratio > 4) {
              opWarnings.push(`High aspect ratio (${feat.aspect_ratio}): risk of tool deflection and chatter`);
            }

            return { strategy, vc, fz, ap, ae, opWarnings, opNotes };
          }
        }
      } catch {
        // OptimalStrategySelectionEngine unavailable — fall through to inline logic
      }
    }

    const isRough = op === "roughing";
    const isFinish = op === "finishing" || op === "semi_finishing";
    const featureWidth = feat.width_mm ?? feat.diameter_mm ?? d * 2;

    if (op === "drilling" || op === "reaming") {
      // Drilling: Vc reduced 30%, full diameter engagement
      vc = mat.vc_base_mpm * 0.7;
      fz = d * 0.008; // conservative feed per rev (approximated as fz for 2-flute)
      ap = feat.depth_mm;
      ae = d; // full engagement
      const isPeck = feat.depth_mm > 3 * d || feat.type === "hole_blind";
      strategy = isPeck ? "peck_drill" : (op === "reaming" ? "reaming" : "drill_cycle");
      if (isPeck) {
        opNotes.push(`Peck drilling: depth=${feat.depth_mm}mm > 3×D=${3 * d}mm`);
        ap = d; // peck depth = 1×D per peck
      }
      return { strategy, vc, fz, ap, ae, opWarnings, opNotes };
    }

    if (op === "tapping") {
      vc = mat.vc_base_mpm * 0.3;
      const pitch = 1.5; // default M-thread pitch estimate
      fz = pitch; // feed = pitch per rev
      ap = feat.depth_mm;
      ae = feat.diameter_mm ?? d;
      strategy = "rigid_tapping";
      return { strategy, vc, fz, ap, ae, opWarnings, opNotes };
    }

    if (op === "chamfering") {
      vc = mat.vc_base_mpm * 0.6;
      fz = d * 0.005;
      ap = feat.depth_mm;
      ae = feat.width_mm ?? 1;
      strategy = "chamfer_pass";
      return { strategy, vc, fz, ap, ae, opWarnings, opNotes };
    }

    // Milling operations (roughing / semi-finishing / finishing)
    if (isRough) {
      fz = d * 0.01;

      // Strategy selection
      if (feat.type === "face") {
        strategy = "face_mill";
        ap = Math.min(d * 0.5, feat.depth_mm);
        ae = d * 0.65; // 65% stepover for face milling
        vc = mat.vc_base_mpm;
      } else if (feat.type === "pocket_open" || feat.type === "pocket_closed") {
        // Adaptive / trochoidal for pockets: high speed, low ae
        strategy = preference ?? "adaptive";
        vc = mat.vc_base_mpm * 2.0;
        ap = Math.min(d * 1.5, feat.depth_mm); // deep axial for adaptive
        ae = d * 0.10; // 10% radial
        opNotes.push("Adaptive roughing: Vc×2.0, ae=10%D, ap up to 1.5×D");
      } else if (feat.type === "slot") {
        // Trochoidal if slot width > 1.5×D, else conventional slotting
        if (featureWidth > 1.5 * d) {
          strategy = "trochoidal";
          vc = mat.vc_base_mpm * 1.8;
          ap = Math.min(d * 1.0, feat.depth_mm);
          ae = d * 0.10;
          opNotes.push("Trochoidal slotting: width > 1.5×D allows circular tool path");
        } else {
          strategy = "conventional_slot";
          vc = mat.vc_base_mpm * 0.8;
          ap = Math.min(d * 0.5, feat.depth_mm);
          ae = featureWidth; // full slot width
          opWarnings.push("Full-width slotting — high tool load, reduce feed if needed");
        }
      } else if (feat.type === "contour") {
        strategy = "profile_rough";
        ap = Math.min(d * 1.0, feat.depth_mm);
        ae = d * 0.15;
      } else if (feat.type === "wall") {
        strategy = "light_pass";
        vc = mat.vc_base_mpm * 0.9;
        ap = feat.depth_mm;
        ae = d * 0.03; // very light radial for thin walls
        opWarnings.push(`Thin wall (${feat.wall_thickness_mm ?? "?"}mm): use light passes`);
      } else {
        strategy = "conventional";
        ap = Math.min(d * 0.5, feat.depth_mm);
        ae = d * 0.40;
      }
    } else {
      // Finishing / semi-finishing
      fz = d * 0.005;
      vc = mat.vc_base_mpm * (op === "semi_finishing" ? 1.1 : 1.2);

      if (feat.type === "pocket_open" || feat.type === "pocket_closed") {
        strategy = "conventional";
        ap = feat.depth_mm; // full depth in one pass for finish
        ae = d * 0.05; // 5% stepover
      } else if (feat.type === "contour") {
        strategy = "profile_finish";
        ap = feat.depth_mm;
        ae = d * 0.05;
      } else if (feat.type === "wall") {
        strategy = "spring_pass";
        ap = feat.depth_mm;
        ae = d * 0.02;
        opNotes.push("Spring pass on thin wall — minimal radial engagement");
      } else if (feat.type === "slot") {
        strategy = "conventional";
        ap = feat.depth_mm;
        ae = d * 0.05;
      } else if (feat.type === "fillet") {
        strategy = "ball_nose_finish";
        ap = feat.depth_mm;
        ae = d * 0.05;
      } else {
        strategy = "conventional";
        ap = Math.min(d * 0.3, feat.depth_mm);
        ae = d * 0.05;
      }
    }

    // Aspect ratio warning
    if (feat.aspect_ratio > 4) {
      opWarnings.push(`High aspect ratio (${feat.aspect_ratio}): risk of tool deflection and chatter`);
    }

    // Taylor tool life estimate
    const taylorC = mat.taylor_C_factor * mat.vc_base_mpm;
    const toolLife = Math.pow(taylorC / vc, 1 / mat.taylor_n);
    if (toolLife < 10) {
      opWarnings.push(`Short tool life estimate: ${toolLife.toFixed(1)} min at Vc=${vc.toFixed(0)} m/min`);
    }

    // Kienzle force (informational)
    const fc = mat.kc1_1 * ap * Math.pow(fz, 1 - mat.mc);
    const power_kW = (fc * vc) / 60000;
    opNotes.push(`Fc=${fc.toFixed(0)}N, Power=${power_kW.toFixed(2)}kW (Kienzle)`);

    return { strategy, vc, fz, ap, ae, opWarnings, opNotes };
  }

  /**
   * Sequence operations by priority and group by tool to minimize changes.
   *
   * Priority order: face → rough pockets/slots/contours → finish pockets/slots/contours →
   *   drill → ream → tap → chamfer → fillet finish
   * Within same priority, group by tool_id.
   *
   * @internal
   */
  private _sequenceOperations(ops: OperationPlan[]): OperationPlan[] {
    const priorityMap: Record<string, number> = {
      "face::roughing": 1,
      "pocket_open::roughing": 2,
      "pocket_closed::roughing": 2,
      "slot::roughing": 3,
      "contour::roughing": 4,
      "pocket_open::semi_finishing": 5,
      "pocket_closed::semi_finishing": 5,
      "pocket_open::finishing": 6,
      "pocket_closed::finishing": 6,
      "slot::finishing": 7,
      "contour::finishing": 8,
      "wall::finishing": 9,
      "fillet::finishing": 10,
      "hole_through::drilling": 11,
      "hole_blind::drilling": 11,
      "hole_through::reaming": 12,
      "thread::drilling": 13,
      "thread::tapping": 14,
      "chamfer::chamfering": 15,
    };

    const getPriority = (o: OperationPlan): number =>
      priorityMap[`${o.feature_type}::${o.operation}`] ?? 10;

    // First sort by priority
    const sorted = [...ops].sort((a, b) => {
      const pa = getPriority(a);
      const pb = getPriority(b);
      if (pa !== pb) return pa - pb;
      // Same priority: group by tool
      return a.tool.tool_id.localeCompare(b.tool.tool_id);
    });

    // Second pass: within same priority band, reorder to minimize tool changes
    // (greedy: if next op can use same tool, pull it forward)
    const result: OperationPlan[] = [];
    const used = new Set<number>();
    let lastToolId = "";

    for (let pass = 0; pass < sorted.length; pass++) {
      if (used.size === sorted.length) break;

      // Find next unused op, preferring same tool
      let bestIdx = -1;
      let bestPriority = Infinity;

      for (let i = 0; i < sorted.length; i++) {
        if (used.has(i)) continue;
        const p = getPriority(sorted[i]);
        const sameToolBonus = sorted[i].tool.tool_id === lastToolId ? -0.5 : 0;
        const effective = p + sameToolBonus;
        if (effective < bestPriority) {
          bestPriority = effective;
          bestIdx = i;
        }
      }

      if (bestIdx >= 0) {
        used.add(bestIdx);
        result.push(sorted[bestIdx]);
        lastToolId = sorted[bestIdx].tool.tool_id;
      }
    }

    return result;
  }

  // ==========================================================================
  // 4. SUGGEST TOOL PURCHASES
  // ==========================================================================

  /**
   * Recommend tools to purchase for unmatched features.
   *
   * Strategy: find versatile tools that cover multiple gaps. Prefer:
   *   - Multi-feature coverage (best value per dollar)
   *   - Carbide endmills over HSS (longer life)
   *   - Standard sizes (easier to source)
   *
   * Cost estimates:
   *   - Carbide endmill: $30–80 (scales with diameter)
   *   - Drill: $15–40
   *   - Tap: $10–25
   *   - Reamer: $25–50
   *   - Chamfer mill: $35–60
   *
   * @param input - unmatched features and optional budget
   * @returns AtomicValue wrapping purchase suggestions sorted by value
   */
  suggestToolPurchases(input: {
    unmatched_features: UnmatchedSpec[];
    budget_usd?: number;
  }): AtomicValue<PurchaseSuggestions> {
    const { unmatched_features, budget_usd } = input;

    if (!unmatched_features || unmatched_features.length === 0) {
      return {
        value: { suggestions: [], total_estimated_cost: 0 },
        unit: "purchase_plan",
        formula: "value = features_covered / cost",
        confidence: 1.0,
      };
    }

    // Group unmatched by operation category for consolidation
    const millingGaps: UnmatchedSpec[] = [];
    const drillingGaps: UnmatchedSpec[] = [];
    const tappingGaps: UnmatchedSpec[] = [];
    const reamingGaps: UnmatchedSpec[] = [];
    const chamferGaps: UnmatchedSpec[] = [];

    for (const u of unmatched_features) {
      switch (u.operation) {
        case "roughing":
        case "finishing":
        case "semi_finishing":
          millingGaps.push(u);
          break;
        case "drilling":
          drillingGaps.push(u);
          break;
        case "tapping":
          tappingGaps.push(u);
          break;
        case "reaming":
          reamingGaps.push(u);
          break;
        case "chamfering":
          chamferGaps.push(u);
          break;
      }
    }

    const suggestions: ToolSuggestion[] = [];

    // Milling: find versatile endmills that cover multiple features
    if (millingGaps.length > 0) {
      const consolidated = this._consolidateMillingGaps(millingGaps);
      for (const c of consolidated) {
        const dia = c.recommended_dia_mm;
        const cost = this._estimateEndmillCost(dia);
        suggestions.push({
          tool_spec: `Carbide endmill ∅${dia.toFixed(1)}mm, 4-flute, TiAlN coated, ` +
                     `flute_length ≥${c.min_flute_length_mm.toFixed(1)}mm`,
          covers_features: c.feature_ids,
          estimated_cost_usd: cost,
          priority: 0, // assigned below
        });
      }
    }

    // Drilling
    for (const g of drillingGaps) {
      const dia = (g.min_diameter_mm + g.max_diameter_mm) / 2;
      const cost = this._estimateDrillCost(dia);
      suggestions.push({
        tool_spec: `Carbide drill ∅${dia.toFixed(1)}mm, 2-flute, TiAlN, ` +
                   `flute_length ≥${g.min_flute_length_mm.toFixed(1)}mm`,
        covers_features: [g.feature_id],
        estimated_cost_usd: cost,
        priority: 0,
      });
    }

    // Tapping
    for (const g of tappingGaps) {
      const dia = (g.min_diameter_mm + g.max_diameter_mm) / 2;
      const cost = this._estimateTapCost(dia);
      suggestions.push({
        tool_spec: `HSS-E spiral flute tap M${Math.round(dia)}×1.5, TiN coated`,
        covers_features: [g.feature_id],
        estimated_cost_usd: cost,
        priority: 0,
      });
    }

    // Reaming
    for (const g of reamingGaps) {
      const dia = (g.min_diameter_mm + g.max_diameter_mm) / 2;
      const cost = 25 + dia * 1.5;
      suggestions.push({
        tool_spec: `Carbide reamer ∅${dia.toFixed(2)}mm, 6-flute, h7 tolerance`,
        covers_features: [g.feature_id],
        estimated_cost_usd: Math.round(cost * 100) / 100,
        priority: 0,
      });
    }

    // Chamfering
    if (chamferGaps.length > 0) {
      const ids = chamferGaps.map((g) => g.feature_id);
      suggestions.push({
        tool_spec: "Carbide chamfer mill 90°, ∅10mm, 3-flute, TiAlN",
        covers_features: ids,
        estimated_cost_usd: 45,
        priority: 0,
      });
    }

    // Assign priority by value (features_covered / cost), highest value = priority 1
    const withValue = suggestions.map((s) => ({
      ...s,
      _value: s.covers_features.length / Math.max(1, s.estimated_cost_usd),
    }));
    withValue.sort((a, b) => b._value - a._value);

    const finalSuggestions: ToolSuggestion[] = [];
    let totalCost = 0;

    for (let i = 0; i < withValue.length; i++) {
      const s = withValue[i];
      if (budget_usd !== undefined && totalCost + s.estimated_cost_usd > budget_usd) {
        continue; // skip if over budget
      }
      totalCost += s.estimated_cost_usd;
      finalSuggestions.push({
        tool_spec: s.tool_spec,
        covers_features: s.covers_features,
        estimated_cost_usd: s.estimated_cost_usd,
        priority: finalSuggestions.length + 1,
      });
    }

    return {
      value: {
        suggestions: finalSuggestions,
        total_estimated_cost: Math.round(totalCost * 100) / 100,
      },
      unit: "purchase_plan",
      formula: "priority = rank_by(features_covered / estimated_cost)",
      confidence: 0.75,
    };
  }

  /**
   * Consolidate milling gaps: find tool sizes that cover multiple features.
   * Greedy: pick the diameter that fits the most unmatched features.
   * @internal
   */
  private _consolidateMillingGaps(
    gaps: UnmatchedSpec[]
  ): { recommended_dia_mm: number; min_flute_length_mm: number; feature_ids: string[] }[] {
    const remaining = [...gaps];
    const result: { recommended_dia_mm: number; min_flute_length_mm: number; feature_ids: string[] }[] = [];

    while (remaining.length > 0) {
      // Try standard diameters and see which covers the most gaps
      const standardDias = [3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32];
      let bestDia = remaining[0].max_diameter_mm * 0.8;
      let bestCoverage: number[] = [];
      let bestFluteLen = 0;

      for (const dia of standardDias) {
        const covered: number[] = [];
        let maxFlute = 0;
        for (let i = 0; i < remaining.length; i++) {
          const g = remaining[i];
          if (dia >= g.min_diameter_mm && dia <= g.max_diameter_mm) {
            covered.push(i);
            maxFlute = Math.max(maxFlute, g.min_flute_length_mm);
          }
        }
        if (covered.length > bestCoverage.length) {
          bestDia = dia;
          bestCoverage = covered;
          bestFluteLen = maxFlute;
        }
      }

      if (bestCoverage.length === 0) {
        // No standard size fits — use midpoint of first gap
        const g = remaining[0];
        const dia = (g.min_diameter_mm + g.max_diameter_mm) / 2;
        result.push({
          recommended_dia_mm: Math.round(dia * 10) / 10,
          min_flute_length_mm: g.min_flute_length_mm,
          feature_ids: [g.feature_id],
        });
        remaining.splice(0, 1);
      } else {
        const featureIds = bestCoverage.map((i) => remaining[i].feature_id);
        result.push({
          recommended_dia_mm: bestDia,
          min_flute_length_mm: bestFluteLen,
          feature_ids: featureIds,
        });
        // Remove covered gaps (reverse order to preserve indices)
        for (let i = bestCoverage.length - 1; i >= 0; i--) {
          remaining.splice(bestCoverage[i], 1);
        }
      }
    }

    return result;
  }

  /**
   * Estimate carbide endmill cost based on diameter.
   * @internal
   */
  private _estimateEndmillCost(dia_mm: number): number {
    // $30 base + $2.5 per mm diameter
    return Math.round((30 + dia_mm * 2.5) * 100) / 100;
  }

  /**
   * Estimate carbide drill cost based on diameter.
   * @internal
   */
  private _estimateDrillCost(dia_mm: number): number {
    // $15 base + $1.5 per mm
    return Math.round((15 + dia_mm * 1.5) * 100) / 100;
  }

  /**
   * Estimate tap cost based on diameter.
   * @internal
   */
  private _estimateTapCost(dia_mm: number): number {
    // $10 base + $1 per mm
    return Math.round((10 + dia_mm * 1.0) * 100) / 100;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of PartGeometryPipelineEngine. */
export const partGeometryPipelineEngine = new PartGeometryPipelineEngine();
export { PartGeometryPipelineEngine };
