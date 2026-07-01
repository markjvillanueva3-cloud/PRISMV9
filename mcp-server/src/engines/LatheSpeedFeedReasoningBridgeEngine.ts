/**
 * LatheSpeedFeedReasoningBridgeEngine
 * ====================================
 *
 * Causal and counterfactual reasoning layer for lathe speed/feed calculations.
 * Bridges LatheSpeedFeedCalculatorFacadeEngine with what-if scenario analysis.
 *
 * Implements LATHE-MASTER U-LTH09 (Phase P1: Speed & Feed Calculator).
 *
 * Features:
 *   - What-if scenario analysis (>=6 scenarios)
 *   - Causal inference for parameter changes
 *   - Counterfactual reasoning (what would have happened)
 *   - Confidence degradation under extrapolation
 *   - Sensitivity analysis for key parameters
 *
 * @module engines/LatheSpeedFeedReasoningBridgeEngine
 * @version 1.0.0
 * @milestone LATHE-MASTER U-LTH09
 */

import { z } from "zod";
import {
  LatheSpeedFeedCalculatorFacadeEngine,
  type LatheSpeedFeedInput,
  type LatheSpeedFeedResult,
} from "./LatheSpeedFeedCalculatorFacadeEngine.js";
import {
  LatheSpeedFeedDeepLearningAdvisorEngine,
  type DLAdvisorInput,
} from "./LatheSpeedFeedDeepLearningAdvisorEngine.js";

// ── Input Schema ────────────────────────────────────────────────────────────

export const WhatIfScenarioSchema = z.object({
  /** Scenario type */
  type: z.enum([
    "change_material",
    "change_tool",
    "change_operation",
    "change_machine",
    "change_strategy",
    "change_coolant",
    "increase_speed",
    "decrease_speed",
    "increase_feed",
    "decrease_feed",
    "increase_depth",
    "decrease_depth",
  ]),
  /** Scenario parameters */
  params: z.object({
    material: z.string().optional(),
    strategy: z.string().optional(),
    type: z.string().optional(),
    coolant: z.string().optional(),
    nose_radius_mm: z.number().optional(),
    coating: z.string().optional(),
    max_rpm: z.number().optional(),
    max_power_kw: z.number().optional(),
    rigidity_factor: z.number().optional(),
  }).optional(),
  /** Delta percentage for increase/decrease scenarios */
  delta_percent: z.number().optional(),
});

export type WhatIfScenario = z.infer<typeof WhatIfScenarioSchema>;

export const ReasoningInputSchema = z.object({
  /** Base input for comparison */
  base_input: z.object({
    material: z.string(),
    tool: z.object({
      type: z.string(),
      diameter_mm: z.number().positive().optional(),
      nose_radius_mm: z.number().positive().optional(),
    }),
    operation: z.object({
      type: z.string(),
      coolant: z.string().optional(),
      target_ra_um: z.number().positive().optional(),
    }),
    strategy: z.string().optional(),
    machine: z.object({
      max_rpm: z.number().positive().optional(),
      max_power_kw: z.number().positive().optional(),
      rigidity_factor: z.number().optional(),
    }).optional(),
    workpiece: z.object({
      diameter_mm: z.number().positive().optional(),
    }).optional(),
  }),
  /** What-if scenarios to evaluate */
  scenarios: z.array(WhatIfScenarioSchema),
  /** Include sensitivity analysis */
  include_sensitivity: z.boolean().optional(),
  /** Include causal chain */
  include_causal_chain: z.boolean().optional(),
});

export type ReasoningInput = z.infer<typeof ReasoningInputSchema>;

// ── Output Types ────────────────────────────────────────────────────────────

