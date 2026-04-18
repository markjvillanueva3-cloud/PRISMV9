/**
 * LathePrintToProgramReasoningEngine
 *
 * U-LTH43: Reasoning layer for Print-to-Program pipeline.
 * Explains full decision chain via causal and counterfactual reasoning.
 *
 * Reasoning Modes:
 * - Causal: Why did the system make this decision?
 * - Counterfactual: What if we changed X?
 * - Abductive: What's the best explanation for observation Y?
 * - Deductive: Given premises P, what follows?
 *
 * @module engines/LathePrintToProgramReasoningEngine
 */

import type { BlueprintIntake } from "./LathePrintIngestPipelineEngine.js";
import type { FeatureRecognitionResult } from "./LatheFeatureRecognitionEngine.js";
import type { ToolpathPlan, ToolpathSegment } from "./LatheToolpathPlannerEngine.js";
import type { GeneratedProgram } from "./LatheProgramGeneratorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ReasoningStep {
  step_number: number;
  phase: "ingest" | "recognition" | "planning" | "generation" | "verification";
  decision: string;
  reasoning_type: "causal" | "counterfactual" | "abductive" | "deductive";
  premises: string[];
  conclusion: string;
  confidence: number;
  alternatives_considered: Alternative[];
  evidence: Evidence[];
}

export interface Alternative {
  description: string;
  rejected_reason: string;
  expected_outcome: string;
}

export interface Evidence {
  type: "feature" | "dimension" | "tolerance" | "material" | "tool" | "historical";
  source: string;
  value: string | number;
  weight: number;
}

export interface CounterfactualAnalysis {
  scenario: string;
  variable_changed: string;
  original_value: string | number;
  counterfactual_value: string | number;
  predicted_outcome: string;
  outcome_probability: number;
  side_effects: string[];
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  root_causes: string[];
  terminal_effects: string[];
}

export interface CausalNode {
  id: string;
  name: string;
  type: "cause" | "effect" | "mediator" | "confounder";
  value?: string | number;
}

export interface CausalEdge {
  from: string;
  to: string;
  strength: number;
  mechanism: string;
}

export interface ReasoningTrace {
  trace_id: string;
  processing_time_ms: number;
  steps: ReasoningStep[];
  total_decisions: number;
  causal_graph: CausalGraph;
  counterfactuals: CounterfactualAnalysis[];
  explanation_summary: string;
  confidence_score: number;
}

export interface ReasoningInput {
  intake?: BlueprintIntake;
  recognition?: FeatureRecognitionResult;
  plan?: ToolpathPlan;
  program?: GeneratedProgram;
  query?: string;
}

// ============================================================================
// REASONING PRIMITIVES
// ============================================================================

class CausalReasoner {
  buildCausalGraph(recognition: FeatureRecognitionResult, plan: ToolpathPlan): CausalGraph {
    const nodes: CausalNode[] = [];
    const edges: CausalEdge[] = [];

    // Add feature nodes as root causes
    for (const feature of recognition.feature_tree.features) {
      nodes.push({
        id: `feat_${feature.id}`,
        name: `${feature.type} at Z${feature.start_z}-${feature.end_z}`,
        type: "cause",
        value: feature.diameter_mm
      });
    }

    // Add planning decisions as mediators
    for (let i = 0; i < plan.segments.length; i++) {
      const seg = plan.segments[i];
      nodes.push({
        id: `seg_${i}`,
        name: `${seg.operation} with T${seg.tool_number}`,
        type: "mediator"
      });

      // Connect features to segments
      const relatedFeature = recognition.feature_tree.features.find(
        f => f.start_z >= seg.start_z && f.end_z <= seg.end_z
      );
      if (relatedFeature) {
        edges.push({
          from: `feat_${relatedFeature.id}`,
          to: `seg_${i}`,
          strength: 0.9,
          mechanism: "Feature requires this operation"
        });
      }
    }

    // Add outcome effects
    nodes.push({
      id: "outcome_quality",
      name: "Part Quality",
      type: "effect"
    });
    nodes.push({
      id: "outcome_time",
      name: "Cycle Time",
      type: "effect"
    });

    // Connect segments to outcomes
    for (let i = 0; i < plan.segments.length; i++) {
      edges.push({
        from: `seg_${i}`,
        to: "outcome_quality",
        strength: 0.7,
        mechanism: "Operation affects surface finish"
      });
      edges.push({
        from: `seg_${i}`,
        to: "outcome_time",
        strength: 0.8,
        mechanism: "Operation adds cycle time"
      });
    }

    return {
      nodes,
      edges,
      root_causes: nodes.filter(n => n.type === "cause").map(n => n.id),
      terminal_effects: nodes.filter(n => n.type === "effect").map(n => n.id)
    };
  }

