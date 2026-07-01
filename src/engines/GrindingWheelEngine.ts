/**
 * GrindingWheelEngine — Grinding Wheel Selection & Parameters
 *
 * Calculates parameters for grinding operations:
 * - Wheel specification decoding (e.g. "WA60-K5-V")
 * - Wheel speed (m/s) from RPM and diameter
 * - Dressing interval estimation
 * - Specific grinding energy and power
 * - G-ratio (volume removed / volume wheel worn)
 * - Burn threshold detection
 *
 * Key physics: Grinding is a high-specific-energy process.
 * The wheel acts as many small cutting edges. Wheel grade
 * (bond strength) must match material — too hard = glazing/burn,
 * too soft = excessive wheel wear.
 *
 * Reference: Machinery's Handbook Ch.31 "Grinding",
 *            Norton grinding wheel selection guide,
 *            ANSI B74.13 (grinding wheel markings)
 *
 * Actions: grinding_calc, wheel_select, burn_check
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type GrindingOperation =
  | "surface" | "cylindrical_od" | "cylindrical_id"
  | "centerless" | "creep_feed";

export interface GrindingInput {
  operation: GrindingOperation;
  wheel_diameter_mm: number;
  wheel_width_mm?: number;
  workpiece_diameter_mm?: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  material_hardness_hrc?: number;
  depth_of_cut_mm?: number;
  table_speed_mpm?: number;
}

export interface GrindingResult {
  wheel_speed: AtomicValue;
  wheel_rpm: AtomicValue;
  table_speed: AtomicValue;
  depth_of_cut: AtomicValue;
  specific_energy: AtomicValue;
  grinding_power: AtomicValue;
  recommended_grade: string;
  recommended_grit: number;
  dressing_interval: AtomicValue;
  burn_risk: "low" | "medium" | "high";
  g_ratio: AtomicValue;
  warnings: string[];
}

export interface WheelSpec {
  abrasive: string;
  grit: number;
  grade: string;
  structure: number;
  bond: string;
}

// ── Reference Data ────────────────────────────────────────────────

/** Recommended wheel speed (m/s) by operation */
const WHEEL_SPEEDS: Record<GrindingOperation, number> = {
  surface: 30,
  cylindrical_od: 33,
  cylindrical_id: 25,
  centerless: 33,
  creep_feed: 25,
};

/** Abrasive type by ISO material group */
const ABRASIVE_TYPE: Record<string, string> = {
  P: "WA",  // white aluminum oxide
  M: "WA",
  K: "GC",  // green silicon carbide
  N: "C",   // silicon carbide
  S: "SG",  // sol-gel ceramic
  H: "CBN", // cubic boron nitride
};

/** Wheel grade (soft→hard) by material hardness */
function recommendGrade(hrc: number): string {
  if (hrc > 60) return "H"; // soft wheel for hard material
  if (hrc > 50) return "J";
  if (hrc > 40) return "K";
  if (hrc > 30) return "L";
  return "M"; // harder wheel for soft material
}

/** Grit size by finish requirement */
function recommendGrit(
  op: GrindingOperation, hrc: number
): number {
  if (op === "creep_feed") return 46;
  if (hrc > 55) return 80;
  if (hrc > 40) return 60;
  return 46;
}

/** Specific grinding energy (J/mm³) by ISO group */
const SPECIFIC_ENERGY: Record<string, number> = {
  P: 35, M: 45, K: 25, N: 15, S: 55, H: 60,
};

/** Table/workpiece speed (m/min) by operation */
const TABLE_SPEEDS: Record<GrindingOperation, number> = {
  surface: 15,
  cylindrical_od: 20,
  cylindrical_id: 15,
  centerless: 25,
  creep_feed: 0.3,
};

/** Default depth of cut (mm) */
const DEFAULT_DOC: Record<GrindingOperation, number> = {
  surface: 0.02,
  cylindrical_od: 0.01,
  cylindrical_id: 0.005,
  centerless: 0.015,
  creep_feed: 1.0,
};

// ── Engine ─────────────────────────────────────────────────────────

export class GrindingWheelEngine {
  /**
   * Calculate grinding parameters and wheel recommendation.
   */
  calculate(input: GrindingInput): GrindingResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const op = input.operation;
    const wheelDia = input.wheel_diameter_mm;
    const hrc = input.material_hardness_hrc ?? 45;

