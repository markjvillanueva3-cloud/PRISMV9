/**
 * CAM Function Index Schema
 * =========================
 * Hierarchical schema for exhaustive CAM UI function/parameter indexing.
 * Supports: CAMSystem > Module > Menu > Dialog > Parameter > Value
 *
 * Used by CAM-EXHAUST-MS0 milestone for complete CAM coverage.
 * Target: 18 CAM systems, 5000+ functions, 25000+ parameters.
 *
 * @module schemas/camFunctionIndexSchema
 * @version 1.0.0
 */

import { z } from "zod";

// ============================================================================
// VALUE LEVEL — Atomic parameter definitions
// ============================================================================

/** Parameter value type enumeration */
export const CAMValueTypeEnum = z.enum([
  "number",           // Numeric input (speed, feed, depth)
  "percentage",       // 0-100% or 0-1 ratio
  "angle",            // Degrees or radians
  "distance",         // Linear measurement
  "boolean",          // On/off toggle
  "enum",             // Dropdown selection
  "string",           // Text input
  "path",             // File/toolpath reference
  "tool_ref",         // Tool library reference
  "material_ref",     // Material database reference
  "coordinate",       // XYZ point
  "vector",           // Direction vector
  "plane",            // Work plane reference
  "geometry_ref",     // CAD geometry selection
  "expression",       // Formula/expression input
  "array",            // List of values
  "object",           // Nested object
]).describe("Data type of the parameter value");

/** Unit system enumeration */
export const CAMUnitEnum = z.enum([
  // Length
  "mm", "inch", "m", "cm", "um",
  // Speed
  "rpm", "sfm", "m_per_min",
  // Feed
  "mm_per_min", "mm_per_rev", "mm_per_tooth", "ipm", "ipr", "ipt",
  // Angle
  "deg", "rad",
  // Time
  "sec", "min", "ms",
  // Force
  "N", "kN", "lbf",
  // Temperature
  "C", "F", "K",
  // Percentage
  "percent", "ratio",
  // Dimensionless
  "none",
]).describe("Unit of measurement");

/** Constraint definition for parameter validation */
export const CAMConstraintSchema = z.object({
  min: z.number().optional().describe("Minimum allowed value"),
  max: z.number().optional().describe("Maximum allowed value"),
  step: z.number().optional().describe("Increment step for UI spinners"),
  precision: z.number().optional().describe("Decimal places"),
  enum_values: z.array(z.string()).optional().describe("Allowed enum values"),
  pattern: z.string().optional().describe("Regex pattern for string validation"),
  required: z.boolean().default(false).describe("Whether field is mandatory"),
  readonly: z.boolean().default(false).describe("Whether field is editable"),
  depends_on: z.array(z.string()).optional().describe("Conditional visibility dependencies"),
  formula: z.string().optional().describe("Formula linking to other parameters"),
}).describe("Validation constraints for parameter values");

/** Parameter value with full metadata */
export const CAMValueSchema = z.object({
  type: CAMValueTypeEnum,
  unit: CAMUnitEnum.optional(),
  default_value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional()
    .describe("Default value when parameter is created"),
  constraints: CAMConstraintSchema.optional(),
  description: z.string().optional().describe("User-facing parameter description"),
  tooltip: z.string().optional().describe("UI tooltip text"),
  help_url: z.string().optional().describe("Link to documentation"),
}).describe("Complete parameter value definition");

// ============================================================================
// PARAMETER LEVEL — Individual UI controls
// ============================================================================

/** Physics relationship for AI reasoning */
export const PhysicsLinkSchema = z.object({
  formula_id: z.string().describe("Reference to FormulaRegistry formula ID"),
  role: z.enum(["input", "output", "coefficient", "constraint"])
    .describe("How this parameter relates to the formula"),
  affects: z.array(z.string()).optional()
    .describe("Other parameters affected by changes to this one"),
}).describe("Link to physics formula for AI reasoning");

/** Tribal knowledge tip attached to parameter */
export const TribalTipSchema = z.object({
  id: z.string().describe("Unique tip identifier"),
  text: z.string().describe("The tip content"),
  source: z.enum(["shop_floor", "pdf", "video", "expert", "research", "jm_die"])
    .describe("Origin of the knowledge"),
  confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
  material_context: z.array(z.string()).optional()
    .describe("Materials this tip applies to"),
  operation_context: z.array(z.string()).optional()
    .describe("Operations this tip applies to"),
}).describe("Shop floor wisdom attached to parameter");

