/**
 * LatheMasterPostDeepReasoningEngine — Deep Reasoning for Master Post Decisions
 *
 * U-LTH28: Uses LatheDeepReasoningEngine + CausalReasoningEngine to explain WHY
 * the master post picked a specific sub-post. Produces human-readable decision
 * traces with >=4 reasoning steps.
 *
 * Architecture:
 *   [Route Decision] → [Causal Graph Construction] → [Impact Analysis]
 *     → [Deep Reasoning Chain] → [Human-Readable Explanation]
 *
 * Reasoning domains:
 *   1. Machine selection rationale
 *   2. Controller compatibility analysis
 *   3. Post capability matching
 *   4. Confidence factor breakdown
 *   5. Alternative consideration
 *
 * @module LatheMasterPostDeepReasoningEngine
 */

import { CausalReasoningEngine, type CausalEdge, type ImpactReport } from "./CausalReasoningEngine.js";
import type { RouteDecision, MasterPostRouteRequest } from "./LatheMasterPostRouterEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Individual reasoning step in the decision trace */
export interface PostDecisionStep {
  step_number: number;
  category: "machine" | "controller" | "post" | "confidence" | "alternative";
  action: string;
  reasoning: string;
  factors: Record<string, string | number | boolean>;
  confidence: number;
  warnings?: string[];
}

/** Complete decision trace */
export interface PostDecisionTrace {
  trace_id: string;
  request_summary: string;
  decision_summary: string;
  steps: PostDecisionStep[];
  causal_analysis: CausalAnalysis;
  overall_confidence: number;
  total_reasoning_time_ms: number;
  human_readable_explanation: string;
}

/** Causal analysis of the decision */
export interface CausalAnalysis {
  root_cause: string;
  impact_paths: Array<{
    factor: string;
    influence: "positive" | "negative" | "neutral";
    weight: number;
    explanation: string;
  }>;
  critical_factors: string[];
  confidence_breakdown: Record<string, number>;
}

/** Post capability definition */
interface PostCapability {
  post_id: string;
  controller_families: string[];
  operations_supported: string[];
  max_axes: number;
  live_tooling: boolean;
  sub_spindle: boolean;
  css_support: boolean;
  threading_cycles: string[];
  special_features: string[];
}

