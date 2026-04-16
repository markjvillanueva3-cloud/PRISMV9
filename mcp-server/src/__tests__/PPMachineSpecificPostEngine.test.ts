/**
 * PPMachineSpecificPostEngine Tests — Phase 2+3 Capstone
 */
import { describe, it, expect } from "vitest";
import {
  PPMachineSpecificPostEngine,
  ppMachineSpecificPostEngine,
} from "../engines/PPMachineSpecificPostEngine.js";

describe("PPMachineSpecificPostEngine", () => {
  it("exports singleton", () => {
    expect(ppMachineSpecificPostEngine).toBeInstanceOf(PPMachineSpecificPostEngine);
  });

  describe("listMachines", () => {
    it("lists JM Die machines", () => {
      const machines = ppMachineSpecificPostEngine.listMachines();
      expect(machines.length).toBeGreaterThanOrEqual(9); // 9 machines in registry
    });

    it("includes Haas VF-2", () => {
      const machines = ppMachineSpecificPostEngine.listMachines();
      expect(machines.some(m => m.name.includes("Haas VF-2"))).toBe(true);
    });

    it("includes Hurco VMX", () => {
      const machines = ppMachineSpecificPostEngine.listMachines();
      expect(machines.some(m => m.name.includes("Hurco"))).toBe(true);
    });

    it("includes Okuma lathes", () => {
      const machines = ppMachineSpecificPostEngine.listMachines();
      expect(machines.some(m => m.name.includes("Okuma LB"))).toBe(true);
    });

    it("includes Mitsubishi EDMs", () => {
      const machines = ppMachineSpecificPostEngine.listMachines();
      expect(machines.some(m => m.name.includes("Mitsubishi"))).toBe(true);
    });

    it("includes Roku-Roku", () => {
      const machines = ppMachineSpecificPostEngine.listMachines();
      expect(machines.some(m => m.name.includes("Roku-Roku"))).toBe(true);
    });
  });

  describe("generateConfig — Haas VF-2", () => {
    it("generates valid config", () => {
      const cfg = ppMachineSpecificPostEngine.generateConfig("jmdie-haas-vf2");
      expect(cfg).not.toBeNull();
      expect(cfg!.machine_name).toContain("Haas VF-2");
      expect(cfg!.controller_id).toBe("haas_ngc");
    });

    it("includes program structure", () => {
      const cfg = ppMachineSpecificPostEngine.generateConfig("jmdie-haas-vf2")!;
      expect(cfg.program_start.length).toBeGreaterThan(0);
      expect(cfg.safe_start.length).toBeGreaterThan(0);
      expect(cfg.program_end.length).toBeGreaterThan(0);
    });

    it("includes movement codes", () => {
      const cfg = ppMachineSpecificPostEngine.generateConfig("jmdie-haas-vf2")!;
      expect(cfg.rapid).toBeDefined();
      expect(cfg.linear).toBeDefined();
      expect(cfg.cw_arc).toBeDefined();
    });

    it("includes machine limits", () => {
      const cfg = ppMachineSpecificPostEngine.generateConfig("jmdie-haas-vf2")!;
      expect(cfg.max_rpm).toBe(8100);
      expect(cfg.max_power_kW).toBe(22.4);
      expect(cfg.axis_count).toBe(3);
    });

    it("has TSC coolant", () => {
      const cfg = ppMachineSpecificPostEngine.generateConfig("jmdie-haas-vf2")!;
      expect(cfg.coolant_tsc).toBeDefined();
    });

    it("validated as verified", () => {
      const cfg = ppMachineSpecificPostEngine.generateConfig("jmdie-haas-vf2")!;
      expect(cfg.validation).toBe("verified");
      expect(cfg.source).toContain("JM Die");
    });
  });

  describe("generateConfig — Okuma 5-axis", () => {
    it("includes TCPC for 5-axis", () => {
      const cfg = ppMachineSpecificPostEngine.generateConfig("jmdie-okuma-m460v-5ax");
      expect(cfg).not.toBeNull();
      expect(cfg!.axis_count).toBe(5);
    });

    it("has Okuma controller", () => {
      const cfg = ppMachineSpecificPostEngine.generateConfig("jmdie-okuma-m460v-5ax")!;
      expect(cfg.controller_id).toBe("okuma_osp_p300");
    });
  });

  describe("generateConfig — Roku-Roku", () => {
    it("has Fanuc 31i controller", () => {
      const cfg = ppMachineSpecificPostEngine.generateConfig("jmdie-roku-roku")!;
      expect(cfg.controller_id).toBe("fanuc_31i");
      expect(cfg.max_rpm).toBe(40000);
    });
  });

  describe("generateConfig — Wire EDM", () => {
    it("has 4-axis (UV taper)", () => {
      const cfg = ppMachineSpecificPostEngine.generateConfig("jmdie-mitsubishi-mv1200r")!;
      expect(cfg.axis_count).toBe(4);
      expect(cfg.notes).toContain("Wire EDM");
    });
  });

  describe("generateConfig — unknown", () => {
    it("returns null", () => {
      expect(ppMachineSpecificPostEngine.generateConfig("nonexistent")).toBeNull();
    });
  });

  describe("generateAllConfigs", () => {
    it("generates configs for all machines", () => {
      const all = ppMachineSpecificPostEngine.generateAllConfigs();
      expect(all.length).toBe(ppMachineSpecificPostEngine.getMachineCount());
    });

    it("all configs have required fields", () => {
      const all = ppMachineSpecificPostEngine.generateAllConfigs();
      for (const cfg of all) {
        expect(cfg.machine_id).toBeDefined();
        expect(cfg.controller_id).toBeDefined();
        expect(cfg.max_rpm).toBeGreaterThanOrEqual(0);
        expect(cfg.program_start.length).toBeGreaterThan(0);
      }
    });
  });

  describe("validateForJob", () => {
    it("safe conditions pass", () => {
      const r = ppMachineSpecificPostEngine.validateForJob("jmdie-haas-vf2", {
        spindle_rpm: 5000, feed_mm_min: 500, doc_mm: 2, woc_mm: 5,
        tool_dia_mm: 10, tool_flutes: 4,
      });
      expect(r.safe).toBe(true);
      expect(r.issues.length).toBe(0);
    });

    it("RPM exceeding machine limit flagged", () => {
      const r = ppMachineSpecificPostEngine.validateForJob("jmdie-haas-vf2", {
        spindle_rpm: 10000, feed_mm_min: 500, doc_mm: 2, woc_mm: 5,
        tool_dia_mm: 10, tool_flutes: 4,
      });
      expect(r.safe).toBe(false);
      expect(r.issues.some(i => i.includes("RPM"))).toBe(true);
    });

    it("unknown machine returns unsafe", () => {
      const r = ppMachineSpecificPostEngine.validateForJob("nonexistent", {
        spindle_rpm: 5000, feed_mm_min: 500, doc_mm: 2, woc_mm: 5,
        tool_dia_mm: 10, tool_flutes: 4,
      });
      expect(r.safe).toBe(false);
    });
  });

  describe("getMachine / getMachineCount", () => {
    it("gets machine by ID", () => {
      const m = ppMachineSpecificPostEngine.getMachine("jmdie-haas-vf2");
      expect(m).not.toBeNull();
      expect(m!.machine_name).toContain("Haas");
    });

    it("returns null for unknown", () => {
      expect(ppMachineSpecificPostEngine.getMachine("xyz")).toBeNull();
    });

    it("count matches registry", () => {
      expect(ppMachineSpecificPostEngine.getMachineCount()).toBeGreaterThanOrEqual(9);
    });
  });
});
