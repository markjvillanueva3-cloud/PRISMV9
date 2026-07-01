/**
 * KnurlingEngine — Knurling Process Calculations
 *
 * Calculates parameters for knurling operations:
 * - Diamond and straight knurl pattern selection
 * - Blank diameter pre-calculation for form knurling
 * - Feed rate, speed, and force estimation
 * - Pitch selection by workpiece diameter
 * - Material displacement vs cutting knurl comparison
 *
 * Key physics: Form knurling displaces material outward,
 * requiring a reduced blank diameter. Cut knurling removes
 * material like a milling operation. The radial force in
 * form knurling is very high (5-20× cutting force) and
 * can deflect slender workpieces.
 *
 * Reference: Machinery's Handbook Ch.30 (Knurling),
 *            DIN 82 (Knurl patterns),
 *            Zeus precision knurling guide
 *
 * Actions: knurl_calc, knurl_blank_dia
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type KnurlPattern = "diamond" | "straight" | "diagonal";
export type KnurlMethod = "form" | "cut";

export interface KnurlInput {
  workpiece_diameter_mm: number;
  knurl_length_mm: number;
  pitch_mm?: number;
  pattern?: KnurlPattern;
  method?: KnurlMethod;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
}

export interface KnurlResult {
  pitch: AtomicValue;
  blank_diameter: AtomicValue;
  finished_od: AtomicValue;
  tooth_depth: AtomicValue;
  cutting_speed: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_rate: AtomicValue;
  radial_force: AtomicValue;
  num_revolutions: AtomicValue;
  cycle_time: AtomicValue;
  pattern: KnurlPattern;
  method: KnurlMethod;
  warnings: string[];
}

export interface BlankDiaInput {
  finished_diameter_mm: number;
  pitch_mm: number;
  method?: KnurlMethod;
}

export interface BlankDiaResult {
  blank_diameter: AtomicValue;
  material_displacement: AtomicValue;
  circumference_divisions: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Standard DIN 82 knurl pitches (mm) */
const STANDARD_PITCHES = [0.5, 0.6, 0.8, 1.0, 1.2, 1.6, 2.0];

/** Knurling speed (m/min) by ISO group */
const KNURL_SPEEDS: Record<string, number> = {
  P: 20, M: 15, K: 25, N: 40, S: 8, H: 10,
};

/** Radial force factor (N/mm of contact width per mm pitch) */
const FORCE_FACTORS: Record<string, number> = {
  P: 250, M: 300, K: 200, N: 150, S: 400, H: 500,
};

// ── Engine ─────────────────────────────────────────────────────────

export class KnurlingEngine {
  /**
   * Calculate knurling parameters.
   */
  knurl(input: KnurlInput): KnurlResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const D = input.workpiece_diameter_mm;
    const knurlLen = input.knurl_length_mm;
    const pattern = input.pattern ?? "diamond";
    const method = input.method ?? "form";

    // Pitch selection — choose standard pitch that gives
    // an integer number of teeth around circumference
    const pitch = input.pitch_mm ?? this.selectPitch(D);

    // Tooth depth ≈ 0.5 × pitch (60° form)
    const toothDepth = 0.5 * pitch;

    // Blank diameter for form knurling
    // Must be reduced so displaced material fills the peaks
    // Blank OD = Finished OD - 0.5 × pitch
    const blankDia = method === "form"
      ? D - 0.5 * pitch
      : D; // cut knurling: no displacement
    const finishedOD = method === "form"
      ? D + 0.5 * pitch
      : D;

    // Cutting speed
    const vc = KNURL_SPEEDS[iso] ?? 20;
    const rpm = (vc * 1000) / (Math.PI * D);

    // Feed rate: typically 0.5-2mm/rev for knurling
    // Wider pitch → slower feed
    const fpr = Math.max(0.5, Math.min(2.0, pitch * 1.0));

    // Radial force estimation
    // F = force_factor × knurl_width × pitch
    const forceFactor = FORCE_FACTORS[iso] ?? 250;
    const knurlWidth = Math.min(knurlLen, 20); // tool width
    const radialForce = forceFactor * knurlWidth * pitch;

    // Number of revolutions to complete knurl
    const feedPerMin = fpr * rpm;
    const numRevs = feedPerMin > 0
      ? Math.ceil(knurlLen / fpr)
      : 0;

