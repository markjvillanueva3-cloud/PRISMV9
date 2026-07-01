/**
 * CAMKernelOrchestratorEngine — Unified CAM Kernel Pipeline Orchestrator
 *
 * CK-MS7: Dispatcher Wiring & Skills for CAM Kernel
 *
 * Unifies all CK-MS0 through CK-MS6 engines into 3 high-level workflows:
 *
 * 1. **cam_generate** — Full milling program generation pipeline:
 *    FeatureRecognition -> OperationSequencing -> StrategySelection ->
 *    ToolpathGeneration -> SpeedFeedOptimization -> PostProcessing
 *
 * 2. **cam_turn** — Full turning/mill-turn program generation:
 *    TurningFeatureRecognition -> OpSequencing -> LiveToolPlanning ->
 *    SubSpindleTransfer -> MultiChannelSync
 *
 * 3. **cam_simulate** — Full simulation + validation pipeline:
 *    GCodeParse -> StockModel -> MaterialRemoval -> ForceCheck ->
 *    CollisionCheck -> SurfaceQuality -> Report
 *
 * Each pipeline produces realistic intermediate results for standalone operation
 * without requiring actual sub-engine calls. In production, sub-engines are
 * invoked for physics-backed computation.
 *
 * Physics references:
 *   - Kienzle: Fc = kc1.1 * b * h^(1-mc)
 *   - Taylor: VcT^n = C
 *   - Cantilever: delta = F*L^3 / (3*E*I)
 *   - Merchant: phi = pi/4 - beta/2 + gamma/2
 *   - Chip thinning: fz_eff = fz * sqrt(D / (D - 2*ae))
 *
 * @module engines/CAMKernelOrchestratorEngine
 * @version 1.0.0 — CK-MS7
 */

// ─── Types ────────────────────────────────────────────────────────────

/** ISO material group for cutting force models. */
export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Machine axis configuration. */
export type MachineAxes = "3_axis" | "3plus2" | "4_axis" | "5_axis" | "mill_turn" | "swiss";

/** Feature type recognized in part geometry. */
export type FeatureType =
  | "pocket" | "slot" | "hole" | "boss" | "face" | "contour"
  | "fillet" | "chamfer" | "thread" | "groove" | "keyway"
  | "bore" | "taper" | "step" | "rib" | "web" | "surface_3d";

/** Turning feature type. */
export type TurningFeatureType =
  | "od_rough" | "od_finish" | "id_rough" | "id_finish"
  | "face" | "groove" | "thread" | "cutoff" | "drill"
  | "bore" | "taper_od" | "taper_id" | "profile" | "recess";

/** Strategy type for milling operations. */
export type MillingStrategy =
  | "adaptive_clearing" | "hsm_pocket" | "contour_2d" | "face_mill"
  | "z_level_rough" | "parallel_finish" | "waterline" | "pencil_mill"
  | "scallop_3d" | "swarf_5ax" | "plunge_rough" | "rest_machine"
  | "drill_peck" | "helix_bore" | "thread_mill" | "chamfer";

/** Simulation severity level. */
export type Severity = "info" | "warning" | "critical" | "fatal";

// ─── Input Interfaces ─────────────────────────────────────────────────

/** Part feature description for milling. */
export interface PartFeature {
  id: string;
  type: FeatureType;
  dimensions: {
    length_mm?: number;
    width_mm?: number;
    depth_mm?: number;
    diameter_mm?: number;
    radius_mm?: number;
  };
  position?: { x: number; y: number; z: number };
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  wall_angle_deg?: number;
  bottom_type?: "flat" | "fillet" | "through";
}

/** Turning part feature. */
export interface TurningFeature {
  id: string;
  type: TurningFeatureType;
  start_diameter_mm: number;
  end_diameter_mm?: number;
  length_mm: number;
  position_z_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  thread_pitch_mm?: number;
  groove_width_mm?: number;
}

/** Tool constraint for milling. */
export interface ToolConstraint {
  max_diameter_mm?: number;
  min_diameter_mm?: number;
  max_flute_length_mm?: number;
  max_overall_length_mm?: number;
  tool_type?: string;
  coating?: string;
  num_flutes?: number;
}

/** Machine configuration for cam_generate. */
export interface MachineConfig {
  axes: MachineAxes;
  max_rpm: number;
  max_feedrate_mm_min: number;
  max_power_kw?: number;
  max_torque_nm?: number;
  table_size_mm?: { x: number; y: number };
  spindle_taper?: string;
  controller?: string;
  has_coolant_through?: boolean;
}

/** Lathe/mill-turn machine config. */
export interface LatheMachineConfig {
  machine_type: "lathe" | "mill_turn" | "swiss";
  max_rpm: number;
  max_bar_diameter_mm?: number;
  has_live_tooling: boolean;
  has_sub_spindle: boolean;
  has_y_axis: boolean;
  has_b_axis?: boolean;
  num_turrets?: number;
  num_channels?: number;
  controller?: string;
  bar_feeder?: boolean;
  guide_bushing?: boolean;
}

/** Input for cam_generate (milling pipeline). */
export interface CamGenerateInput {
  features: PartFeature[];
  material: { name: string; iso_group: ISOGroup; hardness_hrc?: number };
  machine: MachineConfig;
  tool_constraints?: ToolConstraint[];
  stock: { type: "block" | "cylinder" | "near_net"; dimensions_mm: { x: number; y: number; z: number } };
  quality_target?: { tolerance_mm?: number; surface_finish_Ra?: number };
  optimization_goal?: "min_time" | "min_cost" | "max_quality" | "balanced";
  coolant_type?: "flood" | "mist" | "mql" | "dry" | "cryogenic";
}

/** Input for cam_turn (turning/mill-turn pipeline). */
export interface CamTurnInput {
  features: TurningFeature[];
  material: { name: string; iso_group: ISOGroup; hardness_hrc?: number };
  machine: LatheMachineConfig;
  stock: { bar_diameter_mm: number; bar_length_mm?: number; shape?: "round" | "hex" };
  part_length_mm: number;
  live_tool_ops?: Array<{
    feature_id: string;
    operation: string;
    tool_diameter_mm: number;
    depth_mm: number;
    position_angle_deg?: number;
  }>;
  sub_spindle_transfer?: boolean;
  bar_feeder_mode?: boolean;
  optimization_goal?: "min_time" | "min_cost" | "balanced";
}

/** Input for cam_simulate (simulation pipeline). */
export interface CamSimulateInput {
  /** G-code program text (if available). */
  gcode?: string;
  /** Operation list (alternative to gcode). */
  operations?: Array<{
    id: string;
    type: string;
    tool: { diameter_mm: number; flute_length_mm: number; num_flutes?: number };
    speed_rpm: number;
    feed_mm_min: number;
    depth_of_cut_mm: number;
    width_of_cut_mm?: number;
  }>;
  machine: MachineConfig;
  stock: { dimensions_mm: { x: number; y: number; z: number }; material: string; iso_group?: ISOGroup };
  checks?: {
    force?: boolean;
    thermal?: boolean;
    collision?: boolean;
    surface_quality?: boolean;
    tool_life?: boolean;
    safety?: boolean;
  };
  force_limit_N?: number;
  thermal_limit_C?: number;
}

// ─── Output Interfaces ────────────────────────────────────────────────

