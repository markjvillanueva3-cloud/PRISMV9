/**
 * ThreadTurningEngine — Single-Point Thread Turning Calculations
 *
 * Calculates parameters for thread turning on a lathe:
 * - Infeed method (radial, flank, modified flank, alternating)
 * - Number of passes and depth-of-cut schedule
 * - Cutting speed adjusted for thread pitch
 * - Thread profile geometry (60° metric, 55° BSP/UN)
 * - Spring passes for finish
 *
 * Key physics: Thread turning uses progressively decreasing
 * depth of cut per pass (constant area method) to maintain
 * consistent chip load and avoid insert overload.
 *
 * Reference: Sandvik threading guide (C-2920:52),
 *            ISO 261 (metric threads),
 *            Machinery's Handbook Ch.20 "Threading"
 *
 * Actions: thread_turn_calc, thread_infeed, thread_profile
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type InfeedMethod =
  | "radial" | "flank" | "modified_flank" | "alternating";

export type ThreadForm =
  | "metric_60" | "un_60" | "bsp_55" | "acme_29" | "trapezoidal_30";

export interface ThreadTurnInput {
  pitch_mm: number;
  major_diameter_mm: number;
  thread_form?: ThreadForm;
  is_external?: boolean;
  infeed_method?: InfeedMethod;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  insert_nose_radius_mm?: number;
  num_spring_passes?: number;
}

export interface ThreadTurnResult {
  thread_depth: AtomicValue;
  number_of_passes: AtomicValue;
  pass_schedule: Array<{
    pass: number;
    depth_mm: number;
    cumulative_mm: number;
  }>;
  cutting_speed: AtomicValue;
  spindle_rpm: AtomicValue;
  infeed_method: InfeedMethod;
  infeed_angle: AtomicValue;
  spring_passes: AtomicValue;
  thread_height: AtomicValue;
  minor_diameter: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Thread profile: [included_angle_deg, height_factor (H/P)] */
const THREAD_PROFILES: Record<ThreadForm, [number, number]> = {
  metric_60: [60, 0.6134],
  un_60: [60, 0.6134],
  bsp_55: [55, 0.6403],
  acme_29: [29, 0.5000],
  trapezoidal_30: [30, 0.5000],
};

/** Infeed angle by method (degrees) */
const INFEED_ANGLES: Record<InfeedMethod, number> = {
  radial: 0,
  flank: 30,           // along thread flank
  modified_flank: 29.5, // slight offset for chip control
  alternating: 0,       // alternates left-right
};

/** Threading speed (m/min) by ISO group */
const THREAD_SPEEDS: Record<string, number> = {
  P: 120, M: 80, K: 150, N: 250, S: 40, H: 50,
};

// ── Engine ─────────────────────────────────────────────────────────

export class ThreadTurningEngine {
  /**
   * Calculate thread turning parameters and pass schedule.
   */
  calculate(input: ThreadTurnInput): ThreadTurnResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const pitch = input.pitch_mm;
    const majorDia = input.major_diameter_mm;
    const form = input.thread_form ?? "metric_60";
    const isExternal = input.is_external ?? true;
    const noseR = input.insert_nose_radius_mm ?? 0.3;
    const springPasses = input.num_spring_passes ?? 2;

    const [includedAngle, hFactor] = THREAD_PROFILES[form];

    // Thread height (depth)
    const threadHeight = pitch * hFactor;
    // Actual cutting depth (5/8 of height for 60° external)
    const threadDepth = form === "acme_29" ||
      form === "trapezoidal_30"
      ? threadHeight
      : threadHeight * (5 / 8) * 2; // total depth both sides

    // Minor diameter
    const minorDia = isExternal
      ? majorDia - 2 * threadHeight * 0.625
      : majorDia + 2 * threadHeight * 0.625;

    // Infeed method
    const infeed = input.infeed_method ?? (
      pitch > 3 ? "modified_flank"
        : pitch > 1.5 ? "flank"
          : "radial"
    );
    const infeedAngle = INFEED_ANGLES[infeed];

    // Pass schedule (constant area method)
    // Total area ∝ depth². For n passes with constant area:
    // d_i = total_depth × sqrt(i/n) - sqrt((i-1)/n)
    const totalDepth = threadHeight * 0.625;
    const numPasses = calculatePasses(totalDepth, pitch);
    const schedule: Array<{
      pass: number;
      depth_mm: number;
      cumulative_mm: number;
    }> = [];

    let cumulative = 0;
    for (let i = 1; i <= numPasses; i++) {
      const targetCum = totalDepth * Math.sqrt(i / numPasses);
      const passDepth = targetCum - cumulative;
      cumulative = targetCum;
      schedule.push({
        pass: i,
        depth_mm: r3(passDepth),
        cumulative_mm: r3(cumulative),
      });
    }

    // Cutting speed (reduce for coarse pitch)
    const baseVc = THREAD_SPEEDS[iso] ?? 120;
    const pitchFactor = pitch > 3 ? 0.7
      : pitch > 2 ? 0.8
        : pitch > 1.5 ? 0.9
          : 1.0;
    const vc = baseVc * pitchFactor;
    const rpm = (vc * 1000) / (Math.PI * majorDia);

    // Warnings
    if (pitch > 6) {
      warnings.push(
        "Very coarse pitch — consider modified flank infeed"
      );
    }
    if (noseR > pitch * 0.3) {
      warnings.push(
        "Insert nose radius > 30% of pitch — " +
        "may interfere with thread form"
      );
    }
    if (majorDia < 6 && pitch > 1) {
      warnings.push(
        "Small diameter with coarse pitch — " +
        "high relative thread depth"
      );
    }
    if (infeed === "radial" && pitch > 2) {
      warnings.push(
        "Radial infeed not recommended for pitch > 2mm — " +
        "use flank or modified flank"
      );
    }

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["threading", "turning"],
      operation_type: "turning",
      material_iso: iso,
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        warnings.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return {
      thread_depth: av(r3(totalDepth), "mm", 0.05,
        `P × ${hFactor} × 0.625`),
      number_of_passes: av(numPasses, "passes", 0,
        "Constant area method"),
      pass_schedule: schedule,
      cutting_speed: av(r1(vc), "m/min", 0.1,
        "Base Vc × pitch factor"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D_major)"),
      infeed_method: infeed,
      infeed_angle: av(infeedAngle, "deg", 0,
        `${infeed} method`),
      spring_passes: av(springPasses, "passes", 0,
        "Zero-depth finish passes"),
      thread_height: av(r3(threadHeight), "mm", 0.02,
        `P × ${hFactor} (${form})`),
      minor_diameter: av(r2(minorDia), "mm", 0.05,
        isExternal
          ? "D_major - 2 × 0.625H"
          : "D_major + 2 × 0.625H"),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

/**
 * Calculate number of threading passes based on depth and pitch.
 * Rougher threads need more passes.
 */
function calculatePasses(
  totalDepth: number, pitch: number
): number {
  // Approximate: sqrt(total_area) drives pass count
  // First pass ≈ 0.15mm, decreasing
  if (totalDepth < 0.3) return 3;
  if (totalDepth < 0.5) return 4;
  if (totalDepth < 0.8) return 6;
  if (totalDepth < 1.2) return 8;
  if (totalDepth < 2.0) return 10;
  return Math.ceil(totalDepth * 6);
}

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const threadTurningEngine = new ThreadTurningEngine();
