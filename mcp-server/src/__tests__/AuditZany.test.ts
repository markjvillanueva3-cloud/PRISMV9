/**
 * Tests for scripts/audit-zany.mjs (INTEL-OLLAMA-OBSIDIAN-MS0/P8-U01).
 *
 * Verifies the inventory script:
 *  - finds z.any() in real schema files
 *  - ignores z.any() inside comments and string literals
 *  - classifies wrappers (z.array / z.record / z.union)
 *  - classifies field-name hints (metadata → record_of_unknown)
 *  - aggregates totals across files
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listTsFiles,
  stripCommentsAndStrings,
  auditFile,
  auditAll,
} from "../../../scripts/audit-zany.mjs";

let tmpRoot: string;
let schemasDir: string;
let toolsSchemasDir: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "audit-zany-"));
  schemasDir = join(tmpRoot, "mcp-server", "src", "schemas");
  toolsSchemasDir = join(tmpRoot, "mcp-server", "src", "tools", "schemas");
  mkdirSync(schemasDir, { recursive: true });
  mkdirSync(toolsSchemasDir, { recursive: true });

  // Fixture A: covers wrapper detection, field hints, comments, strings.
  writeFileSync(
    join(schemasDir, "fixtureA.ts"),
    [
      "import { z } from 'zod';",
      "// example uses z.any() in comment — should be ignored",
      "export const a = z.object({",
      "  metadata: z.any(),",
      "  data: z.any(),",
      "  doc: 'this contains z.any() in a string and must be ignored',",
      "  list: z.array(z.any()),",
      "  bag: z.record(z.string(), z.any()),",
      "  /* block comment with z.any() — also ignored */",
      "  alt: z.union([z.string(), z.any()]),",
      "  flexi: z.any().optional(),",
      "  unknown: z.any(),",
      "});",
      "",
    ].join("\n"),
  );

  // Fixture B: a separate file in tools/schemas/ to exercise multi-dir aggregation.
  writeFileSync(
    join(toolsSchemasDir, "fixtureB.ts"),
    [
      "import { z } from 'zod';",
      "export const b = z.object({",
      "  config: z.any(),",
      "});",
      "",
    ].join("\n"),
  );
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("listTsFiles", () => {
  it("returns .ts files in a directory", () => {
    const files = listTsFiles(schemasDir);
    expect(files.some((f) => f.endsWith("fixtureA.ts"))).toBe(true);
  });

  it("returns empty array on missing directory", () => {
    const files = listTsFiles(join(tmpRoot, "does-not-exist"));
    expect(files).toEqual([]);
  });

  it("ignores non-.ts files", () => {
    const dir = join(tmpRoot, "mixed");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "x.ts"), "");
    writeFileSync(join(dir, "y.mjs"), "");
    writeFileSync(join(dir, "z.json"), "{}");
    const files = listTsFiles(dir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/x\.ts$/);
  });
});

describe("stripCommentsAndStrings", () => {
  it("removes line comments while preserving newline structure", () => {
    const src = "z.any() // comment z.any()\nz.any()";
    const stripped = stripCommentsAndStrings(src);
    // Original line 1: code z.any() retained, comment z.any() blanked.
    // We do NOT decrement line numbers — line break preserved.
    expect(stripped.split("\n").length).toBe(2);
    expect(stripped.split("\n")[0]).toMatch(/z\.any\(\)/);
    expect(stripped.split("\n")[0]).not.toMatch(/comment z\.any\(\)/);
  });

  it("removes block comments", () => {
    const src = "a\n/* block z.any() */ z.any()\nb";
    const stripped = stripCommentsAndStrings(src);
    const line2 = stripped.split("\n")[1];
    expect(line2).toMatch(/z\.any\(\)/);
    expect((line2.match(/z\.any\(\)/g) || []).length).toBe(1);
  });

  it("removes z.any() inside double-quoted strings", () => {
    const src = 'const x = "z.any() in string"; z.any()';
    const stripped = stripCommentsAndStrings(src);
    expect((stripped.match(/z\.any\(\)/g) || []).length).toBe(1);
  });

  it("removes z.any() inside backticks and single quotes", () => {
    const src = "const x = `z.any()`; const y = 'z.any()'; z.any()";
    const stripped = stripCommentsAndStrings(src);
    expect((stripped.match(/z\.any\(\)/g) || []).length).toBe(1);
  });

  it("preserves line count exactly", () => {
    const src = "line1\n// line2 z.any()\n/* line3\n* line4 z.any()\n*/\nline6 z.any()";
    expect(stripCommentsAndStrings(src).split("\n").length).toBe(src.split("\n").length);
  });
});

