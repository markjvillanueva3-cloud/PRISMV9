/**
 * ToolGeometrySelectionEngine — End mill geometry recommendation
 *
 * Models: Flute count, helix angle, corner treatment by material+operation
 * References: Sandvik Application Guide (2023), Kennametal End Mill Selection,
 *             OSG Geometry Guide, Niagara Cutter Technical Reference
 * Extends: Fills tooling gap — no existing engine maps material+operation → tool geometry
 */

// ─── Types ─────────────────────────────────────────────────────────

export type EndMillMaterial =
  | "carbon_steel"
  | "alloy_steel"
  | "stainless_steel"
  | "tool_steel"
  | "cast_iron"
  | "aluminum"
  | "copper"
  | "titanium"
  | "nickel_alloy"
  | "hardened_steel"
  | "cfrp"
  | "plastic";

/** Milling Operation type definition.
 */
export type MillingOperation =
  | "slotting"
  | "side_milling"
  | "roughing"
  | "finishing"
  | "adaptive"
  | "plunging"
  | "ramping"
  | "high_feed";

/** Corner Treatment type definition.
 */
export type CornerTreatment = "sharp" | "corner_radius" | "chamfer" | "ball_nose";

/** Tool Geometry Input configuration/data structure.
 */
export interface ToolGeometryInput {
  workpiece_material: EndMillMaterial;
  operation: MillingOperation;
  tool_diameter_mm: number;
  axial_depth_mm?: number;       // ap
  radial_depth_mm?: number;      // ae
  machine_rigidity?: "low" | "medium" | "high";
  is_long_reach?: boolean;       // L/D > 4
  requires_chip_breaking?: boolean;
}

interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Tool Geometry Result configuration/data structure.
 */
