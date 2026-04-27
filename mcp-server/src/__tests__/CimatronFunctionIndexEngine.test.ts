/**
 * CimatronFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM-FIDX-17
 * Verifies all 4 sections (milling, mold_die, electrode, drill_grid) load
 * with concrete-value assertions across operations, parameters, categories,
 * and the two specialty surfaces (mold/die + Drill5x).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CimatronFunctionIndexEngine } from "../engines/CimatronFunctionIndexEngine.js";

describe("CimatronFunctionIndexEngine", () => {
  beforeEach(() => {
    CimatronFunctionIndexEngine.resetCache();
  });

  describe("getIndex", () => {
    it("loads all four sections from data/cam-functions/cimatron", () => {
      const idx = CimatronFunctionIndexEngine.getIndex();
      expect(idx.system_id).toBe("cimatron");
      expect(Object.keys(idx.sections).sort()).toEqual([
        "drill_grid",
        "electrode",
        "milling",
        "mold_die",
      ]);
    });

    it("aggregates 16 operations across all sections", () => {
      const idx = CimatronFunctionIndexEngine.getIndex();
      expect(idx.total_operations).toBe(16);
    });

    it("aggregates parameter totals from per-section summaries", () => {
      const idx = CimatronFunctionIndexEngine.getIndex();
      expect(idx.total_parameters).toBe(60 + 64 + 60 + 56);
    });

    it("collects unique categories across sections", () => {
      const idx = CimatronFunctionIndexEngine.getIndex();
      expect(idx.categories).toContain("helical_3d");
      expect(idx.categories).toContain("core_cavity");
      expect(idx.categories).toContain("quick_electrode");
      expect(idx.categories).toContain("five_axis_drill");
    });

    it("returns the cached index on subsequent calls", () => {
      const a = CimatronFunctionIndexEngine.getIndex();
      const b = CimatronFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });
  });

  describe("resetCache", () => {
    it("forces re-load of index from disk on next call", () => {
      const before = CimatronFunctionIndexEngine.getIndex();
      CimatronFunctionIndexEngine.resetCache();
      const after = CimatronFunctionIndexEngine.getIndex();
      expect(after).not.toBe(before);
      expect(after.system_id).toBe("cimatron");
    });
  });

  describe("listSections", () => {
    it("returns the 4 expected section keys", () => {
      expect(CimatronFunctionIndexEngine.listSections().sort()).toEqual([
        "drill_grid",
        "electrode",
        "milling",
        "mold_die",
      ]);
    });
  });

  describe("getSection", () => {
    it("returns milling section with helical_3d operation", () => {
      const sec = CimatronFunctionIndexEngine.getSection("milling");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.section_key).toBe("milling");
      expect(sec.operations["helical_3d"].display_name).toBe("Helical 3D");
      expect(sec.operations["helical_3d"].category).toBe("helical_3d");
    });

    it("returns mold_die section with core_cavity_split operation", () => {
      const sec = CimatronFunctionIndexEngine.getSection("mold_die");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["core_cavity_split"].category).toBe("core_cavity");
      expect(sec.operations["die_design_progressive"].category).toBe("die_design");
    });

    it("returns electrode section with quick_electrode flagship op", () => {
      const sec = CimatronFunctionIndexEngine.getSection("electrode");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["quick_electrode"].category).toBe("quick_electrode");
      expect(sec.operations["quick_electrode"].display_name).toBe("Quick Electrode");
    });

    it("returns drill_grid section with drill_5x flagship op", () => {
      const sec = CimatronFunctionIndexEngine.getSection("drill_grid");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["drill_5x"].category).toBe("five_axis_drill");
      expect(sec.operations["drill_5x"].display_name).toBe("Drill 5X (Cimatron Flagship)");
    });

    it("returns error object for missing section", () => {
      const sec = CimatronFunctionIndexEngine.getSection("non_existent");
      expect("error" in sec).toBe(true);
      if ("error" in sec) {
        expect(sec.error).toContain("non_existent");
        expect(sec.available).toContain("milling");
      }
    });
  });

  describe("listOperations", () => {
    it("returns 16 operations with section and category metadata", () => {
      const ops = CimatronFunctionIndexEngine.listOperations();
      expect(ops.length).toBe(16);
      const helical = ops.find((o) => o.operation_id === "helical_3d");
      expect(helical?.section).toBe("milling");
      expect(helical?.category).toBe("helical_3d");
    });

    it("includes the 4 flagship operations", () => {
      const ids = CimatronFunctionIndexEngine.listOperations().map((o) => o.operation_id);
      expect(ids).toContain("helical_3d");
      expect(ids).toContain("quick_electrode");
      expect(ids).toContain("drill_5x");
      expect(ids).toContain("die_design_progressive");
    });
  });

  describe("findParameter", () => {
    it("finds 'shankAttachment' in electrode section with EROWA default", () => {
      const hits = CimatronFunctionIndexEngine.findParameter("shankAttachment");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const eroWa = hits.find((h) => h.parameter.default === "EROWA");
      expect(eroWa?.section).toBe("electrode");
      expect(eroWa?.operation_id).toBe("quick_electrode");
    });

    it("finds 'rampAngle' across milling operations all in degrees", () => {
      const hits = CimatronFunctionIndexEngine.findParameter("rampAngle");
      expect(hits.length).toBeGreaterThanOrEqual(2);
      for (const h of hits) {
        expect(h.section).toBe("milling");
        expect(h.parameter.unit).toBe("deg");
      }
    });

    it("returns empty array for non-existent parameter", () => {
      const hits = CimatronFunctionIndexEngine.findParameter("totally_fake_param_xyz");
      expect(hits).toEqual([]);
    });

    it("throws on empty input", () => {
      expect(() => CimatronFunctionIndexEngine.findParameter("")).toThrow();
    });
  });

  describe("searchParameters", () => {
    it("matches substring in parameter name 'orbit'", () => {
      const hits = CimatronFunctionIndexEngine.searchParameters("orbit");
      expect(hits.length).toBeGreaterThanOrEqual(4);
      const names = new Set(hits.map((h) => h.parameter_name));
      expect(names.has("roughOrbit")).toBe(true);
      expect(names.has("finishOrbit")).toBe(true);
      expect(names.has("polishOrbit")).toBe(true);
    });

    it("matches 'rotary' in description text", () => {
      const hits = CimatronFunctionIndexEngine.searchParameters("rotary");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const drill5x = hits.find((h) => h.operation_id === "drill_5x");
      expect(drill5x?.section).toBe("drill_grid");
    });

    it("respects clamp limit of 1", () => {
      const hits = CimatronFunctionIndexEngine.searchParameters("rough", 1);
      expect(hits.length).toBe(1);
    });

    it("clamps limit above 500 to 500", () => {
      const hits = CimatronFunctionIndexEngine.searchParameters("a", 9999);
      expect(hits.length).toBeLessThanOrEqual(500);
    });

    it("throws on empty query", () => {
      expect(() => CimatronFunctionIndexEngine.searchParameters("")).toThrow();
    });
  });

  describe("getOperationsByCategory", () => {
    it("returns helical_3d category single op", () => {
      const hits = CimatronFunctionIndexEngine.getOperationsByCategory("helical_3d");
      expect(hits.length).toBe(1);
      expect(hits[0].operation_id).toBe("helical_3d");
    });

    it("returns 4 mold/die categories combined when matching 'design'", () => {
      const hits = CimatronFunctionIndexEngine.getOperationsByCategory("design");
      expect(hits.length).toBeGreaterThanOrEqual(2);
      const ids = hits.map((h) => h.operation_id);
      expect(ids).toContain("parting_surface_design");
      expect(ids).toContain("electrode_design_manual");
    });

    it("returns five_axis_drill category single op", () => {
      const hits = CimatronFunctionIndexEngine.getOperationsByCategory("five_axis_drill");
      expect(hits.length).toBe(1);
      expect(hits[0].operation_id).toBe("drill_5x");
    });

    it("returns empty array for unknown category", () => {
      expect(
        CimatronFunctionIndexEngine.getOperationsByCategory("totally_unknown_xyz")
      ).toEqual([]);
    });

    it("throws on empty category", () => {
      expect(() => CimatronFunctionIndexEngine.getOperationsByCategory("")).toThrow();
    });
  });

  describe("getSummary", () => {
    it("reports 4 sections with correct operation counts", () => {
      const sum = CimatronFunctionIndexEngine.getSummary();
      expect(sum.system_id).toBe("cimatron");
      expect(sum.total_sections).toBe(4);
      expect(sum.total_operations).toBe(16);
      const milling = sum.sections.find((s) => s.key === "milling");
      expect(milling?.operations).toBe(4);
    });
  });

  describe("getMoldDieOperations", () => {
    it("returns operations across mold_die + electrode sections", () => {
      const ops = CimatronFunctionIndexEngine.getMoldDieOperations();
      expect(ops.length).toBe(8);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("core_cavity_split");
      expect(ids).toContain("quick_electrode");
      expect(ids).toContain("die_design_progressive");
    });
  });

  describe("getDrill5xOperations", () => {
    it("returns all 4 drill_grid operations", () => {
      const ops = CimatronFunctionIndexEngine.getDrill5xOperations();
      expect(ops.length).toBe(4);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("drill_5x");
      expect(ids).toContain("hole_classification");
      expect(ids).toContain("pattern_drill");
      expect(ids).toContain("tap_thread_5x");
    });

    it("all operations are tagged section=drill_grid", () => {
      const ops = CimatronFunctionIndexEngine.getDrill5xOperations();
      for (const op of ops) {
        expect(op.section).toBe("drill_grid");
      }
    });
  });

  describe("getOperation", () => {
    it("retrieves drill_5x by id", () => {
      const result = CimatronFunctionIndexEngine.getOperation("drill_5x");
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      expect(result.section).toBe("drill_grid");
      expect(result.operation.display_name).toBe("Drill 5X (Cimatron Flagship)");
      expect(result.operation.dialog_tabs).toContain("Strategy");
    });

    it("retrieves quick_electrode and verifies blank parameter group", () => {
      const result = CimatronFunctionIndexEngine.getOperation("quick_electrode");
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      const blank = result.operation.parameters["blank"];
      expect(blank.shankAttachment.default).toBe("EROWA");
      expect(blank.blankShape.default).toBe("square");
    });

    it("returns error for missing operation", () => {
      const result = CimatronFunctionIndexEngine.getOperation("does_not_exist");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toContain("does_not_exist");
      }
    });

    it("throws on empty id", () => {
      expect(() => CimatronFunctionIndexEngine.getOperation("")).toThrow();
    });
  });

  describe("getTrainingTopics", () => {
    it("returns mold/die topic for mold_die section", () => {
      const topics = CimatronFunctionIndexEngine.getTrainingTopics("mold_die");
      expect(topics.length).toBeGreaterThanOrEqual(1);
      const moldTopic = topics.find((t) => t.topic.includes("mold"));
      expect(moldTopic?.key_concepts).toContain("parting line silhouette method");
    });

    it("returns Drill5x topic for drill_grid section", () => {
      const topics = CimatronFunctionIndexEngine.getTrainingTopics("drill_grid");
      expect(topics.length).toBe(1);
      expect(topics[0].topic).toBe("Cimatron Drill5x discipline");
      expect(topics[0].best_practices.length).toBe(3);
    });

    it("returns empty array for unknown section", () => {
      expect(CimatronFunctionIndexEngine.getTrainingTopics("xyz_not_a_section")).toEqual([]);
    });
  });

  describe("parameter values are concrete", () => {
    it("Helical 3D axialPitch defaults to 0.5 mm with [0.05, 5.0] range", () => {
      const result = CimatronFunctionIndexEngine.getOperation("helical_3d");
      if ("error" in result) throw new Error("helical_3d missing");
      const ap = result.operation.parameters["helix"]["axialPitch"];
      expect(ap.type).toBe("number");
      expect(ap.default).toBe(0.5);
      expect(ap.unit).toBe("mm");
      expect(ap.range).toEqual([0.05, 5.0]);
      expect(ap.required).toBe(true);
    });

    it("Pocket roughing engagementCap defaults to 35% (microMilling cap)", () => {
      const result = CimatronFunctionIndexEngine.getOperation("pocket_roughing_2_5d");
      if ("error" in result) throw new Error("pocket_roughing_2_5d missing");
      const cap = result.operation.parameters["strategy"]["engagementCap"];
      expect(cap.default).toBe(35);
      expect(cap.unit).toBe("percent");
    });

    it("Sliding component wedgeAngle defaults to 18 deg with [10, 30] range", () => {
      const result = CimatronFunctionIndexEngine.getOperation("sliding_component");
      if ("error" in result) throw new Error("sliding_component missing");
      const wa = result.operation.parameters["mechanism"]["wedgeAngle"];
      expect(wa.default).toBe(18);
      expect(wa.unit).toBe("deg");
      expect(wa.range).toEqual([10, 30]);
    });

    it("Quick Electrode finishUndersize defaults to 0.025 mm", () => {
      const result = CimatronFunctionIndexEngine.getOperation("quick_electrode");
      if ("error" in result) throw new Error("quick_electrode missing");
      const fu = result.operation.parameters["reference"]["finishUndersize"];
      expect(fu.default).toBe(0.025);
      expect(fu.unit).toBe("mm");
    });

    it("EDM cycle has 4-tier orbit ladder (rough->semi->finish->polish)", () => {
      const result = CimatronFunctionIndexEngine.getOperation("edm_program_generation");
      if ("error" in result) throw new Error("edm_program_generation missing");
      const cycle = result.operation.parameters["cycle"];
      expect(cycle.roughOrbit.default).toBe(0.10);
      expect(cycle.semiOrbit.default).toBe(0.05);
      expect(cycle.finishOrbit.default).toBe(0.025);
      expect(cycle.polishOrbit.default).toBe(0.012);
    });

    it("Drill5x indexOptimization default is minimumTime", () => {
      const result = CimatronFunctionIndexEngine.getOperation("drill_5x");
      if ("error" in result) throw new Error("drill_5x missing");
      const io = result.operation.parameters["strategy"]["indexOptimization"];
      expect(io.default).toBe("minimumTime");
      expect(io.values).toContain("minimumWear");
      expect(io.values).toContain("minimumTime");
    });

    it("Tap & Thread 5X cycleType default is G84_rigid", () => {
      const result = CimatronFunctionIndexEngine.getOperation("tap_thread_5x");
      if ("error" in result) throw new Error("tap_thread_5x missing");
      const ct = result.operation.parameters["cycle"]["cycleType"];
      expect(ct.default).toBe("G84_rigid");
      expect(ct.values).toContain("G84.2_synchronous");
    });

    it("Progressive die punchClearance defaults to 8% with [3, 15] range", () => {
      const result = CimatronFunctionIndexEngine.getOperation("die_design_progressive");
      if ("error" in result) throw new Error("die_design_progressive missing");
      const pc = result.operation.parameters["tooling"]["punchClearance"];
      expect(pc.default).toBe(8);
      expect(pc.unit).toBe("percent_of_thk");
      expect(pc.range).toEqual([3, 15]);
    });
  });
});
