/**
 * WireEDMDeepLogicEngine
 *
 * Claude Opus-level deep logic and critical thinking for Wire EDM:
 * - Counterfactual reasoning ("What if we used different parameters?")
 * - Hypothesis testing with evidence gathering
 * - Multi-step inference chains
 * - Constraint satisfaction and optimization
 * - Abductive reasoning (inference to best explanation)
 * - Decision tree generation with confidence propagation
 *
 * Integrates with:
 * - WireEDMDeepReasoningEngine (causal chains)
 * - WireEDMNeuralOrchestrationEngine (strategies)
 * - WireEDMSelfAwarenessIntegrationEngine (knowledge sources)
 * - Tribal knowledge tips
 *
 * @module engines/WireEDMDeepLogicEngine
 */

import { WEDM_KNOWLEDGE_TIPS } from "../data/wedm-knowledge-tips.js";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type LogicMode =
  | "deductive"      // From general rules to specific conclusions
  | "inductive"      // From specific observations to general rules
  | "abductive"      // Inference to best explanation
  | "counterfactual" // "What if" reasoning
  | "constraint"     // Constraint satisfaction
  | "decision";      // Decision tree analysis

export interface Hypothesis {
  id: string;
  statement: string;
  confidence: number;
  supporting_evidence: Evidence[];
  contradicting_evidence: Evidence[];
  tests_required: string[];
  implications: string[];
}

export interface Evidence {
  source: "physics" | "tribal" | "empirical" | "tech_file" | "jm_die";
  description: string;
  strength: number; // 0-1
  reference?: string;
}

export interface CounterfactualScenario {
  original_state: Record<string, number | string>;
  modified_state: Record<string, number | string>;
  changes: Array<{ parameter: string; from: number | string; to: number | string }>;
  predicted_outcomes: {
    ra_um: { value: number; confidence: number };
    cycle_time_min: { value: number; confidence: number };
    wire_consumption_m: { value: number; confidence: number };
    risk_score: { value: number; confidence: number };
  };
  trade_offs: string[];
  recommendation: string;
}

export interface InferenceStep {
  step: number;
  premise: string;
  rule_applied: string;
  conclusion: string;
  confidence: number;
  dependencies: number[];
}

export interface InferenceChain {
  goal: string;
  steps: InferenceStep[];
  final_conclusion: string;
  overall_confidence: number;
  assumptions: string[];
  potential_flaws: string[];
}

export interface Constraint {
  name: string;
  type: "hard" | "soft";
  expression: string;
  current_value: number;
  limit: number;
  satisfied: boolean;
  slack?: number;
}

export interface ConstraintSolution {
  feasible: boolean;
  parameters: Record<string, number>;
  constraints_satisfied: Constraint[];
  constraints_violated: Constraint[];
  optimization_score: number;
  alternatives: Array<{
    parameters: Record<string, number>;
    score: number;
    trade_off: string;
  }>;
}

export interface DecisionNode {
  id: string;
  question: string;
  criteria: string;
  branches: Array<{
    condition: string;
    probability: number;
    outcome: string | DecisionNode;
  }>;
  expected_value?: number;
}

export interface DecisionAnalysis {
  root: DecisionNode;
  optimal_path: string[];
  expected_outcomes: Record<string, number>;
  sensitivity_analysis: Array<{
    parameter: string;
    impact: "high" | "medium" | "low";
    threshold: number;
  }>;
}

export interface LogicResult {
  mode: LogicMode;
  query: string;
  hypotheses?: Hypothesis[];
  counterfactuals?: CounterfactualScenario[];
  inference_chain?: InferenceChain;
  constraint_solution?: ConstraintSolution;
  decision_analysis?: DecisionAnalysis;
  conclusion: string;
  confidence: number;
  reasoning_trace: string[];
  knowledge_gaps: string[];
}

// ============================================================================
// KNOWLEDGE RULES
// ============================================================================

