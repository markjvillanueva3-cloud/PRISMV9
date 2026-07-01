#!/usr/bin/env node
/**
 * generate-resource-pdf-features.test.mjs — pure-fn tests for the PDF augmentation generator.
 *
 * Run: node --test scripts/generate-resource-pdf-features.test.mjs
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  parseSpec, generate, readSpecsDir,
  PDF_ROOST_ID, PLANNED_PARENT, ROOST_LAYER, PDF_LAYER, MAX_LABEL, SCHEMA_VERSION,
} from "./generate-resource-pdf-features.mjs";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const SAMPLE = [
  "# AUTOGEN EXTRACT SPEC — sandvik_machining.pdf",
  "",
  "| Field | Value |",
  "|---|---|",
  "| PDF id | `sandvik_machining.pdf` |",
  "| Slug | `sandvik_machining_pdf` |",
  "| Kind | `machining-handbook` |",
  "| Source path | `H:/PRISM/resources/PDF/sandvik_machining.pdf` |",
  "| Size | 12.4 MB |",
].join("\n");

test("parseSpec extracts every table field", () => {
  const r = parseSpec("sandvik_machining_pdf", SAMPLE);
  assert.equal(r.slug, "sandvik_machining_pdf");
  assert.equal(r.pdfId, "sandvik_machining.pdf");
  assert.equal(r.kind, "machining-handbook");
  assert.equal(r.source, "H:/PRISM/resources/PDF/sandvik_machining.pdf");
  assert.equal(r.sizeMb, 12.4);
});

test("parseSpec falls back to slug when pdfId missing", () => {
  const body = "| Field | Value |\n|---|---|\n| Kind | `other-pdf` |";
  const r = parseSpec("orphan-slug", body);
  assert.equal(r.pdfId, "orphan-slug");
  assert.equal(r.kind, "other-pdf");
});

test("parseSpec returns other-pdf default for missing kind", () => {
  const r = parseSpec("x", "no table");
  assert.equal(r.kind, "other-pdf");
  assert.equal(r.sizeMb, 0);
});

test("generate emits roost + one child per entry", () => {
  const entries = [
    { slug: "a", pdfId: "a.pdf", kind: "machining-handbook", source: "/a", sizeMb: 1 },
    { slug: "b", pdfId: "b.pdf", kind: "resource-catalog", source: "/b", sizeMb: 2 },
  ];
  const { newNodes, stats } = generate(entries);
  assert.equal(newNodes.length, 3);
  assert.equal(newNodes[0].id, PDF_ROOST_ID);
  assert.equal(newNodes[0].parent, PLANNED_PARENT);
  assert.equal(newNodes[0].layer, ROOST_LAYER);
  assert.equal(stats.roostEmitted, 1);
  assert.equal(stats.childrenEmitted, 2);
  for (const n of newNodes.slice(1)) {
    assert.equal(n.parent, PDF_ROOST_ID);
    assert.equal(n.layer, PDF_LAYER);
    assert.equal(n.kind, "resource-pdf");
    assert.ok(n.id.startsWith("pdf-extract."));
  }
});

test("generate is empty when all ids already exist", () => {
  const entries = [{ slug: "a", pdfId: "a.pdf", kind: "other-pdf", source: "/a", sizeMb: 1 }];
  const existing = new Set([PDF_ROOST_ID, "pdf-extract.a"]);
  const { newNodes, stats } = generate(entries, existing);
  assert.equal(newNodes.length, 0);
  assert.equal(stats.roostEmitted, 0);
  assert.equal(stats.childrenEmitted, 0);
  assert.equal(stats.childrenSkipped, 1);
});

test("generate handles empty entries array", () => {
  const { newNodes, stats } = generate([]);
  assert.equal(newNodes.length, 1);
  assert.equal(stats.total, 0);
  assert.equal(stats.childrenEmitted, 0);
});

test("generate caps label at MAX_LABEL", () => {
  const longId = "X".repeat(200) + ".pdf";
  const entries = [{ slug: "x", pdfId: longId, kind: "other-pdf", source: "/x", sizeMb: 1 }];
  const { newNodes } = generate(entries);
  const child = newNodes.find((n) => n.kind === "resource-pdf");
  assert.ok(child.label.length <= MAX_LABEL);
});

test("generate is deterministic — same input same output", () => {
  const entries = [{ slug: "a", pdfId: "a.pdf", kind: "other-pdf", source: "/a", sizeMb: 1 }];
  const r1 = generate(entries);
  const r2 = generate(entries);
  assert.deepEqual(r1.newNodes, r2.newNodes);
});

test("generate roost info names the count", () => {
  const entries = Array.from({ length: 42 }, (_, i) => ({ slug: "s" + i, pdfId: "s" + i + ".pdf", kind: "other-pdf", source: "/s" + i, sizeMb: 1 }));
  const { newNodes } = generate(entries);
  const roost = newNodes.find((n) => n.id === PDF_ROOST_ID);
  assert.ok(roost.info.includes("42"));
});

test("readSpecsDir returns [] when dir missing", () => {
  const r = readSpecsDir(path.join(os.tmpdir(), "non-existent-" + Date.now()));
  assert.deepEqual(r, []);
});

test("readSpecsDir parses written files in sorted order", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rpdfs-test-"));
  try {
    fs.writeFileSync(path.join(tmp, "AUTOGEN-EXTRACT-SPEC-b.md"), SAMPLE);
    fs.writeFileSync(path.join(tmp, "AUTOGEN-EXTRACT-SPEC-a.md"), SAMPLE.replaceAll("sandvik_machining.pdf", "alphagen.pdf"));
    fs.writeFileSync(path.join(tmp, "NOT-A-SPEC.md"), "should be skipped");
    const r = readSpecsDir(tmp);
    assert.equal(r.length, 2);
    assert.equal(r[0].slug, "a");
    assert.equal(r[1].slug, "b");
    assert.equal(r[0].pdfId, "alphagen.pdf");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("SCHEMA_VERSION is semver-like", () => {
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
});
