/**
 * LinearGuideEngine — Linear Guide Rail Sizing & Life Calculator
 *
 * Calculates linear guide specifications:
 * - Dynamic load rating selection
 * - L10 life from load and travel
 * - Preload class for stiffness vs friction
 * - Number of carriages needed
 * - Static moment capacity
 * - Guide rail accuracy grade
 *
 * Key physics: L10 = (C/P)³ × 50km for ball type,
 * (C/P)^(10/3) × 100km for roller type. Equivalent load
 * considers radial, reverse radial, and lateral forces.
 * Moment loads from offset CG reduce life significantly.
 *
 * Reference: THK linear guide catalog (CAT.No.609-1),
 *            HIWIN technical documentation,
 *            NSK linear guide engineering guide
 *
 * Actions: linear_guide_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface LinearGuideInput {
  guide_type?: "ball" | "roller";
  guide_size?: number;
  load_radial_n?: number;
  load_lateral_n?: number;
  load_reverse_n?: number;
  moment_nm?: number;
  travel_per_cycle_mm?: number;
  cycles_per_min?: number;
  carriages_per_rail?: number;
  carriage_spacing_mm?: number;
  accuracy_grade?: "normal" | "high" | "precision" | "super_precision";
  preload?: "none" | "light" | "medium" | "heavy";
  environment?: "clean" | "normal" | "dirty" | "wet";
}

export interface LinearGuideResult {
  equivalent_load: AtomicValue;
  min_dynamic_rating: AtomicValue;
  l10_life_km: AtomicValue;
  l10_life_hours: AtomicValue;
  static_safety_factor: AtomicValue;
  recommended_size: AtomicValue;
  stiffness: AtomicValue;
  friction_force: AtomicValue;
  accuracy_travel: AtomicValue;
  seal_recommendation: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Dynamic load ratings (kN) by size for ball type */
const BALL_RATINGS: Record<number, { C: number; C0: number }> = {
  15: { C: 17.2, C0: 23.5 },
  20: { C: 25.5, C0: 37.3 },
  25: { C: 34.3, C0: 52.0 },
  30: { C: 45.7, C0: 72.0 },
  35: { C: 56.1, C0: 90.2 },
  45: { C: 80.4, C0: 132.0 },
  55: { C: 108.0, C0: 181.0 },
  65: { C: 143.0, C0: 245.0 },
};

const ROLLER_RATINGS: Record<number, { C: number; C0: number }> = {
  15: { C: 28.6, C0: 48.5 },
  20: { C: 42.3, C0: 76.0 },
  25: { C: 56.8, C0: 105.0 },
  30: { C: 76.2, C0: 148.0 },
  35: { C: 94.1, C0: 185.0 },
  45: { C: 134.0, C0: 272.0 },
  55: { C: 181.0, C0: 372.0 },
  65: { C: 238.0, C0: 502.0 },
};

/** Accuracy grade: travel deviation per 1000mm (µm) */
const ACCURACY_DEV: Record<string, number> = {
  normal: 30,
  high: 15,
  precision: 5,
  super_precision: 2,
};

/** Friction coefficient by preload */
const FRICTION_COEFF: Record<string, number> = {
  none: 0.002,
  light: 0.004,
  medium: 0.008,
  heavy: 0.012,
};

// ── Engine ─────────────────────────────────────────────────────────