const WEDM_RULES = [
  // Physical constraints
  { id: "R001", rule: "Ra decreases with increasing pass count", confidence: 0.95 },
  { id: "R002", rule: "Wire break risk increases with thickness", confidence: 0.9 },
  { id: "R003", rule: "Cutting speed decreases with thickness", confidence: 0.95 },
  { id: "R004", rule: "Flushing efficiency decreases as 1/sqrt(thickness)", confidence: 0.85 },
  { id: "R005", rule: "ON time should increase with thickness", confidence: 0.9 },
  { id: "R006", rule: "Wire tension should increase with thickness", confidence: 0.85 },
  { id: "R007", rule: "Coated wire reduces breaks in carbide", confidence: 0.88 },
  { id: "R008", rule: "Submerged cutting improves speed by 10-15%", confidence: 0.9 },

  // Process rules
  { id: "R010", rule: "Adaptive control only on rough pass", confidence: 0.95 },
  { id: "R011", rule: "Reduce flush pressure for skim passes", confidence: 0.88 },
  { id: "R012", rule: "Use line-only lead-ins for taper programs", confidence: 0.92 },
  { id: "R013", rule: "Set H-registers to zero for taper cutting", confidence: 0.96 },
  { id: "R014", rule: "Double M78 required for tank fill on FA-10S", confidence: 0.98 },

  // Quality rules
  { id: "R020", rule: "Water resistivity affects Ra quality", confidence: 0.94 },
  { id: "R021", rule: "Hardened steel achieves better Ra than aluminum", confidence: 0.89 },
  { id: "R022", rule: "Wire speed 6-8 m/min for best skim finish", confidence: 0.86 },
  { id: "R023", rule: "Recast layer thickness follows thermal penetration", confidence: 0.9 },
];

const THICKNESS_EFFECTS: Record<string, (t: number) => number> = {
  // Normalized effects based on thickness (t in mm)
  cutting_speed_factor: (t) => Math.max(0.2, 1 - (t - 10) * 0.012),
  wire_break_risk: (t) => Math.min(0.95, 0.05 + t * 0.008),
  flushing_efficiency: (t) => t <= 50 ? 1 : 1 / Math.sqrt(t / 50),
  thermal_distortion_risk: (t) => Math.min(0.8, t > 75 ? 0.3 + (t - 75) * 0.01 : 0.1),
};

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

export class WireEDMDeepLogicEngine {

  /**
   * Main logic entry point - routes to appropriate reasoning mode
   */
  reason(query: string, context?: Record<string, any>): LogicResult {
    const mode = this._detectLogicMode(query);
    const reasoningTrace: string[] = [];

    reasoningTrace.push(`Selected logic mode: ${mode}`);

    let result: Partial<LogicResult> = { mode, query, reasoning_trace: reasoningTrace };

    switch (mode) {
      case "counterfactual":
        result.counterfactuals = this.analyzeCounterfactuals(context ?? {});
        result.conclusion = this._summarizeCounterfactuals(result.counterfactuals);
        break;
      case "abductive":
        result.hypotheses = this.generateHypotheses(query, context);
        result.conclusion = this._selectBestHypothesis(result.hypotheses);
        break;
      case "deductive":
      case "inductive":
        result.inference_chain = this.buildInferenceChain(query, mode, context);
        result.conclusion = result.inference_chain.final_conclusion;
        break;
      case "constraint":
        result.constraint_solution = this.solveConstraints(context ?? {});
        result.conclusion = result.constraint_solution.feasible
          ? "Feasible solution found"
          : "No feasible solution - constraints conflict";
        break;
      case "decision":
        result.decision_analysis = this.analyzeDecision(query, context);
        result.conclusion = `Optimal path: ${result.decision_analysis.optimal_path.join(" → ")}`;
        break;
    }

    result.confidence = this._calculateConfidence(result);
    result.knowledge_gaps = this._identifyKnowledgeGaps(query, context);

    return result as LogicResult;
  }