export interface ScenarioResult {
  /** Scenario type */
  scenario_type: string;
  /** Description of the scenario */
  description: string;
  /** Modified input used */
  modified_input: LatheSpeedFeedInput;
  /** Result from calculator */
  result: LatheSpeedFeedResult;
  /** Comparison to baseline */
  comparison: {
    speed_delta_percent: number;
    feed_delta_percent: number;
    depth_delta_percent: number;
    rpm_delta_percent: number;
    tool_life_delta_percent: number;
    force_delta_percent: number;
    power_delta_percent: number;
  };
  /** Confidence for this scenario */
  confidence: number;
  /** Is this an extrapolation beyond training data */
  is_extrapolation: boolean;
  /** Causal explanation */
  causal_explanation: string;
}

export interface SensitivityEntry {
  /** Parameter name */
  parameter: string;
  /** Sensitivity coefficient (elasticity) */
  elasticity: number;
  /** Direction of impact */
  impact_direction: "positive" | "negative" | "nonlinear";
  /** Ranking (1 = most sensitive) */
  rank: number;
  /** Explanation */
  explanation: string;
}

export interface CausalLink {
  /** Cause variable */
  cause: string;
  /** Effect variable */
  effect: string;
  /** Strength of causal link [0-1] */
  strength: number;
  /** Mechanism explanation */
  mechanism: string;
}

export interface ReasoningResult {
  /** Success flag */
  success: boolean;
  /** Baseline result */
  baseline: LatheSpeedFeedResult;
  /** Scenario results */
  scenarios: ScenarioResult[];
  /** Sensitivity analysis (if requested) */
  sensitivity?: SensitivityEntry[];
  /** Causal chain (if requested) */
  causal_chain?: CausalLink[];
  /** Overall confidence in reasoning */
  overall_confidence: number;
  /** Reasoning summary */
  summary: string;
  /** Warnings */
  warnings: string[];
}

// ── Engine Class ────────────────────────────────────────────────────────────

export class LatheSpeedFeedReasoningBridgeEngine {
  private static readonly VERSION = "1.0.0";

  // Extrapolation thresholds
  private static readonly EXTRAPOLATION_THRESHOLDS = {
    speed_delta: 0.5, // >50% change is extrapolation
    feed_delta: 0.5,
    depth_delta: 0.75,
    material_hardness_delta: 0.4,
  };

  // Known causal relationships
  private static readonly CAUSAL_MODEL: CausalLink[] = [
    {
      cause: "cutting_speed",
      effect: "tool_temperature",
      strength: 0.9,
      mechanism: "Higher cutting speed increases friction heat at tool-chip interface (Q ∝ Vc)",
    },
    {
      cause: "cutting_speed",
      effect: "tool_life",
      strength: 0.95,
      mechanism: "Taylor equation: T = (C/Vc)^(1/n) — exponential decay with speed",
    },
    {
      cause: "feed_rate",
      effect: "cutting_force",
      strength: 0.85,
      mechanism: "Kienzle model: Fc ∝ f^(1-mc) — sublinear increase with feed",
    },
    {
      cause: "feed_rate",
      effect: "surface_roughness",
      strength: 0.9,
      mechanism: "Ra_theoretical = f²/(32×nose_radius) — quadratic relationship",
    },
    {
      cause: "depth_of_cut",
      effect: "cutting_force",
      strength: 0.95,
      mechanism: "Kienzle model: Fc ∝ ap — linear relationship with depth",
    },
    {
      cause: "depth_of_cut",
      effect: "power_requirement",
      strength: 0.9,
      mechanism: "P = Fc × Vc / 60000 — linear through force dependency",
    },
    {
      cause: "material_hardness",
      effect: "cutting_force",
      strength: 0.8,
      mechanism: "kc1.1 increases with hardness — harder materials resist cutting",
    },
    {
      cause: "tool_nose_radius",
      effect: "surface_roughness",
      strength: 0.85,
      mechanism: "Ra ∝ 1/r — larger radius produces better finish",
    },
    {
      cause: "coolant_type",
      effect: "tool_life",
      strength: 0.6,
      mechanism: "Cooling reduces thermal wear, lubricates reduces friction",
    },
    {
      cause: "machine_rigidity",
      effect: "chatter_risk",
      strength: 0.75,
      mechanism: "Higher rigidity raises stability limit, reducing chatter tendency",
    },
  ];