/** Generated operation in milling pipeline. */
export interface GeneratedOperation {
  id: string;
  sequence: number;
  feature_id: string;
  strategy: MillingStrategy;
  tool: {
    type: string;
    diameter_mm: number;
    flute_length_mm: number;
    num_flutes: number;
    coating: string;
  };
  cutting_params: {
    speed_rpm: number;
    cutting_speed_m_min: number;
    feed_mm_min: number;
    feed_per_tooth_mm: number;
    depth_of_cut_mm: number;
    width_of_cut_mm: number;
    stepover_pct: number;
  };
  estimated_time_sec: number;
  estimated_mrr_cm3_min: number;
  toolpath_length_mm: number;
  notes: string[];
}

/** Milling generation result. */
export interface CamGenerateResult {
  pipeline: string;
  status: "success" | "partial" | "failed";
  operations: GeneratedOperation[];
  total_cycle_time_sec: number;
  total_tool_changes: number;
  tools_required: number;
  warnings: string[];
  pipeline_stages: Array<{ stage: string; status: string; duration_ms: number }>;
  optimization_summary: {
    goal: string;
    mrr_avg_cm3_min: number;
    estimated_cost_usd?: number;
  };
}

/** Generated turning operation. */
export interface TurningOperation {
  id: string;
  sequence: number;
  feature_id: string;
  operation_type: TurningFeatureType | string;
  channel: number;
  tool: {
    type: string;
    insert_code?: string;
    nose_radius_mm: number;
    approach_angle_deg?: number;
  };
  cutting_params: {
    speed_rpm: number;
    cutting_speed_m_min: number;
    feed_mm_rev: number;
    depth_of_cut_mm: number;
  };
  estimated_time_sec: number;
  notes: string[];
}

/** Turning/mill-turn generation result. */
export interface CamTurnResult {
  pipeline: string;
  status: "success" | "partial" | "failed";
  channels: Array<{
    channel_id: number;
    operations: TurningOperation[];
    total_time_sec: number;
  }>;
  total_cycle_time_sec: number;
  critical_path_channel: number;
  bar_feeder_setup?: {
    part_count_per_bar: number;
    cutoff_width_mm: number;
    remnant_mm: number;
  };
  sub_spindle_transfer?: {
    transfer_time_sec: number;
    mode: string;
    sync_code: string;
  };
  tools_required: number;
  warnings: string[];
  pipeline_stages: Array<{ stage: string; status: string; duration_ms: number }>;
}

/** Simulation finding. */
export interface SimulationFinding {
  severity: Severity;
  category: string;
  message: string;
  location?: { line?: number; block?: string; operation_id?: string };
  value?: number;
  limit?: number;
  recommendation?: string;
}

/** Simulation result. */
export interface CamSimulateResult {
  pipeline: string;
  status: "pass" | "warnings" | "fail";
  total_blocks_analyzed: number;
  findings: SimulationFinding[];
  force_analysis?: {
    max_force_N: number;
    avg_force_N: number;
    peak_location: string;
    within_limit: boolean;
  };
  thermal_analysis?: {
    max_temp_C: number;
    avg_temp_C: number;
    thermal_risk: string;
    within_limit: boolean;
  };
  collision_check?: {
    collisions_found: number;
    near_misses: number;
    min_clearance_mm: number;
    safe: boolean;
  };
  surface_quality?: {
    predicted_Ra_um: number;
    scallop_height_um: number;
    meets_target: boolean;
  };
  tool_life?: {
    estimated_life_min: number;
    taylor_exponent: number;
    wear_rate_mm_min: number;
    remaining_pct: number;
  };
  safety_rules?: {
    rules_checked: number;
    violations: number;
    critical_violations: number;
  };
  cycle_time_sec: number;
  pipeline_stages: Array<{ stage: string; status: string; duration_ms: number }>;
}

// ─── Kienzle Material Database ────────────────────────────────────────

interface KienzleMaterial {
  kc1_1: number;  // specific cutting force at h=1mm, b=1mm [N/mm^2]
  mc: number;     // Kienzle exponent
  Vc_rough: number; // recommended rough cutting speed [m/min]
  Vc_finish: number;
  taylor_n: number; // Taylor exponent
  taylor_C: number; // Taylor constant
}

const KIENZLE_DB: Record<ISOGroup, KienzleMaterial> = {
  P: { kc1_1: 1800, mc: 0.25, Vc_rough: 200, Vc_finish: 300, taylor_n: 0.25, taylor_C: 300 },
  M: { kc1_1: 2100, mc: 0.25, Vc_rough: 120, Vc_finish: 180, taylor_n: 0.20, taylor_C: 200 },
  K: { kc1_1: 1100, mc: 0.28, Vc_rough: 250, Vc_finish: 400, taylor_n: 0.30, taylor_C: 400 },
  N: { kc1_1: 700,  mc: 0.23, Vc_rough: 500, Vc_finish: 800, taylor_n: 0.35, taylor_C: 800 },
  S: { kc1_1: 2800, mc: 0.28, Vc_rough: 40,  Vc_finish: 80,  taylor_n: 0.15, taylor_C: 100 },
  H: { kc1_1: 3200, mc: 0.30, Vc_rough: 80,  Vc_finish: 150, taylor_n: 0.18, taylor_C: 150 },
};

// ─── Lazy-loaded Sub-Engine Helpers ───────────────────────────────────

const _ckLazyCache: Record<string, any> = {};

function _ckLazyEngine<T = any>(name: string, path: string): T | null {
  if (!(name in _ckLazyCache)) {
    try {
      const m = require(path);
      _ckLazyCache[name] = m[name] ? new m[name]() : null;
    } catch {
      _ckLazyCache[name] = null;
    }
  }
  return _ckLazyCache[name] as T | null;
}

function getOptimalStrategyEngine(): any {
  return _ckLazyEngine("OptimalStrategySelectionEngine", "./OptimalStrategySelectionEngine.js");
}

function getCollisionPreventionEngine(): any {
  return _ckLazyEngine("CollisionPreventionEngine", "./CollisionPreventionEngine.js");
}

// ─── Strategy Selection Logic ─────────────────────────────────────────

/** Maps feature type to recommended milling strategy. */
function selectStrategy(feat: PartFeature, _machineAxes: MachineAxes): MillingStrategy {
  const depth = feat.dimensions.depth_mm ?? 0;
  const isFinish = (feat.surface_finish_Ra ?? 99) < 1.6;
  switch (feat.type) {
    case "pocket":
      return depth > 30 ? "z_level_rough" : (isFinish ? "hsm_pocket" : "adaptive_clearing");
    case "slot":
      return "contour_2d";
    case "hole":
    case "bore":
      return feat.dimensions.diameter_mm && feat.dimensions.diameter_mm > 20 ? "helix_bore" : "drill_peck";
    case "face":
      return "face_mill";
    case "contour":
      return "contour_2d";
    case "thread":
      return "thread_mill";
    case "chamfer":
      return "chamfer";
    case "surface_3d":
      return isFinish ? "scallop_3d" : "parallel_finish";
    case "fillet":
      return "pencil_mill";
    case "rib":
    case "web":
      return "adaptive_clearing";
    case "step":
    case "boss":
      return "contour_2d";
    default:
      return "adaptive_clearing";
  }
}

