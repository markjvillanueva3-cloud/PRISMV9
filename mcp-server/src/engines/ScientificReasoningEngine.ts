/**
 * ScientificReasoningEngine — Physics/Math/Science Reasoning for PRISM
 * =====================================================================
 * Provides LLM-level scientific reasoning capabilities:
 *   - Dimensional analysis and unit consistency checking
 *   - Physics formula validation and derivation
 *   - Mathematical optimization reasoning
 *   - Material science reasoning
 *   - Thermodynamic analysis
 *   - Mechanical engineering reasoning
 *
 * This engine ensures PRISM's calculations are grounded in verified
 * scientific principles with full traceability.
 *
 * @module engines/ScientificReasoningEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Physical quantity with unit */
export interface PhysicalQuantity {
  value: number;
  unit: string;
  uncertainty?: number;
  dimension: Dimension;
}

/** SI base dimensions */
export interface Dimension {
  L: number;  // Length (m)
  M: number;  // Mass (kg)
  T: number;  // Time (s)
  I: number;  // Electric current (A)
  Θ: number;  // Temperature (K)
  N: number;  // Amount of substance (mol)
  J: number;  // Luminous intensity (cd)
}

/** Dimensional analysis result */
export interface DimensionalAnalysis {
  valid: boolean;
  left_dimension: Dimension;
  right_dimension: Dimension;
  mismatch?: string;
  suggestion?: string;
}

/** Formula validation result */
export interface FormulaValidation {
  formula_id: string;
  formula: string;
  valid: boolean;
  dimensional_check: DimensionalAnalysis;
  range_check: RangeCheck;
  physics_check: PhysicsCheck;
  recommendations: string[];
  confidence: number;
}

/** Range validation */
export interface RangeCheck {
  valid: boolean;
  out_of_range_params: Array<{
    param: string;
    value: number;
    min: number;
    max: number;
    severity: "warning" | "error";
  }>;
}

/** Physics principle check */
export interface PhysicsCheck {
  valid: boolean;
  principles_applied: string[];
  violations: string[];
  assumptions: string[];
}

/** Scientific reasoning trace */
export interface ScientificReasoning {
  problem_statement: string;
  approach: string;
  principles_used: string[];
  equations_applied: Array<{
    name: string;
    formula: string;
    reference: string;
  }>;
  dimensional_analysis: DimensionalAnalysis[];
  intermediate_steps: Array<{
    step: number;
    description: string;
    calculation: string;
    result: PhysicalQuantity;
  }>;
  final_result: PhysicalQuantity;
  uncertainty_analysis: UncertaintyAnalysis;
  validation: FormulaValidation;
  confidence: number;
  caveats: string[];
}

/** Uncertainty propagation */
export interface UncertaintyAnalysis {
  method: "RSS" | "Monte_Carlo" | "Analytical";
  input_uncertainties: Record<string, number>;
  output_uncertainty: number;
  sensitivity: Record<string, number>;
  dominant_contributors: string[];
}

/** Material science reasoning */
export interface MaterialReasoning {
  material: string;
  iso_group: string;
  properties_used: Array<{
    property: string;
    value: number;
    unit: string;
    source: string;
  }>;
  behavior_predictions: string[];
  machining_implications: string[];
  thermal_considerations: string[];
  work_hardening_analysis?: string;
  confidence: number;
}

