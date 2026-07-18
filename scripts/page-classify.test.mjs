// scripts/page-classify.test.mjs
// Tests for the page-classify runner's PURE report-assembly (U-PSGB-XRAY-PAGE-CLASSIFIER).
// The live classifyImage path needs Ollama (covered by an out-of-band smoke); the
// pure buildClassificationReport is what we pin here — real-value assertions, no I/O.
// Run: node --test <file>
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildClassificationReport, classifyImage, classifyPdf } from "./page-classify.mjs";

function res(png, verdict, page_kind, confidence, opts = {}) {
  return {
    png,
    verdict,
    confident_skip: opts.confident_skip === true,
    classification: page_kind ? { page_kind, confidence } : null,
    ms: opts.ms ?? 100,
    error: opts.error,
  };
}

test("report tallies extract/skip/errors and skip_rate over a mixed set", () => {
  const rpt = buildClassificationReport([
    res("a.png", "skip", "bom", 0.95, { confident_skip: true }),
    res("b.png", "extract", "drawing", 0.9),
    res("c.png", "extract", "drawing", 0.8),
    res("d.png", "extract", null, null, { error: "curl exit=7" }),
  ]);
  assert.equal(rpt.total, 4);
  assert.equal(rpt.classified, 3, "the errored page is not counted as classified");
  assert.equal(rpt.errors, 1);
  assert.equal(rpt.skip, 1);
  assert.equal(rpt.extract, 3, "errors fall through to extract (never lost)");
  assert.equal(rpt.skip_rate, 0.25);
});

test("an errored result is an EXTRACT, never a skip (data-loss guard at the report layer)", () => {
  const rpt = buildClassificationReport([
    res("x.png", "extract", null, null, { error: "parse: no JSON" }),
  ]);
  assert.equal(rpt.skip, 0);
  assert.equal(rpt.extract, 1);
  assert.equal(rpt.by_kind._error, 1, "errors bucket under _error");
});

test("by_kind tallies page kinds", () => {
  const rpt = buildClassificationReport([
    res("a.png", "skip", "bom", 0.9, { confident_skip: true }),
    res("b.png", "skip", "notes", 0.9, { confident_skip: true }),
    res("c.png", "extract", "drawing", 0.9),
    res("d.png", "extract", "drawing", 0.9),
  ]);
  assert.equal(rpt.by_kind.drawing, 2);
  assert.equal(rpt.by_kind.bom, 1);
  assert.equal(rpt.by_kind.notes, 1);
  assert.equal(rpt.skip, 2);
  assert.equal(rpt.skip_rate, 0.5);
});

test("empty input → all-zero report, skip_rate 0 (no divide-by-zero)", () => {
  const rpt = buildClassificationReport([]);
  assert.equal(rpt.total, 0);
  assert.equal(rpt.classified, 0);
  assert.equal(rpt.skip, 0);
  assert.equal(rpt.extract, 0);
  assert.equal(rpt.skip_rate, 0);
  assert.deepEqual(rpt.by_kind, {});
});

test("non-array input is tolerated (treated as empty)", () => {
  assert.equal(buildClassificationReport(null).total, 0);
  assert.equal(buildClassificationReport(undefined).total, 0);
  assert.equal(buildClassificationReport("nope").total, 0);
});

test("cases carry basename + verdict + page_kind + confident_skip", () => {
  const rpt = buildClassificationReport([
    res("H:/some/dir/page-12.png", "skip", "cover", 0.88, { confident_skip: true, ms: 2300 }),
  ]);
  const c = rpt.cases[0];
  assert.equal(c.png, "page-12.png", "basename only, not the full path");
  assert.equal(c.verdict, "skip");
  assert.equal(c.page_kind, "cover");
  assert.equal(c.confidence, 0.88);
  assert.equal(c.confident_skip, true);
  assert.equal(c.ms, 2300);
});

test("classifyImage on a missing file fails toward EXTRACT, never throws (no data loss on bad input)", () => {
  const r = classifyImage("H:/nonexistent/never-here-9f3a.png");
  assert.equal(r.verdict, "extract");
  assert.equal(r.confident_skip, false);
  assert.equal(r.classification, null);
  assert.ok(r.error, "surfaces an error");
});

test("classifyPdf on a missing pdf returns an error (no crash, no pages)", () => {
  const out = classifyPdf("H:/nonexistent/never-here-9f3a.pdf");
  assert.ok(out.error, "surfaces an error");
  assert.deepEqual(out.pages, []);
});