  /**
   * Apply scenario modification to base input.
   */
  private static applyScenario(
    base: LatheSpeedFeedInput,
    scenario: WhatIfScenario
  ): { input: LatheSpeedFeedInput; description: string; isExtrapolation: boolean } {
    const input = JSON.parse(JSON.stringify(base)) as LatheSpeedFeedInput;
    let description = "";
    let isExtrapolation = false;
    const delta = scenario.delta_percent ?? 20;

    switch (scenario.type) {
      case "change_material":
        input.material = scenario.params?.material ?? "aluminum_6061";
        description = `Changed material to ${input.material}`;
        isExtrapolation = true; // Cross-material inference is extrapolation
        break;

      case "change_tool":
        if (scenario.params?.nose_radius_mm) {
          input.tool.nose_radius_mm = scenario.params.nose_radius_mm;
        }
        if (scenario.params?.coating) {
          (input.tool as any).coating = scenario.params.coating;
        }
        description = `Modified tool geometry: nose_radius=${input.tool.nose_radius_mm}mm`;
        break;

      case "change_operation":
        if (scenario.params?.type) {
          input.operation.type = scenario.params.type as LatheSpeedFeedInput["operation"]["type"];
        } else {
          input.operation.type = "finishing";
        }
        description = `Changed operation to ${input.operation.type}`;
        break;

      case "change_machine":
        input.machine = {
          ...input.machine,
          max_rpm: scenario.params?.max_rpm ?? input.machine?.max_rpm,
          max_power_kw: scenario.params?.max_power_kw ?? input.machine?.max_power_kw,
          rigidity_factor: scenario.params?.rigidity_factor ?? input.machine?.rigidity_factor,
        };
        description = `Modified machine constraints`;
        break;

      case "change_strategy":
        if (scenario.params?.strategy) {
          input.strategy = scenario.params.strategy as LatheSpeedFeedInput["strategy"];
        } else {
          input.strategy = "aggressive";
        }
        description = `Changed strategy to ${input.strategy}`;
        break;

      case "change_coolant":
        if (scenario.params?.coolant) {
          input.operation.coolant = scenario.params.coolant as LatheSpeedFeedInput["operation"]["coolant"];
        } else {
          input.operation.coolant = "high_pressure";
        }
        description = `Changed coolant to ${input.operation.coolant}`;
        break;

      case "increase_speed":
        // Simulate speed increase by using aggressive strategy
        input.strategy = "aggressive";
        description = `Increased cutting speed by ~${delta}% (aggressive strategy)`;
        isExtrapolation = delta > 50;
        break;

      case "decrease_speed":
        input.strategy = "conservative";
        description = `Decreased cutting speed by ~${delta}% (conservative strategy)`;
        break;

      case "increase_feed":
        input.strategy = "aggressive";
        description = `Increased feed rate (aggressive strategy)`;
        isExtrapolation = delta > 50;
        break;

      case "decrease_feed":
        input.strategy = "conservative";
        description = `Decreased feed rate (conservative strategy)`;
        break;

      case "increase_depth":
        input.strategy = "aggressive";
        description = `Increased depth of cut (aggressive strategy)`;
        isExtrapolation = delta > 75;
        break;

      case "decrease_depth":
        input.strategy = "conservative";
        description = `Decreased depth of cut (conservative strategy)`;
        break;

      default:
        description = `Unknown scenario: ${scenario.type}`;
    }

    return { input, description, isExtrapolation };
  }

  /**
   * Calculate percentage delta.
   */
  private static calcDelta(baseline: number, modified: number): number {
    if (baseline === 0) return modified === 0 ? 0 : 100;
    return ((modified - baseline) / baseline) * 100;
  }