/** AI action mapping for automation */
export const AIActionSchema = z.object({
  dispatcher: z.string().describe("PRISM dispatcher name (e.g., prism_cam)"),
  action: z.string().describe("Action name within dispatcher"),
  parameter_mapping: z.record(z.string(), z.string()).optional()
    .describe("Maps CAM param names to PRISM action param names"),
  pre_conditions: z.array(z.string()).optional()
    .describe("Conditions required before action can execute"),
  post_actions: z.array(z.string()).optional()
    .describe("Follow-up actions to chain"),
}).describe("Maps UI parameter to PRISM AI action");

/** Full parameter definition */
export const CAMParameterSchema = z.object({
  id: z.string().describe("Unique parameter identifier within dialog"),
  name: z.string().describe("Display name in UI"),
  label: z.string().optional().describe("UI label (may differ from name)"),
  category: z.string().optional().describe("Grouping category within dialog"),
  value: CAMValueSchema,

  // AI Integration
  physics_links: z.array(PhysicsLinkSchema).optional()
    .describe("Links to physics formulas for AI reasoning"),
  tribal_tips: z.array(TribalTipSchema).optional()
    .describe("Shop floor wisdom for this parameter"),
  ai_actions: z.array(AIActionSchema).optional()
    .describe("PRISM actions that can manipulate this parameter"),

  // Metadata
  ui_position: z.object({
    row: z.number().optional(),
    column: z.number().optional(),
    tab: z.string().optional(),
    group: z.string().optional(),
  }).optional().describe("Position in CAM UI layout"),

  shortcuts: z.array(z.string()).optional()
    .describe("Keyboard shortcuts to access this parameter"),

  related_parameters: z.array(z.string()).optional()
    .describe("IDs of parameters commonly adjusted together"),

  change_impact: z.enum(["none", "local", "toolpath", "program", "all"]).optional()
    .describe("What regenerates when this parameter changes"),
}).describe("Complete CAM parameter definition with AI integration");

// ============================================================================
// DIALOG LEVEL — Parameter groupings (dialogs, tabs, panels)
// ============================================================================

export const CAMDialogSchema = z.object({
  id: z.string().describe("Unique dialog identifier"),
  name: z.string().describe("Dialog title"),
  type: z.enum([
    "modal",          // Modal dialog window
    "panel",          // Docked panel
    "toolbar",        // Toolbar section
    "ribbon_tab",     // Ribbon tab group
    "context_menu",   // Right-click menu
    "wizard_page",    // Multi-step wizard page
    "properties",     // Properties panel
    "inspector",      // Object inspector
  ]).describe("Dialog UI type"),

  parameters: z.array(CAMParameterSchema).describe("Parameters in this dialog"),

  // Dialog metadata
  tabs: z.array(z.object({
    id: z.string(),
    name: z.string(),
    parameter_ids: z.array(z.string()),
  })).optional().describe("Tab organization within dialog"),

  validation_rules: z.array(z.object({
    rule: z.string().describe("Validation rule expression"),
    message: z.string().describe("Error message if validation fails"),
    severity: z.enum(["error", "warning", "info"]),
  })).optional().describe("Cross-field validation rules"),

  // AI Integration
  dialog_purpose: z.string().optional()
    .describe("AI-readable description of dialog purpose"),
  common_workflows: z.array(z.string()).optional()
    .describe("Typical parameter adjustment sequences"),

  // Access
  access_path: z.string().optional()
    .describe("Menu path to reach this dialog (e.g., 'Tools > Define Tool')"),
  shortcut: z.string().optional()
    .describe("Keyboard shortcut to open dialog"),
}).describe("CAM dialog/panel containing grouped parameters");

// ============================================================================
// MENU LEVEL — Operations/features (Face Milling, Pocket, etc.)
// ============================================================================

