/**
 * PowerSkivingEngine — Gear & Spline Power Skiving
 *
 * Calculates parameters for power skiving operations:
 * - Crossed-axis angle optimization
 * - Cutting speed from relative motion
 * - Feed rate and number of passes
 * - Tool/workpiece synchronization ratio
 * - Chip load per tooth
 *
 * Key physics: Power skiving uses a tool with a crossed
 * axis angle (typically 15-25°) to generate gear teeth
 * via a continuous cutting motion. The relative velocity
 * between tool and workpiece creates the cutting speed.
 * Vc = π × D_tool × n_tool × sin(Σ) where Σ is the
 * crossed-axis angle. Multiple passes (5-15) with
 * increasing radial infeed achieve the full tooth depth.
 *
 * Reference: Gleason power skiving application guide,
 *            Sandvik CoroMill 178H guide,
 *            VDI 2612 (Gear skiving)
 *
 * Actions: power_skiving_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PowerSkivingInput {
  workpiece_diameter_mm: number;
  module_mm: number;
  num_teeth_workpiece: number;
  num_teeth_tool?: number;
  tooth_depth_mm?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  crossed_axis_angle_deg?: number;
}

export interface PowerSkivingResult {
  crossed_axis_angle: AtomicValue;
  tool_rpm: AtomicValue;
  workpiece_rpm: AtomicValue;
  sync_ratio: AtomicValue;
  cutting_speed: AtomicValue;
  axial_feed: AtomicValue;
  num_passes: AtomicValue;
  radial_infeed_per_pass: AtomicValue;
  total_tooth_depth: AtomicValue;
  cycle_time: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Power skiving cutting speeds (m/min) by ISO group */
const SKIVE_SPEEDS: Record<string, number> = {
  P: 150, M: 80, K: 180, N: 300, S: 30, H: 50,
};

// ── Engine ─────────────────────────────────────────────────────────

export class PowerSkivingEngine {
  /**
   * Calculate power skiving parameters.
   */
  calculate(input: PowerSkivingInput): PowerSkivingResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const Dw = input.workpiece_diameter_mm;
    const m = input.module_mm;
    const Zw = input.num_teeth_workpiece;
    const Zt = input.num_teeth_tool ?? Math.max(
      Math.round(Zw * 0.6), 10
    );

    // Crossed-axis angle
    const sigma = input.crossed_axis_angle_deg ?? 20;
    const sigmaRad = (sigma * Math.PI) / 180;

    // Tooth depth = 2.25 × module (standard full depth)
    const toothDepth = input.tooth_depth_mm ?? 2.25 * m;

    // Synchronization ratio
    const syncRatio = Zw / Zt;

    // Tool diameter (approximate from module and tooth count)
    const Dt = m * Zt;

    // Cutting speed
    const vc = SKIVE_SPEEDS[iso] ?? 150;

    // Tool RPM: Vc = π × Dt × nt × sin(Σ) / 1000
    // nt = Vc × 1000 / (π × Dt × sin(Σ))
    const sinSigma = Math.sin(sigmaRad);
    const toolRpm = sinSigma > 0
      ? (vc * 1000) / (Math.PI * Dt * sinSigma)
      : 1000;

    // Workpiece RPM = tool RPM / sync ratio
    const wpRpm = toolRpm / syncRatio;

    // Axial feed: 0.02-0.08 mm/rev of workpiece
    const axialFeed = m < 2 ? 0.03 : (m < 4 ? 0.05 : 0.08);

    // Number of passes: more for larger modules
    const numPasses = Math.max(
      5,
      Math.min(Math.ceil(toothDepth / (m * 0.15)), 15)
    );
    const infeedPerPass = toothDepth / numPasses;

    // Cycle time per tooth space
    // Face width ≈ 10 × module (typical)
    const faceWidth = 10 * m;
    const feedRate = axialFeed * wpRpm; // mm/min
    const timePerPass = feedRate > 0
      ? faceWidth / feedRate
      : 0;
    const cycleTime = timePerPass * numPasses;

    // Warnings
    if (sigma < 10) {
      warnings.push(
        "Low crossed-axis angle (<10°) — " +
        "insufficient clearance, risk of interference"
      );
    }
    if (sigma > 30) {
      warnings.push(
        "High crossed-axis angle (>30°) — " +
        "profile distortion may occur"
      );
    }
    if (m > 6) {
      warnings.push(
        "Large module (>6mm) — " +
        "verify machine power and rigidity"
      );
    }
    if (toolRpm > 5000) {
      warnings.push(
        "High tool RPM — verify spindle capability " +
        "and synchronization accuracy"
      );
    }
    if (Zw < 15) {
      warnings.push(
        "Low tooth count — " +
        "verify minimum clearance angle"
      );
    }

    return {
      crossed_axis_angle: av(sigma, "deg", 0.05,
        "Crossed-axis angle Σ"),
      tool_rpm: av(Math.round(toolRpm), "rev/min", 0.1,
        "Vc×1000 / (π×Dt×sin(Σ))"),
      workpiece_rpm: av(Math.round(wpRpm), "rev/min", 0.1,
        "tool_rpm / sync_ratio"),
      sync_ratio: av(r3(syncRatio), "ratio", 0,
        "Zw / Zt"),
      cutting_speed: av(vc, "m/min", 0.1,
        "Power skiving speed tables"),
      axial_feed: av(axialFeed, "mm/rev", 0.15,
        "Based on module size"),
      num_passes: av(numPasses, "passes", 0,
        "tooth_depth / (module × 0.15)"),
      radial_infeed_per_pass: av(r3(infeedPerPass), "mm", 0.1,
        "tooth_depth / num_passes"),
      total_tooth_depth: av(r2(toothDepth), "mm", 0.05,
        "2.25 × module"),
      cycle_time: av(r2(cycleTime), "min", 0.2,
        "face_width / feed × passes"),
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

function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const powerSkivingEngine = new PowerSkivingEngine();
