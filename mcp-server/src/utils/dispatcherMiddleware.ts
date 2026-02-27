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

// ============================================================================
// INPUT VALIDATION
// ============================================================================

/** Limits for incoming dispatcher params — prevents DoS via oversized payloads */
export interface InputLimits {
  maxSerializedBytes?: number;  // default 512KB
  maxDepth?: number;            // default 10
  maxKeys?: number;             // default 200
  maxArrayLength?: number;      // default 1000
}

const DEFAULT_LIMITS: Required<InputLimits> = {
  maxSerializedBytes: 512 * 1024,
  maxDepth: 10,
  maxKeys: 200,
  maxArrayLength: 1000,
};

function measureDepth(obj: unknown, current: number, max: number): number {
  if (current > max) return current; // early exit
  if (typeof obj !== "object" || obj === null) return current;
  let deepest = current;
  for (const v of Object.values(obj)) {
    deepest = Math.max(deepest, measureDepth(v, current + 1, max));
    if (deepest > max) return deepest;
  }
  return deepest;
}

function countKeys(obj: unknown, max: number): number {
  if (typeof obj !== "object" || obj === null) return 0;
  let count = Object.keys(obj).length;
  if (count > max) return count;
  for (const v of Object.values(obj)) {
    count += countKeys(v, max - count);
    if (count > max) return count;
  }
  return count;
}

function checkArrayLengths(obj: unknown, max: number): string | null {
  if (Array.isArray(obj)) {
    if (obj.length > max) return `Array length ${obj.length} exceeds limit ${max}`;
    for (const item of obj) {
      const err = checkArrayLengths(item, max);
      if (err) return err;
    }
  } else if (typeof obj === "object" && obj !== null) {
    for (const v of Object.values(obj)) {
      const err = checkArrayLengths(v, max);
      if (err) return err;
    }
  }
  return null;
}

/**
 * Validate incoming params for size, depth, and key count limits.
 * Returns null if valid, or an error string if limits exceeded.
 */
export function validateInputParams(
  params: Record<string, unknown>,
  limits?: InputLimits
): string | null {
  const lim = { ...DEFAULT_LIMITS, ...limits };

  // 1. Serialized size check
  const serialized = JSON.stringify(params);
  if (serialized.length > lim.maxSerializedBytes) {
    return `Input size ${(serialized.length / 1024).toFixed(0)}KB exceeds limit ${(lim.maxSerializedBytes / 1024).toFixed(0)}KB`;
  }

  // 2. Object nesting depth
  const depth = measureDepth(params, 0, lim.maxDepth + 1);
  if (depth > lim.maxDepth) {
    return `Object nesting depth ${depth} exceeds limit ${lim.maxDepth}`;
  }

  // 3. Total key count
  const keys = countKeys(params, lim.maxKeys + 1);
  if (keys > lim.maxKeys) {
    return `Total key count ${keys} exceeds limit ${lim.maxKeys}`;
  }

  // 4. Array length check
  const arrErr = checkArrayLengths(params, lim.maxArrayLength);
  if (arrErr) return arrErr;

  return null;
}

// ============================================================================
// RESPONSE FORMATTING
// ============================================================================

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
