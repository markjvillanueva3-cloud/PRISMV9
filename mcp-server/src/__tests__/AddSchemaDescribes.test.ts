/**
 * Tests for scripts/add-schema-describes.mjs (INTEL-OLLAMA-OBSIDIAN-MS0/P8-U04).
 *
 * Verifies the parser/inserter pure functions: parseFieldLine identifies
 * candidates correctly, findCandidatesInSource skips comments and non-fields,
 * insertDescribe places .describe() at the chain end, auditFile reports
 * accurate per-file coverage. Ollama is NOT exercised here — that's an
 * integration-level concern outside the unit test scope.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listTsFiles,
  parseFieldLine,
  findCandidatesInSource,
  insertDescribe,
  auditFile,
} from "../../../scripts/add-schema-describes.mjs";

let tmpRoot: string;
let schemasDir: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "add-schema-describes-"));
  schemasDir = join(tmpRoot, "mcp-server", "src", "schemas");
  mkdirSync(schemasDir, { recursive: true });

  // Fixture covering: simple types, chains, already-described, multiline,
  // commented-out lines, and quoted field names.
  writeFileSync(
    join(schemasDir, "fixture.ts"),
    [
      "import { z } from 'zod';",
      "// id: z.string()  ← commented-out line, must be skipped",
      "/* block comment with x: z.string() — must be skipped */",
      "export const a = z.object({",
      "  id: z.string(),",                                   // line 5: candidate
      "  count: z.number().int().positive().optional(),",   // line 6: candidate
      "  status: z.enum(['ok', 'fail']).optional(),",        // line 7: candidate
      "  active: z.boolean(),",                              // line 8: candidate
      "  meta: z.record(z.string(), z.unknown()).optional()," , // line 9: candidate
      "  list: z.array(z.string()),",                        // line 10: candidate
      "  union_field: z.union([z.string(), z.number()]),",   // line 11: candidate
      "  literal_field: z.literal('foo'),",                   // line 12: candidate
      "  // already_described: skipped",
      "  named: z.string().describe('Already documented'),", // line 14: skipped (already-has-describe)
      "  // multi-line field: skipped because phase 1 is single-line only",
      "  nested: z.object({",                                 // line 16: NOT a candidate (z.object)
      "    inner: z.string(),",                               // line 17: candidate INSIDE nested
      "  }),",
      "  'quoted_name': z.string(),",                         // line 19: candidate (quoted name)
      "  trailing_no_comma: z.string()",                      // line 20: candidate (no comma terminator)
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
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/fixture\.ts$/);
  });

  it("returns empty array on missing directory", () => {
    const files = listTsFiles(join(tmpRoot, "does-not-exist"));
    expect(files).toEqual([]);
  });
});

describe("parseFieldLine", () => {
  it("returns null for non-field lines", () => {
    expect(parseFieldLine("import { z } from 'zod';")).toBeNull();
    expect(parseFieldLine("export const a = z.object({")).toBeNull();
    expect(parseFieldLine("})")).toBeNull();
  });

  it("identifies a simple z.string() field as a candidate", () => {
    const r = parseFieldLine("  id: z.string(),");
    expect(r).not.toBeNull();
    expect(r!.name).toBe("id");
    expect(r!.expr).toBe("z.string()");
    expect(r!.terminator).toBe(",");
    expect(r!.isCandidate).toBe(true);
  });

  it("identifies chained z.number() with .optional() as a candidate", () => {
    const r = parseFieldLine("  count: z.number().int().positive().optional(),");
    expect(r!.isCandidate).toBe(true);
    expect(r!.name).toBe("count");
    expect(r!.expr).toBe("z.number().int().positive().optional()");
  });

  it("rejects fields that already have .describe()", () => {
    const r = parseFieldLine("  named: z.string().describe('Already documented'),");
    expect(r).not.toBeNull();
    expect(r!.isCandidate).toBe(false);
    expect(r!.reason).toBe("already-has-describe");
  });

  it("rejects multi-line accepted-type fields (unbalanced parens on the line)", () => {
    // z.array(...) is in ACCEPTED_TYPE_PREFIX so this exercises the paren-balance check.
    // (z.object is rejected earlier by not-accepted-type, covered separately below.)
    const r = parseFieldLine("  list: z.array(");
    expect(r).not.toBeNull();
    expect(r!.isCandidate).toBe(false);
    expect(r!.reason).toBe("unbalanced-parens");
  });

  it("rejects z.object() because phase 1 is simple-type only", () => {
    // Hypothetical single-line z.object — still rejected by ACCEPTED_TYPE_PREFIX.
    const r = parseFieldLine("  obj: z.object({}).passthrough(),");
    expect(r).not.toBeNull();
    expect(r!.isCandidate).toBe(false);
    expect(r!.reason).toBe("not-accepted-type");
  });

  it("captures the indent for round-trip preservation", () => {
    const r = parseFieldLine("    deep: z.string(),");
    expect(r!.indent).toBe("    ");
  });

  it("handles fields without a trailing comma", () => {
    const r = parseFieldLine("  trailing_no_comma: z.string()");
    expect(r!.isCandidate).toBe(true);
    expect(r!.terminator).toBe("");
  });
});

