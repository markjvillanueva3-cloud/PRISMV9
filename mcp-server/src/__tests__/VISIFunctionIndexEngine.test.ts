/**
 * VISIFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM-FIDX-20
 * VISI is the most comprehensive FIDX (5 sections, 20 ops, 296 params)
 * covering Hexagon's premium mold/die CAD+CAM suite (VISI Mould +
 * VISI Electrode + VISI Progress + VISI Compass).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { VISIFunctionIndexEngine } from "../engines/VISIFunctionIndexEngine.js";

describe("VISIFunctionIndexEngine", () => {
  beforeEach(() => {
    VISIFunctionIndexEngine.resetCache();
  });

  describe("getIndex", () => {
    it("loads all five sections from data/cam-functions/visi", () => {
      const idx = VISIFunctionIndexEngine.getIndex();
      expect(idx.system_id).toBe("visi");
      expect(Object.keys(idx.sections).sort()).toEqual([
        "electrode",
        "milling",
        "mold_design",
        "mold_machining",
        "progressive_die",
      ]);
    });

    it("aggregates 20 operations across 5 sections", () => {
      const idx = VISIFunctionIndexEngine.getIndex();
      expect(idx.total_operations).toBe(20);
    });

    it("aggregates 296 parameters from per-section summaries", () => {
      const idx = VISIFunctionIndexEngine.getIndex();
      expect(idx.total_parameters).toBe(56 + 60 + 64 + 60 + 56);
    });

    it("collects unique categories across sections", () => {
      const idx = VISIFunctionIndexEngine.getIndex();
      expect(idx.categories).toContain("cavity_roughing");
      expect(idx.categories).toContain("mold_base");
      expect(idx.categories).toContain("strip_layout");
      expect(idx.categories).toContain("electrode_extract");
      expect(idx.categories).toContain("multi_axis_5x");
    });

    it("returns the cached index on subsequent calls", () => {
      const a = VISIFunctionIndexEngine.getIndex();
      const b = VISIFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });
  });

  describe("resetCache", () => {
    it("forces re-load of index from disk on next call", () => {
      const before = VISIFunctionIndexEngine.getIndex();
      VISIFunctionIndexEngine.resetCache();
      const after = VISIFunctionIndexEngine.getIndex();
      expect(after).not.toBe(before);
      expect(after.system_id).toBe("visi");
    });
  });

  describe("listSections", () => {
    it("returns the 5 expected section keys", () => {
      expect(VISIFunctionIndexEngine.listSections().sort()).toEqual([
        "electrode",
        "milling",
        "mold_design",
        "mold_machining",
        "progressive_die",
      ]);
    });
  });

  describe("getSection", () => {
    it("returns mold_machining section with cavity_roughing op", () => {
      const sec = VISIFunctionIndexEngine.getSection("mold_machining");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.section_key).toBe("mold_machining");
      expect(sec.operations["cavity_roughing"].category).toBe("cavity_roughing");
      expect(sec.operations["lettering"].category).toBe("lettering");
    });

    it("returns mold_design section with mold_base_select flagship", () => {
      const sec = VISIFunctionIndexEngine.getSection("mold_design");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["mold_base_select"].category).toBe("mold_base");
      expect(sec.operations["mold_base_select"].display_name).toBe("Mold Base Selection");
    });

    it("returns progressive_die section with strip_layout flagship", () => {
      const sec = VISIFunctionIndexEngine.getSection("progressive_die");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["strip_layout"].category).toBe("strip_layout");
    });

    it("returns electrode section with electrode_extract flagship", () => {
      const sec = VISIFunctionIndexEngine.getSection("electrode");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["electrode_extract"].category).toBe("electrode_extract");
    });

    it("returns error object for missing section", () => {
      const sec = VISIFunctionIndexEngine.getSection("non_existent");
      expect("error" in sec).toBe(true);
      if ("error" in sec) {
        expect(sec.error).toContain("non_existent");
        expect(sec.available).toContain("milling");
      }
    });
  });

  describe("listOperations", () => {
    it("returns 20 operations with section and category metadata", () => {
      const ops = VISIFunctionIndexEngine.listOperations();
      expect(ops.length).toBe(20);
      const stripOp = ops.find((o) => o.operation_id === "strip_layout");
      expect(stripOp?.section).toBe("progressive_die");
      expect(stripOp?.category).toBe("strip_layout");
    });

    it("includes all 5 flagship operations", () => {
      const ids = VISIFunctionIndexEngine.listOperations().map((o) => o.operation_id);
      expect(ids).toContain("cavity_roughing");
      expect(ids).toContain("mold_base_select");
      expect(ids).toContain("strip_layout");
      expect(ids).toContain("electrode_extract");
      expect(ids).toContain("multi_axis_5x");
    });
  });

  describe("findParameter", () => {
    it("finds 'library' in mold_design with DME default + 7 vendor enum", () => {
      const hits = VISIFunctionIndexEngine.findParameter("library");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const moldBase = hits.find((h) => h.operation_id === "mold_base_select" && h.parameter.default === "DME");
      expect(moldBase?.section).toBe("mold_design");
      expect(moldBase?.parameter.values).toContain("HASCO");
      expect(moldBase?.parameter.values).toContain("Meusburger");
    });

    it("finds 'shankAttachment' in electrode with EROWA default", () => {
      const hits = VISIFunctionIndexEngine.findParameter("shankAttachment");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const eroWa = hits.find((h) => h.parameter.default === "EROWA");
      expect(eroWa?.section).toBe("electrode");
    });

    it("returns empty array for non-existent parameter", () => {
      const hits = VISIFunctionIndexEngine.findParameter("totally_fake_param_xyz");
      expect(hits).toEqual([]);
    });

    it("throws on empty input", () => {
      expect(() => VISIFunctionIndexEngine.findParameter("")).toThrow();
    });
  });

  describe("searchParameters", () => {
    it("matches 'orbit' across electrode operations", () => {
      const hits = VISIFunctionIndexEngine.searchParameters("orbit");
      expect(hits.length).toBeGreaterThanOrEqual(3);
      const names = new Set(hits.map((h) => h.parameter_name));
      expect(names.has("roughOrbit")).toBe(true);
      expect(names.has("finishOrbit")).toBe(true);
    });

    it("matches 'channel' across cooling_circuit and runner ops", () => {
      const hits = VISIFunctionIndexEngine.searchParameters("channel");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const mdHits = hits.filter((h) => h.section === "mold_design");
      expect(mdHits.length).toBeGreaterThanOrEqual(1);
    });

    it("respects clamp limit of 1", () => {
      const hits = VISIFunctionIndexEngine.searchParameters("depth", 1);
      expect(hits.length).toBe(1);
    });

    it("clamps limit above 500 to 500", () => {
      const hits = VISIFunctionIndexEngine.searchParameters("a", 9999);
      expect(hits.length).toBeLessThanOrEqual(500);
    });

    it("throws on empty query", () => {
      expect(() => VISIFunctionIndexEngine.searchParameters("")).toThrow();
    });
  });

  describe("getOperationsByCategory", () => {
    it("returns mold_base category single op", () => {
      const hits = VISIFunctionIndexEngine.getOperationsByCategory("mold_base");
      expect(hits.length).toBe(1);
      expect(hits[0].operation_id).toBe("mold_base_select");
    });

    it("returns electrode_extract category single op", () => {
      const hits = VISIFunctionIndexEngine.getOperationsByCategory("electrode_extract");
      expect(hits.length).toBe(1);
      expect(hits[0].operation_id).toBe("electrode_extract");
    });

    it("returns strip_layout category single op", () => {
      const hits = VISIFunctionIndexEngine.getOperationsByCategory("strip_layout");
      expect(hits.length).toBe(1);
      expect(hits[0].operation_id).toBe("strip_layout");
    });

    it("returns empty array for unknown category", () => {
      expect(
        VISIFunctionIndexEngine.getOperationsByCategory("totally_unknown_xyz")
      ).toEqual([]);
    });

    it("throws on empty category", () => {
      expect(() => VISIFunctionIndexEngine.getOperationsByCategory("")).toThrow();
    });
  });

  describe("getSummary", () => {
    it("reports 5 sections with correct operation counts", () => {
      const sum = VISIFunctionIndexEngine.getSummary();
      expect(sum.system_id).toBe("visi");
      expect(sum.total_sections).toBe(5);
      expect(sum.total_operations).toBe(20);
      const milling = sum.sections.find((s) => s.key === "milling");
      expect(milling?.operations).toBe(4);
    });
  });

  describe("getMoldOperations", () => {
    it("returns 12 operations across mold_machining + mold_design + electrode", () => {
      const ops = VISIFunctionIndexEngine.getMoldOperations();
      expect(ops.length).toBe(12);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("cavity_roughing");
      expect(ids).toContain("mold_base_select");
      expect(ids).toContain("electrode_extract");
    });
  });

  describe("getProgressiveDieOperations", () => {
    it("returns all 4 progressive_die operations", () => {
      const ops = VISIFunctionIndexEngine.getProgressiveDieOperations();
      expect(ops.length).toBe(4);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("strip_layout");
      expect(ids).toContain("blanking_punch");
      expect(ids).toContain("forming_die");
      expect(ids).toContain("transfer_die");
    });

    it("all operations are tagged section=progressive_die", () => {
      const ops = VISIFunctionIndexEngine.getProgressiveDieOperations();
      for (const op of ops) {
        expect(op.section).toBe("progressive_die");
      }
    });
  });

  describe("getOperation", () => {
    it("retrieves strip_layout by id", () => {
      const result = VISIFunctionIndexEngine.getOperation("strip_layout");
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      expect(result.section).toBe("progressive_die");
      expect(result.operation.display_name).toBe("Strip Layout (VISI Progress)");
    });

    it("retrieves mold_base_select with library parameter group", () => {
      const result = VISIFunctionIndexEngine.getOperation("mold_base_select");
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      const lib = result.operation.parameters["library"];
      expect(lib.library.default).toBe("DME");
      expect(lib.moldType.default).toBe("2plate");
      expect(lib.guidanceType.default).toBe("standard_pillars");
    });

    it("returns error for missing operation", () => {
      const result = VISIFunctionIndexEngine.getOperation("does_not_exist");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toContain("does_not_exist");
      }
    });

    it("throws on empty id", () => {
      expect(() => VISIFunctionIndexEngine.getOperation("")).toThrow();
    });
  });

  describe("getTrainingTopics", () => {
    it("returns mold-machining topic for mold_machining section", () => {
      const topics = VISIFunctionIndexEngine.getTrainingTopics("mold_machining");
      expect(topics.length).toBe(1);
      expect(topics[0].topic).toBe("VISI mold-machining discipline");
      expect(topics[0].key_concepts).toContain("trochoidal corners on hardened steel");
    });

    it("returns Progress die topic for progressive_die section", () => {
      const topics = VISIFunctionIndexEngine.getTrainingTopics("progressive_die");
      expect(topics.length).toBe(1);
      expect(topics[0].topic).toBe("VISI Progress die discipline");
      expect(topics[0].best_practices.length).toBe(3);
    });

    it("returns empty array for unknown section", () => {
      expect(VISIFunctionIndexEngine.getTrainingTopics("xyz_not_a_section")).toEqual([]);
    });
  });

  describe("parameter values are concrete", () => {
    it("Cavity roughing trochoidal corners enabled by default", () => {
      const result = VISIFunctionIndexEngine.getOperation("cavity_roughing");
      if ("error" in result) throw new Error("cavity_roughing missing");
      const tc = result.operation.parameters["strategy"]["trochoidalCorners"];
      expect(tc.default).toBe(true);
      const tr = result.operation.parameters["strategy"]["trochoidalRadius"];
      expect(tr.default).toBe(1.0);
    });

    it("Mold base wallThickMin=30mm topClearance=50mm defaults", () => {
      const result = VISIFunctionIndexEngine.getOperation("mold_base_select");
      if ("error" in result) throw new Error("mold_base_select missing");
      const wt = result.operation.parameters["size"]["wallThickMin"];
      expect(wt.default).toBe(30);
      expect(wt.unit).toBe("mm");
      const tc = result.operation.parameters["size"]["topClearance"];
      expect(tc.default).toBe(50);
    });

    it("Cooling channel-to-cavity min 15mm", () => {
      const result = VISIFunctionIndexEngine.getOperation("cooling_circuit");
      if ("error" in result) throw new Error("cooling_circuit missing");
      const c2c = result.operation.parameters["channel"]["channelToCavityMin"];
      expect(c2c.default).toBe(15);
      expect(c2c.unit).toBe("mm");
    });

    it("Strip layout default 8 stations with 1 idle", () => {
      const result = VISIFunctionIndexEngine.getOperation("strip_layout");
      if ("error" in result) throw new Error("strip_layout missing");
      const sc = result.operation.parameters["stations"]["stationCount"];
      expect(sc.default).toBe(8);
      const idle = result.operation.parameters["stations"]["idleStations"];
      expect(idle.default).toBe(1);
    });

    it("Punch clearance default 8 percent with [3, 15] range", () => {
      const result = VISIFunctionIndexEngine.getOperation("blanking_punch");
      if ("error" in result) throw new Error("blanking_punch missing");
      const pc = result.operation.parameters["clearance"]["clearancePerSide"];
      expect(pc.default).toBe(8);
      expect(pc.unit).toBe("percent_of_thk");
      expect(pc.range).toEqual([3, 15]);
    });

    it("Electrode extract maxAspectRatio default 6", () => {
      const result = VISIFunctionIndexEngine.getOperation("electrode_extract");
      if ("error" in result) throw new Error("electrode_extract missing");
      const ar = result.operation.parameters["extract"]["maxAspectRatio"];
      expect(ar.default).toBe(6);
    });

    it("EDM polarity default is alternate for electrode life", () => {
      const result = VISIFunctionIndexEngine.getOperation("edm_setup");
      if ("error" in result) throw new Error("edm_setup missing");
      const pol = result.operation.parameters["burn"]["polarityPattern"];
      expect(pol.default).toBe("alternate");
      expect(pol.values).toContain("positive");
    });

    it("Lettering 60deg v-bit is default", () => {
      const result = VISIFunctionIndexEngine.getOperation("lettering");
      if ("error" in result) throw new Error("lettering missing");
      const va = result.operation.parameters["strategy"]["vBitAngle"];
      expect(va.default).toBe(60);
    });

    it("Forming die K-factor default 0.42 with [0.3, 0.5] range", () => {
      const result = VISIFunctionIndexEngine.getOperation("forming_die");
      if ("error" in result) throw new Error("forming_die missing");
      const k = result.operation.parameters["geometry"]["kFactor"];
      expect(k.default).toBe(0.42);
      expect(k.range).toEqual([0.3, 0.5]);
    });
  });
});
