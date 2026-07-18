/**
 * JSONSchemaValidatorEngine — HCAP05 lightweight JSON Schema validator.
 *
 * Pure-core: caller supplies a subset-JSON-Schema spec (type/required/min/
 * max/pattern/enum) plus a payload; engine returns valid/invalid + errors[].
 * Subset chosen for predictability + zero-runtime-deps; for full Draft-07,
 * pair with `ajv` plugin (HCAP01 PluginRegistry).
 *
 * @module engines/JSONSchemaValidatorEngine
 */

import { z } from "zod";

export const JSONTypeSchema = z.enum(["object", "array", "string", "number", "boolean", "null"]);
export type JSONType = z.infer<typeof JSONTypeSchema>;

export const SchemaSpecSchema: z.ZodType<SchemaSpec> = z.lazy(() => z.object({
  type: JSONTypeSchema.optional(),
  required: z.array(z.string()).optional(),
  properties: z.record(z.string(), z.lazy(() => SchemaSpecSchema)).optional(),
  items: z.lazy(() => SchemaSpecSchema).optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  pattern: z.string().optional(),
  enum: z.array(z.unknown()).optional(),
}));
export interface SchemaSpec {
  type?: JSONType;
  required?: string[];
  properties?: Record<string, SchemaSpec>;
  items?: SchemaSpec;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  enum?: unknown[];
}

export interface ValidationError {
  path: string;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

function typeOfPayload(p: unknown): JSONType | "unknown" {
  if (p === null) return "null";
  if (Array.isArray(p)) return "array";
  switch (typeof p) {
    case "string": return "string";
    case "number": return "number";
    case "boolean": return "boolean";
    case "object": return "object";
    default: return "unknown";
  }
}

function validateAt(spec: SchemaSpec, payload: unknown, path: string, errors: ValidationError[]): void {
  if (spec.type !== undefined) {
    const t = typeOfPayload(payload);
    if (t !== spec.type) {
      errors.push({ path, reason: `expected type ${spec.type}, got ${t}` });
      return;
    }
  }
  if (spec.enum !== undefined) {
    if (!spec.enum.some((v) => v === payload)) {
      errors.push({ path, reason: `value ${JSON.stringify(payload)} not in enum` });
    }
  }
  if (typeof payload === "string") {
    if (spec.minLength !== undefined && payload.length < spec.minLength) {
      errors.push({ path, reason: `length ${payload.length} < minLength ${spec.minLength}` });
    }
    if (spec.maxLength !== undefined && payload.length > spec.maxLength) {
      errors.push({ path, reason: `length ${payload.length} > maxLength ${spec.maxLength}` });
    }
    if (spec.pattern !== undefined) {
      try {
        if (!new RegExp(spec.pattern).test(payload)) {
          errors.push({ path, reason: `does not match pattern ${spec.pattern}` });
        }
      } catch (e) {
        errors.push({ path, reason: `invalid pattern regex: ${e instanceof Error ? e.message : "?"}` });
      }
    }
  }
  if (typeof payload === "number") {
    if (spec.minimum !== undefined && payload < spec.minimum) {
      errors.push({ path, reason: `${payload} < minimum ${spec.minimum}` });
    }
    if (spec.maximum !== undefined && payload > spec.maximum) {
      errors.push({ path, reason: `${payload} > maximum ${spec.maximum}` });
    }
  }
  if (Array.isArray(payload) && spec.items) {
    payload.forEach((item, i) => validateAt(spec.items as SchemaSpec, item, `${path}[${i}]`, errors));
  }
  if (payload !== null && typeof payload === "object" && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    if (spec.required) {
      for (const req of spec.required) {
        if (!(req in obj)) errors.push({ path: `${path}.${req}`, reason: "required property missing" });
      }
    }
    if (spec.properties) {
      for (const [prop, subSpec] of Object.entries(spec.properties)) {
        if (prop in obj) validateAt(subSpec, obj[prop], `${path}.${prop}`, errors);
      }
    }
  }
}

export class JSONSchemaValidatorEngine {
  static validate(spec: SchemaSpec, payload: unknown): ValidationResult {
    SchemaSpecSchema.parse(spec);
    const errors: ValidationError[] = [];
    validateAt(spec, payload, "$", errors);
    return { valid: errors.length === 0, errors };
  }

  static renderResult(r: ValidationResult): string {
    if (r.valid) return "[SCHEMA OK] no errors";
    return [
      `[SCHEMA INVALID] ${r.errors.length} error(s)`,
      ...r.errors.map((e) => `  ${e.path}: ${e.reason}`),
    ].join("\n");
  }
}

export const jsonSchemaValidatorEngine = JSONSchemaValidatorEngine;
