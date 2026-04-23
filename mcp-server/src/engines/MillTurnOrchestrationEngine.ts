/**
 * MillTurnOrchestrationEngine — L2 Mill-Turn Aggregator
 * ======================================================
 * Single entry point for mill-turn operations. Wraps:
 *   - MillTurnCAMEngine (CAM operations for mill-turn)
 *   - MillTurnSwissPipelineEngine (Swiss-type lathes)
 *   - MillTurnLoRACadenceEngine [EXISTS]
 *   - MillTurnLoRADatasetBuilderEngine [EXISTS]
 *
 * Mill-turn machines combine turning + live tooling milling in one setup.
 * Common platforms: Okuma LB3000-MYW, Mazak Integrex, DMG MORI CTX, Nakamura-Tome.
 *
 * Request types (6):
 *   1. cam_generate    — Generate mill-turn CAM toolpaths
 *   2. swiss_pipeline  — Swiss-type lathe multi-channel pipeline
 *   3. sub_spindle     — Sub-spindle transfer operations
 *   4. live_tool       — Live (driven) tool milling on lathe
 *   5. multi_channel   — Multi-channel (main + sub + tool) synchronization
 *   6. bar_feeder      — Bar feeder integration for production
 *
 * @module engines/MillTurnOrchestrationEngine
 * @milestone MILL-MASTER/P1-U09-L2-AGG
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type MillTurnRequestType =
  | "cam_generate"
  | "swiss_pipeline"
  | "sub_spindle"
  | "live_tool"
  | "multi_channel"
  | "bar_feeder";

export type MillTurnMachineClass =
  | "integrex"     // Mazak Integrex
  | "swiss"        // Swiss-type (Citizen, Tsugami, Star)
  | "lb_series"    // Okuma LB
  | "ctx"          // DMG MORI CTX
  | "wt_series"    // Nakamura-Tome WT
  | "generic";

export interface MillTurnRequest {
  request_type: MillTurnRequestType;
  machine_class?: MillTurnMachineClass;
  part_geometry?: Record<string, unknown>;
  operations?: Array<{ type: string; tool_id?: string; params?: Record<string, unknown> }>;
  bar_diameter_mm?: number;
  bar_length_mm?: number;
  sub_spindle_enabled?: boolean;
  live_tool_spindle_rpm?: number;
  channels?: number;
}

export interface MillTurnResponse {
  success: boolean;
  request_type: MillTurnRequestType;
  engine: string;
  result: unknown;
  provenance: {
    engines_invoked: string[];
    processing_time_ms: number;
    engine_available: boolean;
    ts: string;
  };
  warnings: string[];
}

interface MillTurnRoute {
  engine_name: string;
  module_path: string;
  export_name: string;
  method: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class MillTurnOrchestrationEngine {
  private readonly routes: Map<MillTurnRequestType, MillTurnRoute> = new Map([
    ["cam_generate", {
      engine_name: "MillTurnCAMEngine",
      module_path: "./MillTurnCAMEngine.js",
      export_name: "millTurnCAMEngine",
      method: "generate",
    }],
    ["swiss_pipeline", {
      engine_name: "MillTurnSwissPipelineEngine",
      module_path: "./MillTurnSwissPipelineEngine.js",
      export_name: "millTurnSwissPipelineEngine",
      method: "execute",
    }],
    ["sub_spindle", {
      engine_name: "MillTurnCAMEngine",
      module_path: "./MillTurnCAMEngine.js",
      export_name: "millTurnCAMEngine",
      method: "planSubSpindle",
    }],
    ["live_tool", {
      engine_name: "MillTurnCAMEngine",
      module_path: "./MillTurnCAMEngine.js",
      export_name: "millTurnCAMEngine",
      method: "planLiveTool",
    }],
    ["multi_channel", {
      engine_name: "MillTurnSwissPipelineEngine",
      module_path: "./MillTurnSwissPipelineEngine.js",
      export_name: "millTurnSwissPipelineEngine",
      method: "synchronize",
    }],
    ["bar_feeder", {
      engine_name: "MillTurnSwissPipelineEngine",
      module_path: "./MillTurnSwissPipelineEngine.js",
      export_name: "millTurnSwissPipelineEngine",
      method: "planBarFeed",
    }],
  ]);

  private invocationCount = 0;

  /**
   * Main entry — routes mill-turn request to appropriate sub-engine.
   * Returns an honest missing-engine response when the sub-engine isn't
   * built; never fabricates success data.
   */
  async orchestrate(request: MillTurnRequest): Promise<MillTurnResponse> {
    const startTime = Date.now();

    log.info(`[MillTurn] Routing ${request.request_type} (class=${request.machine_class ?? "generic"})`);
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
          ts: new Date().toISOString(),
        },
        warnings: [`Unknown request_type: ${request.request_type}`],
      };
    }

    let mod: any;
    try {
      mod = await import(route.module_path);
    } catch (err: any) {
      return this.buildMissing(request.request_type, route, startTime,
        `Module ${route.module_path} not found: ${err.message}`);
    }

    const engine = mod[route.export_name];
    if (!engine || typeof engine[route.method] !== "function") {
      return this.buildMissing(request.request_type, route, startTime,
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
        ts: new Date().toISOString(),
      },
      warnings: [],
    };
  }

  /**
   * Return supported machine classes
   */
  getSupportedMachineClasses(): MillTurnMachineClass[] {
    return ["integrex", "swiss", "lb_series", "ctx", "wt_series", "generic"];
  }

  /**
   * Return supported request types
   */
  getSupportedTypes(): MillTurnRequestType[] {
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
   * Get stats for monitoring
   */
  getStats(): { request_types: number; engines: number; invocations: number } {
    return {
      request_types: this.routes.size,
      engines: this.getRegisteredEngines().length,
      invocations: this.invocationCount,
    };
  }

  /**
   * Check runtime availability of a sub-engine
   */
  async isAvailable(type: MillTurnRequestType): Promise<boolean> {
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
    type: MillTurnRequestType,
    route: MillTurnRoute,
    startTime: number,
    reason: string,
  ): MillTurnResponse {
    return {
      success: false,
      request_type: type,
      engine: route.engine_name,
      result: null,
      provenance: {
        engines_invoked: [route.engine_name],
        processing_time_ms: Date.now() - startTime,
        engine_available: false,
        ts: new Date().toISOString(),
      },
      warnings: [reason],
    };
  }
}

export const millTurnOrchestrationEngine = new MillTurnOrchestrationEngine();
