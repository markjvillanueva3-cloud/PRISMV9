/**
 * OpusCapabilityEngine — AI-INTEG-MS2
 * ====================================
 * Exposes Claude Opus-level capabilities to the MCP server with intelligent
 * routing based on query complexity. Routes simple queries to faster/cheaper
 * models while reserving Opus for complex multi-step reasoning.
 *
 * Capability Tiers:
 *   - TIER_1 (Haiku): Simple lookups, format conversions, basic calculations
 *   - TIER_2 (Sonnet): Multi-step reasoning, pattern recognition, synthesis
 *   - TIER_3 (Opus): Deep analysis, novel problem solving, complex physics
 *
 * Key Features:
 *   - Complexity classification for optimal model routing
 *   - Token budget awareness and optimization
 *   - Multi-step physics validation chains
 *   - Natural language to structured query translation
 *   - Business logic synthesis
 *   - Caching for expensive Opus queries
 *
 * @module engines/OpusCapabilityEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { eventBus } from "./EventBus.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_PATH = path.join(process.cwd(), "data", "state", "opus-capability-cache.json");
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour for Opus queries
const MAX_CACHE_ENTRIES = 500;

// Token cost estimates per 1K tokens (relative units).
// EXPORTED (U-ALPHA-HERMES-GRAPH-IMPROVE) as the single source of truth for
// inter-tier cost RATIOS so downstream sizing (e.g. OpusFastMaxAgentSpecEngine's
// opus budget table) derives opus ~= 5x sonnet from here instead of inlining a
// magic multiplier. Relative units only -- anchor an absolute table to one tier,
// then scale by the ratio.
export const MODEL_COSTS = {
  haiku: 1,
  sonnet: 3,
  opus: 15,
} as const;

// Complexity thresholds for routing
const COMPLEXITY_THRESHOLDS = {
  simple: 0.3,   // Route to Haiku
  moderate: 0.6, // Route to Sonnet
  // Above 0.6: Route to Opus
} as const;

// ============================================================================
// TYPES
// ============================================================================

/** Model tier for capability routing */
export type ModelTier = "haiku" | "sonnet" | "opus";

/** Capability category */
export type CapabilityCategory =
  | "physics_validation"      // Multi-step physics checks
  | "deep_reasoning"          // Complex problem analysis
  | "nl_to_structured"        // Natural language translation
  | "business_synthesis"      // Business logic generation
  | "knowledge_extraction"    // Extract structured knowledge
  | "hypothesis_generation"   // Generate and test hypotheses
  | "dimensional_analysis"    // Verify units and dimensions
  | "formula_derivation"      // Derive formulas from principles
  | "cost_optimization"       // Optimize costs/resources
  | "process_planning"        // Multi-step process plans
  | "error_diagnosis"         // Diagnose complex errors
  | "general";

/** Complexity factors for routing decision */
export interface ComplexityFactors {
  /** Number of reasoning steps required */
  step_count: number;
  /** Requires physics knowledge */
  physics_required: boolean;
  /** Requires business logic */
  business_logic: boolean;
  /** Requires cross-domain synthesis */
  cross_domain: boolean;
  /** Novel problem (not seen before) */
  novel_problem: boolean;
  /** Safety-critical decision */
  safety_critical: boolean;
  /** Requires numerical precision */
  precision_required: boolean;
  /** Input token count estimate */
  input_tokens: number;
  /** Expected output tokens */
  expected_output_tokens: number;
}

/** Opus capability request */
export interface OpusRequest {
  /** Request identifier */
  request_id?: string;
  /** Capability category */
  category: CapabilityCategory;
  /** Natural language intent */
  intent: string;
  /** Structured context */
  context: Record<string, unknown>;
  /** Constraints on the response */
  constraints?: OpusConstraints;
  /** Force a specific model tier */
  force_tier?: ModelTier;
  /** Skip cache lookup */
  skip_cache?: boolean;
}

/** Constraints on Opus response */
export interface OpusConstraints {
  /** Maximum tokens for response */
  max_tokens?: number;
  /** Maximum cost (relative units) */
  max_cost?: number;
  /** Required confidence level */
  min_confidence?: number;
  /** Require explanation */
  require_explanation?: boolean;
  /** Require alternatives */
  require_alternatives?: boolean;
  /** Safety validation required */
  safety_check?: boolean;
}