  /**
   * Generate causal explanation for scenario.
   */
  private static generateCausalExplanation(
    scenario: WhatIfScenario,
    comparison: ScenarioResult["comparison"]
  ): string {
    const parts: string[] = [];

    // Find relevant causal links
    const relevantLinks = this.CAUSAL_MODEL.filter((link) => {
      if (scenario.type.includes("speed") && link.cause === "cutting_speed") return true;
      if (scenario.type.includes("feed") && link.cause === "feed_rate") return true;
      if (scenario.type.includes("depth") && link.cause === "depth_of_cut") return true;
      if (scenario.type === "change_material" && link.cause === "material_hardness") return true;
      if (scenario.type === "change_tool" && link.cause === "tool_nose_radius") return true;
      if (scenario.type === "change_coolant" && link.cause === "coolant_type") return true;
      return false;
    });

    for (const link of relevantLinks.slice(0, 2)) {
      parts.push(`${link.cause} → ${link.effect}: ${link.mechanism}`);
    }

    // Add outcome summary
    if (Math.abs(comparison.tool_life_delta_percent) > 10) {
      const dir = comparison.tool_life_delta_percent > 0 ? "increases" : "decreases";
      parts.push(`Tool life ${dir} by ${Math.abs(comparison.tool_life_delta_percent).toFixed(0)}%`);
    }
    if (Math.abs(comparison.force_delta_percent) > 10) {
      const dir = comparison.force_delta_percent > 0 ? "increases" : "decreases";
      parts.push(`Cutting force ${dir} by ${Math.abs(comparison.force_delta_percent).toFixed(0)}%`);
    }

    return parts.join(". ") || "No significant causal effects identified.";
  }

  /**
   * Calculate confidence degradation for extrapolation.
   */
  private static calculateConfidence(
    baseConfidence: number,
    isExtrapolation: boolean,
    comparison: ScenarioResult["comparison"]
  ): number {
    let confidence = baseConfidence;

    // Extrapolation penalty
    if (isExtrapolation) {
      confidence *= 0.7;
    }

    // Large changes reduce confidence
    const maxDelta = Math.max(
      Math.abs(comparison.speed_delta_percent),
      Math.abs(comparison.feed_delta_percent),
      Math.abs(comparison.depth_delta_percent)
    );
    if (maxDelta > 30) {
      confidence *= 0.9;
    }
    if (maxDelta > 50) {
      confidence *= 0.85;
    }

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  /**
   * Perform sensitivity analysis.
   */
  private static performSensitivityAnalysis(
    baseInput: LatheSpeedFeedInput,
    baseResult: LatheSpeedFeedResult
  ): SensitivityEntry[] {
    const sensitivities: SensitivityEntry[] = [];
    const perturbation = 0.1; // 10% perturbation

    // Test speed sensitivity (via strategy change)
    const aggResult = LatheSpeedFeedCalculatorFacadeEngine.calculate({
      ...baseInput,
      strategy: "aggressive",
    });
    const speedElasticity =
      (aggResult.recommendation.cutting_speed_m_min - baseResult.recommendation.cutting_speed_m_min) /
      baseResult.recommendation.cutting_speed_m_min /
      0.2; // ~20% strategy effect

    sensitivities.push({
      parameter: "cutting_speed",
      elasticity: Math.abs(speedElasticity),
      impact_direction: "positive",
      rank: 0,
      explanation: "Speed increases affect tool life exponentially (Taylor equation)",
    });

    // Feed sensitivity
    const feedElasticity =
      (aggResult.recommendation.feed_mm_rev - baseResult.recommendation.feed_mm_rev) /
      baseResult.recommendation.feed_mm_rev /
      0.2;

    sensitivities.push({
      parameter: "feed_rate",
      elasticity: Math.abs(feedElasticity),
      impact_direction: "positive",
      rank: 0,
      explanation: "Feed affects surface finish quadratically and force sublinearly",
    });

    // Depth sensitivity
    const depthElasticity =
      (aggResult.recommendation.depth_of_cut_mm - baseResult.recommendation.depth_of_cut_mm) /
      baseResult.recommendation.depth_of_cut_mm /
      0.2;

    sensitivities.push({
      parameter: "depth_of_cut",
      elasticity: Math.abs(depthElasticity),
      impact_direction: "positive",
      rank: 0,
      explanation: "Depth affects force linearly (Kienzle model)",
    });

    // Material hardness (via different material)
    sensitivities.push({
      parameter: "material_hardness",
      elasticity: 0.8,
      impact_direction: "negative",
      rank: 0,
      explanation: "Harder materials require lower speeds and feeds",
    });

    // Tool nose radius
    sensitivities.push({
      parameter: "nose_radius",
      elasticity: 0.6,
      impact_direction: "positive",
      rank: 0,
      explanation: "Larger radius improves surface finish, allows higher feed",
    });

    // Sort by elasticity and assign ranks
    sensitivities.sort((a, b) => b.elasticity - a.elasticity);
    sensitivities.forEach((s, i) => (s.rank = i + 1));

    return sensitivities;
  }

  /**
   * Main entry point: analyze what-if scenarios.
   */
  static analyze(input: ReasoningInput): ReasoningResult {
    // Validate input
    const parsed = ReasoningInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        baseline: {
          success: false,
          recommendation: { cutting_speed_m_min: 0, rpm: 0, feed_mm_rev: 0, depth_of_cut_mm: 0 },
          material_properties: {} as any,
          band: { vc_min: 0, vc_max: 0, feed_min: 0, feed_max: 0, doc_min: 0, doc_max: 0 },
          confidence: 0,
          sources: [],
          reasoning: [],
          warnings: [`Input validation failed: ${parsed.error.message}`],
        },
        scenarios: [],
        overall_confidence: 0,
        summary: "Input validation failed",
        warnings: [`Input validation failed: ${parsed.error.message}`],
      };
    }

