/**
 * MCP Elicitation Schemas for PRISM
 *
 * Defines structured input schemas for the 8 most common ambiguous inputs
 * in CNC/manufacturing workflows. When a dispatcher action is invoked with
 * incomplete parameters, the server can request structured data from the
 * user via the MCP elicitation protocol (form mode).
 *
 * Each schema follows JSON Schema draft-07 with:
 * - title + description at object and property level
 * - enum constraints for categorical fields
 * - min/max for numeric fields
 * - sensible defaults where applicable
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/server/elicitation
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// Types
// ============================================================================

/** JSON Schema object (subset used by MCP elicitation requestedSchema) */
export interface ElicitationJsonSchema {
  type: "object";
  title: string;
  description: string;
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface JsonSchemaProperty {
  type: string;
  title: string;
  description: string;
  enum?: (string | number)[];
  oneOf?: Array<{ const: string; title: string }>;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  items?: { type: string; enum?: string[] };
  minItems?: number;
  maxItems?: number;
}

/** Result from MCP elicitInput call */
export interface ElicitationResult {
  action: "accept" | "decline";
  content?: Record<string, unknown>;
}

/** Context object needed to issue elicitation requests */
export interface McpElicitationContext {
  elicitInput: (params: {
    mode: "form";
    message: string;
    requestedSchema: ElicitationJsonSchema;
  }) => Promise<ElicitationResult>;
}

/** Describes which elicitation schema to request and why */
export interface MissingInputReport {
  /** Schema key from ELICITATION_SCHEMAS */
  schemaName: string;
  /** Human-readable reason the data is needed */
  reason: string;
  /** Which specific fields within the schema are needed */
  missingFields: string[];
}

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * MaterialSelection — material group, grade, hardness, condition.
 * Used by: sf_orchestrate, speed_feed, cnc_simulate, quote_estimate,
 * feasibility_check, playbook_query, and most physics calculations.
 */
const MaterialSelectionSchema: ElicitationJsonSchema = {
  type: "object",
  title: "Material Selection",
  description:
    "Specify the workpiece material for accurate physics-based calculations. " +
    "PRISM uses material properties (kc1.1, mc, thermal conductivity, hardness) " +
    "for Kienzle cutting force, Taylor tool life, and stability analysis.",
  properties: {
    material_group: {
      type: "string",
      title: "Material Group",
      description: "ISO material classification group",
      oneOf: [
        { const: "steel", title: "Steel (P)" },
        { const: "stainless_steel", title: "Stainless Steel (M)" },
        { const: "cast_iron", title: "Cast Iron (K)" },
        { const: "aluminum", title: "Aluminum (N)" },
        { const: "superalloy", title: "Superalloy / HRSA (S)" },
        { const: "titanium", title: "Titanium (S)" },
        { const: "hardened_steel", title: "Hardened Steel (H)" },
        { const: "copper", title: "Copper / Brass (N)" },
        { const: "plastic", title: "Plastic / Composite" },
        { const: "other", title: "Other" },
      ],
    },
    grade: {
      type: "string",
      title: "Material Grade",
      description:
        "Specific alloy designation (e.g. '6061-T6', '4140', '304', 'Ti-6Al-4V', 'Inconel 718')",
      minLength: 1,
      maxLength: 64,
    },
    hardness_hrc: {
      type: "number",
      title: "Hardness (HRC)",
      description:
        "Rockwell C hardness of the workpiece. Leave blank if unknown. " +
        "Affects tool selection, speed limits, and wear prediction.",
      minimum: 0,
      maximum: 72,
    },
    condition: {
      type: "string",
      title: "Material Condition",
      description: "Heat treatment or processing state of the material",
      oneOf: [
        { const: "annealed", title: "Annealed" },
        { const: "normalized", title: "Normalized" },
        { const: "quenched_tempered", title: "Quenched & Tempered" },
        { const: "cold_drawn", title: "Cold Drawn" },
        { const: "hot_rolled", title: "Hot Rolled" },
        { const: "cast", title: "Cast" },
        { const: "forged", title: "Forged" },
        { const: "solution_treated", title: "Solution Treated" },
        { const: "aged", title: "Aged / Precipitation Hardened" },
        { const: "as_received", title: "As Received" },
      ],
      default: "as_received",
    },
  },
  required: ["material_group", "grade"],
};

/**
 * MachineSelection — manufacturer, model, controller, RPM, power, axes.
 * Used by: sf_orchestrate, cnc_simulate, program_gen, post_process,
 * feasibility_check, machine_match.
 */
const MachineSelectionSchema: ElicitationJsonSchema = {
  type: "object",
  title: "Machine Selection",
  description:
    "Specify the CNC machine for capability-aware calculations. " +
    "PRISM uses machine limits (max RPM, power, axis count) to clamp " +
    "speed/feed recommendations and select appropriate post-processor dialects.",
  properties: {
    manufacturer: {
      type: "string",
      title: "Machine Manufacturer",
      description: "Machine tool builder (e.g. Haas, DMG MORI, Mazak, Okuma)",
      oneOf: [
        { const: "haas", title: "Haas" },
        { const: "dmg_mori", title: "DMG MORI" },
        { const: "mazak", title: "Mazak" },
        { const: "okuma", title: "Okuma" },
        { const: "makino", title: "Makino" },
        { const: "doosan", title: "Doosan" },
        { const: "hurco", title: "Hurco" },
        { const: "brother", title: "Brother" },
        { const: "hermle", title: "Hermle" },
        { const: "gf_machining", title: "GF Machining Solutions" },
        { const: "matsuura", title: "Matsuura" },
        { const: "kitamura", title: "Kitamura" },
        { const: "toyoda", title: "Toyoda" },
        { const: "mori_seiki", title: "Mori Seiki" },
        { const: "other", title: "Other" },
      ],
    },
    model: {
      type: "string",
      title: "Machine Model",
      description:
        "Specific model name (e.g. 'VF-2', 'DMU 50', 'Integrex i-200', 'LB3000 EXII')",
      minLength: 1,
      maxLength: 64,
    },
    controller: {
      type: "string",
      title: "CNC Controller",
      description: "Controller family installed on the machine",
      oneOf: [
        { const: "fanuc_0i", title: "Fanuc 0i" },
        { const: "fanuc_30i", title: "Fanuc 30i/31i" },
        { const: "siemens_828d", title: "Siemens 828D" },
        { const: "siemens_840d", title: "Siemens 840D sl" },
        { const: "siemens_one", title: "Siemens ONE" },
        { const: "heidenhain_tnc640", title: "Heidenhain TNC 640" },
        { const: "heidenhain_tnc7", title: "Heidenhain TNC7" },
        { const: "haas_ngc", title: "Haas NGC" },
        { const: "mazak_smooth", title: "Mazak SmoothAi / Smooth G" },
        { const: "okuma_osp", title: "Okuma OSP-P300/P500" },
        { const: "brother_cnc", title: "Brother CNC-C00" },
        { const: "mitsubishi", title: "Mitsubishi M80/M800" },
        { const: "fagor", title: "Fagor 8070" },
        { const: "other", title: "Other" },
      ],
    },
    max_rpm: {
      type: "number",
      title: "Max Spindle RPM",
      description:
        "Maximum spindle speed in revolutions per minute. " +
        "Used to clamp calculated RPM and evaluate HSM capability.",
      minimum: 100,
      maximum: 100000,
      default: 12000,
    },
    max_power_kw: {
      type: "number",
      title: "Max Spindle Power (kW)",
      description:
        "Continuous spindle power rating in kilowatts. " +
        "Used for power check (Pc = Fc * Vc / 60000) and feed limiting.",
      minimum: 0.5,
      maximum: 200,
      default: 15,
    },
    axis_count: {
      type: "number",
      title: "Axis Count",
      description:
        "Number of controlled axes (3, 4, or 5). Affects toolpath strategies " +
        "and post-processor selection.",
      minimum: 3,
      maximum: 5,
      default: 3,
    },
  },
  required: ["manufacturer", "model"],
};

/**
 * OperationSelection — operation type, roughing/finishing, DoC range.
 * Used by: sf_orchestrate, playbook_query, toolpath planning, strategy selection.
 */
const OperationSelectionSchema: ElicitationJsonSchema = {
  type: "object",
  title: "Operation Selection",
  description:
    "Specify the machining operation for strategy-specific recommendations. " +
    "Operation type determines engagement model, chip thinning factors, " +
    "playbook rules, and toolpath strategy.",
  properties: {
    operation_type: {
      type: "string",
      title: "Operation Type",
      description: "Primary machining operation",
      oneOf: [
        { const: "face_mill", title: "Face Milling" },
        { const: "pocket", title: "Pocket Milling" },
        { const: "slot", title: "Slotting" },
        { const: "contour", title: "Contour / Profile Milling" },
        { const: "adaptive", title: "Adaptive / HSM Roughing" },
        { const: "drill", title: "Drilling" },
        { const: "ream", title: "Reaming" },
        { const: "tap", title: "Tapping" },
        { const: "bore", title: "Boring" },
        { const: "turn_od", title: "Turning OD" },
        { const: "turn_id", title: "Turning ID" },
        { const: "turn_face", title: "Turning Face" },
        { const: "turn_groove", title: "Grooving" },
        { const: "turn_thread", title: "Threading (Single-Point)" },
        { const: "grind_surface", title: "Surface Grinding" },
        { const: "grind_od", title: "OD Grinding" },
        { const: "grind_id", title: "ID Grinding" },
        { const: "edm_sinker", title: "EDM Sinker" },
        { const: "edm_wire", title: "Wire EDM" },
        { const: "plunge", title: "Plunge Milling" },
        { const: "ramp", title: "Ramp Milling" },
        { const: "rest", title: "Rest Machining" },
        { const: "finishing", title: "Finishing (general)" },
        { const: "deep_hole", title: "Deep Hole Drilling / Gun Drilling" },
        { const: "other", title: "Other" },
      ],
    },
    cut_type: {
      type: "string",
      title: "Cut Type",
      description: "Roughing vs finishing determines engagement, feed strategy, and Ra target",
      oneOf: [
        { const: "roughing", title: "Roughing" },
        { const: "semi_finishing", title: "Semi-Finishing" },
        { const: "finishing", title: "Finishing" },
        { const: "super_finishing", title: "Super-Finishing" },
      ],
      default: "roughing",
    },
    depth_of_cut_min_mm: {
      type: "number",
      title: "Min Depth of Cut (mm)",
      description:
        "Minimum axial depth of cut in mm. For roughing typically 0.5-5mm; " +
        "for finishing 0.05-0.5mm.",
      minimum: 0.01,
      maximum: 50,
    },
    depth_of_cut_max_mm: {
      type: "number",
      title: "Max Depth of Cut (mm)",
      description:
        "Maximum axial depth of cut in mm. Constrained by tool flute length, " +
        "stability lobes, and machine power.",
      minimum: 0.01,
      maximum: 50,
    },
    width_of_cut_mm: {
      type: "number",
      title: "Width of Cut / ae (mm)",
      description:
        "Radial engagement in mm. For adaptive clearing typically 5-15% of D; " +
        "for slotting = D. Affects chip thinning correction.",
      minimum: 0.01,
      maximum: 200,
    },
  },
  required: ["operation_type"],
};

/**
 * ToolSelection — tool type, diameter, flute count, coating, substrate.
 * Used by: sf_orchestrate, tool_library, tool_unified_search, novel toolpath.
 */
const ToolSelectionSchema: ElicitationJsonSchema = {
  type: "object",
  title: "Tool Selection",
  description:
    "Specify cutting tool parameters for physics-based speed/feed calculation. " +
    "Tool geometry (diameter, flutes, helix) directly affects chip load, " +
    "engagement, deflection (delta = FL^3 / 3EI), and surface finish.",
  properties: {
    tool_type: {
      type: "string",
      title: "Tool Type",
      description: "Category of cutting tool",
      oneOf: [
        { const: "end_mill", title: "End Mill" },
        { const: "ball_nose", title: "Ball Nose End Mill" },
        { const: "bull_nose", title: "Bull Nose / Corner Radius End Mill" },
        { const: "face_mill", title: "Face Mill / Shell Mill" },
        { const: "drill", title: "Drill" },
        { const: "reamer", title: "Reamer" },
        { const: "tap", title: "Tap" },
        { const: "boring_bar", title: "Boring Bar" },
        { const: "turning_insert", title: "Turning Insert" },
        { const: "grooving_insert", title: "Grooving / Parting Insert" },
        { const: "thread_mill", title: "Thread Mill" },
        { const: "chamfer_mill", title: "Chamfer Mill" },
        { const: "slot_drill", title: "Slot Drill" },
        { const: "barrel_cutter", title: "Barrel / Lens Cutter" },
        { const: "other", title: "Other" },
      ],
    },
    diameter_mm: {
      type: "number",
      title: "Tool Diameter (mm)",
      description:
        "Cutting diameter in millimeters. Primary factor in RPM calculation " +
        "(RPM = 1000 * Vc / (pi * D)) and deflection stiffness (I = pi*D^4/64).",
      minimum: 0.1,
      maximum: 300,
    },
    flute_count: {
      type: "number",
      title: "Number of Flutes / Edges",
      description:
        "Number of cutting edges. Determines table feed (Vf = fz * z * n) " +
        "and chip evacuation capacity.",
      minimum: 1,
      maximum: 20,
      default: 4,
    },
    coating: {
      type: "string",
      title: "Tool Coating",
      description: "Surface coating affects friction coefficient, max temperature, and tool life",
      oneOf: [
        { const: "uncoated", title: "Uncoated" },
        { const: "TiN", title: "TiN (Titanium Nitride)" },
        { const: "TiAlN", title: "TiAlN (Titanium Aluminum Nitride)" },
        { const: "AlTiN", title: "AlTiN (Aluminum Titanium Nitride)" },
        { const: "TiCN", title: "TiCN (Titanium Carbonitride)" },
        { const: "AlCrN", title: "AlCrN (Aluminum Chromium Nitride)" },
        { const: "DLC", title: "DLC (Diamond-Like Carbon)" },
        { const: "CVD_diamond", title: "CVD Diamond" },
        { const: "PCD", title: "PCD (Polycrystalline Diamond)" },
        { const: "CBN", title: "CBN (Cubic Boron Nitride)" },
        { const: "nACo", title: "nACo (nano-composite)" },
        { const: "other", title: "Other" },
      ],
      default: "TiAlN",
    },
    tool_material: {
      type: "string",
      title: "Tool Substrate Material",
      description:
        "Base material of the cutting tool. Determines Young's modulus " +
        "for deflection calc and max operating temperature.",
      oneOf: [
        { const: "carbide", title: "Solid Carbide (WC-Co)" },
        { const: "hss", title: "HSS (High Speed Steel)" },
        { const: "hss_cobalt", title: "HSS-Co (Cobalt HSS)" },
        { const: "cermet", title: "Cermet" },
        { const: "ceramic", title: "Ceramic (Al2O3 / SiAlON)" },
        { const: "cbn", title: "CBN (Cubic Boron Nitride)" },
        { const: "pcd", title: "PCD (Polycrystalline Diamond)" },
        { const: "hss_pm", title: "HSS-PM (Powder Metallurgy)" },
        { const: "other", title: "Other" },
      ],
      default: "carbide",
    },
    helix_angle_deg: {
      type: "number",
      title: "Helix Angle (degrees)",
      description:
        "Helix angle of the flutes in degrees. Affects axial force component " +
        "and chip evacuation. Typical: 30-45 for general, 50-60 for aluminum.",
      minimum: 0,
      maximum: 65,
      default: 35,
    },
    stickout_mm: {
      type: "number",
      title: "Tool Stickout (mm)",
      description:
        "Distance from holder face to tool tip. Critical for deflection: " +
        "delta = F * L^3 / (3 * E * I). Shorter = stiffer.",
      minimum: 5,
      maximum: 500,
    },
  },
  required: ["tool_type", "diameter_mm"],
};

/**
 * ToleranceSpec — dimension, nominal, tolerances, surface finish target.
 * Used by: feasibility_check, process_capability, dimensional analysis,
 * quality prediction, quote_estimate.
 */
const ToleranceSpecSchema: ElicitationJsonSchema = {
  type: "object",
  title: "Tolerance Specification",
  description:
    "Specify dimensional and surface finish requirements. PRISM uses these " +
    "to predict Cpk, select appropriate finishing passes, and validate " +
    "that the process can hold tolerance (tool deflection + thermal + vibration).",
  properties: {
    dimension_name: {
      type: "string",
      title: "Dimension Name",
      description:
        "Descriptive label for the feature (e.g. 'bore diameter', 'slot width', 'face flatness')",
      minLength: 1,
      maxLength: 128,
    },
    nominal_mm: {
      type: "number",
      title: "Nominal Value (mm)",
      description: "Target dimension in millimeters",
      minimum: 0.001,
      maximum: 10000,
    },
    upper_tolerance_mm: {
      type: "number",
      title: "Upper Tolerance (mm)",
      description:
        "Upper deviation from nominal in mm (positive value). " +
        "e.g. +0.025 for H7 on a 25mm bore.",
      minimum: 0,
      maximum: 10,
    },
    lower_tolerance_mm: {
      type: "number",
      title: "Lower Tolerance (mm)",
      description:
        "Lower deviation from nominal in mm (positive = material removal direction). " +
        "e.g. 0.000 for H7 on a bore (unilateral).",
      minimum: -10,
      maximum: 10,
    },
    surface_finish_ra_um: {
      type: "number",
      title: "Surface Finish Ra Target (um)",
      description:
        "Target arithmetic mean roughness in micrometers. " +
        "Common: 3.2 (general), 1.6 (good), 0.8 (fine), 0.4 (precision), 0.1 (mirror).",
      minimum: 0.01,
      maximum: 25,
      default: 1.6,
    },
    gdt_type: {
      type: "string",
      title: "GD&T Type (if applicable)",
      description: "Geometric dimensioning & tolerancing callout type",
      oneOf: [
        { const: "none", title: "None / Linear" },
        { const: "position", title: "Position" },
        { const: "flatness", title: "Flatness" },
        { const: "cylindricity", title: "Cylindricity" },
        { const: "perpendicularity", title: "Perpendicularity" },
        { const: "parallelism", title: "Parallelism" },
        { const: "concentricity", title: "Concentricity / Runout" },
        { const: "profile", title: "Profile of a Surface" },
        { const: "total_runout", title: "Total Runout" },
      ],
      default: "none",
    },
  },
  required: ["dimension_name", "nominal_mm", "upper_tolerance_mm", "lower_tolerance_mm"],
};

/**
 * WorkpieceGeometry — shape, dimensions, material removal volume.
 * Used by: feasibility_check, quote_estimate, cycle_time, fixture planning.
 */
const WorkpieceGeometrySchema: ElicitationJsonSchema = {
  type: "object",
  title: "Workpiece Geometry",
  description:
    "Describe the raw workpiece shape and size. Used for fixture planning, " +
    "rigidity analysis (cantilever vs supported), material removal estimation, " +
    "and cycle time prediction.",
  properties: {
    shape: {
      type: "string",
      title: "Workpiece Shape",
      description: "General shape classification of the raw stock",
      oneOf: [
        { const: "prismatic", title: "Prismatic (block / plate)" },
        { const: "cylindrical", title: "Cylindrical (bar / rod)" },
        { const: "tubular", title: "Tubular (pipe / tube)" },
        { const: "casting", title: "Casting (near-net shape)" },
        { const: "forging", title: "Forging (near-net shape)" },
        { const: "complex", title: "Complex / Freeform" },
      ],
    },
    length_mm: {
      type: "number",
      title: "Length (mm)",
      description: "Overall length (X direction for prismatic, axial for cylindrical)",
      minimum: 1,
      maximum: 10000,
    },
    width_mm: {
      type: "number",
      title: "Width (mm)",
      description: "Width (Y direction for prismatic). Omit for cylindrical parts.",
      minimum: 1,
      maximum: 5000,
    },
    height_mm: {
      type: "number",
      title: "Height / Thickness (mm)",
      description: "Height or thickness (Z direction for prismatic). For cylindrical: wall thickness if tubular.",
      minimum: 0.5,
      maximum: 5000,
    },
    diameter_mm: {
      type: "number",
      title: "Diameter (mm)",
      description: "Outer diameter for cylindrical/tubular workpieces",
      minimum: 1,
      maximum: 5000,
    },
    material_removal_volume_cm3: {
      type: "number",
      title: "Est. Material Removal Volume (cm3)",
      description:
        "Approximate volume of material to be removed. Used for cycle time " +
        "and cost estimation. Leave blank for auto-estimate.",
      minimum: 0,
      maximum: 100000,
    },
    thin_wall: {
      type: "string",
      title: "Thin Wall Features",
      description: "Does the part have thin walls that affect rigidity?",
      oneOf: [
        { const: "none", title: "No thin walls" },
        { const: "moderate", title: "Moderate (wall > 2mm)" },
        { const: "critical", title: "Critical (wall < 2mm)" },
      ],
      default: "none",
    },
  },
  required: ["shape"],
};

/**
 * CoolantPreference — type, pressure, concentration.
 * Used by: sf_orchestrate, coolant_strategy, cnc_simulate, sustainability.
 */
const CoolantPreferenceSchema: ElicitationJsonSchema = {
  type: "object",
  title: "Coolant Preference",
  description:
    "Specify coolant delivery method and parameters. Coolant type affects " +
    "Taylor tool life coefficient, chip evacuation, built-up edge (BUE) " +
    "tendency, and surface finish quality.",
  properties: {
    coolant_type: {
      type: "string",
      title: "Coolant Type",
      description: "Primary coolant delivery method",
      oneOf: [
        { const: "flood", title: "Flood Coolant" },
        { const: "mql", title: "MQL (Minimum Quantity Lubrication)" },
        { const: "dry", title: "Dry Machining" },
        { const: "cryogenic_ln2", title: "Cryogenic LN2" },
        { const: "cryogenic_co2", title: "Cryogenic CO2" },
        { const: "high_pressure", title: "High-Pressure Coolant (70+ bar)" },
        { const: "through_tool", title: "Through-Tool Coolant" },
        { const: "air_blast", title: "Air Blast" },
        { const: "mql_cryo_hybrid", title: "MQL + Cryogenic Hybrid" },
      ],
      default: "flood",
    },
    pressure_bar: {
      type: "number",
      title: "Coolant Pressure (bar)",
      description:
        "Delivery pressure in bar. Standard: 5-20 bar, high-pressure: 70-350 bar. " +
        "Higher pressure improves chip breaking and tool life in deep holes.",
      minimum: 0,
      maximum: 500,
      default: 10,
    },
    concentration_pct: {
      type: "number",
      title: "Concentration (%)",
      description:
        "Emulsion concentration percentage (typically 5-10%). Only applicable " +
        "for water-soluble flood coolant.",
      minimum: 0,
      maximum: 100,
      default: 7,
    },
    through_spindle: {
      type: "string",
      title: "Through-Spindle Capability",
      description: "Can coolant be delivered through the spindle/tool?",
      oneOf: [
        { const: "yes", title: "Yes - Through-Spindle Available" },
        { const: "no", title: "No - External Nozzles Only" },
        { const: "unknown", title: "Unknown" },
      ],
      default: "unknown",
    },
  },
  required: ["coolant_type"],
};

/**
 * ControllerTarget — controller family, model, dialect preferences.
 * Used by: post_process, program_gen, controller_dialect, g-code output.
 */
const ControllerTargetSchema: ElicitationJsonSchema = {
  type: "object",
  title: "Controller Target",
  description:
    "Specify the target CNC controller for G-code generation. PRISM supports " +
    "20 controller dialects with specific feature sets (look-ahead, NURBS, " +
    "HSM cycles, macro-B, work offset counts).",
  properties: {
    controller_family: {
      type: "string",
      title: "Controller Family",
      description: "CNC controller manufacturer / family",
      oneOf: [
        { const: "fanuc", title: "Fanuc" },
        { const: "siemens", title: "Siemens (SINUMERIK)" },
        { const: "heidenhain", title: "Heidenhain" },
        { const: "haas", title: "Haas" },
        { const: "mazak", title: "Mazak (Mazatrol / Smooth)" },
        { const: "okuma", title: "Okuma (OSP)" },
        { const: "brother", title: "Brother" },
        { const: "mitsubishi", title: "Mitsubishi" },
        { const: "fagor", title: "Fagor" },
        { const: "generic", title: "Generic / ISO 6983" },
      ],
    },
    controller_model: {
      type: "string",
      title: "Controller Model",
      description:
        "Specific model (e.g. '0i-TF', '30i-B', '828D', '840D sl', " +
        "'TNC 640', 'NGC', 'SmoothAi', 'OSP-P300')",
      minLength: 1,
      maxLength: 32,
    },
    hsm_mode: {
      type: "string",
      title: "HSM Mode Preference",
      description:
        "High-speed machining mode injection preference. " +
        "Auto-injects G05.1 (Fanuc), CYCLE832 (Siemens), G187 (Haas), etc.",
      oneOf: [
        { const: "auto", title: "Auto-detect from controller" },
        { const: "enabled", title: "Always enable HSM" },
        { const: "disabled", title: "Disabled" },
      ],
      default: "auto",
    },
    program_format: {
      type: "string",
      title: "Program Number Format",
      description: "G-code program number style",
      oneOf: [
        { const: "O_number", title: "O-number (O0001)" },
        { const: "percent", title: "% header" },
        { const: "none", title: "No program number" },
      ],
      default: "O_number",
    },
    decimal_places: {
      type: "number",
      title: "Coordinate Decimal Places",
      description: "Number of decimal places for axis coordinates (typically 3 or 4)",
      minimum: 1,
      maximum: 6,
      default: 4,
    },
  },
  required: ["controller_family"],
};

// ============================================================================
// Schema Registry
// ============================================================================

/**
 * Master map of all elicitation schemas, keyed by descriptive name.
 * Used by requestElicitation() and detectMissingInput().
 */
export const ELICITATION_SCHEMAS: Record<string, ElicitationJsonSchema> = {
  MaterialSelection: MaterialSelectionSchema,
  MachineSelection: MachineSelectionSchema,
  OperationSelection: OperationSelectionSchema,
  ToolSelection: ToolSelectionSchema,
  ToleranceSpec: ToleranceSpecSchema,
  WorkpieceGeometry: WorkpieceGeometrySchema,
  CoolantPreference: CoolantPreferenceSchema,
  ControllerTarget: ControllerTargetSchema,
};

/** Schema names as a typed union */
export type ElicitationSchemaName = keyof typeof ELICITATION_SCHEMAS;

// ============================================================================
// Action-to-Required-Params Mapping
// ============================================================================

/**
 * Maps dispatcher action names to the elicitation schemas and fields
 * needed when those fields are missing from the provided parameters.
 *
 * Each entry says: "for this action, if these parameter keys are absent,
 * request this elicitation schema because of this reason."
 */
const ACTION_REQUIREMENTS: Record<
  string,
  Array<{
    schemaName: ElicitationSchemaName;
    /** Parameter keys in the action's input that satisfy this schema */
    paramKeys: string[];
    reason: string;
  }>
> = {
  // Speed/Feed Orchestrator — needs material + tool at minimum
  sf_orchestrate: [
    {
      schemaName: "MaterialSelection",
      paramKeys: ["material", "material_id", "material_group", "material_name", "materialName"],
      reason:
        "Material properties (kc1.1, mc, thermal conductivity) are required for " +
        "Kienzle cutting force and Taylor tool life calculations.",
    },
    {
      schemaName: "ToolSelection",
      paramKeys: ["tool", "tool_id", "tool_diameter", "diameter", "diameter_mm", "toolDiameter"],
      reason:
        "Tool geometry (diameter, flutes) is required for RPM calculation " +
        "(RPM = 1000*Vc/piD) and chip load determination.",
    },
    {
      schemaName: "MachineSelection",
      paramKeys: ["machine", "machine_id", "machine_name", "machineName"],
      reason:
        "Machine limits (max RPM, power) are needed to clamp speed/feed " +
        "to achievable values and check power constraint.",
    },
    {
      schemaName: "OperationSelection",
      paramKeys: ["operation", "operation_type", "op_type", "operationType"],
      reason:
        "Operation type determines engagement model, chip thinning correction, " +
        "and playbook rule selection.",
    },
  ],

  // Quick speed/feed
  sf_quick: [
    {
      schemaName: "MaterialSelection",
      paramKeys: ["material", "material_id", "material_name"],
      reason: "Material is required for speed/feed lookup.",
    },
    {
      schemaName: "ToolSelection",
      paramKeys: ["tool", "tool_diameter", "diameter", "diameter_mm"],
      reason: "Tool diameter is required for RPM calculation.",
    },
  ],

  // CNC Simulation
  cnc_simulate: [
    {
      schemaName: "MaterialSelection",
      paramKeys: ["material", "material_id", "workpiece_material"],
      reason:
        "Material properties are needed for Kienzle force model and " +
        "thermal simulation within the CNC simulation pipeline.",
    },
    {
      schemaName: "MachineSelection",
      paramKeys: ["machine", "machine_id", "machine_name"],
      reason:
        "Machine profile is needed for axis limits, rapid traverse rates, " +
        "and controller-specific simulation parameters.",
    },
  ],

  // Post-processing
  post_process: [
    {
      schemaName: "ControllerTarget",
      paramKeys: ["controller", "controller_family", "dialect", "controller_model"],
      reason:
        "Target controller must be specified for dialect-aware G-code output " +
        "(HSM injection, canned cycles, modal groups).",
    },
  ],

  // Feasibility check
  feasibility_check: [
    {
      schemaName: "MaterialSelection",
      paramKeys: ["material", "material_id"],
      reason: "Material is required for force, rigidity, and thermal feasibility analysis.",
    },
    {
      schemaName: "WorkpieceGeometry",
      paramKeys: ["workpiece", "geometry", "shape", "dimensions"],
      reason: "Workpiece geometry is needed for rigidity degradation and accessibility analysis.",
    },
  ],

  // Quote estimation
  quote_estimate: [
    {
      schemaName: "MaterialSelection",
      paramKeys: ["material", "material_id", "material_name"],
      reason: "Material determines raw stock cost and machining difficulty factor.",
    },
    {
      schemaName: "WorkpieceGeometry",
      paramKeys: ["workpiece", "geometry", "dimensions", "part_dimensions"],
      reason: "Part dimensions are needed for cycle time and material cost estimation.",
    },
    {
      schemaName: "ToleranceSpec",
      paramKeys: ["tolerance", "tolerances", "surface_finish", "ra_target"],
      reason: "Tolerance requirements affect finishing pass count and inspection costs.",
    },
  ],

  // Playbook query
  playbook_query: [
    {
      schemaName: "OperationSelection",
      paramKeys: ["operation", "operation_type", "category"],
      reason: "Operation type is needed to filter the 296-rule playbook to relevant rules.",
    },
    {
      schemaName: "MaterialSelection",
      paramKeys: ["material", "material_id", "material_group"],
      reason: "Material group enables ISO-group-specific playbook rule matching.",
    },
  ],

  // Program generation
  program_gen: [
    {
      schemaName: "MaterialSelection",
      paramKeys: ["material", "material_id"],
      reason: "Material is required for speed/feed calculation within program assembly.",
    },
    {
      schemaName: "MachineSelection",
      paramKeys: ["machine", "machine_id"],
      reason: "Machine profile determines axis limits and G-code formatting.",
    },
    {
      schemaName: "ControllerTarget",
      paramKeys: ["controller", "controller_family", "dialect"],
      reason: "Controller target determines post-processor dialect for output G-code.",
    },
  ],
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Request structured input from the user via MCP elicitation.
 *
 * Sends a form-mode elicitation request with the named schema and waits
 * for the user's response. Returns the accepted data or null if declined.
 *
 * @param ctx - MCP context with elicitInput capability
 * @param schemaName - Key into ELICITATION_SCHEMAS
 * @param reason - Human-readable explanation shown to the user
 * @returns Accepted form data, or null if user declined/cancelled
 */
export async function requestElicitation(
  ctx: McpElicitationContext,
  schemaName: string,
  reason: string,
): Promise<Record<string, unknown> | null> {
  const schema = ELICITATION_SCHEMAS[schemaName];
  if (!schema) {
    log.warn(`[Elicitation] Unknown schema: ${schemaName}`);
    return null;
  }

  try {
    log.info(`[Elicitation] Requesting ${schemaName}: ${reason}`);

    const result = await ctx.elicitInput({
      mode: "form",
      message: `${reason}\n\nPlease provide the following information:`,
      requestedSchema: schema,
    });

    if (result.action === "accept" && result.content) {
      log.info(
        `[Elicitation] ${schemaName} accepted with ${Object.keys(result.content).length} fields`,
      );
      return result.content;
    }

    log.info(`[Elicitation] ${schemaName} ${result.action}`);
    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Elicitation not supported by this client — fail gracefully
    if (msg.includes("not supported") || msg.includes("not available") || msg.includes("capability")) {
      log.info(`[Elicitation] Client does not support elicitation — skipping ${schemaName}`);
      return null;
    }
    log.warn(`[Elicitation] Error requesting ${schemaName}: ${msg}`);
    return null;
  }
}

/**
 * Analyze an action's provided parameters and determine which elicitation
 * schemas should be requested to fill in missing data.
 *
 * Returns an array of MissingInputReport objects, one per schema that
 * has unresolved required fields. Empty array = nothing missing.
 *
 * @param actionName - Dispatcher action name (e.g. "sf_orchestrate")
 * @param providedParams - Parameters the user already supplied
 * @returns Array of reports describing what is missing
 */
export function detectMissingInput(
  actionName: string,
  providedParams: Record<string, unknown>,
): MissingInputReport[] {
  const requirements = ACTION_REQUIREMENTS[actionName];
  if (!requirements) {
    return [];
  }

  const reports: MissingInputReport[] = [];
  const providedKeys = new Set(Object.keys(providedParams));

  for (const req of requirements) {
    // Check if ANY of the param keys for this schema are present with a truthy value
    const hasAny = req.paramKeys.some(
      (k) => providedKeys.has(k) && providedParams[k] !== undefined && providedParams[k] !== null && providedParams[k] !== "",
    );

    if (!hasAny) {
      // Determine which specific fields from the schema are needed
      const schema = ELICITATION_SCHEMAS[req.schemaName];
      const missingFields = schema?.required ?? Object.keys(schema?.properties ?? {});

      reports.push({
        schemaName: req.schemaName,
        reason: req.reason,
        missingFields,
      });
    }
  }

  return reports;
}

/**
 * Get the list of action names that have elicitation requirements configured.
 */
export function getElicitationAwareActions(): string[] {
  return Object.keys(ACTION_REQUIREMENTS);
}

/**
 * Get the requirement config for a specific action (for testing/introspection).
 */
export function getActionRequirements(actionName: string) {
  return ACTION_REQUIREMENTS[actionName] ?? [];
}
