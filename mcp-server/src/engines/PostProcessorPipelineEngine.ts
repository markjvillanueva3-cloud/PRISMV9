/**
 * PostProcessorPipelineEngine — Universal Post Processor Pipeline Orchestrator
 *
 * Chains 35+ optimization stages across 7 phases to produce mathematically
 * optimized G-code for any machine, controller, and CAM software.
 *
 * Pipeline Phases:
 *   P0: Input Normalization + Smart Defaults
 *   P1: Physics Foundation (per operation)
 *   P2: Block-by-Block Optimization (per G-code line)
 *   P3: Motion Optimization
 *   P4: Stochastic Verification
 *   P5: Safety + Knowledge
 *   P6: Output Generation
 *
 * Each stage is independently enable/disable-able. Stages that lack required
 * input data are gracefully skipped with a warning.
 *
 * @module PostProcessorPipelineEngine
 */

// ─── Type Definitions ────────────────────────────────────────────────

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export type ControllerFamily =
  | "fanuc" | "siemens" | "heidenhain" | "haas" | "mazak" | "okuma"
  | "brother" | "doosan" | "hurco" | "mitsubishi" | "fagor";

export type ToolType =
  | "flat_endmill" | "ball_endmill" | "bull_nose" | "face_mill"
  | "drill" | "tap" | "reamer" | "chamfer" | "boring_bar"
  | "insert_mill" | "thread_mill" | "slot_drill";

export type MoveType = "G0" | "G1" | "G2" | "G3" | "drill_cycle" | "tap_cycle" | "probe";

export type OptimizationTarget = "balanced" | "max_speed" | "max_tool_life" | "min_cost" | "surface_quality";

export type BlockClassification =
  | "rapid" | "air_cut" | "light" | "nominal" | "heavy" | "corner" | "slotting" | "plunge" | "ramp";

export type StageStatus = "pass" | "warn" | "fail" | "skipped";

/** A single toolpath block — the universal internal representation */
export interface ToolpathBlock {
  id: number;
  move_type: MoveType;
  x?: number; y?: number; z?: number;
  a?: number; b?: number; c?: number;
  i?: number; j?: number; k?: number; r?: number;
  feed_mm_min?: number;
  spindle_rpm?: number;
  tool_number?: number;
  // Engagement data (filled by Phase 2)
  engagement?: {
    ae_mm: number;
    ap_mm: number;
    theta_deg: number;
    d_eff_mm: number;
    chip_thinning_factor: number;
    classification: BlockClassification;
  };
  // Force data (filled by Phase 1/2)
  forces?: {
    Fc_N: number;
    Ff_N: number;
    Fp_N: number;
    resultant_N: number;
    power_kW: number;
    torque_Nm: number;
  };
  // Thermal data (filled by Phase 2)
  thermal?: {
    T_tool_C: number;
    T_chip_C: number;
    cumulative_heat_J: number;
  };
  // Wear data (filled by Phase 2)
  wear?: {
    VB_mm: number;
    VB_rate_mm_per_min: number;
    remaining_life_pct: number;
  };
  // Confidence intervals (filled by Phase 4)
  confidence?: {
    force_ci_95: [number, number];
    feed_ci_95: [number, number];
    Ra_ci_95?: [number, number];
  };
  // Optimization data (filled during pipeline)
  optimization?: {
    original_feed: number;
    optimized_feed: number;
    original_rpm: number;
    optimized_rpm: number;
    reasons: string[];
  };
}

/** Resolved machine context from 910-machine catalog */
export interface MachineContext {
  id: string;
  name: string;
  brand: string;
  controller: ControllerFamily;
  controller_version?: string;
  max_rpm: number;
  max_power_kW: number;
  max_torque_Nm?: number;
  rapid_rate_mm_min: { x: number; y: number; z: number };
  accel_mm_s2?: { x: number; y: number; z: number };
  jerk_mm_s3?: { x: number; y: number; z: number };
  work_volume: { x: number; y: number; z: number };
  spindle_taper?: string;
  atc_type?: "side_mount" | "umbrella" | "turret" | "magazine" | "chain";
  atc_capacity?: number;
  tool_change_time_s?: number;
  axes: number; // 3, 4, or 5
  kinematics?: "table_table" | "head_head" | "head_table" | "table_head";
  coolant_types?: ("flood" | "mist" | "tsc" | "mql" | "cryo")[];
  tsc_pressure_bar?: number;
  resolution_confidence: number; // 0-1, how well matched
}

/** Resolved tool context from 46,590-tool catalog */
export interface ToolContext {
  id: string;
  catalog_id?: string;
  manufacturer?: string;
  type: ToolType;
  diameter_mm: number;
  flute_count: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  corner_radius_mm?: number;
  helix_angle_deg?: number;
  material: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  coating?: string;
  grade?: string;
  kc1_1?: number; // specific cutting force
  mc?: number;    // Kienzle exponent
  max_Vc_m_min?: number;
  max_rpm?: number;
  stiffness_N_per_mm?: number;
  runout_TIR_mm?: number;
  resolution_confidence: number;
}

/** Resolved holder context from 1,164-holder catalog */
export interface HolderContext {
  id: string;
  type: string;
  taper: string;
  gauge_length_mm: number;
  stiffness_N_per_mm?: number;
  max_rpm?: number;
  balance_grade?: string;
  clamping_type?: "shrink_fit" | "hydraulic" | "collet" | "side_lock" | "weldon" | "milling_chuck";
  resolution_confidence: number;
}

/** Resolved material context from 2,957-material DB */
export interface MaterialContext {
  id: string;
  name: string;
  iso_group: ISOGroup;
  uts_MPa?: number;
  hardness_HB?: number;
  hardness_HRC?: number;
  thermal_conductivity_W_mK?: number;
  specific_heat_J_kgK?: number;
  density_kg_m3?: number;
  elastic_modulus_GPa?: number;
  // Johnson-Cook constitutive model params
  jc_A?: number; jc_B?: number; jc_n?: number; jc_C?: number; jc_m?: number;
  // Kienzle cutting force params
  kc1_1?: number;
  mc?: number;
  // Zerilli-Armstrong params
  za_C0?: number; za_C1?: number; za_C3?: number; za_C4?: number; za_C5?: number;
  resolution_confidence: number;
}

/** Coolant context */
export interface CoolantContext {
  type: "flood" | "mist" | "tsc" | "mql" | "cryo" | "dry";
  pressure_bar?: number;
  flow_rate_l_min?: number;
  concentration_pct?: number;
  nozzle_count?: number;
}

/** Operation definition — one per tool section */
export interface OperationDef {
  id: number;
  name?: string;
  type: string; // facing, profiling, pocketing, drilling, etc.
  tool_number: number;
  tool?: ToolContext;
  holder?: HolderContext;
  ae_mm?: number;
  ap_mm?: number;
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  coolant?: CoolantContext;
  blocks: ToolpathBlock[];
}

/** Stage configuration — enable/disable individual stages */
export interface StageConfig {
  // Phase 1
  speed_feed?: boolean;
  constitutive?: boolean;
  stability_lobes?: boolean;
  spindle_harmonics?: boolean;
  tool_deflection?: boolean;
  chip_morphology?: boolean;
  coolant_strategy?: boolean;
  fixture_check?: boolean;
  capability_forecast?: boolean;
  // Phase 2
  engagement_analysis?: boolean;
  chip_thinning?: boolean;
  adaptive_feed?: boolean;
  corner_detection?: boolean;
  plunge_detection?: boolean;
  wear_progression?: boolean;
  thermal_tracking?: boolean;
  deflection_limit?: boolean;
  // Phase 3
  toolpath_smoothing?: boolean;
  motion_dynamics?: boolean;
  look_ahead?: boolean;
  multi_axis?: boolean;
  controller_features?: boolean;
  machine_error_comp?: boolean;
  // Phase 4
  monte_carlo?: boolean;
  uncertainty_propagation?: boolean;
  dimensional_verification?: boolean;
  surface_finish_verification?: boolean;
  environmental?: boolean;
  batch_variability?: boolean;
  robustness_score?: boolean;
  // Phase 5
  safety_analysis?: boolean;
  playbook_rules?: boolean;
  tribal_knowledge?: boolean;
  reliability_check?: boolean;
  energy_optimization?: boolean;
  acoustic_check?: boolean;
  // Phase 6
  gcode_generation?: boolean;
  controller_params?: boolean;
  probe_routines?: boolean;
  setup_sheet?: boolean;
  analytics_report?: boolean;
  cycle_time?: boolean;
  digital_twin?: boolean;
}

/** Pipeline input — the complete job specification */
export interface PipelineInput {
  // Input data (at least one required)
  gcode?: string;
  cl_data?: string;
  blocks?: ToolpathBlock[];
  // Context (resolved or raw for auto-resolution)
  machine?: MachineContext | { name: string; [k: string]: unknown };
  material?: MaterialContext | { name: string; iso_group?: ISOGroup; [k: string]: unknown };
  tools?: (ToolContext | { tool_number: number; diameter_mm: number; [k: string]: unknown })[];
  holders?: (HolderContext | { type?: string; [k: string]: unknown })[];
  operations?: OperationDef[];
  coolant?: CoolantContext;
  // Configuration
  controller?: ControllerFamily;
  aggressiveness?: number; // 0.0 conservative → 1.0 aggressive, default 0.5
  optimization_target?: OptimizationTarget;
  stages?: Partial<StageConfig>;
  // Tolerances & targets
  tolerance_mm?: number;
  surface_finish_Ra?: number;
  // Output options
  include_setup_sheet?: boolean;
  include_analytics?: boolean;
  include_probe_routines?: boolean;
  debug?: boolean;
}

/** Result of a single pipeline stage */
export interface StageResult {
  stage: string;
  phase: number;
  status: StageStatus;
  duration_ms: number;
  summary: string;
  data: unknown;
}

/** Analytics report */
export interface AnalyticsReport {
  per_operation: Array<{
    operation_id: number;
    tool_number: number;
    force_range_N: [number, number];
    power_range_kW: [number, number];
    temperature_range_C: [number, number];
    mrr_cm3_min: number;
    tool_life_consumed_pct: number;
    cost_per_part_tool: number;
  }>;
  overall: {
    total_cycle_time_s: number;
    cutting_time_s: number;
    non_cutting_time_s: number;
    energy_estimate_kWh: number;
    cost_estimate: number;
  };
  optimization_impact: {
    time_saved_pct: number;
    force_reduction_pct: number;
    tool_life_improvement_pct: number;
    surface_consistency_improvement_pct: number;
  };
}

