/**
 * CamProfileEngine — Cam Mechanism Design Calculator
 *
 * Models: Disc cam with translating/oscillating follower.
 * - Motion profiles: simple harmonic, cycloidal, modified trapezoid
 * - Pressure angle check
 * - Contact stress (Hertz) at cam-follower
 * - Radius of curvature check (undercutting)
 * - Spring force requirement
 * - Max velocity, acceleration, jerk
 *
 * Key physics: Cycloidal displacement y = h(θ/β − sin(2πθ/β)/(2π)).
 * Pressure angle tan(φ) = dy/dθ / (y + Rb + Rf). Hertz contact
 * stress at cam-follower interface.
 *
 * Reference: Norton — Cam Design and Manufacturing Handbook,
 *            Rothbart — Cam Design Handbook,
 *            DIN 8000 (cam terminology)
 *
 * Actions: cam_profile_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CamProfileInput {
  lift_mm?: number;
  rise_angle_deg?: number;
  dwell_angle_deg?: number;
  return_angle_deg?: number;
  cam_rpm?: number;
  base_circle_mm?: number;
  follower_radius_mm?: number;
  follower_mass_kg?: number;
  motion_type?: "cycloidal" | "harmonic" | "modified_trap" | "constant_accel";
  spring_preload_n?: number;
  spring_rate_n_mm?: number;
}

export interface CamProfileResult {
  max_velocity: AtomicValue;
  max_acceleration: AtomicValue;
  max_jerk: AtomicValue;
  max_pressure_angle: AtomicValue;
  min_radius_curvature: AtomicValue;
  max_contact_stress: AtomicValue;
  required_spring_force: AtomicValue;
  cam_feasible: AtomicValue;
  motion_quality: AtomicValue;
  warnings: string[];
}

// ── Motion Profile Coefficients ───────────────────────────────────

/** [Cv, Ca, Cj] — velocity, accel, jerk coefficients per motion type */
const MOTION_COEFF: Record<string, [number, number, number]> = {
  cycloidal:      [2.0, 6.283, 39.48],
  harmonic:       [1.571, 4.935, Infinity],  // infinite jerk at transitions
  modified_trap:  [2.0, 4.888, 61.43],
  constant_accel: [2.0, 4.0, Infinity],
};

// ── Engine ─────────────────────────────────────────────────────────

