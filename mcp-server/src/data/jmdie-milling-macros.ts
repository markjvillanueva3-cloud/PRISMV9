/**
 * JM Die Milling/Turning Macros — Parametric Program Knowledge
 * ==============================================================
 * Extracted from H:/PRISM/BOX/MACRO PROGRAMS/ folder.
 * These are production-tested parametric programs with embedded formulas.
 *
 * Data Sources:
 *   - CASING_MACRO.MIN — Standard casing operations
 *   - CBORE_CASING_MACRO.MIN — Counter bore casing with undercut
 *
 * @module data/jmdie-milling-macros
 * @milestone MILL-MACRO-EXTRACT
 */

export interface MacroVariable {
  var: string;
  name: string;
  description: string;
  default_value: number;
  unit: "inch" | "mm" | "sfm" | "ipr" | "rpm" | "degrees" | "none";
  range?: { min: number; max: number };
  category: "stock" | "tool" | "speed" | "feed" | "depth" | "clearance" | "calculated" | "option";
}

export interface MacroFormula {
  name: string;
  formula: string;
  purpose: string;
  inputs: string[];
  output: string;
  output_unit: string;
}

export interface MacroProgram {
  id: string;
  name: string;
  file_path: string;
  description: string;
  machine_type: "lathe" | "mill" | "mill_turn";
  variables: MacroVariable[];
  formulas: MacroFormula[];
  tool_requirements: Array<{
    t_code: string;
    description: string;
    required: boolean;
  }>;
  operations: string[];
  g_codes_used: string[];
  safety_checks: string[];
  okuma_specific: boolean;
  total_lines: number;
}