describe("findCandidatesInSource", () => {
  it("finds the right number of candidates in the fixture", () => {
    const src = require("node:fs").readFileSync(join(schemasDir, "fixture.ts"), "utf8");
    const cands = findCandidatesInSource(src);
    // Lines 5,6,7,8,9,10,11,12 (8 simple), 17 (inner inside nested), 19 (quoted), 20 (no comma) = 11 candidates total.
    // Line 14 is also matched but isCandidate=false (already-has-describe).
    // Line 16 (z.object) is matched but isCandidate=false (not-accepted-type AND unbalanced).
    const onlyCandidates = cands.filter(c => c.parsed.isCandidate);
    expect(onlyCandidates.length).toBe(11);
  });

  it("skips line-comment lines starting with // even if they look like fields", () => {
    const src = "// id: z.string(),\nfoo: z.string(),";
    const cands = findCandidatesInSource(src);
    expect(cands.length).toBe(1);
    expect(cands[0].parsed.name).toBe("foo");
  });

  it("skips lines starting with * (block-comment continuation)", () => {
    const src = " * x: z.string(),\nreal: z.string(),";
    const cands = findCandidatesInSource(src);
    expect(cands.length).toBe(1);
    expect(cands[0].parsed.name).toBe("real");
  });

  it("returns the line number 1-indexed", () => {
    const src = "line1\nfoo: z.string(),\nline3";
    const cands = findCandidatesInSource(src);
    expect(cands[0].lineNumber).toBe(2);
  });
});

describe("insertDescribe", () => {
  it("appends .describe() before the trailing comma", () => {
    const parsed = parseFieldLine("  id: z.string(),")!;
    const out = insertDescribe("  id: z.string(),", parsed, "Stable identifier");
    expect(out).toBe(`  id: z.string().describe("Stable identifier"),`);
  });

  it("preserves the chain when there is no trailing comma", () => {
    const parsed = parseFieldLine("  trailing_no_comma: z.string()")!;
    const out = insertDescribe("  trailing_no_comma: z.string()", parsed, "No comma case");
    expect(out).toBe(`  trailing_no_comma: z.string().describe("No comma case")`);
  });

  it("places .describe() AFTER an .optional() chain (outermost type)", () => {
    const parsed = parseFieldLine("  count: z.number().optional(),")!;
    const out = insertDescribe("  count: z.number().optional(),", parsed, "Optional count");
    expect(out).toBe(`  count: z.number().optional().describe("Optional count"),`);
    expect(out.indexOf(".describe")).toBeGreaterThan(out.indexOf(".optional"));
  });

  it("escapes embedded double-quotes in description", () => {
    const parsed = parseFieldLine("  q: z.string(),")!;
    const out = insertDescribe("  q: z.string(),", parsed, 'has "quotes"');
    expect(out).toBe(`  q: z.string().describe("has \\"quotes\\""),`);
  });

  it("collapses newlines in description into spaces", () => {
    const parsed = parseFieldLine("  m: z.string(),")!;
    const out = insertDescribe("  m: z.string(),", parsed, "first\nsecond");
    expect(out).toBe(`  m: z.string().describe("first second"),`);
    expect(out).not.toContain("\n");
  });

  it("hard-caps description length at 280 chars", () => {
    const parsed = parseFieldLine("  big: z.string(),")!;
    const huge = "x".repeat(500);
    const out = insertDescribe("  big: z.string(),", parsed, huge);
    const inside = out.match(/\.describe\("(.+?)"\),/)![1];
    expect(inside.length).toBe(280);
  });

  it("preserves leading indent exactly", () => {
    const parsed = parseFieldLine("        deep: z.string(),")!;
    const out = insertDescribe("        deep: z.string(),", parsed, "Deeply nested");
    expect(out.startsWith("        ")).toBe(true);
  });
});

describe("auditFile aggregation", () => {
  it("reports total / withDescribe / fixable consistent with the fixture", () => {
    const r = auditFile(join(schemasDir, "fixture.ts"), tmpRoot);
    expect(r.file).toMatch(/fixture\.ts$/);
    // Total non-comment ": z." matches: lines 5,6,7,8,9,10,11,12,14,16,17,19,20 = 13.
    expect(r.total).toBe(13);
    // Already-described: line 14 only.
    expect(r.withDescribe).toBe(1);
    // Fixable: 11 (everything except line 14 and line 16).
    expect(r.fixable).toBe(11);
    // Skipped (matched but not candidate and not already-described): line 16 only.
    expect(r.skipped).toBe(1);
    // Invariant: total = withDescribe + fixable + skipped.
    expect(r.total).toBe(r.withDescribe + r.fixable + r.skipped);
  });
});
