/**
 * MillMasterOrchestratorFacadeEngine — Unified Mill Operations Orchestrator
 * ==========================================================================
 * Single-entry facade for ALL milling operations. Routes requests to the
 * optimal sub-orchestrator based on request type.
 *
 * Request Types (7 total):
 *   1. print_to_program — Full P2P pipeline (features → strategy → toolpath → G-code)
 *   2. scientific       — Physics-backed analysis (force, deflection, chatter, thermal)
 *   3. agi             — AGI reasoning (chain-of-thought, tree-of-thought, etc.)
 *   4. validate        — Program validation (collision, limits, safety)
 *   5. quick           — Fast helpers (speed/feed, cycle time, cost estimate)
 *   6. wisdom          — Tribal knowledge queries
 *   7. adaptive        — Adaptive toolpath generation (PRISM Forces, HSM, trochoidal)
 *
 * Integration Points:
 *   - millDispatcher.ts routes all prism_mill actions through this facade
 *   - MillingAGIMasterEngine handles AGI reasoning requests
 *   - CAMAGIMasterOrchestratorEngine delegates mill-specific work here
 *
 * @module engines/MillMasterOrchestratorFacadeEngine
 * @milestone MILL-MASTER/P1-U02-FACADE-WIRE
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// NOT-WIRED ERROR — banned from returning synthetic "success" data
// ============================================================================

export class NotWiredError extends Error {
  readonly code = "NOT_WIRED";
  readonly route: string;
  readonly targetEngine: string;
  readonly roadmapRef: string;
  readonly partial: Record<string, unknown> | undefined;
  constructor(
    route: string,
    targetEngine: string,
    roadmapRef: string,
    partial?: Record<string, unknown>,
  ) {
    super(`Route "${route}" requires ${targetEngine} — not wired. ${roadmapRef}`);
    this.name = "NotWiredError";
    this.route = route;
    this.targetEngine = targetEngine;
    this.roadmapRef = roadmapRef;
    this.partial = partial;
  }
}

// ============================================================================
// TYPES
// ============================================================================

/** Request types routed by this facade */
export type MillOrchRequestType =
  | "print_to_program"
  | "scientific"
  | "agi"
  | "validate"
  | "quick"
  | "wisdom"
  | "adaptive"
  // P1-U10-FACADE-EXTEND: 12 new route types
  | "ai_learning"
  | "mill_turn"
  | "five_axis"
  | "multi_axis"
  | "tribal_writeback"
  | "pattern_sync"
  | "blueprint_bridge"
  | "model_load"
  | "hive_sync"
  | "customer_learn"
  | "outcome_replan"
  | "jmdie_refresh";

/** ISO material group codes */
export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

/** Tool geometry */
export interface ToolGeometry {
  diameter_mm: number;
  flutes: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  corner_radius_mm?: number;
  helix_angle_deg?: number;
  coating?: string;
}

/** Cutting parameters */
export interface CuttingParams {
  rpm?: number;
  feed_mmpm?: number;
  feed_per_tooth?: number;
  doc_mm?: number;
  woc_mm?: number;
  radial_engagement?: number;
  axial_engagement?: number;
  coolant?: "flood" | "mist" | "through_spindle" | "air" | "none";
}

/** Machine configuration */
export interface MachineConfig {
  machine_id?: string;
  max_rpm?: number;
  max_power_kw?: number;
  max_torque_nm?: number;
  has_4th_axis?: boolean;
  has_5th_axis?: boolean;
}

/** Orchestration request */
export interface MillOrchestrationRequest {
  request_type: MillOrchRequestType;
  // Context
  material?: string;
  iso_group?: ISOGroup;
  tool?: ToolGeometry;
  params?: CuttingParams;
  machine?: MachineConfig;
  // P2P specific
  features?: Record<string, unknown>[];
  geometry?: unknown;
  // Validation specific
  gcode?: string;
  toolpath?: unknown;
  // AGI specific
  intent?: string;
  reasoning_mode?: string;
  // Wisdom specific
  query?: string;
  domain?: string;
  // Flags
  include_provenance?: boolean;
}

