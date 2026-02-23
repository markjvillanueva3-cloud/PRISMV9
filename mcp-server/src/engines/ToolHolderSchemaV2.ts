/**
 * PRISM MCP Server - Tool Holder Schema V2 (R14-MS6)
 *
 * Comprehensive holder modeling for:
 *   - Collision envelope generation (feeds CollisionEngine)
 *   - Rigidity/stiffness computation (feeds ConstraintEngine chatter model)
 *   - Assembly stickout calculation (feeds QuotingEngine cost model)
 *   - Balance grade validation (feeds ProcessPlanningEngine safety)
 *
 * Supports 8 taper families × 5 clamping types × standard balance grades.
 *
 * Actions:
 *   holder_lookup       - Look up holder by ID or specs
 *   holder_assembly     - Compute tool+holder assembly dimensions
 *   holder_select       - Select optimal holder for tool + machine
 *   holder_validate     - Validate holder compatibility
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// SCHEMA V2 TYPES
// ============================================================================

/** Taper interface families (ISO standard spindle interfaces). */
export type TaperFamily = "BT" | "CAT" | "HSK-A" | "HSK-C" | "HSK-E" | "HSK-F" | "Capto" | "KM" | "Big-Plus" | "SK";

/** Clamping mechanism types. */
export type ClampingType = "ER_collet" | "hydraulic" | "shrink_fit" | "milling_chuck" | "side_lock" | "Weldon" | "press_fit" | "heat_shrink";

/** ISO 1940 balance grade. */
export type BalanceGrade = "G0.4" | "G1" | "G2.5" | "G6.3" | "G16" | "G40";

/** V2 holder interface — comprehensive replacement for V1. */
export interface ToolHolderV2 {
  // Identity
  id: string;
  name: string;
  manufacturer?: string;
  catalog_number?: string;

  // Spindle interface
  taper: {
    family: TaperFamily;
    size: number;             // e.g., 40, 50, 63
    full_designation: string; // e.g., "BT40", "HSK-A63", "Capto C6"
    taper_angle?: number;     // degrees (7:24 for BT/CAT, 1:10 for HSK, etc.)
    retention: "drawbar" | "face_contact" | "dual_contact"; // clamping style
  };

  // Clamping
  clamping: {
    type: ClampingType;
    bore_range: { min: number; max: number };  // mm shank diameter range
    collet_type?: string;    // e.g., "ER32", "ER40", "ER16"
    clamping_force: number;  // N
    runout_TIR: number;      // µm total indicator runout at 3×D
    repeatability: number;   // µm
  };

  // Geometry (envelope)
  geometry: {
    gauge_length: number;     // mm from spindle face to tool tip reference
    flange_diameter: number;  // mm (widest point at spindle nose)
    body_diameter: number;    // mm (main body OD)
    body_length: number;      // mm (body below flange)
    nose_diameter: number;    // mm (at collet/bore end)
    nose_length: number;      // mm
    overall_length: number;   // mm total
    weight: number;           // kg
  };

  // Dynamic properties
  dynamics: {
    max_rpm: number;
    balance_grade: BalanceGrade;
    balance_rpm: number;      // RPM at which balance is specified
    unbalance_gmm: number;   // residual unbalance g·mm
    stiffness_N_per_um: number;  // radial stiffness at tool tip
    damping_ratio: number;    // ζ (critical damping ratio)
    first_mode_Hz?: number;   // first bending mode frequency
  };

  // Material
  material: string;           // "steel", "aluminum", "heavy_metal"
  hardness_HRC?: number;
  surface_treatment?: string; // "black_oxide", "nickel", "DLC"

  // Cost
  price?: number;             // USD
  availability?: "in_stock" | "order" | "special";

  // Backward compatibility (V1 fields)
  interface: string;
  gauge_length_v1: number;
  overhang: number;
  balance_grade_str: string;
  max_rpm_v1: number;
  pullout_force: number;
}

// ============================================================================
// HOLDER LIBRARY (reference catalog)
// ============================================================================

