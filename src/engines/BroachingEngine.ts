/**
 * BroachingEngine — Broaching Process Calculations
 *
 * Calculates broaching parameters for internal/external profiles:
 * - Cutting force and pull/push force requirements
 * - Rise per tooth (chip load) optimization
 * - Broach speed and cycle time
 * - Tool life estimation
 * - Keyway and spline broaching specifics
 *
 * Reference: Machinery's Handbook 31st Ed. Ch.27 "Broaching",
 *            NACHI broaching technical guide,
 *            ANSI B94.37 (Broach standards)
 *
 * Actions: broach_force, broach_params, broach_keyway, broach_cycle
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type BroachType =
  | "pull" | "push" | "surface" | "pot"
  | "rotary" | "continuous";

export type ProfileType =
  | "keyway" | "spline" | "hex" | "square"
  | "round" | "serration" | "custom";

export interface BroachingInput {
  profile_type: ProfileType;
  broach_type?: BroachType;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  material_hardness_hrc?: number;

  // Geometry
  cut_length_mm: number;
  cut_depth_mm: number;
  cut_width_mm?: number;

  // Keyway-specific
  keyway_width_mm?: number;
  keyway_depth_mm?: number;
  bore_diameter_mm?: number;

  // Spline-specific
  spline_count?: number;

  // Broach parameters (optional — engine will calculate defaults)
  rise_per_tooth_mm?: number;
  cutting_speed_mpm?: number;
  tooth_pitch_mm?: number;

  coolant?: "flood" | "oil" | "dry";
}

export interface BroachingResult {
  cutting_force: AtomicValue;
  pull_force: AtomicValue;
  cutting_speed: AtomicValue;
  rise_per_tooth: AtomicValue;
  number_of_cutting_teeth: AtomicValue;
  broach_length: AtomicValue;
  cycle_time: AtomicValue;
  power: AtomicValue;
  minimum_tonnage: AtomicValue;
  surface_finish_ra: AtomicValue;
  broach_type: BroachType;
  warnings: string[];
}

export interface KeywayResult {
  keyway_width: AtomicValue;
  keyway_depth: AtomicValue;
  cutting_force: AtomicValue;
  broach_length: AtomicValue;
  cycle_time: AtomicValue;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Specific cutting force for broaching (N/mm²) by ISO group */
const BROACH_KC: Record<string, number> = {
  P: 2500,  // Carbon/alloy steel
  M: 2800,  // Stainless steel
  K: 1800,  // Cast iron
  N: 900,   // Aluminum
  S: 3200,  // Superalloy
  H: 4000,  // Hardened steel
};

/** Base cutting speeds for broaching (m/min) */
const BROACH_SPEEDS: Record<string, number> = {
  P: 6,   M: 4,   K: 8,
  N: 15,  S: 2,   H: 3,
};

/** Rise per tooth (mm) by ISO group — roughing */
const BASE_RISE: Record<string, number> = {
  P: 0.06,  M: 0.04,  K: 0.08,
  N: 0.10,  S: 0.03,  H: 0.025,
};

/** Standard keyway dimensions (ANSI B17.1) — width × depth for bore dia */
const KEYWAY_STANDARDS: Array<{
  bore_min: number;
  bore_max: number;
  width: number;
  depth: number;
}> = [
  { bore_min: 6, bore_max: 8, width: 2, depth: 1.2 },
  { bore_min: 8, bore_max: 10, width: 3, depth: 1.8 },
  { bore_min: 10, bore_max: 12, width: 4, depth: 2.5 },
  { bore_min: 12, bore_max: 17, width: 5, depth: 3.0 },
  { bore_min: 17, bore_max: 22, width: 6, depth: 3.5 },
  { bore_min: 22, bore_max: 30, width: 8, depth: 4.0 },
  { bore_min: 30, bore_max: 38, width: 10, depth: 5.0 },
  { bore_min: 38, bore_max: 44, width: 12, depth: 5.0 },
  { bore_min: 44, bore_max: 50, width: 14, depth: 5.5 },
  { bore_min: 50, bore_max: 58, width: 16, depth: 6.0 },
  { bore_min: 58, bore_max: 65, width: 18, depth: 7.0 },
  { bore_min: 65, bore_max: 75, width: 20, depth: 7.5 },
  { bore_min: 75, bore_max: 85, width: 22, depth: 9.0 },
  { bore_min: 85, bore_max: 95, width: 25, depth: 9.0 },
  { bore_min: 95, bore_max: 110, width: 28, depth: 10.0 },
];

// ── Engine ─────────────────────────────────────────────────────────

export class BroachingEngine {
  /**
   * Calculate full broaching parameters.
   */
  calculate(input: BroachingInput): BroachingResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const cutLen = input.cut_length_mm;
    const cutDepth = input.cut_depth_mm;
    const cutWidth = input.cut_width_mm ?? cutDepth;

    // Broach type selection
    const broachType = input.broach_type ?? this._selectBroachType(input);

    // Rise per tooth
    let rpt = input.rise_per_tooth_mm ?? BASE_RISE[iso] ?? 0.06;
    if (input.material_hardness_hrc && input.material_hardness_hrc > 40) {
      rpt *= 0.7;
      warnings.push("Reduced rise/tooth for high hardness");
    }

    // Cutting speed
    let vc = input.cutting_speed_mpm ?? BROACH_SPEEDS[iso] ?? 6;
    if (input.coolant === "dry") {
      vc *= 0.6;
      warnings.push("Dry broaching — reduced speed");
    }
    if (input.coolant === "oil") {
      vc *= 1.1;
    }

