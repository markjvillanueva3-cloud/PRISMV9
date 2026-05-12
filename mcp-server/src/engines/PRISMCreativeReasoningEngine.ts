/**
 * PRISMCreativeReasoningEngine — Creative Problem Solving & Novel Approach Discovery
 *
 * This engine enables PRISM to:
 * - Think outside conventional machining norms
 * - Discover hybrid approaches combining multiple techniques
 * - Invent novel solutions by cross-referencing knowledge domains
 * - Make mathematically optimal decisions using all available data
 * - Maximize system variability (SVI) through creative combinations
 *
 * Core Principles:
 * 1. EXHAUSTIVE EXPLORATION: Never stop at the first valid solution
 * 2. CROSS-DOMAIN SYNTHESIS: Combine techniques from different domains
 * 3. CONSTRAINT RELAXATION: Question assumptions before accepting limits
 * 4. MATHEMATICAL OPTIMIZATION: Every decision backed by quantitative analysis
 * 5. HYBRID APPROACHES: Mix strategies when single approaches fall short
 *
 * Knowledge Sources:
 * - 82 dispatchers, 4,296+ actions (all PRISM capabilities)
 * - 1,559+ engines with specific algorithms
 * - 499 formulas (physics, finance, biology, etc.)
 * - 60+ algorithms (optimization, ML, control theory)
 * - 3,700+ tribal tips (experiential knowledge)
 * - 296 playbook rules (best practices)
 * - 107 MIT courses worth of algorithms
 *
 * @module engines/PRISMCreativeReasoningEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Creative reasoning mode */
export type CreativeMode =
  | "conventional"      // Standard approach
  | "exploratory"       // Try multiple approaches
  | "unconventional"    // Challenge assumptions
  | "hybrid"            // Combine multiple strategies
  | "innovative"        // Invent new approaches
  | "optimal";          // Mathematical optimization

/** Problem domain */
export type ProblemDomain =
  | "cutting_parameters"
  | "toolpath_generation"
  | "material_selection"
  | "fixture_design"
  | "process_planning"
  | "quality_optimization"
  | "cost_reduction"
  | "cycle_time"
  | "tool_life"
  | "surface_finish"
  | "multi_domain";

/** Creative solution */
export interface CreativeSolution {
  id: string;
  approach: string;
  description: string;
  noveltyScore: number;          // 0-1: how unconventional
  viabilityScore: number;        // 0-1: practical feasibility
  optimizationScore: number;     // 0-1: mathematical optimality
  hybridComponents: string[];    // Combined strategies
  requiredCapabilities: string[];
  assumptions: string[];         // Assumptions that can be challenged
  tradeoffs: { benefit: string; cost: string }[];
  mathematicalBasis: string[];   // Formulas/algorithms used
  riskAssessment: { risk: string; mitigation: string }[];
  confidence: number;
}

/** Problem definition */
export interface ProblemDefinition {
  domain: ProblemDomain;
  objective: string;
  constraints: string[];
  currentApproach?: string;
  desiredOutcome: string;
  flexibility: "strict" | "moderate" | "flexible" | "maximum";
}

/** Exploration result */
export interface ExplorationResult {
  problem: ProblemDefinition;
  mode: CreativeMode;
  solutions: CreativeSolution[];
  challengedAssumptions: string[];
  hybridCombinations: HybridCombination[];
  novelInsights: string[];
  recommendedSolution: CreativeSolution | null;
  reasoning: string[];
  explorationDepth: number;
  variabilityContribution: number;  // SVI delta
}

/** Hybrid combination */
export interface HybridCombination {
  name: string;
  strategies: string[];
  synergy: string;
  estimatedBenefit: number;
}

// ============================================================================
// PRISM CAPABILITY DATABASE
// ============================================================================