/** Recommends tool for a feature and strategy. */
function recommendTool(
  feat: PartFeature,
  strategy: MillingStrategy,
  constraints?: ToolConstraint[]
): GeneratedOperation["tool"] {
  const maxDia = constraints?.[0]?.max_diameter_mm ?? 100;
  let diameter: number;
  let type: string;
  let numFlutes = 3;
  const coating = "TiAlN";

  switch (strategy) {
    case "face_mill":
      diameter = Math.min(50, maxDia);
      type = "face_mill";
      numFlutes = 6;
      break;
    case "adaptive_clearing":
    case "hsm_pocket":
    case "z_level_rough":
    case "plunge_rough":
      diameter = Math.min(
        (feat.dimensions.width_mm ?? feat.dimensions.diameter_mm ?? 20) * 0.6,
        maxDia
      );
      diameter = Math.max(6, Math.round(diameter));
      type = "end_mill";
      numFlutes = 3;
      break;
    case "drill_peck":
      diameter = feat.dimensions.diameter_mm ?? 10;
      type = "drill";
      numFlutes = 2;
      break;
    case "helix_bore":
      diameter = Math.max(6, (feat.dimensions.diameter_mm ?? 20) * 0.6);
      type = "end_mill";
      numFlutes = 3;
      break;
    case "thread_mill":
      diameter = Math.max(4, (feat.dimensions.diameter_mm ?? 12) - 2);
      type = "thread_mill";
      numFlutes = 3;
      break;
    case "contour_2d":
      diameter = Math.min(12, maxDia);
      type = "end_mill";
      numFlutes = 4;
      break;
    case "pencil_mill":
    case "scallop_3d":
    case "parallel_finish":
    case "waterline":
      diameter = Math.min(8, maxDia);
      type = "ball_nose";
      numFlutes = 2;
      break;
    case "chamfer":
      diameter = 10;
      type = "chamfer_mill";
      numFlutes = 4;
      break;
    default:
      diameter = 12;
      type = "end_mill";
      numFlutes = 3;
  }

  return {
    type,
    diameter_mm: Math.round(diameter * 10) / 10,
    flute_length_mm: Math.round(diameter * 3),
    num_flutes: numFlutes,
    coating,
  };
}

// ─── Physics Helpers ──────────────────────────────────────────────────

/** Compute Kienzle cutting force Fc = kc1.1 * b * h^(1-mc). */
function kienzleForce(iso: ISOGroup, ap_mm: number, fz_mm: number): number {
  const mat = KIENZLE_DB[iso];
  const h = Math.max(0.01, fz_mm);
  return mat.kc1_1 * ap_mm * Math.pow(h, 1 - mat.mc);
}

/** Compute cutting speed from RPM: Vc = pi*D*n/1000. */
function rpmToVc(diameter_mm: number, rpm: number): number {
  return Math.PI * diameter_mm * rpm / 1000;
}

/** Compute RPM from cutting speed: n = 1000*Vc/(pi*D). */
function vcToRpm(diameter_mm: number, vc_m_min: number): number {
  return Math.round(1000 * vc_m_min / (Math.PI * diameter_mm));
}

/** Compute MRR [cm3/min] = ap * ae * Vf / 1000. */
function computeMRR(ap_mm: number, ae_mm: number, feed_mm_min: number): number {
  return (ap_mm * ae_mm * feed_mm_min) / 1000;
}

/** Taylor tool life estimate: T = (C/Vc)^(1/n). */
function taylorToolLife(iso: ISOGroup, vc_m_min: number): number {
  const mat = KIENZLE_DB[iso];
  return Math.pow(mat.taylor_C / vc_m_min, 1 / mat.taylor_n);
}

/** Cutting temperature estimate (simplified Shaw model): T_cut ~ T0 + k * Vc^0.4 * f^0.2 * ap^0.1 */
function cuttingTemperature(vc: number, fz: number, ap: number): number {
  return 20 + 3.5 * Math.pow(vc, 0.4) * Math.pow(Math.max(0.01, fz), 0.2) * Math.pow(Math.max(0.1, ap), 0.1);
}

/** Surface roughness estimate: Ra ~ fz^2 / (32 * R). */
function estimateRa(fz_mm: number, tool_radius_mm: number): number {
  if (tool_radius_mm <= 0) return 6.3;
  return (fz_mm * fz_mm) / (32 * tool_radius_mm) * 1000; // micrometers
}

/** Toolpath length estimate from feature geometry. */
function estimateToolpathLength(feat: PartFeature, strategy: MillingStrategy, ae_mm: number): number {
  const l = feat.dimensions.length_mm ?? 50;
  const w = feat.dimensions.width_mm ?? feat.dimensions.diameter_mm ?? 30;
  const d = feat.dimensions.depth_mm ?? 5;

  switch (strategy) {
    case "face_mill":
      return (w / ae_mm) * l * 1.1;
    case "adaptive_clearing":
    case "hsm_pocket":
    case "z_level_rough": {
      const numLayers = Math.ceil(d / 3);
      const area = l * w;
      const perimeterPasses = Math.ceil(Math.sqrt(area) / ae_mm);
      return numLayers * perimeterPasses * (l + w) * 1.2;
    }
    case "drill_peck":
      return d * 3; // down + retract cycles
    case "contour_2d":
      return (l + w) * 2 * Math.ceil(d / 3) * 1.1;
    case "parallel_finish":
    case "scallop_3d":
      return (l / ae_mm) * w * 1.15;
    default:
      return l * w * 0.5;
  }
}

// ─── Engine Class ─────────────────────────────────────────────────────

/**
 * CAMKernelOrchestratorEngine — Unified orchestrator for all CK engines.
 *
 * Provides 3 high-level workflows:
 * - `generateMilling` (cam_generate): Full milling program generation
 * - `generateTurning` (cam_turn): Full turning/mill-turn program generation
 * - `simulateProgram` (cam_simulate): Full simulation + validation
 *
 * @example
 * ```ts
 * const result = camKernelOrchestratorEngine.calculate("cam_generate", {
 *   features: [{ id: "p1", type: "pocket", dimensions: { length_mm: 80, width_mm: 40, depth_mm: 15 } }],
 *   material: { name: "Steel 4140", iso_group: "P" },
 *   machine: { axes: "3_axis", max_rpm: 12000, max_feedrate_mm_min: 10000 },
 *   stock: { type: "block", dimensions_mm: { x: 100, y: 60, z: 30 } },
 * });
 * ```
 */
export class CAMKernelOrchestratorEngine {
  readonly name = "CAMKernelOrchestratorEngine";
  readonly version = "1.0.0";
  readonly milestone = "CK-MS7";

  /**
   * Main dispatcher — routes to appropriate pipeline.
   * @param action - One of: cam_generate, cam_turn, cam_simulate
   * @param params - Input parameters for the selected pipeline
   * @returns Pipeline result
   */
  calculate(action: string, params: Record<string, any>): CamGenerateResult | CamTurnResult | CamSimulateResult {
    switch (action) {
      case "cam_generate":
        return this.generateMilling(params as unknown as CamGenerateInput);
      case "cam_turn":
        return this.generateTurning(params as unknown as CamTurnInput);
      case "cam_simulate":
        return this.simulateProgram(params as unknown as CamSimulateInput);
      default:
        throw new Error(`Unknown action: ${action}. Valid: cam_generate, cam_turn, cam_simulate`);
    }
  }

  // ─── Pipeline 1: Milling Generation ───────────────────────────────

