/**
 * CounterfactualReasoningEngine — What-If Analysis for Manufacturing Decisions
 * ==============================================================================
 * Implements counterfactual reasoning to explore "what-if" scenarios, identify
 * causal relationships, and optimize decisions by analyzing alternative outcomes.
 *
 * Based on Judea Pearl's causal inference framework with manufacturing adaptations.
 *
 * Key Features:
 *   - Hypothetical scenario generation
 *   - Causal graph construction and intervention analysis
 *   - Outcome comparison across scenarios
 *   - Root cause identification for failures
 *   - Optimal intervention recommendation
 *
 * @module engines/CounterfactualReasoningEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CausalVariable {
  name: string;
  type: "continuous" | "categorical" | "binary";
  domain: { min?: number; max?: number; values?: string[] };
  current_value: number | string | boolean;
  unit?: string;
}

export interface CausalRelation {
  from: string;
  to: string;
  strength: number;  // -1 to 1 (negative = inverse relationship)
  confidence: number;
  mechanism: string;  // Description of how from affects to
}

export interface CausalGraph {
  id: string;
  variables: Map<string, CausalVariable>;
  relations: CausalRelation[];
  created_at: string;
}

export interface Counterfactual {
  id: string;
  description: string;
  intervention: {
    variable: string;
    original_value: number | string | boolean;
    counterfactual_value: number | string | boolean;
  };
  predicted_effects: {
    variable: string;
    original_value: number | string | boolean;
    predicted_value: number | string | boolean;
    change_percentage: number;
  }[];
  outcome_score: number;
  feasibility: number;
  risk_score: number;
}

export interface ScenarioComparison {
  scenarios: Counterfactual[];
  best_scenario_id: string;
  ranking: { id: string; score: number; rationale: string }[];
  recommendation: string;
  confidence: number;
}

export interface RootCauseAnalysis {
  observed_outcome: string;
  desired_outcome: string;
  root_causes: {
    variable: string;
    contribution: number;  // 0-1: how much this variable contributed
    evidence: string;
    intervention_potential: number;  // 0-1: how easy to change
  }[];
  intervention_plan: {
    variable: string;
    target_value: number | string | boolean;
    expected_improvement: number;
    confidence: number;
  }[];
}

// ============================================================================
// MANUFACTURING CAUSAL TEMPLATES
// ============================================================================

/** Pre-defined causal relationships in machining */
const MACHINING_CAUSAL_TEMPLATES: CausalRelation[] = [
  // Speed/Feed effects
  { from: "cutting_speed", to: "surface_finish", strength: 0.7, confidence: 0.9, mechanism: "Higher speed generally improves surface finish up to thermal limit" },
  { from: "cutting_speed", to: "tool_wear", strength: 0.8, confidence: 0.95, mechanism: "Higher speed accelerates tool wear (Taylor equation)" },
  { from: "cutting_speed", to: "temperature", strength: 0.85, confidence: 0.95, mechanism: "Speed directly increases cutting temperature" },
  { from: "feed_rate", to: "surface_finish", strength: -0.8, confidence: 0.9, mechanism: "Higher feed degrades surface finish (scallop height)" },
  { from: "feed_rate", to: "cycle_time", strength: -0.9, confidence: 0.95, mechanism: "Higher feed reduces cycle time" },
  { from: "feed_rate", to: "cutting_force", strength: 0.75, confidence: 0.9, mechanism: "Higher feed increases cutting forces (Kienzle)" },

  // Depth of cut effects
  { from: "depth_of_cut", to: "cutting_force", strength: 0.85, confidence: 0.95, mechanism: "DOC directly proportional to force (Kienzle)" },
  { from: "depth_of_cut", to: "deflection", strength: 0.8, confidence: 0.9, mechanism: "Higher DOC increases tool/part deflection" },
  { from: "depth_of_cut", to: "chatter", strength: 0.7, confidence: 0.85, mechanism: "Higher DOC increases chatter tendency" },
  { from: "depth_of_cut", to: "material_removal_rate", strength: 0.95, confidence: 0.95, mechanism: "DOC directly proportional to MRR" },

  // Tool effects
  { from: "tool_radius", to: "surface_finish", strength: 0.6, confidence: 0.85, mechanism: "Larger radius improves finish (lower cusp height)" },
  { from: "tool_radius", to: "cutting_force", strength: 0.4, confidence: 0.8, mechanism: "Larger radius slightly increases force" },
  { from: "tool_wear", to: "surface_finish", strength: -0.7, confidence: 0.9, mechanism: "Worn tool degrades surface finish" },
  { from: "tool_wear", to: "dimensional_accuracy", strength: -0.8, confidence: 0.9, mechanism: "Tool wear causes dimensional drift" },

  // Thermal effects
  { from: "temperature", to: "tool_wear", strength: 0.75, confidence: 0.9, mechanism: "Higher temp accelerates diffusion wear" },
  { from: "temperature", to: "thermal_expansion", strength: 0.9, confidence: 0.95, mechanism: "Direct thermal expansion relationship" },
  { from: "thermal_expansion", to: "dimensional_accuracy", strength: -0.85, confidence: 0.9, mechanism: "Expansion causes dimensional error" },

  // Coolant effects
  { from: "coolant_pressure", to: "temperature", strength: -0.6, confidence: 0.85, mechanism: "Higher pressure improves heat extraction" },
  { from: "coolant_pressure", to: "chip_evacuation", strength: 0.7, confidence: 0.85, mechanism: "Pressure assists chip removal" },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class CounterfactualReasoningEngine {
  private graphs: Map<string, CausalGraph> = new Map();
  private counterfactuals: Map<string, Counterfactual[]> = new Map();

  /**
   * Create a causal graph for a manufacturing scenario.
   */
  createCausalGraph(
    variables: CausalVariable[],
    domain: "machining" | "edm" | "grinding" | "custom" = "machining"
  ): CausalGraph {
    const graphId = `graph_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const varMap = new Map<string, CausalVariable>();
    for (const v of variables) {
      varMap.set(v.name, v);
    }

    // Use domain-specific templates
    let relations: CausalRelation[] = [];
    if (domain === "machining") {
      relations = MACHINING_CAUSAL_TEMPLATES.filter(r =>
        varMap.has(r.from) && varMap.has(r.to)
      );
    }

    const graph: CausalGraph = {
      id: graphId,
      variables: varMap,
      relations,
      created_at: new Date().toISOString(),
    };

    this.graphs.set(graphId, graph);
    log.info(`[CounterfactualReasoning] Created causal graph ${graphId} with ${variables.length} variables, ${relations.length} relations`);

    return graph;
  }

  /**
   * Generate counterfactual: "What if variable X had value Y instead?"
   */
  generateCounterfactual(
    graphId: string,
    variable: string,
    counterfactual_value: number | string | boolean
  ): Counterfactual | null {
    const graph = this.graphs.get(graphId);
    if (!graph) {
      log.error(`[CounterfactualReasoning] Graph ${graphId} not found`);
      return null;
    }

    const sourceVar = graph.variables.get(variable);
    if (!sourceVar) {
      log.error(`[CounterfactualReasoning] Variable ${variable} not found in graph`);
      return null;
    }

    const cfId = `cf_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Calculate predicted effects using causal propagation
    const effects = this.propagateIntervention(graph, variable, counterfactual_value);

    // Calculate outcome score (improvement vs current state)
    const outcomeScore = this.calculateOutcomeScore(effects);

    // Calculate feasibility (how realistic is this change)
    const feasibility = this.calculateFeasibility(sourceVar, counterfactual_value);

    // Calculate risk (potential negative consequences)
    const riskScore = this.calculateRisk(effects);

    const counterfactual: Counterfactual = {
      id: cfId,
      description: `What if ${variable} = ${counterfactual_value} instead of ${sourceVar.current_value}?`,
      intervention: {
        variable,
        original_value: sourceVar.current_value,
        counterfactual_value,
      },
      predicted_effects: effects,
      outcome_score: outcomeScore,
      feasibility,
      risk_score: riskScore,
    };

    // Store for comparison
    const existing = this.counterfactuals.get(graphId) ?? [];
    existing.push(counterfactual);
    this.counterfactuals.set(graphId, existing);

    return counterfactual;
  }

  /**
   * Propagate intervention effects through the causal graph.
   */
  private propagateIntervention(
    graph: CausalGraph,
    interventionVar: string,
    newValue: number | string | boolean
  ): Counterfactual["predicted_effects"] {
    const effects: Counterfactual["predicted_effects"] = [];
    const visited = new Set<string>();
    const queue: { variable: string; change: number }[] = [];

    // Calculate initial change
    const sourceVar = graph.variables.get(interventionVar)!;
    let initialChange = 0;
    if (typeof sourceVar.current_value === "number" && typeof newValue === "number") {
      initialChange = (newValue - sourceVar.current_value) / (sourceVar.current_value || 1);
    } else if (sourceVar.current_value !== newValue) {
      initialChange = 1.0;  // Categorical change
    }

    // Find all variables affected by this intervention
    const outgoingRelations = graph.relations.filter(r => r.from === interventionVar);
    for (const rel of outgoingRelations) {
      queue.push({ variable: rel.to, change: initialChange * rel.strength });
    }

    // BFS propagation
    while (queue.length > 0) {
      const { variable, change } = queue.shift()!;
      if (visited.has(variable)) continue;
      visited.add(variable);

      const targetVar = graph.variables.get(variable);
      if (!targetVar) continue;

      let predictedValue: number | string | boolean = targetVar.current_value;
      let changePercentage = change * 100;

      if (typeof targetVar.current_value === "number") {
        const numericChange = targetVar.current_value * change;
        predictedValue = targetVar.current_value + numericChange;

        // Clamp to domain
        if (targetVar.domain.min !== undefined) {
          predictedValue = Math.max(targetVar.domain.min, predictedValue);
        }
        if (targetVar.domain.max !== undefined) {
          predictedValue = Math.min(targetVar.domain.max, predictedValue);
        }

        changePercentage = ((predictedValue - targetVar.current_value) / (targetVar.current_value || 1)) * 100;
      }

      effects.push({
        variable,
        original_value: targetVar.current_value,
        predicted_value: predictedValue,
        change_percentage: Math.round(changePercentage * 10) / 10,
      });

      // Continue propagation (with decay)
      const onwardRelations = graph.relations.filter(r => r.from === variable);
      for (const rel of onwardRelations) {
        if (!visited.has(rel.to)) {
          queue.push({ variable: rel.to, change: change * rel.strength * 0.7 });  // 0.7 decay factor
        }
      }
    }

    return effects;
  }

  /**
   * Calculate outcome score based on predicted effects.
   */
  private calculateOutcomeScore(effects: Counterfactual["predicted_effects"]): number {
    // Positive outcomes weighted by importance
    const positiveOutcomes = ["surface_finish", "dimensional_accuracy", "tool_life", "material_removal_rate"];
    const negativeOutcomes = ["tool_wear", "temperature", "cutting_force", "chatter", "deflection"];

    let score = 0.5;  // Neutral baseline

    for (const effect of effects) {
      const change = effect.change_percentage / 100;

      if (positiveOutcomes.includes(effect.variable)) {
        // Positive change in positive outcome is good
        score += change * 0.15;
      } else if (negativeOutcomes.includes(effect.variable)) {
        // Negative change in negative outcome is good (reduction)
        score -= change * 0.15;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate feasibility of an intervention.
   */
  private calculateFeasibility(
    variable: CausalVariable,
    newValue: number | string | boolean
  ): number {
    let feasibility = 0.8;  // Base feasibility

    if (typeof variable.current_value === "number" && typeof newValue === "number") {
      const changeRatio = Math.abs(newValue - variable.current_value) / (variable.current_value || 1);

      // Large changes are less feasible
      if (changeRatio > 0.5) feasibility -= 0.2;
      if (changeRatio > 1.0) feasibility -= 0.3;

      // Out of bounds is not feasible
      if (variable.domain.min !== undefined && newValue < variable.domain.min) {
        feasibility = 0.1;
      }
      if (variable.domain.max !== undefined && newValue > variable.domain.max) {
        feasibility = 0.1;
      }
    }

    return Math.max(0.1, feasibility);
  }

  /**
   * Calculate risk score based on negative effects.
   */
  private calculateRisk(effects: Counterfactual["predicted_effects"]): number {
    const criticalVariables = ["tool_wear", "temperature", "cutting_force", "chatter"];
    let risk = 0;

    for (const effect of effects) {
      if (criticalVariables.includes(effect.variable) && effect.change_percentage > 0) {
        risk += effect.change_percentage / 100 * 0.25;
      }
    }

    return Math.min(1, risk);
  }

  /**
   * Compare multiple counterfactual scenarios.
   */
  compareScenarios(graphId: string): ScenarioComparison | null {
    const scenarios = this.counterfactuals.get(graphId);
    if (!scenarios || scenarios.length === 0) {
      return null;
    }

    // Rank scenarios by adjusted score (outcome - risk + feasibility)
    const ranking = scenarios.map(s => ({
      id: s.id,
      score: s.outcome_score * 0.5 - s.risk_score * 0.3 + s.feasibility * 0.2,
      rationale: `Outcome: ${(s.outcome_score * 100).toFixed(0)}%, Risk: ${(s.risk_score * 100).toFixed(0)}%, Feasibility: ${(s.feasibility * 100).toFixed(0)}%`,
    }));

    ranking.sort((a, b) => b.score - a.score);

    const bestId = ranking[0]?.id;
    const bestScenario = scenarios.find(s => s.id === bestId);

    return {
      scenarios,
      best_scenario_id: bestId,
      ranking,
      recommendation: bestScenario
        ? `Recommended: ${bestScenario.description} (Score: ${(ranking[0].score * 100).toFixed(1)}%)`
        : "No clear recommendation",
      confidence: ranking.length > 1
        ? Math.min(0.95, 0.5 + (ranking[0].score - ranking[1].score))
        : 0.7,
    };
  }

  /**
   * Perform root cause analysis for an undesired outcome.
   */
  analyzeRootCause(
    graphId: string,
    outcomeVariable: string,
    desiredValue: number
  ): RootCauseAnalysis | null {
    const graph = this.graphs.get(graphId);
    if (!graph) return null;

    const outcomeVar = graph.variables.get(outcomeVariable);
    if (!outcomeVar || typeof outcomeVar.current_value !== "number") return null;

    // Find all variables that affect the outcome
    const causes: RootCauseAnalysis["root_causes"] = [];

    for (const relation of graph.relations) {
      if (relation.to === outcomeVariable) {
        const sourceVar = graph.variables.get(relation.from);
        if (!sourceVar) continue;

        // Calculate contribution based on relationship strength
        const contribution = Math.abs(relation.strength) * relation.confidence;

        causes.push({
          variable: relation.from,
          contribution,
          evidence: relation.mechanism,
          intervention_potential: 0.8,  // Most machining params are adjustable
        });
      }
    }

    // Sort by contribution
    causes.sort((a, b) => b.contribution - a.contribution);

    // Generate intervention plan
    const gap = desiredValue - (outcomeVar.current_value as number);
    const interventions: RootCauseAnalysis["intervention_plan"] = [];

    for (const cause of causes.slice(0, 3)) {  // Top 3 causes
      const sourceVar = graph.variables.get(cause.variable);
      if (!sourceVar || typeof sourceVar.current_value !== "number") continue;

      const relation = graph.relations.find(r => r.from === cause.variable && r.to === outcomeVariable);
      if (!relation) continue;

      // Calculate required change
      const requiredChange = (gap / relation.strength) / (sourceVar.current_value || 1);
      const targetValue = sourceVar.current_value * (1 + requiredChange * 0.5);  // 50% correction

      interventions.push({
        variable: cause.variable,
        target_value: Math.round(targetValue * 100) / 100,
        expected_improvement: Math.abs(gap * cause.contribution),
        confidence: relation.confidence * 0.8,
      });
    }

    return {
      observed_outcome: `${outcomeVariable} = ${outcomeVar.current_value}`,
      desired_outcome: `${outcomeVariable} = ${desiredValue}`,
      root_causes: causes,
      intervention_plan: interventions,
    };
  }

  /**
   * Get pre-defined machining causal templates.
   */
  getMachiningTemplates(): CausalRelation[] {
    return [...MACHINING_CAUSAL_TEMPLATES];
  }

  /**
   * Get training context for AI integration.
   */
  getTrainingContext(): string {
    return `
COUNTERFACTUAL REASONING ENGINE
===============================
Capabilities:
  - "What-if" scenario generation for manufacturing decisions
  - Causal graph construction with ${MACHINING_CAUSAL_TEMPLATES.length} pre-defined machining relationships
  - Intervention effect propagation with decay
  - Multi-scenario comparison and ranking
  - Root cause analysis for undesired outcomes

Causal Relationship Categories:
  - Speed/Feed → Surface finish, tool wear, temperature
  - Depth of cut → Force, deflection, chatter, MRR
  - Tool geometry → Surface finish, force
  - Thermal effects → Expansion, dimensional accuracy
  - Coolant → Temperature, chip evacuation

Best For:
  - Optimizing cutting parameters
  - Troubleshooting quality issues
  - Planning process improvements
  - Understanding cause-effect relationships
`.trim();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const counterfactualReasoningEngine = new CounterfactualReasoningEngine();
