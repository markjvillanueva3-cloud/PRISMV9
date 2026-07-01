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
  classifyPdfExtraction,
  extractionSignals,
  deriveDomainTopic,
  DEFAULT_DOMAIN,
  DEFAULT_TOPIC,
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

// ── classifyPdfExtraction / extractionSignals (scan-vs-text routing, plan section 2) ──
// WHY these matter: an image-based drawing PDF parses to 0 headings + 0 real
// paragraphs. Without routing, the extractor emits a hollow tribal/wiki note that
// pollutes the corpus. The classifier must route such records to the OCR lane and
// leave genuine text-bearing PDFs (the GD&T knowledge sources) emitting unchanged.

test("classifyPdfExtraction: text-bearing PDF (headings + paragraph + chars) -> text/emit", () => {
  const c = classifyPdfExtraction({ headingCount: 12, firstParagraphChars: 420, charCount: 50000 });
  assert.equal(c.lane, "text");
  assert.equal(c.isScan, false);
  assert.equal(c.reason, "text-bearing");
});

test("classifyPdfExtraction: heading-only deck is still TEXT (real knowledge, not a scan)", () => {
  // a slide deck of GD&T section titles has headings but no >=80-char paragraph
  const c = classifyPdfExtraction({ headingCount: 8, firstParagraphChars: 0, charCount: 1200 });
  assert.equal(c.lane, "text");
  assert.equal(c.reason, "text-bearing");
});

test("classifyPdfExtraction: paragraph-only sheet is still TEXT (sparse but real)", () => {
  const c = classifyPdfExtraction({ headingCount: 0, firstParagraphChars: 240, charCount: 900 });
  assert.equal(c.lane, "text");
  assert.equal(c.isScan, false);
});

test("classifyPdfExtraction: image-based drawing (0 headings, 0 paragraph, has text layer) -> OCR", () => {
  // a scanned drawing whose OCR text-layer carried incidental title-block chars
  const c = classifyPdfExtraction({ headingCount: 0, firstParagraphChars: 0, charCount: 350 });
  assert.equal(c.lane, "ocr");
  assert.equal(c.isScan, true);
  assert.equal(c.reason, "image-based-no-structure");
});

test("classifyPdfExtraction: no text layer at all (charCount 0) -> OCR no-text-layer", () => {
  const c = classifyPdfExtraction({ headingCount: 0, firstParagraphChars: 0, charCount: 0 });
  assert.equal(c.lane, "ocr");
  assert.equal(c.reason, "no-text-layer");
});

test("classifyPdfExtraction adversarial: many chars but zero structure still routes to OCR", () => {
  // a big scanned drawing with a noisy OCR layer (lots of garbage chars, no real
  // headings/paragraphs) must NOT be emitted as a giant hollow note
  const c = classifyPdfExtraction({ headingCount: 0, firstParagraphChars: 0, charCount: 80000 });
  assert.equal(c.lane, "ocr");
  assert.equal(c.reason, "image-based-no-structure");
});

test("classifyPdfExtraction adversarial: malformed/negative/NaN signals coerce to OCR no-text-layer", () => {
  assert.equal(classifyPdfExtraction({ headingCount: -3, firstParagraphChars: NaN, charCount: -1 }).reason, "no-text-layer");
  assert.equal(classifyPdfExtraction({ headingCount: "x", firstParagraphChars: "y", charCount: "z" }).reason, "no-text-layer");
});

test("classifyPdfExtraction defensive: empty / null / undefined signals -> OCR (never emit)", () => {
  for (const input of [{}, null, undefined, "nope", 42]) {
    const c = classifyPdfExtraction(input);
    assert.equal(c.lane, "ocr");
    assert.equal(c.isScan, true);
  }
});

test("extractionSignals: reads heading count, paragraph length, charCount from a record", () => {
  const sig = extractionSignals({ headings: ["A", "B", "C"], firstParagraph: "x".repeat(120), charCount: 9000 });
  assert.deepEqual(sig, { headingCount: 3, firstParagraphChars: 120, charCount: 9000 });
});

