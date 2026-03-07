/**
 * PlungeMillingEngine — Plunge (Z-axis) Milling Calculations
 *
 * Calculates parameters for plunge milling operations:
 * - Axial plunge roughing (Z-axis cutting)
 * - Step-over pattern for pocket/face plunge milling
 * - Cutting forces (primarily axial, absorbed by spindle)
 * - Feed rate based on chip load per tooth in Z
 * - MRR and cycle time estimation
 *
 * Key physics: Plunge milling directs cutting forces axially
 * into the spindle bearings (strongest axis), making it ideal
 * for long-reach, thin-wall, and weak-setup situations where
 * radial forces would cause chatter or deflection.
 *
 * Reference: Sandvik plunge milling application guide,
 *            Kennametal "Z-axis milling" tech brief,
 *            Machinery's Handbook Ch.30
 *
 * Actions: plunge_mill_calc, plunge_pattern, plunge_force
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface PlungeMillInput {
  tool_diameter_mm: number;
  num_flutes: number;
  depth_mm: number;
  pocket_length_mm?: number;
  pocket_width_mm?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  overhang_ratio?: number;   // L/D ratio, default 4
}

export interface PlungeMillResult {
  plunge_feed: AtomicValue;
  chip_load_axial: AtomicValue;
  step_over: AtomicValue;
  spindle_rpm: AtomicValue;
  axial_force: AtomicValue;
  radial_force: AtomicValue;
  mrr: AtomicValue;
  number_of_plunges: AtomicValue;
  cycle_time: AtomicValue;
  force_ratio: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Cutting speed for plunge milling (m/min) — reduced vs face milling */
const PLUNGE_SPEEDS: Record<string, number> = {
  P: 80, M: 50, K: 100, N: 180, S: 25, H: 35,
};

/** Axial chip load (mm/tooth) for plunge milling */
const PLUNGE_CHIP_LOADS: Record<string, number> = {
  P: 0.10, M: 0.08, K: 0.12, N: 0.15, S: 0.05, H: 0.06,
};

/** Specific cutting force kc1 (N/mm²) by ISO group */
const KC1_VALUES: Record<string, number> = {
  P: 2000, M: 2400, K: 1200, N: 700, S: 2800, H: 3500,
};

// ── Engine ─────────────────────────────────────────────────────────

export class PlungeMillingEngine {
  /**
   * Calculate plunge milling parameters.
   */
  calculate(input: PlungeMillInput): PlungeMillResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const d = input.tool_diameter_mm;
    const z = input.num_flutes;
    const depth = input.depth_mm;
    const overhang = input.overhang_ratio ?? 4;

    // Step-over: typically 50-75% of tool diameter for plunge
    const stepOver = d * 0.6;

    // Speed/feed
    const vc = PLUNGE_SPEEDS[iso] ?? 80;
    const rpm = (vc * 1000) / (Math.PI * d);
    const fzAxial = PLUNGE_CHIP_LOADS[iso] ?? 0.10;
    const plungeFeed = fzAxial * z * rpm;

    // Forces
    // Axial force dominates in plunge milling
    // F_axial = kc1 × ae × fz × z_engaged / 2
    // (simplified — only ~2 teeth engaged at a time)
    const kc1 = KC1_VALUES[iso] ?? 2000;
    const zEngaged = Math.min(z, Math.ceil(z / 2));
    const axialForce = kc1 * stepOver * fzAxial *
      zEngaged / 1000; // convert to kN then back to N

    // Radial force is much lower (≈10-15% of axial)
    const radialForce = axialForce * 0.12;

    // Force ratio (axial/radial advantage)
    const forceRatio = radialForce > 0
      ? axialForce / radialForce : 0;

    // Number of plunges for pocket
    let numPlunges: number;
    if (input.pocket_length_mm && input.pocket_width_mm) {
      const nx = Math.ceil(input.pocket_length_mm / stepOver);
      const ny = Math.ceil(input.pocket_width_mm / stepOver);
      numPlunges = nx * ny;
    } else {
      numPlunges = 1;
    }

    // MRR per plunge
    const mrrPerPlunge = stepOver * d * 0.5 * plungeFeed /
      1000; // rough estimate
    const mrr = mrrPerPlunge * 0.001; // to cm³/min approx

    // Cycle time
    // Each plunge: depth / plunge_feed + retract time
    const retractTime = depth / (plungeFeed * 3); // 3× rapid
    const timePerPlunge = (depth / plungeFeed) + retractTime;
    const cycleTime = timePerPlunge * numPlunges;

    // Warnings
    if (overhang > 6) {
      warnings.push(
        `L/D ratio ${overhang} — plunge milling ` +
        "recommended over side milling"
      );
    }
    if (d > 50) {
      warnings.push(
        "Large tool diameter — verify spindle thrust capacity"
      );
    }
    if (fzAxial * z * rpm > 5000) {
      warnings.push(
        "Very high plunge feed — verify machine Z-axis capacity"
      );
    }

    return {
      plunge_feed: av(Math.round(plungeFeed), "mm/min", 0.1,
        "fz_axial × z × RPM"),
      chip_load_axial: av(r3(fzAxial), "mm/tooth", 0.1,
        "Plunge milling chip load tables"),
      step_over: av(r2(stepOver), "mm", 0.05,
        "60% of tool diameter"),
      spindle_rpm: av(Math.round(rpm), "rev/min", 0.05,
        "Vc × 1000 / (π × D)"),
      axial_force: av(r1(axialForce), "N", 0.2,
        "kc1 × ae × fz × z_eng"),
      radial_force: av(r1(radialForce), "N", 0.25,
        "~12% of axial force"),
      mrr: av(r2(mrrPerPlunge / 1000), "cm³/min", 0.25,
        "ae × ap_eff × F / 1000"),
      number_of_plunges: av(numPlunges, "plunges", 0,
        "pocket area / step_over²"),
      cycle_time: av(r2(cycleTime), "min", 0.2,
        "(depth/feed + retract) × plunges"),
      force_ratio: av(r1(forceRatio), "axial:radial", 0.15,
        "F_axial / F_radial (>5 = good)"),
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

export const plungeMillingEngine = new PlungeMillingEngine();