export class LinearGuideEngine {
  calculate(input: LinearGuideInput): LinearGuideResult {
    const warnings: string[] = [];
    const gType = input.guide_type ?? "ball";
    const radial = input.load_radial_n ?? 2000;
    const lateral = input.load_lateral_n ?? 500;
    const reverse = input.load_reverse_n ?? 200;
    const moment = input.moment_nm ?? 0;
    const travelCycle = input.travel_per_cycle_mm ?? 500;
    const cyclesMin = input.cycles_per_min ?? 10;
    const nCarriages = input.carriages_per_rail ?? 2;
    const accGrade = input.accuracy_grade ?? "high";
    const preload = input.preload ?? "light";
    const env = input.environment ?? "normal";

    // Equivalent load per carriage
    // P = (radial + lateral×1.2 + reverse×0.5) / nCarriages
    const loadPerCarriage = (radial + lateral * 1.2 + reverse * 0.5
      + moment * 10) / nCarriages;
    const P_kN = loadPerCarriage / 1000;

    // Required dynamic rating for target life (50,000 km)
    const targetLife = 50000; // km
    const lifeExp = gType === "roller" ? 10 / 3 : 3;
    const baseLife = gType === "roller" ? 100 : 50; // km
    const reqC = P_kN * Math.pow(targetLife / baseLife, 1 / lifeExp);

    // Find minimum guide size
    const ratings = gType === "roller" ? ROLLER_RATINGS : BALL_RATINGS;
    const sizes = Object.keys(ratings).map(Number).sort((a, b) => a - b);
    let recSize = input.guide_size ?? 25;
    if (!input.guide_size) {
      for (const s of sizes) {
        if (ratings[s].C >= reqC) {
          recSize = s;
          break;
        }
      }
    }

    const rating = ratings[recSize] ?? ratings[25];
    const C_kN = rating.C;
    const C0_kN = rating.C0;

    // L10 life
    const L10_km = C_kN > 0 && P_kN > 0
      ? Math.pow(C_kN / P_kN, lifeExp) * baseLife : 999999;

    // L10 in hours
    const travelPerMin = travelCycle * cyclesMin * 2 / 1000; // m/min (×2 for return)
    const travelPerHour = travelPerMin * 60 / 1000; // km/hr
    const L10_hours = travelPerHour > 0
      ? L10_km / travelPerHour : 999999;

    // Static safety factor
    const staticLoad = (radial + lateral + reverse) / nCarriages / 1000;
    const s0 = staticLoad > 0 ? C0_kN / staticLoad : 999;

    // Stiffness (N/µm) — approximate by size
    const stiffness = recSize * (gType === "roller" ? 2.0 : 1.2)
      * (preload === "heavy" ? 1.5 : preload === "medium" ? 1.2 : 1.0);

    // Friction force
    const mu = FRICTION_COEFF[preload] ?? 0.004;
    const frictionForce = (radial + reverse) * mu;

    // Accuracy
    const accDev = ACCURACY_DEV[accGrade] ?? 15;

    // Seal recommendation
    let sealRec: string;
    if (env === "dirty" || env === "wet") sealRec = "double_lip_seal";
    else if (env === "normal") sealRec = "standard_seal";
    else sealRec = "light_seal";

    // Warnings
    if (L10_hours < 20000) {
      warnings.push(
        `Guide life ${r0(L10_hours)}h is short — ` +
        "increase guide size or reduce load"
      );
    }
    if (s0 < 3) {
      warnings.push(
        `Static safety factor ${r1(s0)} below 3 — ` +
        "risk of permanent deformation under shock"
      );
    }
    if (moment > 0 && nCarriages < 2) {
      warnings.push(
        "Moment load with single carriage — " +
        "add second carriage or widen spacing"
      );
    }
    if (env === "dirty" && preload === "none") {
      warnings.push(
        "Dirty environment without preload — " +
        "contamination may cause stick-slip"
      );
    }
    if (gType === "ball" && P_kN > C_kN * 0.5) {
      warnings.push(
        "Load >50% of ball guide rating — " +
        "consider roller type for higher capacity"
      );
    }

    return {
      equivalent_load: mkAv(r1(P_kN * 1000), "N", 10,
        `Per carriage, ${nCarriages} carriages`),
      min_dynamic_rating: mkAv(r1(reqC), "kN", 0.5,
        `For ${targetLife}km life`),
      l10_life_km: mkAv(r0(Math.min(L10_km, 999999)), "km", 100,
        `(${r1(C_kN)}/${r2(P_kN)})^${r1(lifeExp)} × ${baseLife}`),
      l10_life_hours: mkAv(r0(Math.min(L10_hours, 999999)), "hours", 500,
        `${r0(L10_km)}km / ${r2(travelPerHour)}km/hr`),
      static_safety_factor: mkAv(r1(Math.min(s0, 999)), "ratio", 0.2,
        `C₀ / P_static`),
      recommended_size: mkAv(recSize, "mm", 0,
        `${gType} type, C≥${r1(reqC)}kN`),
      stiffness: mkAv(r0(stiffness), "N/µm", 2,
        `Size ${recSize}, ${preload} preload`),
      friction_force: mkAv(r1(frictionForce), "N", 0.5,
        `µ=${mu}, total load`),
      accuracy_travel: mkAv(accDev, "µm/1000mm", 0,
        `${accGrade} grade`),
      seal_recommendation: mkAv(0, sealRec, 0,
        `${env} environment`),
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

export const linearGuideEngine = new LinearGuideEngine();
