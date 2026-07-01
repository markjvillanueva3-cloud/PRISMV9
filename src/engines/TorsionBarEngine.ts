/**
 * TorsionBarEngine — Torsion Member Stress & Deflection Calculator
 *
 * Models: Solid/hollow shaft and non-circular section torsion.
 * - Shear stress τ = T×r/J (circular)
 * - Angle of twist φ = TL/(GJ)
 * - Torsional spring rate k = GJ/L
 * - Non-circular sections (square, rectangular, elliptical)
 * - Combined loading (torsion + bending)
 * - Fatigue under reversed torsion
 *
 * Key physics: τ = Tr/J. φ = TL/(GJ). J = π(d⁴)/32 solid.
 * Von Mises: σ_eq = √(σ² + 3τ²). k_t = GJ/L.
 *
 * Reference: Roark — Formulas for Stress & Strain,
 *            Shigley — Mechanical Engineering Design,
 *            Timoshenko — Strength of Materials
 *
 * Actions: torsion_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface TorsionBarInput {
  section?: "solid_round" | "hollow_round" | "square" | "rectangular";
  outer_diameter_mm?: number;
  inner_diameter_mm?: number;
  width_mm?: number;
  height_mm?: number;
  length_mm?: number;
  torque_nm?: number;
  bending_moment_nm?: number;
  material?: "steel" | "stainless" | "aluminum" | "titanium";
  end_condition?: "fixed_fixed" | "fixed_free";
}

export interface TorsionBarResult {
  shear_stress: AtomicValue;
  angle_of_twist: AtomicValue;
  torsional_stiffness: AtomicValue;
  polar_moment: AtomicValue;
  von_mises_stress: AtomicValue;
  safety_factor_yield: AtomicValue;
  safety_factor_fatigue: AtomicValue;
  weight: AtomicValue;
  energy_stored: AtomicValue;
  max_torque_capacity: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [G_GPa, yield_MPa, density_kg_m3, endurance_shear_MPa] */
const MAT_TORSION: Record<string, [number, number, number, number]> = {
  steel:     [80,  250, 7850, 140],
  stainless: [77,  215, 7980, 120],
  aluminum:  [26,  150, 2700, 70],
  titanium:  [44,  880, 4510, 300],
};

// ── Engine ─────────────────────────────────────────────────────────

