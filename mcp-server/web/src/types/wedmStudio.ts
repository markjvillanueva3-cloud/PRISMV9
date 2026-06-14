/**
 * wedmStudio.ts — Wire EDM Studio Frontend Types
 * WEDM-MS0 U-WEDM02
 *
 * All TypeScript types for the 6-step wizard: Import → Review → WCS →
 * Toolpath → Optimize → Program. Mirrors backend Zod schemas.
 *
 * SEPARATE from types/edm.ts (calculator types).
 */

// ============================================================================
// WIZARD NAVIGATION
// ============================================================================

export type WedmStep =
  | "import"
  | "review"
  | "wcs"
  | "toolpath"
  | "optimize"
  | "program";

export const WEDM_STEPS: readonly WedmStep[] = [
  "import", "review", "wcs", "toolpath", "optimize", "program",
] as const;

export type StepStatus = "pending" | "active" | "complete" | "stale" | "error";

export type InputMethod = "upload" | "quick_generate" | "manual";

// ============================================================================
// PIPELINE RESPONSE — Discriminated Union
// ============================================================================

export type PipelineResponse<T> =
  | { ok: true; data: T; warnings: string[] }
  | { ok: false; error: string; code: string; step: WedmStep };

// ============================================================================
// GEOMETRY TYPES (mirror DXFGeometryParserEngine output)
// ============================================================================

export interface Point2D {
  x: number;
  y: number;
}

export interface LineSegment {
  type: "line";
  start: Point2D;
  end: Point2D;
}

export interface ArcSegment {
  type: "arc";
  start: Point2D;
  end: Point2D;
  center: Point2D;
  radius: number;
  start_angle_rad: number;
  end_angle_rad: number;
  ccw: boolean;
}

export type GeometrySegment = LineSegment | ArcSegment;

export interface ProfileContour {
  id: string;
  segments: GeometrySegment[];
  is_closed: boolean;
  is_exterior: boolean;
  area_mm2: number;
  perimeter_mm: number;
  bbox: { min_x: number; min_y: number; max_x: number; max_y: number };
}

export interface GeometryIssue {
  type: "open_contour" | "self_intersection" | "narrow_slot" | "short_segment" | "gap_closed" | "duplicate_removed";
  severity: "error" | "warning" | "info";
  message: string;
  location?: Point2D;
  contour_id?: string;
}

// ============================================================================
// STEP 1: IMPORT — Drawing Interpretation
// ============================================================================

export interface PartFeature {
  name: string;
  type: "profile" | "hole" | "slot" | "cavity" | "contour" | "pocket";
  is_through: boolean;
  dimensions_mm: {
    length?: number;
    width?: number;
    depth?: number;
    diameter?: number;
  };
  tolerance_mm?: number;
  surface_finish_ra_um?: number;
  min_corner_radius_mm?: number;
  taper_angle_deg?: number;
  profile_length_mm?: number;
}

export interface ImportResult {
  contours: ProfileContour[];
  features: PartFeature[];
  issues: GeometryIssue[];
  entity_count: number;
  source_format: "dxf" | "step" | "iges";
}

// ============================================================================
// STEP 2: REVIEW — Feature Classification + Feasibility
// ============================================================================

export interface ClassifiedFeature {
  name: string;
  edm_process: "wire_edm" | "sinker_edm" | "hole_popper" | "micro_edm" | "not_edm";
  reason: string;
  confidence: number;
}

export interface FeasibilityResult {
  overall_feasible: boolean;
  feature_assessments: Array<{
    feature_name: string;
    feasible: boolean;
    issues: string[];
    alternatives: string[];
  }>;
  estimated_time_min: number;
  estimated_cost_usd: number;
}

export type WireType =
  | "brass"
  | "zinc_coated"
  | "diffusion_annealed"
  | "coated_brass"
  | "molybdenum"
  | "tungsten"
  | "steel_core";

export type ControllerDialect =
  | "fanuc"
  | "sodick"
  | "makino"
  | "mitsubishi"
  | "agiecharmilles"
  | "accutex";

export interface MaterialMachineWireSelection {
  material: string;
  machine_id: string;
  machine_name: string;
  wire_type: WireType;
  wire_diameter_mm: number;
  controller: ControllerDialect;
  material_density_kg_m3?: number;
}