export class CamProfileEngine {
  calculate(input: CamProfileInput): CamProfileResult {
    const warnings: string[] = [];
    const h = input.lift_mm ?? 15;
    const betaRise = (input.rise_angle_deg ?? 120) * Math.PI / 180;
    const betaReturn = (input.return_angle_deg ?? 120) * Math.PI / 180;
    const rpm = input.cam_rpm ?? 600;
    const Rb = input.base_circle_mm ?? 50;
    const Rf = input.follower_radius_mm ?? 10;
    const mFol = input.follower_mass_kg ?? 0.5;
    const motionType = input.motion_type ?? "cycloidal";

    const omega = 2 * Math.PI * rpm / 60; // rad/s

    const [Cv, Ca, Cj] = MOTION_COEFF[motionType] ?? MOTION_COEFF.cycloidal;

    // Max velocity: v_max = Cv × h × ω / β
    const vMax = Cv * h * omega / betaRise; // mm/s

    // Max acceleration: a_max = Ca × h × ω² / β²
    const aMax = Ca * h * omega * omega / (betaRise * betaRise); // mm/s²

    // Max jerk
    const jMax = isFinite(Cj)
      ? Cj * h * omega ** 3 / (betaRise ** 3)
      : Infinity;

    // Pressure angle (max occurs at max velocity point)
    // tan(φ) ≈ v_max / (ω × (Rb + Rf + h/2))
    const pressAngleRad = Math.atan(vMax / (omega * (Rb + Rf + h / 2)));
    const pressAngleDeg = pressAngleRad * 180 / Math.PI;

    // Minimum radius of curvature (approximation)
    // ρ_min ≈ Rb + Rf − h × Ca / (β² offset)
    // For cycloidal: ρ_min ≈ Rb + Rf − h
    const rhoMin = Rb + Rf - h * 0.8; // simplified conservative

    // Contact stress (Hertz, cylinder-on-cylinder approximation)
    // F_max = m × a_max + spring_force
    const springPreload = input.spring_preload_n ?? 50;
    const springRate = input.spring_rate_n_mm ?? 5;
    const springForceMax = springPreload + springRate * h;
    const inertiaForce = mFol * aMax / 1000; // mm/s² → m/s², N
    const contactForce = Math.max(springForceMax, inertiaForce);

    // Hertz: σ = 0.418 × √(F × E / (L × R_eq))
    // Assume cam width=15mm, E=210GPa, equivalent radius from Rb
    const camWidth = 15; // mm
    const E_eq = 115000; // MPa (equivalent for steel-steel)
    const R_eq = (Rb * Rf) / (Rb + Rf); // mm
    const hertzStress = 0.418 * Math.sqrt(
      contactForce * E_eq / (camWidth * Math.max(R_eq, 1))
    );

    // Required spring force: must overcome inertia during return
    const returnAccel = Ca * h * omega * omega / (betaReturn * betaReturn);
    const requiredSpring = mFol * returnAccel / 1000 * 1.5; // 50% margin

    // Motion quality rating (1-10)
    let quality = 10;
    if (pressAngleDeg > 30) quality -= 3;
    else if (pressAngleDeg > 20) quality -= 1;
    if (!isFinite(jMax)) quality -= 2;
    if (rhoMin < 5) quality -= 3;
    if (aMax > 50000) quality -= 1;

    // Feasibility
    const feasible = pressAngleDeg <= 30 && rhoMin > 0;

    // Warnings
    if (pressAngleDeg > 30) {
      warnings.push(
        `Pressure angle ${r1(pressAngleDeg)}° > 30° — increase base circle or reduce lift`
      );
    }
    if (pressAngleDeg > 20) {
      warnings.push(
        `Pressure angle ${r1(pressAngleDeg)}° > 20° — acceptable but monitor follower guide wear`
      );
    }
    if (rhoMin <= 0) {
      warnings.push("CRITICAL: Negative curvature — cam profile will undercut");
    }
    if (rhoMin < Rf) {
      warnings.push(
        `Min curvature ${r1(rhoMin)}mm < follower radius ${Rf}mm — pointed cam risk`
      );
    }
    if (!isFinite(jMax)) {
      warnings.push(`${motionType} motion has infinite jerk — consider cycloidal for smoother operation`);
    }
    if (hertzStress > 1500) {
      warnings.push(`Contact stress ${r0(hertzStress)} MPa — harden cam surface (≥58 HRC)`);
    }

    const src = "CamProfileEngine (Norton/Rothbart)";

    return {
      max_velocity: mkAv(r1(vMax), "mm/s", vMax * 0.05, `Cv=${Cv}, h=${h}mm`),
      max_acceleration: mkAv(r0(aMax), "mm/s²", aMax * 0.05, `Ca=${Ca}`),
      max_jerk: mkAv(isFinite(jMax) ? r0(jMax) : -1,
        isFinite(jMax) ? "mm/s³" : "∞", 0, `Cj=${Cj}`),
      max_pressure_angle: mkAv(r1(pressAngleDeg), "°", 1, src),
      min_radius_curvature: mkAv(r1(rhoMin), "mm", 2, src),
      max_contact_stress: mkAv(r0(hertzStress), "MPa", hertzStress * 0.15, "Hertz"),
      required_spring_force: mkAv(r1(requiredSpring), "N", requiredSpring * 0.2,
        `1.5× inertia return force`),
      cam_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
      motion_quality: mkAv(Math.max(1, quality), "/10", 0, motionType),
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

export const camProfileEngine = new CamProfileEngine();