    const { base_input, scenarios, include_sensitivity, include_causal_chain } = parsed.data;
    const warnings: string[] = [];

    // Calculate baseline
    const baselineResult = LatheSpeedFeedCalculatorFacadeEngine.calculate(
      base_input as LatheSpeedFeedInput
    );
    if (!baselineResult.success) {
      return {
        success: false,
        baseline: baselineResult,
        scenarios: [],
        overall_confidence: 0,
        summary: "Baseline calculation failed",
        warnings: baselineResult.warnings,
      };
    }

    // Process each scenario
    const scenarioResults: ScenarioResult[] = [];

    for (const scenario of scenarios) {
      const { input: modifiedInput, description, isExtrapolation } = this.applyScenario(
        base_input as LatheSpeedFeedInput,
        scenario
      );

      const scenarioResult = LatheSpeedFeedCalculatorFacadeEngine.calculate(modifiedInput);

      const comparison = {
        speed_delta_percent: this.calcDelta(
          baselineResult.recommendation.cutting_speed_m_min,
          scenarioResult.recommendation.cutting_speed_m_min
        ),
        feed_delta_percent: this.calcDelta(
          baselineResult.recommendation.feed_mm_rev,
          scenarioResult.recommendation.feed_mm_rev
        ),
        depth_delta_percent: this.calcDelta(
          baselineResult.recommendation.depth_of_cut_mm,
          scenarioResult.recommendation.depth_of_cut_mm
        ),
        rpm_delta_percent: this.calcDelta(
          baselineResult.recommendation.rpm,
          scenarioResult.recommendation.rpm
        ),
        tool_life_delta_percent: this.calcDelta(
          baselineResult.predicted_tool_life_min ?? 60,
          scenarioResult.predicted_tool_life_min ?? 60
        ),
        force_delta_percent: this.calcDelta(
          baselineResult.predicted_force_N ?? 500,
          scenarioResult.predicted_force_N ?? 500
        ),
        power_delta_percent: this.calcDelta(
          baselineResult.predicted_power_kw ?? 2,
          scenarioResult.predicted_power_kw ?? 2
        ),
      };

      const confidence = this.calculateConfidence(
        scenarioResult.confidence,
        isExtrapolation,
        comparison
      );

      const causalExplanation = this.generateCausalExplanation(scenario, comparison);

      scenarioResults.push({
        scenario_type: scenario.type,
        description,
        modified_input: modifiedInput,
        result: scenarioResult,
        comparison,
        confidence,
        is_extrapolation: isExtrapolation,
        causal_explanation: causalExplanation,
      });

      if (isExtrapolation) {
        warnings.push(`Scenario "${scenario.type}" involves extrapolation — confidence reduced`);
      }
    }

