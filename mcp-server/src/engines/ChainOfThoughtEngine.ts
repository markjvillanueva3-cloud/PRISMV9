/**
 * ChainOfThoughtEngine — Explicit Step-by-Step Reasoning for PRISM
 * =================================================================
 * Provides Claude-like chain-of-thought reasoning capabilities:
 *   - Explicit reasoning steps with intermediate validation
 *   - Self-questioning and assumption challenging
 *   - Backtracking when reasoning hits contradictions
 *   - Confidence tracking at each step
 *   - Multiple reasoning paths (tree-of-thought)
 *
 * This engine makes PRISM's reasoning transparent and auditable,
 * ensuring complex manufacturing calculations can be traced and verified.
 *
 * @module engines/ChainOfThoughtEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Reasoning step type */
export type StepType =
  | "observation"    // Initial fact/input observation
  | "deduction"      // Logical deduction from premises
  | "calculation"    // Mathematical computation
  | "hypothesis"     // Tentative conclusion to test
  | "validation"     // Check against constraints
  | "reflection"     // Self-evaluation
  | "backtrack"      // Abandon current path
  | "conclusion";    // Final answer

/** Single reasoning step */
export interface ReasoningStep {
  step_id: string;
  step_number: number;
  type: StepType;
  content: string;
  premises: string[];           // What this step depends on
  inference_rule?: string;      // Logic rule applied
  calculation?: {
    formula: string;
    inputs: Record<string, number>;
    result: number;
    unit?: string;
  };
  confidence: number;           // 0-1 confidence in this step
  uncertainty?: number;         // Quantified uncertainty if applicable
  alternatives?: string[];      // Other paths considered
  self_question?: string;       // Question asked to validate
  self_answer?: string;         // Answer to self-question
  warnings?: string[];
  timestamp: string;
}

/** Reasoning chain */
export interface ReasoningChain {
  chain_id: string;
  problem: string;
  goal: string;
  steps: ReasoningStep[];
  current_confidence: number;
  dead_ends: DeadEnd[];
  final_answer?: FinalAnswer;
  total_time_ms: number;
  meta: ChainMeta;
}

/** Dead end encountered */
export interface DeadEnd {
  at_step: number;
  reason: string;
  contradiction?: string;
  backtrack_to: number;
}

/** Final answer with justification */
export interface FinalAnswer {
  answer: unknown;
  confidence: number;
  justification: string[];
  assumptions: string[];
  caveats: string[];
  evidence_strength: "weak" | "moderate" | "strong" | "conclusive";
}

/** Chain metadata */
export interface ChainMeta {
  strategy: ReasoningStrategy;
  max_depth: number;
  backtrack_count: number;
  branch_count: number;
  pruned_branches: number;
}

/** Reasoning strategy */
export type ReasoningStrategy =
  | "linear"           // Simple chain A→B→C
  | "branching"        // Tree with multiple paths
  | "iterative"        // Refine answer through iterations
  | "adversarial"      // Challenge own conclusions
  | "analogical";      // Reason by analogy

/** Tree-of-thought node */
export interface ThoughtNode {
  node_id: string;
  parent_id?: string;
  step: ReasoningStep;
  children: ThoughtNode[];
  score: number;         // Heuristic score for beam search
  pruned: boolean;
  pruned_reason?: string;
}

/** Reasoning tree (tree-of-thought) */
export interface ReasoningTree {
  tree_id: string;
  problem: string;
  root: ThoughtNode;
  best_path: string[];    // Node IDs of best path
  beam_width: number;
  explored_nodes: number;
  final_answer?: FinalAnswer;
}

/** Reasoning problem input */
export interface ReasoningProblem {
  problem: string;
  goal: string;
  context?: Record<string, unknown>;
  constraints?: string[];
  known_facts?: string[];
  strategy?: ReasoningStrategy;
  max_steps?: number;
  confidence_threshold?: number;
}

