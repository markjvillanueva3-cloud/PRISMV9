/**
 * RollingContactEngine — Hertzian Contact Stress Calculator
 *
 * Models: Rolling/sliding contact between curved surfaces.
 * - Hertz contact stress (cylinder-on-cylinder, sphere-on-flat, etc.)
 * - Contact patch dimensions (half-width a, ellipse a×b)
 * - Sub-surface shear stress depth
 * - Film thickness and lambda ratio for EHL
 * - Contact fatigue life estimation
 * - Allowable load from material hardness
 *
 * Key physics: p₀ = (2F)/(πaL) cylinder. a = √(4FR/(πE*L)).
 * E* = 2/((1-ν₁²)/E₁ + (1-ν₂²)/E₂). τ_max at 0.786a depth.
 *
 * Reference: Hertz — Contact Mechanics,
 *            Johnson — Contact Mechanics (Cambridge),
 *            Hamrock — Fundamentals of Fluid Film Lubrication
 *
 * Actions: rolling_contact_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface RollingContactInput {
  geometry?: "cylinder_cylinder" | "cylinder_flat" | "sphere_flat" | "sphere_sphere";
  radius_1_mm?: number;
  radius_2_mm?: number;
  contact_length_mm?: number;
  normal_force_n?: number;
  material_1?: "steel" | "cast_iron" | "bronze" | "ceramic";
  material_2?: "steel" | "cast_iron" | "bronze" | "ceramic";
  hardness_hrc?: number;
  rolling_speed_m_s?: number;
  lubricant_viscosity_cp?: number;
}

export interface RollingContactResult {
  max_contact_pressure: AtomicValue;
  contact_half_width: AtomicValue;
  equivalent_modulus: AtomicValue;
  subsurface_shear: AtomicValue;
  shear_depth: AtomicValue;
  equivalent_radius: AtomicValue;
  contact_area: AtomicValue;
  lambda_ratio: AtomicValue;
  contact_life: AtomicValue;
  allowable_load: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [E_GPa, poisson, allowable_contact_MPa] */
const MAT_CONTACT: Record<string, [number, number, number]> = {
  steel:     [200, 0.30, 1500],
  cast_iron: [170, 0.26, 800],
  bronze:    [110, 0.34, 500],
  ceramic:   [300, 0.22, 2500],
};

// ── Engine ─────────────────────────────────────────────────────────