describe("auditFile", () => {
  it("finds the expected number of code occurrences in fixtureA", () => {
    const occ = auditFile(join(schemasDir, "fixtureA.ts"), tmpRoot);
    // Expected code occurrences: metadata, data, list, bag, alt, flexi, unknown = 7
    // (the comment, block comment, and string occurrences are excluded)
    expect(occ.length).toBe(7);
  });

  it("classifies array_of_unknown for z.array(z.any())", () => {
    const occ = auditFile(join(schemasDir, "fixtureA.ts"), tmpRoot);
    const arr = occ.find((o) => o.fieldName === "list");
    expect(arr?.classification).toBe("array_of_unknown");
    expect(arr?.suggestedReplacement).toBe("z.array(z.unknown())");
  });

  it("classifies record_of_unknown for z.record wrapper", () => {
    const occ = auditFile(join(schemasDir, "fixtureA.ts"), tmpRoot);
    const rec = occ.find((o) => o.fieldName === "bag");
    expect(rec?.classification).toBe("record_of_unknown");
  });

  it("classifies union_member for z.union wrapper", () => {
    const occ = auditFile(join(schemasDir, "fixtureA.ts"), tmpRoot);
    const u = occ.find((o) => o.fieldName === "alt");
    expect(u?.classification).toBe("union_member");
  });

  it("classifies record_of_unknown via field-name hint (metadata)", () => {
    const occ = auditFile(join(schemasDir, "fixtureA.ts"), tmpRoot);
    const md = occ.find((o) => o.fieldName === "metadata");
    expect(md?.classification).toBe("record_of_unknown");
    expect(md?.suggestedReplacement).toBe("z.record(z.string(), z.unknown())");
  });

  it("classifies unknown_value via field-name hint (data)", () => {
    const occ = auditFile(join(schemasDir, "fixtureA.ts"), tmpRoot);
    const d = occ.find((o) => o.fieldName === "data");
    expect(d?.classification).toBe("unknown_value");
    expect(d?.suggestedReplacement).toBe("z.unknown()");
  });

  it("flags optional_unknown when followed by .optional()", () => {
    const occ = auditFile(join(schemasDir, "fixtureA.ts"), tmpRoot);
    const o = occ.find((x) => x.fieldName === "flexi");
    expect(o?.isOptionalChained).toBe(true);
    expect(o?.classification).toBe("optional_unknown");
  });

  it("falls back to default for ambiguous cases", () => {
    const occ = auditFile(join(schemasDir, "fixtureA.ts"), tmpRoot);
    // 'unknown' field name is in UNKNOWN_NAME_HINTS? No — list is value/data/input/output/result/...
    // 'unknown' is not in the hint set, so it's default.
    const u = occ.find((x) => x.fieldName === "unknown");
    expect(u?.classification).toBe("default");
  });

  it("captures line + column + context for each occurrence", () => {
    const occ = auditFile(join(schemasDir, "fixtureA.ts"), tmpRoot);
    for (const o of occ) {
      expect(o.line).toBeGreaterThan(0);
      expect(o.column).toBeGreaterThan(0);
      expect(Array.isArray(o.context)).toBe(true);
      expect(o.context.length).toBeGreaterThan(0);
    }
  });

  it("returns empty array for a file with no z.any()", () => {
    const cleanFile = join(schemasDir, "clean.ts");
    writeFileSync(
      cleanFile,
      "import { z } from 'zod';\nexport const c = z.object({ name: z.string() });\n",
    );
    expect(auditFile(cleanFile, tmpRoot)).toEqual([]);
  });
});

describe("auditAll aggregation", () => {
  it("sums byFile counts to totalOccurrences", () => {
    const result = auditAll(
      ["mcp-server/src/schemas", "mcp-server/src/tools/schemas"],
      tmpRoot,
    );
    const sumByFile = result.byFile.reduce((acc, e) => acc + e.count, 0);
    expect(sumByFile).toBe(result.totalOccurrences);
  });

  it("sums byClassification to totalOccurrences", () => {
    const result = auditAll(
      ["mcp-server/src/schemas", "mcp-server/src/tools/schemas"],
      tmpRoot,
    );
    const sumByClass = Object.values(result.byClassification).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sumByClass).toBe(result.totalOccurrences);
  });

  it("aggregates across both schema directories", () => {
    const result = auditAll(
      ["mcp-server/src/schemas", "mcp-server/src/tools/schemas"],
      tmpRoot,
    );
    // fixtureA contributes 7, fixtureB contributes 1, clean.ts contributes 0
    expect(result.totalOccurrences).toBe(8);
    expect(result.fileCount).toBe(2);
  });
});

describe("auditAll on real repo", () => {
  it("finds non-zero occurrences in current schema directories", () => {
    // Sanity: real repo should have well over 100 z.any() occurrences pre-P8-U02/U03.
    // We assert > 50 to make the test resilient to incremental cleanup mid-milestone.
    const result = auditAll();
    expect(result.totalOccurrences).toBeGreaterThan(50);
    expect(result.fileCount).toBeGreaterThan(5);
  });
});