test("extractionSignals defensive: partial / null record -> all-zero signals", () => {
  assert.deepEqual(extractionSignals({}), { headingCount: 0, firstParagraphChars: 0, charCount: 0 });
  assert.deepEqual(extractionSignals(null), { headingCount: 0, firstParagraphChars: 0, charCount: 0 });
  assert.deepEqual(extractionSignals({ headings: "notarray", charCount: -5 }), { headingCount: 0, firstParagraphChars: 0, charCount: 0 });
});

test("integration: a record harvested from EMPTY pdf text classifies as OCR (live skip path)", () => {
  // proves the real extractor path: harvestStructure("") -> 0/0/0 -> classify -> OCR -> skip emit
  const rec = harvestStructure("");
  const c = classifyPdfExtraction(extractionSignals(rec));
  assert.equal(c.lane, "ocr");
  assert.equal(c.reason, "no-text-layer");
});

test("integration: a record harvested from REAL text classifies as TEXT (live emit path)", () => {
  const txt = "INTRODUCTION\n\n" + "Datum reference frames establish the coordinate system from which all toleranced features are measured and verified.".repeat(2);
  const rec = harvestStructure(txt);
  const c = classifyPdfExtraction(extractionSignals(rec));
  assert.equal(c.lane, "text");
  assert.equal(c.isScan, false);
});

// ── deriveDomainTopic + domain-aware formatters (U-XRAY-GDT-DOMAIN-TAG) ──
// WHY: the extractor hardcoded domain:"milling" -> a GD&T textbook dropped in the
// blueprint-gdt-corpus drop-zone was mis-tagged milling, hiding it from a domain-
// filtered curation view. These pin: gdt-path -> gdt; everything else -> milling
// (byte-identical legacy back-compat); explicit --domain wins.

test("DEFAULT_DOMAIN / DEFAULT_TOPIC are the legacy milling values", () => {
  assert.equal(DEFAULT_DOMAIN, "milling");
  assert.equal(DEFAULT_TOPIC, "order-of-operations");
});

test("deriveDomainTopic: blueprint-gdt-corpus path -> gdt (slash + backslash + case)", () => {
  assert.deepEqual(deriveDomainTopic("H:/PRISM/resources/blueprint-gdt-corpus/y14.5.pdf"), { domain: "gdt", topic: "gdt-blueprint-reading" });
  assert.deepEqual(deriveDomainTopic("H:\\PRISM\\resources\\Blueprint-GDT-Corpus\\primer.pdf"), { domain: "gdt", topic: "gdt-blueprint-reading" });
});

test("deriveDomainTopic: non-gdt path -> milling default (back-compat)", () => {
  assert.deepEqual(deriveDomainTopic("H:/PRISM/resources/RESOURCE PDFS/Fundamentals.pdf"), { domain: "milling", topic: "order-of-operations" });
});

test("deriveDomainTopic: explicit domain wins; explicit topic honored", () => {
  assert.deepEqual(deriveDomainTopic("any/path.pdf", "lathe"), { domain: "lathe", topic: "general" });
  assert.deepEqual(deriveDomainTopic("resources/blueprint-gdt-corpus/x.pdf", "gdt", "datum-rfs"), { domain: "gdt", topic: "datum-rfs" });
  assert.deepEqual(deriveDomainTopic("p.pdf", "wedm", "edm-discharge"), { domain: "wedm", topic: "edm-discharge" });
});

test("deriveDomainTopic: null / non-string path -> milling default (no crash)", () => {
  for (const input of [null, undefined, 42]) {
    assert.deepEqual(deriveDomainTopic(input), { domain: "milling", topic: "order-of-operations" });
  }
});

test("deriveDomainTopic adversarial: explicit --domain is slugged (no path/filename injection)", () => {
  // path traversal / slashes / spaces / punctuation must not survive into the domain
  assert.equal(deriveDomainTopic("p.pdf", "../../etc/passwd").domain, "etc-passwd");
  assert.equal(deriveDomainTopic("p.pdf", "a/b").domain, "a-b");
  assert.equal(deriveDomainTopic("p.pdf", "Weird Domain!").domain, "weird-domain");
  // all-punctuation slugs to empty -> milling fallback (never an empty domain)
  assert.equal(deriveDomainTopic("p.pdf", "!!!").domain, "milling");
});

