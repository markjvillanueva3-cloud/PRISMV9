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
}

/**
 * Create a standardized dispatcher error response.
 */
export function dispatcherError(
  error: unknown,
  action: string,
  dispatcher: string,
): DispatcherErrorResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    error: message,
    action,
    dispatcher,
    details: error instanceof Error ? { stack: error.stack } : undefined,
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
  /** Error message string (compat) */
  errorMessage?: string;
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
    // No schema = pass through (valid)
    return { valid: true, success: true, data: params };
  }
  const result = schema.safeParse(params);
  if (result.success) {
    return { valid: true, success: true, data: result.data };
  }
  const errorMessage = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ");
  return { valid: false, success: false, error: result.error, errorMessage };
}
