/**
 * MultiAxisAggregatorEngine — L2 Multi-Axis Aggregator
 * =====================================================
 * Single entry point for multi-axis (4+, including 5+) operations.
 * Wraps:
 *   - MultiAxisKinematicEngine (forward/inverse kinematics)
 *   - MultiAxisPrintToProgramEngine (print-to-program pipeline)
 *
 * Used when part geometry or accessibility requires 4+ axes but may
 * not be strict 5-axis simultaneous (FiveAxisAggregatorEngine owns that).
 *
 * Request types (4):
 *   1. kinematic_fk    — Forward kinematics (joint → TCP)
 *   2. kinematic_ik    — Inverse kinematics (TCP → joints)
 *   3. print_to_prog   — Multi-axis print-to-program
 *   4. validate_reach  — Reachability validation for given pose
 *
 * @module engines/MultiAxisAggregatorEngine
 * @milestone MILL-MASTER/P1-U09-L2-AGG
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type MultiAxisRequestType =
  | "kinematic_fk"
  | "kinematic_ik"
  | "print_to_prog"
  | "validate_reach";

export interface MultiAxisRequest {
  request_type: MultiAxisRequestType;
  axis_count?: 4 | 5 | 6;
  joint_values?: number[];
  tcp_target?: { x: number; y: number; z: number; a?: number; b?: number; c?: number };
  part?: Record<string, unknown>;
  machine?: Record<string, unknown>;
}

export interface MultiAxisResponse {
  success: boolean;
  request_type: MultiAxisRequestType;
  engine: string;
  result: unknown;
  provenance: {
    engines_invoked: string[];
    processing_time_ms: number;
    engine_available: boolean;
    axis_count: number;
    ts: string;
  };
  warnings: string[];
}

interface MultiAxisRoute {
  engine_name: string;
  module_path: string;
  export_name: string;
  method: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class MultiAxisAggregatorEngine {
  private readonly routes: Map<MultiAxisRequestType, MultiAxisRoute> = new Map([
    ["kinematic_fk", {
      engine_name: "MultiAxisKinematicEngine",
      module_path: "./MultiAxisKinematicEngine.js",
      export_name: "multiAxisKinematicEngine",
      method: "forwardKinematics",
    }],
    ["kinematic_ik", {
      engine_name: "MultiAxisKinematicEngine",
      module_path: "./MultiAxisKinematicEngine.js",
      export_name: "multiAxisKinematicEngine",
      method: "inverseKinematics",
    }],
    ["print_to_prog", {
      engine_name: "MultiAxisPrintToProgramEngine",
      module_path: "./MultiAxisPrintToProgramEngine.js",
      export_name: "multiAxisPrintToProgramEngine",
      method: "generate",
    }],
    ["validate_reach", {
      engine_name: "MultiAxisKinematicEngine",
      module_path: "./MultiAxisKinematicEngine.js",
      export_name: "multiAxisKinematicEngine",
      method: "checkReachability",
    }],
  ]);

  private invocationCount = 0;

  /**
   * Main entry — routes multi-axis request
   */
  async orchestrate(request: MultiAxisRequest): Promise<MultiAxisResponse> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const axis_count = request.axis_count ?? 5;

    log.info(`[MultiAxis] Routing ${request.request_type} (axes=${axis_count})`);
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
          axis_count,
          ts: new Date().toISOString(),
        },
        warnings: [`Unknown request_type: ${request.request_type}`],
      };
    }

    try {
      const mod = await import(route.module_path);
      const engine = mod[route.export_name];

      if (!engine || typeof engine[route.method] !== "function") {
        warnings.push(`${route.engine_name}.${route.method} not available`);
        return this.buildUnavailable(request.request_type, route, axis_count, startTime, warnings);
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
          axis_count,
          ts: new Date().toISOString(),
        },
        warnings,
      };
    } catch (err: any) {
      warnings.push(`Module ${route.module_path} unavailable: ${err.message}`);
      return this.buildUnavailable(request.request_type, route, axis_count, startTime, warnings);
    }
  }

  /**
   * Return supported axis counts
   */
  getSupportedAxisCounts(): number[] {
    return [4, 5, 6];
  }

  /**
   * Return supported request types
   */
  getSupportedTypes(): MultiAxisRequestType[] {
    return Array.from(this.routes.keys());
  }

  /**
   * Get unique registered engines
   */
  getRegisteredEngines(): string[] {
    const set = new Set<string>();
    for (const route of this.routes.values()) set.add(route.engine_name);
    return Array.from(set).sort();
  }

  /**
   * Aggregator stats
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
  async isAvailable(type: MultiAxisRequestType): Promise<boolean> {
    const route = this.routes.get(type);
    if (!route) return false;
    try {
      const mod = await import(route.module_path);
      return !!mod[route.export_name] && typeof mod[route.export_name][route.method] === "function";
    } catch {
      return false;
    }
  }

  private buildUnavailable(
    type: MultiAxisRequestType,
    route: MultiAxisRoute,
    axis_count: number,
    startTime: number,
    warnings: string[]
  ): MultiAxisResponse {
    return {
      success: false,
      request_type: type,
      engine: route.engine_name,
      result: { status: "engine_not_built", routed_to: route.engine_name },
      provenance: {
        engines_invoked: [route.engine_name],
        processing_time_ms: Date.now() - startTime,
        engine_available: false,
        axis_count,
        ts: new Date().toISOString(),
      },
      warnings,
    };
  }
}

export const multiAxisAggregatorEngine = new MultiAxisAggregatorEngine();