const PRISM_CAPABILITIES = {
  // Calculation domains
  calculation: {
    speedFeed: ["UltimateSpeedFeed", "AutoSpeedFeed", "SpeedFeedOrchestrator", "AdaptiveSpeedFeed"],
    forces: ["KienzleForce", "CuttingForce", "StochasticCuttingForce", "ConstitutiveModel"],
    thermal: ["CuttingTemperature", "ThermalWearCoupling", "ThermalExpansion", "CryogenicCutting"],
    deflection: ["ToolDeflection", "PartDeflection", "BoringBarDeflection", "StochasticDeflection"],
    stability: ["ChatterStabilityLobe", "RegenerativeChatter", "DampingOptimization", "StochasticChatter"],
    wear: ["ToolWearProgression", "AdvancedWearPhysics", "StochasticToolLife"],
    surface: ["SurfaceFinishPredictor", "SurfaceIntegrity", "ResidualStress"],
  },
  // AI capabilities
  ai: {
    reasoning: ["ManufacturingReasoning", "MultiPathReasoning", "DeepReasoning", "AutonomousSession"],
    learning: ["CrossDisciplinaryDeepLearning", "ProactiveAIIntelligence", "TribalKnowledge"],
    optimization: ["GeneticAlgorithm", "ParticleSwarm", "AntColony", "SimulatedAnnealing"],
    prediction: ["MachineLearning", "BayesianUpdate", "KalmanFilter", "NeuralNetwork"],
  },
  // CAM capabilities
  cam: {
    toolpath: ["AdaptiveClearing", "TrochoidalMilling", "PeelMilling", "RestMachining"],
    multiAxis: ["FiveAxisKinematics", "RTCP", "CollisionAvoidance", "ToolVectorSmoothing"],
    turning: ["AdaptiveTurning", "ThreadCycleOptimization", "PartingGrooving"],
    strategies: ["HighSpeedMachining", "HighEfficiencyMachining", "MicroMachining"],
  },
  // Business capabilities
  business: {
    quoting: ["QuoteEstimator", "ActualCost", "WhatIfAnalysis", "ROI"],
    planning: ["CapacityPlanning", "JobScheduling", "ResourceAllocation"],
    quality: ["SPC", "FAI", "CMM", "GDT"],
  },
};

/** Common manufacturing assumptions that can be challenged */
const CHALLENGEABLE_ASSUMPTIONS = [
  { assumption: "Single operation per setup", challenge: "Multi-operation combinations", benefit: "Reduced cycle time" },
  { assumption: "Conservative speeds for safety", challenge: "Physics-based limits with monitoring", benefit: "30-50% productivity gain" },
  { assumption: "Standard tool geometries", challenge: "Custom/special geometries", benefit: "Optimal chip formation" },
  { assumption: "Fixed coolant strategy", challenge: "Adaptive coolant based on cut", benefit: "Better tool life" },
  { assumption: "Sequential roughing then finishing", challenge: "Integrated adaptive clearing", benefit: "Single pass with finish quality" },
  { assumption: "Uniform parameters throughout", challenge: "Zone-based parameter optimization", benefit: "10-20% improvement per zone" },
  { assumption: "Manual parameter selection", challenge: "AI-driven real-time adaptation", benefit: "Continuous optimization" },
  { assumption: "Single material consideration", challenge: "Multi-material/composite approach", benefit: "Broader capability" },
  { assumption: "Standard workholding", challenge: "Custom fixtures or vacuum", benefit: "Better access, less distortion" },
  { assumption: "Traditional toolpath patterns", challenge: "Hybrid/novel patterns", benefit: "Optimized for specific geometry" },
];

/** Cross-domain synergies */
const CROSS_DOMAIN_SYNERGIES = [
  { domains: ["physics", "biology"], synergy: "Genetic optimization of cutting parameters using physics constraints" },
  { domains: ["finance", "manufacturing"], synergy: "Real options pricing for machine investment decisions" },
  { domains: ["control_theory", "machining"], synergy: "Adaptive control for real-time parameter adjustment" },
  { domains: ["music_theory", "vibration"], synergy: "Harmonic analysis for chatter prediction" },
  { domains: ["ecology", "wear"], synergy: "Population dynamics for tool degradation modeling" },
  { domains: ["game_theory", "scheduling"], synergy: "Multi-agent scheduling optimization" },
  { domains: ["information_theory", "spc"], synergy: "Entropy-based process variability detection" },
  { domains: ["graph_theory", "toolpath"], synergy: "Network flow for optimal traverse paths" },
];

