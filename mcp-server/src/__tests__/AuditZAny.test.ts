/**
 * AuditZAny — INTEL-OLLAMA-OBSIDIAN-MS0/P8-U01.
 *
 * Pure-function tests for scripts/audit-zany.mjs — the z.any() inventory
 * + classifier. Same dynamic-import pattern as P10-U01 / P11-U08 so the
 * I/O layer (filesystem walk + write) stays untouched.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../../scripts/audit-zany.mjs");

let classifyZAnySite: any;
let suggestReplacement: any;
let scanFileForZAny: any;
let buildInventory: any;
let stripLineCommentIndex: any;

beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
  classifyZAnySite = mod.classifyZAnySite;
  suggestReplacement = mod.suggestReplacement;
  scanFileForZAny = mod.scanFileForZAny;
  buildInventory = mod.buildInventory;
  stripLineCommentIndex = mod.stripLineCommentIndex;
});

// Helper: find the column of `z.any(` in a line so we don't have to
// hardcode brittle column numbers in test bodies.
function colOfZAny(line: string): number {
  const idx = line.search(/\bz\.any\s*\(/);
  return idx;
}

describe("P8-U01 classifyZAnySite", () => {
  it("classifies z.record(z.string(), z.any()) as 'record'", () => {
    const line = "  details: z.record(z.string(), z.any()).optional(),";
    expect(classifyZAnySite(line, colOfZAny(line))).toBe("record");
  });

  it("classifies z.array(z.any()) as 'union'", () => {
    const line = "  features: z.array(z.any()).optional(),";
    expect(classifyZAnySite(line, colOfZAny(line))).toBe("union");
  });

  it("classifies .catchall(z.any()) as 'object-shape'", () => {
    const line = "const s = z.object({}).catchall(z.any()).passthrough();";
    expect(classifyZAnySite(line, colOfZAny(line))).toBe("object-shape");
  });

  it("classifies bare `z.any()` as 'unknown'", () => {
    const line = "  payload: z.any(),";
    expect(classifyZAnySite(line, colOfZAny(line))).toBe("unknown");
  });

  it("classifies array-of-record-of-any: outer wrapper wins (record), via balanced-paren walk", () => {
    // z.array(z.record(z.string(), z.any())) — the innermost wrapper of
    // z.any() is z.record, so 'record' is correct.
    const line = "  list: z.array(z.record(z.string(), z.any())).optional(),";
    expect(classifyZAnySite(line, colOfZAny(line))).toBe("record");
  });

  it("returns 'unknown' for malformed inputs", () => {
    expect(classifyZAnySite("any string", -1)).toBe("unknown");
    expect(classifyZAnySite(null as any, 5)).toBe("unknown");
    expect(classifyZAnySite("ok", "x" as any)).toBe("unknown");
    expect(classifyZAnySite("ok", 9999)).toBe("unknown");
  });

  it("does NOT misclassify when an unrelated z.record appears earlier on the line and is fully closed before z.any()", () => {
    const line = "x = z.record(z.string(), z.string()); y = z.any();";
    // The earlier z.record(...) is closed; the bare z.any() should be 'unknown'.
    expect(classifyZAnySite(line, colOfZAny(line))).toBe("unknown");
  });
});

describe("P8-U01 suggestReplacement", () => {
  it("returns a non-empty Zod expression for each known category", () => {
    expect(suggestReplacement("record")).toContain("z.record");
    expect(suggestReplacement("object-shape")).toContain("catchall");
    expect(suggestReplacement("union")).toContain("array");
    expect(suggestReplacement("unknown")).toContain("z.unknown");
  });

  it("falls back to z.unknown() for unrecognised categories", () => {
    expect(suggestReplacement("garbage")).toContain("z.unknown");
    expect(suggestReplacement("")).toContain("z.unknown");
  });

  it("never references z.any() in any suggestion (would defeat the point)", () => {
    for (const c of ["record", "object-shape", "union", "unknown", "garbage"]) {
      expect(suggestReplacement(c)).not.toMatch(/\bz\.any\b/);
    }
  });
});

describe("P8-U01 scanFileForZAny", () => {
  it("returns [] for empty / malformed inputs", () => {
    expect(scanFileForZAny("")).toEqual([]);
    expect(scanFileForZAny(null as any)).toEqual([]);
    expect(scanFileForZAny(undefined as any)).toEqual([]);
  });

  it("returns [] when the source has no z.any() sites", () => {
    const src = `import { z } from "zod";\nexport const ok = z.object({ a: z.string() });\n`;
    expect(scanFileForZAny(src)).toEqual([]);
  });

  it("finds a single z.any() site and includes line number, column, classification, and suggestion", () => {
    const src = [
      `import { z } from "zod";`,
      ``,
      `export const s = z.record(z.string(), z.any()).optional();`,
      ``,
    ].join("\n");
    const sites = scanFileForZAny(src);
    expect(sites).toHaveLength(1);
    expect(sites[0].line).toBe(3);
    expect(sites[0].column).toBeGreaterThan(0);
    expect(sites[0].category).toBe("record");
    expect(sites[0].suggestion).toContain("z.unknown");
    expect(sites[0].lineText).toContain("z.any");
  });

  it("finds multiple sites on different lines and preserves order", () => {
    const src = [
      `const a = z.array(z.any());`,
      `const b = z.record(z.string(), z.any());`,
      `const c = z.any();`,
    ].join("\n");
    const sites = scanFileForZAny(src);
    expect(sites).toHaveLength(3);
    expect(sites.map((s: any) => s.category)).toEqual(["union", "record", "unknown"]);
    expect(sites.map((s: any) => s.line)).toEqual([1, 2, 3]);
  });

  it("finds multiple sites on the SAME line", () => {
    const src = `const x = { a: z.any(), b: z.array(z.any()) };`;
    const sites = scanFileForZAny(src);
    expect(sites).toHaveLength(2);
    expect(sites[0].category).toBe("unknown");
    expect(sites[1].category).toBe("union");
  });

  it("normalises CRLF line endings (Windows-friendly)", () => {
    const src = `line1\r\nconst x = z.any();\r\nline3\r\n`;
    const sites = scanFileForZAny(src);
    expect(sites).toHaveLength(1);
    expect(sites[0].line).toBe(2);
  });

  it("trims the lineText (saves bytes in the inventory JSON)", () => {
    const src = `        const x = z.any();        `;
    const sites = scanFileForZAny(src);
    expect(sites[0].lineText.startsWith(" ")).toBe(false);
    expect(sites[0].lineText.endsWith(" ")).toBe(false);
  });

  it("skips z.any() occurrences inside a line comment (prevents false positives)", () => {
    const src = `// TYPED SUB-SCHEMAS (replacing z.any() for safety-critical validation)\nconst real = z.any();\n`;
    const sites = scanFileForZAny(src);
    // Only the real one on line 2 should be reported.
    expect(sites).toHaveLength(1);
    expect(sites[0].line).toBe(2);
  });

  it("still reports z.any() that appears BEFORE a line comment on the same line", () => {
    const src = `const a = z.any(); // remove me later\n`;
    const sites = scanFileForZAny(src);
    expect(sites).toHaveLength(1);
    expect(sites[0].line).toBe(1);
  });
});

describe("P8-U01 stripLineCommentIndex", () => {
  it("returns -1 when there is no // comment", () => {
    expect(stripLineCommentIndex("const x = 1;")).toBe(-1);
    expect(stripLineCommentIndex("")).toBe(-1);
  });

  it("returns the index of the // when present at the start", () => {
    expect(stripLineCommentIndex("// hello")).toBe(0);
  });

  it("returns the index of the // when present mid-line", () => {
    const line = "const a = 1; // tail comment";
    expect(stripLineCommentIndex(line)).toBe(line.indexOf("//"));
  });

  it("does NOT treat `//` inside a double-quoted string as a comment", () => {
    expect(stripLineCommentIndex(`const u = "http://example.com";`)).toBe(-1);
  });

  it("does NOT treat `//` inside a single-quoted string as a comment", () => {
    expect(stripLineCommentIndex(`const u = 'http://example.com';`)).toBe(-1);
  });

  it("does NOT treat `//` inside a template literal as a comment", () => {
    expect(stripLineCommentIndex("const u = `http://example.com`;")).toBe(-1);
  });

  it("DOES find the comment when it appears AFTER a closed string", () => {
    const line = `const u = "ok"; // real comment`;
    expect(stripLineCommentIndex(line)).toBe(line.indexOf("//"));
  });

  it("returns -1 for non-string input", () => {
    expect(stripLineCommentIndex(null as any)).toBe(-1);
    expect(stripLineCommentIndex(undefined as any)).toBe(-1);
    expect(stripLineCommentIndex(42 as any)).toBe(-1);
  });
});

describe("P8-U01 buildInventory", () => {
  function fr(file: string, sites: Array<{ line: number; column: number; lineText: string; category: string; suggestion: string }>) {
    return { file, sites };
  }

  it("aggregates totals + per-category counts correctly", () => {
    const inv = buildInventory([
      fr("a.ts", [
        { line: 1, column: 1, lineText: "a", category: "record", suggestion: "x" },
        { line: 2, column: 1, lineText: "b", category: "record", suggestion: "x" },
      ]),
      fr("b.ts", [
        { line: 1, column: 1, lineText: "c", category: "union", suggestion: "x" },
        { line: 1, column: 5, lineText: "d", category: "object-shape", suggestion: "x" },
        { line: 1, column: 9, lineText: "e", category: "unknown", suggestion: "x" },
      ]),
    ]);
    expect(inv.summary.totalSites).toBe(5);
    expect(inv.summary.filesAffected).toBe(2);
    expect(inv.summary.byCategory).toEqual({
      "record": 2, "object-shape": 1, "union": 1, "unknown": 1,
    });
  });

  it("sorts files by site count descending (largest hot-spots first)", () => {
    const inv = buildInventory([
      fr("small.ts", [{ line: 1, column: 1, lineText: "a", category: "unknown", suggestion: "x" }]),
      fr("big.ts", [
        { line: 1, column: 1, lineText: "a", category: "record", suggestion: "x" },
        { line: 2, column: 1, lineText: "b", category: "record", suggestion: "x" },
        { line: 3, column: 1, lineText: "c", category: "record", suggestion: "x" },
      ]),
    ]);
    expect(inv.files[0].file).toBe("big.ts");
    expect(inv.files[1].file).toBe("small.ts");
  });

  it("drops files with zero sites from the output", () => {
    const inv = buildInventory([
      fr("empty.ts", []),
      fr("hits.ts", [{ line: 1, column: 1, lineText: "a", category: "unknown", suggestion: "x" }]),
    ]);
    expect(inv.summary.filesAffected).toBe(1);
    expect(inv.files.find((f: any) => f.file === "empty.ts")).toBeUndefined();
  });

  it("ignores malformed entries safely", () => {
    const inv = buildInventory([null, undefined, 42, fr("ok.ts", [
      { line: 1, column: 1, lineText: "a", category: "record", suggestion: "x" },
    ])] as any);
    expect(inv.summary.totalSites).toBe(1);
    expect(inv.summary.filesAffected).toBe(1);
  });

  it("returns a valid empty inventory for non-array input", () => {
    const inv = buildInventory(null as any);
    expect(inv.summary.totalSites).toBe(0);
    expect(inv.summary.filesAffected).toBe(0);
    expect(inv.files).toEqual([]);
  });

  it("stamps schemaVersion + generatedAt fields", () => {
    const inv = buildInventory([]);
    expect(inv.schemaVersion).toBe(1);
    expect(typeof inv.generatedAt).toBe("string");
    expect(inv.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("zero-input summary has all category counts at 0", () => {
    const inv = buildInventory([]);
    expect(inv.summary.byCategory).toEqual({
      "record": 0, "object-shape": 0, "union": 0, "unknown": 0,
    });
  });
});
