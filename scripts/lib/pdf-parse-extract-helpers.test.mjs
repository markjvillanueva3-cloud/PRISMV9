/**
 * Tests for pdf-parse-extract-helpers.mjs — node:test, no external deps.
 * @slot whiskey
 * @date 2026-05-25
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseArgs,
  pdfPathToSlug,
  chooseTargets,
  harvestStructure,
  formatTribalJsonl,
  formatWikiMarkdown,
  buildOutputDescriptor,
  dateStamp,
  TOP_MILLING_OOP_PDFS,
  SCHEMA_VERSION,
} from "./pdf-parse-extract-helpers.mjs";

test("SCHEMA_VERSION is semver string", () => {
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
});

test("TOP_MILLING_OOP_PDFS is non-empty, all .pdf paths", () => {
  assert.ok(TOP_MILLING_OOP_PDFS.length >= 5);
  for (const p of TOP_MILLING_OOP_PDFS) {
    assert.match(p, /\.pdf$/i);
    assert.match(p, /^H:\/PRISM\/resources\//);
  }
});

test("parseArgs defaults", () => {
  const o = parseArgs([]);
  assert.equal(o.max, 1);
  assert.equal(o.pages, 20);
  assert.equal(o.dryRun, false);
  assert.equal(o.milling, true);
  assert.deepEqual(o.files, []);
  assert.equal(o.slot, "whiskey");
});

test("parseArgs --max --pages --dry-run", () => {
  const o = parseArgs(["--max", "5", "--pages", "30", "--dry-run"]);
  assert.equal(o.max, 5);
  assert.equal(o.pages, 30);
  assert.equal(o.dryRun, true);
});

test("parseArgs --pages clamps to [1, 80]", () => {
  assert.equal(parseArgs(["--pages", "0"]).pages, 1);
  assert.equal(parseArgs(["--pages", "9999"]).pages, 80);
  assert.equal(parseArgs(["--pages", "garbage"]).pages, 20);
});

test("parseArgs --max coerces non-finite to 1", () => {
  assert.equal(parseArgs(["--max", "garbage"]).max, 1);
  assert.equal(parseArgs(["--max", "-5"]).max, 1);
});

test("parseArgs --file accumulates and disables milling default", () => {
  const o = parseArgs(["--file", "A.pdf", "--file", "B.pdf"]);
  assert.deepEqual(o.files, ["A.pdf", "B.pdf"]);
  assert.equal(o.milling, false);
});

test("parseArgs --slot --out-root override", () => {
  const o = parseArgs(["--slot", "golf", "--out-root", "/tmp/x"]);
  assert.equal(o.slot, "golf");
  assert.equal(o.outRoot, "/tmp/x");
});

test("pdfPathToSlug strips extension and lowercases", () => {
  assert.equal(pdfPathToSlug("H:/x/CNC_Machining_The_Complete.pdf"), "cnc-machining-the-complete");
  assert.equal(pdfPathToSlug("Mill Operator's Manual.PDF"), "mill-operator-s-manual");
});

test("pdfPathToSlug handles edge cases", () => {
  assert.equal(pdfPathToSlug(""), "");
  assert.equal(pdfPathToSlug(null), "");
  assert.equal(pdfPathToSlug(undefined), "");
  assert.equal(pdfPathToSlug("a"), "a");
});

test("pdfPathToSlug handles smart quotes (NGC manual)", () => {
  const s = pdfPathToSlug("English - Mill Operator’s Manual.pdf");
  assert.match(s, /mill-operator/);
  assert.doesNotMatch(s, /['‘’]/);
});

test("pdfPathToSlug caps length at 80", () => {
  const long = "a".repeat(200) + ".pdf";
  assert.ok(pdfPathToSlug(long).length <= 80);
});

test("chooseTargets respects --max", () => {
  const o = parseArgs(["--max", "3"]);
  assert.equal(chooseTargets(o).length, 3);
});

test("chooseTargets returns --file list when provided", () => {
  const o = parseArgs(["--file", "X.pdf", "--max", "10"]);
  const t = chooseTargets(o);
  assert.deepEqual(t, ["X.pdf"]);
});

test("chooseTargets empty when no milling AND no files", () => {
  const o = parseArgs([]);
  o.milling = false;
  assert.deepEqual(chooseTargets(o), []);
});

test("harvestStructure handles empty / null input", () => {
  for (const input of ["", null, undefined, 42]) {
    const r = harvestStructure(input);
    assert.deepEqual(r.headings, []);
    assert.equal(r.firstParagraph, "");
    assert.equal(r.lineCount, 0);
    assert.equal(r.charCount, 0);
  }
});

test("harvestStructure detects ALL-CAPS headings", () => {
  const txt = "INTRODUCTION\n\nSome body text here that is longer than eighty characters so it shows up as a paragraph candidate for the first-paragraph harvest.\n\nCHAPTER ONE\n\nMore body.\n";
  const r = harvestStructure(txt);
  assert.ok(r.headings.includes("INTRODUCTION"));
  assert.ok(r.headings.includes("CHAPTER ONE"));
});

test("harvestStructure detects numbered section heads", () => {
  const txt = "1.1 Workholding\n\n2.3 Tool selection criteria\n\nSome inline 1.2 mention only.\n";
  const r = harvestStructure(txt);
  assert.ok(r.headings.some((h) => h.startsWith("1.1 ")));
  assert.ok(r.headings.some((h) => h.startsWith("2.3 ")));
});

test("harvestStructure detects Chapter/Section/Appendix/Part markers", () => {
  const txt = "Chapter 5 Milling Strategies\n\nSection A Setup\n\nAppendix B Tables\n\nPart 1 Theory\n";
  const r = harvestStructure(txt);
  assert.ok(r.headings.some((h) => /^Chapter 5/.test(h)));
  assert.ok(r.headings.some((h) => /^Section A/.test(h)));
  assert.ok(r.headings.some((h) => /^Appendix B/.test(h)));
  assert.ok(r.headings.some((h) => /^Part 1/.test(h)));
});

test("harvestStructure dedupes case-insensitively + caps at maxHeadings", () => {
  const lines = [];
  for (let i = 0; i < 50; i++) lines.push(`SECTION ${String.fromCharCode(65 + (i % 26))} HEADING ${i}`);
  const r = harvestStructure(lines.join("\n\n"), { maxHeadings: 8 });
  assert.equal(r.headings.length, 8);
});

test("harvestStructure firstParagraph >= 80 chars only", () => {
  const txt = "short\n\nsecond short\n\n" + "Now a long enough paragraph ".repeat(10);
  const r = harvestStructure(txt);
  assert.ok(r.firstParagraph.length >= 80);
});

test("formatTribalJsonl emits valid JSON with required fields", () => {
  const rec = {
    slug: "test-pdf",
    path: "H:/x/test.pdf",
    title: "Test PDF",
    pagesExtracted: 20,
    extractedAt: "2026-05-25T20:00:00.000Z",
    headings: ["A", "B", "C"],
    firstParagraph: "Some paragraph",
  };
  const line = formatTribalJsonl(rec);
  const obj = JSON.parse(line);
  assert.equal(obj.schema_version, SCHEMA_VERSION);
  assert.equal(obj.confidence, 0.3);
  assert.equal(obj.needs_curation, true);
  assert.equal(obj.extraction_quality, "pdf-parse-stub");
  assert.equal(obj.domain, "milling");
  assert.equal(obj.topic, "order-of-operations");
  assert.deepEqual(obj.headings_sample, ["A", "B", "C"]);
  assert.equal(obj.source.pdf_path, "H:/x/test.pdf");
  assert.equal(obj.bridge_engines.length, 3);
});

test("formatTribalJsonl single-line (no embedded newlines)", () => {
  const rec = {
    slug: "test", path: "a.pdf", title: "T", pagesExtracted: 1,
    extractedAt: "2026-05-25T20:00:00.000Z",
    headings: ["X"], firstParagraph: "Para",
  };
  const line = formatTribalJsonl(rec);
  assert.ok(!line.includes("\n"));
});

test("formatWikiMarkdown contains required frontmatter + sections", () => {
  const rec = {
    slug: "nice", path: "H:/x/nice.pdf", title: "Nice", pagesExtracted: 15,
    extractedAt: "2026-05-25T20:00:00.000Z",
    headings: ["INTRO", "1.1 Foo"], firstParagraph: "Para body.",
  };
  const md = formatWikiMarkdown(rec);
  assert.match(md, /^---\n/);
  assert.match(md, /name: pdf-extract-nice/);
  assert.match(md, /confidence: 0\.3/);
  assert.match(md, /needs_curation: true/);
  assert.match(md, /# Nice/);
  assert.match(md, /## Detected structure/);
  assert.match(md, /## First paragraph/);
  assert.match(md, /## Bridge engines/);
  assert.match(md, /\[\[PostProcessorPipelineEngine\]\]/);
  assert.match(md, /- INTRO/);
});

test("formatWikiMarkdown handles empty headings + paragraph", () => {
  const rec = {
    slug: "empty", path: "H:/x/empty.pdf", title: "Empty", pagesExtracted: 1,
    extractedAt: "2026-05-25T20:00:00.000Z",
    headings: [], firstParagraph: "",
  };
  const md = formatWikiMarkdown(rec);
  assert.match(md, /no headings detected/);
  assert.match(md, /no paragraph/);
});

test("buildOutputDescriptor produces both paths under out-root", () => {
  const rec = {
    slug: "x", path: "a.pdf", title: "T", pagesExtracted: 1,
    extractedAt: "2026-05-25T20:00:00.000Z", headings: [], firstParagraph: "",
  };
  const d = buildOutputDescriptor(rec, "/root");
  assert.equal(d.wikiPath, "/root/knowledge/wiki/lessons/pdf-extract-x.md");
  assert.equal(d.jsonlPath, "/root/state/shared/extracted-pdfs/whiskey-milling-oop-2026-05-25.jsonl");
});

test("dateStamp returns yyyy-mm-dd from ISO", () => {
  assert.equal(dateStamp("2026-05-25T20:00:00.000Z"), "2026-05-25");
  assert.equal(dateStamp(""), "unknown");
  assert.equal(dateStamp(null), "unknown");
});