// ============================================================================
// ENGINE
// ============================================================================

export class PRISMCreativeReasoningEngine {
  private explorationHistory: ExplorationResult[] = [];

  constructor() {
    log.info("[CreativeReasoning] Engine initialized with creative thinking capabilities");
  }

  /**
   * Explore creative solutions for a manufacturing problem
   */
  explore(problem: ProblemDefinition, mode: CreativeMode = "exploratory"): ExplorationResult {
    const solutions: CreativeSolution[] = [];
    const challengedAssumptions: string[] = [];
    const hybridCombinations: HybridCombination[] = [];
    const novelInsights: string[] = [];
    const reasoning: string[] = [];

    reasoning.push(`Exploring ${mode} solutions for: ${problem.objective}`);

    // Phase 1: Generate conventional solutions
    const conventionalSolutions = this.generateConventionalSolutions(problem);
    solutions.push(...conventionalSolutions);
    reasoning.push(`Generated ${conventionalSolutions.length} conventional approaches`);

    // Phase 2: Challenge assumptions (if mode allows)
    if (mode !== "conventional") {
      const challenged = this.challengeAssumptions(problem);
      challengedAssumptions.push(...challenged.assumptions);
      solutions.push(...challenged.solutions);
      reasoning.push(`Challenged ${challenged.assumptions.length} assumptions`);
    }

    // Phase 3: Generate hybrid combinations
    if (mode === "hybrid" || mode === "innovative" || mode === "optimal") {
      const hybrids = this.generateHybridSolutions(problem, solutions);
      hybridCombinations.push(...hybrids.combinations);
      solutions.push(...hybrids.solutions);
      reasoning.push(`Created ${hybrids.combinations.length} hybrid approaches`);
    }

    // Phase 4: Cross-domain innovation
    if (mode === "innovative" || mode === "optimal") {
      const innovative = this.generateInnovativeSolutions(problem);
      solutions.push(...innovative.solutions);
      novelInsights.push(...innovative.insights);
      reasoning.push(`Discovered ${innovative.insights.length} novel insights`);
    }

    // Phase 5: Mathematical optimization
    if (mode === "optimal") {
      const optimized = this.mathematicallyOptimize(solutions, problem);
      reasoning.push(`Mathematically optimized: ${optimized.reasoning}`);
      solutions.forEach((s, i) => {
        if (optimized.scores[i] !== undefined) {
          s.optimizationScore = optimized.scores[i];
        }
      });
    }

    // Phase 6: Rank and select best solution
    solutions.sort((a, b) => this.scoreSolution(b) - this.scoreSolution(a));
    const recommendedSolution = solutions.length > 0 ? solutions[0] : null;

    const result: ExplorationResult = {
      problem,
      mode,
      solutions,
      challengedAssumptions,
      hybridCombinations,
      novelInsights,
      recommendedSolution,
      reasoning,
      explorationDepth: this.calculateExplorationDepth(mode),
      variabilityContribution: this.calculateSVIContribution(solutions),
    };

    this.explorationHistory.push(result);
    return result;
  }

