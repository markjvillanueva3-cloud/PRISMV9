/**
 * MicroMachiningEngine — Micro-Milling & Micro-Drilling Calculations
 *
 * Calculates parameters for micro-machining operations:
 * - Micro-milling with tools < 1mm diameter
 * - Micro-drilling with tools < 3mm diameter
 * - Size effect on specific cutting force
 * - Minimum chip thickness threshold
 * - Runout impact on tool life
 * - Burr formation prediction
 *
 * Key physics: At micro scale, the uncut chip thickness
 * approaches the cutting edge radius, causing ploughing
 * instead of cutting. The minimum chip thickness (~30% of
 * edge radius) must be exceeded for proper chip formation.
 * Runout becomes critical — even 2µm TIR can cause 50%
 * variation in chip load on a 0.2mm end mill.
 *
 * Reference: Chae et al. "Investigation of micro-cutting
 *            operations" IJMTM 2006,
 *            Aramcharoen & Mativenga "Size effect and tool
 *            geometry in micromilling" CIRP 2009,
 *            Machinery's Handbook Ch.24
 *
 * Actions: micro_mill_calc, micro_drill_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface MicroMillInput {
  tool_diameter_mm: number;
  num_flutes?: number;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  edge_radius_um?: number;
  spindle_runout_um?: number;
}

export interface MicroMillResult {
  cutting_speed: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_per_tooth: AtomicValue;
  table_feed: AtomicValue;
  min_chip_thickness: AtomicValue;
  size_effect_factor: AtomicValue;
  effective_kc: AtomicValue;
  runout_impact: AtomicValue;
  axial_depth: AtomicValue;
  radial_depth: AtomicValue;
  mrr: AtomicValue;
  burr_risk: "low" | "medium" | "high";
  warnings: string[];
}

export interface MicroDrillInput {
  drill_diameter_mm: number;
  hole_depth_mm: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  is_through_hole?: boolean;
  peck_cycle?: boolean;
}

export interface MicroDrillResult {
  cutting_speed: AtomicValue;
  spindle_rpm: AtomicValue;
  feed_per_rev: AtomicValue;
  peck_depth: AtomicValue;
  num_pecks: AtomicValue;
  retract_clearance: AtomicValue;
  cycle_time: AtomicValue;
  depth_to_dia_ratio: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Micro-milling speeds (m/min) by ISO group */
const MICRO_MILL_SPEEDS: Record<string, number> = {
  P: 40, M: 25, K: 50, N: 100, S: 15, H: 20,
};

/** Micro-drilling speeds (m/min) */
const MICRO_DRILL_SPEEDS: Record<string, number> = {
  P: 30, M: 20, K: 40, N: 80, S: 10, H: 15,
};

/** Base kc1 (N/mm²) for size effect calc */
const KC1: Record<string, number> = {
  P: 2200, M: 2400, K: 1500, N: 800, S: 3200, H: 4000,
};

// ── Engine ─────────────────────────────────────────────────────────

export class MicroMachiningEngine {
  /**
   * Calculate micro-milling parameters.
   */
  microMill(input: MicroMillInput): MicroMillResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const D = input.tool_diameter_mm;
    const z = input.num_flutes ?? (D < 0.5 ? 2 : 3);
    const edgeRadius = input.edge_radius_um ?? 3; // typical coated micro
    const runout = input.spindle_runout_um ?? 2;

    // Depths — micro-milling uses very light cuts
    const ap = input.axial_depth_mm ?? Math.min(D * 0.5, 0.2);
    const ae = input.radial_depth_mm ?? Math.min(D * 0.3, 0.1);

    // Cutting speed
    const vc = MICRO_MILL_SPEEDS[iso] ?? 40;
    const rpm = (vc * 1000) / (Math.PI * D);

    // Feed per tooth
    // Must exceed minimum chip thickness
    const minChipThickness = edgeRadius * 0.3; // µm → 30% of edge radius
    const minFz = minChipThickness / 1000; // convert µm to mm
    // Typical micro fz: 0.002 - 0.02mm depending on tool size
    const fzTarget = Math.max(D * 0.01, minFz * 1.5);
    const fz = Math.max(fzTarget, minFz);
    const tableFeed = fz * z * rpm;

    // Size effect: kc increases at small chip thickness
    // kc = kc1 × (h/h0)^(-mc) where mc ≈ 0.25
    const kc1 = KC1[iso] ?? 2200;
    const h0 = 0.1; // reference chip thickness (mm)
    const mc = 0.25;
    const sizeEffectFactor = Math.pow(
      Math.max(fz, 0.001) / h0, -mc
    );
    const effectiveKc = kc1 * sizeEffectFactor;

    // Runout impact: percentage of fz
    const runoutImpact = fz > 0
      ? (runout / 1000 / fz) * 100 // as % of fz
      : 0;

    // MRR
    const mrrMm3 = ae * ap * tableFeed;
    const mrrCm3 = mrrMm3 / 1000;

    // Burr risk assessment
    let burrRisk: "low" | "medium" | "high" = "low";
    if (iso === "N" || iso === "P") {
      burrRisk = fz < minFz * 2 ? "high" : "medium";
    }
    if (iso === "K") burrRisk = "low"; // brittle, chips

