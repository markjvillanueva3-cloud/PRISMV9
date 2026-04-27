/**
 * AlphacamFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM-FIDX-19
 * Verifies all 4 sections (routing, drilling, cutting, nesting) load with
 * concrete-value assertions across LR32 system, dowel pattern, laser/plasma
 * cutting, and wood-grain nesting specialty surfaces.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AlphacamFunctionIndexEngine } from "../engines/AlphacamFunctionIndexEngine.js";

describe("AlphacamFunctionIndexEngine", () => {
  beforeEach(() => {
    AlphacamFunctionIndexEngine.resetCache();
  });

  describe("getIndex", () => {
    it("loads all four sections from data/cam-functions/alphacam", () => {
      const idx = AlphacamFunctionIndexEngine.getIndex();
      expect(idx.system_id).toBe("alphacam");
      expect(Object.keys(idx.sections).sort()).toEqual([
        "cutting",
        "drilling",
        "nesting",
        "routing",
      ]);
    });

    it("aggregates 16 operations across all sections", () => {
      const idx = AlphacamFunctionIndexEngine.getIndex();
      expect(idx.total_operations).toBe(16);
    });

    it("aggregates parameter totals from per-section summaries", () => {
      const idx = AlphacamFunctionIndexEngine.getIndex();
      expect(idx.total_parameters).toBe(56 + 60 + 60 + 64);
    });

    it("collects unique categories across sections", () => {
      const idx = AlphacamFunctionIndexEngine.getIndex();
      expect(idx.categories).toContain("lr32_system");
      expect(idx.categories).toContain("aggregate_head");
      expect(idx.categories).toContain("waterjet_stone");
      expect(idx.categories).toContain("wood_grain_nest");
    });

    it("returns the cached index on subsequent calls", () => {
      const a = AlphacamFunctionIndexEngine.getIndex();
      const b = AlphacamFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });
  });

  describe("resetCache", () => {
    it("forces re-load of index from disk on next call", () => {
      const before = AlphacamFunctionIndexEngine.getIndex();
      AlphacamFunctionIndexEngine.resetCache();
      const after = AlphacamFunctionIndexEngine.getIndex();
      expect(after).not.toBe(before);
      expect(after.system_id).toBe("alphacam");
    });
  });

  describe("listSections", () => {
    it("returns the 4 expected section keys", () => {
      expect(AlphacamFunctionIndexEngine.listSections().sort()).toEqual([
        "cutting",
        "drilling",
        "nesting",
        "routing",
      ]);
    });
  });

  describe("getSection", () => {
    it("returns routing section with edge_finish operation", () => {
      const sec = AlphacamFunctionIndexEngine.getSection("routing");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.section_key).toBe("routing");
      expect(sec.operations["edge_finish"].category).toBe("edge_finish");
    });

    it("returns drilling section with LR32 flagship op", () => {
      const sec = AlphacamFunctionIndexEngine.getSection("drilling");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["lr32_system_holes"].category).toBe("lr32_system");
      expect(sec.operations["lr32_system_holes"].display_name).toBe("LR32 System Holes");
    });

    it("returns cutting section with all 4 cutting types", () => {
      const sec = AlphacamFunctionIndexEngine.getSection("cutting");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["laser_sheet_cut"].category).toBe("laser_sheet");
      expect(sec.operations["plasma_sheet_cut"].category).toBe("plasma_sheet");
      expect(sec.operations["waterjet_stone"].category).toBe("waterjet_stone");
      expect(sec.operations["oxy_fuel"].category).toBe("oxy_fuel");
    });

    it("returns nesting section with wood_grain_nest flagship op", () => {
      const sec = AlphacamFunctionIndexEngine.getSection("nesting");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["wood_grain_nest"].category).toBe("wood_grain_nest");
    });

    it("returns error object for missing section", () => {
      const sec = AlphacamFunctionIndexEngine.getSection("non_existent");
      expect("error" in sec).toBe(true);
      if ("error" in sec) {
        expect(sec.error).toContain("non_existent");
        expect(sec.available).toContain("routing");
      }
    });
  });

  describe("listOperations", () => {
    it("returns 16 operations with section and category metadata", () => {
      const ops = AlphacamFunctionIndexEngine.listOperations();
      expect(ops.length).toBe(16);
      const lr32 = ops.find((o) => o.operation_id === "lr32_system_holes");
      expect(lr32?.section).toBe("drilling");
      expect(lr32?.category).toBe("lr32_system");
    });

    it("includes the 4 flagship operations", () => {
      const ids = AlphacamFunctionIndexEngine.listOperations().map((o) => o.operation_id);
      expect(ids).toContain("lr32_system_holes");
      expect(ids).toContain("aggregate_head");
      expect(ids).toContain("waterjet_stone");
      expect(ids).toContain("wood_grain_nest");
    });
  });

  describe("findParameter", () => {
    it("finds 'pitch' in LR32 op with sacred 32mm default", () => {
      const hits = AlphacamFunctionIndexEngine.findParameter("pitch");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const lr32 = hits.find((h) => h.operation_id === "lr32_system_holes");
      expect(lr32?.parameter.default).toBe(32);
      expect(lr32?.parameter.required).toBe(true);
    });

    it("finds 'feedrate' across multiple sections", () => {
      const hits = AlphacamFunctionIndexEngine.findParameter("feedrate");
      expect(hits.length).toBeGreaterThanOrEqual(3);
    });

    it("returns empty array for non-existent parameter", () => {
      const hits = AlphacamFunctionIndexEngine.findParameter("totally_fake_param_xyz");
      expect(hits).toEqual([]);
    });

    it("throws on empty input", () => {
      expect(() => AlphacamFunctionIndexEngine.findParameter("")).toThrow();
    });
  });

  describe("searchParameters", () => {
    it("matches 'grain' in nesting and routing operations", () => {
      const hits = AlphacamFunctionIndexEngine.searchParameters("grain");
      expect(hits.length).toBeGreaterThanOrEqual(2);
    });

    it("matches 'sacred' in LR32 description", () => {
      const hits = AlphacamFunctionIndexEngine.searchParameters("sacred");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const lr32 = hits.find((h) => h.operation_id === "lr32_system_holes");
      expect(lr32?.section).toBe("drilling");
    });

    it("respects clamp limit of 1", () => {
      const hits = AlphacamFunctionIndexEngine.searchParameters("depth", 1);
      expect(hits.length).toBe(1);
    });

    it("clamps limit above 500 to 500", () => {
      const hits = AlphacamFunctionIndexEngine.searchParameters("a", 9999);
      expect(hits.length).toBeLessThanOrEqual(500);
    });

    it("throws on empty query", () => {
      expect(() => AlphacamFunctionIndexEngine.searchParameters("")).toThrow();
    });
  });

  describe("getOperationsByCategory", () => {
    it("returns lr32_system category single op", () => {
      const hits = AlphacamFunctionIndexEngine.getOperationsByCategory("lr32_system");
      expect(hits.length).toBe(1);
      expect(hits[0].operation_id).toBe("lr32_system_holes");
    });

    it("returns laser_sheet category single op", () => {
      const hits = AlphacamFunctionIndexEngine.getOperationsByCategory("laser_sheet");
      expect(hits.length).toBe(1);
      expect(hits[0].operation_id).toBe("laser_sheet_cut");
    });

    it("returns wood_grain_nest category single op", () => {
      const hits = AlphacamFunctionIndexEngine.getOperationsByCategory("wood_grain_nest");
      expect(hits.length).toBe(1);
      expect(hits[0].operation_id).toBe("wood_grain_nest");
    });

    it("returns empty array for unknown category", () => {
      expect(
        AlphacamFunctionIndexEngine.getOperationsByCategory("totally_unknown_xyz")
      ).toEqual([]);
    });

    it("throws on empty category", () => {
      expect(() => AlphacamFunctionIndexEngine.getOperationsByCategory("")).toThrow();
    });
  });

  describe("getSummary", () => {
    it("reports 4 sections with correct operation counts", () => {
      const sum = AlphacamFunctionIndexEngine.getSummary();
      expect(sum.system_id).toBe("alphacam");
      expect(sum.total_sections).toBe(4);
      expect(sum.total_operations).toBe(16);
      const drilling = sum.sections.find((s) => s.key === "drilling");
      expect(drilling?.operations).toBe(4);
    });
  });

  describe("getDrillingOperations", () => {
    it("returns all 4 drilling operations", () => {
      const ops = AlphacamFunctionIndexEngine.getDrillingOperations();
      expect(ops.length).toBe(4);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("lr32_system_holes");
      expect(ids).toContain("dowel_drilling");
      expect(ids).toContain("multi_spindle_drill");
      expect(ids).toContain("aggregate_head");
    });

    it("all operations are tagged section=drilling", () => {
      const ops = AlphacamFunctionIndexEngine.getDrillingOperations();
      for (const op of ops) {
        expect(op.section).toBe("drilling");
      }
    });
  });

  describe("getNestingOperations", () => {
    it("returns all 4 nesting operations", () => {
      const ops = AlphacamFunctionIndexEngine.getNestingOperations();
      expect(ops.length).toBe(4);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("wood_grain_nest");
      expect(ids).toContain("common_line_woodwork");
      expect(ids).toContain("batch_nest");
      expect(ids).toContain("off_cut_optimize");
    });

    it("all operations are tagged section=nesting", () => {
      const ops = AlphacamFunctionIndexEngine.getNestingOperations();
      for (const op of ops) {
        expect(op.section).toBe("nesting");
      }
    });
  });

  describe("getOperation", () => {
    it("retrieves lr32_system_holes by id with 32mm pitch", () => {
      const result = AlphacamFunctionIndexEngine.getOperation("lr32_system_holes");
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      expect(result.section).toBe("drilling");
      const pitch = result.operation.parameters["pattern"]["pitch"];
      expect(pitch.default).toBe(32);
      expect(pitch.required).toBe(true);
    });

    it("retrieves wood_grain_nest with grain parameter group", () => {
      const result = AlphacamFunctionIndexEngine.getOperation("wood_grain_nest");
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      const grain = result.operation.parameters["grain"];
      expect(grain.withGrainAllowed.default).toBe(true);
      expect(grain.acrossGrainAllowed.default).toBe(false);
    });

    it("returns error for missing operation", () => {
      const result = AlphacamFunctionIndexEngine.getOperation("does_not_exist");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toContain("does_not_exist");
      }
    });

    it("throws on empty id", () => {
      expect(() => AlphacamFunctionIndexEngine.getOperation("")).toThrow();
    });
  });

  describe("getTrainingTopics", () => {
    it("returns LR32 topic for drilling section", () => {
      const topics = AlphacamFunctionIndexEngine.getTrainingTopics("drilling");
      expect(topics.length).toBe(1);
      expect(topics[0].topic).toBe("Alphacam LR32 system discipline");
      expect(topics[0].best_practices.length).toBe(3);
    });

    it("returns wood-nesting topic for nesting section", () => {
      const topics = AlphacamFunctionIndexEngine.getTrainingTopics("nesting");
      expect(topics.length).toBe(1);
      expect(topics[0].key_concepts).toContain("grain direction lock per part");
    });

    it("returns empty array for unknown section", () => {
      expect(AlphacamFunctionIndexEngine.getTrainingTopics("xyz_not_a_section")).toEqual([]);
    });
  });

  describe("parameter values are concrete", () => {
    it("LR32 dowelDiameter default is 8.0mm with depth 30mm", () => {
      const result = AlphacamFunctionIndexEngine.getOperation("dowel_drilling");
      if ("error" in result) throw new Error("dowel_drilling missing");
      const dia = result.operation.parameters["diameter"]["dowelDiameter"];
      expect(dia.default).toBe(8.0);
      const depth = result.operation.parameters["diameter"]["depth"];
      expect(depth.default).toBe(30);
    });

    it("Multi-spindle bank default 8 spindles with 32mm pitch", () => {
      const result = AlphacamFunctionIndexEngine.getOperation("multi_spindle_drill");
      if ("error" in result) throw new Error("multi_spindle_drill missing");
      const sc = result.operation.parameters["bank"]["spindleCount"];
      expect(sc.default).toBe(8);
      expect(sc.range).toEqual([2, 32]);
      const sp = result.operation.parameters["bank"]["spindleSpacing"];
      expect(sp.default).toBe(32);
    });

    it("Aggregate head 100mm Y-offset default", () => {
      const result = AlphacamFunctionIndexEngine.getOperation("aggregate_head");
      if ("error" in result) throw new Error("aggregate_head missing");
      const off = result.operation.parameters["aggregate"]["headOffsetMm"];
      expect(off.default).toBe(100);
      expect(off.unit).toBe("mm");
    });

    it("Laser cut N2 assist gas default at 18 bar", () => {
      const result = AlphacamFunctionIndexEngine.getOperation("laser_sheet_cut");
      if ("error" in result) throw new Error("laser_sheet_cut missing");
      const gas = result.operation.parameters["process"]["assistGas"];
      expect(gas.default).toBe("N2");
      const press = result.operation.parameters["process"]["gasPressure"];
      expect(press.default).toBe(18);
    });

    it("Plasma THC enabled by default at 145V setpoint", () => {
      const result = AlphacamFunctionIndexEngine.getOperation("plasma_sheet_cut");
      if ("error" in result) throw new Error("plasma_sheet_cut missing");
      const thc = result.operation.parameters["height"]["thcEnabled"];
      expect(thc.default).toBe(true);
      const sp = result.operation.parameters["height"]["thcSetpoint"];
      expect(sp.default).toBe(145);
    });

    it("Waterjet quality default Q3_smooth with 5 quality levels", () => {
      const result = AlphacamFunctionIndexEngine.getOperation("waterjet_stone");
      if ("error" in result) throw new Error("waterjet_stone missing");
      const q = result.operation.parameters["strategy"]["qualityLevel"];
      expect(q.default).toBe("Q3_smooth");
      expect(q.values?.length).toBe(5);
    });

    it("Oxy-fuel preheat 6s and pierce 4s defaults", () => {
      const result = AlphacamFunctionIndexEngine.getOperation("oxy_fuel");
      if ("error" in result) throw new Error("oxy_fuel missing");
      const pre = result.operation.parameters["strategy"]["preheatTimeS"];
      expect(pre.default).toBe(6);
      const pi = result.operation.parameters["strategy"]["pierceTimeS"];
      expect(pi.default).toBe(4);
    });

    it("Off-cut yieldImprovementThresh default 5%", () => {
      const result = AlphacamFunctionIndexEngine.getOperation("off_cut_optimize");
      if ("error" in result) throw new Error("off_cut_optimize missing");
      const y = result.operation.parameters["strategy"]["yieldImprovementThresh"];
      expect(y.default).toBe(5);
      expect(y.unit).toBe("percent");
    });
  });
});
