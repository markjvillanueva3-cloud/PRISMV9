/**
 * FiveAxisAggregatorEngine — L2 5-Axis Aggregator
 * ================================================
 * Single entry point for 5-axis operations. Wraps 9 FiveAxis* sub-engines:
 *   1. FiveAxisOrchestrationEngine (top-level 5-axis pipeline)
 *   2. FiveAxisAIUltraEngine (AGI-grade 5-axis reasoning)
 *   3. FiveAxisDeepLearningEngine (ML for tilt/tool-axis)
 *   4. FiveAxisCAMIntegrationEngine (CAM system bridges)
 *   5. FiveAxisToolpathIntegrationEngine (toolpath fusion)
 *   6. FiveAxisToolpathSynthesisEngine (new toolpath generation)
 *   7. FiveAxisPostEngine (post-processor)
 *   8. FiveAxisDecisionEngine (decision tree for strategy)
 *   9. FiveAxisCADTemplateEngine (CAD template generation)
 *
 * Pattern: dynamic import with graceful fallback when engine not yet built.
 *
 * Request types (10):
 *   1. orchestrate     — Top-level pipeline
 *   2. ai_ultra        — AGI reasoning
 *   3. deep_learn      — Deep learning prediction
 *   4. cam_integrate   — CAM integration
 *   5. toolpath_fuse   — Fuse toolpaths
 *   6. toolpath_synth  — Synthesize new toolpath
 *   7. post_process    — Post-process G-code
 *   8. decide          — Strategy decision
 *   9. cad_template    — Generate CAD template
 *  10. rtcp_check      — RTCP (Rotation Tool Center Point) check
 *
 * @module engines/FiveAxisAggregatorEngine
 * @milestone MILL-MASTER/P1-U09-L2-AGG
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type FiveAxisRequestType =
  | "orchestrate"
  | "ai_ultra"
  | "deep_learn"
  | "cam_integrate"
  | "toolpath_fuse"
  | "toolpath_synth"
  | "post_process"
  | "decide"
  | "cad_template"
  | "rtcp_check";

export type FiveAxisKinematics =
  | "head_head"      // Both rotary axes on head (e.g. DMG MORI DMU)
  | "head_table"     // One on head, one on table (e.g. Haas UMC)
  | "table_table"    // Both rotary on table (e.g. Matsuura MAM72)
  | "gantry"         // 5-axis gantry (large parts)
  | "generic";

export interface FiveAxisRequest {
  request_type: FiveAxisRequestType;
  kinematics?: FiveAxisKinematics;
  part?: Record<string, unknown>;
  tool?: Record<string, unknown>;
  lead_angle_deg?: number;
  tilt_angle_deg?: number;
  tool_axis?: [number, number, number];
  strategy?: string;
  gcode?: string;
  controller?: string;
}

export interface FiveAxisResponse {
  success: boolean;
  request_type: FiveAxisRequestType;
  engine: string;
  result: unknown;
  provenance: {
    engines_invoked: string[];
    processing_time_ms: number;
    engine_available: boolean;
    kinematics: FiveAxisKinematics;
    ts: string;
  };
  warnings: string[];
}

interface FiveAxisRoute {
  engine_name: string;
  module_path: string;
  export_name: string;
  method: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class FiveAxisAggregatorEngine {
  private readonly routes: Map<FiveAxisRequestType, FiveAxisRoute> = new Map([
    ["orchestrate", {
      engine_name: "FiveAxisOrchestrationEngine",
      module_path: "./FiveAxisOrchestrationEngine.js",
      export_name: "fiveAxisOrchestrationEngine",
      method: "orchestrate",
    }],
    ["ai_ultra", {
      engine_name: "FiveAxisAIUltraEngine",
      module_path: "./FiveAxisAIUltraEngine.js",
      export_name: "fiveAxisAIUltraEngine",
      method: "reason",
    }],
    ["deep_learn", {
      engine_name: "FiveAxisDeepLearningEngine",
      module_path: "./FiveAxisDeepLearningEngine.js",
      export_name: "fiveAxisDeepLearningEngine",
      method: "predict",
    }],
    ["cam_integrate", {
      engine_name: "FiveAxisCAMIntegrationEngine",
      module_path: "./FiveAxisCAMIntegrationEngine.js",
      export_name: "fiveAxisCAMIntegrationEngine",
      method: "integrate",
    }],
    ["toolpath_fuse", {
      engine_name: "FiveAxisToolpathIntegrationEngine",
      module_path: "./FiveAxisToolpathIntegrationEngine.js",
      export_name: "fiveAxisToolpathIntegrationEngine",
      method: "fuse",
    }],
    ["toolpath_synth", {
      engine_name: "FiveAxisToolpathSynthesisEngine",
      module_path: "./FiveAxisToolpathSynthesisEngine.js",
      export_name: "fiveAxisToolpathSynthesisEngine",
      method: "synthesize",
    }],
    ["post_process", {
      engine_name: "FiveAxisPostEngine",
      module_path: "./FiveAxisPostEngine.js",
      export_name: "fiveAxisPostEngine",
      method: "process",
    }],
    ["decide", {
      engine_name: "FiveAxisDecisionEngine",
      module_path: "./FiveAxisDecisionEngine.js",
      export_name: "fiveAxisDecisionEngine",
      method: "decide",
    }],
    ["cad_template", {
      engine_name: "FiveAxisCADTemplateEngine",
      module_path: "./FiveAxisCADTemplateEngine.js",
      export_name: "fiveAxisCADTemplateEngine",
      method: "generate",
    }],
    ["rtcp_check", {
      engine_name: "FiveAxisOrchestrationEngine",
      module_path: "./FiveAxisOrchestrationEngine.js",
      export_name: "fiveAxisOrchestrationEngine",
      method: "checkRTCP",
    }],
  ]);

  private invocationCount = 0;

  /**
   * Main entry — routes 5-axis request to appropriate sub-engine.
   * Honest missing-engine response when the sub-engine isn't built.
   */
  async orchestrate(request: FiveAxisRequest): Promise<FiveAxisResponse> {
    const startTime = Date.now();
    const kinematics = request.kinematics ?? "generic";

    log.info(`[FiveAxis] Routing ${request.request_type} (kinematics=${kinematics})`);
    this.invocationCount++;

    const route = this.routes.get(request.request_type);
    if (!route) {
      return {
        success: false,
        request_type: request.request_type,
        engine: "unknown",
        result: null,
        provenance: {
          engines_invoked: [],
          processing_time_ms: Date.now() - startTime,
          engine_available: false,
          kinematics,
          ts: new Date().toISOString(),
        },
        warnings: [`Unknown request_type: ${request.request_type}`],
      };
    }

    let mod: any;
    try {
      mod = await import(route.module_path);
    } catch (err: any) {
      return this.buildMissing(request.request_type, route, kinematics, startTime,
        `Module ${route.module_path} not found: ${err.message}`);
    }
    const engine = mod[route.export_name];
    if (!engine || typeof engine[route.method] !== "function") {
      return this.buildMissing(request.request_type, route, kinematics, startTime,
        `${route.engine_name}.${route.method} is not a callable function`);
    }

    const result = await engine[route.method](request);
    return {
      success: true,
      request_type: request.request_type,
      engine: route.engine_name,
      result,
      provenance: {
        engines_invoked: [route.engine_name],
        processing_time_ms: Date.now() - startTime,
        engine_available: true,
        kinematics,
        ts: new Date().toISOString(),
      },
      warnings: [],
    };
  }

  /**
   * Return supported kinematics configurations
   */
  getSupportedKinematics(): FiveAxisKinematics[] {
    return ["head_head", "head_table", "table_table", "gantry", "generic"];
  }

  /**
   * Return supported request types
   */
  getSupportedTypes(): FiveAxisRequestType[] {
    return Array.from(this.routes.keys());
  }

  /**
   * Get registered engine names (unique)
   */
  getRegisteredEngines(): string[] {
    const set = new Set<string>();
    for (const route of this.routes.values()) set.add(route.engine_name);
    return Array.from(set).sort();
  }

  /**
   * Get aggregator stats
   */
  getStats(): { request_types: number; engines: number; invocations: number } {
    return {
      request_types: this.routes.size,
      engines: this.getRegisteredEngines().length,
      invocations: this.invocationCount,
    };
  }

  /**
   * Runtime availability check
   */
  async isAvailable(type: FiveAxisRequestType): Promise<boolean> {
    const route = this.routes.get(type);
    if (!route) return false;
    try {
      const mod = await import(route.module_path);
      return !!mod[route.export_name] && typeof mod[route.export_name][route.method] === "function";
    } catch {
      return false;
    }
  }

  /** Honest missing-engine response — never returns fake success data. */
  private buildMissing(
    type: FiveAxisRequestType,
    route: FiveAxisRoute,
    kinematics: FiveAxisKinematics,
    startTime: number,
    reason: string,
  ): FiveAxisResponse {
    return {
      success: false,
      request_type: type,
      engine: route.engine_name,
      result: null,
      provenance: {
        engines_invoked: [route.engine_name],
        processing_time_ms: Date.now() - startTime,
        engine_available: false,
        kinematics,
        ts: new Date().toISOString(),
      },
      warnings: [reason],
    };
  }
}

export const fiveAxisAggregatorEngine = new FiveAxisAggregatorEngine();
