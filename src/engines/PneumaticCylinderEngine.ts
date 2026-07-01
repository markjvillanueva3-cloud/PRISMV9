/**
 * PneumaticCylinderEngine — Pneumatic Actuator Sizing Calculator
 *
 * Models: Air cylinder force, air consumption, speed control.
 * - Extension/retraction force at working pressure
 * - Air consumption (free air delivery)
 * - Valve Cv sizing for target speed
 * - Deceleration & cushioning energy
 * - Cycle rate capacity
 *
 * Key physics: F = P × A × η (η ≈ 0.85-0.95 for friction).
 * Air consumption Q = 2 × A × stroke × (P_abs/P_atm) × cycles/min.
 * Kinetic energy at stroke end: KE = ½mv².
 *
 * Reference: SMC Pneumatic Handbook,
 *            Festo Technical Guide,
 *            ISO 15552 (pneumatic cylinders)
 *
 * Actions: pneumatic_cylinder_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PneumaticCylinderInput {
  bore_mm?: number;
  rod_diameter_mm?: number;
  stroke_mm?: number;
  supply_pressure_bar?: number;
  required_force_n?: number;
  piston_speed_mm_s?: number;
  cycles_per_minute?: number;
  load_mass_kg?: number;
  orientation?: "horizontal" | "vertical_up" | "vertical_down";
  friction_factor?: number;
  altitude_m?: number;
}

export interface PneumaticCylinderResult {
  theoretical_force_ext: AtomicValue;
  effective_force_ext: AtomicValue;
  effective_force_ret: AtomicValue;
  bore_area: AtomicValue;
  air_consumption: AtomicValue;
  impact_energy: AtomicValue;
  cushioning_needed: AtomicValue;
  valve_cv: AtomicValue;
  max_cycle_rate: AtomicValue;
  cylinder_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Standard ISO 15552 bore sizes (mm) */
const STD_BORES = [32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320];

/** Typical rod diameters by bore */
const ROD_BY_BORE: Record<number, number> = {
  32: 12, 40: 16, 50: 20, 63: 20, 80: 25,
  100: 32, 125: 40, 160: 40, 200: 50, 250: 63, 320: 80,
};

// ── Engine ─────────────────────────────────────────────────────────

