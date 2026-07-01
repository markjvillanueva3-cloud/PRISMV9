/**
 * BearingSelectionEngine — Rolling Element Bearing Selection Calculator
 *
 * Models: Bearing sizing, L10 life, static capacity, speed limits.
 * - Dynamic load rating selection from catalog
 * - L10 life: L10 = (C/P)^p × 10⁶ revolutions
 * - Equivalent load: P = X×Fr + Y×Fa (radial + axial)
 * - Speed limit (ndm value)
 * - Lubrication requirement (viscosity ratio κ)
 * - Adjusted life aISO (contamination, reliability, lubrication)
 *
 * Reference: ISO 281 (rolling bearing life),
 *            SKF Rolling Bearings Catalog,
 *            NSK Technical Report
 *
 * Actions: bearing_selection_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface BearingSelectionInput {
  shaft_diameter_mm?: number;
  radial_load_n?: number;
  axial_load_n?: number;
  speed_rpm?: number;
  desired_life_hours?: number;
  bearing_type?: "deep_groove" | "angular_contact" | "cylindrical" | "tapered" | "spherical";
  reliability_pct?: number;
  contamination?: "clean" | "normal" | "contaminated" | "severe";
  lubrication?: "grease" | "oil_bath" | "oil_mist" | "oil_jet";
  operating_temp_c?: number;
}

export interface BearingSelectionResult {
  required_dynamic_rating: AtomicValue;
  equivalent_load: AtomicValue;
  l10_life_hours: AtomicValue;
  l10_life_revolutions: AtomicValue;
  adjusted_life_hours: AtomicValue;
  ndm_value: AtomicValue;
  min_bore_mm: AtomicValue;
  static_safety_factor: AtomicValue;
  relubrication_interval: AtomicValue;
  bearing_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Life exponent p: ball=3, roller=10/3 */
const LIFE_EXP: Record<string, number> = {
  deep_groove: 3,
  angular_contact: 3,
  cylindrical: 10 / 3,
  tapered: 10 / 3,
  spherical: 10 / 3,
};

/** X,Y factors for combined load (simplified, e/Fa ratio > e) */
const XY_FACTORS: Record<string, [number, number]> = {
  deep_groove: [0.56, 1.63],
  angular_contact: [0.57, 0.93],
  cylindrical: [1.0, 0],     // no axial capacity
  tapered: [0.4, 1.5],
  spherical: [0.67, 3.7],
};

/** ndm limit by type (bore_mm × RPM) */
const NDM_LIMIT: Record<string, number> = {
  deep_groove: 500000,
  angular_contact: 450000,
  cylindrical: 550000,
  tapered: 350000,
  spherical: 250000,
};

/** Reliability factor a1 */
const A1_FACTOR: Record<number, number> = {
  90: 1.0, 95: 0.64, 96: 0.55, 97: 0.47, 98: 0.37, 99: 0.25,
};

/** Contamination factor eC */
const EC_FACTOR: Record<string, number> = {
  clean: 1.0, normal: 0.6, contaminated: 0.3, severe: 0.1,
};

// ── Engine ─────────────────────────────────────────────────────────

