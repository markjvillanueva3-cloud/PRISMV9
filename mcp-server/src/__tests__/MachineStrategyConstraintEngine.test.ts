/**
 * MachineStrategyConstraintEngine Tests — CAMX-MS2/U02+U08
 *
 * Validates strategy compatibility against machine PHYSICAL capabilities
 * using the 910 machine profiles with 10 constraint dimensions.
 */

import { describe, it, expect } from "vitest";
import {
  MachineStrategyConstraintEngine,
  machineStrategyConstraintEngine,
  type MachineCapabilities,
} from "../engines/MachineStrategyConstraintEngine.js";

// ─── Test fixtures ───────────────────────────────────────────────────────────

const entryMachine: MachineCapabilities = {
  machine_id: "test_entry",
  name: "Test Entry Machine",
  max_rpm: 8100,
  spindle_power_kW: 22,
  acceleration_g: 0.25,
  jerk_m_s3: 100,
  rapid_traverse_mm_min: 25400,
  tool_magazine_capacity: 20,
  spindle_taper: "BT40",
  work_envelope_mm: { x: 762, y: 406, z: 508 },
  coolant_pressure_bar: 7,
  axis_count: 3,
};

const highPerfMachine: MachineCapabilities = {
  machine_id: "test_hsm",
  name: "Test HSM Machine",
  max_rpm: 20000,
  spindle_power_kW: 37,
  acceleration_g: 1.0,
  jerk_m_s3: 50,
  rapid_traverse_mm_min: 60000,
  tool_magazine_capacity: 60,
  spindle_taper: "HSK-A63",
  work_envelope_mm: { x: 500, y: 400, z: 400 },
  coolant_pressure_bar: 70,
  axis_count: 5,
};

// ─── getRequirements() ───────────────────────────────────────────────────────

describe("MachineStrategyConstraintEngine.getRequirements()", () => {
  it("returns known strategy requirements", () => {
    const req = machineStrategyConstraintEngine.getRequirements({ strategy: "hsm_finishing" });
    expect(req.strategy_name).toBe("hsm_finishing");
    expect(req.min_rpm).toBe(15000);
    expect(req.min_power_kW).toBe(15);
    expect(req.min_axes).toBe(3);
  });

  it("returns conservative defaults for unknown strategy", () => {
    const req = machineStrategyConstraintEngine.getRequirements({ strategy: "unknown_magic_strategy" });
    expect(req.strategy_name).toBe("unknown_magic_strategy");
    expect(req.notes.join(" ")).toMatch(/conservative defaults/i);
  });

  it("adjusts tool slots when job specifies more", () => {
    const req = machineStrategyConstraintEngine.getRequirements({
      strategy: "face_milling",
      tool_count: 50,
    });
    expect(req.min_tool_slots).toBe(50);
  });

  it("bumps coolant bar for through-tool coolant", () => {
    const req = machineStrategyConstraintEngine.getRequirements({
      strategy: "face_milling",
      coolant_type: "through_tool",
    });
    expect(req.min_coolant_bar).toBeGreaterThanOrEqual(40);
  });

  it("bumps coolant bar for TSC coolant", () => {
    const req = machineStrategyConstraintEngine.getRequirements({
      strategy: "pocket_milling",
      coolant_type: "tsc",
    });
    expect(req.min_coolant_bar).toBeGreaterThanOrEqual(70);
  });

  it("sets envelope requirement from part size", () => {
    const req = machineStrategyConstraintEngine.getRequirements({
      strategy: "pocket_milling",
      part_envelope_mm: { x: 300, y: 200, z: 100 },
    });
    expect(req.min_envelope_mm).toEqual({ x: 300, y: 200, z: 100 });
  });

  it("5-axis strategy requires 5 axes", () => {
    const req = machineStrategyConstraintEngine.getRequirements({ strategy: "five_axis_contouring" });
    expect(req.min_axes).toBe(5);
  });

  it("micro milling requires ultra-high RPM", () => {
    const req = machineStrategyConstraintEngine.getRequirements({ strategy: "micro_milling" });
    expect(req.min_rpm).toBeGreaterThanOrEqual(40000);
  });
});

// ─── validate() ──────────────────────────────────────────────────────────────