  /**
   * Generate conventional solutions using standard approaches
   */
  private generateConventionalSolutions(problem: ProblemDefinition): CreativeSolution[] {
    const solutions: CreativeSolution[] = [];

    // Map domain to conventional approaches
    const domainApproaches: Record<ProblemDomain, string[]> = {
      cutting_parameters: ["Machinery's Handbook lookup", "CAM system defaults", "Tool manufacturer recommendations"],
      toolpath_generation: ["Standard adaptive clearing", "Waterline/contour", "Zig-zag patterns"],
      material_selection: ["Material database lookup", "Machinability rating", "Cost-performance balance"],
      fixture_design: ["Standard vise clamping", "Parallels and stops", "Soft jaws"],
      process_planning: ["Sequential operations", "Standard routing", "Batch processing"],
      quality_optimization: ["Reduce feed for finish", "Multiple passes", "Inspection-based adjustment"],
      cost_reduction: ["Reduce cycle time", "Extend tool life", "Minimize setups"],
      cycle_time: ["Increase speeds/feeds", "Reduce air cuts", "Optimize toolpath"],
      tool_life: ["Reduce cutting speed", "Use coolant", "Reduce DOC"],
      surface_finish: ["Reduce feed", "Ball nose finishing", "Multiple spring passes"],
      multi_domain: ["Balanced approach", "Weighted optimization", "Trade-off analysis"],
    };

    const approaches = domainApproaches[problem.domain] || [];

    for (const approach of approaches) {
      solutions.push({
        id: `conv-${approach.toLowerCase().replace(/\s+/g, "-")}`,
        approach: "conventional",
        description: approach,
        noveltyScore: 0.1,
        viabilityScore: 0.9,
        optimizationScore: 0.5,
        hybridComponents: [],
        requiredCapabilities: this.inferCapabilities(approach),
        assumptions: ["Standard parameters apply", "Material behaves as expected"],
        tradeoffs: [{ benefit: "Proven reliability", cost: "May not be optimal" }],
        mathematicalBasis: ["Empirical data", "Historical experience"],
        riskAssessment: [{ risk: "Suboptimal results", mitigation: "Conservative approach" }],
        confidence: 0.85,
      });
    }

    return solutions;
  }

  /**
   * Challenge assumptions and generate alternative solutions
   */
  private challengeAssumptions(problem: ProblemDefinition): { assumptions: string[]; solutions: CreativeSolution[] } {
    const challenged: string[] = [];
    const solutions: CreativeSolution[] = [];

    for (const item of CHALLENGEABLE_ASSUMPTIONS) {
      if (this.assumptionApplies(item.assumption, problem)) {
        challenged.push(item.assumption);

        solutions.push({
          id: `challenge-${item.assumption.toLowerCase().replace(/\s+/g, "-")}`,
          approach: "unconventional",
          description: item.challenge,
          noveltyScore: 0.7,
          viabilityScore: 0.6,
          optimizationScore: 0.7,
          hybridComponents: [],
          requiredCapabilities: this.inferCapabilities(item.challenge),
          assumptions: [`Challenge: ${item.assumption}`],
          tradeoffs: [{ benefit: item.benefit, cost: "Requires validation" }],
          mathematicalBasis: ["Physics-based analysis", "Simulation validation"],
          riskAssessment: [{ risk: "Untested approach", mitigation: "Incremental validation" }],
          confidence: 0.65,
        });
      }
    }

    return { assumptions: challenged, solutions };
  }

  /**
   * Generate hybrid solutions by combining strategies
   */
  private generateHybridSolutions(
    problem: ProblemDefinition,
    existingSolutions: CreativeSolution[]
  ): { combinations: HybridCombination[]; solutions: CreativeSolution[] } {
    const combinations: HybridCombination[] = [];
    const solutions: CreativeSolution[] = [];

    // Generate pairwise combinations
    for (let i = 0; i < existingSolutions.length; i++) {
      for (let j = i + 1; j < existingSolutions.length; j++) {
        const s1 = existingSolutions[i];
        const s2 = existingSolutions[j];

        // Check for complementary strategies
        if (this.areComplementary(s1, s2)) {
          const hybridName = `${s1.description} + ${s2.description}`;
          const synergy = this.calculateSynergy(s1, s2);

          combinations.push({
            name: hybridName,
            strategies: [s1.id, s2.id],
            synergy: synergy.description,
            estimatedBenefit: synergy.benefit,
          });

          solutions.push({
            id: `hybrid-${s1.id}-${s2.id}`,
            approach: "hybrid",
            description: hybridName,
            noveltyScore: 0.6,
            viabilityScore: Math.min(s1.viabilityScore, s2.viabilityScore),
            optimizationScore: (s1.optimizationScore + s2.optimizationScore) / 2 * synergy.benefit,
            hybridComponents: [s1.description, s2.description],
            requiredCapabilities: [...s1.requiredCapabilities, ...s2.requiredCapabilities],
            assumptions: [...s1.assumptions, ...s2.assumptions],
            tradeoffs: [
              { benefit: `Combined benefits: ${synergy.description}`, cost: "Higher complexity" },
            ],
            mathematicalBasis: [...s1.mathematicalBasis, ...s2.mathematicalBasis],
            riskAssessment: [{ risk: "Integration complexity", mitigation: "Phased implementation" }],
            confidence: 0.7,
          });
        }
      }
    }

    return { combinations, solutions };
  }

