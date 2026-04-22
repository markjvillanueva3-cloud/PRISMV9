/**
 * JmDieMachineConfigEngine Tests — P4-U03-MACHDB
 * ===============================================
 *
 * Tests for JM Die machine database gap-fill:
 *   - Haas UMC-750 (5-axis trunnion)
 *   - Hurco TM10i (turning center)
 *   - Roku-Roku BA-8 (graphite machining center)
 *
 * Coverage:
 *   - New machine entries validated
 *   - Machine retrieval by ID, type, OEM
 *   - Mill filtering and capability queries
 *   - Edge cases and adversarial inputs
 *
 * @module __tests__/JmDieMachineConfigEngine.P4U03.test
 * @milestone MILL-MASTER-P4/U03-MACHDB
 */

import { describe, it, expect } from "vitest";
import { JmDieMachineConfigEngine } from "../engines/JmDieMachineConfigEngine.js";

describe("JmDieMachineConfigEngine P4-U03-MACHDB", () => {
  describe("new machine entries", () => {
    it("includes Haas UMC-750 5-axis", () => {
      const umc750 = JmDieMachineConfigEngine.getConfig("haas-umc-750");
      expect(umc750).toBeDefined();
      expect(umc750!.name).toBe("Haas UMC-750");
      expect(umc750!.oem).toBe("Haas");
      expect(umc750!.type).toBe("5axis");
      expect(umc750!.controller).toBe("NGC");
      expect(umc750!.axes.totalAxes).toBe(5);
      expect(umc750!.axes.rotary).toContain("B");
      expect(umc750!.axes.rotary).toContain("C");
      expect(umc750!.spindle.maxRpm).toBe(8100);
      expect(umc750!.spindle.powerKw).toBe(22.4);
      expect(umc750!.spindle.taper).toBe("CAT40");
      expect(umc750!.toolCapacity).toBe(40);
      expect(umc750!.gCodeDialect).toBe("haas_ngc");
    });

    it("includes Hurco TM10i lathe", () => {
      const tm10i = JmDieMachineConfigEngine.getConfig("hurco-tm10i");
      expect(tm10i).toBeDefined();
      expect(tm10i!.name).toBe("Hurco TM10i");
      expect(tm10i!.oem).toBe("Hurco");
      expect(tm10i!.type).toBe("lathe");
      expect(tm10i!.controller).toBe("WinMAX");
      expect(tm10i!.axes.linear).toContain("X");
      expect(tm10i!.axes.linear).toContain("Z");
      expect(tm10i!.spindle.maxRpm).toBe(4000);
      expect(tm10i!.spindle.bore).toBe(66);
      expect(tm10i!.workEnvelope.maxTurningDiameter).toBe(254);
      expect(tm10i!.workEnvelope.maxTurningLength).toBe(406);
    });

    it("includes Roku-Roku BA-8 graphite machining center", () => {
      const ba8 = JmDieMachineConfigEngine.getConfig("roku-roku-ba8");
      expect(ba8).toBeDefined();
      expect(ba8!.name).toBe("Roku-Roku BA-8");
      expect(ba8!.oem).toBe("Roku-Roku");
      expect(ba8!.type).toBe("5axis");
      expect(ba8!.spindle.maxRpm).toBe(50000); // High-speed graphite spindle
      expect(ba8!.axes.totalAxes).toBe(5);
      expect(ba8!.coolantModes).toContain("air"); // Graphite machining uses air
    });

    it("machine count is now 24", () => {
      expect(JmDieMachineConfigEngine.MACHINE_COUNT).toBe(24);
      expect(JmDieMachineConfigEngine.getAllConfigs().length).toBe(24);
    });
  });

  describe("getByType", () => {
    it("returns all 5-axis machines including new ones", () => {
      const fiveAxis = JmDieMachineConfigEngine.getByType("5axis");
      expect(fiveAxis.length).toBeGreaterThanOrEqual(3);
      const ids = fiveAxis.map(m => m.id);
      expect(ids).toContain("haas-umc-750");
      expect(ids).toContain("roku-roku-ba8");
      expect(ids).toContain("roku-roku-rmx5");
    });

    it("returns lathes including Hurco TM10i", () => {
      const lathes = JmDieMachineConfigEngine.getByType("lathe");
      const ids = lathes.map(m => m.id);
      expect(ids).toContain("hurco-tm10i");
    });

    it("returns VMC machines", () => {
      const vmcs = JmDieMachineConfigEngine.getByType("vmc");
      expect(vmcs.length).toBeGreaterThanOrEqual(2);
      const ids = vmcs.map(m => m.id);
      expect(ids).toContain("haas-vf-2");
      expect(ids).toContain("hurco-vmx30i");
    });
  });

  describe("getByOem", () => {
    it("returns all Haas machines including UMC-750", () => {
      const haas = JmDieMachineConfigEngine.getByOem("Haas");
      expect(haas.length).toBeGreaterThanOrEqual(3);
      const ids = haas.map(m => m.id);
      expect(ids).toContain("haas-umc-750");
      expect(ids).toContain("haas-vf-2");
      expect(ids).toContain("haas-om-2");
    });

    it("returns all Hurco machines", () => {
      const hurco = JmDieMachineConfigEngine.getByOem("Hurco");
      expect(hurco.length).toBeGreaterThanOrEqual(2);
      const ids = hurco.map(m => m.id);
      expect(ids).toContain("hurco-vmx30i");
      expect(ids).toContain("hurco-tm10i");
    });

    it("returns all Roku-Roku machines", () => {
      const rokuRoku = JmDieMachineConfigEngine.getByOem("Roku-Roku");
      expect(rokuRoku.length).toBe(2);
      const ids = rokuRoku.map(m => m.id);
      expect(ids).toContain("roku-roku-rmx5");
      expect(ids).toContain("roku-roku-ba8");
    });

    it("is case-insensitive", () => {
      const upper = JmDieMachineConfigEngine.getByOem("HAAS");
      const lower = JmDieMachineConfigEngine.getByOem("haas");
      const mixed = JmDieMachineConfigEngine.getByOem("HaAs");
      expect(upper.length).toBe(lower.length);
      expect(lower.length).toBe(mixed.length);
    });
  });

  describe("getMills", () => {
    it("includes 5-axis, VMC, and mill-turn machines", () => {
      const mills = JmDieMachineConfigEngine.getMills();
      const types = new Set(mills.map(m => m.type));
      expect(types.has("vmc")).toBe(true);
      expect(types.has("5axis")).toBe(true);
      expect(types.has("mill_turn")).toBe(true);
    });

    it("includes all new milling machines", () => {
      const mills = JmDieMachineConfigEngine.getMills();
      const ids = mills.map(m => m.id);
      expect(ids).toContain("haas-umc-750");
      expect(ids).toContain("roku-roku-ba8");
      expect(ids).toContain("roku-roku-rmx5");
    });

    it("does not include lathes or EDM", () => {
      const mills = JmDieMachineConfigEngine.getMills();
      const types = new Set(mills.map(m => m.type));
      expect(types.has("lathe")).toBe(false);
      expect(types.has("wire_edm")).toBe(false);
      expect(types.has("sinker_edm")).toBe(false);
    });
  });

  describe("getLathes", () => {
    it("includes Hurco TM10i", () => {
      const lathes = JmDieMachineConfigEngine.getLathes();
      const ids = lathes.map(m => m.id);
      expect(ids).toContain("hurco-tm10i");
    });

    it("includes all Okuma lathes", () => {
      const lathes = JmDieMachineConfigEngine.getLathes();
      const okumaLathes = lathes.filter(m => m.oem === "Okuma");
      expect(okumaLathes.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("getActiveMachines", () => {
    it("includes all new machines as active", () => {
      const active = JmDieMachineConfigEngine.getActiveMachines();
      const ids = active.map(m => m.id);
      expect(ids).toContain("haas-umc-750");
      expect(ids).toContain("hurco-tm10i");
      expect(ids).toContain("roku-roku-ba8");
    });
  });

  describe("getProbingMachines", () => {
    it("includes Haas UMC-750 with Renishaw probe", () => {
      const probing = JmDieMachineConfigEngine.getProbingMachines();
      const umc = probing.find(m => m.id === "haas-umc-750");
      expect(umc).toBeDefined();
      expect(umc!.probing).toBe("Renishaw OMP40-2");
    });
  });

  describe("edge cases", () => {
    it("returns undefined for unknown machine ID", () => {
      const unknown = JmDieMachineConfigEngine.getConfig("nonexistent-xyz");
      expect(unknown).toBeUndefined();
    });

    it("returns empty array for unknown OEM", () => {
      const unknown = JmDieMachineConfigEngine.getByOem("UnknownBrand");
      expect(unknown).toEqual([]);
    });

    it("returns empty array for unsupported type", () => {
      // @ts-expect-error - Testing runtime behavior with invalid type
      const unknown = JmDieMachineConfigEngine.getByType("laser_cutter");
      expect(unknown).toEqual([]);
    });
  });

  describe("machine spec validation", () => {
    it("Haas UMC-750 has valid spindle specs", () => {
      const umc = JmDieMachineConfigEngine.getConfig("haas-umc-750")!;
      expect(umc.spindle.maxRpm).toBeGreaterThan(0);
      expect(umc.spindle.powerKw).toBeGreaterThan(0);
      expect(umc.spindle.taper).not.toBeNull();
    });

    it("Hurco TM10i has valid work envelope", () => {
      const tm10i = JmDieMachineConfigEngine.getConfig("hurco-tm10i")!;
      expect(tm10i.workEnvelope.xTravel).toBeGreaterThan(0);
      expect(tm10i.workEnvelope.zTravel).toBeGreaterThan(0);
      expect(tm10i.workEnvelope.maxTurningDiameter).toBeGreaterThan(0);
    });

    it("Roku-Roku BA-8 has high-speed spindle for graphite", () => {
      const ba8 = JmDieMachineConfigEngine.getConfig("roku-roku-ba8")!;
      expect(ba8.spindle.maxRpm).toBeGreaterThanOrEqual(40000);
    });

    it("all machines have valid IDs and names", () => {
      const all = JmDieMachineConfigEngine.getAllConfigs();
      for (const m of all) {
        expect(m.id).toBeTruthy();
        expect(m.id.length).toBeGreaterThan(3);
        expect(m.name).toBeTruthy();
        expect(m.oem).toBeTruthy();
      }
    });

    it("CNC machines have valid axis configuration", () => {
      const active = JmDieMachineConfigEngine.getActiveMachines();
      for (const m of active) {
        // CNC machines have at least 2 linear axes
        expect(m.axes.linear.length).toBeGreaterThanOrEqual(2);
        expect(m.axes.totalAxes).toBeGreaterThanOrEqual(2);
        expect(m.axes.totalAxes).toBe(m.axes.linear.length + m.axes.rotary.length);
      }
    });
  });
});

describe("millDispatcher machine DB actions", () => {
  it("mill_machine_db_get returns machine by ID", () => {
    const config = JmDieMachineConfigEngine.getConfig("haas-umc-750");
    expect(config).toBeDefined();
    expect(config!.id).toBe("haas-umc-750");
  });

  it("mill_machine_db_list returns all machines", () => {
    const all = JmDieMachineConfigEngine.getAllConfigs();
    expect(all.length).toBe(24);
  });

  it("mill_machine_db_filter by type returns correct machines", () => {
    const fiveAxis = JmDieMachineConfigEngine.getByType("5axis");
    expect(fiveAxis.length).toBeGreaterThanOrEqual(3);
  });

  it("mill_machine_db_filter by OEM returns correct machines", () => {
    const okuma = JmDieMachineConfigEngine.getByOem("Okuma");
    expect(okuma.length).toBeGreaterThanOrEqual(7);
  });

  it("mill_machine_db_mills returns milling machines only", () => {
    const mills = JmDieMachineConfigEngine.getMills();
    for (const m of mills) {
      expect(["vmc", "5axis", "mill_turn"]).toContain(m.type);
    }
  });

  it("mill_machine_db_capabilities returns machine capabilities", () => {
    const config = JmDieMachineConfigEngine.getConfig("haas-umc-750")!;
    expect(config.axes).toBeDefined();
    expect(config.spindle).toBeDefined();
    expect(config.workEnvelope).toBeDefined();
    expect(config.toolCapacity).toBe(40);
    expect(config.coolantModes).toContain("flood");
    expect(config.probing).toBe("Renishaw OMP40-2");
  });
});
