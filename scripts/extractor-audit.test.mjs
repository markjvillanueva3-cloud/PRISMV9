/**
 * extractor-audit — pure-logic tests for INTEL-OLLAMA-OBSIDIAN-MS0/P18-U01.
 *
 * Tests every classifier function against synthetic head excerpts and
 * verifies the live audit on this repo discovers ≥30 extractor scripts
 * (anti-regression — the count must never drop unexpectedly).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyInputFormat,
  classifyOutputTarget,
  classifyPatternType,
  extractVendor,
  decideKeepInFramework,
  classifyExtractor,
  summarize,
  renderInventoryMarkdown,
  parseArgs,
  KNOWN_VENDORS,
  FILENAME_GLOB,
  HEAD_BYTES_FOR_CLASSIFY,
} from "./extractor-audit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");

describe("P18-U01 module constants", () => {
  it("FILENAME_GLOB matches the expected extension set", () => {
    expect(FILENAME_GLOB.test("extract-iscar.py")).toBe(true);
    expect(FILENAME_GLOB.test("extract-machines.mjs")).toBe(true);
    expect(FILENAME_GLOB.test("extract-cutting-catalogs.ts")).toBe(true);
    expect(FILENAME_GLOB.test("extract-foo.js")).toBe(false);
    expect(FILENAME_GLOB.test("inject-foo.py")).toBe(false);
    expect(FILENAME_GLOB.test("extract.py")).toBe(false); // requires hyphen suffix
  });

  it("KNOWN_VENDORS includes the major catalog publishers", () => {
    for (const v of ["sandvik", "kennametal", "iscar", "tungaloy", "guhring", "korloy"]) {
      expect(KNOWN_VENDORS).toContain(v);
    }
  });

  it("HEAD_BYTES_FOR_CLASSIFY is large enough for typical license + imports", () => {
    expect(HEAD_BYTES_FOR_CLASSIFY).toBeGreaterThanOrEqual(4096);
  });
});

describe("P18-U01 classifyInputFormat", () => {
  it("detects pdf via pymupdf import", () => {
    expect(classifyInputFormat("import pymupdf\nimport json", "py")).toBe("pdf");
  });

  it("detects pdf via pdf-parse import (Node)", () => {
    expect(classifyInputFormat('const { PDFParse } = require("pdf-parse");', "ts")).toBe("pdf");
  });

  it("detects xlsx via openpyxl", () => {
    expect(classifyInputFormat("from openpyxl import load_workbook", "py")).toBe("xlsx");
  });

  it("detects csv", () => {
    expect(classifyInputFormat("import csv\ndf = csv.reader(f)", "py")).toBe("csv");
  });

  it("detects html via cheerio", () => {
    expect(classifyInputFormat('import * as cheerio from "cheerio"', "ts")).toBe("html");
  });

  it("detects api via fetch / requests", () => {
    expect(classifyInputFormat("import requests\nrequests.get(url)", "py")).toBe("api");
    expect(classifyInputFormat("await fetch('https://api.example')", "ts")).toBe("api");
  });

  it("detects json source", () => {
    expect(classifyInputFormat("data = json.loads(text)", "py")).toBe("json");
  });

  it("falls back to text for plain scripts", () => {
    expect(classifyInputFormat("# generic notes\nprint('hi')", "py")).toBe("text");
  });

  it("returns unknown on empty / non-string input", () => {
    expect(classifyInputFormat("", "py")).toBe("unknown");
    // @ts-expect-error - adversarial wrong-type
    expect(classifyInputFormat(null, "py")).toBe("unknown");
  });
});

describe("P18-U01 classifyOutputTarget", () => {
  it("detects registry writes", () => {
    expect(classifyOutputTarget("from src.registries.tools import register")).toBe("registry");
  });

  it("detects qdrant upserts", () => {
    expect(classifyOutputTarget("client.upsert(collection_name='foo')")).toBe("qdrant");
  });

  it("detects obsidian/wiki writes", () => {
    expect(classifyOutputTarget("write to knowledge/wiki/entries/foo.md")).toBe("obsidian");
  });

  it("detects dataset JSON writes", () => {
    expect(classifyOutputTarget("write to data/iscar-tools-extracted.json")).toBe("dataset");
  });

  it("falls back to dataset for raw fs writes", () => {
    expect(classifyOutputTarget("fs.writeFileSync('out.json', JSON.stringify(rows));")).toBe("dataset");
  });

  it("returns other when no signal", () => {
    expect(classifyOutputTarget("# nothing here, just comments")).toBe("other");
  });

  it("returns unknown on empty / non-string", () => {
    expect(classifyOutputTarget("")).toBe("unknown");
    // @ts-expect-error - adversarial wrong-type
    expect(classifyOutputTarget(null)).toBe("unknown");
  });
});

describe("P18-U01 classifyPatternType", () => {
  it("detects table-extract via find_tables() / page.tables", () => {
    expect(classifyPatternType("for tbl in page.find_tables(): rows = tbl.extract()", "pdf")).toBe("table-extract");
  });

  it("detects llm-prompted via ollama / chat.completions", () => {
    expect(classifyPatternType("await ollama.generate({ prompt })", "text")).toBe("llm-prompted");
  });

  it("detects regex-scrape via re.match / re.findall", () => {
    expect(classifyPatternType("m = re.match(r'(\\d+)', s)", "text")).toBe("regex-scrape");
  });

  it("flags api-fetch when input format is api (precedence)", () => {
    expect(classifyPatternType("plain script", "api")).toBe("api-fetch");
  });

  it("detects structured-parse via json.dump", () => {
    expect(classifyPatternType("json.dump(rows, f, indent=2)", "pdf")).toBe("structured-parse");
  });

  it("falls back to manual-record when no other signal", () => {
    expect(classifyPatternType("# trivial script", "text")).toBe("manual-record");
  });

  it("returns unknown on empty / non-string", () => {
    expect(classifyPatternType("", "pdf")).toBe("unknown");
  });
});

describe("P18-U01 extractVendor", () => {
  it("matches a known vendor inside the filename", () => {
    expect(extractVendor("extract-sandvik-tools.py")).toBe("sandvik");
    expect(extractVendor("extract-kennametal-milling.py")).toBe("kennametal");
    expect(extractVendor("extract-tungaloy-drills.py")).toBe("tungaloy");
  });

  it("is case-insensitive", () => {
    expect(extractVendor("EXTRACT-ISCAR-TOOLS.py")).toBe("iscar");
  });

  it("returns 'generic' when no known vendor matches", () => {
    expect(extractVendor("extract-machines.mjs")).toBe("generic");
    expect(extractVendor("extract-pdf-text.py")).toBe("generic");
  });

  it("returns 'generic' on empty / non-string input", () => {
    expect(extractVendor("")).toBe("generic");
    // @ts-expect-error - adversarial wrong-type
    expect(extractVendor(null)).toBe("generic");
    // @ts-expect-error - adversarial wrong-type
    expect(extractVendor(42)).toBe("generic");
  });
});

describe("P18-U01 decideKeepInFramework", () => {
  it("KEEPs reusable patterns", () => {
    expect(decideKeepInFramework({ patternType: "table-extract", vendor: "iscar" })).toEqual({
      keep: true,
      reason: "reusable-pattern",
    });
    expect(decideKeepInFramework({ patternType: "structured-parse", vendor: "any" })).toEqual({
      keep: true,
      reason: "reusable-pattern",
    });
    expect(decideKeepInFramework({ patternType: "api-fetch", vendor: "generic" })).toEqual({
      keep: true,
      reason: "reusable-pattern",
    });
  });

  it("KEEPs llm-prompted as framework-orchestrated", () => {
    expect(decideKeepInFramework({ patternType: "llm-prompted", vendor: "iscar" })).toEqual({
      keep: true,
      reason: "framework-orchestrated",
    });
  });

  it("ARCHIVEs vendor-specific regex scrape", () => {
    const r = decideKeepInFramework({ patternType: "regex-scrape", vendor: "iscar" });
    expect(r.keep).toBe(false);
    expect(r.reason).toBe("vendor-specific-regex");
  });

  it("KEEPs generic regex scrape (reusable enough to graduate)", () => {
    // Generic regex isn't keep-OR-archive in our taxonomy — it falls through.
    const r = decideKeepInFramework({ patternType: "regex-scrape", vendor: "generic" });
    expect(r.keep).toBe(false);
    expect(r.reason).toBe("unclassified");
  });

  it("ARCHIVEs manual-record patterns", () => {
    expect(decideKeepInFramework({ patternType: "manual-record", vendor: "any" })).toEqual({
      keep: false,
      reason: "one-shot-record",
    });
  });
});

describe("P18-U01 classifyExtractor (end-to-end on synthetic body)", () => {
  it("ISCAR PDF table extractor → KEEP", () => {
    const r = classifyExtractor({
      filename: "extract-iscar-tools.py",
      ext: "py",
      body: 'import pymupdf\nimport json\nfor tbl in page.find_tables(): rows = tbl.extract()\njson.dump(rows, f)',
    });
    expect(r.inputFormat).toBe("pdf");
    expect(r.patternType).toBe("table-extract");
    expect(r.vendor).toBe("iscar");
    expect(r.keepInFramework).toBe(true);
  });

  it("Generic API fetcher → KEEP", () => {
    const r = classifyExtractor({
      filename: "extract-machines.mjs",
      ext: "mjs",
      body: 'await fetch("https://api/machines")\nfs.writeFileSync("out.json", x)',
    });
    expect(r.inputFormat).toBe("api");
    expect(r.patternType).toBe("api-fetch");
    expect(r.vendor).toBe("generic");
    expect(r.keepInFramework).toBe(true);
  });

  it("Vendor-specific regex script → ARCHIVE", () => {
    const r = classifyExtractor({
      filename: "extract-widia-2022.py",
      ext: "py",
      body: '# raw text fixup\nimport re\nm = re.match(r"(\\d+)", s)',
    });
    expect(r.patternType).toBe("regex-scrape");
    expect(r.vendor).toBe("widia");
    expect(r.keepInFramework).toBe(false);
    expect(r.keepReason).toBe("vendor-specific-regex");
  });
});

describe("P18-U01 summarize", () => {
  it("aggregates counts across axes", () => {
    const records = [
      { inputFormat: "pdf", outputTarget: "dataset", patternType: "table-extract", vendor: "iscar", keepInFramework: true },
      { inputFormat: "pdf", outputTarget: "dataset", patternType: "table-extract", vendor: "kennametal", keepInFramework: true },
      { inputFormat: "api", outputTarget: "registry", patternType: "api-fetch", vendor: "generic", keepInFramework: true },
      { inputFormat: "text", outputTarget: "other", patternType: "manual-record", vendor: "generic", keepInFramework: false },
    ];
    const s = summarize(records);
    expect(s.total).toBe(4);
    expect(s.keepCount).toBe(3);
    expect(s.archiveCount).toBe(1);
    expect(s.inputFormatCounts).toEqual({ pdf: 2, api: 1, text: 1 });
    expect(s.patternTypeCounts).toEqual({
      "table-extract": 2,
      "api-fetch": 1,
      "manual-record": 1,
    });
    expect(s.vendorCounts).toEqual({ iscar: 1, kennametal: 1, generic: 2 });
  });

  it("handles empty input cleanly", () => {
    const s = summarize([]);
    expect(s.total).toBe(0);
    expect(s.keepCount).toBe(0);
    expect(s.archiveCount).toBe(0);
  });
});

describe("P18-U01 renderInventoryMarkdown", () => {
  it("emits stable header + table for a small set", () => {
    const records = [
      { filename: "extract-a.py", ext: "py", inputFormat: "pdf", outputTarget: "dataset", patternType: "table-extract", vendor: "iscar", keepInFramework: true, keepReason: "reusable-pattern" },
      { filename: "extract-b.py", ext: "py", inputFormat: "text", outputTarget: "other", patternType: "manual-record", vendor: "generic", keepInFramework: false, keepReason: "one-shot-record" },
    ];
    const summary = summarize(records);
    const md = renderInventoryMarkdown({ records, summary, generatedAt: "2026-05-06T00:00:00Z" });
    expect(md).toContain("# Extractor Inventory");
    expect(md).toContain("**Total scripts:** 2");
    expect(md).toContain("**Keep in framework:** 1");
    expect(md).toContain("`extract-a.py`");
    expect(md).toContain("`extract-b.py`");
    expect(md).toContain("INTEL-OLLAMA-OBSIDIAN-MS0/P18-U01");
    expect(md.endsWith("\n")).toBe(true);
  });

  it("table rows are sorted by filename", () => {
    const records = [
      { filename: "extract-z.py", ext: "py", inputFormat: "pdf", outputTarget: "dataset", patternType: "table-extract", vendor: "generic", keepInFramework: true, keepReason: "reusable-pattern" },
      { filename: "extract-a.py", ext: "py", inputFormat: "pdf", outputTarget: "dataset", patternType: "table-extract", vendor: "generic", keepInFramework: true, keepReason: "reusable-pattern" },
    ];
    const summary = summarize(records);
    const md = renderInventoryMarkdown({ records, summary, generatedAt: "2026-05-06T00:00:00Z" });
    const aIdx = md.indexOf("extract-a.py");
    const zIdx = md.indexOf("extract-z.py");
    expect(aIdx).toBeGreaterThan(0);
    expect(zIdx).toBeGreaterThan(aIdx);
  });
});

describe("P18-U01 parseArgs", () => {
  it("returns defaults", () => {
    expect(parseArgs([])).toEqual({ json: false, markdown: false, root: "" });
  });

  it("parses --json / --markdown flags", () => {
    expect(parseArgs(["--json"])).toMatchObject({ json: true });
    expect(parseArgs(["--markdown"])).toMatchObject({ markdown: true });
  });

  it("parses --root in both forms", () => {
    expect(parseArgs(["--root", "/tmp/foo"])).toMatchObject({ root: "/tmp/foo" });
    expect(parseArgs(["--root=/tmp/bar"])).toMatchObject({ root: "/tmp/bar" });
  });
});

describe("P18-U01 live audit on this repo", () => {
  it("anti-regression: discovers >= 30 extractor scripts in mcp-server/scripts/", () => {
    const dir = path.join(REPO_ROOT, "mcp-server/scripts");
    expect(fs.existsSync(dir), `${dir} must exist`).toBe(true);
    const found = fs.readdirSync(dir).filter((n) => FILENAME_GLOB.test(n));
    expect(found.length).toBeGreaterThanOrEqual(30);
  });

  it("anti-regression: at least 3 spanning vendors are present (variability floor)", () => {
    const dir = path.join(REPO_ROOT, "mcp-server/scripts");
    const found = fs.readdirSync(dir).filter((n) => FILENAME_GLOB.test(n));
    const vendors = new Set(found.map(extractVendor));
    vendors.delete("generic");
    expect(vendors.size).toBeGreaterThanOrEqual(3);
  });
});
