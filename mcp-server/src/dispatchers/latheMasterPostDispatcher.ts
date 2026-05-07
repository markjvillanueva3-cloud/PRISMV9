/**
 * latheMasterPostDispatcher — Dispatcher for Master Post actions
 *
 * U-LTH32: Part of Forge-Triple for Master Post.
 * Routes prism_lathe:masterpost_* actions to appropriate handlers.
 *
 * Actions:
 *   - masterpost_full: Complete route + emit + validate + explain flow
 *   - masterpost_route: Route to sub-post
 *   - masterpost_emit: Generate unified G-code
 *   - masterpost_validate: Validate G-code format
 *   - masterpost_explain: Get decision trace
 *   - masterpost_cross_check: Run ensemble validation
 *   - masterpost_audit: Run self-awareness audit
 *   - masterpost_regression: Run regression matrix
 *
 * @module dispatchers/latheMasterPostDispatcher
 */

import { z } from "zod";
import {
  latheMasterPostAPIEngine,
  type RouteActionPayload,
  type EmitActionPayload,
  type ValidateActionPayload,
  type ExplainActionPayload,
  type CrossCheckActionPayload,
  type AuditActionPayload,
} from "../engines/LatheMasterPostAPIEngine.js";
import { latheMasterPostRegressionMatrixEngine } from "../engines/LatheMasterPostRegressionMatrixEngine.js";
import { masterPostUnknownMachineGuardHook } from "../hooks/MasterPostUnknownMachineGuardHook.js";

// ============================================================================
// SCHEMAS
// ============================================================================

const MoveSchema = z.object({
  type: z.enum(["rapid", "linear", "arc_cw", "arc_ccw"]),
  x: z.number().optional(),
  z: z.number().optional(),
  feed: z.number().optional(),
  i: z.number().optional(),
  k: z.number().optional(),
});

const RoutePayloadSchema = z.object({
  machine_id: z.string(),
  operation: z.string(),
  controller: z.string().optional(),
  program_name: z.string().optional(),
  program_number: z.number().optional(),
  moves: z.array(MoveSchema),
  tool_number: z.number(),
  spindle_rpm: z.number(),
  feed_rate_mmmin: z.number(),
  material_iso: z.string().optional(),
  coolant: z.string().optional(),
  work_offset: z.string().optional(),
  customer: z.string().optional(),
  part_number: z.string().optional(),
  stock_diameter_mm: z.number().optional(),
  stock_length_mm: z.number().optional(),
  css_mode: z.boolean().optional(),
  sub_spindle: z.boolean().optional(),
  live_tooling: z.boolean().optional(),
});

const EmitPayloadSchema = RoutePayloadSchema.extend({
  include_line_numbers: z.boolean().optional(),
  line_number_start: z.number().optional(),
  line_number_increment: z.number().optional(),
});

const ValidatePayloadSchema = z.object({
  gcode: z.string(),
  expected_controller: z.string().optional(),
  strict_mode: z.boolean().optional(),
});

const CrossCheckPayloadSchema = z.object({
  route_request: RoutePayloadSchema,
  candidate_posts: z.array(z.string()),
  thresholds: z.object({
    block_count_pct: z.number().optional(),
    cycle_time_pct: z.number().optional(),
    content_similarity_min: z.number().optional(),
  }).optional(),
});

const AuditPayloadSchema = z.object({
  scope: z.enum(["full", "sub_post", "drift"]).optional(),
  sub_post_id: z.string().optional(),
});

const RegressionPayloadSchema = z.object({
  machines: z.array(z.string()).optional(),
  validators: z.array(z.enum([
    "basic_operations",
    "threading_operations",
    "live_tooling",
    "advanced_features",
    "edge_cases"
  ])).optional(),
  tags: z.array(z.string()).optional(),
});

// ============================================================================
// ACTION ENUM
// ============================================================================

export const LatheMasterPostAction = z.enum([
  "masterpost_full",
  "masterpost_route",
  "masterpost_emit",
  "masterpost_validate",
  "masterpost_explain",
  "masterpost_cross_check",
  "masterpost_audit",
  "masterpost_regression",
]);

export type LatheMasterPostActionType = z.infer<typeof LatheMasterPostAction>;

// ============================================================================
// DISPATCHER
// ============================================================================

export interface LatheMasterPostDispatchResult {
  success: boolean;
  action: string;
  data?: unknown;
  error?: string;
  execution_time_ms: number;
}

/**
 * Dispatch master post action
 */
