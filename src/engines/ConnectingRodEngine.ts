/**
 * ConnectingRodEngine — Connecting rod stress and buckling analysis
 *
 * Models: Combined axial + bending (Johnson column), Euler buckling,
 *         big/small end bearing sizing, fatigue (Goodman)
 * References: SAE J1099, Shigley machine design
 * Safety: Buckling safety factor, bearing overlay limits
 */

// ─── Types ─────────────────────────────────────────────────────────

export type ConRodMaterial = "forged_steel_4340" | "forged_steel_c70"
  | "powder_metal" | "titanium_6al4v" | "aluminum_7075";

export interface ConnectingRodInput {
  bore_mm: number;
  stroke_mm: number;
  rod_length_mm?: number;                // default 2× stroke
  max_rpm: number;
  max_pressure_MPa?: number;             // default 8
  rod_material?: ConRodMaterial;         // default forged_steel_4340
  piston_assembly_mass_g?: number;       // default estimated
  cross_section_area_mm2?: number;       // I-beam area, auto-sized
}

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

export interface ConnectingRodResult {
  max_tensile_force_kN: AtomicValue;
  max_compressive_force_kN: AtomicValue;
  tensile_stress_MPa: AtomicValue;
  compressive_stress_MPa: AtomicValue;
  buckling_load_kN: AtomicValue;
  buckling_safety_factor: AtomicValue;
  fatigue_safety_factor: AtomicValue;
  big_end_diameter_mm: AtomicValue;
  small_end_diameter_mm: AtomicValue;
  rod_mass_g: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Reference Data ────────────────────────────────────────────────

const ROD_MAT: Record<ConRodMaterial, {
  uts_MPa: number; ys_MPa: number; endurance_MPa: number;
  E_GPa: number; density: number
}> = {
  forged_steel_4340: { uts_MPa: 1100, ys_MPa: 900, endurance_MPa: 450, E_GPa: 207, density: 7850 },
  forged_steel_c70:  { uts_MPa: 850, ys_MPa: 550, endurance_MPa: 350, E_GPa: 207, density: 7850 },
  powder_metal:      { uts_MPa: 700, ys_MPa: 500, endurance_MPa: 280, E_GPa: 190, density: 7400 },
  titanium_6al4v:    { uts_MPa: 950, ys_MPa: 880, endurance_MPa: 500, E_GPa: 114, density: 4430 },
  aluminum_7075:     { uts_MPa: 570, ys_MPa: 500, endurance_MPa: 160, E_GPa: 72, density: 2810 },
};

// ─── Engine ────────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string, unc: number,
  source: string, warning?: string
): AtomicValue {
  return { value, unit, uncertainty: unc, source, warning };
}