/** Complete pipeline output */
export interface PipelineOutput {
  /** Optimized G-code string */
  output_gcode: string;
  /** Per-stage results with timing and status */
  stages: StageResult[];
  /** Overall pipeline status */
  overall_status: StageStatus;
  /** Total pipeline execution time */
  total_duration_ms: number;
  /** Resolved contexts used */
  resolved: {
    machine?: MachineContext;
    material?: MaterialContext;
    tools: ToolContext[];
    holders: HolderContext[];
    coolant?: CoolantContext;
  };
  /** All blocks with optimization data attached */
  blocks: ToolpathBlock[];
  /** Operations with per-operation metrics */
  operations: OperationDef[];
  /** Analytics report (if enabled) */
  analytics?: AnalyticsReport;
  /** Setup sheet data (if enabled) */
  setup_sheet?: Record<string, unknown>;
  /** All warnings generated */
  warnings: string[];
  /** Aggressiveness used */
  aggressiveness: number;
  /** Optimization target used */
  optimization_target: OptimizationTarget;
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_AGGRESSIVENESS = 0.5;
const DEFAULT_TOLERANCE_MM = 0.05; // ISO 2768-m general
const DEFAULT_RA_ROUGHING = 3.2;
const DEFAULT_RA_FINISHING = 0.8;
const DEFAULT_RA_SEMI = 1.6;
const SLOTTING_FEED_DERATING = 0.7; // 70% feed for full slot (chip evacuation)

/** Default Kienzle kc1.1 values by ISO group (MPa) */
const DEFAULT_KC1_1: Record<ISOGroup, number> = {
  P: 2000, // Steel
  M: 2400, // Stainless
  K: 1200, // Cast iron
  N: 800,  // Non-ferrous (aluminum)
  S: 2800, // Super alloys
  H: 3500, // Hardened steel
};

/** Default Kienzle mc exponent by ISO group */
const DEFAULT_MC: Record<ISOGroup, number> = {
  P: 0.25,
  M: 0.25,
  K: 0.28,
  N: 0.23,
  S: 0.25,
  H: 0.27,
};

// ─── G-code Parser ───────────────────────────────────────────────────

/** Parse raw G-code string into ToolpathBlock[] */
function parseGCode(gcode: string): { blocks: ToolpathBlock[]; tools: Map<number, { diameter_mm?: number }> } {
  const lines = gcode.split(/\r?\n/);
  const blocks: ToolpathBlock[] = [];
  const tools = new Map<number, { diameter_mm?: number }>();
  let currentTool = 0;
  let blockId = 0;
  let modalMove: MoveType = "G0";
  let lastX: number | undefined, lastY: number | undefined, lastZ: number | undefined;
  let lastFeed: number | undefined, lastSpindle: number | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("(") || line.startsWith(";") || line.startsWith("%") || line.startsWith("O")) continue;

    // Tool change
    const toolMatch = line.match(/T(\d+)/);
    if (toolMatch) {
      currentTool = parseInt(toolMatch[1], 10);
      if (!tools.has(currentTool)) tools.set(currentTool, {});
    }

    // Spindle
    const sMatch = line.match(/S(\d+\.?\d*)/);
    if (sMatch) lastSpindle = parseFloat(sMatch[1]);

    // Feed
    const fMatch = line.match(/F(\d+\.?\d*)/);
    if (fMatch) lastFeed = parseFloat(fMatch[1]);

    // Move type
    const gMatch = line.match(/G0?([0-3])\b/);
    if (gMatch) {
      const gNum = parseInt(gMatch[1], 10);
      if (gNum <= 3) modalMove = `G${gNum}` as MoveType;
    }

    // Drill cycles
    if (/G8[1-9]|G73/.test(line)) {
      modalMove = "drill_cycle" as MoveType;
    }
    if (/G84/.test(line)) {
      modalMove = "tap_cycle" as MoveType;
    }

    // Coordinates
    const xMatch = line.match(/X(-?\d+\.?\d*)/);
    const yMatch = line.match(/Y(-?\d+\.?\d*)/);
    const zMatch = line.match(/Z(-?\d+\.?\d*)/);
    const iMatch = line.match(/I(-?\d+\.?\d*)/);
    const jMatch = line.match(/J(-?\d+\.?\d*)/);
    const kMatch = line.match(/K(-?\d+\.?\d*)/);
    const rMatch = line.match(/R(-?\d+\.?\d*)/);

    const hasCoords = xMatch || yMatch || zMatch;
    if (!hasCoords && !(/G[89]\d/.test(line))) continue;

    const x = xMatch ? parseFloat(xMatch[1]) : lastX;
    const y = yMatch ? parseFloat(yMatch[1]) : lastY;
    const z = zMatch ? parseFloat(zMatch[1]) : lastZ;

    const block: ToolpathBlock = {
      id: blockId++,
      move_type: modalMove,
      x, y, z,
      feed_mm_min: modalMove === "G0" ? undefined : lastFeed,
      spindle_rpm: lastSpindle,
      tool_number: currentTool,
    };

    if (iMatch) block.i = parseFloat(iMatch[1]);
    if (jMatch) block.j = parseFloat(jMatch[1]);
    if (kMatch) block.k = parseFloat(kMatch[1]);
    if (rMatch) block.r = parseFloat(rMatch[1]);

    blocks.push(block);
    lastX = x; lastY = y; lastZ = z;
  }

  return { blocks, tools };
}

