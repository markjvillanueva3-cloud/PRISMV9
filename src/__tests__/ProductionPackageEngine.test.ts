import { describe, it, expect } from "vitest";
import { ProductionPackageEngine } from "../engines/ProductionPackageEngine.js";

const engine = new ProductionPackageEngine();

const baseInput = {
  gcode: "O1000\nG90 G54\nM03 S8000\nG01 X10 Y10 Z-5 F2400\nM05\nM30\n",
  toolpath_segments: [
    { x: 0, y: 0, z: 5, feed_mmmin: 10000, rpm: 8000, type: "rapid" },
    { x: 0, y: 0, z: -5, feed_mmmin: 800, rpm: 8000, type: "plunge" },
    { x: 50, y: 0, z: -5, feed_mmmin: 2400, rpm: 8000, type: "feed", ae_mm: 3, ap_mm: 5 },
    { x: 50, y: 30, z: -5, feed_mmmin: 2400, rpm: 8000, type: "feed", ae_mm: 3, ap_mm: 5 },
    { x: 0, y: 30, z: -5, feed_mmmin: 2400, rpm: 8000, type: "feed", ae_mm: 3, ap_mm: 5 },
    { x: 0, y: 0, z: 5, feed_mmmin: 10000, rpm: 8000, type: "retract" },
  ],
  tool: {
    tool_id: "OSG-AE-VMS-10",
    manufacturer: "OSG",
    designation: "AE-VMS Ø10",
    diameter_mm: 10,
    flute_length_mm: 30,
    overall_length_mm: 60,
    flute_count: 3,
    coating: "TiAlN",
    type: "end_mill",
    holder: "ER32",
    price_usd: 45,
  },
  physics: {
    max_force_N: 450,
    max_power_kW: 2.1,
    max_torque_Nm: 5.6,
    max_deflection_mm: 0.008,
    predicted_Ra_um: 1.2,
    max_temperature_C: 320,
    estimated_tool_life_min: 85,
    cpk_estimate: 1.45,
  },
  recommended_params: {
    speed_mpm: 150,
    rpm: 8000,
    feed_mmpt: 0.1,
    feed_mmmin: 2400,
    ap_mm: 5,
    ae_mm: 3,
  },
  verification: {
    verdict: "PASS",
    warnings: ["Cpk 1.45 — acceptable but monitor"],
    issues_count: 1,
  },
  material_name: "P20 Mold Steel",
  material_iso_group: "P",
  machine_name: "DMG DMU 50",
  controller: "Heidenhain iTNC 530",
  operation_type: "pocket_roughing",
  program_number: 1234,
  programmer_name: "John",
  machine_rate_per_hour: 95,
};

describe("ProductionPackageEngine", () => {
  it("assembles complete production package", () => {
    const pkg = engine.assemble(baseInput);

    expect(pkg.program_header.program_number).toBe(1234);
    expect(pkg.program_header.machine).toBe("DMG DMU 50");
    expect(pkg.program_header.material).toBe("P20 Mold Steel");
    expect(pkg.gcode).toContain("G01");
    expect(pkg.verification_verdict).toBe("PASS");
    expect(pkg.generated_at).toBeTruthy();
  });

  it("generates setup sheet with all fields", () => {
    const pkg = engine.assemble(baseInput);
    const ss = pkg.setup_sheet;

    expect(ss.program_number).toBe(1234);
    expect(ss.machine).toBe("DMG DMU 50");
    expect(ss.material).toContain("P20");
    expect(ss.programmer).toBe("John");
    expect(ss.tools.length).toBeGreaterThan(0);
    expect(ss.tools[0].diameter_mm).toBe(10);
    expect(ss.tools[0].speed_rpm).toBe(8000);
    expect(ss.operations.length).toBeGreaterThan(0);
    expect(ss.cycle_time.p50_min).toBeGreaterThan(0);
    expect(ss.critical_notes.length).toBeGreaterThan(0);
  });

  it("generates tool list from catalog data", () => {
    const pkg = engine.assemble(baseInput);

    expect(pkg.tool_list.length).toBe(1);
    expect(pkg.tool_list[0].manufacturer).toBe("OSG");
    expect(pkg.tool_list[0].diameter_mm).toBe(10);
    expect(pkg.tool_list[0].coating).toBe("TiAlN");
    expect(pkg.tool_list[0].life_estimate_min).toBe(85);
  });

  it("generates physics report", () => {
    const pkg = engine.assemble(baseInput);
    const phys = pkg.physics_report;

    expect(phys.per_operation.length).toBe(1);
    expect(phys.per_operation[0].force_N).toBe(450);
    expect(phys.per_operation[0].cpk).toBe(1.45);
    expect(phys.summary).toContain("Fc=450N");
    expect(phys.summary).toContain("Cpk=1.45");
  });

  it("estimates cycle time with Monte Carlo confidence", () => {
    const pkg = engine.assemble(baseInput);

    expect(pkg.cycle_time.p50_min).toBeGreaterThan(0);
    expect(pkg.cycle_time.p75_min).toBeGreaterThanOrEqual(pkg.cycle_time.p50_min);
    expect(pkg.cycle_time.p95_min).toBeGreaterThanOrEqual(pkg.cycle_time.p75_min);
    expect(pkg.cycle_time.breakdown.length).toBeGreaterThan(0);
    expect(pkg.cycle_time.breakdown.some((b) => b.phase === "cutting")).toBe(true);
  });

  it("estimates cost per part", () => {
    const pkg = engine.assemble(baseInput);

    expect(pkg.cost_estimate.total_cost_per_part).toBeGreaterThan(0);
    expect(pkg.cost_estimate.tool_cost_per_part).toBeGreaterThanOrEqual(0);
    expect(pkg.cost_estimate.machine_cost_per_part).toBeGreaterThan(0);
    expect(pkg.cost_estimate.energy_cost_per_part).toBeGreaterThanOrEqual(0);
    const pctSum = pkg.cost_estimate.cost_breakdown_pct.tooling +
      pkg.cost_estimate.cost_breakdown_pct.machine +
      pkg.cost_estimate.cost_breakdown_pct.energy;
    expect(pctSum).toBeGreaterThanOrEqual(95); // rounding may lose 1-2%
    expect(pctSum).toBeLessThanOrEqual(105);
  });

  it("includes tribal knowledge tips", () => {
    const pkg = engine.assemble(baseInput);

    expect(pkg.tribal_tips.length).toBeGreaterThan(0);
    expect(pkg.tribal_tips[0].title.length).toBeGreaterThan(0);
    expect(pkg.tribal_tips[0].body.length).toBeGreaterThan(0);
    expect(pkg.tribal_tips[0].relevance_score).toBeGreaterThan(0);
  });

  it("includes warnings from verification", () => {
    const pkg = engine.assemble(baseInput);

    expect(pkg.warnings).toContain("Cpk 1.45 — acceptable but monitor");
  });
});