/** JM Die parametric macros */
export const JM_DIE_MILLING_MACROS: MacroProgram[] = [
  // ========================================================================
  // CASING MACRO — Standard Casing Operations (Lathe)
  // ========================================================================
  {
    id: "MACRO-CASING-001",
    name: "Casing Macro",
    file_path: "H:/PRISM/BOX/MACRO PROGRAMS/CASING_MACRO.MIN",
    description: "Parametric program for standard casing operations including OD/ID turning, drilling, and cutoff",
    machine_type: "lathe",
    variables: [
      // Stock and Model
      { var: "V1", name: "STOCK_DIAMETER", description: "Stock bar diameter", default_value: 1.905, unit: "inch", category: "stock" },
      { var: "V2", name: "FINISH_OD", description: "Finished outside diameter", default_value: 1.755, unit: "inch", category: "stock" },
      { var: "V3", name: "DRILL_SIZE", description: "Drill size / start hole diameter", default_value: 0.59375, unit: "inch", category: "tool" },
      { var: "V4", name: "FINISH_ID", description: "Finished inside diameter", default_value: 0.618, unit: "inch", category: "stock" },
      { var: "V5", name: "PART_LENGTH", description: "Total part length", default_value: 2.015, unit: "inch", category: "stock" },
      { var: "V100", name: "STOCK_FACE_OFFSET", description: "Z zero offset from part face", default_value: 0.015, unit: "inch", category: "stock" },

      // OD Chamfer/Radius
      { var: "V6", name: "OD_CHAMFER_DEPTH", description: "OD chamfer Z depth or radius size", default_value: 0.04, unit: "inch", category: "stock" },
      { var: "V7", name: "OD_FEATURE_TYPE", description: "1=Chamfer, 2=Radius", default_value: 1, unit: "none", category: "option" },
      { var: "V8", name: "OD_CHAMFER_ANGLE", description: "OD chamfer angle", default_value: 45, unit: "degrees", category: "stock" },

      // ID Chamfer/Radius
      { var: "V9", name: "ID_CHAMFER_DEPTH", description: "ID chamfer Z depth or radius size", default_value: 0, unit: "inch", category: "stock" },
      { var: "V10", name: "ID_FEATURE_TYPE", description: "1=Chamfer, 2=Radius", default_value: 1, unit: "none", category: "option" },
      { var: "V11", name: "ID_CHAMFER_ANGLE", description: "ID chamfer angle", default_value: 45, unit: "degrees", category: "stock" },

      // Spot Drill Parameters
      { var: "V20", name: "SPOT_DRILL_DIA", description: "Spot drill diameter", default_value: 0.5, unit: "inch", category: "tool" },
      { var: "V21", name: "SPOT_DRILL_SFM", description: "Spot drill surface feet per minute", default_value: 131, unit: "sfm", category: "speed" },
      { var: "V19", name: "SPOT_DRILL_FEED", description: "Spot drill feed rate", default_value: 0.002, unit: "ipr", category: "feed" },
      { var: "V22", name: "SPOT_DRILL_DEPTH", description: "Spot drill depth", default_value: 0.08, unit: "inch", category: "depth" },

      // Drill 1 Parameters
      { var: "V25", name: "DRILL1_DIA", description: "Drill 1 diameter", default_value: 0.59375, unit: "inch", category: "tool" },
      { var: "V26", name: "DRILL1_SFM", description: "Drill 1 surface feet per minute", default_value: 95, unit: "sfm", category: "speed" },
      { var: "V27", name: "DRILL1_FEED", description: "Drill 1 feed rate", default_value: 0.005, unit: "ipr", category: "feed" },
      { var: "V28", name: "DRILL1_PECK", description: "Drill 1 peck depth", default_value: 0.13, unit: "inch", category: "depth" },
      { var: "V29", name: "DRILL1_POINT_ANGLE", description: "Drill 1 point angle", default_value: 130, unit: "degrees", category: "tool" },

      // Turning Speeds
      { var: "V45", name: "OD_ROUGH_SFM", description: "OD roughing SFM", default_value: 755, unit: "sfm", category: "speed" },
      { var: "V46", name: "OD_FINISH_SFM", description: "OD finishing SFM", default_value: 825, unit: "sfm", category: "speed" },
      { var: "V47", name: "ID_SFM", description: "ID rough/finish SFM", default_value: 400, unit: "sfm", category: "speed" },
      { var: "V48", name: "CUTOFF_SFM", description: "Cutoff SFM", default_value: 500, unit: "sfm", category: "speed" },

      // Turning Feeds
      { var: "V50", name: "FACE_ROUGH_FEED", description: "Face rough feed", default_value: 0.008, unit: "ipr", category: "feed" },
      { var: "V51", name: "FACE_FINISH_FEED", description: "Face finish feed", default_value: 0.0045, unit: "ipr", category: "feed" },
      { var: "V52", name: "OD_ROUGH_FEED", description: "OD rough feed", default_value: 0.012, unit: "ipr", category: "feed" },
      { var: "V53", name: "OD_FINISH_FEED", description: "OD finish feed", default_value: 0.0045, unit: "ipr", category: "feed" },
      { var: "V54", name: "ID_ROUGH_FEED", description: "ID rough feed", default_value: 0.007, unit: "ipr", category: "feed" },
      { var: "V55", name: "ID_FINISH_FEED", description: "ID finish feed", default_value: 0.0045, unit: "ipr", category: "feed" },
      { var: "V56", name: "CUTOFF_FEED", description: "Cutoff feed", default_value: 0.004, unit: "ipr", category: "feed" },

      // Depths of Cut
      { var: "V40", name: "OD_DOC", description: "OD depth of cut", default_value: 0.1, unit: "inch", category: "depth" },
      { var: "V41", name: "ID_DOC", description: "ID depth of cut", default_value: 0.06, unit: "inch", category: "depth" },
      { var: "V42", name: "FACE_DOC", description: "Face depth of cut", default_value: 0.08, unit: "inch", category: "depth" },

      // Clearances
      { var: "V60", name: "Z_CLEARANCE", description: "Z clearance", default_value: 0.03, unit: "inch", category: "clearance" },
      { var: "V61", name: "X_CLEARANCE", description: "X clearance added to stock", default_value: 0.03, unit: "inch", category: "clearance" },
      { var: "V62", name: "DRILL_Z_CLEARANCE", description: "Extra Z clearance for drilling", default_value: 0.5, unit: "inch", category: "clearance" },

      // Max Spindle Speeds
      { var: "V65", name: "ROUGH_MAX_RPM", description: "Rough max RPM", default_value: 2500, unit: "rpm", category: "speed" },
      { var: "V66", name: "FINISH_MAX_RPM", description: "Finish max RPM", default_value: 2500, unit: "rpm", category: "speed" },
    ],
    formulas: [
      {
        name: "RPM_FROM_SFM",
        formula: "RPM = SFM * 3.82 / DIAMETER",
        purpose: "Calculate spindle RPM from surface feet per minute and tool diameter",
        inputs: ["SFM", "DIAMETER"],
        output: "RPM",
        output_unit: "rpm",
      },
      {
        name: "SPOT_DRILL_RPM",
        formula: "V70 = [V21 * 3.82] / V20",
        purpose: "Spot drill RPM from SFM and diameter",
        inputs: ["V21 (SFM)", "V20 (DIA)"],
        output: "V70",
        output_unit: "rpm",
      },
      {
        name: "DRILL_POINT_DEPTH",
        formula: "V72 = V25 / 2 / TAN[V29 / 2]",
        purpose: "Calculate drill point depth from diameter and point angle",
        inputs: ["V25 (DIA)", "V29 (ANGLE)"],
        output: "V72",
        output_unit: "inch",
      },
      {
        name: "CHAMFER_START_DIA",
        formula: "V75 = V2 - [V6 * TAN[V8] * 2]",
        purpose: "Calculate OD chamfer start diameter from finish OD, depth, and angle",
        inputs: ["V2 (OD)", "V6 (DEPTH)", "V8 (ANGLE)"],
        output: "V75",
        output_unit: "inch",
      },
      {
        name: "OKUMA_ANGLE_CORRECTION",
        formula: "V84 = 180 - V8",
        purpose: "Convert standard chamfer angle to Okuma format (CCW from +Z)",
        inputs: ["V8 (ANGLE)"],
        output: "V84",
        output_unit: "degrees",
      },
    ],
    tool_requirements: [
      { t_code: "T010101", description: "FACE/OD ROUGH", required: true },
      { t_code: "T020202", description: "FACE/OD FINISH", required: true },
      { t_code: "T030303", description: "SPOT DRILL", required: true },
      { t_code: "T050505", description: "DRILL 1", required: true },
      { t_code: "T060606", description: "DRILL 2 (OPTIONAL)", required: false },
      { t_code: "T070707", description: "ID ROUGH (OPTIONAL)", required: false },
      { t_code: "T080808", description: "ID FINISH", required: true },
      { t_code: "T111111", description: "CUTOFF", required: true },
    ],
    operations: ["face_rough", "face_finish", "od_rough", "od_finish", "spot_drill", "drill", "id_rough", "id_finish", "chamfer", "cutoff"],
    g_codes_used: ["G00", "G01", "G02", "G03", "G18", "G40", "G42", "G43", "G50", "G80", "G90", "G95", "G96", "G140", "G270"],
    safety_checks: ["tool_length_validation", "diameter_range_check", "max_rpm_limit", "clearance_verification"],
    okuma_specific: true,
    total_lines: 400,
  },

  // ========================================================================
  // COUNTER BORE CASING MACRO — With Undercut Feature
  // ========================================================================
  {
    id: "MACRO-CBORE-001",
    name: "Counter Bore Casing Macro",
    file_path: "H:/PRISM/BOX/MACRO PROGRAMS/CBORE_CASING_MACRO.MIN",
    description: "Parametric program for casing with counter bore and optional undercut feature",
    machine_type: "lathe",
    variables: [
      // Stock and Model
      { var: "V1", name: "STOCK_DIAMETER", description: "Stock bar diameter", default_value: 2.54, unit: "inch", category: "stock" },
      { var: "V2", name: "FINISH_OD", description: "Finished outside diameter", default_value: 2.005, unit: "inch", category: "stock" },
      { var: "V3", name: "THRU_HOLE_DIA", description: "Through hole diameter", default_value: 0.747, unit: "inch", category: "stock" },
      { var: "V4", name: "CBORE_DIA", description: "Counter bore diameter", default_value: 1.233, unit: "inch", category: "stock" },
      { var: "V5", name: "PART_LENGTH", description: "Part length - OD", default_value: 2.515, unit: "inch", category: "stock" },
      { var: "V6", name: "CBORE_DEPTH", description: "Counter bore depth", default_value: 1.0, unit: "inch", category: "depth" },

      // Undercut Parameters (unique to CBORE macro)
      { var: "V140", name: "UNDERCUT_ANGLE", description: "Undercut taper angle", default_value: 4, unit: "degrees", category: "stock" },
      { var: "V141", name: "UNDERCUT_DIA_RED", description: "Undercut diameter reduction", default_value: 0.02, unit: "inch", category: "stock" },
      { var: "V142", name: "UNDERCUT_STRAIGHT", description: "Undercut straight length", default_value: 0.03, unit: "inch", category: "stock" },

      // Multi-drill setup
      { var: "V45", name: "DRILL2_ENABLE", description: "Enable drill 2 (0=No, 1=Yes)", default_value: 1, unit: "none", category: "option" },
      { var: "V37", name: "DRILL3_ENABLE", description: "Enable drill 3 - 180 deg (0=No, 1=Yes)", default_value: 1, unit: "none", category: "option" },

      // Turning Speeds (same as standard)
      { var: "V60", name: "OD_ROUGH_SFM", description: "OD roughing SFM", default_value: 755, unit: "sfm", category: "speed" },
      { var: "V61", name: "OD_FINISH_SFM", description: "OD finishing SFM", default_value: 825, unit: "sfm", category: "speed" },
      { var: "V62", name: "ID_ROUGH_SFM", description: "ID rough SFM", default_value: 400, unit: "sfm", category: "speed" },
      { var: "V63", name: "ID_FINISH_SFM", description: "ID finish SFM", default_value: 500, unit: "sfm", category: "speed" },
    ],
    formulas: [
      {
        name: "RPM_FROM_SFM",
        formula: "RPM = SFM * 3.82 / DIAMETER",
        purpose: "Standard RPM calculation",
        inputs: ["SFM", "DIAMETER"],
        output: "RPM",
        output_unit: "rpm",
      },
      {
        name: "UNDERCUT_GEOMETRY",
        formula: "UNDERCUT_END = CBORE_DIA - UNDERCUT_DIA_RED",
        purpose: "Calculate undercut end diameter",
        inputs: ["V4 (CBORE_DIA)", "V141 (REDUCTION)"],
        output: "UNDERCUT_END_DIA",
        output_unit: "inch",
      },
    ],
    tool_requirements: [
      { t_code: "T010101", description: "FACE/OD ROUGH", required: true },
      { t_code: "T020202", description: "FACE/OD FINISH", required: true },
      { t_code: "T030303", description: "SPOT DRILL", required: true },
      { t_code: "T050505", description: "DRILL 1 - PILOT", required: true },
      { t_code: "T060606", description: "DRILL 2 - THRU", required: false },
      { t_code: "T070707", description: "DRILL 3 - 180 DEG (OPTIONAL)", required: false },
      { t_code: "T080808", description: "ID ROUGH - COUNTER BORE", required: true },
      { t_code: "T090909", description: "ID FINISH - COUNTER BORE", required: true },
      { t_code: "T111111", description: "CUTOFF", required: true },
    ],
    operations: ["face_rough", "face_finish", "od_rough", "od_finish", "spot_drill", "pilot_drill", "thru_drill", "cbore_rough", "cbore_finish", "undercut", "cutoff"],
    g_codes_used: ["G00", "G01", "G02", "G03", "G18", "G40", "G42", "G43", "G50", "G80", "G90", "G95", "G96"],
    safety_checks: ["tool_length_validation", "diameter_range_check", "max_rpm_limit", "undercut_geometry_check"],
    okuma_specific: true,
    total_lines: 450,
  },
];

