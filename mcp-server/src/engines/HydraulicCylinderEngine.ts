/**
 * HydraulicCylinderEngine — Linear Hydraulic Actuator Calculator
 *
 * Models: Cylinder sizing, force, speed, flow, pressure requirements.
 * - Extension/retraction force from bore, rod, pressure
 * - Flow rate for desired speed
 * - Buckling check (Euler column) for long stroke
 * - Cushioning requirements
 * - Cycle time estimation
 *
 * Key physics: F_ext = P × A_bore, F_ret = P × (A_bore - A_rod).
 * Q = A × v (flow = area × velocity). Euler buckling for rod.
 *
 * Reference: Parker Hannifin Hydraulic Cylinder Catalog,
 *            ISO 3320/3322 (hydraulic cylinder dimensions),
 *            Fluid Power Design Handbook (Esposito)
 *
 * Actions: hydraulic_cylinder_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface HydraulicCylinderInput {
  bore_mm?: number;
  rod_diameter_mm?: number;
  stroke_mm?: number;
  system_pressure_bar?: number;
  required_force_n?: number;
  desired_speed_mm_s?: number;
  mounting_type?: "fixed_fixed" | "fixed_pivot" | "pivot_pivot" | "fixed_free";
  rod_material_yield_mpa?: number;
  rod_elastic_modulus_gpa?: number;
  cushioning_required?: boolean;
  duty_cycle_pct?: number;
}

export interface HydraulicCylinderResult {
  extension_force: AtomicValue;
  retraction_force: AtomicValue;
  bore_area: AtomicValue;
  annular_area: AtomicValue;
  flow_extend: AtomicValue;
  flow_retract: AtomicValue;
  rod_buckling_force: AtomicValue;
  buckling_safety_factor: AtomicValue;
  cycle_time: AtomicValue;
  required_pump_lpm: AtomicValue;
  cylinder_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Euler effective length factor by mounting */
const EULER_K: Record<string, number> = {
  fixed_fixed: 0.5,
  fixed_pivot: 0.707,
  pivot_pivot: 1.0,
  fixed_free: 2.0,
};

/** Standard bore sizes (mm) — ISO 3320 */
const STD_BORES = [25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320];

// ── Engine ─────────────────────────────────────────────────────────

export class HydraulicCylinderEngine {
  calculate(input: HydraulicCylinderInput): HydraulicCylinderResult {
    const warnings: string[] = [];
    const P_bar = input.system_pressure_bar ?? 200;
    const P_mpa = P_bar * 0.1;
    const stroke = input.stroke_mm ?? 300;
    const speed = input.desired_speed_mm_s ?? 100;
    const mounting = input.mounting_type ?? "fixed_pivot";
    const rodYield = input.rod_material_yield_mpa ?? 550;
    const E = (input.rod_elastic_modulus_gpa ?? 210) * 1000; // GPa → MPa

    // Bore sizing
    let bore: number;
    if (input.bore_mm) {
      bore = input.bore_mm;
    } else if (input.required_force_n) {
      // A = F / P → bore = √(4A/π)
      const aReq = input.required_force_n / P_mpa;
      bore = Math.sqrt(4 * aReq / Math.PI);
      // Round up to nearest standard
      bore = STD_BORES.find(b => b >= bore) ?? bore;
    } else {
      bore = 63;
    }

    // Rod diameter (default ~0.5-0.7 × bore)
    const rod = input.rod_diameter_mm ?? Math.round(bore * 0.56);

    // Areas
    const aBore = Math.PI * bore * bore / 4;
    const aRod = Math.PI * rod * rod / 4;
    const aAnnular = aBore - aRod;

    // Forces
    const fExt = P_mpa * aBore; // N
    const fRet = P_mpa * aAnnular;

    // Flow rates (mm³/s → L/min)
    const qExt = aBore * speed / 1e6 * 60; // L/min
    const qRet = aAnnular * speed / 1e6 * 60;

    // Rod buckling (Euler)
    const k = EULER_K[mounting] ?? 1.0;
    const Le = k * stroke; // effective length
    const I_rod = Math.PI * rod ** 4 / 64; // mm⁴
    const fBuckle = Math.PI ** 2 * E * I_rod / (Le * Le); // N
    const sfBuckle = fBuckle / Math.max(fExt, 1);

    // Cycle time (extend + retract)
    const tExt = stroke / speed;
    const tRet = stroke / (speed * aBore / aAnnular); // faster retract
    const cycleTime = tExt + tRet;

    // Required pump flow (for extension speed)
    const pumpLpm = qExt;

    // Feasibility
    const feasible = sfBuckle >= 3.0 && fExt > 0;

    // Warnings
    if (sfBuckle < 3.0) {
      warnings.push(
        `Buckling SF=${r1(sfBuckle)} < 3.0 — increase rod diameter or ` +
        "use guided mounting"
      );
    }
    if (sfBuckle < 1.5) {
      warnings.push("CRITICAL: Rod will buckle under extension force");
    }
    if (stroke / rod > 10) {
      warnings.push(
        `Stroke/rod ratio ${r1(stroke / rod)} > 10 — ` +
        "consider stop tube or larger rod"
      );
    }
    if (P_bar > 350) {
      warnings.push(`System pressure ${P_bar} bar exceeds typical 350 bar limit`);
    }
    if (speed > 500) {
      warnings.push(
        `Speed ${speed} mm/s is high — verify seal ratings and cushioning`
      );
    }
    if (input.cushioning_required && speed > 150) {
      warnings.push("Internal cushioning recommended at this speed");
    }
    if (rod / bore > 0.7) {
      warnings.push("Rod/bore ratio > 0.7 — very low annular area, slow retraction");
    }

    const src = "HydraulicCylinderEngine (ISO 3320/Parker)";

    return {
      extension_force: mkAv(r0(fExt), "N", fExt * 0.03, `${P_mpa}MPa × ${r0(aBore)}mm²`),
      retraction_force: mkAv(r0(fRet), "N", fRet * 0.03, `${P_mpa}MPa × ${r0(aAnnular)}mm²`),
      bore_area: mkAv(r1(aBore), "mm²", 1, `π/4 × ${bore}²`),
      annular_area: mkAv(r1(aAnnular), "mm²", 1, `bore - rod area`),
      flow_extend: mkAv(r2(qExt), "L/min", 0.1, `${r0(aBore)}mm² × ${speed}mm/s`),
      flow_retract: mkAv(r2(qRet), "L/min", 0.1, `${r0(aAnnular)}mm² × ${speed}mm/s`),
      rod_buckling_force: mkAv(r0(fBuckle), "N", fBuckle * 0.1,
        `Euler k=${k}, Le=${r0(Le)}mm`),
      buckling_safety_factor: mkAv(r1(sfBuckle), "×", 0.2, `${r0(fBuckle)}/${r0(fExt)}`),
      cycle_time: mkAv(r2(cycleTime), "s", 0.1, `ext ${r1(tExt)}s + ret ${r1(tRet)}s`),
      required_pump_lpm: mkAv(r2(pumpLpm), "L/min", 0.2, src),
      cylinder_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const hydraulicCylinderEngine = new HydraulicCylinderEngine();