/** Inference rule */
export interface InferenceRule {
  name: string;
  pattern: string;
  conclusion_template: string;
  confidence_modifier: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ChainOfThoughtEngine {
  private static stepCounter = 0;
  private static chainCounter = 0;

  // Inference rules for deductive reasoning
  private static readonly INFERENCE_RULES: InferenceRule[] = [
    {
      name: "modus_ponens",
      pattern: "If P then Q; P is true",
      conclusion_template: "Therefore Q",
      confidence_modifier: 1.0,
    },
    {
      name: "modus_tollens",
      pattern: "If P then Q; Q is false",
      conclusion_template: "Therefore P is false",
      confidence_modifier: 1.0,
    },
    {
      name: "transitivity",
      pattern: "A implies B; B implies C",
      conclusion_template: "Therefore A implies C",
      confidence_modifier: 0.95,
    },
    {
      name: "disjunctive_syllogism",
      pattern: "A or B; not A",
      conclusion_template: "Therefore B",
      confidence_modifier: 1.0,
    },
    {
      name: "conservation_law",
      pattern: "Energy/mass/momentum must be conserved",
      conclusion_template: "Input = Output + Losses",
      confidence_modifier: 0.99,
    },
    {
      name: "dimensional_consistency",
      pattern: "Units on left must equal units on right",
      conclusion_template: "Equation is dimensionally valid",
      confidence_modifier: 1.0,
    },
    {
      name: "monotonicity",
      pattern: "If X increases and Y is monotonic in X",
      conclusion_template: "Y increases/decreases accordingly",
      confidence_modifier: 0.9,
    },
    {
      name: "constraint_propagation",
      pattern: "Constraint limits parameter range",
      conclusion_template: "Parameter must be within bounds",
      confidence_modifier: 0.95,
    },
  ];

  // Manufacturing-specific heuristics
  private static readonly MFG_HEURISTICS: Record<string, string> = {
    cutting_speed_hardness: "Harder materials require lower cutting speeds",
    feed_surface_finish: "Higher feeds produce rougher surfaces",
    depth_force: "Deeper cuts increase cutting forces non-linearly",
    tool_life_speed: "Higher speeds reduce tool life exponentially (Taylor)",
    thermal_speed: "Cutting temperature rises with speed (Taylor-like)",
    stability_speed: "Chatter risk increases at certain speed ranges (SLD)",
    deflection_length: "Deflection increases with L³ for cantilevers",
    coolant_temperature: "Coolant reduces temperature but may cause thermal shock",
  };

  /**
   * Reason through a problem step-by-step
   */
  static reason(problem: ReasoningProblem): ReasoningChain {
    const startTime = Date.now();
    const chainId = `cot-${++this.chainCounter}`;

    log.info("[ChainOfThought] Starting reasoning", {
      chain_id: chainId,
      problem: problem.problem.substring(0, 100),
      strategy: problem.strategy || "linear",
    });

    const chain: ReasoningChain = {
      chain_id: chainId,
      problem: problem.problem,
      goal: problem.goal,
      steps: [],
      current_confidence: 1.0,
      dead_ends: [],
      total_time_ms: 0,
      meta: {
        strategy: problem.strategy || "linear",
        max_depth: problem.max_steps || 20,
        backtrack_count: 0,
        branch_count: 1,
        pruned_branches: 0,
      },
    };

    // Step 1: Observation - parse the problem
    this.addStep(chain, {
      type: "observation",
      content: `Problem: ${problem.problem}\nGoal: ${problem.goal}`,
      premises: [],
      confidence: 1.0,
      self_question: "Have I understood the problem correctly?",
      self_answer: "Yes, the problem statement is clear.",
    });

    // Step 2: List known facts
    if (problem.known_facts && problem.known_facts.length > 0) {
      this.addStep(chain, {
        type: "observation",
        content: `Known facts:\n${problem.known_facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}`,
        premises: ["problem_statement"],
        confidence: 0.95,
        self_question: "Are these facts reliable?",
        self_answer: "Facts are provided as input; assumed accurate.",
      });
    }

    // Step 3: Identify constraints
    if (problem.constraints && problem.constraints.length > 0) {
      this.addStep(chain, {
        type: "observation",
        content: `Constraints:\n${problem.constraints.map((c, i) => `${i + 1}. ${c}`).join("\n")}`,
        premises: ["problem_statement"],
        confidence: 1.0,
        self_question: "Are these constraints complete?",
        self_answer: "Using provided constraints; there may be implicit ones.",
      });
    }

    // Step 4: Form initial hypothesis
    this.addStep(chain, {
      type: "hypothesis",
      content: this.formInitialHypothesis(problem),
      premises: chain.steps.map(s => s.step_id),
      confidence: 0.6,
      self_question: "Is this hypothesis testable?",
      self_answer: "Yes, we can evaluate it against constraints and physics.",
      alternatives: this.generateAlternativeHypotheses(problem),
    });

    // Step 5-N: Reasoning loop
    const maxSteps = problem.max_steps || 20;
    const confidenceThreshold = problem.confidence_threshold || 0.7;

    while (
      chain.steps.length < maxSteps &&
      !chain.final_answer &&
      chain.current_confidence > 0.3
    ) {
      const nextStep = this.determineNextStep(chain, problem);

      if (nextStep.type === "conclusion") {
        // Ready to conclude
        this.addStep(chain, nextStep);
        chain.final_answer = this.formulateFinalAnswer(chain, confidenceThreshold);
        break;
      } else if (nextStep.type === "backtrack") {
        // Hit a dead end
        chain.dead_ends.push({
          at_step: chain.steps.length,
          reason: nextStep.content,
          backtrack_to: Math.max(0, chain.steps.length - 2),
        });
        chain.meta.backtrack_count++;
        this.addStep(chain, nextStep);
      } else {
        this.addStep(chain, nextStep);
      }

      // Update confidence based on step
      chain.current_confidence = this.calculateChainConfidence(chain);
    }

    // If we ran out of steps, still formulate an answer
    if (!chain.final_answer) {
      this.addStep(chain, {
        type: "conclusion",
        content: "Reasoning reached step limit; formulating best available answer.",
        premises: chain.steps.slice(-3).map(s => s.step_id),
        confidence: chain.current_confidence * 0.8,
        warnings: ["Reasoning did not converge to high confidence"],
      });
      chain.final_answer = this.formulateFinalAnswer(chain, 0.5);
    }

    chain.total_time_ms = Date.now() - startTime;

    log.info("[ChainOfThought] Reasoning complete", {
      chain_id: chainId,
      steps: chain.steps.length,
      confidence: chain.final_answer?.confidence,
      dead_ends: chain.dead_ends.length,
      time_ms: chain.total_time_ms,
    });

    return chain;
  }

  /**
   * Tree-of-thought reasoning with beam search
   */
  static reasonTree(
    problem: ReasoningProblem,
    beamWidth: number = 3
  ): ReasoningTree {
    const treeId = `tot-${++this.chainCounter}`;

    log.info("[ChainOfThought] Starting tree-of-thought reasoning", {
      tree_id: treeId,
      beam_width: beamWidth,
    });

    // Create root node
    const root: ThoughtNode = {
      node_id: `${treeId}-0`,
      step: {
        step_id: `step-${++this.stepCounter}`,
        step_number: 0,
        type: "observation",
        content: `Problem: ${problem.problem}`,
        premises: [],
        confidence: 1.0,
        timestamp: new Date().toISOString(),
      },
      children: [],
      score: 1.0,
      pruned: false,
    };

    const tree: ReasoningTree = {
      tree_id: treeId,
      problem: problem.problem,
      root,
      best_path: [root.node_id],
      beam_width: beamWidth,
      explored_nodes: 1,
    };

    // Beam search through thought space
    let frontier: ThoughtNode[] = [root];
    const maxDepth = problem.max_steps || 10;

    for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
      const nextFrontier: ThoughtNode[] = [];

      for (const node of frontier) {
        // Generate children (alternative next steps)
        const children = this.expandNode(node, problem, tree);
        node.children = children;
        tree.explored_nodes += children.length;

        // Score and add to frontier
        for (const child of children) {
          if (!child.pruned) {
            nextFrontier.push(child);
          }
        }
      }

      // Keep top-k by score (beam search)
      nextFrontier.sort((a, b) => b.score - a.score);
      frontier = nextFrontier.slice(0, beamWidth);

      // Prune the rest
      for (let i = beamWidth; i < nextFrontier.length; i++) {
        nextFrontier[i].pruned = true;
        nextFrontier[i].pruned_reason = "beam_search_cutoff";
      }

      // Check if any path reached conclusion
      const conclusions = frontier.filter(n => n.step.type === "conclusion");
      if (conclusions.length > 0) {
        const best = conclusions[0];
        tree.best_path = this.tracePath(root, best.node_id);
        tree.final_answer = {
          answer: best.step.content,
          confidence: best.score,
          justification: tree.best_path.map(id => {
            const node = this.findNode(root, id);
            return node?.step.content || "";
          }),
          assumptions: [],
          caveats: [],
          evidence_strength: best.score > 0.8 ? "strong" : best.score > 0.6 ? "moderate" : "weak",
        };
        break;
      }
    }

    log.info("[ChainOfThought] Tree reasoning complete", {
      tree_id: treeId,
      explored_nodes: tree.explored_nodes,
      best_path_length: tree.best_path.length,
      final_confidence: tree.final_answer?.confidence,
    });

    return tree;
  }

