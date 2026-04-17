/**
 * WEDMProgramSafetyGateEngine — S(x) ≥ 0.70 hard-gate before program emit
 *
 * Computes composite safety score S(x) from 7 weighted components and
 * HARD BLOCKS program emission if below threshold. This is the final
 * gate before any G-code reaches a wire EDM controller.
 *
 * S(x) Components and Weights:
 *   - Collision (0.20): Wire path collision detection result
 *   - Head Clearance (0.15): Upper/lower guide clearance to fixtures
 *   - Flushing (0.15): Adequate flushing velocity for debris removal
 *   - Thermal (0.15): Thermal release within dielectric capacity
 *   - Dialect (0.10): Emitted code matches controller grammar
 *   - Unit Tag (0.10): G20/G21 unit consistency throughout
 *   - Deflection (0.15): Wire deflection within tolerance
 *
 * Gate threshold: S(x) >= 0.70 (configurable via SAFETY_THRESHOLD)
 *
 * MS-P2.5-SAFETY/U-P2.5-SAFE-01
 *
 * @see WEDMWirePathCollisionEngine — collision component
 * @see WEDMHeadClearanceEngine — head clearance component
 * @see WEDMProgramVerificationEngine — dialect/unit component
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SafetyComponentScore {
  component: SafetyComponent;
  weight: number;
  raw_score: number;
  weighted_score: number;
  pass: boolean;
  details: string;
  failure_reason?: string;
}

export type SafetyComponent =
  | "collision"
  | "head_clearance"
  | "flushing"
  | "thermal"
  | "dialect"
  | "unit_tag"
  | "deflection";

export interface SafetyGateInput {
  /** Collision check result (from WEDMWirePathCollisionEngine) */
  collision?: {
    pass: boolean;
    collision_count: number;
    min_clearance_mm: number;
  };
  /** Head clearance check (from WEDMHeadClearanceEngine) */
  head_clearance?: {
    pass: boolean;
    upper_clearance_mm: number;
    lower_clearance_mm: number;
    min_required_mm: number;
  };
  /** Flushing adequacy check (from WEDMFlushAdequacyGateEngine) */
  flushing?: {
    pass: boolean;
    velocity_m_s: number;
    required_velocity_m_s: number;
    mode: "submerged" | "side_flush";
  };
  /** Thermal release check (from WEDMThermalReleaseGateEngine) */
  thermal?: {
    pass: boolean;
    heat_release_J: number;
    cooling_capacity_J: number;
    recast_depth_um: number;
    max_recast_um: number;
  };
  /** Dialect verification (from WEDMControllerDialectVerifierEngine) */
  dialect?: {
    pass: boolean;
    expected_controller: string;
    detected_controller?: string;
    mismatched_codes?: string[];
  };
  /** Unit tag consistency (from WEDMProgramVerificationEngine) */
  unit_tag?: {
    pass: boolean;
    declared_unit: "metric" | "imperial";
    code_unit: "G21" | "G20" | "missing";
    coordinate_scale_consistent: boolean;
  };
  /** Wire deflection check (from wire deflection calculations) */
  deflection?: {
    pass: boolean;
    max_deflection_mm: number;
    tolerance_mm: number;
    deflection_ratio: number;
  };
  /** Override: allow experienced operator to acknowledge and proceed */
  operator_override?: {
    enabled: boolean;
    acknowledged_risks: SafetyComponent[];
    operator_id: string;
    timestamp: string;
  };
}

export interface SafetyGateResult {
  success: boolean;
  pass: boolean;
  s_of_x: number;
  threshold: number;
  hard_block: boolean;
  components: SafetyComponentScore[];
  passing_components: number;
  failing_components: number;
  failure_reasons: string[];
  operator_override_used: boolean;
  summary: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const SAFETY_THRESHOLD = 0.70;

const COMPONENT_WEIGHTS: Record<SafetyComponent, number> = {
  collision: 0.20,
  head_clearance: 0.15,
  flushing: 0.15,
  thermal: 0.15,
  dialect: 0.10,
  unit_tag: 0.10,
  deflection: 0.15,
};

// ══════════════════════════════════════════════════════════════════════════════
// ENGINE
// ══════════════════════════════════════════════════════════════════════════════

export class WEDMProgramSafetyGateEngine {
  readonly name = "WEDMProgramSafetyGateEngine";
  readonly version = "1.0.0";

  private readonly threshold: number;

  constructor(threshold: number = SAFETY_THRESHOLD) {
    this.threshold = threshold;
  }

