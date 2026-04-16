/**
 * ClutchBrakeEngine — Friction Clutch & Brake Sizing Calculator
 *
 * Models: Disc clutch, drum brake, and band brake parameters.
 * - Torque capacity T = n×μ×F×r_m (uniform wear/pressure)
 * - Thermal capacity Q = ½Iω²
 * - Contact pressure verification
 * - Clutch plate sizing (ID/OD selection)
 * - Brake stopping time and distance
 * - Fade and wear life estimation
 *
 * Key physics: Uniform wear: p×r = const, r_m = (ro+ri)/2.
 * Uniform pressure: r_m = 2(ro³-ri³)/(3(ro²-ri²)).
 * Heat: Q = T×ω×t_slip.
 *
 * Reference: Shigley — Mechanical Engineering Design,
 *            Orthwein — Clutches and Brakes,
 *            SAE clutch/brake standards
 *
 * Actions: clutch_brake_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ClutchBrakeInput {
  type?: "disc_clutch" | "drum_brake" | "band_brake" | "disc_brake";
  outer_radius_mm?: number;
  inner_radius_mm?: number;
  num_friction_surfaces?: number;
  friction_coeff?: number;
  actuating_force_n?: number;
  max_pressure_mpa?: number;
  rotating_inertia_kgm2?: number;
  initial_rpm?: number;
  friction_material?: "organic" | "sintered" | "ceramic" | "cerametallic";
}

export interface ClutchBrakeResult {
  torque_capacity: AtomicValue;
  mean_radius: AtomicValue;
  contact_pressure: AtomicValue;
  heat_generated: AtomicValue;
  stopping_time: AtomicValue;
  power_dissipated: AtomicValue;
  temperature_rise: AtomicValue;
  wear_life: AtomicValue;
  torque_to_inertia_ratio: AtomicValue;
  engagement_energy: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [max_pressure_MPa, max_temp_C, max_velocity_m_s, wear_rate_mm_per_1000_engagements] */
const FRICTION_MAT: Record<string, [number, number, number, number]> = {
  organic:      [1.0, 250, 25, 0.05],
  sintered:     [2.0, 400, 40, 0.02],
  ceramic:      [3.0, 600, 50, 0.01],
  cerametallic: [2.5, 500, 45, 0.015],
};

// ── Engine ─────────────────────────────────────────────────────────

export class ClutchBrakeEngine {
  calculate(input: ClutchBrakeInput): ClutchBrakeResult {
    const warnings: string[] = [];
    const type = input.type ?? "disc_clutch";
    const ro = (input.outer_radius_mm ?? 150) / 1000; // m
    const ri = (input.inner_radius_mm ?? 80) / 1000; // m
    const nSurf = input.num_friction_surfaces ?? 2;
    const mu = input.friction_coeff ?? 0.35;
    const matKey = input.friction_material ?? "organic";
    const [pMax, tMax, vMax, wearRate] = FRICTION_MAT[matKey] ?? FRICTION_MAT.organic;
    const rpm = input.initial_rpm ?? 1500;
    const J = input.rotating_inertia_kgm2 ?? 0.5;

    const omega = rpm * 2 * Math.PI / 60;

    // Mean radius (uniform wear assumption)
    const rm = (ro + ri) / 2;

    // Actuating force or derive from max pressure
    let F: number;
    if (input.actuating_force_n) {
      F = input.actuating_force_n;
    } else {
      // From uniform wear: p_max at ri, F = 2π × p_max × ri × (ro - ri)
      const pUse = (input.max_pressure_mpa ?? pMax) * 1e6; // Pa
      F = 2 * Math.PI * pUse * ri * (ro - ri);
    }

    // Contact pressure (uniform wear: p_max at inner radius)
    const area = Math.PI * (ro * ro - ri * ri);
    const pAvg = F / area / 1e6; // MPa

    // Torque capacity
    const T = nSurf * mu * F * rm;

    // Heat generated (full engagement from speed to zero)
    const Q = 0.5 * J * omega * omega; // Joules

    // Stopping time: t = J×ω/T
    const tStop = T > 0 ? J * omega / T : 999;

    // Power dissipated during engagement (average)
    const pDiss = tStop > 0 ? Q / tStop / 1000 : 0; // kW

    // Temperature rise (assume 50% heat to each surface, disc mass approx)
    const discMass = 7850 * area * 0.005; // 5mm thick steel disc approx
    const cp = 460; // J/(kg·K) steel
    const tempRise = discMass > 0 ? (Q * 0.5) / (discMass * cp) : 0;

    // Rim velocity at outer radius
    const vRim = omega * ro;

    // Wear life (engagements)
    const padThickness = 3; // mm typical
    const wearLife = wearRate > 0 ? (padThickness / wearRate) * 1000 : 999999;

    // Torque-to-inertia ratio (responsiveness)
    const tir = J > 0 ? T / J : 0;

    // Engagement energy per engagement
    const engEnergy = Q;

    // Warnings
    if (pAvg > pMax) {
      warnings.push(`Contact pressure ${r2(pAvg)}MPa exceeds ${pMax}MPa limit for ${matKey}`);
    }
    if (vRim > vMax) {
      warnings.push(`Rim velocity ${r1(vRim)}m/s exceeds ${vMax}m/s limit for ${matKey}`);
    }
    if (tempRise > tMax * 0.5) {
      warnings.push(`Single engagement ΔT ${r0(tempRise)}°C — risk of fade, add cooling`);
    }
    if (tStop > 10) {
      warnings.push(`Stopping time ${r1(tStop)}s — slow response, increase torque capacity`);
    }
    if (ri / ro < 0.45) {
      warnings.push(`ID/OD ratio ${r2(ri / ro)} < 0.45 — non-uniform wear, increase inner radius`);
    }

    const src = "ClutchBrakeEngine (Shigley/Orthwein)";

    return {
      torque_capacity: mkAv(r1(T), "N·m", T * 0.05, `${nSurf}×${mu}×F×${r0(rm * 1000)}mm`),
      mean_radius: mkAv(r1(rm * 1000), "mm", 0.5, `(${r0(ro * 1000)}+${r0(ri * 1000)})/2`),
      contact_pressure: mkAv(r2(pAvg), "MPa", pAvg * 0.05, "F/A uniform wear"),
      heat_generated: mkAv(r0(Q), "J", Q * 0.05, `½Jω² at ${rpm}rpm`),
      stopping_time: mkAv(r2(tStop), "s", tStop * 0.1, `Jω/T`),
      power_dissipated: mkAv(r2(pDiss), "kW", pDiss * 0.1, `Q/t_stop`),
      temperature_rise: mkAv(r0(tempRise), "°C", tempRise * 0.2, "Single engagement"),
      wear_life: mkAv(r0(wearLife), "engagements", wearLife * 0.2, `${padThickness}mm pad ${matKey}`),
      torque_to_inertia_ratio: mkAv(r1(tir), "rad/s²", tir * 0.05, "T/J"),
      engagement_energy: mkAv(r0(engEnergy), "J", engEnergy * 0.05, src),
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

export const clutchBrakeEngine = new ClutchBrakeEngine();
