/**
 * ColumnBucklingEngine — Euler & Johnson Column Buckling Calculator
 *
 * Models: Compression member buckling analysis.
 * - Euler critical load: Pcr = π²EI/(KL)²
 * - Johnson parabola for short columns
 * - Slenderness ratio and effective length
 * - Eccentricity effects (secant formula)
 * - Various end conditions (K factors)
 * - AISC allowable stress
 *
 * Key physics: Pcr = π²EI/(KL)². λ = KL/r. Johnson: Pcr = A(σy - σy²λ²/(4π²E)).
 * Transition at λ_c = √(2π²E/σy).
 *
 * Reference: Timoshenko — Theory of Elastic Stability,
 *            AISC Steel Construction Manual,
 *            Euler — Column Theory
 *
 * Actions: column_buckling_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface ColumnBucklingInput {
  section?: "solid_round" | "hollow_round" | "i_beam" | "rectangular" | "channel";
  outer_dimension_mm?: number;
  inner_dimension_mm?: number;
  width_mm?: number;
  height_mm?: number;
  wall_thickness_mm?: number;
  length_mm?: number;
  end_condition?: "pinned_pinned" | "fixed_free" | "fixed_pinned" | "fixed_fixed";
  material?: "steel" | "stainless" | "aluminum" | "timber";
  applied_load_n?: number;
  eccentricity_mm?: number;
}

export interface ColumnBucklingResult {
  euler_critical_load: AtomicValue;
  johnson_critical_load: AtomicValue;
  governing_load: AtomicValue;
  slenderness_ratio: AtomicValue;
  transition_slenderness: AtomicValue;
  effective_length: AtomicValue;
  radius_of_gyration: AtomicValue;
  safety_factor: AtomicValue;
  allowable_stress: AtomicValue;
  column_type: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

const K_FACTORS: Record<string, number> = {
  pinned_pinned: 1.0,
  fixed_free: 2.0,
  fixed_pinned: 0.7,
  fixed_fixed: 0.5,
};

/** [E_GPa, yield_MPa, density_kg_m3] */
const MAT_COL: Record<string, [number, number, number]> = {
  steel:     [200, 250, 7850],
  stainless: [193, 215, 7980],
  aluminum:  [69,  270, 2700],
  timber:    [12,  40,  600],
};

// ── Engine ─────────────────────────────────────────────────────────

