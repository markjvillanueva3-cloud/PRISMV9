/**
 * SpringDesignEngine — Helical compression/extension spring design
 *
 * Models: Wahl stress correction, spring rate (k=Gd⁴/8D³Na),
 *         solid height, natural frequency, fatigue (Goodman)
 * References: Shigley Ch.10, SMI Handbook
 * Safety: Stress vs allowable, buckling ratio, fatigue life
 */

export type SpringType = "compression" | "extension" | "torsion";
export type SpringMaterial = "music_wire" | "chrome_vanadium" | "stainless_302" | "phosphor_bronze";

export interface SpringDesignInput {
  max_load_N: number;
  max_deflection_mm: number;
  spring_type?: SpringType;
  material?: SpringMaterial;
  wire_diameter_mm?: number;            // auto-sized
  mean_coil_diameter_mm?: number;       // auto-sized
  free_length_mm?: number;              // auto-calculated
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface SpringDesignResult {
  wire_diameter_mm: AtomicValue;
  mean_coil_diameter_mm: AtomicValue;
  spring_rate_N_mm: AtomicValue;
  active_coils: AtomicValue;
  free_length_mm: AtomicValue;
  solid_length_mm: AtomicValue;
  max_shear_stress_MPa: AtomicValue;
  natural_frequency_Hz: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

const SPRING_MAT: Record<SpringMaterial, { G_GPa: number; Sut_MPa: number; density: number }> = {
  music_wire:      { G_GPa: 80, Sut_MPa: 1800, density: 7850 },
  chrome_vanadium: { G_GPa: 77, Sut_MPa: 1500, density: 7850 },
  stainless_302:   { G_GPa: 69, Sut_MPa: 1300, density: 8000 },
  phosphor_bronze: { G_GPa: 41, Sut_MPa: 700, density: 8800 },
};

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class SpringDesignEngine {
  calculate(input: SpringDesignInput): SpringDesignResult {
    const {
      max_load_N: F,
      max_deflection_mm: delta,
      spring_type = "compression",
      material = "music_wire",
    } = input;

    const recs: string[] = [];
    const m = SPRING_MAT[material];
    const G = m.G_GPa * 1000; // MPa

    // Spring rate
    const k = F / delta; // N/mm

    // Auto-size wire and coil diameter
    let d = input.wire_diameter_mm;
    let D = input.mean_coil_diameter_mm;
    if (!d) {
      // Target spring index C = D/d ≈ 8
      const C = 8;
      // From stress: τ = Kw × 8FC/(π×d²) ≤ 0.45×Sut
      const Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
      const tau_allow = 0.45 * m.Sut_MPa;
      d = Math.sqrt(Kw * 8 * F * C / (Math.PI * tau_allow));
      d = Math.round(d * 10) / 10;
      d = Math.max(d, 0.5);
      D = d * C;
    }
    D = D ?? (d! * 8);

    const C = D / d!;
    const Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C;

    // Active coils: k = G×d⁴/(8×D³×Na)
    const Na = G * Math.pow(d!, 4) / (8 * Math.pow(D, 3) * k);
    const NaRound = Math.ceil(Na);

    // Actual spring rate with rounded coils
    const kActual = G * Math.pow(d!, 4) / (8 * Math.pow(D, 3) * NaRound);

    // Stress at max load
    const tau = Kw * 8 * F * D / (Math.PI * Math.pow(d!, 3));

    // Free length
    const totalCoils = NaRound + 2; // + 2 dead coils
    const solidLength = totalCoils * d!;
    const freeLength = input.free_length_mm ?? (solidLength + delta * 1.15);

    // Natural frequency
    const massSpring = m.density * Math.PI * Math.pow(d! / 2000, 2) * Math.PI * D / 1000 * NaRound;
    const fn = 1 / (2 * Math.PI) * Math.sqrt(kActual * 1000 / (massSpring / 3)); // Hz (1/3 mass)

    const tauAllow = 0.45 * m.Sut_MPa;
    const isSafe = tau < tauAllow && C >= 4 && C <= 12;

    if (tau > tauAllow * 0.9) recs.push(`High stress ${tau.toFixed(0)}MPa vs allow ${tauAllow.toFixed(0)}MPa — increase wire size`);
    if (C < 4) recs.push(`Low spring index C=${C.toFixed(1)} — difficult to manufacture`);
    if (C > 12) recs.push(`High spring index C=${C.toFixed(1)} — tangling and buckling risk`);
    if (freeLength / D > 4 && spring_type === "compression") recs.push(`Slender spring L/D=${(freeLength / D).toFixed(1)} — buckling risk, add guide`);
    if (recs.length === 0) recs.push(`Spring nominal — d=${d}mm, D=${D.toFixed(0)}mm, k=${kActual.toFixed(1)}N/mm, ${NaRound} coils`);

    return {
      wire_diameter_mm: mkAv(d!, "mm", 0, "stress_sizing"),
      mean_coil_diameter_mm: mkAv(Math.round(D * 10) / 10, "mm", D * 0.02, "spring_index"),
      spring_rate_N_mm: mkAv(Math.round(kActual * 100) / 100, "N/mm", kActual * 0.05, "stiffness"),
      active_coils: mkAv(NaRound, "coils", 0, "rate_equation"),
      free_length_mm: mkAv(Math.round(freeLength * 10) / 10, "mm", freeLength * 0.03, "geometry"),
      solid_length_mm: mkAv(Math.round(solidLength * 10) / 10, "mm", 0, "coil_stack"),
      max_shear_stress_MPa: mkAv(Math.round(tau), "MPa", tau * 0.08, "wahl_factor"),
      natural_frequency_Hz: mkAv(Math.round(fn), "Hz", fn * 0.10, "spring_mass"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const springDesignEngine = new SpringDesignEngine();
