/**
 * PRISM MCP Server — Action Parameter Validation
 * ================================================
 * Validates dispatcher action params against per-action Zod schemas.
 * Runs AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * Features:
 *   - Type coercion: "2.5" → 2.5, "true" → true
 *   - Structured error responses (not throws)
 *   - Three strictness levels: STRICT, COERCE, LOOSE
 *   - Gradual rollout: actions without schemas pass through
 *
 * @module validation/actionParamValidator
 * @version 1.0.0 — SYS-MS6
 */

import { z, type ZodType, type ZodIssue } from "zod";
import { log } from "../utils/Logger.js";

/** Schema registry: action name → Zod schema */
export type ActionSchemaRegistry = Record<string, ZodType>;

/** Strictness level for validation */
export type ValidationStrictness = "strict" | "coerce" | "loose";

/** Validation result returned to dispatcher */
export interface ValidationResult {
  valid: boolean;
  /** Params with coerced types (if coercion was applied) */
  params: Record<string, any>;
  /** Error payload for MCP response (only if valid=false) */
  error?: {
    error: "validation_error";
    action: string;
    message: string;
    missing: string[];
    invalid: Array<{ field: string; expected: string; got: string; value: any }>;
    hint: string;
    _validation_failed: true;
  };
}

/**
 * Validate action params against the schema registry.
 *
 * @param action - The dispatcher action name
 * @param params - Normalized params (after normalizeParams)
 * @param schemas - The ACTION_SCHEMAS registry for this dispatcher
 * @param strictness - Validation strictness level (default: "coerce")
 * @returns ValidationResult with valid flag, coerced params, or structured error
 */
export function validateActionParams(
  action: string,
  params: Record<string, any>,
  schemas: ActionSchemaRegistry,
  strictness: ValidationStrictness = "coerce"
): ValidationResult {
  const schema = schemas[action];

  // No schema for this action → pass through (gradual rollout)
  if (!schema) {
    return { valid: true, params };
  }

  // Apply type coercion before validation (LLMs send "2.5" not 2.5)
  const coerced = strictness !== "loose" ? coerceTypes(params, schema) : params;

  const result = schema.safeParse(coerced);

  if (result.success) {
    // Merge validated data back with original params (preserves extra fields)
    return { valid: true, params: { ...params, ...(result.data as Record<string, unknown>) } };
  }

  // Parse Zod errors into structured response
  const missing: string[] = [];
  const invalid: Array<{ field: string; expected: string; got: string; value: any }> = [];

  for (const issue of result.error.issues) {
    const field = issue.path.join(".");
    const issueRec = issue as unknown as Record<string, unknown>;
    const received = issueRec.received ?? issueRec.input;
    if (issue.code === "invalid_type" && received === "undefined") {
      missing.push(field);
    } else {
      invalid.push({
        field,
        expected: issue.code === "invalid_type" ? (issueRec.expected as string) ?? issue.message : issue.message,
        got: issue.code === "invalid_type" ? String(received) : typeof coerced[field],
        value: coerced[field],
      });
    }
  }

  // Build hint from schema shape
  const hint = buildHint(schema);

  const errorPayload = {
    error: "validation_error" as const,
    action,
    message: formatErrorMessage(missing, invalid),
    missing,
    invalid,
    hint,
    _validation_failed: true as const,
  };

  log.warn(`[param-validation] ${action}: ${errorPayload.message}`);

  return { valid: false, params, error: errorPayload };
}

/**
 * Attempt to coerce string values to their expected types.
 * LLMs frequently send "2.5" instead of 2.5, "true" instead of true.
 */
function coerceTypes(params: Record<string, any>, schema: ZodType): Record<string, any> {
  const result = { ...params };

  // Extract shape from ZodObject schemas
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, ZodType>;
    for (const [key, fieldSchema] of Object.entries(shape)) {
      if (key in result && typeof result[key] === "string") {
        result[key] = coerceValue(result[key], fieldSchema);
      }
    }
  }

  return result;
}

/**
 * Coerce a single string value based on the target Zod type.
 */
function coerceValue(value: string, schema: ZodType): any {
  // Unwrap optional/nullable/default wrappers
  const inner = unwrapSchema(schema);

  if (inner instanceof z.ZodNumber) {
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== "") return num;
  }

  if (inner instanceof z.ZodBoolean) {
    if (value === "true") return true;
    if (value === "false") return false;
  }

  return value; // Can't coerce — return original
}

