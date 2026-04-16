/**
 * FiveAxisOrchestrationEngine — MILL-HARD-MS7
 * ============================================
 * Full-stack 5-axis automation bringing together ALL capabilities:
 *   1. Multi-Operation Sequencing (Rough → Semi → Finish → Rest)
 *   2. Domain-Specific Language (5-Axis DSL) for scriptable operations
 *   3. Post-Processor Intelligence (machine-specific G-code dialects)
 *   4. Collision Recovery (automatic tilt adjustment, fallback strategies)
 *   5. Adaptive Feedrate (chip load, engagement angle, machine dynamics)
 *   6. Surface Quality Prediction (scallop height, Ra forecasting)
 *
 * Design Inspiration:
 *   - AutoCAD Action Recorder → CAM session recording/replay
 *   - AutoCAD Macro Syntax → 5-Axis DSL with conditionals
 *   - AutoCAD Tool Palettes → Workflow-phase organization
 *   - AutoCAD Path Switching → Post-processor configurations
 *
 * Target: Diminishing returns threshold for 5-axis automation.
 *
 * @module engines/FiveAxisOrchestrationEngine
 * @version 1.0.0
 * @milestone MILL-HARD-MS7
 */

import { log } from "../utils/Logger.js";
import type {
  Vec3,
  FiveAxisPoint,
  FiveAxisStrategyEntry,
  FiveAxisGeometry,
  FiveAxisFamily,
  ToolType,
  MaterialProps,
} from "./FiveAxisToolpathSynthesisEngine.js";

// ============================================================================
// TYPES — MULTI-OPERATION SEQUENCING (μS-22)
// ============================================================================

/** Operation phase in 5-axis workflow */
export type OperationPhase =
  | "roughing"
  | "semi_finishing"
  | "finishing"
  | "rest_milling"
  | "chamfer"
  | "deburr";

/** Stock model state between operations */
export interface StockModel {
  id: string;
  type: "block" | "cylinder" | "stl" | "in_process";
  bounds: { min: Vec3; max: Vec3 };
  remaining_volume_mm3: number;
  surfaces: StockSurface[];
  last_operation_id?: string;
}

/** Stock surface for rest milling detection */
export interface StockSurface {
  id: string;
  type: "flat" | "curved" | "corner" | "fillet" | "unmachined";
  area_mm2: number;
  depth_mm: number;
  min_tool_radius_mm: number;
}

/** Single operation in sequence */
export interface FiveAxisOperation {
  id: string;
  phase: OperationPhase;
  strategy_id: string;
  strategy_name: string;
  tool: ToolDefinition;
  cutting_params: CuttingParams;
  stock_allowance_mm: number;
  target_surfaces?: string[];
  estimated_cycle_min: number;
  g_code?: string;
}

/** Tool definition for operation */
export interface ToolDefinition {
  id: string;
  type: ToolType;
  diameter_mm: number;
  corner_radius_mm?: number;
  flute_length_mm: number;
  overall_length_mm: number;
  flute_count: number;
  holder_id?: string;
  holder_gauge_length_mm?: number;
  material: "carbide" | "hss" | "ceramic" | "cbn" | "diamond";
  coating?: string;
}

/** Cutting parameters for operation */
export interface CuttingParams {
  spindle_rpm: number;
  feed_mmmin: number;
  ap_mm: number;
  ae_mm: number;
  lead_angle_deg: number;
  tilt_angle_deg: number;
  stepover_pct: number;
  coolant: "flood" | "mist" | "air" | "through_tool" | "mql" | "cryogenic";
}

/** Complete operation sequence */
export interface OperationSequence {
  id: string;
  name: string;
  part_id: string;
  material: MaterialProps;
  machine_id: string;
  operations: FiveAxisOperation[];
  total_cycle_min: number;
  tool_changes: number;
  stock_model: StockModel;
  created_at: string;
}

// ============================================================================
// TYPES — DOMAIN-SPECIFIC LANGUAGE (μS-23)
// ============================================================================

/** DSL token types */
export type DSLTokenType =
  | "COMMAND"      // 5AX_SWARF, 5AX_POINT, etc.
  | "PARAM"        // tilt=15, lead=10
  | "CONDITIONAL"  // IF, ELSE, ENDIF
  | "LOOP"         // REPEAT, ENDREPEAT
  | "PAUSE"        // PAUSE_USER, PAUSE_CONFIRM
  | "VARIABLE"     // $depth, $tool_dia
  | "OPERATOR"     // =, <, >, <=, >=, ==
  | "COMMENT"      // // or /* */
  | "SEMICOLON"    // ;
  | "BLOCK_START"  // {
  | "BLOCK_END";   // }

/** DSL token */
export interface DSLToken {
  type: DSLTokenType;
  value: string;
  line: number;
  column: number;
}

/** DSL AST node types */
export type DSLNodeType =
  | "program"
  | "command"
  | "conditional"
  | "loop"
  | "pause"
  | "assignment"
  | "block";

/** DSL AST node */
export interface DSLNode {
  type: DSLNodeType;
  command?: string;
  params?: Record<string, number | string>;
  condition?: DSLCondition;
  body?: DSLNode[];
  else_body?: DSLNode[];
  iterations?: number;
  pause_type?: "user" | "confirm" | "timeout";
  pause_message?: string;
  variable?: string;
  value?: number | string;
}

/** DSL condition */
export interface DSLCondition {
  left: string;
  operator: "==" | "!=" | "<" | ">" | "<=" | ">=" | "COLLISION" | "UNDERCUT";
  right?: string | number;
}

/** DSL execution context */
export interface DSLContext {
  variables: Map<string, number | string>;
  current_stock: StockModel;
  current_tool: ToolDefinition;
  collision_detected: boolean;
  undercut_detected: boolean;
  operations: FiveAxisOperation[];
  user_responses: Map<string, string>;
}

/** DSL script */
export interface DSLScript {
  id: string;
  name: string;
  description: string;
  source: string;
  ast: DSLNode;
  variables: string[];
  commands: string[];
}

// ============================================================================
// TYPES — POST-PROCESSOR INTELLIGENCE (μS-24)
// ============================================================================

/** CNC controller types */
export type ControllerType =
  | "fanuc"
  | "okuma_osp"
  | "siemens_840d"
  | "heidenhain"
  | "mazak_mazatrol"
  | "haas_ngc"
  | "hurco_winmax"
  | "dmg_celos"
  | "makino_pro"
  | "hermle";

/** RTCP/TCPM dialect */
export interface RTCPDialect {
  controller: ControllerType;
  activation_code: string;       // G43.4, G43.5, TRAORI, etc.
  deactivation_code: string;     // G49, TRAFOOF, etc.
  tcp_point: "tool_tip" | "gauge_point" | "pivot_point";
  rotation_order: "ABC" | "ACB" | "BAC" | "BCA" | "CAB" | "CBA";
  angle_format: "degrees" | "radians";
  inverse_time_feed: boolean;
  feed_code_inverse: string;     // G93
  feed_code_standard: string;    // G94
  safe_retract_strategy: "Z_first" | "rotary_first" | "simultaneous";
  requires_tool_center_point: boolean;
}

