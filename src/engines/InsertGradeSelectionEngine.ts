/**
 * InsertGradeSelectionEngine — ISO turning insert grade selection
 *
 * Models: Material → ISO application group (P/M/K/N/S/H), substrate class,
 *         chipbreaker recommendation, insert shape selection
 * References: ISO 513:2012 (carbide classification), Sandvik Coromant Turning Guide,
 *             Kennametal Insert Selection, ANSI B212.4
 * Extends: Fills turning gap — TurningForceEngine handles forces but not grade/insert selection
 */

import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";

// ─── Types ─────────────────────────────────────────────────────────

export type WorkpieceMaterial =
  | "low_carbon_steel"    // P01-P20
  | "medium_carbon_steel" // P10-P30
  | "high_carbon_steel"   // P20-P40
  | "alloy_steel"         // P10-P40
  | "stainless_austenitic" // M05-M25
  | "stainless_martensitic" // M10-M30
  | "stainless_duplex"    // M15-M35
  | "cast_iron_grey"      // K01-K20
  | "cast_iron_nodular"   // K05-K25
  | "aluminum_wrought"    // N01-N15
  | "aluminum_cast_si"    // N05-N25
  | "copper_alloy"        // N01-N20
  | "titanium"            // S05-S25
  | "nickel_alloy"        // S10-S30
  | "hardened_steel"      // H01-H15
  | "cobalt_alloy";       // S15-S35

/** Turning Op type definition.
 */
export type TurningOp =
  | "roughing"
  | "medium"
  | "finishing"
  | "heavy_roughing"
  | "light_finishing";

/** Insert Shape type definition.
 */
export type InsertShape =
  | "C_rhombic_80"   // CNMG — strong, versatile
  | "D_rhombic_55"   // DNMG — medium accessibility
  | "S_square"       // SNMG — strong, 4 edges
  | "T_triangle"     // TNMG — versatile, 3 edges
  | "V_rhombic_35"   // VNMG — good accessibility
  | "W_trigon"       // WNMG — 6 edges, strong
  | "R_round";       // RCMT — strongest, profiling

/** Insert Grade Input configuration/data structure.
 */
export interface InsertGradeInput {
  workpiece_material: WorkpieceMaterial;
  operation: TurningOp;
  depth_of_cut_mm?: number;
  feed_mm_rev?: number;
  cutting_speed_m_min?: number;
  workpiece_hardness_hrc?: number;
  interrupted_cut?: boolean;
  requires_chip_control?: boolean;
  coolant_available?: boolean;
}

interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Insert Grade Result configuration/data structure.
 */