  /**
   * Generate innovative solutions using cross-domain knowledge
   */
  private generateInnovativeSolutions(problem: ProblemDefinition): { solutions: CreativeSolution[]; insights: string[] } {
    const solutions: CreativeSolution[] = [];
    const insights: string[] = [];

    // Find applicable cross-domain synergies
    for (const synergy of CROSS_DOMAIN_SYNERGIES) {
      if (this.synergyApplies(synergy.domains, problem)) {
        insights.push(synergy.synergy);

        solutions.push({
          id: `innovative-${synergy.domains.join("-")}`,
          approach: "innovative",
          description: synergy.synergy,
          noveltyScore: 0.9,
          viabilityScore: 0.5,
          optimizationScore: 0.8,
          hybridComponents: synergy.domains,
          requiredCapabilities: this.inferCrossDomainCapabilities(synergy.domains),
          assumptions: ["Cross-domain knowledge transfer is valid"],
          tradeoffs: [{ benefit: "Novel optimization approach", cost: "Requires expertise" }],
          mathematicalBasis: [`${synergy.domains[0]} principles`, `${synergy.domains[1]} techniques`],
          riskAssessment: [{ risk: "Unproven in this context", mitigation: "Simulation and gradual rollout" }],
          confidence: 0.55,
        });
      }
    }

    // Generate domain-specific innovations
    const domainInnovations = this.generateDomainInnovations(problem);
    solutions.push(...domainInnovations.solutions);
    insights.push(...domainInnovations.insights);

    return { solutions, insights };
  }

