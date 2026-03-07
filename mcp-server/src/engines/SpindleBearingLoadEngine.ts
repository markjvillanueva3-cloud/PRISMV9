/**
 * SpindleBearingLoadEngine — Spindle Bearing Life & Load Calculator
 *
 * Calculates bearing performance metrics:
 * - L10 basic rating life (ISO 281)
 * - DN value (bore × RPM) for speed limits
 * - Equivalent dynamic load from radial + axial forces
 * - Preload class selection
 * - Lubrication adequacy (κ viscosity ratio)
 * - Adjusted life (a_ISO factor)
 *
 * Key physics: L10 = (C/P)^p × 10^6 revolutions, where C is
 * dynamic load rating, P is equivalent load, p = 3 for balls,
 * 10/3 for rollers. DN value limits: grease ≤ 1.0M, oil mist
 * ≤ 1.5M, oil-air ≤ 2.0M for angular contact bearings.
 *
 * Reference: ISO 281:2007 (Rolling bearings — Dynamic load ratings),
 *            SKF Bearing Selection Handbook,
 *            NSK Technical Report CAT.E1102
 *
 * Actions: spindle_bearing_load_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SpindleBearingLoadInput {
  bearing_type?: "angular_contact" | "cylindrical_roller"
    | "tapered_roller" | "deep_groove";
  bore_mm?: number;
  dynamic_load_rating_kn?: number;
  static_load_rating_kn?: number;
  radial_force_n?: number;
  axial_force_n?: number;
  spindle_rpm: number;
  contact_angle_deg?: number;
  preload_class?: "light" | "medium" | "heavy";
  lubrication?: "grease" | "oil_mist" | "oil_air" | "oil_jet";
  arrangement?: "db" | "df" | "dt" | "tandem";
  operating_temp_c?: number;
}

export interface SpindleBearingLoadResult {
  equivalent_load: AtomicValue;
  l10_life_hours: AtomicValue;
  l10_life_revolutions: AtomicValue;
  dn_value: AtomicValue;
  dn_limit: AtomicValue;
  speed_utilization: AtomicValue;
  preload_force: AtomicValue;
  lubrication_kappa: AtomicValue;
  adjusted_life_hours: AtomicValue;
  static_safety_factor: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Typical dynamic load ratings (kN) by bore size for angular contact */
const ANGULAR_CONTACT_C: Record<number, number> = {
  20: 12.7, 25: 17.8, 30: 22.5, 35: 29.1, 40: 34.0,
  45: 39.7, 50: 44.0, 55: 52.0, 60: 55.3, 65: 63.7,
  70: 68.9, 75: 72.1, 80: 80.9, 90: 95.6, 100: 108,
};

const CYLINDRICAL_ROLLER_C: Record<number, number> = {
  20: 21.6, 25: 30.0, 30: 38.0, 35: 46.2, 40: 56.1,
  45: 62.4, 50: 72.1, 55: 80.6, 60: 90.4, 65: 95.6,
  70: 108, 75: 117, 80: 127, 90: 150, 100: 173,
};

/** DN limits by lubrication type */
const DN_LIMITS: Record<string, Record<string, number>> = {
  angular_contact:    { grease: 1000000, oil_mist: 1500000, oil_air: 2000000, oil_jet: 2500000 },
  cylindrical_roller: { grease: 800000,  oil_mist: 1200000, oil_air: 1600000, oil_jet: 2000000 },
  tapered_roller:     { grease: 500000,  oil_mist: 800000,  oil_air: 1000000, oil_jet: 1300000 },
  deep_groove:        { grease: 900000,  oil_mist: 1400000, oil_air: 1800000, oil_jet: 2200000 },
};

/** Preload force as fraction of C0 */
const PRELOAD_FRACTION: Record<string, number> = {
  light: 0.01, medium: 0.03, heavy: 0.07,
};

/** X/Y factors for equivalent load by contact angle */
function getXY(angle: number, bearingType: string):
  { X: number; Y: number; e: number } {
  if (bearingType === "cylindrical_roller") {
    return { X: 1, Y: 0, e: 999 }; // pure radial
  }
  if (angle <= 15) return { X: 0.44, Y: 1.47, e: 0.3 };
  if (angle <= 25) return { X: 0.41, Y: 0.87, e: 0.68 };
  if (angle <= 30) return { X: 0.39, Y: 0.76, e: 0.8 };
  return { X: 0.35, Y: 0.57, e: 1.14 };
}

// ── Engine ─────────────────────────────────────────────────────────