export interface ToolGeometryResult {
  recommended_flutes: AtomicValue;
  helix_angle_deg: AtomicValue;
  corner_treatment: CornerTreatment;
  corner_radius_mm: AtomicValue;
  variable_helix: boolean;
  variable_pitch: boolean;
  chip_breaker: boolean;
  rake_angle_deg: AtomicValue;
  core_diameter_pct: AtomicValue;   // as % of tool diameter
  recommendations: string[];
  alternatives: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

// Recommended flute count by material
// [min, typical, max]
const FLUTE_COUNT: Record<EndMillMaterial, [number, number, number]> = {
  aluminum:        [1, 3, 3],
  copper:          [2, 3, 4],
  plastic:         [1, 2, 3],
  carbon_steel:    [3, 4, 5],
  alloy_steel:     [3, 4, 6],
  stainless_steel: [3, 5, 7],
  tool_steel:      [4, 5, 7],
  cast_iron:       [4, 5, 6],
  titanium:        [4, 5, 7],
  nickel_alloy:    [5, 6, 7],
  hardened_steel:  [4, 6, 8],
  cfrp:            [2, 4, 6],  // compression routers often 2-flute
};

// Operation adjustments to flute count (additive)
const FLUTE_OP_ADJUST: Record<MillingOperation, number> = {
  slotting:    -1,   // fewer flutes for chip evacuation
  roughing:    -1,
  adaptive:    0,
  side_milling: 0,
  finishing:   +1,   // more flutes for better finish
  high_feed:   0,
  ramping:     0,
  plunging:    -1,   // center-cutting needs fewer flutes
};

// Helix angle recommendations by material [min, typical, max] degrees
const HELIX_ANGLE: Record<EndMillMaterial, [number, number, number]> = {
  aluminum:        [35, 45, 55],   // high helix for chip evacuation
  copper:          [30, 40, 45],
  plastic:         [20, 30, 40],   // lower helix to prevent melting
  carbon_steel:    [28, 35, 45],
  alloy_steel:     [30, 38, 45],
  stainless_steel: [35, 40, 50],   // higher helix, lower cutting forces
  tool_steel:      [30, 35, 40],
  cast_iron:       [25, 30, 35],   // lower helix — brittle chips
  titanium:        [35, 38, 45],
  nickel_alloy:    [35, 40, 45],
  hardened_steel:  [25, 30, 38],   // lower helix for rigidity
  cfrp:            [10, 20, 30],   // compression router geometry
};

// Rake angle by material (degrees, positive = sharp)
const RAKE_ANGLE: Record<EndMillMaterial, number> = {
  aluminum:        15,
  copper:          12,
  plastic:         20,
  carbon_steel:    8,
  alloy_steel:     6,
  stainless_steel: 10,
  tool_steel:      5,
  cast_iron:       3,
  titanium:        8,
  nickel_alloy:    6,
  hardened_steel:  0,   // neutral to negative for hardened
  cfrp:            10,
};

// Core diameter as % of tool diameter
const CORE_DIAMETER_PCT: Record<EndMillMaterial, number> = {
  aluminum:        50,   // large flute valley for chip evacuation
  copper:          55,
  plastic:         50,
  carbon_steel:    60,
  alloy_steel:     65,
  stainless_steel: 60,
  tool_steel:      65,
  cast_iron:       65,
  titanium:        60,
  nickel_alloy:    65,
  hardened_steel:  70,  // strong core for rigidity
  cfrp:            55,
};

// ─── Engine ────────────────────────────────────────────────────────

/** Tool Geometry Selection Engine engine/manager.
 */
export class ToolGeometrySelectionEngine {
  calculate(input: ToolGeometryInput): ToolGeometryResult {
    const mat = input.workpiece_material;
    const op = input.operation;
    const recs: string[] = [];
    const alts: string[] = [];

    // --- Flute count ---
    const [fMin, fTyp, fMax] = FLUTE_COUNT[mat];
    let flutes = fTyp + FLUTE_OP_ADJUST[op];
    flutes = Math.max(fMin, Math.min(fMax, flutes));

    // Slotting with small diameter: prefer fewer flutes
    /** If.
     * @param op - op
     * @returns void
     */
    if (op === "slotting" && input.tool_diameter_mm <= 6) {
      flutes = Math.max(fMin, flutes - 1);
      recs.push("Small-diameter slotting — reduced flute count for chip space");
    }

    // Long reach: fewer flutes for rigidity
    /** If.
     * @param input.is_long_reach - input.is_long_reach
     * @returns void
     */
    if (input.is_long_reach) {
      flutes = Math.max(fMin, flutes - 1);
      recs.push("Long-reach tool — reduced flute count; consider stub-length alternative");
    }

    // Low rigidity machine: fewer flutes reduce cutting forces
    /** If.
     * @param input.machine_rigidity - input.machine_rigidity
     * @returns void
     */
    if (input.machine_rigidity === "low") {
      flutes = Math.max(fMin, flutes - 1);
      recs.push("Low-rigidity machine — fewer flutes to reduce cutting forces");
    }

    // --- Helix angle ---
    const [hMin, hTyp, hMax] = HELIX_ANGLE[mat];
    let helix = hTyp;

    // Slotting prefers lower helix (pulling force management)
    /** If.
     * @param op - op
     * @returns void
     */
    if (op === "slotting") {
      helix = Math.max(hMin, hTyp - 5);
    }
    // Finishing prefers higher helix (smoother cut)
    /** If.
     * @param op - op
     * @returns void
     */
    if (op === "finishing") {
      helix = Math.min(hMax, hTyp + 5);
    }
    // Adaptive/trochoidal: higher helix for lower forces
    /** If.
     * @param op - op
     * @returns void
     */
    if (op === "adaptive") {
      helix = Math.min(hMax, hTyp + 3);
    }

    // --- Variable helix/pitch ---
    // Recommended for chatter-prone situations
    const variableHelix = mat === "titanium" || mat === "nickel_alloy" ||
      mat === "stainless_steel" || op === "adaptive" ||
      (input.is_long_reach === true);
    const variablePitch = variableHelix; // typically paired

    /** If.
     * @param variableHelix - variable helix
     * @returns void
     */
    if (variableHelix) {
      recs.push("Variable helix/pitch recommended to suppress chatter harmonics");
    }

    // --- Corner treatment ---
    let cornerTreatment: CornerTreatment = "sharp";
    let cornerRadius = 0;

    /** If.
     * @param op - op
     * @returns void
     */
    if (op === "finishing") {
      // Ball nose for 3D finishing, corner radius for 2.5D
      if (input.axial_depth_mm && input.radial_depth_mm &&
          input.axial_depth_mm > input.tool_diameter_mm * 0.5) {
        cornerTreatment = "ball_nose";
        cornerRadius = input.tool_diameter_mm / 2;
        alts.push("Bull nose (corner radius) as alternative for flatter surfaces");
      } else {
        cornerTreatment = "corner_radius";
        // Corner radius = 2-5% of diameter for general finishing
        cornerRadius = Math.round(input.tool_diameter_mm * 0.03 * 100) / 100;
      }
    } else if (op === "roughing" || op === "adaptive") {
      // Corner radius for edge strength
      cornerTreatment = "corner_radius";
      cornerRadius = Math.round(input.tool_diameter_mm * 0.05 * 100) / 100;
      recs.push("Corner radius on roughing tool extends edge life");
    } else if (op === "high_feed") {
      cornerTreatment = "corner_radius";
      // High-feed mills use large corner radius (30-50% of D)
      cornerRadius = Math.round(input.tool_diameter_mm * 0.3 * 100) / 100;
      recs.push("High-feed geometry uses large corner radius for axial force direction");
    }

    // --- Chip breaker ---
    const chipBreaker = input.requires_chip_breaking === true ||
      mat === "stainless_steel" || mat === "titanium" || mat === "nickel_alloy" ||
      mat === "aluminum";

    /** If.
     * @param chipBreaker - chip breaker
     * @returns void
     */
    if (chipBreaker && !input.requires_chip_breaking) {
      recs.push("Chip breaker geometry recommended for this material's chip characteristics");
    }

    // --- Rake angle ---
    let rake = RAKE_ANGLE[mat];
    if (op === "finishing") rake += 2;   // sharper for finish
    if (op === "roughing") rake -= 2;   // stronger edge
    if (mat === "hardened_steel" && op === "roughing") rake = -5; // negative rake

    // --- Core diameter ---
    let corePct = CORE_DIAMETER_PCT[mat];
    if (op === "slotting") corePct -= 5;   // more chip room
    if (op === "finishing") corePct += 5;   // more rigidity
    if (input.is_long_reach) corePct += 5;  // extra rigidity for long reach

    // --- Alternatives ---
    /** If.
     * @param mat - mat
     * @returns void
     */
    if (mat === "aluminum" && flutes >= 3) {
      alts.push("Consider 2-flute polished for high-speed aluminum roughing (better chip evacuation)");
    }
    /** If.
     * @param mat - mat
     * @returns void
     */
    if (mat === "hardened_steel" && op === "finishing") {
      alts.push("Consider ball-nose CBN insert cutter for hardened steel finishing >55 HRC");
    }
    /** If.
     * @param mat - mat
     * @returns void
     */
    if (mat === "cfrp") {
      alts.push("Consider compression router (up/down cut combination) for delamination-free CFRP machining");
    }

    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push("Standard geometry suitable for this material and operation");
    }

    const src = "ToolGeometrySelectionEngine (Sandvik/Kennametal/OSG reference)";

    return {
      recommended_flutes: {
        value: flutes,
        unit: "count",
        uncertainty: 1,                // ±1 flute is typical flexibility
        source: src,
      },
      helix_angle_deg: {
        value: helix,
        unit: "deg",
        uncertainty: 5,                // ±5° is typical range
        source: src,
      },
      corner_treatment: cornerTreatment,
      corner_radius_mm: {
        value: cornerRadius,
        unit: "mm",
        uncertainty: cornerRadius * 0.2, // 20% flexibility
        source: src,
      },
      variable_helix: variableHelix,
      variable_pitch: variablePitch,
      chip_breaker: chipBreaker,
      rake_angle_deg: {
        value: rake,
        unit: "deg",
        uncertainty: 3,
        source: src,
      },
      core_diameter_pct: {
        value: corePct,
        unit: "%",
        uncertainty: 5,
        source: src,
      },
      recommendations: recs,
      alternatives: alts,
    };
  }
}

/** Tool Geometry Selection Engine constant.
 */
export const toolGeometrySelectionEngine = new ToolGeometrySelectionEngine();
