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

/**
 * Validate action parameters against a schema map.
 * Returns validation result or null if no schema exists for the action.
 */
export function validateActionParams(
  action: string,
  params: Record<string, unknown>,
  schemas: Record<string, z.ZodTypeAny>,
): { success: true; data: unknown } | { success: false; error: z.ZodError } | null {
  const schema = schemas[action];
  if (!schema) {
    return null;
  }
  const result = schema.safeParse(params);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