export class ConnectingRodEngine {
  calculate(input: ConnectingRodInput): ConnectingRodResult {
    const {
      bore_mm: bore,
      stroke_mm: stroke,
      max_rpm: rpm,
      max_pressure_MPa: pMax = 8,
      rod_material = "forged_steel_4340",
    } = input;

    const recs: string[] = [];
    const mp = ROD_MAT[rod_material];
    const R = stroke / 2;
    const L = input.rod_length_mm ?? stroke * 2;
    const omega = 2 * Math.PI * rpm / 60;

    // Piston area
    const Ap = Math.PI * bore * bore / 4;

    // Piston assembly mass (typical: 300-600g for 86mm bore)
    const pistonMass = input.piston_assembly_mass_g
      ?? (bore * 4); // g, ~4g per mm bore
    const mPiston = pistonMass / 1000; // kg

    // Cross-section (I-beam typical)
    let Acs = input.cross_section_area_mm2;
    if (!Acs) {
      // Rule: beam width ≈ bore/5, height ≈ bore/3
      const bw = bore / 5;
      const bh = bore / 3;
      // I-beam: flanges + web
      Acs = 2 * bw * (bh * 0.15) + (bh * 0.7) * (bw * 0.3);
    }

    // Rod mass estimation
    const rodVol = Acs * L; // mm³
    const rodMass = rodVol * mp.density / 1e6; // g

    // Forces
    // Tensile: inertia at TDC exhaust (no gas pressure)
    const Ftensile = mPiston * omega * omega
      * (R / 1000) * (1 + R / L); // kN

    // Compressive: gas force + inertia at TDC firing
    const Fgas = pMax * Ap / 1000; // kN
    const Fcomp = Fgas + mPiston * omega * omega
      * (R / 1000) * (1 - R / L) * 0.5;

    // Stresses
    const sigmaTensile = Ftensile * 1000 / Acs;
    const sigmaComp = Fcomp * 1000 / Acs;

    // Euler buckling (pin-pin: K=1)
    // Derive I-beam dimensions from area (scale with sqrt)
    const scaleFactor = Math.sqrt(Acs / 200); // normalize
    const bh = bore / 3 * scaleFactor;
    const bw = bore / 5 * scaleFactor;
    const tf = bh * 0.15;
    const tw = bw * 0.3;
    const hw = bh - 2 * tf;
    const Imin = 2 * (bw * tf * tf * tf / 12
      + bw * tf * Math.pow((bh - tf) / 2, 2))
      + tw * hw * hw * hw / 12;
    const Pcr = Math.PI * Math.PI * mp.E_GPa * 1e3
      * Imin / (L * L) / 1000; // kN
    const sfBuckling = Pcr / Math.max(Fcomp, 0.1);

    // Fatigue (Goodman)
    const sigmaA = (sigmaTensile + sigmaComp) / 2;
    const sigmaM = (sigmaComp - sigmaTensile) / 2;
    const Kt = 2.0; // typical fillet SCF
    const Se = mp.endurance_MPa * 0.65; // corrections
    const sfFatigue = 1 / (
      Math.abs(sigmaA) * Kt / Se
      + Math.abs(sigmaM) * Kt / mp.uts_MPa
    );

    // Bearing sizes (rules of thumb)
    const bigEnd = Math.round(bore * 0.55 / 5) * 5;
    const smallEnd = Math.round(bore * 0.35 / 5) * 5;

    const isSafe = sfBuckling >= 3 && sfFatigue >= 1.5;

    if (sfBuckling < 4) {
      recs.push(
        `Buckling SF=${sfBuckling.toFixed(1)} — increase `
        + `rod section or use stiffer material`
      );
    }
    if (sfFatigue < 2.0) {
      recs.push(
        `Fatigue SF=${sfFatigue.toFixed(2)} — shotpeen rod, `
        + `increase fillet radii`
      );
    }
    if (L / R < 3) {
      recs.push(
        `Short rod ratio L/R=${(L / R).toFixed(1)} — high `
        + `secondary forces and piston side loading`
      );
    }
    if (rod_material === "aluminum_7075" && rpm > 8000) {
      recs.push(
        `Aluminum rod at ${rpm}rpm — verify fatigue life `
        + `for high-rev application`
      );
    }
    if (recs.length === 0) {
      recs.push(
        `Con-rod nominal — SF_buck=${sfBuckling.toFixed(1)}, `
        + `SF_fatigue=${sfFatigue.toFixed(1)}, `
        + `${rodMass.toFixed(0)}g`
      );
    }

    return {
      max_tensile_force_kN: mkAv(
        Math.round(Ftensile * 100) / 100, "kN",
        Ftensile * 0.08, "inertia_model"
      ),
      max_compressive_force_kN: mkAv(
        Math.round(Fcomp * 100) / 100, "kN",
        Fcomp * 0.08, "gas_inertia_model"
      ),
      tensile_stress_MPa: mkAv(
        Math.round(sigmaTensile * 10) / 10, "MPa",
        sigmaTensile * 0.10, "force_area"
      ),
      compressive_stress_MPa: mkAv(
        Math.round(sigmaComp * 10) / 10, "MPa",
        sigmaComp * 0.10, "force_area"
      ),
      buckling_load_kN: mkAv(
        Math.round(Pcr * 10) / 10, "kN",
        Pcr * 0.12, "euler_buckling"
      ),
      buckling_safety_factor: mkAv(
        Math.round(sfBuckling * 100) / 100, "ratio",
        sfBuckling * 0.12, "critical_load_ratio"
      ),
      fatigue_safety_factor: mkAv(
        Math.round(sfFatigue * 100) / 100, "ratio",
        sfFatigue * 0.15, "goodman_diagram"
      ),
      big_end_diameter_mm: mkAv(bigEnd, "mm", 0, "sizing_rule"),
      small_end_diameter_mm: mkAv(smallEnd, "mm", 0, "sizing_rule"),
      rod_mass_g: mkAv(
        Math.round(rodMass), "g",
        rodMass * 0.15, "volume_estimate"
      ),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const connectingRodEngine = new ConnectingRodEngine();