export interface InsertGradeResult {
  iso_application_group: string;         // "P", "M", "K", "N", "S", "H"
  iso_range: AtomicValue;                // numeric subclass e.g. 15 for P15
  substrate_class: string;               // "uncoated_carbide", "cvd_coated", "pvd_coated", "cermet", "ceramic", "cbn", "pcd"
  chipbreaker: string;                   // "positive_light", "positive_medium", "negative_rough", "wiper"
  insert_shape: InsertShape;
  clearance_angle: string;               // "N_0", "C_7", "P_11", "B_5"
  edge_count: AtomicValue;
  nose_radius_mm: AtomicValue;
  toughness_vs_wear: AtomicValue;        // 0 = max wear resistance, 1 = max toughness
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

// ISO 513 application group mapping
const ISO_GROUP: Record<WorkpieceMaterial, string> = {
  low_carbon_steel:      "P",
  medium_carbon_steel:   "P",
  high_carbon_steel:     "P",
  alloy_steel:           "P",
  stainless_austenitic:  "M",
  stainless_martensitic: "M",
  stainless_duplex:      "M",
  cast_iron_grey:        "K",
  cast_iron_nodular:     "K",
  aluminum_wrought:      "N",
  aluminum_cast_si:      "N",
  copper_alloy:          "N",
  titanium:              "S",
  nickel_alloy:          "S",
  hardened_steel:        "H",
  cobalt_alloy:          "S",
};

// Base ISO sub-number by operation (lower = harder/wear-resistant, higher = tougher)
const ISO_SUB_BASE: Record<TurningOp, number> = {
  light_finishing: 5,
  finishing:       10,
  medium:          20,
  roughing:        30,
  heavy_roughing:  40,
};

// Material-specific sub-number adjustment
const ISO_SUB_ADJUST: Record<WorkpieceMaterial, number> = {
  low_carbon_steel:       0,
  medium_carbon_steel:    5,
  high_carbon_steel:      5,
  alloy_steel:            5,
  stainless_austenitic:   5,
  stainless_martensitic:  0,
  stainless_duplex:       10,
  cast_iron_grey:         -5,
  cast_iron_nodular:      0,
  aluminum_wrought:       -5,
  aluminum_cast_si:       5,    // Si is abrasive
  copper_alloy:           -5,
  titanium:               10,
  nickel_alloy:           10,
  hardened_steel:         -5,   // H range is only 01-15
  cobalt_alloy:           15,
};

// Substrate recommendation by group+operation
function selectSubstrate(group: string, op: TurningOp, interrupted: boolean, hardnessHrc?: number): string {
  if (group === "H") {
    if (hardnessHrc && hardnessHrc >= 58) return "cbn";
    if (op === "finishing" || op === "light_finishing") return "cbn";
    return "ceramic";
  }
  if (group === "N") {
    return "pcd"; // PCD or uncoated for aluminum/copper
  }
  if (group === "S") {
    // Superalloys: PVD for finishing, uncoated for roughing (heat management)
    if (op === "finishing" || op === "light_finishing") return "pvd_coated";
    return "uncoated_carbide";
  }
  // P, M, K: CVD for roughing, PVD for finishing
  if (interrupted) return "pvd_coated"; // PVD handles shock better
  if (op === "roughing" || op === "heavy_roughing") return "cvd_coated";
  if (op === "finishing" || op === "light_finishing") {
    return group === "P" ? "cermet" : "pvd_coated";
  }
  return "cvd_coated";
}

// Chipbreaker selection
function selectChipbreaker(op: TurningOp, mat: WorkpieceMaterial, requiresControl: boolean): string {
  if (op === "heavy_roughing") return "negative_rough";
  if (op === "roughing") return "negative_medium";
  if (op === "light_finishing") return "positive_light";
  if (op === "finishing") {
    if (requiresControl) return "wiper"; // wiper for surface finish + chip control
    return "positive_light";
  }
  // Medium operations
  if (mat === "stainless_austenitic" || mat === "stainless_duplex") {
    return "positive_medium"; // positive rake reduces work hardening
  }
  return "negative_medium";
}

// Insert shape selection
function selectInsertShape(op: TurningOp, mat: WorkpieceMaterial): InsertShape {
  if (op === "heavy_roughing") return "S_square";      // strongest 90° corner
  if (op === "roughing") return "C_rhombic_80";         // strong, good access
  if (op === "finishing" || op === "light_finishing") {
    if (mat === "titanium" || mat === "nickel_alloy") return "V_rhombic_35"; // best access
    return "D_rhombic_55";                               // good access, decent strength
  }
  // Medium: versatile shape
  return "C_rhombic_80";
}

// Nose radius by operation
function selectNoseRadius(op: TurningOp, doc?: number): number {
  switch (op) {
    case "heavy_roughing": return 1.6;
    case "roughing":       return 1.2;
    case "medium":         return 0.8;
    case "finishing":      return 0.4;
    case "light_finishing": return 0.2;
  }
}

// Edge count by shape
const EDGE_COUNT: Record<InsertShape, number> = {
  C_rhombic_80: 2,
  D_rhombic_55: 2,
  S_square:     4,
  T_triangle:   3,
  V_rhombic_35: 2,
  W_trigon:     6,
  R_round:      1,   // infinite positions but counted as 1 indexing
};

// ─── Engine ────────────────────────────────────────────────────────

/** Insert Grade Selection Engine engine/manager.
 */
export class InsertGradeSelectionEngine {
  calculate(input: InsertGradeInput): InsertGradeResult {
    const mat = input.workpiece_material;
    const op = input.operation;
    const recs: string[] = [];

    // --- ISO application group ---
    const group = ISO_GROUP[mat];

    // --- ISO sub-number ---
    let subNum = ISO_SUB_BASE[op] + ISO_SUB_ADJUST[mat];
    // Interrupted cut → tougher grade (+5)
    /** If.
     * @param input.interrupted_cut - input.interrupted_cut
     * @returns void
     */
    if (input.interrupted_cut) {
      subNum += 5;
      recs.push("Interrupted cut — tougher grade selected (+5 ISO sub-number)");
    }
    // Clamp to valid ranges
    const maxSub = group === "H" ? 15 : group === "N" ? 25 : 45;
    subNum = Math.max(1, Math.min(maxSub, subNum));
    // Round to nearest 5
    subNum = Math.round(subNum / 5) * 5;
    if (subNum < 1) subNum = 5;

    // --- Substrate ---
    const substrate = selectSubstrate(group, op, input.interrupted_cut ?? false, input.workpiece_hardness_hrc);

    // --- Chipbreaker ---
    const chipbreaker = selectChipbreaker(op, mat, input.requires_chip_control ?? false);

    // --- Insert shape ---
    const shape = selectInsertShape(op, mat);

    // --- Nose radius ---
    const noseR = selectNoseRadius(op, input.depth_of_cut_mm);

    // --- Clearance angle ---
    let clearance = "N_0"; // negative insert (most common for turning)
    if (chipbreaker.startsWith("positive")) clearance = "P_11";
    if (op === "light_finishing") clearance = "C_7";

    // --- Toughness vs wear balance (0-1 scale) ---
    const toughnessBase = (subNum / maxSub);
    const toughness = Math.round(toughnessBase * 100) / 100;

    // --- Recommendations ---
    /** If.
     * @param substrate - substrate
     * @returns void
     */
    if (substrate === "cbn" && input.coolant_available !== false) {
      recs.push("CBN grade: dry machining recommended — coolant thermal shock can crack insert");
    }
    if (substrate === "pcd" && mat.startsWith("aluminum_cast")) {
      recs.push("High-Si aluminum: PCD grade essential — carbide wears rapidly above 12% Si");
    }
    /** If.
     * @param mat - mat
     * @returns void
     */
    if (mat === "stainless_austenitic") {
      recs.push("Austenitic stainless: use positive rake to minimize work hardening layer");
    }
    if (mat === "titanium" && (op === "roughing" || op === "heavy_roughing")) {
      recs.push("Titanium roughing: limit Vc to 40-60 m/min, use uncoated carbide for heat management");
    }
    /** If.
     * @param input.interrupted_cut - input.interrupted_cut
     * @returns void
     */
    if (input.interrupted_cut && substrate === "ceramic") {
      recs.push("WARNING: Ceramic grade on interrupted cut — high breakage risk; consider CBN or coated carbide");
    }
    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push("Standard grade selection — verify with manufacturer catalog for specific insert code");
    }