export class BearingSelectionEngine {
  calculate(input: BearingSelectionInput): BearingSelectionResult {
    const warnings: string[] = [];
    const d = input.shaft_diameter_mm ?? 40;
    const Fr = input.radial_load_n ?? 5000;
    const Fa = input.axial_load_n ?? 0;
    const n = input.speed_rpm ?? 1500;
    const type = input.bearing_type ?? "deep_groove";
    const desiredLife = input.desired_life_hours ?? 20000;
    const reliPct = input.reliability_pct ?? 90;

    const p = LIFE_EXP[type] ?? 3;
    const [X, Y] = XY_FACTORS[type] ?? [0.56, 1.63];

    // Equivalent load
    const FaFrRatio = Fr > 0 ? Fa / Fr : 0;
    let P: number;
    if (type === "cylindrical" || Fa === 0) {
      P = Fr;
    } else if (FaFrRatio > 0.25) {
      P = X * Fr + Y * Fa;
    } else {
      P = Fr; // axial component negligible
    }

    // Required dynamic load rating for desired life
    // L10h = (C/P)^p × 10⁶ / (60×n)  →  C = P × (L10h × 60 × n / 10⁶)^(1/p)
    const reqRevs = desiredLife * 60 * n;
    const Creq = P * Math.pow(reqRevs / 1e6, 1 / p);

    // L10 life at the required C rating
    const l10Revs = Math.pow(Creq / P, p) * 1e6;
    const l10Hours = l10Revs / (60 * n);

    // Adjusted life (aISO)
    const a1 = closestA1(reliPct);
    const eC = EC_FACTOR[input.contamination ?? "normal"] ?? 0.6;
    // Simplified aISO = a1 × eC × lubrication_factor × L10
    const lubeFactor = input.lubrication === "oil_jet" ? 1.5 :
      input.lubrication === "oil_bath" ? 1.2 :
      input.lubrication === "oil_mist" ? 1.0 : 0.8;
    const adjustedLife = l10Hours * a1 * eC * lubeFactor;

    // ndm value
    const ndm = d * n;
    const ndmLimit = NDM_LIMIT[type] ?? 500000;

    // Static safety factor (C0/P0, target ≥ 1.0 for normal, ≥ 2.0 for shock)
    // Approximate C0 ≈ 0.6 × Creq for ball, 0.8 for roller
    const c0Factor = p === 3 ? 0.6 : 0.8;
    const C0 = Creq * c0Factor;
    const s0 = C0 / P;

    // Relubrication interval (simplified: grease life ∝ ndm)
    let relubHours = 0;
    if (input.lubrication === "grease" || !input.lubrication) {
      // SKF formula simplified: t = K × (ndm_limit/ndm)^2
      relubHours = Math.min(20000, 5000 * Math.pow(ndmLimit / Math.max(ndm, 1), 0.8));
    }

    // Temperature check
    const tempC = input.operating_temp_c ?? 70;

    // Feasibility
    const feasible = ndm <= ndmLimit && s0 >= 1.0 && adjustedLife >= desiredLife * 0.8;

    // Warnings
    if (ndm > ndmLimit) {
      warnings.push(`ndm=${r0(ndm)} exceeds ${r0(ndmLimit)} limit for ${type} — reduce speed or bore`);
    }
    if (s0 < 1.0) {
      warnings.push(`Static safety s0=${r2(s0)} < 1.0 — risk of brinelling`);
    }
    if (adjustedLife < desiredLife) {
      warnings.push(
        `Adjusted life ${r0(adjustedLife)}h < desired ${desiredLife}h — ` +
        "increase bearing size or improve lubrication"
      );
    }
    if (type === "cylindrical" && Fa > 0) {
      warnings.push("Cylindrical roller bearing cannot support axial load — use angular contact or tapered");
    }
    if (tempC > 120) {
      warnings.push(`Operating temp ${tempC}°C — standard grease limit ~120°C, use high-temp grease`);
    }
    if (relubHours > 0 && relubHours < 2000) {
      warnings.push(`Short relubrication interval ${r0(relubHours)}h — consider oil lubrication`);
    }

    const src = "BearingSelectionEngine (ISO 281/SKF)";

    return {
      required_dynamic_rating: mkAv(r0(Creq), "N", Creq * 0.05,
        `P=${r0(P)}N, L10=${desiredLife}h, p=${r1(p)}`),
      equivalent_load: mkAv(r0(P), "N", P * 0.03,
        `X=${X}×${Fr} + Y=${Y}×${Fa}`),
      l10_life_hours: mkAv(r0(l10Hours), "hours", l10Hours * 0.1, src),
      l10_life_revolutions: mkAv(r0(l10Revs), "rev", l10Revs * 0.1, src),
      adjusted_life_hours: mkAv(r0(adjustedLife), "hours", adjustedLife * 0.15,
        `a1=${a1}, eC=${eC}, lube=${r1(lubeFactor)}`),
      ndm_value: mkAv(r0(ndm), "mm·RPM", 0, `${d}mm × ${n}RPM`),
      min_bore_mm: mkAv(d, "mm", 0, "shaft diameter"),
      static_safety_factor: mkAv(r2(s0), "×", 0.1, `C0/P`),
      relubrication_interval: mkAv(r0(relubHours), "hours", relubHours * 0.2,
        relubHours > 0 ? "Grease, SKF simplified" : "Oil — continuous"),
      bearing_feasible: mkAv(feasible ? 1 : 0, feasible ? "PASS" : "FAIL", 0, src),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function closestA1(pct: number): number {
  const keys = [90, 95, 96, 97, 98, 99];
  let best = 90;
  for (const k of keys) {
    if (Math.abs(k - pct) < Math.abs(best - pct)) best = k;
  }
  return A1_FACTOR[best] ?? 1.0;
}

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }

export const bearingSelectionEngine = new BearingSelectionEngine();