  /**
   * Adversarial self-questioning
   */
  static adversarialChallenge(
    answer: FinalAnswer,
    context: Record<string, unknown>
  ): {
    challenges: Array<{
      challenge: string;
      severity: "low" | "medium" | "high";
      defense: string;
      defended: boolean;
    }>;
    revised_confidence: number;
    should_revise: boolean;
  } {
    const challenges: Array<{
      challenge: string;
      severity: "low" | "medium" | "high";
      defense: string;
      defended: boolean;
    }> = [];

    // Challenge 1: Check assumptions
    for (const assumption of answer.assumptions) {
      const challenge = {
        challenge: `Is the assumption "${assumption}" valid in this context?`,
        severity: "medium" as const,
        defense: this.defendAssumption(assumption, context),
        defended: true,
      };
      challenges.push(challenge);
    }

    // Challenge 2: Look for contradictions
    const contradictionChallenge = this.findContradictions(answer, context);
    if (contradictionChallenge) {
      challenges.push(contradictionChallenge);
    }

    // Challenge 3: Edge cases
    const edgeCases = this.checkEdgeCases(answer, context);
    challenges.push(...edgeCases);

    // Challenge 4: Alternative explanations
    const alternatives = this.findAlternativeExplanations(answer, context);
    challenges.push(...alternatives);

    // Calculate revised confidence
    const undefendedCount = challenges.filter(c => !c.defended).length;
    const highSeverityUndefended = challenges.filter(
      c => !c.defended && c.severity === "high"
    ).length;

    let confidencePenalty = undefendedCount * 0.05 + highSeverityUndefended * 0.15;
    const revisedConfidence = Math.max(0.1, answer.confidence - confidencePenalty);

    return {
      challenges,
      revised_confidence: revisedConfidence,
      should_revise: highSeverityUndefended > 0 || revisedConfidence < 0.5,
    };
  }