  /**
   * Generate domain-specific innovations
   */
  private generateDomainInnovations(problem: ProblemDefinition): { solutions: CreativeSolution[]; insights: string[] } {
    const solutions: CreativeSolution[] = [];
    const insights: string[] = [];

    const innovations: Record<ProblemDomain, { insight: string; solution: string }[]> = {
      cutting_parameters: [
        { insight: "Use Johnson-Cook flow stress for real-time adaptation", solution: "Constitutive model-driven parameters" },
        { insight: "Apply Kalman filter for tool wear compensation", solution: "State estimation for wear-adjusted speeds" },
        { insight: "Genetic algorithm for multi-objective optimization", solution: "Pareto-optimal speed/feed/life balance" },
      ],
      toolpath_generation: [
        { insight: "Graph theory for minimum traverse paths", solution: "Network flow optimized rapid moves" },
        { insight: "NURBS-based continuous toolpaths", solution: "Jerk-limited smooth motion" },
        { insight: "Voronoi-based adaptive clearing", solution: "Medial axis for optimal engagement" },
      ],
      tool_life: [
        { insight: "Bayesian updating for probabilistic life", solution: "Adaptive confidence intervals" },
        { insight: "Lotka-Volterra for heat-wear coupling", solution: "Ecological model for degradation" },
        { insight: "Monte Carlo for uncertainty quantification", solution: "Probabilistic replacement scheduling" },
      ],
      surface_finish: [
        { insight: "Music theory harmonics for vibration", solution: "Harmonic avoidance spindle speeds" },
        { insight: "Quantum annealing for global optimization", solution: "Escape local minima in parameters" },
        { insight: "Entropy-based variability detection", solution: "Information theory for process control" },
      ],
      cycle_time: [
        { insight: "S-curve motion profiles", solution: "Jerk-limited high-speed traverses" },
        { insight: "A* pathfinding for rapids", solution: "Collision-free optimal paths" },
        { insight: "LQR for motion control", solution: "Optimal tracking performance" },
      ],
      cost_reduction: [
        { insight: "Black-Scholes for capacity options", solution: "Real options for machine investment" },
        { insight: "VaR for quote risk", solution: "Confidence-based pricing" },
        { insight: "Sharpe ratio for machine ROI", solution: "Risk-adjusted investment decisions" },
      ],
      material_selection: [
        { insight: "Multi-criteria decision making", solution: "Weighted property optimization" },
        { insight: "Machinability index correlation", solution: "Performance prediction from composition" },
      ],
      fixture_design: [
        { insight: "FEA-driven deflection minimization", solution: "Optimized clamp locations" },
        { insight: "Contact mechanics for grip", solution: "Hertzian stress-based clamping" },
      ],
      process_planning: [
        { insight: "Critical path analysis", solution: "Parallel operation optimization" },
        { insight: "Setup time minimization", solution: "Common datum consolidation" },
      ],
      quality_optimization: [
        { insight: "SPC with Nelson rules", solution: "Early drift detection" },
        { insight: "Cp/Cpk for capability", solution: "Process centering optimization" },
      ],
      multi_domain: [
        { insight: "Pareto frontier exploration", solution: "Multi-objective optimization" },
        { insight: "Hierarchical constraint relaxation", solution: "Systematic trade-off resolution" },
      ],
    };

    const domainInnovations = innovations[problem.domain] || [];
    for (const innov of domainInnovations) {
      insights.push(innov.insight);
      solutions.push({
        id: `domain-${innov.solution.toLowerCase().replace(/\s+/g, "-")}`,
        approach: "innovative",
        description: innov.solution,
        noveltyScore: 0.85,
        viabilityScore: 0.6,
        optimizationScore: 0.8,
        hybridComponents: [],
        requiredCapabilities: [innov.solution],
        assumptions: ["Advanced algorithms available"],
        tradeoffs: [{ benefit: innov.insight, cost: "Implementation complexity" }],
        mathematicalBasis: [innov.insight],
        riskAssessment: [{ risk: "Requires validation", mitigation: "Incremental deployment" }],
        confidence: 0.65,
      });
    }

    return { solutions, insights };
  }

  /**
   * Mathematically optimize solutions
   */
  private mathematicallyOptimize(
    solutions: CreativeSolution[],
    problem: ProblemDefinition
  ): { scores: number[]; reasoning: string } {
    const scores: number[] = [];
    const weights = this.getOptimizationWeights(problem);

    for (const solution of solutions) {
      // Multi-objective scoring
      const noveltyContrib = solution.noveltyScore * weights.novelty;
      const viabilityContrib = solution.viabilityScore * weights.viability;
      const optimizationContrib = solution.optimizationScore * weights.optimization;
      const confidenceContrib = solution.confidence * weights.confidence;

      // Synergy bonus for hybrid approaches
      const hybridBonus = solution.hybridComponents.length > 0 ? 0.1 : 0;

      // Risk penalty
      const riskPenalty = solution.riskAssessment.length * 0.02;

      const totalScore = noveltyContrib + viabilityContrib + optimizationContrib + confidenceContrib + hybridBonus - riskPenalty;
      scores.push(Math.min(1, Math.max(0, totalScore)));
    }

    return {
      scores,
      reasoning: `Applied weights: novelty=${weights.novelty}, viability=${weights.viability}, optimization=${weights.optimization}`,
    };
  }

  /**
   * Get optimization weights based on problem flexibility
   */
  private getOptimizationWeights(problem: ProblemDefinition): Record<string, number> {
    switch (problem.flexibility) {
      case "strict":
        return { novelty: 0.1, viability: 0.5, optimization: 0.3, confidence: 0.1 };
      case "moderate":
        return { novelty: 0.2, viability: 0.4, optimization: 0.3, confidence: 0.1 };
      case "flexible":
        return { novelty: 0.3, viability: 0.3, optimization: 0.3, confidence: 0.1 };
      case "maximum":
        return { novelty: 0.4, viability: 0.2, optimization: 0.3, confidence: 0.1 };
      default:
        return { novelty: 0.25, viability: 0.35, optimization: 0.3, confidence: 0.1 };
    }
  }

