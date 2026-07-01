/**
 * UniversalCADIndexEngine registry query surface (cad_registry_* actions).
 * The prism_cad cad_registry_scan/search/get/stats actions called scan/get/
 * search/stats on this engine, but those methods were never implemented (a dark
 * capability that threw "is not a function" at runtime). These tests pin the
 * real query behavior over a persisted MasterIndex, injected via the engine's
 * constructor indexer seam (no disk / no real scan).
 */
import { describe, it, expect } from "vitest";
import { UniversalCADIndexEngine } from "../engines/UniversalCADIndexEngine.js";
import type { MasterIndex } from "../schemas/cadFileIndexSchema.js";

const FIXTURE = {
  schemaVersion: 1,
  generatedAt: "2026-06-24T00:00:00Z",
  rootPaths: ["H:/cad"],
  totalFiles: 3,
  byFormat: { ".step": 2, ".dxf": 1 },
  byMachineCategory: { mill: 3 },
  byCustomer: { ACME: 2, SEMBLEX: 1 },
  files: [
    { fileId: "a".repeat(64), absolutePath: "H:/cad/part-a.step", format: ".step", sizeBytes: 100, customer: "ACME", machineCategory: "mill", complexityHint: "simple", lastModified: "2026-06-01" },
    { fileId: "b".repeat(64), absolutePath: "H:/cad/part-b.step", format: ".step", sizeBytes: 200, customer: "ACME", machineCategory: "mill", complexityHint: "simple", lastModified: "2026-06-01" },
    { fileId: "c".repeat(64), absolutePath: "H:/cad/widget.dxf", format: ".dxf", sizeBytes: 50, customer: "SEMBLEX", machineCategory: "mill", complexityHint: "simple", lastModified: "2026-06-01" },
  ],
} as unknown as MasterIndex;

/** Build an engine whose injected indexer returns `index` from load()/index(). */
function engineWith(index: MasterIndex | null) {
  const stubIndexer: any = {
    load: () => index,
    index: async () => index ?? ({ totalFiles: 0, byFormat: {} } as unknown as MasterIndex),
    events: { on() {}, emit() {} },
  };
  return new UniversalCADIndexEngine(stubIndexer);
}

describe("UniversalCADIndexEngine.get (cad_registry_get)", () => {
  it("returns the entry for an indexed absolute path", () => {
    const e = engineWith(FIXTURE).get("H:/cad/part-a.step");
    expect(e?.customer).toBe("ACME");
    expect(e?.format).toBe(".step");
  });
  it("returns null for a path not in the registry", () => {
    expect(engineWith(FIXTURE).get("H:/cad/missing.iges")).toBeNull();
  });
  it("returns null when no index is persisted", () => {
    expect(engineWith(null).get("H:/cad/part-a.step")).toBeNull();
  });
  it("returns null for an empty path", () => {
    expect(engineWith(FIXTURE).get("")).toBeNull();
  });
});

describe("UniversalCADIndexEngine.search (cad_registry_search)", () => {
  it("filters by customer (exact, case-insensitive)", () => {
    const r = engineWith(FIXTURE).search({ customer: "acme" });
    expect(r.total).toBe(2);
    expect(r.results.map((f) => f.absolutePath).sort()).toEqual([
      "H:/cad/part-a.step",
      "H:/cad/part-b.step",
    ]);
  });
  it("filters by format", () => {
    const r = engineWith(FIXTURE).search({ format: ".dxf" });
    expect(r.total).toBe(1);
    expect(r.results[0].customer).toBe("SEMBLEX");
  });
  it("free-text matches the absolute path substring", () => {
    const r = engineWith(FIXTURE).search({ query: "widget" });
    expect(r.total).toBe(1);
    expect(r.results[0].format).toBe(".dxf");
  });
  it("caps results at limit but reports the full total", () => {
    const r = engineWith(FIXTURE).search({ limit: 1 });
    expect(r.results).toHaveLength(1);
    expect(r.total).toBe(3);
  });
  it("a zero or negative limit yields no results but an honest total (guard)", () => {
    for (const limit of [0, -1]) {
      const r = engineWith(FIXTURE).search({ limit });
      expect(r.results).toHaveLength(0);
      expect(r.total).toBe(3);
    }
  });
  it("combines filters with AND (customer AND format -> no match)", () => {
    expect(engineWith(FIXTURE).search({ customer: "ACME", format: ".dxf" }).total).toBe(0);
  });
  it("no criteria returns all (capped at default 50)", () => {
    const r = engineWith(FIXTURE).search({});
    expect(r.total).toBe(3);
    expect(r.results).toHaveLength(3);
  });
  it("fail-soft to empty when no index is persisted", () => {
    expect(engineWith(null).search({ query: "x" })).toEqual({ results: [], total: 0 });
  });
});

describe("UniversalCADIndexEngine.stats (cad_registry_stats)", () => {
  it("summarizes the persisted index", () => {
    const s = engineWith(FIXTURE).stats();
    expect(s.totalFiles).toBe(3);
    expect(s.byCustomer).toEqual({ ACME: 2, SEMBLEX: 1 });
    expect(s.byFormat[".step"]).toBe(2);
    expect(s.coveragePct).toBeGreaterThan(0);
  });
  it("fail-soft to zeros when no index is persisted", () => {
    const s = engineWith(null).stats();
    expect(s.totalFiles).toBe(0);
    expect(s.byFormat).toEqual({});
    expect(s.coveragePct).toBe(0);
  });
});

describe("UniversalCADIndexEngine.scan (cad_registry_scan)", () => {
  it("delegates to index() and returns the coverage-wrapped result", async () => {
    const res = await engineWith(FIXTURE).scan(["H:/cad"], {});
    expect(res.source).toBe("UniversalCADIndexEngine");
    expect(res.index.totalFiles).toBe(3);
    expect(res.coverage.coveragePct).toBeGreaterThan(0);
  });
});