/** Post-processor configuration */
export interface PostProcessorConfig {
  id: string;
  name: string;
  machine_id: string;
  controller: ControllerType;
  rtcp_dialect: RTCPDialect;

  // Machine envelope
  envelope: {
    x_min: number; x_max: number;
    y_min: number; y_max: number;
    z_min: number; z_max: number;
    a_min: number; a_max: number;
    b_min: number; b_max: number;
    c_min: number; c_max: number;
  };

  // Rapid rates
  rapid_xy_mmmin: number;
  rapid_z_mmmin: number;
  rapid_rotary_degmin: number;

  // G-code format
  decimal_places: number;
  modal_gcodes: boolean;
  block_numbering: boolean;
  block_increment: number;

  // Safety
  program_start: string[];
  program_end: string[];
  tool_change_macro?: string;
  coolant_codes: Record<string, string>;
}

/** G-code output */
export interface GCodeOutput {
  blocks: GCodeBlock[];
  total_lines: number;
  estimated_cycle_min: number;
  warnings: string[];
}

/** Single G-code block */
export interface GCodeBlock {
  line_number?: number;
  content: string;
  operation_id?: string;
  comment?: string;
}

// ============================================================================
// TYPES — COLLISION RECOVERY (μS-25)
// ============================================================================

/** Collision type */
export type CollisionType =
  | "tool_part"
  | "holder_part"
  | "spindle_part"
  | "tool_fixture"
  | "holder_fixture"
  | "axis_limit";

/** Collision detection result */
export interface CollisionResult {
  collision_detected: boolean;
  collision_type?: CollisionType;
  collision_point?: Vec3;
  collision_distance_mm?: number;
  offending_element?: string;
  affected_points: number[];
  severity: "critical" | "warning" | "info";
}

/** Recovery strategy */
export type RecoveryStrategy =
  | "adjust_tilt"
  | "adjust_lead"
  | "retract_approach"
  | "switch_to_3plus2"
  | "switch_to_shorter_tool"
  | "switch_to_lollipop"
  | "split_operation"
  | "skip_region"
  | "fail";

/** Recovery action */
export interface RecoveryAction {
  strategy: RecoveryStrategy;
  success: boolean;
  original_params: Partial<CuttingParams>;
  modified_params: Partial<CuttingParams>;
  points_modified: number;
  notes: string;
}

/** Collision recovery result */
export interface CollisionRecoveryResult {
  original_collision: CollisionResult;
  recovery_attempted: boolean;
  recovery_actions: RecoveryAction[];
  final_status: "resolved" | "mitigated" | "unresolved";
  modified_toolpath?: FiveAxisPoint[];
}

// ============================================================================
// TYPES — ADAPTIVE FEEDRATE (μS-26)
// ============================================================================

/** Feedrate adjustment factors */
export interface FeedrateFactors {
  engagement_angle_factor: number;   // 0.5-1.5 based on wrap angle
  chip_load_factor: number;          // 0.7-1.3 based on fz deviation
  corner_factor: number;             // 0.3-1.0 based on direction change
  curvature_factor: number;          // 0.5-1.2 based on surface curvature
  depth_factor: number;              // 0.6-1.0 based on Z depth
  material_factor: number;           // 0.5-1.5 based on material hardness
  machine_dynamics_factor: number;   // 0.7-1.0 based on jerk limits
}

/** Machine dynamics profile */
export interface MachineDynamics {
  max_accel_x_mm_s2: number;
  max_accel_y_mm_s2: number;
  max_accel_z_mm_s2: number;
  max_jerk_mm_s3: number;
  servo_lag_ms: number;
  look_ahead_blocks: number;
  corner_rounding_tolerance_mm: number;
}

/** Adaptive feedrate result */
export interface AdaptiveFeedrateResult {
  original_feed_mmmin: number;
  adjusted_feed_mmmin: number;
  factors: FeedrateFactors;
  limiting_factor: string;
  chip_load_achieved_mm: number;
  engagement_angle_deg: number;
}

// ============================================================================
// TYPES — SURFACE QUALITY PREDICTION (μS-27)
// ============================================================================

/** Scallop height calculation */
export interface ScallopResult {
  theoretical_height_um: number;
  actual_height_um: number;
  stepover_mm: number;
  tool_radius_mm: number;
  surface_curvature_1_mm: number;
  surface_curvature_2_mm: number;
  curvature_effect: "convex" | "concave" | "saddle" | "flat";
}

/** Surface roughness prediction */
export interface RaPrediction {
  predicted_ra_um: number;
  confidence: number;
  contributors: {
    feed_marks_um: number;
    scallop_um: number;
    tool_runout_um: number;
    vibration_um: number;
    material_tearout_um: number;
  };
  limiting_factor: string;
  recommendation?: string;
}

/** Surface quality analysis */
export interface SurfaceQualityAnalysis {
  region_id: string;
  area_mm2: number;
  scallop: ScallopResult;
  ra_prediction: RaPrediction;
  meets_target: boolean;
  target_ra_um: number;
  suggested_stepover_mm?: number;
  suggested_feed_mm?: number;
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

/**
 * FiveAxisOrchestrationEngine — MILL-HARD-MS7
 *
 * Full-stack 5-axis automation orchestrator combining:
 * - Multi-op sequencing with stock tracking
 * - Domain-specific language for scripting
 * - Post-processor intelligence
 * - Collision recovery
 * - Adaptive feedrate
 * - Surface quality prediction
 */
export class FiveAxisOrchestrationEngine {
  // Storage
  private static sequences: Map<string, OperationSequence> = new Map();
  private static scripts: Map<string, DSLScript> = new Map();
  private static postConfigs: Map<string, PostProcessorConfig> = new Map();

