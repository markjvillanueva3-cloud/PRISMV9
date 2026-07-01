/**
 * DecisionReasoningEngine — Multi-Criteria Decision Making for PRISM
 * ===================================================================
 * Provides intelligent selection and decision-making capabilities:
 *   - Machine selection based on capability matching
 *   - Tool selection with material/operation compatibility
 *   - Tool holder selection with reach/rigidity optimization
 *   - Fixture selection for workholding requirements
 *   - Material selection based on properties and cost
 *   - Multi-criteria weighted decision analysis (MCDA)
 *   - Pareto-optimal solution identification
 *
 * Uses techniques from operations research and AI decision theory
 * to make defensible, explainable selections.
 *
 * @module engines/DecisionReasoningEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Decision category */
export type DecisionCategory =
  | "machine"
  | "tool"
  | "holder"
  | "fixture"
  | "material"
  | "operation"
  | "strategy"
  | "supplier"
  | "investment";

/** Criterion importance */
export type CriterionImportance = "critical" | "high" | "medium" | "low";

/** Decision criterion */
export interface DecisionCriterion {
  id: string;
  name: string;
  description: string;
  importance: CriterionImportance;
  weight: number;  // 0-1, normalized
  type: "maximize" | "minimize" | "target" | "threshold";
  target_value?: number;
  min_threshold?: number;
  max_threshold?: number;
  unit?: string;
}

/** Candidate option for decision */
export interface DecisionCandidate {
  id: string;
  name: string;
  category: DecisionCategory;
  properties: Record<string, number | string | boolean>;
  scores: Record<string, number>;  // Criterion ID -> raw score
  normalized_scores: Record<string, number>;  // 0-1 normalized
  weighted_score?: number;
  rank?: number;
  notes?: string[];
  disqualified?: boolean;
  disqualification_reason?: string;
}

/** Decision problem */
export interface DecisionProblem {
  problem_id: string;
  category: DecisionCategory;
  description: string;
  context: DecisionContext;
  criteria: DecisionCriterion[];
  candidates: DecisionCandidate[];
  constraints: DecisionConstraint[];
}

/** Decision context */
export interface DecisionContext {
  material?: string;
  operation?: string;
  tolerance?: number;
  surface_finish?: number;
  volume?: number;
  batch_size?: number;
  deadline?: string;
  budget?: number;
  available_machines?: string[];
  shop_capabilities?: string[];
  [key: string]: unknown;
}

/** Decision constraint (hard requirement) */
export interface DecisionConstraint {
  criterion_id: string;
  type: "min" | "max" | "exact" | "in_set";
  value: number | string | string[];
  is_hard: boolean;  // Hard = disqualify, Soft = penalize
  penalty_weight?: number;  // For soft constraints
}

/** Decision recommendation */
export interface DecisionRecommendation {
  problem_id: string;
  recommended: DecisionCandidate;
  alternatives: DecisionCandidate[];
  pareto_optimal: DecisionCandidate[];
  reasoning: DecisionReasoning;
  confidence: number;
  sensitivity: SensitivityAnalysis;
}

/** Decision reasoning trace */
export interface DecisionReasoning {
  approach: string;
  criterion_analysis: Array<{
    criterion: string;
    winner: string;
    margin: number;
    decisive: boolean;
  }>;
  tradeoffs_considered: string[];
  risks_identified: string[];
  assumptions: string[];
  explanation: string;
}

/** Sensitivity analysis */
export interface SensitivityAnalysis {
  robust: boolean;
  critical_criteria: string[];
  weight_sensitivity: Array<{
    criterion: string;
    current_weight: number;
    threshold_to_change: number;  // Weight change that would change winner
  }>;
  close_alternatives: DecisionCandidate[];
}

// ============================================================================
// MACHINE SELECTION TYPES
// ============================================================================

/** Machine capability profile */
export interface MachineCapability {
  id: string;
  name: string;
  type: "lathe" | "mill" | "mill_turn" | "edm_sinker" | "edm_wire" | "grinder" | "5axis";
  work_envelope: {
    x_travel: number;
    y_travel: number;
    z_travel: number;
    max_diameter?: number;  // For lathes
    max_length?: number;
  };
  spindle: {
    max_rpm: number;
    power_kw: number;
    torque_nm: number;
  };
  accuracy: {
    positioning: number;
    repeatability: number;
  };
  tool_capacity: number;
  hourly_rate: number;
  availability: number;  // 0-1
  capabilities: string[];  // e.g., "live_tooling", "y_axis", "sub_spindle"
}

