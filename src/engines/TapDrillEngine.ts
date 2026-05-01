/**
 * TapDrillEngine — Tap Drill Size & Tapping Calculations
 *
 * Calculates parameters for tapping operations:
 * - Tap drill size for target thread percentage
 * - Metric (ISO 261) and UNC/UNF thread forms
 * - Tapping torque estimation
 * - Tapping speed by material
 * - Thread depth and minor diameter
 * - Form tap vs cut tap recommendation
 *
 * Key physics: Thread percentage is the ratio of actual
 * thread engagement to theoretical full thread. 75% thread
 * gives ~95% of full-thread strength while reducing tapping
 * torque by ~40%. Drill size = major dia - (% × pitch).
 *
 * Reference: Machinery's Handbook Ch.29 (Tapping),
 *            ISO 261/262 (Metric threads),
 *            ASME B1.1 (Unified threads),
 *            OSG tap drill charts
 *
 * Actions: tap_drill_calc, tapping_params
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface TapDrillInput {
  thread_size: string; // e.g. "M10x1.5", "3/8-16", "M6"
  thread_percentage?: number; // default 75%
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  is_blind_hole?: boolean;
  hole_depth_mm?: number;
}

export interface TapDrillResult {
  tap_drill_size: AtomicValue;
  thread_percentage: AtomicValue;
  major_diameter: AtomicValue;
  minor_diameter: AtomicValue;
  pitch: AtomicValue;
  thread_depth: AtomicValue;
  tapping_speed: AtomicValue;
  tapping_torque: AtomicValue;
  tap_type: "cut" | "form";
  warnings: string[];
}

// ── Thread Database ───────────────────────────────────────────────

interface ThreadSpec {
  major: number;
  pitch: number;
}

/** Common metric coarse threads (ISO 261) */
const METRIC_COARSE: Record<string, ThreadSpec> = {
  "M2": { major: 2, pitch: 0.4 },
  "M2.5": { major: 2.5, pitch: 0.45 },
  "M3": { major: 3, pitch: 0.5 },
  "M4": { major: 4, pitch: 0.7 },
  "M5": { major: 5, pitch: 0.8 },
  "M6": { major: 6, pitch: 1.0 },
  "M8": { major: 8, pitch: 1.25 },
  "M10": { major: 10, pitch: 1.5 },
  "M12": { major: 12, pitch: 1.75 },
  "M14": { major: 14, pitch: 2.0 },
  "M16": { major: 16, pitch: 2.0 },
  "M18": { major: 18, pitch: 2.5 },
  "M20": { major: 20, pitch: 2.5 },
  "M22": { major: 22, pitch: 2.5 },
  "M24": { major: 24, pitch: 3.0 },
  "M27": { major: 27, pitch: 3.0 },
  "M30": { major: 30, pitch: 3.5 },
};

/** Common UNC threads */
const UNC_THREADS: Record<string, ThreadSpec> = {
  "1/4-20": { major: 6.35, pitch: 1.27 },
  "5/16-18": { major: 7.94, pitch: 1.411 },
  "3/8-16": { major: 9.525, pitch: 1.5875 },
  "7/16-14": { major: 11.11, pitch: 1.814 },
  "1/2-13": { major: 12.7, pitch: 1.954 },
  "5/8-11": { major: 15.875, pitch: 2.309 },
  "3/4-10": { major: 19.05, pitch: 2.54 },
};

/** Tapping speeds (m/min) by ISO group */
const TAP_SPEEDS: Record<string, number> = {
  P: 15, M: 8, K: 20, N: 30, S: 5, H: 6,
};

// ── Engine ─────────────────────────────────────────────────────────

export class TapDrillEngine {
  /**
   * Calculate tap drill size and tapping parameters.
   */
  calculate(input: TapDrillInput): TapDrillResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const threadPct = input.thread_percentage ?? 75;
    const isBlind = input.is_blind_hole ?? false;

    // Parse thread specification
    const spec = this.parseThread(input.thread_size);
    if (!spec) {
      warnings.push(
        `Unknown thread size "${input.thread_size}" — ` +
        "using M10x1.5 as fallback"
      );
    }
    const { major, pitch } = spec ?? { major: 10, pitch: 1.5 };