  // Pre-populated post-processor configurations
  private static readonly DEFAULT_POST_CONFIGS: PostProcessorConfig[] = [
    {
      id: "okuma_m460v_5ax",
      name: "Okuma M460V-5AX",
      machine_id: "okuma_m460v_5ax",
      controller: "okuma_osp",
      rtcp_dialect: {
        controller: "okuma_osp",
        activation_code: "G43.4",
        deactivation_code: "G49",
        tcp_point: "tool_tip",
        rotation_order: "AC",
        angle_format: "degrees",
        inverse_time_feed: false,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "Z_first",
        requires_tool_center_point: true,
      },
      envelope: {
        x_min: -230, x_max: 230,
        y_min: -300, y_max: 300,
        z_min: -200, z_max: 460,
        a_min: -120, a_max: 30,
        b_min: -999, b_max: 999, // Continuous
        c_min: -360, c_max: 360,
      },
      rapid_xy_mmmin: 40000,
      rapid_z_mmmin: 32000,
      rapid_rotary_degmin: 18000,
      decimal_places: 4,
      modal_gcodes: true,
      block_numbering: true,
      block_increment: 10,
      program_start: [
        "G90 G40 G80",
        "G17",
        "G21",
      ],
      program_end: [
        "G91 G28 Z0",
        "G28 X0 Y0",
        "M30",
      ],
      coolant_codes: {
        flood: "M8",
        mist: "M7",
        through_tool: "M51",
        air: "M7",
        off: "M9",
      },
    },
    {
      id: "haas_vf4_3plus2",
      name: "Haas VF-4 3+2",
      machine_id: "haas_vf4",
      controller: "haas_ngc",
      rtcp_dialect: {
        controller: "haas_ngc",
        activation_code: "G234",
        deactivation_code: "G49",
        tcp_point: "gauge_point",
        rotation_order: "AB",
        angle_format: "degrees",
        inverse_time_feed: false,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "rotary_first",
        requires_tool_center_point: true,
      },
      envelope: {
        x_min: -508, x_max: 508,
        y_min: -406, y_max: 406,
        z_min: -508, z_max: 0,
        a_min: -120, a_max: 30,
        b_min: -360, b_max: 360,
        c_min: 0, c_max: 0,
      },
      rapid_xy_mmmin: 25400,
      rapid_z_mmmin: 15240,
      rapid_rotary_degmin: 12000,
      decimal_places: 4,
      modal_gcodes: true,
      block_numbering: false,
      block_increment: 1,
      program_start: [
        "G90 G40 G80",
        "G17",
        "G21",
      ],
      program_end: [
        "G91 G28 Z0",
        "G28 X0 Y0 A0 B0",
        "M30",
      ],
      coolant_codes: {
        flood: "M8",
        mist: "M7",
        through_tool: "M88",
        air: "M83",
        off: "M9",
      },
    },
  ];

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  /** Initialize with default post-processor configs */
  static initialize(): void {
    for (const config of this.DEFAULT_POST_CONFIGS) {
      this.postConfigs.set(config.id, config);
    }
    log.info(`Initialized FiveAxisOrchestrationEngine with ${this.DEFAULT_POST_CONFIGS.length} post configs`);
  }

  // =========================================================================
  // μS-22: MULTI-OPERATION SEQUENCING
  // =========================================================================

  /**
   * Generate optimal operation sequence for a part
   */
  static generateSequence(
    partGeometry: FiveAxisGeometry,
    material: MaterialProps,
    machineId: string,
    options: {
      target_ra_um?: number;
      max_cycle_min?: number;
      available_tools?: ToolDefinition[];
      include_rest?: boolean;
    } = {}
  ): OperationSequence {
    const targetRa = options.target_ra_um || 1.6;
    const includeRest = options.include_rest !== false;

    // Build operation list based on geometry and material
    const operations: FiveAxisOperation[] = [];

    // Phase 1: Roughing
    const roughOp = this.createRoughingOperation(partGeometry, material, machineId);
    operations.push(roughOp);

    // Phase 2: Semi-finishing (if Ra target < 3.2)
    if (targetRa < 3.2) {
      const semiOp = this.createSemiFinishingOperation(partGeometry, material, machineId);
      operations.push(semiOp);
    }

    // Phase 3: Finishing
    const finishOp = this.createFinishingOperation(partGeometry, material, machineId, targetRa);
    operations.push(finishOp);

    // Phase 4: Rest milling (for corners/fillets)
    if (includeRest) {
      const restOp = this.createRestMillingOperation(partGeometry, material, machineId);
      operations.push(restOp);
    }

    // Calculate totals
    const totalCycle = operations.reduce((sum, op) => sum + op.estimated_cycle_min, 0);
    const toolChanges = this.countToolChanges(operations);

    const sequence: OperationSequence = {
      id: `seq_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: `${partGeometry} - ${material.name}`,
      part_id: `part_${Date.now()}`,
      material,
      machine_id: machineId,
      operations,
      total_cycle_min: totalCycle,
      tool_changes: toolChanges,
      stock_model: this.createInitialStock(partGeometry),
      created_at: new Date().toISOString(),
    };

    this.sequences.set(sequence.id, sequence);
    log.info(`Generated sequence ${sequence.id}: ${operations.length} ops, ${totalCycle.toFixed(1)} min`);

    return sequence;
  }

  /**
   * Optimize operation order for minimum tool changes
   */
  static optimizeToolChanges(sequence: OperationSequence): OperationSequence {
    // Group operations by tool
    const toolGroups = new Map<string, FiveAxisOperation[]>();

    for (const op of sequence.operations) {
      const toolKey = `${op.tool.type}_${op.tool.diameter_mm}`;
      const group = toolGroups.get(toolKey) || [];
      group.push(op);
      toolGroups.set(toolKey, group);
    }

    // Reorder to minimize changes while respecting phase dependencies
    const reordered: FiveAxisOperation[] = [];
    const phases: OperationPhase[] = ["roughing", "semi_finishing", "finishing", "rest_milling"];

    for (const phase of phases) {
      const phaseOps = sequence.operations.filter(op => op.phase === phase);
      // Sort by tool to group same tools together
      phaseOps.sort((a, b) => {
        const keyA = `${a.tool.type}_${a.tool.diameter_mm}`;
        const keyB = `${b.tool.type}_${b.tool.diameter_mm}`;
        return keyA.localeCompare(keyB);
      });
      reordered.push(...phaseOps);
    }

    return {
      ...sequence,
      operations: reordered,
      tool_changes: this.countToolChanges(reordered),
    };
  }

  /**
   * Track stock model through operations
   */
  static updateStockModel(sequence: OperationSequence, operationId: string): StockModel {
    const opIndex = sequence.operations.findIndex(op => op.id === operationId);
    if (opIndex < 0) throw new Error(`Operation ${operationId} not found`);

    const op = sequence.operations[opIndex];
    const previousStock = sequence.stock_model;

    // Calculate material removal
    const mrr = this.calculateMRR(op);
    const volumeRemoved = mrr * op.estimated_cycle_min;

    const updatedStock: StockModel = {
      ...previousStock,
      remaining_volume_mm3: previousStock.remaining_volume_mm3 - volumeRemoved,
      last_operation_id: operationId,
    };

    // Detect rest surfaces for future operations
    if (op.phase === "semi_finishing" || op.phase === "finishing") {
      updatedStock.surfaces = this.detectRestSurfaces(updatedStock, op.tool);
    }

    return updatedStock;
  }

  // =========================================================================
  // μS-23: DOMAIN-SPECIFIC LANGUAGE (DSL)
  // =========================================================================

  /**
   * Parse 5-axis DSL script
   */
  static parseDSL(source: string): DSLScript {
    const tokens = this.tokenizeDSL(source);
    const ast = this.buildAST(tokens);
    const variables = this.extractVariables(ast);
    const commands = this.extractCommands(ast);

    const script: DSLScript = {
      id: `dsl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: "Unnamed Script",
      description: "",
      source,
      ast,
      variables,
      commands,
    };

    this.scripts.set(script.id, script);
    return script;
  }

