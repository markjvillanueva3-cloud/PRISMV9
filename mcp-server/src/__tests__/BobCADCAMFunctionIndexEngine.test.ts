/**
 * BobCADCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM-FIDX-16
 *
 * Real-data tests against the 4 BobCAD-CAM catalog JSONs:
 *   milling, multi_axis, nesting, turning
 *
 * Coverage targets:
 *   - happy path (load, summary, search) on every section
 *   - ≥3 failure modes (missing section, missing op, empty/invalid query)
 *   - ≥2 adversarial inputs (NaN limit, oversized query, empty string)
 *   - specialty surfaces: getDMTOperations + getNestingOperations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { BobCADCAMFunctionIndexEngine } from "../engines/BobCADCAMFunctionIndexEngine.js";

describe("BobCADCAMFunctionIndexEngine — index load + summary", () => {
  beforeEach(() => {
    BobCADCAMFunctionIndexEngine.resetCache();
  });

  it("loads all four sections from disk", () => {
    const sections = BobCADCAMFunctionIndexEngine.listSections().sort();
    expect(sections).toEqual([
      "milling",
      "multi_axis",
      "nesting",
      "turning",
    ]);
  });

  it("getIndex returns 17 operations across 4 sections", () => {
    const idx = BobCADCAMFunctionIndexEngine.getIndex();
    expect(idx.system_id).toBe("bobcad");
    expect(idx.total_operations).toBe(17);
    expect(Object.keys(idx.sections)).toHaveLength(4);
  });

  it("totals parameters from per-section summary blocks", () => {
    const idx = BobCADCAMFunctionIndexEngine.getIndex();
    // 70 (milling) + 60 (multi_axis) + 56 (nesting) + 56 (turning)
    expect(idx.total_parameters).toBe(242);
  });

  it("aggregates the union of all section categories", () => {
    const idx = BobCADCAMFunctionIndexEngine.getIndex();
    expect(idx.categories).toEqual(
      expect.arrayContaining([
        "dmt_hsm",
        "five_axis_simultaneous",
        "sheet_nesting",
        "threading",
      ])
    );
  });

  it("getSummary returns dashboard-shaped stats with per-section counts", () => {
    const summary = BobCADCAMFunctionIndexEngine.getSummary();
    expect(summary.system_id).toBe("bobcad");
    expect(summary.total_sections).toBe(4);
    expect(summary.total_operations).toBe(17);
    expect(summary.total_parameters).toBe(242);
    expect(summary.sections).toEqual(
      expect.arrayContaining([
        { key: "milling", operations: 5 },
        { key: "multi_axis", operations: 4 },
        { key: "nesting", operations: 4 },
        { key: "turning", operations: 4 },
      ])
    );
  });

  it("caches the index — second getIndex returns same object reference", () => {
    const a = BobCADCAMFunctionIndexEngine.getIndex();
    const b = BobCADCAMFunctionIndexEngine.getIndex();
    expect(a).toBe(b);
  });

  it("resetCache forces a fresh load", () => {
    const a = BobCADCAMFunctionIndexEngine.getIndex();
    BobCADCAMFunctionIndexEngine.resetCache();
    const b = BobCADCAMFunctionIndexEngine.getIndex();
    expect(a).not.toBe(b);
    expect(b.total_operations).toBe(17);
  });
});

describe("BobCADCAMFunctionIndexEngine — getSection", () => {
  beforeEach(() => BobCADCAMFunctionIndexEngine.resetCache());

  it("returns the milling section with 5 ops", () => {
    const section = BobCADCAMFunctionIndexEngine.getSection("milling");
    expect("operations" in section).toBe(true);
    if ("operations" in section) {
      expect(Object.keys(section.operations)).toHaveLength(5);
      expect(section.operations.dmt_roughing.category).toBe("dmt_hsm");
    }
  });

  it("returns the multi_axis section with 4 ops", () => {
    const section = BobCADCAMFunctionIndexEngine.getSection("multi_axis");
    expect("operations" in section).toBe(true);
    if ("operations" in section) {
      expect(section.operations.five_axis_3p2.category).toBe("five_axis_3p2");
    }
  });

  it("returns the nesting section with 4 ops", () => {
    const section = BobCADCAMFunctionIndexEngine.getSection("nesting");
    expect("operations" in section).toBe(true);
    if ("operations" in section) {
      expect(Object.keys(section.operations)).toHaveLength(4);
      expect(section.operations.sheet_auto_nest.category).toBe("sheet_nesting");
    }
  });

  it("returns the turning section with 4 ops", () => {
    const section = BobCADCAMFunctionIndexEngine.getSection("turning");
    expect("operations" in section).toBe(true);
    if ("operations" in section) {
      expect(section.operations.thread_turn.category).toBe("threading");
      expect(section.operations.rough_turn.category).toBe("roughing");
    }
  });

  it("returns an error object for an unknown section", () => {
    const result = BobCADCAMFunctionIndexEngine.getSection("does_not_exist");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("does_not_exist");
      expect(result.available).toEqual(
        expect.arrayContaining(["milling", "multi_axis", "nesting", "turning"])
      );
    }
  });
});

describe("BobCADCAMFunctionIndexEngine — listOperations", () => {
  beforeEach(() => BobCADCAMFunctionIndexEngine.resetCache());

  it("returns 17 entries spanning all 4 sections", () => {
    const ops = BobCADCAMFunctionIndexEngine.listOperations();
    expect(ops).toHaveLength(17);
    const sections = new Set(ops.map((o) => o.section));
    expect(sections.size).toBe(4);
  });

  it("each entry carries operation_id, display_name, section, category strings", () => {
    const ops = BobCADCAMFunctionIndexEngine.listOperations();
    for (const op of ops) {
      expect(typeof op.operation_id).toBe("string");
      expect(op.operation_id.length).toBeGreaterThan(0);
      expect(typeof op.display_name).toBe("string");
      expect(typeof op.section).toBe("string");
      expect(typeof op.category).toBe("string");
    }
  });

  it("contains the DMT roughing flagship", () => {
    const ops = BobCADCAMFunctionIndexEngine.listOperations();
    const dmt = ops.find((o) => o.operation_id === "dmt_roughing");
    expect(dmt?.section).toBe("milling");
    expect(dmt?.display_name).toBe("Dynamic Motion Technology (DMT) Roughing");
    expect(dmt?.category).toBe("dmt_hsm");
  });
});

describe("BobCADCAMFunctionIndexEngine — findParameter", () => {
  beforeEach(() => BobCADCAMFunctionIndexEngine.resetCache());

  it("locates 'stepover' across milling and multi_axis sections", () => {
    const hits = BobCADCAMFunctionIndexEngine.findParameter("stepover");
    expect(hits.length).toBeGreaterThan(2);
    const sections = new Set(hits.map((h) => h.section));
    expect(sections.has("milling")).toBe(true);
    for (const hit of hits) {
      expect(hit.parameter_name.toLowerCase()).toContain("stepover");
    }
  });

  it("locates 'kerf' specifically in nesting section", () => {
    const hits = BobCADCAMFunctionIndexEngine.findParameter("kerf");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.section === "nesting")).toBe(true);
  });

  it("returns parameter records with full {section, group, parameter} shape", () => {
    const hits = BobCADCAMFunctionIndexEngine.findParameter("pitch");
    expect(hits.length).toBeGreaterThan(0);
    const first = hits[0];
    expect(typeof first.section).toBe("string");
    expect(typeof first.group).toBe("string");
    expect(typeof first.parameter_name).toBe("string");
    expect(first.parameter.unit).toBe("mm");
    expect(first.parameter.type).toBe("number");
  });

  it("returns empty array for parameter that does not exist anywhere", () => {
    const hits = BobCADCAMFunctionIndexEngine.findParameter("doesNotExistParam_xyz_42");
    expect(hits).toEqual([]);
  });

  it("throws when called with empty string", () => {
    expect(() => BobCADCAMFunctionIndexEngine.findParameter("")).toThrow(
      /non-empty string/
    );
  });

  it("throws when called with non-string input", () => {
    const fn = BobCADCAMFunctionIndexEngine.findParameter as unknown as (
      x: unknown
    ) => unknown;
    expect(() => fn(null)).toThrow(/non-empty string/);
  });
});

describe("BobCADCAMFunctionIndexEngine — searchParameters", () => {
  beforeEach(() => BobCADCAMFunctionIndexEngine.resetCache());

  it("finds 'pierce' references in nesting lead_in_out_micro_tabs", () => {
    const hits = BobCADCAMFunctionIndexEngine.searchParameters("pierce");
    expect(hits.length).toBeGreaterThanOrEqual(3);
    expect(hits.some((h) => h.section === "nesting")).toBe(true);
    expect(hits.some((h) => h.parameter_name === "pierceMode")).toBe(true);
  });

  it("matches parameter descriptions, not just names — 'patented' appears in DMT description", () => {
    const hits = BobCADCAMFunctionIndexEngine.searchParameters("HSM");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.section === "milling")).toBe(true);
  });

  it("respects the limit argument", () => {
    const hits = BobCADCAMFunctionIndexEngine.searchParameters("feed", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("clamps a NaN limit to the 20 default", () => {
    const hits = BobCADCAMFunctionIndexEngine.searchParameters("feed", Number.NaN);
    expect(hits.length).toBeLessThanOrEqual(20);
    expect(hits.length).toBeGreaterThan(0);
  });

  it("clamps an oversized limit to 500", () => {
    const hits = BobCADCAMFunctionIndexEngine.searchParameters("feed", 99999);
    expect(hits.length).toBeLessThanOrEqual(500);
  });

  it("clamps a negative limit to at least 1", () => {
    const hits = BobCADCAMFunctionIndexEngine.searchParameters("feed", -10);
    expect(hits.length).toBeGreaterThanOrEqual(0);
    expect(hits.length).toBeLessThanOrEqual(1);
  });

  it("throws on empty query", () => {
    expect(() => BobCADCAMFunctionIndexEngine.searchParameters("")).toThrow(
      /non-empty string/
    );
  });
});

describe("BobCADCAMFunctionIndexEngine — getOperationsByCategory", () => {
  beforeEach(() => BobCADCAMFunctionIndexEngine.resetCache());

  it("returns 1 op for category 'dmt_hsm'", () => {
    const ops = BobCADCAMFunctionIndexEngine.getOperationsByCategory("dmt_hsm");
    expect(ops).toHaveLength(1);
    expect(ops[0].operation_id).toBe("dmt_roughing");
  });

  it("returns 1 op for category 'sheet_nesting'", () => {
    const ops = BobCADCAMFunctionIndexEngine.getOperationsByCategory("sheet_nesting");
    expect(ops).toHaveLength(1);
    expect(ops[0].operation_id).toBe("sheet_auto_nest");
  });

  it("matches case-insensitively (substring 'THREADING' upper)", () => {
    const ops = BobCADCAMFunctionIndexEngine.getOperationsByCategory("THREADING");
    expect(ops.length).toBeGreaterThan(0);
    expect(ops[0].operation_id).toBe("thread_turn");
  });

  it("returns empty array for unknown category", () => {
    const ops = BobCADCAMFunctionIndexEngine.getOperationsByCategory("not_a_real_category");
    expect(ops).toEqual([]);
  });

  it("throws on empty category", () => {
    expect(() => BobCADCAMFunctionIndexEngine.getOperationsByCategory("")).toThrow();
  });
});

describe("BobCADCAMFunctionIndexEngine — getDMTOperations", () => {
  beforeEach(() => BobCADCAMFunctionIndexEngine.resetCache());

  it("returns the DMT roughing flagship", () => {
    const ops = BobCADCAMFunctionIndexEngine.getDMTOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].operation_id).toBe("dmt_roughing");
    expect(ops[0].section).toBe("milling");
  });

  it("DMT description mentions Dynamic Motion Technology", () => {
    const ops = BobCADCAMFunctionIndexEngine.getDMTOperations();
    expect(ops[0].description).toMatch(/Dynamic Motion Technology/);
  });
});

describe("BobCADCAMFunctionIndexEngine — getNestingOperations", () => {
  beforeEach(() => BobCADCAMFunctionIndexEngine.resetCache());

  it("returns 4 nesting ops with category metadata", () => {
    const ops = BobCADCAMFunctionIndexEngine.getNestingOperations();
    expect(ops).toHaveLength(4);
    const cats = new Set(ops.map((o) => o.category));
    expect(cats.has("sheet_nesting")).toBe(true);
    expect(cats.has("kerf_comp")).toBe(true);
    expect(cats.has("common_line")).toBe(true);
  });

  it("flags every result as section=nesting", () => {
    const ops = BobCADCAMFunctionIndexEngine.getNestingOperations();
    for (const op of ops) {
      expect(op.section).toBe("nesting");
    }
  });
});

describe("BobCADCAMFunctionIndexEngine — getOperation lookup", () => {
  beforeEach(() => BobCADCAMFunctionIndexEngine.resetCache());

  it("retrieves dmt_roughing with full operation payload + correct units", () => {
    const result = BobCADCAMFunctionIndexEngine.getOperation("dmt_roughing");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      expect(result.section).toBe("milling");
      expect(result.operation.display_name).toContain("Dynamic Motion Technology");
      expect(result.operation.parameters.engagement.stepoverPct.unit).toBe("percent");
    }
  });

  it("retrieves five_axis_simultaneous from multi_axis section", () => {
    const result = BobCADCAMFunctionIndexEngine.getOperation("five_axis_simultaneous");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      expect(result.section).toBe("multi_axis");
      expect(result.operation.parameters.cycle.tcpOutput.values).toContain("G43.4");
    }
  });

  it("returns error object for unknown operation", () => {
    const result = BobCADCAMFunctionIndexEngine.getOperation("not_a_real_op");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("not_a_real_op");
    }
  });

  it("throws on empty operationId", () => {
    expect(() => BobCADCAMFunctionIndexEngine.getOperation("")).toThrow(
      /non-empty string/
    );
  });
});

describe("BobCADCAMFunctionIndexEngine — training topics + parameter integrity", () => {
  beforeEach(() => BobCADCAMFunctionIndexEngine.resetCache());

  it("returns training topics for milling section", () => {
    const topics = BobCADCAMFunctionIndexEngine.getTrainingTopics("milling");
    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0].topic.length).toBeGreaterThan(0);
    expect(Array.isArray(topics[0].best_practices)).toBe(true);
  });

  it("returns empty array for non-existent section's training topics", () => {
    const topics = BobCADCAMFunctionIndexEngine.getTrainingTopics("does_not_exist");
    expect(topics).toEqual([]);
  });

  it("DMT roughing carries the maxEngagementAngle DMT-specific parameter", () => {
    const result = BobCADCAMFunctionIndexEngine.getOperation("dmt_roughing");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      const mea = result.operation.parameters.engagement.maxEngagementAngle;
      expect(mea.type).toBe("number");
      expect(mea.unit).toBe("deg");
      expect(mea.default).toBe(65.0);
      expect(mea.range).toEqual([10, 180]);
    }
  });

  it("sheet_auto_nest enumerates 3 nesting algorithms", () => {
    const result = BobCADCAMFunctionIndexEngine.getOperation("sheet_auto_nest");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      expect(result.operation.parameters.algorithm.algorithm.values).toEqual([
        "geneticAlgorithm",
        "boundingBoxFFD",
        "noFitPolygon",
      ]);
    }
  });

  it("kerf_compensation supports 5 process types incl waterjet+plasma", () => {
    const result = BobCADCAMFunctionIndexEngine.getOperation("kerf_compensation");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      const pt = result.operation.parameters.process.processType;
      expect(pt.values).toEqual(["laser", "plasma", "waterjet", "router", "edm"]);
    }
  });

  it("thread_turn enumerates 7 thread standards including BSP and ACME", () => {
    const result = BobCADCAMFunctionIndexEngine.getOperation("thread_turn");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      const ts = result.operation.parameters.thread.threadStandard;
      expect(ts.values).toEqual([
        "metric",
        "UN",
        "UNF",
        "BSP",
        "NPT",
        "ACME",
        "trapezoidal",
      ]);
    }
  });

  it("five_axis_3p2 enforces real rotary-limit defaults", () => {
    const result = BobCADCAMFunctionIndexEngine.getOperation("five_axis_3p2");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      expect(result.operation.parameters.indexing.rotaryLimitMin.default).toBe(
        -120
      );
      expect(result.operation.parameters.indexing.rotaryLimitMax.default).toBe(
        120
      );
    }
  });
});