/**
 * Unwrap ZodOptional, ZodNullable, ZodDefault to get the inner type.
 */
function unwrapSchema(schema: ZodType): ZodType {
  const s = schema as ZodType & { _zod?: { def?: { type?: string } }; unwrap?: () => ZodType; removeDefault?: () => ZodType };
  const zNs = z as unknown as Record<string, new (...args: unknown[]) => ZodType>;
  if (s._zod?.def?.type === "optional" || (zNs.ZodOptional && s instanceof zNs.ZodOptional)) return unwrapSchema(s.unwrap!());
  if (s._zod?.def?.type === "nullable" || (zNs.ZodNullable && s instanceof zNs.ZodNullable)) return unwrapSchema(s.unwrap!());
  if (s._zod?.def?.type === "default" || (zNs.ZodDefault && s instanceof zNs.ZodDefault)) return unwrapSchema(s.removeDefault!());
  return schema;
}

/**
 * Build a human-readable hint from the schema shape.
 */
function buildHint(schema: ZodType): string {
  if (!(schema instanceof z.ZodObject)) return "";

  const shape = schema.shape as Record<string, ZodType>;
  const parts: string[] = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const inner = unwrapSchema(fieldSchema);
    const typeName = inner instanceof z.ZodNumber ? "number"
      : inner instanceof z.ZodString ? "string"
      : inner instanceof z.ZodBoolean ? "boolean"
      : inner instanceof z.ZodArray ? "array"
      : inner instanceof z.ZodEnum ? `enum(${(inner as unknown as { _def: { values: string[] } })._def.values.join("|")})`
      : "any";

    const isOptional = fieldSchema instanceof z.ZodOptional
      || fieldSchema instanceof z.ZodDefault;
    const marker = isOptional ? "?" : "";

    parts.push(`${key}${marker}: ${typeName}`);
  }

  return parts.join(", ");
}

/**
 * Format a readable error message from missing/invalid lists.
 */
function formatErrorMessage(
  missing: string[],
  invalid: Array<{ field: string; expected: string; got: string }>
): string {
  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`Missing required: ${missing.join(", ")}`);
  }
  if (invalid.length > 0) {
    const details = invalid.map(i => `${i.field} (expected ${i.expected}, got ${i.got})`);
    parts.push(`Invalid: ${details.join(", ")}`);
  }
  return parts.join(". ");
}

// ── Convenience schema builders for manufacturing params ──

/** Positive number (> 0) — for physical quantities that must be positive */
export const posNum = () => z.number().positive();

/** Non-negative number (>= 0) */
export const nnNum = () => z.number().min(0);

/** Positive number with upper bound — for physically bounded params */
export const boundedNum = (max: number) => z.number().positive().max(max);

/** Optional positive number */
export const optPosNum = () => z.number().positive().optional();

/** Optional non-negative number */
export const optNnNum = () => z.number().min(0).optional();

/** Optional string */
export const optStr = () => z.string().optional();

/** Optional bounded number */
export const optBoundedNum = (max: number) => z.number().positive().max(max).optional();

/** Material ID or name — always optional since registries can resolve */
export const materialRef = () => z.string().min(1).optional();

// ── Physical bound constants (from safetyCalcSchema.ts) ──

/** B O U N D S constant.
 */
export const BOUNDS = {
  CUTTING_SPEED: 2000,     // m/min — fastest aluminum HSM
  FEED_PER_TOOTH: 10,      // mm — covers roughing inserts
  AXIAL_DEPTH: 100,        // mm — covers deep slotting
  RADIAL_DEPTH: 500,       // mm — max tool diameter
  TOOL_DIAMETER: 500,      // mm — max face mill
  SPINDLE_SPEED: 100000,   // rpm — micro-tools at high speed
  FORCE: 100000,           // N — heavy roughing
  POWER: 500,              // kW — largest machines
  TORQUE: 50000,           // Nm — heavy turning
  TEMPERATURE: 2000,       // °C — above melting point of most metals
  TOOL_LIFE: 10000,        // min — ~167 hours
  SURFACE_FINISH: 100,     // μm Ra — very rough
} as const;