/** Standard holder dimensions by taper family + size. */
const TAPER_SPECS: Record<string, {
  flangeDia: number; taperAngle: number; retention: "drawbar" | "face_contact" | "dual_contact";
  pullout: number; maxRpm: number;
}> = {
  "BT30":     { flangeDia: 46,  taperAngle: 16.26, retention: "drawbar",     pullout: 5000,  maxRpm: 20000 },
  "BT40":     { flangeDia: 63,  taperAngle: 16.26, retention: "drawbar",     pullout: 12000, maxRpm: 15000 },
  "BT50":     { flangeDia: 88,  taperAngle: 16.26, retention: "drawbar",     pullout: 25000, maxRpm: 8000  },
  "CAT40":    { flangeDia: 63,  taperAngle: 16.26, retention: "drawbar",     pullout: 12000, maxRpm: 15000 },
  "CAT50":    { flangeDia: 88,  taperAngle: 16.26, retention: "drawbar",     pullout: 25000, maxRpm: 8000  },
  "HSK-A40":  { flangeDia: 48,  taperAngle: 5.71,  retention: "face_contact", pullout: 15000, maxRpm: 30000 },
  "HSK-A63":  { flangeDia: 75,  taperAngle: 5.71,  retention: "face_contact", pullout: 40000, maxRpm: 24000 },
  "HSK-A100": { flangeDia: 120, taperAngle: 5.71,  retention: "face_contact", pullout: 80000, maxRpm: 15000 },
  "HSK-E40":  { flangeDia: 48,  taperAngle: 5.71,  retention: "face_contact", pullout: 10000, maxRpm: 40000 },
  "HSK-E50":  { flangeDia: 60,  taperAngle: 5.71,  retention: "face_contact", pullout: 15000, maxRpm: 35000 },
  "HSK-F63":  { flangeDia: 75,  taperAngle: 5.71,  retention: "face_contact", pullout: 35000, maxRpm: 30000 },
  "Capto-C4": { flangeDia: 49,  taperAngle: 4.0,   retention: "face_contact", pullout: 20000, maxRpm: 25000 },
  "Capto-C6": { flangeDia: 80,  taperAngle: 4.0,   retention: "face_contact", pullout: 55000, maxRpm: 18000 },
  "Capto-C8": { flangeDia: 120, taperAngle: 4.0,   retention: "face_contact", pullout: 110000, maxRpm: 12000 },
  "Big-Plus-BT40": { flangeDia: 63, taperAngle: 16.26, retention: "dual_contact", pullout: 18000, maxRpm: 20000 },
  "Big-Plus-BT50": { flangeDia: 88, taperAngle: 16.26, retention: "dual_contact", pullout: 35000, maxRpm: 12000 },
};

/** Clamping type properties. */
const CLAMPING_SPECS: Record<ClampingType, {
  runout: number; repeatability: number; stiffnessMult: number; costMult: number; rpmMult: number;
}> = {
  ER_collet:      { runout: 10,  repeatability: 5,   stiffnessMult: 1.0,  costMult: 1.0, rpmMult: 1.0 },
  hydraulic:      { runout: 3,   repeatability: 1,   stiffnessMult: 1.4,  costMult: 3.0, rpmMult: 1.1 },
  shrink_fit:     { runout: 3,   repeatability: 1,   stiffnessMult: 1.6,  costMult: 2.5, rpmMult: 1.2 },
  milling_chuck:  { runout: 5,   repeatability: 3,   stiffnessMult: 1.3,  costMult: 2.0, rpmMult: 1.0 },
  side_lock:      { runout: 15,  repeatability: 10,  stiffnessMult: 0.8,  costMult: 0.8, rpmMult: 0.8 },
  Weldon:         { runout: 15,  repeatability: 10,  stiffnessMult: 0.9,  costMult: 0.7, rpmMult: 0.9 },
  press_fit:      { runout: 5,   repeatability: 2,   stiffnessMult: 1.5,  costMult: 2.0, rpmMult: 1.1 },
  heat_shrink:    { runout: 2,   repeatability: 1,   stiffnessMult: 1.7,  costMult: 3.5, rpmMult: 1.3 },
};

