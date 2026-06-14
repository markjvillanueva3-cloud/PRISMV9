#!/usr/bin/env node
/**
 * generate-pdf-course-bridge-features.test.mjs — pure-fn tests for bridge generator.
 *
 * Run: node --test scripts/generate-pdf-course-bridge-features.test.mjs
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  parseKind, generate, readSpecsDirKinds,
  PDF_KIND_TO_ENGINES, COURSE_KIND_TO_ENGINES, SCHEMA_VERSION,
} from "./generate-pdf-course-bridge-features.mjs";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

test("parseKind extracts kind from spec body", () => {
  const body = "| Field | Value |\n|---|---|\n| Kind | `machining-handbook` |\n";
  assert.equal(parseKind(body), "machining-handbook");
});

test("parseKind defaults to other-pdf when missing", () => {
  assert.equal(parseKind("no table"), "other-pdf");
  assert.equal(parseKind(""), "other-pdf");
});

test("parseKind handles unbacktick'd kind value", () => {
  const body = "| Kind | manual-pdf |";
  assert.equal(parseKind(body), "manual-pdf");
});

test("generate emits 4 typed edge classes per source", () => {
  const pdfEntries = [
    { slug: "a", kind: "machining-handbook" },
    { slug: "b", kind: "resource-catalog" },
  ];
  const courseEntries = [
    { slug: "c", kind: "mit-ocw" },
  ];
  const { newEdges, stats } = generate({ pdfEntries, courseEntries });
  assert.equal(stats.pdfSources, 2);
  assert.equal(stats.courseSources, 1);
  const types = new Set(newEdges.map(e => e.type));
  assert.ok(types.has("bridge-to-engine"));
  assert.ok(types.has("enriches-engine"));
  assert.ok(types.has("feeds-dispatcher"));
  assert.ok(types.has("feeds-training"));
  assert.ok(newEdges.find(e => e.source === "pdf-extract.a" && e.target === "engine.KienzleForceModelEngine" && e.type === "bridge-to-engine"));
  assert.ok(newEdges.find(e => e.source === "college.course.c" && e.target === "engine.MITCourseKnowledgeEngine" && e.type === "bridge-to-engine"));
  assert.ok(stats.byType["bridge-to-engine"] >= 6);
  assert.ok(stats.byType["feeds-training"] >= 3);
});

test("generate is deterministic — same input same output", () => {
  const pdfEntries = [{ slug: "x", kind: "manual-pdf" }];
  const r1 = generate({ pdfEntries, courseEntries: [] });
  const r2 = generate({ pdfEntries, courseEntries: [] });
  assert.deepEqual(r1.newEdges, r2.newEdges);
});

test("generate de-duplicates edges from same source within a type", () => {
  // Pass duplicate targets — same source+target+type collapses
  const pdfEntries = [{ slug: "a", kind: "test-kind" }];
  const pdfMap = { "test-kind": ["engine.X", "engine.X", "engine.Y"] };
  const { newEdges } = generate({ pdfEntries, courseEntries: [], pdfMap });
  // bridge-to-engine: X, Y (X dedup'd) + feeds-training: 2 catch-all → 4 total
  const bridgeEdges = newEdges.filter(e => e.type === "bridge-to-engine");
  assert.equal(bridgeEdges.length, 2);
});

test("generate handles empty inputs", () => {
  const { newEdges, stats } = generate({ pdfEntries: [], courseEntries: [] });
  assert.equal(newEdges.length, 0);
  assert.equal(stats.totalEdges, 0);
});

test("generate falls back to other-pdf for unknown PDF kind", () => {
  const pdfEntries = [{ slug: "z", kind: "totally-unknown-kind" }];
  const { newEdges } = generate({ pdfEntries, courseEntries: [] });
  // bridge-to-engine: 1 (other-pdf fallback) + feeds-training: 2 catch-all → 3
  const bridgeEdges = newEdges.filter(e => e.type === "bridge-to-engine");
  assert.equal(bridgeEdges.length, PDF_KIND_TO_ENGINES["other-pdf"].length);
  assert.ok(newEdges.every(e => e.source === "pdf-extract.z"));
  assert.ok(newEdges.some(e => e.type === "feeds-training"));
});

test("generate emits ONLY feeds-training edges for unknown course kind (no engine fallback)", () => {
  const courseEntries = [{ slug: "z", kind: "totally-unknown" }];
  const { newEdges } = generate({ pdfEntries: [], courseEntries });
  // No bridge-to-engine / enriches-engine / feeds-dispatcher entries, but feeds-training always wires
  const bridgeEdges = newEdges.filter(e => e.type === "bridge-to-engine");
  assert.equal(bridgeEdges.length, 0);
  const trainingEdges = newEdges.filter(e => e.type === "feeds-training");
  assert.ok(trainingEdges.length >= 2);
});

test("generate stats.byKind counts every input kind", () => {
  const pdfEntries = [
    { slug: "a", kind: "machining-handbook" },
    { slug: "b", kind: "machining-handbook" },
    { slug: "c", kind: "resource-catalog" },
  ];
  const courseEntries = [{ slug: "d", kind: "mit-ocw" }];
  const { stats } = generate({ pdfEntries, courseEntries });
  assert.equal(stats.byKind["machining-handbook"], 2);
  assert.equal(stats.byKind["resource-catalog"], 1);
  assert.equal(stats.byKind["mit-ocw"], 1);
});

test("readSpecsDirKinds returns [] when dir missing", () => {
  const r = readSpecsDirKinds(path.join(os.tmpdir(), "nope-" + Date.now()), /test/);
  assert.deepEqual(r, []);
});

test("readSpecsDirKinds parses written files in sorted order", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bridge-test-"));
  try {
    fs.writeFileSync(path.join(tmp, "AUTOGEN-EXTRACT-SPEC-b.md"), "| Kind | `manual-pdf` |");
    fs.writeFileSync(path.join(tmp, "AUTOGEN-EXTRACT-SPEC-a.md"), "| Kind | `machining-handbook` |");
    fs.writeFileSync(path.join(tmp, "NOT-A-SPEC.md"), "skipped");
    const r = readSpecsDirKinds(tmp, /^AUTOGEN-EXTRACT-SPEC-(.+)\.md$/);
    assert.equal(r.length, 2);
    assert.equal(r[0].slug, "a");
    assert.equal(r[0].kind, "machining-handbook");
    assert.equal(r[1].kind, "manual-pdf");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("SCHEMA_VERSION is semver-like", () => {
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
});

test("PDF_KIND_TO_ENGINES covers all 5 PDF kinds", () => {
  for (const k of ["machining-handbook", "resource-catalog", "manual-pdf", "blueprint-pdf", "other-pdf"]) {
    assert.ok(Array.isArray(PDF_KIND_TO_ENGINES[k]) && PDF_KIND_TO_ENGINES[k].length > 0, "missing kind: " + k);
  }
});

test("COURSE_KIND_TO_ENGINES covers all 6 course kinds", () => {
  for (const k of ["mit-ocw", "basic-training", "knowledge-pack", "handbook-pdfs", "prism-training", "prism-personal"]) {
    assert.ok(Array.isArray(COURSE_KIND_TO_ENGINES[k]) && COURSE_KIND_TO_ENGINES[k].length > 0, "missing kind: " + k);
  }
});

test("generate emits all 4 typed-edge classes for a fully-classified PDF", () => {
  const pdfEntries = [{ slug: "a", kind: "machining-handbook" }];
  const { newEdges, stats } = generate({ pdfEntries, courseEntries: [] });
  // machining-handbook: 4 bridge + 4 enriches + 2 dispatcher + 2 training = 12
  assert.equal(stats.byType["bridge-to-engine"], 4);
  assert.equal(stats.byType["enriches-engine"], 4);
  assert.equal(stats.byType["feeds-dispatcher"], 2);
  assert.equal(stats.byType["feeds-training"], 2);
  assert.equal(newEdges.length, 12);
});

test("generate emits enriches-engine edges that name nodes IMPROVED with new data", () => {
  const pdfEntries = [{ slug: "h", kind: "machining-handbook" }];
  const { newEdges } = generate({ pdfEntries, courseEntries: [] });
  const enriches = newEdges.filter(e => e.type === "enriches-engine");
  assert.ok(enriches.some(e => e.target === "engine.MaterialRegistryEngine"));
  assert.ok(enriches.some(e => e.target === "engine.SurfaceFinishPredictorEngine"));
  assert.ok(enriches.some(e => e.target === "engine.ToolLifeEngine"));
  assert.ok(enriches.some(e => e.target === "engine.ChatterStabilityLobeEngine"));
});

test("generate emits feeds-dispatcher edges that resolve to canonical disp.* node ids (U-VIZ-G4-DEAD-EDGE)", () => {
  const pdfEntries = [{ slug: "c", kind: "resource-catalog" }];
  const { newEdges } = generate({ pdfEntries, courseEntries: [] });
  const dispatcherEdges = newEdges.filter(e => e.type === "feeds-dispatcher");
  assert.ok(dispatcherEdges.length >= 1);
  for (const e of dispatcherEdges) {
    // Regression guard: the OLD producer emitted dead `dispatcher.prism_*`
    // targets. Canonical merged-graph dispatcher nodes are `disp.<file-id>`.
    assert.ok(e.target.startsWith("disp."), "expected disp.* target, got " + e.target);
    assert.ok(!e.target.startsWith("dispatcher."), "must NOT emit legacy dispatcher.* prefix, got " + e.target);
  }
  // resource-catalog → prism_cam → the file-derived camdispatcher node.
  assert.ok(dispatcherEdges.some(e => e.target === "disp.camdispatcher"), "resource-catalog must resolve prism_cam → disp.camdispatcher");
});

test("machining-handbook resolves both its dispatchers to canonical disp.* ids", () => {
  const { newEdges } = generate({ pdfEntries: [{ slug: "m", kind: "machining-handbook" }], courseEntries: [] });
  const targets = newEdges.filter(e => e.type === "feeds-dispatcher").map(e => e.target).sort();
  assert.deepEqual(targets, ["disp.calcdispatcher", "disp.intelligencedispatcher"]);
});
