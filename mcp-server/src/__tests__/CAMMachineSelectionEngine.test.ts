/**
 * CAMMachineSelectionEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-MACHINE
 */
import { describe, it, expect } from "vitest";
import { CAMMachineSelectionEngine } from "../engines/CAMMachineSelectionEngine.js";
import type { MachineInventoryEntry } from "../engines/CAMMachineSelectionEngine.js";

const engine = new CAMMachineSelectionEngine();

const INVENTORY: MachineInventoryEntry[] = [
  { id: "HAAS_VF2",    machineClass: "vmc_3axis", hourlyRate: 85, busy: false },
  { id: "MORI_NMV5000",machineClass: "vmc_5axis", hourlyRate: 165, busy: false },
  { id: "OKUMA_LB45",  machineClass: "lathe",     hourlyRate: 110, busy: false },
  { id: "MAKINO_HMC",  machineClass: "hmc",       hourlyRate: 145, busy: true  },
  { id: "AGIE_WIRE",   machineClass: "wire_edm",  hourlyRate: 95,  busy: false },
  { id: "TRUMPF_LASER",machineClass: "laser",     hourlyRate: 200, busy: false },
];

describe("CAMMachineSelectionEngine", () => {

  it("ranks vmc_5axis highest for swarf_5axis op", () => {
    const r = engine.rank("swarf_5axis", INVENTORY);
    expect(r.bestMachineId).toBe("MORI_NMV5000");
    expect(r.candidates[0].machineClass).toBe("vmc_5axis");
  });

  it("ranks vmc_3axis highest for face op (3-axis) — cheap + available", () => {
    const r = engine.rank("face", INVENTORY);
    expect(r.bestMachineId).toBe("HAAS_VF2");
  });

  it("ranks lathe highest for turn_rough op", () => {
    const r = engine.rank("turn_rough", INVENTORY);
    expect(r.bestMachineId).toBe("OKUMA_LB45");
  });

  it("ranks wire_edm highest for wedm_2axis op", () => {
    const r = engine.rank("wedm_2axis", INVENTORY);
    expect(r.bestMachineId).toBe("AGIE_WIRE");
  });

  it("ranks laser highest for laser_cut op", () => {
    const r = engine.rank("laser_cut", INVENTORY);
    expect(r.bestMachineId).toBe("TRUMPF_LASER");
  });

  it("busy machines score -3 vs available — affects ranking only on tiebreaks", () => {
    // Add a 2nd HMC machine that's available; the busy one should rank lower
    const inv: MachineInventoryEntry[] = [
      { id: "MAKINO_HMC",  machineClass: "hmc", hourlyRate: 145, busy: true  },
      { id: "MAKINO_HMC_2",machineClass: "hmc", hourlyRate: 150, busy: false },
    ];
    const r = engine.rank("face", inv);
    expect(r.bestMachineId).toBe("MAKINO_HMC_2");
  });

  it("hourly-rate penalty kicks in when family + axis are tied", () => {
    const inv: MachineInventoryEntry[] = [
      { id: "VMC_CHEAP", machineClass: "vmc_3axis", hourlyRate: 60,  busy: false },
      { id: "VMC_EXPENSIVE", machineClass: "vmc_3axis", hourlyRate: 200, busy: false },
    ];
    const r = engine.rank("face", inv);
    expect(r.bestMachineId).toBe("VMC_CHEAP");
  });

  it("candidates always sorted by descending score", () => {
    const r = engine.rank("face", INVENTORY);
    for (let i = 1; i < r.candidates.length; i++) {
      expect(r.candidates[i - 1].score).toBeGreaterThanOrEqual(r.candidates[i].score);
    }
  });

  it("empty inventory returns null bestMachineId + empty candidates", () => {
    const r = engine.rank("face", []);
    expect(r.bestMachineId).toBeNull();
    expect(r.candidates).toEqual([]);
  });

  it("no-match inventory (all wrong class) returns null bestMachineId", () => {
    const inv: MachineInventoryEntry[] = [
      { id: "LASER1",  machineClass: "laser",     hourlyRate: 200, busy: false },
      { id: "WATER1",  machineClass: "waterjet",  hourlyRate: 180, busy: false },
    ];
    const r = engine.rank("turn_rough", inv);
    expect(r.bestMachineId).toBeNull();
  });

  it("classes() returns all 12 MachineClass values", () => {
    const c = engine.classes();
    expect(c.length).toBe(12);
    expect(c).toContain("vmc_5axis");
    expect(c).toContain("wire_edm");
    expect(c).toContain("additive");
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes rank + classes", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("rank");
    expect(names).toContain("classes");
  });
});