// ============================================================================
// STEP 3: WCS — Work Coordinate System
// ============================================================================

export interface WCSOrigin {
  x: number;
  y: number;
  label: string; // e.g., "G54"
}

export interface StartHole {
  id: string;
  x_mm: number;
  y_mm: number;
  diameter_mm: number;
  feature_name: string;
}

export interface WCSResult {
  origin: WCSOrigin;
  start_holes: StartHole[];
  setup_notes: string[];
  workpiece_height_mm?: number;
  guide_distance_mm?: number;
}

// ============================================================================
// STEP 4: TOOLPATH — Strategy + Tabs + Sequence
// ============================================================================

export type ProfileType = "closed_external" | "closed_internal" | "open" | "island";

export interface ToolpathProfile {
  id: string;
  type: ProfileType;
  contour_points: Array<{ x: number; y: number }>;
  profile_length_mm: number;
  min_corner_radius_mm?: number;
  taper_angle_deg?: number;
  start_hole_id?: string;
}

export interface TabPosition {
  profile_id: string;
  position_along_mm: number;
  width_mm: number;
}

export interface CuttingSequenceEntry {
  order: number;
  profile_id: string;
  approach_type: "lead_in" | "direct";
  lead_in_radius_mm?: number;
}

export interface ToolpathResult {
  profiles: ToolpathProfile[];
  tabs: TabPosition[];
  sequence: CuttingSequenceEntry[];
  total_cut_length_mm: number;
}

// Taper display types (WEDM-MS1 U-WEDM22)
export interface TaperSegmentDisplay {
  profile_id: string;
  segment_index: number;
  start_point: Point2D;
  end_point: Point2D;
  taper_angle_deg: number;
  u_offset_mm: number;
  v_offset_mm: number;
}

export interface TaperDisplayConfig {
  segments: TaperSegmentDisplay[];
  workpiece_height_mm: number;
  guide_distance_mm: number;
  wire_diameter_mm: number;
}

// ============================================================================
// STEP 5: OPTIMIZE — Multi-Pass + Parameters + Safety
// ============================================================================

export type PassType = "rough" | "semi_finish" | "finish" | "super_finish";

export interface PassParameters {
  pass_number: number;
  pass_type: PassType;
  offset_mm: number;
  energy_mj: number;
  pulse_on_us: number;
  pulse_off_us: number;
  wire_tension_n: number;
  wire_speed_m_min: number;
  cutting_speed_mm_min: number;
  predicted_ra_um: number;
}

export interface MultiPassResult {
  total_passes: number;
  passes: PassParameters[];
  predicted_final_ra_um: number;
  predicted_recast_um: number;
  predicted_haz_um: number;
}

export interface WireBreakPrediction {
  risk_level: "low" | "medium" | "high";
  probability: number;
  contributing_factors: string[];
  mitigation: string[];
}

export interface FlushingStrategy {
  mode: "submerged" | "jet" | "combined";
  pressure_bar: number;
  nozzle_position: string;
}

export interface OptimizeResult {
  multipass: MultiPassResult;
  wire_break: WireBreakPrediction;
  flushing: FlushingStrategy;
  estimated_time_min: number;
  predicted_pp?: number;
}

// ============================================================================
// STEP 6: PROGRAM — G-code + Cost + Setup Sheet
// ============================================================================

export interface GCodeOutput {
  program: string;
  controller: ControllerDialect;
  line_count: number;
  estimated_run_time_min: number;
  warnings: string[];
}

export interface CostBreakdown {
  wire_cost_usd: number;
  machine_time_cost_usd: number;
  consumables_cost_usd: number;
  setup_cost_usd: number;
  total_cost_usd: number;
  wire_consumption_m: number;
  machine_time_min: number;
}

export interface SetupSheet {
  job_name: string;
  material: string;
  machine: string;
  wire_type: string;
  workholding_notes: string[];
  flushing_notes: string[];
  threading_sequence: string[];
  safety_notes: string[];
}

export interface ProgramResult {
  gcode: GCodeOutput;
  cost: CostBreakdown;
  setup_sheet: SetupSheet;
}

// ============================================================================
// API PARAMETER TYPES (typed replacements for Record<string, any>)
// ============================================================================