/** Opus capability response */
export interface OpusResponse {
  /** Request ID */
  request_id: string;
  /** Whether request succeeded */
  success: boolean;
  /** Model tier used */
  tier_used: ModelTier;
  /** Primary result */
  result: unknown;
  /** Reasoning chain */
  reasoning: string[];
  /** Confidence in result */
  confidence: number;
  /** Alternative approaches */
  alternatives?: OpusAlternative[];
  /** Safety warnings */
  safety_warnings?: string[];
  /** Structured output (if NL translation) */
  structured_output?: Record<string, unknown>;
  /** Token usage */
  tokens_used: number;
  /** Cost (relative units) */
  cost: number;
  /** Processing time */
  duration_ms: number;
  /** From cache */
  from_cache: boolean;
  /** Complexity assessment */
  complexity: ComplexityAssessment;
}

/** Alternative approach */
export interface OpusAlternative {
  approach: string;
  reasoning: string;
  trade_offs: string[];
  confidence: number;
}

/** Complexity assessment result */
export interface ComplexityAssessment {
  score: number;
  factors: ComplexityFactors;
  recommended_tier: ModelTier;
  reasoning: string;
}

/** Cached Opus result */
interface CachedResult {
  request_hash: string;
  response: OpusResponse;
  created_at: string;
  hits: number;
}

/** Physics validation chain step */
export interface PhysicsValidationStep {
  step_id: string;
  description: string;
  formula?: string;
  inputs: Record<string, number>;
  expected_output: number;
  actual_output?: number;
  units: string;
  valid?: boolean;
  error_percent?: number;
}

/** Physics validation result */
export interface PhysicsValidationResult {
  valid: boolean;
  steps: PhysicsValidationStep[];
  overall_error: number;
  failed_steps: string[];
  warnings: string[];
  confidence: number;
}

/** NL to structured translation result */
export interface NLTranslationResult {
  success: boolean;
  original_text: string;
  structured_query: Record<string, unknown>;
  confidence: number;
  ambiguities: string[];
  assumptions: string[];
}

/** Engine statistics */
export interface OpusCapabilityStats {
  total_requests: number;
  requests_by_tier: Record<ModelTier, number>;
  requests_by_category: Record<string, number>;
  avg_complexity_score: number;
  cache_hit_rate: number;
  total_cost: number;
  avg_confidence: number;
  tier_distribution: Record<ModelTier, number>;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class OpusCapabilityEngine {
  private cache: Map<string, CachedResult> = new Map();
  private stats: OpusCapabilityStats = {
    total_requests: 0,
    requests_by_tier: { haiku: 0, sonnet: 0, opus: 0 },
    requests_by_category: {},
    avg_complexity_score: 0,
    cache_hit_rate: 0,
    total_cost: 0,
    avg_confidence: 0,
    tier_distribution: { haiku: 0, sonnet: 0, opus: 0 },
  };
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.loadCache();
    // Periodic cache cleanup
    setInterval(() => this.cleanupCache(), 15 * 60 * 1000);
  }

  // ==========================================================================
  // MAIN EXECUTION
  // ==========================================================================

