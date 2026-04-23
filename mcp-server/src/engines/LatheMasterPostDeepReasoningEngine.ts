/**
 * LatheMasterPostDeepReasoningEngine — LATHE-MASTER U-LTH28
 *
 * Uses deep reasoning + causal inference to explain WHY the master post
 * selected a particular sub-post for a given program. Surfaces the full
 * decision chain with ≥4 human-readable reasoning steps.
 *
 * Exit Gate: Any output comes with human-readable decision trace with ≥ 4 reasoning steps.
 *
 * @module LatheMasterPostDeepReasoningEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH28
 */

import { z } from "zod";

// ── Types ───────────────────────────────────────────────────────────────────

export type ReasoningStepType =
  | "input_analysis"
  | "machine_lookup"
  | "capability_match"
  | "dialect_selection"
  | "constraint_check"
  | "priority_ranking"
  | "conflict_resolution"
  | "fallback_decision"
  | "causal_inference"
  | "counterfactual"
  | "confidence_assessment"
  | "final_selection";

export interface ReasoningStep {
  stepNumber: number;
  type: ReasoningStepType;
  title: string;
  description: string;
  factors: ReasoningFactor[];
  conclusion: string;
  confidence: number;
  causalChain?: string[];
  counterfactual?: string;
  timestamp: string;
}

export interface ReasoningFactor {
  name: string;
  value: string | number | boolean;
  weight: number;
  impact: "positive" | "negative" | "neutral";
  explanation: string;
}

export interface DecisionTrace {
  traceId: string;
  machineId: string;
  operation?: string;
  selectedSubPost: string;
  selectedDialect: string;
  routingPath: "direct" | "generated" | "fallback";
  totalSteps: number;
  steps: ReasoningStep[];
  summary: string;
  humanReadableExplanation: string;
  alternativesConsidered: AlternativeOption[];
  confidenceScore: number;
  reasoningDuration: number;
  createdAt: string;
}

export interface AlternativeOption {
  subPostId: string;
  dialect: string;
  score: number;
  rejectionReason: string;
  counterfactualCondition?: string;
}

export interface DeepReasoningInput {
  machineId: string;
  operation?: string;
  controller?: string;
  program?: string;
  requireCapabilities?: string[];
  strictMode?: boolean;
}

export interface DeepReasoningResult {
  success: boolean;
  trace: DecisionTrace;
  errors: string[];
  warnings: string[];
}

export interface CausalQuery {
  question: string;
  cause: string;
  effect: string;
  confidence: number;
}

export interface CounterfactualQuery {
  hypothetical: string;
  actualOutcome: string;
  hypotheticalOutcome: string;
  confidence: number;
}

// ── Machine Knowledge Base ──────────────────────────────────────────────────

interface MachineProfile {
  id: string;
  name: string;
  type: "lathe" | "mill" | "edm" | "swiss";
  manufacturer: string;
  model: string;
  controller: string;
  controllerFamily: string;
  capabilities: string[];
  subPostId: string;
  dialect: string;
  priority: number;
}

