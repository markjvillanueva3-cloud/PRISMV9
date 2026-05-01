/**
 * CriticalSpeedEngine — Rotating Shaft Critical Speed Calculator
 *
 * Models: Lateral critical speed of rotating shafts.
 * - Rayleigh-Ritz single-span estimation
 * - Dunkerley method for multiple masses
 * - Shaft whirl and deflection
 * - Operating speed ratio and separation margin
 * - Bearing stiffness effect
 * - Multi-span approximation
 *
 * Key physics: ω_n = √(g/δ_st) for single mass.
 * Dunkerley: 1/ω² = Σ(1/ωi²).
 * Rayleigh: ω² = g×Σ(mi×yi) / Σ(mi×yi²).
 *
 * Reference: Vance — Rotordynamics of Turbomachinery,
 *            API 610/617 — Separation Margins,
 *            ISO 10814 — Mechanical Vibration
 *
 * Actions: critical_speed_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface CriticalSpeedInput {
  shaft_diameter_mm?: number;
  shaft_length_mm?: number;
  shaft_material_e_gpa?: number;
  shaft_density_kg_m3?: number;
  disk_mass_kg?: number;
  disk_position_ratio?: number;
  operating_rpm?: number;
  bearing_stiffness_n_um?: number;
  support_type?: "simply_supported" | "cantilever" | "fixed_fixed";
  num_disks?: number;
}

export interface CriticalSpeedResult {
  first_critical_rpm: AtomicValue;
  second_critical_rpm: AtomicValue;
  static_deflection: AtomicValue;
  speed_ratio: AtomicValue;
  separation_margin: AtomicValue;
  shaft_whirl_mode: AtomicValue;
  natural_frequency_hz: AtomicValue;
  shaft_stiffness: AtomicValue;
  bearing_influence: AtomicValue;
  api_compliant: AtomicValue;
  warnings: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class CriticalSpeedEngine {
  calculate(input: CriticalSpeedInput): CriticalSpeedResult {
    const warnings: string[] = [];
    const d = input.shaft_diameter_mm ?? 50;
    const L = input.shaft_length_mm ?? 800;
    const E = (input.shaft_material_e_gpa ?? 200) * 1000; // MPa
    const rhoS = input.shaft_density_kg_m3 ?? 7850;
    const mDisk = input.disk_mass_kg ?? 10;
    const posRatio = input.disk_position_ratio ?? 0.5;
    const opRpm = input.operating_rpm ?? 3000;
    const kBrg = input.bearing_stiffness_n_um ?? 100;
    const support = input.support_type ?? "simply_supported";
    const nDisks = input.num_disks ?? 1;

    const g = 9810; // mm/s²

    // Shaft properties
    const I = Math.PI / 64 * Math.pow(d, 4); // mm⁴
    const A = Math.PI / 4 * d * d; // mm²
    const mShaft = rhoS * A * L / 1e9; // kg

    // Support coefficients
    let Csup: number;
    let C2: number;
    if (support === "cantilever") {
      Csup = 3.515;
      C2 = 22.03;
    } else if (support === "fixed_fixed") {
      Csup = 22.37;
      C2 = 61.67;
    } else {
      Csup = 9.87; // π²
      C2 = 39.48; // 4π²
    }

    // Shaft-only critical (no disk)
    const omegaShaft = Csup * Math.sqrt(E * I
      / (rhoS * A / 1e9 * Math.pow(L, 4)));

    // Static deflection at disk position (simply supported)
    const a = posRatio * L;
    const b = L - a;
    let deltaStatic: number;
    if (support === "cantilever") {
      deltaStatic = mDisk * g * a * a * (3 * L - a)
        / (6 * E * I);
    } else {
      deltaStatic = mDisk * g * a * a * b * b
        / (3 * E * I * L);
    }

    // Disk critical speed (single disk)
    const omegaDisk = deltaStatic > 0
      ? Math.sqrt(g / deltaStatic)
      : omegaShaft;

    // Dunkerley combination
    const omega1sq = 1 / (1 / (omegaShaft * omegaShaft)
      + nDisks / (omegaDisk * omegaDisk));
    const omega1 = Math.sqrt(omega1sq);

    // Bearing stiffness influence
    const kShaft = 48 * E * I / Math.pow(L, 3); // N/mm
    const kBrgTotal = kBrg * 1000 * 2; // N/mm (2 bearings)
    const kEff = 1 / (1 / kShaft + 1 / kBrgTotal);
    const brgRatio = kEff / kShaft;

    // Adjusted first critical
    const omega1adj = omega1 * Math.sqrt(brgRatio);
    const nc1 = omega1adj * 60 / (2 * Math.PI); // RPM

    // Second critical (approximate)
    const nc2 = C2 / Csup * nc1;

    // Natural frequency
    const fn = nc1 / 60; // Hz

    // Speed ratio
    const speedRatio = opRpm / Math.max(nc1, 1);

    // Separation margin (API requires > 15-20%)
    const sepMargin = Math.abs(nc1 - opRpm)
      / Math.max(nc1, 1) * 100;

    // API compliance (>20% margin from critical)
    const apiOk = sepMargin > 20;

    // Whirl mode
    let whirlMode: string;
    if (speedRatio < 0.7) whirlMode = "subcritical";
    else if (speedRatio < 1.3) whirlMode = "near_resonance";
    else whirlMode = "supercritical";

    // Warnings
    if (sepMargin < 15) {
      warnings.push(
        `Separation margin ${r0(sepMargin)}% < 15% — resonance risk`
      );
    }
    if (speedRatio > 0.8 && speedRatio < 1.2) {
      warnings.push(
        `Operating near 1st critical — high vibration expected`
      );
    }
    if (brgRatio < 0.5) {
      warnings.push(
        "Bearing stiffness dominates — stiffer bearings needed"
      );
    }
    if (deltaStatic > L / 1000) {
      warnings.push(
        `Static deflection ${r2(deltaStatic)}mm excessive`
      );
    }
    if (L / d > 30) {
      warnings.push(
        `L/d ratio ${r0(L / d)} > 30 — very flexible shaft`
      );
    }
    if (!apiOk) {
      warnings.push("Does not meet API 20% separation margin");
    }

    const src = "CriticalSpeedEngine (Vance/API)";

    return {
      first_critical_rpm: mkAv(r0(nc1), "RPM",
        nc1 * 0.1, "Dunkerley+bearing"),
      second_critical_rpm: mkAv(r0(nc2), "RPM",
        nc2 * 0.15, "mode 2 approx"),
      static_deflection: mkAv(r3(deltaStatic), "mm",
        deltaStatic * 0.1, support),
      speed_ratio: mkAv(r2(speedRatio), "×", 0,
        `N_op/N_c1`),
      separation_margin: mkAv(r0(sepMargin), "%",
        sepMargin * 0.05, "API 610/617"),
      shaft_whirl_mode: mkAv(
        whirlMode === "subcritical" ? 1
          : whirlMode === "near_resonance" ? 2 : 3,
        whirlMode, 0, src),
      natural_frequency_hz: mkAv(r1(fn), "Hz",
        fn * 0.1, `nc1/60`),
      shaft_stiffness: mkAv(r0(kShaft), "N/mm",
        kShaft * 0.05, `48EI/L³`),
      bearing_influence: mkAv(r2(brgRatio), "×",
        brgRatio * 0.1, `k_eff/k_shaft`),
      api_compliant: mkAv(apiOk ? 1 : 0,
        apiOk ? "PASS" : "FAIL", 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const criticalSpeedEngine = new CriticalSpeedEngine();
