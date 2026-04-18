/**
 * LatheMasterPostAPIEngine — Unified API Surface for Master Post
 *
 * U-LTH30: Provides REST-compatible API for master post operations.
 * Wires lathe_masterpost_{route, emit, validate, explain, cross_check, audit}
 * actions through camDispatcher.
 *
 * API Operations:
 *   - route: Select sub-post for machine/operation
 *   - emit: Generate G-code via selected post
 *   - validate: Validate generated G-code
 *   - explain: Get decision trace for routing
 *   - cross_check: Ensemble validation across posts
 *   - audit: Self-awareness health check
 *
 * @module LatheMasterPostAPIEngine
 */

import { latheMasterPostRouterEngine, type MasterPostRouteRequest, type MasterPostRouteResult, type RouteDecision } from "./LatheMasterPostRouterEngine.js";
import { latheMasterPostUnifiedOutputEngine, type UnifyOutputInput, type UnifiedOutputResult } from "./LatheMasterPostUnifiedOutputEngine.js";
import { latheMasterPostSelfAwarenessEngine } from "./LatheMasterPostSelfAwarenessEngine.js";
import { latheMasterPostDeepReasoningEngine, type PostDecisionTrace } from "./LatheMasterPostDeepReasoningEngine.js";
import { latheMasterPostEnsembleCrossCheckEngine, type EnsembleCrossCheckResult } from "./LatheMasterPostEnsembleCrossCheckEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** API request envelope */
export interface MasterPostAPIRequest {
  action: "route" | "emit" | "validate" | "explain" | "cross_check" | "audit";
  payload: Record<string, unknown>;
  request_id?: string;
  timestamp?: string;
}

/** API response envelope */
export interface MasterPostAPIResponse<T = unknown> {
  success: boolean;
  action: string;
  request_id: string;
  timestamp: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  execution_time_ms: number;
}

/** Route action payload */
export interface RouteActionPayload {
  machine_id: string;
  operation: string;
  controller?: string;
  program_name?: string;
  program_number?: number;
  moves: Array<{
    type: "rapid" | "linear" | "arc_cw" | "arc_ccw";
    x?: number;
    z?: number;
    feed?: number;
    i?: number;
    k?: number;
  }>;
  tool_number: number;
  spindle_rpm: number;
  feed_rate_mmmin: number;
  material_iso?: string;
  coolant?: string;
  work_offset?: string;
  customer?: string;
  part_number?: string;
  stock_diameter_mm?: number;
  stock_length_mm?: number;
  css_mode?: boolean;
  sub_spindle?: boolean;
  live_tooling?: boolean;
}

/** Emit action payload */
export interface EmitActionPayload extends RouteActionPayload {
  include_line_numbers?: boolean;
  line_number_start?: number;
  line_number_increment?: number;
  format_options?: {
    header_style?: "minimal" | "standard" | "verbose";
    metadata_block?: boolean;
    tool_list?: boolean;
  };
}

/** Validate action payload */
export interface ValidateActionPayload {
  gcode: string;
  expected_controller?: string;
  strict_mode?: boolean;
}

/** Explain action payload */
export interface ExplainActionPayload {
  route_request: RouteActionPayload;
  route_decision: {
    machine_id: string;
    machine_name: string;
    controller_family: string;
    controller_model: string;
    selected_post: string;
    route_method: "direct_match" | "controller_family" | "fallback_generator";
    confidence: number;
    reasoning: string[];
  };
}

/** Cross-check action payload */
export interface CrossCheckActionPayload {
  route_request: RouteActionPayload;
  candidate_posts: string[];
  thresholds?: {
    block_count_pct?: number;
    cycle_time_pct?: number;
    content_similarity_min?: number;
  };
}

/** Audit action payload */
export interface AuditActionPayload {
  scope?: "full" | "sub_post" | "drift";
  sub_post_id?: string;
}

