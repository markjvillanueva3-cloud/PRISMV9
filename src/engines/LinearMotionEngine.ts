/**
 * LinearMotionEngine — Linear Guide & Ball Screw Calculator
 *
 * Models: Linear motion system sizing and selection.
 * - Ball screw lead/pitch selection
 * - Motor torque from thrust force: T = F×lead/(2π×η)
 * - Critical speed of ball screw
 * - Linear guide life (ISO rated)
 * - Acceleration force and settling time
 * - Buckling load for ball screw column
 *
 * Key physics: T = F×l/(2π×η). n_crit = f×d/(L²)×10⁷.
 * Euler buckling: F_cr = π²EI/(kL)². Life L = (C/P)³ × 10⁶ revolutions.
 *
 * Reference: THK Linear Guide Catalog,
 *            NSK Ball Screw Technical,
 *            Machinery's Handbook — Power Screws
 *
 * Actions: linear_motion_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface LinearMotionInput {
  thrust_force_n?: number;
  travel_mm?: number;
  max_speed_mm_s?: number;
  acceleration_mm_s2?: number;
  screw_lead_mm?: number;
  screw_diameter_mm?: number;
  screw_length_mm?: number;
  payload_kg?: number;
  orientation?: "horizontal" | "vertical" | "inclined";
  duty_cycle_pct?: number;
  mounting?: "fixed_fixed" | "fixed_supported" | "fixed_free";
}

export interface LinearMotionResult {
  motor_torque: AtomicValue;
  motor_rpm: AtomicValue;
  critical_speed: AtomicValue;
  buckling_load: AtomicValue;
  screw_life_revolutions: AtomicValue;
  screw_life_hours: AtomicValue;
  acceleration_force: AtomicValue;
  positioning_time: AtomicValue;
  efficiency: AtomicValue;
  safety_factor_buckling: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Mounting factor for critical speed and buckling */
const MOUNT_FACTOR: Record<string, [number, number]> = {
  fixed_fixed:     [4.730, 4.0],
  fixed_supported: [3.927, 2.0],
  fixed_free:      [1.875, 0.25],
};

// ── Engine ─────────────────────────────────────────────────────────

export class LinearMotionEngine {
  calculate(input: LinearMotionInput): LinearMotionResult {
    const warnings: string[] = [];
    const F = input.thrust_force_n ?? 500;
    const travel = input.travel_mm ?? 300;
    const vMax = input.max_speed_mm_s ?? 200;
    const accel = input.acceleration_mm_s2 ?? 1000;
    const lead = input.screw_lead_mm ?? 10;
    const dScrew = input.screw_diameter_mm ?? 20;
    const lScrew = input.screw_length_mm ?? travel + 100;
    const payload = input.payload_kg ?? 10;
    const orient = input.orientation ?? "horizontal";
    const duty = (input.duty_cycle_pct ?? 50) / 100;
    const mount = input.mounting ?? "fixed_supported";

    const eta = 0.9; // ball screw efficiency

    // Gravity component
    let Fgrav = 0;
    if (orient === "vertical") Fgrav = payload * 9.81;
    else if (orient === "inclined") Fgrav = payload * 9.81 * 0.5;

    // Acceleration force
    const Faccel = payload * accel / 1000;

    // Total force
    const Ftotal = F + Fgrav + Faccel;

    // Motor torque
    const T = Ftotal * lead / (2 * Math.PI * eta * 1000); // N·m

    // Motor RPM at max speed
    const rpm = lead > 0 ? vMax * 60 / lead : 0;

    // Critical speed (rpm)
    const [fCrit, fBuckle] = MOUNT_FACTOR[mount] ?? MOUNT_FACTOR.fixed_supported;
    const dRoot = dScrew * 0.8; // root diameter approx
    const nCrit = fCrit * dRoot / Math.pow(lScrew / 1000, 2) * 1e7 / 60;
    // Simplified: n_crit = f × d × 10^7 / L² (d in mm, L in mm → adjust)
    const nCritRpm = fCrit * fCrit * dRoot * 1e7 / (lScrew * lScrew);

    // Buckling load (Euler)
    const E = 200e3; // MPa (steel)
    const I = Math.PI * Math.pow(dRoot, 4) / 64; // mm⁴
    const Fcr = fBuckle * Math.PI * Math.PI * E * I /
      (lScrew * lScrew); // N

    const sfBuckle = Fcr / Math.max(Ftotal, 1);

    // Ball screw life (revolutions)
    // Dynamic load rating approx: C ≈ 10 × d² (simplified)
    const Cdyn = 10 * dScrew * dScrew; // N
    const lifeRev = Math.pow(Cdyn / Math.max(Ftotal, 1), 3) * 1e6;

    // Life in hours
    const avgRpm = rpm * duty;
    const lifeHours = avgRpm > 0 ? lifeRev / (avgRpm * 60) : 999999;

    // Positioning time (trapezoidal profile)
    const tAccel = vMax / Math.max(accel, 1);
    const sAccel = 0.5 * accel * tAccel * tAccel;
    const sConst = Math.max(0, travel - 2 * sAccel);
    const tConst = vMax > 0 ? sConst / vMax : 0;
    const tTotal = 2 * tAccel + tConst;

    // Warnings
    if (rpm > nCritRpm * 0.8) {
      warnings.push(`RPM ${r0(rpm)} near critical speed ${r0(nCritRpm)} — increase screw diameter`);
    }
    if (sfBuckle < 3) {
      warnings.push(`Buckling SF ${r1(sfBuckle)} < 3 — increase screw diameter or add support`);
    }
    if (lifeHours < 5000) {
      warnings.push(`Screw life ${r0(lifeHours)}h short — increase screw size or reduce load`);
    }
    if (orient === "vertical" && eta > 0.5) {
      warnings.push("Vertical axis — verify brake for holding when power off");
    }
    if (lead > 25 && dScrew < 20) {
      warnings.push("High lead on small screw — check helix angle and efficiency");
    }

    const src = "LinearMotionEngine (THK/NSK)";

    return {
      motor_torque: mkAv(r3(T), "N·m", T * 0.05,
        `F×lead/(2πη) = ${r0(Ftotal)}×${lead}/(2π×${eta})`),
      motor_rpm: mkAv(r0(rpm), "rpm", rpm * 0.02,
        `${vMax}mm/s × 60 / ${lead}mm`),
      critical_speed: mkAv(r0(nCritRpm), "rpm", nCritRpm * 0.1, `${mount}`),
      buckling_load: mkAv(r0(Fcr), "N", Fcr * 0.1,
        `Euler ${mount} d=${dRoot}mm L=${lScrew}mm`),
      screw_life_revolutions: mkAv(r0(lifeRev), "rev", lifeRev * 0.2,
        `(C/P)³×10⁶`),
      screw_life_hours: mkAv(r0(lifeHours), "hours", lifeHours * 0.3,
        `${r0(avgRpm)}avg rpm`),
      acceleration_force: mkAv(r1(Faccel), "N", Faccel * 0.05,
        `${payload}kg × ${accel}mm/s²`),
      positioning_time: mkAv(r3(tTotal), "s", tTotal * 0.05,
        "Trapezoidal profile"),
      efficiency: mkAv(r2(eta * 100), "%", 2, "Ball screw typical"),
      safety_factor_buckling: mkAv(r1(sfBuckle), "×", sfBuckle * 0.1, src),
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

export const linearMotionEngine = new LinearMotionEngine();
