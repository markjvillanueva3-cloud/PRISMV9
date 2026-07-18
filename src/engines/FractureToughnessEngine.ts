/**
 * FractureToughnessEngine — Fracture Mechanics Assessment
 *
 * Models: Linear elastic fracture mechanics (LEFM) and fitness-for-service.
 * - Stress intensity factor K_I = Y×σ×√(πa)
 * - Critical crack size from K_IC
 * - Fatigue crack growth (Paris law: da/dN = C×ΔK^m)
 * - Remaining cycles to failure
 * - Plastic zone size (Irwin): r_p = (K/σ_y)²/(2π)
 * - FAD (Failure Assessment Diagram) point
 *
 * Key physics: K_I = Y×σ×√(πa). Paris: da/dN = C(ΔK)^m.
 * Plane strain: K_IC. Plane stress: K_C. FAD: Kr vs Lr.
 *
 * Reference: Anderson — Fracture Mechanics,
 *            BS 7910 — Fitness for Service,
 *            API 579 — Fitness-for-Service
 *
 * Actions: fracture_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface FractureToughnessInput {
  material?: "mild_steel" | "high_strength_steel" | "stainless_304" |
    "aluminum_7075" | "titanium_6al4v" | "cast_iron";
  crack_length_mm?: number;
  applied_stress_mpa?: number;
  yield_strength_mpa?: number;
  geometry_factor?: number;
  crack_geometry?: "through" | "surface" | "embedded" | "edge";
  stress_ratio?: number;
  num_cycles?: number;
}

export interface FractureToughnessResult {
  stress_intensity: AtomicValue;
  critical_crack_size: AtomicValue;
  fracture_toughness: AtomicValue;
  safety_factor: AtomicValue;
  plastic_zone_size: AtomicValue;
  crack_growth_rate: AtomicValue;
  remaining_cycles: AtomicValue;
  fad_kr: AtomicValue;
  fad_lr: AtomicValue;
  plane_condition: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [K_IC MPa√m, yield_MPa, Paris_C, Paris_m, E_GPa] */
const MAT_FRAC: Record<string, [number, number, number, number, number]> = {
  mild_steel:         [50,  250, 6.9e-12, 3.0, 200],
  high_strength_steel:[60,  700, 3.0e-11, 2.5, 200],
  stainless_304:      [100, 215, 5.6e-12, 3.25, 193],
  aluminum_7075:      [27,  503, 2.0e-11, 3.3, 71],
  titanium_6al4v:     [75,  880, 1.0e-11, 3.2, 114],
  cast_iron:          [15,  200, 1.0e-10, 3.5, 170],
};

/** Geometry factor Y for different crack types */
const GEO_Y: Record<string, number> = {
  through: 1.12,
  surface: 1.26,
  embedded: 0.64,
  edge: 1.12,
};

// ── Engine ─────────────────────────────────────────────────────────

