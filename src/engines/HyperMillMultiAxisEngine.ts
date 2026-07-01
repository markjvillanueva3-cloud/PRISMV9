/**
 * HyperMillMultiAxisEngine — 5-Axis and Specialty Cycle Selector for hyperMILL
 *
 * Covers blade, impeller, tube, dental, and advanced 5-axis cavity/surface
 * strategies extracted from hyperMILL v33 installation data (feattech XML
 * catalogs, metric cfg defaults, and NcGenerator configurations).
 *
 * Source: H:/prism/HYPERMILL (v33.0 installation)
 */

// ============================================================================
// TYPES
// ============================================================================

export type MultiAxisGeometry =
  | "blade"
  | "impeller"
  | "blisk"
  | "tube"
  | "dental_crown"
  | "dental_bridge"
  | "dental_abutment"
  | "cavity_5x"
  | "surface_5x"
  | "freeform_5x";

export type MultiAxisGoal =
  | "roughing"
  | "finishing"
  | "semi_finishing"
  | "rest_machining"
  | "fillet_machining"
  | "edge_machining"
  | "probing";

export interface MultiAxisInput {
  geometry: MultiAxisGeometry;
  goal: MultiAxisGoal;
  materialGroup?: string; // ISO P/M/K/N/S/H
  toolDiameterMm?: number;
  bladeCount?: number;
  hasSplitterBlades?: boolean;
  hubShroudRatio?: number; // 0-1, smaller = deeper channel
  wallAngleDeg?: number;
  partToleranceMm?: number;
}

export interface MultiAxisRecommendation {
  strategyName: string;
  hyperMillCycle: string;
  cycleCode: string; // internal hyperMILL job type
  group: string;
  description: string;
  requiredSurfaces: string[];
  suggestedStepdown: number | null;
  suggestedStepover: number | null;
  cuttingMode: "climb" | "conventional" | "zigzag";
  warnings: string[];
  confidence: number;
  source: string;
}

// ============================================================================
// 5-AXIS STRATEGY DATABASE (from feattech XML catalogs + cfg defaults)
// ============================================================================

interface MultiAxisStrategy {
  name: string;
  cycle: string;
  code: string;
  group: string;
  description: string;
  requiredSurfaces: string[];
  stepdownFactor: number | null;
  stepoverFactor: number | null;
  cuttingMode: "climb" | "conventional" | "zigzag";
  applicableTo: { geometry: MultiAxisGeometry[]; goal: MultiAxisGoal[] };
  priority: number;
}