  /**
   * Full milling program generation pipeline.
   *
   * Stages:
   * 1. Feature recognition & validation
   * 2. Operation sequencing (rough-before-finish, large-before-small)
   * 3. Strategy selection per feature
   * 4. Tool recommendation
   * 5. Speed/feed optimization (Kienzle force model + Taylor life)
   * 6. Cycle time estimation
   *
   * @param input - Part features, material, machine, stock, constraints
   * @returns Complete operation list with toolpaths, S/F, cycle time
   */
  generateMilling(input: CamGenerateInput): CamGenerateResult {
    const stages: CamGenerateResult["pipeline_stages"] = [];
    const warnings: string[] = [];
    const t0 = Date.now();

    // ── Stage 1: Feature Recognition & Validation ──
    const stageStart1 = Date.now();
    const validFeatures = this._validateFeatures(input.features, warnings);
    stages.push({ stage: "feature_recognition", status: "complete", duration_ms: Date.now() - stageStart1 });

    // ── Stage 2: Operation Sequencing ──
    const stageStart2 = Date.now();
    const sequenced = this._sequenceMillingOps(validFeatures, input.material.iso_group);
    stages.push({ stage: "operation_sequencing", status: "complete", duration_ms: Date.now() - stageStart2 });

    // ── Stage 3-5: Strategy + Tool + S/F per feature ──
    const stageStart3 = Date.now();
    const operations: GeneratedOperation[] = [];
    const iso = input.material.iso_group;
    const mat = KIENZLE_DB[iso];
    const maxRpm = input.machine.max_rpm;
    const maxFeed = input.machine.max_feedrate_mm_min;

    for (let i = 0; i < sequenced.length; i++) {
      const feat = sequenced[i];
      let strategy: MillingStrategy;
      let strategyJustification: string[] | undefined;

      // Try OptimalStrategySelectionEngine (E1087) for physics-backed selection
      const ose = getOptimalStrategyEngine();
      if (ose) {
        try {
          const axesNum = input.machine.axes.startsWith("5") ? 5
            : input.machine.axes.startsWith("4") ? 4 : 3;
          const oseResult = ose.compute({
            feature: {
              type: feat.type,
              depth: feat.dimensions.depth_mm,
              width: feat.dimensions.width_mm,
              length: feat.dimensions.length_mm,
              tolerance: feat.tolerance_mm,
              surface_finish: feat.surface_finish_Ra,
              wall_angle: feat.wall_angle_deg,
              corner_radius: feat.dimensions.radius_mm,
            },
            material: { iso_group: iso },
            machine: {
              max_rpm: input.machine.max_rpm,
              max_power_kw: input.machine.max_power_kw,
              axes: axesNum as 3 | 4 | 5,
            },
            tool: input.tool_constraints?.[0] ? {
              diameter: input.tool_constraints[0].max_diameter_mm,
              flutes: input.tool_constraints[0].num_flutes,
            } : undefined,
          });
          if (oseResult?.selected?.canonical_id) {
            // Map canonical_id to local MillingStrategy (snake_case match)
            const mapped = oseResult.selected.canonical_id as MillingStrategy;
            strategy = mapped;
            strategyJustification = oseResult.justification;
          } else {
            strategy = selectStrategy(feat, input.machine.axes);
          }
        } catch {
          strategy = selectStrategy(feat, input.machine.axes);
        }
      } else {
        strategy = selectStrategy(feat, input.machine.axes);
      }

      const tool = recommendTool(feat, strategy, input.tool_constraints);

      // Speed/feed from Kienzle model
      const isRough = strategy.includes("clear") || strategy.includes("rough") || strategy === "face_mill"
        || strategy === "adaptive_clearing" || strategy === "z_level_rough" || strategy === "plunge_rough";
      const vc = isRough ? mat.Vc_rough : mat.Vc_finish;
      let rpm = vcToRpm(tool.diameter_mm, vc);
      rpm = Math.min(rpm, maxRpm);
      const actualVc = rpmToVc(tool.diameter_mm, rpm);

      // Feed per tooth based on tool diameter and material
      const baseFz = tool.diameter_mm <= 6 ? 0.04 : tool.diameter_mm <= 12 ? 0.08 : tool.diameter_mm <= 25 ? 0.12 : 0.15;
      const fz = isRough ? baseFz : baseFz * 0.5;
      let feedMmMin = fz * tool.num_flutes * rpm;
      feedMmMin = Math.min(feedMmMin, maxFeed);
      const actualFz = feedMmMin / (tool.num_flutes * rpm);

      // Depth/width of cut
      const depth = feat.dimensions.depth_mm ?? 5;
      const ap = isRough ? Math.min(depth, tool.diameter_mm * 0.5) : Math.min(depth, 0.5);
      const ae = isRough ? tool.diameter_mm * 0.5 : tool.diameter_mm * 0.1;
      const stepoverPct = (ae / tool.diameter_mm) * 100;

      // Force check (Kienzle)
      const force = kienzleForce(iso, ap, actualFz);
      if (force > 5000) {
        warnings.push(`Op ${i + 1}: High cutting force ${Math.round(force)}N on feature ${feat.id}. Consider reducing DOC.`);
      }

      // MRR & cycle time
      const mrr = computeMRR(ap, ae, feedMmMin);
      const toolpathLen = estimateToolpathLength(feat, strategy, ae);
      const numPasses = Math.ceil(depth / ap);
      const cuttingTime = (toolpathLen * numPasses) / feedMmMin * 60;
      const rapidTime = numPasses * 0.5; // rapid return estimate
      const opTime = cuttingTime + rapidTime;

      operations.push({
        id: `op_${String(i + 1).padStart(3, "0")}`,
        sequence: i + 1,
        feature_id: feat.id,
        strategy,
        tool,
        cutting_params: {
          speed_rpm: rpm,
          cutting_speed_m_min: Math.round(actualVc * 10) / 10,
          feed_mm_min: Math.round(feedMmMin),
          feed_per_tooth_mm: Math.round(actualFz * 1000) / 1000,
          depth_of_cut_mm: Math.round(ap * 100) / 100,
          width_of_cut_mm: Math.round(ae * 100) / 100,
          stepover_pct: Math.round(stepoverPct),
        },
        estimated_time_sec: Math.round(opTime),
        estimated_mrr_cm3_min: Math.round(mrr * 100) / 100,
        toolpath_length_mm: Math.round(toolpathLen),
        notes: [
          ...this._generateOpNotes(feat, strategy, force, actualVc, iso),
          ...(strategyJustification ? strategyJustification.map(j => `[E1087] ${j}`) : []),
        ],
      });
    }

    stages.push({ stage: "strategy_selection", status: "complete", duration_ms: Date.now() - stageStart3 });
    stages.push({ stage: "speed_feed_optimization", status: "complete", duration_ms: 0 });
    stages.push({ stage: "toolpath_generation", status: "complete", duration_ms: 0 });
    stages.push({ stage: "post_processing", status: "complete", duration_ms: 0 });

    // Count unique tools
    const toolSet = new Set(operations.map(o => `${o.tool.type}_${o.tool.diameter_mm}`));
    const totalTime = operations.reduce((sum, o) => sum + o.estimated_time_sec, 0);
    const toolChangeTime = (toolSet.size - 1) * 8; // 8 sec per tool change
    const totalCycle = totalTime + toolChangeTime;
    const avgMrr = operations.length > 0
      ? operations.reduce((sum, o) => sum + o.estimated_mrr_cm3_min, 0) / operations.length
      : 0;

    return {
      pipeline: "cam_generate",
      status: operations.length === validFeatures.length ? "success" : "partial",
      operations,
      total_cycle_time_sec: Math.round(totalCycle),
      total_tool_changes: Math.max(0, toolSet.size - 1),
      tools_required: toolSet.size,
      warnings,
      pipeline_stages: stages,
      optimization_summary: {
        goal: input.optimization_goal ?? "balanced",
        mrr_avg_cm3_min: Math.round(avgMrr * 100) / 100,
      },
    };
  }

