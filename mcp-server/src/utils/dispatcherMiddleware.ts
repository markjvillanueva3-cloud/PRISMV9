/**
 * Dispatcher Middleware Utilities
 * ===============================
 * Shared helpers for all 45 PRISM dispatchers.
 * Provides consistent response formatting and error handling.
 *
 * normalizeParams is NOT wrapped here — dispatchers use the proven inline pattern:
 *   try {
 *     const { normalizeParams } = await import("../../utils/paramNormalizer.js");
 *     params = normalizeParams(rawParams);
 *   } catch {}
 *
 * @version 1.0.0
 * @date 2026-02-27
 */

import { slimResponse } from "./responseSlimmer.js";

/**
 * Standard success response in MCP format.
 * Applies response slimming by default to reduce context pressure.
 */
export function dispatcherResult(data: any, slim: boolean = true): { content: { type: "text"; text: string }[] } {
  const payload = slim ? slimResponse(data) : data;
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

/**
 * Standard error response in MCP format.
 * Consistent shape: { error, action, dispatcher }
 */
export function dispatcherError(
  error: unknown,
  action: string,
  dispatcher: string
): { content: { type: "text"; text: string }[]; isError: true } {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        action,
        dispatcher,
      })
    }],
    isError: true,
  };
}
