/**
 * MachineCapabilityIndexEngine Tests — Phase 0.23 U-UTL11
 */

import { describe, it, expect, beforeEach } from "vitest";
import { machineCapabilityIndexEngine } from "../engines/MachineCapabilityIndexEngine.js";

describe("MachineCapabilityIndexEngine", () => {
  beforeEach(() => {
    machineCapabilityIndexEngine.reset();
  });

  it("initializes with seeded machines", async () => {
    const stats = await machineCapabilityIndexEngine.getStats();
    expect(stats.totalMachines).toBeGreaterThan(0);
  });

  it("queries machines by type", async () => {
    const machines = await machineCapabilityIndexEngine.query({ type: "mill" });
    expect(machines.every(m => m.type === "mill")).toBe(true);
  });

  it("queries machines by min axes", async () => {
    const machines = await machineCapabilityIndexEngine.query({ minAxes: 5 });
    expect(machines.every(m => m.axes >= 5)).toBe(true);
  });

  it("queries machines by capability", async () => {
    const machines = await machineCapabilityIndexEngine.query({ capability: "probing" });
    expect(machines.every(m => m.capabilities.includes("probing"))).toBe(true);
  });

  it("gets machine by id", async () => {
    const machines = await machineCapabilityIndexEngine.query({ limit: 1 });
    if (machines.length > 0) {
      const machine = await machineCapabilityIndexEngine.getMachine(machines[0].id);
      expect(machine).not.toBeNull();
    }
  });

  it("returns null for unknown machine id", async () => {
    const machine = await machineCapabilityIndexEngine.getMachine("nonexistent");
    expect(machine).toBeNull();
  });

  it("finds machines capable of requirements", async () => {
    const machines = await machineCapabilityIndexEngine.findCapable(["probing"]);
    expect(machines.every(m => m.capabilities.includes("probing"))).toBe(true);
  });

  it("respects query limit", async () => {
    const machines = await machineCapabilityIndexEngine.query({ limit: 3 });
    expect(machines.length).toBeLessThanOrEqual(3);
  });

  it("stats include type breakdown", async () => {
    const stats = await machineCapabilityIndexEngine.getStats();
    expect(stats.byType).toBeDefined();
  });

  it("stats include controller breakdown", async () => {
    const stats = await machineCapabilityIndexEngine.getStats();
    expect(stats.byController).toBeDefined();
  });

  it("stats include axes breakdown", async () => {
    const stats = await machineCapabilityIndexEngine.getStats();
    expect(stats.byAxes).toBeDefined();
  });

  it("stats include average capabilities", async () => {
    const stats = await machineCapabilityIndexEngine.getStats();
    expect(typeof stats.averageCapabilities).toBe("number");
  });

  it("reset clears state", async () => {
    await machineCapabilityIndexEngine.getStats();
    machineCapabilityIndexEngine.reset();
    const stats = await machineCapabilityIndexEngine.getStats();
    expect(stats.totalMachines).toBeGreaterThan(0);
  });
});