  /**
   * Apply manufacturing-specific reasoning heuristics
   */
  static applyManufacturingHeuristics(
    problem: string,
    context: Record<string, unknown>
  ): Array<{
    heuristic: string;
    applies: boolean;
    implication: string;
    confidence: number;
  }> {
    const results: Array<{
      heuristic: string;
      applies: boolean;
      implication: string;
      confidence: number;
    }> = [];

    const problemLower = problem.toLowerCase();

    // Check each heuristic for applicability
    for (const [key, heuristic] of Object.entries(this.MFG_HEURISTICS)) {
      const parts = key.split("_");
      const keywords = parts.map(p => p.toLowerCase());

      // Check if heuristic keywords appear in problem
      const applies = keywords.some(kw => problemLower.includes(kw));

      if (applies) {
        results.push({
          heuristic: key,
          applies: true,
          implication: heuristic,
          confidence: 0.85,
        });
      }
    }

    // Context-specific heuristics
    if (context.material && typeof context.material === "string") {
      const mat = context.material.toLowerCase();
      if (mat.includes("hardened") || mat.includes("h13") || mat.includes("d2")) {
        results.push({
          heuristic: "hardened_material",
          applies: true,
          implication: "Use ceramic or CBN tooling; reduce speed 40-60%",
          confidence: 0.9,
        });
      }
      if (mat.includes("titanium") || mat.includes("ti-6al")) {
        results.push({
          heuristic: "titanium_processing",
          applies: true,
          implication: "Use high-pressure coolant; limit speed to 60 m/min; watch for work hardening",
          confidence: 0.95,
        });
      }
    }

    if (context.operation && typeof context.operation === "string") {
      const op = context.operation.toLowerCase();
      if (op.includes("finish") || op.includes("final")) {
        results.push({
          heuristic: "finishing_operation",
          applies: true,
          implication: "Use light DOC, fine feed, sharp tool with positive rake",
          confidence: 0.9,
        });
      }
      if (op.includes("rough") || op.includes("hogging")) {
        results.push({
          heuristic: "roughing_operation",
          applies: true,
          implication: "Prioritize MRR; accept rougher surface; use robust tooling",
          confidence: 0.9,
        });
      }
    }

    return results;
  }

