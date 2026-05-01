/**
 * FacingEngine — Face Milling & Lathe Facing Calculations
 *
 * Calculates parameters for facing operations:
 * - Face milling: cutter engagement, number of passes, step-over
 * - Lathe facing: constant surface speed, feed per rev, cycle time
 * - Surface finish estimation from feed marks
 * - Power requirement for facing cuts
 *
 * Key physics: In face milling, the cutter engagement angle
 * determines effective chip thickness. For lathe facing, the
 * effective cutting diameter changes continuously from OD to
 * center, requiring CSS mode for consistent chip formation.
 *
 * Reference: Sandvik face milling guide (C-2920:22),
 *            Machinery's Handbook Ch.24 (Milling),
 *            ISO 3685 (Tool life testing)
 *
 * Actions: face_mill_calc, lathe_face_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface FaceMillInput {
  workpiece_width_mm: number;
  workpiece_length_mm: number;
  cutter_diameter_mm: number;
  num_inserts?: number;
  depth_of_cut_mm?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  step_over_ratio?: number; // fraction of cutter dia, default 0.7
}

export interface FaceMillResult {
  cutting_speed: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_per_tooth: AtomicValue;
  table_feed: AtomicValue;
  num_passes: AtomicValue;
  step_over: AtomicValue;
  engagement_angle: AtomicValue;
  mrr: AtomicValue;
  power_required: AtomicValue;
  predicted_ra: AtomicValue;
  cycle_time: AtomicValue;
  warnings: string[];
}

export interface LatheFaceInput {
  workpiece_diameter_mm: number;
  face_depth_mm?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  tool_nose_radius_mm?: number;
  is_hollow?: boolean;
  bore_diameter_mm?: number;
}

export interface LatheFaceResult {
  cutting_speed: AtomicValue;
  rpm_at_od: AtomicValue;
  rpm_at_center: AtomicValue;
  feed_rate: AtomicValue;
  depth_of_cut: AtomicValue;
  num_passes: AtomicValue;
  predicted_ra: AtomicValue;
  cycle_time: AtomicValue;
  use_css: boolean;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Face milling speeds (m/min) by ISO group */
const FACE_MILL_SPEEDS: Record<string, number> = {
  P: 200, M: 120, K: 250, N: 500, S: 40, H: 80,
};

/** Face milling feed per tooth (mm/tooth) by ISO group */
const FACE_MILL_FZ: Record<string, number> = {
  P: 0.20, M: 0.15, K: 0.25, N: 0.15, S: 0.10, H: 0.10,
};

/** Specific cutting force kc1 (N/mm²) by ISO group */
const KC1: Record<string, number> = {
  P: 2200, M: 2400, K: 1500, N: 800, S: 3200, H: 4000,
};

/** Lathe facing speeds (m/min) by ISO group */
const LATHE_FACE_SPEEDS: Record<string, number> = {
  P: 250, M: 150, K: 300, N: 600, S: 50, H: 100,
};

/** Lathe facing feed (mm/rev) by ISO group */
const LATHE_FACE_FEEDS: Record<string, number> = {
  P: 0.25, M: 0.20, K: 0.30, N: 0.20, S: 0.10, H: 0.10,
};

// ── Engine ─────────────────────────────────────────────────────────

export class FacingEngine {
  /**
   * Calculate face milling parameters.
   */
  faceMill(input: FaceMillInput): FaceMillResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const Dc = input.cutter_diameter_mm;
    const W = input.workpiece_width_mm;
    const L = input.workpiece_length_mm;
    const z = input.num_inserts ?? Math.max(4, Math.round(Dc / 15));
    const ap = input.depth_of_cut_mm ?? 2.0;
    const stepRatio = input.step_over_ratio ?? 0.7;

    // Cutting speed
    const vc = FACE_MILL_SPEEDS[iso] ?? 200;
    const rpm = (vc * 1000) / (Math.PI * Dc);

    // Feed
    const fz = FACE_MILL_FZ[iso] ?? 0.20;
    const tableFeed = fz * z * rpm; // mm/min

    // Step-over and number of passes
    const ae = Dc * stepRatio;
    const numPasses = Math.ceil(W / ae);

    // Engagement angle (degrees)
    // For full engagement: ae/Dc ratio determines angle
    const engagementAngle = Math.acos(1 - (2 * Math.min(ae, Dc) / Dc))
      * (180 / Math.PI);

    // MRR (cm³/min)
    const mrrMm3 = ae * ap * tableFeed;
    const mrrCm3 = mrrMm3 / 1000;

    // Power (kW) = kc × MRR / (60 × 10⁶ × efficiency)
    const kc = KC1[iso] ?? 2200;
    const efficiency = 0.80;
    const power = (kc * mrrMm3) / (60e6 * efficiency);

    // Surface finish Ra ≈ fz² / (32 × r_tip)
    // For face mill inserts, wiper flat ~ 1mm
    const wiperFlat = 1.0; // mm
    const ra = (fz * fz) / (32 * wiperFlat);

    // Cycle time
    const approach = Dc / 2;
    const overrun = 5;
    const passLength = L + approach + overrun;
    const timePerPass = passLength / tableFeed;
    const cycleTime = timePerPass * numPasses;