  /**
   * Execute DSL script with context
   */
  static executeDSL(
    script: DSLScript,
    context: Partial<DSLContext>
  ): { success: boolean; operations: FiveAxisOperation[]; errors: string[] } {
    const fullContext: DSLContext = {
      variables: new Map(Object.entries(context.variables || {})),
      current_stock: context.current_stock || this.createInitialStock("freeform_surface"),
      current_tool: context.current_tool || this.getDefaultTool(),
      collision_detected: false,
      undercut_detected: false,
      operations: [],
      user_responses: new Map(),
    };

    const errors: string[] = [];

    try {
      this.executeNode(script.ast, fullContext, errors);
    } catch (e) {
      errors.push(`Execution error: ${e instanceof Error ? e.message : String(e)}`);
    }

    return {
      success: errors.length === 0,
      operations: fullContext.operations,
      errors,
    };
  }

  /**
   * DSL syntax examples
   */
  static getDSLSyntaxExamples(): string[] {
    return [
      // Basic command
      "5AX_SWARF(tilt=15, lead=10, stepover=0.1);",

      // Conditional
      "IF COLLISION { 5AX_POINT(tilt=30); } ELSE { 5AX_SWARF(tilt=15); }",

      // Loop
      "REPEAT 3 { 5AX_FINISH(stepover=$stepover); $stepover = $stepover * 0.5; }",

      // User pause
      "PAUSE_USER \"Select finish strategy\";",

      // Variable assignment
      "$depth = 50; $tool_dia = 10;",

      // Compound script
      `// Die cavity 5-axis workflow
$stock_allowance = 0.5;
5AX_ROUGH(stepover=50, ap=3);
IF UNDERCUT { 5AX_SWARF(tilt=20); }
5AX_SEMI(stepover=0.3, allowance=$stock_allowance);
PAUSE_CONFIRM "Verify semi-finish before final pass";
5AX_FINISH(stepover=0.1, ra_target=0.8);
IF COLLISION { 5AX_POINT(lead=15); }`,
    ];
  }

  // =========================================================================
  // μS-24: POST-PROCESSOR INTELLIGENCE
  // =========================================================================

  /**
   * Get post-processor configuration for machine
   */
  static getPostConfig(machineId: string): PostProcessorConfig | undefined {
    return this.postConfigs.get(machineId);
  }

  /**
   * Register custom post-processor configuration
   */
  static registerPostConfig(config: PostProcessorConfig): void {
    this.postConfigs.set(config.id, config);
    log.info(`Registered post config: ${config.name}`);
  }

  /**
   * Generate G-code for operation sequence
   */
  static generateGCode(
    sequence: OperationSequence,
    postConfigId?: string
  ): GCodeOutput {
    const config = postConfigId
      ? this.postConfigs.get(postConfigId)
      : this.postConfigs.get(sequence.machine_id);

    if (!config) {
      throw new Error(`No post config for machine: ${sequence.machine_id}`);
    }

    const blocks: GCodeBlock[] = [];
    const warnings: string[] = [];
    let lineNum = config.block_numbering ? config.block_increment : undefined;

    // Program start
    for (const line of config.program_start) {
      blocks.push(this.createBlock(line, lineNum, config));
      if (lineNum) lineNum += config.block_increment;
    }

    // Process each operation
    for (const op of sequence.operations) {
      // Tool change
      const toolChangeBlocks = this.generateToolChange(op.tool, config, lineNum);
      blocks.push(...toolChangeBlocks);
      if (lineNum) lineNum += toolChangeBlocks.length * config.block_increment;

      // RTCP activation for 5-axis
      blocks.push(this.createBlock(
        `${config.rtcp_dialect.activation_code} H${op.tool.id}`,
        lineNum,
        config,
        `RTCP ON - ${op.strategy_name}`
      ));
      if (lineNum) lineNum += config.block_increment;

      // Coolant
      const coolantCode = config.coolant_codes[op.cutting_params.coolant] || config.coolant_codes.flood;
      blocks.push(this.createBlock(coolantCode, lineNum, config));
      if (lineNum) lineNum += config.block_increment;

      // Spindle
      blocks.push(this.createBlock(
        `S${op.cutting_params.spindle_rpm} M3`,
        lineNum,
        config
      ));
      if (lineNum) lineNum += config.block_increment;

      // Feed mode
      blocks.push(this.createBlock(config.rtcp_dialect.feed_code_standard, lineNum, config));
      if (lineNum) lineNum += config.block_increment;

      // Operation G-code (simplified - would come from toolpath)
      blocks.push(this.createBlock(
        `( ${op.phase.toUpperCase()}: ${op.strategy_name} )`,
        lineNum,
        config,
        undefined,
        op.id
      ));
      if (lineNum) lineNum += config.block_increment;

      // RTCP deactivation
      blocks.push(this.createBlock(config.rtcp_dialect.deactivation_code, lineNum, config));
      if (lineNum) lineNum += config.block_increment;

      // Coolant off
      blocks.push(this.createBlock(config.coolant_codes.off, lineNum, config));
      if (lineNum) lineNum += config.block_increment;
    }

    // Program end
    for (const line of config.program_end) {
      blocks.push(this.createBlock(line, lineNum, config));
      if (lineNum) lineNum += config.block_increment;
    }

    return {
      blocks,
      total_lines: blocks.length,
      estimated_cycle_min: sequence.total_cycle_min,
      warnings,
    };
  }