  /**
   * Counterfactual analysis - "What if we changed X?"
   */
  analyzeCounterfactuals(
    current_state: Record<string, any>,
    parameters_to_vary?: string[]
  ): CounterfactualScenario[] {
    const scenarios: CounterfactualScenario[] = [];
    const varsToAnalyze = parameters_to_vary ?? ["num_passes", "on_time_us", "wire_diameter", "flushing_pressure"];

    const material = current_state.material ?? "D2";
    const thickness = current_state.thickness_mm ?? 25;
    const currentPasses = current_state.num_passes ?? 4;
    const currentOnTime = current_state.on_time_us ?? 4;

    // What if we added one more pass?
    if (varsToAnalyze.includes("num_passes")) {
      const newPasses = currentPasses + 1;
      scenarios.push({
        original_state: { num_passes: currentPasses },
        modified_state: { num_passes: newPasses },
        changes: [{ parameter: "num_passes", from: currentPasses, to: newPasses }],
        predicted_outcomes: {
          ra_um: {
            value: this._predictRa(newPasses, thickness),
            confidence: 0.85
          },
          cycle_time_min: {
            value: this._predictCycleTime(newPasses, thickness) * 1.2,
            confidence: 0.8
          },
          wire_consumption_m: {
            value: thickness * 0.02 * newPasses,
            confidence: 0.75
          },
          risk_score: {
            value: 0.1,
            confidence: 0.9
          },
        },
        trade_offs: [
          `+20% cycle time for ${Math.round((1 - this._predictRa(newPasses, thickness) / this._predictRa(currentPasses, thickness)) * 100)}% better Ra`,
          "Additional wire consumption",
          "Lower risk of quality issues"
        ],
        recommendation: newPasses <= 6
          ? "Recommended if Ra target is critical"
          : "Diminishing returns - consider lapping instead"
      });
    }

    // What if we increased ON time?
    if (varsToAnalyze.includes("on_time_us")) {
      const newOnTime = currentOnTime * 1.25;
      const breakRisk = THICKNESS_EFFECTS.wire_break_risk(thickness);
      scenarios.push({
        original_state: { on_time_us: currentOnTime },
        modified_state: { on_time_us: newOnTime },
        changes: [{ parameter: "on_time_us", from: currentOnTime, to: newOnTime }],
        predicted_outcomes: {
          ra_um: { value: this._predictRa(currentPasses, thickness) * 1.1, confidence: 0.7 },
          cycle_time_min: { value: this._predictCycleTime(currentPasses, thickness) * 0.85, confidence: 0.8 },
          wire_consumption_m: { value: thickness * 0.02 * currentPasses, confidence: 0.75 },
          risk_score: { value: Math.min(0.9, breakRisk * 1.3), confidence: 0.85 },
        },
        trade_offs: [
          "15% faster cutting",
          `${Math.round((breakRisk * 1.3 - breakRisk) * 100)}% higher wire break risk`,
          "10% worse surface finish",
          "Higher thermal load on workpiece"
        ],
        recommendation: thickness < 50
          ? "Consider if speed is priority over quality"
          : "Not recommended for thick sections - break risk too high"
      });
    }

    // What if we used different wire?
    if (varsToAnalyze.includes("wire_diameter")) {
      const currentWire = current_state.wire_diameter ?? "0.25";
      const newWire = currentWire === "0.25" ? "0.30" : "0.25";
      scenarios.push({
        original_state: { wire_diameter: currentWire },
        modified_state: { wire_diameter: newWire },
        changes: [{ parameter: "wire_diameter", from: currentWire, to: newWire }],
        predicted_outcomes: {
          ra_um: {
            value: newWire === "0.30"
              ? this._predictRa(currentPasses, thickness) * 1.15
              : this._predictRa(currentPasses, thickness) * 0.9,
            confidence: 0.75
          },
          cycle_time_min: {
            value: newWire === "0.30"
              ? this._predictCycleTime(currentPasses, thickness) * 0.9
              : this._predictCycleTime(currentPasses, thickness) * 1.1,
            confidence: 0.8
          },
          wire_consumption_m: { value: thickness * 0.02 * currentPasses, confidence: 0.75 },
          risk_score: {
            value: newWire === "0.30" ? 0.15 : 0.25,
            confidence: 0.8
          },
        },
        trade_offs: newWire === "0.30"
          ? ["Faster cutting", "Lower break risk", "Slightly worse Ra", "Larger minimum corner radius"]
          : ["Better Ra potential", "Finer features possible", "Higher break risk", "Slower cutting"],
        recommendation: thickness > 60
          ? "Larger wire recommended for stability"
          : "Smaller wire acceptable if features require it"
      });
    }

    return scenarios;
  }