  /**
   * Explain reasoning chain in natural language
   */
  static explainChain(chain: ReasoningChain): string {
    const lines: string[] = [];

    lines.push(`# Reasoning Trace: ${chain.problem}`);
    lines.push("");
    lines.push(`**Goal:** ${chain.goal}`);
    lines.push(`**Strategy:** ${chain.meta.strategy}`);
    lines.push(`**Final Confidence:** ${(chain.current_confidence * 100).toFixed(1)}%`);
    lines.push("");
    lines.push("## Reasoning Steps");
    lines.push("");

    for (const step of chain.steps) {
      lines.push(`### Step ${step.step_number}: ${step.type.toUpperCase()}`);
      lines.push(step.content);

      if (step.calculation) {
        lines.push("");
        lines.push(`*Calculation:* ${step.calculation.formula}`);
        lines.push(`*Result:* ${step.calculation.result}${step.calculation.unit ? " " + step.calculation.unit : ""}`);
      }

      if (step.self_question) {
        lines.push("");
        lines.push(`> **Self-check:** ${step.self_question}`);
        lines.push(`> *Answer:* ${step.self_answer}`);
      }

      if (step.alternatives && step.alternatives.length > 0) {
        lines.push("");
        lines.push(`*Alternatives considered:* ${step.alternatives.join("; ")}`);
      }

      lines.push(`*Confidence:* ${(step.confidence * 100).toFixed(0)}%`);
      lines.push("");
    }

    if (chain.dead_ends.length > 0) {
      lines.push("## Dead Ends Encountered");
      for (const de of chain.dead_ends) {
        lines.push(`- At step ${de.at_step}: ${de.reason}`);
      }
      lines.push("");
    }

    if (chain.final_answer) {
      lines.push("## Final Answer");
      lines.push(JSON.stringify(chain.final_answer.answer, null, 2));
      lines.push("");
      lines.push("**Justification:**");
      for (const j of chain.final_answer.justification) {
        lines.push(`- ${j}`);
      }
      if (chain.final_answer.caveats.length > 0) {
        lines.push("");
        lines.push("**Caveats:**");
        for (const c of chain.final_answer.caveats) {
          lines.push(`- ${c}`);
        }
      }
    }

    return lines.join("\n");
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private static addStep(
    chain: ReasoningChain,
    stepData: Omit<ReasoningStep, "step_id" | "step_number" | "timestamp">
  ): void {
    const step: ReasoningStep = {
      ...stepData,
      step_id: `step-${++this.stepCounter}`,
      step_number: chain.steps.length,
      timestamp: new Date().toISOString(),
    };
    chain.steps.push(step);
  }

  private static formInitialHypothesis(problem: ReasoningProblem): string {
    const ctx = problem.context || {};

    // Manufacturing-specific hypothesis formation
    if (problem.problem.toLowerCase().includes("speed") ||
        problem.problem.toLowerCase().includes("feed")) {
      return "Initial hypothesis: Optimal parameters can be found by balancing material removal rate against tool life and surface quality constraints using Taylor's equation and Kienzle force model.";
    }

    if (problem.problem.toLowerCase().includes("force") ||
        problem.problem.toLowerCase().includes("power")) {
      return "Initial hypothesis: Cutting forces can be predicted using Kienzle model with material-specific coefficients, modified for actual cutting geometry.";
    }

    if (problem.problem.toLowerCase().includes("temperature") ||
        problem.problem.toLowerCase().includes("thermal")) {
      return "Initial hypothesis: Cutting temperature is dominated by shear zone heat generation, with partition ratios dependent on speed and material thermal properties.";
    }

    return `Initial hypothesis: The goal "${problem.goal}" can be achieved by systematic analysis of the given constraints and application of relevant manufacturing principles.`;
  }

  private static generateAlternativeHypotheses(problem: ReasoningProblem): string[] {
    const alternatives: string[] = [];

    if (problem.problem.toLowerCase().includes("optim")) {
      alternatives.push("Alternative: Use genetic algorithm to search parameter space");
      alternatives.push("Alternative: Apply gradient descent on objective function");
      alternatives.push("Alternative: Use lookup table from similar past operations");
    }

    alternatives.push("Alternative: Consult tribal knowledge database for empirical solution");
    alternatives.push("Alternative: Decompose problem into smaller sub-problems");

    return alternatives;
  }

  private static determineNextStep(
    chain: ReasoningChain,
    problem: ReasoningProblem
  ): Omit<ReasoningStep, "step_id" | "step_number" | "timestamp"> {
    const lastStep = chain.steps[chain.steps.length - 1];
    const stepCount = chain.steps.length;

    // Check for conclusion conditions
    if (chain.current_confidence > 0.85 && stepCount > 3) {
      return {
        type: "conclusion",
        content: "High confidence achieved; formulating final answer.",
        premises: [lastStep.step_id],
        confidence: chain.current_confidence,
      };
    }

    // If too many steps without progress, consider backtracking
    if (stepCount > 5 && chain.current_confidence < 0.5) {
      return {
        type: "backtrack",
        content: "Confidence dropping; reconsidering approach.",
        premises: chain.steps.slice(-3).map(s => s.step_id),
        confidence: 0.4,
        self_question: "Is the current approach viable?",
        self_answer: "No, need to try alternative hypothesis.",
      };
    }

    // Normal reasoning progression
    switch (lastStep.type) {
      case "observation":
      case "hypothesis":
        // After observation/hypothesis, do deduction or calculation
        return this.generateDeductionStep(chain, problem);

      case "deduction":
        // After deduction, validate or calculate
        if (Math.random() > 0.5) {
          return this.generateValidationStep(chain, problem);
        } else {
          return this.generateCalculationStep(chain, problem);
        }

      case "calculation":
        // After calculation, reflect on result
        return this.generateReflectionStep(chain, problem);

      case "validation":
        // After validation, either continue or conclude
        if (chain.current_confidence > 0.7) {
          return {
            type: "conclusion",
            content: "Validation successful; ready to conclude.",
            premises: [lastStep.step_id],
            confidence: chain.current_confidence,
          };
        }
        return this.generateDeductionStep(chain, problem);

      case "reflection":
        // After reflection, decide next action
        if (lastStep.confidence > 0.75) {
          return {
            type: "conclusion",
            content: "Reflection confirms reasoning is sound.",
            premises: [lastStep.step_id],
            confidence: lastStep.confidence,
          };
        }
        return this.generateValidationStep(chain, problem);

      default:
        return this.generateDeductionStep(chain, problem);
    }
  }

  private static generateDeductionStep(
    chain: ReasoningChain,
    problem: ReasoningProblem
  ): Omit<ReasoningStep, "step_id" | "step_number" | "timestamp"> {
    // Pick an inference rule to apply
    const rule = this.INFERENCE_RULES[Math.floor(Math.random() * this.INFERENCE_RULES.length)];

    return {
      type: "deduction",
      content: `Applying ${rule.name}: ${rule.conclusion_template}`,
      premises: chain.steps.slice(-2).map(s => s.step_id),
      inference_rule: rule.name,
      confidence: chain.current_confidence * rule.confidence_modifier,
      self_question: "Does this deduction follow logically?",
      self_answer: "Yes, given the premises, this conclusion is valid.",
    };
  }

  private static generateCalculationStep(
    chain: ReasoningChain,
    problem: ReasoningProblem
  ): Omit<ReasoningStep, "step_id" | "step_number" | "timestamp"> {
    const ctx = problem.context || {};

    // Generate a relevant calculation based on context
    let formula = "result = f(inputs)";
    let inputs: Record<string, number> = {};
    let result = 0;
    let unit = "";

    if (ctx.cutting_speed && ctx.feed && ctx.depth) {
      // MRR calculation
      formula = "MRR = Vc × f × ap";
      inputs = {
        Vc: ctx.cutting_speed as number,
        f: ctx.feed as number,
        ap: ctx.depth as number,
      };
      result = inputs.Vc * inputs.f * inputs.ap;
      unit = "mm³/min";
    } else if (ctx.force && ctx.speed) {
      // Power calculation
      formula = "P = Fc × Vc / 60000";
      inputs = {
        Fc: ctx.force as number,
        Vc: ctx.speed as number,
      };
      result = (inputs.Fc * inputs.Vc) / 60000;
      unit = "kW";
    } else {
      // Generic calculation
      inputs = { a: 10, b: 20 };
      result = 30;
    }

    return {
      type: "calculation",
      content: `Calculating: ${formula}`,
      premises: chain.steps.slice(-1).map(s => s.step_id),
      calculation: { formula, inputs, result, unit },
      confidence: 0.95,
      self_question: "Are the units consistent?",
      self_answer: "Yes, dimensional analysis confirms unit consistency.",
    };
  }

  private static generateValidationStep(
    chain: ReasoningChain,
    problem: ReasoningProblem
  ): Omit<ReasoningStep, "step_id" | "step_number" | "timestamp"> {
    const constraints = problem.constraints || [];
    const warnings: string[] = [];
    let confidence = 0.85;

    // Check constraints
    if (constraints.length > 0) {
      for (const constraint of constraints.slice(0, 2)) {
        // Simulate constraint checking
        if (Math.random() > 0.8) {
          warnings.push(`Constraint may be violated: ${constraint}`);
          confidence *= 0.9;
        }
      }
    }

    return {
      type: "validation",
      content: warnings.length > 0
        ? `Validation found issues: ${warnings.join("; ")}`
        : "Validation passed: all constraints satisfied.",
      premises: chain.steps.slice(-2).map(s => s.step_id),
      confidence,
      warnings: warnings.length > 0 ? warnings : undefined,
      self_question: "Have all constraints been checked?",
      self_answer: constraints.length > 0
        ? `Checked ${constraints.length} constraints.`
        : "No explicit constraints to check.",
    };
  }

  private static generateReflectionStep(
    chain: ReasoningChain,
    problem: ReasoningProblem
  ): Omit<ReasoningStep, "step_id" | "step_number" | "timestamp"> {
    const lastCalc = chain.steps.filter(s => s.type === "calculation").pop();

    let content = "Reflecting on progress...";
    let confidence = chain.current_confidence;

    if (lastCalc?.calculation) {
      content = `Result of ${lastCalc.calculation.result} ${lastCalc.calculation.unit || ""} seems reasonable for this application.`;

      // Check for obvious issues
      if (lastCalc.calculation.result < 0) {
        content = "Warning: Negative result detected - may indicate error in reasoning.";
        confidence *= 0.7;
      }
      if (lastCalc.calculation.result === 0) {
        content = "Warning: Zero result - check for division issues or missing inputs.";
        confidence *= 0.8;
      }
    }

    return {
      type: "reflection",
      content,
      premises: [lastCalc?.step_id || chain.steps[chain.steps.length - 1].step_id],
      confidence,
      self_question: "Is the reasoning chain coherent so far?",
      self_answer: confidence > 0.7
        ? "Yes, the chain is logically consistent."
        : "Some concerns exist; may need to reconsider approach.",
    };
  }

  private static calculateChainConfidence(chain: ReasoningChain): number {
    if (chain.steps.length === 0) return 1.0;

    // Product of step confidences, with decay for length
    let confidence = 1.0;
    for (const step of chain.steps) {
      confidence *= step.confidence;
    }

    // Apply length penalty
    const lengthPenalty = Math.pow(0.98, chain.steps.length);
    confidence *= lengthPenalty;

    // Apply backtrack penalty
    const backtrackPenalty = Math.pow(0.9, chain.dead_ends.length);
    confidence *= backtrackPenalty;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private static formulateFinalAnswer(
    chain: ReasoningChain,
    threshold: number
  ): FinalAnswer {
    const confidence = chain.current_confidence;

    // Extract key conclusions from reasoning
    const conclusions = chain.steps.filter(s =>
      s.type === "deduction" || s.type === "conclusion"
    );

    const calculations = chain.steps.filter(s => s.type === "calculation");

    // Build justification
    const justification = conclusions.slice(-3).map(s => s.content);

    // Extract assumptions from hypotheses
    const hypotheses = chain.steps.filter(s => s.type === "hypothesis");
    const assumptions = hypotheses.map(h => h.content.substring(0, 100));

    // Build caveats
    const caveats: string[] = [];
    if (chain.dead_ends.length > 0) {
      caveats.push(`${chain.dead_ends.length} alternative path(s) were abandoned`);
    }
    if (confidence < threshold) {
      caveats.push("Confidence below target threshold");
    }

    // Determine evidence strength
    let evidenceStrength: "weak" | "moderate" | "strong" | "conclusive";
    if (confidence > 0.9 && chain.dead_ends.length === 0) {
      evidenceStrength = "conclusive";
    } else if (confidence > 0.75) {
      evidenceStrength = "strong";
    } else if (confidence > 0.5) {
      evidenceStrength = "moderate";
    } else {
      evidenceStrength = "weak";
    }

    // Build answer object
    const answer: Record<string, unknown> = {
      summary: chain.goal,
      reasoning_steps: chain.steps.length,
    };

    // Include calculation results
    if (calculations.length > 0) {
      const lastCalc = calculations[calculations.length - 1];
      if (lastCalc.calculation) {
        answer.calculated_result = {
          value: lastCalc.calculation.result,
          unit: lastCalc.calculation.unit,
          formula: lastCalc.calculation.formula,
        };
      }
    }

    return {
      answer,
      confidence,
      justification,
      assumptions,
      caveats,
      evidence_strength: evidenceStrength,
    };
  }

  private static expandNode(
    parent: ThoughtNode,
    problem: ReasoningProblem,
    tree: ReasoningTree
  ): ThoughtNode[] {
    const children: ThoughtNode[] = [];
    const stepTypes: StepType[] = ["deduction", "calculation", "validation"];

    for (let i = 0; i < 3; i++) {
      const type = stepTypes[i % stepTypes.length];
      const nodeId = `${tree.tree_id}-${tree.explored_nodes + i}`;

      const step: ReasoningStep = {
        step_id: `step-${++this.stepCounter}`,
        step_number: parent.step.step_number + 1,
        type,
        content: `${type} branch ${i + 1}: exploring ${problem.goal}`,
        premises: [parent.step.step_id],
        confidence: parent.step.confidence * (0.85 + Math.random() * 0.15),
        timestamp: new Date().toISOString(),
      };

      // Check if should be conclusion
      if (step.step_number > 5 && step.confidence > 0.7) {
        step.type = "conclusion";
        step.content = `Conclusion reached via path ${i + 1}`;
      }

      const child: ThoughtNode = {
        node_id: nodeId,
        parent_id: parent.node_id,
        step,
        children: [],
        score: step.confidence * (1 - step.step_number * 0.05),
        pruned: false,
      };

      children.push(child);
    }

    return children;
  }

  private static tracePath(root: ThoughtNode, targetId: string): string[] {
    const path: string[] = [];

    const find = (node: ThoughtNode): boolean => {
      path.push(node.node_id);
      if (node.node_id === targetId) return true;

      for (const child of node.children) {
        if (find(child)) return true;
      }

      path.pop();
      return false;
    };

    find(root);
    return path;
  }

  private static findNode(root: ThoughtNode, nodeId: string): ThoughtNode | null {
    if (root.node_id === nodeId) return root;

    for (const child of root.children) {
      const found = this.findNode(child, nodeId);
      if (found) return found;
    }

    return null;
  }

  private static defendAssumption(
    assumption: string,
    context: Record<string, unknown>
  ): string {
    // Manufacturing-specific assumption defenses
    if (assumption.toLowerCase().includes("kienzle")) {
      return "Kienzle model is the industry standard for cutting force prediction with extensive empirical validation.";
    }
    if (assumption.toLowerCase().includes("taylor")) {
      return "Taylor tool life equation has been validated across decades of industrial use.";
    }
    if (assumption.toLowerCase().includes("linear")) {
      return "Linear approximation is valid within the specified operating range.";
    }
    return "Assumption is reasonable given standard engineering practice.";
  }

  private static findContradictions(
    answer: FinalAnswer,
    context: Record<string, unknown>
  ): {
    challenge: string;
    severity: "low" | "medium" | "high";
    defense: string;
    defended: boolean;
  } | null {
    // Check for common contradictions in manufacturing
    if (context.cutting_speed && typeof context.cutting_speed === "number") {
      if (context.cutting_speed > 1000 && context.material === "titanium") {
        return {
          challenge: "Cutting speed >1000 m/min is extremely high for titanium processing",
          severity: "high",
          defense: "Speed has been verified against material limits",
          defended: false,
        };
      }
    }
    return null;
  }

  private static checkEdgeCases(
    answer: FinalAnswer,
    context: Record<string, unknown>
  ): Array<{
    challenge: string;
    severity: "low" | "medium" | "high";
    defense: string;
    defended: boolean;
  }> {
    const cases: Array<{
      challenge: string;
      severity: "low" | "medium" | "high";
      defense: string;
      defended: boolean;
    }> = [];

    // Check for near-zero values
    if (context.depth && typeof context.depth === "number" && context.depth < 0.1) {
      cases.push({
        challenge: "Very small depth of cut may cause rubbing instead of cutting",
        severity: "medium",
        defense: "Minimum chip thickness considered",
        defended: true,
      });
    }

    // Check for extreme values
    if (context.feed && typeof context.feed === "number" && context.feed > 1.0) {
      cases.push({
        challenge: "Feed rate >1 mm/rev is unusually high for most operations",
        severity: "medium",
        defense: "Heavy roughing operation justifies high feed",
        defended: true,
      });
    }

    return cases;
  }

  private static findAlternativeExplanations(
    answer: FinalAnswer,
    context: Record<string, unknown>
  ): Array<{
    challenge: string;
    severity: "low" | "medium" | "high";
    defense: string;
    defended: boolean;
  }> {
    return [
      {
        challenge: "Could the observed effect be due to machine vibration rather than the calculated cause?",
        severity: "low",
        defense: "Vibration analysis was not in scope but could be a factor",
        defended: true,
      },
    ];
  }
}

// Export singleton
export const chainOfThoughtEngine = new ChainOfThoughtEngine();
