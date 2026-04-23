/**
 * HolderOperationMatchEngine — MIO-MS0/U-MIO12
 *
 * Unified holder selection engine that matches toolholder types to operation
 * requirements using a multi-criteria decision matrix considering:
 * - Rigidity (deflection resistance)
 * - Damping (chatter suppression)
 * - Runout (TIR for surface finish)
 * - Cost (tooling budget)
 * - Speed capability (balancing requirements)
 *
 * Holder Type Characteristics:
 * - Shrink fit: Highest rigidity/accuracy, moderate cost, requires heater
 * - Hydraulic: Excellent damping, good runout, high cost
 * - Collet ER: Versatile, moderate all factors, low cost
 * - Milling chuck: Good rigidity, easy tool change, moderate cost
 * - Weldon: Simple, low cost, poor runout
 *
 * @module engines/HolderOperationMatchEngine
 * @milestone MIO-MS0
 */

import { log } from "../utils/Logger.js";

export type HolderType = "collet_ER" | "shrink_fit" | "hydraulic" | "milling_chuck" | "weldon" | "press_fit";

export interface OperationRequirements {
  operation_type: "roughing" | "finishing" | "semi_finishing" | "drilling" | "tapping" | "slotting";
  tolerance_mm?: number;
  surface_finish_ra_um?: number;
  cutting_force_n?: number;
  spindle_rpm?: number;
  tool_diameter_mm: number;
  tool_length_mm?: number;
  chatter_sensitive?: boolean;
  budget_priority?: "low" | "medium" | "high";
}

export interface HolderScore {
  holder_type: HolderType;
  total_score: number;
  rigidity_score: number;
  damping_score: number;
  runout_score: number;
  cost_score: number;
  speed_score: number;
  suitability: "excellent" | "good" | "acceptable" | "marginal" | "poor";
  notes: string[];
}

export interface HolderMatchResult {
  recommended: HolderScore;
  alternatives: HolderScore[];
  decision_factors: {
    primary_concern: string;
    critical_requirements: string[];
    tradeoffs: string[];
  };
  ai_reasoning: string[];
}

// Holder characteristics database (normalized 0-1 scale)
const HOLDER_CHARACTERISTICS: Record<HolderType, {
  rigidity: number;
  damping: number;
  runout_tir_um: number;
  cost_factor: number;
  max_rpm: number;
  tool_change_ease: number;
}> = {
  shrink_fit: { rigidity: 0.95, damping: 0.6, runout_tir_um: 3, cost_factor: 0.7, max_rpm: 40000, tool_change_ease: 0.3 },
  hydraulic: { rigidity: 0.85, damping: 0.95, runout_tir_um: 3, cost_factor: 0.5, max_rpm: 25000, tool_change_ease: 0.7 },
  collet_ER: { rigidity: 0.7, damping: 0.5, runout_tir_um: 8, cost_factor: 0.9, max_rpm: 30000, tool_change_ease: 0.9 },
  milling_chuck: { rigidity: 0.8, damping: 0.6, runout_tir_um: 5, cost_factor: 0.75, max_rpm: 20000, tool_change_ease: 0.85 },
  weldon: { rigidity: 0.75, damping: 0.4, runout_tir_um: 15, cost_factor: 0.95, max_rpm: 15000, tool_change_ease: 0.95 },
  press_fit: { rigidity: 0.9, damping: 0.55, runout_tir_um: 5, cost_factor: 0.8, max_rpm: 35000, tool_change_ease: 0.4 },
};

// Operation-specific weight profiles
const OPERATION_WEIGHTS: Record<string, { rigidity: number; damping: number; runout: number; cost: number; speed: number }> = {
  roughing: { rigidity: 0.4, damping: 0.25, runout: 0.05, cost: 0.2, speed: 0.1 },
  finishing: { rigidity: 0.2, damping: 0.3, runout: 0.35, cost: 0.05, speed: 0.1 },
  semi_finishing: { rigidity: 0.3, damping: 0.25, runout: 0.2, cost: 0.15, speed: 0.1 },
  drilling: { rigidity: 0.35, damping: 0.15, runout: 0.25, cost: 0.15, speed: 0.1 },
  tapping: { rigidity: 0.25, damping: 0.2, runout: 0.15, cost: 0.2, speed: 0.2 },
  slotting: { rigidity: 0.45, damping: 0.3, runout: 0.1, cost: 0.1, speed: 0.05 },
};

class HolderOperationMatchEngine {
  /**
   * Match holder to operation requirements
   */
  match(requirements: OperationRequirements): HolderMatchResult {
    const reasoning: string[] = [];
    reasoning.push(`[HOLDER-MATCH] Analyzing for ${requirements.operation_type}, Ø${requirements.tool_diameter_mm}mm tool`);

    const weights = OPERATION_WEIGHTS[requirements.operation_type] || OPERATION_WEIGHTS.semi_finishing;
    const scores: HolderScore[] = [];

    // Score each holder type
    for (const [holderType, chars] of Object.entries(HOLDER_CHARACTERISTICS)) {
      const score = this.scoreHolder(
        holderType as HolderType,
        chars,
        requirements,
        weights,
        reasoning
      );
      scores.push(score);
    }

    // Sort by total score descending
    scores.sort((a, b) => b.total_score - a.total_score);

    const recommended = scores[0];
    const alternatives = scores.slice(1, 3);

    // Determine decision factors
    const decisionFactors = this.analyzeDecision(requirements, recommended, reasoning);

    reasoning.push(`[HOLDER-MATCH] Recommended: ${recommended.holder_type} (score: ${recommended.total_score.toFixed(2)})`);

    return {
      recommended,
      alternatives,
      decision_factors: decisionFactors,
      ai_reasoning: reasoning,
    };
  }