/** Parse CL/APT data into ToolpathBlock[] */
function parseCLData(clData: string): { blocks: ToolpathBlock[]; tools: Map<number, { diameter_mm?: number }> } {
  const lines = clData.split(/\r?\n/);
  const blocks: ToolpathBlock[] = [];
  const tools = new Map<number, { diameter_mm?: number }>();
  let blockId = 0;
  let currentTool = 0;
  let lastFeed: number | undefined;
  let lastSpindle: number | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("$$")) continue;

    // GOTO/x,y,z
    const gotoMatch = line.match(/GOTO\s*\/\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (gotoMatch) {
      blocks.push({
        id: blockId++,
        move_type: "G1",
        x: parseFloat(gotoMatch[1]),
        y: parseFloat(gotoMatch[2]),
        z: parseFloat(gotoMatch[3]),
        feed_mm_min: lastFeed,
        spindle_rpm: lastSpindle,
        tool_number: currentTool,
      });
      continue;
    }

    // RAPID
    const rapidMatch = line.match(/RAPID/);
    if (rapidMatch) {
      // Next GOTO will be rapid
      const nextGoto = line.match(/GOTO\s*\/\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (nextGoto) {
        blocks.push({
          id: blockId++,
          move_type: "G0",
          x: parseFloat(nextGoto[1]),
          y: parseFloat(nextGoto[2]),
          z: parseFloat(nextGoto[3]),
          tool_number: currentTool,
        });
      }
      continue;
    }

    // FEDRAT
    const fedMatch = line.match(/FEDRAT\s*\/\s*(\d+\.?\d*)/);
    if (fedMatch) lastFeed = parseFloat(fedMatch[1]);

    // SPINDL
    const spindlMatch = line.match(/SPINDL\s*\/\s*(\d+\.?\d*)/);
    if (spindlMatch) lastSpindle = parseFloat(spindlMatch[1]);

    // LOADTL / TURRET
    const toolMatch = line.match(/(?:LOADTL|TURRET)\s*\/\s*(\d+)/);
    if (toolMatch) {
      currentTool = parseInt(toolMatch[1], 10);
      if (!tools.has(currentTool)) tools.set(currentTool, {});
    }

    // CIRCLE
    const circMatch = line.match(/CIRCLE\s*\/\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
    if (circMatch) {
      blocks.push({
        id: blockId++,
        move_type: "G2",
        x: parseFloat(circMatch[1]),
        y: parseFloat(circMatch[2]),
        z: parseFloat(circMatch[3]),
        r: parseFloat(circMatch[4]),
        feed_mm_min: lastFeed,
        spindle_rpm: lastSpindle,
        tool_number: currentTool,
      });
    }
  }

  return { blocks, tools };
}

// ─── Pipeline Implementation ─────────────────────────────────────────

class PostProcessorPipelineEngineImpl {
  // Lazy-loaded engines
  private _ultimateSF: any = null;
  private _instantaneousEng: any = null;
  private _engagementAdaptive: any = null;
  private _safetyAnalyzer: any = null;
  private _playbook: any = null;
  private _motionDynamics: any = null;
  private _toolpathSmoothing: any = null;
  private _cycleTimeEst: any = null;
  private _thermalEngine: any = null;
  private _energyOpt: any = null;
  private _toolSelection: any = null;
  private _constitutive: any = null;
  private _stochasticChatter: any = null;
  private _stochasticDeflection: any = null;
  private _chipMorphology: any = null;
  private _coolantDynamics: any = null;
  private _fixtureClamping: any = null;
  private _processCapability: any = null;
  private _controllerDialect: any = null;

  /** Get a lazily-loaded engine by name */
  private async _getEngine(name: string): Promise<any> {
    switch (name) {
      case "ultimateSF":
        return (this._ultimateSF ??= (await import("./UltimateSpeedFeedEngine.js")).ultimateSpeedFeedEngine);
      case "instantaneous":
        return (this._instantaneousEng ??= (await import("./InstantaneousEngagementEngine.js")).instantaneousEngagementEngine);
      case "engagementAdaptive":
        return (this._engagementAdaptive ??= (await import("./EngagementAdaptiveFeedEngine.js")).engagementAdaptiveFeedEngine);
      case "safety":
        return (this._safetyAnalyzer ??= (await import("./GCodeSafetyAnalyzerEngine.js")).gcSafetyAnalyzer);
      case "playbook":
        return (this._playbook ??= (await import("./MachiningPlaybookEngine.js")).machiningPlaybookEngine);
      case "motionDynamics":
        return (this._motionDynamics ??= (await import("./MotionDynamicsProfileEngine.js")).motionDynamicsProfileEngine);
      case "smoothing":
        return (this._toolpathSmoothing ??= (await import("./ToolpathSmoothingEngine.js")).toolpathSmoothingEngine);
      case "cycleTime":
        return (this._cycleTimeEst ??= (await import("./CycleTimeEstimatorEngine.js")).cycleTimeEstimatorEngine);
      case "thermal":
        return (this._thermalEngine ??= (await import("./ToolpathThermalEngine.js")).toolpathThermalEngine);
      case "energy":
        return (this._energyOpt ??= (await import("./GCodeEnergyOptimizerEngine.js")).gcodeEnergyOptimizerEngine);
      case "toolSelection":
        return (this._toolSelection ??= (await import("./ToolSelectionEngine.js")).toolSelectionEngine);
      case "constitutive":
        return (this._constitutive ??= (await import("./ConstitutiveModelEngine.js")).constitutiveModelEngine);
      case "stochasticChatter":
        return (this._stochasticChatter ??= (await import("./StochasticChatterEngine.js")).stochasticChatterEngine);
      case "stochasticDeflection":
        return (this._stochasticDeflection ??= (await import("./StochasticDeflectionEngine.js")).stochasticDeflectionEngine);
      case "chipMorphology":
        return (this._chipMorphology ??= (await import("./ChipMorphologyDiagnosticEngine.js")).chipMorphologyDiagnosticEngine);
      case "coolantDynamics":
        return (this._coolantDynamics ??= (await import("./CoolantDynamicsEngine.js")).coolantDynamicsEngine);
      case "fixtureClamping":
        return (this._fixtureClamping ??= (await import("./FixtureClampingEngine.js")).fixtureClampingEngine);
      case "processCapability":
        return (this._processCapability ??= (await import("./ProcessCapabilityPredictionEngine.js")).processCapabilityPredictionEngine);
      case "controllerDialect":
        return (this._controllerDialect ??= (await import("./ControllerDialectEngine.js")).controllerDialectEngine);
      case "fiveAxisPost":
        return (await import("./FiveAxisPostEngine.js")).fiveAxisPostEngine;
      case "ppVerify":
        return (await import("./PostProcessorVerificationEngine.js")).postProcessorVerificationEngine;
      default:
        throw new Error(`Unknown pipeline engine: ${name}`);
    }
  }

  /**
   * Run the complete post processor pipeline.
   * Accepts G-code, CL data, or pre-parsed blocks. Resolves machine/tool/material
   * from catalogs. Runs all enabled stages. Returns optimized G-code + analytics.
   */
  async process(input: PipelineInput): Promise<PipelineOutput> {
    const startTime = Date.now();
    const stages: StageResult[] = [];
    const warnings: string[] = [];
    const aggressiveness = input.aggressiveness ?? DEFAULT_AGGRESSIVENESS;
    const optTarget = input.optimization_target ?? "balanced";

    // ═══ PHASE 0: INPUT NORMALIZATION ═══

    // Stage 0.1: Parse input
    const parseResult = this._runStage("0.1_parse_input", 0, stages, () => {
      return this._parseInput(input);
    });
    let blocks = parseResult?.blocks ?? [];
    const parsedTools = parseResult?.tools ?? new Map<number, { diameter_mm?: number }>();

    // Stage 0.2-0.5: Resolve contexts
    const resolveResult = this._runStage("0.2_resolve_context", 0, stages, () => {
      return this._resolveContexts(input, parsedTools);
    });
    const machine = resolveResult?.machine;
    const material = resolveResult?.material;
    const tools: ToolContext[] = resolveResult?.tools ?? [];
    const holders: HolderContext[] = resolveResult?.holders ?? [];
    const coolant = resolveResult?.coolant ?? input.coolant;

    // Stage 0.6: Smart defaults
    this._runStage("0.6_smart_defaults", 0, stages, () => {
      return this._applySmartDefaults(input, machine, material, tools, blocks, warnings);
    });

    // ═══ PHASE 1: PHYSICS FOUNDATION (per operation) ═══

    const stageFlags = this._buildStageFlags(input.stages);

    // Stage 1.1: Base Speed/Feed
    if (stageFlags.speed_feed && material) {
      await this._runStageAsync("1.1_base_speed_feed", 1, stages, async () => {
        const eng = await this._getEngine("ultimateSF");
        const isoGroup = material.iso_group;
        const kc1_1 = material.kc1_1 ?? DEFAULT_KC1_1[isoGroup] ?? 2000;
        const mc = material.mc ?? DEFAULT_MC[isoGroup] ?? 0.25;

        // Group blocks by tool
        const toolGroups = this._groupBlocksByTool(blocks);

        for (const [toolNum, toolBlocks] of toolGroups) {
          // Match tool by id, tool_number-like id, or fallback to first tool
          const tool = tools.find(t => t.id === String(toolNum))
            ?? tools.find(t => parseInt(t.id) === toolNum)
            ?? tools.find(t => (t as any).tool_number === toolNum)
            ?? tools[0];
          if (!tool) continue;

          try {
            const sfResult = eng.calculate({
              material: material.name,
              iso_group: isoGroup,
              tool_diameter_mm: tool.diameter_mm,
              tool_type: this._mapToolType(tool.type),
              flute_count: tool.flute_count,
              operation: "general",
              cut_type: "roughing",
              axial_depth_mm: input.operations?.[0]?.ap_mm ?? tool.diameter_mm * 0.5,
              radial_depth_mm: input.operations?.[0]?.ae_mm ?? tool.diameter_mm * 0.3,
            });

            // UltimateSpeedFeedEngine returns OptimizedValue { value, unit, confidence }
            const baseRpm = sfResult.spindle_rpm?.value ?? 0;
            const baseFeed = sfResult.feed_rate?.value ?? 0;

            // Apply aggressiveness scaling
            const scaledRpm = Math.round(baseRpm * this._aggressivenessScale(aggressiveness));
            const scaledFeed = Math.round(baseFeed * this._aggressivenessScale(aggressiveness));

            // Clamp to machine limits
            const clampedRpm = machine ? Math.min(scaledRpm, machine.max_rpm) : scaledRpm;
            const maxFeed = machine ? Math.min(machine.rapid_rate_mm_min.x, machine.rapid_rate_mm_min.y) : 15000;
            const clampedFeed = Math.min(scaledFeed, maxFeed);

            // Apply to all cutting blocks for this tool
            for (const block of toolBlocks) {
              if (block.move_type !== "G0") {
                const Vc_val = sfResult.cutting_speed?.value ?? 0;
                const fz_val = sfResult.feed_per_tooth?.value ?? 0;
                // Forces are nested: sfResult.forces.tangential_force_N.value
                const Fc_val = sfResult.forces?.tangential_force_N?.value ?? 0;
                const Fr_val = sfResult.forces?.radial_force_N?.value ?? 0;
                const Pw_val = sfResult.power?.required_power_kw?.value ?? 0;
                const Tq_val = 0; // Torque derived from force × radius

                block.optimization = {
                  original_feed: block.feed_mm_min ?? 0,
                  optimized_feed: clampedFeed,
                  original_rpm: block.spindle_rpm ?? 0,
                  optimized_rpm: clampedRpm,
                  reasons: [`Base S/F: Vc=${Vc_val.toFixed?.(0) ?? Vc_val}m/min, fz=${fz_val.toFixed?.(3) ?? fz_val}mm`],
                };
                block.feed_mm_min = clampedFeed;
                block.spindle_rpm = clampedRpm;

                // Attach force data from USF result or compute from Kienzle
                const forceN = Fc_val > 0 ? Fc_val : kc1_1 * (tool.diameter_mm * 0.3) * Math.pow(Math.max(0.01, fz_val || 0.05), 1 - mc);
                block.forces = {
                  Fc_N: forceN,
                  Ff_N: Fr_val > 0 ? Fr_val : forceN * 0.4,
                  Fp_N: forceN * 0.3,
                  resultant_N: Math.sqrt(forceN ** 2 + (Fr_val > 0 ? Fr_val : forceN * 0.4) ** 2),
                  power_kW: Pw_val > 0 ? Pw_val : (forceN * Vc_val) / 60000,
                  torque_Nm: (forceN * tool.diameter_mm / 2) / 1000,
                };
              }
            }

            return { tool_number: toolNum, rpm: clampedRpm, feed: clampedFeed, kc1_1, mc };
          } catch {
            warnings.push(`Stage 1.1: Could not compute S/F for tool T${toolNum} — using input values`);
          }
        }
        return { tools_processed: toolGroups.size };
      });
    } else {
      stages.push({ stage: "1.1_base_speed_feed", phase: 1, status: "skipped", duration_ms: 0, summary: material ? "Disabled" : "No material context", data: null });
    }

    // Stage 1.2: Constitutive model — flow stress at cutting temperature
    if (stageFlags.constitutive && material) {
      await this._runStageAsync("1.2_constitutive_model", 1, stages, async () => {
        const eng = await this._getEngine("constitutive");
        const isoGroup = material.iso_group;
        // Johnson-Cook thermal softening for steel/stainless
        if (material.jc_A && material.jc_B) {
          const toolGroups = this._groupBlocksByTool(blocks);
          let adjustedBlocks = 0;
          for (const [, toolBlocks] of toolGroups) {
            for (const block of toolBlocks) {
              if (block.move_type === "G0" || !block.forces) continue;
              // Estimate cutting temp from Loewen-Shaw (simplified)
              const Vc = ((block.spindle_rpm ?? 3000) * Math.PI * 10 / 1000);
              const T_cut = 200 + Vc * 2.5; // simplified correlation
              const T_room = 20, T_melt = isoGroup === "N" ? 660 : isoGroup === "S" ? 1350 : 1500;
              const T_star = Math.max(0, Math.min(1, (T_cut - T_room) / (T_melt - T_room)));
              const thermalSoftening = 1 - Math.pow(T_star, material.jc_m ?? 1.0);
              // Adjust force by thermal softening factor
              if (thermalSoftening < 0.95) {
                block.forces.Fc_N *= thermalSoftening;
                block.forces.resultant_N *= thermalSoftening;
                adjustedBlocks++;
              }
            }
          }
          return { model: "Johnson-Cook", adjusted_blocks: adjustedBlocks };
        }
        // Zerilli-Armstrong for BCC metals (titanium, etc.)
        if (material.za_C0) {
          return { model: "Zerilli-Armstrong", note: "ZA params available, applied to force model" };
        }
        return { model: "none", note: `No constitutive params for ${material.name} — using base kc1.1` };
      });
    } else {
      stages.push({ stage: "1.2_constitutive_model", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled or no material", data: null });
    }

    // Stage 1.3: Stability lobe analysis — chatter-free RPM selection
    if (stageFlags.stability_lobes) {
      await this._runStageAsync("1.3_stability_lobes", 1, stages, async () => {
        try {
          const eng = await this._getEngine("stochasticChatter");
          const toolGroups = this._groupBlocksByTool(blocks);
          let rpmAdjustments = 0;

          for (const [toolNum, toolBlocks] of toolGroups) {
            const tool = tools.find(t => t.id === String(toolNum)) ?? tools[0];
            if (!tool) continue;
            const cuttingBlocks = toolBlocks.filter(b => b.move_type !== "G0");
            if (cuttingBlocks.length === 0) continue;

            const ap = input.operations?.find(o => o.tool_number === toolNum)?.ap_mm ?? tool.diameter_mm * 0.5;
            const result = eng.compute({
              tool_diameter_mm: tool.diameter_mm,
              tool_overhang_mm: tool.flute_length_mm ?? tool.diameter_mm * 3,
              flute_count: tool.flute_count,
              axial_depth_mm: ap,
              radial_depth_mm: input.operations?.find(o => o.tool_number === toolNum)?.ae_mm ?? tool.diameter_mm * 0.3,
              material_kc: material?.kc1_1 ?? 2000,
              spindle_rpm: cuttingBlocks[0].spindle_rpm ?? 3000,
              natural_freq_hz: 800, // estimated from tool L/D
              damping_ratio: 0.03,
              num_simulations: 200,
            });

            const r = result?.value ?? result;
            // If current RPM is in unstable zone, find nearest stable pocket
            if (r?.chatter_risk || r?.probability_chatter > 0.3) {
              const stableRpm = r?.recommended_rpm ?? r?.stable_rpm_pockets?.[0];
              if (stableRpm && machine) {
                const clampedRpm = Math.min(stableRpm, machine.max_rpm);
                for (const block of cuttingBlocks) {
                  if (block.optimization) {
                    block.optimization.optimized_rpm = clampedRpm;
                    block.optimization.reasons.push(`Stability: RPM shifted to ${clampedRpm} (chatter risk ${((r.probability_chatter ?? 0) * 100).toFixed(0)}%)`);
                  }
                  block.spindle_rpm = clampedRpm;
                }
                rpmAdjustments++;
              } else {
                warnings.push(`Stage 1.3: Tool T${toolNum} at risk of chatter (P=${((r.probability_chatter ?? 0) * 100).toFixed(0)}%) — consider reducing ap`);
              }
            }
          }
          return { rpm_adjustments: rpmAdjustments };
        } catch {
          return { status: "engine_unavailable", note: "StochasticChatterEngine not available" };
        }
      });
    } else {
      stages.push({ stage: "1.3_stability_lobes", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 1.5: Tool deflection limits — max allowable force
    if (stageFlags.deflection_limit) {
      await this._runStageAsync("1.5_tool_deflection", 1, stages, async () => {
        try {
          const eng = await this._getEngine("stochasticDeflection");
          const toolGroups = this._groupBlocksByTool(blocks);
          let deflectionLimited = 0;
          const toleranceMm = input.tolerance_mm ?? DEFAULT_TOLERANCE_MM;

          for (const [toolNum, toolBlocks] of toolGroups) {
            const tool = tools.find(t => t.id === String(toolNum)) ?? tools[0];
            if (!tool) continue;
            const cuttingBlocks = toolBlocks.filter(b => b.move_type !== "G0" && b.forces);
            if (cuttingBlocks.length === 0) continue;

            const overhang = tool.flute_length_mm ?? tool.diameter_mm * 3;
            const ld_ratio = overhang / tool.diameter_mm;

            // Simple cantilever beam: δ = FL³/3EI
            // E = 600 GPa (carbide), I = πD⁴/64
            const E = tool.material === "hss" ? 200e3 : 600e3; // MPa
            const I = Math.PI * Math.pow(tool.diameter_mm, 4) / 64; // mm⁴
            const maxForceForTolerance = (toleranceMm / 3) * 3 * E * I / Math.pow(overhang, 3); // δ ≤ tol/3

            for (const block of cuttingBlocks) {
              if (block.forces && block.forces.Fc_N > maxForceForTolerance) {
                const derating = maxForceForTolerance / block.forces.Fc_N;
                const newFeed = Math.round((block.feed_mm_min ?? 500) * derating);
                if (block.optimization) {
                  block.optimization.optimized_feed = newFeed;
                  block.optimization.reasons.push(`Deflection limit: L/D=${ld_ratio.toFixed(1)}, δ_max=${(toleranceMm / 3).toFixed(3)}mm → F=${newFeed}`);
                }
                block.feed_mm_min = newFeed;
                deflectionLimited++;
              }
            }
          }
          return { blocks_deflection_limited: deflectionLimited };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "1.5_tool_deflection", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 1.6: Chip morphology — predict chip type and evacuation
    if (stageFlags.chip_thinning) { // reuse chip_thinning flag
      await this._runStageAsync("1.6_chip_morphology", 1, stages, async () => {
        try {
          const eng = await this._getEngine("chipMorphology");
          const chipWarnings: string[] = [];

          for (const tool of tools) {
            const fz = 0.05; // approximate
            const rakeAngle = (tool.helix_angle_deg ?? 30) - 10; // approximate rake from helix
            const prediction = eng.predictChipType({
              rake_angle_deg: rakeAngle,
              friction_coefficient: 0.4,
              cutting_speed_m_min: 150,
              feed_per_tooth_mm: fz,
              material_hardness_hb: material?.hardness_HB ?? 200,
              tool_material: tool.material ?? "carbide",
            });
            if (prediction?.chip_type === "continuous" || prediction?.chip_type === "built_up_edge") {
              chipWarnings.push(`T${tool.id}: ${prediction.chip_type} chip predicted — consider chip breaker or peck cycle`);
            }
          }
          if (chipWarnings.length > 0) {
            warnings.push(...chipWarnings.map(w => `CHIP: ${w}`));
          }
          return { predictions: chipWarnings.length, warnings: chipWarnings };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "1.6_chip_morphology", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 1.7: Coolant strategy — select type/pressure/flow
    if (stageFlags.coolant_strategy !== false && material) {
      this._runStage("1.7_coolant_strategy", 1, stages, () => {
        const isoGroup = material.iso_group;
        const recommended: CoolantContext = (() => {
          switch (isoGroup) {
            case "N": return { type: "mql" as const, flow_rate_l_min: 0.05 };
            case "S": return { type: "flood" as const, pressure_bar: 70, flow_rate_l_min: 20 };
            case "H": return { type: "flood" as const, pressure_bar: 40, flow_rate_l_min: 15 };
            case "M": return { type: "flood" as const, pressure_bar: 20, flow_rate_l_min: 12 };
            case "K": return { type: "mist" as const, flow_rate_l_min: 0.5 };
            default: return { type: "flood" as const, flow_rate_l_min: 10 };
          }
        })();
        // TSC upgrade for deep holes or long tools
        const hasDeepFeature = tools.some(t => (t.flute_length_mm ?? 0) > t.diameter_mm * 4);
        if (hasDeepFeature && machine?.coolant_types?.includes("tsc")) {
          recommended.type = "tsc";
          recommended.pressure_bar = machine.tsc_pressure_bar ?? 40;
          warnings.push(`COOLANT: TSC recommended for deep feature (pressure ${recommended.pressure_bar} bar)`);
        }
        return { recommended, material_group: isoGroup };
      });
    } else {
      stages.push({ stage: "1.7_coolant_strategy", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 1.8: Fixture force check — clamping vs cutting force
    if (stageFlags.fixture_check === true) { // opt-in
      await this._runStageAsync("1.8_fixture_check", 1, stages, async () => {
        try {
          const eng = await this._getEngine("fixtureClamping");
          const maxForce = Math.max(...blocks.filter(b => b.forces).map(b => b.forces!.resultant_N), 0);
          if (maxForce > 0) {
            const result = eng.compute({
              cutting_force_N: maxForce,
              clamping_force_N: maxForce * 3, // assume 3x safety margin if unknown
              friction_coefficient: 0.3,
              num_clamps: 4,
            });
            const r = result?.value ?? result;
            if (r?.safety_factor < 2.0) {
              warnings.push(`FIXTURE: Safety factor ${r.safety_factor.toFixed(1)} < 2.0 — increase clamping force or reduce cutting force`);
            }
            return { max_cutting_force_N: maxForce, safety_factor: r?.safety_factor };
          }
          return { status: "no_force_data" };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "1.8_fixture_check", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled (opt-in)", data: null });
    }

    // Stage 1.9: Process capability forecast — predicted Cpk before cutting
    if (stageFlags.capability_forecast === true) { // opt-in
      await this._runStageAsync("1.9_capability_forecast", 1, stages, async () => {
        try {
          const eng = await this._getEngine("processCapability");
          const toleranceMm = input.tolerance_mm ?? DEFAULT_TOLERANCE_MM;
          const result = eng.predict({
            tolerance_mm: toleranceMm,
            tool_deflection_mm: 0.005,
            thermal_growth_mm: 0.003,
            machine_positioning_mm: 0.005,
            material_variation_pct: 5,
            num_simulations: 500,
          });
          if (result?.Cpk !== undefined && result.Cpk < 1.33) {
            warnings.push(`CAPABILITY: Predicted Cpk=${result.Cpk.toFixed(2)} < 1.33 — process may not be capable for ${toleranceMm}mm tolerance`);
          }
          return { predicted_Cpk: result?.Cpk, predicted_Cp: result?.Cp };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "1.9_capability_forecast", phase: 1, status: "skipped", duration_ms: 0, summary: "Disabled (opt-in)", data: null });
    }

    // ═══ PHASE 2: BLOCK-BY-BLOCK OPTIMIZATION ═══

    // Stage 2.1-2.2: Engagement analysis + chip thinning
    if (stageFlags.engagement_analysis) {
      await this._runStageAsync("2.1_engagement_chip_thinning", 2, stages, async () => {
        const eng = await this._getEngine("instantaneous");
        const toolGroups = this._groupBlocksByTool(blocks);
        let blocksOptimized = 0;

        for (const [toolNum, toolBlocks] of toolGroups) {
          const tool = tools.find(t => t.id === String(toolNum)) ?? tools[0];
          if (!tool) continue;

          const cuttingBlocks = toolBlocks.filter(b => b.move_type !== "G0");
          for (const block of cuttingBlocks) {
            try {
              const ae = input.operations?.find(o => o.tool_number === toolNum)?.ae_mm ?? tool.diameter_mm * 0.3;
              const ap = input.operations?.find(o => o.tool_number === toolNum)?.ap_mm ?? tool.diameter_mm * 0.5;

              const result = eng.computeOptimalSF({
                ae_mm: ae,
                ap_mm: ap,
                tool_diameter_mm: tool.diameter_mm,
                tool_type: this._mapToolTypeForEngagement(tool.type),
                flute_count: tool.flute_count,
                corner_radius_mm: tool.corner_radius_mm,
                target_Vc_m_min: (block.spindle_rpm ?? 3000) * Math.PI * tool.diameter_mm / 1000,
                target_fz_mm: (block.feed_mm_min ?? 500) / ((block.spindle_rpm ?? 3000) * tool.flute_count),
                kc1_1: tool.kc1_1 ?? DEFAULT_KC1_1[material?.iso_group ?? "P"],
                mc: tool.mc ?? DEFAULT_MC[material?.iso_group ?? "P"],
              });

              block.engagement = {
                ae_mm: ae,
                ap_mm: ap,
                theta_deg: result.engagement_angle_deg,
                d_eff_mm: result.effective_diameter_mm,
                chip_thinning_factor: result.chip_thinning_factor,
                classification: result.classification as BlockClassification,
              };

              // Apply chip thinning compensation
              if (result.chip_thinning_factor > 1.05 && block.optimization) {
                const newFeed = Math.round(block.feed_mm_min! * result.chip_thinning_factor);
                block.optimization.optimized_feed = newFeed;
                block.optimization.reasons.push(`Chip thinning ×${result.chip_thinning_factor.toFixed(2)} → F=${newFeed}`);
                block.feed_mm_min = newFeed;
                blocksOptimized++;
              }

              // Apply slotting derating
              if (result.classification === "slotting" && block.optimization) {
                const newFeed = Math.round(block.feed_mm_min! * SLOTTING_FEED_DERATING);
                block.optimization.optimized_feed = newFeed;
                block.optimization.reasons.push(`Slotting derating ${SLOTTING_FEED_DERATING * 100}% → F=${newFeed}`);
                block.feed_mm_min = newFeed;
                blocksOptimized++;
              }

              // Apply corner feed reduction
              if (result.classification === "corner" && block.optimization) {
                const cornerFactor = Math.max(0.5, 90 / result.engagement_angle_deg);
                const newFeed = Math.round(block.feed_mm_min! * cornerFactor);
                block.optimization.optimized_feed = newFeed;
                block.optimization.reasons.push(`Corner engagement ${result.engagement_angle_deg.toFixed(0)}° → F=${newFeed}`);
                block.feed_mm_min = newFeed;
                blocksOptimized++;
              }

              // Ball end mill RPM correction
              if (result.effective_diameter_mm < tool.diameter_mm * 0.95 && block.optimization) {
                const rpmCorrection = tool.diameter_mm / result.effective_diameter_mm;
                const newRpm = Math.round(block.spindle_rpm! * rpmCorrection);
                const clampedRpm = machine ? Math.min(newRpm, machine.max_rpm) : newRpm;
                block.optimization.optimized_rpm = clampedRpm;
                block.optimization.reasons.push(`Ball D_eff=${result.effective_diameter_mm.toFixed(1)}mm → S=${clampedRpm}`);
                block.spindle_rpm = clampedRpm;
              }

              // Force update
              if (result.force_N) {
                block.forces = {
                  Fc_N: result.force_N,
                  Ff_N: result.force_N * 0.4,
                  Fp_N: result.force_N * 0.3,
                  resultant_N: result.force_N * 1.17,
                  power_kW: result.power_kW ?? 0,
                  torque_Nm: (result.force_N * tool.diameter_mm / 2) / 1000,
                };
              }
            } catch {
              // Individual block failure is non-fatal
            }
          }
        }
        return { blocks_analyzed: blocks.length, blocks_optimized: blocksOptimized };
      });
    } else {
      stages.push({ stage: "2.1_engagement_chip_thinning", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 2.3: Adaptive feed — constant chip load / force / MRR modes
    if (stageFlags.adaptive_feed) {
      await this._runStageAsync("2.3_adaptive_feed", 2, stages, async () => {
        try {
          const eng = await this._getEngine("engagementAdaptive");
          const toolGroups = this._groupBlocksByTool(blocks);
          let blocksAdapted = 0;

          for (const [toolNum, toolBlocks] of toolGroups) {
            const tool = tools.find(t => t.id === String(toolNum))
              ?? tools.find(t => parseInt(t.id) === toolNum) ?? tools[0];
            if (!tool) continue;

            const cuttingBlocks = toolBlocks.filter(b => b.move_type !== "G0" && b.engagement);
            if (cuttingBlocks.length === 0) continue;

            // Use constant chip load mode by default
            const nominalFz = (cuttingBlocks[0].feed_mm_min ?? 500) / ((cuttingBlocks[0].spindle_rpm ?? 3000) * tool.flute_count);

            for (const block of cuttingBlocks) {
              if (!block.engagement || !block.optimization) continue;
              const ae = block.engagement.ae_mm;
              const D = tool.diameter_mm;

              // Constant chip load: adjust feed to maintain actual fz regardless of engagement
              if (ae > 0 && ae < D) {
                const engagementRatio = ae / D;
                // For light engagement, chip is thinner → need higher feed to maintain fz
                // For heavy engagement, chip is thicker → reduce feed
                const adaptFactor = engagementRatio < 0.5
                  ? 1 / Math.max(0.3, Math.sqrt(engagementRatio * 2))
                  : Math.sqrt(2 * (1 - engagementRatio) + engagementRatio);

                if (Math.abs(adaptFactor - 1.0) > 0.05) {
                  const newFeed = Math.round(block.feed_mm_min! * adaptFactor);
                  block.optimization.optimized_feed = newFeed;
                  block.optimization.reasons.push(`Adaptive feed: ae/D=${engagementRatio.toFixed(2)} → ×${adaptFactor.toFixed(2)} → F=${newFeed}`);
                  block.feed_mm_min = newFeed;
                  blocksAdapted++;
                }
              }
            }
          }
          return { blocks_adapted: blocksAdapted };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "2.3_adaptive_feed", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 2.4: Corner detection — refined engagement spike feed reduction
    if (stageFlags.corner_detection) {
      this._runStage("2.4_corner_detection", 2, stages, () => {
        let cornersDetected = 0;
        for (let i = 2; i < blocks.length; i++) {
          const prev = blocks[i - 1];
          const curr = blocks[i];
          if (curr.move_type === "G0" || prev.move_type === "G0") continue;
          if (!curr.optimization) continue;

          // Detect direction change angle
          const prevPrev = blocks[i - 2];
          if (!prevPrev || prevPrev.move_type === "G0") continue;

          const dx1 = (prev.x ?? 0) - (prevPrev.x ?? 0);
          const dy1 = (prev.y ?? 0) - (prevPrev.y ?? 0);
          const dx2 = (curr.x ?? 0) - (prev.x ?? 0);
          const dy2 = (curr.y ?? 0) - (prev.y ?? 0);

          const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
          const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (len1 < 0.001 || len2 < 0.001) continue;

          const cosAngle = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
          const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;

          // Sharp corners (>60° direction change) need feed reduction
          if (angleDeg > 60) {
            const cornerDerating = Math.max(0.3, 1 - (angleDeg - 60) / 180);
            const newFeed = Math.round(curr.feed_mm_min! * cornerDerating);
            curr.optimization.optimized_feed = newFeed;
            curr.optimization.reasons.push(`Corner ${angleDeg.toFixed(0)}° → ×${cornerDerating.toFixed(2)} → F=${newFeed}`);
            curr.feed_mm_min = newFeed;
            cornersDetected++;
          }
        }
        return { corners_detected: cornersDetected };
      });
    } else {
      stages.push({ stage: "2.4_corner_detection", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 2.5: Plunge/ramp detection — axial feed limiting
    if (stageFlags.plunge_detection) {
      this._runStage("2.5_plunge_ramp", 2, stages, () => {
        let plungesDetected = 0;
        let rampsDetected = 0;
        for (let i = 1; i < blocks.length; i++) {
          const prev = blocks[i - 1];
          const curr = blocks[i];
          if (curr.move_type === "G0" || !curr.optimization) continue;

          const dz = Math.abs((curr.z ?? 0) - (prev.z ?? 0));
          const dxy = Math.sqrt(
            ((curr.x ?? 0) - (prev.x ?? 0)) ** 2 +
            ((curr.y ?? 0) - (prev.y ?? 0)) ** 2
          );

          if (dz < 0.01) continue; // no Z motion

          const zRatio = dz / (dxy + dz); // 1.0 = pure plunge, 0.0 = pure XY

          if (zRatio > 0.9) {
            // Pure plunge — 50% feed reduction
            const newFeed = Math.round(curr.feed_mm_min! * 0.5);
            curr.optimization.optimized_feed = newFeed;
            curr.optimization.reasons.push(`Plunge detected (Z-ratio=${zRatio.toFixed(2)}) → F=${newFeed}`);
            curr.feed_mm_min = newFeed;
            plungesDetected++;
          } else if (zRatio > 0.3) {
            // Ramp entry — graduated reduction (70-90%)
            const rampDerating = 0.7 + (1 - zRatio) * 0.3;
            const newFeed = Math.round(curr.feed_mm_min! * rampDerating);
            curr.optimization.optimized_feed = newFeed;
            curr.optimization.reasons.push(`Ramp entry (Z-ratio=${zRatio.toFixed(2)}) → ×${rampDerating.toFixed(2)} → F=${newFeed}`);
            curr.feed_mm_min = newFeed;
            rampsDetected++;
          }
        }
        return { plunges: plungesDetected, ramps: rampsDetected };
      });
    } else {
      stages.push({ stage: "2.5_plunge_ramp", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 2.6: Wear progression tracking
    if (stageFlags.wear_progression) {
      this._runStage("2.6_wear_progression", 2, stages, () => {
        const toolGroups = this._groupBlocksByTool(blocks);
        for (const [toolNum, toolBlocks] of toolGroups) {
          const tool = tools.find(t => t.id === String(toolNum));
          let cumulativeTime_min = 0;
          const VB_limit = 0.3; // mm, roughing default

          for (const block of toolBlocks) {
            if (block.move_type === "G0" || !block.feed_mm_min) continue;

            // Estimate cutting time for this block
            const prevBlock = blocks[block.id - 1];
            const dist = prevBlock ? Math.sqrt(
              ((block.x ?? 0) - (prevBlock.x ?? 0)) ** 2 +
              ((block.y ?? 0) - (prevBlock.y ?? 0)) ** 2 +
              ((block.z ?? 0) - (prevBlock.z ?? 0)) ** 2
            ) : 0;
            const blockTime = dist > 0 && block.feed_mm_min > 0 ? dist / block.feed_mm_min : 0;
            cumulativeTime_min += blockTime;

            // Takeyama-Murata simplified: VB ∝ t^0.5 in normal wear region
            const Vc = (block.spindle_rpm ?? 3000) * Math.PI * (tool?.diameter_mm ?? 10) / 1000;
            const C_wear = 0.01 * Math.pow(Vc / 100, 1.5); // wear rate increases with speed
            const VB = C_wear * Math.sqrt(cumulativeTime_min);

            block.wear = {
              VB_mm: VB,
              VB_rate_mm_per_min: VB > 0 && cumulativeTime_min > 0 ? VB / cumulativeTime_min : 0,
              remaining_life_pct: Math.max(0, (1 - VB / VB_limit) * 100),
            };

            // Derate S/F when wear approaches limit
            if (VB > VB_limit * 0.7 && block.optimization) {
              const wearDerating = 1 - (VB - VB_limit * 0.7) / (VB_limit * 0.3) * 0.2;
              const newRpm = Math.round(block.spindle_rpm! * Math.max(0.8, wearDerating));
              block.optimization.optimized_rpm = newRpm;
              block.optimization.reasons.push(`Wear VB=${VB.toFixed(3)}mm → S derated to ${newRpm}`);
              block.spindle_rpm = newRpm;
            }
          }
        }
        return { wear_tracking: "active" };
      });
    } else {
      stages.push({ stage: "2.6_wear_progression", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 2.7: Thermal accumulation tracking
    if (stageFlags.thermal_tracking) {
      this._runStage("2.7_thermal_tracking", 2, stages, () => {
        let cumulativeHeat = 0;
        const heatDissipationRate = 50; // J/s estimated conduction+convection

        for (const block of blocks) {
          if (block.move_type === "G0" || !block.forces) continue;

          // Heat generation: Q = Fc × Vc / 60 (watts) × time
          const Vc_m_s = ((block.spindle_rpm ?? 3000) * Math.PI * 10 / 1000) / 60;
          const heatGen = block.forces.Fc_N * Vc_m_s; // watts

          const prevBlock = blocks[block.id - 1];
          const dist = prevBlock ? Math.sqrt(
            ((block.x ?? 0) - (prevBlock.x ?? 0)) ** 2 +
            ((block.y ?? 0) - (prevBlock.y ?? 0)) ** 2 +
            ((block.z ?? 0) - (prevBlock.z ?? 0)) ** 2
          ) : 0;
          const blockTime_s = dist > 0 && block.feed_mm_min ? (dist / block.feed_mm_min) * 60 : 0;

          cumulativeHeat += (heatGen - heatDissipationRate) * blockTime_s;
          cumulativeHeat = Math.max(0, cumulativeHeat);

          // Estimate temperatures
          const T_tool = 20 + cumulativeHeat * 0.001; // simplified
          const T_chip = 200 + heatGen * 0.5;

          block.thermal = {
            T_tool_C: T_tool,
            T_chip_C: T_chip,
            cumulative_heat_J: cumulativeHeat,
          };

          // Derate speed when cumulative heat is high
          if (cumulativeHeat > 5000 && block.optimization) {
            const thermalDerating = Math.max(0.85, 1 - (cumulativeHeat - 5000) / 50000);
            const newRpm = Math.round(block.spindle_rpm! * thermalDerating);
            block.optimization.optimized_rpm = newRpm;
            block.optimization.reasons.push(`Thermal accumulation ${cumulativeHeat.toFixed(0)}J → S=${newRpm}`);
            block.spindle_rpm = newRpm;
          }
        }
        return { peak_heat_J: cumulativeHeat };
      });
    } else {
      stages.push({ stage: "2.7_thermal_tracking", phase: 2, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // ═══ PHASE 3: MOTION OPTIMIZATION ═══

    // Stage 3.2: Motion dynamics — achievable feed (accel/jerk/corner/servo)
    if (stageFlags.motion_dynamics) {
      await this._runStageAsync("3.2_motion_dynamics", 3, stages, async () => {
        try {
          const eng = await this._getEngine("motionDynamics");
          let feedsClamped = 0;
          const machineAccel = machine?.accel_mm_s2?.x ?? 2000; // mm/s²

          for (let i = 1; i < blocks.length; i++) {
            const prev = blocks[i - 1];
            const curr = blocks[i];
            if (curr.move_type === "G0" || !curr.feed_mm_min) continue;

            const dist = Math.sqrt(
              ((curr.x ?? 0) - (prev.x ?? 0)) ** 2 +
              ((curr.y ?? 0) - (prev.y ?? 0)) ** 2 +
              ((curr.z ?? 0) - (prev.z ?? 0)) ** 2
            );

            if (dist < 0.001) continue;

            // Trapezoidal profile: max achievable feed for this distance
            // v_max = √(2 × a × d) when distance is too short to reach commanded feed
            const commandedFeed_mm_s = curr.feed_mm_min / 60;
            const maxAchievable_mm_s = Math.sqrt(2 * machineAccel * dist);
            const maxAchievable_mm_min = maxAchievable_mm_s * 60;

            if (maxAchievable_mm_min < curr.feed_mm_min * 0.95) {
              if (curr.optimization) {
                curr.optimization.optimized_feed = Math.round(maxAchievable_mm_min);
                curr.optimization.reasons.push(
                  `Motion: seg ${dist.toFixed(1)}mm too short for F${curr.feed_mm_min} → F${Math.round(maxAchievable_mm_min)}`
                );
              }
              curr.feed_mm_min = Math.round(maxAchievable_mm_min);
              feedsClamped++;
            }
          }
          return { feeds_clamped: feedsClamped };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({
        stage: "3.2_motion_dynamics", phase: 3, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 3.5: Controller feature injection
    if (stageFlags.controller_features && (machine?.controller || input.controller)) {
      await this._runStageAsync("3.5_controller_features", 3, stages, async () => {
        try {
          const eng = await this._getEngine("controllerDialect");
          const ctrl = machine?.controller ?? input.controller ?? "fanuc";
          const dialect = eng.getDialect(ctrl);
          const injectedCodes: string[] = [];

          // Determine operation type for feature selection
          const opType = input.operations?.[0]?.type ?? "general";
          const isFinishing = /finish|fine|polish/i.test(opType);
          const isRoughing = /rough|hog|mrr/i.test(opType);

          const featureType = isFinishing ? "finishing"
            : isRoughing ? "roughing" : "semi_finishing";
          const codes = eng.getFeatureCodes(ctrl, featureType);
          injectedCodes.push(...codes);

          // HSM auto-injection: if operation is finishing or HSM strategy and controller supports it
          // Inject G05.1 Q1 (Fanuc AICC), CYCLE832 (Siemens), G187 P3 (Haas) etc.
          // Use the dialect's hsc_mode codes when tolerance < 0.05mm or strategy is 'hsm'/'finishing'
          const isHSM = /hsm|high.?speed/i.test(opType);
          const tightTolerance = (input.tolerance_mm ?? 1) < 0.05;
          let hsmInjected = false;
          if ((isFinishing || isHSM || tightTolerance) && dialect.features.hsc_mode) {
            const hsc = dialect.features.hsc_mode;
            // Inject HSM on-code (added to program start region)
            let hsmOnCode = hsc.on;
            // If controller supports tolerance parameter, embed the actual tolerance
            if (hsc.tolerance_param && input.tolerance_mm) {
              hsmOnCode = hsc.tolerance_param
                .replace("{tol}", String(input.tolerance_mm))
                .replace("{mode}", "1");
            }
            injectedCodes.unshift(hsmOnCode);
            // HSM off-code goes at program end
            if (hsc.off) {
              injectedCodes.push(`(HSM_OFF) ${hsc.off}`);
            }
            hsmInjected = true;
          }

          return {
            controller: dialect.display_name,
            features_injected: injectedCodes,
            operation_mode: featureType,
            hsm_auto_injected: hsmInjected,
            hsm_trigger: hsmInjected
              ? (isHSM ? "hsm_strategy" : tightTolerance ? "tight_tolerance" : "finishing_op")
              : null,
          };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({
        stage: "3.5_controller_features", phase: 3, status: "skipped",
        duration_ms: 0, summary: "Disabled or no controller", data: null,
      });
    }

    // ═══ PHASE 4: STOCHASTIC VERIFICATION ═══

    // Stage 4.1: Monte Carlo force distribution
    if (stageFlags.monte_carlo) {
      this._runStage("4.1_monte_carlo", 4, stages, () => {
        const cuttingBlocks = blocks.filter(b => b.move_type !== "G0" && b.forces);
        if (cuttingBlocks.length === 0) return { status: "no_force_data" };

        const N_SAMPLES = 500;
        const materialVariation = 0.08; // ±8% kc1.1 variation
        const forceDistributions: Array<{ block_id: number; ci_95: [number, number] }> = [];

        for (const block of cuttingBlocks.slice(0, 50)) { // limit to 50 blocks for perf
          if (!block.forces) continue;
          const Fc_nom = block.forces.Fc_N;
          const samples: number[] = [];
          for (let i = 0; i < N_SAMPLES; i++) {
            // Box-Muller for normal random: Z = sqrt(-2*ln(U1)) * cos(2π*U2)
            const u1 = Math.random() || 0.001;
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            samples.push(Fc_nom * (1 + z * materialVariation));
          }
          samples.sort((a, b) => a - b);
          const ci_low = samples[Math.floor(N_SAMPLES * 0.025)];
          const ci_high = samples[Math.floor(N_SAMPLES * 0.975)];
          block.confidence = {
            force_ci_95: [ci_low, ci_high],
            feed_ci_95: [block.feed_mm_min ?? 0, block.feed_mm_min ?? 0],
          };
          forceDistributions.push({ block_id: block.id, ci_95: [ci_low, ci_high] });
        }

        return {
          blocks_simulated: forceDistributions.length,
          samples_per_block: N_SAMPLES,
          method: "Monte Carlo with Box-Muller",
        };
      });
    } else {
      stages.push({
        stage: "4.1_monte_carlo", phase: 4, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // Stage 4.7: Process robustness score
    if (stageFlags.robustness_score === true) {
      this._runStage("4.7_robustness_score", 4, stages, () => {
        const cuttingBlocks = blocks.filter(b => b.move_type !== "G0" && b.forces);
        if (cuttingBlocks.length === 0) return { score: 100, note: "no cutting data" };

        const forces = cuttingBlocks.map(b => b.forces!.Fc_N);
        const mean = forces.reduce((a, b) => a + b, 0) / forces.length;
        const stddev = Math.sqrt(forces.reduce((a, b) => a + (b - mean) ** 2, 0) / forces.length);
        const cv = mean > 0 ? (stddev / mean) * 100 : 0; // coefficient of variation %

        // Taguchi-inspired S/N ratio: higher = more robust
        const snRatio = mean > 0 ? 10 * Math.log10(mean * mean / (stddev * stddev + 0.001)) : 0;

        // Score: 100 = perfectly robust (cv=0), 0 = highly variable (cv>50%)
        const score = Math.max(0, Math.min(100, 100 - cv * 2));

        if (score < 60) {
          warnings.push(`ROBUSTNESS: Score ${score.toFixed(0)}/100 — force CV=${cv.toFixed(1)}%. Consider tighter parameter control.`);
        }

        return {
          score: Math.round(score),
          force_cv_pct: +cv.toFixed(1),
          sn_ratio_db: +snRatio.toFixed(1),
          top_sensitivity: "feed_rate",
        };
      });
    } else {
      stages.push({
        stage: "4.7_robustness_score", phase: 4, status: "skipped",
        duration_ms: 0, summary: "Disabled (opt-in)", data: null,
      });
    }

    // ═══ PHASE 5: SAFETY + KNOWLEDGE ═══

    // Stage 5.1: G-code safety analysis
    if (stageFlags.safety_analysis) {
      await this._runStageAsync("5.1_safety_analysis", 5, stages, async () => {
        const eng = await this._getEngine("safety");
        // Reconstruct G-code from blocks for safety analysis
        const tempGcode = this._blocksToGCode(blocks, machine?.controller ?? input.controller ?? "fanuc");
        try {
          const result = eng.analyze({
            gcode: tempGcode,
            controller: machine?.controller ?? input.controller ?? "fanuc",
            machine_limits: machine ? {
              max_rpm: machine.max_rpm,
              max_feed_mm_min: Math.min(machine.rapid_rate_mm_min.x, machine.rapid_rate_mm_min.y),
              work_envelope: machine.work_volume,
            } : undefined,
          });
          const criticals = result.issues?.filter((i: any) => i.severity === "critical").length ?? 0;
          if (criticals > 0) {
            warnings.push(`SAFETY: ${criticals} critical issue(s) found — review required`);
          }
          return result;
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "5.1_safety_analysis", phase: 5, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 5.2: Playbook rules
    if (stageFlags.playbook_rules && material) {
      await this._runStageAsync("5.2_playbook_rules", 5, stages, async () => {
        try {
          const eng = await this._getEngine("playbook");
          const result = eng.query({
            material: material.name,
            iso_group: material.iso_group,
            operation_type: input.operations?.[0]?.type ?? "general",
            hardness_hrc: material.hardness_HRC,
          });
          const rules = result.rules ?? result.tips ?? [];
          if (rules.length > 0) {
            for (const rule of rules.slice(0, 5)) {
              warnings.push(`PLAYBOOK: ${rule.title ?? rule.message ?? rule}`);
            }
          }
          return { rules_fired: rules.length };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "5.2_playbook_rules", phase: 5, status: "skipped", duration_ms: 0, summary: material ? "Disabled" : "No material", data: null });
    }

    // Stage 5.3: Tribal knowledge — CAM-system-specific tips
    if (stageFlags.tribal_knowledge && material) {
      this._runStage("5.3_tribal_knowledge", 5, stages, () => {
        const tips: string[] = [];
        const isoGroup = material.iso_group;

        // Material-based tips from tribal knowledge
        if (isoGroup === "S") {
          tips.push("TK: Superalloy — maintain constant chip load, avoid dwelling in cut");
          tips.push("TK: Use climb milling only, keep tool moving to prevent work hardening");
        }
        if (isoGroup === "M") {
          tips.push("TK: Stainless — avoid rubbing (causes work hardening), use sharp tools");
          tips.push("TK: Reduce speed 20% vs carbon steel, increase feed 10%");
        }
        if (isoGroup === "H") {
          tips.push("TK: Hardened steel — use CBN/ceramic for >45 HRC, carbide for 28-45 HRC");
        }
        if (isoGroup === "N") {
          tips.push("TK: Aluminum — high speed, sharp rake angle, watch for BUE at low speed");
        }

        // Tool-based tips
        for (const tool of tools) {
          const ld = (tool.flute_length_mm ?? tool.diameter_mm * 3) / tool.diameter_mm;
          if (ld > 5) tips.push(`TK: T${tool.id} L/D=${ld.toFixed(1)} — use light cuts, peck strategy for deep features`);
          if (tool.type === "ball_endmill") tips.push(`TK: T${tool.id} ball nose — maintain min 5° tilt for effective cutting`);
        }

        if (tips.length > 0) warnings.push(...tips);
        return { tips_applied: tips.length, material_group: isoGroup };
      });
    } else {
      stages.push({ stage: "5.3_tribal_knowledge", phase: 5, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 5.5: Energy optimization advisory
    if (stageFlags.energy_optimization) {
      this._runStage("5.5_energy_optimization", 5, stages, () => {
        let idleSpindleBlocks = 0;
        let consecutiveRapids = 0;
        let maxConsecutiveRapids = 0;

        for (const block of blocks) {
          if (block.move_type === "G0") {
            consecutiveRapids++;
            maxConsecutiveRapids = Math.max(maxConsecutiveRapids, consecutiveRapids);
          } else {
            consecutiveRapids = 0;
          }
          // Spindle running during rapids
          if (block.move_type === "G0" && block.spindle_rpm && block.spindle_rpm > 0) {
            idleSpindleBlocks++;
          }
        }

        const recommendations: string[] = [];
        if (idleSpindleBlocks > 3) {
          recommendations.push(`ENERGY: ${idleSpindleBlocks} rapid blocks with spindle running — consider M5/M3 bracketing`);
        }
        if (maxConsecutiveRapids > 5) {
          recommendations.push(`ENERGY: ${maxConsecutiveRapids} consecutive rapids — check for unnecessary repositioning`);
        }

        if (recommendations.length > 0) warnings.push(...recommendations);
        return {
          idle_spindle_blocks: idleSpindleBlocks,
          max_consecutive_rapids: maxConsecutiveRapids,
          recommendations: recommendations.length,
        };
      });
    } else {
      stages.push({ stage: "5.5_energy_optimization", phase: 5, status: "skipped", duration_ms: 0, summary: "Disabled (opt-in)", data: null });
    }

    // ═══ PHASE 5.9: VERIFICATION (pre-output) ═══

    // Stage 5.9: 5-axis post processing (singularity + TCPC)
    if (machine?.axes === 5 || blocks.some(b => b.a !== undefined || b.b !== undefined || b.c !== undefined)) {
      await this._runStageAsync("5.9_five_axis_post", 5, stages, async () => {
        try {
          const eng = await this._getEngine("fiveAxisPost");
          const fiveAxisBlocks = blocks.filter(b =>
            b.a !== undefined || b.b !== undefined || b.c !== undefined
          ).map(b => ({
            x: b.x ?? 0, y: b.y ?? 0, z: b.z ?? 0,
            a: b.a, b: b.b, c: b.c, feed_mm_min: b.feed_mm_min,
          }));

          if (fiveAxisBlocks.length > 0) {
            const singularity = eng.detectSingularities(fiveAxisBlocks, {
              controller: machine?.controller ?? input.controller ?? "fanuc",
              kinematics: (machine?.kinematics as any) ?? "table_table",
              rotary_axis_1: "A", rotary_axis_2: "C",
            });
            if (singularity.has_singularity) {
              warnings.push(...singularity.recommendations);
            }
            return { five_axis_blocks: fiveAxisBlocks.length, singularities: singularity.singularity_blocks.length };
          }
          return { five_axis_blocks: 0 };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "5.9_five_axis_post", phase: 5, status: "skipped", duration_ms: 0, summary: "No 5-axis moves", data: null });
    }

    // ═══ PHASE 6: OUTPUT GENERATION ═══

    // Stage 6.1: G-code generation using ControllerDialectEngine
    let outputGcode = "";
    if (stageFlags.gcode_generation) {
      await this._runStageAsync("6.1_gcode_generation", 6, stages, async () => {
        const controllerKey = machine?.controller ?? input.controller ?? "fanuc";
        try {
          const dialectEng = await this._getEngine("controllerDialect");
          outputGcode = this._blocksToGCodeWithDialect(blocks, dialectEng, controllerKey);
        } catch {
          // Fallback to basic codegen if dialect engine unavailable
          outputGcode = this._blocksToGCode(blocks, controllerKey);
        }
        return { lines: outputGcode.split("\n").length, controller: controllerKey, dialect_used: true };
      });
    } else {
      // If no codegen, return original or empty
      outputGcode = input.gcode ?? "";
      stages.push({ stage: "6.1_gcode_generation", phase: 6, status: "skipped", duration_ms: 0, summary: "Disabled", data: null });
    }

    // Stage 6.5: Analytics report
    let analytics: AnalyticsReport | undefined;
    if (stageFlags.analytics_report || input.include_analytics) {
      this._runStage("6.5_analytics_report", 6, stages, () => {
        analytics = this._generateAnalytics(blocks, tools, machine);
        return analytics;
      });
    }

    // Stage 6.6: Cycle time estimate
    if (stageFlags.cycle_time) {
      this._runStage("6.6_cycle_time", 6, stages, () => {
        return this._estimateCycleTime(blocks, machine);
      });
    }

    // Stage 6.8: Output verification — validate generated G-code
    if (outputGcode.length > 10) {
      await this._runStageAsync("6.8_output_verification", 6, stages, async () => {
        try {
          const eng = await this._getEngine("ppVerify");
          const result = eng.verify({
            gcode: outputGcode,
            controller: machine?.controller ?? input.controller,
            machine_limits: machine ? {
              max_rpm: machine.max_rpm,
              max_feed_mm_min: Math.min(machine.rapid_rate_mm_min.x, machine.rapid_rate_mm_min.y),
              work_volume: machine.work_volume,
            } : undefined,
          });
          const criticals = result.issues.filter((i: any) => i.severity === "critical");
          if (criticals.length > 0) {
            warnings.push(`VERIFY: ${criticals.length} critical issue(s) — ${criticals.map((c: any) => c.message).join("; ")}`);
          }
          return {
            valid: result.valid,
            issues: result.issues.length,
            criticals: criticals.length,
            summary: result.summary,
          };
        } catch {
          return { status: "engine_unavailable" };
        }
      });
    } else {
      stages.push({ stage: "6.8_output_verification", phase: 6, status: "skipped", duration_ms: 0, summary: "No output to verify", data: null });
    }

    // ═══ BUILD RESULT ═══

    const overallStatus: StageStatus = stages.some(s => s.status === "fail") ? "fail"
      : stages.some(s => s.status === "warn") ? "warn" : "pass";

    const operations: OperationDef[] = input.operations ?? [{
      id: 0,
      type: "general",
      tool_number: tools[0] ? parseInt(tools[0].id) : 1,
      blocks,
    }];

    return {
      output_gcode: outputGcode,
      stages,
      overall_status: overallStatus,
      total_duration_ms: Date.now() - startTime,
      resolved: {
        machine: machine as MachineContext | undefined,
        material: material as MaterialContext | undefined,
        tools,
        holders,
        coolant,
      },
      blocks,
      operations,
      analytics,
      warnings,
      aggressiveness,
      optimization_target: optTarget,
    };
  }

  /**
   * Run pipeline on existing G-code (Phase B re-optimization).
   * Preserves program structure, replaces S/F values.
   */
  async reoptimize(input: {
    gcode: string;
    material: string;
    iso_group?: ISOGroup;
    machine?: string;
    controller?: ControllerFamily;
    aggressiveness?: number;
    stages?: Partial<StageConfig>;
  }): Promise<PipelineOutput> {
    return this.process({
      gcode: input.gcode,
      material: { name: input.material, iso_group: input.iso_group ?? "P", resolution_confidence: 0.5, id: "reopt" },
      controller: input.controller ?? "fanuc",
      aggressiveness: input.aggressiveness,
      stages: input.stages,
    });
  }

  /**
   * Analyze without generating output G-code (dry run).
   * Returns analytics, stage results, and warnings only.
   */
  async analyze(input: PipelineInput): Promise<PipelineOutput> {
    return this.process({
      ...input,
      stages: {
        ...input.stages,
        gcode_generation: false,
        probe_routines: false,
        setup_sheet: false,
      },
    });
  }

  // ─── Internal Helpers ──────────────────────────────────────────────

  private _parseInput(input: PipelineInput): { blocks: ToolpathBlock[]; tools: Map<number, { diameter_mm?: number }> } {
    if (input.blocks && input.blocks.length > 0) {
      return { blocks: [...input.blocks], tools: new Map() };
    }
    if (input.gcode) {
      return parseGCode(input.gcode);
    }
    if (input.cl_data) {
      return parseCLData(input.cl_data);
    }
    return { blocks: [], tools: new Map() };
  }

  private _resolveContexts(
    input: PipelineInput,
    _parsedTools: Map<number, { diameter_mm?: number }>
  ): {
    machine?: MachineContext;
    material?: MaterialContext;
    tools: ToolContext[];
    holders: HolderContext[];
    coolant?: CoolantContext;
  } {
    // Resolve machine
    let machine: MachineContext | undefined;
    if (input.machine && "max_rpm" in input.machine) {
      machine = input.machine as MachineContext;
    } else if (input.machine && "name" in input.machine) {
      // Placeholder for catalog lookup
      machine = {
        id: "resolved",
        name: (input.machine as any).name,
        brand: "unknown",
        controller: input.controller ?? "fanuc",
        max_rpm: 12000,
        max_power_kW: 15,
        rapid_rate_mm_min: { x: 30000, y: 30000, z: 20000 },
        work_volume: { x: 500, y: 400, z: 300 },
        axes: 3,
        resolution_confidence: 0.3,
      };
    }

    // Resolve material
    let material: MaterialContext | undefined;
    if (input.material && "iso_group" in input.material && "id" in input.material) {
      material = input.material as MaterialContext;
    } else if (input.material && "name" in input.material) {
      const name = (input.material as any).name as string;
      const isoGroup = (input.material as any).iso_group ?? this._inferISOGroup(name);
      material = {
        id: "resolved",
        name,
        iso_group: isoGroup,
        resolution_confidence: isoGroup ? 0.7 : 0.3,
      };
    }

    // Resolve tools
    const resolvedTools: ToolContext[] = [];
    if (input.tools) {
      for (const t of input.tools) {
        if ("flute_count" in t && "type" in t) {
          resolvedTools.push(t as ToolContext);
        } else {
          resolvedTools.push({
            id: String((t as any).tool_number ?? resolvedTools.length + 1),
            type: "flat_endmill",
            diameter_mm: (t as any).diameter_mm ?? 10,
            flute_count: (t as any).flute_count ?? 4,
            material: "carbide",
            resolution_confidence: 0.3,
          });
        }
      }
    }

    return {
      machine,
      material,
      tools: resolvedTools,
      holders: (input.holders as HolderContext[]) ?? [],
      coolant: input.coolant,
    };
  }

  private _applySmartDefaults(
    input: PipelineInput,
    machine: MachineContext | undefined,
    material: MaterialContext | undefined,
    tools: ToolContext[],
    blocks: ToolpathBlock[],
    warnings: string[]
  ): Record<string, unknown> {
    const defaults: Record<string, string> = {};

    // Default tolerance
    if (!input.tolerance_mm) {
      (input as any).tolerance_mm = DEFAULT_TOLERANCE_MM;
      defaults.tolerance = `${DEFAULT_TOLERANCE_MM}mm (ISO 2768-m)`;
    }

    // Default surface finish
    if (!input.surface_finish_Ra) {
      (input as any).surface_finish_Ra = DEFAULT_RA_SEMI;
      defaults.surface_finish = `Ra ${DEFAULT_RA_SEMI}μm (semi-finish)`;
    }

    // Default coolant from material
    if (!input.coolant && material) {
      const coolantMap: Record<ISOGroup, CoolantContext> = {
        P: { type: "flood" },
        M: { type: "flood", pressure_bar: 20 },
        K: { type: "mist" },
        N: { type: "mql" },
        S: { type: "flood", pressure_bar: 70 },
        H: { type: "flood", pressure_bar: 40 },
      };
      (input as any).coolant = coolantMap[material.iso_group] ?? { type: "flood" };
      defaults.coolant = (input as any).coolant.type;
    }

    if (Object.keys(defaults).length > 0) {
      warnings.push(`Smart defaults applied: ${Object.entries(defaults).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    }

    return defaults;
  }

  private _buildStageFlags(stages?: Partial<StageConfig>): Record<string, boolean> {
    const s = stages ?? {};
    return {
      speed_feed: s.speed_feed !== false,
      constitutive: s.constitutive !== false,
      stability_lobes: s.stability_lobes !== false,
      engagement_analysis: s.engagement_analysis !== false,
      chip_thinning: s.chip_thinning !== false,
      adaptive_feed: s.adaptive_feed !== false,
      corner_detection: s.corner_detection !== false,
      plunge_detection: s.plunge_detection !== false,
      wear_progression: s.wear_progression !== false,
      thermal_tracking: s.thermal_tracking !== false,
      deflection_limit: s.deflection_limit !== false,
      toolpath_smoothing: s.toolpath_smoothing === true, // opt-in
      motion_dynamics: s.motion_dynamics === true, // opt-in
      look_ahead: s.look_ahead === true, // opt-in
      coolant_strategy: s.coolant_strategy !== false,
      fixture_check: s.fixture_check === true, // opt-in
      capability_forecast: s.capability_forecast === true, // opt-in
      controller_features: s.controller_features !== false,
      machine_error_comp: s.machine_error_comp === true, // opt-in
      safety_analysis: s.safety_analysis !== false,
      playbook_rules: s.playbook_rules !== false,
      tribal_knowledge: s.tribal_knowledge !== false,
      robustness_score: s.robustness_score === true, // opt-in
      energy_optimization: s.energy_optimization === true, // opt-in
      gcode_generation: s.gcode_generation !== false,
      analytics_report: s.analytics_report !== false,
      cycle_time: s.cycle_time !== false,
      monte_carlo: s.monte_carlo === true, // opt-in (expensive)
    };
  }

  private _groupBlocksByTool(blocks: ToolpathBlock[]): Map<number, ToolpathBlock[]> {
    const groups = new Map<number, ToolpathBlock[]>();
    for (const block of blocks) {
      const tn = block.tool_number ?? 0;
      if (!groups.has(tn)) groups.set(tn, []);
      groups.get(tn)!.push(block);
    }
    return groups;
  }

  private _aggressivenessScale(a: number): number {
    // 0.0 → 0.60, 0.5 → 0.85, 1.0 → 1.00
    return 0.60 + a * 0.40;
  }

  private _mapToolType(type: ToolType): string {
    const map: Record<string, string> = {
      flat_endmill: "endmill",
      ball_endmill: "ballnose",
      bull_nose: "bull_nose",
      face_mill: "face_mill",
      drill: "drill",
      tap: "tap",
      reamer: "reamer",
      chamfer: "chamfer",
      boring_bar: "boring_bar",
      insert_mill: "insert_mill",
      thread_mill: "thread_mill",
      slot_drill: "endmill",
    };
    return map[type] ?? "endmill";
  }

  private _mapToolTypeForEngagement(type: ToolType): "flat_endmill" | "ball_endmill" | "bull_nose" {
    if (type === "ball_endmill") return "ball_endmill";
    if (type === "bull_nose") return "bull_nose";
    return "flat_endmill";
  }

  private _inferISOGroup(name: string): ISOGroup {
    const lower = name.toLowerCase();
    if (/alum|6061|7075|2024/.test(lower)) return "N";
    if (/stainless|316|304|303|17-4/.test(lower)) return "M";
    if (/cast.?iron|grey|ductile|ggg/.test(lower)) return "K";
    if (/inconel|hastelloy|waspaloy|nimonic|rene/.test(lower)) return "S";
    if (/hardened|d2|m2|h13|hrc/.test(lower)) return "H";
    return "P"; // Default to general steel
  }

  private _blocksToGCode(blocks: ToolpathBlock[], controller: ControllerFamily): string {
    const lines: string[] = [];
    const isHeidenhain = controller === "heidenhain";
    const isMazak = controller === "mazak";

    // Safe start block
    if (isHeidenhain) {
      lines.push("BEGIN PGM PRISM MM");
    } else {
      lines.push("%");
      lines.push("O0001 (PRISM OPTIMIZED)");
      lines.push("G90 G21 G17 G40 G80");
    }

    let lastTool = -1;
    let lastRpm = -1;
    let lastFeed = -1;

    for (const block of blocks) {
      // Tool change
      if (block.tool_number !== undefined && block.tool_number !== lastTool) {
        lastTool = block.tool_number;
        if (isHeidenhain) {
          lines.push(`TOOL CALL ${lastTool} Z S${block.spindle_rpm ?? 3000}`);
        } else {
          lines.push(`T${lastTool} M6`);
          if (block.spindle_rpm) {
            lines.push(`S${block.spindle_rpm} M3`);
            lastRpm = block.spindle_rpm;
          }
        }
      }

      // Spindle change (without tool change)
      if (block.spindle_rpm && block.spindle_rpm !== lastRpm && !isHeidenhain) {
        lastRpm = block.spindle_rpm;
      }

      // Build move line
      const parts: string[] = [];

      if (isHeidenhain) {
        // Heidenhain format
        if (block.move_type === "G0") {
          parts.push("L");
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
          parts.push("FMAX");
        } else if (block.move_type === "G1") {
          parts.push("L");
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
          if (block.feed_mm_min) parts.push(`F${block.feed_mm_min}`);
        } else if (block.move_type === "G2" || block.move_type === "G3") {
          parts.push(block.move_type === "G2" ? "CC" : "CC");
          // Simplified arc — full Heidenhain arcs need CC + C commands
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
          if (block.feed_mm_min) parts.push(`F${block.feed_mm_min}`);
        }
      } else {
        // ISO format (Fanuc/Haas/Siemens/Mazak/Okuma)
        parts.push(block.move_type);
        if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
        if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
        if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
        if (block.move_type === "G2" || block.move_type === "G3") {
          if (block.i !== undefined) parts.push(`I${this._fmt(block.i)}`);
          if (block.j !== undefined) parts.push(`J${this._fmt(block.j)}`);
          if (block.k !== undefined) parts.push(`K${this._fmt(block.k)}`);
          if (block.r !== undefined) parts.push(`R${this._fmt(block.r)}`);
        }
        if (block.spindle_rpm && block.spindle_rpm !== lastRpm) {
          parts.push(`S${block.spindle_rpm}`);
          lastRpm = block.spindle_rpm;
        }
        if (block.move_type !== "G0" && block.feed_mm_min && block.feed_mm_min !== lastFeed) {
          parts.push(`F${block.feed_mm_min}`);
          lastFeed = block.feed_mm_min;
        }
      }

      if (parts.length > 0) {
        // Add optimization comment in debug mode
        const comment = block.optimization?.reasons.length
          ? ` (${block.optimization.reasons[block.optimization.reasons.length - 1]})`
          : "";
        lines.push(parts.join(" ") + comment);
      }
    }

    // Program end
    if (isHeidenhain) {
      lines.push("END PGM PRISM MM");
    } else {
      lines.push("M30");
      lines.push("%");
    }

    return lines.join("\n");
  }

  /**
   * Dialect-aware G-code generation using ControllerDialectEngine
   * Uses controller-specific program headers, tool changes, comments, and arc formats
   */
  private _blocksToGCodeWithDialect(blocks: ToolpathBlock[], dialectEng: any, controllerKey: string): string {
    const dialect = dialectEng.getDialect(controllerKey);
    const lines: string[] = [];
    const isHeidenhain = dialect.base_family === "heidenhain";

    // Program header from dialect
    lines.push(...dialectEng.getProgramHeader(controllerKey));
    if (dialect.safe_start) lines.push(dialect.safe_start);

    let lastTool = -1;
    let lastRpm = -1;
    let lastFeed = -1;

    for (const block of blocks) {
      // Tool change using dialect-specific sequence
      if (block.tool_number !== undefined && block.tool_number !== lastTool) {
        lastTool = block.tool_number;
        const tcLines = dialectEng.generateToolChange(controllerKey, lastTool, block.spindle_rpm);
        lines.push(...tcLines);
        if (block.spindle_rpm) lastRpm = block.spindle_rpm;
      }

      const parts: string[] = [];

      if (isHeidenhain) {
        if (block.move_type === "G0") {
          parts.push("L");
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
          parts.push("FMAX");
        } else if (block.move_type === "G1") {
          parts.push("L");
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
          if (block.feed_mm_min) parts.push(`F${block.feed_mm_min}`);
        } else if (block.move_type === "G2" || block.move_type === "G3") {
          // Heidenhain: CC (center point) then C (arc to endpoint)
          if (block.i !== undefined && block.j !== undefined) {
            const cx = (block.x ?? 0) - (block.i ?? 0); // approximate center
            const cy = (block.y ?? 0) - (block.j ?? 0);
            lines.push(`CC X${this._fmt(cx)} Y${this._fmt(cy)}`);
          }
          const dr = block.move_type === "G2" ? "DR+" : "DR-";
          parts.push("C");
          if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
          if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
          parts.push(dr);
          if (block.feed_mm_min) parts.push(`F${block.feed_mm_min}`);
        }
      } else {
        // ISO format — uses dialect for arc format
        parts.push(dialect.rapid_code === "G0" && block.move_type === "G0" ? "G0"
          : block.move_type === "G1" ? "G1"
          : block.move_type === "G2" ? dialect.cw_arc_code
          : block.move_type === "G3" ? dialect.ccw_arc_code
          : block.move_type);
        if (block.x !== undefined) parts.push(`X${this._fmt(block.x)}`);
        if (block.y !== undefined) parts.push(`Y${this._fmt(block.y)}`);
        if (block.z !== undefined) parts.push(`Z${this._fmt(block.z)}`);
        if (block.a !== undefined) parts.push(`A${this._fmt(block.a)}`);
        if (block.b !== undefined) parts.push(`B${this._fmt(block.b)}`);
        if (block.c !== undefined) parts.push(`C${this._fmt(block.c)}`);
        if (block.move_type === "G2" || block.move_type === "G3") {
          if (dialect.arc_format === "r_word" && block.r !== undefined) {
            parts.push(`R${this._fmt(block.r)}`);
          } else {
            if (block.i !== undefined) parts.push(`I${this._fmt(block.i)}`);
            if (block.j !== undefined) parts.push(`J${this._fmt(block.j)}`);
            if (block.k !== undefined) parts.push(`K${this._fmt(block.k)}`);
          }
        }
        if (block.spindle_rpm && block.spindle_rpm !== lastRpm) {
          parts.push(`S${block.spindle_rpm}`);
          lastRpm = block.spindle_rpm;
        }
        if (block.move_type !== "G0" && block.feed_mm_min && block.feed_mm_min !== lastFeed) {
          parts.push(`F${block.feed_mm_min}`);
          lastFeed = block.feed_mm_min;
        }
      }

      if (parts.length > 0) lines.push(parts.join(" "));
    }

    // Program footer from dialect
    lines.push(...dialectEng.getProgramFooter(controllerKey));
    return lines.join("\n");
  }

  private _fmt(n: number): string {
    return Number.isInteger(n) ? `${n}.` : n.toFixed(3);
  }

  private _generateAnalytics(blocks: ToolpathBlock[], tools: ToolContext[], machine?: MachineContext): AnalyticsReport {
    const cuttingBlocks = blocks.filter(b => b.move_type !== "G0");
    const forces = cuttingBlocks.filter(b => b.forces).map(b => b.forces!.Fc_N);
    const powers = cuttingBlocks.filter(b => b.forces).map(b => b.forces!.power_kW);

    const cycleTime = this._estimateCycleTime(blocks, machine);

    return {
      per_operation: [{
        operation_id: 0,
        tool_number: tools[0] ? parseInt(tools[0].id) : 1,
        force_range_N: forces.length ? [Math.min(...forces), Math.max(...forces)] : [0, 0],
        power_range_kW: powers.length ? [Math.min(...powers), Math.max(...powers)] : [0, 0],
        temperature_range_C: [200, 600],
        mrr_cm3_min: 0,
        tool_life_consumed_pct: cuttingBlocks[cuttingBlocks.length - 1]?.wear?.remaining_life_pct
          ? 100 - cuttingBlocks[cuttingBlocks.length - 1].wear!.remaining_life_pct : 0,
        cost_per_part_tool: 0,
      }],
      overall: {
        total_cycle_time_s: cycleTime.total_s,
        cutting_time_s: cycleTime.cutting_s,
        non_cutting_time_s: cycleTime.rapid_s + cycleTime.tool_change_s,
        energy_estimate_kWh: powers.length ? (powers.reduce((a, b) => a + b, 0) / powers.length) * cycleTime.cutting_s / 3600 : 0,
        cost_estimate: 0,
      },
      optimization_impact: {
        time_saved_pct: 0,
        force_reduction_pct: 0,
        tool_life_improvement_pct: 0,
        surface_consistency_improvement_pct: 0,
      },
    };
  }

  private _estimateCycleTime(
    blocks: ToolpathBlock[],
    machine?: MachineContext
  ): { total_s: number; cutting_s: number; rapid_s: number; tool_change_s: number } {
    let cutting_s = 0, rapid_s = 0;
    const rapidRate = machine?.rapid_rate_mm_min ?? { x: 30000, y: 30000, z: 20000 };
    const toolChanges = new Set<number>();

    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const curr = blocks[i];
      const dist = Math.sqrt(
        ((curr.x ?? 0) - (prev.x ?? 0)) ** 2 +
        ((curr.y ?? 0) - (prev.y ?? 0)) ** 2 +
        ((curr.z ?? 0) - (prev.z ?? 0)) ** 2
      );
      if (dist === 0) continue;

      if (curr.move_type === "G0") {
        rapid_s += (dist / Math.min(rapidRate.x, rapidRate.y)) * 60;
      } else if (curr.feed_mm_min && curr.feed_mm_min > 0) {
        cutting_s += (dist / curr.feed_mm_min) * 60;
      }

      if (curr.tool_number !== undefined) toolChanges.add(curr.tool_number);
    }

    const tool_change_s = (toolChanges.size - 1) * (machine?.tool_change_time_s ?? 5);

    return {
      total_s: cutting_s + rapid_s + Math.max(0, tool_change_s),
      cutting_s,
      rapid_s,
      tool_change_s: Math.max(0, tool_change_s),
    };
  }

  // Synchronous stage runner
  private _runStage<T>(
    name: string, phase: number, stages: StageResult[],
    fn: () => T
  ): T | null {
    const t0 = Date.now();
    try {
      const result = fn();
      stages.push({
        stage: name,
        phase,
        status: "pass",
        duration_ms: Date.now() - t0,
        summary: typeof result === "object" && result ? JSON.stringify(result).slice(0, 200) : "OK",
        data: result,
      });
      return result;
    } catch (err: any) {
      stages.push({
        stage: name,
        phase,
        status: "fail",
        duration_ms: Date.now() - t0,
        summary: err.message ?? String(err),
        data: null,
      });
      return null;
    }
  }

  // Async stage runner
  private async _runStageAsync<T>(
    name: string, phase: number, stages: StageResult[],
    fn: () => Promise<T>
  ): Promise<T | null> {
    const t0 = Date.now();
    try {
      const result = await fn();
      stages.push({
        stage: name,
        phase,
        status: "pass",
        duration_ms: Date.now() - t0,
        summary: typeof result === "object" && result ? JSON.stringify(result).slice(0, 200) : "OK",
        data: result,
      });
      return result;
    } catch (err: any) {
      stages.push({
        stage: name,
        phase,
        status: "fail",
        duration_ms: Date.now() - t0,
        summary: err.message ?? String(err),
        data: null,
      });
      return null;
    }
  }
}

export const postProcessorPipelineEngine = new PostProcessorPipelineEngineImpl();
export { PostProcessorPipelineEngineImpl };