// Forward-declare the CAMMenu type so CAMMenuSchema can be annotated
// as z.ZodType<CAMMenu> (required by TypeScript for recursive z.lazy() schemas).
// The full type is re-exported below under the TYPE EXPORTS section.
export type CAMMenu = {
  id: string;
  name: string;
  operation_class?: z.infer<typeof OperationClassEnum> | undefined;
  dialogs: z.infer<typeof CAMDialogSchema>[];
  sub_menus?: CAMMenu[] | undefined;
  geometry_requirements?: Array<
    "face" | "pocket" | "contour" | "hole" | "surface" | "solid" | "mesh" |
    "curve" | "point" | "plane" | "stock" | "fixture"
  > | undefined;
  machine_requirements?: Array<
    "3axis" | "4axis" | "5axis" | "lathe" | "millturn" | "wire_edm" |
    "sinker_edm" | "grinder" | "laser" | "waterjet"
  > | undefined;
  typical_sequence_position?: number | undefined;
  prerequisite_operations?: string[] | undefined;
  follow_up_operations?: string[] | undefined;
  output_artifacts?: Array<
    "toolpath" | "nc_code" | "setup_sheet" | "tool_list" | "simulation" |
    "collision_report" | "cycle_time" | "stock_model"
  > | undefined;
  help_url?: string | undefined;
  video_tutorials?: string[] | undefined;
  pdf_references?: string[] | undefined;
};

/** Operation classification for AI routing */
export const OperationClassEnum = z.enum([
  // Milling
  "face_milling", "pocket_milling", "contour_milling", "slot_milling",
  "3d_roughing", "3d_finishing", "3d_rest_machining", "3d_pencil",
  "5axis_swarf", "5axis_flowline", "5axis_multiaxis",

  // Hole making
  "drilling", "boring", "reaming", "tapping", "thread_milling",

  // Turning
  "turning_roughing", "turning_finishing", "grooving", "threading",
  "boring_internal", "facing",

  // Mill-Turn
  "mill_turn_milling", "mill_turn_turning", "live_tooling",

  // EDM
  "wire_edm_roughing", "wire_edm_skim", "wire_edm_taper",
  "sinker_edm_roughing", "sinker_edm_finishing",

  // Grinding
  "surface_grinding", "cylindrical_grinding", "creep_feed",

  // Inspection
  "probing", "measurement", "verification",

  // Other
  "custom", "macro",
]).describe("Standard operation classification");

export const CAMMenuSchema: z.ZodType<CAMMenu> = z.object({
  id: z.string().describe("Unique menu/operation identifier"),
  name: z.string().describe("Menu item or operation name"),
  operation_class: OperationClassEnum.optional()
    .describe("Standard operation classification for AI"),

  dialogs: z.array(CAMDialogSchema).describe("Dialogs accessible from this menu"),

  // Sub-operations
  sub_menus: z.array(z.lazy(() => CAMMenuSchema)).optional()
    .describe("Nested sub-menus/operations"),

  // Capabilities
  geometry_requirements: z.array(z.enum([
    "face", "pocket", "contour", "hole", "surface", "solid", "mesh",
    "curve", "point", "plane", "stock", "fixture"
  ])).optional().describe("Required geometry selection types"),

  machine_requirements: z.array(z.enum([
    "3axis", "4axis", "5axis", "lathe", "millturn", "wire_edm",
    "sinker_edm", "grinder", "laser", "waterjet"
  ])).optional().describe("Machine types this operation supports"),

  // AI Metadata
  typical_sequence_position: z.number().optional()
    .describe("Typical order in machining sequence (1=first, 100=last)"),

  prerequisite_operations: z.array(z.string()).optional()
    .describe("Operations that typically precede this one"),

  follow_up_operations: z.array(z.string()).optional()
    .describe("Operations that typically follow this one"),

  output_artifacts: z.array(z.enum([
    "toolpath", "nc_code", "setup_sheet", "tool_list", "simulation",
    "collision_report", "cycle_time", "stock_model"
  ])).optional().describe("What this operation produces"),

  // Documentation
  help_url: z.string().optional(),
  video_tutorials: z.array(z.string()).optional(),
  pdf_references: z.array(z.string()).optional(),
}).describe("CAM menu item or operation");

// ============================================================================
// MODULE LEVEL — Major functional areas
// ============================================================================