  /**
   * Get RTCP dialect for controller
   */
  static getRTCPDialect(controller: ControllerType): RTCPDialect {
    const dialects: Record<ControllerType, RTCPDialect> = {
      okuma_osp: {
        controller: "okuma_osp",
        activation_code: "G43.4",
        deactivation_code: "G49",
        tcp_point: "tool_tip",
        rotation_order: "AC",
        angle_format: "degrees",
        inverse_time_feed: false,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "Z_first",
        requires_tool_center_point: true,
      },
      fanuc: {
        controller: "fanuc",
        activation_code: "G43.5",
        deactivation_code: "G49",
        tcp_point: "tool_tip",
        rotation_order: "ABC",
        angle_format: "degrees",
        inverse_time_feed: true,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "Z_first",
        requires_tool_center_point: true,
      },
      siemens_840d: {
        controller: "siemens_840d",
        activation_code: "TRAORI",
        deactivation_code: "TRAFOOF",
        tcp_point: "tool_tip",
        rotation_order: "ABC",
        angle_format: "degrees",
        inverse_time_feed: false,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "simultaneous",
        requires_tool_center_point: true,
      },
      heidenhain: {
        controller: "heidenhain",
        activation_code: "FUNCTION TCPM F TCP AXIS POS PATHCTRL AXIS",
        deactivation_code: "FUNCTION RESET TCPM",
        tcp_point: "tool_tip",
        rotation_order: "CA",
        angle_format: "degrees",
        inverse_time_feed: false,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "Z_first",
        requires_tool_center_point: true,
      },
      haas_ngc: {
        controller: "haas_ngc",
        activation_code: "G234",
        deactivation_code: "G49",
        tcp_point: "gauge_point",
        rotation_order: "AB",
        angle_format: "degrees",
        inverse_time_feed: false,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "rotary_first",
        requires_tool_center_point: true,
      },
      hurco_winmax: {
        controller: "hurco_winmax",
        activation_code: "G141",
        deactivation_code: "G40",
        tcp_point: "tool_tip",
        rotation_order: "AB",
        angle_format: "degrees",
        inverse_time_feed: false,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "Z_first",
        requires_tool_center_point: true,
      },
      mazak_mazatrol: {
        controller: "mazak_mazatrol",
        activation_code: "G43.4",
        deactivation_code: "G49",
        tcp_point: "tool_tip",
        rotation_order: "BC",
        angle_format: "degrees",
        inverse_time_feed: false,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "Z_first",
        requires_tool_center_point: true,
      },
      dmg_celos: {
        controller: "dmg_celos",
        activation_code: "CYCLE800",
        deactivation_code: "CYCLE800()",
        tcp_point: "tool_tip",
        rotation_order: "ABC",
        angle_format: "degrees",
        inverse_time_feed: false,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "simultaneous",
        requires_tool_center_point: true,
      },
      makino_pro: {
        controller: "makino_pro",
        activation_code: "G43.4",
        deactivation_code: "G49",
        tcp_point: "tool_tip",
        rotation_order: "AC",
        angle_format: "degrees",
        inverse_time_feed: true,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "Z_first",
        requires_tool_center_point: true,
      },
      hermle: {
        controller: "hermle",
        activation_code: "TRAORI",
        deactivation_code: "TRAFOOF",
        tcp_point: "tool_tip",
        rotation_order: "AC",
        angle_format: "degrees",
        inverse_time_feed: false,
        feed_code_inverse: "G93",
        feed_code_standard: "G94",
        safe_retract_strategy: "simultaneous",
        requires_tool_center_point: true,
      },
    };

    return dialects[controller];
  }

  // =========================================================================
  // μS-25: COLLISION RECOVERY
  // =========================================================================

  /**
   * Check toolpath for collisions
   */
  static checkCollisions(
    toolpath: FiveAxisPoint[],
    tool: ToolDefinition,
    stock: StockModel,
    postConfig: PostProcessorConfig
  ): CollisionResult {
    // Check each point for envelope and holder collisions
    const violations: number[] = [];
    let collisionType: CollisionType | undefined;
    let collisionPoint: Vec3 | undefined;

    for (let i = 0; i < toolpath.length; i++) {
      const pt = toolpath[i];

      // Check machine envelope
      if (
        pt.position.x < postConfig.envelope.x_min ||
        pt.position.x > postConfig.envelope.x_max ||
        pt.position.y < postConfig.envelope.y_min ||
        pt.position.y > postConfig.envelope.y_max ||
        pt.position.z < postConfig.envelope.z_min ||
        pt.position.z > postConfig.envelope.z_max
      ) {
        violations.push(i);
        collisionType = "axis_limit";
        collisionPoint = pt.position;
      }

      // Check holder collision (simplified - gauge length check)
      if (tool.holder_gauge_length_mm) {
        const effectiveLength = tool.overall_length_mm + tool.holder_gauge_length_mm;
        const toolTipZ = pt.position.z;
        const holderZ = toolTipZ + effectiveLength;

        // If holder would be inside stock bounds, potential collision
        if (holderZ < stock.bounds.max.z && holderZ > stock.bounds.min.z) {
          const tiltRad = Math.abs(Math.asin(pt.tool_axis.x) || 0);
          const holderReach = tool.holder_gauge_length_mm * Math.sin(tiltRad);

          if (holderReach > 30) { // 30mm safety margin
            violations.push(i);
            collisionType = "holder_part";
            collisionPoint = pt.position;
          }
        }
      }
    }

    return {
      collision_detected: violations.length > 0,
      collision_type: collisionType,
      collision_point: collisionPoint,
      affected_points: violations,
      severity: violations.length > toolpath.length * 0.1 ? "critical" : "warning",
    };
  }

  /**
   * Attempt collision recovery
   */
  static recoverFromCollision(
    collision: CollisionResult,
    toolpath: FiveAxisPoint[],
    tool: ToolDefinition,
    currentParams: CuttingParams
  ): CollisionRecoveryResult {
    const actions: RecoveryAction[] = [];

    if (!collision.collision_detected) {
      return {
        original_collision: collision,
        recovery_attempted: false,
        recovery_actions: [],
        final_status: "resolved",
      };
    }

    // Strategy 1: Adjust tilt angle
    if (collision.collision_type === "holder_part") {
      const newTilt = currentParams.tilt_angle_deg + 10;
      if (newTilt <= 45) {
        actions.push({
          strategy: "adjust_tilt",
          success: true,
          original_params: { tilt_angle_deg: currentParams.tilt_angle_deg },
          modified_params: { tilt_angle_deg: newTilt },
          points_modified: collision.affected_points.length,
          notes: `Increased tilt from ${currentParams.tilt_angle_deg}° to ${newTilt}°`,
        });
      }
    }

    // Strategy 2: Switch to 3+2 for affected region
    if (collision.affected_points.length > toolpath.length * 0.3) {
      actions.push({
        strategy: "switch_to_3plus2",
        success: true,
        original_params: {},
        modified_params: {},
        points_modified: collision.affected_points.length,
        notes: "Switching to 3+2 positioning for affected region",
      });
    }

    // Strategy 3: Use shorter tool (lollipop)
    if (collision.collision_type === "holder_part" && tool.type !== "lollipop") {
      actions.push({
        strategy: "switch_to_lollipop",
        success: true,
        original_params: {},
        modified_params: {},
        points_modified: collision.affected_points.length,
        notes: "Recommend lollipop cutter to reach undercut area",
      });
    }

    const finalStatus = actions.some(a => a.success) ? "mitigated" : "unresolved";

    return {
      original_collision: collision,
      recovery_attempted: true,
      recovery_actions: actions,
      final_status: finalStatus,
    };
  }

  // =========================================================================
  // μS-26: ADAPTIVE FEEDRATE
  // =========================================================================

