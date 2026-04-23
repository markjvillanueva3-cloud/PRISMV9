/**
 * ConstraintSatisfactionEngine — Multi-objective constraint solver for machining operations.
 *
 * Given a set of constraints (cycle time, surface finish, tool life, spindle power, acceleration),
 * evaluates whether a proposed machining strategy is feasible, identifies conflicts,
 * and suggests the best compromise when constraints are infeasible.
 *
 * Uses: Kienzle cutting force, Taylor tool life, scallop height model, spindle power model.
 */

export interface MachiningConstraints {
  max_cycle_time_min?: number;
  max_surface_roughness_um?: number;
  min_tool_life_parts?: number;
  max_spindle_power_kw?: number;
  max_cutting_force_n?: number;
  max_tool_deflection_mm?: number;
  max_spindle_utilization_pct?: number;
  max_acceleration_g?: number;
  tolerance_mm?: number;
  min_mrr_cm3_min?: number;
}

export interface MachiningParameters {
  tool_diameter_mm: number;
  flute_count: number;
  overhang_mm: number;
  stepover_mm: number;
  stepdown_mm: number;
  spindle_rpm: number;
  feed_per_tooth_mm: number;
  cutting_speed_m_min: number;
  material_iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  geometry_volume_cm3: number;
}

export interface MachineCapability {
  max_spindle_power_kw: number;
  max_rpm: number;
  max_feed_mmmin: number;
  max_accel_g?: number;
  spindle_taper?: string;
}

export interface ConstraintCheckResult {
  constraint: string;
  target: number;
  actual: number;
  unit: string;
  satisfied: boolean;
  margin_pct: number;
  severity: "ok" | "warning" | "violated";
}

export interface ConstraintSatisfactionResult {
  feasible: boolean;
  checks: ConstraintCheckResult[];
  violations: ConstraintCheckResult[];
  warnings: ConstraintCheckResult[];
  satisfied: ConstraintCheckResult[];
  overall_score: number; // 0-100, 100 = all satisfied with margin
  suggested_adjustments: Array<{
    parameter: string;
    current_value: number;
    suggested_value: number;
    reason: string;
    improvement: string;
  }>;
  trade_off_frontier: Array<{
    scenario: string;
    cycle_time_min: number;
    surface_finish_um: number;
    tool_life_parts: number;
    spindle_power_kw: number;
    feasible: boolean;
  }>;
  conflict_analysis: string[];
}

// Material Kc1.1 values (N/mm²)
const KC11: Record<string, number> = {
  P: 2100, M: 2500, K: 1500, N: 800, S: 3200, H: 4000,
};

// Taylor tool life exponents
const TAYLOR_N: Record<string, number> = {
  P: 0.25, M: 0.20, K: 0.30, N: 0.35, S: 0.15, H: 0.12,
};

// Reference tool life at reference speed (minutes at Vc_ref m/min)
const TAYLOR_REF: Record<string, { vc: number; T: number }> = {
  P: { vc: 200, T: 60 }, M: { vc: 120, T: 45 }, K: { vc: 250, T: 75 },
  N: { vc: 400, T: 90 }, S: { vc: 50, T: 30 }, H: { vc: 80, T: 40 },
};