test("classifyPdf render-loop (hermetic): a render-failed page is EXTRACT+error; rendered pages thread the classify verdict + page index", () => {
  // real temp file so the existsSync(pdfPath) gate passes; pageCount/render/classify injected
  // so the loop runs with NO Python and NO Ollama. This regression-pins the render-fail→extract
  // invariant (the most safety-critical new code) directly in classifyPdf, not via a fabricated report.
  const fakePdf = join(tmpdir(), `classifypdf-hermetic-${process.pid}.pdf`);
  writeFileSync(fakePdf, "not a real pdf");
  try {
    const out = classifyPdf(fakePdf, {
      pageCount: () => ({ n: 3 }),
      // page 1 fails to render; pages 0,2 render fine
      render: (_pdf, png, page) => (page === 1 ? { ok: false, error: "render: exit=2" } : { ok: true }),
      // a stub classifier: page 0 is a confident BOM (skip), page 2 is a drawing (extract)
      classify: (_png) => (_png.includes("-2-")
        ? { png: _png, verdict: "extract", confident_skip: false, classification: { page_kind: "drawing", confidence: 0.9 }, ms: 5 }
        : { png: _png, verdict: "skip", confident_skip: true, classification: { page_kind: "bom", confidence: 0.95 }, ms: 5 }),
      keep: false,
    });
    assert.equal(out.error, undefined, "no top-level error");
    assert.equal(out.page_count, 3);
    assert.equal(out.pages.length, 3);
    // page 0 → skip (bom), page 1 → render-fail EXTRACT+error, page 2 → extract (drawing)
    assert.equal(out.pages[0].verdict, "skip");
    assert.equal(out.pages[1].verdict, "extract", "render failure NEVER skips");
    assert.ok(out.pages[1].error && out.pages[1].error.includes("render"), "render error surfaced");
    assert.equal(out.pages[1].classification, null);
    assert.equal(out.pages[2].verdict, "extract");
    // every page is tagged with its index + pdf basename
    assert.deepEqual(out.pages.map((p) => p.page), [0, 1, 2]);
    assert.ok(out.pages.every((p) => p.pdf && p.pdf.endsWith(".pdf")));
    // the report derived from these pages routes the render-failed page into extract_pages
    const rpt = buildClassificationReport(out.pages);
    assert.deepEqual(rpt.extract_pages, [1, 2], "render-failed page 1 + drawing page 2 both extract");
    assert.deepEqual(rpt.skip_pages, [0]);
  } finally {
    try { unlinkSync(fakePdf); } catch { /* ignore */ }
  }
});

test("classifyPdf honors maxPages and surfaces an injected page-count error", () => {
  const fakePdf = join(tmpdir(), `classifypdf-maxpages-${process.pid}.pdf`);
  writeFileSync(fakePdf, "x");
  try {
    const out = classifyPdf(fakePdf, {
      pageCount: () => ({ n: 10 }),
      render: () => ({ ok: true }),
      classify: () => ({ verdict: "extract", classification: { page_kind: "drawing", confidence: 0.8 }, ms: 1 }),
      maxPages: 2,
    });
    assert.equal(out.pages.length, 2, "maxPages clamps the loop");
    const err = classifyPdf(fakePdf, { pageCount: () => ({ error: "bad page count: x" }) });
    assert.ok(err.error.includes("page count"));
    assert.deepEqual(err.pages, []);
  } finally {
    try { unlinkSync(fakePdf); } catch { /* ignore */ }
  }
});

test("report extract_pages / skip_pages list page indices (the PDF-mode filtered worklist)", () => {
  // simulate classifyPdf page results (each carries a .page index)
  const pages = [
    { png: "x#0", page: 0, verdict: "skip", confident_skip: true, classification: { page_kind: "cover", confidence: 0.92 }, ms: 2000 },
    { png: "x#1", page: 1, verdict: "extract", classification: { page_kind: "drawing", confidence: 0.9 }, ms: 2100 },
    { png: "x#2", page: 2, verdict: "extract", classification: null, ms: 0, error: "render: exit=2" },
    { png: "x#3", page: 3, verdict: "skip", confident_skip: true, classification: { page_kind: "bom", confidence: 0.95 }, ms: 1900 },
  ];
  const rpt = buildClassificationReport(pages);
  assert.deepEqual(rpt.extract_pages, [1, 2], "drawing + the render-errored page both extract (error never skips)");
  assert.deepEqual(rpt.skip_pages, [0, 3], "confident cover + bom skip");
  assert.equal(rpt.cases[0].page, 0, "page index threads into cases");
  assert.equal(rpt.cases[2].verdict, "extract", "render error → extract");
  assert.equal(rpt.skip, 2);
  assert.equal(rpt.extract, 2);
});

test("non-page results (image/dir mode) yield empty extract_pages/skip_pages", () => {
  const rpt = buildClassificationReport([
    { png: "a.png", verdict: "skip", confident_skip: true, classification: { page_kind: "bom", confidence: 0.9 }, ms: 100 },
    { png: "b.png", verdict: "extract", classification: { page_kind: "drawing", confidence: 0.9 }, ms: 100 },
  ]);
  assert.deepEqual(rpt.extract_pages, [], "no .page on image/dir results");
  assert.deepEqual(rpt.skip_pages, []);
  assert.equal(rpt.cases[0].page, null);
});