export class TorsionBarEngine {
  calculate(input: TorsionBarInput): TorsionBarResult {
    const warnings: string[] = [];
    const section = input.section ?? "solid_round";
    const D = input.outer_diameter_mm ?? 25;
    const d = input.inner_diameter_mm ?? 0;
    const w = input.width_mm ?? 25;
    const h = input.height_mm ?? 25;
    const L = input.length_mm ?? 500;
    const T = input.torque_nm ?? 100;
    const Mb = input.bending_moment_nm ?? 0;
    const matKey = input.material ?? "steel";

    const [G, sigY, rho, tauEnd] = MAT_TORSION[matKey] ?? MAT_TORSION.steel;
    const tauY = sigY * 0.577; // von Mises shear yield

    // Polar moment of inertia and max radius
    let J: number; // mm⁴
    let r: number; // mm (max distance from center)
    let area: number; // mm²
    let alpha = 1.0; // torsion constant factor for non-circular

    if (section === "solid_round") {
      J = Math.PI * Math.pow(D, 4) / 32;
      r = D / 2;
      area = Math.PI * D * D / 4;
    } else if (section === "hollow_round") {
      J = Math.PI * (Math.pow(D, 4) - Math.pow(d, 4)) / 32;
      r = D / 2;
      area = Math.PI * (D * D - d * d) / 4;
    } else if (section === "square") {
      // Torsion of square: τ_max = T/(0.208×a³), J_eff = 0.1406×a⁴
      const a = w;
      J = 0.1406 * Math.pow(a, 4);
      r = a / 2;
      area = a * a;
      alpha = 0.208;
    } else {
      // Rectangular: τ_max = T/(α×a×b²), approximate
      const a = Math.max(w, h);
      const b = Math.min(w, h);
      const ratio = a / b;
      alpha = 1 / 3 * (1 - 0.63 * (b / a));
      J = alpha * a * Math.pow(b, 3);
      r = b / 2;
      area = a * b;
    }

    // Shear stress (MPa)
    const tau = section.includes("round") ?
      T * 1000 * r / J : // T in N·mm, J in mm⁴
      T * 1000 / (alpha * Math.pow(Math.min(w, h), 2) * Math.max(w, h));

    // Angle of twist (radians, then degrees)
    const Gpa = G * 1e3; // GPa → MPa
    const phiRad = T * 1000 * L / (Gpa * J);
    const phiDeg = phiRad * 180 / Math.PI;

    // Torsional stiffness
    const kT = Gpa * J / L; // N·mm/rad → N·m/rad ÷ 1000

    // Bending stress (if combined)
    const I = section.includes("round") ? J / 2 : w * h * h * h / 12;
    const sigmaBend = Mb > 0 ? Mb * 1000 * r / I : 0;

    // Von Mises equivalent
    const sigmaEq = Math.sqrt(sigmaBend * sigmaBend + 3 * tau * tau);

    // Safety factors
    const sfYield = tauY / Math.max(tau, 0.1);
    const sfFatigue = tauEnd / Math.max(tau, 0.1);

    // Weight
    const vol = area * L / 1e9; // mm³ → m³
    const weight = vol * rho;

    // Stored energy
    const energy = 0.5 * T * phiRad; // Joules (T in N·m, phi in rad)

    // Max torque capacity (at yield)
    const Tmax = section.includes("round") ?
      tauY * J / (r * 1000) : tauY * alpha * Math.pow(Math.min(w, h), 2) * Math.max(w, h) / 1000;

    // Warnings
    if (sfYield < 1.5) {
      warnings.push(`Yield SF ${r1(sfYield)} < 1.5 — increase diameter or upgrade material`);
    }
    if (sfFatigue < 2.0) {
      warnings.push(`Fatigue SF ${r1(sfFatigue)} < 2.0 — reduce torque or increase section`);
    }
    if (phiDeg > 5) {
      warnings.push(`Twist angle ${r1(phiDeg)}° > 5° — may affect function`);
    }
    if (section === "hollow_round" && d / D > 0.9) {
      warnings.push(`Wall ratio d/D=${r2(d / D)} > 0.9 — very thin wall, local buckling risk`);
    }
    if (section === "rectangular" && w / h > 10) {
      warnings.push("High aspect ratio — warping effects significant");
    }

    const src = "TorsionBarEngine (Roark/Shigley)";

    return {
      shear_stress: mkAv(r1(tau), "MPa", tau * 0.03, `Tr/J ${section}`),
      angle_of_twist: mkAv(r2(phiDeg), "°", phiDeg * 0.03,
        `TL/(GJ) L=${L}mm`),
      torsional_stiffness: mkAv(r0(kT / 1000), "N·m/rad", kT / 1000 * 0.03,
        `GJ/L`),
      polar_moment: mkAv(r0(J), "mm⁴", J * 0.01, section),
      von_mises_stress: mkAv(r1(sigmaEq), "MPa", sigmaEq * 0.05,
        `√(σ²+3τ²)`),
      safety_factor_yield: mkAv(r2(sfYield), "×", sfYield * 0.05,
        `τ_y/τ`),
      safety_factor_fatigue: mkAv(r2(sfFatigue), "×", sfFatigue * 0.1,
        `τ_end/τ`),
      weight: mkAv(r2(weight), "kg", weight * 0.02, `${matKey} ${section}`),
      energy_stored: mkAv(r2(energy), "J", energy * 0.05, `½Tφ`),
      max_torque_capacity: mkAv(r0(Tmax), "N·m", Tmax * 0.05, src),
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

export const torsionBarEngine = new TorsionBarEngine();