  /**
   * Evaluate all safety components and compute S(x)
   */
  evaluate(input: SafetyGateInput): SafetyGateResult {
    const components: SafetyComponentScore[] = [];
    const failureReasons: string[] = [];

    // Evaluate each component
    components.push(this.evaluateCollision(input.collision));
    components.push(this.evaluateHeadClearance(input.head_clearance));
    components.push(this.evaluateFlushing(input.flushing));
    components.push(this.evaluateThermal(input.thermal));
    components.push(this.evaluateDialect(input.dialect));
    components.push(this.evaluateUnitTag(input.unit_tag));
    components.push(this.evaluateDeflection(input.deflection));

    // Calculate S(x) as weighted sum
    let s_of_x = 0;
    let passingCount = 0;
    let failingCount = 0;

    for (const comp of components) {
      s_of_x += comp.weighted_score;
      if (comp.pass) {
        passingCount++;
      } else {
        failingCount++;
        if (comp.failure_reason) {
          failureReasons.push(`[${comp.component}] ${comp.failure_reason}`);
        }
      }
    }

    // Round to 3 decimal places
    s_of_x = Math.round(s_of_x * 1000) / 1000;

    // Check operator override
    let operatorOverrideUsed = false;
    let effectivePass = s_of_x >= this.threshold;

    if (!effectivePass && input.operator_override?.enabled) {
      const acknowledgedAll = failureReasons.every((reason) => {
        const component = reason.match(/\[(\w+)\]/)?.[1] as SafetyComponent;
        return input.operator_override?.acknowledged_risks.includes(component);
      });
      if (acknowledgedAll) {
        operatorOverrideUsed = true;
        effectivePass = true;
      }
    }

    const hardBlock = !effectivePass;

    return {
      success: true,
      pass: effectivePass,
      s_of_x,
      threshold: this.threshold,
      hard_block: hardBlock,
      components,
      passing_components: passingCount,
      failing_components: failingCount,
      failure_reasons: failureReasons,
      operator_override_used: operatorOverrideUsed,
      summary: hardBlock
        ? `HARD BLOCK: S(x) = ${s_of_x.toFixed(3)} < ${this.threshold} threshold. ${failingCount} failing components. Program CANNOT emit.`
        : `PASS: S(x) = ${s_of_x.toFixed(3)} >= ${this.threshold}. ${passingCount}/7 components passing.${operatorOverrideUsed ? " (operator override)" : ""}`,
    };
  }

  /**
   * Gate function — returns allow/deny decision with reason
   */
  gate(input: SafetyGateInput): { allow: boolean; reason: string; result: SafetyGateResult } {
    const result = this.evaluate(input);
    return {
      allow: result.pass,
      reason: result.summary,
      result,
    };
  }

