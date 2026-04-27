/**
 * TebisFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM-FIDX-15
 *
 * Real-data tests against the 4 Tebis catalog JSONs:
 *   milling, mold_die, five_axis, proven_processes
 *
 * Coverage targets:
 *   - happy path (load, summary, search) on every section
 *   - ≥3 failure modes (missing section, missing op, empty/invalid query)
 *   - ≥2 adversarial inputs (NaN limit, oversized query, empty string)
 *   - specialty surfaces: getProvenProcessOperations + getMoldDieOperations
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TebisFunctionIndexEngine } from "../engines/TebisFunctionIndexEngine.js";

describe("TebisFunctionIndexEngine — index load + summary", () => {
  beforeEach(() => {
    TebisFunctionIndexEngine.resetCache();
  });

  it("loads all four sections from disk", () => {
    const sections = TebisFunctionIndexEngine.listSections().sort();
    expect(sections).toEqual([
      "five_axis",
      "milling",
      "mold_die",
      "proven_processes",
    ]);
  });

  it("getIndex returns 18 operations across 4 sections", () => {
    const idx = TebisFunctionIndexEngine.getIndex();
    expect(idx.system_id).toBe("tebis");
    expect(idx.total_operations).toBe(18);
    expect(Object.keys(idx.sections)).toHaveLength(4);
  });

  it("totals parameters from per-section summary blocks", () => {
    const idx = TebisFunctionIndexEngine.getIndex();
    // 72 (milling) + 70 (mold_die) + 60 (five_axis) + 58 (proven_processes)
    expect(idx.total_parameters).toBe(260);
  });

  it("aggregates the union of all section categories", () => {
    const idx = TebisFunctionIndexEngine.getIndex();
    expect(idx.categories).toEqual(
      expect.arrayContaining([
        "high_efficiency",
        "core_cavity",
        "simultaneous_5x",
        "process_library",
      ])
    );
  });

  it("getSummary returns dashboard-shaped stats with per-section counts", () => {
    const summary = TebisFunctionIndexEngine.getSummary();
    expect(summary.system_id).toBe("tebis");
    expect(summary.total_sections).toBe(4);
    expect(summary.total_operations).toBe(18);
    expect(summary.total_parameters).toBe(260);
    expect(summary.sections).toEqual(
      expect.arrayContaining([
        { key: "milling", operations: 5 },
        { key: "mold_die", operations: 5 },
        { key: "five_axis", operations: 4 },
        { key: "proven_processes", operations: 4 },
      ])
    );
  });

  it("caches the index — second getIndex returns same object reference", () => {
    const a = TebisFunctionIndexEngine.getIndex();
    const b = TebisFunctionIndexEngine.getIndex();
    expect(a).toBe(b);
  });

  it("resetCache forces a fresh load", () => {
    const a = TebisFunctionIndexEngine.getIndex();
    TebisFunctionIndexEngine.resetCache();
    const b = TebisFunctionIndexEngine.getIndex();
    expect(a).not.toBe(b);
    expect(b.total_operations).toBe(18);
  });
});

describe("TebisFunctionIndexEngine — getSection", () => {
  beforeEach(() => TebisFunctionIndexEngine.resetCache());

  it("returns the milling section with 5 ops", () => {
    const section = TebisFunctionIndexEngine.getSection("milling");
    expect("operations" in section).toBe(true);
    if ("operations" in section) {
      expect(Object.keys(section.operations)).toHaveLength(5);
      expect(section.operations.high_efficiency_roughing.category).toBe(
        "high_efficiency"
      );
    }
  });

  it("returns the mold_die section with 5 ops", () => {
    const section = TebisFunctionIndexEngine.getSection("mold_die");
    expect("operations" in section).toBe(true);
    if ("operations" in section) {
      expect(section.operations.electrode_design.category).toBe("electrode");
    }
  });

  it("returns the five_axis section with 4 ops", () => {
    const section = TebisFunctionIndexEngine.getSection("five_axis");
    expect("operations" in section).toBe(true);
    if ("operations" in section) {
      expect(Object.keys(section.operations)).toHaveLength(4);
      expect(section.operations.swarf_machining.category).toBe("swarf");
    }
  });

  it("returns the proven_processes section with 4 ops", () => {
    const section = TebisFunctionIndexEngine.getSection("proven_processes");
    expect("operations" in section).toBe(true);
    if ("operations" in section) {
      expect(section.operations.ppl_lookup.category).toBe("process_library");
      expect(section.operations.virtual_machine_simulation.category).toBe(
        "virtual_machine"
      );
    }
  });

  it("returns an error object for an unknown section", () => {
    const result = TebisFunctionIndexEngine.getSection("does_not_exist");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("does_not_exist");
      expect(result.available).toEqual(
        expect.arrayContaining(["milling", "mold_die", "five_axis", "proven_processes"])
      );
    }
  });
});

describe("TebisFunctionIndexEngine — listOperations", () => {
  beforeEach(() => TebisFunctionIndexEngine.resetCache());

  it("returns 18 entries spanning all 4 sections", () => {
    const ops = TebisFunctionIndexEngine.listOperations();
    expect(ops).toHaveLength(18);
    const sections = new Set(ops.map((o) => o.section));
    expect(sections.size).toBe(4);
  });

  it("each entry carries operation_id, display_name, section, category strings", () => {
    const ops = TebisFunctionIndexEngine.listOperations();
    for (const op of ops) {
      expect(typeof op.operation_id).toBe("string");
      expect(op.operation_id.length).toBeGreaterThan(0);
      expect(typeof op.display_name).toBe("string");
      expect(typeof op.section).toBe("string");
      expect(typeof op.category).toBe("string");
    }
  });

  it("contains the high-efficiency-roughing flagship", () => {
    const ops = TebisFunctionIndexEngine.listOperations();
    const hem = ops.find((o) => o.operation_id === "high_efficiency_roughing");
    expect(hem?.section).toBe("milling");
    expect(hem?.display_name).toBe("High-Efficiency Roughing (HEM)");
    expect(hem?.category).toBe("high_efficiency");
  });
});

describe("TebisFunctionIndexEngine — findParameter", () => {
  beforeEach(() => TebisFunctionIndexEngine.resetCache());

  it("locates 'stepover' across milling and five_axis sections", () => {
    const hits = TebisFunctionIndexEngine.findParameter("stepover");
    expect(hits.length).toBeGreaterThan(2);
    const sections = new Set(hits.map((h) => h.section));
    expect(sections.has("milling")).toBe(true);
    expect(sections.has("five_axis")).toBe(true);
    for (const hit of hits) {
      expect(hit.parameter_name.toLowerCase()).toContain("stepover");
    }
  });

  it("locates 'tiltAngle' specifically in five_axis section", () => {
    const hits = TebisFunctionIndexEngine.findParameter("tiltAngle");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.section === "five_axis")).toBe(true);
  });

  it("returns parameter records with full {section, group, parameter} shape", () => {
    const hits = TebisFunctionIndexEngine.findParameter("scallopHeight");
    expect(hits.length).toBeGreaterThan(0);
    const first = hits[0];
    expect(typeof first.section).toBe("string");
    expect(typeof first.group).toBe("string");
    expect(typeof first.parameter_name).toBe("string");
    expect(first.parameter.unit).toBe("mm");
    expect(first.parameter.type).toBe("number");
  });

  it("returns empty array for parameter that does not exist anywhere", () => {
    const hits = TebisFunctionIndexEngine.findParameter("definitelyNotARealParam_xyz_42");
    expect(hits).toEqual([]);
  });

  it("throws when called with empty string", () => {
    expect(() => TebisFunctionIndexEngine.findParameter("")).toThrow(
      /non-empty string/
    );
  });

  it("throws when called with non-string input", () => {
    const fn = TebisFunctionIndexEngine.findParameter as unknown as (
      x: unknown
    ) => unknown;
    expect(() => fn(null)).toThrow(/non-empty string/);
  });
});

describe("TebisFunctionIndexEngine — searchParameters", () => {
  beforeEach(() => TebisFunctionIndexEngine.resetCache());

  it("finds 'spark' references in mold_die electrode_design", () => {
    const hits = TebisFunctionIndexEngine.searchParameters("spark");
    expect(hits.length).toBeGreaterThanOrEqual(3);
    expect(hits.some((h) => h.section === "mold_die")).toBe(true);
    expect(hits.some((h) => h.parameter_name === "sparkGapRough")).toBe(true);
  });

  it("matches parameter descriptions, not just names — 'BMW' appears in customerRef description", () => {
    const hits = TebisFunctionIndexEngine.searchParameters("BMW");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.section === "proven_processes")).toBe(true);
    expect(hits.some((h) => h.parameter_name === "customerRef")).toBe(true);
  });

  it("respects the limit argument", () => {
    const hits = TebisFunctionIndexEngine.searchParameters("feed", 3);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it("clamps a NaN limit to the 20 default", () => {
    const hits = TebisFunctionIndexEngine.searchParameters("feed", Number.NaN);
    expect(hits.length).toBeLessThanOrEqual(20);
    expect(hits.length).toBeGreaterThan(0);
  });

  it("clamps an oversized limit to 500", () => {
    const hits = TebisFunctionIndexEngine.searchParameters("feed", 99999);
    expect(hits.length).toBeLessThanOrEqual(500);
  });

  it("clamps a negative limit to at least 1", () => {
    const hits = TebisFunctionIndexEngine.searchParameters("feed", -10);
    expect(hits.length).toBeGreaterThanOrEqual(0);
    expect(hits.length).toBeLessThanOrEqual(1);
  });

  it("throws on empty query", () => {
    expect(() => TebisFunctionIndexEngine.searchParameters("")).toThrow(
      /non-empty string/
    );
  });
});

describe("TebisFunctionIndexEngine — getOperationsByCategory", () => {
  beforeEach(() => TebisFunctionIndexEngine.resetCache());

  it("returns 1 op for category 'high_efficiency' (HEM roughing)", () => {
    const ops = TebisFunctionIndexEngine.getOperationsByCategory("high_efficiency");
    expect(ops).toHaveLength(1);
    expect(ops[0].operation_id).toBe("high_efficiency_roughing");
  });

  it("returns multiple finishing ops across milling section", () => {
    const ops = TebisFunctionIndexEngine.getOperationsByCategory("finishing");
    expect(ops.length).toBeGreaterThanOrEqual(2);
    expect(ops.every((o) => o.section === "milling")).toBe(true);
  });

  it("matches case-insensitively (substring 'PROCESS_LIBRARY' upper)", () => {
    const ops = TebisFunctionIndexEngine.getOperationsByCategory("PROCESS_LIBRARY");
    expect(ops.length).toBeGreaterThan(0);
    expect(ops[0].operation_id).toBe("ppl_lookup");
  });

  it("returns empty array for unknown category", () => {
    const ops = TebisFunctionIndexEngine.getOperationsByCategory("not_a_real_category");
    expect(ops).toEqual([]);
  });

  it("throws on empty category", () => {
    expect(() => TebisFunctionIndexEngine.getOperationsByCategory("")).toThrow();
  });
});

describe("TebisFunctionIndexEngine — getProvenProcessOperations", () => {
  beforeEach(() => TebisFunctionIndexEngine.resetCache());

  it("returns 4 ops covering Tebis's flagship PPL surface", () => {
    const ops = TebisFunctionIndexEngine.getProvenProcessOperations();
    expect(ops).toHaveLength(4);
    const ids = ops.map((o) => o.operation_id).sort();
    expect(ids).toEqual([
      "knowledge_capture",
      "nc_standardization",
      "ppl_lookup",
      "virtual_machine_simulation",
    ]);
  });

  it("flags every result as section=proven_processes", () => {
    const ops = TebisFunctionIndexEngine.getProvenProcessOperations();
    for (const op of ops) {
      expect(op.section).toBe("proven_processes");
      expect(typeof op.description).toBe("string");
      expect(op.description.length).toBeGreaterThan(0);
    }
  });
});

describe("TebisFunctionIndexEngine — getMoldDieOperations", () => {
  beforeEach(() => TebisFunctionIndexEngine.resetCache());

  it("returns 5 mold/die ops with category metadata", () => {
    const ops = TebisFunctionIndexEngine.getMoldDieOperations();
    expect(ops).toHaveLength(5);
    const cats = new Set(ops.map((o) => o.category));
    expect(cats.has("electrode")).toBe(true);
    expect(cats.has("shutoff")).toBe(true);
    expect(cats.has("parting")).toBe(true);
  });

  it("flags every result as section=mold_die", () => {
    const ops = TebisFunctionIndexEngine.getMoldDieOperations();
    for (const op of ops) {
      expect(op.section).toBe("mold_die");
    }
  });
});

describe("TebisFunctionIndexEngine — getOperation lookup", () => {
  beforeEach(() => TebisFunctionIndexEngine.resetCache());

  it("retrieves ppl_lookup with full operation payload + correct units", () => {
    const result = TebisFunctionIndexEngine.getOperation("ppl_lookup");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      expect(result.section).toBe("proven_processes");
      expect(result.operation.display_name).toBe("Proven-Process Library Lookup");
      expect(result.operation.parameters.ranking.recencyHorizon.unit).toBe("days");
    }
  });

  it("retrieves swarf_machining from five_axis section", () => {
    const result = TebisFunctionIndexEngine.getOperation("swarf_machining");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      expect(result.section).toBe("five_axis");
      expect(result.operation.parameters.toolAxis.axisAlignment.values).toContain(
        "alongRuling"
      );
    }
  });

  it("returns error object for unknown operation", () => {
    const result = TebisFunctionIndexEngine.getOperation("not_a_real_op");
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("not_a_real_op");
    }
  });

  it("throws on empty operationId", () => {
    expect(() => TebisFunctionIndexEngine.getOperation("")).toThrow(
      /non-empty string/
    );
  });
});

describe("TebisFunctionIndexEngine — training topics + parameter integrity", () => {
  beforeEach(() => TebisFunctionIndexEngine.resetCache());

  it("returns training topics for milling section", () => {
    const topics = TebisFunctionIndexEngine.getTrainingTopics("milling");
    expect(topics.length).toBeGreaterThan(0);
    expect(topics[0].topic.length).toBeGreaterThan(0);
    expect(Array.isArray(topics[0].best_practices)).toBe(true);
  });

  it("returns empty array for non-existent section's training topics", () => {
    const topics = TebisFunctionIndexEngine.getTrainingTopics("does_not_exist");
    expect(topics).toEqual([]);
  });

  it("HEM roughing carries the axialAggressivenessFactor signature parameter", () => {
    const result = TebisFunctionIndexEngine.getOperation("high_efficiency_roughing");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      const aaf = result.operation.parameters.engagement.axialAggressivenessFactor;
      expect(aaf.type).toBe("number");
      expect(aaf.default).toBe(2.5);
      expect(aaf.range).toEqual([1.0, 5.0]);
    }
  });

  it("electrode_design carries 4 dialog tabs and EROWA shank default", () => {
    const result = TebisFunctionIndexEngine.getOperation("electrode_design");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      expect(result.operation.dialog_tabs).toEqual([
        "Faces",
        "Blank",
        "Spark",
        "Output",
      ]);
      expect(result.operation.parameters.blank.shankAttachment.default).toBe(
        "EROWA"
      );
    }
  });

  it("auto_indexing_3p2 enforces real rotary-limit defaults", () => {
    const result = TebisFunctionIndexEngine.getOperation("auto_indexing_3p2");
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

  it("ppl_lookup ranking field carries 5 sort modes", () => {
    const result = TebisFunctionIndexEngine.getOperation("ppl_lookup");
    expect("operation" in result).toBe(true);
    if ("operation" in result) {
      const rb = result.operation.parameters.ranking.rankBy;
      expect(rb.values).toEqual([
        "historicalSuccess",
        "cycleTime",
        "cost",
        "toolLife",
        "surfaceFinish",
      ]);
    }
  });
});
