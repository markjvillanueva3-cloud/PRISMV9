/**
 * KeywayStressEngine — Keyway & Key Joint Stress Calculator
 *
 * Calculates stress analysis for parallel and Woodruff keys:
 * - Shear stress in key
 * - Compressive (bearing) stress on key sides
 * - Shaft stress concentration factor
 * - Key sizing per ANSI B17.1 / DIN 6885
 * - Safety factor assessment
 * - Fatigue derating for keyways
 *
 * Key physics: Shear stress τ = 2T/(d×w×L) where T=torque,
 * d=shaft dia, w=key width, L=key length. Bearing stress
 * σ = 4T/(d×h×L) where h=key height. Stress concentration
 * factor Kt ≈ 1.6-3.0 depending on fillet radius.
 *
 * Reference: ANSI B17.1 (keys and keyseats),
 *            DIN 6885 (parallel keys),
 *            Shigley — Mechanical Engineering Design Ch.7
 *
 * Actions: keyway_stress_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface KeywayStressInput {
  shaft_diameter_mm?: number;
  torque_nm?: number;
  power_kw?: number;
  rpm?: number;
  key_width_mm?: number;
  key_height_mm?: number;
  key_length_mm?: number;
  key_type?: "parallel" | "woodruff" | "gib_head";
  key_material_yield_mpa?: number;
  shaft_material_yield_mpa?: number;
  fillet_radius_mm?: number;
  loading_type?: "static" | "pulsating" | "reversed";
  service_factor?: number;
}

export interface KeywayStressResult {
  shear_stress: AtomicValue;
  bearing_stress: AtomicValue;
  shear_safety_factor: AtomicValue;
  bearing_safety_factor: AtomicValue;
  stress_concentration_factor: AtomicValue;
  fatigue_derating: AtomicValue;
  recommended_key_width: AtomicValue;
  recommended_key_height: AtomicValue;
  min_key_length: AtomicValue;
  key_feasible: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** ANSI B17.1 standard key sizes [min_shaft_mm, max_shaft_mm, width, height] */
const KEY_SIZES: [number, number, number, number][] = [
  [6, 8, 2, 2],
  [8, 10, 3, 3],
  [10, 12, 4, 4],
  [12, 17, 5, 5],
  [17, 22, 6, 6],
  [22, 30, 8, 7],
  [30, 38, 10, 8],
  [38, 44, 12, 8],
  [44, 50, 14, 9],
  [50, 58, 16, 10],
  [58, 65, 18, 11],
  [65, 75, 20, 12],
  [75, 85, 22, 14],
  [85, 95, 25, 14],
  [95, 110, 28, 16],
  [110, 130, 32, 18],
];

/** Stress concentration factor by fillet ratio r/d */
function calcKt(filletR: number, shaftD: number): number {
  const ratio = filletR / shaftD;
  if (ratio >= 0.04) return 1.6;
  if (ratio >= 0.02) return 2.0;
  if (ratio >= 0.01) return 2.5;
  return 3.0; // sharp corner
}

// ── Engine ─────────────────────────────────────────────────────────