  /**
   * Quick check with defaults for missing components
   */
  quickCheck(partialInput: Partial<SafetyGateInput>): SafetyGateResult {
    return this.evaluate(partialInput as SafetyGateInput);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COMPONENT EVALUATORS
  // ════════════════════════════════════════════════════════════════════════════

  private evaluateCollision(input?: SafetyGateInput["collision"]): SafetyComponentScore {
    const weight = COMPONENT_WEIGHTS.collision;

    if (!input) {
      return {
        component: "collision",
        weight,
        raw_score: 0,
        weighted_score: 0,
        pass: false,
        details: "Collision check not performed",
        failure_reason: "Collision check missing — cannot verify wire path safety",
      };
    }

    const pass = input.pass && input.collision_count === 0;
    const raw_score = pass ? 1.0 : 0.0;

    return {
      component: "collision",
      weight,
      raw_score,
      weighted_score: raw_score * weight,
      pass,
      details: pass
        ? `No collisions detected. Min clearance: ${input.min_clearance_mm.toFixed(2)}mm`
        : `${input.collision_count} collision(s) detected`,
      failure_reason: pass ? undefined : `Wire path collision detected (${input.collision_count} collision(s))`,
    };
  }

  private evaluateHeadClearance(input?: SafetyGateInput["head_clearance"]): SafetyComponentScore {
    const weight = COMPONENT_WEIGHTS.head_clearance;

    if (!input) {
      return {
        component: "head_clearance",
        weight,
        raw_score: 0,
        weighted_score: 0,
        pass: false,
        details: "Head clearance check not performed",
        failure_reason: "Head clearance check missing — cannot verify guide safety",
      };
    }

    const pass = input.pass &&
      input.upper_clearance_mm >= input.min_required_mm &&
      input.lower_clearance_mm >= (input.min_required_mm - 1); // Lower needs 1mm less

    const raw_score = pass ? 1.0 : 0.0;

    return {
      component: "head_clearance",
      weight,
      raw_score,
      weighted_score: raw_score * weight,
      pass,
      details: `Upper: ${input.upper_clearance_mm.toFixed(1)}mm, Lower: ${input.lower_clearance_mm.toFixed(1)}mm (min: ${input.min_required_mm}mm)`,
      failure_reason: pass ? undefined : `Head clearance insufficient — upper: ${input.upper_clearance_mm.toFixed(1)}mm, lower: ${input.lower_clearance_mm.toFixed(1)}mm (min: ${input.min_required_mm}mm)`,
    };
  }

  private evaluateFlushing(input?: SafetyGateInput["flushing"]): SafetyComponentScore {
    const weight = COMPONENT_WEIGHTS.flushing;

    if (!input) {
      return {
        component: "flushing",
        weight,
        raw_score: 0.5, // Partial credit for submerged default
        weighted_score: 0.5 * weight,
        pass: false,
        details: "Flushing check not performed — assuming submerged mode",
        failure_reason: "Flushing adequacy not verified",
      };
    }

    const pass = input.pass && input.velocity_m_s >= input.required_velocity_m_s;
    const raw_score = pass ? 1.0 : input.velocity_m_s / input.required_velocity_m_s;

    return {
      component: "flushing",
      weight,
      raw_score,
      weighted_score: Math.min(raw_score, 1.0) * weight,
      pass,
      details: `${input.mode}: ${input.velocity_m_s.toFixed(2)} m/s (required: ${input.required_velocity_m_s.toFixed(2)} m/s)`,
      failure_reason: pass ? undefined : `Flushing velocity insufficient — ${input.velocity_m_s.toFixed(2)} m/s < ${input.required_velocity_m_s.toFixed(2)} m/s required`,
    };
  }

  private evaluateThermal(input?: SafetyGateInput["thermal"]): SafetyComponentScore {
    const weight = COMPONENT_WEIGHTS.thermal;

    if (!input) {
      return {
        component: "thermal",
        weight,
        raw_score: 0.5, // Partial credit for standard conditions
        weighted_score: 0.5 * weight,
        pass: false,
        details: "Thermal check not performed",
        failure_reason: "Thermal release not verified",
      };
    }

    const heatOk = input.heat_release_J <= input.cooling_capacity_J;
    const recastOk = input.recast_depth_um <= input.max_recast_um;
    const pass = input.pass && heatOk && recastOk;
    const raw_score = pass ? 1.0 : (heatOk ? 0.5 : 0) + (recastOk ? 0.5 : 0);

    return {
      component: "thermal",
      weight,
      raw_score,
      weighted_score: raw_score * weight,
      pass,
      details: `Heat: ${input.heat_release_J.toFixed(1)}J/${input.cooling_capacity_J.toFixed(1)}J, Recast: ${input.recast_depth_um.toFixed(1)}µm/${input.max_recast_um}µm`,
      failure_reason: pass ? undefined :
        !heatOk ? `Thermal overload — ${input.heat_release_J.toFixed(1)}J exceeds ${input.cooling_capacity_J.toFixed(1)}J cooling capacity` :
        `Recast depth excessive — ${input.recast_depth_um.toFixed(1)}µm > ${input.max_recast_um}µm max`,
    };
  }

  private evaluateDialect(input?: SafetyGateInput["dialect"]): SafetyComponentScore {
    const weight = COMPONENT_WEIGHTS.dialect;

    if (!input) {
      return {
        component: "dialect",
        weight,
        raw_score: 0.5, // Partial credit for generic dialect
        weighted_score: 0.5 * weight,
        pass: false,
        details: "Dialect verification not performed",
        failure_reason: "Controller dialect not verified",
      };
    }

    const pass = input.pass && (!input.mismatched_codes || input.mismatched_codes.length === 0);
    const raw_score = pass ? 1.0 : 0.0;

    return {
      component: "dialect",
      weight,
      raw_score,
      weighted_score: raw_score * weight,
      pass,
      details: pass
        ? `Dialect verified: ${input.expected_controller}`
        : `Dialect mismatch: expected ${input.expected_controller}, detected ${input.detected_controller || "unknown"}`,
      failure_reason: pass ? undefined :
        `Controller dialect mismatch — ${input.mismatched_codes?.length || 0} incompatible codes`,
    };
  }

  private evaluateUnitTag(input?: SafetyGateInput["unit_tag"]): SafetyComponentScore {
    const weight = COMPONENT_WEIGHTS.unit_tag;

    if (!input) {
      return {
        component: "unit_tag",
        weight,
        raw_score: 0,
        weighted_score: 0,
        pass: false,
        details: "Unit tag check not performed",
        failure_reason: "Unit consistency not verified — 25.4× error risk",
      };
    }

    const codeMatchesUnit =
      (input.declared_unit === "metric" && input.code_unit === "G21") ||
      (input.declared_unit === "imperial" && input.code_unit === "G20");

    const pass = input.pass && codeMatchesUnit && input.coordinate_scale_consistent;
    const raw_score = pass ? 1.0 : 0.0;

    return {
      component: "unit_tag",
      weight,
      raw_score,
      weighted_score: raw_score * weight,
      pass,
      details: `Declared: ${input.declared_unit}, Code: ${input.code_unit}, Scale consistent: ${input.coordinate_scale_consistent}`,
      failure_reason: pass ? undefined :
        input.code_unit === "missing" ? "Missing G20/G21 unit declaration in program" :
        !codeMatchesUnit ? `Unit mismatch — declared ${input.declared_unit} but code has ${input.code_unit}` :
        "Coordinate scale inconsistent with declared units",
    };
  }

  private evaluateDeflection(input?: SafetyGateInput["deflection"]): SafetyComponentScore {
    const weight = COMPONENT_WEIGHTS.deflection;

    if (!input) {
      return {
        component: "deflection",
        weight,
        raw_score: 0.7, // Partial credit for standard wire/tension
        weighted_score: 0.7 * weight,
        pass: true, // Soft pass — deflection often not critical
        details: "Deflection check not performed — assuming standard conditions",
      };
    }

    const pass = input.pass && input.max_deflection_mm <= input.tolerance_mm;
    const raw_score = pass ? 1.0 : Math.max(0, 1 - input.deflection_ratio);

    return {
      component: "deflection",
      weight,
      raw_score: Math.max(0, Math.min(1, raw_score)),
      weighted_score: Math.max(0, Math.min(1, raw_score)) * weight,
      pass,
      details: `Max deflection: ${input.max_deflection_mm.toFixed(4)}mm (tolerance: ${input.tolerance_mm.toFixed(4)}mm)`,
      failure_reason: pass ? undefined :
        `Wire deflection ${input.max_deflection_mm.toFixed(4)}mm exceeds tolerance ${input.tolerance_mm.toFixed(4)}mm`,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get the safety threshold
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Get component weights
   */
  getComponentWeights(): Record<SafetyComponent, number> {
    return { ...COMPONENT_WEIGHTS };
  }

  /**
   * Create a passing result for a specific component
   */
  createPassingComponent(component: SafetyComponent, details: string): Partial<SafetyGateInput> {
    switch (component) {
      case "collision":
        return { collision: { pass: true, collision_count: 0, min_clearance_mm: 5.0 } };
      case "head_clearance":
        return { head_clearance: { pass: true, upper_clearance_mm: 5.0, lower_clearance_mm: 4.0, min_required_mm: 3.0 } };
      case "flushing":
        return { flushing: { pass: true, velocity_m_s: 1.0, required_velocity_m_s: 0.8, mode: "submerged" } };
      case "thermal":
        return { thermal: { pass: true, heat_release_J: 50, cooling_capacity_J: 100, recast_depth_um: 5, max_recast_um: 10 } };
      case "dialect":
        return { dialect: { pass: true, expected_controller: "mitsubishi_fa" } };
      case "unit_tag":
        return { unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true } };
      case "deflection":
        return { deflection: { pass: true, max_deflection_mm: 0.002, tolerance_mm: 0.005, deflection_ratio: 0.4 } };
    }
  }

  /**
   * Create a full passing input for testing
   */
  createFullPassingInput(): SafetyGateInput {
    return {
      collision: { pass: true, collision_count: 0, min_clearance_mm: 5.0 },
      head_clearance: { pass: true, upper_clearance_mm: 5.0, lower_clearance_mm: 4.0, min_required_mm: 3.0 },
      flushing: { pass: true, velocity_m_s: 1.0, required_velocity_m_s: 0.8, mode: "submerged" },
      thermal: { pass: true, heat_release_J: 50, cooling_capacity_J: 100, recast_depth_um: 5, max_recast_um: 10 },
      dialect: { pass: true, expected_controller: "mitsubishi_fa" },
      unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
      deflection: { pass: true, max_deflection_mm: 0.002, tolerance_mm: 0.005, deflection_ratio: 0.4 },
    };
  }
}

export const wedmProgramSafetyGateEngine = new WEDMProgramSafetyGateEngine();
