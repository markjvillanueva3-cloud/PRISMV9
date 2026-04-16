import { describe, it, expect } from "vitest";
import {
  FeasibilityOrchestratorEngineImpl,
} from "../engines/FeasibilityOrchestratorEngine.js";

describe("FeasibilityOrchestratorEngine", () => {
  const engine = new FeasibilityOrchestratorEngineImpl();

  const simpleInput = {
    stock: { length_mm: 100, width_mm: 80, height_mm: 25 },
    material: { name: "6061-T6 aluminum", E_GPa: 69 },
    operations: [
      {
        id: "F1",
        type: "face",
        tool_diameter_mm: 50,
        depth_mm: 1,
        position: { x: 0, y: 0, z: 25 },
      },
      {
        id: "P1",
        type: "pocket",
        tool_diameter_mm: 12,
        depth_mm: 10,
        width_mm: 40,
        length_mm: 30,
        position: { x: 0, y: 0, z: 24 },
      },
      {
        id: "H1",
        type: "hole",
        tool_diameter_mm: 8,
        depth_mm: 25,
        position: { x: -30, y: -25, z: 24 },
      },
      {
        id: "H2",
        type: "hole",
        tool_diameter_mm: 8,
        depth_mm: 25,
        position: { x: 30, y: 25, z: 24 },
      },
    ],
    machine: {
      max_power_kW: 22,
      max_torque_Nm: 120,
      max_rpm: 12000,
    },
  };

  it("fullAnalysis: returns a report with layers_run", async () => {
    const r = await engine.fullAnalysis(simpleInput);
    expect(r.layers_run.length).toBeGreaterThan(0);
    expect(r.analysis_time_ms).toBeGreaterThanOrEqual(0);
    expect(typeof r.overall_feasible).toBe("boolean");
  });

  it("fullAnalysis: per_operation has entry for each op", async () => {
    const r = await engine.fullAnalysis(simpleInput);
    expect(r.per_operation.length).toBe(
      simpleInput.operations.length,
    );
    for (const op of r.per_operation) {
      expect(op.id).toBeTruthy();
      expect(typeof op.accessible).toBe("boolean");
      expect(typeof op.holdable).toBe("boolean");
      expect(typeof op.rigid).toBe("boolean");
      expect(typeof op.force_ok).toBe("boolean");
    }
  });

  it("fullAnalysis: workpiece_evolution is array", async () => {
    const r = await engine.fullAnalysis(simpleInput);
    expect(Array.isArray(r.workpiece_evolution)).toBe(true);
  });

  it("fullAnalysis: overall_feasible is boolean", async () => {
    const r = await engine.fullAnalysis(simpleInput);
    expect(typeof r.overall_feasible).toBe("boolean");
  });

  it("quickCheck: returns feasible and risk_score", async () => {
    const r = await engine.quickCheck(simpleInput);
    expect(typeof r.feasible).toBe("boolean");
    expect(Array.isArray(r.top_issues)).toBe(true);
    expect(typeof r.risk_score).toBe("number");
    expect(r.risk_score).toBeGreaterThanOrEqual(0);
    expect(r.risk_score).toBeLessThanOrEqual(100);
  });

  it("whatIf: moving op returns before/after", async () => {
    const r = await engine.whatIf(simpleInput, "P1", 0);
    expect(typeof r.before_feasible).toBe("boolean");
    expect(typeof r.after_feasible).toBe("boolean");
    expect(typeof r.improvement).toBe("boolean");
    expect(typeof r.dead_ends_change).toBe("number");
  });

  it("whatIf: nonexistent op returns no change", async () => {
    const r = await engine.whatIf(simpleInput, "NONE", 0);
    expect(r.improvement).toBe(false);
    expect(r.dead_ends_change).toBe(0);
  });

  it("fullAnalysis: empty ops returns feasible", async () => {
    const input = {
      stock: { length_mm: 100, width_mm: 100, height_mm: 20 },
      operations: [] as any[],
    };
    const r = await engine.fullAnalysis(input);
    expect(r.overall_feasible).toBe(true);
    expect(r.per_operation.length).toBe(0);
  });

  it("fullAnalysis: dead_ends is array", async () => {
    const r = await engine.fullAnalysis(simpleInput);
    expect(Array.isArray(r.dead_ends)).toBe(true);
  });
});
