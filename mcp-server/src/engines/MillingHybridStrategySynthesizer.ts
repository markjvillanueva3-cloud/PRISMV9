/**
 * MillingHybridStrategySynthesizer — Intelligent Strategy Combination
 * ====================================================================
 * Synthesizes hybrid machining strategies by combining multiple approaches:
 *
 * HYBRID PATTERNS:
 * - Trochoidal + Rest: Clear bulk with trochoidal, clean up corners with rest
 * - HFM + Plunge: High feed face mill with plunge milling for deep walls
 * - Physics + Tribal: Calculated parameters refined by shop experience
 * - HSM + Conventional: High-speed for bulk, conventional for accuracy
 * - 3-axis + 5-axis: Cost-effective 3-axis where possible, 5-axis for complex
 *
 * SYNTHESIS APPROACH:
 * 1. Analyze feature requirements
 * 2. Identify applicable strategies
 * 3. Score each strategy for fit
 * 4. Find synergistic combinations
 * 5. Generate hybrid workflow
 * 6. Validate physics constraints
 * 7. Estimate cost/time savings
 *
 * @module engines/MillingHybridStrategySynthesizer
 * @milestone MILL-HYBRID-SYNTHESIS-MS1
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type StrategyType =
  | "trochoidal"
  | "plunge"
  | "hsm"
  | "conventional"
  | "hfm"  // high-feed milling
  | "rest"
  | "pencil"
  | "spiral"
  | "ramp"
  | "helical"
  | "3_axis"
  | "5_axis";

export interface StrategyInfo {
  type: StrategyType;
  description: string;
  best_for: string[];
  limitations: string[];
  cost_factor: number;  // 1.0 = baseline
  time_factor: number;  // 1.0 = baseline
  quality_factor: number;  // 1.0 = baseline
}

export interface HybridRequest {
  // Feature requirements
  feature_type: "pocket" | "face" | "slot" | "contour" | "cavity" | "profile" | "drilling";
  depth_mm?: number;
  width_mm?: number;
  length_mm?: number;
  corner_radius_mm?: number;

  // Material
  material_iso?: string;
  hardness_hrc?: number;

  // Quality requirements
  tolerance_mm?: number;
  surface_finish_ra?: number;

  // Machine capabilities
  machine_axes?: 3 | 4 | 5;
  max_rpm?: number;
  max_feedrate?: number;

  // Priorities
  priority?: "speed" | "quality" | "cost" | "tool_life" | "balanced";

  // Tool constraints
  tool_diameter_mm?: number;
  max_tool_overhang?: number;
}

export interface StrategyScore {
  strategy: StrategyType;
  fit_score: number;  // 0-1
  reasons: string[];
  limitations_hit: string[];
}

export interface HybridCombination {
  primary_strategy: StrategyType;
  secondary_strategy: StrategyType;
  synergy_score: number;
  workflow: string[];
  estimated_time_savings_pct: number;
  estimated_quality_improvement_pct: number;
}

export interface HybridSynthesisResult {
  request_id: string;
  timestamp: string;

  // Analysis
  feature_analysis: {
    complexity: "simple" | "moderate" | "complex";
    challenges: string[];
    opportunities: string[];
  };

  // Strategy scores
  strategy_scores: StrategyScore[];
  top_single_strategy: StrategyType;

  // Hybrid recommendations
  hybrid_combinations: HybridCombination[];
  recommended_hybrid: HybridCombination | null;

  // Workflow
  workflow_steps: string[];
  operation_sequence: string[];

  // Estimates
  estimated_cycle_time_reduction_pct: number;
  estimated_tool_life_improvement_pct: number;
  estimated_quality_improvement_pct: number;

  // Tribal knowledge
  tribal_tips: string[];
  warnings: string[];
  confidence: number;
}

// ============================================================================
// STRATEGY DATABASE
// ============================================================================

const STRATEGIES: Record<StrategyType, StrategyInfo> = {
  trochoidal: {
    type: "trochoidal",
    description: "Circular toolpath with constant engagement angle",
    best_for: ["deep slots", "hard materials", "thin walls", "titanium", "inconel"],
    limitations: ["longer toolpath", "not ideal for shallow features"],
    cost_factor: 1.0,
    time_factor: 1.3,
    quality_factor: 1.1,
  },
  plunge: {
    type: "plunge",
    description: "Axial plunging cuts to remove material",
    best_for: ["deep cavities", "weak machines", "long reach", "hard materials"],
    limitations: ["rough surface", "requires cleanup", "Z-axis dependent"],
    cost_factor: 0.9,
    time_factor: 0.8,
    quality_factor: 0.7,
  },
  hsm: {
    type: "hsm",
    description: "High-speed machining with light cuts",
    best_for: ["aluminum", "finishing", "die molds", "high volume"],
    limitations: ["requires high RPM", "tool wear on hard materials"],
    cost_factor: 0.8,
    time_factor: 0.7,
    quality_factor: 1.2,
  },
  conventional: {
    type: "conventional",
    description: "Traditional climb/conventional milling",
    best_for: ["general purpose", "roughing", "proven parameters"],
    limitations: ["vibration at deep cuts", "heat buildup"],
    cost_factor: 1.0,
    time_factor: 1.0,
    quality_factor: 1.0,
  },
  hfm: {
    type: "hfm",
    description: "High-feed milling with shallow cuts, high feed",
    best_for: ["facing", "roughing", "cast iron", "aluminum"],
    limitations: ["shallow DOC only", "requires specific tools"],
    cost_factor: 0.9,
    time_factor: 0.6,
    quality_factor: 0.9,
  },
  rest: {
    type: "rest",
    description: "Clean up material left by previous operations",
    best_for: ["corners", "fillets", "cleanup", "finishing"],
    limitations: ["requires previous toolpath", "small tools"],
    cost_factor: 1.1,
    time_factor: 1.2,
    quality_factor: 1.3,
  },
  pencil: {
    type: "pencil",
    description: "Follow edges and corners precisely",
    best_for: ["corners", "edge cleanup", "die molds", "finishing"],
    limitations: ["slow", "requires CAM support"],
    cost_factor: 1.2,
    time_factor: 1.4,
    quality_factor: 1.4,
  },
  spiral: {
    type: "spiral",
    description: "Spiral outward from center",
    best_for: ["pockets", "facing", "constant engagement"],
    limitations: ["may leave marks at center", "requires entry"],
    cost_factor: 1.0,
    time_factor: 0.9,
    quality_factor: 1.1,
  },
  ramp: {
    type: "ramp",
    description: "Gradual Z-entry via ramping",
    best_for: ["safe entry", "hard materials", "deep pockets"],
    limitations: ["requires space for ramp", "adds time"],
    cost_factor: 1.0,
    time_factor: 1.1,
    quality_factor: 1.0,
  },
  helical: {
    type: "helical",
    description: "Helical interpolation entry",
    best_for: ["holes", "pockets", "thread milling"],
    limitations: ["requires interpolation", "limited by tool diameter"],
    cost_factor: 1.0,
    time_factor: 1.0,
    quality_factor: 1.1,
  },
  "3_axis": {
    type: "3_axis",
    description: "Standard 3-axis machining",
    best_for: ["simple features", "cost-effective", "common machines"],
    limitations: ["undercuts impossible", "multiple setups"],
    cost_factor: 1.0,
    time_factor: 1.0,
    quality_factor: 1.0,
  },
  "5_axis": {
    type: "5_axis",
    description: "Full 5-axis simultaneous machining",
    best_for: ["complex surfaces", "undercuts", "single setup"],
    limitations: ["expensive", "requires programming expertise"],
    cost_factor: 1.5,
    time_factor: 0.7,
    quality_factor: 1.3,
  },
};

// ============================================================================
// HYBRID SYNERGY MATRIX
// ============================================================================

const SYNERGY_MATRIX: Record<string, { synergy: number; workflow: string[] }> = {
  "trochoidal+rest": {
    synergy: 0.9,
    workflow: ["Trochoidal rough full depth", "Rest machine corners with smaller tool", "Semi-finish walls", "Finish"],
  },
  "hfm+plunge": {
    synergy: 0.85,
    workflow: ["HFM face top surface", "Plunge mill deep walls", "Conventional cleanup", "Finish pass"],
  },
  "hsm+conventional": {
    synergy: 0.8,
    workflow: ["HSM rough with light cuts", "Conventional semi-finish", "HSM finish for surface quality"],
  },
  "trochoidal+pencil": {
    synergy: 0.85,
    workflow: ["Trochoidal clear bulk", "Pencil trace corners", "Finish contours"],
  },
  "3_axis+5_axis": {
    synergy: 0.75,
    workflow: ["3-axis roughing (cheaper)", "5-axis finishing complex areas", "3-axis flat areas"],
  },
  "spiral+rest": {
    synergy: 0.8,
    workflow: ["Spiral pocket from center", "Rest machine corners", "Finish pass"],
  },
  "plunge+hsm": {
    synergy: 0.75,
    workflow: ["Plunge rough deep areas", "HSM cleanup and semi-finish", "HSM finish"],
  },
  "ramp+trochoidal": {
    synergy: 0.85,
    workflow: ["Ramp entry to depth", "Trochoidal clear slot", "Finish walls"],
  },
  "helical+conventional": {
    synergy: 0.7,
    workflow: ["Helical entry to pocket", "Conventional roughing", "Finish"],
  },
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MillingHybridStrategySynthesizer {
  private requestCounter = 0;

  /**
   * Synthesize hybrid strategy for given requirements.
   */
  synthesize(request: HybridRequest): HybridSynthesisResult {
    const requestId = `HYBRID-${++this.requestCounter}-${Date.now()}`;
    const startTime = Date.now();

    log.info("MillingHybridStrategySynthesizer.synthesize", { requestId, feature: request.feature_type });

    // Phase 1: Analyze feature
    const featureAnalysis = this.analyzeFeature(request);

    // Phase 2: Score each strategy
    const strategyScores = this.scoreStrategies(request);

    // Phase 3: Find hybrid combinations
    const hybridCombinations = this.findHybridCombinations(request, strategyScores);

    // Phase 4: Select recommended hybrid
    const recommendedHybrid = hybridCombinations.length > 0
      ? hybridCombinations.reduce((a, b) => a.synergy_score > b.synergy_score ? a : b)
      : null;

    // Phase 5: Generate workflow
    const workflow = recommendedHybrid
      ? recommendedHybrid.workflow
      : this.generateSingleStrategyWorkflow(strategyScores[0]?.strategy || "conventional");

    // Phase 6: Generate operation sequence
    const operationSequence = this.generateOperationSequence(request, recommendedHybrid);

    // Phase 7: Estimate improvements
    const estimates = this.estimateImprovements(request, recommendedHybrid);

    // Phase 8: Get tribal tips
    const tribalTips = this.getTribalTips(request, recommendedHybrid);

    // Phase 9: Generate warnings
    const warnings = this.generateWarnings(request, strategyScores);

    const confidence = this.calculateConfidence(strategyScores, recommendedHybrid);

    const result: HybridSynthesisResult = {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      feature_analysis: featureAnalysis,
      strategy_scores: strategyScores,
      top_single_strategy: strategyScores[0]?.strategy || "conventional",
      hybrid_combinations: hybridCombinations,
      recommended_hybrid: recommendedHybrid,
      workflow_steps: workflow,
      operation_sequence: operationSequence,
      estimated_cycle_time_reduction_pct: estimates.time,
      estimated_tool_life_improvement_pct: estimates.toolLife,
      estimated_quality_improvement_pct: estimates.quality,
      tribal_tips: tribalTips,
      warnings,
      confidence,
    };

    log.info("MillingHybridStrategySynthesizer.synthesize.complete", {
      requestId,
      recommended: recommendedHybrid?.primary_strategy,
      confidence,
    });

    return result;
  }

  /**
   * Quick strategy recommendation.
   */
  quickRecommend(request: HybridRequest): {
    strategy: StrategyType;
    hybrid_with?: StrategyType;
    reason: string;
    confidence: number;
  } {
    const scores = this.scoreStrategies(request);
    const top = scores[0];

    // Check if hybrid would help
    let hybridWith: StrategyType | undefined;
    let reason = `${top.strategy} is best fit for ${request.feature_type}`;

    if (top.strategy === "trochoidal" && request.corner_radius_mm && request.corner_radius_mm < 3) {
      hybridWith = "rest";
      reason = "Trochoidal + Rest: clear bulk with trochoidal, clean corners with smaller rest tool";
    } else if (top.strategy === "hfm" && request.depth_mm && request.depth_mm > 50) {
      hybridWith = "plunge";
      reason = "HFM + Plunge: face with HFM, use plunge for deep walls";
    } else if (top.strategy === "hsm" && request.hardness_hrc && request.hardness_hrc > 40) {
      hybridWith = "conventional";
      reason = "HSM + Conventional: HSM rough, conventional for hard material cleanup";
    }

    return {
      strategy: top.strategy,
      hybrid_with: hybridWith,
      reason,
      confidence: top.fit_score,
    };
  }

  /**
   * Get available strategies with descriptions.
   */
  getStrategies(): StrategyInfo[] {
    return Object.values(STRATEGIES);
  }

  /**
   * Get synergy information for strategy pair.
   */
  getSynergy(primary: StrategyType, secondary: StrategyType): {
    synergy_score: number;
    workflow: string[];
    recommended: boolean;
  } | null {
    const key = `${primary}+${secondary}`;
    const reverseKey = `${secondary}+${primary}`;

    const entry = SYNERGY_MATRIX[key] || SYNERGY_MATRIX[reverseKey];

    if (!entry) {
      return null;
    }

    return {
      synergy_score: entry.synergy,
      workflow: entry.workflow,
      recommended: entry.synergy > 0.75,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private analyzeFeature(request: HybridRequest): {
    complexity: "simple" | "moderate" | "complex";
    challenges: string[];
    opportunities: string[];
  } {
    const challenges: string[] = [];
    const opportunities: string[] = [];
    let complexityScore = 0;

    // Depth analysis
    if (request.depth_mm && request.depth_mm > 50) {
      challenges.push("Deep feature requires chip evacuation attention");
      complexityScore += 1;
    } else if (request.depth_mm && request.depth_mm < 10) {
      opportunities.push("Shallow depth allows aggressive parameters");
    }

    // Corner analysis
    if (request.corner_radius_mm && request.corner_radius_mm < 2) {
      challenges.push("Tight corners require small tools or EDM");
      complexityScore += 1;
    }

    // Material analysis
    if (request.hardness_hrc && request.hardness_hrc > 45) {
      challenges.push("Hard material limits speed and tool options");
      complexityScore += 1;
    }
    if (request.material_iso === "N") {
      opportunities.push("Aluminum allows high speeds and feeds");
    }

    // Quality analysis
    if (request.surface_finish_ra && request.surface_finish_ra < 1.0) {
      challenges.push("Fine finish requires careful stepover and fresh tool");
      complexityScore += 1;
    }

    // Machine analysis
    if (request.machine_axes === 5) {
      opportunities.push("5-axis enables single setup and undercuts");
    }

    // Feature type
    if (request.feature_type === "cavity" || request.feature_type === "pocket") {
      complexityScore += 1;
    }

    const complexity: "simple" | "moderate" | "complex" =
      complexityScore <= 1 ? "simple" :
      complexityScore <= 3 ? "moderate" : "complex";

    return { complexity, challenges, opportunities };
  }

  private scoreStrategies(request: HybridRequest): StrategyScore[] {
    const scores: StrategyScore[] = [];

    for (const [type, info] of Object.entries(STRATEGIES)) {
      const { score, reasons, limitations } = this.scoreStrategy(request, info);
      scores.push({
        strategy: type as StrategyType,
        fit_score: score,
        reasons,
        limitations_hit: limitations,
      });
    }

    return scores.sort((a, b) => b.fit_score - a.fit_score);
  }

  private scoreStrategy(
    request: HybridRequest,
    info: StrategyInfo
  ): { score: number; reasons: string[]; limitations: string[] } {
    let score = 0.5; // baseline
    const reasons: string[] = [];
    const limitations: string[] = [];

    // Check best_for matches
    for (const bestFor of info.best_for) {
      if (request.feature_type === "pocket" && bestFor.includes("pocket")) {
        score += 0.15;
        reasons.push(`Good for pockets`);
      }
      if (request.feature_type === "slot" && (bestFor.includes("slot") || bestFor.includes("deep"))) {
        score += 0.15;
        reasons.push(`Good for slots`);
      }
      if (request.material_iso === "N" && bestFor.includes("aluminum")) {
        score += 0.15;
        reasons.push(`Optimized for aluminum`);
      }
      if (request.material_iso === "S" && (bestFor.includes("titanium") || bestFor.includes("hard"))) {
        score += 0.2;
        reasons.push(`Suitable for superalloys`);
      }
      if (request.hardness_hrc && request.hardness_hrc > 45 && bestFor.includes("hard")) {
        score += 0.15;
        reasons.push(`Good for hard materials`);
      }
      if (request.depth_mm && request.depth_mm > 50 && bestFor.includes("deep")) {
        score += 0.15;
        reasons.push(`Handles deep features`);
      }
    }

    // Check limitations
    for (const limitation of info.limitations) {
      if (request.depth_mm && request.depth_mm < 10 && limitation.includes("shallow")) {
        score -= 0.1;
        limitations.push(limitation);
      }
      if (request.max_rpm && request.max_rpm < 10000 && limitation.includes("high RPM")) {
        score -= 0.15;
        limitations.push(limitation);
      }
    }

    // Priority adjustments
    if (request.priority === "speed" && info.time_factor < 1.0) {
      score += 0.1;
      reasons.push("Faster cycle time");
    }
    if (request.priority === "quality" && info.quality_factor > 1.0) {
      score += 0.1;
      reasons.push("Better quality");
    }
    if (request.priority === "cost" && info.cost_factor < 1.0) {
      score += 0.1;
      reasons.push("Lower cost");
    }

    return { score: Math.min(1, Math.max(0, score)), reasons, limitations };
  }

  private findHybridCombinations(
    request: HybridRequest,
    scores: StrategyScore[]
  ): HybridCombination[] {
    const combinations: HybridCombination[] = [];
    const topStrategies = scores.slice(0, 4);

    for (let i = 0; i < topStrategies.length; i++) {
      for (let j = i + 1; j < topStrategies.length; j++) {
        const primary = topStrategies[i].strategy;
        const secondary = topStrategies[j].strategy;

        const synergy = this.getSynergy(primary, secondary);
        if (synergy && synergy.synergy_score > 0.6) {
          combinations.push({
            primary_strategy: primary,
            secondary_strategy: secondary,
            synergy_score: synergy.synergy_score,
            workflow: synergy.workflow,
            estimated_time_savings_pct: Math.round((1 - STRATEGIES[secondary].time_factor) * synergy.synergy_score * 20),
            estimated_quality_improvement_pct: Math.round((STRATEGIES[secondary].quality_factor - 1) * synergy.synergy_score * 15),
          });
        }
      }
    }

    return combinations.sort((a, b) => b.synergy_score - a.synergy_score);
  }

  private generateSingleStrategyWorkflow(strategy: StrategyType): string[] {
    const info = STRATEGIES[strategy];
    return [
      `Apply ${info.description}`,
      "Rough with 50% radial engagement",
      "Semi-finish with 30% radial",
      "Finish with 15% stepover",
    ];
  }

  private generateOperationSequence(
    request: HybridRequest,
    hybrid: HybridCombination | null
  ): string[] {
    const sequence = ["Face top surface"];

    if (request.depth_mm && request.depth_mm > 20) {
      if (hybrid?.primary_strategy === "trochoidal") {
        sequence.push("Trochoidal rough to depth");
      } else if (hybrid?.primary_strategy === "plunge") {
        sequence.push("Plunge rough walls");
      } else {
        sequence.push("Rough pocket/cavity");
      }
    } else {
      sequence.push("Rough feature");
    }

    if (hybrid?.secondary_strategy === "rest") {
      sequence.push("Rest machine corners");
    }

    sequence.push("Semi-finish walls");
    sequence.push("Semi-finish floor");
    sequence.push("Finish walls");
    sequence.push("Finish floor");

    if (request.corner_radius_mm && request.corner_radius_mm < 3) {
      sequence.push("Pencil trace tight corners");
    }

    return sequence;
  }

  private estimateImprovements(
    request: HybridRequest,
    hybrid: HybridCombination | null
  ): { time: number; toolLife: number; quality: number } {
    if (!hybrid) {
      return { time: 0, toolLife: 0, quality: 0 };
    }

    const primary = STRATEGIES[hybrid.primary_strategy];
    const secondary = STRATEGIES[hybrid.secondary_strategy];

    // Weighted average based on synergy
    const timeImprovement = Math.round(
      ((1 - primary.time_factor) * 0.7 + (1 - secondary.time_factor) * 0.3) * hybrid.synergy_score * 25
    );

    const toolLifeImprovement = Math.round(
      hybrid.synergy_score * 15 * (primary.quality_factor > 1 ? 1.2 : 1)
    );

    const qualityImprovement = Math.round(
      ((primary.quality_factor - 1) + (secondary.quality_factor - 1)) * hybrid.synergy_score * 10
    );

    return {
      time: Math.max(0, timeImprovement),
      toolLife: Math.max(0, toolLifeImprovement),
      quality: Math.max(0, qualityImprovement),
    };
  }

  private getTribalTips(request: HybridRequest, hybrid: HybridCombination | null): string[] {
    const tips: string[] = [];

    if (hybrid?.primary_strategy === "trochoidal") {
      tips.push("Trochoidal: use 10-15% radial engagement for consistent chip load");
      tips.push("Maintain constant RPM throughout trochoidal motion");
    }

    if (hybrid?.secondary_strategy === "rest") {
      tips.push("Rest machining: use 50-70% of previous tool diameter for rest tool");
      tips.push("Add 0.1mm extra stock for rest tool to ensure clean pickup");
    }

    if (request.material_iso === "S") {
      tips.push("Superalloys: constant engagement angle is critical for tool life");
    }

    if (request.material_iso === "H" || (request.hardness_hrc && request.hardness_hrc > 45)) {
      tips.push("Hard milling: light cuts, high speeds, fresh cutting edge");
    }

    if (request.depth_mm && request.depth_mm > 30) {
      tips.push("Deep features: consider chip breaking cycle for long chips");
    }

    return tips.slice(0, 5);
  }

  private generateWarnings(request: HybridRequest, scores: StrategyScore[]): string[] {
    const warnings: string[] = [];

    const topScore = scores[0]?.fit_score || 0;
    if (topScore < 0.6) {
      warnings.push("No strategy is a strong fit; consider manual optimization");
    }

    if (request.corner_radius_mm && request.corner_radius_mm < 1) {
      warnings.push("Very tight corners may require EDM or very small tools");
    }

    if (request.hardness_hrc && request.hardness_hrc > 55) {
      warnings.push("Extreme hardness: verify tool can handle HRC > 55");
    }

    if (request.depth_mm && request.tool_diameter_mm && request.depth_mm > 5 * request.tool_diameter_mm) {
      warnings.push(`Depth (${request.depth_mm}mm) exceeds 5x tool diameter - consider longer tool or staged cuts`);
    }

    return warnings;
  }

  private calculateConfidence(scores: StrategyScore[], hybrid: HybridCombination | null): number {
    const topScore = scores[0]?.fit_score || 0.5;
    const hybridBonus = hybrid ? hybrid.synergy_score * 0.1 : 0;

    return Math.min(0.95, topScore + hybridBonus);
  }
}

export const millingHybridStrategySynthesizer = new MillingHybridStrategySynthesizer();