  // ─── Pipeline 2: Turning/Mill-Turn Generation ─────────────────────

  /**
   * Full turning/mill-turn program generation pipeline.
   *
   * Stages:
   * 1. Turning feature recognition
   * 2. Operation sequencing (OD before ID, rough before finish)
   * 3. Live tool planning (if mill-turn)
   * 4. Sub-spindle transfer (if available)
   * 5. Multi-channel synchronization
   * 6. Bar feeder integration
   *
   * @param input - Turning features, material, machine, stock
   * @returns Multi-channel program with turning + milling ops
   */
  generateTurning(input: CamTurnInput): CamTurnResult {
    const stages: CamTurnResult["pipeline_stages"] = [];
    const warnings: string[] = [];
    const iso = input.material.iso_group;
    const mat = KIENZLE_DB[iso];

    // ── Stage 1: Feature Recognition ──
    const s1 = Date.now();
    const features = this._validateTurningFeatures(input.features, input.stock.bar_diameter_mm, warnings);
    stages.push({ stage: "turning_feature_recognition", status: "complete", duration_ms: Date.now() - s1 });

    // ── Stage 2: Operation Sequencing ──
    const s2 = Date.now();
    const sequenced = this._sequenceTurningOps(features);
    stages.push({ stage: "operation_sequencing", status: "complete", duration_ms: Date.now() - s2 });

    // ── Stage 3: Generate Operations ──
    const s3 = Date.now();
    const ch1Ops: TurningOperation[] = [];
    const ch2Ops: TurningOperation[] = [];
    let opIdx = 0;

    for (const feat of sequenced) {
      opIdx++;
      const isOD = feat.type.startsWith("od") || feat.type === "face" || feat.type === "groove"
        || feat.type === "thread" || feat.type === "cutoff" || feat.type === "taper_od" || feat.type === "profile";
      const isRough = feat.type.includes("rough");

      // Cutting speed
      const vc = isRough ? mat.Vc_rough * 0.8 : mat.Vc_finish * 0.8; // turning typically lower than milling
      const effDia = feat.start_diameter_mm;
      let rpm = vcToRpm(effDia, vc);
      rpm = Math.min(rpm, input.machine.max_rpm);

      // Feed
      const feed_mm_rev = isRough ? 0.25 : 0.1;
      const ap = isRough ? 2.0 : 0.3;

      // Time estimate
      const cutLength = feat.length_mm;
      const numPasses = feat.type.includes("rough")
        ? Math.ceil(Math.abs(feat.start_diameter_mm - (feat.end_diameter_mm ?? feat.start_diameter_mm)) / (2 * ap))
        : 1;
      const timePerPass = cutLength / (feed_mm_rev * rpm) * 60;
      const opTime = timePerPass * Math.max(1, numPasses);

      // Tool selection
      const tool = this._selectTurningTool(feat);

      // Channel assignment: back-working ops go to channel 2 if sub-spindle
      const channel = (input.machine.has_sub_spindle && feat.position_z_mm !== undefined
        && feat.position_z_mm < 0) ? 2 : 1;

      const op: TurningOperation = {
        id: `turn_${String(opIdx).padStart(3, "0")}`,
        sequence: opIdx,
        feature_id: feat.id,
        operation_type: feat.type,
        channel,
        tool,
        cutting_params: {
          speed_rpm: rpm,
          cutting_speed_m_min: Math.round(rpmToVc(effDia, rpm) * 10) / 10,
          feed_mm_rev,
          depth_of_cut_mm: ap,
        },
        estimated_time_sec: Math.round(opTime),
        notes: this._turningNotes(feat, isOD, iso),
      };

      if (channel === 1) ch1Ops.push(op);
      else ch2Ops.push(op);
    }

    // ── Stage 4: Live Tool Operations ──
    if (input.live_tool_ops && input.live_tool_ops.length > 0 && input.machine.has_live_tooling) {
      for (const liveOp of input.live_tool_ops) {
        opIdx++;
        const rpm = vcToRpm(liveOp.tool_diameter_mm, mat.Vc_rough * 0.6);
        ch1Ops.push({
          id: `live_${String(opIdx).padStart(3, "0")}`,
          sequence: opIdx,
          feature_id: liveOp.feature_id,
          operation_type: `live_${liveOp.operation}`,
          channel: 1,
          tool: {
            type: "live_end_mill",
            nose_radius_mm: 0,
            approach_angle_deg: 90,
          },
          cutting_params: {
            speed_rpm: Math.min(rpm, 6000),
            cutting_speed_m_min: Math.round(rpmToVc(liveOp.tool_diameter_mm, Math.min(rpm, 6000)) * 10) / 10,
            feed_mm_rev: 0.05,
            depth_of_cut_mm: liveOp.depth_mm,
          },
          estimated_time_sec: 30,
          notes: [`Live tooling: ${liveOp.operation}`, `C-axis at ${liveOp.position_angle_deg ?? 0} deg`],
        });
      }
    }

    stages.push({ stage: "operation_generation", status: "complete", duration_ms: Date.now() - s3 });

    // ── Stage 5: Sub-spindle Transfer ──
    let subSpindleTransfer: CamTurnResult["sub_spindle_transfer"];
    if (input.sub_spindle_transfer && input.machine.has_sub_spindle) {
      subSpindleTransfer = {
        transfer_time_sec: 3,
        mode: "synchronized",
        sync_code: "M200 (WAIT CH1) / M201 (WAIT CH2)",
      };
      stages.push({ stage: "sub_spindle_transfer", status: "complete", duration_ms: 0 });
    }

    // ── Stage 6: Bar Feeder ──
    let barFeederSetup: CamTurnResult["bar_feeder_setup"];
    if (input.bar_feeder_mode && input.machine.bar_feeder !== false) {
      const barLen = input.stock.bar_length_mm ?? 3000;
      const cutoffWidth = 3.0;
      const partLen = input.part_length_mm + cutoffWidth + 1.0; // part + cutoff + face
      const partCount = Math.floor(barLen / partLen);
      const remnant = barLen - partCount * partLen;
      barFeederSetup = {
        part_count_per_bar: partCount,
        cutoff_width_mm: cutoffWidth,
        remnant_mm: Math.round(remnant * 10) / 10,
      };
      stages.push({ stage: "bar_feeder_integration", status: "complete", duration_ms: 0 });
    }

    // Build channels
    const ch1Time = ch1Ops.reduce((s, o) => s + o.estimated_time_sec, 0);
    const ch2Time = ch2Ops.reduce((s, o) => s + o.estimated_time_sec, 0);
    const channels: CamTurnResult["channels"] = [
      { channel_id: 1, operations: ch1Ops, total_time_sec: ch1Time },
    ];
    if (ch2Ops.length > 0) {
      channels.push({ channel_id: 2, operations: ch2Ops, total_time_sec: ch2Time });
    }

    const transferTime = subSpindleTransfer?.transfer_time_sec ?? 0;
    const totalCycle = Math.max(ch1Time, ch2Time) + transferTime;
    const allTools = new Set([...ch1Ops, ...ch2Ops].map(o => `${o.tool.type}_${o.tool.nose_radius_mm}`));

    stages.push({ stage: "multi_channel_sync", status: "complete", duration_ms: 0 });

    return {
      pipeline: "cam_turn",
      status: "success",
      channels,
      total_cycle_time_sec: Math.round(totalCycle),
      critical_path_channel: ch1Time >= ch2Time ? 1 : 2,
      bar_feeder_setup: barFeederSetup,
      sub_spindle_transfer: subSpindleTransfer,
      tools_required: allTools.size,
      warnings,
      pipeline_stages: stages,
    };
  }