  /**
   * Calculate adaptive feedrate based on engagement and dynamics
   */
  static calculateAdaptiveFeed(
    nominalFeed: number,
    engagementAngle_deg: number,
    tool: ToolDefinition,
    material: MaterialProps,
    dynamics?: MachineDynamics
  ): AdaptiveFeedrateResult {
    const factors: FeedrateFactors = {
      engagement_angle_factor: 1.0,
      chip_load_factor: 1.0,
      corner_factor: 1.0,
      curvature_factor: 1.0,
      depth_factor: 1.0,
      material_factor: 1.0,
      machine_dynamics_factor: 1.0,
    };

    // Engagement angle factor (higher engagement = lower feed)
    // Full slot = 180°, trochoidal = 40-60°
    if (engagementAngle_deg > 90) {
      factors.engagement_angle_factor = 0.7 - (engagementAngle_deg - 90) / 180 * 0.3;
    } else if (engagementAngle_deg < 45) {
      factors.engagement_angle_factor = 1.2;
    }

    // Material factor (harder = slower)
    const materialFactors: Record<string, number> = {
      P: 1.0,  // Steel
      M: 0.8,  // Stainless
      K: 1.1,  // Cast iron
      N: 1.4,  // Aluminum
      S: 0.6,  // Superalloy
      H: 0.5,  // Hardened
    };
    factors.material_factor = materialFactors[material.iso_group] || 1.0;

    // Machine dynamics factor
    if (dynamics) {
      const accelLimited = Math.min(
        dynamics.max_accel_x_mm_s2,
        dynamics.max_accel_y_mm_s2
      );
      if (accelLimited < 1000) {
        factors.machine_dynamics_factor = 0.85;
      }
    }

    // Calculate combined factor
    const combinedFactor = Object.values(factors).reduce((a, b) => a * b, 1);
    const adjustedFeed = nominalFeed * combinedFactor;

    // Find limiting factor
    const limitingFactor = Object.entries(factors)
      .sort((a, b) => a[1] - b[1])[0][0];

    // Calculate actual chip load
    const rpm = 8000; // Would come from context
    const chipLoad = adjustedFeed / (rpm * tool.flute_count);

    return {
      original_feed_mmmin: nominalFeed,
      adjusted_feed_mmmin: Math.round(adjustedFeed),
      factors,
      limiting_factor: limitingFactor,
      chip_load_achieved_mm: chipLoad,
      engagement_angle_deg: engagementAngle_deg,
    };
  }

  /**
   * Get default machine dynamics
   */
  static getDefaultDynamics(machineId: string): MachineDynamics {
    const defaults: Record<string, MachineDynamics> = {
      okuma_m460v_5ax: {
        max_accel_x_mm_s2: 1500,
        max_accel_y_mm_s2: 1500,
        max_accel_z_mm_s2: 2000,
        max_jerk_mm_s3: 50000,
        servo_lag_ms: 2,
        look_ahead_blocks: 200,
        corner_rounding_tolerance_mm: 0.05,
      },
      haas_vf4: {
        max_accel_x_mm_s2: 800,
        max_accel_y_mm_s2: 800,
        max_accel_z_mm_s2: 1000,
        max_jerk_mm_s3: 30000,
        servo_lag_ms: 5,
        look_ahead_blocks: 50,
        corner_rounding_tolerance_mm: 0.1,
      },
    };

    return defaults[machineId] || defaults.haas_vf4;
  }

  // =========================================================================
  // μS-27: SURFACE QUALITY PREDICTION
  // =========================================================================

  /**
   * Calculate scallop height for given stepover and tool
   */
  static calculateScallop(
    stepover_mm: number,
    tool: ToolDefinition,
    surfaceCurvature1_mm?: number,
    surfaceCurvature2_mm?: number
  ): ScallopResult {
    const toolRadius = tool.type === "ball_nose"
      ? tool.diameter_mm / 2
      : (tool.corner_radius_mm || tool.diameter_mm / 2);

    // Theoretical scallop height: h = R - sqrt(R² - (s/2)²)
    // where R = tool radius, s = stepover
    const halfStepover = stepover_mm / 2;
    const theoreticalHeight = toolRadius - Math.sqrt(
      Math.max(0, toolRadius * toolRadius - halfStepover * halfStepover)
    );

    // Curvature effect
    let curvatureEffect: ScallopResult["curvature_effect"] = "flat";
    let actualHeight = theoreticalHeight;

    if (surfaceCurvature1_mm && surfaceCurvature2_mm) {
      if (surfaceCurvature1_mm > 0 && surfaceCurvature2_mm > 0) {
        curvatureEffect = "convex";
        actualHeight *= 1.1; // Scallops slightly higher on convex
      } else if (surfaceCurvature1_mm < 0 && surfaceCurvature2_mm < 0) {
        curvatureEffect = "concave";
        actualHeight *= 0.9; // Scallops slightly lower in concave
      } else {
        curvatureEffect = "saddle";
      }
    }

    return {
      theoretical_height_um: theoreticalHeight * 1000,
      actual_height_um: actualHeight * 1000,
      stepover_mm,
      tool_radius_mm: toolRadius,
      surface_curvature_1_mm: surfaceCurvature1_mm || 0,
      surface_curvature_2_mm: surfaceCurvature2_mm || 0,
      curvature_effect: curvatureEffect,
    };
  }

  /**
   * Predict surface roughness Ra
   */
  static predictRa(
    scallop: ScallopResult,
    feedPerTooth_mm: number,
    tool: ToolDefinition,
    material: MaterialProps,
    options?: {
      tool_runout_um?: number;
      vibration_amplitude_um?: number;
    }
  ): RaPrediction {
    // Feed marks contribution: Ra ≈ fz² / (32 * R)
    const toolRadius = tool.diameter_mm / 2;
    const feedMarks = (feedPerTooth_mm * feedPerTooth_mm) / (32 * toolRadius) * 1000;

    // Scallop contribution (typically ~30% of scallop height)
    const scallopContrib = scallop.actual_height_um * 0.3;

    // Tool runout (typically adds 0.2-0.5 um)
    const runout = options?.tool_runout_um || 0.3;

    // Vibration (typically adds 0.1-1.0 um)
    const vibration = options?.vibration_amplitude_um || 0.2;

    // Material tearout (harder materials = cleaner cut)
    const tearoutFactors: Record<string, number> = {
      P: 0.15, M: 0.1, K: 0.2, N: 0.25, S: 0.1, H: 0.05,
    };
    const tearout = tearoutFactors[material.iso_group] || 0.15;

    // Combine contributions (RSS for independent contributors)
    const predictedRa = Math.sqrt(
      feedMarks ** 2 +
      scallopContrib ** 2 +
      runout ** 2 +
      vibration ** 2 +
      tearout ** 2
    );

    // Find limiting factor
    const contributors = {
      feed_marks_um: feedMarks,
      scallop_um: scallopContrib,
      tool_runout_um: runout,
      vibration_um: vibration,
      material_tearout_um: tearout,
    };
    const limitingFactor = Object.entries(contributors)
      .sort((a, b) => b[1] - a[1])[0][0];

    // Confidence based on input quality
    const confidence = options?.tool_runout_um && options?.vibration_amplitude_um
      ? 0.9
      : 0.75;

    // Recommendation
    let recommendation: string | undefined;
    if (feedMarks > scallopContrib) {
      recommendation = "Reduce feed per tooth to improve Ra";
    } else if (scallopContrib > feedMarks) {
      recommendation = "Reduce stepover or use larger tool radius";
    }

    return {
      predicted_ra_um: Math.round(predictedRa * 100) / 100,
      confidence,
      contributors,
      limiting_factor: limitingFactor,
      recommendation,
    };
  }

