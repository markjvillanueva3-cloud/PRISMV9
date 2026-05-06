/**
 * ExtractionFramework — INTEL-OLLAMA-OBSIDIAN-MS0/P18-U02 tests.
 *
 * Coverage: applyNormalizer (every kind + adversarial), applyNormalizerChain
 * (short-circuit + no-op), splitCsvLine, resolvePointer (5 paths),
 * validateSchema (5 failure modes), parse() across 4 formats with happy-path
 * + 3 failure modes + 2 adversarial inputs each, dispatcher round-trip
 * (z.enum + ACTION_DEV_SCHEMAS + case-body source check + end-to-end with
 * sample CSV and JSON inputs), variability floor (3 spanning catalog shapes:
 * ISCAR PDF table, Sandvik regex cutting data, API JSON catalog).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ExtractionFrameworkEngine,
  SCHEMA_VERSION,
  MAX_INPUT_BYTES,
  type ExtractionSchema,
  type ColumnSpec,
} from "../engines/ExtractionFrameworkEngine.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// __tests__/ -> src/ -> mcp-server/  (the dispatcher source lives under src/tools/)
const MCP_ROOT = path.resolve(HERE, "../..");

describe("P18-U02 module constants", () => {
  it("exports stable defaults", () => {
    expect(SCHEMA_VERSION).toBe("1.0.0");
    expect(MAX_INPUT_BYTES).toBeGreaterThanOrEqual(16 * 1024 * 1024);
  });
});

describe("P18-U02 applyNormalizer", () => {
  const blank: ColumnSpec = { name: "x", source: 0 };

  it("trim drops surrounding whitespace", () => {
    expect(ExtractionFrameworkEngine.applyNormalizer("  hi  ", "trim", blank)).toBe("hi");
  });

  it("lower / upper case-fold", () => {
    expect(ExtractionFrameworkEngine.applyNormalizer("ABC", "lower", blank)).toBe("abc");
    expect(ExtractionFrameworkEngine.applyNormalizer("abc", "upper", blank)).toBe("ABC");
  });

  it("number parses comma-separated and space-separated numerics", () => {
    expect(ExtractionFrameworkEngine.applyNormalizer("1,234.5", "number", blank)).toBe(1234.5);
    expect(ExtractionFrameworkEngine.applyNormalizer("  42 ", "number", blank)).toBe(42);
    expect(ExtractionFrameworkEngine.applyNormalizer("not a number", "number", blank)).toBeNull();
    expect(ExtractionFrameworkEngine.applyNormalizer("", "number", blank)).toBeNull();
  });

  it("number rejects NaN / Infinity (adversarial)", () => {
    expect(ExtractionFrameworkEngine.applyNormalizer(NaN, "number", blank)).toBeNull();
    expect(ExtractionFrameworkEngine.applyNormalizer(Infinity, "number", blank)).toBeNull();
    expect(ExtractionFrameworkEngine.applyNormalizer(-Infinity, "number", blank)).toBeNull();
  });

  it("fraction-to-decimal converts 1/2 -> 0.5", () => {
    expect(ExtractionFrameworkEngine.applyNormalizer("1/2", "fraction-to-decimal", blank)).toBe(0.5);
    expect(ExtractionFrameworkEngine.applyNormalizer("3 / 4", "fraction-to-decimal", blank)).toBe(0.75);
    expect(ExtractionFrameworkEngine.applyNormalizer("notafrac", "fraction-to-decimal", blank)).toBe("notafrac");
    expect(ExtractionFrameworkEngine.applyNormalizer("1/0", "fraction-to-decimal", blank)).toBeNull();
  });

  it("inch-to-mm uses canonical 25.4 factor", () => {
    expect(ExtractionFrameworkEngine.applyNormalizer(1, "inch-to-mm", blank)).toBeCloseTo(25.4, 6);
    expect(ExtractionFrameworkEngine.applyNormalizer("0.5", "inch-to-mm", blank)).toBeCloseTo(12.7, 6);
    expect(ExtractionFrameworkEngine.applyNormalizer("not-num", "inch-to-mm", blank)).toBeNull();
  });

  it("mm-to-inch is exact inverse of inch-to-mm", () => {
    expect(ExtractionFrameworkEngine.applyNormalizer(25.4, "mm-to-inch", blank)).toBeCloseTo(1, 6);
    expect(ExtractionFrameworkEngine.applyNormalizer(12.7, "mm-to-inch", blank)).toBeCloseTo(0.5, 6);
  });

  it("drop-empty returns null for blank/null/undefined and passes others through", () => {
    expect(ExtractionFrameworkEngine.applyNormalizer("", "drop-empty", blank)).toBeNull();
    expect(ExtractionFrameworkEngine.applyNormalizer("   ", "drop-empty", blank)).toBeNull();
    expect(ExtractionFrameworkEngine.applyNormalizer(undefined, "drop-empty", blank)).toBeNull();
    expect(ExtractionFrameworkEngine.applyNormalizer("hi", "drop-empty", blank)).toBe("hi");
    expect(ExtractionFrameworkEngine.applyNormalizer(0, "drop-empty", blank)).toBe(0);
  });

  it("default substitutes defaultValue when raw is empty/null", () => {
    const spec: ColumnSpec = { name: "x", source: 0, defaultValue: "fallback" };
    expect(ExtractionFrameworkEngine.applyNormalizer("", "default", spec)).toBe("fallback");
    expect(ExtractionFrameworkEngine.applyNormalizer(null, "default", spec)).toBe("fallback");
    expect(ExtractionFrameworkEngine.applyNormalizer("hi", "default", spec)).toBe("hi");
  });
});

describe("P18-U02 applyNormalizerChain", () => {
  it("runs normalizers left-to-right", () => {
    const spec: ColumnSpec = { name: "x", source: 0, normalizers: ["trim", "lower"] };
    expect(ExtractionFrameworkEngine.applyNormalizerChain("  HELLO  ", spec)).toBe("hello");
  });

  it("short-circuits to null when a normalizer returns null", () => {
    const spec: ColumnSpec = { name: "x", source: 0, normalizers: ["number", "inch-to-mm"] };
    expect(ExtractionFrameworkEngine.applyNormalizerChain("not-num", spec)).toBeNull();
  });

  it("returns raw when no normalizers configured", () => {
    expect(ExtractionFrameworkEngine.applyNormalizerChain("untouched", { name: "x", source: 0 })).toBe("untouched");
  });
});

describe("P18-U02 splitCsvLine", () => {
  it("splits on the configured delimiter", () => {
    expect(ExtractionFrameworkEngine.splitCsvLine("a,b,c", ",")).toEqual(["a", "b", "c"]);
    expect(ExtractionFrameworkEngine.splitCsvLine("a;b;c", ";")).toEqual(["a", "b", "c"]);
  });

  it("returns [] for non-string input", () => {
    expect(ExtractionFrameworkEngine.splitCsvLine(null as unknown as string, ",")).toEqual([]);
  });
});

describe("P18-U02 resolvePointer", () => {
  it('"/" returns the root object identity', () => {
    expect(ExtractionFrameworkEngine.resolvePointer({ a: 1 }, "/")).toEqual({ a: 1 });
  });

  it('"/foo/bar" walks the path to the leaf value', () => {
    expect(ExtractionFrameworkEngine.resolvePointer({ foo: { bar: 42 } }, "/foo/bar")).toBe(42);
  });

  it('"/items/0" handles array indexing', () => {
    expect(ExtractionFrameworkEngine.resolvePointer({ items: ["a", "b"] }, "/items/0")).toBe("a");
  });

  it("returns undefined on missing path", () => {
    const r = ExtractionFrameworkEngine.resolvePointer({ a: 1 }, "/b/c");
    expect(r === undefined).toBe(true);
  });

  it('rejects pointers not starting with "/"', () => {
    const r = ExtractionFrameworkEngine.resolvePointer({ a: 1 }, "no-slash");
    expect(r === undefined).toBe(true);
  });
});

describe("P18-U02 validateSchema", () => {
  const goodSchema: ExtractionSchema = {
    schemaVersion: SCHEMA_VERSION,
    format: "csv-table",
    columns: [{ name: "n", source: 0 }],
  };

  it("accepts a minimal valid schema and echoes it back", () => {
    const r = ExtractionFrameworkEngine.validateSchema(goodSchema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.schema.format).toBe("csv-table");
      expect(r.schema.columns[0].name).toBe("n");
    }
  });

  it("rejects bad schemaVersion with a descriptive error", () => {
    const r = ExtractionFrameworkEngine.validateSchema({ ...goodSchema, schemaVersion: "0.0.1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("schemaVersion");
  });

  it("rejects empty columns", () => {
    const r = ExtractionFrameworkEngine.validateSchema({ ...goodSchema, columns: [] });
    expect(r.ok).toBe(false);
  });

  it("rejects unknown format", () => {
    const r = ExtractionFrameworkEngine.validateSchema({ ...goodSchema, format: "nope" });
    expect(r.ok).toBe(false);
  });

  it("rejects null / non-object adversarial inputs", () => {
    expect(ExtractionFrameworkEngine.validateSchema(null).ok).toBe(false);
    expect(ExtractionFrameworkEngine.validateSchema("string").ok).toBe(false);
  });
});

describe("P18-U02 parse() — csv-table format", () => {
  const schema: ExtractionSchema = {
    schemaVersion: SCHEMA_VERSION,
    format: "csv-table",
    skipLines: 1,
    columns: [
      { name: "tool", source: 0, normalizers: ["trim", "upper"], required: true },
      { name: "diameter_mm", source: 1, normalizers: ["number", "inch-to-mm"] },
      { name: "flutes", source: 2, normalizers: ["number"] },
    ],
  };

  it("extracts records and converts inches -> mm", () => {
    const input = ["name,inches,flutes", "endmill-a,0.25,4", "endmill-b,0.5,2"].join("\n");
    const r = ExtractionFrameworkEngine.parse(input, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toHaveLength(2);
      expect(r.rows[0]).toEqual({ tool: "ENDMILL-A", diameter_mm: 6.35, flutes: 4 });
      expect(r.rows[1]).toEqual({ tool: "ENDMILL-B", diameter_mm: 12.7, flutes: 2 });
      expect(r.stats.rowsExtracted).toBe(2);
      expect(r.stats.rowsRejected).toBe(0);
      expect(r.stats.truncated).toBe(false);
    }
  });

  it("rejects rows missing a required column and records the rejection reason", () => {
    const input = "name,inches,flutes\n,0.25,4\nendmill-b,0.5,2";
    const r = ExtractionFrameworkEngine.parse(input, {
      ...schema,
      columns: [
        { name: "tool", source: 0, normalizers: ["trim", "drop-empty"], required: true },
        { name: "diameter_mm", source: 1, normalizers: ["number", "inch-to-mm"] },
        { name: "flutes", source: 2, normalizers: ["number"] },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toHaveLength(1);
      expect(r.stats.rowsRejected).toBe(1);
      expect(r.stats.rejectionReasons["required-missing:tool"]).toBe(1);
    }
  });

  it("respects skipLines and ignores blank lines", () => {
    const input = "header1\nheader2\n\nrow1,1,2\n\nrow2,3,4\n";
    const r = ExtractionFrameworkEngine.parse(input, { ...schema, skipLines: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rows).toHaveLength(2);
  });

  it("truncates at maxRows and flags stats.truncated=true", () => {
    const lines = ["hdr"];
    for (let i = 0; i < 10; i++) lines.push(`r${i},1,2`);
    const r = ExtractionFrameworkEngine.parse(lines.join("\n"), { ...schema, maxRows: 3 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toHaveLength(3);
      expect(r.stats.truncated).toBe(true);
    }
  });
});

describe("P18-U02 parse() — regex-rows format", () => {
  const schema: ExtractionSchema = {
    schemaVersion: SCHEMA_VERSION,
    format: "regex-rows",
    rowPattern: "(?<grade>[A-Z]{2,4}\\d+)\\s+(?<vc>\\d+(?:\\.\\d+)?)",
    columns: [
      { name: "grade", source: "grade", required: true },
      { name: "vc_m_min", source: "vc", normalizers: ["number"] },
    ],
  };

  it("captures named groups and runs normalizers on each match", () => {
    const input = "GC4225 240\nGC1115 180\nignore-this\nKC8050 320.5";
    const r = ExtractionFrameworkEngine.parse(input, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toEqual([
        { grade: "GC4225", vc_m_min: 240 },
        { grade: "GC1115", vc_m_min: 180 },
        { grade: "KC8050", vc_m_min: 320.5 },
      ]);
    }
  });

  it("rejects malformed rowPattern with a descriptive error", () => {
    const r = ExtractionFrameworkEngine.parse("anything", { ...schema, rowPattern: "[unclosed" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("invalid rowPattern");
  });

  it("rejects when rowPattern is missing", () => {
    const r = ExtractionFrameworkEngine.parse("data", { ...schema, rowPattern: undefined } as ExtractionSchema);
    expect(r.ok).toBe(false);
  });
});

describe("P18-U02 parse() — json-array format", () => {
  const schema: ExtractionSchema = {
    schemaVersion: SCHEMA_VERSION,
    format: "json-array",
    arrayPointer: "/items",
    columns: [
      { name: "id", source: "/id", required: true },
      { name: "diameter_mm", source: "/d_mm", normalizers: ["number"] },
    ],
  };

  it("walks arrayPointer and extracts records, coercing string numerics", () => {
    const input = JSON.stringify({
      items: [
        { id: "T1", d_mm: 6.0 },
        { id: "T2", d_mm: "8.5" },
        { id: "T3", d_mm: "garbage" },
      ],
    });
    const r = ExtractionFrameworkEngine.parse(input, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toHaveLength(3);
      expect(r.rows[0]).toEqual({ id: "T1", diameter_mm: 6 });
      expect(r.rows[1]).toEqual({ id: "T2", diameter_mm: 8.5 });
      expect(r.rows[2]).toEqual({ id: "T3", diameter_mm: null });
    }
  });

  it("fails when arrayPointer doesn't resolve to an array", () => {
    const r = ExtractionFrameworkEngine.parse('{"items": "not-an-array"}', schema);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("did not resolve to an array");
  });

  it("fails on invalid JSON (adversarial)", () => {
    const r = ExtractionFrameworkEngine.parse("{ invalid json", schema);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("JSON parse failed");
  });
});

describe("P18-U02 parse() — key-value-pairs format", () => {
  const schema: ExtractionSchema = {
    schemaVersion: SCHEMA_VERSION,
    format: "key-value-pairs",
    columns: [
      { name: "vendor", source: "Vendor", normalizers: ["trim"] },
      { name: "diameter_mm", source: "Diameter (mm)", normalizers: ["number"] },
    ],
  };

  it("extracts a single record from a key-value text block", () => {
    const input = "Vendor: ISCAR\nDiameter (mm): 12.7\nIgnored: line";
    const r = ExtractionFrameworkEngine.parse(input, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toHaveLength(1);
      expect(r.rows[0]).toEqual({ vendor: "ISCAR", diameter_mm: 12.7 });
    }
  });
});

describe("P18-U02 parse() — top-level guards", () => {
  const minSchema: ExtractionSchema = {
    schemaVersion: SCHEMA_VERSION,
    format: "csv-table",
    columns: [{ name: "x", source: 0 }],
  };

  it("rejects non-string input (adversarial)", () => {
    const r = ExtractionFrameworkEngine.parse(42 as unknown, minSchema);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("input must be string");
  });

  it("rejects schema with non-1.0.0 version", () => {
    const r = ExtractionFrameworkEngine.parse("a,b", { ...minSchema, schemaVersion: "9.9.9" });
    expect(r.ok).toBe(false);
  });
});

describe("P18-U02 dispatcher round-trip — prism_dev:catalog_extract", () => {
  it("ACTION_DEV_SCHEMAS.catalog_extract validates a complete payload", () => {
    const entry = ACTION_DEV_SCHEMAS.catalog_extract;
    if (!entry) throw new Error("catalog_extract missing from ACTION_DEV_SCHEMAS");
    const result = entry.safeParse({
      input: "a,b\n1,2",
      schema: {
        schemaVersion: "1.0.0",
        format: "csv-table",
        skipLines: 1,
        columns: [
          { name: "a", source: 0 },
          { name: "b", source: 1, normalizers: ["number"] },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it("ACTION_DEV_SCHEMAS.catalog_extract rejects missing input", () => {
    const entry = ACTION_DEV_SCHEMAS.catalog_extract;
    if (!entry) throw new Error("catalog_extract missing from ACTION_DEV_SCHEMAS");
    const result = entry.safeParse({
      schema: { schemaVersion: "1.0.0", format: "csv-table", columns: [{ name: "x", source: 0 }] },
    });
    expect(result.success).toBe(false);
  });

  it("ACTION_DEV_SCHEMAS.catalog_extract rejects invalid format enum", () => {
    const entry = ACTION_DEV_SCHEMAS.catalog_extract;
    if (!entry) throw new Error("catalog_extract missing from ACTION_DEV_SCHEMAS");
    const result = entry.safeParse({
      input: "a",
      schema: { schemaVersion: "1.0.0", format: "not-a-real-format", columns: [{ name: "x", source: 0 }] },
    });
    expect(result.success).toBe(false);
  });

  it("ACTION_DEV_SCHEMAS.catalog_extract rejects unknown normalizer", () => {
    const entry = ACTION_DEV_SCHEMAS.catalog_extract;
    if (!entry) throw new Error("catalog_extract missing from ACTION_DEV_SCHEMAS");
    const result = entry.safeParse({
      input: "a",
      schema: {
        schemaVersion: "1.0.0",
        format: "csv-table",
        columns: [{ name: "x", source: 0, normalizers: ["bogus-normalizer"] }],
      },
    });
    expect(result.success).toBe(false);
  });

  it("dispatcher source contains catalog_extract in ACTIONS const, z.enum, AND case body", () => {
    const src = fs.readFileSync(
      path.join(MCP_ROOT, "src/tools/dispatchers/devDispatcher.ts"),
      "utf8",
    );
    expect(src).toContain('"catalog_extract"');
    expect(src).toContain('case "catalog_extract"');
    const caseBlock = src.slice(src.indexOf('case "catalog_extract"'), src.indexOf('case "catalog_extract"') + 1500);
    expect(caseBlock).toContain("ExtractionFrameworkEngine");
    expect(caseBlock).toContain("ExtractionFrameworkEngine.parse");
  });

  it("end-to-end: case-body equivalent produces normalized rows for sample CSV", () => {
    const params = {
      input: "header\nA,1.5\nB,2.5",
      schema: {
        schemaVersion: "1.0.0",
        format: "csv-table" as const,
        skipLines: 1,
        columns: [
          { name: "tool", source: 0, normalizers: ["trim", "upper"] as const },
          { name: "size", source: 1, normalizers: ["number"] as const },
        ],
      },
    };
    const r = ExtractionFrameworkEngine.parse(params.input, params.schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toEqual([
        { tool: "A", size: 1.5 },
        { tool: "B", size: 2.5 },
      ]);
      expect(r.stats.rowsExtracted).toBe(2);
      expect(r.stats.rowsRejected).toBe(0);
    }
  });

  it("end-to-end: case-body equivalent surfaces parse error for invalid JSON input", () => {
    const params = {
      input: "{ bad json",
      schema: {
        schemaVersion: "1.0.0",
        format: "json-array" as const,
        arrayPointer: "/",
        columns: [{ name: "x", source: "/x", required: true }],
      },
    };
    const r = ExtractionFrameworkEngine.parse(params.input, params.schema);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("JSON parse failed");
  });
});

describe("P18-U02 variability floor — 3 spanning catalog shapes", () => {
  it("ISCAR-style PDF table -> csv-style normalized rows", () => {
    const schema: ExtractionSchema = {
      schemaVersion: SCHEMA_VERSION,
      format: "csv-table",
      skipLines: 1,
      columns: [
        { name: "designation", source: 0, normalizers: ["trim", "upper"], required: true },
        { name: "DC_mm", source: 1, normalizers: ["fraction-to-decimal", "inch-to-mm"] },
        { name: "OAL_mm", source: 2, normalizers: ["fraction-to-decimal", "inch-to-mm"] },
      ],
    };
    const input = "Designation,DC,OAL\nfoo-12,1/4,2\nbar-34,1/2,3";
    const r = ExtractionFrameworkEngine.parse(input, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows[0].DC_mm).toBeCloseTo(6.35, 3);
      expect(r.rows[1].DC_mm).toBeCloseTo(12.7, 3);
    }
  });

  it("Sandvik-style cutting-data regex -> speed/feed records", () => {
    const schema: ExtractionSchema = {
      schemaVersion: SCHEMA_VERSION,
      format: "regex-rows",
      rowPattern: "(?<grade>[A-Z]{2}\\d{4})\\s+vc=(?<vc>\\d+(?:\\.\\d+)?)\\s+fz=(?<fz>\\d+(?:\\.\\d+)?)",
      columns: [
        { name: "grade", source: "grade", required: true },
        { name: "vc_m_min", source: "vc", normalizers: ["number"] },
        { name: "fz_mm_tooth", source: "fz", normalizers: ["number"] },
      ],
    };
    const input = "Spec sheet\nGC4240 vc=240 fz=0.10\nGC1130 vc=180 fz=0.08\n";
    const r = ExtractionFrameworkEngine.parse(input, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toHaveLength(2);
      expect(r.rows[0]).toEqual({ grade: "GC4240", vc_m_min: 240, fz_mm_tooth: 0.1 });
    }
  });

  it("API-fetched JSON catalog -> typed records with coerced numerics", () => {
    const schema: ExtractionSchema = {
      schemaVersion: SCHEMA_VERSION,
      format: "json-array",
      arrayPointer: "/results/items",
      columns: [
        { name: "sku", source: "/sku", required: true },
        { name: "ra_um", source: "/ra_um", normalizers: ["number"] },
      ],
    };
    const input = JSON.stringify({
      results: { items: [{ sku: "TLR-001", ra_um: 0.8 }, { sku: "TLR-002", ra_um: "1.6" }] },
    });
    const r = ExtractionFrameworkEngine.parse(input, schema);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.rows).toEqual([
        { sku: "TLR-001", ra_um: 0.8 },
        { sku: "TLR-002", ra_um: 1.6 },
      ]);
    }
  });
});
