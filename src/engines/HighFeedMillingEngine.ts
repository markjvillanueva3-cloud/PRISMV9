/**
 * HighFeedMillingEngine — High Feed Milling (HFM) Calculations
 *
 * Calculates parameters for high-feed milling operations:
 * - Shallow depth / high feed rate optimization
 * - Chip thinning compensation for large-radius inserts
 * - MRR comparison vs conventional milling
 * - Axial vs radial force ratio (favorable for HFM)
 * - Power and torque requirements
 *
 * Key physics: HFM uses large nose radius inserts at very
 * shallow depths (0.5-2mm) with extremely high feed rates.
 * The chip thinning effect means the actual chip thickness
 * is much less than the programmed feed, allowing feeds
 * 3-5× higher than conventional milling. The cutting force
 * is directed primarily axially (into the spindle), improving
 * stability.
 *
 * Reference: Sandvik CoroMill 210/415 guide,
 *            ISCAR HELIDO HFM application manual,
 *            Kennametal KSSM high-feed guide
 *
 * Actions: hfm_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface HFMInput {
  tool_diameter_mm: number;
  num_inserts?: number;
  insert_nose_radius_mm?: number;
  axial_depth_mm?: number;
  radial_width_mm?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
}

export interface HFMResult {
  axial_depth: AtomicValue;
  radial_width: AtomicValue;
  chip_thinning_factor: AtomicValue;
  programmed_fz: AtomicValue;
  actual_hex: AtomicValue;
  cutting_speed: AtomicValue;
  spindle_rpm: AtomicValue;
  table_feed: AtomicValue;
  mrr: AtomicValue;
  axial_force_ratio: AtomicValue;
  power_required: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** HFM cutting speeds (m/min) by ISO group */
const HFM_SPEEDS: Record<string, number> = {
  P: 200, M: 120, K: 250, N: 500, S: 40, H: 100,
};

/** Target hex (actual chip thickness) by ISO group (mm) */
const TARGET_HEX: Record<string, number> = {
  P: 0.10, M: 0.08, K: 0.12, N: 0.10, S: 0.06, H: 0.06,
};

/** Specific cutting force kc1 (N/mm²) */
const KC1: Record<string, number> = {
  P: 2200, M: 2400, K: 1500, N: 800, S: 3200, H: 4000,
};

// ── Engine ─────────────────────────────────────────────────────────

export class HighFeedMillingEngine {
  /**
   * Calculate high-feed milling parameters with chip thinning.
   */
  calculate(input: HFMInput): HFMResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const Dc = input.tool_diameter_mm;
    const z = input.num_inserts ?? Math.max(3, Math.round(Dc / 12));
    const R = input.insert_nose_radius_mm ?? (Dc <= 32 ? 1.5 : 2.5);

    // Axial depth: HFM uses very shallow cuts
    // Max ap ≈ 0.5 × nose radius for HFM geometry
    const maxAp = R * 0.8;
    const ap = input.axial_depth_mm ?? Math.min(maxAp, 1.5);

    // Radial width (step-over): typically 50-80% of Dc
    const ae = input.radial_width_mm ?? Dc * 0.6;

    // Chip thinning factor for large nose radius
    // hex = fz × sin(κ) where κ = approach angle
    // For HFM: κ = arcsin(ap / R)
    const kappa = Math.asin(Math.min(ap / R, 1.0));
    const sinKappa = Math.sin(kappa);
    const chipThinFactor = sinKappa > 0 ? sinKappa : 1;

    // Target hex → programmed fz
    const targetHex = TARGET_HEX[iso] ?? 0.10;
    const fzProgrammed = chipThinFactor > 0
      ? targetHex / chipThinFactor
      : targetHex;

    // Cutting speed and RPM
    const vc = HFM_SPEEDS[iso] ?? 200;
    const rpm = (vc * 1000) / (Math.PI * Dc);

    // Table feed
    const tableFeed = fzProgrammed * z * rpm;

    // MRR (cm³/min)
    const mrrMm3 = ae * ap * tableFeed;
    const mrrCm3 = mrrMm3 / 1000;

    // Axial force ratio: HFM directs ~70-85% of force axially
    // Ratio increases as approach angle decreases
    const axialRatio = Math.cos(kappa);

    // Power (kW)
    const kc = KC1[iso] ?? 2200;
    const efficiency = 0.80;
    const power = (kc * mrrMm3) / (60e6 * efficiency);

    // Warnings
    if (ap > maxAp) {
      warnings.push(
        `Depth ${ap}mm exceeds recommended max ` +
        `${r1(maxAp)}mm for R${R} insert — reduce ap`
      );
    }
    if (ap > R) {
      warnings.push(
        "Depth exceeds nose radius — not true HFM geometry"
      );
    }
    if (ae > Dc * 0.9) {
      warnings.push(
        "Near-full radial engagement — " +
        "consider slot milling approach instead"
      );
    }
    if (power > 20) {
      warnings.push(
        `High power ${r1(power)}kW — verify spindle capacity`
      );
    }

    return {
      axial_depth: av(r2(ap), "mm", 0.05,
        "HFM shallow depth"),
      radial_width: av(r1(ae), "mm", 0.05,
        "Step-over width"),
      chip_thinning_factor: av(r3(chipThinFactor), "ratio", 0.05,
        "sin(arcsin(ap/R))"),
      programmed_fz: av(r3(fzProgrammed), "mm/tooth", 0.1,
        "hex / chip_thinning_factor"),
      actual_hex: av(r3(targetHex), "mm", 0.1,
        "Target chip thickness"),
      cutting_speed: av(vc, "m/min", 0.1,
        "HFM speed tables"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × Dc)"),
      table_feed: av(Math.round(tableFeed), "mm/min", 0.1,
        "fz × z × RPM"),
      mrr: av(r2(mrrCm3), "cm³/min", 0.15,
        "ae × ap × table_feed / 1000"),
      axial_force_ratio: av(r2(axialRatio), "ratio", 0.1,
        "cos(approach_angle) — favorable for spindle"),
      power_required: av(r2(power), "kW", 0.15,
        "kc × MRR / (60M × η)"),
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

export const highFeedMillingEngine = new HighFeedMillingEngine();