/** Provenance tracking */
export interface MillOrchestrationProvenance {
  request_type: MillOrchRequestType;
  engines_invoked: string[];
  formulas_used: string[];
  tribal_sources: string[];
  confidence: number;
  processing_time_ms: number;
  ts: string;
}

/** Orchestration response */
export interface MillOrchestrationResponse {
  success: boolean;
  request_type: MillOrchRequestType;
  result: unknown;
  provenance: MillOrchestrationProvenance;
  warnings: string[];
}

// ============================================================================
// SUB-ORCHESTRATOR TYPES
// ============================================================================

interface SubOrchestrator {
  name: string;
  handles: MillOrchRequestType[];
  invoke: (request: MillOrchestrationRequest) => Promise<unknown>;
}

// ============================================================================
// ENGINE
// ============================================================================

class MillMasterOrchestratorFacadeEngine {
  private subOrchestrators: Map<MillOrchRequestType, SubOrchestrator> = new Map();
  private invocationLog: Array<{ ts: string; type: MillOrchRequestType; duration_ms: number }> = [];

  constructor() {
    this.registerSubOrchestrators();
  }

  /**
   * Register all sub-orchestrators for routing
   */
  private registerSubOrchestrators(): void {
    // Print-to-Program orchestrator
    this.subOrchestrators.set("print_to_program", {
      name: "MillP2POrchestrator",
      handles: ["print_to_program"],
      invoke: async (req) => this.handlePrintToProgram(req),
    });

    // Scientific orchestrator (physics)
    this.subOrchestrators.set("scientific", {
      name: "MillScientificOrchestrator",
      handles: ["scientific"],
      invoke: async (req) => this.handleScientific(req),
    });

    // AGI orchestrator
    this.subOrchestrators.set("agi", {
      name: "MillingAGIMasterEngine",
      handles: ["agi"],
      invoke: async (req) => this.handleAGI(req),
    });

    // Validation orchestrator
    this.subOrchestrators.set("validate", {
      name: "MillValidationOrchestrator",
      handles: ["validate"],
      invoke: async (req) => this.handleValidate(req),
    });

    // Quick helpers orchestrator
    this.subOrchestrators.set("quick", {
      name: "MillQuickHelpers",
      handles: ["quick"],
      invoke: async (req) => this.handleQuick(req),
    });

    // Wisdom (tribal knowledge) orchestrator
    this.subOrchestrators.set("wisdom", {
      name: "TribalKnowledgeAdvisor",
      handles: ["wisdom"],
      invoke: async (req) => this.handleWisdom(req),
    });

    // Adaptive toolpath orchestrator
    this.subOrchestrators.set("adaptive", {
      name: "AdaptiveToolpathRouter",
      handles: ["adaptive"],
      invoke: async (req) => this.handleAdaptive(req),
    });

    // --- P1-U10-FACADE-EXTEND: 12 new routes ---

    this.subOrchestrators.set("ai_learning", {
      name: "MillingAILearningOrchestratorEngine",
      handles: ["ai_learning"],
      invoke: async (req) => this.handleAILearning(req),
    });

    this.subOrchestrators.set("mill_turn", {
      name: "MillTurnOrchestrationEngine",
      handles: ["mill_turn"],
      invoke: async (req) => this.handleMillTurn(req),
    });

    this.subOrchestrators.set("five_axis", {
      name: "FiveAxisAggregatorEngine",
      handles: ["five_axis"],
      invoke: async (req) => this.handleFiveAxis(req),
    });

    this.subOrchestrators.set("multi_axis", {
      name: "MultiAxisAggregatorEngine",
      handles: ["multi_axis"],
      invoke: async (req) => this.handleMultiAxis(req),
    });

    this.subOrchestrators.set("tribal_writeback", {
      name: "TribalKnowledgeAdvisor",
      handles: ["tribal_writeback"],
      invoke: async (req) => this.handleTribalWriteback(req),
    });

    this.subOrchestrators.set("pattern_sync", {
      name: "MillPatternMinerEngine",
      handles: ["pattern_sync"],
      invoke: async (req) => this.handlePatternSync(req),
    });

    this.subOrchestrators.set("blueprint_bridge", {
      name: "MillPrintToProgramEngine",
      handles: ["blueprint_bridge"],
      invoke: async (req) => this.handleBlueprintBridge(req),
    });

    this.subOrchestrators.set("model_load", {
      name: "MillDeepLearningEngine",
      handles: ["model_load"],
      invoke: async (req) => this.handleModelLoad(req),
    });

    this.subOrchestrators.set("hive_sync", {
      name: "HiveSyncCoordinator",
      handles: ["hive_sync"],
      invoke: async (req) => this.handleHiveSync(req),
    });

    this.subOrchestrators.set("customer_learn", {
      name: "MillingMetaLearningEngine",
      handles: ["customer_learn"],
      invoke: async (req) => this.handleCustomerLearn(req),
    });

    this.subOrchestrators.set("outcome_replan", {
      name: "MillMasterOrchestratorFacadeEngine",
      handles: ["outcome_replan"],
      invoke: async (req) => this.handleOutcomeReplan(req),
    });

    this.subOrchestrators.set("jmdie_refresh", {
      name: "PRISMSelfAwarenessEngine",
      handles: ["jmdie_refresh"],
      invoke: async (req) => this.handleJMDieRefresh(req),
    });
  }