  /**
   * Generate and rank hypotheses for observed phenomena
   */
  generateHypotheses(observation: string, context?: Record<string, any>): Hypothesis[] {
    const hypotheses: Hypothesis[] = [];
    const observationLower = observation.toLowerCase();

    // Wire break hypotheses
    if (observationLower.includes("wire break") || observationLower.includes("breaks")) {
      hypotheses.push({
        id: "H001",
        statement: "Excessive discharge energy causing wire thermal fatigue",
        confidence: 0.7,
        supporting_evidence: [
          { source: "physics", description: "ON time directly correlates with discharge energy", strength: 0.9 },
          { source: "tribal", description: "wedm-kb-001: reduce ON time before increasing tension", strength: 0.85 },
        ],
        contradicting_evidence: [],
        tests_required: ["Reduce ON time by 15% and observe break frequency"],
        implications: ["If confirmed, also check OFF time ratio"]
      });

      hypotheses.push({
        id: "H002",
        statement: "Inadequate flushing causing debris accumulation",
        confidence: 0.6,
        supporting_evidence: [
          { source: "physics", description: "Debris in gap causes secondary discharge", strength: 0.85 },
          { source: "tribal", description: "wedm-kb-004: flush pressure critical for thick sections", strength: 0.8 },
        ],
        contradicting_evidence: context?.thickness_mm && context.thickness_mm < 30
          ? [{ source: "empirical", description: "Thin sections rarely have flushing issues", strength: 0.7 }]
          : [],
        tests_required: ["Check flush nozzle alignment", "Increase flush pressure to 10 bar"],
        implications: ["If confirmed, check dielectric filter condition"]
      });

      hypotheses.push({
        id: "H003",
        statement: "Wire tension too high for material/thickness",
        confidence: 0.5,
        supporting_evidence: [
          { source: "physics", description: "Over-tension causes fatigue on thermally stressed wire", strength: 0.75 },
        ],
        contradicting_evidence: [
          { source: "tribal", description: "wedm-kb-001: tension is secondary to energy", strength: 0.85 }
        ],
        tests_required: ["Reduce tension by 200g and monitor stability"],
        implications: ["If confirmed, wire quality may also be degraded"]
      });
    }

    // Poor finish hypotheses
    if (observationLower.includes("poor finish") || observationLower.includes("rough surface") || observationLower.includes("ra")) {
      hypotheses.push({
        id: "H010",
        statement: "Water resistivity out of specification",
        confidence: 0.75,
        supporting_evidence: [
          { source: "tribal", description: "wedm-kb-007: check resistivity FIRST for Ra issues", strength: 0.94 },
          { source: "physics", description: "Low resistivity causes irregular discharge craters", strength: 0.9 },
        ],
        contradicting_evidence: [],
        tests_required: ["Check resistivity meter - should be 5-15 MΩ·cm"],
        implications: ["If <3 MΩ·cm, replace deionizing resin"]
      });

      hypotheses.push({
        id: "H011",
        statement: "Insufficient skim passes for target Ra",
        confidence: 0.65,
        supporting_evidence: [
          { source: "tribal", description: "wedm-kb-008: Ra follows Toenshoff energy cascade", strength: 0.91 },
          { source: "physics", description: "Each pass reduces crater size by ~60-70%", strength: 0.85 },
        ],
        contradicting_evidence: [],
        tests_required: ["Add one more skim pass", "Verify E-code selection matches target Ra"],
        implications: ["Consider lapping if Ra target < 0.2µm"]
      });
    }

    // Sort by confidence
    hypotheses.sort((a, b) => b.confidence - a.confidence);

    return hypotheses;
  }

