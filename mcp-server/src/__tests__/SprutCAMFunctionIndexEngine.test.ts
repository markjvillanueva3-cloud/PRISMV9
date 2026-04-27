/**
 * SprutCAMFunctionIndexEngine tests — CAM-EXHAUST-MS0/U-CAM-FIDX-18
 * Verifies all 4 sections (milling, turning, mill_turn, robot) load with
 * concrete-value assertions. Specialty surfaces validated:
 * getRobotOperations (flagship) + getMillTurnOperations (secondary).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SprutCAMFunctionIndexEngine } from "../engines/SprutCAMFunctionIndexEngine.js";

describe("SprutCAMFunctionIndexEngine", () => {
  beforeEach(() => {
    SprutCAMFunctionIndexEngine.resetCache();
  });

  describe("getIndex", () => {
    it("loads all four sections from data/cam-functions/sprutcam", () => {
      const idx = SprutCAMFunctionIndexEngine.getIndex();
      expect(idx.system_id).toBe("sprutcam");
      expect(Object.keys(idx.sections).sort()).toEqual([
        "mill_turn",
        "milling",
        "robot",
        "turning",
      ]);
    });

    it("aggregates 16 operations across all sections", () => {
      const idx = SprutCAMFunctionIndexEngine.getIndex();
      expect(idx.total_operations).toBe(16);
    });

    it("aggregates parameter totals from per-section summaries", () => {
      const idx = SprutCAMFunctionIndexEngine.getIndex();
      expect(idx.total_parameters).toBe(60 + 56 + 60 + 64);
    });

    it("collects unique categories across sections", () => {
      const idx = SprutCAMFunctionIndexEngine.getIndex();
      expect(idx.categories).toContain("multi_axis_5x");
      expect(idx.categories).toContain("threading");
      expect(idx.categories).toContain("sync_milling");
      expect(idx.categories).toContain("robot_milling");
    });

    it("returns the cached index on subsequent calls", () => {
      const a = SprutCAMFunctionIndexEngine.getIndex();
      const b = SprutCAMFunctionIndexEngine.getIndex();
      expect(a).toBe(b);
    });
  });

  describe("resetCache", () => {
    it("forces re-load of index from disk on next call", () => {
      const before = SprutCAMFunctionIndexEngine.getIndex();
      SprutCAMFunctionIndexEngine.resetCache();
      const after = SprutCAMFunctionIndexEngine.getIndex();
      expect(after).not.toBe(before);
      expect(after.system_id).toBe("sprutcam");
    });
  });

  describe("listSections", () => {
    it("returns the 4 expected section keys", () => {
      expect(SprutCAMFunctionIndexEngine.listSections().sort()).toEqual([
        "mill_turn",
        "milling",
        "robot",
        "turning",
      ]);
    });
  });

  describe("getSection", () => {
    it("returns milling section with multi_axis_5x operation", () => {
      const sec = SprutCAMFunctionIndexEngine.getSection("milling");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.section_key).toBe("milling");
      expect(sec.operations["multi_axis_5x"].category).toBe("multi_axis_5x");
      expect(sec.operations["multi_axis_5x"].display_name).toBe("Multi-Axis 5X");
    });

    it("returns turning section with thread_turn operation", () => {
      const sec = SprutCAMFunctionIndexEngine.getSection("turning");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["thread_turn"].category).toBe("threading");
    });

    it("returns mill_turn section with sub_spindle_handoff op", () => {
      const sec = SprutCAMFunctionIndexEngine.getSection("mill_turn");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["sub_spindle_handoff"].category).toBe("sub_spindle");
      expect(sec.operations["c_axis_polar"].category).toBe("c_axis_polar");
    });

    it("returns robot section with robot_milling flagship op", () => {
      const sec = SprutCAMFunctionIndexEngine.getSection("robot");
      expect("error" in sec).toBe(false);
      if ("error" in sec) return;
      expect(sec.operations["robot_milling"].category).toBe("robot_milling");
      expect(sec.operations["robot_milling"].display_name).toBe("Robot Milling");
    });

    it("returns error object for missing section", () => {
      const sec = SprutCAMFunctionIndexEngine.getSection("non_existent");
      expect("error" in sec).toBe(true);
      if ("error" in sec) {
        expect(sec.error).toContain("non_existent");
        expect(sec.available).toContain("milling");
      }
    });
  });

  describe("listOperations", () => {
    it("returns 16 operations with section and category metadata", () => {
      const ops = SprutCAMFunctionIndexEngine.listOperations();
      expect(ops.length).toBe(16);
      const robot = ops.find((o) => o.operation_id === "robot_milling");
      expect(robot?.section).toBe("robot");
      expect(robot?.category).toBe("robot_milling");
    });

    it("includes the 4 flagship operations", () => {
      const ids = SprutCAMFunctionIndexEngine.listOperations().map((o) => o.operation_id);
      expect(ids).toContain("multi_axis_5x");
      expect(ids).toContain("sub_spindle_handoff");
      expect(ids).toContain("robot_milling");
      expect(ids).toContain("thread_turn");
    });
  });

  describe("findParameter", () => {
    it("finds 'manufacturer' in robot section with KUKA default", () => {
      const hits = SprutCAMFunctionIndexEngine.findParameter("manufacturer");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const robotMfr = hits.find((h) => h.section === "robot");
      expect(robotMfr?.parameter.default).toBe("KUKA");
      expect(robotMfr?.parameter.values).toContain("ABB");
      expect(robotMfr?.parameter.values).toContain("Universal_Robots");
    });

    it("finds 'syncMode' across mill_turn operations", () => {
      const hits = SprutCAMFunctionIndexEngine.findParameter("syncMode");
      expect(hits.length).toBeGreaterThanOrEqual(2);
      for (const h of hits) {
        expect(h.section).toBe("mill_turn");
      }
    });

    it("returns empty array for non-existent parameter", () => {
      const hits = SprutCAMFunctionIndexEngine.findParameter("totally_fake_param_xyz");
      expect(hits).toEqual([]);
    });

    it("throws on empty input", () => {
      expect(() => SprutCAMFunctionIndexEngine.findParameter("")).toThrow();
    });
  });

  describe("searchParameters", () => {
    it("matches 'singularity' across robot operations", () => {
      const hits = SprutCAMFunctionIndexEngine.searchParameters("singularity");
      expect(hits.length).toBeGreaterThanOrEqual(2);
      const robotHits = hits.filter((h) => h.section === "robot");
      expect(robotHits.length).toBeGreaterThanOrEqual(2);
    });

    it("matches 'channel' in description text", () => {
      const hits = SprutCAMFunctionIndexEngine.searchParameters("channel");
      expect(hits.length).toBeGreaterThanOrEqual(1);
      const multiCh = hits.find((h) => h.operation_id === "multi_channel");
      expect(multiCh?.section).toBe("mill_turn");
    });

    it("respects clamp limit of 1", () => {
      const hits = SprutCAMFunctionIndexEngine.searchParameters("depth", 1);
      expect(hits.length).toBe(1);
    });

    it("clamps limit above 500 to 500", () => {
      const hits = SprutCAMFunctionIndexEngine.searchParameters("a", 9999);
      expect(hits.length).toBeLessThanOrEqual(500);
    });

    it("throws on empty query", () => {
      expect(() => SprutCAMFunctionIndexEngine.searchParameters("")).toThrow();
    });
  });

  describe("getOperationsByCategory", () => {
    it("returns multi_axis_5x category single op", () => {
      const hits = SprutCAMFunctionIndexEngine.getOperationsByCategory("multi_axis_5x");
      expect(hits.length).toBe(1);
      expect(hits[0].operation_id).toBe("multi_axis_5x");
    });

    it("returns 4 robot category ops when matching 'robot'", () => {
      const hits = SprutCAMFunctionIndexEngine.getOperationsByCategory("robot");
      expect(hits.length).toBe(4);
      const ids = hits.map((h) => h.operation_id).sort();
      expect(ids).toEqual([
        "robot_calibration",
        "robot_milling",
        "robot_path",
        "robot_simulation",
      ]);
    });

    it("returns threading category single op", () => {
      const hits = SprutCAMFunctionIndexEngine.getOperationsByCategory("threading");
      expect(hits.length).toBe(1);
      expect(hits[0].operation_id).toBe("thread_turn");
    });

    it("returns empty array for unknown category", () => {
      expect(
        SprutCAMFunctionIndexEngine.getOperationsByCategory("totally_unknown_xyz")
      ).toEqual([]);
    });

    it("throws on empty category", () => {
      expect(() => SprutCAMFunctionIndexEngine.getOperationsByCategory("")).toThrow();
    });
  });

  describe("getSummary", () => {
    it("reports 4 sections with correct operation counts", () => {
      const sum = SprutCAMFunctionIndexEngine.getSummary();
      expect(sum.system_id).toBe("sprutcam");
      expect(sum.total_sections).toBe(4);
      expect(sum.total_operations).toBe(16);
      const robot = sum.sections.find((s) => s.key === "robot");
      expect(robot?.operations).toBe(4);
    });
  });

  describe("getRobotOperations", () => {
    it("returns all 4 robot operations", () => {
      const ops = SprutCAMFunctionIndexEngine.getRobotOperations();
      expect(ops.length).toBe(4);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("robot_milling");
      expect(ids).toContain("robot_path");
      expect(ids).toContain("robot_calibration");
      expect(ids).toContain("robot_simulation");
    });

    it("all operations are tagged section=robot", () => {
      const ops = SprutCAMFunctionIndexEngine.getRobotOperations();
      for (const op of ops) {
        expect(op.section).toBe("robot");
      }
    });
  });

  describe("getMillTurnOperations", () => {
    it("returns all 4 mill_turn operations", () => {
      const ops = SprutCAMFunctionIndexEngine.getMillTurnOperations();
      expect(ops.length).toBe(4);
      const ids = ops.map((o) => o.operation_id);
      expect(ids).toContain("sync_milling");
      expect(ids).toContain("c_axis_polar");
      expect(ids).toContain("sub_spindle_handoff");
      expect(ids).toContain("multi_channel");
    });

    it("all operations are tagged section=mill_turn", () => {
      const ops = SprutCAMFunctionIndexEngine.getMillTurnOperations();
      for (const op of ops) {
        expect(op.section).toBe("mill_turn");
      }
    });
  });

  describe("getOperation", () => {
    it("retrieves robot_milling by id", () => {
      const result = SprutCAMFunctionIndexEngine.getOperation("robot_milling");
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      expect(result.section).toBe("robot");
      expect(result.operation.display_name).toBe("Robot Milling");
      expect(result.operation.dialog_tabs).toContain("Robot");
    });

    it("retrieves sub_spindle_handoff with handoff parameter group", () => {
      const result = SprutCAMFunctionIndexEngine.getOperation("sub_spindle_handoff");
      expect("error" in result).toBe(false);
      if ("error" in result) return;
      const handoff = result.operation.parameters["handoff"];
      expect(handoff.subSpindleClampForce.default).toBe(20);
      expect(handoff.subSpindleClampForce.unit).toBe("kN");
    });

    it("returns error for missing operation", () => {
      const result = SprutCAMFunctionIndexEngine.getOperation("does_not_exist");
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toContain("does_not_exist");
      }
    });

    it("throws on empty id", () => {
      expect(() => SprutCAMFunctionIndexEngine.getOperation("")).toThrow();
    });
  });

  describe("getTrainingTopics", () => {
    it("returns robot topic for robot section", () => {
      const topics = SprutCAMFunctionIndexEngine.getTrainingTopics("robot");
      expect(topics.length).toBe(1);
      expect(topics[0].topic).toBe("SprutCAM Robot discipline");
      expect(topics[0].key_concepts).toContain("TCP 4-point vs 5-point calibration");
    });

    it("returns mill-turn topic for mill_turn section", () => {
      const topics = SprutCAMFunctionIndexEngine.getTrainingTopics("mill_turn");
      expect(topics.length).toBe(1);
      expect(topics[0].topic).toBe("SprutCAM mill-turn discipline");
      expect(topics[0].best_practices.length).toBe(3);
    });

    it("returns empty array for unknown section", () => {
      expect(SprutCAMFunctionIndexEngine.getTrainingTopics("xyz_not_a_section")).toEqual([]);
    });
  });

  describe("parameter values are concrete", () => {
    it("Pocket 2.5D rampType default is helix with 4 enum values", () => {
      const result = SprutCAMFunctionIndexEngine.getOperation("pocket_2_5d");
      if ("error" in result) throw new Error("pocket_2_5d missing");
      const rt = result.operation.parameters["parameters"]["rampType"];
      expect(rt.default).toBe("helix");
      expect(rt.values).toEqual(["plunge", "ramp", "helix", "preDrill"]);
    });

    it("Multi-axis 5X tiltAngle defaults to 5deg with [-30, 30] range", () => {
      const result = SprutCAMFunctionIndexEngine.getOperation("multi_axis_5x");
      if ("error" in result) throw new Error("multi_axis_5x missing");
      const ta = result.operation.parameters["toolAxis"]["tiltAngle"];
      expect(ta.default).toBe(5.0);
      expect(ta.unit).toBe("deg");
      expect(ta.range).toEqual([-30, 30]);
    });

    it("Sync milling phaseLockTolerance defaults to 0.05 deg", () => {
      const result = SprutCAMFunctionIndexEngine.getOperation("sync_milling");
      if ("error" in result) throw new Error("sync_milling missing");
      const plt = result.operation.parameters["sync"]["phaseLockTolerance"];
      expect(plt.default).toBe(0.05);
      expect(plt.unit).toBe("deg");
    });

    it("Polar milling feed scales with radius (feedAdaptive=true default)", () => {
      const result = SprutCAMFunctionIndexEngine.getOperation("c_axis_polar");
      if ("error" in result) throw new Error("c_axis_polar missing");
      const fa = result.operation.parameters["strategy"]["feedAdaptive"];
      expect(fa.default).toBe(true);
      expect(fa.type).toBe("boolean");
    });

    it("Multi-channel default channelCount=2 with [1, 4] range", () => {
      const result = SprutCAMFunctionIndexEngine.getOperation("multi_channel");
      if ("error" in result) throw new Error("multi_channel missing");
      const cc = result.operation.parameters["channels"]["channelCount"];
      expect(cc.default).toBe(2);
      expect(cc.range).toEqual([1, 4]);
    });

    it("Robot milling supports 8 manufacturer brands", () => {
      const result = SprutCAMFunctionIndexEngine.getOperation("robot_milling");
      if ("error" in result) throw new Error("robot_milling missing");
      const mfr = result.operation.parameters["robot"]["manufacturer"];
      expect(mfr.values?.length).toBe(8);
      expect(mfr.values).toContain("KUKA");
      expect(mfr.values).toContain("DENSO");
    });

    it("Robot calibration TCP_4point is default with 4 probe count", () => {
      const result = SprutCAMFunctionIndexEngine.getOperation("robot_calibration");
      if ("error" in result) throw new Error("robot_calibration missing");
      const ct = result.operation.parameters["method"]["calibrationType"];
      expect(ct.default).toBe("TCP_4point");
      const pc = result.operation.parameters["probes"]["probeCount"];
      expect(pc.default).toBe(4);
      expect(pc.range).toEqual([3, 12]);
    });

    it("Thread turn cycleType default is G76 with G33/G92/longForm alternatives", () => {
      const result = SprutCAMFunctionIndexEngine.getOperation("thread_turn");
      if ("error" in result) throw new Error("thread_turn missing");
      const ct = result.operation.parameters["passes"]["cycleType"];
      expect(ct.default).toBe("G76");
      expect(ct.values).toContain("G92");
      expect(ct.values).toContain("longForm");
    });
  });
});