  /**
   * Main entry point — routes request to appropriate sub-orchestrator
   */
  async orchestrate(request: MillOrchestrationRequest): Promise<MillOrchestrationResponse> {
    const startTime = Date.now();
    const enginesInvoked: string[] = [];
    const formulasUsed: string[] = [];
    const tribalSources: string[] = [];
    const warnings: string[] = [];

    log.info(`[MillMasterFacade] Routing ${request.request_type} request`);

    const subOrch = this.subOrchestrators.get(request.request_type);
    if (!subOrch) {
      return {
        success: false,
        request_type: request.request_type,
        result: null,
        provenance: this.buildProvenance(request.request_type, enginesInvoked, formulasUsed, tribalSources, 0, startTime),
        warnings: [`Unknown request type: ${request.request_type}`],
      };
    }

    enginesInvoked.push(subOrch.name);

    try {
      const result = await subOrch.invoke(request);
      const duration = Date.now() - startTime;

      // Log invocation
      this.invocationLog.push({
        ts: new Date().toISOString(),
        type: request.request_type,
        duration_ms: duration,
      });

      return {
        success: true,
        request_type: request.request_type,
        result,
        provenance: this.buildProvenance(request.request_type, enginesInvoked, formulasUsed, tribalSources, 0.9, startTime),
        warnings,
      };
    } catch (error: any) {
      warnings.push(`Error in ${subOrch.name}: ${error.message}`);
      return {
        success: false,
        request_type: request.request_type,
        result: null,
        provenance: this.buildProvenance(request.request_type, enginesInvoked, formulasUsed, tribalSources, 0, startTime),
        warnings,
      };
    }
  }

  /**
   * Feature recognition from geometry — NOT WIRED.
   * Would delegate to a real CAD feature-recognition engine; returning
   * fake fixture features is banned by the no-fake-code rule.
   * @throws NotWiredError
   */
  async recognizeFeatures(_params: Record<string, unknown>): Promise<never> {
    throw new NotWiredError(
      "recognizeFeatures",
      "CADFeatureRecognitionEngine",
      "No real feature-recognition engine wired yet — use CAD dispatcher or STEP parser",
    );
  }

