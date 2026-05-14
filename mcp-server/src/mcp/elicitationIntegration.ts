/**
 * MCP Elicitation Integration Helpers for PRISM
 *
 * Provides high-level helpers for integrating elicitation into dispatcher
 * handlers. The main pattern is: before executing a physics calculation,
 * call ensureInput() — it checks which required fields are missing and
 * triggers interactive elicitation to fill them in.
 *
 * Usage pattern in a dispatcher handler:
 * ```ts
 * const params = await ensureInput(ctx, "sf_orchestrate", args);
 * // params now has material, tool, machine merged in from elicitation
 * const result = await speedFeedOrchestrator.run(params);
 * ```
 *
 * @see elicitation.ts for schema definitions and detectMissingInput()
 */

import { log } from "../utils/Logger.js";
import {
  detectMissingInput,
  requestElicitation,
  ELICITATION_SCHEMAS,
  type McpElicitationContext,
  type MissingInputReport,
  type ElicitationSchemaName,
} from "./elicitation.js";

// ============================================================================
// Types
// ============================================================================

/** Result from ensureInput — original params merged with elicited data */
export interface EnsuredInput {
  /** Merged parameters (original + elicited) */
  params: Record<string, unknown>;
  /** Which schemas were elicited (empty if all params were present) */
  elicited: string[];
  /** Which schemas the user declined (empty if all accepted or skipped) */
  declined: string[];
  /** Whether all required data is now available */
  complete: boolean;
}

/** Options for ensureInput behavior */
export interface EnsureInputOptions {
  /**
   * If true, stop requesting further schemas after the first decline.
   * Default: false (ask all missing schemas regardless of declines).
   */
  stopOnDecline?: boolean;

  /**
   * Maximum number of elicitation rounds. Prevents excessive prompting.
   * Default: 4
   */
  maxRounds?: number;

  /**
   * Specific schema names to skip even if they are detected as missing.
   * Useful when the caller has a fallback (e.g. default machine profile).
   */
  skip?: ElicitationSchemaName[];

  /**
   * If true, only report what is missing without actually triggering
   * elicitation. Useful for dry-run / analysis.
   * Default: false
   */
  dryRun?: boolean;
}

// ============================================================================
// Field Mapping
// ============================================================================

/**
 * Maps elicitation schema field names to the canonical parameter keys
 * expected by PRISM engines. Elicited data arrives with schema property
 * names (e.g. "material_group", "diameter_mm") which may differ from
 * the engine's expected input keys.
 */
const SCHEMA_FIELD_TO_PARAM: Record<string, Record<string, string>> = {
  MaterialSelection: {
    material_group: "material_group",
    grade: "material",
    hardness_hrc: "hardness_hrc",
    condition: "material_condition",
  },
  MachineSelection: {
    manufacturer: "machine_manufacturer",
    model: "machine",
    controller: "controller",
    max_rpm: "max_rpm",
    max_power_kw: "max_power_kw",
    axis_count: "axis_count",
  },
  OperationSelection: {
    operation_type: "operation",
    cut_type: "cut_type",
    depth_of_cut_min_mm: "ap_min",
    depth_of_cut_max_mm: "ap_max",
    width_of_cut_mm: "ae",
  },
  ToolSelection: {
    tool_type: "tool_type",
    diameter_mm: "tool_diameter",
    flute_count: "flute_count",
    coating: "coating",
    tool_material: "tool_material",
    helix_angle_deg: "helix_angle",
    stickout_mm: "stickout",
  },
  ToleranceSpec: {
    dimension_name: "dimension_name",
    nominal_mm: "nominal",
    upper_tolerance_mm: "upper_tol",
    lower_tolerance_mm: "lower_tol",
    surface_finish_ra_um: "ra_target",
    gdt_type: "gdt_type",
  },
  WorkpieceGeometry: {
    shape: "workpiece_shape",
    length_mm: "length",
    width_mm: "width",
    height_mm: "height",
    diameter_mm: "workpiece_diameter",
    material_removal_volume_cm3: "mrr_volume",
    thin_wall: "thin_wall",
  },
  CoolantPreference: {
    coolant_type: "coolant",
    pressure_bar: "coolant_pressure",
    concentration_pct: "coolant_concentration",
    through_spindle: "through_spindle",
  },
  ControllerTarget: {
    controller_family: "controller_family",
    controller_model: "controller_model",
    hsm_mode: "hsm_mode",
    program_format: "program_format",
    decimal_places: "decimal_places",
  },
};

/**
 * Map elicited field names from a schema into the canonical param keys
 * expected by PRISM engines.
 */
function mapElicitedFields(
  schemaName: string,
  elicitedData: Record<string, unknown>,
): Record<string, unknown> {
  const mapping = SCHEMA_FIELD_TO_PARAM[schemaName];
  if (!mapping) {
    return elicitedData;
  }

  const mapped: Record<string, unknown> = {};
  for (const [schemaKey, value] of Object.entries(elicitedData)) {
    const paramKey = mapping[schemaKey] ?? schemaKey;
    if (value !== undefined && value !== null && value !== "") {
      mapped[paramKey] = value;
    }
  }
  return mapped;
}

// ============================================================================
// Core Integration Functions
// ============================================================================

/**
 * Ensure all required input is available for a dispatcher action.
 *
 * 1. Analyzes provided params against the action's requirements
 * 2. For each missing schema, triggers an elicitation request
 * 3. Merges elicited data into the params object
 * 4. Returns the complete (or best-effort) parameter set
 *
 * @param ctx - MCP context with elicitInput capability
 * @param actionName - Dispatcher action (e.g. "sf_orchestrate")
 * @param providedParams - Parameters already supplied by the caller
 * @param options - Control elicitation behavior
 * @returns Merged params with elicited data
 */
