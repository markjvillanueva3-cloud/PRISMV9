/**
 * SchemaCompactEngine — Compacts JSON schemas for token efficiency
 *
 * When schemas are included in prompts or tool descriptions, this
 * engine reduces their token footprint by removing optional descriptions,
 * collapsing simple types, and using shorthand notation.
 *
 * Token savings: 30-70% reduction on schema representation in context.
 *
 * @version 1.0.0
 */

export interface CompactResult {
  original: string;
  compact: string;
  originalTokens: number;
  compactTokens: number;
  savings: number;
  savingsPercent: number;
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export class SchemaCompactEngine {

  /**
   * Compact a JSON schema object.
   */
  compact(schema: Record<string, unknown>): Record<string, unknown> {
    return this.compactNode(schema) as Record<string, unknown>;
  }

  /**
   * Compact and return as string with savings info.
   */
  compactWithStats(schema: Record<string, unknown>): CompactResult {
    const original = JSON.stringify(schema, null, 2);
    const compacted = this.compact(schema);
    const compact = JSON.stringify(compacted);

    const originalTokens = Math.ceil(original.length / 4);
    const compactTokens = Math.ceil(compact.length / 4);

    return {
      original,
      compact,
      originalTokens,
      compactTokens,
      savings: originalTokens - compactTokens,
      savingsPercent: originalTokens > 0
        ? Math.round(((originalTokens - compactTokens) / originalTokens) * 100)
        : 0,
    };
  }

  /**
   * Generate a minimal type signature from a schema (TypeScript-like).
   */
  toTypeSignature(schema: Record<string, unknown>): string {
    return this.nodeToType(schema);
  }

  /**
   * Compact an array of schemas (e.g., action parameter schemas).
   */
  compactAll(schemas: Array<{ name: string; schema: Record<string, unknown> }>): Array<{ name: string; compact: string }> {
    return schemas.map(s => ({
      name: s.name,
      compact: JSON.stringify(this.compact(s.schema)),
    }));
  }

  /**
   * One-liner savings estimate.
   */
  oneLiner(schema: Record<string, unknown>): string {
    const r = this.compactWithStats(schema);
    return `${r.originalTokens}→${r.compactTokens} tokens (${r.savingsPercent}% saved)`;
  }

  private compactNode(node: unknown): unknown {
    if (node === null || node === undefined) return node;
    if (typeof node !== "object") return node;
    if (Array.isArray(node)) return node.map(n => this.compactNode(n));

    const obj = node as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip verbose metadata
      if (key === "description" || key === "$comment" || key === "examples" ||
          key === "$id" || key === "$schema" || key === "title" ||
          key === "default" || key === "deprecated") {
        continue;
      }

      // Compact nested objects
      if (key === "properties" && typeof value === "object" && value !== null) {
        const props: Record<string, unknown> = {};
        for (const [propName, propValue] of Object.entries(value as Record<string, unknown>)) {
          props[propName] = this.compactNode(propValue);
        }
        result[key] = props;
      } else if (key === "items" && typeof value === "object") {
        result[key] = this.compactNode(value);
      } else if (key === "additionalProperties" && value === false) {
        // Skip — it's the default assumption
        continue;
      } else {
        result[key] = this.compactNode(value);
      }
    }

    return result;
  }

  private nodeToType(node: Record<string, unknown>, depth = 0): string {
    if (depth > 5) return "any";

    const type = node.type as string;

    if (type === "string") {
      const enums = node.enum as string[] | undefined;
      if (enums) return enums.map(e => `"${e}"`).join("|");
      return "string";
    }
    if (type === "number" || type === "integer") return "number";
    if (type === "boolean") return "boolean";
    if (type === "null") return "null";

    if (type === "array") {
      const items = node.items as Record<string, unknown> | undefined;
      if (items) return `${this.nodeToType(items, depth + 1)}[]`;
      return "any[]";
    }

    if (type === "object") {
      const props = node.properties as Record<string, Record<string, unknown>> | undefined;
      if (!props) return "object";
      const required = new Set((node.required as string[]) || []);
      const fields = Object.entries(props).map(([name, schema]) => {
        const opt = required.has(name) ? "" : "?";
        return `${name}${opt}: ${this.nodeToType(schema, depth + 1)}`;
      });
      return `{${fields.join("; ")}}`;
    }

    // Union types
    if (node.oneOf || node.anyOf) {
      const variants = (node.oneOf || node.anyOf) as Record<string, unknown>[];
      return variants.map(v => this.nodeToType(v, depth + 1)).join(" | ");
    }

    return "any";
  }
}

export const schemaCompactEngine = new SchemaCompactEngine();