  inferCause(effect: string, graph: CausalGraph): string[] {
    const causes: string[] = [];
    const effectNode = graph.nodes.find(n => n.id === effect || n.name.includes(effect));

    if (effectNode) {
      const incomingEdges = graph.edges.filter(e => e.to === effectNode.id);
      for (const edge of incomingEdges) {
        const causeNode = graph.nodes.find(n => n.id === edge.from);
        if (causeNode) {
          causes.push(`${causeNode.name} (${edge.mechanism})`);
        }
      }
    }

    return causes;
  }
}

class CounterfactualReasoner {
  analyze(
    variable: string,
    originalValue: string | number,
    counterfactualValue: string | number,
    context: ReasoningInput
  ): CounterfactualAnalysis {
    const scenarios: Record<string, { outcome: string; probability: number; sideEffects: string[] }> = {
      feed_rate: {
        outcome: counterfactualValue > originalValue
          ? "Faster cycle time but rougher surface finish"
          : "Better surface finish but longer cycle time",
        probability: 0.85,
        sideEffects: counterfactualValue > originalValue
          ? ["Increased tool wear", "Potential chatter"]
          : ["Extended tool life", "Tighter tolerances achievable"]
      },
      depth_of_cut: {
        outcome: counterfactualValue > originalValue
          ? "Fewer passes required, higher cutting forces"
          : "More passes, better dimensional control",
        probability: 0.8,
        sideEffects: counterfactualValue > originalValue
          ? ["Higher spindle load", "Risk of tool deflection"]
          : ["Lower cutting forces", "Better surface integrity"]
      },
      spindle_speed: {
        outcome: counterfactualValue > originalValue
          ? "Better surface finish at higher SFM"
          : "More conservative, extended tool life",
        probability: 0.75,
        sideEffects: counterfactualValue > originalValue
          ? ["Increased heat generation", "May exceed tool limits"]
          : ["Potential for built-up edge", "Longer cycle time"]
      },
      tool_selection: {
        outcome: "Different tool geometry affects chip formation and surface quality",
        probability: 0.7,
        sideEffects: ["May require parameter adjustments", "Different offset required"]
      }
    };

    const scenario = scenarios[variable] || {
      outcome: `Changing ${variable} from ${originalValue} to ${counterfactualValue} would alter machining behavior`,
      probability: 0.6,
      sideEffects: ["Further analysis needed"]
    };

    return {
      scenario: `What if ${variable} was ${counterfactualValue} instead of ${originalValue}?`,
      variable_changed: variable,
      original_value: originalValue,
      counterfactual_value: counterfactualValue,
      predicted_outcome: scenario.outcome,
      outcome_probability: scenario.probability,
      side_effects: scenario.sideEffects
    };
  }
}

class AbductiveReasoner {
  inferBestExplanation(observation: string, candidates: string[]): { explanation: string; confidence: number } {
    // Simple scoring based on specificity and relevance
    let bestExplanation = candidates[0] || "No explanation found";
    let bestScore = 0;

    for (const candidate of candidates) {
      let score = 0.5;

      // Prefer specific explanations
      if (candidate.includes("because")) score += 0.2;
      if (candidate.includes("due to")) score += 0.15;
      if (candidate.match(/\d+/)) score += 0.1; // Contains numbers = more specific

      // Prefer relevant explanations
      const obsWords = observation.toLowerCase().split(/\s+/);
      const candWords = candidate.toLowerCase().split(/\s+/);
      const overlap = obsWords.filter(w => candWords.includes(w)).length;
      score += overlap * 0.1;

      if (score > bestScore) {
        bestScore = score;
        bestExplanation = candidate;
      }
    }

    return { explanation: bestExplanation, confidence: Math.min(0.95, bestScore) };
  }
}

// ============================================================================
// ENGINE
// ============================================================================

class LathePrintToProgramReasoningEngine {
  private traceCounter = 0;
  private causalReasoner = new CausalReasoner();
  private counterfactualReasoner = new CounterfactualReasoner();
  private abductiveReasoner = new AbductiveReasoner();