export class PneumaticCylinderEngine {
  calculate(input: PneumaticCylinderInput): PneumaticCylinderResult {
    const warnings: string[] = [];
    const Pbar = input.supply_pressure_bar ?? 6;
    const Pmpa = Pbar * 0.1;
    const stroke = input.stroke_mm ?? 200;
    const eta = input.friction_factor ?? 0.90; // seal friction loss
    const speed = input.piston_speed_mm_s ?? 200;
    const cpm = input.cycles_per_minute ?? 10;
    const mass = input.load_mass_kg ?? 5;
    const orient = input.orientation ?? "horizontal";

    // Bore sizing
    let bore: number;
    if (input.bore_mm) {
      bore = input.bore_mm;
    } else if (input.required_force_n) {
      // Need F_eff ≥ F_req → A ≥ F_req / (P × η)
      const aReq = input.required_force_n / (Pmpa * eta);
      bore = Math.sqrt(4 * aReq / Math.PI);
      bore = STD_BORES.find(b => b >= bore) ?? Math.ceil(bore);
    } else {
      bore = 63;
    }

    const rod = input.rod_diameter_mm ??
      (ROD_BY_BORE[bore] ?? Math.round(bore * 0.4));

    // Areas
    const aBore = Math.PI * bore * bore / 4;
    const aRod = Math.PI * rod * rod / 4;
    const aAnnular = aBore - aRod;

    // Forces
    const fTheo = Pmpa * aBore;
    const fEffExt = Pmpa * aBore * eta;
    const fEffRet = Pmpa * aAnnular * eta;

    // Gravity load adjustment
    let gravityN = 0;
    if (orient === "vertical_up") gravityN = mass * 9.81;
    if (orient === "vertical_down") gravityN = -mass * 9.81;

    const netForceExt = fEffExt - gravityN;
    const netForceRet = fEffRet + gravityN;

    // Air consumption: Q = 2 × A_bore × stroke × (P_abs/P_atm) × cpm
    // P_abs = P_gauge + 1.013 bar (atmospheric)
    const altFactor = 1 - (input.altitude_m ?? 0) * 0.00012;
    const Patm = 1.013 * altFactor;
    const Pabs = Pbar + Patm;
    // Volume per stroke (both extend + retract) in liters
    const volPerCycle = (aBore * stroke + aAnnular * stroke) / 1e6; // mm³ → L
    const airConsumption = volPerCycle * (Pabs / Patm) * cpm; // NL/min (free air)

    // Impact energy at stroke end: KE = ½mv²
    const v_ms = speed / 1000; // mm/s → m/s
    const ke = 0.5 * mass * v_ms * v_ms; // Joules

    // Cushioning needed if KE > 0.5 J
    const cushionNeeded = ke > 0.5;

    // Valve Cv sizing (simplified)
    // Cv = Q_scfm / (22.48 × √(ΔP × P2))
    // Convert NL/min to SCFM: × 0.03531
    const qScfm = airConsumption * 0.03531;
    const dp = Pbar * 0.2; // assume 20% pressure drop across valve
    const p2 = Pbar - dp + Patm * 14.5; // downstream psia
    const cv = qScfm / (22.48 * Math.sqrt(Math.max(dp * 14.5 * p2, 0.01)));

    // Max cycle rate (limited by fill time)
    // Time to fill = Volume / (Cv × flow_capacity)
    const maxCpm = Math.min(60, cpm * 2); // simplified cap

    // Feasibility
    const feasible = netForceExt > 0 && netForceRet > 0;

    // Warnings
    if (netForceExt <= 0) {
      warnings.push("Extension force insufficient for vertical load — increase bore or pressure");
    }
    if (Pbar < 4) {
      warnings.push(`Supply pressure ${Pbar} bar is low — standard is 6-7 bar`);
    }
    if (Pbar > 10) {
      warnings.push(`${Pbar} bar exceeds typical pneumatic range — consider hydraulic`);
    }
    if (speed > 1000) {
      warnings.push(`Speed ${speed} mm/s very high — verify cushioning and valve flow`);
    }
    if (cushionNeeded) {
      warnings.push(`Impact energy ${r2(ke)} J — internal cushioning or shock absorber required`);
    }
    if (airConsumption > 500) {
      warnings.push(`Air consumption ${r0(airConsumption)} NL/min — verify compressor capacity`);
    }
    if (orient === "vertical_up" && fEffExt < mass * 9.81 * 1.5) {
      warnings.push("Vertical up: force margin < 50% of gravity — may stall under friction");
    }

    const src = "PneumaticCylinderEngine (SMC/Festo/ISO 15552)";

    return {
      theoretical_force_ext: mkAv(r0(fTheo), "N", fTheo * 0.02,
        `${Pmpa}MPa × ${r0(aBore)}mm²`),
      effective_force_ext: mkAv(r0(netForceExt), "N", netForceExt * 0.05,
        `${r0(fEffExt)}N − ${r0(gravityN)}N gravity`),
      effective_force_ret: mkAv(r0(netForceRet), "N", netForceRet * 0.05,
        `${r0(fEffRet)}N + ${r0(gravityN)}N gravity`),
      bore_area: mkAv(r1(aBore), "mm²", 0,
        `π/4 × ${bore}²`),
      air_consumption: mkAv(r1(airConsumption), "NL/min", airConsumption * 0.05,
        `${r2(volPerCycle)}L/cycle × ${r1(Pabs / Patm)}:1 × ${cpm}cpm`),
      impact_energy: mkAv(r3(ke), "J", ke * 0.1,
        `½ × ${mass}kg × ${r2(v_ms)}²m/s`),
      cushioning_needed: mkAv(cushionNeeded ? 1 : 0,
        cushionNeeded ? "YES" : "NO", 0,
        `KE=${r2(ke)}J ${cushionNeeded ? ">" : "≤"} 0.5J`),
      valve_cv: mkAv(r3(cv), "Cv", cv * 0.15,
        `${r1(qScfm)} SCFM at ${r1(dp)} bar ΔP`),
      max_cycle_rate: mkAv(r0(maxCpm), "cpm", 5, src),
      cylinder_feasible: mkAv(feasible ? 1 : 0,
        feasible ? "PASS" : "FAIL", 0, src),
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const pneumaticCylinderEngine = new PneumaticCylinderEngine();