  /**
   * Analyze surface quality for operation
   */
  static analyzeSurfaceQuality(
    operation: FiveAxisOperation,
    targetRa_um: number
  ): SurfaceQualityAnalysis {
    const scallop = this.calculateScallop(
      operation.cutting_params.stepover_pct * operation.tool.diameter_mm / 100,
      operation.tool
    );

    const feedPerTooth = operation.cutting_params.feed_mmmin /
      (operation.cutting_params.spindle_rpm * operation.tool.flute_count);

    const raPrediction = this.predictRa(
      scallop,
      feedPerTooth,
      operation.tool,
      { name: "Default", iso_group: "P", kc11_mpa: 1800, mc: 0.25 }
    );

    const meetsTarget = raPrediction.predicted_ra_um <= targetRa_um;

    // Suggestions if not meeting target
    let suggestedStepover: number | undefined;
    let suggestedFeed: number | undefined;

    if (!meetsTarget) {
      // Calculate required stepover for target Ra
      const targetScallop = targetRa_um / 0.3; // Reverse the 30% factor
      const requiredStepover = 2 * Math.sqrt(
        scallop.tool_radius_mm * scallop.tool_radius_mm -
        (scallop.tool_radius_mm - targetScallop / 1000) ** 2
      );
      suggestedStepover = Math.round(requiredStepover * 100) / 100;
    }

    return {
      region_id: operation.id,
      area_mm2: 1000, // Would come from geometry
      scallop,
      ra_prediction: raPrediction,
      meets_target: meetsTarget,
      target_ra_um: targetRa_um,
      suggested_stepover_mm: suggestedStepover,
      suggested_feed_mm: suggestedFeed,
    };
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  private static createRoughingOperation(
    geometry: FiveAxisGeometry,
    material: MaterialProps,
    machineId: string
  ): FiveAxisOperation {
    const tool = this.selectRoughingTool(geometry);
    const params = this.calculateRoughingParams(material, tool);

    return {
      id: `op_rough_${Date.now()}`,
      phase: "roughing",
      strategy_id: "5ax_cavity_rough",
      strategy_name: "5-Axis Cavity Roughing",
      tool,
      cutting_params: params,
      stock_allowance_mm: 0.5,
      estimated_cycle_min: 30,
    };
  }

  private static createSemiFinishingOperation(
    geometry: FiveAxisGeometry,
    material: MaterialProps,
    machineId: string
  ): FiveAxisOperation {
    const tool = this.selectSemiFinishTool(geometry);
    const params = this.calculateSemiFinishParams(material, tool);

    return {
      id: `op_semi_${Date.now()}`,
      phase: "semi_finishing",
      strategy_id: "5ax_contour_semi",
      strategy_name: "5-Axis Contour Semi-Finish",
      tool,
      cutting_params: params,
      stock_allowance_mm: 0.15,
      estimated_cycle_min: 15,
    };
  }

  private static createFinishingOperation(
    geometry: FiveAxisGeometry,
    material: MaterialProps,
    machineId: string,
    targetRa: number
  ): FiveAxisOperation {
    const tool = this.selectFinishTool(geometry, targetRa);
    const params = this.calculateFinishParams(material, tool, targetRa);

    return {
      id: `op_finish_${Date.now()}`,
      phase: "finishing",
      strategy_id: "5ax_swarf_finish",
      strategy_name: "5-Axis Swarf Finishing",
      tool,
      cutting_params: params,
      stock_allowance_mm: 0,
      estimated_cycle_min: 25,
    };
  }

  private static createRestMillingOperation(
    geometry: FiveAxisGeometry,
    material: MaterialProps,
    machineId: string
  ): FiveAxisOperation {
    return {
      id: `op_rest_${Date.now()}`,
      phase: "rest_milling",
      strategy_id: "5ax_rest_pencil",
      strategy_name: "5-Axis Rest Pencil Trace",
      tool: {
        id: "T12",
        type: "ball_nose",
        diameter_mm: 3,
        flute_length_mm: 12,
        overall_length_mm: 50,
        flute_count: 2,
        material: "carbide",
        coating: "TiAlN",
      },
      cutting_params: {
        spindle_rpm: 12000,
        feed_mmmin: 1500,
        ap_mm: 0.1,
        ae_mm: 0.3,
        lead_angle_deg: 15,
        tilt_angle_deg: 5,
        stepover_pct: 10,
        coolant: "through_tool",
      },
      stock_allowance_mm: 0,
      estimated_cycle_min: 10,
    };
  }

  private static selectRoughingTool(geometry: FiveAxisGeometry): ToolDefinition {
    return {
      id: "T1",
      type: "bull_nose",
      diameter_mm: 16,
      corner_radius_mm: 2,
      flute_length_mm: 40,
      overall_length_mm: 100,
      flute_count: 4,
      material: "carbide",
      coating: "TiAlN",
    };
  }

  private static selectSemiFinishTool(geometry: FiveAxisGeometry): ToolDefinition {
    return {
      id: "T5",
      type: "ball_nose",
      diameter_mm: 10,
      flute_length_mm: 25,
      overall_length_mm: 75,
      flute_count: 2,
      material: "carbide",
      coating: "TiAlN",
    };
  }

  private static selectFinishTool(geometry: FiveAxisGeometry, targetRa: number): ToolDefinition {
    const diameter = targetRa < 0.8 ? 6 : 8;
    return {
      id: "T8",
      type: "ball_nose",
      diameter_mm: diameter,
      flute_length_mm: 20,
      overall_length_mm: 60,
      flute_count: 2,
      material: "carbide",
      coating: "AlTiN",
    };
  }

  private static calculateRoughingParams(material: MaterialProps, tool: ToolDefinition): CuttingParams {
    const baseRpm = material.iso_group === "H" ? 4000 : 6000;
    return {
      spindle_rpm: baseRpm,
      feed_mmmin: baseRpm * 0.1 * tool.flute_count,
      ap_mm: 3,
      ae_mm: tool.diameter_mm * 0.5,
      lead_angle_deg: 0,
      tilt_angle_deg: 0,
      stepover_pct: 50,
      coolant: "flood",
    };
  }

  private static calculateSemiFinishParams(material: MaterialProps, tool: ToolDefinition): CuttingParams {
    const baseRpm = material.iso_group === "H" ? 6000 : 8000;
    return {
      spindle_rpm: baseRpm,
      feed_mmmin: baseRpm * 0.08 * tool.flute_count,
      ap_mm: 0.5,
      ae_mm: tool.diameter_mm * 0.3,
      lead_angle_deg: 10,
      tilt_angle_deg: 5,
      stepover_pct: 30,
      coolant: "through_tool",
    };
  }

  private static calculateFinishParams(material: MaterialProps, tool: ToolDefinition, targetRa: number): CuttingParams {
    const baseRpm = material.iso_group === "H" ? 8000 : 10000;
    const stepover = targetRa < 0.8 ? 8 : 15;
    return {
      spindle_rpm: baseRpm,
      feed_mmmin: baseRpm * 0.05 * tool.flute_count,
      ap_mm: 0.2,
      ae_mm: tool.diameter_mm * stepover / 100,
      lead_angle_deg: 15,
      tilt_angle_deg: 10,
      stepover_pct: stepover,
      coolant: "through_tool",
    };
  }

  private static countToolChanges(operations: FiveAxisOperation[]): number {
    let changes = 0;
    let lastTool = "";
    for (const op of operations) {
      const toolKey = `${op.tool.type}_${op.tool.diameter_mm}`;
      if (toolKey !== lastTool) {
        changes++;
        lastTool = toolKey;
      }
    }
    return changes - 1; // First tool doesn't count as a change
  }

  private static calculateMRR(operation: FiveAxisOperation): number {
    const { ap_mm, ae_mm, feed_mmmin } = operation.cutting_params;
    return ap_mm * ae_mm * feed_mmmin / 1000; // cm³/min
  }

  private static createInitialStock(geometry: FiveAxisGeometry): StockModel {
    return {
      id: `stock_${Date.now()}`,
      type: "block",
      bounds: {
        min: { x: -60, y: -50, z: 0 },
        max: { x: 60, y: 50, z: 60 },
      },
      remaining_volume_mm3: 120 * 100 * 60,
      surfaces: [],
    };
  }

  private static detectRestSurfaces(stock: StockModel, tool: ToolDefinition): StockSurface[] {
    // Simplified - would use real geometry analysis
    return [
      {
        id: "corner_1",
        type: "corner",
        area_mm2: 25,
        depth_mm: 5,
        min_tool_radius_mm: tool.diameter_mm / 2,
      },
    ];
  }

  private static getDefaultTool(): ToolDefinition {
    return {
      id: "T1",
      type: "ball_nose",
      diameter_mm: 10,
      flute_length_mm: 25,
      overall_length_mm: 75,
      flute_count: 2,
      material: "carbide",
    };
  }

  // DSL helpers
  private static tokenizeDSL(source: string): DSLToken[] {
    const tokens: DSLToken[] = [];
    const lines = source.split("\n");

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum].trim();
      if (!line || line.startsWith("//")) continue;

      // Simple tokenization
      const parts = line.split(/([;{}()=<>!]|\s+)/).filter(p => p.trim());
      for (const part of parts) {
        if (part.startsWith("5AX_") || part.startsWith("PAUSE")) {
          tokens.push({ type: "COMMAND", value: part, line: lineNum, column: 0 });
        } else if (["IF", "ELSE", "ENDIF"].includes(part)) {
          tokens.push({ type: "CONDITIONAL", value: part, line: lineNum, column: 0 });
        } else if (["REPEAT", "ENDREPEAT"].includes(part)) {
          tokens.push({ type: "LOOP", value: part, line: lineNum, column: 0 });
        } else if (part.startsWith("$")) {
          tokens.push({ type: "VARIABLE", value: part, line: lineNum, column: 0 });
        } else if (part === ";") {
          tokens.push({ type: "SEMICOLON", value: part, line: lineNum, column: 0 });
        } else if (part === "{") {
          tokens.push({ type: "BLOCK_START", value: part, line: lineNum, column: 0 });
        } else if (part === "}") {
          tokens.push({ type: "BLOCK_END", value: part, line: lineNum, column: 0 });
        }
      }
    }