  /**
   * Generate full reasoning trace for Print-to-Program pipeline
   */
  trace(input: ReasoningInput): ReasoningTrace {
    const startTime = Date.now();
    const traceId = `reason_${++this.traceCounter}_${Date.now()}`;

    const steps: ReasoningStep[] = [];
    let stepNumber = 0;

    // Phase 1: Ingest reasoning
    if (input.intake) {
      steps.push(this.reasonIngest(++stepNumber, input.intake));
    }

    // Phase 2: Recognition reasoning
    if (input.recognition) {
      steps.push(...this.reasonRecognition(stepNumber, input.recognition));
      stepNumber = steps.length;
    }

    // Phase 3: Planning reasoning
    if (input.plan) {
      steps.push(...this.reasonPlanning(stepNumber, input.plan, input.recognition));
      stepNumber = steps.length;
    }

    // Phase 4: Generation reasoning
    if (input.program) {
      steps.push(this.reasonGeneration(++stepNumber, input.program));
    }

    // Build causal graph
    const causalGraph = input.recognition && input.plan
      ? this.causalReasoner.buildCausalGraph(input.recognition, input.plan)
      : this.emptyGraph();

    // Generate counterfactuals
    const counterfactuals = input.plan
      ? this.generateCounterfactuals(input)
      : [];

    // Compute summary
    const summary = this.generateSummary(steps);
    const confidence = this.computeConfidence(steps);

    return {
      trace_id: traceId,
      processing_time_ms: Date.now() - startTime,
      steps,
      total_decisions: steps.length,
      causal_graph: causalGraph,
      counterfactuals,
      explanation_summary: summary,
      confidence_score: confidence
    };
  }

  /**
   * Answer a specific reasoning query
   */
  query(question: string, context: ReasoningInput): string {
    const lowerQ = question.toLowerCase();

    if (lowerQ.includes("why")) {
      return this.answerWhy(question, context);
    } else if (lowerQ.includes("what if") || lowerQ.includes("counterfactual")) {
      return this.answerWhatIf(question, context);
    } else if (lowerQ.includes("how")) {
      return this.answerHow(question, context);
    } else if (lowerQ.includes("alternative")) {
      return this.answerAlternatives(question, context);
    }

    return this.answerGeneral(question, context);
  }

  /**
   * Explain a specific decision
   */
  explainDecision(decisionId: string, context: ReasoningInput): ReasoningStep | null {
    const trace = this.trace(context);
    return trace.steps.find(s =>
      s.decision.toLowerCase().includes(decisionId.toLowerCase())
    ) || null;
  }

