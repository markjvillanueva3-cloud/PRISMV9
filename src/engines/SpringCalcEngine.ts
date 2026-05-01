/**
 * SpringCalcEngine — Helical Compression Spring Calculator
 *
 * Models: Spring rate, stress, fatigue life, buckling, resonance.
 * - Spring rate k = Gd⁴/(8D³Na) (Wahl correction)
 * - Shear stress τ = Kw × 8FD/(πd³)
 * - Solid height, free length, deflection
 * - Buckling check (critical free length)
 * - Surge frequency = (d/(2πD²Na)) × √(Gg/32ρ)
 * - Goodman fatigue analysis
 *
 * Reference: SMI Spring Design Manual,
 *            Shigley Ch.10 (Mechanical Springs),
 *            DIN EN 13906-1 (Helical compression springs)
 *
 * Actions: spring_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SpringCalcInput {
  wire_diameter_mm?: number;
  mean_coil_diameter_mm?: number;
  active_coils?: number;
  total_coils?: number;
  free_length_mm?: number;
  load_installed_n?: number;
  load_working_n?: number;
  material?: "music_wire" | "chrome_vanadium" | "chrome_silicon" | "stainless_302" | "inconel_x750";
  end_type?: "closed_ground" | "closed_unground" | "open" | "open_ground";
  operating_temp_c?: number;
  fatigue_cycles?: number;
}

export interface SpringCalcResult {
  spring_rate: AtomicValue;
  spring_index: AtomicValue;
  wahl_factor: AtomicValue;
  stress_at_working: AtomicValue;
  stress_at_solid: AtomicValue;
  solid_height: AtomicValue;
  deflection_at_working: AtomicValue;
  natural_frequency: AtomicValue;
  buckling_critical_ratio: AtomicValue;
  fatigue_safety_factor: AtomicValue;
  spring_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Material properties: [shear_modulus_GPa, tensile_strength_coeff_A, exponent_m, density_kg_m3, max_temp_c] */
const MATERIALS: Record<string, [number, number, number, number, number]> = {
  music_wire:      [80.0, 2211, 0.145, 7850, 120],
  chrome_vanadium: [77.2, 2005, 0.168, 7850, 220],
  chrome_silicon:  [77.2, 1974, 0.108, 7850, 250],
  stainless_302:   [69.0, 1867, 0.146, 7920, 290],
  inconel_x750:    [79.3, 2160, 0.110, 8250, 590],
};

/** Dead coils by end type */
const DEAD_COILS: Record<string, number> = {
  closed_ground: 2,
  closed_unground: 2,
  open: 0,
  open_ground: 1,
};

// ── Engine ─────────────────────────────────────────────────────────

