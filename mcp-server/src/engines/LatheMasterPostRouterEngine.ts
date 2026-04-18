/**
 * LatheMasterPostRouterEngine — Central Router for Lathe Post-Processor Selection
 *
 * U-LTH25: Given {machineId, operation, controller} → selects and invokes the correct
 * sub-post processor for JM Die's 7 Okuma lathes + other machines. Integrates with
 * ShopConfigurationEngine for the full 21-machine inventory.
 *
 * Architecture:
 *   [Job Request] → [Machine Resolution] → [Controller Detection]
 *     → [Sub-Post Selection] → [Post Invocation] → [Validated G-code]
 *
 * Fallback: Unknown machines auto-trigger P2 Post Generator path via LathePostGeneratorEngine.
 *
 * @module LatheMasterPostRouterEngine
 */

import { shopConfigurationEngine, type ShopMachineControllerRegistryEntry } from "./ShopConfigurationEngine.js";
import { lathePostProcessorEngine, type LathePostConfig, type LathePostResult, type LatheInput, type LatheMove, type LatheMoveType } from "./LathePostProcessorEngine.js";
import { ppOkumaTurningPostEngine, type TurningOperation, type TurningProgram } from "./PPOkumaTurningPostEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Lathe operation types supported by the router */
export type LatheOperationType =
  | "turning"
  | "facing"
  | "grooving"
  | "threading"
  | "drilling"
  | "boring"
  | "parting"
  | "tapping"
  | "profiling"
  | "contouring"
  | "multi_op";

/** Move input for master post routing */
export interface MasterPostMove {
  type: "rapid" | "linear" | "arc_cw" | "arc_ccw";
  x?: number;
  z?: number;
  feed?: number;
  i?: number;
  k?: number;
}

/** Input for master post routing */
export interface MasterPostRouteRequest {
  machine_id: string;
  operation: LatheOperationType;
  controller?: string;
  program_name?: string;
  program_number?: number;
  moves: MasterPostMove[];
  tool_number: number;
  spindle_rpm: number;
  feed_rate_mmmin: number;
  material_iso?: "P" | "M" | "K" | "N" | "S" | "H";
  coolant?: "flood" | "mist" | "air" | "tsc" | "none";
  work_offset?: string;
  customer?: string;
  part_number?: string;
  stock_diameter_mm?: number;
  stock_length_mm?: number;
  css_mode?: boolean;
  sub_spindle?: boolean;
  live_tooling?: boolean;
}

/** Route decision with explanation */
export interface RouteDecision {
  machine_id: string;
  machine_name: string;
  controller_family: string;
  controller_model: string;
  selected_post: string;
  route_method: "direct_match" | "controller_family" | "fallback_generator";
  confidence: number;
  reasoning: string[];
}

/** Result from master post routing */
export interface MasterPostRouteResult {
  success: boolean;
  gcode: string;
  route_decision: RouteDecision;
  block_count: number;
  cycle_time_estimate_s?: number;
  warnings: string[];
  errors: string[];
}

/** Internal unified post result */
interface UnifiedPostResult {
  gcode: string;
  line_count: number;
  estimated_time_sec?: number;
  warnings: string[];
}