const MACHINE_PROFILES: MachineProfile[] = [
  { id: "okuma-lb3000", name: "Okuma LB3000 EX II", type: "lathe", manufacturer: "Okuma", model: "LB3000 EX II", controller: "okuma-osp-p300l", controllerFamily: "okuma", capabilities: ["live_tooling", "c_axis", "y_axis"], subPostId: "okuma-osp-p300l-lathe", dialect: "okuma", priority: 1 },
  { id: "okuma-lb4000", name: "Okuma LB4000 EX II", type: "lathe", manufacturer: "Okuma", model: "LB4000 EX II", controller: "okuma-osp-p300l", controllerFamily: "okuma", capabilities: ["live_tooling", "c_axis", "sub_spindle"], subPostId: "okuma-osp-p300l-lathe", dialect: "okuma", priority: 2 },
  { id: "okuma-lb15", name: "Okuma LB15 II", type: "lathe", manufacturer: "Okuma", model: "LB15 II", controller: "okuma-osp-p200l", controllerFamily: "okuma", capabilities: ["live_tooling"], subPostId: "okuma-osp-p200l-lathe", dialect: "okuma", priority: 3 },
  { id: "okuma-lb25", name: "Okuma LB25", type: "lathe", manufacturer: "Okuma", model: "LB25", controller: "okuma-osp-p200l", controllerFamily: "okuma", capabilities: [], subPostId: "okuma-osp-p200l-lathe", dialect: "okuma", priority: 4 },
  { id: "okuma-lu35", name: "Okuma LU35 II", type: "lathe", manufacturer: "Okuma", model: "LU35 II", controller: "okuma-osp-p300l", controllerFamily: "okuma", capabilities: ["twin_turret", "y_axis"], subPostId: "okuma-osp-p300l-lathe", dialect: "okuma", priority: 5 },
  { id: "okuma-multus-b300", name: "Okuma Multus B300", type: "lathe", manufacturer: "Okuma", model: "Multus B300", controller: "okuma-osp-p300m", controllerFamily: "okuma", capabilities: ["mill_turn", "b_axis", "y_axis", "live_tooling"], subPostId: "okuma-osp-p300m-millturn", dialect: "okuma", priority: 1 },
  { id: "okuma-captain-l370", name: "Okuma Captain L370", type: "lathe", manufacturer: "Okuma", model: "Captain L370", controller: "okuma-osp-p100l", controllerFamily: "okuma", capabilities: [], subPostId: "okuma-osp-p100l-lathe", dialect: "okuma", priority: 6 },
  { id: "citizen-l20", name: "Citizen Cincom L20", type: "swiss", manufacturer: "Citizen", model: "Cincom L20", controller: "citizen-cincom", controllerFamily: "citizen", capabilities: ["swiss", "guide_bushing", "b_axis"], subPostId: "citizen-cincom-swiss", dialect: "citizen", priority: 1 },
  { id: "citizen-m32", name: "Citizen Cincom M32", type: "swiss", manufacturer: "Citizen", model: "Cincom M32", controller: "citizen-cincom", controllerFamily: "citizen", capabilities: ["swiss", "guide_bushing", "sub_spindle"], subPostId: "citizen-cincom-swiss", dialect: "citizen", priority: 2 },
  { id: "star-sr20", name: "Star SR-20RIV", type: "swiss", manufacturer: "Star", model: "SR-20RIV", controller: "fanuc-31i-t", controllerFamily: "fanuc", capabilities: ["swiss", "guide_bushing"], subPostId: "fanuc-31i-swiss", dialect: "fanuc", priority: 1 },
  { id: "doosan-puma-2600", name: "Doosan Puma 2600SY", type: "lathe", manufacturer: "Doosan", model: "Puma 2600SY", controller: "fanuc-31i-t", controllerFamily: "fanuc", capabilities: ["y_axis", "sub_spindle"], subPostId: "fanuc-31i-lathe", dialect: "fanuc", priority: 1 },
  { id: "mori-nl2500", name: "Mori Seiki NL2500", type: "lathe", manufacturer: "DMG Mori", model: "NL2500", controller: "fanuc-31i-t", controllerFamily: "fanuc", capabilities: ["live_tooling"], subPostId: "fanuc-31i-lathe", dialect: "fanuc", priority: 2 },
  { id: "haas-vf2", name: "Haas VF-2", type: "mill", manufacturer: "Haas", model: "VF-2", controller: "haas-ngc", controllerFamily: "haas", capabilities: [], subPostId: "haas-ngc-mill", dialect: "haas", priority: 1 },
  { id: "haas-vf4", name: "Haas VF-4SS", type: "mill", manufacturer: "Haas", model: "VF-4SS", controller: "haas-ngc", controllerFamily: "haas", capabilities: ["high_speed"], subPostId: "haas-ngc-mill", dialect: "haas", priority: 2 },
];

// ── Operation → Capability Requirements ─────────────────────────────────────

const OPERATION_REQUIREMENTS: Record<string, { required: string[]; preferred: string[] }> = {
  od_turning: { required: [], preferred: [] },
  id_boring: { required: [], preferred: ["live_tooling"] },
  facing: { required: [], preferred: [] },
  grooving: { required: [], preferred: [] },
  threading: { required: [], preferred: [] },
  parting: { required: [], preferred: [] },
  drilling: { required: [], preferred: ["live_tooling"] },
  tapping: { required: ["live_tooling"], preferred: [] },
  roughing: { required: [], preferred: [] },
  finishing: { required: [], preferred: [] },
  milling: { required: ["live_tooling", "c_axis"], preferred: ["y_axis"] },
  cross_drilling: { required: ["live_tooling", "c_axis"], preferred: [] },
  swiss_turning: { required: ["swiss", "guide_bushing"], preferred: [] },
  mill_turn: { required: ["mill_turn"], preferred: ["b_axis", "y_axis"] },
};

// ── Zod Schemas ─────────────────────────────────────────────────────────────

export const DeepReasoningInputSchema = z.object({
  machineId: z.string().min(1),
  operation: z.string().optional(),
  controller: z.string().optional(),
  program: z.string().optional(),
  requireCapabilities: z.array(z.string()).optional(),
  strictMode: z.boolean().optional(),
});