export const CAMModuleSchema = z.object({
  id: z.string().describe("Unique module identifier"),
  name: z.string().describe("Module name (e.g., '2D Operations', '5-Axis')"),

  menus: z.array(CAMMenuSchema).describe("Operations/menus in this module"),

  // Module metadata
  description: z.string().optional().describe("Module purpose description"),

  license_tier: z.enum([
    "base", "standard", "professional", "premium", "ultimate"
  ]).optional().describe("License level required"),

  machine_focus: z.array(z.string()).optional()
    .describe("Primary machine types (milling, turning, EDM, etc.)"),

  // AI Integration
  module_purpose: z.string().optional()
    .describe("AI-readable summary of module capabilities"),

  expertise_level: z.enum(["beginner", "intermediate", "advanced", "expert"])
    .optional().describe("Skill level typically needed"),

  total_parameters: z.number().optional()
    .describe("Count of all parameters in module"),

  tribal_tips_count: z.number().optional()
    .describe("Count of tribal tips attached to module parameters"),
}).describe("Major CAM module grouping related operations");

// ============================================================================
// SYSTEM LEVEL — Complete CAM software
// ============================================================================

export const CAMSystemSchema = z.object({
  id: z.string().describe("Unique system identifier (e.g., 'hypermill', 'mastercam')"),
  name: z.string().describe("Display name (e.g., 'hyperMILL', 'Mastercam')"),
  vendor: z.string().describe("Software vendor"),

  modules: z.array(CAMModuleSchema).describe("Modules in this CAM system"),

  // System metadata
  version: z.string().optional().describe("Software version indexed"),
  versions_supported: z.array(z.string()).optional()
    .describe("All versions this index applies to"),

  // Capabilities
  supported_machines: z.array(z.string())
    .describe("Machine types supported (3-axis, 5-axis, lathe, etc.)"),

  supported_controllers: z.array(z.string()).optional()
    .describe("Post-processor controllers available"),

  file_extensions: z.array(z.string()).optional()
    .describe("Native file extensions (e.g., .mcam, .hmc)"),

  // Integration
  cad_integration: z.array(z.string()).optional()
    .describe("Integrated CAD systems"),

  api_available: z.boolean().optional()
    .describe("Whether automation API is available"),

  api_language: z.enum(["vba", "csharp", "python", "cpp", "javascript"]).optional(),

  // AI Integration
  prism_bridge_engine: z.string().optional()
    .describe("PRISM bridge engine for this CAM (e.g., 'HyperMillBridgeEngine')"),

  prism_dispatcher: z.string().optional()
    .describe("Primary PRISM dispatcher (e.g., 'prism_cam')"),

  // Documentation
  pdf_sources: z.array(z.string()).optional()
    .describe("PDF documentation paths for training"),

  video_sources: z.array(z.string()).optional()
    .describe("Video tutorial paths for training"),

  // Statistics
  total_modules: z.number().optional(),
  total_menus: z.number().optional(),
  total_dialogs: z.number().optional(),
  total_parameters: z.number().optional(),
  total_tribal_tips: z.number().optional(),
  coverage_percent: z.number().min(0).max(100).optional()
    .describe("Percentage of UI functions indexed"),

  // Timestamps
  indexed_at: z.string().optional().describe("ISO timestamp of last indexing"),
  verified_at: z.string().optional().describe("ISO timestamp of last verification"),
}).describe("Complete CAM system definition");

// ============================================================================
// INDEX LEVEL — Master index across all CAM systems
// ============================================================================