  /**
   * Score a solution for ranking
   */
  private scoreSolution(solution: CreativeSolution): number {
    return (
      solution.noveltyScore * 0.2 +
      solution.viabilityScore * 0.3 +
      solution.optimizationScore * 0.3 +
      solution.confidence * 0.2
    );
  }

  /**
   * Check if two solutions are complementary
   */
  private areComplementary(s1: CreativeSolution, s2: CreativeSolution): boolean {
    // Different approaches can complement each other
    if (s1.approach === s2.approach) return false;

    // Check for different capabilities
    const capOverlap = s1.requiredCapabilities.filter(c => s2.requiredCapabilities.includes(c)).length;
    const totalCaps = s1.requiredCapabilities.length + s2.requiredCapabilities.length;

    return capOverlap < totalCaps * 0.3; // Less than 30% overlap
  }

  /**
   * Calculate synergy between two solutions
   */
  private calculateSynergy(s1: CreativeSolution, s2: CreativeSolution): { description: string; benefit: number } {
    // Higher synergy when combining different approaches
    const approachDiversity = s1.approach !== s2.approach ? 0.2 : 0;

    // Higher synergy with complementary capabilities
    const capComplement = 1 - (s1.requiredCapabilities.filter(c => s2.requiredCapabilities.includes(c)).length /
      Math.max(s1.requiredCapabilities.length, s2.requiredCapabilities.length, 1));

    const benefit = 1 + approachDiversity + capComplement * 0.3;

    return {
      description: `Combines ${s1.approach} and ${s2.approach} approaches`,
      benefit,
    };
  }

  /**
   * Check if an assumption applies to the problem
   */
  private assumptionApplies(assumption: string, problem: ProblemDefinition): boolean {
    const assumptionDomains: Record<string, ProblemDomain[]> = {
      "Single operation per setup": ["process_planning", "cycle_time"],
      "Conservative speeds for safety": ["cutting_parameters", "tool_life"],
      "Standard tool geometries": ["cutting_parameters", "surface_finish"],
      "Fixed coolant strategy": ["cutting_parameters", "tool_life"],
      "Sequential roughing then finishing": ["toolpath_generation", "cycle_time"],
      "Uniform parameters throughout": ["cutting_parameters", "quality_optimization"],
      "Manual parameter selection": ["cutting_parameters", "cost_reduction"],
      "Single material consideration": ["material_selection"],
      "Standard workholding": ["fixture_design"],
      "Traditional toolpath patterns": ["toolpath_generation"],
    };

    const domains = assumptionDomains[assumption] || [];
    return domains.includes(problem.domain) || problem.domain === "multi_domain";
  }

  /**
   * Check if a cross-domain synergy applies to the problem
   */
  private synergyApplies(domains: string[], problem: ProblemDefinition): boolean {
    const domainMappings: Record<string, ProblemDomain[]> = {
      physics: ["cutting_parameters", "tool_life", "surface_finish", "cycle_time"],
      biology: ["cutting_parameters", "tool_life"],
      finance: ["cost_reduction", "process_planning"],
      control_theory: ["cutting_parameters", "quality_optimization"],
      music_theory: ["surface_finish", "quality_optimization"],
      ecology: ["tool_life"],
      game_theory: ["process_planning", "cost_reduction"],
      information_theory: ["quality_optimization"],
      graph_theory: ["toolpath_generation", "cycle_time"],
    };

    return domains.some(d => (domainMappings[d] || []).includes(problem.domain));
  }

  /**
   * Infer required capabilities from approach description
   */
  private inferCapabilities(approach: string): string[] {
    const caps: string[] = [];
    const lower = approach.toLowerCase();

    if (lower.includes("speed") || lower.includes("feed")) caps.push("SpeedFeedEngine");
    if (lower.includes("tool") && lower.includes("life")) caps.push("ToolLifeEngine");
    if (lower.includes("surface") || lower.includes("finish")) caps.push("SurfaceFinishEngine");
    if (lower.includes("force") || lower.includes("cutting")) caps.push("CuttingForceEngine");
    if (lower.includes("thermal") || lower.includes("temperature")) caps.push("ThermalEngine");
    if (lower.includes("genetic") || lower.includes("optimization")) caps.push("OptimizationAlgorithms");
    if (lower.includes("adaptive")) caps.push("AdaptiveControl");

    return caps.length > 0 ? caps : ["GeneralCalculation"];
  }

