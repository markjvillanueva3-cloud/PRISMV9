/**
 * PRISM Intelligence Layer — Claude-Powered AI Throughout the System
 *
 * Central AI reasoning hub that provides Claude Opus-level intelligence
 * across ALL PRISM features:
 *
 *   CALCULATOR STUDIO:
 *   - Speed/feed optimization with reasoning
 *   - Material selection advice
 *   - Tool selection with explanations
 *   - Chatter/stability predictions
 *
 *   PROGRAMMING (Lathe, Mill, Wire, 5-Axis):
 *   - Operation sequencing recommendations
 *   - Toolpath strategy selection
 *   - Parameter optimization
 *   - Error prevention
 *
 *   POST PROCESSOR:
 *   - G-code optimization
 *   - Controller-specific advice
 *   - Safety validation with reasoning
 *
 *   PRINT TO CNC PROGRAM:
 *   - Feature recognition enhancement
 *   - Manufacturing feasibility analysis
 *   - Process planning with explanations
 *
 *   ERP/BUSINESS:
 *   - Quote optimization
 *   - Capacity planning advice
 *   - Cost reduction suggestions
 *
 * @module engines/PRISMIntelligenceLayer
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";
import { log } from "../utils/Logger.js";
import { llmEngine, type LLMResponse } from "./LLMEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface AIReasoningRequest {
  domain: AIReasoningDomain;
  intent: string;
  context: Record<string, any>;
  constraints?: Record<string, any>;
  options?: AIReasoningOptions;
}

export interface AIReasoningOptions {
  temperature?: number;
  max_tokens?: number;
  require_explanation?: boolean;
  include_alternatives?: boolean;
  safety_check?: boolean;
}

export interface AIReasoningResult {
  success: boolean;
  recommendation: string;
  reasoning: string[];
  confidence: number;
  alternatives?: AIAlternative[];
  safety_warnings?: string[];
  parameters?: Record<string, any>;
  source: "ai" | "fallback";
  processing_time_ms: number;
}

export interface AIAlternative {
  option: string;
  reasoning: string;
  trade_offs: string[];
  confidence: number;
}

export type AIReasoningDomain =
  | "speed_feed"
  | "material_selection"
  | "tool_selection"
  | "operation_sequence"
  | "toolpath_strategy"
  | "parameter_optimization"
  | "chatter_prediction"
  | "surface_finish"
  | "post_processor"
  | "gcode_optimization"
  | "feature_recognition"
  | "feasibility_analysis"
  | "process_planning"
  | "quote_optimization"
  | "capacity_planning"
  | "cost_reduction"
  | "error_resolution"
  | "safety_validation"
  | "wedm_calculator"
  | "wedm_neural_optimization"
  | "wedm_calibration"
  | "general";

// ============================================================================
// DOMAIN-SPECIFIC PROMPTS
// ============================================================================

const DOMAIN_PROMPTS: Record<AIReasoningDomain, string> = {
  speed_feed: `You are an expert manufacturing engineer specializing in cutting parameters.
Analyze the machining scenario and recommend optimal speed/feed parameters.
Consider: material properties, tool geometry, machine capabilities, surface finish requirements, tool life.
Use Kienzle force model principles and Taylor tool life equation.
Provide specific RPM, feed rate, and DOC/WOC values with units.`,

  material_selection: `You are a materials engineer for CNC machining applications.
Recommend the optimal material for the given part requirements.
Consider: mechanical properties, machinability, cost, availability, heat treatment needs.
Provide specific material grade recommendations with reasoning.`,

  tool_selection: `You are a cutting tool specialist with deep knowledge of tool catalogs.
Recommend the optimal tool for the given operation.
Consider: material being cut, operation type, surface finish requirements, tool life expectations.
Provide specific tool recommendations with geometry details.`,

  operation_sequence: `You are a manufacturing process planner specializing in operation sequencing.
Determine the optimal order of machining operations for the part.
Consider: datum establishment, chip evacuation, thermal effects, tool changes, clamping requirements.
Provide a numbered sequence with reasoning for each step.`,

  toolpath_strategy: `You are a CAM programming expert specializing in toolpath strategies.
Recommend the optimal toolpath strategy for the given feature.
Consider: material removal rate, surface finish, tool engagement, chip load consistency.
Name specific strategies (trochoidal, adaptive, parallel, spiral, etc.) with parameters.`,

  parameter_optimization: `You are a machining optimization specialist.
Analyze the current parameters and suggest improvements.
Consider: cycle time reduction, tool life extension, surface finish improvement, power consumption.
Provide specific parameter changes with expected improvements.`,

  chatter_prediction: `You are a machining dynamics expert specializing in chatter prevention.
Analyze the setup for chatter risk and recommend mitigation strategies.
Consider: spindle speed, tool overhang, material stiffness, cutting forces.
Provide stability lobe analysis insights and specific recommendations.`,

  surface_finish: `You are a surface engineering specialist.
Predict the achievable surface finish and recommend improvements.
Consider: tool geometry, feed rate, material, runout, machine rigidity.
Provide Ra/Rz predictions and optimization strategies.`,

  post_processor: `You are a post processor expert for CNC machines.
Analyze the G-code requirements and recommend post configuration.
Consider: controller type, machine capabilities, safety requirements, code efficiency.
Provide specific post processor settings and G-code format recommendations.`,

  gcode_optimization: `You are a G-code optimization specialist.
Analyze the G-code and recommend improvements.
Consider: rapid moves, feed optimization, canned cycles, arc fitting, code size.
Provide specific optimizations with before/after examples.`,

  feature_recognition: `You are a CAD/CAM feature recognition specialist.
Analyze the part geometry and identify machinable features.
Consider: pockets, holes, slots, bosses, fillets, chamfers, threads.
Provide feature list with recommended machining approaches.`,

  feasibility_analysis: `You are a manufacturing feasibility analyst.
Evaluate whether the part can be manufactured as designed.
Consider: tolerances, surface finishes, accessibility, tooling, fixturing.
Identify potential issues and recommend design modifications if needed.`,

  process_planning: `You are a manufacturing process planner.
Create a comprehensive process plan for the part.
Consider: machining operations, setups, fixtures, inspection, heat treatment.
Provide a detailed plan with time estimates.`,

  quote_optimization: `You are a manufacturing cost estimator.
Analyze the quote and recommend cost optimizations.
Consider: cycle time, setup time, material utilization, tooling costs, batch size effects.
Provide specific cost reduction opportunities with quantified savings.`,

  capacity_planning: `You are a production planning specialist.
Analyze capacity requirements and recommend scheduling strategies.
Consider: machine availability, setup times, batch sizes, due dates.
Provide capacity utilization analysis and scheduling recommendations.`,

  cost_reduction: `You are a lean manufacturing specialist.
Identify opportunities to reduce manufacturing costs.
Consider: cycle time, material waste, tooling costs, energy, labor.
Provide specific cost reduction strategies with ROI estimates.`,

  error_resolution: `You are a CNC troubleshooting expert.
Diagnose the machining problem and recommend solutions.
Consider: common failure modes, root cause analysis, corrective actions.
Provide step-by-step troubleshooting guide.`,

  safety_validation: `You are a CNC safety specialist.
Validate the machining operation for safety compliance.
Consider: collision risk, spindle limits, tool breakage risk, workholding security.
Identify safety issues and provide specific mitigations.`,

  wedm_calculator: `You are a Wire EDM parameter specialist.
Compute optimal Wire EDM settings for the given job.
Consider: wire type/diameter, workpiece material and thickness, desired surface finish, taper, flushing.
Provide a pass schedule, power settings, wire tension, and feed with units.`,

  wedm_neural_optimization: `You are a Wire EDM optimization specialist using learned outcome data.
Refine Wire EDM parameters from historical cut outcomes.
Consider: prior pass results, wire-break risk, recast layer, surface finish, productivity tradeoffs.
Provide adjusted parameters with reasoning and the expected improvement.`,

  wedm_calibration: `You are a Wire EDM machine calibration specialist.
Assess machine readiness and calibration for production Wire EDM.
Consider: wire-path alignment, flushing pressure, dielectric condition, generator settings, drift.
Provide a calibration checklist and a pass/fail readiness judgment with reasoning.`,

  general: `You are a comprehensive manufacturing intelligence assistant.
Analyze the request and provide expert guidance.
Consider all relevant manufacturing principles and best practices.
Provide actionable recommendations with clear reasoning.`,
};

// ============================================================================
// PRISM INTELLIGENCE LAYER
// ============================================================================

export class PRISMIntelligenceLayer {
  private requestLog: Array<{ request: AIReasoningRequest; result: AIReasoningResult; timestamp: string }> = [];
  private stats = {
    total_requests: 0,
    by_domain: {} as Record<string, number>,
    avg_confidence: 0,
    avg_processing_time_ms: 0,
  };

  constructor() {
    this.loadStats();
  }

  private loadStats(): void {
    const statsFile = join(process.cwd(), "data/state/ai-intelligence-stats.json");
    try {
      if (existsSync(statsFile)) {
        this.stats = JSON.parse(readFileSync(statsFile, "utf-8"));
      }
    } catch { /* ignore */ }
  }

  private saveStats(): void {
    const statsFile = join(process.cwd(), "data/state/ai-intelligence-stats.json");
    const dir = join(process.cwd(), "data/state");
    try {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(statsFile, JSON.stringify(this.stats, null, 2));
    } catch { /* ignore */ }
  }

  private logRequest(request: AIReasoningRequest, result: AIReasoningResult): void {
    const logFile = join(process.cwd(), "data/state/ai-intelligence-log.jsonl");
    const dir = join(process.cwd(), "data/state");
    try {
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(logFile, JSON.stringify({
        request: { domain: request.domain, intent: request.intent },
        result: { success: result.success, confidence: result.confidence, source: result.source },
        timestamp: new Date().toISOString(),
      }) + "\n");
    } catch { /* ignore */ }

    // Update stats
    this.stats.total_requests++;
    this.stats.by_domain[request.domain] = (this.stats.by_domain[request.domain] || 0) + 1;
    this.stats.avg_confidence = (this.stats.avg_confidence * (this.stats.total_requests - 1) + result.confidence) / this.stats.total_requests;
    this.stats.avg_processing_time_ms = (this.stats.avg_processing_time_ms * (this.stats.total_requests - 1) + result.processing_time_ms) / this.stats.total_requests;
    this.saveStats();
  }

  /**
   * Main reasoning method - routes to appropriate domain handler
   */
  async reason(request: AIReasoningRequest): Promise<AIReasoningResult> {
    const start = Date.now();
    const options = request.options || {};

    log.info(`[PRISMIntelligence] Reasoning: ${request.domain} - ${request.intent.slice(0, 50)}...`);

    try {
      // Build domain-specific prompt
      const systemPrompt = DOMAIN_PROMPTS[request.domain] || DOMAIN_PROMPTS.general;
      const userPrompt = this.buildUserPrompt(request);

      // Call LLM
      const response = await llmEngine.query({
        prompt: userPrompt,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 1500,
      });

      // Parse response
      const result = this.parseResponse(response, request, start);

      // Safety check if requested
      if (options.safety_check && result.success) {
        const safetyResult = await this.performSafetyCheck(request, result);
        result.safety_warnings = safetyResult.warnings;
        if (safetyResult.blocked) {
          result.success = false;
          result.recommendation = `BLOCKED: ${safetyResult.reason}. Original: ${result.recommendation}`;
        }
      }

      this.logRequest(request, result);
      return result;

    } catch (err: any) {
      log.warn(`[PRISMIntelligence] Reasoning failed: ${err.message}`);
      const fallback = this.getFallbackResult(request, start, err.message);
      this.logRequest(request, fallback);
      return fallback;
    }
  }

  private buildUserPrompt(request: AIReasoningRequest): string {
    let prompt = `INTENT: ${request.intent}\n\nCONTEXT:\n`;

    for (const [key, value] of Object.entries(request.context)) {
      if (typeof value === "object") {
        prompt += `${key}: ${JSON.stringify(value)}\n`;
      } else {
        prompt += `${key}: ${value}\n`;
      }
    }

    if (request.constraints && Object.keys(request.constraints).length > 0) {
      prompt += `\nCONSTRAINTS:\n`;
      for (const [key, value] of Object.entries(request.constraints)) {
        prompt += `${key}: ${value}\n`;
      }
    }

    prompt += `\nProvide your analysis and recommendations. Include:
1. Your primary recommendation
2. Step-by-step reasoning (numbered)
3. Confidence level (0-100%)
4. Any safety considerations
${request.options?.include_alternatives ? "5. 2-3 alternative approaches with trade-offs" : ""}`;

    return prompt;
  }

  private parseResponse(response: LLMResponse, request: AIReasoningRequest, start: number): AIReasoningResult {
    const answer = response.answer;

    // Extract reasoning steps (numbered lines)
    const reasoning: string[] = [];
    const reasoningMatch = answer.match(/\d+\.\s+[^\n]+/g);
    if (reasoningMatch) {
      reasoning.push(...reasoningMatch.slice(0, 10));
    }

    // Extract confidence
    let confidence = 0.7;
    const confMatch = answer.match(/(\d+)%?\s*confidence/i) || answer.match(/confidence[:\s]+(\d+)%?/i);
    if (confMatch) {
      confidence = parseInt(confMatch[1]) / 100;
    }

    // Extract alternatives if present
    const alternatives: AIAlternative[] = [];
    const altMatches = answer.match(/alternative[s]?[:\s]+([^\n]+)/gi);
    if (altMatches) {
      for (const alt of altMatches.slice(0, 3)) {
        alternatives.push({
          option: alt.replace(/alternative[s]?[:\s]+/i, "").trim(),
          reasoning: "See main response for details",
          trade_offs: [],
          confidence: confidence * 0.8,
        });
      }
    }

    // Extract safety warnings
    const safetyWarnings: string[] = [];
    const safetyMatches = answer.match(/(?:warning|caution|safety|danger)[:\s]+([^\n]+)/gi);
    if (safetyMatches) {
      safetyWarnings.push(...safetyMatches.slice(0, 5));
    }

    return {
      success: true,
      recommendation: answer,
      reasoning,
      confidence: Math.min(1, Math.max(0, confidence)),
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      safety_warnings: safetyWarnings.length > 0 ? safetyWarnings : undefined,
      source: "ai",
      processing_time_ms: Date.now() - start,
    };
  }

  private async performSafetyCheck(
    request: AIReasoningRequest,
    result: AIReasoningResult
  ): Promise<{ blocked: boolean; reason?: string; warnings: string[] }> {
    // Quick safety validation
    const warnings: string[] = [];

    // Check for dangerous values in context
    if (request.context.rpm && request.context.rpm > 30000) {
      warnings.push(`High RPM (${request.context.rpm}) - verify spindle limits`);
    }
    if (request.context.feed_rate && request.context.feed_rate > 5000) {
      warnings.push(`High feed rate (${request.context.feed_rate}) - verify machine capability`);
    }
    if (request.context.doc && request.context.doc > 20) {
      warnings.push(`Large DOC (${request.context.doc}mm) - verify rigidity and power`);
    }

    // Check recommendation for risky content
    const rec = result.recommendation.toLowerCase();
    if (rec.includes("maximum") && rec.includes("spindle")) {
      warnings.push("Recommendation suggests maximum spindle speed - verify limits");
    }
    if (rec.includes("aggressive") && (rec.includes("feed") || rec.includes("cut"))) {
      warnings.push("Aggressive parameters recommended - start conservative and adjust");
    }

    return {
      blocked: false,
      warnings,
    };
  }

  private getFallbackResult(request: AIReasoningRequest, start: number, error: string): AIReasoningResult {
    return {
      success: false,
      recommendation: `AI reasoning unavailable: ${error}. Please consult manufacturing reference materials for ${request.domain} guidance.`,
      reasoning: ["AI service temporarily unavailable", "Fallback to manual analysis recommended"],
      confidence: 0,
      source: "fallback",
      processing_time_ms: Date.now() - start,
    };
  }

  // ============================================================================
  // DOMAIN-SPECIFIC CONVENIENCE METHODS
  // ============================================================================

  /**
   * Speed/Feed Optimization
   */
  async optimizeSpeedFeed(params: {
    material: string;
    tool_diameter: number;
    tool_type: string;
    operation: string;
    machine?: string;
    surface_finish?: string;
  }): Promise<AIReasoningResult> {
    return this.reason({
      domain: "speed_feed",
      intent: `Optimize cutting parameters for ${params.operation} of ${params.material}`,
      context: params,
      options: { safety_check: true, include_alternatives: true },
    });
  }

  /**
   * Tool Selection
   */
  async selectTool(params: {
    operation: string;
    material: string;
    feature_type: string;
    dimensions?: Record<string, number>;
    surface_finish?: string;
  }): Promise<AIReasoningResult> {
    return this.reason({
      domain: "tool_selection",
      intent: `Select optimal tool for ${params.operation} on ${params.material}`,
      context: params,
      options: { include_alternatives: true },
    });
  }

  /**
   * Operation Sequencing
   */
  async sequenceOperations(params: {
    features: string[];
    material: string;
    machine_type: string;
    constraints?: string[];
  }): Promise<AIReasoningResult> {
    return this.reason({
      domain: "operation_sequence",
      intent: `Determine optimal operation sequence for part with ${params.features.length} features`,
      context: params,
    });
  }

  /**
   * Toolpath Strategy Selection
   */
  async selectToolpathStrategy(params: {
    feature: string;
    material: string;
    tool: string;
    machine_type: string;
    priorities: string[];
  }): Promise<AIReasoningResult> {
    return this.reason({
      domain: "toolpath_strategy",
      intent: `Select optimal toolpath strategy for ${params.feature}`,
      context: params,
      options: { include_alternatives: true },
    });
  }

  /**
   * Quote Optimization
   */
  async optimizeQuote(params: {
    part_details: Record<string, any>;
    current_quote: Record<string, number>;
    target_margin: number;
    competition?: string;
  }): Promise<AIReasoningResult> {
    return this.reason({
      domain: "quote_optimization",
      intent: "Optimize manufacturing quote for competitiveness while maintaining margin",
      context: params,
      options: { include_alternatives: true },
    });
  }

  /**
   * Error/Problem Resolution
   */
  async resolveError(params: {
    error_type: string;
    description: string;
    machine?: string;
    operation?: string;
    symptoms?: string[];
  }): Promise<AIReasoningResult> {
    return this.reason({
      domain: "error_resolution",
      intent: `Diagnose and resolve: ${params.error_type}`,
      context: params,
    });
  }

  /**
   * Safety Validation
   */
  async validateSafety(params: {
    operation: string;
    parameters: Record<string, number>;
    machine: string;
    tool: string;
    workholding: string;
  }): Promise<AIReasoningResult> {
    return this.reason({
      domain: "safety_validation",
      intent: `Validate safety of ${params.operation} operation`,
      context: params,
      options: { safety_check: true },
    });
  }

  /**
   * Manufacturing Feasibility
   */
  async analyzeFeasibility(params: {
    part_description: string;
    tolerances: Record<string, number>;
    material: string;
    quantity: number;
    deadline?: string;
  }): Promise<AIReasoningResult> {
    return this.reason({
      domain: "feasibility_analysis",
      intent: "Analyze manufacturing feasibility of part design",
      context: params,
    });
  }

  /**
   * Process Planning
   */
  async createProcessPlan(params: {
    part_name: string;
    material: string;
    features: string[];
    tolerances: Record<string, number>;
    quantity: number;
  }): Promise<AIReasoningResult> {
    return this.reason({
      domain: "process_planning",
      intent: `Create process plan for ${params.part_name}`,
      context: params,
    });
  }

  /**
   * G-code Optimization
   */
  async optimizeGcode(params: {
    gcode_sample: string;
    controller: string;
    optimization_goals: string[];
  }): Promise<AIReasoningResult> {
    return this.reason({
      domain: "gcode_optimization",
      intent: "Optimize G-code for efficiency and quality",
      context: params,
    });
  }

  // ============================================================================
  // STATS & MONITORING
  // ============================================================================

  getStats(): typeof this.stats & { recent_requests: number } {
    return {
      ...this.stats,
      recent_requests: this.requestLog.length,
    };
  }

  getRecentRequests(limit = 10): typeof this.requestLog {
    return this.requestLog.slice(-limit);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const prismIntelligence = new PRISMIntelligenceLayer();

// ============================================================================
// QUICK ACCESS HELPERS
// ============================================================================

/** Convenience function for quick AI reasoning */
export async function aiReason(
  domain: AIReasoningDomain,
  intent: string,
  context: Record<string, any>
): Promise<AIReasoningResult> {
  return prismIntelligence.reason({ domain, intent, context });
}

/** Quick speed/feed optimization */
export async function aiSpeedFeed(
  material: string,
  tool_diameter: number,
  tool_type: string,
  operation: string
): Promise<AIReasoningResult> {
  return prismIntelligence.optimizeSpeedFeed({ material, tool_diameter, tool_type, operation });
}

/** Quick safety validation */
export async function aiSafetyCheck(
  operation: string,
  parameters: Record<string, number>,
  machine: string
): Promise<AIReasoningResult> {
  return prismIntelligence.validateSafety({
    operation,
    parameters,
    machine,
    tool: "unknown",
    workholding: "unknown",
  });
}