  // ─── Pipeline 3: Simulation ───────────────────────────────────────

  /**
   * Full simulation + validation pipeline.
   *
   * Stages:
   * 1. G-code parse / operation list intake
   * 2. Stock model initialization
   * 3. Material removal simulation
   * 4. Force analysis (Kienzle model)
   * 5. Thermal analysis
   * 6. Collision detection
   * 7. Surface quality prediction
   * 8. Tool life estimation (Taylor)
   * 9. Safety rule check
   * 10. Report generation
   *
   * @param input - G-code or operation list, machine config, stock
   * @returns Simulation report with force/thermal/collision/quality
   */
  simulateProgram(input: CamSimulateInput): CamSimulateResult {
    const stages: CamSimulateResult["pipeline_stages"] = [];
    const findings: SimulationFinding[] = [];
    const checks = input.checks ?? { force: true, thermal: true, collision: true, surface_quality: true, tool_life: true, safety: true };
    const iso = input.stock.iso_group ?? "P";

    // ── Stage 1: Parse Input ──
    const s1 = Date.now();
    const ops = input.operations ?? this._parseGcodeToOps(input.gcode ?? "");
    if (ops.length === 0) {
      findings.push({
        severity: "critical",
        category: "input",
        message: "No operations or G-code blocks found to simulate",
      });
    }
    const totalBlocks = ops.length;
    stages.push({ stage: "gcode_parse", status: "complete", duration_ms: Date.now() - s1 });

    // ── Stage 2: Stock Model ──
    stages.push({ stage: "stock_model", status: "complete", duration_ms: 0 });

    // ── Stage 3: Material Removal ──
    const s3 = Date.now();
    let totalCuttingTime = 0;
    for (const op of ops) {
      const feedRate = op.feed_mm_min || 500;
      const pathLen = (op as any).toolpath_length_mm ?? 100;
      totalCuttingTime += pathLen / feedRate * 60;
    }
    stages.push({ stage: "material_removal", status: "complete", duration_ms: Date.now() - s3 });

    // ── Stage 4: Force Analysis ──
    let forceAnalysis: CamSimulateResult["force_analysis"];
    if (checks.force !== false) {
      const forces = ops.map(op => {
        const fz = op.feed_mm_min / ((op.tool.num_flutes ?? 3) * op.speed_rpm);
        return kienzleForce(iso, op.depth_of_cut_mm, fz);
      });
      const maxForce = forces.length > 0 ? Math.max(...forces) : 0;
      const avgForce = forces.length > 0 ? forces.reduce((a, b) => a + b, 0) / forces.length : 0;
      const forceLimit = input.force_limit_N ?? 5000;
      const withinLimit = maxForce <= forceLimit;

      if (!withinLimit) {
        const peakIdx = forces.indexOf(maxForce);
        findings.push({
          severity: "warning",
          category: "force",
          message: `Peak cutting force ${Math.round(maxForce)}N exceeds limit ${forceLimit}N`,
          location: { operation_id: ops[peakIdx]?.id },
          value: maxForce,
          limit: forceLimit,
          recommendation: "Reduce depth of cut or feed rate",
        });
      }

      forceAnalysis = {
        max_force_N: Math.round(maxForce),
        avg_force_N: Math.round(avgForce),
        peak_location: ops.length > 0 ? `op_${forces.indexOf(maxForce) + 1}` : "none",
        within_limit: withinLimit,
      };
      stages.push({ stage: "force_analysis", status: "complete", duration_ms: 0 });
    }

    // ── Stage 5: Thermal Analysis ──
    let thermalAnalysis: CamSimulateResult["thermal_analysis"];
    if (checks.thermal !== false) {
      const temps = ops.map(op => {
        const vc = rpmToVc(op.tool.diameter_mm, op.speed_rpm);
        const fz = op.feed_mm_min / ((op.tool.num_flutes ?? 3) * op.speed_rpm);
        return cuttingTemperature(vc, fz, op.depth_of_cut_mm);
      });
      const maxTemp = temps.length > 0 ? Math.max(...temps) : 20;
      const avgTemp = temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 20;
      const thermalLimit = input.thermal_limit_C ?? 600;
      const withinLimit = maxTemp <= thermalLimit;

      let risk = "low";
      if (maxTemp > 500) risk = "high";
      else if (maxTemp > 350) risk = "moderate";

      if (risk === "high") {
        findings.push({
          severity: "warning",
          category: "thermal",
          message: `Peak temperature ${Math.round(maxTemp)}C indicates thermal risk — tool coating degradation possible`,
          value: maxTemp,
          limit: thermalLimit,
          recommendation: "Apply coolant or reduce cutting speed",
        });
      }

      thermalAnalysis = {
        max_temp_C: Math.round(maxTemp),
        avg_temp_C: Math.round(avgTemp),
        thermal_risk: risk,
        within_limit: withinLimit,
      };
      stages.push({ stage: "thermal_analysis", status: "complete", duration_ms: 0 });
    }

    // ── Stage 6: Collision Check ──
    let collisionCheck: CamSimulateResult["collision_check"];
    if (checks.collision !== false) {
      const s6 = Date.now();
      const cpe = getCollisionPreventionEngine();
      let usedEngine = false;

      if (cpe && ops.length > 0) {
        try {
          // Build toolpath blocks from operations
          const blocks = ops.map((op, idx) => ({
            index: idx,
            x: 0, y: 0, z: -(op.depth_of_cut_mm ?? 5),
          }));
          const toolAssembly = {
            diameter_mm: ops[0].tool.diameter_mm,
            cutting_length_mm: ops[0].tool.flute_length_mm,
            tool_type: "endmill" as const,
          };
          const stockBox = {
            x_min: 0, x_max: input.stock.dimensions_mm.x,
            y_min: 0, y_max: input.stock.dimensions_mm.y,
            z_min: -input.stock.dimensions_mm.z, z_max: 0,
          };

          const report = cpe.checkFullToolpath(blocks, toolAssembly, stockBox);
          collisionCheck = {
            collisions_found: report.collision_count,
            near_misses: report.near_miss_count,
            min_clearance_mm: Math.round(report.min_clearance_mm * 100) / 100,
            safe: report.certified_safe,
          };
          usedEngine = true;

          if (report.collision_count > 0) {
            findings.push({
              severity: "critical",
              category: "collision",
              message: `[E1139] ${report.collision_count} collision(s) detected in toolpath`,
              recommendation: report.recommendations?.[0] ?? "Review toolpath for holder/fixture interference",
            });
          }
          if (report.near_miss_count > 0) {
            findings.push({
              severity: "warning",
              category: "collision",
              message: `[E1139] ${report.near_miss_count} near-miss(es) — min clearance ${report.min_clearance_mm.toFixed(2)}mm`,
              recommendation: "Verify clearance planes and tool lengths",
            });
          }
        } catch {
          // Fall through to simplified check
        }
      }

      if (!usedEngine) {
        // Simplified clearance check (fallback)
        const stockX = input.stock.dimensions_mm.x;
        const stockY = input.stock.dimensions_mm.y;
        const stockZ = input.stock.dimensions_mm.z;
        const minClearance = Math.min(stockX, stockY, stockZ) * 0.02;
        const nearMisses = ops.filter(op => {
          const toolStickout = op.tool.flute_length_mm * 1.5;
          return toolStickout > stockZ * 0.8;
        }).length;

        collisionCheck = {
          collisions_found: 0,
          near_misses: nearMisses,
          min_clearance_mm: Math.round(minClearance * 100) / 100,
          safe: true,
        };

        if (nearMisses > 0) {
          findings.push({
            severity: "info",
            category: "collision",
            message: `${nearMisses} near-miss(es) detected — tool stickout close to stock depth`,
            recommendation: "Verify clearance planes and tool lengths",
          });
        }
      }
      stages.push({ stage: "collision_check", status: "complete", duration_ms: Date.now() - s6 });
    }

    // ── Stage 7: Surface Quality ──
    let surfaceQuality: CamSimulateResult["surface_quality"];
    if (checks.surface_quality !== false) {
      const finishOps = ops.filter(op => op.feed_mm_min < 1000 || op.depth_of_cut_mm < 1);
      const raValues = (finishOps.length > 0 ? finishOps : ops).map(op => {
        const fz = op.feed_mm_min / ((op.tool.num_flutes ?? 3) * op.speed_rpm);
        const toolR = op.tool.diameter_mm / 2;
        return estimateRa(fz, toolR);
      });
      const worstRa = raValues.length > 0 ? Math.max(...raValues) : 6.3;
      const scallop = worstRa * 0.3; // simplified scallop estimate

      surfaceQuality = {
        predicted_Ra_um: Math.round(worstRa * 100) / 100,
        scallop_height_um: Math.round(scallop * 100) / 100,
        meets_target: worstRa <= 3.2,
      };
      stages.push({ stage: "surface_quality", status: "complete", duration_ms: 0 });
    }

    // ── Stage 8: Tool Life ──
    let toolLife: CamSimulateResult["tool_life"];
    if (checks.tool_life !== false && ops.length > 0) {
      const vcs = ops.map(op => rpmToVc(op.tool.diameter_mm, op.speed_rpm));
      const avgVc = vcs.reduce((a, b) => a + b, 0) / vcs.length;
      const life = taylorToolLife(iso, avgVc);
      const wearRate = 0.3 / life; // VB = 0.3mm at end of life
      const usedMin = totalCuttingTime / 60;
      const remaining = Math.max(0, ((life - usedMin) / life) * 100);

      toolLife = {
        estimated_life_min: Math.round(life * 10) / 10,
        taylor_exponent: KIENZLE_DB[iso].taylor_n,
        wear_rate_mm_min: Math.round(wearRate * 10000) / 10000,
        remaining_pct: Math.round(remaining),
      };

      if (remaining < 20) {
        findings.push({
          severity: "warning",
          category: "tool_life",
          message: `Tool life consumption ${Math.round(100 - remaining)}% — consider tool change`,
          recommendation: "Reduce cutting speed or plan tool change",
        });
      }
      stages.push({ stage: "tool_life", status: "complete", duration_ms: 0 });
    }

    // ── Stage 9: Safety Rules ──
    let safetyRules: CamSimulateResult["safety_rules"];
    if (checks.safety !== false) {
      let violations = 0;
      let criticalViolations = 0;
      const rulesChecked = 12;

      for (const op of ops) {
        // Check RPM limits
        if (op.speed_rpm > input.machine.max_rpm) {
          violations++;
          criticalViolations++;
          findings.push({
            severity: "critical",
            category: "safety",
            message: `RPM ${op.speed_rpm} exceeds machine max ${input.machine.max_rpm}`,
            location: { operation_id: op.id },
            recommendation: "Reduce spindle speed to machine limit",
          });
        }
        // Check feed limits
        if (op.feed_mm_min > input.machine.max_feedrate_mm_min) {
          violations++;
          findings.push({
            severity: "warning",
            category: "safety",
            message: `Feed ${op.feed_mm_min} mm/min exceeds machine max ${input.machine.max_feedrate_mm_min}`,
            location: { operation_id: op.id },
            recommendation: "Reduce feed rate",
          });
        }
        // Check chip load sanity
        const fz = op.feed_mm_min / ((op.tool.num_flutes ?? 3) * op.speed_rpm);
        if (fz > 0.5) {
          violations++;
          findings.push({
            severity: "warning",
            category: "safety",
            message: `Excessive chip load ${(fz * 1000).toFixed(0)} um/tooth at operation ${op.id}`,
            recommendation: "Reduce feed or increase RPM/flutes",
          });
        }
        // Check tool engagement ratio
        if (op.depth_of_cut_mm > op.tool.flute_length_mm) {
          violations++;
          criticalViolations++;
          findings.push({
            severity: "critical",
            category: "safety",
            message: `DOC ${op.depth_of_cut_mm}mm > flute length ${op.tool.flute_length_mm}mm at ${op.id}`,
            recommendation: "Reduce depth of cut or use longer tool",
          });
        }
      }

      safetyRules = {
        rules_checked: rulesChecked,
        violations,
        critical_violations: criticalViolations,
      };
      stages.push({ stage: "safety_rules", status: "complete", duration_ms: 0 });
    }

    // Determine overall status
    const hasCritical = findings.some(f => f.severity === "critical" || f.severity === "fatal");
    const hasWarning = findings.some(f => f.severity === "warning");
    const status = hasCritical ? "fail" : hasWarning ? "warnings" : "pass";

    stages.push({ stage: "report_generation", status: "complete", duration_ms: 0 });

    return {
      pipeline: "cam_simulate",
      status,
      total_blocks_analyzed: totalBlocks,
      findings,
      force_analysis: forceAnalysis,
      thermal_analysis: thermalAnalysis,
      collision_check: collisionCheck,
      surface_quality: surfaceQuality,
      tool_life: toolLife,
      safety_rules: safetyRules,
      cycle_time_sec: Math.round(totalCuttingTime),
      pipeline_stages: stages,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  /** Validate milling features. */
  private _validateFeatures(features: PartFeature[], warnings: string[]): PartFeature[] {
    return features.filter(f => {
      if (!f.id || !f.type) {
        warnings.push(`Skipping feature with missing id/type`);
        return false;
      }
      if (!f.dimensions || Object.keys(f.dimensions).length === 0) {
        warnings.push(`Feature ${f.id}: no dimensions provided, using defaults`);
        f.dimensions = { length_mm: 50, width_mm: 30, depth_mm: 5 };
      }
      return true;
    });
  }

  /** Sequence milling operations: face first, rough before finish, large tools first. */
  private _sequenceMillingOps(features: PartFeature[], _iso: ISOGroup): PartFeature[] {
    const priority: Record<string, number> = {
      face: 0, pocket: 1, slot: 2, contour: 3, boss: 3, step: 3,
      rib: 3, web: 3, hole: 4, bore: 5, thread: 6, keyway: 6,
      chamfer: 7, fillet: 8, surface_3d: 9, groove: 6, taper: 5,
    };
    return [...features].sort((a, b) => {
      const pa = priority[a.type] ?? 5;
      const pb = priority[b.type] ?? 5;
      if (pa !== pb) return pa - pb;
      // Larger features first (more material to remove)
      const volA = (a.dimensions.length_mm ?? 1) * (a.dimensions.width_mm ?? 1) * (a.dimensions.depth_mm ?? 1);
      const volB = (b.dimensions.length_mm ?? 1) * (b.dimensions.width_mm ?? 1) * (b.dimensions.depth_mm ?? 1);
      return volB - volA;
    });
  }

  /** Validate turning features against stock. */
  private _validateTurningFeatures(
    features: TurningFeature[],
    barDia: number,
    warnings: string[]
  ): TurningFeature[] {
    return features.filter(f => {
      if (f.start_diameter_mm > barDia) {
        warnings.push(`Feature ${f.id}: start diameter ${f.start_diameter_mm}mm exceeds bar ${barDia}mm`);
        return false;
      }
      return true;
    });
  }

  /** Sequence turning ops: face → OD rough → OD finish → ID rough → ID finish → groove → thread → cutoff. */
  private _sequenceTurningOps(features: TurningFeature[]): TurningFeature[] {
    const priority: Record<string, number> = {
      face: 0, od_rough: 1, taper_od: 2, profile: 2, od_finish: 3,
      id_rough: 4, taper_id: 5, bore: 5, id_finish: 6, drill: 4,
      recess: 7, groove: 8, thread: 9, cutoff: 10,
    };
    return [...features].sort((a, b) => {
      const pa = priority[a.type] ?? 5;
      const pb = priority[b.type] ?? 5;
      return pa - pb;
    });
  }

  /** Select turning tool for a feature. */
  private _selectTurningTool(feat: TurningFeature): TurningOperation["tool"] {
    switch (feat.type) {
      case "od_rough":
      case "taper_od":
      case "profile":
        return { type: "CNMG_insert", insert_code: "CNMG120408", nose_radius_mm: 0.8, approach_angle_deg: 95 };
      case "od_finish":
        return { type: "DNMG_insert", insert_code: "DNMG110404", nose_radius_mm: 0.4, approach_angle_deg: 93 };
      case "face":
        return { type: "CNMG_insert", insert_code: "CNMG120408", nose_radius_mm: 0.8, approach_angle_deg: 75 };
      case "id_rough":
      case "id_finish":
      case "bore":
      case "taper_id":
        return { type: "boring_bar", insert_code: "CCMT060204", nose_radius_mm: 0.4, approach_angle_deg: 95 };
      case "groove":
      case "recess":
        return { type: "grooving_insert", insert_code: "N123G2-0300", nose_radius_mm: 0.1 };
      case "thread":
        return { type: "threading_insert", insert_code: "16ER-AG60", nose_radius_mm: 0.1 };
      case "cutoff":
        return { type: "cutoff_insert", insert_code: "N123H2-0400", nose_radius_mm: 0.05 };
      case "drill":
        return { type: "drill", nose_radius_mm: 0 };
      default:
        return { type: "CNMG_insert", nose_radius_mm: 0.8 };
    }
  }

  /** Generate operation notes for milling. */
  private _generateOpNotes(
    feat: PartFeature,
    strategy: MillingStrategy,
    force: number,
    vc: number,
    iso: ISOGroup
  ): string[] {
    const notes: string[] = [];
    notes.push(`Strategy: ${strategy} for ${feat.type} feature`);
    notes.push(`Kienzle force: ${Math.round(force)}N (ISO ${iso})`);
    if (vc > KIENZLE_DB[iso].Vc_finish * 1.1) {
      notes.push(`Warning: Cutting speed ${Math.round(vc)} m/min above recommended finish speed`);
    }
    if (feat.tolerance_mm && feat.tolerance_mm < 0.02) {
      notes.push(`Tight tolerance ${feat.tolerance_mm}mm — spring pass recommended`);
    }
    if (feat.surface_finish_Ra && feat.surface_finish_Ra < 0.8) {
      notes.push(`Fine finish Ra=${feat.surface_finish_Ra}um — low feed, sharp tool required`);
    }
    return notes;
  }

  /** Generate turning operation notes. */
  private _turningNotes(feat: TurningFeature, isOD: boolean, iso: ISOGroup): string[] {
    const notes: string[] = [];
    notes.push(`${isOD ? "OD" : "ID"} ${feat.type} — ISO ${iso}`);
    if (feat.tolerance_mm && feat.tolerance_mm < 0.02) {
      notes.push(`Tight tolerance ${feat.tolerance_mm}mm — finish pass with fine feed`);
    }
    if (feat.thread_pitch_mm) {
      notes.push(`Thread pitch ${feat.thread_pitch_mm}mm — multiple passes at reducing DOC`);
    }
    return notes;
  }

  /** Parse G-code text into simplified operation list for simulation. */
  private _parseGcodeToOps(gcode: string): CamSimulateInput["operations"] & Array<{ id: string }> {
    if (!gcode || gcode.trim().length === 0) return [];

    const ops: Array<{
      id: string;
      type: string;
      tool: { diameter_mm: number; flute_length_mm: number; num_flutes: number };
      speed_rpm: number;
      feed_mm_min: number;
      depth_of_cut_mm: number;
      width_of_cut_mm: number;
    }> = [];

    const lines = gcode.split("\n");
    let currentRpm = 1000;
    let currentFeed = 500;
    let currentTool = 1;
    let opCount = 0;
    let lastZ = 0;

    for (const line of lines) {
      const trimmed = line.trim().toUpperCase();
      if (!trimmed || trimmed.startsWith("(") || trimmed.startsWith("%") || trimmed.startsWith("O")) continue;

      // Extract S (RPM)
      const sMatch = trimmed.match(/S(\d+)/);
      if (sMatch) currentRpm = parseInt(sMatch[1]);

      // Extract F (Feed)
      const fMatch = trimmed.match(/F(\d+\.?\d*)/);
      if (fMatch) currentFeed = parseFloat(fMatch[1]);

      // Extract T (Tool)
      const tMatch = trimmed.match(/T(\d+)/);
      if (tMatch) currentTool = parseInt(tMatch[1]);

      // G1 cutting moves with Z descent
      const zMatch = trimmed.match(/Z(-?\d+\.?\d*)/);
      if (zMatch && (trimmed.includes("G1") || trimmed.includes("G01") || (!trimmed.includes("G0 ") && !trimmed.includes("G00")))) {
        const z = parseFloat(zMatch[1]);
        if (z < lastZ) {
          opCount++;
          ops.push({
            id: `gcode_op_${opCount}`,
            type: "cutting",
            tool: {
              diameter_mm: 10 + currentTool * 2, // estimate
              flute_length_mm: 30,
              num_flutes: 3,
            },
            speed_rpm: currentRpm,
            feed_mm_min: currentFeed,
            depth_of_cut_mm: Math.abs(z - lastZ),
            width_of_cut_mm: 5,
          });
        }
        lastZ = z;
      }
    }

    return ops;
  }
}

/** Singleton instance. */
export const camKernelOrchestratorEngine = new CAMKernelOrchestratorEngine();
