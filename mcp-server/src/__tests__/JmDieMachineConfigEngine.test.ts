/**
 * JmDieMachineConfigEngine — Tests
 * RES-MS13: Validates hardcoded OEM machine configs for all 21 JM Die machines
 */

import { describe, it, expect } from "vitest";
import {
  JmDieMachineConfigEngine,
  type MachineConfig,
} from "../engines/JmDieMachineConfigEngine.js";

describe("JmDieMachineConfigEngine", () => {
  // ==========================================================================
  // MACHINE COUNT & COMPLETENESS
  // ==========================================================================
  describe("getAllConfigs()", () => {
    it("returns exactly 21 machines", () => {
      expect(JmDieMachineConfigEngine.getAllConfigs().length).toBe(21);
    });

    it("MACHINE_COUNT constant matches actual array length", () => {
      expect(JmDieMachineConfigEngine.MACHINE_COUNT).toBe(
        JmDieMachineConfigEngine.getAllConfigs().length
      );
    });

    it("all machines have unique IDs", () => {
      const configs = JmDieMachineConfigEngine.getAllConfigs();
      const ids = configs.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("all machines have non-empty name and model", () => {
      for (const m of JmDieMachineConfigEngine.getAllConfigs()) {
        expect(m.name.length).toBeGreaterThan(0);
        expect(m.model.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // OEM DISTRIBUTION
  // ==========================================================================
  describe("getByOem()", () => {
    it("finds 8 Okuma machines (7 lathes + MB-56VA)", () => {
      expect(JmDieMachineConfigEngine.getByOem("Okuma").length).toBe(8);
    });

    it("finds 2 Haas machines (VF-2, OM-2)", () => {
      expect(JmDieMachineConfigEngine.getByOem("Haas").length).toBe(2);
    });

    it("finds 3 Mitsubishi machines (FA10S, EA12V, EA8S)", () => {
      expect(JmDieMachineConfigEngine.getByOem("Mitsubishi").length).toBe(3);
    });

    it("finds 1 Hurco machine (VMX30i)", () => {
      expect(JmDieMachineConfigEngine.getByOem("Hurco").length).toBe(1);
    });

    it("finds 1 Roku-Roku machine (RMX-5)", () => {
      expect(JmDieMachineConfigEngine.getByOem("Roku-Roku").length).toBe(1);
    });

    it("case-insensitive OEM search", () => {
      expect(JmDieMachineConfigEngine.getByOem("okuma").length).toBe(8);
      expect(JmDieMachineConfigEngine.getByOem("HAAS").length).toBe(2);
    });
  });

  // ==========================================================================
  // TYPE CLASSIFICATION
  // ==========================================================================
  describe("getByType()", () => {
    it("finds 6 lathes (excludes mill-turn and manual lathes)", () => {
      expect(JmDieMachineConfigEngine.getByType("lathe").length).toBe(6);
    });

    it("finds 4 VMCs", () => {
      expect(JmDieMachineConfigEngine.getByType("vmc").length).toBe(4);
    });

    it("finds 1 mill-turn (Multus B250)", () => {
      expect(JmDieMachineConfigEngine.getByType("mill_turn").length).toBe(1);
    });

    it("finds 1 wire EDM (FA10S)", () => {
      expect(JmDieMachineConfigEngine.getByType("wire_edm").length).toBe(1);
    });

    it("finds 2 sinker EDMs (EA12V, EA8S)", () => {
      expect(JmDieMachineConfigEngine.getByType("sinker_edm").length).toBe(2);
    });

    it("finds 1 five-axis machine (Roku-Roku RMX-5)", () => {
      expect(JmDieMachineConfigEngine.getByType("5axis").length).toBe(1);
    });

    it("finds 3 grinders", () => {
      expect(JmDieMachineConfigEngine.getByType("grinder").length).toBe(3);
    });

    it("finds 2 manual lathes", () => {
      expect(JmDieMachineConfigEngine.getByType("manual_lathe").length).toBe(2);
    });

    it("finds 1 saw", () => {
      expect(JmDieMachineConfigEngine.getByType("saw").length).toBe(1);
    });
  });

  // ==========================================================================
  // CONVENIENCE FILTERS
  // ==========================================================================
  describe("getLathes()", () => {
    it("returns 6 CNC lathes (excludes manual and mill-turn)", () => {
      const lathes = JmDieMachineConfigEngine.getLathes();
      expect(lathes.length).toBe(6);
      for (const l of lathes) {
        expect(l.type).toBe("lathe");
      }
    });
  });

  describe("getMills()", () => {
    it("returns 6 milling machines (4 VMC + 1 mill-turn + 1 5axis)", () => {
      const mills = JmDieMachineConfigEngine.getMills();
      expect(mills.length).toBe(6);
      for (const m of mills) {
        expect(["vmc", "5axis", "mill_turn"]).toContain(m.type);
      }
    });
  });

  describe("getEdmMachines()", () => {
    it("returns 3 EDM machines (1 wire + 2 sinker)", () => {
      const edm = JmDieMachineConfigEngine.getEdmMachines();
      expect(edm.length).toBe(3);
      for (const e of edm) {
        expect(["wire_edm", "sinker_edm"]).toContain(e.type);
      }
    });
  });

  describe("getSupportMachines()", () => {
    it("returns 6 support machines", () => {
      expect(JmDieMachineConfigEngine.getSupportMachines().length).toBe(6);
    });
  });

  describe("getActiveMachines()", () => {
    it("returns 15 active CNC machines", () => {
      expect(JmDieMachineConfigEngine.getActiveMachines().length).toBe(15);
    });

    it("active + support = 21 total", () => {
      const active = JmDieMachineConfigEngine.getActiveMachines().length;
      const support = JmDieMachineConfigEngine.getSupportMachines().length;
      expect(active + support).toBe(21);
    });
  });

  describe("getProbingMachines()", () => {
    it("returns 3 machines with probing", () => {
      const probing = JmDieMachineConfigEngine.getProbingMachines();
      expect(probing.length).toBe(3);
    });

    it("Haas VF-2 has Renishaw EP+IP", () => {
      const vf2 = JmDieMachineConfigEngine.getConfig("haas-vf-2");
      expect(vf2?.probing).toBe("Renishaw EP+IP");
    });

    it("Hurco VMX30i has Renishaw EP+IP", () => {
      const hurco = JmDieMachineConfigEngine.getConfig("hurco-vmx30i");
      expect(hurco?.probing).toBe("Renishaw EP+IP");
    });

    it("Roku-Roku RMX-5 has Blum Quickstart", () => {
      const roku = JmDieMachineConfigEngine.getConfig("roku-roku-rmx5");
      expect(roku?.probing).toBe("Blum Quickstart");
    });
  });

  // ==========================================================================
  // SPECIFIC MACHINE CONFIGS
  // ==========================================================================
  describe("getConfig() — specific machines", () => {
    it("returns undefined for unknown ID", () => {
      expect(JmDieMachineConfigEngine.getConfig("nonexistent")).toBeUndefined();
    });

    it("Okuma GENOS L300 — 2-axis lathe, OSP controller", () => {
      const m = JmDieMachineConfigEngine.getConfig("okuma-genos-l300")!;
      expect(m.oem).toBe("Okuma");
      expect(m.type).toBe("lathe");
      expect(m.controller).toBe("OSP-P300L");
      expect(m.axes.totalAxes).toBe(2);
      expect(m.spindle.maxRpm).toBe(4500);
      expect(m.toolCapacity).toBe(12);
      expect(m.gCodeDialect).toBe("okuma_osp");
    });

    it("Okuma Multus B250 — 4-axis mill-turn, 7 coolant modes", () => {
      const m = JmDieMachineConfigEngine.getConfig("okuma-multus-b250")!;
      expect(m.type).toBe("mill_turn");
      expect(m.axes.linear).toEqual(["X", "Y", "Z"]);
      expect(m.axes.rotary).toEqual(["C"]);
      expect(m.axes.totalAxes).toBe(4);
      expect(m.coolantModes.length).toBe(7);
      expect(m.toolCapacity).toBe(32);
    });

    it("Haas VF-2 — CAT40 taper, NGC controller", () => {
      const m = JmDieMachineConfigEngine.getConfig("haas-vf-2")!;
      expect(m.spindle.taper).toBe("CAT40");
      expect(m.controller).toBe("NGC");
      expect(m.spindle.maxRpm).toBe(8100);
      expect(m.toolCapacity).toBe(20);
    });

    it("Haas OM-2 — 30000 RPM office mill, BT30 taper", () => {
      const m = JmDieMachineConfigEngine.getConfig("haas-om-2")!;
      expect(m.spindle.maxRpm).toBe(30000);
      expect(m.spindle.taper).toBe("BT30");
      expect(m.toolCapacity).toBe(10);
    });

    it("Roku-Roku RMX-5 — 5-axis, 40000 RPM, HSK-E25", () => {
      const m = JmDieMachineConfigEngine.getConfig("roku-roku-rmx5")!;
      expect(m.type).toBe("5axis");
      expect(m.axes.rotary).toEqual(["A", "B"]);
      expect(m.axes.totalAxes).toBe(5);
      expect(m.spindle.maxRpm).toBe(40000);
      expect(m.spindle.taper).toBe("HSK-E25");
    });

    it("Mitsubishi FA10S — wire EDM, 5 axes (X/Y/Z/U/V)", () => {
      const m = JmDieMachineConfigEngine.getConfig("mitsubishi-fa10s")!;
      expect(m.type).toBe("wire_edm");
      expect(m.axes.linear).toEqual(["X", "Y", "Z", "U", "V"]);
      expect(m.axes.totalAxes).toBe(5);
      expect(m.coolantModes).toContain("deionized_water");
    });

    it("Hurco VMX30i — BT40 taper, WinMAX controller, Fanuc G-code", () => {
      const m = JmDieMachineConfigEngine.getConfig("hurco-vmx30i")!;
      expect(m.spindle.taper).toBe("BT40");
      expect(m.controller).toBe("WinMAX");
      expect(m.gCodeDialect).toBe("fanuc");
      expect(m.spindle.maxRpm).toBe(12000);
    });
  });

  // ==========================================================================
  // AXIS CONFIGURATION VALIDATION
  // ==========================================================================
  describe("axis configurations", () => {
    it("all lathes have X and Z axes", () => {
      for (const m of JmDieMachineConfigEngine.getLathes()) {
        expect(m.axes.linear).toContain("X");
        expect(m.axes.linear).toContain("Z");
      }
    });

    it("all VMCs have X, Y, Z axes", () => {
      for (const m of JmDieMachineConfigEngine.getByType("vmc")) {
        expect(m.axes.linear).toContain("X");
        expect(m.axes.linear).toContain("Y");
        expect(m.axes.linear).toContain("Z");
      }
    });

    it("EDM machines have 0 RPM spindle", () => {
      for (const m of JmDieMachineConfigEngine.getEdmMachines()) {
        expect(m.spindle.maxRpm).toBe(0);
      }
    });

    it("totalAxes matches linear + rotary count", () => {
      for (const m of JmDieMachineConfigEngine.getAllConfigs()) {
        expect(m.axes.totalAxes).toBe(
          m.axes.linear.length + m.axes.rotary.length
        );
      }
    });
  });

  // ==========================================================================
  // POST PROCESSOR & G-CODE DIALECTS
  // ==========================================================================
  describe("post processors", () => {
    it("all Okuma machines use okuma_osp dialect", () => {
      for (const m of JmDieMachineConfigEngine.getByOem("Okuma")) {
        expect(m.gCodeDialect).toBe("okuma_osp");
      }
    });

    it("Haas machines use haas_ngc dialect", () => {
      for (const m of JmDieMachineConfigEngine.getByOem("Haas")) {
        expect(m.gCodeDialect).toBe("haas_ngc");
      }
    });

    it("support machines have 'none' dialect", () => {
      for (const m of JmDieMachineConfigEngine.getSupportMachines()) {
        expect(m.gCodeDialect).toBe("none");
      }
    });

    it("active machines with CPS posts have .cps extension", () => {
      for (const m of JmDieMachineConfigEngine.getActiveMachines()) {
        if (m.postProcessor) {
          expect(m.postProcessor).toMatch(/\.cps$/);
        }
      }
    });
  });
});