export class ColumnBucklingEngine {
  calculate(input: ColumnBucklingInput): ColumnBucklingResult {
    const warnings: string[] = [];
    const section = input.section ?? "solid_round";
    const D = input.outer_dimension_mm ?? 50;
    const d = input.inner_dimension_mm ?? 0;
    const w = input.width_mm ?? 50;
    const h = input.height_mm ?? 100;
    const tw = input.wall_thickness_mm ?? 5;
    const L = input.length_mm ?? 2000;
    const matKey = input.material ?? "steel";
    const endCond = input.end_condition ?? "pinned_pinned";
    const Papplied = input.applied_load_n ?? 50000;
    const ecc = input.eccentricity_mm ?? 0;

    const K = K_FACTORS[endCond] ?? 1.0;
    const [E_GPa, sigY, rho] = MAT_COL[matKey] ?? MAT_COL.steel;
    const E = E_GPa * 1000; // GPa → MPa

    // Section properties (I, A, r)
    let I: number, A: number;
    if (section === "solid_round") {
      I = Math.PI * Math.pow(D, 4) / 64;
      A = Math.PI * D * D / 4;
    } else if (section === "hollow_round") {
      I = Math.PI * (Math.pow(D, 4) - Math.pow(d, 4)) / 64;
      A = Math.PI * (D * D - d * d) / 4;
    } else if (section === "rectangular") {
      // Buckling about weak axis
      I = Math.min(w, h) * Math.pow(Math.min(w, h), 3) / 12;
      // Use weak axis
      const bWeak = Math.min(w, h);
      I = Math.max(w, h) * Math.pow(bWeak, 3) / 12;
      A = w * h;
    } else {
      // I-beam/channel approximated as rectangle with flanges
      I = w * Math.pow(h, 3) / 12 - (w - tw) * Math.pow(h - 2 * tw, 3) / 12;
      A = w * h - (w - tw) * (h - 2 * tw);
    }

    const r = Math.sqrt(I / A); // radius of gyration mm
    const Le = K * L; // effective length

    // Slenderness ratio
    const lambda = Le / r;

    // Transition slenderness (Euler-Johnson boundary)
    const lambdaC = Math.sqrt(2 * Math.PI * Math.PI * E / sigY);

    // Euler critical load
    const Pcr_euler = Math.PI * Math.PI * E * I / (Le * Le); // N

    // Johnson critical load
    const Pcr_johnson = A * (sigY - sigY * sigY * lambda * lambda /
      (4 * Math.PI * Math.PI * E));

    // Governing load
    const isLong = lambda > lambdaC;
    const Pcr = isLong ? Pcr_euler : Math.max(Pcr_johnson, 0);
    const columnType = lambda < 30 ? "short" : isLong ? "long" : "intermediate";

    // Safety factor
    const SF = Pcr / Math.max(Papplied, 1);

    // Allowable stress (AISC: Fa = Pcr / (A × FS), FS ≈ 1.67-1.92)
    const FS = 1.67 + 0.25 * (lambda / lambdaC);
    const Fa = Pcr / (A * Math.min(FS, 1.92));

    // Eccentricity effect (secant formula)
    if (ecc > 0) {
      const secant = 1 / Math.cos(Math.sqrt(Papplied / (E * I)) * Le / 2);
      const sigMax = (Papplied / A) * (1 + ecc * r / (I / A) * secant);
      if (sigMax > sigY) {
        warnings.push(`Eccentric stress ${r0(sigMax)}MPa exceeds yield — reduce eccentricity`);
      }
    }

    // Warnings
    if (SF < 2) {
      warnings.push(`Buckling SF ${r1(SF)} < 2.0 — increase section or add bracing`);
    }
    if (lambda > 200) {
      warnings.push(`Slenderness ${r0(lambda)} > 200 — AISC limit, column too slender`);
    }
    if (columnType === "short") {
      warnings.push("Short column — yielding governs over buckling");
    }

    const src = "ColumnBucklingEngine (Euler/AISC)";

    return {
      euler_critical_load: mkAv(r0(Pcr_euler), "N", Pcr_euler * 0.05,
        `π²EI/(KL)²`),
      johnson_critical_load: mkAv(r0(Math.max(Pcr_johnson, 0)), "N",
        Math.max(Pcr_johnson, 0) * 0.05, "Johnson parabola"),
      governing_load: mkAv(r0(Pcr), "N", Pcr * 0.05,
        isLong ? "Euler governs" : "Johnson governs"),
      slenderness_ratio: mkAv(r0(lambda), "λ", lambda * 0.02,
        `KL/r = ${r0(Le)}/${r1(r)}`),
      transition_slenderness: mkAv(r0(lambdaC), "λc", 0,
        `√(2π²E/σy)`),
      effective_length: mkAv(r0(Le), "mm", 0,
        `K=${K} × ${L}mm ${endCond}`),
      radius_of_gyration: mkAv(r1(r), "mm", r * 0.01, section),
      safety_factor: mkAv(r1(SF), "×", SF * 0.05,
        `Pcr/P = ${r0(Pcr)}/${Papplied}`),
      allowable_stress: mkAv(r0(Fa), "MPa", Fa * 0.05,
        `AISC FS=${r2(Math.min(FS, 1.92))}`),
      column_type: mkAv(
        columnType === "short" ? 1 : columnType === "intermediate" ? 2 : 3,
        columnType, 0, `λ=${r0(lambda)} vs λc=${r0(lambdaC)}`),
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

export const columnBucklingEngine = new ColumnBucklingEngine();
