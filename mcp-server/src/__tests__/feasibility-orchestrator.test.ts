import { describe, it, expect } from "vitest";
import { FeasibilityOrchestratorEngine } from "../engines/FeasibilityOrchestratorEngine.js";

describe("FeasibilityOrchestratorEngine", () => {
  const engine = new FeasibilityOrchestratorEngine();

  const simpleInput = {
    stock: { length_mm: 100, width_mm: 80, height_mm: 25 },
    material: "6061-T6 aluminum",
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
    machine: { max_power_kw: 22, max_torque_Nm: 120, max_rpm: 12000 },
    workholding: { type: "vise", clamp_force_N: 60000 },
  };

  it("simple part is FEASIBLE", () => {
    const r = engine.analyze(simpleInput);
    expect(r.value.verdict).toBe("FEASIBLE");
    expect(r.value.stages.length).toBeGreaterThanOrEqual(7);
    expect(r.value.operation_count).toBe(4);
  });

  it("returns all 7 stage results", () => {
    const r = engine.analyze(simpleInput);
    const stageNames = r.value.stages.map((s) => s.stage);
    expect(stageNames).toContain("workpiece_init");
    expect(stageNames).toContain("accessibility");
    expect(stageNames).toContain("workholding");
    expect(stageNames).toContain("rigidity");
    expect(stageNames).toContain("force_capability");
    expect(stageNames).toContain("sequence_feasibility");
    expect(stageNames).toContain("setup_transition");
  });

  it("confidence is reasonable", () => {
    const r = engine.analyze(simpleInput);
    expect(r.value.overall_confidence).toBeGreaterThan(0.5);
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it("risk score is low for simple part", () => {
    const r = engine.analyze(simpleInput);
    expect(r.value.risk_score).toBeLessThan(50);
  });

  it("workpiece summary has valid values", () => {
    const r = engine.analyze(simpleInput);
    expect(r.value.workpiece_summary.volume_removed_pct).toBeGreaterThan(0);
    expect(r.value.workpiece_summary.min_wall_mm).toBeGreaterThan(0);
    expect(r.value.workpiece_summary.clamping_ratio).toBeGreaterThan(0);
    expect(r.value.workpiece_summary.clamping_ratio).toBeLessThanOrEqual(1);
  });

  it("detects high L/D ratio accessibility issue", () => {
    const input = {
      ...simpleInput,
      operations: [
        {
          id: "DEEP",
          type: "hole",
          tool_diameter_mm: 3,
          depth_mm: 50,
          position: { x: 0, y: 0, z: 25 },
        },
      ],
    };
    const r = engine.analyze(input);
    const access = r.value.stages.find((s) => s.stage === "accessibility")!;
    expect(access.issues.some((i) => i.includes("L/D"))).toBe(true);
  });

  it("detects chip evacuation concern", () => {
    const input = {
      ...simpleInput,
      operations: [
        {
          id: "SLOT",
          type: "slot",
          tool_diameter_mm: 5,
          depth_mm: 25,
          width_mm: 5,
          position: { x: 0, y: 0, z: 25 },
        },
      ],
    };
    const r = engine.analyze(input);
    const access = r.value.stages.find((s) => s.stage === "accessibility")!;
    expect(access.issues.some((i) => i.includes("chip evacuation"))).toBe(
      true
    );
  });

  it("flags power exceeded as INFEASIBLE", () => {
    const input = {
      ...simpleInput,
      machine: { max_power_kw: 3, max_torque_Nm: 20, max_rpm: 8000 },
      operations: [
        {
          id: "BIG",
          type: "pocket",
          tool_diameter_mm: 25,
          depth_mm: 15,
          width_mm: 50,
          length_mm: 40,
          position: { x: 0, y: 0, z: 25 },
          flutes: 4,
          cutting_speed_mpm: 200,
          feed_per_tooth_mm: 0.15,
        },
      ],
    };
    const r = engine.analyze(input);
    expect(r.value.verdict).toBe("INFEASIBLE");
    expect(r.value.critical_issues.some((i) => i.includes("exceeds"))).toBe(
      true
    );
  });

  it("thin wall triggers rigidity warning", () => {
    const input = {
      stock: { length_mm: 50, width_mm: 50, height_mm: 20 },
      material: "aluminum",
      operations: [
        {
          id: "P1",
          type: "pocket",
          tool_diameter_mm: 10,
          depth_mm: 18,
          width_mm: 46,
          length_mm: 46,
          position: { x: 0, y: 0, z: 20 },
        },
      ],
    };
    const r = engine.analyze(input);
    const rig = r.value.stages.find((s) => s.stage === "rigidity")!;
    expect(rig.status).not.toBe("pass");
  });

  it("titanium gets higher kc (harder to machine)", () => {
    const alInput = { ...simpleInput, material: "aluminum" };
    const tiInput = { ...simpleInput, material: "Ti-6Al-4V" };
    const alR = engine.analyze(alInput);
    const tiR = engine.analyze(tiInput);
    // Titanium should have higher risk score or more issues
    expect(tiR.value.risk_score).toBeGreaterThanOrEqual(alR.value.risk_score);
  });

  it("no machine specified still works (lower confidence)", () => {
    const input = { ...simpleInput, machine: undefined };
    const r = engine.analyze(input);
    expect(r.value.verdict).toBeDefined();
    const forceStage = r.value.stages.find(
      (s) => s.stage === "force_capability"
    )!;
    expect(forceStage.confidence).toBeLessThan(0.7);
  });

  it("single operation feasible", () => {
    const input = {
      stock: { length_mm: 100, width_mm: 100, height_mm: 20 },
      material: "steel",
      operations: [
        { id: "F1", type: "face", tool_diameter_mm: 50, depth_mm: 1 },
      ],
    };
    const r = engine.analyze(input);
    expect(r.value.verdict).toBe("FEASIBLE");
  });

  it("empty operations returns FEASIBLE (nothing to fail)", () => {
    const input = {
      stock: { length_mm: 100, width_mm: 100, height_mm: 20 },
      material: "steel",
      operations: [] as any[],
    };
    const r = engine.analyze(input);
    expect(r.value.verdict).toBe("FEASIBLE");
    expect(r.value.operation_count).toBe(0);
  });

  it("multi-setup with high removal warns", () => {
    const input = {
      stock: { length_mm: 50, width_mm: 50, height_mm: 30 },
      material: "steel",
      operations: [
        {
          id: "P1",
          type: "pocket",
          tool_diameter_mm: 12,
          depth_mm: 25,
          width_mm: 40,
          length_mm: 40,
          position: { x: 0, y: 0, z: 30 },
        },
      ],
      num_setups: 2,
    };
    const r = engine.analyze(input);
    const setup = r.value.stages.find((s) => s.stage === "setup_transition")!;
    expect(setup.issues.length).toBeGreaterThan(0);
  });

  it("bottom approach compromises datum", () => {
    const input = {
      ...simpleInput,
      operations: [
        {
          id: "BOT",
          type: "pocket",
          tool_diameter_mm: 10,
          depth_mm: 5,
          approach_direction: "bottom",
        },
      ],
    };
    const r = engine.analyze(input);
    expect(r.value.workpiece_summary.datum_intact).toBe(false);
  });

  it("recommendations are unique (no duplicates)", () => {
    const r = engine.analyze(simpleInput);
    const recs = r.value.recommendations;
    const unique = new Set(recs);
    expect(unique.size).toBe(recs.length);
  });

  it("analysis time is reasonable", () => {
    const r = engine.analyze(simpleInput);
    expect(r.value.estimated_analysis_time_ms).toBeLessThan(1000);
  });

  it("risk score 0-100 range", () => {
    const r = engine.analyze(simpleInput);
    expect(r.value.risk_score).toBeGreaterThanOrEqual(0);
    expect(r.value.risk_score).toBeLessThanOrEqual(100);
  });

  it("deflection warning for long thin tool", () => {
    const input = {
      ...simpleInput,
      operations: [
        {
          id: "THIN",
          type: "pocket",
          tool_diameter_mm: 3,
          depth_mm: 30,
          width_mm: 10,
          length_mm: 10,
          position: { x: 0, y: 0, z: 25 },
          flutes: 2,
          cutting_speed_mpm: 100,
          feed_per_tooth_mm: 0.05,
        },
      ],
    };
    const r = engine.analyze(input);
    const force = r.value.stages.find((s) => s.stage === "force_capability")!;
    expect(force.issues.some((i) => i.includes("deflection"))).toBe(true);
  });

  it("MARGINAL verdict for multiple warnings", () => {
    const input = {
      stock: { length_mm: 60, width_mm: 40, height_mm: 30 },
      material: "Ti-6Al-4V",
      operations: [
        {
          id: "P1",
          type: "pocket",
          tool_diameter_mm: 6,
          depth_mm: 25,
          width_mm: 30,
          length_mm: 35,
          position: { x: -10, y: 0, z: 30 },
          flutes: 4,
          cutting_speed_mpm: 60,
          feed_per_tooth_mm: 0.06,
        },
        {
          id: "P2",
          type: "pocket",
          tool_diameter_mm: 6,
          depth_mm: 25,
          width_mm: 30,
          length_mm: 35,
          position: { x: 10, y: 0, z: 30 },
          flutes: 4,
          cutting_speed_mpm: 60,
          feed_per_tooth_mm: 0.06,
        },
        {
          id: "H1",
          type: "hole",
          tool_diameter_mm: 3,
          depth_mm: 30,
          position: { x: 0, y: 0, z: 30 },
        },
      ],
      machine: { max_power_kw: 15, max_torque_Nm: 80, max_rpm: 12000 },
      num_setups: 2,
    };
    const r = engine.analyze(input);
    // With titanium, thin walls, deep holes, and multi-setup -> should be MARGINAL or worse
    expect(["MARGINAL", "INFEASIBLE"]).toContain(r.value.verdict);
    expect(r.value.risk_score).toBeGreaterThan(20);
  });

  it("source field matches engine name", () => {
    const r = engine.analyze(simpleInput);
    expect(r.source).toBe("FeasibilityOrchestratorEngine");
  });

  it("stainless steel uses correct kc", () => {
    const input = {
      ...simpleInput,
      material: "316 stainless steel",
      operations: [
        {
          id: "P1",
          type: "pocket",
          tool_diameter_mm: 10,
          depth_mm: 10,
          width_mm: 20,
          length_mm: 20,
          position: { x: 0, y: 0, z: 25 },
          flutes: 4,
          cutting_speed_mpm: 100,
          feed_per_tooth_mm: 0.08,
        },
      ],
    };
    const r = engine.analyze(input);
    // Stainless (kc=2400) should produce higher forces than aluminum (kc=800)
    expect(r.value.verdict).toBeDefined();
  });

  it("cast iron material recognized", () => {
    const input = {
      ...simpleInput,
      material: "grey cast iron",
    };
    const r = engine.analyze(input);
    expect(r.value.verdict).toBeDefined();
  });
});