export async function dispatchLatheMasterPost(
  action: LatheMasterPostActionType,
  params: Record<string, unknown>
): Promise<LatheMasterPostDispatchResult> {
  const startTime = Date.now();

  try {
    let data: unknown;

    switch (action) {
      case "masterpost_full":
        data = await handleMasterPostFull(params);
        break;
      case "masterpost_route":
        data = handleMasterPostRoute(params);
        break;
      case "masterpost_emit":
        data = handleMasterPostEmit(params);
        break;
      case "masterpost_validate":
        data = handleMasterPostValidate(params);
        break;
      case "masterpost_explain":
        data = handleMasterPostExplain(params);
        break;
      case "masterpost_cross_check":
        data = handleMasterPostCrossCheck(params);
        break;
      case "masterpost_audit":
        data = handleMasterPostAudit(params);
        break;
      case "masterpost_regression":
        data = handleMasterPostRegression(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      success: true,
      action,
      data,
      execution_time_ms: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      action,
      error: error instanceof Error ? error.message : String(error),
      execution_time_ms: Date.now() - startTime
    };
  }
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

async function handleMasterPostFull(params: Record<string, unknown>): Promise<{
  route_result: ReturnType<typeof latheMasterPostAPIEngine.route>;
  emit_result: ReturnType<typeof latheMasterPostAPIEngine.emit>;
  validate_result: ReturnType<typeof latheMasterPostAPIEngine.validate>;
  explain_result: ReturnType<typeof latheMasterPostAPIEngine.explain>;
}> {
  const payload = RoutePayloadSchema.parse(params);

  // Check hook first
  const hookResult = masterPostUnknownMachineGuardHook.execute({
    request: payload as RouteActionPayload,
    timestamp: new Date().toISOString()
  });

  if (hookResult.action === "block") {
    throw new Error(hookResult.reason);
  }

  // Route
  const routeResult = latheMasterPostAPIEngine.route(payload as RouteActionPayload);

  // Emit
  const emitResult = latheMasterPostAPIEngine.emit(payload as EmitActionPayload);

  // Validate
  const validateResult = latheMasterPostAPIEngine.validate({
    gcode: emitResult.gcode
  });

  // Explain
  const explainResult = latheMasterPostAPIEngine.explain({
    route_request: payload as RouteActionPayload,
    route_decision: routeResult.route_decision
  });

  return {
    route_result: routeResult,
    emit_result: emitResult,
    validate_result: validateResult,
    explain_result: explainResult
  };
}

function handleMasterPostRoute(params: Record<string, unknown>) {
  const payload = RoutePayloadSchema.parse(params);

  // Check hook
  const hookResult = masterPostUnknownMachineGuardHook.execute({
    request: payload as RouteActionPayload,
    timestamp: new Date().toISOString()
  });

  if (hookResult.action === "redirect") {
    return {
      redirected: true,
      redirect_to: hookResult.redirect_to,
      reason: hookResult.reason,
      metadata: hookResult.metadata
    };
  }

  return latheMasterPostAPIEngine.route(payload as RouteActionPayload);
}

function handleMasterPostEmit(params: Record<string, unknown>) {
  const payload = EmitPayloadSchema.parse(params);
  return latheMasterPostAPIEngine.emit(payload as EmitActionPayload);
}

function handleMasterPostValidate(params: Record<string, unknown>) {
  const payload = ValidatePayloadSchema.parse(params);
  return latheMasterPostAPIEngine.validate(payload as ValidateActionPayload);
}

function handleMasterPostExplain(params: Record<string, unknown>) {
  const routeRequest = RoutePayloadSchema.parse(params.route_request);
  const routeDecision = params.route_decision as ExplainActionPayload["route_decision"];

  return latheMasterPostAPIEngine.explain({
    route_request: routeRequest as RouteActionPayload,
    route_decision: routeDecision
  });
}

function handleMasterPostCrossCheck(params: Record<string, unknown>) {
  const payload = CrossCheckPayloadSchema.parse(params);
  return latheMasterPostAPIEngine.crossCheck(payload as CrossCheckActionPayload);
}

function handleMasterPostAudit(params: Record<string, unknown>) {
  const payload = AuditPayloadSchema.parse(params);
  return latheMasterPostAPIEngine.audit(payload as AuditActionPayload);
}

function handleMasterPostRegression(params: Record<string, unknown>) {
  const payload = RegressionPayloadSchema.parse(params);
  return latheMasterPostRegressionMatrixEngine.runMatrix({
    machines: payload.machines,
    validators: payload.validators,
    tags: payload.tags
  });
}

// ============================================================================
// EXPORT ACTION DEFINITIONS
// ============================================================================

export const LATHE_MASTERPOST_DISPATCHER_ACTIONS = {
  masterpost_full: {
    description: "Complete master post flow: route + emit + validate + explain",
    schema: RoutePayloadSchema,
  },
  masterpost_route: {
    description: "Route job to appropriate sub-post",
    schema: RoutePayloadSchema,
  },
  masterpost_emit: {
    description: "Generate unified G-code output",
    schema: EmitPayloadSchema,
  },
  masterpost_validate: {
    description: "Validate G-code format",
    schema: ValidatePayloadSchema,
  },
  masterpost_explain: {
    description: "Get decision trace for routing",
    schema: z.object({
      route_request: RoutePayloadSchema,
      route_decision: z.object({
        machine_id: z.string(),
        machine_name: z.string(),
        controller_family: z.string(),
        controller_model: z.string(),
        selected_post: z.string(),
        route_method: z.enum(["direct_match", "controller_family", "fallback_generator"]),
        confidence: z.number(),
        reasoning: z.array(z.string()),
      }),
    }),
  },
  masterpost_cross_check: {
    description: "Run ensemble validation across posts",
    schema: CrossCheckPayloadSchema,
  },
  masterpost_audit: {
    description: "Run self-awareness audit",
    schema: AuditPayloadSchema,
  },
  masterpost_regression: {
    description: "Run regression test matrix",
    schema: RegressionPayloadSchema,
  },
};
