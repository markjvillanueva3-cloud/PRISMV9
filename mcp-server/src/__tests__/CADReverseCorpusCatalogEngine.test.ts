/**
 * CADReverseCorpusCatalogEngine — vitest suite (CAD-REVERSE-ENGINEER-MS0/U3).
 *
 * Closed-form assertions on corpus catalog assembly: per-file entries,
 * name-keyed dedup + occurrence counting, byCategory grouping, malformed
 * tree skipping, incremental mergeCatalogs, R12 fail-loud.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADReverseCorpusCatalogEngine,
  cadReverseCorpusCatalogEngine,
} from "../engines/CADReverseCorpusCatalogEngine.js";
import type { CanonicalFeatureTree, CanonicalFeature } from "../engines/GroundTruthFeatureTreeExtractor.js";

const feat = (
  id: string,
  type: CanonicalFeature["type"],
  extra: Partial<CanonicalFeature> = {},
): CanonicalFeature => ({ id, type, name: `${type}-${id}`, ...extra });

const tree = (
  sourceFile: string,
  features: CanonicalFeature[],
  sourceFormat = "FCStd",
): CanonicalFeatureTree => ({
  schemaVersion: "1.0.0",
  sourceFile,
  sourceFormat: sourceFormat as CanonicalFeatureTree["sourceFormat"],
  features,
  coverage: 1,
  signature: "0".repeat(64),
  warnings: [],
});

// A flange: sketch + extrude + hole + circular pattern.
const flangeTree = (file: string): CanonicalFeatureTree =>
  tree(file, [
    feat("1", "Sketch"),
    feat("2", "Extrude", { parameters: { length: 12 } }),
    feat("3", "Hole", { parameters: { diameter: 8 } }),
    feat("4", "Pattern", { sourceType: "circular" }),
  ]);

// A turned part: sketch + revolve.
const turnedTree = (file: string): CanonicalFeatureTree =>
  tree(file, [feat("1", "Sketch"), feat("2", "Revolve", { parameters: { angle: 360 } })]);

describe("CADReverseCorpusCatalogEngine — U3", () => {
  let eng: CADReverseCorpusCatalogEngine;
  beforeEach(() => {
    eng = new CADReverseCorpusCatalogEngine();
  });

  // ── R12 fail-loud ─────────────────────────────────────────────────────────

  it("R12 fail-loud: non-array input throws TypeError", () => {
    expect(() => eng.buildCatalog(null as never)).toThrow(TypeError);
    expect(() => eng.buildCatalog("nope" as never)).toThrow(TypeError);
    expect(() => eng.mergeCatalogs(null as never, null as never)).toThrow(TypeError);
  });

  // ── Empty corpus ──────────────────────────────────────────────────────────

  it("empty corpus → empty catalog with stable shape", () => {
    const cat = eng.buildCatalog([]);
    expect(cat.entries).toHaveLength(0);
    expect(cat.templates).toHaveLength(0);
    expect(cat.totalParts).toBe(0);
    expect(cat.uniqueTemplates).toBe(0);
    expect(cat.byCategory).toEqual({});
    expect(cat.skippedFiles).toHaveLength(0);
  });

  // ── Per-file entries ──────────────────────────────────────────────────────

  it("one entry per source file with name/category/sourceFile/counts", () => {
    const cat = eng.buildCatalog([flangeTree("a.FCStd"), turnedTree("b.FCStd")]);
    expect(cat.entries).toHaveLength(2);
    expect(cat.totalParts).toBe(2);
    const a = cat.entries.find((e) => e.sourceFile === "a.FCStd")!;
    expect(a.category).toBe("flange");
    expect(a.opCount).toBe(4);
    expect(a.paramCount).toBe(2); // length + diameter
    expect(a.confidence).toBeGreaterThan(0);
    const b = cat.entries.find((e) => e.sourceFile === "b.FCStd")!;
    expect(b.category).toBe("turned_part");
    expect(b.opCount).toBe(2);
  });

  // ── Dedup by template name ────────────────────────────────────────────────

  it("identical parts collapse to one template, occurrence-counted", () => {
    // 3 structurally identical flanges → 3 entries, 1 unique template.
    const cat = eng.buildCatalog([
      flangeTree("f1.FCStd"), flangeTree("f2.FCStd"), flangeTree("f3.FCStd"),
    ]);
    expect(cat.entries).toHaveLength(3);
    expect(cat.uniqueTemplates).toBe(1);
    expect(cat.templates).toHaveLength(1);
    expect(cat.templates[0].occurrences).toBe(3);
    expect(cat.templates[0].sourceFiles.sort()).toEqual(["f1.FCStd", "f2.FCStd", "f3.FCStd"]);
  });

  it("distinct part shapes yield distinct templates", () => {
    const cat = eng.buildCatalog([
      flangeTree("f.FCStd"), turnedTree("t.FCStd"),
    ]);
    expect(cat.uniqueTemplates).toBe(2);
    expect(cat.templates.map((t) => t.template.category).sort()).toEqual(["flange", "turned_part"]);
  });

  // ── byCategory + categoryCounts ───────────────────────────────────────────

  it("byCategory groups unique template names; categoryCounts counts files", () => {
    const cat = eng.buildCatalog([
      flangeTree("f1.FCStd"), flangeTree("f2.FCStd"), turnedTree("t1.FCStd"),
    ]);
    // 2 flange files → 1 unique flange template; 1 turned file → 1 template
    expect(cat.byCategory["flange"]).toHaveLength(1);
    expect(cat.byCategory["turned_part"]).toHaveLength(1);
    expect(cat.categoryCounts["flange"]).toBe(2);   // file count
    expect(cat.categoryCounts["turned_part"]).toBe(1);
  });

  it("byCategory name lists are sorted + de-duplicated", () => {
    // Two different flange shapes (different op count) → 2 names under flange.
    const flange2 = tree("g.FCStd", [
      feat("1", "Sketch"), feat("2", "Extrude", { parameters: { length: 5 } }),
      feat("3", "Hole"), feat("4", "Pattern", { sourceType: "polar" }),
      feat("5", "Chamfer"),
    ]);
    const cat = eng.buildCatalog([flangeTree("f.FCStd"), flange2]);
    const names = cat.byCategory["flange"];
    expect(names.length).toBe(2);
    expect([...names].sort()).toEqual(names); // already sorted
  });

  // ── Skipped files ─────────────────────────────────────────────────────────

  it("malformed tree (no features array) → recorded in skippedFiles, others survive", () => {
    const cat = eng.buildCatalog([
      flangeTree("good.FCStd"),
      { sourceFile: "bad.FCStd", sourceFormat: "FCStd" } as never,
    ]);
    expect(cat.entries).toHaveLength(1);
    expect(cat.skippedFiles).toHaveLength(1);
    expect(cat.skippedFiles[0].sourceFile).toBe("bad.FCStd");
  });

  // ── mergeCatalogs ─────────────────────────────────────────────────────────

  it("mergeCatalogs folds two chunk catalogs, summing occurrences of shared templates", () => {
    const chunk1 = eng.buildCatalog([flangeTree("f1.FCStd"), flangeTree("f2.FCStd")]);
    const chunk2 = eng.buildCatalog([flangeTree("f3.FCStd"), turnedTree("t1.FCStd")]);
    const merged = eng.mergeCatalogs(chunk1, chunk2);
    expect(merged.totalParts).toBe(4);
    expect(merged.uniqueTemplates).toBe(2); // flange (×3) + turned (×1)
    const flange = merged.templates.find((t) => t.template.category === "flange")!;
    expect(flange.occurrences).toBe(3);
    expect(flange.sourceFiles.sort()).toEqual(["f1.FCStd", "f2.FCStd", "f3.FCStd"]);
    expect(merged.categoryCounts["flange"]).toBe(3);
    expect(merged.categoryCounts["turned_part"]).toBe(1);
  });

  it("mergeCatalogs concatenates skippedFiles from both chunks", () => {
    const c1 = eng.buildCatalog([flangeTree("a.FCStd"), { sourceFile: "x" } as never]);
    const c2 = eng.buildCatalog([{ sourceFile: "y" } as never]);
    const merged = eng.mergeCatalogs(c1, c2);
    expect(merged.skippedFiles).toHaveLength(2);
  });

  // ── STEP single-body corpus ───────────────────────────────────────────────

  it("STEP single-Body files catalog as assembly_body templates", () => {
    const stepA = tree("p1.step", [feat("1", "Body")], "step");
    const stepB = tree("p2.step", [feat("1", "Body")], "step");
    const cat = eng.buildCatalog([stepA, stepB]);
    expect(cat.entries.every((e) => e.category === "assembly_body")).toBe(true);
    // Both are single boolean_union → identical template → dedup to 1.
    expect(cat.uniqueTemplates).toBe(1);
    expect(cat.templates[0].occurrences).toBe(2);
  });

  // ── Stats ─────────────────────────────────────────────────────────────────

  it("getStats tracks catalogs built, files processed, templates emitted", () => {
    eng.buildCatalog([flangeTree("a.FCStd"), turnedTree("b.FCStd")]);
    eng.buildCatalog([flangeTree("c.FCStd")]);
    const s = eng.getStats();
    expect(s.totalCatalogsBuilt).toBe(2);
    expect(s.totalFilesProcessed).toBe(3);
    expect(s.totalTemplatesEmitted).toBe(3); // 2 from run1 + 1 from run2
  });

  it("_resetForTests zeroes all counters", () => {
    eng.buildCatalog([flangeTree("a.FCStd")]);
    eng._resetForTests();
    const s = eng.getStats();
    expect(s.totalCatalogsBuilt).toBe(0);
    expect(s.totalFilesProcessed).toBe(0);
    expect(s.totalTemplatesEmitted).toBe(0);
  });

  it("singleton export is usable independent of fresh instances", () => {
    cadReverseCorpusCatalogEngine._resetForTests();
    const cat = cadReverseCorpusCatalogEngine.buildCatalog([turnedTree("z.FCStd")]);
    expect(cat.uniqueTemplates).toBe(1);
    expect(eng.getStats().totalCatalogsBuilt).toBe(0);
    cadReverseCorpusCatalogEngine._resetForTests();
  });

  it("template in catalog is round-trip lossless (opTemplate redraws the part)", () => {
    const cat = eng.buildCatalog([flangeTree("rt.FCStd")]);
    const t = cat.templates[0].template;
    // opTemplate is a valid CADOperation[] — feeds cad_draw_any_part.
    expect(t.opTemplate).toHaveLength(4);
    expect(t.opTemplate[0].kind).toBe("sketch_create");
    expect(t.opTemplate[3].kind).toBe("feature_pattern_circular");
  });
});