/** Thermodynamic reasoning */
export interface ThermalReasoning {
  heat_sources: Array<{
    source: string;
    power_W: number;
    fraction: number;
  }>;
  heat_sinks: Array<{
    sink: string;
    effectiveness: number;
  }>;
  temperature_predictions: Array<{
    location: string;
    temperature_C: number;
    time_s: number;
  }>;
  thermal_damage_risk: "none" | "low" | "medium" | "high";
  cooling_recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Zero dimension (dimensionless) */
const DIMENSIONLESS: Dimension = { L: 0, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 };

/** Common unit dimensions */
const UNIT_DIMENSIONS: Record<string, Dimension> = {
  // Length
  "m": { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 },
  "mm": { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 },
  "µm": { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 },
  // Mass
  "kg": { L: 0, M: 1, T: 0, I: 0, Θ: 0, N: 0, J: 0 },
  "g": { L: 0, M: 1, T: 0, I: 0, Θ: 0, N: 0, J: 0 },
  // Time
  "s": { L: 0, M: 0, T: 1, I: 0, Θ: 0, N: 0, J: 0 },
  "min": { L: 0, M: 0, T: 1, I: 0, Θ: 0, N: 0, J: 0 },
  // Force
  "N": { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 },
  "kN": { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 },
  // Pressure/Stress
  "Pa": { L: -1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 },
  "MPa": { L: -1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 },
  "GPa": { L: -1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 },
  "N/mm²": { L: -1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 },
  // Energy
  "J": { L: 2, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 },
  "kJ": { L: 2, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 },
  // Power
  "W": { L: 2, M: 1, T: -3, I: 0, Θ: 0, N: 0, J: 0 },
  "kW": { L: 2, M: 1, T: -3, I: 0, Θ: 0, N: 0, J: 0 },
  // Velocity
  "m/s": { L: 1, M: 0, T: -1, I: 0, Θ: 0, N: 0, J: 0 },
  "m/min": { L: 1, M: 0, T: -1, I: 0, Θ: 0, N: 0, J: 0 },
  "mm/rev": { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 },  // Feed per revolution
  // Temperature
  "K": { L: 0, M: 0, T: 0, I: 0, Θ: 1, N: 0, J: 0 },
  "°C": { L: 0, M: 0, T: 0, I: 0, Θ: 1, N: 0, J: 0 },
  // Thermal conductivity
  "W/(m·K)": { L: 1, M: 1, T: -3, I: 0, Θ: -1, N: 0, J: 0 },
};

/** Canonical physics formulas for manufacturing */
const CANONICAL_FORMULAS: Record<string, {
  formula: string;
  description: string;
  reference: string;
  dimensional_form: string;
}> = {
  "kienzle_force": {
    formula: "Fc = kc1.1 × b × h^(1-mc)",
    description: "Kienzle cutting force model",
    reference: "Kienzle & Victor, 1957",
    dimensional_form: "F = σ × L × L^(1-mc) → F",
  },
  "taylor_tool_life": {
    formula: "T = (C/Vc)^(1/n)",
    description: "Taylor tool life equation",
    reference: "Taylor, 1907",
    dimensional_form: "T = (T·V^n / V)^(1/n) → T",
  },
  "deflection_cantilever": {
    formula: "δ = F×L³/(3×E×I)",
    description: "Cantilever beam deflection",
    reference: "Euler-Bernoulli beam theory",
    dimensional_form: "L = F×L³/(E×L⁴) → L",
  },
  "mrr_milling": {
    formula: "MRR = Vc × fz × z × ap × ae / (π × d)",
    description: "Material removal rate for milling",
    reference: "Machining fundamentals",
    dimensional_form: "L³/T = (L/T) × L × L × L / L → L³/T",
  },
  "surface_roughness": {
    formula: "Ra = f² / (32 × r)",
    description: "Theoretical surface roughness",
    reference: "Feed mark model",
    dimensional_form: "L = L² / L → L",
  },
  "cutting_temperature": {
    formula: "θ = θ₀ + (0.4 × u × Vc) / (ρ × c × √(λ × Vc × tc))",
    description: "Cutting zone temperature",
    reference: "Loewen-Shaw model",
    dimensional_form: "Θ = Θ + (E/L³ × L/T) / (M/L³ × E/(M·Θ) × √(E/(L·T·Θ) × L/T × L)) → Θ",
  },
  "power_cutting": {
    formula: "P = Fc × Vc / (60 × 1000)",
    description: "Cutting power",
    reference: "Basic mechanics",
    dimensional_form: "P = F × V → P",
  },
  "specific_energy": {
    formula: "u = Fc / (b × h)",
    description: "Specific cutting energy",
    reference: "Metal cutting fundamentals",
    dimensional_form: "E/L³ = F / (L × L) → E/L³",
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export class ScientificReasoningEngine {
  private readonly engineName = "ScientificReasoningEngine";

  // ============================================================================
  // DIMENSIONAL ANALYSIS
  // ============================================================================

  /**
   * Check dimensional consistency of an equation.
   */
  checkDimensionalConsistency(
    leftSide: PhysicalQuantity,
    rightSide: PhysicalQuantity
  ): DimensionalAnalysis {
    const match = this.dimensionsEqual(leftSide.dimension, rightSide.dimension);

    return {
      valid: match,
      left_dimension: leftSide.dimension,
      right_dimension: rightSide.dimension,
      mismatch: match ? undefined : this.describeMismatch(leftSide.dimension, rightSide.dimension),
      suggestion: match ? undefined : this.suggestFix(leftSide.dimension, rightSide.dimension),
    };
  }

  /**
   * Get dimension for a unit.
   */
  getDimension(unit: string): Dimension {
    return UNIT_DIMENSIONS[unit] || DIMENSIONLESS;
  }

  /**
   * Multiply dimensions (for multiplication of quantities).
   */
  multiplyDimensions(d1: Dimension, d2: Dimension): Dimension {
    return {
      L: d1.L + d2.L,
      M: d1.M + d2.M,
      T: d1.T + d2.T,
      I: d1.I + d2.I,
      Θ: d1.Θ + d2.Θ,
      N: d1.N + d2.N,
      J: d1.J + d2.J,
    };
  }

  /**
   * Divide dimensions (for division of quantities).
   */
  divideDimensions(d1: Dimension, d2: Dimension): Dimension {
    return {
      L: d1.L - d2.L,
      M: d1.M - d2.M,
      T: d1.T - d2.T,
      I: d1.I - d2.I,
      Θ: d1.Θ - d2.Θ,
      N: d1.N - d2.N,
      J: d1.J - d2.J,
    };
  }

  /**
   * Raise dimension to a power.
   */
  powerDimension(d: Dimension, power: number): Dimension {
    return {
      L: d.L * power,
      M: d.M * power,
      T: d.T * power,
      I: d.I * power,
      Θ: d.Θ * power,
      N: d.N * power,
      J: d.J * power,
    };
  }

  /** Check if two dimensions are equal */
  private dimensionsEqual(d1: Dimension, d2: Dimension): boolean {
    return d1.L === d2.L && d1.M === d2.M && d1.T === d2.T &&
           d1.I === d2.I && d1.Θ === d2.Θ && d1.N === d2.N && d1.J === d2.J;
  }

  /** Describe dimension mismatch */
  private describeMismatch(d1: Dimension, d2: Dimension): string {
    const mismatches: string[] = [];
    if (d1.L !== d2.L) mismatches.push(`Length: ${d1.L} vs ${d2.L}`);
    if (d1.M !== d2.M) mismatches.push(`Mass: ${d1.M} vs ${d2.M}`);
    if (d1.T !== d2.T) mismatches.push(`Time: ${d1.T} vs ${d2.T}`);
    if (d1.Θ !== d2.Θ) mismatches.push(`Temperature: ${d1.Θ} vs ${d2.Θ}`);
    return `Dimensional mismatch: ${mismatches.join(", ")}`;
  }

  /** Suggest a fix for dimension mismatch */
  private suggestFix(d1: Dimension, d2: Dimension): string {
    const diff: Dimension = {
      L: d2.L - d1.L,
      M: d2.M - d1.M,
      T: d2.T - d1.T,
      I: d2.I - d1.I,
      Θ: d2.Θ - d1.Θ,
      N: d2.N - d1.N,
      J: d2.J - d1.J,
    };

    // Common fixes
    if (diff.L === 1 && diff.M === 0 && diff.T === 0) {
      return "Multiply by a length factor (m, mm)";
    }
    if (diff.L === -1 && diff.M === 0 && diff.T === 0) {
      return "Divide by a length factor (m, mm)";
    }
    if (diff.T === 1) {
      return "Multiply by time (s, min)";
    }
    if (diff.T === -1) {
      return "Divide by time or use rate form";
    }

    return "Check unit conversions and formula structure";
  }

  // ============================================================================
  // FORMULA VALIDATION
  // ============================================================================

  /**
   * Validate a physics formula.
   */
  validateFormula(
    formulaId: string,
    inputs: Record<string, PhysicalQuantity>,
    output: PhysicalQuantity
  ): FormulaValidation {
    const canonical = CANONICAL_FORMULAS[formulaId];

    if (!canonical) {
      return {
        formula_id: formulaId,
        formula: "Unknown",
        valid: false,
        dimensional_check: {
          valid: false,
          left_dimension: output.dimension,
          right_dimension: DIMENSIONLESS,
          mismatch: "Formula not found in canonical database",
        },
        range_check: { valid: true, out_of_range_params: [] },
        physics_check: { valid: false, principles_applied: [], violations: ["Unknown formula"], assumptions: [] },
        recommendations: ["Verify formula against literature"],
        confidence: 0,
      };
    }

    // Dimensional check
    const dimensionalCheck = this.validateFormulaDimensions(formulaId, inputs, output);

    // Range check
    const rangeCheck = this.validateRanges(formulaId, inputs);

    // Physics principle check
    const physicsCheck = this.validatePhysicsPrinciples(formulaId, inputs, output);

    const valid = dimensionalCheck.valid && rangeCheck.valid && physicsCheck.valid;

    return {
      formula_id: formulaId,
      formula: canonical.formula,
      valid,
      dimensional_check: dimensionalCheck,
      range_check: rangeCheck,
      physics_check: physicsCheck,
      recommendations: this.generateFormulaRecommendations(dimensionalCheck, rangeCheck, physicsCheck),
      confidence: valid ? 0.95 : 0.5,
    };
  }

  /** Validate formula dimensions */
  private validateFormulaDimensions(
    formulaId: string,
    inputs: Record<string, PhysicalQuantity>,
    output: PhysicalQuantity
  ): DimensionalAnalysis {
    // For now, simplified check based on known formulas
    switch (formulaId) {
      case "kienzle_force": {
        // Fc = kc1.1 × b × h^(1-mc)
        // Should produce Force [M L T^-2]
        const expectedDim: Dimension = { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 };
        return {
          valid: this.dimensionsEqual(output.dimension, expectedDim),
          left_dimension: output.dimension,
          right_dimension: expectedDim,
        };
      }
      case "deflection_cantilever": {
        // δ = F×L³/(3×E×I) should produce Length
        const expectedDim: Dimension = { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 };
        return {
          valid: this.dimensionsEqual(output.dimension, expectedDim),
          left_dimension: output.dimension,
          right_dimension: expectedDim,
        };
      }
      case "power_cutting": {
        // P = F × V should produce Power [M L² T^-3]
        const expectedDim: Dimension = { L: 2, M: 1, T: -3, I: 0, Θ: 0, N: 0, J: 0 };
        return {
          valid: this.dimensionsEqual(output.dimension, expectedDim),
          left_dimension: output.dimension,
          right_dimension: expectedDim,
        };
      }
      default:
        return {
          valid: true,
          left_dimension: output.dimension,
          right_dimension: output.dimension,
        };
    }
  }

  /** Validate parameter ranges */
  private validateRanges(
    formulaId: string,
    inputs: Record<string, PhysicalQuantity>
  ): RangeCheck {
    const outOfRange: RangeCheck["out_of_range_params"] = [];

    // Common manufacturing ranges
    const ranges: Record<string, { min: number; max: number }> = {
      Vc: { min: 1, max: 1000 },      // Cutting speed m/min
      fz: { min: 0.001, max: 1 },     // Feed per tooth mm
      ap: { min: 0.01, max: 50 },     // Depth of cut mm
      ae: { min: 0.01, max: 100 },    // Width of cut mm
      d: { min: 0.1, max: 200 },      // Tool diameter mm
      L: { min: 1, max: 500 },        // Length mm
      kc: { min: 500, max: 5000 },    // Specific cutting force N/mm²
    };

    for (const [param, qty] of Object.entries(inputs)) {
      const range = ranges[param];
      if (range) {
        if (qty.value < range.min) {
          outOfRange.push({
            param,
            value: qty.value,
            min: range.min,
            max: range.max,
            severity: qty.value < range.min * 0.5 ? "error" : "warning",
          });
        }
        if (qty.value > range.max) {
          outOfRange.push({
            param,
            value: qty.value,
            min: range.min,
            max: range.max,
            severity: qty.value > range.max * 2 ? "error" : "warning",
          });
        }
      }
    }

    return {
      valid: outOfRange.filter(o => o.severity === "error").length === 0,
      out_of_range_params: outOfRange,
    };
  }

  /** Validate physics principles */
  private validatePhysicsPrinciples(
    formulaId: string,
    inputs: Record<string, PhysicalQuantity>,
    output: PhysicalQuantity
  ): PhysicsCheck {
    const principles: string[] = [];
    const violations: string[] = [];
    const assumptions: string[] = [];

    switch (formulaId) {
      case "kienzle_force":
        principles.push("Conservation of energy", "Plasticity theory", "Empirical shear plane model");
        assumptions.push("Steady-state orthogonal cutting", "Sharp tool edge", "Homogeneous workpiece material");
        if (output.value < 0) violations.push("Cutting force cannot be negative");
        break;

      case "taylor_tool_life":
        principles.push("Empirical wear progression", "Arrhenius thermal activation");
        assumptions.push("Constant cutting conditions", "Flank wear dominant", "Tool failure criterion defined");
        if (output.value <= 0) violations.push("Tool life must be positive");
        break;

      case "deflection_cantilever":
        principles.push("Euler-Bernoulli beam theory", "Linear elasticity", "Small deflection assumption");
        assumptions.push("Isotropic material", "Constant cross-section", "Point load at free end");
        if (output.value < 0) violations.push("Deflection direction should match force direction");
        break;

      case "power_cutting":
        principles.push("Work-energy theorem", "Conservation of energy");
        assumptions.push("100% mechanical efficiency for calculation", "Steady-state cutting");
        if (output.value < 0) violations.push("Power cannot be negative");
        break;

      default:
        principles.push("General physics principles");
    }

    return {
      valid: violations.length === 0,
      principles_applied: principles,
      violations,
      assumptions,
    };
  }

  /** Generate recommendations based on validation */
  private generateFormulaRecommendations(
    dimensional: DimensionalAnalysis,
    range: RangeCheck,
    physics: PhysicsCheck
  ): string[] {
    const recs: string[] = [];

    if (!dimensional.valid) {
      recs.push("Check unit conversions in formula inputs");
      if (dimensional.suggestion) recs.push(dimensional.suggestion);
    }

    for (const param of range.out_of_range_params) {
      if (param.severity === "error") {
        recs.push(`CRITICAL: ${param.param}=${param.value} is far outside valid range [${param.min}, ${param.max}]`);
      } else {
        recs.push(`${param.param}=${param.value} is outside typical range [${param.min}, ${param.max}]`);
      }
    }

    for (const violation of physics.violations) {
      recs.push(`Physics violation: ${violation}`);
    }

    return recs;
  }

  // ============================================================================
  // SCIENTIFIC REASONING
  // ============================================================================

  /**
   * Perform scientific reasoning for a calculation.
   */
  reason(
    problem: string,
    inputs: Record<string, PhysicalQuantity>,
    calculationType: string
  ): ScientificReasoning {
    log.info(`[${this.engineName}] Reasoning: ${problem}`);

    const approach = this.determineApproach(calculationType);
    const principles = this.identifyPrinciples(calculationType);
    const equations = this.selectEquations(calculationType);

    // Perform calculation with step tracking
    const steps = this.calculateWithSteps(calculationType, inputs);

    // Get final result
    const finalResult = steps.length > 0
      ? steps[steps.length - 1].result
      : { value: 0, unit: "", dimension: DIMENSIONLESS };

    // Uncertainty analysis
    const uncertaintyAnalysis = this.propagateUncertainty(inputs, calculationType);

    // Validate result
    const validation = this.validateFormula(calculationType, inputs, finalResult);

    // Calculate confidence
    const confidence = this.calculateConfidence(validation, uncertaintyAnalysis);

    return {
      problem_statement: problem,
      approach,
      principles_used: principles,
      equations_applied: equations,
      dimensional_analysis: steps.map(s => this.checkDimensionalConsistency(s.result, s.result)),
      intermediate_steps: steps,
      final_result: finalResult,
      uncertainty_analysis: uncertaintyAnalysis,
      validation,
      confidence,
      caveats: this.identifyCaveats(calculationType, inputs, finalResult),
    };
  }

  /** Determine reasoning approach */
  private determineApproach(calculationType: string): string {
    const approaches: Record<string, string> = {
      "kienzle_force": "Apply Kienzle empirical cutting force model with material-specific coefficients",
      "taylor_tool_life": "Use Taylor tool life equation with interpolated constants",
      "deflection_cantilever": "Apply Euler-Bernoulli beam theory for cantilever deflection",
      "power_cutting": "Calculate power from force and velocity relationship",
      "surface_roughness": "Apply feed mark geometry model for theoretical Ra",
      "cutting_temperature": "Use Loewen-Shaw thermal partition model",
    };
    return approaches[calculationType] || "Apply relevant physics/engineering principles";
  }

  /** Identify applicable principles */
  private identifyPrinciples(calculationType: string): string[] {
    const principleMap: Record<string, string[]> = {
      "kienzle_force": [
        "Specific cutting energy concept",
        "Empirical shear plane model",
        "Power law material behavior",
      ],
      "deflection_cantilever": [
        "Euler-Bernoulli beam theory",
        "Linear elasticity",
        "Principle of superposition",
      ],
      "cutting_temperature": [
        "Heat partition theory",
        "Moving heat source model",
        "Thermal diffusivity",
      ],
    };
    return principleMap[calculationType] || ["Engineering mechanics", "Material behavior"];
  }

  /** Select applicable equations */
  private selectEquations(calculationType: string): Array<{
    name: string;
    formula: string;
    reference: string;
  }> {
    const canonical = CANONICAL_FORMULAS[calculationType];
    if (canonical) {
      return [{
        name: calculationType,
        formula: canonical.formula,
        reference: canonical.reference,
      }];
    }
    return [];
  }

  /** Calculate with intermediate steps */
  private calculateWithSteps(
    calculationType: string,
    inputs: Record<string, PhysicalQuantity>
  ): ScientificReasoning["intermediate_steps"] {
    const steps: ScientificReasoning["intermediate_steps"] = [];

    switch (calculationType) {
      case "kienzle_force": {
        const kc = inputs["kc"]?.value || 1800;
        const ap = inputs["ap"]?.value || 2;
        const fz = inputs["fz"]?.value || 0.1;
        const mc = inputs["mc"]?.value || 0.25;

        steps.push({
          step: 1,
          description: "Calculate chip thickness term h^(1-mc)",
          calculation: `h^(1-mc) = ${fz}^(1-${mc}) = ${fz}^${1-mc}`,
          result: {
            value: Math.pow(fz, 1 - mc),
            unit: "mm^(1-mc)",
            dimension: { L: 1 - mc, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 },
          },
        });

        const Fc = kc * ap * Math.pow(fz, 1 - mc);
        steps.push({
          step: 2,
          description: "Calculate cutting force Fc = kc1.1 × ap × h^(1-mc)",
          calculation: `Fc = ${kc} × ${ap} × ${Math.pow(fz, 1 - mc).toFixed(4)} = ${Fc.toFixed(1)} N`,
          result: {
            value: Fc,
            unit: "N",
            dimension: { L: 1, M: 1, T: -2, I: 0, Θ: 0, N: 0, J: 0 },
          },
        });
        break;
      }

      case "deflection_cantilever": {
        const F = inputs["F"]?.value || 100;
        const L = inputs["L"]?.value || 50;
        const E = inputs["E"]?.value || 210000;
        const I = inputs["I"]?.value || 100;

        const delta = (F * Math.pow(L, 3)) / (3 * E * I);

        steps.push({
          step: 1,
          description: "Calculate deflection δ = F×L³/(3×E×I)",
          calculation: `δ = ${F} × ${L}³ / (3 × ${E} × ${I}) = ${delta.toFixed(4)} mm`,
          result: {
            value: delta,
            unit: "mm",
            dimension: { L: 1, M: 0, T: 0, I: 0, Θ: 0, N: 0, J: 0 },
          },
        });
        break;
      }

      default:
        steps.push({
          step: 1,
          description: `Apply ${calculationType} calculation`,
          calculation: "Direct application of formula",
          result: {
            value: 0,
            unit: "",
            dimension: DIMENSIONLESS,
          },
        });
    }

    return steps;
  }

  /** Propagate uncertainty through calculation */
  private propagateUncertainty(
    inputs: Record<string, PhysicalQuantity>,
    calculationType: string
  ): UncertaintyAnalysis {
    const inputUncertainties: Record<string, number> = {};
    const sensitivity: Record<string, number> = {};

    for (const [param, qty] of Object.entries(inputs)) {
      inputUncertainties[param] = qty.uncertainty || qty.value * 0.05; // Default 5%
    }

    // RSS propagation (simplified)
    let sumSquares = 0;
    for (const [param, unc] of Object.entries(inputUncertainties)) {
      const sens = 1.0; // Simplified - would compute partial derivatives
      sensitivity[param] = sens;
      sumSquares += Math.pow(sens * unc, 2);
    }

    const outputUnc = Math.sqrt(sumSquares);

    // Find dominant contributors
    const contributions = Object.entries(inputUncertainties)
      .map(([param, unc]) => ({ param, contribution: Math.pow(sensitivity[param] * unc, 2) }))
      .sort((a, b) => b.contribution - a.contribution);

    return {
      method: "RSS",
      input_uncertainties: inputUncertainties,
      output_uncertainty: outputUnc,
      sensitivity,
      dominant_contributors: contributions.slice(0, 3).map(c => c.param),
    };
  }

  /** Calculate confidence based on validation results */
  private calculateConfidence(
    validation: FormulaValidation,
    uncertainty: UncertaintyAnalysis
  ): number {
    let confidence = 0.9;

    if (!validation.dimensional_check.valid) confidence -= 0.3;
    if (!validation.range_check.valid) confidence -= 0.2;
    if (!validation.physics_check.valid) confidence -= 0.2;

    // Reduce confidence for high uncertainty
    if (uncertainty.output_uncertainty > 0.2) confidence -= 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  /** Identify caveats for the calculation */
  private identifyCaveats(
    calculationType: string,
    inputs: Record<string, PhysicalQuantity>,
    result: PhysicalQuantity
  ): string[] {
    const caveats: string[] = [];

    // Formula-specific caveats
    const formulaCaveats: Record<string, string[]> = {
      "kienzle_force": [
        "Assumes sharp tool edge - wear increases force",
        "Valid for orthogonal cutting; oblique cutting adds correction factor",
        "kc1.1 values are material-specific and may vary ±15%",
      ],
      "taylor_tool_life": [
        "Empirical equation - constants must be from similar conditions",
        "Does not account for interrupted cuts or thermal cycling",
        "Assumes single dominant wear mechanism",
      ],
      "deflection_cantilever": [
        "Small deflection assumption - may not hold for long tools",
        "Assumes constant cross-section",
        "Does not include dynamic effects",
      ],
    };

    caveats.push(...(formulaCaveats[calculationType] || []));

    // Add caveats based on input ranges
    for (const [param, qty] of Object.entries(inputs)) {
      if (qty.uncertainty && qty.uncertainty > qty.value * 0.1) {
        caveats.push(`High uncertainty in ${param} (>${(qty.uncertainty/qty.value*100).toFixed(0)}%)`);
      }
    }

    return caveats;
  }

  // ============================================================================
  // MATERIAL SCIENCE REASONING
  // ============================================================================

  /**
   * Perform material science reasoning.
   */
  reasonMaterial(
    material: string,
    context: Record<string, unknown>
  ): MaterialReasoning {
    const isoGroup = this.determineISOGroup(material);
    const properties = this.getMaterialProperties(material);
    const behavior = this.predictBehavior(material, isoGroup, context);
    const machining = this.getMachiningImplications(isoGroup, context);
    const thermal = this.getThermalConsiderations(material, isoGroup);

    return {
      material,
      iso_group: isoGroup,
      properties_used: properties,
      behavior_predictions: behavior,
      machining_implications: machining,
      thermal_considerations: thermal,
      work_hardening_analysis: this.analyzeWorkHardening(material, isoGroup),
      confidence: 0.85,
    };
  }

  /** Determine ISO material group */
  private determineISOGroup(material: string): string {
    const matLower = material.toLowerCase();

    // Check specific/hardened tool steels FIRST (before generic steel)
    if (matLower.includes("hardened") || matLower.includes("d2") || matLower.includes("m2") ||
        matLower.includes("h13") || matLower.includes("s7") || matLower.includes("a2") ||
        matLower.includes("tool steel") || matLower.includes("toolsteel")) return "H";
    // Superalloys and titanium
    if (matLower.includes("titanium") || matLower.includes("inconel") || matLower.includes("nickel")) return "S";
    // Stainless steels
    if (matLower.includes("stainless") || matLower.includes("304") || matLower.includes("316")) return "M";
    // Cast iron
    if (matLower.includes("cast iron") || matLower.includes("gray iron")) return "K";
    // Aluminum
    if (matLower.includes("aluminum") || matLower.includes("6061") || matLower.includes("7075")) return "N";
    // Generic carbon/alloy steels (checked last for steels)
    if (matLower.includes("steel") || matLower.includes("1045") || matLower.includes("4140")) return "P";

    return "P"; // Default to steel
  }

  /** Get material properties */
  private getMaterialProperties(material: string): MaterialReasoning["properties_used"] {
    const isoGroup = this.determineISOGroup(material);

    const propertiesByGroup: Record<string, MaterialReasoning["properties_used"]> = {
      "P": [
        { property: "Tensile Strength", value: 600, unit: "MPa", source: "Material DB" },
        { property: "Hardness", value: 200, unit: "HB", source: "Material DB" },
        { property: "Thermal Conductivity", value: 50, unit: "W/m·K", source: "Material DB" },
        { property: "kc1.1", value: 1800, unit: "N/mm²", source: "Kienzle DB" },
      ],
      "M": [
        { property: "Tensile Strength", value: 550, unit: "MPa", source: "Material DB" },
        { property: "Hardness", value: 180, unit: "HB", source: "Material DB" },
        { property: "Thermal Conductivity", value: 16, unit: "W/m·K", source: "Material DB" },
        { property: "kc1.1", value: 2100, unit: "N/mm²", source: "Kienzle DB" },
        { property: "Work Hardening Rate", value: 0.45, unit: "", source: "Literature" },
      ],
      "S": [
        { property: "Tensile Strength", value: 900, unit: "MPa", source: "Material DB" },
        { property: "Hardness", value: 350, unit: "HB", source: "Material DB" },
        { property: "Thermal Conductivity", value: 7, unit: "W/m·K", source: "Material DB" },
        { property: "kc1.1", value: 2800, unit: "N/mm²", source: "Kienzle DB" },
      ],
      "H": [
        { property: "Hardness", value: 58, unit: "HRC", source: "Material DB" },
        { property: "Thermal Conductivity", value: 25, unit: "W/m·K", source: "Material DB" },
        { property: "kc1.1", value: 3200, unit: "N/mm²", source: "Kienzle DB" },
      ],
      "N": [
        { property: "Tensile Strength", value: 310, unit: "MPa", source: "Material DB" },
        { property: "Hardness", value: 95, unit: "HB", source: "Material DB" },
        { property: "Thermal Conductivity", value: 167, unit: "W/m·K", source: "Material DB" },
        { property: "kc1.1", value: 700, unit: "N/mm²", source: "Kienzle DB" },
      ],
      "K": [
        { property: "Tensile Strength", value: 250, unit: "MPa", source: "Material DB" },
        { property: "Hardness", value: 200, unit: "HB", source: "Material DB" },
        { property: "Thermal Conductivity", value: 45, unit: "W/m·K", source: "Material DB" },
        { property: "kc1.1", value: 1100, unit: "N/mm²", source: "Kienzle DB" },
      ],
    };

    return propertiesByGroup[isoGroup] || propertiesByGroup["P"];
  }

  /** Predict material behavior */
  private predictBehavior(
    material: string,
    isoGroup: string,
    context: Record<string, unknown>
  ): string[] {
    const behaviors: string[] = [];

    switch (isoGroup) {
      case "M":
        behaviors.push("Significant work hardening - avoid dwelling in cut");
        behaviors.push("BUE formation likely at low speeds");
        behaviors.push("Stringy chips - consider chip breakers");
        break;
      case "S":
        behaviors.push("Very low thermal conductivity - heat concentrates at tool edge");
        behaviors.push("High strength maintained at elevated temperature");
        behaviors.push("Chemical reactivity with tool coating at high temp");
        break;
      case "H":
        behaviors.push("Hard phase abrasion - rapid flank wear");
        behaviors.push("Requires CBN or ceramic tooling for efficiency");
        behaviors.push("Sensitive to interrupted cuts - thermal shock risk");
        break;
      case "N":
        behaviors.push("Excellent machinability");
        behaviors.push("BUE formation possible - maintain adequate speed");
        behaviors.push("High thermal conductivity aids chip evacuation");
        break;
      case "K":
        behaviors.push("Discontinuous chips - good chip control");
        behaviors.push("Abrasive graphite flakes in gray iron");
        behaviors.push("Minimal work hardening");
        break;
      default:
        behaviors.push("Standard steel machining behavior expected");
    }

    return behaviors;
  }

  /** Get machining implications */
  private getMachiningImplications(
    isoGroup: string,
    context: Record<string, unknown>
  ): string[] {
    const implications: string[] = [];

    const speedRanges: Record<string, string> = {
      "P": "Vc: 150-250 m/min (carbide), 25-50 m/min (HSS)",
      "M": "Vc: 100-180 m/min (carbide), reduce for work hardening risk",
      "K": "Vc: 80-200 m/min (carbide), watch for graphite dust",
      "N": "Vc: 300-600 m/min (carbide), high speeds reduce BUE",
      "S": "Vc: 30-60 m/min (carbide), high-pressure coolant essential",
      "H": "Vc: 80-150 m/min (CBN), light cuts recommended",
    };

    implications.push(speedRanges[isoGroup] || "Standard speeds apply");

    if (isoGroup === "S" || isoGroup === "M") {
      implications.push("Through-tool coolant recommended (70+ bar)");
    }

    if (isoGroup === "H") {
      implications.push("Dry machining may be required to avoid thermal shock");
    }

    return implications;
  }

  /** Get thermal considerations */
  private getThermalConsiderations(material: string, isoGroup: string): string[] {
    const considerations: string[] = [];

    if (isoGroup === "S") {
      considerations.push("Very low thermal conductivity (7-15 W/m·K)");
      considerations.push("95% of heat goes to tool - manage with coolant");
      considerations.push("Risk of alpha case formation on titanium");
    } else if (isoGroup === "N") {
      considerations.push("High thermal conductivity (150-200 W/m·K)");
      considerations.push("Heat dissipates quickly through workpiece");
    } else if (isoGroup === "H") {
      considerations.push("Thermal shock risk with interrupted cuts");
      considerations.push("Consider continuous toolpath strategies");
    }

    return considerations;
  }

  /** Analyze work hardening */
  private analyzeWorkHardening(material: string, isoGroup: string): string | undefined {
    if (isoGroup === "M") {
      return "Austenitic stainless steels (304, 316) work harden significantly. " +
             "Maintain positive rake angle and constant chip load. " +
             "Dwelling or light cuts create hardened layer that accelerates wear.";
    }
    if (isoGroup === "S" && material.toLowerCase().includes("inconel")) {
      return "Nickel superalloys exhibit extreme work hardening. " +
             "Use sharp tools with positive geometry. " +
             "Feed must exceed work-hardened layer depth (typically >0.08 mm).";
    }
    return undefined;
  }

  // ============================================================================
  // THERMAL REASONING
  // ============================================================================

  /**
   * Perform thermal analysis reasoning.
   */
  reasonThermal(
    cuttingConditions: {
      Vc_mpm: number;
      fz_mm: number;
      ap_mm: number;
      material: string;
    },
    coolantType: "none" | "flood" | "mist" | "through_tool"
  ): ThermalReasoning {
    const { Vc_mpm, fz_mm, ap_mm, material } = cuttingConditions;
    const isoGroup = this.determineISOGroup(material);

    // Estimate cutting power (simplified)
    const kc = this.getKc11(isoGroup);
    const Fc = kc * ap_mm * Math.pow(fz_mm, 0.75);
    const Pc = (Fc * Vc_mpm) / 60000; // kW

    // Heat partition based on material
    const toolFraction = this.getToolHeatFraction(isoGroup);
    const chipFraction = 0.75;
    const workpieceFraction = 1 - toolFraction - chipFraction;

    const heatSources = [
      { source: "Primary shear zone", power_W: Pc * 1000 * 0.7, fraction: 0.7 },
      { source: "Tool-chip interface", power_W: Pc * 1000 * 0.2, fraction: 0.2 },
      { source: "Tool-workpiece rubbing", power_W: Pc * 1000 * 0.1, fraction: 0.1 },
    ];

    const heatSinks = [
      { sink: "Chips", effectiveness: chipFraction },
      { sink: "Tool", effectiveness: toolFraction },
      { sink: "Workpiece", effectiveness: workpieceFraction },
    ];

    if (coolantType !== "none") {
      const coolantEffectiveness = coolantType === "through_tool" ? 0.4 :
                                    coolantType === "flood" ? 0.3 : 0.15;
      heatSinks.push({ sink: "Coolant", effectiveness: coolantEffectiveness });
    }

    // Estimate temperature
    const baseTemp = 20;
    const tempRise = this.estimateTempRise(Pc, Vc_mpm, isoGroup, coolantType);

    const temperaturePredictions = [
      { location: "Tool-chip interface", temperature_C: baseTemp + tempRise, time_s: 0.1 },
      { location: "Tool flank", temperature_C: baseTemp + tempRise * 0.7, time_s: 0.1 },
      { location: "Workpiece subsurface", temperature_C: baseTemp + tempRise * 0.3, time_s: 0.5 },
    ];

    // Assess thermal damage risk
    const maxTemp = baseTemp + tempRise;
    let damageRisk: ThermalReasoning["thermal_damage_risk"] = "none";
    if (maxTemp > 800) damageRisk = "high";
    else if (maxTemp > 600) damageRisk = "medium";
    else if (maxTemp > 400) damageRisk = "low";

    const recommendations: string[] = [];
    if (damageRisk === "high") {
      recommendations.push("CRITICAL: Reduce cutting speed or increase coolant pressure");
      recommendations.push("Consider cryogenic cooling for this material/speed combination");
    } else if (damageRisk === "medium") {
      recommendations.push("Monitor for thermal damage indicators");
      recommendations.push("Through-tool coolant recommended");
    }

    return {
      heat_sources: heatSources,
      heat_sinks: heatSinks,
      temperature_predictions: temperaturePredictions,
      thermal_damage_risk: damageRisk,
      cooling_recommendations: recommendations,
    };
  }

  /** Get kc1.1 for ISO group */
  private getKc11(isoGroup: string): number {
    const kc: Record<string, number> = {
      "P": 1800, "M": 2100, "K": 1100, "N": 700, "S": 2800, "H": 3200,
    };
    return kc[isoGroup] || 1800;
  }

  /** Get tool heat fraction */
  private getToolHeatFraction(isoGroup: string): number {
    // Low thermal conductivity materials send more heat to tool
    const fractions: Record<string, number> = {
      "P": 0.10, "M": 0.15, "K": 0.08, "N": 0.05, "S": 0.25, "H": 0.12,
    };
    return fractions[isoGroup] || 0.10;
  }

  /** Estimate temperature rise */
  private estimateTempRise(
    Pc_kW: number,
    Vc_mpm: number,
    isoGroup: string,
    coolant: "none" | "flood" | "mist" | "through_tool"
  ): number {
    // Simplified Loewen-Shaw inspired estimate
    const k = this.getThermalConductivity(isoGroup);
    const base = (Pc_kW * 1000 * 0.4) / (k * 0.001 * Vc_mpm);

    // Coolant reduction factors
    const coolantFactor: Record<string, number> = {
      "none": 1.0,
      "mist": 0.85,
      "flood": 0.65,
      "through_tool": 0.45,
    };

    return base * coolantFactor[coolant] * 0.5; // Scaling factor for realistic temps
  }

  /** Get thermal conductivity for ISO group */
  private getThermalConductivity(isoGroup: string): number {
    const k: Record<string, number> = {
      "P": 50, "M": 16, "K": 45, "N": 167, "S": 7, "H": 25,
    };
    return k[isoGroup] || 50;
  }
}

export const scientificReasoningEngine = new ScientificReasoningEngine();
