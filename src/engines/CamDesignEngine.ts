/**
 * CamDesignEngine — Cam Profile & Follower Analysis Calculator
 *
 * Models: Disc cam with translating follower.
 * - Rise/dwell/return motion programs
 * - Cycloidal and modified trapezoid motion laws
 * - Contact stress at cam-follower interface
 * - Pressure angle and radius of curvature
 * - Required spring force for follower return
 * - Maximum acceleration and jerk
 *
 * Key physics: y = h×[θ/β - sin(2πθ/β)/(2π)] (cycloidal).
 * v_max = 2h×ω/β. a_max = 2π×h×ω²/β².
 * Pressure angle: tan(φ) = dy/dθ / (Rb + y).
 *
 * Reference: Norton — Cam Design and Manufacturing Handbook,
 *            Rothbart — Cams,
 *            AGMA 2001 — Contact Stress
 *
 * Actions: cam_design_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CamDesignInput {
  base_radius_mm?: number;
  roller_radius_mm?: number;
  lift_mm?: number;
  rise_angle_deg?: number;
  cam_speed_rpm?: number;
  motion_law?: "cycloidal" | "harmonic" | "constant_accel";
  follower_mass_kg?: number;
  spring_rate_n_mm?: number;
  spring_preload_n?: number;
}

export interface CamDesignResult {
  max_velocity: AtomicValue;
  max_acceleration: AtomicValue;
  max_jerk: AtomicValue;
  max_pressure_angle: AtomicValue;
  min_radius_curvature: AtomicValue;
  max_contact_stress: AtomicValue;
  max_inertia_force: AtomicValue;
  required_spring_force: AtomicValue;
  cam_shaft_torque: AtomicValue;
  follower_jump_speed: AtomicValue;
  warnings: string[];
}

// ── Motion Law Coefficients ──────────────────────────────────────

/** [Cv, Ca, Cj] — velocity, accel, jerk coefficients */
const MOTION_COEFF: Record<string, [number, number, number]> = {
  cycloidal:       [2.0, 6.283, 39.48],
  harmonic:        [1.571, 4.935, 15.50],
  constant_accel:  [2.0, 4.0, Infinity],
};

// ── Engine ─────────────────────────────────────────────────────────

export class CamDesignEngine {
  calculate(input: CamDesignInput): CamDesignResult {
    const warnings: string[] = [];
    const Rb = input.base_radius_mm ?? 40;
    const Rr = input.roller_radius_mm ?? 10;
    const h = input.lift_mm ?? 20;
    const betaDeg = input.rise_angle_deg ?? 120;
    const rpm = input.cam_speed_rpm ?? 600;
    const law = input.motion_law ?? "cycloidal";
    const mf = input.follower_mass_kg ?? 0.5;
    const ks = input.spring_rate_n_mm ?? 10;
    const F0 = input.spring_preload_n ?? 50;

    const beta = betaDeg * Math.PI / 180; // rad
    const omega = rpm * 2 * Math.PI / 60; // rad/s

    const [Cv, Ca, Cj] = MOTION_COEFF[law] ?? MOTION_COEFF.cycloidal;

    // Max velocity (mm/s)
    const vMax = Cv * h * omega / beta;

    // Max acceleration (mm/s²)
    const aMax = Ca * h * omega * omega / (beta * beta);

    // Max jerk (mm/s³)
    const jMax = Cj * h * Math.pow(omega, 3) / Math.pow(beta, 3);

    // Max inertia force
    const Finertia = mf * aMax / 1000; // N (aMax in mm/s²)

    // Max pressure angle (at max velocity point)
    // tan(φ) ≈ v_max/(ω×(Rb + h/2))
    const tanPhi = vMax / (omega * (Rb + h / 2));
    const phiMax = Math.atan(tanPhi) * 180 / Math.PI;

    // Min radius of curvature (pitch curve)
    // ρ_min ≈ Rb + h - (v_max/ω)²/(Rb + h)
    const rhoMin = (Rb + h)
      - Math.pow(vMax / omega, 2) / (Rb + h);

    // Contact stress (Hertz, steel on steel)
    const E = 200000; // MPa
    const Fmax = Finertia + F0 + ks * h;
    const bContact = Rr > 0
      ? Math.sqrt(4 * Fmax * Rr / (Math.PI * E * 10)) // mm contact half-width
      : 0.1;
    const sigContact = 2 * Fmax / (Math.PI * bContact * 10); // MPa approx

    // Required spring force at max lift
    const Fspring = F0 + ks * h;

    // Cam shaft torque (peak)
    const Tshaft = Fmax * vMax / (omega * 1000); // N·m

    // Follower jump speed (speed above which follower separates)
    // Jump when spring force < inertia → ks×y + F0 < m×a
    // At max accel: jump rpm where m×Ca×h×ω²/β² = F0 + ks×h
    const omegaJump = Math.sqrt(
      (F0 + ks * h) * 1000 / (mf * Ca * h / (beta * beta))
    );
    const rpmJump = omegaJump * 60 / (2 * Math.PI);

    // Warnings
    if (phiMax > 30) {
      warnings.push(
        `Pressure angle ${r1(phiMax)}° > 30° — increase base radius`
      );
    }
    if (rhoMin < Rr) {
      warnings.push(
        `Curvature radius ${r1(rhoMin)}mm < roller ${Rr}mm — undercutting`
      );
    }
    if (rpm > rpmJump * 0.9) {
      warnings.push(
        `Speed ${rpm} RPM near jump speed ${r0(rpmJump)} — increase spring`
      );
    }
    if (sigContact > 1500) {
      warnings.push(
        `Contact stress ${r0(sigContact)} MPa > 1500 — surface fatigue risk`
      );
    }
    if (law === "constant_accel") {
      warnings.push("Constant accel has infinite jerk — use cycloidal");
    }
    if (phiMax > 45) {
      warnings.push("Pressure angle > 45° — follower may jam");
    }

    const src = "CamDesignEngine (Norton/Rothbart)";

    return {
      max_velocity: mkAv(r1(vMax), "mm/s", vMax * 0.05,
        `Cv×h×ω/β`),
      max_acceleration: mkAv(r0(aMax), "mm/s²", aMax * 0.05,
        `Ca×h×ω²/β²`),
      max_jerk: mkAv(r0(jMax), "mm/s³", jMax * 0.1,
        `Cj×h×ω³/β³`),
      max_pressure_angle: mkAv(r1(phiMax), "°", phiMax * 0.05,
        `atan(v/(ω×R))`),
      min_radius_curvature: mkAv(r1(rhoMin), "mm",
        rhoMin * 0.1, `pitch curve min`),
      max_contact_stress: mkAv(r0(sigContact), "MPa",
        sigContact * 0.15, `Hertz`),
      max_inertia_force: mkAv(r1(Finertia), "N",
        Finertia * 0.05, `m×a_max`),
      required_spring_force: mkAv(r0(Fspring), "N",
        Fspring * 0.05, `F0+ks×h`),
      cam_shaft_torque: mkAv(r2(Tshaft), "N·m",
        Tshaft * 0.1, `F×v/ω`),
      follower_jump_speed: mkAv(r0(rpmJump), "RPM",
        rpmJump * 0.1, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const camDesignEngine = new CamDesignEngine();
