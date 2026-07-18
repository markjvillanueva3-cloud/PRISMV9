/**
 * WEDMProgramSafetyGateEngine — Composite S(x) Safety Gate
 *
 * Aggregates safety scores from 7 component gates into a single weighted S(x)
 * score that determines whether a WEDM program can emit. This is the final
 * gate before G-code reaches the controller.
 *
 * S(x) = Σ (weight_i × pass_i) where pass_i ∈ {0, 1}
 *
 * Component weights (sum = 1.0):
 *   collision      0.20  — WEDMWirePathCollisionEngine
 *   head_clearance 0.15  — WEDMHeadClearanceEngine
 *   flush          0.15  — WEDMFlushAdequacyGateEngine
 *   thermal        0.15  — WEDMThermalReleaseGateEngine
 *   dialect        0.10  — WEDMControllerDialectVerifierEngine
 *   unit_tag       0.10  — WEDMUnitTagGateEngine
 *   deflection     0.15  — WEDMWireDeflectionEngine
 *
 * Thresholds:
 *   S(x) ≥ 0.90  → PASS (green)
 *   0.70 ≤ S(x) < 0.90 → WARNING (yellow, operator review)
 *   S(x) < 0.70  → HARD BLOCK (red, cannot emit)
 *
 * Mandatory components: collision and unit_tag must ALWAYS pass regardless
 * of S(x) score — a collision or unit confusion is never acceptable.
 *
 * MS-P2.5-SAFETY/U-P2.5-SAFE-01
 *
 * @see WEDMPrintToProgramEngine — calls this gate before final emit
 * @see wedm-program-safety-gate hook — enforces S(x) ≥ 0.70 on commits
 */

import { WEDM_SAFETY_GATE } from "../physics/wedm-constants.js";

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type SafetyComponent =
  | "collision"
  | "head_clearance"
  | "flush"
  | "thermal"
  | "dialect"
  | "unit_tag"
  | "deflection";

export type SafetyVerdict = "pass" | "warning" | "hard_block";

export interface ComponentResult {
  pass: boolean;
  score_contribution: number;
  details?: Record<string, unknown>;
  warnings?: string[];
}

/**
 * Input shape from each component gate.
 * Each field is optional — partial evaluation is supported when not all
 * components have run (e.g., collision check requires full path, but unit_tag
 * can run on program header alone).
 */
export interface SafetyGateInput {
  collision?: {
    pass: boolean;
    collision_count?: number;
    min_distance_mm?: number;
    safe_distance_mm?: number;
    colliding_obstacles?: string[];
  };
  head_clearance?: {
    pass: boolean;
    min_clearance_mm?: number;
    required_clearance_mm?: number;
    upper_clearance_mm?: number;
    lower_clearance_mm?: number;
    min_required_mm?: number;
  };
  /** Flush adequacy gate input */
  flush?: {
    pass: boolean;
    velocity_m_s: number;
    required_velocity_m_s: number;
    mode: "submerged" | "side_flush";
  };
  /** Alias for flush */
  flushing?: {
    pass: boolean;
    velocity_m_s: number;
    required_velocity_m_s: number;
    mode: "submerged" | "side_flush";
  };
  thermal?: {
    pass: boolean;
    max_temp_C: number;
    limit_temp_C: number;
    recast_depth_um?: number;
  };
  dialect?: {
    pass: boolean;
    expected_controller: string;
    detected_controller?: string;
    confidence?: number;
  };
  unit_tag?: {
    pass: boolean;
    declared_unit: "metric" | "imperial";
    code_unit: "G20" | "G21" | "missing";
    coordinate_scale_consistent: boolean;
  };
  deflection?: {
    pass: boolean;
    max_deflection_um?: number;
    max_deflection_mm?: number;
    limit_um?: number;
    tolerance_mm?: number;
    deflection_ratio?: number;
  };
}

export interface ComponentScoreEntry {
  component: SafetyComponent;
  pass: boolean;
  weight: number;
  weighted_score: number;
}