export class SpindleBearingLoadEngine {
  calculate(input: SpindleBearingLoadInput): SpindleBearingLoadResult {
    const warnings: string[] = [];
    const bType = input.bearing_type ?? "angular_contact";
    const bore = input.bore_mm ?? 50;
    const rpm = input.spindle_rpm;
    const angle = input.contact_angle_deg ?? (bType === "angular_contact" ? 25 : 0);
    const lube = input.lubrication ?? "grease";
    const preloadClass = input.preload_class ?? "medium";
    const opTemp = input.operating_temp_c ?? 60;

    // Dynamic load rating
    const cTable = bType === "cylindrical_roller"
      ? CYLINDRICAL_ROLLER_C : ANGULAR_CONTACT_C;
    const C_kN = input.dynamic_load_rating_kn ?? cTable[bore] ?? 44;
    const C0_kN = input.static_load_rating_kn ?? C_kN * 0.6;

    // Forces
    const Fr = (input.radial_force_n ?? 500) / 1000; // kN
    const Fa = (input.axial_force_n ?? 200) / 1000; // kN

    // Preload
    const preloadFrac = PRELOAD_FRACTION[preloadClass] ?? 0.03;
    const preloadForce = C0_kN * preloadFrac * 1000; // N

    // Equivalent dynamic load P = X·Fr + Y·Fa
    const { X, Y, e } = getXY(angle, bType);
    const ratio = Fr > 0 ? Fa / Fr : 999;
    let P_kN: number;
    if (ratio <= e) {
      P_kN = Fr; // pure radial dominates
    } else {
      P_kN = X * Fr + Y * Fa;
    }
    P_kN = Math.max(P_kN, 0.001);

    // Life exponent: 3 for ball, 10/3 for roller
    const p = bType.includes("roller") ? 10 / 3 : 3;

    // L10 life in millions of revolutions
    const L10_Mrev = Math.pow(C_kN / P_kN, p);
    const L10_hours = rpm > 0
      ? (L10_Mrev * 1e6) / (60 * rpm) : Infinity;

    // DN value
    const dnValue = bore * rpm;
    const dnLimit = DN_LIMITS[bType]?.[lube] ?? 1000000;
    const speedUtil = (dnValue / dnLimit) * 100;

    // Lubrication adequacy (kappa = actual/required viscosity)
    // Simplified: kappa decreases with speed, increases with bore
    const reqVisc = 45000 / Math.pow(dnValue / 1000, 0.5);
    const actualVisc = lube === "grease" ? 15
      : lube === "oil_mist" ? 12
      : lube === "oil_air" ? 10
      : 8; // oil_jet at operating temp
    const kappa = actualVisc / Math.max(reqVisc, 0.01);
    const kappaLimited = Math.min(kappa, 4);

    // Adjusted life factor (a_ISO simplified)
    const tempFactor = opTemp > 70 ? 0.9 : opTemp > 100 ? 0.7 : 1.0;
    const aISO = Math.min(kappaLimited * tempFactor, 50);
    const adjustedLife = L10_hours * aISO;

    // Static safety factor
    const s0 = C0_kN / P_kN;

    // Warnings
    if (speedUtil > 100) {
      warnings.push(
        `DN value ${r0(dnValue)} exceeds ${lube} limit ${r0(dnLimit)} — ` +
        "upgrade lubrication or reduce speed"
      );
    }
    if (speedUtil > 80 && speedUtil <= 100) {
      warnings.push(
        `DN value at ${r0(speedUtil)}% of limit — monitor temperature`
      );
    }
    if (L10_hours < 20000) {
      warnings.push(
        `Bearing life ${r0(L10_hours)}h is short — ` +
        "consider larger bearing or reduce loads"
      );
    }
    if (s0 < 2) {
      warnings.push(
        `Static safety factor ${r1(s0)} is low — ` +
        "risk of brinelling under shock loads"
      );
    }
    if (kappaLimited < 1) {
      warnings.push(
        `Lubrication inadequate (κ=${r2(kappaLimited)}) — ` +
        "consider higher viscosity or oil-air"
      );
    }
    if (preloadClass === "heavy" && rpm > 15000) {
      warnings.push(
        "Heavy preload at high speed generates excess heat — " +
        "consider light preload"
      );
    }

    return {
      equivalent_load: av(r3(P_kN), "kN", 0.05,
        ratio <= e ? "Radial dominant" : `${X}·Fr + ${Y}·Fa`),
      l10_life_hours: av(r0(Math.min(L10_hours, 9999999)), "hours", 0.1,
        `(C/P)^${r1(p)} × 10⁶ / (60·n)`),
      l10_life_revolutions: av(r1(L10_Mrev), "M rev", 0.1,
        `(${r1(C_kN)}/${r3(P_kN)})^${r1(p)}`),
      dn_value: av(r0(dnValue), "mm·rpm", 0,
        `${bore}mm × ${rpm} rpm`),
      dn_limit: av(r0(dnLimit), "mm·rpm", 0,
        `${bType} with ${lube}`),
      speed_utilization: av(r1(speedUtil), "%", 1,
        `DN / DN_limit × 100`),
      preload_force: av(r0(preloadForce), "N", 5,
        `${preloadClass}: ${preloadFrac * 100}% of C₀`),
      lubrication_kappa: av(r2(kappaLimited), "ratio", 0.1,
        `ν_actual / ν_required`),
      adjusted_life_hours: av(r0(Math.min(adjustedLife, 9999999)), "hours", 0.15,
        `L10 × a_ISO(${r2(aISO)})`),
      static_safety_factor: av(r1(s0), "ratio", 0.1,
        `C₀ / P`),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const spindleBearingLoadEngine = new SpindleBearingLoadEngine();