export class RollingContactEngine {
  calculate(input: RollingContactInput): RollingContactResult {
    const warnings: string[] = [];
    const geo = input.geometry ?? "cylinder_flat";
    const R1 = (input.radius_1_mm ?? 20) / 1000; // m
    const R2 = geo.includes("flat") ? Infinity :
      (input.radius_2_mm ?? 50) / 1000;
    const L = (input.contact_length_mm ?? 20) / 1000; // m (for line contact)
    const F = input.normal_force_n ?? 1000;
    const mat1 = input.material_1 ?? "steel";
    const mat2 = input.material_2 ?? "steel";
    const hrc = input.hardness_hrc ?? 60;
    const speed = input.rolling_speed_m_s ?? 1;
    const visc = input.lubricant_viscosity_cp ?? 100;

    const [E1, v1, allow1] = MAT_CONTACT[mat1] ?? MAT_CONTACT.steel;
    const [E2, v2, allow2] = MAT_CONTACT[mat2] ?? MAT_CONTACT.steel;

    // Equivalent elastic modulus
    const Estar = 2 / ((1 - v1 * v1) / (E1 * 1e9) + (1 - v2 * v2) / (E2 * 1e9)); // Pa

    // Equivalent radius
    const Req = R2 === Infinity ? R1 : (R1 * R2) / (R1 + R2); // m

    let p0: number, a: number, contactArea: number;

    if (geo.includes("sphere")) {
      // Point contact (sphere)
      a = Math.pow(3 * F * Req / (4 * Estar), 1 / 3); // m
      p0 = 3 * F / (2 * Math.PI * a * a); // Pa
      contactArea = Math.PI * a * a;
    } else {
      // Line contact (cylinder)
      a = Math.sqrt(4 * F * Req / (Math.PI * Estar * L)); // m (half-width)
      p0 = 2 * F / (Math.PI * a * L); // Pa
      contactArea = 2 * a * L;
    }

    const p0MPa = p0 / 1e6;
    const aMm = a * 1000;

    // Sub-surface max shear stress (at depth 0.786a for line contact)
    const tauMax = 0.30 * p0MPa; // ≈ 0.30 × p₀ for line contact
    const shearDepth = 0.786 * aMm;

    // Lambda ratio (EHL film thickness / surface roughness)
    // Simplified Hamrock-Dowson: h_min ∝ (η₀U)^0.7 × R^0.47 × (E*R/F)^(-0.13)
    const eta0 = visc / 1000; // Pa·s
    const U = speed;
    const hMin = 1.7e-6 * Math.pow(eta0 * U, 0.7) * Math.pow(Req, 0.47); // rough m
    const Ra = 0.2e-6; // typical surface roughness m
    const lambda = Ra > 0 ? hMin / Ra : 10;

    // Contact fatigue life (relative, based on stress vs allowable)
    const allowable = Math.min(allow1, allow2);
    const stressRatio = p0MPa / allowable;
    const life = Math.pow(1 / Math.max(stressRatio, 0.1), 3) * 1e6; // cycles

    // Allowable load for material
    const Fallow = geo.includes("sphere") ?
      (2 * Math.PI / 3) * Math.pow(a, 2) * allowable * 1e6 :
      (Math.PI / 2) * a * L * allowable * 1e6;

    // Warnings
    if (p0MPa > allowable) {
      warnings.push(`Contact pressure ${r0(p0MPa)}MPa exceeds allowable ${allowable}MPa`);
    }
    if (lambda < 1) {
      warnings.push(`Lambda ratio ${r1(lambda)} < 1.0 — boundary lubrication, high wear`);
    }
    if (lambda < 3) {
      warnings.push(`Lambda ratio ${r1(lambda)} < 3.0 — mixed lubrication regime`);
    }
    if (tauMax > 500) {
      warnings.push(`Sub-surface shear ${r0(tauMax)}MPa — risk of sub-surface fatigue`);
    }
    if (hrc < 50 && p0MPa > 1000) {
      warnings.push(`Hardness ${hrc}HRC may be insufficient for ${r0(p0MPa)}MPa contact`);
    }

    const src = "RollingContactEngine (Hertz/Johnson)";

    return {
      max_contact_pressure: mkAv(r0(p0MPa), "MPa", p0MPa * 0.05,
        `${geo} F=${F}N`),
      contact_half_width: mkAv(r3(aMm), "mm", aMm * 0.05, `Hertz`),
      equivalent_modulus: mkAv(r0(Estar / 1e9), "GPa", Estar / 1e9 * 0.02,
        `${mat1}/${mat2}`),
      subsurface_shear: mkAv(r0(tauMax), "MPa", tauMax * 0.05,
        `0.30×p₀`),
      shear_depth: mkAv(r3(shearDepth), "mm", shearDepth * 0.05,
        `0.786×a`),
      equivalent_radius: mkAv(r1(Req * 1000), "mm", Req * 1000 * 0.01,
        `R1×R2/(R1+R2)`),
      contact_area: mkAv(r3(contactArea * 1e6), "mm²", contactArea * 1e6 * 0.1,
        geo),
      lambda_ratio: mkAv(r1(lambda), "λ", lambda * 0.2,
        `h_min/Ra`),
      contact_life: mkAv(r0(life), "cycles", life * 0.3,
        `(allow/p₀)³×10⁶`),
      allowable_load: mkAv(r0(Fallow), "N", Fallow * 0.1, src),
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const rollingContactEngine = new RollingContactEngine();