export interface SafetyGateResult {
  success: boolean;
  /** Whether the program passes (S(x) ≥ threshold and no mandatory failures) */
  pass: boolean;
  verdict: SafetyVerdict;
  /** S(x) composite score */
  s_of_x: number;
  /** @deprecated Use s_of_x instead */
  sx_score: number;
  /** S(x) threshold the program was evaluated against (mirrors audit.threshold_used). */
  threshold?: number;
  hard_block: boolean;
  can_emit: boolean;
  components_evaluated: SafetyComponent[];
  components_missing: SafetyComponent[];
  /** Array of component scores for iteration */
  components: ComponentScoreEntry[];
  component_results: Record<SafetyComponent, ComponentResult>;
  mandatory_failures: SafetyComponent[];
  /** Failure reason strings for display */
  failure_reasons: string[];
  summary: string;
  warnings: string[];
  recommendations: string[];
  /** For downstream logging/audit */
  audit: {
    timestamp: string;
    weights_used: Record<SafetyComponent, number>;
    threshold_used: number;
    partial_evaluation: boolean;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const WEIGHTS = WEDM_SAFETY_GATE.weights;
const THRESHOLDS = WEDM_SAFETY_GATE.thresholds;
const MANDATORY = WEDM_SAFETY_GATE.mandatory_pass;
const MIN_COMPONENTS = WEDM_SAFETY_GATE.min_components;

const ALL_COMPONENTS: SafetyComponent[] = [
  "collision",
  "head_clearance",
  "flush",
  "thermal",
  "dialect",
  "unit_tag",
  "deflection",
];

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class WEDMProgramSafetyGateEngine {
  /**
   * Evaluate composite S(x) score from component gate inputs.
   *
   * @param input - Safety gate inputs from component engines
   * @returns SafetyGateResult with verdict, score, and actionable details
   */
  evaluate(input: SafetyGateInput): SafetyGateResult {
    const timestamp = new Date().toISOString();
    const componentResults: Record<SafetyComponent, ComponentResult> = {} as Record<SafetyComponent, ComponentResult>;
    const componentsEvaluated: SafetyComponent[] = [];
    const componentsMissing: SafetyComponent[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const mandatoryFailures: SafetyComponent[] = [];

    let sxScore = 0;

    const normalizedInput = { ...input };
    if (normalizedInput.flushing && !normalizedInput.flush) {
      normalizedInput.flush = normalizedInput.flushing;
    }

    for (const component of ALL_COMPONENTS) {
      const componentInput = normalizedInput[component];
      const weight = WEIGHTS[component];

      if (componentInput === undefined) {
        componentsMissing.push(component);
        componentResults[component] = {
          pass: false,
          score_contribution: 0,
          details: { reason: "not_evaluated" },
        };
        continue;
      }

      componentsEvaluated.push(component);
      const pass = componentInput.pass;
      const contribution = pass ? weight : 0;
      sxScore += contribution;

      componentResults[component] = {
        pass,
        score_contribution: contribution,
        details: componentInput as Record<string, unknown>,
      };

      if (!pass) {
        if ((MANDATORY as readonly string[]).includes(component)) {
          mandatoryFailures.push(component);
        }
        warnings.push(this.formatComponentWarning(component, componentInput));
        recommendations.push(this.formatComponentRecommendation(component, componentInput));
      }
    }

    const partialEvaluation = componentsMissing.length > 0;
    if (partialEvaluation && componentsEvaluated.length < MIN_COMPONENTS) {
      warnings.push(
        `Partial evaluation: only ${componentsEvaluated.length}/${ALL_COMPONENTS.length} components evaluated. ` +
        `Minimum ${MIN_COMPONENTS} required for reliable S(x).`
      );
    }

    let verdict: SafetyVerdict;
    let hardBlock = false;

    if (mandatoryFailures.length > 0) {
      verdict = "hard_block";
      hardBlock = true;
    } else if (sxScore < THRESHOLDS.hard_block) {
      verdict = "hard_block";
      hardBlock = true;
    } else if (sxScore < THRESHOLDS.pass) {
      verdict = "warning";
    } else {
      verdict = "pass";
    }

    const canEmit = !hardBlock;
    const pass = canEmit && verdict !== "hard_block";

    const summary = this.formatSummary(verdict, sxScore, componentsEvaluated.length, mandatoryFailures);

    const components: ComponentScoreEntry[] = ALL_COMPONENTS.map((comp) => ({
      component: comp,
      pass: componentResults[comp]?.pass ?? false,
      weight: WEIGHTS[comp],
      weighted_score: componentResults[comp]?.score_contribution ?? 0,
    }));

    const failureReasons = warnings.filter((w) =>
      ALL_COMPONENTS.some((c) => w.toUpperCase().startsWith(c.toUpperCase().replace("_", " ")))
    );

    const roundedScore = Math.round(sxScore * 1000) / 1000;

    // Attach raw_score to each component entry for backward-compat API
    const componentsWithRaw = components.map((c: any) => ({
      ...c,
      raw_score: c.raw_score ?? c.score ?? (c.pass ? 1 : 0),
    }));

    return {
      success: true,
      pass,
      verdict,
      s_of_x: roundedScore,
      sx_score: roundedScore,
      threshold: THRESHOLDS.hard_block,
      hard_block: hardBlock,
      can_emit: canEmit,
      components_evaluated: componentsEvaluated,
      components_missing: componentsMissing,
      components: componentsWithRaw,
      component_results: componentResults,
      mandatory_failures: mandatoryFailures,
      failure_reasons: failureReasons,
      summary,
      warnings,
      recommendations,
      audit: {
        timestamp,
        weights_used: { ...WEIGHTS } as Record<SafetyComponent, number>,
        threshold_used: THRESHOLDS.hard_block,
        partial_evaluation: partialEvaluation,
      },
    };
  }

  /**
   * Quick check — returns true if program can emit, false if hard blocked.
   * Use evaluate() for full details.
   */
  canEmit(input: SafetyGateInput): boolean {
    return this.evaluate(input).can_emit;
  }

  /**
   * Get S(x) score without full result object.
   */
  getScore(input: SafetyGateInput): number {
    return this.evaluate(input).sx_score;
  }

  /**
   * Get the weight for a specific component.
   */
  getWeight(component: SafetyComponent): number {
    return WEIGHTS[component];
  }

  /**
   * Get all weights.
   */
  getWeights(): Record<SafetyComponent, number> {
    return { ...WEIGHTS } as Record<SafetyComponent, number>;
  }

  /**
   * Get threshold values.
   */
  getThresholds(): { pass: number; warn: number; hard_block: number } {
    return { ...THRESHOLDS };
  }

  private formatComponentWarning(
    component: SafetyComponent,
    input: NonNullable<SafetyGateInput[SafetyComponent]>
  ): string {
    switch (component) {
      case "collision":
        const coll = input as SafetyGateInput["collision"];
        return `COLLISION: ${coll?.collision_count ?? 0} collision(s) detected`;
      case "head_clearance":
        const hc = input as SafetyGateInput["head_clearance"];
        return `HEAD CLEARANCE: ${hc?.min_clearance_mm?.toFixed(2) ?? "?"} mm < required ${hc?.required_clearance_mm?.toFixed(2) ?? "?"} mm`;
      case "flush":
        const fl = input as SafetyGateInput["flush"];
        return `FLUSH: velocity ${fl?.velocity_m_s?.toFixed(2) ?? "?"} m/s < required ${fl?.required_velocity_m_s?.toFixed(2) ?? "?"} m/s`;
      case "thermal":
        const th = input as SafetyGateInput["thermal"];
        return `THERMAL: max temp ${th?.max_temp_C?.toFixed(0) ?? "?"}°C exceeds limit ${th?.limit_temp_C?.toFixed(0) ?? "?"}°C`;
      case "dialect":
        const di = input as SafetyGateInput["dialect"];
        return `DIALECT: expected ${di?.expected_controller ?? "?"} but detected ${di?.detected_controller ?? "?"}`;
      case "unit_tag":
        const ut = input as SafetyGateInput["unit_tag"];
        return `UNIT TAG: declared ${ut?.declared_unit ?? "?"} but code has ${ut?.code_unit ?? "?"}`;
      case "deflection":
        const df = input as SafetyGateInput["deflection"];
        return `DEFLECTION: ${df?.max_deflection_um?.toFixed(1) ?? "?"} μm exceeds limit ${df?.limit_um?.toFixed(1) ?? "?"} μm`;
      default:
        return `${String(component).toUpperCase()}: check failed`;
    }
  }

  private formatComponentRecommendation(
    component: SafetyComponent,
    _input: NonNullable<SafetyGateInput[SafetyComponent]>
  ): string {
    switch (component) {
      case "collision":
        return "Review wire path for fixture/head interference. Adjust start point or fixture layout.";
      case "head_clearance":
        return "Increase Z-clearance or reduce taper angle. Check upper guide position.";
      case "flush":
        return "Increase flush pressure or switch to submerged mode for thick sections.";
      case "thermal":
        return "Reduce power settings, increase off-time, or add thermal relief features.";
      case "dialect":
        return "Verify correct post-processor selected for target machine controller.";
      case "unit_tag":
        return "Add explicit G20/G21 header. Verify all coordinates match declared unit system.";
      case "deflection":
        return "Increase wire tension, use thicker wire, or reduce thickness span.";
      default:
        return `Review ${component} parameters.`;
    }
  }

  private formatSummary(
    verdict: SafetyVerdict,
    score: number,
    evaluated: number,
    mandatoryFailures: SafetyComponent[]
  ): string {
    const pct = (score * 100).toFixed(1);
    const verdictLabel = verdict === "pass" ? "✓ PASS" : verdict === "warning" ? "⚠ WARNING" : "✗ HARD BLOCK";

    if (mandatoryFailures.length > 0) {
      return `${verdictLabel} — S(x)=${pct}% [${evaluated}/7 components] — mandatory failure: ${mandatoryFailures.join(", ")}`;
    }
    return `${verdictLabel} — S(x)=${pct}% [${evaluated}/7 components]`;
  }

  /**
   * Gate decision wrapper: evaluate → allow/deny with reason.
   * @param input Safety gate component inputs
   * @returns { allow, reason, result, threshold }
   */
  gate(input: SafetyGateInput): {
    allow: boolean;
    reason: string;
    threshold: number;
    result: SafetyGateResult;
  } {
    const result = this.evaluate(input);
    const threshold = THRESHOLDS.hard_block;
    const allow = result.verdict !== "hard_block" && result.pass;
    const reason = allow
      ? `Allowed: S(x)=${(result.s_of_x * 100).toFixed(1)}% ≥ threshold ${(threshold * 100).toFixed(0)}%`
      : `Denied: S(x)=${(result.s_of_x * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(0)}% — ${result.summary}`;
    return { allow, reason, threshold, result };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ══════════════════════════════════════════════════════════════════════════════

export const wedmProgramSafetyGateEngine = new WEDMProgramSafetyGateEngine();
export default wedmProgramSafetyGateEngine;
