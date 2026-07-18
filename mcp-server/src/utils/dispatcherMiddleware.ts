/**
 * Dispatcher Middleware Utility
 * Common validation and error handling for MCP dispatchers.
 * @module utils/dispatcherMiddleware
 */

import { z } from "zod";

export interface DispatcherErrorResult {
  success: false;
  error: string;
  action: string;
  dispatcher: string;
  details?: unknown;
  /**
   * MCP-protocol content payload. Always populated by dispatcherError() so the
   * return type satisfies server.tool()'s expected `{ content: [...] }` shape.
   * The serialized JSON of the same record body lives at content[0].text — round-trip
   * helpers should parse that when the raw {success,error,...} fields aren't accessible.
   */
  content: { type: "text"; text: string }[];
  /** MCP index signature — required by server.tool()'s callback return contract. */
  [key: string]: unknown;
}

/**
 * Create a standardized dispatcher error response.
 * Returns a DispatcherErrorResult that ALSO satisfies the MCP `{ content: [...] }`
 * shape required by server.tool(), so it can be returned directly from a handler
 * catch-branch without further wrapping.
 */
export function dispatcherError(
  error: unknown,
  action: string,
  dispatcher: string,
): DispatcherErrorResult {
  const message = error instanceof Error ? error.message : String(error);
  const body = {
    success: false as const,
    error: message,
    action,
    dispatcher,
    details: error instanceof Error ? { stack: error.stack } : undefined,
  };
  return {
    ...body,
    content: [{ type: "text" as const, text: JSON.stringify(body) }],
  };
}

/** Validation result with compatibility properties */
export interface ValidationResult {
  /** True if validation passed (compat: alias for success) */
  valid: boolean;
  /** True if validation passed */
  success: boolean;
  /** Validated data if successful */
  data?: unknown;
  /** Zod error if failed */
  error?: z.ZodError;
  /**
   * Compat alias for Zod issues. Many dispatchers reach for `validation.errors`
   * (plural) expecting the issue array directly — this property is populated
   * with `error.issues` whenever validation fails so those callsites type-check
   * without rewriting them all. Prefer `error.issues` in new code.
   */
  errors?: z.ZodError["issues"];
  /** Error message string (compat) */
  errorMessage?: string;
  /**
   * True when NO schema was registered for the action, so params passed through
   * UNVALIDATED. Previously this case was indistinguishable from a real validation
   * pass (both returned `valid:true`), hiding the gap where unvalidated input
   * (incl. safety-relevant calc/cam params) reaches engines. Callers that want to
   * fail-closed on un-schema'd safety-critical actions can branch on this flag.
   * Additive + optional -- existing callers reading valid/success/data are unaffected.
   */
  schemaMissing?: boolean;
}

// Runtime schema-coverage observability (non-blocking). The no-schema pass-through
// was silent; these counters make it MEASURABLE without log-spam or behavior change.
const _schemaMissActions = new Set<string>();
const _schemaCoverage = { validated: 0, passthrough: 0 };

/**
 * Runtime schema-coverage signal: validated vs unvalidated-passthrough call counts
 * plus the distinct actions that hit the no-schema path. Lets the fleet SEE the
 * silent-validation gap (DISPATCHER-CAPABILITY-ASSESSMENT-2026-06-22 P1) at runtime.
 */
export function getSchemaCoverageStats(): {
  validated: number;
  passthrough: number;
  missingActions: string[];
} {
  return {
    validated: _schemaCoverage.validated,
    passthrough: _schemaCoverage.passthrough,
    missingActions: [..._schemaMissActions].sort(),
  };
}

/** Test/diagnostic reset of the schema-coverage counters. */
export function resetSchemaCoverageStats(): void {
  _schemaMissActions.clear();
  _schemaCoverage.validated = 0;
  _schemaCoverage.passthrough = 0;
}

/**
 * Validate action parameters against a schema map.
 * Returns validation result or a pass-through if no schema exists for the action.
 */
export function validateActionParams(
  action: string,
  params: Record<string, unknown>,
  schemas: Record<string, z.ZodTypeAny>,
): ValidationResult {
  const schema = schemas[action];
  if (!schema) {
    // No schema registered -> pass through, but FLAG it (fail-loud observability,
    // NON-blocking). We do NOT throw: ~40% of actions have no schema yet and
    // throwing would mass-break them. Instead we surface the gap so it is
    // measurable (getSchemaCoverageStats) instead of silent.
    _schemaCoverage.passthrough++;
    if (!_schemaMissActions.has(action)) {
      _schemaMissActions.add(action);
      if (process.env.PRISM_DISPATCHER_SCHEMA_WARN === "1") {
        // Once-per-action (deduped) -- never per-call log spam.
        console.warn(`[dispatcher-schema] action "${action}" has no schema -- params passed UNVALIDATED`);
      }
    }
    return { valid: true, success: true, data: params, schemaMissing: true };
  }
  const result = schema.safeParse(params);
  if (result.success) {
    _schemaCoverage.validated++;
    return { valid: true, success: true, data: result.data };
  }
  const errorMessage = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
  return {
    valid: false,
    success: false,
    error: result.error,
    errors: result.error.issues,
    errorMessage,
  };
}

/**
 * Standardized success result returned by dispatcher handlers.
 * Carries both the legacy {success,data} fields AND the MCP `content` payload,
 * plus an index signature so the shape satisfies server.tool()'s callback type.
 */
export interface DispatcherSuccessResult<T = unknown> {
  success: true;
  data: T;
  content: { type: "text"; text: string }[];
  [key: string]: unknown;
}

// Backward-compat alias (esbuild fix 2026-04-25).
// Returns the MCP `{ content: [...] }` shape in addition to the legacy
// `{ success, data }` fields so callers can return it directly from server.tool().
export function dispatcherResult<T>(result: T): DispatcherSuccessResult<T> {
  const body = { success: true as const, data: result };
  return {
    ...body,
    content: [{ type: "text" as const, text: JSON.stringify(body) }],
  };
}

