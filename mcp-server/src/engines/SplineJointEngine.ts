/**
 * SplineJointEngine — Spline Connection Design Calculator
 *
 * Models: Involute and straight-sided spline joints.
 * - Bearing/compressive stress on spline flanks
 * - Shear stress at root
 * - Torque capacity from spline geometry
 * - Effective tooth contact (misalignment derating)
 * - Wear life estimation
 * - Sliding velocity for lubrication
 *
 * Key physics: T = p×D×h×L×σ_allow/4 (bearing).
 * σ_bearing = 2T/(n×h×L×D_mean).
 * τ_shear = 2T/(n×b×L×D_root).
 *
 * Reference: DIN 5480 — Involute Splines,
 *            SAE J744 — Straight Tooth Splines,
 *            AGMA 6123 — Spline Design
 *
 * Actions: spline_joint_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SplineJointInput {
  spline_type?: "involute" | "straight";
  num_teeth?: number;
  major_diameter_mm?: number;
  minor_diameter_mm?: number;
  engagement_length_mm?: number;
  applied_torque_nm?: number;
  rpm?: number;
  hardness_hrc?: number;
  fit_class?: "sliding" | "close" | "press";
  misalignment_deg?: number;
}

export interface SplineJointResult {
  bearing_stress: AtomicValue;
  shear_stress: AtomicValue;
  torque_capacity: AtomicValue;
  safety_factor: AtomicValue;
  tooth_height: AtomicValue;
  mean_diameter: AtomicValue;
  contact_ratio: AtomicValue;
  sliding_velocity: AtomicValue;
  wear_factor: AtomicValue;
  allowable_bearing: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Allowable bearing stress by hardness range (MPa) */
function getAllowBearing(hrc: number): number {
  if (hrc >= 55) return 150;
  if (hrc >= 45) return 100;
  if (hrc >= 35) return 70;
  return 40;
}

/** Fit class derating on contact */
const FIT_CONTACT: Record<string, number> = {
  sliding: 0.75, close: 0.90, press: 1.0,
};

// ── Engine ─────────────────────────────────────────────────────────

export class SplineJointEngine {
  calculate(input: SplineJointInput): SplineJointResult {
    const warnings: string[] = [];
    const sType = input.spline_type ?? "involute";
    const n = input.num_teeth ?? 10;
    const Dmaj = input.major_diameter_mm ?? 50;
    const Dmin = input.minor_diameter_mm ?? 42;
    const Le = input.engagement_length_mm ?? 40;
    const T = input.applied_torque_nm ?? 500;
    const rpm = input.rpm ?? 1000;
    const hrc = input.hardness_hrc ?? 50;
    const fit = input.fit_class ?? "close";
    const misalign = input.misalignment_deg ?? 0.5;

    // Geometry
    const h = (Dmaj - Dmin) / 2; // tooth height
    const Dm = (Dmaj + Dmin) / 2; // mean diameter
    const bTooth = Math.PI * Dm / (2 * n); // tooth thickness at mean

    // Allowable stress
    const sigAllow = getAllowBearing(hrc);
    const contactFactor = FIT_CONTACT[fit] ?? 0.9;

    // Misalignment derating
    const misalignFactor = Math.max(0.5, 1 - misalign * 0.3);

    // Effective contact
    const Kcontact = contactFactor * misalignFactor;

    // Bearing stress: σ = 2T×1000 / (n × h × Le × Dm × Kcontact)
    const Tmm = T * 1000; // N·mm
    const sigBearing = 2 * Tmm
      / (n * h * Le * Dm / 2 * Kcontact);

    // Shear stress at root
    const tauShear = 2 * Tmm / (n * bTooth * Le * Dmin / 2);

    // Torque capacity
    const Tcap = sigAllow * n * h * Le * Dm / 2
      * Kcontact / (2 * 1000); // N·m

    // Safety factor
    const SF = Tcap / Math.max(T, 0.1);

    // Sliding velocity (for lubrication)
    const omega = rpm * 2 * Math.PI / 60;
    const vSlide = sType === "involute"
      ? omega * Dm / 2 * Math.tan(0.5 * Math.PI / 180) / 1000
      : 0; // m/s — involute has rolling+sliding

    // Wear factor (PV-like)
    const wearPV = sigBearing * vSlide;

    // Warnings
    if (SF < 1.5) {
      warnings.push(
        `Safety factor ${r1(SF)} < 1.5 — increase engagement or teeth`
      );
    }
    if (sigBearing > sigAllow) {
      warnings.push(
        `Bearing stress ${r0(sigBearing)} > allow ${sigAllow} MPa`
      );
    }
    if (Le / Dm < 0.5) {
      warnings.push(
        `L/D ratio ${r2(Le / Dm)} < 0.5 — short engagement`
      );
    }
    if (misalign > 1.0) {
      warnings.push(
        `Misalignment ${misalign}° > 1° — use crowned spline`
      );
    }
    if (n < 6) {
      warnings.push("< 6 teeth — stress concentration high");
    }
    if (fit === "sliding" && rpm > 3000) {
      warnings.push("Sliding fit at high RPM — verify lubrication");
    }

    const src = "SplineJointEngine (DIN 5480/AGMA 6123)";

    return {
      bearing_stress: mkAv(r0(sigBearing), "MPa",
        sigBearing * 0.1, `2T/(nhLDm/2)`),
      shear_stress: mkAv(r0(tauShear), "MPa",
        tauShear * 0.1, `2T/(nbLD_min/2)`),
      torque_capacity: mkAv(r0(Tcap), "N·m",
        Tcap * 0.1, `σ_allow×geometry`),
      safety_factor: mkAv(r1(SF), "×", SF * 0.1,
        `T_cap/T_applied`),
      tooth_height: mkAv(r1(h), "mm", 0,
        `(D_maj-D_min)/2`),
      mean_diameter: mkAv(r1(Dm), "mm", 0,
        `(D_maj+D_min)/2`),
      contact_ratio: mkAv(r2(Kcontact), "×", 0,
        `fit×misalign`),
      sliding_velocity: mkAv(r2(vSlide), "m/s",
        vSlide * 0.2, sType),
      wear_factor: mkAv(r1(wearPV), "MPa·m/s",
        wearPV * 0.2, "PV factor"),
      allowable_bearing: mkAv(sigAllow, "MPa", 0, src),
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

export const splineJointEngine = new SplineJointEngine();