    // Warnings
    if (fz < minFz * 1.2) {
      warnings.push(
        `Feed per tooth (${r3(fz)}mm) near minimum ` +
        `chip thickness (${r3(minFz)}mm) — ` +
        "risk of ploughing"
      );
    }
    if (runoutImpact > 25) {
      warnings.push(
        `Runout is ${Math.round(runoutImpact)}% of fz — ` +
        "uneven chip load, reduce runout"
      );
    }
    if (rpm > 60000) {
      warnings.push(
        `Required RPM (${Math.round(rpm)}) exceeds ` +
        "typical micro-spindle range"
      );
    }
    if (D < 0.1) {
      warnings.push(
        "Sub-0.1mm tool — extremely fragile, " +
        "verify machine vibration level"
      );
    }

    return {
      cutting_speed: av(vc, "m/min", 0.15,
        "Micro-milling speed tables"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.1,
        "Vc × 1000 / (π × D)"),
      feed_per_tooth: av(r3(fz), "mm", 0.15,
        "Max(D×0.01, 1.5×min_chip)"),
      table_feed: av(r1(tableFeed), "mm/min", 0.15,
        "fz × z × RPM"),
      min_chip_thickness: av(r3(minChipThickness), "µm", 0.1,
        "30% of edge radius"),
      size_effect_factor: av(r2(sizeEffectFactor), "ratio", 0.15,
        "(fz/h0)^(-0.25)"),
      effective_kc: av(Math.round(effectiveKc), "N/mm²", 0.15,
        "kc1 × size_effect"),
      runout_impact: av(r1(runoutImpact), "%", 0.1,
        "runout / fz × 100"),
      axial_depth: av(r3(ap), "mm", 0.1,
        "Micro-milling depth"),
      radial_depth: av(r3(ae), "mm", 0.1,
        "Micro-milling step-over"),
      mrr: av(r3(mrrCm3), "cm³/min", 0.2,
        "ae × ap × feed / 1000"),
      burr_risk: burrRisk,
      warnings,
    };
  }

  /**
   * Calculate micro-drilling parameters.
   */
  microDrill(input: MicroDrillInput): MicroDrillResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const D = input.drill_diameter_mm;
    const depth = input.hole_depth_mm;
    const isThrough = input.is_through_hole ?? false;
    const usePeck = input.peck_cycle ?? (depth / D > 3);

    // Cutting speed
    const vc = MICRO_DRILL_SPEEDS[iso] ?? 30;
    const rpm = (vc * 1000) / (Math.PI * D);

    // Feed per rev — very conservative for micro
    // Typical: 0.5-2% of diameter
    const fpr = D * 0.01;

    // Peck depth: 0.5-1× diameter for micro drills
    const peckDepth = usePeck
      ? Math.min(D * 0.5, depth)
      : depth;
    const numPecks = usePeck
      ? Math.ceil(depth / peckDepth)
      : 1;

    // Retract clearance
    const retractClearance = D < 1 ? 0.1 : 0.3;

    // Depth-to-diameter ratio
    const depthRatio = depth / D;

    // Cycle time: drilling + retract time
    const feedRate = fpr * rpm; // mm/min
    const drillTime = feedRate > 0 ? depth / feedRate : 0;
    // Retract adds ~50% for peck cycles
    const cycleTime = usePeck
      ? drillTime * 1.5
      : drillTime;

    // Warnings
    if (depthRatio > 10) {
      warnings.push(
        `Depth/diameter ratio ${r1(depthRatio)} — ` +
        "extremely deep micro-hole, risk of breakage"
      );
    }
    if (depthRatio > 5 && !usePeck) {
      warnings.push(
        "Deep micro-hole without peck cycle — " +
        "chip evacuation will be poor"
      );
    }
    if (D < 0.3) {
      warnings.push(
        "Sub-0.3mm drill — pilot hole recommended"
      );
    }
    if (rpm > 40000) {
      warnings.push(
        "Very high RPM required — " +
        "verify spindle capability"
      );
    }
    if (isThrough) {
      warnings.push(
        "Through-hole: reduce feed 50% at breakthrough"
      );
    }

    return {
      cutting_speed: av(vc, "m/min", 0.15,
        "Micro-drilling speed tables"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.1,
        "Vc × 1000 / (π × D)"),
      feed_per_rev: av(r3(fpr), "mm/rev", 0.15,
        "1% of drill diameter"),
      peck_depth: av(r3(peckDepth), "mm", 0.1,
        usePeck ? "0.5× diameter" : "Full depth"),
      num_pecks: av(numPecks, "pecks", 0,
        "depth / peck_depth"),
      retract_clearance: av(retractClearance, "mm", 0.05,
        "Micro-drill retract"),
      cycle_time: av(r2(cycleTime), "min", 0.2,
        "drill_time × peck_factor"),
      depth_to_dia_ratio: av(r1(depthRatio), "ratio", 0,
        "hole_depth / drill_dia"),
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

export const microMachiningEngine = new MicroMachiningEngine();
