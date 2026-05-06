/**
 * ExtractionFrameworkEngine — INTEL-OLLAMA-OBSIDIAN-MS0/P18-U02.
 *
 * Schema-driven post-extraction normalizer. Sits downstream of the 41
 * catalog extractor scripts (audited in P18-U01) and absorbs the shared
 * parse/normalize pattern they all reinvent: take raw text in one of four
 * shapes (csv-table, regex-rows, json-array, key-value-pairs), apply a
 * declarative ExtractionSchema, run column normalizers (number, fraction,
 * inch-to-mm, lower, trim), and emit typed records with extraction stats.
 *
 * The script-side I/O (open PDF, read XLSX, fetch HTTP) stays in the
 * scripts. The engine receives the already-loaded text/buffer and is
 * therefore PURE — no fs, no fetch, no exec. That keeps it test-friendly
 * (no fixtures on disk) and CLAUDE.md-compliant (engines are calculation,
 * not I/O).
 *
 * Wire chain:
 *   script (PDF text)  →  prism_dev:catalog_extract  →
 *   ExtractionFrameworkEngine.parse(input, schema)  →  ParseResult
 *
 * @module engines/ExtractionFrameworkEngine
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P18-U02
 */

import { z } from "zod";

export const SCHEMA_VERSION = "1.0.0" as const;
export const MAX_INPUT_BYTES = 64 * 1024 * 1024; // 64 MB cap on a single parse() call
export const MAX_ROWS_DEFAULT = 100_000;

// ──────────────────────────────────────────────────────────────────────
// Types — Zod schemas for runtime validation + TS types
// ──────────────────────────────────────────────────────────────────────

const NormalizerKindSchema = z.enum([
  "trim",
  "lower",
  "upper",
  "number",
  "fraction-to-decimal",
  "inch-to-mm",
  "mm-to-inch",
  "drop-empty",
  "default",
]);

export type NormalizerKind = z.infer<typeof NormalizerKindSchema>;

const ColumnSpecSchema = z.object({
  name: z.string().min(1).describe("Output field name in the parsed record"),
  /** 0-based index of the source column (csv-table) or named regex group. */
  source: z.union([z.number().int().nonnegative(), z.string()]).describe(
    "0-based source-column index OR a JSON-pointer-style key path / regex group name",
  ),
  required: z.boolean().optional().describe("Reject row if this field is missing"),
  defaultValue: z.unknown().optional().describe("Used only with normalizer 'default'"),
  normalizers: z.array(NormalizerKindSchema).optional().describe(
    "Applied left-to-right to the raw cell value",
  ),
});

export type ColumnSpec = z.infer<typeof ColumnSpecSchema>;

const ExtractionSchemaShape = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  format: z.enum(["csv-table", "regex-rows", "json-array", "key-value-pairs"]),
  columns: z.array(ColumnSpecSchema).min(1),
  /** csv-table only — column delimiter (defaults to ",") */
  delimiter: z.string().min(1).max(4).optional(),
  /** csv-table only — skip the first N lines (typical: 1 to drop the header) */
  skipLines: z.number().int().nonnegative().optional(),
  /** regex-rows only — RegExp source string. The pattern is applied with /g. */
  rowPattern: z.string().min(1).optional(),
  /** json-array only — JSON-pointer to the root array (default: "/") */
  arrayPointer: z.string().optional(),
  /** Cap the number of rows extracted to keep responses bounded. */
  maxRows: z.number().int().positive().optional(),
});

export type ExtractionSchema = z.infer<typeof ExtractionSchemaShape>;

export interface ExtractedRow {
  [field: string]: unknown;
}

export interface ParseStats {
  rowsExtracted: number;
  rowsRejected: number;
  rejectionReasons: Record<string, number>;
  truncated: boolean;
}

export type ParseResult =
  | { ok: true; rows: ExtractedRow[]; stats: ParseStats }
  | { ok: false; error: string; details?: unknown };

// ──────────────────────────────────────────────────────────────────────
// Engine (class with static methods per CLAUDE.md engine convention)
// ──────────────────────────────────────────────────────────────────────

