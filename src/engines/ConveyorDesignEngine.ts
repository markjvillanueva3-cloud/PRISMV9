/**
 * ConveyorDesignEngine — Belt Conveyor Sizing Calculator
 *
 * Models: Belt conveyor capacity, power, tension, selection.
 * - Volumetric and mass throughput
 * - Belt width from capacity and speed
 * - Drive power: friction + lift + acceleration
 * - Belt tension (tight/slack side)
 * - Pulley diameter selection
 * - Take-up travel
 *
 * Key physics: Q = ρ × A × v (mass flow). P = (F_friction + F_lift) × v.
 * F_friction = f × L × g × (m_belt + m_load). F_lift = m_load × g × H.
 *
 * Reference: CEMA (Conveyor Equipment Manufacturers Assn) 7th Ed,
 *            DIN 22101 (belt conveyor design),
 *            ISO 5048
 *
 * Actions: conveyor_design_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ConveyorDesignInput {
  throughput_tph?: number;
  belt_speed_m_s?: number;
  conveyor_length_m?: number;
  lift_height_m?: number;
  material_density_kg_m3?: number;
  material_angle_of_repose_deg?: number;
  belt_width_mm?: number;
  trough_angle_deg?: number;
  friction_factor?: number;
  incline_angle_deg?: number;
  drive_efficiency?: number;
}

export interface ConveyorDesignResult {
  required_belt_width: AtomicValue;
  belt_speed: AtomicValue;
  drive_power: AtomicValue;
  friction_force: AtomicValue;
  gravity_force: AtomicValue;
  effective_tension: AtomicValue;
  tight_side_tension: AtomicValue;
  slack_side_tension: AtomicValue;
  min_pulley_diameter: AtomicValue;
  take_up_travel: AtomicValue;
  conveyor_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Standard belt widths (mm) */
const STD_WIDTHS = [400, 500, 650, 800, 1000, 1200, 1400, 1600, 1800, 2000];

/** Cross-section area factor by trough angle (fraction of width²) */
const TROUGH_FACTOR: Record<number, number> = {
  0: 0.06,   // flat
  20: 0.09,
  35: 0.12,
  45: 0.15,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ConveyorDesignEngine {
  calculate(input: ConveyorDesignInput): ConveyorDesignResult {
    const warnings: string[] = [];
    const Q = input.throughput_tph ?? 100; // tonnes per hour
    const v = input.belt_speed_m_s ?? 1.5;
    const L = input.conveyor_length_m ?? 50;
    const H = input.lift_height_m ?? 5;
    const rho = input.material_density_kg_m3 ?? 1500; // bulk density
    const troughDeg = input.trough_angle_deg ?? 35;
    const f = input.friction_factor ?? 0.02; // CEMA friction
    const eta = input.drive_efficiency ?? 0.90;

    // Required cross-section area: A = Q / (3.6 × v × ρ)
    // Q in t/h, v in m/s, ρ in t/m³
    const rhoT = rho / 1000; // kg/m³ → t/m³
    const aReq = Q / (3600 * v * rhoT); // m²

    // Belt width from cross-section
    const tFactor = closestTrough(troughDeg);
    const bReq = Math.sqrt(aReq / tFactor) * 1000; // m → mm
    let beltW: number;
    if (input.belt_width_mm) {
      beltW = input.belt_width_mm;
    } else {
      beltW = STD_WIDTHS.find(w => w >= bReq) ?? Math.ceil(bReq / 100) * 100;
    }

    // Mass per meter of material
    const aActual = tFactor * (beltW / 1000) ** 2; // m²
    const mMaterial = aActual * rho; // kg/m
    // Belt mass (approx 10-15 kg/m per meter of width)
    const mBelt = beltW / 1000 * 12; // kg/m

    // Friction force: F_f = f × L × g × (2×m_belt + m_material) × cos(incline)
    const incline = input.incline_angle_deg ?? Math.atan2(H, L) * 180 / Math.PI;
    const cosI = Math.cos(incline * Math.PI / 180);
    const Ff = f * L * 9.81 * (2 * mBelt + mMaterial) * cosI;

    // Gravity force: F_g = m_material × g × H (per second × L)
    // Power from lift: P_lift = Q/3.6 × g × H
    const Fg = (Q / 3.6) * 9.81 * H; // Watts equivalent force×speed

    // Effective tension at drive pulley
    const Te = Ff + Fg / Math.max(v, 0.1);

    // Drive power
    const power = Te * v / (eta * 1000); // kW

    // Belt tensions (assuming wrap = 210°, µ = 0.3)
    const emu = Math.exp(0.3 * 210 * Math.PI / 180);
    const T_slack = Te / (emu - 1);
    const T_tight = T_slack + Te;

    // Pulley diameter (based on belt tension class)
    const minPulley = T_tight < 5000 ? 315 :
      T_tight < 15000 ? 500 :
      T_tight < 30000 ? 630 : 800;

    // Take-up travel (1.5% of center-to-center + thermal)
    const takeUp = L * 0.015 * 1000 + 150; // mm

    // Feasibility
    const feasible = power > 0 && beltW >= bReq;

    // Warnings
    if (v > 4.0) {
      warnings.push(`Belt speed ${v} m/s > 4.0 — dust generation and tracking issues likely`);
    }
    if (v < 0.5) {
      warnings.push(`Belt speed ${v} m/s very low — consider vibratory or screw conveyor`);
    }
    if (incline > 18) {
      warnings.push(`Incline ${r1(incline)}° > 18° — material may slide back, use chevron belt`);
    }
    if (beltW < bReq) {
      warnings.push(`Belt width ${beltW}mm < required ${r0(bReq)}mm — increase width or speed`);
    }
    if (power > 200) {
      warnings.push(`Drive power ${r0(power)}kW — consider dual-drive or booster`);
    }
    if (L > 500) {
      warnings.push(`Length ${L}m — intermediate drives or high-tension belt needed`);
    }

    const src = "ConveyorDesignEngine (CEMA/DIN 22101)";

    return {
      required_belt_width: mkAv(r0(bReq), "mm", 20, `${Q}tph at ${v}m/s`),
      belt_speed: mkAv(r2(v), "m/s", 0.05, src),
      drive_power: mkAv(r1(power), "kW", power * 0.1,
        `(Ff+Fg)×v/η = ${r0(Te)}×${v}/${eta}`),
      friction_force: mkAv(r0(Ff), "N", Ff * 0.1, `f=${f}, L=${L}m`),
      gravity_force: mkAv(r0(Fg / v), "N", Fg / v * 0.05, `H=${H}m lift`),
      effective_tension: mkAv(r0(Te), "N", Te * 0.1, "Friction + gravity"),
      tight_side_tension: mkAv(r0(T_tight), "N", T_tight * 0.1, "Te + T_slack"),
      slack_side_tension: mkAv(r0(T_slack), "N", T_slack * 0.1, "Te/(e^µθ − 1)"),
      min_pulley_diameter: mkAv(minPulley, "mm", 0, `For ${r0(T_tight)}N tension`),
      take_up_travel: mkAv(r0(takeUp), "mm", 50, `1.5%×${L}m + 150mm`),
      conveyor_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function closestTrough(deg: number): number {
  const keys = [0, 20, 35, 45];
  let best = 0;
  for (const k of keys) {
    if (Math.abs(k - deg) < Math.abs(best - deg)) best = k;
  }
  return TROUGH_FACTOR[best] ?? 0.12;
}

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const conveyorDesignEngine = new ConveyorDesignEngine();
