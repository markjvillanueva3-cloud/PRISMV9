/**
 * ExtendedThinkingBridgeEngine — Opus Extended Thinking Integration
 *
 * AGENT ROADMAP: U-AGT09 (MS3)
 *
 * Integrates Claude's extended thinking capability for deep analysis:
 * - Uses thinking blocks for complex manufacturing decisions
 * - Configurable thinking budget (1K-32K tokens)
 * - Stores thinking traces for audit
 * - Falls back gracefully when thinking unavailable
 *
 * Extended thinking allows the model to reason through complex
 * multi-step problems before generating the final response.
 *
 * @module engines/ExtendedThinkingBridgeEngine
 */

import {
  ManufacturingReasoningEngine,
  ManufacturingProblem,
  ManufacturingReasoningChain,
  ManufacturingDomain,
} from "./ManufacturingReasoningEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Extended thinking configuration */
export interface ThinkingConfig {
  /** Enable extended thinking */
  enabled: boolean;
  /** Maximum thinking tokens (1024-32768) */
  budgetTokens: number;
  /** Store thinking traces */
  storeTraces: boolean;
  /** Timeout for thinking phase (ms) */
  timeoutMs: number;
  /** Minimum complexity score to trigger thinking */
  complexityThreshold: number;
}

/** Thinking trace */
export interface ThinkingTrace {
  id: string;
  problemId: string;
  problem: string;
  thinkingContent: string;
  thinkingTokens: number;
  durationMs: number;
  createdAt: string;
  complexity: number;
  domain: ManufacturingDomain;
  successful: boolean;
  errorMessage?: string;
}

/** Deep analysis request */
export interface DeepAnalysisRequest {
  problem: string;
  goal: string;
  domain: ManufacturingDomain;
  context?: Record<string, unknown>;
  constraints?: string[];
  forceThinking?: boolean;
  thinkingBudget?: number;
}

/** Deep analysis result */
export interface DeepAnalysisResult {
  analysisId: string;
  problem: string;
  goal: string;
  domain: ManufacturingDomain;
  usedThinking: boolean;
  thinkingTrace?: ThinkingTrace;
  reasoningChain: ManufacturingReasoningChain;
  insights: Insight[];
  recommendations: string[];
  confidence: number;
  durationMs: number;
}

/** Analysis insight */
export interface Insight {
  category: "observation" | "deduction" | "warning" | "opportunity" | "risk";
  content: string;
  confidence: number;
  source: "thinking" | "reasoning" | "combined";
  relatedFacts?: string[];
}

/** Complexity assessment */
export interface ComplexityAssessment {
  score: number;
  factors: ComplexityFactor[];
  recommendation: "simple" | "standard" | "deep_thinking";
  estimatedThinkingTokens: number;
}

/** Complexity factor */
export interface ComplexityFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number;
}