export class ConstraintSatisfactionEngine {
  compute(
    params: MachiningParameters,
    constraints: MachiningConstraints,
    machine: MachineCapability
  ): ConstraintSatisfactionResult {
    const checks: ConstraintCheckResult[] = [];

    // ── Physics Calculations ──

    // Feed rate
    const feedRate = params.spindle_rpm * params.feed_per_tooth_mm * params.flute_count;

    // Mean chip thickness (Kienzle)
    const hm = params.feed_per_tooth_mm *
      Math.sqrt(params.stepover_mm / params.tool_diameter_mm);

    // Cutting force (Kienzle model)
    const kc11 = KC11[params.material_iso_group] || 2100;
    const mc = 0.25;
    const Fc = kc11 * params.stepdown_mm * hm * Math.pow(hm, -mc);

    // Spindle power
    const spindlePower = (Fc * params.cutting_speed_m_min) / (60 * 1000);

    // MRR
    const mrr = (params.stepdown_mm * params.stepover_mm * feedRate) / 1000;

    // Cycle time estimate
    const cycleTime = params.geometry_volume_cm3 / (mrr > 0 ? mrr : 0.001) * 1.15;

    // Surface finish (scallop height model)
    const toolRadius = params.tool_diameter_mm / 2;
    const scallop = (params.stepover_mm * params.stepover_mm) / (8 * toolRadius);
    const Ra = scallop * 4 + 0.2; // approximate Ra from scallop

    // Tool life (Taylor model)
    const taylorRef = TAYLOR_REF[params.material_iso_group] || TAYLOR_REF.P;
    const n = TAYLOR_N[params.material_iso_group] || 0.25;
    const toolLifeMin = taylorRef.T *
      Math.pow(taylorRef.vc / params.cutting_speed_m_min, 1 / n);
    const toolLifeParts = Math.max(1, Math.floor(toolLifeMin / cycleTime));

    // Tool deflection (cantilever beam model)
    const E = 600000; // MPa for carbide
    const I = (Math.PI / 64) * Math.pow(params.tool_diameter_mm, 4);
    const deflection = (Fc * Math.pow(params.overhang_mm, 3)) / (3 * E * I);

    // Spindle utilization
    const utilization = (spindlePower / machine.max_spindle_power_kw) * 100;

    // ── Constraint Checks ──

    if (constraints.max_cycle_time_min !== undefined) {
      checks.push(this.check("Cycle Time", constraints.max_cycle_time_min, cycleTime, "min", true));
    }
    if (constraints.max_surface_roughness_um !== undefined) {
      checks.push(this.check("Surface Finish (Ra)", constraints.max_surface_roughness_um, Ra, "μm", true));
    }
    if (constraints.min_tool_life_parts !== undefined) {
      checks.push(this.check("Tool Life", constraints.min_tool_life_parts, toolLifeParts, "parts", false));
    }
    if (constraints.max_spindle_power_kw !== undefined) {
      checks.push(this.check("Spindle Power", constraints.max_spindle_power_kw, spindlePower, "kW", true));
    } else {
      checks.push(this.check("Spindle Power (machine)", machine.max_spindle_power_kw, spindlePower, "kW", true));
    }
    if (constraints.max_cutting_force_n !== undefined) {
      checks.push(this.check("Cutting Force", constraints.max_cutting_force_n, Fc, "N", true));
    }
    if (constraints.max_tool_deflection_mm !== undefined) {
      checks.push(this.check("Tool Deflection", constraints.max_tool_deflection_mm, deflection, "mm", true));
    }
    if (constraints.max_spindle_utilization_pct !== undefined) {
      checks.push(this.check("Spindle Utilization", constraints.max_spindle_utilization_pct, utilization, "%", true));
    }
    if (constraints.min_mrr_cm3_min !== undefined) {
      checks.push(this.check("MRR", constraints.min_mrr_cm3_min, mrr, "cm³/min", false));
    }
    if (constraints.tolerance_mm !== undefined) {
      checks.push(this.check("Tolerance (deflection)", constraints.tolerance_mm, deflection, "mm", true));
    }

    // RPM check against machine
    checks.push(this.check("Max RPM", machine.max_rpm, params.spindle_rpm, "rpm", true));

    // ── Analysis ──

    const violations = checks.filter(c => c.severity === "violated");
    const warnings = checks.filter(c => c.severity === "warning");
    const satisfied = checks.filter(c => c.severity === "ok");
    const feasible = violations.length === 0;

    // Overall score: 100 if all satisfied with good margin
    const score = checks.reduce((sum, c) => {
      if (c.severity === "ok") return sum + (100 / checks.length) * (1 + c.margin_pct / 200);
      if (c.severity === "warning") return sum + (50 / checks.length);
      return sum;
    }, 0);

    // Suggested adjustments for violations
    const adjustments = this.suggestAdjustments(violations, params);

    // Trade-off frontier (3 scenarios)
    const frontier = this.generateTradeOffFrontier(params, constraints, machine);

    // Conflict analysis
    const conflicts = this.analyzeConflicts(constraints, params, machine);

    return {
      feasible,
      checks,
      violations,
      warnings,
      satisfied,
      overall_score: Math.round(Math.min(100, score)),
      suggested_adjustments: adjustments,
      trade_off_frontier: frontier,
      conflict_analysis: conflicts,
    };
  }

