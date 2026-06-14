#!/usr/bin/env node
import { test } from "node:test";
import { strict as assert } from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  normalizePath, parseArgs, collectExtractedPaths, collectPendingEntries,
  heuristicTitle, entryToStubTip, SCHEMA_VERSION,
} from "./batch-pdf-extract.mjs";

test("normalizePath converts backslashes + uppercases drive", () => {
  assert.equal(normalizePath("h:\\foo\\bar"), "H:/foo/bar");
  assert.equal(normalizePath("H:/foo/bar"), "H:/foo/bar");
});

test("normalizePath handles empty/null", () => {
  assert.equal(normalizePath(""), "");
  assert.equal(normalizePath(null), "");
});

test("parseArgs --max parses int with floor 1", () => {
  assert.equal(parseArgs(["--max", "50"]).max, 50);
  assert.equal(parseArgs(["--max", "0"]).max, 1);
  assert.equal(parseArgs(["--max", "abc"]).max, 20);
  assert.equal(parseArgs([]).max, 20);
});

test("parseArgs --kind + --dry-run + --pages flags", () => {
  const r = parseArgs(["--kind", "manual-pdf", "--dry-run", "--pages", "10"]);
  assert.equal(r.kind, "manual-pdf");
  assert.equal(r.dryRun, true);
  assert.equal(r.pages, 10);
});

test("parseArgs --pages floor 1, ceil 50", () => {
  assert.equal(parseArgs(["--pages", "0"]).pages, 1);
  assert.equal(parseArgs(["--pages", "999"]).pages, 50);
});

test("collectExtractedPaths reads jsonl tip pdf_paths into normalized Set", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bpe-"));
  try {
    const tip = { id: "x", tip: "y", source: { pdf_path: "h:\\foo.pdf" } };
    fs.writeFileSync(path.join(tmp, "a.jsonl"), JSON.stringify(tip) + "\n");
    const s = collectExtractedPaths(tmp);
    assert.ok(s.has("H:/foo.pdf"));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test("collectExtractedPaths returns empty Set when dir missing", () => {
  const s = collectExtractedPaths(path.join(os.tmpdir(), "no-such-" + Date.now()));
  assert.equal(s.size, 0);
});

const corpus = {
  cad: [
    { slug: "a", source: "H:/a.pdf", source_type: "pdf", kind: "blueprint-pdf", classification: { cad: true, cam: false } },
    { slug: "b", source: "H:/b.pdf", source_type: "pdf", kind: "manual-pdf", classification: { cad: true, cam: false } },
  ],
  cam: [
    { slug: "b", source: "H:/b.pdf", source_type: "pdf", kind: "manual-pdf", classification: { cad: true, cam: true } }, // dup of a's slug
    { slug: "c", source: "H:/c.pdf", source_type: "pdf", kind: "resource-catalog", classification: { cad: false, cam: true } },
    { slug: "d", source: "courses/d", source_type: "course", kind: "mit-ocw", classification: { cad: false, cam: true } }, // skip non-PDF
  ],
};

test("collectPendingEntries skips non-PDFs + dedupes by slug + filters already-extracted", () => {
  const extracted = new Set(["H:/a.pdf"]);
  const r = collectPendingEntries(corpus, extracted);
  // a is extracted → skip; b appears twice (dedup); c included; d is course (skip)
  assert.equal(r.length, 2);
  assert.deepEqual(r.map(e => e.slug).sort(), ["b", "c"]);
});

test("collectPendingEntries --kind filters", () => {
  const r = collectPendingEntries(corpus, new Set(), "blueprint-pdf");
  assert.equal(r.length, 1);
  assert.equal(r[0].slug, "a");
});

test("collectPendingEntries handles empty/null corpus", () => {
  assert.equal(collectPendingEntries({}, new Set()).length, 0);
  assert.equal(collectPendingEntries(null, new Set()).length, 0);
});

test("heuristicTitle returns a meaningful first line, skipping copyright/page noise", () => {
  const text = "Page 1\nCopyright 2021\nMachining Handbook for Beginners\nIntroduction";
  assert.equal(heuristicTitle(text), "Machining Handbook for Beginners");
});

test("heuristicTitle handles empty", () => {
  assert.equal(heuristicTitle(""), "(unknown title)");
  assert.equal(heuristicTitle(null), "(unknown title)");
});

test("entryToStubTip flags batch-stub + low confidence + needs_curation", () => {
  const e = { slug: "x", source: "H:/x.pdf", kind: "blueprint-pdf", classification: { cad: true, cam: false } };
  const t = entryToStubTip(e, "My Title", "2026-05-25T00:00:00Z");
  assert.equal(t.id, "batch.x");
  assert.equal(t.confidence, 0.3);
  assert.equal(t.needs_curation, true);
  assert.equal(t.source.extraction_quality, "batch-stub");
  assert.equal(t.source.pdf_path, "H:/x.pdf");
  assert.ok(Array.isArray(t.bridge_engines));
  assert.ok(t.bridge_engines.length > 0);
  assert.deepEqual(t.audience, ["delta"]);
});

test("entryToStubTip audience routing for cam-only", () => {
  const e = { slug: "y", source: "H:/y.pdf", kind: "manual-pdf", classification: { cad: false, cam: true } };
  const t = entryToStubTip(e, "X", "t");
  assert.deepEqual(t.audience, ["kilo"]);
});

test("entryToStubTip audience routing for dual", () => {
  const e = { slug: "z", source: "H:/z.pdf", kind: "machining-handbook", classification: { cad: true, cam: true } };
  const t = entryToStubTip(e, "X", "t");
  assert.deepEqual(t.audience, ["delta", "kilo"]);
});

test("entryToStubTip falls back to other-pdf bridge for unknown kind", () => {
  const e = { slug: "u", source: "H:/u.pdf", kind: "totally-unknown", classification: { cad: false, cam: false } };
  const t = entryToStubTip(e, "X", "t");
  assert.ok(t.bridge_engines.length > 0);
  assert.equal(t.bridge_engines[0], "engine.PdfGenericExtractorEngine");
});

test("SCHEMA_VERSION is semver-like", () => {
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
});

test("stub tips are JSON-round-trip stable", () => {
  const e = { slug: "x", source: "H:/x.pdf", kind: "blueprint-pdf", classification: { cad: true, cam: false } };
  const t = entryToStubTip(e, "title", "t");
  assert.deepEqual(JSON.parse(JSON.stringify(t)), t);
});