  /**
   * Score a single holder type
   */
  private scoreHolder(
    holderType: HolderType,
    chars: typeof HOLDER_CHARACTERISTICS["shrink_fit"],
    requirements: OperationRequirements,
    weights: typeof OPERATION_WEIGHTS["roughing"],
    reasoning: string[]
  ): HolderScore {
    const notes: string[] = [];

    // Rigidity score (higher is better)
    let rigidityScore = chars.rigidity;
    if (requirements.cutting_force_n && requirements.cutting_force_n > 500) {
      rigidityScore *= chars.rigidity > 0.8 ? 1.1 : 0.9;
      if (chars.rigidity < 0.75) notes.push("May deflect under high force");
    }

    // Damping score (higher is better, especially for chatter)
    let dampingScore = chars.damping;
    if (requirements.chatter_sensitive) {
      dampingScore *= chars.damping > 0.7 ? 1.2 : 0.8;
      if (chars.damping > 0.8) notes.push("Excellent chatter suppression");
    }

    // Runout score (lower TIR is better)
    const maxAllowedTir = requirements.surface_finish_ra_um
      ? requirements.surface_finish_ra_um * 2 // rough heuristic
      : 10;
    let runoutScore = chars.runout_tir_um <= maxAllowedTir ? 1.0 : maxAllowedTir / chars.runout_tir_um;
    if (requirements.tolerance_mm && requirements.tolerance_mm < 0.02) {
      runoutScore *= chars.runout_tir_um <= 5 ? 1.1 : 0.7;
      if (chars.runout_tir_um > 8) notes.push("TIR may exceed tolerance requirements");
    }

    // Cost score (cost_factor closer to 1 = lower cost = better)
    let costScore = chars.cost_factor;
    if (requirements.budget_priority === "high") {
      costScore *= 0.8; // Penalize high-cost options
    }

    // Speed score (higher max_rpm is better for high-speed ops)
    let speedScore = 1.0;
    if (requirements.spindle_rpm) {
      speedScore = requirements.spindle_rpm <= chars.max_rpm ? 1.0 : 0.5;
      if (requirements.spindle_rpm > chars.max_rpm * 0.8) {
        notes.push(`Near RPM limit (${chars.max_rpm} max)`);
      }
    }

    // Calculate weighted total
    const totalScore =
      rigidityScore * weights.rigidity +
      dampingScore * weights.damping +
      runoutScore * weights.runout +
      costScore * weights.cost +
      speedScore * weights.speed;

    // Determine suitability
    const suitability = totalScore > 0.85 ? "excellent" :
      totalScore > 0.7 ? "good" :
      totalScore > 0.55 ? "acceptable" :
      totalScore > 0.4 ? "marginal" : "poor";

    return {
      holder_type: holderType,
      total_score: totalScore,
      rigidity_score: rigidityScore,
      damping_score: dampingScore,
      runout_score: runoutScore,
      cost_score: costScore,
      speed_score: speedScore,
      suitability,
      notes,
    };
  }

  /**
   * Analyze the decision factors
   */
  private analyzeDecision(
    requirements: OperationRequirements,
    recommended: HolderScore,
    reasoning: string[]
  ): HolderMatchResult["decision_factors"] {
    const criticalReqs: string[] = [];
    const tradeoffs: string[] = [];
    let primaryConcern = "balanced performance";

    if (requirements.operation_type === "finishing") {
      primaryConcern = "surface finish quality";
      criticalReqs.push("Low runout TIR for Ra target");
    } else if (requirements.operation_type === "roughing") {
      primaryConcern = "rigidity under load";
      criticalReqs.push("High stiffness for heavy cuts");
    }

    if (requirements.chatter_sensitive) {
      criticalReqs.push("High damping for chatter suppression");
    }

    if (requirements.tolerance_mm && requirements.tolerance_mm < 0.02) {
      criticalReqs.push(`Tight tolerance: ±${(requirements.tolerance_mm * 1000).toFixed(0)}µm`);
    }

    // Note tradeoffs
    if (recommended.holder_type === "shrink_fit") {
      tradeoffs.push("Requires heat shrink equipment for tool changes");
    }
    if (recommended.holder_type === "hydraulic") {
      tradeoffs.push("Higher cost but excellent damping");
    }
    if (recommended.holder_type === "collet_ER") {
      tradeoffs.push("Versatile but moderate rigidity");
    }

    return {
      primary_concern: primaryConcern,
      critical_requirements: criticalReqs,
      tradeoffs,
    };
  }

  /**
   * Quick recommendation for orchestrator integration
   */
  quickMatch(
    operation: "roughing" | "finishing" | "drilling",
    toolDiameter: number,
    chatterSensitive: boolean = false
  ): { holder: HolderType; confidence: number } {
    const result = this.match({
      operation_type: operation,
      tool_diameter_mm: toolDiameter,
      chatter_sensitive: chatterSensitive,
    });

    return {
      holder: result.recommended.holder_type,
      confidence: result.recommended.total_score,
    };
  }
}

export const holderOperationMatchEngine = new HolderOperationMatchEngine();