  private check(name: string, target: number, actual: number, unit: string, lowerIsBetter: boolean): ConstraintCheckResult {
    const margin = lowerIsBetter
      ? ((target - actual) / target) * 100
      : ((actual - target) / target) * 100;

    return {
      constraint: name,
      target: Math.round(target * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      unit,
      satisfied: margin >= 0,
      margin_pct: Math.round(margin * 10) / 10,
      severity: margin >= 10 ? "ok" : margin >= 0 ? "warning" : "violated",
    };
  }

  private suggestAdjustments(violations: ConstraintCheckResult[], params: MachiningParameters) {
    const adjustments: ConstraintSatisfactionResult["suggested_adjustments"] = [];

    for (const v of violations) {
      switch (v.constraint) {
        case "Spindle Power":
        case "Spindle Power (machine)":
          adjustments.push({
            parameter: "stepdown_mm",
            current_value: params.stepdown_mm,
            suggested_value: Math.round(params.stepdown_mm * (v.target / v.actual) * 100) / 100,
            reason: `Power ${v.actual}kW exceeds ${v.target}kW limit`,
            improvement: "Reduce stepdown to lower cutting force and power",
          });
          break;
        case "Surface Finish (Ra)":
          adjustments.push({
            parameter: "stepover_mm",
            current_value: params.stepover_mm,
            suggested_value: Math.round(Math.sqrt(v.target * 8 * params.tool_diameter_mm / 2 / 4) * 100) / 100,
            reason: `Ra ${v.actual}μm exceeds ${v.target}μm target`,
            improvement: "Reduce stepover for finer scallop height",
          });
          break;
        case "Tool Deflection":
        case "Tolerance (deflection)":
          adjustments.push({
            parameter: "overhang_mm",
            current_value: params.overhang_mm,
            suggested_value: Math.round(params.overhang_mm * Math.pow(v.target / v.actual, 1 / 3) * 100) / 100,
            reason: `Deflection ${v.actual}mm exceeds ${v.target}mm limit`,
            improvement: "Use shorter tool or reduce overhang",
          });
          break;
        case "Cycle Time":
          adjustments.push({
            parameter: "stepover_mm",
            current_value: params.stepover_mm,
            suggested_value: Math.round(params.stepover_mm * (v.actual / v.target) * 100) / 100,
            reason: `Cycle time ${v.actual}min exceeds ${v.target}min limit`,
            improvement: "Increase stepover or use larger tool",
          });
          break;
        case "Cutting Force":
          adjustments.push({
            parameter: "feed_per_tooth_mm",
            current_value: params.feed_per_tooth_mm,
            suggested_value: Math.round(params.feed_per_tooth_mm * (v.target / v.actual) * 1000) / 1000,
            reason: `Force ${v.actual}N exceeds ${v.target}N limit`,
            improvement: "Reduce feed per tooth to lower cutting force",
          });
          break;
      }
    }
    return adjustments;
  }

  private generateTradeOffFrontier(
    params: MachiningParameters,
    constraints: MachiningConstraints,
    machine: MachineCapability
  ): ConstraintSatisfactionResult["trade_off_frontier"] {
    const scenarios = [
      { name: "Speed Priority", stepoverMult: 1.5, stepdownMult: 1.3, feedMult: 1.2 },
      { name: "Balanced", stepoverMult: 1.0, stepdownMult: 1.0, feedMult: 1.0 },
      { name: "Quality Priority", stepoverMult: 0.5, stepdownMult: 0.7, feedMult: 0.8 },
    ];

    return scenarios.map(s => {
      const so = params.stepover_mm * s.stepoverMult;
      const sd = params.stepdown_mm * s.stepdownMult;
      const fz = params.feed_per_tooth_mm * s.feedMult;
      const feed = params.spindle_rpm * fz * params.flute_count;
      const mrr = (sd * so * feed) / 1000;
      const ct = params.geometry_volume_cm3 / (mrr > 0 ? mrr : 0.001) * 1.15;
      const scallop = (so * so) / (8 * params.tool_diameter_mm / 2);
      const ra = scallop * 4 + 0.2;
      const hm = fz * Math.sqrt(so / params.tool_diameter_mm);
      const Fc = (KC11[params.material_iso_group] || 2100) * sd * hm * Math.pow(hm, -0.25);
      const power = (Fc * params.cutting_speed_m_min) / 60000;
      const ref = TAYLOR_REF[params.material_iso_group] || TAYLOR_REF.P;
      const tl = ref.T * Math.pow(ref.vc / params.cutting_speed_m_min, 1 / (TAYLOR_N[params.material_iso_group] || 0.25));
      const parts = Math.max(1, Math.floor(tl / ct));

      const feasible = power <= machine.max_spindle_power_kw &&
        (!constraints.max_cycle_time_min || ct <= constraints.max_cycle_time_min) &&
        (!constraints.max_surface_roughness_um || ra <= constraints.max_surface_roughness_um);

      return {
        scenario: s.name,
        cycle_time_min: Math.round(ct * 100) / 100,
        surface_finish_um: Math.round(ra * 100) / 100,
        tool_life_parts: parts,
        spindle_power_kw: Math.round(power * 100) / 100,
        feasible,
      };
    });
  }

  private analyzeConflicts(
    constraints: MachiningConstraints,
    params: MachiningParameters,
    machine: MachineCapability
  ): string[] {
    const conflicts: string[] = [];

    if (constraints.max_cycle_time_min && constraints.max_surface_roughness_um) {
      // Fast cycle time requires large stepover, which hurts surface finish
      const minStepoverForTime = params.stepover_mm * 1.5; // rough estimate
      const raAtMinStepover = (minStepoverForTime ** 2) / (8 * params.tool_diameter_mm / 2) * 4 + 0.2;
      if (raAtMinStepover > constraints.max_surface_roughness_um) {
        conflicts.push(
          `Cycle time ≤${constraints.max_cycle_time_min}min conflicts with Ra ≤${constraints.max_surface_roughness_um}μm — ` +
          `achieving speed requires stepover that produces Ra ${raAtMinStepover.toFixed(1)}μm`
        );
      }
    }

    if (constraints.min_tool_life_parts && constraints.max_cycle_time_min) {
      conflicts.push(
        "Tool life and cycle time may conflict — faster cutting reduces tool life. " +
        "Consider adaptive engagement control to maintain tool life at higher MRR."
      );
    }

    if (constraints.max_spindle_power_kw &&
        constraints.max_spindle_power_kw < machine.max_spindle_power_kw * 0.5) {
      conflicts.push(
        `Power limit ${constraints.max_spindle_power_kw}kW is well below machine capacity ` +
        `${machine.max_spindle_power_kw}kW — consider allowing higher utilization for faster cycles.`
      );
    }

    return conflicts;
  }
}

export const constraintSatisfactionEngine = new ConstraintSatisfactionEngine();
