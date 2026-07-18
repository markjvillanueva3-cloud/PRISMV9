#!/usr/bin/env node
/**
 * extract-cadcam-tribal-wiki.test.mjs — pure-fn tests.
 * Run: node --test scripts/extract-cadcam-tribal-wiki.test.mjs
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  resolveBridgeTargets, entryToTribal, groupByKind, renderWikiIndex, SCHEMA_VERSION,
} from "./extract-cadcam-tribal-wiki.mjs";

const sampleCadPdf = {
  slug: "drawing_basics_pdf",
  id: "1- Basic Training Day 1/2D_Drawing.pdf",
  kind: "blueprint-pdf",
  source: "H:\\PRISM\\resources\\1- Basic Training Day 1\\2D_Drawing.pdf",
  source_type: "pdf",
  classification: { cad: true, cam: false },
};

const sampleCamPdf = {
  slug: "catalog_full",
  id: "MANUFACTURER_CATALOGS/uploaded/catalog.pdf",
  kind: "resource-catalog",
  source: "H:\\PRISM\\resources\\catalog.pdf",
  source_type: "pdf",
  classification: { cad: false, cam: true },
};

const sampleCourse = {
  slug: "mit_2_830",
  id: "courses/mit-2.830",
  kind: "mit-ocw",
  source: "H:\\PRISM\\courses\\mit-2.830",
  source_type: "course",
  classification: { cad: false, cam: true },
};

const sampleOtherPdf = {
  slug: "random_pdf",
  id: "random.pdf",
  kind: "totally-unknown-kind",
  source: "H:\\random.pdf",
  source_type: "pdf",
  classification: { cad: true, cam: false },
};

test("resolveBridgeTargets resolves PDF kind to engines + dispatchers", () => {
  const r = resolveBridgeTargets(sampleCadPdf);
  assert.ok(Array.isArray(r.bridge_engines));
  assert.ok(r.bridge_engines.length >= 2, "blueprint-pdf should bridge to at least 2 engines");
  assert.ok(r.bridge_engines.some(e => e.includes("Blueprint") || e.includes("CAD")));
  assert.ok(Array.isArray(r.bridge_dispatchers));
  // U-VIZ-G4-DEAD-EDGE (2026-05-30 sierra): the dispatcher tables now store bare
  // MCP tool names (`prism_cad`), not the malformed `dispatcher.prism_cad` (which
  // was a dead system-graph edge target). The tribal corpus uses the human/MCP
  // identifier scheme (parallel to its logical `engine.<ClassName>` engine refs),
  // so a tip's bridge_dispatchers are the invocable MCP tool names.
  assert.ok(r.bridge_dispatchers.some(d => d.startsWith("prism_")));
  assert.ok(!r.bridge_dispatchers.some(d => d.startsWith("dispatcher.")), "must not carry the dead dispatcher.* prefix");
});

test("resolveBridgeTargets resolves course kind via course map (not PDF map)", () => {
  const r = resolveBridgeTargets(sampleCourse);
  assert.ok(r.bridge_engines.some(e => e.includes("MIT") || e.includes("Course")));
});

test("resolveBridgeTargets falls back to other-pdf for unknown PDF kind", () => {
  const r = resolveBridgeTargets(sampleOtherPdf);
  assert.ok(r.bridge_engines.length >= 1, "should still resolve to other-pdf fallback engine");
});

test("resolveBridgeTargets returns empty enriches for kinds with no enrichment map", () => {
  const r = resolveBridgeTargets({ ...sampleOtherPdf, kind: "other-pdf" });
  assert.deepEqual(r.enriches_engines, []);
});

test("entryToTribal shapes a tribal jsonl line with required fields", () => {
  const ts = "2026-05-24T00:00:00.000Z";
  const t = entryToTribal(sampleCadPdf, "cad", ts);
  assert.equal(t.ts, ts);
  assert.equal(t.schemaVersion, SCHEMA_VERSION);
  assert.equal(t.domain, "cad");
  assert.equal(t.audience, "delta");
  assert.equal(t.slug, sampleCadPdf.slug);
  assert.equal(t.kind, sampleCadPdf.kind);
  assert.equal(t.source_type, "pdf");
  assert.ok(t.tip.length > 0);
  assert.ok(t.consume.spec_md.includes("AUTOGEN-EXTRACT-SPEC"));
  assert.ok(t.consume.spec_md.endsWith(`-${sampleCadPdf.slug}.md`));
  assert.ok(Array.isArray(t.consume.bridge_engines));
  assert.equal(t.must_human_verify, true);
  assert.equal(t.advisory, true);
});

test("entryToTribal audience routes cad→delta and cam→kilo", () => {
  const tCad = entryToTribal(sampleCadPdf, "cad", "t");
  const tCam = entryToTribal(sampleCamPdf, "cam", "t");
  assert.equal(tCad.audience, "delta");
  assert.equal(tCam.audience, "kilo");
});

test("entryToTribal course path uses AUTOGEN-SPEC (no EXTRACT prefix)", () => {
  const t = entryToTribal(sampleCourse, "cam", "t");
  assert.ok(t.consume.spec_md.includes("college-course-specs/AUTOGEN-SPEC-"));
  assert.ok(!t.consume.spec_md.includes("AUTOGEN-EXTRACT-SPEC"));
});

test("groupByKind groups + counts correctly", () => {
  const g = groupByKind([sampleCadPdf, sampleCamPdf, { ...sampleCadPdf, slug: "another" }]);
  assert.equal(Object.keys(g).length, 2);
  assert.equal(g["blueprint-pdf"].length, 2);
  assert.equal(g["resource-catalog"].length, 1);
});

test("groupByKind handles empty input", () => {
  const g = groupByKind([]);
  assert.deepEqual(g, {});
});

test("renderWikiIndex emits a domain-specific operator view", () => {
  const md = renderWikiIndex("cad", [sampleCadPdf, sampleCadPdf], "2026-05-24T00:00:00.000Z");
  assert.ok(md.startsWith("# CAD Corpus"), "should start with CAD Corpus heading");
  assert.ok(md.includes("**delta**"), "should name delta as consumer");
  assert.ok(md.includes("Total entries**: 2"));
  assert.ok(md.includes("blueprint-pdf (2)"));
  assert.ok(md.includes("Bridge engines"));
  assert.ok(md.includes("Ingest"));
});

test("renderWikiIndex routes cam→kilo and includes kam tribal corpus pointer", () => {
  const md = renderWikiIndex("cam", [sampleCamPdf], "t");
  assert.ok(md.includes("**kilo**"));
  assert.ok(md.includes("cam-tribal-corpus.jsonl"));
});

test("renderWikiIndex truncates long groups with a +N more pointer", () => {
  const fifty1 = Array.from({ length: 51 }, (_, i) => ({ ...sampleCadPdf, slug: `cad_${i}` }));
  const md = renderWikiIndex("cad", fifty1, "t");
  assert.ok(md.includes("+1 more"));
});

test("renderWikiIndex handles empty entry list without crashing", () => {
  const md = renderWikiIndex("cad", [], "t");
  assert.ok(md.includes("Total entries**: 0"));
});

test("entryToTribal mentions bridge counts in tip", () => {
  const t = entryToTribal(sampleCadPdf, "cad", "t");
  assert.match(t.tip, /\d+ engine\(s\)/);
  assert.match(t.tip, /\d+ dispatcher\(s\)/);
});

test("SCHEMA_VERSION is semver-like", () => {
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
});

test("entryToTribal preserves bridge_engines + enriches_engines + dispatchers from resolver", () => {
  const t = entryToTribal(sampleCadPdf, "cad", "t");
  const direct = resolveBridgeTargets(sampleCadPdf);
  assert.deepEqual(t.consume.bridge_engines, direct.bridge_engines);
  assert.deepEqual(t.consume.enriches_engines, direct.enriches_engines);
  assert.deepEqual(t.consume.bridge_dispatchers, direct.bridge_dispatchers);
});
