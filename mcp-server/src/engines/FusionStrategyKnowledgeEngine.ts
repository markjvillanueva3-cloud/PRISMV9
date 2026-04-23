/**
 * FusionStrategyKnowledgeEngine — CAM-PARITY-AGI-MS0/U-CAMP07
 * ===========================================================
 * Strategy selection with chain-of-thought reasoning for Fusion 360 CAM.
 *
 * Provides AI-style reasoning for:
 *   - Strategy selection based on geometry, material, and constraints
 *   - Parameter optimization with physics-based justification
 *   - Cross-strategy comparison and trade-off analysis
 *   - Best practice recommendations with citations
 *
 * Knowledge sources:
 *   - Autodesk Fusion 360 CAM documentation
 *   - Sandvik Coromant machining data
 *   - PRISM physics engines (Kienzle, deflection, thermal)
 *   - Shop floor tribal knowledge from JM Die
 *
 * @module engines/FusionStrategyKnowledgeEngine
 * @version 1.0.0
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP07
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Operation category */
export type OperationCategory =
  | "2d_milling"
  | "3d_milling"
  | "drilling"
  | "turning"
  | "5axis_milling";

/** Feature type for strategy selection */
export type FeatureType =
  | "pocket"
  | "slot"
  | "contour"
  | "face"
  | "chamfer"
  | "fillet"
  | "boss"
  | "rib"
  | "freeform"
  | "ruled_surface"
  | "blended_surface"
  | "hole"
  | "thread"
  | "steep_wall"
  | "shallow_floor"
  | "corner";

/** Material classification */
export type MaterialClass =
  | "aluminum"
  | "steel_low_carbon"
  | "steel_alloy"
  | "stainless"
  | "cast_iron"
  | "titanium"
  | "superalloy"
  | "hardened_steel"
  | "plastic"
  | "composite";

/** Reasoning step in chain-of-thought */
export interface ReasoningStep {
  step: number;
  thought: string;
  conclusion: string;
  confidence: number;
}

/** Strategy recommendation with reasoning */
export interface StrategyRecommendation {
  strategy_id: string;
  strategy_name: string;
  fusion_operation: string;
  score: number;
  reasoning_chain: ReasoningStep[];
  parameters: Record<string, number | string | boolean>;
  trade_offs: {
    pros: string[];
    cons: string[];
  };
  best_practices: string[];
  citations: string[];
}

/** Strategy comparison result */
export interface StrategyComparison {
  strategies: StrategyRecommendation[];
  winner: StrategyRecommendation;
  comparison_summary: string;
  decision_rationale: string;
}

/** Strategy query input */
export interface StrategyQuery {
  /** Feature type to machine */
  feature: FeatureType;
  /** Operation goal */
  operation: "roughing" | "semi_finishing" | "finishing";
  /** Material being cut */
  material: MaterialClass;
  /** Tool diameter (mm) */
  tool_diameter_mm: number;
  /** Tool type */
  tool_type: "flat_end" | "ball_nose" | "bull_nose" | "drill" | "tap" | "form";
  /** Target surface roughness Ra (um), optional */
  target_ra_um?: number;
  /** Whether 5-axis is available */
  has_5axis?: boolean;
  /** Whether HSM is preferred */
  prefer_hsm?: boolean;
  /** Maximum cycle time constraint (minutes), optional */
  max_cycle_time_min?: number;
  /** Stock to leave (mm), optional */
  stock_to_leave_mm?: number;
}

/** Knowledge base entry for a strategy */
export interface StrategyKnowledge {
  id: string;
  name: string;
  fusion_operation: string;
  category: OperationCategory;
  description: string;
  applicable_features: FeatureType[];
  optimal_materials: MaterialClass[];
  optimal_tools: StrategyQuery["tool_type"][];
  hsm_capable: boolean;
  typical_stepover_pct: { roughing: number; finishing: number };
  typical_stepdown_pct: { roughing: number; finishing: number };
  surface_quality_rating: 1 | 2 | 3 | 4 | 5;
  productivity_rating: 1 | 2 | 3 | 4 | 5;
  best_practices: string[];
  common_mistakes: string[];
  citations: string[];
}

// ============================================================================
// KNOWLEDGE BASE
// ============================================================================