    // Wheel speed
    const vs = WHEEL_SPEEDS[op];
    const wheelRpm = (vs * 1000 * 60) /
      (Math.PI * wheelDia);

    // Table/work speed
    const tableSpeed = input.table_speed_mpm ??
      TABLE_SPEEDS[op];

    // Depth of cut
    const doc = input.depth_of_cut_mm ?? DEFAULT_DOC[op];

    // Wheel recommendation
    const abrasive = ABRASIVE_TYPE[iso] ?? "WA";
    const grade = recommendGrade(hrc);
    const grit = recommendGrit(op, hrc);

    // Specific energy
    const u = SPECIFIC_ENERGY[iso] ?? 35;

    // Grinding power: P = u × Q' (specific removal rate)
    // Q' = ae × vw × bw (mm³/s per mm width)
    const wheelWidth = input.wheel_width_mm ?? 20;
    const vwMps = tableSpeed / 60; // m/min → m/s
    const qPrime = doc * vwMps * 1000; // mm³/s per mm width
    const power = u * qPrime * wheelWidth / 1000; // kW

    // Burn risk assessment
    // Burns occur when specific energy × removal rate exceeds
    // material's thermal threshold
    const thermalLoad = u * doc * tableSpeed;
    let burnRisk: "low" | "medium" | "high";
    if (thermalLoad > 800) {
      burnRisk = "high";
    } else if (thermalLoad > 400) {
      burnRisk = "medium";
    } else {
      burnRisk = "low";
    }

    // G-ratio estimation (volume removed / wheel volume lost)
    // Higher for CBN/diamond, lower for conventional
    let gRatio: number;
    if (abrasive === "CBN") {
      gRatio = 5000;
    } else if (abrasive === "SG") {
      gRatio = 80;
    } else {
      gRatio = 30;
    }

    // Dressing interval (parts or passes before dress)
    const dressInterval = abrasive === "CBN"
      ? 500 : Math.max(5, Math.round(gRatio * 2));

    // Warnings
    if (burnRisk === "high") {
      warnings.push(
        "High burn risk — reduce depth of cut or " +
        "increase coolant flow"
      );
    }
    if (vs * 1000 * 60 / (Math.PI * wheelDia) > 10000) {
      warnings.push(
        "Wheel RPM > 10,000 — verify wheel speed rating"
      );
    }
    if (op === "cylindrical_id" &&
        input.workpiece_diameter_mm &&
        wheelDia > input.workpiece_diameter_mm * 0.7) {
      warnings.push(
        "ID wheel > 70% of bore — limited contact clearance"
      );
    }
    if (doc > 0.05 && op !== "creep_feed") {
      warnings.push(
        "Deep cut for conventional grinding — " +
        "consider creep-feed"
      );
    }

    return {
      wheel_speed: av(vs, "m/s", 0.05,
        `Standard ${op} grinding speed`),
      wheel_rpm: av(Math.round(wheelRpm), "rev/min", 0.05,
        "Vs × 1000 × 60 / (π × D_wheel)"),
      table_speed: av(r1(tableSpeed), "m/min", 0.1,
        `${op} table speed`),
      depth_of_cut: av(doc, "mm", 0.1,
        `Default ${op} DOC`),
      specific_energy: av(u, "J/mm³", 0.15,
        "Grinding energy tables"),
      grinding_power: av(r2(power), "kW", 0.2,
        "u × Q' × width"),
      recommended_grade: `${abrasive}${grit}-${grade}5-V`,
      recommended_grit: grit,
      dressing_interval: av(dressInterval, "passes", 0.25,
        "Based on G-ratio"),
      burn_risk: burnRisk,
      g_ratio: av(gRatio, ":1", 0.3,
        "Material removed / wheel worn"),
      warnings,
    };
  }

  /**
   * Parse a grinding wheel specification string.
   */
  parseWheelSpec(spec: string): WheelSpec | null {
    // Standard format: "WA60-K5-V" or "WA 60 K 5 V"
    const match = spec.match(
      /([A-Z]{1,3})\s*(\d+)\s*-?\s*([A-Z])\s*(\d+)\s*-?\s*([A-Z])/
    );
    if (!match) return null;

    return {
      abrasive: match[1],
      grit: parseInt(match[2]),
      grade: match[3],
      structure: parseInt(match[4]),
      bond: match[5],
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

export const grindingWheelEngine = new GrindingWheelEngine();