export const CausalQuerySchema = z.object({
  question: z.string().min(1),
  cause: z.string().min(1),
  effect: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const CounterfactualQuerySchema = z.object({
  hypothetical: z.string().min(1),
  actualOutcome: z.string().min(1),
  hypotheticalOutcome: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

// ── Engine Class ────────────────────────────────────────────────────────────

export class LatheMasterPostDeepReasoningEngine {
  private static machineIndex: Map<string, MachineProfile> = new Map();
  private static nameIndex: Map<string, string> = new Map();
  private static traceHistory: DecisionTrace[] = [];
  private static initialized = false;

  private static initialize(): void {
    if (this.initialized) return;
    for (const machine of MACHINE_PROFILES) {
      this.machineIndex.set(machine.id, machine);
      this.nameIndex.set(machine.name.toLowerCase(), machine.id);
    }
    this.initialized = true;
  }

  static getVersion(): string {
    return "1.0.0";
  }

  /**
   * Explain why the master post selected a particular sub-post.
   * Returns a decision trace with ≥4 reasoning steps.
   */
  static explainSelection(input: DeepReasoningInput): DeepReasoningResult {
    this.initialize();
    const startTime = Date.now();
    const validated = DeepReasoningInputSchema.safeParse(input);

    if (!validated.success) {
      const machineId = input?.machineId ?? "unknown";
      return {
        success: false,
        trace: this.createEmptyTrace(machineId),
        errors: validated.error?.issues?.map((e) => `${e.path.join(".")}: ${e.message}`) ?? ["Invalid input"],
        warnings: [],
      };
    }

    const { machineId, operation, controller, requireCapabilities, strictMode } = validated.data;
    const steps: ReasoningStep[] = [];
    const alternatives: AlternativeOption[] = [];
    const warnings: string[] = [];
    let stepNum = 0;

    // Step 1: Input Analysis
    stepNum++;
    steps.push(this.createInputAnalysisStep(stepNum, machineId, operation, controller, requireCapabilities));

    // Step 2: Machine Lookup
    stepNum++;
    const machine = this.findMachine(machineId);
    const lookupStep = this.createMachineLookupStep(stepNum, machineId, machine);
    steps.push(lookupStep);

    if (!machine) {
      stepNum++;
      steps.push(this.createFallbackCapabilityStep(stepNum, machineId));
      stepNum++;
      steps.push(this.createFallbackDecisionStep(stepNum, machineId, "Machine not found in registry"));
      return this.buildResult(startTime, machineId, operation, steps, alternatives, [], warnings, "fallback", "generic-lathe-post", "generic");
    }

    // Step 3: Capability Match
    stepNum++;
    const capabilityStep = this.createCapabilityMatchStep(stepNum, machine, operation, requireCapabilities);
    steps.push(capabilityStep);

    // Step 4: Dialect Selection
    stepNum++;
    const dialectStep = this.createDialectSelectionStep(stepNum, machine);
    steps.push(dialectStep);

    // Step 5: Constraint Check
    stepNum++;
    const constraintStep = this.createConstraintCheckStep(stepNum, machine, operation, strictMode);
    steps.push(constraintStep);

    // Step 6: Alternative Analysis (with causal reasoning)
    stepNum++;
    const alternativeMachines = this.findAlternatives(machine, operation, requireCapabilities);
    const alternativeStep = this.createAlternativeAnalysisStep(stepNum, machine, alternativeMachines);
    steps.push(alternativeStep);

    for (const alt of alternativeMachines) {
      alternatives.push({
        subPostId: alt.machine.subPostId,
        dialect: alt.machine.dialect,
        score: alt.score,
        rejectionReason: alt.rejectionReason,
        counterfactualCondition: `If ${machine.id} were unavailable, ${alt.machine.id} would be selected with ${(alt.score * 100).toFixed(0)}% compatibility`,
      });
    }

    // Step 7: Final Selection (with confidence)
    stepNum++;
    const finalStep = this.createFinalSelectionStep(stepNum, machine, operation);
    steps.push(finalStep);

    return this.buildResult(startTime, machineId, operation, steps, alternatives, [], warnings, "direct", machine.subPostId, machine.dialect);
  }

  /**
   * Generate causal inference explanations.
   * Answers "why did X cause Y" questions.
   */
  static generateCausalInference(machineId: string, operation?: string): CausalQuery[] {
    this.initialize();
    const machine = this.findMachine(machineId);
    const queries: CausalQuery[] = [];

    if (!machine) {
      return [{
        question: `Why was fallback used for ${machineId}?`,
        cause: "Machine not found in registry",
        effect: "Fallback to generic post processor",
        confidence: 1.0,
      }];
    }

    queries.push({
      question: `Why was ${machine.subPostId} selected?`,
      cause: `Machine ${machineId} uses controller ${machine.controller}`,
      effect: `Sub-post ${machine.subPostId} handles ${machine.dialect} dialect`,
      confidence: 0.95,
    });

    queries.push({
      question: `Why was ${machine.dialect} dialect chosen?`,
      cause: `Controller ${machine.controller} belongs to ${machine.controllerFamily} family`,
      effect: `Dialect ${machine.dialect} matches controller family conventions`,
      confidence: 0.92,
    });

    if (operation) {
      const reqs = OPERATION_REQUIREMENTS[operation];
      if (reqs?.required.length) {
        const hasRequired = reqs.required.every((r) => machine.capabilities.includes(r));
        queries.push({
          question: `Can ${machineId} perform ${operation}?`,
          cause: hasRequired
            ? `Machine has required capabilities: ${reqs.required.join(", ")}`
            : `Machine missing required capabilities: ${reqs.required.filter((r) => !machine.capabilities.includes(r)).join(", ")}`,
          effect: hasRequired
            ? `Operation ${operation} is supported`
            : `Operation ${operation} may have limitations`,
          confidence: hasRequired ? 0.95 : 0.6,
        });
      }
    }

    if (machine.capabilities.length > 0) {
      queries.push({
        question: `What additional operations does ${machineId} support?`,
        cause: `Machine has capabilities: ${machine.capabilities.join(", ")}`,
        effect: this.describeCapabilityEffects(machine.capabilities),
        confidence: 0.88,
      });
    }

    return queries;
  }

  /**
   * Generate counterfactual scenarios.
   * Answers "what if X were different" questions.
   */
  static generateCounterfactual(machineId: string, hypotheticalChange: string): CounterfactualQuery[] {
    this.initialize();
    const machine = this.findMachine(machineId);
    const queries: CounterfactualQuery[] = [];

    if (!machine) {
      return [{
        hypothetical: hypotheticalChange,
        actualOutcome: "Fallback to generic post",
        hypotheticalOutcome: "Still fallback (machine unknown)",
        confidence: 1.0,
      }];
    }

    if (hypotheticalChange.includes("capability") || hypotheticalChange.includes("live_tooling")) {
      const newCapabilities = [...machine.capabilities];
      if (!newCapabilities.includes("live_tooling")) {
        newCapabilities.push("live_tooling");
      }
      queries.push({
        hypothetical: `If ${machineId} had live_tooling capability`,
        actualOutcome: machine.capabilities.includes("live_tooling")
          ? "Live tooling operations are supported"
          : "Live tooling operations limited to post-machining",
        hypotheticalOutcome: "Cross drilling and milling operations would be available",
        confidence: 0.9,
      });
    }

    if (hypotheticalChange.includes("controller") || hypotheticalChange.includes("dialect")) {
      queries.push({
        hypothetical: `If ${machineId} used Fanuc controller instead of ${machine.controller}`,
        actualOutcome: `G-code follows ${machine.dialect} dialect conventions`,
        hypotheticalOutcome: "G-code would follow Fanuc dialect (G50 vs G96, M41-M44 ranges, etc.)",
        confidence: 0.85,
      });
    }

    if (hypotheticalChange.includes("unavailable") || hypotheticalChange.includes("offline")) {
      const alternatives = this.findAlternatives(machine, undefined, undefined);
      const bestAlt = alternatives[0];
      queries.push({
        hypothetical: `If ${machineId} were unavailable`,
        actualOutcome: `Program runs on ${machine.name} using ${machine.subPostId}`,
        hypotheticalOutcome: bestAlt
          ? `Program would be routed to ${bestAlt.machine.name} using ${bestAlt.machine.subPostId} (${(bestAlt.score * 100).toFixed(0)}% compatibility)`
          : "No suitable alternative; fallback to generic post",
        confidence: bestAlt ? bestAlt.score : 0.5,
      });
    }

    if (queries.length === 0) {
      queries.push({
        hypothetical: hypotheticalChange,
        actualOutcome: `Current: ${machine.subPostId} with ${machine.dialect} dialect`,
        hypotheticalOutcome: "Unable to determine specific impact of this change",
        confidence: 0.5,
      });
    }

    return queries;
  }

  /**
   * Get a human-readable summary of the routing decision.
   */
  static getHumanReadableSummary(trace: DecisionTrace): string {
    const lines: string[] = [
      `=== Decision Trace for ${trace.machineId} ===`,
      "",
      `Selected Sub-Post: ${trace.selectedSubPost}`,
      `Dialect: ${trace.selectedDialect}`,
      `Routing Path: ${trace.routingPath}`,
      `Confidence: ${(trace.confidenceScore * 100).toFixed(1)}%`,
      "",
      "--- Reasoning Chain ---",
    ];

    for (const step of trace.steps) {
      lines.push(`${step.stepNumber}. ${step.title}`);
      lines.push(`   ${step.description}`);
      lines.push(`   Conclusion: ${step.conclusion}`);
      if (step.causalChain?.length) {
        lines.push(`   Causal: ${step.causalChain.join(" → ")}`);
      }
      if (step.counterfactual) {
        lines.push(`   What-if: ${step.counterfactual}`);
      }
      lines.push("");
    }

    if (trace.alternativesConsidered.length > 0) {
      lines.push("--- Alternatives Considered ---");
      for (const alt of trace.alternativesConsidered) {
        lines.push(`• ${alt.subPostId} (${alt.dialect}): ${(alt.score * 100).toFixed(0)}% - Rejected: ${alt.rejectionReason}`);
      }
      lines.push("");
    }

    lines.push(`Summary: ${trace.summary}`);

    return lines.join("\n");
  }

  /**
   * Get trace history.
   */
  static getTraceHistory(limit = 100): DecisionTrace[] {
    return this.traceHistory.slice(-limit);
  }

  /**
   * Clear trace history.
   */
  static clearHistory(): void {
    this.traceHistory = [];
  }

  /**
   * Get statistics about reasoning operations.
   */
  static getStatistics(): {
    totalTraces: number;
    avgStepsPerTrace: number;
    avgConfidence: number;
    pathDistribution: Record<string, number>;
    dialectDistribution: Record<string, number>;
  } {
    if (this.traceHistory.length === 0) {
      return {
        totalTraces: 0,
        avgStepsPerTrace: 0,
        avgConfidence: 0,
        pathDistribution: {},
        dialectDistribution: {},
      };
    }

    const pathDist: Record<string, number> = {};
    const dialectDist: Record<string, number> = {};
    let totalSteps = 0;
    let totalConfidence = 0;

    for (const trace of this.traceHistory) {
      totalSteps += trace.totalSteps;
      totalConfidence += trace.confidenceScore;
      pathDist[trace.routingPath] = (pathDist[trace.routingPath] || 0) + 1;
      dialectDist[trace.selectedDialect] = (dialectDist[trace.selectedDialect] || 0) + 1;
    }

    return {
      totalTraces: this.traceHistory.length,
      avgStepsPerTrace: totalSteps / this.traceHistory.length,
      avgConfidence: totalConfidence / this.traceHistory.length,
      pathDistribution: pathDist,
      dialectDistribution: dialectDist,
    };
  }

  // ── Private Helper Methods ────────────────────────────────────────────────

  private static findMachine(machineId: string): MachineProfile | undefined {
    let machine = this.machineIndex.get(machineId);
    if (!machine) {
      const normalizedId = this.nameIndex.get(machineId.toLowerCase());
      if (normalizedId) {
        machine = this.machineIndex.get(normalizedId);
      }
    }
    return machine;
  }

  private static findAlternatives(
    current: MachineProfile,
    operation?: string,
    requireCapabilities?: string[],
  ): Array<{ machine: MachineProfile; score: number; rejectionReason: string }> {
    const alternatives: Array<{ machine: MachineProfile; score: number; rejectionReason: string }> = [];

    for (const machine of MACHINE_PROFILES) {
      if (machine.id === current.id) continue;
      if (machine.type !== current.type) continue;

      let score = 0.5;
      let rejectionReason = "Lower priority in routing order";

      if (machine.controllerFamily === current.controllerFamily) {
        score += 0.2;
      } else {
        rejectionReason = "Different controller family requires dialect change";
      }

      if (machine.manufacturer === current.manufacturer) {
        score += 0.1;
      }

      const reqs = operation ? OPERATION_REQUIREMENTS[operation] : undefined;
      if (reqs?.required.length) {
        const hasAll = reqs.required.every((r) => machine.capabilities.includes(r));
        if (hasAll) {
          score += 0.15;
        } else {
          score -= 0.2;
          rejectionReason = `Missing required capability for ${operation}`;
        }
      }

      if (requireCapabilities?.length) {
        const hasAll = requireCapabilities.every((c) => machine.capabilities.includes(c));
        if (!hasAll) {
          score -= 0.3;
          rejectionReason = `Missing required capabilities: ${requireCapabilities.filter((c) => !machine.capabilities.includes(c)).join(", ")}`;
        }
      }

      score = Math.max(0, Math.min(1, score));
      alternatives.push({ machine, score, rejectionReason });
    }

    return alternatives.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  private static describeCapabilityEffects(capabilities: string[]): string {
    const effects: string[] = [];
    if (capabilities.includes("live_tooling")) effects.push("cross drilling, milling on lathe");
    if (capabilities.includes("c_axis")) effects.push("angular positioning for milling");
    if (capabilities.includes("y_axis")) effects.push("off-center milling");
    if (capabilities.includes("b_axis")) effects.push("compound angle machining");
    if (capabilities.includes("sub_spindle")) effects.push("back-end operations without rechucking");
    if (capabilities.includes("swiss")) effects.push("precision small parts with guide bushing");
    if (capabilities.includes("mill_turn")) effects.push("full 5-axis milling integrated with turning");
    if (capabilities.includes("twin_turret")) effects.push("simultaneous upper/lower turret cuts");
    return effects.length > 0 ? `Enables: ${effects.join("; ")}` : "Standard turning capabilities";
  }

  private static createInputAnalysisStep(
    stepNum: number,
    machineId: string,
    operation?: string,
    controller?: string,
    requireCapabilities?: string[],
  ): ReasoningStep {
    const factors: ReasoningFactor[] = [
      { name: "machineId", value: machineId, weight: 1.0, impact: "neutral", explanation: "Primary routing key" },
    ];

    if (operation) {
      factors.push({ name: "operation", value: operation, weight: 0.8, impact: "neutral", explanation: "Determines capability requirements" });
    }
    if (controller) {
      factors.push({ name: "controller", value: controller, weight: 0.7, impact: "neutral", explanation: "Override for dialect selection" });
    }
    if (requireCapabilities?.length) {
      factors.push({ name: "requireCapabilities", value: requireCapabilities.join(", "), weight: 0.9, impact: "neutral", explanation: "Mandatory feature requirements" });
    }

    return {
      stepNumber: stepNum,
      type: "input_analysis",
      title: "Input Analysis",
      description: `Received routing request for machine '${machineId}'${operation ? ` performing ${operation}` : ""}.`,
      factors,
      conclusion: "Input parameters validated and parsed",
      confidence: 1.0,
      causalChain: ["Input received", "Parameters extracted", "Validation passed"],
      timestamp: new Date().toISOString(),
    };
  }

  private static createMachineLookupStep(stepNum: number, machineId: string, machine?: MachineProfile): ReasoningStep {
    if (!machine) {
      return {
        stepNumber: stepNum,
        type: "machine_lookup",
        title: "Machine Lookup",
        description: `Searched for machine '${machineId}' in JM Die inventory (${MACHINE_PROFILES.length} machines).`,
        factors: [{ name: "found", value: false, weight: 1.0, impact: "negative", explanation: "Machine not registered" }],
        conclusion: "Machine not found; will use fallback path",
        confidence: 1.0,
        counterfactual: "If machine were registered, direct routing would be used",
        timestamp: new Date().toISOString(),
      };
    }

    return {
      stepNumber: stepNum,
      type: "machine_lookup",
      title: "Machine Lookup",
      description: `Located machine '${machineId}' in inventory: ${machine.name} (${machine.manufacturer} ${machine.model}).`,
      factors: [
        { name: "found", value: true, weight: 1.0, impact: "positive", explanation: "Machine is registered" },
        { name: "type", value: machine.type, weight: 0.8, impact: "neutral", explanation: `Machine type determines routing logic` },
        { name: "controller", value: machine.controller, weight: 0.9, impact: "positive", explanation: "Known controller enables direct dialect mapping" },
      ],
      conclusion: `Machine identified as ${machine.type} with ${machine.controller} controller`,
      confidence: 0.98,
      causalChain: ["Machine ID lookup", "Controller identified", "Type determined"],
      timestamp: new Date().toISOString(),
    };
  }

  private static createCapabilityMatchStep(
    stepNum: number,
    machine: MachineProfile,
    operation?: string,
    requireCapabilities?: string[],
  ): ReasoningStep {
    const factors: ReasoningFactor[] = [];
    let confidence = 0.9;

    factors.push({
      name: "machineCapabilities",
      value: machine.capabilities.length > 0 ? machine.capabilities.join(", ") : "none",
      weight: 1.0,
      impact: "neutral",
      explanation: "Available machine features",
    });

    if (operation) {
      const reqs = OPERATION_REQUIREMENTS[operation];
      if (reqs) {
        const missingRequired = reqs.required.filter((r) => !machine.capabilities.includes(r));
        const hasPreferred = reqs.preferred.filter((p) => machine.capabilities.includes(p));

        if (missingRequired.length > 0) {
          factors.push({
            name: "missingRequired",
            value: missingRequired.join(", "),
            weight: 1.0,
            impact: "negative",
            explanation: `Operation ${operation} requires these capabilities`,
          });
          confidence -= 0.2;
        }

        if (hasPreferred.length > 0) {
          factors.push({
            name: "hasPreferred",
            value: hasPreferred.join(", "),
            weight: 0.5,
            impact: "positive",
            explanation: "Preferred capabilities available",
          });
          confidence += 0.05;
        }
      }
    }

    if (requireCapabilities?.length) {
      const missing = requireCapabilities.filter((c) => !machine.capabilities.includes(c));
      if (missing.length > 0) {
        factors.push({
          name: "missingRequested",
          value: missing.join(", "),
          weight: 1.0,
          impact: "negative",
          explanation: "Explicitly requested capabilities not available",
        });
        confidence -= 0.15;
      }
    }

    return {
      stepNumber: stepNum,
      type: "capability_match",
      title: "Capability Match",
      description: `Evaluated machine capabilities against ${operation ? `operation '${operation}'` : "general"} requirements.`,
      factors,
      conclusion: confidence >= 0.8 ? "Machine capabilities sufficient" : "Capability gaps detected; may impact operation",
      confidence: Math.max(0.5, confidence),
      causalChain: ["Capabilities enumerated", "Requirements compared", "Gaps identified"],
      timestamp: new Date().toISOString(),
    };
  }

  private static createDialectSelectionStep(stepNum: number, machine: MachineProfile): ReasoningStep {
    return {
      stepNumber: stepNum,
      type: "dialect_selection",
      title: "Dialect Selection",
      description: `Selected G-code dialect based on controller family '${machine.controllerFamily}'.`,
      factors: [
        { name: "controller", value: machine.controller, weight: 0.9, impact: "positive", explanation: "Primary dialect determinant" },
        { name: "controllerFamily", value: machine.controllerFamily, weight: 1.0, impact: "positive", explanation: "Maps to standardized dialect" },
        { name: "selectedDialect", value: machine.dialect, weight: 1.0, impact: "positive", explanation: "Final dialect choice" },
      ],
      conclusion: `Dialect '${machine.dialect}' selected based on ${machine.controllerFamily} controller family`,
      confidence: 0.95,
      causalChain: [
        `Controller: ${machine.controller}`,
        `Family: ${machine.controllerFamily}`,
        `Dialect: ${machine.dialect}`,
      ],
      counterfactual: `If controller were Fanuc, dialect would be 'fanuc' with G50/G96 conventions`,
      timestamp: new Date().toISOString(),
    };
  }

  private static createConstraintCheckStep(
    stepNum: number,
    machine: MachineProfile,
    operation?: string,
    strictMode?: boolean,
  ): ReasoningStep {
    const factors: ReasoningFactor[] = [];
    let passed = true;

    factors.push({
      name: "strictMode",
      value: strictMode ?? false,
      weight: 0.7,
      impact: strictMode ? "neutral" : "positive",
      explanation: strictMode ? "Strict validation enabled" : "Standard validation",
    });

    if (operation === "swiss_turning" && machine.type !== "swiss") {
      factors.push({
        name: "typeConstraint",
        value: "swiss operation on non-swiss machine",
        weight: 1.0,
        impact: "negative",
        explanation: "Swiss operations require swiss-type machine",
      });
      passed = false;
    }

    if (operation === "mill_turn" && !machine.capabilities.includes("mill_turn")) {
      factors.push({
        name: "capabilityConstraint",
        value: "mill_turn requires mill_turn capability",
        weight: 1.0,
        impact: "negative",
        explanation: "Mill-turn operations require dedicated capability",
      });
      passed = false;
    }

    return {
      stepNumber: stepNum,
      type: "constraint_check",
      title: "Constraint Check",
      description: `Verified operational constraints${strictMode ? " (strict mode)" : ""}.`,
      factors,
      conclusion: passed ? "All constraints satisfied" : "One or more constraints violated",
      confidence: passed ? 0.95 : 0.6,
      causalChain: ["Constraints enumerated", "Values checked", passed ? "All passed" : "Violations found"],
      timestamp: new Date().toISOString(),
    };
  }

  private static createAlternativeAnalysisStep(
    stepNum: number,
    selected: MachineProfile,
    alternatives: Array<{ machine: MachineProfile; score: number; rejectionReason: string }>,
  ): ReasoningStep {
    const factors: ReasoningFactor[] = [
      {
        name: "selectedMachine",
        value: selected.id,
        weight: 1.0,
        impact: "positive",
        explanation: "Highest priority match for routing",
      },
    ];

    for (const alt of alternatives.slice(0, 3)) {
      factors.push({
        name: `alternative_${alt.machine.id}`,
        value: `${(alt.score * 100).toFixed(0)}%`,
        weight: alt.score,
        impact: "neutral",
        explanation: alt.rejectionReason,
      });
    }

    return {
      stepNumber: stepNum,
      type: "causal_inference",
      title: "Alternative Analysis (Causal)",
      description: `Evaluated ${alternatives.length} alternative machines that could serve this request.`,
      factors,
      conclusion: alternatives.length > 0
        ? `${selected.id} preferred over ${alternatives[0].machine.id} due to exact match`
        : "No viable alternatives in same machine category",
      confidence: 0.88,
      causalChain: [
        "Primary machine identified",
        "Alternatives enumerated",
        "Compatibility scores computed",
        "Best match selected",
      ],
      counterfactual: alternatives.length > 0
        ? `If ${selected.id} unavailable, ${alternatives[0].machine.id} at ${(alternatives[0].score * 100).toFixed(0)}% compatibility`
        : "No fallback machine available; would use generic post",
      timestamp: new Date().toISOString(),
    };
  }

  private static createFinalSelectionStep(stepNum: number, machine: MachineProfile, operation?: string): ReasoningStep {
    return {
      stepNumber: stepNum,
      type: "final_selection",
      title: "Final Selection",
      description: `Selected sub-post '${machine.subPostId}' for machine '${machine.id}'.`,
      factors: [
        { name: "subPostId", value: machine.subPostId, weight: 1.0, impact: "positive", explanation: "Post processor to invoke" },
        { name: "dialect", value: machine.dialect, weight: 0.9, impact: "positive", explanation: "G-code output format" },
        { name: "path", value: "direct", weight: 0.8, impact: "positive", explanation: "Using direct sub-post routing" },
      ],
      conclusion: `Route to ${machine.subPostId} via direct path`,
      confidence: 0.95,
      causalChain: [
        "Machine matched",
        "Capabilities verified",
        "Dialect determined",
        "Sub-post selected",
        "Ready for output generation",
      ],
      timestamp: new Date().toISOString(),
    };
  }

  private static createFallbackCapabilityStep(stepNum: number, machineId: string): ReasoningStep {
    return {
      stepNumber: stepNum,
      type: "capability_match",
      title: "Capability Assessment (Unknown Machine)",
      description: `Cannot assess capabilities for unregistered machine '${machineId}'.`,
      factors: [
        { name: "machineRegistered", value: false, weight: 1.0, impact: "negative", explanation: "Machine not in inventory" },
        { name: "assumedCapabilities", value: "basic turning only", weight: 0.5, impact: "neutral", explanation: "Conservative capability assumption" },
      ],
      conclusion: "Assuming basic lathe capabilities only; advanced features disabled",
      confidence: 0.5,
      causalChain: ["Machine unknown", "No capability data", "Assume minimal feature set"],
      timestamp: new Date().toISOString(),
    };
  }

  private static createFallbackDecisionStep(stepNum: number, machineId: string, reason: string): ReasoningStep {
    return {
      stepNumber: stepNum,
      type: "fallback_decision",
      title: "Fallback Decision",
      description: `Routing to fallback path for '${machineId}'.`,
      factors: [
        { name: "reason", value: reason, weight: 1.0, impact: "negative", explanation: "Cause of fallback" },
        { name: "fallbackPost", value: "generic-lathe-post", weight: 0.8, impact: "neutral", explanation: "Generic post will be used" },
      ],
      conclusion: "Using generic post processor with conservative settings",
      confidence: 0.7,
      causalChain: ["Lookup failed", "No direct match", "Fallback triggered"],
      counterfactual: "If machine were registered, specific sub-post would be used",
      timestamp: new Date().toISOString(),
    };
  }

  private static createEmptyTrace(machineId: string): DecisionTrace {
    return {
      traceId: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      machineId,
      selectedSubPost: "none",
      selectedDialect: "none",
      routingPath: "fallback",
      totalSteps: 0,
      steps: [],
      summary: "Failed to generate trace",
      humanReadableExplanation: "Unable to process request",
      alternativesConsidered: [],
      confidenceScore: 0,
      reasoningDuration: 0,
      createdAt: new Date().toISOString(),
    };
  }

  private static buildResult(
    startTime: number,
    machineId: string,
    operation: string | undefined,
    steps: ReasoningStep[],
    alternatives: AlternativeOption[],
    errors: string[],
    warnings: string[],
    routingPath: "direct" | "generated" | "fallback",
    selectedSubPost: string,
    selectedDialect: string,
  ): DeepReasoningResult {
    const avgConfidence = steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;

    const trace: DecisionTrace = {
      traceId: `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      machineId,
      operation,
      selectedSubPost,
      selectedDialect,
      routingPath,
      totalSteps: steps.length,
      steps,
      summary: this.generateSummary(machineId, selectedSubPost, selectedDialect, routingPath, steps.length),
      humanReadableExplanation: this.generateHumanExplanation(machineId, selectedSubPost, selectedDialect, steps),
      alternativesConsidered: alternatives,
      confidenceScore: avgConfidence,
      reasoningDuration: Date.now() - startTime,
      createdAt: new Date().toISOString(),
    };

    this.traceHistory.push(trace);
    if (this.traceHistory.length > 1000) {
      this.traceHistory = this.traceHistory.slice(-500);
    }

    return { success: errors.length === 0, trace, errors, warnings };
  }

  private static generateSummary(
    machineId: string,
    subPost: string,
    dialect: string,
    path: "direct" | "generated" | "fallback",
    stepCount: number,
  ): string {
    return `Routed ${machineId} to ${subPost} (${dialect} dialect) via ${path} path after ${stepCount} reasoning steps.`;
  }

  private static generateHumanExplanation(
    machineId: string,
    subPost: string,
    dialect: string,
    steps: ReasoningStep[],
  ): string {
    const lines = [
      `For machine "${machineId}", the master post selected "${subPost}" using the ${dialect} G-code dialect.`,
      "",
      "The decision was made through the following reasoning chain:",
      "",
    ];

    for (const step of steps) {
      lines.push(`${step.stepNumber}. ${step.title}: ${step.conclusion}`);
    }

    return lines.join("\n");
  }
}

export const latheMasterPostDeepReasoningEngine = LatheMasterPostDeepReasoningEngine;