/** Comprehensive Fusion 360 strategy knowledge base */
const STRATEGY_KNOWLEDGE_BASE: StrategyKnowledge[] = [
  // === 2D MILLING STRATEGIES ===
  {
    id: "f360_2d_adaptive",
    name: "2D Adaptive Clearing",
    fusion_operation: "2D Adaptive",
    category: "2d_milling",
    description: "Constant-engagement roughing with trochoidal paths. Maintains consistent chip load and tool engagement, reducing tool wear and enabling higher speeds.",
    applicable_features: ["pocket", "slot", "contour", "boss"],
    optimal_materials: ["aluminum", "steel_low_carbon", "steel_alloy", "stainless", "titanium"],
    optimal_tools: ["flat_end", "bull_nose"],
    hsm_capable: true,
    typical_stepover_pct: { roughing: 25, finishing: 10 },
    typical_stepdown_pct: { roughing: 100, finishing: 50 },
    surface_quality_rating: 2,
    productivity_rating: 5,
    best_practices: [
      "Use full flute length for maximum MRR",
      "Enable helical entry to avoid plunge cutting",
      "Set optimal load (radial engagement) to 10-15% for steel, 25-40% for aluminum",
      "Use through-spindle coolant for deep pockets",
    ],
    common_mistakes: [
      "Setting optimal load too high causes premature tool wear",
      "Not using climb milling direction",
      "Insufficient spindle RPM for the feed rate",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: Adaptive Clearing",
      "Sandvik Coromant: High Performance Machining - Constant Engagement",
    ],
  },
  {
    id: "f360_2d_pocket",
    name: "2D Pocket",
    fusion_operation: "2D Pocket",
    category: "2d_milling",
    description: "Traditional pocket clearing with parallel or spiral patterns. Simpler than adaptive but with variable tool engagement.",
    applicable_features: ["pocket", "boss"],
    optimal_materials: ["aluminum", "plastic", "cast_iron"],
    optimal_tools: ["flat_end", "bull_nose"],
    hsm_capable: false,
    typical_stepover_pct: { roughing: 50, finishing: 20 },
    typical_stepdown_pct: { roughing: 50, finishing: 25 },
    surface_quality_rating: 3,
    productivity_rating: 3,
    best_practices: [
      "Use for shallow pockets where adaptive benefits are minimal",
      "Enable rest machining for corners",
      "Consider adaptive for depth > 1.5x diameter",
    ],
    common_mistakes: [
      "Using for deep pockets where adaptive would be more efficient",
      "Not accounting for corner engagement spikes",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: 2D Pocket",
    ],
  },
  {
    id: "f360_2d_contour",
    name: "2D Contour",
    fusion_operation: "2D Contour",
    category: "2d_milling",
    description: "Profile milling along 2D contours. Used for finishing sidewalls and creating precise profiles.",
    applicable_features: ["contour", "pocket", "boss", "chamfer"],
    optimal_materials: ["aluminum", "steel_low_carbon", "steel_alloy", "stainless", "plastic"],
    optimal_tools: ["flat_end", "bull_nose"],
    hsm_capable: true,
    typical_stepover_pct: { roughing: 0, finishing: 0 }, // Single pass
    typical_stepdown_pct: { roughing: 100, finishing: 100 },
    surface_quality_rating: 4,
    productivity_rating: 4,
    best_practices: [
      "Use multiple depths for tall walls to reduce deflection",
      "Enable ramp entry for internal contours",
      "Add spring passes for tight tolerances",
    ],
    common_mistakes: [
      "Full depth cuts on tall thin walls cause chatter",
      "Not using lead-in/lead-out tangent arcs",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: 2D Contour",
      "Sandvik Coromant: Side Milling Application Guide",
    ],
  },
  {
    id: "f360_2d_slot",
    name: "2D Slot",
    fusion_operation: "Slot",
    category: "2d_milling",
    description: "Specialized slot machining with optimized entry and exit strategies. Handles full-width cutting.",
    applicable_features: ["slot"],
    optimal_materials: ["aluminum", "steel_low_carbon", "plastic"],
    optimal_tools: ["flat_end"],
    hsm_capable: false,
    typical_stepover_pct: { roughing: 100, finishing: 100 }, // Full width
    typical_stepdown_pct: { roughing: 50, finishing: 25 },
    surface_quality_rating: 3,
    productivity_rating: 3,
    best_practices: [
      "Use ramping or helical entry to avoid plunge",
      "Reduce feed rate for full-width cutting (50% of peripheral)",
      "Consider 2-pass with smaller tool for precision slots",
    ],
    common_mistakes: [
      "Running at peripheral milling feed rates",
      "Not accounting for chip re-cutting",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: Slot Milling",
    ],
  },
  {
    id: "f360_face",
    name: "Face",
    fusion_operation: "Face",
    category: "2d_milling",
    description: "Surface facing operation for creating flat datum surfaces. Uses face mill or large endmill.",
    applicable_features: ["face"],
    optimal_materials: ["aluminum", "steel_low_carbon", "steel_alloy", "cast_iron"],
    optimal_tools: ["flat_end"],
    hsm_capable: true,
    typical_stepover_pct: { roughing: 70, finishing: 50 },
    typical_stepdown_pct: { roughing: 5, finishing: 2 }, // Typically in mm
    surface_quality_rating: 4,
    productivity_rating: 5,
    best_practices: [
      "Use 70% stepover for optimal chip evacuation",
      "Approach from outside the material",
      "Use wiper insert geometry for finishing",
    ],
    common_mistakes: [
      "Centering the tool over the workpiece causes vibration",
      "Not using climb milling on finishing passes",
    ],
    citations: [
      "Sandvik Coromant: Face Milling Application Guide",
    ],
  },

  // === 3D MILLING STRATEGIES ===
  {
    id: "f360_3d_adaptive",
    name: "3D Adaptive Clearing",
    fusion_operation: "Adaptive Clearing",
    category: "3d_milling",
    description: "3D constant-engagement roughing that maintains consistent chip load through complex geometry. Best for high MRR on freeform surfaces.",
    applicable_features: ["freeform", "pocket", "boss"],
    optimal_materials: ["aluminum", "steel_alloy", "titanium", "superalloy"],
    optimal_tools: ["flat_end", "bull_nose", "ball_nose"],
    hsm_capable: true,
    typical_stepover_pct: { roughing: 25, finishing: 10 },
    typical_stepdown_pct: { roughing: 100, finishing: 50 },
    surface_quality_rating: 2,
    productivity_rating: 5,
    best_practices: [
      "Use rest machining after initial roughing",
      "Enable smoothing for better surface quality",
      "Adjust optimal load based on material and tool condition",
    ],
    common_mistakes: [
      "Not using stock-to-leave for finishing operations",
      "Ignoring tool deflection on deep cuts",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: Adaptive Clearing 3D",
      "PRISM Manufacturing: High-Efficiency Machining Best Practices",
    ],
  },
  {
    id: "f360_3d_parallel",
    name: "Parallel",
    fusion_operation: "Parallel",
    category: "3d_milling",
    description: "3D parallel finishing with constant stepover. Creates uniform cusp patterns on freeform surfaces.",
    applicable_features: ["freeform", "shallow_floor"],
    optimal_materials: ["aluminum", "steel_low_carbon", "steel_alloy", "plastic"],
    optimal_tools: ["ball_nose", "bull_nose"],
    hsm_capable: true,
    typical_stepover_pct: { roughing: 30, finishing: 10 },
    typical_stepdown_pct: { roughing: 0, finishing: 0 }, // Z-based
    surface_quality_rating: 4,
    productivity_rating: 4,
    best_practices: [
      "Align stepover direction with primary surface curvature",
      "Use scallop-based stepover for consistent Ra",
      "Enable boundary smoothing",
    ],
    common_mistakes: [
      "Using on steep surfaces (use Z-level instead)",
      "Stepover too large for target Ra",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: Parallel Finishing",
    ],
  },
  {
    id: "f360_3d_contour",
    name: "Contour",
    fusion_operation: "Contour",
    category: "3d_milling",
    description: "Z-level constant-Z finishing for steep walls. Creates horizontal scallop marks suitable for steep geometry.",
    applicable_features: ["steep_wall", "freeform", "contour"],
    optimal_materials: ["aluminum", "steel_alloy", "stainless"],
    optimal_tools: ["ball_nose", "bull_nose"],
    hsm_capable: true,
    typical_stepover_pct: { roughing: 0, finishing: 0 }, // Z stepdown based
    typical_stepdown_pct: { roughing: 50, finishing: 25 },
    surface_quality_rating: 4,
    productivity_rating: 3,
    best_practices: [
      "Use for surfaces > 45 degrees from horizontal",
      "Enable smoothing for better surface finish",
      "Combine with parallel for complete coverage",
    ],
    common_mistakes: [
      "Using on shallow surfaces creates poor finish",
      "Not blending with parallel toolpath at transition zones",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: Contour Finishing",
      "Sandvik Coromant: Finishing Freeform Surfaces",
    ],
  },
  {
    id: "f360_3d_steep_shallow",
    name: "Steep and Shallow",
    fusion_operation: "Steep and Shallow",
    category: "3d_milling",
    description: "Automatic combination of parallel and Z-level based on surface angle. Threshold-based strategy switching.",
    applicable_features: ["freeform", "steep_wall", "shallow_floor"],
    optimal_materials: ["aluminum", "steel_alloy", "stainless", "plastic"],
    optimal_tools: ["ball_nose", "bull_nose"],
    hsm_capable: true,
    typical_stepover_pct: { roughing: 30, finishing: 15 },
    typical_stepdown_pct: { roughing: 50, finishing: 25 },
    surface_quality_rating: 4,
    productivity_rating: 4,
    best_practices: [
      "Set threshold angle appropriately (typically 45-60 degrees)",
      "Enable smooth overlap between steep and shallow regions",
      "Consider separate operations for better control",
    ],
    common_mistakes: [
      "Threshold angle mismatch with surface geometry",
      "Not checking transition zones for step marks",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: Steep and Shallow",
    ],
  },
  {
    id: "f360_3d_scallop",
    name: "Scallop",
    fusion_operation: "Scallop",
    category: "3d_milling",
    description: "Constant scallop height finishing that adapts stepover to maintain consistent surface roughness.",
    applicable_features: ["freeform", "blended_surface"],
    optimal_materials: ["aluminum", "steel_alloy"],
    optimal_tools: ["ball_nose"],
    hsm_capable: true,
    typical_stepover_pct: { roughing: 0, finishing: 0 }, // Scallop-based
    typical_stepdown_pct: { roughing: 0, finishing: 0 },
    surface_quality_rating: 5,
    productivity_rating: 3,
    best_practices: [
      "Set scallop height based on target Ra (h ~ Ra/0.25)",
      "Use for surfaces with varying curvature",
      "Ideal for mold finishing",
    ],
    common_mistakes: [
      "Setting scallop too small wastes cycle time",
      "Not accounting for tool runout",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: Scallop Finishing",
      "Sandvik Coromant: Modern Metal Cutting - Surface Finish",
    ],
  },
  {
    id: "f360_3d_pencil",
    name: "Pencil",
    fusion_operation: "Pencil",
    category: "3d_milling",
    description: "Corner and fillet finishing that traces internal corners. Removes rest material in tight areas.",
    applicable_features: ["corner", "fillet"],
    optimal_materials: ["aluminum", "steel_alloy", "stainless"],
    optimal_tools: ["ball_nose"],
    hsm_capable: true,
    typical_stepover_pct: { roughing: 0, finishing: 0 }, // Single pass
    typical_stepdown_pct: { roughing: 30, finishing: 15 },
    surface_quality_rating: 4,
    productivity_rating: 3,
    best_practices: [
      "Use tool diameter < minimum fillet radius",
      "Run after main surface finishing",
      "Enable multiple passes for deep corners",
    ],
    common_mistakes: [
      "Tool too large for corner radius",
      "Running before surface finish leaves step marks",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: Pencil Finishing",
    ],
  },

  // === 5-AXIS STRATEGIES ===
  {
    id: "f360_5x_swarf",
    name: "Swarf",
    fusion_operation: "Swarf",
    category: "5axis_milling",
    description: "5-axis flank milling using full flute length on ruled surfaces. Maximum productivity for straight-sided features.",
    applicable_features: ["ruled_surface"],
    optimal_materials: ["aluminum", "steel_alloy", "titanium"],
    optimal_tools: ["flat_end", "bull_nose"],
    hsm_capable: false,
    typical_stepover_pct: { roughing: 0, finishing: 0 }, // Full flute
    typical_stepdown_pct: { roughing: 100, finishing: 100 },
    surface_quality_rating: 5,
    productivity_rating: 5,
    best_practices: [
      "Verify surface is truly ruled (straight generatrices)",
      "Use check surface to prevent gouging",
      "Monitor cutting forces along full flute length",
    ],
    common_mistakes: [
      "Using on non-ruled surfaces causes gouging",
      "Not verifying tool clearance at all orientations",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: Swarf Milling",
      "PRISM Manufacturing: 5-Axis Flank Milling Best Practices",
    ],
  },
  {
    id: "f360_5x_multi_axis_contour",
    name: "Multi-Axis Contour",
    fusion_operation: "Multi-Axis Contour",
    category: "5axis_milling",
    description: "5-axis point milling with lead/lag/tilt control. Maximum flexibility for complex freeform surfaces.",
    applicable_features: ["freeform", "blended_surface"],
    optimal_materials: ["aluminum", "steel_alloy", "titanium", "superalloy"],
    optimal_tools: ["ball_nose", "bull_nose"],
    hsm_capable: true,
    typical_stepover_pct: { roughing: 20, finishing: 10 },
    typical_stepdown_pct: { roughing: 50, finishing: 25 },
    surface_quality_rating: 5,
    productivity_rating: 3,
    best_practices: [
      "Use 5-15 degree lead angle to avoid singularity",
      "Enable collision avoidance with holder model",
      "Verify rotary axis motion in simulation",
    ],
    common_mistakes: [
      "Lead angle too small causes singularity issues",
      "Not modeling tool holder for collision detection",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: Multi-Axis Contour",
      "PRISM Manufacturing: 5-Axis Singularity Avoidance",
    ],
  },
  {
    id: "f360_5x_flow",
    name: "Flow",
    fusion_operation: "Flow",
    category: "5axis_milling",
    description: "5-axis UV flowline finishing that follows surface natural flow. Ideal for organic shapes.",
    applicable_features: ["freeform", "blended_surface"],
    optimal_materials: ["aluminum", "steel_alloy"],
    optimal_tools: ["ball_nose", "bull_nose"],
    hsm_capable: true,
    typical_stepover_pct: { roughing: 0, finishing: 10 },
    typical_stepdown_pct: { roughing: 0, finishing: 0 },
    surface_quality_rating: 5,
    productivity_rating: 3,
    best_practices: [
      "Use on surfaces with consistent UV parameterization",
      "Check for UV degeneracies before programming",
      "Combine with scallop for variable-curvature surfaces",
    ],
    common_mistakes: [
      "Using on poorly parameterized surfaces",
      "Not verifying UV direction alignment with cut direction",
    ],
    citations: [
      "Autodesk Fusion 360 CAM User Guide: Flow Finishing",
    ],
  },
];