    // Warnings
    if (Dc < W * 1.3) {
      warnings.push(
        "Cutter diameter < 1.3× workpiece width — multiple passes needed, consider larger cutter"
      );
    }
    if (ap > 4 && iso === "H") {
      warnings.push(
        "Deep cut in hardened material — reduce depth of cut"
      );
    }
    if (power > 15) {
      warnings.push(
        `High power requirement (${r1(power)}kW) — verify spindle capacity`
      );
    }
    if (Dc > 200) {
      warnings.push(
        "Large cutter (>200mm) — verify spindle torque at low RPM"
      );
    }

    return {
      cutting_speed: av(vc, "m/min", 0.1, "Face milling speed tables"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × Dc)"),
      feed_per_tooth: av(fz, "mm/tooth", 0.1,
        "Face milling fz tables"),
      table_feed: av(Math.round(tableFeed), "mm/min", 0.1,
        "fz × z × RPM"),
      num_passes: av(numPasses, "passes", 0,
        "workpiece_width / step_over"),
      step_over: av(r1(ae), "mm", 0.05,
        `${r1(stepRatio * 100)}% of cutter diameter`),
      engagement_angle: av(r1(engagementAngle), "deg", 0.05,
        "acos(1 - 2ae/Dc)"),
      mrr: av(r2(mrrCm3), "cm³/min", 0.1,
        "ae × ap × table_feed / 1000"),
      power_required: av(r2(power), "kW", 0.15,
        "kc × MRR / (60M × η)"),
      predicted_ra: av(r3(ra), "µm", 0.2,
        "fz² / (32 × wiper_flat)"),
      cycle_time: av(r2(cycleTime), "min", 0.15,
        "(L + approach + overrun) / feed × passes"),
      warnings,
    };
  }

  /**
   * Calculate lathe facing parameters.
   */
  latheFace(input: LatheFaceInput): LatheFaceResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const D = input.workpiece_diameter_mm;
    const rn = input.tool_nose_radius_mm ?? 0.8;
    const isHollow = input.is_hollow ?? false;
    const boreDia = input.bore_diameter_mm ?? 0;

    // Face depth — default to light skim
    const totalDepth = input.face_depth_mm ?? 1.0;
    const maxAp = 2.5;
    const numPasses = Math.ceil(totalDepth / maxAp);
    const ap = totalDepth / numPasses;

    // Cutting speed
    const vc = LATHE_FACE_SPEEDS[iso] ?? 250;

    // RPM at OD and center/bore
    const rpmOD = (vc * 1000) / (Math.PI * D);
    const endDia = isHollow ? Math.max(boreDia, 5) : Math.max(5, D * 0.1);
    const rpmCenter = (vc * 1000) / (Math.PI * endDia);

    // Feed
    const fpr = LATHE_FACE_FEEDS[iso] ?? 0.25;

    // CSS recommendation
    const useCSS = D > 20;

    // Surface finish Ra ≈ f² / (32 × rn)
    const ra = (fpr * fpr) / (32 * rn);

    // Cycle time: facing from OD to center (or bore)
    const facingRadius = isHollow
      ? (D - boreDia) / 2
      : D / 2;
    // Average RPM for time estimate
    const avgRpm = (rpmOD + Math.min(rpmCenter, 6000)) / 2;
    const avgFeedRate = fpr * avgRpm; // mm/min
    const cycleTime = avgFeedRate > 0
      ? (facingRadius * numPasses) / avgFeedRate
      : 0;

    // Warnings
    if (D > 200 && !useCSS) {
      warnings.push(
        "Large diameter facing — use constant surface speed (CSS)"
      );
    }
    if (rpmCenter > 6000) {
      warnings.push(
        `Center RPM would exceed 6000 (${Math.round(rpmCenter)}) — machine may limit`
      );
    }
    if (fpr > 0.4) {
      warnings.push(
        "High feed rate — verify surface finish requirement"
      );
    }
    if (isHollow && boreDia > D * 0.9) {
      warnings.push(
        "Very thin wall — verify workholding rigidity"
      );
    }

    return {
      cutting_speed: av(vc, "m/min", 0.1,
        "Lathe facing speed tables"),
      rpm_at_od: av(Math.round(rpmOD), "rev/min", 0.05,
        "Vc × 1000 / (π × D)"),
      rpm_at_center: av(Math.round(Math.min(rpmCenter, 6000)),
        "rev/min", 0.1, "At center (capped 6000)"),
      feed_rate: av(fpr, "mm/rev", 0.1,
        "Lathe facing feed tables"),
      depth_of_cut: av(r2(ap), "mm", 0.05,
        "total_depth / num_passes"),
      num_passes: av(numPasses, "passes", 0,
        "total_depth / max_ap"),
      predicted_ra: av(r3(ra), "µm", 0.2,
        "f² / (32 × r_nose)"),
      cycle_time: av(r2(cycleTime), "min", 0.2,
        "facing_radius × passes / avg_feed"),
      use_css: useCSS,
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

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const facingEngine = new FacingEngine();
