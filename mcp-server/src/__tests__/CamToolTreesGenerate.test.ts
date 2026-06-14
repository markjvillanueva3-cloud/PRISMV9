/**
 * CamToolTreesGenerate -- CATALOG-APP-WIRING-MS0/U-CAM-TOOL-TREES (slot:romeo).
 *
 * Verifies the pure partition core of the CAM tool-tree generator that replicates the Fusion
 * material->type->brand tree to Mastercam (.mcam-tools) + hyperMILL (.hmt). Real reference values:
 * a dropped tool LOSES catalog data; a slug COLLISION merges two distinct types/brands; a SILENT
 * per-leaf truncation hides coverage loss -- all must fail here.
 */
import { describe, it, expect } from "vitest";
import { buildToolLeaves } from "../../scripts/generate-jm-cam-tool-trees.js";
import { toolCatalogEngine } from "../engines/ToolCatalogEngine.js";
import { catalogCorpusLoaderEngine } from "../engines/CatalogCorpusLoaderEngine.js";

describe("buildToolLeaves (synthetic -- no drop, no silent merge, no silent truncation)", () => {
  it("files every tool in exactly one (type,brand) leaf; counts reconcile", () => {
    const tools = [
      { type: "endmill", manufacturer: "HAIMER" },
      { type: "endmill", manufacturer: "HAIMER" },
      { type: "endmill", manufacturer: "GUHRING" },
      { type: "drill", manufacturer: "GUHRING" },
    ];
    const { leaves } = buildToolLeaves(tools);
    const total = leaves.reduce((n, l) => n + l.tools.length, 0);
    expect(total).toBe(4);
    const endHaimer = leaves.find((l) => l.rawType === "endmill" && l.rawBrand === "HAIMER")!;
    expect(endHaimer.tools.length).toBe(2);
    // every (typeSlug/brandSlug) path is unique
    const paths = leaves.map((l) => `${l.typeSlug}/${l.brandSlug}`);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("reads alternate catalog field names (tool_type / vendor / brand)", () => {
    const { leaves } = buildToolLeaves([
      { tool_type: "face_mill", vendor: "SECO" },
      { type: "face_mill", brand: "SECO" },
    ]);
    // both resolve type=face_mill, brand=SECO -> SAME leaf (2 tools)
    const fm = leaves.find((l) => l.rawType === "face_mill" && l.rawBrand === "SECO")!;
    expect(fm.tools.length).toBe(2);
  });

  it("files a blank vendor under (unspecified) and a blank type under (unknown type) -- never dropped", () => {
    const { leaves } = buildToolLeaves([
      { type: "tap", manufacturer: "" },
      { manufacturer: "OSG" },
    ]);
    expect(leaves.find((l) => l.rawType === "tap" && l.rawBrand === "(unspecified)")!.tools.length).toBe(1);
    expect(leaves.find((l) => l.rawType === "(unknown type)" && l.rawBrand === "OSG")!.tools.length).toBe(1);
  });

  it("keeps two distinct brands that slug the same as SEPARATE leaves (no merge)", () => {
    const { leaves } = buildToolLeaves([
      { type: "drill", manufacturer: "YG-1" },
      { type: "drill", manufacturer: "YG 1" },
    ]);
    const slugs = leaves.filter((l) => l.rawType === "drill").map((l) => l.brandSlug).sort();
    expect(slugs).toEqual(["yg-1", "yg-1-2"]);
    expect(new Set(slugs).size).toBe(2);
  });

  it("caps a leaf at maxPerLeaf and REPORTS the trim (never silent truncation)", () => {
    const tools = Array.from({ length: 10 }, () => ({ type: "endmill", manufacturer: "HAIMER" }));
    const { leaves, droppedByLeaf } = buildToolLeaves(tools, 4);
    const leaf = leaves.find((l) => l.rawType === "endmill")!;
    expect(leaf.tools.length).toBe(4); // capped
    expect(droppedByLeaf[`${leaf.typeSlug}/${leaf.brandSlug}`]).toBe(6); // surplus reported
  });

  it("fail-soft on empty / null input -> no leaves", () => {
    expect(buildToolLeaves([]).leaves).toEqual([]);
    expect(buildToolLeaves(null as any).leaves).toEqual([]);
  });

  it("filesystem-safe slugs (no separators / traversal) on dirty type/brand", () => {
    const { leaves } = buildToolLeaves([{ type: "T-Slot / Cutter", manufacturer: "../etc" }]);
    for (const l of leaves) {
      expect(l.typeSlug).toMatch(/^[a-z0-9-]+$/);
      expect(l.brandSlug).toMatch(/^[a-z0-9-]+$/);
      expect(`${l.typeSlug}/${l.brandSlug}`).not.toMatch(/\.\./);
    }
  });
});

describe("buildToolLeaves (live PRISM tooling catalog)", () => {
  catalogCorpusLoaderEngine.ensureLoaded();
  const tools = toolCatalogEngine.search({ max_results: 1200 }) || [];

  it("sanity: the live catalog returns tools (else the assertions below are vacuous)", () => {
    expect(tools.length).toBeGreaterThan(0);
  });

  it("partitions the live catalog with no drop and unique, safe leaf paths", () => {
    const { leaves } = buildToolLeaves(tools);
    expect(leaves.length).toBeGreaterThan(0);
    const total = leaves.reduce((n, l) => n + l.tools.length, 0);
    // with the default per-leaf cap, total <= source; with a high cap it equals source
    const { leaves: uncapped } = buildToolLeaves(tools, 1_000_000);
    const uncappedTotal = uncapped.reduce((n, l) => n + l.tools.length, 0);
    expect(uncappedTotal).toBe(tools.length); // NO tool dropped when uncapped
    expect(total).toBeLessThanOrEqual(tools.length);
    const paths = leaves.map((l) => `${l.typeSlug}/${l.brandSlug}`);
    expect(new Set(paths).size).toBe(paths.length); // unique paths
    for (const l of leaves) {
      expect(l.typeSlug).toMatch(/^[a-z0-9-]+$/);
      expect(l.brandSlug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
