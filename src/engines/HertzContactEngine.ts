/**
 * HertzContactEngine — Hertzian contact stress analysis
 *
 * Models: Point contact (sphere-sphere, sphere-plane),
 *         line contact (cylinder-plane), contact area, max pressure
 * References: Hamrock "Fundamentals of Fluid Film Lubrication", Shigley
 * Safety: Subsurface shear stress, fatigue life
 */

export type ContactType = "sphere_sphere" | "sphere_plane" | "cylinder_plane" | "cylinder_cylinder";

export interface HertzContactInput {
  normal_force_N: number;
  radius1_mm: number;
  radius2_mm?: number;                  // infinity for plane
  E1_GPa?: number;                     // default 200 (steel)
  E2_GPa?: number;                     // default 200
  nu1?: number;                        // Poisson, default 0.3
  nu2?: number;
  contact_type?: ContactType;
  contact_length_mm?: number;          // for line contact
}

export interface AtomicValue {
  value: number; unit: string; uncertainty: number;
  source: string; warning?: string;
}

export interface HertzContactResult {
  max_contact_pressure_MPa: AtomicValue;
  contact_radius_mm: AtomicValue;
  contact_area_mm2: AtomicValue;
  approach_um: AtomicValue;
  subsurface_shear_MPa: AtomicValue;
  equivalent_radius_mm: AtomicValue;
  equivalent_modulus_GPa: AtomicValue;
  depth_of_max_shear_mm: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

function mkAv(v: number, u: string, unc: number, s: string, w?: string): AtomicValue {
  return { value: v, unit: u, uncertainty: unc, source: s, warning: w };
}

export class HertzContactEngine {
  calculate(input: HertzContactInput): HertzContactResult {
    const {
      normal_force_N: F,
      radius1_mm: R1,
      radius2_mm: R2 = 1e6,
      E1_GPa: E1 = 200,
      E2_GPa: E2 = 200,
      nu1 = 0.3,
      nu2 = 0.3,
      contact_type = "sphere_plane",
      contact_length_mm: L = 10,
    } = input;

    const recs: string[] = [];

    // Equivalent modulus
    const Estar = 1 / ((1 - nu1 * nu1) / (E1 * 1000) + (1 - nu2 * nu2) / (E2 * 1000)); // MPa

    // Equivalent radius
    const R1m = R1 / 1000;
    const R2m = R2 / 1000;
    const Req = 1 / (1 / R1m + 1 / R2m); // m

    let pMax: number, a_mm: number, area: number, approach: number;

    const isLine = contact_type === "cylinder_plane" || contact_type === "cylinder_cylinder";

    if (isLine) {
      // Line contact: b = √(4FR/(πLE*)), pmax = 2F/(πbL)
      const Lm = L / 1000;
      const b = Math.sqrt(4 * F * Req / (Math.PI * Lm * Estar * 1e6));
      a_mm = b * 1000;
      pMax = 2 * F / (Math.PI * b * Lm) / 1e6; // MPa
      area = 2 * b * Lm * 1e6; // mm²
      approach = F / (Math.PI * Lm * Estar * 1e6) * (2 / 3 + Math.log(4 * Req / b)) * 1e6; // μm approx
    } else {
      // Point contact: a = (3FR/(4E*))^(1/3), pmax = 3F/(2πa²)
      const a = Math.pow(3 * F * Req / (4 * Estar * 1e6), 1 / 3);
      a_mm = a * 1000;
      pMax = 3 * F / (2 * Math.PI * a * a) / 1e6; // MPa
      area = Math.PI * a * a * 1e6; // mm²
      approach = a * a / Req * 1e6; // μm
    }

    // Subsurface max shear stress ≈ 0.31 × pMax (for point contact)
    const tauMax = isLine ? 0.30 * pMax : 0.31 * pMax;
    const depthMaxShear = isLine ? 0.78 * a_mm : 0.48 * a_mm;

    const isSafe = pMax < 4000; // typical bearing steel limit ~4000 MPa

    if (pMax > 3000) recs.push(`Very high contact pressure ${pMax.toFixed(0)}MPa — fatigue spalling risk`);
    if (pMax > 2000) recs.push(`High contact pressure ${pMax.toFixed(0)}MPa — verify material hardness ≥60 HRC`);
    if (a_mm > R1 * 0.1) recs.push(`Contact radius ${a_mm.toFixed(2)}mm large vs body — Hertz theory marginal`);
    if (recs.length === 0) recs.push(`Contact nominal — p0=${pMax.toFixed(0)}MPa, a=${a_mm.toFixed(3)}mm, τmax=${tauMax.toFixed(0)}MPa`);

    return {
      max_contact_pressure_MPa: mkAv(Math.round(pMax), "MPa", pMax * 0.05, "hertz"),
      contact_radius_mm: mkAv(Math.round(a_mm * 1000) / 1000, "mm", a_mm * 0.05, "hertz"),
      contact_area_mm2: mkAv(Math.round(area * 1000) / 1000, "mm²", area * 0.08, "hertz"),
      approach_um: mkAv(Math.round(approach * 10) / 10, "μm", approach * 0.08, "hertz"),
      subsurface_shear_MPa: mkAv(Math.round(tauMax), "MPa", tauMax * 0.08, "hertz"),
      equivalent_radius_mm: mkAv(Math.round(Req * 1000 * 100) / 100, "mm", Req * 1000 * 0.01, "geometry"),
      equivalent_modulus_GPa: mkAv(Math.round(Estar / 1000 * 10) / 10, "GPa", Estar / 1000 * 0.02, "material"),
      depth_of_max_shear_mm: mkAv(Math.round(depthMaxShear * 1000) / 1000, "mm", depthMaxShear * 0.10, "hertz"),
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

export const hertzContactEngine = new HertzContactEngine();