  /**
   * Execute an Opus-level capability request.
   */
  async execute(request: OpusRequest): Promise<OpusResponse> {
    const startTime = Date.now();
    const requestId = request.request_id || `opus-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    log.info(`[OpusCapability] Executing ${request.category}: ${request.intent.slice(0, 50)}...`);

    // Assess complexity
    const complexity = this.assessComplexity(request);

    // Check cache for Opus queries
    if (!request.skip_cache && complexity.recommended_tier === "opus") {
      const cached = this.checkCache(request);
      if (cached) {
        this.cacheHits++;
        cached.from_cache = true;
        this.updateStats(cached, complexity);
        return cached;
      }
    }
    this.cacheMisses++;

    // Determine tier (forced or recommended)
    const tier = request.force_tier || complexity.recommended_tier;

    // Execute based on category
    let response: OpusResponse;
    try {
      switch (request.category) {
        case "physics_validation":
          response = await this.executePhysicsValidation(requestId, request, tier, complexity, startTime);
          break;
        case "nl_to_structured":
          response = await this.executeNLTranslation(requestId, request, tier, complexity, startTime);
          break;
        case "dimensional_analysis":
          response = await this.executeDimensionalAnalysis(requestId, request, tier, complexity, startTime);
          break;
        case "hypothesis_generation":
          response = await this.executeHypothesisGeneration(requestId, request, tier, complexity, startTime);
          break;
        case "deep_reasoning":
        case "business_synthesis":
        case "formula_derivation":
        case "cost_optimization":
        case "process_planning":
        case "error_diagnosis":
        case "knowledge_extraction":
        case "general":
        default:
          response = await this.executeGeneralReasoning(requestId, request, tier, complexity, startTime);
      }

      // Cache Opus responses
      if (tier === "opus" && response.success) {
        this.cacheResult(request, response);
      }

      this.updateStats(response, complexity);
      this.publishEvent(request, response);

      return response;
    } catch (error: any) {
      log.error(`[OpusCapability] Execution failed: ${error.message}`);
      return this.createErrorResponse(requestId, tier, complexity, startTime, error.message);
    }
  }

  // ==========================================================================
  // COMPLEXITY ASSESSMENT
  // ==========================================================================

  /**
   * Assess the complexity of a request to determine routing.
   */
  assessComplexity(request: OpusRequest): ComplexityAssessment {
    const factors: ComplexityFactors = {
      step_count: this.estimateStepCount(request),
      physics_required: this.requiresPhysics(request),
      business_logic: this.requiresBusinessLogic(request),
      cross_domain: this.isCrossDomain(request),
      novel_problem: this.isNovelProblem(request),
      safety_critical: this.isSafetyCritical(request),
      precision_required: this.requiresPrecision(request),
      input_tokens: this.estimateInputTokens(request),
      expected_output_tokens: this.estimateOutputTokens(request),
    };

    // Calculate complexity score (0-1)
    let score = 0;
    if (factors.step_count > 5) score += 0.2;
    else if (factors.step_count > 2) score += 0.1;
    if (factors.physics_required) score += 0.15;
    if (factors.business_logic) score += 0.1;
    if (factors.cross_domain) score += 0.15;
    if (factors.novel_problem) score += 0.2;
    if (factors.safety_critical) score += 0.15;
    if (factors.precision_required) score += 0.1;
    if (factors.input_tokens > 2000) score += 0.1;

    // Category-specific adjustments
    if (request.category === "physics_validation") score += 0.2;
    if (request.category === "formula_derivation") score += 0.25;
    if (request.category === "hypothesis_generation") score += 0.2;

    score = Math.min(1, score);

    // Determine recommended tier
    let recommended_tier: ModelTier;
    let reasoning: string;

    if (score <= COMPLEXITY_THRESHOLDS.simple) {
      recommended_tier = "haiku";
      reasoning = "Simple query suitable for fast processing";
    } else if (score <= COMPLEXITY_THRESHOLDS.moderate) {
      recommended_tier = "sonnet";
      reasoning = "Moderate complexity requiring multi-step reasoning";
    } else {
      recommended_tier = "opus";
      reasoning = "Complex query requiring deep analysis";
    }

    // Force Opus for certain categories
    if (["physics_validation", "formula_derivation", "hypothesis_generation"].includes(request.category)) {
      if (recommended_tier !== "opus" && score > 0.4) {
        recommended_tier = "opus";
        reasoning = `${request.category} benefits from Opus-level reasoning`;
      }
    }

    return { score, factors, recommended_tier, reasoning };
  }

  private estimateStepCount(request: OpusRequest): number {
    const intent = request.intent.toLowerCase();
    if (intent.includes("step by step") || intent.includes("detailed")) return 8;
    if (intent.includes("validate") || intent.includes("verify")) return 5;
    if (intent.includes("calculate") || intent.includes("compute")) return 3;
    return 2;
  }

  private requiresPhysics(request: OpusRequest): boolean {
    const keywords = ["force", "temperature", "stress", "strain", "kienzle", "taylor", "deflection", "thermal", "vibration"];
    const text = `${request.intent} ${JSON.stringify(request.context)}`.toLowerCase();
    return keywords.some(k => text.includes(k));
  }

  private requiresBusinessLogic(request: OpusRequest): boolean {
    const keywords = ["cost", "quote", "price", "profit", "margin", "capacity", "schedule", "lead time"];
    const text = `${request.intent} ${JSON.stringify(request.context)}`.toLowerCase();
    return keywords.some(k => text.includes(k));
  }

  private isCrossDomain(request: OpusRequest): boolean {
    const domains = ["physics", "business", "quality", "scheduling", "tooling", "process"];
    const text = `${request.intent} ${JSON.stringify(request.context)}`.toLowerCase();
    const matches = domains.filter(d => text.includes(d));
    return matches.length >= 2;
  }

  private isNovelProblem(request: OpusRequest): boolean {
    // Check if this request pattern has been seen before
    const hash = this.hashRequest(request);
    return !this.cache.has(hash);
  }

  private isSafetyCritical(request: OpusRequest): boolean {
    const keywords = ["safety", "collision", "crash", "limit", "overload", "danger", "critical"];
    const text = `${request.intent} ${JSON.stringify(request.context)}`.toLowerCase();
    return keywords.some(k => text.includes(k));
  }

  private requiresPrecision(request: OpusRequest): boolean {
    const keywords = ["tolerance", "precision", "accuracy", "exact", "µm", "micron", "decimal"];
    const text = `${request.intent} ${JSON.stringify(request.context)}`.toLowerCase();
    return keywords.some(k => text.includes(k));
  }

  private estimateInputTokens(request: OpusRequest): number {
    const contextStr = JSON.stringify(request.context);
    return Math.ceil((request.intent.length + contextStr.length) / 4);
  }

  private estimateOutputTokens(request: OpusRequest): number {
    if (request.constraints?.max_tokens) return request.constraints.max_tokens;
    if (request.category === "physics_validation") return 2000;
    if (request.category === "deep_reasoning") return 1500;
    return 1000;
  }

  // ==========================================================================
  // SPECIALIZED EXECUTORS
  // ==========================================================================

  /**
   * Execute multi-step physics validation.
   */
  private async executePhysicsValidation(
    requestId: string,
    request: OpusRequest,
    tier: ModelTier,
    complexity: ComplexityAssessment,
    startTime: number
  ): Promise<OpusResponse> {
    const steps: PhysicsValidationStep[] = [];
    const context = request.context as Record<string, any>;

    // Define validation chain based on context
    if (context.force_calculation) {
      steps.push({
        step_id: "force-1",
        description: "Validate cutting force using Kienzle model",
        formula: "Fc = kc1_1 * ap * fz^(1-mc)",
        inputs: {
          kc1_1: context.kc1_1 || 1800,
          ap: context.ap || 2,
          fz: context.fz || 0.15,
          mc: context.mc || 0.25,
        },
        expected_output: context.expected_force || 0,
        units: "N",
      });
    }

    if (context.temperature_calculation) {
      steps.push({
        step_id: "temp-1",
        description: "Validate cutting temperature",
        formula: "T = T_ambient + ΔT_cutting",
        inputs: {
          T_ambient: context.T_ambient || 20,
          cutting_speed: context.cutting_speed || 150,
          feed: context.feed || 0.2,
        },
        expected_output: context.expected_temp || 0,
        units: "°C",
      });
    }

    if (context.power_calculation) {
      steps.push({
        step_id: "power-1",
        description: "Validate spindle power requirement",
        formula: "P = Fc * Vc / (60 * 1000 * η)",
        inputs: {
          Fc: context.Fc || 500,
          Vc: context.Vc || 150,
          eta: context.eta || 0.85,
        },
        expected_output: context.expected_power || 0,
        units: "kW",
      });
    }

    // Execute validation steps
    const validationResult = await this.runPhysicsValidationSteps(steps, context);

    return {
      request_id: requestId,
      success: validationResult.valid,
      tier_used: tier,
      result: validationResult,
      reasoning: [
        `Validated ${steps.length} physics steps`,
        `Overall error: ${(validationResult.overall_error * 100).toFixed(1)}%`,
        ...validationResult.failed_steps.map(s => `Failed: ${s}`),
      ],
      confidence: validationResult.confidence,
      safety_warnings: validationResult.warnings,
      tokens_used: this.estimateTokensUsed(tier, steps.length * 200),
      cost: this.calculateCost(tier, steps.length * 200),
      duration_ms: Date.now() - startTime,
      from_cache: false,
      complexity,
    };
  }

  private async runPhysicsValidationSteps(
    steps: PhysicsValidationStep[],
    context: Record<string, any>
  ): Promise<PhysicsValidationResult> {
    const failedSteps: string[] = [];
    const warnings: string[] = [];
    let totalError = 0;

    for (const step of steps) {
      // Calculate actual output based on formula
      let actual: number;
      switch (step.step_id) {
        case "force-1":
          actual = step.inputs.kc1_1 * step.inputs.ap * Math.pow(step.inputs.fz, 1 - step.inputs.mc);
          break;
        case "temp-1":
          actual = step.inputs.T_ambient + 0.4 * Math.pow(step.inputs.cutting_speed * step.inputs.feed, 0.5) * 100;
          break;
        case "power-1":
          actual = (step.inputs.Fc * step.inputs.Vc) / (60 * 1000 * step.inputs.eta);
          break;
        default:
          actual = 0;
      }

      step.actual_output = actual;

      if (step.expected_output > 0) {
        step.error_percent = Math.abs(actual - step.expected_output) / step.expected_output;
        step.valid = step.error_percent < 0.1; // 10% tolerance
        totalError += step.error_percent;

        if (!step.valid) {
          failedSteps.push(`${step.description}: expected ${step.expected_output}${step.units}, got ${actual.toFixed(2)}${step.units}`);
        }
      } else {
        step.valid = true;
      }
    }

    const avgError = steps.length > 0 ? totalError / steps.length : 0;

    // Add warnings for high values
    for (const step of steps) {
      if (step.step_id === "temp-1" && (step.actual_output || 0) > 600) {
        warnings.push(`Cutting temperature ${step.actual_output?.toFixed(0)}°C exceeds safe limit`);
      }
      if (step.step_id === "power-1" && (step.actual_output || 0) > 20) {
        warnings.push(`Power requirement ${step.actual_output?.toFixed(1)}kW may exceed machine capacity`);
      }
    }

    return {
      valid: failedSteps.length === 0,
      steps,
      overall_error: avgError,
      failed_steps: failedSteps,
      warnings,
      confidence: Math.max(0.5, 1 - avgError),
    };
  }

  /**
   * Execute natural language to structured query translation.
   */
  private async executeNLTranslation(
    requestId: string,
    request: OpusRequest,
    tier: ModelTier,
    complexity: ComplexityAssessment,
    startTime: number
  ): Promise<OpusResponse> {
    const intent = request.intent;
    const ambiguities: string[] = [];
    const assumptions: string[] = [];

    // Parse intent to structured query
    const structured: Record<string, unknown> = {};

    // Extract operation type
    const opPatterns = [
      { pattern: /rough|roughing/i, value: "roughing" },
      { pattern: /finish|finishing/i, value: "finishing" },
      { pattern: /drill|drilling|hole/i, value: "drilling" },
      { pattern: /thread|threading|tap/i, value: "threading" },
      { pattern: /face|facing/i, value: "facing" },
      { pattern: /turn|turning/i, value: "turning" },
      { pattern: /bore|boring/i, value: "boring" },
      { pattern: /mill|milling/i, value: "milling" },
    ];

    for (const { pattern, value } of opPatterns) {
      if (pattern.test(intent)) {
        structured.operation = value;
        break;
      }
    }

    // Extract material
    const materialPatterns = [
      { pattern: /steel|stainless/i, value: "steel" },
      { pattern: /aluminum|aluminium/i, value: "aluminum" },
      { pattern: /titanium/i, value: "titanium" },
      { pattern: /brass/i, value: "brass" },
      { pattern: /copper/i, value: "copper" },
      { pattern: /inconel/i, value: "inconel" },
      { pattern: /cast iron/i, value: "cast_iron" },
    ];

    for (const { pattern, value } of materialPatterns) {
      if (pattern.test(intent)) {
        structured.material = value;
        break;
      }
    }

    // Extract dimensions (numbers with units)
    const dimMatch = intent.match(/(\d+(?:\.\d+)?)\s*(mm|in|inch|inches|")/gi);
    if (dimMatch) {
      structured.dimensions = dimMatch.map(d => d.trim());
    }

    // Extract speed/feed values
    const spmMatch = intent.match(/(\d+)\s*(rpm|sfm|m\/min)/i);
    if (spmMatch) {
      structured.speed = { value: parseFloat(spmMatch[1]), unit: spmMatch[2].toLowerCase() };
    }

    const feedMatch = intent.match(/(\d+(?:\.\d+)?)\s*(ipm|mm\/min|ipr|mm\/rev)/i);
    if (feedMatch) {
      structured.feed = { value: parseFloat(feedMatch[1]), unit: feedMatch[2].toLowerCase() };
    }

    // Note ambiguities
    if (!structured.operation) {
      ambiguities.push("Operation type not specified");
      assumptions.push("Assuming general machining operation");
    }
    if (!structured.material) {
      ambiguities.push("Material not specified");
      assumptions.push("Material must be provided for accurate parameters");
    }

    const confidence = 1 - (ambiguities.length * 0.15);

    const translationResult: NLTranslationResult = {
      success: ambiguities.length < 3,
      original_text: intent,
      structured_query: structured,
      confidence,
      ambiguities,
      assumptions,
    };

    return {
      request_id: requestId,
      success: translationResult.success,
      tier_used: tier,
      result: translationResult,
      reasoning: [
        `Parsed natural language query`,
        `Extracted ${Object.keys(structured).length} structured fields`,
        ...ambiguities.map(a => `Ambiguity: ${a}`),
        ...assumptions.map(a => `Assumption: ${a}`),
      ],
      confidence,
      structured_output: structured,
      tokens_used: this.estimateTokensUsed(tier, intent.length * 2),
      cost: this.calculateCost(tier, intent.length * 2),
      duration_ms: Date.now() - startTime,
      from_cache: false,
      complexity,
    };
  }

  /**
   * Execute dimensional analysis.
   */
  private async executeDimensionalAnalysis(
    requestId: string,
    request: OpusRequest,
    tier: ModelTier,
    complexity: ComplexityAssessment,
    startTime: number
  ): Promise<OpusResponse> {
    const context = request.context as Record<string, any>;
    const formula = context.formula || "";
    const units = context.units || {};

    const reasoning: string[] = [];
    let valid = true;
    const warnings: string[] = [];

    // Common dimensional checks
    const dimensionalRules: Array<{ pattern: RegExp; expected: string; description: string }> = [
      { pattern: /F\s*=\s*m\s*\*\s*a/i, expected: "[M][L][T]^-2", description: "Force = mass × acceleration" },
      { pattern: /P\s*=\s*F\s*\*\s*v/i, expected: "[M][L]^2[T]^-3", description: "Power = force × velocity" },
      { pattern: /E\s*=.*m\s*\*\s*v\^?2/i, expected: "[M][L]^2[T]^-2", description: "Energy = ½mv²" },
      { pattern: /σ\s*=\s*F\s*\/\s*A/i, expected: "[M][L]^-1[T]^-2", description: "Stress = force / area" },
    ];

    for (const rule of dimensionalRules) {
      if (rule.pattern.test(formula)) {
        reasoning.push(`Recognized: ${rule.description}`);
        reasoning.push(`Expected dimensions: ${rule.expected}`);
      }
    }

    // Check provided units
    if (Object.keys(units).length > 0) {
      reasoning.push("Checking provided units...");
      for (const [variable, unit] of Object.entries(units)) {
        reasoning.push(`  ${variable}: ${unit}`);
      }
    }

    if (reasoning.length === 0) {
      reasoning.push("No recognized formula pattern");
      warnings.push("Could not verify dimensional consistency");
      valid = false;
    }

    return {
      request_id: requestId,
      success: valid,
      tier_used: tier,
      result: { valid, formula, units_checked: Object.keys(units).length },
      reasoning,
      confidence: valid ? 0.9 : 0.5,
      safety_warnings: warnings,
      tokens_used: this.estimateTokensUsed(tier, 500),
      cost: this.calculateCost(tier, 500),
      duration_ms: Date.now() - startTime,
      from_cache: false,
      complexity,
    };
  }

  /**
   * Execute hypothesis generation.
   */
  private async executeHypothesisGeneration(
    requestId: string,
    request: OpusRequest,
    tier: ModelTier,
    complexity: ComplexityAssessment,
    startTime: number
  ): Promise<OpusResponse> {
    const context = request.context as Record<string, any>;
    const observation = context.observation || request.intent;

    // Generate hypotheses based on observation
    const hypotheses: Array<{ hypothesis: string; probability: number; test: string }> = [];
    const reasoning: string[] = [];

    // Pattern-based hypothesis generation
    if (/chatter|vibration/i.test(observation)) {
      hypotheses.push({
        hypothesis: "Spindle speed in unstable region of stability lobe diagram",
        probability: 0.7,
        test: "Vary spindle speed ±20% and observe vibration",
      });
      hypotheses.push({
        hypothesis: "Tool overhang too long causing deflection",
        probability: 0.6,
        test: "Measure tool deflection under cutting load",
      });
      hypotheses.push({
        hypothesis: "Workholding insufficient rigidity",
        probability: 0.5,
        test: "Check fixture clamping force and contact area",
      });
    } else if (/surface finish|roughness|poor finish/i.test(observation)) {
      hypotheses.push({
        hypothesis: "Feed rate too high for required finish",
        probability: 0.75,
        test: "Reduce feed rate by 30% and measure Ra",
      });
      hypotheses.push({
        hypothesis: "Tool wear affecting edge geometry",
        probability: 0.6,
        test: "Inspect tool edge under magnification",
      });
      hypotheses.push({
        hypothesis: "Built-up edge forming on tool",
        probability: 0.5,
        test: "Check for material adhesion on cutting edge",
      });
    } else if (/tool wear|tool life|short life/i.test(observation)) {
      hypotheses.push({
        hypothesis: "Cutting speed too high for material/tool combination",
        probability: 0.7,
        test: "Reduce cutting speed by 20% and monitor wear",
      });
      hypotheses.push({
        hypothesis: "Inadequate coolant coverage",
        probability: 0.55,
        test: "Verify coolant reaching cutting zone",
      });
    } else {
      hypotheses.push({
        hypothesis: "Requires further analysis of specific conditions",
        probability: 0.5,
        test: "Collect more data on operating parameters",
      });
    }

    reasoning.push(`Generated ${hypotheses.length} hypotheses for: "${observation.slice(0, 50)}..."`);
    reasoning.push("Hypotheses ranked by probability based on typical manufacturing patterns");
    for (const h of hypotheses) {
      reasoning.push(`  H: ${h.hypothesis} (P=${(h.probability * 100).toFixed(0)}%)`);
    }

    return {
      request_id: requestId,
      success: hypotheses.length > 0,
      tier_used: tier,
      result: { observation, hypotheses },
      reasoning,
      confidence: hypotheses.length > 0 ? hypotheses[0].probability : 0.3,
      alternatives: hypotheses.slice(1).map(h => ({
        approach: h.hypothesis,
        reasoning: h.test,
        trade_offs: [`Probability: ${(h.probability * 100).toFixed(0)}%`],
        confidence: h.probability,
      })),
      tokens_used: this.estimateTokensUsed(tier, 800),
      cost: this.calculateCost(tier, 800),
      duration_ms: Date.now() - startTime,
      from_cache: false,
      complexity,
    };
  }

  /**
   * Execute general deep reasoning.
   */
  private async executeGeneralReasoning(
    requestId: string,
    request: OpusRequest,
    tier: ModelTier,
    complexity: ComplexityAssessment,
    startTime: number
  ): Promise<OpusResponse> {
    // For general reasoning, we simulate the LLM response
    // In production, this would call the actual LLM API
    const reasoning: string[] = [
      `Analyzing: ${request.intent.slice(0, 100)}`,
      `Category: ${request.category}`,
      `Complexity: ${complexity.score.toFixed(2)} (${complexity.recommended_tier})`,
    ];

    if (complexity.factors.physics_required) {
      reasoning.push("Physics analysis required - applying manufacturing principles");
    }
    if (complexity.factors.business_logic) {
      reasoning.push("Business logic synthesis - considering cost and schedule factors");
    }
    if (complexity.factors.safety_critical) {
      reasoning.push("Safety-critical decision - applying conservative limits");
    }

    const confidence = 0.85 - (complexity.score * 0.2);

    return {
      request_id: requestId,
      success: true,
      tier_used: tier,
      result: {
        analysis: `Deep analysis of ${request.category} query`,
        recommendation: `Based on ${complexity.factors.step_count} reasoning steps`,
      },
      reasoning,
      confidence,
      tokens_used: this.estimateTokensUsed(tier, 1000),
      cost: this.calculateCost(tier, 1000),
      duration_ms: Date.now() - startTime,
      from_cache: false,
      complexity,
    };
  }

  // ==========================================================================
  // CACHING
  // ==========================================================================

  private hashRequest(request: OpusRequest): string {
    const normalized = {
      category: request.category,
      intent: request.intent.toLowerCase().trim(),
      context: JSON.stringify(request.context),
    };
    return createHash("sha256").update(JSON.stringify(normalized)).digest("hex").slice(0, 16);
  }

  private checkCache(request: OpusRequest): OpusResponse | null {
    const hash = this.hashRequest(request);
    const cached = this.cache.get(hash);

    if (cached) {
      const age = Date.now() - new Date(cached.created_at).getTime();
      if (age < CACHE_TTL_MS) {
        cached.hits++;
        log.info(`[OpusCapability] Cache hit for ${request.category}`);
        return { ...cached.response };
      }
    }
    return null;
  }

  private cacheResult(request: OpusRequest, response: OpusResponse): void {
    const hash = this.hashRequest(request);
    this.cache.set(hash, {
      request_hash: hash,
      response,
      created_at: new Date().toISOString(),
      hits: 0,
    });

    // Trim cache if needed
    if (this.cache.size > MAX_CACHE_ENTRIES) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].created_at.localeCompare(b[1].created_at))
        .slice(0, this.cache.size - MAX_CACHE_ENTRIES);
      for (const [key] of oldest) {
        this.cache.delete(key);
      }
    }

    this.persistCache();
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of this.cache.entries()) {
      const age = now - new Date(cached.created_at).getTime();
      if (age > CACHE_TTL_MS) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.info(`[OpusCapability] Cleaned ${cleaned} expired cache entries`);
      this.persistCache();
    }
  }

  private loadCache(): void {
    try {
      if (fs.existsSync(CACHE_PATH)) {
        const data = JSON.parse(fs.readFileSync(CACHE_PATH, "utf-8"));
        for (const entry of data.entries || []) {
          this.cache.set(entry.request_hash, entry);
        }
        log.info(`[OpusCapability] Loaded ${this.cache.size} cached entries`);
      }
    } catch (error: any) {
      log.warn(`[OpusCapability] Failed to load cache: ${error.message}`);
    }
  }

  private persistCache(): void {
    try {
      const data = {
        version: 1,
        updated_at: new Date().toISOString(),
        entries: Array.from(this.cache.values()),
      };
      safeWriteSync(CACHE_PATH, JSON.stringify(data, null, 2));
    } catch (error: any) {
      log.warn(`[OpusCapability] Failed to persist cache: ${error.message}`);
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private estimateTokensUsed(tier: ModelTier, baseTokens: number): number {
    // Opus tends to produce more detailed responses
    const multiplier = tier === "opus" ? 1.5 : tier === "sonnet" ? 1.2 : 1.0;
    return Math.ceil(baseTokens * multiplier);
  }

  private calculateCost(tier: ModelTier, tokens: number): number {
    return Math.ceil((tokens / 1000) * MODEL_COSTS[tier]);
  }

  private createErrorResponse(
    requestId: string,
    tier: ModelTier,
    complexity: ComplexityAssessment,
    startTime: number,
    error: string
  ): OpusResponse {
    return {
      request_id: requestId,
      success: false,
      tier_used: tier,
      result: { error },
      reasoning: [`Execution failed: ${error}`],
      confidence: 0,
      tokens_used: 0,
      cost: 0,
      duration_ms: Date.now() - startTime,
      from_cache: false,
      complexity,
    };
  }

  private updateStats(response: OpusResponse, complexity: ComplexityAssessment): void {
    this.stats.total_requests++;
    this.stats.requests_by_tier[response.tier_used]++;
    this.stats.total_cost += response.cost;

    // Update averages
    const n = this.stats.total_requests;
    this.stats.avg_complexity_score = (this.stats.avg_complexity_score * (n - 1) + complexity.score) / n;
    this.stats.avg_confidence = (this.stats.avg_confidence * (n - 1) + response.confidence) / n;

    // Cache hit rate
    const totalCacheOps = this.cacheHits + this.cacheMisses;
    this.stats.cache_hit_rate = totalCacheOps > 0 ? this.cacheHits / totalCacheOps : 0;

    // Tier distribution
    const total = Object.values(this.stats.requests_by_tier).reduce((a, b) => a + b, 0);
    for (const tier of ["haiku", "sonnet", "opus"] as ModelTier[]) {
      this.stats.tier_distribution[tier] = total > 0 ? this.stats.requests_by_tier[tier] / total : 0;
    }
  }

  private publishEvent(request: OpusRequest, response: OpusResponse): void {
    eventBus.publish("opus_capability", "execution_complete", {
      request_id: response.request_id,
      category: request.category,
      tier: response.tier_used,
      success: response.success,
      confidence: response.confidence,
      cost: response.cost,
      from_cache: response.from_cache,
    } as Record<string, unknown>);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get engine statistics.
   */
  getStats(): OpusCapabilityStats {
    return { ...this.stats };
  }

  /**
   * Clear the cache.
   */
  clearCache(): void {
    this.cache.clear();
    this.persistCache();
    log.info("[OpusCapability] Cache cleared");
  }

  /**
   * Get complexity assessment without execution.
   */
  getComplexityAssessment(request: OpusRequest): ComplexityAssessment {
    return this.assessComplexity(request);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const opusCapabilityEngine = new OpusCapabilityEngine();
