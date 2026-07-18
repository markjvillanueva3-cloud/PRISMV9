/**
 * BroachDesignEngine — Broaching Process Parameter Calculator
 *
 * Models: Internal and surface broaching parameters.
 * - Rise per tooth (RPT) from material/operation
 * - Cutting force = RPT × width × specific cutting force
 * - Pull force and tonnage requirement
 * - Number of teeth and broach length
 * - Surface finish from RPT and rake angle
 * - Tool life estimation
 *
 * Key physics: F_cut = RPT × w × Ks × n_teeth_engaged.
 * Broach length = (n_rough + n_semi + n_finish) × pitch.
 * Chip space ratio ≥ 3:1 for internal.
 *
 * Reference: Machinery's Handbook — Broaching,
 *            BroachMasters Design Guide,
 *            ASME — Metal Cutting Principles
 *
 * Actions: broach_calc
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export interface BroachDesignInput {
  operation?: "keyway" | "spline" | "round_hole" | "surface" | "gear";
  workpiece_material?: "steel" | "cast_iron" | "aluminum" | "stainless" | "brass";
  cut_depth_mm?: number;
  cut_width_mm?: number;
  cut_length_mm?: number;
  rpt_mm?: number;
  rake_angle_deg?: number;
  num_finishing_teeth?: number;
  broach_type?: "pull" | "push" | "surface" | "rotary";
}

export interface BroachDesignResult {
  rise_per_tooth: AtomicValue;
  num_roughing_teeth: AtomicValue;
  num_total_teeth: AtomicValue;
  tooth_pitch: AtomicValue;
  broach_length: AtomicValue;
  cutting_force: AtomicValue;
  pull_force: AtomicValue;
  surface_finish: AtomicValue;
  chip_space_ratio: AtomicValue;
  tool_life: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** [specific_cutting_force_N_mm2, max_RPT_mm, surface_factor] */
const MAT_BROACH: Record<string, [number, number, number]> = {
  steel:      [2500, 0.08, 1.0],
  cast_iron:  [1500, 0.10, 0.8],
  aluminum:   [800,  0.15, 1.2],
  stainless:  [3000, 0.05, 0.9],
  brass:      [1000, 0.12, 1.1],
};

// ── Engine ─────────────────────────────────────────────────────────

export class BroachDesignEngine {
  calculate(input: BroachDesignInput): BroachDesignResult {
    const warnings: string[] = [];
    const op = input.operation ?? "keyway";
    const matKey = input.workpiece_material ?? "steel";
    const depth = input.cut_depth_mm ?? 4;
    const width = input.cut_width_mm ?? 10;
    const cutLen = input.cut_length_mm ?? 30;
    const rakeAngle = input.rake_angle_deg ?? 12;
    const nFinish = input.num_finishing_teeth ?? 5;
    const bType = input.broach_type ?? "pull";

    const [Ks, maxRPT, surfFactor] = MAT_BROACH[matKey] ?? MAT_BROACH.steel;

    // Rise per tooth
    const rpt = input.rpt_mm ?? Math.min(maxRPT, depth < 2 ? 0.04 : 0.06);

    // Number of roughing teeth
    const nRough = Math.ceil(depth / Math.max(rpt, 0.01));

    // Semi-finish teeth (3 teeth at half RPT)
    const nSemi = 3;

    // Total teeth
    const nTotal = nRough + nSemi + nFinish;

    // Tooth pitch (based on cut length)
    // Pitch ≥ 1.25 × √(cut_length) for chip space
    const pitch = Math.max(4, 1.25 * Math.sqrt(cutLen));

    // Number of teeth engaged simultaneously
    const nEngaged = Math.max(1, Math.floor(cutLen / pitch));

    // Broach length
    const broachLen = nTotal * pitch + 50; // + front pilot/rear

    // Cutting force per tooth
    const Ftooth = rpt * width * Ks; // N

    // Total pull/push force
    const Ftotal = Ftooth * nEngaged;

    // Chip space ratio
    // Gullet area / chip area
    const chipArea = rpt * width;
    const gulletArea = 0.5 * pitch * pitch * 0.4; // approximate gullet
    const chipSpaceRatio = chipArea > 0 ? gulletArea / chipArea : 10;

    // Surface finish (Ra µm)
    // Lower RPT on finish teeth gives better finish
    const finishRPT = rpt * 0.1; // finish teeth at ~10% of rough RPT
    let ra = finishRPT * 1000 * surfFactor * 0.8;
    if (rakeAngle > 15) ra *= 0.8; // positive rake improves finish
    ra = Math.max(0.4, Math.min(ra, 6.3));

    // Tool life (parts per regrind)
    let toolLife = 2000;
    if (matKey === "stainless") toolLife = 500;
    if (matKey === "aluminum") toolLife = 5000;
    if (matKey === "brass") toolLife = 4000;

    // Warnings
    if (chipSpaceRatio < 3) {
      warnings.push(`Chip space ratio ${r1(chipSpaceRatio)} < 3:1 — increase pitch or reduce RPT`);
    }
    if (Ftotal > 100000) {
      warnings.push(`Pull force ${r0(Ftotal / 1000)}kN very high — verify machine capacity`);
    }
    if (bType === "push" && broachLen > 300) {
      warnings.push("Push broach >300mm — risk of buckling, use pull broach");
    }
    if (rpt > maxRPT) {
      warnings.push(`RPT ${rpt}mm exceeds max ${maxRPT}mm for ${matKey}`);
    }
    if (nEngaged < 2) {
      warnings.push("< 2 teeth engaged — jerky cutting, increase cut length or reduce pitch");
    }
    if (op === "gear" && nFinish < 5) {
      warnings.push("Gear broaching — increase finishing teeth for profile accuracy");
    }

    const src = "BroachDesignEngine (Machinery's HB)";

    return {
      rise_per_tooth: mkAv(r3(rpt), "mm", rpt * 0.05, `${matKey} max=${maxRPT}`),
      num_roughing_teeth: mkAv(nRough, "teeth", 0,
        `${depth}mm / ${r3(rpt)}mm`),
      num_total_teeth: mkAv(nTotal, "teeth", 0,
        `${nRough}R + ${nSemi}S + ${nFinish}F`),
      tooth_pitch: mkAv(r1(pitch), "mm", pitch * 0.05,
        `1.25×√${cutLen}`),
      broach_length: mkAv(r0(broachLen), "mm", broachLen * 0.05, src),
      cutting_force: mkAv(r0(Ftooth), "N/tooth", Ftooth * 0.1,
        `RPT×w×Ks`),
      pull_force: mkAv(r0(Ftotal), "N", Ftotal * 0.1,
        `${nEngaged} teeth engaged`),
      surface_finish: mkAv(r1(ra), "µm Ra", ra * 0.2, `Finish RPT=${r3(finishRPT)}`),
      chip_space_ratio: mkAv(r1(chipSpaceRatio), ":1", chipSpaceRatio * 0.1,
        "Gullet/chip area"),
      tool_life: mkAv(toolLife, "parts/regrind", toolLife * 0.2, matKey),
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function mkAv(value: number, unit: string, uncertainty: number, source: string): AtomicValue {
  return { value, unit, uncertainty, source };
}
function r0(n: number): number { return Math.round(n); }
function r1(n: number): number { return Math.round(n * 10) / 10; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const broachDesignEngine = new BroachDesignEngine();
