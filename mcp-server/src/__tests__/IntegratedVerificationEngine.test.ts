import { describe, it, expect } from "vitest";
import { IntegratedVerificationEngine } from "../engines/IntegratedVerificationEngine.js";

const engine = new IntegratedVerificationEngine();

const baseTool = {
  diameter_mm: 10, flute_length_mm: 30, overall_length_mm: 60, flute_count: 3,
};
const baseMachine = {
  max_rpm: 12000, max_power_kw: 15, max_torque_nm: 120,
  x_travel_mm: 500, y_travel_mm: 400, z_travel_mm: 300,
};

function makeSegments(count: number, z = -5) {
  const segs: any[] = [
    { x: 0, y: 0, z: 5, feed_mmmin: 10000, rpm: 8000, type: "rapid" },
  ];
  for (let i = 0; i < count; i++) {
    segs.push({
      x: i * 5, y: 10, z, feed_mmmin: 2400, rpm: 8000,
      type: "feed", ae_mm: 3, ap_mm: 5,
    });
  }
  segs.push({ x: count * 5, y: 10, z: 5, feed_mmmin: 10000, rpm: 8000, type: "retract" });
  return segs;
}

describe("IntegratedVerificationEngine", () => {
  it("passes valid toolpath", () => {
    const result = engine.verify({
      toolpath_segments: makeSegments(10),
      tool: baseTool,
      material_iso_group: "P",
      machine: baseMachine,
    });

    expect(["PASS", "WARN"]).toContain(result.verdict);
    expect(result.summary.fatal_count).toBe(0);
    expect(result.summary.error_count).toBe(0);
    expect(result.physics.max_force_N).toBeGreaterThan(0);
  });

  it("detects machine travel exceeded", () => {
    const segs = [
      { x: 0, y: 0, z: 5, feed_mmmin: 10000, rpm: 8000, type: "rapid" },
      { x: 600, y: 10, z: -5, feed_mmmin: 2400, rpm: 8000, type: "feed", ae_mm: 3, ap_mm: 5 },
    ];
    const result = engine.verify({
      toolpath_segments: segs,
      tool: baseTool,
      material_iso_group: "P",
      machine: baseMachine,
    });

    expect(result.verdict).toBe("FAIL_FATAL");
    expect(result.issues.some((i) => i.category === "machine_limit")).toBe(true);
  });

  it("detects cutting beyond flute length", () => {
    const result = engine.verify({
      toolpath_segments: makeSegments(5, -40), // 40mm deep, flute is 30mm
      tool: baseTool,
      material_iso_group: "P",
    });

    expect(result.verdict).toBe("FAIL_FATAL");
    expect(result.issues.some((i) => i.message.includes("flute length"))).toBe(true);
  });

  it("warns on high deflection", () => {
    const result = engine.verify({
      toolpath_segments: makeSegments(5, -10),
      tool: { ...baseTool, diameter_mm: 4, overall_length_mm: 60 }, // thin tool = high deflection
      material_iso_group: "S", // superalloy = high force
      tolerance_mm: 0.01,
    });

    const deflWarning = result.issues.find((i) => i.category === "deflection");
    expect(deflWarning).toBeDefined();
    expect(result.physics.max_deflection_mm).toBeGreaterThan(0);
  });

  it("computes Kienzle physics correctly", () => {
    const result = engine.verify({
      toolpath_segments: makeSegments(5),
      tool: baseTool,
      material_iso_group: "P",
    });

    expect(result.physics.max_force_N).toBeGreaterThan(100);
    expect(result.physics.max_power_kW).toBeGreaterThan(0);
    expect(result.physics.max_torque_Nm).toBeGreaterThan(0);
    expect(result.physics.estimated_tool_life_min).toBeGreaterThan(0);
    expect(result.physics.cpk_estimate).toBeGreaterThan(0);
  });

  it("predicts surface finish", () => {
    const result = engine.verify({
      toolpath_segments: makeSegments(5),
      tool: { ...baseTool, corner_radius_mm: 1 },
      material_iso_group: "P",
      surface_finish_Ra_target: 0.4,
    });

    expect(result.physics.predicted_Ra_um).toBeGreaterThan(0);
  });

  it("provides machine check summary", () => {
    const result = engine.verify({
      toolpath_segments: makeSegments(5),
      tool: baseTool,
      material_iso_group: "P",
      machine: baseMachine,
    });

    expect(typeof result.machine_check.rpm_within_limits).toBe("boolean");
    expect(typeof result.machine_check.power_within_limits).toBe("boolean");
    expect(typeof result.machine_check.torque_within_limits).toBe("boolean");
  });

  it("detects air cuts when stock dims provided", () => {
    const segs = [
      { x: 0, y: 0, z: 5, feed_mmmin: 10000, rpm: 8000, type: "rapid" },
      // These are outside the stock
      { x: 200, y: 200, z: -5, feed_mmmin: 2400, rpm: 8000, type: "feed", ae_mm: 3, ap_mm: 5 },
      { x: 300, y: 300, z: -5, feed_mmmin: 2400, rpm: 8000, type: "feed", ae_mm: 3, ap_mm: 5 },
    ];
    const result = engine.verify({
      toolpath_segments: segs,
      tool: baseTool,
      material_iso_group: "P",
      stock_dims: { length_mm: 100, width_mm: 100, height_mm: 20 },
    });

    expect(result.stock_simulation.air_cut_pct).toBeGreaterThan(0);
  });

  it("checks G-code safety rules", () => {
    const badGcode = "G01 X10 Y10 Z-5 F500\nM03 S8000\n"; // feed before spindle
    const result = engine.verify({
      toolpath_segments: makeSegments(2),
      tool: baseTool,
      material_iso_group: "P",
      gcode: badGcode,
    });

    expect(result.issues.some((i) => i.category === "safety")).toBe(true);
  });

  it("reports verification_time_ms", () => {
    const result = engine.verify({
      toolpath_segments: makeSegments(10),
      tool: baseTool,
      material_iso_group: "P",
    });

    expect(result.verification_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.verification_time_ms).toBeLessThan(5000);
  });
});