test("parseArgs --domain / --topic captured; default null", () => {
  assert.equal(parseArgs([]).domain, null);
  assert.equal(parseArgs([]).topic, null);
  const o = parseArgs(["--domain", "gdt", "--topic", "datum"]);
  assert.equal(o.domain, "gdt");
  assert.equal(o.topic, "datum");
});

test("formatTribalJsonl gdt: domain/topic from record, gdt id, NO fabricated bridge_engines", () => {
  const rec = { slug: "y14-5", path: "resources/blueprint-gdt-corpus/y14-5.pdf", title: "Y14.5", pagesExtracted: 10, extractedAt: "2026-06-23T00:00:00.000Z", headings: ["GD&T"], firstParagraph: "Datum.", domain: "gdt", topic: "gdt-blueprint-reading" };
  const obj = JSON.parse(formatTribalJsonl(rec));
  assert.equal(obj.domain, "gdt");
  assert.equal(obj.topic, "gdt-blueprint-reading");
  assert.equal(obj.id, "pdf-gdt-y14-5");
  assert.ok(!("bridge_engines" in obj), "no milling bridge_engines fabricated for gdt");
});

test("formatTribalJsonl back-compat: record WITHOUT domain -> milling tag + milling id + bridge_engines", () => {
  const rec = { slug: "mill", path: "a.pdf", title: "M", pagesExtracted: 1, extractedAt: "2026-05-25T20:00:00.000Z", headings: ["X"], firstParagraph: "p" };
  const obj = JSON.parse(formatTribalJsonl(rec));
  assert.equal(obj.domain, "milling");
  assert.equal(obj.topic, "order-of-operations");
  assert.equal(obj.id, "whiskey-mill-oop-mill");
  assert.equal(obj.bridge_engines.length, 3);
});

test("formatWikiMarkdown gdt: frontmatter domain/topic = gdt, NO Bridge engines section", () => {
  const rec = { slug: "g", path: "resources/blueprint-gdt-corpus/g.pdf", title: "G", pagesExtracted: 2, extractedAt: "2026-06-23T00:00:00.000Z", headings: ["A"], firstParagraph: "x", domain: "gdt", topic: "gdt-blueprint-reading" };
  const md = formatWikiMarkdown(rec);
  assert.match(md, /domain: gdt/);
  assert.match(md, /topic: gdt-blueprint-reading/);
  assert.match(md, /gdt PDF extract \(stub\)/);
  assert.doesNotMatch(md, /## Bridge engines/);
  assert.doesNotMatch(md, /PostProcessorPipelineEngine/);
});

test("formatWikiMarkdown back-compat: no domain -> milling frontmatter + Bridge engines section", () => {
  const rec = { slug: "m", path: "a.pdf", title: "M", pagesExtracted: 1, extractedAt: "2026-05-25T20:00:00.000Z", headings: [], firstParagraph: "" };
  const md = formatWikiMarkdown(rec);
  assert.match(md, /domain: milling/);
  assert.match(md, /topic: order-of-operations/);
  assert.match(md, /## Bridge engines/);
  assert.match(md, /\[\[PostProcessorPipelineEngine\]\]/);
});

test("buildOutputDescriptor gdt: domain-keyed jsonl; milling default unchanged", () => {
  const gdt = buildOutputDescriptor({ slug: "g", extractedAt: "2026-06-23T00:00:00.000Z", domain: "gdt" }, "/root");
  assert.equal(gdt.jsonlPath, "/root/state/shared/extracted-pdfs/pdf-extract-gdt-2026-06-23.jsonl");
  assert.equal(gdt.wikiPath, "/root/knowledge/wiki/lessons/pdf-extract-g.md");
  const mill = buildOutputDescriptor({ slug: "m", extractedAt: "2026-05-25T20:00:00.000Z" }, "/root");
  assert.equal(mill.jsonlPath, "/root/state/shared/extracted-pdfs/whiskey-milling-oop-2026-05-25.jsonl");
});