    // Cycle time
    const cycleTime = feedPerMin > 0
      ? knurlLen / feedPerMin
      : 0;

    // Warnings
    if (method === "form" && D < 10) {
      warnings.push(
        "Small diameter form knurling — consider cut knurling"
      );
    }
    if (radialForce > 5000) {
      warnings.push(
        `High radial force (${Math.round(radialForce)}N) — ` +
        "verify tailstock support"
      );
    }
    if (D / knurlLen < 2 && method === "form") {
      warnings.push(
        "Long knurl relative to diameter — risk of deflection"
      );
    }
    const circumDivisions = (Math.PI * D) / pitch;
    if (Math.abs(circumDivisions - Math.round(circumDivisions)) > 0.1) {
      warnings.push(
        "Pitch does not divide evenly into circumference — " +
        "pattern may not close cleanly"
      );
    }

    return {
      pitch: av(pitch, "mm", 0,
        "DIN 82 standard pitch"),
      blank_diameter: av(r3(blankDia), "mm", 0.05,
        method === "form"
          ? "OD - 0.5 × pitch"
          : "No reduction (cut knurl)"),
      finished_od: av(r3(finishedOD), "mm", 0.05,
        method === "form"
          ? "OD + 0.5 × pitch"
          : "Same as blank"),
      tooth_depth: av(r3(toothDepth), "mm", 0.05,
        "0.5 × pitch (60° form)"),
      cutting_speed: av(vc, "m/min", 0.15,
        "Knurling speed tables"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.1,
        "Vc × 1000 / (π × D)"),
      feed_rate: av(r2(fpr), "mm/rev", 0.15,
        "Based on pitch"),
      radial_force: av(Math.round(radialForce), "N", 0.2,
        "force_factor × width × pitch"),
      num_revolutions: av(numRevs, "rev", 0,
        "knurl_length / feed_per_rev"),
      cycle_time: av(r2(cycleTime), "min", 0.2,
        "knurl_length / feed_per_min"),
      pattern,
      method,
      warnings,
    };
  }

  /**
   * Calculate optimal blank diameter for form knurling.
   */
  blankDiameter(input: BlankDiaInput): BlankDiaResult {
    const warnings: string[] = [];
    const Df = input.finished_diameter_mm;
    const pitch = input.pitch_mm;
    const method = input.method ?? "form";

    // For form knurling: blank = finished - 0.5 × pitch
    // Material is displaced outward by ~0.25 × pitch per side
    const displacement = method === "form" ? 0.5 * pitch : 0;
    const blankDia = Df - displacement;

    // Check circumference divisions
    const divisions = (Math.PI * Df) / pitch;
    const roundedDiv = Math.round(divisions);

    if (Math.abs(divisions - roundedDiv) > 0.15) {
      warnings.push(
        `${r1(divisions)} teeth — not integer. ` +
        `Adjust diameter to ${r3((roundedDiv * pitch) / Math.PI)}mm ` +
        "for clean pattern closure"
      );
    }

    if (method === "cut") {
      warnings.push(
        "Cut knurling: blank = finished diameter (no displacement)"
      );
    }

    return {
      blank_diameter: av(r3(blankDia), "mm", 0.02,
        method === "form"
          ? "finished_dia - 0.5 × pitch"
          : "No reduction needed"),
      material_displacement: av(r3(displacement), "mm", 0.05,
        "0.5 × pitch total radial"),
      circumference_divisions: av(r1(divisions), "teeth", 0,
        "π × D / pitch"),
      warnings,
    };
  }

  /** Select best standard pitch for a given diameter */
  private selectPitch(diameter: number): number {
    // Choose pitch that gives closest to integer divisions
    let bestPitch = 1.0;
    let bestError = Infinity;

    for (const p of STANDARD_PITCHES) {
      // Skip pitches too large for the diameter
      if (p > diameter * 0.1) continue;
      const divisions = (Math.PI * diameter) / p;
      const error = Math.abs(divisions - Math.round(divisions));
      if (error < bestError) {
        bestError = error;
        bestPitch = p;
      }
    }
    return bestPitch;
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const knurlingEngine = new KnurlingEngine();