/** Common macro formulas for speed/feed calculations */
export const MACRO_FORMULAS = {
  RPM_FROM_SFM: {
    formula: "RPM = SFM × 3.82 / DIAMETER",
    constant: 3.82,
    unit_note: "SFM in surface feet/min, DIAMETER in inches",
  },
  RPM_FROM_SMM: {
    formula: "RPM = SMM × 318.31 / DIAMETER",
    constant: 318.31,
    unit_note: "SMM in surface meters/min, DIAMETER in mm",
  },
  DRILL_POINT_DEPTH: {
    formula: "POINT_DEPTH = DIAMETER / 2 / TAN(POINT_ANGLE / 2)",
    unit_note: "Calculates depth of drill point from full diameter",
  },
  CHAMFER_DIA_FROM_ANGLE: {
    formula: "MINOR_DIA = MAJOR_DIA - 2 × DEPTH × TAN(ANGLE)",
    unit_note: "Calculate chamfer minor diameter from depth and angle",
  },
};

/** Macro statistics */
export const MACRO_STATS = {
  total_macros: 2,
  total_variables: 60,
  total_formulas: 7,
  machine_types: ["lathe"],
  okuma_specific: 2,
  average_lines: 425,
  common_operations: [
    "face_rough", "face_finish", "od_rough", "od_finish",
    "spot_drill", "drill", "id_rough", "id_finish", "cutoff",
  ],
};

/**
 * Get macro variables by category.
 */
export function getMacroVariablesByCategory(
  macroId: string,
  category: MacroVariable["category"]
): MacroVariable[] {
  const macro = JM_DIE_MILLING_MACROS.find(m => m.id === macroId);
  if (!macro) return [];
  return macro.variables.filter(v => v.category === category);
}

/**
 * Calculate RPM from SFM using the standard formula.
 */
export function calculateRpmFromSfm(sfm: number, diameter_inch: number): number {
  return Math.round((sfm * 3.82) / diameter_inch);
}

/**
 * Calculate drill point depth from diameter and point angle.
 */
export function calculateDrillPointDepth(diameter: number, pointAngle: number): number {
  const halfAngle = (pointAngle / 2) * (Math.PI / 180);
  return diameter / 2 / Math.tan(halfAngle);
}