/** Registry of sub-posts indexed by controller family */
interface SubPostRegistry {
  [controllerFamily: string]: {
    post_engine: string;
    invoke: (request: MasterPostRouteRequest, machine: ShopMachineControllerRegistryEntry) => UnifiedPostResult;
  };
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheMasterPostRouterEngine {
  private static readonly JM_DIE_SHOP_ID = "jm-die";

  /** JM Die lathe machine IDs (7 Okuma lathes) */
  private static readonly LATHE_MACHINE_IDS = [
    "LTH-01", "LTH-02", "LTH-03", "LTH-04", "LTH-05", "LTH-06", "LTH-07"
  ];

  /** Sub-post registry by controller family */
  private subPostRegistry: SubPostRegistry = {
    okuma: {
      post_engine: "PPOkumaTurningPostEngine",
      invoke: this.invokeOkumaPost.bind(this),
    },
    fanuc: {
      post_engine: "LathePostProcessorEngine",
      invoke: this.invokeFanucPost.bind(this),
    },
    haas: {
      post_engine: "LathePostProcessorEngine",
      invoke: this.invokeHaasPost.bind(this),
    },
    mazak: {
      post_engine: "LathePostProcessorEngine",
      invoke: this.invokeMazakPost.bind(this),
    },
  };

  /**
   * Route a lathe job to the correct sub-post processor
   */
  route(request: MasterPostRouteRequest): MasterPostRouteResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const reasoning: string[] = [];

    // Step 1: Resolve machine from shop configuration
    const machineRegistry = this.getMachineRegistry();
    const machine = machineRegistry.find(m => m.machine_id === request.machine_id);

    if (!machine) {
      // Unknown machine → fallback to P2 generator path
      reasoning.push(`Machine ${request.machine_id} not found in JM Die registry`);
      reasoning.push("Routing to fallback post generator (P2 path)");

      return this.invokeFallbackGenerator(request, {
        machine_id: request.machine_id,
        machine_name: "Unknown",
        controller_family: request.controller || "fanuc",
        controller_model: "generic",
        selected_post: "LathePostGeneratorEngine",
        route_method: "fallback_generator",
        confidence: 0.6,
        reasoning,
      });
    }

    reasoning.push(`Resolved machine: ${machine.machine_name} (${machine.machine_id})`);
    reasoning.push(`Controller family: ${machine.controller_family}, model: ${machine.controller_model}`);

    // Step 2: Select sub-post based on controller family
    const controllerFamily = machine.controller_family.toLowerCase();
    const subPost = this.subPostRegistry[controllerFamily];

    if (!subPost) {
      // No specialized post for this controller family → use generic
      reasoning.push(`No specialized post for ${controllerFamily} controller`);
      reasoning.push("Falling back to generic LathePostProcessorEngine");

      return this.invokeGenericPost(request, machine, reasoning);
    }

    reasoning.push(`Selected sub-post: ${subPost.post_engine}`);

    // Step 3: Check machine-specific capabilities
    if (request.sub_spindle && !this.machineHasSubSpindle(machine.machine_id)) {
      warnings.push(`Machine ${machine.machine_name} does not have sub-spindle capability`);
    }
    if (request.live_tooling && !this.machineHasLiveTooling(machine.machine_id)) {
      warnings.push(`Machine ${machine.machine_name} may not have live tooling capability`);
    }

    // Step 4: Invoke the selected sub-post
    const routeDecision: RouteDecision = {
      machine_id: machine.machine_id,
      machine_name: machine.machine_name,
      controller_family: machine.controller_family,
      controller_model: machine.controller_model,
      selected_post: subPost.post_engine,
      route_method: "direct_match",
      confidence: 0.95,
      reasoning,
    };

    try {
      const postResult = subPost.invoke(request, machine);

      return {
        success: true,
        gcode: postResult.gcode,
        route_decision: routeDecision,
        block_count: postResult.line_count,
        cycle_time_estimate_s: postResult.estimated_time_sec,
        warnings: [...warnings, ...postResult.warnings],
        errors: [],
      };
    } catch (error) {
      errors.push(`Post processing failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        gcode: "",
        route_decision: routeDecision,
        block_count: 0,
        warnings,
        errors,
      };
    }
  }

  /**
   * Get all available lathe machines from JM Die shop
   */
  getLatheMachines(): ShopMachineControllerRegistryEntry[] {
    return this.getMachineRegistry().filter(m =>
      m.machine_id.startsWith("LTH-") ||
      m.machine_type.toLowerCase().includes("lathe") ||
      m.machine_type.toLowerCase().includes("turning")
    );
  }

  /**
   * Get routing recommendation for a given machine
   */
  getRouteRecommendation(machineId: string): {
    recommended_post: string;
    controller_family: string;
    confidence: number;
    notes: string[];
  } {
    const machineRegistry = this.getMachineRegistry();
    const machine = machineRegistry.find(m => m.machine_id === machineId);

    if (!machine) {
      return {
        recommended_post: "LathePostGeneratorEngine",
        controller_family: "unknown",
        confidence: 0.5,
        notes: ["Machine not found in registry", "Will use P2 generator fallback"],
      };
    }

    const controllerFamily = machine.controller_family.toLowerCase();
    const subPost = this.subPostRegistry[controllerFamily];

    return {
      recommended_post: subPost?.post_engine || "LathePostProcessorEngine",
      controller_family: machine.controller_family,
      confidence: subPost ? 0.95 : 0.75,
      notes: [
        `Machine: ${machine.machine_name}`,
        `Controller: ${machine.controller_model}`,
        subPost ? `Specialized ${controllerFamily} post available` : "Using generic post",
      ],
    };
  }

  /**
   * Validate that a machine can handle the requested operation
   */
  validateMachineCapability(machineId: string, operation: LatheOperationType): {
    capable: boolean;
    confidence: number;
    notes: string[];
  } {
    const machineRegistry = this.getMachineRegistry();
    const machine = machineRegistry.find(m => m.machine_id === machineId);

    if (!machine) {
      return {
        capable: false,
        confidence: 0,
        notes: ["Machine not found in registry"],
      };
    }

    // All JM Die lathes can handle basic turning operations
    const basicOps: LatheOperationType[] = ["turning", "facing", "drilling", "boring", "parting"];
    if (basicOps.includes(operation)) {
      return {
        capable: true,
        confidence: 0.99,
        notes: [`${machine.machine_name} fully supports ${operation}`],
      };
    }

    // Threading, grooving, tapping need verification
    const advancedOps: LatheOperationType[] = ["threading", "grooving", "tapping", "profiling", "contouring"];
    if (advancedOps.includes(operation)) {
      return {
        capable: true,
        confidence: 0.9,
        notes: [`${machine.machine_name} likely supports ${operation}`, "Verify cycle availability"],
      };
    }

    // Multi-op needs live tooling check
    if (operation === "multi_op") {
      const hasLiveTooling = this.machineHasLiveTooling(machineId);
      return {
        capable: hasLiveTooling,
        confidence: hasLiveTooling ? 0.95 : 0.5,
        notes: hasLiveTooling
          ? [`${machine.machine_name} has live tooling for multi-op`]
          : [`${machine.machine_name} may not support multi-op without live tooling`],
      };
    }

    return {
      capable: true,
      confidence: 0.7,
      notes: ["Operation capability assumed but not verified"],
    };
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private getMachineRegistry(): ShopMachineControllerRegistryEntry[] {
    try {
      return shopConfigurationEngine.getMachineControllerRegistry(LatheMasterPostRouterEngine.JM_DIE_SHOP_ID);
    } catch {
      // Fallback to hardcoded JM Die lathe registry
      return this.getHardcodedLatheRegistry();
    }
  }

  private getHardcodedLatheRegistry(): ShopMachineControllerRegistryEntry[] {
    return [
      { machine_id: "LTH-01", machine_name: "Okuma GENOS L300-M", machine_type: "lathe", controller_family: "okuma", controller_model: "OSP-P300L-R", shop_controller: null, post_processor: "OKUMA_GENOS_L300M_OSP-P300L-R_PRISM.cps", machine_rate_per_hour: 125, canonical_test_machine: true, program_release_ready: true, machine_source_root: "", controller_source_root: "" },
      { machine_id: "LTH-02", machine_name: "Okuma GENOS L200E-M", machine_type: "lathe", controller_family: "okuma", controller_model: "OSP-P200LA-R", shop_controller: null, post_processor: "OKUMA_GENOS_L200EM_OSP-P200LA-R_PRISM.cps", machine_rate_per_hour: 115, canonical_test_machine: false, program_release_ready: true, machine_source_root: "", controller_source_root: "" },
      { machine_id: "LTH-03", machine_name: "Okuma LNC8", machine_type: "lathe", controller_family: "okuma", controller_model: "OSP-U10L", shop_controller: null, post_processor: "OKUMA_LNC8_PRISM.cps", machine_rate_per_hour: 95, canonical_test_machine: false, program_release_ready: true, machine_source_root: "", controller_source_root: "" },
      { machine_id: "LTH-04", machine_name: "Okuma Crown L1060", machine_type: "lathe", controller_family: "okuma", controller_model: "OSP-U10L", shop_controller: null, post_processor: "OKUMA_CROWN_L1060_OSP-U10L_PRISM.cps", machine_rate_per_hour: 100, canonical_test_machine: false, program_release_ready: true, machine_source_root: "", controller_source_root: "" },
      { machine_id: "LTH-05", machine_name: "Okuma GENOS L400II-E", machine_type: "lathe", controller_family: "okuma", controller_model: "OSP-P300LA-E", shop_controller: null, post_processor: "OKUMA_GENOS_L400II_P300LA-Ai-Enhanced.cps", machine_rate_per_hour: 135, canonical_test_machine: false, program_release_ready: true, machine_source_root: "", controller_source_root: "" },
      { machine_id: "LTH-06", machine_name: "Okuma LB 3000EX Big Bore", machine_type: "lathe", controller_family: "okuma", controller_model: "OSP-P500", shop_controller: null, post_processor: "OKUMA_LATHE_LB3000-Ai-Enhanced.cps", machine_rate_per_hour: 145, canonical_test_machine: false, program_release_ready: true, machine_source_root: "", controller_source_root: "" },
      { machine_id: "LTH-07", machine_name: "Okuma Multus B250II", machine_type: "lathe", controller_family: "okuma", controller_model: "OSP-P300SA", shop_controller: null, post_processor: "OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps", machine_rate_per_hour: 175, canonical_test_machine: false, program_release_ready: true, machine_source_root: "", controller_source_root: "" },
    ];
  }

  private machineHasSubSpindle(machineId: string): boolean {
    // LTH-06 (LB 3000EX) and LTH-07 (Multus) have sub-spindle
    return ["LTH-06", "LTH-07"].includes(machineId);
  }

  private machineHasLiveTooling(machineId: string): boolean {
    // -M suffix indicates live tooling, plus Multus
    return ["LTH-01", "LTH-02", "LTH-07"].includes(machineId);
  }

  private countBlocks(gcode: string): number {
    return gcode.split("\n").filter(line => line.trim() && !line.trim().startsWith("(")).length;
  }

  // ── Sub-Post Invocations ─────────────────────────────────────────────────

  private invokeOkumaPost(
    request: MasterPostRouteRequest,
    machine: ShopMachineControllerRegistryEntry
  ): UnifiedPostResult {
    const turningOp = this.mapToTurningOperation(request);
    const result: TurningProgram = ppOkumaTurningPostEngine.generate({
      machine_id: machine.machine_id,
      program_number: request.program_number?.toString(),
      part_description: request.program_name,
      bar_diameter_mm: request.stock_diameter_mm,
      part_length_mm: request.stock_length_mm,
      material: request.material_iso,
      operations: [turningOp],
    });

    return {
      gcode: result.gcode_text,
      line_count: result.line_count,
      warnings: result.warnings,
    };
  }

  private buildPostConfig(controller: LathePostConfig["controller"], request: MasterPostRouteRequest): LathePostConfig {
    return {
      controller,
      program_number: request.program_number,
      use_canned_cycles: true,
      use_css: request.css_mode ?? false,
      use_tnrc: true,
      decimal_places: 4,
      line_numbers: true,
      line_number_increment: 10,
      coolant_code: request.coolant === "mist" ? "mist" : request.coolant === "air" ? "air" : request.coolant === "none" ? "none" : "flood",
      safe_start_block: true,
      program_end: "M30",
      max_rpm: request.spindle_rpm,
      spindle_direction: "cw",
      sub_spindle: request.sub_spindle,
    };
  }

  private invokeFanucPost(
    request: MasterPostRouteRequest,
    machine: ShopMachineControllerRegistryEntry
  ): UnifiedPostResult {
    const result: LathePostResult = lathePostProcessorEngine.process(
      this.mapToLatheInput(request),
      this.buildPostConfig("fanuc_turning", request)
    );

    return {
      gcode: result.gcode,
      line_count: result.line_count,
      estimated_time_sec: result.estimated_time_sec,
      warnings: result.warnings,
    };
  }

  private invokeHaasPost(
    request: MasterPostRouteRequest,
    machine: ShopMachineControllerRegistryEntry
  ): UnifiedPostResult {
    const result: LathePostResult = lathePostProcessorEngine.process(
      this.mapToLatheInput(request),
      this.buildPostConfig("haas_st", request)
    );

    return {
      gcode: result.gcode,
      line_count: result.line_count,
      estimated_time_sec: result.estimated_time_sec,
      warnings: result.warnings,
    };
  }

  private invokeMazakPost(
    request: MasterPostRouteRequest,
    machine: ShopMachineControllerRegistryEntry
  ): UnifiedPostResult {
    const result: LathePostResult = lathePostProcessorEngine.process(
      this.mapToLatheInput(request),
      this.buildPostConfig("mazak_qt", request)
    );

    return {
      gcode: result.gcode,
      line_count: result.line_count,
      estimated_time_sec: result.estimated_time_sec,
      warnings: result.warnings,
    };
  }

  private invokeGenericPost(
    request: MasterPostRouteRequest,
    machine: ShopMachineControllerRegistryEntry,
    reasoning: string[]
  ): MasterPostRouteResult {
    reasoning.push("Using generic LathePostProcessorEngine");

    const result: LathePostResult = lathePostProcessorEngine.process(
      this.mapToLatheInput(request),
      this.buildPostConfig("fanuc_turning", request)
    );

    return {
      success: true,
      gcode: result.gcode,
      route_decision: {
        machine_id: machine.machine_id,
        machine_name: machine.machine_name,
        controller_family: machine.controller_family,
        controller_model: machine.controller_model,
        selected_post: "LathePostProcessorEngine",
        route_method: "controller_family",
        confidence: 0.8,
        reasoning,
      },
      block_count: result.line_count,
      cycle_time_estimate_s: result.estimated_time_sec,
      warnings: result.warnings,
      errors: [],
    };
  }

  private invokeFallbackGenerator(
    request: MasterPostRouteRequest,
    routeDecision: RouteDecision
  ): MasterPostRouteResult {
    // Fallback to generic post when machine not in registry
    const result: LathePostResult = lathePostProcessorEngine.process(
      this.mapToLatheInput(request),
      this.buildPostConfig("fanuc_turning", request)
    );

    return {
      success: true,
      gcode: result.gcode,
      route_decision: routeDecision,
      block_count: result.line_count,
      cycle_time_estimate_s: result.estimated_time_sec,
      warnings: [
        `Machine ${request.machine_id} not in JM Die registry — using fallback generator`,
        ...result.warnings,
      ],
      errors: [],
    };
  }

  private mapToTurningOperation(request: MasterPostRouteRequest): TurningOperation {
    const opTypeMap: Record<LatheOperationType, TurningOperation["type"]> = {
      turning: "od_rough",
      facing: "face",
      grooving: "groove",
      threading: "thread",
      drilling: "drill",
      boring: "id_bore",
      parting: "part",
      tapping: "drill",
      profiling: "od_finish",
      contouring: "od_finish",
      multi_op: "od_rough",
    };

    return {
      type: opTypeMap[request.operation] || "od_rough",
      tool_number: request.tool_number,
      tool_position: request.tool_number,
      speed_rpm: request.spindle_rpm,
      feed_mm_rev: request.feed_rate_mmmin / request.spindle_rpm,
      coolant: (request.coolant === "air" || request.coolant === "none") ? "off" : (request.coolant as "flood" | "mist" | "tsc"),
      css: request.css_mode,
    };
  }

  private mapToLatheInput(request: MasterPostRouteRequest): LatheInput {
    const moveTypeMap: Record<string, LatheMoveType> = {
      rapid: "rapid",
      linear: "feed",
      arc_cw: "arc_cw",
      arc_ccw: "arc_ccw",
    };

    const coolantMap: Record<string, "flood" | "mist" | "air" | "none"> = {
      flood: "flood",
      mist: "mist",
      air: "air",
      tsc: "flood",
      none: "none",
    };

    return {
      moves: request.moves.map((m): LatheMove => ({
        type: moveTypeMap[m.type] || "feed",
        x: m.x,
        z: m.z,
        feed: m.feed,
        i: m.i,
        k: m.k,
      })),
      tool_number: request.tool_number,
      tool_orientation: 1,
      spindle_rpm: request.spindle_rpm,
      feed_rate_mmrev: request.feed_rate_mmmin / request.spindle_rpm,
      coolant: coolantMap[request.coolant || "flood"] || "flood",
      work_offset: request.work_offset || "G54",
      part_diameter_mm: request.stock_diameter_mm,
    };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheMasterPostRouterEngine = new LatheMasterPostRouterEngine();