const MULTI_AXIS_STRATEGIES: MultiAxisStrategy[] = [
  // --- 5-Axis Blade Cycles (from omFeature2JobCatalog_Blade.xml) ---
  {
    name: "5X Blade Fillet Machining",
    cycle: "5X Blade Fillet Machining",
    code: "FBFX5",
    group: "5Axis-Blade-Cycles",
    description: "Machines fillet areas between blade and hub/shroud surfaces. Requires blade surfaces, hub/shroud surfaces and curves, leading/trailing edge curves.",
    requiredSurfaces: ["blade_surfaces", "hub_surface", "shroud_surface", "hub_curve", "shroud_curve", "leading_edge_curves", "trailing_edge_curves", "drive_surfaces"],
    stepdownFactor: null,
    stepoverFactor: 0.15,
    cuttingMode: "climb",
    applicableTo: { geometry: ["blade", "blisk"], goal: ["fillet_machining", "finishing"] },
    priority: 10,
  },
  {
    name: "5X Blade Platform Machining",
    cycle: "5X Blade Platform Machining",
    code: "FBPX5",
    group: "5Axis-Blade-Cycles",
    description: "Machines the platform area at the blade root. Uses same surface set as fillet machining with drive surface control.",
    requiredSurfaces: ["blade_surfaces", "hub_surface", "shroud_surface", "hub_curve", "shroud_curve", "leading_edge_curves", "trailing_edge_curves", "drive_surfaces"],
    stepdownFactor: null,
    stepoverFactor: 0.2,
    cuttingMode: "climb",
    applicableTo: { geometry: ["blade", "blisk"], goal: ["finishing", "semi_finishing"] },
    priority: 9,
  },
  {
    name: "5X Blade Swarf Cutting",
    cycle: "5X Blade Swarf Cutting",
    code: "FBWX5",
    group: "5Axis-Blade-Cycles",
    description: "Flank milling of blade surfaces using the full tool flute length. Optimal for ruled surfaces and near-ruled blade profiles.",
    requiredSurfaces: ["blade_surfaces", "hub_surface", "shroud_surface", "hub_curve", "shroud_curve", "leading_edge_curves", "trailing_edge_curves"],
    stepdownFactor: null,
    stepoverFactor: null,
    cuttingMode: "climb",
    applicableTo: { geometry: ["blade", "blisk"], goal: ["finishing"] },
    priority: 11,
  },
  {
    name: "5X Blade Top Cutting",
    cycle: "5X Blade Top Cutting",
    code: "FBTX5",
    group: "5Axis-Blade-Cycles",
    description: "Finishes the blade tip (top edge). Uses blade surfaces and hub/shroud curves for tool orientation.",
    requiredSurfaces: ["blade_surfaces", "hub_curve", "shroud_curve", "leading_edge_curves", "trailing_edge_curves", "drive_surfaces"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableTo: { geometry: ["blade", "blisk"], goal: ["finishing", "edge_machining"] },
    priority: 10,
  },
  {
    name: "5X Blade Tangent Cutting",
    cycle: "5X Blade Tangent Cutting",
    code: "FBGX5",
    group: "5Axis-Blade-Cycles",
    description: "Point-contact finishing of blade surfaces with tangent-plane tool orientation. High surface quality for complex blade profiles.",
    requiredSurfaces: ["blade_surfaces", "hub_curve", "shroud_curve", "leading_edge_curves", "trailing_edge_curves", "drive_surfaces"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableTo: { geometry: ["blade", "blisk"], goal: ["finishing"] },
    priority: 12,
  },

  // --- 5-Axis Impeller/Multiblade Cycles (from omFeature2JobCatalog_Impeller.xml) ---
  {
    name: "5X Impeller Roughing",
    cycle: "5X Impeller Roughing",
    code: "IrX5",
    group: "5X-Multiblade-Cycles",
    description: "Roughing between impeller blades with automatic channel detection. Handles splitter blades. Removes bulk material from hub-to-shroud.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "blade_curves", "edge_curves"],
    stepdownFactor: 0.8,
    stepoverFactor: 0.4,
    cuttingMode: "climb",
    applicableTo: { geometry: ["impeller", "blisk"], goal: ["roughing"] },
    priority: 12,
  },
  {
    name: "5X Impeller Hub Finishing",
    cycle: "5X Impeller Hub Finishing",
    code: "IfX5",
    group: "5X-Multiblade-Cycles",
    description: "Finishes the hub surface between blades with controlled tool axis orientation. Handles narrow channels and deep pockets.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "blade_curves", "edge_curves"],
    stepdownFactor: null,
    stepoverFactor: 0.15,
    cuttingMode: "climb",
    applicableTo: { geometry: ["impeller", "blisk"], goal: ["finishing"] },
    priority: 11,
  },
  {
    name: "5X Impeller Fillet Machining",
    cycle: "5X Impeller Fillet Machining",
    code: "ItX5",
    group: "5X-Multiblade-Cycles",
    description: "Machines fillet radii between blade roots and hub surface. Critical for stress distribution in rotating parts.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "blade_curves", "edge_curves"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableTo: { geometry: ["impeller", "blisk"], goal: ["fillet_machining", "finishing"] },
    priority: 10,
  },
  {
    name: "5X Impeller Point Milling",
    cycle: "5X Impeller Point Milling",
    code: "IpX5",
    group: "5X-Multiblade-Cycles",
    description: "Point-contact finishing of impeller blade surfaces. Ball-nose or barrel tool for high surface quality.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "blade_curves", "edge_curves"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableTo: { geometry: ["impeller", "blisk"], goal: ["finishing"] },
    priority: 10,
  },
  {
    name: "5X Impeller Flank Milling",
    cycle: "5X Impeller Flank Milling",
    code: "IkX5",
    group: "5X-Multiblade-Cycles",
    description: "Swarf cutting of impeller blades using full flute engagement. Best for ruled or near-ruled blade surfaces.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "edge_curves", "blade_curves"],
    stepdownFactor: null,
    stepoverFactor: null,
    cuttingMode: "climb",
    applicableTo: { geometry: ["impeller", "blisk"], goal: ["finishing"] },
    priority: 9,
  },
  {
    name: "5X Impeller Edge Machining",
    cycle: "5X Impeller Edge Machining",
    code: "IeX5",
    group: "5X-Multiblade-Cycles",
    description: "Finishes leading and trailing edges of impeller blades. Critical for aerodynamic performance.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "edge_curves", "blade_curves"],
    stepdownFactor: null,
    stepoverFactor: null,
    cuttingMode: "climb",
    applicableTo: { geometry: ["impeller", "blisk"], goal: ["edge_machining", "finishing"] },
    priority: 11,
  },
  {
    name: "5X Impeller Probing",
    cycle: "5X Impeller Probing",
    code: "IcX5",
    group: "5X-Multiblade-Cycles",
    description: "In-process measurement of impeller blade profiles. Verifies blade geometry against CAD model.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "blade_curves", "edge_curves"],
    stepdownFactor: null,
    stepoverFactor: null,
    cuttingMode: "climb",
    applicableTo: { geometry: ["impeller", "blisk"], goal: ["probing"] },
    priority: 10,
  },
  {
    name: "5X Impeller Point Roughing",
    cycle: "5X Impeller Point Roughing",
    code: "IdX5",
    group: "5X-Multiblade-Cycles",
    description: "Point-contact roughing for deep impeller channels where standard roughing cannot reach.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "blade_curves", "edge_curves"],
    stepdownFactor: 0.5,
    stepoverFactor: 0.3,
    cuttingMode: "climb",
    applicableTo: { geometry: ["impeller", "blisk"], goal: ["roughing", "rest_machining"] },
    priority: 8,
  },
  {
    name: "5X Impeller Tangent Roughing",
    cycle: "5X Impeller Tangent Roughing",
    code: "ItmX5",
    group: "5X-Multiblade-Cycles",
    description: "Barrel tool roughing in impeller channels. Higher MRR than point roughing with better surface quality.",
    requiredSurfaces: ["blade_surfaces", "splitter_surfaces", "hub_surface", "shroud_surface", "blade_curves", "edge_curves"],
    stepdownFactor: 0.6,
    stepoverFactor: 0.35,
    cuttingMode: "climb",
    applicableTo: { geometry: ["impeller", "blisk"], goal: ["roughing"] },
    priority: 9,
  },

  // --- 5-Axis Surface Cycles (from omFeature2JobCatalog_StrategyFeature.xml) ---
  {
    name: "5X Tangent Machining",
    cycle: "5X Tangent Machining",
    code: "RtX5",
    group: "5Axis-Surface-Cycles",
    description: "Surface-normal tool orientation following UV directions of surface patches. Supports path offset and machining side reversal.",
    requiredSurfaces: ["patch_surfaces"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableTo: { geometry: ["surface_5x", "freeform_5x"], goal: ["finishing"] },
    priority: 10,
  },

  // --- 5-Axis Cavity Cycles ---
  {
    name: "5X Cavity Roughing",
    cycle: "5X Shape Offset Roughing",
    code: "SfoRX5",
    group: "5Axis-Cavity-Cycles",
    description: "5-axis roughing with automatic tool axis tilting to avoid collisions in deep cavities.",
    requiredSurfaces: ["cavity_surfaces", "check_surfaces"],
    stepdownFactor: 0.8,
    stepoverFactor: 0.4,
    cuttingMode: "climb",
    applicableTo: { geometry: ["cavity_5x", "freeform_5x"], goal: ["roughing"] },
    priority: 10,
  },
  {
    name: "5X Cavity Finishing",
    cycle: "5X Shape Offset Finishing",
    code: "SfoFX5",
    group: "5Axis-Cavity-Cycles",
    description: "5-axis finishing with collision-free tool paths and smooth axis transitions.",
    requiredSurfaces: ["cavity_surfaces", "check_surfaces"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableTo: { geometry: ["cavity_5x", "freeform_5x"], goal: ["finishing"] },
    priority: 10,
  },

  // --- 5-Axis Tube Cycles ---
  {
    name: "5X Tube Roughing",
    cycle: "5X Tube Roughing",
    code: "TbRX5",
    group: "5Axis-Tube-Cycles",
    description: "Roughing inside tubular geometries with automatic tool orientation following tube centerline.",
    requiredSurfaces: ["tube_surfaces", "guide_curve"],
    stepdownFactor: 0.6,
    stepoverFactor: 0.4,
    cuttingMode: "climb",
    applicableTo: { geometry: ["tube"], goal: ["roughing"] },
    priority: 10,
  },
  {
    name: "5X Tube Finishing",
    cycle: "5X Tube Finishing",
    code: "TbFX5",
    group: "5Axis-Tube-Cycles",
    description: "Finishing of internal tube surfaces with smooth axis transitions and constant surface contact.",
    requiredSurfaces: ["tube_surfaces", "guide_curve"],
    stepdownFactor: null,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableTo: { geometry: ["tube"], goal: ["finishing"] },
    priority: 10,
  },

  // --- 5X Dental Cycles ---
  {
    name: "5X Dental Crown",
    cycle: "5X Dental Crown Machining",
    code: "DntCrX5",
    group: "5X-Dental",
    description: "Complete machining of dental crowns from blanks. Automated roughing-to-finishing sequence with holder collision avoidance.",
    requiredSurfaces: ["crown_surface", "margin_curve"],
    stepdownFactor: 0.3,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableTo: { geometry: ["dental_crown"], goal: ["roughing", "finishing"] },
    priority: 10,
  },
  {
    name: "5X Dental Bridge",
    cycle: "5X Dental Bridge Machining",
    code: "DntBrX5",
    group: "5X-Dental",
    description: "Multi-unit bridge machining with pontic and connector collision management.",
    requiredSurfaces: ["bridge_surface", "connector_curves"],
    stepdownFactor: 0.3,
    stepoverFactor: 0.1,
    cuttingMode: "climb",
    applicableTo: { geometry: ["dental_bridge"], goal: ["roughing", "finishing"] },
    priority: 10,
  },
  {
    name: "5X Dental Abutment",
    cycle: "5X Dental Abutment Machining",
    code: "DntAbX5",
    group: "5X-Dental",
    description: "Precision machining of implant abutments with tight tolerance control on connection geometry.",
    requiredSurfaces: ["abutment_surface", "connection_surface"],
    stepdownFactor: 0.2,
    stepoverFactor: 0.05,
    cuttingMode: "climb",
    applicableTo: { geometry: ["dental_abutment"], goal: ["finishing"] },
    priority: 10,
  },
];

// ============================================================================
// DEFAULT PARAMETER FORMULAS (from hyperMILL Metric.cfg files)
// ============================================================================

export interface HyperMillDefaults {
  approachLength: string; // formula expression
  retractLength: string;
  approachClearanceSide: string;
  approachClearanceAxial: string;
  maxLiftClearance: string;
  holderClearance: number; // mm
  extensionClearance: number;
  shankClearance: number;
  headClearance: number;
  safetyPlane: number; // mm
  clearanceAxial: number;
  clearanceSide: number;
  surfaceResolution: string; // formula
  boundaryResolution: string;
}

/** Default CAM parameters from hyperMILL metric cfg (hmSlf3.cfg, etc.) */
export const HYPERMILL_DEFAULTS: HyperMillDefaults = {
  approachLength: "T:Dia * 0.35",
  retractLength: "T:Dia * 0.35",
  approachClearanceSide: "T:Rad * 0.25",
  approachClearanceAxial: "T:Rad * 0.1",
  maxLiftClearance: "T:Rad * 0.5",
  holderClearance: 0.25,
  extensionClearance: 0.25,
  shankClearance: 0.05,
  headClearance: 1.5,
  safetyPlane: 100,
  clearanceAxial: 5,
  clearanceSide: 5,
  surfaceResolution: "mtol * 0.9",
  boundaryResolution: "mtol * 0.5",
};

/** Turning roughing defaults from hmTrnr.cfg */
export const HYPERMILL_TURNING_DEFAULTS = {
  cuttingSpeed: 200,        // m/min
  maxSpindleSpeed: 10000,   // RPM
  feedRate: 0.3,            // mm/rev (roughing)
  finishFeedRate: 0.1,      // mm/rev
  clearanceDistance: 5,     // mm
  retractHeightIn: 10,      // mm
  retractHeightOut: 100,    // mm
  safetyPlane: 15,          // mm
  retractPlan: 20,          // mm
  rampAngle: 10,            // degrees
  allowance: 0,             // mm
  infeedLength: 1,          // mm
  addStep: 0.25,            // mm
  addStepMin: 0.5,          // mm
  addStepMax: 5,            // mm
  approachAngle: 45,        // degrees
  retractAngle: 45,         // degrees
  rapidAngle: 20,           // degrees
  chamferLength: 0.5,       // mm
  roundingRadius: 0.5,      // mm
  chipBreakDist: 10,        // mm
  holderClearance: 0.25,    // mm
  cutTolerance: 0.05,       // mm
  filletRadiusFormula: "T:CornerRad * 0.1",
};

/** Impeller roughing defaults from hmIrX5.cfg */
export const HYPERMILL_IMPELLER_DEFAULTS = {
  bladeCount: 6,
  surfaceResolution: "mtol * 0.7",
  hubAllowance: 0.5,         // mm
  horizontalAllowance: 0.3,  // mm
  horizontalInfeed: 1.5,     // mm
  verticalInfeed: 1.5,       // mm
  filletTolerance: 0.5,      // mm
  openSpindle: 2000,         // RPM
  openFeed: 200,             // mm/min
  linkFeed: 200,             // mm/min
  safetyPlane: 100,          // mm
  rapidHeight: 5,            // mm
  leadAngle: 5,              // degrees
  leadUpAngle: 5,            // degrees
  extensionLead: 1,          // mm
  extensionTrail: 1,         // mm
  holderClearance: 0.25,     // mm
  shankClearance: 0.25,      // mm
  extensionClearance: 0.25,  // mm
  headClearance: 1.5,        // mm
  precision: 0.05,           // degrees
  checkTolerance: 0.1,       // mm
  maxDistAngle: 91,          // degrees
};

/** Blade roughing defaults from hmBrX5.cfg */
export const HYPERMILL_BLADE_DEFAULTS = {
  surfaceResolution: "mtol",
  profileResolution: "mtol",
  allowance: 0.5,            // mm
  horizontalInfeed: 5,       // mm
  verticalInfeed: 1,         // mm
  tiltAngle: 10,             // degrees
  tiltMinAngle: 2,           // degrees
  fanDistance: 20,            // mm
  rapidHeight: 5,            // mm
  safetyPlane: 100,          // mm
  approachMacro: "circular", // 2 = circular
  retractMacro: "circular",
  macroRadius: 3,            // mm
  boundaryResolution: "mtol * 10",
  precision: 0.05,           // degrees
  maxStepDistance: 1,         // mm
  maxSafeDistance: 10,        // mm
  maxAngleIncrement: 0.5,    // degrees
  maxDistAngle: 91,          // degrees
};

/** 5X drilling defaults from hmDdaX5.cfg */
export const HYPERMILL_5X_DRILLING_DEFAULTS = {
  holeDepth: 3,              // mm (default)
  holeDiameter: 5,           // mm (default)
  guideSleeveLength: 5.2,    // mm
  leadInDepth: 5,            // mm
  infeedSpindleSpeed: 600,   // RPM
  clearFeedrate: 50000,      // mm/min
  holeClearDist: 5,          // mm
  holeRetractDist: 5,        // mm
  clearanceSideFormula: "10 * T:Dia",
  clearanceRelative: 20,     // mm
  checkTolerance: 0.1,       // mm
  // Feedrate factors (% of nominal)
  leadInSpeedFactor: 30,
  leadInFeedFactor: 15,
  fchStartSpeedFactor: 100,
  fchStartFeedFactor: 30,
  fchSpeedFactor: 100,
  fchFeedFactor: 500,
  fchEndSpeedFactor: 100,
  fchEndFeedFactor: 30,
  chSpeedFactor: 100,
  chFeedFactor: 50,
  retractSpeedFactor: 100,
  retractFeedFactor: 500,
  infeedSpeedFactor: 30,
  infeedFeedFactor: 800,
};

// ============================================================================
// ENGINE
// ============================================================================

export class HyperMillMultiAxisEngine {
  private calcCount = 0;

  /**
   * Recommend the best 5-axis strategy for given geometry and goal.
   */
  calculate(input: MultiAxisInput): MultiAxisRecommendation {
    this.calcCount++;
    const warnings: string[] = [];

    // Filter matching strategies
    let candidates = MULTI_AXIS_STRATEGIES.filter(
      (s) =>
        s.applicableTo.geometry.includes(input.geometry) &&
        s.applicableTo.goal.includes(input.goal),
    );

    if (candidates.length === 0) {
      // Fallback: match by goal only
      candidates = MULTI_AXIS_STRATEGIES.filter((s) =>
        s.applicableTo.goal.includes(input.goal),
      );
      warnings.push(`No exact match for geometry '${input.geometry}' — showing closest goal match`);
    }

    candidates.sort((a, b) => b.priority - a.priority);

    // Impeller-specific: prefer tangent roughing for barrel tools
    if (input.geometry === "impeller" && input.goal === "roughing" && input.toolDiameterMm && input.toolDiameterMm >= 8) {
      const tangent = candidates.find((c) => c.code === "ItmX5");
      if (tangent) {
        candidates = [tangent, ...candidates.filter((c) => c !== tangent)];
        warnings.push("Tool diameter >= 8mm — barrel/tangent roughing preferred for higher MRR");
      }
    }

    // Blade: prefer swarf cutting for ruled surfaces
    if (input.geometry === "blade" && input.goal === "finishing") {
      const swarf = candidates.find((c) => c.code === "FBWX5");
      if (swarf && input.wallAngleDeg !== undefined && input.wallAngleDeg > 30 && input.wallAngleDeg < 80) {
        candidates = [swarf, ...candidates.filter((c) => c !== swarf)];
        warnings.push("Wall angle 30-80° on blade — swarf cutting preferred for ruled surfaces");
      }
    }

    // Deep impeller channels warning
    if (input.geometry === "impeller" && input.hubShroudRatio !== undefined && input.hubShroudRatio < 0.3) {
      warnings.push("Deep impeller channel (hub/shroud ratio < 0.3) — check tool reach and collision");
    }

    // Material warnings
    if (input.materialGroup === "S") {
      warnings.push("Superalloy (ISO S): reduce feeds 40%, use climb milling, ensure flood coolant");
    }
    if (input.materialGroup === "H") {
      warnings.push("Hardened steel (ISO H): use ceramic or CBN, high speed low feed");
    }

    // Splitter blade handling
    if (input.hasSplitterBlades && input.geometry === "impeller") {
      warnings.push("Splitter blades detected — ensure splitter surfaces are defined in the job");
    }

    const best = candidates[0];
    if (!best) {
      return {
        strategyName: "Manual Selection Required",
        hyperMillCycle: "N/A",
        cycleCode: "N/A",
        group: "N/A",
        description: "No matching 5-axis strategy found.",
        requiredSurfaces: [],
        suggestedStepdown: null,
        suggestedStepover: null,
        cuttingMode: "climb",
        warnings: ["No matching hyperMILL 5-axis cycle — review inputs"],
        confidence: 0,
        source: "hypermill-v33-installation",
      };
    }

    return {
      strategyName: best.name,
      hyperMillCycle: best.cycle,
      cycleCode: best.code,
      group: best.group,
      description: best.description,
      requiredSurfaces: best.requiredSurfaces,
      suggestedStepdown: best.stepdownFactor,
      suggestedStepover: best.stepoverFactor,
      cuttingMode: best.cuttingMode,
      warnings,
      confidence: warnings.length === 0 ? 0.9 : 0.75,
      source: "hypermill-v33-installation",
    };
  }

  /** List all 5-axis strategies. */
  listStrategies(): Array<{ name: string; code: string; group: string; geometry: MultiAxisGeometry[]; goal: MultiAxisGoal[] }> {
    return MULTI_AXIS_STRATEGIES.map((s) => ({
      name: s.name,
      code: s.code,
      group: s.group,
      geometry: s.applicableTo.geometry,
      goal: s.applicableTo.goal,
    }));
  }

  /** Get default parameters for hyperMILL operations. */
  getDefaults(domain: string): HyperMillDefaults | typeof HYPERMILL_TURNING_DEFAULTS | typeof HYPERMILL_IMPELLER_DEFAULTS | typeof HYPERMILL_BLADE_DEFAULTS | typeof HYPERMILL_5X_DRILLING_DEFAULTS {
    switch (domain) {
      case "turning": return HYPERMILL_TURNING_DEFAULTS;
      case "impeller": return HYPERMILL_IMPELLER_DEFAULTS;
      case "blade": return HYPERMILL_BLADE_DEFAULTS;
      case "drilling_5x": return HYPERMILL_5X_DRILLING_DEFAULTS;
      default: return HYPERMILL_DEFAULTS;
    }
  }

  /** Get strategy count and usage stats. */
  stats(): { calculations: number; totalStrategies: number } {
    return { calculations: this.calcCount, totalStrategies: MULTI_AXIS_STRATEGIES.length };
  }
}

export const hyperMillMultiAxisEngine = new HyperMillMultiAxisEngine();