/** Combined route + emit result */
export interface RouteAndEmitResult {
  route_decision: RouteDecision;
  gcode: string;
  unified_output: UnifiedOutputResult;
  block_count: number;
  cycle_time_estimate_s?: number;
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheMasterPostAPIEngine {
  private requestCounter = 0;

  /**
   * Main API entry point - processes any action
   */
  async processRequest(request: MasterPostAPIRequest): Promise<MasterPostAPIResponse> {
    const startTime = Date.now();
    const requestId = request.request_id || `req_${++this.requestCounter}_${Date.now()}`;

    try {
      let data: unknown;

      switch (request.action) {
        case "route":
          data = this.handleRoute(request.payload as RouteActionPayload);
          break;
        case "emit":
          data = this.handleEmit(request.payload as EmitActionPayload);
          break;
        case "validate":
          data = this.handleValidate(request.payload as ValidateActionPayload);
          break;
        case "explain":
          data = this.handleExplain(request.payload as ExplainActionPayload);
          break;
        case "cross_check":
          data = this.handleCrossCheck(request.payload as CrossCheckActionPayload);
          break;
        case "audit":
          data = this.handleAudit(request.payload as AuditActionPayload);
          break;
        default:
          throw new Error(`Unknown action: ${request.action}`);
      }

      return {
        success: true,
        action: request.action,
        request_id: requestId,
        timestamp: new Date().toISOString(),
        data,
        execution_time_ms: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        action: request.action,
        request_id: requestId,
        timestamp: new Date().toISOString(),
        error: {
          code: "PROCESSING_ERROR",
          message: error instanceof Error ? error.message : String(error),
          details: { action: request.action }
        },
        execution_time_ms: Date.now() - startTime
      };
    }
  }

  /**
   * Route action - select sub-post and generate G-code
   */
  route(payload: RouteActionPayload): MasterPostRouteResult {
    const request = this.convertToRouteRequest(payload);
    return latheMasterPostRouterEngine.route(request);
  }

  /**
   * Emit action - generate unified G-code output
   */
  emit(payload: EmitActionPayload): RouteAndEmitResult {
    const request = this.convertToRouteRequest(payload);

    // Route to get decision
    const routeResult = latheMasterPostRouterEngine.route(request);

    if (!routeResult.success) {
      throw new Error(`Routing failed: ${routeResult.errors.join(", ")}`);
    }

    // Unify output
    const unifyInput: UnifyOutputInput = {
      raw_gcode: routeResult.gcode,
      metadata: {
        program_number: payload.program_number || 1000,
        program_name: payload.program_name || "PART",
        machine_id: payload.machine_id,
        machine_name: routeResult.route_decision.machine_name,
        controller_family: routeResult.route_decision.controller_family,
        controller_model: routeResult.route_decision.controller_model,
        material: payload.material_iso,
        customer: payload.customer,
        part_number: payload.part_number,
        operation_type: payload.operation,
        generated_at: new Date().toISOString(),
        generated_by: "PRISM Master Post",
        prism_version: "1.0.0"
      },
      tools: [
        {
          tool_number: payload.tool_number,
          description: `TOOL ${payload.tool_number}`,
        }
      ],
      source_post: routeResult.route_decision.selected_post,
      include_line_numbers: payload.include_line_numbers,
      line_number_start: payload.line_number_start,
      line_number_increment: payload.line_number_increment
    };

    const unifiedOutput = latheMasterPostUnifiedOutputEngine.unify(unifyInput);

    return {
      route_decision: routeResult.route_decision,
      gcode: unifiedOutput.gcode,
      unified_output: unifiedOutput,
      block_count: routeResult.block_count,
      cycle_time_estimate_s: routeResult.cycle_time_estimate_s,
      warnings: [...routeResult.warnings, ...unifiedOutput.warnings]
    };
  }

  /**
   * Validate action - validate G-code format
   */
  validate(payload: ValidateActionPayload): {
    valid: boolean;
    format_check: ReturnType<typeof latheMasterPostUnifiedOutputEngine.validateUnifiedFormat>;
    warnings: string[];
  } {
    const formatCheck = latheMasterPostUnifiedOutputEngine.validateUnifiedFormat(payload.gcode);

    const warnings: string[] = [];

    if (!formatCheck.has_prism_header) {
      warnings.push("G-code does not have PRISM header - may not be from master post");
    }

    if (payload.strict_mode && !formatCheck.valid) {
      warnings.push("Strict mode validation failed");
    }

    return {
      valid: formatCheck.valid,
      format_check: formatCheck,
      warnings
    };
  }

  /**
   * Explain action - get decision trace
   */
  explain(payload: ExplainActionPayload): PostDecisionTrace {
    const request = this.convertToRouteRequest(payload.route_request);
    const decision: RouteDecision = {
      machine_id: payload.route_decision.machine_id,
      machine_name: payload.route_decision.machine_name,
      controller_family: payload.route_decision.controller_family,
      controller_model: payload.route_decision.controller_model,
      selected_post: payload.route_decision.selected_post,
      route_method: payload.route_decision.route_method,
      confidence: payload.route_decision.confidence,
      reasoning: payload.route_decision.reasoning
    };

    return latheMasterPostDeepReasoningEngine.explainDecision(request, decision);
  }

  /**
   * Cross-check action - ensemble validation
   */
  crossCheck(payload: CrossCheckActionPayload): EnsembleCrossCheckResult {
    const request = this.convertToRouteRequest(payload.route_request);

    return latheMasterPostEnsembleCrossCheckEngine.crossCheck(
      request,
      payload.candidate_posts,
      payload.thresholds
    );
  }

  /**
   * Audit action - self-awareness health check
   */
  audit(payload: AuditActionPayload): Record<string, unknown> {
    const scope = payload.scope || "full";

    switch (scope) {
      case "full":
        return latheMasterPostSelfAwarenessEngine.runFullAudit();
      case "sub_post":
        if (!payload.sub_post_id) {
          throw new Error("sub_post_id required for sub_post scope");
        }
        return latheMasterPostSelfAwarenessEngine.auditSubPost(payload.sub_post_id);
      case "drift":
        if (!payload.sub_post_id) {
          throw new Error("sub_post_id required for drift scope");
        }
        return latheMasterPostSelfAwarenessEngine.detectDrift(payload.sub_post_id);
      default:
        throw new Error(`Unknown audit scope: ${scope}`);
    }
  }

  /**
   * Get available actions for documentation
   */
  getAvailableActions(): Array<{
    action: string;
    description: string;
    payload_schema: string;
  }> {
    return [
      {
        action: "route",
        description: "Select sub-post and generate G-code for a job",
        payload_schema: "RouteActionPayload"
      },
      {
        action: "emit",
        description: "Generate unified G-code output with formatting options",
        payload_schema: "EmitActionPayload"
      },
      {
        action: "validate",
        description: "Validate G-code format and structure",
        payload_schema: "ValidateActionPayload"
      },
      {
        action: "explain",
        description: "Get decision trace for a routing decision",
        payload_schema: "ExplainActionPayload"
      },
      {
        action: "cross_check",
        description: "Run ensemble validation across multiple posts",
        payload_schema: "CrossCheckActionPayload"
      },
      {
        action: "audit",
        description: "Run self-awareness health check",
        payload_schema: "AuditActionPayload"
      }
    ];
  }

  /**
   * Get API statistics
   */
  getStatistics(): {
    total_requests: number;
    actions_available: number;
  } {
    return {
      total_requests: this.requestCounter,
      actions_available: 6
    };
  }

  // ── Private Handlers ─────────────────────────────────────────────────────

  private handleRoute(payload: RouteActionPayload): MasterPostRouteResult {
    return this.route(payload);
  }

  private handleEmit(payload: EmitActionPayload): RouteAndEmitResult {
    return this.emit(payload);
  }

  private handleValidate(payload: ValidateActionPayload): ReturnType<typeof this.validate> {
    return this.validate(payload);
  }

  private handleExplain(payload: ExplainActionPayload): PostDecisionTrace {
    return this.explain(payload);
  }

  private handleCrossCheck(payload: CrossCheckActionPayload): EnsembleCrossCheckResult {
    return this.crossCheck(payload);
  }

  private handleAudit(payload: AuditActionPayload): Record<string, unknown> {
    return this.audit(payload);
  }

  // ── Private Converters ───────────────────────────────────────────────────

  private convertToRouteRequest(payload: RouteActionPayload): MasterPostRouteRequest {
    return {
      machine_id: payload.machine_id,
      operation: payload.operation as MasterPostRouteRequest["operation"],
      controller: payload.controller,
      program_name: payload.program_name,
      program_number: payload.program_number,
      moves: payload.moves,
      tool_number: payload.tool_number,
      spindle_rpm: payload.spindle_rpm,
      feed_rate_mmmin: payload.feed_rate_mmmin,
      material_iso: payload.material_iso as MasterPostRouteRequest["material_iso"],
      coolant: payload.coolant as MasterPostRouteRequest["coolant"],
      work_offset: payload.work_offset,
      customer: payload.customer,
      part_number: payload.part_number,
      stock_diameter_mm: payload.stock_diameter_mm,
      stock_length_mm: payload.stock_length_mm,
      css_mode: payload.css_mode,
      sub_spindle: payload.sub_spindle,
      live_tooling: payload.live_tooling
    };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheMasterPostAPIEngine = new LatheMasterPostAPIEngine();


// ============================================================================
// DISPATCHER ACTION DEFINITIONS
// ============================================================================

/**
 * Action definitions for camDispatcher integration.
 * These map to dispatcher action handlers.
 */
export const LATHE_MASTERPOST_ACTIONS = {
  route: {
    action: "lathe_masterpost_route",
    description: "Route job to appropriate sub-post and generate G-code",
    handler: (params: RouteActionPayload) => latheMasterPostAPIEngine.route(params)
  },
  emit: {
    action: "lathe_masterpost_emit",
    description: "Generate unified G-code output with formatting",
    handler: (params: EmitActionPayload) => latheMasterPostAPIEngine.emit(params)
  },
  validate: {
    action: "lathe_masterpost_validate",
    description: "Validate G-code format and structure",
    handler: (params: ValidateActionPayload) => latheMasterPostAPIEngine.validate(params)
  },
  explain: {
    action: "lathe_masterpost_explain",
    description: "Get decision trace for routing decision",
    handler: (params: ExplainActionPayload) => latheMasterPostAPIEngine.explain(params)
  },
  cross_check: {
    action: "lathe_masterpost_cross_check",
    description: "Run ensemble validation across posts",
    handler: (params: CrossCheckActionPayload) => latheMasterPostAPIEngine.crossCheck(params)
  },
  audit: {
    action: "lathe_masterpost_audit",
    description: "Run self-awareness health check",
    handler: (params: AuditActionPayload) => latheMasterPostAPIEngine.audit(params)
  }
} as const;