    const src = "InsertGradeSelectionEngine (ISO 513:2012, Sandvik/Kennametal reference)";

    const result: InsertGradeResult = {
      iso_application_group: group,
      iso_range: {
        value: subNum,
        unit: `${group}${String(subNum).padStart(2, "0")}`,
        uncertainty: 5,  // ±5 sub-number
        source: src,
      },
      substrate_class: substrate,
      chipbreaker,
      insert_shape: shape,
      clearance_angle: clearance,
      edge_count: {
        value: EDGE_COUNT[shape],
        unit: "edges",
        uncertainty: 0,
        source: src,
      },
      nose_radius_mm: {
        value: noseR,
        unit: "mm",
        uncertainty: noseR * 0.25,  // next size up/down
        source: src,
      },
      toughness_vs_wear: {
        value: toughness,
        unit: "ratio",
        uncertainty: 0.1,
        source: src,
      },
      recommendations: recs,
    };

    const pbResult = machiningPlaybookEngine.advise({
      categories: ["tool_selection", "material_tip"],
      operation_type: "turning",
      ...(input.workpiece_hardness_hrc != null ? { hardness_hrc: input.workpiece_hardness_hrc } : {}),
    });
    for (const rule of pbResult.rules) {
      if (rule.severity === "critical" || rule.severity === "important") {
        result.recommendations.push(`[Playbook ${rule.id}] ${rule.title}`);
      }
    }

    return result;
  }
}

/** Insert Grade Selection Engine constant.
 */
export const insertGradeSelectionEngine = new InsertGradeSelectionEngine();