  /**
   * Build multi-step inference chain
   */
  buildInferenceChain(
    goal: string,
    mode: "deductive" | "inductive",
    context?: Record<string, any>
  ): InferenceChain {
    const steps: InferenceStep[] = [];
    const assumptions: string[] = [];

    const thickness = context?.thickness_mm ?? 25;
    const material = context?.material ?? "D2";
    const targetRa = context?.target_ra_um ?? 0.8;

    if (mode === "deductive") {
      // From rules to specific conclusions
      steps.push({
        step: 1,
        premise: `Material is ${material}, thickness is ${thickness}mm`,
        rule_applied: "R003: Cutting speed decreases with thickness",
        conclusion: `Expected cutting speed: ${Math.round(THICKNESS_EFFECTS.cutting_speed_factor(thickness) * 100)}% of baseline`,
        confidence: 0.95,
        dependencies: []
      });

      steps.push({
        step: 2,
        premise: `Target Ra is ${targetRa}µm`,
        rule_applied: "R001: Ra decreases with increasing pass count",
        conclusion: `Minimum passes needed: ${targetRa < 0.3 ? 5 : targetRa < 0.6 ? 4 : 3}`,
        confidence: 0.9,
        dependencies: []
      });

      if (thickness > 50) {
        steps.push({
          step: 3,
          premise: `Thickness ${thickness}mm > 50mm (thick section)`,
          rule_applied: "R004: Flushing efficiency degrades as 1/sqrt(thickness)",
          conclusion: `Flushing efficiency: ${Math.round(THICKNESS_EFFECTS.flushing_efficiency(thickness) * 100)}%`,
          confidence: 0.85,
          dependencies: [1]
        });

        assumptions.push("Machine has adequate flush pressure capacity (8-10 bar)");
      }

      if (material.includes("carbide") || material === "WC") {
        steps.push({
          step: steps.length + 1,
          premise: `Material is carbide (WC)`,
          rule_applied: "R007: Coated wire reduces breaks in carbide",
          conclusion: "Use zinc-coated wire; reduce ON time by 20%",
          confidence: 0.88,
          dependencies: [1]
        });
      }
    } else {
      // Inductive: from observations to rules
      steps.push({
        step: 1,
        premise: "Observed: wire breaks more frequently at thick sections",
        rule_applied: "Pattern recognition from JM Die programs",
        conclusion: "Wire break risk correlates with thickness",
        confidence: 0.85,
        dependencies: []
      });

      steps.push({
        step: 2,
        premise: "Observed: JM Die uses E12xx with F0.06 for closely-spaced features",
        rule_applied: "Pattern extraction from wedm-jmd-008",
        conclusion: "Closely-spaced features require slower rough feed to prevent debris interference",
        confidence: 0.92,
        dependencies: []
      });
    }

    // Calculate chain confidence (product of step confidences)
    const chainConfidence = steps.reduce((acc, s) => acc * s.confidence, 1);

    // Build final conclusion
    const conclusions = steps.map(s => s.conclusion);
    const finalConclusion = mode === "deductive"
      ? `For ${material} at ${thickness}mm targeting Ra ${targetRa}µm: ${conclusions.slice(-2).join("; ")}`
      : `Inferred rules from observations: ${conclusions.join("; ")}`;

    return {
      goal,
      steps,
      final_conclusion: finalConclusion,
      overall_confidence: chainConfidence,
      assumptions,
      potential_flaws: mode === "inductive"
        ? ["Sample size may be limited", "Correlation may not imply causation"]
        : ["Assumes standard machine configuration", "Rules may have exceptions"]
    };
  }

  /**
   * Constraint satisfaction solving
   */
  solveConstraints(requirements: Record<string, any>): ConstraintSolution {
    const constraints: Constraint[] = [];
    const parameters: Record<string, number> = {};

    // Extract targets
    const targetRa = requirements.target_ra_um ?? 0.8;
    const maxCycleTime = requirements.max_cycle_time_min ?? 60;
    const maxWireConsumption = requirements.max_wire_consumption_m ?? 10;
    const thickness = requirements.thickness_mm ?? 25;

    // Build constraints
    constraints.push({
      name: "Ra target",
      type: "hard",
      expression: `Ra <= ${targetRa}`,
      current_value: this._predictRa(4, thickness),
      limit: targetRa,
      satisfied: this._predictRa(4, thickness) <= targetRa
    });

    constraints.push({
      name: "Cycle time limit",
      type: "soft",
      expression: `cycle_time <= ${maxCycleTime}`,
      current_value: this._predictCycleTime(4, thickness),
      limit: maxCycleTime,
      satisfied: this._predictCycleTime(4, thickness) <= maxCycleTime,
      slack: maxCycleTime - this._predictCycleTime(4, thickness)
    });

    constraints.push({
      name: "Wire consumption",
      type: "soft",
      expression: `wire_m <= ${maxWireConsumption}`,
      current_value: thickness * 0.02 * 4,
      limit: maxWireConsumption,
      satisfied: thickness * 0.02 * 4 <= maxWireConsumption,
      slack: maxWireConsumption - thickness * 0.02 * 4
    });

    // Solve - find pass count that satisfies Ra constraint
    let optimalPasses = 3;
    for (let p = 3; p <= 6; p++) {
      if (this._predictRa(p, thickness) <= targetRa) {
        optimalPasses = p;
        break;
      }
    }

    parameters.num_passes = optimalPasses;
    parameters.on_time_us = 3 + thickness * 0.05;
    parameters.off_time_us = 12 + thickness * 0.1;
    parameters.wire_tension_g = thickness < 30 ? 1200 : thickness < 60 ? 1400 : 1600;

    // Check feasibility
    const violated = constraints.filter(c => !c.satisfied && c.type === "hard");
    const feasible = violated.length === 0;

    // Generate alternatives if not feasible
    const alternatives = [];
    if (!feasible) {
      alternatives.push({
        parameters: { ...parameters, num_passes: optimalPasses + 1 },
        score: 0.7,
        trade_off: "Add one more pass to meet Ra target"
      });
    }

    return {
      feasible,
      parameters,
      constraints_satisfied: constraints.filter(c => c.satisfied),
      constraints_violated: constraints.filter(c => !c.satisfied),
      optimization_score: feasible ? 0.85 : 0.5,
      alternatives
    };
  }