export class SpringCalcEngine {
  calculate(input: SpringCalcInput): SpringCalcResult {
    const warnings: string[] = [];
    const d = input.wire_diameter_mm ?? 3;
    const D = input.mean_coil_diameter_mm ?? 20;
    const endType = input.end_type ?? "closed_ground";
    const matKey = input.material ?? "music_wire";
    const mat = MATERIALS[matKey] ?? MATERIALS.music_wire;

    const G = mat[0] * 1000; // GPa → MPa
    const density = mat[3];
    const maxTemp = mat[4];

    // Active coils
    const deadCoils = DEAD_COILS[endType] ?? 2;
    const totalCoils = input.total_coils ?? (input.active_coils ? input.active_coils + deadCoils : 10);
    const Na = input.active_coils ?? (totalCoils - deadCoils);

    // Spring index C = D/d
    const C_idx = D / d;

    // Wahl correction factor: Kw = (4C-1)/(4C-4) + 0.615/C
    const Kw = (4 * C_idx - 1) / (4 * C_idx - 4) + 0.615 / C_idx;

    // Spring rate: k = Gd⁴ / (8D³Na)
    const k = (G * d ** 4) / (8 * D ** 3 * Na); // N/mm

    // Solid height
    const solidH = totalCoils * d;

    // Free length (default: solid + 20% travel)
    const freeLen = input.free_length_mm ?? (solidH + Na * d * 0.4);

    // Loads & deflection
    const F_work = input.load_working_n ?? (k * (freeLen - solidH) * 0.6);
    const defl_work = F_work / k;
    const F_solid = k * (freeLen - solidH);

    // Shear stress at working load: τ = Kw × 8FD / (πd³)
    const tau_work = Kw * 8 * F_work * D / (Math.PI * d ** 3);
    const tau_solid = Kw * 8 * F_solid * D / (Math.PI * d ** 3);

    // Tensile strength approximation: Sut = A / d^m
    const Sut = mat[1] / (d ** mat[2]);
    // Allowable shear stress ≈ 0.45 × Sut (static), 0.35 × Sut (fatigue)
    const tauAllow = 0.45 * Sut;

    // Natural frequency (Hz): fn = (d / (2π D² Na)) × √(G×1e6 × g / (32 × ρ))
    // Simplified: fn = (d × √(G×1e3)) / (2π × D² × Na × √(32×ρ)) × 1000
    const fn = (d / (2 * Math.PI * D * D * Na * 1e-3)) *
      Math.sqrt((G * 1e6) / (32 * density)) * 1e-3;

    // Buckling: critical ratio L_free / D
    // Spring buckles if L_free/D > 4 (approx for fixed-free, μ=0.5)
    const bucklingRatio = freeLen / D;

    // Fatigue (Goodman) — simplified
    const F_inst = input.load_installed_n ?? F_work * 0.3;
    const tauA = Kw * 8 * (F_work - F_inst) * D / (2 * Math.PI * d ** 3); // alternating
    const tauM = Kw * 8 * (F_work + F_inst) * D / (2 * Math.PI * d ** 3); // mean
    const Se = 0.35 * Sut; // endurance limit
    const Ssu = 0.67 * Sut; // ultimate shear
    const fatigueSF = tauA > 0 ? 1 / (tauA / Se + tauM / Ssu) : 99;

    // Temperature derating
    const opTemp = input.operating_temp_c ?? 20;

    // Feasibility
    const feasible =
      tau_solid < tauAllow &&
      C_idx >= 4 && C_idx <= 12 &&
      bucklingRatio < 5.2 &&
      fatigueSF > 1.0;

    // Warnings
    if (C_idx < 4) warnings.push(`Spring index ${r1(C_idx)} < 4 — difficult to manufacture`);
    if (C_idx > 12) warnings.push(`Spring index ${r1(C_idx)} > 12 — prone to tangling`);
    if (tau_solid > tauAllow) {
      warnings.push(`Solid stress ${r0(tau_solid)} MPa > allowable ${r0(tauAllow)} MPa — will set`);
    }
    if (bucklingRatio > 5.2) {
      warnings.push(`L/D ratio ${r1(bucklingRatio)} > 5.2 — spring may buckle, use guide`);
    }
    if (fatigueSF < 1.5 && fatigueSF > 0) {
      warnings.push(`Fatigue SF=${r2(fatigueSF)} < 1.5 — limited fatigue life`);
    }
    if (opTemp > maxTemp) {
      warnings.push(`${r0(opTemp)}°C exceeds ${matKey} limit of ${maxTemp}°C — use Inconel`);
    }

    const src = "SpringCalcEngine (SMI/Shigley/DIN 13906)";

    return {
      spring_rate: mkAv(r2(k), "N/mm", k * 0.05, `Gd⁴/(8D³Na)`),
      spring_index: mkAv(r2(C_idx), "ratio", 0, `D/d = ${D}/${d}`),
      wahl_factor: mkAv(r3(Kw), "factor", 0, `C=${r1(C_idx)}`),
      stress_at_working: mkAv(r0(tau_work), "MPa", 10, `Kw×8FD/(πd³) at ${r0(F_work)}N`),
      stress_at_solid: mkAv(r0(tau_solid), "MPa", 15, `At solid height ${r1(solidH)}mm`),
      solid_height: mkAv(r1(solidH), "mm", 0.5, `${totalCoils} × ${d}mm`),
      deflection_at_working: mkAv(r2(defl_work), "mm", 0.5, `F/k = ${r0(F_work)}/${r2(k)}`),
      natural_frequency: mkAv(r1(fn), "Hz", fn * 0.1, src),
      buckling_critical_ratio: mkAv(r2(bucklingRatio), "L/D", 0, `${r1(freeLen)}/${D}`),
      fatigue_safety_factor: mkAv(r2(Math.min(fatigueSF, 99)), "×", 0.1, "Goodman criterion"),
      spring_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const springCalcEngine = new SpringCalcEngine();