/** ER collet bore ranges. */
const ER_COLLET_RANGES: Record<string, { min: number; max: number }> = {
  ER8:  { min: 1, max: 5 },
  ER11: { min: 1, max: 7 },
  ER16: { min: 1, max: 10 },
  ER20: { min: 1, max: 13 },
  ER25: { min: 1, max: 16 },
  ER32: { min: 2, max: 20 },
  ER40: { min: 3, max: 26 },
  ER50: { min: 6, max: 34 },
};

/** Balance grade max unbalance per kg at given RPM (ISO 1940). */
const BALANCE_UNBALANCE: Record<BalanceGrade, number> = {
  "G0.4": 0.4,
  "G1": 1.0,
  "G2.5": 2.5,
  "G6.3": 6.3,
  "G16": 16.0,
  "G40": 40.0,
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/** Build a ToolHolderV2 from parameters. */
function buildHolder(params: {
  taper: string;
  clamping: ClampingType;
  collet?: string;
  shank_diameter?: number;
  gauge_length?: number;
  balance?: BalanceGrade;
  manufacturer?: string;
  catalog_number?: string;
}): ToolHolderV2 {
  const taperKey = params.taper.replace(/[\s-]+/g, "-").replace(/HSK(\w)/, "HSK-$1");
  const taperSpec = TAPER_SPECS[taperKey] || TAPER_SPECS["BT40"];
  const clampSpec = CLAMPING_SPECS[params.clamping] || CLAMPING_SPECS["ER_collet"];

  // Parse taper family and size
  const familyMatch = taperKey.match(/(BT|CAT|HSK-[ACEF]|Capto|Big-Plus|SK|KM)[-_]?(\w+)?/i);
  const family = (familyMatch?.[1] || "BT") as TaperFamily;
  const size = parseInt(familyMatch?.[2] || "40") || 40;

  // Collet bore range
  const colletType = params.collet || (params.clamping === "ER_collet" ? `ER${Math.max(16, Math.ceil((params.shank_diameter || 12) * 1.5 / 4) * 4)}` : undefined);
  const colletRange = colletType ? (ER_COLLET_RANGES[colletType] || { min: 1, max: 20 }) : { min: params.shank_diameter || 6, max: params.shank_diameter || 20 };

  // Geometry estimation
  const gaugeLength = params.gauge_length || (family.startsWith("HSK") ? 60 : 75);
  const bodyDia = taperSpec.flangeDia * 0.8;
  const bodyLen = gaugeLength * 0.6;
  const noseDia = bodyDia * 0.5;
  const noseLen = gaugeLength * 0.3;
  const overallLen = gaugeLength + 20; // spindle engagement portion

  // Dynamics
  const balanceGrade = params.balance || "G2.5";
  const balanceRpm = taperSpec.maxRpm;
  const weight = (taperSpec.flangeDia / 63) * 0.8; // kg estimate
  const unbalance = BALANCE_UNBALANCE[balanceGrade] * weight * 1000 / (2 * Math.PI * balanceRpm / 60);

  // Stiffness: base ~15 N/µm for BT40, scale with flange diameter
  const baseStiffness = (taperSpec.flangeDia / 63) * 15 * clampSpec.stiffnessMult;
  const maxRpm = Math.round(taperSpec.maxRpm * clampSpec.rpmMult);

  const id = `${taperKey}_${params.clamping}${colletType ? `_${colletType}` : ""}`.toLowerCase().replace(/[^a-z0-9_-]/g, "_");

  return {
    id,
    name: `${taperKey} ${params.clamping.replace(/_/g, " ")}${colletType ? ` ${colletType}` : ""}`,
    manufacturer: params.manufacturer,
    catalog_number: params.catalog_number,

    taper: {
      family,
      size,
      full_designation: taperKey,
      taper_angle: taperSpec.taperAngle,
      retention: taperSpec.retention,
    },

    clamping: {
      type: params.clamping,
      bore_range: colletRange,
      collet_type: colletType,
      clamping_force: taperSpec.pullout * 0.3,
      runout_TIR: clampSpec.runout,
      repeatability: clampSpec.repeatability,
    },

    geometry: {
      gauge_length: gaugeLength,
      flange_diameter: taperSpec.flangeDia,
      body_diameter: Math.round(bodyDia * 10) / 10,
      body_length: Math.round(bodyLen * 10) / 10,
      nose_diameter: Math.round(noseDia * 10) / 10,
      nose_length: Math.round(noseLen * 10) / 10,
      overall_length: Math.round(overallLen * 10) / 10,
      weight: Math.round(weight * 100) / 100,
    },

    dynamics: {
      max_rpm: maxRpm,
      balance_grade: balanceGrade,
      balance_rpm: balanceRpm,
      unbalance_gmm: Math.round(unbalance * 100) / 100,
      stiffness_N_per_um: Math.round(baseStiffness * 10) / 10,
      damping_ratio: 0.03 * clampSpec.stiffnessMult,
      first_mode_Hz: Math.round(maxRpm / 60 * 1.5),
    },

    material: "steel",
    price: Math.round(taperSpec.flangeDia * 2 * clampSpec.costMult * 100) / 100,

    // V1 backward compatibility
    interface: taperKey,
    gauge_length_v1: gaugeLength,
    overhang: noseLen,
    balance_grade_str: `${balanceGrade} @ ${balanceRpm} RPM`,
    max_rpm_v1: maxRpm,
    pullout_force: taperSpec.pullout,
  };
}

/** Compute full tool+holder assembly. */
function assemblyCalc(holder: ToolHolderV2, tool: {
  diameter: number;
  overall_length: number;
  flute_length: number;
  shank_diameter: number;
}): {
  total_stickout: number;
  tool_projection: number;
  effective_length: number;
  deflection_factor: number;
  collision_envelope: Array<{ z: number; diameter: number }>;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check shank fits the holder bore
  if (tool.shank_diameter < holder.clamping.bore_range.min) {
    warnings.push(`Shank ${tool.shank_diameter}mm below holder min bore ${holder.clamping.bore_range.min}mm`);
  }
  if (tool.shank_diameter > holder.clamping.bore_range.max) {
    warnings.push(`Shank ${tool.shank_diameter}mm exceeds holder max bore ${holder.clamping.bore_range.max}mm`);
  }

  // Tool projection: tool OAL minus insertion depth (typically 2/3 of body length)
  const insertionDepth = Math.min(holder.geometry.nose_length * 0.8, tool.overall_length * 0.3);
  const toolProjection = tool.overall_length - insertionDepth;
  const totalStickout = holder.geometry.gauge_length + toolProjection;
  const effectiveLength = totalStickout; // from spindle face to tool tip

  // L/D deflection factor: (L/D)^3 — critical for chatter
  const ld = effectiveLength / tool.diameter;
  const deflectionFactor = Math.round((ld * ld * ld) * 100) / 100;

  if (ld > 6) warnings.push(`High L/D ratio ${ld.toFixed(1)}:1 — chatter risk, consider shorter holder or larger tool`);
  if (ld > 8) warnings.push(`CRITICAL: L/D ${ld.toFixed(1)}:1 exceeds safe limit — reduce stickout or use vibration-damped holder`);

  // Collision envelope: simplified stepped profile from spindle face to tool tip
  const envelope: Array<{ z: number; diameter: number }> = [
    { z: 0, diameter: holder.geometry.flange_diameter },
    { z: 10, diameter: holder.geometry.flange_diameter },
    { z: 10, diameter: holder.geometry.body_diameter },
    { z: 10 + holder.geometry.body_length, diameter: holder.geometry.body_diameter },
    { z: 10 + holder.geometry.body_length, diameter: holder.geometry.nose_diameter },
    { z: holder.geometry.gauge_length, diameter: holder.geometry.nose_diameter },
    { z: holder.geometry.gauge_length, diameter: tool.diameter },
    { z: totalStickout - tool.flute_length, diameter: tool.diameter },
    { z: totalStickout, diameter: tool.diameter * 0.3 }, // tip taper
  ];

  return {
    total_stickout: Math.round(totalStickout * 10) / 10,
    tool_projection: Math.round(toolProjection * 10) / 10,
    effective_length: Math.round(effectiveLength * 10) / 10,
    deflection_factor: deflectionFactor,
    collision_envelope: envelope,
    warnings,
  };
}

/** Select optimal holder for tool + machine constraints. */
function selectHolder(params: {
  tool_diameter: number;
  tool_shank: number;
  spindle_interface: string;
  operation: string;
  required_rpm?: number;
  surface_finish_critical?: boolean;
}): {
  recommended: ToolHolderV2;
  alternatives: Array<{ holder: ToolHolderV2; reason: string }>;
  selection_rationale: string[];
} {
  const rationale: string[] = [];
  const alternatives: Array<{ holder: ToolHolderV2; reason: string }> = [];

  // Determine clamping type based on operation requirements
  let clampingType: ClampingType;
  if (params.surface_finish_critical) {
    clampingType = "shrink_fit";
    rationale.push("Surface finish critical → shrink-fit for minimum runout (3µm TIR)");
  } else if (params.required_rpm && params.required_rpm > 20000) {
    clampingType = "hydraulic";
    rationale.push("High RPM → hydraulic chuck for balance + low runout");
  } else if (params.operation === "rough" || params.operation === "heavy_rough") {
    clampingType = "milling_chuck";
    rationale.push("Heavy roughing → milling chuck for clamping force + vibration damping");
  } else {
    clampingType = "ER_collet";
    rationale.push("General purpose → ER collet for flexibility and cost");
  }

  // Select ER collet size
  let collet: string | undefined;
  if (clampingType === "ER_collet") {
    for (const [name, range] of Object.entries(ER_COLLET_RANGES)) {
      if (params.tool_shank >= range.min && params.tool_shank <= range.max) {
        collet = name;
        break;
      }
    }
    rationale.push(`ER collet: ${collet || "ER32"} for ${params.tool_shank}mm shank`);
  }

  // Build recommended holder
  const recommended = buildHolder({
    taper: params.spindle_interface,
    clamping: clampingType,
    collet,
    shank_diameter: params.tool_shank,
  });

  // Generate alternatives
  if (clampingType !== "ER_collet") {
    alternatives.push({
      holder: buildHolder({ taper: params.spindle_interface, clamping: "ER_collet", collet, shank_diameter: params.tool_shank }),
      reason: "Lower cost alternative (higher runout)",
    });
  }
  if (clampingType !== "shrink_fit") {
    alternatives.push({
      holder: buildHolder({ taper: params.spindle_interface, clamping: "shrink_fit", shank_diameter: params.tool_shank }),
      reason: "Minimum runout alternative (requires heating equipment)",
    });
  }
  if (clampingType !== "hydraulic") {
    alternatives.push({
      holder: buildHolder({ taper: params.spindle_interface, clamping: "hydraulic", shank_diameter: params.tool_shank }),
      reason: "Good balance of runout + damping (higher cost)",
    });
  }

  return { recommended, alternatives: alternatives.slice(0, 3), selection_rationale: rationale };
}

/** Validate holder compatibility with machine + tool. */
function validateHolder(holder: ToolHolderV2, constraints: {
  machine_spindle?: string;
  machine_max_rpm?: number;
  tool_shank?: number;
  required_balance?: BalanceGrade;
  max_runout?: number;
}): {
  compatible: boolean;
  issues: Array<{ field: string; severity: "critical" | "warning" | "info"; message: string }>;
} {
  const issues: Array<{ field: string; severity: "critical" | "warning" | "info"; message: string }> = [];

  // Spindle interface match
  if (constraints.machine_spindle) {
    const holderTaper = holder.taper.full_designation.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const machineTaper = constraints.machine_spindle.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!holderTaper.includes(machineTaper) && !machineTaper.includes(holderTaper)) {
      issues.push({ field: "taper", severity: "critical", message: `Holder taper ${holder.taper.full_designation} incompatible with machine spindle ${constraints.machine_spindle}` });
    }
  }

  // RPM check
  if (constraints.machine_max_rpm && holder.dynamics.max_rpm < constraints.machine_max_rpm * 0.8) {
    issues.push({ field: "rpm", severity: "warning", message: `Holder max RPM ${holder.dynamics.max_rpm} may limit machine capability (${constraints.machine_max_rpm} RPM)` });
  }

  // Shank fit
  if (constraints.tool_shank) {
    if (constraints.tool_shank < holder.clamping.bore_range.min) {
      issues.push({ field: "bore", severity: "critical", message: `Tool shank ${constraints.tool_shank}mm too small for holder bore (min ${holder.clamping.bore_range.min}mm)` });
    }
    if (constraints.tool_shank > holder.clamping.bore_range.max) {
      issues.push({ field: "bore", severity: "critical", message: `Tool shank ${constraints.tool_shank}mm too large for holder bore (max ${holder.clamping.bore_range.max}mm)` });
    }
  }

  // Balance grade
  if (constraints.required_balance) {
    const reqGrade = BALANCE_UNBALANCE[constraints.required_balance] || 2.5;
    const holderGrade = BALANCE_UNBALANCE[holder.dynamics.balance_grade] || 6.3;
    if (holderGrade > reqGrade) {
      issues.push({ field: "balance", severity: "warning", message: `Holder balance ${holder.dynamics.balance_grade} coarser than required ${constraints.required_balance}` });
    }
  }

  // Runout
  if (constraints.max_runout && holder.clamping.runout_TIR > constraints.max_runout) {
    issues.push({ field: "runout", severity: "warning", message: `Holder runout ${holder.clamping.runout_TIR}µm exceeds requirement ${constraints.max_runout}µm` });
  }

  const hasCritical = issues.some((i) => i.severity === "critical");
  return { compatible: !hasCritical, issues };
}