    // Sensitivity analysis
    let sensitivity: SensitivityEntry[] | undefined;
    if (include_sensitivity) {
      sensitivity = this.performSensitivityAnalysis(
        base_input as LatheSpeedFeedInput,
        baselineResult
      );
    }

    // Causal chain
    let causalChain: CausalLink[] | undefined;
    if (include_causal_chain) {
      causalChain = this.CAUSAL_MODEL;
    }

    // Calculate overall confidence
    const overallConfidence =
      scenarioResults.length > 0
        ? scenarioResults.reduce((sum, s) => sum + s.confidence, 0) / scenarioResults.length
        : baselineResult.confidence;

    // Generate summary
    const summary = this.generateSummary(baselineResult, scenarioResults);

    return {
      success: true,
      baseline: baselineResult,
      scenarios: scenarioResults,
      sensitivity,
      causal_chain: causalChain,
      overall_confidence: Math.round(overallConfidence * 100) / 100,
      summary,
      warnings,
    };
  }

  /**
   * Generate reasoning summary.
   */
  private static generateSummary(
    baseline: LatheSpeedFeedResult,
    scenarios: ScenarioResult[]
  ): string {
    const parts: string[] = [];

    parts.push(
      `Baseline: Vc=${baseline.recommendation.cutting_speed_m_min}m/min, ` +
      `f=${baseline.recommendation.feed_mm_rev}mm/rev, ` +
      `ap=${baseline.recommendation.depth_of_cut_mm}mm`
    );

    if (scenarios.length > 0) {
      const bestScenario = scenarios.reduce((best, s) =>
        s.result.confidence > best.result.confidence ? s : best
      );
      parts.push(`Best scenario: ${bestScenario.description} (conf=${bestScenario.confidence.toFixed(2)})`);

      const extrapolations = scenarios.filter((s) => s.is_extrapolation);
      if (extrapolations.length > 0) {
        parts.push(`${extrapolations.length} scenario(s) involve extrapolation with reduced confidence`);
      }
    }

    return parts.join(". ");
  }

  /**
   * Convenience method: standard what-if scenarios.
   */
  static standardWhatIf(baseInput: LatheSpeedFeedInput): ReasoningResult {
    return this.analyze({
      base_input: baseInput,
      scenarios: [
        { type: "change_strategy", params: { strategy: "conservative" } },
        { type: "change_strategy", params: { strategy: "aggressive" } },
        { type: "change_operation", params: { type: "finishing" } },
        { type: "change_coolant", params: { coolant: "dry" } },
        { type: "change_coolant", params: { coolant: "high_pressure" } },
        { type: "change_material", params: { material: "aluminum_6061" } },
      ],
      include_sensitivity: true,
      include_causal_chain: true,
    });
  }

  /**
   * Get version info.
   */
  static getVersion(): string {
    return this.VERSION;
  }
}

export const latheSpeedFeedReasoningBridgeEngine = LatheSpeedFeedReasoningBridgeEngine;
