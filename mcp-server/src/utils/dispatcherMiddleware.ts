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
 *   } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
 *
 * @version 1.1.0
 * @date 2026-02-28
 */

import { z } from "zod";
import { log } from "./Logger.js";
import { slimResponse } from "./responseSlimmer.js";
import type { ActionSchemaMap, ValidationResult } from "../schemas/actionSchemaTypes.js";

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
  * @param params - configuration options
  * @param limits - limits
  * @returns string | null
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
// ACTION PARAM SCHEMA VALIDATION
// ============================================================================

/**
 * Validate action params against the schema registry.
 * Call AFTER normalizeParams(), BEFORE engine dispatch.
 * Actions without a registered schema pass through (graceful rollout).
  * @param action - action string
  * @param params - configuration options
  * @param schemas - schemas
  * @returns validation result
 */
export function validateActionParams(
  action: string,
  params: Record<string, unknown>,
  schemas: ActionSchemaMap
): ValidationResult {
  const schema = schemas[action];
  if (!schema) return { valid: true };

  // SYS-MS6-U03: Coerce string values to expected types before validation
  // LLMs frequently send "2.5" instead of 2.5, "true" instead of true
  const coerced = coerceParamTypes(params, schema);

  const result = schema.safeParse(coerced);
  if (result.success) return { valid: true };

  const issues = result.error.issues;
  const errorMessage = issues
    .map(i => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");

  return { valid: false, errors: issues, errorMessage };
}

/** Coerce string param values to expected types based on Zod schema shape. */
function coerceParamTypes(params: Record<string, unknown>, schema: z.ZodType): Record<string, unknown> {
  if (!(schema instanceof z.ZodObject)) return params;
  const shape = schema.shape as Record<string, z.ZodType>;
  const result = { ...params };
  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (key in result && typeof result[key] === "string") {
      result[key] = coerceValue(result[key] as string, fieldSchema);
    }
  }
  return result;
}

/** Coerce a single string to the target Zod type. */
function coerceValue(value: string, schema: z.ZodType): unknown {
  const inner = unwrapZod(schema);
  if (inner instanceof z.ZodNumber) {
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== "") return num;
  }
  if (inner instanceof z.ZodBoolean) {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return value;
}

/** Unwrap ZodOptional/ZodNullable/ZodDefault to get inner type. */
function unwrapZod(schema: z.ZodType): z.ZodType {
  const s = schema as any;
  if (s._zod?.def?.type === "optional" || s instanceof (z as any).ZodOptional) return unwrapZod(s.unwrap());
  if (s._zod?.def?.type === "nullable" || s instanceof (z as any).ZodNullable) return unwrapZod(s.unwrap());
  if (s._zod?.def?.type === "default" || s instanceof (z as any).ZodDefault) return unwrapZod(s.removeDefault());
  return schema;
}

// ============================================================================
// RESPONSE FORMATTING
// ============================================================================

/**
 * Standard success response in MCP format.
 * Applies response slimming by default to reduce context pressure.
  * @param data - input data
  * @param slim - whether slim
  * @returns { content: { type: "text"; text: string }[] }
 */
export function dispatcherResult(data: any, slim: boolean = true): { content: { type: "text"; text: string }[] } {
  const payload = slim ? slimResponse(data) : data;
  return { content: [{ type: "text" as const, text: JSON.stringify(payload) }] };
}

/**
 * Standard error response in MCP format.
 * Consistent shape: { error, action, dispatcher }
  * @param error - error
  * @param action - action string
  * @param dispatcher - dispatcher string
  * @returns { content: { type: "text"; text: string }[]; is error: true }
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