  /**
   * Decision tree analysis
   */
  analyzeDecision(question: string, context?: Record<string, any>): DecisionAnalysis {
    const thickness = context?.thickness_mm ?? 25;

    const root: DecisionNode = {
      id: "D1",
      question: "What is the workpiece thickness?",
      criteria: "thickness_mm",
      branches: [
        {
          condition: "< 30mm (thin)",
          probability: 0.4,
          outcome: {
            id: "D1.1",
            question: "What is Ra target?",
            criteria: "target_ra_um",
            branches: [
              { condition: "< 0.4µm", probability: 0.3, outcome: "Use 5-pass ACU strategy" },
              { condition: ">= 0.4µm", probability: 0.7, outcome: "Use 4-pass standard strategy" }
            ]
          }
        },
        {
          condition: "30-60mm (medium)",
          probability: 0.4,
          outcome: {
            id: "D1.2",
            question: "Is this carbide?",
            criteria: "material",
            branches: [
              { condition: "Yes", probability: 0.2, outcome: "Use coated wire + 20% reduced ON time" },
              { condition: "No", probability: 0.8, outcome: "Use standard 4-5 pass strategy with 10 bar flush" }
            ]
          }
        },
        {
          condition: "> 60mm (thick)",
          probability: 0.2,
          outcome: "Use 0.30mm wire, submerged cutting, stress relief before WEDM"
        }
      ]
    };

    // Determine optimal path based on context
    const optimalPath: string[] = [];
    if (thickness < 30) {
      optimalPath.push("< 30mm (thin)");
      optimalPath.push(context?.target_ra_um && context.target_ra_um < 0.4 ? "< 0.4µm" : ">= 0.4µm");
    } else if (thickness <= 60) {
      optimalPath.push("30-60mm (medium)");
      optimalPath.push(context?.material?.includes("carbide") ? "Yes" : "No");
    } else {
      optimalPath.push("> 60mm (thick)");
    }

    return {
      root,
      optimal_path: optimalPath,
      expected_outcomes: {
        success_probability: 0.85,
        expected_ra_um: this._predictRa(4, thickness),
        expected_cycle_time_min: this._predictCycleTime(4, thickness)
      },
      sensitivity_analysis: [
        { parameter: "thickness_mm", impact: "high", threshold: 50 },
        { parameter: "target_ra_um", impact: "high", threshold: 0.4 },
        { parameter: "material", impact: "medium", threshold: 0 }
      ]
    };
  }

