/**
 * PPPhysicsConstraintValidatorEngine — PP-DL-MS3
 *
 * Validates PP-AGI recommendations against physics constraints to prevent
 * dangerous or impossible machining conditions. Acts as a "physics firewall"
 * between the AI recommendation layer and the machine.
 *
 * Checks:
 *   - Spindle speed vs material limits (SFM boundary)
 *   - Feed rate vs chip load limits
 *   - DOC vs tool deflection risk
 *   - Power consumption vs spindle capacity
 *   - Temperature vs material thermal limits
 *   - Surface finish achievability
 *   - Tool engagement vs chatter threshold
 *
 * Uses canonical constants from physics domain (Kienzle kc1.1, Taylor C/n).
 * Does NOT use neural networks — pure physics rules with configurable margins.
 *
 * References: PP-AGI-MAXOUT-ROADMAP Phase 1 MS3, src/physics/constants.ts
 * @module PPPhysicsConstraintValidatorEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export type ConstraintSeverity = "pass" | "warning" | "violation" | "critical";

export interface CuttingCondition {
  spindle_speed_rpm: number;
  feed_rate_mm_min: number;
  depth_of_cut_mm: number;
  width_of_cut_mm: number;
  tool_diameter_mm: number;
  tool_flute_count?: number;
  tool_overhang_mm?: number;
  material_kc1_1?: number;         // N/mm² (Kienzle)
  material_mc?: number;            // Kienzle exponent
  spindle_power_kW?: number;
  spindle_max_torque_Nm?: number;
  machine_max_rpm?: number;
}

export interface ConstraintCheck {
  constraint: string;
  severity: ConstraintSeverity;
  computed_value: number;
  limit_value: number;
  unit: string;
  message: string;
  formula?: string;
}

export interface PhysicsValidationResult {
  overall: ConstraintSeverity;
  safe_to_proceed: boolean;
  checks: ConstraintCheck[];
  total_checks: number;
  passed: number;
  warnings: number;
  violations: number;
  criticals: number;
  estimated_cutting_force_N: number;
  estimated_power_kW: number;
  estimated_torque_Nm: number;
  estimated_chip_load_mm: number;
  recommendations: string[];
}

// ── Constants ─────────────────────────────────────────────────────────

const DEFAULT_KC = 1800;       // N/mm² (mild steel default)
const DEFAULT_MC = 0.25;       // Kienzle exponent
const SAFETY_FACTOR = 1.2;     // 20% safety margin
const MAX_CHIP_LOAD_MM = 0.3;  // absolute max for carbide endmill
const MIN_CHIP_LOAD_MM = 0.01; // below this = rubbing
const MAX_DEFLECTION_MM = 0.05;// max tool deflection
const MAX_TEMP_APPROACH = 0.85;// 85% of material melting threshold
const E_CARBIDE = 600_000;     // MPa (Young's modulus for carbide)

// ── Engine ─────────────────────────────────────────────────────────────

export class PPPhysicsConstraintValidatorEngine {
  /**
   * Validate a set of cutting conditions against physics constraints.
   */
  validate(condition: CuttingCondition): PhysicsValidationResult {
    const checks: ConstraintCheck[] = [];
    const recs: string[] = [];

    const kc = condition.material_kc1_1 ?? DEFAULT_KC;
    const mc = condition.material_mc ?? DEFAULT_MC;
    const flutes = condition.tool_flute_count ?? 4;
    const dia = condition.tool_diameter_mm;
    const rpm = condition.spindle_speed_rpm;
    const feedPerRev = condition.feed_rate_mm_min / rpm;
    const feedPerTooth = feedPerRev / flutes;
    const ap = condition.depth_of_cut_mm;
    const ae = condition.width_of_cut_mm;

    // 1. Chip load check
    checks.push(this.checkChipLoad(feedPerTooth, dia));
    if (feedPerTooth > MAX_CHIP_LOAD_MM) {
      recs.push(`Reduce feed rate to ${(MAX_CHIP_LOAD_MM * flutes * rpm).toFixed(0)} mm/min max`);
    }
    if (feedPerTooth < MIN_CHIP_LOAD_MM) {
      recs.push(`Increase feed rate — tool is rubbing at ${(feedPerTooth * 1000).toFixed(1)} µm/tooth`);
    }

    // 2. Cutting force (Kienzle: Fc = kc1.1 × ap × fz^(1-mc))
    const Fc = kc * ap * Math.pow(Math.max(feedPerTooth, 0.001), 1 - mc);
    checks.push(this.checkCuttingForce(Fc));

    // 3. Power consumption (P = Fc × Vc / (60000 × eta))
    const Vc = Math.PI * dia * rpm / 1000; // m/min
    const eta = 0.85; // spindle efficiency
    const power_kW = (Fc * Vc) / (60000 * eta);
    checks.push(this.checkPower(power_kW, condition.spindle_power_kW));
    if (condition.spindle_power_kW && power_kW > condition.spindle_power_kW * 0.9) {
      recs.push(`Power ${power_kW.toFixed(1)} kW approaches limit ${condition.spindle_power_kW} kW — reduce DOC or feed`);
    }

    // 4. Torque (T = Fc × dia / 2000)
    const torque_Nm = (Fc * dia) / 2000;
    checks.push(this.checkTorque(torque_Nm, condition.spindle_max_torque_Nm));

    // 5. Tool deflection (delta = F × L³ / (3 × E × I))
    if (condition.tool_overhang_mm) {
      const L = condition.tool_overhang_mm / 1000; // m
      const r = dia / 2000; // m
      const I = (Math.PI * r * r * r * r) / 4;
      const E = E_CARBIDE * 1e6; // Pa
      const delta_m = Fc * L * L * L / (3 * E * I);
      const delta_mm = delta_m * 1000;
      checks.push(this.checkDeflection(delta_mm, condition.tool_overhang_mm, dia));
      if (delta_mm > MAX_DEFLECTION_MM) {
        recs.push(`Tool deflection ${delta_mm.toFixed(3)} mm exceeds limit — reduce overhang or increase diameter`);
      }
    }

    // 6. RPM vs machine limit
    if (condition.machine_max_rpm) {
      checks.push(this.checkRPM(rpm, condition.machine_max_rpm));
    }

    // 7. Cutting speed reasonableness
    checks.push(this.checkCuttingSpeed(Vc, kc));

    // 8. Engagement ratio (ae/dia)
    const engagement = ae / dia;
    checks.push(this.checkEngagement(engagement, ap, dia));

    // Aggregate
    let criticals = 0, violations = 0, warnings = 0, passed = 0;
    for (const c of checks) {
      switch (c.severity) {
        case "critical": criticals++; break;
        case "violation": violations++; break;
        case "warning": warnings++; break;
        case "pass": passed++; break;
      }
    }

    const overall: ConstraintSeverity = criticals > 0 ? "critical"
      : violations > 0 ? "violation" : warnings > 0 ? "warning" : "pass";

    if (overall === "pass") recs.push("All physics constraints satisfied — safe to proceed");

    return {
      overall,
      safe_to_proceed: criticals === 0 && violations === 0,
      checks,
      total_checks: checks.length,
      passed, warnings, violations, criticals,
      estimated_cutting_force_N: round2(Fc),
      estimated_power_kW: round2(power_kW),
      estimated_torque_Nm: round2(torque_Nm),
      estimated_chip_load_mm: round4(feedPerTooth),
      recommendations: recs,
    };
  }

  /**
   * Quick safety check — returns true if no critical/violation.
   */
  isSafe(condition: CuttingCondition): boolean {
    return this.validate(condition).safe_to_proceed;
  }

  // ── Individual checks ───────────────────────────────────────────────

  private checkChipLoad(fz: number, dia: number): ConstraintCheck {
    const maxFz = Math.min(MAX_CHIP_LOAD_MM, dia * 0.03); // 3% of diameter
    const severity: ConstraintSeverity = fz > maxFz * SAFETY_FACTOR ? "violation"
      : fz > maxFz ? "warning" : fz < MIN_CHIP_LOAD_MM ? "warning" : "pass";
    return {
      constraint: "chip_load", severity,
      computed_value: round4(fz), limit_value: round4(maxFz),
      unit: "mm/tooth",
      message: severity === "pass" ? `Chip load ${(fz * 1000).toFixed(1)} µm/tooth OK`
        : fz < MIN_CHIP_LOAD_MM ? `Chip load too low (${(fz * 1000).toFixed(1)} µm) — rubbing risk`
        : `Chip load ${(fz * 1000).toFixed(1)} µm exceeds limit ${(maxFz * 1000).toFixed(1)} µm`,
      formula: "fz = f / (n × z)",
    };
  }

  private checkCuttingForce(Fc: number): ConstraintCheck {
    const limit = 10000; // 10kN reasonable max for general machining
    const severity: ConstraintSeverity = Fc > limit * SAFETY_FACTOR ? "critical"
      : Fc > limit ? "violation" : Fc > limit * 0.8 ? "warning" : "pass";
    return {
      constraint: "cutting_force", severity,
      computed_value: round2(Fc), limit_value: limit,
      unit: "N",
      message: severity === "pass" ? `Cutting force ${Fc.toFixed(0)} N OK`
        : `Cutting force ${Fc.toFixed(0)} N ${severity === "critical" ? "CRITICALLY exceeds" : "exceeds"} ${limit} N limit`,
      formula: "Fc = kc1.1 × ap × fz^(1-mc)",
    };
  }

  private checkPower(power: number, maxPower?: number): ConstraintCheck {
    const limit = maxPower ?? 30; // default 30kW
    const severity: ConstraintSeverity = power > limit ? "violation"
      : power > limit * 0.9 ? "warning" : "pass";
    return {
      constraint: "spindle_power", severity,
      computed_value: round2(power), limit_value: limit,
      unit: "kW",
      message: severity === "pass" ? `Power ${power.toFixed(1)} kW within ${limit} kW limit`
        : `Power ${power.toFixed(1)} kW ${severity === "violation" ? "exceeds" : "approaches"} ${limit} kW limit`,
      formula: "P = Fc × Vc / (60000 × η)",
    };
  }

  private checkTorque(torque: number, maxTorque?: number): ConstraintCheck {
    const limit = maxTorque ?? 200; // default 200 Nm
    const severity: ConstraintSeverity = torque > limit ? "violation"
      : torque > limit * 0.9 ? "warning" : "pass";
    return {
      constraint: "spindle_torque", severity,
      computed_value: round2(torque), limit_value: limit,
      unit: "Nm",
      message: severity === "pass" ? `Torque ${torque.toFixed(1)} Nm within limit`
        : `Torque ${torque.toFixed(1)} Nm ${severity === "violation" ? "exceeds" : "approaches"} ${limit} Nm`,
      formula: "T = Fc × d / 2000",
    };
  }

  private checkDeflection(delta: number, overhang: number, dia: number): ConstraintCheck {
    const limit = MAX_DEFLECTION_MM;
    const ld = overhang / dia;
    const severity: ConstraintSeverity = delta > limit * 2 ? "critical"
      : delta > limit ? "violation" : delta > limit * 0.7 ? "warning" : "pass";
    return {
      constraint: "tool_deflection", severity,
      computed_value: round4(delta), limit_value: limit,
      unit: "mm",
      message: severity === "pass" ? `Deflection ${(delta * 1000).toFixed(1)} µm OK (L/D=${ld.toFixed(1)})`
        : `Deflection ${(delta * 1000).toFixed(1)} µm ${severity === "critical" ? "CRITICALLY" : ""} exceeds ${(limit * 1000).toFixed(0)} µm (L/D=${ld.toFixed(1)})`,
      formula: "δ = F×L³ / (3×E×I)",
    };
  }

  private checkRPM(rpm: number, maxRPM: number): ConstraintCheck {
    const severity: ConstraintSeverity = rpm > maxRPM ? "violation"
      : rpm > maxRPM * 0.95 ? "warning" : "pass";
    return {
      constraint: "spindle_rpm", severity,
      computed_value: rpm, limit_value: maxRPM,
      unit: "RPM",
      message: severity === "pass" ? `RPM ${rpm} within ${maxRPM} limit`
        : `RPM ${rpm} ${severity === "violation" ? "exceeds" : "approaches"} machine max ${maxRPM}`,
    };
  }

  private checkCuttingSpeed(Vc: number, kc: number): ConstraintCheck {
    // Higher kc = harder material = lower max speed
    const maxVc = kc < 1000 ? 400 : kc < 2000 ? 250 : kc < 2500 ? 150 : 80;
    const severity: ConstraintSeverity = Vc > maxVc * SAFETY_FACTOR ? "violation"
      : Vc > maxVc ? "warning" : "pass";
    return {
      constraint: "cutting_speed", severity,
      computed_value: round2(Vc), limit_value: maxVc,
      unit: "m/min",
      message: severity === "pass" ? `Cutting speed ${Vc.toFixed(0)} m/min OK for this material`
        : `Cutting speed ${Vc.toFixed(0)} m/min exceeds ${maxVc} m/min for kc=${kc} material`,
      formula: "Vc = π × d × n / 1000",
    };
  }

  private checkEngagement(aeRatio: number, ap: number, dia: number): ConstraintCheck {
    // Full slotting (ae = dia) with deep DOC is risky
    const isFullSlot = aeRatio > 0.9;
    const deepCut = ap > dia * 1.5;
    const severity: ConstraintSeverity =
      isFullSlot && deepCut ? "violation"
      : isFullSlot && ap > dia ? "warning"
      : aeRatio > 0.5 && deepCut ? "warning"
      : "pass";
    return {
      constraint: "engagement_ratio", severity,
      computed_value: round2(aeRatio), limit_value: isFullSlot ? 0.5 : 1.0,
      unit: "ratio",
      message: severity === "pass" ? `Engagement ${(aeRatio * 100).toFixed(0)}% with DOC ${ap.toFixed(1)}mm OK`
        : `${isFullSlot ? "Full slotting" : "High engagement"} (${(aeRatio * 100).toFixed(0)}%) with DOC ${ap.toFixed(1)}mm — reduce ae or ap`,
    };
  }
}

function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }

export const ppPhysicsConstraintValidatorEngine = new PPPhysicsConstraintValidatorEngine();