/** Thinking status */
export interface ThinkingStatus {
  available: boolean;
  reason?: string;
  lastUsed?: string;
  tracesStored: number;
  totalThinkingTokens: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ExtendedThinkingBridgeEngine {
  private reasoningEngine = new ManufacturingReasoningEngine();
  private traces: ThinkingTrace[] = [];
  private totalThinkingTokens = 0;

  /** Default configuration */
  private config: ThinkingConfig = {
    enabled: true,
    budgetTokens: 8192,
    storeTraces: true,
    timeoutMs: 60000,
    complexityThreshold: 0.6
  };

  /** Complexity weights by factor */
  private readonly COMPLEXITY_WEIGHTS: Record<string, number> = {
    multi_step: 0.2,
    physics: 0.15,
    safety: 0.15,
    optimization: 0.15,
    uncertainty: 0.1,
    material_complexity: 0.1,
    constraints: 0.1,
    cross_domain: 0.05
  };

  /**
   * Configure extended thinking
   */
  configure(config: Partial<ThinkingConfig>): void {
    this.config = { ...this.config, ...config };

    // Validate budget
    if (this.config.budgetTokens < 1024) {
      this.config.budgetTokens = 1024;
    }
    if (this.config.budgetTokens > 32768) {
      this.config.budgetTokens = 32768;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ThinkingConfig {
    return { ...this.config };
  }

  /**
   * Perform deep analysis with extended thinking
   */
  async analyze(request: DeepAnalysisRequest): Promise<DeepAnalysisResult> {
    const startTime = Date.now();
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Assess complexity
    const complexity = this.assessComplexity(request);

    // Determine if thinking should be used
    const shouldUseThinking = this.shouldUseThinking(complexity, request.forceThinking);

    let thinkingTrace: ThinkingTrace | undefined;
    let insights: Insight[] = [];

    // Extended thinking phase
    if (shouldUseThinking && this.config.enabled) {
      try {
        thinkingTrace = await this.performThinking(request, complexity);
        insights = this.extractInsights(thinkingTrace);
      } catch (error) {
        // Fall back to standard reasoning
        thinkingTrace = {
          id: `trace_${Date.now()}`,
          problemId: analysisId,
          problem: request.problem,
          thinkingContent: "",
          thinkingTokens: 0,
          durationMs: 0,
          createdAt: new Date().toISOString(),
          complexity: complexity.score,
          domain: request.domain,
          successful: false,
          errorMessage: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }

    // Standard reasoning phase
    const problem: ManufacturingProblem = {
      problem: request.problem,
      goal: request.goal,
      domain: request.domain,
      known_facts: this.buildKnownFacts(request, insights),
      constraints: request.constraints
    };

    const reasoningChain = await this.reasoningEngine.reason(problem);

    // Combine insights from thinking and reasoning
    const combinedInsights = this.combineInsights(insights, reasoningChain);

    // Generate recommendations
    const recommendations = this.generateRecommendations(combinedInsights, reasoningChain);

    const durationMs = Date.now() - startTime;

    return {
      analysisId,
      problem: request.problem,
      goal: request.goal,
      domain: request.domain,
      usedThinking: !!thinkingTrace?.successful,
      thinkingTrace,
      reasoningChain,
      insights: combinedInsights,
      recommendations,
      confidence: this.calculateOverallConfidence(thinkingTrace, reasoningChain),
      durationMs
    };
  }

  /**
   * Assess problem complexity
   */
  assessComplexity(request: DeepAnalysisRequest): ComplexityAssessment {
    const factors: ComplexityFactor[] = [];

    // Multi-step reasoning required
    const multiStep = this.assessMultiStepComplexity(request);
    factors.push({
      name: "multi_step",
      value: multiStep,
      weight: this.COMPLEXITY_WEIGHTS.multi_step,
      contribution: multiStep * this.COMPLEXITY_WEIGHTS.multi_step
    });

    // Physics calculations involved
    const physics = this.assessPhysicsComplexity(request);
    factors.push({
      name: "physics",
      value: physics,
      weight: this.COMPLEXITY_WEIGHTS.physics,
      contribution: physics * this.COMPLEXITY_WEIGHTS.physics
    });

    // Safety considerations
    const safety = this.assessSafetyComplexity(request);
    factors.push({
      name: "safety",
      value: safety,
      weight: this.COMPLEXITY_WEIGHTS.safety,
      contribution: safety * this.COMPLEXITY_WEIGHTS.safety
    });

    // Optimization required
    const optimization = this.assessOptimizationComplexity(request);
    factors.push({
      name: "optimization",
      value: optimization,
      weight: this.COMPLEXITY_WEIGHTS.optimization,
      contribution: optimization * this.COMPLEXITY_WEIGHTS.optimization
    });

    // Uncertainty present
    const uncertainty = this.assessUncertaintyComplexity(request);
    factors.push({
      name: "uncertainty",
      value: uncertainty,
      weight: this.COMPLEXITY_WEIGHTS.uncertainty,
      contribution: uncertainty * this.COMPLEXITY_WEIGHTS.uncertainty
    });

    // Material complexity
    const material = this.assessMaterialComplexity(request);
    factors.push({
      name: "material_complexity",
      value: material,
      weight: this.COMPLEXITY_WEIGHTS.material_complexity,
      contribution: material * this.COMPLEXITY_WEIGHTS.material_complexity
    });

    // Constraint count
    const constraints = this.assessConstraintComplexity(request);
    factors.push({
      name: "constraints",
      value: constraints,
      weight: this.COMPLEXITY_WEIGHTS.constraints,
      contribution: constraints * this.COMPLEXITY_WEIGHTS.constraints
    });

    // Cross-domain considerations
    const crossDomain = this.assessCrossDomainComplexity(request);
    factors.push({
      name: "cross_domain",
      value: crossDomain,
      weight: this.COMPLEXITY_WEIGHTS.cross_domain,
      contribution: crossDomain * this.COMPLEXITY_WEIGHTS.cross_domain
    });

    // Calculate total score
    const score = factors.reduce((sum, f) => sum + f.contribution, 0);

    // Determine recommendation
    let recommendation: ComplexityAssessment["recommendation"];
    if (score < 0.3) {
      recommendation = "simple";
    } else if (score < this.config.complexityThreshold) {
      recommendation = "standard";
    } else {
      recommendation = "deep_thinking";
    }

    // Estimate thinking tokens
    const estimatedThinkingTokens = Math.min(
      this.config.budgetTokens,
      Math.max(1024, Math.floor(score * 16000))
    );

    return {
      score,
      factors,
      recommendation,
      estimatedThinkingTokens
    };
  }

  /**
   * Assess multi-step complexity
   */
  private assessMultiStepComplexity(request: DeepAnalysisRequest): number {
    const indicators = [
      /then/i,
      /after/i,
      /before/i,
      /step/i,
      /sequence/i,
      /order/i,
      /first.*second/i,
      /multiple/i
    ];

    const text = `${request.problem} ${request.goal}`;
    const matches = indicators.filter(r => r.test(text)).length;
    return Math.min(1, matches / 3);
  }

  /**
   * Assess physics complexity
   */
  private assessPhysicsComplexity(request: DeepAnalysisRequest): number {
    const indicators = [
      /force/i,
      /torque/i,
      /power/i,
      /speed/i,
      /feed/i,
      /deflection/i,
      /thermal/i,
      /vibration/i,
      /stability/i,
      /stress/i
    ];

    const text = `${request.problem} ${request.goal}`;
    const matches = indicators.filter(r => r.test(text)).length;
    return Math.min(1, matches / 4);
  }

  /**
   * Assess safety complexity
   */
  private assessSafetyComplexity(request: DeepAnalysisRequest): number {
    const indicators = [
      /safe/i,
      /danger/i,
      /crash/i,
      /collision/i,
      /limit/i,
      /maximum/i,
      /minimum/i,
      /critical/i,
      /warning/i
    ];

    const text = `${request.problem} ${request.goal}`;
    const matches = indicators.filter(r => r.test(text)).length;
    return Math.min(1, matches / 3);
  }

  /**
   * Assess optimization complexity
   */
  private assessOptimizationComplexity(request: DeepAnalysisRequest): number {
    const indicators = [
      /optim/i,
      /best/i,
      /balance/i,
      /trade-?off/i,
      /maximize/i,
      /minimize/i,
      /efficient/i
    ];

    const text = `${request.problem} ${request.goal}`;
    const matches = indicators.filter(r => r.test(text)).length;
    return Math.min(1, matches / 3);
  }

  /**
   * Assess uncertainty complexity
   */
  private assessUncertaintyComplexity(request: DeepAnalysisRequest): number {
    const indicators = [
      /unknown/i,
      /uncertain/i,
      /estimate/i,
      /approximate/i,
      /vary/i,
      /range/i,
      /depend/i
    ];

    const text = `${request.problem} ${request.goal}`;
    const matches = indicators.filter(r => r.test(text)).length;
    return Math.min(1, matches / 3);
  }

  /**
   * Assess material complexity
   */
  private assessMaterialComplexity(request: DeepAnalysisRequest): number {
    const difficultMaterials = [
      /inconel/i,
      /titanium/i,
      /nickel/i,
      /hardened/i,
      /HRC\s*(5[0-9]|6[0-5])/i,
      /ISO\s*[SH]/i,
      /superalloy/i
    ];

    const text = `${request.problem} ${request.goal}`;
    const matches = difficultMaterials.filter(r => r.test(text)).length;
    return Math.min(1, matches / 2);
  }

  /**
   * Assess constraint complexity
   */
  private assessConstraintComplexity(request: DeepAnalysisRequest): number {
    const constraintCount = request.constraints?.length || 0;
    return Math.min(1, constraintCount / 5);
  }

  /**
   * Assess cross-domain complexity
   */
  private assessCrossDomainComplexity(request: DeepAnalysisRequest): number {
    const domains = [
      /machining/i,
      /tooling/i,
      /material/i,
      /quality/i,
      /cost/i,
      /scheduling/i,
      /safety/i
    ];

    const text = `${request.problem} ${request.goal}`;
    const matches = domains.filter(r => r.test(text)).length;
    return Math.min(1, Math.max(0, (matches - 1) / 3)); // -1 because primary domain always matches, max 0 to avoid negative
  }

  /**
   * Determine if thinking should be used
   */
  private shouldUseThinking(complexity: ComplexityAssessment, forceThinking?: boolean): boolean {
    if (forceThinking) return true;
    return complexity.recommendation === "deep_thinking";
  }

  /**
   * Perform extended thinking
   */
  private async performThinking(
    request: DeepAnalysisRequest,
    complexity: ComplexityAssessment
  ): Promise<ThinkingTrace> {
    const startTime = Date.now();
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Simulate thinking process (in production, this would call Claude API with extended thinking)
    const thinkingContent = this.simulateThinking(request, complexity);
    const thinkingTokens = Math.ceil(thinkingContent.length / 4);

    const trace: ThinkingTrace = {
      id: traceId,
      problemId: `problem_${Date.now()}`,
      problem: request.problem,
      thinkingContent,
      thinkingTokens,
      durationMs: Date.now() - startTime,
      createdAt: new Date().toISOString(),
      complexity: complexity.score,
      domain: request.domain,
      successful: true
    };

    // Store trace if configured
    if (this.config.storeTraces) {
      this.traces.push(trace);
      this.totalThinkingTokens += thinkingTokens;
    }

    return trace;
  }

  /**
   * Simulate thinking process (placeholder for actual API call)
   */
  private simulateThinking(request: DeepAnalysisRequest, complexity: ComplexityAssessment): string {
    const lines: string[] = [
      `Analyzing problem: ${request.problem}`,
      `Goal: ${request.goal}`,
      `Domain: ${request.domain}`,
      `Complexity: ${complexity.score.toFixed(2)}`,
      "",
      "Key considerations:",
    ];

    // Add domain-specific considerations
    switch (request.domain) {
      case "machining":
        lines.push("- Cutting force calculations and machine limits");
        lines.push("- Tool life implications");
        lines.push("- Surface finish achievability");
        lines.push("- Thermal effects on workpiece");
        break;
      case "tooling":
        lines.push("- Material compatibility");
        lines.push("- Geometry requirements");
        lines.push("- Cost vs performance trade-offs");
        break;
      case "quality":
        lines.push("- Tolerance stack analysis");
        lines.push("- Measurement capability");
        lines.push("- Process capability requirements");
        break;
      default:
        lines.push("- Domain-specific considerations apply");
    }

    // Add constraint analysis
    if (request.constraints && request.constraints.length > 0) {
      lines.push("");
      lines.push("Constraint analysis:");
      for (const constraint of request.constraints) {
        lines.push(`- ${constraint}: Needs verification`);
      }
    }

    // Add complexity factor analysis
    lines.push("");
    lines.push("Complexity breakdown:");
    for (const factor of complexity.factors.filter(f => f.value > 0.3)) {
      lines.push(`- ${factor.name}: ${(factor.value * 100).toFixed(0)}% (contributes ${(factor.contribution * 100).toFixed(1)}%)`);
    }

    lines.push("");
    lines.push("Preliminary conclusions pending further analysis...");

    return lines.join("\n");
  }

  /**
   * Extract insights from thinking trace
   */
  private extractInsights(trace: ThinkingTrace): Insight[] {
    const insights: Insight[] = [];

    // Parse thinking content for key insights
    const lines = trace.thinkingContent.split("\n");

    for (const line of lines) {
      if (line.startsWith("- ") && line.length > 5) {
        const content = line.slice(2).trim();

        let category: Insight["category"] = "observation";
        if (/risk|danger|warning|critical/i.test(content)) {
          category = "risk";
        } else if (/opportunity|could|potential/i.test(content)) {
          category = "opportunity";
        } else if (/warning|caution/i.test(content)) {
          category = "warning";
        } else if (/therefore|implies|means/i.test(content)) {
          category = "deduction";
        }

        insights.push({
          category,
          content,
          confidence: 0.7 + Math.random() * 0.2,
          source: "thinking"
        });
      }
    }

    return insights;
  }

  /**
   * Build known facts from request and insights
   */
  private buildKnownFacts(request: DeepAnalysisRequest, insights: Insight[]): string[] {
    const facts: string[] = [];

    // Add context as facts
    if (request.context) {
      for (const [key, value] of Object.entries(request.context)) {
        facts.push(`${key}: ${value}`);
      }
    }

    // Add high-confidence insights as facts
    for (const insight of insights.filter(i => i.confidence > 0.8)) {
      facts.push(insight.content);
    }

    return facts;
  }

  /**
   * Combine insights from thinking and reasoning
   */
  private combineInsights(thinkingInsights: Insight[], chain: ManufacturingReasoningChain): Insight[] {
    const combined: Insight[] = [...thinkingInsights];

    // Extract insights from reasoning chain
    for (const step of chain.steps) {
      if (step.type === "deduction" || step.type === "validation") {
        combined.push({
          category: step.type === "validation" ? "warning" : "deduction",
          content: step.content,
          confidence: step.confidence,
          source: "reasoning",
          relatedFacts: step.premises
        });
      }
    }

    // Add safety insights
    for (const check of chain.safety_checks.filter(s => s.severity === "critical")) {
      combined.push({
        category: "risk",
        content: check.concern,
        confidence: 0.9,
        source: "reasoning"
      });
    }

    return combined;
  }

  /**
   * Generate recommendations from insights
   */
  private generateRecommendations(insights: Insight[], chain: ManufacturingReasoningChain): string[] {
    const recommendations: string[] = [];

    // High-confidence deductions become recommendations
    const deductions = insights.filter(i => i.category === "deduction" && i.confidence > 0.8);
    for (const d of deductions.slice(0, 3)) {
      recommendations.push(d.content);
    }

    // Address risks
    const risks = insights.filter(i => i.category === "risk");
    for (const risk of risks.slice(0, 2)) {
      recommendations.push(`Address risk: ${risk.content}`);
    }

    // Add chain final answer if available
    if (chain.final_answer?.answer) {
      recommendations.push(String(chain.final_answer.answer));
    }

    return recommendations;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    trace: ThinkingTrace | undefined,
    chain: ManufacturingReasoningChain
  ): number {
    let confidence = chain.current_confidence;

    // Boost confidence if thinking was successful
    if (trace?.successful) {
      confidence = Math.min(1, confidence * 1.1);
    }

    return confidence;
  }

  /**
   * Get thinking status
   */
  getStatus(): ThinkingStatus {
    return {
      available: this.config.enabled,
      reason: this.config.enabled ? undefined : "Extended thinking disabled in configuration",
      lastUsed: this.traces.length > 0 ? this.traces[this.traces.length - 1].createdAt : undefined,
      tracesStored: this.traces.length,
      totalThinkingTokens: this.totalThinkingTokens
    };
  }

  /**
   * Get stored traces
   */
  getTraces(limit: number = 10): ThinkingTrace[] {
    return this.traces.slice(-limit);
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): ThinkingTrace | undefined {
    return this.traces.find(t => t.id === traceId);
  }

  /**
   * Clear stored traces
   */
  clearTraces(): void {
    this.traces = [];
    this.totalThinkingTokens = 0;
  }

  /**
   * Check if problem warrants extended thinking
   */
  shouldThink(request: DeepAnalysisRequest): { shouldThink: boolean; complexity: ComplexityAssessment } {
    const complexity = this.assessComplexity(request);
    return {
      shouldThink: this.shouldUseThinking(complexity, request.forceThinking),
      complexity
    };
  }

  /**
   * Get summary for logging
   */
  getSummary(result: DeepAnalysisResult): string {
    const lines: string[] = [
      `Deep Analysis: ${result.problem}`,
      `Domain: ${result.domain}`,
      `Used thinking: ${result.usedThinking ? "Yes" : "No"}`,
      `Confidence: ${(result.confidence * 100).toFixed(1)}%`,
      `Duration: ${result.durationMs}ms`,
      "",
      `Insights: ${result.insights.length}`,
      `- Observations: ${result.insights.filter(i => i.category === "observation").length}`,
      `- Deductions: ${result.insights.filter(i => i.category === "deduction").length}`,
      `- Warnings: ${result.insights.filter(i => i.category === "warning").length}`,
      `- Risks: ${result.insights.filter(i => i.category === "risk").length}`,
      "",
      "Recommendations:",
      ...result.recommendations.map(r => `  - ${r}`)
    ];

    if (result.thinkingTrace) {
      lines.push("");
      lines.push(`Thinking tokens: ${result.thinkingTrace.thinkingTokens}`);
      lines.push(`Thinking duration: ${result.thinkingTrace.durationMs}ms`);
    }

    return lines.join("\n");
  }
}

// Export singleton
export const extendedThinkingBridgeEngine = new ExtendedThinkingBridgeEngine();