export class ExtractionFrameworkEngine {
  /**
   * Apply a single named normalizer to a raw value.
   *
   * @param raw     The raw cell value
   * @param kind    Normalizer kind
   * @param spec    Column spec (defaultValue is read for the "default" normalizer)
   * @returns       Normalized value, or `null` to signal "drop this row"
   *                (only for "drop-empty" + empty input)
   */
  static applyNormalizer(raw: unknown, kind: NormalizerKind, spec: ColumnSpec): unknown {
    switch (kind) {
      case "trim":
        return typeof raw === "string" ? raw.trim() : raw;
      case "lower":
        return typeof raw === "string" ? raw.toLowerCase() : raw;
      case "upper":
        return typeof raw === "string" ? raw.toUpperCase() : raw;
      case "number": {
        if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
        if (typeof raw !== "string") return null;
        const cleaned = raw.replace(/[, ]/g, "").trim();
        if (cleaned.length === 0) return null;
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : null;
      }
      case "fraction-to-decimal": {
        if (typeof raw !== "string") return raw;
        const m = raw.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
        if (!m) return raw;
        const num = Number(m[1]);
        const den = Number(m[2]);
        if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
        return num / den;
      }
      case "inch-to-mm": {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(n)) return null;
        return n * 25.4;
      }
      case "mm-to-inch": {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(n)) return null;
        return n / 25.4;
      }
      case "drop-empty":
        if (raw === undefined || raw === null) return null;
        if (typeof raw === "string" && raw.trim().length === 0) return null;
        return raw;
      case "default": {
        if (raw === undefined || raw === null) return spec.defaultValue ?? null;
        if (typeof raw === "string" && raw.trim().length === 0) {
          return spec.defaultValue ?? null;
        }
        return raw;
      }
      default:
        return raw;
    }
  }

  /**
   * Apply a chain of normalizers. If any returns null, the field is null;
   * the caller (extractRow) decides whether that drops the row.
   */
  static applyNormalizerChain(raw: unknown, spec: ColumnSpec): unknown {
    let v: unknown = raw;
    const chain = spec.normalizers ?? [];
    for (const k of chain) {
      v = this.applyNormalizer(v, k, spec);
      if (v === null) return null;
    }
    return v;
  }

  /**
   * Split a CSV-table line into cells using the configured delimiter.
   * No quote handling — keeps the parser predictable and cheap. Callers
   * that need RFC-4180 quoting can pre-clean the input.
   */
  static splitCsvLine(line: string, delimiter: string): string[] {
    if (typeof line !== "string") return [];
    return line.split(delimiter);
  }

  /**
   * Resolve a json-pointer-style path against an object.
   * "/" → root, "/foo/0/bar" → obj.foo[0].bar.
   */
  static resolvePointer(obj: unknown, pointer: string): unknown {
    if (pointer === "/" || pointer === "") return obj;
    if (typeof pointer !== "string" || !pointer.startsWith("/")) return undefined;
    const parts = pointer.slice(1).split("/").map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
    let cur: any = obj;
    for (const p of parts) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  /**
   * Validate a schema. Returns the parsed schema or a flat error.
   */
  static validateSchema(schema: unknown): { ok: true; schema: ExtractionSchema } | { ok: false; error: string } {
    const r = ExtractionSchemaShape.safeParse(schema);
    if (!r.success) {
      return { ok: false, error: `schema invalid: ${r.error.issues.map((i) => i.path.join(".") + ":" + i.message).join("; ")}` };
    }
    return { ok: true, schema: r.data };
  }

  /**
   * Build a single record from a row source. Returns `null` when a required
   * field is missing or any normalizer chain hard-rejects.
   */
  static extractRow(
    source: { kind: "csv"; cells: string[] } | { kind: "json"; obj: unknown } | { kind: "groups"; groups: Record<string, string> },
    schema: ExtractionSchema,
    stats: ParseStats,
  ): ExtractedRow | null {
    const out: ExtractedRow = {};
    for (const col of schema.columns) {
      let raw: unknown;
      if (source.kind === "csv") {
        const idx = typeof col.source === "number" ? col.source : Number(col.source);
        raw = Number.isFinite(idx) ? source.cells[idx] : undefined;
      } else if (source.kind === "json") {
        if (typeof col.source === "string") {
          raw = this.resolvePointer(source.obj, col.source);
        } else {
          // numeric source on json input — treat as array-element index on the row
          raw = (source.obj as unknown[])?.[col.source];
        }
      } else {
        // groups
        raw = typeof col.source === "string" ? source.groups[col.source] : undefined;
      }

      const normalized = this.applyNormalizerChain(raw, col);

      if (normalized === null || normalized === undefined) {
        if (col.required) {
          this.bumpReason(stats, `required-missing:${col.name}`);
          return null;
        }
        out[col.name] = null;
      } else {
        out[col.name] = normalized;
      }
    }
    return out;
  }

  private static bumpReason(stats: ParseStats, reason: string): void {
    stats.rejectionReasons[reason] = (stats.rejectionReasons[reason] ?? 0) + 1;
    stats.rowsRejected += 1;
  }

  /**
   * Parse a string input against a declarative ExtractionSchema. The single
   * public entry point — every extractor script eventually routes through
   * this method.
   *
   * @param input   Raw text/JSON content (already loaded by the caller)
   * @param schema  Declarative ExtractionSchema
   * @returns       ParseResult — either ok+rows+stats or a flat error
   */
  static parse(input: unknown, schema: unknown): ParseResult {
    if (typeof input !== "string") {
      return { ok: false, error: `input must be string, got ${typeof input}` };
    }
    if (input.length > MAX_INPUT_BYTES) {
      return { ok: false, error: `input too large: ${input.length} > ${MAX_INPUT_BYTES} bytes` };
    }
    const schemaCheck = this.validateSchema(schema);
    if (!schemaCheck.ok) return { ok: false, error: schemaCheck.error };
    const sch = schemaCheck.schema;
    const maxRows = sch.maxRows ?? MAX_ROWS_DEFAULT;

    const stats: ParseStats = {
      rowsExtracted: 0,
      rowsRejected: 0,
      rejectionReasons: {},
      truncated: false,
    };
    const rows: ExtractedRow[] = [];

    if (sch.format === "csv-table") {
      const delimiter = sch.delimiter ?? ",";
      const skipLines = sch.skipLines ?? 0;
      const lines = input.split(/\r?\n/);
      for (let i = skipLines; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().length === 0) continue;
        const cells = this.splitCsvLine(line, delimiter);
        const record = this.extractRow({ kind: "csv", cells }, sch, stats);
        if (record !== null) rows.push(record);
        if (rows.length >= maxRows) {
          stats.truncated = true;
          break;
        }
      }
    } else if (sch.format === "regex-rows") {
      if (typeof sch.rowPattern !== "string" || sch.rowPattern.length === 0) {
        return { ok: false, error: "regex-rows format requires rowPattern" };
      }
      let pattern: RegExp;
      try {
        pattern = new RegExp(sch.rowPattern, "g");
      } catch (e) {
        return { ok: false, error: `invalid rowPattern: ${(e as Error).message}` };
      }
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(input)) !== null) {
        const groups = (m.groups ?? {}) as Record<string, string>;
        const record = this.extractRow({ kind: "groups", groups }, sch, stats);
        if (record !== null) rows.push(record);
        if (rows.length >= maxRows) {
          stats.truncated = true;
          break;
        }
        // Guard against zero-width matches that would loop forever
        if (m.index === pattern.lastIndex) pattern.lastIndex += 1;
      }
    } else if (sch.format === "json-array") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(input);
      } catch (e) {
        return { ok: false, error: `JSON parse failed: ${(e as Error).message.slice(0, 200)}` };
      }
      const root = sch.arrayPointer ? this.resolvePointer(parsed, sch.arrayPointer) : parsed;
      if (!Array.isArray(root)) {
        return { ok: false, error: `arrayPointer "${sch.arrayPointer ?? "/"}" did not resolve to an array` };
      }
      for (const obj of root) {
        const record = this.extractRow({ kind: "json", obj }, sch, stats);
        if (record !== null) rows.push(record);
        if (rows.length >= maxRows) {
          stats.truncated = true;
          break;
        }
      }
    } else if (sch.format === "key-value-pairs") {
      // Format: "key: value\n…". Source values in the schema must be the
      // literal key strings; numeric sources are not meaningful here.
      const kv: Record<string, string> = {};
      for (const line of input.split(/\r?\n/)) {
        const idx = line.indexOf(":");
        if (idx < 0) continue;
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k.length === 0) continue;
        kv[k] = v;
      }
      // key-value-pairs is one record per parse() call.
      const record = this.extractRow({ kind: "groups", groups: kv }, sch, stats);
      if (record !== null) rows.push(record);
    } else {
      return { ok: false, error: `unsupported format: ${(sch as ExtractionSchema).format}` };
    }

    stats.rowsExtracted = rows.length;
    return { ok: true, rows, stats };
  }
}

export const extractionFrameworkEngine = ExtractionFrameworkEngine;