export class FractureToughnessEngine {
  calculate(input: FractureToughnessInput): FractureToughnessResult {
    const warnings: string[] = [];
    const matKey = input.material ?? "mild_steel";
    const aInit = (input.crack_length_mm ?? 5) / 1000; // m
    const sigma = input.applied_stress_mpa ?? 100;
    const crackGeo = input.crack_geometry ?? "through";
    const R = input.stress_ratio ?? 0.1;

    const [KIC, sigY_default, C_paris, m_paris, E] =
      MAT_FRAC[matKey] ?? MAT_FRAC.mild_steel;
    const sigY = input.yield_strength_mpa ?? sigY_default;
    const Y = input.geometry_factor ?? GEO_Y[crackGeo] ?? 1.12;

    // Stress intensity factor
    const KI = Y * sigma * Math.sqrt(Math.PI * aInit); // MPa√m

    // Critical crack size
    const aCrit = KIC > 0 && sigma > 0 ?
      Math.pow(KIC / (Y * sigma), 2) / Math.PI : 999; // m

    // Safety factor
    const SF = KI > 0 ? KIC / KI : 999;

    // Plastic zone size (Irwin, plane strain)
    const rp = sigY > 0 ? (1 / (6 * Math.PI)) * Math.pow(KI / sigY, 2) : 0; // m

    // Plane strain validity: B > 2.5(KIC/σy)²
    const minThickness = 2.5 * Math.pow(KIC / Math.max(sigY, 1), 2); // m
    const planeStrain = aInit > minThickness * 0.1; // simplified check

    // Paris law crack growth rate
    const deltaK = KI * (1 - R); // stress range
    const dadN = C_paris * Math.pow(Math.max(deltaK, 0.1), m_paris); // m/cycle

    // Remaining cycles to critical (simplified integration)
    // N = ∫ da / (C×(ΔK)^m) ≈ (a_crit - a_init) / dadN (rough)
    // More accurate: N ≈ 2×[(a_crit)^(1-m/2) - a^(1-m/2)] / ((2-m)×C×(Y×σ×√π)^m)
    let remainingCycles: number;
    if (m_paris !== 2 && sigma > 0) {
      const exp = 1 - m_paris / 2;
      const factor = (Y * sigma * Math.sqrt(Math.PI));
      const denom = exp * C_paris * Math.pow(factor, m_paris);
      if (Math.abs(denom) > 1e-30) {
        remainingCycles = Math.abs(
          (Math.pow(aCrit, exp) - Math.pow(aInit, exp)) / denom
        );
      } else {
        remainingCycles = 0;
      }
    } else {
      remainingCycles = dadN > 0 ? (aCrit - aInit) / dadN : 999999;
    }

    // FAD assessment (BS 7910 Level 1)
    const Kr = KI / KIC; // fracture ratio
    const Lr = sigma / sigY; // load ratio

    // Warnings
    if (SF < 2) {
      warnings.push(`Safety factor ${r1(SF)} < 2.0 — near critical, immediate action needed`);
    }
    if (KI > KIC * 0.8) {
      warnings.push(`K_I ${r1(KI)} approaches K_IC ${KIC} MPa√m — fracture imminent`);
    }
    if (aInit > aCrit * 0.5) {
      warnings.push(`Crack ${r1(aInit * 1000)}mm > 50% of critical ${r1(aCrit * 1000)}mm`);
    }
    if (Lr > 0.8) {
      warnings.push(`Load ratio Lr=${r2(Lr)} > 0.8 — plastic collapse risk`);
    }
    if (matKey === "cast_iron") {
      warnings.push("Cast iron — low toughness, limited crack tolerance");
    }
    if (remainingCycles < 10000 && remainingCycles > 0) {
      warnings.push(`Only ${r0(remainingCycles)} cycles to critical — monitor closely`);
    }

    const src = "FractureToughnessEngine (Anderson/BS 7910)";

    return {
      stress_intensity: mkAv(r1(KI), "MPa√m", KI * 0.05,
        `${Y}×${sigma}×√(π×${r1(aInit * 1000)}mm)`),
      critical_crack_size: mkAv(r1(aCrit * 1000), "mm", aCrit * 1000 * 0.1,
        `(K_IC/(Yσ))²/π`),
      fracture_toughness: mkAv(KIC, "MPa√m", KIC * 0.05, matKey),
      safety_factor: mkAv(r2(SF), "×", SF * 0.1, `K_IC/K_I`),
      plastic_zone_size: mkAv(r2(rp * 1000), "mm", rp * 1000 * 0.15,
        "Irwin plane strain"),
      crack_growth_rate: mkAv(Number(dadN.toExponential(2)), "m/cycle",
        dadN * 0.3, `Paris C=${C_paris} m=${m_paris}`),
      remaining_cycles: mkAv(r0(remainingCycles), "cycles",
        remainingCycles * 0.3, "Paris integration"),
      fad_kr: mkAv(r2(Kr), "Kr", Kr * 0.05, `K_I/K_IC`),
      fad_lr: mkAv(r2(Lr), "Lr", Lr * 0.02, `σ/σ_y`),
      plane_condition: mkAv(planeStrain ? 1 : 0,
        planeStrain ? "plane_strain" : "plane_stress", 0, src),
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

export const fractureToughnessEngine = new FractureToughnessEngine();