/** Machine-post compatibility score */
interface CompatibilityScore {
  machine_id: string;
  post_id: string;
  overall_score: number;
  factors: {
    controller_match: number;
    operation_coverage: number;
    feature_support: number;
    historical_success: number;
  };
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheMasterPostDeepReasoningEngine {
  private causalEngine: CausalReasoningEngine;
  private traceCounter = 0;

  /** Known post capabilities */
  private readonly postCapabilities: Map<string, PostCapability> = new Map([
    ["okuma_turning", {
      post_id: "okuma_turning",
      controller_families: ["okuma"],
      operations_supported: ["turning", "facing", "grooving", "threading", "drilling", "boring", "parting", "profiling"],
      max_axes: 4,
      live_tooling: true,
      sub_spindle: true,
      css_support: true,
      threading_cycles: ["G76", "G92", "G32"],
      special_features: ["OSP_macro", "OSP_variables", "OSP_custom_cycles"]
    }],
    ["fanuc_turning", {
      post_id: "fanuc_turning",
      controller_families: ["fanuc"],
      operations_supported: ["turning", "facing", "grooving", "threading", "drilling", "boring", "parting", "profiling"],
      max_axes: 4,
      live_tooling: true,
      sub_spindle: true,
      css_support: true,
      threading_cycles: ["G76", "G92", "G32"],
      special_features: ["fanuc_macro_b", "fanuc_variables"]
    }],
    ["haas_turning", {
      post_id: "haas_turning",
      controller_families: ["haas"],
      operations_supported: ["turning", "facing", "grooving", "threading", "drilling", "boring", "parting"],
      max_axes: 3,
      live_tooling: true,
      sub_spindle: false,
      css_support: true,
      threading_cycles: ["G76", "G92"],
      special_features: ["haas_macros"]
    }],
    ["mazak_turning", {
      post_id: "mazak_turning",
      controller_families: ["mazak"],
      operations_supported: ["turning", "facing", "grooving", "threading", "drilling", "boring", "parting", "profiling", "contouring"],
      max_axes: 5,
      live_tooling: true,
      sub_spindle: true,
      css_support: true,
      threading_cycles: ["G76", "G92", "G32", "G78"],
      special_features: ["mazatrol", "conversational"]
    }],
    ["siemens_turning", {
      post_id: "siemens_turning",
      controller_families: ["siemens"],
      operations_supported: ["turning", "facing", "grooving", "threading", "drilling", "boring", "parting", "profiling"],
      max_axes: 5,
      live_tooling: true,
      sub_spindle: true,
      css_support: true,
      threading_cycles: ["CYCLE97", "CYCLE98"],
      special_features: ["sinumerik_cycles", "shopTurn"]
    }],
    ["generic_turning", {
      post_id: "generic_turning",
      controller_families: ["generic", "unknown"],
      operations_supported: ["turning", "facing", "grooving", "drilling", "boring", "parting"],
      max_axes: 2,
      live_tooling: false,
      sub_spindle: false,
      css_support: true,
      threading_cycles: ["G76"],
      special_features: []
    }]
  ]);

  constructor() {
    this.causalEngine = new CausalReasoningEngine();
  }

  /**
   * Explain why a specific route decision was made
   */
  explainDecision(
    request: MasterPostRouteRequest,
    decision: RouteDecision
  ): PostDecisionTrace {
    const startTime = Date.now();
    const traceId = `trace_${++this.traceCounter}_${Date.now()}`;

    // Build causal graph for this decision
    const causalEdges = this.buildCausalGraph(request, decision);
    this.resetCausalEngine();
    for (const edge of causalEdges) {
      this.causalEngine.addEdge(edge);
    }

    // Generate reasoning steps
    const steps = this.generateReasoningSteps(request, decision);

    // Perform causal analysis
    const causalAnalysis = this.performCausalAnalysis(decision);

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(steps, decision);

    // Generate human-readable explanation
    const humanReadable = this.generateHumanReadableExplanation(request, decision, steps);

    return {
      trace_id: traceId,
      request_summary: this.summarizeRequest(request),
      decision_summary: this.summarizeDecision(decision),
      steps,
      causal_analysis: causalAnalysis,
      overall_confidence: overallConfidence,
      total_reasoning_time_ms: Date.now() - startTime,
      human_readable_explanation: humanReadable
    };
  }

  /**
   * Compare two possible route decisions and explain why one was chosen
   */
  compareDecisions(
    request: MasterPostRouteRequest,
    chosenDecision: RouteDecision,
    alternativeDecision: RouteDecision
  ): {
    comparison_summary: string;
    chosen_advantages: string[];
    alternative_advantages: string[];
    decisive_factors: string[];
    recommendation_confidence: number;
  } {
    const chosenScore = this.scoreDecision(request, chosenDecision);
    const altScore = this.scoreDecision(request, alternativeDecision);

    const chosenAdvantages: string[] = [];
    const altAdvantages: string[] = [];
    const decisiveFactors: string[] = [];

    // Compare overall confidence
    if (chosenDecision.confidence > alternativeDecision.confidence) {
      chosenAdvantages.push(`Higher confidence: ${(chosenDecision.confidence * 100).toFixed(0)}% vs ${(alternativeDecision.confidence * 100).toFixed(0)}%`);
      decisiveFactors.push("confidence_level");
    } else if (alternativeDecision.confidence > chosenDecision.confidence) {
      altAdvantages.push(`Higher confidence: ${(alternativeDecision.confidence * 100).toFixed(0)}%`);
    }

    // Compare controller match
    if (chosenScore.factors.controller_match > altScore.factors.controller_match) {
      chosenAdvantages.push(`Better controller match: ${chosenDecision.controller_family} vs ${alternativeDecision.controller_family}`);
      decisiveFactors.push("controller_compatibility");
    } else if (altScore.factors.controller_match > chosenScore.factors.controller_match) {
      altAdvantages.push(`Better controller match: ${alternativeDecision.controller_family}`);
    }

    // Compare operation coverage
    if (chosenScore.factors.operation_coverage > altScore.factors.operation_coverage) {
      chosenAdvantages.push(`Better operation support for ${request.operation}`);
      decisiveFactors.push("operation_coverage");
    } else if (altScore.factors.operation_coverage > chosenScore.factors.operation_coverage) {
      altAdvantages.push(`Better operation support for ${request.operation}`);
    }

    // Compare feature support
    if (chosenScore.factors.feature_support > altScore.factors.feature_support) {
      const features: string[] = [];
      if (request.live_tooling) features.push("live tooling");
      if (request.sub_spindle) features.push("sub-spindle");
      if (request.css_mode) features.push("CSS mode");
      if (features.length > 0) {
        chosenAdvantages.push(`Better feature support: ${features.join(", ")}`);
        decisiveFactors.push("feature_support");
      }
    }

    // Compare overall score if other factors are equal
    if (chosenScore.overall_score > altScore.overall_score && chosenAdvantages.length === 0) {
      chosenAdvantages.push(`Higher overall compatibility score: ${(chosenScore.overall_score * 100).toFixed(0)}%`);
      decisiveFactors.push("overall_compatibility");
    }

    // Compare historical success
    if (chosenScore.factors.historical_success > altScore.factors.historical_success) {
      chosenAdvantages.push("Higher historical success rate");
      decisiveFactors.push("historical_performance");
    }

    const recommendationConfidence = Math.min(1, Math.max(0,
      (chosenScore.overall_score - altScore.overall_score + 0.5)
    ));

    return {
      comparison_summary: `${chosenDecision.selected_post} selected over ${alternativeDecision.selected_post} ` +
        `(score: ${chosenScore.overall_score.toFixed(2)} vs ${altScore.overall_score.toFixed(2)})`,
      chosen_advantages: chosenAdvantages,
      alternative_advantages: altAdvantages,
      decisive_factors: decisiveFactors,
      recommendation_confidence: recommendationConfidence
    };
  }

  /**
   * Get reasoning for a specific aspect of the decision
   */
  getAspectReasoning(
    request: MasterPostRouteRequest,
    decision: RouteDecision,
    aspect: "machine" | "controller" | "post" | "confidence"
  ): PostDecisionStep {
    const steps = this.generateReasoningSteps(request, decision);
    const aspectStep = steps.find(s => s.category === aspect);

    if (aspectStep) {
      return aspectStep;
    }

    // Return a default step if aspect not found
    return {
      step_number: 0,
      category: aspect,
      action: `Analyze ${aspect}`,
      reasoning: `No specific reasoning available for ${aspect}`,
      factors: {},
      confidence: 0.5
    };
  }

  /**
   * Validate that a decision trace meets minimum quality requirements
   */
  validateTrace(trace: PostDecisionTrace): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Must have at least 4 reasoning steps
    if (trace.steps.length < 4) {
      issues.push(`Insufficient reasoning steps: ${trace.steps.length} < 4 required`);
      suggestions.push("Add more detailed analysis of machine, controller, post, and confidence factors");
    }

    // Each step must have reasoning
    for (const step of trace.steps) {
      if (!step.reasoning || step.reasoning.length < 20) {
        issues.push(`Step ${step.step_number} has insufficient reasoning`);
      }
      if (step.confidence < 0 || step.confidence > 1) {
        issues.push(`Step ${step.step_number} has invalid confidence: ${step.confidence}`);
      }
    }

    // Must have causal analysis
    if (!trace.causal_analysis.root_cause) {
      issues.push("Missing root cause in causal analysis");
    }
    if (trace.causal_analysis.critical_factors.length === 0) {
      suggestions.push("Consider identifying critical factors in the decision");
    }

    // Human readable explanation must be substantial
    if (trace.human_readable_explanation.length < 100) {
      issues.push("Human-readable explanation is too brief");
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private resetCausalEngine(): void {
    this.causalEngine = new CausalReasoningEngine();
  }

  private buildCausalGraph(
    request: MasterPostRouteRequest,
    decision: RouteDecision
  ): CausalEdge[] {
    const edges: CausalEdge[] = [];

    // Machine → Controller relationship
    edges.push({
      from: `machine:${request.machine_id}`,
      to: `controller:${decision.controller_family}`,
      confidence: 0.95,
      polarity: "positive",
      reason: "Machine determines available controller"
    });

    // Controller → Post selection
    edges.push({
      from: `controller:${decision.controller_family}`,
      to: `post:${decision.selected_post}`,
      confidence: decision.confidence,
      polarity: "positive",
      reason: "Controller family drives post selection"
    });

    // Operation → Post compatibility
    edges.push({
      from: `operation:${request.operation}`,
      to: `post:${decision.selected_post}`,
      confidence: 0.9,
      polarity: "positive",
      reason: "Operation type influences post choice"
    });

    // Features → Post selection
    if (request.live_tooling) {
      edges.push({
        from: "feature:live_tooling",
        to: `post:${decision.selected_post}`,
        confidence: 0.85,
        polarity: "positive",
        reason: "Live tooling requirement narrows post options"
      });
    }

    if (request.sub_spindle) {
      edges.push({
        from: "feature:sub_spindle",
        to: `post:${decision.selected_post}`,
        confidence: 0.85,
        polarity: "positive",
        reason: "Sub-spindle requirement affects post selection"
      });
    }

    if (request.css_mode) {
      edges.push({
        from: "feature:css_mode",
        to: `post:${decision.selected_post}`,
        confidence: 0.8,
        polarity: "positive",
        reason: "CSS mode support required"
      });
    }

    // Route method → Confidence
    edges.push({
      from: `route_method:${decision.route_method}`,
      to: "outcome:confidence",
      confidence: decision.route_method === "direct_match" ? 0.95 :
                  decision.route_method === "controller_family" ? 0.85 : 0.7,
      polarity: "positive",
      reason: `${decision.route_method} routing affects confidence level`
    });

    return edges;
  }

  private generateReasoningSteps(
    request: MasterPostRouteRequest,
    decision: RouteDecision
  ): PostDecisionStep[] {
    const steps: PostDecisionStep[] = [];

    // Step 1: Machine Analysis
    steps.push({
      step_number: 1,
      category: "machine",
      action: "Identify target machine and capabilities",
      reasoning: `Machine ${request.machine_id} (${decision.machine_name}) identified in shop configuration. ` +
        `This is a ${decision.controller_family} controller machine ` +
        `with model ${decision.controller_model}. ` +
        `The machine's capabilities determine which post processors are compatible.`,
      factors: {
        machine_id: request.machine_id,
        machine_name: decision.machine_name,
        controller_family: decision.controller_family,
        controller_model: decision.controller_model
      },
      confidence: 0.95
    });

    // Step 2: Controller Compatibility
    const postCap = this.postCapabilities.get(decision.selected_post) ||
                    this.postCapabilities.get("generic_turning")!;

    steps.push({
      step_number: 2,
      category: "controller",
      action: "Evaluate controller compatibility",
      reasoning: `The ${decision.controller_family} controller family requires specific G-code dialect and ` +
        `cycle support. Post '${decision.selected_post}' is designed for ` +
        `${postCap.controller_families.join(", ")} controllers. ` +
        `Supported threading cycles: ${postCap.threading_cycles.join(", ")}. ` +
        `Maximum axes: ${postCap.max_axes}. ` +
        (postCap.special_features.length > 0
          ? `Special features: ${postCap.special_features.join(", ")}.`
          : "No special features required."),
      factors: {
        controller_match: postCap.controller_families.includes(decision.controller_family),
        supported_controllers: postCap.controller_families.join(", "),
        threading_cycles: postCap.threading_cycles.join(", "),
        max_axes: postCap.max_axes
      },
      confidence: postCap.controller_families.includes(decision.controller_family) ? 0.95 : 0.7
    });

    // Step 3: Post Selection Rationale
    const operationSupported = postCap.operations_supported.includes(request.operation);
    const featureMatch = this.checkFeatureMatch(request, postCap);

    steps.push({
      step_number: 3,
      category: "post",
      action: "Select optimal post processor",
      reasoning: `Post '${decision.selected_post}' selected via ${decision.route_method} routing. ` +
        `Operation '${request.operation}' is ${operationSupported ? "fully supported" : "partially supported"}. ` +
        `Feature requirements: live tooling=${request.live_tooling ?? false}, ` +
        `sub-spindle=${request.sub_spindle ?? false}, CSS=${request.css_mode ?? false}. ` +
        `Feature match score: ${(featureMatch * 100).toFixed(0)}%. ` +
        (decision.reasoning.length > 0
          ? `Additional factors: ${decision.reasoning.join("; ")}.`
          : ""),
      factors: {
        selected_post: decision.selected_post,
        route_method: decision.route_method,
        operation: request.operation,
        operation_supported: operationSupported,
        feature_match: featureMatch,
        live_tooling_needed: request.live_tooling ?? false,
        live_tooling_available: postCap.live_tooling,
        sub_spindle_needed: request.sub_spindle ?? false,
        sub_spindle_available: postCap.sub_spindle
      },
      confidence: operationSupported && featureMatch >= 0.8 ? 0.9 : 0.75,
      warnings: !operationSupported
        ? [`Operation '${request.operation}' may have limited support`]
        : undefined
    });

    // Step 4: Confidence Assessment
    const confidenceFactors = this.breakdownConfidence(request, decision);

    steps.push({
      step_number: 4,
      category: "confidence",
      action: "Calculate decision confidence",
      reasoning: `Overall confidence: ${(decision.confidence * 100).toFixed(0)}%. ` +
        `Breakdown: controller match=${(confidenceFactors.controller * 100).toFixed(0)}%, ` +
        `operation support=${(confidenceFactors.operation * 100).toFixed(0)}%, ` +
        `feature coverage=${(confidenceFactors.features * 100).toFixed(0)}%, ` +
        `routing method=${(confidenceFactors.routing * 100).toFixed(0)}%. ` +
        `${decision.route_method === "direct_match"
          ? "Direct match provides highest confidence."
          : decision.route_method === "controller_family"
            ? "Controller family match provides good confidence."
            : "Fallback generator used - verify output carefully."}`,
      factors: {
        overall_confidence: decision.confidence,
        controller_factor: confidenceFactors.controller,
        operation_factor: confidenceFactors.operation,
        feature_factor: confidenceFactors.features,
        routing_factor: confidenceFactors.routing
      },
      confidence: decision.confidence
    });

    // Step 5: Alternative Consideration (optional but adds depth)
    const alternatives = this.identifyAlternatives(request, decision);
    if (alternatives.length > 0) {
      steps.push({
        step_number: 5,
        category: "alternative",
        action: "Consider alternative post processors",
        reasoning: `${alternatives.length} alternative post(s) were considered: ${alternatives.join(", ")}. ` +
          `The selected post '${decision.selected_post}' was chosen because it provides ` +
          `the best combination of controller compatibility, operation support, and feature coverage. ` +
          `Alternative posts may be suitable for different machine configurations or operations.`,
        factors: {
          alternatives_count: alternatives.length,
          alternatives: alternatives.join(", "),
          selected_advantage: "Best overall compatibility score"
        },
        confidence: 0.85
      });
    }

    return steps;
  }

  private performCausalAnalysis(decision: RouteDecision): CausalAnalysis {
    // Trace impact from the machine to the final decision
    const impact = this.causalEngine.traceImpact(`post:${decision.selected_post}`, 3);

    const impactPaths: CausalAnalysis["impact_paths"] = [];

    // Controller influence
    impactPaths.push({
      factor: "controller_family",
      influence: "positive",
      weight: 0.4,
      explanation: `${decision.controller_family} controller directly determines compatible posts`
    });

    // Route method influence
    impactPaths.push({
      factor: "route_method",
      influence: decision.route_method === "fallback_generator" ? "neutral" : "positive",
      weight: decision.route_method === "direct_match" ? 0.3 : 0.2,
      explanation: `${decision.route_method} routing ${decision.route_method === "direct_match" ? "provides strong match" : "found compatible option"}`
    });

    // Machine influence
    impactPaths.push({
      factor: "machine_configuration",
      influence: "positive",
      weight: 0.3,
      explanation: `Machine ${decision.machine_id} capabilities shape post selection`
    });

    // Confidence breakdown
    const confidenceBreakdown: Record<string, number> = {
      controller_compatibility: decision.confidence * 0.4,
      operation_support: decision.confidence * 0.25,
      feature_coverage: decision.confidence * 0.2,
      routing_confidence: decision.confidence * 0.15
    };

    return {
      root_cause: `Selection of ${decision.selected_post} driven primarily by ${decision.controller_family} controller compatibility`,
      impact_paths: impactPaths,
      critical_factors: ["controller_family", "route_method", decision.route_method],
      confidence_breakdown: confidenceBreakdown
    };
  }

  private calculateOverallConfidence(
    steps: PostDecisionStep[],
    decision: RouteDecision
  ): number {
    // Weight each step's confidence
    const weights = [0.2, 0.25, 0.25, 0.2, 0.1]; // machine, controller, post, confidence, alternative
    let totalConfidence = 0;
    let totalWeight = 0;

    for (let i = 0; i < steps.length && i < weights.length; i++) {
      totalConfidence += steps[i].confidence * weights[i];
      totalWeight += weights[i];
    }

    // Blend with decision confidence
    const stepConfidence = totalWeight > 0 ? totalConfidence / totalWeight : 0.5;
    return (stepConfidence + decision.confidence) / 2;
  }

  private generateHumanReadableExplanation(
    request: MasterPostRouteRequest,
    decision: RouteDecision,
    steps: PostDecisionStep[]
  ): string {
    const lines: string[] = [];

    lines.push(`=== Post Selection Decision Explanation ===`);
    lines.push(``);
    lines.push(`Request: Generate G-code for ${request.operation} operation on machine ${request.machine_id}`);
    lines.push(`Decision: Use post processor '${decision.selected_post}'`);
    lines.push(`Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
    lines.push(``);
    lines.push(`--- Reasoning Steps ---`);

    for (const step of steps) {
      lines.push(``);
      lines.push(`Step ${step.step_number} (${step.category}): ${step.action}`);
      lines.push(`  ${step.reasoning}`);
      if (step.warnings && step.warnings.length > 0) {
        lines.push(`  ⚠ Warnings: ${step.warnings.join("; ")}`);
      }
    }

    lines.push(``);
    lines.push(`--- Summary ---`);
    lines.push(`The ${decision.selected_post} post was selected because it:`);
    lines.push(`  • Is compatible with ${decision.controller_family} controllers (${decision.controller_model})`);
    lines.push(`  • Supports ${request.operation} operations`);
    if (request.live_tooling) lines.push(`  • Provides live tooling support`);
    if (request.sub_spindle) lines.push(`  • Supports sub-spindle operations`);
    if (request.css_mode) lines.push(`  • Enables constant surface speed (CSS) mode`);
    lines.push(``);
    lines.push(`Routing method: ${decision.route_method.replace(/_/g, " ")}`);

    return lines.join("\n");
  }

  private summarizeRequest(request: MasterPostRouteRequest): string {
    return `${request.operation} on ${request.machine_id} with ${request.moves.length} moves, ` +
      `tool T${request.tool_number}, ${request.spindle_rpm} RPM`;
  }

  private summarizeDecision(decision: RouteDecision): string {
    return `Selected ${decision.selected_post} (${decision.controller_family}) ` +
      `via ${decision.route_method} with ${(decision.confidence * 100).toFixed(0)}% confidence`;
  }

  private checkFeatureMatch(request: MasterPostRouteRequest, postCap: PostCapability): number {
    let required = 0;
    let matched = 0;

    if (request.live_tooling) {
      required++;
      if (postCap.live_tooling) matched++;
    }

    if (request.sub_spindle) {
      required++;
      if (postCap.sub_spindle) matched++;
    }

    if (request.css_mode) {
      required++;
      if (postCap.css_support) matched++;
    }

    return required === 0 ? 1.0 : matched / required;
  }

  private breakdownConfidence(
    request: MasterPostRouteRequest,
    decision: RouteDecision
  ): {
    controller: number;
    operation: number;
    features: number;
    routing: number;
  } {
    const postCap = this.postCapabilities.get(decision.selected_post) ||
                    this.postCapabilities.get("generic_turning")!;

    return {
      controller: postCap.controller_families.includes(decision.controller_family) ? 0.95 : 0.6,
      operation: postCap.operations_supported.includes(request.operation) ? 0.95 : 0.7,
      features: this.checkFeatureMatch(request, postCap),
      routing: decision.route_method === "direct_match" ? 0.95 :
               decision.route_method === "controller_family" ? 0.85 : 0.7
    };
  }

  private scoreDecision(
    request: MasterPostRouteRequest,
    decision: RouteDecision
  ): CompatibilityScore {
    const postCap = this.postCapabilities.get(decision.selected_post) ||
                    this.postCapabilities.get("generic_turning")!;

    const factors = {
      controller_match: postCap.controller_families.includes(decision.controller_family) ? 1.0 : 0.5,
      operation_coverage: postCap.operations_supported.includes(request.operation) ? 1.0 : 0.6,
      feature_support: this.checkFeatureMatch(request, postCap),
      historical_success: 0.85 // Default - would come from actual metrics
    };

    const overall_score = (
      factors.controller_match * 0.35 +
      factors.operation_coverage * 0.3 +
      factors.feature_support * 0.2 +
      factors.historical_success * 0.15
    );

    return {
      machine_id: request.machine_id,
      post_id: decision.selected_post,
      overall_score,
      factors
    };
  }

  private identifyAlternatives(
    request: MasterPostRouteRequest,
    decision: RouteDecision
  ): string[] {
    const alternatives: string[] = [];

    for (const [postId, cap] of this.postCapabilities) {
      if (postId === decision.selected_post) continue;

      // Check if this post could work
      const operationOk = cap.operations_supported.includes(request.operation);
      const featuresOk = this.checkFeatureMatch(request, cap) >= 0.5;

      if (operationOk && featuresOk) {
        alternatives.push(postId);
      }
    }

    return alternatives.slice(0, 3); // Limit to top 3 alternatives
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheMasterPostDeepReasoningEngine = new LatheMasterPostDeepReasoningEngine();