export const CAMFunctionIndexSchema = z.object({
  schema_version: z.literal("1.0.0").describe("Schema version for migrations"),

  systems: z.array(CAMSystemSchema).describe("All indexed CAM systems"),

  // Global metadata
  total_systems: z.number().describe("Count of CAM systems"),
  total_modules: z.number().describe("Count across all systems"),
  total_menus: z.number().describe("Count across all systems"),
  total_dialogs: z.number().describe("Count across all systems"),
  total_parameters: z.number().describe("Count across all systems"),
  total_tribal_tips: z.number().describe("Count across all systems"),

  // Cross-system mappings
  parameter_equivalents: z.array(z.object({
    canonical_name: z.string().describe("Standard parameter name"),
    mappings: z.record(z.string(), z.string())
      .describe("CAM system ID → system-specific param ID"),
  })).optional().describe("Cross-CAM parameter equivalencies"),

  operation_equivalents: z.array(z.object({
    canonical_class: OperationClassEnum,
    mappings: z.record(z.string(), z.string())
      .describe("CAM system ID → system-specific operation ID"),
  })).optional().describe("Cross-CAM operation equivalencies"),

  // Timestamps
  created_at: z.string().describe("ISO timestamp of index creation"),
  updated_at: z.string().describe("ISO timestamp of last update"),

  // Validation
  validation_status: z.enum(["draft", "reviewed", "validated", "production"])
    .default("draft").describe("Index quality status"),
}).describe("Master CAM function index across all systems");

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CAMValueType = z.infer<typeof CAMValueTypeEnum>;
export type CAMUnit = z.infer<typeof CAMUnitEnum>;
export type CAMConstraint = z.infer<typeof CAMConstraintSchema>;
export type CAMValue = z.infer<typeof CAMValueSchema>;
export type PhysicsLink = z.infer<typeof PhysicsLinkSchema>;
export type TribalTip = z.infer<typeof TribalTipSchema>;
export type AIAction = z.infer<typeof AIActionSchema>;
export type CAMParameter = z.infer<typeof CAMParameterSchema>;
export type CAMDialog = z.infer<typeof CAMDialogSchema>;
export type OperationClass = z.infer<typeof OperationClassEnum>;
// CAMMenu type is declared above (forward-declaration required for z.lazy() recursion).
export type CAMModule = z.infer<typeof CAMModuleSchema>;
export type CAMSystem = z.infer<typeof CAMSystemSchema>;
export type CAMFunctionIndex = z.infer<typeof CAMFunctionIndexSchema>;

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/** Create empty CAM function index */
export function createEmptyCAMFunctionIndex(): CAMFunctionIndex {
  return {
    schema_version: "1.0.0",
    systems: [],
    total_systems: 0,
    total_modules: 0,
    total_menus: 0,
    total_dialogs: 0,
    total_parameters: 0,
    total_tribal_tips: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    validation_status: "draft",
  };
}

/** Create empty CAM system entry */
export function createEmptyCAMSystem(id: string, name: string, vendor: string): CAMSystem {
  return {
    id,
    name,
    vendor,
    modules: [],
    supported_machines: [],
    total_modules: 0,
    total_menus: 0,
    total_dialogs: 0,
    total_parameters: 0,
    total_tribal_tips: 0,
    coverage_percent: 0,
    indexed_at: new Date().toISOString(),
  };
}

/** Create empty module */
export function createEmptyCAMModule(id: string, name: string): CAMModule {
  return {
    id,
    name,
    menus: [],
    total_parameters: 0,
    tribal_tips_count: 0,
  };
}

/** Create parameter with common defaults */
export function createCAMParameter(
  id: string,
  name: string,
  type: CAMValueType,
  options?: Partial<Omit<CAMParameter, "value">> & { value?: Partial<Omit<CAMValue, "type">> }
): CAMParameter {
  return {
    id,
    name,
    ...options,
    value: {
      type,
      ...options?.value,
    },
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/** Validate a CAM function index */
export function validateCAMFunctionIndex(data: unknown): {
  success: boolean;
  data?: CAMFunctionIndex;
  errors?: z.ZodError;
} {
  const result = CAMFunctionIndexSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/** Count total parameters in a system */
export function countSystemParameters(system: CAMSystem): number {
  let count = 0;
  for (const module of system.modules) {
    for (const menu of module.menus) {
      count += countMenuParameters(menu);
    }
  }
  return count;
}

function countMenuParameters(menu: CAMMenu): number {
  let count = 0;
  for (const dialog of menu.dialogs) {
    count += dialog.parameters.length;
  }
  for (const sub of menu.sub_menus || []) {
    count += countMenuParameters(sub);
  }
  return count;
}

/** Count tribal tips in a system */
export function countSystemTribalTips(system: CAMSystem): number {
  let count = 0;
  for (const module of system.modules) {
    for (const menu of module.menus) {
      count += countMenuTribalTips(menu);
    }
  }
  return count;
}

function countMenuTribalTips(menu: CAMMenu): number {
  let count = 0;
  for (const dialog of menu.dialogs) {
    for (const param of dialog.parameters) {
      count += param.tribal_tips?.length || 0;
    }
  }
  for (const sub of menu.sub_menus || []) {
    count += countMenuTribalTips(sub);
  }
  return count;
}
