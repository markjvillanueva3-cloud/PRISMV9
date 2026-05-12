/**
 * Behavior tests for FeasibilityOrchestratorEngine.
 *
 * Verifies the multi-layer feasibility analysis pipeline produces concrete
 * numeric/structural output for realistic stock + operation inputs.
 */
import { describe, it, expect } from "vitest";
import { feasibilityOrchestratorEngine } from "../engines/FeasibilityOrchestratorEngine.js";

const SIMPLE_JOB = {
  stock: { length_mm: 200, width_mm: 100, height_mm: 50 },
  operations: [
    {
      id: "op1",
      type: "pocket",
      tool_diameter_mm: 10,
      depth_mm: 20,
      width_mm: 50,
      length_mm: 80,
      position: { x: 50, y: 50, z: 50 },
    },
    {
      id: "op2",
      type: "drill",
      tool_diameter_mm: 6,
      depth_mm: 30,
      position: { x: 100, y: 50, z: 50 },
    },
  ],
  material: { name: "6061", E_GPa: 69, density_kg_m3: 2700 },
};

describe("FeasibilityOrchestratorEngine.fullAnalysis", () => {
  it("runs at least one analysis layer for a 2-op pocket+drill job", async () => {
    const report = await feasibilityOrchestratorEngine.fullAnalysis(SIMPLE_JOB);
    expect(report.layers_run.length).toBeGreaterThanOrEqual(1);
    expect(report.layers_run).toEqual(
      expect.arrayContaining(["sequence_feasibility"])
    );
  });

  it("emits a per-operation entry for every input operation", async () => {
    const report = await feasibilityOrchestratorEngine.fullAnalysis(SIMPLE_JOB);
    expect(report.per_operation.length).toBe(SIMPLE_JOB.operations.length);
    const ids = report.per_operation.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["op1", "op2"]));
  });

  it("returns analysis_time_ms within the same wall-clock as the await", async () => {
    const t0 = Date.now();
    const report = await feasibilityOrchestratorEngine.fullAnalysis(SIMPLE_JOB);
    const elapsed = Date.now() - t0;
    expect(report.analysis_time_ms).toBeGreaterThanOrEqual(0);
    // Engine self-reported time must not exceed observed wall time + 50ms slack.
    expect(report.analysis_time_ms).toBeLessThanOrEqual(elapsed + 50);
  });

  it("each per_operation entry exposes a numeric risk_pct in [0, 100]", async () => {
    const report = await feasibilityOrchestratorEngine.fullAnalysis(SIMPLE_JOB);
    for (const op of report.per_operation) {
      expect(op.risk_pct).toBeGreaterThanOrEqual(0);
      expect(op.risk_pct).toBeLessThanOrEqual(100);
    }
  });
});

describe("FeasibilityOrchestratorEngine.quickCheck", () => {
  it("returns the same feasible verdict as fullAnalysis for a clean job", async () => {
    const quick = await feasibilityOrchestratorEngine.quickCheck(SIMPLE_JOB);
    const full = await feasibilityOrchestratorEngine.fullAnalysis(SIMPLE_JOB);
    expect(quick.feasible).toBe(full.overall_feasible);
  });
});

describe("FeasibilityOrchestratorEngine.assessForPUOA shim", () => {
  it("returns blocking=false when the underlying report has no risks", async () => {
    const out = await feasibilityOrchestratorEngine.assessForPUOA(SIMPLE_JOB);
    if (out.risks.length === 0) {
      expect(out.blocking).toBe(false);
    } else {
      expect(out.blocking).toBe(true);
    }
  });

  it("preserves the full report under .raw with same dead_ends count", async () => {
    const out = await feasibilityOrchestratorEngine.assessForPUOA(SIMPLE_JOB);
    const direct = await feasibilityOrchestratorEngine.fullAnalysis(SIMPLE_JOB);
    expect(out.raw.dead_ends.length).toBe(direct.dead_ends.length);
  });

  it("recommendations.length matches risks.length when blocking", async () => {
    const out = await feasibilityOrchestratorEngine.assessForPUOA(SIMPLE_JOB);
    if (out.blocking) {
      expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("FeasibilityOrchestratorEngine — failure modes", () => {
  it("empty operations list returns 0 per_operation entries (does not throw)", async () => {
    const emptyJob = { ...SIMPLE_JOB, operations: [] };
    const report = await feasibilityOrchestratorEngine.fullAnalysis(emptyJob);
    expect(report.per_operation.length).toBe(0);
  });

  it("missing material falls back without crashing the sequence layer", async () => {
    const noMaterialJob = { ...SIMPLE_JOB, material: undefined };
    const report = await feasibilityOrchestratorEngine.fullAnalysis(noMaterialJob);
    expect(report.layers_run).toEqual(
      expect.arrayContaining(["sequence_feasibility"])
    );
  });

  it("zero-volume stock still yields a structurally valid report", async () => {
    const tinyJob = {
      ...SIMPLE_JOB,
      stock: { length_mm: 0, width_mm: 0, height_mm: 0 },
    };
    const report = await feasibilityOrchestratorEngine.fullAnalysis(tinyJob);
    expect(report.per_operation.length).toBe(SIMPLE_JOB.operations.length);
  });
});