  /**
   * Process planning for features — NOT WIRED.
   * Would delegate to a real ProcessPlannerEngine; returning fake
   * fixture operations is banned.
   * @throws NotWiredError
   */
  async planProcess(_params: Record<string, unknown>): Promise<never> {
    throw new NotWiredError(
      "planProcess",
      "ProcessPlannerEngine",
      "Real process planner not yet built; do not treat fixture sequences as real plans",
    );
  }

  /**
   * Get invocation statistics
   */
  getStats(): { total: number; byType: Record<string, number>; avgDuration_ms: number } {
    const byType: Record<string, number> = {};
    let totalDuration = 0;

    for (const entry of this.invocationLog) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      totalDuration += entry.duration_ms;
    }

    return {
      total: this.invocationLog.length,
      byType,
      avgDuration_ms: this.invocationLog.length > 0 ? totalDuration / this.invocationLog.length : 0,
    };
  }

  /**
   * List registered request types
   */
  getRequestTypes(): MillOrchRequestType[] {
    return Array.from(this.subOrchestrators.keys());
  }

  /**
   * Get sub-orchestrator for a request type
   */
  getSubOrchestrator(type: MillOrchRequestType): SubOrchestrator | undefined {
    return this.subOrchestrators.get(type);
  }

  // ============================================================================
  // SUB-ORCHESTRATOR HANDLERS
  // ============================================================================

  private async handlePrintToProgram(req: MillOrchestrationRequest): Promise<unknown> {
    // NOT WIRED — MillPrintToProgramEngine does not yet exist on disk.
    // P1-U11 (include_tribal default) surfaces tribal guidance up-front while
    // the P2P pipeline is being built. Callers who want actual program output
    // must catch this error and degrade, not treat synthetic data as a program.
    const include_tribal = (req as any).include_tribal ?? true;
    const tribal_tips: string[] = [];
    if (include_tribal) {
      const iso = req.iso_group ?? "P";
      tribal_tips.push(
        `ISO ${iso}: prefer climb milling unless surface crust issue`,
        `ISO ${iso}: monitor chip color for thermal alarm`,
      );
    }
    throw new NotWiredError(
      "print_to_program",
      "MillPrintToProgramEngine",
      "MILL-MASTER roadmap unit P1-U13+ (engine has not been created yet)",
      { include_tribal, tribal_tips },
    );
  }

  private async handleScientific(req: MillOrchestrationRequest): Promise<unknown> {
    // Real physics using CANONICAL_KIENZLE — no synthetic output.
    const { CANONICAL_KIENZLE } = await import("../physics/constants.js");
    const tool = req.tool ?? { diameter_mm: 10, flutes: 4 };
    const params = req.params ?? {};
    const iso = (req.iso_group ?? "P") as keyof typeof CANONICAL_KIENZLE;
    const { kc1_1, mc } = CANONICAL_KIENZLE[iso];

    const rpm = params.rpm ?? 8000;
    const feed_mmpm = params.feed_mmpm ?? 1200;
    const fz = feed_mmpm / (rpm * tool.flutes);
    const ap = params.doc_mm ?? 2;
    const ae = params.woc_mm ?? tool.diameter_mm * 0.1;

    // Kienzle: Fc = kc1_1 · b · h^(1-mc), with b = ap, h = fz
    // Adjusted for radial engagement via ae/D
    const h = Math.max(fz, 1e-6);
    const Fc_N = kc1_1 * ap * Math.pow(h, 1 - mc) * (ae / tool.diameter_mm);
    const torque_Nm = (Fc_N * tool.diameter_mm / 2) / 1000;
    const power_kW = (torque_Nm * 2 * Math.PI * rpm) / 60_000;

    return {
      Fc_N: Math.round(Fc_N),
      Ft_N: Math.round(Fc_N * 0.4),
      Fr_N: Math.round(Fc_N * 0.3),
      torque_Nm: Number(torque_Nm.toFixed(3)),
      power_kW: Number(power_kW.toFixed(3)),
      iso_group: iso,
      kc1_1,
      mc,
      formulas_used: ["kienzle_force", "torque_from_force", "power_from_torque"],
      provenance: "CANONICAL_KIENZLE from src/physics/constants.ts",
    };
  }

  private async handleAGI(req: MillOrchestrationRequest): Promise<unknown> {
    const { millingAGIMasterEngine } = await import("./MillingAGIMasterEngine.js");
    return await millingAGIMasterEngine.reason({
      intent: req.intent ?? "",
      reasoning_mode: (req.reasoning_mode as any) ?? "chain_of_thought",
      iso_group: req.iso_group as any,
      material: req.material,
      features: req.features,
    });
  }

  private async handleValidate(_req: MillOrchestrationRequest): Promise<unknown> {
    throw new NotWiredError(
      "validate",
      "MillProgramAnalyzerEngine / MillKinematicsCollisionEngine",
      "Validation sub-engines not yet built; safety_score must not be fabricated",
    );
  }

  private async handleQuick(req: MillOrchestrationRequest): Promise<unknown> {
    // Real cutting-speed math — no synthetic output.
    // RPM = (Vc_m/min · 1000) / (π · D_mm)
    const tool = req.tool ?? { diameter_mm: 10, flutes: 4 };
    const iso = req.iso_group ?? "P";
    // Baseline recommended Vc per ISO group (m/min). Sources:
    // Sandvik Technical Guide C-2920:3 + Kennametal catalog defaults.
    const vc_baseline_mpm: Record<string, number> = {
      N: 300, // Aluminum
      P: 150, // Carbon/alloy steel
      M: 120, // Stainless
      K: 100, // Cast iron
      S: 40,  // Superalloy
      H: 60,  // Hardened
    };
    const vc_mpm = vc_baseline_mpm[iso] ?? 150;
    const rpm = Math.round((vc_mpm * 1000) / (Math.PI * tool.diameter_mm));
    const fz_by_iso: Record<string, number> = {
      N: 0.10, P: 0.05, M: 0.04, K: 0.06, S: 0.03, H: 0.02,
    };
    const fz = fz_by_iso[iso] ?? 0.05;
    const feed_mmpm = Math.round(rpm * tool.flutes * fz);

    return {
      rpm,
      feed_mmpm,
      vc_mpm,
      fz_mm: fz,
      iso_group: iso,
      tool_diameter_mm: tool.diameter_mm,
      formulas_used: ["cutting_speed_to_rpm", "feed_from_chipload"],
      provenance: "Sandvik C-2920:3 + Kennametal baseline Vc tables",
    };
  }

  private async handleWisdom(req: MillOrchestrationRequest): Promise<unknown> {
    throw new NotWiredError(
      "wisdom",
      "TribalKnowledgeAdvisorEngine",
      "Tribal-knowledge advisor not yet wired into facade; use prism_knowledge:tribal_search",
      { requested_query: req.query ?? "" },
    );
  }

  private async handleAdaptive(_req: MillOrchestrationRequest): Promise<unknown> {
    throw new NotWiredError(
      "adaptive",
      "AdaptiveToolpathRouterEngine",
      "Adaptive router not yet built; no synthetic toolpath may be returned",
    );
  }

  // ─────── L2 AGGREGATOR DELEGATES (real imports, no fake fallback) ───────

  private async handleAILearning(req: MillOrchestrationRequest): Promise<unknown> {
    const { millingAILearningOrchestratorEngine } = await import(
      "./MillingAILearningOrchestratorEngine.js"
    );
    const sub_type = (req as any).sub_type ?? "ai_reasoning";
    return await millingAILearningOrchestratorEngine.orchestrate({
      request_type: sub_type,
      intent: req.intent,
      context: { material: req.material, iso_group: req.iso_group },
      query: req.query,
    });
  }

  private async handleMillTurn(req: MillOrchestrationRequest): Promise<unknown> {
    const { millTurnOrchestrationEngine } = await import("./MillTurnOrchestrationEngine.js");
    const sub_type = (req as any).sub_type ?? "cam_generate";
    return await millTurnOrchestrationEngine.orchestrate({
      request_type: sub_type,
      machine_class: (req as any).machine_class ?? "generic",
    });
  }

  private async handleFiveAxis(req: MillOrchestrationRequest): Promise<unknown> {
    const { fiveAxisAggregatorEngine } = await import("./FiveAxisAggregatorEngine.js");
    const sub_type = (req as any).sub_type ?? "orchestrate";
    return await fiveAxisAggregatorEngine.orchestrate({
      request_type: sub_type,
      kinematics: (req as any).kinematics ?? "generic",
    });
  }

  private async handleMultiAxis(req: MillOrchestrationRequest): Promise<unknown> {
    const { multiAxisAggregatorEngine } = await import("./MultiAxisAggregatorEngine.js");
    const sub_type = (req as any).sub_type ?? "kinematic_fk";
    return await multiAxisAggregatorEngine.orchestrate({
      request_type: sub_type,
      axis_count: (req as any).axis_count ?? 5,
    });
  }

  private async handleTribalWriteback(req: MillOrchestrationRequest): Promise<unknown> {
    throw new NotWiredError(
      "tribal_writeback",
      "TribalKnowledgeAdvisorEngine.writeback",
      "Writeback path to tribal registry not yet built; use prism_knowledge:tribal_add",
      { proposed_tip: (req as any).tip ?? req.query ?? "" },
    );
  }

  private async handlePatternSync(_req: MillOrchestrationRequest): Promise<unknown> {
    throw new NotWiredError(
      "pattern_sync",
      "MillPatternMinerEngine.sync",
      "Pattern sync source-of-truth reader not yet built",
    );
  }

  private async handleBlueprintBridge(req: MillOrchestrationRequest): Promise<unknown> {
    throw new NotWiredError(
      "blueprint_bridge",
      "BlueprintToProgramBridge (print-to-program entrypoint)",
      "Blueprint bridge not yet built",
      { features_requested: req.features?.length ?? 0 },
    );
  }

  private async handleModelLoad(req: MillOrchestrationRequest): Promise<unknown> {
    throw new NotWiredError(
      "model_load",
      "MillDeepLearningEngine.loadModel",
      "Model-load path not yet built; no training artifacts to mount",
      { requested_model: (req as any).model_id ?? "" },
    );
  }

  private async handleHiveSync(_req: MillOrchestrationRequest): Promise<unknown> {
    throw new NotWiredError(
      "hive_sync",
      "HiveSyncCoordinator",
      "Cross-session memory-graph sync not yet built",
    );
  }

  private async handleCustomerLearn(_req: MillOrchestrationRequest): Promise<unknown> {
    throw new NotWiredError(
      "customer_learn",
      "MillingMetaLearningEngine.learnFromOutcome",
      "Customer-outcome learner not yet built",
    );
  }

  private async handleOutcomeReplan(_req: MillOrchestrationRequest): Promise<unknown> {
    throw new NotWiredError(
      "outcome_replan",
      "MillMasterOrchestrator.replan",
      "Replan path not yet built; no real planner to consult",
    );
  }

  private async handleJMDieRefresh(_req: MillOrchestrationRequest): Promise<unknown> {
    throw new NotWiredError(
      "jmdie_refresh",
      "PRISMSelfAwarenessEngine.refreshJMDieIndex",
      "JM Die index refresh path not yet wired to self-awareness engine",
    );
  }

  private buildProvenance(
    type: MillOrchRequestType,
    engines: string[],
    formulas: string[],
    tribal: string[],
    confidence: number,
    startTime: number
  ): MillOrchestrationProvenance {
    return {
      request_type: type,
      engines_invoked: engines,
      formulas_used: formulas,
      tribal_sources: tribal,
      confidence,
      processing_time_ms: Date.now() - startTime,
      ts: new Date().toISOString(),
    };
  }
}

export const millMasterOrchestratorFacadeEngine = new MillMasterOrchestratorFacadeEngine();