/** Machine selection requirements */
export interface MachineRequirements {
  part_size: { x: number; y: number; z: number };
  operation_types: string[];
  required_accuracy: number;
  required_rpm?: number;
  required_power?: number;
  required_capabilities?: string[];
  preferred_machines?: string[];
  exclude_machines?: string[];
}

// ============================================================================
// TOOL SELECTION TYPES
// ============================================================================

/** Tool capability profile */
export interface ToolCapability {
  id: string;
  name: string;
  type: "endmill" | "drill" | "tap" | "insert" | "reamer" | "boring_bar";
  diameter: number;
  flute_count: number;
  coating: string;
  substrate: string;
  max_depth: number;
  recommended_materials: string[];
  cutting_data: {
    vc_min: number;
    vc_max: number;
    fz_min: number;
    fz_max: number;
    ap_max: number;
    ae_max: number;
  };
  cost: number;
  tool_life_minutes: number;
}

/** Tool selection requirements */
export interface ToolRequirements {
  operation: "roughing" | "finishing" | "drilling" | "threading" | "boring";
  material: string;
  feature_diameter?: number;
  feature_depth?: number;
  required_surface_finish?: number;
  required_tolerance?: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class DecisionReasoningEngine {
  private static readonly IMPORTANCE_WEIGHTS: Record<CriterionImportance, number> = {
    critical: 1.0,
    high: 0.75,
    medium: 0.5,
    low: 0.25,
  };

  /**
   * Make a multi-criteria decision
   */
  static decide(problem: DecisionProblem): DecisionRecommendation {
    log.info("[DecisionReasoning] Starting decision analysis", {
      problem_id: problem.problem_id,
      category: problem.category,
      candidates: problem.candidates.length,
      criteria: problem.criteria.length,
    });

    // Step 1: Apply constraints (disqualify candidates that fail hard constraints)
    const qualified = this.applyConstraints(problem.candidates, problem.constraints);

    if (qualified.length === 0) {
      log.warn("[DecisionReasoning] No candidates meet constraints");
      // Return best non-qualified with explanation
      const best = problem.candidates[0];
      return {
        problem_id: problem.problem_id,
        recommended: best,
        alternatives: [],
        pareto_optimal: [],
        reasoning: {
          approach: "No candidates qualified",
          criterion_analysis: [],
          tradeoffs_considered: [],
          risks_identified: ["No candidates meet minimum requirements"],
          assumptions: [],
          explanation: "All candidates failed to meet one or more hard constraints.",
        },
        confidence: 0.1,
        sensitivity: {
          robust: false,
          critical_criteria: [],
          weight_sensitivity: [],
          close_alternatives: [],
        },
      };
    }

    // Step 2: Normalize scores for each criterion
    const normalized = this.normalizeScores(qualified, problem.criteria);

    // Step 3: Calculate weighted scores
    const scored = this.calculateWeightedScores(normalized, problem.criteria);

    // Step 4: Rank candidates
    const ranked = this.rankCandidates(scored);

    // Step 5: Find Pareto-optimal set
    const paretoOptimal = this.findParetoOptimal(ranked, problem.criteria);

    // Step 6: Perform sensitivity analysis
    const sensitivity = this.analyzeSensitivity(ranked, problem.criteria);

    // Step 7: Generate reasoning
    const reasoning = this.generateReasoning(ranked, problem);

    const recommended = ranked[0];
    const alternatives = ranked.slice(1, 4);  // Top 3 alternatives

    log.info("[DecisionReasoning] Decision complete", {
      recommended: recommended.name,
      score: recommended.weighted_score,
      pareto_optimal_count: paretoOptimal.length,
    });

    return {
      problem_id: problem.problem_id,
      recommended,
      alternatives,
      pareto_optimal: paretoOptimal,
      reasoning,
      confidence: this.calculateConfidence(ranked, sensitivity),
      sensitivity,
    };
  }

  /**
   * Select best machine for a job
   */
  static selectMachine(
    requirements: MachineRequirements,
    machines: MachineCapability[],
    context: DecisionContext = {}
  ): DecisionRecommendation {
    const criteria = this.buildMachineCriteria(requirements, context);
    const candidates = this.evaluateMachines(requirements, machines, criteria);

    const problem: DecisionProblem = {
      problem_id: `machine-${Date.now()}`,
      category: "machine",
      description: "Select optimal machine for operation",
      context,
      criteria,
      candidates,
      constraints: this.buildMachineConstraints(requirements, machines),
    };

    return this.decide(problem);
  }

  /**
   * Select best tool for an operation
   */
  static selectTool(
    requirements: ToolRequirements,
    tools: ToolCapability[],
    context: DecisionContext = {}
  ): DecisionRecommendation {
    const criteria = this.buildToolCriteria(requirements, context);
    const candidates = this.evaluateTools(requirements, tools, criteria);

    const problem: DecisionProblem = {
      problem_id: `tool-${Date.now()}`,
      category: "tool",
      description: `Select optimal tool for ${requirements.operation}`,
      context: { ...context, ...requirements },
      criteria,
      candidates,
      constraints: this.buildToolConstraints(requirements),
    };

    return this.decide(problem);
  }

  /**
   * Select tool holder for tool/machine combination
   */
  static selectHolder(
    tool: ToolCapability,
    machine: MachineCapability,
    reachRequired: number,
    rigidityPriority: number = 0.7,  // 0-1, higher = more important
    availableHolders: Array<{
      id: string;
      name: string;
      type: "collet" | "shrink_fit" | "hydraulic" | "milling_chuck" | "weldon";
      gauge_length: number;
      runout: number;
      max_rpm: number;
      cost: number;
      clamping_force: number;
    }>
  ): DecisionRecommendation {
    const criteria: DecisionCriterion[] = [
      {
        id: "rigidity",
        name: "Rigidity/Clamping Force",
        description: "Higher clamping force = more rigidity",
        importance: rigidityPriority > 0.6 ? "critical" : "high",
        weight: rigidityPriority * 0.4,
        type: "maximize",
      },
      {
        id: "runout",
        name: "Runout",
        description: "Lower runout = better accuracy",
        importance: "high",
        weight: 0.25,
        type: "minimize",
      },
      {
        id: "reach",
        name: "Reach Adequacy",
        description: "Must reach required depth",
        importance: "critical",
        weight: 0.2,
        type: "threshold",
        min_threshold: reachRequired,
      },
      {
        id: "cost",
        name: "Cost",
        description: "Lower cost preferred",
        importance: "medium",
        weight: 0.15,
        type: "minimize",
      },
    ];

    const candidates: DecisionCandidate[] = availableHolders.map(h => ({
      id: h.id,
      name: h.name,
      category: "holder" as const,
      properties: {
        type: h.type,
        gauge_length: h.gauge_length,
        runout: h.runout,
        max_rpm: h.max_rpm,
        cost: h.cost,
        clamping_force: h.clamping_force,
      },
      scores: {
        rigidity: h.clamping_force,
        runout: h.runout,
        reach: h.gauge_length + tool.max_depth,
        cost: h.cost,
      },
      normalized_scores: {},
    }));

    const problem: DecisionProblem = {
      problem_id: `holder-${Date.now()}`,
      category: "holder",
      description: `Select holder for ${tool.name}`,
      context: { tool: tool.name, machine: machine.name, reach_required: reachRequired },
      criteria,
      candidates,
      constraints: [
        {
          criterion_id: "reach",
          type: "min",
          value: reachRequired,
          is_hard: true,
        },
        {
          criterion_id: "max_rpm",
          type: "min",
          value: machine.spindle.max_rpm * 0.8,  // 80% of max
          is_hard: false,
          penalty_weight: 0.3,
        },
      ],
    };

    return this.decide(problem);
  }

  /**
   * Select fixture/workholding solution
   */
  static selectFixture(
    partGeometry: {
      length: number;
      width: number;
      height: number;
      weight: number;
      material: string;
    },
    operations: string[],
    cuttingForces: { max_fx: number; max_fy: number; max_fz: number },
    availableFixtures: Array<{
      id: string;
      name: string;
      type: "vise" | "chuck" | "fixture_plate" | "vacuum" | "custom";
      clamping_force: number;
      work_envelope: { x: number; y: number; z: number };
      setup_time_minutes: number;
      cost_per_use: number;
      repeatability: number;
    }>
  ): DecisionRecommendation {
    const requiredClampingForce = Math.sqrt(
      cuttingForces.max_fx ** 2 + cuttingForces.max_fy ** 2 + cuttingForces.max_fz ** 2
    ) * 3;  // 3x safety factor

    const criteria: DecisionCriterion[] = [
      {
        id: "clamping",
        name: "Clamping Force",
        description: "Must exceed cutting forces with safety margin",
        importance: "critical",
        weight: 0.35,
        type: "maximize",
      },
      {
        id: "setup_time",
        name: "Setup Time",
        description: "Faster setup = more productive",
        importance: "high",
        weight: 0.25,
        type: "minimize",
      },
      {
        id: "repeatability",
        name: "Repeatability",
        description: "Better repeatability = consistent parts",
        importance: "high",
        weight: 0.2,
        type: "minimize",  // Lower number = better
      },
      {
        id: "cost",
        name: "Cost per Use",
        description: "Lower cost preferred",
        importance: "medium",
        weight: 0.2,
        type: "minimize",
      },
    ];

    const candidates: DecisionCandidate[] = availableFixtures
      .filter(f =>
        f.work_envelope.x >= partGeometry.length &&
        f.work_envelope.y >= partGeometry.width &&
        f.work_envelope.z >= partGeometry.height
      )
      .map(f => ({
        id: f.id,
        name: f.name,
        category: "fixture" as const,
        properties: {
          type: f.type,
          clamping_force: f.clamping_force,
          setup_time: f.setup_time_minutes,
          repeatability: f.repeatability,
          cost: f.cost_per_use,
        },
        scores: {
          clamping: f.clamping_force,
          setup_time: f.setup_time_minutes,
          repeatability: f.repeatability,
          cost: f.cost_per_use,
        },
        normalized_scores: {},
      }));

    const problem: DecisionProblem = {
      problem_id: `fixture-${Date.now()}`,
      category: "fixture",
      description: "Select workholding for part",
      context: { ...partGeometry, operations },
      criteria,
      candidates,
      constraints: [
        {
          criterion_id: "clamping",
          type: "min",
          value: requiredClampingForce,
          is_hard: true,
        },
      ],
    };

    return this.decide(problem);
  }

  /**
   * Select material based on requirements
   */
  static selectMaterial(
    requirements: {
      hardness_min?: number;
      hardness_max?: number;
      tensile_strength_min?: number;
      machinability_min?: number;
      corrosion_resistance?: boolean;
      heat_treatment?: string;
      cost_priority?: number;  // 0-1
    },
    availableMaterials: Array<{
      id: string;
      name: string;
      grade: string;
      hardness_hrc: number;
      tensile_strength_mpa: number;
      machinability_index: number;
      corrosion_resistant: boolean;
      cost_per_kg: number;
      lead_time_days: number;
    }>
  ): DecisionRecommendation {
    const costWeight = requirements.cost_priority ?? 0.3;

    const criteria: DecisionCriterion[] = [
      {
        id: "hardness",
        name: "Hardness",
        description: "Target hardness range",
        importance: "high",
        weight: 0.25,
        type: "target",
        target_value: requirements.hardness_min
          ? (requirements.hardness_min + (requirements.hardness_max ?? requirements.hardness_min)) / 2
          : undefined,
      },
      {
        id: "strength",
        name: "Tensile Strength",
        description: "Minimum tensile strength required",
        importance: "high",
        weight: 0.25,
        type: "maximize",
        min_threshold: requirements.tensile_strength_min,
      },
      {
        id: "machinability",
        name: "Machinability",
        description: "Higher = easier to machine",
        importance: "medium",
        weight: 0.2,
        type: "maximize",
      },
      {
        id: "cost",
        name: "Cost",
        description: "Material cost per kg",
        importance: costWeight > 0.5 ? "high" : "medium",
        weight: costWeight,
        type: "minimize",
      },
      {
        id: "lead_time",
        name: "Lead Time",
        description: "Days to receive material",
        importance: "low",
        weight: 0.1,
        type: "minimize",
      },
    ];

    const candidates: DecisionCandidate[] = availableMaterials.map(m => ({
      id: m.id,
      name: `${m.name} (${m.grade})`,
      category: "material" as const,
      properties: {
        grade: m.grade,
        hardness: m.hardness_hrc,
        strength: m.tensile_strength_mpa,
        machinability: m.machinability_index,
        corrosion_resistant: m.corrosion_resistant,
        cost: m.cost_per_kg,
        lead_time: m.lead_time_days,
      },
      scores: {
        hardness: m.hardness_hrc,
        strength: m.tensile_strength_mpa,
        machinability: m.machinability_index,
        cost: m.cost_per_kg,
        lead_time: m.lead_time_days,
      },
      normalized_scores: {},
    }));

    const constraints: DecisionConstraint[] = [];

    if (requirements.hardness_min) {
      constraints.push({
        criterion_id: "hardness",
        type: "min",
        value: requirements.hardness_min,
        is_hard: true,
      });
    }
    if (requirements.hardness_max) {
      constraints.push({
        criterion_id: "hardness",
        type: "max",
        value: requirements.hardness_max,
        is_hard: true,
      });
    }
    if (requirements.tensile_strength_min) {
      constraints.push({
        criterion_id: "strength",
        type: "min",
        value: requirements.tensile_strength_min,
        is_hard: true,
      });
    }
    if (requirements.machinability_min) {
      constraints.push({
        criterion_id: "machinability",
        type: "min",
        value: requirements.machinability_min,
        is_hard: false,
        penalty_weight: 0.2,
      });
    }

    const problem: DecisionProblem = {
      problem_id: `material-${Date.now()}`,
      category: "material",
      description: "Select material for application",
      context: requirements,
      criteria,
      candidates,
      constraints,
    };

    return this.decide(problem);
  }

  /**
   * Compare options side-by-side
   */
  static compareOptions(
    options: DecisionCandidate[],
    criteria: DecisionCriterion[]
  ): {
    comparison_matrix: Array<{
      criterion: string;
      scores: Record<string, { raw: number; normalized: number }>;
      winner: string;
      margin: number;
    }>;
    overall_ranking: Array<{ option: string; score: number; rank: number }>;
    tradeoff_summary: string[];
  } {
    const normalized = this.normalizeScores(options, criteria);
    const scored = this.calculateWeightedScores(normalized, criteria);
    const ranked = this.rankCandidates(scored);

    const comparison_matrix = criteria.map(crit => {
      const scores: Record<string, { raw: number; normalized: number }> = {};
      let best = { name: "", value: -Infinity };
      let second = { value: -Infinity };

      for (const opt of normalized) {
        const raw = opt.scores[crit.id] ?? 0;
        const norm = opt.normalized_scores[crit.id] ?? 0;
        scores[opt.name] = { raw, normalized: norm };

        const effectiveValue = crit.type === "minimize" ? -norm : norm;
        if (effectiveValue > best.value) {
          second = { value: best.value };
          best = { name: opt.name, value: effectiveValue };
        } else if (effectiveValue > second.value) {
          second = { value: effectiveValue };
        }
      }

      return {
        criterion: crit.name,
        scores,
        winner: best.name,
        margin: best.value - second.value,
      };
    });

    const overall_ranking = ranked.map((opt, i) => ({
      option: opt.name,
      score: opt.weighted_score ?? 0,
      rank: i + 1,
    }));

    const tradeoff_summary = this.identifyTradeoffs(ranked, criteria);

    return { comparison_matrix, overall_ranking, tradeoff_summary };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private static applyConstraints(
    candidates: DecisionCandidate[],
    constraints: DecisionConstraint[]
  ): DecisionCandidate[] {
    return candidates.map(c => {
      const candidate = { ...c, disqualified: false };

      for (const constraint of constraints) {
        const score = candidate.scores[constraint.criterion_id];
        if (score === undefined) continue;

        let passes = true;
        switch (constraint.type) {
          case "min":
            passes = score >= (constraint.value as number);
            break;
          case "max":
            passes = score <= (constraint.value as number);
            break;
          case "exact":
            passes = score === constraint.value;
            break;
          case "in_set":
            passes = (constraint.value as string[]).includes(String(score));
            break;
        }

        if (!passes) {
          if (constraint.is_hard) {
            candidate.disqualified = true;
            candidate.disqualification_reason = `Failed constraint: ${constraint.criterion_id} ${constraint.type} ${constraint.value}`;
            break;
          }
          // Soft constraint: will be penalized in scoring
        }
      }

      return candidate;
    }).filter(c => !c.disqualified);
  }

  private static normalizeScores(
    candidates: DecisionCandidate[],
    criteria: DecisionCriterion[]
  ): DecisionCandidate[] {
    for (const crit of criteria) {
      const values = candidates.map(c => c.scores[crit.id] ?? 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      for (const candidate of candidates) {
        const raw = candidate.scores[crit.id] ?? 0;
        let normalized: number;

        if (crit.type === "target" && crit.target_value !== undefined) {
          // Distance from target (0 = on target, 1 = furthest)
          const maxDist = Math.max(
            Math.abs(max - crit.target_value),
            Math.abs(min - crit.target_value)
          );
          normalized = maxDist > 0 ? 1 - Math.abs(raw - crit.target_value) / maxDist : 1;
        } else {
          normalized = (raw - min) / range;
        }

        candidate.normalized_scores[crit.id] = normalized;
      }
    }

    return candidates;
  }

  private static calculateWeightedScores(
    candidates: DecisionCandidate[],
    criteria: DecisionCriterion[]
  ): DecisionCandidate[] {
    // Normalize weights
    const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

    for (const candidate of candidates) {
      let weightedScore = 0;

      for (const crit of criteria) {
        const normalizedWeight = crit.weight / totalWeight;
        let score = candidate.normalized_scores[crit.id] ?? 0;

        // For minimize criteria, invert the score
        if (crit.type === "minimize") {
          score = 1 - score;
        }

        weightedScore += score * normalizedWeight;
      }

      candidate.weighted_score = weightedScore;
    }

    return candidates;
  }

  private static rankCandidates(candidates: DecisionCandidate[]): DecisionCandidate[] {
    const sorted = [...candidates].sort(
      (a, b) => (b.weighted_score ?? 0) - (a.weighted_score ?? 0)
    );

    sorted.forEach((c, i) => { c.rank = i + 1; });

    return sorted;
  }

  private static findParetoOptimal(
    candidates: DecisionCandidate[],
    criteria: DecisionCriterion[]
  ): DecisionCandidate[] {
    const paretoOptimal: DecisionCandidate[] = [];

    for (const candidate of candidates) {
      let isDominated = false;

      for (const other of candidates) {
        if (other.id === candidate.id) continue;

        // Check if 'other' dominates 'candidate'
        let dominatesOnAll = true;
        let betterOnAtLeastOne = false;

        for (const crit of criteria) {
          const candScore = candidate.normalized_scores[crit.id] ?? 0;
          const otherScore = other.normalized_scores[crit.id] ?? 0;

          const candEffective = crit.type === "minimize" ? -candScore : candScore;
          const otherEffective = crit.type === "minimize" ? -otherScore : otherScore;

          if (otherEffective < candEffective) {
            dominatesOnAll = false;
          }
          if (otherEffective > candEffective) {
            betterOnAtLeastOne = true;
          }
        }

        if (dominatesOnAll && betterOnAtLeastOne) {
          isDominated = true;
          break;
        }
      }

      if (!isDominated) {
        paretoOptimal.push(candidate);
      }
    }

    return paretoOptimal;
  }

  private static analyzeSensitivity(
    ranked: DecisionCandidate[],
    criteria: DecisionCriterion[]
  ): SensitivityAnalysis {
    if (ranked.length < 2) {
      return {
        robust: true,
        critical_criteria: [],
        weight_sensitivity: [],
        close_alternatives: [],
      };
    }

    const winner = ranked[0];
    const runnerUp = ranked[1];
    const scoreDiff = (winner.weighted_score ?? 0) - (runnerUp.weighted_score ?? 0);

    // Find criteria where changing weights could flip the decision
    const weight_sensitivity: Array<{
      criterion: string;
      current_weight: number;
      threshold_to_change: number;
    }> = [];

    for (const crit of criteria) {
      const winnerScore = winner.normalized_scores[crit.id] ?? 0;
      const runnerUpScore = runnerUp.normalized_scores[crit.id] ?? 0;
      const critDiff = (crit.type === "minimize" ? -1 : 1) * (runnerUpScore - winnerScore);

      if (critDiff > 0) {
        // Runner-up is better on this criterion
        const thresholdChange = scoreDiff / critDiff;
        weight_sensitivity.push({
          criterion: crit.name,
          current_weight: crit.weight,
          threshold_to_change: crit.weight + thresholdChange,
        });
      }
    }

    // Find close alternatives (within 10% of winner)
    const close_alternatives = ranked.filter(
      c => c.id !== winner.id &&
        (c.weighted_score ?? 0) >= (winner.weighted_score ?? 0) * 0.9
    );

    // Critical criteria: where top candidates differ significantly
    const critical_criteria = criteria
      .filter(crit => {
        const diff = Math.abs(
          (winner.normalized_scores[crit.id] ?? 0) -
          (runnerUp.normalized_scores[crit.id] ?? 0)
        );
        return diff > 0.3;
      })
      .map(c => c.name);

    return {
      robust: scoreDiff > 0.1 && close_alternatives.length === 0,
      critical_criteria,
      weight_sensitivity,
      close_alternatives,
    };
  }

  private static generateReasoning(
    ranked: DecisionCandidate[],
    problem: DecisionProblem
  ): DecisionReasoning {
    const winner = ranked[0];
    const criteria = problem.criteria;

    const criterion_analysis = criteria.map(crit => {
      let best = { name: "", score: -Infinity };
      for (const c of ranked) {
        const score = c.normalized_scores[crit.id] ?? 0;
        const effective = crit.type === "minimize" ? 1 - score : score;
        if (effective > best.score) {
          best = { name: c.name, score: effective };
        }
      }

      const winnerScore = winner.normalized_scores[crit.id] ?? 0;
      const winnerEffective = crit.type === "minimize" ? 1 - winnerScore : winnerScore;

      return {
        criterion: crit.name,
        winner: best.name,
        margin: best.score - (ranked[1]?.normalized_scores[crit.id] ?? 0),
        decisive: best.score > 0.8 && crit.importance === "critical",
      };
    });

    const tradeoffs = this.identifyTradeoffs(ranked, criteria);

    const explanation = this.generateExplanation(winner, ranked, criteria);

    return {
      approach: "Multi-Criteria Decision Analysis (MCDA) with weighted scoring",
      criterion_analysis,
      tradeoffs_considered: tradeoffs,
      risks_identified: this.identifyRisks(winner, problem),
      assumptions: [
        "Criterion weights reflect true importance",
        "Scores are accurate and up-to-date",
        "All relevant criteria have been considered",
      ],
      explanation,
    };
  }

  private static identifyTradeoffs(
    ranked: DecisionCandidate[],
    criteria: DecisionCriterion[]
  ): string[] {
    const tradeoffs: string[] = [];
    const winner = ranked[0];

    if (ranked.length < 2) return tradeoffs;

    for (const alt of ranked.slice(1, 3)) {
      const betterOn: string[] = [];
      const worseOn: string[] = [];

      for (const crit of criteria) {
        const winnerScore = winner.normalized_scores[crit.id] ?? 0;
        const altScore = alt.normalized_scores[crit.id] ?? 0;
        const diff = (crit.type === "minimize" ? -1 : 1) * (altScore - winnerScore);

        if (diff > 0.1) {
          betterOn.push(crit.name);
        } else if (diff < -0.1) {
          worseOn.push(crit.name);
        }
      }

      if (betterOn.length > 0 && worseOn.length > 0) {
        tradeoffs.push(
          `${alt.name} is better on ${betterOn.join(", ")} but worse on ${worseOn.join(", ")}`
        );
      }
    }

    return tradeoffs;
  }

  private static identifyRisks(
    winner: DecisionCandidate,
    problem: DecisionProblem
  ): string[] {
    const risks: string[] = [];

    // Check for criteria where winner scores poorly
    for (const crit of problem.criteria) {
      const score = winner.normalized_scores[crit.id] ?? 0;
      const effective = crit.type === "minimize" ? 1 - score : score;

      if (effective < 0.3 && crit.importance !== "low") {
        risks.push(
          `${winner.name} scores poorly on ${crit.name} (${(effective * 100).toFixed(0)}%)`
        );
      }
    }

    return risks;
  }

  private static generateExplanation(
    winner: DecisionCandidate,
    ranked: DecisionCandidate[],
    criteria: DecisionCriterion[]
  ): string {
    const criticalWins = criteria
      .filter(c => c.importance === "critical")
      .filter(c => {
        const winnerScore = winner.normalized_scores[c.id] ?? 0;
        return (c.type === "minimize" ? 1 - winnerScore : winnerScore) > 0.7;
      })
      .map(c => c.name);

    const scoreDiff = ranked.length > 1
      ? ((winner.weighted_score ?? 0) - (ranked[1].weighted_score ?? 0)) * 100
      : 0;

    let explanation = `${winner.name} is recommended`;

    if (criticalWins.length > 0) {
      explanation += ` because it excels on critical criteria: ${criticalWins.join(", ")}`;
    }

    if (ranked.length > 1) {
      explanation += `. It scores ${scoreDiff.toFixed(1)}% higher than the next best option (${ranked[1].name})`;
    }

    return explanation + ".";
  }

  private static calculateConfidence(
    ranked: DecisionCandidate[],
    sensitivity: SensitivityAnalysis
  ): number {
    let confidence = 0.8;  // Base confidence

    // Reduce if decision is not robust
    if (!sensitivity.robust) {
      confidence -= 0.2;
    }

    // Reduce if close alternatives exist
    confidence -= sensitivity.close_alternatives.length * 0.05;

    // Reduce if few candidates
    if (ranked.length < 3) {
      confidence -= 0.1;
    }

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  // Machine-specific helpers
  private static buildMachineCriteria(
    requirements: MachineRequirements,
    context: DecisionContext
  ): DecisionCriterion[] {
    return [
      {
        id: "capability_match",
        name: "Capability Match",
        description: "How well machine capabilities match requirements",
        importance: "critical",
        weight: 0.3,
        type: "maximize",
      },
      {
        id: "accuracy",
        name: "Positioning Accuracy",
        description: "Machine positioning accuracy",
        importance: "high",
        weight: 0.2,
        type: "minimize",
      },
      {
        id: "availability",
        name: "Availability",
        description: "Machine availability for scheduling",
        importance: "high",
        weight: 0.2,
        type: "maximize",
      },
      {
        id: "hourly_rate",
        name: "Hourly Rate",
        description: "Cost per hour of operation",
        importance: context.budget ? "high" : "medium",
        weight: context.budget ? 0.2 : 0.15,
        type: "minimize",
      },
      {
        id: "power",
        name: "Spindle Power",
        description: "Available cutting power",
        importance: "medium",
        weight: 0.1,
        type: "maximize",
      },
    ];
  }

  private static evaluateMachines(
    requirements: MachineRequirements,
    machines: MachineCapability[],
    criteria: DecisionCriterion[]
  ): DecisionCandidate[] {
    return machines.map(m => {
      // Calculate capability match score
      const requiredCaps = requirements.required_capabilities ?? [];
      const matchedCaps = requiredCaps.filter(c => m.capabilities.includes(c));
      const capabilityMatch = requiredCaps.length > 0
        ? matchedCaps.length / requiredCaps.length
        : 1;

      return {
        id: m.id,
        name: m.name,
        category: "machine" as const,
        properties: {
          type: m.type,
          work_envelope_x: m.work_envelope.x_travel,
          work_envelope_y: m.work_envelope.y_travel,
          work_envelope_z: m.work_envelope.z_travel,
          spindle_max_rpm: m.spindle.max_rpm,
          spindle_power_kw: m.spindle.power_kw,
          spindle_torque_nm: m.spindle.torque_nm,
          capabilities: m.capabilities.join(","),
        },
        scores: {
          capability_match: capabilityMatch,
          accuracy: m.accuracy.positioning,
          availability: m.availability,
          hourly_rate: m.hourly_rate,
          power: m.spindle.power_kw,
        },
        normalized_scores: {},
      };
    });
  }

  private static buildMachineConstraints(
    requirements: MachineRequirements,
    machines: MachineCapability[]
  ): DecisionConstraint[] {
    const constraints: DecisionConstraint[] = [];

    if (requirements.required_accuracy) {
      constraints.push({
        criterion_id: "accuracy",
        type: "max",
        value: requirements.required_accuracy,
        is_hard: true,
      });
    }

    return constraints;
  }

  // Tool-specific helpers
  private static buildToolCriteria(
    requirements: ToolRequirements,
    context: DecisionContext
  ): DecisionCriterion[] {
    return [
      {
        id: "material_compatibility",
        name: "Material Compatibility",
        description: "Suitability for workpiece material",
        importance: "critical",
        weight: 0.3,
        type: "maximize",
      },
      {
        id: "tool_life",
        name: "Expected Tool Life",
        description: "Minutes of cutting before replacement",
        importance: "high",
        weight: 0.25,
        type: "maximize",
      },
      {
        id: "productivity",
        name: "Productivity",
        description: "Achievable MRR",
        importance: requirements.operation === "roughing" ? "high" : "medium",
        weight: requirements.operation === "roughing" ? 0.25 : 0.15,
        type: "maximize",
      },
      {
        id: "surface_capability",
        name: "Surface Finish Capability",
        description: "Achievable surface finish",
        importance: requirements.operation === "finishing" ? "critical" : "medium",
        weight: requirements.operation === "finishing" ? 0.2 : 0.1,
        type: "minimize",  // Lower Ra = better
      },
      {
        id: "cost",
        name: "Tool Cost",
        description: "Purchase cost",
        importance: "medium",
        weight: 0.15,
        type: "minimize",
      },
    ];
  }

  private static evaluateTools(
    requirements: ToolRequirements,
    tools: ToolCapability[],
    criteria: DecisionCriterion[]
  ): DecisionCandidate[] {
    return tools.map(t => {
      // Calculate material compatibility
      const matLower = requirements.material.toLowerCase();
      const isRecommended = t.recommended_materials.some(m =>
        matLower.includes(m.toLowerCase())
      );
      const materialCompatibility = isRecommended ? 1.0 : 0.5;

      // Estimate productivity (MRR capability)
      const productivity = t.cutting_data.vc_max * t.cutting_data.fz_max * t.cutting_data.ap_max;

      // Estimate surface capability (lower flutes = rougher)
      const surfaceCapability = 1.0 / t.flute_count;  // More flutes = finer

      return {
        id: t.id,
        name: t.name,
        category: "tool" as const,
        properties: {
          type: t.type,
          diameter: t.diameter,
          coating: t.coating,
          flutes: t.flute_count,
        },
        scores: {
          material_compatibility: materialCompatibility,
          tool_life: t.tool_life_minutes,
          productivity,
          surface_capability: surfaceCapability,
          cost: t.cost,
        },
        normalized_scores: {},
      };
    });
  }

  private static buildToolConstraints(requirements: ToolRequirements): DecisionConstraint[] {
    const constraints: DecisionConstraint[] = [];

    if (requirements.feature_diameter) {
      constraints.push({
        criterion_id: "diameter",
        type: "max",
        value: requirements.feature_diameter,
        is_hard: true,
      });
    }

    return constraints;
  }
}

// Export singleton
export const decisionReasoningEngine = new DecisionReasoningEngine();