    // Thread depth (height of triangle)
    // H = pitch × √3/2 ≈ pitch × 0.866
    const H = pitch * 0.866;

    // Minor diameter = major - 2 × (5/8 × H)
    // For ISO metric: minor = major - 1.0825 × pitch
    const minor = major - 1.0825 * pitch;

    // Tap drill = major - (thread% / 100) × pitch
    // Simplified: drill = major - pct × H × 2 × 5/8
    const tapDrill = major - (threadPct / 100) * pitch;

    // Tapping speed
    const vc = TAP_SPEEDS[iso] ?? 15;

    // Tapping torque estimation (Nm)
    // T ≈ 0.2 × kc × pitch × (major/2)² × 10⁻⁶
    const kc: Record<string, number> = {
      P: 2200, M: 2400, K: 1500, N: 800, S: 3200, H: 4000,
    };
    const kcVal = kc[iso] ?? 2200;
    const torque = 0.2 * kcVal * pitch
      * Math.pow(major / 2, 2) * 1e-3;

    // Cut vs form tap recommendation
    let tapType: "cut" | "form" = "cut";
    if (iso === "N" && threadPct <= 75) tapType = "form";
    if (iso === "P" && major <= 12 && threadPct <= 70) {
      tapType = "form";
    }

    // Warnings
    if (threadPct > 80) {
      warnings.push(
        `${threadPct}% thread — high torque, ` +
        "minimal strength gain over 75%"
      );
    }
    if (threadPct < 50) {
      warnings.push(
        `${threadPct}% thread — may not meet strength requirements`
      );
    }
    if (isBlind) {
      warnings.push(
        "Blind hole: ensure tap reaches full depth + " +
        `${r1(pitch * 3)}mm clearance for chips`
      );
    }
    if (iso === "S" || iso === "H") {
      warnings.push(
        "Difficult material — use high-quality coated tap, " +
        "reduce to 65% thread"
      );
    }

    return {
      tap_drill_size: av(r2(tapDrill), "mm", 0.02,
        "major - (pct/100) × pitch"),
      thread_percentage: av(threadPct, "%", 0,
        "Target thread engagement"),
      major_diameter: av(major, "mm", 0.01,
        "Thread specification"),
      minor_diameter: av(r3(minor), "mm", 0.02,
        "major - 1.0825 × pitch"),
      pitch: av(pitch, "mm", 0, "Thread specification"),
      thread_depth: av(r3(H), "mm", 0.01,
        "pitch × 0.866"),
      tapping_speed: av(vc, "m/min", 0.15,
        "Tapping speed tables"),
      tapping_torque: av(r2(torque), "Nm", 0.2,
        "0.2 × kc × pitch × r²"),
      tap_type: tapType,
      warnings,
    };
  }

  /** Parse thread specification string */
  private parseThread(
    spec: string
  ): ThreadSpec | null {
    // Try metric with pitch: M10x1.5
    const metricFine = spec.match(
      /^M(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i
    );
    if (metricFine) {
      return {
        major: parseFloat(metricFine[1]),
        pitch: parseFloat(metricFine[2]),
      };
    }

    // Try metric coarse: M10
    const metricCoarse = spec.match(/^M(\d+(?:\.\d+)?)$/i);
    if (metricCoarse) {
      const key = `M${metricCoarse[1]}`;
      return METRIC_COARSE[key] ?? {
        major: parseFloat(metricCoarse[1]),
        pitch: parseFloat(metricCoarse[1]) * 0.15,
      };
    }

    // Try UNC: 3/8-16
    if (UNC_THREADS[spec]) {
      return UNC_THREADS[spec];
    }

    // Try fractional inch pattern
    const uncMatch = spec.match(
      /^(\d+)\/(\d+)-(\d+)$/
    );
    if (uncMatch) {
      const major = (parseInt(uncMatch[1])
        / parseInt(uncMatch[2])) * 25.4;
      const tpi = parseInt(uncMatch[3]);
      return { major, pitch: 25.4 / tpi };
    }

    return null;
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

export const tapDrillEngine = new TapDrillEngine();