  /**
   * Infer capabilities needed for cross-domain synergy
   */
  private inferCrossDomainCapabilities(domains: string[]): string[] {
    const caps: string[] = [];

    for (const domain of domains) {
      switch (domain) {
        case "physics":
          caps.push("PhysicsEngine", "ThermalEngine", "ForceEngine");
          break;
        case "biology":
          caps.push("GeneticAlgorithm", "SwarmOptimization");
          break;
        case "finance":
          caps.push("CostEstimation", "RiskAnalysis");
          break;
        case "control_theory":
          caps.push("PIDControl", "KalmanFilter", "LQR");
          break;
        case "music_theory":
          caps.push("VibrationAnalysis", "HarmonicAnalysis");
          break;
        case "graph_theory":
          caps.push("ToolpathOptimization", "PathPlanning");
          break;
      }
    }

    return caps;
  }

  /**
   * Calculate exploration depth based on mode
   */
  private calculateExplorationDepth(mode: CreativeMode): number {
    const depths: Record<CreativeMode, number> = {
      conventional: 1,
      exploratory: 2,
      unconventional: 3,
      hybrid: 4,
      innovative: 5,
      optimal: 6,
    };
    return depths[mode] || 2;
  }

  /**
   * Calculate SVI contribution from solutions
   */
  private calculateSVIContribution(solutions: CreativeSolution[]): number {
    // More solutions with higher novelty = higher variability contribution
    const noveltySum = solutions.reduce((sum, s) => sum + s.noveltyScore, 0);
    const avgNovelty = solutions.length > 0 ? noveltySum / solutions.length : 0;

    return solutions.length * avgNovelty * 0.01; // Small but measurable contribution
  }

  /**
   * Get PRISM capability summary for AI understanding
   */
  getCapabilitySummary(): {
    totalCapabilities: number;
    categories: string[];
    keyFeatures: string[];
    hybridPotential: number;
  } {
    let total = 0;
    const categories: string[] = [];

    for (const [category, subcats] of Object.entries(PRISM_CAPABILITIES)) {
      categories.push(category);
      for (const engines of Object.values(subcats)) {
        total += (engines as string[]).length;
      }
    }

    return {
      totalCapabilities: total,
      categories,
      keyFeatures: [
        "82 dispatchers with 4,296+ actions",
        "1,559+ calculation engines",
        "499 physics/math formulas",
        "60+ optimization algorithms",
        "AI reasoning with 8+ modes",
        "Cross-domain knowledge synthesis",
        "Hybrid approach generation",
        "Mathematical optimization",
      ],
      hybridPotential: Math.pow(2, categories.length) - 1, // Combinatorial potential
    };
  }

  /**
   * Get exploration history
   */
  getHistory(): ExplorationResult[] {
    return this.explorationHistory;
  }

  /**
   * Generate a summary for AI context
   */
  getSummary(): string {
    const caps = this.getCapabilitySummary();
    return [
      "PRISMCreativeReasoningEngine — Creative Problem Solving",
      `Capabilities: ${caps.totalCapabilities} engines across ${caps.categories.length} categories`,
      `Key Features: ${caps.keyFeatures.join(", ")}`,
      `Hybrid Potential: ${caps.hybridPotential} possible combinations`,
      `Exploration Modes: conventional, exploratory, unconventional, hybrid, innovative, optimal`,
      `Challengeable Assumptions: ${CHALLENGEABLE_ASSUMPTIONS.length}`,
      `Cross-Domain Synergies: ${CROSS_DOMAIN_SYNERGIES.length}`,
    ].join("\n");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const prismCreativeReasoningEngine = new PRISMCreativeReasoningEngine();