// ============================================================================
// ACTION DISPATCHER
// ============================================================================

export function executeHolderAction(action: string, params: Record<string, any>): any {
  switch (action) {
    case "holder_lookup": {
      const taper = params.taper || params.spindle_interface || "BT40";
      const clamping = (params.clamping || params.clamping_type || "ER_collet") as ClampingType;
      return buildHolder({
        taper,
        clamping,
        collet: params.collet,
        shank_diameter: params.shank_diameter,
        gauge_length: params.gauge_length,
        balance: params.balance,
        manufacturer: params.manufacturer,
        catalog_number: params.catalog_number,
      });
    }

    case "holder_assembly": {
      const holder = typeof params.holder === "object" && params.holder.taper
        ? params.holder as ToolHolderV2
        : buildHolder({
            taper: params.taper || params.spindle_interface || "BT40",
            clamping: params.clamping || "ER_collet",
            collet: params.collet,
            shank_diameter: params.tool_shank || params.shank_diameter,
          });
      const tool = {
        diameter: params.tool_diameter || 12,
        overall_length: params.tool_oal || 75,
        flute_length: params.tool_flute_length || 36,
        shank_diameter: params.tool_shank || params.shank_diameter || params.tool_diameter || 12,
      };
      return { holder: { id: holder.id, name: holder.name }, assembly: assemblyCalc(holder, tool) };
    }

    case "holder_select": {
      return selectHolder({
        tool_diameter: params.tool_diameter || 12,
        tool_shank: params.tool_shank || params.tool_diameter || 12,
        spindle_interface: params.spindle_interface || params.taper || "BT40",
        operation: params.operation || "general",
        required_rpm: params.required_rpm,
        surface_finish_critical: params.surface_finish_critical,
      });
    }

    case "holder_validate": {
      const holder = typeof params.holder === "object" && params.holder.taper
        ? params.holder as ToolHolderV2
        : buildHolder({
            taper: params.taper || "BT40",
            clamping: params.clamping || "ER_collet",
            shank_diameter: params.tool_shank,
          });
      return validateHolder(holder, {
        machine_spindle: params.machine_spindle,
        machine_max_rpm: params.machine_max_rpm,
        tool_shank: params.tool_shank,
        required_balance: params.required_balance,
        max_runout: params.max_runout,
      });
    }

    default:
      return { error: `Unknown holder action: ${action}` };
  }
}
