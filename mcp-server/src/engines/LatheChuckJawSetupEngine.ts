/**
 * LatheChuckJawSetupEngine
 * ==========================
 *
 * Soft-jaw machining and grip-planning calculator for lathe chucks.
 *
 * Unlike ChuckGripForce (jaw clamping force physics) or FixtureStiffness
 * (generic fixture rigidity), this engine computes the *practical
 * changeover math* the machinist must do when prepping a new chuck setup:
 *
 *   1. Soft-jaw bore diameter       — accounts for chuck centering, part
 *                                     OD tol, and clamp pressure elastic
 *                                     spring-back
 *   2. Grip length                  — minimum vs recommended per ISO 16156
 *   3. Step-jaw bore-and-face depth — for parts that need Z location from
 *                                     jaw face
 *   4. Jaw balance check            — max jaw weight vs chuck rpm per
 *                                     NIST SP-960-18 (centrifugal lift-off)
 *   5. Bore-by-master practice      — boring the jaws with a master
 *                                     plug/chuck-pressure in place
 *
 * Formulas:
 *   springback_mm = (jaw_force_kN × 1e3) / (E * jaw_contact_area)  (elastic)
 *   min_grip_length = max(3 mm, 0.2 * grip_od_mm)                   (ISO)
 *   max_rpm_balance = sqrt( K / (jaw_mass * radius) )               (centrif.)
 *
 * Distinct from existing:
 *   - ChuckGripForceEngine  : clamping-force physics (Fc = μ N)
 *   - FixtureStiffnessEngine: generic fixture deflection under load
 *   - This engine           : practical jaw-prep math (bore, grip, balance)
 *
 * References:
 *   - ISO 16156 "Machine tools safety — Chucks"
 *   - NIST SP 960-18 (centrifugal jaw lift-off)
 *   - Kitagawa Soft-Jaw Machining Guide
 *
 * @module engines/LatheChuckJawSetupEngine
 * @milestone LATHE-PRO-MS11
 */

export interface LatheChuckJawInput {
  /** Part OD to grip (mm) */
  part_od_mm: number;
  /** Part OD tolerance band (mm, total) */
  part_od_tol_mm: number;
  /** Clamp force per jaw (kN, at master jaw) */
  clamp_force_kn: number;
  /** Jaw material elastic modulus MPa (default 210000 steel) */
  jaw_modulus_mpa?: number;
  /** Jaw contact area mm² (default 300 typical soft-jaw) */
  jaw_contact_area_mm2?: number;

  /** Jaw mass kg each (master + soft jaw) */
  jaw_mass_kg: number;
  /** Jaw centroid radius from spindle axis (mm) */
  jaw_centroid_radius_mm: number;
  /** Chuck rated max rpm */
  chuck_rated_max_rpm: number;
  /** Intended operating rpm */
  operating_rpm: number;

  /** Step/face required? (Yes → compute step bore-face depth) */
  step_required?: boolean;
  /** Step Z reference from chuck face mm (for step jaw) */
  step_z_mm?: number;

  /** Whether to bore with master pressure (recommended) */
  use_master_pressure?: boolean;
}

export interface LatheChuckJawResult {
  bore_diameter_mm: number;
  springback_mm: number;
  min_grip_length_mm: number;
  recommended_grip_length_mm: number;
  step_face_depth_mm?: number;
  max_safe_rpm_balance: number;
  operating_rpm_safe: boolean;
  warnings: string[];
  reasoning: string[];
}

class LatheChuckJawSetupEngineImpl {
  compute(i: LatheChuckJawInput): LatheChuckJawResult {
    const reasoning: string[] = [];
    const warnings: string[] = [];
    const E = i.jaw_modulus_mpa ?? 210000; // MPa = N/mm²
    const contactArea = Math.max(10, i.jaw_contact_area_mm2 ?? 300);

    // Elastic springback (very small — micrometres for typical clamp forces)
    const force_n = i.clamp_force_kn * 1000;
    const springback_mm = force_n / (E * contactArea);

    // Bore slightly smaller than part OD so the part compresses onto jaws
    const bore = round3(i.part_od_mm - 2 * springback_mm);

    // Grip length per ISO 16156 — min 3mm or 20% of grip OD
    const minGrip = Math.max(3, 0.2 * i.part_od_mm);
    const recGrip = round2(minGrip * 1.5); // 50% margin

    // Step face depth if step jaw
    let stepDepth: number | undefined;
    if (i.step_required) {
      stepDepth = round2(Math.max(2, (i.step_z_mm ?? 0) + 1));
    }

    // Max safe rpm from centrifugal balance
    // Centrifugal force lifts jaw against clamp: F_lift = m ω² r
    // Keep F_lift < 0.7 × clamp_force for safety margin (ISO 16156)
    const allowable_lift_n = 0.7 * force_n;
    const omega2 = allowable_lift_n / (i.jaw_mass_kg * (i.jaw_centroid_radius_mm / 1000));
    const omega = Math.sqrt(Math.max(0, omega2));
    const max_rpm_balance = round2((omega / (2 * Math.PI)) * 60);
    const max_safe = Math.min(max_rpm_balance, i.chuck_rated_max_rpm);
    const opSafe = i.operating_rpm <= max_safe;

    // Warnings
    if (!opSafe) warnings.push(`Operating RPM ${i.operating_rpm} exceeds safe limit ${max_safe}`);
    if (bore < i.part_od_mm - i.part_od_tol_mm) {
      warnings.push(`Bore ${bore}mm may be tighter than minimum part OD (${i.part_od_mm - i.part_od_tol_mm}mm)`);
    }
    if (!i.use_master_pressure) {
      warnings.push("Recommend boring jaws with master pressure applied (use chuck-pressure master plug)");
    }

    reasoning.push(`Springback ≈ ${round4(springback_mm)}mm → bore Ø${bore}mm`);
    reasoning.push(`Grip length min ${round2(minGrip)}mm, recommended ${recGrip}mm (ISO 16156)`);
    reasoning.push(`RPM balance limit ${max_rpm_balance} @ jaw ${i.jaw_mass_kg}kg, r=${i.jaw_centroid_radius_mm}mm`);

    return {
      bore_diameter_mm: bore,
      springback_mm: round4(springback_mm),
      min_grip_length_mm: round2(minGrip),
      recommended_grip_length_mm: recGrip,
      step_face_depth_mm: stepDepth,
      max_safe_rpm_balance: max_safe,
      operating_rpm_safe: opSafe,
      warnings,
      reasoning,
    };
  }

  getStats(): { reference: string } {
    return {
      reference: "ISO 16156 chuck safety; NIST SP 960-18 centrifugal lift-off; Kitagawa soft-jaw guide",
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const latheChuckJawSetupEngine = new LatheChuckJawSetupEngineImpl();
export type { LatheChuckJawSetupEngineImpl };