  /**
   * Test a specific hypothesis against evidence
   */
  testHypothesis(hypothesis: Hypothesis, new_evidence?: Evidence[]): {
    updated_confidence: number;
    verdict: "supported" | "refuted" | "inconclusive";
    reasoning: string;
  } {
    let confidence = hypothesis.confidence;

    // Bayesian update with new evidence
    if (new_evidence) {
      for (const e of new_evidence) {
        if (e.strength > 0.5) {
          // Supporting evidence increases confidence
          confidence = confidence + (1 - confidence) * e.strength * 0.3;
        } else {
          // Contradicting evidence decreases confidence
          confidence = confidence * (1 - (0.5 - e.strength) * 0.5);
        }
      }
    }

    // Add existing evidence
    const supportStrength = hypothesis.supporting_evidence.reduce((s, e) => s + e.strength, 0);
    const contradictStrength = hypothesis.contradicting_evidence.reduce((s, e) => s + e.strength, 0);

    const netEvidence = supportStrength - contradictStrength;

    let verdict: "supported" | "refuted" | "inconclusive";
    let reasoning: string;

    if (confidence > 0.7 && netEvidence > 0.5) {
      verdict = "supported";
      reasoning = `Strong supporting evidence (${hypothesis.supporting_evidence.length} sources) with high confidence`;
    } else if (confidence < 0.3 || netEvidence < -0.3) {
      verdict = "refuted";
      reasoning = `Contradicting evidence outweighs support`;
    } else {
      verdict = "inconclusive";
      reasoning = `Need more evidence - recommend tests: ${hypothesis.tests_required.join(", ")}`;
    }

    return { updated_confidence: confidence, verdict, reasoning };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private _detectLogicMode(query: string): LogicMode {
    const q = query.toLowerCase();

    if (q.includes("what if") || q.includes("would happen") || q.includes("alternative")) {
      return "counterfactual";
    }
    if (q.includes("why") || q.includes("cause") || q.includes("explain")) {
      return "abductive";
    }
    if (q.includes("constraint") || q.includes("limit") || q.includes("must") || q.includes("within")) {
      return "constraint";
    }
    if (q.includes("decide") || q.includes("choose") || q.includes("which") || q.includes("should")) {
      return "decision";
    }
    if (q.includes("observe") || q.includes("pattern") || q.includes("learn from")) {
      return "inductive";
    }

    return "deductive";
  }

  private _predictRa(passes: number, thickness: number): number {
    // Toenshoff model: Ra_n = Ra_rough × 0.25^(n-1)
    const raRough = 2.7 + thickness * 0.01;
    const raPredicted = raRough * Math.pow(0.35, passes - 1);
    return Math.round(raPredicted * 100) / 100;
  }

  private _predictCycleTime(passes: number, thickness: number): number {
    // Base time + per-pass time
    const baseTime = thickness * 0.4;
    const passTime = passes * (baseTime / 3);
    return Math.round((baseTime + passTime) * 10) / 10;
  }

  private _summarizeCounterfactuals(scenarios: CounterfactualScenario[]): string {
    if (scenarios.length === 0) return "No counterfactual scenarios analyzed";

    const recommendations = scenarios
      .filter(s => s.recommendation.includes("Recommended"))
      .map(s => `${s.changes[0].parameter}: ${s.changes[0].from} → ${s.changes[0].to}`);

    if (recommendations.length > 0) {
      return `Recommended changes: ${recommendations.join("; ")}`;
    }

    return `Analyzed ${scenarios.length} scenarios - current parameters appear optimal`;
  }

  private _selectBestHypothesis(hypotheses: Hypothesis[]): string {
    if (hypotheses.length === 0) return "No hypotheses generated";

    const best = hypotheses[0];
    return `Most likely: ${best.statement} (${Math.round(best.confidence * 100)}% confidence). Tests: ${best.tests_required.join(", ")}`;
  }

  private _calculateConfidence(result: Partial<LogicResult>): number {
    let confidence = 0.7;

    if (result.hypotheses && result.hypotheses.length > 0) {
      confidence = result.hypotheses[0].confidence;
    }
    if (result.inference_chain) {
      confidence = result.inference_chain.overall_confidence;
    }
    if (result.constraint_solution) {
      confidence = result.constraint_solution.feasible ? 0.85 : 0.5;
    }

    return Math.round(confidence * 100) / 100;
  }

  private _identifyKnowledgeGaps(query: string, context?: Record<string, any>): string[] {
    const gaps: string[] = [];

    if (!context?.material) {
      gaps.push("Material not specified - assuming D2 tool steel");
    }
    if (!context?.thickness_mm) {
      gaps.push("Thickness not specified - using default 25mm");
    }
    if (context?.material?.includes("exotic") || context?.material?.includes("titanium")) {
      gaps.push("Limited tech file data for this material");
    }

    return gaps;
  }
}

// Export singleton
export const wireEDMDeepLogicEngine = new WireEDMDeepLogicEngine();