/** POST /feasibility */
export interface FeasibilityParams {
  features: PartFeature[];
  material: string;
  thickness_mm: number;
  wire_diameter_mm: number;
  target_ra_um: number;
  taper_angle_deg?: number;
  flushing_mode?: string;
}

/** POST /selection */
export interface SelectionParams {
  material: string;
  features: PartFeature[];
}

/** POST /start-holes */
export interface StartHolesParams {
  // 2026-05-27 iter25 — features is the legacy seed shape; iter26 adds the
  // origin+start_holes+material+wire shape StepWcs L235-L240 builds when the
  // operator has already picked the start hole geometry interactively.
  features?: PartFeature[];
  origin?: { x: number; y: number } | null;
  start_holes?: StartHole[];
  material?: string;
  wire_diameter_mm?: number;
}

/** POST /toolpath */
export interface ToolpathParams {
  // 2026-05-27 iter25 — StepToolpath L258 builds the toolpath from prepared
  // profiles + tabs + sequence (when classify+plan stages already ran);
  // legacy /toolpath route still accepts the feature+contour seed.
  features?: PartFeature[];
  contours?: ProfileContour[];
  start_holes?: StartHole[];
  profiles?: ToolpathProfile[];
  tabs?: TabPosition[];
  // sequence can be raw ids (legacy) or CuttingSequenceEntry rows; the planner
  // accepts both via discriminated parsing on the server side.
  sequence?: unknown[];
  material?: string;
  wire_diameter_mm?: number;
}

/** POST /tabs */
export interface TabsParams {
  profiles: ToolpathProfile[];
}

/** POST /sequence */
export interface SequenceParams {
  profiles: ToolpathProfile[];
}

/** POST /multipass */
export interface MultipassParams {
  features: PartFeature[];
  material: string;
}

/** POST /optimize */
export interface OptimizeParams {
  material: string;
  wire_type: WireType;
  wire_diameter_mm: number;
  controller: ControllerDialect;
  profiles: ToolpathProfile[];
  total_cut_length_mm: number;
  target_ra_um: number;
}

/** POST /flushing */
export interface FlushingParams {
  material: string;
  features: PartFeature[];
}

/** POST /predict-wire-break */
export interface WireBreakParams {
  features: PartFeature[];
  material: string;
}

/** POST /calculate-corners */
export interface CornerCalcParams {
  profiles: ToolpathProfile[];
}

/** POST /solve-taper */
export interface TaperSolveParams {
  profiles: ToolpathProfile[];
  taper_angle_deg: number;
  workpiece_height_mm: number;
}

/** Shared params for POST /gcode, /cost, /setup-sheet */
export interface ProgramStageParams {
  material: string;
  machine_id: string;
  controller: ControllerDialect;
  wire_type: WireType;
  wire_diameter_mm: number;
  profiles: ToolpathProfile[];
  multipass: MultiPassResult;
  flushing: FlushingStrategy;
}

/** POST /pipeline (legacy) */
export interface PipelineRunParams {
  features: PartFeature[];
  material: string;
  controller: ControllerDialect;
}

/** POST /calculate-passes */
export interface CalculatePassesParams {
  features: PartFeature[];
  material: string;
}

// ============================================================================
// WIZARD STATE (per-step data)
// ============================================================================

export interface WedmWizardState {
  current_step: WedmStep;
  step_status: Record<WedmStep, StepStatus>;
  input_method: InputMethod;

  // Step results (populated as wizard progresses)
  import_result?: ImportResult;
  classification?: ClassifiedFeature[];
  feasibility?: FeasibilityResult;
  selection?: MaterialMachineWireSelection;
  wcs?: WCSResult;
  toolpath?: ToolpathResult;
  optimize?: OptimizeResult;
  program?: ProgramResult;

  // Metadata
  file_name?: string;
  file_size_bytes?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// QUICK GENERATE (background job)
// ============================================================================

export type QuickGenerateStatus =
  | "queued"
  | "running"
  | "complete"
  | "failed";

export interface QuickGenerateJob {
  job_id: string;
  status: QuickGenerateStatus;
  current_step: WedmStep;
  progress_pct: number;
  started_at: string;
  completed_at?: string;
  error?: string;
  result?: WedmWizardState;
}