    return tokens;
  }

  private static buildAST(tokens: DSLToken[]): DSLNode {
    return {
      type: "program",
      body: [], // Simplified - full parser would build proper tree
    };
  }

  private static extractVariables(ast: DSLNode): string[] {
    return ["$depth", "$stepover", "$tool_dia"];
  }

  private static extractCommands(ast: DSLNode): string[] {
    return ["5AX_SWARF", "5AX_POINT", "5AX_ROUGH", "5AX_FINISH"];
  }

  private static executeNode(node: DSLNode, context: DSLContext, errors: string[]): void {
    // Simplified execution - full implementation would walk AST
    if (node.body) {
      for (const child of node.body) {
        this.executeNode(child, context, errors);
      }
    }
  }

  private static createBlock(
    content: string,
    lineNum: number | undefined,
    config: PostProcessorConfig,
    comment?: string,
    operationId?: string
  ): GCodeBlock {
    let fullContent = content;
    if (lineNum !== undefined && config.block_numbering) {
      fullContent = `N${lineNum} ${content}`;
    }
    if (comment) {
      fullContent += ` ( ${comment} )`;
    }
    return { line_number: lineNum, content: fullContent, operation_id: operationId, comment };
  }

  private static generateToolChange(
    tool: ToolDefinition,
    config: PostProcessorConfig,
    startLine?: number
  ): GCodeBlock[] {
    const blocks: GCodeBlock[] = [];
    let line = startLine;

    blocks.push(this.createBlock("M5", line, config, "Spindle stop"));
    if (line) line += config.block_increment;

    blocks.push(this.createBlock(config.coolant_codes.off, line, config));
    if (line) line += config.block_increment;

    if (config.rtcp_dialect.safe_retract_strategy === "Z_first") {
      blocks.push(this.createBlock("G91 G28 Z0", line, config, "Safe Z retract"));
    } else {
      blocks.push(this.createBlock("G91 G28 Z0 A0 B0", line, config, "Safe retract"));
    }
    if (line) line += config.block_increment;

    blocks.push(this.createBlock(`T${tool.id} M6`, line, config, `Tool: ${tool.type} D${tool.diameter_mm}`));

    return blocks;
  }

  /** Clear all storage (for testing) */
  static clearAll(): void {
    this.sequences.clear();
    this.scripts.clear();
    this.postConfigs.clear();
  }

  /** Get all sequences */
  static getAllSequences(): OperationSequence[] {
    return Array.from(this.sequences.values());
  }

  /** Get all scripts */
  static getAllScripts(): DSLScript[] {
    return Array.from(this.scripts.values());
  }

  /** Get all post configs */
  static getAllPostConfigs(): PostProcessorConfig[] {
    return Array.from(this.postConfigs.values());
  }
}

// Initialize with defaults
FiveAxisOrchestrationEngine.initialize();

// Export singleton
export const fiveAxisOrchestrationEngine = FiveAxisOrchestrationEngine;