export class KeywayStressEngine {
  calculate(input: KeywayStressInput): KeywayStressResult {
    const warnings: string[] = [];
    const d = input.shaft_diameter_mm ?? 40;
    const rpm = input.rpm ?? 1500;
    const sf = input.service_factor ?? 1.0;

    // Torque: from direct input or power/rpm
    let torque: number;
    if (input.torque_nm !== undefined) {
      torque = input.torque_nm * sf;
    } else {
      const power = input.power_kw ?? 10;
      torque = (power * 1000 * 60) / (2 * Math.PI * rpm) * sf;
    }

    // Standard key size lookup
    const stdKey = KEY_SIZES.find(k => d >= k[0] && d < k[1]);
    const w = input.key_width_mm ?? (stdKey ? stdKey[2] : Math.round(d / 4));
    const h = input.key_height_mm ?? (stdKey ? stdKey[3] : Math.round(d / 4));

    // Key length: default 1.5 × shaft diameter
    const keyLen = input.key_length_mm ?? Math.round(d * 1.5);

    // Material strengths
    const keyYield = input.key_material_yield_mpa ?? 370; // C45 steel
    const shaftYield = input.shaft_material_yield_mpa ?? 350;

    // ── Shear stress: τ = 2T / (d × w × L)
    // Force on key = T / (d/2), area = w × L
    const force = (torque * 1000) / (d / 2); // N (torque in N·m, d/2 in mm → ×1000 for N·mm)
    const shearArea = w * keyLen; // mm²
    const shearStress = force / shearArea; // MPa

    // ── Bearing stress: σ = F / (h/2 × L) — key sits half in shaft
    const bearingArea = (h / 2) * keyLen; // mm²
    const bearingStress = force / bearingArea; // MPa

    // ── Allowable stresses
    const allowShear = keyYield * 0.577; // Von Mises: τ_allow = σ_y / √3
    const allowBearing = Math.min(keyYield, shaftYield); // whichever is weaker

    // Loading type derating
    let loadFactor = 1.0;
    if (input.loading_type === "pulsating") loadFactor = 0.75;
    if (input.loading_type === "reversed") loadFactor = 0.5;

    const sfShear = (allowShear * loadFactor) / shearStress;
    const sfBearing = (allowBearing * loadFactor) / bearingStress;

    // ── Stress concentration
    const filletR = input.fillet_radius_mm ?? (d * 0.01); // default tiny fillet
    const kt = calcKt(filletR, d);

    // Fatigue derating = 1/Kt (reduces allowable fatigue stress)
    const fatigueDerating = 1 / kt;

    // ── Minimum key length for SF ≥ 2 on bearing
    const minLen = force / ((allowBearing * loadFactor) / 2 * (h / 2));

    // ── Feasibility
    const feasible = sfShear >= 1.5 && sfBearing >= 1.5;

    // Standard key recommendation
    const recW = stdKey ? stdKey[2] : w;
    const recH = stdKey ? stdKey[3] : h;

    // ── Warnings
    if (sfShear < 1.5) {
      warnings.push(
        `Shear SF=${r2(sfShear)} < 1.5 — increase key length or width`
      );
    }
    if (sfBearing < 1.5) {
      warnings.push(
        `Bearing SF=${r2(sfBearing)} < 1.5 — increase key length or use taller key`
      );
    }
    if (sfShear < 1.0 || sfBearing < 1.0) {
      warnings.push("CRITICAL: Safety factor < 1.0 — key will fail");
    }
    if (kt > 2.5) {
      warnings.push(
        `Stress concentration Kt=${r1(kt)} — add fillet radius ≥ ${r1(d * 0.02)}mm`
      );
    }
    if (keyLen > 2.5 * d) {
      warnings.push(
        `Key length ${keyLen}mm > 2.5× shaft dia — uneven load distribution likely`
      );
    }
    if (input.loading_type === "reversed") {
      warnings.push(
        "Reversed loading — consider spline connection instead of key"
      );
    }
    if (input.key_type === "woodruff") {
      warnings.push(
        "Woodruff key — limited torque capacity, suitable for light-duty & taper shafts only"
      );
    }

    return {
      shear_stress: mkAv(r1(shearStress), "MPa", 5,
        `F=${r0(force)}N / (${w}×${keyLen})mm²`),
      bearing_stress: mkAv(r1(bearingStress), "MPa", 5,
        `F=${r0(force)}N / (${h/2}×${keyLen})mm²`),
      shear_safety_factor: mkAv(r2(sfShear), "×", 0.1,
        `${r0(allowShear * loadFactor)}MPa / ${r1(shearStress)}MPa`),
      bearing_safety_factor: mkAv(r2(sfBearing), "×", 0.1,
        `${r0(allowBearing * loadFactor)}MPa / ${r1(bearingStress)}MPa`),
      stress_concentration_factor: mkAv(r1(kt), "Kt", 0.2,
        `r/d = ${r3(filletR / d)}`),
      fatigue_derating: mkAv(r2(fatigueDerating), "factor", 0.05,
        `1/Kt = 1/${r1(kt)}`),
      recommended_key_width: mkAv(recW, "mm", 0,
        `ANSI B17.1 for ${d}mm shaft`),
      recommended_key_height: mkAv(recH, "mm", 0,
        `ANSI B17.1 for ${d}mm shaft`),
      min_key_length: mkAv(r1(minLen), "mm", 2,
        `For SF≥2 on bearing at ${r0(torque)}N·m`),
      key_feasible: mkAv(feasible ? 1 : 0,
        feasible ? "PASS" : "FAIL", 0,
        `Shear SF=${r2(sfShear)}, Bearing SF=${r2(sfBearing)}`),
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

export const keywayStressEngine = new KeywayStressEngine();