export async function ensureInput(
  ctx: McpElicitationContext,
  actionName: string,
  providedParams: Record<string, unknown>,
  options: EnsureInputOptions = {},
): Promise<EnsuredInput> {
  const {
    stopOnDecline = false,
    maxRounds = 4,
    skip = [],
    dryRun = false,
  } = options;

  const missing = detectMissingInput(actionName, providedParams);

  // Filter out skipped schemas
  const skipSet = new Set(skip);
  const toElicit = missing.filter((m) => !skipSet.has(m.schemaName as ElicitationSchemaName));

  // Limit rounds
  const limited = toElicit.slice(0, maxRounds);

  if (limited.length === 0) {
    return {
      params: { ...providedParams },
      elicited: [],
      declined: [],
      complete: true,
    };
  }

  if (dryRun) {
    return {
      params: { ...providedParams },
      elicited: [],
      declined: [],
      complete: false,
    };
  }

  // Accumulate merged params
  const merged = { ...providedParams };
  const elicited: string[] = [];
  const declined: string[] = [];

  for (const report of limited) {
    const data = await requestElicitation(ctx, report.schemaName, report.reason);

    if (data) {
      // Map schema fields to engine param keys and merge
      const mapped = mapElicitedFields(report.schemaName, data);
      Object.assign(merged, mapped);
      elicited.push(report.schemaName);
    } else {
      declined.push(report.schemaName);
      if (stopOnDecline) {
        log.info(
          `[Elicitation] User declined ${report.schemaName} — stopping (stopOnDecline=true)`,
        );
        break;
      }
    }
  }

  // Re-check completeness after elicitation
  const stillMissing = detectMissingInput(actionName, merged);
  const complete = stillMissing.length === 0;

  return { params: merged, elicited, declined, complete };
}

/**
 * Quick check whether an action has all required params present.
 * Does NOT trigger elicitation — use for gating logic.
 *
 * @param actionName - Dispatcher action name
 * @param providedParams - Current params
 * @returns Array of missing schema reports (empty = all present)
 */
export function checkMissingInput(
  actionName: string,
  providedParams: Record<string, unknown>,
): MissingInputReport[] {
  return detectMissingInput(actionName, providedParams);
}

/**
 * Build a human-readable summary of what is missing for a given action.
 * Useful for error messages when elicitation is not available.
 *
 * @param actionName - Dispatcher action name
 * @param providedParams - Current params
 * @returns Formatted string describing missing inputs, or null if complete
 */
export function describeMissingInput(
  actionName: string,
  providedParams: Record<string, unknown>,
): string | null {
  const missing = detectMissingInput(actionName, providedParams);
  if (missing.length === 0) return null;

  const lines = missing.map(
    (m) =>
      `- ${m.schemaName}: ${m.reason} (fields: ${m.missingFields.join(", ")})`,
  );

  return (
    `Action '${actionName}' is missing required input:\n` +
    lines.join("\n") +
    "\n\nPlease provide the missing parameters or enable MCP elicitation."
  );
}

// ============================================================================
// Integration Example (documented pattern for dispatcher authors)
// ============================================================================

/**
 * Example: How calcDispatcher's sf_orchestrate action would use elicitation.
 *
 * ```ts
 * // In calcDispatcher handler for "sf_orchestrate":
 * import { ensureInput } from "../mcp/elicitationIntegration.js";
 *
 * async function handleSpeedFeed(args: Record<string, unknown>, mcpContext: McpElicitationContext) {
 *   // Step 1: Ensure we have material + tool (will prompt user if missing)
 *   const { params, complete, declined } = await ensureInput(
 *     mcpContext,
 *     "sf_orchestrate",
 *     args,
 *     { skip: ["CoolantPreference"] }  // coolant has good defaults
 *   );
 *
 *   if (!complete && declined.length > 0) {
 *     return {
 *       content: [{
 *         type: "text",
 *         text: `Speed/feed calculation requires: ${declined.join(", ")}. ` +
 *               `Please provide these parameters to proceed.`
 *       }]
 *     };
 *   }
 *
 *   // Step 2: Now run the engine with complete params
 *   const result = await speedFeedOrchestrator.orchestrate({
 *     material: params.material as string,
 *     tool_diameter: params.tool_diameter as number,
 *     operation: params.operation as string,
 *     machine: params.machine as string,
 *     ...params,
 *   });
 *
 *   return { content: [{ type: "text", text: JSON.stringify(result) }] };
 * }
 * ```
 */

/**
 * Wrap a dispatcher handler with automatic elicitation for missing params.
 *
 * This is a higher-order function that wraps an existing handler, adding
 * elicitation checks before the handler executes. If the user declines
 * required inputs, returns an error message instead of calling the handler.
 *
 * @param actionName - Action name for requirement lookup
 * @param handler - Original handler function
 * @param options - Elicitation behavior options
 * @returns Wrapped handler with elicitation pre-check
 */
export function withElicitation(
  actionName: string,
  handler: (
    params: Record<string, unknown>,
  ) => Promise<{ content: Array<{ type: string; text: string }> }>,
  options: EnsureInputOptions = {},
): (
  params: Record<string, unknown>,
  ctx: McpElicitationContext,
) => Promise<{ content: Array<{ type: string; text: string }> }> {
  return async (
    params: Record<string, unknown>,
    ctx: McpElicitationContext,
  ) => {
    const { params: enriched, complete, declined } = await ensureInput(
      ctx,
      actionName,
      params,
      options,
    );

    if (!complete && declined.length > 0) {
      const desc = describeMissingInput(actionName, enriched);
      return {
        content: [
          {
            type: "text",
            text: desc ?? `Missing required input for '${actionName}'.`,
          },
        ],
      };
    }

    return handler(enriched);
  };
}
