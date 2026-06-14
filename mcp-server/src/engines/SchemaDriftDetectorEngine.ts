/**
 * SchemaDriftDetectorEngine — HMPI04 detect drift between two MCP tool schemas.
 *
 * Pure-core differ over named-parameter MCP-tool-schemas (subset Zod-ish:
 * type+required+default).  Reports added params, removed params, type
 * changes, required-flag changes — categorized by breaking-change risk.
 *
 * @module engines/SchemaDriftDetectorEngine
 */

import { z } from "zod";

export const SchemaParamSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(40),
  required: z.boolean().default(false),
  default_value: z.unknown().optional(),
});
export type SchemaParam = z.infer<typeof SchemaParamSchema>;

export const ToolSchemaSchema = z.object({
  tool_id: z.string().min(1).max(120),
  params: z.array(SchemaParamSchema).max(200),
});
export type ToolSchema = z.infer<typeof ToolSchemaSchema>;

export interface DriftChange {
  param: string;
  kind: "added" | "removed" | "type-changed" | "required-flag-changed";
  breaking: boolean;
  detail: string;
}

export interface DriftReport {
  tool_id: string;
  changes: DriftChange[];
  breaking_count: number;
  non_breaking_count: number;
  net_param_delta: number;
}

export class SchemaDriftDetectorEngine {
  static validate(s: unknown): ToolSchema { return ToolSchemaSchema.parse(s); }

  /** Compute drift from baseline (a) to current (b). */
  static diff(a: ToolSchema, b: ToolSchema): DriftReport {
    ToolSchemaSchema.parse(a);
    ToolSchemaSchema.parse(b);
    if (a.tool_id !== b.tool_id) {
      throw new Error(`SchemaDrift.diff: tool_id mismatch ${a.tool_id} vs ${b.tool_id}`);
    }
    const aMap = new Map(a.params.map((p) => [p.name, p]));
    const bMap = new Map(b.params.map((p) => [p.name, p]));
    const changes: DriftChange[] = [];

    for (const [name, bp] of bMap) {
      if (!aMap.has(name)) {
        // Added: breaking iff required+no default.
        const breaking = bp.required && bp.default_value === undefined;
        changes.push({
          param: name, kind: "added", breaking,
          detail: `added ${bp.type}${bp.required ? " required" : ""}`,
        });
      } else {
        const ap = aMap.get(name)!;
        if (ap.type !== bp.type) {
          changes.push({ param: name, kind: "type-changed", breaking: true,
            detail: `${ap.type} → ${bp.type}` });
        }
        if (ap.required !== bp.required) {
          // Becoming required is breaking; becoming optional is not.
          changes.push({ param: name, kind: "required-flag-changed", breaking: !ap.required && bp.required,
            detail: `required ${ap.required} → ${bp.required}` });
        }
      }
    }
    for (const name of aMap.keys()) {
      if (!bMap.has(name)) {
        const ap = aMap.get(name)!;
        // Removed: breaking iff was required (callers may pass it).
        changes.push({ param: name, kind: "removed", breaking: ap.required,
          detail: `removed ${ap.type}` });
      }
    }

    changes.sort((x, y) => x.param.localeCompare(y.param));
    return {
      tool_id: a.tool_id,
      changes,
      breaking_count: changes.filter((c) => c.breaking).length,
      non_breaking_count: changes.filter((c) => !c.breaking).length,
      net_param_delta: b.params.length - a.params.length,
    };
  }

  static renderReport(r: DriftReport): string {
    const tag = r.breaking_count > 0 ? "BREAKING" : (r.changes.length > 0 ? "DRIFT" : "STABLE");
    return [
      `[SCHEMA-DRIFT ${tag}] ${r.tool_id} Δparams=${r.net_param_delta} breaking=${r.breaking_count} non-breaking=${r.non_breaking_count}`,
      ...r.changes.map((c) => `  ${c.param} [${c.kind}${c.breaking ? "/BREAKING" : ""}]: ${c.detail}`),
    ].join("\n");
  }
}

export const schemaDriftDetectorEngine = SchemaDriftDetectorEngine;