/** Canonical material speed/feed recommendations */
const MATERIAL_RECOMMENDATIONS: Record<MaterialClass, {
  vc_rough_mmin: number;
  vc_finish_mmin: number;
  fz_factor: number;
  kc11_mpa: number;
  notes: string[];
}> = {
  aluminum: {
    vc_rough_mmin: 400,
    vc_finish_mmin: 500,
    fz_factor: 1.5,
    kc11_mpa: 700,
    notes: ["Use coated carbide or PCD for abrasive alloys", "Flood coolant for chip evacuation"],
  },
  steel_low_carbon: {
    vc_rough_mmin: 200,
    vc_finish_mmin: 250,
    fz_factor: 1.0,
    kc11_mpa: 1700,
    notes: ["Standard carbide with TiAlN coating", "Through-spindle coolant recommended"],
  },
  steel_alloy: {
    vc_rough_mmin: 150,
    vc_finish_mmin: 200,
    fz_factor: 0.9,
    kc11_mpa: 1800,
    notes: ["Use stable setup to prevent chatter", "Consider CBN for hardened sections"],
  },
  stainless: {
    vc_rough_mmin: 100,
    vc_finish_mmin: 150,
    fz_factor: 0.7,
    kc11_mpa: 2100,
    notes: ["High cutting forces - ensure rigidity", "Use positive rake geometry"],
  },
  cast_iron: {
    vc_rough_mmin: 200,
    vc_finish_mmin: 250,
    fz_factor: 1.2,
    kc11_mpa: 1100,
    notes: ["Dry cutting often preferred", "Use ceramic for high-speed machining"],
  },
  titanium: {
    vc_rough_mmin: 40,
    vc_finish_mmin: 60,
    fz_factor: 0.5,
    kc11_mpa: 2800,
    notes: ["Low cutting speed critical", "High-pressure coolant mandatory", "Monitor tool wear closely"],
  },
  superalloy: {
    vc_rough_mmin: 25,
    vc_finish_mmin: 40,
    fz_factor: 0.4,
    kc11_mpa: 2900,
    notes: ["Ceramic or CBN tooling required", "Constant engagement essential", "High-pressure coolant"],
  },
  hardened_steel: {
    vc_rough_mmin: 60,
    vc_finish_mmin: 100,
    fz_factor: 0.3,
    kc11_mpa: 3200,
    notes: ["CBN or ceramic only for HRC > 55", "Light cuts to prevent thermal damage"],
  },
  plastic: {
    vc_rough_mmin: 300,
    vc_finish_mmin: 400,
    fz_factor: 2.0,
    kc11_mpa: 200,
    notes: ["Sharp tools essential", "Air blast cooling", "Watch for melting"],
  },
  composite: {
    vc_rough_mmin: 150,
    vc_finish_mmin: 200,
    fz_factor: 1.0,
    kc11_mpa: 500,
    notes: ["Diamond coating for CFRP", "Dust extraction required", "Compression router for delamination control"],
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * Fusion Strategy Knowledge Engine
 *
 * Provides chain-of-thought reasoning for CAM strategy selection
 * with physics-based justification and best practice recommendations.
 */
export class FusionStrategyKnowledgeEngine {
  private _stats = { queries: 0 };

  /**
   * Select optimal strategy with chain-of-thought reasoning.
   *
   * @param query - Strategy selection query
   * @returns Recommended strategy with full reasoning chain
   */
  selectStrategy(query: StrategyQuery): StrategyRecommendation {
    this._stats.queries++;
    const startTime = Date.now();

    log.debug(`[FusionStrategyKnowledge] Selecting strategy for ${query.feature} ${query.operation}`);

    // Step 1: Filter applicable strategies
    const applicable = this._filterApplicable(query);

    // Step 2: Score and rank strategies
    const scored = this._scoreStrategies(applicable, query);

    // Step 3: Select best and generate reasoning
    const best = scored[0];
    const recommendation = this._buildRecommendation(best.strategy, query, best.score, best.reasons);

    const elapsed = Date.now() - startTime;
    log.debug(`[FusionStrategyKnowledge] Selected ${best.strategy.name} in ${elapsed}ms`);

    return recommendation;
  }

  /**
   * Compare multiple strategies with trade-off analysis.
   *
   * @param query - Strategy selection query
   * @param maxStrategies - Maximum strategies to compare (default 3)
   * @returns Comparison of top strategies
   */
  compareStrategies(query: StrategyQuery, maxStrategies: number = 3): StrategyComparison {
    this._stats.queries++;

    const applicable = this._filterApplicable(query);
    const scored = this._scoreStrategies(applicable, query);
    const topN = scored.slice(0, maxStrategies);

    const strategies = topN.map(s =>
      this._buildRecommendation(s.strategy, query, s.score, s.reasons),
    );

    const winner = strategies[0];

    const comparison_summary = this._buildComparisonSummary(strategies);
    const decision_rationale = this._buildDecisionRationale(strategies[0], strategies.slice(1));

    return {
      strategies,
      winner,
      comparison_summary,
      decision_rationale,
    };
  }

  /**
   * Get all strategies in knowledge base.
   */
  getAllStrategies(): StrategyKnowledge[] {
    return [...STRATEGY_KNOWLEDGE_BASE];
  }

  /**
   * Get strategy by ID.
   */
  getStrategyById(id: string): StrategyKnowledge | undefined {
    return STRATEGY_KNOWLEDGE_BASE.find(s => s.id === id);
  }

  /**
   * Get strategies for a specific feature type.
   */
  getStrategiesForFeature(feature: FeatureType): StrategyKnowledge[] {
    return STRATEGY_KNOWLEDGE_BASE.filter(s => s.applicable_features.includes(feature));
  }

  /**
   * Get material recommendations.
   */
  getMaterialRecommendations(material: MaterialClass): typeof MATERIAL_RECOMMENDATIONS[MaterialClass] | undefined {
    return MATERIAL_RECOMMENDATIONS[material];
  }

  /**
   * Get engine statistics.
   */
  stats(): { queries: number } {
    return { ...this._stats };
  }

  /**
   * Clear statistics.
   */
  clear(): void {
    this._stats = { queries: 0 };
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private _filterApplicable(query: StrategyQuery): StrategyKnowledge[] {
    return STRATEGY_KNOWLEDGE_BASE.filter(strategy => {
      // Feature match
      if (!strategy.applicable_features.includes(query.feature)) return false;

      // 5-axis requirement
      if (strategy.category === "5axis_milling" && !query.has_5axis) return false;

      // Tool type match (less strict - allow flexible tool selection)
      // Only filter out if tool is completely incompatible
      if (query.tool_type === "drill" && strategy.category !== "drilling") return false;

      return true;
    });
  }

  private _scoreStrategies(
    strategies: StrategyKnowledge[],
    query: StrategyQuery,
  ): Array<{ strategy: StrategyKnowledge; score: number; reasons: string[] }> {
    const scored = strategies.map(strategy => {
      let score = 0;
      const reasons: string[] = [];

      // Material match (0.25)
      if (strategy.optimal_materials.includes(query.material)) {
        score += 0.25;
        reasons.push(`optimal for ${query.material}`);
      }

      // Tool match (0.15)
      if (strategy.optimal_tools.includes(query.tool_type)) {
        score += 0.15;
        reasons.push(`optimal tool: ${query.tool_type}`);
      }

      // HSM preference (0.15)
      if (query.prefer_hsm && strategy.hsm_capable) {
        score += 0.15;
        reasons.push("HSM capable");
      }

      // Surface quality for finishing (0.2)
      if (query.operation === "finishing") {
        score += (strategy.surface_quality_rating / 5) * 0.2;
        reasons.push(`surface quality ${strategy.surface_quality_rating}/5`);
      }

      // Productivity for roughing (0.2)
      if (query.operation === "roughing") {
        score += (strategy.productivity_rating / 5) * 0.2;
        reasons.push(`productivity ${strategy.productivity_rating}/5`);
      }

      // Target Ra achievability (0.15)
      if (query.target_ra_um) {
        const achievable = strategy.surface_quality_rating >= 4;
        if (achievable && query.target_ra_um < 1.6) {
          score += 0.15;
          reasons.push("can achieve target Ra");
        }
      }

      // Cycle time consideration (0.1)
      if (query.max_cycle_time_min && strategy.productivity_rating >= 4) {
        score += 0.1;
        reasons.push("high productivity for cycle time");
      }

      return { strategy, score, reasons };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  private _buildRecommendation(
    strategy: StrategyKnowledge,
    query: StrategyQuery,
    score: number,
    reasons: string[],
  ): StrategyRecommendation {
    // Build reasoning chain
    const reasoning_chain = this._buildReasoningChain(strategy, query, reasons);

    // Calculate parameters
    const parameters = this._calculateParameters(strategy, query);

    // Build trade-offs
    const trade_offs = this._buildTradeOffs(strategy, query);

    // Get citations
    const citations = [...strategy.citations];
    const materialRec = MATERIAL_RECOMMENDATIONS[query.material];
    if (materialRec) {
      citations.push(`Sandvik Coromant: ${query.material} Machining Data`);
    }

    return {
      strategy_id: strategy.id,
      strategy_name: strategy.name,
      fusion_operation: strategy.fusion_operation,
      score: Math.round(score * 100) / 100,
      reasoning_chain,
      parameters,
      trade_offs,
      best_practices: [...strategy.best_practices],
      citations,
    };
  }

  private _buildReasoningChain(
    strategy: StrategyKnowledge,
    query: StrategyQuery,
    reasons: string[],
  ): ReasoningStep[] {
    const steps: ReasoningStep[] = [];

    // Step 1: Feature analysis
    steps.push({
      step: 1,
      thought: `Analyzing feature type: ${query.feature} with ${query.operation} goal.`,
      conclusion: `${strategy.name} is applicable for ${query.feature} features.`,
      confidence: 0.9,
    });

    // Step 2: Material consideration
    const materialRec = MATERIAL_RECOMMENDATIONS[query.material];
    steps.push({
      step: 2,
      thought: `Material is ${query.material} with kc1.1 = ${materialRec?.kc11_mpa ?? "unknown"} MPa.`,
      conclusion: strategy.optimal_materials.includes(query.material)
        ? `${strategy.name} is optimized for ${query.material}.`
        : `${strategy.name} can machine ${query.material} with adjusted parameters.`,
      confidence: strategy.optimal_materials.includes(query.material) ? 0.95 : 0.75,
    });

    // Step 3: Tool compatibility
    steps.push({
      step: 3,
      thought: `Tool is ${query.tool_diameter_mm}mm ${query.tool_type}.`,
      conclusion: strategy.optimal_tools.includes(query.tool_type)
        ? `${query.tool_type} is optimal for ${strategy.name}.`
        : `${query.tool_type} can be used with ${strategy.name}.`,
      confidence: strategy.optimal_tools.includes(query.tool_type) ? 0.9 : 0.7,
    });

    // Step 4: Operation goal alignment
    const goalAlignment = query.operation === "roughing"
      ? strategy.productivity_rating >= 4
      : strategy.surface_quality_rating >= 4;
    steps.push({
      step: 4,
      thought: `Operation goal is ${query.operation}. ${query.operation === "roughing" ? "Prioritizing MRR." : "Prioritizing surface quality."}`,
      conclusion: goalAlignment
        ? `${strategy.name} aligns well with ${query.operation} requirements.`
        : `${strategy.name} is acceptable but not optimal for ${query.operation}.`,
      confidence: goalAlignment ? 0.9 : 0.6,
    });

    // Step 5: Final recommendation
    steps.push({
      step: 5,
      thought: `Synthesizing factors: ${reasons.join(", ")}.`,
      conclusion: `Recommending ${strategy.name} (${strategy.fusion_operation}) for this operation.`,
      confidence: Math.min(...steps.map(s => s.confidence)),
    });

    return steps;
  }

  private _calculateParameters(
    strategy: StrategyKnowledge,
    query: StrategyQuery,
  ): Record<string, number | string | boolean> {
    const materialRec = MATERIAL_RECOMMENDATIONS[query.material];
    const vc = query.operation === "roughing"
      ? (materialRec?.vc_rough_mmin ?? 150)
      : (materialRec?.vc_finish_mmin ?? 200);

    const rpm = Math.round((vc * 1000) / (Math.PI * query.tool_diameter_mm));
    const fz_base = 0.1 * (materialRec?.fz_factor ?? 1.0);
    const fz = query.operation === "finishing" ? fz_base * 0.7 : fz_base;

    const stepoverPct = query.operation === "roughing"
      ? strategy.typical_stepover_pct.roughing
      : strategy.typical_stepover_pct.finishing;
    const stepdownPct = query.operation === "roughing"
      ? strategy.typical_stepdown_pct.roughing
      : strategy.typical_stepdown_pct.finishing;

    return {
      rpm,
      feed_per_tooth_mm: Math.round(fz * 1000) / 1000,
      stepover_pct: stepoverPct,
      stepdown_pct: stepdownPct,
      stepover_mm: Math.round(query.tool_diameter_mm * stepoverPct / 100 * 100) / 100,
      stepdown_mm: Math.round(query.tool_diameter_mm * stepdownPct / 100 * 100) / 100,
      surface_speed_mmin: vc,
      stock_to_leave_mm: query.stock_to_leave_mm ?? (query.operation === "roughing" ? 0.5 : 0),
      climb_milling: true,
      hsm_enabled: strategy.hsm_capable && (query.prefer_hsm ?? false),
    };
  }

  private _buildTradeOffs(
    strategy: StrategyKnowledge,
    query: StrategyQuery,
  ): StrategyRecommendation["trade_offs"] {
    const pros: string[] = [];
    const cons: string[] = [];

    // Productivity
    if (strategy.productivity_rating >= 4) {
      pros.push("High material removal rate");
    } else if (strategy.productivity_rating <= 2) {
      cons.push("Lower productivity than alternatives");
    }

    // Surface quality
    if (strategy.surface_quality_rating >= 4) {
      pros.push("Excellent surface finish capability");
    } else if (strategy.surface_quality_rating <= 2 && query.operation === "finishing") {
      cons.push("May require additional finishing pass");
    }

    // HSM
    if (strategy.hsm_capable) {
      pros.push("Supports high-speed machining");
    }

    // Material-specific
    if (strategy.optimal_materials.includes(query.material)) {
      pros.push(`Optimized for ${query.material}`);
    } else {
      cons.push(`Not specifically optimized for ${query.material}`);
    }

    // Common mistakes as cons
    if (strategy.common_mistakes.length > 0) {
      cons.push("Requires attention to avoid common pitfalls");
    }

    return { pros, cons };
  }

  private _buildComparisonSummary(strategies: StrategyRecommendation[]): string {
    const names = strategies.map(s => s.strategy_name).join(", ");
    return `Compared ${strategies.length} strategies: ${names}. ` +
      `Top choice: ${strategies[0].strategy_name} with score ${strategies[0].score.toFixed(2)}.`;
  }

  private _buildDecisionRationale(
    winner: StrategyRecommendation,
    alternatives: StrategyRecommendation[],
  ): string {
    const parts: string[] = [];
    parts.push(`Selected ${winner.strategy_name} because: ${winner.trade_offs.pros.join("; ")}.`);

    if (alternatives.length > 0) {
      parts.push(`Alternative ${alternatives[0].strategy_name} was close but: ${alternatives[0].trade_offs.cons[0] ?? "slightly lower score"}.`);
    }

    return parts.join(" ");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of FusionStrategyKnowledgeEngine */
export const fusionStrategyKnowledgeEngine = new FusionStrategyKnowledgeEngine();