    // Specific cutting force
    let kc = BROACH_KC[iso] ?? 2500;
    if (input.material_hardness_hrc) {
      kc *= 1 + (input.material_hardness_hrc - 25) * 0.015;
    }

    // Number of cutting teeth
    const numCuttingTeeth = Math.ceil(cutDepth / rpt);

    // Tooth pitch — must ensure ≥2 teeth in cut at all times
    const toothPitch = input.tooth_pitch_mm
      ?? Math.max(8, cutLen * 0.4);
    const teethInCut = Math.floor(cutLen / toothPitch) + 1;

    if (teethInCut < 2) {
      warnings.push(
        "Only 1 tooth in cut — increase tooth pitch " +
        "or cut length for smooth cutting"
      );
    }

    // Cutting force (N) = kc × width × rise_per_tooth × teeth_in_cut
    const cuttingForce = kc * cutWidth * rpt * teethInCut;

    // Pull force includes friction (1.1× cutting force for pull broach)
    const frictionFactor = broachType === "pull" ? 1.1
      : broachType === "push" ? 1.0 : 1.05;
    const pullForce = cuttingForce * frictionFactor;

    // Broach total length estimate
    const shankLength = 150; // typical shank
    const pilotLength = cutLen + 20;
    const cuttingLength = numCuttingTeeth * toothPitch;
    const finishTeeth = 5;
    const finishLength = finishTeeth * toothPitch;
    const broachLength = shankLength + pilotLength +
      cuttingLength + finishLength;

    // Cycle time
    const strokeLength = broachLength + cutLen;
    const returnSpeed = vc * 2; // return stroke faster
    const cutTime = strokeLength / (vc * 1000 / 60); // seconds
    const returnTime = strokeLength / (returnSpeed * 1000 / 60);
    const cycleTime = (cutTime + returnTime) / 60; // minutes

    // Power (kW)
    const power = (cuttingForce * vc) / 60000;

    // Minimum machine tonnage (tonnes)
    const minTonnage = (pullForce / 9810) * 1.3; // 30% safety factor

    // Surface finish
    let ra = 0.8;
    if (iso === "N") ra = 0.4;
    if (iso === "H" || iso === "S") ra = 1.2;
    if (rpt > 0.08) ra *= 1.3;

    return {
      cutting_force: av(round1(cuttingForce), "N", 0.15,
        "Kc × w × rpt × teeth_in_cut"),
      pull_force: av(round1(pullForce), "N", 0.15,
        "cutting_force × friction_factor"),
      cutting_speed: av(round1(vc), "m/min", 0.1,
        "Machinery's Handbook broaching speeds"),
      rise_per_tooth: av(round3(rpt), "mm", 0.1,
        "Machinery's Handbook Table 27-1"),
      number_of_cutting_teeth: av(numCuttingTeeth, "teeth", 0,
        "cut_depth / rise_per_tooth"),
      broach_length: av(round1(broachLength), "mm", 0.1,
        "shank + pilot + cutting + finish"),
      cycle_time: av(round2(cycleTime), "min", 0.15,
        "stroke / speed + return"),
      power: av(round2(power), "kW", 0.15,
        "F × Vc / 60000"),
      minimum_tonnage: av(round1(minTonnage), "tonnes", 0.2,
        "pull_force / 9810 × 1.3 safety"),
      surface_finish_ra: av(round2(ra), "μm", 0.25,
        "Empirical broach finish model"),
      broach_type: broachType,
      warnings,
    };
  }

  /**
   * Calculate keyway broaching parameters (ANSI B17.1).
   */
  keyway(input: {
    bore_diameter_mm: number;
    bore_length_mm: number;
    material_iso_group?: string;
    material_hardness_hrc?: number;
    keyway_width_mm?: number;
    keyway_depth_mm?: number;
  }): KeywayResult {
    const warnings: string[] = [];
    const d = input.bore_diameter_mm;

    // Look up standard keyway size
    const std = KEYWAY_STANDARDS.find(
      s => d >= s.bore_min && d < s.bore_max
    );

    const kw = input.keyway_width_mm ?? std?.width ?? d * 0.25;
    const kd = input.keyway_depth_mm ?? std?.depth ?? kw * 0.5;

    if (!std && !input.keyway_width_mm) {
      warnings.push(
        `No ANSI standard for ${d}mm bore — ` +
        "using estimated dimensions"
      );
    }

    const result = this.calculate({
      profile_type: "keyway",
      cut_length_mm: input.bore_length_mm,
      cut_depth_mm: kd,
      cut_width_mm: kw,
      material_iso_group:
        (input.material_iso_group as BroachingInput["material_iso_group"])
        ?? "P",
      material_hardness_hrc: input.material_hardness_hrc,
    });

    return {
      keyway_width: av(kw, "mm", 0, "ANSI B17.1"),
      keyway_depth: av(kd, "mm", 0, "ANSI B17.1"),
      cutting_force: result.cutting_force,
      broach_length: result.broach_length,
      cycle_time: result.cycle_time,
      warnings: [...warnings, ...result.warnings],
    };
  }

  // ── Private ────────────────────────────────────────────────────

  private _selectBroachType(input: BroachingInput): BroachType {
    if (input.profile_type === "keyway" ||
        input.profile_type === "spline" ||
        input.profile_type === "hex") {
      return input.cut_length_mm > 100 ? "pull" : "push";
    }
    if (input.profile_type === "round") return "pot";
    return "pull";
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export const broachingEngine = new BroachingEngine();
