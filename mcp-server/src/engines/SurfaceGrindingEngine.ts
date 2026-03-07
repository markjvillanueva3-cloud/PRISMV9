/**
 * SurfaceGrindingEngine — Surface Grinding Calculations
 *
 * Calculates parameters for surface grinding operations:
 * - Table speed and cross-feed
 * - Depth of cut by material and wheel
 * - Specific material removal rate
 * - Burn threshold detection
 * - Spark-out pass scheduling
 * - Wheel wear and dressing interval
 *
 * Key physics: Surface grinding removes material by
 * abrasive cutting. The specific grinding energy (u) is
 * 10-100× higher than turning due to negative rake angles
 * and friction. Burn occurs when thermal energy exceeds
 * the material's tempering threshold. The Preston equation
 * MRR = K × P × V governs material removal.
 *
 * Reference: Malkin "Grinding Technology" Ch.5-7,
 *            Rowe "Principles of Modern Grinding" Ch.4,
 *            Norton grinding wheel selection guide
 *
 * Actions: surface_grind_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface SurfaceGrindInput {
  workpiece_width_mm: number;
  workpiece_length_mm: number;
  total_stock_mm: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  material_hardness_hrc?: number;
  wheel_diameter_mm?: number;
  wheel_width_mm?: number;
  is_finishing?: boolean;
}

export interface SurfaceGrindResult {
  wheel_speed: AtomicValue;
  wheel_rpm: AtomicValue;
  table_speed: AtomicValue;
  cross_feed: AtomicValue;
  depth_per_pass: AtomicValue;
  num_passes: AtomicValue;
  num_sparkout_passes: AtomicValue;
  specific_mrr: AtomicValue;
  burn_risk: AtomicValue;
  predicted_ra: AtomicValue;
  dressing_interval: AtomicValue;
  cycle_time: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Wheel speed (m/s) by material group */
const WHEEL_SPEEDS: Record<string, number> = {
  P: 30, M: 28, K: 35, N: 25, S: 25, H: 30,
};

/** Table speed (m/min) by material */
const TABLE_SPEEDS: Record<string, number> = {
  P: 15, M: 12, K: 18, N: 20, S: 10, H: 12,
};

/** Specific grinding energy (J/mm³) by material */
const SPECIFIC_ENERGY: Record<string, number> = {
  P: 40, M: 50, K: 30, N: 15, S: 60, H: 55,
};

// ── Engine ─────────────────────────────────────────────────────────

export class SurfaceGrindingEngine {
  /**
   * Calculate surface grinding parameters.
   */
  calculate(input: SurfaceGrindInput): SurfaceGrindResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const W = input.workpiece_width_mm;
    const L = input.workpiece_length_mm;
    const stock = input.total_stock_mm;
    const hrc = input.material_hardness_hrc ?? 45;
    const Dw = input.wheel_diameter_mm ?? 200;
    const Bw = input.wheel_width_mm ?? 25;
    const finishing = input.is_finishing ?? false;

    // Wheel speed
    const vs = WHEEL_SPEEDS[iso] ?? 30; // m/s
    const wheelRpm = (vs * 60 * 1000) / (Math.PI * Dw);

    // Table speed
    const vt = TABLE_SPEEDS[iso] ?? 15;

    // Cross-feed: fraction of wheel width per stroke
    const crossFeedRatio = finishing ? 0.2 : 0.5;
    const crossFeed = Bw * crossFeedRatio;

    // Depth per pass
    const roughDoc = hrc > 55 ? 0.01 : (hrc > 40 ? 0.02 : 0.03);
    const finishDoc = hrc > 55 ? 0.002 : 0.005;
    const doc = finishing ? finishDoc : roughDoc;

    // Number of passes
    const numPasses = Math.ceil(stock / doc);

    // Spark-out passes
    const sparkoutPasses = finishing ? 5 : 3;

    // Specific MRR (mm³/mm·s)
    // Q' = vt × doc × cross_feed / 60
    const specificMrr = (vt * 1000 / 60) * doc;

    // Burn risk: thermal load = specific_energy × Q'
    const u = SPECIFIC_ENERGY[iso] ?? 40;
    const thermalLoad = u * specificMrr;
    // Burn threshold ~500 for hardened steel, ~800 for soft
    const burnThreshold = hrc > 50 ? 500 : 800;
    const burnRisk = (thermalLoad / burnThreshold) * 100;

    // Predicted Ra
    const ra = finishing ? 0.2 : 0.8;

    // Dressing interval (passes between dressing)
    const dressingInterval = finishing ? 10 : 30;

    // Cycle time
    const strokesPerPass = Math.ceil(W / crossFeed);
    const timePerStroke = vt > 0 ? L / (vt * 1000 / 60) : 0;
    // seconds per stroke → minutes
    const timePerPass = (strokesPerPass * timePerStroke) / 60;
    const totalPasses = numPasses + sparkoutPasses;
    const cycleTime = timePerPass * totalPasses;

    // Warnings
    if (burnRisk > 80) {
      warnings.push(
        `High burn risk (${Math.round(burnRisk)}%) — ` +
        "reduce depth of cut or increase coolant flow"
      );
    }
    if (hrc > 60 && doc > 0.01) {
      warnings.push(
        "Hard material (>60 HRC) — reduce depth to 0.005-0.01mm"
      );
    }
    if (stock > 1 && finishing) {
      warnings.push(
        "Large stock for finishing pass — " +
        "rough first, then finish"
      );
    }
    if (W > Bw * 10) {
      warnings.push(
        "Wide workpiece — many cross-feed strokes, " +
        "consider wider wheel"
      );
    }

    return {
      wheel_speed: av(vs, "m/s", 0.05,
        "Surface grinding speed tables"),
      wheel_rpm: av(Math.round(wheelRpm), "rev/min", 0.05,
        "Vs × 60000 / (π × Dw)"),
      table_speed: av(vt, "m/min", 0.1,
        "Table speed tables"),
      cross_feed: av(r1(crossFeed), "mm", 0.1,
        `${Math.round(crossFeedRatio * 100)}% of wheel width`),
      depth_per_pass: av(doc, "mm", 0.1,
        finishing ? "Finish doc" : "Rough doc by hardness"),
      num_passes: av(numPasses, "passes", 0,
        "stock / depth_per_pass"),
      num_sparkout_passes: av(sparkoutPasses, "passes", 0,
        "Zero-depth passes for deflection recovery"),
      specific_mrr: av(r3(specificMrr), "mm³/mm·s", 0.15,
        "vt × doc"),
      burn_risk: av(Math.round(burnRisk), "%", 0.2,
        "thermal_load / burn_threshold × 100"),
      predicted_ra: av(ra, "µm", 0.15,
        finishing ? "Fine grinding" : "Rough grinding"),
      dressing_interval: av(dressingInterval, "passes", 0,
        "Passes between wheel dressing"),
      cycle_time: av(r1(cycleTime), "min", 0.2,
        "strokes × time × passes"),
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
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const surfaceGrindingEngine = new SurfaceGrindingEngine();
