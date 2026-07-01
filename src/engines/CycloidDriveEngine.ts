/**
 * CycloidDriveEngine — Cycloidal reducer analysis
 *
 * Models: Cycloidal gear profile, torsional stiffness,
 *         backlash analysis, efficiency, bearing loads
 * References: Sumitomo, Nabtesco RV, DIN 3998
 */

export type CycloidType = "single_stage" | "double_stage" | "rv_type";

export interface CycloidDriveInput {
  drive_type?: CycloidType;
  num_lobes: number;                  // cycloid lobes (output teeth equivalent)
  num_pins: number;                   // ring gear pins = lobes + 1
  eccentricity_mm?: number;          // default 1.5
  pin_radius_mm?: number;            // default 3
  pin_circle_radius_mm?: number;     // default 50
  input_speed_rpm: number;
  input_torque_Nm: number;
  num_discs?: number;                // default 2 (reduces vibration)
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface CycloidDriveResult {
  reduction_ratio: AtomicValue;
  output_torque_Nm: AtomicValue;
  output_speed_rpm: AtomicValue;
  efficiency_pct: AtomicValue;
  backlash_arcmin: AtomicValue;
  torsional_stiffness_Nm_arcmin: AtomicValue;
  max_contact_stress_MPa: AtomicValue;
  moment_of_inertia_kgcm2: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class CycloidDriveEngine {
  calculate(input: CycloidDriveInput): CycloidDriveResult {
    const {
      drive_type = "single_stage",
      num_lobes: Z,
      num_pins: Zp,
      eccentricity_mm: e = 1.5,
      pin_radius_mm: rp = 3,
      pin_circle_radius_mm: R = 50,
      input_speed_rpm: Nin,
      input_torque_Nm: Tin,
      num_discs = 2,
    } = input;

    const recs: string[] = [];

    // Reduction ratio: i = Z (for single-stage cycloidal)
    // With RV type: i = Z1 × Z2
    let ratio: number;
    if (drive_type === "double_stage" || drive_type === "rv_type") {
      ratio = Z * (Z + 2); // approximate second stage
    } else {
      ratio = Z;
    }

    // Output
    const Nout = Nin / ratio;
    const eta_single = 1 - 1 / (ratio * 0.98); // ~91-98% depending on ratio
    const eta = Math.max(0.80, Math.min(0.97, eta_single));
    const Tout = Tin * ratio * eta;

    // Backlash (cycloidal drives have very low backlash)
    const backlash = drive_type === "rv_type" ? 0.5 :
      drive_type === "double_stage" ? 1.0 : 1.5; // arcmin

    // Torsional stiffness
    const stiffness = Tout / (backlash + 0.1) * 2; // Nm/arcmin

    // Contact stress on pins
    const Ft = Tout / (R / 1000); // tangential force
    const contactPerPin = Ft / (Zp * 0.5); // ~half pins in contact
    const contactStress = contactPerPin / (2 * rp * num_discs) * 1000; // MPa simplified

    // Moment of inertia (approximate)
    const discMass = Math.PI * Math.pow(R / 1000, 2) * 0.015 * 7800; // kg (15mm thick steel)
    const J = discMass * Math.pow(R / 1000, 2) / 2 * num_discs * 1e4; // kgcm²

    const isSafe = contactStress < 1500 && Nout > 0.1 && eta > 0.5;

    if (ratio > 200) recs.push(`Very high ratio ${ratio} — consider multi-stage for smoother operation`);
    if (contactStress > 1000) recs.push(`Pin contact stress ${contactStress.toFixed(0)}MPa — increase pin size or add disc`);
    if (Z < 6) recs.push(`Few lobes (${Z}) — limited ratio, consider RV type`);
    if (Nin > 3000) recs.push(`High input speed ${Nin}rpm — eccentric bearing loads increase`);
    if (recs.length === 0) recs.push(`Cycloid nominal — i=${ratio}, T_out=${Tout.toFixed(0)}Nm, η=${(eta * 100).toFixed(0)}%, ${backlash}arcmin`);

    return {
      reduction_ratio: mkAv(ratio, "ratio", 0, "lobe_count"),
      output_torque_Nm: mkAv(Math.round(Tout * 10) / 10, "Nm", Tout * 0.05, "Tin_ratio_eta"),
      output_speed_rpm: mkAv(Math.round(Nout * 100) / 100, "rpm", Nout * 0.01, "Nin_ratio"),
      efficiency_pct: mkAv(Math.round(eta * 1000) / 10, "%", eta * 100 * 0.05, "cycloidal"),
      backlash_arcmin: mkAv(backlash, "arcmin", backlash * 0.20, "type_class"),
      torsional_stiffness_Nm_arcmin: mkAv(Math.round(stiffness), "Nm/arcmin", stiffness * 0.15, "torque_angle"),
      max_contact_stress_MPa: mkAv(Math.round(contactStress), "MPa", contactStress * 0.20, "hertz_pin"),
      moment_of_inertia_kgcm2: mkAv(Math.round(J * 100) / 100, "kg·cm²", J * 0.15, "disc_mass"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const cycloidDriveEngine = new CycloidDriveEngine();