describe("MachineStrategyConstraintEngine.validate()", () => {
  it("accepts entry machine for simple face milling", () => {
    const result = machineStrategyConstraintEngine.validate({
      strategy: "face_milling",
      machine: entryMachine,
    });
    expect(result.feasible).toBe(true);
    expect(result.strategy).toBe("face_milling");
    expect(result.score).toBeGreaterThan(0);
  });

  it("rejects entry machine for HSM finishing (RPM deficit)", () => {
    const result = machineStrategyConstraintEngine.validate({
      strategy: "hsm_finishing",
      machine: entryMachine,
    });
    expect(result.feasible).toBe(false);
    expect(result.constraints_violated.length).toBeGreaterThan(0);
    expect(result.constraints_violated.some(c => c.constraint === "max_rpm")).toBe(true);
  });

  it("rejects 3-axis machine for 5-axis strategy", () => {
    const result = machineStrategyConstraintEngine.validate({
      strategy: "five_axis_contouring",
      machine: entryMachine,
    });
    expect(result.feasible).toBe(false);
    expect(result.constraints_violated.some(c => c.constraint.includes("axis"))).toBe(true);
  });

  it("accepts high-performance machine for HSM roughing", () => {
    const result = machineStrategyConstraintEngine.validate({
      strategy: "hsm_roughing",
      machine: highPerfMachine,
    });
    expect(result.feasible).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  it("returns not-found error for unknown machine string", () => {
    const result = machineStrategyConstraintEngine.validate({
      strategy: "face_milling",
      machine: "made_up_machine_id_xyz",
    });
    expect(result.feasible).toBe(false);
    expect(result.recommendations.join(" ")).toMatch(/not found|MachineCapabilities/i);
  });

  it("includes actionable recommendations on failure", () => {
    const result = machineStrategyConstraintEngine.validate({
      strategy: "hsm_finishing",
      machine: entryMachine,
    });
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("score is 0-100 range", () => {
    const result = machineStrategyConstraintEngine.validate({
      strategy: "face_milling",
      machine: highPerfMachine,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("detects power deficit for low-power machine on adaptive clearing", () => {
    const lowPower: MachineCapabilities = { ...entryMachine, spindle_power_kW: 5 };
    const result = machineStrategyConstraintEngine.validate({
      strategy: "adaptive_clearing",
      machine: lowPower,
    });
    expect(result.feasible).toBe(false);
    expect(result.constraints_violated.some(c => c.constraint === "spindle_power_kW")).toBe(true);
  });

  it("detects tool magazine capacity deficit", () => {
    const smallMag: MachineCapabilities = { ...entryMachine, tool_magazine_capacity: 5 };
    const result = machineStrategyConstraintEngine.validate({
      strategy: "rest_machining",
      machine: smallMag,
    });
    expect(result.constraints_violated.some(c => c.constraint.includes("magazine") || c.constraint.includes("tool"))).toBe(true);
  });

  it("detects coolant pressure deficit for TSC drilling", () => {
    const lowCoolant: MachineCapabilities = { ...entryMachine, coolant_pressure_bar: 10 };
    const result = machineStrategyConstraintEngine.validate({
      strategy: "tsc_drilling",
      machine: lowCoolant,
    });
    expect(result.feasible).toBe(false);
    expect(result.constraints_violated.some(c => c.constraint.includes("coolant"))).toBe(true);
  });
});

// ─── findBestMachine() ───────────────────────────────────────────────────────

describe("MachineStrategyConstraintEngine.findBestMachine()", () => {
  it("ranks high-performance machine above entry for HSM", () => {
    const result = machineStrategyConstraintEngine.findBestMachine({
      strategy: "hsm_finishing",
      machines: [entryMachine, highPerfMachine],
    });
    expect(result.length).toBe(2);
    // Highest score first
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    expect(result[0].machine_id).toBe("test_hsm");
  });

  it("marks entry machine as infeasible for HSM", () => {
    const result = machineStrategyConstraintEngine.findBestMachine({
      strategy: "hsm_finishing",
      machines: [entryMachine],
    });
    expect(result[0].feasible).toBe(false);
    expect(result[0].constraints_violated_count).toBeGreaterThan(0);
  });

  it("returns empty array for empty machine list", () => {
    const result = machineStrategyConstraintEngine.findBestMachine({
      strategy: "face_milling",
      machines: [],
    });
    expect(result).toEqual([]);
  });

  it("uses default machines when none provided", () => {
    const result = machineStrategyConstraintEngine.findBestMachine({
      strategy: "face_milling",
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes key_strengths and key_weaknesses per machine", () => {
    const result = machineStrategyConstraintEngine.findBestMachine({
      strategy: "adaptive_clearing",
      machines: [entryMachine, highPerfMachine],
    });
    for (const m of result) {
      expect(Array.isArray(m.key_strengths)).toBe(true);
      expect(Array.isArray(m.key_weaknesses)).toBe(true);
    }
  });
});

// ─── listStrategies() / listMachines() ───────────────────────────────────────

describe("MachineStrategyConstraintEngine catalogs", () => {
  it("lists all strategies in requirements DB", () => {
    const strategies = machineStrategyConstraintEngine.listStrategies();
    expect(Array.isArray(strategies)).toBe(true);
    expect(strategies.length).toBeGreaterThan(10);
    expect(strategies).toContain("hsm_finishing");
    expect(strategies).toContain("adaptive_clearing");
    expect(strategies).toContain("five_axis_contouring");
  });

  it("lists all default machines", () => {
    const machines = machineStrategyConstraintEngine.listMachines();
    expect(Array.isArray(machines)).toBe(true);
    expect(machines.length).toBeGreaterThan(0);
    for (const m of machines) {
      expect(m.machine_id).toBeDefined();
      expect(m.name).toBeDefined();
      expect(m.tier).toBeDefined();
    }
  });

  it("exports singleton instance", () => {
    expect(machineStrategyConstraintEngine).toBeInstanceOf(MachineStrategyConstraintEngine);
  });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe("MachineStrategyConstraintEngine edge cases", () => {
  it("handles custom machines passed to constructor", () => {
    const custom: MachineCapabilities = {
      ...entryMachine,
      machine_id: "custom_1",
      name: "Custom Machine",
    };
    const engine = new MachineStrategyConstraintEngine([custom]);
    const machines = engine.listMachines();
    expect(machines.some(m => m.machine_id === "custom_1")).toBe(true);
  });

  it("handles strategy with no jerk requirement", () => {
    const noJerkMachine: MachineCapabilities = { ...highPerfMachine };
    delete noJerkMachine.jerk_m_s3;
    const result = machineStrategyConstraintEngine.validate({
      strategy: "face_milling", // no jerk requirement
      machine: noJerkMachine,
    });
    expect(result.feasible).toBe(true);
  });

  it("handles undersized work envelope violation", () => {
    const tiny: MachineCapabilities = {
      ...entryMachine,
      work_envelope_mm: { x: 100, y: 100, z: 100 },
    };
    const result = machineStrategyConstraintEngine.validate({
      strategy: "face_milling",
      machine: tiny,
      part_envelope_mm: { x: 500, y: 300, z: 200 },
    });
    expect(result.feasible).toBe(false);
    expect(result.constraints_violated.some(c => c.constraint.includes("envelope"))).toBe(true);
  });
});