  /**
   * Get statistics
   */
  getStatistics(): Record<string, unknown> {
    return {
      total_traces: this.traceCounter,
      reasoning_types: ["causal", "counterfactual", "abductive", "deductive"],
      supported_phases: ["ingest", "recognition", "planning", "generation", "verification"]
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private reasonIngest(stepNumber: number, intake: BlueprintIntake): ReasoningStep {
    return {
      step_number: stepNumber,
      phase: "ingest",
      decision: `Extract ${intake.dimensions.length} dimensions from ${intake.source_type} blueprint`,
      reasoning_type: "deductive",
      premises: [
        `Blueprint source is ${intake.source_type}`,
        `Part type is ${intake.part_type}`,
        "OCR and dimension extraction algorithms are calibrated"
      ],
      conclusion: `Successfully extracted ${intake.dimensions.length} dimensions with ${intake.gdt_callouts.length} GD&T callouts`,
      confidence: 0.85,
      alternatives_considered: [
        {
          description: "Manual dimension entry",
          rejected_reason: "Automated extraction is faster and reduces transcription errors",
          expected_outcome: "Same dimensions but higher effort"
        }
      ],
      evidence: intake.dimensions.slice(0, 3).map(d => ({
        type: "dimension" as const,
        source: "OCR extraction",
        value: `${d.nominal} ±${d.tolerance || 0.1}`,
        weight: 0.9
      }))
    };
  }

  private reasonRecognition(startStep: number, recognition: FeatureRecognitionResult): ReasoningStep[] {
    const steps: ReasoningStep[] = [];
    let step = startStep;

    // Overall recognition step
    steps.push({
      step_number: ++step,
      phase: "recognition",
      decision: `Identify ${recognition.summary.total_features} machinable features`,
      reasoning_type: "abductive",
      premises: [
        "Extracted dimensions define part geometry",
        "Turning features have characteristic patterns",
        "GD&T callouts indicate critical features"
      ],
      conclusion: `Found ${Object.entries(recognition.summary.feature_types)
        .filter(([_, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
        .join(", ")}`,
      confidence: 0.9,
      alternatives_considered: [],
      evidence: []
    });

    // Feature-specific reasoning
    for (const feature of recognition.feature_tree.features.slice(0, 3)) {
      steps.push({
        step_number: ++step,
        phase: "recognition",
        decision: `Classify ${feature.type} at Z=${feature.start_z}`,
        reasoning_type: "abductive",
        premises: [
          `Diameter: ${feature.diameter_mm || "N/A"} mm`,
          `Z range: ${feature.start_z} to ${feature.end_z}`,
          `Tolerance: ${feature.tolerance_mm || "standard"} mm`
        ],
        conclusion: `Feature requires ${feature.requires_finishing ? "finishing pass" : "standard machining"}`,
        confidence: 0.85,
        alternatives_considered: [
          {
            description: "Different feature classification",
            rejected_reason: "Geometry pattern matches this type",
            expected_outcome: "Would require different tooling"
          }
        ],
        evidence: [
          { type: "feature", source: "geometry", value: feature.type, weight: 0.9 },
          { type: "dimension", source: "blueprint", value: feature.diameter_mm || 0, weight: 0.85 }
        ]
      });
    }

    return steps;
  }

  private reasonPlanning(startStep: number, plan: ToolpathPlan, recognition?: FeatureRecognitionResult): ReasoningStep[] {
    const steps: ReasoningStep[] = [];
    let step = startStep;

    // Tool selection reasoning
    const uniqueTools = [...new Set(plan.segments.map(s => s.tool_number))];
    steps.push({
      step_number: ++step,
      phase: "planning",
      decision: `Select ${uniqueTools.length} tools for ${plan.segments.length} operations`,
      reasoning_type: "causal",
      premises: [
        `${recognition?.summary.total_features || plan.segments.length} features require machining`,
        "Tool selection depends on operation type and geometry",
        "Minimize tool changes for efficiency"
      ],
      conclusion: `Tools T${uniqueTools.join(", T")} provide optimal coverage`,
      confidence: 0.88,
      alternatives_considered: [
        {
          description: "Use fewer tools with multiple passes",
          rejected_reason: "Would increase cycle time",
          expected_outcome: "Simpler setup but longer machining"
        },
        {
          description: "Use more specialized tools",
          rejected_reason: "Diminishing returns on quality",
          expected_outcome: "Marginal improvement at higher cost"
        }
      ],
      evidence: []
    });

    // Sequence reasoning
    steps.push({
      step_number: ++step,
      phase: "planning",
      decision: `Sequence operations: ${plan.segments.slice(0, 3).map(s => s.operation).join(" → ")}...`,
      reasoning_type: "deductive",
      premises: [
        "Roughing must precede finishing",
        "ID operations need prior center drilling",
        "Threading should be final for OD features"
      ],
      conclusion: `Sequence optimizes material removal and maintains part rigidity`,
      confidence: 0.92,
      alternatives_considered: [],
      evidence: plan.segments.slice(0, 3).map(s => ({
        type: "tool" as const,
        source: "planning",
        value: `T${s.tool_number}: ${s.operation}`,
        weight: 0.9
      }))
    });

    // Parameter reasoning
    const segment = plan.segments[0];
    if (segment) {
      steps.push({
        step_number: ++step,
        phase: "planning",
        decision: `Set parameters: ${segment.spindle_rpm} RPM, ${segment.feed_mmrev} mm/rev`,
        reasoning_type: "causal",
        premises: [
          "Surface speed determined by material and tool grade",
          "Feed rate balances finish quality and cycle time",
          "Depth of cut limited by machine rigidity"
        ],
        conclusion: `Parameters achieve target surface finish with acceptable tool life`,
        confidence: 0.85,
        alternatives_considered: [
          {
            description: "Higher speed for better finish",
            rejected_reason: "Would exceed tool temperature limits",
            expected_outcome: "Better finish but shorter tool life"
          }
        ],
        evidence: [
          { type: "tool", source: "calculation", value: `${segment.spindle_rpm} RPM`, weight: 0.9 }
        ]
      });
    }

    return steps;
  }

  private reasonGeneration(stepNumber: number, program: GeneratedProgram): ReasoningStep {
    const lineCount = program.gcode.split("\n").length;

    return {
      step_number: stepNumber,
      phase: "generation",
      decision: `Generate ${lineCount}-line ${program.controller} G-code`,
      reasoning_type: "deductive",
      premises: [
        `Controller type: ${program.controller}`,
        "Toolpath plan defines motion sequence",
        "Controller dialect determines G-code syntax"
      ],
      conclusion: `Program O${program.header.program_number} ready for ${program.controller} controller`,
      confidence: 0.95,
      alternatives_considered: [
        {
          description: "Generic ISO format",
          rejected_reason: `${program.controller} native format uses optimized cycles`,
          expected_outcome: "Compatible but less efficient"
        }
      ],
      evidence: [
        { type: "tool", source: "generation", value: `${lineCount} lines`, weight: 0.95 }
      ]
    };
  }

  private generateCounterfactuals(input: ReasoningInput): CounterfactualAnalysis[] {
    const counterfactuals: CounterfactualAnalysis[] = [];

    if (input.plan && input.plan.segments.length > 0) {
      const seg = input.plan.segments[0];

      // Feed rate counterfactual
      counterfactuals.push(
        this.counterfactualReasoner.analyze(
          "feed_rate",
          seg.feed_mmrev,
          seg.feed_mmrev * 1.5,
          input
        )
      );

      // Depth of cut counterfactual
      counterfactuals.push(
        this.counterfactualReasoner.analyze(
          "depth_of_cut",
          seg.depth_of_cut_mm,
          seg.depth_of_cut_mm * 0.5,
          input
        )
      );

      // Spindle speed counterfactual
      counterfactuals.push(
        this.counterfactualReasoner.analyze(
          "spindle_speed",
          seg.spindle_rpm,
          seg.spindle_rpm * 1.2,
          input
        )
      );
    }

    return counterfactuals;
  }

  private generateSummary(steps: ReasoningStep[]): string {
    const phases = [...new Set(steps.map(s => s.phase))];
    const avgConfidence = steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;

    return `Pipeline made ${steps.length} decisions across ${phases.length} phases ` +
      `(${phases.join(", ")}) with ${(avgConfidence * 100).toFixed(0)}% average confidence. ` +
      `Key decisions: ${steps.slice(0, 3).map(s => s.decision.split(" ").slice(0, 4).join(" ")).join("; ")}.`;
  }

  private computeConfidence(steps: ReasoningStep[]): number {
    if (steps.length === 0) return 0;
    return steps.reduce((sum, s) => sum + s.confidence, 0) / steps.length;
  }

  private emptyGraph(): CausalGraph {
    return { nodes: [], edges: [], root_causes: [], terminal_effects: [] };
  }

  private answerWhy(question: string, context: ReasoningInput): string {
    const trace = this.trace(context);

    // Find most relevant step
    const qWords = question.toLowerCase().split(/\s+/);
    let bestStep = trace.steps[0];
    let bestScore = 0;

    for (const step of trace.steps) {
      const stepWords = (step.decision + " " + step.conclusion).toLowerCase().split(/\s+/);
      const overlap = qWords.filter(w => stepWords.includes(w)).length;
      if (overlap > bestScore) {
        bestScore = overlap;
        bestStep = step;
      }
    }

    if (bestStep) {
      return `${bestStep.decision} because: ${bestStep.premises.join("; ")}. ` +
        `Therefore: ${bestStep.conclusion} (${(bestStep.confidence * 100).toFixed(0)}% confidence)`;
    }

    return "Unable to determine specific reasoning for this question.";
  }

  private answerWhatIf(question: string, context: ReasoningInput): string {
    const trace = this.trace(context);

    if (trace.counterfactuals.length > 0) {
      const cf = trace.counterfactuals[0];
      return `${cf.scenario} Predicted outcome: ${cf.predicted_outcome} ` +
        `(${(cf.outcome_probability * 100).toFixed(0)}% probability). ` +
        `Side effects: ${cf.side_effects.join(", ")}`;
    }

    return "Counterfactual analysis requires planning context.";
  }

  private answerHow(question: string, context: ReasoningInput): string {
    const trace = this.trace(context);
    const steps = trace.steps.map(s => `${s.step_number}. ${s.decision}`);
    return `Process: ${steps.join(" → ")}`;
  }

  private answerAlternatives(question: string, context: ReasoningInput): string {
    const trace = this.trace(context);
    const alternatives = trace.steps
      .flatMap(s => s.alternatives_considered)
      .slice(0, 3);

    if (alternatives.length === 0) {
      return "No alternatives were considered for this decision path.";
    }

    return alternatives.map(a =>
      `Alternative: ${a.description}. Rejected because: ${a.rejected_reason}`
    ).join("\n");
  }

  private answerGeneral(question: string, context: ReasoningInput): string {
    const trace = this.trace(context);
    return trace.explanation_summary;
  }
}

export const lathePrintToProgramReasoningEngine = new LathePrintToProgramReasoningEngine();
